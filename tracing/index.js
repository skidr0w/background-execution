const program = require('commander');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const parse = require('csv-parse');
const transform = require('stream-transform');
const stringify = require('csv-stringify');

const PAGE_LOAD_TIMEOUT_SECS = 120;

const parseIntOption = (value, previous) => parseInt(value);

const normalizeUrl = (url) => url.replace(/\./g, '_').replace(/\//g, '__');

const waitForSecs = (secs) =>
  new Promise((resolve) => setTimeout(resolve, secs * 1000));

const tracer = (analysisTimeSeconds, browserInstances) =>
  transform(
    async ([siteNo, siteUrl], done) => {
      let tryNumber = 0;
      let browser;
      while (!browser && tryNumber < 3) {
        try {
          browser = await puppeteer.launch({
            headless: false,
            args: [
              '--no-first-run',
              '--enable-automation',
              '--password-store=basic',
              '--use-mock-keychain',
              'about:blank',
            ],
            pipe: true,
            ignoreDefaultArgs: true,
          });
        } catch (err) {
          console.error('Could not open browser', err);
          const wait = [30, 300, analysisTimeSeconds];
          await waitForSecs(wait[tryNumber++]);
        }
      }
      if (!browser) {
        const message = `Could not open browser window after ${tryNumber} attempts`;
        console.log(siteUrl, message);
        done(null, {
          siteNo,
          siteUrl,
          err: new Error(message),
        });
      }
      try {
        const page = await browser.newPage();
        const detectedMethods = {
          worker: false,
          workerInitiators: new Set(),
          webSocket: false,
          webSocketInitiators: new Set(),
          postMessageCount: 0,
          postMessageInitiators: new Set(),
        };
        const reportMethod = (method, initiator) => {
          let firstFound = false;
          let initiatorStr = initiator.documentURL;
          if (initiator.caller) {
            initiatorStr += ' > ' + initiator.caller;
          }
          if (method === 'worker') {
            firstFound = firstFound || !detectedMethods.worker;
            detectedMethods.worker = true;
            detectedMethods.workerInitiators.add(initiatorStr);
          } else if (method === 'postMessage') {
            firstFound = firstFound || detectedMethods.postMessageCount === 0;
            detectedMethods.postMessageCount++;
            detectedMethods.postMessageInitiators.add(initiatorStr);
          } else if (method === 'webSocket') {
            firstFound = firstFound || !detectedMethods.webSocket;
            detectedMethods.webSocket = true;
            detectedMethods.webSocketInitiators.add(initiatorStr);
          }

          if (firstFound) {
            console.log(method, 'detected on', siteUrl);
          }
        };
        const hooksScript = await readFileAsync('./hooks.js', 'utf8');
        await page.evaluateOnNewDocument(hooksScript);
        await page.exposeFunction('reportWorker', (initiator) => {
          reportMethod('worker', initiator);
        });
        await page.exposeFunction('reportPostMessage', (initiator) => {
          reportMethod('postMessage', initiator);
        });
        await page.exposeFunction('reportWebSocket', (initiator) => {
          reportMethod('webSocket', initiator);
        });
        const traceFilePath = `out/${siteNo}_${normalizeUrl(siteUrl)}.json`;
        await page.tracing.start({
          path: traceFilePath,
          categories: [
            'devtools.timeline',
            'disabled-by-default-devtools.timeline',
            'v8.execute',
            'disabled-by-default-v8.cpu_profiler',
          ],
        });
        await page.goto(`http://${siteUrl}`, {
          timeout: PAGE_LOAD_TIMEOUT_SECS * 1000,
        });
        await page.waitFor(1000);
        const blankPage = await browser.newPage();
        await page.waitFor(analysisTimeSeconds * 1000);
        await page.tracing.stop();
        const pptrWorkers = page.workers();
        if (pptrWorkers.length > 0) {
          detectedMethods.worker = true;
        }
        done(null, {
          siteNo,
          siteUrl,
          traceFilePath,
          detectedMethods,
        });
      } catch (err) {
        done(null, {
          siteNo,
          siteUrl,
          err,
        });
      } finally {
        await browser.close();
      }
    },
    { parallel: browserInstances },
  );

const transformToOutputCSV = transform((obj, done) => {
  const { siteNo, siteUrl } = obj;
  if (obj.err) {
    const { err } = obj;
    done(null, [siteNo, siteUrl, err.message, null, null, null, null]);
  } else {
    const { traceFilePath, detectedMethods } = obj;
    done(null, [
      siteNo,
      siteUrl,
      null,
      traceFilePath,
      detectedMethods.worker ? 'WORKER' : 'NO_WORKER',
      Array.from(detectedMethods.workerInitiators).join('|'),
      detectedMethods.webSocket ? 'WEBSOCKET' : 'NO_WEBSOCKET',
      Array.from(detectedMethods.webSocketInitiators).join('|'),
      detectedMethods.postMessageCount,
      Array.from(detectedMethods.postMessageInitiators).join('|'),
    ]);
  }
});

const doTracing = async (inputFile, analysisTime, browserInstances) => {
  fs.createReadStream(inputFile)
    .pipe(parse())
    .pipe(tracer(analysisTime, browserInstances))
    .pipe(transformToOutputCSV)
    .pipe(stringify())
    .pipe(fs.createWriteStream('out/output.csv'));
};

program
  .arguments('<input-file>')
  .option('-t, --time <number>', 'analysis time in seconds', parseIntOption, 30)
  .option(
    '-b, --browsers <number>',
    'number of parallel launched browser instances',
    parseIntOption,
    5,
  )
  .action((inputFile, options) => {
    doTracing(inputFile, options.time, options.browsers);
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
