import * as workerTimers from 'worker-timers';
import Measurement from './measure';

const measurement = new Measurement(() => {
  let intervalId: number | null = null;
  return {
    start: (callback) => {
      intervalId = workerTimers.setInterval(function () {
        const runUntil = performance.now() + 1000;
        while (performance.now() < runUntil) {
          callback();
        }
      }, 0);
    },
    stop: function () {
      if (intervalId !== null) {
        workerTimers.clearInterval(intervalId);
        intervalId = null;
      }
    }
  }
});