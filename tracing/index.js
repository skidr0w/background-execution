const puppeteer = require("puppeteer");
const fs = require("fs");
const parse = require("csv-parse");
const transform = require('stream-transform');
const stringify = require('csv-stringify');

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

const tracer = (browser) => {
  return transform(async ([siteNo, siteUrl], done) => {
    const page = await browser.newPage();
    let blankPage;
    try {
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
      blankPage = await browser.newPage();
      await page.tracing.start({ path: `${siteNo}.json` });
      await page.waitFor(15000);
      await page.tracing.stop();
      done(null, [siteNo, siteUrl, String(postMessageCount), usesWorker ? '1' : '0'])
    } catch (e) {
      done(null, [siteNo, siteUrl, e]);
    } finally {
      if (blankPage) {
        await blankPage.close();
      }
      await page.close();
    }
  }, { parallel: 1 })
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });

  //const inputPath = "top-1m.csv";
  const inputPath = "test.csv";
  fs.createReadStream(inputPath)
    .pipe(parse())
    .pipe(tracer(browser))
    .pipe(stringify())
    .pipe(fs.createWriteStream("output.csv"));

})();