/* V141 — oyun içi menü (oyunun üstünde açılan duraklatma kartı) + oyuncu saldırısında hızlı-mod güvenliği.
   TEST EDİLMEDİ (istek gereği). Geri almak için index.html'den v141.js ve v141.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'tr') ? tr : en; }
  function inGame() { try { return !!G && !G.over && G.ph !== 'over' && !document.body.classList.contains('wcm-on'); } catch (e) { return false; } }
  function sync() { try { document.body.classList.toggle('wc141-ig', inGame()); } catch (e) { } }
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
      b('💾', '<span id="wb29save">' + X('Kaydet', 'Save') + '</span>', 'wb29Save()', '') +
      b('⚙', t('set'), 'settings()', '') +
      hist +
      b('🌐', t('lg'), 'setLang();menu()', '') +
      b('🔄', t('nw'), 'askNew()', 'warn') +
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
  var _sb = showBattle;
  showBattle = function () {
    try { if (window.v139FastOff && G && !(G.last && G.last.ai) && !G.aiBusy) window.v139FastOff(); } catch (x) { }
    return _sb.apply(this, arguments);
  };
})();
