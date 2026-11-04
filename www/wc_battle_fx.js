/*! WC Battle FX v5 — World Conquest savaş animasyonları
 *  Prosedürel (kodla üretilen) low‑poly 3B modeller + partikül efektleri. Three.js r160 ile uyumlu.
 *  v5: yeniden çizilen modeller (tank, piyade, gemi, kule, ev): kamuflaj/taş dokusu, sahte ortam gölgesi, gerçek tekne gövdesi,
 *      parçalar malzemeye göre birleştirilir (çizim çağrısı ~aynı). Kule 3 katlı çöker. Gemi bacası duman çıkarır. WCBattleFX.models ile dışarı açılır.
 *  v2: dokulu duman/ateş, dönen partiküller, şok dalgası, tank sürüş+geri tepme, piyade koşusu, gemi izi/batış.
 *  API v1 ile aynı (yeni isteğe bağlı: tankAttack/infantryAttack {advance}).
 *  OYUNA BAĞLI DEĞİL: tek başına çalışır. Oyuna bağlarken yalnızca bu dosya + three.min.js yeterli.
 *
 *  KULLANIM
 *    const fx = new WCBattleFX(THREE, scene, { renderer, camera, onShake: a => {...} });
 *    döngüde:  fx.update(dt);
 *    fx.tankAttack({ from:{x,y,z}, to:{x,y,z}, color:0x3b82f6, target:obj3d })
 *    fx.infantryAttack({ from, to, color, count:4, target })
 *    fx.navalAttack({ from, to, color, targetColor })        // gemi + torpido, hedef gemi batar
 *    fx.missileAttack({ from, to, tos:[{x,y,z}..], color, missiles:6 })   // v6: füze atar kamyonu + minik füzeler (tos = isabet noktaları)
 *    fx.planeAttack({ from, to, tos:[{x,y,z}..], color, planes:2, bombs:2 })   // v7: savaş uçakları + bombalar (hava saldırısı)
 *    fx.clear();  fx.timeScale = 0.35;  // yavaş çekim
 *
 *  Tüm koordinatlar fx.root grubunun YEREL uzayındadır (Y = yukarı, deniz seviyesi y=0).
 *  Küreye yerleştirmek için: fx.placeOnSurface(noktaVec3, normalVec3, ölçek)
 */
