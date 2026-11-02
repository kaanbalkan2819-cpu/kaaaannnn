/* V117 — Rank ekranı çizimleri: lig madalyaları (3B görünümlü SVG) + kılıç/balta/mızrak/kalkan/gül motifleri.
   Zar (dice3d.js) ile aynı dil: parşömen krem, altın dişli kenar, çapraz kılıçlar, yakut. Harici dosya/görsel yok. */
(function () {
  'use strict';
  var uid = 0;
  var PAL = [
    { hi: '#f6c79a', mid: '#c98a4b', lo: '#6e3d17', rb: '#7a1f12' },   // Bronz
    { hi: '#ffffff', mid: '#c4cbd6', lo: '#69718a', rb: '#2d3f7a' },   // Gümüş
    { hi: '#fff1a8', mid: '#f2c14e', lo: '#9a6a0e', rb: '#8a1d16' },   // Altın
    { hi: '#e6fffb', mid: '#7fe0d4', lo: '#2b857d', rb: '#0f5a56' },   // Platin
    { hi: '#eaf5ff', mid: '#7ab8ff', lo: '#2a5eb4', rb: '#16367a' },   // Elmas
    { hi: '#ffd6bf', mid: '#ff7a59', lo: '#9c2610', rb: '#5e0b17' }    // Şampiyon
  ];
  function f(n) { return (+n).toFixed(1); }
  function teeth(cx, cy, r1, r2, n) {
    var d = '', i, a, r;
    for (i = 0; i < n * 2; i++) { a = Math.PI * i / n - Math.PI / 2; r = i % 2 ? r1 : r2; d += (i ? 'L' : 'M') + f(cx + r * Math.cos(a)) + ' ' + f(cy + r * Math.sin(a)); }
    return d + 'Z';
  }
  function star(cx, cy, R, r) {
    var d = '', i, a, q;
    for (i = 0; i < 10; i++) { a = Math.PI * i / 5 - Math.PI / 2; q = i % 2 ? r : R; d += (i ? 'L' : 'M') + f(cx + q * Math.cos(a)) + ' ' + f(cy + q * Math.sin(a)); }
    return d + 'Z';
  }
  function laurel(cx, cy, r, side, col1, col2) {
    var s = '', k, th, x, y, ph, tilt;
    for (k = 0; k < 9; k++) {
      th = (22 + k * 15) * Math.PI / 180;
      x = cx + side * r * Math.sin(th); y = cy + r * Math.cos(th);
      ph = Math.atan2(-Math.sin(th), side * Math.cos(th)) * 180 / Math.PI;
      tilt = (k % 2 ? 28 : -28) * side;
      s += '<ellipse cx="0" cy="0" rx="9.5" ry="3.8" transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(ph + tilt) + ')" fill="' + (k % 2 ? col1 : col2) + '" stroke="#4a3208" stroke-width=".6"/>';
    }
    return s;
  }
  /* madalya: lg = WCRank.league() çıktısı ({i, div}), size = piksel genişlik */
  function medal(lg, size) {
    var i = lg.i, p = PAL[i] || PAL[0], id = 'wm' + (++uid), w = size || 120, h = Math.round(w * 1.2), d = lg.div || 0;
    var rom = ['', 'I', 'II', 'III'][d] || '';
    var s = '<svg class="wcr-medal" width="' + w + '" height="' + h + '" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#e0b04a"/><stop offset="1" stop-color="#7a4d0c"/></linearGradient>' +
      '<linearGradient id="' + id + 'q" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p.hi + '"/><stop offset=".45" stop-color="' + p.mid + '"/><stop offset="1" stop-color="' + p.lo + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'qd" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.mid + '"/><stop offset="1" stop-color="' + p.lo + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'gd" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b88a3a"/><stop offset="1" stop-color="#4d3008"/></linearGradient>' +
      '<radialGradient id="' + id + 'm" cx=".36" cy=".3" r=".9"><stop offset="0" stop-color="' + p.hi + '"/><stop offset=".5" stop-color="' + p.mid + '"/><stop offset="1" stop-color="' + p.lo + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + p.rb + '"/><stop offset=".5" stop-color="#c0392b"/><stop offset="1" stop-color="' + p.rb + '"/></linearGradient>' +
      '<linearGradient id="' + id + 's" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d8aa3"/><stop offset=".5" stop-color="#f4f7fc"/><stop offset="1" stop-color="#8d99b2"/></linearGradient>' +
      '<linearGradient id="' + id + 'p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8e2"/><stop offset="1" stop-color="#d6c593"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><circle cx="100" cy="128" r="84"/></clipPath></defs>';
    /* kurdele kuyrukları */
    s += '<path d="M58 4L96 4L128 90L92 90Z" fill="url(#' + id + 'r)" stroke="#2a0a08" stroke-width="1.4"/><path d="M142 4L104 4L72 90L108 90Z" fill="url(#' + id + 'r)" stroke="#2a0a08" stroke-width="1.4"/>' +
      '<path d="M70 4L82 4L112 90L100 90Z" fill="#ffffff" opacity=".13"/>' +
      '<circle cx="100" cy="44" r="9" fill="none" stroke="url(#' + id + 'g)" stroke-width="5"/>';
    /* dişli altın kenar + iç halka */
    s += '<path d="' + teeth(100, 128, 79, 88, 28) + '" fill="url(#' + id + 'q)" stroke="#3a2406" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="100" cy="128" r="75" fill="url(#' + id + 'qd)" stroke="#fff3c4" stroke-width="1.2"/>' +
      '<circle cx="100" cy="128" r="69" fill="none" stroke="#2f1d05" stroke-width="1.5"/>';
    /* yakut taşlar */
    [45, 135, 225, 315].forEach(function (a) {
      var t = a * Math.PI / 180;
      s += '<circle cx="' + f(100 + 83.5 * Math.cos(t)) + '" cy="' + f(128 + 83.5 * Math.sin(t)) + '" r="3.6" fill="#d23a2a" stroke="#4d0f08" stroke-width="1"/><circle cx="' + f(99 + 83.5 * Math.cos(t)) + '" cy="' + f(127 + 83.5 * Math.sin(t)) + '" r="1.1" fill="#ffd0c8"/>';
    });
    /* defne dalları */
    s += laurel(100, 128, 62, 1, '#e7c15a', '#b88a2c') + laurel(100, 128, 62, -1, '#e7c15a', '#b88a2c');
    /* madalya yüzü */
    s += '<circle cx="100" cy="128" r="50" fill="url(#' + id + 'm)" stroke="' + p.lo + '" stroke-width="2"/><circle cx="100" cy="128" r="45" fill="none" stroke="' + p.hi + '" stroke-width="1.2" opacity=".8"/>' +
      '<circle cx="100" cy="128" r="45" fill="none" stroke="' + p.lo + '" stroke-width=".8" stroke-dasharray="2 3.4" opacity=".7"/>';
    /* çapraz kılıçlar */
    function sword(rot) {
      return '<g transform="translate(100 128) rotate(' + rot + ') scale(.8)"><path d="M0 -62L7 -50L7 24L-7 24L-7 -50Z" fill="url(#' + id + 's)" stroke="#3a4560" stroke-width="1.6"/><path d="M0 -58L0 22" stroke="#ffffff" stroke-width="1.2" opacity=".7"/>' +
        '<rect x="-22" y="24" width="44" height="8" rx="3" fill="url(#' + id + 'g)" stroke="#4d3008" stroke-width="1.4"/><rect x="-4.5" y="32" width="9" height="20" rx="3" fill="#5e1a10" stroke="#2a0a08" stroke-width="1.2"/><circle cx="0" cy="56" r="6.5" fill="url(#' + id + 'g)" stroke="#4d3008" stroke-width="1.2"/></g>';
    }
    s += sword(-42) + sword(42);
    /* kalkan + simge */
    s += '<g transform="translate(100 128) scale(.8) translate(-100 -128)"><path d="M100 104L119 110L119 130Q119 144 100 153Q81 144 81 130L81 110Z" fill="url(#' + id + 'r)" stroke="url(#' + id + 'g)" stroke-width="3" stroke-linejoin="round"/>';
    if (i === 5) s += '<path d="M88 138L88 122L94 130L100 118L106 130L112 122L112 138Z" fill="url(#' + id + 'g)" stroke="#4d3008" stroke-width="1"/><circle cx="100" cy="116" r="2.4" fill="#fff3c4"/>';
    else if (i >= 3) s += '<path d="M100 114L111 126L100 142L89 126Z" fill="' + p.hi + '" stroke="' + p.lo + '" stroke-width="1.4"/><path d="M89 126L111 126M100 114L100 142" stroke="' + p.lo + '" stroke-width=".8" opacity=".7"/>';
    else s += '<path d="' + star(100, 128, 12, 5) + '" fill="#fff0b0" stroke="#7a4d0c" stroke-width="1.2" stroke-linejoin="round"/>' + (i >= 1 ? '<path d="' + star(100, 128, 12, 5) + '" fill="none"/>' : '');
    s += '</g>';
    /* alt plaket (zar parşömeni): kademe */
    s += '<path d="M44 190L156 190L148 204L156 218L44 218L52 204Z" fill="url(#' + id + 'p)" stroke="url(#' + id + 'gd)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M44 190L28 198L36 204L28 214L44 218" fill="#c4a85f" stroke="#4d3008" stroke-width="1.6" stroke-linejoin="round"/><path d="M156 190L172 198L164 204L172 214L156 218" fill="#c4a85f" stroke="#4d3008" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<text x="100" y="212" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="22" fill="#3b2412" letter-spacing="3">' + (i === 5 ? '★' : rom) + '</text>';
    /* parlama + kayan ışık */
    s += '<path d="M40 112A62 62 0 0 1 112 62" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".45"/>' +
      '<g clip-path="url(#' + id + 'c)"><rect x="-60" y="30" width="26" height="200" fill="#ffffff" opacity=".38" transform="rotate(24 100 128)"></rect></g>';
    return s + '</svg>';
  }
  /* küçük (liste/lobi) madalya */
  function mini(lg, size) { return '<span class="wcr-mini" style="width:' + (size || 22) + 'px">' + medal(lg, size || 22) + '</span>'; }

  /* ---- silah/gül motifleri (sprite) ---- */
  var SPR = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="wca-bl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d99b2"/><stop offset=".5" stop-color="#f4f7fc"/><stop offset="1" stop-color="#7d8aa3"/></linearGradient>' +
    '<linearGradient id="wca-go" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#d9a93f"/><stop offset="1" stop-color="#7a4d0c"/></linearGradient>' +
    '<radialGradient id="wca-ro" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f0604f"/><stop offset=".6" stop-color="#b3261e"/><stop offset="1" stop-color="#5e0b0b"/></radialGradient>' +
    /* kılıç 24x120 */
    '<symbol id="wcr-sword" viewBox="0 0 24 120"><path d="M12 2L17 14L17 82L7 82L7 14Z" fill="url(#wca-bl)" stroke="#3a4560" stroke-width="1"/><path d="M12 6L12 80" stroke="#fff" stroke-width=".9" opacity=".7"/><rect x="2" y="82" width="20" height="6" rx="2.5" fill="url(#wca-go)" stroke="#4d3008" stroke-width="1"/><rect x="9" y="88" width="6" height="22" rx="2.5" fill="#5e1a10" stroke="#2a0a08" stroke-width=".9"/><circle cx="12" cy="113" r="5.5" fill="url(#wca-go)" stroke="#4d3008" stroke-width="1"/></symbol>' +
    /* balta 60x120 */
    '<symbol id="wcr-axe" viewBox="0 0 60 120"><rect x="27" y="8" width="5" height="108" rx="2" fill="#6b3f1a" stroke="#2a1608" stroke-width="1"/><path d="M32 12Q60 4 57 32Q55 52 32 56Z" fill="url(#wca-bl)" stroke="#3a4560" stroke-width="1.2"/><path d="M27 12Q0 4 3 32Q5 52 27 56Z" fill="url(#wca-bl)" stroke="#3a4560" stroke-width="1.2"/><path d="M36 22Q50 20 50 32M23 22Q9 20 9 32" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/><rect x="24" y="50" width="11" height="6" rx="2" fill="url(#wca-go)" stroke="#4d3008" stroke-width=".9"/><path d="M29.5 0L34 9L25 9Z" fill="url(#wca-go)" stroke="#4d3008" stroke-width=".8"/></symbol>' +
    /* mızrak 20x130 */
    '<symbol id="wcr-spear" viewBox="0 0 20 130"><path d="M10 0L17 26L10 22L3 26Z" fill="url(#wca-bl)" stroke="#3a4560" stroke-width="1"/><rect x="8" y="22" width="4" height="104" rx="2" fill="#6b3f1a" stroke="#2a1608" stroke-width=".9"/><rect x="5" y="26" width="10" height="5" rx="2" fill="url(#wca-go)" stroke="#4d3008" stroke-width=".8"/><path d="M10 30L16 44L10 40L4 44Z" fill="#b3261e" stroke="#5e0b0b" stroke-width=".8"/></symbol>' +
    /* kalkan 60x72 */
    '<symbol id="wcr-shield" viewBox="0 0 60 72"><path d="M30 2L56 10L56 36Q56 58 30 70Q4 58 4 36L4 10Z" fill="#5e0b17" stroke="url(#wca-go)" stroke-width="4" stroke-linejoin="round"/><path d="M30 10L30 62M10 28L50 28" stroke="url(#wca-go)" stroke-width="3"/><path d="M30 18L35 28L30 38L25 28Z" fill="url(#wca-go)"/></symbol>' +
    /* gül 40x40 */
    '<symbol id="wcr-rose" viewBox="0 0 40 40"><path d="M20 22Q6 36 2 28Q10 24 20 22Z" fill="#2f6b34" stroke="#143a18" stroke-width=".8"/><path d="M20 22Q34 36 38 28Q30 24 20 22Z" fill="#2f6b34" stroke="#143a18" stroke-width=".8"/>' +
    '<g stroke="#4a0808" stroke-width=".8"><ellipse cx="20" cy="9.5" rx="7" ry="8" fill="url(#wca-ro)"/><ellipse cx="30.5" cy="17" rx="7" ry="8" fill="url(#wca-ro)" transform="rotate(72 30.5 17)"/><ellipse cx="26.5" cy="29" rx="7" ry="8" fill="url(#wca-ro)" transform="rotate(144 26.5 29)"/><ellipse cx="13.5" cy="29" rx="7" ry="8" fill="url(#wca-ro)" transform="rotate(216 13.5 29)"/><ellipse cx="9.5" cy="17" rx="7" ry="8" fill="url(#wca-ro)" transform="rotate(288 9.5 17)"/></g>' +
    '<circle cx="20" cy="20" r="8" fill="#c2332a" stroke="#4a0808" stroke-width=".8"/><path d="M20 20m-5 0a5 5 0 1 1 5 5M20 20m-2.4 0a2.4 2.4 0 1 1 2.4 2.4" fill="none" stroke="#5e0b0b" stroke-width="1" stroke-linecap="round"/><circle cx="17.5" cy="16.5" r="1.8" fill="#ff9a8c" opacity=".7"/></symbol>' +
    '</defs></svg>';
  function ensure() { if (document.getElementById('wcr-sprite')) return; var d = document.createElement('div'); d.id = 'wcr-sprite'; d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; d.innerHTML = SPR; (document.body || document.documentElement).appendChild(d); }
  function ic(name, w, h, cls, style) { ensure(); return '<svg class="wcr-ic ' + (cls || '') + '" width="' + w + '" height="' + h + '" viewBox="' + ({ sword: '0 0 24 120', axe: '0 0 60 120', spear: '0 0 20 130', shield: '0 0 60 72', rose: '0 0 40 40' }[name]) + '" style="' + (style || '') + '" aria-hidden="true"><use href="#wcr-' + name + '"/></svg>'; }
  /* çapraz kılıçlar (başlık / düğme süsü) */
  function crossed(sz, cls) {
    ensure(); var u = '<use href="#wcr-sword" x="38" y="-6" width="24" height="112"/>';
    return '<svg class="wcr-ic ' + (cls || '') + '" width="' + sz + '" height="' + sz + '" viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-42 50 50)">' + u + '</g><g transform="rotate(42 50 50)">' + u + '</g></svg>';
  }
  window.WCArt = { medal: medal, mini: mini, ic: ic, crossed: crossed, ensure: ensure, PAL: PAL };
})();
