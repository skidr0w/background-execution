const program = require('commander');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { promisify } = require('util');
const parse = require('csv-parse');
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const { loadDevtoolsModel, calculateScriptingTimeFraction } = require('./calculate-scripting-time');

const PAGE_LOAD_TIMEOUT_SECS = 120;

const TRACE_EVENT_WINDOW_POSTMESSAGE = 'trace_event_window_postmessage';
const TRACE_EVENT_WORKER_CREATED = 'trace_event_worker_created';
const TRACE_EVENT_WORKER_POSTMESSAGE = 'trace_event_worker_postmessage';
const TRACE_EVENT_WEBSOCKET_CREATED = 'trace_event_websocket_created';
const TRACE_EVENT_WEBSOCKET_CONNECTED = 'trace_event_websocket_connected';
const TRACE_EVENT_WEBSOCKET_DISCONNECTED = 'trace_event_websocket_disconnected';

const parseIntOption = (value, previous) => parseInt(value);

const hookPostMessage = () => {
  const originalPostMessage = postMessage;
  window.postMessage = function() {
    reportPostMessage(...arguments);
    console.count("postMessage");
    console.timeStamp("postMessage");
    return originalPostMessage(...arguments);
  };
};

const hookWebSocket = () => {
  const originalWebSocket = WebSocket;
  const handleOpen = () => {
    console.timeStamp("WebSocket connected")
  };
  const handleClose = () => {
    console.timeStamp("WebSocket disconnected")
  };
  const handleMessage = (...args) => {
    console.timeStamp("WebSocket message");
    console.log('WebSocket message:', ...args)
  };
  window.WebSocket = class extends WebSocket {
    constructor(...args) {
      super(...args);
      this.addEventListener('open', handleOpen);
      this.addEventListener('close', handleClose);
      this.addEventListener('message', handleMessage);
    }
  }
};

const createTracingWorker = WorkerImpl => class extends WorkerImpl {
  constructor(...args) {
    super(...args);
    reportWorker(...args);
    console.timeStamp("Worker created")
  }
};

const hookWorker = () => {
  const originalWorker = Worker;
  const originalSharedWorker = SharedWorker;
  const createTracingWorker = (OriginalWorker) => {
    return function () {
      reportWorker(...arguments);
      return new OriginalWorker(...arguments);
    }
  };
  window.Worker = createTracingWorker(originalWorker);
  window.SharedWorker = createTracingWorker(originalSharedWorker);
};

const normlizeUrl = url =>
  url
    .replace(/\./g, '_')
    .replace(/\//g, '__');

const tracer = (analysisTimeSeconds, browserInstances) => transform(async ([siteNo, siteUrl], done) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
  } catch (e) {
    console.error('Could not open browser', e);
    throw e;
  }
  try {
    const page = await browser.newPage();
    let hookedWorkers = [];
    let postMessage = [];
    await page.evaluateOnNewDocument(hookWorker);
    await page.evaluateOnNewDocument(hookPostMessage);
    await page.evaluateOnNewDocument(hookWebSocket);
    await page.exposeFunction("reportWorker", (...args) => {
      hookedWorkers.push(args[0]);
      console.log('Worker detected', siteUrl, args)
    });
    await page.exposeFunction("reportPostMessage", (...args) => {
      postMessage.push(args);
      console.log('postMessage detected', siteUrl, args)
    });
    const traceFilePath = `out/${siteNo}_${normlizeUrl(siteUrl)}.json`;
    await page.tracing.start({
      path: traceFilePath,
      categories: [
        'v8',
        'v8.execute',
        'devtools.timeline',
        'devtools.timeline.async',
        'disabled-by-default-devtools.timeline',
        'disabled-by-default-v8.cpu_profiler',
      ],
    });
    await page.goto(`http://${siteUrl}`, { timeout: PAGE_LOAD_TIMEOUT_SECS * 1000 });
    await page.waitFor(1000);
    const blankPage = await browser.newPage();
    await page.waitFor(analysisTimeSeconds * 1000);
    await page.tracing.stop();
    const pptrWorkers = page.workers().map(worker => worker.url());
    done(null, {
      siteNo,
      siteUrl,
      traceFilePath,
      hookedWorkers, pptrWorkers, postMessage
    });
  } catch (e) {
    done(null, {
      siteNo,
      siteUrl,
      error: e
    });
  } finally {
    await browser.close()
  }
}, { parallel: browserInstances });

const processTrace = transform(async (obj, done) => {
  console.log('processTrace', obj);
  if (obj.error) {
    done(null, obj)
  } else {
    try {
      const model = await loadDevtoolsModel(obj.traceFilePath);
      const scriptingTimeFraction = calculateScriptingTimeFraction(model);
      done(null, {
        ...obj,
        scriptingTimeFraction,
      })
    } catch (e) {
      done(e)
    }
  }
});

const transformToOutputCSV = transform((obj, done) => {
  const { siteNo, siteUrl, error, scriptingTimeFraction, traceFilePath, hookedWorkers, pptrWorkers, postMessage } = obj;
  done(null, [
    siteNo,
    siteUrl,
    error ? error.message : '-',
    scriptingTimeFraction || NaN,
    traceFilePath,
    JSON.stringify({ hookedWorkers, pptrWorkers, postMessage })
  ])
});

const doTracing = async (inputFile, analysisTime, browserInstances) => {
  fs.createReadStream(inputFile)
    .pipe(parse())
    .pipe(tracer(analysisTime, browserInstances))
    .pipe(processTrace)
    .pipe(transformToOutputCSV)
    .pipe(stringify())
    .pipe(fs.createWriteStream("out/output.csv"));
};

program
  .arguments('<input-file>')
  .option('-t, --time <number>', 'analysis time in seconds', parseIntOption, 30)
  .option('-b, --browsers <number>', 'number of parallel launched browser instances', parseIntOption, 5)
  .action((inputFile, options) => {
    doTracing(inputFile, options.time, options.browsers);
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}