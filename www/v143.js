/* V143 — TEST AMAÇLI donma sayacı. Ekranın altında yeşil küçük yazıyla donmaları (ms) gösterir.
   Kapatmak için: aşağıdaki ON değerini false yapın ya da index.html'den v143.js satırını silin. */
(function () {
  'use strict';
  var ON = true;
  if (!ON) return;
  var t0 = performance.now(), lines = [], box = null;
  function ts() { return ((performance.now() - t0) / 1000).toFixed(1) + 's'; }
  function show() {
    try {
      if (!box) {
        box = document.createElement('div'); box.id = 'wcperf';
        box.style.cssText = 'position:fixed;left:4px;bottom:64px;z-index:2147483000;pointer-events:none;font:9px/1.2 monospace;color:#7CFF7C;background:rgba(0,0,0,.65);padding:3px 5px;border-radius:4px;max-width:92vw;white-space:pre';
        document.body.appendChild(box);
      }
      box.textContent = lines.join('\n');
    } catch (e) { }
  }
  window.WCPERF = function (s) { log(s); };
  function log(s) { lines.push('[' + ts() + '] ' + s); if (lines.length > 22) lines.shift(); show(); }
  // 1) uzun görevler (ana iş parçacığı kilidi)
  try {
    new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { log('DONMA ' + Math.round(e.duration) + 'ms'); }); }).observe({ entryTypes: ['longtask'] });
  } catch (e) { log('longtask yok'); }
  // 2) kare aralığı (çizim takılması)
  var last = 0;
  (function f(n) {
    if (last && !document.hidden) { var d = n - last; if (d > 90 && d < 3000) log('KARE ' + Math.round(d) + 'ms'); }
    last = document.hidden ? 0 : n; requestAnimationFrame(f);
  })(performance.now());

  // 3b) V147: uzun animasyon karesi (Chrome 123+): donmanın hangi dosya/fonksiyondan geldiğini adıyla yazar
  try {
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) {
        if (e.duration < 100) return;
        var sc = (e.scripts || []).slice().sort(function (a, b) { return b.duration - a.duration; }).slice(0, 2);
        if (!sc.length) { log('LOAF ' + Math.round(e.duration) + 'ms (script yok: stil/yerlesim/GPU ' + Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0) + 'ms)'); return; }
        sc.forEach(function (x) {
          var u = String(x.sourceURL || '').split('/').pop().slice(0, 20);
          log('LOAF ' + Math.round(e.duration) + 'ms ' + Math.round(x.duration) + ' ' + (x.invokerType || '') + ' ' + u + ':' + (x.sourceFunctionName || x.invoker || '?') + ' L' + (x.sourceCharPosition >= 0 ? x.sourceCharPosition : ''));
        });
      });
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch (e) { log('LOAF yok'); }
  // 4) zamanlayıcı / gözlemci / olay dinleyici atfı: 40 ms üstü işleri adıyla yazar (v143 en başta yüklenir)
  function nm(f) { try { return (f.name || String(f).replace(/\s+/g, ' ').slice(0, 60)); } catch (e) { return '?'; } }
  function timed(kind, f) {
    return function () { var a = performance.now(); try { return f.apply(this, arguments); } finally { var d = performance.now() - a; if (d > 40) log(kind + ' ' + Math.round(d) + 'ms ' + nm(f)); } };
  }
  ['setTimeout', 'setInterval'].forEach(function (k) {
    var o = window[k]; window[k] = function (f) { var a = [].slice.call(arguments); if (typeof f === 'function') a[0] = timed(k, f); return o.apply(this, a); };
  });
  var oraf = window.requestAnimationFrame; window.requestAnimationFrame = function (f) { return oraf.call(window, typeof f === 'function' ? timed('raf', f) : f); };
  if (window.requestIdleCallback) { var oric = window.requestIdleCallback; window.requestIdleCallback = function (f, o) { return oric.call(window, typeof f === 'function' ? timed('idle', f) : f, o); }; }
  ['MutationObserver', 'ResizeObserver'].forEach(function (k) {
    var O = window[k]; if (!O) return;
    var W = function (cb) { return new O(typeof cb === 'function' ? timed(k, cb) : cb); }; W.prototype = O.prototype; window[k] = W;
  });
  try {
    var oadd = EventTarget.prototype.addEventListener, orem = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (t, f, c) { if (typeof f === 'function') { f.__wcw = f.__wcw || timed('on:' + t, f); return oadd.call(this, t, f.__wcw, c); } return oadd.apply(this, arguments); };
    EventTarget.prototype.removeEventListener = function (t, f, c) { if (typeof f === 'function' && f.__wcw) return orem.call(this, t, f.__wcw, c); return orem.apply(this, arguments); };
  } catch (e) { }
  // 5) Promise sürümleri (build gibi .then içinde çalışanlar PF ile ölçülür)
  // 3) olay işaretleri
  function wrap(name, label) {
    try {
      var f = window[name]; if (typeof f !== 'function') return;
      window[name] = function () {
        var a = performance.now(); log('> ' + label + (name === 'pickC' ? ' ' + arguments[0] : ''));
        var r = f.apply(this, arguments); log('< ' + label + ' ' + Math.round(performance.now() - a) + 'ms'); return r;
      };
    } catch (e) { }
  }
  window.addEventListener('load', function () {
    setTimeout(function () {
      wrap('pickC', 'ULKE SEC'); wrap('newGame', 'YENI OYUN'); wrap('render', 'render'); wrap('panel', 'panel');
      log('sayac hazir');
    }, 300);
  });
  document.addEventListener('visibilitychange', function () { last = 0; });
})();
