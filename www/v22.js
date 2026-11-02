/* V22 — Sonsuz enlem/boylam ızgarası: çizgiler dünya kenarında bitmez, harita sürüklenirken de kalır
   (equirectangular: x/y doğrusal olduğundan çizgiler düz yol olarak çok geniş aralığa uzatılır). */
(function () {
  'use strict';
  function ext() {
    try {
      if (!window.grat || !window.proj) return;
      var o = proj([0, 0]), px = proj([30, 0]), py = proj([0, 30]), dx = px[0] - o[0], dy = py[1] - o[1], d = '', i, a, b;
      a = o[0] - dx * 30; b = o[0] + dx * 30;                       // ±900°
      var y0 = o[1] - Math.abs(dy) * 20, y1 = o[1] + Math.abs(dy) * 20;
      for (i = -30; i <= 30; i++) { var x = o[0] + dx * i; d += 'M' + x.toFixed(1) + ' ' + y0.toFixed(1) + 'L' + x.toFixed(1) + ' ' + y1.toFixed(1); }
      for (i = -20; i <= 20; i++) { var y = o[1] + dy * i; d += 'M' + Math.min(a, b).toFixed(1) + ' ' + y.toFixed(1) + 'L' + Math.max(a, b).toFixed(1) + ' ' + y.toFixed(1); }
      grat.attr('d', d);
    } catch (e) { }
  }
  var _setup = setup;
  setup = function () { var r = _setup.apply(this, arguments); ext(); return r; };
  window.addEventListener('load', function () { setTimeout(ext, 300); setTimeout(ext, 1500); });
})();
