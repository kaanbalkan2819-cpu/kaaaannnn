/* V213 — (a) rakip turu "geç" düğmesi (b) özellik seçimi paneli: dokunmayla kaydırma yedeği (c) yenilgide donma bekçisi
          (d) ana menü: arkadaki atlas küresine dokununca %15-20 döner.
   Geri almak için index.html'den v213.js ve v213.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }

  /* ---------------- (a) rakip turu: dokun = bu hamleyi geç, basılı tut = turun tamamını geç ---------------- */
  var btn = null, holdT = 0, held = false, HOLD_MS = 600;
  function aiPhase() { try { return !!(G && G.v5 === 1 && G.ph === 'v5ai' && !G.over && window.V20 && V20.skip); } catch (e) { return false; } }
  function decisionOpen() {   /* haraç gibi oyuncunun karar vermesi gereken pencere açıksa düğme gizlenir */
    try { var m = document.getElementById('mod'), b = document.getElementById('box'); return !!(m && m.style.display === 'flex' && b && /v20Tribute|Shop\.open/.test(b.innerHTML)); } catch (e) { return false; }
  }
  function aiBattleOpen() { try { return typeof BSH !== 'undefined' && BSH && window.__v213aa; } catch (e) { return false; } }
  function skipBattle() {   /* YZ↔YZ savaş paneli açıksa: animasyonu geç / sonucu kapat */
    try {
      if (window.v60Active && window.v60Skip) { v60Skip(); return true; }
      var fb = document.querySelector('#fn button'); if (fb) { fb.click(); return true; }
      var bs = document.getElementById('bs'); if (bs && bs.offsetParent) { bs.click(); return true; }
    } catch (e) { }
    return false;
  }
  function doSkip(all) {
    try {
      V20.skip(all);
      if (aiBattleOpen()) skipBattle();
      if (all) { btn.classList.add('all'); setTimeout(function () { if (btn) btn.classList.remove('all'); }, 900); }
    } catch (e) { console.error(e); }
  }
  function mkBtn() {
    btn = document.createElement('button'); btn.id = 'skip213'; btn.type = 'button';
    btn.innerHTML = '<span class="rg"><svg viewBox="0 0 30 30"><circle class="bg" cx="15" cy="15" r="13"/><circle class="fg" cx="15" cy="15" r="13"/></svg><b>⏭</b></span>' +
      '<span class="tx">' + X('Geç', 'Skip') + '<small>' + X('Basılı tut: tüm tur', 'Hold: whole turn') + '</small></span>';
    function stop(e) { try { e.stopPropagation(); } catch (x) { } }
    btn.addEventListener('pointerdown', function (e) {
      stop(e); try { e.preventDefault(); } catch (x) { } held = false; clearTimeout(holdT);
      void btn.offsetWidth; btn.classList.add('hold');
      holdT = setTimeout(function () { held = true; btn.classList.remove('hold'); doSkip(true); }, HOLD_MS);
    });
    function end(e) { stop(e); var wasHold = btn.classList.contains('hold'); clearTimeout(holdT); btn.classList.remove('hold'); if (!held && wasHold) doSkip(false); held = false; }
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', function (e) { stop(e); clearTimeout(holdT); btn.classList.remove('hold'); held = false; });
    btn.addEventListener('pointerleave', function () { if (!held) { clearTimeout(holdT); btn.classList.remove('hold'); } });
    ['click', 'touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(function (n) { btn.addEventListener(n, stop); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.body.appendChild(btn);
  }
  setInterval(function () {
    try {
      if (!document.body) return;
      if (!btn) mkBtn();
      /* yalnızca geçilecek bir şey varken görünür: rakip kartı, rakip zar penceresi ya da YZ↔YZ savaşı.
         Olay penceresi (darbe teklifi vb.), haraç kararı ve oyuncuya yönelen savaş sırasında gizli (oyuncu karar vermeli). */
      var bxx = document.getElementById('box'), mdd = document.getElementById('mod');
      var rollOpen = !!(mdd && mdd.style.display === 'flex' && bxx && bxx.querySelector('#v20d'));
      var bshOn = typeof BSH !== 'undefined' && BSH;
      var show = aiPhase() && !decisionOpen() && (!!document.getElementById('ai20') || rollOpen || (bshOn && !!window.__v213aa) || (V20.skipping && V20.skipping() && !bshOn));
      btn.classList.toggle('on', show);
      /* tur atlanırken YZ↔YZ savaş sonucu kendiliğinden kapanır */
      if (show && V20.skipping && V20.skipping() && aiBattleOpen()) skipBattle();
      /* YZ turu bittiyse atlama durumu sıfırlanır (SET.rm geri gelir) */
      if (window.V20 && V20.skipReset && V20.skipping && V20.skipping() && !(G && G.ph === 'v5ai') && !(typeof BSH !== 'undefined' && BSH)) V20.skipReset();
    } catch (e) { }
  }, 200);

  /* ---------------- (a2) ittifak bayrakları tek satırda ----------------
     V120 savaşa fiilen KATILAN destekçileri adın altına ayrı satır (.wcal) olarak ekliyordu; V213 ittifak üyelerini bayrağın altına ekliyor (.al213).
     İkisi birleştirilir: katılan ama ittifakta olmayan destekçiler aynı satıra eklenir, ayrı satır kaldırılır (bayraklar iki kez görünmez). */
  function mergeAllies() {
    ['sa', 'sdf'].forEach(function (id) {
      try {
        var card = document.getElementById(id); if (!card) return;
        var old = card.querySelector('.wcal'); if (!old) return;
        var row = card.querySelector('.al213');
        if (!row) { old.classList.add('al213'); old.removeAttribute('style'); old.insertAdjacentHTML('afterbegin', '<span class="al213k">🤝</span>'); var fl = card.querySelector('.fi.lg'); if (fl && fl.parentNode === old.parentNode) fl.insertAdjacentElement('afterend', old); return; }
        var have = {}; Array.prototype.forEach.call(row.querySelectorAll('[data-c]'), function (s) { try { have[(M[s.getAttribute('data-c')] || {}).name || s.getAttribute('data-c')] = 1; } catch (e) { } });
        Array.prototype.forEach.call(old.querySelectorAll('span[title]'), function (s) { var t = s.getAttribute('title'); if (have[t]) return; have[t] = 1; s.removeAttribute('style'); s.className = 'al213c'; row.appendChild(s); });
        old.remove();
      } catch (e) { }
    });
  }
  (function hook() {
    if (typeof showBattle !== 'function') return setTimeout(hook, 300);
    var _sb = showBattle;
    showBattle = function () { var r = _sb.apply(this, arguments); try { mergeAllies(); setTimeout(mergeAllies, 0); } catch (e) { } return r; };
  })();

  /* ---------------- (b) özellik seçimi paneli: dokunmayla kaydırma yedeği ----------------
     Doğal kaydırma çalışmazsa (bazı WebView'larda harita dokunma işleyicileri yüzünden) parmak sürüklemesi panelin scrollTop'unu kendisi taşır. */
  (function () {
    var y0 = 0, st0 = 0, box = null, nat = false;
    document.addEventListener('touchstart', function (e) {
      box = null; var b = e.target && e.target.closest && e.target.closest('#mod .box.crbox'); if (!b || !e.touches || e.touches.length !== 1) return;
      box = b; y0 = e.touches[0].clientY; st0 = b.scrollTop; nat = false;
    }, { passive: true, capture: true });
    document.addEventListener('touchmove', function (e) {
      if (!box || !e.touches || !e.touches.length) return;
      var dy = e.touches[0].clientY - y0;
      if (box.scrollTop !== st0 && !nat) { nat = true; }   /* tarayıcı kendisi kaydırıyor -> karışma */
      if (nat) return;
      requestAnimationFrame(function () { if (box && !nat && Math.abs(dy) > 3) box.scrollTop = st0 - dy; });
    }, { passive: true, capture: true });
    document.addEventListener('touchend', function () { box = null; }, { passive: true, capture: true });
  })();

  /* ---------------- (c) yenilgide donma bekçisi ----------------
     V188 yalnızca "Haritaya Dön"e basınca devreye giriyordu. Toprak savaş dışında (isyan vb.) kaybedilirse ya da savaş paneli
     animasyondan sonra geri gelmezse oyun sonu ekranı hiç açılmıyordu. Oyuncunun toprağı 3,5 sn boyunca 0 kalır ve ne savaş sonucu
     ne de oyun sonu ekranı görünürse ekran açılır. */
  (function () {
    var since = 0;
    function ownedN(e) { var n = 0; try { for (var k in G.owner) if (G.owner[k] === e) n++; } catch (x) { } return n; }
    function lost() { try { return !!G && !G.mp && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner && G.T && ownedN(G.pl) === 0 && ['pick', 'v7pick', 'v5intro', 'wheel'].indexOf(G.ph) < 0; } catch (e) { return false; } }
    function endShown() { return !!(document.getElementById('v139over') || document.getElementById('v38over')); }
    function resultVisible() {
      try { var bs = document.getElementById('bs'); return !!(typeof BSH !== 'undefined' && BSH && bs && bs.style.display !== 'none' && bs.style.visibility !== 'hidden' && document.querySelector('#fn button')); } catch (e) { return false; }
    }
    setInterval(function () {
      try {
        if (!lost() || endShown() || (document.body && document.body.classList.contains('wcm-on'))) { since = 0; return; }
        if (window.v60Active || resultVisible()) { since = 0; return; }   /* animasyon / sonuç ekranı: oyuncu "Haritaya Dön"e basar (V188) */
        if (!since) { since = Date.now(); return; }
        if (Date.now() - since < 3500) return;
        since = 0;
        if (typeof BSH !== 'undefined' && BSH && typeof closeBattle === 'function') { closeBattle(); }   /* V188 zinciri: paneli kapatıp yenilgi ekranını açar */
        setTimeout(function () {
          if (endShown()) return;
          try { if (window.V20 && V20.skipReset) V20.skipReset(); } catch (e) { }
          try { var bs = document.getElementById('bs'); if (bs) { bs.style.display = 'none'; bs.style.visibility = ''; } BSH = false; document.body.classList.remove('bsh'); } catch (e) { }
          try { if (!G.over) G.over = { w: -1 }; G.ph = 'over'; G.busy = 0; G.aiBusy = 0; } catch (e) { }
          try { var m = document.getElementById('mod'); if (m) m.style.display = 'none'; } catch (e) { }
          try { if (window.v139Show) window.v139Show(true); else if (typeof showOver === 'function') showOver(); } catch (e) { console.error(e); }
        }, 600);
      } catch (e) { }
    }, 700);
  })();

  /* ---------------- (d) ana menü: atlas küresi dokununca döner ----------------
     Küre arka plan fotoğrafının (assets/menu/bg.webp, 800x1200) parçası. Dokununca kürenin bölgesi bir tuvalde yeniden çizilir:
     ışık/gölge (bulanık parlaklık haritası) yerinde kalır, yüzey deseni küre geometrisine göre (enlem satırlarında boylam kaydırılarak) döner.
     Önündeki yatay halka olduğu gibi korunur. Her dokunuş ~%18 tur (65°), 1,4 sn yumuşak duruş. */
  (function () {
    var IW = 800, IH = 1200, GX = 401, GY = 248, GR = 160, BAND0 = 252, BAND1 = 290, TURN = 0.18 * 2 * Math.PI, DUR = 1400, FL = 60 * Math.PI / 180;
    var data = null, phase = 0, anim = null, cv = null, ctx = null, out = null;
    function bgEl() { return document.querySelector('#wcm.flat .bgimg'); }
    /* .bgimg transform ile büyütülmüş olabilir (scale 1.14): hesap öğenin KENDİ (dönüştürülmemiş) koordinatlarında yapılır,
       dokunma noktası da bu koordinatlara çevrilir. */
    function geom(bg) {
      var r = bg.getBoundingClientRect(), w = bg.offsetWidth || r.width, h = bg.offsetHeight || r.height, s = Math.max(w / IW, h / IH), cs = getComputedStyle(bg), bp = (cs.backgroundPosition || '50% 0%').split(' ');
      function pc(v, free) { v = v || '50%'; if (/%$/.test(v)) return parseFloat(v) / 100 * free; return parseFloat(v) || 0; }
      return { r: r, w: w, h: h, kx: r.width / w, ky: r.height / h, s: s, ox: pc(bp[0], w - IW * s), oy: pc(bp[1] || '0%', h - IH * s) };
    }
    function prep(img) {
      var n = GR * 2, c = document.createElement('canvas'); c.width = c.height = n; var x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, GX - GR, GY - GR, n, n, 0, 0, n, n);
      var src = x.getImageData(0, 0, n, n).data, lum = new Float32Array(n * n), i, j;
      for (i = 0; i < n * n; i++) lum[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11);
      /* ışık haritası: parlaklığın güçlü bulanıklığı (kutu bulanıklığı x3) -> kıta ayrıntısı gider, aydınlatma kalır */
      function blur(a, rad) {
        var t = new Float32Array(n * n), y, xx, s, k;
        for (y = 0; y < n; y++) { s = 0; for (k = -rad; k <= rad; k++) s += a[y * n + Math.min(n - 1, Math.max(0, k))]; for (xx = 0; xx < n; xx++) { t[y * n + xx] = s / (2 * rad + 1); s += a[y * n + Math.min(n - 1, xx + rad + 1)] - a[y * n + Math.max(0, xx - rad)]; } }
        for (xx = 0; xx < n; xx++) { s = 0; for (k = -rad; k <= rad; k++) s += t[Math.min(n - 1, Math.max(0, k)) * n + xx]; for (y = 0; y < n; y++) { a[y * n + xx] = s / (2 * rad + 1); s += t[Math.min(n - 1, y + rad + 1) * n + xx] - t[Math.max(0, y - rad) * n + xx]; } }
      }
      var S = new Float32Array(lum); blur(S, 14); blur(S, 14); blur(S, 14);
      var T = new Float32Array(n * n * 3);
      for (i = 0; i < n * n; i++) { var sv = Math.max(6, S[i]); for (j = 0; j < 3; j++) T[i * 3 + j] = src[i * 4 + j] / sv; }
      return { n: n, S: S, T: T, src: src };
    }
    function render(ph) {
      var n = data.n, R = GR, S = data.S, T = data.T, o = out.data, y, x, k = 0, rr = 0.955, rf = 0.91;
      for (y = 0; y < n; y++) {
        var iy = GY - R + y, v = (y + .5 - R) / R, inBand = iy >= BAND0 && iy <= BAND1, w = Math.sqrt(Math.max(0, 1 - v * v));
        for (x = 0; x < n; x++, k += 4) {
          var u = (x + .5 - R) / R, d = Math.sqrt(u * u + v * v);
          if (inBand || d >= rr || w < 1e-3) { o[k + 3] = 0; continue; }
          var su = Math.max(-1, Math.min(1, u / w)), lam = Math.asin(su) - ph;
          /* yüzey deseni yalnızca fotoğrafın net görünen ±60° boylam bandından alınır; dışı bu bandın aynasıyla dolar
             (kenara yakın sıkışık bölgeden örneklemek dikey sürtme izi bırakıyordu) */
          var t4 = ((lam + FL) % (4 * FL) + 4 * FL) % (4 * FL); if (t4 > 2 * FL) t4 = 4 * FL - t4; lam = t4 - FL;
          var sx = Math.round(R + w * Math.sin(lam) * R - .5); if (sx < 0) sx = 0; else if (sx >= n) sx = n - 1;
          var si = (y * n + sx) * 3, sh = S[y * n + x];
          o[k] = T[si] * sh; o[k + 1] = T[si + 1] * sh; o[k + 2] = T[si + 2] * sh;
          o[k + 3] = d > rf ? Math.round(255 * (rr - d) / (rr - rf)) : 255;   /* kenarda yumuşak geçiş */
        }
      }
      ctx.putImageData(out, 0, 0);
    }
    function place(bg) {
      var g = geom(bg), n = GR * 2;
      cv.style.left = (g.ox + (GX - GR) * g.s) + 'px'; cv.style.top = (g.oy + (GY - GR) * g.s) + 'px';
      cv.style.width = cv.style.height = (n * g.s) + 'px';
      return g;
    }
    function hitGlobe(bg, cx, cy) { var g = geom(bg), lx = (cx - g.r.left) / g.kx, ly = (cy - g.r.top) / g.ky; return Math.hypot(lx - (g.ox + GX * g.s), ly - (g.oy + GY * g.s)) < GR * g.s * 0.95; }
    function start(bg) {
      if (!data) return;
      if (!cv || !cv.isConnected) {
        cv = document.createElement('canvas'); cv.className = 'spin213'; cv.width = cv.height = GR * 2; ctx = cv.getContext('2d'); out = ctx.createImageData(GR * 2, GR * 2);
        if (getComputedStyle(bg).position === 'static') bg.style.position = 'relative';
        bg.appendChild(cv); phase = 0;
      }
      place(bg);
      var from = phase, to = phase + TURN, t0 = performance.now(); if (anim) cancelAnimationFrame(anim);
      (function fr(now) {
        var k = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - k, 3); phase = from + (to - from) * e;
        try { render(phase); } catch (x) { window.__spin213err = String(x); anim = 0; return; }
        anim = k < 1 ? requestAnimationFrame(fr) : 0;
      })(t0);
    }
    function load(bg) {
      if (data || load.busy) return; load.busy = 1;
      var m = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(bg).backgroundImage || ''); var url = m ? m[1] : 'assets/menu/bg.webp';
      var im = new Image(); im.onload = function () { try { if ((im.naturalWidth || IW) === IW && (im.naturalHeight || IH) === IH) data = prep(im); } catch (e) { data = null; } load.busy = 0; if (load.go) { load.go = 0; start(bg); } };
      im.onerror = function () { load.busy = 0; }; im.src = url;
    }
    document.addEventListener('click', function (e) {
      try {
        var bg = bgEl(); if (!bg || !document.body.classList.contains('wcm-on')) return;
        if (e.target.closest && e.target.closest('button,a,input,.col .mb,.mb,[data-a]')) return;
        if (!hitGlobe(bg, e.clientX, e.clientY)) return;
        if (!data) { load.go = 1; load(bg); return; }
        start(bg);
      } catch (x) { }
    }, true);
    /* menü açılınca boşta önceden hazırla (ilk dokunuş beklemesin) */
    setInterval(function () { try { var bg = bgEl(); if (bg && !data && document.body.classList.contains('wcm-on')) (window.requestIdleCallback || setTimeout)(function () { load(bg); }); if (cv && cv.isConnected && bg) place(bg); } catch (e) { } }, 1500);
  })();
})();
