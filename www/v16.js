/* V16: DENİZDEN SAVAŞ. Kara komşularına ek olarak, kıyıdan kıyıya deniz yoluyla erişilebilen en yakın ülkeler de hedef olur.
   - Deniz bağlantısı = iki ülkenin kıyı noktaları arası en kısa mesafe (SEAMAX) küçük VE bu iki nokta arasındaki büyük daire hattı
     üçüncü bir ülkenin karasından geçmiyor. Kuş uçuşu yakınlık tek başına yetmez.
   - Her ülke için en yakın KNN deniz komşusu tutulur (çift yönlü). Karayla çevrili (LLK) ülkeler deniz bağlantısı kuramaz.
   - Hiç komşusu olmayan adalar için tek seferlik genişletilmiş menzil (SEAISO, en çok 2 hedef) uygulanır; oyun kilitlenmesin diye.
   - Kara komşusu varsa etiket 'land' kalır (kara öncelikli). Mevcut ordu/zar/savaş hesapları DEĞİŞMEDİ. */
(function () {
  'use strict';
  var SEAMAX = 0.085,   // rad (~540 km) kıyı-kıyı azami mesafe
      SEAISO = 0.40,    // rad (~2550 km) yalnızca komşusuz adalar için
      KNN = 4, STEP = 0.012, ISO_N = 2, SL = null, REP = null;

  function cart(lo, la) { lo *= Math.PI / 180; la *= Math.PI / 180; return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]; }
  function coastPts(r) {
    if (r._cp) return r._cp;
    var g = r.f.geometry, ps = g.type == 'Polygon' ? [g.coordinates] : g.coordinates, out = [];
    ps.forEach(function (p) { var q = p[0], k = Math.max(1, Math.ceil(q.length / 400)); for (var i = 0; i < q.length; i += k) out.push(cart(q[i][0], q[i][1])); });
    return r._cp = out;
  }
  function closest(A, B) {
    var m = -2, ia = 0, ib = 0;
    for (var i = 0; i < A.length; i++) { var a = A[i]; for (var j = 0; j < B.length; j++) { var b = B[j], d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; if (d > m) { m = d; ia = i; ib = j; } } }
    return { d: Math.acos(Math.min(1, m)), a: A[ia], b: B[ib] };
  }
  function angC(a, b) { return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))); }
  function inCountry(c, lo, la) {
    for (var i = 0; i < c.pr.length; i++) {
      var q = c.pr[i], b = q.b;
      if (la < b[1] || la > b[3]) continue;
      for (var s = -360; s <= 360; s += 360) { var x = lo + s; if (x >= b[0] && x <= b[2] && pip(x, la, q.g)) return true; }
    }
    return false;
  }
  // a→b büyük daire hattı üçüncü bir ülkenin karasından geçiyor mu?
  function blocked(a, b, pa, pb, d) {
    var mid = [pa[0] + pb[0], pa[1] + pb[1], pa[2] + pb[2]], ml = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]) || 1;
    mid = [mid[0] / ml, mid[1] / ml, mid[2] / ml];
    var cand = R.filter(function (c) { return c !== a && c !== b && angC(c.cu, mid) - c.rad < d / 2 + 0.02; });
    if (!cand.length) return false;
    var n = Math.max(2, Math.ceil(d / STEP)), sd = Math.sin(d) || 1e-9;
    for (var i = 1; i < n; i++) {
      var t = i / n, k1 = Math.sin((1 - t) * d) / sd, k2 = Math.sin(t * d) / sd,
          x = k1 * pa[0] + k2 * pb[0], y = k1 * pa[1] + k2 * pb[1], z = k1 * pa[2] + k2 * pb[2],
          lo = Math.atan2(y, x) * 180 / Math.PI, la = Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI;
      for (var j = 0; j < cand.length; j++) if (inCountry(cand[j], lo, la)) return true;
    }
    return false;
  }
  function pairs(a, maxD) {
    var o = [];
    R.forEach(function (b) {
      if (b === a || LLK.indexOf(b.id) >= 0 || a.nb.indexOf(b.id) >= 0) return;
      if (angC(a.cu, b.cu) - a.rad - b.rad >= maxD) return;
      var c = closest(coastPts(a), coastPts(b)); if (c.d >= maxD) return;
      if (blocked(a, b, c.a, c.b, c.d)) return;
      o.push({ id: b.id, d: c.d });
    });
    return o.sort(function (x, y) { return x.d - y.d; });
  }
  function build() {
    var S = {}; REP = { links: 0, isolated: [], noSea: [] };
    function link(a, b, d) { (S[a] = S[a] || {})[b] = d; (S[b] = S[b] || {})[a] = d; }
    R.forEach(function (a) {
      if (LLK.indexOf(a.id) >= 0) return;
      pairs(a, SEAMAX).slice(0, KNN).forEach(function (p) { link(a.id, p.id, p.d); });
    });
    R.forEach(function (a) {          // komşusuz adalar
      if (a.nb.filter(function (n) { return n !== a.id; }).length || (S[a.id] && Object.keys(S[a.id]).length) || LLK.indexOf(a.id) >= 0) return;
      REP.isolated.push(a.id);
      var l = pairs(a, SEAISO).slice(0, ISO_N); if (!l.length) { l = pairs(a, 1.2).slice(0, 1); REP.far = (REP.far || []).concat(a.id); } if (!l.length) REP.noSea.push(a.id);
      l.forEach(function (p) { link(a.id, p.id, p.d); });
    });
    for (var k in S) REP.links += Object.keys(S[k]).length;
    REP.links /= 2; return S;
  }
  function sea() { if (!SL) { try { SL = build(); } catch (e) { SL = {}; if (window.console) console.error('V16 sea build', e); } } return SL; }

  // ---- hedef kuralı: kara komşuları + deniz bağlantıları (kendine / kendi toprağına saldırı yok) ----
  targets = function (p, ow) {
    var s = {}, S = sea();
    R.forEach(function (a) {
      if (ow[a.id] !== p) return;
      a.nb.forEach(function (n) { if (ow[n] !== p) s[n] = 'land'; });     // kara her zaman önce
      var l = S[a.id]; if (l) for (var n in l) if (ow[n] !== p && !s[n]) s[n] = 'sea';
    });
    return s;
  };
  if (window.WC) window.WC.targets = targets;

  // ---- savaş animasyonunda saldıran taraf: kara komşusu varsa onlar, yoksa deniz bağlantılı kendi ülkeleri ----
  var _bs = battleSides;
  battleSides = function (p, tg) {
    var a = M[tg].nb.filter(function (n) { return G.owner[n] === p; }); if (a.length) return a;
    var l = sea()[tg] || {}, b = Object.keys(l).filter(function (n) { return G.owner[n] === p; });
    return b.length ? b : _bs(p, tg);
  };
  // ---- kaybedilen savaşta toprak: kara komşusu yoksa deniz bağlantılı olan kaybedilir ----
  if (window.R5 && R5.pickLoss) {
    var _pl = R5.pickLoss;
    R5.pickLoss = function (l, tg, ow, nb, dist) {
      if ((nb[tg] || []).some(function (n) { return ow[n] === l; })) return _pl(l, tg, ow, nb, dist);
      var nb2 = {}; nb2[tg] = Object.keys(sea()[tg] || {}).filter(function (n) { return ow[n] === l; });
      return _pl(l, tg, ow, nb2, dist);
    };
  }
  // ---- haritada deniz hedeflerini kara hedeflerinden ayır (mavi ton) ----
  var _ov = overlay;
  overlay = function () { _ov(); try { ov.selectAll('path.hl.atk').classed('sea', function (o) { return !!TG && TG[o.id] == 'sea'; }); } catch (e) { } };

  // ---- savaş başlatma arayüzünde etiketleri ayır: 🏔 kara (kırmızı) / 🚢 deniz (mavi) ----
  function decorate() {
    try {
      var tl = t('landb'), ts = t('seab');
      Array.prototype.forEach.call(document.querySelectorAll('.tag.ok'), function (e) {
        if (e.className.indexOf('v16d') >= 0) return;
        var tx = e.textContent, sea = tx.indexOf('· ' + ts) >= 0, land = tx.indexOf('· ' + tl) >= 0;
        if (!sea && !land) return;
        e.className += ' v16d ' + (sea ? 'v16sea' : 'v16land');
        e.textContent = tx.replace('· ' + (sea ? ts : tl), '· ' + (sea ? '🚢 ' + ts : '🏔 ' + tl));
      });
    } catch (e) { }
  }
  var _pn = panel;
  panel = function () { _pn(); decorate(); };
  if (typeof details == 'function') { var _dt = details; details = function () { var r = _dt.apply(this, arguments); decorate(); return r; }; }

  // ---- mükerrer / geçersiz savaş engeli: hedef anlık hedef listesinde değilse veya savaş sürüyorsa saldırı başlamaz ----
  var _da = doAttack, DLOCK = false;
  doAttack = function () {
    try {
      if (!G || G.busy || G.ph != 'act' || BSH || (typeof isSolo == 'function' && isSolo())) return _da.apply(this, arguments);
      var tg = G.sel;
      if (DLOCK) return;                                   // aynı dokunuşun iki kez tetiklenmesi
      if (!tg || !M[tg] || !TG || !TG[tg]) { toast(t('nopts')); return; }   // geçersiz hedef
      DLOCK = true; setTimeout(function () { DLOCK = false; }, 500);
    } catch (e) { }
    return _da.apply(this, arguments);
  };

  window.WC = window.WC || {};
  window.WC.seaLinks = function () { return sea(); };
  window.WC.seaReport = function () { sea(); return REP; };
})();
