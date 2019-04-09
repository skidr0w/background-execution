# How to achieve background execution in web browsers

I'm trying to find different methods to run code in the background in populer browsers. Each method is described in a seperate file.

1. Simple

    Interval is throttled to once per second maximum, when the tab is not marked as visible. This is the case when another tab is in focus or the browser windows is minimized.

2. Web worker

    Web worker implementation[1] of setInterval. By using a web worker, we can circumvent the throttling in some browser and can execute our callback more often. When the tab is closed, the worker gets terminated.
    
3. Service worker


[1]: https://github.com/chrisguttandin/worker-timers