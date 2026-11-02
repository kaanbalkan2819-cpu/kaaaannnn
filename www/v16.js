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
      KNN = 4, STEP = 0.012, ISO_N = 2, SL = null, REP = null,
      BOX_RANGE = 0.20,  // V122: yalnızca büyük+güçlü komşularla çevrili kıyı ülkeleri için genişletilmiş deniz menzili (~1275 km)
      BOX_EXTRA = 6,
      RESC_MIN = 0.35,   // V124: en iyi kazanma şansı bunun altındaki ülkeler 'kazanamayan' sayılır
      RESC_WIN = 0.40,   // ... ek hedeflerde en az bu kazanma şansı aranır (en zayıf ülkeler için denk rakip ≈ %43)
      RESC_N = 3,        // ... en çok bu kadar ek hedef
      RESC_MAX = [0.55, 0.9, 1.3];   // ... menzil kademeleri (rad; ~3500 / 5700 / 8300 km): hedef bulunana kadar bir sonrakine geçilir     // ... ve normal KNN'e ek en çok bu kadar deniz hedefi

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
  /* V122: "büyük + güçlü" ülkeler = yüzölçümü (açısal yarıçap) VE temel güç toplamı en üst %25'te olanlar. */
  function giants() {
    var pw = function (id) { var b = (typeof BASE !== 'undefined' && BASE[id]) || null, t = 0; if (b) for (var i = 0; i < 5; i++) t += (+b[i] || 0); return t; };
    var rs = R.map(function (r) { return r.rad; }).sort(function (a, b) { return a - b; }),
        ps = R.map(function (r) { return pw(r.id); }).sort(function (a, b) { return a - b; }),
        qi = Math.floor(R.length * 0.75), rq = rs[qi], pq = ps[qi], out = {};
    if (!(pq > 0)) return out;   // güç verisi yoksa kural uygulanmaz
    R.forEach(function (r) { if (r.rad >= rq && pw(r.id) >= pq) out[r.id] = 1; });
    return out;
  }
  function build() {
    var S = {}; REP = { links: 0, isolated: [], noSea: [] };
    function link(a, b, d) { (S[a] = S[a] || {})[b] = d; (S[b] = S[b] || {})[a] = d; }
    R.forEach(function (a) {
      if (LLK.indexOf(a.id) >= 0) return;
      pairs(a, SEAMAX).slice(0, KNN).forEach(function (p) { link(a.id, p.id, p.d); });
    });
    var BIG = giants(); REP.boxed = [];
    R.forEach(function (a) {          // V122: tüm kara komşuları büyük+güçlü olan kıyı ülkeleri → daha çok deniz hedefi
      if (LLK.indexOf(a.id) >= 0) return;
      var nb = a.nb.filter(function (n) { return n !== a.id; });
      if (!nb.length || !nb.every(function (n) { return BIG[n]; })) return;
      REP.boxed.push(a.id);
      pairs(a, BOX_RANGE).slice(0, KNN + BOX_EXTRA).forEach(function (p) { link(a.id, p.id, p.d); });
    });
    R.forEach(function (a) {          // komşusuz adalar
      if (a.nb.filter(function (n) { return n !== a.id; }).length || (S[a.id] && Object.keys(S[a.id]).length) || LLK.indexOf(a.id) >= 0) return;
      REP.isolated.push(a.id);
      var l = pairs(a, SEAISO).slice(0, ISO_N); if (!l.length) { l = pairs(a, 1.2).slice(0, 1); REP.far = (REP.far || []).concat(a.id); } if (!l.length) REP.noSea.push(a.id);
      l.forEach(function (p) { link(a.id, p.id, p.d); });
    });
    /* V124: "KAZANAMAYAN ÜLKE" kurtarması. Mevcut hedefleri (kara + deniz) içinde en iyi kazanma şansı RESC_MIN altında kalan ülkeler,
       kazanma şansı en az RESC_WIN olan en yakın ülkelerden RESC_N tanesini ek hedef olarak alır (çift yönlü, 'sea' etiketi = 2 hamle).
       Şans, BASE değerleri ve zar dağılımı üzerinden SABİT (rastgelesiz) hesaplanır: kayıtlı oyunlarda bağlantılar her açılışta aynı çıkar. */
    var DD = (function () { var m = {}; function add(v, p) { m[v] = (m[v] || 0) + p; }
      for (var a = 1; a <= 6; a++) { if (a < 6) { add(a, 1 / 6); continue; }
        for (var b = 1; b <= 6; b++) { if (b < 6) { add(6 + b, 1 / 36); continue; } for (var c = 1; c <= 6; c++) add(12 + c, 1 / 216); } }
      return Object.keys(m).map(function (k) { return [+k, m[k]]; }); })();
    function winP(A, D) {
      var tot = 0, step = (typeof DIE_STEP == 'number' ? DIE_STEP : .15);
      for (var i = 0; i < DD.length; i++) for (var j = 0; j < DD.length; j++) {
        var ra = DD[i][0], rd = DD[j][0], m = 1 + Math.abs(ra - rd) * step, mA = ra > rd ? m : 1, mD = rd > ra ? m : 1, w = 0;
        for (var k = 0; k < 5; k++) if (A[k] * mA > D[k] * mD) w++;
        if (w >= 3) tot += DD[i][1] * DD[j][1];
      }
      return tot;
    }
    REP.rescued = []; REP.winP = winP;
    if (typeof BASE !== 'undefined') R.forEach(function (a) {
      var A = BASE[a.id]; if (!A) return;
      var cur = {}; a.nb.forEach(function (n) { cur[n] = 1; }); for (var q in (S[a.id] || {})) cur[q] = 1;
      var best = 0, any = false; for (var n in cur) if (BASE[n]) { any = true; best = Math.max(best, winP(A, BASE[n])); }
      if (any && best >= RESC_MIN) return;
      var cand = [];
      R.forEach(function (b) { if (b === a || cur[b.id] || !BASE[b.id]) return; var w = winP(A, BASE[b.id]); if (w < RESC_WIN) return;
        var cd = angC(a.cu, b.cu) - a.rad - b.rad; if (cd < RESC_MAX[RESC_MAX.length - 1]) cand.push({ id: b.id, d: Math.max(0.01, cd), w: w }); });
      cand.sort(function (x, y) { return x.d - y.d; });
      var pick = []; for (var ri = 0; ri < RESC_MAX.length && !pick.length; ri++) pick = cand.filter(function (c) { return c.d < RESC_MAX[ri]; }).slice(0, RESC_N);   // menzil kademeli genişler
      if (!pick.length) return;
      REP.rescued.push(a.id + '→' + pick.map(function (p) { return p.id; }).join(','));
      pick.forEach(function (p) { link(a.id, p.id, p.d); });
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
