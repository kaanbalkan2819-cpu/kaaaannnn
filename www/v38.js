/* V38 — (1) Oyun bitti güvencesi: oyuncunun hiç toprağı kalmadıysa, modal sistemine/BSH'ye bağlı olmadan kendi tam ekran "Yenilgi" katmanını çizer.
         (2) Fethedilen topraklar: her boyamada rengi sahibin rengine (col(ownerOf)) zorla eşitler; önbellek (r._c) atlanmaz. */
(function () {
  'use strict';
  var LANG = function () { return (typeof L !== 'undefined' && L === 'en') ? 'en' : 'tr'; };
  function ownedN(e) { var n = 0; try { for (var k in G.owner) if (G.owner[k] === e) n++; } catch (x) { } return n; }
  function started() {
    return !!G && G.v5 === 1 && typeof G.pl === 'string' && G.pl && G.owner && G.T && G.ph !== 'pick' && G.ph !== 'v7pick' && G.ph !== 'v5intro' && G.ph !== 'wheel';
  }
  var bsSince = 0, ovEl = null;
  function overlay(win) {
    if (ovEl) return;
    var en = LANG() === 'en';
    ovEl = document.createElement('div');
    ovEl.id = 'v38over';
    ovEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(5,8,16,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;font-family:inherit;text-align:center;padding:24px';
    ovEl.innerHTML = '<div style="font-size:34px;font-weight:800;letter-spacing:1px;color:' + (win ? '#f2c14e' : '#ff5a47') + '">' + (win ? (en ? 'VICTORY' : 'ZAFER') : (en ? 'GAME OVER' : 'OYUN BİTTİ')) + '</div>' +
      '<div style="opacity:.85;max-width:320px">' + (win ? (en ? 'You conquered the world.' : 'Dünyayı fethettin.') : (en ? 'You lost your last territory.' : 'Son toprağını da kaybettin.')) + '</div>' +
      '<button id="v38menu" style="padding:12px 26px;font-size:16px;border-radius:10px;border:0;background:#f2c14e;color:#1a1200;font-weight:700">' + (en ? 'Main menu' : 'Ana menü') + '</button>';
    document.body.appendChild(ovEl);
    document.getElementById('v38menu').onclick = function () {
      try { ovEl.remove(); } catch (x) { } ovEl = null;
      try { localStorage.removeItem(SV); } catch (x) { }
      try { var m = document.getElementById('mod'); if (m) m.style.display = 'none'; } catch (x) { }
      try { G = null; } catch (x) { }
      try { menu(); } catch (x) { }
    };
  }
  function check() {
    try {
      if (!G) { if (ovEl) { ovEl.remove(); ovEl = null; } bsSince = 0; return; }
      if (!started()) return;
      var n = ownedN(G.pl), tot = R.length, end = n === 0 ? -1 : (n === tot ? 0 : null);
      if (end === null) { if (G.over) { try { delete G.over; } catch (x) { } } return; }   // bayat bayrak
      if (!G.over) G.over = { w: end };
      G.ph = 'over'; G.busy = 0;
      try { localStorage.removeItem(SV); } catch (x) { }
      if (typeof BSH !== 'undefined' && BSH) { if (!bsSince) bsSince = Date.now(); if (Date.now() - bsSince < 2500) return; }  // savaş ekranı kapansın; takılırsa 2,5 sn sonra yine de göster
      overlay(end === 0);
    } catch (x) { }
  }
  setInterval(function(){if(!document.hidden)check()}, 1200);

  /* ---- fethedilen topraklar: sahibin rengi ---- */
  function recolor() {
    try {
      if (!G || typeof pel === 'undefined' || !pel || typeof col !== 'function' || typeof ownerOf !== 'function') return;
      pel.each(function (r) {
        var c = col(ownerOf(r.id));
        if (c && this.style.fill !== c) { r._c = c; this.style.fill = c; }
        else if (c) r._c = c;
      });
    } catch (x) { }
  }
  if (typeof paint === 'function') { var _p = paint; paint = function () { var r = _p.apply(this, arguments); recolor(); return r; }; }
})();
