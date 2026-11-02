/* V20 — Akıllı yapay zekâ turu: zar kadar hamle; keşif / diplomasi / politika / güvenli saldırı + küçük animasyonlar.
   v5.js içindeki tek-saldırılık aiTurn yerine geçer (v5End -> V20.run, closeBattle -> V20.after). */
(function () {
  'use strict';
  function T(tr, en) { return L == 'tr' ? tr : en; }
  function is5() { return !!G && G.v5 === 1; }
  function nm(e) { return (M[e] && M[e].name) || e; }
  function sum(a) { var s = 0; for (var i = 0; i < 5; i++) s += (+a[i] || 0); return s; }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function rmOn() { return !!(window.SET && (SET.rm || !SET.spd)); }
  var AI_GROW_MUL = 1.18, AI_GROW_ADD = 1.1;   // V73: yapay zekâ her gelişimde en zayıf değerini x1.12 + .7 artırır (eskiden x1.08 + .5 yazılıydı ama kaydedilmiyordu)
  /* V116: Rank maçında YZ rakibin seviyesi (0 = en kolay … 1 = eski tam güç). ranked.js her bot maçında window.WC_BOTLV'yi oyuncunun puanına göre ayarlar.
     Yalnızca botun ülkesini (G.mp.guest) etkiler: saldırganlık, karar hatası (rastgelelik) ve gelişim hızı. */
  function botLv(e) { try { if (G && G.mp && G.mp.bot && e === G.mp.guest && typeof window.WC_BOTLV === 'number') return window.WC_BOTLV; } catch (x) { } return null; }
  var THREAT_W = 1.1;   // V73: tehdit ağırlığı (0 = eskisi gibi tamamen rastgele; .4 = en tehlikeli rakip ~%49 / eskiden ~%17; 1+ = neredeyse hep o)
  var AI_TURNS = 2;   // <<< oyuncudan sonra kaç ülke oynasın (ayar). V68: 2 → 1 (tur başına tek rakip = tek zar; eskiden iki rakip arka arkaya zar atıyordu)
  var SEQ = null, QUEUE = [], QI = 0, SN = ['Nüfus', 'Ordu Gücü', 'Ekonomi', 'Teknoloji', 'Diplomasi'], SNE = ['Population', 'Army', 'Economy', 'Technology', 'Diplomacy'];
  var POLN = [['Nüfus Programı', 'Population Program'], ['Askeri Reform', 'Military Reform'], ['Ekonomik Teşvik', 'Economic Stimulus'], ['Ar-Ge Atılımı', 'R&D Breakthrough'], ['Diplomatik Atılım', 'Diplomatic Push']];

  // ---- bilgi (keşif) ve paktlar ----
  function known(ai, e) { return !!(G.aik && G.aik[ai] && G.aik[ai][e]); }
  function estStats(ai, e) {      // bilinmeyen ülkenin gücü ±%25 belirsiz tahmin edilir; keşif gerçek değeri verir
    var s = st(e).slice(); if (e === ai || known(ai, e)) return s;
    var f = 1 + (H(ai + '~' + e) - .5) * .5; return s.map(function (v) { return v * f; });
  }
  function key(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function pacted(a, b) { return !!(G.pacts && G.pacts[key(a, b)] > (G.T ? G.T.turn : 0)); }
  function wpEst(ai, de) {
    var A = st(ai), D = estStats(ai, de), bA = !!G.rv[ai + '>' + de], bD = !!G.rv[de + '>' + ai], w = 0, x, y;
    try { if (window.WCD && WCD.side) {   // V47: müttefik değerleri hesaba katılır
      var sa = WCD.side(ai, de).s, sd = WCD.side(de, ai).s, dd = st(de), k;
      A = sa; D = D.map(function (v, i) { return v + (sd[i] - dd[i]); });
    } } catch (e) { }
    for (x = 1; x <= 6; x++) for (y = 1; y <= 6; y++) if (battle(A, D, x, y, bA, bD).win) w++;
    return w / 36;
  }

  // ---- planlama ----
  function plan(ai) {
    var myArr = st(ai), myP = sum(myArr), TGs = targets(ai, G.owner), by = {}, maxV = 1, own = ownedN(ai), i, BL = botLv(ai);
    Object.keys(TGs).forEach(function (tg) {
      var de = G.owner[tg]; if (de === ai || !M[tg] || de === undefined) return;
      var b = BASE[tg] || [0, 0, 0, 0, 0], v = (+b[0] || 0) + (+b[2] || 0); if (v > maxV) maxV = v;
      var nb = M[tg].nb, mine = 0; nb.forEach(function (x) { if (G.owner[x] === ai) mine++; });
      var sc = mine / Math.max(1, nb.length);
      if (!by[de] || v + sc * 20 > by[de].v + by[de].mine * 20) by[de] = { de: de, tg: tg, v: v, mine: sc };
    });
    var list = Object.keys(by).map(function (k) { return by[k]; }), opts = [], threat = null, tmax = 0;
    list.forEach(function (c) {
      var eP = sum(estStats(ai, c.de));
      c.known = known(ai, c.de); c.wp = wpEst(ai, c.de); c.ratio = eP / Math.max(1, myP); c.pact = pacted(ai, c.de);
      if (c.ratio > 1.25 && !c.pact && eP > tmax) { tmax = eP; threat = c; }
    });
    try { if (window.WCD && WCD.rev(ai)) { var rc = null; list.forEach(function (c) { if (c.de === G.pl) rc = c; }); if (rc) { WCD.clear(ai); return { type: 'attack', c: rc, sc: 9 }; } } } catch (x) { }
    var anyGood = false;
    list.forEach(function (c) {
      if (c.pact) return;
      var need = own <= 1 ? .6 : .46;   // V89: daha cesur (eski .72/.58)
      if (c.ratio <= (c.de === G.pl ? 1.6 : 1.3) && c.wp >= need) {   // V89: oyuncuya karşı daha atak (eski 1.15)
        if (!c.known && c.wp < .82 && !SEQ.scouted[c.de]) {
          opts.push({ type: 'scout', c: c, sc: .62 + .2 * c.wp });
        } else {
          anyGood = true;
          opts.push({ type: 'attack', c: c, sc: .5 * c.wp + .2 * (c.v / maxV) + .15 * c.mine + .15 * (1 - Math.min(1, c.ratio)) + .12 + (c.de === G.pl ? (G.mp && G.mp.bot ? (BL == null ? .55 : .15 + .4 * BL) : .18) : 0) });   // V89: oyuncu öncelikli hedef
        }
      } else if (!c.known && !SEQ.scouted[c.de] && c.ratio < 1.6 && c.wp >= .3) {
        opts.push({ type: 'scout', c: c, sc: .45 });   // bilgi eksik, hedef değerlendirilmek isteniyor
      }
    });
    // diplomasi: güçlü komşu varsa (yapay zekâ ise) pakt, değilse dengeli komşuyla dostluk
    var dip = null;
    if (threat && threat.de !== G.pl && !SEQ.nop[threat.de]) dip = { c: threat, sc: .86 + (own <= 1 ? .1 : 0) };
    else if (!anyGood) {
      list.forEach(function (c) { if (!c.pact && c.de !== G.pl && !SEQ.nop[c.de] && c.ratio > .7 && c.ratio < 1.4 && (!dip || c.ratio > dip.c.ratio)) dip = { c: c, sc: .5 }; });
    }
    if (dip) opts.push({ type: 'dip', c: dip.c, sc: dip.sc });
    var avg = 0, n = 0; aliveEmp().forEach(function (e) { avg += sum(st(e)); n++; }); avg /= Math.max(1, n);
    var dv = .3 + (list.length ? 0 : .3) + (threat && threat.de === G.pl ? .5 : 0) + (myP < avg ? .1 : 0) - .15 * (SEQ.dev || 0);
    opts.push({ type: 'dev', sc: dv, threat: threat });
    try {   // V23: kışkırtma / koruma önyargıları (G.inc23['kaynak>hedef'] = {until, m, add})
      var tn = G.T ? G.T.turn : 0, I23 = G.inc23 || {};
      Object.keys(I23).forEach(function (k) {
        var pr = k.split('>'), bb = I23[k]; if (pr[0] !== ai || !bb || bb.until < tn) return;
        var cc = null; list.forEach(function (c) { if (c.de === pr[1]) cc = c; }); if (!cc || cc.pact) return;
        var ex = null; opts.forEach(function (o) { if (o.type == 'attack' && o.c.de === pr[1]) ex = o; });
        if (ex) { ex.sc = ex.sc * (bb.m || 1) + (bb.add || 0); }
        else opts.push({ type: 'attack', c: cc, sc: (.3 + .3 * cc.wp) * (bb.m || 1) + (bb.add || 0) });
      });
    } catch (x) { }
    opts.forEach(function (o) { o.sc += Math.random() * (BL == null ? .08 : .08 + .55 * (1 - BL) * (1 - BL)); });
    opts.sort(function (a, b) { return b.sc - a.sc; });
    return opts[0];
  }

  // ---- animasyon kartı ----
  function card(a, b, icon, cls, text, after) {
    var old = document.getElementById('ai20'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'ai20'; d.className = 'ai20 ' + cls + (rmOn() ? ' rm' : '');
    d.innerHTML = '<div class="ai20-row"><span class="ai20-f l">' + fimg(a, 'sm') + '</span><span class="ai20-ic">' + icon + '</span>' +
      (b ? '<span class="ai20-f r">' + fimg(b, 'sm') + '</span>' : '') + '</div><div class="ai20-tx">' + text + '</div>' +
      '<div class="ai20-mv">' + T('Hamle ', 'Move ') + (SEQ.n - SEQ.left) + '/' + SEQ.n + '</div>';
    document.body.appendChild(d);
    var ms = rmOn() ? 500 : 1900, fired = false, tm;
    function go() { if (fired) return; fired = true; clearTimeout(tm); var e = document.getElementById('ai20'); if (e === d) e.remove(); try { after && after(); } catch (e2) { console.error(e2); } }
    d.style.pointerEvents = 'auto'; d.style.cursor = 'pointer'; d.addEventListener('click', go);   // V26: karta dokununca rakip hamle animasyonu atlanır
    tm = setTimeout(go, ms);
  }
  function flash(tg) { try { if (rmOn()) return; FLASH = tg; overlay(); setTimeout(function () { FLASH = null; if (G) overlay(); }, 1500); } catch (e) { } }

  // ---- zar penceresi ----
  function rollModal(title, sub, val, after) {
    modal('<h3>' + title + '</h3><div style="text-align:center;padding:10px">' + die3d('v20d', '') + '</div><div id="v20r" style="text-align:center;min-height:70px;color:var(--tx2)">' + T('Zar atılıyor…', 'Rolling…') + '</div>');
    var fin = false, gone = false, tm = 0;
    function leave() { if (gone) return; gone = true; clearTimeout(tm); var bx = $('box'); if (bx) bx.onclick = null; closeMod(); after(); }
    function done() { if (fin) return; fin = true; setDie3('v20d', val); var r = $('v20r'); if (r) r.innerHTML = '<div class="big2">' + val + '</div>' + sub; tm = setTimeout(leave, rmOn() ? 300 : 1000); }
    // V26: zara / pencereye dokununca animasyon atlanır (1. dokunuş sonucu gösterir, 2. dokunuş hemen devam ettirir)
    var bx0 = $('box'); if (bx0) bx0.onclick = function () { if (!fin) { done(); clearTimeout(tm); tm = setTimeout(leave, 350); } else leave(); };
    var hint = $('v20r'); if (hint) hint.innerHTML += '<div style="font-size:12px;opacity:.55;margin-top:6px">' + T('Geçmek için dokun', 'Tap to skip') + '</div>';
    AU.play('dice'); if (rmOn()) done(); else rollDie('v20d', val, 1200, 1, done);
  }

  // ---- haraç: son toprağımızı almak üzere olan ülke altın ister ----
  var TR = null;
  function tributeAmt(ai) { var bal = Gold.get(), base = Math.max(20, Math.min(80, Math.round(15 + sum(st(ai)) / 10))); return Math.max(base, Math.round(bal * .4)); }
  function tribute(ai, c) {
    var amt = TR ? TR.amt : tributeAmt(ai), bal = Gold.get(), can = bal >= amt; TR = { ai: ai, c: c, amt: amt };
    modal('<h3>👑 ' + T('Haraç Talebi', 'Tribute Demand') + '</h3><div style="text-align:center;margin:8px 0">' + fimg(ai, 'sm') + ' ⚔ ' + fimg(G.pl, 'sm') + '</div>' +
      '<p style="color:var(--tx2)">' + T('<b>' + nm(ai) + '</b>, son toprağın <b>' + nm(c.tg) + '</b> ülkesini almak üzere. Saldırıdan vazgeçmesi için <b>' + amt + ' 🪙</b> haraç istiyor (ödersen 6 tur saldırmaz).',
        '<b>' + nm(ai) + '</b> is about to take your last land, <b>' + nm(c.tg) + '</b>. It demands <b>' + amt + ' 🪙</b> tribute to hold back (pays for a 6-turn pact).') + '<br>' + T('Bakiyen: ', 'Balance: ') + '<b>' + bal + ' 🪙</b></p>' +
      (can ? '<button class="big pri" onclick="v20Tribute(1)">🪙 ' + T('Haracı öde', 'Pay tribute') + ' (' + amt + ')</button>' :
        '<p style="color:var(--bad)">' + T('Yeterli altının yok.', 'Not enough gold.') + '</p><button class="big" onclick="Shop.open()">🛒 ' + T('Dükkan', 'Shop') + '</button>') +
      '<button class="big" onclick="v20Tribute(0)">⚔ ' + T('Reddet — savaşı göze al (kaybedersen oyun biter)', 'Refuse — fight (lose and the game ends)') + '</button>');
  }
  window.v20Tribute = function (pay) {
    if (!TR || !is5() || G.ph != 'v5ai') return;
    var t0 = TR;
    if (pay) {
      if (!Gold.spend(t0.amt, 'tribute')) { toast(T('Yeterli altının yok', 'Not enough gold')); return; }
      G.pacts = G.pacts || {}; G.pacts[key(t0.ai, G.pl)] = (G.T.turn || 0) + 7;
      TR = null; closeMod(); try { save(); } catch (e) { } toast('👑 ' + nm(t0.ai) + ' — ' + T('haraç ödendi, saldırıdan vazgeçti', 'tribute paid, attack called off'));
      setTimeout(step, 600);
    } else {
      TR = null; closeMod();
      if (!window.V5.attack(t0.ai, t0.c.tg, true)) step();
    }
  };

  // ---- akış ----
  function pickActors(n) {
    var al = aliveEmp().filter(function (e) { return e !== G.pl && ownedN(e) > 0 && !(G.mp && (e === G.mp.host || e === G.mp.guest)); }), sc = [];
    al.forEach(function (e) {
      var T0 = Object.keys(targets(e, G.owner)); if (!T0.length) return;
      var pri = 0; try { var I = G.inc23 || {}, tn0 = G.T ? G.T.turn : 0; for (var kk in I) if (kk.split('>')[0] === e && I[kk].until >= tn0) pri = 2; } catch (x) { }
      try { if (window.WCD && WCD.rev(e)) pri = 5; } catch (x) { }
      /* V73: oyuncunun işini zorlaştıracak rakiplerin sıra alma ihtimali artar (yine de rastgele; garanti değil).
         Tehdit = oyuncunun topraklarına saldırabilmesi + oyuncuya göre güçlü olması + oyuncudan intikam derdi olması. */
      var thr = 0; try {
        var atk = 0; T0.forEach(function (k) { if (G.owner[k] === G.pl) atk++; });
        if (atk > 0) {
          var ratio = sum(st(e)) / Math.max(1, sum(st(G.pl)));
          thr = .25 + .05 * Math.min(4, atk) + .4 * Math.max(0, Math.min(1, (ratio - .6) / 1.2)) + (G.rv && G.rv[e + '>' + G.pl] ? .15 : 0);
        }
      } catch (x) { }
      sc.push({ e: e, s: Math.random() + pri + THREAT_W * thr / .85 });
    });
    sc.sort(function (a, b) { return b.s - a.s; });
    return sc.slice(0, n).map(function (x) { return x.e; });
  }
  var _pickA114 = pickActors;   // V114: rank maçında YZ rakip (bot) sırası geldiğinde botu da oyuncu sırasına koyar
  pickActors = function (n) { var q = _pickA114(n); try { if (window.WCRank && WCRank.botTurnNow()) q = [G.mp.guest].concat(q.filter(function (x) { return x !== G.mp.guest; })); } catch (e) { } return q; };
  function run() {
    if (!is5() || G.ph != 'v5ai' || G.aiBusy) return;
    G.aiBusy = 1; SEQ = null; QUEUE = pickActors(G.mp && !G.mp.coop ? 1 : AI_TURNS); QI = 0;   // V104: online karşılıklı: oyuncu 1 → 1 YZ ülkesi → oyuncu 2 → 1 YZ ülkesi
    nextActor();
  }
  function nextActor() {
    if (!is5() || !G || G.ph != 'v5ai') { SEQ = null; return; }
    var ai = null;
    while (QI < QUEUE.length && !ai) { var c = QUEUE[QI++]; if (ownedN(c) > 0) ai = c; }
    if (!ai) { SEQ = null; G.aiBusy = 0; if (QUEUE.length == 0) toast(T('Rakip hamle yapamadı', 'The rival could not act')); if (!G.over) { save(); window.V5.start(); } return; }
    /* V68: rakibin tur zarı TEK zardır; yalnızca 6 gelirse aynı zar yeniden atılır (toplam hamle hakkı; en çok 3 atış) */
    var rolls = [d6()];   /* V80: tur zarında 6 gelince tekrar atma YOK; bu kural yalnızca savaş panelindeki zarlar içindir (d6b/d6c) */
    var roll = rolls.reduce(function (p, q) { return p + q; }, 0);
    try { if (window.v24CamTo) v24CamTo(ai); } catch (e) { }   // V24: kamera rakibe gider (kilitlemez)
    var ttl = T('Rakip ', 'Rival ') + (QUEUE.length > 1 ? QI + '/' + QUEUE.length + ': ' : '') + nm(ai);
    function subTxt(i) {
      if (i < rolls.length - 1) return T('<b>6</b> geldi — zarı tekrar atıyor!', '<b>6</b> — rolls the die again!');
      return T('Bu tur <b>' + roll + '</b> hamle yapacak.', 'Will make <b>' + roll + '</b> move(s).') + (rolls.length > 1 ? '<br><small>' + rolls.join(' + ') + ' = ' + roll + '</small>' : '');
    }
    function rollAt(i) {
      rollModal(ttl, subTxt(i), rolls[i], function () {
        if (!is5() || G.ph != 'v5ai') return;
        if (i + 1 < rolls.length) { rollAt(i + 1); return; }
        SEQ = { ai: ai, left: roll, n: roll, scouted: {}, dev: 0, nop: {} }; step();
      });
    }
    rollAt(0);
  }
  function finish() { SEQ = null; if (!G || G.over) return; nextActor(); }
  function step() {
    if (!is5() || !G || G.ph != 'v5ai' || !SEQ) { SEQ = null; return; }
    var ai = SEQ.ai;
    if (SEQ.left <= 0 || ownedN(ai) === 0) return finish();
    var a = plan(ai); SEQ.left--;
    if (a.type == 'scout') {
      var c = a.c; SEQ.scouted[c.de] = 1; G.aik = G.aik || {}; G.aik[ai] = G.aik[ai] || {}; G.aik[ai][c.de] = 1;
      flash(c.tg);
      card(ai, c.de, '🔍', 'scout', nm(ai) + T(' → ' + nm(c.de) + ' keşfediliyor…', ' scouts ' + nm(c.de) + '…'), step);
    } else if (a.type == 'dip') {
      var d = a.c;
      if (window.V24 && !V24.pactOk(ai, d.de)) {   // V24: güçlü devlet güçsüzle pakt yapmayı (tampon bölge değilse) nadiren kabul eder
        SEQ.nop[d.de] = 1;
        var strongN = V24.power(ai) >= V24.power(d.de) ? ai : d.de;
        card(ai, d.de, '🚫', 'dip', nm(strongN) + T(' pakt teklifini reddetti (' + nm(ai) + ' ↔ ' + nm(d.de) + ')', ' refused the pact (' + nm(ai) + ' ↔ ' + nm(d.de) + ')'), step);
        return;
      }
      G.pacts = G.pacts || {}; G.pacts[key(ai, d.de)] = (G.T.turn || 0) + 6;
      var s = st(ai).slice(); s[4] = s[4] * 1.04 + .5; G.es = G.es || {}; G.es[ai] = s; G.ed = G.ed || {}; G.ed[ai] = 0;
      card(ai, d.de, '🤝', 'dip', nm(ai) + T(' ile ' + nm(d.de) + ' saldırmazlık paktı imzaladı (6 tur)', ' and ' + nm(d.de) + ' signed a non-aggression pact (6 turns)'), step);
    } else if (a.type == 'attack') {
      var c2 = a.c; flash(c2.tg);
      card(ai, c2.de, '⚔', 'atk', nm(ai) + T(', ' + nm(c2.de) + ' ülkesine saldırıyor!', ' attacks ' + nm(c2.de) + '!'), function () {
        if (!is5() || G.ph != 'v5ai') { SEQ = null; return; }
        var okT = targets(ai, G.owner)[c2.tg] && G.owner[c2.tg] === c2.de;
        if (!okT) { step(); return; }
        if (c2.de === G.pl && ownedN(G.pl) === 1 && window.Gold) { tribute(ai, c2); return; }   // son toprak: haraç talebi
        if (!window.V5.attack(ai, c2.tg, true)) step();
      });
    } else {
      SEQ.dev++;
      var s2 = st(ai).slice(), idx = 0, i;
      var thr = a.threat && a.threat.de === G.pl;
      if (thr) idx = 1; else for (i = 1; i < 5; i++) if (s2[i] < s2[idx]) idx = i;
      var _bl = botLv(ai), _gf = _bl == null ? 1 : .35 + .65 * _bl, before = s2[idx]; s2[idx] = s2[idx] * (1 + (AI_GROW_MUL - 1) * _gf) + AI_GROW_ADD * _gf;   // V73: gelişim hızı (üstteki AI_GROW_MUL / AI_GROW_ADD)
      /* V73 HATA DÜZELTME: V46'dan beri aşağıdaki kayıt satırı yukarıdaki // yorumunun İÇİNDE kalmıştı; yani yapay zekâ gelişimi kartta görünüyor ama
         G.es'e yazılmıyordu (hiç uygulanmıyordu). Artık gerçekten kaydedilir. */
      G.es = G.es || {}; G.es[ai] = s2; G.ed = G.ed || {}; G.ed[ai] = 0;
      var pn = POLN[idx][L == 'tr' ? 0 : 1];
      card(ai, null, '📜', 'pol', nm(ai) + ' — ' + pn + ' <b>↑</b> (' + (L == 'tr' ? SN : SNE)[idx] + ')', step);
    }
  }
  function after() {   // savaş kapandı: hamle kaldıysa diziyi sürdür
    if (!SEQ || !G || G.over || ownedN(SEQ.ai) === 0 || SEQ.left <= 0) { SEQ = null; return false; }
    G.ph = 'v5ai'; G.aiBusy = 1; setTimeout(step, 450); return true;
  }
  // ---- oyuncu için saldırmazlık paktı (altınla) ----
  var PACT_TURNS = 4;
  window.v20PactCost = function (e) { return pactCost(e); };
  window.v20Pacted = function (a, b) { return pacted(a, b); };
  window.v20PactTurns = PACT_TURNS;
  function pactCost(e) { var c = Math.max(3, Math.min(12, Math.round(3 + sum(st(e)) / 80))); try { c = Math.max(2, Math.round(c / (window.WCAreaF ? WCAreaF(G.pl) : 1))); } catch (x) { } return c; }   // V109: büyük ülke pakti daha ucuza alır   // V45: saldırmazlık paktı daha ucuz (eski: 5–25)
  var _tg = targets;
  targets = function (p, ow) {
    var s = _tg.apply(this, arguments);
    try { if (is5() && G.pacts && p === G.pl) for (var k in s) if (ow[k] !== undefined && pacted(p, ow[k])) delete s[k]; } catch (e) { }
    return s;
  };
  var _pn = panel;
  panel = function () {
    _pn();
    try {
      if (!is5() || !G.sel || G.over || BSH || G.ph != 'act') return;
      var e = G.owner[G.sel]; if (typeof e != 'string' || e === G.pl) return;
      var el = $('panel'), bx = el && (el.querySelector('.v15a') || el.querySelector('.px')); if (!bx || el.querySelector('.pactbtn')) return;
      bx.insertAdjacentHTML('afterbegin', '<button class="pactbtn envbtn" onclick="v23Envoy()">' + T('Elçi Gönder', 'Send Envoy') + '</button>');
    } catch (x) { }
  };
  window.v20Pact = function () {
    if (!is5() || G.ph != 'act' || G.busy || BSH || !G.sel) return;
    var e = G.owner[G.sel]; if (typeof e != 'string' || e === G.pl) return;
    modal('<h3>🤝 ' + T('Saldırmazlık Paktı', 'Non-Aggression Pact') + '</h3><div style="text-align:center;margin:8px 0">' + fimg(G.pl, 'sm') + ' ⇄ ' + fimg(e, 'sm') + '</div>' +
      '<p style="color:var(--tx2)">' + T('<b>' + nm(e) + '</b> ile ' + PACT_TURNS + ' tur boyunca birbirinize saldıramazsınız.', 'You and <b>' + nm(e) + '</b> cannot attack each other for ' + PACT_TURNS + ' turns.') + '<br>' + WCPay.costLine() + '</p>' +
      WCPay.rows('v20PactGo') +
      '<button class="big" onclick="closeMod()">' + T('Vazgeç', 'Cancel') + '</button>');
  };
  window.v20PactGo = function (how) { closeMod(); v20PactOk(how); };
  window.v20PactOk = function (how) {   // V119: 2 zar ya da reklam (altın yok)
    if (!is5() || G.ph != 'act' || !G.sel) return;
    var e = G.owner[G.sel]; if (typeof e != 'string' || e === G.pl) return;
    if (pacted(G.pl, e)) return;
    WCPay.spend(how, function () {
      if (!is5() || G.ph != 'act' || pacted(G.pl, e)) return;
      G.pacts = G.pacts || {}; G.pacts[key(G.pl, e)] = (G.T.turn || 0) + PACT_TURNS + 1;
      G.sel = null; save(); render(); try { if (window.v23Fx) v23Fx('pact', e); } catch (x) { } toast('🤝 ' + nm(e) + ' — ' + T('saldırmazlık paktı imzalandı', 'pact signed'));
    });
  };

  // ================= V20b: büyük ülkelerde (Rusya vb.) etiket kadrajdaki görünür kısma kayar =================
  var BIG = ['RUS', 'CAN', 'USA', 'CHN', 'BRA', 'AUS'], RT = 0;
  function relabel() {
    try {
      if (!G || !window.V19 || !V19.inMem || !lab || BSH) return;
      var mp = $('map'); if (!mp) return;
      var k = CAM.k, A = area(), vw0 = mp.clientWidth / k, vh0 = A.h / k, ix = vw0 * .12, iy = vh0 * .14;
      var x0 = -CAM.x / k + ix, y0 = -CAM.y / k + iy, vw = vw0 - 2 * ix, vh = vh0 - 2 * iy;
      if (vw <= 0 || vh <= 0) return;
      var NX = 10, NY = 8;
      BIG.forEach(function (id) {
        var r = M[id]; if (!r || !r.bb || (typeof ownerOf == 'function' && ownerOf(id) !== id)) return;
        var bb = r.bb, ins = [], i, j;
        if (bb[2] < x0 || bb[0] > x0 + vw || bb[3] < y0 || bb[1] > y0 + vh) return;
        for (i = 0; i < NX; i++) for (j = 0; j < NY; j++) {
          var px = x0 + (i + .5) / NX * vw, py = y0 + (j + .5) / NY * vh;
          if (px < bb[0] || px > bb[2] || py < bb[1] || py > bb[3]) continue;
          if (V19.inMem(px, py, [r])) ins.push([px, py]);
        }
        if (ins.length / (NX * NY) < .06) return;           // kadrajda yeterli kısmı yoksa varsayılan etiket kalır
        var u = Math.min(vw, vh), cx = x0 + vw / 2, cy = y0 + vh / 2, best = null, bs = -1e18, step = Math.max(1, Math.floor(ins.length / 16));
        for (i = 0; i < ins.length; i += step) {
          var p = ins[i], sc = V19.clearance(p[0], p[1], [r], u) - .35 * Math.sqrt((p[0] - cx) * (p[0] - cx) + (p[1] - cy) * (p[1] - cy));
          if (sc > bs) { bs = sc; best = p; }
        }
        if (!best) return;
        var nmx = r.name;
        lab.selectAll('text').each(function (d) { if (d && d.name === nmx) { this.setAttribute('x', best[0]); this.setAttribute('y', best[1]); d.x = best[0]; d.y = best[1]; } });
      });
    } catch (e) { }
  }
  function schedRelabel() {   // V26: kamera durduktan sonra, tarayıcı boştayken ve ülke başına parça parça çalışır (seçim/animasyon sırasında takılma yok)
    clearTimeout(RT);
    RT = setTimeout(function () {
      var run = function () { relabel(); };
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 900 }); else setTimeout(run, 0);
    }, 260);
  }
  var _ac = applyCam;
  applyCam = function () { var r = _ac.apply(this, arguments); schedRelabel(); return r; };
  var _lb20 = labels;
  labels = function () { var r = _lb20.apply(this, arguments); schedRelabel(); return r; };

  // ================= V20c: oyun yokken / bitmişken harita kullanılamaz, Devam Et yalnızca geçerli kayıtta =================
  hasSave = function () {
    try {
      var s = JSON.parse(localStorage.getItem(SV));
      if (!s || typeof s != 'object' || !s.owner || !s.P) return false;
      if (s.over || s.ph == 'over') { try { localStorage.removeItem(SV); } catch (e) { } return false; }
      if (s.v5 && s.pl) { var n = 0, tot = 0, k; for (k in s.owner) { tot++; if (s.owner[k] === s.pl) n++; } if (n === 0 || n === tot) return false; }
      return true;
    } catch (e) { return false; }
  };
  var _cont20 = cont;
  cont = function () { if (!hasSave()) { toast(T('Devam edilecek kayıt yok', 'No save to continue')); menu(); return; } _cont20.apply(this, arguments); if (!G) menu(); };
  function idle() { return !G || G.over || G.ph == 'over'; }
  var _menu20 = menu;
  menu = function () { _menu20.apply(this, arguments); if (idle()) { var g = document.querySelector('#box .mm-b.ghost'); if (g) g.remove(); } sync(); };
  function sync() { document.body.classList.toggle('idle20', idle()); }
  setInterval(function () {
    try {
      sync();
      var m = $('mod'), open = m && m.style.display && m.style.display != 'none';
      if (idle() && !open && !BSH) menu();
    } catch (e) { }
  }, 1000);
  window.addEventListener('load', function () { setTimeout(function () { try { sync(); } catch (e) { } }, 50); });
  function reTribute() { var m = $('mod'); if (TR && is5() && G.ph == 'v5ai' && m && m.style.display == 'none') tribute(TR.ai, TR.c); }
  window.V20 = { reTribute: reTribute, run: run, after: after, plan: plan, seq: function () { return SEQ; } };   // V123: seq() → güvenlik garantisi zinciri (v123.js) kalan hamleyi okur/düşer
})();
