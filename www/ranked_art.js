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
  /* V127: madalya = Figma'da üretilen gerçekçi lig amblemi (assets/ranked/lgN.webp, siyah zemin saydam yapılmış).
     lg = WCRank.league() çıktısı ({i, div}), size = piksel (kare). Kademe (I/II/III) büyük madalyada rozet olarak çizilir. */
  var IMGS = ['assets/ranked/lg0.webp', 'assets/ranked/lg1.webp', 'assets/ranked/lg2.webp', 'assets/ranked/lg3.webp', 'assets/ranked/lg4.webp', 'assets/ranked/lg5.webp'];
  function medal(lg, size) {
    var i = Math.max(0, Math.min(IMGS.length - 1, (lg && lg.i) || 0)), w = size || 120, d = (lg && lg.div) || 0, rom = ['', 'I', 'II', 'III'][d] || '';
    return '<span class="wcr-medal-w" style="width:' + w + 'px;height:' + w + 'px"><img class="wcr-medal" src="' + IMGS[i] + '" width="' + w + '" height="' + w + '" alt="" draggable="false" decoding="async">' +
      (rom && w >= 100 ? '<b class="wcr-dv">' + rom + '</b>' : '') + '</span>';
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
