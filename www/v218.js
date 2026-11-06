/* V218 — Ana menü: arka plandaki atlas küresi akıcı ve NET döner.
   V218a: yüzey fotoğraftan alınıp kaydırılıyordu; arka plan fotoğrafı 800x1200 olduğu için telefonda (3x büyütme) küre bulanık/pikselli görünüyordu.
   V218c: küre yüzeyi artık oyunun kendi ülke sınırlarından (Datamap worldTopo) çizilen 2048x1024 antika atlas dokusudur; küre ekranın gerçek piksel
   yoğunluğunda (en çok 680 px) çizilir. Işık/gölge fotoğraftaki yerinde kalır (bulanık parlaklık haritası), önündeki pirinç halka korunur.
   Kıtalar gerçek coğrafyayla tek yönde döner: çok yavaş sürekli dönüş (≈4°/sn) + dokununca yumuşak ivme ve doğal yavaşlama.
   Menü kapalıyken / sekme gizliyken çizim durur. Doku kurulamazsa (veri yoksa) sessizce eski fotoğraf görünür.
   Geri almak için index.html'den v218.js bağlantısını silin ve v213.js / v158.js içindeki "V218" return satırlarını kaldırın. */
(function () {
  'use strict';
  var IW = 800, IH = 1200, GX = 401, GY = 248, GR = 160, N = GR * 2;
  var TW = 2048, TH = 1024, TILT = 14 * Math.PI / 180, LON0 = 18 * Math.PI / 180;   /* doku boyutu; eksen eğikliği; ilk görünen boylam (Avrupa-Afrika) */
  var IDLE = 4 * Math.PI / 180, KICK = 1.25, TAU = 1.1;
  var photo = null, tex = null, geo = null, busy = false, cv = null, ctx = null, out = null, RN = 0, phase = 0, vel = 0, raf = 0, last = 0, acc = 0, drawn = false;

  function bgEl() { return document.querySelector('#wcm .bgimg'); }
  function menuOn() { return document.body && document.body.classList.contains('wcm-on') && !document.hidden; }
  function sm(x, a, b) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  /* fotoğraftan yalnızca ışık haritası (küre bölgesi, güçlü bulanıklık) */
  function prepPhoto(img) {
    var c = document.createElement('canvas'); c.width = c.height = N; var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, GX - GR, GY - GR, N, N, 0, 0, N, N);
    var src = x.getImageData(0, 0, N, N).data, n = N * N, i, S = new Float32Array(n);
    for (i = 0; i < n; i++) S[i] = src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11;
    function blur(a, rad) {
      var t = new Float32Array(n), y, xx, s, k;
      for (y = 0; y < N; y++) { s = 0; for (k = -rad; k <= rad; k++) s += a[y * N + Math.min(N - 1, Math.max(0, k))]; for (xx = 0; xx < N; xx++) { t[y * N + xx] = s / (2 * rad + 1); s += a[y * N + Math.min(N - 1, xx + rad + 1)] - a[y * N + Math.max(0, xx - rad)]; } }
      for (xx = 0; xx < N; xx++) { s = 0; for (k = -rad; k <= rad; k++) s += t[Math.min(N - 1, Math.max(0, k)) * N + xx]; for (y = 0; y < N; y++) { a[y * N + xx] = s / (2 * rad + 1); s += t[Math.min(N - 1, y + rad + 1) * N + xx] - t[Math.max(0, y - rad) * N + xx]; } }
    }
    blur(S, 16); blur(S, 16); blur(S, 16);
    var sum = 0, cnt = 0; for (var y = 0; y < N; y++) for (var xx = 0; xx < N; xx++) { var u = (xx + .5 - GR) / GR, v = (y + .5 - GR) / GR; if (u * u + v * v < .7) { sum += S[y * N + xx]; cnt++; } }
    return { S: S, mean: cnt ? sum / cnt : 80 };
  }
  /* antika atlas dokusu: koyu deniz, parşömen kara, ince sınırlar, enlem-boylam ağı, mürekkep lekesi dokusu */
  function buildTex() {
    var topo = window.Datamap && Datamap.prototype && Datamap.prototype.worldTopo; if (!topo || !window.topojson || !window.d3 || !d3.geo) return null;
    var c = document.createElement('canvas'); c.width = TW; c.height = TH; var x = c.getContext('2d', { willReadFrequently: true });
    var pr = d3.geo.equirectangular().scale(TW / (2 * Math.PI)).translate([TW / 2, TH / 2]).precision(.5), path = d3.geo.path().projection(pr).context(x);
    var fs = topojson.feature(topo, topo.objects.world).features;
    var sea = x.createLinearGradient(0, 0, 0, TH); sea.addColorStop(0, '#2b302f'); sea.addColorStop(.5, '#353c3a'); sea.addColorStop(1, '#282d2c');
    x.fillStyle = sea; x.fillRect(0, 0, TW, TH);
    x.strokeStyle = 'rgba(205,190,150,.10)'; x.lineWidth = 1.2; x.beginPath(); path(d3.geo.graticule().step([15, 15])()); x.stroke();
    x.lineJoin = 'round';
    x.fillStyle = '#9d8a64'; x.beginPath(); fs.forEach(function (f) { path(f); }); x.fill();
    x.strokeStyle = 'rgba(60,44,26,.75)'; x.lineWidth = 2.4; x.beginPath(); fs.forEach(function (f) { path(f); }); x.stroke();   /* kıyı */
    x.strokeStyle = 'rgba(92,70,42,.55)'; x.lineWidth = 1; x.beginPath(); fs.forEach(function (f) { path(f); }); x.stroke();     /* sınır */
    var d = x.getImageData(0, 0, TW, TH), p = d.data, seed = 1234567;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    /* eskimiş mürekkep: düşük frekanslı leke + ince tane */
    var LW = 64, LH = 32, low = new Float32Array(LW * LH); for (var i = 0; i < low.length; i++) low[i] = rnd();
    for (var y = 0; y < TH; y++) {
      var fy = y / TH * (LH - 1), y0 = fy | 0, ty = fy - y0;
      for (var xx = 0; xx < TW; xx++) {
        var fx = xx / TW * (LW - 1), x0 = fx | 0, tx = fx - x0, a = low[y0 * LW + x0], b = low[y0 * LW + x0 + 1], cc = low[(y0 + 1) * LW + x0], dd = low[(y0 + 1) * LW + x0 + 1];
        var l = (a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + dd * tx) * ty, k = (y * TW + xx) * 4, m = .82 + l * .3 + (rnd() - .5) * .12;
        p[k] = p[k] * m; p[k + 1] = p[k + 1] * m; p[k + 2] = p[k + 2] * m;
      }
    }
    return p;
  }
  /* çizim çözünürlüğüne göre piksel başına: enlem satırı, başlangıç boylamı, ışık, maske */
  function buildGeo(rn) {
    var n = rn * rn, row = new Int32Array(n), lon = new Float32Array(n), shade = new Float32Array(n), msk = new Float32Array(n), S = photo.S, K = .78 / photo.mean, ct = Math.cos(TILT), st = Math.sin(TILT);
    for (var y = 0; y < rn; y++) for (var xx = 0; xx < rn; xx++) {
      var i = y * rn + xx, u = (xx + .5 - rn / 2) / (rn / 2), v = (y + .5 - rn / 2) / (rn / 2), r2 = u * u + v * v, rho = Math.sqrt(r2);
      var ix = GX - GR + (xx + .5) / rn * N, iy = GY - GR + (y + .5) / rn * N, ringY = 260 + (ix - 241) * (25 / 320);
      var m = (1 - sm(rho, .93, .985)) * sm(Math.abs(iy - ringY), 10, 16); msk[i] = m; if (m <= .004) continue;
      var z = Math.sqrt(Math.max(0, 1 - r2)), Y = -v, lat = Math.asin(Math.max(-1, Math.min(1, Y * ct + z * st))), lo = Math.atan2(u, z * ct - Y * st);
      row[i] = Math.max(0, Math.min(TH - 1, Math.round((.5 - lat / Math.PI) * TH))) * TW; lon[i] = lo;
      var sx = (xx + .5) / rn * N - .5, sy = (y + .5) / rn * N - .5, x0 = Math.max(0, Math.min(N - 2, sx | 0)), y0 = Math.max(0, Math.min(N - 2, sy | 0)), fx = sx - x0, fy = sy - y0;
      var s = (S[y0 * N + x0] * (1 - fx) + S[y0 * N + x0 + 1] * fx) * (1 - fy) + (S[(y0 + 1) * N + x0] * (1 - fx) + S[(y0 + 1) * N + x0 + 1] * fx) * fy;
      shade[i] = Math.min(1.7, s * K) * (.55 + .45 * Math.pow(z, .6));   /* fotoğrafın ışığı + kenara doğru yumuşak kararma */
    }
    return { row: row, lon: lon, shade: shade, m: msk };
  }
  var INV = TW / (2 * Math.PI);
  function render() {
    var o = out.data, R = geo.row, LO = geo.lon, SH = geo.shade, MS = geo.m, n = RN * RN, off = (phase + LON0) * INV;
    for (var i = 0, k = 0; i < n; i++, k += 4) {
      var m = MS[i]; if (m <= .004) { o[k + 3] = 0; continue; }
      var tx = (LO[i] * INV + off) | 0; tx %= TW; if (tx < 0) tx += TW;
      var t = (R[i] + tx) * 4, sh = SH[i];
      o[k] = tex[t] * sh; o[k + 1] = tex[t + 1] * sh; o[k + 2] = tex[t + 2] * sh; o[k + 3] = m * 255;
    }
    ctx.putImageData(out, 0, 0);
  }
  function geom(bg) {
    var r = bg.getBoundingClientRect(), w = bg.offsetWidth || r.width, h = bg.offsetHeight || r.height, s = Math.max(w / IW, h / IH), cs = getComputedStyle(bg), bp = (cs.backgroundPosition || '50% 0%').split(' ');
    function pc(v, free) { v = v || '50%'; if (/%$/.test(v)) return parseFloat(v) / 100 * free; return parseFloat(v) || 0; }
    return { r: r, kx: r.width / w, ky: r.height / h, s: s, ox: pc(bp[0], w - IW * s), oy: pc(bp[1] || '0%', h - IH * s) };
  }
  function ensure() {
    var bg = bgEl(); if (!bg || !tex || !photo) return false;
    var g = geom(bg), css = N * g.s, want = Math.max(N, Math.min(680, Math.round(css * g.kx * (window.devicePixelRatio || 1))));
    if (!cv || cv.parentNode !== bg || want !== RN) {
      if (!cv || cv.parentNode !== bg) { cv = document.createElement('canvas'); cv.className = 'glb218'; if (getComputedStyle(bg).position === 'static') bg.style.position = 'relative'; bg.insertBefore(cv, bg.firstChild); drawn = false; }
      RN = want; cv.width = cv.height = RN; ctx = cv.getContext('2d'); out = ctx.createImageData(RN, RN); geo = buildGeo(RN);
    }
    cv.style.left = (g.ox + (GX - GR) * g.s) + 'px'; cv.style.top = (g.oy + (GY - GR) * g.s) + 'px'; cv.style.width = cv.style.height = css + 'px';
    return true;
  }
  function loop(now) {
    raf = 0; if (!menuOn() || !tex) { last = 0; return; }
    if (!ensure()) { raf = requestAnimationFrame(loop); return; }
    var dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
    vel *= Math.exp(-dt / TAU); if (vel < .002) vel = 0;
    phase += (IDLE + vel) * dt; if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
    acc += dt;
    if (!drawn || vel > .05 || acc >= 1 / 30) { acc = 0; render(); if (!drawn) { drawn = true; requestAnimationFrame(function () { if (cv) cv.classList.add('on'); }); } }
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && menuOn() && tex) raf = requestAnimationFrame(loop); }
  function load() {
    if ((tex && photo) || busy) return; busy = true;
    var bg = bgEl(), m = bg && /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(bg).backgroundImage || ''), url = m ? m[1] : ((window.WC_MENU && WC_MENU.bg) || 'assets/menu/bg.webp');
    var im = new Image();
    im.onload = function () {
      try { if ((im.naturalWidth || IW) === IW && (im.naturalHeight || IH) === IH) photo = prepPhoto(im); else window.__glb218err = 'size ' + im.naturalWidth + 'x' + im.naturalHeight; } catch (e) { photo = null; window.__glb218err = 'photo ' + e; }
      /* doku kurulumu ağır (~0,1-0,3 sn): ayrı karede */
      setTimeout(function () { try { if (photo) tex = buildTex(); } catch (e) { tex = null; window.__glb218err = String(e); } busy = false; kick(); }, 30);
    };
    im.onerror = function () { busy = false; window.__glb218err = 'img ' + url; }; im.src = url; window.__glb218url = url;
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
  setInterval(function () { try { if (menuOn()) { if (!tex) setTimeout(load, 0); else kick(); } } catch (e) { } }, 700);
  document.addEventListener('visibilitychange', kick);
  window.__glb218 = function () { return { photo: !!photo, tex: !!tex, busy: busy, RN: RN, raf: !!raf, drawn: drawn }; };
  window.addEventListener('resize', function () { try { if (cv && tex) ensure(); } catch (e) { } });
})();

