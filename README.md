# How to achieve background execution in web browsers

I'm trying to find different methods to run code in the background in populer browsers. Each method is described in a seperate file.

1. Simple

    Interval is throttled to once per second maximum, when the tab is not marked as visible. This is the case when another tab is in focus or the browser windows is minimized.

2. Web worker

    Web worker implementation[1] of setInterval. By using a web worker, we can circumvent the throttling in some browser and can execute our callback more often. When the tab is closed, the worker gets terminated.
    
3. Service worker

    Service workers can use setInterval to run concurrently in the background, even when the spawning tab is closed, but there is no guarantee, that the Browser kill the service worker.


[1]: https://github.com/chrisguttandin/worker-timers

## Testing results

OS | UA | setInterval | worker-timers | Service worker setInterval
-|-|-|-|-
macOS Mojave 10.14 | Chrome 74 | Throttles immediatly to 1tick/s | can run indefinitely as long as tab is not closed, arbitrary ticks/s
macOS Mojave 10.14 | Firefox 66 | Throttles immediatly to 1tick/s | can run indefinitely as long as tab is not closed, arbitrary ticks/s | -
macOS Mojave 10.14 | Safari 11 | Throttles immediatly to 1tick/s | - | -
iOS 12 | Mobile Safari | - | - | -
Android | Chrome | - | - | -
Android | Firefox | - | - | -

## Tracing

Puppeteer allows tracing of web pages. See https://pptr.dev/#?product=Puppeteer&version=v1.16.0&show=api-class-tracing

The resulting json file can then be analysed in Timeline Viewer or Chrome Dev Tools.