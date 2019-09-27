import Measurement from './measure';

const workDurationInput = document.getElementById(
  'work-duration',
) as HTMLInputElement;

declare global {
  interface Window {
    AudioContext: any;
    webkitAudioContext: any;
    myAudioContext: any;
  }
}

const measurement = new Measurement(
  () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    window.myAudioContext = new AudioContext();
    let intervalId: number | null = null;
    return {
      start: (callback) => {
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
