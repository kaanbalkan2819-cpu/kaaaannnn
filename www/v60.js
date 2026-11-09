/* V62 — 3B savaş animasyonları (wc_battle_fx.js v5).
   Ne zaman çalışır: 3B küre açıkken (V105: oyuncu savaşın tarafı olmasa da; yapay zekâ turları da izlenir). Önce eski savaş ekranı oynar (kılıçlar, zarlar, karşılaştırma);
   ZAFER/YENİLGİ yazısı çıkıp ~1 sn sonra savaş paneli geçici olarak gizlenir ve animasyon haritada (küre üzerinde) başlar.
   Animasyon bitince (veya "Animasyonu geç"e basılınca) panel geri gelir; "Haritaya Dön/Devam" oradan yapılır.
   Kamera KİLİTLENMEZ: geniş açıyla başlar, animasyon boyunca sürükle/yakınlaştır/döndür serbesttir; oyun da kilitlenmez (G.busy'ye dokunulmaz).
   Kara komşusu → tank + piyade (kule/ev hedef), komşu değil (deniz aşırı) → gemi + torpido. Saldıran MAVİ, savunan KIRMIZI.
   Atlanır: 2B harita, "hareketi azalt" (SET.rm), hızı 0 olan ayar, dosya yüklenemezse. */
