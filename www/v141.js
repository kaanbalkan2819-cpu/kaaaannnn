/* V141 — oyun içi menü (oyunun üstünde açılan duraklatma kartı) + oyuncu saldırısında hızlı-mod güvenliği.
   TEST EDİLMEDİ (istek gereği). Geri almak için index.html'den v141.js ve v141.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'tr') ? tr : en; }
  function inGame() { try { return !!G && !G.over && G.ph !== 'over' && !document.body.classList.contains('wcm-on'); } catch (e) { return false; } }
  function sync() { try { if (typeof BSH !== 'undefined' && BSH) return; document.body.classList.toggle('wc141-ig', inGame()); } catch (e) { } }
  setInterval(sync, 500);

  function chip(v, k) { return '<div><b>' + v + '</b><small>' + k + '</small></div>'; }
  function stats() {
    try {
      var turn = (G.T && G.T.turn) || G.turn || 1, s = '';
      if (G.owner && typeof G.pl === 'string') {          // v5 (çok ülkeli) oyun
        var mine = 0, tot = 0; for (var k in G.owner) { tot++; if (G.owner[k] === G.pl) mine++; }
        s = chip(turn, X('TUR', 'TURN')) + chip(mine + '<i>/' + tot + '</i>', X('TOPRAK', 'LANDS'));
        if (G.T && G.T.moves != null) s += chip((G.T.moves | 0) + '<i>/' + (G.T.roll | 0) + '</i>', X('HAMLE', 'MOVES'));
      } else if (typeof solo === 'function' && solo()) {
        s = chip(turn, X('TUR', 'TURN')) + chip(owned(G.pl != null ? G.pl : 0).length + '<i>/' + R.length + '</i>', X('BÖLGE', 'LANDS')) + chip(Math.floor(+G.gold || 0), X('ALTIN', 'GOLD'));
      } else {
        s = chip(G.turn || 1, X('TUR', 'TURN')) + chip(owned(0).length, G.P[0].name) + chip(owned(1).length, G.P[1].name);
      }
      return '<div class="c141s">' + s + '</div>';
    } catch (e) { return ''; }
  }
  function b(ic, label, fn, cls) { return '<button type="button" class="c141b ' + (cls || '') + '" onclick="' + fn + '"><span class="ic">' + ic + '</span><span class="lb">' + label + '</span></button>'; }

  /* V152: oyun içi menüye "Pes Et" (kaybetme) eklendi: onay sonrası sefer yenilgiyle biter ve "İmparatorluk Düştü" ekranı açılır. Online (G.mp) oyunda gösterilmez. */
  function giveBtn() { try { if (G && G.mp) return ''; } catch (e) { return ''; } return b('🏳', X('Pes Et', 'Surrender'), 'v151Give()', 'warn'); }
  window.v151Give = function () {
    try {
      modal('<h3>🏳 ' + X('Pes Et', 'Surrender') + '</h3><p style="color:var(--tx2);text-align:center">' + X('Seferi yenilgiyle bitirmek istiyor musun? Kayıtlı seferin silinir.', 'End the campaign in defeat? Your saved campaign will be deleted.') + '</p>' +
        '<button class="big pri" onclick="v151GiveDo()">' + X('Evet, pes et', 'Yes, surrender') + '</button><button class="big" onclick="closeMod()">' + X('Vazgeç', 'Cancel') + '</button>');
    } catch (e) { try { console.error(e); } catch (x) { } }
  };
  window.v151GiveDo = function () {
    try {
      try { closeMod(); } catch (e) { }
      if (!G || G.over || (G.mp)) return;
      G.fin139 = { w: -1 }; G.over = { w: -1 }; G.ph = 'over'; G.busy = 0;
      try { localStorage.removeItem(SV); } catch (e) { }
      try { render(); } catch (e) { }
    } catch (e) { try { console.error(e); } catch (x) { } }
  };

  /* V153: duraklatma menüsüne "Ana Menü": sefer kaydedilir (Seferi Sürdür ile devam edilir), oyun kapanır, ana menü açılır. Online oyunda gösterilmez. */
  function homeBtn() { try { if (G && G.mp) return ''; } catch (e) { return ''; } return b('🏠', X('Ana Menü', 'Main Menu'), 'v153Home()', ''); }
  window.v153Home = function () {
    try { closeMod(); } catch (e) { }
    try { if (G && !G.over) save(); } catch (e) { }
    try { G = null; } catch (e) { }
    try { document.body.classList.remove('wc141-ig'); } catch (e) { }
    try { menu(); } catch (e) { try { console.error(e); } catch (x) { } }
  };

  function open() {
    var m = document.getElementById('mod'), bx = document.getElementById('box'); if (!m || !bx) throw new Error('mod yok');
    window.__wbOn = true; try { modal('<div></div>'); } finally { window.__wbOn = false; }
    m.classList.add('wbm'); bx.classList.remove('mm');
    try { var tt = document.getElementById('toast'); if (tt) tt.style.display = 'none'; } catch (e) { }
    var hist = (typeof window.v139Hist === 'function') ? '<button type="button" id="v139h" class="c141b" onclick="v139Hist()"><span class="ic">📜</span><span class="lb">' + X('Oyun Geçmişi', 'Game History') + '</span></button>' : '';   // id: v139 histBtn() ikinci düğme eklemesin
    bx.innerHTML = '<div class="wb-wrap still"><div class="wb-panel wb-pause wc141p">' +
      '<div class="c141h"><span class="p">⏸</span><h3>' + X('DURAKLATILDI', 'PAUSED') + '</h3></div>' + stats() +
      '<div class="c141g">' +
      b('▶', X('Oyuna Dön', 'Resume'), 'closeMod()', 'pri') +
      homeBtn() +   /* V160: Ana Menü, Oyuna Dön'ün hemen altına alındı (görünür olsun) */
      /* V167: Kaydet, Oyun Geçmişi, Dil ve Yeni Oyun düğmeleri duraklatma menüsünden kaldırıldı */
      b('⚙', t('set'), 'settings()', '') +
      giveBtn() +
      '</div></div></div>';
    m.style.display = 'flex';
    m.onclick = function (e) { if (e.target === m && m.querySelector('.wc141p')) closeMod(); };   // karartılmış alana dokununca oyuna dön (yalnızca bu kart açıkken)
  }

  var _menu = menu;
  menu = function () {
    if (!inGame()) { try { document.body.classList.remove('wc141-ig'); } catch (e) { } return _menu.apply(this, arguments); }
    try { document.body.classList.add('wc141-ig'); open(); }
    catch (e) { try { console.error('v141 menu', e); } catch (x) { } return _menu.apply(this, arguments); }
  };

  /* Oyuncu saldırısında "hızlı YZ turu" (SET.rm=1) açık kalmışsa kapat: aksi halde saldırı animasyonu hiç başlamaz (v60: SET.rm → atla). */
  /* V154: oyuncunun her savaşından sonra sefer kendiliğinden kaydolur (YZ savaşlarında ve oyun bittiyse kaydetmez; online oyunda yok). */
  function pill154() {
    try { var p = document.getElementById('sv139'); if (!p) { p = document.createElement('div'); p.id = 'sv139'; document.body.appendChild(p); } p.textContent = '💾 ' + X('Kaydedildi', 'Saved'); p.className = ''; void p.offsetWidth; p.className = 'show'; } catch (e) { }
  }
  if (typeof closeBattle === 'function') {
    var _cb154 = closeBattle;
    closeBattle = function () {
      var mine = false;
      try { mine = !!G && !G.mp && !(G.last && G.last.ai) && !G.aiBusy; } catch (e) { }
      var r = _cb154.apply(this, arguments);
      if (mine) setTimeout(function () { try { if (G && !G.mp && !G.over && G.ph !== 'over' && (!G.T || G.T.turn)) { save(); pill154(); } } catch (e) { } }, 700);
      return r;
    };
  }

  var _sb = showBattle;
  showBattle = function () {
    try { if (window.v139FastOff && G && !(G.last && G.last.ai) && !G.aiBusy) window.v139FastOff(); } catch (x) { }
    return _sb.apply(this, arguments);
  };
})();
