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
  const eventCategories = model.bottomUpGroupBy('Category');
  const recordingTime =
    tracingModel.maximumRecordTime() - tracingModel.minimumRecordTime();
  const scriptingTime = eventCategories.children().get('scripting').totalTime;
  return { scriptingTime, recordingTime };
};

module.exports = {
  loadDevtoolsModel,
  calculateScriptingTimeFraction,
};
