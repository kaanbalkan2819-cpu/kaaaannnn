/* V111 — SES MOTORU (wc_audio.js): ana menü müziği + efekt sesleri + savaş sesleri.
   TELİF: Üçüncü taraf ses veya müzik KULLANILMAZ. V227'den beri müzik ve efektler scripts/gen_audio.js ile üretilen dosyalardır; yedek sentez bu dosyada
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
      comp = c.createDynamicsCompressor(); comp.threshold.value = -9; comp.ratio.value = 4; comp.connect(c.destination);
      mg = c.createGain(); mg.connect(comp); mu = c.createGain(); mu.connect(mg); sf = c.createGain(); sf.connect(mg);
      var n = c.sampleRate * 2; nbuf = c.createBuffer(1, n, c.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      vol(); loadSamples(); loadFiles(); hookFX(); if (!loopT) loopT = setInterval(loop, 90);
    } catch (e) { c = null; }
  }
  /* V160: ÖRNEKLER — zar ve savaş sesleri artık scripts/gen_sfx.py ile üretilmiş gerçekçi örneklerden (wc_sfx_data.js) çalar.
     Örnekler çözülemezse / dosya yoksa eski sentezleyici otomatik devreye girer (aşağıdaki işlevler her zaman geri düşer). */
  var bufs = {}, smpLoading = false;
  function b64buf(s) { var b = atob(s), n = b.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = b.charCodeAt(i); return u.buffer; }
  function loadSamples() {
    if (smpLoading || !c || !window.WC_SFX) return; smpLoading = true;
    Object.keys(window.WC_SFX).forEach(function (k) {
      bufs[k] = [];
      window.WC_SFX[k].forEach(function (str) {
        try { var pr = c.decodeAudioData(b64buf(str), function (ab) { bufs[k].push(ab); }, function () { }); if (pr && pr.catch) pr.catch(function () { }); } catch (e) { }
      });
    });
  }
  /* V227: efektler assets/audio/sfx/ altındaki Ogg (Opus) dosyalarından yüklenir (scripts/gen_audio.js ile üretildi). Zar sesi wc_sfx_data.js'te kalır.
     Dosya yüklenemezse her ses eski sentezleyiciye geri düşer. Tek tek ve sırayla çözülür; açılışta takılma yapmaz. */
  var FILES = { click: 1, notify: 1, attack: 1, cannon: 3, boom: 3, hit: 3, shot: 4, mg: 2, missile: 2, jet: 1, tank: 1, wave: 1, splash: 1, wblast: 1, collapse: 1, clash: 3, tick: 1, ping: 1, coin: 1, pact: 1, win: 1, lose: 1, conq: 1, horn: 1, flak: 2, siren: 1, bomber: 1, whistle: 1, nuke: 1, tcannon: 3, thit: 3 };
  /* V229: uçak saldırısı V226 öncesi örnek seslere döndü (assets/audio/sfx/oboom_*.mp3, owhoosh_*.mp3) */
  var OLD = { oboom: 2, owhoosh: 1 };
  function oldReady() { return !!(bufs.oboom && bufs.oboom.length); }
  function xhr(url, ok, no) { try { var x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer'; x.onload = function () { if (x.response && x.response.byteLength) ok(x.response); else no(); }; x.onerror = no; x.send(); } catch (e) { no(); } }
  function decode(ab, ok, no) { try { var pr = c.decodeAudioData(ab, ok, no); if (pr && pr.catch) pr.catch(function () { }); } catch (e) { no(); } }
  function loadFiles() {
    var q = []; Object.keys(FILES).forEach(function (k) { bufs[k] = []; for (var i = 0; i < FILES[k]; i++) q.push([k, 'assets/audio/sfx/' + k + (FILES[k] > 1 ? '_' + i : '') + '.ogg']); });
    Object.keys(OLD).forEach(function (k) { bufs[k] = []; for (var i = 0; i < OLD[k]; i++) q.push([k, 'assets/audio/sfx/' + k + '_' + i + '.mp3']); });
    (function nx() { var it = q.shift(); if (!it) return; var go = function () { setTimeout(nx, 15); }; xhr(it[1], function (ab) { decode(ab, function (b) { bufs[it[0]].push(b); go(); }, go); }, go); })();
  }
  function smp(k, t, g, rate) {
    var a = bufs[k]; if (!c || !a || !a.length) return false;
    try {
      var s = c.createBufferSource(), e = c.createGain();
      s.buffer = a[Math.floor(Math.random() * a.length)]; s.playbackRate.value = rate || R(.95, 1.05); e.gain.value = g;
      s.connect(e); e.connect(sf); s.start(t); return true;
    } catch (x) { return false; }
  }
  function hornS(t, rate, g) { return smp('horn', t, g, rate); }
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
  function drum(t, g, f) { if (smp('drum', t, Math.min(1, g), f ? Math.max(.8, Math.min(1.15, f / 110)) : 1)) return; tone(f || 120, t, .5, 'sine', g, sf, { to: (f || 120) * .36, a: .004 }); nz(t, .12, g * .5, 'lowpass', 400, 120); }
  function cannon(t, g) { if (smp('cannon', t, Math.min(1, g * 1.25))) return; nz(t, .9, g, 'lowpass', 1400, 70, sf, .7); tone(95, t, .7, 'sine', g * .9, sf, { to: 32, a: .004 }); }
  function boom(t, g) { if (smp('boom', t, Math.min(1, g * 1.15))) return; nz(t, 1.6, g, 'lowpass', 900, 45, sf, .6); tone(70, t, 1.3, 'sine', g, sf, { to: 24, a: .005 }); }
  function rifle(t, n, g) { if (smp('rifle', t, Math.min(1, g * 1.6))) return; for (var i = 0; i < n; i++) nz(t + i * R(.05, .09), .07, g * R(.5, 1), 'highpass', 1800, 900); }
  function whoosh(t, d, g, up) { if (up && smp('whoosh', t, Math.min(1, g * 2.2))) return; nz(t, d, g, 'bandpass', up ? 250 : 2600, up ? 2600 : 250, sf, 1.4); }
  function horn(t, f, d, g) { [0, 7].forEach(function (dt) { tone(f, t, d, 'sawtooth', g, sf, { a: .12, det: dt, lp: 1100 }); }); }

  /* ---------- efektler ---------- */
  /* V122: gerçekçi zar atma sesi — elde sallama (hızlı tıkırtılar) + masaya çarpıp sekme (aralıklar kısalır, ses sönümlenir) + yuvarlanma sürtünmesi */
  function clack(t, g, f) {
    nz(t, .035, g, 'bandpass', f * 1.5 + R(-150, 150), f * .8, sf, 3);                   // sert plastik/ahşap "tak"
    tone(f * .26 * R(.92, 1.08), t, .07, 'triangle', g * .75, sf, { to: f * .14, a: .002 });   // gövde tınısı
  }
  function diceRoll(t) {
    if (smp('dice', t, .95, R(.97, 1.03))) return;   // V160: gerçekçi örnek
    var i, g = .5;
    for (i = 0; i < 7; i++) clack(t + i * .042 + R(0, .014), .14 + R(0, .07), R(1500, 2300));   // elde sallama
    [.33, .45, .56, .66, .75, .83, .9, .96].forEach(function (o) { clack(t + o + R(-.008, .008), g, R(1800, 2700)); g *= .72; });   // sekmeler
    nz(t + .33, .7, .1, 'lowpass', 1000, 280, sf, .7);                                  // masada yuvarlanma
  }
  /* V229: harita ve savaş paneli müziği; zar atılınca müzik kısılır */
  var AMB = { map: { u: 'assets/audio/map.ogg', L: 16 * 240 / 66, g: .9 }, bat: { u: 'assets/audio/battle.ogg', L: 32, g: .5 } }, ambD = null, ambA = null, ambAL = 1;
  function ambBus() { if (!ambD) { ambD = c.createGain(); ambA = c.createGain(); ambD.connect(ambA); ambA.connect(mu); } return ambD; }
  function duck(sec) { if (!c || !ambD) return; var t = c.currentTime, g = ambD.gain; try { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(.22, t + .06); g.setValueAtTime(.22, t + sec); g.linearRampToValueAtTime(1, t + sec + .7); } catch (e) { } }
  function ambLoad(k) { var A = AMB[k]; if (A.b || A.l || A.f || !c) return; A.l = 1; var no = function () { A.f = 1; A.l = 0; }; xhr(A.u, function (ab) { decode(ab, function (b) { A.b = b; A.l = 0; }, no); }, no); }
  function ambOn(k) { var A = AMB[k]; if (A.t || !A.b) return; var bus = c.createGain(), n = c.currentTime; bus.gain.setValueAtTime(.0001, n); bus.gain.linearRampToValueAtTime(A.g, n + 1.4); bus.connect(ambBus()); A.t = { bus: bus, next: n + .1, src: [] }; }
  function ambOff(k, free) {
    var A = AMB[k], t = A.t; if (free) A.free = 1; if (!t) { if (free) A.b = null; return; } A.t = null;
    try { var n = c.currentTime; t.bus.gain.cancelScheduledValues(n); t.bus.gain.setValueAtTime(t.bus.gain.value, n); t.bus.gain.linearRampToValueAtTime(.0001, n + .9); } catch (e) { }
    setTimeout(function () { t.src.forEach(function (s) { try { s.stop(); } catch (e) { } }); try { t.bus.disconnect(); } catch (e) { } if (A.free) { A.free = 0; if (!A.t) A.b = null; } }, 1200);
  }
  function ambSched(A) { var t = A.t; while (t.next < c.currentTime + 1.5) { var s = c.createBufferSource(); s.buffer = A.b; s.connect(t.bus); s.start(t.next); t.src.push(s); if (t.src.length > 3) t.src.shift(); t.next += A.L; } }
  function ambTick(menu) {
    var g = null; try { g = window.G; } catch (e) { }
    var on = !menu && !!g && !g.over && !!S().musOn && !!document.body, want = on ? (document.body.classList.contains('bsh') ? 'bat' : 'map') : '';
    Object.keys(AMB).forEach(function (k) { var A = AMB[k]; if (k === want) { ambLoad(k); ambOn(k); if (A.t) ambSched(A); } else if (A.t || menu) { A.free = 0; ambOff(k, menu); } });
    var lv = animKind && want === 'map' ? .35 : 1; if (ambA && lv !== ambAL) { ambAL = lv; try { ambA.gain.setTargetAtTime(lv, c.currentTime, .35); } catch (e) { } }
  }
  /* V230: Kalkınma ve Diplomasi menülerinde tıklama/bildirim sesleri V226 öncesi haliyle (sentez) */
  function oldUi(k) {
    /* V232: savaş panelinde sonuç sesleri ve kılıç vuruşu da eski sentez; zar sesleri değişmez */
    try { if ((k === 'click' || k === 'win' || k === 'lose' || k === 'conq') && document.body.classList.contains('bsh')) return true; } catch (e) { }
    if (k !== 'click' && k !== 'notify' && k !== 'tick') return false;
    try {
      var ev = window.event, tg = ev && ev.target; if (tg && tg.closest && tg.closest('#col221')) return true;
      var m = document.getElementById('mod'), b = document.getElementById('box'); return !!(m && b && m.style.display === 'flex' && b.querySelector('.polx,.d38'));
    } catch (e) { return false; }
  }
  var PLAYS = { click: ['click', .7, 1], tick: ['tick', .6, 1], notify: ['notify', .55], ping: ['ping', .6], coin: ['coin', .7, 1], pact: ['pact', .85], win: ['win', .9], lose: ['lose', .9], conq: ['conq', .95], attack: ['attack', .85], horn: ['horn', .7], cannon: ['cannon', .85, 1], boom: ['boom', .92, 1], rifle: ['mg', .5, 1], missile: ['missile', .75, 1], clash: ['clash', .8, 1] };
  function play(k) {
    if (!c || !S().sfxOn) return; var t = c.currentTime + .005, i;
    try { if (window.G && (G.ph === 'v7pick' || G.ph === 'pick')) return; } catch (e) { }   /* V230: ilk ülke seçiminde ses yok */
    if (k === 'dice') duck(1.7); else if (k === 'dtick') duck(.3);
    try {
      /* V227: üretilmiş örnek varsa o çalar; yoksa aşağıdaki eski sentez */
      var sk = PLAYS[k]; if (sk && !oldUi(k) && smp(sk[0], t, sk[1], sk[2] ? R(.97, 1.03) : 1)) return;
      switch (k) {
        case 'click': tone(660, t, .07, 'triangle', .22); break;
        case 'tick': case 'dtick': tone(880, t, .05, 'sine', .2); break;   /* dtick: zar akışının tıkı (değişmedi) */
        case 'dice': diceRoll(t); break;
        case 'notify': tone(988, t, .16, 'sine', .1); tone(1319, t + .09, .22, 'sine', .08); break;
        case 'ping': tone(1200, t, .5, 'sine', .14, sf, { to: 1180 }); tone(1200, t + .55, .5, 'sine', .07, sf, { to: 1180 }); break;
        case 'coin': tone(1568, t, .09, 'square', .1, sf, { lp: 4000 }); tone(2093, t + .08, .3, 'square', .09, sf, { lp: 4000 }); break;
        case 'attack': drum(t, .9, 110); drum(t + .22, .7, 110); drum(t + .44, .9, 90); if (!hornS(t + .1, 1, .2)) { horn(t + .1, 196, .9, .12); horn(t + .1, 293.7, .9, .08); } break;
        case 'cannon': cannon(t, .8); break;
        case 'boom': boom(t, .9); break;
        case 'rifle': if (!smp('rifle', t, .6)) cannon(t, .35); break;
        case 'missile': whoosh(t, 1.4, .35, true); tone(80, t, 1.4, 'sawtooth', .12, sf, { to: 200, lp: 500, a: .2 }); break;
        case 'horn': if (!hornS(t, .667, .22)) { horn(t, 130.8, 1.6, .16); horn(t, 196, 1.6, .1); } break;
        case 'win': [392, 494, 587, 784].forEach(function (f, j) { tone(f, t + j * .13, .5, 'triangle', .3, sf, { lp: 3000 }); tone(f / 2, t + j * .13, .5, 'sine', .2); }); drum(t, .7, 100); break;
        case 'lose': [330, 311, 262, 196].forEach(function (f, j) { tone(f, t + j * .24, .6, 'sawtooth', .16, sf, { lp: 900 }); }); drum(t, .8, 70); break;
        case 'conq': [262, 330, 392].forEach(function (f) { tone(f, t, .9, 'square', .1, sf, { lp: 1800 }); }); tone(523, t + .15, .9, 'triangle', .28); drum(t, .8, 100); drum(t + .3, .8, 100); break;
        case 'pact': tone(523, t, .5, 'sine', .22); tone(659, t + .12, .5, 'sine', .2); tone(784, t + .24, .8, 'sine', .2); break;
      }
    } catch (e) { }
  }

  /* ---------- V227: savaş sesleri animasyondaki gerçek olaylara bağlı (atış, isabet, yıkım). Tüm sesler tek veriyolunda; animasyon geçilince söner. ---------- */
  var aBus = null, aSrc = [], aN = 0, lastK = {}, VMAX = 16, aTank = false;
  function rl(k, ms) { var n = performance.now(); if (n - (lastK[k] || 0) < ms) return false; lastK[k] = n; return true; }
  function anim(k, g, rate, loop) {
    var a = bufs[k]; if (!c || !a || !a.length || !S().sfxOn || aN >= VMAX) return false;
    try {
      if (!aBus) { aBus = c.createGain(); aBus.connect(sf); }
      var s = c.createBufferSource(), e = c.createGain(), b = a[Math.floor(Math.random() * a.length)];
      s.buffer = b; s.playbackRate.value = rate || R(.96, 1.04); e.gain.value = g == null ? 1 : g;
      if (loop) { s.loop = true; s.loopStart = .15; s.loopEnd = b.duration - .15; }
      s.connect(e); e.connect(aBus); s.start(c.currentTime + .005, loop ? .15 : 0); aN++; s.onended = function () { aN = Math.max(0, aN - 1); }; aSrc.push(s); if (aSrc.length > 40) aSrc.shift();
      return true;
    } catch (x) { return false; }
  }
  function hookFX() {
    var W = window.WCBattleFX; if (!W || W.__snd) return; W.__snd = 1; var P = W.prototype;
    function wrap(n, f) { var o = P[n]; if (typeof o !== 'function') return; P[n] = function () { try { if (!this.__noSnd && !(animKind === 'air' && oldReady())) f.apply(this, arguments); } catch (e) { } return o.apply(this, arguments); }; }   /* V229: uçak saldırısında olay sesleri yerine eski ses akışı (animStart) */
    wrap('tankAttack', function () { this.__k = 'tank'; this.at(.03, function () { if (!aTank && anim('tank', .22, 1, true)) aTank = true; }); });
    wrap('infantryAttack', function () { this.__k = 'inf'; });
    wrap('missileAttack', function () { this.__k = 'msl'; });
    wrap('navalAttack', function () { this.__k = 'nav'; });
    wrap('planeAttack', function (o) { this.__k = 'air'; var n = Math.min(2, (o && o.planes) || 2); for (var i = 0; i < n; i++) this.at(.2 + i * .55, function () { anim('jet', .75); }); });
    wrap('muzzle', function (p, d, s, nl, src) {
      var k = this.__k;
      if (src === 'tank') { if (rl('tcn', 90)) anim('tcannon', .9); return; }   /* V229: yeni tank topu sesi; tank+piyade sahnesinde top artık tüfek gibi çalmaz */
      if (k === 'msl') { if (rl('msl', 280)) anim('missile', .78); return; }
      if (k === 'inf' || s < .6) { if (rl('shot', 65)) anim('shot', R(.24, .4)); return; }
      if (rl('cannon', 90)) anim('cannon', .8);
    });
    wrap('explosion', function (p, s0, o) {
      var s = (s0 || 1) * (this.projK || 1);
      if (o && o.snd === 'tank') { if (rl('thit', 80)) anim('thit', .85); return; }   /* V229: tank mermisi isabeti */
      if (o && o.water) { if (rl('wb', 220)) anim('wblast', .55); return; }
      if (s >= .75) { if (rl('boom', 130)) anim('boom', Math.min(1, .6 + s * .25)); } else if (rl('hit', 80)) anim('hit', .5 + s * .45);
    });
    wrap('waterBlast', function () { if (rl('wb', 220)) anim('wblast', .85); });
    wrap('splash', function () { if (rl('sp', 260)) anim('splash', .48); });
    wrap('collapse', function () { if (rl('col', 200)) anim('collapse', .78); });
    wrap('crumble', function () { if (rl('col', 200)) anim('collapse', .85); });
  }
  function fxReady() { return bufs.cannon && bufs.cannon.length > 0; }
  /* ---------- savaş animasyonu başlangıcı (v60.js çağırır) ---------- */
  function animStart(kind) {
    animEnd(); if (!c) return; animKind = kind || 'land'; hookFX();
    if (animKind === 'air' && oldReady()) { oldAir(); return; }
    if (fxReady()) {
      if (animKind === 'sea') { anim('wave', .42, 1, true); anim('horn', .5, 1); }
      return;
    }
    var t0 = Date.now();
    if (animKind === 'sea') { play('horn'); wave(); } else if (animKind === 'missile' || animKind === 'air') play('missile'); else play('cannon');
    animT = setInterval(function () {
      if (!c || !S().sfxOn || document.hidden) return; var t = c.currentTime + .01, r = Math.random(), el = (Date.now() - t0) / 1000;
      if (animKind === 'land') { if (r < .5) cannon(t, .4); else if (r < .75) cannon(t, .55); else if (r < .9) boom(t, .45); }   /* v120: balon patlaması gibi duyulan tiz rifle sesi kaldırıldı */
      else if (animKind === 'sea') { if (r < .35) cannon(t, .5); else if (r < .55) boom(t, .55); if (Math.random() < .3) wave(); }
      else { if (el > 1.8 && r < .6) boom(t, .6); else if (r < .25) whoosh(t, 1.1, .25, true); }
    }, 650);
  }
  /* V229: uçak saldırısının V226 öncesi ses akışı (kalkış uğultusu + rastgele aralıklı patlamalar) */
  function oldWhoosh(t, d, g) { if (!smp('owhoosh', t, Math.min(1, g * 2.2))) nz(t, d, g, 'bandpass', 250, 2600, sf, 1.4); }
  function oldAir() {
    var t0 = Date.now(), n = c.currentTime + .005; oldWhoosh(n, 1.4, .35); tone(80, n, 1.4, 'sawtooth', .12, sf, { to: 200, lp: 500, a: .2 });
    animT = setInterval(function () {
      if (!c || !S().sfxOn || document.hidden) return; var t = c.currentTime + .01, r = Math.random(), el = (Date.now() - t0) / 1000;
      if (el > 1.8 && r < .6) smp('oboom', t, Math.min(1, .6 * 1.15)); else if (r < .25) oldWhoosh(t, 1.1, .25);
    }, 650);
  }
  function wave() { if (!c) return; var t = c.currentTime + .01; nz(t, 3.2, .28, 'lowpass', 300, 700, sf, .5); }
  function animEnd() {
    if (animT) { clearInterval(animT); animT = null; } animKind = ''; aTank = false;
    if (aBus && c) {
      var b = aBus, list = aSrc; aBus = null; aSrc = []; aN = 0;
      try { var t = c.currentTime; b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(.0001, t + .55); list.forEach(function (s) { try { s.stop(t + .6); } catch (e) { } }); } catch (e) { }
      setTimeout(function () { try { b.disconnect(); } catch (e) { } }, 900);
    }
  }

  /* ---------- V227: ana menü müziği — assets/audio/menu.ogg ("Cihan Hâkimiyeti", özgün beste; 24 ölçü = 80 sn, sonundaki yankı bir sonraki turla örtüşür).
     Bellek için yalnızca menüdeyken bellekte durur. Dosya yoksa alttaki eski sentez beste çalar. ---------- */
  var MLOOP = 80, MGAIN = 1.7, mBuf = null, mLoading = false, mFailed = false;
  function loadMusic() {
    if (mBuf || mLoading || mFailed || !c) return; mLoading = true;
    xhr('assets/audio/menu.ogg', function (ab) { decode(ab, function (b) { mBuf = b; mLoading = false; }, function () { mFailed = true; mLoading = false; }); }, function () { mFailed = true; mLoading = false; });
  }

  /* ---------- ana menü müziği (özgün beste: D minör, 4 akor, 78 BPM) ---------- */
  var BPM = 78, SD = 60 / BPM / 4;
  var CH = [[146.83, 174.61, 220], [116.54, 146.83, 174.61], [98, 116.54, 146.83], [110, 138.59, 164.81]];   // Dm, Bb, Gm, A
  var MEL = [[[0, 440, 6], [8, 587.33, 4], [12, 523.25, 4]], [[0, 587.33, 6], [8, 523.25, 4], [12, 466.16, 4]], [[0, 466.16, 6], [8, 440, 4], [12, 392, 4]], [[0, 554.37, 6], [8, 659.25, 6]]];
  function startTrack() {
    if (!c || trk) return;
    var bus = c.createGain(), hi = mBuf ? MGAIN : 1; bus.gain.setValueAtTime(0.0001, c.currentTime); bus.gain.linearRampToValueAtTime(hi, c.currentTime + 2.5); bus.connect(mu);
    trk = { bus: bus, step: 0, next: c.currentTime + .15, n: 0, s: !!mBuf, src: [] };
  }
  function stopTrack() {
    if (!trk) return; var b = trk.bus, src = trk.src; trk = null;
    try { b.gain.cancelScheduledValues(c.currentTime); b.gain.setValueAtTime(b.gain.value, c.currentTime); b.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.2); } catch (e) { }
    setTimeout(function () { (src || []).forEach(function (s) { try { s.stop(); } catch (e) { } }); try { b.disconnect(); } catch (e) { } mBuf = null; }, 1600);   /* V227: oyun sırasında ~30 MB bellekte durmasın */
  }
  function schedMusic(tr) {   /* V227: bir sonraki tur önceden, tam ölçü sınırında kurulur */
    while (tr.next < c.currentTime + 1.5) { var s = c.createBufferSource(); s.buffer = mBuf; s.connect(tr.bus); s.start(tr.next); tr.src.push(s); if (tr.src.length > 3) tr.src.shift(); tr.next += MLOOP; }
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
      hookFX();
      if (want && !mBuf) loadMusic();
      if (want && !trk && (mBuf || mFailed)) startTrack(); else if (!want && trk) stopTrack();
      if (trk && trk.s) { if (mBuf) schedMusic(trk); }
      else if (trk) { var lim = c.currentTime + .5; while (trk.next < lim) { sched(trk, trk.step, trk.next); trk.step++; trk.next += SD; } }
      ambTick(!!document.body && document.body.classList.contains('wcm-on'));
    } catch (e) { }
  }

  /* ---------- oyun olaylarına bağlantılar ---------- */
  function hooks() {
    try {
      if (typeof showBattle === 'function' && !showBattle.wc111) {
        var _sb = showBattle;
        showBattle = function (r, p, e) {
          var res = _sb.apply(this, arguments);
          /* V229: savaş paneli açılışındaki davul/boru kaldırıldı; panelde kısık battle.ogg çalar (ambTick).
             V122: zafer/yenilgi müziği burada değil, savaş ekranı (v7.js finish) sonuç açıldığında çalar. */
          return res;
        };
        showBattle.wc111 = 1;
      }
      if (typeof scout === 'function' && !scout.wc111) { var _sc = scout; scout = function () { var r = _sc.apply(this, arguments); play('ping'); return r; }; scout.wc111 = 1; }
      if (typeof toast === 'function' && !toast.wc111) { var _t = toast; toast = function () { var n = Date.now(); if (n - lastN > 700) { lastN = n; play('notify'); } return _t.apply(this, arguments); }; toast.wc111 = 1; }
    } catch (e) { }
  }
  hooks(); window.addEventListener('load', hooks); setTimeout(hooks, 1500);

  window.AU = { init: init, vol: vol, play: play, hookFX: hookFX, has: function (k) { return !!(bufs[k] && bufs[k].length); }, music: function () { return { loaded: !!mBuf, failed: mFailed, playing: !!(trk && trk.s), state: c && c.state }; }, ctx: function () { return c; } };   /* V212: ctx — kılıç çarpışması sesi ayrı AudioContext kurmasın (ilk savaşta ~230 ms donma) */
  window.WCSfx = { animStart: animStart, animEnd: animEnd, play: play, anim: anim };
  try { AU = window.AU; } catch (e) { }
})();
