/* V114 — country_stats.js: GİZLİ ülke güç skoru ve 4 güç grubu (tier).
   Grup adları yalnızca kod içindedir; oyuncuya ASLA gösterilmez.
   Skor: ülkenin 5 temel istatistiğinin toplamı (BASE) — oyundaki sum(st(e)) ile aynı ölçü.
   Bölüştürme: skora göre sıralanıp 4 eşit dilime ayrılır (0 ÇOK DÜŞÜK, 1 DÜŞÜK, 2 ORTA, 3 YÜKSEK).
   Rank maçında kurucu (host) bir grubun ÇİFT sıralı, konuk TEK sıralı ülkelerinden çekilir:
   böylece iki oyuncu aynı grupta olur ve aynı anda aynı ülkeyi çekemez (çakışma yok). */
(function () {
  'use strict';
  var NAMES = ['ÇOK DÜŞÜK', 'DÜŞÜK', 'ORTA', 'YÜKSEK'];   // iç kullanım
  var cache = null;
  function score(id) {
    var b = (typeof BASE !== 'undefined' && BASE[id]) || null; if (!b) return 0;
    var s = 0; for (var i = 0; i < 5; i++) s += (+b[i] || 0);
    var h = 0; for (var j = 0; j < id.length; j++) h = (h * 31 + id.charCodeAt(j)) % 997;
    return s + h / 1e6;                                   // eşit skorlarda kararlı sıra
  }
  function build() {
    if (typeof BASE === 'undefined' || typeof M === 'undefined') return null;
    var ids = Object.keys(BASE).filter(function (k) { return M[k] && M[k].name; });
    if (ids.length < 16) return null;                      // veri henüz yüklenmedi
    ids.sort(function (a, b) { return score(a) - score(b); });
    var n = ids.length, T = [[], [], [], []], of = {};
    ids.forEach(function (id, i) { var t = Math.min(3, Math.floor(i * 4 / n)); T[t].push(id); of[id] = t; });
    cache = { tiers: T, of: of, n: n };
    return cache;
  }
  function get() { return cache || build(); }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  /* V122: Rank'ta iki ülke birbirine aşırı uzak olmasın — merkezleri arası açısal mesafe (rad; 1 rad ≈ 6370 km) */
  var MAXD = 0.9, cuMap = null;
  function cuOf(id) {
    try {
      if (!cuMap) { cuMap = {}; R.forEach(function (r) { if (r && r.id && r.cu) cuMap[r.id] = r.cu; }); }
      return cuMap[id] || null;
    } catch (e) { return null; }
  }
  function dist(a, b) {
    var A = cuOf(a), B = cuOf(b); if (!A || !B) return 0;
    return Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
  }
  window.WCStats = {
    NAMES: NAMES,
    ready: function () { return !!get(); },
    power: score,
    tierOf: function (id) { var c = get(); return c ? c.of[id] : -1; },
    list: function (t) { var c = get(); return c ? c.tiers[t].slice() : []; },
    /* parity: 0 = kurucu havuzu (çift sıra), 1 = konuk havuzu (tek sıra) */
    pool: function (t, parity) { var c = get(); if (!c) return []; return c.tiers[t].filter(function (_, i) { return i % 2 === parity; }); },
    pick: function (t, parity, exclude) {
      var p = this.pool(t, parity).filter(function (id) { return !exclude || exclude.indexOf(id) < 0; });
      return p.length ? rnd(p) : null;
    },
    /* near'a MAXD içinde olanlardan seç; yoksa en yakını (veri yoksa rastgele) */
    pickNear: function (t, parity, exclude, near) {
      var p = this.pool(t, parity).filter(function (id) { return !exclude || exclude.indexOf(id) < 0; });
      if (!p.length) return null; if (!near || !cuOf(near)) return rnd(p);
      var ok = p.filter(function (id) { return dist(id, near) <= MAXD; });
      if (ok.length) return rnd(ok);
      p.sort(function (a, b) { return dist(a, near) - dist(b, near); }); return p[0];
    },
    pickPair: function (t) {   // {hc, gc}: kurucu ülkesi + ona makul uzaklıkta konuk ülkesi
      for (var tr = 0; tr < 40; tr++) { var h0 = this.pick(t, tr % 2), g0 = h0 && this.pickNear(t, 1, [h0], h0); if (h0 && g0 && (!window.v221Hops || v221Hops(h0, g0) <= 6)) return { hc: h0, gc: g0 }; }   // V226: adalar gibi ulaşılamayan eşleşmeler elenir
      var h = this.pick(t, 0); if (!h) return { hc: null, gc: this.pick(t, 1) };
      return { hc: h, gc: this.pickNear(t, 1, [h], h) };
    },
    dist: dist, power: score,   // V226
    randomTier: function () { return Math.floor(Math.random() * 4); }
  };
})();
