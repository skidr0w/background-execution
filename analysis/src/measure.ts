import { timeSecond } from 'd3';
import MG from 'metrics-graphics';
import 'd3-transition';
import 'metrics-graphics/dist/metricsgraphics.css';

interface DataPoints {
  [secondsSinceStart: number]: number,
}

enum AppStates {
  READY = 'ready',
  RECORDING = 'recording',
  FINISHED = 'finished',
}

interface ReadyAppState {
  state: AppStates.READY,
}

interface RecordingAppState {
  state: AppStates.RECORDING,
  dataPoints: DataPoints,
  started: {
    date: Date,
    ts: number,
  },
}

interface FinishedAppState {
  state: AppStates.FINISHED,
  dataPoints: DataPoints,
  started: {
    date: Date,
    ts: number,
  },
  ended: Date,
}

type AppState = ReadyAppState | RecordingAppState | FinishedAppState

type CleanupFn = () => void;
type TickFn = () => void;
type Method = {
  start: (tickFn: TickFn) => void
  stop: CleanupFn
}

function ArrayLikeData(start: Date, end: Date): ProxyHandler<DataPoints> {
  const seconds = timeSecond.count(start, end);
  return {
    get: (target, prop) => {
      if (prop === 'length') {
        return seconds;
      } else if (typeof prop === 'string') {
        const key = parseInt(prop);
        return {
          key,
          value: target[key] || 0
        };
      } else {
        return undefined;
      }
    }
  }
}

function documentTitleForState(state: AppStates, title: string) {
  switch (state) {
    case AppStates.READY:
      return `🆗 ${title} – ready`;
    case AppStates.RECORDING:
      return `⏺️ ${title} – recording`;
    case AppStates.FINISHED:
      return `⏹ ${title} – finished`;
  }
}

function formatDuration(sec_num: number) {
  let hours   = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  let seconds = sec_num - (hours * 3600) - (minutes * 60);
  return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 0 ? '0' : ''}${seconds}`;
}

class Measurement {

  private appState: AppState = {
    state: AppStates.READY,
  };
  private readonly method: Method;
  private readonly title: string;
  private readonly target: Element;

  constructor(
    methodFn: () => Method,
  ) {
    this.method = methodFn();
    this.title = document.title;
    this.target = document.createElement('div');
    document.body.appendChild(this.target);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.updateTitle()
  }

  private updateTitle() {
    document.title = documentTitleForState(this.appState.state, this.title);
  }

  handleVisibilityChange = () => {
    if (document.hidden) {
      this.startRecording();
    } else if (!document.hidden) {
      this.stopRecording();
    }
    this.updateTitle()
  };

  tick = () => {
    if (this.appState.state === 'recording') {
      const now = performance.now();
      const deltaMs = now - this.appState.started.ts;
      const secondSinceStart = Math.floor(deltaMs / 1000);
      const count = this.appState.dataPoints[secondSinceStart] || 0;
      this.appState.dataPoints[secondSinceStart] = count + 1;
    }
  };

  startRecording() {
    if (this.appState.state === AppStates.READY) {
      this.appState = {
        state: AppStates.RECORDING,
        dataPoints: {},
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
      const { dataPoints, started: { date : started }, ended } = this.appState;
      const proxy = new Proxy(this.appState.dataPoints, ArrayLikeData(started, ended));
      const data = Array.from(proxy as ArrayLike<number>);

      MG.data_graphic({
        title: 'Background performance',
        data: data,
        full_width: true,
        height: 350,
        target: this.target,
        x_accessor: 'key',
        x_label: 'Seconds in background',
        xax_format: formatDuration,
        y_accessor: 'value',
        y_label: 'Ticks per second',
        brush: 'x',
        x_rug: true,
      });
    }
  }
}

export default Measurement;
