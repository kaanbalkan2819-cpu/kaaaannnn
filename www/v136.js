/* V136 — BEŞ ÖZELLİĞİN DENGESİ (TEST EDİLMEDİ)
   1) Başlangıç değerleri: veri tablosu olmayan 113 ülke hep aynı değerle (23/9/11/18/14) başlıyordu. Hepsine yaklaşık nüfus / GSYH / savunma
      harcaması verisi eklendi (DT2) ve genStats beş özelliği FARKLI sürücülerle hesaplayacak şekilde yeniden yazıldı:
        👥 Nüfus     = nüfus büyüklüğü (düşük gelirli ülkelerde hafif iskonto: üretken insan gücü)
        🎖 Ordu      = savunma harcaması (%62) + insan gücü (%28), nükleer caydırıcılık ×1,1
        💰 Ekonomi   = toplam GSYH (%70) + kişi başı gelir (%30)
        🔬 Teknoloji = inovasyon endeksi (%40) + kişi başı gelir (%30) + GSYH (%30)
        🕊 Diplomasi = taban + yumuşak güç + BM/NATO/AB/ASEAN bağları + arabuluculuk − dışlanmışlık (GSYH'ye bağımlılık düşürüldü)
   2) Savaşta özelliklerin rolü (battle zincirine eklenir; v102 kuralları aynen durur):
        💰 Ekonomi   → lojistik: zengin tarafın Ordu ve Teknoloji değeri en çok +%5
        🔬 Teknoloji → silah kalitesi: üstün tarafın Ordu değeri en çok +%6 (zar avantajı v102'de duruyor)
        🕊 Diplomasi → uluslararası destek: diplomasisi üstün savunan en çok +%5, üstün saldıran en çok +%3
        🎖 Ordu      → (v102) saldıran avantajı +%10; yeni: ordusu üstün savunan +%4
   3) Açıklama: savaş öncesi kazanma kartında ve savaş sonu "Ayrıntı"da "Özellikler savaşı nasıl etkiler?" bölümü.
   Ayar sabitleri aşağıda. Geri almak için index.html'den v136.js bağlantısını silin. */
