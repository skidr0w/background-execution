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

- [Chrome budget-based timer throttling](https://developers.google.com/web/updates/2017/03/background_tabs#budget-based_background_timer_throttling)
- [Firefox budget-based timer throttling](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API#Policies_in_place_to_aid_background_page_performance)


## Tracing

Puppeteer allows tracing of web pages. See https://pptr.dev/#?product=Puppeteer&version=v1.16.0&show=api-class-tracing

The resulting json file can then be analysed in Timeline Viewer or Chrome Dev Tools.

https://chromedevtools.github.io/timeline-viewer/

`npm run trace`

# Links and References

- [Puppeteer](https://pptr.dev/)
- [Chrome DevTools Timeline Viewer](https://chromedevtools.github.io/timeline-viewer/)
- [Catapult Tracing Frontend](chrome://tracing/)
- [Catapult Source Code](https://chromium.googlesource.com/catapult/+/HEAD/tracing/README.md)
- [Timeline Event Reference](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/performance-reference)
- [Trace Event Format Specification](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit#heading=h.n7ma43wztmu)
- [Chrome Background Tabs and Offscreen Frames: Future Plans](https://docs.google.com/document/d/18_sX-KGRaHcV3xe5Xk_l6NNwXoxm-23IOepgMx4OlE4/pub)
- [Chrome Background Tabs Throttling](https://developers.google.com/web/updates/2017/03/background_tabs)
- [WHATWG HTML5 Spec Timers and User Prompts](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
- [WebTAP: Princeton Web Transparency & Accountability Project](https://webtap.princeton.edu/)

## Related research
- [Truth in Web Mining: Measuring the Profitability and Cost of Cryptominers as a Web Monetization Model](https://arxiv.org/pdf/1806.01994.pdf)
- [Online Tracking: A 1-million-site Measurement and Analysis](http://randomwalker.info/publications/OpenWPM_1_million_site_tracking_measurement.pdf)
- [Understanding abusive web resources: characteristics and counter-measures of malicious web resources and cryptocurrency mining](https://dl.acm.org/citation.cfm?id=3289174)