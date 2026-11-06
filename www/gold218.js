/* V218 — ALTIN MÜHÜRLER (12 bölge, Figma ile üretildi: assets/goldseals/*.png)
   - Bir bölgenin TÜM ülkeleri aynı oyunda senin olunca o bölgenin altın mührü KALICI olarak açılır (localStorage 'wc_gseal218').
   - Tek kişilik yeni oyunda ülke seçme ekranı açılınca, açık altın mührün varsa öğretici sorusu yerine "Altın mühür kullanmak ister misin?" penceresi gelir.
   - Mühür seçilirse yalnızca o bölgeden ülke seçilebilir; oyun başlayınca seçtiğin ülkenin 5 değeri %2 artar (küçük, dengeli avantaj).
   - Online / dereceli oyunlarda devre dışı.
   Geri almak için index.html'den gold218.js bağlantısını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  var BONUS = 0.02, KEY = 'wc_gseal218';
  var REG = [
    { id: 'hicaz', n: ['Hicaz Mührü', 'Hejaz Seal'], a: ['Deve', 'Camel'], r: ['Arap Yarımadası', 'Arabian Peninsula'], c: 'SAU YEM OMN ARE QAT KWT' },
    { id: 'viking', n: ['Viking Mührü', 'Viking Seal'], a: ['Kuzgun', 'Raven'], r: ['İskandinavya', 'Scandinavia'], c: 'NOR SWE DNK FIN ISL' },
    { id: 'amazon', n: ['Amazon Mührü', 'Amazon Seal'], a: ['Jaguar', 'Jaguar'], r: ['Amazon Havzası', 'Amazon Basin'], c: 'BRA COL VEN ECU PER GUY SUR GUF' },
    { id: 'balkan', n: ['Balkan Mührü', 'Balkan Seal'], a: ['Vaşak', 'Lynx'], r: ['Balkanlar', 'Balkans'], c: 'GRC BGR ROU SRB MKD ALB MNE BIH HRV SVN' },
    { id: 'nil', n: ['Nil Mührü', 'Nile Seal'], a: ['Timsah', 'Crocodile'], r: ['Nil Havzası', 'Nile Basin'], c: 'EGY SDN SSD ETH ERI' },
    { id: 'savan', n: ['Savan Mührü', 'Savanna Seal'], a: ['Aslan', 'Lion'], r: ['Doğu Afrika', 'East Africa'], c: 'KEN TZA UGA RWA BDI SOM' },
    { id: 'bozkir', n: ['Bozkır Mührü', 'Steppe Seal'], a: ['At', 'Horse'], r: ['Orta Asya Bozkırı', 'Central Asian Steppe'], c: 'KAZ UZB TKM KGZ TJK MNG' },
    { id: 'mezopotamya', n: ['Mezopotamya Mührü', 'Mesopotamia Seal'], a: ['Kanatlı Boğa', 'Lamassu'], r: ['Mezopotamya ve Levant', 'Mesopotamia & Levant'], c: 'IRQ SYR JOR LBN ISR PSE' },
    { id: 'hint', n: ['Hint Mührü', 'Indus Seal'], a: ['Kaplan', 'Tiger'], r: ['Hint Alt Kıtası', 'Indian Subcontinent'], c: 'IND PAK BGD NPL BTN LKA' },
    { id: 'uzakdogu', n: ['Ejder Mührü', 'Dragon Seal'], a: ['Ejderha', 'Dragon'], r: ['Uzak Doğu', 'Far East'], c: 'CHN KOR PRK JPN TWN' },
    { id: 'sahra', n: ['Sahra Mührü', 'Sahara Seal'], a: ['Çöl Tilkisi', 'Fennec Fox'], r: ['Kuzey Afrika', 'North Africa'], c: 'MAR DZA TUN LBY MRT ESH' },
    { id: 'and', n: ['And Mührü', 'Andes Seal'], a: ['Kondor', 'Condor'], r: ['Güney Konisi', 'Southern Cone'], c: 'CHL ARG URY PRY BOL' }
  ];
  REG.forEach(function (g) { g.list = g.c.split(' '); });
  function byId(id) { for (var i = 0; i < REG.length; i++) if (REG[i].id === id) return REG[i]; return null; }
  function img(g) { return 'assets/goldseals/' + g.id + '.png'; }
  function got() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function setGot(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { } }
  function solo() { try { return !!window.G && !G.mp && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner; } catch (e) { return false; } }
  function pickSolo() { try { return !!window.G && !G.mp && !!G.owner && (G.ph === 'v7pick' || G.ph === 'pick'); } catch (e) { return false; } }
  var PEND = null;   /* seçim ekranında seçilen mühür (G nesnesi oyun başlarken yenilense de korunur) */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nm(c) { try { return (window.M && M[c] && M[c].name) || c; } catch (e) { return c; } }

  /* ---------- kilit açma: bölgenin tüm ülkeleri senin ---------- */
  function note(g) {
    var el = document.getElementById('gs218n'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'gs218n';
    el.innerHTML = '<i style="background-image:url(' + img(g) + ')"></i><div><small>' + X('ALTIN MÜHÜR AÇILDI', 'GOLDEN SEAL UNLOCKED') + '</small><b>' + esc(X(g.n[0], g.n[1])) + '</b>' +
      '<span>' + esc(X(g.r[0] + ' fethedildi · yeni oyunda bu bölgeden başlarsan değerler +%2', g.r[1] + ' conquered · start a new game here for +2% stats')) + '</span></div>';
    document.body.appendChild(el); requestAnimationFrame(function () { el.classList.add('on'); });
    el.onclick = function () { el.classList.remove('on'); };
    setTimeout(function () { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 400); }, 6500);
    try { if (window.AU) AU.play('win'); } catch (e) { }
  }
  setInterval(function () {
    try {
      if (!solo() || ['pick', 'v7pick', 'v5intro'].indexOf(G.ph) >= 0 || (window.WCTour && WCTour.active && WCTour.active())) return;
      var have = got(), ch = false;
      REG.forEach(function (g) {
        if (have.indexOf(g.id) >= 0) return;
        var n = 0, all = true; g.list.forEach(function (c) { if (G.owner[c] === undefined) return; n++; if (G.owner[c] !== G.pl) all = false; });
        if (n && all) { have.push(g.id); ch = true; note(g); }
      });
      if (ch) setGot(have);
    } catch (e) { }
  }, 1200);

  /* ---------- başlangıç: mühür seçimi ---------- */
  var SEL = null;
  function chooserHTML() {
    var have = got(), h = '<div class="wb-wrap still"><div class="wb-panel wb-pause wc141p gs218"><div class="c141h"><span class="p">⚜</span><h3>' + X('ALTIN MÜHÜR', 'GOLDEN SEAL') + '</h3></div>' +
      '<p class="gs218s">' + X('Bu seferi bir altın mühürle başlatmak ister misin? Mühür seçersen yalnızca o bölgeden ülke seçebilirsin; ülkenin tüm değerleri <b>+%2</b> olur.',
        'Start this campaign with a golden seal? You can then only pick a country from that region; all its stats get <b>+2%</b>.') + '</p><div class="gs218g">';
    REG.forEach(function (g) {
      var ok = have.indexOf(g.id) >= 0;
      h += '<button type="button" class="gs218i' + (ok ? '' : ' lk') + (SEL === g.id ? ' on' : '') + '" ' + (ok ? 'onclick="GS218.sel(\'' + g.id + '\')"' : 'onclick="GS218.why(\'' + g.id + '\')"') + '>' +
        '<i style="background-image:url(' + img(g) + ')"></i><b>' + esc(X(g.n[0], g.n[1])) + '</b><small>' + (ok ? esc(X(g.r[0], g.r[1])) : '🔒 ' + esc(X(g.r[0], g.r[1]))) + '</small></button>';
    });
    h += '</div><div class="gs218w" id="gs218w">' + (SEL ? whyTxt(byId(SEL), true) : X('Kilitli mühürler: o bölgenin tüm ülkelerini aynı oyunda fethet.', 'Locked seals: conquer every country of that region in one game.')) + '</div>' +
      '<div class="c141g"><button type="button" class="c141b pri" ' + (SEL ? 'onclick="GS218.go()"' : 'disabled') + '><span class="ic">⚜</span><span class="lb">' + X('Mühürle Başla', 'Start with Seal') + '</span></button>' +
      '<button type="button" class="c141b" onclick="GS218.none()"><span class="ic">▶</span><span class="lb">' + X('Mühürsüz Başla', 'Start without Seal') + '</span></button></div></div></div>';
    return h;
  }
  function whyTxt(g, open) {
    var names = g.list.map(nm).join(', ');
    return (open ? '<b>' + esc(X(g.n[0], g.n[1])) + '</b> · ' + esc(X(g.a[0], g.a[1])) + ' — ' + X('seçilebilir ülkeler: ', 'pickable: ') : '🔒 <b>' + esc(X(g.n[0], g.n[1])) + '</b> — ' + X('açmak için fethet: ', 'conquer to unlock: ')) + esc(names);
  }
  function showChooser() {
    PEND = null;
    var m = document.getElementById('mod'), bx = document.getElementById('box'); if (!m || !bx) return;
    try { window.__wbOn = true; modal('<div></div>'); } catch (e) { } finally { window.__wbOn = false; }
    m.classList.add('wbm'); bx.classList.remove('mm'); bx.innerHTML = chooserHTML();
    try { if (window.v156Decorate) v156Decorate(); } catch (e) { }
    m.style.display = 'flex'; m.onclick = null;
  }
  window.GS218 = {
    sel: function (id) { SEL = id; showChooser(); },
    why: function (id) { var w = document.getElementById('gs218w'), g = byId(id); if (w && g) w.innerHTML = whyTxt(g, false); },
    go: function () {
      var g = byId(SEL); if (!g || !pickSolo()) return; G.gs218 = g.id; PEND = g.id; try { closeMod(); } catch (e) { }
      try { var first = g.list.filter(function (c) { return G.owner[c] !== undefined; })[0]; if (first && window.v30FocusOn) v30FocusOn(first); } catch (e) { }
      try { toast('⚜ ' + X(g.n[0] + ': ' + g.r[0] + ' bölgesinden bir ülke seç', g.n[1] + ': pick a country in ' + g.r[1])); } catch (e) { }
    },
    none: function () { SEL = null; PEND = null; try { if (window.G) G.gs218 = null; closeMod(); } catch (e) { } },
    list: function () { return REG.map(function (g) { return { id: g.id, open: got().indexOf(g.id) >= 0 }; }); },
    unlockAll: function () { setGot(REG.map(function (g) { return g.id; })); }   /* yalnızca test için */
  };
  /* tutorial sorusu yerine (mühür varsa) */
  (function hookTut() {
    if (!window.WCTut || !WCTut.askInGame) return setTimeout(hookTut, 500);
    if (WCTut.askInGame.gs218) return;
    var _a = WCTut.askInGame; WCTut.askInGame = function () { if (got().length && window.G && !G.mp && !G.gs218asked) { G.gs218asked = 1; SEL = null; showChooser(); return; } return _a.apply(this, arguments); };
    WCTut.askInGame.gs218 = 1;
  })();
  /* öğretici sorulmayan yeni oyunlarda: seçim ekranı açılınca (küre yaklaşması bitince) bir kez sor */
  setInterval(function () {
    try {
      if (!pickSolo() || G.ph !== 'v7pick' || G.gs218asked || !got().length) return;
      if (window.v30IntroBusy && v30IntroBusy()) return;
      var m = document.getElementById('mod'); if (m && m.style.display === 'flex') return;
      G.gs218asked = 1; SEL = null; showChooser();
    } catch (e) { }
  }, 600);
  /* mühürle: yalnızca bölge ülkeleri seçilebilir */
  (function hookPick() {
    if (typeof pickC !== 'function') return setTimeout(hookPick, 500);
    if (pickC.gs218) return;
    var _p = pickC; pickC = function (id) {
      try {
        if (pickSolo() && (G.gs218 || PEND)) {
          var g = byId(G.gs218 || PEND), c = (G.owner && typeof G.owner[id] === 'string') ? G.owner[id] : id;
          if (g && g.list.indexOf(id) < 0 && g.list.indexOf(c) < 0) { try { toast('⚜ ' + X(g.n[0] + ' ile yalnızca ' + g.r[0] + ' ülkeleri seçilebilir', 'With the ' + g.n[1] + ' you can only pick ' + g.r[1])); } catch (e) { } return; }
        }
      } catch (e) { }
      return _p.apply(this, arguments);
    };
    pickC.gs218 = 1;
  })();
  /* oyun başlayınca seçilen ülkenin değerleri +%2 (bir kez) */
  setInterval(function () {
    try {
      if (!solo() || ['pick', 'v7pick'].indexOf(G.ph) >= 0) return;
      if (PEND && !G.gs218) G.gs218 = PEND;
      if (!G.gs218 || G.gs218ok) { PEND = null; return; }
      PEND = null;
      var g = byId(G.gs218); if (!g) return; G.gs218ok = 1;
      if (g.list.indexOf(G.pl) < 0) return;   /* bölge dışı (olmamalı) */
      G.es = G.es || {}; var b = (G.es[G.pl] || (typeof BASE !== 'undefined' && BASE[G.pl]) || []).slice();
      if (!b.length) return;
      G.es[G.pl] = b.map(function (v) { return Math.round(v * (1 + BONUS) * 10) / 10; });
      try { save(); } catch (e) { } try { render(); } catch (e) { }
      try { toast('⚜ ' + X(g.n[0] + ' etkin: ' + nm(G.pl) + ' tüm değerler +%2', g.n[1] + ' active: ' + nm(G.pl) + ' all stats +2%')); } catch (e) { }
    } catch (e) { }
  }, 700);
})();
