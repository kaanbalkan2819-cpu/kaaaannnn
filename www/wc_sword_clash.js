/*!
 * wc_sword_clash.js  —  Dünya Fethi · Savaş paneli · Rönesans kılıç çarpışması (v2)
 * ---------------------------------------------------------------------------
 * Bağımsız (bağımlılığı olmayan) Canvas 2D modülü. Oyun koduna dokunmaz.
 *
 * Kullanım (savaş panelinde iki bayrağın arasındaki ⚔️ yerine):
 *
 *   var fx = WCSwordClash.mount(ortaElement, {
 *     replace: eskiKilicEmojiElementi,   // gizlenir, destroy() ile geri gelir
 *     shakeEl: savasPaneliElementi,      // çarpmada hafifçe sarsılır (opsiyonel)
 *     attacker: '#3b82f6',               // saldıran taraf halesi
 *     defender: '#ef4444'                // savunan taraf halesi
 *   });
 *   fx.loop();        // "Savaş başlıyor…" / zar atılırken sürekli çarpışma
 *   fx.playOnce();    // tek seferlik (ör. her zar sonucunda)
 *   fx.stop();        // durdur
 *   fx.destroy();     // panel kapanırken
 *
 * Zaman çizelgesi (ms):  hazırlık 0-250 · savruluş 250-326 · ÇARPMA 326
 *   (hit-stop 34 ms) · geri tepme 360-560 · 2. savruluş 560-640 · 2. ÇARPMA 640
 *   (hit-stop 42 ms) · geri tepme 672-800 · bekleme/sönme 800-1000.
 *
 * Tasarım: Figma dosyası "Dünya Fethi - Kılıç Çarpışması (Savaş Paneli)".
 */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;

  var DEFAULTS = {
    width: 220,          // tuval CSS genişliği (px) — panelin üstüne taşabilir
    height: 150,         // tuval CSS yüksekliği (px)
    scale: 0.62,         // kılıç ölçeği (1 = 164 px boyunda kılıç)
    originY: 0.38,       // çarpma noktasının tuval yüksekliğindeki oranı
    offsetX: 0,          // çarpma noktasını host merkezine göre kaydır (px)
    offsetY: 0,
    attacker: '#3b82f6',
    defender: '#ef4444',
    intensity: 1,        // kıvılcım sayısı / sarsıntı çarpanı
    holdFinal: true,     // playOnce: tek vuruştan sonra kılıçlar X duruşunda kalır
    sprite: null,          // Figma çıktısı: {src:'sword.svg', w:.., h:.., px:.., py:..} (ucu yukarı, px/py = siper/pivot noktası)
    quality: 'high',     // 'low' → daha az kıvılcım (zayıf telefonlar)
    timeScale: 1,        // 0.25 = ağır çekim
    loopGap: 140,        // döngüde iki çarpışma arası boşluk (ms)
    sound: false,        // true → WebAudio ile sentezlenmiş metal çınlaması
    volume: 0.35,
    shakeEl: null,       // çarpmada sarsılacak panel elementi
    replace: null,       // gizlenecek eski ⚔️ elementi
    zIndex: 6,
    onImpact: null,      // function (index) {}
    onDone: null         // playOnce bitince
  };

  // ------------------------------------------------------------------ utils
  function assign(t) {
    for (var i = 1; i < arguments.length; i++) {
      var s = arguments[i];
      if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
    }
    return t;
  }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function rr(a, b) { return a + Math.random() * (b - a); }
  function hexRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }

  var EASE = {
    linear: function (x) { return x; },
    inQuad: function (x) { return x * x; },
    outQuad: function (x) { return 1 - (1 - x) * (1 - x); },
    inOutQuad: function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; },
    inCubic: function (x) { return x * x * x; },
    outCubic: function (x) { return 1 - Math.pow(1 - x, 3); },
    outBack: function (x) { var c1 = 1.15, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  };

  // Kıvılcım rengi: beyaz → sarı → turuncu → kor
  var HEAT = [[0, 255, 255, 245], [0.22, 255, 232, 150], [0.6, 255, 154, 56], [1, 196, 56, 16]];
  function heat(u) {
    u = clamp(u, 0, 1);
    for (var i = 1; i < HEAT.length; i++) {
      if (u <= HEAT[i][0]) {
        var a = HEAT[i - 1], b = HEAT[i], f = (u - a[0]) / (b[0] - a[0]);
        return [Math.round(lerp(a[1], b[1], f)), Math.round(lerp(a[2], b[2], f)), Math.round(lerp(a[3], b[3], f))];
      }
    }
    return [196, 56, 16];
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ------------------------------------------------------- animation data
  // Sol (saldıran) kılıcın anahtar kareleri. Koordinatlar çarpma noktasına (0,0)
  // göre, birim = kılıç ölçeği 1'deki px. Sağ kılıç ayna görüntüsüdür.
  // [zaman ms, pivot x, pivot y, açı derece, bu kareye gelirken easing]
  var KF = [
    [0,    -48, 66, -22, 'linear'],
    [420,  -54, 68, -32, 'outQuad'],     // hazırlık: geri çekiliş
    [505,  -28.7, 41, 35, 'inCubic'],    // savruluş -> ÇARPMA: bıçakların ORTA kısımları temas eder
    [540,  -30.5, 42, 37.5, 'outQuad'],  // yumuşak geri tepme
    [780,  -26, 34, 12, 'outCubic'],     // kılıçlar toparlanır
    [880,  -26, 34, 12, 'linear'],       // kısa bekleyiş
    [1350, -28.7, 41, 35, 'outBack']     // X duruşuna hafif aşıp yerleşir (yaylı)
  ];
  var END = 1350;
  var IMP = [
    { t: 505, x: 0, y: 0, amp: 0.6, sparks: 10, flash: 0.26, stop: 28 }
  ];

  // --------------------------------------------------------------- sound
  function clang(ac, vol, strength) {
    try {
      var t0 = ac.currentTime;
      var master = ac.createGain();
      master.gain.value = vol * strength;
      master.connect(ac.destination);
      // vuruş transienti (gürültü patlaması)
      var len = Math.floor(ac.sampleRate * 0.04);
      var buf = ac.createBuffer(1, len, ac.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var src = ac.createBufferSource(); src.buffer = buf;
      var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
      src.connect(hp); hp.connect(master); src.start(t0);
      // metal çınlaması (uyumsuz kısmi tonlar)
      var base = 1150 + Math.random() * 140;
      var ratios = [1, 1.51, 2.07, 2.76, 3.43, 4.12];
      var amps = [0.5, 0.38, 0.3, 0.22, 0.14, 0.08];
      var decs = [0.55, 0.45, 0.35, 0.28, 0.2, 0.14];
      ratios.forEach(function (r, i) {
        var o = ac.createOscillator(); o.type = 'sine';
        o.frequency.value = base * r * (1 + (Math.random() - 0.5) * 0.004);
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(amps[i], t0 + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + decs[i]);
        o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + decs[i] + 0.05);
      });
    } catch (e) { /* ses opsiyonel */ }
  }

  // ------------------------------------------------------------ the class
  function SwordClash(host, opts) {
    this.o = assign({}, DEFAULTS, opts || {});
    this.host = host;
    this.parts = [];
    this.fx = [];
    this.running = false;
    this.mode = 'once';
    this.active = false;
    this.animT = 0;
    this.hold = 0;
    this.gapLeft = 0;
    this.fired = [false, false];
    this.shake = null;
    this.emberT = 0;
    this.lastImpact = -9999;
    this._now = 0;
    this._last = 0;
    this._raf = 0;
    this._build();
  }

  SwordClash.prototype._build = function () {
    var o = this.o, host = this.host;
    var cs = root.getComputedStyle ? root.getComputedStyle(host) : null;
    this._hostPosChanged = false;
    if (cs && cs.position === 'static') { host.style.position = 'relative'; this._hostPosChanged = true; }

    this.W = o.width; this.H = o.height; this.k = o.scale;
    this.dpr = Math.min(root.devicePixelRatio || 1, 2);

    var wrap = document.createElement('div');
    wrap.className = 'wc-sword-clash';
    wrap.style.cssText =
      'position:absolute;left:50%;top:50%;pointer-events:none;overflow:visible;' +
      'width:' + this.W + 'px;height:' + this.H + 'px;' +
      'margin-left:' + (-this.W / 2 + o.offsetX) + 'px;' +
      'margin-top:' + (-this.H * o.originY + o.offsetY) + 'px;' +
      'z-index:' + o.zIndex + ';';
    var c = document.createElement('canvas');
    c.width = Math.round(this.W * this.dpr);
    c.height = Math.round(this.H * this.dpr);
    c.style.cssText = 'width:' + this.W + 'px;height:' + this.H + 'px;display:block;';
    wrap.appendChild(c);
    host.appendChild(wrap);
    this.wrap = wrap; this.canvas = c; this.ctx = c.getContext('2d');
    if (o.sound) this._warmSound();

    if (o.replace) { this._repPrev = o.replace.style.visibility; o.replace.style.visibility = 'hidden'; }
    if (o.shakeEl) this._shakeBase = o.shakeEl.style.transform || '';
    if (o.sprite && o.sprite.src) {
      var me = this; this._img = new Image();
      this._img.onload = function () { me._spriteOk = true; };
      this._img.src = o.sprite.src;
    }
  };

  // ---- public API
  SwordClash.prototype.playOnce = function (over) {
    if (over) assign(this.o, over);
    this.mode = 'once';
    this._startCycle();
    this._run();
    return this;
  };
  SwordClash.prototype.loop = function (over) {
    if (over) assign(this.o, over);
    this.mode = 'loop';
    this._startCycle();
    this._run();
    return this;
  };
  SwordClash.prototype.stop = function () {
    this.running = false;
    this.active = false; this.settled = false;
    if (this._raf) { root.cancelAnimationFrame(this._raf); this._raf = 0; }
    this.parts.length = 0; this.fx.length = 0; this.shake = null;
    this._applyShake(0, 0);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    return this;
  };
  SwordClash.prototype.setColors = function (attacker, defender) {
    if (attacker) this.o.attacker = attacker;
    if (defender) this.o.defender = defender;
    return this;
  };
  SwordClash.prototype.destroy = function () {
    this.stop();
    if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
    if (this.o.replace) this.o.replace.style.visibility = this._repPrev || '';
    if (this._hostPosChanged) this.host.style.position = '';
  };

  // ---- internals
  SwordClash.prototype._startCycle = function () {
    this.animT = 0; this.hold = 0; this.gapLeft = 0;
    this.fired = [false, false]; this.active = true; this.emberT = 0; this.settled = false;
  };

  SwordClash.prototype._run = function () {
    if (this.running) return;
    this.running = true; this._last = 0;
    var self = this;
    this._raf = root.requestAnimationFrame(function (ts) { self._tick(ts); });
  };

  SwordClash.prototype._tick = function (ts) {
    if (!this.running) return;
    if (!this._last) this._last = ts;
    var dt = Math.min(50, ts - this._last) * this.o.timeScale;
    this._last = ts;
    this._step(dt);
    this._render();
    if (this.mode === 'once' && this.settled && !this.parts.length && !this.fx.length && !this.shake) {
      var cb0 = this.o.onDone;
      this.running = false; this._raf = 0;
      if (cb0) cb0();
      return;
    }
    if (this.mode === 'once' && !this.active && !this.parts.length && !this.fx.length && !this.shake) {
      var cb = this.o.onDone;
      this.stop();
      if (cb) cb();
      return;
    }
    var self = this;
    this._raf = root.requestAnimationFrame(function (t2) { self._tick(t2); });
  };

  SwordClash.prototype._step = function (dt) {
    this._now += dt;
    this._updateParts(dt);
    if (this.gapLeft > 0) {
      this.gapLeft -= dt;
      if (this.gapLeft <= 0) this._startCycle();
      return;
    }
    if (!this.active) return;
    if (this.hold > 0) { this.hold -= dt; return; }   // hit-stop

    var prev = this.animT;
    this.animT += dt;
    for (var i = 0; i < IMP.length; i++) {
      if (!this.fired[i] && prev < IMP[i].t && this.animT >= IMP[i].t) {
        this.animT = IMP[i].t;
        this.fired[i] = true;
        this.hold = IMP[i].stop;
        this._impact(i);
        break;
      }
    }
    if (!this.o.holdFinal && this.animT > 700 && this.animT < 980) {       // sönerken yükselen közler
      this.emberT -= dt;
      if (this.emberT <= 0) { this.emberT = 45; this._spawnEmber(); }
    }
    if (this.animT >= END) {
      this.animT = END;
      if (this.mode === 'once' && this.o.holdFinal) { this.settled = true; }
      else {
        this.active = false;
        if (this.mode === 'loop') this.gapLeft = this.o.loopGap;
      }
    }
  };

  // sol kılıç duruşu (side 0) / sağ kılıç (side 1, ayna)
  SwordClash.prototype._pose = function (side, t) {
    var a, b, u, e, i;
    t = clamp(t, 0, END);
    for (i = 1; i < KF.length; i++) { if (t <= KF[i][0]) break; }
    if (i >= KF.length) i = KF.length - 1;
    a = KF[i - 1]; b = KF[i];
    u = (t - a[0]) / (b[0] - a[0]);
    e = EASE[b[4]](clamp(u, 0, 1));
    var x = lerp(a[1], b[1], e), y = lerp(a[2], b[2], e), ang = lerp(a[3], b[3], e);
    var T = IMP[0].t;
    if (t > T) {                                    // çarpma sonrası sönümlü yay: kılıç sertçe durmaz, titreyerek yerleşir
      var d = t - T, env = Math.exp(-d / 140);
      ang += 5 * (1 - 0.12 * side) * env * Math.sin(d * 0.045);
      x += 1.4 * env * Math.sin(d * 0.05);
      y -= 1.0 * env * Math.sin(d * 0.045 + 0.6);
    }
    if (t < 250 || t >= END - 1) {                   // beklerken canlı, hafif sallanma
      var n = this._now;
      ang += Math.sin(n / 520 + side * 1.7) * 0.6;
      y += Math.sin(n / 430 + side) * 0.45;
      x += Math.sin(n / 610 + side * 2.3) * 0.3;
    }
    var s = side === 0 ? 1 : -1;
    return { x: x * s, y: y, a: ang * s };
  };

  SwordClash.prototype._masterAlpha = function (t) {
    if (this.mode === 'once' && this.o.holdFinal) return clamp(t / 110, 0, 1);
    return clamp(Math.min(t / 110, (END - t) / 100), 0, 1);
  };

  SwordClash.prototype._impact = function (i) {
    var imp = IMP[i], k = this.k, o = this.o;
    var q = o.quality === 'low' ? 0.55 : 1;
    var n = Math.round(imp.sparks * o.intensity * q);
    this.lastImpact = this._now;
    this._spawnSparks(n, imp.x * k, imp.y * k, 1 + i * 0.22);
    this.fx.push({ type: 'flash', t0: this._now, dur: 110, mag: imp.flash, x: imp.x * k, y: imp.y * k });
    this.shake = { t0: this._now, dur: 130, amp: imp.amp * o.intensity };
    if (o.sound) this._sound(0.75 + i * 0.25);
    if (o.onImpact) { try { o.onImpact(i); } catch (e) {} }
  };

  // V209: AudioContext tek seferlik ve paylaşımlı; çarpma anında kurulup kasma yapmasın diye savaş açılırken ısıtılır, destroy'da kapatılmaz
  var SHARED_AC = null;
  function sharedAC() {
    if (SHARED_AC && SHARED_AC.state !== 'closed') return SHARED_AC;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { SHARED_AC = new AC(); } catch (e) { SHARED_AC = null; }
    return SHARED_AC;
  }
  SwordClash.prototype._warmSound = function () {
    var ac = sharedAC(); if (!ac) return;
    try { if (ac.state === 'suspended' && ac.resume) ac.resume(); } catch (e) {}
  };
  SwordClash.prototype._sound = function (strength) {
    var ac = sharedAC(); if (!ac) return;
    this.ac = ac;
    if (ac.state === 'suspended' && ac.resume) ac.resume();
    clang(ac, this.o.volume, strength);
  };

  SwordClash.prototype._spawnSparks = function (n, ix, iy, power) {
    var k = this.k, parts = this.parts;
    if (parts.length > 220) return;
    for (var i = 0; i < n; i++) {
      var th = Math.random() < 0.82 ? rr(-Math.PI * 0.97, -Math.PI * 0.03) : Math.random() * TAU;
      var sp = (80 + Math.pow(Math.random(), 1.8) * 190) * k * power;
      var life = 0.28 + Math.random() * 0.42;
      parts.push({
        kind: 0,
        x: ix + rr(-2.5, 2.5) * k, y: iy + rr(-2.5, 2.5) * k,
        vx: Math.cos(th) * sp, vy: Math.sin(th) * sp,
        g: 720 * k, life: life, max: life,
        w: 0.6 + Math.random() * 0.9
      });
    }
    // iri, yavaş közler
    for (var j = 0; j < Math.round(n / 8); j++) {
      var th2 = rr(-Math.PI * 0.95, -Math.PI * 0.05), sp2 = (35 + Math.random() * 80) * k;
      var l2 = 0.6 + Math.random() * 0.8;
      parts.push({
        kind: 1, x: ix, y: iy, vx: Math.cos(th2) * sp2, vy: Math.sin(th2) * sp2,
        g: 120 * k, life: l2, max: l2, w: 0.8 + Math.random() * 1.0
      });
    }
  };

  SwordClash.prototype._spawnEmber = function () {
    var k = this.k;
    if (this.parts.length > 220) return;
    var l = 0.7 + Math.random() * 0.7;
    this.parts.push({
      kind: 1, x: rr(-14, 14) * k, y: rr(-4, 18) * k,
      vx: rr(-10, 10) * k, vy: -rr(14, 40) * k, g: -20 * k,
      life: l, max: l, w: 1 + Math.random() * 1.2
    });
  };

  SwordClash.prototype._updateParts = function (dt) {
    var s = dt / 1000, parts = this.parts, w = 0, i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      p.life -= s;
      if (p.life <= 0) continue;
      p.vx *= (1 - 1.6 * s);
      p.vy = p.vy * (1 - 1.1 * s) + p.g * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
      parts[w++] = p;
    }
    parts.length = w;
    var fx = this.fx; w = 0;
    for (i = 0; i < fx.length; i++) { if (this._now - fx[i].t0 < fx[i].dur) fx[w++] = fx[i]; }
    fx.length = w;
  };

  SwordClash.prototype._applyShake = function (dx, dy) {
    var el = this.o.shakeEl;
    if (!el) return;
    if (!dx && !dy) { el.style.transform = this._shakeBase || ''; return; }
    el.style.transform = (this._shakeBase ? this._shakeBase + ' ' : '') +
      'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
  };

  // ------------------------------------------------------------ rendering
  SwordClash.prototype._render = function () {
    var ctx = this.ctx, W = this.W, H = this.H, k = this.k;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sx = 0, sy = 0;
    if (this.shake) {
      var u = (this._now - this.shake.t0) / this.shake.dur;
      if (u >= 1) { this.shake = null; this._applyShake(0, 0); }
      else {
        var d = (1 - u) * (1 - u);
        sx = (Math.random() - 0.5) * 2 * this.shake.amp * d;
        sy = (Math.random() - 0.5) * 2 * this.shake.amp * d;
        this._applyShake(sx, sy);
      }
    }
    var cx = W / 2 + sx * 0.5, cy = H * this.o.originY + sy * 0.5;
    var t = this.animT;

    if (this.active) {
      var alpha = this._masterAlpha(t);
      if (alpha > 0.01) {
        var order = [0, 1];
        var swing = t >= 420 && t < 510;
        var glowAge = this._now - this.lastImpact;
        var glow = glowAge < 500 ? Math.exp(-glowAge / 140) : 0;
        for (var oi = 0; oi < 2; oi++) {
          var side = order[oi];
          var col = hexRgb(side === 0 ? this.o.attacker : this.o.defender);
          if (swing) {
            this._trail(ctx, side, t, cx, cy, alpha, col);
            var gh = [9, 18, 27], ga = [0.04, 0.02, 0.008];
            for (var g = 0; g < 3; g++) this._sword(ctx, side, t - gh[g], cx, cy, alpha * ga[g], col, 0, t);
          }
          this._sword(ctx, side, t, cx, cy, alpha, col, glow, t);
        }
      }
    }
    this._drawFx(ctx, cx, cy);
    this._drawParts(ctx, cx, cy);
  };

  // Savruluş izi: kılıç ucunun ve ortasının son ~40 ms'deki yolu
  SwordClash.prototype._trail = function (ctx, side, t, cx, cy, alpha, col) {
    var k = this.k, steps = [0, 10, 20, 30, 40], tips = [], mids = [], i;
    for (i = 0; i < steps.length; i++) {
      var p = this._pose(side, Math.max(0, t - steps[i]));
      var a = p.a * DEG, s = Math.sin(a), c = Math.cos(a);
      tips.push([cx + (p.x + 100 * s) * k, cy + (p.y - 100 * c) * k]);
      mids.push([cx + (p.x + 60 * s) * k, cy + (p.y - 60 * c) * k]);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (i = 0; i < steps.length - 1; i++) {
      var f = 1 - i / (steps.length - 1);
      ctx.strokeStyle = 'rgba(' + Math.round(lerp(col[0], 255, 0.92)) + ',' + Math.round(lerp(col[1], 255, 0.92)) + ',' + Math.round(lerp(col[2], 255, 0.92)) + ',' + (0.16 * f * alpha) + ')';
      ctx.lineWidth = 5 * k * f + 0.8;
      ctx.beginPath(); ctx.moveTo(tips[i][0], tips[i][1]); ctx.lineTo(tips[i + 1][0], tips[i + 1][1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.10 * f * alpha) + ')';
      ctx.lineWidth = 4 * k * f + 0.6;
      ctx.beginPath(); ctx.moveTo(mids[i][0], mids[i][1]); ctx.lineTo(mids[i + 1][0], mids[i + 1][1]); ctx.stroke();
    }
    ctx.restore();
  };

  // Tek kılıç: pivot orijinde, ucu yukarıda. Rönesans uzun kılıcı: ince çelik bıçak
  // (iki yüzlü, oluklu) · hafif eğik pirinç siper · deri sarımlı kabza · çark topuz.
  // Bıçak esnemesi (derece): savruluşta uç geride kalır, çarpmada bükülür, sonra sönümlü titreyerek düzelir.
  SwordClash.prototype._flex = function (t) {
    var T = IMP[0].t;
    if (t < T) { var u = clamp((t - 440) / 65, 0, 1); return -4 * u * u * (3 - 2 * u); }
    var d = t - T;
    return -4 * Math.exp(-d / 110) * Math.cos(d * 0.06);
  };

  SwordClash.prototype._sword = function (ctx, side, t, cx, cy, alpha, col, glow, nowT) {
    var k = this.k, p = this._pose(side, t);
    var f = this._flex(t) * (side === 0 ? 1 : -1);
    ctx.save();
    ctx.translate(cx + p.x * k, cy + p.y * k);
    ctx.rotate(p.a * DEG);
    ctx.scale(k, k);
    ctx.globalAlpha = clamp(alpha, 0, 1);
    if (Math.abs(f) < 0.08) {
      this._swordBody(ctx, side, glow, nowT, col);
    } else {                                           // 3 dilim: kabza sabit, orta hafif, uç en çok bükülür
      var f1 = f * 0.4 * DEG, f2 = (f - f * 0.4) * DEG;
      ctx.save(); ctx.beginPath(); ctx.rect(-70, -24, 140, 140); ctx.clip();
      this._swordBody(ctx, side, glow, nowT, col); ctx.restore();
      ctx.save(); ctx.translate(0, -24); ctx.rotate(f1); ctx.translate(0, 24);
      ctx.beginPath(); ctx.rect(-70, -66, 140, 42); ctx.clip();
      this._swordBody(ctx, side, glow, nowT, col); ctx.restore();
      ctx.save(); ctx.translate(0, -24); ctx.rotate(f1); ctx.translate(0, 24);
      ctx.translate(0, -66); ctx.rotate(f2); ctx.translate(0, 66);
      ctx.beginPath(); ctx.rect(-70, -130, 140, 64); ctx.clip();
      this._swordBody(ctx, side, glow, nowT, col); ctx.restore();
    }
    ctx.restore();
  };

  SwordClash.prototype._swordBody = function (ctx, side, glow, nowT, col) {
    var i;

    // takım rengi: yalnızca çok hafif bir yansıma
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var gr = ctx.createRadialGradient(0, -42, 4, 0, -42, 60);
    var ga = 0.01 + glow * 0.04;
    gr.addColorStop(0, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + ga + ')');
    gr.addColorStop(1, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0)');
    ctx.fillStyle = gr;
    ctx.fillRect(-80, -120, 160, 190);
    ctx.restore();

    if (this._spriteOk) {            // Figma'dan gelen kılıç çizimi varsa onu kullan
      var sp = this.o.sprite;
      ctx.drawImage(this._img, -sp.px, -sp.py, sp.w, sp.h);
      return;
    }
    // ---- gerçekçi çelik: düz kenarlı, mızrak uçlu, oluklu bıçak
    function blade() {
      ctx.beginPath();
      ctx.moveTo(0, -104); ctx.lineTo(1.7, -96); ctx.lineTo(2.7, -78); ctx.lineTo(5.9, 12);
      ctx.lineTo(-5.9, 12); ctx.lineTo(-2.7, -78); ctx.lineTo(-1.7, -96); ctx.closePath();
    }
    ctx.save();
    blade(); ctx.clip();
    var lg = ctx.createLinearGradient(0, -104, 0, 12);
    lg.addColorStop(0, '#79828e'); lg.addColorStop(0.5, '#4a525d'); lg.addColorStop(1, '#262c34');
    ctx.fillStyle = lg; ctx.fillRect(-8, -106, 8, 120);
    var rg = ctx.createLinearGradient(0, -104, 0, 12);
    rg.addColorStop(0, '#e2e7ee'); rg.addColorStop(0.5, '#a3adba'); rg.addColorStop(1, '#5d6978');
    ctx.fillStyle = rg; ctx.fillRect(0, -106, 8, 120);
    // fırçalanmış çelik: ince boyuna çizgiler
    for (i = 0; i < 16; i++) {
      var bx = -5.6 + i * 0.75, ba = 0.03 + ((i * 7) % 5) * 0.012;
      ctx.fillStyle = (i % 2 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + ba + ')';
      ctx.fillRect(bx, -104 + (i * 5) % 9, 0.35, 116);
    }
    // olukun (fuller) gölgesi ve parlak iç kenarı
    ctx.fillStyle = 'rgba(8,12,18,0.55)'; ctx.fillRect(-1.5, -66, 1.5, 70);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0.2, -66, 0.7, 70);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-1.5, 4, 3, 1);
    // kenar bizotları (keskin ağız parlaması)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(1.7, -96); ctx.lineTo(2.7, -78); ctx.lineTo(5.9, 12);
    ctx.moveTo(-1.7, -96); ctx.lineTo(-2.7, -78); ctx.lineTo(-5.9, 12); ctx.stroke();
    // sırt çizgisi
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(0, -104); ctx.lineTo(0, -66); ctx.stroke();
    // tabana doğru derinlik
    var dg = ctx.createLinearGradient(0, -20, 0, 12);
    dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = dg; ctx.fillRect(-8, -20, 16, 34);
    // hareketli ışık yansıması
    ctx.globalCompositeOperation = 'lighter';
    var s0 = ((nowT * 0.0011) + side * 0.37) % 1;
    var sg = ctx.createLinearGradient(0, -104, 0, 12);
    sg.addColorStop(clamp(s0 - 0.08, 0, 1), 'rgba(255,255,255,0)');
    sg.addColorStop(clamp(s0, 0, 1), 'rgba(255,255,255,' + (0.1 + glow * 0.2) + ')');
    sg.addColorStop(clamp(s0 + 0.08, 0, 1), 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(-9, -105, 18, 118);
    if (glow > 0.02) {                                   // çarpmada uçtaki sıcak yansıma
      var hg = ctx.createRadialGradient(0, -92, 0, 0, -92, 26);
      hg.addColorStop(0, 'rgba(255,214,150,' + (glow * 0.35) + ')'); hg.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = hg; ctx.fillRect(-9, -105, 18, 40);
    }
    ctx.restore();
    blade(); ctx.lineJoin = 'miter'; ctx.lineWidth = 0.4; ctx.strokeStyle = 'rgba(10,14,20,0.75)'; ctx.stroke();

    // siper: çelik, hafif kıvrık kollar, top uçlar
    var gg = ctx.createLinearGradient(0, 11, 0, 16);
    gg.addColorStop(0, '#9aa1ab'); gg.addColorStop(0.35, '#e3e7ec'); gg.addColorStop(0.7, '#6a717b'); gg.addColorStop(1, '#2b3037');
    ctx.fillStyle = gg; ctx.strokeStyle = 'rgba(14,18,24,0.8)'; ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-24, 16); ctx.quadraticCurveTo(-23, 11.6, -9, 11.5); ctx.lineTo(9, 11.5);
    ctx.quadraticCurveTo(23, 11.6, 24, 16); ctx.quadraticCurveTo(22, 14.6, 9, 14.8);
    ctx.lineTo(-9, 14.8); ctx.quadraticCurveTo(-22, 14.6, -24, 16); ctx.closePath();
    ctx.fill(); ctx.stroke();
    for (var fs = -1; fs <= 1; fs += 2) {
      var fg = ctx.createRadialGradient(fs * 24 - 0.7, 15.3, 0.2, fs * 24, 16, 2.6);
      fg.addColorStop(0, '#f1f3f6'); fg.addColorStop(0.5, '#8e96a1'); fg.addColorStop(1, '#2d333a');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fs * 24, 16, 2.3, 0, TAU); ctx.fill(); ctx.stroke();
    }
    rrect(ctx, -4.6, 9.6, 9.2, 8.4, 2); ctx.fillStyle = gg; ctx.fill(); ctx.stroke();

    // kabza: deri sarım, silindirik gölgeleme
    var kg = ctx.createLinearGradient(-2.8, 0, 2.8, 0);
    kg.addColorStop(0, '#0e0805'); kg.addColorStop(0.4, '#4b2f1b'); kg.addColorStop(0.55, '#6a4527'); kg.addColorStop(1, '#0e0805');
    rrect(ctx, -2.8, 17.5, 5.6, 29.5, 1.2); ctx.fillStyle = kg; ctx.fill();
    ctx.lineWidth = 0.7;
    for (i = 0; i < 10; i++) {
      var yy = 19 + i * 2.9;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.moveTo(-2.8, yy); ctx.lineTo(2.8, yy + 1.6); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,160,100,0.22)';
      ctx.beginPath(); ctx.moveTo(-2.8, yy + 0.8); ctx.lineTo(2.8, yy + 2.4); ctx.stroke();
    }

    // çark topuz (çelik)
    rrect(ctx, -2.2, 46.5, 4.4, 3.4, 1); ctx.fillStyle = '#6a717b'; ctx.fill();
    var pg = ctx.createRadialGradient(-1.8, 51.8, 0.4, 0, 53.5, 6.2);
    pg.addColorStop(0, '#f4f6f8'); pg.addColorStop(0.35, '#9aa2ad'); pg.addColorStop(1, '#2f353c');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 53.5, 5.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(14,18,24,0.8)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(0, 53.5, 5.6, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(14,18,24,0.4)'; ctx.beginPath(); ctx.arc(0, 53.5, 3, 0, TAU); ctx.stroke();
  };

  SwordClash.prototype._drawFx = function (ctx, cx, cy) {
    var fx = this.fx, k = this.k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < fx.length; i++) {
      var f = fx[i], u = (this._now - f.t0) / f.dur;
      if (u < 0 || u >= 1) continue;
      var x = cx + f.x, y = cy + f.y, g, r;
      if (f.type === 'flash') {
        r = (24 + 16 * u) * k * f.mag * 1.1;
        var a = Math.pow(1 - u, 1.8) * 0.7;
        g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
        g.addColorStop(0.25, 'rgba(255,243,196,' + (a * 0.85) + ')');
        g.addColorStop(0.6, 'rgba(255,170,70,' + (a * 0.35) + ')');
        g.addColorStop(1, 'rgba(255,120,30,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      } else if (f.type === 'streak') {
        var a2 = Math.pow(1 - u, 1.2);
        var hw = 78 * k * f.mag * (1 - u * 0.4), vh = 48 * k * f.mag * (1 - u * 0.3);
        g = ctx.createLinearGradient(x - hw, y, x + hw, y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,' + a2 + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - hw, y - 1.1 * k - 0.4, hw * 2, 2.2 * k + 0.8);
        g = ctx.createLinearGradient(x, y - vh, x, y + vh);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,' + (a2 * 0.8) + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 0.8 * k - 0.3, y - vh, 1.6 * k + 0.6, vh * 2);
      } else if (f.type === 'ring') {
        var e = EASE.outCubic(u);
        r = (6 + (f.big ? 60 : 92) * f.mag * 0.9 * e) * k;
        ctx.lineWidth = Math.max(0.6, (2.6 * (1 - u) + 0.6) * k);
        ctx.strokeStyle = 'rgba(255,240,210,' + ((f.big ? 0.75 : 0.3) * (1 - u)) + ')';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  };

  SwordClash.prototype._drawParts = function (ctx, cx, cy) {
    var parts = this.parts, k = this.k;
    if (!parts.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], f = p.life / p.max;
      var c = heat(1 - f);
      var al = Math.min(1, f * 1.7);
      var x = cx + p.x, y = cy + p.y;
      if (p.kind === 0) {
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
        var len = clamp(sp * 0.018, 1.5, 14 * k + 3);
        ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + al + ')';
        ctx.lineWidth = Math.max(0.6, p.w * k * 0.9);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - (p.vx / sp) * len, y - (p.vy / sp) * len);
        ctx.stroke();
      } else {
        var r = p.w * k * 1.6 + 0.5;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (al * 0.9) + ')');
        g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
      }
    }
    ctx.restore();
  };

  // ----------------------------------------------------------- public API
  root.WCSwordClash = {
    version: '2.3.0-renaissance',
    mount: function (host, opts) { return new SwordClash(host, opts); },
    defaults: DEFAULTS
  };
})(typeof window !== 'undefined' ? window : this);