(function (G) {
  'use strict';
  let T = null;

  /* ---------------------------------------------------------------- yardımcılar */
  const rgb = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const E = {
    out: t => 1 - Math.pow(1 - t, 3),
    io: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  const V = v => (v && v.isVector3 ? v.clone() : new T.Vector3(v.x || 0, v.y || 0, v.z || 0));
  const yawBetween = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const wrapPi = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const ZAX = () => new T.Vector3(0, 0, 1);

  function std(color, o) {
    return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: .7, metalness: .15, flatShading: true }, o || {}));
  }
  function bx(w, h, d, mat, x, y, z) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x || 0, y || 0, z || 0); return m; }
  function cy(rt, rb, h, seg, mat, x, y, z) { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x || 0, y || 0, z || 0); return m; }

  function disposeObj(o) {
    o.traverse(c => {
      if (c.isInstancedMesh) c.dispose();
      if (c.geometry && !(c.geometry.userData && c.geometry.userData.keep)) c.geometry.dispose();
      if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => { if (!(m.userData && m.userData.keep)) m.dispose(); });
    });
  }

  const FXLOW = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);   /* V178: telefonda parçacık yükü azaltılır */
  const emitCount = (perSec, dt) => { const x = perSec * (FXLOW ? .6 : 1) * dt; let n = Math.floor(x); if (Math.random() < x - n) n++; return n; };
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function softTex() {
    const c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.65)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  }
  function gradTex() {
    const c = mkCanvas(4, 64), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
    x.fillStyle = g; x.fillRect(0, 0, 4, 64);
    return new T.CanvasTexture(c);
  }
  // bulut/duman dokusu: üst üste binen yumuşak lekeler (düz daire yerine kabarık görünüm)
  function smokeTex() {
    const S = 128, c = mkCanvas(S, S), x = c.getContext('2d');
    let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 16; i++) {
      const a = r() * 6.283, d = r() * 26, px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d, rad = 18 + r() * 22;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(.6, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, S, S);
    }
    x.globalCompositeOperation = 'destination-in';
    const m = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(.55, 'rgba(0,0,0,.9)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = m; x.fillRect(0, 0, S, S);
    return new T.CanvasTexture(c);
  }
  function ringTex() {
    const S = 128, c = mkCanvas(S, S), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.68, 'rgba(255,255,255,0)'); g.addColorStop(.86, 'rgba(255,255,255,.95)');
    g.addColorStop(.95, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return new T.CanvasTexture(c);
  }

  /* ---------------------------------------------------------------- partikül sistemi (tek draw call, dönen sprite'lar) */
  class Particles {
    constructor(max, additive, tex) {
      this.max = max; this.ps = [];
      const g = new T.BufferGeometry();
      this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.alp = new Float32Array(max); this.siz = new Float32Array(max); this.rot = new Float32Array(max);
      g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('pcolor', new T.BufferAttribute(this.col, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('alpha', new T.BufferAttribute(this.alp, 1).setUsage(T.DynamicDrawUsage));
      g.setAttribute('size', new T.BufferAttribute(this.siz, 1).setUsage(T.DynamicDrawUsage));
      g.setAttribute('rot', new T.BufferAttribute(this.rot, 1).setUsage(T.DynamicDrawUsage));
      g.setDrawRange(0, 0);
      this.geo = g;
      this.mat = new T.ShaderMaterial({
        uniforms: { map: { value: tex }, uScale: { value: 600 } },
        vertexShader: 'attribute vec3 pcolor;attribute float alpha;attribute float size;attribute float rot;uniform float uScale;varying vec3 vC;varying float vA;varying float vR;' +
          'void main(){vC=pcolor;vA=alpha;vR=rot;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(size*uScale/-mv.z,1.0,' + (FXLOW ? '150.0' : '256.0') + ');gl_Position=projectionMatrix*mv;}',
        fragmentShader: 'uniform sampler2D map;varying vec3 vC;varying float vA;varying float vR;' +
          'void main(){vec2 p=gl_PointCoord-.5;float s=sin(vR),c=cos(vR);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+.5;vec4 t=texture2D(map,p);gl_FragColor=vec4(vC,t.a*vA);}',
        transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending
      });
      this.points = new T.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = additive ? 12 : 11;
    }
    emit(o) {
      if (this.ps.length >= this.max) return;
      this.ps.push({
        x: o.x || 0, y: o.y || 0, z: o.z || 0, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
        l: 0, m: o.life || 1, s0: o.s0 || .3, s1: o.s1 == null ? (o.s0 || .3) : o.s1,
        c0: o.c0 || [1, 1, 1], c1: o.c1 || o.c0 || [1, 1, 1], a0: o.a0 == null ? 1 : o.a0, a1: o.a1 == null ? 0 : o.a1,
        gy: o.gy || 0, dr: o.drag || 0, r: o.rot == null ? Math.random() * 6.283 : o.rot, w: o.spin == null ? rnd(-.8, .8) : o.spin
      });
    }
    update(dt) {
      const ps = this.ps, pos = this.pos, col = this.col, alp = this.alp, siz = this.siz, rot = this.rot;
      let i = 0;
      while (i < ps.length) {
        const p = ps[i]; p.l += dt;
        if (p.l >= p.m) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
        const dr = Math.max(0, 1 - p.dr * dt);
        p.vy += p.gy * dt; p.vx *= dr; p.vy *= dr; p.vz *= dr; p.r += p.w * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const k = p.l / p.m, j = i * 3, ke = 1 - (1 - k) * (1 - k);
        pos[j] = p.x; pos[j + 1] = p.y; pos[j + 2] = p.z;
        col[j] = lerp(p.c0[0], p.c1[0], k); col[j + 1] = lerp(p.c0[1], p.c1[1], k); col[j + 2] = lerp(p.c0[2], p.c1[2], k);
        alp[i] = lerp(p.a0, p.a1, k) * Math.min(1, k * 10); siz[i] = lerp(p.s0, p.s1, ke); rot[i] = p.r;
        i++;
      }
      this.geo.setDrawRange(0, ps.length);
      const a = this.geo.attributes; a.position.needsUpdate = a.pcolor.needsUpdate = a.alpha.needsUpdate = a.size.needsUpdate = a.rot.needsUpdate = true;
    }
    reset() { this.ps.length = 0; this.geo.setDrawRange(0, 0); }
  }

  /* ---------------------------------------------------------------- v5 model altyapısı: dokular, yüz‑renkli geometri, birleştirme */
  const texCache = {};
  const seedRand = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  function srgbTex(cv, rep) {
    const t = new T.CanvasTexture(cv); if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); return t;
  }
  // kamuflaj: takım renginin tonundan türeyen 3 tonlu leke deseni (tek renk "plastik" görünümü kırar)
  function camoTex(color) {
    const key = 'camo' + color; if (texCache[key]) return texCache[key];
    const hsl = {}; new T.Color(color).getHSL(hsl);
    const mk = l => '#' + new T.Color().setHSL(hsl.h, Math.min(.34, hsl.s * .4), l).getHexString();
    const S = 128, cv = mkCanvas(S, S), x = cv.getContext('2d'), r = seedRand(11 + (color % 89));
    x.fillStyle = mk(.34); x.fillRect(0, 0, S, S);
    const blob = (col, n, a, b) => {
      x.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const cx = r() * S, cy = r() * S, rad = a + r() * (b - a);
        x.beginPath();
        for (let j = 0; j < 8; j++) { const an = j / 8 * 6.283, rr = rad * (.55 + r() * .6), px = cx + Math.cos(an) * rr, py = cy + Math.sin(an) * rr * .7; if (j) x.lineTo(px, py); else x.moveTo(px, py); }
        x.closePath(); x.fill();
      }
    };
    blob(mk(.21), 9, 14, 30); blob(mk(.45), 8, 10, 24); blob(mk(.13), 6, 5, 11);
    for (let i = 0; i < 260; i++) { x.fillStyle = r() < .5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.05)'; x.fillRect(r() * S, r() * S, 2, 2); }
    return (texCache[key] = srgbTex(cv));
  }
  // taş duvar: kaydırmalı tuğla sıraları + harç
  function stoneTex() {
    if (texCache.stone) return texCache.stone;
    const S = 128, cv = mkCanvas(S, S), x = cv.getContext('2d'), r = seedRand(5);
    x.fillStyle = '#4a463f'; x.fillRect(0, 0, S, S);
    const rows = 8, rh = S / rows, bw = 32;
    for (let j = 0; j < rows; j++) {
      const off = j % 2 ? bw / 2 : 0;
      for (let i = -1; i < S / bw + 1; i++) {
        const l = 56 + Math.floor(r() * 20), h = 36 + Math.floor(r() * 12);
        x.fillStyle = 'hsl(' + h + ',9%,' + l + '%)'; x.fillRect(i * bw + off + 1.5, j * rh + 1.5, bw - 3, rh - 3);
        x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(i * bw + off + 1.5, j * rh + 1.5, bw - 3, 2);
      }
    }
    for (let i = 0; i < 300; i++) { x.fillStyle = r() < .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.05)'; x.fillRect(r() * S, r() * S, 2, 2); }
    return (texCache.stone = srgbTex(cv, [3, 1.2]));
  }

  // köşe rengi kullanan malzeme (her geometride 'color' özniteliği olmak ZORUNDA: paint()/MB bunu sağlar). Çift yüz: sarım yönü hatalarına karşı güvenli.
  function stdv(color, o) { return std(color, Object.assign({ vertexColors: true, side: T.DoubleSide }, o || {})); }
  const lc = (hex, k) => { const c = new T.Color(hex); k = k == null ? 1 : k; return [c.r * k, c.g * k, c.b * k]; };
  // dikey renk geçişi = sahte ortam gölgesi (altı koyu, üstü açık); düz kutuları "plastik" olmaktan çıkarır
  function paint(geo, bot) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox, p = geo.attributes.position, c = new Float32Array(p.count * 3), h = Math.max(1e-4, bb.max.y - bb.min.y), b = bot == null ? .66 : bot;
    for (let i = 0; i < p.count; i++) { const k = b + (1 - b) * (p.getY(i) - bb.min.y) / h; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
    geo.setAttribute('color', new T.BufferAttribute(c, 3)); return geo;
  }
  function mk3(geo, mat, x, y, z) { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; }
  const bxv = (w, h, d, mat, x, y, z, bot) => mk3(paint(new T.BoxGeometry(w, h, d), bot), mat, x, y, z);
  const cyv = (rt, rb, h, seg, mat, x, y, z, bot) => mk3(paint(new T.CylinderGeometry(rt, rb, h, seg), bot), mat, x, y, z);
  const spv = (r, ws, hs, mat, x, y, z, bot) => mk3(paint(new T.SphereGeometry(r, ws, hs), bot), mat, x, y, z);
  const cov = (r, h, seg, mat, x, y, z, bot) => mk3(paint(new T.ConeGeometry(r, h, seg), bot), mat, x, y, z);
  const hemi = (r, seg, mat, x, y, z, bot) => mk3(paint(new T.SphereGeometry(r, seg, Math.max(3, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2), bot), mat, x, y, z);

  // yüz başına renkli üçgen/dörtgen biriktirici (gövde, taret, tekne gibi çok yüzlü parçalar için)
  class MB {
    constructor() { this.p = []; this.c = []; this.u = []; }
    tri(a, b, c, col) {
      const vs = [a, b, c];
      for (let i = 0; i < 3; i++) { const v = vs[i]; this.p.push(v[0], v[1], v[2]); this.c.push(col[0], col[1], col[2]); this.u.push((v[0] + v[2]) * .9, v[1] * .9 + v[0] * .25); }
    }
    quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
    build() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(this.u, 2));
      g.computeVertexNormals(); return g;
    }
  }
  // yan profilden (z,y) X ekseni boyunca ekstrüde edilen DIŞBÜKEY gövde; üst yüzler açık, alt yüzler koyu
  function prism(prof, hw, mat, o) {
    o = o || {};
    const up = o.up == null ? 1 : o.up, dn = o.dn == null ? .55 : o.dn, sd = o.sd == null ? .8 : o.sd, n = prof.length, mb = new MB();
    let ar = 0; for (let i = 0; i < n; i++) { const a = prof[i], b = prof[(i + 1) % n]; ar += a[0] * b[1] - b[0] * a[1]; }
    const P = ar < 0 ? prof.slice().reverse() : prof;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy) || 1, ny = -dz / len;
      const k = ny > .6 ? up : ny < -.6 ? dn : sd + .2 * ny;
      mb.quad([-hw, a[1], a[0]], [hw, a[1], a[0]], [hw, b[1], b[0]], [-hw, b[1], b[0]], [k, k, k]);
    }
    for (let i = 1; i < n - 1; i++) {
      mb.tri([hw, P[0][1], P[0][0]], [hw, P[i][1], P[i][0]], [hw, P[i + 1][1], P[i + 1][0]], [sd, sd, sd]);
      mb.tri([-hw, P[0][1], P[0][0]], [-hw, P[i][1], P[i][0]], [-hw, P[i + 1][1], P[i + 1][0]], [sd, sd, sd]);
    }
    return new T.Mesh(mb.build(), mat);
  }
  // bir grubun DOĞRUDAN çocuk mesh'lerini malzemeye göre tek mesh'e birleştirir (çizim çağrısı sayısını düşürür). Hareketli alt gruplara dokunmaz.
  function bake(grp) {
    try {
      const by = new Map(), gone = [];
      grp.children.forEach(ch => {
        if (!ch.isMesh || ch.isInstancedMesh || ch.userData.nobake || !ch.material || Array.isArray(ch.material) || !ch.geometry.attributes.color) return;
        ch.updateMatrix();
        const g = ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone();
        g.applyMatrix4(ch.matrix);
        let e = by.get(ch.material); if (!e) by.set(ch.material, e = []);
        e.push(g); gone.push(ch);
      });
      by.forEach((list, mat) => {
        let n = 0; list.forEach(g => { n += g.attributes.position.count; });
        const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), Cc = new Float32Array(n * 3); let o = 0;
        list.forEach(g => { const a = g.attributes; P.set(a.position.array, o * 3); N.set(a.normal.array, o * 3); U.set(a.uv.array, o * 2); Cc.set(a.color.array, o * 3); o += a.position.count; g.dispose(); });
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3)); geo.setAttribute('uv', new T.BufferAttribute(U, 2)); geo.setAttribute('color', new T.BufferAttribute(Cc, 3));
        grp.add(new T.Mesh(geo, mat));
      });
      gone.forEach(ch => { grp.remove(ch); ch.geometry.dispose(); });
    } catch (e) { /* birleştirme olmazsa parçalar dağınık kalır; görüntü aynı */ }
  }
  const isAttached = o => { while (o.parent) o = o.parent; return !!o.isScene; };

  /* ---------------------------------------------------------------- 3B modeller (hepsi +Z'ye bakar) */
  function buildTank(color) {
    const g = new T.Group();
    const cm = { map: camoTex(color), roughness: .85, metalness: .1 }, camo = stdv(0xffffff, cm), camo2 = stdv(0xc4c4c4, cm);
    const dark = stdv(0x1a2138, { roughness: .9 }), metal = stdv(0x8b97b8, { metalness: .5, roughness: .4 }), rub = stdv(0x1c2029, { roughness: .95, metalness: 0 });
    const team = stdv(color, { roughness: .45, emissive: color, emissiveIntensity: .18 }), era = stdv(0x2b3140, { roughness: .8, metalness: .3 });
    const glass = stdv(0xaee8ff, { emissive: 0x58c8ff, emissiveIntensity: .5, roughness: .2 }), lamp = stdv(0xfff2c0, { emissive: 0xffe9a0, emissiveIntensity: .9 }), tail = stdv(0xff3a2a, { emissive: 0xff2010, emissiveIntensity: .8 });
    // palet: tek draw call'lu InstancedMesh, yol boyunca akan paletler (v4 ile aynı)
    const NL = 30, SL = .95, R = .21, CYY = .27, A = 2 * SL, AR = Math.PI * R, P = 2 * A + 2 * AR;
    const linkMat = std(0x2a3148, { roughness: .8, metalness: .3 }), dm = new T.Object3D(), tmp = [0, 0, 0], trackM = [], wheels = [];
    const pose = (t, o) => {
      t = ((t % P) + P) % P; let y, z, ty, tz;
      if (t < A) { y = CYY + R; z = -SL + t; ty = 0; tz = 1; }
      else if (t < A + AR) { const f = (t - A) / R; z = SL + R * Math.sin(f); y = CYY + R * Math.cos(f); tz = Math.cos(f); ty = -Math.sin(f); }
      else if (t < 2 * A + AR) { z = SL - (t - A - AR); y = CYY - R; ty = 0; tz = -1; }
      else { const f = (t - 2 * A - AR) / R; z = -SL - R * Math.sin(f); y = CYY - R * Math.cos(f); tz = -Math.cos(f); ty = Math.sin(f); }
      o[0] = y; o[1] = z; o[2] = Math.atan2(-ty, tz);
    };
    // tekerlek: lastik + hub + cıvatalar (+ dişli çarkı). Grup X ekseninde döner, parçalar kendi içinde birleştirilir.
    const mkWheel = (x, y, z, r, w, sprocket) => {
      const wg = new T.Group(); wg.position.set(x, y, z);
      const tire = cyv(r, r, w, 12, rub, 0, 0, 0); tire.rotation.z = Math.PI / 2; wg.add(tire);
      const hub = cyv(r * .6, r * .6, w + .05, 10, metal, 0, 0, 0); hub.rotation.z = Math.PI / 2; wg.add(hub);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, bolt = cyv(r * .1, r * .1, .03, 5, dark, Math.sign(x) * (w / 2 + .03), Math.cos(a) * r * .42, Math.sin(a) * r * .42); bolt.rotation.z = Math.PI / 2; wg.add(bolt); }
      if (sprocket) for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, th = bxv(w * .8, r * .34, r * .3, metal, 0, Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02); th.rotation.x = a; wg.add(th); }
      bake(wg); wheels.push(wg); g.add(wg); return wg;
    };
    for (const s of [-1, 1]) {
      mkWheel(s * .8, CYY, -SL, .2, .3, true); mkWheel(s * .8, CYY, SL, .2, .3, false);
      for (const z of [-.62, -.31, 0, .31, .62]) mkWheel(s * .8, .22, z, .16, .28, false);
      g.add(bxv(.26, .3, 2.0, dark, s * .8, .27, 0));
      g.add(bxv(.46, .045, 2.0, camo2, s * .8, .545, -.05));                                   // çamurluk
      const fr = bxv(.46, .04, .36, camo2, s * .8, .52, 1.14); fr.rotation.x = -.32; g.add(fr); // ön çamurluk (yukarı kıvrık)
      for (const z of [-.78, -.39, 0, .39, .78]) g.add(bxv(.045, .17, .35, camo, s * 1.0, .45, z)); // yan zırh etekliği
      g.add(bxv(.05, .03, 2.0, team, s * 1.0, .545, 0));                                       // takım şeridi
      const tc = cyv(.014, .014, 1.05, 5, dark, s * .42, .72, .05); tc.rotation.x = Math.PI / 2; g.add(tc); // çeki halatı
      const ex = cyv(.045, .05, .16, 6, dark, s * .38, .76, -.92); g.add(ex);
      g.add(bxv(.07, .05, .03, tail, s * .45, .6, -1.14));
      const im = new T.InstancedMesh(new T.BoxGeometry(.34, .05, .13), linkMat, NL); im.frustumCulled = false; im.instanceMatrix.setUsage(T.DynamicDrawUsage);
      g.add(im); trackM.push({ im: im, x: s * .8 });
    }
    const setTrack = off => {
      trackM.forEach(tm => { for (let i = 0; i < NL; i++) { pose(i * P / NL + off, tmp); dm.position.set(tm.x, tmp[0], tmp[1]); dm.rotation.set(tmp[2], 0, 0); dm.updateMatrix(); tm.im.setMatrixAt(i, dm.matrix); } tm.im.instanceMatrix.needsUpdate = true; });
    };
    setTrack(0);
    // gövde: eğimli ön zırh, motor güvertesi
    g.add(prism([[-1.12, .3], [1.05, .3], [1.28, .46], [.95, .7], [-.98, .7], [-1.14, .58]], .56, camo));
    g.add(bxv(.72, .025, .5, dark, 0, .705, -.62));
    for (let i = 0; i < 4; i++) g.add(bxv(.72, .012, .03, metal, 0, .722, -.48 - i * .11));  // motor panjurları
    g.add(bxv(.09, .06, .06, lamp, -.46, .625, 1.07), bxv(.09, .06, .06, lamp, .46, .625, 1.07)); // farlar
    g.add(cyv(.11, .11, .03, 10, dark, -.26, .715, .5), bxv(.1, .04, .05, glass, -.26, .74, .6)); // sürücü kapağı + periskop
    const exh = new T.Object3D(); exh.position.set(.38, .86, -.92); g.add(exh);
    // taret
    const turret = new T.Group(); turret.position.set(0, .72, -.1); g.add(turret);
    turret.add(cyv(.52, .56, .06, 14, dark, 0, .03, 0));
    turret.add(prism([[-.6, .04], [.42, .04], [.58, .15], [.52, .3], [.1, .37], [-.52, .35], [-.64, .22]], .43, camo));
    turret.add(bxv(.76, .26, .34, camo2, 0, .2, -.62));                                      // arka bölme
    const tarp = cyv(.07, .07, .52, 8, camo, 0, .4, -.8); tarp.rotation.z = Math.PI / 2; turret.add(tarp);
    for (const s of [-1, 1]) {
      turret.add(bxv(.1, .22, .36, era, s * .47, .18, .28));                                 // reaktif zırh blokları
      turret.add(bxv(.012, .15, .34, team, s * .438, .2, -.2));                              // takım plakası
      for (let k = 0; k < 3; k++) { const sm = cyv(.022, .022, .11, 6, dark, s * .46, .32, -.38 + k * .1); sm.rotation.z = -s * .55; turret.add(sm); } // sis atıcılar
    }
    turret.add(cyv(.14, .15, .08, 10, camo2, -.2, .4, -.24), cyv(.115, .115, .03, 10, dark, -.2, .45, -.24)); // komutan kupolu
    turret.add(bxv(.05, .05, .15, dark, -.2, .49, -.17));
    const mgb = cyv(.01, .01, .24, 5, dark, -.2, .495, -.04); mgb.rotation.x = Math.PI / 2; turret.add(mgb);
    turret.add(cyv(.12, .12, .03, 10, dark, .2, .385, -.3));                                  // nişancı kapağı
    turret.add(bxv(.14, .12, .14, era, .2, .43, .1), bxv(.1, .05, .012, glass, .2, .44, .177)); // termal görüş
    turret.add(cyv(.045, .055, .05, 6, dark, -.3, .39, -.5));                                 // anten tabanı
    turret.add(bxv(.54, .26, .22, camo2, 0, .21, .5));                                        // top maskesi
    const pivot = new T.Group(); pivot.position.set(0, .22, .6); turret.add(pivot);
    const gb = (r1, r2, len, z, mat) => { const m = cyv(r1, r2, len, 10, mat, 0, 0, z); m.rotation.x = Math.PI / 2; pivot.add(m); return m; };
    gb(.1, .1, .36, .18, camo2); gb(.062, .07, 1.35, .8, metal); gb(.085, .085, .7, .62, dark); gb(.08, .08, .18, 1.1, metal); gb(.078, .078, .13, 1.55, dark); gb(.088, .088, .03, 1.6, dark);
    const tip = new T.Object3D(); tip.position.set(0, 0, 1.72); pivot.add(tip);
    const ant = new T.Group(); ant.position.set(-.3, .4, -.5); turret.add(ant);
    ant.add(cyv(.012, .006, 1.0, 4, dark, 0, .5, 0), bxv(.22, .13, .012, team, .11, .92, 0));
    bake(g); bake(turret); bake(pivot); bake(ant);
    return { group: g, turret, pivot, pivotZ: .6, turretY: .72, tip, wheels, ant, setTrack, exh };
  }

  function buildSoldier(color, v) {
    v = v || 0;
    const g = new T.Group();
    const uni = stdv(0xffffff, { map: camoTex(color), roughness: .9, metalness: 0 });
    const tint = (c, k) => new T.Color(color).lerp(new T.Color(c), k).getHex();
    const vest = stdv(tint(0x151a26, .72), { roughness: .9 }), helm = stdv(tint(0x1d2230, .62 + (v % 3) * .05), { roughness: .8 }), pack = stdv(tint(0x2a2a22, .75), { roughness: .95 });
    const skin = stdv(0xd9b08c, { roughness: .9, metalness: 0 }), boot = stdv(0x1b1f2b, { roughness: .9 }), dark = stdv(0x161b2e, { roughness: .9 }), gun = stdv(0x262b38, { roughness: .5, metalness: .5 }), glove = stdv(0x2a2d36, { roughness: .9 });
    const team = stdv(color, { roughness: .5, emissive: color, emissiveIntensity: .2 }), glass = stdv(0x9fe8ff, { emissive: 0x58c8ff, emissiveIntensity: .45, roughness: .2 });
    // bacak: kalça + diz eklemi (dizler gerçekten bükülür); cep, diz koruması, bot
    const mkLeg = x => {
      const hip = new T.Group(); hip.position.set(x, .46, 0);
      hip.add(bxv(.15, .27, .18, uni, 0, -.135, 0), bxv(.05, .1, .1, vest, Math.sign(x) * .095, -.1, 0));
      const knee = new T.Group(); knee.position.set(0, -.26, 0);
      knee.add(bxv(.13, .2, .16, uni, 0, -.1, 0), bxv(.14, .075, .07, dark, 0, -.01, .09), bxv(.14, .12, .24, boot, 0, -.16, .03), bxv(.15, .03, .27, dark, 0, -.21, .035));
      hip.add(knee); hip.userData.knee = knee; bake(hip); bake(knee); return hip;
    };
    const legs = new T.Group(), legL = mkLeg(-.1), legR = mkLeg(.1); legs.add(legL, legR); g.add(legs);
    const up = new T.Group(); up.position.set(0, .46, 0); g.add(up); // gövde pivotu = kalça
    up.add(bxv(.34, .14, .21, uni, 0, .07, 0), bxv(.4, .3, .24, uni, 0, .3, 0));                    // bel + gövde
    up.add(bxv(.42, .27, .27, vest, 0, .31, .005), bxv(.37, .04, .22, dark, 0, .04, 0));            // zırhlı yelek + kemer
    for (const px of [-.1, 0, .1]) up.add(bxv(.075, .1, .05, dark, px, .24, .15));                   // şarjör keseleri
    up.add(bxv(.07, .08, .04, gun, -.12, .4, .15));                                                  // telsiz
    for (const s of [-1, 1]) up.add(bxv(.12, .05, .2, vest, s * .2, .47, 0), bxv(.07, .09, .08, dark, s * .2, .04, .04), bxv(.06, .12, .1, pack, s * .17, .2, -.2)); // omuz, kalça kesesi, sırt çantası cebi
    up.add(bxv(.3, .34, .15, pack, 0, .28, -.2));                                                    // sırt çantası
    const roll = cyv(.06, .06, .32, 8, pack, 0, .5, -.2); roll.rotation.z = Math.PI / 2; up.add(roll); // battaniye rulosu
    up.add(cyv(.06, .065, .1, 6, skin, 0, .5, 0));                                                   // boyun
    if (v === 0) up.add(cyv(.007, .007, .55, 4, dark, .1, .62, -.22), bxv(.1, .07, .01, team, .15, .85, -.22)); // lider: telsiz anteni + flama
    const head = new T.Group(); head.position.set(0, .62, 0); up.add(head);
    head.add(spv(.115, 8, 6, skin, 0, 0, 0));
    head.add(hemi(.16, 10, helm, 0, .02, 0), cyv(.165, .17, .03, 10, dark, 0, .02, 0), cyv(.162, .164, .04, 10, team, 0, .06, 0)); // kask, kenar, takım bandı
    head.add(bxv(.2, .05, .04, dark, 0, .075, .155), bxv(.17, .03, .01, glass, 0, .075, .175));    // gözlük
    const mkArm = (x, yaw, pitch, band) => {
      const a = new T.Group(); a.position.set(x, .46, 0);
      a.add(spv(.065, 6, 5, uni, 0, 0, 0), bxv(.1, .2, .1, uni, 0, -.1, 0), bxv(.09, .18, .09, uni, 0, -.29, 0), bxv(.075, .075, .09, glove, 0, -.41, 0), bxv(.11, .05, .11, dark, 0, -.2, 0));
      if (band) a.add(bxv(.108, .04, .108, team, 0, -.06, 0));
      a.rotation.set(pitch, yaw, 0); bake(a); up.add(a); return a;
    };
    const aR = mkArm(-.27, .28, -1.35, v === 0), aL = mkArm(.27, -.5, -1.45, true);
    // tüfek: gövde, el koruması, namlu, susturucu/ağızlık, dipçik, şarjör, nişangâh, kızak
    const rifle = new T.Group(); rifle.position.set(0, .4, .32); up.add(rifle);
    rifle.add(bxv(.07, .1, .3, gun, 0, 0, .02), bxv(.06, .07, .24, dark, 0, -.01, .27), bxv(.05, .09, .2, dark, 0, -.025, -.22), bxv(.052, .1, .03, gun, 0, -.02, -.33));
    const brl = cyv(.012, .012, .3, 6, gun, 0, .01, .54); brl.rotation.x = Math.PI / 2; rifle.add(brl);
    const mzb = cyv(.02, .02, .06, 6, dark, 0, .01, .7); mzb.rotation.x = Math.PI / 2; rifle.add(mzb);
    rifle.add(bxv(.04, .13, .07, gun, 0, -.11, .06), bxv(.05, .05, .12, dark, 0, .08, .04), bxv(.035, .035, .01, glass, 0, .08, .105), bxv(.03, .015, .34, gun, 0, .055, .12), bxv(.04, .09, .05, dark, 0, -.09, -.06));
    const muzzle = new T.Object3D(); muzzle.position.set(0, .01, .76); rifle.add(muzzle);
    bake(up); bake(head); bake(rifle);
    return { group: g, legs, legL, legR, upper: up, head, aR, aL, rifle, rifleZ: .32, muzzle };
  }

  // tekne: kesitlerden örülmüş gerçek gemi gövdesi (omurga → su hattı → bordo → küpeşte şeridi → güverte)
  function shipHull(hullC, teamC) {
    const ST = [[-1.8, .38, .2, .27], [-1.5, .44, .28, .26], [-1.0, .47, .33, .25], [-.4, .47, .34, .25], [.3, .46, .32, .255], [.9, .40, .22, .275], [1.4, .27, .1, .32], [1.8, .02, .01, .38]], yk = -.25;
    const cols = [lc(0x7a2a24, .75), lc(0x241a1c, 1), lc(hullC, 1), lc(teamC, .8), lc(0x5d6874, 1)], ci = [0, 1, 2, 3, 4, 3, 2, 1, 0, 0];
    const ring = s => {
      const z = s[0], wd = s[1], wk = s[2], yd = s[3], at = y => wk + (wd - wk) * Math.pow((y - yk) / (yd - yk), .9), ys = [yk, 0, .045, yd - .055, yd];
      const L = ys.map(y => [-at(y), y, z]), Rr = ys.map(y => [at(y), y, z]).reverse();
      return L.concat(Rr);
    };
    const mb = new MB();
    for (let i = 0; i < ST.length - 1; i++) {
      const a = ring(ST[i]), b = ring(ST[i + 1]);
      for (let j = 0; j < 10; j++) { const k = (j + 1) % 10, col = j === 9 ? cols[0].map(c => c * .6) : cols[ci[j]]; mb.quad(a[j], a[k], b[k], b[j], col); }
    }
    for (const e of [0, ST.length - 1]) { const r = ring(ST[e]), col = lc(hullC, .7); for (let i = 1; i < 9; i++) mb.tri(r[0], r[i], r[i + 1], col); }
    return mb.build();
  }

  function buildShip(color) {
    const g = new T.Group(); // iç grup (sallanır)
    const hullC = 0x8b97ad, DY = .25;
    const hull = stdv(0xffffff, { roughness: .6, metalness: .2 }), steel = stdv(0x7d8aa8, { metalness: .35, roughness: .5 }), dark = stdv(0x1a2138, { roughness: .9 });
    const light = stdv(0xc9d3ea, { roughness: .6 }), grey = stdv(0x9aa6bd, { roughness: .55, metalness: .3 }), pad = stdv(0x3a4350, { roughness: .95 }), white = stdv(0xe8eefc, { roughness: .8 });
    const glass = stdv(0x9fe8ff, { emissive: 0x58c8ff, emissiveIntensity: .55, roughness: .2 }), team = stdv(color, { roughness: .45, emissive: color, emissiveIntensity: .2 });
    const hm = new T.Mesh(shipHull(hullC, color), hull); g.add(hm);
    // ana üst yapı (açılı gizlilik hatları) + köprü üstü
    const sup = prism([[-.42, 0], [.38, 0], [.38, .16], [.26, .3], [-.3, .3], [-.42, .2]], .28, grey); sup.position.set(0, DY, -.2); g.add(sup);
    g.add(bxv(.4, .16, .3, grey, 0, DY + .38, -.3), bxv(.36, .05, .01, glass, 0, DY + .4, -.145), bxv(.46, .03, .36, dark, 0, DY + .47, -.3), bxv(.64, .025, .08, dark, 0, DY + .33, -.17));
    for (const s of [-1, 1]) g.add(bxv(.01, .05, .2, glass, s * .2, DY + .4, -.3), cyv(.006, .006, .4, 4, dark, s * .19, DY + .68, -.42));
    g.add(cyv(.018, .03, .55, 6, dark, 0, DY + .75, -.34), bxv(.14, .02, .14, dark, 0, DY + .85, -.34));  // ana direk + platform
    const radar = new T.Group(); radar.position.set(0, DY + 1.05, -.34); radar.add(bxv(.36, .06, .025, dark, 0, 0, 0), cyv(.03, .04, .05, 6, steel, 0, -.035, 0)); g.add(radar);
    g.add(cyv(.07, .08, .05, 8, light, 0, DY + .325, -.04), spv(.06, 8, 6, light, 0, DY + .37, -.04));  // yakın savunma sistemi
    const ciw = cyv(.011, .011, .16, 6, dark, 0, DY + .375, .04); ciw.rotation.x = Math.PI / 2; g.add(ciw);
    // kıç güverte evi + baca
    g.add(bxv(.36, .2, .36, grey, 0, DY + .1, -.95), cyv(.1, .12, .3, 8, grey, 0, DY + .35, -.95), cyv(.108, .118, .06, 8, team, 0, DY + .37, -.95), cyv(.1, .1, .05, 8, dark, 0, DY + .515, -.95));
    const funnel = new T.Object3D(); funnel.position.set(0, DY + .56, -.95); g.add(funnel);
    for (const s of [-1, 1]) g.add(bxv(.11, .05, .34, dark, s * .31, DY + .03, -.95), bxv(.07, .04, .28, light, s * .31, DY + .065, -.95)); // can botları
    // helikopter pisti
    g.add(bxv(.5, .012, .46, pad, 0, .268, -1.5), bxv(.03, .006, .22, white, -.07, .276, -1.5), bxv(.03, .006, .22, white, .07, .276, -1.5), bxv(.14, .006, .03, white, 0, .276, -1.5));
    // küpeşte
    for (const s of [-1, 1]) {
      g.add(bxv(.008, .008, 2.0, light, s * .41, DY + .09, -.5));
      for (const z of [-1.5, -1.1, -.7, -.3, .1, .5]) g.add(bxv(.008, .09, .008, light, s * .41, DY + .045, z));
    }
    // pruva topu (ateş eden): taret + namlu (geri tepme için ayrı, birleştirilmez)
    const guns = [], tur = new T.Group(); tur.position.set(0, .3, 1.3); g.add(tur);
    tur.add(cyv(.2, .22, .05, 10, steel, 0, .025, 0));
    const tb = prism([[-.2, 0], [.2, 0], [.27, .1], [.14, .2], [-.12, .2], [-.22, .1]], .16, grey); tb.position.y = .05; tur.add(tb);
    tur.add(bxv(.16, .1, .12, steel, 0, .14, .24));
    const brl = cyv(.028, .034, .74, 8, dark, 0, .17, .5); brl.rotation.x = Math.PI / 2; brl.userData.nobake = true; tur.add(brl);
    brl.add(cyv(.04, .04, .08, 8, dark, 0, .38, 0));
    const gt = new T.Object3D(); gt.position.set(0, .17, .88); tur.add(gt); guns.push({ tur: tur, tip: gt, barrel: brl });
    // torpido rampası
    const mount = new T.Group(); mount.position.set(0, .3, .62); g.add(mount);
    mount.add(cyv(.18, .2, .08, 10, steel, 0, .04, 0), bxv(.34, .04, .46, dark, 0, .1, .1), bxv(.4, .16, .04, grey, 0, .16, -.3));
    const mouths = [];
    for (const sx of [-.1, .1]) {
      const t = cyv(.065, .065, .75, 8, steel, sx, .15, .1); t.rotation.x = Math.PI / 2; mount.add(t);
      const ring = cyv(.078, .078, .04, 10, dark, sx, .15, .46); ring.rotation.x = Math.PI / 2; mount.add(ring);
      const band = cyv(.072, .072, .06, 10, team, sx, .15, -.02); band.rotation.x = Math.PI / 2; mount.add(band);
      const m = new T.Object3D(); m.position.set(sx, .15, .5); mount.add(m); mouths.push(m);
    }
    const stern = new T.Object3D(); stern.position.set(0, 0, -1.8); g.add(stern);
    // bayrak direği (kıç)
    g.add(cyv(.008, .008, .7, 4, dark, 0, .61, -1.72));
    const flagSegs = []; let fp = new T.Group(); fp.position.set(0, .95, -1.72); g.add(fp);
    for (let i = 0; i < 4; i++) { const sg = new T.Group(); sg.position.x = i ? .07 : 0; sg.add(bxv(.07, .15, .012, team, .035, 0, 0)); fp.add(sg); fp = sg; flagSegs.push(sg); }
    bake(g); bake(mount); bake(tur); bake(radar);
    return { inner: g, mount, mountZ: .62, mouths, radar, stern, guns, flagSegs, funnel };
  }

  function buildTorpedo(color) {
    const g = new T.Group(), spin = new T.Group(); g.add(spin);
    const metal = std(0x6b7690, { metalness: .6, roughness: .35 }), team = std(color, { emissive: color, emissiveIntensity: .35 }), red = std(0xff5a47, { emissive: 0xff3322, emissiveIntensity: .3 });
    const body = new T.Mesh(new T.CapsuleGeometry(.07, .55, 4, 8), metal); body.rotation.x = Math.PI / 2; spin.add(body);
    const band = cy(.074, .074, .08, 8, team, 0, 0, .1); band.rotation.x = Math.PI / 2; spin.add(band);
    const nose = new T.Mesh(new T.SphereGeometry(.052, 8, 6), red); nose.position.z = .4; spin.add(nose);
    for (let i = 0; i < 3; i++) { const f = bx(.01, .14, .1, metal, 0, 0, -.33); f.rotation.z = i * Math.PI * 2 / 3; f.position.set(Math.sin(f.rotation.z) * -.07, Math.cos(f.rotation.z) * .07, -.33); spin.add(f); }
    const prop = cy(.09, .09, .01, 10, std(0xcfd8ee), 0, 0, -.42); prop.rotation.x = Math.PI / 2; spin.add(prop);
    return { group: g, spin };
  }

  // kule: 3 katlı sekizgen taş kale kulesi (alt gövde / siperli orta kat / çatı odası). Katlar ayrı gruptur → çökerken sırayla devrilir.
  // Dönüş: Group (userData.anim(now): bayrak + meşale titreşimi; userData.tiers: çökme için). Ölçek .82 uygulanmıştır.

  /* ---- v6: FÜZE + FÜZE ATAR (TEL kamyonu) — tank ile aynı malzeme/kamuflaj/takım şeridi diliyle ---- */
  const along = m => { m.rotation.x = Math.PI / 2; return m; };   // Y eksenli silindir/koni -> +Z eksenli
  function buildMissile(color) {
    const g = new T.Group();
    const body = stdv(0xdfe3ec, { roughness: .5, metalness: .35 }), band = stdv(color, { roughness: .45, emissive: color, emissiveIntensity: .25 });
    const metal = stdv(0x8b97b8, { metalness: .5, roughness: .35 }), dark = stdv(0x1a2138, { roughness: .9 }), finM = stdv(0x5b6482, { metalness: .4, roughness: .5 });
    g.add(along(cyv(.075, .075, 1.35, 12, body, 0, 0, -.1)));            // gövde
    g.add(along(cov(.075, .5, 12, metal, 0, 0, .82)));                    // burun konisi
    g.add(along(cov(.036, .16, 8, band, 0, 0, 1.0)));                     // takım renkli uç
    g.add(along(cyv(.079, .079, .12, 12, band, 0, 0, .32)));              // takım bandı
    g.add(along(cyv(.079, .079, .05, 12, dark, 0, 0, -.5)));
    g.add(along(cyv(.05, .075, .14, 10, dark, 0, 0, -.82)));              // lüle
    const fins = (z, w, h, a0) => { for (let k = 0; k < 4; k++) { const f = new T.Group(); f.rotation.z = a0 + k * Math.PI / 2; f.add(bxv(.014, h, w, finM, 0, .075 + h / 2 - .01, z)); g.add(f); } };
    fins(-.62, .3, .17, Math.PI / 4); fins(.42, .16, .09, 0);             // kuyruk kanatçıkları + kanardlar
    const tail = new T.Object3D(); tail.position.set(0, 0, -.9); g.add(tail);
    bake(g);
    return { group: g, tail };
  }

  function buildMissileLauncher(color) {
    const g = new T.Group();
    const cm = { map: camoTex(color), roughness: .85, metalness: .1 }, camo = stdv(0xffffff, cm), camo2 = stdv(0xc4c4c4, cm);
    const dark = stdv(0x1a2138, { roughness: .9 }), metal = stdv(0x8b97b8, { metalness: .5, roughness: .4 }), rub = stdv(0x1c2029, { roughness: .95, metalness: 0 });
    const team = stdv(color, { roughness: .45, emissive: color, emissiveIntensity: .18 });
    const glass = stdv(0xaee8ff, { emissive: 0x58c8ff, emissiveIntensity: .5, roughness: .2 }), lamp = stdv(0xfff2c0, { emissive: 0xffe9a0, emissiveIntensity: .9 }), tail = stdv(0xff3a2a, { emissive: 0xff2010, emissiveIntensity: .8 });
    const wheels = [];
    const mkW = (x, y, z, r, w) => {
      const wg = new T.Group(); wg.position.set(x, y, z);
      const tire = cyv(r, r, w, 14, rub, 0, 0, 0); tire.rotation.z = Math.PI / 2; wg.add(tire);
      const hub = cyv(r * .55, r * .55, w + .04, 10, metal, 0, 0, 0); hub.rotation.z = Math.PI / 2; wg.add(hub);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, b = cyv(r * .09, r * .09, .03, 5, dark, Math.sign(x) * (w / 2 + .03), Math.cos(a) * r * .36, Math.sin(a) * r * .36); b.rotation.z = Math.PI / 2; wg.add(b); }
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, tb = bxv(w * .92, r * .16, r * .2, rub, 0, Math.cos(a) * r, Math.sin(a) * r); tb.rotation.x = a; wg.add(tb); }   // sırt blokları
      bake(wg); wheels.push(wg); g.add(wg);
    };
    for (const z of [-1.2, -.58, .52, 1.14]) { mkW(-.53, .25, z, .25, .24); mkW(.53, .25, z, .25, .24); const ax = cyv(.04, .04, 1.1, 6, dark, 0, .25, z); ax.rotation.z = Math.PI / 2; g.add(ax); }
    for (const s of [-1, 1]) {
      g.add(bxv(.3, .045, 1.05, camo2, s * .53, .56, -.9), bxv(.3, .045, .95, camo2, s * .53, .56, .83));   // çamurluklar
      g.add(bxv(.26, .1, .02, dark, s * .53, .3, -1.56));                                                  // çamur perdesi
      g.add(bxv(.12, .2, .6, camo2, s * .47, .46, -.03));                                                  // yan alet kutusu
      g.add(bxv(.012, .05, 2.4, team, s * .465, .53, -.15));                                               // takım şeridi
      g.add(bxv(.07, .05, .03, tail, s * .4, .5, -1.57));                                                  // stop lambaları
      g.add(bxv(.12, .07, .04, lamp, s * .3, .56, 1.65));                                                  // farlar
      g.add(bxv(.012, .06, .7, team, s * .435, .7, 1.22));
      g.add(bxv(.02, .22, .4, glass, s * .432, .98, 1.2));                                                 // yan camlar
    }
    g.add(bxv(.78, .16, 3.1, dark, 0, .4, 0), bxv(.94, .08, 2.2, camo, 0, .54, -.5));                      // şasi + arka güverte
    g.add(prism([[.88, .46], [1.58, .46], [1.66, .6], [1.6, .84], [1.52, 1.02], [1.14, 1.2], [.92, 1.2]], .43, camo));   // kabin
    const ws = bxv(.66, .02, .42, glass, 0, 1.11, 1.33); ws.rotation.x = .442; g.add(ws);                  // ön cam
    g.add(bxv(.94, .1, .1, dark, 0, .44, 1.62), bxv(.4, .14, .03, metal, 0, .58, 1.67), bxv(.4, .04, .08, metal, 0, 1.22, 1.0));
    g.add(cyv(.04, .045, .55, 6, dark, .46, .98, .85));                                                      // egzoz bacası
    const exh = new T.Object3D(); exh.position.set(.46, 1.28, .85); g.add(exh);
    // dönen taban + kaldırma ayakları
    g.add(bxv(.9, .12, .5, dark, 0, .62, -1.28), bxv(.06, .22, .12, metal, -.4, .72, -1.4), bxv(.06, .22, .12, metal, .4, .72, -1.4));
    // fırlatma rampası (X ekseninde yükselir) + 4 füze
    const rack = new T.Group(); rack.position.set(0, .64, -1.38); g.add(rack);
    rack.add(bxv(.86, .05, 2.15, camo2, 0, -.04, 1.1));
    for (const s of [-1, 1]) { for (const z of [.2, 1.1, 2.0]) rack.add(bxv(.04, .62, .07, dark, s * .44, .28, z)); rack.add(bxv(.04, .04, 1.95, metal, s * .44, .58, 1.1)); }
    for (const z of [.55, 1.65]) rack.add(bxv(.9, .03, .06, metal, 0, .6, z));
    const slots = [];
    for (const y of [.12, .44]) for (const x of [-.2, .2]) {
      const m = buildMissile(color).group; m.position.set(x, y, 1.05); rack.add(m);
      const tip = new T.Object3D(); tip.position.set(x, y, 2.2); rack.add(tip);
      const aim = new T.Object3D(); aim.position.set(x, y, 3.2); rack.add(aim);
      slots.push({ m, tip, aim });
    }
    // hidrolik dengeleyici ayaklar (kurulumda uzar)
    const jacks = [];
    for (const s of [-1, 1]) {
      const jk = new T.Group(); jk.position.set(s * .5, .5, -1.62); jk.scale.y = .001; jk.visible = false;
      jk.add(cyv(.045, .045, .5, 6, metal, 0, -.25, 0), cyv(.07, .07, .12, 6, dark, 0, -.06, 0), bxv(.22, .035, .22, dark, 0, -.5, 0));
      g.add(jk); jacks.push(jk);
    }
    const ant = new T.Group(); ant.position.set(-.36, 1.2, 1.0); g.add(ant);
    ant.add(cyv(.012, .006, 1.1, 4, dark, 0, .55, 0), bxv(.2, .12, .012, team, .1, 1.0, 0));
    bake(g); bake(rack);
    return { group: g, rack, pivotZ: -1.38, slots, wheels, jacks, ant, exh };
  }

  function buildTower(color) {
    const g = new T.Group(), tiers = [], flames = [], fsegs = [];
    const tx = { map: stoneTex(), roughness: .95, metalness: 0 }, stone = stdv(0xffffff, tx), stoneD = stdv(0x8f897e, tx), stoneL = stdv(0xf0eadc, tx);
    const wood = stdv(0x6a4a2e, { roughness: .9, metalness: 0 }), iron = stdv(0x2a2f3a, { roughness: .6, metalness: .5 }), slit = stdv(0x0b0e16, { roughness: 1, metalness: 0 });
    const team = stdv(color, { roughness: .55, emissive: color, emissiveIntensity: .22 }), roof = stdv(color, { roughness: .6, metalness: .05 });
    const flame = stdv(0xffa030, { emissive: 0xff7a10, emissiveIntensity: 1.3, roughness: .6, metalness: 0 });
    const octa = (rt, rb, h, mat, x, y, z) => mk3(paint(new T.CylinderGeometry(rt, rb, h, 8, 1, false, Math.PI / 8)), mat, x, y, z); // yüzler eksenlere hizalı
    const tier = y => { const t = new T.Group(); t.position.y = y; g.add(t); tiers.push({ g: t, y: y }); return t; };
    const fire = (t, x, y, z) => { const f = spv(.035, 5, 4, flame, x, y, z); f.userData.nobake = true; f.userData.flame = true; t.add(f); flames.push(f); };
    // alt kat
    const t0 = tier(0);
    t0.add(octa(.5, .56, .14, stoneD, 0, .07, 0), octa(.36, .45, .64, stone, 0, .46, 0));
    t0.add(bxv(.15, .22, .05, wood, 0, .25, .405), bxv(.16, .02, .055, iron, 0, .17, .405), bxv(.16, .02, .055, iron, 0, .3, .405));
    const arch = cyv(.075, .075, .05, 8, wood, 0, .36, .405); arch.rotation.x = Math.PI / 2; t0.add(arch);
    for (const s of [-1, 1]) { t0.add(bxv(.04, .14, .05, slit, s * .372, .52, 0), cyv(.012, .012, .12, 4, wood, s * .17, .36, .4)); fire(t0, s * .17, .44, .4); }
    // orta kat: gövde, hendek taşları, bayrak, konsol halkası, siper + 8 mazgal
    const t1 = tier(.78);
    t1.add(octa(.45, .46, .06, stoneL, 0, .03, 0), octa(.34, .37, .52, stone, 0, .32, 0));
    for (const s of [-1, 1]) t1.add(bxv(.04, .15, .05, slit, s * .33, .32, 0));
    t1.add(bxv(.05, .15, .04, slit, 0, .32, -.33), bxv(.15, .32, .02, team, 0, .3, .34), bxv(.19, .03, .03, iron, 0, .47, .345));
    t1.add(octa(.5, .38, .14, stoneL, 0, .65, 0), octa(.46, .46, .12, stone, 0, .78, 0), octa(.4, .4, .02, stoneD, 0, .85, 0));
    for (let k = 0; k < 8; k++) { const th = k * Math.PI / 4, m = bxv(.2, .13, .09, stone, Math.sin(th) * .4, .91, Math.cos(th) * .4); m.rotation.y = th; t1.add(m); }
    for (const s of [-1, 1]) { t1.add(cyv(.06, .04, .06, 6, iron, s * .27, .88, .27)); fire(t1, s * .27, .94, .27); }
    // üst kat: gözetleme odası + takım renkli çatı + sivri uç + bayrak
    const t2 = tier(1.64);
    t2.add(octa(.22, .25, .32, stone, 0, .16, 0), octa(.31, .31, .04, stoneL, 0, .34, 0), cov(.3, .44, 8, roof, 0, .58, 0), spv(.035, 6, 5, iron, 0, .82, 0), cyv(.01, .01, .4, 4, iron, 0, 1.0, 0));
    for (const s of [-1, 1]) t2.add(bxv(.04, .12, .06, slit, s * .23, .17, 0));
    let fp = new T.Group(); fp.position.set(0, 1.1, 0); t2.add(fp);
    for (let i = 0; i < 4; i++) { const sg = new T.Group(); sg.position.x = i ? .08 : 0; sg.add(bxv(.08, .17, .012, team, .04, 0, 0)); fp.add(sg); fp = sg; fsegs.push(sg); }
    tiers.forEach(t => bake(t.g));
    g.userData.tiers = tiers;
    g.userData.anim = now => {
      for (let i = 0; i < fsegs.length; i++) fsegs[i].rotation.y = Math.sin(now * 7 - i * 1.1) * .3 + (i ? 0 : .1);
      for (let i = 0; i < flames.length; i++) { const k = .85 + .3 * Math.sin(now * 14 + i * 2.1) + .1 * Math.sin(now * 31 + i); flames[i].scale.set(1, k * 1.3, 1); }
    };
    g.scale.setScalar(.82);
    return g;
  }

  // ev: taş temel, kiriş çerçeveli duvar, kırma çatı, baca, pencere ışıkları, kapı, varil/sandık
  function buildHouse(roofColor) {
    const g = new T.Group();
    const wall = stdv(0xe4dccb, { roughness: .95, metalness: 0 }), beam = stdv(0x5b3d28, { roughness: .9, metalness: 0 }), roof = stdv(roofColor, { roughness: .85, metalness: 0 });
    const roofD = stdv(new T.Color(roofColor).multiplyScalar(.7).getHex(), { roughness: .9, metalness: 0 }), stoneM = stdv(0xffffff, { map: stoneTex(), roughness: .95, metalness: 0 });
    const win = stdv(0xffd98a, { emissive: 0xffb84a, emissiveIntensity: .7, roughness: .5, metalness: 0 }), wood = stdv(0x6a4a2e, { roughness: .9, metalness: 0 }), brick = stdv(0x8a4a3a, { roughness: .95, metalness: 0 });
    g.add(bxv(.8, .1, .62, stoneM, 0, .05, 0), bxv(.72, .3, .54, wall, 0, .25, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bxv(.05, .32, .05, beam, sx * .355, .26, sz * .265));
    g.add(bxv(.76, .04, .58, beam, 0, .4, 0), bxv(.74, .03, .02, beam, 0, .22, .272));
    for (const sx of [-1, 1]) g.add(bxv(.03, .3, .02, beam, sx * .18, .25, .272), bxv(.11, .11, .015, win, sx * .22, .27, .275), bxv(.14, .02, .02, beam, sx * .22, .335, .28), bxv(.015, .11, .11, win, sx * .365, .27, 0));
    g.add(bxv(.13, .21, .02, wood, 0, .2, .278), bxv(.17, .025, .025, beam, 0, .31, .278), bxv(.2, .03, .1, stoneM, 0, .115, .33));
    g.add(prism([[-.4, 0], [.4, 0], [0, .3]], .46, roof, { sd: .9 })); g.children[g.children.length - 1].position.y = .41;
    g.add(bxv(.94, .03, .05, roofD, 0, .72, 0));
    g.add(bxv(.11, .28, .11, brick, .2, .62, -.08), bxv(.14, .03, .14, roofD, .2, .77, -.08));
    g.add(cyv(.06, .065, .16, 8, wood, .5, .08, .2), bxv(.12, .1, .12, wood, -.5, .05, .2));
    bake(g);
    return g;
  }



  /* ---- v7: SAVAŞ UÇAĞI + BOMBA — tank / füze atar ile aynı malzeme, kamuflaj ve takım şeridi diliyle ---- */
  // (x,z) düzleminde dışbükey çokgen -> ince, çift yüzlü kanat (üstü açık, altı koyu, kenarlar orta ton)
  function planform(pts, th, mat) {
    const mb = new MB(), n = pts.length, h = th / 2;
    for (let i = 1; i < n - 1; i++) {
      mb.tri([pts[0][0], h, pts[0][1]], [pts[i][0], h, pts[i][1]], [pts[i + 1][0], h, pts[i + 1][1]], [1, 1, 1]);
      mb.tri([pts[0][0], -h, pts[0][1]], [pts[i + 1][0], -h, pts[i + 1][1]], [pts[i][0], -h, pts[i][1]], [.55, .55, .55]);
    }
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; mb.quad([a[0], -h, a[1]], [b[0], -h, b[1]], [b[0], h, b[1]], [a[0], h, a[1]], [.75, .75, .75]); }
    return new T.Mesh(mb.build(), mat);
  }
  function buildBomb(color) {
    const g = new T.Group();
    const body = stdv(0x6a7357, { roughness: .6, metalness: .3 }), band = stdv(color, { roughness: .45, emissive: color, emissiveIntensity: .25 });
    const dark = stdv(0x1a2138, { roughness: .9 }), finM = stdv(0x5b6482, { metalness: .4, roughness: .5 });
    g.add(along(cyv(.085, .085, .5, 12, body, 0, 0, 0)));
    g.add(along(cov(.085, .22, 12, body, 0, 0, .36)));                     // burun
    g.add(along(cyv(.089, .089, .07, 12, band, 0, 0, .08)));               // takım bandı
    g.add(along(cyv(.05, .085, .1, 10, dark, 0, 0, -.3)));                 // kuyruk lülesi
    for (let k = 0; k < 4; k++) { const f = new T.Group(); f.rotation.z = Math.PI / 4 + k * Math.PI / 2; f.add(bxv(.014, .14, .2, finM, 0, .15, -.38)); g.add(f); }
    bake(g);
    return g;
  }
  function buildPlane(color) {
    const g = new T.Group();
    const cm = { map: camoTex(color), roughness: .8, metalness: .15 }, camo = stdv(0xffffff, cm), camo2 = stdv(0xc4c4c4, cm);
    const dark = stdv(0x1a2138, { roughness: .9 }), metal = stdv(0x8b97b8, { metalness: .5, roughness: .35 });
    const team = stdv(color, { roughness: .45, emissive: color, emissiveIntensity: .2 });
    const glass = stdv(0xaee8ff, { emissive: 0x58c8ff, emissiveIntensity: .5, roughness: .2 });
    const red = stdv(0xff3a2a, { emissive: 0xff2010, emissiveIntensity: .9 }), grn = stdv(0x3aff6a, { emissive: 0x10ff40, emissiveIntensity: .9 });
    g.add(along(cyv(.17, .13, 2.0, 14, camo, 0, 0, -.05)));                // gövde
    g.add(along(cov(.17, .75, 14, camo2, 0, 0, 1.33)));                    // burun konisi
    g.add(along(cov(.03, .28, 8, metal, 0, 0, 1.84)));                     // pitot borusu
    g.add(along(cyv(.176, .176, .12, 14, team, 0, 0, .3)));                // takım bandı
    g.add(along(cyv(.1, .13, .12, 12, dark, 0, 0, -1.08)));                // egzoz lülesi
    const cp = spv(.13, 12, 8, glass, 0, .14, .5); cp.scale.set(.85, .8, 2.1); g.add(cp);   // kokpit camı
    for (const s of [-1, 1]) {
      g.add(bxv(.1, .13, .5, dark, s * .2, -.03, .38));                    // hava girişleri
      g.add(bxv(.04, .06, .3, dark, s * .62, -.075, .0));                  // kanat altı payandası
      g.add(bxv(.05, .1, .22, team, s * 1.28, .0, -.6));                   // kanat ucu takım bandı
      g.add(bxv(.045, .045, .06, s > 0 ? grn : red, s * 1.31, .0, -.38));  // seyir ışığı
      g.add(bxv(.3, .012, .22, team, s * .72, .03, -.18));                 // kanat üstü takım işareti
    }
    const wr = [[.12, .6], [1.3, -.45], [1.3, -.75], [.12, -.7]], tr = [[.1, -.72], [.62, -1.05], [.62, -1.25], [.1, -1.1]];
    g.add(planform(wr, .045, camo), planform(wr.map(q => [-q[0], q[1]]), .045, camo));         // ana kanatlar
    g.add(planform(tr, .035, camo2), planform(tr.map(q => [-q[0], q[1]]), .035, camo2));       // yatay kuyruk
    const fin = prism([[-.2, 0], [-1.05, 0], [-1.05, .5], [-.78, .5]], .018, camo); fin.position.y = .1; g.add(fin);   // dikey kuyruk
    g.add(bxv(.04, .11, .2, team, 0, .5, -.95));
    bake(g);
    // bake sonrası eklenenler: hareketli / ışıklı parçalar
    const bombs = [];
    for (const q of [[-.62, -.19, 0], [.62, -.19, 0], [0, -.23, -.15]]) { const b = buildBomb(color); b.position.set(q[0], q[1], q[2]); b.scale.setScalar(.85); g.add(b); bombs.push(b); }
    const fm = new T.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false });
    const flame = new T.Mesh(new T.ConeGeometry(.1, .7, 10), fm); flame.rotation.x = -Math.PI / 2; flame.position.set(0, 0, -1.5); g.add(flame);   // art yakıcı alevi
    const fm2 = new T.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false });
    const core = new T.Mesh(new T.ConeGeometry(.05, .4, 8), fm2); core.rotation.x = -Math.PI / 2; core.position.set(0, 0, -1.35); g.add(core);
    return { group: g, bombs, flame, core };
  }

  /* ---------------------------------------------------------------- ana sınıf */
  class WCBattleFX {
    constructor(THREE, scene, opts) {
      this.projK = 1;   // V91: mermi/füze/patlama boyutu çarpanı (hedef ülkeye sığsın diye sahne başına ayarlanır)
      T = THREE; this.T = THREE; this.scene = scene; this.opts = opts || {};
      this.root = new T.Group(); this.root.name = 'WCBattleFX'; scene.add(this.root);
      this.time = 0; this.timeScale = 1; this.hs = 0; this.hsK = .25; this.tasks = []; this.anims = []; this.tickers = []; this.objs = new Set();
      this.waveY = this.opts.waveY || ((x, z, t) => Math.sin(x * .55 + t * 1.2) * .04 + Math.sin(z * .7 + t * 1.6) * .03);
      this.tex = softTex(); this.smokeTex = smokeTex(); this.gradTex = gradTex(); this.ringTex = ringTex();
      this.padd = new Particles(FXLOW ? 1300 : 2200, true, this.tex);      // kıvılcım / parıltı
      this.pfire = new Particles(FXLOW ? 700 : 1200, true, this.smokeTex); // alev / ateş topu
      this.pnorm = new Particles(FXLOW ? 1000 : 1800, false, this.smokeTex); // duman / toz / köpük
      this.sys = [this.padd, this.pfire, this.pnorm];
      this.root.add(this.pnorm.points, this.pfire.points, this.padd.points);
      this.lights = [0, 1, 2].map(() => { const l = new T.PointLight(0xffffff, 0, 14, 2); l.userData = { t0: -1, dur: 1, peak: 0 }; this.root.add(l); return l; });
      const sh = this.shared = {
        tracerGeo: new T.BoxGeometry(.025, .025, .9), debrisGeo: new T.BoxGeometry(1, 1, 1),
        planeGeo: new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
        domeGeo: new T.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2),
        columnGeo: new T.CylinderGeometry(.5, .8, 1, 14, 1, true).translate(0, .5, 0),
        tracerMat: new T.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false }),
        debrisMat: std(0x3a3430, { roughness: .95 }), debrisMat2: std(0x6a6258, { roughness: .95 })
      };
      Object.keys(sh).forEach(k => { (sh[k].userData = sh[k].userData || {}).keep = true; });
    }

    /* ----- altyapı ----- */
    placeOnSurface(point, normal, scale) {
      this.root.position.copy(point);
      this.root.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), normal.clone().normalize());
      this.root.scale.setScalar(scale || 1);
    }
    at(delay, fn) { this.tasks.push({ t: this.time + delay, fn: fn }); }
    tween(dur, fn, done, delay) { this.anims.push({ t0: this.time + (delay || 0), dur: Math.max(dur, .0001), fn: fn, done: done, dead: false }); }
    ticker(fn) { const k = { fn: fn, dead: false }; this.tickers.push(k); return () => { k.dead = true; }; }
    spawn(o) { this.root.add(o); this.objs.add(o); return o; }
    kill(o) { if (!o) return; this.root.remove(o); this.objs.delete(o); disposeObj(o); }
    shake(a) { if (this.opts.onShake) this.opts.onShake(a); }
    hitStop(dur, k) { this.hs = Math.max(this.hs, dur); this.hsK = k || .25; } // vuruş anında kısa yavaşlama (gerçek süre)
    clear() {
      this.hs = 0; this.tasks.length = 0; this.anims.length = 0; this.tickers.length = 0;
      Array.from(this.objs).forEach(o => this.kill(o));
      this.sys.forEach(s => s.reset()); this.lights.forEach(l => { l.intensity = 0; l.userData.t0 = -1; });
    }
    flash(pos, color, peak, dur) {
      let l = this.lights[0];
      for (const c of this.lights) { if (c.userData.t0 < 0) { l = c; break; } if (c.userData.t0 + c.userData.dur < l.userData.t0 + l.userData.dur) l = c; }
      l.position.set(pos.x, pos.y + .6, pos.z); l.color.setHex(color); l.userData.t0 = this.time; l.userData.dur = dur; l.userData.peak = peak;
    }

    update(dtReal) {
      const rd = Math.min(dtReal || 0, .05); let ks = this.timeScale; if (this.hs > 0) { ks *= this.hsK; this.hs -= rd; }
      const dt = rd * ks; this.time += dt; const now = this.time;
      if (this.tasks.length) {
        const due = []; this.tasks = this.tasks.filter(k => { if (k.t <= now) { due.push(k); return false; } return true; });
        due.sort((a, b) => a.t - b.t); due.forEach(k => k.fn());
      }
      for (let i = 0; i < this.anims.length; i++) {
        const a = this.anims[i]; if (now < a.t0) continue;
        const u = clamp01((now - a.t0) / a.dur); a.fn(u, dt);
        if (u >= 1) { a.dead = true; if (a.done) a.done(); }
      }
      this.anims = this.anims.filter(a => !a.dead);
      for (let i = 0; i < this.tickers.length; i++) { const k = this.tickers[i]; if (!k.dead) k.fn(dt, now); }
      this.tickers = this.tickers.filter(k => !k.dead);
      for (const l of this.lights) {
        const d = l.userData; if (d.t0 < 0) continue;
        const u = (now - d.t0) / d.dur; if (u >= 1) { l.intensity = 0; d.t0 = -1; } else l.intensity = d.peak * (1 - u) * (1 - u);
      }
      let sc = 600;
      if (this.opts.renderer && this.opts.camera) sc = this.opts.renderer.domElement.height / (2 * Math.tan(this.opts.camera.fov * Math.PI / 360));
      sc *= this.root.scale.x;
      this.sys.forEach(s => { s.mat.uniforms.uScale.value = sc; s.update(dt); });
    }

    /* ----- küçük efektler ----- */
    blob(pos, r) { // yumuşak kenarlı gölge
      const m = new T.Mesh(this.shared.planeGeo, new T.MeshBasicMaterial({ color: 0x000000, map: this.tex, transparent: true, opacity: .45, depthWrite: false }));
      m.scale.setScalar(r * 1.15); m.position.set(pos.x, pos.y + .02, pos.z); return this.spawn(m);
    }
    dust(pos, r, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, sp = rnd(1, 2.2) * r;
        this.pnorm.emit({ x: pos.x + Math.cos(a) * .2 * r, y: pos.y + .08, z: pos.z + Math.sin(a) * .2 * r, vx: Math.cos(a) * sp, vy: rnd(.3, 1), vz: Math.sin(a) * sp, life: rnd(.8, 1.4), s0: .45 * r, s1: 1.25 * r, c0: [.66, .6, .5], c1: [.5, .46, .4], a0: .5, a1: 0, drag: 2.2 });
      }
    }
    puff(pos) { // kurşun isabeti
      for (let i = 0; i < 4; i++) this.pnorm.emit({ x: pos.x, y: pos.y + .05, z: pos.z, vx: rnd(-.8, .8), vy: rnd(.5, 1.6), vz: rnd(-.8, .8), life: rnd(.4, .7), s0: .16, s1: .5, c0: [.6, .52, .4], c1: [.42, .38, .33], a0: .55, a1: 0, drag: 2 });
      for (let i = 0; i < 5; i++) this.padd.emit({ x: pos.x, y: pos.y + .05, z: pos.z, vx: rnd(-2.4, 2.4), vy: rnd(1.5, 3.5), vz: rnd(-2.4, 2.4), life: rnd(.2, .4), s0: .08, s1: .02, c0: [1, .85, .4], c1: [1, .4, .1], a0: 1, a1: 0, gy: -10 });
    }
    fizzle(pos) { // V164: boşa giden mermi — havada sönen küçük duman (patlama/ateş/sarsıntı YOK)
      for (let i = 0; i < 5; i++) this.pnorm.emit({ x: pos.x, y: pos.y, z: pos.z, vx: rnd(-.5, .5), vy: rnd(.1, .5), vz: rnd(-.5, .5), life: rnd(.5, .9), s0: .1, s1: .38, c0: [.7, .7, .72], c1: [.5, .5, .54], a0: .4, a1: 0, drag: 1.5 });
    }
    ringFx(pos, color, radius, dur, delay) { // yere yayılan şok halkası
      const r = new T.Mesh(this.shared.planeGeo, new T.MeshBasicMaterial({ map: this.ringTex, color: color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
      r.position.set(pos.x, pos.y + .04, pos.z); r.scale.setScalar(.05); this.spawn(r);
      this.tween(dur, u => { r.scale.setScalar(.05 + radius * E.out(u)); r.material.opacity = .85 * (1 - u) * (1 - u); }, () => this.kill(r), delay);
    }
    deploy(pos, r, color, h) {
      const c = rgb(color);
      const beam = new T.Mesh(new T.CylinderGeometry(r, r * 1.05, h, 20, 1, true), new T.MeshBasicMaterial({ map: this.gradTex, color: color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      beam.position.set(pos.x, pos.y + h / 2, pos.z); this.spawn(beam);
      this.tween(.9, u => { beam.material.opacity = Math.sin(u * Math.PI) * .85; const s = 1 - .45 * u; beam.scale.set(s, 1, s); beam.rotation.y = u * 3; }, () => this.kill(beam));
      this.ringFx(pos, 0xffcf6b, r * 2.4, .8); this.ringFx(pos, color, r * 1.6, .6, .12);
      this.flash(pos, color, 22 * r, .5);
      for (let i = 0; i < 26; i++) { // yükselen spiral parıltı
        const a = Math.random() * 6.283, rr = r * rnd(.6, 1.1), sp = rnd(.8, 1.6);
        this.padd.emit({ x: pos.x + Math.cos(a) * rr, y: pos.y + .1, z: pos.z + Math.sin(a) * rr, vx: -Math.sin(a) * sp, vy: rnd(1.6, 3.6), vz: Math.cos(a) * sp, life: rnd(.6, 1.2), s0: .16, s1: .02, c0: [1, .88, .5], c1: c, a0: .9, a1: 0 });
      }
    }
    muzzle(pos, dir, s, noLight) {
      this.padd.emit({ x: pos.x, y: pos.y, z: pos.z, life: .09, s0: 1.6 * s, s1: 2.3 * s, c0: [1, .96, .75], c1: [1, .6, .2], a0: 1, a1: 0 });
      for (let i = 0; i < 5; i++) { // ileri doğru alev konisi
        const sp = rnd(4, 9) * s;
        this.pfire.emit({ x: pos.x + dir.x * .15 * s, y: pos.y + dir.y * .15 * s, z: pos.z + dir.z * .15 * s, vx: dir.x * sp + rnd(-.8, .8), vy: dir.y * sp + rnd(-.6, .6), vz: dir.z * sp + rnd(-.8, .8), life: rnd(.1, .2), s0: .45 * s, s1: .9 * s, c0: [1, .88, .5], c1: [1, .3, .05], a0: .9, a1: 0, drag: 3 });
      }
      for (let i = 0; i < 8; i++) {
        const sp = rnd(5, 12) * s;
        this.padd.emit({ x: pos.x, y: pos.y, z: pos.z, vx: dir.x * sp + rnd(-1.4, 1.4), vy: dir.y * sp + rnd(-1.2, 1.2), vz: dir.z * sp + rnd(-1.4, 1.4), life: rnd(.1, .22), s0: .3 * s, s1: .06 * s, c0: [1, .85, .45], c1: [1, .35, .1], a0: 1, a1: 0 });
      }
      for (let i = 0; i < 4; i++) {
        this.pnorm.emit({ x: pos.x + dir.x * .3, y: pos.y + dir.y * .3, z: pos.z + dir.z * .3, vx: dir.x * rnd(1, 3) * s, vy: dir.y * rnd(1, 3) * s + .5, vz: dir.z * rnd(1, 3) * s, life: rnd(.8, 1.4), s0: .35 * s, s1: 1.2 * s, c0: [.62, .62, .64], c1: [.34, .34, .37], a0: .5, a1: 0, drag: 2, gy: .3 });
      }
      if (!noLight) this.flash(pos, 0xffc060, 55 * s, .1);
    }
    debris(pos, s) {
      const list = [], sh = this.shared;
      for (let i = 0; i < 12; i++) {
        const m = new T.Mesh(sh.debrisGeo, i % 3 ? sh.debrisMat : sh.debrisMat2), k = rnd(.07, .18) * s;
        m.scale.set(k, k * rnd(.6, 1.2), k * rnd(.6, 1.5)); m.position.set(pos.x, pos.y + .2, pos.z); this.spawn(m);
        const a = Math.random() * 6.283, sp = rnd(1.5, 4.6) * s;
        list.push({ m: m, vx: Math.cos(a) * sp, vy: rnd(3.5, 8) * s, vz: Math.sin(a) * sp, rx: rnd(-9, 9), rz: rnd(-9, 9), rest: false, b: 0 });
      }
      this.tween(2.1, (u, dt) => {
        for (const d of list) {
          if (!d.rest) {
            d.vy -= 12 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; d.m.rotation.x += d.rx * dt; d.m.rotation.z += d.rz * dt;
            if (Math.random() < dt * 16 && d.vy > -3) this.pnorm.emit({ x: d.m.position.x, y: d.m.position.y, z: d.m.position.z, life: rnd(.4, .8), s0: .1 * s, s1: .35 * s, c0: [.35, .33, .32], c1: [.2, .2, .2], a0: .4, a1: 0 });
            if (d.m.position.y <= pos.y + .04) {
              d.m.position.y = pos.y + .04;
              if (d.vy < -2.2 && d.b < 2) { d.vy *= -.32; d.vx *= .6; d.vz *= .6; d.rx *= .5; d.rz *= .5; d.b++; this.dust({ x: d.m.position.x, y: pos.y, z: d.m.position.z }, .12 * s, 1); } else d.rest = true;
            }
          }
          if (u > .78) d.m.visible = (1 - (u - .78) / .22) > .05;
        }
      }, () => list.forEach(d => this.kill(d.m)));
    }
    plume(pos, s, dur) { // patlama sonrası yükselen duman sütunu
      const t0 = this.time; let stop = null;
      stop = this.ticker((dt, now) => {
        const k = (now - t0) / dur; if (k >= 1) { stop(); return; }
        for (let n = emitCount(16 * (1 - k * .6), dt); n > 0; n--) {
          const g = .2 + .25 * k;
          this.pnorm.emit({ x: pos.x + rnd(-.25, .25) * s, y: pos.y + .3, z: pos.z + rnd(-.25, .25) * s, vx: rnd(-.25, .25), vy: rnd(1.2, 2.4) * s, vz: rnd(-.25, .25), life: rnd(1.8, 2.8), s0: .55 * s, s1: rnd(1.8, 2.6) * s, c0: [g, g, g + .02], c1: [g * .6, g * .6, g * .62], a0: .5 * (1 - k * .5), a1: 0, drag: .6, gy: .25 });
        }
        if (Math.random() < dt * 5) this.pfire.emit({ x: pos.x + rnd(-.3, .3) * s, y: pos.y + .3, z: pos.z + rnd(-.3, .3) * s, vy: rnd(.8, 1.6), life: rnd(.3, .5), s0: .5 * s, s1: .15 * s, c0: [1, .6, .2], c1: [.8, .15, .03], a0: .6 * (1 - k), a1: 0 });
      });
    }
    explosion(pos, s, o) {
      s = (s || 1) * this.projK; o = o || {}; const y0 = pos.y;
      this.padd.emit({ x: pos.x, y: y0 + .4, z: pos.z, life: .22, s0: 3.4 * s, s1: 5.2 * s, c0: [1, .98, .85], c1: [1, .6, .2], a0: 1, a1: 0 });
      for (let i = 0; i < 6; i++) this.pfire.emit({ x: pos.x, y: y0 + .3, z: pos.z, vx: rnd(-.4, .4), vy: rnd(1, 3) * s, vz: rnd(-.4, .4), life: rnd(.3, .55), s0: 1.2 * s, s1: 2.6 * s, c0: [1, 1, .85], c1: [1, .5, .1], a0: 1, a1: 0, drag: 2 });
      for (let i = 0; i < 20; i++) { // kabaran ateş topu
        const a = Math.random() * 6.283, r = rnd(0, 1) * rnd(.8, 2.6) * s;
        this.pfire.emit({ x: pos.x + Math.cos(a) * .2 * s, y: y0 + .25, z: pos.z + Math.sin(a) * .2 * s, vx: Math.cos(a) * r, vy: rnd(1.5, 5.5) * s, vz: Math.sin(a) * r, life: rnd(.45, .95), s0: rnd(.8, 1.4) * s, s1: rnd(1.8, 3) * s, c0: [1, .92, .55], c1: [.9, .2, .04], a0: .95, a1: 0, drag: 2.2 });
      }
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * 6.283, r = rnd(.3, 1.8) * s;
        this.pnorm.emit({ x: pos.x, y: y0 + .3, z: pos.z, vx: Math.cos(a) * r, vy: rnd(1, 3) * s, vz: Math.sin(a) * r, life: rnd(1.8, 3.2), s0: .9 * s, s1: rnd(2.6, 3.8) * s, c0: [.22, .21, .22], c1: [.09, .09, .1], a0: .7, a1: 0, gy: .55, drag: 1.1 });
      }
      for (let i = 0; i < 36; i++) { // kıvılcımlar
        const a = Math.random() * 6.283, r = rnd(2, 7) * s;
        this.padd.emit({ x: pos.x, y: y0 + .2, z: pos.z, vx: Math.cos(a) * r, vy: rnd(4, 10) * s, vz: Math.sin(a) * r, life: rnd(.7, 1.4), s0: .09 * s, s1: .02, c0: [1, .9, .5], c1: [1, .35, .08], a0: 1, a1: 0, gy: -9, drag: .3 });
      }
      for (let i = 0; i < 10; i++) this.padd.emit({ x: pos.x + rnd(-.5, .5) * s, y: y0 + .4, z: pos.z + rnd(-.5, .5) * s, vx: rnd(-.5, .5), vy: rnd(1, 2.2), vz: rnd(-.5, .5), life: rnd(1.4, 2.6), s0: .07 * s, s1: .02, c0: [1, .65, .25], c1: [.6, .12, .05], a0: .9, a1: 0, gy: .4 });
      const dome = new T.Mesh(this.shared.domeGeo, new T.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      dome.position.set(pos.x, y0, pos.z); this.spawn(dome);
      this.tween(.28, u => { dome.scale.setScalar(s * (.6 + 2.6 * E.out(u))); dome.material.opacity = .5 * (1 - u) * (1 - u); }, () => this.kill(dome));
      this.ringFx(pos, 0xffd9a0, 3.2 * s, .5); this.ringFx(pos, 0xff9040, 4.8 * s, .75, .08);
      if (!o.water) {
        this.debris(pos, s);
        const sc = new T.Mesh(this.shared.planeGeo, new T.MeshBasicMaterial({ color: 0x000000, map: this.tex, transparent: true, opacity: .6, depthWrite: false }));
        sc.scale.setScalar(1.3 * s); sc.position.set(pos.x, y0 + .03, pos.z); this.spawn(sc);
        this.tween(2, u => { sc.material.opacity = .6 * (1 - u); }, () => this.kill(sc), 2.5);
      }
      this.plume(pos, s, 2.2);
      for (let i = 0; i < 28; i++) { // yerde yayılan şok toz/köpük halkası
        const a = i / 28 * 6.283 + rnd(-.1, .1), sp = rnd(3.5, 5.5) * s;
        this.pnorm.emit({ x: pos.x, y: y0 + .1, z: pos.z, vx: Math.cos(a) * sp, vy: rnd(.1, .4), vz: Math.sin(a) * sp, life: rnd(.7, 1.1), s0: .4 * s, s1: 1.1 * s, c0: o.water ? [.95, .98, 1] : [.62, .57, .48], c1: o.water ? [.75, .88, 1] : [.46, .42, .36], a0: .45, a1: 0, drag: 3.2 });
      }
      if (s >= .6) { // art arda ikincil patlamalar
        this.at(.16, () => { for (let i = 0; i < 9; i++) this.pfire.emit({ x: pos.x + rnd(-.6, .6) * s, y: y0 + rnd(.2, .8), z: pos.z + rnd(-.6, .6) * s, vx: rnd(-1, 1), vy: rnd(1, 3), vz: rnd(-1, 1), life: rnd(.3, .6), s0: .6 * s, s1: 1.5 * s, c0: [1, .85, .45], c1: [.9, .22, .05], a0: .85, a1: 0, drag: 2 }); this.flash(pos, 0xff9030, 45 * s, .25); });
        this.at(.34, () => { for (let i = 0; i < 14; i++) this.padd.emit({ x: pos.x + rnd(-.4, .4) * s, y: y0 + .5, z: pos.z + rnd(-.4, .4) * s, vx: rnd(-3, 3) * s, vy: rnd(3, 7) * s, vz: rnd(-3, 3) * s, life: rnd(.6, 1.1), s0: .07 * s, s1: .02, c0: [1, .8, .4], c1: [1, .3, .08], a0: 1, a1: 0, gy: -9 }); });
      }
      if (!o.water && s >= .8) this.hitStop(.14, .2);
      this.flash(pos, 0xffa040, 90 * s, .5); this.shake(.55 * s);
    }
    splash(pos, s) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * 6.283, r = rnd(.2, 1) * s;
        this.pnorm.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * r, vy: rnd(2, 4.5) * s, vz: Math.sin(a) * r, life: rnd(.5, .9), s0: .25 * s, s1: .6 * s, c0: [.95, .98, 1], c1: [.65, .82, .96], a0: .75, a1: 0, gy: -9 });
      }
      this.ringFx(pos, 0xcfe8ff, 1.2 * s, .6);
    }
    waterBlast(pos, s) {
      s = s || 1;
      const col = new T.Mesh(this.shared.columnGeo, new T.MeshBasicMaterial({ map: this.gradTex, color: 0xeaf6ff, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
      col.position.set(pos.x, pos.y, pos.z); this.spawn(col);
      this.tween(1.1, u => {
        const rise = u < .3 ? E.out(u / .3) : 1 - .4 * (u - .3) / .7, w = (.9 + 1.4 * E.out(u)) * s;
        col.scale.set(w, Math.max(.01, 5.2 * s * rise), w); col.rotation.y = u * 2; col.material.opacity = .85 * (1 - u * u);
      }, () => this.kill(col));
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * 6.283, r = rnd(0, .3) * s;
        this.pnorm.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * r * 3, vy: rnd(5.5, 10) * s, vz: Math.sin(a) * r * 3, life: rnd(1, 1.7), s0: .6 * s, s1: rnd(1.3, 1.9) * s, c0: [.94, .98, 1], c1: [.62, .8, .95], a0: .8, a1: 0, gy: -9, drag: .8 });
      }
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * 6.283, r = rnd(2, 5) * s;
        this.padd.emit({ x: pos.x, y: pos.y + .2, z: pos.z, vx: Math.cos(a) * r, vy: rnd(4, 9) * s, vz: Math.sin(a) * r, life: rnd(.7, 1.3), s0: .1 * s, s1: .03, c0: [.9, .97, 1], c1: [.5, .75, 1], a0: 1, a1: 0, gy: -9 });
      }
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * 6.283, r = rnd(.2, 1.4) * s;
        this.pfire.emit({ x: pos.x, y: pos.y + .25, z: pos.z, vx: Math.cos(a) * r, vy: rnd(1, 3) * s, vz: Math.sin(a) * r, life: rnd(.4, .7), s0: .7 * s, s1: 1.6 * s, c0: [1, .85, .4], c1: [.9, .25, .05], a0: .9, a1: 0, drag: 2 });
      }
      for (let i = 0; i < 8; i++) this.pnorm.emit({ x: pos.x, y: pos.y + .4, z: pos.z, vx: rnd(-.6, .6), vy: rnd(1, 2) * s, vz: rnd(-.6, .6), life: rnd(1.5, 2.5), s0: .7 * s, s1: 2.2 * s, c0: [.3, .3, .33], c1: [.12, .12, .14], a0: .5, a1: 0, gy: .3, drag: 1 });
      this.ringFx(pos, 0xcfe8ff, 3.4 * s, .8); this.ringFx(pos, 0x9fd0ff, 5.2 * s, 1.05, .15);
      this.at(.55, () => { this.ringFx(pos, 0xcfe8ff, 2.6 * s, .8); this.splash(pos, 1.3 * s); });
      this.flash(pos, 0xbfe0ff, 70 * s, .4); this.shake(.5 * s);
    }
    fireOn(follow, offset, dur, onEnd) {
      const t0 = this.time, off = offset || new T.Vector3(), wp = new T.Vector3();
      let stop = null;
      stop = this.ticker((dt, now) => {
        if (now - t0 > dur) { stop(); if (onEnd) onEnd(); return; }
        const fade = 1 - (now - t0) / dur; follow.getWorldPosition(wp); this.root.worldToLocal(wp);
        for (let n = emitCount(30 * (.35 + .65 * fade), dt); n > 0; n--) this.pfire.emit({ x: wp.x + off.x + rnd(-.14, .14), y: wp.y + off.y, z: wp.z + off.z + rnd(-.14, .14), vx: rnd(-.2, .2), vy: rnd(.8, 1.8), vz: rnd(-.2, .2), life: rnd(.35, .7), s0: .5, s1: .12, c0: [1, .82, .35], c1: [.9, .2, .05], a0: .85 * fade, a1: 0 });
        for (let n = emitCount(10, dt); n > 0; n--) this.pnorm.emit({ x: wp.x + off.x, y: wp.y + off.y + .25, z: wp.z + off.z, vx: rnd(-.25, .25), vy: rnd(.9, 1.8), vz: rnd(-.25, .25), life: rnd(1.6, 2.6), s0: .35, s1: 1.3, c0: [.26, .26, .28], c1: [.12, .12, .14], a0: .5 * fade, a1: 0, gy: .2 });
        if (Math.random() < dt * 4) this.padd.emit({ x: wp.x + off.x, y: wp.y + off.y, z: wp.z + off.z, vx: rnd(-.5, .5), vy: rnd(1.5, 3), vz: rnd(-.5, .5), life: rnd(.6, 1.1), s0: .06, s1: .02, c0: [1, .7, .3], c1: [.8, .2, .05], a0: 1, a1: 0, gy: -2 });
      });
    }
    /* V166: KURBAN BİRLİK — yenilgide bizim 3B birliklerimiz (tank, piyade, uçak, füze kamyonu) karşı sahnenin mermisiyle vurulup patlar.
       list: v60.js'in verdiği paylaşılan dizi (yoksa hiçbir şey yapılmaz). o.pos(ahead) → yerel konum; o.die() → yok etme efekti.
       Birlik en az bir kez ateş etmeden (arm) ölmez; vuruş daha erken gelirse ilk atıştan hemen sonra patlar. */
    regVictim(list, o) {
      if (!list) return null;
      const v = { fx: this, alive: true, claimed: false, ready: false, pend: false, mobile: !!o.mobile };
      v.sample = ahead => {
        const p = o.pos(ahead || 0);
        try { if (this.root.updateWorldMatrix) this.root.updateWorldMatrix(true, false); else this.root.updateMatrixWorld(); } catch (e) { }
        return { w: this.root.localToWorld(new T.Vector3(p.x, 0, p.z)), h: p.y };
      };
      v.die = () => { if (!v.alive) return; if (!v.ready) { v.pend = true; return; } v.alive = false; o.die(); };
      v.arm = () => { if (v.ready) return; v.ready = true; if (v.pend) { v.pend = false; this.at(.3, () => v.die()); } };
      v.gone = () => { v.alive = false; };
      list.push(v); return v;
    }
    wreck(pos, k, ground) { // V166: yok edilen birlik: enkaz, yangın, duman
      const K = (k || 1) * this.projK, gp = ground || pos;
      this.debris(gp, K); this.dust(gp, 1.2 * K, 10); this.flash(pos, 0xffa040, 60, .35); this.shake(.3); this.ringFx(gp, 0xffd9a0, 2.6 * K, .5);
      const h = new T.Object3D(); h.position.copy(gp); this.spawn(h); this.fireOn(h, new T.Vector3(0, .25 * K, 0), 3.5, () => this.kill(h));
      this.plume(gp, .7 * K, 2.4);
    }
    flinch(obj) {
      if (!obj || obj.userData.dead) return;
      if (obj.userData.tiers) { const q = this.root.worldToLocal(obj.getWorldPosition(new T.Vector3())); q.y += .6; this.dust(q, .5, 5); } // taş tozu
      let f = obj.userData.fx; if (!f) f = obj.userData.fx = { base: obj.position.clone(), scale: obj.scale.clone(), n: 0 };
      f.n++;
      this.tween(.4, u => {
        const k = (1 - u) * .08, p = 1 + .06 * (1 - u);
        obj.position.set(f.base.x + rnd(-k, k), f.base.y, f.base.z + rnd(-k, k)); obj.scale.set(f.scale.x * p, f.scale.y * (2 - p), f.scale.z * p);
      }, () => { if (--f.n <= 0) { obj.position.copy(f.base); obj.scale.copy(f.scale); delete obj.userData.fx; } });
    }
    collapse(obj) {
      if (!obj || obj.userData.dead) return;
      if (obj.userData.tiers) return this.crumble(obj);
      obj.userData.dead = true;
      const mats = [];
      obj.traverse(m => { if (m.isMesh && m.material) { m.material = m.material.clone(); mats.push({ m: m.material, c: m.material.color.clone() }); if (m.material.emissive) m.material.emissive.setHex(0); } });
      const f = obj.userData.fx, b = f ? f.base.clone() : obj.position.clone(), s0 = f ? f.scale.clone() : obj.scale.clone();
      const wp = this.root.worldToLocal(obj.getWorldPosition(new T.Vector3()));
      const rz = rnd(.1, .2) * (Math.random() < .5 ? -1 : 1), rx = rnd(-.08, .08);
      this.dust(wp, 1.6, 14); this.debris(wp, .9); this.flash(wp, 0xffa040, 40, .3);
      this.tween(1.3, (u, dt) => {
        const e = E.out(u), sh = u < .18 ? Math.sin(u * 80) * .04 * (1 - u / .18) : 0;
        obj.scale.set(s0.x * (1 + .1 * e), Math.max(.001, s0.y * (1 - .82 * e)), s0.z * (1 + .1 * e));
        obj.position.set(b.x + sh, b.y - .06 * e, b.z); obj.rotation.z = rz * e; obj.rotation.x = rx * e;
        mats.forEach(o => o.m.color.copy(o.c).multiplyScalar(1 - .72 * e));
        if (u < .7) for (let n = emitCount(36, dt); n > 0; n--) { const a = Math.random() * 6.283, r = rnd(.2, .7); this.pnorm.emit({ x: wp.x + Math.cos(a) * r, y: wp.y + .1, z: wp.z + Math.sin(a) * r, vx: Math.cos(a) * .8, vy: rnd(.4, 1.2), vz: Math.sin(a) * .8, life: rnd(.8, 1.4), s0: .4, s1: 1.2, c0: [.58, .54, .48], c1: [.4, .38, .35], a0: .5, a1: 0, drag: 1.5 }); }
      });
      const holder = new T.Object3D(); holder.position.copy(wp); this.spawn(holder);
      this.fireOn(holder, new T.Vector3(0, .25, 0), 4.5, () => this.kill(holder));
      this.plume(wp, .8, 2.6);
    }
    shell(a, b, sc, onHit, dud) {
      const m = new T.Group();
      const mt = std(0xffd36b, { emissive: 0xffa030, emissiveIntensity: .8, roughness: .4 });
      const cb = cy(.05, .05, .3, 8, mt); cb.rotation.x = Math.PI / 2; m.add(cb);
      const cn = new T.Mesh(new T.ConeGeometry(.05, .14, 8), mt); cn.rotation.x = Math.PI / 2; cn.position.z = .22; m.add(cn);
      const K = this.projK; m.scale.setScalar(Math.max(.8, sc) * K); this.spawn(m);
      const dist = Math.hypot(b.x - a.x, b.z - a.z), dur = .5 + dist * .055, h = 1 + dist * .13;
      const pt = u => new T.Vector3(lerp(a.x, b.x, u), lerp(a.y, b.y, u) + 4 * h * u * (1 - u), lerp(a.z, b.z, u));
      let prev = null;
      const frD = dud ? .6 : 1;   // V164: dud → mermi yolun %60'ında havada söner, hedefe düşmez
      this.tween(dur * frD, u0 => {
        const u = u0 * frD;
        const p = pt(u), d = pt(Math.min(1, u + .03)).sub(p), q0 = prev || p;
        m.position.copy(p); if (d.lengthSq() > 1e-8) m.quaternion.setFromUnitVectors(ZAX(), d.normalize());
        const n = Math.max(1, Math.ceil(q0.distanceTo(p) / .1));
        for (let i = 1; i <= n; i++) {
          const k = i / n, x = lerp(q0.x, p.x, k), y = lerp(q0.y, p.y, k), z = lerp(q0.z, p.z, k);
          this.pfire.emit({ x: x, y: y, z: z, life: rnd(.15, .26), s0: .3 * K, s1: .08 * K, c0: [1, .85, .45], c1: [1, .35, .08], a0: .9, a1: 0 });
          this.pnorm.emit({ x: x, y: y, z: z, vy: .25, life: rnd(.8, 1.3), s0: .12 * K, s1: .5 * K, c0: [.72, .72, .74], c1: [.42, .42, .45], a0: .38, a1: 0 });
        }
        this.padd.emit({ x: p.x, y: p.y, z: p.z, life: .07, s0: .6 * K, s1: .4 * K, c0: [1, .95, .7], c1: [1, .7, .3], a0: .9, a1: 0 });
        prev = p;
      }, () => { this.kill(m); if (dud) this.fizzle(pt(frD)); else onHit(); });
    }

    /* ----- v5: model animasyonu + kule çökmesi ----- */
    animateModel(obj) { // userData.anim(now) olan modeller (kule bayrağı/meşale) için; sahneden çıkınca kendiliğinden durur
      if (!obj || !obj.userData.anim) return obj;
      let stop = null;
      stop = this.ticker((dt, now) => { if (!isAttached(obj)) { stop(); return; } obj.userData.anim(now); });
      return obj;
    }
    crumble(obj) { // kule: üst kat önce devrilir, orta kat çöker, alt kat ezilir
      obj.userData.dead = true;
      const mats = [];
      obj.traverse(m => { if (m.userData && m.userData.flame) m.visible = false; if (m.isMesh && m.material) { m.material = m.material.clone(); mats.push({ m: m.material, c: m.material.color.clone() }); if (m.material.emissive) m.material.emissive.setHex(0); } });
      const tiers = obj.userData.tiers, wp = this.root.worldToLocal(obj.getWorldPosition(new T.Vector3())), sc = obj.scale.x, sg = Math.random() < .5 ? -1 : 1;
      const info = tiers.map(t => ({ g: t.g, p: t.g.position.clone(), s: t.g.scale.clone() }));
      this.dust(wp, 1.8, 14); this.flash(wp, 0xffa040, 40, .3); this.shake(.3);
      [[2, 0, 1.15, 1.5], [1, .4, 1.0, .75], [0, .8, .9, 0]].forEach((pl, n) => { // [kat, gecikme, süre, devrilme]
        const t = info[pl[0]], dir = sg * (n % 2 ? -1 : 1), drop = pl[0] === 0 ? 0 : t.p.y - .06;
        this.tween(pl[2], u => {
          const a = u * u, e = E.out(u);
          t.g.position.set(t.p.x + dir * (.5 - n * .15) * e, t.p.y - drop * a, t.p.z);
          t.g.rotation.z = -dir * pl[3] * a; t.g.scale.set(t.s.x * (1 + .1 * e), t.s.y * (1 - (pl[0] === 0 ? .55 : .3) * e), t.s.z * (1 + .1 * e));
        }, () => {
          const q = new T.Vector3(wp.x + dir * .5 * sc, wp.y, wp.z);
          this.dust(q, 1.5, 12); this.debris(q, .8); this.shake(.4 - n * .1); this.flash(q, 0xffa040, 30, .2);
        }, pl[1]);
      });
      this.tween(2.2, u => { const k = 1 - .7 * E.out(u); mats.forEach(o => o.m.color.copy(o.c).multiplyScalar(k)); }, null, .2);
      const holder = new T.Object3D(); holder.position.copy(wp); this.spawn(holder);
      this.fireOn(holder, new T.Vector3(0, .3, 0), 5, () => this.kill(holder));
      this.plume(wp, 1, 3);
    }

    /* ----- gemi ----- */
    createShip(o) {
      o = Object.assign({ color: 0x3b82f6, scale: .9, heading: 0, appear: true }, o || {});
      const pos = V(o.pos), sc = o.scale, b = buildShip(o.color);
      const outer = new T.Group(); outer.position.copy(pos); outer.rotation.y = o.heading; outer.add(b.inner); outer.scale.setScalar(o.appear ? .001 : sc);
      this.spawn(outer);
      const sh = { flag: b.flagSegs, guns: b.guns, outer: outer, inner: b.inner, mount: b.mount, mountZ: b.mountZ, mouths: b.mouths, radar: b.radar, stern: b.stern, scale: sc, sinkY: 0, roll: 0, pitch: 0, dip: 0, hitRoll: 0, sunk: false, stop: null };
      const ph = Math.random() * 6; let lx = pos.x, lz = pos.z; const fnl = new T.Vector3();
      sh.stop = this.ticker((dt, now) => {
        const w = this.waveY(outer.position.x, outer.position.z, now);
        // gövde dalga yüzeyine oturur: baş/kıç ve iki yan yükseklikten yunuslama + yalpa
        const hy0 = outer.rotation.y, fx0 = Math.sin(hy0), fz0 = Math.cos(hy0), k0 = Math.max(.3, outer.scale.x), ox = outer.position.x, oz = outer.position.z;
        const wb = this.waveY(ox + fx0 * 1.6 * k0, oz + fz0 * 1.6 * k0, now), ws = this.waveY(ox - fx0 * 1.6 * k0, oz - fz0 * 1.6 * k0, now);
        const wl = this.waveY(ox + fz0 * .5 * k0, oz - fx0 * .5 * k0, now), wr = this.waveY(ox - fz0 * .5 * k0, oz + fx0 * .5 * k0, now);
        b.inner.position.y = w * .8 + sh.sinkY + sh.dip;
        b.inner.rotation.z = sh.roll + sh.hitRoll + Math.atan2(wl - wr, k0) * 2.5 + Math.sin(now * 1.3 + ph) * .015;
        b.inner.rotation.x = sh.pitch - Math.atan2(wb - ws, 3.2 * k0) * 2.5 + Math.sin(now * 1.1 + ph) * .01;
        if (sh.flag) sh.flag.forEach((sg, i) => { sg.rotation.y = Math.sin(now * 9 - i * 1.1 + ph) * .3 + (i ? 0 : .1); });
        sh.dip *= Math.exp(-dt * 4); sh.radar.rotation.y += dt * 3;
        if (!sh.sunk && outer.scale.x > .3) { // baca dumanı
          b.funnel.getWorldPosition(fnl); this.root.worldToLocal(fnl);
          for (let n = emitCount(7, dt); n > 0; n--) this.pnorm.emit({ x: fnl.x + rnd(-.03, .03), y: fnl.y, z: fnl.z + rnd(-.03, .03), vx: rnd(-.06, .06) - Math.sin(outer.rotation.y) * .08, vy: rnd(.35, .6), vz: rnd(-.06, .06) - Math.cos(outer.rotation.y) * .08, life: rnd(1.4, 2.2), s0: .1 * sh.scale, s1: .55 * sh.scale, c0: [.42, .42, .44], c1: [.24, .24, .27], a0: .32, a1: 0, drag: .5, gy: .1 });
        }
        const px = outer.position.x, pz = outer.position.z, v = dt > 0 ? Math.hypot(px - lx, pz - lz) / dt : 0; lx = px; lz = pz;
        if (v > .35 && !sh.sunk) { // gemi hareket ederken baş dalgası + arka iz
          const hy = outer.rotation.y, fx = Math.sin(hy), fz = Math.cos(hy), s2 = outer.scale.x;
          for (let n = emitCount(v * 16, dt); n > 0; n--) {
            const sd = Math.random() < .5 ? -1 : 1;
            this.pnorm.emit({ x: px + fx * 1.55 * s2 + fz * sd * .12, y: .04, z: pz + fz * 1.55 * s2 - fx * sd * .12, vx: fz * sd * rnd(.5, 1.1), vy: rnd(.3, .8), vz: -fx * sd * rnd(.5, 1.1), life: rnd(.5, .8), s0: .12, s1: .34, c0: [1, 1, 1], c1: [.8, .9, 1], a0: .7, a1: 0, gy: -2 });
            this.pnorm.emit({ x: px - fx * 1.75 * s2 + rnd(-.1, .1), y: .03, z: pz - fz * 1.75 * s2 + rnd(-.1, .1), vx: fz * sd * .25, vz: -fx * sd * .25, life: rnd(1, 1.5), s0: .22, s1: .75, c0: [.95, .98, 1], c1: [.7, .86, 1], a0: .5, a1: 0, drag: 1.2 });
          }
        }
      });
      if (o.appear) {
        this.deploy(pos, 1.3 * sc, o.color, 3.6 * sc);
        this.tween(.8, u => outer.scale.setScalar(sc * Math.max(.001, E.back(u))), null, .15);
      }
      return sh;
    }
    shipHit(sh, sign) {
      const sg = sign || (Math.random() < .5 ? -1 : 1), wp = this.root.worldToLocal(sh.inner.getWorldPosition(new T.Vector3()));
      this.tween(.9, u => { const k = Math.sin(u * Math.PI); sh.hitRoll = sg * .15 * k; sh.dip = -.13 * k; });
      for (let i = 0; i < 16; i++) this.padd.emit({ x: wp.x, y: .5, z: wp.z, vx: rnd(-3, 3), vy: rnd(2, 6), vz: rnd(-3, 3), life: rnd(.5, 1), s0: .08, s1: .02, c0: [1, .85, .4], c1: [1, .3, .08], a0: 1, a1: 0, gy: -9 });
      this.fireOn(sh.inner, new T.Vector3(0, .5, 0), 7);
    }
    shipSink(sh, remove) {
      const sg = Math.random() < .5 ? -1 : 1, wp = new T.Vector3(), pops = [.1, .35, .6].map(u => ({ u: u, done: false }));
      sh.sunk = true;
      this.tween(4.2, (u, dt) => {
        const e = E.io(u); sh.sinkY = -1.7 * e; sh.roll = sg * .55 * e; sh.pitch = .16 * e;
        sh.inner.getWorldPosition(wp); this.root.worldToLocal(wp);
        for (let n = emitCount(26 * (1 - u), dt); n > 0; n--) this.pnorm.emit({ x: wp.x + rnd(-.6, .6), y: .03, z: wp.z + rnd(-.6, .6), vy: .15, life: rnd(.8, 1.4), s0: .18, s1: .6, c0: [.95, .98, 1], c1: [.7, .85, 1], a0: .6, a1: 0 });
        for (const p of pops) if (!p.done && u >= p.u) { p.done = true; this.explosion(new T.Vector3(wp.x + rnd(-.5, .5), 0, wp.z + rnd(-.6, .6)), .42, { water: true }); }
      }, () => {
        const end = wp.clone(); end.y = 0; this.splash(end, 1.6); this.ringFx(end, 0xcfe8ff, 3, 1);
        const k0 = sh.scale, sl = new T.Mesh(this.shared.planeGeo, new T.MeshBasicMaterial({ color: 0x05080f, map: this.tex, transparent: true, opacity: 0, depthWrite: false }));
        sl.position.set(end.x, .03, end.z); this.spawn(sl);
        this.tween(6, u => { sl.scale.setScalar(k0 * (.8 + 1.8 * E.out(u))); sl.material.opacity = .5 * Math.min(1, u * 8) * (1 - u); }, () => this.kill(sl));
        const fl = [];
        for (let i = 0; i < 7; i++) { const m = new T.Mesh(this.shared.debrisGeo, this.shared.debrisMat), k = rnd(.08, .16); m.scale.set(k * rnd(1, 2), k * .5, k); this.spawn(m); const a = Math.random() * 6.283; fl.push({ m: m, a: a, r: rnd(.2, .8) * k0, v: rnd(.15, .4) * k0, ph: rnd(0, 6), rs: rnd(-1, 1) }); }
        this.tween(5.5, (u, dt) => fl.forEach(f => { const rr = f.r + f.v * u * 4; f.m.position.set(end.x + Math.cos(f.a) * rr, this.waveY(end.x, end.z, this.time) + .02 + Math.sin(this.time * 3 + f.ph) * .02, end.z + Math.sin(f.a) * rr); f.m.rotation.y += f.rs * dt; f.m.visible = u < .8 || Math.random() > (u - .8) * 5; }), () => fl.forEach(f => this.kill(f.m)));
        if (remove) { sh.stop && sh.stop(); this.kill(sh.outer); } else sh.outer.visible = false;
      });
    }

    /* ================================================================ SALDIRILAR ================================================================ */

    tankAttack(o) {
      o = Object.assign({ color: 0x3b82f6, scale: .8, shots: 2, gap: 1.25, linger: 1, destroy: true, blast: 1, advance: 1.1 }, o || {});
      const from = V(o.from), to = V(o.to), sc = o.scale, tk = buildTank(o.color), yaw = yawBetween(from, to);
      const fw = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), rt = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const fin = from.clone().addScaledVector(fw, o.advance * sc);
      const g = new T.Group(); g.position.copy(from); g.scale.setScalar(.001); g.add(tk.group);
      tk.group.rotation.order = 'YXZ'; tk.group.rotation.y = yaw;
      const ty0 = (Math.random() < .5 ? -1 : 1) * rnd(.9, 1.5); tk.turret.rotation.y = ty0;
      this.spawn(g); const shd = this.blob(from, 1.5 * sc);
      // anten yay-sönüm salınımı + egzoz dumanı
      let antA = 0, antV = 0, lgx = from.x, lgz = from.z; const exw = new T.Vector3();
      const stopAnt = this.ticker((dt, now) => {
        const vf = dt > 0 ? ((g.position.x - lgx) * fw.x + (g.position.z - lgz) * fw.z) / dt : 0; lgx = g.position.x; lgz = g.position.z;
        antV += (-90 * (antA + vf * .05) - 7 * antV) * dt; antA += antV * dt; tk.ant.rotation.x = antA; tk.ant.rotation.z = Math.sin(now * 3) * .02;
        if (g.scale.x > .3) { tk.exh.getWorldPosition(exw); this.root.worldToLocal(exw); for (let n = emitCount(9, dt); n > 0; n--) this.pnorm.emit({ x: exw.x, y: exw.y, z: exw.z, vx: rnd(-.1, .1), vy: rnd(.5, .9), vz: rnd(-.1, .1), life: rnd(.8, 1.3), s0: .06 * sc, s1: .3 * sc, c0: [.4, .4, .42], c1: [.25, .25, .27], a0: .35, a1: 0, gy: .15 }); }
      });
      let dead = false;   // V166: bizim tank vurulursa patlar
      const vic = this.regVictim(o.victim, { pos: () => new T.Vector3(g.position.x, g.position.y + .35 * sc, g.position.z), die: () => { dead = true; stopAnt(); const p = new T.Vector3(g.position.x, g.position.y + .3 * sc, g.position.z); this.explosion(p, .8); this.wreck(p, 1); this.kill(g); this.kill(shd); } });
      const dist = Math.hypot(to.x - fin.x, to.z - fin.z), elev = Math.min(.55, Math.max(.12, .1 + dist * .022));
      this.deploy(from, 1.1 * sc, o.color, 3.4 * sc);
      this.tween(.75, u => { g.scale.setScalar(sc * Math.max(.001, E.back(u))); g.position.y = from.y + (1 - E.out(u)) * 1.4 * sc; },
        () => { g.position.y = from.y; this.dust(from, 1.4 * sc, 14); this.ringFx(from, 0xe8e0d0, 2.4 * sc, .55); this.shake(.14); }, .15);
      this.tween(.5, u => { tk.group.position.y = Math.sin(u * 16) * .07 * (1 - u); tk.group.rotation.x = Math.sin(u * 12) * .03 * (1 - u); }, () => { tk.group.position.y = 0; tk.group.rotation.x = 0; }, .9);
      // ileri sürüş: tekerlekler döner, arkadan toz kalkar, sonunda frenleme
      let prevD = 0, trk = 0;
      this.tween(.85, (u, dt) => {
        const d = o.advance * sc * E.out(u), dd = d - prevD; prevD = d;
        g.position.x = from.x + fw.x * d; g.position.z = from.z + fw.z * d; shd.position.x = g.position.x; shd.position.z = g.position.z;
        const ang = dd / sc / .17; tk.wheels.forEach(w => { w.rotation.x += ang; }); trk += dd / sc; tk.setTrack(trk);
        tk.group.rotation.z = Math.sin(this.time * 31) * .008 * (1 - u); tk.turret.position.y = tk.turretY + Math.sin(this.time * 23) * .006 * (1 - u);
        for (let n = emitCount(dt > 0 ? dd / dt * 14 : 0, dt); n > 0; n--) this.pnorm.emit({ x: g.position.x - fw.x * 1.1 * sc + rt.x * rnd(-.8, .8) * sc, y: from.y + .1, z: g.position.z - fw.z * 1.1 * sc + rt.z * rnd(-.8, .8) * sc, vx: -fw.x * rnd(.2, 1), vy: rnd(.3, .8), vz: -fw.z * rnd(.2, 1), life: rnd(.8, 1.3), s0: .4 * sc, s1: 1.1 * sc, c0: [.66, .6, .5], c1: [.5, .46, .4], a0: .45, a1: 0, drag: 1.8 });
      }, () => {
        this.dust(new T.Vector3(g.position.x + fw.x * 1.1 * sc, from.y, g.position.z + fw.z * 1.1 * sc), .8 * sc, 6);
        this.tween(.6, u => { tk.group.rotation.x = .05 * Math.exp(-u * 4) * Math.cos(u * Math.PI * 3); }, () => { tk.group.rotation.x = 0; });
      }, 1.0);
      this.tween(.9, u => { const e = E.io(u); tk.turret.rotation.y = ty0 * (1 - e); tk.pivot.rotation.x = -elev * e; }, null, 1.1);
      const tipW = new T.Vector3(), tipS = new T.Vector3(), base = 2.45;
      const fire = i => {
        if (dead) return;
        g.updateMatrixWorld(true); tk.tip.getWorldPosition(tipW); const mz = this.root.worldToLocal(tipW.clone());
        const dir = new T.Vector3(to.x - fin.x, 0, to.z - fin.z).normalize().multiplyScalar(Math.cos(elev)); dir.y = Math.sin(elev); dir.normalize();
        this.muzzle(mz, dir, 1.4 * sc); this.shake(.22); antV += 6; this.ringFx(new T.Vector3(fin.x + fw.x * 1.4 * sc, fin.y, fin.z + fw.z * 1.4 * sc), 0xffe0b0, 1.8 * sc, .4);
        this.dust(new T.Vector3(fin.x + fw.x * 1.3 * sc, fin.y, fin.z + fw.z * 1.3 * sc), .9 * sc, 8);
        this.tween(.5, u => {
          const r = u < .12 ? u / .12 : Math.pow(1 - (u - .12) / .88, 2);
          tk.pivot.position.z = tk.pivotZ - .34 * r; tk.group.rotation.x = -.035 * r;
          g.position.x = fin.x - fw.x * .12 * sc * r; g.position.z = fin.z - fw.z * .12 * sc * r;
        });
        this.tween(1.3, (u, dt) => { tk.tip.getWorldPosition(tipS); this.root.worldToLocal(tipS); for (let n = emitCount(14 * (1 - u), dt); n > 0; n--) this.pnorm.emit({ x: tipS.x, y: tipS.y, z: tipS.z, vx: rnd(-.1, .1), vy: rnd(.3, .7), vz: rnd(-.1, .1), life: rnd(.8, 1.3), s0: .12, s1: .45, c0: [.7, .7, .72], c1: [.45, .45, .48], a0: .35, a1: 0 }); });
        if (vic) vic.arm();
        const ap = o.aim ? o.aim(i, 1.1) : null, tt = ap ? V(ap) : (o.tos && o.tos.length ? V(o.tos[i % o.tos.length]) : to);   // v6: hedefler dışarıdan verilebilir (hep hedef ülkenin içinde); V166: aim → karşı birlik
        this.shell(mz, tt, sc, () => {
          this.explosion(tt, o.blast);
          if (o.target) { if (i === o.shots - 1 && o.destroy) this.collapse(o.target); else this.flinch(o.target); }
          if (o.onHit) o.onHit(i);
        }, o.dud);
      };
      for (let i = 0; i < o.shots; i++) this.at(base + i * o.gap, () => fire(i));
      const flight = .5 + dist * .055, leave = base + (o.shots - 1) * o.gap + flight + o.linger;
      this.at(leave, () => {
        if (dead) return; if (vic) vic.gone();
        this.deploy(g.position, 1.1 * sc, o.color, 3.4 * sc);
        this.tween(.5, u => g.scale.setScalar(sc * Math.max(.001, 1 - E.io(u))), () => { stopAnt(); this.kill(g); this.kill(shd); if (o.onDone) o.onDone(); });
      });
      return { duration: leave + .6 };
    }

    infantryAttack(o) {
      o = Object.assign({ color: 0x3b82f6, scale: .9, count: 4, bursts: 2, perBurst: 6, linger: .8, blast: .8, destroy: false, advance: 1.4 }, o || {});
      const from = V(o.from), to = V(o.to), sc = o.scale, yaw = yawBetween(from, to);
      const fw = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), rt = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const form = [[0, 0], [-.8, -.55], [.8, -.55], [0, -1.1], [-1.6, -1.05], [1.6, -1.05]];
      const S = [];
      this.deploy(from, 1.4 * sc, o.color, 3 * sc);
      for (let i = 0; i < o.count; i++) {
        const f = form[i % form.length], m = buildSoldier(o.color, i), g = new T.Group();
        g.add(m.group); g.position.set(from.x + rt.x * f[0] * sc + fw.x * f[1] * sc, from.y, from.z + rt.z * f[0] * sc + fw.z * f[1] * sc);
        g.rotation.y = yaw + rnd(-.08, .08); g.scale.setScalar(.001); this.spawn(g);
        const s = { g: g, m: m, kick: 0, run: 0, aim: 0, rl: 0, by: .46, ph: rnd(0, 6), i: i, p0: g.position.clone(), crouch: i % 3 === 1, shd: this.blob(g.position, .4 * sc) }; S.push(s);
        this.tween(.5, u => g.scale.setScalar(sc * Math.max(.001, E.back(u))), null, .15 + i * .1);
      }
      let dead = false;   // V166: bizim piyade vurulursa patlar
      const sCen = () => { let x = 0, z = 0; S.forEach(q => { x += q.g.position.x; z += q.g.position.z; }); return new T.Vector3(x / S.length, from.y + .35 * sc, z / S.length); };
      const vic = this.regVictim(o.victim, { pos: sCen, die: () => { dead = true; const p = sCen(); this.explosion(p, .7); this.wreck(p, 1); S.forEach(q => { this.kill(q.g); this.kill(q.shd); }); } });
      const t0 = 2.1, burstT = o.perBurst * .115 + .65, fireTotal = o.bursts * burstT, tFinal = t0 + fireTotal + .35;
      // koşu: bacak döngüsü, sekme, ayak tozu
      this.tween(.8, (u, dt) => {
        const e = E.out(u), d = o.advance * sc * e;
        for (const s of S) {
          s.run = u < .7 ? 1 : 1 - (u - .7) / .3; s.ph += dt * 17 * s.run;
          s.g.position.set(s.p0.x + fw.x * d, s.p0.y, s.p0.z + fw.z * d); s.shd.position.x = s.g.position.x; s.shd.position.z = s.g.position.z;
          for (let n = emitCount(9 * s.run, dt); n > 0; n--) this.pnorm.emit({ x: s.g.position.x - fw.x * .1 + rnd(-.1, .1), y: from.y + .05, z: s.g.position.z - fw.z * .1 + rnd(-.1, .1), vx: -fw.x * .4, vy: rnd(.2, .5), vz: -fw.z * .4, life: rnd(.5, .9), s0: .12 * sc, s1: .42 * sc, c0: [.66, .6, .5], c1: [.5, .46, .4], a0: .4, a1: 0, drag: 1.5 });
        }
      }, () => S.forEach(s => { if (s.crouch) this.tween(.3, u => { const e = E.out(u); s.m.legs.scale.y = lerp(1, .55, e); s.by = lerp(.46, .26, e); }); this.tween(.3, u => { s.aim = E.out(u); }); }), 1.05);
      this.tween(tFinal + o.linger + 1.2, (u, dt) => {
        for (const s of S) {
          s.kick *= Math.exp(-dt * 16); const m = s.m, a = s.aim * (1 - .5 * s.rl), c = Math.cos(s.ph), sn = Math.sin(s.ph), r = s.run;
          m.legL.rotation.x = sn * .85 * r; m.legR.rotation.x = -sn * .85 * r;
          m.legL.userData.knee.rotation.x = Math.max(0, -c) * 1.15 * r; m.legR.userData.knee.rotation.x = Math.max(0, c) * 1.15 * r;
          m.group.position.y = Math.abs(c) * .06 * r;
          m.rifle.position.z = m.rifleZ - s.kick * .07; m.rifle.position.y = lerp(.3, .4, a); m.rifle.rotation.x = lerp(.55, 0, a) - s.kick * .05; m.rifle.rotation.z = s.rl * .45;
          m.aR.rotation.x = lerp(-.9, -1.35, a) - s.kick * .08; m.aL.rotation.x = lerp(-1, -1.45, a) - s.kick * .08;
          m.upper.position.y = s.by + Math.sin(this.time * 2.2 + s.g.id) * .006 + Math.abs(c) * .02 * r; m.upper.position.z = -s.kick * .03;
          m.upper.rotation.x = r * .22 + (1 - a) * .08 - s.kick * .05 + s.rl * .12; m.upper.rotation.y = sn * .1 * r;
          m.head.rotation.x = -m.upper.rotation.x * .75 + s.rl * .25; m.head.rotation.y = Math.sin(this.time * .9 + s.g.id) * .12 * (1 - r);
        }
      });
      const mzW = new T.Vector3();
      const shoot = (s, n, b) => {
        if (dead) return; if (vic) vic.arm();
        s.g.updateMatrixWorld(true); s.m.muzzle.getWorldPosition(mzW); const mz = this.root.worldToLocal(mzW.clone());
        const ap = o.aim ? o.aim(b, .3) : null, pp = !ap && o.pool && o.pool.length ? o.pool[(Math.random() * o.pool.length) | 0] : null, tp = ap ? new T.Vector3(ap.x + rnd(-.25, .25), ap.y + rnd(.05, .3), ap.z + rnd(-.25, .25)) : pp ? new T.Vector3(pp.x, pp.y + rnd(.05, .35), pp.z) : new T.Vector3(to.x + rnd(-.5, .5), to.y + rnd(.1, .6), to.z + rnd(-.5, .5)), d = tp.clone().sub(mz), len = d.length(); d.normalize();
        s.kick = 1; this.muzzle(mz, d, .42 * sc, Math.random() > .25);
        this.padd.emit({ x: mz.x, y: mz.y - .05, z: mz.z, vx: rt.x * rnd(1, 2), vy: rnd(1.5, 2.5), vz: rt.z * rnd(1, 2), life: .5, s0: .05, s1: .03, c0: [1, .85, .4], c1: [.8, .5, .2], a0: 1, a1: 0, gy: -9 });
        const tr = new T.Mesh(this.shared.tracerGeo, this.shared.tracerMat); tr.quaternion.setFromUnitVectors(ZAX(), d); tr.scale.setScalar(this.projK); tr.position.copy(mz); this.spawn(tr);
        const frT = o.dud ? .55 : 1;   // V164: dud → iz mermisi havada söner
        this.tween(len * frT / 50, u => tr.position.set(mz.x + d.x * len * u * frT, mz.y + d.y * len * u * frT, mz.z + d.z * len * u * frT), () => { this.kill(tr); if (o.dud) this.fizzle(tr.position); else this.puff(tp); });
        if (o.target && n % 5 === 0) this.flinch(o.target);
      };
      for (let b = 0; b < o.bursts - 1; b++) this.at(t0 + (b + 1) * burstT - .45, () => S.forEach(s => this.tween(.45, u => { s.rl = Math.sin(u * Math.PI); }, () => { s.rl = 0; }, rnd(0, .1)))); // şarjör değiştirme
      let n = 0;
      for (let b = 0; b < o.bursts; b++) {
        S.forEach(s => {
          const off = rnd(0, .25);
          for (let j = 0; j < o.perBurst; j++) { const k = n++; this.at(t0 + b * burstT + off + j * (.09 + rnd(0, .03)), () => shoot(s, k, b)); }
        });
      }
      if (o.aim && !o.dud) for (let b = 0; b < o.bursts; b++) this.at(t0 + (b + 1) * burstT - .05, () => {   // V166: karşı piyade her seri sonunda bizim birliğe isabet ettirir
        if (dead) return; const ap = o.aim(b, 0); this.explosion(ap ? V(ap) : to, o.blast); if (o.onHit) o.onHit(b);
      });
      this.at(tFinal, () => {
        if (o.dud || o.aim) return;   // V164: boşa atış, hedefte patlama yok
        if (o.blast) this.explosion(to, o.blast);
        if (o.target) { if (o.destroy) this.collapse(o.target); else this.flinch(o.target); }
        if (o.onHit) o.onHit(0);
      });
      const leave = tFinal + o.linger;
      this.at(leave, () => {
        if (dead) return; if (vic) vic.gone();
        this.deploy(S[0].g.position, 1.4 * sc, o.color, 3 * sc);
        this.tween(.5, u => S.forEach(s => s.g.scale.setScalar(sc * Math.max(.001, 1 - E.io(u)))), () => { S.forEach(s => { this.kill(s.g); this.kill(s.shd); }); if (o.onDone) o.onDone(); });
      });
      return { duration: leave + .6 };
    }

    /* v6: FÜZE ATAR SALDIRISI — çok küçük hedef ülkeler için. Saldıranın toprağında kamyon belirir, ayakları iner, rampa kalkar,
       minik füzeler hedef ülkenin içindeki noktalara (o.tos) düşer. */
    missileAttack(o) {
      o = Object.assign({ color: 0x3b82f6, scale: .85, missiles: 6, gap: .55, linger: 1.1, blast: 1, advance: 1.2, elev: 1.0 }, o || {});
      const from = V(o.from), to = V(o.to), sc = o.scale, yaw = yawBetween(from, to);
      const fw = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), rt = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const L = buildMissileLauncher(o.color), g = new T.Group();
      g.position.copy(from); g.scale.setScalar(.001); g.add(L.group); L.group.rotation.order = 'YXZ'; L.group.rotation.y = yaw;
      this.spawn(g); const shd = this.blob(from, 1.9 * sc);
      let antA = 0, antV = 0, lgx = from.x, lgz = from.z; const exw = new T.Vector3();
      const stopAnt = this.ticker((dt, now) => {
        const vf = dt > 0 ? ((g.position.x - lgx) * fw.x + (g.position.z - lgz) * fw.z) / dt : 0; lgx = g.position.x; lgz = g.position.z;
        antV += (-90 * (antA + vf * .05) - 7 * antV) * dt; antA += antV * dt; L.ant.rotation.x = antA; L.ant.rotation.z = Math.sin(now * 3) * .02;
        if (g.scale.x > .3) { L.exh.getWorldPosition(exw); this.root.worldToLocal(exw); for (let n = emitCount(7, dt); n > 0; n--) this.pnorm.emit({ x: exw.x, y: exw.y, z: exw.z, vx: rnd(-.1, .1), vy: rnd(.5, .9), vz: rnd(-.1, .1), life: rnd(.8, 1.3), s0: .06, s1: .4, c0: [.35, .35, .37], c1: [.2, .2, .22], a0: .35, a1: 0 }); }
      });
      // belirme (tank ile aynı ışın + düşüş) ve ileri sürüş
      this.deploy(from, 1.2 * sc, o.color, 3.4 * sc);
      this.tween(.75, u => { g.scale.setScalar(sc * Math.max(.001, E.back(u))); g.position.y = from.y + (1 - E.out(u)) * 1.4 * sc; },
        () => { g.position.y = from.y; this.dust(from, 1.5 * sc, 14); this.ringFx(from, 0xe8e0d0, 2.5 * sc, .55); this.shake(.14); }, .15);
      let prevD = 0;
      this.tween(.9, (u, dt) => {
        const d = o.advance * sc * E.out(u), dd = d - prevD; prevD = d;
        g.position.x = from.x + fw.x * d; g.position.z = from.z + fw.z * d; shd.position.x = g.position.x; shd.position.z = g.position.z;
        const ang = dd / sc / .25; L.wheels.forEach(w => { w.rotation.x += ang; });
        L.group.rotation.z = Math.sin(this.time * 29) * .006 * (1 - u);
        for (let n = emitCount(dt > 0 ? dd / dt * 12 : 0, dt); n > 0; n--) this.pnorm.emit({ x: g.position.x - fw.x * 1.6 * sc + rt.x * rnd(-.8, .8) * sc, y: from.y + .1, z: g.position.z - fw.z * 1.6 * sc + rt.z * rnd(-.8, .8) * sc, vx: -fw.x * rnd(.2, 1), vy: rnd(.3, .8), vz: -fw.z * rnd(.2, 1), life: rnd(.6, 1.1), s0: .15 * sc, s1: .7 * sc, c0: [.62, .57, .48], c1: [.5, .46, .4], a0: .45, a1: 0 });
      }, () => {
        L.group.rotation.z = 0; this.dust(new T.Vector3(g.position.x + fw.x * 1.5 * sc, from.y, g.position.z + fw.z * 1.5 * sc), .8 * sc, 6);
        this.tween(.6, u => { L.group.rotation.x = .04 * Math.exp(-u * 4) * Math.cos(u * Math.PI * 3); }, () => { L.group.rotation.x = 0; });
      }, 1.0);
      // ayaklar iner, rampa yükselir
      const tJ = 2.05, tR = 2.4, rackT = 1.0;
      this.at(tJ, () => {
        L.jacks.forEach(j => { j.visible = true; });
        this.tween(.45, u => { const e = E.out(u); L.jacks.forEach(j => { j.scale.y = Math.max(.001, e); }); L.group.position.y = -.02 * e; },
          () => this.dust(new T.Vector3(g.position.x - fw.x * 1.6 * sc, from.y, g.position.z - fw.z * 1.6 * sc), .8 * sc, 8));
      });
      this.tween(rackT, u => { L.rack.rotation.x = -o.elev * E.io(u); }, () => this.shake(.08), tR);
      // atış
      const n = Math.max(1, o.missiles | 0), tipA = new T.Vector3(), tipB = new T.Vector3(), base = tR + rackT + .35;
      let dead = false;   // V166: bizim füze kamyonu vurulursa patlar
      const vic = this.regVictim(o.victim, { pos: () => new T.Vector3(g.position.x, g.position.y + .4 * sc, g.position.z), die: () => { dead = true; stopAnt(); const p = new T.Vector3(g.position.x, g.position.y + .4 * sc, g.position.z); this.explosion(p, 1); this.wreck(p, 1.2); this.kill(g); this.kill(shd); } });
      const impact = i => { const ap = o.aim ? o.aim(i, 2) : null; return V(ap || (o.tos && o.tos.length ? o.tos[i % o.tos.length] : { x: to.x + rnd(-.8, .8), y: to.y, z: to.z + rnd(-.8, .8) })); };
      let farD = Math.hypot(to.x - from.x, to.z - from.z);
      if (o.tos) o.tos.forEach(p => { farD = Math.max(farD, Math.hypot(p.x - from.x, p.z - from.z)); });
      const launch = i => {
        if (dead) return; if (vic) vic.arm();
        const s = L.slots[i % L.slots.length];
        if (i > 0 && i % L.slots.length === 0) L.slots.forEach(q => { q.m.visible = true; });   // rampa yeniden yüklenir
        g.updateMatrixWorld(true); s.tip.getWorldPosition(tipA); s.aim.getWorldPosition(tipB);
        const mz = this.root.worldToLocal(tipA.clone()), dir = this.root.worldToLocal(tipB.clone()).sub(mz).normalize();
        s.m.visible = false;
        const tgt = impact(i), last = i === n - 1;
        const T0 = mz.clone(), hz = new T.Vector3(tgt.x - T0.x, 0, tgt.z - T0.z), dist = Math.max(2, hz.length()), hd = hz.clone().normalize();
        const P1 = T0.clone().addScaledVector(dir, Math.max(2.4, dist * .3)); P1.y += Math.max(2, dist * .35);   // V72: balistik yay — yüksek tepe, dik iniş
        const P2 = new T.Vector3(tgt.x - hd.x * dist * .03, tgt.y + Math.max(4, dist * .62), tgt.z - hd.z * dist * .03);
        const bez = (u, out) => { const k = 1 - u, a = k * k * k, b = 3 * k * k * u, c = 3 * k * u * u, d = u * u * u; return out.set(a * T0.x + b * P1.x + c * P2.x + d * tgt.x, a * T0.y + b * P1.y + c * P2.y + d * tgt.y, a * T0.z + b * P1.z + c * P2.z + d * tgt.z); };
        const dur = 1.25 + dist * .07;
        // çıkış efektleri: namlu alevi, arka püskürtme, toz, ışık
        this.muzzle(mz, dir, 1.3 * sc); this.flash(mz, 0xffc060, 28, .16); this.shake(.2);
        const bb = mz.clone().addScaledVector(dir, -2.1 * sc);
        for (let q = 0; q < 16; q++) this.pnorm.emit({ x: bb.x, y: bb.y, z: bb.z, vx: -dir.x * rnd(.6, 2.4) + rnd(-.9, .9), vy: -dir.y * rnd(.2, 1.4) + rnd(.1, .8), vz: -dir.z * rnd(.6, 2.4) + rnd(-.9, .9), life: rnd(.9, 1.6), s0: .25, s1: 1.0, c0: [.86, .86, .88], c1: [.52, .52, .56], a0: .55, a1: 0 });
        this.dust(new T.Vector3(g.position.x - fw.x * 1.5 * sc, from.y, g.position.z - fw.z * 1.5 * sc), 1.1 * sc, 8);
        this.tween(.5, u => { const r = u < .12 ? u / .12 : Math.pow(1 - (u - .12) / .88, 2); L.group.rotation.x = .03 * r; L.group.position.y = -.02 - .02 * r; });
        const K = this.projK, msc = sc * K; const ms = buildMissile(o.color); ms.group.scale.setScalar(msc); ms.group.position.copy(T0); this.spawn(ms.group);
        const pa = new T.Vector3(), pb = new T.Vector3(), tw = new T.Vector3(), prev = T0.clone();
        const frM = o.dud ? .5 : 1;   // V164: dud → füze yükselir, havada söner
        this.tween(dur * frM, u0 => {
          const u = u0 * frM;
          const s2 = .42 * u + .58 * u * u;   // hızlanan uçuş
          bez(Math.min(1, s2), pa); bez(Math.min(1, s2 + .02), pb);
          tw.copy(pb).sub(pa); if (tw.lengthSq() > 1e-9) { tw.normalize(); ms.group.quaternion.setFromUnitVectors(ZAX(), tw); }
          ms.group.position.copy(pa);
          const nn = Math.max(1, Math.ceil(prev.distanceTo(pa) / .18));
          for (let q = 1; q <= nn; q++) {
            const kk = q / nn, x = lerp(prev.x, pa.x, kk) - tw.x * .9 * msc, y = lerp(prev.y, pa.y, kk) - tw.y * .9 * msc, z = lerp(prev.z, pa.z, kk) - tw.z * .9 * msc;
            this.pfire.emit({ x: x, y: y, z: z, life: rnd(.12, .22), s0: .42 * msc + .15 * K, s1: .08, c0: [1, .88, .5], c1: [1, .35, .08], a0: .95, a1: 0 });
            this.pnorm.emit({ x: x, y: y, z: z, vy: .2, life: rnd(1.2, 1.9), s0: .16 * msc + .1 * K, s1: .8 * msc + .35 * K, c0: [.86, .86, .9], c1: [.55, .55, .6], a0: .5, a1: 0 });
          }
          this.padd.emit({ x: pa.x - tw.x * .9 * msc, y: pa.y - tw.y * .9 * msc, z: pa.z - tw.z * .9 * msc, life: .07, s0: msc, s1: .5 * msc, c0: [1, .95, .7], c1: [1, .7, .3], a0: .9, a1: 0 });
          prev.copy(pa);
        }, () => {
          if (o.dud) { this.kill(ms.group); this.fizzle(pa); return; }
          this.kill(ms.group); this.explosion(tgt, o.blast * (last ? 1.25 : .5)); this.ringFx(tgt, 0xffd9a0, 1.6 * o.blast * K, .5);
          if (o.onHit) o.onHit(i);
        });
      };
      for (let i = 0; i < n; i++) this.at(base + i * o.gap, () => launch(i));
      const lastHit = base + (n - 1) * o.gap + 1.25 + farD * .07 + .5, leave = lastHit + o.linger + 1.3;
      this.at(leave - 1.2, () => {
        this.tween(.8, u => { L.rack.rotation.x = -o.elev * (1 - E.io(u)); });
        this.tween(.5, u => { const e = 1 - E.io(u); L.jacks.forEach(j => { j.scale.y = Math.max(.001, e); }); L.group.position.y = -.02 * e; }, () => { L.jacks.forEach(j => { j.visible = false; }); }, .5);
      });
      this.at(leave, () => {
        if (dead) return; if (vic) vic.gone();
        this.deploy(g.position, 1.2 * sc, o.color, 3.4 * sc);
        this.tween(.5, u => g.scale.setScalar(sc * Math.max(.001, 1 - E.io(u))), () => { stopAnt(); this.kill(g); this.kill(shd); if (o.onDone) o.onDone(); });
      });
      return { duration: leave + .6 };
    }

    /* v7: HAVA SALDIRISI — uçaklar (varsayılan 2) hedefin üstünden alçalarak geçer, bombaları isabet noktalarına bırakır, yükselip uzaklaşır.
       planeAttack({ from, to, tos:[{x,y,z}..], color, scale, planes:2, bombs:2, blast })  — tos = isabet noktaları (hedef ülkenin içinde) */
    planeAttack(o) {
      o = Object.assign({ color: 0x3b82f6, scale: .95, planes: 2, bombs: 2, gap: .5, linger: 1, blast: 1, speed: 6.5 }, o || {});
      const from = V(o.from), to = V(o.to), sc = o.scale, yaw = yawBetween(from, to), K = this.projK;
      const fw = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), rt = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const nP = Math.max(1, o.planes | 0), nB = Math.max(1, o.bombs | 0), v = o.speed;
      const imp = i => V(o.tos && o.tos.length ? o.tos[i % o.tos.length] : { x: to.x + rnd(-.8, .8), y: to.y, z: to.z + rnd(-.8, .8) });
      const sOf = p => (p.x - from.x) * fw.x + (p.z - from.z) * fw.z, lOf = p => (p.x - from.x) * rt.x + (p.z - from.z) * rt.z;
      const H0 = 3.6, YL = 2.4, H1 = 6.2, tf = .45 + Math.sqrt(YL - .1) * .42;   // yerel yükseklikler; tf = bomba düşüş süresi
      // her uçağın bombaları, bırakma konumu (s) ve şeridi (lat)
      const P = [];
      let z0 = 1e9, z1 = -1e9;
      for (let k = 0; k < nP; k++) {
        const bl = [], lats = [];
        for (let j = 0; j < nB; j++) { const idx = k * nB + j, tg = imp(idx), sr = sOf(tg) - v * tf; bl.push({ idx, tg, sr }); lats.push(lOf(tg)); z0 = Math.min(z0, sr); z1 = Math.max(z1, sr); }
        P.push({ bl, lat: lats.reduce((a, b) => a + b, 0) / lats.length, out: k % 2 ? 1 : -1, d: .15 + k * o.gap });
      }
      const sA = Math.min(-4.5, z0 - 4), sB = z1 + 9, total = sB - sA, Tf = total / v;
      const cl = clamp01;
      const yy = s => s < z0 ? lerp(H0, YL, E.io(cl((s - sA) / Math.max(.01, z0 - sA)))) : s <= z1 ? YL : lerp(YL, H1, E.io(cl((s - z1) / Math.max(.01, sB - z1))));
      const veer = s => E.io(cl((s - z1 - .8) / Math.max(.01, sB - z1 - .8)));
      const posAt = (s, pl, out) => { const l = pl.lat + pl.out * 3.2 * veer(s); return out.set(from.x + fw.x * s + rt.x * l, from.y + yy(s), from.z + fw.z * s + rt.z * l); };
      let ends = 0, lastHit = 0;
      const deadP = [];   // V166: vurulan uçaklar
      const tmp0 = new T.Vector3(), tmp1 = new T.Vector3();
      P.forEach((pl, k) => {
        const M = buildPlane(o.color), g = new T.Group(); g.add(M.group); g.scale.setScalar(.001); M.group.rotation.order = 'YXZ';
        posAt(sA, pl, tmp0); g.position.copy(tmp0); g.visible = false; this.spawn(g);
        const shd = this.blob(from, 1.6 * sc); shd.visible = false;
        const tail = new T.Vector3(), wl = new T.Vector3(), wr = new T.Vector3();
        deadP[k] = false; const tS = this.time + pl.d;
        const vic = this.regVictim(o.victim, { mobile: true, pos: ahead => { const uu = clamp01((this.time + (ahead || 0) - tS) / Tf), out = new T.Vector3(); posAt(sA + uu * total, pl, out); return out; },
          die: () => { deadP[k] = true; const p = g.position.clone(), gp = new T.Vector3(p.x, 0, p.z); this.explosion(p, .9); this.wreck(p, 1, gp); this.kill(g); this.kill(shd); } });
        this.at(pl.d, () => { g.visible = true; this.ringFx(g.position, o.color, 2.4 * sc, .5); this.flash(g.position, o.color, 14, .3); });
        this.tween(Tf, (u, dt) => {
          if (deadP[k]) return;
          const s = sA + u * total; posAt(s, pl, tmp0); posAt(s + .4, pl, tmp1);
          const dx = tmp1.x - tmp0.x, dy = tmp1.y - tmp0.y, dz = tmp1.z - tmp0.z, hz = Math.hypot(dx, dz) || 1e-6, ya = Math.atan2(dx, dz), pa = Math.atan2(dy, hz);
          g.position.copy(tmp0); g.rotation.set(0, 0, 0);
          const vb = veer(s), bank = -pl.out * .7 * Math.sin(Math.PI * cl((s - z1 - .8) / Math.max(.01, sB - z1 - .8))) + Math.sin(this.time * 2.3 + k * 2) * .04;
          M.group.rotation.y = ya; M.group.rotation.x = -pa; M.group.rotation.z = bank;
          g.scale.setScalar(sc * Math.max(.001, E.out(cl(u / .07))) * Math.max(.001, 1 - E.io(cl((u - .92) / .08))));
          shd.visible = g.scale.x > .1; shd.position.set(tmp0.x, from.y + .02, tmp0.z); shd.scale.setScalar(1.6 * sc * 1.15 * (1 + tmp0.y * .05));
          // art yakıcı titreşimi
          const fk = 1 + rnd(-.15, .3); M.flame.scale.set(1, fk, 1); M.core.scale.set(1, fk * .9, 1);
          // egzoz dumanı + kanat ucu izleri (contrail)
          const cx = Math.sin(ya), cz = Math.cos(ya), rx = Math.cos(ya), rz = -Math.sin(ya);
          for (let n = emitCount(16, dt); n > 0; n--) this.pnorm.emit({ x: tmp0.x - cx * 1.4 * sc, y: tmp0.y + Math.sin(pa) * 1.4 * sc, z: tmp0.z - cz * 1.4 * sc, vx: rnd(-.08, .08), vy: rnd(.05, .2), vz: rnd(-.08, .08), life: rnd(.8, 1.3), s0: .1 * sc, s1: .5 * sc, c0: [.55, .55, .58], c1: [.32, .32, .35], a0: .35, a1: 0 });
          for (let n = emitCount(10, dt); n > 0; n--) this.padd.emit({ x: tmp0.x - cx * 1.6 * sc, y: tmp0.y, z: tmp0.z - cz * 1.6 * sc, life: .1, s0: .35 * sc, s1: .1 * sc, c0: [1, .85, .5], c1: [1, .45, .15], a0: .8, a1: 0 });
          if (g.scale.x > .3) for (const sg of [-1, 1]) for (let n = emitCount(18, dt); n > 0; n--) this.pnorm.emit({ x: tmp0.x + rx * sg * 1.28 * sc - cx * .6 * sc, y: tmp0.y, z: tmp0.z + rz * sg * 1.28 * sc - cz * .6 * sc, vx: 0, vy: .04, vz: 0, life: rnd(.9, 1.4), s0: .05 * sc, s1: .32 * sc, c0: [.96, .96, 1], c1: [.82, .84, .92], a0: .26, a1: 0 });
        }, () => { if (vic) vic.gone(); if (!deadP[k]) { this.kill(g); this.kill(shd); } if (k === nP - 1 && o.onDone) o.onDone(); }, pl.d);
        ends = Math.max(ends, pl.d + Tf);
        // bombaların bırakılması
        pl.bl.forEach((b, j) => {
          const tr = pl.d + (b.sr - sA) / v, last = k === nP - 1 && j === nB - 1; lastHit = Math.max(lastHit, tr + tf);
          this.at(tr, () => {
            if (deadP[k]) return; if (vic) vic.arm();
            const slot = M.bombs[j % M.bombs.length]; slot.visible = false;
            g.updateMatrixWorld(true); const R = new T.Vector3(); slot.getWorldPosition(R); this.root.worldToLocal(R);
            const ap = o.aim ? o.aim(b.idx, tf) : null, tgt = ap ? V(ap) : b.tg, msc = sc * K, ms = buildBomb(o.color); ms.scale.setScalar(msc); ms.position.copy(R); this.spawn(ms);
            for (let q = 0; q < 6; q++) this.pnorm.emit({ x: R.x, y: R.y, z: R.z, vx: rnd(-.2, .2), vy: rnd(.1, .4), vz: rnd(-.2, .2), life: rnd(.6, 1), s0: .08 * sc, s1: .3 * sc, c0: [.8, .8, .84], c1: [.55, .55, .6], a0: .4, a1: 0 });
            const pa = new T.Vector3(), pb = new T.Vector3(), tw = new T.Vector3(), prev = R.clone();
            const at = (u, out) => out.set(lerp(R.x, tgt.x, u), lerp(R.y, tgt.y, u * u), lerp(R.z, tgt.z, u));
            const frB = o.dud ? .3 : 1;   // V164: dud → bomba düşmez, kısa uçup havada söner
            this.tween(tf * frB, u0 => {
              const u = u0 * frB;
              at(u, pa); at(Math.min(1, u + .03), pb); tw.copy(pb).sub(pa); if (tw.lengthSq() > 1e-9) { tw.normalize(); ms.quaternion.setFromUnitVectors(ZAX(), tw); }
              ms.position.copy(pa);
              const nn = Math.max(1, Math.ceil(prev.distanceTo(pa) / .22));
              for (let q = 1; q <= nn; q++) { const kk = q / nn; this.pnorm.emit({ x: lerp(prev.x, pa.x, kk), y: lerp(prev.y, pa.y, kk) + .05, z: lerp(prev.z, pa.z, kk), life: rnd(.5, .9), s0: .05 * msc + .03 * K, s1: .3 * msc + .12 * K, c0: [.9, .9, .94], c1: [.6, .6, .65], a0: .3, a1: 0 }); }
              prev.copy(pa);
            }, () => {
              if (o.dud) { this.kill(ms); this.fizzle(pa); return; }
              this.kill(ms); this.explosion(tgt, o.blast * (last ? 1.3 : .8)); this.ringFx(tgt, 0xffd9a0, 1.8 * o.blast * K, .5);
              this.dust(tgt, 1.2 * K, 8); this.shake(last ? .26 : .16); this.flash(tgt, 0xffb050, 22, .3);
              if (o.onHit) o.onHit(b.idx);
            });
          });
        });
      });
      return { duration: Math.max(ends, lastHit + o.linger) + .6 };
    }

    navalAttack(o) {
      o = Object.assign({ color: 0x3b82f6, targetColor: 0xff5a47, scale: .9, torpedoes: 2, sink: true, advance: 1.2, linger: .8, runSpeed: 5.5 }, o || {});
      const from = V(o.from), to = V(o.to), sc = o.scale; from.y = 0; to.y = 0;
      const yawT = yawBetween(from, to), heading = o.attacker ? o.attacker.outer.rotation.y : yawT - .5;
      const A = o.attacker || this.createShip({ pos: from, heading: heading, color: o.color, scale: sc });   // V166: attacker → sahnedeki hazır gemi (karşı gemi)
      const own = !o.target, D = o.target || this.createShip({ pos: to, heading: yawT + Math.PI - .35, color: o.targetColor, scale: sc });
      const advDir = new T.Vector3(Math.sin(heading), 0, Math.cos(heading));
      if (!o.attacker) this.tween(1.2, (u, dt) => { const v = o.advance / 1.2 * (1 - u * .6); A.outer.position.x += advDir.x * v * dt; A.outer.position.z += advDir.z * v * dt; }, null, .4);
      const tAim = 1.7;
      this.at(tAim, () => {
        const rel = wrapPi(yawBetween(A.outer.position, D.outer.position) - heading), r0 = A.mount.rotation.y;
        const gt = A.guns[0].tur, g0 = gt.rotation.y;
        this.tween(.55, u => { A.mount.rotation.y = lerp(r0, rel, E.io(u)); gt.rotation.y = lerp(g0, rel, E.io(u)); });
      });
      const gw = new T.Vector3();
      const salvo = () => { // gemi topu: hedef gemiye ateş
        A.outer.updateMatrixWorld(true); A.guns[0].tip.getWorldPosition(gw); const mz = this.root.worldToLocal(gw.clone());
        const hit = new T.Vector3(D.outer.position.x + rnd(-.4, .4), .45, D.outer.position.z + rnd(-.4, .4)), d = hit.clone().sub(mz).normalize();
        this.muzzle(mz, d, .9 * sc); this.shake(.15); A.dip = -.07;
        const gb = A.guns[0].barrel; this.tween(.45, u => { gb.position.z = .5 - .2 * (u < .12 ? u / .12 : Math.pow(1 - (u - .12) / .88, 2)); });
        this.tween(.7, u => { A.hitRoll = -.035 * Math.sin(u * Math.PI * 2) * (1 - u); }, () => { A.hitRoll = 0; });
        this.shell(mz, hit, sc * .8, () => { this.explosion(hit, .4, { water: true }); D.dip = -.06; }, o.dud);
      };
      this.at(2.3, salvo); this.at(2.55, salvo);
      const dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz), runDur = Math.max(.5, (dist - 1.5 * sc - .55 * sc - o.advance * .6) / o.runSpeed);
      const tL0 = 2.4, tGap = .75, N = o.torpedoes;
      const launch = k => {
        A.outer.updateMatrixWorld(true);
        const m0 = this.root.worldToLocal(A.mouths[k % 2].getWorldPosition(new T.Vector3()));
        const aimY = A.outer.rotation.y + A.mount.rotation.y, dir = new T.Vector3(Math.sin(aimY), 0, Math.cos(aimY));
        const entry = new T.Vector3(m0.x + dir.x * 1.5 * sc, 0, m0.z + dir.z * 1.5 * sc);
        this.flash(m0, 0xffc060, 25, .12); this.shake(.1); A.dip = -.06;
        this.tween(.4, u => { A.mount.position.z = A.mountZ - .1 * (u < .15 ? u / .15 : Math.pow(1 - (u - .15) / .85, 2)); });
        this.padd.emit({ x: m0.x, y: m0.y, z: m0.z, life: .1, s0: .8, s1: 1.2, c0: [1, .95, .7], c1: [1, .6, .2], a0: 1, a1: 0 });
        for (let i = 0; i < 8; i++) this.pnorm.emit({ x: m0.x, y: m0.y, z: m0.z, vx: dir.x * rnd(.5, 2.4) + rnd(-.3, .3), vy: rnd(.2, .8), vz: dir.z * rnd(.5, 2.4) + rnd(-.3, .3), life: rnd(.8, 1.3), s0: .22, s1: .9, c0: [.82, .82, .84], c1: [.5, .5, .55], a0: .55, a1: 0, drag: 1.5 });
        const tp = buildTorpedo(o.color); tp.group.scale.setScalar(sc * 1.1); tp.group.position.copy(m0); this.spawn(tp.group);
        this.tween(.32, u => {
          tp.group.position.set(lerp(m0.x, entry.x, u), lerp(m0.y, 0, u) + Math.sin(u * Math.PI) * .18, lerp(m0.z, entry.z, u));
          tp.group.quaternion.setFromUnitVectors(ZAX(), new T.Vector3(dir.x, -(.05 + .5 * u), dir.z).normalize());
        }, () => {
          this.splash(entry, .9);
          const dr = new T.Vector3(D.outer.position.x - entry.x, 0, D.outer.position.z - entry.z); dr.normalize();
          const end = new T.Vector3(D.outer.position.x - dr.x * .55 * D.scale, 0, D.outer.position.z - dr.z * .55 * D.scale);
          const len = Math.max(.3, Math.hypot(end.x - entry.x, end.z - entry.z)) * (o.dud ? .5 : 1), rdur = len / o.runSpeed, side = new T.Vector3(-dr.z, 0, dr.x);
          let pl = entry.clone();
          tp.group.quaternion.setFromUnitVectors(ZAX(), dr);
          this.tween(rdur, (u, dt) => {
            const wob = Math.sin(u * 14) * .03;
            tp.group.position.set(entry.x + dr.x * len * u + side.x * wob, -.14, entry.z + dr.z * len * u + side.z * wob);
            tp.spin.rotation.z += dt * 12;
            const p = tp.group.position, nn = Math.max(1, Math.ceil(pl.distanceTo(p) / .12));
            for (let i = 1; i <= nn; i++) {
              const k2 = i / nn, qx = lerp(pl.x, p.x, k2), qz = lerp(pl.z, p.z, k2);
              this.pnorm.emit({ x: qx - dr.x * .38, y: .04, z: qz - dr.z * .38, vx: rnd(-.1, .1), vy: .05, vz: rnd(-.1, .1), life: 1.1, s0: .14, s1: .4, c0: [1, 1, 1], c1: [.72, .87, 1], a0: .7, a1: 0, drag: 1 });
              for (const sg of [-1, 1]) this.pnorm.emit({ x: qx - dr.x * .55 + side.x * sg * .13, y: .03, z: qz - dr.z * .55 + side.z * sg * .13, vx: side.x * sg * .4, vz: side.z * sg * .4, life: .9, s0: .1, s1: .3, c0: [.92, .97, 1], c1: [.7, .85, 1], a0: .45, a1: 0, drag: 1.5 });
              if (Math.random() < .5) this.padd.emit({ x: qx - dr.x * .45, y: .02, z: qz - dr.z * .45, vy: rnd(.2, .6), life: rnd(.3, .6), s0: .05, s1: .02, c0: [.9, .97, 1], c1: [.6, .8, 1], a0: .8, a1: 0 });
            }
            pl = p.clone();
          }, () => {
            if (o.dud) { this.splash(new T.Vector3(tp.group.position.x, 0, tp.group.position.z), .5); this.kill(tp.group); return; }   // V164: torpido hedefe varmadan söner
            this.kill(tp.group); this.waterBlast(new T.Vector3(end.x, 0, end.z), 1.15); this.shipHit(D, k % 2 ? 1 : -1);
            if (o.onHit) o.onHit(k);
            if (k === N - 1 && o.sink) this.shipSink(D, own);
          });
        });
      };
      for (let k = 0; k < N; k++) this.at(tL0 + k * tGap, () => launch(k));
      const lastHit = tL0 + (N - 1) * tGap + .32 + runDur, leave = lastHit + o.linger + 1;
      if (!o.keep) this.at(leave, () => {   // V166: keep → gemi sahne bitene dek kalır (karşı gemi onu batırabilsin)
        this.deploy(A.outer.position, 1.3 * sc, o.color, 3.6 * sc);
        this.tween(.6, u => A.outer.scale.setScalar(sc * Math.max(.001, 1 - E.io(u))), () => { A.stop && A.stop(); this.kill(A.outer); if (o.onDone) o.onDone(); });
      });
      return { duration: Math.max(leave + .7, lastHit + 4.6), targetShip: D, ownShip: A };
    }
  }

  WCBattleFX.models = { tank: buildTank, soldier: buildSoldier, ship: buildShip, torpedo: buildTorpedo, tower: buildTower, house: buildHouse, missile: buildMissile, missileLauncher: buildMissileLauncher, plane: buildPlane, bomb: buildBomb };
  G.WCBattleFX = WCBattleFX;
  if (typeof module !== 'undefined' && module.exports) module.exports = WCBattleFX;
})(typeof window !== 'undefined' ? window : globalThis);
