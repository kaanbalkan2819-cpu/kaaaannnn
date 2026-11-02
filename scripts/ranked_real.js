/* V119 — GERÇEKÇİ RANK MADALYALARI.
   Dışarıdan görsel/internet gerekmez: madalya bir yükseklik haritasından (kabartma) çizilir, ışık + metal yansıması
   hesaplanır, üstüne aşınma (patina/oksit), çizik, toz ve çukur eklenir. Her lig+kademe BİR KEZ üretilir, PNG olarak
   saklanır (oyun sırasında hesap yok = performans etkisi yok). Başarısız olursa eski SVG madalya devreye girer.
   Kendi görselini kullanmak istersen: www/medals/medal_<lig 0-5>.png koy (isteğe bağlı, ranked_art.js otomatik dener). */
(function () {
  'use strict';
  var W = 300, H = 360, SC = 1.5;            // 200x240 çizim birimi × 1.5
  var CX = 100, CY = 128;
  var cache = {};

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(x, y, s) { var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s) { return vnoise(x, y, s) * .5 + vnoise(x * 2.1, y * 2.1, s + 7) * .27 + vnoise(x * 4.3, y * 4.3, s + 13) * .15 + vnoise(x * 8.7, y * 8.7, s + 29) * .08; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }

  function boxBlur(src, w, h, r, passes) {
    var a = src, b = new Float32Array(w * h), p, x, y, i, acc, k, n = r * 2 + 1;
    for (p = 0; p < passes; p++) {
      for (y = 0; y < h; y++) {
        acc = 0; for (k = -r; k <= r; k++) acc += a[y * w + clamp(k, 0, w - 1)];
        for (x = 0; x < w; x++) { b[y * w + x] = acc / n; acc += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; }
      }
      for (x = 0; x < w; x++) {
        acc = 0; for (k = -r; k <= r; k++) acc += b[clamp(k, 0, h - 1) * w + x];
        for (y = 0; y < h; y++) { a[y * w + x] = acc / n; acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; }
      }
    }
    return a;
  }

  /* lig malzemeleri */
  var MAT = [
    { base: [178, 108, 58], dark: [64, 36, 20], tar: [58, 108, 88], tar2: [48, 30, 18], tarn: .88, dust: .78, scr: 1, edge: .85, pit: .9, sh: 26 },   // Bronz: ağır patina + toz
    { base: [208, 211, 218], dark: [70, 74, 86], tar: [74, 64, 58], tar2: [40, 36, 36], tarn: .72, dust: .58, scr: .95, edge: .55, pit: .35, sh: 40 },  // Gümüş: kararmış
    { base: [232, 180, 62], dark: [88, 56, 12], tar: [112, 84, 30], tar2: [66, 46, 14], tarn: .42, dust: .40, scr: .6, edge: .4, pit: .15, sh: 46 },       // Altın: hafif eskimiş
    { base: [196, 226, 224], dark: [40, 78, 80], tar: [90, 112, 112], tar2: [50, 66, 68], tarn: .22, dust: .18, scr: .5, edge: .2, pit: .05, sh: 60 },     // Platin
    { base: [150, 190, 238], dark: [24, 46, 96], tar: [70, 90, 130], tar2: [34, 46, 76], tarn: .14, dust: .12, scr: .35, edge: .15, pit: 0, sh: 70 },      // Elmas
    { base: [224, 98, 64], dark: [84, 20, 12], tar: [120, 60, 36], tar2: [60, 24, 14], tarn: .26, dust: .16, scr: .45, edge: .25, pit: .05, sh: 56 }      // Şampiyon
  ];
  var RIB = [[122, 31, 18], [45, 63, 122], [138, 29, 22], [15, 90, 86], [22, 54, 122], [94, 11, 23]];

  function path(ctx, pts, close) { var i; ctx.beginPath(); for (i = 0; i < pts.length; i++) ctx[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]); if (close) ctx.closePath(); }
  function teethPts(cx, cy, r1, r2, n) { var p = [], i, a, r; for (i = 0; i < n * 2; i++) { a = Math.PI * i / n - Math.PI / 2; r = i % 2 ? r1 : r2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }
  function starPts(cx, cy, R, r) { var p = [], i, a, q; for (i = 0; i < 10; i++) { a = Math.PI * i / 5 - Math.PI / 2; q = i % 2 ? r : R; p.push([cx + q * Math.cos(a), cy + q * Math.sin(a)]); } return p; }
  function gray(v) { var g = Math.round(clamp(v, 0, 1) * 255); return 'rgb(' + g + ',' + g + ',' + g + ')'; }

  /* ---- kabartma (yükseklik) haritası: gri = yükseklik ---- */
  function drawRelief(ctx, mctx, rctx, lgi, div) {
    var i, k, a, x, y;
    ctx.save(); ctx.scale(SC, SC);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 200, 240);
    /* taban disk + dişli kenar */
    ctx.fillStyle = gray(.30); ctx.beginPath(); ctx.arc(CX, CY, 88, 0, 7); ctx.fill();
    path(ctx, teethPts(CX, CY, 79, 88, 28), true); ctx.fillStyle = gray(.64); ctx.fill();
    ctx.fillStyle = gray(.52); ctx.beginPath(); ctx.arc(CX, CY, 75, 0, 7); ctx.fill();
    ctx.strokeStyle = gray(.7); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(CX, CY, 75, 0, 7); ctx.stroke();
    ctx.strokeStyle = gray(.34); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(CX, CY, 69, 0, 7); ctx.stroke();
    ctx.fillStyle = gray(.40); ctx.beginPath(); ctx.arc(CX, CY, 67, 0, 7); ctx.fill();
    /* inci/boncuk halka */
    for (k = 0; k < 40; k++) { a = k / 40 * 6.2832; ctx.fillStyle = gray(.6); ctx.beginPath(); ctx.arc(CX + 71.5 * Math.cos(a), CY + 71.5 * Math.sin(a), 1.6, 0, 7); ctx.fill(); }
    /* defne dalları */
    [1, -1].forEach(function (side) {
      for (k = 0; k < 9; k++) {
        var th = (22 + k * 15) * Math.PI / 180, lx = CX + side * 62 * Math.sin(th), ly = CY + 62 * Math.cos(th);
        var ph = Math.atan2(-Math.sin(th), side * Math.cos(th)) + (k % 2 ? .49 : -.49) * side;
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(ph);
        ctx.fillStyle = gray(.62); ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 3.8, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = gray(.82); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.restore();
      }
    });
    /* yüz diski */
    ctx.fillStyle = gray(.55); ctx.beginPath(); ctx.arc(CX, CY, 50, 0, 7); ctx.fill();
    ctx.strokeStyle = gray(.72); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(CX, CY, 50, 0, 7); ctx.stroke();
    ctx.strokeStyle = gray(.40); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(CX, CY, 45, 0, 7); ctx.stroke();
    /* çapraz kılıçlar */
    function sword(rot) {
      ctx.save(); ctx.translate(CX, CY); ctx.rotate(rot * Math.PI / 180); ctx.scale(.68, .68);
      path(ctx, [[0, -62], [7, -50], [7, 24], [-7, 24], [-7, -50]], true); ctx.fillStyle = gray(.82); ctx.fill();
      ctx.strokeStyle = gray(.66); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(0, 20); ctx.stroke();     // kan oluğu
      ctx.strokeStyle = gray(.95); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-6.4, -48); ctx.lineTo(-6.4, 22); ctx.moveTo(6.4, -48); ctx.lineTo(6.4, 22); ctx.stroke();
      ctx.fillStyle = gray(.95); ctx.beginPath(); ctx.moveTo(-22, 24); ctx.lineTo(22, 24); ctx.lineTo(22, 32); ctx.lineTo(-22, 32); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(-22, 28, 4.5, 0, 7); ctx.arc(22, 28, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = gray(.78); ctx.fillRect(-4.5, 32, 9, 20);
      ctx.strokeStyle = gray(.6); ctx.lineWidth = 1; for (k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-4.5, 34 + k * 3.2); ctx.lineTo(4.5, 36 + k * 3.2); ctx.stroke(); }
      ctx.fillStyle = gray(.98); ctx.beginPath(); ctx.arc(0, 56, 6.5, 0, 7); ctx.fill();
      ctx.restore();
    }
    sword(-42); sword(42);
    /* kalkan */
    ctx.save(); ctx.translate(CX, CY); ctx.scale(.8, .8); ctx.translate(-100, -128);
    ctx.beginPath(); ctx.moveTo(100, 100); ctx.lineTo(122, 107); ctx.lineTo(122, 131); ctx.quadraticCurveTo(122, 148, 100, 157); ctx.quadraticCurveTo(78, 148, 78, 131); ctx.lineTo(78, 107); ctx.closePath();
    ctx.fillStyle = gray(.9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(100, 106); ctx.lineTo(116, 111); ctx.lineTo(116, 130); ctx.quadraticCurveTo(116, 142, 100, 150); ctx.quadraticCurveTo(84, 142, 84, 130); ctx.lineTo(84, 111); ctx.closePath();
    ctx.fillStyle = gray(.70); ctx.fill();
    /* simge */
    ctx.fillStyle = gray(1);
    if (lgi === 5) { path(ctx, [[88, 138], [88, 121], [94, 130], [100, 117], [106, 130], [112, 121], [112, 138]], true); ctx.fill(); ctx.beginPath(); ctx.arc(88, 120, 2, 0, 7); ctx.arc(100, 115.5, 2.4, 0, 7); ctx.arc(112, 120, 2, 0, 7); ctx.fill(); }
    else if (lgi >= 3) { path(ctx, [[100, 113], [112, 126], [100, 143], [88, 126]], true); ctx.fill(); ctx.strokeStyle = gray(.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(88, 126); ctx.lineTo(112, 126); ctx.moveTo(100, 113); ctx.lineTo(100, 143); ctx.stroke(); }
    else { path(ctx, starPts(100, 128, 13, 5.5), true); ctx.fill(); if (lgi >= 1) { ctx.fillStyle = gray(.85); ctx.beginPath(); ctx.arc(100, 128, 2.2, 0, 7); ctx.fill(); } }
    ctx.restore();
    /* yakut taşlar (kubbe) */
    [45, 135, 225, 315].forEach(function (d) {
      var t = d * Math.PI / 180, rx = CX + 83.5 * Math.cos(t), ry = CY + 83.5 * Math.sin(t), g = ctx.createRadialGradient(rx - 1, ry - 1, .5, rx, ry, 4.4);
      g.addColorStop(0, gray(.98)); g.addColorStop(1, gray(.62)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(rx, ry, 4.4, 0, 7); ctx.fill();
      mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.arc(rx * SC, ry * SC, 4.4 * SC, 0, 7); mctx.fill();
    });
    /* kurdele halkası */
    ctx.strokeStyle = gray(.9); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(100, 44, 9, 0, 7); ctx.stroke();
    ctx.strokeStyle = gray(.55); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(100, 44, 9, 0, 7); ctx.stroke();
    /* alt plaket */
    path(ctx, [[44, 190], [156, 190], [148, 204], [156, 218], [44, 218], [52, 204]], true); ctx.fillStyle = gray(.66); ctx.fill();
    ctx.strokeStyle = gray(.88); ctx.lineWidth = 2.6; ctx.stroke();
    path(ctx, [[44, 190], [28, 198], [36, 204], [28, 214], [44, 218]], false); ctx.fillStyle = gray(.56); ctx.fill(); ctx.strokeStyle = gray(.8); ctx.lineWidth = 1.6; ctx.stroke();
    path(ctx, [[156, 190], [172, 198], [164, 204], [172, 214], [156, 218]], false); ctx.fillStyle = gray(.56); ctx.fill(); ctx.stroke();
    ctx.fillStyle = gray(.98); ctx.font = '700 23px Georgia,"Times New Roman",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var rom = lgi === 5 ? '\u2605' : ['', 'I', 'II', 'III'][div] || '';
    if (rom) { ctx.lineWidth = 1.2; ctx.strokeStyle = gray(.98); ctx.fillText(rom, 100, 211.5); ctx.strokeText(rom, 100, 211.5); }
    ctx.restore();

    /* madalya (metal) maskesi: halka + disk + plaket */
    mctx.save(); mctx.scale(SC, SC); mctx.fillStyle = '#fff';
    mctx.beginPath(); mctx.arc(CX, CY, 88.2, 0, 7); mctx.fill();
    mctx.lineWidth = 5; mctx.strokeStyle = '#fff'; mctx.beginPath(); mctx.arc(100, 44, 9, 0, 7); mctx.stroke();
    path(mctx, [[44, 190], [28, 198], [36, 204], [28, 214], [44, 218], [156, 218], [172, 214], [164, 204], [172, 198], [156, 190]], true); mctx.fill();
    mctx.restore();
  }

  /* ---- kurdele ---- */
  function drawRibbon(ctx, lgi) {
    var c = RIB[lgi], r = c[0], g = c[1], b = c[2], i;
    ctx.save(); ctx.scale(SC, SC);
    function tail(pts, flip) {
      var gr = ctx.createLinearGradient(pts[0][0], 0, pts[1][0], 0);
      gr.addColorStop(0, 'rgb(' + (r * .55 | 0) + ',' + (g * .55 | 0) + ',' + (b * .55 | 0) + ')');
      gr.addColorStop(.18, 'rgb(' + r + ',' + g + ',' + b + ')');
      gr.addColorStop(.5, 'rgb(' + Math.min(255, r * 1.5 | 0) + ',' + Math.min(255, g * 1.5 + 14 | 0) + ',' + Math.min(255, b * 1.5 + 10 | 0) + ')');
      gr.addColorStop(.82, 'rgb(' + r + ',' + g + ',' + b + ')');
      gr.addColorStop(1, 'rgb(' + (r * .5 | 0) + ',' + (g * .5 | 0) + ',' + (b * .5 | 0) + ')');
      ctx.fillStyle = gr; path(ctx, pts, true); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(214,176,92,.85)'; ctx.lineWidth = 1.6;
      var dx = (pts[2][0] - pts[0][0]) / 86, off = [.14, .86];
      off.forEach(function (o) { ctx.beginPath(); ctx.moveTo(mix(pts[0][0], pts[1][0], o), 4); ctx.lineTo(mix(pts[3][0], pts[2][0], o), 90); ctx.stroke(); });
      ctx.restore();
      ctx.strokeStyle = 'rgba(8,3,3,.75)'; ctx.lineWidth = 1.2; path(ctx, pts, true); ctx.stroke();
    }
    tail([[58, 4], [96, 4], [128, 90], [92, 90]]);
    tail([[142, 4], [104, 4], [72, 90], [108, 90]]);
    ctx.restore();
  }

  function render(lgi, div) {
    lgi = clamp(lgi | 0, 0, 5); div = div | 0;
    var key = lgi + ':' + div;
    if (cache[key]) return cache[key];
    var seed = 1000 + lgi * 97 + div * 13, R = rng(seed), M = MAT[lgi];
    var hc = mk(W, H), mc = mk(W, H), rc = mk(W, H);
    var hx = hc.getContext('2d'), mx = mc.getContext('2d'), rx = rc.getContext('2d');
    mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
    drawRelief(hx, mx, rx, lgi, div); drawRibbon(rx, lgi);
    var hd = hx.getImageData(0, 0, W, H).data, md = mx.getImageData(0, 0, W, H).data, rd = rx.getImageData(0, 0, W, H).data;
    var N = W * H, hm = new Float32Array(N), i, x, y;
    for (i = 0; i < N; i++) hm[i] = hd[i * 4] / 255;
    /* madalya gövdesi: maske (ruby ayrı: B kanalı kullanılmaz; ruby = md R, metal = alfa-benzeri) */
    var metal = new Float32Array(N), ruby = new Float32Array(N);
    /* ruby: mx'e sadece ruby çizilmişti BAŞTA; metal maskesi sonra eklendi -> ayırmak için ikinci okuma yap */
    for (i = 0; i < N; i++) metal[i] = md[i * 4] / 255;
    /* yakut ayrımı: yükseklik > .6 ve konum 83.5 yarıçap civarı */
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var ux = x / SC - CX, uy = y / SC - CY, rr = Math.sqrt(ux * ux + uy * uy);
      if (rr > 78.5 * 1 && rr < 88.5) { var ang = Math.atan2(uy, ux) * 180 / Math.PI; var dd = Math.min(Math.abs(ang - 45), Math.abs(ang - 135), Math.abs(ang + 45), Math.abs(ang + 135)); if (dd < 3.3 && hm[y * W + x] > .6) ruby[y * W + x] = 1; }
    }
    /* çukurlar (yük): rastgele darbe izleri */
    var dents = 3 + (lgi < 3 ? 3 : 0) + (R() * 3 | 0);
    for (i = 0; i < dents; i++) {
      var dx0 = (CX + (R() - .5) * 150) * SC, dy0 = (CY + (R() - .5) * 150) * SC, dr = (2 + R() * 4) * SC, dp = (.05 + R() * .08) * M.scr;
      for (y = Math.max(0, dy0 - dr * 2 | 0); y < Math.min(H, dy0 + dr * 2); y++) for (x = Math.max(0, dx0 - dr * 2 | 0); x < Math.min(W, dx0 + dr * 2); x++) { var q = ((x - dx0) * (x - dx0) + (y - dy0) * (y - dy0)) / (dr * dr); hm[y * W + x] -= dp * Math.exp(-q * 1.2); }
    }
    /* küçük hafif yüzey dalgalanması (dökümden kalan düzensizlik) */
    for (i = 0; i < N; i++) { x = i % W; y = i / W | 0; hm[i] += (fbm(x * .06, y * .06, seed) - .5) * .05 * (.4 + M.tarn) + (hash(x, y, seed) - .5) * .012; }
    /* yumuşat → keskin sınırları yuvarlat */
    var hb = boxBlur(Float32Array.from(hm), W, H, 1, 2);
    var big = boxBlur(Float32Array.from(hm), W, H, 6, 3);

    /* çiziklerin tuvali */
    var sc = mk(W, H), sx = sc.getContext('2d'); sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
    var nsc = Math.round(70 * M.scr + 10);
    sx.lineCap = 'round';
    for (i = 0; i < nsc; i++) {
      var ax = CX * SC + (R() - .5) * 190 * SC * .9, ay = CY * SC + (R() - .5) * 190 * SC * .9, len = (6 + R() * R() * 60) * SC, an = (R() < .6 ? -.5 + R() * .4 : R() * 3.14), l = 20 + R() * 110;
      sx.strokeStyle = 'rgb(' + (l | 0) + ',' + (l | 0) + ',' + (l | 0) + ')'; sx.lineWidth = .5 + R() * .7;
      sx.beginPath(); sx.moveTo(ax, ay); sx.lineTo(ax + Math.cos(an) * len, ay + Math.sin(an) * len); sx.stroke();
    }
    var sd = sx.getImageData(0, 0, W, H).data;

    var out = mk(W, H), ox = out.getContext('2d'), od = ox.createImageData(W, H), o = od.data;
    var Lx = -.52, Ly = -.66, Lz = .54, ll = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz); Lx /= ll; Ly /= ll; Lz /= ll;
    var Hx = Lx, Hy = Ly, Hz = Lz + 1, hl = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz); Hx /= hl; Hy /= hl; Hz /= hl;
    var K = 7.5, base = M.base, dark = M.dark;
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      i = y * W + x;
      var rb = rd[i * 4 + 3] / 255, mt = metal[i];
      var px = 0, pr = 0, pg = 0, pb = 0, pa = 0;
      if (mt > .02) {
        var dx = (hb[i + 1] - hb[i - 1]) * K, dy = (hb[i + W] - hb[i - W]) * K, nl = Math.sqrt(dx * dx + dy * dy + 1), nx = -dx / nl, ny = -dy / nl, nz = 1 / nl;
        var diff = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
        var nh = Math.max(0, nx * Hx + ny * Hy + nz * Hz);
        var rx0 = 2 * nz * nx, ry0 = 2 * nz * ny;                          // yansıma yönü
        var up = -ry0, soft = Math.exp(-((rx0 + .55) * (rx0 + .55) + (ry0 + .6) * (ry0 + .6)) * 3.2), fill = Math.exp(-((rx0 - .7) * (rx0 - .7) + (ry0 - .35) * (ry0 - .35)) * 5);
        var env = .16 + .5 * sstep(-.55, .9, up) + .95 * soft + .3 * fill;
        env *= 1 - .55 * sstep(.15, .9, ry0) * (1 - sstep(.5, 1, up));       // zemin yansıması koyu
        var cav = clamp((big[i] - hm[i]) * 3.2, 0, 1);                      // çukur (AO)
        var edge = clamp((hm[i] - big[i]) * 3.4, 0, 1);                     // çıkıntı kenarı
        var gx = x / 14, gy = y / 14;
        var tn = clamp((fbm(gx * .9, gy * .9, seed + 3) - .32) * 2.4, 0, 1);  // lekeli oksit alanı
        var tarn = clamp((tn * .75 + cav * 1.4 + fbm(x * .25, y * .25, seed + 5) * .25 - .22) * M.tarn * 1.5, 0, 1) * (1 - edge * M.edge * .9);
        var ao = 1 - cav * .55;
        var shade = (.22 + env * .98) * (.7 + diff * .45) * ao;
        var rr_ = base[0] * shade, gg_ = base[1] * shade, bb_ = base[2] * shade;
        /* yansıma tonu: gölgede koyu metal rengi */
        var dk = 1 - clamp(shade * 1.1, 0, 1);
        rr_ = mix(rr_, dark[0] * .9, dk * .35); gg_ = mix(gg_, dark[1] * .9, dk * .35); bb_ = mix(bb_, dark[2] * .9, dk * .35);
        /* parlak vurgu */
        var sp = Math.pow(nh, M.sh) * (1 - tarn * .85) * 1.1;
        rr_ += 255 * sp * .85 + base[0] * sp * .3; gg_ += 255 * sp * .85 + base[1] * sp * .3; bb_ += 255 * sp * .85 + base[2] * sp * .3;
        /* oksit / patina: mat, yansımasız */
        if (tarn > 0) {
          var tc = M.tar, tc2 = M.tar2, tt = clamp(fbm(x * .11, y * .11, seed + 9) * 1.4, 0, 1), lum = .5 + .5 * (nx * Lx + ny * Ly) + .25;
          var tr = mix(tc2[0], tc[0], tt) * lum, tg = mix(tc2[1], tc[1], tt) * lum, tb = mix(tc2[2], tc[2], tt) * lum;
          var ta = tarn * .88;
          rr_ = mix(rr_, tr, ta); gg_ = mix(gg_, tg, ta); bb_ = mix(bb_, tb, ta);
        }
        /* çukur (pitting): bronz/gümüşte küçük koyu noktalar */
        if (M.pit > 0) { var pt = hash(x >> 1, y >> 1, seed + 21); if (pt > 1 - .035 * M.pit - cav * .02) { var pq = .55 + pt * .2; rr_ *= pq; gg_ *= pq; bb_ *= pq; } }
        /* çizikler */
        var scv = sd[i * 4] / 255;
        if (scv > 0) { var sa = scv * .85 * M.scr; if (nx * Lx + ny * Ly > -.1) { rr_ = mix(rr_, 245, sa * .55); gg_ = mix(gg_, 245, sa * .55); bb_ = mix(bb_, 240, sa * .55); } else { rr_ *= 1 - sa * .5; gg_ *= 1 - sa * .5; bb_ *= 1 - sa * .5; } }
        /* kenar aşınması: açıkta kalan parlak metal */
        if (edge > .25 && M.edge > .2) { var ew = (edge - .25) * M.edge * (fbm(x * .3, y * .3, seed + 31) > .42 ? 1.1 : .35); rr_ += base[0] * .35 * ew; gg_ += base[1] * .35 * ew; bb_ += base[2] * .35 * ew; }
        /* toz: çukurlarda birikir, düzgün alanda ince sis */
        var dust = M.dust * clamp(.28 + cav * 1.7 + fbm(x * .5, y * .5, seed + 41) * .7 - .28, 0, 1) * (1 - sp * .5);
        dust += M.dust * .22 * (y / H);                                      // alt kısımda daha çok
        dust = clamp(dust, 0, .7);
        var dn = .8 + hash(x, y, seed + 55) * .35;
        rr_ = mix(rr_, 156 * dn, dust * .7); gg_ = mix(gg_, 140 * dn, dust * .7); bb_ = mix(bb_, 114 * dn, dust * .7);
        /* yakut */
        if (ruby[i] > .5) {
          var rs = .35 + .75 * diff, rg = Math.pow(nh, 36);
          rr_ = 150 * rs + 255 * rg; gg_ = 14 * rs + 210 * rg; bb_ = 18 * rs + 205 * rg;
          rr_ = mix(rr_, 156 * dn, M.dust * .35); gg_ = mix(gg_, 140 * dn, M.dust * .35); bb_ = mix(bb_, 114 * dn, M.dust * .35);
        }
        pr = rr_; pg = gg_; pb = bb_; pa = mt;
      }
      if (rb > .02 && pa < 1) {
        /* kurdele: dokuma + kıvrım gölgesi + toz */
        var wv = .86 + .14 * Math.sin(x * 1.9) * Math.sin(y * 1.7) + (hash(x, y, seed + 70) - .5) * .12;
        var fold = .82 + .26 * Math.sin(y / 9 + x / 23 + fbm(x * .05, y * .05, seed) * 3);
        var dustR = M.dust * .9 * clamp(fbm(x * .2, y * .2, seed + 81) * 1.3 - .1, 0, 1);
        var fr = rd[i * 4] * wv * fold, fg = rd[i * 4 + 1] * wv * fold, fb = rd[i * 4 + 2] * wv * fold;
        fr = mix(fr, 150, dustR * .55); fg = mix(fg, 136, dustR * .55); fb = mix(fb, 112, dustR * .55);
        if (pa <= 0) { pr = fr; pg = fg; pb = fb; pa = rb; }
        else { pr = mix(fr, pr, pa); pg = mix(fg, pg, pa); pb = mix(fb, pb, pa); pa = 1; }
      }
      o[i * 4] = clamp(pr, 0, 255); o[i * 4 + 1] = clamp(pg, 0, 255); o[i * 4 + 2] = clamp(pb, 0, 255); o[i * 4 + 3] = clamp(pa * 255, 0, 255);
    }
    var fin = mk(W, H), fx = fin.getContext('2d'), tmp = mk(W, H); tmp.getContext('2d').putImageData(od, 0, 0);
    fx.shadowColor = 'rgba(0,0,0,.55)'; fx.shadowBlur = 9; fx.shadowOffsetX = 2; fx.shadowOffsetY = 5; fx.drawImage(tmp, 0, 0);
    fx.shadowColor = 'transparent'; fx.drawImage(tmp, 0, 0);
    var url = fin.toDataURL('image/png');
    cache[key] = url; return url;
  }

  window.WCRealMedal = { render: render, W: W, H: H };
})();
