import Measurement from './measure';

const measurement = new Measurement(() => {
  let intervalId: number | null = null;
  return {
    start: (callback) => {
      intervalId = window.setInterval(function () {
        const runUntil = performance.now() + 1000;
        while (performance.now() < runUntil) {
          callback();
        }
      }, 0);
    },
    stop: function () {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  }
});