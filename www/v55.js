/* V55 — (1) Saldırı savaşını kaybeden fetih imparatorluğu varsayılan renge döner (kazandığı topraklar dahil),
         (2) üst çubuktaki ülke baloncuğuna tıklayınca kamera oyuncunun ülkesine gider,
         (3) V116: oyuncunun başlangıç altını 0 (eskiden 99999 test değeriydi). */
(function () {
  'use strict';
  function on() { return !!G && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner; }
  function ownedCount(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }

  // ---- 1) kaybeden imparatorluk rengi ----
  function hook() {
    if (!(window.R5 && R5.pickLoss && R5.conquer)) return false;
    var _pl = R5.pickLoss;
    R5.pickLoss = function (loser, tg, owner) {
      try {
        /* V68: SAVUNMA zaferi. Tek topraklı savunan, saldıranın toprağını alınca imparatorluk rengine boyanmaz: iki toprak da başlangıçtaki
           (varsayılan / ittifak) rengini korur. Birden çok topraklı savunan kazanırsa kazanılan toprak zaten sahibinin (kazananın) rengiyle boyanır. */
        var dfn = owner && tg != null ? owner[tg] : null;
        if (on() && typeof dfn === 'string' && dfn !== G.pl && ownedCount(dfn) === 1) {
          G.noEcol55 = G.noEcol55 || {}; G.noEcol55[dfn] = 1; if (G.ecol) delete G.ecol[dfn];
        }
      } catch (e) { }
      try {
        if (on() && typeof loser === 'string' && loser !== G.pl && ownedCount(loser) > 1) {
          G.noEcol55 = G.noEcol55 || {}; G.noEcol55[loser] = 1;   // varsayılan renge kilitle
          if (G.ecol) delete G.ecol[loser];
        }
      } catch (e) { }
      return _pl.apply(this, arguments);
    };
    var _cq = R5.conquer;
    R5.conquer = function (state, owner, tg, winner) {
      try { if (on() && G.noEcol55 && G.noEcol55[winner]) delete G.noEcol55[winner]; } catch (e) { }
      return _cq.apply(this, arguments);
    };
    return true;
  }
  hook();

  // ---- 3) altın 99999 (her oyun/kayıt için bir kez) ----
  var _r = render;
  render = function () {
    try { if (on() && !G.gold55) { G.gold = 0; G.gold55 = 1; G.gold56 = 1; try { save(); } catch (e) { } }
      else if (on() && G.gold55 && !G.gold56) { G.gold = 0; G.gold56 = 1; try { save(); } catch (e) { } }   /* V116: eski kayıtlardaki 99.999 test altını bir kez sıfırlanır */ } catch (e) { }
    return _r.apply(this, arguments);
  };

  // ---- 2) ülke baloncuğu -> kamera oyuncunun ülkesine ----
  function focusPlayer() {
    try {
      if (!on()) return;
      var id = G.pl; if (G.owner[id] !== id) { id = null; for (var k in G.owner) if (G.owner[k] === G.pl) { id = k; break; } }
      if (!id || !M[id]) return;
      if (window.v30FocusOn && v30FocusOn(id)) return;
      fit(focusBox(id), 600);
    } catch (e) { }
  }
  window.v55FocusPlayer = focusPlayer;
  document.addEventListener('click', function (ev) {
    var c = ev.target && ev.target.closest ? ev.target.closest('#hud .chip.pl, #hud .v15c') : null;
    if (c) focusPlayer();
  }, true);
  // ---- Koruma talebi: koruyucu, saldırgana ulaşamasa bile savaşa girebilir (saldırganın tüm toprakları hedef olur) ----
  var _tg = targets;
  targets = function (p, ow) {
    var r = _tg.apply(this, arguments);
    try {
      if (G && G.prot55 && typeof p === 'string' && p !== G.pl && ow === G.owner) {
        var tn = G.T ? G.T.turn : 0, I = G.inc23 || {};
        for (var k in I) {
          var q = k.split('>'); if (q[0] !== p || !I[k].guard || I[k].until < tn || !(G.prot55[p] >= tn)) continue;
          for (var id in ow) if (ow[id] === q[1] && !r[id]) r[id] = 'sea';
        }
      }
    } catch (e) { }
    return r;
  };
})();
