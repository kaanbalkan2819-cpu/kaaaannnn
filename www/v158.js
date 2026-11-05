/* V158 → V193 — Ana menüde küre amblemine (.crest) dokununca ÖNDEKİ amblem değil, ARKADAKİ küre (arka plan resmindeki dünya) döner.
   Her dokunuşta bir turun %15'i (54°), yumuşak yavaşlayarak. Küre yüzeyi (kıtalar) yatayda küresel eşlemeyle kayar; ışık/gölge (düşük frekans) yerinde kalır,
   pirinç halka ve kenar bölgesi dokunulmaz. Resim okunamazsa (canvas kısıtı) sessizce hiçbir şey yapmaz.
   Menü yeniden kurulunca tuval yeniden eklenir ve son açıyla çizilir. Geri almak için index.html'den v158.js bağlantısını silin (veya V192 sürümüyle değiştirin). */
(function () {
  'use strict';
  var CX = 401, CY = 255, R = 155, D = R * 2, STEP = Math.PI * 2 * 0.15, DUR = 900;   /* küre: bg.webp (800x1200) üzerinde merkez/yarıçap */
  var ang = 0, from = 0, to = 0, t0 = 0, raf = 0, ready = 0, cv = null, ctx = null, out = null;
  var lon, cl, msk, det, base, sx0 = 0, bgW = 800;
  var st = document.createElement('style');
  st.textContent = '#wcm .crest{cursor:pointer;pointer-events:auto!important;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}';
  (document.head || document.documentElement).appendChild(st);

  function sm(x, a, b) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  function prep(img) {
    try {
      var k = img.naturalWidth / 800, oc = document.createElement('canvas'); oc.width = oc.height = D;
      var c = oc.getContext('2d'); c.drawImage(img, (CX - R) * k, (CY - R) * k, D * k, D * k, 0, 0, D, D);
      var src = c.getImageData(0, 0, D, D).data, n = D * D, hasB = false;
      var bc = document.createElement('canvas'); bc.width = bc.height = D; var b = bc.getContext('2d'), bd = null;
      if ('filter' in b) { b.filter = 'blur(22px)'; b.drawImage(oc, 0, 0); b.filter = 'none'; bd = b.getImageData(0, 0, D, D).data; hasB = true; }
      lon = new Float32Array(n); cl = new Float32Array(n); msk = new Float32Array(n); det = new Float32Array(n * 3); base = new Uint8ClampedArray(n * 3);
      for (var y = 0; y < D; y++) for (var x = 0; x < D; x++) {
        var i = y * D + x, u = (x + .5 - R) / R, v = (y + .5 - R) / R, rho = Math.sqrt(u * u + v * v);
        cl[i] = Math.sqrt(Math.max(0, 1 - v * v)); lon[i] = Math.atan2(u, Math.sqrt(Math.max(0, 1 - rho * rho)));
        var ximg = x + CX - R, yimg = y + CY - R, ring = 262 + (ximg - 210) * (20 / 380), dist = Math.abs(yimg - ring);
        msk[i] = (1 - sm(rho, .86, .95)) * sm(dist, 8, 14);
        for (var ch = 0; ch < 3; ch++) {
          var s = src[i * 4 + ch], bv = hasB ? bd[i * 4 + ch] : 0;
          if (hasB) { det[i * 3 + ch] = s / (bv + 6); base[i * 3 + ch] = bv + 6; } else { det[i * 3 + ch] = s; base[i * 3 + ch] = 1; }
        }
      }
      ready = 1;
    } catch (e) { ready = -1; }
  }
  function load() {
    if (ready) return; ready = 2;
    var img = new Image(); img.onload = function () { prep(img); if (ready === 1 && ang) { ensure(); draw(); } };
    img.onerror = function () { ready = -1; };
    img.src = (window.WC_MENU && window.WC_MENU.bg) || 'assets/menu/bg.webp';
  }
  function ensure() {
    var bg = document.querySelector('#wcm .bgimg'); if (!bg) { cv = null; return false; }
    if (!cv || cv.parentNode !== bg) {
      cv = document.createElement('canvas'); cv.width = cv.height = D; cv.style.cssText = 'position:absolute;pointer-events:none';
      bg.insertBefore(cv, bg.firstChild); ctx = cv.getContext('2d'); out = ctx.createImageData(D, D);
    }
    var W = bg.clientWidth, H = bg.clientHeight, s = Math.max(W / 800, H / 1200), offx = (W - 800 * s) / 2;   /* background-size:cover; position:50% 0 */
    cv.style.left = (offx + (CX - R) * s) + 'px'; cv.style.top = ((CY - R) * s) + 'px'; cv.style.width = cv.style.height = (D * s) + 'px';
    return true;
  }
  function draw() {
    if (ready !== 1 || !ensure()) return;
    var o = out.data, TP = Math.PI * 2, HP = Math.PI / 2, n = D * D;
    for (var y = 0; y < D; y++) {
      var row = y * D;
      for (var x = 0; x < D; x++) {
        var i = row + x, m = msk[i];
        if (m <= .003) { o[i * 4 + 3] = 0; continue; }
        var l = lon[i] - ang; l = l - TP * Math.floor((l + Math.PI) / TP);   /* (-π, π] */
        if (l > HP) l = Math.PI - l; else if (l < -HP) l = -Math.PI - l;      /* görünmeyen yarım: yansıtılmış doku */
        var sx = R + R * cl[i] * Math.sin(l) - .5; if (sx < 0) sx = 0; else if (sx > D - 1.001) sx = D - 1.001;
        var x0 = sx | 0, f = sx - x0, a = (row + x0) * 3, bb = (row + x0 + 1) * 3, j = i * 3;
        for (var ch = 0; ch < 3; ch++) {
          var d = det[a + ch] * (1 - f) + det[bb + ch] * f, v = base[j + ch] * d;
          o[i * 4 + ch] = v > 255 ? 255 : v;
        }
        o[i * 4 + 3] = m * 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }
  function tick(t) {
    var p = Math.min(1, (t - t0) / DUR), e = 1 - Math.pow(1 - p, 3);
    ang = from + (to - from) * e; draw();
    raf = p < 1 ? requestAnimationFrame(tick) : 0;
  }
  document.addEventListener('click', function (e) {
    try {
      var t = e.target && e.target.closest ? e.target.closest('#wcm .crest') : null; if (!t) return;
      load(); if (ready !== 1) { if (ready === 2) { setTimeout(function () { try { t.click(); } catch (x) { } }, 150); } return; }
      from = ang; to = (raf ? to : ang) + STEP; t0 = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    } catch (x) { }
  }, true);
  /* menü yeniden kurulunca tuval yeniden eklensin ve son açıyla çizilsin */
  var pend = 0;
  new MutationObserver(function () {
    if (pend || !ang) return; pend = requestAnimationFrame(function () { pend = 0; try { if (ready === 1 && !raf) { var bg = document.querySelector('#wcm .bgimg'); if (bg && (!cv || cv.parentNode !== bg)) { ensure(); draw(); } } } catch (x) { } });
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', function () { try { if (cv) ensure(); } catch (x) { } });
  setTimeout(load, 1500);   /* resmi önceden hazırla: ilk dokunuş gecikmesin */
})();
