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

const tracer = transform(async ([siteNo, siteUrl], done) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
  } catch (e) {
    throw new Error('Could not open browser');
  }
  try {
    const page = await browser.newPage();
    let usesWorker = false;
    let postMessageCount = 0;
    await page.evaluateOnNewDocument(hookWorker);
    await page.evaluateOnNewDocument(hookPostMessage);
    await page.exposeFunction("reportWorker", (...args) => {
      usesWorker = args[0];
      console.log('Worker detected', siteUrl, args)
    });
    await page.exposeFunction("reportPostMessage", (...args) => {
      postMessageCount++;
      console.log('postMessage detected', siteUrl, args)
    });
    await page.goto(`http://${siteUrl}`);
    await page.waitFor(1000);
    const workers = page.workers();
    if (workers.length > 0) {
      console.log('workers detected', workers);
      usesWorker = workers[0].url();
    }
    const blankPage = await browser.newPage();
    const outFilePath = `out/${siteNo}.json`;
    await page.tracing.start({ path: outFilePath });
    await page.waitFor(60000);
    await page.tracing.stop();
    if (!usesWorker && postMessageCount === 0) {
      await unlinkAsync(outFilePath)
    }
    done(null, [siteNo, siteUrl, String(postMessageCount), usesWorker ? '1' : '0'])
  } catch (e) {
    done(null, [siteNo, siteUrl, e]);
  } finally {
    await browser.close()
  }
}, { parallel: 10 });


(async () => {
  //const inputPath = "top-1m.csv";
  const inputPath = "test.csv";
  fs.createReadStream(inputPath)
    .pipe(parse())
    .pipe(tracer)
    .pipe(stringify())
    .pipe(fs.createWriteStream("out/output.csv"));
})();