/* V214 — YENİ "OYUN BİTTİ" MENÜSÜ (yenilgi).
   Oyuncu son toprağını kaybedince eski yenilgi ekranlarının (V139 "İmparatorluk Düştü", V38 katmanı, app.js showOver penceresi)
   HİÇBİRİ gösterilmez; yerine duraklatma menüsü şablonuyla (aynı kart: .wb-panel.wb-pause.wc141p + V156 köşe/amblem süsleri)
   "OYUN BİTTİ" kartı açılır. V139 yalnızca oyun geçmişine kaydetmek için arka planda çalışır (ekranı gizlenir).
   Düğmeler: Aynı Ülkeyle Tekrar Başla · Yeni Ülke Seç · Oyun Geçmişi · Ana Menü.
   Zafer (dünya fethi) ekranına dokunulmaz. Online oyunda (G.mp) devre dışı.
   Geri almak için index.html'den v214.js ve v214.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function ownedN(e) { var n = 0; try { for (var k in G.owner) if (G.owner[k] === e) n++; } catch (x) { } return n; }
  function solo5() { try { return !!G && !G.mp && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner && !!G.T; } catch (e) { return false; } }
  /* yenilgi: oyuncunun toprağı kalmadı ya da oyun yenilgiyle bitti */
  function lost() {
    try {
      if (!solo5() || ['pick', 'v7pick', 'v5intro', 'wheel'].indexOf(G.ph) >= 0) return false;
      if (G.over && G.over.w === 0) return false;   /* zafer */
      return ownedN(G.pl) === 0 || !!(G.over && G.over.w === -1 && !G.over.tl);   /* süre sonu (tl) sonucu V139 ekranında kalır */
    } catch (e) { return false; }
  }
  var shown = false, home = null, snap = null, lostAt = 0, resAt = 0;

  function chip(v, k) { return '<div><b>' + v + '</b><small>' + k + '</small></div>'; }
  function btn(ic, label, fn, cls) { return '<button type="button" class="c141b ' + (cls || '') + '" onclick="' + fn + '"><span class="ic">' + ic + '</span><span class="lb">' + label + '</span></button>'; }
  function mmss(s) { s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function summary() {
    var st = (G.st && G.st[0]) || {}, turn = (G.T && G.T.turn) || G.turn || 1, sec = G.ts ? (Date.now() - G.ts) / 1000 : 0;
    return { c: home || G.pl, turn: turn, w: st.w | 0, l: st.l | 0, conq: st.c | 0, sec: sec };
  }
  function cardHTML(m) {
    var flag = ''; try { flag = fimg(m.c, 'sm'); } catch (e) { }
    var name = ''; try { name = nm(m.c); } catch (e) { name = m.c; }
    return '<div class="wb-wrap still"><div class="wb-panel wb-pause wc141p go214">' +
      '<div class="c141h"><span class="p">⚑</span><h3>' + X('OYUN BİTTİ', 'GAME OVER') + '</h3></div>' +
      '<p class="sub214">' + flag + '<span><b>' + name + '</b> ' + X(m.turn + '. turda son toprağını kaybetti', 'lost its last land on turn ' + m.turn) + '</span></p>' +
      '<div class="c141s">' + chip(m.turn, X('TUR', 'TURNS')) + chip(m.conq, X('FETİH', 'CONQUESTS')) + chip(m.w + '<i>/' + m.l + '</i>', X('ZAFER/YENİLGİ', 'WON/LOST')) + chip(mmss(m.sec), X('SÜRE', 'TIME')) + '</div>' +
      '<div class="c141g">' +
      btn('🔁', X('Tekrar Başla', 'Play Again'), 'v214Again(1)', 'pri') +
      btn('🌍', X('Yeni Ülke Seç', 'Pick a New Country'), 'v214Again(0)', '') +
      btn('📜', X('Oyun Geçmişi', 'Game History'), 'v214Hist()', '') +
      btn('🏠', X('Ana Menü', 'Main Menu'), 'v214Menu()', '') +
      '</div></div></div>';
  }
  /* eski yenilgi ekranlarını kaldır (geçmiş kaydı için V139 bir kez çalıştırılır, katmanı hemen silinir) */
  function killOld() {
    try { var a = document.getElementById('v139over'); if (a && a.classList.contains('lose')) a.remove(); } catch (e) { }
    try { var b = document.getElementById('v38over'); if (b) b.remove(); } catch (e) { }
  }
  function show() {
    if (!G) return;
    try { if (!snap) snap = summary(); } catch (e) { snap = { c: G.pl, turn: 1, w: 0, l: 0, conq: 0, sec: 0 }; }
    /* oyunu kesin olarak bitir: savaş paneli / rakip turu / atlama durumları temizlenir */
    try { var bs = document.getElementById('bs'); if (bs) { bs.style.display = 'none'; bs.style.visibility = ''; bs.style.pointerEvents = ''; } } catch (e) { }
    try { BSH = false; document.body.classList.remove('bsh'); BT = null; OV = {}; FLASH = null; } catch (e) { }
    try { if (window.V20 && V20.skipReset) V20.skipReset(); } catch (e) { }
    try { if (!G.over) G.over = { w: -1 }; G.ph = 'over'; G.busy = 0; G.aiBusy = 0; G.endLock = 0; } catch (e) { }
    try { var ai = document.getElementById('ai20'); if (ai) ai.remove(); var ev = document.getElementById('ev76'); if (ev) ev.remove(); } catch (e) { }
    window.__v214in = 1; try { if (window.v139Show) window.v139Show(true); } catch (e) { } finally { window.__v214in = 0; }   /* yalnızca oyun geçmişine kayıt */
    killOld();
    try { localStorage.removeItem(SV); } catch (e) { }
    var m = document.getElementById('mod'), bx = document.getElementById('box'); if (!m || !bx) return;
    try { window.__wbOn = true; modal('<div></div>'); } catch (e) { } finally { window.__wbOn = false; }
    m.classList.add('wbm'); m.classList.add('go214m'); bx.classList.remove('mm');
    bx.innerHTML = cardHTML(snap);
    try { if (window.v156Decorate) v156Decorate(); } catch (e) { }   /* duraklatma kartının köşe işlemeleri + amblem */
    m.style.display = 'flex'; m.style.zIndex = '';
    m.onclick = null;   /* karartılmış alana dokununca kapanmaz (duraklatma kartında kapanıyordu) */
    shown = true;
    try { document.body.classList.add('go214on'); } catch (e) { }
  }
  function open214() { var bx = document.getElementById('box'), m = document.getElementById('mod'); return !!(bx && m && m.style.display === 'flex' && bx.querySelector('.go214')); }
  function reset() { shown = false; snap = null; lostAt = 0; resAt = 0; try { document.body.classList.remove('go214on'); var m = document.getElementById('mod'); if (m) m.classList.remove('go214m'); } catch (e) { } }

  window.v214Again = function (same) {
    var c = home || (snap && snap.c);
    try { var o = document.getElementById('v139over'); if (o) o.remove(); } catch (e) { }
    try { closeMod(); } catch (e) { }
    reset();
    try { localStorage.removeItem(SV); } catch (e) { }
    try { G = null; } catch (e) { }
    try { newGame(1); } catch (e) { console.error(e); try { menu(); } catch (x) { } return; }
    if (!same || !c) return;
    /* aynı ülke: seçim ekranı gelince ülke kendiliğinden seçilip onaylanır */
    var t0 = Date.now();
    (function wait() {
      try {
        if (G && G.ph === 'v7pick' && window.v7Confirm && typeof pickC === 'function' && window.M && M[c]) {
          if (window.v30IntroBusy && v30IntroBusy() && Date.now() - t0 < 6000) return setTimeout(wait, 250);
          try { closeMod(); } catch (e) { }
          pickC(c); v7Confirm(); return;
        }
      } catch (e) { console.error(e); }
      if (Date.now() - t0 < 12000) setTimeout(wait, 250);
    })();
  };
  window.v214Menu = function () {
    try { closeMod(); } catch (e) { } reset();
    try { var o = document.getElementById('v139over'); if (o) o.remove(); } catch (e) { }
    try { localStorage.removeItem(SV); } catch (e) { }
    try { G = null; } catch (e) { }
    try { document.body.classList.remove('wc141-ig'); } catch (e) { }
    try { menu(); } catch (e) { console.error(e); }
  };
  window.v214Hist = function () { try { if (window.v139Hist) v139Hist(); } catch (e) { } };   /* "Kapat" denince oyun bitti kartı geri gelir (bekçi) */

  /* eski yenilgi giriş noktaları yeni karta yönlendirilir */
  try { var _so = showOver; showOver = function () { if (lost()) return show(); return _so.apply(this, arguments); }; } catch (e) { }
  (function wrap() {
    if (!window.v139Show) return setTimeout(wrap, 400);
    if (window.v139Show.v214) return;
    var _vs = window.v139Show;
    window.v139Show = function (f) { var r = _vs.apply(this, arguments); if (lost()) { killOld(); if (!open214() && !(window.__v214in)) { window.__v214in = 1; try { show(); } finally { window.__v214in = 0; } } } return r; };
    window.v139Show.v214 = 1;
  })();

  /* bekçi: yenilgi anlaşıldığında karta geçilir.
     - sonuç ekranı açıksa oyuncu "Haritaya Dön"e basana kadar beklenir (en çok 8 sn), sonra kendiliğinden geçilir
     - savaş animasyonu sürüyorsa bitmesi beklenir (en çok 20 sn)
     - kart (ör. Oyun Geçmişi kapatılınca) kaybolursa yeniden açılır */
  setInterval(function () {
    try {
      killOld();
      if (!G) { if (shown) reset(); return; }
      if (document.body.classList.contains('wcm-on')) return;
      if (!lost()) { if (shown && G.ph !== 'over') reset(); lostAt = 0; resAt = 0; return; }
      if (!home && G.pl) home = G.pl;
      if (open214()) return;
      var m = document.getElementById('mod'), bx = document.getElementById('box');
      if (shown && m && m.style.display === 'flex' && bx && bx.querySelector('.h139')) return;   /* oyun geçmişi açık */
      if (!lostAt) lostAt = Date.now();
      /* V215: kart artık hızlı gelir. Yenilgide savaş animasyonu (karşı saldırı) atlanır; savaş panelinin sonucu ("YENİLGİ")
         1,2 sn gösterilip kart açılır. Panel sonuca ulaşamazsa en çok 6 sn beklenir. (Eskiden: animasyon 20 sn'ye, "Haritaya Dön" 8 sn'ye kadar beklenirdi.) */
      var now = Date.now(), dt = now - lostAt, bshOn = typeof BSH !== 'undefined' && BSH, resUp = !!document.querySelector('#fn button');
      if (window.v60Active) { try { if (window.v60Skip) v60Skip(); } catch (e) { } }
      if (bshOn) {
        if (resUp && !resAt) resAt = now;
        if (!resUp) { try { var g0 = document.getElementById('go'), bs0 = document.getElementById('bs'); if (g0 && g0.offsetParent) g0.click(); else if (bs0 && bs0.offsetParent) bs0.click(); } catch (e) { } }   /* V215: yenilgide zar/karşılaştırma animasyonu hızlandırılır (panele dokunma = geç) */
        if (!resUp && dt < 6000) return;              /* zarlar/karşılaştırma sürüyor */
        if (resUp && now - resAt < 1200) return;      /* "YENİLGİ" kısa süre görünsün */
        if (typeof closeBattle === 'function') { try { closeBattle(); } catch (e) { } }
      }
      show();
    } catch (e) { }
  }, 200);
  /* yeni oyunda ülke takibi (aynı ülkeyle tekrar için) */
  setInterval(function () { try { if (G && solo5() && ownedN(G.pl) > 0 && !G.over) { home = G.pl; if (shown) reset(); } } catch (e) { } }, 1500);
})();

