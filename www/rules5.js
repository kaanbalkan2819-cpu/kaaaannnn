/* World Conquest v5 - saf kural modülü (UI'dan bağımsız; Node ve tarayıcıda çalışır)
   Özellik sırası: [Nüfus, Ordu, Ekonomi, Teknoloji, Diplomasi] */
(function (root) {
  'use strict';
  var STAT_NAMES = ['Nüfus', 'Ordu', 'Ekonomi', 'Teknoloji', 'Diplomasi'];

  function clampStat(v) { v = +v; return isFinite(v) && v > 0 ? v : 0; }

  // Tur başlangıcı: zar sonucu = hamle hakkı. Kullanılmayan hamleler taşınmaz, keşif hakkı sıfırlanır.
  function startTurn(T, roll) {
    T.turn = (T.turn || 0) + 1;
    T.roll = roll;
    T.moves = Math.max(0, roll | 0);
    T.attacked = false;   // V102: tur başına tek saldırı
    T.scouted = false; T.scouts = 0; T.sids = {};   // V24: tur başına MAX_SCOUTS keşif hakkı
    return T;
  }
  function spendMove(T) {
    if (T.moves <= 0) return false;
    T.moves--; return true;
  }
  // Keşif: tur başına en çok MAX_SCOUTS (2) kez, her biri bir hamle harcar. Bilgi kalıcı (kn) olarak açılır.
  var MAX_SCOUTS = 1;   // V24: tur başına keşif hakkı
  function canScout(T, targetOk, e) { return !T.scouted && T.moves > 0 && !!targetOk && !(e && T.sids && T.sids[e]); }
  function doScout(T, kn, p, e) {
    if (!canScout(T, true, e)) return false;
    spendMove(T); T.scouts = (T.scouts || 0) + 1; (T.sids = T.sids || {})[e] = 1; T.scouted = T.scouts >= MAX_SCOUTS;   // scouted = hak bitti
    kn[p] = kn[p] || {}; kn[p][e] = [1, 1, 1, 1, 1];
    return true;
  }
  // Saldırı: geçerli hedef değilse hamle HARCANMAZ.
  function canAttack(T, targets, tg) { return T.moves > 0 && !!targets[tg]; }
  function beginAttack(T, targets, tg) {
    if (!canAttack(T, targets, tg)) return false;
    return spendMove(T);
  }

  // Özellik KOPYALAMA: oyuncunun seçilen özelliği rakibin mevcut değerine EŞİTLENİR.
  // Toplama/çıkarma yok; rakip değişmez; diğer 4 özellik değişmez; tek sefer (token ile).
  function copyStat(state, playerKey, foeStatsSnapshot, idx) {
    // state: {stats:{key:[5]}, pend:{...}}; foeStatsSnapshot: yok olan devlet için son değerler
    if (idx < 0 || idx > 4 || idx !== Math.floor(idx)) return { ok: false, why: 'idx' };
    var pend = state.pend;
    if (!pend || pend.done) return { ok: false, why: 'already' };
    var foe = foeStatsSnapshot || pend.foeSnap;
    if (!foe) return { ok: false, why: 'nofoe' };
    var me = state.stats[playerKey];
    if (bonusCheck(me, foe).ok) return { ok: false, why: 'dominant' };   // 5/5 üstünlükte seçim yok: bonus otomatik (settleConquest)
    if (!(+foe[idx] > +me[idx])) return { ok: false, why: 'nothigher' };   // V13: yalnızca rakibin daha yüksek olduğu özellik
    var before = me[idx];
    me[idx] = clampStat(foe[idx]);       // eşitleme
    pend.done = true; pend.chosen = idx;
    return { ok: true, idx: idx, before: before, after: me[idx] };
  }

  // Fetih: toprağı devret; sahibi toprağı kalmadıysa devlet yok edilir. Seçim bekleyen kayıt (pend) açılır.
  function conquer(state, owner, tg, winner) {
    var loser = owner[tg];
    if (loser === winner) return null;
    var foeSnap = (state.stats[loser] || []).slice();
    owner[tg] = winner;
    var left = 0;
    for (var k in owner) if (owner[k] === loser) left++;
    var destroyed = left === 0;
    state.pend = { loser: loser, tg: tg, foeSnap: foeSnap, destroyed: destroyed, done: false };
    // Yok olan devletin istatistikleri tutulmaz (aktif listeden temizlenir) ama snapshot pend'de saklanır.
    return state.pend;
  }
  function removeDestroyed(state, key) { delete state.stats[key]; if (state.cx) delete state.cx[key]; }

  // Yenilgide toprak kaybı: saldırıya uğrayan hedefe önce kara komşu, yoksa en yakın (deterministik).
  function pickLoss(loser, tg, owner, nb, dist) {
    var own = [], k;
    for (k in owner) if (owner[k] === loser) own.push(k);
    if (!own.length) return null;
    var land = own.filter(function (id) { return (nb[tg] || []).indexOf(id) >= 0; });
    var pool = land.length ? land : own;
    pool.sort(function (a, b) { var d = dist(a, tg) - dist(b, tg); return d || (a < b ? -1 : 1); });
    return pool[0];
  }

  // Yapay zekâ: tek saldırı. Hedef puanı: zayıf (düşük ordu+teknoloji) ve küçük toprak tercih edilir.
  function aiChooseTarget(aiKey, targets, owner, statsOf, rnd) {
    var ids = Object.keys(targets);
    if (!ids.length) return null;
    var me = statsOf(aiKey), best = null, bs = -1e9;
    ids.forEach(function (id) {
      var d = statsOf(owner[id]);
      var sc = (me[1] + me[3]) - (d[1] + d[3]) + (rnd ? rnd() * 6 : 0);
      if (sc > bs) { bs = sc; best = id; }
    });
    return best;
  }


  // ---- Fetih sonrası EK %10 bonus (özellik kopyalamanın yerine geçmez; ayrı bir seçenektir) ----
  // Koşul: oyuncunun 5 özelliğinin TAMAMI, fethedilen devletin ilgili özelliğinden KESİN büyük olmalı.
  // Karşılaştırma, özellik kopyalama yapılmadan ÖNCEKİ değerlerle yapılır.
  function bonusCheck(me, foe) {
    var cmp = [], ok = true, i;
    for (i = 0; i < 5; i++) { var c = +me[i] > +foe[i]; cmp.push(c); if (!c) ok = false; }
    return { ok: ok, cmp: cmp, used: false };
  }
  // mevcut değer × 1,10; oyunun gösterim biçimine uygun olarak 1 ondalığa (yarım yukarı) yuvarlanır. 90 → 99
  function bonusValue(v) { return Math.round(+v * 11) / 10; }
  // Bonusu uygula: yalnızca hak kazanıldıysa, yalnızca bir kez, oyuncunun seçtiği tek özelliğe.
  function claimBonus(state, playerKey, bonus, idx, usedIds) {
    if (!bonus || !bonus.ok) return { ok: false, why: 'noright' };
    if (bonus.used || (usedIds && bonus.id != null && usedIds[bonus.id])) return { ok: false, why: 'already' };
    if (idx < 0 || idx > 4 || idx !== Math.floor(idx)) return { ok: false, why: 'idx' };
    var me = state.stats[playerKey], before = me[idx];
    me[idx] = bonusValue(before); bonus.used = true;
    if (usedIds && bonus.id != null) usedIds[bonus.id] = 1;
    return { ok: true, idx: idx, before: before, after: me[idx] };
  }

  // ---- Fetih çözümü: TEK karar noktası (arayüz yalnızca sonucu gösterir) ----
  // Karşılaştırma aynı kategoriler arasında ve KESİN büyüktür (eşitlik üstünlük sayılmaz).
  //  • 5/5 üstünlük  → oyuncudan seçim İSTENMEZ. Mevcut %10 bonus kuralı (değer × 1,10; 1 ondalık) beş özelliğe de otomatik, bir kez uygulanır.
  //                    Özellik kopyalama yapılmaz (kopyalama, üstün olunan değerleri düşürürdü). pend.done = true.
  //  • aksi halde    → mode 'choose': oyuncu rakipten bir özellik KOPYALAMAK zorundadır (pend.done olana dek fetih tamamlanmaz); bonus yok.
  function autoBonus(state, playerKey, bonus, usedIds, rnd) {
    if (!bonus || !bonus.ok) return { ok: false, why: 'noright' };
    if (bonus.used || (usedIds && bonus.id != null && usedIds[bonus.id])) return { ok: false, why: 'already' };
    var me = state.stats[playerKey], before = me.slice();
    var idx = Math.min(4, Math.floor((rnd || Math.random)() * 5));   // V13: eşit olasılıkla tek özellik
    me[idx] = bonusValue(before[idx]);
    bonus.used = true; if (usedIds && bonus.id != null) usedIds[bonus.id] = 1;
    return { ok: true, idx: idx, before: before, after: me.slice() };
  }
  // Rakibin oyuncudan KESİN yüksek olduğu özelliklerin indeksleri
  function higherIdx(me, foe) { var o = []; for (var i = 0; i < 5; i++) if (+foe[i] > +me[i]) o.push(i); return o; }
  // Ödülü reddet: fetih normal tamamlanır, değer değişmez
  function declineReward(pend) { if (!pend || pend.done) return { ok: false, why: 'already' }; pend.done = true; pend.declined = true; return { ok: true }; }
  function settleConquest(state, playerKey, pend, usedIds, rnd) {
    if (!pend || pend.done) return { mode: 'none' };
    var me = state.stats[playerKey];
    if (!me || !pend.foeSnap) return { mode: 'choose' };
    var b = bonusCheck(me, pend.foeSnap); b.id = pend.id; pend.bonus = b;
    if (!b.ok) {
      var hi = higherIdx(me, pend.foeSnap);
      if (!hi.length) { pend.done = true; pend.nohigher = true; return { mode: 'skip', bonus: b }; }   // rakip hiçbir özellikte yüksek değil: soru yok
      pend.hi = hi; return { mode: 'choose', bonus: b, hi: hi };
    }
    var r = autoBonus(state, playerKey, b, usedIds, rnd);
    pend.done = true; pend.auto = true;
    return { mode: 'auto', ok: r.ok, why: r.why, idx: r.idx, before: r.before, after: r.after, bonus: b };
  }

  var API = {
    autoBonus: autoBonus, settleConquest: settleConquest, higherIdx: higherIdx, declineReward: declineReward,
    bonusCheck: bonusCheck, bonusValue: bonusValue, claimBonus: claimBonus,
    STAT_NAMES: STAT_NAMES, startTurn: startTurn, spendMove: spendMove, canScout: canScout, doScout: doScout,
    canAttack: canAttack, beginAttack: beginAttack, copyStat: copyStat, conquer: conquer,
    removeDestroyed: removeDestroyed, pickLoss: pickLoss, aiChooseTarget: aiChooseTarget
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.R5 = API;
})(typeof window !== 'undefined' ? window : globalThis);
