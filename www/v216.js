/* V216 — İSYAN ANİMASYONU (3B küre).
   Bir toprak isyan edip bağımsızlığını ilan edince (V23 hızlı genişleme isyanı, V76 kurtarılan toprak isyanı; ikisi de G.rebel23'e yazar)
   küre o ülkeye döner ve ~5 sn'lik sahne oynar: ülke yükselir, ortasında kırmızı "bağımsızlık" ışık sütunu, ülkenin içinde meşaleli
   kırmızı isyancılar belirir, yanan yapılarda küçük patlamalar, sonra her şey söner ve ülke yerine iner.
   Savaş efekt motoru (wc_battle_fx.js) kendi örneğiyle kullanılır; savaş animasyonuna (v60.js) dokunulmaz.
   Açık pencere (zar, olay kartı) veya savaş varsa kapanması beklenir. Geri almak için index.html'den v216.js bağlantısını silin. */
(function () {
  'use strict';
  var seen = null, seenG = null, queue = [], playing = false, fx = null;
  function A() { return window.v30API && v30API.ready() ? v30API : null; }
  function blocked() {
    try {
      if (!A()) return true;
      if (document.body.classList.contains('wcm-on')) return true;
      var m = document.getElementById('mod'); if (m && m.style.display === 'flex') return true;
      if (document.getElementById('ev76')) return true;
      if ((typeof BSH !== 'undefined' && BSH) || window.v60Active) return true;
      if (window.v30IntroBusy && v30IntroBusy()) return true;
      var g = document.getElementById('g3d'); if (!g || g.style.display === 'none') return true;
    } catch (e) { return true; }
    return false;
  }
  function mkFx(a) {
    if (fx) return fx;
    var T = a.THREE();
    fx = new window.WCBattleFX(T, a.globe(), { renderer: a.renderer(), camera: a.camera() });
    try { fx.lights.forEach(function (l) { if (l.parent) l.parent.remove(l); }); } catch (e) { }   /* nokta ışığı yok: küre malzemeleri yeniden derlenmez */
    fx.root.visible = false;
    a.hook(function (dt) { if (fx && fx.root.visible) fx.update(dt); });
    return fx;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function play(id) {
    var a = A(); if (!a || !window.WCBattleFX || !a.has(id)) { playing = false; return next(); }
    var T = a.THREE(), g = a.globe(), bb = a.bbox(id), ll = a.ll(id); if (!bb || !ll) { playing = false; return next(); }
    var f = mkFx(a), span = Math.max(bb[2] - bb[0], bb[3] - bb[1]), sc = .042 * Math.max(.7, Math.min(1.6, span / 8));
    try { a.focusLL(ll[0], ll[1], Math.max(1.95, Math.min(2.6, 1.8 + span / 22)) / ((window.innerWidth > window.innerHeight) ? .7 : 1)); } catch (e) { }   /* ülkeye ortala + yaklaş (yatayda v30 kamerayı 0.7 ile çarpar) */
    try { a.lift([id]); } catch (e) { }
    var keepLift = setInterval(function () { try { a.lift([id]); } catch (e) { } }, 250);
    var tint = false; try { if (typeof BT !== 'undefined' && !BT) { BT = { a: [], d: id }; tint = true; overlay(); } } catch (e) { }   /* isyan süresince ülke kırmızı (savunan vurgusu) */   /* harita yenilemesi yükseltmeyi sıfırlamasın */
    var h = 1.057;   /* yükselen bloğun üst yüzeyi (1 + H0) — efektler bloğun üstünde */
    /* sahne düzlemi: ülke merkezinde yüzeye teğet; yerel Y = yüzey normali */
    var P = a.sph(ll[0], ll[1], h), n = P.clone().normalize(), east = new T.Vector3(0, 1, 0).cross(n);
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0); east.normalize();
    var z = east.clone().cross(n).normalize();
    f.clear(); f.root.position.copy(P); f.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(east, n, z));
    f.root.scale.setScalar(sc); f.root.visible = true; f.timeScale = 1.15;
    /* ülkenin içinden rastgele noktalar (yerel koordinatta) */
    var pts = [], tries = 0;
    while (pts.length < 6 && tries++ < 200) {
      var lo = rnd(bb[0], bb[2]), la = rnd(bb[1], bb[3]); if (a.at(lo, la) !== id) continue;
      var w = g.localToWorld(a.sph(lo, la, h)), L = f.root.worldToLocal(w.clone()); L.y = 0;
      if (Math.hypot(L.x, L.z) > 9) continue; pts.push(L);
    }
    if (!pts.length) pts.push(new T.Vector3(0, 0, 0));
    var dur = 5200; window.__anim216 = performance.now() + dur + 600;
    try { if (window.AU) AU.play('attack'); } catch (e) { }
    var M = window.WCBattleFX.models, mobs = [], RED = 0xb3261e;
    /* 1) bağımsızlık ışık sütunu */
    f.at(.35, function () { try { f.deploy({ x: 0, y: 0, z: 0 }, 1.1, 0xd23b2b, 7); } catch (e) { } });
    /* 2) meşaleli isyancılar */
    pts.slice(0, 5).forEach(function (p, i) {
      f.at(.8 + i * .28, function () {
        try {
          var s = M.soldier(RED, i % 2); s.position.set(p.x, 0, p.z); s.rotation.y = Math.random() * 6.28; s.scale.setScalar(.01); f.spawn(s); mobs.push(s);
          f.deploy({ x: p.x, y: 0, z: p.z }, .45, 0xd23b2b, 3.2);   /* isyan noktası: kısa kırmızı ışık sütunu */
          f.tween(.45, function (u) { var e = 1 - Math.pow(1 - u, 3); s.scale.setScalar(.01 + 1.69 * e); });   /* 1,7x: üstten bakınca seçilsin */
          f.dust({ x: p.x, y: 0, z: p.z }, .7, 6);
          f.fireOn(s, new T.Vector3(.6, 2.6, 0), 3.4);
        } catch (e) { }
      });
    });
    /* 3) yanan yapılarda patlamalar */
    pts.forEach(function (p, i) {
      f.at(1.4 + i * .42, function () { try { var q = { x: p.x + rnd(-.8, .8), y: 0, z: p.z + rnd(-.8, .8) }; f.explosion(q, .55); f.dust(q, .9, 8); } catch (e) { } });
    });
    /* 4) sönüş */
    f.at(4.4, function () { mobs.forEach(function (s) { f.tween(.4, function (u) { s.scale.setScalar(Math.max(.01, 1.7 * (1 - u))); }, function () { f.kill(s); }); }); });
    setTimeout(function () {
      try { f.clear(); f.root.visible = false; } catch (e) { }
      clearInterval(keepLift); try { a.unlift(); } catch (e) { }
      try { if (tint && BT && BT.d === id && !(typeof BSH !== 'undefined' && BSH)) { BT = null; overlay(); } } catch (e) { }
      playing = false; setTimeout(next, 400);
    }, dur);
  }
  function next() {
    if (playing || !queue.length) return;
    if (blocked()) { setTimeout(next, 500); return; }
    playing = true; play(queue.shift());
  }
  /* yeni isyanları yakala (tüm isyan yolları G.rebel23'e yazar) */
  setInterval(function () {
    try {
      if (!window.G || !G.owner) return;
      if (seenG !== G) { seenG = G; seen = Object.assign({}, G.rebel23 || {}); queue = []; return; }   /* yeni/yüklenen oyun: eski isyanlar oynatılmaz */
      var R = G.rebel23 || {};
      Object.keys(R).forEach(function (k) {
        if (seen[k]) return; seen[k] = 1;
        if (G.owner[k] === k) { queue.push(k); setTimeout(next, 300); }
      });
    } catch (e) { }
  }, 400);
  window.v216Revolt = function (id) { queue.push(id); next(); };   /* test / elle tetikleme */
})();
