const fs = require('fs');
const JSONStream = require('JSONStream');
const DevtoolsTimelineModel = require('devtools-timeline-model');

const loadDevtoolsModel = async (traceFilePath) => {
  const traceEventsStream = fs
    .createReadStream(traceFilePath, 'utf8')
    .pipe(JSONStream.parse('traceEvents.*'));
  const model = new DevtoolsTimelineModel();
  await model.init(traceEventsStream);
  return model;
};

const calculateScriptingTimeFraction = (model) => {
  const tracingModel = model.tracingModel();
  const recordingTime =
    tracingModel.maximumRecordTime() - tracingModel.minimumRecordTime();
  const eventCategoriesForTracks = model.bottomUpGroupBy('Category');
  const scriptingTime = eventCategoriesForTracks
    .map((eventCategories) =>
      eventCategories.bottomUp.children().get('scripting'),
    )
    .filter((scripting) => scripting !== undefined)
    .map((scripting) => scripting.totalTime)
    .reduce(
      (totalScripting, scriptingTime) => totalScripting + scriptingTime,
      0,
    );
  return { scriptingTime, recordingTime };
};

module.exports = {
  loadDevtoolsModel,
  calculateScriptingTimeFraction,
};
