/* V139 — DENGE + TEMPO + FİNAL/GEÇMİŞ (TEST EDİLMEDİ; istek gereği oyunda/tarayıcıda çalıştırılmadı, yalnızca node --check)
   A) Küçük ülke başlangıcı: ilk 6 tur +1 hamle, ilk 2 tur YZ saldırısına karşı koruma, ilk 10 turda fetih başına +2 ekonomi.
   B) Büyük ülke / aşırı güçlenme: toprağın %30'unu geçince tur başına -1 hamle ("imparatorluk yorgunluğu"); ekstra hamlelerle toplam en çok zar+2.
      Zayıf oyuncu toparlanması: ≤2 toprak ve ortalamanın %60'ından zayıfsa 2 turda bir +1 hamle; YZ baskısı azalır.
   C) YZ kararları (V5.attack üzerinde "veto" süzgeci; hamle harcanır ama saldırı yapılmaz):
      · gerçek kazanma ihtimali < %30 ise çoğunlukla vazgeçer · hazinesi < 6 ise yarı yarıya vazgeçer
      · hedefin ittifakı toplamda çok güçlüyse vazgeçer (ittifaklar dikkate alınır)
      · aynı ülke son turlarda 3+ kez vurulduysa çoğunlukla vazgeçer (hep aynı ülkeye saldırma biter)
      · bir YZ tur başına en çok 2, tüm YZ'ler tur başına en çok 3 YZ↔YZ saldırısı (savaş sıklığı dengesi)
      · oyuncu lider (≥1,3× ortalama) → komşu YZ'ler ona odaklanır; oyuncu zayıf (<0,7×) → YZ'ler birbirine yönelir, oyuncuya saldırı %50 vazgeçilir
      · tehdit altındaki YZ savunmasını (Nüfus/Ordu) küçük adımlarla güçlendirir
   D) Tempo: "Hızlı YZ turu" (⚡ düğmesi): YZ↔YZ hamlelerinde animasyonlar atlanır, sana yönelen saldırılar normal gösterilir.
      Oynama süresi sayacı: limite 5 ve 2 dk kala uyarı, 20. dakikada "Süre doldu" (sonucu gör / +10 dk). Hamle sayacı HUD'da net: N/zar, 0'da uyarı + "Turu bitir" vurgusu.
   E) Kayıt/duraklatma: "Turu Bitir"de otomatik kayıt (💾 göstergesi); uygulama arka plana geçince/kapanırken kayıt.
   F) Final: tam ekran sonuç (zafer / yenilgi / süre doldu) + istatistikler (tur, süre, toprak, savaş, fetih, pakt, ittifak, skor); "Yeni ülkeyle başla".
      Oyun geçmişi: son 30 oyun localStorage'da (wc_hist139); ana/duraklatma menüsünde "📜 Oyun Geçmişi".
   Online (G.mp) oyunlarda DEVRE DIŞI. Geri almak için index.html'den v139.js ve v139.css bağlantılarını silin. Sabitler CFG içinde. */
