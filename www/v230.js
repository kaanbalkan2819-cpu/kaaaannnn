/* V230 — basılı tutma menüsü engeli, açılış BKB logosu, Zor Mod.
   Zor Mod: oyun normal modda kazanılınca açılır (localStorage wc_hard230). Yeni oyunda sorulur; yapay zekâ ülkelerin savaş değerleri +%20. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function field(t) { return !!(t && t.closest && t.closest('input,textarea,[contenteditable="true"]')); }
  /* ---- basılı tutunca kopyala/yapıştır çıkmasın (metin kutuları hariç) ---- */
  document.addEventListener('contextmenu', function (e) { if (!field(e.target)) e.preventDefault(); }, true);
  document.addEventListener('selectstart', function (e) { if (!field(e.target)) e.preventDefault(); }, true);

  /* ---- V236: savaş yorgunluğu bildirimine dokununca kapanır ---- */
  document.addEventListener('click', function (e) { try { var w = e.target && e.target.closest && e.target.closest('.wfat'); if (w) w.classList.remove('on'); } catch (x) { } }, true);

  /* ---- BKB açılış logosu: ana menü (ya da kaldığın oyun) hazır olana kadar ---- */
  (function () {
    var el = document.getElementById('bkb230'), t0 = window.__bkbT0 || Date.now(); if (!el) return;
    var gone = false;
    function bye() { if (gone) return; gone = true; clearInterval(iv); el.classList.add('out'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450); }
    var iv = setInterval(function () {
      var dt = Date.now() - t0, ready = document.body.classList.contains('wcm-on') || !!window.G;
      if ((ready && dt > 1800) || dt > 12000) bye();
    }, 100);
  })();

  /* ---- Zor Mod ---- */
  function hardOn() { try { return !!localStorage.getItem('wc_hard230'); } catch (e) { return false; } }
  setInterval(function () { try { if (window.G && !G.mp && G.over && G.over.w === 0) { if (!G.hard && !hardOn()) localStorage.setItem('wc_hard230', '1'); if (G.hard === 1) localStorage.setItem('wc_iron237', '1'); } } catch (e) { } }, 1000);
  var want = 0, AIK = [1, 1.25, 1.5];   /* V237: rakip gücü: Normal, Zor +%25, Iron Man +%50 */
  function wrapNew() {
    if (typeof newGame !== 'function' || newGame.v230) return;
    var _n = newGame;
    newGame = function (m) {
      var self = this, a = arguments;
      function go(h) { want = h; var r = _n.apply(self, a); try { if (window.G && m == 1) G.hard = h; } catch (e) { } return r; }
      var ons = null; try { ons = window.WCOnline && WCOnline._state && WCOnline._state(); } catch (e) { }
      if (m != 1 || (ons && (ons.side || ons.ranked))) return go(0);   /* online ve ranked maçta zorluk yok */
      if (window.__noAsk230) { window.__noAsk230 = 0; return go(want); }   /* tekrar başla: aynı zorluk */
      var d = window.__diff237 | 0; window.__diff237 = 0; return go(d);   /* zorluk ana menüde seçilir (v35.js) */
    };
    newGame.v230 = 1;
  }
  wrapNew(); window.addEventListener('load', wrapNew); setTimeout(wrapNew, 1500);
  (function warW() {
    if (!window.WCD || !WCD.war) return setTimeout(warW, 500);
    if (WCD.war.v230) return;
    var _w = WCD.war;
    WCD.war = function (att, de) {
      var r = _w.apply(this, arguments);
      try { if (G && G.hard && !G.mp && r) { var k = AIK[G.hard] || 1; if (att !== G.pl) r.A = r.A.map(function (v) { return v * k; }); if (de !== G.pl) r.D = r.D.map(function (v) { return v * k; }); } } catch (e) { }
      return r;
    };
    WCD.war.v230 = 1;
  })();
})();
