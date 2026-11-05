/* V134 — SAVAŞ NETLİĞİ + DENGE
   1) Savaş öncesi: seçili (keşfedilmiş) rakip için net kazanma ihtimali (%) + beş değerin kaçında üstün olduğun.
   2) Savaş sonrası: sonucun NEDENİ (hangi değerler kimde, zar etkisi) her zaman görünür satırda.
   3) Kartopu freni: toprağın %25'inden fazlasını tutan saldıranın değerleri yorgunlukla en çok %12 düşer;
      toprağı %10'un altına inmiş ve %40+ toprağı olan bir rakibe karşı savunan %5 direniş bonusu alır.
   Hepsi battle() zincirinde: yapay zekâ winProb'u, oyuncu göstergesi ve gerçek savaş AYNI kuralı kullanır.
   Ayar sabitleri: FAT_FROM, FAT_RATE, FAT_MAX, RES_ATK, RES_DEF, RES_BONUS. Geri almak için index.html'den v134.js bağlantısını silin. */
(function () {
  'use strict';
  var FAT_FROM = .25, FAT_RATE = .4, FAT_MAX = .12, RES_ATK = .40, RES_DEF = .10, RES_BONUS = 1.05;
  function tr() { return !(typeof L !== 'undefined' && L === 'en'); }
  function X(a, b) { return tr() ? a : b; }
  function names() { return X(['Nüfus', 'Ordu', 'Ekonomi', 'Teknoloji', 'Diplomasi'], ['Population', 'Army', 'Economy', 'Technology', 'Diplomacy']); }
  var IC = ['👥', '🎖', '💰', '🔬', '🕊'];

  /* ---------- kartopu freni ---------- */
  var idCache = {};
  function sameArr(a, b) { if (!a || !b || a.length < 5 || b.length < 5) return false; for (var i = 0; i < 5; i++) if (Math.abs((+a[i] || 0) - (+b[i] || 0)) > 1e-9) return false; return true; }
  function ownerOf(arr) {
    if (arr && arr._e !== undefined && arr._e !== null) return arr._e;   /* V136: v136.js dizileri sahibiyle etiketler */
    var key = arr.join(','); if (idCache[key] !== undefined) return idCache[key];
    var seen = {}, k, e, res = null;
    for (k in G.owner) { e = G.owner[k]; if (seen[e]) continue; seen[e] = 1; try { if (sameArr(typeof e === 'number' ? G.P[e].s : st(e), arr)) { res = e; break; } } catch (x) { } }
    if (Object.keys(idCache).length > 400) idCache = {};
    return (idCache[key] = res);
  }
  function shares() {
    var c = {}, n = 0, k; for (k in G.owner) { c[G.owner[k]] = (c[G.owner[k]] || 0) + 1; n++; }
    return { c: c, n: n || 1 };
  }
  function scale(a, f) { var o = a.map(function (v) { return v * f; }); for (var k in a) if (k.charAt(0) === '_') o[k] = a[k]; return o; }

  var _b = battle;
  battle = function (A, D, ra, rd, bA, bD) {
    var note = [];
    try {
      if (G && G.owner && A && D && A.length >= 5 && D.length >= 5) {
        var ea = ownerOf(A), ed = ownerOf(D);
        if (ea !== null && ed !== null) {
          var S = shares(), sa = (S.c[ea] || 0) / S.n, sd = (S.c[ed] || 0) / S.n;
          if (sa > FAT_FROM) { var fa = 1 - Math.min(FAT_MAX, (sa - FAT_FROM) * FAT_RATE); A = scale(A, fa); note.push('🏛 ' + X('İmparatorluk yorgunluğu: saldıran ×', 'Imperial fatigue: attacker ×') + fa.toFixed(2)); }
          if (sa > RES_ATK && sd < RES_DEF) { D = scale(D, RES_BONUS); note.push('🛡 ' + X('Direniş: savunan ×', 'Resistance: defender ×') + RES_BONUS.toFixed(2)); }
        }
      }
    } catch (e) { note = []; }
    var r = _b.call(this, A, D, ra, rd, bA, bD);
    if (note.length) r.adv = note.concat(r.adv || []);
    return r;
  };

  /* ---------- savaş öncesi kazanma ihtimali ---------- */
  function chance(a, d) {   // 36 zar sonucu üzerinden; DQ (zar kuyruğu) korunur
    var dq = (typeof DQ !== 'undefined' && DQ) ? DQ.slice() : null;
    try {
      var A = st(a), D = st(d), bA = !!(G.rv && G.rv[a + '>' + d]), bD = !!(G.rv && G.rv[d + '>' + a]), w = 0, x, y, base = null;
      for (x = 1; x <= 6; x++) for (y = 1; y <= 6; y++) { var rr = battle(A, D, x, y, bA, bD); if (rr.win) w++; if (x === 3 && y === 3) base = rr; }
      return { p: w / 36, base: base };
    } catch (e) { return null; } finally { if (dq) { DQ.length = 0; dq.forEach(function (v) { DQ.push(v); }); } }
  }
  function label(p) {
    var T = tr();
    return p >= .8 ? (T ? 'Çok yüksek' : 'Very high') : p >= .6 ? (T ? 'Yüksek' : 'High') : p >= .4 ? (T ? 'Dengeli' : 'Even') : p >= .2 ? (T ? 'Düşük' : 'Low') : (T ? 'Çok düşük' : 'Very low');
  }
  function col(p) { return p >= .6 ? '#4ade80' : p >= .4 ? '#facc15' : '#f87171'; }
  function card() {
    try {
      if (!G || G.over || BSH || !G.sel) return;
      var o = G.owner[G.sel], pl = G.pl; if (typeof o !== 'string' || o === pl || typeof pl === 'undefined') return;
      var el = document.getElementById('panel'), box = el && el.querySelector('.v15p'); if (!box || box.querySelector('.c134')) return;
      var h = '<div class="c134"></div>', kn = null;   /* kazanma ihtimali kaldırıldı; v136 rehber kutusu bu kabın içine girer */
      var ac = box.querySelector('.v15a'); if (ac) ac.insertAdjacentHTML('beforebegin', h); else box.insertAdjacentHTML('beforeend', h);
    } catch (e) { }
  }
  var _pn = panel;
  panel = function () { var r = _pn.apply(this, arguments); card(); return r; };
  var _rf = window.v24Refresh;
  window.v24Refresh = function () { try { var el = document.getElementById('panel'), q = el && el.querySelector('.c134'); if (q) q.remove(); } catch (e) { } if (_rf) _rf.apply(this, arguments); card(); };

  /* ---------- savaş sonrası: sonucun nedeni ---------- */
  var LAST = null, _sb = showBattle;
  showBattle = function (r, p, e) { LAST = { r: r, p: p, e: e }; return _sb.apply(this, arguments); };
  function why() {
    try {
      var fn = document.getElementById('fn'); if (!fn || !LAST || !fn.querySelector('.fh') || fn.querySelector('.w134')) return;
      var r = LAST.r, n = names(), a = [], d = [], t = [], i;
      for (i = 0; i < 5; i++) { var w = r.rows[i].w; (w === 'a' ? a : w === 'd' ? d : t).push(IC[i] + ' ' + n[i]); }
      var nm = function (id) { try { return M[id].name; } catch (x) { return id; } };
      var rows = '<div class="w134' + (r.win ? ' w' : ' l') + '">' +
        '<div><b>' + nm(LAST.p) + '</b> ' + r.aw + ' · <b>' + nm(LAST.e) + '</b> ' + r.dw + (t.length ? ' · ' + X('beraberlik', 'ties') + ' ' + t.length : '') + '</div>' +
        (a.length ? '<div>▲ ' + nm(LAST.p) + ': ' + a.join(', ') + '</div>' : '') + (d.length ? '<div>▼ ' + nm(LAST.e) + ': ' + d.join(', ') + '</div>' : '') +
        '<div>🎲 ' + (r.diff ? X('Yüksek zar', 'Higher die') + ': <b>' + (r.ra > r.rd ? nm(LAST.p) : nm(LAST.e)) + '</b> ×' + r.mult.toFixed(2) : X('Zarlar eşit: çarpan yok', 'Equal dice: no multiplier')) + '</div>' +
        (r.win ? '' : '<div>' + X('Saldırı için en az 3 değerde üstün olmak gerekir.', 'An attack needs a lead in at least 3 stats.') + '</div>') + '</div>';
      var fh = fn.querySelector('.fh'); fh.insertAdjacentHTML('afterend', rows);
    } catch (e) { }
  }
  var pend = 0;
  function watch() {
    var bs = document.getElementById('bs'); if (!bs) return setTimeout(watch, 500);
    new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; why(); }, 60); }).observe(bs, { childList: true, subtree: true });
  }
  watch();

  var css = document.createElement('style');
  css.textContent = '.c134{margin:8px 0;padding:8px 10px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(30,26,20,.55)}' +
    '.c134 small{display:block;font-weight:800;letter-spacing:.06em;opacity:.75;font-size:11px}' +
    '.c134h{display:flex;align-items:baseline;gap:10px;margin:2px 0}.c134h b{font-size:28px;line-height:1}.c134h span{font-weight:700;font-size:14px}' +
    '.c134b{height:7px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden;margin:4px 0 6px}.c134b i{display:block;height:100%}' +
    '.c134q{font-size:12.5px;line-height:1.45;opacity:.9;margin-top:3px}' +
    '.w134{margin:8px 0;padding:8px 10px;border-radius:10px;font-size:13px;line-height:1.5;background:rgba(255,255,255,.06);border-left:3px solid #b8a78a}' +
    '.w134.w{border-left-color:#4ade80}.w134.l{border-left-color:#f87171}';
  document.head.appendChild(css);
})();
