/* V102 — Beş değerin oyun mantığındaki görevleri + TUR BAŞINA TEK SALDIRI
   👥 Nüfus     → SAVUNMA avantajı  : savunanın Nüfusu saldıranınkinden yüksekse savunanın tüm değerleri çarpılır (en çok +%8)
   🎖 Ordu      → SAVAŞ avantajı    : saldıranın Ordusu savunanınkinden yüksekse saldıranın tüm değerleri çarpılır (en çok +%8)
   💰 Ekonomi   → EKSTRA HAMLE veya KAYNAK : her tur Ekonomi/200 (en çok %40) olasılıkla +1 hamle; olmazsa Ekonomi'nin %0,5'i kadar gelir
   🔬 Teknoloji → ZAR avantajı      : Teknolojisi %20 üstün taraf zarına +1, %60 üstün taraf +2 (çarpan hesabında) kazanır
   🕊 Diplomasi → İTTİFAK avantajı  : liderin Diplomasisi arttıkça savaşa katılan müttefiklerin katkısı büyür (en çok +%20); dostluk teklifi kabulü kolaylaşır (v40.js)
   Hepsi battle() içinde SAF hesaptır (rastgelelik yok) → yapay zekâ kazanma olasılığı (winProb) ve oyuncu aynı kuralı görür. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'tr') ? tr : en; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function is5() { try { return !!G && G.v5 === 1; } catch (e) { return false; } }
  var K = .25, ARMY_CAP = 0, POP_CAP = 0, ALLY_DIP_MAX = 0, TECH1 = 999, TECH2 = 9999;   /* V222: 5 değerin yan etkileri kapatıldı (ordu/nüfus çarpanı, teknoloji zar avantajı, diplomasi müttefik katkısı). Eski: .10 .10 .20 1.3 2.0 */   /* V134: Ordu/Nüfus +%8 -> +%10; Teknoloji zar avantajı 1,2/1,6 -> 1,3/2,0 (tek özellik zarla +%30 vermesin) */
  function edge(hi, lo, cap) { return lo > 0 ? Math.min(cap, K * (hi / lo - 1)) : cap; }
  function dieEdge(hi, lo) { var r = lo > 0 ? hi / lo : 9; return r >= TECH2 ? 2 : r >= TECH1 ? 1 : 0; }
  function keep(src, dst) { for (var k in src) if (k.charAt(0) === '_') dst[k] = src[k]; return dst; }   // v23 isyancı bayrakları (_reb,_pl)
  function scale(a, f) { return keep(a, a.map(function (v) { return v * f; })); }

  var allyNote = null;
  var _b = battle;
  battle = function (A, D, ra, rd, bA, bD) {
    var adv = [], tA = 0, tD = 0;
    try {
      if (A && D && A.length >= 5 && D.length >= 5) {
        if (A[1] > D[1]) { var fa = 1 + edge(A[1], D[1], ARMY_CAP); if (fa > 1.0005) { A = scale(A, fa); adv.push('🎖 ' + X('Ordu üstünlüğü: saldıran ×', 'Army edge: attacker ×') + fa.toFixed(2)); } }
        if (D[0] > A[0]) { var fd = 1 + edge(D[0], A[0], POP_CAP); if (fd > 1.0005) { D = scale(D, fd); adv.push('👥 ' + X('Nüfus (savunma avantajı): savunan ×', 'Population (defence edge): defender ×') + fd.toFixed(2)); } }
        if (A[3] > D[3]) tA = dieEdge(A[3], D[3]); else if (D[3] > A[3]) tD = dieEdge(D[3], A[3]);
        if (tA) adv.push('🔬 ' + X('Teknoloji: saldıran zarına +' + tA, 'Technology: attacker die +' + tA));
        if (tD) adv.push('🔬 ' + X('Teknoloji: savunan zarına +' + tD, 'Technology: defender die +' + tD));
      }
    } catch (e) { adv = []; tA = tD = 0; }
    if (allyNote) { adv.unshift(allyNote); allyNote = null; }
    var r = _b.call(this, A, D, ra, rd, bA, bD);   // zar kuyruğu (DQ) önce ham zarla tüketilir: ekrandaki zar yüzleri bozulmaz
    if (tA || tD) {
      var r0 = r; r = _b.call(this, A, D, ra + tA, rd + tD, bA, bD);
      r.da = r0.da; r.dd = r0.dd;
    }
    r.adv = adv; r.techA = tA; r.techD = tD;
    return r;
  };

  // ---- Diplomasi: savaşa katılan müttefiklerin katkısı ----
  function installWar() {
    if (!window.WCD || typeof WCD.war !== 'function') return false; if (WCD.war.v102) return true;
    var _war = WCD.war;
    WCD.war = function (att, de) {
      var r = _war.apply(this, arguments);
      try {
        if (is5()) {
          var gA = ally(r.A, att, r.al), gD = ally(r.D, de, r.dl);
          if (gA || gD) { var g = gA || gD; allyNote = '🕊 ' + X('Diplomasi: müttefik katkısı +%', 'Diplomacy: ally contribution +%') + Math.round(g * 100); }
        }
      } catch (e) { }
      return r;
    };
    WCD.war.v102 = 1; return true;
  }
  function ally(arr, leader, joined) {
    if (!joined || !joined.length) return 0;
    var k = ALLY_DIP_MAX * clamp(((st(leader) || [])[4] || 0) / 100, 0, 1) * (window.WCAreaF ? WCAreaF(leader) : 1); if (k <= 0) return 0;   // V109: yüzey alanı çarpanı
    joined.forEach(function (a) { var x = st(a); for (var i = 0; i < 5; i++) arr[i] += x[i] * k; });
    return k;
  }
  if (!installWar()) { var n = 0, iv = setInterval(function () { if (installWar() || ++n > 40) clearInterval(iv); }, 250); }

  // ---- Ekonomi: tur başında ekstra hamle veya kaynak ----
  if (window.R5 && R5.startTurn) {
    var _s = R5.startTurn;
    R5.startTurn = function (T, roll) {
      var r = _s.apply(this, arguments);
      try {
        T.attacked = false; T.eco = null; T.ecoShown = 0; T.atkShown = 0;
        if (is5() && G.T === T && typeof G.pl === 'string' && roll > 1) {   // zar 1 = kriz turu: bonus yok
          var eco = (st(G.pl) || [])[2] || 0;
          if (Math.random() < Math.min(.3, eco / 250)   /* V134: ekstra hamle olasılığı en çok %40 -> %30 (zengin ülke tur başına hamle avantajıyla koşmasın) */) { T.moves += 1; T.eco = { m: 1 }; }
          else { var inc = Math.round(eco * .005 * 100) / 100; if (inc > 0) { addEco(G.pl, inc); T.eco = { inc: inc }; } }
        }
      } catch (e) { }
      return r;
    };
  }

  // ---- Tur başına tek saldırı: arayüz ----
  function lockAtk() {
    try {
      return;   // V104: tur başına tek saldırı kaldırıldı; kilit yok
      if (!is5() || !G.T || !G.T.attacked || G.ph !== 'act') return;
      [].forEach.call(document.querySelectorAll('button[onclick*="doAttack"],button[onclick*="v15Attack"]'), function (b) {
        if (b.getAttribute('data-v102')) return; b.setAttribute('data-v102', '1'); b.disabled = true; b.style.opacity = '.5';
        b.innerHTML = '⚔ ' + X('Bu tur saldırdın', 'Already attacked');
      });
    } catch (e) { }
  }
  function post() {
    try {
      if (!is5() || !G.T || G.ph !== 'act' || BSH) return;
      if (G.T.eco && !G.T.ecoShown) {
        G.T.ecoShown = 1;
        if (!(G.mp && G.mp.rank)) toast(G.T.eco.m ? '💰 ' + X('Ekonomi: +1 ekstra hamle', 'Economy: +1 bonus move') : '💰 ' + X('Ekonomi geliri: +', 'Economy income: +') + G.T.eco.inc);
      } else if (false) {
        G.T.atkShown = 1; toast('⚔ ' + X('Bu tur saldırı hakkın bitti; kalan hamlelerle keşif/diplomasi yapabilirsin', 'Attack used for this turn; spend remaining moves on scouting/diplomacy'));
      }
      lockAtk();
    } catch (e) { }
  }
  var _r = render; render = function () { var x = _r.apply(this, arguments); post(); return x; };
  if (typeof panel === 'function') { var _p = panel; panel = function () { var x = _p.apply(this, arguments); lockAtk(); return x; }; }
  var _ea = window.v5EndAsk;   // saldırı yapıldıysa "hâlâ hamlen var" uyarısı çıkmaz (tur başına zaten tek saldırı)
  window.v5EndAsk = function () {
        return _ea ? _ea.apply(this, arguments) : undefined;
  };
})();
