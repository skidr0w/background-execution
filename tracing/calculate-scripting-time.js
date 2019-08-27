const fs = require('fs');
const JSONStream = require('JSONStream');
const DevtoolsTimelineModel = require('devtools-timeline-model');
const transform = require('stream-transform');

const WEBSOCKET_CREATED_EVENT_NAME = 'WebSocketCreate';
const WEBSOCKET_CONNECTED_EVENT_NAME = 'WebSocketReceiveHandshakeResponse';
const WEBSOCKET_DESTROYED_EVENT_NAME = 'WebSocketDestroy';

const calculateScriptingScores = async (traceFilePath) => {
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

  const tracingModel = model.tracingModel();
  const recordingTime =
    tracingModel.maximumRecordTime() - tracingModel.minimumRecordTime();
  const eventCategoriesForTracks = model.bottomUpGroupBy('Category');
  const scriptingTimeGlobal = eventCategoriesForTracks
    .map((eventCategories) =>
      eventCategories.bottomUp.children().get('scripting'),
    )
    .filter((scripting) => scripting !== undefined)
    .map((scripting) => scripting.totalTime)
    .reduce(
      (totalScripting, scriptingTime) => totalScripting + scriptingTime,
      0,
    );

  const scriptingTimeWorker = eventCategoriesForTracks
    .filter(
      (eventCategoriesForTracks) =>
        eventCategoriesForTracks.trackType === 'Worker',
    )
    .map((eventCategories) =>
      eventCategories.bottomUp.children().get('scripting'),
    )
    .filter((scripting) => scripting !== undefined)
    .map((scripting) => scripting.totalTime)
    .reduce(
      (totalScripting, scriptingTime) => totalScripting + scriptingTime,
      0,
    );

  let scriptingTimeWebSocket = 0;
  for (const timeSlice of timeSlicesWithOpenWebSocket) {
    const eventCategoriesDuringOpenWebsocket = model.bottomUpGroupBy(
      'Category',
      timeSlice[0],
      timeSlice[1],
    );
    scriptingTimeWebSocket = eventCategoriesDuringOpenWebsocket
      .filter(
        (eventCategoriesForTracks) =>
          eventCategoriesForTracks.trackType === 'MainThread',
      )
      .map((eventCategories) =>
        eventCategories.bottomUp.children().get('scripting'),
      )
      .filter((scripting) => scripting !== undefined)
      .map((scripting) => scripting.totalTime)
      .reduce(
        (totalScripting, scriptingTime) => totalScripting + scriptingTime,
        scriptingTimeWebSocket,
      );
  }
  const recordingTimeWebSocket =
    timeSlicesWithOpenWebSocket.reduce(
      (agg, timeSlice) => agg + timeSlice[1] - timeSlice[0],
      0,
    ) / 1000;

  return {
    global: {
      scriptingTime: scriptingTimeGlobal,
      recordingTime,
    },
    worker: {
      scriptingTime: scriptingTimeWorker,
      recordingTime,
    },
    webSocket: {
      scriptingTime: scriptingTimeWebSocket,
      recordingTime: recordingTimeWebSocket,
    },
  };
};

module.exports = {
  calculateScriptingScores,
};
