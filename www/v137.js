/* V137 — EKONOMİ DENGESİ + KALKINMA (TEST EDİLMEDİ)
   1) Ekstra hamle: eskiden Ekonomi/250 (en çok %30) ile BEDAVA geliyordu. Şimdi olasılık azalan getirili (%6 … %30), üst üste gelirse yarıya düşer,
      uzun süre gelmezse küçük bir "şanssızlık koruması" eklenir ve kazanılınca hazinenin %3'ü (en az 0,5) "seferberlik gideri" olarak ödenir.
      Hazine bu gideri karşılayamıyorsa (kalan < 4) ekstra hamle gelmez.
   2) Zengin / zayıf ülke dengesi: TÜM ülkeler (YZ dahil) her tur aynı ekonomi adımından geçer:
        gelir = 0,30 + hazine×%0,4 (+ Ticaret Koridoru) ; zayıf destek = (30 − hazine)×%2 ; bakım = (toprak − 4)×0,08 (en çok 2,5) ; enflasyon = (hazine − 80)×%12
      Yani yoksul ülke görece hızlı büyür, zengin ve geniş imparatorluk yavaşlar.
   3) Fetih kaynak aktarımı (savaş tazminatına EK, onu değiştirmez): fethedilen toprak, kaybedenin hazinesinden "toprak payı" kadar taşır.
        aktarılan = kalan hazine × (1/toprak sayısı) × %35 ; kazanan bunun %70'ini alır (%30 savaş yıkımı) ; ülke tamamen yok olursa kalan hazinenin %60'ı el değiştirir.
      Kazanan tek seferde kendi hazinesinin %15'inden (en az 2) fazlasını alamaz. Savaş sonu ekranında "Kaynak aktarımı" kartı görünür.
   4) Birikmeyi önleme: bakım gideri + enflasyon (hazine 80 üstü) + üst sınır 130 + Kalkınma menüsü (harcama yolu). YZ de hazinesi 55'i aşınca zayıf değerine yatırım yapar.
   5) Kalkınma (🏗): oyuncu hazinesini kalıcı gelişime çevirir. Her seçeneğin yan etkisi var; kazanç, değer yükseldikçe azalır (zayıf alanı güçlendirmek daha verimli);
      seviye arttıkça maliyet yükselir; tur başına tek yatırım; hamle harcamaz. Menü: Politikalar ekranı + "Ülkem" kartı.
   Ayar sabitleri aşağıda. Geri almak için index.html'den v137.js bağlantısını silin. Online (G.mp) oyunlarda DEVRE DIŞI (v102 eski kuralı aynen çalışır). */
