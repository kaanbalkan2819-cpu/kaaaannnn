/* V111 — SES MOTORU (wc_audio.js): ana menü müziği + efekt sesleri + savaş sesleri.
   TELİF: Hiçbir ses dosyası, örnek (sample) veya üçüncü taraf müzik KULLANILMAZ. Bütün müzik ve efektler bu dosyada
   WebAudio ile kodla üretilir (osilatör + gürültü); melodi/akor dizisi bu proje için yazılmış özgün bir bestedir.
   Bu yüzden lisans/telif/dava riski yoktur ve ek dosya boyutu sıfırdır.
   Eski AU arayüzü korunur: AU.init(), AU.vol(), AU.play(ad). Ayarlar: SET.vol, SET.mus, SET.sfx, SET.musOn, SET.sfxOn (v29.js ayar paneli). */
(function () {
  'use strict';
  var c = null, mg, mu, sf, comp, nbuf = null, loopT = null, trk = null, wantMenu = false, animT = null, animKind = '', lastN = 0;
  function S() { return window.SET || { vol: .8, mus: .5, sfx: .9, musOn: 1, sfxOn: 1 }; }
  function R(a, b) { return a + Math.random() * (b - a); }

  function init() {
    if (c) { if (c.state === 'suspended') { try { c.resume(); } catch (e) { } } return; }
    try {
      c = new (window.AudioContext || window.webkitAudioContext)();
      comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.connect(c.destination);
      mg = c.createGain(); mg.connect(comp); mu = c.createGain(); mu.connect(mg); sf = c.createGain(); sf.connect(mg);
      var n = c.sampleRate * 2; nbuf = c.createBuffer(1, n, c.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      vol(); if (!loopT) loopT = setInterval(loop, 90);
    } catch (e) { c = null; }
  }
  function vol() { if (!c) return; var s = S(); mg.gain.value = s.vol; mu.gain.value = s.musOn ? s.mus * .55 : 0; sf.gain.value = s.sfxOn ? s.sfx : 0; }

  /* ---------- temel sesler ---------- */
  function tone(f, t, d, type, g, dst, o) {
    o = o || {}; var os = c.createOscillator(), e = c.createGain(), a = o.a || .015, last = os;
    os.type = type || 'sine'; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d); if (o.det) os.detune.value = o.det;
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(.0001, t + d);
    var out = e; os.connect(e);
    if (o.lp) { var fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; e.connect(fl); out = fl; }
    out.connect(dst || sf); os.start(t); os.stop(t + d + .05);
  }
  function nz(t, d, g, ft, f0, f1, dst, q) {
    var s = c.createBufferSource(), fl = c.createBiquadFilter(), e = c.createGain();
    s.buffer = nbuf; s.loop = true; fl.type = ft || 'bandpass'; fl.Q.value = q || 1; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(fl); fl.connect(e); e.connect(dst || sf); s.start(t, Math.random() * 1.5); s.stop(t + d + .05);
  }
  function drum(t, g, f) { tone(f || 120, t, .5, 'sine', g, sf, { to: (f || 120) * .36, a: .004 }); nz(t, .12, g * .5, 'lowpass', 400, 120); }
  function cannon(t, g) { nz(t, .9, g, 'lowpass', 1400, 70, sf, .7); tone(95, t, .7, 'sine', g * .9, sf, { to: 32, a: .004 }); }
  function boom(t, g) { nz(t, 1.6, g, 'lowpass', 900, 45, sf, .6); tone(70, t, 1.3, 'sine', g, sf, { to: 24, a: .005 }); }
  function rifle(t, n, g) { for (var i = 0; i < n; i++) nz(t + i * R(.05, .09), .07, g * R(.5, 1), 'highpass', 1800, 900); }
  function whoosh(t, d, g, up) { nz(t, d, g, 'bandpass', up ? 250 : 2600, up ? 2600 : 250, sf, 1.4); }
  function horn(t, f, d, g) { [0, 7].forEach(function (dt) { tone(f, t, d, 'sawtooth', g, sf, { a: .12, det: dt, lp: 1100 }); }); }

  /* ---------- efektler ---------- */
  function play(k) {
    if (!c || !S().sfxOn) return; var t = c.currentTime + .005, i;
    try {
      switch (k) {
        case 'click': tone(660, t, .07, 'triangle', .22); break;
        case 'tick': tone(880, t, .05, 'sine', .2); break;
        case 'dice': for (i = 0; i < 7; i++) nz(t + i * .07, .05, .45, 'bandpass', 2200, 0, sf, 2); break;
        case 'notify': tone(988, t, .16, 'sine', .1); tone(1319, t + .09, .22, 'sine', .08); break;
        case 'ping': tone(1200, t, .5, 'sine', .14, sf, { to: 1180 }); tone(1200, t + .55, .5, 'sine', .07, sf, { to: 1180 }); break;
        case 'coin': tone(1568, t, .09, 'square', .1, sf, { lp: 4000 }); tone(2093, t + .08, .3, 'square', .09, sf, { lp: 4000 }); break;
        case 'attack': drum(t, .9, 110); drum(t + .22, .7, 110); drum(t + .44, .9, 90); horn(t + .1, 196, .9, .12); horn(t + .1, 293.7, .9, .08); break;
        case 'cannon': cannon(t, .8); break;
        case 'boom': boom(t, .9); break;
        case 'rifle': rifle(t, 6, .22); break;
        case 'missile': whoosh(t, 1.4, .35, true); tone(80, t, 1.4, 'sawtooth', .12, sf, { to: 200, lp: 500, a: .2 }); break;
        case 'horn': horn(t, 130.8, 1.6, .16); horn(t, 196, 1.6, .1); break;
        case 'win': [392, 494, 587, 784].forEach(function (f, j) { tone(f, t + j * .13, .5, 'triangle', .3, sf, { lp: 3000 }); tone(f / 2, t + j * .13, .5, 'sine', .2); }); drum(t, .7, 100); break;
        case 'lose': [330, 311, 262, 196].forEach(function (f, j) { tone(f, t + j * .24, .6, 'sawtooth', .16, sf, { lp: 900 }); }); drum(t, .8, 70); break;
        case 'conq': [262, 330, 392].forEach(function (f) { tone(f, t, .9, 'square', .1, sf, { lp: 1800 }); }); tone(523, t + .15, .9, 'triangle', .28); drum(t, .8, 100); drum(t + .3, .8, 100); break;
        case 'pact': tone(523, t, .5, 'sine', .22); tone(659, t + .12, .5, 'sine', .2); tone(784, t + .24, .8, 'sine', .2); break;
      }
    } catch (e) { }
  }

  /* ---------- savaş animasyonu sesleri (v60.js çağırır) ---------- */
  function animStart(kind) {
    animEnd(); if (!c) return; animKind = kind || 'land';
    var t0 = Date.now();
    if (animKind === 'sea') { play('horn'); wave(); } else if (animKind === 'missile') play('missile'); else play('cannon');
    animT = setInterval(function () {
      if (!c || !S().sfxOn || document.hidden) return; var t = c.currentTime + .01, r = Math.random(), el = (Date.now() - t0) / 1000;
      if (animKind === 'land') { if (r < .5) rifle(t, 5, .2); else if (r < .75) cannon(t, .55); else if (r < .9) boom(t, .45); }
      else if (animKind === 'sea') { if (r < .35) cannon(t, .5); else if (r < .55) boom(t, .55); if (Math.random() < .3) wave(); }
      else { if (el > 1.8 && r < .6) boom(t, .6); else if (r < .25) whoosh(t, 1.1, .25, true); }
    }, 650);
  }
  function wave() { if (!c) return; var t = c.currentTime + .01; nz(t, 3.2, .28, 'lowpass', 300, 700, sf, .5); }
  function animEnd() { if (animT) { clearInterval(animT); animT = null; } animKind = ''; }

  /* ---------- ana menü müziği (özgün beste: D minör, 4 akor, 78 BPM) ---------- */
  var BPM = 78, SD = 60 / BPM / 4;
  var CH = [[146.83, 174.61, 220], [116.54, 146.83, 174.61], [98, 116.54, 146.83], [110, 138.59, 164.81]];   // Dm, Bb, Gm, A
  var MEL = [[[0, 440, 6], [8, 587.33, 4], [12, 523.25, 4]], [[0, 587.33, 6], [8, 523.25, 4], [12, 466.16, 4]], [[0, 466.16, 6], [8, 440, 4], [12, 392, 4]], [[0, 554.37, 6], [8, 659.25, 6]]];
  function startTrack() {
    if (!c || trk) return;
    var bus = c.createGain(); bus.gain.setValueAtTime(0.0001, c.currentTime); bus.gain.linearRampToValueAtTime(1, c.currentTime + 2.5); bus.connect(mu);
    trk = { bus: bus, step: 0, next: c.currentTime + .15, n: 0 };
  }
  function stopTrack() {
    if (!trk) return; var b = trk.bus; trk = null;
    try { b.gain.cancelScheduledValues(c.currentTime); b.gain.setValueAtTime(b.gain.value, c.currentTime); b.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.2); } catch (e) { }
    setTimeout(function () { try { b.disconnect(); } catch (e) { } }, 1600);
  }
  function sched(tr, st, t) {
    var bar = Math.floor(st / 16) % 4, s = st % 16, ch = CH[bar], b = tr.bus, loopN = Math.floor(st / 64);
    if (s === 0) { ch.forEach(function (f) { tone(f * 2, t, SD * 16, 'sawtooth', .05, b, { a: 1.3, det: -6, lp: 650 }); tone(f * 2, t, SD * 16, 'sawtooth', .05, b, { a: 1.3, det: 6, lp: 650 }); }); }
    if (s === 0 || s === 8) tone(ch[0], t, SD * 7, 'sine', .55, b, { a: .03 });
    if (s === 0) tone(80, t, .55, 'sine', .5, b, { to: 32, a: .004 });
    if (s === 8) tone(66, t, .5, 'sine', .35, b, { to: 30, a: .004 });
    if (s === 14 && bar % 2 === 1) tone(95, t, .35, 'sine', .18, b, { to: 40, a: .004 });
    if (s % 4 === 2) nz(t, .05, .035, 'highpass', 6500, 0, b);
    if (s % 2 === 0) { var idx = [0, 1, 2, 1, 2, 1, 2, 1][(s / 2) | 0]; tone(ch[idx] * 4, t, .55, 'triangle', .1, b, { lp: 2400, a: .006 }); }
    if (loopN % 2 === 1 || bar > 1) MEL[bar].forEach(function (m) { if (m[0] === s) tone(m[1], t, SD * m[2], 'triangle', .13, b, { a: .06, lp: 3200 }); });
  }
  function loop() {
    try {
      if (!c) return;
      var want = !!document.body && document.body.classList.contains('wcm-on') && !document.hidden && S().musOn;
      if (document.hidden) { if (c.state === 'running') c.suspend(); return; } else if (c.state === 'suspended') { try { c.resume(); } catch (e) { } }
      if (want && !trk) startTrack(); else if (!want && trk) stopTrack();
      if (trk) { var lim = c.currentTime + .5; while (trk.next < lim) { sched(trk, trk.step, trk.next); trk.step++; trk.next += SD; } }
    } catch (e) { }
  }

  /* ---------- oyun olaylarına bağlantılar ---------- */
  function hooks() {
    try {
      if (typeof showBattle === 'function' && !showBattle.wc111) {
        var _sb = showBattle;
        showBattle = function (r, p, e) {
          var res = _sb.apply(this, arguments);
          try {
            play('attack');
            setTimeout(function () { try { if (!window.BSH) return; var me = window.G && G.pl, w = r && r.win; if (p === me) play(w ? 'win' : 'lose'); else if (e === me) play(w ? 'lose' : 'win'); } catch (x) { } }, 2600);
          } catch (x) { }
          return res;
        };
        showBattle.wc111 = 1;
      }
      if (typeof scout === 'function' && !scout.wc111) { var _sc = scout; scout = function () { var r = _sc.apply(this, arguments); play('ping'); return r; }; scout.wc111 = 1; }
      if (typeof toast === 'function' && !toast.wc111) { var _t = toast; toast = function () { var n = Date.now(); if (n - lastN > 700) { lastN = n; play('notify'); } return _t.apply(this, arguments); }; toast.wc111 = 1; }
    } catch (e) { }
  }
  hooks(); window.addEventListener('load', hooks); setTimeout(hooks, 1500);

  window.AU = { init: init, vol: vol, play: play };
  window.WCSfx = { animStart: animStart, animEnd: animEnd, play: play };
  try { AU = window.AU; } catch (e) { }
})();
