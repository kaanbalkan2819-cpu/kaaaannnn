/* V138 — DİPLOMASİ YENİDEN DÜZENLEME (TEST EDİLMEDİ; istek gereği oyunda/tarayıcıda çalıştırılmadı)
   1) Sadeleştirme: tek "Diplomasi" düğmesi → tek ülke sayfası (İttifak / Saldırmazlık / Haraç + "Diğer işlemler"). Diplomasi Merkezi: aktif anlaşmalar + ülke listesi (tek dokunuş).
   2) İlişki puanı (-100..+100) görünür: sayfa ve listede etiket + neden satırları. Güven (sen) ve İtibar (saldırganlık) göstergeleri.
   3) İttifak: ilişki en az Nötr ve güven ≥ 30 gerekir; her müttefik tur başına küçük ticaret geliri verir (saldırganlık düşükken); süre dolmadan 2 tur önce uyarı + "Yenile".
      Bozulma: süre dolması (cezasız) · erken çıkış (güven -5, üyelerle ilişki -10) · ihanet (müttefike saldırı: güven -25, ilişki -40, herkesle -4).
   4) Saldırmazlık: en çok 2 aktif pakt, 2. pakt +1 zar; kabul şansı görünür; reddedilirse ücret alınmaz. Paktı oyuncu bozabilir (ilişki -30, güven -15, hedef intikam alır).
      YZ de zayıf/aşırı agresif oyuncuyla paktı tek taraflı bozabilir.
   5) Güvenlik garantisi: garantör saldırgana müttefik/paktlıysa ya da yok olmuşsa o saldırı için devre dışı kalır; ölü kayıtlar temizlenir (senaryolar: DIPLOMASI_TEST_SENARYOLARI.md).
   6) Elçi: ilişki ≤ -60 ise elçi kabul edilmez (rastgele değil, nedeni yazılı); her işlemde kabul şansı ve zar maliyeti görünür.
   7) YZ tepkisi: teklifler ilişki/güven/itibardan etkilenir; ittifak kurunca rakip rahatsız olur; YZ bazen sana pakt / ittifak teklif eder (Kabul/Reddet).
   8) Savaş-diplomasi dengesi: her saldırı ilişkiyi düşürür, itibarı (saldırganlık) artırır; itibar yüksekken barış geliri kesilir ve teklifler zorlaşır.
   9) Maliyet: zar bedeli işleme göre (aşağıda COSTS). Reddedilen İttifak teklifinde zarın yarısı iade edilir.
   Online (G.mp) oyunlarda v138 DEVRE DIŞI. Geri almak için index.html'den v138.js ve v138.css bağlantılarını silin. */