/* V218e — ana menü: logo (assets/menu/logo218.png) başlığın üstünde; "Seferi Sürdür" altında kayıt bilgisi (tur · ülke). */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function info() {
    try {
      var raw = localStorage.getItem(typeof SV !== 'undefined' ? SV : 'wc_save'); if (!raw) return null; var g = JSON.parse(raw); if (!g || !g.owner) return null;
      var n = 0; for (var k in g.owner) if (g.owner[k] === g.pl) n++; return { t: (g.T && g.T.turn) || g.turn || 1, n: n };
    } catch (e) { return null; }
  }
  setInterval(function () {
    try {
      var w = document.getElementById('wcm'); if (!w || !document.body.classList.contains('wcm-on')) return;
      var col = w.querySelector('.col'), h1 = col && col.querySelector('h1');
      if (h1 && !col.querySelector('.logo218')) { var im = document.createElement('img'); im.className = 'logo218'; im.alt = ''; im.src = 'assets/menu/logo218.png'; im.draggable = false; col.insertBefore(im, h1); }
      var cont = Array.prototype.find.call(w.querySelectorAll('.mb'), function (b) { return /SEFER|CONTINUE|CAMPAIGN/i.test(b.textContent); });
      if (cont && !cont.disabled && !cont.querySelector('.sub218')) { var i = info(); if (i) cont.insertAdjacentHTML('beforeend', '<small class="sub218">' + X('Tur ' + i.t + ' · ' + i.n + ' ülke', 'Turn ' + i.t + ' · ' + i.n + ' lands') + '</small>'); }
    } catch (e) { }
  }, 400);
})();

