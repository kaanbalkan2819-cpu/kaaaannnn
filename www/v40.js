/* V40 — Diplomasi: Dostluk Antlaşması (ittifak), Koruma Parası (haraç), Diplomasi balonu.
   - Küçük devletler, güçlü saldırgana karşı kendi aralarında (ve istersen seninle) ittifak kurar.
     Tehlike büyüdükçe eğilim artar, rahat devlet nadiren kabul eder.
   - İttifaktaki devletler savaşa otomatik katılır: saldıran ve savunan taraf, müttefiklerin 5 değerini toplayarak savaşır.
   - Koruma parası: 5 değerin en az 3'ünde karşıdan üstünsen istenebilir (ittifaktaki devletten bile). Güçsüz olan öder,
     değerler yakınsa reddeder; reddetmek savaş sebebi sayılabilir (sonraki tur saldırı, müttefikler dahil).
   - Ödeme çoğunlukla ekonomiyi %10, nadiren başka bir değeri artırır (gerekçe yazılır).
   Veri: G.dip = { co:[{m:[...],vs,ci}], cd:{}, rel:{}, rev:{}, fr:{}, tc:{n,tot,per} } (kayıtla birlikte saklanır). Test edilmedi.
   V45: haraç (eski adı koruma parası) tur başına en çok 2 (aynı ülkeden en çok 1), güç hesabına müttefik katılmaz, 3/5 üstünlük kuralı oyuncuya gösterilmez;
        harita: oyuncu hariç herkes bej, ittifaklar kendi soluk ortak renginde; müttefik yardım/ilişki (fr) altyapısı (olaylar sonra eklenecek). */
