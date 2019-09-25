const program = require('commander');
const fs = require('fs');
const path = require('path');
const { calculateScriptingScores } = require('./calculate-scripting-time');
const parse = require('csv-parse');
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const readline = require('readline');

let progressCount = 0;
const reportProgress = (current, total) => {
  process.stderr.write('\x1B7');
  readline.clearLine(process.stderr);
  process.stderr.write(`Completed ${progressCount++}`);
  process.stderr.write('\x1B8');
};

const processFile = (inputFile) =>
  transform(
    async ([id, url, err, ...rest], done) => {
      if (err.length > 0) {
        done(null, [id, url, err]);
        return;
      }
      const [
        traceFile,
        worker,
        workerOrigin,
        webSocket,
        webSocketOrigin,
        postMessageCount,
        postMessageOrigin,
      ] = rest;
      try {
        const filepath = path.join(
          path.dirname(inputFile),
          path.basename(traceFile),
        );
        console.log('processing', filepath);
        const scriptingScores = await calculateScriptingScores(filepath);
        done(null, [
          id,
          url,
          null,
          scriptingScores.global.recordingTime,
          scriptingScores.global.scriptingTime,
          (scriptingScores.global.scriptingTime /
            scriptingScores.global.recordingTime) *
            100,
          scriptingScores.background.recordingTime,
          scriptingScores.background.scriptingTime,
          scriptingScores.background
            ? (scriptingScores.background.scriptingTime /
                scriptingScores.background.recordingTime) *
              100
            : 0,
          worker,
          scriptingScores.worker.scriptingTime,
          (scriptingScores.worker.scriptingTime /
            scriptingScores.global.recordingTime) *
            100,
          webSocket,
          scriptingScores.webSocket.recordingTime,
          scriptingScores.webSocket.scriptingTime,
          scriptingScores.webSocket.recordingTime
            ? (scriptingScores.webSocket.scriptingTime /
                scriptingScores.webSocket.recordingTime) *
              100
            : 0,
          (scriptingScores.webSocket.scriptingTime /
            scriptingScores.global.recordingTime) *
            100,
          postMessageCount,
        ]);
      } catch (e) {
        console.log(
          'Could not process file: %s',
          traceFile,
          e.message,
          e.stack,
        );
        done(null, [id, url, e.message]);
      } finally {
        reportProgress();
      }
    },
    { parallel: 1 },
  );

const doProcessing = async (inputFile, outputFile) => {
  fs.createReadStream(inputFile)
    .pipe(parse({ relax_column_count: true }))
    .pipe(processFile(inputFile))
    .pipe(
      stringify({
        header: true,
        columns: [
          'id',
          'url',
          'error',
          'recordingTime',
          'globalScriptingTime',
          'globalScriptingScore',
          'backgroundRecordingTime',
          'backgroundScriptingTime',
          'backgroundScriptingScore',
          'worker',
          'workerScriptingTime',
          'workerScriptingScore',
          'webSocket',
          'webSocketRecordingTime',
          'webSocketScriptingTime',
          'webSocketScriptingScore',
          'webSocketScriptingScoreGlobal',
          'postMessageCount',
        ],
      }),
    )
    .pipe(fs.createWriteStream(path.join(path.dirname(inputFile), outputFile)));
};

program
  .arguments('<input-file>')
  .option('-o, --outfile <filename>', 'output filename', 'processed.csv')
  .action((inputFile, options) => {
    doProcessing(inputFile, options.outfile);
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
