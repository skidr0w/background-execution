const parseInitiator = (err) => {
  const documentURL = document.URL;
  const { stack } = err;
  const lines = stack.split('\n');
  if (lines.length > 2) {
    const caller = lines[2];
    const match = caller.match(/\((\S+\))/);
    if (match) {
      return {
        documentURL,
        caller: match[1],
      };
    }
  }
  return {
    documentURL,
  };
};

const hookPostMessage = () => {
  const originalPostMessage = postMessage;
  window.postMessage = function() {
    const initiator = parseInitiator(new Error());
    reportPostMessage(initiator, ...arguments);
    console.count('postMessage');
    console.timeStamp('postMessage');
    return originalPostMessage(...arguments);
  };
};

const hookWebSocket = () => {
  const handleOpen = () => {
    console.timeStamp('WebSocket connected');
  };
  const handleClose = () => {
    console.timeStamp('WebSocket disconnected');
  };
  const handleMessage = (...args) => {
    console.timeStamp('WebSocket message');
    console.log('WebSocket message:', ...args);
  };
  window.WebSocket = class extends WebSocket {
    constructor(...args) {
      super(...args);
      const initiator = parseInitiator(new Error());
      reportWebSocket(initiator, ...args);
      this.addEventListener('open', handleOpen);
      this.addEventListener('close', handleClose);
      this.addEventListener('message', handleMessage);
    }
  };
};

const createTracingWorker = (WorkerImpl) =>
  class extends WorkerImpl {
    constructor(...args) {
      super(...args);
      reportWorker(document.URL, ...args);
      console.timeStamp('Worker created');
    }
  };

const hookWorker = () => {
  const originalWorker = Worker;
  const originalSharedWorker = SharedWorker;
  const createTracingWorker = (OriginalWorker) => {
    return function() {
      const initiator = parseInitiator(new Error());
      console.timeStamp('Worker created');
      reportWorker(initiator, ...arguments);
      return new OriginalWorker(...arguments);
    };
  };
  window.Worker = createTracingWorker(originalWorker);
  window.SharedWorker = createTracingWorker(originalSharedWorker);
};

hookWorker();
hookWebSocket();
hookPostMessage();