(function () {
  'use strict';
  var ECO_CAP = .05, TECH_CAP = .06, DIP_DEF = .05, DIP_ATK = .03, ARMY_DEF = .04;
  function tr() { return !(typeof L !== 'undefined' && L === 'en'); }
  function X(a, b) { return tr() ? a : b; }

  /* ================= 1) BAŞLANGIÇ DEĞERLERİ ================= */
  // [nüfus (milyon), GSYH (milyar $), savunma harcaması (milyar $)] — yaklaşık 2023 değerleri; oyun dengesi için yuvarlanmıştır.
  var DT2 = {
    AFG: [41, 17, .6], AGO: [36, 85, 1.5], ALB: [2.8, 23, .25], ARM: [2.8, 24, 1.4], ATF: [.01, .1, 0], AZE: [10.3, 72, 3.2],
    BDI: [13, 3, .1], BEN: [13.7, 19, .3], BFA: [23, 20, .9], BGR: [6.5, 100, 1.8], BHS: [.4, 14, .05], BIH: [3.2, 27, .2],
    BLZ: [.4, 3, .03], BOL: [12.4, 46, .6], BRN: [.45, 15, .5], BTN: [.78, 3, .05], BWA: [2.6, 20, .6], CAF: [5.7, 2.5, .05],
    CIV: [28, 79, .5], CMR: [28, 45, .6], COD: [102, 66, .5], COG: [6.1, 15, .3], CRI: [5.2, 86, .05], CUB: [11, 100, .5],
    CYP: [1.3, 33, .5], DJI: [1.1, 3.5, .15], DOM: [11.3, 120, .6], ECU: [18, 119, 1.5], ERI: [3.7, 2.5, .3], EST: [1.4, 41, 1.4],
    FJI: [.93, 5.5, .06], FLK: [.004, .3, 0], GUF: [.3, 4.5, 0], GAB: [2.4, 20, .3], GEO: [3.7, 30, .4], GHA: [34, 76, .25],
    GIN: [14, 22, .3], GMB: [2.8, 2.3, .03], GNB: [2.1, 2, .03], GNQ: [1.7, 12, .1], GRL: [.057, 3.2, 0], GTM: [18, 104, .4],
    GUY: [.8, 16, .1], HND: [10.6, 34, .4], HRV: [3.9, 82, 1.2], HTI: [11.8, 20, .05], ISL: [.38, 31, .05], JAM: [2.8, 19, .15],
    JOR: [11.3, 51, 2], KGZ: [7, 14, .3], KHM: [17, 42, .8], LAO: [7.6, 15, .2], LBN: [5.5, 18, 1], LBR: [5.4, 4.5, .05],
    LBY: [6.9, 50, 2], LKA: [22, 84, 1.8], LSO: [2.3, 2.2, .06], LTU: [2.8, 79, 1.5], LUX: [.66, 86, .5], LVA: [1.9, 43, 1.1],
    MDA: [2.5, 15, .1], MDG: [30, 15, .1], MKD: [1.8, 14, .4], MLI: [23, 20, .6], MMR: [54, 65, 2.5], MNE: [.62, 7, .1],
    MNG: [3.4, 19, .15], MOZ: [33, 20, .3], MRT: [4.9, 11, .2], MWI: [20, 13, .05], NAM: [2.6, 12, .4], NCL: [.27, 10, 0],
    NER: [26, 17, .3], NIC: [7, 16, .1], NPL: [30, 40, .4], OMN: [4.6, 105, 6.5], PAN: [4.4, 83, .2], PNG: [10, 31, .1],
    PRI: [3.2, 120, 0], PRK: [26, 28, 4], PRY: [6.8, 42, .3], RWA: [13.6, 14, .2], ESH: [.6, 1, 0], SDN: [48, 35, 1],
    SSD: [11, 4, .4], SEN: [17.7, 31, .35], SLB: [.72, 1.6, 0], SLE: [8.6, 4, .05], SLV: [6.3, 34, .3], SOM: [18, 12, .1],
    SRB: [6.7, 75, 1.4], SUR: [.62, 3.5, .06], SVK: [5.4, 133, 1.8], SVN: [2.1, 68, .9], SWZ: [1.2, 4.7, .05], SYR: [23, 20, .5],
    TCD: [18, 12, .4], TGO: [9, 9, .1], TJK: [10, 12, .4], TKM: [6.5, 60, .5], TLS: [1.3, 2, .05], TTO: [1.5, 28, .5],
    TUN: [12, 47, 1.2], TZA: [67, 79, .7], UGA: [48, 49, .9], URY: [3.4, 77, .6], UZB: [36, 90, 1.1], VEN: [28, 100, 1],
    VUT: [.33, 1.1, 0], PSE: [5.4, 17, 0], YEM: [34, 21, 1.5], ZMB: [20.6, 28, .4], ZWE: [16.3, 35, .3]
  };
  // İnovasyon endeksi (0-100, yaklaşık). Listede olmayan ülke: kişi başı gelirden türetilir.
  var TI = {
    USA: 95, CHE: 95, SWE: 92, SGP: 92, ISR: 92, KOR: 90, NLD: 90, TWN: 90, JPN: 88, DEU: 88, GBR: 88, FIN: 88, DNK: 88, CHN: 85,
    FRA: 82, IRL: 82, CAN: 80, AUT: 80, AUS: 78, NOR: 78, EST: 78, BEL: 78, ARE: 72, LUX: 75, ISL: 75, NZL: 75, CZE: 68, ESP: 68,
    ITA: 68, IND: 62, RUS: 55, TUR: 55, MYS: 60, POL: 60, PRT: 64, HUN: 58, GRC: 58, SAU: 55, QAT: 55, BRA: 50, ZAF: 45, THA: 55, VNM: 55,
    UKR: 50, MEX: 45, CHL: 50, IDN: 45, KAZ: 45, EGY: 40, IRN: 45, PRK: 15
  };
  var NATO = 'USA,CAN,GBR,FRA,DEU,ITA,ESP,PRT,NLD,BEL,LUX,NOR,DNK,ISL,POL,CZE,SVK,HUN,ROU,BGR,EST,LVA,LTU,HRV,ALB,MNE,MKD,GRC,TUR,FIN,SWE'.split(',');
  var EU = 'AUT,BEL,BGR,HRV,CYP,CZE,DNK,EST,FIN,FRA,DEU,GRC,HUN,IRL,ITA,LVA,LTU,LUX,NLD,POL,PRT,ROU,SVK,SVN,ESP,SWE'.split(',');
  var ASEAN = 'IDN,MYS,PHL,SGP,THA,VNM,BRN,KHM,LAO,MMR'.split(',');
  var MED = { CHE: 10, NOR: 6, QAT: 6, ARE: 5, SGP: 6, OMN: 6, BRA: 4, ZAF: 4, IDN: 3, KEN: 3, GHA: 2, CRI: 4, NZL: 5, IRL: 3, AUT: 4, JPN: 3, KOR: 2, MAR: 2 };
  var PAR = { PRK: -10, RUS: -8, IRN: -10, SYR: -10, AFG: -8, MMR: -8, BLR: -8, VEN: -6, ERI: -6, CUB: -4, SDN: -5, NIC: -4, LBY: -3, YEM: -3, SSD: -3, SOM: -3 };

  function inList(a, id) { return a.indexOf(id) >= 0; }
  function sc(x, m, e) { return Math.min(100, 100 * Math.pow(Math.max(x, 0) / m, e)); }
  function genRaw(id) {
    var d = DT[id] || DT2[id] || [8, 30, .5], p = d[0], g = d[1], m = d[2];
    var pc = g / Math.max(p, .05);                                   // kişi başı gelir (bin $)
    var ge100 = sc(g, 27360, .4), pp100 = sc(p, 1425, .35), pcs = Math.min(100, 100 * Math.pow(Math.min(pc, 80) / 80, .5));
    var pop = pp100 * (.8 + .2 * Math.min(1, pc / 30));
    var army = .62 * sc(m, 916, .40) + .28 * sc(p, 1425, .30);
    if (NUKE24 && NUKE24[id]) army *= 1.1;
    var eco = .7 * ge100 + .3 * pcs;
    var ti = TI[id] != null ? TI[id] : pcs * .6;
    var tech = .4 * ti + .3 * pcs + .3 * ge100;
    var dip = 10 + .2 * ge100 + .1 * pp100 + (inList(NATO, id) ? 7 : 0) + (inList(EU, id) ? 5 : 0) + (inList(ASEAN, id) ? 3 : 0) +
      ((SOFT24 && SOFT24[id]) || 0) + (MED[id] || 0) + (PAR[id] || 0) + ((P5 && P5[id]) ? 18 : 0);
    dip = Math.max(5, Math.min(100, dip));
    var v = [pop, army, eco, tech, dip];
    if (id === 'TUR') v = [pop * 1.1, army * 1.15, eco * 1.12, tech * 1.15, dip * 1.15];   // önceki sürümlerle uyum
    if (id === 'ISR') v = v.map(function (x) { return x * .85; });
    return v;
  }
  function squash(arr) {
    return arr.map(function (x) {
      x = Math.min(100, x);
      if (x > SQ_KNEE) x = SQ_KNEE + (x - SQ_KNEE) * SQ_TOP;
      return Math.round(100 * Math.pow(x / 100, SQ_POW) * 10) / 10;
    });
  }
  if (typeof genStats === 'function') {
    var _gs = genStats;
    genStats = function (id) {
      try {
        var v = squash(genRaw(id));
        for (var i = 0; i < 5; i++) if (!isFinite(v[i])) return _gs(id);
        return v;
      } catch (e) { return _gs(id); }
    };
    try { if (window.WC) WC.genStats = genStats; } catch (e) { }
    try {   // BASE zaten üretildiyse yeniden üret (yüklenme sırası ne olursa olsun)
      if (typeof BASE !== 'undefined' && typeof R !== 'undefined' && R.length && Object.keys(BASE).length) R.forEach(function (r) { BASE[r.id] = genStats(r.id); });
    } catch (e) { }
  }

  /* ================= 2) SAVAŞTA ÖZELLİKLERİN ROLÜ ================= */
  var idCache = {};
  function sameArr(a, b) { if (!a || !b || a.length < 5 || b.length < 5) return false; for (var i = 0; i < 5; i++) if (Math.abs((+a[i] || 0) - (+b[i] || 0)) > 1e-9) return false; return true; }
  function ownerOf(arr) {
    var key = arr.join(','); if (idCache[key] !== undefined) return idCache[key];
    var seen = {}, k, e, res = null;
    for (k in G.owner) { e = G.owner[k]; if (seen[e]) continue; seen[e] = 1; try { if (sameArr(st(e), arr)) { res = e; break; } } catch (x) { } }
    if (Object.keys(idCache).length > 400) idCache = {};
    return (idCache[key] = res);
  }
  function edge(hi, lo, k, cap) { return lo > 0 ? Math.min(cap, k * (hi / lo - 1)) : cap; }
  function build(arr, f, owner) {
    var o = arr.map(function (v, i) { return v * f[i]; });
    for (var k in arr) if (k.charAt(0) === '_') o[k] = arr[k];
    if (owner !== null && owner !== undefined) o._e = owner;   // v134/v135 sahip tanıması için
    return o;
  }
  if (typeof battle === 'function') {
    var _b = battle;
    battle = function (A, D) {
      var rest = Array.prototype.slice.call(arguments, 2), note = [];
      try {
        if (G && G.owner && A && D && A.length >= 5 && D.length >= 5) {
          var ea = ownerOf(A), ed = ownerOf(D), fa = [1, 1, 1, 1, 1], fd = [1, 1, 1, 1, 1], x;
          function up(f, idx, v) { for (var i = 0; i < idx.length; i++) f[idx[i]] *= v; }
          A = build(A, fa, ea); D = build(D, fd, ed);
        }
      } catch (e) { note = []; }
      var r = _b.apply(this, [A, D].concat(rest));
      try { if (note.length && r) r.adv = note.concat(r.adv || []); } catch (e) { }
      return r;
    };
  }

  /* ================= 3) AÇIKLAMA ================= */
  function guideHtml() {
    return '<details class="g136"><summary>📖 ' + X('Özellikler savaşı nasıl etkiler?', 'How do stats affect battle?') + '</summary>' +
      '<div>👥 <b>' + X('Nüfus', 'Population') + '</b>: ' + X('savunma avantajı — savunanın Nüfusu üstünse tüm değerleri en çok +%10.', 'defence edge — if the defender leads in Population, all its stats up to +10%.') + '</div>' +
      '<div>🎖 <b>' + X('Ordu', 'Army') + '</b>: ' + X('saldırı avantajı — saldıranın Ordusu üstünse tüm değerleri en çok +%10.', 'attack edge — if the attacker leads in Army, all its stats up to +10%.') + '</div>' +
      '<div>💰 <b>' + X('Ekonomi', 'Economy') + '</b>: ' + X('tur başı gelir / ekstra hamle.', 'turn income / extra moves.') + '</div>' +
      '<div>🔬 <b>' + X('Teknoloji', 'Technology') + '</b>: ' + X('zarına +1/+2.', 'die +1/+2.') + '</div>' +
      '<div>🕊 <b>' + X('Diplomasi', 'Diplomacy') + '</b>: ' + X('müttefik katkısı (en çok +%20).', 'ally contribution (up to +20%).') + '</div>' +
      '<div>⚔ ' + X('Kazanmak için 5 değerin en az 3\'ünde üstün olmalısın.', 'You must lead in at least 3 of 5 stats to win.') + '</div></details>';
  }
  function addGuide() {
    try {
      var box = document.querySelector('#panel .c134'); if (!box || box.querySelector('.g136')) return;
      box.insertAdjacentHTML('beforeend', guideHtml());
    } catch (e) { }
  }
  if (typeof panel === 'function') { var _pn = panel; panel = function () { var r = _pn.apply(this, arguments); addGuide(); return r; }; }
  var _rf = window.v24Refresh;
  if (_rf) window.v24Refresh = function () { var r = _rf.apply(this, arguments); addGuide(); return r; };

  var pend = 0;
  function afterBattle() {
    try {
      var fn = document.getElementById('fn'); if (!fn || !fn.querySelector('.fh') || fn.querySelector('.g136')) return;
      var w = fn.querySelector('.w134'), fh = fn.querySelector('.fh');
      (w || fh).insertAdjacentHTML('afterend', guideHtml());
    } catch (e) { }
  }
  function watch() {
    var bs = document.getElementById('bs'); if (!bs) return setTimeout(watch, 500);
    new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; afterBattle(); }, 120); }).observe(bs, { childList: true, subtree: true });
  }
  watch();
  var css = document.createElement('style');
  css.textContent = '.g136{margin:6px 0;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.06);font-size:12.5px;line-height:1.5}' +
    '.g136 summary{cursor:pointer;font-weight:700}.g136 div{margin-top:4px}';
  document.head.appendChild(css);
})();
