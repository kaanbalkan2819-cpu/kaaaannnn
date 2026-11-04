/* V108 — MÜTTEFİK GÖSTERGESİ: düşman ülke seçilince panelde "tek başına" (mavi) ve "müttefiklerle" (mor) güç; 3B küre üzerinde müttefik ülkeler çizgili + bağlantı çizgileri (v30.js paintOverlay). */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  var IC = ['👥', '🎖', '💰', '🔬', '🕊'];
  function target() {
    try {
      if (!window.WCD || !G || !G.v5 || !G.sel || G.over || BSH) return null;
      var e = G.owner[G.sel]; if (typeof e !== 'string' || e === G.pl || !M[e]) return null;
      var al = WCD.allies(e).filter(function (a) { return a !== G.pl; }); if (!al.length) return null;
      return { e: e, al: al };
    } catch (x) { return null; }
  }
  window.WCAllyTarget = target;   // v30.js (küre çizgileri) kullanır
  function num(v) { try { return v1(v); } catch (x) { return (Math.round(v * 10) / 10).toString(); } }
  function decorate() {
    var el = document.getElementById('panel'), old = document.getElementById('wcally'); if (old) old.remove();
    var T = target(); if (!T || !el || el.style.display === 'none') return;
    var e = T.e, sd = WCD.side(e, G.pl), own = st(e), joined = sd.j || [];
    var h = '<div style="font-weight:700;color:#d8b4fe;margin-bottom:4px">🤝 ' + X('Müttefikleri', 'Allies') + ' (' + T.al.length + ')</div><div style="display:flex;flex-wrap:wrap;gap:4px 10px;margin-bottom:6px">';
    T.al.forEach(function (a) { h += '<span style="white-space:nowrap">' + fimg(a, 'sm') + ' ' + M[a].name + (joined.indexOf(a) >= 0 ? ' ⚔' : '') + '</span>'; });
    h += '</div>';
    /* V109: keşif gerekmez; tek şerit: mavi = ülkenin kendi gücü, uzanan kırmızı kısım = müttefikleriyle birlikte eklenen güç */
    var tA = 0, tB = 0, mxT = 1e-9, rows = '';
    for (var i = 0; i < 5; i++) { var a0 = +own[i] || 0, b0 = Math.max(a0, +sd.s[i] || 0); tA += a0; tB += b0; }
    var mx = 1e-9; for (var j = 0; j < 5; j++) mx = Math.max(mx, +sd.s[j] || 0, +own[j] || 0);
    function row(ic, label, a, b, mxv, bold, kn) {
      if (!kn) { a = 0; b = 0; }
      var pa = Math.max(2, a / mxv * 100), pb = Math.max(pa, b / mxv * 100);
      return '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:12px"><span style="width:18px">' + ic + '</span><span style="flex:1;min-width:0"><div style="position:relative;height:' + (bold ? 9 : 6) + 'px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden">' +
        '<div style="position:absolute;left:0;top:0;bottom:0;width:' + pb + '%;background:#ef4444"></div>' +
        '<div style="position:absolute;left:0;top:0;bottom:0;width:' + pa + '%;background:#3b82f6"></div></div></span>' +
        '<span style="min-width:84px;text-align:right"><b style="color:#60a5fa">' + (kn ? num(a) : '?') + '</b> → <b style="color:#f87171">' + (kn ? num(b) : '?') + '</b></span></div>';
    }
    h += '<div style="font-size:11px;margin-bottom:3px"><span style="color:#60a5fa">■ ' + X('kendi gücü', 'own power') + '</span> &nbsp; <span style="color:#f87171">■ ' + X('müttefikleriyle birlikte', 'with allies') + '</span></div>';
    var knAll = true; for (var q = 0; q < 5; q++) if (!know(G.pl, e, q)) knAll = false;
    h += row('⚡', '', tA, tB, Math.max(tB, 1e-9), true, knAll);
    for (var k = 0; k < 5; k++) h += row(IC[k], '', +own[k] || 0, Math.max(+own[k] || 0, +sd.s[k] || 0), mx, false, !!know(G.pl, e, k));
    if (!joined.length) h += '<div style="opacity:.8;font-size:12px;margin-top:2px">' + X('Müttefikleri bu savaşa katılmaz (kırmızı = mavi).', 'Its allies will not join this fight (red = blue).') + '</div>';
    var d = document.createElement('div'); d.id = 'wcally';
    d.style.cssText = 'margin:8px 0;padding:8px 10px;border:1px solid #7c3aed;border-radius:10px;background:rgba(88,28,135,.28);color:#eee';
    d.innerHTML = h;
    var f = el.firstElementChild; if (f && f.nextSibling) el.insertBefore(d, f.nextSibling); else el.appendChild(d);
  }
  function hook() {
    if (typeof panel !== 'function' || panel.wc108) return;
    var _p = panel; panel = function () { var r = _p.apply(this, arguments); try { decorate(); } catch (e) { } return r; }; panel.wc108 = 1;
  }
  function hookKnow() {
    if (typeof know !== 'function' || know.wc109) return;
    var _k = know; know = function (p, e, i) {   /* V109: seçili düşman ülke ve müttefiklerinin değerleri keşifsiz görünür */
      try {
        if (window.G && G.v5 && G.sel && !G.over && p === G.pl && typeof e === 'string' && e !== G.pl) {
          var se = G.owner[G.sel]; if (typeof se === 'string' && se !== G.pl && (e === se || (window.WCD && WCD.allies(se).indexOf(e) >= 0))) return true;
        }
      } catch (x) { }
      return _k.apply(this, arguments);
    }; know.wc109 = 1;
  }
  hook(); window.addEventListener('load', function () { hook(); });   /* keşifsiz görünürlük (hookKnow) kaldırıldı */
  hook(); window.addEventListener('load', hook); setTimeout(hook, 1500);
})();
