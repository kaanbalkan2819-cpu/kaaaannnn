/* V227 — ANA MENÜ MÜZİĞİ + EFEKTLER + SAVAŞ SESLERİ (tamamı bu dosyada kodla sentezlenir; üçüncü taraf kaydı/örnek YOKTUR).
   Çıktı: www/assets/audio/menu.ogg, www/assets/audio/sfx/*.ogg (Opus). Zar sesi (wc_sfx_data.js 'dice') değiştirilmez. */
(function () {
  'use strict';
  var SR = 48000;
  var seed = 227;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function R(a, b) { return a + rnd() * (b - a); }
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(n) { var m = /^([A-G])([#b]?)(-?\d)$/.exec(n), s = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), o = +m[3]; return 440 * Math.pow(2, (s + (o + 1) * 12 - 69) / 12); }

  /* ---------- sahne kurucu ---------- */
  function K(d) {
    var c = new OfflineAudioContext(2, Math.ceil(d * SR), SR), me = this; this.c = c; this.d = d;
    this.out = c.createGain(); this.out.connect(c.destination);
    var n = SR * 5; this.nb = [0, 1, 2].map(function () { var b = c.createBuffer(1, n, SR), a = b.getChannelData(0); for (var i = 0; i < n; i++) a[i] = rnd() * 2 - 1; return b; });
    this.nbi = 0; void me;
  }
  K.prototype.noise = function () { var s = this.c.createBufferSource(); s.buffer = this.nb[this.nbi++ % 3]; s.loop = true; return s; };
  K.prototype.pan = function (dst, p) { var q = this.c.createStereoPanner(); q.pan.value = p || 0; q.connect(dst || this.out); return q; };
  /* zarf: pts = [[zaman, değer], ...] doğrusal */
  function ramp(p, t, pts) { p.setValueAtTime(pts[0][1], t + pts[0][0]); for (var i = 1; i < pts.length; i++) p.linearRampToValueAtTime(pts[i][1], t + pts[i][0]); }
  /* gürültü: hızlı atak + üstel sönüm, süpürülen filtre */
  K.prototype.nz = function (t, d, o) {
    var c = this.c, s = this.noise(), f = c.createBiquadFilter(), e = c.createGain(), a = o.a || .001;
    f.type = o.type || 'lowpass'; f.Q.value = o.q == null ? .7 : o.q; f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + d);
    e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(o.g, t + a); e.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(e); e.connect(o.dst || this.out); s.start(t, rnd() * 4); s.stop(t + d + .02); return e;
  };
  /* gürültü: elle zarf */
  K.prototype.nzE = function (t, pts, o) {
    var c = this.c, s = this.noise(), f = c.createBiquadFilter(), e = c.createGain(), T = pts[pts.length - 1][0];
    f.type = o.type || 'bandpass'; f.Q.value = o.q == null ? .8 : o.q;
    if (o.fp) ramp(f.frequency, t, o.fp); else f.frequency.value = o.f0;
    ramp(e.gain, t, pts); s.connect(f); f.connect(e); e.connect(o.dst || this.out); s.start(t, rnd() * 4); s.stop(t + T + .02); return e;
  };
  K.prototype.tn = function (t, d, o) {
    var c = this.c, s = c.createOscillator(), e = c.createGain(), a = o.a || .002; s.type = o.type || 'sine'; s.frequency.setValueAtTime(o.f0, t); if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + d * (o.fk || 1)); if (o.det) s.detune.value = o.det;
    e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(o.g, t + a); e.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(e); e.connect(o.dst || this.out); s.start(t); s.stop(t + d + .02); return s;
  };
  /* salon/açık hava yankısı */
  K.prototype.verb = function (rt, lp, wet, er) {
    var c = this.c, n = Math.ceil(rt * 1.3 * SR), b = c.createBuffer(2, n, SR);
    for (var ch = 0; ch < 2; ch++) {
      var a = b.getChannelData(ch), y = 0;
      for (var i = 0; i < n; i++) { var t = i / SR, k = .08 + .92 * Math.pow(lp / 16000, .5) * Math.exp(-t * 1.6); y += k * ((rnd() * 2 - 1) - y); a[i] = y * Math.pow(10, -3 * t / rt) * Math.min(1, t * 90); }
      for (var j = 0; j < (er || 0); j++) { var p = Math.floor(R(.007, .075) * SR); a[p] += (rnd() < .5 ? -1 : 1) * R(.35, .9) * Math.exp(-p / SR * 14); }
    }
    var cv = c.createConvolver(); cv.normalize = true; cv.buffer = b; var g = c.createGain(); g.gain.value = wet; cv.connect(g); g.connect(this.out); return cv;
  };
  /* gönderimli çıkış: kuru + yankı */
  K.prototype.bus = function (dry, send, verb) { var g = this.c.createGain(), d = this.c.createGain(), s = this.c.createGain(); d.gain.value = dry; s.gain.value = send; g.connect(d); g.connect(s); d.connect(this.out); s.connect(verb); return g; };
  /* Karplus-Strong tel: gerçek telli çalgı tınısı */
  var ksC = {};
  K.prototype.ks = function (f, dur, damp) {
    var key = f.toFixed(2) + '|' + dur + '|' + damp; if (ksC[key] && ksC[key].sr === SR) return ksC[key].a;
    var n = Math.ceil(dur * SR), P = SR / f, N = Math.floor(P), frac = P - N, d = new Float32Array(N + 2), a = new Float32Array(n), last = 0, pick = Math.max(2, Math.floor(N * .2));
    for (var i = 0; i < N; i++) d[i] = rnd() * 2 - 1;
    for (i = N - 1; i >= pick; i--) d[i] -= d[i - pick] * .9;
    var p = 0, sm = 0; for (i = 0; i < N; i++) { sm += .55 * (d[i] - sm); d[i] = sm; }
    for (i = 0; i < n; i++) {
      var q = (p + 1) % N, y = d[p] * (1 - frac) + d[q] * frac, nv = (1 - damp) * y + damp * last; last = y; nv *= .9965; d[p] = nv; a[i] = nv; p = q;
    }
    var m = 0; for (i = 0; i < n; i++) m = Math.max(m, Math.abs(a[i])); for (i = 0; i < n; i++) a[i] /= m || 1;
    ksC[key] = { a: a, sr: SR }; return a;
  };
  K.prototype.pluck = function (t, f, g, dst, dur, damp) {
    var c = this.c, a = this.ks(f, dur || 2.6, damp == null ? .42 : damp), b = c.createBuffer(1, a.length, SR); b.copyToChannel(a, 0);
    var s = c.createBufferSource(), e = c.createGain(); s.buffer = b; e.gain.value = g; s.connect(e); e.connect(dst); s.start(t);
  };
  K.prototype.bell = function (t, f, g, d, dst) {
    var me = this; [[1, 1, 1], [2.0, .5, .75], [2.76, .32, .55], [4.07, .18, .4], [5.4, .09, .3]].forEach(function (q) { me.tn(t, d * q[2], { f0: f * q[0], g: g * q[1], a: .002, dst: dst }); });
  };
  /* bakır (boru) sesi: filtre atakta açılır, küçük perde kayması */
  K.prototype.brass = function (t, d, f, g, dst, br) {
    var c = this.c, fl = c.createBiquadFilter(), e = c.createGain(), B = br || 1; fl.type = 'lowpass'; fl.Q.value = 1.1;
    var R0 = Math.min(d, .4); ramp(fl.frequency, t, [[0, f * 1.5], [.1, f * 7 * B], [R0, f * 4.4 * B], [Math.max(d, R0 + .01), f * 3.4 * B]]);
    ramp(e.gain, t, [[0, .0001], [.09, g], [Math.max(.12, d - .14), g * .8], [d + .22, .0001]]);
    [-7, 0, 6].forEach(function (x, i) { var s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.setValueAtTime(x - 28, t); s.detune.linearRampToValueAtTime(x, t + .07); s.connect(fl); s.start(t + i * .004); s.stop(t + d + .25); });
    fl.connect(e); e.connect(dst);
  };
  K.prototype.timp = function (t, f, g, dst) {
    this.tn(t, 1.7, { f0: f * 1.5, f1: f, fk: .05, g: g, a: .003, dst: dst }); this.tn(t, .9, { f0: f * 2.3, g: g * .22, a: .003, dst: dst }); this.tn(t, .5, { f0: f * 3.4, g: g * .1, a: .002, dst: dst });
    this.nz(t, .09, { type: 'bandpass', f0: 420, q: .9, g: g * .5, dst: dst });
  };
  K.prototype.war = function (t, f, g, dst) {   /* savaş davulu: tok gövde + deri vuruşu */
    this.tn(t, .55, { f0: f * 2.6, f1: f, fk: .14, g: g, a: .002, dst: dst }); this.nz(t, .12, { type: 'lowpass', f0: 1900, f1: 300, g: g * .55, dst: dst });
  };
  K.prototype.render = function (peak, drive) {
    return this.c.startRendering().then(function (b) {
      var L = b.getChannelData(0), Rr = b.getChannelData(1), m = 0, i, n = L.length, d = drive || 0, mean = [0, 0];
      for (i = 0; i < n; i++) { mean[0] += L[i]; mean[1] += Rr[i]; } mean[0] /= n; mean[1] /= n;
      for (i = 0; i < n; i++) { L[i] -= mean[0]; Rr[i] -= mean[1]; m = Math.max(m, Math.abs(L[i]), Math.abs(Rr[i])); }
      var k = 1 / (m || 1), top = d ? Math.tanh(d) : 1;
      for (i = 0; i < n; i++) { var l = L[i] * k, r = Rr[i] * k; if (d) { l = Math.tanh(l * d) / top; r = Math.tanh(r * d) / top; } L[i] = l * peak; Rr[i] = r * peak; }
      var fade = Math.floor(.02 * SR); for (i = 0; i < fade; i++) { var g = 1 - i / fade; L[n - 1 - i] *= 1 - g; Rr[n - 1 - i] *= 1 - g; }
      return [L, Rr];
    });
  };

  /* ---------- ortak patlama ---------- */
  function blast(k, t, S, dst, tail) {
    var T = tail || 1;
    k.nz(t, .05, { type: 'highpass', f0: 1800, g: .85 * Math.min(1.2, S), dst: dst });
    k.nz(t, .16, { type: 'bandpass', f0: 1100, f1: 300, q: .7, g: .9, dst: dst });
    k.tn(t, .55, { f0: 150, f1: 44, fk: .55, g: 1.05, a: .002, dst: dst });
    k.tn(t, 1.9 * T, { f0: 72, f1: 27, fk: .7, g: .95 * S, a: .004, dst: dst });
    k.nz(t, 2.2 * T, { type: 'lowpass', f0: 2600, f1: 95, q: .5, g: .95, a: .002, dst: dst });
    k.nz(t + .02, 3.3 * T, { type: 'bandpass', f0: 460, f1: 70, q: .8, g: .55 * S, a: .02, dst: dst });
    for (var i = 0; i < 34; i++) { var x = t + R(.22, 2.2 * T), dk = Math.exp(-(x - t) * 1.1); k.nz(x, R(.012, .05), { type: 'bandpass', f0: R(1300, 5200), q: 2, g: R(.05, .24) * dk, dst: k.pan(dst, R(-.6, .6)) }); }
  }
  function shot(k, t, g, dst) {
    k.nz(t, .012, { type: 'highpass', f0: 2400, g: g, dst: dst }); k.nz(t, .09, { type: 'bandpass', f0: 1100, f1: 340, q: .8, g: g * .85, dst: dst });
    k.tn(t, .08, { f0: 210, f1: 92, g: g * .75, a: .001, dst: dst });
  }

  /* ---------- efekt tarifleri ---------- */
  var FX = {
    click: [.16, 1, function (k) { var v = k.bus(1, .25, k.verb(.3, 3500, .5)); k.tn(.002, .03, { f0: 1250, f1: 720, type: 'triangle', g: .7, dst: v }); k.nz(.002, .014, { type: 'bandpass', f0: 2900, q: 1.2, g: .55, dst: v }); k.tn(.003, .05, { f0: 240, f1: 150, g: .4, dst: v }); }, .62],
    tick: [.1, 1, function (k) { k.tn(.002, .028, { f0: 1700, f1: 1250, type: 'triangle', g: .6 }); k.nz(.002, .008, { type: 'bandpass', f0: 4200, q: 1.4, g: .35 }); }, .42],
    notify: [1, 1, function (k) { var v = k.bus(1, .4, k.verb(.8, 6000, .5)); k.bell(.005, hz('D6'), .5, .7, v); k.bell(.1, hz('A6'), .42, .7, v); }, .4],
    ping: [1.5, 1, function (k) { var v = k.bus(1, .5, k.verb(1.1, 6500, .6)); k.bell(.005, hz('E6'), .55, 1, v); k.bell(.42, hz('E6'), .22, .9, v); }, .42],
    coin: [.9, 1, function (k) { var v = k.bus(1, .35, k.verb(.5, 9000, .4)); [[.005, 1], [.09, .75], [.17, .55], [.26, .3]].forEach(function (h, j) { [5200, 7350, 9100, 10800].forEach(function (f, i) { k.tn(h[0], R(.11, .28), { f0: f * R(.97, 1.04) * (1 - j * .012), g: h[1] * [.3, .22, .15, .08][i], a: .001, dst: v }); }); }); }, .46],
    pact: [3, 2, function (k) { var v = k.bus(.9, .55, k.verb(2, 5000, .65, 6)); ['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5'].forEach(function (n, i) { k.pluck(.01 + i * .105, hz(n), .5 - i * .03, v, 2.6, .35); }); k.bell(.72, hz('D6'), .22, 1.8, v); ['D3', 'A3', 'F#4'].forEach(function (n) { k.brass(.08, 1.7, hz(n), .05, v, .5); }); }, .6],
    win: [3.4, 2, function (k) { var v = k.bus(.85, .55, k.verb(2.4, 5200, .7, 8)); k.brass(.05, .3, hz('G4'), .17, v); k.brass(.05, .3, hz('D4'), .13, v); k.brass(.38, .16, hz('G4'), .17, v); k.brass(.38, .16, hz('D4'), .13, v); k.brass(.56, .2, hz('A4'), .17, v); k.brass(.56, .2, hz('E4'), .13, v); ['G3', 'D4', 'G4', 'B4', 'D5'].forEach(function (n) { k.brass(.8, 1.7, hz(n), .13, v, 1.2); }); k.timp(.05, 98, .7, v); k.timp(.38, 98, .55, v); k.timp(.8, 98, .95, v); k.nzE(.76, [[0, .0001], [.03, .34], [2, .0001]], { type: 'highpass', f0: 5200, dst: v }); }, .84],
    lose: [3.4, 2, function (k) { var v = k.bus(.75, .6, k.verb(2.8, 3000, .75, 8)); [['A3', 'E3', 0], ['G#3', 'D#3', .55], ['G3', 'D3', 1.1]].forEach(function (q) { k.brass(q[2] + .05, .5, hz(q[0]), .14, v, .6); k.brass(q[2] + .05, .5, hz(q[1]), .12, v, .6); }); ['D3', 'F3', 'A2'].forEach(function (n) { k.brass(1.65, 1.4, hz(n), .13, v, .55); }); k.timp(.05, 73.4, .55, v); k.timp(1.65, 55, .95, v); }, .76],
    conq: [3, 2, function (k) { var v = k.bus(.85, .5, k.verb(2.2, 5000, .7, 8)); k.war(.02, 88, .9, v); k.war(.2, 88, .6, v); k.war(.38, 88, .9, v); ['C4', 'G4', 'C5', 'E5'].forEach(function (n) { k.brass(.4, 1.5, hz(n), .15, v, 1.2); }); k.brass(.02, .3, hz('G4'), .16, v); k.timp(.4, 130.8, .9, v); k.nzE(.36, [[0, .0001], [.03, .4], [1.7, .0001]], { type: 'highpass', f0: 5000, dst: v }); }, .84],
    attack: [2.6, 2, function (k) { var v = k.bus(.85, .5, k.verb(1.9, 4200, .7, 8)); [0, .22, .44, .66, .77, .88].forEach(function (x, i) { k.war(.02 + x, i % 3 === 0 ? 74 : 92, i % 3 === 0 ? 1 : .7, v); }); ['D3', 'A3', 'D4'].forEach(function (n) { k.brass(.1, .85, hz(n), .13, v, 1.1); }); ['F3', 'C4', 'F4'].forEach(function (n) { k.brass(.95, .9, hz(n), .1, v, 1.2); }); }, .84],
    horn: [4.2, 2, function (k) { var v = k.bus(.7, .7, k.verb(3, 1800, .8, 6)); [58.3, 87.3, 116.5].forEach(function (f, i) { k.brass(.05, 2.6, f, .34 - i * .08, v, .32); }); }, .8],
    cannon: [2.7, 2, function (k, i) { var v = k.bus(.85, .45, k.verb(1.6 + i * .25, 3200, .65, 8)); k.nz(.003, .03, { type: 'highpass', f0: 2300, g: 1, dst: v }); k.nz(.003, .22, { type: 'bandpass', f0: 1050 - i * 110, f1: 260, q: .7, g: 1, dst: v }); k.tn(.003, .5, { f0: 175 - i * 16, f1: 40, fk: .55, g: 1.15, dst: v }); k.tn(.01, 1.1, { f0: 66, f1: 30, fk: .7, g: .75, dst: v }); k.nz(.01, 1.3, { type: 'lowpass', f0: 1500, f1: 110, q: .5, g: .55, dst: v }); k.tn(.36, .05, { f0: 1100, type: 'triangle', g: .13, dst: v }); k.nz(.36, .06, { type: 'bandpass', f0: 2500, q: 2, g: .16, dst: v }); }, .95, 3, 1.3],
    boom: [4, 2, function (k, i) { var v = k.bus(.85, .5, k.verb(2.3, 2400, .7, 8)); blast(k, .004, 1 + i * .12, v, 1 + i * .08); }, .95, 3, 1.5],
    hit: [2, 2, function (k, i) { var v = k.bus(.85, .5, k.verb(1.2, 3200, .6, 6)); k.nz(.003, .03, { type: 'highpass', f0: 2000, g: .85, dst: v }); k.nz(.003, .8, { type: 'lowpass', f0: 2300 - i * 200, f1: 150, q: .6, g: .9, dst: v }); k.tn(.003, .34, { f0: 170 - i * 18, f1: 52, fk: .6, g: .9, dst: v }); for (var q = 0; q < 12; q++) k.nz(R(.1, .8), R(.01, .04), { type: 'bandpass', f0: R(1800, 5000), q: 2, g: R(.05, .18), dst: v }); }, .9, 3, 1.3],
    shot: [.9, 2, function (k, i) { var v = k.bus(.9, .45, k.verb(.8, 4200, .55, 8)); shot(k, .003, .95 - i * .1, v); }, .85, 4, 1.4],
    mg: [1.2, 2, function (k, i) { var v = k.bus(.9, .4, k.verb(.8, 4200, .55, 8)); var n = 5 + i, st = .078; for (var q = 0; q < n; q++) shot(k, .004 + q * st + R(-.004, .004), R(.65, 1), v); }, .85, 2, 1.4],
    missile: [3.2, 2, function (k, i) { var v = k.bus(.85, .5, k.verb(1.6, 3000, .65, 6)); k.nz(.004, .05, { type: 'highpass', f0: 2100, g: .9, dst: v }); k.tn(.004, .5, { f0: 140, f1: 46, g: .9, dst: v }); var P = k.pan(v, -.25); k.nzE(.02, [[0, .0001], [.09, .85], [1.1, .7], [2.9, .0001]], { type: 'bandpass', q: .75, fp: [[0, 620 + i * 80], [1.3, 1700], [2.9, 2700]], dst: P }); k.nzE(.02, [[0, .0001], [.08, .85], [1.7, .5], [2.8, .0001]], { type: 'lowpass', q: .5, fp: [[0, 900], [2.8, 380]], dst: P }); k.tn(.02, 2.6, { f0: 62, f1: 150, type: 'sawtooth', g: .18, a: .12, dst: P }); }, .9, 2, 1.25],
    jet: [4, 2, function (k) { var v = k.bus(.85, .4, k.verb(1.4, 4000, .55, 6)), c = k.c, P = c.createStereoPanner(), n = 80, cv = new Float32Array(n), i; for (i = 0; i < n; i++) cv[i] = -1 + 2 * i / (n - 1); P.pan.setValueCurveAtTime(cv, 0, 3.9); P.connect(v); var pts = [[0, .0001], [1.2, .32], [1.75, 1], [2.2, .55], [3.9, .0001]]; k.nzE(.02, pts, { type: 'bandpass', q: .55, fp: [[0, 2700], [1.5, 2300], [2.05, 880], [3.9, 620]], dst: P }); k.nzE(.02, pts.map(function (q) { return [q[0], q[1] * .7]; }), { type: 'lowpass', q: .4, fp: [[0, 720], [3.9, 430]], dst: P }); var s = c.createOscillator(), e = c.createGain(), f = c.createBiquadFilter(); s.type = 'sawtooth'; ramp(s.frequency, 0, [[0, 620], [1.5, 560], [2.05, 215], [3.9, 170]]); f.type = 'lowpass'; f.frequency.value = 1500; ramp(e.gain, 0, pts.map(function (q) { return [q[0], q[1] * .14]; })); s.connect(f); f.connect(e); e.connect(P); s.start(0); s.stop(3.95); }, .9],
    splash: [1.8, 2, function (k) { var v = k.bus(.85, .4, k.verb(.9, 5000, .55, 6)); k.nz(.003, .9, { type: 'bandpass', f0: 2600, f1: 900, q: .6, g: .9, dst: v }); k.nz(.003, .4, { type: 'lowpass', f0: 640, f1: 130, g: .9, dst: v }); for (var q = 0; q < 42; q++) k.nz(R(.12, 1.25), R(.012, .05), { type: 'bandpass', f0: R(1600, 7000), q: 3, g: R(.05, .24), dst: k.pan(v, R(-.7, .7)) }); }, .8],
    wblast: [3.2, 2, function (k) { var v = k.bus(.85, .45, k.verb(1.7, 2600, .65, 8)); blast(k, .003, .85, v, .75); k.nz(.1, 2, { type: 'bandpass', f0: 2300, f1: 700, q: .5, g: .75, dst: v }); for (var q = 0; q < 54; q++) k.nz(R(.5, 2.5), R(.012, .05), { type: 'bandpass', f0: R(1500, 6500), q: 3, g: R(.05, .2), dst: k.pan(v, R(-.8, .8)) }); }, .92],
    collapse: [2.8, 2, function (k) { var v = k.bus(.85, .45, k.verb(1.3, 3000, .6, 8)); k.nz(.01, 1.8, { type: 'lowpass', f0: 1200, f1: 130, q: .6, g: .85, a: .02, dst: v }); k.tn(.01, .6, { f0: 110, f1: 36, g: .85, dst: v }); for (var q = 0; q < 70; q++) { var t = R(.02, 2.3), e = Math.exp(-t * 1.5); k.nz(t, R(.018, .07), { type: 'bandpass', f0: R(400, 3400), q: 2.4, g: R(.1, .55) * e + .03, dst: k.pan(v, R(-.6, .6)) }); } }, .85],
    clash: [1.5, 2, function (k, i) { var v = k.bus(.85, .55, k.verb(1, 7000, .6, 8)), base = 1320 + i * 170; k.nz(.002, .012, { type: 'highpass', f0: 3800, g: .95, dst: v }); k.nz(.002, .1 + i * .05, { type: 'bandpass', f0: 5600, f1: 2400, q: 1.1, g: .35, dst: v }); [[1, .55, .85], [1.49, .42, .68], [2.07, .34, .52], [2.76, .26, .42], [3.43, .16, .3], [4.31, .1, .22], [5.2, .06, .15]].forEach(function (q) { k.tn(.003, q[2] * (1.1 + i * .08), { f0: base * q[0] * R(.997, 1.003), g: q[1], a: .001, dst: v }); }); k.tn(.003, .06, { f0: 330, f1: 170, g: .45, dst: v }); }, .84, 3],
    siren: [5.4, 2, function (k) { var v = k.bus(.45, .85, k.verb(3.2, 2200, .85, 8)), c = k.c, fl = c.createBiquadFilter(), e = c.createGain(); fl.type = 'bandpass'; fl.frequency.value = 900; fl.Q.value = .5; ramp(e.gain, 0, [[0, .0001], [.7, .5], [3.7, .55], [5.1, .0001]]); fl.connect(e); e.connect(v); [1, 1.5].forEach(function (m, i) { var s = c.createOscillator(); s.type = i ? 'triangle' : 'sawtooth'; ramp(s.frequency, 0, [[0, 210 * m], [1.7, 640 * m], [3.4, 640 * m], [5.2, 240 * m]]); s.connect(fl); s.start(0); s.stop(5.3); }); }, .7],
    bomber: [6.6, 2, function (k) { var v = k.bus(.85, .35, k.verb(1.3, 2400, .5, 4)), c = k.c, P = c.createStereoPanner(), fl = c.createBiquadFilter(), e = c.createGain(), n = 60, cv = new Float32Array(n), i; for (i = 0; i < n; i++) cv[i] = .95 - 1.9 * i / (n - 1); P.pan.setValueCurveAtTime(cv, 0, 6.5); P.connect(v); fl.type = 'lowpass'; fl.frequency.value = 620; fl.Q.value = .8; var pts = [[0, .0001], [1.1, .3], [2.7, 1], [3.8, .8], [6.4, .0001]]; ramp(e.gain, 0, pts); fl.connect(e); e.connect(P); [52, 52.7, 78, 78.9, 104.4, 156].forEach(function (f, j) { var s = c.createOscillator(); s.type = 'sawtooth'; ramp(s.frequency, 0, [[0, f * 1.03], [2.8, f], [6.5, f * .95]]); var g = c.createGain(); g.gain.value = .24 - j * .025; s.connect(g); g.connect(fl); s.start(0); s.stop(6.55); }); k.nzE(.01, pts.map(function (q) { return [q[0], q[1] * .36]; }), { type: 'bandpass', q: .6, fp: [[0, 1250], [2.8, 1050], [6.4, 620]], dst: P }); }, .78],
    flak: [1.5, 2, function (k, i) { var v = k.bus(.65, .8, k.verb(1.6, 2500, .75, 8)); k.nz(.003, .02, { type: 'highpass', f0: 2800, g: .9, dst: v }); k.nz(.003, .34, { type: 'lowpass', f0: 1500 - i * 200, f1: 190, q: .6, g: .8, dst: v }); k.tn(.003, .3, { f0: 130 - i * 15, f1: 58, g: .55, dst: v }); }, .75, 2, 1.2],
    whistle: [2.5, 2, function (k) { var v = k.bus(.85, .4, k.verb(1, 4500, .5, 4)), c = k.c, s = c.createOscillator(), e = c.createGain(), l = c.createOscillator(), lg = c.createGain(); ramp(s.frequency, 0, [[0, 2350], [1.5, 1050], [2.32, 360]]); l.frequency.value = 6.2; lg.gain.value = 18; l.connect(lg); lg.connect(s.frequency); ramp(e.gain, 0, [[0, .0001], [.5, .3], [2.2, .95], [2.34, .0001]]); s.connect(e); e.connect(v); s.start(0); l.start(0); s.stop(2.4); l.stop(2.4); k.nzE(0, [[0, .0001], [1.2, .22], [2.2, .55], [2.34, .0001]], { type: 'bandpass', q: 1.5, fp: [[0, 2300], [1.5, 1050], [2.32, 380]], dst: v }); }, .72],
    nuke: [12, 2, function (k) {
      var v = k.bus(.85, .55, k.verb(3.6, 1800, .8, 10)), L = k.pan(v, -.7), Rg = k.pan(v, .7), i;
      k.nz(.002, .1, { type: 'highpass', f0: 1400, g: 1, dst: v }); k.nz(.002, .34, { type: 'bandpass', f0: 900, f1: 180, q: .5, g: 1, dst: v });
      k.tn(.003, 1.6, { f0: 118, f1: 26, fk: .5, g: 1.2, a: .003, dst: v }); k.tn(.01, 7, { f0: 46, f1: 18, fk: .9, g: 1, a: .02, dst: v });
      [L, Rg].forEach(function (d) {
        k.nz(.003, 8.6, { type: 'lowpass', f0: 3400, f1: 60, q: .45, g: 1, a: .003, dst: d });
        k.nz(.1, 10.5, { type: 'bandpass', f0: 340, f1: 48, q: .55, g: .75, a: .22, dst: d });
        k.nzE(.45, [[0, .0001], [.55, .55], [2.1, .32], [7.5, .0001]], { type: 'bandpass', q: .7, fp: [[0, 3000], [2.5, 900], [7.5, 300]], dst: d });
      });
      blast(k, .85, 1.1, v, 1.9); blast(k, 2.1, .8, v, 2.2);
      for (i = 0; i < 18; i++) { var t = R(1.8, 8.3); k.nz(t, R(.5, 1.4), { type: 'lowpass', f0: R(420, 900), f1: 75, q: .7, g: R(.14, .34), a: .05, dst: k.pan(v, R(-.8, .8)) }); }
      for (i = 0; i < 90; i++) { var u = R(1.1, 9), e2 = Math.exp(-u * .32); k.nz(u, R(.012, .06), { type: 'bandpass', f0: R(900, 4600), q: 2.2, g: R(.05, .26) * e2, dst: k.pan(v, R(-.9, .9)) }); }
    }, .98, 1, 1.6]
  };

  /* ---------- döngülü sesler: [son kısım][tam tur][baş kısım] (MP3 boşluğundan bağımsız kesintisiz döngü) ---------- */
  var LOOPS = {
    tank: [3.2, function (k) {
      var D = 3.2, c = k.c, fl = c.createBiquadFilter(), e = c.createGain(); fl.type = 'lowpass'; fl.frequency.value = 330; fl.Q.value = 1; e.gain.value = 1; fl.connect(e); e.connect(k.out);
      /* dizel: 25 Hz ile tam bölünen frekanslar → tur içinde periyodik */
      [25, 50, 75, 100, 150].forEach(function (f, i) { var s = c.createOscillator(), g = c.createGain(); s.type = 'sawtooth'; s.frequency.value = f; g.gain.value = .36 / (1 + i * .55); s.connect(g); g.connect(fl); s.start(0); s.stop(2 * D + 1.3); });
      var q, N = 32; for (var w = 0; w < 2; w++) for (q = 0; q < N; q++) { var t = (q * D / N) + w * D; var sq = (q % 4 === 0) ? 1 : R(.5, .85); k.nz(t, .05, { type: 'bandpass', f0: R(1100, 2500), q: 1.6, g: .24 * sq }); k.nz(t, .03, { type: 'lowpass', f0: 620, g: .3 * sq }); }
    }, .6],
    wave: [6, function (k) {
      var D = 6; [[0, 2.6, 'p'], [1.6, 2.9, 'q'], [3.6, 3.1, 'r']].forEach(function (a, i) {
        for (var w = 0; w < 2; w++) { var t = a[0] + w * D, P = k.pan(k.out, [-.5, .5, 0][i]); k.nzE(t, [[0, .0001], [a[1] * .42, .75], [a[1], .0001]], { type: 'lowpass', q: .4, fp: [[0, 380], [a[1] * .45, 2400], [a[1], 600]], dst: P }); k.nzE(t, [[0, .0001], [a[1] * .55, .25], [a[1], .0001]], { type: 'highpass', q: .4, f0: 3000, dst: P }); }
      });
    }, .55]
  };
  function loopify(pair, D, m) {
    var n = Math.round(D * SR), f = Math.round(m * SR), xf = Math.round(.25 * SR);
    /* render 2 tur + kuyruk; 2. turu al → kuyruk 1. turdan taşan kısmı içerir, baş ve son uyumlu */
    return pair.map(function (a) {
      var o = new Float32Array(n), i; for (i = 0; i < n; i++) o[i] = a[n + i] || 0;
      for (i = 0; i < xf; i++) { var k = i / xf; o[i] = o[i] * k + (a[2 * n + i] || a[i] || 0) * (1 - k); }
      var r = new Float32Array(f + n + f); r.set(o.subarray(n - f), 0); r.set(o, f); r.set(o.subarray(0, f), f + n); return r;
    });
  }

  /* ---------- ana menü müziği: "Cihan Hâkimiyeti" — re minör, 72 BPM, 24 ölçü (özgün beste) ---------- */
  var BPM = 72, B = 60 / BPM, BAR = B * 4;
  var CHD = { Dm: ['D2', 'D3', 'A3', 'D4', 'F4'], Bb: ['Bb1', 'Bb2', 'F3', 'Bb3', 'D4'], A: ['A1', 'A2', 'E3', 'A3', 'C#4'], F: ['F2', 'C3', 'A3', 'C4', 'F4'], Gm: ['G1', 'G2', 'D3', 'G3', 'Bb3'], Eb: ['Eb2', 'Bb2', 'Eb3', 'G3', 'Bb3'], C: ['C2', 'G2', 'E3', 'G3', 'C4'] };
  var FORM = ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Gm', 'Eb', 'A', 'Dm', 'F', 'C', 'Gm', 'Bb', 'F', 'Gm', 'A', 'Dm', 'Bb', 'F', 'C', 'Gm', 'Dm', 'Bb', 'A'];
  var RECORDER = { 4: [['A4', 0, 1.5], ['D5', 1.5, .5], ['F5', 2, 1], ['E5', 3, 1]], 5: [['D5', 0, 1.5], ['Bb4', 1.5, .5], ['G4', 2, 2]], 6: [['G4', 0, 1], ['Bb4', 1, 1], ['Eb5', 2, 1.5], ['D5', 3.5, .5]], 7: [['C#5', 0, 2], ['E5', 2, 1], ['A4', 3, 1]] };
  var HORN = { 8: [['D4', 0, 1.5], ['F4', 1.5, .5], ['A4', 2, 2]], 9: [['C5', 0, 1.5], ['A4', 1.5, .5], ['F4', 2, 2]], 10: [['G4', 0, 1], ['A4', 1, .5], ['Bb4', 1.5, .5], ['C5', 2, 2]], 11: [['Bb4', 0, 1.5], ['A4', 1.5, .5], ['G4', 2, 2]], 12: [['F4', 0, 1.5], ['G4', 1.5, .5], ['Bb4', 2, 2]], 13: [['A4', 0, 1.5], ['C5', 1.5, .5], ['F5', 2, 2]], 14: [['D5', 0, 1.5], ['Bb4', 1.5, .5], ['G4', 2, 1], ['A4', 3, 1]], 15: [['C#5', 0, 3], ['A4', 3, 1]] };
  var CLIMAX = { 16: [['D5', 0, 1.5], ['F5', 1.5, .5], ['A5', 2, 2]], 17: [['G5', 0, 1.5], ['F5', 1.5, .5], ['D5', 2, 2]], 18: [['C5', 0, 1.5], ['F5', 1.5, .5], ['A5', 2, 2]], 19: [['G5', 0, 1.5], ['E5', 1.5, .5], ['C5', 2, 2]], 20: [['Bb5', 0, 1.5], ['A5', 1.5, .5], ['G5', 2, 1], ['D5', 3, 1]], 21: [['F5', 0, 1.5], ['E5', 1.5, .5], ['D5', 2, 2]], 22: [['D5', 0, 1], ['C5', 1, 1], ['Bb4', 2, 2]], 23: [['C#5', 0, 2], ['A4', 2, 2]] };
  function buildMusic(k) {
    var c = k.c, TL = BAR * 24;
    var master = c.createDynamicsCompressor(); master.threshold.value = -15; master.ratio.value = 2.6; master.attack.value = .03; master.release.value = .28; master.connect(k.out);
    k.out = master; var verb = k.verb(3.6, 4200, .82, 12);
    var send = function (dry, wet, lp) { var g = k.bus(dry, wet, verb); if (!lp) return g; return g; };
    /* --- yaylı: üç detone testere, ortak gövde filtresi --- */
    var strIn = c.createGain(), sl = c.createBiquadFilter(), sp1 = c.createBiquadFilter(), sp2 = c.createBiquadFilter(), strOut = send(.55, .75);
    sl.type = 'lowpass'; sl.frequency.value = 2100; sl.Q.value = .4; sp1.type = 'peaking'; sp1.frequency.value = 320; sp1.gain.value = 3; sp1.Q.value = .9; sp2.type = 'peaking'; sp2.frequency.value = 1100; sp2.gain.value = 2.5; sp2.Q.value = 1;
    strIn.connect(sl); sl.connect(sp1); sp1.connect(sp2); sp2.connect(strOut);
    var vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.1; vg.gain.value = 9; vib.connect(vg); vib.start(0); vib.stop(TL + 6);
    function str(t, d, f, g, p) {
      var e = c.createGain(); ramp(e.gain, t, [[0, .0001], [Math.min(.8, d * .38), g], [Math.max(.9, d - .1), g * .86], [d + .85, .0001]]);
      [-10, 2, 11].forEach(function (x, i) { var s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = x; vg.connect(s.detune); s.connect(e); s.start(t + i * .015); s.stop(t + d + .95); });
      var q = k.pan(strIn, p); e.connect(q);
    }
    /* --- koro: "a" sesli formantları --- */
    var chIn = c.createGain(), chOut = send(.32, .95);
    [[780, 8, 1], [1160, 9, .55], [2800, 10, .24], [3400, 12, .14]].forEach(function (q) { var f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = q[0]; f.Q.value = q[1]; g.gain.value = q[2] * 4.2; chIn.connect(f); f.connect(g); g.connect(chOut); });
    function choir(t, d, f, g, p) {
      var e = c.createGain(); ramp(e.gain, t, [[0, .0001], [.9, g], [Math.max(1, d - .2), g * .9], [d + 1.1, .0001]]);
      [-13, -4, 5, 14].forEach(function (x) { var s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = x; vg.connect(s.detune); s.connect(e); s.start(t); s.stop(t + d + 1.2); });
      e.connect(k.pan(chIn, p));
    }
    var hornB = send(.62, .72), lute = send(.82, .42), flute = send(.6, .72), drums = send(.72, .55), low = send(.9, .25);
    function rec(t, d, f, g) {
      var e = c.createGain(), s = c.createOscillator(), s2 = c.createOscillator(), g2 = c.createGain(), vb = c.createOscillator(), vbg = c.createGain();
      ramp(e.gain, t, [[0, .0001], [.05, g], [Math.max(.08, d - .06), g * .88], [d + .12, .0001]]); s.frequency.value = f; s2.type = 'triangle'; s2.frequency.value = f * 2; g2.gain.value = .13; vb.frequency.value = 5.4; ramp(vbg.gain, t, [[0, 0], [.32, 0], [Math.max(.33, .65), 10]]); vb.connect(vbg); vbg.connect(s.detune); vbg.connect(s2.detune);
      s.connect(e); s2.connect(g2); g2.connect(e); e.connect(flute); [s, s2, vb].forEach(function (o) { o.start(t); o.stop(t + d + .15); });
      k.nzE(t, [[0, .0001], [.05, g * .09], [d, g * .05], [d + .1, .0001]], { type: 'bandpass', f0: f * 2.2, q: 5, dst: flute });
    }
    FORM.forEach(function (name, b) {
      var t = b * BAR, ch = CHD[name], sec = b < 8 ? 0 : b < 16 ? 1 : 2, soft = b === 23 ? .78 : 1, i;
      /* yaylı temel */
      var sg = [.038, .055, .076][sec] * soft; ch.forEach(function (n, j) { var isB = j === 0; str(t, BAR + .06, hz(n), sg * (isB ? 1.25 : 1), (j / (ch.length - 1) - .5) * .85); });
      if (sec === 2) ch.slice(2).forEach(function (n, j) { str(t, BAR + .06, hz(n) * 2, sg * .55, j % 2 ? .5 : -.5); });
      /* derin bas */
      k.tn(t + .005, BAR + .6, { f0: hz(ch[0]), g: [.26, .32, .38][sec] * soft, a: .25, dst: low });
      /* lavta: sekizlik arpej */
      var up = ch.slice(1), pat = [0, 2, 1, 3, 2, 1, 3, 2];
      for (i = 0; i < 8; i++) { var n0 = up[pat[i] % up.length], f = hz(n0) * 2; k.pluck(t + i * B / 2 + R(-.008, .012), f, (i % 4 === 0 ? .36 : .25) * [1, .9, .78][sec] * R(.88, 1.08), k.pan(lute, Math.sin(i * .9) * .35), 2.2, .42); }
      /* koro */
      if (sec >= 1) ch.slice(sec === 2 ? 1 : 2).forEach(function (n, j) { choir(t, BAR, hz(n) * (sec === 2 && j > 2 ? 1 : 1), [.022, .03][sec - 1], (j - 1.5) * .3); });
      /* davul */
      var dr = drums;
      if (sec === 1) { k.timp(t, hz(ch[0]) * (hz(ch[0]) < 60 ? 2 : 1), .42, dr); k.timp(t + B * 2.5, hz(ch[0]) * (hz(ch[0]) < 60 ? 2 : 1), .22, dr); }
      if (sec === 2) { k.timp(t, hz(ch[0]) * (hz(ch[0]) < 60 ? 2 : 1), .62, dr); [0, 1, 1.5, 2, 3, 3.5].forEach(function (x, j) { k.war(t + x * B + R(-.005, .005), j % 3 === 0 ? 76 : 96, (j % 3 === 0 ? .32 : .18) * soft, dr); }); }
      /* bölüm geçişi: zil kabarması */
      if (b === 7 || b === 15) k.nzE(t + BAR * .25, [[0, .0001], [BAR * .74, .17], [BAR * .76, .22], [BAR * 1.5, .0001]], { type: 'highpass', f0: 5200, dst: dr });
      /* melodiler */
      (RECORDER[b] || []).forEach(function (m) { rec(t + m[1] * B, m[2] * B - .03, hz(m[0]), .16); });
      (HORN[b] || []).forEach(function (m) { var d = m[2] * B - .03; k.brass(t + m[1] * B, d, hz(m[0]), .11, hornB, .95); k.brass(t + m[1] * B + .012, d, hz(m[0]) / 2, .08, hornB, .85); });
      (CLIMAX[b] || []).forEach(function (m) { var d = m[2] * B - .03, f = hz(m[0]); k.brass(t + m[1] * B, d, f / 2, .1 * soft, hornB, 1.02); k.brass(t + m[1] * B + .01, d, f / 4, .08 * soft, hornB, .9); str(t + m[1] * B, d, f, .05 * soft, -.15); str(t + m[1] * B + .01, d, f * .5, .045 * soft, .15); });
    });
  }

  /* ---------- V229: tank sesleri + harita ve savaş paneli müziği (özgün beste) ---------- */
  var FX2 = {
    tcannon: [1.7, 2, function (k, i) {
      var v = k.bus(.92, .3, k.verb(.9, 3000, .5, 6));
      k.nz(.002, .012, { type: 'highpass', f0: 3200, g: .9, dst: v }); k.nz(.002, .05, { type: 'bandpass', f0: 2100 - i * 200, f1: 900, q: 1, g: .75, dst: v });
      k.tn(.002, .16, { f0: 240 - i * 20, f1: 78, g: .85, a: .001, dst: v }); k.tn(.004, .42, { f0: 108 - i * 8, f1: 42, fk: .6, g: 1.1, a: .002, dst: v });
      k.nz(.004, .32, { type: 'lowpass', f0: 1100, f1: 160, q: .6, g: .7, dst: v });
      k.nz(.19, .16, { type: 'bandpass', f0: 620, f1: 240, q: .8, g: .16, dst: v }); k.nz(.38, .2, { type: 'bandpass', f0: 420, f1: 180, q: .8, g: .08, dst: v });
      [[.58, 1460], [.585, 2230], [.59, 3120]].forEach(function (q) { k.tn(q[0], .09, { f0: q[1], type: 'triangle', g: .07, a: .001, dst: v }); });
    }, .9, 3],
    thit: [1.8, 2, function (k, i) {
      var v = k.bus(.9, .35, k.verb(1, 2600, .55, 6));
      k.nz(.002, .02, { type: 'highpass', f0: 2400, g: .55, dst: v }); k.nz(.003, .5, { type: 'lowpass', f0: 1700 - i * 150, f1: 130, q: .6, g: .9, dst: v });
      k.tn(.003, .42, { f0: 130 - i * 12, f1: 40, fk: .6, g: 1.05, a: .002, dst: v });
      for (var q = 0; q < 10; q++) k.nz(R(.12, .7), R(.01, .035), { type: 'bandpass', f0: R(1400, 3800), q: 2, g: R(.03, .1), dst: v });
    }, .86, 3]
  };
  function pad(k, dst, t, d, f, g) {
    var c = k.c, e = c.createGain(); ramp(e.gain, t, [[0, .0001], [Math.min(1.4, d * .4), g], [Math.max(1.5, d - .4), g * .85], [d + 1.6, .0001]]);
    [[1, 'sine', 1], [1.004, 'triangle', .35], [.998, 'sine', .5]].forEach(function (q) { var s = c.createOscillator(), a = c.createGain(); s.type = q[1]; s.frequency.value = f * q[0]; a.gain.value = q[2]; s.connect(a); a.connect(e); s.start(t); s.stop(t + d + 1.7); });
    e.connect(dst);
  }
  function fluteS(k, dst, t, d, f, g) {
    var c = k.c, e = c.createGain(), s = c.createOscillator(), v = c.createOscillator(), a = c.createGain(); s.frequency.value = f; v.frequency.value = 4.8; a.gain.value = 5; v.connect(a); a.connect(s.detune);
    ramp(e.gain, t, [[0, .0001], [.14, g], [Math.max(.2, d - .1), g * .8], [d + .3, .0001]]); s.connect(e); e.connect(dst); s.start(t); v.start(t); s.stop(t + d + .35); v.stop(t + d + .35);
  }
  var MAP_B = 60 / 66, MAP_BAR = MAP_B * 4;
  var MAP_CH = { D: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], Bm: ['B1', 'F#2', 'B2', 'D3', 'F#3', 'B3'], G: ['G1', 'D2', 'G2', 'B2', 'D3', 'G3'], A: ['A1', 'E2', 'A2', 'C#3', 'E3', 'A3'], Fm: ['F#1', 'C#2', 'F#2', 'A2', 'C#3', 'F#3'], Em: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'] };
  var MAP_FORM = ['D', 'Bm', 'G', 'A', 'D', 'Fm', 'G', 'A', 'Bm', 'G', 'D', 'A', 'G', 'D', 'Em', 'A'];
  var MAP_MEL = { 4: [['F#5', 0, 2], ['A5', 2, 1], ['F#5', 3, 1]], 5: [['E5', 0, 2], ['C#5', 2, 2]], 6: [['D5', 0, 1.5], ['B4', 1.5, .5], ['G4', 2, 2]], 7: [['A4', 0, 3]], 12: [['B4', 0, 1.5], ['D5', 1.5, .5], ['G5', 2, 2]], 13: [['F#5', 0, 2], ['D5', 2, 2]], 14: [['E5', 0, 1.5], ['G5', 1.5, .5], ['B4', 2, 2]], 15: [['A4', 0, 2], ['C#5', 2, 1], ['E5', 3, 1]] };
  function buildMap(k) {
    var c = k.c, verb = k.verb(2.8, 3800, .7, 8), low = c.createBiquadFilter(), pB = k.bus(.7, .6, verb), lute = k.bus(.72, .55, verb), fl = k.bus(.5, .72, verb);
    low.type = 'lowpass'; low.frequency.value = 1300; low.Q.value = .4; low.connect(pB);
    MAP_FORM.forEach(function (n, b) {
      var t = b * MAP_BAR, ch = MAP_CH[n], i;
      ch.forEach(function (x, j) { if (j !== 1) pad(k, low, t, MAP_BAR + .04, hz(x), [.11, 0, .075, .06, .05, .035][j]); });
      [[0, 0, .3], [1, 2, .2], [1.5, 3, .16], [2, 4, .22], [3, 3, .18], [3.5, 5, .14]].forEach(function (p) { k.pluck(Math.max(0, t + p[0] * MAP_B + R(-.012, .012)), hz(ch[p[1]]) * (p[1] ? 2 : 1), p[2] * R(.9, 1.06), lute, 3, .5); });
      (MAP_MEL[b] || []).forEach(function (m) { fluteS(k, fl, t + m[1] * MAP_B, m[2] * MAP_B - .04, hz(m[0]), .085); });
    });
  }
  var BAT_CH = { Dm: ['D2', 'A2', 'D3', 'F3'], Bb: ['Bb1', 'F2', 'Bb2', 'D3'], Gm: ['G1', 'D2', 'G2', 'Bb2'], A: ['A1', 'E2', 'A2', 'C#3'] };
  var BAT_FORM = ['Dm', 'Dm', 'Bb', 'A', 'Gm', 'Dm', 'Bb', 'A'];
  var BAT_MEL = { 2: [['A3', 0, 2], ['F3', 2, 1], ['D3', 3, 1]], 3: [['E3', 0, 2], ['C#3', 2, 2]], 6: [['Bb3', 0, 2], ['A3', 2, 1], ['G3', 3, 1]], 7: [['A3', 0, 3]] };
  function buildBattle(k) {
    var c = k.c, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850; lp.Q.value = .5; lp.connect(k.out); k.out = lp;   /* zarın tıkırtısı (1,5-2,7 kHz) maskelenmesin */
    var verb = k.verb(2.2, 1400, .6, 6), b = k.bus(.85, .5, verb);
    BAT_FORM.forEach(function (n, i) {
      var t = i * 4, ch = BAT_CH[n];
      ch.forEach(function (x, j) { pad(k, b, t, 4.05, hz(x), [.16, .11, .08, .06][j]); });
      k.timp(t, hz(ch[0]) * (hz(ch[0]) < 60 ? 2 : 1), .2, b); k.timp(t + 2, hz(ch[0]) * (hz(ch[0]) < 60 ? 2 : 1), .12, b);
      (BAT_MEL[i] || []).forEach(function (m) { k.brass(t + m[1], m[2] - .05, hz(m[0]), .05, b, .35); });
    });
  }

  /* ---------- Opus + Ogg (tarayıcının kendi kodlayıcısı; dış kitaplık yok) ---------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var i = 0; i < 256; i++) { var r = i << 24; for (var j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; t[i] = r >>> 0; } return t; })();
  function oggPage(serial, seq, flags, granule, packets) {
    var seg = []; packets.forEach(function (p) { var n = p.length; while (n >= 255) { seg.push(255); n -= 255; } seg.push(n); });
    var body = packets.reduce(function (s, p) { return s + p.length; }, 0), u = new Uint8Array(27 + seg.length + body), v = new DataView(u.buffer);
    u.set([0x4f, 0x67, 0x67, 0x53, 0, flags], 0); v.setUint32(6, granule >>> 0, true); v.setUint32(10, Math.floor(granule / 4294967296), true); v.setUint32(14, serial, true); v.setUint32(18, seq, true); u[26] = seg.length; u.set(seg, 27);
    var o = 27 + seg.length; packets.forEach(function (p) { u.set(p, o); o += p.length; });
    var c = 0; for (var i = 0; i < u.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ u[i]) & 255]) >>> 0; v.setUint32(22, c, true); return u;
  }
  function b64(u) { var s = '', B = 8192; for (var i = 0; i < u.length; i += B) s += String.fromCharCode.apply(null, u.subarray(i, i + B)); return btoa(s); }
  function enc(pair, kbps, mono) {
    var ch = mono ? 1 : 2, n = pair[0].length, pk = [], PRE = 312;
    return new Promise(function (ok, no) {
      var e = new AudioEncoder({ output: function (c) { var u = new Uint8Array(c.byteLength); c.copyTo(u); pk.push(u); }, error: no });
      e.configure({ codec: 'opus', sampleRate: SR, numberOfChannels: ch, bitrate: kbps * 1000 });
      var i = 0, blk = SR; while (i < n) { var m = Math.min(blk, n - i), d = new Float32Array(m * ch); d.set(pair[0].subarray(i, i + m), 0); if (!mono) d.set(pair[1].subarray(i, i + m), m); var ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: m, numberOfChannels: ch, timestamp: Math.round(i / SR * 1e6), data: d }); e.encode(ad); ad.close(); i += m; }
      e.flush().then(function () { e.close(); ok(); }, no);
    }).then(function () {
      var serial = 22700 + n % 9973, head = new Uint8Array(19), hv = new DataView(head.buffer), txt = [0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73, 2, 0, 0, 0, 0x57, 0x43, 0, 0, 0, 0];
      head.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 1, ch], 0); hv.setUint16(10, PRE, true); hv.setUint32(12, SR, true);
      var pages = [oggPage(serial, 0, 2, 0, [head]), oggPage(serial, 1, 0, 0, [new Uint8Array(txt)])], seq = 2, gr = 0, FR = 960, PP = 40;
      for (var i = 0; i < pk.length; i += PP) { var part = pk.slice(i, i + PP), last = i + PP >= pk.length; gr += part.length * FR; pages.push(oggPage(serial, seq++, last ? 4 : 0, last ? Math.min(gr, n + PRE) : gr, part)); }
      var size = pages.reduce(function (s, p) { return s + p.length; }, 0), u = new Uint8Array(size), o = 0; pages.forEach(function (p) { u.set(p, o); o += p.length; });
      return b64(u);
    });
  }
  function stat(pair) { var L = pair[0], Rr = pair[1], m = 0, s = 0, n = L.length, clip = 0, i; for (i = 0; i < n; i++) { var a = Math.max(Math.abs(L[i]), Math.abs(Rr[i])); m = Math.max(m, a); s += L[i] * L[i] + Rr[i] * Rr[i]; if (a >= .999) clip++; } return { dur: +(n / SR).toFixed(2), peak: +m.toFixed(3), rmsDb: +(10 * Math.log10(s / (2 * n) + 1e-12)).toFixed(1), clip: clip }; }

  var API = {
    music: function () {
      seed = 7227; var d = BAR * 24 + 7, k = new K(d); buildMusic(k); ksC = {};
      return k.render(.9, 1.25).then(function (p) { return { pair: p, stat: stat(p) }; });
    },
    sfxAll: function () {
      var out = {}, st = {}, q = Promise.resolve();
      Object.keys(FX).forEach(function (name) {
        var F = FX[name], nv = F[4] || 1, stereo = F[1] === 2;
        for (var i = 0; i < nv; i++) (function (i) {
          q = q.then(function () { seed = 1000 + name.length * 77 + i * 991 + name.charCodeAt(0) * 13; var k = new K(F[0]); F[2](k, i); return k.render(F[3], F[5] || 0); }).then(function (p) { var key = 'sfx/' + name + (nv > 1 ? '_' + i : '') + '.ogg'; st[name + (nv > 1 ? '_' + i : '')] = stat(p); return enc(p, stereo ? (name === 'nuke' ? 112 : 80) : 40, !stereo).then(function (b) { out[key] = b; }); });
        })(i);
      });
      Object.keys(LOOPS).forEach(function (name) {
        var F = LOOPS[name];
        q = q.then(function () { seed = 4242 + name.length; var k = new K(F[0] * 2 + 1.2); F[1](k); return k.render(F[2], 0); }).then(function (p) { var r = loopify(p, F[0], .15); st[name] = stat(r); return enc(r, 72, false).then(function (b) { out['sfx/' + name + '.ogg'] = b; }); });
      });
      return q.then(function () { return { files: out, stat: st }; });
    },
    v229: function () {   /* yalnızca V229 dosyaları: map.ogg, battle.ogg, sfx/tcannon_*.ogg, sfx/thit_*.ogg */
      var out = {}, st = {}, q = Promise.resolve();
      Object.keys(FX2).forEach(function (name) {
        var F = FX2[name];
        for (var i = 0; i < F[4]; i++) (function (i) {
          q = q.then(function () { seed = 2290 + name.length * 77 + i * 991; var k = new K(F[0]); F[2](k, i); return k.render(F[3], 0); }).then(function (p) { st[name + '_' + i] = stat(p); return enc(p, 80, false).then(function (b) { out['sfx/' + name + '_' + i + '.ogg'] = b; }); });
        })(i);
      });
      return q.then(function () { seed = 229; var k = new K(16 * MAP_BAR + 6); buildMap(k); ksC = {}; return k.render(.55, 0); }).then(function (p) { st.map = stat(p); return enc(p, 64, false).then(function (b) { out['map.ogg'] = b; }); })
        .then(function () { seed = 230; var k = new K(32 + 5); buildBattle(k); return k.render(.7, 0); }).then(function (p) { st.battle = stat(p); return enc(p, 56, false).then(function (b) { out['battle.ogg'] = b; }); })
        .then(function () { return JSON.stringify({ files: out, stat: st }); });
    },
    all: function () {
      var R0 = {};
      return API.sfxAll().then(function (s) { R0.files = s.files; R0.stat = s.stat; return API.music(); }).then(function (m) {
        R0.stat.menu = m.stat; R0.bar = BAR; R0.dice = window.WC_SFX.dice; return enc(m.pair, 112, false).then(function (b) { R0.files['menu.ogg'] = b; return JSON.stringify(R0); });
      });
    }
  };
  window.WCGen = API;
})();
