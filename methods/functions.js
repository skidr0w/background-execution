function formatMilliseconds(ms) {
  const sec_num = Math.floor(ms / 1000);
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - hours * 3600) / 60);
  let seconds = sec_num - hours * 3600 - minutes * 60;

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
}

function measure(methodName, methodFunction, callback) {
  let cleanupFunction = null;
  let dataPoints = {};

  function handleVisibilityChange() {
    if (document.hidden) {
      startRecording();
    } else {
      stopRecording();
    }
  }

  function startRecording() {
    dataPoints = {};
    cleanupFunction = methodFunction(tick);
  }

  function stopRecording() {
    if (cleanupFunction) {
      cleanupFunction();
      cleanupFunction = null;
    }
    console.log('dataPoints', dataPoints);
    const keys = Object.keys(dataPoints).sort();
    if (keys.length) {
      const first = keys[0];
      const last = keys[keys.length - 1];
      const totalDurationMs = parseInt(last) - parseInt(first);
      console.log(
        "Recording finished after " + formatMilliseconds(totalDurationMs)
      );
      callback(dataPoints);
    } else {
      console.log(
        "Recording finished but there were no data points measured. Make sure your method function invokes the callback function"
      );
    }
  }

  function tick() {
    const now = new Date();
    const key = now.getTime() - now.getMilliseconds();
    dataPoints[key] = (dataPoints[key] || 0) + 1;
  }

  document.addEventListener("visibilitychange", handleVisibilityChange, false);
}
