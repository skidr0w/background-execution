import Measurement from './measure';

const workDurationInput = document.getElementById(
  'work-duration',
) as HTMLInputElement;
const serverAddr = document.getElementById('server-addr') as HTMLInputElement;

const startWebSocket = () => {
  const ws = new WebSocket(serverAddr.value);
  ws.onmessage = (event) => {
    console.log('received websocket message %s', event.data);
  };
  ws.onclose = () => {
    console.log('websocket closed connection');
    setTimeout(() => {
      startWebSocket();
    }, 50);
  };
};

const measurement = new Measurement(
  () => {
    let intervalId: number | null = null;
    return {
      start: (callback) => {
        startWebSocket();
        intervalId = window.setInterval(function() {
          callback();
        }, 0);
      },
      stop: function() {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      },
    };
  },
  () => parseInt(workDurationInput.value),
);
