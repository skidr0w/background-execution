const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const {
  loadDevtoolsModel,
  calculateScriptingTimeFraction,
} = require('./calculate-scripting-time');
const readdirAsync = promisify(fs.readdir);
const writeFileAsync = promisify(fs.writeFile);
const stringify = require('csv-stringify');
const stringifyAsync = promisify(stringify);
const readline = require('readline');

const OUT_DIR = './out';
const RESULTS_FILE = 'sorted.csv';

const reportProgress = (current, total) => {
  process.stderr.write('\x1B7');
  readline.clearLine(process.stderr);
  process.stderr.write(
    `Completed ${current} of ${total}, ${Math.round((current / total) * 100)}%`,
  );
  process.stderr.write('\x1B8');
};

(async () => {
  const files = await readdirAsync(OUT_DIR);
  const traceFiles = files.filter((file) => file.endsWith('.json'));
  const results = [];
  const total = traceFiles.length;
  for (let i = 0; i < total; i++) {
    const traceFile = traceFiles[i];
    try {
      const filePath = path.join(OUT_DIR, traceFile);
      const model = await loadDevtoolsModel(filePath);
      const scriptingTimeFraction = calculateScriptingTimeFraction(model);
      results.push([traceFile, scriptingTimeFraction]);
      reportProgress(i + 1, total);
    } catch (e) {
      console.log('Could not process file: %s (%s)', traceFile, e.message);
    }
  }
  const sortedResults = results.sort((a, b) => (a[1] > b[1] ? -1 : 1));
  const csv = await stringifyAsync(sortedResults);
  await writeFileAsync(path.join(OUT_DIR, RESULTS_FILE), csv);
})();
