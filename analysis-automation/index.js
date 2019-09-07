const { Builder, By } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const MEASURE_TIME_SEC = 60 * 5;

const firefoxOptions = new firefox.Options().setPreference(
  'browser.helperApps.neverAsk.saveToDisk',
  'application/octet-stream',
);

const measure = async (url, browser, workTime) => {
  let driver = await new Builder()
    .forBrowser(browser)
    .setFirefoxOptions(firefoxOptions)
    .build();
  try {
    await driver.get(url);
    const workDurationInput = driver.findElement(By.css('#work-duration'));
    await workDurationInput.clear();
    await workDurationInput.sendKeys(workTime);
    await driver.sleep(1500);
    await driver.findElement(By.css('#start')).click();
    await driver.sleep(MEASURE_TIME_SEC * 1000);
    const windowHandles = await driver.getAllWindowHandles();
    await driver.switchTo().window(windowHandles[1]);
    await driver.close();
    await driver.switchTo().window(windowHandles[0]);
    await driver.sleep(1000);
    await driver.findElement(By.css('#download')).click();
    await driver.sleep(1000);
    console.log(
      `Finished measurement for ${browser} and ${workTime}ms work time`,
    );
    await driver.quit();
  } catch (err) {
    console.error('Error:', err.message);
  }
};

const urls = [
  'https://yreifschneider.github.io/background-execution/timer.html',
  'https://yreifschneider.github.io/background-execution/post-message.html',
  'https://yreifschneider.github.io/background-execution/web-worker.html',
  'https://yreifschneider.github.io/background-execution/websocket-timer.html',
];
const browsers = ['chrome', 'firefox', 'safari'];
const workTimes = ['50', '1000'];

(async () => {
  for (const url of urls) {
    for (const browser of browsers) {
      for (const workTime of workTimes) {
        await measure(url, browser, workTime);
      }
    }
  }
})();
