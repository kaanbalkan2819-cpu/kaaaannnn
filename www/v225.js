/* V225 — ATOM BOMBASI SAVAŞ SAHNESİ (savaş animasyonlarıyla aynı 3B sistem; görsel yok, her şey gerçek zamanlı model + shader)
   Akış: hedef ülkede şehir ve savunma birlikleri kurulur → kırmızı hedef halkası → uçaksavar ateşi altında ağır bombardıman uçağı + 2 eskort gelir →
   bomba bırakılır, düşer → havada patlama (parlama, ateş topu) → şok dalgası ilerledikçe evler yıkılır, tanklar/askerler savrulur →
   3B mantar bulutu yükselir, yerde toz eteği ve kavrulmuş toprak kalır.
   Küreye tepeden bakıldığı için bulut ve uçaklar LEAN açısıyla ekranın üstüne doğru yatırılır; böylece yandan görünür.
   v60.js (v60Nuke) bu dosyadaki WCNukeScene'i çağırır. */
(function () {
  'use strict';
  var LOW = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
  var LEAN = 62 * Math.PI / 180, cL = Math.cos(LEAN), sL = Math.sin(LEAN);
  function cl(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function eo(t) { return 1 - Math.pow(1 - cl(t), 3); }
  function ss(t) { t = cl(t); return t * t * (3 - 2 * t); }
  function snd(k, g) { try { return !!(window.WCSfx && WCSfx.anim && WCSfx.anim(k, g)); } catch (e) { return false; } }   /* V227 */

  /* ---------- kabaran bulut malzemesi: köşe gölgelendiricide karnabahar biçimli yer değiştirme, parçada ısı rampası ---------- */
  var VS = [
    'precision highp float;uniform float uT,uAmp,uFlow,uMorph,uBump;uniform vec2 uFq;attribute vec3 aS;attribute vec3 aSN;',
    'varying vec2 vUv;varying vec3 vN,vV,vSun;varying float vD,vY;',
    'float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float bl(vec3 p){float v=abs(2.*n(p)-1.);v+=.5*abs(2.*n(p*2.07+3.1)-1.);v+=.25*abs(2.*n(p*4.3+9.7)-1.);return v/1.75;}',
    'float rr;float D(vec2 q){float a=q.x*6.28318;return bl(vec3(cos(a)*uFq.x*rr,sin(a)*uFq.x*rr,q.y*uFq.y+uT*uFlow));}',
    'void main(){vUv=uv;vec3 N=normalize(mix(aSN,normal,uMorph));vec3 P=mix(aS,position,uMorph);rr=length(P.xz);',
    'float d=D(uv),e=.012;float du=D(uv+vec2(e,0.))-d,dv=D(uv+vec2(0.,e))-d;',
    'vec3 Tn=normalize(cross(N,vec3(.013,1.,.017)));vec3 Bn=cross(Tn,N);',
    'vec3 n2=normalize(N+(Tn*du-Bn*dv)*uBump/e);',
    'vD=d;vY=position.y;P+=N*(d-.32)*uAmp;vec4 mv=modelViewMatrix*vec4(P,1.);',
    'vN=normalize(normalMatrix*n2);vV=normalize(-mv.xyz);vSun=normalize(normalMatrix*vec3(-.45,.72,.62));gl_Position=projectionMatrix*mv;}'
  ].join('');
  var FS = [
    'precision highp float;uniform sampler2D uTex;uniform float uT,uFlow,uHeat,uCrack,uUnder,uAlpha;uniform vec3 uSmoke;',
    'varying vec2 vUv;varying vec3 vN,vV,vSun;varying float vD,vY;',
    'void main(){vec2 q=vUv*vec2(5.,3.)+vec2(0.,uT*uFlow*.12);float t1=texture2D(uTex,q).r,t2=texture2D(uTex,q*2.3+.37).r;',
    'float c=vD*.75+(t1*.62+t2*.38)*.42;vec3 N=normalize(vN);float nv=abs(dot(N,normalize(vV)));',
    'float s=clamp(dot(N,normalize(vSun))*.6+.42,0.,1.);',
    'vec3 sm=mix(uSmoke*.42,uSmoke*1.2,s)*(.74+c*.58);',
    'float T=uHeat*1.6-c*uCrack+uUnder*clamp(.25-vY,0.,1.);',
    'vec3 f=T<.33?mix(vec3(.45,.05,.01),vec3(1.,.27,.03),T/.33):T<.66?mix(vec3(1.,.27,.03),vec3(1.,.72,.2),(T-.33)/.33):mix(vec3(1.,.72,.2),vec3(1.,.98,.86),clamp((T-.66)/.34,0.,1.));',
    'vec3 col=mix(sm,f,smoothstep(.02,.24,T));float a=uAlpha*smoothstep(.03,.34,nv);if(a<.02)discard;gl_FragColor=vec4(col,a);}'
  ].join('');
  var noiseT = null;
  function noiseTex(T) {
    if (noiseT) return noiseT;
    var S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d'), im = x.createImageData(S, S), d = im.data, oct = [[4, .5], [8, .27], [16, .15], [32, .08]];
    var lat = oct.map(function (o) { var a = new Float32Array(o[0] * o[0]); for (var i = 0; i < a.length; i++) a[i] = Math.random(); return a; });
    for (var py = 0; py < S; py++) for (var px = 0; px < S; px++) {
      var v = 0;
      for (var k = 0; k < oct.length; k++) {
        var n = oct[k][0], fx = px / S * n, fy = py / S * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, A = lat[k];
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var a0 = A[ix % n + (iy % n) * n], b0 = A[(ix + 1) % n + (iy % n) * n], a1 = A[ix % n + ((iy + 1) % n) * n], b1 = A[(ix + 1) % n + ((iy + 1) % n) * n];
        v += (a0 + (b0 - a0) * tx + (a1 - a0 + (a0 - b0 + b1 - a1) * tx) * ty) * oct[k][1];
      }
      var j = (py * S + px) * 4, b = Math.max(0, Math.min(255, v * 255)); d[j] = d[j + 1] = d[j + 2] = b; d[j + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    noiseT = new T.CanvasTexture(c); noiseT.wrapS = noiseT.wrapT = T.RepeatWrapping; return noiseT;
  }
  function cloud(T, geo, o) {
    var m = new T.ShaderMaterial({
      uniforms: {
        uT: { value: 0 }, uAmp: { value: o.amp }, uFq: { value: new T.Vector2(o.fx, o.fy) }, uFlow: { value: o.flow }, uMorph: { value: o.morph == null ? 1 : o.morph }, uBump: { value: o.bump || .07 },
        uHeat: { value: 1 }, uCrack: { value: o.crack == null ? .9 : o.crack }, uUnder: { value: o.under || 0 }, uAlpha: { value: 1 }, uSmoke: { value: new T.Vector3(o.smoke[0], o.smoke[1], o.smoke[2]) }, uTex: { value: noiseTex(T) }
      }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: true, side: T.DoubleSide
    });
    var me = new T.Mesh(geo, m); me.frustumCulled = false; me.renderOrder = o.ro || 9; return me;
  }
  function lathe(T, pts, seg) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(Math.max(0, p[0]), p[1]); }), seg); }
  function withSphere(T, geo, N, seg) {   /* ateş topu (küre) → mantar şapkası geçişi için ikinci biçim */
    var q = []; for (var i = 0; i < N; i++) { var a = -Math.PI / 2 + Math.PI * i / (N - 1); q.push([Math.cos(a), Math.sin(a)]); }
    var s = lathe(T, q, seg); geo.setAttribute('aS', s.getAttribute('position')); geo.setAttribute('aSN', s.getAttribute('normal')); return geo;
  }
  function plainMorph(geo) { geo.setAttribute('aS', geo.getAttribute('position')); geo.setAttribute('aSN', geo.getAttribute('normal')); return geo; }
  function capGeo(T) {
    var N = LOW ? 34 : 56, seg = LOW ? 64 : 104, c = [[.16, -.46], [.36, -.26], [.62, -.36], [.94, -.28], [1.1, .08], [1.02, .5], [.72, .82], [.36, .97], [0, 1]];
    var sp = new T.SplineCurve(c.map(function (p) { return new T.Vector2(p[0], p[1]); })).getPoints(N - 1).map(function (p) { return [p.x, p.y]; });
    return withSphere(T, lathe(T, sp, seg), N, seg);
  }
  function stemGeo(T) {
    var q = [], N = LOW ? 26 : 40; for (var i = 0; i < N; i++) { var y = i / (N - 1); q.push([.2 + .78 * Math.pow(1 - y, 5) + .3 * Math.pow(y, 7), y]); }
    return plainMorph(lathe(T, q, LOW ? 40 : 64));
  }
  function ringGeo(T, prof, seg) {
    var sp = new T.SplineCurve(prof.map(function (p) { return new T.Vector2(p[0], p[1]); })).getPoints(LOW ? 16 : 24).map(function (p) { return [p.x, p.y]; });
    return plainMorph(lathe(T, sp, seg));
  }
  function scorchTex(T) {
    var S = 256, c = document.createElement('canvas'); c.width = c.height = S; var x = c.getContext('2d');
    var g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(8,6,5,.97)'); g.addColorStop(.55, 'rgba(18,14,11,.9)'); g.addColorStop(.82, 'rgba(38,30,24,.5)'); g.addColorStop(1, 'rgba(50,40,30,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (var i = 0; i < 150; i++) { var a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * S * .36, s = rnd(.4, 1.2); x.fillStyle = 'rgba(255,' + (90 + (Math.random() * 90 | 0)) + ',30,' + rnd(.25, .95).toFixed(2) + ')'; x.beginPath(); x.arc(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, s, 0, 6.283); x.fill(); }
    return new T.CanvasTexture(c);
  }

  /* ---------- ağır bombardıman uçağı (dört motorlu; burun +Z) ---------- */
  function bomber(T) {
    var g = new T.Group(), std = function (c, m, r) { return new T.MeshStandardMaterial({ color: c, metalness: m == null ? .35 : m, roughness: r == null ? .55 : r, flatShading: false, side: T.DoubleSide }); };
    var body = std(0x77808c), dark = std(0x3b424c), glass = new T.MeshStandardMaterial({ color: 0x9fdcf5, emissive: 0x2a7da0, emissiveIntensity: .6, roughness: .2 }), blue = std(0x2f6fe0, .2, .5);
    var along = function (geo, mat, x, y, z) { geo.rotateX(Math.PI / 2); var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); g.add(m); return m; };
    along(new T.CylinderGeometry(.27, .27, 3.6, 16), body, 0, 0, .05);
    along(new T.ConeGeometry(.27, .95, 16), body, 0, 0, 2.3);
    along(new T.CylinderGeometry(.27, .09, 1.1, 14), body, 0, .02, -2.3);
    along(new T.CylinderGeometry(.277, .277, .16, 16), blue, 0, 0, .85);
    var cp = new T.Mesh(new T.SphereGeometry(.18, 12, 8), glass); cp.scale.set(1, .7, 1.6); cp.position.set(0, .18, 1.62); g.add(cp);
    var wing = function (pts, th, mat, y) {
      var s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
      var geo = new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(0, y || 0, 0); var m = new T.Mesh(geo, mat); g.add(m); return m;
    };
    /* ExtrudeGeometry rotateX(-90): şeklin y'si -z olur; bu yüzden burun yönü için z işareti çevrilir */
    var wr = [[.2, -.95], [3.9, .75], [3.9, 1.12], [.2, .55]], tl = [[.1, 2.2], [1.25, 2.95], [1.25, 3.15], [.1, 2.9]];
    wing(wr, .07, body, .12); wing(wr.map(function (p) { return [-p[0], p[1]]; }), .07, body, .12);
    wing(tl, .05, dark, .08); wing(tl.map(function (p) { return [-p[0], p[1]]; }), .05, dark, .08);
    var fs = new T.Shape(); fs.moveTo(-2.05, .2); fs.lineTo(-3.05, .2); fs.lineTo(-3.25, 1.2); fs.lineTo(-2.85, 1.2); fs.closePath();
    var fin = new T.Mesh(new T.ExtrudeGeometry(fs, { depth: .05, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(.025, 0, 0), body); g.add(fin);
    var bar = new T.Mesh(new T.BoxGeometry(.06, .16, .34), blue); bar.position.set(0, .95, -3); g.add(bar);
    var eng = [[1.25, .05], [2.25, -.15], [-1.25, .05], [-2.25, -.15]];
    eng.forEach(function (e) {
      along(new T.CylinderGeometry(.13, .15, .72, 12), dark, e[0], -.1, e[1] + .22);
      along(new T.CylinderGeometry(.155, .155, .12, 12), body, e[0], -.1, e[1] + .55);
    });
    var bomb = window.WCBattleFX.models.bomb(0x2f3a2f); bomb.scale.setScalar(2.2); bomb.position.set(0, -.5, 0); g.add(bomb);
    return { group: g, bomb: bomb, eng: eng };
  }

  /* ---------- ülke içi yerleşim noktaları (yerel koordinat) ---------- */
  function sites(a, tg, fr, P, sc, want, maxR, gap) {
    /* V230: noktalar patlama merkezi çevresindeki diskten seçilir (Rusya gibi çok geniş ülkede kutudan seçmek birlikleri küre eğrisinin dışına atıyordu) */
    var out = [], tries = 0, lat0 = Math.asin(Math.max(-1, Math.min(1, P.y))), lon0 = Math.atan2(-P.z, P.x), DG = 180 / Math.PI, wr = maxR * sc;
    while (out.length < want && tries++ < 900) {
      var ang = Math.random() * 6.283, rr = wr * Math.sqrt(Math.random()), la = (lat0 + Math.sin(ang) * rr) * DG, lo = (lon0 + Math.cos(ang) * rr / Math.max(.15, Math.cos(lat0))) * DG;
      if (lo > 180) lo -= 360; else if (lo < -180) lo += 360; if (Math.abs(la) > 89 || a.at(lo, la) !== tg) continue;
      var w = a.sph(lo, la, 1).sub(P), x = w.dot(fr.x) / sc, z = w.dot(fr.z) / sc, r = Math.hypot(x, z); if (r > maxR || r < gap * .4) continue;
      var ok = true; for (var i = 0; i < out.length; i++) if (Math.hypot(out[i].x - x, out[i].z - z) < gap) { ok = false; break; }
      if (ok) out.push({ x: x, z: z, r: r });
    }
    return out.sort(function (p, q) { return p.r - q.r; });
  }
  /* bb merkezi ülke dışına düşüyorsa (hilal biçimli ülkeler) en yakın iç nokta */
  function center(a, tg) {
    var c = a.ll(tg), bb = a.bbox(tg); if (!c || !bb) return c;
    if (a.at(c[0], c[1]) === tg) return c;
    var best = null, bd = 1e9, w = bb[2] - bb[0], h = bb[3] - bb[1];
    for (var i = 0; i <= 24; i++) for (var j = 0; j <= 24; j++) { var lo = bb[0] + w * i / 24, la = bb[1] + h * j / 24, d = Math.hypot(lo - c[0], la - c[1]); if (d < bd && a.at(lo, la) === tg) { bd = d; best = [lo, la]; } }
    return best || c;
  }

  function play(a, f, T, o) {
    var M = window.WCBattleFX.models, BLUE = 0x3b82f6, RED = 0xc23a30, TDET = 4.7, TEND = 8.8, BL = .5;   /* BL: patlamanın ölçeği (ülkeye ve kameraya göre) */
    var G = new T.Group(); G.rotation.x = LEAN; f.spawn(G); var C = new T.Group(); C.scale.setScalar(BL); G.add(C);   /* yatırılmış düzlem: uçaklar + bomba; C: bulut */
    var pe = function (sys, p) {   /* G düzleminde verilen parçacığı kök düzlemine çevirir */
      var y = p.y || 0, z = p.z || 0, vy = p.vy || 0, vz = p.vz || 0;
      p.y = y * cL - z * sL; p.z = y * sL + z * cL; p.vy = vy * cL - vz * sL; p.vz = vy * sL + vz * cL; sys.emit(p);
    };
    var p0 = new T.Vector3(0, 0, 0), units = [];

    /* ===== 1) ŞEHİR VE SAVUNMA BİRLİKLERİ ===== */
    var rad = Math.max(1.2, Math.min(8, (o.rad || .1) / o.sc)), ks = Math.max(.72, Math.min(1, rad / 3.4));   /* minik ülkede modeller de küçülür, kıyıya taşmaz */
    var nS = LOW ? 18 : 26, pts = sites(a, o.tg, o.fr, o.P, o.sc, nS, Math.max(2.2, Math.min(2.7, rad * 1.5)), .5 * ks);
    var dropY = function (r) { return -(1 - Math.cos(r * o.sc)) / o.sc; };   /* V230: yerel düzlem düz, küre eğri: birlik yüzeye oturur */
    if (pts.length < 3) pts = [{ x: .5 * ks, z: .1 * ks }, { x: -.4 * ks, z: .4 * ks }, { x: .1 * ks, z: -.5 * ks }].map(function (q) { q.r = Math.hypot(q.x, q.z); return q; });
    var nArmy = Math.round(pts.length * .36);
    pts.forEach(function (p, i) {
      var kind = i < pts.length - nArmy ? (i % 6 === 2 ? 3 : 0) : (i % 2 ? 1 : 2);   /* 0 ev, 3 kule, 1 tank, 2 asker */
      var m = kind === 0 ? M.house([0xa8452f, 0x8c5a33, 0xb06a3a][i % 3]) : kind === 3 ? M.tower(RED) : kind === 1 ? M.tank(RED).group : M.soldier(RED, i % 2).group;
      var S = (kind === 0 ? .78 : kind === 3 ? .3 : kind === 1 ? .34 : .8) * ks;
      var y0 = dropY(p.r); m.position.set(p.x, y0, p.z); m.rotation.y = kind === 1 || kind === 2 ? Math.atan2(-p.x, -p.z) : Math.random() * 6.283; m.scale.setScalar(.001); f.spawn(m);
      var u = { o: m, x: p.x, z: p.z, r: p.r, y0: y0, kind: kind, S: S, hit: false };
      units.push(u);
      f.tween(.45, function (v) { if (!u.hit) m.scale.setScalar(Math.max(.001, S * eo(v))); }, null, .05 + i * .025);
      if (i % 4 === 0) f.at(.05 + i * .025, function () { f.dust({ x: p.x, y: 0, z: p.z }, .55 * ks, 3); });
    });
    var aas = units.filter(function (u) { return u.kind === 1; }).slice(0, 3);

    f.at(.1, function () { snd('siren', .5); }); f.at(.35, function () { snd('bomber', .8); });   /* V227 */
    /* kırmızı hedef halkası */
    for (var ri = 0; ri < 6; ri++) f.at(.5 + ri * .68, function () { f.ringFx(p0, 0xff2a1a, 2.6, .62); });

    /* ===== 2) BOMBARDIMAN UÇAĞI + ESKORT ===== */
    var B = bomber(T), PW = new T.Group(), H = 5, X0 = -13, X1 = 13, TF = 5.9, TREL = 2.45, vx = (X1 - X0) / TF;
    B.group.rotation.y = Math.PI / 2; B.group.scale.setScalar(.44); PW.add(B.group); PW.position.set(X0, H, 0); G.add(PW);
    var esc = [-1, 1].map(function (s) { var e = M.plane(BLUE), g = new T.Group(); e.group.rotation.y = Math.PI / 2; e.group.scale.setScalar(.34); e.bombs.forEach(function (b) { b.visible = false; }); g.add(e.group); g.position.set(X0, H, 0); G.add(g); return { g: g, s: s, m: e }; });
    var bp = new T.Vector3();
    f.tween(TF, function (u, dt) {
      var x = X0 + (X1 - X0) * u; bp.set(x, H + Math.sin(u * Math.PI) * .3, 0); PW.position.copy(bp);
      var t = u * TF, esc0 = cl((t - TREL) / 1.2);
      PW.rotation.x = -.05 * ss(esc0); PW.rotation.z = .05 * Math.sin(t * 1.6);
      esc.forEach(function (e) {
        var ex = x + 1.5 + .8 * esc0, ez = e.s * (2 + 2 * esc0);
        e.g.position.set(ex, H + .4 + e.s * .25 + Math.sin(t * 2 + e.s) * .12 + 1.2 * esc0, ez);
        var fk = 1 + rnd(-.15, .3); e.m.flame.scale.set(1, fk, 1); e.m.core.scale.set(1, fk * .9, 1);
      });
      var n = dt * (LOW ? 22 : 34); n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
      for (var q = 0; q < n; q++) { var en = B.eng[(Math.random() * 4) | 0]; pe(f.pnorm, { x: x - .65 + rnd(-.15, .15), y: bp.y - .06, z: -en[0] * .44 + rnd(-.02, .02), vy: .03, life: rnd(1, 1.6), s0: .05, s1: .3, c0: [.97, .97, 1], c1: [.82, .84, .9], a0: .34, a1: 0 }); }
    }, function () { G.remove(PW); esc.forEach(function (e) { G.remove(e.g); }); });

    /* ===== 3) UÇAKSAVAR ATEŞİ + HAVADA PATLAYAN FLAK ===== */
    var nAA = 0;
    f.ticker(function (dt, now) {
      if (now > TDET - .2 + (f.__t0 || 0)) return;
      if (now - (f.__t0 || 0) < 1.1 || !aas.length) return;
      nAA += dt * (LOW ? 20 : 34);
      while (nAA >= 1) {
        nAA -= 1; var u = aas[(Math.random() * aas.length) | 0]; if (u.hit) continue;
        /* hedef G düzleminde: uçağın önü; kök düzlemine çevrilir */
        var tx = bp.x + rnd(.5, 4), ty = bp.y + rnd(-1, .8), tz = rnd(-1.6, 1.6), ry = ty * cL - tz * sL, rz = ty * sL + tz * cL;
        var dx = tx - u.x, dy = ry - .5, dz = rz - u.z, L = Math.hypot(dx, dy, dz) || 1, sp = 11;
        f.padd.emit({ x: u.x, y: .55 * u.S, z: u.z, vx: dx / L * sp, vy: dy / L * sp, vz: dz / L * sp, life: L / sp, s0: .09, s1: .07, c0: [1, .9, .5], c1: [1, .5, .15], a0: 1, a1: .6 });
      }
      if (Math.random() < dt * 1.3) snd('mg', .2);
      if (Math.random() < dt * 6.5) {
        if (Math.random() < .45) snd('flak', .34);
        var fx = bp.x + rnd(-2, 4.5), fy = bp.y + rnd(-1, 1), fz = rnd(-2.2, 2.2);
        pe(f.padd, { x: fx, y: fy, z: fz, life: .14, s0: .55, s1: 1, c0: [1, .9, .6], c1: [1, .4, .1], a0: 1, a1: 0 });
        for (var k = 0; k < 4; k++) pe(f.pnorm, { x: fx + rnd(-.25, .25), y: fy + rnd(-.25, .25), z: fz + rnd(-.25, .25), vx: rnd(-.3, .3), vy: rnd(-.1, .3), vz: rnd(-.3, .3), life: rnd(.8, 1.3), s0: .22, s1: .62, c0: [.2, .19, .2], c1: [.32, .31, .33], a0: .62, a1: 0 });
      }
    });

    /* ===== 4) ÖN YÜKLEME: shader derlemesi patlama anında takılma yapmasın (görünmez ölçekte hazır beklerler) ===== */
    var cap = cloud(T, capGeo(T), { amp: .24, fx: 3, fy: 9, flow: .34, smoke: [.6, .53, .47], under: .55, ro: 10 });
    var stem = cloud(T, stemGeo(T), { amp: .15, fx: 5, fy: 18, flow: -.8, bump: .05, smoke: [.72, .62, .54], crack: .95, under: .4, ro: 8 });
    var skirt = cloud(T, ringGeo(T, [[1.06, 0], [1.02, .42], [.9, .88], [.76, 1], [.62, .62], [.52, 0]], LOW ? 64 : 96), { amp: .22, fx: 3.6, fy: 3, flow: -.2, bump: .05, smoke: [.42, .37, .31], crack: 1.4, ro: 7 });
    C.add(cap, stem); f.root.add(skirt); f.objs.add(skirt);
    [cap, stem, skirt].forEach(function (m) { m.scale.setScalar(.0001); m.position.y = -3; m.material.uniforms.uAlpha.value = .9; });

    /* ===== 5) BOMBA BIRAKILIR ===== */
    f.at(TREL, function () {
      B.bomb.visible = false; PW.updateMatrixWorld(true);
      var R = new T.Vector3(); B.bomb.getWorldPosition(R); G.worldToLocal(R);
      var b = M.bomb(0x2f3a2f); b.scale.setScalar(.95); b.position.copy(R); G.add(b);
      var TD = TDET - TREL, Yb = 1, prev = R.clone(), pa = new T.Vector3(), pb = new T.Vector3(), tw = new T.Vector3(), Z = new T.Vector3(0, 0, 1);
      var at = function (u, q) { return q.set(R.x * (1 - u), R.y + (Yb - R.y) * u * u, R.z * (1 - u)); };
      snd('whistle', .6);
      f.tween(TD, function (u) {
        at(u, pa); at(Math.min(1, u + .03), pb); tw.copy(pb).sub(pa); if (tw.lengthSq() > 1e-9) { tw.normalize(); b.quaternion.setFromUnitVectors(Z, tw); }
        b.position.copy(pa);
        var nn = Math.max(1, Math.ceil(prev.distanceTo(pa) / .3));
        for (var q = 1; q <= nn; q++) { var kk = q / nn; pe(f.pnorm, { x: prev.x + (pa.x - prev.x) * kk, y: prev.y + (pa.y - prev.y) * kk, z: prev.z + (pa.z - prev.z) * kk, life: rnd(.5, .85), s0: .06, s1: .22, c0: [.92, .92, .96], c1: [.62, .62, .68], a0: .34, a1: 0 }); }
        prev.copy(pa);
      }, function () { G.remove(b); detonate(); });
    });

    /* ===== 6) PATLAMA ===== */
    function detonate() {
      var tD = f.time;
      try { var fl = document.createElement('div'); fl.className = 'nkfl224'; document.body.appendChild(fl); setTimeout(function () { fl.classList.add('off'); }, 70); setTimeout(function () { fl.remove(); }, 1300); } catch (e) { }
      if (!snd('nuke', 1)) try { if (window.AU) { AU.play('boom'); [200, 560, 1300].forEach(function (d) { setTimeout(function () { try { AU.play('boom'); } catch (e) { } }, d); }); } } catch (e) { }
      try { if (navigator.vibrate) navigator.vibrate([220, 70, 420, 90, 200]); } catch (e) { }
      f.shake(1.2); [420, 1000, 1800].forEach(function (d, i) { setTimeout(function () { f.shake([.9, .6, .35][i]); }, d); });
      f.hitStop(.12, .15);
      /* göz alan parıltı + ateş topu halesi */
      var glow = new T.Sprite(new T.SpriteMaterial({ map: f.tex, color: 0xfff0cc, transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false })); glow.renderOrder = 14; C.add(glow);
      var hal = new T.Sprite(new T.SpriteMaterial({ map: f.tex, color: 0xff9a3a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false })); hal.renderOrder = 13; C.add(hal);
      /* yer etkisi: şok halkaları, kavrulan toprak */
      f.ringFx(p0, 0xffffff, 11, 1); f.ringFx(p0, 0xffc27a, 15, 1.7, .1); f.ringFx(p0, 0xff8a3a, 19, 2.4, .3);
      var sc = new T.Mesh(f.shared.planeGeo, new T.MeshBasicMaterial({ map: scorchTex(T), transparent: true, opacity: 0, depthWrite: false })); sc.position.y = .04; sc.renderOrder = 5; f.spawn(sc);
      for (var i = 0; i < (LOW ? 60 : 110); i++) { var a1 = Math.random() * 6.283, s1 = rnd(2.5, 6.5); f.pnorm.emit({ x: Math.cos(a1) * .4, y: .15, z: Math.sin(a1) * .4, vx: Math.cos(a1) * s1, vy: rnd(.1, .6), vz: Math.sin(a1) * s1, life: rnd(1.4, 2.4), s0: .55, s1: rnd(1.6, 2.2), c0: [.76, .66, .53], c1: [.44, .39, .34], a0: .5, a1: 0, drag: 1.5 }); }
      for (var j = 0; j < (LOW ? 40 : 70); j++) { var a2 = Math.random() * 6.283, s2 = rnd(3.5, 9); pe(f.padd, { x: 0, y: 1.1, z: 0, vx: Math.cos(a2) * s2, vy: rnd(2, 9), vz: Math.sin(a2) * s2, life: rnd(.8, 1.5), s0: .14, s1: .05, c0: [1, .92, .55], c1: [1, .35, .08], a0: 1, a1: 0, gy: -9, drag: .3 }); }
      try { f.debris(p0, .7); } catch (e) { }

      var fires = 0, tmpV = new T.Vector3(), nC = 0;
      function knock(u) {
        u.hit = true; var m = u.o, dx = u.x / (u.r || 1), dz = u.z / (u.r || 1), near = u.r < 1.3;
        m.traverse(function (q) {
          if (!q.isMesh || !q.material) return; var ar = Array.isArray(q.material);
          var nw = (ar ? q.material : [q.material]).map(function (w) { var c = w.clone(); if (c.color) c.color.multiplyScalar(near ? .1 : .3); if (c.emissive) c.emissive.setHex(0); return c; }); q.material = ar ? nw : nw[0];
        });
        for (var k = 0; k < 3; k++) f.pnorm.emit({ x: u.x, y: .2, z: u.z, vx: dx * rnd(2, 5), vy: rnd(.3, 1), vz: dz * rnd(2, 5), life: rnd(.8, 1.3), s0: .3, s1: 1.1, c0: [.6, .52, .42], c1: [.36, .33, .3], a0: .5, a1: 0, drag: 1.8 });
        var y0 = m.rotation.y;
        if (u.kind === 0 || u.kind === 3) {
          var tilt = u.kind === 3 ? 1.35 : .62, sy = u.kind === 3 ? .55 : .24;
          f.tween(u.kind === 3 ? .95 : .55, function (v) {
            var e = eo(v); m.position.set(u.x + dx * e * .5, u.y0 - .02 * e, u.z + dz * e * .5); m.rotation.set(dz * tilt * e, y0, -dx * tilt * e);
            m.scale.set(u.S * (1 + .22 * e), Math.max(.01, u.S * (1 - (1 - sy) * e)), u.S * (1 + .22 * e));
          });
          if (near) f.tween(.4, function (v) { m.scale.multiplyScalar(1 - v * .12); }, function () { }, .5);
        } else {
          var vx = dx * (4.2 - Math.min(3, u.r * .6)), vz = dz * (4.2 - Math.min(3, u.r * .6)), vy = u.kind === 1 ? 2.2 : 3.4, px = u.x, py = u.y0 + .1, pz = u.z, rs = rnd(5, 11) * (u.kind === 1 ? .55 : 1), rest = false;
          f.tween(1.25, function (v, dt) {
            if (rest) return; vy -= 13 * dt; px += vx * dt; py += vy * dt; pz += vz * dt; m.position.set(px, Math.max(u.y0, py), pz); m.rotation.x += rs * dt * dz; m.rotation.z -= rs * dt * dx;
            if (py <= u.y0 && v > .15) { rest = true; m.position.y = u.y0 + .02; f.dust({ x: px, y: 0, z: pz }, .4, 2); }
          });
          if (u.kind === 2) f.tween(.5, function (v) { m.scale.setScalar(Math.max(.001, u.S * (1 - v))); }, function () { m.visible = false; }, .95);
        }
        if (fires < (LOW ? 3 : 6) && u.r > .9 && (u.kind === 0 || u.kind === 1)) { fires++; var h = new T.Object3D(); h.position.set(u.x, u.y0, u.z); f.spawn(h); f.at(.3, function () { try { f.fireOn(h, new T.Vector3(0, .2, 0), 5, function () { f.kill(h); }); } catch (e) { } }); }
      }

      var stopB = f.ticker(function (dt, now) {
        var t = now - tD; if (t > TEND) { stopB(); return; }
        var k;
        /* --- şok cephesi --- */
        var sh = 10 * eo(t / 1.5);
        for (k = 0; k < units.length; k++) if (!units[k].hit && units[k].r < sh) knock(units[k]);
        /* --- parıltı --- */
        var gl = Math.max(0, 1 - t / .55), hl = 1 - cl((t - .1) / 2.4);
        glow.material.opacity = gl; glow.scale.setScalar(42 * (.4 + .6 * eo(t / .22))); glow.position.y = 2; hal.material.opacity = .85 * hl;
        /* --- kavrulan toprak --- */
        sc.scale.setScalar(.4 + 2.9 * eo(t / 1)); sc.material.opacity = cl(t / .3) * (1 - .35 * cl((t - 6) / 3));
        /* --- ateş topu → mantar --- */
        var capY = 1.6 + 1.1 * eo(t / .6) + 4.8 * eo((t - .55) / 6.5), R = 2.4 * eo(t / .55) + 1.2 * eo((t - .4) / 6.5), mo = ss((t - .75) / 2.4);
        var heat = t < .34 ? 1 : .05 + .95 * Math.exp(-(t - .34) * .95), fade = 1 - cl((t - (TEND - 1.5)) / 1.4);
        var U = cap.material.uniforms; U.uT.value = t; U.uMorph.value = mo; U.uHeat.value = heat; U.uAlpha.value = fade; U.uFlow.value = .34 + .5 * Math.exp(-t * .4);
        U.uUnder.value = .55 * Math.max(.06, Math.exp(-t * .4));
        cap.position.set(0, capY, 0); cap.scale.set(R * (.96 + .24 * mo), R * (1 - .3 * mo), R * (.96 + .24 * mo));
        hal.position.y = capY; hal.scale.setScalar(R * 5);
        /* --- gövde --- */
        var top = capY - R * .42 * mo, sg = eo((t - .22) / .7), w = (.75 + 1.5 * eo((t - .2) / 5.2));
        stem.visible = t > .2; stem.position.set(0, -.02, 0); stem.scale.set(w * sg, Math.max(.02, top), w * sg);
        var Us = stem.material.uniforms; Us.uT.value = t; Us.uHeat.value = .16 + .84 * Math.exp(-t * .95); Us.uAlpha.value = fade; Us.uUnder.value = .35 * Math.exp(-t * .3);
        /* --- yerde yayılan toz eteği --- */
        var sr = (.8 + 3.6 * eo(t / 3)) * BL, sh2 = (.22 + .3 * eo((t - .05) / 1.6) * (1 - .3 * cl(t / 7))) * BL;   /* V230: alçak, yarı saydam toz halkası */
        skirt.position.set(0, -.02, 0); skirt.scale.set(sr, sh2, sr);
        var Uk = skirt.material.uniforms; Uk.uT.value = t; Uk.uHeat.value = .18 * Math.exp(-t * 1.2); Uk.uAlpha.value = cl(t / .22) * (1 - cl((t - 2.4) / 2.6)) * .55;
        /* --- bulut kenarını yumuşatan seyrek duman --- */
        nC += dt * (LOW ? 18 : 34) * fade;
        while (nC >= 1) {
          nC -= 1; var an = Math.random() * 6.283, Rw = R * BL, Rc = Rw * rnd(.92, 1.16), yy = (capY + rnd(-.45, .55) * R * .9) * BL;
          var warm = cl(heat * 1.6);
          pe(f.pnorm, { x: Math.cos(an) * Rc, y: yy, z: Math.sin(an) * Rc, vx: Math.cos(an) * rnd(.2, .7), vy: rnd(.1, .5), vz: Math.sin(an) * rnd(.2, .7), life: rnd(1.1, 1.9), s0: Rw * .38, s1: Rw * .75, c0: [.5 + .4 * warm, .42 + .1 * warm, .36], c1: [.42, .38, .36], a0: .34 * fade, a1: 0, drag: .9 });
        }
      });
      /* sahne sonu: enkaz sönerek kaybolur */
      f.at(TEND - .5, function () {
        units.forEach(function (u) {
          var s0 = u.o.scale.clone();
          f.tween(.45, function (v) { u.o.scale.copy(s0).multiplyScalar(Math.max(.001, 1 - v)); });
        });
      });
    }
    f.__t0 = f.time;
    return TDET + TEND + .2;
  }

  window.WCNukeScene = { play: play, center: center };
})();
