/* World Conquest v5 yaması: tur zarı + hamle hakkı + tek keşif + tek saldırılık yapay zekâ + özellik KOPYALAMA
   app.js'in v4 yamasının üstüne biner; çok oyunculu (2 kişi) mod değişmez. */
(function () {
  'use strict';
  function T5(tr, en) { return L == 'tr' ? tr : en; }
  function SN(i) { return (t('S') || R5.STAT_NAMES)[i] || R5.STAT_NAMES[i]; }
  var SI5 = ['👥', '🎖', '💰', '🔬', '🕊'];
  function is5() { return !!G && G.v5 === 1; }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function dist5(a, b) { return d3.geo.distance(M[a].c, M[b].c); }
  function nbMap() { var o = {}; R.forEach(function (r) { o[r.id] = r.nb; }); return o; }
  function flatStats(e) { return st(e).slice(); }
  // V83: kalıcı yüzde değişimi (idxs: özellik indeksleri, pct negatif = düşüş); sonuç metni döner
  function cutStats(e, idxs, pct) {
    var cur = st(e); G.es = G.es || {};
    G.es[e] = cur.map(function (v, i) { return idxs.indexOf(i) >= 0 ? Math.round(v * (1 + pct / 100) * 1e6) / 1e6 : v; });
    if (G.ed) G.ed[e] = 0;
    return idxs.map(function (i) { return SN(i); }).join(' + ') + ' ' + pct + '%';
  }
  var CRISES = [
    { tr: 'Salgın hastalık', en: 'Epidemic', i: [0, 2], p: -12 },
    { tr: 'Ekonomik çöküş', en: 'Economic collapse', i: [2], p: -16 },
    { tr: 'Ordu isyanı', en: 'Army mutiny', i: [1], p: -14 },
    { tr: 'Diplomatik skandal', en: 'Diplomatic scandal', i: [4], p: -14 },
    { tr: 'Casusluk skandalı', en: 'Espionage leak', i: [3], p: -14 }
  ];
  function crisis5(e) {   // zar 1 = kriz turu: zorunlu olumsuz olay
    var c = CRISES[Math.floor(Math.random() * CRISES.length)], fx = cutStats(e, c.i, c.p);
    return '⚠ ' + T5(c.tr, c.en) + ' (' + fx + ')';
  }
  var LOSS_PEN = -8;   // yenilgi cezası: Ordu ve Diplomasi
  function lossPenalty(e) { if (ownedN(e) === 0) return ''; return '💔 ' + M[e].name + ': ' + cutStats(e, [1, 4], LOSS_PEN); }

  // ---------- yeni oyun ----------
  var _newGame5 = newGame;
  newGame = function (m) {
    if (m != 1) return _newGame5(m);
    var owner = {}; R.forEach(function (r) { owner[r.id] = r.id; });
    var cand = R.filter(function (r) { return DT[r.id] && BASE[r.id]; }), pick = null;
    for (var i = 0; i < 40 && !pick; i++) {
      var c = cand[Math.floor(Math.random() * cand.length)];
      if (c && Object.keys(targets(c.id, owner)).length) pick = c.id;
    }
    if (!pick) pick = cand[0].id;
    G = { mode: 1, v: 4, v5: 1, P: [{ s: [0, 0, 0, 0, 0], name: t('pl') + ' 1' }], owner: owner, cur: pick, act: pick, pl: pick,
      roll: 0, left: 0, ph: 'v5intro', pi: 1, noscout: 0, rv: {}, ed: {}, es: {}, kn: {}, st: [{ w: 0, l: 0, c: 0 }], el: 0, ts: Date.now(),
      sel: null, up: 0, cyc: 1, done: {}, boosts: 0, turn: 0, T: { turn: 0, roll: 0, moves: 0, scouted: false }, pend: null };
    OV = {}; BT = null; BSH = false; $('bs').style.display = 'none'; closeMod(); render(); home(0); save(); intro5();
  };
  function intro5() {
    var id = G.pl, b = st(id), h = '<div class="dh">' + fimg(id, 'lg') + '<div><h3 style="margin:0 0 6px">' + M[id].name + '</h3><span class="bdg me">' + t('own') + '</span></div></div>' +
      '<div style="color:var(--tx2);margin-bottom:6px">' + T5('Bu ülkeyi yönetiyorsun. Her tur bir zar atılır; sonuç kadar hamle hakkın olur.', 'You rule this country. Each turn a die sets your number of moves.') + '</div>';
    for (var i = 0; i < 5; i++) h += '<div class="stat"><span style="font-size:18px">' + SI5[i] + '</span><div><div>' + SN(i) + '</div><div class="bar"><i style="width:' + Math.min(100, b[i]) + '%"></i></div></div><b>' + v1(b[i]) + '</b></div>';
    modal(h + '<button class="big pri" onclick="v5Start()">' + T5('Başla', 'Start') + '</button>');
  }
  window.v5Start = function () { closeMod(); startPlayerTurn(); };

  // ---------- zar penceresi (mevcut CSS 3D zar) ----------
  function rollModal(title, sub, val, after, btn) {
    modal('<h3>' + title + '</h3><div style="text-align:center;padding:10px">' + die3d('v5d', '') + '</div><div id="v5r" style="text-align:center;min-height:70px;color:var(--tx2)">' + T5('Zar atılıyor…', 'Rolling…') + '</div>');
    var fin = false;
    var bx0 = $('box'); if (bx0) bx0.onclick = function () { if (!fin) done(); };   // V26: dokununca zar animasyonu atlanır
    function done() {
      if (fin) return; fin = true; setDie3('v5d', Math.min(6, val));
      $('v5r').innerHTML = '<div class="big2">' + val + '</div>' + sub + (btn ? '<button class="big pri" id="v5ok">' + btn + '</button>' : '');
      if (btn) $('v5ok').onclick = function () { closeMod(); after(); }; else setTimeout(function () { closeMod(); after(); }, 900);
    }
    AU.play('dice');
    if (SET.rm || !SET.spd) done(); else rollDie('v5d', Math.min(6, val), 1200, 1, done);
  }

  // ---------- V23: tur zarı otomatik atılmaz; kenardaki "Zar At" düğmesiyle atılır (harita serbestçe gezilebilir) ----------
  var PR = null;
  function offerRoll(title, sub, val, after, btn) { PR = { title: title, sub: sub, val: val, after: after, btn: btn }; showRollBtn(); }
  function showRollBtn() {
    var b = document.getElementById('rollbtn23');
    if (!b) { b = document.createElement('button'); b.id = 'rollbtn23'; b.className = 'rollbtn23'; document.body.appendChild(b); }
    var rbIc = '<span class="rb-d"><svg class="rb-die" viewBox="0 0 40 40" width="34" height="34"><defs><linearGradient id="rbG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3e50"/><stop offset="1" stop-color="#0b0c12"/></linearGradient><radialGradient id="rbP" cx=".35" cy=".3"><stop offset="0" stop-color="#fff3bf"/><stop offset=".5" stop-color="#e8c45a"/><stop offset="1" stop-color="#9a6b12"/></radialGradient></defs><rect x="3" y="3" width="34" height="34" rx="8" fill="url(#rbG)" stroke="#e3b94f" stroke-width="1.6"/><path d="M6 10Q6 6 10 6H24Q12 10 6 24z" fill="#fff" opacity=".16"/><g fill="url(#rbP)"><circle cx="13" cy="13" r="3"/><circle cx="27" cy="13" r="3"/><circle cx="20" cy="20" r="3"/><circle cx="13" cy="27" r="3"/><circle cx="27" cy="27" r="3"/></g></svg></span>';
    if (window.WCDice && WCDice.faceUri) rbIc = '<span class="rb-d"><img class="rb-die" alt="" draggable="false" src="' + WCDice.faceUri(5) + '"></span>';
    b.innerHTML = rbIc + '<span class="rb-t">' + T5('Zar At', 'Roll') + '</span>';
    b.onclick = function () { if (!PR || BSH || !G || G.ph != 'v5roll') return; var q = PR; PR = null; b.remove(); rollModal(q.title, q.sub, q.val, q.after, q.btn); };
  }
  window.v5RollResume = function () {     // kayıttan devam / render sonrası: düğme yoksa yeniden kur; faz değiştiyse kaldır
    var b = document.getElementById('rollbtn23');
    if (!G || G.v5 !== 1 || G.ph != 'v5roll' || G.over) { if (b) b.remove(); PR = null; return; }
    if (BSH) return;
    if (!PR) { var r = (G.T && G.T.roll) || 1; PR = { title: T5('Tur ', 'Turn ') + G.T.turn + ' — ' + M[G.pl].name, sub: T5('Bu tur <b>' + r + '</b> hamle hakkın var.<br><small>Saldırı ve keşif birer hamle harcar.</small>', 'You have <b>' + r + '</b> moves this turn.<br><small>Attacks and scouting cost one move each.</small>'), val: r, after: function () { G.ph = 'act'; home(); render(); save(); }, btn: T5('Başla', 'Go') }; }
    if (!b) showRollBtn();
  };

  // ---------- oyuncu turu ----------
  function startPlayerTurn() {
    if (G.mp && window.WCOnline && WCOnline.handoff()) return;   // ONLINE: AI fazı bitti, sıra diğer oyuncuya geçer
    G.endLock = 0; G.aiBusy = 0;
    // V56: zarda 6 gelirse tekrar atılır (üst üste 6 gelmeye devam ederse sürer, en çok 8 zar); hamle hakkı = zarların toplamı
    var rolls = [d6()], crisisTxt = '';   /* V59: tur zarında 6 gelince tekrar atma YOK (yalnızca savaş zarında var) */
    var roll = rolls.reduce(function (a, b) { return a + b; }, 0);
    R5.startTurn(G.T, roll); G.turn = G.T.turn; G.roll = roll; G.rolls56 = rolls; G.sel = null;
    if (roll === 1) crisisTxt = crisis5(G.pl);   // V83: kriz turu — 1 hamle + zorunlu olumsuz olay
    var ttl = T5('Tur ', 'Turn ') + G.T.turn + ' — ' + M[G.pl].name, goBtn = T5('Başla', 'Go');
    function sub(i) {
      if (i < rolls.length - 1) return T5('<b>6</b> geldi — tekrar atıyorsun!', '<b>6</b> — you roll again!');
      if (crisisTxt) return '<b>' + T5('KRİZ TURU!', 'CRISIS TURN!') + '</b> ' + T5('Yalnızca <b>1</b> hamlen var ve olumsuz bir olay yaşandı:', 'You only have <b>1</b> move and a negative event hit:') + '<br><b>' + crisisTxt + '</b>';
      return T5('Bu tur <b>' + roll + '</b> hamle hakkın var.', 'You have <b>' + roll + '</b> moves this turn.') + (rolls.length > 1 ? '<br><small>' + rolls.join(' + ') + ' = ' + roll + '</small>' : '') +
        '<br><small>' + T5('Saldırı ve keşif birer hamle harcar.', 'Attacks and scouting cost one move each.') + '</small>';
    }
    function finish() { G.ph = 'act'; home(); render(); save(); }
    function after(i) {
      return function () {
        if (i + 1 < rolls.length) rollModal(ttl, sub(i + 1), rolls[i + 1], after(i + 1), i + 1 === rolls.length - 1 ? goBtn : null);
        else finish();
      };
    }
    G.ph = 'v5roll'; save(); render();
    offerRoll(ttl, sub(0), rolls[0], after(0), rolls.length === 1 ? goBtn : null);
  }
  // "Turu Bitir": yalnızca oyuncunun turunu kapatır ve yapay zekâ turunu başlatır. Savaşı doğrudan başlatmaz;
  // savaş ancak aiTurn içinde yapay zekâ geçerli bir hedef seçip saldırı kararı verirse açılır.
  // G.endLock: çift tıklama / animasyon sırasında yeniden tıklama aynı turu iki kez bitiremez.
  window.v5EndAsk = function () {
    if (!is5() || G.ph != 'act' || G.busy || BSH || G.endLock) return;
    var left = G.T.moves, hasT = Object.keys(targets(G.pl, G.owner)).length > 0;
    if (left > 0 && hasT) {
      modal('<h3>' + T5('Turu bitir?', 'End turn?') + '</h3><p style="color:var(--tx2)">' +
        T5('Hâlâ <b>' + left + '</b> hamle hakkın var. Turu bitirirsen kalan hamleler kullanılamaz ve sıra rakibe geçer.',
          'You still have <b>' + left + '</b> move(s). Ending the turn forfeits them and passes play to the rival.') + '</p>' +
        '<button class="big pri" onclick="closeMod();v5End()">' + T5('Evet, turu bitir', 'Yes, end turn') + '</button>' +
        '<button class="big" onclick="closeMod()">' + T5('Hayır, devam et', 'No, keep playing') + '</button>');
      return;
    }
    window.v5End();
  };
  window.v5End = function () {
    if (!is5() || G.ph != 'act' || G.busy || BSH || G.endLock) return;
    G.endLock = 1;                       // aiTurn bitene / savaş kapanana kadar yeni "Turu Bitir" kabul edilmez
    G.ph = 'v5ai'; G.sel = null; render(); setTimeout(function () { if (window.V20 && window.V20.run) window.V20.run(); else aiTurn(); }, 150);
  };

  // Fetih çözümü: R5.settleConquest sonucunu oyun durumuna işler. Otomatik bonus G.autoBonus'a yazılır (arayüz bilgi verir).
  function applySettle(pend) {
    G.bonusUsed = G.bonusUsed || {};
    var S5 = { stats: {} }; S5.stats[G.pl] = flatStats(G.pl);
    var sr = R5.settleConquest(S5, G.pl, pend, G.bonusUsed);
    if (sr.mode == 'auto') {
      if (sr.ok) { G.es[G.pl] = S5.stats[G.pl]; G.ed[G.pl] = 0; }
      G.autoBonus = sr.ok ? { before: sr.before, after: sr.after, idx: sr.idx } : null;
    } else G.autoBonus = null;
    return sr;
  }
  // ---------- saldırı (oyuncu ve YZ ortak yol; sonuç önce hesaplanır, tek seferde uygulanır) ----------
  function attack5(att, tg, isAI) {
    if (!G || G.busy || BSH || !M[tg]) return false;
    if (isAI && G.ph != 'v5ai') return false;   // AI yalnızca kendi fazında saldırır
    var e = G.owner[tg]; if (e === att) return false;
    var T0 = targets(att, G.owner); if (!T0[tg]) return false;
    if (!isAI && T0[tg] === 'sea' && G.T.moves < 2) { toast(T5('Deniz aşırı saldırı 2 hamle ister', 'Overseas attacks cost 2 moves')); return false; }
    if (!isAI && !R5.beginAttack(G.T, T0, tg)) { toast(T5('Hamle hakkın kalmadı', 'No moves left')); return false; }
    if (!isAI && T0[tg] === 'sea') R5.spendMove(G.T);   // V83: deniz aşırı saldırı toplam 2 hamle
    G.busy = 1;
    var WS = window.WCD ? WCD.war(att, e) : null, A = WS ? WS.A : st(att), D = WS ? WS.D : st(e);
    if (isAI && e === 'ISR' && att !== 'ISR') A = A.map(function (x) { return x * 1.15; });   // V83: birlik bonusu (+%15)
    var r = battle(A, D, d6b(), d6b(), false, false), mv = null,
      eA = st(att)[2], eD = st(e)[2], mg = Math.abs(r.aw - r.dw), amt = repar(r.win ? eA : eD, r.win ? eD : eA, mg);
    r.rep = { w: r.win ? att : e, l: r.win ? e : att, amt: amt };
    var attIds = battleSides(att, tg);
    addEco(r.rep.w, amt); addEco(r.rep.l, -amt);
    OV = {}; OV[tg] = e; G.pend = null; G.autoBonus = null;
    var player = !isAI, loser;
    if (r.win) {
      loser = e;
      var S5 = { stats: {}, pend: null }; S5.stats[e] = st(e).slice();
      var pend = R5.conquer(S5, G.owner, tg, att);
      if (r.bA) delete G.rv[att + '>' + e]; delete G.rv[e + '>' + att];   /* V110: intikam/tekrar bonusu kaldırıldı */   // V84: bonus tek kullanımlık; bonusla kazanılan zafer yeni bonus vermez
      if (att === G.pl) {
        G.st[0].w++; G.st[0].c++; G.pend = pend;
        pend.id = (G.cqId = (G.cqId || 0) + 1);                  // her fetih ayrı kimlik: bonus çoğaltılamaz
        // KARAR (çekirdek, rules5.js): 5/5 üstünlük → seçim ekranı YOK, %10 bonus otomatik; aksi halde zorunlu özellik kopyalama.
        applySettle(pend);
      } else if (e === G.pl) { G.st[0].l++; }
      if (pend.destroyed) killEmpire(e);
      G.penTxt = pend.destroyed ? '' : lossPenalty(e);   // V83: yenilgi cezası (Ordu + Diplomasi)
    } else {
      loser = att;
      G.penTxt = '';
      mv = R5.pickLoss(att, tg, G.owner, nbMap(), dist5);
      if (mv) { G.owner[mv] = e; OV[mv] = att; if (ownedN(att) === 0) killEmpire(att); }
      // V83: oyuncu SAVUNMA savaşını kazanırsa saldıran ülke tümüyle fethedilir; tüm toprakları oyuncunun topraklarına katılır.
      if (e === G.pl && ownedN(att) > 0) {
        var _taken = 0;
        Object.keys(G.owner).forEach(function (id) { if (G.owner[id] === att) { G.owner[id] = e; OV[id] = att; _taken++; } });
        G.st[0].c += _taken;
        killEmpire(att);
      }
      if (e === G.pl && mv) G.st[0].c++;
      G.penTxt = lossPenalty(att);   // V83
      if (r.bD) delete G.rv[e + '>' + att]; delete G.rv[att + '>' + e];   /* V110 */   // V84
      if (att === G.pl) G.st[0].l++; else if (e === G.pl) { G.st[0].w++; }
    }
    if (att === G.pl || e === G.pl) { G.kn[G.pl] = G.kn[G.pl] || {}; var o2 = att === G.pl ? e : att; if (G.owner[tg] !== undefined) G.kn[G.pl][o2] = [1, 1, 1, 1, 1]; }
    G.last = { att: att, tg: tg, e: e, win: r.win, ai: !!isAI };
    check5(); var _ov38 = G.over; G.ph = 'v5battle'; G.busy = 0; if (_ov38) G.over = _ov38; save();   // V38: yenilgi/zafer bayrağı korunur
    showBattle(r, att, e, tg, mv, attIds);
    return true;
  }
  function killEmpire(e) { if (G.es) delete G.es[e]; if (G.ed) delete G.ed[e]; if (G.kn) { delete G.kn[e]; for (var k in G.kn) if (G.kn[k]) delete G.kn[k][e]; } if (G.done) delete G.done[e]; }
  function check5() {
    var n = ownedN(G.pl);
    if (G.mp && !G.mp.coop) {   // ONLINE (karşılıklı): kazanan, rakibin tüm topraklarını alan oyuncudur
      var on = ownedN(G.pl === G.mp.host ? G.mp.guest : G.mp.host);
      if (n === 0) G.over = { w: -1 }; else if (on === 0) G.over = { w: 0 };
      if (G.over) G.ph = 'over';
      return;
    }
    if (n === 0) G.over = { w: -1 }; else if (n === R.length) G.over = { w: 0 };
    if (G.over) { G.ph = 'over'; try { localStorage.removeItem(SV); } catch (e) { } }
  }
  var _doAttack5 = doAttack;
  doAttack = function () {
    if (!is5()) return _doAttack5();
    if (G.ph != 'act' || G.busy || BSH) return;
    if (!G.sel) return;
    attack5(G.pl, G.sel, false);
  };

  // ---------- keşif ----------
  var _scout5 = scout;
  scout = function () {
    if (!is5()) return _scout5();
    var tg = G.sel; if (!tg || !TG[tg]) return toast(t('nopts'));
    if (G.T.scouted) return toast(T5('Keşif hakkınız yok: bu tur keşif hakkınız bitti (2/2)', 'You have no scouts left this turn (2/2)'));
    if (G.T.moves <= 0) return toast(T5('Hamle hakkın kalmadı', 'No moves left'));
    var e = G.owner[tg];
    if (G.T.sids && G.T.sids[e]) return toast(T5('Bu ülkeyi bu tur zaten keşfettin', 'You already scouted this nation this turn')); if (R5.doScout(G.T, G.kn, G.pl, e)) { save(); render(); }
  };

  // ---------- savaş sonrası akış ----------
  var _closeBattle5 = closeBattle;
  closeBattle = function () {
    var was = is5() && G.ph == 'v5battle', L0 = G && G.last;
    _closeBattle5();
    if (was && G && G.penTxt) { var _pt = G.penTxt; G.penTxt = ''; setTimeout(function () { toast(T5('Yenilgi cezası: ', 'Defeat penalty: ') + _pt); }, 150); }
    if (!was || !G) return;
    if (G.over) { showOver(); return; }
    if (L0 && L0.ai) { if (window.V20 && window.V20.after && window.V20.after()) return; startPlayerTurn(); return; }
    if (G.pend && !G.pend.done) { G.ph = 'v5pick'; showPick(); return; }
    G.ph = 'act'; render(); save();
    if (G.autoBonus) { toast(autoBonusTxt(G.autoBonus)); G.autoBonus = null; save(); }
    else if (G.T.moves <= 0) toast(T5('Hamlen bitti — turu bitirebilirsin', 'Out of moves — end your turn'));
  };
  function autoBonusTxt(b) {
    if (b && b.idx != null) return '🎁 ' + T5('Beş özellikte de üstünsün: ', 'You lead in all five stats: ') + SN(b.idx) + ' ' + v1(b.before[b.idx]) + ' → ' + v1(b.after[b.idx]) + ' (+%10)';
    return '🎁 ' + T5('Beş özellikte de üstünsün: bir özelliğe +%10 verildi', 'You lead in all five stats: +10% on one stat');
  }
  function showPick() {
    var p = G.pend, me = st(G.pl), foe = p.foeSnap, hi = R5.higherIdx(me, foe), h = '<h3>' + T5('Savaşı kazandın!', 'You won the battle!') + '</h3>' +
      '<div style="color:var(--tx2);margin-bottom:6px">' + M[p.tg].name + (p.destroyed ? T5(' — ' + M[p.loser].name + ' tamamen yok edildi.', ' — ' + M[p.loser].name + ' was destroyed.') : T5(' ele geçirildi. Rakip: ', ' captured. Rival: ') + M[p.loser].name) + '<br>' +
      T5('Rakibin senden daha yüksek değerlere sahip olduğu bir özelliğini almak ister misin? Seçtiğin özellik, rakibin o andaki değerine eşitlenir (rakip değişmez).', 'Do you want to take a stat where the rival is higher than you? The stat you pick is set to the rival\'s current value (the rival is unchanged).') + '</div>';
    hi.forEach(function (i) { h += '<button class="big" onclick="v5Pick(' + i + ')" style="display:flex;justify-content:space-between;align-items:center"><span>' + SI5[i] + ' ' + SN(i) + '</span><span>' + v1(me[i]) + ' → <b>' + v1(foe[i]) + '</b></span></button>'; });
    modal(h + '<button class="big ghost" onclick="v5Decline()">' + T5('Vazgeç (ödül alma)', 'Decline (no reward)') + '</button>');
  }
  window.v5Decline = function () {
    if (!is5() || !G.pend || G.pend.done) return;
    R5.declineReward(G.pend); G.pend = null; closeMod(); G.ph = 'act'; save(); render();
    if (G.T.moves <= 0) setTimeout(function () { toast(T5('Hamlen bitti — turu bitirebilirsin', 'Out of moves — end your turn')); }, 400);
  };
  window.v5Pick = function (i) {
    if (!is5() || !G.pend || G.pend.done) return;
    var S5 = { stats: {}, pend: G.pend }; S5.stats[G.pl] = flatStats(G.pl);
    var before = S5.stats[G.pl][i], r = R5.copyStat(S5, G.pl, null, i);
    if (!r.ok) return;
    var bn = G.pend.bonus;
    G.es[G.pl] = S5.stats[G.pl]; G.ed[G.pl] = 0; G.pend = null; closeMod();
    toast(SN(i) + ': ' + v1(before) + ' → ' + v1(r.after));
    G.bonusUsed = G.bonusUsed || {};
    if (bn && bn.ok && !bn.used && !G.bonusUsed[bn.id]) { G.bpend = bn; G.ph = 'v8bonus'; save(); render(); if (window.v8Bonus) window.v8Bonus(); return; }
    G.ph = 'act'; save(); render();
    if (G.T.moves <= 0) setTimeout(function () { toast(T5('Hamlen bitti — turu bitirebilirsin', 'Out of moves — end your turn')); }, 2700);
  };
  // %10 bonus seçimi (ayrı aşama). idx: oyuncunun seçtiği özellik.
  window.v5Bonus = function (idx) {
    if (!is5() || G.ph != 'v8bonus' || !G.bpend) return false;
    G.bonusUsed = G.bonusUsed || {};
    var S5 = { stats: {} }; S5.stats[G.pl] = flatStats(G.pl);
    var r = R5.claimBonus(S5, G.pl, G.bpend, idx, G.bonusUsed);
    if (!r.ok) return false;
    G.es[G.pl] = S5.stats[G.pl]; G.ed[G.pl] = 0; G.bpend = null; G.ph = 'act'; closeMod(); save(); render();
    toast('🎁 ' + SN(idx) + ': ' + v1(r.before) + ' × 1,10 = ' + v1(r.after));
    return r;
  };

  // ---------- yapay zekâ turu: tek saldırı, stratejik hedef seçimi (V13) ----------
  // Puan = %30 hedef değeri (BASE nüfus+ekonomi) + %25 kazanma olasılığı (36 zar sonucu üzerinden, mevcut battle())
  //      + %20 oyuncuyu sıkıştırma (bağlantı kesme / açık sınır / oyuncunun genişleme hedefini kapma)
  //      + %15 kendi toprağını birleştirme (hedefin komşularının kaçı saldıranda) + %10 kontrollü rastgelelik.
  function winProb(att, e, cache) {
    var key = att + '>' + e; if (cache[key] != null) return cache[key];
    var A = st(att), D = st(e), bA = !!G.rv[key], bD = !!G.rv[e + '>' + att], w = 0, x, y;
    for (x = 1; x <= 6; x++) for (y = 1; y <= 6; y++) if (battle(A, D, x, y, bA, bD).win) w++;
    return (cache[key] = w / 36);
  }
  function cutsPlayer(tg) {   // tg alınırsa oyuncunun kara bağlantılı toprağı bölünür mü? (küçük sınırlı BFS)
    var pnb = M[tg].nb.filter(function (n) { return G.owner[n] === G.pl; });
    if (pnb.length < 2) return 0;
    var seen = {}, q = [pnb[0]], need = {}, got = 1, cnt = 1;
    seen[pnb[0]] = 1; seen[tg] = 1; pnb.forEach(function (n) { need[n] = 1; });
    while (q.length && got < pnb.length && cnt < 600) {
      var c = q.pop();
      M[c].nb.forEach(function (n) { if (!seen[n] && G.owner[n] === G.pl) { seen[n] = 1; cnt++; q.push(n); if (need[n]) got++; } });
    }
    return got < pnb.length ? 1 : 0;
  }
  function aiPlan(rnd) {
    rnd = rnd || Math.random;
    var al = aliveEmp().filter(function (e) { return e !== G.pl; }), pT = targets(G.pl, G.owner), cands = [], cache = {}, maxV = 1;
    al.forEach(function (ae) {
      var T = targets(ae, G.owner);
      Object.keys(T).forEach(function (tg) {
        var de = G.owner[tg]; if (de === ae || !M[tg]) return;
        var b = BASE[tg] || [0, 0, 0, 0, 0], v = (+b[0] || 0) + (+b[2] || 0); if (v > maxV) maxV = v;
        cands.push({ ae: ae, tg: tg, de: de, v: v });
      });
    });
    var out = [];
    cands.forEach(function (c) {
      var wp = winProb(c.ae, c.de, cache); if (wp < (c.de === 'ISR' ? 0.08 : 0.2)) return;            // mantıksız saldırı yok
      var nb = M[c.tg].nb, n = Math.max(1, nb.length), mine = 0, notPl = 0;
      nb.forEach(function (x) { if (G.owner[x] === c.ae) mine++; if (G.owner[x] !== G.pl) notPl++; });
      var sq = c.de === G.pl ? Math.min(1, 0.5 * cutsPlayer(c.tg) + 0.5 * (notPl / n)) : (pT[c.tg] ? 0.5 : 0);
      var sc = 0.30 * (c.v / maxV) + 0.25 * wp + 0.20 * sq + 0.15 * (mine / n) + 0.10 * rnd();
      if (G.aiFocus && G.aiFocus.e === c.de && G.aiFocus.n >= 2) sc -= 0.08;   // aynı rakibe takılıp kalma
      if (c.de === 'ISR' && c.ae !== 'ISR') sc += 0.45;   // V83: İsrail'e karşı genel birlik: tüm YZ devletleri onu hedef alır
      c.wp = wp; c.sq = sq; c.sc = sc; out.push(c);
    });
    if (!out.length) return null;
    out.sort(function (a, b) { return b.sc - a.sc; });
    var top = out.slice(0, 3), tot = 0; top.forEach(function (c) { c.w = Math.max(.001, c.sc) * Math.max(.001, c.sc); tot += c.w; });
    var r = rnd() * tot; for (var i = 0; i < top.length; i++) { r -= top[i].w; if (r <= 0) return top[i]; }
    return top[0];
  }
  function aiTurn() {
    if (!is5() || G.ph != 'v5ai' || G.aiBusy) return;
    G.aiBusy = 1;                                    // tur kilidi: bu AI turunda tek karar
    var plan = aiPlan();
    if (!plan) { toast(T5('Rakip saldırı yapamadı', 'The rival could not attack')); startPlayerTurn(); return; }
    var ai = plan.ae, roll = d6(), aiCr = roll === 1 ? crisis5(ai) : '';   // V83: YZ da kriz turu yaşar
    rollModal(T5('Rakip: ', 'Rival: ') + M[ai].name, aiCr ? '<b>' + T5('KRİZ TURU!', 'CRISIS TURN!') + '</b> ' + aiCr : T5('Rakibin tur zarı. <b>Bu sürümde yalnızca 1 saldırı</b> yapar.', 'Rival\'s turn die. <b>Attacks this turn: 1</b>.'), roll, function () {
      if (!is5() || G.ph != 'v5ai') return;   // yalnızca bu AI turunda, bir kez
      var ok = targets(ai, G.owner)[plan.tg] && G.owner[plan.tg] === plan.de && !(targets(ai, G.owner)[plan.tg] === 'sea' && roll < 2);   // V83: deniz aşırı saldırı 2 hamle ister   // karar anında hâlâ geçerli mi
      if (!ok || !attack5(ai, plan.tg, true)) { toast(T5('Rakip saldırı yapamadı', 'The rival could not attack')); startPlayerTurn(); return; }
      G.aiFocus = (G.aiFocus && G.aiFocus.e === plan.de) ? { e: plan.de, n: G.aiFocus.n + 1 } : { e: plan.de, n: 1 };
    }, T5('Saldırıyı gör', 'See attack'));
  }

  // ---------- render / hud sarmalayıcıları ----------
  var _render5 = render;
  render = function () {
    if (!is5()) return _render5();
    if (!G) return;
    G.noscout = (G.T.scouted || G.T.moves <= 0) ? 1 : 0;
    TG = G.ph == 'act' ? targets(G.pl, G.owner) : {};
    hud(); paint(); panel(); hint();
  };
  var _hud5 = hud;
  hud = function () {
    if (!is5()) return _hud5();
    var T = G.T, h = '<span class="chip pl" style="background:' + col(G.pl) + '">' + fimg(G.pl, 'sm') + ' <b style="color:#fff">' + M[G.pl].name + '</b></span>' +
      '<span class="chip" title="' + T5('Kalan hamle', 'Moves left') + '">⚔ <b>' + T.moves + '</b></span>' +
      '<span class="chip" title="' + T5('Keşif hakkı', 'Scout available') + '">🔍 <b>' + (T.scouted ? '✖' : (2 - (T.scouts || 0))) + '</b></span>' +
      '<span class="chip" title="' + T5('Toprak', 'Territories') + '">🏳 <b>' + ownedN(G.pl) + '</b><span class="lab">/' + R.length + '</span></span>';
    $('hud').innerHTML = h + '<span class="sp"></span><button class="hb" onclick="settings()">' + IC.set + '</button><button class="hb" onclick="menu()">' + IC.menu + '</button>';
  };

  // ---------- kayıttan devam ----------
  var _cont5 = cont;
  cont = function () {
    _cont5();
    if (!G || !G.v5) return;
    if (!G.kn || Array.isArray(G.kn)) G.kn = {};
    if (!G.T) G.T = { turn: 0, roll: 0, moves: 0, scouted: false };
    G.act = G.cur = G.pl; G.busy = 0; G.endLock = 0; BSH = false;
    closeMod();
    // Eski kayıtlar: bekleyen fetih / bekleyen bonus seçimi yeni kurala göre çözülür (5/5 üstünlükte seçim sorulmaz).
    var legacy = false;
    if (G.pend && !G.pend.done) { var sr = applySettle(G.pend); if (sr.mode == 'auto') { legacy = true; if (sr.ok) toast(autoBonusTxt(G.autoBonus)); } G.autoBonus = null; }
    if (G.bpend && !G.bpend.used) {
      G.bonusUsed = G.bonusUsed || {}; var S6 = { stats: {} }; S6.stats[G.pl] = flatStats(G.pl);
      var ar = R5.autoBonus(S6, G.pl, G.bpend, G.bonusUsed); if (ar.ok) { G.es[G.pl] = S6.stats[G.pl]; G.ed[G.pl] = 0; toast(autoBonusTxt()); }
      G.bpend = null; legacy = true; if (G.ph == 'v8bonus') G.ph = 'act';
    }
    if (G.pend && !G.pend.done) { G.ph = 'v5pick'; render(); showPick(); return; }
    G.ph = 'act'; render(); home(0); if (legacy) save();
    if (!G.T.turn) startPlayerTurn();
  };
  // v5 testleri için dışa açılan küçük API
  window.V5 = { plan: aiPlan, settle: applySettle, attack: attack5, ai: aiTurn, start: startPlayerTurn, is5: is5, check: check5 };
})();
