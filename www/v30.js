/* V30 — 3B küre görünümü (wc3d_globe_prototype entegrasyonu).
   2B harita aynen kalır; sağ üstteki "3B" düğmesi küre görünümünü açar/kapar.
   Küre oyunun kendi verisini kullanır: R (ülke geometrisi), ownerOf/col (renk), TG (saldırılabilir), G.sel (seçili), pickC (seçim).
   Oyun kuralları değişmez. Küre dosyaları (globe/) ilk açılışta yüklenir. */
(function () {
  'use strict';
  var DEFAULT_3D = true;                       // true yaparsan oyun küre görünümüyle açılır
  var DEG = Math.PI / 180, ON = false, READY = false, LOADING = false, BAD = false;
  var C = [], cMap = {}, THREE, TEX;
  var WC199_TILT = -14;   /* V199: görünüm eğimi (derece); 0 = eski düz görünüm */
  var stage, renderer, scene, camera, globe, earth, cloudM, atmM, rafId = 0, last = 0, dirtyQ = 0, needPaint = true, lastSig = '';
  var LOWQ = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches), OW = LOWQ ? 2048 : 3072, OH = LOWQ ? 1024 : 1536, LS = OW / 2048, ZMIN3 = 1.9, LW = 1536, LH = 768, NW = 512, NH = 256, SCALE = 0.07;
  var ovC, ov, liftC, lift, reliefC, nsmall, nsx, nC, nx, nImg, topoH, ovTex, liftTex, normTex;
  var PR_IDLE_PHONE = 1.25, PR_IDLE_MS = 1500;   /* V205: 1.75 -> 1.25 (özellik kapalı): durunca/hareket edince 1.75<->1.25 geçişi WebGL tuvalini yeniden ayırıyordu (SALDIRI'ya basınca ~0,4 sn donma, ülke seçiminde/panel kapanışında takılma). Eski değer: 1.75 */
  var _stW = 0, _stH = 0;   /* V205: sahne boyutu önbelleği (stepCamera her karede clientWidth/Height okuyup zorunlu düzen hesabı yapıyordu) */
     /* V183: telefonda durunca netleştirme — PR_IDLE_PHONE: durunca çözünürlük tavanı (1.25 = özellik kapalı); PR_IDLE_MS: tam durgunluktan sonra kaç ms beklenip geçilsin */
  var introStart = 0, introDur = 3000, introShown = false, introFrom = 3.4, introNext = false, vo = 0, vel = { x: 0, y: 0 }, focusQ = null, camZ = 3.4, zoomT = 3.4, ptrs = {}, down = null, pinch0 = 0, pinchA = null, pinchM = { x: 0, y: 0 };
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'tr') ? tr : en; }
  function $$(i) { return document.getElementById(i); }
  function PF(l, t0) { var d = performance.now() - t0; if (d > 30 && window.WCPERF) window.WCPERF('  ' + l + ' ' + Math.round(d) + 'ms'); }   /* V145: ölçüm (v143.js açıkken) */

  /* ---------- Ülke verisi: oyunun R listesinden ---------- */
  function buildC() {
    if (C.length || !window.R || !R.length) return;
    R.forEach(function (r) {
      var g = r.f && r.f.geometry; if (!g) return;
      var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates, bb = null, mx = 0;
      (r.parts || []).forEach(function (p) { if (p.a > mx) mx = p.a; });
      polys.forEach(function (p, k) {
        var a = r.parts && r.parts[k] ? r.parts[k].a : 1; if (r.parts && a < mx * .2) return;
        p[0].forEach(function (q) { if (!bb) bb = [q[0], q[1], q[0], q[1]]; if (q[0] < bb[0]) bb[0] = q[0]; if (q[1] < bb[1]) bb[1] = q[1]; if (q[0] > bb[2]) bb[2] = q[0]; if (q[1] > bb[3]) bb[3] = q[1]; });
      });
      var all = [180, 90, -180, -90];
      polys.forEach(function (p) { p[0].forEach(function (q) { if (q[0] < all[0]) all[0] = q[0]; if (q[1] < all[1]) all[1] = q[1]; if (q[0] > all[2]) all[2] = q[0]; if (q[1] > all[3]) all[3] = q[1]; }); });
      var c = { id: r.id, polys: polys, bb: bb || all, all: all, h: 0, t: 0 }; C.push(c); cMap[r.id] = c;
    });
  }
  function inRing(r, x, y) { var ins = false; for (var a = 0, b = r.length - 1; a < r.length; b = a++) { var xi = r[a][0], yi = r[a][1], xj = r[b][0], yj = r[b][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
  /* V212: countryAt hızlandırma. Savaş sahnesi kurulurken (birlik/gemi yerleşimi) yüzlerce kez çağrılıyor ve her seferinde 197 ülkeyi tarıyordu.
     10°x10° ızgara: nokta yalnızca kendi hücresindeki aday ülkelerle (eski sırayla) denenir; çok parçalı ülkelerde parçanın kutusu dışındaysa
     halka testi atlanır. Sonuç eskisiyle birebir aynı. */
  var GRID = null, GC = 10;
  function gridBuild() {
    GRID = {}; for (var k = 0; k < C.length; k++) { var b = C[k].all, x0 = Math.floor((b[0] + 180) / GC), x1 = Math.floor((b[2] + 180) / GC), y0 = Math.floor((b[1] + 90) / GC), y1 = Math.floor((b[3] + 90) / GC);
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) (GRID[x + ',' + y] = GRID[x + ',' + y] || []).push(k); }
    GRID.__n = C.length;
  }
  function partBB(c) {
    if (c._pb) return c._pb; c._pb = c.polys.map(function (rings) { var o = rings[0] || [], a = 1e9, b = 1e9, d = -1e9, e = -1e9; for (var i = 0; i < o.length; i++) { var q = o[i]; if (q[0] < a) a = q[0]; if (q[0] > d) d = q[0]; if (q[1] < b) b = q[1]; if (q[1] > e) e = q[1]; } return [a, b, d, e]; }); return c._pb;
  }
  function countryAt(lon, lat) {
    if (!GRID || GRID.__n !== C.length) gridBuild();
    var cand = GRID[Math.floor((lon + 180) / GC) + ',' + Math.floor((lat + 90) / GC)]; if (!cand) return null;
    for (var j = 0; j < cand.length; j++) {
      var c = C[cand[j]], b = c.all; if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
      var pb = partBB(c);
      for (var p = 0; p < c.polys.length; p++) { var q = pb[p]; if (lon < q[0] || lon > q[2] || lat < q[1] || lat > q[3]) continue; var rings = c.polys[p], n = 0; for (var r = 0; r < rings.length; r++) if (inRing(rings[r], lon, lat)) n++; if (n % 2 === 1) return c; }
    }
    return null;
  }

  /* ---------- Oyun durumu -> küre ---------- */
  function sig() { try { return JSON.stringify([G && G.sel, Object.keys(TG || {}).join(','), G && G.cur, typeof BT !== 'undefined' && BT ? [BT.a, BT.d] : 0, typeof FLASH !== 'undefined' ? FLASH : 0, G && G.owner, G && G.pl, G && G.plCol]); } catch (e) { return Math.random() + ''; } }
  function recompute() {
    C.forEach(function (c) {
      var t = 0;
      if (G) { if (G.sel === c.id) t = 1; else if (TG && TG[c.id]) t = .45;  }
      c.t = t;
    });
  }
  function trace(ctx, c, W, H) {
    /* Tarih değişim çizgisini (±180°) aşan halkalar: boylamlar açılır, 3 kopya çizilir; kutbu saran halka kutuptan kapatılır.
       (Eski kod ±180 atlamasını düz çizgiyle birleştirip kutup çevresinde disk/halka çiziyordu.) */
    c.polys.forEach(function (rings) {
      rings.forEach(function (r) {
        var n = r.length; if (n < 2) return;
        var xs = new Array(n), ys = new Array(n), off = 0, k, prev = r[0][0];
        for (k = 0; k < n; k++) {
          var lo = r[k][0], d = lo - prev; if (d > 180) off -= 360; else if (d < -180) off += 360; prev = lo;
          xs[k] = (lo + off + 180) / 360 * W; ys[k] = (90 - r[k][1]) / 180 * H;
        }
        var mn = 1e9, mx = -1e9; for (k = 0; k < n; k++) { if (xs[k] < mn) mn = xs[k]; if (xs[k] > mx) mx = xs[k]; }
        var wind = Math.abs(xs[n - 1] - xs[0]) > W * 0.5, pole = 0;
        if (wind) { var sm = 0; for (k = 0; k < n; k++) sm += r[k][1]; pole = sm / n >= 0 ? 0 : H; }
        for (var sh = -2; sh <= 2; sh++) {
          var dx = sh * W; if (mx + dx < 0 || mn + dx > W) continue;
          var px = 0, py = 0; for (k = 0; k < n; k++) { var qx = xs[k] + dx, qy = ys[k]; if (k) { if (k < n - 1 && Math.abs(qx - px) < 0.35 && Math.abs(qy - py) < 0.35) continue; ctx.lineTo(qx, qy); } else ctx.moveTo(qx, qy); px = qx; py = qy; }   /* V143: 0,35 px'ten yakın noktalar atlanır */
          if (wind) { ctx.lineTo(xs[n - 1] + dx, pole); ctx.lineTo(xs[0] + dx, pole); }
          ctx.closePath();
        }
      });
    });
  }
  /* V211: BİRLEŞİK SINIRLAR (3B). Fetihte / yenilgide toprak el değiştirince yeni toprakla sahibinin kendi toprağı arasındaki iç sınır çizilmez.
     2B haritadaki V14 ile aynı kural (topojson.mesh): yalnızca sahipleri FARKLI komşular arasındaki sınırlar + kıyılar çizilir.
     Örn. yapay zekâ savaşında saldıran yenilip savunana toprak kaybederse, o toprak savunanın toprağıyla tek parça görünür.
     Oyun durumu değişmez; yalnızca çizim. topojson/dünya verisi yoksa eski ülke ülke çizime döner. GERİ ALMAK İÇİN: MESH_ON = false. */
  var MESH_ON = true, meshL = null, meshK = null;
  function meshLines() {
    if (!MESH_ON || !window.topojson || !window.Datamap || !Datamap.prototype.worldTopo) return null;
    var key; try { var a = []; for (var i = 0; i < C.length; i++) a.push(ownerOf(C[i].id)); key = a.join(','); } catch (e) { return null; }
    if (meshL && key === meshK) return meshL;
    try {
      var topo = Datamap.prototype.worldTopo, inM = function (id) { return typeof M === 'undefined' ? !!cMap[id] : !!M[id]; };
      var ms = topojson.mesh(topo, topo.objects.world, function (a, b) {
        if (a === b) return inM(a.id);
        var am = inM(a.id), bm = inM(b.id); if (!am && !bm) return false;
        var x = am ? ownerOf(a.id) : '~' + a.id, y = bm ? ownerOf(b.id) : '~' + b.id; return x !== y;
      });
      var out = [];
      (ms && ms.coordinates || []).forEach(function (ln) {
        var n = ln.length; if (n < 2) return;
        var xs = new Array(n), ys = new Array(n), off = 0, prev = ln[0][0], mn = 1e9, mx = -1e9, y0 = 1e9, y1 = -1e9, k;
        for (k = 0; k < n; k++) { var lo = ln[k][0], d = lo - prev; if (d > 180) off -= 360; else if (d < -180) off += 360; prev = lo; xs[k] = (lo + off + 180) / 360 * OW; ys[k] = (90 - ln[k][1]) / 180 * OH; if (xs[k] < mn) mn = xs[k]; if (xs[k] > mx) mx = xs[k]; if (ys[k] < y0) y0 = ys[k]; if (ys[k] > y1) y1 = ys[k]; }
        out.push({ x: xs, y: ys, x0: mn, x1: mx, y0: y0, y1: y1 });
      });
      meshL = out; meshK = key; return out;
    } catch (e) { return null; }
  }
  function strokeMesh(ctx, L, R) {   /* R verilirse yalnızca o dikdörtgene değen çizgiler */
    var P = 5 * LS + 2;
    for (var i = 0; i < L.length; i++) {
      var l = L[i], n = l.x.length;
      for (var sh = -1; sh <= 1; sh++) {
        var dx = sh * OW; if (l.x1 + dx < 0 || l.x0 + dx > OW) continue;
        if (R && (l.x1 + dx + P < R.x || l.x0 + dx - P > R.x + R.w || l.y1 + P < R.y || l.y0 - P > R.y + R.h)) continue;
        ctx.beginPath(); var px = 0, py = 0;
        for (var k = 0; k < n; k++) { var qx = l.x[k] + dx, qy = l.y[k]; if (k) { if (k < n - 1 && Math.abs(qx - px) < 0.35 && Math.abs(qy - py) < 0.35) continue; ctx.lineTo(qx, qy); } else ctx.moveTo(qx, qy); px = qx; py = qy; }
        ctx.stroke();
      }
    }
  }
  var baseC, base, baseSig = null;
  function ownSig() { try { var a = [G.pl || '', G.plCol || '']; for (var k in G.owner) a.push(ownerOf(k)); if (window.WCD && WCD.sig) a.push(WCD.sig()); return a.join('|'); } catch (e) { return Math.random() + ''; } }
  function ownCol(c) {
    var col = 'rgba(120,130,150,.18)';
    if (G) { try {
      var o = ownerOf(c.id), rt = null;
      try { if (G.v5 === 1 && G.pl) rt = G.pl; else if (G.P && G.P[0] && G.P[0].start) rt = G.P[0].start; else if (G.act && G.mode == 1) rt = G.act; } catch (e) { }
      if (rt && (o === rt || (typeof o === 'number' && G.P && G.P[o] && G.P[o].start === rt))) col = (G.v5 === 1 && G.plCol) ? G.plCol : window.col(rt);
      else col = window.col(o);
    } catch (e) { } }
    return col;
  }
  function style(c) {
    var bt = (typeof BT !== 'undefined' && BT) ? BT : null, fl = (typeof FLASH !== 'undefined') ? FLASH : null;
    if (G && G.sel === c.id) return { col: 'hsl(52,100%,74%)', a: .78 };
    if (bt && bt.a && bt.a.indexOf(c.id) >= 0) return { col: 'hsl(215,90%,58%)', a: .62 };
    if (bt && bt.d === c.id) return { col: 'hsl(2,85%,55%)', a: .62 };
    if (fl && fl === c.id) return { col: 'hsl(130,70%,50%)', a: .62 };
    /* v40: saldırılabilir ülkeler sarı boyanmaz; sadece yükselir (c.t = .45). Seçilince yukarıdaki G.sel sarısı geçerli. */
    return null;
  }
  /* V143: taban kaplaması (197 ülke dolgu + çizgi) tek karede 300-500 ms donma yapıyordu; artık kare başına ~9 ms'lik dilimlerle çizilir. */
  var baseJob = null;
  function* baseGen() {
    if (!baseC) { baseC = mk(OW, OH); base = baseC.getContext('2d'); }
    baseValid = false; ovValid = false; ovDirty = null; var nb = {};   /* V176: tam yeniden çizim başladı; kısmi güncelleme tamamlanana kadar kapalı */
    base.clearRect(0, 0, OW, OH); var i, c, cl, ML = meshLines(); yield;
    if (ML) {   /* V211: dolgular tam opak + aynı renkte ince kontur (aynı sahibin ülkeleri arasında dikiş çizgisi kalmasın), sonra katman topluca %50'ye indirilir (eski globalAlpha .5 ile aynı sonuç) */
      base.globalAlpha = 1; base.lineJoin = 'round'; base.lineWidth = 1.1 * LS;
      for (i = 0; i < C.length; i++) { c = C[i]; base.beginPath(); trace(base, c, OW, OH); cl = ownCol(c); nb[c.id] = cl; base.fillStyle = cl; base.fill('evenodd'); base.strokeStyle = cl; base.stroke(); yield; }
      base.globalCompositeOperation = 'destination-in'; base.fillStyle = 'rgba(0,0,0,.5)'; base.fillRect(0, 0, OW, OH); base.globalCompositeOperation = 'source-over';
      base.lineWidth = 1.4 * LS; base.strokeStyle = 'rgba(255,255,255,.38)'; strokeMesh(base, ML, null); yield;
    } else {
    base.globalAlpha = .5;
    for (i = 0; i < C.length; i++) { c = C[i]; base.beginPath(); trace(base, c, OW, OH); cl = ownCol(c); nb[c.id] = cl; base.fillStyle = cl; base.fill('evenodd'); yield; }
    base.globalAlpha = 1; base.lineWidth = 1.4 * LS; base.lineJoin = 'round'; base.strokeStyle = 'rgba(255,255,255,.38)';
    for (i = 0; i < C.length; i++) { base.beginPath(); trace(base, C[i], OW, OH); base.stroke(); yield; }
    }
    /* V81: çok küçük ülkeler uzaktan görünmüyordu; merkezlerine ince bir halka çizilir */
    base.lineWidth = 1.2 * LS; base.strokeStyle = 'rgba(255,230,160,.75)';
    C.forEach(function (c) {
      var b = c.bb, sp = Math.max(b[2] - b[0], b[3] - b[1]); if (sp >= 2.2) return;
      var x = ((b[0] + b[2]) / 2 + 180) / 360 * OW, y = (90 - (b[1] + b[3]) / 2) / 180 * OH, rad = Math.max(4 * LS, sp / 360 * OW * .9 + 3 * LS);
      base.beginPath(); base.arc(x, y, rad, 0, 6.2832); base.stroke();
    });
    basePrev = nb; baseValid = true;   /* V176 */
  }
  var hvLF = 0, hvStep = -1, hvPaint = false;   /* V178: kare sayacı / bu karede taban dilimi ve kaplama boyaması yapıldı mı */
  /* V215: ÖN BOYAMA. Harita kaplaması (ülke renkleri + birleşik sınırlar) eskiden küre ekrana gelince, yeni oyunun yaklaşmasının ilk
     karelerinde boyanıyordu (yavaş cihazda 100-250 ms'lik kareler). Artık küre kurulunca, görünmeden önce (menü/perde altında) dilim dilim boyanır.
     Küre zaten açıksa (ON) normal döngü yapar; burada bir şey yapılmaz. */
  function prePaint215() {
    try {
      if (ON || !READY || !G) { if (!ON && READY && !G) setTimeout(prePaint215, 400); return; }
      if (!baseC || baseJob || ownSig() !== baseSig) { if (!baseJob) paintOverlay(); else stepBase(); setTimeout(prePaint215, 20); return; }
      if (needPaint) { needPaint = false; paintOverlay(); try { C.forEach(function (c) { if (EX[c.id]) colorEx(c); }); } catch (e) { } }
    } catch (e) { }
  }
  function stepBase() {
    if (!baseJob) return; hvStep = hvLF; var t0 = performance.now(), r;
    do { r = baseJob.next(); } while (!r.done && performance.now() - t0 < 9);
    if (r.done) { baseJob = null; try { C.forEach(colorEx); } catch (e) { } needPaint = true; forceR = 3; }
  }
  function pathOf(c) { if (typeof Path2D !== 'function') return null; if (!c._p2 || c._p2w !== OW) { try { var p = new Path2D(); trace(p, c, OW, OH); c._p2 = p; c._p2w = OW; } catch (e) { c._p2 = null; return null; } } return c._p2; }   /* V150: yol bir kez çıkarılır (Rusya gibi çok noktalı ülkede seçim başına 3x JS döngüsü yoktu) */
  /* V176: KISMİ KAPLAMA GÜNCELLEMESİ (yalnızca telefon). Seçim / savaş hedefi / tek-iki ülkenin sahiplik değişimi artık 2048x1024 kaplamanın TAMAMINI silip
     ~8 MB dokuyu GPU'ya yüklemez: yalnızca değişen ülkelerin kutusu yeniden çizilir ve yalnızca o dikdörtgen copyTextureToTexture ile yüklenir.
     Tarih değişim çizgisini aşan ülke (Rusya, ABD, Antarktika...), müttefik şeridi, >8 değişen ülke ya da büyük alan -> eski tam yol. Hata olursa da eski tam yol. */
  var baseValid = false, basePrev = {}, ovValid = false, ovPrev = {}, ovDirty = null, ovAlly = false, ovPC = null, ovSrc = null;
  /* V206: İLK ÜLKE SEÇİMİ KASMASI — ilk seçimde tüm ülkelerin Path2D yolu ve sınır kutusu ilk kez hesaplanıyordu (177 ülke, tek karede). Küre hazır olunca boş zamanda dilim dilim önceden hesaplanır. Geri almak için warm207 çağrısını silin. */
  function warm207() {
    var i = 0, idle = window.requestIdleCallback ? function (f) { requestIdleCallback(f, { timeout: 1200 }); } : function (f) { setTimeout(f, 60); };
    (function step(dl) {
      var t0 = performance.now();
      while (i < C.length && performance.now() - t0 < 4 && (!dl || !dl.timeRemaining || dl.timeRemaining() > 2)) { var c = C[i++]; try { cext(c); pathOf(c); } catch (e) { } }
      if (i < C.length) idle(step);
    })();
  }
  function cext(c) {
    if (c._ox) return c._ox; var a = 1e9, b = 1e9, d = -1e9, e = -1e9;
    c.polys.forEach(function (rg) { rg[0].forEach(function (q) { if (q[0] < a) a = q[0]; if (q[0] > d) d = q[0]; if (q[1] < b) b = q[1]; if (q[1] > e) e = q[1]; }); });
    return c._ox = { x0: (a + 180) / 360 * OW, x1: (d + 180) / 360 * OW, y0: (90 - e) / 180 * OH, y1: (90 - b) / 180 * OH, wrap: (d - a) > 180 };
  }
  function rectOf(list, R) {   /* ülke listesi (+ varsa önceki kirli dikdörtgen) -> birleşik, tam sayıya yuvarlanmış dikdörtgen; olmazsa null */
    var PAD = 5 * LS + 2, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i, e;
    for (i = 0; i < list.length; i++) { e = cext(list[i]); if (e.wrap) return null; if (e.x0 < x0) x0 = e.x0; if (e.y0 < y0) y0 = e.y0; if (e.x1 > x1) x1 = e.x1; if (e.y1 > y1) y1 = e.y1; }
    if (R) { if (R.x < x0 + PAD) x0 = Math.min(x0, R.x + PAD); if (R.y < y0 + PAD) y0 = Math.min(y0, R.y + PAD); x1 = Math.max(x1, R.x + R.w - PAD); y1 = Math.max(y1, R.y + R.h - PAD); }
    if (x0 > x1 || y0 > y1) return null;
    x0 = Math.max(0, Math.floor(x0 - PAD)); y0 = Math.max(0, Math.floor(y0 - PAD)); x1 = Math.min(OW, Math.ceil(x1 + PAD)); y1 = Math.min(OH, Math.ceil(y1 + PAD));
    var r = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; if (r.w < 2 || r.h < 2 || r.w * r.h > OW * OH * 0.4) return null; return r;
  }
  function hits(c, r) { var e = cext(c), P = 5 * LS + 2; if (e.wrap) return true; return !(e.x1 + P < r.x || e.x0 - P > r.x + r.w || e.y1 + P < r.y || e.y0 - P > r.y + r.h); }
  function baseQuick() {   /* sahiplik değişti: yalnızca rengi değişen ülkelerin kutusunu taban katmanda yeniden çiz; true = tam yeniden üretim gerekmez */
    if (!LOWQ || !baseValid || !baseC || !ovValid) return false;
    try {
      var cur = {}, ch = [], i, c, k; for (i = 0; i < C.length; i++) { c = C[i]; k = ownCol(c); cur[c.id] = k; if (basePrev[c.id] !== k) ch.push(c); }
      if (!ch.length) { basePrev = cur; return true; }
      if (ch.length > 8) return false;
      var R = rectOf(ch, null); if (!R) return false;
      base.save(); base.beginPath(); base.rect(R.x, R.y, R.w, R.h); base.clip(); base.clearRect(R.x, R.y, R.w, R.h);
      var ML = meshLines();
      if (ML) {   /* V211: birleşik sınırlar (baseGen ile aynı çizim) */
        base.globalAlpha = 1; base.lineJoin = 'round'; base.lineWidth = 1.1 * LS;
        for (i = 0; i < C.length; i++) { c = C[i]; if (!hits(c, R)) continue; base.beginPath(); trace(base, c, OW, OH); base.fillStyle = cur[c.id]; base.fill('evenodd'); base.strokeStyle = cur[c.id]; base.stroke(); }
        base.globalCompositeOperation = 'destination-in'; base.fillStyle = 'rgba(0,0,0,.5)'; base.fillRect(R.x, R.y, R.w, R.h); base.globalCompositeOperation = 'source-over';
        base.lineWidth = 1.4 * LS; base.strokeStyle = 'rgba(255,255,255,.38)'; strokeMesh(base, ML, R);
      } else {
      base.globalAlpha = .5; for (i = 0; i < C.length; i++) { c = C[i]; if (!hits(c, R)) continue; base.beginPath(); trace(base, c, OW, OH); base.fillStyle = cur[c.id]; base.fill('evenodd'); }
      base.globalAlpha = 1; base.lineWidth = 1.4 * LS; base.lineJoin = 'round'; base.strokeStyle = 'rgba(255,255,255,.38)';
      for (i = 0; i < C.length; i++) { c = C[i]; if (!hits(c, R)) continue; base.beginPath(); trace(base, c, OW, OH); base.stroke(); }
      }
      base.lineWidth = 1.2 * LS; base.strokeStyle = 'rgba(255,230,160,.75)';
      C.forEach(function (c) {
        var b = c.bb, sp = Math.max(b[2] - b[0], b[3] - b[1]); if (sp >= 2.2 || !hits(c, R)) return;
        var x = ((b[0] + b[2]) / 2 + 180) / 360 * OW, y = (90 - (b[1] + b[3]) / 2) / 180 * OH, rad = Math.max(4 * LS, sp / 360 * OW * .9 + 3 * LS);
        base.beginPath(); base.arc(x, y, rad, 0, 6.2832); base.stroke();
      });
      base.restore(); basePrev = cur;
      ovDirty = ovDirty ? { x: Math.min(ovDirty.x, R.x), y: Math.min(ovDirty.y, R.y), w: Math.max(ovDirty.x + ovDirty.w, R.x + R.w) - Math.min(ovDirty.x, R.x), h: Math.max(ovDirty.y + ovDirty.h, R.y + R.h) - Math.min(ovDirty.y, R.y) } : R;
      return true;
    } catch (e) { try { base.restore(); } catch (x) { } baseValid = false; return false; }
  }
  function styleKey(c) { var st = style(c); return st ? st.col + '|' + st.a + '|' + ((G && G.sel === c.id) ? 1 : 0) : ''; }
  function drawStyled(c, st) {   /* seçili / savaş hedefi / flaş ülkesinin dolgusu + çizgisi (tam yol ile aynı çizim) */
    var P = pathOf(c);
    ov.save(); if (!P) { ov.beginPath(); trace(ov, c, OW, OH); } ov.globalCompositeOperation = 'destination-out'; ov.globalAlpha = 1; ov.fillStyle = '#000'; if (P) ov.fill(P, 'evenodd'); else ov.fill('evenodd');
    ov.globalCompositeOperation = 'source-over'; ov.globalAlpha = st.a; ov.fillStyle = st.col; if (P) ov.fill(P, 'evenodd'); else ov.fill('evenodd'); ov.restore();
    ov.globalAlpha = 1; ov.lineWidth = 1.6 * LS; ov.strokeStyle = (G && G.sel === c.id) ? 'rgba(255,240,180,.95)' : 'rgba(255,255,255,.5)'; if (P) ov.stroke(P); else { ov.beginPath(); trace(ov, c, OW, OH); ov.stroke(); }
  }
  function ovQuick() {
    if (!LOWQ || !ovValid || ovAlly || !renderer || !ovTex || ovTex.generateMipmaps || !G || !THREE) return false;
    try {
      if (window.WCAllyTarget && WCAllyTarget()) return false;
      var cur = {}, ch = [], i, c, k; for (i = 0; i < C.length; i++) { c = C[i]; k = styleKey(c); cur[c.id] = k; if ((ovPrev[c.id] || '') !== k) ch.push(c); }
      var D = ovDirty; if (!ch.length && !D) return true;
      if (ch.length > 8) return false;
      var R = rectOf(ch, D); if (!R) return false;
      ov.save(); ov.beginPath(); ov.rect(R.x, R.y, R.w, R.h); ov.clip(); ov.globalAlpha = 1; ov.globalCompositeOperation = 'source-over';
      ov.clearRect(R.x, R.y, R.w, R.h); ov.drawImage(baseC, R.x, R.y, R.w, R.h, R.x, R.y, R.w, R.h);
      for (i = 0; i < C.length; i++) { c = C[i]; if (!cur[c.id] || !hits(c, R)) continue; var st = style(c); if (st) drawStyled(c, st); }
      ov.restore();
      if (!ovPC) ovPC = document.createElement('canvas'); ovPC.width = R.w; ovPC.height = R.h;
      ovPC.getContext('2d').drawImage(ovC, R.x, R.y, R.w, R.h, 0, 0, R.w, R.h);
      if (!ovSrc) ovSrc = new THREE.Texture(ovPC); ovSrc.image = ovPC;
      renderer.copyTextureToTexture(new THREE.Vector2(R.x, OH - R.y - R.h), ovSrc, ovTex);   /* doku dikey çevrik (flipY): satır konumu alttan sayılır */
      ovPrev = cur; ovDirty = null; forceR = 3; return true;
    } catch (e) { try { ov.restore(); } catch (x) { } ovValid = false; ovDirty = null; return false; }
  }
  function paintOverlay() {
    var sg = ownSig(); if (!baseC || sg !== baseSig) { baseSig = sg; if (!baseQuick()) { baseJob = baseGen(); stepBase(); } }
    if (baseJob) { needPaint = true; return; }
    if (ovQuick()) return;   /* V176 */   /* V143: taban hazır olana kadar kaplama çizilmez (kare başına dilim ilerler) */   /* V50: 3B blok renkleri de sahiplik değişince yenilenir */
    ov.globalAlpha = 1; ov.clearRect(0, 0, OW, OH); ov.drawImage(baseC, 0, 0);
    C.forEach(function (c) {
      var st = style(c); if (!st) return; var P = pathOf(c);   /* V150 */
      ov.save(); if (!P) { ov.beginPath(); trace(ov, c, OW, OH); } ov.globalCompositeOperation = 'destination-out'; ov.globalAlpha = 1; ov.fillStyle = '#000'; if (P) ov.fill(P, 'evenodd'); else ov.fill('evenodd');
      ov.globalCompositeOperation = 'source-over'; ov.globalAlpha = st.a; ov.fillStyle = st.col; if (P) ov.fill(P, 'evenodd'); else ov.fill('evenodd'); ov.restore();
      ov.globalAlpha = 1; ov.lineWidth = 1.6 * LS; ov.strokeStyle = (G && G.sel === c.id) ? 'rgba(255,240,180,.95)' : 'rgba(255,255,255,.5)'; if (P) ov.stroke(P); else { ov.beginPath(); trace(ov, c, OW, OH); ov.stroke(); }
    });
    try { snapAlly(); allyLines(0); } catch (e) { }   /* V109: seçili ülkenin müttefiklerinin üzerinden akan kırmızı şerit */
    ovTex.needsUpdate = true;
    try { var _pv = {}; for (var _i = 0; _i < C.length; _i++) _pv[C[_i].id] = styleKey(C[_i]); ovPrev = _pv; ovAlly = !!snapOk; ovDirty = null; ovValid = true; } catch (e) { ovValid = false; }   /* V176 */
  }
  var snapC = null, snapOk = false, aPh = 0;
  function snapAlly() {
    if (!(window.WCAllyTarget && WCAllyTarget())) { snapOk = false; return; }
    if (!snapC) { snapC = document.createElement('canvas'); }
    if (snapC.width !== OW || snapC.height !== OH) { snapC.width = OW; snapC.height = OH; }
    var x = snapC.getContext('2d'); x.clearRect(0, 0, OW, OH); x.drawImage(ovC, 0, 0); snapOk = true;
  }
  setInterval(function () {   /* V109: yalnızca müttefik şeridi yeniden çizilir (tüm ülkeler değil) */
    try {
      if (!ov || !snapOk || document.hidden || document.body.classList.contains('wcm-on')) return;
      if (LOWQ) return;   /* V146: telefonda müttefik şeridi hareket etmez (sabit kalır). Rusya gibi büyük ülkede her 140 ms'de kaplama yeniden çiziliyor + 8 MB doku yükleniyordu */
      if (!(window.WCAllyTarget && WCAllyTarget())) return;
      aPh = (aPh + 2.5 * LS) % 1e6;   /* V133: tick 90->140 ms; adım orantılı büyütüldü, şerit hızı aynı */
      ov.globalAlpha = 1; ov.clearRect(0, 0, OW, OH); ov.drawImage(snapC, 0, 0); allyLines(aPh);
      ovTex.needsUpdate = true; forceR = 3;
    } catch (e) { }
  }, 140);
  function allyLines(ph) {
    var T = window.WCAllyTarget && WCAllyTarget(); if (!T) return;
    var step = 16 * LS, i, sel = null, cen = {};
    C.forEach(function (c) { var o = G.owner[c.id]; if (c.id === G.sel) sel = c; if (o && (c.id === G.sel || T.al.indexOf(o) >= 0)) { var b = c.bb; (cen[o] = cen[o] || []).push({ x: ((b[0] + b[2]) / 2 + 180) / 360 * OW, y: (90 - (b[1] + b[3]) / 2) / 180 * OH, c: c }); } });
    var off = ph % step;
    ov.save();
    C.forEach(function (c) {
      if (T.al.indexOf(G.owner[c.id]) < 0) return;
      ov.save(); ov.beginPath(); trace(ov, c, OW, OH); ov.clip('evenodd');
      ov.globalAlpha = .22; ov.fillStyle = '#dc2626'; ov.fillRect(0, 0, OW, OH);   /* hafif kırmızı zemin */
      ov.globalAlpha = .85; ov.strokeStyle = '#ef4444'; ov.lineWidth = 6 * LS;
      var b = c.bb, x0 = (b[0] + 180) / 360 * OW, x1 = (b[2] + 180) / 360 * OW, y0 = (90 - b[3]) / 180 * OH, y1 = (90 - b[1]) / 180 * OH, h = y1 - y0 + 2 * step;
      ov.beginPath(); for (i = x0 - h - step + off; i < x1 + step; i += step) { ov.moveTo(i, y1 + step); ov.lineTo(i + h, y1 + step - h); } ov.stroke();   /* sağa-yukarı AKAN kırmızı şerit */
      ov.restore();
      ov.globalAlpha = 1; ov.strokeStyle = '#ff2d2d'; ov.lineWidth = 2.6 * LS; ov.beginPath(); trace(ov, c, OW, OH); ov.stroke();
    });
    if (sel) {
      var b0 = sel.bb, xs = ((b0[0] + b0[2]) / 2 + 180) / 360 * OW, ys = (90 - (b0[1] + b0[3]) / 2) / 180 * OH;
      ov.globalAlpha = .95; ov.strokeStyle = '#ef4444'; ov.lineWidth = 3.4 * LS; ov.setLineDash([14 * LS, 9 * LS]); ov.lineDashOffset = -ph * 1.5;
      T.al.forEach(function (a) {
        var l = cen[a]; if (!l || !l.length) return;
        var best = l[0], bd = 1e18; l.forEach(function (q) { var d = Math.abs(q.x - xs) + Math.abs(q.y - ys); if (d < bd) { bd = d; best = q; } });
        var x2 = best.x; if (x2 - xs > OW / 2) x2 -= OW; else if (xs - x2 > OW / 2) x2 += OW;
        [0, OW, -OW].forEach(function (dx) { ov.beginPath(); ov.moveTo(xs + dx, ys); ov.lineTo(x2 + dx, best.y); ov.stroke(); });
      });
    }
    ov.restore();
  }
  /* ---------- Gerçek 3B blok: ülke çokgeni yüzey dikeyinde kaldırılır (keskin kenar, ışık hesabı yok) ---------- */
  var EX = {}, H0 = 0.055, DEN = 2, SUBD = 2.2;   /* V148: telefonda ~3x az üçgen (Rusya/Kanada/ABD/Çin) */
  function sph(p, r) { var la = p[1] * DEG, lo = p[0] * DEG; return [r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)]; }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  function dens(ring) {
    var n = ring.length, out = [], i, j; if (n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1]) n--;
    for (i = 0; i < n; i++) { var a = ring[i], b = ring[(i + 1) % n], k = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / DEN)); for (j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
    return out;
  }
  function tri(out, a, b, c) {
    // En uzun kenardan ikiye bölme (sliver üçgenlerde patlamaz); sert üçgen sınırı yok -> büyük ülkelerde küre altına kesen düz üçgen kalmaz
    var st = [a, b, c], guard = 0;
    function el(p, q) { return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])); }
    while (st.length && guard++ < 400000) {
      var C = st.pop(), B = st.pop(), A = st.pop();
      var ab = el(A, B), bc = el(B, C), ca = el(C, A), m = Math.max(ab, bc, ca);
      if (m <= SUBD) { out.push(A, B, C); continue; }
      if (ab === m) { var M1 = mid(A, B); st.push(A, M1, C, M1, B, C); }
      else if (bc === m) { var M2 = mid(B, C); st.push(A, B, M2, A, M2, C); }
      else { var M3 = mid(C, A); st.push(A, B, M3, M3, B, C); }
    }
    while (st.length) { var c2 = st.pop(), b2 = st.pop(), a2 = st.pop(); out.push(a2, b2, c2); }
  }
  /* V127: önceden hesaplanmış üçgenleme (globe/tri.js). İmza = halka uzunlukları + koordinat toplamı; uymazsa earcut çalıştırılır. */
  function triSig(outer, holes) { var h = outer.length + ':' + holes.length, s = 0, i, j; for (i = 0; i < outer.length; i += 7) s += outer[i][0] * 1.7 + outer[i][1] * 3.1; for (j = 0; j < holes.length; j++) { h += ':' + holes[j].length; for (i = 0; i < holes[j].length; i += 7) s += holes[j][i][0] * 1.7 + holes[j][i][1] * 3.1; } return h + '#' + s.toFixed(3); }
  var GEN = {};   /* V127: yarım kalan (zaman dilimli) blok üretimleri */
  function buildEx(c) { var g = GEN[c.id] || (GEN[c.id] = buildExG(c)), r; do { r = g.next(); } while (!r.done); delete GEN[c.id]; return EX[c.id]; }
  /* V140: seçilen ülkenin bloğu hazır değilse ana iş parçacığı KİLİTLENMEZ: üretim kare başına en çok SLICE_LEFT ms ilerler, bitince ülke yükselir.
     (Eskiden loop() içinde buildEx() tek seferde bitiriyordu; büyük/karmaşık ülkede ilk seçimde donma yapabiliyordu.) */
  var SLICE_LEFT = 6;
  function sliceBuild(c) {
    var g = GEN[c.id] || (GEN[c.id] = buildExG(c)), t0 = performance.now(), budget = Math.max(2, SLICE_LEFT), r;
    do { r = g.next(); } while (!r.done && performance.now() - t0 < budget);
    SLICE_LEFT -= performance.now() - t0;
    if (r.done) { delete GEN[c.id]; return true; }
    return false;
  }   /* eşzamanlı bitirme (nadir: üretilmemiş ülke ilk kez yükselirken) */
  function* buildExG(c) {
    var e = EX[c.id] = { g: new THREE.Group(), cap: null, wall: null }; e.g.visible = false; globe.add(e.g);
    try {
      var R = 1 + H0, RB = 0.97, cp = [], wp = [], lp = [];
      for (var pi = 0; pi < c.polys.length; pi++) {
        var rings = c.polys[pi];
        var wrap = false, r0 = rings[0], a0 = 999, b0 = -999; r0.forEach(function (q) { if (q[0] < a0) a0 = q[0]; if (q[0] > b0) b0 = q[0]; });
        if (b0 - a0 > 200) { wrap = true; rings = rings.map(function (rg) { return rg.map(function (q) { return [q[0] < 0 ? q[0] + 360 : q[0], q[1]]; }); }); } // 180° boylamını aşan parça (Rusya/Çukotka): boylamı sürekli hale getir
        var outer = dens(rings[0]); if (outer.length < 3) continue;
        var mn = 999, mx = -999; outer.forEach(function (q) { if (q[0] < mn) mn = q[0]; if (q[0] > mx) mx = q[0]; }); if (mx - mn > 200) continue;
        var holes = [], all = outer.slice(); for (var h = 1; h < rings.length; h++) { var hr = dens(rings[h]); if (hr.length >= 3) { holes.push(hr); all = all.concat(hr); } }
        yield;
        var pre = window.WC_TRI && WC_TRI[c.id] && WC_TRI[c.id][pi], fc = null;
        if (pre && pre[0] === triSig(outer, holes)) { fc = []; for (var q3 = 0; q3 < pre[1].length; q3 += 3) fc.push([pre[1][q3], pre[1][q3 + 1], pre[1][q3 + 2]]); }
        if (!fc) fc = THREE.ShapeUtils.triangulateShape(outer.map(function (q) { return new THREE.Vector2(q[0], q[1]); }), holes.map(function (hr) { return hr.map(function (q) { return new THREE.Vector2(q[0], q[1]); }); }));
        yield;
        var T = [], ly = 0; for (var fi = 0; fi < fc.length; fi++) { tri(T, all[fc[fi][0]], all[fc[fi][1]], all[fc[fi][2]]); if (T.length - ly > 1200) { ly = T.length; yield; } }
        for (var ti = 0; ti < T.length; ti++) { var v = sph(T[ti], R); cp.push(v[0], v[1], v[2]); if ((ti & 2047) === 2047) yield; }
        yield;
        var rgs = [outer].concat(holes);
        for (var ri = 0; ri < rgs.length; ri++) {
          var rg = rgs[ri];
          for (var i = 0; i < rg.length; i++) {
            var A = rg[i], B = rg[(i + 1) % rg.length], At = sph(A, R), Bt = sph(B, R), Ab = sph(A, RB), Bb = sph(B, RB), Al = sph(A, R * 1.0006), Bl = sph(B, R * 1.0006);
            wp.push(At[0], At[1], At[2], Bt[0], Bt[1], Bt[2], Bb[0], Bb[1], Bb[2], At[0], At[1], At[2], Bb[0], Bb[1], Bb[2], Ab[0], Ab[1], Ab[2]);
            lp.push(Al[0], Al[1], Al[2], Bl[0], Bl[1], Bl[2]);
            if ((i & 255) === 255) yield;
          }
        }
      }
      if (!cp.length) return e;
      yield;
      var gc = new THREE.BufferGeometry(); gc.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); yield;
      var nn = new Float32Array(cp.length); for (var i = 0; i < cp.length; i += 3) { var l = Math.sqrt(cp[i] * cp[i] + cp[i + 1] * cp[i + 1] + cp[i + 2] * cp[i + 2]) || 1; nn[i] = cp[i] / l; nn[i + 1] = cp[i + 1] / l; nn[i + 2] = cp[i + 2] / l; }
      gc.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
      yield;
      var gw = new THREE.BufferGeometry(); gw.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); yield; gw.computeVertexNormals(); yield;
      var gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      e.cap = new THREE.Mesh(gc, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, emissive: 0x000000, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      e.wall = new THREE.Mesh(gw, new THREE.MeshLambertMaterial({ color: 0x888888, side: THREE.DoubleSide }));
      e.line = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: 0xfff0b4, transparent: true, opacity: .85 }));
      e.g.add(e.cap); e.g.add(e.wall); e.g.add(e.line); colorEx(c);
    } catch (x) { try { console.error(x); } catch (y) { } }
    return e;
  }
  /* V54: ülke blokları (üçgenleme) seçim anında değil, boş zamanda üretilir -> ilk seçimde kasma olmaz */
  var WARMBIG = false;
  function afterWarm(f) { var t0 = performance.now(); (function w() { if (WARMBIG || performance.now() - t0 > 1200) return f(); setTimeout(w, 60);   /* V142: 4 sn -> 1,2 sn */ })(); }   /* V132: en çok 4 sn bekler */
  function warmEx() {
    /* V127: blok üretimi zaman dilimli: her adımda ~4 ms, büyük ülkeler (RUS/CAN/AUS/USA) kare başına parça parça yapılır.
       Eskiden tek parça 250+ ms sürüyor ve küre açılırken ~4 kare/sn takılma yapıyordu. Büyük ülkeler önce üretilir. */
    var order = C.slice().sort(function (a, b) { return ((b.all[2] - b.all[0]) * (b.all[3] - b.all[1])) - ((a.all[2] - a.all[0]) * (a.all[3] - a.all[1])); });
    var i = 0, cur = null, cc = null;
    function later(f) { if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 250 }); else setTimeout(f, 30); }
    (function step(dl) {
      if (!C.length || !ON && !READY) return;
      if (down || anyMoving() || introStart || (window.__v30introEnd && performance.now() - window.__v30introEnd < 1200)) { later(step); return; }   /* V215: yeni oyunun küre yaklaşması sırasında da bekler; V140: dokunma/animasyon sırasında blok üretimi ana iş parçacığını meşgul etmez */
      var _w0 = performance.now(), t0 = performance.now(), budget = (dl && dl.timeRemaining) ? Math.max(3, Math.min(8, dl.timeRemaining() - 1)) : 4;
      while (performance.now() - t0 < budget) {
        if (!cur) {
          if (i >= order.length) break;
          cc = order[i++]; if (EX[cc.id] && !GEN[cc.id]) continue;
          cur = GEN[cc.id] || (GEN[cc.id] = buildExG(cc));
        }
        var r = cur.next(); if (r.done) { delete GEN[cc.id]; cur = null; if (!ON && renderer && (window.__v150up = (window.__v150up || 0) + 1) <= 6) preUp(EX[cc.id]); }   /* V150 */
      }
      PF('warm:' + (cc ? cc.id : ''), _w0);
      if (!WARMBIG && !cur && i >= 10) WARMBIG = true;   /* V132: en büyük 10 ülke bloğu hazır */
      if (cur || i < order.length) { later(step); return; }
      WARMBIG = true;
      /* tüm blok malzemelerinin shader'ları önceden derlenir (ilk yükselişte derleme takılması olmasın) */
      try { if (renderer && scene && camera) renderer.compile(scene, camera); } catch (e) { }
    })();
  }
  function preUpMany(arr) {   /* V181: bloklar (en çok ~4 tane) tek karede GPU'ya yüklenir; frustumCulled kapatılır, yoksa küre arkasındaki ülkeler yüklenmez ve ilk seçimde yükleme karesi kalır */
    var vis = [];
    try {
      arr.forEach(function (e) { if (!e || !e.cap || !scene) return; e.cap.frustumCulled = e.wall.frustumCulled = e.line.frustumCulled = false; e.g.visible = true; e.g.scale.setScalar(0.0001); vis.push(e); });
      if (vis.length) renderer.render(scene, camera);
    } catch (x) { }
    vis.forEach(function (e) { try { e.g.visible = false; e.cap.frustumCulled = e.wall.frustumCulled = e.line.frustumCulled = true; e.up = true; } catch (y) { } });
  }
  function preUp(e) { preUpMany([e]); }   /* V150 (V181: toplu yükleme üzerinden) */
  /* V158: küre Türkiye'ye yaklaşırken (oyuncu daha dokunamazken) Türkiye ve çevresindeki ülkelerin 3B blokları üretilir ve GPU'ya yüklenir;
     ilk ülke seçiminde blok üretimi / tampon yükleme karesi kalmaz. Dokunma veya animasyon varken beklenir, kare başına en çok ~4 ms çalışır. */
  var HW = null;
  function warmHome() {   /* V181: her aşamada (devam eden oyun dahil) çalışır; oyuncunun ülkesine en yakın ülkelerden başlayarak tüm ülkelerin bloğu üretilir ve GPU'ya yüklenir */
    try {
      if (HW || !READY || !cMap.TUR || !renderer) return;
      var hid = null; try { hid = homeId(); } catch (e) { }
      var t = (hid && cMap[hid]) || cMap.TUR, tx = (t.bb[0] + t.bb[2]) / 2, ty = (t.bb[1] + t.bb[3]) / 2, list = [t];
      C.forEach(function (c) {
        if (c === t) return; var cx = (c.bb[0] + c.bb[2]) / 2, cy = (c.bb[1] + c.bb[3]) / 2, dx = Math.abs(cx - tx); if (dx > 180) dx = 360 - dx;
        c._hd = Math.sqrt(dx * dx + (cy - ty) * (cy - ty)); list.push(c);
      });
      t._hd = 0; list.sort(function (a, b) { return (a._hd || 0) - (b._hd || 0); }); list = list.slice(0, 200);
      var i = 0, cur = null, cc = null, pend = []; HW = true;
      function flush() { if (pend.length) { var a = pend; pend = []; preUpMany(a); } }
      (function step() {
        if (!ON || !READY) { HW = null; return; }
        if (down || anyMoving() || introStart || (window.__v30introEnd && performance.now() - window.__v30introEnd < 1200) || (typeof BSH !== 'undefined' && BSH)) { setTimeout(step, 120); return; }   /* V215 */
        var t0 = performance.now();
        while (performance.now() - t0 < 4) {
          if (!cur) {
            if (i >= list.length) { flush(); HW = 'done'; return; }
            cc = list[i++];
            if (EX[cc.id] && !GEN[cc.id]) { if (EX[cc.id].cap && !EX[cc.id].up) { pend.push(EX[cc.id]); if (pend.length >= 4) break; } continue; }
            cur = GEN[cc.id] || (GEN[cc.id] = buildExG(cc));
          }
          var r = cur.next(); if (r.done) { delete GEN[cc.id]; cur = null; if (EX[cc.id] && EX[cc.id].cap) { pend.push(EX[cc.id]); if (pend.length >= 4) break; } }
        }
        if (pend.length >= 4) flush();
        setTimeout(step, 24);
      })();
    } catch (e) { HW = null; }
  }
  function colorEx(c) {
    var e = EX[c.id]; if (!e || !e.cap) return; var st = style(c), col = st ? st.col : ownCol(c), k;
    try { k = new THREE.Color(); k.setStyle(col); } catch (x) { k = new THREE.Color(0xcccccc); }
    e.cap.material.color.copy(k); e.cap.material.emissive.copy(k).multiplyScalar(.35); e.wall.material.color.copy(k).multiplyScalar(.55); e.wall.material.emissive.copy(k).multiplyScalar(.12);
  }
  function applyEx(c) { var e = EX[c.id]; if (!e) return; e.g.scale.setScalar((1 + H0 * c.h) / (1 + H0)); e.g.visible = c.h > 0.004 && !!e.cap; }
  var ZERO = new Uint8ClampedArray(512 * 256 * 4);
  function updateNormals() {
    var d = ZERO, o = nImg.data, x, y, i, hl, hr, hu, hd, nxv, nyv, l;
    for (y = 0; y < NH; y++) {
      var ym = y > 0 ? y - 1 : 0, yp = y < NH - 1 ? y + 1 : NH - 1;
      for (x = 0; x < NW; x++) {
        var xm = x > 0 ? x - 1 : NW - 1, xp = x < NW - 1 ? x + 1 : 0;
        hl = d[(y * NW + xm) * 4] / 255 * 4 + topoH[y * NW + xm] * 1.5; hr = d[(y * NW + xp) * 4] / 255 * 4 + topoH[y * NW + xp] * 1.5;
        hu = d[(ym * NW + x) * 4] / 255 * 4 + topoH[ym * NW + x] * 1.5; hd = d[(yp * NW + x) * 4] / 255 * 4 + topoH[yp * NW + x] * 1.5;
        nxv = -(hr - hl) * 0.5; nyv = (hd - hu) * 0.5; l = Math.sqrt(nxv * nxv + nyv * nyv + 1); i = (y * NW + x) * 4;
        o[i] = (nxv / l * 0.5 + 0.5) * 255; o[i + 1] = (nyv / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
      }
    }
    nx.putImageData(nImg, 0, 0); normTex.needsUpdate = true;
  }
  function refresh() { recompute(); needPaint = true; }
  function dirty() { if (!ON || !READY || dirtyQ) return; dirtyQ = requestAnimationFrame(function () { dirtyQ = 0; var s = sig(); if (s !== lastSig) { lastSig = s; refresh(); } }); }

  /* ---------- Sahne kurulumu ---------- */
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var _imgC = {}, _scC = {};   /* V92: önbellekli yükleyiciler; menü açıkken önden yüklenir, oyun başlayınca beklemez */
  function loadImg(src) { if (_imgC[src]) return _imgC[src]; return _imgC[src] = new Promise(function (ok, no) { var im = new Image(); im.onload = function () { try { if (im.decode) { im.decode().then(function () { ok(im); }, function () { ok(im); }); return; } } catch (e) { } ok(im); }; im.onerror = function (e) { delete _imgC[src]; no(e); }; im.src = src; }); }
  function loadScript(src) { if (_scC[src]) return _scC[src]; return _scC[src] = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { delete _scC[src]; no(new Error(src)); }; document.head.appendChild(s); }); }
  var _pre = false;
  function preload() { if (_pre || READY || BAD) return; _pre = true; try { Promise.all([loadScript('globe/three.min.js'), loadScript('globe/data.js'), loadScript('globe/tri.js').catch(function () { })]).then(function () { var T = window.WC_TEX || {}; for (var k in T) { try { loadImg(T[k]); } catch (e) { } } }).catch(function () { _pre = false; }); } catch (e) { } }
  var _bg199 = null;
  /* V201: taş/parşömen zemin + altın harita halkaları + hafif gren + kenar karartması TEK SEFERLİK 2B tuvale çizilir, scene.background olur (opak tuval; DOM katmanı/animasyon yok). Boyut değişince yeniden çizilir. */
  function bg199() {
    try {
      if (!scene || !THREE || !stage) return;
      var w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight; if (!w || !h) return;
      var k = Math.min(0.6, 900 / Math.max(w, h)), cw = Math.max(64, Math.round(w * k)), ch = Math.max(64, Math.round(h * k));
      if (_bg199 && _bg199.w === cw && _bg199.h === ch) return;
      var c = document.createElement('canvas'); c.width = cw; c.height = ch; var x = c.getContext('2d'), cx = cw / 2, cy = ch * 0.44, m = Math.min(cw, ch), far = Math.hypot(Math.max(cx, cw - cx), Math.max(ch * 0.4, ch * 0.6));
      var g = x.createRadialGradient(cx, ch * 0.4, 0, cx, ch * 0.4, far); g.addColorStop(0, '#74634a'); g.addColorStop(0.3, '#5a4c38'); g.addColorStop(0.62, '#3d352b'); g.addColorStop(1, '#2a251e'); x.fillStyle = g; x.fillRect(0, 0, cw, ch);
      /* V210: halkalar artık bu ekran dokusunda değil; küreye bağlı 3B düzlemde (ring210). Burada yalnızca taş zemin + gren + kenar karartması. */
      var t =document.createElement('canvas'); t.width = t.height = 96; var tx = t.getContext('2d'), id = tx.createImageData(96, 96), q; for (q = 0; q < id.data.length; q += 4) { id.data[q] = 204; id.data[q + 1] = 176; id.data[q + 2] = 106; id.data[q + 3] = Math.random() * 20; } tx.putImageData(id, 0, 0);
      x.fillStyle = x.createPattern(t, 'repeat'); x.fillRect(0, 0, cw, ch);
      var vg = x.createRadialGradient(cx, ch / 2, 0, cx, ch / 2, Math.hypot(cx, ch / 2)); vg.addColorStop(0.58, 'rgba(14,9,2,0)'); vg.addColorStop(1, 'rgba(14,9,2,.3)'); x.fillStyle = vg; x.fillRect(0, 0, cw, ch);
      var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      var old = scene.background; scene.background = tex; if (old && old.dispose) old.dispose(); _bg199 = { w: cw, h: ch };
    } catch (e) { }
  }
  /* V210: küre ile zemin tek parça görünsün diye: altın harita halkaları + kürenin arkasından taşan sıcak ışık halesi, kürenin merkezinde duran
     tek bir 3B düzleme (tek seferlik doku) çizilir. Küreyle birlikte yakınlaşır / panel açılınca kayar / sürüklerken hafifçe döner.
     Maliyet: tek dörtgen + tek doku okuması (her kare çizim zorlamaz). GERİ ALMAK İÇİN: build() içindeki "ring210(coarse);" satırını silin. */
  var ringM = null, ringRot = 0;
  function ring210(coarse) {
    try {
      var N = coarse ? 768 : 1280, S = 3.0, c = document.createElement('canvas'); c.width = c.height = N; var x = c.getContext('2d'), h = N / 2, u = h / S;   /* u: 1 dünya birimi kaç piksel */
      x.translate(h, h);
      /* sıcak hale: kürenin kenarından (r~1) dışa doğru söner; kürenin arkasında kalan kısım görünmez */
      var g = x.createRadialGradient(0, 0, 0.85 * u, 0, 0, 2.5 * u);
      g.addColorStop(0, 'rgba(230,198,128,.40)'); g.addColorStop(0.12, 'rgba(214,180,114,.28)'); g.addColorStop(0.32, 'rgba(186,152,96,.15)'); g.addColorStop(0.62, 'rgba(150,120,78,.06)'); g.addColorStop(1, 'rgba(120,96,64,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, 2.5 * u, 0, 6.2832); x.fill();
      var lw = Math.max(1, N / 900);
      x.strokeStyle = '#ead39a';
      function ring(r, a, w, dash) { x.globalAlpha = a; x.lineWidth = w; x.setLineDash(dash || []); x.beginPath(); x.arc(0, 0, r * u, 0, 6.2832); x.stroke(); }
      ring(1.2, 0.34, lw); ring(1.46, 0.24, lw); ring(1.86, 0.3, lw); ring(2.32, 0.16, lw);
      ring(1.33, 0.32, 0.06 * u, [lw * 1.4, 0.075 * u]);   /* derece çentikleri */
      ring(2.08, 0.2, 0.035 * u, [lw * 1.2, 0.16 * u]);
      x.setLineDash([]); x.lineWidth = lw;
      function spoke(ang, a, r0, r1) { var cs = Math.cos(ang), sn = Math.sin(ang); x.globalAlpha = a; x.beginPath(); x.moveTo(cs * r0 * u, sn * r0 * u); x.lineTo(cs * r1 * u, sn * r1 * u); x.stroke(); }
      for (var k = 0; k < 4; k++) spoke(k * Math.PI / 2, 0.2, 1.1, 2.75);
      for (k = 0; k < 4; k++) spoke(Math.PI / 4 + k * Math.PI / 2, 0.11, 1.1, 2.2);
      /* kenar: dokunun dışı yumuşakça sıfırlanır (kesik kenar görünmez) */
      x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in';
      var e = x.createRadialGradient(0, 0, 2.2 * u, 0, 0, 2.95 * u); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = e; x.fillRect(-h, -h, N, N);
      var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 1;
      ringM = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, 2 * S), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
      ringM.renderOrder = -2; ringM.frustumCulled = false; scene.add(ringM);
    } catch (e) { ringM = null; }
  }
  function build() {
    THREE = window.THREE; TEX = window.WC_TEX;
    var _c = performance.now(); function CP(l) { PF('build:' + l, _c); _c = performance.now(); }
    ovC = mk(OW, OH); ov = ovC.getContext('2d'); liftC = mk(LW, LH); lift = liftC.getContext('2d'); reliefC = mk(LW, LH); var YLD = function () { return new Promise(function (r) { setTimeout(r, 24); }); };   /* V149: ağır adımlar arasında ana iş parçacığı serbest bırakılır */
    nsmall = mk(NW, NH); nsx = nsmall.getContext('2d', { willReadFrequently: true }); nC = mk(NW, NH); nx = nC.getContext('2d'); nImg = nx.createImageData(NW, NH); topoH = new Float32Array(NW * NH);
    var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches || document.body.classList.contains('fxlow');
    renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: false });   /* V215: V214 telefonda kenar yumuşatmayı (MSAA) açmıştı; yeni oyun yaklaşmasında düzenli 80-150 ms kare kaybına yol açtığı ölçüldü -> geri alındı */
    /* V127: hareket sırasında düşük (akıcı), 260 ms durunca yüksek çözünürlük (net). Telefonda sabit 1.25 yüzünden küre bulanıktı. */
    PRLO = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);   /* V162: masaüstünde hareket/savaş animasyonu sırasında en çok 1.5x (eskiden 2x) */ PRHI = coarse ? Math.max(PRLO, Math.min(window.devicePixelRatio || 1, PR_IDLE_PHONE)) : Math.min(window.devicePixelRatio || 1, 2);   /* V183: telefonda da durunca netleş (PR_IDLE_PHONE) */   /* V147: telefonda çözünürlük değişimi yok (setPR 238-266 ms donma + 1.5x karede ~150 ms) */ curPR = PRLO; idleSince = performance.now();
    renderer.setPixelRatio(PRLO); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x2a251e, 1);   /* V201 */
    stage.appendChild(renderer.domElement); try { renderer.domElement.style.opacity = '0'; } catch (e) { } /* V150: build() içindeki ön çizim (kamera 3.4, tam boy küre) perde kalkınca bir an görünüyordu; tuval doIntro/show açana kadar gizli */ CP('renderer');
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200); camera.position.set(0, 0, camZ);
    /* V199: duraklatma menüsü (Siper Defteri) teması: sıcak krem güneş sol üstten, sıcak taş dolgu, arkadan ince altın kenar ışığı.
       ESKİ DEĞERLER: güneş 0xffffff/2.4 (3,2,4), ortam 0x6b7fa8/0.9, kenar ışığı yok, kamera yuvarlanması yok. */
    var sun = new THREE.DirectionalLight(0xffeccb, 2.3); sun.position.set(-3, 2.4, 4); scene.add(sun); scene.add(new THREE.AmbientLight(0x857a68, 0.95));
    if (!coarse) { var rim199 = new THREE.DirectionalLight(0xcdb06a, 0.7); rim199.position.set(-2.5, 1.2, -3.5); scene.add(rim199); }   /* V201: üçüncü ışık yalnızca masaüstünde (telefonda piksel başına maliyet) */
    camera.rotation.z = WC199_TILT * Math.PI / 180;   /* V199: küre -14° eğik görünür (menü kartındaki küre motifi); 0 yaparsanız düz */
    bg199();   /* V201 */
    ring210(coarse);   /* V210 */
    globe =new THREE.Group(); scene.add(globe);
    ovTex = new THREE.CanvasTexture(ovC); ovTex.colorSpace = THREE.SRGBColorSpace; ovTex.anisotropy = 8; if (LOWQ) { ovTex.generateMipmaps = false; ovTex.minFilter = THREE.LinearFilter; ovTex.anisotropy = 1; }   /* V142: telefonda her seçimde 2048x1024 kaplamanın mipmap'i yeniden üretilmesin (seçim anı takılması) */ liftTex = new THREE.CanvasTexture(liftC); normTex = new THREE.CanvasTexture(nC);
    var marble, water, sky, clouds, geo; return Promise.all([loadImg(TEX.marble), loadImg(TEX.topo), loadImg(TEX.water), loadImg(TEX.sky), loadImg(TEX.clouds)]).then(function (im) {
      marble = new THREE.Texture(im[0]); marble.colorSpace = THREE.SRGBColorSpace; marble.anisotropy = 4; marble.needsUpdate = true;
      water = new THREE.Texture(im[2]); water.needsUpdate = true; sky = new THREE.Texture(im[3]); sky.colorSpace = THREE.SRGBColorSpace; sky.needsUpdate = true; var cmC = mk(im[4].width || 1024, im[4].height || 512), cmX = cmC.getContext('2d', { willReadFrequently: true }); cmX.drawImage(im[4], 0, 0, cmC.width, cmC.height); cmX.globalCompositeOperation = 'destination-out'; var cg = cmX.createLinearGradient(0, 0, 0, cmC.height); cg.addColorStop(0, 'rgba(0,0,0,1)'); cg.addColorStop(0.24, 'rgba(0,0,0,1)'); cg.addColorStop(0.36, 'rgba(0,0,0,0.6)'); cg.addColorStop(0.5, 'rgba(0,0,0,0)'); cg.addColorStop(0.64, 'rgba(0,0,0,0.6)'); cg.addColorStop(0.76, 'rgba(0,0,0,1)'); cg.addColorStop(1, 'rgba(0,0,0,1)'); cmX.fillStyle = cg; cmX.fillRect(0, 0, cmC.width, cmC.height); clouds = new THREE.CanvasTexture(cmC);
      nsx.drawImage(im[1], 0, 0, NW, NH); var td = nsx.getImageData(0, 0, NW, NH).data; for (var q = 0; q < NW * NH; q++) topoH[q] = td[q * 4] / 255;
      var rx = reliefC.getContext('2d', { willReadFrequently: true }); rx.drawImage(im[1], 0, 0, LW, LH); var rd = rx.getImageData(0, 0, LW, LH), p;
      for (p = 0; p < LW * LH; p++) { var v = Math.round((0.55 + 0.45 * rd.data[p * 4] / 255) * 255); rd.data[p * 4] = rd.data[p * 4 + 1] = rd.data[p * 4 + 2] = v; rd.data[p * 4 + 3] = 255; } rx.putImageData(rd, 0, 0);
      CP('img+topo'); updateNormals(); CP('normals');
    }).then(YLD).then(function () {   /* V149 */
      geo = coarse ? new THREE.SphereGeometry(1, 192, 96) : new THREE.SphereGeometry(1, 320, 160);
      earth = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: marble, specularMap: water, specular: new THREE.Color(0x445566), shininess: 28, normalMap: normTex, normalScale: new THREE.Vector2(1, 1) })); globe.add(earth);
      var cover = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: ovTex, transparent: true, depthWrite: false, emissive: new THREE.Color(0xffffff), emissiveMap: ovTex, emissiveIntensity: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); cover.scale.setScalar(1.0015); globe.add(cover);
      cloudM = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 48), new THREE.MeshLambertMaterial({ map: clouds, transparent: true, opacity: 0.55, depthWrite: false })); globe.add(cloudM);
      scene.add(atmM = new THREE.Mesh(new THREE.SphereGeometry(1.14, 64, 32), new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 vN;void main(){float i=pow(0.68-dot(vN,vec3(0.,0.,1.)),4.2);gl_FragColor=vec4(.84,.72,.45,1.)*clamp(i,0.,1.)*0.85;}', side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));   /* V210: 0.75 -> 0.85, biraz daha sıcak */
      /* V210: kenar pusu — kürenin kenarına doğru artan sıcak altın ışık (fresnel). Lacivert okyanusun siyaha kesilen kenarı zemindeki haleye yumuşakça bağlanır;
         gece tarafı da tamamen siyaha düşmez. Tek ucuz shader. GERİ ALMAK İÇİN: bu "haze210" satırını silin. */
      var haze210 = new THREE.Mesh(new THREE.SphereGeometry(1.006, 96, 48), new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}', fragmentShader: 'varying vec3 vN;varying vec3 vV;void main(){float f=1.-clamp(dot(normalize(vN),normalize(vV)),0.,1.);float i=pow(f,1.7)*0.30+pow(f,6.)*0.12+0.045;gl_FragColor=vec4(vec3(.86,.70,.44)*i,1.);}', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      haze210.renderOrder = 1; scene.add(haze210);
      /* V199: yıldızlı gökyüzü küresi kaldırıldı (eski: SphereGeometry(80) + sky dokusu). Yerine seyrek altın toz + kürede ince altın enlem/boylam ızgarası. */
      try {
        var dp = [], di, du, dt2, dr; for (di = 0; di < 380; di++) { du = Math.random() * 2 - 1; dt2 = Math.random() * 6.2832; dr = Math.sqrt(1 - du * du); dp.push(40 * dr * Math.cos(dt2), 40 * du, 40 * dr * Math.sin(dt2)); }
        var dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
        var dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xcdb06a, size: 0.1, transparent: true, opacity: 0.3, depthWrite: false })); dust.frustumCulled = false; if (!coarse) scene.add(dust);   /* V202: toz telefonda yok */
        var gp = [], ga, gb, gk, R = 1.004; for (ga = -60; ga <= 60; ga += 30) { for (gk = 0; gk < 96; gk++) { var l1 = gk / 96 * 6.2832, l2 = (gk + 1) / 96 * 6.2832, la = ga * Math.PI / 180, cr = Math.cos(la) * R, sy = Math.sin(la) * R; gp.push(cr * Math.cos(l1), sy, cr * Math.sin(l1), cr * Math.cos(l2), sy, cr * Math.sin(l2)); } }
        for (gb = 0; gb < 180; gb += 30) { var lo = gb * Math.PI / 180, co = Math.cos(lo), so = Math.sin(lo); for (gk = 0; gk < 96; gk++) { var p1 = gk / 96 * 6.2832, p2 = (gk + 1) / 96 * 6.2832; gp.push(Math.cos(p1) * R * co, Math.sin(p1) * R, Math.cos(p1) * R * so, Math.cos(p2) * R * co, Math.sin(p2) * R, Math.cos(p2) * R * so); } }
        var gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
        var grat = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xcdb06a, transparent: true, opacity: 0.2, depthWrite: false })); grat.frustumCulled = false; if (!coarse) globe.add(grat);   /* V201: ızgara telefonda yok */
        if (earth && earth.material && earth.material.color) earth.material.color.setHex(0xffe6c2);   /* V199: deniz/kara dokusuna hafif sıcak ton */
      } catch (e) { }
      CP('meshes');
    }).then(YLD).then(function () {   /* V149 */
      var cA = null; bindInput(); resize(); READY = true;
      try { warm207(); } catch (e) { }   /* V206 */
      setTimeout(prePaint215, 30);   /* V215: harita kaplaması küre görünmeden (menü/perde altında) boyanır */
      /* V132: shader derlemesi + ilk kare ve büyük ülke blokları perdenin altında hazırlanır (ilk dokunuşta/animasyonda takılma olmasın) */
      try {   /* V140: ülke bloklarının shader'ları (Lambert + çizgi) küre kurulurken, perdenin altında derlenir; ilk seçimde derleme takılması/donması olmasın */
        var dgm = new THREE.BufferGeometry(); dgm.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.3, .01, 0, 1.3, 0, .01, 1.3], 3)); dgm.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
        var dg2 = new THREE.BufferGeometry(); dg2.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.3, .01, 0, 1.3], 3));
        var pre = window.__v140pre = [new THREE.Mesh(dgm, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, emissive: 0x000000, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })), new THREE.Mesh(dgm, new THREE.MeshLambertMaterial({ color: 0x888888, side: THREE.DoubleSide })), new THREE.LineSegments(dg2, new THREE.LineBasicMaterial({ color: 0xfff0b4, transparent: true, opacity: .85 }))];
        pre.forEach(function (m) { m.frustumCulled = false; globe.add(m); });
        CP('pre'); cA = renderer.compileAsync ? renderer.compileAsync(scene, camera) : (renderer.compile(scene, camera), null);   /* V149: paralel shader derlemesi (ana iş parçacığı bloklanmaz) */
      } catch (e) { }
      return Promise.resolve(cA).catch(function () { }).then(YLD).then(function () {
        try { CP('compile1'); renderer.render(scene, camera); CP('render1'); (window.__v140pre || []).forEach(function (m) { globe.remove(m); }); } catch (e) { }   /* malzemeler dispose EDİLMEZ: derlenen programlar önbellekte kalır */
        try { renderer.compile(scene, camera); renderer.render(scene, camera); } catch (e) { } CP('render2');
        warmEx();
      });
    });
  }

  /* ---------- Kamera ve etkileşim ---------- */
  function resize() { if (!renderer) return; var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; _stW = w; _stH = h; renderer.setSize(w, h); bg199(); camera.aspect = w / h; camera.fov = w < h ? 52 : 40; camera.updateProjectionMatrix(); }
  function rotateBy(dx, dy) { var k = 0.0042 * camZ / 3.4; globe.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * k, dx * k, 0, 'XYZ'))); if (ringM) { ringRot += dx * k * 0.06; ringM.rotation.z = ringRot; } }   /* V210: zemin halkaları sürüklerken küreyle hafifçe döner (derinlik hissi) */
  /* V210: odaklanma artık süreye bağlı, yumuşak hızlanıp yavaşlayan (easeInOut) bir geçiş: eskiden ilk karede ani sıçrayıp sonda sürünüyordu.
     Savurma, yakınlaştırma ve odaklanma kare hızından bağımsız (120 Hz ekranda iki kat hızlı/uzun dönmez). */
  var fq0 = null, fqT = 0, fqD = 0.8, _pnT = -1e9, _pnV = false, introP = 0, introP0 = 0;
  function ease210(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function stepCamera(dt) {
    if (!focusQ) fq0 = null;
    if (focusQ) {
      if (!fq0 || fq0.tgt !== focusQ) { var _mid = !!(fq0 && fqT > 0 && fqT < 1); fq0 = { q: globe.quaternion.clone(), tgt: focusQ, out: _mid }; fqT = 0; var _ang = globe.quaternion.angleTo(focusQ); fqD = Math.max(0.45, Math.min(1.25, 0.4 + _ang * 0.32)); }   /* hareket sürerken yeni hedef gelirse yavaşlayıp yeniden hızlanmaz (yalnız yumuşak iniş) */
      fqT += dt / fqD; var _t1 = Math.min(1, fqT), _e = fq0.out ? 1 - Math.pow(1 - _t1, 3) : ease210(_t1); globe.quaternion.copy(fq0.q).slerp(focusQ, _e);
      if (fqT >= 1) { globe.quaternion.copy(focusQ); focusQ = null; fq0 = null; }
    }
    else if (!down && (Math.abs(vel.x) > 0.05 || Math.abs(vel.y) > 0.05)) { var _f = dt * 60; rotateBy(vel.x * _f, vel.y * _f); var _d = Math.pow(0.93, _f); vel.x *= _d; vel.y *= _d; }
    if (introStart) { if (introP0 !== introStart) { introP0 = introStart; introP = 0; } if (!(baseJob || needPaint) || performance.now() - introStart > 1500) introP += Math.min(dt, 1 / 30) * 1000 / introDur; var _k = Math.max(0, Math.min(1, introP));   /* V215: yaklaşma kare süresine göre ilerler (yavaş karede sıçramaz) ve harita boyanması bitene kadar başlangıçta bekler */ camZ = introFrom + (zoomT - introFrom) * (1 - Math.pow(1 - _k, 4)); if (_k >= 1) { introStart = 0; window.__v30introEnd = performance.now(); } }   /* V215: yaklaşma bitiş anı (ön hazırlıklar buna göre bekler) */ else { var _zd = zoomT - camZ; camZ = Math.abs(_zd) < 1e-4 ? zoomT : camZ + _zd * (1 - Math.exp(-dt * 7)); }   /* V56: yeni oyunda küre uzaktan yaklaşır; V210: yaklaşma eğrisi daha yumuşak iniş (quart) */
     camera.position.z = camZ * (window.innerWidth > window.innerHeight ? 0.7 : 1);   /* V57: yatayda küre daha da yakın (0.86 -> 0.70) */
    // savaş paneli açıkken görüntüyü panelin dışındaki alana kaydır (telefonda yukarı, geniş ekranda sola)
    /* V212: panelin görünürlüğü (offsetWidth = zorunlu yerleşim hesabı) her karede değil, en çok 250 ms'de bir okunur; savaş paneli animasyonlarında kare başına yerleşim hesabı yapılmaz */
    var _nw = performance.now(); if (_nw - _pnT > 250) { _pnT = _nw; var _pn = window.innerWidth > window.innerHeight && document.getElementById('panel'); _pnV = !!(_pn && _pn.offsetWidth > 0); }
    var _vt = (((typeof BSH !== 'undefined' && BSH && !window.v60Active) || _pnV) ? 1 : 0); vo += (_vt - vo) * (1 - Math.exp(-dt * 6)); if (Math.abs(_vt - vo) < 0.002) vo = _vt;   /* V210: kare hızından bağımsız */
    var w = _stW || (_stW = stage.clientWidth), h = _stH || (_stH = stage.clientHeight);   /* V205 */
    if (vo < 0.01) { if (camera.view && camera.view.enabled) camera.clearViewOffset(); }
    else if (w && h) { var wide = window.innerWidth >= 900 || window.innerWidth > window.innerHeight; camera.setViewOffset(w, h, wide ? vo * (window.innerWidth > window.innerHeight && window.innerWidth < 900 ? -Math.min(205, w * 0.2) : 205) : 0, wide ? 0 : vo * h * .19, w, h); }
  }
  /* V212: hedefin ekrandaki dikey konumu. Eskiden her zaman 0.3 rad (~17°) güneye bakılıyordu: dikey telefonda alttaki panel için doğru,
     ama yatay ekranda ve savaş animasyonunda savaşan ülkeler ekranın üstüne, üst çubuğun altına kaçıyordu. */
  function latOff(battle) { var portrait = window.innerWidth <= window.innerHeight; if (battle) return portrait ? 0.1 : 0.02; return portrait ? 0.3 : 0.1; }
  function focusOn(c, instant, lo) {
    if (!c || !READY) return; var b = c.bb, lon = (b[0] + b[2]) / 2 * DEG, lat = (b[1] + b[3]) / 2 * DEG;
    var qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2 - lon), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lat - (lo == null ? latOff((typeof BSH !== 'undefined') && BSH) : lo)), q = qx.multiply(qy);
    if (instant) globe.quaternion.copy(q); else focusQ = q;
    var span = Math.max(b[2] - b[0], (b[3] - b[1]) * 1.6); zoomT = Math.max(2.2, Math.min(3.6, 2.2 + span / 25)); if (instant) camZ = zoomT;
  }
  window.v30FocusOn = function (id) { try { if (ON && cMap[id]) { focusOn(cMap[id], false); return true; } } catch (e) { } return false; };
  function focusHome(instant) { var id = null; try { id = homeId(); } catch (e) { } if (id && cMap[id]) focusOn(cMap[id], instant); else if (cMap.TUR && G && G.ph === 'v7pick') focusOn(cMap.TUR, instant); else { globe.quaternion.identity(); zoomT = 3.4; if (instant) camZ = zoomT; } }
  /* V81: küçük ülkelere dokunma toleransı. Ekranda ~22 px içindeki küçük ülke (sınır kutusu toleransın ~2 katından küçük) seçilir.
     Denizde veya büyük bir komşunun içinde, küçük ülkenin merkezine yeterince yakınsa büyük olanı değil küçük olanı alır. */
  var PICK_PX = 22;
  function pickNear(lon, lat, c0, h) {
    try {
      var tol = PICK_PX * 2 * Math.max(0.3, camZ - 1) * Math.tan(20 * Math.PI / 180) / Math.max(200, h) / DEG;   /* derece */
      var best = null, bd = 1e9, rad = Math.PI / 180;
      for (var i = 0; i < C.length; i++) {
        var c = C[i], b = c.bb, sp = Math.max(b[2] - b[0], b[3] - b[1]); if (sp > tol * 2) continue;
        var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, dl = Math.abs(lon - cx); if (dl > 180) dl = 360 - dl;
        var d = Math.hypot(dl * Math.cos(lat * rad), lat - cy) - sp / 2; if (d < 0) d = 0;
        var lim = (c0 && c0 !== c) ? tol * 0.6 : tol; if (d <= lim && d < bd) { bd = d; best = c; }
      }
      return best || c0;
    } catch (e) { return c0; }
  }
  function bindInput() {
    var el = renderer.domElement, ray = new THREE.Raycaster(), m2 = new THREE.Vector2(); el.style.touchAction = 'none';
    el.addEventListener('pointerdown', function (e) {
      if (LOWQ && typeof BSH !== 'undefined' && BSH && !window.v60Active) return;   /* V179: savaş paneli açıkken üstteki harita kilitli (dokunma/sürükleme/yakınlaştırma yok) */
      el.setPointerCapture(e.pointerId); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; focusQ = null; vel.x = vel.y = 0;
      if (Object.keys(ptrs).length === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      else { down = null; var a = Object.keys(ptrs).map(function (k) { return ptrs[k]; }); pinch0 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); pinchA = Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x); pinchM = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; }
    });
    el.addEventListener('pointermove', function (e) {
      var p = ptrs[e.pointerId]; if (!p) return; var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; var ids = Object.keys(ptrs);
      if (ids.length === 1 && down) {
        down.moved += Math.abs(dx) + Math.abs(dy); rotateBy(dx, dy);
        /* V210: savurma hızı olay sıklığından bağımsız (px / 60 Hz karesi) ve yumuşatılmış: tek titrek olay savurmayı belirlemez */
        var _now = performance.now(), _ms = Math.max(4, Math.min(50, _now - (down.lt || _now - 16))); down.lt = _now;
        var _s = 16.67 / _ms; vel.x = vel.x * 0.45 + dx * _s * 0.55; vel.y = vel.y * 0.45 + dy * _s * 0.55;
      }
      else if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (pinch0) zoomT = Math.max(ZMIN3, Math.min(6, zoomT * pinch0 / d));
        if (pinchA !== null) {
          var da = ang - pinchA; if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
          globe.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -da)); // iki parmakla döndürme (twist)
          rotateBy(mx - pinchM.x, my - pinchM.y); // iki parmakla sürükleme
        }
        pinch0 = d; pinchA = ang; pinchM = { x: mx, y: my };
      }
    });
    function up(e) { var d = down; if (d && d.lt && performance.now() - d.lt > 90) { vel.x = vel.y = 0; }   /* V210: parmak durup bekledikten sonra bırakınca küre kendi kendine savrulmaz */ delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) { pinch0 = 0; pinchA = null; } if (d && d.moved < 8 && performance.now() - d.t < 400) pick(e.clientX, e.clientY); down = null; }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', function (e) { e.preventDefault(); zoomT = Math.max(ZMIN3, Math.min(6, zoomT * (1 + e.deltaY * 0.001))); }, { passive: false });
    function pick(cx, cy) {
      var r = el.getBoundingClientRect(); m2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); ray.setFromCamera(m2, camera);
      var hit = ray.intersectObject(earth, false)[0];
      if (!hit) { if (G && !BSH && G.sel) { G.sel = null; render(); } return; }
      var v = globe.worldToLocal(hit.point.clone()).normalize(), lat = Math.asin(v.y) / DEG, lon = Math.atan2(-v.z, v.x) / DEG, c = pickNear(lon, lat, countryAt(lon, lat), r.height);
      if (c) pickC(c.id); else if (G && !BSH && G.sel) { G.sel = null; render(); }
    }
  }
  var fr = 0, lastRK = '', lastRT = 0, forceR = 0, PRLO = 1, PRHI = 1, curPR = 1, idleSince = 0;
  function setPR(p) { if (!renderer || Math.abs(p - curPR) < .01) return; var _q0 = performance.now(); curPR = p; renderer.setPixelRatio(p); resize(); forceR = 3; PF('setPR', _q0); }
  function anyMoving() { for (var i = 0; i < C.length; i++) if (C[i].h !== C[i].t) return true; return false; }
  /* ---------- V60: savaş animasyonları (v60.js) için küçük dış arayüz; oyun kurallarına dokunmaz ---------- */
  var FH = [];
  window.v30IntroBusy = function () { return !!introStart; };   /* V150: öğretici sorusu, küre yaklaşırken açılıp küreyi örtmesin */
  window.v30API = {
    ready: function () { return !!(ON && READY && scene && globe && renderer && THREE); },
    THREE: function () { return THREE; }, globe: function () { return globe; }, camera: function () { return camera; }, renderer: function () { return renderer; },
    hook: function (f) { if (FH.indexOf(f) < 0) FH.push(f); },
    has: function (id) { return !!cMap[id]; },
    bbox: function (id) { var c = cMap[id]; return c ? c.bb.slice() : null; },   /* V71: ana kara parçasının sınır kutusu [x0,y0,x1,y1] (derece) */
    ll: function (id) { var c = cMap[id]; if (!c) return null; var b = c.bb; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; },
    sph: function (lon, lat, r) { var q = sph([lon, lat], r || 1); return new THREE.Vector3(q[0], q[1], q[2]); },
    height: function (ids) { var h = 1; ids.forEach(function (id) { var c = cMap[id]; if (c && c.h < h) h = c.h; }); return 1 + H0 * h; },
    lift: function (ids) { ids.forEach(function (id) { var c = cMap[id]; if (c) c.t = 1; }); },
    focusLL: function (lon, lat, z) { focusOn({ bb: [lon, lat, lon, lat] }, false, latOff(true)); if (z) zoomT = z; },   /* V212: savaş animasyonu ortalanır */
    zoom: function (z) { zoomT = z; },
    /* V65: kara/deniz denetimi + animasyon sonrası yükseltmeyi geri al */
    at: function (lon, lat) { var c = countryAt(lon, lat); return c ? c.id : null; },
    unlift: function () { recompute(); },
    border: function (id, max) { var c = cMap[id], out = []; if (!c) return out; var n = 0; c.polys.forEach(function (rg) { n += rg[0].length; }); var st = Math.max(1, Math.ceil(n / (max || 300))); c.polys.forEach(function (rg) { var r = rg[0]; for (var i = 0; i < r.length; i += st) out.push(r[i]); }); return out; }
  };

  function loop(now) {
    if (!ON) { rafId = 0; return; } rafId = requestAnimationFrame(loop);
    if (menuUp()) { last = now; return; }   /* V90: ana menü üstteyken gizli küreyi çizme */
    if (pauseUp()) { pzW = true; last = now; return; }   /* V177: duraklatma kartı açıkken küre çizilmez / hareket etmez (kart açılış-kapanış karelerine GPU işi binmesin) */
    if (pzW) { pzW = false; forceR = 3; }   /* V177: kart kapandı -> ilk karede küre bir kez tazelenir */
    hvLF++; hvPaint = false;   /* V178 */
    var _raw = now - last, dt = Math.min(0.05, _raw / 1000); last = now;
    /* V148: uyarlanabilir çözünürlük (yalnızca telefon): hareket/animasyon sırasında kareler uzun sürerse çözünürlük 0.25 kademe düşer (en az 0.75) */
    var _sk = (G && G.sel) || ''; if (_sk !== window.__v150sel || introStart) { window.__v150sel = _sk; window.__v148t = performance.now(); window.__v148e = 16; }   /* V150: ülke seçimi/yaklaşma anındaki tek seferlik takılma çözünürlüğü düşürmesin (setPR = tuval yeniden ayırma = ikinci takılma) */
    if (false && LOWQ && renderer && READY && _raw > 8 && _raw < 400 && performance.now() - (window.__v148t || 0) > 2500) {
      window.__v148e = (window.__v148e || 16) * 0.9 + _raw * 0.1;
      if (window.__v148e > 38 && PRLO > 0.76) { PRLO = Math.max(0.75, PRLO - 0.25); PRHI = PRLO; window.__v148t = performance.now(); window.__v148e = 16; setPR(PRLO); try { window.WCPERF && WCPERF('  PR->' + PRLO); } catch (x) { } }
    } cloudM.rotation.y += dt * 0.004;
    /* V170: telefonda hareket sirasinda kareler uzun surerse once bulut + atmosfer katmanlarini gizle (cozunurluk degistirmeden, dondurmadan); durunca geri getir */
    try {
      var _q = window.__v170 = window.__v170 || { e: 16, hi: 0, off: 0, t: 0 };
      if (LOWQ && READY && _raw > 8 && _raw < 400) {
        if (anyMoving()) {
          _q.e = _q.e * 0.9 + _raw * 0.1; _q.t = now;
          if (!_q.off) { if (_q.e > 30) { if (++_q.hi > 20) { _q.off = 1; cloudM.visible = false; if (atmM) atmM.visible = false; forceR = 3; } } else _q.hi = 0; }
        } else if (_q.off && now - _q.t > 2500) { _q.off = 0; _q.hi = 0; _q.e = 16; cloudM.visible = true; if (atmM) atmM.visible = true; forceR = 3; }
      }
    } catch (e) { }
    if (needPaint) { needPaint = false; forceR = 3; hvPaint = LOWQ; var _p0 = performance.now(); paintOverlay(); PF('paintOverlay', _p0); _p0 = performance.now(); C.forEach(function (c) { if (EX[c.id]) colorEx(c); }); PF('colorEx', _p0); }
    if (baseJob && !(LOWQ && hvStep === hvLF)) { var _b0 = performance.now(); stepBase(); PF('baseStep', _b0); }   /* V178: paintOverlay bu karede zaten bir taban dilimi çalıştırdıysa ikincisi sonraki kareye */
    SLICE_LEFT = (LOWQ && hvPaint) ? 2 : 6;   /* V178: bu karede kaplama boyandıysa 3B blok üretimi en az bütçeyle (yine ilerler, takılmaz) */ var _s0 = performance.now();   /* V140: kare başına blok üretim bütçesi (ms) */
    for (var i = 0; i < C.length; i++) {
      var c = C[i]; if (c.h === c.t) continue;
      var d = c.t - c.h; if (c.t > 0 && (!EX[c.id] || GEN[c.id]) && !sliceBuild(c)) continue;   /* V140: blok hazır değilse bu karede atla (ana iş parçacığı kilitlenmez) */
      if (Math.abs(d) > 0.002) { var st = Math.max(Math.abs(d) * (1 - Math.exp(-dt * 5.5)), dt * 0.06); c.h += Math.sign(d) * Math.min(Math.abs(d), st); } else c.h = c.t;
      applyEx(c);
    }
    PF('lift/sliceBuild', _s0); _s0 = performance.now();
    stepCamera(dt); PF('stepCamera', _s0); for (var _fi = 0; _fi < FH.length; _fi++) { try { FH[_fi](dt); } catch (x) { } } if (!(window.v60Skip && window.v60Skip())) {
      /* V72: sahnede hiçbir şey değişmediyse (kamera/küre/yükselen ülke/animasyon yok) kareyi tekrar çizme; bulutlar için ~4 kare/sn yeter -> ülke seçiminde GPU/pil yükü ve kasma azalır */
      var q = globe.quaternion, k = camera.position.z.toFixed(4) + '|' + q.x.toFixed(4) + '|' + q.y.toFixed(4) + '|' + q.z.toFixed(4) + '|' + q.w.toFixed(4) + '|' + vo.toFixed(3) + '|' + window.innerWidth + 'x' + window.innerHeight;
      var _bsh = (typeof BSH !== 'undefined' && BSH && !window.v60Active);   /* V161: savaş paneli açıkken küre her karede çizilmez (eskiden BSH her kareyi zorluyordu -> panelde kasma) */
      var busy = k !== lastRK || window.v60Active || (window.__anim216 && now < window.__anim216) || anyMoving() || (now - lastRT) > (_bsh ? (LOWQ ? 1e9 : 1200) : (curPR > PRLO ? 1500 : (LOWQ ? 1000 : 250))) || forceR > 0;   /* V143: yüksek çözünürlükte (kare ~150 ms) yalnızca bulut için sık çizme */
      var _mv = k !== lastRK || window.v60Active || anyMoving() || introStart;
      if (_mv) { idleSince = now; if (curPR !== PRLO) setPR(PRLO); busy = true; }
      else if (_bsh) { idleSince = now + 900; if (curPR !== PRLO) { setPR(PRLO); busy = true; } }   /* panel kapanınca PRHI'ye ~1,2 sn sonra geç: tuval yeniden ayırma kapanış geçişiyle çakışmasın */   /* V161: panel açıkken yüksek çözünürlüğe geçip tuvali yeniden ayırma */
      else if (PRHI > PRLO && curPR !== PRHI && now - idleSince > (LOWQ ? PR_IDLE_MS : 300) && !(LOWQ && (needPaint || baseJob || introStart || (window.__v170 && (window.__v170.off || window.__v170.e > 30))))) { setPR(PRHI); busy = true; }   /* V183: telefonda yalnızca tam durgunken ve cihaz yavaş değilken (V170 bayrağı) yüksek çözünürlüğe geç */
      if (forceR > 0) forceR--;
      if (busy) { lastRK = k; lastRT = now; var _r0 = performance.now(); renderer.render(scene, camera); PF('gl.render(PR' + curPR.toFixed(2) + ')', _r0); }
    }   /* V60: savaş animasyonu kareleri; V63: savaş paneli açıkken küre seyrek çizilir */
  }

  /* ---------- Aç / kapat ---------- */
  function setBtn() { var b = $$('v30b'); if (b) { b.textContent = ON ? '2B' : '3B'; b.title = ON ? X('Düz harita', 'Flat map') : X('3B küre', '3D globe'); b.classList.toggle('on', ON); } }
  function doIntro() {   /* V96: gerçek küre çok uzaktan yaklaşır, yerine oturunca sinematik biter (sahte gezegen yok) */
    try {
      if (performance.now() - (window.__v101li || -9999) < 800) return; window.__v101li = performance.now();   /* V101: çift çağrı koruması */
      introShown = true; try { stage.classList.remove('v95out'); stage.classList.add('v91cover'); } catch (e) { }   /* V101: yıldızlı arka plan her zaman konur */
      var rm = document.body && document.body.classList.contains('rm');
      introDur = rm ? 1 : 3000; introFrom = rm ? zoomT : zoomT * 5.5; camZ = introFrom; introStart = performance.now();   /* V101: boş bekleme yok */
      if (G && G.ph === 'v7pick') { zoomT = 3.4; globe.quaternion.identity(); if (cMap.TUR) { focusOn(cMap.TUR, true); zoomT = 3.4; camZ = introFrom; } focusQ = null;   /* V213: yeni oyunda küre baştan Türkiye'ye bakar (eskiden sıfır konumdan yaklaşıp 1,5 sn sonra dönüyordu) */ setTimeout(warmHome, 200);   /* V158 */ setTimeout(function () { try { if (ON && G && G.ph === 'v7pick' && !G.sel && cMap.TUR) focusOn(cMap.TUR, false); } catch (e) { } }, rm ? 300 : 1500); }   /* önce dünya yerine oturur, sonra Türkiye */
      var cvs = renderer && renderer.domElement; if (!cvs) { try { stage.classList.remove('v91cover'); } catch (e) { } return; }
      cvs.style.transition = 'none'; cvs.style.opacity = '0'; try { camera.position.z = camZ * (window.innerWidth > window.innerHeight ? 0.7 : 1); renderer.render(scene, camera); } catch (e) { } /* V150: tampon uzak kamerayla doldurulur; eski yakın kare solarak görünmez */ void cvs.offsetWidth;
      cvs.style.transition = 'opacity .25s ease-out'; cvs.style.opacity = '1'; try { stage.classList.add('v95out'); } catch (e) { }   /* V101: küre anında görünür */
      setTimeout(function () { try { stage.classList.remove('v91cover'); stage.classList.remove('v95out'); } catch (e) { } }, 900);
    } catch (e) { try { stage.classList.remove('v91cover'); } catch (x) { } }
  }
  function show() {
    setTimeout(warmHome, 4000);   /* V181: devam eden oyunda da blokları GPU'ya önceden yükle (Seferi sürdür / 2B-3B geçişi) */
    ON = true; var _doI = (introNext || !introShown);   /* V101: yaklaşma animasyonu kapak sınıfına bağlı değil */ if (!_doI) { try { stage.classList.remove('v91cover'); } catch (e) { } try { var _cv0 = renderer && renderer.domElement; if (_cv0) { _cv0.style.transition = 'none'; _cv0.style.opacity = '1'; } } catch (e) { } } /* V150 */ setTimeout(function () { try { var _cv1 = renderer && renderer.domElement; if (_cv1 && _cv1.style.opacity === '0') { _cv1.style.transition = 'none'; _cv1.style.opacity = '1'; } } catch (e) { } }, 1500); /* V150: güvenlik ağı: tuval hiçbir koşulda gizli kalmaz */ setBtn(); $$('map').classList.add('v30on'); stage.style.display = 'block'; resize(); lastSig = ''; refresh(); focusHome(true);
    if (introNext || _doI) { introNext = false; doIntro(); }
    last = performance.now(); if (!rafId) rafId = requestAnimationFrame(loop);
  }
  function hide() { ON = false; setBtn(); $$('map').classList.remove('v30on'); stage.style.display = 'none'; setTimeout(function () { try { paint(); } catch (e) { } }, 0);   /* V162: 2B harita 3B açıkken boyanmıyordu; geri dönünce boya */ if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
  var prepWait = [];   /* V102: küreyi menü kapanmadan önce ("Sefer Başlıyor" perdesinin altında) kur; sinematik bekleme olmadan başlar */
  function prepDone() { var w = prepWait; prepWait = []; w.forEach(function (f) { try { f(); } catch (e) { } }); }
  window.v30Prep = function (cb) {
    if (READY || BAD || ON) return cb();
    prepWait.push(cb); if (LOADING) return;
    window.v30Toggle(true);
  };
  window.v30Toggle = function (prepOnly) {
    if (BAD || LOADING) return;
    if (ON) return;
    buildC();
    if (READY) return prepOnly === true ? prepDone() : show();
    LOADING = true; var b = $$('v30b'); if (b) b.classList.add('ld');
    Promise.all([loadScript('globe/three.min.js'), loadScript('globe/data.js'), loadScript('globe/tri.js').catch(function () { })]).then(build)   /* V142: üç dosya paralel indirilir/çözülür */.then(function () { LOADING = false; if (b) b.classList.remove('ld'); if (prepOnly === true && menuUp()) { afterWarm(prepDone); return; } show(); prepDone(); })   /* V102: menü zaten kapandıysa (yavaş cihaz, 9 sn aşıldı) küre hemen açılır */
      .catch(function (e) {
      /* V91: ilk kurulum hatasında (telefonda geçici bellek/doku/ağ hatası) hemen 2B haritaya düşme; yarım kalan tuvali temizleyip bir kez daha dene. */
      if (!window.__v91retry) { window.__v91retry = 1; try { stage.querySelectorAll('canvas').forEach(function (c) { c.remove(); }); if (renderer && renderer.dispose) renderer.dispose(); } catch (x) { } renderer = null; READY = false; LOADING = false; try { stage.style.display = 'block'; stage.classList.add('v91cover'); } catch (x) { } setTimeout(window.v30Toggle, 1200); return; }
      prepDone(); LOADING = false; BAD = true; try { stage.classList.remove('v91cover'); stage.style.display = 'none'; } catch (x) { } if (b) { b.classList.remove('ld'); b.style.display = 'none'; } try { toast(X('3B küre açılamadı; düz harita kullanılıyor', '3D globe unavailable; using flat map') + (e && e.message ? ' [' + String(e.message).slice(0, 60) + ']' : '')); } catch (x) { } try { console.error(e); } catch (x) { } });
  };

  /* ---------- Mevcut işlevlere ince bağlantılar (2B davranış aynen korunur) ---------- */
  var _paint = paint; paint = function () { var r = _paint.apply(this, arguments); dirty(); return r; };
  var _overlay = overlay; overlay = function () { var r = _overlay.apply(this, arguments); dirty(); return r; };
  var _focusSel = focusSel; focusSel = function () { if (ON && G && G.sel && cMap[G.sel]) focusOn(cMap[G.sel], false); return _focusSel.apply(this, arguments); };
  var _fitBattle = fitBattle; fitBattle = function (tg) { if (ON && cMap[tg]) focusOn(cMap[tg], false); return _fitBattle.apply(this, arguments); };
  var _zoomBy = zoomBy; zoomBy = function (f) { if (ON) { zoomT = Math.max(ZMIN3, Math.min(6, zoomT / Math.pow(f, .5))); return; } return _zoomBy.apply(this, arguments); };
  var _worldView = worldView; worldView = function () { var r = _worldView.apply(this, arguments); if (ON) { zoomT = 3.4; focusHome(false); zoomT = 3.4; } return r; };

  function addBtn() {
    var ctl = $$('ctl'), map = $$('map'); if (!ctl || !map || $$('v30b')) return;
    var b = document.createElement('button'); b.id = 'v30b'; b.type = 'button'; b.textContent = '3B'; b.title = X('3B küre', '3D globe'); b.setAttribute('onclick', 'void 0'); b.style.display = 'none'; ctl.appendChild(b);
    stage = document.createElement('div'); stage.id = 'g3d'; stage.style.display = 'none'; map.insertBefore(stage, map.firstChild);
    /* V201: V199'daki DOM halka/gren katmanları kaldırıldı (150vmin dönen SVG + mix-blend-mode gren = kasma). Aynı görüntü tek seferlik çizilen arka plan dokusu olarak sahnede (bg199). */
    if (window.ResizeObserver) new ResizeObserver(function () { if (ON) resize(); }).observe(stage); else window.addEventListener('resize', function () { if (ON) resize(); });
    /* V90: ana menü (v35, body.wcm-on) açıkken oyunun 3B küresi kurulmaz. Kurulum ~sn'lik ana-thread yükü; menü küresini kasıyordu.
       Menü kapanınca (oyun başlar / devam) kurulur. */
    if (DEFAULT_3D) {   /* V91: menü kapanır kapanmaz (yeni oyun / devam) kapak ANINDA konur; 2B harita bir an bile görünmez. Önceki 250 ms'lik yoklama aralığı kaldırıldı. */
      var _done = false, _seen = menuUp(), _mo = null;
      function _go() { if (_done) return; _done = true; try { if (_mo) _mo.disconnect(); } catch (e) { } if (!BAD) { try { stage.style.display = 'block'; stage.classList.add('v91cover'); } catch (e) { } } setTimeout(window.v30Toggle, 0); setTimeout(function () { if (!READY && !BAD) { try { stage.classList.remove('v91cover'); stage.style.display = 'none'; } catch (e) { } } }, 9000); }
      function _chk() { if (menuUp()) { _seen = true; return; } if (_seen) _go(); }
      if (window.MutationObserver && document.body) { _mo = new MutationObserver(_chk); _mo.observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
      var _t0 = Date.now(); (function wait() { if (_done) return; if (_seen && menuUp() && Date.now() - _t0 > 500) { if (window.requestIdleCallback) requestIdleCallback(preload, { timeout: 700 }); else preload(); }   /* V142: menü açılır açılmaz (0,5 sn) önyükleme; eskiden 1,5 sn + boşta bekleme */ _chk(); if (_done) return; if (!_seen && Date.now() - _t0 >= 3000) return _go(); setTimeout(wait, 250); })();
    }
  }
  /* V101: menü her kapandığında (Yeni Fetih / Seferi Sürdür, oturumda defalarca) dünya uzaktan yaklaşır */
  (function () {
    var wasUp = null;
    function arm() {
      if (!document.body || !window.MutationObserver) return setTimeout(arm, 200);
      wasUp = menuUp();
      new MutationObserver(function () {
        var u = menuUp();
        if (wasUp && !u) { try { if (ON && READY && stage) setTimeout(doIntro, 0); else { introNext = true; if (!BAD && stage) { try { stage.style.display = 'block'; stage.classList.add('v91cover'); } catch (x) { } } /* V102: 2B harita bir kare bile görünmesin */ if (!ON && READY && !BAD) setTimeout(window.v30Toggle, 0); } } catch (e) { } }
        wasUp = u;
      }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    arm();
  })();
  function menuUp() { return !!(document.body && document.body.classList.contains('wcm-on')); }
  var pzW = false;
  function pauseUp() { try { var m = document.getElementById('mod'); return !!(m && m.style.display === 'flex' && document.querySelector('#box .wc141p')); } catch (e) { return false; } }   /* V177 */
  if (document.readyState === 'complete') setTimeout(addBtn, 0); else window.addEventListener('load', function () { setTimeout(addBtn, 0); });
  try { var _ngI = window.newGame || newGame; newGame = function () { var r = _ngI.apply(this, arguments); try { if (ON && stage) doIntro(); else introNext = true; } catch (e) { } return r; }; } catch (e) { }
})();
