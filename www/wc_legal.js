/* V111 — Ayarlar menüsüne "Yasal" bölümü: Gizlilik Politikası, Kullanım Koşulları, Lisanslar ve Ses Hakkı (metinler: wc_legal_data.js). */
(function () {
  'use strict';
  function lg() { return (typeof L !== 'undefined' && L === 'en') ? 'en' : 'tr'; }
  window.wcLegalOpen = function (k) {
    try {
      var D = (window.WC_LEGAL || {})[k]; if (!D) return; var d = D[lg()], h = '<div style="text-align:left;max-height:70vh;overflow:auto;-webkit-overflow-scrolling:touch"><h3 style="text-align:center">' + d[0] + '</h3>' + (d[1] ? '<p style="opacity:.7;font-size:12px;text-align:center">' + d[1] + '</p>' : '');
      d[2].forEach(function (s) { h += '<h4 style="margin:14px 0 4px">' + s[0] + '</h4>'; s[1].forEach(function (p) { h += '<p style="margin:4px 0;font-size:14px;line-height:1.45">' + p + '</p>'; }); });
      h += '</div><button class="big" onclick="settings()">← ' + (lg() === 'en' ? 'Back' : 'Geri') + '</button>';
      modal(h);
    } catch (e) { }
  };
  function hook() {
    if (typeof settings !== 'function' || settings.wc111) return;
    var _s = settings;
    settings = function () {
      var r = _s.apply(this, arguments);
      try {
        var p = document.querySelector('#box .wb-panel') || document.getElementById('box'); if (!p || p.querySelector('.wc-legal')) return r;
        var en = lg() === 'en', w = document.createElement('div'); w.className = 'wc-legal';
        w.innerHTML = '<div class="wb-sec">' + (en ? 'Legal' : 'Yasal') + '</div>' +
          [['priv', en ? 'Privacy Policy' : 'Gizlilik Politikası'], ['terms', en ? 'Terms of Use' : 'Kullanım Koşulları'], ['lic', en ? 'Licenses & Audio Rights' : 'Lisanslar ve Ses Hakkı']].map(function (x) {
            return '<button class="big" style="margin:4px 0" onclick="wcLegalOpen(\'' + x[0] + '\')">' + x[1] + '</button>';
          }).join('');
        var back = p.querySelector('button[onclick="menu()"]'); if (back) p.insertBefore(w, back); else p.appendChild(w);
      } catch (e) { }
      return r;
    };
    settings.wc111 = 1;
  }
  hook(); window.addEventListener('load', hook); setTimeout(hook, 1500);
})();