(function () {
  'use strict';
  var SC = 0.085;        // V223: 0.06 -> 0.085 (animasyonlar büyütüldü). V221: 0.054 -> 0.06 (saldıranın ülkesine göre biraz daha büyük; hedefe sığma denetimleri aynen). V218: 0.046 -> 0.054 (sığdığı sürece daha büyük; sınır denetimleri gerekirse küçültür). birim ölçeği (küre yarıçapı = 1): büyütürsen modeller büyür
  var ZOOM = 3.5;        // V71: başlangıç kamera uzaklığı biraz artırıldı (eski 2.7). Küçük = daha yakın; 1.5 en yakın. Sonra serbest
  var ZMIN = 3.0;        // V71: en yakın başlangıç uzaklığı (eski 2.2)
  var TINY = 4;   // V141: eski 7 -> 4. Küçük ülkelerin çoğu artık tank/piyade/uçak sahnesi alır; füze yalnızca gerçekten minik ülkelerde ve bazen
  var MISSILE_P = .5;   // V141: çok küçük hedefte füze sahnesi olasılığı (gerisi tank/uçak yedek sahnesi)        // V71: hedefin ana kara parçasının sınır kutusu (derece; max(genişlik, yükseklik*1.3)) bundan küçükse FÜZE ATAR sahnesi
  var SHIP_S = 0.85;     // V84: gemi ölçeği (eski 1.25; küçültüldü). Gemi yerleşim denetimi de bu değere göre yapılır
  var FORCE_SEA = false;   // V101: deniz sahnesi son çare: en az hatalı konumda yine de kurulur
  var MIDPT = true;      // V99: kara/ateş/füze sahneleri saldıran ve savunan ülkelerin MERKEZLERİNİN tam ortasında kurulur (false = eski sınır noktası yerleşimi)
  var TS = 1.3;          // animasyon hızı (1 = demo hızı)
  var BLUE = 0x3b82f6, RED = 0xff5a47, CYAN = 0x22d3ee;   // CYAN: saldıranın müttefiki (ikinci taraf)
  var fx = null, fx2 = null, fx3 = null, loadP = null, bad = false, play = null, shield = null, shk = 0, pend = null, hid = false, fails = 0;

  function X(tr, en) { return (typeof L !== 'undefined' && L == 'tr') ? tr : en; }
  function A() { return window.v30API || null; }

  function loadFx() {
    if (window.WCBattleFX) return Promise.resolve();
    if (loadP) return loadP;
    loadP = new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = 'wc_battle_fx.js';
      s.onload = function () { try { if (window.AU && AU.hookFX) AU.hookFX(); } catch (e) { } ok(); }; s.onerror = function () { loadP = null; no(new Error('wc_battle_fx.js')); }; document.head.appendChild(s);
    });
    return loadP;
  }
  function mkFx() {
    var a = A(), f = new window.WCBattleFX(a.THREE(), a.globe(), { renderer: a.renderer(), camera: a.camera(), onShake: function (v) { shk = Math.min(1.2, Math.max(shk, v || 0)); } });
    try { f.lights.forEach(function (l) { if (l.parent) l.parent.remove(l); }); } catch (e) { }   // V63: nokta ışıkları kullanılmaz; küre malzemeleri yeniden derlenmez (takılma)
    f.root.visible = false; f.timeScale = TS; return f;
  }
  function ensureFx() {
    if (fx) return fx;
    fx = mkFx(); A().hook(frame);
    return fx;
  }
  function ensureFx2() { if (!fx2) fx2 = mkFx(); return fx2; }   // V67: müttefik saldırısı için ikinci sahne
  function ensureFx3() { if (!fx3) fx3 = mkFx(); return fx3; }   // V165: müttefik varken karşı taraf için üçüncü sahne
  /* V166: BİZİM BİRLİKLER VURULUR — yenilgide bizim (dud) birliklerimiz curV dizisine "kurban" olarak kaydolur; karşı sahnenin mermileri
     (HKF kancaları) bu birliklerin dünya konumuna nişan alır ve isabette birlik patlar. */
  var curV = null, HKF = null;
  function fxo(o) {
    if (curV) o.victim = curV;
    if (HKF) { var h = HKF(); o.aim = h.aim; o.onHit = h.hit; }
    return o;
  }
  function mkHooks(fc, victims) {
    return function () {
      var asg = {};
      return {
        aim: function (key, ahead) {
          var v = asg[key];
          if (!v || !v.alive) {
            var pool = victims.filter(function (q) { return q.alive; }), fr = pool.filter(function (q) { return !q.claimed; });
            v = fr.length ? fr[0] : (pool.length ? pool[(Math.random() * pool.length) | 0] : null);
            if (!v) return null; asg[key] = v;
          }
          v.claimed = true;
          try {
            var sm = v.sample(ahead || 0); fc.root.updateWorldMatrix && fc.root.updateWorldMatrix(true, false);
            var l = fc.root.worldToLocal(sm.w.clone()), k = v.fx.root.scale.x / (fc.root.scale.x || 1);
            return { x: l.x, y: Math.max(.05, sm.h * k), z: l.z };
          } catch (e) { return null; }
        },
        hit: function (key) { var v = asg[key]; if (v) v.die(); }
      };
    };
  }
  var PAR_COUNTER = true;   // V165: false yapılırsa karşı taraf eski V77 gibi sırayla saldırır

  var TMPV = null;
  /* V67: modeller oyuncunun bakış açısına göre boyutlanır — sahne (yerel uzunluk ≈ 11.6) kameranın görüş alanının dar kenarının
     en çok yarısını kaplar; yakınlaştıkça küçülür, yerleşim ölçeğinin (ülke sınırı denetimi) üstüne asla çıkmaz. */
  var SCENE_LEN = 11.6;
  function fitScale(s, dt) {
    try {
      var a = A(), cam = a.camera(); if (!TMPV) TMPV = new (a.THREE().Vector3)();
      s.fx.root.getWorldPosition(TMPV);
      var d = Math.max(.12, cam.position.distanceTo(TMPV)), vh = 2 * d * Math.tan(cam.fov * Math.PI / 360), vw = vh * (cam.aspect || 1);
      var lim = 0.5 * Math.min(vh, vw) / SCENE_LEN, target = s.fixed ? s.base : Math.max(Math.min(s.base, lim), s.base * .7);   // V71: füze/yedek sahne hiç küçülmez, kara sahnesi en çok %30 (isabetler hedef ülkede kalsın)
      s.cur += (target - s.cur) * Math.min(1, dt * 6);
      s.fx.root.scale.setScalar(s.cur);
    } catch (e) { }
  }

  function frame(dt) {
    var a = A(), cam = a && a.camera();
    window.v60Active = !!play;   // V72: v30 küre sahnesi animasyon sırasında her kareyi çizsin
    if (!play) { if (shk > 0 && cam) { cam.position.x = cam.position.y = 0; shk = 0; } return; }
    var p = play; p.frames = (p.frames || 0) + 1;
    a.lift(p.ids);   // sahne boyunca ülkeler yüzeyde yükselmiş kalsın (recompute geri indirmesin)
    var alive = false;
    p.scenes.forEach(function (s) {
      var r = s.sea ? 1.002 : a.height(s.ids.concat([p.tg])) + 0.0006;
      s.fx.root.position.copy(s.dir).multiplyScalar(r);
      fitScale(s, dt);
      s.fx.update(dt);
      if (s.fx.time - s.t0 < s.dur) alive = true;
    });
    if (cam) { if (shk > 0.003) { cam.position.x = (Math.random() - .5) * shk * .03; cam.position.y = (Math.random() - .5) * shk * .03; shk *= Math.exp(-dt * 5); } else { cam.position.x = cam.position.y = 0; shk = 0; } }
    if (!alive) { if (p.cnt && startCounter(p)) return; finish(); }   // V77: yenilgide karşı taraf sahnesi
  }

  function mkShield() {   // V111: düğme yok; yalnızca "geçmek için dokun" ipucu. Ekrana dokunmak (sürüklemek değil) animasyonu geçer.
    if (shield) return shield;
    var st = document.getElementById('v60css');
    if (!st) { st = document.createElement('style'); st.id = 'v60css'; st.textContent = '#v60s{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9000;pointer-events:none;font:600 12px system-ui,sans-serif;color:#fff;background:rgba(30,26,20,.55);border-radius:999px;padding:6px 14px;opacity:1;transition:opacity 1.2s ease 3.5s}#v60s.fd{opacity:0}'; document.head.appendChild(st); }
    shield = document.createElement('div'); shield.id = 'v60s'; shield.textContent = X('Geçmek için ekrana dokun', 'Tap the screen to skip');
    setTimeout(function () { if (shield) shield.className = 'fd'; }, 60);
    return shield;
  }
  var tapD = null;
  document.addEventListener('pointerdown', function (e) { tapD = { x: e.clientX, y: e.clientY, t: Date.now(), n: 1 }; }, true);
  document.addEventListener('pointermove', function (e) { if (tapD && (Math.abs(e.clientX - tapD.x) > 12 || Math.abs(e.clientY - tapD.y) > 12)) tapD = null; }, true);
  document.addEventListener('pointerup', function (e) {
    var d = tapD; tapD = null; if (!d || !play || Date.now() - d.t > 450) return;
    try { if (e.target && e.target.closest && e.target.closest('button,a,input,select,textarea,#mod,#hud,.wb')) return; } catch (x) { }
    try { if (window.WC226 && WC226.noTap()) return; } catch (x) { }   /* V226: derecelide YZ/rakip turu dokunarak geçilmez */
    finish();   // V111: dokunarak geç
  }, true);

  function hidePanel() { var b = document.getElementById('bs'); if (b) { b.style.visibility = 'hidden'; b.style.pointerEvents = 'none'; hid = true; } }
  function showPanel() { if (!hid) return; hid = false; var b = document.getElementById('bs'); if (b) { b.style.visibility = ''; b.style.pointerEvents = ''; } }

  function finish() {
    try { if (window.WCSfx) WCSfx.animEnd(); } catch (xs) { }
    showPanel();
    var p = play; if (!p) return; play = null;
    clearScenes();
    try { A().unlift(); } catch (e) { }   // V65: yükseltilen ülkeleri geri indir
    if (shield && shield.parentNode) shield.parentNode.removeChild(shield); shield = null;
    try { var c = A() && A().camera(); if (c) c.position.x = c.position.y = 0; } catch (e) { } shk = 0;
  }

  /* V65: sahne yerleşimi — askerler/tanklar yalnızca kendi kara parçasında, gemiler yalnızca denizde başlar */
  var DEG = Math.PI / 180;
  /* V70: büyük ülkede animasyon da büyük: ülkenin sınır kutusu (derece) / 8, 1–2.5 arası */
  var SZ = {};
  function sizeF(ids) {
    var f = 1;
    (ids || []).forEach(function (id) {
      if (SZ[id] == null) {
        SZ[id] = 1;
        try {
          for (var i = 0; i < R.length; i++) if (R[i].id === id) {
            var g = R[i].f.geometry, ps = g.type == 'Polygon' ? [g.coordinates] : g.coordinates, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
            ps.forEach(function (pg) { pg[0].forEach(function (c) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); }); });
            SZ[id] = Math.max(.5, Math.min(3, Math.max(x1 - x0, (y1 - y0) * 1.3) / 7)); break;   // V91: alt sınır 1 -> .5: küçük ülkenin animasyonu da küçük (ülkeyle orantılı)
          }
        } catch (e) { }
      }
      f = Math.max(f, SZ[id]);
    });
    return f;
  }
  /* V91: ülkenin yaklaşık yarıçap ölçüsü (radyan, küre yarıçapı = 1): dar kenar ile uzun kenarın %35'inin büyüğü */
  function extRad(a, id) {
    var b = null; try { b = bboxOf(a, id); } catch (e) { }
    if (!b) return .1;
    var w = (b[2] - b[0]) * DEG * Math.cos(((b[1] + b[3]) / 2) * DEG), h = (b[3] - b[1]) * DEG;
    w = Math.abs(w); h = Math.abs(h);
    return Math.max(.004, Math.max(Math.min(w, h), Math.max(w, h) * .35));
  }
  function ownExt(a, ids) { var m = 0; (ids || []).forEach(function (i) { m = Math.max(m, extRad(a, i)); }); return m || .1; }
  /* V91: mermi / füze / patlama boyutu HEDEF ülkeye sığsın: patlama halkası (~5 yerel birim x blast x ölçek) hedefin ~%30'unu geçmesin */
  function fitProj(a, f, tg, sc) {
    var k = 1; try { k = Math.max(.05, Math.min(1, Math.min(.6, extRad(a, tg)) * .3 / (5 * 1.9 * sc))); } catch (e) { k = 1; }   /* V230: Rusya'nın sınır kutusu tüm dünyayı sardığı için patlama devleşip kara leke bırakıyordu */
    f.projK = k; return k;
  }
  /* V131: TANK ÖLÇEĞİ ÜLKEYE GÖRE — tank/piyade, saldıran ile hedef ülkenin KÜÇÜĞÜne ve mutlak bir üst sınıra göre kısılır.
     (Eskiden yalnızca saldıranın boyutuna bakılıyordu: büyük ülke -> dev tank, küçük hedefte ülkeden büyük görünüyordu.)
     Tank uzunluğu ≈ sc * 1.15 * 2.4 (küre yarıçapı = 1, radyan). k = 1 (değişmez) ile TANK_MIN arası. */
  var TANK_LEN = 2.76, TANK_FRAC = .38, TANK_MAXRAD = .16, TANK_MIN = .25;
  function tankK(a, ids, tg, sc) {
    var k = 1;
    try {
      var len = Math.max(1e-6, sc * TANK_LEN), ext = Math.min(ownExt(a, ids), extRad(a, tg));
      k = Math.min(1, ext * TANK_FRAC / len, TANK_MAXRAD / len);
    } catch (e) { k = 1; }
    return Math.max(TANK_MIN, Math.min(1, k));
  }
  function toLL(v) { return [Math.atan2(-v.z, v.x) / DEG, Math.asin(Math.max(-1, Math.min(1, v.y / (v.length() || 1)))) / DEG]; }
  function frameAt(a, P, zdir) {
    var T = a.THREE(), z = zdir.clone().sub(P.clone().multiplyScalar(zdir.dot(P)));
    if (z.lengthSq() < 1e-8) z = new T.Vector3().crossVectors(P, new T.Vector3(0, 1, 0));
    if (z.lengthSq() < 1e-8) z = new T.Vector3(1, 0, 0);
    z.normalize(); return { P: P, z: z, x: new T.Vector3().crossVectors(P, z).normalize() };
  }
  function worldLL(fr, sc, lx, lz) { var v = fr.P.clone().add(fr.x.clone().multiplyScalar(lx * sc)).add(fr.z.clone().multiplyScalar(lz * sc)); return toLL(v); }
  var LAND_PTS = [[-1.5, -5.4], [1.7, -4.8], [0, -5.8], [-2.6, -5], [2.8, -5], [0, -2.8], [-1.5, -2.5], [1.6, -2.5], [0, 0], [-1.5, 0], [1.6, 0], [0, 2.6], [-1.5, 2.6], [1.6, 2.6], [-1.5, 4.4], [1.6, 4.0], [0, 4.8], [-2.6, 4.2], [2.8, 4.2]];
  var SEA_PTS = [[.8, -4.8], [-.8, 4.6], [0, -5.8], [0, -2.5], [0, 0], [0, 2.5], [0, 5.6], [-2, 0], [2, 0], [-2, 4], [2, -4]];
  function scoreLand(a, fr, sc, ids, tg) {   // hatalı nokta sayısı (0 = tamam)
    var bad = 0, ok = ids.concat([tg]);
    LAND_PTS.forEach(function (q) {
      var ll = worldLL(fr, sc, q[0], q[1]), id = a.at(ll[0], ll[1]);
      if (q[1] <= -4 && Math.abs(q[0]) < 2) { if (ids.indexOf(id) < 0) bad += 2; }        // başlangıç noktaları saldıranın karasında
      else if (q[1] >= 4 && Math.abs(q[0]) < 2) { if (id !== tg) bad += 2; }                           // hedefler hedef ülkede
      else if (ok.indexOf(id) < 0) bad++;                                        // aradaki yol deniz/üçüncü ülke olmasın
    });
    return bad;
  }
  /* V84: gemi sahnesi denetimi — saldıran gemi (başlangıç + ilerleme), hedef gemi ve aradaki torpido yolu için GÖVDE çevresi dahil
     tüm örnek noktalar denizde olmalı (a.at = kara ise hatalı). Hiç hatalı nokta kalmazsa sahne kurulur; aksi halde küçülür / başka aday denenir. */
  var SEA_A0 = [-.8, -4.4], SEA_D0 = [.8, 4.2];
  var SEA_CHK = (function () {
    var o = [], R = 2.1 * SHIP_S + .25, heading = Math.atan2(SEA_D0[0] - SEA_A0[0], SEA_D0[1] - SEA_A0[1]) - .5;
    var A1 = [SEA_A0[0] + Math.sin(heading) * 1.1, SEA_A0[1] + Math.cos(heading) * 1.1];
    function disk(c, r) { o.push([c[0], c[1]]); for (var k = 0; k < 8; k++) { var t = k * Math.PI / 4; o.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]); o.push([c[0] + Math.cos(t) * r * .5, c[1] + Math.sin(t) * r * .5]); } }
    disk(SEA_A0, R); disk(A1, R); disk(SEA_D0, R + .2);
    for (var z = -3.6; z <= 3.4; z += .8) { var u = (z + 4.4) / 8.6, x = SEA_A0[0] + (SEA_D0[0] - SEA_A0[0]) * u; o.push([x, z], [x - .7, z], [x + .7, z]); }   // torpido yolu
    return o;
  })();
  function scoreSea(a, fr, sc) {
    var bad = 0;
    SEA_CHK.forEach(function (q) { var ll = worldLL(fr, sc, q[0], q[1]); if (a.at(ll[0], ll[1])) bad++; });
    return bad;
  }
  /* V67: yoğun yol denetimi — iki şerit (tank/piyade) + orta hat boyunca; başlangıç yarısı saldıranın karasında, hedef yarısı hedef ülkede,
     aradaki yol yalnızca bu ikisinin karasında olmalı (deniz / üçüncü ülke yok). */
  var DL = (function () { var o = [], xs = [-1.5, 0, 1.6]; for (var z = -5.8; z <= 5.2; z += .8) xs.forEach(function (x) { o.push([x, z]); }); return o; })();   // V92: yanal genişlik + sık adım: birliklerin ayak izi tamamı denetlenir
  var DS = (function () { var o = [], xs = [-.9, 0, .9]; for (var z = -5.8; z <= 5.6; z += .8) xs.forEach(function (x) { o.push([x, z]); }); return o; })();
  function denseLand(a, fr, sc, ids, tg) {
    var bad = 0, ok = ids.concat([tg]);
    DL.forEach(function (q) {
      var ll = worldLL(fr, sc, q[0], q[1]), id = a.at(ll[0], ll[1]);
      if (q[1] <= -4) { if (ids.indexOf(id) < 0) bad++; } else if (q[1] >= 4) { if (id !== tg) bad++; } else if (ok.indexOf(id) < 0) bad++;
    });
    return bad;
  }
  function denseSea(a, fr, sc) { var bad = 0; DS.forEach(function (q) { var ll = worldLL(fr, sc, q[0], q[1]); if (a.at(ll[0], ll[1])) bad++; }); return bad; }   // (scoreSea gövde dahil kapsar)
  function xyz(ll, T) { var la = ll[1] * DEG, lo = ll[0] * DEG; return new T.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)); }
  function borderCands(a, from, tg, va, vt) {   // iki ülkenin gerçek sınırına en yakın noktalar
    var T = a.THREE(), A = a.border(from, 500).map(function (q) { return xyz(q, T); }), B = a.border(tg, 500).map(function (q) { return xyz(q, T); }), prs = [], i, j;
    for (i = 0; i < A.length; i++) for (j = 0; j < B.length; j++) { var d = A[i].distanceToSquared(B[j]); prs.push([d, i, j]); }
    prs.sort(function (p, q) { return p[0] - q[0]; });
    var out = [], mid = va.clone().add(vt).normalize();
    for (i = 0; i < prs.length && out.length < 40 && i < 400; i++) { out.push(A[prs[i][1]].clone().add(B[prs[i][2]]).normalize()); }
    out.sort(function (p, q) { return p.distanceToSquared(mid) - q.distanceToSquared(mid); });
    var res = [];   // birbirine çok yakın adayları ele
    out.forEach(function (c) { if (res.every(function (r) { return r.distanceToSquared(c) > 0.0004; })) res.push(c); });
    return res.slice(0, 6);
  }
  var UT = (function () { var o = [], xs = [-2.6, -1.3, 0, 1.6, 2.8]; for (var z = -5.8; z <= .8; z += .8) xs.forEach(function (x) { o.push([x, z]); }); return o; })();
  function unitTouch(a, fr, sc, tg) { var n = 0; UT.forEach(function (q) { var ll = worldLL(fr, sc, q[0], q[1]); if (a.at(ll[0], ll[1]) === tg) n++; }); return n; }
  /* V230: dev ülkede (Rusya, ABD, Çin…) sahne ülke ortasında değil, karşı tarafa bakan kenarın biraz içinde kurulur */
  function nearLL(a, id, other) {
    var c = a.ll(id); if (!c) return c;
    try {
      var b = a.bbox(id), oc = a.ll(other) || llOf(a, other); if (!b || !oc || Math.max(b[2] - b[0], b[3] - b[1]) < 40) return c;
      var T = a.THREE(), vo = xyz(oc, T), vc = xyz(c, T), best = null, bd = 1e9, ks = [.14, .1, .06, .03, 0], i;
      a.border(id, 500).forEach(function (q) { var v = xyz(q, T), d = v.distanceToSquared(vo); if (d < bd) { bd = d; best = v; } });
      if (!best) return c;
      for (i = 0; i < ks.length; i++) { var t = Math.min(1, ks[i] / (best.distanceTo(vc) || 1)), ll = toLL(best.clone().multiplyScalar(1 - t).add(vc.clone().multiplyScalar(t)).normalize()); if (a.at(ll[0], ll[1]) === id) return ll; }
    } catch (e) { }
    return c;
  }
  function place(a, ids, tg, from, land) {
    var la = nearLL(a, from, tg), lt = nearLL(a, tg, from); if (!la || !lt) return null;
    var T = a.THREE(), va = a.sph(la[0], la[1], 1), vt = a.sph(lt[0], lt[1], 1);
    var mid = va.clone().add(vt); if (mid.lengthSq() < 1e-6) mid = va.clone(); mid.normalize();
    var scales = land ? [1, .8, .66, .54, .44, .36, .3] : [1, .8, .66, .54, .44, .36, .3]   /* V223: en küçük ölçek büyütüldü */   /* V92: kara sahnesi sığana kadar küçülür */, best = null, cands = [], zs = [];
    if (land && !MIDPT) { try { cands = borderCands(a, from, tg, va, vt); } catch (e) { cands = []; } }
    if (!cands.length) cands = [mid];
    if (land && MIDPT) {   /* V100: orta noktadan başla; birlik ayak izi savunan ülkeye/denize/3. ülkeye değerse saldıranın merkezine doğru çek */
      cands = [0, .12, .24, .36, .5, .65, .8, 1].map(function (k) { return mid.clone().multiplyScalar(1 - k).add(va.clone().multiplyScalar(k)).normalize(); });
    }
    if (!land) {   /* V101: Karadeniz / Doğu Akdeniz gibi dar denizlerde daha çok aday: hat boyunca + yana kaydırılmış noktalar */
      var perp = va.clone().cross(vt); if (perp.lengthSq() > 1e-8) { perp.normalize(); [0, .03, -.03, .06, -.06, .1, -.1].forEach(function (off) { [.5, .35, .65, .2, .8].forEach(function (t) { cands.push(va.clone().multiplyScalar(1 - t).add(vt.clone().multiplyScalar(t)).add(perp.clone().multiplyScalar(off)).normalize()); }); }); }
    }
    if (!land) { for (var f = 0; f < 11; f++) { var tt = [.5, .38, .62, .27, .73, .16, .84, .08, .92, .44, .56][f]; cands.push(va.clone().multiplyScalar(1 - tt).add(vt.clone().multiplyScalar(tt)).normalize()); } cands.shift(); }
    var order = [], si0, ci0;
    if (land && MIDPT) {   // önce her aday konumda iri ölçekler (çekme > küçültme), sonra küçük ölçekler
      for (ci0 = 0; ci0 < cands.length; ci0++) for (si0 = 0; si0 < 3; si0++) order.push([si0, ci0]);
      for (ci0 = 0; ci0 < cands.length; ci0++) for (si0 = 3; si0 < scales.length; si0++) order.push([si0, ci0]);
    } else { for (si0 = 0; si0 < scales.length; si0++) for (ci0 = 0; ci0 < cands.length; ci0++) order.push([si0, ci0]); }
    for (var oi = 0; oi < order.length; oi++) {
      var si = order[oi][0], ci = order[oi][1], P = cands[ci], dirs = [vt.clone().sub(va)];
      if (land) dirs.push(vt.clone().sub(P), P.clone().sub(va));
      else { var d0 = vt.clone().sub(va); [.5, -.5, 1, -1, 1.57].forEach(function (ang) { dirs.push(d0.clone().applyAxisAngle(P, ang)); }); }   /* V101: gemi hattı döndürülerek dar denize sığdırılır */
      for (var di = 0; di < dirs.length; di++) {
        var fr = frameAt(a, P, dirs[di]), sc = SC * sizeF(ids) * scales[si], bad = land ? scoreLand(a, fr, sc, ids, tg) : scoreSea(a, fr, sc);
        if (bad === 0) bad = land ? denseLand(a, fr, sc, ids, tg) : denseSea(a, fr, sc);
        if (land && MIDPT) bad += unitTouch(a, fr, sc, tg);   // V100: birlik bölgesi savunan ülke sınırına değmesin   // V67: kaba denetim temizse yoğun denetim
        if (!best || bad < best.bad) best = { bad: bad, fr: fr, sc: sc, P: P };
        if (bad === 0) return best;
      }
    }
    if (best && land && MIDPT && best.bad > 2) {   /* V163: orta nokta sığmadı -> gerçek sınır noktalarında dene; hâlâ sığmazsa tank denize/3. ülkeye taşmasın diye yedek sahneye (saldıranın kendi toprağından ateş) geç */
      var bc = []; try { bc = borderCands(a, from, tg, va, vt); } catch (eB) { bc = []; }
      for (var bi = 0; bi < bc.length; bi++) for (var bs = 0; bs < scales.length; bs++) {
        var PB = bc[bi], dB = [vt.clone().sub(va), vt.clone().sub(PB), PB.clone().sub(va)];
        for (var bd2 = 0; bd2 < dB.length; bd2++) {
          var frB = frameAt(a, PB, dB[bd2]), scB = SC * sizeF(ids) * scales[bs], badB = scoreLand(a, frB, scB, ids, tg);
          if (badB === 0) badB = denseLand(a, frB, scB, ids, tg);
          if (badB < best.bad) best = { bad: badB, fr: frB, sc: scB, P: PB };
          if (badB === 0) return best;
        }
      }
      return best.bad === 0 ? best : null;   /* V218: sınır taşmasına hiç izin yok (eskiden 2 nokta); sığmazsa yedek sahne */
    }
    if (best && land && MIDPT) return best.bad === 0 ? best : null;   /* V218: taşan sahne yerine yedek sahne. V99: orta nokta sabit; sığmazsa en az hatalı ölçek kullanılır */
    if (best && !land && FORCE_SEA) return best;   /* V101: son çare: deniz sahnesi en az hatalı konumda */
    return best && best.bad <= (land ? 2 : 0) ? best : null;   /* V93b: kara tolerans 2 (animasyon kapanmasın) */   /* V92: kara sahnesinde de hata toleransı sıfır: birlik ayak izi başka ülkeye taşmaz; sığmazsa yedek sahne (kendi sınırına göre küçültülür) */   // V84: deniz sahnesinde hiç hata yok (gemi karaya taşmaz); kurulamazsa yedek sahne   // V67: başka ülkeye taşan sahne kurulmaz (en çok 2 kenar noktası hoşgörü)
  }
  window.v60Place = function (ids, tg) {   // yalnızca test/ayar için
    var a = A(), nb = (typeof M !== 'undefined' && M[tg] && M[tg].nb) || [], nbIds = ids.filter(function (i) { return nb.indexOf(i) >= 0; });
    var land = nbIds.length > 0, p = place(a, ids, tg, land ? nbIds[0] : ids[0], land); return p ? { bad: p.bad, sc: p.sc / SC, land: land } : null;
  };

  /* V67: saldıran origin listesi: kendi toprakların (önce) + hedefle kara sınırı olan müttefik (ikinci taraf, en çok 2 sahne) */
  function origins(a, po, ids, tg) {
    var nb = (typeof M !== 'undefined' && M[tg] && M[tg].nb) || [];
    var nbIds = ids.filter(function (i) { return nb.indexOf(i) >= 0; });
    var land = nbIds.length > 0, list = [{ ids: land ? nbIds : ids, from: land ? nbIds[0] : ids[0], land: land, color: BLUE }];
    try {
      if (po != null && window.WCD && WCD.allies && G && G.owner) {
        (WCD.allies(po) || []).forEach(function (al) {
          if (list.length > 1 || al === po) return;
          var lands = nb.filter(function (n) { return G.owner[n] === al && a.has(n) && ids.indexOf(n) < 0; });
          if (lands.length) list.push({ ids: lands, from: lands[0], land: true, color: CYAN });
        });
      }
    } catch (e) { }
    return list;
  }

  /* V71: İSABET NOKTALARI — tank/piyade/füze hedefleri HER ZAMAN hedef ülkenin içinde (dünya koordinatında denetlenir). */
  function localOf(a, fr, sc, ll) {   // dünya (boylam/enlem) -> sahne yerel koordinatı (y: küre eğriliği kadar aşağıda)
    var W = a.sph(ll[0], ll[1], 1), d = W.clone().sub(fr.P);
    return { x: d.dot(fr.x) / sc, y: d.dot(fr.P) / sc, z: d.dot(fr.z) / sc };
  }
  function impactSet(a, fr, sc, tg, cx, cz, zlo, zhi) {   // hedef ülkenin içindeki ızgara noktaları (yerel x,z), istenen merkeze yakınlığa göre
    var cand = [], x, z, i;
    for (z = zlo; z <= zhi + 1e-6; z += .5) for (x = -3.5; x <= 3.5 + 1e-6; x += .5) {
      var ll = worldLL(fr, sc, x, z);
      if (a.at(ll[0], ll[1]) !== tg) continue;
      cand.push({ x: x, z: z, c: Math.abs(x - cx) * .6 + Math.abs(z - cz) * .4, m: -1 });
    }
    cand.sort(function (p, q) { return p.c - q.c; });
    for (i = 0; i < cand.length && i < 36; i++) {   // sınırdan uzaklık: 4 komşu nokta da hedefte mi
      var m = 0, q = cand[i];
      [[.7, 0], [-.7, 0], [0, .7], [0, -.7]].forEach(function (d) { var l2 = worldLL(fr, sc, q.x + d[0], q.z + d[1]); if (a.at(l2[0], l2[1]) === tg) m++; });
      q.m = m;
    }
    return cand;
  }
  function pickImpacts(a, fr, sc, tg, n, cx, cz, zlo, zhi) {   // {pts: n yerel nokta, pool(r): ilk noktaya yakın havuz}
    var cand = impactSet(a, fr, sc, tg, cx, cz, zlo, zhi), top = cand.filter(function (q) { return q.m >= 0; }), out = [], i;
    top.sort(function (p, q) { return (p.c - p.m * .8) - (q.c - q.m * .8); });
    top.forEach(function (q) { if (out.length < n && out.every(function (r) { return Math.hypot(r.x - q.x, r.z - q.z) >= .9; })) out.push(q); });
    if (!out.length) {   // ızgara hedefi yakalayamadı (çok küçük/ince): hedefin merkezi
      var c = llOf(a, tg), l = c ? localOf(a, fr, sc, c) : { x: cx, y: 0, z: cz };
      /* V218: küçük hedefte tüm birlikler AYNI noktaya gidip üst üste biniyordu; noktalar hedefin içinde merkez çevresine dağıtılır */
      var rr = .5; try { rr = Math.max(.18, Math.min(.9, extRad(a, tg) / sc * .35)); } catch (eR) { }
      var one = [l]; for (i = 1; i < n; i++) { var an = i * 2.4; one.push({ x: l.x + Math.cos(an) * rr, y: l.y, z: l.z + Math.sin(an) * rr }); }
      return { pts: one, pool: function () { return [l]; } };
    }
    for (i = 0; out.length < n; i++) out.push(out[i % out.length]);
    var loc = function (q) { return localOf(a, fr, sc, worldLL(fr, sc, q.x, q.z)); };
    return { pts: out.map(loc), pool: function (r) { var f = out[0]; return cand.filter(function (q) { return Math.hypot(q.x - f.x, q.z - f.z) <= r; }).slice(0, 14).map(loc); } };
  }
  function up(p, dy) { return { x: p.x, y: p.y + dy, z: p.z }; }

  /* V71: ÇOK KÜÇÜK ÜLKE → füze atar. Ölçüt: ana kara parçasının sınır kutusu (küre verisi yoksa 2B geometri). */
  function bboxOf(a, id) {
    try {
      if (a.bbox) { var b = a.bbox(id); if (b) return b; }
      for (var i = 0; i < R.length; i++) if (R[i].id === id) {
        var g = R[i].f.geometry, ps = g.type == 'Polygon' ? [g.coordinates] : g.coordinates, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        ps.forEach(function (pg) { pg[0].forEach(function (c) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); }); });
        return [x0, y0, x1, y1];
      }
    } catch (e) { }
    return null;
  }
  function isTiny(a, id) { var b = bboxOf(a, id); return !!b && Math.max(b[2] - b[0], (b[3] - b[1]) * 1.3) <= TINY; }
  function tinyPts(a, tg) {   // hedef ülkenin İÇİNDEN dünya noktaları [boylam, enlem]
    var bb = bboxOf(a, tg), out = [], i, j;
    if (bb && a.has(tg)) for (i = 0; i < 9; i++) for (j = 0; j < 9; j++) {
      var lo = bb[0] + (bb[2] - bb[0]) * (i + .5) / 9, la = bb[1] + (bb[3] - bb[1]) * (j + .5) / 9;
      if (a.at(lo, la) === tg) out.push([lo, la]);
    }
    if (out.length > 1 && bb) {   // kenardaki noktaları ele: dört yön komşusu da hedefte olsun (yoksa hepsi kalır)
      var dx = (bb[2] - bb[0]) / 14, dy = (bb[3] - bb[1]) / 14;
      var safe = out.filter(function (q) { return [[dx, 0], [-dx, 0], [0, dy], [0, -dy]].every(function (d) { return a.at(q[0] + d[0], q[1] + d[1]) === tg; }); });
      if (safe.length) out = safe;
    }
    if (!out.length) {
      try {   // sınır noktalarını ağırlık merkezine doğru %50 çek
        var br = a.border(tg, 40), cx = 0, cy = 0; br.forEach(function (q) { cx += q[0]; cy += q[1]; });
        if (br.length) { cx /= br.length; cy /= br.length; br.forEach(function (q) { out.push([cx + (q[0] - cx) * .5, cy + (q[1] - cy) * .5]); }); }
      } catch (e) { }
    }
    if (!out.length) { var c = llOf(a, tg); if (c) out.push(c); }
    return out;
  }
  function spread(list, n) {   // listeden birbirinden en uzak n nokta (yetmezse tekrar)
    if (!list.length) return [];
    var cx = 0, cy = 0; list.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= list.length; cy /= list.length;
    var ch = [list.slice().sort(function (p, q) { return Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy); })[0]];
    while (ch.length < n && ch.length < list.length) {
      var best = null, bd = -1;
      list.forEach(function (q) { var d = 1e9; ch.forEach(function (c) { d = Math.min(d, Math.hypot(q[0] - c[0], q[1] - c[1])); }); if (d > bd) { bd = d; best = q; } });
      if (bd <= 0) break; ch.push(best);
    }
    for (var i = 0; ch.length < n; i++) ch.push(ch[i % ch.length]);
    return ch;
  }
  function launchPoint(a, o, va, vt, tg) {   // saldıranın hedefe en yakın sınır noktası, biraz içeride (kara denetimi geçen ilk nokta)
    if (MIDPT) {   // V100: orta nokta; birlik ayak izi saldıranın toprağında kalana dek saldıranın merkezine doğru çek
      var Mm = va.clone().add(vt); if (Mm.lengthSq() < 1e-6) Mm = va.clone(); Mm.normalize();
      var bestP = Mm, bestB = 1e9, ks = [0, .12, .24, .36, .5, .65, .8, 1];
      for (var ki = 0; ki < ks.length; ki++) {
        var Pk = Mm.clone().multiplyScalar(1 - ks[ki]).add(va.clone().multiplyScalar(ks[ki])).normalize();
        var dk = Math.acos(Math.max(-1, Math.min(1, Pk.dot(vt)))), sk0 = Math.max(SC * .4, Math.min(SC * 1.2 * sizeF(o.ids), dk / 9, ownExt(a, o.ids) / 3.2));
        var frk = frameAt(a, Pk, vt.clone().sub(Pk)), bk = fireFootBad(a, Pk, frk, sk0, o.ids, tg);
        if (bk < bestB) { bestB = bk; bestP = Pk; } if (bk === 0) break;
      }
      return bestP;
    }
    var T = a.THREE(), B = null, bd = 1e9, P = null, i;
    o.ids.forEach(function (id) {
      var br = []; try { br = a.border(id, 400); } catch (e) { }
      br.forEach(function (q) { var v = xyz(q, T), d = v.distanceToSquared(vt); if (d < bd) { bd = d; B = v; } });
    });
    if (!B) B = va.clone();
    var ts = [.2, .1, .35, .5, 0];
    for (i = 0; i < ts.length && !P; i++) {
      var Q = B.clone().multiplyScalar(1 - ts[i]).add(va.clone().multiplyScalar(ts[i])).normalize(), ll = toLL(Q), id = a.at(ll[0], ll[1]);
      if (id && o.ids.indexOf(id) >= 0) P = Q;
    }
    return P || B.clone().normalize();
  }
  function pickKind() {   // V124: kara saldırısı çeşitliliği: tank+piyade / iki tank / uçaklar (çok küçük hedefte füze atar ayrıca devreye girer)
    /* V214: uçak sahnesi pratikte nadiren görünüyordu (yalnızca kara savaşı + %35). Artık %45; üst üste 2 kara savaşında uçak çıkmazsa 3.'sünde kesin uçak. */
    var miss = window.__air214 | 0, x = Math.random(), k = (miss >= 2) ? 'air' : (x < .30 ? 'tankInf' : (x < .55 ? 'twoTank' : 'air'));
    window.__air214 = k === 'air' ? 0 : miss + 1; return k;
  }
  function buildScene(a, f, o, tg, r) {
    if (!o.land) return null;   // V70: deniz aşırı saldırı yedek ateş sahnesini kullanır
    var la = a.ll(o.from), lt = a.ll(tg); if (!la || !lt) return null;
    var T = a.THREE(), pl = place(a, o.ids, tg, o.from, o.land); if (!pl) return null;
    var P = pl.P, z = pl.fr.z, xx = pl.fr.x;
    f.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xx, P, z));   // yerel Y = yüzey normali, yerel Z = hedefe doğru
    if (!f.root.parent) a.globe().add(f.root);
    f.root.scale.setScalar(pl.sc); f.root.position.copy(P); f.root.visible = true; f.clear(); f.timeScale = TS; fitProj(a, f, tg, pl.sc);   // V91
    var tk = tankK(a, o.ids, tg, pl.sc), M3 = window.WCBattleFX.models, win = !!r.win, dur = 0, V = function (x, y, zz) { return { x: x, y: y, z: zz }; };
    if (o.land) {
      /* V70: savunan tarafta kule/ev/gemi yok; yalnızca saldıranın tank + piyadesi hedef yönüne ateş eder */
      /* V71: isabet noktaları hedef ülkenin içinden seçilir (dünya koordinatında denetlenir); rastgele yere patlama yok */
      var kind = pickKind(), air = false;
      if (kind === 'air') {   // V124: HAVA SALDIRISI — 2 savaş uçağı hedefin üstünden alçalıp bomba bırakır
        var IA = pickImpacts(a, pl.fr, pl.sc, tg, 4, 0, 5.6, 3.6, 10), tosA = IA.pts.map(function (q) { return up(q, .15); });
        var dA = f.planeAttack(fxo({ from: V(0, 0, -5), to: tosA[0], tos: tosA, color: o.color, scale: .92, planes: 2, bombs: 2, dud: !win, blast: win ? 1.7 : 1.2 }));
        dur = dA && dA.duration || 9; air = true;
      } else if (kind === 'twoTank') {   // V124: iki tank
        var T1 = pickImpacts(a, pl.fr, pl.sc, tg, 2, -1.4, 5.6, 3.6, 10), T2 = pickImpacts(a, pl.fr, pl.sc, tg, 2, 1.4, 5.4, 3.6, 10);
        var e1 = f.tankAttack(fxo({ from: V(-1.5, 0, -5.4), to: up(T1.pts[0], .3), tos: T1.pts.map(function (q) { return up(q, .15); }), color: o.color, scale: 1.15 * tk, shots: 2, dud: !win, blast: win ? 1.7 : 1.2 }));
        var e2 = f.tankAttack(fxo({ from: V(1.6, 0, -5), to: up(T2.pts[0], .3), tos: T2.pts.map(function (q) { return up(q, .15); }), color: o.color, scale: 1.15 * tk, shots: 2, gap: 1.4, dud: !win, blast: win ? 1.7 : 1.2 }));
        dur = Math.max(e1 && e1.duration || 8, e2 && e2.duration || 8);
      } else {   // tank + piyade (eski sahne)
        var I1 = pickImpacts(a, pl.fr, pl.sc, tg, 2, -1.2, 5.6, 3.6, 10), I2 = pickImpacts(a, pl.fr, pl.sc, tg, 1, 1.6, 5.4, 3.6, 10);
        var d1 = f.tankAttack(fxo({ from: V(-1.5, 0, -5.4), to: up(I1.pts[0], .3), tos: I1.pts.map(function (q) { return up(q, .15); }), color: o.color, scale: 1.15 * tk, shots: 2, dud: !win, blast: win ? 1.7 : 1.2 }));
        var d2 = f.infantryAttack(fxo({ from: V(1.7, 0, -4.8), to: up(I2.pts[0], .2), pool: I2.pool(1.1), color: o.color, count: 4, scale: 1.2 * tk, dud: !win, blast: win ? 1.4 : 1 }));
        dur = Math.max(d1 && d1.duration || 8, d2 && d2.duration || 8);
      }
    } else { return null; }   // V70: deniz aşırı → yedek sahne (savunan gemi animasyonu yok)
    return { fx: f, dir: P.clone(), sea: !o.land, air: air, ids: o.ids.concat(o.extra || []), base: pl.sc, cur: pl.sc, t0: f.time, dur: dur + .6 };
  }
  /* V68: YEDEK SAHNE — hedef ülke küçükse / küre verisinde yoksa / yerleşim denetimi geçemediyse animasyon artık atlanmaz:
     saldıranın kendi toprağından (hedefe en yakın sınır noktası, biraz içeride) hedefin YÖNÜNE doğru iki tank ateş eder.
     Sınır denetimi yoktur; mermiler hedefin yönüne düşer. Sahne küçük ölçeklidir. */
  function llOf(a, id) {
    var q = a.ll(id); if (q) return q;
    try {   // küre verisinde yoksa 2B harita geometrisinden sınır kutusu merkezi
      for (var i = 0; i < R.length; i++) if (R[i].id === id) {
        var g = R[i].f.geometry, ps = g.type == 'Polygon' ? [g.coordinates] : g.coordinates, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        ps.forEach(function (pg) { pg[0].forEach(function (c) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); }); });
        return [(x0 + x1) / 2, (y0 + y1) / 2];
      }
    } catch (e) { }
    return null;
  }

  /* V92: YEDEK / FÜZE SAHNESİ AYAK İZİ DENETİMİ — birliklerin (tank, piyade, füze kamyonu) bulunduğu noktalar ve çevresi
     saldıranın kendi topraklarında kalmalı (başka ülkeye taşmasın); ölçek sığana kadar küçülür. İlerleme yolu yalnızca saldıran + hedef ülkede olabilir. */
  var FP_PTS = [[-1.3, -1], [1.3, -1.4], [.1, -2.2], [0, -.9], [-2.2, -1], [2.2, -1.4], [-.1, -3.4], [-1.3, -3], [1.3, -3], [0, 0], [-1.3, .8], [1.3, .8]];
  function fireFootBad(a, P, fr, sc, ids, tg) {
    var okIds = ids.concat([tg]), bad = 0;
    for (var i = 0; i < FP_PTS.length; i++) {
      var q = FP_PTS[i], ll = worldLL({ P: P, x: fr.x, z: fr.z }, sc, q[0], q[1]), id = a.at(ll[0], ll[1]);
      if (q[1] <= -.5) { if (ids.indexOf(id) < 0) bad++; } else if (okIds.indexOf(id) < 0) bad++;
    }
    return bad;
  }
  function fireFootOK(a, P, fr, sc, ids, tg) {
    var okIds = ids.concat([tg]);
    for (var i = 0; i < FP_PTS.length; i++) {
      var q = FP_PTS[i], ll = worldLL({ P: P, x: fr.x, z: fr.z }, sc, q[0], q[1]), id = a.at(ll[0], ll[1]);
      if (q[1] <= -.5) { if (ids.indexOf(id) < 0) return false; } else if (okIds.indexOf(id) < 0) return false;
    }
    return true;
  }
  function fitFireScale(a, P, fr, sc, ids, tg, minSc) {
    var s2 = sc, k;
    for (k = 0; k < 12; k++) { if (fireFootOK(a, P, fr, s2, ids, tg)) return s2; s2 *= .8; if (s2 < minSc) break; }
    return Math.max(minSc, s2);
  }
  /* V229: birlik ayak izi saldıranın karasına sığan nokta aranır (seçilen nokta, sonra ülke merkezlerine doğru). Sığmıyorsa null: kara birliği konmaz, denizden tank çıkmaz. */
  function fireSpot(a, o, P, vt, sc, tg) {
    var cs = [P], i;
    o.ids.slice(0, 16).forEach(function (id) { var ll = a.ll(id); if (!ll) return; var v = a.sph(ll[0], ll[1], 1); [.25, .5, .75, 1].forEach(function (k) { cs.push(P.clone().multiplyScalar(1 - k).add(v.clone().multiplyScalar(k)).normalize()); }); });
    for (i = 0; i < cs.length; i++) {
      var c = cs[i], fr = frameAt(a, c, vt.clone().sub(c)), s = fitFireScale(a, c, fr, sc, o.ids, tg, SC * .45);
      if (fireFootOK(a, c, fr, s, o.ids, tg)) return { P: c, fr: fr, sc: s };
    }
    /* Türkiye gibi dar ülkede tam düzen sığmaz: yalnızca iki tank ve ilerleme yolları kendi karasına sığıyorsa tank sahnesi kurulur */
    for (i = 0; i < cs.length; i++) {
      for (var s2 = sc; s2 >= SC * .45; s2 *= .8) { var c2 = cs[i], f2 = frameAt(a, c2, vt.clone().sub(c2)); if (tanksFit(a, c2, f2, s2, o.ids)) return { P: c2, fr: f2, sc: s2, tanksOnly: true }; }
    }
    return null;
  }
  var TANK_PTS = [[-1.3, -1], [1.3, -1.4], [-1.3, .2], [1.3, -.2], [0, -1.2], [-2, -1.2], [2, -1.4]];
  function tanksFit(a, P, fr, sc, ids) { for (var i = 0; i < TANK_PTS.length; i++) { var q = TANK_PTS[i], ll = worldLL({ P: P, x: fr.x, z: fr.z }, sc, q[0], q[1]); if (ids.indexOf(a.at(ll[0], ll[1])) < 0) return false; } return true; }
  window.v60FireProbe = function (ids, tg) {   // yalnızca test/ayar için
    var a = A(), la = a.ll(ids[0]), lt = llOf(a, tg); if (!la || !lt) return null;
    var va = a.sph(la[0], la[1], 1), vt = a.sph(lt[0], lt[1], 1), o = { ids: ids, from: ids[0], land: false }, P = launchPoint(a, o, va, vt, tg), fr = frameAt(a, P, vt.clone().sub(P)), sc = fitFireScale(a, P, fr, SC * .6, ids, tg, SC * .45), sp = fireSpot(a, o, P, vt, sc, tg);
    return { oldOk: fireFootOK(a, P, fr, sc, ids, tg), found: !!sp, sc: sp ? sp.sc / SC : 0, ll: sp ? toLL(sp.P) : null };
  };
  function buildFireScene(a, f, o, tg, r) {
    var la = nearLL(a, o.from, tg), lt = (a.has(tg) && nearLL(a, tg, o.from)) || llOf(a, tg); if (!la || !lt) return null;
    var T = a.THREE(), va = a.sph(la[0], la[1], 1), vt = a.sph(lt[0], lt[1], 1), P = launchPoint(a, o, va, vt, tg);
    var dt = Math.acos(Math.max(-1, Math.min(1, P.dot(vt))));
    var sc = Math.max(SC * .4, Math.min(SC * 1.2 * sizeF(o.ids), dt / 9, ownExt(a, o.ids) / 3.2));   // V91: saldıran ülkeyle orantılı, kendi ülkesine sığar   // V71: sizeF artık mesafeye çarpılmaz (eskiden ateş hedefi aşıyordu)
    if (dt / sc > 18) sc = Math.min(SC * 2.6, dt / 18);                       // uzak hedefte ölçek büyür: menzil ~18 birimi geçmez
    var fr = frameAt(a, P, vt.clone().sub(P));
    try { sc = fitFireScale(a, P, fr, sc, o.ids, tg, SC * .45); } catch (eF) { }   // V92: birlikler kendi ülke sınırını aşmasın
    var spot = null; try { spot = fireSpot(a, o, P, vt, sc, tg); } catch (eS) { }   /* V229 */
    if (spot) { P = spot.P; fr = spot.fr; sc = spot.sc; dt = Math.acos(Math.max(-1, Math.min(1, P.dot(vt)))); }
    var lc = dt / sc;
    f.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(fr.x, P, fr.z));
    if (!f.root.parent) a.globe().add(f.root);
    f.root.scale.setScalar(sc); f.root.position.copy(P); f.root.visible = true; f.clear(); f.timeScale = TS; fitProj(a, f, tg, sc);   // V91
    var tk = tankK(a, o.ids, tg, sc), win = !!r.win, V = function (x, y, zz) { return { x: x, y: y, z: zz }; };
    var I = pickImpacts(a, fr, sc, tg, 3, 0, lc, Math.max(2, lc - 6), lc + 6), tos = I.pts.map(function (q) { return up(q, .15); });
    var air = false, dur;
    if (!spot || (o.land && (Math.random() < .45 || (window.__air214 | 0) >= 2))) { window.__air214 = 0;   /* V229: kara birliği sığmıyorsa yalnız uçak */   // V214: şans sayacı; V124: yedek sahnede de bazen uçaklar
      var dA = f.planeAttack(fxo({ from: V(0, 0, -1), to: tos[0], tos: [tos[0], tos[1], tos[2], tos[0]], color: o.color, scale: .92, planes: 2, bombs: 2, dud: !win, blast: win ? 1.9 : 1.3 }));
      dur = dA && dA.duration || 9; air = true;
    } else {
      var d1 = f.tankAttack(fxo({ from: V(-1.3, 0, -1), to: tos[0], tos: [tos[0], tos[1], tos[2]], color: o.color, scale: 1.15 * tk, shots: 3, dud: !win, blast: win ? 1.9 : 1.3 }));
      var d2 = f.tankAttack(fxo({ from: V(1.3, 0, -1.4), to: tos[1], tos: [tos[1], tos[2], tos[0]], color: o.color, scale: 1.15 * tk, shots: 3, dud: !win, blast: win ? 1.9 : 1.3 }));
      dur = Math.max(d1 && d1.duration || 8, d2 && d2.duration || 8);
      if (o.land && !spot.tanksOnly) {   // V78: kara saldırısında yedek sahnede de piyade olsun (tank + piyade)
        var d3 = f.infantryAttack(fxo({ from: V(.1, 0, -2.2), to: up(I.pts[2], .2), pool: I.pool(1.4), color: o.color, count: 4, scale: 1.2 * tk, dud: !win, blast: win ? 1.4 : 1 }));
        dur = Math.max(dur, d3 && d3.duration || 8);
      }
    }
    return { fx: f, dir: P.clone(), sea: false, air: air, ids: o.ids, base: sc, cur: sc, fixed: true, t0: f.time, dur: dur + .6, fire: true, zr: Math.min(5.8, Math.max(1.95, 1.2 + dt * 3)), focus: MIDPT ? P.clone() : P.clone().add(vt).normalize() };
  }

  /* V77: YENİLGİDE KARŞI TARAFIN ANİMASYONU — saldırı kaybedilirse savunan (KIRMIZI) bizim topraklarımıza saldırır.
     Kara komşusu → savunanın tank + piyadesi bizim toprağa ateş eder; deniz aşırı → savunanın gemisi torpidoyla bizim gemiyi batırır
     (gemi sahnesi kurulamazsa savunanın tankları kendi kıyısından bize ateş eder). Saldırı animasyonu bittikten sonra sırayla oynar. */
  function buildSeaScene(a, f, ids, from, target, cA, cB, sink, both) {   // V79: gemi + torpido sahnesi (saldıran = A gemisi, hedef = B gemisi)
    var la = nearLL(a, from, target), lt = nearLL(a, target, from); if (!la || !lt) return null;
    var T = a.THREE(), pl = place(a, ids, target, from, false); if (!pl) return null;
    f.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(pl.fr.x, pl.P, pl.fr.z));
    if (!f.root.parent) a.globe().add(f.root);
    f.root.scale.setScalar(pl.sc); f.root.position.copy(pl.P); f.root.visible = true; f.clear(); f.timeScale = TS; fitProj(a, f, target, pl.sc);   // V91
    var d = f.navalAttack({ from: { x: -.8, y: 0, z: -4.4 }, to: { x: .8, y: 0, z: 4.2 }, color: cA, targetColor: cB, scale: SHIP_S, torpedoes: 3, sink: !!sink, dud: !sink, keep: !!both });   // V164: yenilgide boşa atış
    var dur = d && d.duration || 12;
    if (both && d && d.targetShip && d.ownShip) {   // V166: yenilgide AYNI sahnede karşı gemi de bizim gemimize torpido atıp batırır
      var d2 = f.navalAttack({ from: { x: .8, y: 0, z: 4.2 }, to: { x: -.8, y: 0, z: -4.4 }, attacker: d.targetShip, target: d.ownShip, color: cB, scale: SHIP_S, torpedoes: 3, sink: true, keep: true });
      dur = Math.max(dur, d2 && d2.duration || 12);
    }
    return { fx: f, dir: pl.P.clone(), sea: true, ids: ids.concat([target]), base: pl.sc, cur: pl.sc, t0: f.time, dur: dur + .6, bothSides: !!(both && d && d.targetShip && d.ownShip) };
  }
  function clearScenes() {
    [fx, fx2, fx3].forEach(function (f) { if (!f) return; try { f.clear(); f.root.visible = false; if (f.root.parent) f.root.parent.remove(f.root); } catch (e) { } });
  }
  /* V165: karşı taraf (KIRMIZI) sahnesi — hem sıralı (V77) hem eş zamanlı (V165) mod bunu kullanır */
  function buildCounter(a, f, c) {
    var o = c.o, s = null, eo = { ids: [c.tg], from: c.tg, land: c.land, color: RED, extra: [o.from] };
    if (c.land) { try { s = buildScene(a, f, eo, o.from, { win: true }); } catch (e1) { s = null; } }
    else if (!c.tiny) { try { s = buildSeaScene(a, f, [c.tg], c.tg, o.from, RED, BLUE, true); } catch (e2) { s = null; } }   // V80: çok küçük savunan gemi göndermez
    if (!s) { try { s = buildFireScene(a, f, eo, o.from, { win: true }); } catch (e3) { s = null; } }
    return s;
  }
  function startCounter(p) {
    var c = p.cnt; p.cnt = null; if (!c) return false;
    try {
      var a = A(); clearScenes(); var f = ensureFx(), s = buildCounter(a, f, c);
      if (!s) return false;
      p.scenes = [s]; p.t0 = s.t0;
      var m = (s.focus || s.dir).clone().normalize();
      var lon = Math.atan2(-m.z, m.x) / DEG, lat = Math.asin(Math.max(-1, Math.min(1, m.y))) / DEG, zr = Math.max(camFor(a, s.base), s.zr || 0);
      a.focusLL(lon, lat, window.innerWidth > window.innerHeight ? zr / 0.7 : zr);
      return true;
    } catch (x) { try { console.error('v60 counter', x); } catch (y) { } return false; }
  }
  /* V71: FÜZE ATAR SAHNESİ — hedef çok küçükse: saldıranın kendi toprağından füze atar çıkar, hedef ülkenin İÇİNE minik füzeler yağdırır. */
  function buildMissileScene(a, f, o, tg, r) {
    var la = nearLL(a, o.from, tg), lt = llOf(a, tg); if (!la || !lt) return null;
    var T = a.THREE(), va = a.sph(la[0], la[1], 1), vt = a.sph(lt[0], lt[1], 1), P = launchPoint(a, o, va, vt, tg);
    var dt = Math.acos(Math.max(-1, Math.min(1, P.dot(vt))));
    var sc = Math.max(SC * .5, Math.min(SC * 1.6 * sizeF(o.ids), dt / 6, ownExt(a, o.ids) / 2.6));   // V91: saldıran ülkeyle orantılı   // V72: küçük ülkede de büyük/okunur sahne
    if (dt / sc > 20) sc = Math.min(SC * 2.6, dt / 20);
    var fr = frameAt(a, P, vt.clone().sub(P)), pts = spread(tinyPts(a, tg), 6);
    try { sc = fitFireScale(a, P, fr, sc, o.ids, tg, SC * .45); } catch (eF) { }   // V92: füze kamyonu / izi kendi ülke sınırını aşmasın
    var spotM = null; try { spotM = fireSpot(a, o, P, vt, sc, tg); } catch (eS) { }   /* V229: kamyon denize konmaz */
    if (!spotM) return null;
    P = spotM.P; fr = spotM.fr; sc = spotM.sc; dt = Math.acos(Math.max(-1, Math.min(1, P.dot(vt))));
    if (!pts.length) return null;
    var tos = pts.map(function (q) { return up(localOf(a, fr, sc, q), .12); }), cen = { x: 0, y: 0, z: 0 };
    tos.forEach(function (q) { cen.x += q.x / tos.length; cen.z += q.z / tos.length; });
    f.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(fr.x, P, fr.z));
    if (!f.root.parent) a.globe().add(f.root);
    f.root.scale.setScalar(sc); f.root.position.copy(P); f.root.visible = true; f.clear(); f.timeScale = TS; fitProj(a, f, tg, sc);   // V91
    var win = !!r.win;
    var d1 = f.missileAttack(fxo({ from: { x: 0, y: 0, z: -.9 }, to: cen, tos: tos, color: o.color, scale: .8, missiles: 6, dud: !win, blast: win ? 1.4 : 1, gap: .6 }));
    return { fx: f, dir: P.clone(), sea: false, ids: o.ids, base: sc, cur: sc, fixed: true, t0: f.time, dur: (d1 && d1.duration || 12) + .6, fire: true, zr: Math.min(5.8, Math.max(1.95, 1.2 + dt * 3)), focus: MIDPT ? P.clone() : P.clone().add(vt).normalize() };
  }
  /* V97: kamera uzaklığı sahne boyutuna göre — sahnenin uzunluğu dar ekran kenarının ~%55'ini kaplasın. Eskiden en az 3.0 uzaktı; modeller (~0.15 birim) birkaç piksel kalıp animasyon "çalışmıyor" gibi görünüyordu. */
  function camFor(a, base) {
    try {
      var c = a.camera(), asp = c.aspect || 1, narrow = 2 * Math.tan(c.fov * Math.PI / 360) * Math.min(1, asp);
      var d = (SCENE_LEN * base) / (0.72 * narrow);   /* V212: 0.55 -> 0.72: sahne ekranın daha büyük kısmını kaplar (birlikler/patlamalar daha yakından); savaş artık ortalandığı için kenara taşmaz */
      return Math.max(1.65, Math.min(4.2, 1 + d));   /* V212: en yakın 1.95 -> 1.65 (yüzeye uzaklık 0.95 -> 0.65): kara sahnelerinde birlikler ~1,5x büyük görünür */
    } catch (e) { return 2.4; }
  }
  function begin(args) {
    var a = A(), r = args[0], po = args[1], tg = args[3], att = args[5];
    var ids = (Array.isArray(att) ? att : []).filter(function (i) { return a.has(i); });
    if (!ids.length) return;   // V68: hedef küre verisinde olmasa da yedek sahne denenir
    var T = a.THREE(), scenes = [], tiny = false, missile = false;
    try { tiny = isTiny(a, tg); } catch (e) { tiny = false; }
    missile = tiny && Math.random() < MISSILE_P;   // V141: füze her seferinde değil
    var oList = origins(a, po, ids, tg), vl = (!r.win && PAR_COUNTER) ? [] : null;
    curV = vl;   // V166: bu sırada kurulan bizim birlikler vurulabilir olarak kaydolur
    oList.forEach(function (o, i) {
      if (missile && i > 0) return;   // V71: füze atar sahnesinde tek taraf
      var f = i === 0 ? ensureFx() : ensureFx2(), s = null;
      if (missile && i === 0) { try { s = buildMissileScene(a, f, o, tg, r); } catch (e0) { s = null; try { console.error(e0); } catch (e1) { } } }   // V71: çok küçük hedef → füze atar
      if (!s && !tiny) { try { s = buildScene(a, f, o, tg, r); } catch (e) { s = null; } }   // V141: minik hedefte füze değilse doğrudan ateş (tank/uçak) sahnesi
      if (!s && !o.land && !tiny) { try { s = buildSeaScene(a, f, o.ids, o.from, tg, o.color, RED, !!r.win, i === 0 && !r.win && PAR_COUNTER); } catch (e4) { s = null; try { console.error(e4); } catch (e5) { } } }   // V79: kara sınırı yok → gemi + torpido
      if (!s && i === 0) { try { s = buildFireScene(a, f, o, tg, r); } catch (e2) { s = null; try { console.error(e2); } catch (e3) { } } }   // V68: yerleşim bulunamadıysa saldıran topraktan hedef yönüne ateş
      if (!s && i === 0 && !tiny) { try { FORCE_SEA = true; s = buildSeaScene(a, f, o.ids, o.from, tg, o.color, RED, !!r.win, i === 0 && !r.win && PAR_COUNTER); } catch (e6) { s = null; } FORCE_SEA = false; }   /* V101: hiçbir sahne kurulamadıysa animasyon atlanmaz */
      if (s) scenes.push(s); else { try { f.clear(); f.root.visible = false; if (f.root.parent) f.root.parent.remove(f.root); } catch (e) { } }
    });
    curV = null;
    if (!scenes.length) return;
    var cnt = r.win ? null : { o: oList[0], tg: tg, land: oList[0].land, tiny: tiny };
    if (cnt && PAR_COUNTER) {   // V165: yenilgide karşı taraf AYNI ANDA yükselip bizim topraklarımıza saldırır (kurulamazsa eski sıralı V77 çalışır)
      if (scenes[0].bothSides) cnt = null;   // V166: gemi sahnesinde iki taraf zaten aynı sahnede
      else try {
        var fc = oList.length > 1 ? ensureFx3() : ensureFx2();
        HKF = vl && vl.length ? mkHooks(fc, vl) : null;   // V166: karşı mermiler bizim birliklerin üzerine nişan alır
        var sc2 = buildCounter(a, fc, cnt);
        if (sc2) { scenes.push(sc2); cnt = null; }
        else { try { fc.clear(); fc.root.visible = false; if (fc.root.parent) fc.root.parent.remove(fc.root); } catch (e7) { } }
      } catch (e8) { try { console.error('v60 counter', e8); } catch (e9) { } }
      HKF = null;
    }
    var all = [tg]; scenes.forEach(function (s) { s.ids.forEach(function (i) { if (all.indexOf(i) < 0) all.push(i); }); });
    var mid = new T.Vector3(); scenes.forEach(function (s) { mid.add(s.focus || s.dir); }); if (mid.lengthSq() < 1e-6) mid.copy(scenes[0].dir); mid.normalize();   // V71: sahne odak noktası (füze/ateş: launcher + hedef ortası)
    var th = 0; scenes.forEach(function (s, k) { if (k) th = Math.max(th, Math.acos(Math.max(-1, Math.min(1, scenes[0].dir.dot(s.dir))))); });   // V165: en uzak sahneye göre
    play = { ids: all, tg: tg, scenes: scenes, t0: scenes[0].t0, cnt: cnt };   // V77: yenilgi → karşı saldırı sırada (V165: eş zamanlı kurulduysa null)
    var lon = Math.atan2(-mid.z, mid.x) / (Math.PI / 180), lat = Math.asin(Math.max(-1, Math.min(1, mid.y))) / (Math.PI / 180);
    var zr = Math.max(camFor(a, scenes[0].base), 1 + 2.2 * th, scenes[0].zr || 0); scenes.forEach(function (s, k) { if (k) zr = Math.max(zr, camFor(a, s.base), s.zr || 0); });   // V165   // V71: kamera biraz daha uzak (en yakın 2.8)   // iki taraf: ikisini de görecek kadar uzak
    a.lift(play.ids); a.focusLL(lon, lat, window.innerWidth > window.innerHeight ? zr / 0.7 : zr);   // bir kez geniş açıya al; sonrası serbest (yatayda v30 kamerayı 0.7 ile çarpar, bu yüzden bölünür)
    document.body.appendChild(mkShield());
    try { var s0 = scenes[0]; if (window.WCSfx) WCSfx.animStart(s0.sea ? 'sea' : (s0.air ? 'air' : (s0.fire ? 'missile' : 'land'))); } catch (xs) { }   // V111: savaş sesleri
    var pl0 = play, tw = performance.now();   // V100: ilk saldırıda shader derlemesi ana iş parçacığını dondurabilir; kare hiç çizilmediyse 15 sn'ye kadar bekle
    (function chk() { if (play !== pl0) return; if (pl0.frames > 0) return; if (performance.now() - tw > 15000) { finish(); return; } setTimeout(chk, 1000); })();   // karelerin hiç ilerlemediği durumda takılmaz
  }

  /* dışa açık: hedef ülkenin üstünde atom bombası sahnesi. done() sahne bitince (veya geçilince) çağrılır. false → 3B yok (eski 2B efekt kullanılır) */
  window.v60Nuke = function (tg, done) {
    var a = A(); if (bad || !a || !a.ready() || !window.WCBattleFX || !window.WCNukeScene || play) return false;
    try {
      var T = a.THREE(), lt = WCNukeScene.center(a, tg) || llOf(a, tg); if (!lt) return false;
      clearScenes(); var f = ensureFx(), P = a.sph(lt[0], lt[1], 1).normalize();
      var fr = frameAt(a, P, new T.Vector3(0, 1, 0));
      var rad = extRad(a, tg), sc = SC;   /* V230: ülke büyüdükçe sahne büyüyünce birlikler küre eğrisinden kopuyordu */
      f.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(fr.x, P, fr.z));
      if (!f.root.parent) a.globe().add(f.root);
      f.root.scale.setScalar(sc); f.root.position.copy(P); f.root.visible = true; f.clear(); f.timeScale = 1; f.projK = 1;
      var dur = WCNukeScene.play(a, f, T, { tg: tg, fr: fr, P: P, sc: sc, rad: rad });   /* V225: v225.js */
      var s = { fx: f, dir: P.clone(), sea: false, ids: [tg], base: sc, cur: sc, fixed: true, t0: f.time, dur: dur, fire: true };
      play = { ids: [tg], tg: tg, scenes: [s], t0: s.t0, cnt: null };
      /* V225: kamera bulutun tamamını (genişlik ~10, yükseklik ~14 birim) görecek kadar uzakta (yerel genişlik ~7, yükseklik ~10) */
      var cam = a.camera(), tn = 2 * Math.tan(cam.fov * Math.PI / 360), asp = cam.aspect || 1, zr = Math.max(1.75, 1 + 1.2 * Math.max(7.4 * sc / (tn * Math.min(1, asp)), 10.5 * sc / tn));
      var lon = Math.atan2(-P.z, P.x) / DEG, lat = Math.asin(Math.max(-1, Math.min(1, P.y))) / DEG;
      a.lift(play.ids); a.focusLL(lon, Math.min(80, lat + 12), window.innerWidth > window.innerHeight ? zr / 0.7 : zr);
      document.body.appendChild(mkShield());
      try { if (window.WCSfx) WCSfx.animStart('nuke'); } catch (xs) { }
      var pl0 = play;
      (function wt() { if (play === pl0) { setTimeout(wt, 200); return; } try { f.timeScale = TS; } catch (e) { } if (done) done(); })();
      return true;
    } catch (x) { try { console.error('v60Nuke', x); } catch (y) { } try { finish(); } catch (y) { } return false; }
  };
  window.v60Load = function () { try { return loadFx(); } catch (e) { return null; } };
  window.v60Begin = function (r, po, tg, att) { loadFx().then(function () { ensureFx(); begin([r, po, null, tg, null, att]); }); };   // yalnızca test/ayar için

  /* ---------- savaş ekranına bağlantı ---------- */
  // V63: savaş paneli (zar, karşılaştırma) açıkken ve animasyon yokken küre dört karede bir çizilir; zar/yazılar akıcı kalsın
  var sk = 0;
  window.v60Skip = function () {
    try { if (typeof BSH !== 'undefined' && BSH && !play) { sk = (sk + 1) % 4; return sk !== 0; } } catch (e) { }
    sk = 0; return false;
  };
  function dropPend() { if (pend) { if (pend.t) clearTimeout(pend.t); if (pend.t2) clearTimeout(pend.t2); if (pend.mo) { try { pend.mo.disconnect(); } catch (e) { } } pend = null; } }
  function cancelAll() { dropPend(); if (play) finish(); showPanel(); }

  // Animasyonu başlat. hide=true: savaş paneli (sonuç yazısı) açık, animasyon süresince geçici gizlenir.
  function run(q, hide) {
    try {
      var a = A();
      if (pend !== q) return;
      if (bad || !a || !a.ready() || !G || G.over) { dropPend(); return; }
      loadFx().then(function () {
        try {
          if (pend !== q || play || !a.ready() || !G || G.over) return;
          dropPend(); ensureFx();
          if (hide) hidePanel();
          begin(q.args);
          if (play) fails = 0;
          if (!play) showPanel();   // sahne kurulamadıysa panel hemen geri gelsin
        } catch (x) { fails++; bad = fails >= 3; if (bad) setTimeout(function () { bad = false; fails = 0; }, 20000); try { console.error('v60', x); } catch (y) { } cancelAll(); try { if (fx) { fx.clear(); fx.root.visible = false; } } catch (y) { } }
      }, function () { dropPend(); });   // V72: dosya yüklenemediyse kalıcı kapatma yok, sonraki savaşta yeniden denenir
    } catch (x) { fails++; bad = fails >= 3; if (bad) setTimeout(function () { bad = false; fails = 0; }, 20000); dropPend(); showPanel(); }   // V141: kalıcı kapanma yok, 20 sn sonra yeniden dener
  }

  // Sonuç (zafer/yenilgi) yazısı ve "Devam" düğmesi savaş panelinde belirdiğinde zamanlayıcıyı kur
  function watch(q) {
    var fn = document.getElementById('fn'); if (!fn) { dropPend(); return; }
    function ok() { return fn.children.length > 0 && !!fn.querySelector('button'); }
    function arm() { if (pend !== q) return; q.t = setTimeout(function () { q.t = 0; run(q, true); }, 1100); }   // yazıyı görmeye zaman tanı
    if (ok()) { arm(); return; }
    q.mo = new MutationObserver(function () { if (ok()) { try { q.mo.disconnect(); } catch (e) { } q.mo = null; arm(); } });
    q.mo.observe(fn, { childList: true });
    q.t2 = setTimeout(function () { if (pend === q && !q.t && !play) { try { if (q.mo) q.mo.disconnect(); } catch (e) { } q.mo = null; arm(); } }, 20000);   // V72: sonuç yazısı algılanamazsa da animasyon atlanmaz
  }

  /* V72: animasyon ön hazırlığı — dosya + model/doku üretimi oyun açıkken boş zamanda yapılır; saldırıda donma olmaz */
  /* V215: ön hazırlıklar oyunun yoğun anlarını beklesin: yeni oyunun küre yaklaşması (intro), ana menü, savaş, animasyon.
     Eskiden küre kurulur kurulmaz başlıyordu ve tam yaklaşma sırasında ~0,6 sn'lik (4x yavaş işlemcide) donmalar yapıyordu. */
  function busy215() {
    try {
      if (!A() || !A().ready()) return true;
      if (window.v30IntroBusy && v30IntroBusy()) return true;
      if (document.body.classList.contains('wcm-on')) return true;
      if (play || (typeof BSH !== 'undefined' && BSH)) return true;
      if (window.__v30introEnd && performance.now() - window.__v30introEnd < 1200) return true;   /* yaklaşma bittikten sonra kısa bir nefes */
    } catch (e) { }
    return false;
  }
  function idle215(fn) { if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 3000 }); else setTimeout(fn, 250); }
  function warm() {
    try {
      if (bad || fx) return;
      if (busy215()) { setTimeout(warm, 1500); return; }
      loadFx().then(function () { idle215(function () { try { if (busy215()) { setTimeout(warm, 1500); return; } if (!fx && A() && A().ready()) ensureFx(); if (fx) setTimeout(function () { precompile212(fx); }, 800); } catch (e) { } }); }, function () { });
    } catch (e) { }
  }
  /* V212: SHADER ÖN DERLEMESİ. Savaş animasyonunun ilk karesinde tank/asker/gemi/patlama malzemelerinin shader'ları derleniyordu
     (ölçüm: ilk sahnede gl.render ~270-400 ms donma). Boşta her modelden ve her efektten birer örnek görünmeden sahneye konup derlenir;
     örnekler sahneden çıkarılır ama malzemeleri SİLİNMEZ (silinirse derlenen program da atılır). Oyun/animasyon akışı değişmez. */
  var pre212 = false;
  /* V215: modeller/efektler artık TEK SEFERDE değil, her boşta (requestIdleCallback) bir tane kurulur; oyun yoğunsa (busy215) beklenir.
     Hepsi hazır olunca derleme (compileAsync) yapılır. Savaş başlarsa yarıda kalır, sonra kaldığı yerden sürer. */
  function precompile212(f) {
    if (pre212 || !f) return; var a = A(); if (!a || !a.ready()) return; pre212 = true;
    var T = a.THREE(), p = new T.Vector3(0, 0, 0), M = window.WCBattleFX && window.WCBattleFX.models, built = [];
    var jobs = [function () { f.explosion(p, 1); }, function () { f.debris(p, 1); }, function () { f.dust(p, 1, 4); }, function () { f.deploy(p, 1, 0x3b82f6, 2); },
      function () { f.muzzle(p, new T.Vector3(1, 0, 0), 1, true); }, function () { f.splash(p, 1); }, function () { f.waterBlast(p, 1); }, function () { f.blob(p, 1); }];
    if (M) Object.keys(M).forEach(function (k) { jobs.push(function () { var o = M[k](0x3b82f6); if (o && o.isObject3D) built.push(o); }); });
    var fxObjs = [], wasVis0 = f.root.visible;
    (function step(dl) {
      if (busy215()) { setTimeout(function () { idle215(step); }, 1200); return; }
      var t0 = performance.now();
      while (jobs.length && (performance.now() - t0 < 6) && (!dl || !dl.timeRemaining || dl.timeRemaining() > 3)) {
        var j = jobs.shift(), before = new Set(f.objs || []);
        try { j(); } catch (e) { }
        try { (f.objs || []).forEach(function (o) { if (!before.has(o)) { fxObjs.push(o); f.objs.delete(o); if (o.parent) o.parent.remove(o); } }); } catch (e) { }   /* efekt nesneleri sahnede/listede bekletilmez */
        f.root.visible = wasVis0;
      }
      if (jobs.length) { idle215(step); return; }
      try { f.clear(); } catch (e) { }
      compileAll(a, f, built.concat(fxObjs));
    })();
  }
  function compileAll(a, f, objs) {
    if (busy215()) { setTimeout(function () { idle215(function () { compileAll(a, f, objs); }); }, 1200); return; }
    var keep = window.__v212keep = [], wasVis = f.root.visible;
    try {
      var r = a.renderer(), cam = a.camera(), scn = a.globe(); while (scn.parent) scn = scn.parent;
      f.root.visible = true; objs.forEach(function (o) { f.root.add(o); keep.push(o); });
      /* V218: derleme süresince (telefonda ~1 sn) modeller/efektler ekranda görünmesin: kamera görüşünün çok dışına, küçültülmüş. Gölgelendirici derlemesi konumdan bağımsızdır. */
      objs.forEach(function (o) { try { o.position.set(0, -5000, 0); o.scale.setScalar(1e-4); o.frustumCulled = true; } catch (e) { } });
      var mine = [];
      var done = function () {
        try {
          mine.forEach(function (o) { f.root.remove(o); if (f.objs) f.objs.delete(o); keep.push(o); });   /* dispose edilmeden çıkarılır */
          keep.forEach(function (o) { if (o.parent) o.parent.remove(o); });
          if (!play) { f.clear(); f.root.visible = wasVis; }
        } catch (e) { }
      };
      var pr = r.compileAsync ? r.compileAsync(scn, cam) : (r.compile(scn, cam), null);
      if (pr && pr.then) pr.then(done, done); else done();
    } catch (e) { try { f.clear(); f.root.visible = wasVis; } catch (x) { } }
  }
  setTimeout(function w() { (window.requestIdleCallback ? requestIdleCallback(warm, { timeout: 3000 }) : warm()); }, 2500);   // V100: ön hazırlık daha erken

  var _sb = showBattle;
  showBattle = function (r, p, e, tg, mv, att) {
    var res = _sb.apply(this, arguments);   // eski savaş ekranı HER ZAMAN önce ve aynen çalışır
    try {
      cancelAll();
      var a = A();
      if (!bad && a && a.ready() && G && !(typeof SET !== 'undefined' && SET && (SET.rm || !SET.spd))) {
        var q = pend = { args: [r, p, e, tg, mv, att], t: 0, mo: null };
        loadFx().then(null, function () { if (pend === q) dropPend(); });   // dosyayı önceden yükle
        watch(q);
      }
    } catch (x) { dropPend(); }
    return res;
  };

  // Oyuncu animasyon başlamadan "Devam/Haritaya Dön"e bastıysa: panel kapandıktan sonra yine oynat. Animasyon sürüyorsa sonlandır.
  var _cb = closeBattle;
  closeBattle = function () {
    var q = pend;
    if (q) { if (q.t) { clearTimeout(q.t); q.t = 0; } if (q.mo) { try { q.mo.disconnect(); } catch (e) { } q.mo = null; } }
    try { if (play) finish(); else showPanel(); } catch (e) { }   // hata çıksa bile iç closeBattle çalışsın (BSH / bsh sınıfı takılı kalmasın)
    var res = _cb.apply(this, arguments);
    if (q && pend === q) setTimeout(function () { run(q, false); }, 450);   // harita/kamera savaş sonrası düzenini bitirsin
    return res;
  };
})();
