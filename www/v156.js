/* V156 — oyun içi duraklatma kartı yeni "Siper Defteri" görünümü: defne dallı amblem, köşe işlemeleri, süslü ayırıcı, kutusuz yazı menüsü.
   İşlevler v141.js'ten aynen gelir (Oyuna Dön, Kaydet, Ayarlar, Oyun Geçmişi, Dil, Ana Menü, Yeni Oyun, Pes Et); yalnızca görünüm eklenir.
   Geri almak için index.html'den v156.js ve v156.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'tr') ? tr : en; }

  var CORNER = '<svg class="c156" viewBox="0 0 46 46" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">' +
    '<path d="M2 44V14Q2 2 14 2H44"/><path d="M8 44V18Q8 8 18 8H44" stroke-width=".8" opacity=".6"/>' +
    '<path d="M13 13l4-4 4 4-4 4z" fill="currentColor" stroke="none"/>' +
    '<circle cx="2" cy="44" r="1.6" fill="currentColor" stroke="none"/><circle cx="44" cy="2" r="1.6" fill="currentColor" stroke="none"/></svg>';

  // defne dalı: iki yay üzerinde yapraklar, ortada baklava
  function laurel() {
    var cx = 60, cy = 28, r = 26, out = '';
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 8; i++) {
        var deg = 92 + i * 12.5;
        var a = (side < 0 ? deg : 180 - deg) * Math.PI / 180;
        var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        var tang = (side < 0 ? deg + 90 : 180 - deg - 90);
        [-32, 32].forEach(function (off) {
          out += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="6.2" ry="2.3" transform="rotate(' + (tang + off * side).toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" opacity="' + (off < 0 ? '.95' : '.65') + '"/>';
        });
      }
    }
    out += '<path d="M60 19l7 9-7 9-7-9z"/><path d="M60 40v10" stroke="currentColor" stroke-width="1.4"/><circle cx="60" cy="55" r="2"/>';
    return '<svg class="e156" viewBox="0 0 120 64" fill="currentColor" aria-hidden="true">' + out + '</svg>';
  }

  function decorate() {
    var p = document.querySelector('#box .wc141p');
    if (!p || p.classList.contains('wc156')) return;
    p.classList.add('wc156');
    var m = document.getElementById('mod'); if (m) m.classList.add('wc156');
    var h = p.querySelector('.c141h');
    // köşe işlemeleri + amblem + üst başlık
    p.insertAdjacentHTML('afterbegin',
      '<span class="k156 k1">' + CORNER + '</span><span class="k156 k2">' + CORNER + '</span>' +
      '<span class="k156 k3">' + CORNER + '</span><span class="k156 k4">' + CORNER + '</span>' +
      laurel() + '<p class="kick156">World Conquest</p>');
    // başlığın altına süslü ayırıcı
    if (h) h.insertAdjacentHTML('afterend', '<div class="d156" aria-hidden="true"><i></i><s></s><b></b><s></s><i></i></div>');
  }

  window.v156Decorate = decorate;   /* V214: oyun bitti kartı da aynı süslemeyi kullanır */
  var _menu = menu;
  menu = function () {
    var r = _menu.apply(this, arguments);
    try { decorate(); } catch (e) { try { console.error('v156', e); } catch (x) { } }
    return r;
  };
})();