(function () {
  'use strict';
/* V218: diplomasi pencerelerindeki 🎲 yerine Figma'da üretilen gerçekçi fildişi zar (assets/art/die218.png) */  var DIE218 = '<img class="die218" src="assets/art/die218.png" alt="" draggable="false">';  function modal(h) { return window.modal(typeof h === 'string' ? h.replace(/🎲/g, DIE218) : h); }
  /* ================= AYARLAR ================= */
  var COSTS = { friend: 3, pact: 2, pact2: 3, tribute: 1, guard: 3, prot: 3, incite: 3, renew: 2 };   // zar bedeli
  var ALLY_TURNS = 8, MAXCO = 4, PACT_TURNS = 4, PACT_MAX = 2;   // v40/v20 ile aynı değerler (v40: ALLY_TURNS=8, MAXCO=4; v20: PACT_TURNS=4)
  var ALLY_MIN_REL = -9, ALLY_MIN_TRUST = 30, ENVOY_BLOCK_REL = -60, PACT_BLOCK_REL = -45, FRIEND_BLOCK_REL = -20;
  var TRUST_START = 70, TRUST_REGEN = 1, AGG_DECAY = .3, REL_DECAY = 1.5;
  var INC_PACT = .1, INC_ALLY = .2, INC_ALLY_MAX = 3, PEACE_AGG_MAX = 3;   // barış geliri (tur başı)
  var AGG_ATTACK = 1, AGG_FRIEND = 1.5, AGG_BETRAY = 2;   // saldırı itibar artışı
  var REFUND_FRIEND = true;

  /* ================= YARDIMCILAR ================= */
  function X(a, b) { return (typeof L !== 'undefined' && L === 'en') ? b : a; }
  function on() { try { return !!G && G.v5 === 1 && typeof G.pl === 'string' && !G.mp && !!window.WCD; } catch (e) { return false; } }
  function turn() { return (G && G.T && G.T.turn) || 0; }
  function nm(e) { return (window.M && M[e] && M[e].name) || e; }
  function fl(e) { try { return fimg(e, 'sm'); } catch (x) { return ''; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function power(e) { try { return V24.power(e); } catch (x) { var a = st(e), s = 0; for (var i = 0; i < 5; i++) s += (+a[i] || 0); return s; } }
  function say(m) { try { toast(m); } catch (x) { } }
  function save2() { try { save(); } catch (x) { } }
  function key(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function selE() { var e = G && G.sel && G.owner[G.sel]; return (typeof e === 'string' && e !== G.pl) ? e : null; }
  function regionOf(e) { if (G.owner[e] === e) return e; for (var k in G.owner) if (G.owner[k] === e) return k; return null; }
  function D() { if (!G.dip) G.dip = { co: [], cd: {}, rel: {}, rev: {} }; var d = G.dip; d.fr = d.fr || {}; d.cd = d.cd || {}; d.rel = d.rel || {}; d.rev = d.rev || {}; d.co = d.co || []; return d; }
  function D2() {
    var d = G.dip2; if (!d) d = G.dip2 = { d: {}, trust: TRUST_START, agg: 0, offer: null, lastOffer: -9, last: -1, warn: {} };
    d.d = d.d || {}; d.warn = d.warn || {}; if (typeof d.trust !== 'number') d.trust = TRUST_START; if (typeof d.agg !== 'number') d.agg = 0;
    return d;
  }
  function pactLeft(e) { try { var v = G.pacts && G.pacts[key(G.pl, e)]; return v > turn() ? v - turn() : 0; } catch (x) { return 0; } }
  function pactCount() { var n = 0; try { for (var k in G.pacts) { if (!(G.pacts[k] > turn())) continue; var p = k.split('|'); if ((p[0] === G.pl || p[1] === G.pl)) n++; } } catch (x) { } return n; }
  function allied(e) { try { return WCD.allied(G.pl, e); } catch (x) { return false; } }
  function allyList() { try { return WCD.allies(G.pl); } catch (x) { return []; } }
  function coAlive(c) { return c.until == null || c.until > turn(); }
  function coIdx(e) { var c = D().co; for (var i = 0; i < c.length; i++) if (coAlive(c[i]) && c[i].m.indexOf(e) >= 0) return i; return -1; }
  function coSize(e) { var i = coIdx(e); return i < 0 ? 1 : D().co[i].m.filter(function (x) { return ownedN(x) > 0; }).length; }
  function canJoin(a, b) { var ia = coIdx(a); if (ia >= 0 && ia === coIdx(b)) return true; return coSize(a) + coSize(b) <= MAXCO; }
  function myCoLeft() { var i = coIdx(G.pl); if (i < 0) return 0; var u = D().co[i].until; return u == null ? 99 : Math.max(0, u - turn()); }
  function addAlly(a, b, vs) {   // v40 addPair ile aynı mantık (kapalı fonksiyona erişilemediği için kopya)
    if (!canJoin(a, b)) return false;
    var d = D(), ia = coIdx(a), ib = coIdx(b), c;
    if (ia >= 0 && ia === ib) { c = d.co[ia]; c.until = turn() + ALLY_TURNS; return true; }
    if (ia >= 0 && ib >= 0) { c = d.co[ia]; d.co[ib].m.forEach(function (x) { if (c.m.indexOf(x) < 0) c.m.push(x); }); d.co.splice(ib, 1); }
    else if (ia >= 0) { c = d.co[ia]; c.m.push(b); }
    else if (ib >= 0) { c = d.co[ib]; c.m.push(a); }
    else { c = { m: [a, b], vs: null }; d.co.push(c); }
    if (vs) c.vs = vs;
    c.until = turn() + ALLY_TURNS; return true;
  }

  /* ================= İLİŞKİ / GÜVEN / İTİBAR ================= */
  function addRel(e, v) { var d = D2(); d.d[e] = clamp((d.d[e] || 0) + v, -100, 100); }
  function relParts(e) {   // [[trAd, enAd, değer], ...]
    var p = [], d = D2(), dd = D(), v;
    try { if (allied(e)) p.push(['İttifak', 'Alliance', 30]); } catch (x) { }
    if (pactLeft(e) > 0) p.push(['Saldırmazlık paktı', 'Non-aggression pact', 10]);
    v = (dd.fr[e] || 0) * 4; if (v) p.push(['Ortak yardımlaşma', 'Mutual help', v]);
    if (G.fought23 && G.fought23[e]) p.push(['Geçmiş savaş', 'Past wars', -10]);
    v = (dd.rel[e] || 0) * -8; if (v) p.push(['Reddedilen taleplerin gölgesi', 'Rejected demands', v]);
    if (G.rv && G.rv[e + '>' + G.pl]) p.push(['İntikam duygusu', 'Desire for revenge', -10]);
    try { var I = G.inc23 && G.inc23[e + '>' + G.pl]; if (I && I.until >= turn()) p.push(['Sana karşı kışkırtıldı', 'Incited against you', -10]); } catch (x) { }
    try { dd.co.forEach(function (c) { if (c.anti && coAlive(c) && c.m.indexOf(e) >= 0 && c.m.indexOf(G.pl) < 0) p.push(['Sana karşı koalisyonda', 'In coalition against you', -20]); }); } catch (x) { }
    if (d.d[e]) p.push([d.d[e] > 0 ? 'Son olaylar' : 'Son olaylar', 'Recent events', Math.round(d.d[e])]);
    return p;
  }
  function relOf(e) { var s = 0; relParts(e).forEach(function (q) { s += q[2]; }); return clamp(Math.round(s), -100, 100); }
  var RL = [[60, 'Sadık Dost', 'Devoted', '#3ddc84'], [30, 'Dost', 'Friendly', '#7bd96a'], [10, 'Sıcak', 'Warm', '#b5d95a'], [-9, 'Nötr', 'Neutral', '#c9c2a0'],
    [-34, 'Soğuk', 'Cold', '#e0b050'], [-59, 'Gergin', 'Tense', '#e8803a'], [-101, 'Düşman', 'Hostile', '#e0453a']];
  function relInfo(r) { for (var i = 0; i < RL.length; i++) if (r >= RL[i][0]) return { n: X(RL[i][1], RL[i][2]), c: RL[i][3] }; return { n: '', c: '#999' }; }
  function trustInfo() { var t = D2().trust; return t >= 60 ? X('Yüksek', 'High') : t >= 35 ? X('Orta', 'Medium') : X('Düşük', 'Low'); }
  function aggInfo() { var a = D2().agg; return a < 1.5 ? X('Barışçıl', 'Peaceful') : a < 3.5 ? X('Sert', 'Firm') : a < 6 ? X('Saldırgan', 'Aggressive') : X('Tehdit', 'Menace'); }
  function mods(e) { var d = D2(); return (d.trust - TRUST_START) / 250 - Math.min(.25, d.agg * .03) + relOf(e) / 300; }
  /* V220: GİZLİ diplomasi deneyimi — her diplomatik işlem (G.dx220) YZ'nin kabul ihtimalini görünmeden artırır (en çok +%18) */
  function hid220() { try { return Math.min(.18, (G.dx220 || 0) * .02); } catch (x) { return 0; } }
  function dx220() { try { G.dx220 = (G.dx220 || 0) + 1; } catch (x) { } }
  function pct(p) { return Math.round(p * 100) + '%'; }
  function peaceIncome() { var d = D2(); if (d.agg >= PEACE_AGG_MAX) return 0; return INC_PACT * Math.min(PACT_MAX, pactCount()) + INC_ALLY * Math.min(INC_ALLY_MAX, allyList().length); }

  /* ================= ŞANSLAR ================= */
  function chFriend(e) {
    var d = D2(), r = relOf(e);
    if (allied(e)) return { p: 0, why: X('Zaten müttefiksin.', 'Already allied.') };
    if (D().cd['f' + e] === turn()) return { p: 0, why: X('Bu tur zaten teklif ettin.', 'You already proposed this turn.') };
    if (r < Math.max(ALLY_MIN_REL, FRIEND_BLOCK_REL)) return { p: 0, why: X('İlişki yetersiz (en az "Nötr" gerekir).', 'Relations too low (at least "Neutral" needed).') };
    if (d.trust < ALLY_MIN_TRUST) return { p: 0, why: X('Güvenilirliğin çok düşük; kimse seninle ittifak istemiyor.', 'Your trustworthiness is too low; nobody wants an alliance.') };
    if (!canJoin(G.pl, e)) return { p: 0, why: X('Bir ittifak en fazla ' + MAXCO + ' devletten oluşur.', 'An alliance holds at most ' + MAXCO + ' states.') };
    var base = .3; try { base = WCD.inclination(e); } catch (x) { }
    return { p: clamp(base + mods(e), .03, .93) };
  }
  function chPact(e) {
    var d = D2(), r = relOf(e);
    if (pactLeft(e) > 0) return { p: 0, why: X('Pakt zaten aktif.', 'Pact already active.') };
    if (allied(e)) return { p: 0, why: X('Müttefikle pakta gerek yok.', 'No pact needed with an ally.') };
    if (pactCount() >= PACT_MAX) return { p: 0, why: X('En fazla ' + PACT_MAX + ' aktif pakt yapabilirsin.', 'At most ' + PACT_MAX + ' active pacts.') };
    if (r < PACT_BLOCK_REL) return { p: 0, why: X('Bu devlet seninle anlaşma yapmayacak kadar düşman.', 'This state is too hostile to sign anything.') };
    var pa = power(G.pl), pb = power(e), base = .8;
    if (Math.max(pa, pb) >= 1.35 * Math.max(1e-6, Math.min(pa, pb))) {
      if (pb > pa) { var buf = false; try { buf = V24.isBuffer(e, G.pl); } catch (x) { } base = buf ? .7 : .35; } else base = .6;
    }
    return { p: clamp(base + mods(e), .03, .95) };
  }
  function pactCost() { return pactCount() >= 1 ? COSTS.pact2 : COSTS.pact; }

  /* ================= ZAR BEDELİ KATMANI (WCPay) ================= */
  var CUR = 2, POST = null;
  function patchPay() {
    var W = window.WCPay; if (!W || W.v138) return !!(W && W.v138);
    var origAd = W.showAd;
    function mv() { try { return (G && G.T && +G.T.moves) || 0; } catch (x) { return 0; } }
    W.enough = function () { return mv() >= CUR; };
    W.label = function () { return CUR + ' 🎲'; };
    W.costLine = function () { return X('Bedel: ', 'Cost: ') + '<b>' + CUR + ' 🎲</b> · ' + X('Kalan zar: ', 'Dice left: ') + '<b>' + mv() + '</b>'; };
    W.rows = function (fn) {
      if (mv() >= CUR) return '<button class="big pri" onclick="' + fn + '(\'moves\')">🎲 ' + X(CUR + ' zar harca', 'Spend ' + CUR + ' dice') + '</button>';
      return '<button class="big" disabled>🎲 ' + X(CUR + ' zar harca (zar yetmiyor)', 'Spend ' + CUR + ' dice (not enough)') + '</button>' +
        '<button class="big pri" onclick="' + fn + '(\'ad\')">▶ ' + X('Reklam izle ve kullan', 'Watch an ad to use it') + '<small style="display:block;opacity:.75">' + X('Zar yerine kısa bir video', 'A short video instead of dice') + '</small></button>';
    };
    W.spend = function (how, ok) {
      dx220();
      function fin() { try { ok(); } catch (x) { console.error(x); } var p = POST; POST = null; if (p) { try { p(how); } catch (y) { console.error(y); } } }
      if (how === 'ad') {
        origAd(function (watched) { if (watched) fin(); else { POST = null; say('📺 ' + X('Reklam tamamlanmadı, ödül verilmedi', 'Ad not completed, no reward')); } });
        return;
      }
      if (mv() < CUR) { POST = null; say('🎲 ' + X('Yeterli zarın yok (gerekli: ' + CUR + ')', 'Not enough dice (need ' + CUR + ')')); return; }
      G.T.moves -= CUR; fin();
    };
    W.setCost = function (n) { CUR = n; W.COST = n; };
    W.v138 = 1; return true;
  }
  function setCost(n) { CUR = n; try { if (window.WCPay) WCPay.COST = n; } catch (x) { } }
  function wrapCost(name, costFn, postMaker) {   // giriş fonksiyonu çağrılınca bedel ayarlanır (+ isteğe bağlı sonrası)
    var o = window[name]; if (typeof o !== 'function' || o.v138) return;
    var w = function () {
      if (on()) { setCost(typeof costFn === 'function' ? costFn() : costFn); POST = null; if (postMaker) { try { POST = postMaker(); } catch (x) { POST = null; } } }
      return o.apply(this, arguments);
    };
    w.v138 = 1; window[name] = w;
  }

  /* ================= SAVAŞ: İLİŞKİ / İTİBAR ETKİSİ (WCD.war kancası) ================= */
  function beforeWar(att, de) {
    if (!on() || G.over) return;
    var d = D2();
    if (att === G.pl) {
      var r = relOf(de), wasAlly = allied(de);
      addRel(de, wasAlly ? -40 : -20);
      try { WCD.allies(de).forEach(function (a) { if (a !== G.pl) addRel(a, -8); }); } catch (x) { }
      d.agg += wasAlly ? AGG_BETRAY : (r > 10 ? AGG_FRIEND : AGG_ATTACK);
      if (wasAlly) {
        d.trust = Math.max(0, d.trust - 25);
        try { WCD.allies(G.pl).forEach(function (a) { if (a !== de) addRel(a, -15); }); } catch (x) { }
        try { aliveEmp().forEach(function (e) { if (e !== G.pl && e !== de) addRel(e, -4); }); } catch (x) { }
        say('📉 ' + X('İhanet: güvenilirliğin ve itibarın düştü', 'Betrayal: your trust and reputation fell'));
      }
    } else if (de === G.pl) { addRel(att, -15); }
  }
  function hookWar() {
    if (!window.WCD || typeof WCD.war !== 'function') return false;
    if (WCD.war.v138) return true;
    var _w = WCD.war, w = function (att, de) { try { beforeWar(att, de); } catch (x) { console.error(x); } return _w.apply(this, arguments); };
    for (var k in _w) w[k] = _w[k];   // v73/v102/v120 bayraklarını koru
    w.v138 = 1; WCD.war = w; return true;
  }

  /* ================= GÜVENLİK GARANTİSİ: KENAR DURUMLAR ================= */
  function hookGuard() {
    if (!window.V5 || typeof V5.attack !== 'function' || !V5.attack.__g123) return false;
    if (V5.attack.__g138) return true;
    var _a = V5.attack;
    var w = function (att, tg, isAI) {
      var stash = null;
      try {
        if (on() && isAI && G.guard23 && G.owner[tg] === G.pl) {
          for (var g in G.guard23) {
            var bad = ownedN(g) === 0 || (att !== G.pl && (pactedAI(att, g) || alliedAI(att, g)));
            if (bad) { stash = stash || {}; stash[g] = G.guard23[g]; delete G.guard23[g]; }
          }
        }
      } catch (x) { }
      try { return _a.apply(this, arguments); }
      finally { if (stash) { try { for (var s in stash) if (G.guard23 && G.guard23[s] == null) G.guard23[s] = stash[s]; } catch (x) { } } }
    };
    w.__g123 = 1; w.__g138 = 1; V5.attack = w; return true;
  }
  function pactedAI(a, b) { try { return !!(G.pacts && G.pacts[key(a, b)] > turn()); } catch (x) { return false; } }
  function alliedAI(a, b) { try { return WCD.allied(a, b); } catch (x) { return false; } }

  /* ================= TUR BAŞI ================= */
  function tick() {
    if (!on() || G.over) return;
    var d = D2(), tn = turn(); if (d.last === tn) return; d.last = tn;
    Object.keys(d.d).forEach(function (e) { var v = d.d[e]; if (Math.abs(v) <= REL_DECAY) delete d.d[e]; else d.d[e] = v - (v > 0 ? REL_DECAY : -REL_DECAY); if (ownedN(e) === 0) delete d.d[e]; });
    d.trust = Math.min(TRUST_START, d.trust + TRUST_REGEN); d.agg = Math.max(0, d.agg - AGG_DECAY);
    ['guard23', 'prot55'].forEach(function (k) { var o = G[k]; if (!o) return; Object.keys(o).forEach(function (g) { if (o[g] < tn || ownedN(g) === 0) delete o[g]; }); });
    var inc = peaceIncome(); if (inc > 0) { try { addEco(G.pl, inc); } catch (x) { } }
    try {   // ittifak bitiş uyarısı
      D().co.forEach(function (c) {
        if (c.m.indexOf(G.pl) < 0 || c.until == null) return; var left = c.until - tn, wk = c.until + '|' + left;
        if ((left === 2 || left === 1) && !d.warn[wk]) { d.warn[wk] = 1; say('⌛ ' + X('İttifak ' + left + ' tur sonra bitiyor — Diplomasi’den yenileyebilirsin', 'Alliance ends in ' + left + ' turn(s) — renew it in Diplomacy')); }
      });
    } catch (x) { }
    try {   // YZ tek taraflı pakt bozma
      Object.keys(G.pacts || {}).forEach(function (k) {
        if (!(G.pacts[k] > tn)) return; var p = k.split('|'); if (p.indexOf(G.pl) < 0) return; var o = p[0] === G.pl ? p[1] : p[0];
        if (ownedN(o) === 0) return;
        var strongOther = power(o) >= 1.5 * power(G.pl) && relOf(o) < 5 && Math.random() < .12, riled = d.agg >= 5 && relOf(o) < 0 && Math.random() < .2;
        if (strongOther || riled) { delete G.pacts[k]; addRel(o, -10); say('📜 ' + nm(o) + ' — ' + X('saldırmazlık paktını tek taraflı bozdu', 'broke the non-aggression pact unilaterally')); }
      });
    } catch (x) { }
    try { aiOffer(d, tn); } catch (x) { console.error(x); }
    save2();
  }
  function installStart() {
    if (!window.V5 || typeof V5.start !== 'function' || V5.start.v138) return !!(window.V5 && V5.start && V5.start.v138);
    var _s = V5.start, w = function () { try { tick(); } catch (e) { console.error(e); } return _s.apply(this, arguments); };
    for (var k in _s) w[k] = _s[k]; w.v138 = 1; V5.start = w; return true;
  }

  /* ================= YZ TEKLİFLERİ ================= */
  function neighboursOfPl() {
    var s = {}; try { var tg = targets(G.pl, G.owner); for (var k in tg) { var o = G.owner[k]; if (typeof o === 'string' && o !== G.pl && ownedN(o) > 0) s[o] = 1; } } catch (x) { }
    for (var id in G.owner) if (G.owner[id] === G.pl && M[id] && M[id].nb) M[id].nb.forEach(function (n) { var o = G.owner[n]; if (typeof o === 'string' && o !== G.pl && ownedN(o) > 0) s[o] = 1; });
    return Object.keys(s);
  }
  function aiOffer(d, tn) {
    if (d.offer) { if (tn - d.offer.t > 2 || ownedN(d.offer.from) === 0) d.offer = null; else return; }
    if (G.dip && G.dip.offer) return; if (tn - d.lastOffer < 3 || Math.random() > .4 + hid220()) return;
    var c = [], pl = power(G.pl);
    neighboursOfPl().forEach(function (e) {
      if (allied(e) || pactLeft(e) > 0) return; var r = relOf(e);
      if (r >= 25 && canJoin(G.pl, e) && d.trust >= ALLY_MIN_TRUST) c.push({ from: e, kind: 'ally', w: 1 + r / 50 });
      else if (r > -15 && r < 40 && pactCount() < PACT_MAX && (power(e) < .9 * pl || d.agg >= 2)) c.push({ from: e, kind: 'pact', w: 1 + (power(e) < .9 * pl ? .5 : 0) + d.agg / 4 });
    });
    if (!c.length) return;
    var tot = 0; c.forEach(function (x) { tot += x.w; }); var rr = Math.random() * tot, pick = c[0];
    for (var i = 0; i < c.length; i++) { rr -= c[i].w; if (rr <= 0) { pick = c[i]; break; } }
    d.offer = { from: pick.from, kind: pick.kind, t: tn }; d.lastOffer = tn;
  }
  var OFF = false;
  function maybeOffer() {
    try {
      var d = on() && G.dip2; var m = document.getElementById('mod'); if (OFF && (!m || m.style.display !== 'flex')) OFF = false;
      if (!d || !d.offer || OFF || !WCD.canAct()) return;
      if (m && m.style.display === 'flex') return;
      var o = d.offer; if (ownedN(o.from) === 0) { d.offer = null; return; }
      OFF = true;
      var isA = o.kind === 'ally';
      modal('<h3>' + (isA ? '🤝 ' + X('İttifak Teklifi', 'Alliance Offer') : '🛡 ' + X('Saldırmazlık Teklifi', 'Pact Offer')) + '</h3><div style="text-align:center;margin:8px 0">' + fl(o.from) + ' <b>' + esc(nm(o.from)) + '</b></div>' +
        '<p style="color:var(--tx2)">' + (isA ? X('<b>' + esc(nm(o.from)) + '</b> seninle ittifak kurmak istiyor (' + ALLY_TURNS + ' tur). Savaşlarda değerler toplanır, her müttefik küçük bir ticaret geliri getirir; ama müttefike saldırmak ihanettir.',
          '<b>' + esc(nm(o.from)) + '</b> wants an alliance (' + ALLY_TURNS + ' turns). Stats add up in war and each ally brings a little trade income; attacking an ally is betrayal.') :
          X('<b>' + esc(nm(o.from)) + '</b> ' + PACT_TURNS + ' tur boyunca birbirinize saldırmamayı öneriyor.', '<b>' + esc(nm(o.from)) + '</b> proposes ' + PACT_TURNS + ' turns without attacks.')) + '</p>' +
        /* V214: teklifte karşı taraf somut bir şey taahhüt eder (kabul edilip antlaşma kurulursa o alan +%5) */
        (function () { try { if (o.k == null) o.k = 1 + Math.floor(Math.random() * 4); return window.WCPledge ? '<div class="pledge214"><img class="wci" src="' + ((window.WC_ICONS || {})[['pop', 'army', 'eco', 'tech', 'dip'][o.k]] || '') + '" alt=""><span><small>' + X('KARŞILIĞINDA', 'IN RETURN') + '</small>' + WCPledge(o) + '</span></div>' : ''; } catch (e) { return ''; } })() +
        '<button class="big pri" onclick="v138Offer(1)">✔ ' + X('Kabul Et', 'Accept') + '</button><button class="big" onclick="v138Offer(0)">✖ ' + X('Reddet', 'Decline') + '</button>');
    } catch (x) { OFF = false; }
  }
  window.v138Offer = function (yes) {
    var d = G && G.dip2, o = d && d.offer; OFF = false; closeMod(); if (!o) return; d.offer = null;
    if (yes) {
      var gift214 = function () { if (o.k == null) return; try { var cur = st(G.pl); G.es = G.es || {}; G.es[G.pl] = cur.map(function (v, i) { return i === o.k ? Math.round(v * 1.05 * 1e6) / 1e6 : v; }); if (G.ed) G.ed[G.pl] = 0; } catch (x) { } };   /* V214: taahhüt edilen katkı */
      if (o.kind === 'ally') { if (canJoin(G.pl, o.from) && addAlly(G.pl, o.from, null)) { addRel(o.from, 10); gift214(); say('🤝 ' + nm(o.from) + ' — ' + X('ittifak kuruldu', 'alliance formed')); } else say(X('İttifak kurulamadı (üye sınırı)', 'Alliance not possible (member limit)')); }
      else if (pactCount() < PACT_MAX) { G.pacts = G.pacts || {}; G.pacts[key(G.pl, o.from)] = turn() + PACT_TURNS + 1; addRel(o.from, 8); gift214(); say('🛡 ' + nm(o.from) + ' — ' + X('saldırmazlık paktı imzalandı', 'pact signed')); }
      else say(X('Aktif pakt sınırına ulaştın', 'Active pact limit reached'));
    } else addRel(o.from, -3);
    save2(); try { render(); } catch (x) { }
  };

  /* ================= ARAYÜZ ================= */
  function canAct() { try { return !!(on() && WCD.canAct()); } catch (x) { return false; } }
  function relBar(r) { var i = relInfo(r), pos = (r + 100) / 2; return '<div class="d38-rel"><div class="d38-bar"><i style="left:' + pos + '%;background:' + i.c + '"></i></div><div class="d38-rl"><b style="color:' + i.c + '">' + i.n + '</b><span>' + (r > 0 ? '+' : '') + r + '</span></div></div>'; }
  function why(e) {
    var p = relParts(e).sort(function (a, b) { return Math.abs(b[2]) - Math.abs(a[2]); }).slice(0, 4);
    if (!p.length) return '<div class="d38-why">' + X('Henüz belirgin bir olay yok.', 'No notable events yet.') + '</div>';
    return '<div class="d38-why">' + p.map(function (q) { return '<span class="' + (q[2] >= 0 ? 'pos' : 'neg') + '">' + X(q[0], q[1]) + ' ' + (q[2] > 0 ? '+' : '') + q[2] + '</span>'; }).join('') + '</div>';
  }
  function row(ic, tt, ds, right, on_, extra) {
    return '<button class="d38-r' + (on_ ? '' : ' off') + '" ' + (on_ ? 'onclick="' + on_ + '"' : 'disabled') + '><span class="d38-i">' + ic + '</span><span class="d38-t"><b>' + tt + '</b><small>' + ds + '</small>' + (extra ? '<small class="d38-no">' + extra + '</small>' : '') + '</span><em>' + right + '</em></button>';
  }
    /* V198: Kalkınma penceresiyle aynı kart biçimi (madalyon + başlık + açıklama + altın düğme) */
  function prow(ic, tt, ds, right, on_, extra) {
    var btn = on_ ? '<button class="polgo gold" onclick="' + on_ + '">' + right + '</button>' : '<button class="polgo' + (/^[✔✓]/.test(right) ? ' on' : '') + '" disabled>' + right + '</button>';
    return '<div class="pcard d38p" style="--pc:#cdb06a"><div class="pic">' + ic + '</div><div class="pbd"><div class="ptt"><b>' + tt + '</b></div><div class="pds">' + ds + '</div>' +
      (extra ? '<div class="pst"><span class="pchip" style="color:#ffa79c">' + extra + '</span></div>' : '') + btn + '</div></div>';
  }
function sheet(e) {
    if (!canAct() || !e) return;
    var d = D2(), r = relOf(e), al = allied(e), pl = pactLeft(e), gu = G.guard23 && G.guard23[e] >= turn(), pr = G.prot55 && G.prot55[e] >= turn();
    var chips = '';
    if (al) chips += '<span class="d38-chip">🤝 ' + X('Müttefik', 'Ally') + (coIdx(e) >= 0 ? ' · ' + myCoLeft() + X(' tur', ' t') : '') + '</span>';
    if (pl) chips += '<span class="d38-chip">🛡 ' + X('Pakt ', 'Pact ') + pl + X(' tur', ' t') + '</span>';
    if (gu) chips += '<span class="d38-chip">🛡 ' + X('Garanti ', 'Guarantee ') + (G.guard23[e] - turn()) + X(' tur', ' t') + '</span>';
    if (pr) chips += '<span class="d38-chip">🛡 ' + X('Koruma ', 'Protect ') + (G.prot55[e] - turn()) + X(' tur', ' t') + '</span>';
    var fc = chFriend(e), pc = chPact(e), tl = 0; try { tl = WCD.tribLeft(); } catch (x) { }
    var friendRow;
    if (al) { var left = myCoLeft(); friendRow = left <= 2 ? prow('🔄', X('İttifakı Yenile', 'Renew Alliance'), X('Süreyi ' + ALLY_TURNS + ' tura uzatır · ilişki en az Nötr olmalı', 'Extends to ' + ALLY_TURNS + ' turns · relations must be at least Neutral'), COSTS.renew + ' 🎲', 'v138Renew()') : prow('🤝', X('İttifak', 'Alliance'), X('Müttefik · ' + left + ' tur kaldı', 'Allied · ' + left + ' turns left'), '✔', null); }
    else friendRow = prow('🤝', X('İttifak', 'Alliance'), X('Savaşta değerler toplanır · müttefik başına ticaret geliri · ' + ALLY_TURNS + ' tur', 'Stats add in war · trade income per ally · ' + ALLY_TURNS + ' turns'), fc.p ? pct(fc.p) + ' · ' + COSTS.friend + ' 🎲' : '—', fc.p ? 'wcdFriend()' : null, fc.p ? '' : fc.why);
    var pactRow = pl ? prow('🛡', X('Saldırmazlık', 'Non-Aggression'), X(pl + ' tur kaldı', pl + ' turns left'), '✔', null) :
      prow('🛡', X('Saldırmazlık', 'Non-Aggression'), X(PACT_TURNS + ' tur saldıramazsınız · aktif ' + pactCount() + '/' + PACT_MAX, PACT_TURNS + ' turns without attacks · active ' + pactCount() + '/' + PACT_MAX), pc.p ? pct(pc.p) + ' · ' + pactCost() + ' 🎲' : '—', pc.p ? 'wcdNap()' : null, pc.p ? '' : pc.why);
    var more = prow('💰', X('Haraç Talep Et', 'Demand Tribute'), X('Zayıf devletten ödeme iste · reddederse ilişki bozulur', 'Demand payment from weaker states · refusal sours relations'), tl + '/2 · ' + COSTS.tribute + ' 🎲', 'wcdTribute()') +
      prow('🛡', X('Güvenlik Garantisi', 'Security Guarantee'), X('İki güçlü devlet arasındaysan sana saldıranla savaşır', 'Fights whoever attacks you if you sit between two strong states'), COSTS.guard + ' 🎲', 'v138Via(\'v23Guard\')') +
      prow('🤲', X('Koruma Talebi', 'Request Protection'), X('Sana saldırılırsa seninle birlikte savaşa girer', 'Joins the war with you if you are attacked'), COSTS.prot + ' 🎲', 'v138Via(\'v55GuardJoint\')') +
      prow('🔥', X('Kışkırt', 'Incite'), X('İki ülkeyi birbirine düşür · ortaya çıkarsa ilişki bozulur', 'Turn two states on each other · may sour relations if exposed'), COSTS.incite + ' 🎲', 'v138Via(\'v23Incite\')') +
      (pl ? prow('✂', X('Paktı Boz', 'Break Pact'), X('İlişki −30, güven −15; hedef intikam alabilir', 'Relations −30, trust −15; target may retaliate'), X('Ücretsiz', 'Free'), 'v138BreakAsk()') : '') +
      (al ? prow('🚪', X('İttifaktan Çık', 'Leave Alliance'), X('Süre dolmadan çıkmak ilişkiyi ve güveni düşürür', 'Leaving early costs relations and trust'), X('Ücretsiz', 'Free'), 'wcdLeave()') : '');
    modal('<div class="polx"><div class="polhd"><b>🕊 ' + X('Diplomasi', 'Diplomacy') + '</b><span class="polsub">' + esc(nm(e)) + '</span>' +
      '<button class="polcl" onclick="closeMod()" aria-label="close">✕</button></div>' +
      '<div class="polbar"><span>🎲 <b>' + ((G.T && G.T.moves) || 0) + '</b></span><span>🤝 ' + X('Güven', 'Trust') + ' <b>' + trustInfo() + '</b></span></div>' +
      relBar(r) + why(e) + (chips ? '<div class="d38-chips">' + chips + '</div>' : '') +
      '<div class="polscroll">' + friendRow + pactRow + more + '</div></div>');
  }
  window.v138Sheet = function (e) { sheet(e || selE()); };
  window.v138Via = function (fn) {   // v23.js içindeki eski elçi alt ekranlarını (ENV gerektirir) tek sayfadan aç
    if (!canAct()) return; var e = selE(); if (!e) return;
    try { G.envT23 = G.envT23 || {}; G.envT23[e] = { t: turn(), no: 0 }; if (_envoy0) _envoy0(); if (typeof window[fn] === 'function') window[fn](); } catch (x) { console.error(x); }
  };

  /* ---- İttifak ---- */
  function friendModal() {
    if (!canAct()) return; var e = selE(); if (!e) return; var c = chFriend(e);
    if (!c.p) { modal('<h3>🤝 ' + X('İttifak', 'Alliance') + '</h3><p>' + (c.why || '') + '</p><button class="big" onclick="v138Sheet()">‹ ' + X('Geri', 'Back') + '</button>'); return; }
    setCost(COSTS.friend);
    modal('<div class="d38"><h3>🤝 ' + X('İttifak', 'Alliance') + ' — ' + esc(nm(e)) + '</h3><div class="d38-hd">' + fl(G.pl) + '<span>⇄</span>' + fl(e) + '</div>' + relBar(relOf(e)) +
      '<p style="color:var(--tx2)">' + X('Kabul şansı: <b>' + pct(c.p) + '</b>. Reddedilirse zarın yarısı iade edilir. ' + ALLY_TURNS + ' tur sürer; savaşlarda değerler toplanır, ittifak üyelerine saldıramazsın. Müttefike saldırmak <b>ihanettir</b>: o savaşta 2 kat güçlü olur, güvenin ve itibarın çöker.',
        'Chance: <b>' + pct(c.p) + '</b>. Half the dice are refunded if refused. Lasts ' + ALLY_TURNS + ' turns; stats add up in war and you cannot attack members. Attacking an ally is <b>betrayal</b>: it fights at 2x and your trust and reputation collapse.') + '</p>' +
      '<p>' + WCPay.costLine() + '</p>' + WCPay.rows('v138FriendGo') + gold218('friend', c.p) + '<button class="big" onclick="v138Sheet()">‹ ' + X('Geri', 'Back') + '</button></div>');
  }
  window.v138FriendGo = function (how) {
    if (!canAct()) { closeMod(); return; } var e = selE(); if (!e || !chFriend(e).p) { closeMod(); return; }
    closeMod(); setCost(COSTS.friend); POST = null;
    WCPay.spend(how, function () { friendRun(e, how); });
  };
  function friendRun(e, how) {
    if (!canAct()) return; var c = chFriend(e); if (!c.p) return;
    D().cd['f' + e] = turn();
    dx220(); if (how === 'gold218' || Math.random() < Math.min(.97, c.p + hid220())) {   /* V218: altınla kesin anlaşma */
      addAlly(G.pl, e, null); addRel(e, 15); save2();
      try {   // rakip tepkisi: ittifaktan rahatsız olan güçlü komşu
        var riv = neighboursOfPl().concat([]).filter(function (x) { return x !== e && !allied(x) && ownedN(x) > 0; }).sort(function (a, b) { return power(b) - power(a); })[0];
        if (riv && Math.random() < .4) { G.inc23 = G.inc23 || {}; G.inc23[riv + '>' + G.pl] = { until: turn() + 3, m: 1.3, add: .1 }; addRel(riv, -6); say('😠 ' + nm(riv) + ' — ' + X('ittifaktan rahatsız oldu', 'is uneasy about the alliance')); }
      } catch (x) { }
      try { render(); } catch (x) { }
      modal('<h3>🤝 ' + X('İttifak Kuruldu', 'Alliance Formed') + '</h3><div class="d38-hd">' + fl(G.pl) + '<span>⇄</span>' + fl(e) + '</div><p>' + X('<b>' + esc(nm(e)) + '</b> teklifini kabul etti (' + ALLY_TURNS + ' tur).', '<b>' + esc(nm(e)) + '</b> accepted (' + ALLY_TURNS + ' turns).') + '</p><button class="big pri" onclick="closeMod()">' + X('Tamam', 'OK') + '</button>');
    } else {
      addRel(e, -2); if (REFUND_FRIEND && how === 'moves') { try { G.T.moves += Math.floor(COSTS.friend / 2); } catch (x) { } }
      save2(); try { render(); } catch (x) { }
      modal('<h3>🕊 ' + X('Teklif Reddedildi', 'Proposal Rejected') + '</h3><p>' + X('<b>' + esc(nm(e)) + '</b> şimdilik bağımsız kalmayı seçti. Bu tur tekrar deneyemezsin. Zarın yarısı iade edildi.', '<b>' + esc(nm(e)) + '</b> prefers to stay independent. No retry this turn. Half the dice were refunded.') + '</p><button class="big" onclick="v138Sheet()">‹ ' + X('Geri', 'Back') + '</button>');
    }
  }
  window.v138Renew = function () {
    if (!canAct()) return; var e = selE(); if (!e || !allied(e) || myCoLeft() > 2) return;
    if (relOf(e) < ALLY_MIN_REL) { say('🚫 ' + nm(e) + ' — ' + X('ilişkiler yenilemeye yetmiyor', 'relations too low to renew')); return; }
    setCost(COSTS.renew); POST = null; if (!WCPay.enough()) { say('🎲 ' + X('Yeterli zarın yok (gerekli: ' + COSTS.renew + ')', 'Not enough dice (need ' + COSTS.renew + ')')); return; } closeMod();
    WCPay.spend('moves', function () { var i = coIdx(G.pl); if (i >= 0) D().co[i].until = turn() + ALLY_TURNS; D2().trust = Math.min(TRUST_START, D2().trust + 2); addRel(e, 3); save2(); try { render(); } catch (x) { } say('🔄 ' + X('İttifak yenilendi', 'Alliance renewed')); });
  };
  /* ---- Saldırmazlık ---- */
  function pactModal() {
    if (!canAct()) return; var e = selE(); if (!e) return; var c = chPact(e);
    if (!c.p) { modal('<h3>🛡 ' + X('Saldırmazlık', 'Non-Aggression') + '</h3><p>' + (c.why || '') + '</p><button class="big" onclick="v138Sheet()">‹ ' + X('Geri', 'Back') + '</button>'); return; }
    setCost(pactCost());
    modal('<div class="d38"><h3>🛡 ' + X('Saldırmazlık', 'Non-Aggression') + ' — ' + esc(nm(e)) + '</h3><div class="d38-hd">' + fl(G.pl) + '<span>⇄</span>' + fl(e) + '</div>' + relBar(relOf(e)) +
      '<p style="color:var(--tx2)">' + X('Kabul şansı: <b>' + pct(c.p) + '</b>. Reddedilirse ücret alınmaz. ' + PACT_TURNS + ' tur birbirinize saldıramazsınız (aktif pakt ' + pactCount() + '/' + PACT_MAX + '). Süresi dolmadan bozarsan ilişki −30, güven −15 olur ve hedef intikam alır.',
        'Chance: <b>' + pct(c.p) + '</b>. No charge if refused. ' + PACT_TURNS + ' turns without attacks (active ' + pactCount() + '/' + PACT_MAX + '). Breaking it early: relations −30, trust −15 and the target may retaliate.') + '</p>' +
      '<p>' + WCPay.costLine() + '</p>' + WCPay.rows('v138PactGo') + gold218('pact', c.p) + '<button class="big" onclick="v138Sheet()">‹ ' + X('Geri', 'Back') + '</button></div>');
  }
  window.v138PactGo = function (how) {
    if (!canAct()) { closeMod(); return; } var e = selE(); if (!e) { closeMod(); return; } var c = chPact(e); if (!c.p) { closeMod(); return; }
    G.pactNo24 = G.pactNo24 || {}; var rec = G.pactNo24[e], tn = turn();
    if (rec && rec.t === tn) { closeMod(); say('🚫 ' + nm(e) + ' — ' + X('bu tur tekrar deneyemezsin', 'cannot retry this turn')); return; }
    dx220(); if (Math.random() >= Math.min(.98, c.p + hid220())) {
      G.pactNo24[e] = { t: tn }; addRel(e, -1); save2(); closeMod();
      say('🚫 ' + nm(e) + ' — ' + X('şimdilik pakt istemedi (ücret alınmadı)', 'declined for now (no charge)')); try { render(); } catch (x) { } return;
    }
    closeMod(); setCost(pactCost()); POST = null;
    WCPay.spend(how, function () {
      if (!canAct() || pactLeft(e) > 0) return;
      G.pacts = G.pacts || {}; G.pacts[key(G.pl, e)] = tn + PACT_TURNS + 1; addRel(e, 8); G.sel = null; save2(); try { render(); } catch (x) { }
      try { if (window.v23Fx) v23Fx('pact', e); } catch (x) { } say('🤝 ' + nm(e) + ' — ' + X('saldırmazlık paktı imzalandı', 'pact signed'));
    });
  };
  /* V218: diplomasi isteklerinde ayrı bir "Kesin Anlaşma" baloncuğu: altınla öde, %100 kabul (zar ve şans yok).
     Fiyat kabul şansı düştükçe artar. Altın: Gold (v18.js). */
  function goldPrice(kind, p) { p = Math.max(0, Math.min(1, p || 0)); return kind === 'friend' ? Math.round(30 + (1 - p) * 120) : Math.round(20 + (1 - p) * 80); }
  function gold218(kind, p) {
    var n = goldPrice(kind, p), have = 0; try { have = Gold.get(); } catch (x) { }
    var ok = have >= n;
    return '<div class="g218"><div class="g218i">🪙</div><div class="g218t"><b>' + X('Kesin Anlaşma', 'Guaranteed Deal') + ' <i>%100</i></b>' +
      '<small>' + X('Altınla öde · zar ve şans gerekmez · altının: ', 'Pay in gold · no dice, no luck · your gold: ') + '<b>' + have + '</b></small></div>' +
      '<button class="g218b" ' + (ok ? 'onclick="v218Gold(\'' + kind + '\')"' : 'disabled') + '>' + n + ' ' + X('altın', 'gold') + '</button></div>';
  }
  window.v218Gold = function (kind) {
    try {
      if (!canAct()) { closeMod(); return; } var e = selE(); if (!e) { closeMod(); return; }
      var c = kind === 'friend' ? chFriend(e) : chPact(e); if (!c.p) { closeMod(); return; }
      var n = goldPrice(kind, c.p);
      if (!window.Gold || !Gold.spend(n, 'dip218-' + kind)) { say('🪙 ' + X('Yeterli altının yok', 'Not enough gold')); return; }
      closeMod();
      if (kind === 'friend') { friendRun(e, 'gold218'); return; }
      var tn = turn(); G.pacts = G.pacts || {}; G.pacts[key(G.pl, e)] = tn + PACT_TURNS + 1; addRel(e, 8); G.sel = null; save2(); try { render(); } catch (x) { }
      try { if (window.v23Fx) v23Fx('pact', e); } catch (x) { } say('🤝 ' + nm(e) + ' — ' + X('saldırmazlık paktı imzalandı', 'pact signed'));
    } catch (x) { console.error(x); }
  };
  window.v138BreakAsk = function () {
    if (!canAct()) return; var e = selE(); if (!e || pactLeft(e) <= 0) return;
    modal('<h3>✂ ' + X('Paktı Boz', 'Break Pact') + '</h3><p style="color:var(--tx2)">' + X('<b>' + esc(nm(e)) + '</b> ile paktı bozarsan: ilişki <b>−30</b>, güven <b>−15</b>, itibar artar ve ' + esc(nm(e)) + ' sonraki tur intikam için saldırabilir.', 'Breaking the pact with <b>' + esc(nm(e)) + '</b>: relations <b>−30</b>, trust <b>−15</b>, reputation worsens, and it may retaliate next turn.') + '</p>' +
      '<button class="big pri" onclick="v138BreakDo()">✂ ' + X('Paktı Boz', 'Break Pact') + '</button><button class="big" onclick="v138Sheet()">‹ ' + X('Vazgeç', 'Cancel') + '</button>');
  };
  window.v138BreakDo = function () {
    if (!canAct()) return; var e = selE(); if (!e || pactLeft(e) <= 0) { closeMod(); return; } var d = D2();
    delete G.pacts[key(G.pl, e)]; addRel(e, -30); d.trust = Math.max(0, d.trust - 15); d.agg += 1; D().rev[e] = turn() + 1;
    save2(); closeMod(); try { render(); } catch (x) { } say('✂ ' + nm(e) + ' — ' + X('pakt bozuldu', 'pact broken'));
  };
  /* ---- İttifaktan çıkış ---- */
  var _leave0 = null;
  window.v138LeaveDo = function () {
    if (!on()) { closeMod(); return; } var mem = allyList(), early = myCoLeft() > 2; closeMod();
    if (_leave0) _leave0();
    if (early) { D2().trust = Math.max(0, D2().trust - 5); mem.forEach(function (a) { addRel(a, -10); }); }
    save2(); try { render(); } catch (x) { }
  };
  function leaveAsk() {
    if (!on()) { if (_leave0) _leave0(); return; } if (coIdx(G.pl) < 0) return; var early = myCoLeft() > 2;
    modal('<h3>🚪 ' + X('İttifaktan Çık', 'Leave Alliance') + '</h3><p style="color:var(--tx2)">' + (early ? X('Süre dolmadan çıkarsan güven <b>−5</b>, üyelerle ilişki <b>−10</b> olur.', 'Leaving early: trust <b>−5</b>, relations with members <b>−10</b>.') : X('İttifak bitmek üzere; cezasız çıkabilirsin.', 'The alliance is about to end; you can leave without penalty.')) + '</p>' +
      '<button class="big pri" onclick="v138LeaveDo()">🚪 ' + X('Çık', 'Leave') + '</button><button class="big" onclick="closeMod()">' + X('Vazgeç', 'Cancel') + '</button>');
  }

  /* ---- Elçi / balon / giriş noktaları ---- */
  var _envoy0 = null;
  function envoyEntry() {
    if (!on()) return _envoy0 && _envoy0.apply(this, arguments);
    if (!canAct()) return; var e = selE(); if (!e) return;
    if (relOf(e) <= ENVOY_BLOCK_REL) {
      modal('<h3>🕊 ' + X('Elçi Kabul Edilmedi', 'Envoy Turned Away') + '</h3><div class="d38-hd">' + fl(G.pl) + '<span>⇄</span>' + fl(e) + '</div>' + relBar(relOf(e)) + why(e) +
        '<p style="color:var(--tx2)">' + X('<b>' + esc(nm(e)) + '</b> seninle görüşmeyi reddediyor. İlişkiler iyileşene kadar (zamanla düzelir) elçi gönderemezsin.', '<b>' + esc(nm(e)) + '</b> refuses to talk. Relations must recover (they slowly do) before envoys are received.') + '</p><button class="big" onclick="closeMod()">' + X('Tamam', 'OK') + '</button>');
      return;
    }
    sheet(e);
  }
  function bubbleEntry(ev) {
    if (!on()) return; if (ev && ev.stopPropagation) ev.stopPropagation();
    var b = document.getElementById('wdbub'); if (b) b.remove(); envoyEntry();
  }

  /* ---- Diplomasi Merkezi ---- */
  function listRows(qs) {
    /* V218: listede YALNIZCA işlem yapılabilecek ülkeler = şu an saldırı menzilinde olanlar (oyunun targets() kuralı: kara komşusu,
       kara komşusu yoksa deniz yolu). Arama kutusu kaldırıldı; uzak ülkeler listelenmez. */
    var rs = {}; try { var tg = targets(G.pl, G.owner); for (var k in tg) { var o = G.owner[k]; if (typeof o === 'string' && o !== G.pl && ownedN(o) > 0 && M[o]) rs[o] = (tg[k] === 'land' || rs[o] === 'land') ? 'land' : 'sea'; } } catch (x) { }
    var arr = Object.keys(rs);
    arr.sort(function (a, b) { return (allied(b) - allied(a)) || relOf(b) - relOf(a); });
    if (!arr.length) return '<div class="d38-empty">' + X('Menzilinde ülke yok.', 'No country in reach.') + '</div>';
    return arr.map(function (e) { return countryRow(e, rs[e]); }).join('');
  }
  function countryRow(e, via) {
    var r = relOf(e), i = relInfo(r), pl = pactLeft(e), sub = allied(e) ? '🤝 ' + X('Müttefik', 'Ally') : pl ? '🛡 ' + X('Pakt · ' + pl + ' tur', 'Pact · ' + pl + ' t') : (via === 'sea' ? '⚓ ' + X('Deniz yolu', 'By sea') : '⛰ ' + X('Kara komşusu', 'Land border'));
    return '<button class="d38-c" onclick="v138Go(\'' + e + '\')">' + fl(e) + '<span class="d38-cn"><b>' + esc(nm(e)) + '</b><small>' + sub + '</small></span><span class="d38-badge" style="--c:' + i.c + '">' + i.n + ' <i>' + (r > 0 ? '+' : '') + r + '</i></span></button>';
  }
  function activeDeals() {
    var o = [], tn = turn();
    allyList().forEach(function (e) { o.push({ e: e, t: '🤝 ' + X('İttifak', 'Alliance'), l: myCoLeft() }); });
    for (var k in (G.pacts || {})) { if (!(G.pacts[k] > tn)) continue; var p = k.split('|'); if (p.indexOf(G.pl) < 0) continue; o.push({ e: p[0] === G.pl ? p[1] : p[0], t: '🛡 ' + X('Pakt', 'Pact'), l: G.pacts[k] - tn }); }
    for (var g in (G.guard23 || {})) if (G.guard23[g] >= tn && ownedN(g) > 0) o.push({ e: g, t: '🛡 ' + X('Garanti', 'Guarantee'), l: G.guard23[g] - tn + 1 });
    for (var q in (G.prot55 || {})) if (G.prot55[q] >= tn && ownedN(q) > 0) o.push({ e: q, t: '🤲 ' + X('Koruma', 'Protection'), l: G.prot55[q] - tn + 1 });
    if (!o.length) return '<div class="d38-empty">' + X('Aktif anlaşma yok. Bir ülke seçip İttifak ya da Saldırmazlık dene.', 'No active deals. Pick a country and try an alliance or pact.') + '</div>';
    return o.map(function (x) { return '<button class="d38-c" onclick="v138Go(\'' + x.e + '\')">' + fl(x.e) + '<span class="d38-cn"><b>' + esc(nm(x.e)) + '</b><small>' + x.t + '</small></span><span class="d38-badge" style="--c:#c9c2a0">' + x.l + X(' tur', ' t') + '</span></button>'; }).join('');
  }
  function openHub() {
    if (!canAct()) { say(X('Şu an diplomasi yapılamaz', 'Diplomacy is not available now')); return; }
    var inc = peaceIncome(), d = D2();
    /* V218: düzen — başlık şeridi + iki sütun (sol: durum, gelir, aktif anlaşmalar, kurallar · sağ: menzildeki ülkeler). Dar ekranda alt alta. */
    modal('<div class="d38 d218"><div class="d218h"><h3>🕊 ' + X('Diplomasi', 'Diplomacy') + '</h3><button class="d218x" onclick="closeMod()" aria-label="close">✕</button></div><div class="d218c"><div class="d218l">' +
      '<div class="d38-stats"><span>🎲 <b>' + ((G.T && G.T.moves) || 0) + '</b></span><span>🤝 ' + X('Güven', 'Trust') + ' <b>' + trustInfo() + '</b></span><span>⚔ ' + X('İtibar', 'Rep.') + ' <b>' + aggInfo() + '</b></span></div>' +
      '<div class="d38-inc">' + (inc > 0 ? '🪙 ' + X('Barış geliri: ', 'Peace income: ') + '<b>+' + (Math.round(inc * 100) / 100) + '</b>' + X(' / tur', ' / turn') : (d.agg >= PEACE_AGG_MAX ? '⚠ ' + X('Saldırgan itibarın barış gelirini kesti', 'Your aggressive reputation cut the peace income') : X('Pakt ve ittifaklar tur başına gelir getirir', 'Pacts and alliances bring income each turn'))) + '</div>' +
      '<div class="d38-sec">' + X('Aktif anlaşmalar', 'Active deals') + '</div>' + activeDeals() +
      '<details class="d38-rules"><summary>' + X('Kurallar', 'Rules') + '</summary><ul>' +
      '<li>' + X('<b>İlişki</b> −100…+100: ittifak/pakt/yardım artırır; savaş, haraç, kışkırtma düşürür; zamanla sıfıra yaklaşır.', '<b>Relations</b> −100…+100: alliances/pacts/help raise; war, tribute and incitement lower; they drift to zero.') + '</li>' +
      '<li>' + X('<b>İttifak</b>: ilişki en az Nötr ve güven ≥ 30; ' + ALLY_TURNS + ' tur; en çok ' + MAXCO + ' devlet. Süre dolunca cezasız biter, erken çıkış güveni düşürür.', '<b>Alliance</b>: relations at least Neutral, trust ≥ 30; ' + ALLY_TURNS + ' turns; max ' + MAXCO + ' states. Expiry is free; leaving early costs trust.') + '</li>' +
      '<li>' + X('<b>İhanet</b>: müttefike saldırırsan o savaşta 2 kat güçlü olur; güven −25, ilişki −40, herkesle −4.', '<b>Betrayal</b>: attacking an ally makes it 2x stronger in that war; trust −25, relations −40, −4 with everyone.') + '</li>' +
      '<li>' + X('<b>Pakt</b>: ' + PACT_TURNS + ' tur, en çok ' + PACT_MAX + ' aktif. Bozmak ilişkiyi −30, güveni −15 yapar. Güçlü YZ da zayıf partneri bırakabilir.', '<b>Pact</b>: ' + PACT_TURNS + ' turns, max ' + PACT_MAX + ' active. Breaking costs relations −30, trust −15. A strong AI may drop a weak partner too.') + '</li>' +
      '<li>' + X('<b>İtibar</b>: her saldırı artırır, zamanla düşer. Yüksekken barış geliri kesilir, teklifler zorlaşır.', '<b>Reputation</b>: every attack raises it, it fades over time. When high, peace income stops and offers get harder.') + '</li></ul></details></div>' +
      '<div class="d218r"><div class="d38-sec">' + X('Menzilindeki ülkeler', 'Countries in reach') + '</div><div class="d38-list" id="d38l">' + listRows() + '</div></div></div></div>');
  }
  window.v138Filter = function (v) { var l = document.getElementById('d38l'); if (l && on()) l.innerHTML = listRows(v); };
  window.v138Go = function (e) {
    if (!canAct()) { closeMod(); return; } var id = regionOf(e); if (!id) return; closeMod(); pickC(id);
    setTimeout(function () { try { sheet(e); } catch (x) { console.error(x); } }, 80);
  };

  /* ================= KURULUM ================= */
  var _origHubOpen = null, _origBubble = null, _origFriend = null, _origNap = null, _origPact = null;
  function rebindHubBtn() {
    var b = document.getElementById('wdhub'); if (!b || b.__v138) return;
    var nb = b.cloneNode(true); nb.__v138 = 1; b.parentNode.replaceChild(nb, b);
    nb.addEventListener('click', function (ev) { ev.stopPropagation(); if (on()) openHub(); else if (_origHubOpen) _origHubOpen(); });
  }
  var installed = false;
  function install() {
    if (!installed) {
      if (typeof window.v23Envoy !== 'function' || typeof window.wcdBubble !== 'function' || !window.WCD || !window.WCPay) return false;
      installed = true;
      patchPay();
      _envoy0 = window.v23Envoy; _origBubble = window.wcdBubble; _origFriend = window.wcdFriend; _origNap = window.wcdNap; _origPact = window.v20Pact; _origHubOpen = window.wdhOpen; _leave0 = window.wcdLeave;
      window.v23Envoy = function () { return on() ? envoyEntry() : _envoy0.apply(this, arguments); };
      window.wcdBubble = function (ev) { return on() ? bubbleEntry(ev) : _origBubble.apply(this, arguments); };
      window.wcdFriend = function () { return on() ? friendModal() : _origFriend.apply(this, arguments); };
      window.wcdNap = function () { return on() ? pactModal() : _origNap.apply(this, arguments); };
      window.v20Pact = function () { return on() ? pactModal() : _origPact.apply(this, arguments); };
      window.wcdLeave = function () { return on() ? leaveAsk() : _leave0.apply(this, arguments); };
      window.wdhOpen = function () { return on() ? openHub() : _origHubOpen && _origHubOpen.apply(this, arguments); };
      /* eski elçi alt ekranlarının bedeli + sonuç etkileri */
      wrapCost('v23Guard', COSTS.guard); wrapCost('v55GuardJoint', COSTS.prot); wrapCost('v23Incite2', COSTS.incite);
      wrapCost('v23GuardPay', COSTS.guard, function () { var e = selE(); return function () { if (e) addRel(e, 5); }; });
      wrapCost('v55GuardJointPay', COSTS.prot, function () { var e = selE(); return function () { if (e) addRel(e, 5); }; });
      wrapCost('v23InciteGo', COSTS.incite, function () {
        return function () {
          var tgts = []; try { for (var k in G.inc23) { var q = G.inc23[k].until === turn() ? k.split('>') : null; if (q) tgts.push(q); } } catch (e) { }
          if (tgts.length && Math.random() < .25) { var y = tgts[tgts.length - 1][1]; if (y && y !== G.pl) { addRel(y, -15); say('🕵 ' + nm(y) + ' — ' + X('kışkırtmanın arkasında seni gördü', 'saw you behind the incitement')); } }
        };
      });
      wrapCost('wcdTribute', COSTS.tribute);
      wrapCost('wcdTributeGo', COSTS.tribute, function () { var e = selE(); return function () { if (e) { addRel(e, -8); D2().agg += .5; } }; });
    }
    hookWar(); installStart(); hookGuard();
    return !!(WCD.war && WCD.war.v138 && V5.start && V5.start.v138 && V5.attack && V5.attack.__g138);
  }
  var _rn = render;
  render = function () { var x = _rn.apply(this, arguments); try { install(); document.body.classList.toggle('d38on', on()); if (on()) { rebindHubBtn(); setTimeout(maybeOffer, 500); } } catch (e) { } return x; };
  try { install(); } catch (e) { console.error(e); } window.addEventListener('load', function () { try { install(); } catch (e) { } });
  var n = 0, iv = setInterval(function () { try { if (install() || ++n > 60) clearInterval(iv); } catch (e) { if (++n > 60) clearInterval(iv); } }, 250);
  window.V138 = { relOf: relOf, relParts: relParts, chFriend: chFriend, chPact: chPact, trust: function () { return D2().trust; }, agg: function () { return D2().agg; }, COSTS: COSTS, open: openHub };
})();
