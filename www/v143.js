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
