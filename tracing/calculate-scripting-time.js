const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const DevtoolsTimelineModel = require('devtools-timeline-model');

const loadDevtoolsModel = async (traceFilePath) => {
  const traceEvents = await readFileAsync(traceFilePath, 'utf8');
  return new DevtoolsTimelineModel(traceEvents);
};

const calculateScriptingTimeFraction = (model) => {
  const tracingModel = model.tracingModel();
  const eventCategories = model.bottomUpGroupBy('Category');
  const recordingTime =
    tracingModel.maximumRecordTime() - tracingModel.minimumRecordTime();
  const scriptingTime = eventCategories.children.get('scripting').totalTime;
  return scriptingTime / recordingTime;
};

module.exports = {
  loadDevtoolsModel,
  calculateScriptingTimeFraction,
};
