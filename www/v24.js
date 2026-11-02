/* V24 — (1) güçlü devlet, güçsüz devletle pakt/ateşkesi nadiren kabul eder (tampon bölge istisnası)
         (2) tur oyuncudan rakibe geçince kamera rakibe gider, sonra serbest bırakır
   Diğer V24 değişiklikleri: rules5.js (2 keşif), v23.js (casus raporu olasılığı), v24.css (elçi ekranı, savaş paneli, zar düğmesi). */
(function () {
  'use strict';
  function lang() { try { return (typeof L !== 'undefined' && L === 'en') ? 'en' : 'tr'; } catch (e) { return 'tr'; } }
  function T(a, b) { return lang() === 'en' ? b : a; }
  function nmE(e) { return (window.M && M[e] && M[e].name) || e; }
  function turnNo() { return (G && G.T && G.T.turn) || 0; }
  function power(e) { var a = st(e), s = 0; for (var i = 0; i < 5; i++) s += (+a[i] || 0); return s; }

  // ================= 1) Güçlü ↔ güçsüz pakt kuralı =================
  var STRONG_RATIO = 1.35;   // <<< AYAR: güçlü sayılma eşiği (toplam güç oranı)
  var P_WEAK = 0.08;         // <<< AYAR: güçlü devletin güçsüzle pakt kabul ihtimali (düşük)
  var P_WEAK_PL = 0.35;       // V45: OYUNCUNUN pakt teklifinde güçlü devletin kabul ihtimali (dostluk antlaşmasından hep daha kolay)
  var P_BUFFER = 0.7;        // <<< AYAR: güçsüz devlet tampon bölgeyse kabul ihtimali
  var DANGER = 0.75;         // <<< AYAR: "önemli tehlike" = güçlü devletin en az bu oranda gücü olan üçüncü devlet

  function borders(a, b) {   // a, b'ye (kara veya deniz) saldırabiliyor mu / komşu mu
    try { var tg = targets(a, G.owner); for (var k in tg) if (G.owner[k] === b) return true; } catch (e) { }
    return false;
  }
  function empires() { var al = [], seen = {}; for (var k in G.owner) { var o = G.owner[k]; if (typeof o === 'string' && !seen[o]) { seen[o] = 1; al.push(o); } } return al; }
  // Güçsüz devlet, güçlü devlet ile başka bir güçlü devlet (önemli tehlike) arasında tampon mu? (Koruma talebi ve pakt için)
  function isBuffer(strong, weak) {
    try {
      if (!borders(strong, weak)) return false;
      var ps = power(strong), al = empires();
      for (var i = 0; i < al.length; i++) {
        var x = al[i]; if (x === strong || x === weak) continue;
        if (power(x) < DANGER * ps) continue;                       // yeterince tehlikeli değil
        if (borders(x, weak)) return true;                          // güçsüz devlet, iki güçlü devletin arasında
      }
    } catch (e) { }
    return false;
  }
  // a ve b arasında pakt yapılabilir mi? (kararı güçlü taraf verir)
  function pactOk(a, b, easy) {
    try {
      var pa = power(a), pb = power(b), strong = pa >= pb ? a : b, weak = strong === a ? b : a;
      if (Math.max(pa, pb) < STRONG_RATIO * Math.max(1e-6, Math.min(pa, pb))) return true;   // dengeli güçler: normal
      return Math.random() < (isBuffer(strong, weak) ? Math.max(P_BUFFER, easy ? .9 : 0) : (easy ? P_WEAK_PL : P_WEAK));
    } catch (e) { return true; }
  }
  function lopsided(a, b) { try { var pa = power(a), pb = power(b); return Math.max(pa, pb) >= STRONG_RATIO * Math.max(1e-6, Math.min(pa, pb)); } catch (e) { return false; } }

  // Oyuncu pakt isteği (Elçi → Saldırmazlık Paktı)
  var _po = window.v20PactOk;
  window.v20PactOk = function () {
    try {
      var e = G && G.sel && G.owner[G.sel];
      if (G && G.v5 === 1 && G.ph === 'act' && typeof e === 'string' && e !== G.pl && !(window.v20Pacted && v20Pacted(G.pl, e))) {
        G.pactNo24 = G.pactNo24 || {};
        var rec = G.pactNo24[e], tn = turnNo(), ok;
        if (rec && rec.t === tn) ok = false;                            // bu tur zaten reddetti: tekrar deneme yok
        else { ok = (G.pl && pactOk(e, G.pl, true)); if (!ok) G.pactNo24[e] = { t: tn }; }
        if (!ok) {
          try { save(); } catch (x) { }
          toast('🚫 ' + nmE(e) + ' — ' + T('şimdilik pakt istemedi (ücret alınmadı)', 'declined a pact for now (no charge)'));
          try { render(); } catch (x) { }
          return;
        }
      }
    } catch (x) { }
    return _po && _po.apply(this, arguments);
  };
  // Pakt penceresinde uyarı: güçlü devlet nadiren kabul eder
  var _pp = window.v20Pact;
  window.v20Pact = function () {
    var r = _pp && _pp.apply(this, arguments);
    try {
      var e = G && G.sel && G.owner[G.sel];
      if (typeof e === 'string' && e !== G.pl && lopsided(e, G.pl) && power(e) > power(G.pl)) {
        var b = document.getElementById('box'), btn = b && b.querySelector('button.pri');
        if (btn && !b.querySelector('.pacthint24')) btn.insertAdjacentHTML('beforebegin', '<div class="pacthint24">⚠ ' + T('Güçlü bir devlet bazen paktı reddedebilir. Reddederse ücret alınmaz.', 'A much stronger state may sometimes decline. No charge if refused.') + '</div>');
      }
    } catch (x) { }
    return r;
  };
  window.V24 = { pactOk: pactOk, isBuffer: isBuffer, power: power };

  // ================= 2) Kamera: sıra rakibe geçince oraya git, sonra serbest bırak =================
  var NOCAM = false;
  window.v24CamTo = function (ai) {      // tek seferlik: ülkenin en büyük toprağına odaklan; kilitleme yok
    try {
      if (!G || BSH || !window.fit || !window.focusBox) return;
      var best = null, ba = -1;
      R.forEach(function (r) { if (G.owner[r.id] === ai && r.bb) { var a = (r.bb[2] - r.bb[0]) * (r.bb[3] - r.bb[1]); if (a > ba) { ba = a; best = r.id; } } });
      if (best) fit(focusBox(best), 500);
    } catch (e) { }
  };
  // Rakip savaşı kapanınca kamera oyuncunun ülkesine geri ZORLANMAZ (kullanıcı nerede bıraktıysa orada kalır)
  var _fs = focusSel, _hm = home;
  focusSel = function () { if (NOCAM) return; return _fs.apply(this, arguments); };
  home = function () { if (NOCAM) return; return _hm.apply(this, arguments); };
  var _cb = closeBattle;
  closeBattle = function () {
    try { NOCAM = !!(G && G.v5 === 1 && G.ph === 'v5battle' && G.last && G.last.ai); } catch (e) { NOCAM = false; }
    try { return _cb.apply(this, arguments); } finally { NOCAM = false; }
  };
  // ================= 3) Keşif raporu (panelde, keşfedilmiş ülkelerde) + saldırı niyeti istihbaratı =================
  var SNAME = function () { return lang() === 'en' ? ['Population', 'Army', 'Economy', 'Technology', 'Diplomacy'] : ['Nüfus', 'Ordu', 'Ekonomi', 'Teknoloji', 'Diplomasi']; };
  function winP(a, d) {      // saldıran a, savunan d: 36 zar sonucu üzerinden zafer ihtimali
    try {
      var A = st(a), D = st(d), bA = !!(G.rv && G.rv[a + '>' + d]), bD = !!(G.rv && G.rv[d + '>' + a]), w = 0;
      for (var x = 1; x <= 6; x++) for (var y = 1; y <= 6; y++) if (battle(A, D, x, y, bA, bD).win) w++;
      return w / 36;
    } catch (e) { return .5; }
  }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function pactedWith(a, b) { try { return !!(G.pacts && G.pacts[a < b ? a + '|' + b : b + '|' + a] > turnNo()); } catch (e) { return false; } }
  // Keskin yüzde yok: dört kademeli, "kesin" demeyen değerlendirme
  function band(p) { return p >= .68 ? 3 : p >= .45 ? 2 : p >= .25 ? 1 : 0; }
  function meter(n, kind) { var h = ''; for (var i = 0; i < 4; i++) h += '<i class="' + (i <= n ? 'on ' + kind + n : '') + '"></i>'; return '<span class="m28">' + h + '</span>'; }
  function report() {
    try {
      if (!G || G.v5 !== 1 || !G.sel || G.over || BSH) return;
      var o = G.owner[G.sel], pl = G.pl; if (typeof o !== 'string' || o === pl) return;
      var kn = G.kn && G.kn[pl] && G.kn[pl][o]; if (!kn || !kn[0]) return;      // yalnızca keşfedilmişse
      var el = document.getElementById('panel'), box = el && el.querySelector('.v15p'); if (!box || box.querySelector('.scr28')) return;
      var me = st(pl), he = st(o), sn = SNAME(), IC5 = ['👥', '🎖', '💰', '🔬', '🕊'], mt = 0, ht = 0, i, rows = '';
      for (i = 0; i < 5; i++) { mt += +me[i] || 0; ht += +he[i] || 0; }
      var hi = 0, lo = 0; for (i = 1; i < 5; i++) { if (he[i] > he[hi]) hi = i; if (he[i] < he[lo]) lo = i; }
      for (i = 0; i < 5; i++) {
        var a = +me[i] || 0, d = +he[i] || 0, tot = a + d || 1, w = a > d + .05 ? 'a' : d > a + .05 ? 'd' : 'e';
        rows += '<div class="sc28r ' + w + '"><span class="l">' + IC5[i] + ' ' + sn[i] + '</span><b class="va">' + v1(a) + '</b>' +
          '<span class="bar"><i class="a" style="width:' + (a / tot * 100).toFixed(1) + '%"></i><i class="d" style="width:' + (d / tot * 100).toFixed(1) + '%"></i></span><b class="vd">' + v1(d) + '</b></div>';
      }
      var ba = band(winP(pl, o)), bd = band(winP(o, pl));
      var VA = lang() === 'en' ? ['Very risky', 'Risky', 'Balanced', 'Favourable'] : ['Çok riskli', 'Riskli', 'Dengeli', 'Avantajlı'];
      var VD = lang() === 'en' ? ['Negligible', 'Low', 'Notable', 'Serious'] : ['Önemsiz', 'Düşük', 'Belirgin', 'Ciddi'];
      var pact = pactedWith(pl, o);
      var h = '<div class="scr28"><div class="sc28t"><span>' + T('KEŞİF RAPORU', 'SCOUT REPORT') + '</span><span class="leg"><u class="a"></u>' + T('Sen', 'You') + '<u class="d"></u>' + T('Rakip', 'Rival') + '</span></div>' + rows +
        '<div class="sc28v"><div class="vc"><small>' + T('Saldırı değerlendirmesi', 'If you attack') + '</small>' + meter(ba, 'g') + '<b>' + VA[ba] + '</b></div>' +
        '<div class="vc"><small>' + T('Sana tehdidi', 'Threat to you') + '</small>' + meter(bd, 'r') + '<b>' + VD[bd] + '</b></div></div>' +
        '<div class="sc28f"><span class="ch">' + T('Güçlü yanı', 'Strength') + ' <b>' + sn[hi] + '</b></span><span class="ch">' + T('Zayıf yanı', 'Weakness') + ' <b>' + sn[lo] + '</b></span>' +
        '<span class="ch">' + T('Toprak', 'Lands') + ' <b>' + ownedN(o) + '</b></span>' + (pact ? '<span class="ch pk">' + T('Pakt aktif', 'Pact active') + '</span>' : '') + '</div></div>';
      var nt = G.n24 && G.n24[o];
      if (nt && (nt.i || nt.f)) h = h.replace(/<\/div>$/, '') + '<div class="sc28n" style="margin-top:8px;font-size:12.5px;line-height:1.45;color:var(--tx2)">' +
        (nt.i ? '<div style="margin-bottom:5px"><small style="display:block;font-weight:800;letter-spacing:.04em;opacity:.8">' + T('İSTİHBARAT — SALDIRI NİYETİ', 'INTEL — ATTACK INTENT') + '</small>' + nt.i + '</div>' : '') +
        (nt.f ? '<div><small style="display:block;font-weight:800;letter-spacing:.04em;opacity:.8">🕵 ' + T('CASUS RAPORU', 'SPY REPORT') + '</small>' + String(nt.f).replace(/</g, '&lt;') + '</div>' : '') + '</div></div>';
      var ac = box.querySelector('.v15a'); if (ac) ac.insertAdjacentHTML('beforebegin', h); else box.insertAdjacentHTML('beforeend', h);
    } catch (e) { }
  }
  window.v24Refresh = function () { try { var el = document.getElementById('panel'), q = el && el.querySelector('.scr28'); if (q) q.remove(); report(); } catch (x) { } };
  var _pn24 = panel;
  panel = function () { var r = _pn24.apply(this, arguments); report(); return r; };

  // Keşifte ≈4'te 1: ülkenin kime saldırmayı düşündüğü
  window.v24Intent = function (e) {
    try {
      if (!G || typeof e !== 'string') return;
      var tg = targets(e, G.owner), by = {}, maxV = 1, k;
      for (k in tg) { var de = G.owner[k]; if (typeof de !== 'string' || de === e || pactedWith(e, de)) continue; var b = (window.BASE && BASE[k]) || [0, 0, 0, 0, 0], v = (+b[0] || 0) + (+b[2] || 0); if (v > maxV) maxV = v; if (!by[de] || v > by[de].v) by[de] = { de: de, v: v }; }
      var best = null, bs = -1;
      Object.keys(by).forEach(function (de) { var c = by[de], wp = winP(e, de), sc = wp * (1 + c.v / maxV); c.wp = wp; if (wp >= .45 && sc > bs) { bs = sc; best = c; } });
      var txt;
      if (best) txt = T('<b>' + nmE(e) + '</b> bir sonraki hamlesinde <b>' + (best.de === G.pl ? 'SANA' : nmE(best.de)) + '</b> saldırmayı düşünüyor.', '<b>' + nmE(e) + '</b> is planning to attack <b>' + (best.de === G.pl ? 'YOU' : nmE(best.de)) + '</b> next.');
      else txt = T('<b>' + nmE(e) + '</b> şu an kimseye saldırmayı düşünmüyor.', '<b>' + nmE(e) + '</b> is not planning to attack anyone right now.');
      G.n24 = G.n24 || {}; (G.n24[e] = G.n24[e] || {}).i = txt;
      v24Refresh();
    } catch (x) { }
  };
})();
