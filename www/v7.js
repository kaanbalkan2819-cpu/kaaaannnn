/* V7: ülke seçimi (radar + tarihçe), Türkiye başlangıç kamerası, ülke geometrisi üstünde bayraklar (+fetih geçişi),
   yeni savaş ekranı (kılıçlar + zarlar), yeni tazminat/özellik kopyalama ekranı, yüzen "Turu Bitir" düğmesi.
   app.js / v5.js / v6.js'e dokunmaz; ilgili global fonksiyonları sarar. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';
  function X(tr, en) { return L == 'tr' ? tr : en; }
  function is5() { return !!G && G.v5 === 1; }
  function isPick() { return is5() && G.ph == 'v7pick'; }
  var SI = ['👥', '🎖', '💰', '🔬', '🕊'];
  function SNm(i) { return t('S')[i]; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  // ---------- Renk paleti: sakin, ayrışan, kontrollü doygunluk ----------
  NP = [[212, 30, 36], [160, 26, 32], [30, 34, 38], [285, 20, 38], [352, 30, 38], [186, 30, 32], [48, 32, 36], [322, 22, 36]];

  // ---------- Tarihsel tanıtım: merkezi çeviri verisinden (i18n.js). Komşu isimlerinden cümle ÜRETİLMEZ. ----------
  function hist(id) { return window.I18N ? I18N.hist(id, L) : ''; }

  // Savaş kadrajı: hedef + saldıran bölge, sıkı pay
  fitBattle = function (tg, att) {
    var r = M[tg], b = r.bb ? r.bb.slice() : null; if (!b) return;
    (att || []).slice(0, 2).forEach(function (id) { var q = M[id]; if (q && q.bb && Math.abs((q.bb[0] + q.bb[2]) / 2 - (b[0] + b[2]) / 2) < Math.max(W, H_) * .35) b = uni(b, q.bb); });
    fit(grow(b, .15, Math.max(W, H_) * .02));
  };

  // ---------- Radar grafiği ----------
  function radar(v, size) {
    var c = size / 2, R0 = size * .33, ab = [X('Nüf', 'Pop'), X('Ord', 'Army'), X('Eko', 'Eco'), X('Tek', 'Tech'), X('Dip', 'Dip')];
    function pt(i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [c + Math.cos(a) * r, c + Math.sin(a) * r]; }
    function poly(f) { return [0, 1, 2, 3, 4].map(function (i) { return pt(i, R0 * f(i)).map(function (z) { return z.toFixed(1); }).join(','); }).join(' '); }
    var s = '<svg class="rad" viewBox="0 0 ' + size + ' ' + size + '" role="img">';
    [.25, .5, .75, 1].forEach(function (f) { s += '<polygon class="rg" points="' + poly(function () { return f; }) + '"/>'; });
    for (var i = 0; i < 5; i++) { var p = pt(i, R0); s += '<line class="ra" x1="' + c + '" y1="' + c + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; }
    s += '<polygon class="rv" points="' + poly(function (i) { return Math.max(.06, Math.pow(Math.min(1, v[i] / 100), .6)); }) + '"/>';
    for (i = 0; i < 5; i++) { var q = pt(i, R0 * 1.34); s += '<text class="rt" x="' + q[0].toFixed(1) + '" y="' + (q[1] + 3).toFixed(1) + '">' + SI[i] + ' ' + ab[i] + '</text>'; }
    return s + '</svg>';
  }

  // ---------- Kamera: Türkiye çevresi ----------
  function camTR(dur) {
    if (!svg || !proj || !W) return;
    var A = area(), port = A.h > A.w, a = proj(port ? [24, 45.5] : [18, 46]), b = proj(port ? [44, 34.5] : [48, 34]);
    fit([a[0], a[1], b[0], b[1]], dur == null ? 650 : dur);
  }
  var _home = home;
  home = function (dur) { if (!G || isPick() && !G.sel) { camTR(dur == null ? 650 : dur); return; } return _home(dur); };

  // ---------- Ülke seçimi ----------
  var _ng = newGame;
  newGame = function (m) {
    if (m != 1) return _ng(m);
    _ng(1);
    if (!G) return;
    closeMod(); try { localStorage.removeItem(SV); } catch (e) { }
    G.ph = 'v7pick'; G.pl = null; G.cur = null; G.act = null; G.sel = null; G.pend = null;
    render(); home(0);
  };
  var _pickC = pickC;
  pickC = function (id) {
    if (!isPick()) return _pickC(id);
    if (BSH || !M[id]) return;
    G.sel = id; render(); focusSel();
  };
  window.v7Confirm = function () {
    if (!isPick() || !G.sel || !M[G.sel]) return;
    var id = G.sel; G.pl = G.cur = G.act = id; G.sel = null; G.ph = 'v5intro'; G.kn = G.kn || {};
    $('panel').style.display = 'none'; save(); closeMod(); window.v5Start();
  };
  window.v7Other = function () { if (!isPick()) return; G.sel = null; render(); };
  // Açıklama alanı: bağımsız dikey kaydırma (tekerlek / dokunma / klavye). Olaylar haritaya (sürükleme, yakınlaştırma, ülke seçimi) ULAŞMAZ.
  // Altta/üstte metin kaldıysa .mb/.mt sınıfları solma gösterir; kısa metinde kaydırma çubuğu veya solma oluşmaz.
  function descScroll(hs) {
    if (!hs) return;
    function upd() {
      var over = hs.scrollHeight - hs.clientHeight > 2;
      hs.classList.toggle('sc', over);
      hs.classList.toggle('mt', over && hs.scrollTop > 2);
      hs.classList.toggle('mb', over && hs.scrollTop + hs.clientHeight < hs.scrollHeight - 2);
    }
    ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'mousedown', 'dblclick'].forEach(function (n) { hs.addEventListener(n, function (e) { e.stopPropagation(); }, { passive: true }); });
    hs.addEventListener('scroll', upd, { passive: true });
    hs.scrollTop = 0; upd(); setTimeout(upd, 60);
    if (window.ResizeObserver) new ResizeObserver(upd).observe(hs);
  }
  window.v7DescScroll = descScroll;
  function pickPanel() {
    var el = $('panel'), id = G.sel;
    if (!id) { el.style.display = 'none'; return; }
    var b = st(id), h = '<div class="pk"><div class="pkh">' + fimg(id, 'lg') + '<div class="pki"><div class="nm">' + esc(M[id].name) + '</div><div class="hs" id="v7hs" tabindex="0" role="region" aria-label="' + esc(M[id].name) + '">' + esc(hist(id)) + '</div></div></div>' +
      '<div class="pkb">' + radar(b, 150) + '<div class="pkl">';
    for (var i = 0; i < 5; i++) h += '<div class="pr"><span>' + SI[i] + ' ' + SNm(i) + '</span><b>' + v1(b[i]) + '</b></div>';
    h += '</div></div><div class="pkf"><button class="pri" onclick="v7Confirm()">' + X('Bu Ülkeyle Başla', 'Start With This Country') + '</button><button onclick="v7Other()">' + X('Başka Ülke Seç', 'Choose Another') + '</button></div></div>';
    el.innerHTML = h; el.style.display = 'block'; descScroll($('v7hs'));
  }
  var _hud = hud;
  hud = function () {
    if (!isPick()) return _hud();
    $('hud').innerHTML = '<span class="ttl">' + X('Oynamak istediğin ülkeye dokun', 'Tap the country you want to play') + '</span><span class="sp"></span><button class="hb" onclick="settings()">' + IC.set + '</button><button class="hb" onclick="menu()">' + IC.menu + '</button>';
  };
  var _render = render;
  render = function () {
    if (isPick()) {
      TG = {}; hud(); paint(); pickPanel();
      var hn = $('hint'); if (G.sel) hn.style.display = 'none'; else { hn.textContent = X('Bir ülkeye dokun', 'Tap a country'); hn.style.display = 'block'; }
      endBtn(); return;
    }
    _render(); endBtn();
  };
  // Küçük ülkeler için dokunma toleransı: denize/boşluğa dokunulursa 16px içindeki küçük ülke seçilir
  function nearTap(ev) {
    if (!isPick() || BSH || !ev.target || !ev.target.classList || !ev.target.classList.contains('bgr')) return;
    var rc = svg.node().getBoundingClientRect(), x = (ev.clientX - rc.left - CAM.x) / CAM.k, y = (ev.clientY - rc.top - CAM.y) / CAM.k, best = null, bd = 1e9;
    R.forEach(function (r) { if (!r.px) return; var d = Math.hypot(r.px[0] - x, r.px[1] - y) * CAM.k; if (d < bd && d < 18 && Math.max(r.bw, r.bh) * CAM.k < 26) { bd = d; best = r; } });
    if (best) pickC(best.id);
  }

  // ---------- "Turu Bitir" düğmesi ----------
  // Tek görevi: oyuncunun turunu kapatıp yapay zekâ turunu başlatmak. Savaş fonksiyonunu doğrudan ÇAĞIRMAZ.
  // Düğme seçili-ülke panelinin (Detay / Saldır) üstüne asla binmez: konumu panel yüksekliğine göre hesaplanır.
  function endBtn() {
    var b = $('v7end'), on = is5() && G.ph == 'act' && !BSH && !G.over && !G.endLock;
    if (!b) {
      b = document.createElement('button'); b.id = 'v7end'; b.className = 'v45end'; b.type = 'button';   // V45: yeniden tasarım (v41.css)
      b.addEventListener('pointerdown', function () { b.__pd = performance.now(); });   // V101: dokunuş gerçekten düğmede başlamalı
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        /* V101: ülkeye dokununca panel açılıp düğme yer değiştirince, aynı dokunuşun hayalet tıkı düğmeye düşüp "Turu bitir?" soruyordu.
           Dokunuş düğmede başlamadıysa (pointerdown yoksa) tık yok sayılır; klavye/program tıkı (detail 0) serbest. */
        if (ev.detail !== 0 && !(b.__pd && performance.now() - b.__pd < 1500)) return;
        b.__pd = 0; window.v5EndAsk();
      });
      $('map').appendChild(b);
    }
    b.style.display = on ? 'flex' : 'none';
    if (!on) return;
    // V45: panel butonlarıyla aynı dil — sol altın ikon, ortada ad, sağda hamle sayacı; hamle kalmayınca düğme altın (birincil) olur
    b.innerHTML = '<span class="ei">⏭</span><span class="et">' + X('Turu Bitir', 'End Turn') + '</span><span class="em"><i>' + G.T.moves + '</i> ' + X('hamle', 'moves') + '</span>';
    b.classList.toggle('done', !(G.T.moves > 0));
    var pn = $('panel'), pv = pn && pn.style.display == 'block';
    b.style.bottom = pv ? ((window.panelHEst ? panelHEst() : 0) || pn.offsetHeight) + 10 + 'px' : 'calc(14px + var(--safe-b))';   // V26: önbellekli yükseklik (zorunlu yerleşim yok)
  }
  window.v7EndBtn = endBtn;
  window.addEventListener('resize', function () { if (G) endBtn(); });

  // ---------- V11: harita üzerindeki bayraklar kaldırıldı (clipPath/kümeleme/culling yok) ----------
  // Yalnızca savaş ekranı vb. için sahip→bayrak kodu dönüşümü kalır.
  function flagId(o) { return typeof o == 'number' ? ((G.P[o] && G.P[o].start) || G.pl) : o; }

  // ---------- Zar / kılıç / savaş ekranı ----------
  var PP = { 1: [[5, 5]], 2: [[2.6, 2.6], [7.4, 7.4]], 3: [[2.6, 2.6], [5, 5], [7.4, 7.4]], 4: [[2.6, 2.6], [7.4, 2.6], [2.6, 7.4], [7.4, 7.4]], 5: [[2.6, 2.6], [7.4, 2.6], [5, 5], [2.6, 7.4], [7.4, 7.4]], 6: [[2.6, 2.6], [7.4, 2.6], [2.6, 5], [7.4, 5], [2.6, 7.4], [7.4, 7.4]] };
  function pipsHtml(n) { n = Math.round(+n) || 1; n = ((n - 1) % 6 + 6) % 6 + 1; return PP[n].map(function (q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="1.12"/>'; }).join(''); }
  function die7(id) {   /* V80: gerçek 3D zar (dice3d.js); sonuç ÜST yüzden okunur. dice3d.js yoksa eski SVG zar */
    if (window.WCDice) return '<div class="d7" data-x3="1" id="' + id + '">' + WCDice.cube(id + '_3', id.charAt(1) == 'a' ? 'at' : 'df') + '</div>';
    return '<div class="d7" id="' + id + '"><svg viewBox="0 0 10 10">' + pipsHtml(1) + '</svg></div>'; }
  /* V63: 6 gelince tekrar atılan savaş zarı toplamı 6'yı aşabilir (ör. 6+4=10); eskiden PP[n] tanımsız kalıp savaş ekranı zarda donuyordu.
     Zarın üstünde (n-1)%6+1 noktası gösterilir, toplam rozet olarak yanında yazılır. */
  (function () { if (document.getElementById('v7totcss')) return; var st = document.createElement('style'); st.id = 'v7totcss'; st.textContent = '.d7{position:relative}.d7[data-tot]:not([data-tot=""])::after{content:attr(data-tot);position:absolute;right:-6px;top:-8px;min-width:20px;height:20px;line-height:20px;border-radius:10px;text-align:center;font:700 12px system-ui,sans-serif;color:#1b1300;background:#ffd067;box-shadow:0 1px 4px #0008}'; document.head.appendChild(st); })();
  function setD7(id, n) {
    var e = $(id); if (e) {
      if (e.getAttribute('data-x3') && window.WCDice) {
        /* V190: zar zaten aynı değerle inmişse (landed) tam yeniden pozlama/gölgelendirme tekrarlanmaz — görünüm aynı, iş azalır */
        var v6 = ((Math.round(+n) || 1) - 1) % 6 + 1, d3 = document.getElementById(id + '_3');
        if (!(e.__sv === v6 && d3 && d3.classList.contains('landed') && !d3.classList.contains('rolling'))) WCDice.set(id + '_3', v6);
        e.__sv = v6;
      } else e.firstChild.innerHTML = pipsHtml(n);
      var tt = n > 6 ? String(n) : ''; if (e.getAttribute('data-tot') !== tt) e.setAttribute('data-tot', tt);
    }
  }
  /* V192: bayrak data-URI'leri (büyük base64 dizgisi) her innerHTML'de yeniden ayrıştırılıyordu: bir kez Blob URL'ye çevrilip önbelleğe alınır.
     Kaybeden bayrağın CSS grayscale filtresi yerine gri sürüm bir kez (boştayken) üretilir; olmazsa eski filtreye geri düşer (.gfb). */
  var FB7 = {}, FG7 = {};
  function flagBlob7(code, gray) {
    var c = gray ? FG7 : FB7; if (c[code] !== undefined) return c[code];
    var u = window.FLAGSVG && FLAGSVG[code], out = null;
    try {
      if (u && u.indexOf('data:image/svg+xml;base64,') === 0 && window.URL && URL.createObjectURL) {
        var bin = atob(u.slice(26)), n = bin.length, ar = new Uint8Array(n); for (var k = 0; k < n; k++) ar[k] = bin.charCodeAt(k);
        if (!gray) out = URL.createObjectURL(new Blob([ar], { type: 'image/svg+xml' }));
        else if (window.TextDecoder) {
          var tx = new TextDecoder('utf-8').decode(ar), m = tx.match(/<svg[^>]*[^\/]>/i), e2 = tx.lastIndexOf('</svg>');
          if (m && e2 > 0) { var at = m.index + m[0].length; tx = tx.slice(0, at) + '<filter id="wcg"><feColorMatrix type="saturate" values=".1"/></filter><g filter="url(#wcg)">' + tx.slice(at, e2) + '</g>' + tx.slice(e2); out = URL.createObjectURL(new Blob([tx], { type: 'image/svg+xml' })); }
        }
      }
    } catch (x) { out = null; }
    c[code] = out; return out;
  }
  function fimg7(id, c, gray) {
    var code = FL[id], b = code ? flagBlob7(code, gray) : null;
    if (!b) return fimg(id, (c || '') + (gray ? ' gfb' : ''));
    return '<img class="fi ' + (c || '') + '" src="' + b + '" alt="" draggable="false">';
  }
  var SWORD = '<g><path d="M0 -46 L5 -40 L5 20 L-5 20 L-5 -40Z" fill="url(#sg)" stroke="#6b7488" stroke-width="1"/><rect x="-16" y="20" width="32" height="6" rx="3" fill="#f5b53a" stroke="#8a5a00"/><rect x="-3.5" y="26" width="7" height="18" rx="3" fill="#7a3b12"/><circle cy="47" r="4.5" fill="#f5b53a" stroke="#8a5a00"/></g>';
  /* V192: kılıçlar ve kıvılcım ayrı <svg> katmanları (HTML eleman = compositor katmanı, bir kez boyanır); gradyan korunur; 8 çizgi tek <path> */
  var SWORDS = (function () {
    var vb = '<svg viewBox="-60 -60 120 120" class="swd ', gr = function (id) { return '<defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#e9eefc"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#9aa6c2"/></linearGradient></defs>'; };
    var d = [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { var r = a * Math.PI / 180, s = Math.sin(r), c = Math.cos(r); return 'M' + (8 * s).toFixed(2) + ' ' + (-8 * c).toFixed(2) + 'L' + (22 * s).toFixed(2) + ' ' + (-22 * c).toFixed(2); }).join('');
    return vb + 'sl">' + gr('sgl') + '<g transform="rotate(45)">' + SWORD.replace(/#sg\)/g, '#sgl)') + '</g></svg>' +
      vb + 'sr">' + gr('sgr') + '<g transform="rotate(-45)">' + SWORD.replace(/#sg\)/g, '#sgr)') + '</g></svg>' +
      vb + 'spk"><circle r="3" fill="#fff"/><path d="' + d + '" fill="none" stroke="#ffd067" stroke-width="2.4" stroke-linecap="round"/></svg>';
  })();
  function side(cls, role, id, name, s, m, bon) {
    return '<div class="s7 ' + cls + '" id="' + (cls == 'a' ? 'sa' : 'sdf') + '"><div class="rl">' + role + '</div>' + fimg7(id, 'lg') + '<div class="nm">' + esc(name) + '</div>' +
      '<div class="ln">👥 ' + X('Nüfus', 'Pop.') + ' <b>' + v1(s[0]) + '</b></div><div class="ln">🎖 ' + X('Ordu', 'Army') + ' <b>' + v1(s[1]) + '</b></div>' +
      '<div class="mx" id="m' + cls + '">×' + (m * (bon ? PREV_WIN : 1)).toFixed(2) + '</div><div class="pt">' + X('PUAN', 'POINTS') + '<b id="p' + cls + '">0</b></div></div>';
  }
  showBattle = function (r, p, e, tg, mv, att) {
    var done = 0, tm = [], sp = SET.rm ? 0 : SET.spd, bs = $('bs'), aw = 0, dw = 0, ph = 0;
    var lock86 = !!(G && G.over); if (lock86 && !sp) sp = 1;   /* V86: oyunu bitirecek savaş atlanamaz */
    var fa = flagId(p), fd = flagId(e);
    BT = { a: att, d: tg }; BSH = true; try { document.body.classList.add('bsh'); } catch (e) { } $('panel').style.display = 'none'; $('hint').style.display = 'none'; var eb = $('v7end'); if (eb) eb.style.display = 'none';
    bs.className = 'b7'; G.lastRep = r.rep;
    var h = '<div class="b7h">' + side('a', t('A'), fa, nm(p), r.A, r.mA, r.bA) + '<div class="sx" id="sx">' + SWORDS + '</div>' + side('d', t('D'), fd, nm(e), r.D, r.mD, r.bD) + '</div>' +
      '<div class="dr"><div class="dc" id="dca">' + die7('da') + '<b class="dsm" id="dsa"></b></div><div class="dm" id="mu">' + X('Savaş başlıyor…', 'Battle begins…') + '</div><div class="dc" id="dcd">' + die7('db') + '<b class="dsm" id="dsd"></b></div></div><div class="cmp">';
    for (var i = 0; i < 5; i++) h += '<div class="sr7" id="r' + i + '"><b class="v"></b><div class="mid"><span class="lbl">' + SI[i] + ' ' + SNm(i) + '</span><div class="bar"><i class="a"></i><i class="d"></i></div></div><b class="v"></b></div>';
    bs.innerHTML = h + '</div><div class="ul" id="ul"></div><div class="fin" id="fn"></div>'; bs.style.display = 'block'; bs.scrollTop = 0; paint(); fitBattle(tg, att);
    try { var lc = FL[r.win ? fd : fa]; (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(function () { if (lc) flagBlob7(lc, true); }); } catch (x) { }   /* V192 */
    function mult() {
      var parts = [];
      parts.push(r.diff ? X('Yüksek zar', 'Higher die') + ': <b>' + (r.ra > r.rd ? t('A') : t('D')) + ' ×' + r.mult.toFixed(2) + '</b>' : X('Eşit zar: çarpan yok', 'Equal dice: no multiplier'));
      if (r.bA) parts.push(X('Saldıran önceki zafer bonusu ×' + PREV_WIN.toFixed(2), 'Attacker previous-win bonus ×' + PREV_WIN.toFixed(2)));
      if (r.adv && r.adv.length) r.adv.forEach(function (s) { parts.push(s); });   /* V102 */
      if (r.bD) parts.push(X('Savunan önceki zafer bonusu ×' + PREV_WIN.toFixed(2), 'Defender previous-win bonus ×' + PREV_WIN.toFixed(2)));
      var ulh = parts.join(' · '), ule = $('ul'); if (ule.innerHTML !== ulh) ule.innerHTML = ulh;   /* V190: aynı içerik yeniden kurulmaz */
    }
    /* V86: karşı taraftan yüksek değer → yeşil dolu ▲, düşük değer → kırmızı küçük ▼, eşitse işaret yok */
    function wcArr(a, b) { a = v1(a); b = v1(b); return a > b ? '<span class="ar up">▲</span>' : a < b ? '<span class="ar dn">▼</span>' : ''; }
    var rr = [];   /* V190: satır elemanları + son yazılan genişlikler (finish() satırları ikinci kez çalıştırınca DOM'a dokunulmaz) */
    function row(i, snd) {
      var x = r.rows[i], rw = rr[i];
      if (!rw) { var el0 = $('r' + i); rw = rr[i] = { el: el0, v: el0.querySelectorAll('.v'), b: el0.querySelectorAll('.bar i'), w0: null, w1: null }; }
      var el = rw.el, tot = x.a + x.d || 1, v = rw.v, b = rw.b;
      var h0 = v1(x.a) + wcArr(x.a, x.d), h1 = v1(x.d) + wcArr(x.d, x.a), c0 = 'v' + (x.w == 'a' ? ' up' : ''), c1 = 'v' + (x.w == 'd' ? ' up' : '');
      if (v[0].innerHTML !== h0) v[0].innerHTML = h0; if (v[1].innerHTML !== h1) v[1].innerHTML = h1;
      if (v[0].className !== c0) v[0].className = c0; if (v[1].className !== c1) v[1].className = c1;
      var w0 = 'scaleX(' + (x.a / tot).toFixed(4) + ')', w1 = 'scaleX(' + (x.d / tot).toFixed(4) + ')';   /* V191: width yerine transform (layout yok) */
      if (rw.w0 !== w0) { b[0].style.transform = w0; rw.w0 = w0; } if (rw.w1 !== w1) { b[1].style.transform = w1; rw.w1 = w1; }
      var cl = 'sr7 on ' + (x.w == 'a' ? 'a' : x.w == 'd' ? 'd' : 'e'); if (el.className !== cl) el.className = cl;
      if (x.w == 'a') aw++; if (x.w == 'd') dw++;
      var pa = $('pa'), pd = $('pd'), sa = String(aw), sd = String(dw); if (pa.textContent !== sa) pa.textContent = sa; if (pd.textContent !== sd) pd.textContent = sd;
      if (snd) AU.play('tick');
    }
    /* V66: 6 gelen zar sabit kalır, yanına yeni zar eklenir (en çok 3); oyuncu dokununca yeni zar atılır */
    var sA = (r.da && r.da.length) ? r.da : [r.ra], sD = (r.dd && r.dd.length) ? r.dd : [r.rd], waiting = false, rk = 0;
    function did(sd, i) { return 'd' + (sd == 'd' ? 'b' : sd) + (i ? i : ''); }   /* V70: savunan zarın ilk kimliği 'db' (eskiden 'dd' aranıp YENİ zar ekleniyor, ilk zar hep 1 kalıyordu) */
    function mkDie(sd, i, blank) {
      var id = did(sd, i), e = $(id), c = $('dc' + (sd == 'a' ? 'a' : 'd'));
      if (!e) { var w = document.createElement('div'); w.innerHTML = die7(id); e = w.firstChild; c.insertBefore(e, $('ds' + sd)); }
      var dcl = 'dc m' + c.querySelectorAll('.d7').length; if (c.className !== dcl) c.className = dcl; if (blank) { e.className = 'd7 wait'; } return e;   /* V190: aynı sınıf yeniden yazılıp zar boyutu stili geçersiz kılınmaz */
    }
    function sumLbl(i) { [['a', sA], ['d', sD]].forEach(function (y) { var a = y[1].slice(0, i == null ? y[1].length : i + 1), t0 = a.reduce(function (p, q) { return p + q; }, 0), l = $('ds' + y[0]), tx = a.length > 1 ? '= ' + t0 : ''; if (l && l.textContent !== tx) l.textContent = tx; }); }
    function rowsRun() {   /* V191: 5 satır + finish tek rAF döngüsünde (zamanlama aynı: satır i = i*420/sp, finish = 2480/sp); yazımlar kare başına denk gelir */
      var t0 = null, i = 0, fin = 0;
      row(i++, 1);
      (function fr(ts) {
        if (done) return;
        if (t0 === null) t0 = ts;
        var el = (ts - t0) * sp;
        if (i < 5 && el >= i * 420) { row(i++, 1); }
        if (i >= 5 && !fin && el >= 2100) { fin = 1; }
        if (fin && el >= 2480) { finish(); return; }
        requestAnimationFrame(fr);
      })(performance.now());
    }
    function roundRoll(i) {
      var act = []; if (sA.length > i) act.push(['a', i]); if (sD.length > i) act.push(['d', i]);
      var x3 = !!window.WCDice, RMS = Math.round(1250 / Math.min(sp, 1.5));
      act.forEach(function (x) { var de = mkDie(x[0], x[1]); de.__sv = 0; de.className = x3 ? 'd7' : 'd7 rolling'; });
      AU.play('dice');
      var iv = null;
      if (x3) act.forEach(function (x) { WCDice.roll(did(x[0], x[1]) + '_3', (x[0] == 'a' ? sA : sD)[x[1]], RMS, x[0] == 'a' ? -1 : 1); });   /* V80: zar önceden belirlenen sayıya, ÜST yüzü o olacak şekilde iner */
      else { iv = setInterval(function () { act.forEach(function (x) { setD7(did(x[0], x[1]), 1 + Math.floor(Math.random() * 6)); }); }, 85); tm.push(iv); }
      tm.push(setTimeout(function () {
        if (iv) clearInterval(iv); if (done) return;
        act.forEach(function (x) { var f = (x[0] == 'a' ? sA : sD)[x[1]], id = did(x[0], x[1]); setD7(id, f); var ce = $(id), cn = 'd7' + (f == 6 ? ' six' : ''); if (ce.className !== cn) ce.className = cn; });
        sumLbl(i);
        if (sA.length > i + 1 || sD.length > i + 1) {   // 6 geldi: yeni zar yerini alır, oyuncu dokununca atılır
          [['a', sA], ['d', sD]].forEach(function (y) { if (y[1].length > i + 1) mkDie(y[0], i + 1, true); });
          waiting = true; rk = i + 1; $('mu').innerHTML = '<b>6!</b> ' + X('Dokun → yeni zar', 'Tap → roll new die'); AU.play('tick');
        } else { showDice(); AU.play('tick'); ph = 1; rowsRun(); }
      }, x3 ? RMS + 90 : 950 / Math.min(sp, 1.5)));
    }
    function showDice() {
      [['a', sA, r.ra > r.rd], ['d', sD, r.rd > r.ra]].forEach(function (y) {
        for (var i = 0; i < y[1].length; i++) { var id = did(y[0], i); mkDie(y[0], i); setD7(id, y[1][i]); var de2 = $(id), cn2 = 'd7' + (y[2] ? ' hi' : '') + (y[1][i] == 6 ? ' six' : ''); if (de2.className !== cn2) de2.className = cn2; }
      });
      sumLbl(); var muh = r.diff ? (r.ra > r.rd ? '◀ ' : '') + '×' + r.mult.toFixed(2) + (r.ra > r.rd ? '' : ' ▶') : '＝', mue = $('mu'); if (mue.innerHTML !== muh) mue.innerHTML = muh; mult(); }
    function finish() {
      if (done) return; done = 1; tm.forEach(clearTimeout); ph = 3; showDice(); aw = 0; dw = 0; for (var i = 0; i < 5; i++) row(i, 0);
      $('sa').className = 's7 a ' + (r.win ? 'win' : 'lose'); $('sdf').className = 's7 d ' + (r.win ? 'lose' : 'win'); bs.className = 'b7 ' + (r.win ? 'vw' : 'vl');
      // V27: sonuçta saldıran/savunan panelleri ve zarlar kalkar; bayraklar 5 özellik karşılaştırmasının üstüne iner
      try { var cmp7 = bs.querySelector('.cmp'); if (cmp7 && !bs.querySelector('.fl7')) cmp7.insertAdjacentHTML('beforebegin', '<div class="fl7"><div class="fl7s ' + (r.win ? 'w' : 'l') + '">' + fimg7(fa, 'lg', !r.win) + '<small>' + esc(nm(p)) + '</small></div><span class="fl7x">⚔</span><div class="fl7s ' + (r.win ? 'l' : 'w') + '">' + fimg7(fd, 'lg', r.win) + '<small>' + esc(nm(e)) + '</small></div></div>'); } catch (x) { }
      var wn = r.win ? nm(p) : nm(e), ls = r.win ? nm(e) : nm(p);
      $('fn').innerHTML = '<div class="fh"><span class="banner ' + (r.win ? 'w' : 'l') + '">' + (r.win ? t('win') : t('lose')) + '</span><span class="tl">' + r.aw + ' – ' + r.dw + '</span></div>' +
        '<div class="chips7"><span class="c7">' + (r.win ? '🏳 <b class="w">+' + esc(M[tg].name) + '</b>' : (mv ? '🏳 <b class="l">−' + esc(M[mv].name) + '</b>' : '—')) + '</span>' +
        '<span class="c7">💰 <b class="w">' + esc(nm(r.rep.w)) + ' +' + v1(r.rep.amt) + '</b></span>' +
        (r.win && G.autoBonus ? '<span class="c7">🎁 ' + (G.autoBonus.idx != null ? t('S')[G.autoBonus.idx] + ' +%10' : '+%10') + '</span>' : '') + '</div>' +
        '<details class="why7"><summary>ℹ ' + X('Ayrıntı', 'Details') + '</summary><p class="rs">' + X('Kazanan', 'Winner') + ': <b class="w">' + esc(wn) + '</b> · ' + X('Kaybeden', 'Loser') + ': <b class="l">' + esc(ls) + '</b><br>' + (r.win ? t('ru1') : r.dw >= 3 ? t('ru2') : t('ru3')) + '<br>' + t('rep') + ': ' + esc(nm(r.rep.w)) + ' +' + v1(r.rep.amt) + ' / ' + esc(nm(r.rep.l)) + ' −' + v1(r.rep.amt) + '</p></details>' +
        '<button class="big pri" onclick="closeBattle()">' + ((r.win && G.pend && !G.pend.done) ? t('cont2') : X('Haritaya Dön', 'Back to Map')) + '</button>';
      OV = {}; if (r.win) { FLASH = tg; setTimeout(function () { FLASH = null; if (G) overlay(); }, 1300); }
      paint(); splash(r.win); requestAnimationFrame(function () { bs.scrollTop = bs.scrollHeight; }); /* V191: scrollHeight okuması finish içinde senkron layout zorluyordu; kare başına ertelendi */ AU.play(r.win ? 'win' : 'lose'); if (r.win) tm.push(setTimeout(function () { AU.play('conq'); }, 500));
    }
    bs.onclick = function (ev) { if (ev.target.closest && ev.target.closest('button')) return; if (done) return; if (waiting) { waiting = false; $('mu').innerHTML = ''; roundRoll(rk); return; } if (lock86) return; finish(); };
    if (!sp) { finish(); return; }
    // 1) kılıçlar hızlanıp çarpışır  2) zarlar atılır  3) çarpanlar  4) beş karşılaştırma  5) sonuç
    var sx = $('sx'); AU.play('tick'); sx.className = 'sx go';
    tm.push(setTimeout(function () { sx.className = 'sx go hit'; bs.classList.add('shake'); AU.play('click'); }, 480 / Math.min(sp, 1.5)));
    tm.push(setTimeout(function () { bs.classList.remove('shake'); roundRoll(0); }, 820 / Math.min(sp, 1.5)));
  };

  // ---------- Fetih sonrası: tazminat + özellik kopyalama ekranı ----------
  // Ek %10 bonus durumu: kazanıldı mı, kazanılmadıysa hangi özellikler yetersiz?
  function bonusLine(p) {
    var bn = p && p.bonus; if (!bn) return '';
    if (bn.ok) return '<div class="bnb ok">🎁 <b>' + X('Ek %10 bonus KAZANDIN', 'Extra +10% bonus EARNED') + '</b><br><small>' +
      X('Beş özelliğin de rakipten yüksek. Kopyalamadan sonra %10 artıracağın özelliği seçeceksin.', 'All five of your stats beat the rival. After copying you will choose one stat to raise by 10%.') + '</small></div>';
    var bad = []; for (var i = 0; i < 5; i++) if (!bn.cmp[i]) bad.push(SNm(i));
    return '<div class="bnb no">🎁 ' + X('Ek %10 bonus yok', 'No extra +10% bonus') + ' — <small>' + X('eşit veya düşük: ', 'equal or lower: ') + bad.join(', ') + '</small></div>';
  }
  var pickSel = -1;
  function showPick7() {
    var p = G.pend; if (!p || p.done) return; pickSel = -1;
    var me = st(G.pl), foe = p.foeSnap, rp = G.lastRep, h = '<div class="cr"><div class="crh">' + X('Savaş Sonucu', 'Battle Result') + '</div>' +
      '<div class="crf">' + fimg(G.pl, 'lg') + '<span class="arr">⚔</span>' + fimg(p.loser, 'lg lost') + '</div>' +
      '<div class="crt">' + t('win') + '</div><p class="crs">' + esc(nm(G.pl)) + ' — <b>' + esc(M[p.tg].name) + '</b> ' + X('ele geçirildi.', 'captured.') +
      (p.destroyed ? ' <b class="l">' + esc(M[p.loser].name) + ' ' + X('tamamen yok edildi.', 'was destroyed.') + '</b>' : ' ' + X('Rakip devlet yaşıyor: ', 'The rival lives on: ') + esc(M[p.loser].name)) + '</p>' +
      (rp ? '<p class="crs">💰 ' + t('rep') + ': <b class="w">+' + v1(rp.amt) + '</b></p>' : '') +
      bonusLine(p) +
      '<div class="crc">' + X('Rakipten kopyalanacak bir özellik seç. Rakip değişmez; seçtiğin değer rakibin değerine eşitlenir.', 'Pick one stat to copy from the rival. The rival is unchanged; your value is set to theirs.') + '</div><div class="cards">';
    for (var i = 0; i < 5; i++) {
      var d = foe[i] - me[i];
      h += '<button class="cd" id="cd' + i + '" onclick="v7Sel(' + i + ')"><span class="ci">' + SI[i] + '</span><span class="cn">' + SNm(i) + '</span>' +
        '<span class="cv"><i>' + X('Sen', 'You') + '</i><b>' + v1(me[i]) + '</b></span><span class="cv"><i>' + X('Rakip', 'Rival') + '</i><b>' + v1(foe[i]) + '</b></span>' +
        '<span class="cv af"><i>' + X('Sonra', 'After') + '</i><b>' + v1(foe[i]) + '</b></span><span class="dl ' + (d > 0.05 ? 'up' : d < -0.05 ? 'dn' : '') + '">' + (d > 0.05 ? '▲ +' + v1(d) : d < -0.05 ? '▼ ' + v1(d) : '＝') + '</span></button>';
    }
    modal(h + '</div><button class="big pri" id="cdok" disabled onclick="v7Ok()">' + X('Özelliği Seç ve Devam Et', 'Pick Stat and Continue') + '</button></div>');
    $('box').classList.add('crbox');
  }
  window.v7Sel = function (i) {
    if (!G || !G.pend || G.pend.done) return; pickSel = i;
    for (var k = 0; k < 5; k++) { var c = $('cd' + k); if (c) c.classList.toggle('on', k == i); }
    $('cdok').disabled = false; AU.play('click');
  };
  window.v7Ok = function () {
    if (pickSel < 0 || !G || !G.pend || G.pend.done) return;
    var i = pickSel; pickSel = -1; $('cdok').disabled = true; $('box').classList.remove('crbox'); window.v5Pick(i);
  };
  var _cb = closeBattle;
  closeBattle = function () { _cb(); if (is5() && G && G.ph == 'v5pick' && G.pend && !G.pend.done) showPick7(); endBtn(); };
  // Kayıttan devam: bekleyen seçim varsa yeni ekran
  var _cont = cont;
  cont = function () { _cont(); if (is5() && G && G.ph == 'v5pick' && G.pend && !G.pend.done) showPick7(); endBtn(); };

  // ---------- Başlatma ----------
  window.addEventListener('load', function () {
    var m = $('map'); if (m) m.addEventListener('click', nearTap, true);
    if (svg && !G) camTR(0);
  });
  window.V7 = { hist: hist, radar: radar, camTR: camTR, flagsBuilt: function () { return false; }, cull: function () {}, showPick7: showPick7, HT: (window.I18N ? I18N.histTR : {}) };
})();
