/* V218 — Ana menü: arka plandaki atlas küresi akıcı döner.
   Eski sürümler (v158 / v213) dokununca kıtaları ±60°'de AYNALIYORDU (kıtalar dönerken geri dönüyor gibi görünüyordu),
   en yakın piksel örneklemesi titretiyordu ve tek dokunuşta 1,4 sn'lik ani bir tur atılıyordu.
   Yeni: yüzey 120°'lik bantların yumuşak geçişle (çapraz karışım) tekrarıyla HEP AYNI YÖNDE akar, yatay çift doğrusal örnekleme,
   menüdeyken çok yavaş sürekli dönüş (≈4°/sn) + dokununca yumuşak ivme ve doğal yavaşlama (sürtünme). Işık/gölge fotoğraftaki yerinde kalır,
   önündeki pirinç halka ve kenarlar dokunulmaz. Menü kapalıyken / sekme gizliyken çizim durur.
   Geri almak için index.html'den v218.js bağlantısını silin ve v213.js / v158.js içindeki "V218" return satırlarını kaldırın. */
(function () {
  'use strict';
  var IW = 800, IH = 1200, GX = 401, GY = 248, GR = 160, N = GR * 2;
  var P = 2 * Math.PI / 3, HALF = P / 2, BL0 = 45 * Math.PI / 180, BLW = 30 * Math.PI / 180;   /* bant periyodu 120°, karışım 45°..75° */
  var IDLE = 4 * Math.PI / 180, KICK = 1.25, TAU = 1.1;   /* rad/sn; dokunuş ivmesi; yavaşlama süresi (sn) */
  var data = null, busy = false, cv = null, ctx = null, out = null, phase = 0, vel = 0, raf = 0, last = 0, acc = 0, drawn = false;

  function bgEl() { return document.querySelector('#wcm .bgimg'); }
  function menuOn() { return document.body && document.body.classList.contains('wcm-on') && !document.hidden; }
  function sm(x, a, b) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  function prep(img) {
    var c = document.createElement('canvas'); c.width = c.height = N; var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, GX - GR, GY - GR, N, N, 0, 0, N, N);
    var src = x.getImageData(0, 0, N, N).data, n = N * N, i;
    var lum = new Float32Array(n); for (i = 0; i < n; i++) lum[i] = src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11;
    function blur(a, rad) {   /* kutu bulanıklığı (yatay + dikey) */
      var t = new Float32Array(n), y, xx, s, k;
      for (y = 0; y < N; y++) { s = 0; for (k = -rad; k <= rad; k++) s += a[y * N + Math.min(N - 1, Math.max(0, k))]; for (xx = 0; xx < N; xx++) { t[y * N + xx] = s / (2 * rad + 1); s += a[y * N + Math.min(N - 1, xx + rad + 1)] - a[y * N + Math.max(0, xx - rad)]; } }
      for (xx = 0; xx < N; xx++) { s = 0; for (k = -rad; k <= rad; k++) s += t[Math.min(N - 1, Math.max(0, k)) * N + xx]; for (y = 0; y < N; y++) { a[y * N + xx] = s / (2 * rad + 1); s += t[Math.min(N - 1, y + rad + 1) * N + xx] - t[Math.max(0, y - rad) * N + xx]; } }
    }
    var S = new Float32Array(lum); blur(S, 14); blur(S, 14); blur(S, 14);   /* ışık haritası */
    var T = new Float32Array(n * 3), lon = new Float32Array(n), wrow = new Float32Array(N), msk = new Float32Array(n);
    for (i = 0; i < n; i++) { var sv = Math.max(6, S[i]); T[i * 3] = src[i * 4] / sv; T[i * 3 + 1] = src[i * 4 + 1] / sv; T[i * 3 + 2] = src[i * 4 + 2] / sv; }
    for (var y = 0; y < N; y++) {
      var v = (y + .5 - GR) / GR, w = Math.sqrt(Math.max(0, 1 - v * v)); wrow[y] = w;
      for (var xx = 0; xx < N; xx++) {
        var k2 = y * N + xx, u = (xx + .5 - GR) / GR, rho = Math.sqrt(u * u + v * v);
        lon[k2] = w > 1e-3 ? Math.asin(Math.max(-1, Math.min(1, u / w))) : 0;
        /* önündeki eğik pirinç halka (fotoğrafta soldan sağa hafif aşağı iner) ve kenar: maske 0 = fotoğraf görünür */
        var ix = xx + GX - GR, iy = y + GY - GR, ringY = 260 + (ix - 241) * (25 / 320), dist = Math.abs(iy - ringY);
        msk[k2] = (1 - sm(rho, .88, .955)) * sm(dist, 10, 16);
      }
    }
    return { S: S, T: T, lon: lon, w: wrow, m: msk };
  }
  /* satır y'de boylam l (rad, -π/2..π/2 dışında da olabilir) için çift doğrusal yatay örnek -> o[k..k+2] */
  function sampleInto(o, k, y, l, sh, a) {
    var w = data.w[y], sx = GR + w * Math.sin(l) * GR - .5; if (sx < 0) sx = 0; else if (sx > N - 1.001) sx = N - 1.001;
    var x0 = sx | 0, f = sx - x0, i0 = (y * N + x0) * 3, i1 = i0 + 3, T = data.T;
    o[0] += (T[i0] * (1 - f) + T[i1] * f) * sh * a; o[1] += (T[i0 + 1] * (1 - f) + T[i1 + 1] * f) * sh * a; o[2] += (T[i0 + 2] * (1 - f) + T[i1 + 2] * f) * sh * a;
  }
  var tmp = [0, 0, 0];
  function render() {
    var o = out.data, S = data.S, LON = data.lon, MSK = data.m, k = 0;
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++, k += 4) {
        var i = y * N + x, m = MSK[i]; if (m <= .004) { o[k + 3] = 0; continue; }
        var l = LON[i] - phase, t = l + HALF; t = t - P * Math.floor(t / P) - HALF;   /* [-60°, 60°) */
        var e = Math.abs(t), wb = e > BL0 ? (e - BL0) / BLW : 0, sh = S[i];
        tmp[0] = tmp[1] = tmp[2] = 0;
        sampleInto(tmp, 0, y, t, sh, 1 - wb);
        if (wb > 0) sampleInto(tmp, 0, y, t > 0 ? t - P : t + P, sh, wb);
        o[k] = tmp[0] > 255 ? 255 : tmp[0]; o[k + 1] = tmp[1] > 255 ? 255 : tmp[1]; o[k + 2] = tmp[2] > 255 ? 255 : tmp[2]; o[k + 3] = m * 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }
  /* .bgimg transform ile büyütülmüş olabilir: hesap öğenin kendi (dönüştürülmemiş) koordinatlarında */
  function geom(bg) {
    var r = bg.getBoundingClientRect(), w = bg.offsetWidth || r.width, h = bg.offsetHeight || r.height, s = Math.max(w / IW, h / IH), cs = getComputedStyle(bg), bp = (cs.backgroundPosition || '50% 0%').split(' ');
    function pc(v, free) { v = v || '50%'; if (/%$/.test(v)) return parseFloat(v) / 100 * free; return parseFloat(v) || 0; }
    return { r: r, kx: r.width / w, ky: r.height / h, s: s, ox: pc(bp[0], w - IW * s), oy: pc(bp[1] || '0%', h - IH * s) };
  }
  function ensure() {
    var bg = bgEl(); if (!bg || !data) return false;
    if (!cv || cv.parentNode !== bg) {
      cv = document.createElement('canvas'); cv.className = 'glb218'; cv.width = cv.height = N; ctx = cv.getContext('2d'); out = ctx.createImageData(N, N);
      if (getComputedStyle(bg).position === 'static') bg.style.position = 'relative';
      bg.insertBefore(cv, bg.firstChild); drawn = false;
    }
    var g = geom(bg);
    cv.style.left = (g.ox + (GX - GR) * g.s) + 'px'; cv.style.top = (g.oy + (GY - GR) * g.s) + 'px'; cv.style.width = cv.style.height = (N * g.s) + 'px';
    return true;
  }
  function loop(now) {
    raf = 0; if (!menuOn() || !data) { last = 0; return; }
    if (!ensure()) { raf = requestAnimationFrame(loop); return; }
    var dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
    vel *= Math.exp(-dt / TAU); if (vel < .002) vel = 0;
    var spd = IDLE + vel; phase += spd * dt; if (phase > 1e4) phase -= P * Math.floor(phase / P);
    /* boşta yavaş dönüşte 30 kare/sn yeter (pil); dokunuş ivmesinde her kare */
    acc += dt;
    if (!drawn || vel > .05 || acc >= 1 / 30) { acc = 0; render(); if (!drawn) { drawn = true; requestAnimationFrame(function () { if (cv) cv.classList.add('on'); }); } }
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && menuOn() && data) raf = requestAnimationFrame(loop); }
  function load() {
    if (data || busy) return; busy = true;
    var bg = bgEl(), m = bg && /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(bg).backgroundImage || ''), url = m ? m[1] : ((window.WC_MENU && WC_MENU.bg) || 'assets/menu/bg.webp');
    var im = new Image(); im.onload = function () { try { if ((im.naturalWidth || IW) === IW && (im.naturalHeight || IH) === IH) data = prep(im); } catch (e) { data = null; } busy = false; kick(); };
    im.onerror = function () { busy = false; }; im.src = url;
  }
  function hit(bg, cx, cy) { var g = geom(bg), lx = (cx - g.r.left) / g.kx, ly = (cy - g.r.top) / g.ky; return Math.hypot(lx - (g.ox + GX * g.s), ly - (g.oy + GY * g.s)) < GR * g.s * .95; }
  document.addEventListener('click', function (e) {
    try {
      if (!menuOn()) return; var bg = bgEl(); if (!bg) return;
      var crest = e.target && e.target.closest && e.target.closest('#wcm .crest');
      if (!crest) { if (e.target.closest && e.target.closest('button,a,input,.mb,[data-a]')) return; if (!hit(bg, e.clientX, e.clientY)) return; }
      vel = Math.min(vel + KICK, KICK * 2.2); load(); kick();
    } catch (x) { }
  }, true);
  /* menü açılınca hazırla ve döndürmeye başla; menü yeniden kurulursa tuval yeniden eklenir */
  setInterval(function () { try { if (menuOn()) { if (!data) (window.requestIdleCallback || setTimeout)(load); else kick(); } } catch (e) { } }, 700);
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('resize', function () { try { if (cv && data) ensure(); } catch (e) { } });
})();
