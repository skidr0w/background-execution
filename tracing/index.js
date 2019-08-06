const PARALLEL_BROWSERS = 5;
const ANALYSE_TIME_SECS = 15;
const PAGE_LOAD_TIMEOUT_SECS = 120;

const TRACE_EVENT_WINDOW_POSTMESSAGE = 'trace_event_window_postmessage';
const TRACE_EVENT_WORKER_CREATED = 'trace_event_worker_created';
const TRACE_EVENT_WORKER_POSTMESSAGE = 'trace_event_worker_postmessage';
const TRACE_EVENT_WEBSOCKET_CREATED = 'trace_event_websocket_created';
const TRACE_EVENT_WEBSOCKET_CONNECTED = 'trace_event_websocket_connected';
const TRACE_EVENT_WEBSOCKET_DISCONNECTED = 'trace_event_websocket_disconnected';

const puppeteer = require("puppeteer");
const fs = require("fs");
const { promisify } = require('util');
const parse = require("csv-parse");
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const unlinkAsync = promisify(fs.unlink);
const { loadDevtoolsModel, calculateScriptingTimeFraction } = require('./process-trace');

const args = process.argv.slice(2);
const sitesFile = args.length >= 1 ? args[0] : 'top-1m.csv';

const hookPostMessage = () => {
  const originalPostMessage = postMessage;
  window.postMessage = function() {
    reportPostMessage(...arguments);
    console.count("postMessage");
    console.timeStamp("postMessage");
    return originalPostMessage(...arguments);
  };
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

const tracer = transform(async ([siteNo, siteUrl], done) => {
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
    await page.exposeFunction("reportWorker", (...args) => {
      hookedWorkers.push(args[0]);
      console.log('Worker detected', siteUrl, args)
    });
    await page.exposeFunction("reportPostMessage", (...args) => {
      postMessage.push(args);
      console.log('postMessage detected', siteUrl, args)
    });
    await page.goto(`http://${siteUrl}`, { timeout: PAGE_LOAD_TIMEOUT_SECS * 1000 });
    await page.waitFor(1000);
    const blankPage = await browser.newPage();
    const traceFilePath = `out/${siteNo}_${normlizeUrl(siteUrl)}.json`;
    await page.tracing.start({ path: traceFilePath });
    await page.waitFor(ANALYSE_TIME_SECS * 1000);
    await page.tracing.stop();
    const pptrWorkers = page.workers().map(worker => worker.url());
    const backgroundExecutionDetected = !(hookedWorkers.length === 0 && pptrWorkers.length === 0 && postMessage.length === 0)
    if (!backgroundExecutionDetected) {
      await unlinkAsync(traceFilePath)
    }
    done(null, {
      siteNo,
      siteUrl,
      traceFilePath,
      backgroundExecutionDetected,
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
}, { parallel: PARALLEL_BROWSERS });

const processTrace = transform(async (obj, done) => {
  console.log('processTrace', obj);
  if (obj.error || !obj.backgroundExecutionDetected) {
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

(async () => {
  fs.createReadStream(sitesFile)
    .pipe(parse())
    .pipe(tracer)
    .pipe(processTrace)
    .pipe(transformToOutputCSV)
    .pipe(stringify())
    .pipe(fs.createWriteStream("out/output.csv"));
})();