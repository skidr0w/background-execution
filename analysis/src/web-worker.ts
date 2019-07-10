import * as workerTimers from 'worker-timers';
import Measurement from './measure';

const workDurationInput = document.getElementById('work-duration') as HTMLInputElement;

const measurement = new Measurement(() => {
  let intervalId: number | null = null;
  return {
    start: (callback) => {
      intervalId = workerTimers.setInterval(function () {
        callback();
      }, 0);
    },
    stop: function () {
      if (intervalId !== null) {
        workerTimers.clearInterval(intervalId);
        intervalId = null;
      }
    }
  }
}, () => parseInt(workDurationInput.value));