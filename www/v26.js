/* V26 — ülke seçimi akıcılığı
   1) Seçimde kamera hareketi, panel/işaretçi çizildikten SONRAKİ kareye ertelenir (tıklama anında zorunlu yerleşim + animasyon aynı kareye binmez).
   2) Panel yüksekliği önbellekli (app.js panelH) — render/kamera sırasında offsetHeight ile zorunlu yerleşim yok.
   3) Bayrak görselleri boş zamanda önceden yüklenir (panelde ilk açılışta resim çözme takılması yok).
   Oyun kuralları / durum değişmez; yalnızca zamanlama ve ölçüm. */
(function () {
  'use strict';
  var DEFER = false, TK = 0;

  // render / panel panel içeriğini değiştirir -> önbellek eskir, bir sonraki yerleşimden sonra yeniden ölçülür
  var _rd = render;
  render = function () { try { panelDirty(); } catch (e) { } return _rd.apply(this, arguments); };
  var _pn = panel;
  panel = function () { try { panelDirty(); } catch (e) { } return _pn.apply(this, arguments); };

  // pickC içindeki focusSel -> 2 kare sonra (panel + vurgu çizildi, yerleşim temiz). Art arda seçimde yalnızca sonuncusu çalışır.
  var _fs = focusSel;
  focusSel = function (dur) {
    if (!DEFER) return _fs.apply(this, arguments);
    var my = ++TK, a = arguments;
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (my === TK) { try { _fs.apply(null, a); } catch (e) { } } }); });
  };
  var _pk = pickC;
  pickC = function (id) { DEFER = true; try { return _pk.apply(this, arguments); } finally { DEFER = false; } };
  // Başka bir kamera komutu (dünya/ev/yakınlaştır) bekleyen ertelenmiş odağı iptal eder
  ['home', 'worldView', 'zoomBy', 'panBy'].forEach(function (n) {
    var f = window[n]; if (typeof f !== 'function') return;
    window[n] = function () { TK++; return f.apply(this, arguments); };
  });

  // Bayrakları boş zamanda önbelleğe al
  function preload() {
    try {
      var codes = [], seen = {};
      for (var k in FL) { var c = FL[k]; if (c && !seen[c]) { seen[c] = 1; codes.push(c); } }
      var i = 0, keep = window.__flagCache = [];
      (function step(dl) {
        var n = 0;
        while (i < codes.length && n < 12 && (!dl || dl.timeRemaining() > 3)) { var im = new Image(); im.decoding = 'async'; var cd = codes[i++]; im.src = (window.FLAGSVG && FLAGSVG[cd]) || ('flags/' + cd + '.svg'); keep.push(im); n++; }
        if (i < codes.length) (window.requestIdleCallback ? requestIdleCallback(step, { timeout: 1500 }) : setTimeout(step, 80));
      })();
    } catch (e) { }
  }
  window.addEventListener('load', function () { setTimeout(function () { (window.requestIdleCallback ? requestIdleCallback(preload, { timeout: 4000 }) : setTimeout(preload, 1500)); }, 1200); });
})();
