/* V17: POLİTİKALAR. Yalnızca oyuncunun kendi ülkesinde (G.pl) uygulanır. Temel değer (G.es/G.ed) ile geçici bonus (G.pol) AYRI tutulur.
   - Geçici bonus st() sarmalayıcısında hesaplanır (hiçbir yere yazılmaz) => zar/yenileme/yeniden açılışta tekrar eklenemez.
   - Uygulamak oyuncunun turunu harcar. Bonus 3 oyuncu zarı boyunca aktif kalır.
   - İlk oyuncu-dahil savaş: kazanıldı => BAŞARILI (+%10 temel değere kalıcı, tek sefer); kaybedildi => BAŞARISIZ (geçici bonus kalkar, eski kalıcı bonuslar kalır).
   - 3 zar içinde savaş olmazsa => SONUÇSUZ (süre doldu): bonus kalkar, kalıcı bonus yok; politika yeniden uygulanabilir.
   Özellik sırası: [Nüfus0, Ordu1, Ekonomi2, Teknoloji3, Diplomasi4]. Oyunda "İstikrar" değeri yok; yeni sistem eklenmedi: İç Cephe Güvencesi Nüfus + Ekonomi'ye (iç cephe) %10 verir. */
(function () {
  'use strict';
  var DICE = 3, PCT = 0.1;
  function T(tr, en) { return L == 'tr' ? tr : en; }
  var POL = [
    { id: 'nufus', tr: 'Acil Nüfus Seferberliği', en: 'Emergency Population Mobilization', st: [0], dtr: 'Nüfus değerini %10 artırır.', den: 'Raises Population by 10%.' },
    { id: 'eko', tr: 'Hazine Rezervlerinin Çözülmesi', en: 'Release of Treasury Reserves', st: [2], dtr: 'Ekonomi değerini %10 artırır.', den: 'Raises Economy by 10%.' },
    { id: 'ordu', tr: 'Yıldırım Seferberliği', en: 'Lightning Mobilization', st: [1], dtr: 'Ordu değerini %10 artırır.', den: 'Raises Army by 10%.' },
    { id: 'ist', tr: 'İç Cephe Güvencesi', en: 'Home Front Assurance', st: [0, 2], dtr: 'İstikrar: oyunda ayrı istikrar değeri olmadığından Nüfus ve Ekonomi (iç cephe) değerlerini %10 artırır.', den: 'Stability: the game has no separate stability stat, so Population and Economy (home front) rise 10%.' },
    { id: 'dip', tr: 'Kapalı Kapılar Diplomasisi', en: 'Closed-Door Diplomacy', st: [4], dtr: 'Diplomasi değerini %10 artırır.', den: 'Raises Diplomacy by 10%.' },
    { id: 'tek', tr: 'Ulusal Teknoloji Atılım Programı', en: 'National Technology Breakthrough', st: [3], dtr: 'Teknoloji değerini %10 artırır.', den: 'Raises Technology by 10%.' }
  ];
  function P(id) { for (var i = 0; i < POL.length; i++) if (POL[i].id == id) return POL[i]; return null; }
  /* V109: YÜZEY ALANI ÇARPANI — ülkenin toplam toprak alanı (sahip olunan ülkelerin ortalamasına göre) büyüdükçe diplomasi/politika etkisi artar (0.8 .. 1.4). */
  function areaF(e) {
    try {
      var by = {}, n = 0, tot = 0, id;
      for (id in G.owner) { var o = G.owner[id]; if (typeof o !== 'string' || !M[id]) continue; if (!(o in by)) { by[o] = 0; n++; } by[o] += (M[id].ar || 0); tot += (M[id].ar || 0); }
      if (!n || !tot || !(by[e] > 0)) return 1;
      var r = by[e] / (tot / n); return Math.max(0.8, Math.min(1.4, 1 + 0.2 * Math.log(r) / Math.log(4)));
    } catch (x) { return 1; }
  }
  window.WCAreaF = areaF;
  function is5() { return !!G && G.v5 === 1 && G.pl; }
  function pol() {   // V104: online (G.mp) iki oyuncunun politika durumu AYRI tutulur (eskiden tek ortak nesneydi: rakibin bonusu/sayacı sana karışırdı)
    var o; if (G.mp) { G.polBy = G.polBy || {}; o = G.polBy[G.pl] || (G.polBy[G.pl] = { act: {}, last: {} }); } else { if (!G.pol) G.pol = { act: {}, last: {} }; o = G.pol; }
    if (!o.act) o.act = {}; if (!o.last) o.last = {}; return o; }
  function SN(i) { return ((typeof t == 'function' && t('S')) || R5.STAT_NAMES)[i] || R5.STAT_NAMES[i]; }
  function statTxt(p) { return p.st.map(SN).join(' + '); }
  /* V160: TOPRAK BAŞINA POLİTİKA. Anahtar: oyuncunun ana ülkesi için eski gibi 'id'; sonradan fethedilen toprak için 'TOPRAK|id'.
   Etki her zarda bir seviye düşer: rem 3 -> %100, 2 -> %75, 1 -> %50, 0 -> %25. Toprak elden çıkarsa o topraktaki politika silinir. */
  var MAXACT = 3, MAXSTACK = 3;   // <<< AYAR: aynı anda en çok 3 aktif politika; bir değerde en çok +%30 geçici bonus
  function parse(k) { k = String(k); var i = k.indexOf('|'); return i < 0 ? { land: G.pl, id: k } : { land: k.slice(0, i), id: k.slice(i + 1) }; }
  function mkKey(land, id) { return land === G.pl ? id : land + '|' + id; }
  function fade(a) { return (Math.max(0, a.rem | 0) + 1) / (DICE + 1); }
  function eff(a) { return (a.f || 1) * fade(a); }
  function qs(x) { return String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
  function lname(l) { try { return M[l].name; } catch (e) { return String(l); } }
  function prune() {
    try {
      if (!is5() || !G.owner) return;
      var o = pol(), a = o.act, k, ps, p;
      for (k in a) {
        ps = parse(k);
        if (G.owner[ps.land] !== G.pl) { p = P(ps.id); delete a[k]; delete o.last[k]; note('🏳 ' + T(lname(ps.land) + ' elden çıktı: ' + (p ? p.tr : ps.id) + ' politikası kalktı', lname(ps.land) + ' was lost: ' + (p ? p.en : ps.id) + ' policy removed')); }
      }
    } catch (e) { }
  }
  function landActive(land) { var n = 0, a = pol().act, k; for (k in a) if (parse(k).land === land) n++; return n; }
  function counts() { var c = [0, 0, 0, 0, 0]; if (!is5()) return c; prune(); var a = pol().act; for (var k in a) { var p = P(parse(k).id); if (p) { var e = eff(a[k]); p.st.forEach(function (i) { c[i] += e; }); } } for (var j = 0; j < 5; j++) if (c[j] > MAXSTACK) c[j] = MAXSTACK; return c; }

  // ---- geçici bonus: yalnızca okuma anında (temel değere dokunmaz) ----
  var _st = st;
  st = function (e) {
    var s = _st(e);
    if (!is5() || e !== G.pl || typeof e == 'number') return s;
    var c = counts(); for (var i = 0; i < 5; i++) if (c[i]) s[i] = s[i] * (1 + PCT * c[i]);
    return s;
  };
  // ---- mevcut kalıcı bonus/kopyalama kodları st()'yi okuyup G.es'e yazar: geçici bonusu temel değere SIZDIRMAMAK için çıkar ----
  function strip(state) {
    if (!is5() || !state || !state.stats || !state.stats[G.pl]) return;
    var c = counts(), s = state.stats[G.pl]; for (var i = 0; i < 5; i++) if (c[i]) s[i] = s[i] / (1 + PCT * c[i]);
  }
  ['settleConquest', 'copyStat', 'autoBonus'].forEach(function (n) {
    if (!window.R5 || !R5[n]) return; var o = R5[n];
    R5[n] = function (state) { try { strip(state); } catch (e) { } return o.apply(this, arguments); };
  });

  // ---- bildirim kuyruğu (savaş ekranı kapanınca gösterilir) ----
  var Q = [];
  function note(m) { Q.push(m); }
  var _rd = render;
  render = function () { var r = _rd.apply(this, arguments); try { prune(); if (Q.length && !BSH && !G.busy) { var m = Q.join('  •  '); Q = []; setTimeout(function () { toast(m); }, 300); } } catch (e) { } return r; };

  // ---- sonuçlandırma ----
  function resolve(win) {
    var pl = pol(), ids = Object.keys(pl.act); if (!ids.length) return;
    ids.forEach(function (key) {
      var ps = parse(key), p = P(ps.id), af = pl.act[key] ? eff(pl.act[key]) : 1; delete pl.act[key];     // önce aktiften çıkar: kalıcılaştırma tek sefer
      if (!p) return;
      var where = ps.land === G.pl ? '' : ' [' + lname(ps.land) + ']';
      if (win) {
        var raw = _st(G.pl).slice(); G.es = G.es || {}; G.ed = G.ed || {};
        p.st.forEach(function (i) { raw[i] = raw[i] * (1 + PCT * af); });
        G.es[G.pl] = raw; G.ed[G.pl] = 0; pl.last[key] = 'ok';
        note('✅ ' + T(p.tr + where + ' başarılı: bonus kalıcı oldu (' + statTxt(p) + ')', p.en + where + ' succeeded: bonus is now permanent (' + statTxt(p) + ')'));
      } else {
        pl.last[key] = 'fail';
        note('❌ ' + T(p.tr + where + ' başarısız: savaş kaybedildi, geçici bonus kaldırıldı', p.en + where + ' failed: battle lost, temporary bonus removed'));
      }
    });
  }
  if (window.R5 && R5.conquer) {
    var _cq = R5.conquer;
    R5.conquer = function (state, owner, tg, winner) {
      var loser = owner[tg], r = _cq.apply(this, arguments);
      try { if (is5() && r) { if (winner === G.pl) resolve(true); else if (loser === G.pl) resolve(false); } } catch (e) { }
      return r;
    };
  }
  if (window.R5 && R5.pickLoss) {
    var _pk = R5.pickLoss;
    R5.pickLoss = function (l, tg, ow) {
      try { if (is5()) { if (l === G.pl) resolve(false); else if (ow[tg] === G.pl) resolve(true); } } catch (e) { }
      return _pk.apply(this, arguments);
    };
  }
  // ---- süre: her oyuncu zarında 1 azalır; 0'dayken yeni zar gelirse savaşsız bitti ----
  if (window.R5 && R5.startTurn) {
    var _s = R5.startTurn;
    R5.startTurn = function () {
      var r = _s.apply(this, arguments);
      try {
        if (is5()) {
          var pl = pol();
          Object.keys(pl.act).forEach(function (id) {
            var a = pl.act[id], p = P(parse(id).id);
            if (a.rem <= 0) { delete pl.act[id]; pl.last[id] = 'exp'; note('⌛ ' + T((p ? p.tr : id) + ': 3 zar içinde savaş sonucu oluşmadı → SONUÇSUZ; bonus kalktı, kalıcı bonus verilmedi', (p ? p.en : id) + ': no battle within 3 dice → INCONCLUSIVE; bonus removed, nothing made permanent')); }
            else a.rem--;
          });
        }
      } catch (e) { }
      return r;
    };
  }

  // ---- arayüz ----
  var _pn = panel;
  panel = function () {
    _pn();
    try {
      if (!is5() || !G.sel || G.over || BSH) return;
      var el = $('panel'), bx = el && (el.querySelector('.v15a') || el.querySelector('.px')); if (!bx || el.querySelector('.polbtn')) return;
      if (G.owner && G.owner[G.sel] === G.pl) {   // V160: fethedilen topraklarda da Politikalar
        var n = landActive(G.sel);
        bx.insertAdjacentHTML('afterbegin', '<button class="polbtn" style="flex:1 1 100%" onclick="polMenu(\'' + qs(G.sel) + '\')">📜 ' + T('Politikalar', 'Policies') + (n ? ' (' + n + ')' : '') + '</button>');
      }
    } catch (e) { }
  };
  function stTxt(id) {
    var a = pol().act[id], l = pol().last[id];
    if (a) return '<span class="tag ok">🟢 ' + T('Aktif', 'Active') + '</span>';
    if (l == 'ok') return '<span class="tag ok">✅ ' + T('Başarılı', 'Successful') + '</span>';
    if (l == 'fail') return '<span class="tag no">❌ ' + T('Başarısız', 'Failed') + '</span>';
    if (l == 'exp') return '<span class="tag">⌛ ' + T('Sonuçsuz', 'Inconclusive') + '</span>';
    return '<span class="tag">' + T('Hazır', 'Ready') + '</span>';
  }
  var POL_MOVES = 2, POL_GOLD = 35;   // <<< AYAR: her politika 2 hamle ya da (hamle yetmezse) altınla alınır. V104: bir zar atışında (turda) yalnızca 1 politika
  function usedNow(land) { if (!(G && G.T)) return false; var o = pol(); land = land || G.pl; return (o.ut && o.ut[land] === G.T.turn) || (land === G.pl && o.usedTurn === G.T.turn); }   // V160: toprak başına   // V104: bu tur politika kullanıldı mı
  var PIC = ['👥', '🎖', '💰', '🔬', '🕊'], PCL = ['#4aa3ff', '#ff6b5a', '#ffd24a', '#8a7bff', '#4fe0a0'];
  function gold() { return window.Gold ? Gold.get() : 0; }
  window.polMenu = function (land) {
    if (!is5()) return;
    land = (typeof land === 'string' && G.owner && G.owner[land] === G.pl) ? land : ((G.sel && G.owner && G.owner[G.sel] === G.pl) ? G.sel : G.pl);
    var nAct = Object.keys(pol().act).length;
    var can = G.ph == 'act' && !G.busy && !BSH && !G.endLock, mv = (G.T && G.T.moves) || 0, g = gold();
    var h = '<div class="polx"><div class="polhd"><b>📜 ' + T('Politikalar', 'Policies') + '</b><span class="polsub">' + lname(land) + '</span>' +
      '<button class="polcl" onclick="closeMod()" aria-label="close">✕</button></div>' +
      '<div class="polbar"><span>🎲 ' + T('Hamle', 'Moves') + ': <b>' + mv + '</b></span><span>🪙 ' + T('Altın', 'Gold') + ': <b>' + g + '</b></span></div>' +
      '<div class="polinfo">' + T('Her politika <b>' + POL_MOVES + ' hamle</b> harcar; hamlen yetmezse <b>' + POL_GOLD + ' 🪙</b> ile alınır. Bir zar atışında her toprakta yalnızca <b>1</b> politika uygulanabilir (aynı anda en çok ' + MAXACT + ' aktif). +%10 bonus 3 zar sürer, her zarda bir seviye zayıflar (%100→75→50→25); ilk savaş kazanılırsa kalıcı olur. Toprak elden çıkarsa o topraktaki politikalar kalkar.', 'Each policy costs <b>' + POL_MOVES + ' moves</b>, or <b>' + POL_GOLD + ' 🪙</b> if you lack moves. Only <b>1</b> policy per land per roll (max ' + MAXACT + ' active). The +10% lasts 3 dice, fades one step each roll (100→75→50→25%) and becomes permanent after a won battle. If the land is lost, its policies are removed.') + '</div>' +
      '<div class="polscroll">';
    POL.forEach(function (p, ix) {
      var key = mkKey(land, p.id), a = pol().act[key], c = PCL[p.st[0]], ic = p.st.map(function (i) { return PIC[i]; }).join('');
      var btn;
      if (a) btn = '<button class="polgo on" disabled>🟢 ' + T('Aktif', 'Active') + '</button>';
      else if (!can) btn = '<button class="polgo" disabled>' + T('Kendi turunda', 'On your turn') + '</button>';
      else if (!a && nAct >= MAXACT) btn = '<button class="polgo" disabled>⛔ ' + T('En çok ' + MAXACT + ' aktif politika', 'Max ' + MAXACT + ' active policies') + '</button>';
      else if (usedNow(land)) btn = '<button class="polgo" disabled>⛔ ' + T('Bu zarda kullanıldı', 'Used this roll') + '</button>';
      else if (mv >= POL_MOVES) btn = '<button class="polgo" onclick="polAsk(\'' + p.id + '\',\'moves\',\'' + qs(land) + '\')">🎲 ' + T('Uygula', 'Apply') + ' · ' + POL_MOVES + ' ' + T('hamle', 'moves') + '</button>';
      else if (g >= POL_GOLD) btn = '<button class="polgo gold" onclick="polAsk(\'' + p.id + '\',\'gold\',\'' + qs(land) + '\')">🪙 ' + T('Satın al', 'Buy') + ' · ' + POL_GOLD + '</button>';
      else btn = '<button class="polgo shop" onclick="Shop.open()">🛒 ' + T('Altın yetersiz — Dükkan', 'Not enough gold — Shop') + '</button>';
      h += '<div class="pcard' + (a ? ' act' : '') + '" style="--pc:' + c + ';animation-delay:' + (ix * 0.05) + 's"><div class="pic">' + ic + '</div><div class="pbd"><div class="ptt"><b>' + T(p.tr, p.en) + '</b> ' + stTxt(key) + '</div>' +
        '<div class="pds">' + T(p.dtr, p.den) + '</div><div class="pst"><span class="pchip">' + statTxt(p) + ' <b>+%10</b></span>' + (a ? '<span class="pchip">⏳ ' + (a.rem > 0 ? a.rem : T('son tur', 'last turn')) + '</span><span class="pchip">⚡ %' + Math.round(fade(a) * 100) + '</span>' : '') + '</div>' + btn + '</div></div>';
    });
    modal(h + '</div><button class="big polfoot" onclick="closeMod()">' + T('Kapat', 'Close') + '</button></div>');
    if (!can) toast(T('Politika yalnızca kendi turunda uygulanır', 'Policies can only be applied on your turn'));
  };
  window.polAsk = function (id, how, land) {
    land = land || G.pl;
    var p = P(id); if (!p || !is5() || pol().act[mkKey(land, id)]) return;
    if (Object.keys(pol().act).length >= MAXACT) { toast(T('En çok ' + MAXACT + ' politika aynı anda aktif olabilir', 'At most ' + MAXACT + ' policies can be active at once')); return; }
    if (usedNow(land)) { toast(T('Bu zar atışında zaten bir politika kullandın', 'You already used a policy on this roll')); return; }   // V104
    var pay = how == 'gold' ? POL_GOLD + ' 🪙' : POL_MOVES + ' ' + T('hamle', 'moves');
    modal('<div class="polx"><div class="polhd"><b>' + T(p.tr, p.en) + '</b></div><p class="polinfo">' + T('Bu politika <b>' + pay + '</b> karşılığında uygulanacak. Turun bitmez. Onaylıyor musun?', 'This policy costs <b>' + pay + '</b>. Your turn does not end. Confirm?') + '</p>' +
      '<button class="big pri" onclick="polApply(\'' + id + '\',\'' + how + '\',\'' + qs(land) + '\')">' + T('Evet, uygula', 'Yes, apply') + '</button><button class="big" onclick="polMenu(\'' + qs(land) + '\')">' + T('Vazgeç', 'Cancel') + '</button></div>');
  };
  window.polApply = function (id, how, land) {
    land = land || G.pl;
    var p = P(id); closeMod();
    if (!p || !is5() || G.ph != 'act' || G.busy || BSH || G.endLock) return;
    if (G.owner && G.owner[land] !== G.pl) { toast(T('Bu toprak artık senin değil', 'You no longer own this land')); return; }
    var pl = pol(), key = mkKey(land, id); if (pl.act[key]) return;                    // aynı politika aynı toprakta üst üste uygulanamaz
    if (Object.keys(pl.act).length >= MAXACT) { toast(T('En çok ' + MAXACT + ' politika aynı anda aktif olabilir', 'At most ' + MAXACT + ' policies can be active at once')); return; }
    if (usedNow(land)) { toast(T('Bu zar atışında zaten bir politika kullandın', 'You already used a policy on this roll')); return; }   // V104
    if (how == 'gold') { if (!window.Gold || !Gold.spend(POL_GOLD, 'policy')) { toast(T('Yeterli altının yok', 'Not enough gold')); return; } }
    else { if (!G.T || G.T.moves < POL_MOVES) { toast(T('Yeterli hamle yok', 'Not enough moves')); return; } G.T.moves -= POL_MOVES; }
    pl.act[key] = { rem: DICE, f: areaF(G.pl), land: land }; pl.ut = pl.ut || {}; pl.ut[land] = G.T.turn; if (land === G.pl) pl.usedTurn = G.T.turn;   // V104: bu zarda bir daha politika yok
    save(); render();
    /* V214: sade bildirim kartı (simge + politika adı + tek kısa satır); kart yoksa eski toast */
    if (window.wcNote) wcNote({ icon: ['pop', 'army', 'eco', 'tech', 'dip'][p.st[0]] || '📜', kick: T('Politika uygulandı', 'Policy applied'), title: T(p.tr, p.en), line: statTxt(p) + ' ▲ · ' + T('3 tur', '3 turns') });
    else toast('📜 ' + T(p.tr + ' (' + lname(land) + ') uygulandı: ' + statTxt(p) + ' +%10 (3 zar)', p.en + ' applied: ' + statTxt(p) + ' +10% (3 dice)') + ' · 🌍×' + areaF(G.pl).toFixed(2));
  };
  window.WC = window.WC || {}; window.WC.policies = function () { return JSON.parse(JSON.stringify(G && (G.mp ? (G.polBy || {})[G.pl] : G.pol) || null)); };
})();