/* V214 — SADE BİLDİRİM KARTI: politika uygulandı gibi bildirimler eskiden tek satırlık, karmaşık bir yazıydı
   ("📜 Acil Nüfus Seferberliği (Türkiye) uygulandı: Nüfus +%10 (3 zar) · 🌍×1.00"). Artık simge + başlık + tek kısa satır.
   window.wcNote({ icon: 'pop'|'army'|..|emoji, kick: 'POLİTİKA', title: '...', line: '...' }) */
(function () {
  'use strict';
  var el = null, tm = 0;
  window.wcNote = function (o) {
    try {
      o = o || {};
      if (!el) { el = document.createElement('div'); el.id = 'note214'; el.addEventListener('click', function () { el.classList.remove('on'); }); document.body.appendChild(el); }
      var I = window.WC_ICONS || {}, ic = I[o.icon] ? '<img src="' + I[o.icon] + '" alt="">' : (o.icon || '📜');
      el.innerHTML = '<span class="ic">' + ic + '</span><span class="tx">' + (o.kick ? '<small>' + o.kick + '</small>' : '') + '<b>' + (o.title || '') + '</b>' + (o.line ? '<em>' + o.line + '</em>' : '') + '</span>';
      el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
      clearTimeout(tm); tm = setTimeout(function () { el.classList.remove('on'); }, o.ms || 2800);
      try { var t = document.getElementById('toast'); if (t) t.style.display = 'none'; } catch (e) { }
    } catch (e) { }
  };
})();