(function () {
  'use strict';
  var CFG = {
    SMALL_RATIO: .8, BIG_RATIO: 1.4, SMALL_TURNS: 6, SMALL_MOVES: 1, GRACE_TURNS: 2, SMALL_CONQ_ECO: 2, SMALL_CONQ_TURNS: 10,
    FATIGUE_SHARE: .30, FATIGUE_MOVES: 1, COMEBACK_LANDS: 2, COMEBACK_RATIO: .6, COMEBACK_EVERY: 2, EXTRA_CAP: 2,
    AI_ATK_CAP: 2, AI_TOTAL_CAP: 3, VICTIM_MAX: 3, VICTIM_VETO: .7, VICTIM_DECAY: .5, UMBRELLA_RATIO: 1.4, UMBRELLA_VETO: .6,
    BROKE_ECO: 6, BROKE_VETO: .5, SUICIDE_WP: .3, SUICIDE_VETO: .8, LEAD_RATIO: 1.3, WEAK_RATIO: .7, MERCY_VETO: .5, DEF_THREAT: 1.3, DEF_GAIN: .02,
    LIMIT_MIN: 20, EXTEND_MIN: 10, WIN_SHARE: .08, HIST_MAX: 30
  };
  var HKEY = 'wc_hist139', FKEY = 'wc_fastai';

  /* ================= YARDIMCILAR ================= */
  function X(a, b) { return (typeof L !== 'undefined' && L === 'en') ? b : a; }
  function on() { try { return !!G && G.v5 === 1 && typeof G.pl === 'string' && !G.mp; } catch (e) { return false; } }
  function turn() { return (G && G.T && G.T.turn) || 0; }
  function nm(e) { return (window.M && M[e] && M[e].name) || e; }
  function fl(e) { try { return fimg(e, 'sm'); } catch (x) { return ''; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function say(m) { try { toast(m); } catch (x) { } }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function power(e) { var a = st(e), s = 0; for (var i = 0; i < 5; i++) s += (+a[i] || 0); return s; }
  function empires() { try { return aliveEmp().filter(function (e) { return ownedN(e) > 0; }); } catch (x) { return []; } }
  function aiList() { return empires().filter(function (e) { return e !== G.pl; }); }
  function avgPower(list) { var t = 0; list.forEach(function (e) { t += power(e); }); return t / Math.max(1, list.length); }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a.length ? a[Math.floor(a.length / 2)] : 0; }
  function nbrs(e) {   // komşu devletler (kara/deniz bağlantısı olmadan, yalnızca sınır komşuluğu)
    var s = {}; for (var id in G.owner) if (G.owner[id] === e && M[id] && M[id].nb) M[id].nb.forEach(function (n) { var o = G.owner[n]; if (typeof o === 'string' && o !== e) s[o] = 1; });
    return Object.keys(s).filter(function (x) { return ownedN(x) > 0; });
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function S() {
    var s = G.s139; if (!s) s = G.s139 = { last: -1, k: null, hit: {}, ta: {}, tot: 0, play: 0, lim: CFG.LIMIT_MIN, pk: {}, pacts: 0, allies: 0, inAl: 0, max: 0, l0: 0, note: [], seen: null };
    s.hit = s.hit || {}; s.ta = s.ta || {}; s.pk = s.pk || {}; s.note = s.note || []; return s;
  }
  function alliedAI(a, b) { try { return WCD.allied(a, b); } catch (x) { return false; } }
  function wpReal(a, d) {   // gerçek kazanma ihtimali (müttefik değerleri dahil; yan etkisiz)
    var A = st(a), D = st(d), w = 0, x, y;
    try { A = WCD.side(a, d).s; D = WCD.side(d, a).s; } catch (e) { }
    var bA = !!(G.rv && G.rv[a + '>' + d]), bD = !!(G.rv && G.rv[d + '>' + a]);
    for (x = 1; x <= 6; x++) for (y = 1; y <= 6; y++) if (battle(A, D, x, y, bA, bD).win) w++;
    return w / 36;
  }

  /* ================= SINIFLANDIRMA + İSTATİSTİK ================= */
  function classify(s) {
    if (s.k != null) return;
    var n = ownedN(G.pl), all = empires();
    if (n > 1 || all.length < 3) { s.k = 'mid'; s.l0 = n; return; }
    var r = power(G.pl) / Math.max(1, median(all.map(power)));
    s.k = r < CFG.SMALL_RATIO ? 'small' : (r > CFG.BIG_RATIO ? 'big' : 'mid'); s.l0 = n; s.t0 = turn();
  }
  function scanDeals() {
    try {
      var s = S(), tn = turn();
      for (var k in (G.pacts || {})) { if (!(G.pacts[k] > tn)) continue; var p = k.split('|'); if (p.indexOf(G.pl) < 0) continue; var id = k + '@' + G.pacts[k]; if (!s.pk[id]) { s.pk[id] = 1; s.pacts++; } }
      var al = WCD.allies(G.pl).length > 0; if (al && !s.inAl) s.allies++; s.inAl = al ? 1 : 0;
    } catch (x) { }
  }

  /* ================= A/B) HAMLE DÜZENLEMESİ (R5.startTurn) ================= */
  function applyMoves(T, roll) {
    var s = S(), notes = [], add = 0, tn = T.turn || turn(), lands = ownedN(G.pl), all = empires();
    classify(s);
    if (s.k === 'small' && tn <= CFG.SMALL_TURNS) { add += CFG.SMALL_MOVES; notes.push(X('🌱 Küçük ülke atılımı: +1 hamle', '🌱 Small-nation surge: +1 move')); }
    else if (lands <= CFG.COMEBACK_LANDS && all.length > 2 && power(G.pl) < CFG.COMEBACK_RATIO * avgPower(aiList()) && tn - (s.cb == null ? -9 : s.cb) >= CFG.COMEBACK_EVERY) {
      add += 1; s.cb = tn; notes.push(X('🔥 Toparlanma desteği: +1 hamle', '🔥 Comeback aid: +1 move'));
    }
    if (lands / Math.max(1, R.length) >= CFG.FATIGUE_SHARE) { add -= CFG.FATIGUE_MOVES; notes.push(X('🏛 İmparatorluk yorgunluğu: −' + CFG.FATIGUE_MOVES + ' hamle', '🏛 Imperial fatigue: −' + CFG.FATIGUE_MOVES + ' move')); }
    var before = T.moves, mv = T.moves + add;
    mv = Math.min(mv, Math.max(1, roll | 0) + CFG.EXTRA_CAP); mv = Math.max(roll > 0 ? 1 : 0, mv);
    if (mv !== before || notes.length) { T.moves = mv; s.note = notes; }
    if (before > Math.max(1, roll | 0) + CFG.EXTRA_CAP) s.note.push(X('⚖ Ekstra hamleler en çok +' + CFG.EXTRA_CAP + ' ile sınırlı', '⚖ Bonus moves are capped at +' + CFG.EXTRA_CAP));
  }
  function installRules() {
    if (!window.R5 || typeof R5.startTurn !== 'function') return false;
    if (R5.startTurn.v139) return true;
    var _s = R5.startTurn, w = function (T, roll) { var r = _s.apply(this, arguments); try { if (on() && T === G.T) applyMoves(T, roll); } catch (e) { console.error(e); } return r; };
    for (var k in _s) w[k] = _s[k]; w.v139 = 1; R5.startTurn = w; return true;
  }

  /* ================= C) YZ SALDIRI SÜZGECİ ================= */
  function vetoAI(att, tg) {
    var s = S(), de = G.owner[tg], tn = turn(); if (typeof de !== 'string' || de === att) return false;
    classify(s);
    var all = aiList(), avg = avgPower(all), r = power(G.pl) / Math.max(1, avg);
    if (de === G.pl) {
      if (s.k === 'small' && tn <= CFG.GRACE_TURNS) return 'grace';
      if (r > CFG.LEAD_RATIO) return false;                                   // lider oyuncu: baskı serbest
      if (r < CFG.WEAK_RATIO && Math.random() < CFG.MERCY_VETO) return 'mercy';
      return false;
    }
    if ((s.ta[att] || 0) >= CFG.AI_ATK_CAP) return 'cap';
    if (s.tot >= CFG.AI_TOTAL_CAP) return 'cap';
    if ((s.hit[de] || 0) >= CFG.VICTIM_MAX && Math.random() < CFG.VICTIM_VETO) return 'victim';
    var eco = (st(att) || [])[2] || 0; if (eco < CFG.BROKE_ECO && Math.random() < CFG.BROKE_VETO) return 'broke';
    try {   // ittifak şemsiyesi
      var side = power(de); WCD.allies(de).forEach(function (a) { side += power(a); });
      if (side > CFG.UMBRELLA_RATIO * power(att) && WCD.allies(de).length && Math.random() < CFG.UMBRELLA_VETO) return 'umbrella';
    } catch (x) { }
    if (wpReal(att, de) < CFG.SUICIDE_WP && Math.random() < CFG.SUICIDE_VETO) return 'suicide';
    return false;
  }
  function installAttack() {
    if (!window.V5 || typeof V5.attack !== 'function' || !V5.attack.__g123) return false;
    if (V5.attack.__g139) return true;
    var _a = V5.attack;
    var w = function (att, tg, isAI) {
      try {
        if (on() && isAI && att !== G.pl && G.ph === 'v5ai') {
          var s = S(), v = vetoAI(att, tg);
          if (v) { return false; }
          var de = G.owner[tg];
          s.ta[att] = (s.ta[att] || 0) + 1;
          if (de !== G.pl) { s.tot++; s.hit[de] = (s.hit[de] || 0) + 1; }
          if (de === G.pl) fastOff(); else fastOn();
        }
      } catch (e) { console.error(e); }
      return _a.apply(this, arguments);
    };
    for (var k in _a) w[k] = _a[k]; w.__g139 = 1; V5.attack = w; return true;
  }

  /* ================= C) TUR BAŞI: strateji + savunma ================= */
  function strategy() {
    var ai = aiList(); if (ai.length < 2) return;
    var r = power(G.pl) / Math.max(1, avgPower(ai)), tn = turn(); G.inc23 = G.inc23 || {};
    if (r > CFG.LEAD_RATIO) {
      var nb = nbrs(G.pl).filter(function (e) { return e !== G.pl && !alliedAI(G.pl, e); });
      shuffle(nb).slice(0, 2).forEach(function (e) { G.inc23[e + '>' + G.pl] = { until: tn + 2, m: 1.3, add: .1 }; });
    } else if (r < CFG.WEAK_RATIO) {
      ai.forEach(function (e) { var k = e + '>' + G.pl; if (G.inc23[k] && !G.inc23[k].guard) delete G.inc23[k]; });
      var pool = shuffle(ai), n = 0;
      for (var i = 0; i < pool.length && n < 2; i++) {
        var a = pool[i], cand = nbrs(a).filter(function (b) { return b !== G.pl && !alliedAI(a, b) && power(b) < 1.4 * power(a) && power(b) > .6 * power(a); });
        if (cand.length) { G.inc23[a + '>' + cand[Math.floor(Math.random() * cand.length)]] = { until: tn + 2, m: 1.3, add: .1 }; n++; }
      }
    }
  }
  function defense() {
    G.es = G.es || {}; G.ed = G.ed || {};
    shuffle(aiList()).slice(0, 3).forEach(function (e) {
      var thr = 0; nbrs(e).forEach(function (x) { if (!alliedAI(e, x)) thr = Math.max(thr, power(x)); });
      if (thr < CFG.DEF_THREAT * power(e)) return;
      var a = st(e).slice(), i = a[0] <= a[1] ? 0 : 1; a[i] = a[i] * (1 + CFG.DEF_GAIN) + .1; G.es[e] = a; G.ed[e] = 0;
    });
  }
  function tick() {
    if (!on() || G.over) return;
    var s = S(), tn = turn(); if (s.last === tn) return; s.last = tn;
    classify(s); s.max = Math.max(s.max, ownedN(G.pl));
    s.ta = {}; s.tot = 0; Object.keys(s.hit).forEach(function (e) { s.hit[e] = Math.max(0, s.hit[e] - CFG.VICTIM_DECAY); if (!s.hit[e]) delete s.hit[e]; });
    scanDeals();
    try { strategy(); defense(); } catch (e) { console.error(e); }
    var m = s.play / 60;
    if (m >= s.lim - 5 && !s.w1) { s.w1 = 1; say('⏱ ' + X('Yaklaşık ' + Math.max(1, Math.round(s.lim - m)) + ' dk kaldı', 'About ' + Math.max(1, Math.round(s.lim - m)) + ' min left')); }
    if (m >= s.lim - 2 && !s.w2) { s.w2 = 1; say('⏱ ' + X('Son dakikalar: toprak kazanmak için acele et', 'Final minutes: grab land now')); }
    try { save(); } catch (e) { }
  }
  function installStart() {
    if (!window.V5 || typeof V5.start !== 'function') return false;
    if (V5.start.v139) return true;
    var _s = V5.start, w = function () { fastOff(); try { tick(); } catch (e) { console.error(e); } return _s.apply(this, arguments); };
    for (var k in _s) w[k] = _s[k]; w.v139 = 1; V5.start = w; return true;
  }

  /* ================= D) HIZLI YZ TURU ================= */
  var FAST = false, rm0 = 0;
  /* V162: Hızlı YZ turu bir ÖDÜL: tek oyunculuda dünyayı fethedince (res='win') kalıcı açılır (localStorage wc_fastunl). */
  var UKEY = 'wc_fastunl';
  function fastUnlocked() { try { return localStorage.getItem(UKEY) === '1'; } catch (e) { return false; } }
  function unlockFast() { if (fastUnlocked()) return false; try { localStorage.setItem(UKEY, '1'); localStorage.setItem(FKEY, '1'); } catch (e) { } return fastUnlocked(); }
  function wantFast() { if (!fastUnlocked()) return false; try { return localStorage.getItem(FKEY) !== '0'; } catch (e) { return true; } }
  function fastOn() { if (FAST || !wantFast() || !window.SET || !on()) return; rm0 = SET.rm; SET.rm = 1; FAST = true; }
  function fastOff() { if (!FAST) return; try { SET.rm = rm0; } catch (e) { } FAST = false; }
  window.v139FastOff = fastOff;   /* V141: v141.js oyuncu saldırısında çağırır */
  /* V141: v5.js startPlayerTurn() doğrudan çağrılabildiği için (V5.start sarmalayıcısı atlanır) hızlı mod kapanmayıp SET.rm=1 kalıyordu:
     oyuncunun turunda TÜM saldırı animasyonları (ve zar/savaş animasyonu) atlanıyordu. Oyuncu hamle aşamasına geçince zorla kapat. */
  setInterval(function () { try { if (FAST && G && (G.ph === 'act' || G.ph === 'v5pick' || (!G.aiBusy && G.ph !== 'v5ai' && G.ph !== 'v5battle'))) fastOff(); } catch (e) { } }, 200);
  function installFast() {
    if (!window.V20 || typeof V20.run !== 'function' || typeof V20.after !== 'function') return false;
    if (V20.run.v139) return true;
    var _r = V20.run, _af = V20.after;
    V20.run = function () { try { fastOn(); } catch (e) { } return _r.apply(this, arguments); };
    V20.run.v139 = 1;
    V20.after = function () { try { fastOn(); } catch (e) { } var r = _af.apply(this, arguments); return r; };
    for (var k in _af) V20.after[k] = _af[k];
    return true;
  }
  function installSettings() {
    if (typeof settings !== 'function' || settings.v139) return;
    var _st = settings; settings = function () { fastOff(); return _st.apply(this, arguments); }; settings.v139 = 1;
  }
  window.v139Fast = function () {
    if (!fastUnlocked()) { say('🔒 ' + X('Hızlı YZ turu: tek oyunculu bir oyunda dünyayı fethedince açılır', 'Fast AI turn: unlocked by conquering the world in a single-player game')); return; }
    var v = wantFast() ? '0' : '1'; try { localStorage.setItem(FKEY, v); } catch (e) { } if (v === '0') fastOff();
    say('⚡ ' + (v === '1' ? X('Hızlı YZ turu: AÇIK', 'Fast AI turn: ON') : X('Hızlı YZ turu: KAPALI', 'Fast AI turn: OFF'))); fastBtn();
  };
  function fastBtn() {
    var ctl = document.getElementById('ctl'); if (!ctl) return;
    var b = document.getElementById('v139fast'); if (!b) { b = document.createElement('button'); b.id = 'v139fast'; b.type = 'button'; b.textContent = '⚡'; b.addEventListener('click', function (ev) { ev.stopPropagation(); window.v139Fast(); }); ctl.appendChild(b); }
    var ul = fastUnlocked(); b.textContent = ul ? '⚡' : '🔒'; b.title = ul ? X('Hızlı YZ turu', 'Fast AI turn') : X('Hızlı YZ turu (ödül: dünyayı fethet)', 'Fast AI turn (reward: conquer the world)'); b.style.opacity = wantFast() ? '' : '.45'; b.style.display = on() && !G.over ? '' : 'none';
  }

  /* ================= D) HAMLE GÖSTERGESİ + SÜRE ================= */
  function hudMoves() {
    try {
      if (!on() || !G.T) return; var chip = document.querySelector('#hud .chip[title]'); if (!chip) return;
      var n = G.T.moves | 0, roll = G.T.roll | 0;
      chip.innerHTML = '⚔ <b>' + n + '</b><span class="lab">/' + roll + '</span>'; chip.title = X('Kalan hamle / bu turun zarı', 'Moves left / this turn roll');
      chip.classList.toggle('mv0', n <= 0 && G.ph === 'act'); chip.classList.toggle('mv1', n === 1 && G.ph === 'act');
      var e = document.getElementById('v7end'); if (e) e.classList.toggle('pulse139', n <= 0 && G.ph === 'act');
    } catch (x) { }
  }
  setInterval(function () {
    try {
      if (!on() || G.over || document.hidden) return; var s = S();
      var bx = document.getElementById('box'); if (bx && bx.querySelector('.wb-pause,.wb-set')) return;   // duraklatma/ayarlar süreyi saymaz
      var m = document.getElementById('mod'); if (m && m.style.display === 'flex' && bx && /v139over/.test(bx.innerHTML)) return;
      s.play += 1;
    } catch (e) { }
  }, 1000);
  var ASKED = false;
  function maybeLimit() {
    try {
      if (!on() || G.over || G.ph !== 'act' || G.busy || ASKED) return; var s = S();
      if (s.play < s.lim * 60) return;
      var m = document.getElementById('mod'); if (m && m.style.display === 'flex') return;
      ASKED = true;
      modal('<h3>⏱ ' + X('Süre Doldu', 'Time Is Up') + '</h3><p style="color:var(--tx2)">' + X('Bu oyun ' + s.lim + ' dakikaya ulaştı. Şu an <b>' + ownedN(G.pl) + '</b> toprağın var. Sonucu görebilir ya da <b>' + CFG.EXTEND_MIN + ' dakika</b> daha oynayabilirsin.',
        'This game reached ' + s.lim + ' minutes. You hold <b>' + ownedN(G.pl) + '</b> lands. See the result or play <b>' + CFG.EXTEND_MIN + ' more minutes</b>.') + '</p>' +
        '<button class="big pri" onclick="v139Time(1)">🏁 ' + X('Sonucu Gör', 'See Result') + '</button><button class="big" onclick="v139Time(0)">▶ +' + CFG.EXTEND_MIN + ' ' + X('dk daha oyna', 'min more') + '</button>');
    } catch (e) { ASKED = false; }
  }
  window.v139Time = function (fin) {
    ASKED = false; closeMod(); if (!on()) return; var s = S();
    if (!fin) { s.lim += CFG.EXTEND_MIN; s.w1 = 0; s.w2 = 0; try { save(); } catch (e) { } return; }
    var mine = ownedN(G.pl), best = 0; aiList().forEach(function (e) { best = Math.max(best, ownedN(e)); });
    var win = mine > best && mine / R.length >= CFG.WIN_SHARE;
    G.fin139 = { w: win ? 0 : -1, tl: 1 }; G.over = { w: win ? 0 : -1, tl: 1 }; G.ph = 'over'; G.busy = 0;
    try { localStorage.removeItem(SV); } catch (e) { }
    try { render(); } catch (e) { }
  };

  /* ================= E) KAYIT ================= */
  function savePill() {
    try {
      var p = document.getElementById('sv139'); if (!p) { p = document.createElement('div'); p.id = 'sv139'; document.body.appendChild(p); }
      p.textContent = '💾 ' + X('Kaydedildi', 'Saved'); p.className = ''; void p.offsetWidth; p.className = 'show';
    } catch (e) { }
  }
  function installEnd() {
    if (typeof window.v5End !== 'function' || window.v5End.v139) return;
    var _e = window.v5End;
    window.v5End = function () {
      try { if (on() && G.ph === 'act' && !G.busy && !BSH && !G.endLock) { save(); savePill(); } } catch (e) { }
      return _e.apply(this, arguments);
    };
    window.v5End.v139 = 1;
  }
  function lifeSave() { try { if (on() && !G.over && G.ph !== 'over' && G.T && G.T.turn) save(); } catch (e) { } }
  document.addEventListener('visibilitychange', function () { if (document.hidden) lifeSave(); });
  window.addEventListener('pagehide', lifeSave);

  /* ================= F) FİNAL + GEÇMİŞ ================= */
  function hist() { try { var a = JSON.parse(localStorage.getItem(HKEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function mmss(sec) { sec = Math.max(0, sec | 0); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function summary() {
    var s = S(), st0 = (G.st && G.st[0]) || { w: 0, l: 0, c: 0 }, lands = ownedN(G.pl), total = R.length, o = G.fin139 || G.over || {}, win = o.w === 0;
    var score = Math.round(lands * 10 + (st0.c || 0) * 5 + (st0.w || 0) * 2 + (win ? 200 : 0) + (s.allies + s.pacts) * 3);
    return { d: Date.now(), c: G.pl, res: o.tl ? (win ? 'pts' : 'time') : (win ? 'win' : 'lose'), turns: turn(), sec: s.play | 0, lands: lands, max: Math.max(s.max, lands), l0: s.l0 || 1, total: total, w: st0.w || 0, l: st0.l || 0, conq: st0.c || 0, pacts: s.pacts, allies: s.allies, score: score, small: s.k === 'small' ? 1 : 0 };
  }
  function resTitle(r) { return r === 'win' ? X('Dünya Fethedildi!', 'World Conquered!') : r === 'pts' ? X('Üstünlükle Zafer!', 'Victory on Points!') : r === 'time' ? X('Süre Doldu', 'Time Is Up') : X('İmparatorluk Düştü', 'Empire Fell'); }
  function resIcon(r) { return r === 'win' ? '🌍' : r === 'pts' ? '🏆' : r === 'time' ? '⏱' : '🌱'; }
  function resLine(r, m) {
    if (r === 'win') return X('Tüm toprakları tek bayrak altında topladın. ' + m.turns + ' turda büyük bir fetih!', 'Every land under one flag in ' + m.turns + ' turns — a great conquest!');
    if (r === 'pts') return X('Süre dolduğunda en geniş devlet sendin: ' + m.lands + ' toprak.', 'When time ran out yours was the largest state: ' + m.lands + ' lands.');
    if (r === 'time') return X('Süre doldu ve en geniş devlet sen değildin. Bir dahaki sefere daha atak ol!', 'Time ran out and yours was not the largest state. Be bolder next time!');
    return X('Son toprağını kaybettin ama her büyük hükümdar bir yenilgiyle öğrenir. Yeni bir ülkeyle dene!', 'You lost your last land, yet every great ruler learns from defeat. Try a new country!');
  }
  /* V141: "İmparatorluk Düştü" — yaprak simgesi kaldırıldı; bayrak büyük yuvarlak bir countryball: gözler, kaşlar (üzgün) ve gözyaşı. Çizim v141.css'te. */
  function ballFlag(e) {
    try {
      var im = fimg(e, 'cbf');
      var eye = function (cx) { return '<ellipse cx="' + cx + '" cy="53" rx="11.5" ry="13.5" fill="#fff" stroke="#111" stroke-width="1.6"/><circle cx="' + (cx - 1) + '" cy="59" r="6" fill="#111"/><circle cx="' + (cx - 3) + '" cy="56.5" r="1.9" fill="#fff"/>'; };
      var brow = function (d) { return '<path d="' + d + '" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity=".9"/><path d="' + d + '" stroke="#111" stroke-width="5" stroke-linecap="round" fill="none"/>'; };
      var tear = function (x, c) { return '<path class="tr ' + c + '" d="M' + x + ' 71 C' + (x - 4) + ' 77 ' + (x - 4) + ' 82 ' + x + ' 82 C' + (x + 4) + ' 82 ' + (x + 4) + ' 77 ' + x + ' 71 Z" fill="#8fd0ff" stroke="#2c7fc0" stroke-width="1.1"/>'; };
      return '<div class="cb139">' + im + '<svg class="cbe" viewBox="0 0 100 100" aria-hidden="true">' +
        eye(34) + eye(66) + brow('M19 38 L45 26') + brow('M81 38 L55 26') + tear(27, 'a') + tear(73, 'b') + '</svg><i class="cbs"></i></div>';
    } catch (x) { return fl(e); }
  }
  var OVL = null, OVLG = null;
  function showFinal() {
    try {
      if (!G || G.ph !== 'over' || !(G.fin139 || G.over)) return; var s = S();
      if (OVL && OVLG === G) return;
      if (typeof BSH !== 'undefined' && BSH) { if (!s.bs) s.bs = Date.now(); if (Date.now() - s.bs < 120000) return; }
      if (OVL) { try { OVL.remove(); } catch (e) { } }
      var m = summary(); OVLG = G;
      if (!s.rec) { s.rec = 1; var h = hist(); h.unshift(m); try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, CFG.HIST_MAX))); } catch (e) { } }
      var win = m.res === 'win' || m.res === 'pts', conf = '', rw162 = '';
      if (m.res === 'win' && !G.mp && unlockFast()) rw162 = '<div class="sc">⚡ ' + X('Ödül açıldı: <b>Hızlı YZ turu</b>', 'Reward unlocked: <b>Fast AI turn</b>') + '</div>';   /* V162 */
      if (win) for (var i = 0; i < 18; i++) conf += '<i style="left:' + (i * 5.6 + 2) + '%;animation-delay:' + ((i % 6) * .35).toFixed(2) + 's;background:hsl(' + (i * 37 % 360) + ',80%,60%)"></i>';
      var cell = function (v, k) { return '<div><b>' + v + '</b><small>' + k + '</small></div>'; };
      OVL = document.createElement('div'); OVL.id = 'v139over'; OVL.className = win ? 'win' : 'lose';
      OVL.innerHTML = (win ? '<div class="cf">' + conf + '</div>' : '') + '<div class="in">' + (m.res === 'lose' ? '' : '<div class="ic">' + resIcon(m.res) + '</div>') + '<div class="fg">' + (m.res === 'lose' ? ballFlag(m.c) : fl(m.c)) + '</div><h2>' + resTitle(m.res) + '</h2><p>' + resLine(m.res, m) + '</p>' +
        '<div class="gr">' + cell(m.turns, X('TUR', 'TURNS')) + cell(mmss(m.sec), X('SÜRE', 'TIME')) + cell(m.lands + '<i>/' + m.total + '</i>', X('TOPRAK', 'LANDS')) + cell(m.max, X('EN ÇOK TOPRAK', 'PEAK LANDS')) +
        cell(m.w + ' / ' + m.l, X('SAVAŞ K / Y', 'WINS / LOSSES')) + cell(m.conq, X('FETİH', 'CONQUESTS')) + cell(m.pacts, X('PAKT', 'PACTS')) + cell(m.allies, X('İTTİFAK', 'ALLIANCES')) + '</div>' +
        '<div class="sc">⭐ ' + X('Skor', 'Score') + ' <b>' + m.score + '</b></div>' + rw162 +
        '<button class="pri" onclick="v139New()">🔁 ' + X('Yeni Ülkeyle Başla', 'Start With a New Country') + '</button><button onclick="v139Hist()">📜 ' + X('Oyun Geçmişi', 'Game History') + '</button><button class="gh" onclick="v139Menu()">' + X('Ana Menü', 'Main Menu') + '</button></div>';
      document.body.appendChild(OVL);
      try { var m2 = document.getElementById('mod'); if (m2) m2.style.display = 'none'; } catch (e) { }
    } catch (e) { console.error(e); }
  }
  function hideFinal() { try { if (OVL) OVL.remove(); } catch (e) { } OVL = null; OVLG = null; }
  window.v139New = function () { hideFinal(); try { localStorage.removeItem(SV); } catch (e) { } try { G = null; } catch (e) { } try { closeMod(); } catch (e) { } try { newGame(1); } catch (e) { console.error(e); try { menu(); } catch (x) { } } };
  window.v139Menu = function () { hideFinal(); try { localStorage.removeItem(SV); } catch (e) { } try { G = null; } catch (e) { } try { menu(); } catch (e) { } };
  var RES = { win: ['🌍', 'Fetih', 'Conquest'], pts: ['🏆', 'Üstünlük', 'Points'], time: ['⏱', 'Süre', 'Time'], lose: ['🌱', 'Yenilgi', 'Defeat'] };
  window.v139Hist = function () {
    var h = hist(), rows = h.slice(0, 20).map(function (m) {
      var d = new Date(m.d), ds = d.getDate() + '.' + (d.getMonth() + 1) + ' ' + (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(), r = RES[m.res] || RES.lose;
      return '<div class="h139r">' + fl(m.c) + '<span class="hn"><b>' + (window.M && M[m.c] ? M[m.c].name : m.c) + '</b><small>' + ds + ' · ' + m.turns + X(' tur', ' t') + ' · ' + mmss(m.sec) + '</small></span><span class="hr">' + r[0] + ' <small>' + X(r[1], r[2]) + '</small><br><small>' + m.lands + '/' + m.total + ' · ⭐' + m.score + '</small></span></div>';
    }).join('');
    var fin = !!(OVL && document.body.contains(OVL));
    modal('<div class="h139"><h3>📜 ' + X('Oyun Geçmişi', 'Game History') + '</h3>' + (rows || '<p style="opacity:.7">' + X('Henüz biten oyun yok.', 'No finished games yet.') + '</p>') +
      '<button class="big" onclick="closeMod()">' + X('Kapat', 'Close') + '</button>' + (h.length ? '<button class="big ghost" onclick="v139HistClear()">' + X('Geçmişi Temizle', 'Clear History') + '</button>' : '') + '</div>');
    if (fin) { var m2 = document.getElementById('mod'); if (m2) m2.style.zIndex = 100001; }
  };
  window.v139HistClear = function () { try { localStorage.removeItem(HKEY); } catch (e) { } window.v139Hist(); };
  function histBtn() {
    try {
      var p = document.querySelector('#box .wb-panel'); if (!p || p.querySelector('#v139h')) return;
      if (p.querySelector('.wb-set')) return;
      p.insertAdjacentHTML('beforeend', '<button class="wb-b sm" id="v139h" onclick="v139Hist()">📜 ' + X('Oyun Geçmişi', 'Game History') + '</button>');
    } catch (e) { }
  }
  function installMenu() {
    if (typeof menu !== 'function' || menu.v139) return;
    var _m = menu; menu = function () { try { if (window.v5RollResume) v5RollResume(); } catch (e) { } /* V162: ana menüde 'Zar At' balonu kalmasın */ var r = _m.apply(this, arguments); try { histBtn(); } catch (e) { } return r; }; menu.v139 = 1;
  }
  setInterval(function () { try { if (document.hidden) return; if (!G) { if (OVL) hideFinal(); return; } showFinal(); } catch (e) { } }, 700);

  /* ================= RENDER KANCASI ================= */
  function trackConquest() {
    try {
      var s = S(), L0 = G.last; if (!L0 || s.seen === L0) return; s.seen = L0;
      if (L0.att === G.pl && L0.win && s.k === 'small' && turn() <= CFG.SMALL_CONQ_TURNS) { addEco(G.pl, CFG.SMALL_CONQ_ECO); say('🌱 ' + X('Küçük ülke zaferi: +' + CFG.SMALL_CONQ_ECO + ' ekonomi', 'Underdog win: +' + CFG.SMALL_CONQ_ECO + ' economy')); }
      s.max = Math.max(s.max, ownedN(G.pl)); scanDeals();
    } catch (e) { }
  }
  function showNotes() {
    try {
      var s = S(); if (G.ph !== 'act' || !s.note || !s.note.length) return; var n = s.note; s.note = [];
      n.forEach(function (t, i) { setTimeout(function () { say(t); }, 350 + i * 1300); });
    } catch (e) { }
  }
  var _rn = render;
  render = function () {
    var x = _rn.apply(this, arguments);
    try { install(); if (on()) { trackConquest(); hudMoves(); showNotes(); fastBtn(); setTimeout(maybeLimit, 600); } } catch (e) { }
    return x;
  };

  /* ================= KURULUM ================= */
  function install() {
    var a = installRules(), b = installAttack(), c = installStart(), d = installFast(); installEnd(); installMenu(); installSettings();
    return a && b && c && d;
  }
  try { install(); } catch (e) { console.error(e); }
  window.addEventListener('load', function () { try { install(); } catch (e) { } });
  var n = 0, iv = setInterval(function () { try { if (install() || ++n > 60) clearInterval(iv); } catch (e) { if (++n > 60) clearInterval(iv); } }, 250);
  window.V139 = { CFG: CFG, summary: summary, hist: hist, veto: vetoAI };
})();
