/* V39 — Fethedilen ülkeler, başlangıç ülkesiyle AYNI renkte (test edilmedi — istek gereği).
   Oyuncunun "kök" kimliği (G.pl veya G.P[0].start) ne ise, o sahipli her ülke tek renkle boyanır.
   Kök renk: G.plCol || col(kök). Haritadaki poligon, nokta (dot) ve 2B sınır çizgisi bu renge zorlanır. */
(function () {
  function root() {
    try {
      if (!G) return null;
      if (G.v5 === 1 && G.pl) return G.pl;
      if (G.P && G.P[0] && G.P[0].start) return G.P[0].start;
      if (G.act && G.mode == 1) return G.act;
    } catch (e) { }
    return null;
  }
  var _col = col, busy = 0;
  function rootColor(rt) {
    try { if (G && G.plCol && G.v5 === 1) return G.plCol; } catch (e) { }
    busy = 1; var c; try { c = _col(rt); } finally { busy = 0; }
    return c;
  }
  col = function (e) {
    if (!busy && typeof e == 'string') { var rt = root(); if (rt && e === rt) return rootColor(rt); }
    return _col.apply(this, arguments);
  };
  function recolor() {
    try {
      if (!G || typeof pel === 'undefined' || !pel || typeof ownerOf !== 'function') return;
      var rt = root(); if (!rt) return;
      var c = rootColor(rt);
      pel.each(function (r) {
        if (ownerOf(r.id) === rt && this.style.fill !== c) { r._c = c; this.style.fill = c; }
      });
      var d = document.querySelectorAll('circle.dot');
      for (var i = 0; i < d.length; i++) { var dd = d[i].__data__; if (dd && ownerOf(dd.id) === rt) d[i].style.fill = c; }
    } catch (x) { }
  }
  if (typeof paint === 'function') { var _p = paint; paint = function () { var r = _p.apply(this, arguments); recolor(); return r; }; }
  setInterval(function(){if(!document.hidden)recolor()}, 3000);
})();
