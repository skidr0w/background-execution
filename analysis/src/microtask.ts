import Measurement from './measure';

const workDurationInput = document.getElementById('work-duration') as HTMLInputElement;

const measurement = new Measurement(() => {
  let intervalId: number | null = null;
  let run = true;
  return {
    start: (callback) => {
      function work() {
        callback();
        if (run) {
          setTimeout(() => {
            Promise.resolve().then(work);
          }, 0)
        }
      }
      work();
    },
    stop: function () {
      run = false;
    }
  }
}, () => parseInt(workDurationInput.value));