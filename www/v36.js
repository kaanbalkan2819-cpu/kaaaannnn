/* V36/V38 — Oyun bitti (Game Over): oyuncunun TÜM toprağı gidince yenilgi, tüm dünya alınınca zafer.
   V38 düzeltmesi: eski sürüm G.over zaten set edilmişse hiçbir şey yapmıyordu (ekran açılmazsa oyun kilitli kalıyordu).
   Artık kontrol, toprak sayısına bakar; G.over set olsa bile oyun bitti penceresi gösterilmemişse gösterir. */
(function () {
  'use strict';
  var shown = false;
  function ownedN(e) { var n = 0; try { for (var k in G.owner) if (G.owner[k] === e) n++; } catch (x) { } return n; }
  function count() {
    var pl = G.pl, n, k;
    if (G.v5 === 1 && typeof pl === 'string') return ownedN(pl);
    if (G.P && G.P.length === 1 && G.ph !== 'pick' && G.ph !== 'v5intro' && G.ph !== 'wheel' && typeof G.owner[Object.keys(G.owner)[0]] === 'number') { n = 0; for (k in G.owner) if (G.owner[k] === 0) n++; return n; }
    return -1;
  }
  function finish() {
    try {
      if (!G) { shown = false; return; }
      if (!G.owner) return;
      var n = count(), tot = R.length;
      if (n < 0) return;
      if (G.ph === 'pick' || G.ph === 'v5intro' || G.ph === 'wheel' || !G.T && G.v5 === 1) { if (G.over && n > 0 && n < tot) delete G.over; return; }
      if (G.over && n > 0 && n < tot) { delete G.over; return; }   // bayat/yanlış bayrak
      if (!G.over) {
        if (n === 0) G.over = { w: -1 }; else if (n === tot) G.over = { w: 0 }; else return;
      }
      G.ph = 'over'; G.busy = 0;
      try { localStorage.removeItem(SV); } catch (x) { }
      if (BSH) return;                                   // savaş ekranı açıkken bekle; kapanınca gösterilir
      var m = document.getElementById('mod');
      if (!shown || !m || m.style.display === 'none' || !/menu\(\)/.test(m.innerHTML)) { shown = true; showOver(); }
    } catch (x) { }
  }
  var _r = render;
  render = function () { var r = _r.apply(this, arguments); setTimeout(finish, 0); return r; };
  var _cb = closeBattle;
  closeBattle = function () { var r = _cb.apply(this, arguments); setTimeout(finish, 50); setTimeout(finish, 400); return r; };
  setInterval(function(){if(!document.hidden)finish()}, 1200);
})();
