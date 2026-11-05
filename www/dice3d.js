/* V80 — GERÇEK 3D ZAR (yeni zar motoru)
   - Zar havadan atılır, 4 kez sönümlü sekerek yuvarlanır, sonunda hafifçe sallanıp durur; gölge yükseklikle senkron.
   - SONUÇ = ZARIN ÜST YÜZÜ. Kamera zarı yukarıdan (56°) gösterir; hedef yüz her zaman yukarı bakacak şekilde
     (dönüş matrisi hesaplanarak) durur. Yan/ön yüzdeki sayı artık sonuç sayılmaz.
   - Oyun mantığı (d6/d6b sonuçları) DEĞİŞMEDİ: zar önceden belirlenen sayıya inecek şekilde döner.
   - Eski API korunur: die3d(id,cls) / setDie3(id,v) / rollDie(id,v,ms,dir,cb); savaş ekranı için WCDice.cube/set/roll.
   - Android WebView uyumu için ES5, yalnızca CSS 3D + requestAnimationFrame (WebGL gerekmez). */
(function () {
  'use strict';
  var D2R = Math.PI / 180, TILT = 56, SZ = 72, HF = 36;
  var NR = { 1: [0, 0, 1], 6: [0, 0, -1], 3: [1, 0, 0], 4: [-1, 0, 0], 2: [0, -1, 0], 5: [0, 1, 0] };   // yüz normalleri (CSS: y aşağı)
  var FT = { 1: 'translateZ(var(--h))', 6: 'rotateY(180deg) translateZ(var(--h))', 3: 'rotateY(90deg) translateZ(var(--h))', 4: 'rotateY(-90deg) translateZ(var(--h))', 2: 'rotateX(90deg) translateZ(var(--h))', 5: 'rotateX(-90deg) translateZ(var(--h))' };
  var PIPC = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  var LIGHT = (function () { var l = [-0.25, -0.85, 0.45], n = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
  var ST = {};
  /* V88 — SAVAŞ ZARI: yüzler savas-zari.html'deki SVG çizimiyle (çapraz kılıçlar, altın dişli kenar, yakut 1) */
  var faceSvg = (function () {
var HI='#fffaea',SH='#a38c58',DK='#5e4426',INK='#3b2412',GO='#b88a3a',RB='#8a2a1a';
function L(d,w){return '<path d="'+d+'" fill="none" stroke="'+HI+'" stroke-width="'+w+'" transform="translate(-.7,-.7)" stroke-linecap="round" stroke-linejoin="round"/><path d="'+d+'" fill="none" stroke="'+SH+'" stroke-width="'+w+'" transform="translate(.7,.7)" stroke-linecap="round" stroke-linejoin="round"/><path d="'+d+'" fill="none" stroke="'+DK+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>'}
function R(x,y,w,h,r,sw){return L('M'+(x+r)+' '+y+'H'+(x+w-r)+'Q'+(x+w)+' '+y+' '+(x+w)+' '+(y+r)+'V'+(y+h-r)+'Q'+(x+w)+' '+(y+h)+' '+(x+w-r)+' '+(y+h)+'H'+(x+r)+'Q'+x+' '+(y+h)+' '+x+' '+(y+h-r)+'V'+(y+r)+'Q'+x+' '+y+' '+(x+r)+' '+y+'Z',sw)}
function rp(cx,cy,ang,x,y){var a=ang*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [cx+x*c-y*s,cy+x*s+y*c]}
function poly(cx,cy,ang,pts,close){var d='';pts.forEach(function(p,i){var q=rp(cx,cy,ang,p[0],p[1]);d+=(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)});return d+(close?'Z':'')}
function sword(cx,cy,len,ang){
var k=len/40,h=20*k,w=Math.max(1,.7*k),o='';
o+=L(poly(cx,cy,ang,[[0,-h],[2.4*k,-h+9*k],[2.4*k,h-10*k],[-2.4*k,h-10*k],[-2.4*k,-h+9*k]],true),w);
o+=L(poly(cx,cy,ang,[[0,-h+7*k],[0,h-12*k]]),w*.6);
o+=L(poly(cx,cy,ang,[[-6.5*k,h-10*k],[6.5*k,h-10*k]]),w*1.3);
o+=L(poly(cx,cy,ang,[[0,h-10*k],[0,h-2.5*k]]),w*1.5);
var q=rp(cx,cy,ang,0,h-1*k);
o+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="'+(1.7*k).toFixed(1)+'" fill="'+GO+'" stroke="'+DK+'" stroke-width=".6"/>';
return o}
function crossed(cx,cy,len,spread){return sword(cx,cy,len,-spread)+sword(cx,cy,len,spread)}
function pips(n){var m={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]};return m[n]}
function socket(x,y,r,gr){
var s='<circle cx="'+x+'" cy="'+y+'" r="'+(r+1.6)+'" fill="'+HI+'"/>';
s+='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+INK+'"/>';
s+='<path d="M'+(x-r*.75)+' '+(y-r*.55)+' A'+r+' '+r+' 0 0 1 '+(x+r*.2)+' '+(y-r*.97)+'" fill="none" stroke="#1d1008" stroke-width="2.2" stroke-linecap="round"/>';
s+='<circle cx="'+x+'" cy="'+y+'" r="'+(r*.62)+'" fill="none" stroke="'+GO+'" stroke-width="1.2"/>';
for(var k=0;k<8;k++){var a=k*Math.PI/4;s+='<circle cx="'+(x+Math.cos(a)*r*.82).toFixed(1)+'" cy="'+(y+Math.sin(a)*r*.82).toFixed(1)+'" r=".8" fill="'+GO+'"/>'}
var q=[];for(var j=0;j<8;j++){var b=j*Math.PI/4;q.push('M'+(x+Math.cos(b)*r*.2).toFixed(1)+' '+(y+Math.sin(b)*r*.2).toFixed(1)+'L'+(x+Math.cos(b)*r*.55).toFixed(1)+' '+(y+Math.sin(b)*r*.55).toFixed(1))}
s+='<path d="'+q.join('')+'" stroke="'+GO+'" stroke-width="1" fill="none"/>';
if(gr){s+='<circle cx="'+x+'" cy="'+y+'" r="'+(r*.42)+'" fill="'+RB+'"/><path d="M'+(x-r*.25)+' '+(y-r*.1)+' Q'+(x-r*.1)+' '+(y-r*.3)+' '+(x+r*.1)+' '+(y-r*.25)+'" fill="none" stroke="#f0a090" stroke-width="1.4" stroke-linecap="round"/>'}
else{s+='<circle cx="'+x+'" cy="'+y+'" r="2.2" fill="'+GO+'"/>'}
return s}
var F={1:1,2:1.06,3:.92,4:.96,5:.84,6:.9};
function face(n){
var s='<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">';
s+='<rect x="1" y="1" width="138" height="138" rx="17" fill="#d6c593"/>';
s+='<rect x="3" y="3" width="134" height="134" rx="15" fill="#efe3c3"/>';
s+='<rect x="5" y="5" width="130" height="130" rx="13" fill="#f6ecd0"/>';
s+=R(8,8,124,124,10,1.8);
s+=R(13,13,114,114,7,1.2);
s+='<rect x="17" y="17" width="106" height="106" rx="5" fill="none" stroke="'+SH+'" stroke-width="1.2" stroke-dasharray="1 3.2" stroke-linecap="round"/>';
[[13,13,1,1],[127,13,-1,1],[13,127,1,-1],[127,127,-1,-1]].forEach(function(c){var cx=c[0]+c[2]*11,cy=c[1]+c[3]*11;
s+='<circle cx="'+cx+'" cy="'+cy+'" r="9.5" fill="#e9dcb8"/>';
s+=L('M'+(cx-9.5)+' '+cy+'a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0',1.1);
s+=crossed(cx,cy,22,42)});
for(var i=0;i<7;i++){var t=46+i*8;
s+='<polygon points="'+t+',16.5 '+(t+3)+',22 '+(t-3)+',22" fill="'+GO+'"/>';
s+='<polygon points="'+t+',123.5 '+(t+3)+',118 '+(t-3)+',118" fill="'+GO+'"/>';
s+='<polygon points="16.5,'+t+' 22,'+(t+3)+' 22,'+(t-3)+'" fill="'+GO+'"/>';
s+='<polygon points="123.5,'+t+' 118,'+(t+3)+' 118,'+(t-3)+'" fill="'+GO+'"/>'}
if(n===1){
s+=crossed(70,70,92,42);
s+='<circle cx="70" cy="70" r="29" fill="#f2e7c9"/>';
s+=L('M70 41a29 29 0 1 0 .1 0',1.6);
s+=L('M70 46a24 24 0 1 0 .1 0',1.1);
var sp=[];for(var k=0;k<8;k++){var an=k*Math.PI/4+Math.PI/8;sp.push('M'+(70+Math.cos(an)*13).toFixed(1)+' '+(70+Math.sin(an)*13).toFixed(1)+'L'+(70+Math.cos(an)*23).toFixed(1)+' '+(70+Math.sin(an)*23).toFixed(1))}
s+=L(sp.join(''),1);
for(var m=0;m<16;m++){var am=m*Math.PI/8;s+='<circle cx="'+(70+Math.cos(am)*26.5).toFixed(1)+'" cy="'+(70+Math.sin(am)*26.5).toFixed(1)+'" r="1" fill="'+GO+'"/>'}
s+=socket(70,70,13,true);
}else{
s+='<g opacity=".3">'+crossed(70,70,92,42)+'</g>';
pips(n).forEach(function(p){s+=socket(70+p[0]*29,70+p[1]*29,12.5,false)})}
var f=F[n];
if(f<1){s+='<rect x="0" y="0" width="140" height="140" rx="17" fill="#2a1a08" fill-opacity="'+((1-f)*.75).toFixed(2)+'"/>'}
else if(f>1){s+='<rect x="0" y="0" width="140" height="140" rx="17" fill="#ffffff" fill-opacity="'+((f-1)*1.5).toFixed(2)+'"/>'}
return s+'</svg>'}

    return face;
  })();

  /* ---------- 3x3 matris yardımcıları (satır-öncelikli, sütun vektör) ---------- */
  function mul(a, b) { var r = [], i, j; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; }
  function aa(x, y, z, th) {
    var l = Math.sqrt(x * x + y * y + z * z) || 1, c = Math.cos(th), s = Math.sin(th), t = 1 - c; x /= l; y /= l; z /= l;
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  }
  function app(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function rotTo(a, b) {   // a vektörünü b vektörüne çeviren dönüş
    var ax = a[1] * b[2] - a[2] * b[1], ay = a[2] * b[0] - a[0] * b[2], az = a[0] * b[1] - a[1] * b[0], s = Math.sqrt(ax * ax + ay * ay + az * az), c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (s < 1e-6) return c > 0 ? [1, 0, 0, 0, 1, 0, 0, 0, 1] : (Math.abs(a[0]) < .9 ? aa(1, 0, 0, Math.PI) : aa(0, 0, 1, Math.PI));
    return aa(ax, ay, az, Math.atan2(s, c));
  }
  var UP = [0, -1, 0];
  function finalR(v, yaw) { return mul(aa(0, 1, 0, yaw), rotTo(NR[v], UP)); }   // v yüzü yukarı, dikey eksende yaw kadar dönük
  function topFace(R) { var best = 1, by = 9, v, y; for (v = 1; v <= 6; v++) { y = app(R, NR[v])[1]; if (y < by) { by = y; best = v; } } return best; }
  function m3d(R) { return 'matrix3d(' + [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, 0, 0, 0, 1].map(function (q) { return q.toFixed(5); }).join(',') + ')'; }

  /* ---------- işaretleme ---------- */
  var FIMG = {}, PNG = {}, FACES = '', STY = false;
  /* V189 — AKICILIK: 6 yüz SVG'si açılışta bir kez bitmap'e çevrilir; savaşta vektör çizim/raster maliyeti sıfır */
  function prep(cb) {
    var n = 0, v;
    function end() { if (++n < 6) return; FACES = ''; STY = false; var o = document.getElementById('d88img'); if (o) o.remove(); if (cb) cb(); }
    for (v = 1; v <= 6; v++) (function (v) {
      var im = new Image();
      im.onload = function () { try { var c = document.createElement('canvas'); c.width = c.height = 300; c.getContext('2d').drawImage(im, 0, 0, 300, 300); PNG[v] = c.toDataURL('image/png'); } catch (x) { } end(); };
      im.onerror = end;
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(faceSvg(v).replace('<svg ', '<svg width="300" height="300" '));
    })(v);
  }
  function faceUri(v) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(faceSvg(v)); }
  function faceImgUri(v) { return PNG[v] || FIMG[v] || (FIMG[v] = faceUri(v)); }
  function faceStyle() {   // V88: 6 yüz görseli sayfaya TEK stil olarak girer (zar başına işaretleme küçük, görsel bir kez çözülür)
    if (STY) return; STY = true;
    try {
      var st = document.createElement('style'), css = '', v;
      for (v = 1; v <= 6; v++) css += '.d3 .f.sv88[data-v="' + v + '"]{background:url("' + faceImgUri(v) + '") center/100% 100% no-repeat}';
      st.id = 'd88img'; st.textContent = css; document.head.appendChild(st);
    } catch (x) { }
  }
  function faces() {
    if (FACES) return FACES;
    var v; faceStyle();
    for (v = 1; v <= 6; v++) FACES += '<div class="f sv88" data-v="' + v + '" style="transform:' + FT[v] + '"></div>';
    return FACES;
  }
  var R0 = finalR(1, 0);
  function cube(id, cl) {   // yalnızca .d3 (etiketsiz) — savaş ekranındaki .d7 kutusunun içine konur
    return '<div class="d3 d80 ' + (cl || '') + '" id="' + id + '"><div class="sdw" style="left:0;right:0;bottom:auto;top:0;height:' + SZ + 'px;background:radial-gradient(closest-side,#000d 0,#0008 55%,#0000 100%);filter:none;border-radius:50%;transform:rotateX(-' + TILT + 'deg) translate3d(0,' + HF + 'px,0) rotateX(90deg) scale(1.05)"></div>' +
      '<div class="bx" style="transform:none"><div class="cb" style="transform:rotateX(-' + TILT + 'deg) ' + m3d(R0) + '">' + faces() + '<div class="k k1"></div><div class="k k2"></div></div></div></div>';
  }
  function die3d(id, cl) { return '<div class="d3w">' + cube(id, cl) + '<div class="dn" id="' + id + 'n"></div></div>'; }

  /* ---------- poz / ışık ---------- */
  function bind(id) {
    var e = document.getElementById(id); if (!e) return null;
    var s = ST[id] || (ST[id] = { v: 0, R: null, raf: 0, tm: 0, done: true });
    s.e = e; s.cb = e.querySelector('.cb'); s.bx = e.querySelector('.bx'); s.sdw = e.querySelector('.sdw'); s.fs = [].slice.call(e.querySelectorAll('.f')); s.nrs = s.fs.map(function (f) { return NR[f.getAttribute('data-v')]; }); s.shv = []; s.shT = 0; s.lab = document.getElementById(id + 'n');
    return s;
  }
  function pose(s, R, x, h, z, full) {   /* V187: durağan poz (setDie3 / bitiş) — transform + gerçek gölgelendirme */
    setT(s, R, x, h, z);
    if (full) shadeAll(s, R);
  }
  function mark(s, v, tot, show) {
    s.fs.forEach(function (f) { f.classList.toggle('top', +f.getAttribute('data-v') === v); });
    s.e.classList.add('landed');
    if (s.lab) { s.lab.textContent = tot > 6 ? (tot + ' (' + v + ')') : v; s.lab.className = show === false ? 'dn' : 'dn on'; }
  }
  function cancel(s) {
    if (!s) return;
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
    if (s.tm) { clearTimeout(s.tm); s.tm = 0; }
    if (s.tms) { s.tms.forEach(clearTimeout); s.tms = null; }
    if (s.an) { s.an.forEach(function (a) { try { a.cancel(); } catch (x) { } }); s.an = null; }
    s.done = true;
  }
  /* V187: yalnızca transform yazan poz (gölgelendirme ayrı); WAAPI ve rAF yolu ortak kullanır */
  function setT(s, R, x, h, z) {
    s.cb.style.transform = cbT(R, x, h, z);
    if (s.sdw) { var o = sdwT(h, x, z); s.sdw.style.opacity = o.op; s.sdw.style.transform = o.t; }
  }
  function cbT(R, x, h, z) { return 'rotateX(-' + TILT + 'deg) translate3d(' + x.toFixed(1) + 'px,' + (-h).toFixed(1) + 'px,' + z.toFixed(1) + 'px) ' + m3d(R); }
  function sdwT(h, x, z) { var k = Math.max(.35, 1.05 - h / 240); return { op: Math.max(.25, 1 - h / 170).toFixed(2), t: 'rotateX(-' + TILT + 'deg) translate3d(' + x.toFixed(1) + 'px,' + HF + 'px,' + z.toFixed(1) + 'px) rotateX(90deg) scale(' + k.toFixed(3) + ')' }; }
  function shadeAll(s, R) {   /* ışığa göre yüz karartması — yalnızca duruşta (uçuşta tek sabit ton) */
    var i, n, d, dk;
    for (i = 0; i < s.fs.length; i++) { n = app(R, s.nrs[i]); d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]; dk = Math.max(0, Math.min(.55, (.62 - d) * .5)); s.shv[i] = dk; s.fs[i].style.setProperty('--sh', dk.toFixed(2)); }
  }
  function flatShade(s, dk) { var i; for (i = 0; i < s.fs.length; i++) { s.shv[i] = dk; s.fs[i].style.setProperty('--sh', dk); } }
  function tickSnd() { try { AU.play('tick'); } catch (x) { } }

  /* ---------- sabit göster (animasyonu iptal eder) ---------- */
  function setDie3(id, v) {
    var s = bind(id); if (!s) return; var tot = v; v = ((v - 1) % 6) + 1; cancel(s);
    if (!s.R || s.v !== v) { s.v = v; s.R = finalR(v, (Math.random() - .5) * 1.2); }
    s.e.classList.remove('rolling');
    pose(s, s.R, 0, 0, 0, true); mark(s, v, tot);
  }

  /* ---------- zar at ---------- */
  /* V187 — AKICI ZAR: hareket tek bir "yol" fonksiyonundan (plan) üretilir.
     • Tarayıcı Web Animations destekliyorsa yol, ~8 ms aralıklı anahtar karelere çevrilip transform/opacity olarak
       compositor'a (GPU) verilir: ana iş parçacığı (savaş sahnesi, harita, ses) meşgul olsa bile zar kasmaz.
     • Desteklenmezse aynı yol requestAnimationFrame ile oynatılır.
     Hareket: yandan fade-in ile havaya fırlatılır (ilk karede ışınlanma yok), 4 sönümlü sekme, dönüş her sekmede
     keskin biçimde azalır (çarpma hissi), son çarpmada küçük "oturma" vuruşu, sonra sıfırdan başlayan yumuşak sallanma. */
  var AMP = [80, 27, 9, 2.8], AIR = .8, SPIN = [1, .5, .2, .06, 0];
  function plan(v, dir) {
    var yaw = (Math.random() - .5) * 1.2, Rf = finalR(v, yaw), sg = Math.random() < .5 ? -1 : 1;
    var P = { Rf: Rf }, x0 = dir * (64 + Math.random() * 24), z0 = -(26 + Math.random() * 34), h0 = 20;
    var a1 = [(Math.random() - .5) * .5, (Math.random() - .5) * .5, dir || 1], a2 = [1, (Math.random() - .5) * .6, (Math.random() - .5) * .4];
    var th1 = (2 + Math.floor(Math.random() * 2) + Math.random() * .6) * 2 * Math.PI * sg, th2 = (1 + Math.floor(Math.random() * 2) + Math.random() * .5) * 2 * Math.PI * (Math.random() < .5 ? -1 : 1);
    var sq = AMP.map(Math.sqrt), sum = sq.reduce(function (p, q) { return p + q; }, 0), seg = [], acc = 0, i;
    for (i = 0; i < AMP.length; i++) { var d = AIR * sq[i] / sum; seg.push([acc, acc + d]); acc += d; }
    var wa = [1, 0, .3 + Math.random() * .4], wsg = Math.random() < .5 ? -1 : 1;
    P.seg = seg;
    P.at = function (tt) {
      var h = 0, w = 0, q, k, u, rem, R, x, z;
      if (tt < AIR) {
        q = tt / AIR;
        for (k = 0; k < seg.length - 1; k++) if (tt <= seg[k][1]) break;
        u = Math.min(1, Math.max(0, (tt - seg[k][0]) / (seg[k][1] - seg[k][0])));
        h = 4 * AMP[k] * u * (1 - u) + (k === 0 ? h0 * (1 - u) : 0);
        rem = SPIN[k] + (SPIN[k + 1] - SPIN[k]) * u;   /* her parçada sabit açısal hız, çarpmada ani düşüş */
      } else {
        q = 1; rem = 0;
        var sg2 = (tt - AIR) / (1 - AIR);
        w = wsg * 5 * D2R * Math.exp(-3.2 * sg2) * Math.sin(9.42 * sg2);   /* sıfırdan başlar → iniş anında sıçrama yok */
      }
      var r = Math.pow(1 - q, 2.3); x = x0 * r; z = z0 * r;
      R = mul(aa(a2[0], a2[1], a2[2], th2 * Math.pow(rem, 1.35)), mul(aa(a1[0], a1[1], a1[2], th1 * rem), Rf));
      if (w) R = mul(aa(wa[0], wa[1], wa[2], w), R);
      return { R: R, x: x, h: h, z: z };
    };
    return P;
  }
  function rollDie(id, v, ms, dir, cb) {
    var s = bind(id); if (!s) { if (cb) cb(); return; }
    var tot = v; v = ((v - 1) % 6) + 1; cancel(s); s.done = false; ms = ms || 1300; dir = dir || 1;
    var P = plan(v, dir), Rf = P.Rf, seg = P.seg, i;
    s.e.classList.remove('landed'); s.e.classList.add('rolling'); s.fs.forEach(function (f) { f.classList.remove('top'); });
    if (s.lab) s.lab.className = 'dn';
    flatShade(s, .16);   /* uçuşta sabit ton (yüz başına ışık hesabı yok) */
    s.tms = [];
    /* çarpma sesleri ve son çarpmadaki oturma vuruşu: zaman çizelgesine bağlı */
    for (i = 0; i < seg.length - 1; i++) s.tms.push(setTimeout(tickSnd, ms * seg[i][1]));
    s.tms.push(setTimeout(function () { if (s.done) return; tickSnd(); }, ms * AIR));

    function finish() {
      if (s.done) return; cancel(s); s.v = v; s.R = Rf; s.e.classList.remove('rolling');
      pose(s, Rf, 0, 0, 0, true); mark(s, v, tot);
      try { var tf = topFace(Rf); if (tf !== v) console.warn('WCDice: üst yüz ' + tf + ' ≠ ' + v); } catch (x) { }
      if (cb) cb();
    }

    var useWA = false;
    if (s.cb.animate) {
      try {
        var n = Math.min(120, Math.max(30, Math.round(ms / 14))), kc = [], ks = [], o, so, f;
        for (i = 0; i <= n; i++) {
          f = i / n; o = P.at(f); so = sdwT(o.h, o.x, o.z);
          kc.push({ transform: cbT(o.R, o.x, o.h, o.z), offset: f });
          ks.push({ transform: so.t, opacity: so.op, offset: f });
        }
        setT(s, Rf, 0, 0, 0);   /* animasyon bitince/iptalde son poz zaten yerinde — yanıp sönme yok */
        var opt = { duration: ms, easing: 'linear' }, a1 = s.cb.animate(kc, opt);
        s.an = [a1, s.e.animate([{ opacity: 0 }, { opacity: 1, offset: .07 }, { opacity: 1 }], { duration: ms, easing: 'linear' })];
        if (s.sdw) s.an.push(s.sdw.animate(ks, opt));
        a1.onfinish = finish;
        useWA = true;
      } catch (x) { useWA = false; if (s.an) { s.an.forEach(function (a) { try { a.cancel(); } catch (y) { } }); s.an = null; } }
    }
    if (!useWA) {
      var t0 = 0;
      s.e.style.opacity = '0';
      var frame = function (now) {
        if (s.done) return;
        if (!t0) t0 = now; var tt = Math.min(1, (now - t0) / ms), o = P.at(tt);
        setT(s, o.R, o.x, o.h, o.z);
        s.e.style.opacity = tt < .07 ? (tt / .07).toFixed(2) : '';
        if (tt < 1) s.raf = requestAnimationFrame(frame); else { s.e.style.opacity = ''; finish(); }
      };
      s.raf = requestAnimationFrame(frame);
    }
    s.tm = setTimeout(function () { if (!s.done) { try { s.e.style.opacity = ''; } catch (x) { } finish(); } }, ms + 250);   // arka planda animasyon durursa oyun akışı takılmasın
  }
  /* son çarpmada zar hafifçe "oturur" (kısa ölçek vuruşu; .bx preserve-3d olduğundan transform animasyonu 3B'yi bozmaz) */
  function thud(s) {
    try { if (s.bx && s.bx.animate) s.bx.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.09)', offset: .3 }, { transform: 'scale(.985)', offset: .65 }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' }); } catch (x) { }
  }

  window.WCDice = { ready: prep, faceUri: faceImgUri, cube: cube, set: setDie3, roll: rollDie, topFace: function (id) { var s = ST[id]; return s && s.R ? topFace(s.R) : 0; }, _finalR: finalR, _top: topFace, _app: app };
  try { prep(function () { faceStyle(); }); } catch (x) { }
  window.die3d = die3d; window.setDie3 = setDie3; window.rollDie = rollDie;
})();
