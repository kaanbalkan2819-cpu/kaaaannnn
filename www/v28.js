/* V28 — su katmanı, kıyı köpüğü/gölgesi, efekt kalitesi ayarı */
(function () {
  'use strict';
  var FX = '1'; try { FX = localStorage.getItem('wc_fx') || '1'; } catch (e) { }
  function applyFx() { document.body.classList.toggle('fxlow', FX === '0'); }
  applyFx();
  function water() {
    var mp = document.getElementById('map'); if (!mp || document.getElementById('wwater')) return;
    var w = document.createElement('div'); w.id = 'wwater'; w.innerHTML = '<i></i><i></i>'; mp.insertBefore(w, mp.firstChild);
  }
  var shadow = null, foam = null, lastD = '';
  function shore() {
    try {
      if (!window.coast || !window.g) return;
      var d = coast.attr('d'); if (!d) return;
      if (!shadow) {
        shadow = g.insert('path', '.coast').attr('class', 'wcs');   // karanın altında kalmaz: coast'tan önce, ülkelerden SONRA çizilmesi için gc üstüne taşınır
        foam = g.insert('path', '.coast').attr('class', 'wcf');
        // ülke dolgularının üstünde, etiketlerin altında olsun
        var gcn = gc.node(); gcn.parentNode.insertBefore(shadow.node(), gcn); gcn.parentNode.insertBefore(foam.node(), gcn);
      }
      if (d !== lastD) { lastD = d; shadow.attr('d', d); foam.attr('d', d); }
    } catch (e) { }
  }
  var _setup = setup; setup = function () { _setup.apply(this, arguments); shore(); };
  var _zoomEnd = labels; labels = function () { var r = _zoomEnd.apply(this, arguments); shore(); return r; };
  // ayarlar penceresine "Efekt kalitesi" düğmesi
  var _set = settings;
  settings = function () {
    _set.apply(this, arguments);
    try {
      var b = document.getElementById('box'), tr = (typeof L !== 'undefined' && L === 'tr'), btn = document.createElement('button');
      btn.className = 'big'; btn.style.marginTop = '8px';
      function lab() { btn.textContent = '🌊 ' + (tr ? 'Efekt kalitesi: ' : 'Effects: ') + (FX === '0' ? (tr ? 'Düşük' : 'Low') : (tr ? 'Yüksek' : 'High')); }
      lab(); btn.onclick = function () { FX = FX === '0' ? '1' : '0'; try { localStorage.setItem('wc_fx', FX); } catch (e) { } applyFx(); lab(); };
      var ref = b.querySelector('button:last-of-type'); if (ref) b.insertBefore(btn, ref); else b.appendChild(btn);
    } catch (e) { }
  };
  window.addEventListener('load', function () { setTimeout(function () { water(); shore(); }, 0); });
})();
