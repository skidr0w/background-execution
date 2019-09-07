import { curveStepBefore } from 'd3-shape';
import MG from 'metrics-graphics';
import 'd3-transition';
import 'metrics-graphics/dist/metricsgraphics.css';

type DataPoints = {
  timeSinceStart: number;
  timeSinceLastInvocation: number;
  cpuUsage: number;
}[];

enum AppStates {
  READY = 'ready',
  RECORDING = 'recording',
  FINISHED = 'finished',
}

interface ReadyAppState {
  state: AppStates.READY;
}

interface RecordingAppState {
  state: AppStates.RECORDING;
  workingTimeMs: number;
  lastInvocationTime: number | null;
  dataPoints: DataPoints;
  started: {
    date: Date;
    ts: number;
  };
}

interface FinishedAppState {
  state: AppStates.FINISHED;
  workingTimeMs: number;
  dataPoints: DataPoints;
  started: {
    date: Date;
    ts: number;
  };
  ended: Date;
}

type AppState = ReadyAppState | RecordingAppState | FinishedAppState;

type CleanupFn = () => void;
type TickFn = () => void;
type Method = {
  start: (tickFn: TickFn) => void;
  stop: CleanupFn;
};

function documentTitleForState(state: AppState, title: string) {
  switch (state.state) {
    case AppStates.READY:
      return `🆗 ${title} – ready`;
    case AppStates.RECORDING:
      return `⏺️ ${title} – recording`;
    case AppStates.FINISHED:
      return `⏹ ${title} – finished`;
  }
}

function formatDuration(sec_num: number) {
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - hours * 3600) / 60);
  let seconds = sec_num - hours * 3600 - minutes * 60;
  return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${
    seconds < 10 ? '0' : ''
  }${seconds}`;
}

function formatMillis(millis: number) {
  let hours = Math.floor(millis / 3600000);
  let minutes = Math.floor((millis - hours * 3600000) / 60000);
  let seconds = Math.floor((millis - hours * 3600000 - minutes * 60000) / 1000);
  let ms = millis - hours * 3600000 - minutes * 60000 - seconds * 1000;
  let output = '';
  if (hours > 0) {
    output += `${hours}:`;
  }
  if (minutes > 0) {
    output += `${minutes < 10 ? '0' : ''}:`;
  }
  return `${output}${minutes > 0 && seconds < 10 ? '0' : ''}${seconds}.${
    ms < 100 ? '0' : ''
  }${ms < 10 ? '0' : ''}${ms}`;
}

class Measurement {
  private appState: AppState;
  private readonly method: Method;
  private readonly title: string;
  private readonly target: Element;
  private readonly getWorkingTimeMs: () => number;

  constructor(methodFn: () => Method, getWorkingTimeMs: () => number) {
    this.appState = {
      state: AppStates.READY,
    };
    this.method = methodFn();
    this.title = document.title;
    this.target = document.createElement('div');
    this.getWorkingTimeMs = getWorkingTimeMs;
    document.body.appendChild(this.target);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.updateTitle();
  }

  private updateTitle() {
    document.title = documentTitleForState(this.appState, this.title);
  }

  handleVisibilityChange = () => {
    if (document.hidden) {
      this.startRecording();
    } else if (!document.hidden) {
      const appState = this.stopRecording();
      this.renderResult(appState);
    }
    this.updateTitle();
  };

  tick = () => {
    if (this.appState.state === AppStates.RECORDING) {
      const start = performance.now();
      if (this.appState.lastInvocationTime) {
        const timeSinceLastInvocation =
          start - this.appState.lastInvocationTime;
        this.appState.dataPoints.push({
          timeSinceStart: start - this.appState.started.ts,
          timeSinceLastInvocation,
          cpuUsage: 1 / (timeSinceLastInvocation / this.appState.workingTimeMs),
        });
      }
      this.appState.lastInvocationTime = start;
      let now = start;
      const workUntil = start + this.appState.workingTimeMs;
      while (now < workUntil) {
        now = performance.now();
      }
    }
  };

  startRecording() {
    if (this.appState.state === AppStates.READY) {
      const workingTimeMs = this.getWorkingTimeMs();
      console.log('Starting measurement', workingTimeMs);
      this.appState = {
        state: AppStates.RECORDING,
        workingTimeMs,
        lastInvocationTime: null,
        dataPoints: [],
        started: {
          date: new Date(),
          ts: performance.now(),
        },
      };
      this.method.start(this.tick);
    }
  }

  stopRecording() {
    if (this.appState.state === AppStates.RECORDING) {
      this.method.stop();
      this.appState = {
        state: AppStates.FINISHED,
        workingTimeMs: this.appState.workingTimeMs,
        dataPoints: this.appState.dataPoints,
        started: this.appState.started,
        ended: new Date(),
      };
      return this.appState;
    }
  }

  renderResult(appState: AppState) {
    if (appState.state === AppStates.FINISHED) {
      const {
        dataPoints,
        workingTimeMs,
        started: { date: started },
        ended,
      } = appState;

      const data = dataPoints.map((dataPoint) => ({
        key: dataPoint.timeSinceStart,
        value: dataPoint.cpuUsage,
      }));

      MG.data_graphic({
        title: `Working time ${workingTimeMs}ms`,
        data: data,
        full_width: true,
        height: 350,
        target: this.target,
        x_accessor: 'key',
        x_label: 'Seconds in background',
        xax_format: (val: number) => formatDuration(Math.round(val / 1000)),
        y_accessor: 'value',
        y_label: 'Milliseconds since last invocation',
        //yax_format: formatMillis,
        interpolate: curveStepBefore,
        brush: 'x',
        x_rug: true,
      });

      const exportData = dataPoints
        .map(
          (dp) =>
            `${dp.timeSinceStart},${dp.timeSinceLastInvocation},${dp.cpuUsage}`,
        )
        .join('\n');
      const header = 'timeSinceStartMs,timeSinceLastInvocationMs,cpuUsage\n';
      const blob = new Blob([header, exportData], {
        type: 'application/octet-stream',
      });
      const href = URL.createObjectURL(blob);

      const el = document.createElement('a');
      el.href = href;
      el.id = 'download';
      const browserName = parseBrowserName(navigator.userAgent);
      el.download = `${yyyymmddhhmm(new Date())}_${browserName}_${
        this.title
      }_${this.getWorkingTimeMs()}.txt`;
      el.innerText = 'Download results as CSV';
      el.className = 'btn btn-primary';
      this.target.insertAdjacentElement('afterend', el);

      const start = document.getElementById('start') as HTMLLinkElement;
      start.href = 'javascript:location.reload()';
      start.innerText = 'Restart measurement';
    }
  }
}

const yyyymmddhhmm = (date: Date) => {
  return `${date.getFullYear()}${
    date.getMonth() < 10 ? '0' : ''
  }${date.getMonth()}${date.getDate() < 10 ? '0' : ''}${date.getDate()}${
    date.getHours() < 10 ? '0' : ''
  }${date.getHours()}${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`;
};

const parseBrowserName = (userAgent: string) => {
  const isChrome = /Chrome/.test(userAgent);
  const isSafari = /Safari/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  if (isChrome) {
    return 'Chrome';
  } else if (isSafari) {
    return 'Safari';
  } else if (isFirefox) {
    return 'Firefox';
  } else {
    return userAgent;
  }
};

export default Measurement;
