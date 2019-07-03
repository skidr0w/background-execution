import Measurement from './measure';

const workDurationInput = document.getElementById('work-duration') as HTMLInputElement;

const messageName = 'zero-timeout-message';
let callbackFn: () => void | null = null;

function setZeroInterval(fn: () => void) {
  callbackFn = fn;
  window.postMessage(messageName, "*");
}

function handleMessage(event: MessageEvent) {
  if (event.source == window && event.data == messageName) {
    event.stopPropagation();
    if (callbackFn) {
      callbackFn();
      window.postMessage(messageName, "*");
    }
  }
}

window.addEventListener("message", handleMessage, true);

const measurement = new Measurement(() => {
  return {
    start: (callback) => {
      const workDuration = parseInt(workDurationInput.value);
      console.log('Starting measurement', { workDuration });
      setZeroInterval(function () {
        let now = performance.now();
        const runUntil = now + workDuration;
        while (now < runUntil) {
          now = callback();
        }
      });
    },
    stop: function () {
      callbackFn = null;
    }
  }
});