const fs = require('fs');
const JSONStream = require('JSONStream');
const DevtoolsTimelineModel = require('devtools-timeline-model');
const transform = require('stream-transform');

//const WEBSOCKET_CREATED_EVENT_NAME = 'WebSocketCreate';
const WEBSOCKET_CONNECTED_EVENT_NAME = 'WebSocketReceiveHandshakeResponse';
const WEBSOCKET_DESTROYED_EVENT_NAME = 'WebSocketDestroy';
const isPageVisibilityHiddenEvent = (event) =>
  (event.name === 'TimeStamp' &&
    event.args.data.message === 'visibilitychange_hidden') ||
  (event.name === 'EventDispatch' && event.args.data.type === 'pagehide');

const calculateScriptingScores = async (traceFilePath) => {
  const timeSlicesWithOpenWebSocket = [];
  let openWebSockets = [];
  let webSocketStartedTs;
  let backgroundStartedTs;
  const tapWebSocketEvents = transform((event) => {
    if (isPageVisibilityHiddenEvent(event) && !backgroundStartedTs) {
      backgroundStartedTs = event.ts / 1000;
    } else if (event.name === WEBSOCKET_CONNECTED_EVENT_NAME) {
      if (openWebSockets.length === 0) {
        webSocketStartedTs = event.ts / 1000;
      }
      openWebSockets.push(event.args.data.identifier);
    } else if (event.name === WEBSOCKET_DESTROYED_EVENT_NAME) {
      openWebSockets = openWebSockets.filter(
        (id) => id !== event.args.data.identifier,
      );
      if (openWebSockets.length === 0) {
        timeSlicesWithOpenWebSocket.push([webSocketStartedTs, event.ts / 1000]);
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
  if (openWebSockets.length > 0) {
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
  const recordingTimeWebSocket = timeSlicesWithOpenWebSocket.reduce(
    (agg, timeSlice) =>
      agg + isFinite(timeSlice[1])
        ? timeSlice[1]
        : tracingModel.maximumRecordTime() - timeSlice[0],
    0,
  );

  let scriptingTimeBackground;
  let recordingTimeBackground;
  if (backgroundStartedTs) {
    recordingTimeBackground =
      tracingModel.maximumRecordTime() - backgroundStartedTs;
    const eventCategoriesInBackground = model.bottomUpGroupBy(
      'Category',
      backgroundStartedTs,
      Infinity,
    );
    scriptingTimeBackground = eventCategoriesInBackground
      .map((eventCategories) =>
        eventCategories.bottomUp.children().get('scripting'),
      )
      .filter((scripting) => scripting !== undefined)
      .map((scripting) => scripting.totalTime)
      .reduce(
        (totalScripting, scriptingTime) => totalScripting + scriptingTime,
        0,
      );
  } else {
    console.log('Could not find pagevisibility hidden event');
  }

  return {
    global: {
      scriptingTime: scriptingTimeGlobal,
      recordingTime,
    },
    background: {
      scriptingTime: scriptingTimeBackground,
      recordingTime: recordingTimeBackground,
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
