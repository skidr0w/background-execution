const program = require('commander');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');
const { calculateScriptingScores } = require('./calculate-scripting-time');
const readdirAsync = promisify(fs.readdir);
const stringify = require('csv-stringify');
const readline = require('readline');

const reportProgress = (current, total) => {
  process.stderr.write('\x1B7');
  readline.clearLine(process.stderr);
  process.stderr.write(
    `Completed ${current} of ${total}, ${Math.round((current / total) * 100)}%`,
  );
  process.stderr.write('\x1B8');
};

const doProcessing = async (inputDir, outputFile) => {
  const files = await readdirAsync(inputDir);
  const traceFiles = files.filter((file) => file.endsWith('.json'));
  let i = 0;
  const total = traceFiles.length;
  const processedDataStream = new stream.Readable({
    objectMode: true,
    async read(size) {
      if (i === total) {
        this.push(null);
        return;
      }

      const traceFile = traceFiles[i++];
      try {
        const filePath = path.join(inputDir, traceFile);
        const scriptingScores = await calculateScriptingScores(filePath);
        this.push([
          traceFile,
          '',
          scriptingScores.global.recordingTime,
          scriptingScores.global.scriptingTime,
          scriptingScores.worker.scriptingTime,
          scriptingScores.webSocket.recordingTime,
          scriptingScores.webSocket.scriptingTime,
        ]);
      } catch (e) {
        console.log(
          'Could not process file: %s',
          traceFile,
          e.message,
          e.stack,
        );
        this.push([traceFile, e.message, NaN, NaN, NaN]);
      } finally {
        reportProgress(i, total);
      }
    },
  });
  processedDataStream
    .pipe(stringify())
    .pipe(fs.createWriteStream(path.join(inputDir, outputFile)));
};

program
  .arguments('<input-dir>')
  .option('-o, --outfile <filename>', 'output filename', 'processed.csv')
  .action((inputDir, options) => {
    doProcessing(inputDir, options.outfile);
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
