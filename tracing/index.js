const puppeteer = require('puppeteer');

const MS_PER_MINUTE = 1000 * 60;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.tracing.start({screenshots: true, path: 'trace.json'});
  await page.goto('https://www.facebook.com');
  await page.waitFor(10000);
  await page.tracing.stop();
  await browser.close();
})();