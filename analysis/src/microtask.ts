import Measurement from './measure';

const workDurationInput = document.getElementById('work-duration') as HTMLInputElement;

const measurement = new Measurement(() => {
  let intervalId: number | null = null;
  let run = true;
  return {
    start: (callback) => {
      const workDuration = parseInt(workDurationInput.value);
      console.log('Starting measurement', { workDuration });
      function work() {
        let now = performance.now();
        const runUntil = now + workDuration;
        while (now < runUntil) {
          now = callback();
        }
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
});