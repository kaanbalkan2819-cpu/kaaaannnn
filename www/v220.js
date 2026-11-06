/* V220 — denge, küçük devletler, yazı sığdırma, küçük komşu düğmesi, savaş paneli müttefik bayrakları, yeni dükkan.
   Geri almak için index.html'den v220.js ve v220.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function solo() { try { return !!window.G && !G.mp && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner; } catch (e) { return false; } }
  function owned(e) { var n = 0; try { for (var k in G.owner) if (G.owner[k] === e) n++; } catch (x) { } return n; }
  function turn() { try { return (G.T && G.T.turn) || 0; } catch (e) { return 0; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nm(c) { try { return (window.M && M[c] && M[c].name) || c; } catch (e) { return c; } }

  /* ================= 1) KÜÇÜK DEVLET DENGESİ =================
     Küçük bir ülkeyle kazanmak neredeyse imkânsızdı. Oyuncunun ülkesi küçükse (taban değer toplamı düşük) ve az toprağı varsa
     Nüfus/Ordu/Teknoloji/Diplomasi değerlerine "direniş" katsayısı eklenir; imparatorluk büyüdükçe kendiliğinden azalır (oyunu kırmaz).
       - taban güç: başlangıç ülkesinin 5 değer toplamı; 180 altı küçük, 120 altı çok küçük sayılır
       - toprak sayısı arttıkça destek azalır, 9+ toprakta biter
     Ayrıca dükkandan alınan Paralı Askerler bir sonraki savaşta Ordu +%12. Ekonomi değerine dokunulmaz. */
  function baseSum(c) { try { var b = (typeof BASE !== 'undefined' && BASE[c]) || []; return b.reduce(function (s, v) { return s + (+v || 0); }, 0); } catch (e) { return 250; } }
  function smallK() {
    try {
      if (!solo()) return 1;
      var b = baseSum(G.pl), n = owned(G.pl); if (n >= 9) return 1;
      var size = b < 120 ? .16 : b < 180 ? .10 : b < 230 ? .04 : 0; if (!size) return 1;
      return 1 + size * Math.max(0, (9 - n) / 8);
    } catch (e) { return 1; }
  }
  window.v220SmallK = smallK;
  (function hookSt() {
    if (typeof st !== 'function') return setTimeout(hookSt, 400);
    if (st.v220) return;
    var _st = st;
    st = function (e) {
      var r = _st.apply(this, arguments);
      try {
        if (solo() && e === G.pl && r && r.length) {
          var k = smallK(), m = G.merc220 ? 1.12 : 1;
          if (k > 1 || m > 1) { r = r.slice(); [0, 1, 3, 4].forEach(function (i) { r[i] = Math.round(r[i] * k * (i === 1 ? m : 1) * 10) / 10; }); }
        }
      } catch (x) { }
      return r;
    };
    st.v220 = 1;
  })();
  /* paralı askerler: bir savaşta kullanılır */
  (function hookSb() {
    if (typeof showBattle !== 'function') return setTimeout(hookSb, 400);
    if (showBattle.v220) return;
    var _sb = showBattle;
    showBattle = function (r, p, e) { try { if (G && G.merc220 && (p === G.pl || e === G.pl)) G.merc220 = 0; } catch (x) { } var o = _sb.apply(this, arguments); try { setTimeout(allyFlags, 0); setTimeout(allyFlags, 120); } catch (x) { } return o; };
    showBattle.v220 = 1;
  })();
  /* küçük devlet bilgisi: oyun başında bir kez */
  setInterval(function () {
    try { if (!solo() || G.sk220 || ['pick', 'v7pick'].indexOf(G.ph) >= 0) return; G.sk220 = 1; var k = smallK(); if (k > 1.02) toast('🛡 ' + X('Küçük devlet direnci: değerlerin +%' + Math.round((k - 1) * 100) + ' (toprak arttıkça azalır)', 'Small-state resilience: stats +' + Math.round((k - 1) * 100) + '% (fades as you grow)')); } catch (e) { }
  }, 1500);

  /* ================= 2) YAZILAR PANELE SIĞSIN =================
     Pencere/panel/savaş ekranında taşan (kesilen) tek satırlık yazılar bulunur ve sığana kadar küçültülür (en çok %70'e). */
  var SEL = '#box button, #box b, #box small, #box span, #box h2, #box h3, #box h4, #box em, #panel button, #panel b, #panel .nm, #bs b, #bs small, #bs span, .wcr-res *, #wcm .mb';
  function fit(root) {
    try {
      var els = (root || document).querySelectorAll(SEL), n = 0;
      for (var i = 0; i < els.length && n < 400; i++) {
        var el = els[i]; if (!el.offsetParent || el.children.length > 3) continue; n++;
        if (el.scrollWidth <= el.clientWidth + 1 || !el.clientWidth) continue;
        var cs = getComputedStyle(el); if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
        var fs = parseFloat(cs.fontSize) || 14, min = fs * .7, ls = parseFloat(cs.letterSpacing) || 0;
        if (ls > 1) { el.style.setProperty('letter-spacing', (ls * .5) + 'px', 'important'); if (el.scrollWidth <= el.clientWidth + 1) continue; }
        while (el.scrollWidth > el.clientWidth + 1 && fs > min) { fs -= .5; el.style.setProperty('font-size', fs + 'px', 'important'); }
      }
    } catch (e) { }
  }
  window.v220Fit = fit;
  var fitT = 0;
  function schedule() { if (fitT) return; fitT = setTimeout(function () { fitT = 0; fit(); }, 140); }
  (function watch() {
    if (!document.body) return setTimeout(watch, 300);
    new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t && t.closest && t.closest('#box, #panel, #bs, #wcm')) { schedule(); return; } } }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
  })();

  /* ================= 3) KÜÇÜK KOMŞULARA GİT =================
     Ülke panelinde, yakınında tıklaması zor çok küçük ülkeler varsa onlara giden düğmeler gösterilir. */
  var SZC = {};
  function spanOf(id) {
    if (SZC[id] != null) return SZC[id];
    var s = 99;
    try {
      if (window.v30API && v30API.bbox) { var b = v30API.bbox(id); if (b) s = Math.max(b[2] - b[0], b[3] - b[1]); }
      else for (var i = 0; i < R.length; i++) if (R[i].id === id) { var g = R[i].f.geometry, ps = g.type == 'Polygon' ? [g.coordinates] : g.coordinates, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ps.forEach(function (pg) { pg[0].forEach(function (c) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); }); }); s = Math.max(x1 - x0, y1 - y0); break; }
    } catch (e) { }
    return (SZC[id] = s);
  }
  function smallNbs(id) {
    try { var nb = (M[id] && M[id].nb) || []; return nb.filter(function (n) { return M[n] && n !== id && spanOf(n) < 3.2; }).slice(0, 4); } catch (e) { return []; }
  }
  window.v220Go = function (id) { try { if (window.v30FocusOn) v30FocusOn(id); pickC(id); } catch (e) { } };
  (function hookPanel() {
    if (typeof panel !== 'function') return setTimeout(hookPanel, 400);
    if (panel.v220) return;
    var _pn = panel;
    panel = function () {
      var r = _pn.apply(this, arguments);
      try {
        var el = document.getElementById('panel'), id = window.G && G.sel; if (!el || !id || el.querySelector('.nb220')) return r;
        var sm = smallNbs(id); if (!sm.length) return r;
        var box = el.querySelector('.v15p') || el, act = box.querySelector('.v15a');
        var h = '<div class="nb220"><small>' + X('Yakındaki küçük ülkeler', 'Small neighbours') + '</small>' + sm.map(function (n) { var f = ''; try { f = fimg(n, 'sm'); } catch (e) { } return '<button type="button" onclick="v220Go(\'' + n + '\')">' + f + '<span>' + esc(nm(n)) + '</span></button>'; }).join('') + '</div>';
        if (act) act.insertAdjacentHTML('beforebegin', h); else box.insertAdjacentHTML('beforeend', h);
      } catch (e) { }
      return r;
    };
    panel.v220 = 1;
  })();

  /* ================= 4) SAVAŞ PANELİ: MÜTTEFİK BAYRAKLARI =================
     Bir tarafta ittifak varsa: en çok 3 bayrak (asıl ülke + 2 müttefik) yan yana EŞİT boyutta; 3'ten fazlaysa diğerleri altta küçük bayraklarla. */
  function allyFlags() {
    resFlags();
    ['sa', 'sdf'].forEach(function (id) {
      try {
        var card = document.getElementById(id); if (!card || card.querySelector('.fl220')) return;
        var row = card.querySelector('.al213'); if (!row) return;
        var main = card.querySelector('.fi.lg'), al = Array.prototype.slice.call(row.querySelectorAll('.fi'));
        if (!main || !al.length) return;
        var all = [main].concat(al), big = all.slice(0, 3), rest = all.slice(3);
        var w = document.createElement('div'); w.className = 'fl220 n' + big.length;
        big.forEach(function (f) { var c = f.cloneNode(true); c.className = 'fi lg'; c.removeAttribute('style'); w.appendChild(c); });
        main.insertAdjacentElement('beforebegin', w); main.style.display = 'none';
        if (rest.length) {
          var s = document.createElement('div'); s.className = 'fl220s'; s.innerHTML = '<span>🤝</span>';
          rest.forEach(function (f) { var c = f.cloneNode(true); c.className = 'fi sm'; c.removeAttribute('style'); s.appendChild(c); });
          row.replaceWith(s);
        } else row.style.display = 'none';
      } catch (e) { }
    });
  }

  /* ================= 5) YENİ DÜKKAN =================
     İki sekme: AVANTAJLAR (altınla oyun içi yardım) ve ALTIN AL (Google Play paketleri; v21 satın alma köprüsü). */
  var TAB = 'adv', ITEMS = [
    { id: 'move', ic: '🎲', n: ['+1 Hamle', '+1 Move'], d: ['Bu tur bir hamle daha', 'One more move this turn'], p: 25 },
    { id: 'merc', ic: '⚔', n: ['Paralı Askerler', 'Mercenaries'], d: ['Bir sonraki savaşta Ordu +%12', 'Army +12% in your next battle'], p: 40 },
    { id: 'fort', ic: '🏰', n: ['Sınır Kaleleri', 'Border Forts'], d: ['2 tur boyunca rakipler sana saldırmaz', 'Rivals won\'t attack you for 2 turns'], p: 55 },
    { id: 'spy', ic: '🕵', n: ['Casus Ağı', 'Spy Network'], d: ['Menzilindeki tüm ülkelerin değerleri açılır', 'Reveals the stats of every country in reach'], p: 30 },
    { id: 'peace', ic: '📜', n: ['Huzur Fermanı', 'Edict of Peace'], d: ['5 tur boyunca isyan çıkmaz', 'No rebellions for 5 turns'], p: 35 },
    { id: 'envoy', ic: '🕊', n: ['Elçi Hediyesi', 'Envoy Gifts'], d: ['Komşularla ilişkiler iyileşir, teklifler daha kolay kabul edilir', 'Neighbours warm to you; offers are accepted more easily'], p: 30 }
  ];
  function canUse(it) {
    try {
      if (!solo() || G.over) return X('Oyun içinde kullanılabilir', 'Only in-game');
      if (it.id === 'move' && G.ph !== 'act') return X('Kendi turunda kullan', 'Use on your turn');
      if (it.id === 'merc' && G.merc220) return X('Zaten etkin', 'Already active');
      if (it.id === 'fort' && G.fort220 > turn()) return X('Zaten etkin', 'Already active');
      if (it.id === 'peace' && G.peace220 > turn()) return X('Zaten etkin', 'Already active');
    } catch (e) { return '—'; }
    return '';
  }
  function use(it) {
    if (it.id === 'move') { G.T.moves = (+G.T.moves || 0) + 1; }
    else if (it.id === 'merc') { G.merc220 = 1; }
    else if (it.id === 'fort') { G.fort220 = turn() + 2; }
    else if (it.id === 'spy') { var tg = targets(G.pl, G.owner); G.kn = G.kn || {}; G.kn[G.pl] = G.kn[G.pl] || {}; for (var k in tg) { var o = G.owner[k]; if (typeof o === 'string' && o !== G.pl) G.kn[G.pl][o] = [1, 1, 1, 1, 1]; } }
    else if (it.id === 'peace') { G.peace220 = turn() + 5; G.cool23 = Math.max(G.cool23 || 0, 5); if (G.lib76) for (var t in G.lib76) if (G.lib76[t].at) G.lib76[t].at += 5; }
    else if (it.id === 'envoy') { G.dx220 = (G.dx220 || 0) + 3; }
    try { save(); } catch (e) { } try { render(); } catch (e) { }
  }
  function shopHTML() {
    var g = 0; try { g = Gold.get(); } catch (e) { }
    var h = '<div class="wb-wrap still"><div class="wb-panel wb-pause wc141p shop220"><div class="c141h"><span class="p">🛒</span><h3>' + X('DÜKKAN', 'SHOP') + '</h3></div>' +
      '<div class="bal220"><span>🪙</span><b>' + g + '</b><small>' + X('altının', 'your gold') + '</small></div>' +
      '<div class="tabs219"><button type="button" class="' + (TAB === 'adv' ? 'on' : '') + '" onclick="v220Shop.tab(\'adv\')">' + X('Avantajlar', 'Boosts') + '</button><button type="button" class="' + (TAB === 'buy' ? 'on' : '') + '" onclick="v220Shop.tab(\'buy\')">' + X('Altın Al', 'Buy Gold') + '</button></div><div class="sg220">';
    if (TAB === 'adv') {
      ITEMS.forEach(function (it) {
        var why = canUse(it), ok = !why && g >= it.p;
        h += '<div class="si220"><i>' + it.ic + '</i><div><b>' + X(it.n[0], it.n[1]) + '</b><small>' + X(it.d[0], it.d[1]) + '</small>' + (why ? '<em>' + why + '</em>' : '') + '</div>' +
          '<button type="button" ' + (ok ? 'onclick="v220Shop.buy(\'' + it.id + '\')"' : 'disabled') + '>' + it.p + ' 🪙</button></div>';
      });
    } else {
      var P = (window.Shop && Shop.packs) || [];
      P.forEach(function (p, i) {
        h += '<div class="si220 pk"><i>' + ['💰', '💰', '🏦', '👑'][i] + '</i><div><b>' + p.gold + ' ' + X('Altın', 'Gold') + '</b><small>' + (i === 3 ? X('En avantajlı paket', 'Best value') : i === 2 ? X('Popüler', 'Popular') : X('Altın paketi', 'Gold pack')) + '</small></div>' +
          '<button type="button" onclick="Shop.buy(\'' + p.id + '\')">Google Play</button></div>';
      });
      h += '<p class="note220">' + X('Satın alma yalnızca Google Play sürümünde çalışır. Altın oyunda zafer ve ekonomiyle de kazanılır.', 'Purchases only work in the Google Play version. Gold is also earned in-game.') + '</p>';
    }
    return h + '</div><div class="c141g"><button type="button" class="c141b pri" onclick="closeMod()"><span class="ic">✕</span><span class="lb">' + X('Kapat', 'Close') + '</span></button></div></div></div>';
  }
  function show() {
    var m = document.getElementById('mod'), bx = document.getElementById('box'); if (!m || !bx) return;
    try { window.__wbOn = true; modal('<div></div>'); } catch (e) { } finally { window.__wbOn = false; }
    m.classList.add('wbm'); bx.classList.remove('mm'); bx.innerHTML = shopHTML();
    try { if (window.v156Decorate) v156Decorate(); } catch (e) { }
    m.style.display = 'flex';
  }
  window.v220Shop = {
    open: function () { if (!solo()) { try { toast(X('Dükkan oyun içinde açılır', 'The shop opens in-game')); } catch (e) { } return; } show(); },
    tab: function (t) { TAB = t; show(); },
    buy: function (id) {
      var it = ITEMS.filter(function (x) { return x.id === id; })[0]; if (!it || canUse(it)) return;
      if (!window.Gold || !Gold.spend(it.p, 'shop220-' + id)) { try { toast(X('Yeterli altının yok', 'Not enough gold')); } catch (e) { } return; }
      use(it); try { toast(it.ic + ' ' + X(it.n[0] + ' alındı', it.n[1] + ' bought')); } catch (e) { } show();
    }
  };
  (function hookShop() { if (!window.Shop) return setTimeout(hookShop, 500); if (Shop.v220) return; Shop.open = v220Shop.open; Shop.v220 = 1; })();
  /* Sınır Kaleleri: YZ oyuncuyu hedef almasın (v5 aiPlan sonucu oyuncuysa planı reddeder) — Huzur Fermanı: isyan bekleme süresi korunur */
  setInterval(function () { try { if (solo() && G.peace220 > turn()) G.cool23 = Math.max(G.cool23 || 0, 1); } catch (e) { } }, 1000);
})();
/* V220: sonuç ekranı (#fn .fl7) — kartlardaki müttefik bayrak düzeni burada da: en çok 3 eşit, fazlası altta küçük */
function resFlags() {
  try {
    var fl7 = document.querySelector('#bs .fl7'); if (!fl7 || fl7.querySelector('.fl220')) return;
    var sides = fl7.querySelectorAll('.fl7s');
    [['sa', 0], ['sdf', 1]].forEach(function (p) {
      var src = document.getElementById(p[0]), box = sides[p[1]]; if (!src || !box) return;
      var big = src.querySelector('.fl220'), small = src.querySelector('.fl220s'); if (!big) return;
      var img = box.querySelector('img.fi, .fi'); if (!img) return;
      var c = big.cloneNode(true); c.classList.add('res'); img.replaceWith(c);
      if (small) { var s = small.cloneNode(true); c.insertAdjacentElement('afterend', s); }
    });
  } catch (e) { }
}
(function watchBs() {
  var bs = document.getElementById('bs'); if (!bs) return setTimeout(watchBs, 500);
  var tm = 0; new MutationObserver(function () { if (tm) return; tm = setTimeout(function () { tm = 0; resFlags(); }, 60); }).observe(bs, { childList: true, subtree: true });
})();
