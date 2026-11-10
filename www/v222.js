/* V222 — Elçi Gönder ülke seçimi, ATOM BOMBASI (dükkan), küçük düzenlemeler.
   Geri almak için index.html'den v222.js ve v222.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function solo() { try { return !!window.G && !G.mp && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner; } catch (e) { return false; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nm(c) { try { return (window.M && M[c] && M[c].name) || c; } catch (e) { return c; } }
  function fl(c) { try { return fimg(c, 'sm'); } catch (e) { return ''; } }
  function owned(e) { var n = 0; try { for (var k in G.owner) if (G.owner[k] === e) n++; } catch (x) { } return n; }
  function turn() { try { return (G.T && G.T.turn) || 0; } catch (e) { return 0; } }
  /* menzildeki (saldırılabilir) ülkeler: { sahip: bölge } */
  function reach() {
    var o = {}; try { var t = targets(G.pl, G.owner); for (var k in t) { var w = G.owner[k]; if (typeof w === 'string' && w !== G.pl && M[w] && owned(w) > 0 && !o[w]) o[w] = k; } } catch (e) { }
    return o;
  }
  function card(title, sub, rows, empty) {
    var m = document.getElementById('mod'), bx = document.getElementById('box'); if (!m || !bx) return;
    try { window.__wbOn = true; modal('<div></div>'); } catch (e) { } finally { window.__wbOn = false; }
    m.classList.add('wbm'); bx.classList.remove('mm');
    bx.innerHTML = '<div class="wb-wrap still"><div class="wb-panel wb-pause wc141p pk222"><div class="c141h"><h3>' + title + '</h3></div><p class="pk222s">' + sub + '</p>' +
      '<div class="pk222g">' + (rows || '<div class="d38-empty">' + empty + '</div>') + '</div>' +
      '<div class="c141g"><button type="button" class="c141b" onclick="closeMod()"><span class="ic">✕</span><span class="lb">' + X('Vazgeç', 'Cancel') + '</span></button></div></div></div>';
    try { if (window.v156Decorate) v156Decorate(); } catch (e) { }
    m.style.display = 'flex';
  }

  /* ---------- Elçi Gönder: önce ülke seç ---------- */
  window.v222EnvoyPick = function () {
    if (!solo()) return; var r = reach(), h = '';
    Object.keys(r).sort(function (a, b) { return nm(a).localeCompare(nm(b), 'tr'); }).forEach(function (e) {
      h += '<button type="button" class="pk222i" onclick="v138Go(\'' + e + '\')">' + fl(e) + '<span>' + esc(nm(e)) + '</span></button>';
    });
    card('✉ ' + X('ELÇİ GÖNDER', 'SEND ENVOY'), X('Elçi göndereceğin ülkeyi seç (yalnızca menzilindeki ülkeler).', 'Choose the country to send an envoy to (countries in reach).'), h, X('Menzilinde ülke yok.', 'No country in reach.'));
  };

  /* ---------- ATOM BOMBASI ---------- */
  window.v222NukePick = function () {
    if (!solo()) return; var r = reach(), h = '';
    Object.keys(r).sort(function (a, b) { return nm(a).localeCompare(nm(b), 'tr'); }).forEach(function (e) {
      h += '<button type="button" class="pk222i nk" onclick="v222Nuke(\'' + r[e] + '\')">' + fl(e) + '<span>' + esc(nm(r[e])) + '</span></button>';
    });
    card('🚀 ' + X('YIKIM FÜZESİ', 'HAVOC MISSILE'), X('Hedef seç: füzenin düştüğü toprağı anında ele geçirirsin. Yalnızca saldırabileceğin ülkeler.', 'Pick a target: you seize the struck land at once. Only countries you can attack.'), h, X('Menzilinde hedef yok.', 'No target in reach.'));
  };
  /* hedef ülkenin küre üzerindeki ekran konumu (3B küre: v30API) */
  function scr(tg) {
    try {
      var a = window.v30API; if (!a || !a.ready() || !a.ll(tg)) return null;
      var ll = a.ll(tg), v = a.sph(ll[0], ll[1], 1.01), g = a.globe(), cam = a.camera(), el = a.renderer().domElement;
      var w = g.localToWorld(v.clone()); w.project(cam); var r = el.getBoundingClientRect();
      if (w.z > 1) return null;
      return [Math.round(r.left + (w.x + 1) / 2 * r.width), Math.round(r.top + (1 - w.y) / 2 * r.height)];
    } catch (e) { return null; }
  }
  window.v222Scr = scr;
  /* doğal mantar bulutu: başlıkta ~34, gövdede ~10 rastgele duman topağı */
  function puffs() {
    var h = '', i, r = function (a, b) { return a + Math.random() * (b - a); };
    for (i = 0; i < 34; i++) { var t = Math.random() * Math.PI, rx = r(.15, 1), x = 110 + Math.cos(t) * 100 * rx, y = 70 - Math.sin(t) * 55 * rx + r(-6, 10), s = r(34, 70);
      h += '<b style="left:' + (x - s / 2).toFixed(0) + 'px;top:' + (y - s / 2).toFixed(0) + 'px;width:' + s.toFixed(0) + 'px;height:' + s.toFixed(0) + 'px;animation-delay:' + r(0, .6).toFixed(2) + 's;--d:' + r(.75, 1.05).toFixed(2) + '"></b>'; }
    for (i = 0; i < 10; i++) { var sy = 100 + i * 14, ss = 30 + i * 2.2;
      h += '<b class="sp" style="left:' + (110 - ss / 2 + r(-5, 5)).toFixed(0) + 'px;top:' + sy + 'px;width:' + ss.toFixed(0) + 'px;height:' + (ss * 1.1).toFixed(0) + 'px;animation-delay:' + (i * .05).toFixed(2) + 's;--d:' + r(.6, .85).toFixed(2) + '"></b>'; }
    return h;
  }
  function boom(done, tg) {
    var o = document.createElement('div'); o.id = 'nk222';
    try { var p = scr(tg); if (p) { var iw = Math.min(innerHeight * .4, 290), y = Math.max(p[1], Math.round(iw * .82 + 8)); o.style.setProperty('--x', p[0] + 'px'); o.style.setProperty('--y', y + 'px'); } } catch (x) { }   /* bulut ekranın üstünden taşmasın */
    o.innerHTML = '<div class="fl"></div><div class="sw"></div><div class="sw s2"></div><div class="fb"></div>' +
      '<img class="nkimg" src="assets/art/nuke222.png" alt=""><div class="sm"></div>';   /* V222: Figma ile üretilen gerçek patlama görseli */
    document.body.appendChild(o);
    requestAnimationFrame(function () { o.classList.add('go'); });
    try { document.body.classList.add('nk222shake'); setTimeout(function () { document.body.classList.remove('nk222shake'); }, 1100); } catch (e) { }
    try { if (window.AU) { AU.play('boom'); setTimeout(function () { try { AU.play('boom'); } catch (e) { } }, 280); } } catch (e) { }
    try { if (navigator.vibrate) navigator.vibrate([120, 60, 260]); } catch (e) { }
    setTimeout(function () { o.classList.add('out'); }, 3400);
    setTimeout(function () { o.remove(); done(); }, 4100);
  }
  window.v222Nuke = function (tg) {
    try {
      if (!solo() || !tg || !M[tg]) return; var e = G.owner[tg];
      if (typeof e !== 'string' || e === G.pl || !targets(G.pl, G.owner)[tg]) return;
      if (!window.WCNuke || !WCNuke.take()) { try { toast(X('Cephaneliğinde Yıkım Füzesi yok — Dükkândan al', 'No Havoc Missile in your arsenal — buy one in the Shop')); } catch (x) { } return; }   /* V223: stoktan düşülür */
      try { closeMod(); } catch (x) { }
      G.nuke222 = turn();
      /* V224: önce 3B savaş animasyonu sistemiyle gerçek bombardıman sahnesi (v60Nuke); 3B küre yoksa eski 2B efekt */
      var ended = false;
      var try3d = function () { var n = 0; (function w() { if (window.v60Active && n++ < 40) return setTimeout(w, 100); try { if (window.v60Nuke && v60Nuke(tg, fin)) return; } catch (x) { } old2d(); })(); };   /* V225: süren savaş animasyonu bitsin, bomba sahnesi 2B'ye düşmesin */
      try { var lp = window.v60Load && v60Load(); if (lp && lp.then) lp.then(try3d, old2d); else try3d(); } catch (x) { old2d(); }
      function old2d() {
        try { if (window.v30FocusOn) v30FocusOn(tg); } catch (x) { }
        var last = null, still = 0, t0 = Date.now();
        (function wait() {
          var p = scr(tg);
          if (p && last && Math.abs(p[0] - last[0]) < 2 && Math.abs(p[1] - last[1]) < 2) still++; else still = 0;
          last = p;
          if (still < 3 && Date.now() - t0 < 3000) return setTimeout(wait, 90);
          boom(fin, tg);
        })();
      }
      function fin() {
        if (ended) return; ended = true;
        (function () {
          try {
            G.owner[tg] = G.pl; G.st = G.st || [{}]; G.st[0] = G.st[0] || {}; G.st[0].c = (G.st[0].c | 0) + 1;
            if (G.es && G.es[tg]) delete G.es[tg];
            G.cq217 = G.cq217 || []; if (G.cq217.indexOf(tg) < 0) G.cq217.push(tg);
            try { save(); } catch (x) { } try { render(); } catch (x) { }
            try { toast('🚀 ' + X(nm(tg) + ' Yıkım Füzesi ile ele geçirildi', nm(tg) + ' seized with a Havoc Missile')); } catch (x) { }
          } catch (x) { }
        })();
      }
    } catch (x) { }
  };
})();
