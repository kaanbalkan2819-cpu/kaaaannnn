/* V13: (1) saldırılabilir ülkeler için tek katmanlı, statik hedef simgeleri (dış hat animasyonu yok)
        (2) daha klas ana menü + mod seçimi. Mevcut işlevler (devam/yeni/ayarlar/dil/kapat/newGame) aynen çağrılır. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', lastSig = '';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'tr') ? tr : en; }

  // ---------- hedef simgeleri (mkg katmanı; labels() her çizimde katmanı zaten temizliyor) ----------
  function drawIcons() {
    if (typeof mkg === 'undefined' || !mkg || !G || !G.v5 || G.ph != 'act' || BT || !G.sel) { lastSig = ''; return; }
    var ids = Object.keys(TG || {}); if (!ids.length) { lastSig = ''; return; }
    var k = CAM.k, sig = (G.sel || '') + '|' + ids.length + '|' + G.T.turn, fresh = sig !== lastSig; lastSig = sig;
    ids.forEach(function (id) {
      var r = M[id]; if (!r || !r.px || isNaN(r.px[0])) return;
      var m = Math.min(r.bw || 0, r.bh || 0) * k, px = Math.max(8, Math.min(15, m * 0.42)), u = px / k;   // ülkeye göre sınırlı boyut
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'tgi' + (TG[id] == 'sea' ? ' tgi-sea' : '') + (fresh ? ' tgi-new' : ''));
      g.setAttribute('transform', 'translate(' + r.px[0] + ',' + r.px[1] + ')');
      var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', u); c.setAttribute('class', 'tgc');
      var p = document.createElementNS(NS, 'path');   // nişangâh: artı çizgileri
      var a = u * 1.0, b = u * 0.38;
      p.setAttribute('d', 'M0,' + (-a) + 'V' + (-b) + 'M0,' + b + 'V' + a + 'M' + (-a) + ',0H' + (-b) + 'M' + b + ',0H' + a);
      p.setAttribute('class', 'tgx');
      var d = document.createElementNS(NS, 'circle'); d.setAttribute('r', u * 0.16); d.setAttribute('class', 'tgd');
      g.appendChild(c); g.appendChild(p); g.appendChild(d); mkg.node().appendChild(g);
    });
  }
  var _labels = labels;
  labels = function () { _labels(); try { drawIcons(); } catch (e) { } };

  // ---------- ana menü ----------
  var _modal = modal;
  modal = function (h) { var b = document.getElementById('box'); if (b) b.classList.remove('mm'); _modal(h); };
  function mm(h) { _modal(h); document.getElementById('box').classList.add('mm'); }
  // V24: Osmanlı sancağı esinli, görkemli ana menü (hilâl + sekiz köşeli yıldız, altın işleme, saçak)
  var CREST = '<svg class="mm-crest" viewBox="0 0 140 140" aria-hidden="true"><defs>' +
    '<linearGradient id="mmg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".45" stop-color="#e3b94f"/><stop offset="1" stop-color="#9a6b12"/></linearGradient>' +
    '<mask id="mmm"><rect width="140" height="140" fill="#fff"/><circle cx="76" cy="70" r="37" fill="#000"/></mask></defs>' +
    '<circle cx="70" cy="70" r="64" fill="none" stroke="url(#mmg)" stroke-width="1.6" stroke-dasharray="2 5" class="mm-ring"/>' +
    '<circle cx="70" cy="70" r="58" fill="none" stroke="url(#mmg)" stroke-width="1"/>' +
    '<circle cx="62" cy="70" r="42" fill="url(#mmg)" mask="url(#mmm)" class="mm-moon"/>' +
    '<g class="mm-star" transform="translate(94 70)"><rect x="-11" y="-11" width="22" height="22" fill="url(#mmg)"/><rect x="-11" y="-11" width="22" height="22" fill="url(#mmg)" transform="rotate(45)"/><circle r="4" fill="#5e0b17"/></g></svg>';
  var FR = ''; for (var fi = 0; fi < 22; fi++) FR += '<i style="animation-delay:' + (fi * 0.09).toFixed(2) + 's"></i>';
  var ORN = '<div class="mm-orn"><span></span><b>❖</b><span></span></div>';
  menu = function () {
    var save = hasSave();
    mm('<div class="mm-hero">' + CREST + '<h1>WORLD<span>CONQUEST</span></h1>' + ORN + '<div class="mm-sub">' + X('Cihan hâkimiyeti yolunda', 'The road to world dominion') + '</div></div>' +
      '<div class="mm-btns">' +
      '<button class="mm-b pri" ' + (save ? '' : 'disabled') + ' onclick="cont()">' + t('cont') + '</button>' +
      '<button class="mm-b" onclick="askNew()">' + t('nw') + '</button>' +
      '<div class="mm-row"><button class="mm-b sm" onclick="settings()">⚙ ' + t('set') + '</button><button class="mm-b sm" onclick="setLang()">🌐 ' + t('lg') + '</button></div>' +
      (G ? '<button class="mm-b ghost" onclick="closeMod()">' + t('cl') + '</button>' : '') + '</div><div class="mm-fringe">' + FR + '</div>');
  };
  modes = function () {
    mm('<div class="mm-hero sm">' + CREST + '<h1>' + X('MOD SEÇ', 'SELECT MODE') + '</h1>' + ORN + '</div><div class="mm-btns">' +
      '<button class="mm-card" onclick="newGame(1)"><b>' + t('m1') + '</b><small>' + t('m1d') + '</small></button>' +
      '<button class="mm-b ghost" onclick="menu()">← ' + X('Geri', 'Back') + '</button></div><div class="mm-fringe">' + FR + '</div>');
  };
  window.V13 = { drawIcons: drawIcons };
})();
