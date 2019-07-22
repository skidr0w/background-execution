const PARALLEL_BROWSERS = 5;
const ANALYSE_TIME_SECS = 60;
const PAGE_LOAD_TIMEOUT_SECS = 120;

const puppeteer = require("puppeteer");
const fs = require("fs");
const { promisify } = require('util');
const parse = require("csv-parse");
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const unlinkAsync = promisify(fs.unlink);

const hookPostMessage = () => {
  const originalPostMessage = postMessage;
  window.postMessage = function() {
    console.log("postMessage called", ...arguments);
    reportPostMessage(...arguments);
    return originalPostMessage(...arguments);
  };
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
    .replace('.', '_')
    .replace('/', '__');

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
    const outFilePath = `out/${siteNo}_${normlizeUrl(siteUrl)}.json`;
    await page.tracing.start({ path: outFilePath });
    await page.waitFor(ANALYSE_TIME_SECS * 1000);
    await page.tracing.stop();
    const pptrWorkers = page.workers().map(worker => worker.url());
    if (hookedWorkers.length === 0 && pptrWorkers.length === 0 && postMessage.length === 0) {
      await unlinkAsync(outFilePath)
    }
    const result = { hookedWorkers, pptrWorkers, postMessage };
    done(null, [siteNo, siteUrl, JSON.stringify((result))])
  } catch (e) {
    const result = { error: e.message };
    done(null, [siteNo, siteUrl, JSON.stringify(result)]);
  } finally {
    await browser.close()
  }
}, { parallel: PARALLEL_BROWSERS });


(async () => {
  const inputPath = "top-1m.csv";
  //const inputPath = "test.csv";
  fs.createReadStream(inputPath)
    .pipe(parse())
    .pipe(tracer)
    .pipe(stringify())
    .pipe(fs.createWriteStream("out/output.csv"));
})();