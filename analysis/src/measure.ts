import { curveStepBefore } from 'd3-shape';
import MG from 'metrics-graphics';
import 'd3-transition';
import 'metrics-graphics/dist/metricsgraphics.css';

type DataPoints = {
  key: number;
  value: number;
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
  lastInvocationTime: number;
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
      this.stopRecording();
    }
    this.updateTitle();
  };

  tick = () => {
    if (this.appState.state === AppStates.RECORDING) {
      const start = performance.now();
      const timeSinceLastInvocation = start - this.appState.lastInvocationTime;
      this.appState.dataPoints.push({
        key: start - this.appState.started.ts,
        value: timeSinceLastInvocation,
      });
      let now = start;
      const workUntil = start + this.appState.workingTimeMs;
      while (now < workUntil) {
        now = performance.now();
      }
      this.appState.lastInvocationTime = now;
    }
  };

  startRecording() {
    if (this.appState.state === AppStates.READY) {
      const workingTimeMs = this.getWorkingTimeMs();
      console.log('Starting measurement', workingTimeMs);
      this.appState = {
        state: AppStates.RECORDING,
        workingTimeMs,
        lastInvocationTime: performance.now(),
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
      this.renderResult();
    }
  }

  renderResult() {
    if (this.appState.state === AppStates.FINISHED) {
      console.log('AppState', this.appState);
      const {
        dataPoints: data,
        workingTimeMs,
        started: { date: started },
        ended,
      } = this.appState;
      //const data = dataPoints.map((timeBetween, index) => ({ key: index, value: timeBetween }));
      //const scale = scaleLinear().domain([0, HZ]);
      //const proxy = new Proxy(dataPoints, ArrayLikeData(started, ended, scale));
      //const data = Array.from(proxy as ArrayLike<number>);
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
        yax_format: formatMillis,
        interpolate: curveStepBefore,
        brush: 'x',
        x_rug: true,
      });
    }
  }
}

export default Measurement;
