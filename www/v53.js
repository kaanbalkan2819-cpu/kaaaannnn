/* V53 — Fetih yapan devletler (en az 2 toprağı olan yapay zekâ imparatorlukları) kendi soluk rengini alır.
   Renk: temel ülke paletinden, oyuncunun koyu kırmızısından ve diğer imparatorlukların renginden ayrı seçilir
   (örn. Gana+Togo ile ABD+Kanada farklı renk). Seçim kalıcıdır (G.ecol), imparatorluk yok olunca serbest kalır.
   Depo sürümü (V52): temel ülke rengi bej (WCD.neutral), ittifaklar kendi rengini (ACOL) korur; v40.js'in col sarmalayıcısının üstüne biner. Test edilmedi. */
(function () {
  'use strict';
  function h2r(h, s, l) { s /= 100; l /= 100; var a = s * Math.min(l, 1 - l); function f(n) { var k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); } return [f(0) * 255, f(8) * 255, f(4) * 255]; }
  function lab(c) {
    function lin(v) { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }
    var r = lin(c[0]), g = lin(c[1]), b = lin(c[2]), x = (r * .4124 + g * .3576 + b * .1805) / .95047, y = r * .2126 + g * .7152 + b * .0722, z = (r * .0193 + g * .1192 + b * .9505) / 1.08883;
    function f(t) { return t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  function dE(a, b) { var p = a[0] - b[0], q = a[1] - b[1], r = a[2] - b[2]; return Math.sqrt(p * p + q * q + r * r); }
  var RED = lab([160, 18, 32]);
  // dışlanacaklar: bej (temel ülke rengi) + v40.js ittifak paleti (ACOL ile aynı liste)
  var BASE = ['hsl(46,30%,38%)', 'hsl(175,32%,50%)', 'hsl(268,26%,62%)', 'hsl(207,38%,60%)', 'hsl(100,26%,52%)', 'hsl(318,26%,64%)', 'hsl(240,24%,70%)',
    'hsl(20,40%,62%)', 'hsl(145,34%,40%)', 'hsl(290,18%,48%)', 'hsl(195,34%,38%)', 'hsl(75,30%,46%)', 'hsl(165,18%,66%)'].map(function (c) { return lab(parseHsl(c)); });
  var CAND = [];
  /* V68: imparatorluk renkleri eskiden çok soluktu (doygunluk %22-36). Şimdi orta-canlı (doygunluk %50-64, parlaklık %40-54): ne soluk ne cırtlak.
     Yeşil bandı (60°-170°) v57'de yalnızca dostlara ayrıldığı için aday olmaz; adaylar birbirinden ve ittifak/bej renklerinden ayrı seçilir. */
  /* V73: aday paleti genişletildi (hue adımı 12° → 6°, 4 → 6 doygunluk/parlaklık çifti; ~63 → ~170 aday) ve ittifak/bej renklerinden
     en az 18 ΔE uzak olanlar seçilir. Böylece fetih yapan devletler (Brezilya+Uruguay, Almanya+Fransa...) birbirine benzemez. */
  [[50, 40], [60, 48], [55, 56], [68, 36], [64, 62], [45, 32]].forEach(function (sl) {
    for (var h = 0; h < 360; h += 6) {
      if (h >= 55 && h <= 175) continue;
      var L = lab(h2r(h, sl[0], sl[1]));
      if (dE(L, RED) < 30) continue;
      var m = 99; BASE.forEach(function (b) { m = Math.min(m, dE(L, b)); });
      if (m < 18) continue;
      CAND.push({ css: 'hsl(' + h + ',' + sl[0] + '%,' + sl[1] + '%)', lab: L });
    }
  });
  var cnt = {}, last = -1e9, busy = 0, lastKey73 = '', lastEcol73 = null;
  function nbEmps(e) { var s = {}; for (var id in G.owner) if (G.owner[id] === e && M[id] && M[id].nb) M[id].nb.forEach(function (n) { var o = G.owner[n]; if (typeof o == 'string' && o !== e) s[o] = 1; }); return s; }
  function assign(e) {
    var used = [], adj = nbEmps(e), ua = [];
    for (var k in G.ecol) { if (k === e || !cnt[k]) continue; var L = labOf(G.ecol[k]); used.push(L); if (adj[k]) ua.push(L); }
    var best = null, bs = -1;
    CAND.forEach(function (c) {
      var mA = 99, mN = 99;
      used.forEach(function (u) { mA = Math.min(mA, dE(c.lab, u)); });
      ua.forEach(function (u) { mN = Math.min(mN, dE(c.lab, u)); });
      BASE.forEach(function (b) { mA = Math.min(mA, dE(c.lab, b)); });   // V73: bej + ittifak renkleri de uzak olsun
      var s = Math.min(mA, mN * .7) + Math.random() * 1.5; if (s > bs) { bs = s; best = c; }
    });
    if (best) G.ecol[e] = best.css;
  }
  // V73: iki imparatorluğun rengi birbirine fazla yakınsa (ΔE < MINDE) toprağı az olan yeniden seçilir
  var MINDE = 22;
  function dedupe() {
    var ks = Object.keys(G.ecol).filter(function (k) { return cnt[k] > 1 && k !== G.pl; }), guard = 0, again = true;
    while (again && guard++ < 12) {
      again = false;
      for (var i = 0; i < ks.length && !again; i++) for (var j = i + 1; j < ks.length; j++) {
        var a = ks[i], b = ks[j];
        if (dE(labOf(G.ecol[a]), labOf(G.ecol[b])) < MINDE) {
          var lose = cnt[a] < cnt[b] ? a : (cnt[b] < cnt[a] ? b : (a < b ? b : a)), before = G.ecol[lose];
          delete G.ecol[lose]; assign(lose);
          if (G.ecol[lose] !== before) again = true; else G.ecol[lose] = before;
          break;
        }
      }
    }
  }
  function parseHsl(s) { var m = /hsl\((\d+),(\d+)%,(\d+)%\)/.exec(s); return m ? h2r(+m[1], +m[2], +m[3]) : [128, 128, 128]; }
  var LC = {};   // V73: css -> lab önbelleği (renk karşılaştırması her karede tekrarlanmasın)
  function labOf(css) { return LC[css] || (LC[css] = lab(parseHsl(css))); }
  function refresh(force) {
    var now = performance.now(); if (!force && now - last < 60) return; last = now;
    cnt = {}; for (var id in G.owner) { var o = G.owner[id]; if (typeof o == 'string') cnt[o] = (cnt[o] || 0) + 1; }
    G.ecol = G.ecol || {};
    var key73 = Object.keys(cnt).sort().map(function (k) { return k + ':' + cnt[k]; }).join(',') + '|' + Object.keys(G.noEcol55 || {}).sort().join(',');
    if (key73 === lastKey73 && G.ecol === lastEcol73 && G.ecolV73) return;
    lastKey73 = key73; lastEcol73 = G.ecol;
    if (!G.ecolV68) { G.ecolV68 = 1; G.ecol = {}; }   // V68: eski soluk renkli kayıtlar yeni paletle yeniden atanır
    if (!G.ecolV73) { G.ecolV73 = 1; G.ecol = {}; }   // V73: eski kayıtlar yeni geniş paletle, birbirinden ayrı yeniden atanır
    for (var k in G.ecol) if (!cnt[k]) delete G.ecol[k];
    // büyük imparatorluk önce seçer (renkleri daha kalıcı olsun)
    Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).forEach(function (e) { if (e !== G.pl && cnt[e] > 1 && !G.ecol[e] && !(G.noEcol55 && G.noEcol55[e])) assign(e); });
    dedupe();
    lastEcol73 = G.ecol;
  }
  // V73: renk atanınca/değişince 3B küre ve 2B harita yeniden boyansın (renk imzası)
  try {
    if (window.WCD && WCD.sig) {
      var _sg = WCD.sig;
      WCD.sig = function () {
        var s = _sg.apply(this, arguments);
        try { if (G && typeof G.pl === 'string') { refresh(true); s += '|e73:' + Object.keys(G.ecol || {}).sort().map(function (k) { return k + '=' + G.ecol[k]; }).join(','); } } catch (x) { }
        return s;
      };
    }
  } catch (x) { }
  var _c = col;
  col = function (e) {
    try {
      if (typeof e == 'string' && G && typeof G.pl === 'string' && e !== G.pl && !busy) { refresh(); var ac = null; try { ac = window.WCD && WCD.coColor ? WCD.coColor(e) : null; } catch (x2) { } if (!ac && G.ecol && G.ecol[e]) return G.ecol[e]; }
    } catch (x) { }
    return _c.apply(this, arguments);
  };
})();