(function () {
  'use strict';
  function T(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function is5() { return !!G && G.v5 === 1 && typeof G.pl === 'string'; }
  function nm(e) { return (M[e] && M[e].name) || e; }
  function turn() { return (G && G.T && G.T.turn) || 0; }
  function sum(a) { var s = 0; for (var i = 0; i < 5; i++) s += (+a[i] || 0); return s; }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function pw(e) { return sum(st(e)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function D() {
    if (!G.dip) G.dip = { co: [], cd: {}, rel: {}, rev: {} };
    var d = G.dip; d.fr = d.fr || {}; d.tc = d.tc || { n: -1, tot: 0, per: {} };   // V45: ilişki puanı (dostluk) + haraç hakkı sayacı
    return d;
  }
  function fl(e) { return (typeof fimg === 'function') ? fimg(e, 'sm') : ''; }

  /* ---------- ittifak veri yardımcıları ---------- */
  /* V68: Dostluk antlaşmasının süresi var: ALLY_TURNS tur sonra ittifak kendiliğinden biter (c.until). */
  var ALLY_TURNS = 8;
  function coAlive(c) { return c.until == null || c.until > turn(); }
  function coIdx(e) { var c = D().co; for (var i = 0; i < c.length; i++) if (coAlive(c[i]) && c[i].m.indexOf(e) >= 0) return i; return -1; }
  function coLeft(e) { var i = coIdx(e); if (i < 0) return 0; var u = D().co[i].until; return u == null ? 0 : Math.max(0, u - turn()); }
  function allies(e) {
    var i = coIdx(e); if (i < 0) return [];
    return D().co[i].m.filter(function (x) { return x !== e && ownedN(x) > 0; });
  }
  function allied(a, b) { var i = coIdx(a); return i >= 0 && D().co[i].m.indexOf(b) >= 0; }
  var MAXCO = 4;   // V46: bir ittifak en fazla 4 devlet
  function coSize(e) { var i = coIdx(e); return i < 0 ? 1 : D().co[i].m.filter(function (x) { return ownedN(x) > 0; }).length; }
  function canJoin(a, b) { var ia = coIdx(a); if (ia >= 0 && ia === coIdx(b)) return true; return coSize(a) + coSize(b) <= MAXCO; }
  function addPair(a, b, vs) {
    if (!canJoin(a, b)) return false;
    var d = D(), ia = coIdx(a), ib = coIdx(b), c;
    if (ia >= 0 && ia === ib) return;
    if (ia >= 0 && ib >= 0) { c = d.co[ia]; d.co[ib].m.forEach(function (x) { if (c.m.indexOf(x) < 0) c.m.push(x); }); d.co.splice(ib, 1); }
    else if (ia >= 0) { c = d.co[ia]; c.m.push(b); }
    else if (ib >= 0) { c = d.co[ib]; c.m.push(a); }
    else { c = { m: [a, b], vs: null }; d.co.push(c); }
    if (vs) c.vs = vs;
    c.until = turn() + ALLY_TURNS;   // V68: süre (yeni imza / katılım süreyi yeniler)
    return true;
  }
  function leave(e) {
    var d = D(), i = coIdx(e); if (i < 0) return;
    d.co[i].m = d.co[i].m.filter(function (x) { return x !== e; });
    if (d.co[i].m.length < 2) d.co.splice(i, 1);
  }
  function prune() {
    var d = D();
    d.co.forEach(function (c) { if (c.until == null) c.until = turn() + ALLY_TURNS; });   // eski kayıtlar: süre şimdi başlar
    try {
      d.co.forEach(function (c) { if (!coAlive(c) && G && c.m.indexOf(G.pl) >= 0) toast('⌛ ' + T('Dostluk antlaşması süresi doldu: ' + c.m.filter(function (x) { return x !== G.pl; }).map(nm).join(', '), 'Friendship treaty expired: ' + c.m.filter(function (x) { return x !== G.pl; }).map(nm).join(', '))); });
    } catch (e) { }
    d.co = d.co.filter(coAlive);
    d.co.forEach(function (c) { c.m = c.m.filter(function (x) { return ownedN(x) > 0; }); });
    d.co = d.co.filter(function (c) { return c.m.length >= 2; });
  }

  /* ---------- V45: harita renkleri — oyuncu hariç herkes bej; her ittifak kendi soluk ortak rengiyle ---------- */
  var NEUTRAL = 'hsl(46,30%,38%)';   // ekran görüntüsündeki bej ülke rengi
  var ACOL = ['hsl(175,32%,50%)', 'hsl(268,26%,62%)', 'hsl(207,38%,60%)', 'hsl(100,26%,52%)', 'hsl(318,26%,64%)', 'hsl(240,24%,70%)',
    'hsl(20,40%,62%)', 'hsl(145,34%,40%)', 'hsl(290,18%,48%)', 'hsl(195,34%,38%)', 'hsl(75,30%,46%)', 'hsl(165,18%,66%)'];
  function coTouch(x, c) {   // iki ittifak komşu mu? (komşu ittifaklar aynı renge düşmesin)
    for (var i = 0; i < x.m.length; i++) { var nb = neighbours(x.m[i]); for (var j = 0; j < nb.length; j++) if (c.m.indexOf(nb[j]) >= 0) return true; }
    return false;
  }
  function pickCi(c) {
    var d = D(), used = {}, near = {}, best = 0, bs = 1e9, i;
    d.co.forEach(function (x) { if (x === c || x.ci == null) return; used[x.ci] = (used[x.ci] || 0) + 1; if (coTouch(x, c)) near[x.ci] = 1; });
    for (i = 0; i < ACOL.length; i++) {
      var sc = (near[i] ? 1000 : 0) + (used[i] || 0) * 10 + i * .01;
      if (i === 0 && G && c.m.indexOf(G.pl) >= 0) sc -= 5;   // oyuncunun ittifakı mümkünse ilk renk
      if (sc < bs) { bs = sc; best = i; }
    }
    return best;
  }
  function coColor(e) {
    var i = coIdx(e); if (i < 0) return null;
    var c = D().co[i];
    if (c.ci == null) c.ci = pickCi(c);
    return ACOL[c.ci % ACOL.length];
  }
  function colSig() { try { return D().co.map(function (c) { return coColor(c.m[0]) + ':' + c.m.join('.'); }).join('|'); } catch (x) { return ''; } }
  var _col = col;
  col = function (e) {
    try {
      if (typeof e === 'string' && G && typeof G.pl === 'string' && e === G.pl) { G.plCol = '#a01220'; return G.plCol; }   // V48: oyuncu koyu kırmızı
      if (typeof e === 'string' && G && typeof G.pl !== 'string' && !(G.P && G.P[0] && G.P[0].start)) return NEUTRAL;   // V48: ülke seçilmeden hepsi bej
    } catch (x) { }
    try { if (typeof e === 'string' && G && typeof G.pl === 'string' && e !== G.pl) { var cc = null; try { cc = coColor(e); } catch (x2) { } return cc || NEUTRAL; } } catch (x) { }
    return _col.apply(this, arguments);
  };

  /* ---------- tehlike / eğilim ---------- */
  function neighbours(e) {
    var s = {}; for (var id in G.owner) if (G.owner[id] === e && M[id] && M[id].nb) M[id].nb.forEach(function (n) { var o = G.owner[n]; if (o !== undefined && o !== e) s[o] = 1; });
    return Object.keys(s);
  }
  // d: 0 (rahat) .. 1 (çok tehlikede); thr: en güçlü komşu tehdit
  function danger(e) {
    var mine = pw(e) + allies(e).reduce(function (a, x) { return a + pw(x); }, 0), thr = null, mx = 0;
    neighbours(e).forEach(function (x) { if (allied(e, x)) return; var p = pw(x); if (p > mx) { mx = p; thr = x; } });
    return { d: clamp((mx / Math.max(1, mine) - 1) / 1.5, 0, 1), thr: thr, mx: mx, mine: mine };
  }
  function inclination(e) {   // oyuncunun teklifini kabul etme olasılığı
    var d = danger(e), rel = (D().rel[e] || 0);
    return clamp(.08 + .85 * d.d - .25 * Math.min(2, rel) + .1 * Math.min(3, (D().fr[e] || 0)) + .12 * clamp((((st(G.pl) || [])[4]) || 0) / 100, 0, 1) + .22 * ((window.WCAreaF ? WCAreaF(G.pl) : 1) - 1), .04, .93);   // V109: büyük yüzey alanı = daha ikna edici diplomasi   // V102: Diplomasi kabulü kolaylaştırır   // V45: ilişki (fr) kabulü kolaylaştırır
  }
  function label(p) { return p >= .6 ? T('Yüksek', 'High') : p >= .3 ? T('Orta', 'Medium') : T('Düşük', 'Low'); }

  /* ---------- savaş: müttefik değerleri toplanır ---------- */
  function side(e, other) {
    var s = st(e).slice(), joined = [];
    allies(e).forEach(function (a) {
      if (a === other || allied(a, other)) return;
      var x = st(a); for (var i = 0; i < 5; i++) s[i] += x[i]; joined.push(a);
    });
    return { s: s, j: joined };
  }
  /* ---------- V46: zorluk, yön takibi, tepki ---------- */
  var BLOC = { W: ['Batı', 'West'], E: ['Doğu', 'East'], S: ['Güney', 'South'], N: ['Kuzey', 'North'] };
  function bloc(e) {
    var c = M[e] && M[e].c; if (!c) return 'N'; var lo = c[0], la = c[1];
    if (lo < -25 || (lo < 32 && la > 36)) return 'W'; if (lo >= 60) return 'E'; if (la <= 36) return 'S'; return 'N';
  }
  function guard(b) { var g = D().guard; return (g && g[b]) || 0; }
  // Savunan yapay zekâ: büyük devlet daha dirençli; oyuncu büyüdükçe herkes daha sert; yönüne göre ek önlem
  function defBonus(de) { return 1 + clamp(.02 * (ownedN(de) - 1), 0, .25) + clamp(.01 * (ownedN(G.pl) - 4), 0, .15) + guard(bloc(de)); }
  function atkBonus() { return 1 + clamp(.012 * (ownedN(G.pl) - 4), 0, .15); }
  function mul(a, f) { return f === 1 ? a : a.map(function (v) { return v * f; }); }
  function war(att, de) {
    var betray = false; try { betray = is5() && att === G.pl && allied(att, de); } catch (e) { }
    var A = side(att, de), B = side(de, att);
    try {
      if (betray) {   // V68: DOSTA İHANET — müttefike saldırırsan o savaşa özel müttefik x2 güçlü; ittifak bozulur
        B.s = mul(B.s, 2);
        toast('🗡 ' + T('Dosta ihanet! ' + nm(de) + ' bu savaşta 2 kat güçlü', 'Betrayal! ' + nm(de) + ' is twice as strong in this war'));
        leave(att);
      }
      if (is5()) {
        if (att === G.pl) {
          B.s = mul(B.s, defBonus(de));
          var d0 = D(), b0 = bloc(de); d0.dir = d0.dir || {}; d0.dir[b0] = (d0.dir[b0] || 0) + 1;      // saldırı yönü
          B.j.forEach(function (a) { d0.rev[a] = turn() + 1; });                                       // müttefikler sonraki tur misilleme
          allies(de).forEach(function (a) { d0.rev[a] = turn() + 1; });
        } else if (de === G.pl) A.s = mul(A.s, atkBonus());
      }
    } catch (e) { }
    try {
      if (A.j.length || B.j.length) {
        var tx = [];
        if (A.j.length) tx.push(T('Saldıran taraf: ', 'Attackers: ') + [nm(att)].concat(A.j.map(nm)).join(' + '));
        if (B.j.length) tx.push(T('Savunan taraf: ', 'Defenders: ') + [nm(de)].concat(B.j.map(nm)).join(' + '));
        toast('⚔ ' + tx.join(' · '));
      }
    } catch (e) { }
    return { A: A.s, D: B.s, al: A.j, dl: B.j };
  }

  /* ---------- hedef filtresi: müttefike saldırılmaz ---------- */
  var _tg = targets;
  targets = function (p, ow) {
    var s = _tg.apply(this, arguments);
    try { if (is5() && typeof p === 'string' && p !== G.pl && G.dip) for (var k in s)   /* V68: oyuncu müttefikine saldırabilir (ihanet) */ if (ow[k] !== undefined && allied(p, ow[k])) delete s[k]; } catch (e) { }
    // V46: oyuncu, kendinden çok güçlü (>1.6x) devlete yalnızca kara sınırından saldırabilir (denizden ulaşamaz)
    try {
      if (is5() && p === G.pl) {
        var f = {}, n = 0, mine = pw(p), nat = null; try { nat = window.WC && window.WC.seaNat && window.WC.seaNat(); } catch (x) { }
        for (var k2 in s) {
          var e2 = ow[k2], land = M[k2] && M[k2].nb && M[k2].nb.some(function (x) { return ow[x] === p; });
          /* V189: yakın (doğal) deniz komşuları da kara komşusu gibi muaf: Sri Lanka → Hindistan/Bangladeş gibi */
          var natl = !!(nat && nat[k2] && Object.keys(nat[k2]).some(function (x) { return ow[x] === p; }));
          if (typeof e2 === 'string' && e2 !== p && !land && !natl && pw(e2) > 1.6 * mine) continue;
          f[k2] = s[k2]; n++;
        }
        if (n) return f;
      }
    } catch (e) { }
    return s;
  };

  /* ---------- yapay zekâ ittifakı (her oyuncu turunun başında) ---------- */
  function tick() {
    if (!is5() || G.over) return;
    var d = D(), tn = turn(); prune();
    var ai = aliveEmp().filter(function (e) { return e !== G.pl && ownedN(e) > 0; });
    ai.sort(function () { return Math.random() - .5; });
    var done = 0;
    for (var i = 0; i < ai.length && done < 2; i++) {   // V46: tur başına 2'ye kadar ittifak
      var e = ai[i], de = danger(e);
      if (!de.thr || de.d <= .05) continue;
      var p = .06 + .6 * Math.pow(de.d, 1.2);
      if (Math.random() > p) continue;
      // ortak tehditten rahatsız olan bir ortak bul
      var cands = ai.filter(function (f) {
        if (f === e || f === de.thr || allied(e, f) || !canJoin(e, f)) return false;
        var df = danger(f); return df.d > .05 && (df.thr === de.thr || neighbours(f).indexOf(de.thr) >= 0);
      });
      if (!cands.length) continue;
      cands.sort(function (a, b) { return danger(b).d - danger(a).d; });
      var f = cands[0], pf = .1 + .8 * danger(f).d;
      if (Math.random() > pf) continue;
      addPair(e, f, de.thr); done++;
      try {
        G.inc23 = G.inc23 || {};
        [e, f].forEach(function (x) { G.inc23[x + '>' + de.thr] = { until: tn + 4, m: 1.3, add: .12 }; });
        toast('🤝 ' + nm(e) + ' + ' + nm(f) + ' — ' + T(nm(de.thr) + ' tehdidine karşı Dostluk Antlaşması imzaladı', 'signed a Friendship Treaty against ' + nm(de.thr)));
      } catch (x) { }
    }
    try { leaderTick(ai); } catch (x) { console.error(x); }   // V73: lider cezası
    try { balance(ai); directionTick(ai); } catch (x) { console.error(x); }
    // eski bayatlayan intikam/bekleme kayıtlarını temizle
    Object.keys(d.rev).forEach(function (k) { if (d.rev[k] < tn) delete d.rev[k]; });
    try { save(); } catch (x) { }
  }
  if (window.V5 && V5.start) { var _st = V5.start; V5.start = function () { try { tick(); } catch (e) { console.error(e); } return _st.apply(this, arguments); }; }

  /* ---------- V73: LİDER CEZASI — oyuncu çok büyüyünce yapay zekâ devletleri ona karşı otomatik koalisyon kurar ----------
     Lider sayılma: en az LEADER_MIN_LANDS toprak VE (gücün en güçlü rakibin LEADER_POWER_RATIO katı veya dünyanın %LEADER_SHARE'i).
     Koalisyon: oyuncunun komşusu ve güçlü, henüz ittifakı olmayan LEADER_CO_SIZE devlet birleşir (süre LEADER_TURNS tur; biter bitmez yine lider ise tekrar kurulabilir).
     Birleşen devletler savaşta değerlerini toplar (side()) ve oyuncuya karşı kışkırtılır (inc23 → sıra alma/saldırı önceliği). */
  var LEADER_MIN_LANDS = 6, LEADER_POWER_RATIO = 1.25, LEADER_SHARE = .08, LEADER_CO_SIZE = 3, LEADER_TURNS = 8;
  function antiAlive() { var c = D().co; for (var i = 0; i < c.length; i++) if (c[i].anti && coAlive(c[i]) && c[i].m.indexOf(G.pl) < 0) return c[i]; return null; }
  function leaderTick(ai) {
    var me = ownedN(G.pl), total = Object.keys(G.owner).length || 1;
    if (me < LEADER_MIN_LANDS || antiAlive()) return;
    var top = 0; ai.forEach(function (e) { top = Math.max(top, pw(e)); });
    var lead = pw(G.pl) >= LEADER_POWER_RATIO * Math.max(1, top) || me / total >= LEADER_SHARE;
    if (!lead) return;
    if (Math.random() > clamp(.35 + .05 * (me - LEADER_MIN_LANDS), .35, .9)) return;   // büyüdükçe daha olası
    var nbr = neighbours(G.pl);
    var pool = ai.filter(function (e) { return coIdx(e) < 0 && !allied(G.pl, e); });
    if (pool.length < 2) return;
    function sc(e) { return (nbr.indexOf(e) >= 0 ? 1e4 : 0) + pw(e); }   // önce oyuncunun komşuları, sonra güçlüler
    pool.sort(function (a, b) { return sc(b) - sc(a); });
    var pick = pool.slice(0, Math.min(LEADER_CO_SIZE, MAXCO));
    if (!addPair(pick[0], pick[1], G.pl)) return;
    for (var i = 2; i < pick.length; i++) addPair(pick[0], pick[i], G.pl);
    var ci = coIdx(pick[0]), c = ci >= 0 ? D().co[ci] : null; if (!c) return;
    c.anti = 1; c.vs = G.pl; c.until = turn() + LEADER_TURNS;
    G.inc23 = G.inc23 || {};
    pick.forEach(function (x) { G.inc23[x + '>' + G.pl] = { until: turn() + 3, m: 1.3, add: .12 }; });
    toast('⚖ ' + T('Rakipler gücünüze karşı birleşti! ' + pick.map(nm).join(' + ') + ' sana karşı koalisyon kurdu (' + LEADER_TURNS + ' tur)', 'Rivals united against your power! ' + pick.map(nm).join(' + ') + ' formed a coalition against you (' + LEADER_TURNS + ' turns)'));
  }

  /* ---------- intikam (reddedilen haraç) ---------- */
  function rev(e) { try { return !!(G && G.dip && G.dip.rev[e] >= turn()); } catch (x) { return false; } }
  function clearRev(e) { try { delete G.dip.rev[e]; } catch (x) { } }

  /* ---------- arayüz: pencereler ---------- */
  function bar(p) { return '<div class="wd-bar"><i style="width:' + Math.round(p * 100) + '%"></i></div>'; }
  function head(icon, title, e) {
    return '<h3>' + icon + ' ' + title + '</h3><div style="text-align:center;margin:8px 0">' + fl(G.pl) + ' ⇄ ' + fl(e) + '</div>';
  }
  function selE() { var e = G && G.sel && G.owner[G.sel]; return (typeof e === 'string' && e !== G.pl) ? e : null; }
  function canAct() { return is5() && G.ph === 'act' && !G.busy && !BSH; }

  window.wcdFriend = function () {
    closeBubble(); if (!canAct()) return; var e = selE(); if (!e) return;
    var d = D(), tn = turn();
    if (allied(G.pl, e)) { modal('<h3>🤝 ' + T('Dostluk Antlaşması', 'Friendship Treaty') + '</h3><p>' + T('<b>' + nm(e) + '</b> zaten müttefikin.', '<b>' + nm(e) + '</b> is already your ally.') + '</p><button class="big" onclick="closeMod()">' + T('Tamam', 'OK') + '</button>'); return; }
    if (!canJoin(G.pl, e)) { modal('<h3>🤝 ' + T('Dostluk Antlaşması', 'Friendship Treaty') + '</h3><p>' + T('Bir ittifak en fazla ' + MAXCO + ' devletten oluşabilir.', 'An alliance can have at most ' + MAXCO + ' states.') + '</p><button class="big" onclick="closeMod()">' + T('Tamam', 'OK') + '</button>'); return; }
    var p = inclination(e), thr = danger(e).thr;
    var cd = d.cd['f' + e] === tn;
    modal(head('🤝', T('Dostluk Antlaşması', 'Friendship Treaty'), e) +
      '<p style="color:var(--tx2)">' + T('İmzalarsanız <b>' + nm(e) + '</b> ile birlikte hareket edersiniz: her savaşta müttefiklerin 5 değeri toplanır, ittifaktaki devletlere saldıramazsınız.',
        'If signed, you and <b>' + nm(e) + '</b> act together: allies add their 5 stats in every war and you cannot attack each other.') + '</p>' +
      '<p>' + T('Kabul eğilimi: ', 'Willingness: ') + '<b>' + label(p) + '</b>' + bar(p) +
      (thr ? '<small style="opacity:.75">' + T('En büyük tehdidi: ', 'Biggest threat: ') + nm(thr) + '</small>' : '') + '</p>' +
      (cd ? '<p style="color:var(--bad)">' + T('Bu tur zaten teklif ettin.', 'You already proposed this turn.') + '</p>' : '<p>' + WCPay.costLine() + '</p>' + WCPay.rows('wcdFriendGo')) +
      '<button class="big" onclick="closeMod()">' + T('Vazgeç', 'Cancel') + '</button>');
  };
  window.wcdFriendGo = function (how) {   // V119: 1 zar ya da reklam
    if (!canAct()) { closeMod(); return; } var e0 = selE(); if (!e0 || !canJoin(G.pl, e0) || D().cd['f' + e0] === turn()) { closeMod(); return; }
    closeMod(); WCPay.spend(how, wcdFriendRun);
  };
  window.wcdFriendRun = function () {
    if (!canAct()) { closeMod(); return; } var e = selE(); if (!e) { closeMod(); return; }
    if (!canJoin(G.pl, e)) { closeMod(); return; }
    var d = D(), tn = turn(), p = inclination(e); d.cd['f' + e] = tn;
    var ok = Math.random() < p;
    if (ok) {
      addPair(G.pl, e, danger(e).thr); try { save(); render(); } catch (x) { }
      modal(head('🤝', T('Antlaşma İmzalandı', 'Treaty Signed'), e) + '<p>' + T('<b>' + nm(e) + '</b> teklifini kabul etti. Artık savaşlarda yan yanasınız (' + ALLY_TURNS + ' tur geçerli). Müttefike saldırırsan "dosta ihanet" ile o savaşta 2 kat güçlü olur.', '<b>' + nm(e) + '</b> accepted. You now fight side by side (valid for ' + ALLY_TURNS + ' turns). Attacking an ally is betrayal: it fights at 2x strength.') + '</p><button class="big pri" onclick="closeMod()">' + T('Tamam', 'OK') + '</button>');
    } else {
      try { save(); } catch (x) { }
      modal(head('🕊', T('Teklif Reddedildi', 'Proposal Rejected'), e) + '<p>' + T('<b>' + nm(e) + '</b> şimdilik kendi yolunda kalmayı tercih etti. Tehlike büyürse fikri değişebilir; bu tur tekrar deneyemezsin.', '<b>' + nm(e) + '</b> prefers to stay independent for now. It may change its mind if danger grows; you cannot retry this turn.') + '</p><button class="big" onclick="closeMod()">' + T('Tamam', 'OK') + '</button>');
    }
  };
  window.wcdLeave = function () {
    closeBubble(); if (!is5()) return; leave(G.pl); try { save(); render(); } catch (x) { } toast('🚪 ' + T('İttifaktan çıktın', 'You left the alliance'));
  };
  window.wcdNap = function () { closeBubble(); if (window.v20Pact) v20Pact(); };

  /* ---- haraç (eski adı: koruma parası) ---- */
  // Üstünlük: yalnızca iki devletin KENDİ 5 değeri karşılaştırılır; müttefikler (ne seninkiler ne karşıdakinin) hesaba katılmaz.
  function lead(e) { var a = st(G.pl), b = st(e), k = 0; for (var i = 0; i < 5; i++) if (a[i] > b[i]) k++; return k; }
  var MAX_TOT = 2, MAX_PER = 1;   // <<< AYAR: tur başına toplam haraç hakkı / aynı ülkeden en çok
  function tq() { var d = D(), tn = turn(); if (d.tc.n !== tn) d.tc = { n: tn, tot: 0, per: {} }; return d.tc; }
  function tLeft() { return Math.max(0, MAX_TOT - tq().tot); }
  function tribCheck(e) {
    var q = tq();
    if ((q.per[e] || 0) >= MAX_PER) return { ok: false, msg: T('Bu tur <b>' + nm(e) + '</b> ülkesinden zaten haraç talep ettin.', 'You already demanded tribute from <b>' + nm(e) + '</b> this turn.') };
    if (q.tot >= MAX_TOT) return { ok: false, msg: T('Bu tur en fazla ' + MAX_TOT + ' haraç talep edebilirsin.', 'You can demand tribute at most ' + MAX_TOT + ' times per turn.') };
    if (lead(e) < 3) return { ok: false, msg: T('Haraç talep edecek gücünüz yok.', 'You do not have the strength to demand tribute.') };   // 3/5 kuralı oyuncuya gösterilmez
    return { ok: true };
  }
  var REASONS = {
    2: [['{e}, ticaret yollarını ve limanlarını koruman karşılığında gümrük gelirinden pay verdi.', '{e} granted a share of its customs revenue in exchange for your protection.'],
      ['{e} hazine kervanlarını sana yöneltti; ekonomin güçlendi.', '{e} diverted its treasure caravans to you; your economy grew.'],
      ['{e} ile yapılan ticaret anlaşmaları vergi gelirini artırdı.', 'Trade deals with {e} raised your tax revenue.']],
    3: [['{e}\'in teknolojik gelişmesini kendimize aldık; ustaları ve planları artık bizim.', 'We absorbed {e}\'s technological advances; its craftsmen and plans are now ours.']],
    1: [['{e}, koruma karşılığı asker ve silah ustası gönderdi.', '{e} sent soldiers and armorers in exchange for protection.']],
    0: [['{e}\'den gelen göçmenler nüfusumuzu artırdı.', 'Migrants from {e} increased our population.']],
    4: [['{e}, elçilerini ve nüfuzunu sana bağladı; itibarın yükseldi.', '{e} tied its envoys and influence to you; your prestige rose.']]
  };
  window.wcdTribute = function () {
    closeBubble(); if (!canAct()) return; var e = selE(); if (!e) return;
    var c = tribCheck(e), ttl = T('Haraç Talep Et', 'Demand Tribute');
    if (!c.ok) { modal(head('💰', ttl, e) + '<p>' + c.msg + '</p><button class="big" onclick="closeMod()">' + T('Tamam', 'OK') + '</button>'); return; }
    modal(head('💰', ttl, e) +
      '<p style="color:var(--tx2)">' + T('<b>' + nm(e) + '</b> ülkesinden haraç talep edeceksin. Ödeyebilir ya da reddedebilir; reddederse sana düşmanlaşabilir ve saldırabilir (müttefikleriyle birlikte).',
        'You will demand tribute from <b>' + nm(e) + '</b>. It may pay or refuse; if it refuses it may turn hostile and attack you (with its allies).') + '</p>' +
      '<p>' + T('Bu tur kalan haraç hakkı: ', 'Demands left this turn: ') + '<b>' + tLeft() + '/' + MAX_TOT + '</b></p>' +
      '<p>' + WCPay.costLine() + '</p>' + WCPay.rows('wcdTributeGo') +
      '<button class="big" onclick="closeMod()">' + T('Vazgeç', 'Cancel') + '</button>');
  };
  window.wcdTributeGo = function (how) {   // V119: 1 zar ya da reklam
    if (!canAct()) { closeMod(); return; } var e0 = selE(); if (!e0 || !tribCheck(e0).ok) { closeMod(); return; }
    closeMod(); WCPay.spend(how, wcdTributeRun);
  };
  window.wcdTributeRun = function () {
    if (!canAct()) { closeMod(); return; } var e = selE(); if (!e || !tribCheck(e).ok) { closeMod(); return; }
    var d = D(), tn = turn(), q = tq(); q.tot++; q.per[e] = (q.per[e] || 0) + 1;
    var ratio = pw(e) / Math.max(1, pw(G.pl)), pay = clamp((1.15 * (1 - ratio) + .1) * (window.WCAreaF ? WCAreaF(G.pl) : 1), .05, .95);   // V109   // yalnızca iki devletin kendi gücü
    if (Math.random() < pay) {
      var k = 2; if (Math.random() < .15) { var o = [0, 1, 3, 4]; k = o[Math.floor(Math.random() * o.length)]; }
      var pr = REASONS[k][Math.floor(Math.random() * REASONS[k].length)], why = T(pr[0], pr[1]).replace(/\{e\}/g, nm(e));
      var cur = st(G.pl); G.es = G.es || {}; G.es[G.pl] = cur.map(function (v, i) { return i === k ? Math.round(v * 1.1 * 1e6) / 1e6 : v; }); if (G.ed) G.ed[G.pl] = 0;
      var SN = [T('Nüfus', 'Population'), T('Ordu', 'Army'), T('Ekonomi', 'Economy'), T('Teknoloji', 'Technology'), T('Diplomasi', 'Diplomacy')];
      try { save(); render(); } catch (x) { }
      modal(head('💰', T('Haraç Ödendi', 'Tribute Paid'), e) + '<p>' + why + '</p><p><b>' + SN[k] + ' +%10</b></p><button class="big pri" onclick="closeMod()">' + T('Tamam', 'OK') + '</button>');
    } else {
      var war = Math.random() < clamp(ratio * .85, .08, .8), msg;
      if (war) { d.rev[e] = tn + 1; msg = T('<b>' + nm(e) + '</b> talebi reddetti ve bunu savaş sebebi saydı. Sonraki tur sana saldırabilir; müttefikleri de katılır.', '<b>' + nm(e) + '</b> refused and took it as a cause for war. It may attack next turn with its allies.'); }
      else {
        d.rel[e] = (d.rel[e] || 0) + 1; G.inc23 = G.inc23 || {}; G.inc23[e + '>' + G.pl] = { until: tn + 4, m: 1.5, add: .1 };
        msg = T('<b>' + nm(e) + '</b> talebi reddetti; tutumu sana karşı olumsuza döndü.', '<b>' + nm(e) + '</b> refused; its attitude toward you turned hostile.');
      }
      try { save(); } catch (x) { }
      modal(head('⚔', T('Talep Reddedildi', 'Demand Refused'), e) + '<p>' + msg + '</p><button class="big" onclick="closeMod()">' + T('Tamam', 'OK') + '</button>');
    }
  };

  /* ---- müttefik yardımı / ilişki (V45: altyapı — olay içerikleri sonra eklenecek) ----
     İlişki puanı: D().fr[devlet] (0..10). Yalnızca MÜTTEFİKLERİN isteğiyle artar.
     Bir olay şöyle çağırır:
       WCD.helpRequest({ from:'FRA', title:'...', text:'...', can:function(){return true}, onAccept:function(){ ...bedeli öde... }, gain:1 })
       → oyuncu "Yardım Et"i seçer ve onAccept() false döndürmezse otomatik WCD.helpFulfilled(from, gain) çalışır (ilişki artar).
     Yardımı olay kendi içinde başka biçimde yerine getirirse doğrudan WCD.helpFulfilled(ally, gain) çağırması yeter. */
  var FR_LV = [[6, 'Sadık', 'Loyal', '💚💚💚'], [3, 'Yakın', 'Close', '💚💚'], [1, 'Dostane', 'Friendly', '💚'], [0, 'Normal', 'Neutral', '']];
  function frLevel(e) { var v = D().fr[e] || 0; for (var i = 0; i < FR_LV.length; i++) if (v >= FR_LV[i][0]) return { v: v, n: T(FR_LV[i][1], FR_LV[i][2]), h: FR_LV[i][3] }; return { v: v, n: '', h: '' }; }
  function addFriend(e, n) { var d = D(); d.fr[e] = clamp((d.fr[e] || 0) + (n == null ? 1 : n), 0, 10); }
  function helpFulfilled(e, gain) {
    if (!is5() || !allied(G.pl, e)) return false;
    addFriend(e, gain == null ? 1 : gain); try { save(); } catch (x) { }
    try { toast('💚 ' + nm(e) + ' — ' + T('yardımın ilişkinizi güçlendirdi', 'your help strengthened relations') + ' (' + frLevel(e).n + ')'); } catch (x) { }
    return true;
  }
  var HQ = null;
  function helpRequest(o) {
    if (!is5() || !o || !o.from || !allied(G.pl, o.from)) return false;
    HQ = o;
    modal('<h3>🆘 ' + (o.title || T('Müttefik Yardım İstiyor', 'Ally Requests Help')) + '</h3><div style="text-align:center;margin:8px 0">' + fl(o.from) + ' <b>' + nm(o.from) + '</b></div>' +
      '<p style="color:var(--tx2)">' + (o.text || '') + '</p>' +
      '<button class="big pri" onclick="wcdHelp(1)">🤝 ' + (o.yes || T('Yardım Et', 'Help')) + '</button>' +
      '<button class="big" onclick="wcdHelp(0)">' + (o.no || T('Şimdi Değil', 'Not Now')) + '</button>');
    return true;
  }
  window.wcdHelp = function (yes) {
    var o = HQ; HQ = null; closeMod(); if (!o) return;
    if (!yes) { if (o.penalty) { addFriend(o.from, -o.penalty); try { save(); } catch (x) { } } if (o.onDecline) try { o.onDecline(); } catch (x) { } return; }
    try { if (o.can && o.can() === false) { toast(T('Bu yardımı şu an yapamazsın', 'You cannot help right now')); return; } } catch (x) { }
    var r; try { r = o.onAccept ? o.onAccept() : true; } catch (x) { console.error(x); r = false; }
    if (r !== false) helpFulfilled(o.from, o.gain); try { render(); } catch (x) { }
  };

    /* ---- V46: oyuncu büyüdükçe yapay zekâ toparlanır (zorluk dengesi) ---- */
  function balance(ai) {
    var me = pw(G.pl); G.es = G.es || {}; G.ed = G.ed || {};
    ai.forEach(function (e) {
      var r = me / Math.max(1, pw(e)); if (r <= 1.2) return;
      var g = Math.min(.05, .01 + .02 * (r - 1.2)), a = st(e).slice(), idx = 0, i;
      for (i = 1; i < 5; i++) if (a[i] < a[idx]) idx = i;
      a[idx] = a[idx] * (1 + g) + .2; G.es[e] = a; G.ed[e] = 0;
    });
  }
  /* ---- V46: saldırı yönü → önlemler + barış teklifi ---- */
  function directionTick(ai) {
    var d = D(), dir = d.dir || {}, tn = turn(); d.guard = d.guard || {}; d.lv = d.lv || {}; d.offN = d.offN || {};
    Object.keys(dir).forEach(function (b) {
      var n = dir[b], lv = Math.floor(n / 3), pool = ai.filter(function (e) { return bloc(e) === b && ownedN(e) > 0; });
      if (!pool.length) return;
      if (lv > (d.lv[b] || 0)) {   // her 3 saldırıda önlem: savunma artar, bölge devletleri ittifak kurar / sana yönelir
        d.lv[b] = lv; d.guard[b] = Math.min(.2, .04 * lv);
        pool.sort(function () { return Math.random() - .5; });
        G.inc23 = G.inc23 || {}; pool.slice(0, 2).forEach(function (e) { G.inc23[e + '>' + G.pl] = { until: tn + 5, m: 1.5, add: .1 }; });
        if (pool.length >= 2 && canJoin(pool[0], pool[1])) addPair(pool[0], pool[1], G.pl);
        try { toast('🛡 ' + T(BLOC[b][0] + ' devletleri sana karşı önlem aldı', BLOC[b][1] + ' states took countermeasures against you')); } catch (x) { }
      }
      var off = Math.floor(n / 4);   // her 4 saldırıda o yönden barış teklifi
      if (n >= 4 && off > (d.offN[b] || 0) && !d.offer) {
        var cand = pool.filter(function (e) { return !allied(G.pl, e) && !(window.v20Pacted && v20Pacted(G.pl, e)); });
        if (cand.length) {
          cand.sort(function (a, c) { return pw(c) - pw(a); });
          var k = [1, 2, 3, 4][Math.floor(Math.random() * 4)];   // nüfus (0) teklif edilmez
          d.offN[b] = off; d.offer = { from: cand[0], b: b, k: k };
        }
      }
    });
  }
  /* V214: barış teklifindeki hediye artık "+%8 Teknoloji" gibi yüzdeyle değil, karşı tarafın somut bir taahhüdü olarak anlatılır
     (etki aynı: seçilen alan +%8). Metin teklif başına bir kez seçilir (o.pv). */
  var PLEDGES = {
    1: [['{e}, son nesil insansız hava araçlarını ve askerî danışmanlarını orduna göndermeyi taahhüt ediyor.', '{e} pledges to send its latest drones and military advisers to your army.'],
      ['{e}, hava savunma sistemlerini ve subay eğitim programlarını seninle paylaşmayı taahhüt ediyor.', '{e} pledges to share its air-defence systems and officer training with you.']],
    2: [['{e}, limanlarını ticaretine açmayı ve gümrük vergilerini kaldırmayı taahhüt ediyor.', '{e} pledges to open its ports to your trade and lift its customs duties.'],
      ['{e}, enerji koridorlarından seninle ayrıcalıklı fiyatla pay paylaşmayı taahhüt ediyor.', '{e} pledges you a privileged share of its energy corridors.']],
    3: [['{e}, son çıkan yapay zekâ teknolojilerini seninle paylaşmayı taahhüt ediyor.', '{e} pledges to share its newest artificial-intelligence technology with you.'],
      ['{e}, yarı iletken fabrikalarının üretim bilgisini seninle paylaşmayı taahhüt ediyor.', '{e} pledges to share its chip-fabrication know-how with you.'],
      ['{e}, uzay ve uydu programına seni ortak etmeyi taahhüt ediyor.', '{e} pledges to make you a partner in its space and satellite programme.']],
    4: [['{e}, uluslararası zirvelerde seni desteklemeyi ve elçiliklerini sana açmayı taahhüt ediyor.', '{e} pledges to back you at international summits and open its embassies to you.'],
      ['{e}, müttefiklerine senin lehine arabuluculuk yapmayı taahhüt ediyor.', '{e} pledges to mediate with its allies in your favour.']]
  };
  function pledge(o) {
    var L0 = PLEDGES[o.k] || PLEDGES[3]; if (o.pv == null || o.pv >= L0.length) o.pv = Math.floor(Math.random() * L0.length);
    return T(L0[o.pv][0], L0[o.pv][1]).replace(/\{e\}/g, '<b>' + nm(o.from) + '</b>');
  }
  window.WCPledge = pledge;   /* V214: v138 pakt/ittifak teklifleri de aynı taahhüt metinlerini kullanır */
  var OFFERING = false;
  function maybeOffer() {
    if (OFFERING || !is5() || !G.dip || !G.dip.offer || !canAct()) return;
    var m = document.getElementById('mod'); if (m && m.style.display === 'flex') return;
    var o = G.dip.offer, SN = [T('Nüfus', 'Population'), T('Ordu gücü', 'Army'), T('Ekonomi', 'Economy'), T('Teknoloji', 'Technology'), T('Diplomasi', 'Diplomacy')];
    if (!M[o.from] || ownedN(o.from) === 0) { delete G.dip.offer; return; }
    OFFERING = true;
    modal('<h3>🕊 ' + T(BLOC[o.b][0] + ' Devletlerinden Teklif', 'Offer from the ' + BLOC[o.b][1]) + '</h3><div style="text-align:center;margin:8px 0">' + fl(o.from) + ' <b>' + nm(o.from) + '</b></div>' +
      '<p style="color:var(--tx2)">' + T('<b>' + nm(o.from) + '</b>, ilerleyişini durdurmak için ' + (window.v20PactTurns || 6) + ' tur sürecek bir saldırmazlık antlaşması öneriyor.',
        '<b>' + nm(o.from) + '</b> offers a ' + (window.v20PactTurns || 6) + '-turn non-aggression pact to halt your advance.') + '</p>' +
      '<div class="pledge214"><img class="wci" src="' + ((window.WC_ICONS || {})[['pop', 'army', 'eco', 'tech', 'dip'][o.k]] || '') + '" alt=""><span><small>' + T('KARŞILIĞINDA', 'IN RETURN') + '</small>' + pledge(o) + '</span></div>' +
      '<button class="big pri" onclick="wcdOffer(1)">🤝 ' + T('Kabul Et', 'Accept') + '</button><button class="big" onclick="wcdOffer(0)">' + T('Reddet', 'Decline') + '</button>');
  }
  window.wcdOffer = function (yes) {
    var o = G && G.dip && G.dip.offer; OFFERING = false; closeMod(); if (!o) return; delete G.dip.offer;
    if (yes) {
      var a = G.pl, b = o.from; G.pacts = G.pacts || {}; G.pacts[a < b ? a + '|' + b : b + '|' + a] = turn() + (window.v20PactTurns || 6) + 1;
      var cur = st(G.pl); G.es = G.es || {}; G.es[G.pl] = cur.map(function (v, i) { return i === o.k ? Math.round(v * 1.08 * 1e6) / 1e6 : v; }); if (G.ed) G.ed[G.pl] = 0;
      try { toast('🤝 ' + nm(b) + ' — ' + T('saldırmazlık antlaşması imzalandı', 'pact signed')); } catch (x) { }
    }
    try { save(); render(); } catch (x) { }
  };
  var _rn46 = render;
  render = function () { var x = _rn46.apply(this, arguments); try { setTimeout(maybeOffer, 450); } catch (e) { } return x; };

  /* ---------- Diplomasi balonu (Elçi Gönder / Keşif yanında) ---------- */
  function closeBubble() { var b = document.getElementById('wdbub'); if (b) b.remove(); }
  window.wcdBubble = function (ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (document.getElementById('wdbub')) { closeBubble(); return; }
    if (!canAct()) return; var e = selE(); if (!e) return;
    var inC = allied(G.pl, e), mine = allies(G.pl), p = inclination(e);
    var rows = function (ic, tt, ds, st2, on, cls) {
      return '<button class="wd-r ' + (cls || '') + '" ' + (on ? 'onclick="' + on + '"' : 'disabled') + '><span class="wd-i">' + ic + '</span><span class="wd-t"><b>' + tt + '</b><small>' + ds + '</small></span><em>' + st2 + '</em></button>';
    };
    var h = '<div class="wd-h">🕊 ' + T('Diplomasi', 'Diplomacy') + (mine.length ? '<small>' + T('Müttefikler: ', 'Allies: ') + mine.map(nm).join(', ') + '</small>' : '') + (inC ? '<small>' + T('İlişki: ', 'Relations: ') + frLevel(e).n + ' ' + frLevel(e).h + '</small>' : '') + '</div>' +
      rows('🤝', T('Dostluk Antlaşması', 'Friendship Treaty'), T('Birlikte savaş, değerler toplanır · 2 🎲', 'Fight together, stats add up · 2 🎲'), inC ? T('Müttefik', 'Allied') : label(p), 'wcdFriend()') +
      rows('🛡', T('Saldırmazlık Antlaşması', 'Non-Aggression Pact'), T('Kolay kabul · 4 tur saldırmazlık', 'Easy to get · 4 turns without attacks'), (window.v20Pacted && v20Pacted(G.pl, e)) ? T('Aktif', 'Active') : WCPay.label(), 'wcdNap()') +
      rows('💰', T('Haraç Talep Et', 'Demand Tribute'), T('Zayıf devletlerden ödeme iste · 1 🎲', 'Ask weaker states to pay · 1 🎲'), tLeft() + '/' + MAX_TOT, 'wcdTribute()') +
      (coIdx(G.pl) >= 0 ? rows('🚪', T('İttifaktan Çık', 'Leave Alliance'), '', '', 'wcdLeave()', 'sm') : '');
    var d = document.createElement('div'); d.id = 'wdbub'; d.innerHTML = h; document.body.appendChild(d);
    var btn = document.querySelector('#panel .dipbtn'), r = btn ? btn.getBoundingClientRect() : { left: 12, top: innerHeight - 80, width: 120 };
    var w = Math.min(340, innerWidth - 16); d.style.width = w + 'px';
    d.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + 'px'; d.style.bottom = Math.max(8, innerHeight - r.top + 10) + 'px';
    d.addEventListener('click', function (x) { x.stopPropagation(); });
    setTimeout(function () { document.addEventListener('click', closeBubble, { once: true }); }, 0);
  };
  var _pn = panel;
  panel = function () {
    _pn.apply(this, arguments);
    try {
      if (!is5() || !G.sel || G.over || BSH || G.ph !== 'act') { closeBubble(); return; }
      var e = G.owner[G.sel]; if (typeof e !== 'string' || e === G.pl) return;
      var el = document.getElementById('panel'), bx = el && (el.querySelector('.v15a') || el.querySelector('.px')); if (!bx || el.querySelector('.dipbtn')) return;
      var env = el.querySelector('.envbtn'), h = '<button class="pactbtn envbtn dipbtn" onclick="wcdBubble(event)">🕊 ' + T('Diplomasi', 'Diplomacy') + '</button>';
      if (env) env.insertAdjacentHTML('afterend', h); else bx.insertAdjacentHTML('afterbegin', h);
    } catch (x) { }
  };

  window.WCD = {
    bloc: bloc, maxAlliance: MAXCO, side: side,
    war: war, rev: rev, clear: clearRev, tick: tick, allied: allied, allies: allies,
    // V45: arayüz (v41.js) ve gelecekteki olaylar için
    sig: colSig, coColor: coColor, neutral: NEUTRAL, tribLeft: tLeft, allyLeft: coLeft, tribMax: MAX_TOT, inclination: inclination, label: label,
    friend: frLevel, addFriend: addFriend, helpRequest: helpRequest, helpFulfilled: helpFulfilled, canAct: canAct, leave: function () { window.wcdLeave(); }
  };
})();
