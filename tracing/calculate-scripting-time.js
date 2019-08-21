const fs = require('fs');
const JSONStream = require('JSONStream');
const DevtoolsTimelineModel = require('devtools-timeline-model');
const transform = require('stream-transform');

const WEBSOCKET_CREATED_EVENT_NAME = 'WebSocketCreate';
const WEBSOCKET_CONNECTED_EVENT_NAME = 'WebSocketReceiveHandshakeResponse';
const WEBSOCKET_DESTROYED_EVENT_NAME = 'WebSocketDestroy';

const loadDevtoolsModel = async (traceFilePath) => {
  const timeSlicesWithOpenWebSocket = [];
  let webSocketStartedTs;
  let openWebSocketConnections = 0;
  const tapWebSocketEvents = transform((event) => {
    if (event.name === WEBSOCKET_CONNECTED_EVENT_NAME) {
      if (openWebSocketConnections === 0) {
        webSocketStartedTs = event.ts;
      }
      openWebSocketConnections++;
    } else if (event.name === WEBSOCKET_DESTROYED_EVENT_NAME) {
      openWebSocketConnections--;
      if (openWebSocketConnections === 0) {
        timeSlicesWithOpenWebSocket.push([webSocketStartedTs, event.ts]);
      }
    }
    return event;
  });

  const traceEventsStream = fs
    .createReadStream(traceFilePath, 'utf8')
    .pipe(JSONStream.parse('traceEvents.*'))
    .pipe(tapWebSocketEvents);
  const model = new DevtoolsTimelineModel();
  await model.init(traceEventsStream);
  if (openWebSocketConnections > 0) {
    timeSlicesWithOpenWebSocket.push([webSocketStartedTs, Infinity]);
  }
  return { model, timeSlicesWithOpenWebSocket };
};

const calculateScriptingTimeFraction = (model) => {
  const tracingModel = model.tracingModel();
  const recordingTime =
    tracingModel.maximumRecordTime() - tracingModel.minimumRecordTime();
  debugger;
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
