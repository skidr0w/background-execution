!function(t){function e(e){for(var r,o,s=e[0],p=e[1],c=e[2],d=0,l=[];d<s.length;d++)o=s[d],a[o]&&l.push(a[o][0]),a[o]=0;for(r in p)Object.prototype.hasOwnProperty.call(p,r)&&(t[r]=p[r]);for(u&&u(e);l.length;)l.shift()();return i.push.apply(i,c||[]),n()}function n(){for(var t,e=0;e<i.length;e++){for(var n=i[e],r=!0,s=1;s<n.length;s++){var p=n[s];0!==a[p]&&(r=!1)}r&&(i.splice(e--,1),t=o(o.s=n[0]))}return t}var r={},a={1:0},i=[];function o(e){if(r[e])return r[e].exports;var n=r[e]={i:e,l:!1,exports:{}};return t[e].call(n.exports,n,n.exports,o),n.l=!0,n.exports}o.m=t,o.c=r,o.d=function(t,e,n){o.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},o.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},o.t=function(t,e){if(1&e&&(t=o(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var r in t)o.d(n,r,function(e){return t[e]}.bind(null,r));return n},o.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return o.d(e,"a",e),e},o.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},o.p="";var s=window.webpackJsonp=window.webpackJsonp||[],p=s.push.bind(s);s.push=e,s=s.slice();for(var c=0;c<s.length;c++)e(s[c]);var u=p;i.push([5,0]),n()}({0:function(t,e,n){"use strict";var r,a=n(1),i=n(3),o=n.n(i);n(4);!function(t){t.READY="ready",t.RECORDING="recording",t.FINISHED="finished"}(r||(r={}));var s=function(){function t(t){var e=this;this.appState={state:r.READY},this.handleVisibilityChange=function(){document.hidden?e.startRecording():document.hidden||e.stopRecording(),e.updateTitle()},this.tick=function(){if("recording"===e.appState.state){var t=performance.now()-e.appState.started.ts,n=Math.floor(t/1e3),r=e.appState.dataPoints[n]||0;e.appState.dataPoints[n]=r+1}},this.method=t(),this.title=document.title,this.target=document.createElement("div"),document.body.appendChild(this.target),document.addEventListener("visibilitychange",this.handleVisibilityChange),this.updateTitle()}return t.prototype.updateTitle=function(){document.title=function(t,e){switch(t){case r.READY:return"🆗 "+e+" – ready";case r.RECORDING:return"⏺️ "+e+" – recording";case r.FINISHED:return"⏹ "+e+" – finished"}}(this.appState.state,this.title)},t.prototype.startRecording=function(){this.appState.state===r.READY&&(this.appState={state:r.RECORDING,dataPoints:{},started:{date:new Date,ts:performance.now()}},this.method.start(this.tick))},t.prototype.stopRecording=function(){this.appState.state===r.RECORDING&&(console.log(this.method,this.method.stop),this.method.stop(),this.appState={state:r.FINISHED,dataPoints:this.appState.dataPoints,started:this.appState.started,ended:new Date},this.renderResult())},t.prototype.renderResult=function(){if(this.appState.state===r.FINISHED){console.log("AppState",this.appState);var t=this.appState,e=(t.dataPoints,t.started.date),n=t.ended,i=new Proxy(this.appState.dataPoints,(p=e,c=n,u=a.timeSecond.count(p,c),{get:function(t,e){if("length"===e)return u;if("string"==typeof e){var n=parseInt(e);return{key:n,value:t[n]||0}}}})),s=Array.from(i);o.a.data_graphic({title:"Background performance",data:s,full_width:!0,height:350,target:this.target,x_accessor:"key",x_label:"Seconds in background",y_accessor:"value",y_label:"Ticks per second"})}var p,c,u},t}();e.a=s},5:function(t,e,n){"use strict";n.r(e);new(n(0).a)(function(){var t=null;return{start:function(e){t=window.setInterval(function(){for(var t=performance.now()+1e3;performance.now()<t;)e()},0)},stop:function(){null!==t&&(clearInterval(t),t=null)}}})}});