(function () {
  'use strict';
  /* ================= AYARLAR ================= */
  var EX_BASE = 0, EX_MAX = 0, EX_K = 70, EX_COST = .03, EX_COST_MIN = .5, EX_MIN_ECO = 4, EX_REPEAT = .5, EX_PITY = 0, EX_PITY_MAX = 0;   /* V222: ekonomiden ekstra hamle kapatıldı */
  var INC_BASE = .30, INC_RATE = .004, CATCH_BELOW = 30, CATCH_RATE = .02, UPK_FREE = 4, UPK_PER = .08, UPK_MAX = 2.5, SOFT = 80, DECAY = .12, ECO_HARD = 130, ECO_FLOOR = 1;
  var TR_FRAC = .35, TR_LAST = .60, WAR_LOSS = .30, GAIN_CAP = .15, GAIN_CAP_MIN = 2;
  var DEV_MIN_ECO = 3, DEV_GAIN0 = 7, DEV_REF = 110, DEV_MAXLV = 6, DEV_ESC = .25, STAT_MAX = 100;
  var TRADE_MAXLV = 4, TRADE_COST = 10, TRADE_ESC = .5, TRADE_INC = .15;
  var AI_INV_FROM = 55, AI_INV_P = .4, AI_INV_COST = 8;

  var ICON = ['👥', '🎖', '💰', '🔬', '🕊'], PCL = ['#4aa3ff', '#ff6b5a', '#ffd24a', '#8a7bff', '#4fe0a0'];
  var DEV = [
    { k: 'pop', i: 0, cost: 8, side: {}, tr: 'Halk Kalkınması', en: 'Public Development',
      dtr: 'Konut, sağlık ve eğitim yatırımıyla Nüfus kalıcı olarak büyür.', den: 'Housing, health and schooling permanently grow Population.' },
    { k: 'army', i: 1, cost: 10, side: {}, tr: 'Silahlanma Programı', en: 'Armament Programme',
      dtr: 'Silah ve kışla yatırımıyla Ordu kalıcı olarak güçlenir.', den: 'Arms and barracks permanently strengthen the Army.' },
    { k: 'tech', i: 3, cost: 12, side: {}, tr: 'Ar-Ge Yatırımı', en: 'R&D Investment',
      dtr: 'Laboratuvar ve akademi yatırımıyla Teknoloji kalıcı olarak sıçrar.', den: 'Labs and academies permanently boost Technology.' },
    { k: 'dip', i: 4, cost: 8, side: {}, tr: 'Diplomatik Atılım', en: 'Diplomatic Push',
      dtr: 'Elçilik ve yardım yatırımıyla Diplomasi kalıcı olarak artar.', den: 'Embassies and aid permanently raise Diplomacy.' }
  ];

  /* ================= YARDIMCILAR ================= */
  function tr() { return !(typeof L !== 'undefined' && L === 'en'); }
  function X(a, b) { return tr() ? a : b; }
  function is5() { try { return !!G && G.v5 === 1 && typeof G.pl === 'string' && !G.mp; } catch (e) { return false; } }
  function busy() { try { return typeof BSH !== 'undefined' && !!BSH; } catch (e) { return false; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function nm(id) { try { return M[id].name; } catch (e) { return String(id); } }
  function sname() { return X(['Nüfus', 'Ordu', 'Ekonomi', 'Teknoloji', 'Diplomasi'], ['Population', 'Army', 'Economy', 'Technology', 'Diplomacy']); }
  function say(m, d) { try { setTimeout(function () { try { toast(m); } catch (e) { } }, d || 200); } catch (e) { } }
  function counts() { var c = {}, k; for (k in G.owner) c[G.owner[k]] = (c[G.owner[k]] || 0) + 1; return c; }
  function baseArr(e) { return (G.es && G.es[e]) || BASE[e]; }
  function rawEco(e) { var b = baseArr(e); return (+b[2] || 0) + ((G.ed && G.ed[e]) || 0); }   // geçici politika bonusu OLMADAN (st() sarmalayıcısından bağımsız)
  // Hazine değişimi: [ECO_FLOOR, ECO_HARD] içinde kalır; gerçekten uygulanan farkı döndürür.
  function ecoAdd(e, d) {
    var cur = rawEco(e), nx = clamp(cur + d, ECO_FLOOR, Math.max(ECO_HARD, cur)), real = nx - cur;
    if (Math.abs(real) > 1e-9) addEco(e, real);
    return real;
  }
  function devGain(cur) { return r1(Math.max(1, DEV_GAIN0 * (1 - cur / DEV_REF))); }
  function applyDev(e, i, cost, gain, side) {   // kalıcı değişim: temel diziye yazılır, G.ed sıfırlanır
    var b = baseArr(e).slice(), j;
    b[2] = (+b[2] || 0) + ((G.ed && G.ed[e]) || 0) - cost;
    b[i] = Math.min(STAT_MAX, (+b[i] || 0) + gain);
    if (side) for (j in side) b[j] = Math.max(1, (+b[j] || 0) + side[j]);
    G.es = G.es || {}; G.ed = G.ed || {}; G.es[e] = b; G.ed[e] = 0;
  }

  /* ================= 2 + 4) TUR BAŞI EKONOMİ ADIMI ================= */
  function ecoStep(e, n, lvl) {
    var eco = rawEco(e);
    var inc = INC_BASE + INC_RATE * eco + (lvl || 0) * TRADE_INC;
    var catchUp = eco < CATCH_BELOW ? (CATCH_BELOW - eco) * CATCH_RATE : 0;
    var upk = Math.min(UPK_MAX, Math.max(0, n - UPK_FREE) * UPK_PER);
    var decay = eco > SOFT ? (eco - SOFT) * DECAY : 0;
    return { inc: inc, catchUp: catchUp, upk: upk, decay: decay, net: inc + catchUp - upk - decay };
  }
  function aiInvest(e) {
    try {
      if (rawEco(e) < AI_INV_FROM || Math.random() > AI_INV_P) return;
      var b = baseArr(e), idx = [0, 1, 3, 4], best = idx[0], i;
      for (i = 1; i < idx.length; i++) if ((+b[idx[i]] || 0) < (+b[best] || 0)) best = idx[i];
      applyDev(e, best, AI_INV_COST, devGain(+b[best] || 0), null);
    } catch (x) { }
  }
  function worldStep() {   // tüm yaşayan ülkeler; oyuncunun adımını döndürür
    var c = counts(), pl = G.pl, me = null, e, s, real;
    for (e in c) {
      if (!M[e] || !BASE[e]) continue;
      try {
        s = ecoStep(e, c[e], e === pl ? (G.trade137 || 0) : 0);
        real = ecoAdd(e, s.net);
        if (e === pl) { s.real = real; me = s; } else aiInvest(e);
      } catch (x) { }
    }
    return me;
  }

  /* ================= 1) EKSTRA HAMLE ================= */
  function extraP(eco, no) {
    var p = EX_BASE + (EX_MAX - EX_BASE) * (1 - Math.exp(-eco / EX_K));
    p += Math.min(EX_PITY_MAX, (G.miss137 || 0) * EX_PITY);
    if (G.lastX137 === no - 1) p *= EX_REPEAT;
    return clamp(p, 0, EX_MAX);
  }
  function turnStart(T, roll) {
    var pl = G.pl, no = T.turn, info = { turn: no, shown: 0 };
    // v102'nin eski ekonomi kararını (bedava ekstra hamle / %0,5 gelir) geri al; yerine bu dosyanınki gelir
    if (T.eco) { if (T.eco.m) T.moves = Math.max(0, (T.moves | 0) - 1); if (T.eco.inc) addEco(pl, -T.eco.inc); }
    T.eco = null; T.ecoShown = 1;
    if (G.e137 === no) { T.e137 = G.t137turn || info; return; }   // aynı tur için ikinci çağrı: tekrar işlem yok
    G.e137 = no;
    var eco = rawEco(pl), p = extraP(eco, no), cost = Math.max(EX_COST_MIN, eco * EX_COST);
    info.p = Math.round(p * 100);
    if (roll > 1) {   // zar 1 = kriz turu: ekstra hamle yok
      if (eco - cost >= EX_MIN_ECO && Math.random() < p) {
        T.moves += 1; ecoAdd(pl, -cost); G.lastX137 = no; G.miss137 = 0; info.extra = { cost: r2(cost) };
      } else G.miss137 = (G.miss137 || 0) + 1;
    }
    var s = worldStep();
    if (s) { info.net = s.real; info.inc = s.inc + s.catchUp; info.upk = s.upk; info.decay = s.decay; }
    T.e137 = info; G.t137turn = info;
  }
  function turnMsg(i) {
    var a = [];
    if (i.extra) a.push('⚡ ' + X('Seferberlik: +1 hamle (−' + r1(i.extra.cost) + ' 💰)', 'Mobilization: +1 move (−' + r1(i.extra.cost) + ' 💰)'));
    if (typeof i.net === 'number' && Math.abs(i.net) >= .05) {
      a.push('💰 ' + (i.net >= 0 ? '+' : '') + r1(i.net) + (i.upk > .05 ? ' · ' + X('bakım −', 'upkeep −') + r1(i.upk) : '') + (i.decay > .05 ? ' · ' + X('enflasyon −', 'inflation −') + r1(i.decay) : ''));
    }
    return a.join('  •  ');
  }
  function post() {
    try {
      if (!is5() || !G.T || G.ph !== 'act' || busy() || G.busy) return;
      var i = G.T.e137; if (!i || i.shown) return;
      i.shown = 1; var m = turnMsg(i); if (m) toast(m);
    } catch (e) { }
  }
  function installTurn() {
    if (!window.R5 || typeof R5.startTurn !== 'function') return false;
    if (R5.startTurn.v137) return true;
    var _s = R5.startTurn;
    R5.startTurn = function (T, roll) {
      var r = _s.apply(this, arguments);
      try { if (is5() && G.T === T) turnStart(T, roll); } catch (e) { }
      return r;
    };
    R5.startTurn.v137 = 1; return true;
  }
  if (!installTurn()) { var n0 = 0, iv0 = setInterval(function () { if (installTurn() || ++n0 > 40) clearInterval(iv0); }, 250); }
  if (typeof render === 'function') { var _rd = render; render = function () { var x = _rd.apply(this, arguments); post(); return x; }; }

  /* ================= 3) FETİH KAYNAK AKTARIMI ================= */
  function snap(att, tg) {
    try {
      if (!is5() || !G.owner || !M[tg]) return null;
      var e = G.owner[tg]; if (typeof e !== 'string' || e === att) return null;
      var c = counts();
      return { att: att, e: e, tg: tg, nA: c[att] || 0, nE: c[e] || 0, ecoA: rawEco(att), ecoE: rawEco(e), last: G.last };
    } catch (x) { return null; }
  }
  function settle(s) {
    try {
      if (!s || !G.last || G.last === s.last || G.last.att !== s.att || G.last.tg !== s.tg) return;   // saldırı gerçekleşmediyse işlem yok
      var win = !!G.last.win, from = win ? s.e : s.att, to = win ? s.att : s.e;
      var nFrom = win ? s.nE : s.nA, eco0 = win ? s.ecoE : s.ecoA;
      var c = counts(), alive = (c[from] || 0) > 0, rep = 0;
      try { var lr = G.lastRep; if (lr && lr.l === from && lr.w === to) rep = +lr.amt || 0; } catch (x) { }
      var ecoNow = alive ? rawEco(from) : Math.max(0, eco0 - rep);
      var share = alive ? 1 / Math.max(1, nFrom) : 1, frac = alive ? TR_FRAC : TR_LAST;
      var moved = ecoNow * share * frac;
      if (alive) moved = Math.min(moved, Math.max(0, ecoNow - ECO_FLOOR));
      if (!(moved > .01)) return;
      var gain = moved * (1 - WAR_LOSS), cap = Math.max(GAIN_CAP_MIN, rawEco(to) * GAIN_CAP);
      if (gain > cap) gain = cap;
      if (alive) ecoAdd(from, -moved);
      var real = ecoAdd(to, gain);
      G.t137 = { ref: G.last, from: from, to: to, moved: r2(moved), gain: r2(real), destroyed: !alive, share: r2(share), frac: frac };
      if (false && to === G.pl) say('📦 ' + X('Kaynak aktarımı: +', 'Resource transfer: +') + r1(real) + ' 💰 (' + nm(from) + ')', 2400);
      else if (from === G.pl) say('📦 ' + X('Kaynak kaybı: −', 'Resource loss: −') + r1(alive ? moved : 0) + ' 💰 (' + nm(to) + ')', 2400);
    } catch (x) { }
  }
  function hookAttack() {
    if (!window.V5 || typeof V5.attack !== 'function') return false;
    if (V5.attack.v137) return true;
    var _va = V5.attack;
    V5.attack = function (att, tg) { var s = snap(att, tg), r = _va.apply(this, arguments); settle(s); return r; };
    try { Object.keys(_va).forEach(function (k) { V5.attack[k] = _va[k]; }); } catch (e) { }
    V5.attack.v137 = 1; return true;
  }
  if (!hookAttack()) { var n1 = 0, iv1 = setInterval(function () { if (hookAttack() || ++n1 > 40) clearInterval(iv1); }, 250); }
  if (typeof doAttack === 'function') {
    var _da = doAttack;
    doAttack = function () {
      var s = null;
      try { if (G && G.sel && is5()) s = snap(G.pl, G.sel); } catch (x) { }
      var r = _da.apply(this, arguments); settle(s); return r;
    };
  }
  function tcard() {
    var t = G && G.t137; if (!t || t.ref !== G.last) return '';
    var pc = Math.round(t.share * 100), fc = Math.round(t.frac * 100), lc = Math.round(WAR_LOSS * 100);
    var how = t.destroyed
      ? X('Ülke tamamen yok edildi: kalan hazinenin %' + fc + '\'ı el değiştirir.', 'The nation was destroyed: ' + fc + '% of its remaining treasury changes hands.')
      : X('Toprak payı %' + pc + ' × %' + fc + ' aktarım.', 'Territory share ' + pc + '% × ' + fc + '% transfer.');
    return '<div class="t137"><b>📦 ' + X('Kaynak aktarımı', 'Resource transfer') + '</b><div>' + nm(t.from) + ' <b class="l">−' + r1(t.moved) + '</b> → ' + nm(t.to) + ' <b class="w">+' + r1(t.gain) + '</b> 💰</div>' +
      '<small>' + how + ' ' + X('Savaş yıkımı: %' + lc + ' yok olur. (Savaş tazminatına ek.)', 'War damage: ' + lc + '% is lost. (On top of the war reparation.)') + '</small></div>';
  }
  var pend = 0;
  function afterBattle() {
    try {
      var fn = document.getElementById('fn'); if (!fn || !fn.querySelector('.fh') || fn.querySelector('.t137')) return;
      var h = tcard(); if (!h) return;
      (fn.querySelector('.w134') || fn.querySelector('.fh')).insertAdjacentHTML('afterend', h);
    } catch (e) { }
  }
  function watch() {
    var bs = document.getElementById('bs'); if (!bs) return setTimeout(watch, 500);
    new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; afterBattle(); }, 140); }).observe(bs, { childList: true, subtree: true });
  }
  watch();

  /* ================= 5) KALKINMA MENÜSÜ ================= */
  function devLv(k) { return (G.dev137 && G.dev137[k]) || 0; }
  function devCost(d) { return Math.round(d.cost * (1 + DEV_ESC * devLv(d.k))); }
  function tradeCost() { return Math.round(TRADE_COST * (1 + TRADE_ESC * (G.trade137 || 0))); }
  function devOf(k) { for (var i = 0; i < DEV.length; i++) if (DEV[i].k === k) return DEV[i]; return null; }
  function usedNow() { return !!(G.T && G.dev137t === G.T.turn); }
  function canNow() { return is5() && G.ph === 'act' && !G.busy && !busy() && !G.endLock; }
  function sideTxt(side) {
    var sn = sname(), a = [], j;
    if (side) for (j in side) a.push(ICON[j] + ' ' + sn[j] + ' ' + side[j]);
    return a.join(', ');
  }
  function rulesHtml() {
    return '<details class="r137"><summary>📘 ' + X('Ekonomi ve kaynak kuralları', 'Economy and resource rules') + '</summary>' +
      '<div>💰 <b>' + X('Tur geliri (herkes için aynı)', 'Turn income (same for all)') + '</b>: ' + X('0,3 + hazine×%0,4; hazine 30\'un altındaysa destek; 4\'ten fazla toprak için bakım (toprak başı −0,08, en çok −2,5); hazine 80\'i aşarsa fazlası her tur %12 erir; üst sınır 130.', '0.3 + treasury×0.4%; support below 30; upkeep beyond 4 territories (−0.08 each, max −2.5); anything above 80 erodes 12% per turn; hard cap 130.') + '</div>' +
      '<div>📦 <b>' + X('Fetih aktarımı', 'Conquest transfer') + '</b>: ' + X('Savaş tazminatına ek olarak, ele geçirilen toprak kaybedenin hazinesinden toprak payı × %35 taşır; kazanan bunun %70\'ini alır (%30 savaş yıkımı). Ülke tamamen yok olursa kalan hazinenin %60\'ı el değiştirir. Kazanan tek seferde kendi hazinesinin %15\'inden fazlasını alamaz.', 'On top of the war reparation, a captured territory carries its share of the loser\'s treasury × 35%; the winner keeps 70% (30% war damage). If a nation is destroyed, 60% of what is left changes hands. A winner cannot take more than 15% of its own treasury at once.') + '</div>' +
      '<div>🏗 <b>' + X('Kalkınma', 'Development') + '</b>: ' + X('Hazine harcanarak kalıcı gelişim alınır. Değer yükseldikçe kazanç düşer; yan etkisi yoktur; seviye arttıkça maliyet yükselir; tur başına tek yatırım, hamle harcamaz. Ekonomi 5 değerden biri olduğu için harcamak savaş gücünü de etkiler.', 'Spend treasury for permanent growth. Gains shrink as the stat rises; no side effects; cost rises with level; one investment per turn, no moves spent. Economy is one of the 5 stats, so spending also affects war strength.') + '</div></details>';
  }
  window.dev137Menu = function () {
    try {
      if (!is5()) return;
      var pl = G.pl, eco = rawEco(pl), raw = baseArr(pl), sn = sname(), can = canNow(), used = usedNow(), c = counts();
      var st0 = ecoStep(pl, c[pl] || 0, G.trade137 || 0), net = st0.net;
      var h = '<div class="polx"><div class="polhd"><b>🏗 ' + X('Kalkınma', 'Development') + '</b><span class="polsub">' + nm(pl) + '</span>' +
        '<button class="polcl" onclick="closeMod()" aria-label="close">✕</button></div>' +
        '<div class="polbar"><span>💰 ' + X('Hazine', 'Treasury') + ': <b>' + r1(eco) + '</b></span></div>' +   /* V222: tur başı gelir gösterilmez */
        '<div class="polinfo">' + X('Hazineni kalıcı gelişime çevir. Tur başına <b>1</b> yatırım; hamle harcamaz. Ekonomi savaşta da sayıldığı için harcamak gücünü düşürür — zayıf alanını güçlendirmek daha verimlidir.', 'Turn your treasury into permanent growth. <b>1</b> investment per turn; no moves spent. Economy also counts in battle, so spending lowers it — strengthening a weak stat is more efficient.') + '</div>' +
        '<div class="polscroll">';
      DEV.forEach(function (d, ix) {
        var cur = +raw[d.i] || 0, gain = devGain(cur), cost = devCost(d), lv = devLv(d.k), btn;
        if (!can) btn = '<button class="polgo" disabled>' + X('Kendi turunda', 'On your turn') + '</button>';
        else if (used) btn = '<button class="polgo" disabled>⛔ ' + X('Bu tur kullanıldı', 'Used this turn') + '</button>';
        else if (lv >= DEV_MAXLV) btn = '<button class="polgo on" disabled>' + X('Azami seviye', 'Max level') + '</button>';
        else if (eco - cost < DEV_MIN_ECO) btn = '<button class="polgo" disabled>💰 ' + X('Hazine yetersiz', 'Not enough treasury') + ' · ' + cost + '</button>';
        else btn = '<button class="polgo gold" onclick="dev137Ask(\'' + d.k + '\')">' + X('Geliştir', 'Upgrade') + ' · ' + cost + ' 💰</button>';
        h += '<div class="pcard" style="--pc:' + PCL[d.i] + ';animation-delay:' + (ix * .05) + 's"><div class="pic">' + ICON[d.i] + '</div><div class="pbd"><div class="ptt"><b>' + X(d.tr, d.en) + '</b> <small>' + X('Sv.', 'Lv.') + ' ' + lv + '/' + DEV_MAXLV + '</small></div>' +
          '<div class="pds">' + X(d.dtr, d.den) + '</div><div class="pst"><span class="pchip">' + sn[d.i] + ' ' + r1(cur) + ' → <b>' + r1(Math.min(STAT_MAX, cur + gain)) + '</b></span></div>' + btn + '</div></div>';   /* V222: yan etki etiketi kaldırıldı */
      });
      var tl = G.trade137 || 0, tc = tradeCost(), tb;
      if (!can) tb = '<button class="polgo" disabled>' + X('Kendi turunda', 'On your turn') + '</button>';
      else if (used) tb = '<button class="polgo" disabled>⛔ ' + X('Bu tur kullanıldı', 'Used this turn') + '</button>';
      else if (tl >= TRADE_MAXLV) tb = '<button class="polgo on" disabled>' + X('Azami seviye', 'Max level') + '</button>';
      else if (eco - tc < DEV_MIN_ECO) tb = '<button class="polgo" disabled>💰 ' + X('Hazine yetersiz', 'Not enough treasury') + ' · ' + tc + '</button>';
      else tb = '<button class="polgo gold" onclick="dev137Ask(\'trade\')">' + X('Geliştir', 'Upgrade') + ' · ' + tc + ' 💰</button>';
      h += '<div class="pcard" style="--pc:' + PCL[2] + '"><div class="pic">💼</div><div class="pbd"><div class="ptt"><b>' + X('Ticaret Koridoru', 'Trade Corridor') + '</b> <small>' + X('Sv.', 'Lv.') + ' ' + tl + '/' + TRADE_MAXLV + '</small></div>' +
        '<div class="pds">' + X('Uzun vadeli yatırım: her seviye tur gelirine kalıcı +' + TRADE_INC + ' ekler. Şimdi güç yerine ileride kaynak.', 'Long-term bet: each level adds +' + TRADE_INC + ' to turn income permanently. Resources later instead of power now.') + '</div>' +
        '<div class="pst"><span class="pchip">' + X('Tur geliri', 'Turn income') + ' +' + r2(tl * TRADE_INC) + ' → <b>+' + r2((tl + 1) * TRADE_INC) + '</b></span></div>' + tb + '</div></div>';
      h += rulesHtml();
      modal(h + '</div><button class="big polfoot" onclick="closeMod()">' + X('Kapat', 'Close') + '</button></div>');
    } catch (e) { }
  };
  window.dev137Ask = function (k) {
    try {
      if (!canNow() || usedNow()) return;
      var sn = sname(), pl = G.pl, raw = baseArr(pl), eco = rawEco(pl), title, body;
      if (k === 'trade') {
        var tc = tradeCost(), tl = G.trade137 || 0;
        title = '💼 ' + X('Ticaret Koridoru', 'Trade Corridor');
        body = X('Maliyet: <b>' + tc + ' 💰</b> (hazine ' + r1(eco) + ' → ' + r1(eco - tc) + '). Tur gelirin kalıcı olarak <b>+' + TRADE_INC + '</b> artar (şu an +' + r2(tl * TRADE_INC) + ').', 'Cost: <b>' + tc + ' 💰</b> (treasury ' + r1(eco) + ' → ' + r1(eco - tc) + '). Turn income rises permanently by <b>+' + TRADE_INC + '</b> (now +' + r2(tl * TRADE_INC) + ').');
      } else {
        var d = devOf(k); if (!d) return;
        var cost = devCost(d), cur = +raw[d.i] || 0, gain = devGain(cur);
        title = ICON[d.i] + ' ' + X(d.tr, d.en);
        body = X('Maliyet: <b>' + cost + ' 💰</b> (hazine ' + r1(eco) + ' → ' + r1(eco - cost) + ').<br>' + sn[d.i] + ': <b>' + r1(cur) + ' → ' + r1(Math.min(STAT_MAX, cur + gain)) + '</b>',
          'Cost: <b>' + cost + ' 💰</b> (treasury ' + r1(eco) + ' → ' + r1(eco - cost) + ').<br>' + sn[d.i] + ': <b>' + r1(cur) + ' → ' + r1(Math.min(STAT_MAX, cur + gain)) + '</b>');
      }
      modal('<div class="polx"><div class="polhd"><b>' + title + '</b></div><p class="polinfo">' + body + '<br>' + X('Bu tur başka yatırım yapamazsın. Onaylıyor musun?', 'You cannot invest again this turn. Confirm?') + '</p>' +
        '<button class="big pri" onclick="dev137Do(\'' + k + '\')">' + X('Evet, yatırım yap', 'Yes, invest') + '</button><button class="big" onclick="dev137Menu()">' + X('Vazgeç', 'Cancel') + '</button></div>');
    } catch (e) { }
  };
  window.dev137Do = function (k) {
    closeMod();
    try {
      if (!canNow()) return;
      if (usedNow()) { toast(X('Bu tur zaten yatırım yaptın', 'You already invested this turn')); return; }
      var pl = G.pl, eco = rawEco(pl);
      if (k === 'trade') {
        var tl = G.trade137 || 0, tc = tradeCost();
        if (tl >= TRADE_MAXLV || eco - tc < DEV_MIN_ECO) { toast(X('Yatırım yapılamıyor', 'Cannot invest')); return; }
        ecoAdd(pl, -tc); G.trade137 = tl + 1;
        toast('💼 ' + X('Ticaret Koridoru Sv.', 'Trade Corridor Lv.') + G.trade137 + ' · ' + X('tur geliri +', 'turn income +') + r2(G.trade137 * TRADE_INC));
      } else {
        var d = devOf(k); if (!d) return;
        var lv = devLv(k), cost = devCost(d), raw = baseArr(pl), cur = +raw[d.i] || 0, gain = devGain(cur);
        if (lv >= DEV_MAXLV || eco - cost < DEV_MIN_ECO) { toast(X('Yatırım yapılamıyor', 'Cannot invest')); return; }
        applyDev(pl, d.i, cost, gain, d.side);
        G.dev137 = G.dev137 || {}; G.dev137[k] = lv + 1;
        toast(ICON[d.i] + ' ' + X(d.tr, d.en) + ': ' + r1(cur) + ' → ' + r1(Math.min(STAT_MAX, cur + gain)) + ' · −' + cost + ' 💰');
      }
      G.dev137t = G.T.turn; save(); render();
    } catch (e) { }
  };

  /* ---- giriş noktaları: Politikalar ekranı + "Ülkem" kartı ---- */
  function hookPol() {
    if (typeof window.polMenu !== 'function') return false;
    if (window.polMenu.v137) return true;
    var _pm = window.polMenu;
    window.polMenu = function () {
      var r = _pm.apply(this, arguments);
      try {
        if (!is5()) return r;
        var bar = document.querySelector('#box .polx .polbar'); if (!bar || document.querySelector('#box .d137btn')) return r;
        bar.insertAdjacentHTML('afterend', '<button class="polgo gold d137btn" style="margin:6px 0 2px" onclick="dev137Menu()">🏗 ' + X('Kalkınma: hazineyi yatırıma çevir', 'Development: invest your treasury') + ' · 💰 ' + r1(rawEco(G.pl)) + '</button>');
      } catch (e) { }
      return r;
    };
    window.polMenu.v137 = 1; return true;
  }
  if (!hookPol()) { var n2 = 0, iv2 = setInterval(function () { if (hookPol() || ++n2 > 40) clearInterval(iv2); }, 250); }
  function cardInject() {
    try { var c = document.getElementById('v99c'), b = c && c.querySelector('.d137'); if (b) b.remove(); } catch (e) { }   // Kalkınma düğmesi Politikalar'ın yanına taşındı
  }
  setInterval(function () { if (!document.hidden && !(typeof BSH !== 'undefined' && BSH)) cardInject(); }, 700);

  /* ---- Kalkınma düğmesi: ülke panelinde Politikalar düğmesinin yanında ---- */
  function placeDev() {
    try {
      if (!is5() || !window.G || G.over) return;
      var el = document.getElementById('panel'), pb = el && el.querySelector('.polbtn'); if (!pb || el.querySelector('.d137p')) return;
      pb.insertAdjacentHTML('afterend', '<button type="button" class="d137p" onclick="dev137Menu()">🏗 ' + X('Kalkınma', 'Development') + ' · ' + r1(rawEco(G.pl)) + '</button>');
    } catch (e) { }
  }
  if (typeof panel === 'function') { var _pn137 = panel; panel = function () { var r = _pn137.apply(this, arguments); placeDev(); return r; }; }
  var _rf137 = window.v24Refresh;
  if (_rf137) window.v24Refresh = function () { var r = _rf137.apply(this, arguments); placeDev(); return r; };

  var css = document.createElement('style');
  css.textContent = '.t137{margin:6px 0;padding:7px 10px;border-radius:10px;background:rgba(255,210,74,.10);border:1px solid rgba(255,210,74,.35);font-size:12.5px;line-height:1.5}' +
    '.t137 small{display:block;opacity:.75;margin-top:2px}.t137 .w{color:#4ade80}.t137 .l{color:#f87171}' +
    '.r137{margin:8px 0 4px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.06);font-size:12.5px;line-height:1.5}.r137 summary{cursor:pointer;font-weight:700}.r137 div{margin-top:5px}' +
    '#panel .v15a>button.d137p{background:linear-gradient(180deg,#ffe38a,#e0a82a)!important;color:#102!important;border:0!important;font-weight:800}' +
    '#v99c .d137{width:100%;margin-top:8px;min-height:36px;border-radius:10px;border:0;font-weight:800;font-size:13px;color:#102;background:linear-gradient(180deg,#ffe38a,#e0a82a);cursor:pointer}';
  document.head.appendChild(css);
})();
