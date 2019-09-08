const { Builder, By } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const fs = require('fs');

const MEASURE_TIME_SEC = 60 * 5;

const firefoxOptions = new firefox.Options().setPreference(
  'browser.helperApps.neverAsk.saveToDisk',
  'application/octet-stream',
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const measure = async (method, browser, workTime) => {
  const [methodName, url] = method;
  let driver;
  do {
    try {
      driver = await new Builder()
        .forBrowser(browser)
        .setFirefoxOptions(firefoxOptions)
        .build();
    } catch (err) {
      console.log('Could not open driver session', err.message);
      await sleep(5000);
    }
  } while (driver === undefined);
  try {
    await driver.get(url);
    const workDurationInput = driver.findElement(By.css('#work-duration'));
    await workDurationInput.clear();
    await workDurationInput.sendKeys(workTime);
    await driver.sleep(1500);
    await driver.findElement(By.css('#start')).click();
    await driver.sleep(500);
    const windowHandles = await driver.getAllWindowHandles();
    await driver.sleep(MEASURE_TIME_SEC * 1000);
    await driver.switchTo().window(windowHandles[1]);
    await driver.close();
    await driver.switchTo().window(windowHandles[0]);
    await driver.sleep(5000);
    const screenshotData = await driver.takeScreenshot();
    const buffer = Buffer.from(screenshotData, 'base64');
    const time = new Date().toISOString().replace(/:/g, '_');
    fs.writeFileSync(
      `./screenshots/${time}_${browser}_${workTime}_${methodName}.png`,
      buffer,
    );
    await driver.findElement(By.css('#download')).click();
    await driver.sleep(2500);
    console.log(
      `Finished measurement for ${browser} and ${url} and ${workTime}ms work time`,
    );
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await driver.quit();
  }
  await sleep(2500);
};

const methods = [
  ['timer', 'https://yreifschneider.github.io/background-execution/timer.html'],
  [
    'postMessage',
    'https://yreifschneider.github.io/background-execution/post-message.html',
  ],
  [
    'web-worker',
    'https://yreifschneider.github.io/background-execution/web-worker.html',
  ],
  [
    'websocket-timer',
    'https://yreifschneider.github.io/background-execution/websocket-timer.html',
  ],
];
const browsers = ['chrome', 'firefox', 'safari'];
const workTimes = ['50', '1000'];

(async () => {
  for (const browser of browsers) {
    for (const method of methods) {
      for (const workTime of workTimes) {
        await measure(method, browser, workTime);
      }
    }
  }
})();
