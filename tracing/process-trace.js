const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { loadDevtoolsModel, calculateScriptingTimeFraction } = require('./calculate-scripting-time');
const readdirAsync = promisify(fs.readdir);
const writeFileAsync = promisify(fs.writeFile);
const stringify = require('csv-stringify');
const stringifyAsync = promisify(stringify);

const OUT_DIR = './out';
const RESULTS_FILE = 'sorted.csv';

(async () => {
  const files = await readdirAsync(OUT_DIR);
  const traceFiles = files.filter(file => file.endsWith('.json'));
  const results = [];
  for (const traceFile of traceFiles) {
    const filePath = path.join(OUT_DIR, traceFile);
    const model = await loadDevtoolsModel(filePath);
    const scriptingTimeFraction = calculateScriptingTimeFraction(model);
    results.push([traceFile, scriptingTimeFraction]);
  }
  const sortedResults = results.sort((a, b) => a[1] > b[1] ? -1 : 1);
  const csv = await stringifyAsync(sortedResults);
  await writeFileAsync(path.join(OUT_DIR, RESULTS_FILE), csv);
})();