/* V218e — SADE AYARLAR: tek kart (duraklatma kartı şablonu), iki sütun.
   Ses: Müzik, Efektler (0 = kapalı). Oyun: Savaş animasyonu (Normal/Hızlı/Atla), Animasyonları azalt, Dil. Altta Nasıl Oynanır + yasal bağlantılar.
   Kaldırılanlar: Genel ses (sabit), Müzik/Efekt aç-kapa düğmeleri (kaydırıcı 0 = kapalı), Büyük yazı, Tam ekran, Efekt kalitesi (otomatik).
   Eski ayarlar penceresinin üzerine kurulan eklentiler (v8, v28, v29, v121, v125, wc_legal) yeniden bağlanmasın diye işaretler konur. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function sv() { try { SET.musOn = SET.mus > 0.001 ? 1 : 0; SET.sfxOn = SET.sfx > 0.001 ? 1 : 0; if (SET.vol < .5) SET.vol = .8; setSave(); } catch (e) { } }
  function isOn(k, v) { var s = +SET[k] || 0; if (k === 'spd') return v === 0 ? s === 0 : v === 2 ? s >= 1.5 : (s > 0 && s < 1.5); return s == v; }
  function seg(k, opts) { return '<div class="seg218">' + opts.map(function (o) { return '<button type="button" class="' + (isOn(k, o[0]) ? 'on' : '') + '" onclick="v218Set(\'' + k + '\',' + o[0] + ')">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function row(lb, ctl) { return '<div class="row218"><span>' + lb + '</span>' + ctl + '</div>'; }
  function sl(k) { return '<input type="range" min="0" max="1" step=".05" value="' + (SET[k] || 0) + '" oninput="SET.' + k + '=+this.value;v218Sv()">'; }
  function html() {
    return '<div class="wb-wrap still"><div class="wb-panel wb-pause wc141p set218">' +
      '<div class="c141h"><span class="p">⚙</span><h3>' + X('AYARLAR', 'SETTINGS') + '</h3></div>' +
      '<div class="cols218"><div><div class="sec218">' + X('Ses', 'Sound') + '</div>' +
      row('🎵 ' + X('Müzik', 'Music'), sl('mus')) + row('🔊 ' + X('Efektler', 'Effects'), sl('sfx')) + '</div>' +
      '<div><div class="sec218">' + X('Oyun', 'Game') + '</div>' +
      row(X('Savaş animasyonu', 'Battle animation'), seg('spd', [[1, X('Normal', 'Normal')], [2, X('Hızlı', 'Fast')], [0, X('Atla', 'Skip')]])) +
      row(X('Animasyonları azalt', 'Reduce motion'), seg('rm', [[0, X('Kapalı', 'Off')], [1, X('Açık', 'On')]])) +
      row(X('Dil', 'Language'), '<div class="seg218"><button type="button" class="' + (L == 'tr' ? 'on' : '') + '" onclick="v218Lang(\'tr\')">TR</button><button type="button" class="' + (L == 'en' ? 'on' : '') + '" onclick="v218Lang(\'en\')">EN</button></div>') +
      '</div></div>' +
      '<div class="foot218">' + (window.WCTut ? '<button type="button" onclick="WCTut.open()">📖 ' + X('Nasıl Oynanır', 'How to Play') + '</button>' : '') +
      (window.wcLegalOpen ? '<button type="button" onclick="wcLegalOpen(\'priv\')">' + X('Gizlilik', 'Privacy') + '</button><button type="button" onclick="wcLegalOpen(\'terms\')">' + X('Koşullar', 'Terms') + '</button><button type="button" onclick="wcLegalOpen(\'lic\')">' + X('Lisanslar', 'Licenses') + '</button>' : '') + '</div>' +
      '<div class="c141g"><button type="button" class="c141b pri" onclick="menu()"><span class="ic">‹</span><span class="lb">' + X('Geri', 'Back') + '</span></button></div></div></div>';
  }
  window.v218Sv = sv;
  window.v218Set = function (k, v) { try { SET[k] = v; sv(); show(); } catch (e) { } };
  window.v218Lang = function (l) { try { if (L !== l) { L = 'tr' === l ? 'en' : 'tr'; setLang(); } } catch (e) { } show(); };
  function show() {
    var m = document.getElementById('mod'), bx = document.getElementById('box'); if (!m || !bx) return;
    try { window.__wbOn = true; modal('<div></div>'); } catch (e) { } finally { window.__wbOn = false; }
    m.classList.add('wbm'); bx.classList.remove('mm'); bx.innerHTML = html();
    try { if (window.v156Decorate) v156Decorate(); } catch (e) { }
    m.style.display = 'flex';
  }
  function install() {
    if (typeof settings !== 'function' || typeof SET === 'undefined' || typeof setSave !== 'function') return setTimeout(install, 500);
    var f = function () { show(); };
    f.wc121 = f.wc125 = f.wc111 = f.v139 = f.v218 = 1;   /* eski eklentiler tekrar sarmasın */
    settings = f; window.settings = f;
  }
  setTimeout(install, 1200);
  /* başka bir dosya sonradan sararsa geri al */
  setInterval(function () { try { if (typeof settings === 'function' && !settings.v218) install(); } catch (e) { } }, 2000);
})();
