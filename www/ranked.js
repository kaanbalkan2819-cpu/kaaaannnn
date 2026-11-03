/* V114 — RANK MAÇI. Eşleşme: Firebase (anonim giriş + Firestore kuyruğu). Oyun içi canlı bağlantı: mevcut PeerJS (online.js).
   Bu dosya: profil/Elo/lig, eşleşme, sığınak (YZ rakip), hamle süresi, bağlantı kopması, tur limiti, sonuç doğrulama, liderlik.
   online.js / v20.js / v35.js içindeki küçük kancalar WCRank.* fonksiyonlarını çağırır.
   TEST EDİLMEDİ (yalnızca söz dizimi denetimi). */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function $i(i) { return document.getElementById(i); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pickOf(a) { return a[Math.floor(Math.random() * a.length)]; }
  function sum5(a) { var s = 0; for (var i = 0; i < 5; i++) s += (+a[i] || 0); return s; }
  function ONs() { return (window.WCOnline && WCOnline._state && WCOnline._state()) || {}; }

  /* ---------------- ayarlar (tek yer) ---------------- */
  var CFG = {
    start: 1000, K: 32, K0: 48, K0n: 10,          // Elo
    swapCost: 250,                                // ülke değişim ücreti (altın)
    queueSec: 15,                                 // gerçek rakip arama süresi
    lobbySec: 12,                                 // "rakip bulundu" ekranı (ülke değiştirme penceresi)
    moveSec: 45,                                  // hamle (tur) başına süre
    graceSec: 10,                                 // bağlantı kopunca geri dönme süresi
    turnLimit: 30,                                // her oyuncu için tur limiti
    botThinkMin: 5, botThinkMax: 14,              // yapay zekâ rakibin "düşünme" gecikmesi (sn)
    verifySec: 20                                 // rakibin sonuç bildirimini bekleme
  };

  /* ---------------- ligler ---------------- */
  var LG = [
    { tr: 'Bronz', en: 'Bronze', min: 0, c: '#c98a4b', ic: '🥉' },
    { tr: 'Gümüş', en: 'Silver', min: 1000, c: '#c4cbd6', ic: '🥈' },
    { tr: 'Altın', en: 'Gold', min: 1200, c: '#f2c14e', ic: '🥇' },
    { tr: 'Platin', en: 'Platinum', min: 1400, c: '#7fe0d4', ic: '💠' },
    { tr: 'Elmas', en: 'Diamond', min: 1600, c: '#7ab8ff', ic: '💎' },
    { tr: 'Şampiyon', en: 'Champion', min: 1800, c: '#ff7a59', ic: '👑' }
  ];
  var ROM = ['', 'I', 'II', 'III'];
  function league(r) {
    var i = LG.length - 1; while (i > 0 && r < LG[i].min) i--;
    var lo = LG[i].min, hi = i < LG.length - 1 ? LG[i + 1].min : null, div = 0;
    if (hi !== null) div = 3 - Math.min(2, Math.floor((r - lo) / (hi - lo) * 3));   // III (alt) → I (üst)
    var nm = X(LG[i].tr, LG[i].en);
    return { i: i, div: div, lo: lo, hi: hi, c: LG[i].c, ic: LG[i].ic, name: nm, label: nm + (div ? ' ' + ROM[div] : '') };
  }
  function eloDelta(me, op, score, games) {
    var K = games < CFG.K0n ? CFG.K0 : CFG.K, E = 1 / (1 + Math.pow(10, (op - me) / 400)), d = Math.round(K * (score - E));
    if (score === 1 && d < 1) d = 1; if (score === 0 && d > -1) d = -1; return d;
  }

  /* ---------------- profil + cüzdan ---------------- */
  var P = jget('wcr_profile', null) || { nick: '', rating: CFG.start, games: 0, w: 0, l: 0, d: 0, gold: 0, gImp: 0 };
  function saveP() { jset('wcr_profile', P); }
  /* Mevcut altın sistemi (v18.js) kayıt dosyasının içindedir (G.gold); oyun dışında global bakiye yoktur.
     Köprü: Rank cüzdanı ayrı saklanır; ilk açılışta kayıtlı seferdeki bakiye BİR KEZ içe aktarılır. */
  function importGold() {
    if (P.gImp) return; P.gImp = 1;
    try { var sv = JSON.parse(localStorage.getItem(typeof SV !== 'undefined' ? SV : 'wc_save')); if (sv && sv.gold > 0 && !(sv.gold55 && !sv.gold56)) P.gold += Math.floor(sv.gold); } catch (e) { }   // V116: eski 99.999 test altını içe aktarma
    saveP();
  }
  if (!P.g116) { P.g116 = 1; P.gold = 0; saveP(); }   // V116: Rank cüzdanındaki test altını bir kez sıfırlanır
  function gold() { return Math.max(0, Math.floor(+P.gold) || 0); }
  function spend(n) { if (gold() < n) return false; P.gold = gold() - n; saveP(); return true; }
  function refund(n) { P.gold = gold() + n; saveP(); }
  function goodNick(n) { return /^[A-Za-z0-9ÇĞİÖŞÜçğıöşü _.\-]{3,14}$/.test(n || ''); }

  /* V122 — ad sürtünmesi: ekran boş açılmaz, hazır öneriyle ("Oyuncu4821") açılır; değiştirilebilir.
     Google Play Games oyuncu adı varsa (native köprü: window.WCPlayGames.getDisplayName) otomatik doldurulur. */
  function newSuggestion() { return X('Oyuncu', 'Player') + Math.floor(rnd(1000, 10000)); }
  function suggestNick() {
    var v = jget('wcr_nicksug', ''); if (goodNick(v)) return v;
    v = newSuggestion(); jset('wcr_nicksug', v); return v;
  }
  function cleanNick(n) {   // dış kaynaktan gelen adı izinli karakterlere ve 14 sınırına getirir; geçersizse ''
    n = String(n || '').replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü _.\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14).trim();
    return goodNick(n) ? n : '';
  }
  function pgName(cb) {
    try {
      var pg = window.WCPlayGames;
      if (pg && typeof pg.getDisplayName === 'function') {
        Promise.resolve(pg.getDisplayName()).then(function (n) { cb(cleanNick(n)); }, function () { cb(''); }); return;
      }
    } catch (e) { }
    cb('');
  }

  /* ---------------- Firebase ---------------- */
  var FB = { ok: false, db: null, uid: null, busy: null };
  function cfgOk() { var c = window.WC_FIREBASE_CONFIG; return !!(c && c.apiKey && c.projectId); }
  function loadChain(files, cb) {
    var V = '10.12.2';
    (function nx(i) {
      if (i >= files.length) return cb();
      var done = false, urls = ['firebase/firebase-' + files[i] + '-compat.js', 'https://www.gstatic.com/firebasejs/' + V + '/firebase-' + files[i] + '-compat.js'];
      (function tr(j) {
        if (j >= urls.length) return cb('lib');
        var s = document.createElement('script'); s.src = urls[j];
        s.onload = function () { if (!done) { done = true; nx(i + 1); } }; s.onerror = function () { tr(j + 1); };
        document.head.appendChild(s);
      })(0);
    })(0);
  }
  function fbInit(cb) {
    if (FB.ok) return cb();
    if (!cfgOk()) return cb('cfg');
    if (FB.busy) return FB.busy.push(cb);
    FB.busy = [cb];
    function end(e) { var q = FB.busy; FB.busy = null; q.forEach(function (f) { try { f(e); } catch (x) { } }); }
    function go() {
      try {
        if (!firebase.apps.length) firebase.initializeApp(window.WC_FIREBASE_CONFIG);
        firebase.auth().signInAnonymously().then(function (u) {
          FB.uid = u.user.uid; FB.db = firebase.firestore(); FB.ok = true; end();
        }).catch(function (e) { end('auth:' + (e && e.code || e)); });
      } catch (e) { end('init'); }
    }
    if (window.firebase && firebase.firestore) return go();
    loadChain(['app', 'auth', 'firestore'], function (e) { if (e) return end(e); go(); });
  }
  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }
  /* sunucu profili: sunucu kaydı geçerlidir (yerel değer kopyalanır) */
  function syncProfile(cb) {
    if (!FB.ok) return cb();
    var ref = FB.db.collection('players').doc(FB.uid);
    ref.get().then(function (s) {
      if (s.exists) {
        var d = s.data(); P.rating = d.rating; P.games = d.games || 0; P.w = d.w || 0; P.l = d.l || 0; P.d = d.d || 0; if (d.nick) P.nick = d.nick; saveP(); return cb();
      }
      if (!P.nick) return cb();
      return ref.set({ nick: P.nick, rating: CFG.start, games: 0, w: 0, l: 0, d: 0, updated: ts() }).then(function () { P.rating = CFG.start; P.games = P.w = P.l = P.d = 0; saveP(); cb(); });
    }).catch(function () { cb(); });
  }

  /* ---------------- V122: hesap bağı (Google) ----------------
     Sorun: puan/ad cihaza bağlı anonim Firebase kimliğine yazılır; telefon değişince/uygulama silinince kimlik kaybolur.
     Çözüm: anonim kimliği Google hesabına BAĞLA (linkWithCredential → uid değişmez, puan yerinde kalır). Hesap daha önce
     başka bir kimlikle bağlandıysa (telefon değişimi) o hesaba GİRİŞ yapılır ve sunucudaki puan geri yüklenir.
     Google kimlik jetonu (idToken) şu kaynaklardan biriyle alınır (hangisi varsa; yoksa düğme hiç görünmez):
       1) window.WCPlayGames.getIdToken()  — Google Play Games / native köprün (ileride bağlanınca bunu doldur)
       2) Capacitor.Plugins.SocialLogin (Capgo)   3) Capacitor.Plugins.GoogleAuth (codetrix)
       4) tarayıcıda (native değil) Firebase popup. TEST EDİLMEDİ. */
  var AL = { cred: null, busy: false, last: null };
  function isNative() { try { var C = window.Capacitor; return !!(C && (C.isNativePlatform ? C.isNativePlatform() : (C.getPlatform && C.getPlatform() !== 'web'))); } catch (e) { return false; } }
  function plug() { try { return (window.Capacitor && Capacitor.Plugins) || {}; } catch (e) { return {}; } }
  function tokenSource() {
    var pg = window.WCPlayGames, pl = plug();
    if (pg && typeof pg.getIdToken === 'function') return 'pg';
    if (pl.SocialLogin && pl.SocialLogin.login) return 'social';
    if (pl.GoogleAuth && pl.GoogleAuth.signIn) return 'gauth';
    if (!isNative()) return 'popup';
    return null;
  }
  function getIdToken(src) {
    var pl = plug(), bad = function () { throw new Error('notoken'); };
    if (src === 'pg') return Promise.resolve(window.WCPlayGames.getIdToken()).then(function (t) { return t || bad(); });
    if (src === 'social') return pl.SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } }).then(function (r) { var x = r && r.result; return (x && x.idToken) || bad(); });
    if (src === 'gauth') return pl.GoogleAuth.signIn().then(function (r) { return (r && r.authentication && r.authentication.idToken) || bad(); });
    return Promise.reject(new Error('nosrc'));
  }
  function curUser() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
  function linkedInfo() {
    var u = curUser(); if (!u || u.isAnonymous) return null;
    var em = u.email; (u.providerData || []).forEach(function (p) { if (!em && p && p.email) em = p.email; });
    return { email: em || '' };
  }
  function acctHtml() {
    if (!FB.ok) return '';
    var li = linkedInfo();
    if (li) return '<div class="wcr-sm">✓ ' + X('Google hesabına bağlı', 'Linked to Google') + (li.email ? ' · ' + esc(li.email) : '') + '</div>';
    if (tokenSource()) return '<div class="wcr-note">' + X('Puanın şu an bu cihaza bağlı: telefon değiştirirsen ya da uygulamayı silersen kaybolur.', 'Your rating is tied to this device: you lose it if you change phones or uninstall.') + '</div>' +
      '<button class="big" onclick="WCRank.link()">🔗 ' + X('Google ile Bağla', 'Link with Google') + '</button>';
    return '<div class="wcr-sm">' + X('Hesap: bu cihaza bağlı (misafir). Google ile bağlama Google Play sürümüyle gelecek.', 'Account: tied to this device (guest). Google linking arrives with the Google Play build.') + '</div>';
  }
  function linkErr(e) {
    var c = (e && (e.code || e.message)) || '';
    if (/cancel|popup-closed|12501|canceled/i.test(c)) return hub();   // kullanıcı vazgeçti
    hub(); toast(X('Hesap bağlanamadı', 'Could not link account') + (c ? ' (' + String(c).slice(0, 40) + ')' : ''));
  }
  function link() {
    if (AL.busy || !FB.ok) return; var u = curUser(); if (!u || !u.isAnonymous) return hub();
    var src = tokenSource(); if (!src) return hub();
    AL.busy = true; AL.cred = null;
    rmodal('<h3>' + X('Hesap Bağla', 'Link Account') + '</h3>' + M_(X('Google ile bağlanılıyor…', 'Connecting to Google…')));
    function fin(ok) { AL.busy = false; if (ok) { syncProfile(function () { hub(); toast(X('Hesabın bağlandı ✓', 'Account linked ✓')); }); } }
    function conflict(e) {   // bu Google hesabı daha önce başka kimlikle bağlanmış → geri yükleme onayı
      var cr = e && e.credential; if (!cr) { AL.busy = false; return linkErr(e); }
      AL.cred = cr; AL.busy = false;
      rmodal('<h3>' + X('Kayıtlı Hesap Bulundu', 'Saved Account Found') + '</h3>' +
        M_(X('Bu Google hesabı daha önce bağlanmış. Devam edersen o hesaptaki puanın yüklenir; bu cihazdaki misafir puanın (★ ', 'This Google account was linked before. If you continue, its saved rating is loaded; this device\'s guest rating (★ ') + P.rating + X(') kullanılmaz.', ') will not be used.')) +
        '<button class="big pri" onclick="WCRank.linkSwitch()">' + X('Kayıtlı hesabı yükle', 'Load saved account') + '</button>' +
        '<button class="big ghost" onclick="WCRank.hub()">' + X('Vazgeç', 'Cancel') + '</button>');
    }
    var isConf = function (e) { return e && (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use'); };
    var p;
    if (src === 'popup') p = u.linkWithPopup(new firebase.auth.GoogleAuthProvider());
    else p = getIdToken(src).then(function (t) { AL.last = firebase.auth.GoogleAuthProvider.credential(t); return u.linkWithCredential(AL.last); });
    p.then(function () { fin(true); }).catch(function (e) { if (isConf(e)) { if (!e.credential && AL.last) e.credential = AL.last; conflict(e); } else { AL.busy = false; linkErr(e); } });
  }
  function linkSwitch() {
    var cr = AL.cred; AL.cred = null; if (!cr) return hub();
    rmodal('<h3>' + X('Hesap Bağla', 'Link Account') + '</h3>' + M_(X('Hesap yükleniyor…', 'Loading account…')));
    firebase.auth().signInWithCredential(cr).then(function (r) {
      FB.uid = r.user.uid; FB.db = firebase.firestore();
      P.games = 0; P.w = P.l = P.d = 0; P.rating = CFG.start; saveP();   // sunucu kaydı (varsa) syncProfile ile üzerine yazılır
      syncProfile(function () { if (!P.nick) return askNick(true); hub(); toast(X('Kayıtlı hesap yüklendi ✓', 'Saved account loaded ✓')); });
    }).catch(linkErr);
  }

  /* ---------------- ekranlar ---------------- */
  var timers = [];
  function tset(f, ms) { var t = setTimeout(f, ms); timers.push(t); return t; }
  function iset(f, ms) { var t = setInterval(f, ms); timers.push(t); return t; }
  function clearT() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  /* V117: tüm Rank ekranları ortak "savaş çerçevesi" ile açılır; başka pencereler açılınca çerçeve sınıfı kalkar */
  var _m0 = window.modal;
  window.modal = function (h) { var b = $i('box'); if (b) b.classList.remove('wcr-box'); return _m0.apply(this, arguments); };
  function rmodal(h) { _m0(h); var b = $i('box'); if (b) b.classList.add('wcr-box'); }
  function art() { return window.WCArt || { medal: function () { return ''; }, mini: function () { return ''; }, ic: function () { return ''; }, crossed: function () { return ''; } }; }
  function M_(txt) { return '<div style="text-align:center;padding:10px;color:var(--tx2)">' + txt + '</div>'; }

  function badge(lg, big) { return '<div class="wcr-badge' + (big ? ' big' : '') + '" style="--c:' + lg.c + '">' + art().medal(lg, big ? 132 : 56) + '</div>'; }
  /* V127: lig şeridi + istatistik tablosu */
  function strip(cur) {
    var h = '', k, st;
    for (k = 0; k < LG.length; k++) { st = k < cur ? 'got' : (k == cur ? 'cur' : (k == cur + 1 ? 'nx' : 'lk')); h += '<span class="wcr-st ' + st + '">' + art().mini({ i: k, div: 0 }, 46) + '</span>'; }
    return '<div class="wcr-strip">' + h + '</div>';
  }
  function ledger() {
    var g = +P.games || 0, w = +P.w || 0, l = +P.l || 0, r = g ? Math.round(w / g * 100) : 0;
    return '<div class="wcr-led"><div><b>' + g + '</b><span>' + X('Maç', 'Games') + '</span></div><div><b>' + w + '</b><span>' + X('Galibiyet', 'Wins') + '</span></div>' +
      '<div class="l"><b>' + l + '</b><span>' + X('Mağlubiyet', 'Losses') + '</span></div><div><b>' + X('%' + r, r + '%') + '</b><span>' + X('Başarı', 'Win rate') + '</span></div></div>';
  }
  function hub() {
    clearT(); importGold();
    var A = art(), lg = league(P.rating), nx = lg.i < LG.length - 1 ? league(LG[lg.i + 1].min) : null,
      pct = lg.hi ? Math.max(3, Math.round((P.rating - lg.lo) / (lg.hi - lg.lo) * 100)) : 100, left = lg.hi ? lg.hi - P.rating : 0;
    rmodal('<div class="wcr-hub">' +
      '<div class="wcr-corner c-tl">' + A.ic('rose', 26, 26) + '</div><div class="wcr-corner c-tr">' + A.ic('rose', 26, 26) + '</div><div class="wcr-corner c-bl">' + A.ic('rose', 26, 26) + '</div><div class="wcr-corner c-br">' + A.ic('rose', 26, 26) + '</div>' +
      '<div class="wcr-title">' + A.crossed(34) + '<h3>' + X('RANK MAÇI', 'RANKED MATCH') + '</h3>' + A.crossed(34) + '</div>' +
      '<div class="wcr-div"><i></i>' + A.ic('rose', 18, 18) + '<i></i></div>' +
      '<div class="wcr-stage" style="--c:' + lg.c + '"><div class="wcr-m3d">' + A.medal(lg, 230) + '</div></div>' +
      '<div class="wcr-plate"><b>' + esc(P.nick || '—') + '</b></div>' +
      '<div class="wcr-lgn" style="color:' + lg.c + '">' + esc(lg.label.toUpperCase()) + '</div>' +
      '<div class="wcr-rat">★ ' + P.rating + '</div>' +
      '<div class="wcr-prog"><span class="pm">' + A.mini(lg, 34) + '</span><div class="wcr-bar2"><i style="width:' + pct + '%"></i><em></em></div><span class="pm dim">' + (nx ? A.mini(nx, 34) : A.ic('rose', 30, 30)) + '</span></div>' +
      '<div class="wcr-sm">' + (lg.hi ? X('Sonraki lige ', 'To next league: ') + left + X(' puan', ' pts') : X('En üst lig', 'Top league')) + '</div>' +
      strip(lg.i) + ledger() +
      (cfgOk() ? '' : '<div class="wcr-note">' + X('Firebase ayarlanmamış: gerçek rakip aranmaz, liderlik tablosu kapalı.', 'Firebase is not configured: no live opponents, leaderboard disabled.') + '</div>') +
      '<button class="big pri wcr-go" onclick="WCRank.find()">' + A.crossed(26) + '<span>' + X('Maç Bul', 'Find Match') + '</span>' + A.crossed(26) + '</button>' +
      '<div class="wcr-two"><button class="big" onclick="WCRank.board()">' + A.ic('shield', 18, 22) + '<span>' + X('Liderlik', 'Leaderboard') + '</span></button>' +
      '<button class="big" onclick="WCRank.nick()">' + A.ic('rose', 20, 20) + '<span>' + X('Takma Ad', 'Nickname') + '</span></button></div>' +
      acctHtml() +
      '<button class="big ghost wcr-x2" onclick="closeMod()">' + X('Kapat', 'Close') + '</button></div>');
  }
  function openHub() {
    if (!window.WCStats || !WCStats.ready()) return toast(X('Ülke verisi yükleniyor, birazdan tekrar dene', 'Country data is loading, try again shortly'));
    rmodal('<h3>★ ' + X('Rank Maçı', 'Ranked Match') + '</h3>' + M_(X('Bağlanılıyor…', 'Connecting…')));
    fbInit(function () {
      syncProfile(function () {
        if (!P.nick) return askNick(true);
        resolvePending(function () { hub(); });
      });
    });
  }
  function askNick(first) {
    var pre = P.nick || suggestNick();
    rmodal('<h3>' + X('Takma Ad', 'Nickname') + '</h3><div style="color:var(--tx2);margin-bottom:8px">' + X('Senin için bir ad hazırladık; istersen değiştir. 3–14 karakter (harf, rakam, boşluk, _ . -). Liderlik tablosunda görünür.', 'We picked a name for you; change it if you like. 3–14 chars (letters, digits, space, _ . -). Shown on the leaderboard.') + '</div>' +
      '<input id="wcrn" maxlength="14" value="' + esc(pre) + '" class="wcr-in" oninput="this.dataset.d=1"><div id="wcre" class="wcr-err"></div>' +
      '<button class="big pri" onclick="WCRank.saveNick(' + (first ? 1 : 0) + ')">' + X('Kaydet', 'Save') + '</button>' +
      (P.nick ? '' : '<button class="big" onclick="WCRank.reroll()">🎲 ' + X('Başka Öner', 'Suggest Another') + '</button>') +
      '<button class="big ghost" onclick="' + (first ? 'closeMod()' : 'WCRank.hub()') + '">' + X('Vazgeç', 'Cancel') + '</button>');
    if (!P.nick) pgName(function (n) {   // Play Games adı geldiyse ve oyuncu henüz yazmadıysa doldur
      var e = $i('wcrn'); if (n && e && !e.dataset.d) e.value = n;
    });
  }
  function reroll() {
    var v = newSuggestion(); jset('wcr_nicksug', v);
    var e = $i('wcrn'); if (e) { e.value = v; e.dataset.d = 1; }
  }
  function saveNick(first) {
    var v = (($i('wcrn') || {}).value || '').trim();
    if (!goodNick(v)) { var e = $i('wcre'); if (e) e.textContent = X('Geçersiz takma ad', 'Invalid nickname'); return; }
    P.nick = v; saveP();
    function done() { if (first) { importGold(); hub(); } else hub(); }
    if (!FB.ok) return done();
    var ref = FB.db.collection('players').doc(FB.uid);
    ref.get().then(function (s) {
      if (s.exists) return ref.update({ nick: v });
      return ref.set({ nick: v, rating: CFG.start, games: 0, w: 0, l: 0, d: 0, updated: ts() });
    }).then(done).catch(done);
  }

  /* ---- liderlik ---- */
  function board() {
    if (!FB.ok) return rmodal('<h3>' + X('Liderlik Tablosu', 'Leaderboard') + '</h3>' + M_(X('Firebase ayarlı değil.', 'Firebase is not configured.')) + '<button class="big ghost" onclick="WCRank.hub()">' + X('Geri', 'Back') + '</button>');
    rmodal('<h3>' + X('Liderlik Tablosu', 'Leaderboard') + '</h3>' + M_(X('Yükleniyor…', 'Loading…')));
    FB.db.collection('players').orderBy('rating', 'desc').limit(100).get().then(function (sn) {
      var rows = '', i = 0, inTop = false;
      sn.forEach(function (d) {
        i++; var x = d.data(), lg = league(x.rating || 0), me = d.id === FB.uid; if (me) inTop = true;
        rows += '<div class="wcr-row' + (me ? ' me' : '') + '"><span class="n">' + i + '</span><span class="l">' + art().mini(lg, 26) + '</span><span class="nk">' + esc(x.nick || '?') + '</span><span class="lb">' + esc(lg.label) + '</span><b>' + (x.rating || 0) + '</b></div>';
      });
      function show(own) {
        rmodal('<h3>' + X('Liderlik Tablosu', 'Leaderboard') + '</h3><div class="wcr-list">' + (rows || M_(X('Henüz oyuncu yok', 'No players yet'))) + '</div>' +
          (inTop ? '' : '<div class="wcr-row me"><span class="n">' + own + '</span><span class="l">' + art().mini(league(P.rating), 26) + '</span><span class="nk">' + esc(P.nick) + '</span><span class="lb">' + esc(league(P.rating).label) + '</span><b>' + P.rating + '</b></div>') +
          '<button class="big ghost" onclick="WCRank.hub()">' + X('Geri', 'Back') + '</button>');
      }
      if (inTop) return show('');
      try {
        FB.db.collection('players').where('rating', '>', P.rating).count().get().then(function (s) { show('#' + (s.data().count + 1)); }).catch(function () { show('100+'); });
      } catch (e) { show('100+'); }
    }).catch(function () { rmodal('<h3>' + X('Liderlik Tablosu', 'Leaderboard') + '</h3>' + M_(X('Yüklenemedi', 'Could not load')) + '<button class="big ghost" onclick="WCRank.hub()">' + X('Geri', 'Back') + '</button>'); });
  }

  /* ---------------- eşleşme ---------------- */
  var MM = null, CUR = null;
  function mkCode() { var C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', c = ''; for (var i = 0; i < 5; i++) c += C[Math.floor(Math.random() * C.length)]; return c; }
  function stopMM() { if (!MM) return; MM.stop = true; clearInterval(MM.poll); clearInterval(MM.hb); clearTimeout(MM.botT); clearInterval(MM.clk); try { if (MM.unsub) MM.unsub(); } catch (e) { } MM = null; }
  function find() {
    if (!WCStats.ready()) return toast(X('Ülke verisi hazır değil', 'Country data not ready'));
    clearT(); stopMM(); CUR = null;
    var t0 = Date.now(); MM = { t0: t0, stop: false };
    function paint() {
      var s = Math.floor((Date.now() - t0) / 1000);
      var se = MM && MM.painted && $i('wcr-sec'); if (se) { se.textContent = s + X(' sn', 's'); return; }   /* V118: yalnızca sayaç güncellenir */
      rmodal('<h3>' + X('Rakip Aranıyor', 'Searching Opponent') + '</h3><div class="wcr-spin"></div>' + M_(X('Seviyene yakın bir rakip bulunuyor… ', 'Looking for a rival near your level… ') + '<b id="wcr-sec">' + s + X(' sn', 's') + '</b>') +
        '<button class="big ghost" onclick="WCRank.cancelFind()">' + X('Vazgeç', 'Cancel') + '</button>');
      if (MM) MM.painted = true;
    }
    paint(); MM.clk = setInterval(function () { if (MM && !MM.got) paint(); }, 1000);
    if (!FB.ok) { MM.botT = setTimeout(toBot, 3500); return; }
    var q = FB.db.collection('queue').doc(FB.uid);
    q.set({ uid: FB.uid, nick: P.nick, rating: P.rating, status: 'waiting', mid: null, ts: ts() }).then(function () {
      if (!MM || MM.stop) { q.delete().catch(function () { }); return; }
      MM.unsub = q.onSnapshot(function (s) { var d = s.data(); if (MM && d && d.status === 'matched' && d.mid && !MM.got) { MM.got = true; gotMatch(d.mid); } });
      MM.poll = setInterval(claim, 2000); MM.hb = setInterval(function () { q.update({ ts: ts() }).catch(function () { }); }, 8000);
      claim();
    }).catch(function () { toBot(); });
    MM.botT = setTimeout(function () { if (MM && !MM.got) toBot(); }, CFG.queueSec * 1000);
  }
  function cancelFind() {
    var had = MM; stopMM();
    if (FB.ok) FB.db.collection('queue').doc(FB.uid).delete().catch(function () { });
    hub();
  }
  function claim() {
    if (!MM || MM.stop || MM.got || MM.claiming) return; MM.claiming = true;
    FB.db.collection('queue').where('status', '==', 'waiting').limit(25).get().then(function (sn) {
      if (!MM || MM.stop || MM.got) return;
      var list = [], ref = 0; sn.forEach(function (d) { var x = d.data(); if (x.ts && x.ts.toMillis) { x._t = x.ts.toMillis(); ref = Math.max(ref, x._t); list.push(x); } });
      var win = 150 + (Date.now() - MM.t0) / 1000 * 60, best = null;
      list.forEach(function (x) {
        if (x.uid === FB.uid || ref - x._t > 30000) return;       // bayat kayıtlar (kalp atışı yok) atlanır; saat farkı etkilemez
        var df = Math.abs((x.rating || CFG.start) - P.rating); if (df > win) return;
        if (!best || df < best.df) best = { df: df, x: x };
      });
      if (!best) { MM.claiming = false; return; }
      var qa = FB.db.collection('queue').doc(FB.uid), qb = FB.db.collection('queue').doc(best.x.uid), mref = FB.db.collection('matches').doc();
      return FB.db.runTransaction(function (t) {
        return Promise.all([t.get(qa), t.get(qb)]).then(function (r) {
          var a = r[0].data(), b = r[1].data(); if (!a || !b || a.status !== 'waiting' || b.status !== 'waiting') throw new Error('gone');
          var tier = WCStats.randomTier(), pr = WCStats.pickPair(tier), hc = pr.hc, gc = pr.gc;
          t.set(mref, { players: [FB.uid, b.uid], host: { uid: FB.uid, nick: P.nick, rating: P.rating }, guest: { uid: b.uid, nick: b.nick, rating: b.rating || CFG.start }, tier: tier, hc: hc, gc: gc, hsw: false, gsw: false, hok: false, gok: false, code: mkCode(), rh: null, rg: null, created: ts() });
          t.update(qa, { status: 'matched', mid: mref.id }); t.update(qb, { status: 'matched', mid: mref.id });
        });
      }).then(function () { if (MM && !MM.got) { MM.got = true; gotMatch(mref.id); } });
    }).catch(function () { }).then(function () { if (MM) MM.claiming = false; });
  }
  function gotMatch(mid) {
    stopMM();
    if (FB.ok) FB.db.collection('queue').doc(FB.uid).delete().catch(function () { });
    var ref = FB.db.collection('matches').doc(mid);
    ref.get().then(function (s) {
      var d = s.data(); if (!d) return fail();
      var host = d.host.uid === FB.uid, op = host ? d.guest : d.host;
      lobby({ mid: mid, role: host ? 'host' : 'guest', myC: host ? d.hc : d.gc, opC: host ? d.gc : d.hc, opNick: op.nick, opRating: op.rating || CFG.start, tier: d.tier, code: d.code, ref: ref, bot: false });
    }).catch(fail);
  }
  function fail() { hub(); toast(X('Eşleşme kurulamadı', 'Could not set up the match')); }
  /* V122: bot adları — tek "Mira" ve "Gaming" yerine geniş, gerçek oyuncu gibi görünen biçimler. Tek bir kelime sık tekrarlanmasın diye
     son kullanılan adlar hatırlanır (aynı sözcük art arda gelmez). */
  var FN1 = ['Efe', 'Deniz', 'Mert', 'Aras', 'Emre', 'Burak', 'Cem', 'Arda', 'Kerem', 'Onur', 'Tolga', 'Yigit', 'Baran', 'Selin', 'Ece', 'Zeynep', 'Defne', 'Nova', 'Vex', 'Atlas', 'Orion', 'Kral', 'Aslan', 'Kurt', 'Bora', 'Alp', 'Ege', 'Leo', 'Ryan', 'Alex', 'Max', 'Jake', 'Luka', 'Marco', 'Berk', 'Kaan', 'Umut', 'Ozan', 'Can', 'Ilker', 'Tuna', 'Mete', 'Doruk', 'Poyraz', 'Taha', 'Sarp', 'Ilgaz', 'Rüzgar', 'Yildiz', 'Elif', 'Ada', 'Asya', 'Derya', 'Naz', 'Lara', 'Ayaz', 'Sina', 'Nikos', 'Ivan', 'Omar', 'Hugo', 'Felix', 'Theo', 'Mika', 'Dante', 'Kai', 'Rex', 'Zed', 'Rio'];
  var FN2 = ['', '', '', '', '_', 'x', 'TR', 'Pro', 'Wolf', '_tr', 'GG', 'King', 'Boss', 'Zero', 'Fire', 'Storm', 'Shadow', 'Hunter', 'Ace', 'Lord', 'Tank', 'Blade', 'Sniper', 'FX', '34', '06', '35', '61'];
  var NAMED = [];   // son kullanılan adlar
  var STYLES = [
    function (a, b, n) { return a + n; },                       // Efe42
    function (a, b, n) { return a + '_' + (b || pickOf(FN2.slice(5))); },   // Mert_Wolf
    function (a, b, n) { return (b || pickOf(FN2.slice(5))) + a; },         // KingBora
    function (a, b, n) { return a.toLowerCase() + (n || Math.floor(rnd(10, 999))); },   // arda317
    function (a, b, n) { return a + pickOf(FN1); },             // EfeKaan
    function (a, b, n) { return 'xX' + a + 'Xx'; },             // xXBoraXx
    function (a, b, n) { return a + '.' + pickOf(['tr', 'gz', 'ist', 'ank', 'izm', 'jr']); },   // Cem.ist
    function (a, b, n) { return a + (Math.random() < .5 ? '07' : '99') ; }
  ];
  function botIdentity() {
    var nk = '', tries = 0;
    do {
      var a = pickOf(FN1), b = pickOf(FN2), n = Math.random() < .55 ? String(Math.floor(rnd(1, 99))) : (Math.random() < .5 ? String(Math.floor(rnd(1990, 2010))) : '');
      nk = pickOf(STYLES)(a, b, n).replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü _.\-]/g, '').replace(/^[_.\-]+/, '').slice(0, 14);
      if (nk.length < 3) nk = a + String(Math.floor(rnd(10, 99)));
      tries++;
    } while (tries < 8 && NAMED.some(function (x) { return x.toLowerCase() === nk.toLowerCase() || x.toLowerCase().indexOf(nk.toLowerCase().slice(0, 4)) === 0; }));
    NAMED.push(nk); if (NAMED.length > 12) NAMED.shift();
    var rt = Math.max(0, Math.round(P.rating + rnd(-70, 70)));
    return { nick: nk, rating: rt };
  }
  function toBot() {
    stopMM();
    if (FB.ok) FB.db.collection('queue').doc(FB.uid).delete().catch(function () { });
    var b = botIdentity(), tier = WCStats.randomTier(), pr = WCStats.pickPair(tier);
    lobby({ mid: 'bot-' + Date.now(), role: 'host', myC: pr.hc, opC: pr.gc, opNick: b.nick, opRating: b.rating, tier: tier, code: null, ref: null, bot: true });
  }

  /* ---- "rakip bulundu" + tek seferlik ülke değiştirme ---- */
  var LB = null;
  function lobby(o) {
    clearT(); LB = o; LB.swapped = false; LB.locked = false; LB.myOk = false; LB.opOk = false; LB.end = Date.now() + CFG.lobbySec * 1000;
    CUR = { mid: o.mid, bot: o.bot, role: o.role, opNick: o.opNick, opRating: o.opRating, ref: o.ref, done: false, before: P.rating };
    if (o.ref) {
      LB.unsub = o.ref.onSnapshot(function (s) {
        var d = s.data(); if (!d || !LB) return;
        var oc = o.role === 'host' ? d.gc : d.hc; if (oc && oc !== LB.opC) { LB.opC = oc; if (!LB.locked) draw(); }
        var ok = o.role === 'host' ? d.gok : d.hok; if (ok && !LB.opOk) { LB.opOk = true; if (!LB.locked) { if (LB.myOk) return launch(); draw(); } }   // V122: rakip ülkeyi onayladı
      });
    }
    draw(); iset(tick, 250);
    function tick() { if (!LB) return; var l = Math.ceil((LB.end - Date.now()) / 1000); var e = $i('wcr-lbt'); if (e) e.textContent = Math.max(0, l); if (l <= 0) launch(); }
  }
  function draw() {
    if (!LB) return; var lg = league(LB.opRating);
    rmodal('<h3>' + X('Rakip Bulundu!', 'Opponent Found!') + '</h3>' +
      '<div class="wcr-vs"><div class="wcr-side">' + fimg(LB.myC, 'lg') + '<b>' + esc(M[LB.myC].name) + '</b><small>' + X('Sen', 'You') + '</small></div><div class="wcr-x">VS</div>' +
      '<div class="wcr-side">' + fimg(LB.opC, 'lg') + '<b>' + esc(M[LB.opC].name) + '</b><small>' + esc(LB.opNick) + ' · ' + esc(lg.label) + '</small></div></div>' +
      '<div class="wcr-cd">' + X('Maç başlıyor: ', 'Match starts: ') + '<b id="wcr-lbt">' + Math.max(0, Math.ceil((LB.end - Date.now()) / 1000)) + '</b></div>' +
      '<button class="big pri" ' + (LB.myOk ? 'disabled' : '') + ' onclick="WCRank.confirmC()">' + (LB.myOk ? (LB.opOk ? '✓' : X('✓ Onaylandı — rakip bekleniyor…', '✓ Confirmed — waiting for rival…')) : '✓ ' + X('Ülkeyi Onayla (hemen başla)', 'Confirm Country (start now)')) + '</button>' +
      (LB.opOk && !LB.myOk ? '<div class="wcr-sm">' + X('Rakip hazır!', 'Rival is ready!') + '</div>' : '') +
      '<button class="big" ' + (LB.swapped || LB.myOk ? 'disabled' : '') + ' onclick="WCRank.swap()">' + (LB.swapped ? X('Ülke değiştirildi (hak bitti)', 'Country changed (used)') : X('Ülkeyi Değiştir — ', 'Change Country — ') + CFG.swapCost + ' 🪙') + '</button>' +
      '<div class="wcr-sm">🪙 ' + gold() + ' · ' + X('Bir kez, aynı güç grubundan rastgele.', 'Once, random from the same strength group.') + '</div>');
  }
  function swap() {
    if (!LB || LB.swapped || LB.locked || LB.myOk) return;
    if (!spend(CFG.swapCost)) return toast(X('Yeterli altın yok (', 'Not enough gold (') + CFG.swapCost + ')');
    var t = WCStats.tierOf(LB.myC), n = WCStats.pickNear(t, LB.role === 'host' ? 0 : 1, [LB.myC, LB.opC], LB.opC);   // V122: değişimde de rakibe makul uzaklıkta
    if (!n) { refund(CFG.swapCost); return toast(X('Uygun ülke bulunamadı', 'No suitable country')); }
    LB.swapped = true; LB.myC = n; draw();
    if (LB.ref) { var u = LB.role === 'host' ? { hc: n, hsw: true } : { gc: n, gsw: true }; LB.ref.update(u).catch(function () { }); }
  }
  /* V122: "Ülkeyi Onayla" — iki taraf da onaylarsa geri sayımı beklemeden maç başlar. Rakip YZ ise onay anında geçerli sayılır. */
  function confirmC() {
    if (!LB || LB.locked || LB.myOk) return;
    LB.myOk = true;
    if (LB.ref) LB.ref.update(LB.role === 'host' ? { hok: true } : { gok: true }).catch(function () { });
    if (LB.bot) LB.opOk = true;
    if (LB.opOk) return launch();
    draw();
  }
  /* V122: YZ rakip daha yumuşak — en üst lig bile tam gücün yarısını geçmez (asıl amaç gerçek rakiple mücadele) */
  function botLevel(r) { r = +r || CFG.start; return Math.max(0, Math.min(.5, (r - 900) / 1800)); }
  function launch() {
    if (!LB || LB.locked) return; LB.locked = true; clearT(); var o = LB; try { if (o.unsub) o.unsub(); } catch (e) { }
    jset('wcr_pending', { mid: o.mid, opRating: o.opRating, t: Date.now() });   // yarıda bırakma = mağlubiyet (sonraki açılışta işlenir)
    var cx = { mine: o.myC, opp: o.opC, mid: o.mid, oppNick: o.opNick, code: o.code, bot: o.bot };
    window.WC_BOTLV = o.bot ? botLevel(P.rating) : undefined;   // V116: YZ rakip zorluğu oyuncunun rank'ına göre (1000 puan ≈ çok kolay, 1900+ ≈ tam güç)
    if (!window.WCOnline || !WCOnline.rankedBot) return fail();
    if (o.bot) WCOnline.rankedBot(cx); else if (o.role === 'host') WCOnline.rankedHost(cx); else WCOnline.rankedJoin(cx);
  }
  function onFail(err) {
    jset('wcr_pending', null); CUR = null;
    rmodal('<h3>' + X('Bağlantı kurulamadı', 'Could not connect') + '</h3>' + M_(X('Rakiple canlı bağlantı kurulamadı (', 'Live link to the rival failed (') + esc(String(err || '')) + ').<br>' + X('Bu maç sayılmadı.', 'This match was not counted.')) + '<button class="big pri" onclick="WCRank.hub()">' + X('Tamam', 'OK') + '</button>');
  }

  /* ---------------- maç içi: kancalar ---------------- */
  function live() { try { return !!(G && G.mp && G.mp.rank); } catch (e) { return false; } }
  function botTurnNow() { try { return !!(G && G.mp && G.mp.bot && G.mp.act === 'guest' && G.ph === 'v5ai'); } catch (e) { return false; } }
  function botTurn() {   // sıra yapay zekâ rakipte: insan gibi gecikmeli başlar
    var d = rnd(CFG.botThinkMin, CFG.botThinkMax) * 1000 + (Math.random() < .15 ? rnd(3, 8) * 1000 : 0);
    setTimeout(function () {
      if (!G || G.over || !G.mp || !G.mp.bot || G.mp.act !== 'guest') return;
      G.ph = 'v5ai'; G.aiBusy = 0; G.endLock = 1; try { render(); } catch (e) { }
      if (window.V20 && V20.run) V20.run();
    }, d);
  }
  function beforeHandoff() {   // tur limiti: her oyuncu CFG.turnLimit tur oynayınca toplam güce göre karar
    var m = G.mp; if (!m || !m.rank || G.over) return;
    var T = (G.T && G.T.turn) || 0, lim = CFG.turnLimit, hit = m.bot ? (m.act === 'guest' && T >= lim) : (T >= lim * 2);
    if (!hit) return;
    var a = sum5(st(m.host)), b = sum5(st(m.guest)), side = ONs().side, actorHost = m.bot ? true : side === 'host';
    if (Math.abs(a - b) < .5) G.over = { w: 1, draw: 1, tl: 1 };
    else G.over = { w: ((a > b) === actorHost) ? 0 : -1, tl: 1 };
    G.ph = 'over';
  }

  /* ---- hamle süresi ---- */
  var TM = { turn: -1, left: CFG.moveSec, last: 0, key: '' };
  function timerEl() {
    var e = $i('wcr-t'); if (e) return e;
    e = document.createElement('div'); e.id = 'wcr-t'; document.body.appendChild(e); return e;
  }
  function hideT() { var e = $i('wcr-t'); if (e) e.style.display = 'none'; }
  setInterval(function () {
    try {
      if (!live() || G.over || G.ph === 'over' || G.ph === 'v7pick' || !G.T) { hideT(); return; }
      var on = ONs(), m = G.mp, mine = m.act === on.side, now = Date.now(), dt = TM.last ? (now - TM.last) / 1000 : 0; TM.last = now;
      var key = (m.act) + ':' + (G.T.turn || 0);
      if (key !== TM.key) { TM.key = key; TM.left = CFG.moveSec + (mine ? 0 : 12); }
      var busy = !!(G.busy || (typeof BSH !== 'undefined' && BSH));
      if (mine && G.ph === 'act') { if (!busy) TM.left -= dt; }
      else if (!mine) { TM.left = Math.max(0, TM.left - dt); }
      var e = timerEl(), sec = Math.max(0, Math.ceil(TM.left)); e.style.display = 'block';
      e.className = (mine ? 'me' : 'op') + (sec <= 10 && mine ? ' low' : '');
      var lab = mine ? '⏱ ' + sec : '⏳ ' + esc(on.ranked && on.ranked.oppNick || X('Rakip', 'Rival')) + ' ' + sec;
      if (e._s !== lab) { e._s = lab; e.innerHTML = lab; }
      if (mine && G.ph === 'act' && TM.left <= 0 && !busy && !G.endLock && typeof v5End === 'function') {
        TM.left = 0; try { closeMod(); } catch (x) { } toast(X('Süre doldu — tur otomatik bitti', 'Time is up — turn ended automatically')); v5End();
      }
    } catch (e) { }
  }, 250);

  /* ---- bağlantı kopması ---- */
  var DC = null;
  function dcBanner(txt) { var e = $i('wcr-dc'); if (!e) { e = document.createElement('div'); e.id = 'wcr-dc'; document.body.appendChild(e); } e.innerHTML = txt; e.style.display = 'block'; }
  function dcHide() { var e = $i('wcr-dc'); if (e) e.style.display = 'none'; }
  function onDisc() {
    if (DC || !live() || G.over) return;
    DC = { t0: Date.now() };
    DC.iv = setInterval(function () {
      var left = Math.max(0, Math.ceil(CFG.graceSec - (Date.now() - DC.t0) / 1000)), off = navigator.onLine === false;
      dcBanner('<b>' + (off ? X('Bağlantın koptu', 'You lost connection') : X('Rakibin bağlantısı koptu', 'Rival lost connection')) + '</b><span>' + left + '</span><small>' + (off ? X('Yeniden bağlanılıyor… dönmezsen maçı kaybedersin', 'Reconnecting… you lose if you do not return') : X('Dönmezse yenilir ve sen kazanırsın', 'If they do not return they forfeit and you win')) + '</small>');
      if (left <= 0) { clearInterval(DC.iv); DC = null; dcHide(); forfeit(); }
    }, 250);
  }
  function forfeit() {
    if (!G || G.over) return; var off = navigator.onLine === false;
    G.over = { w: off ? -1 : 0, dq: 1 }; G.ph = 'over'; try { render(); } catch (e) { } showOver();
  }
  function onResume() { if (DC) { clearInterval(DC.iv); DC = null; } dcHide(); toast(X('Bağlantı geri geldi', 'Connection restored')); }

  /* ---------------- sonuç ---------------- */
  function applyResult(out, opRating, mid, cb) {
    var score = out === 'win' ? 1 : out === 'loss' ? 0 : .5, before = P.rating;
    function local() {
      var d = eloDelta(P.rating, opRating, score, P.games), nr = Math.max(0, P.rating + d);
      P.rating = nr; P.games++; if (out === 'win') P.w++; else if (out === 'loss') P.l++; else P.d++; saveP();
      cb({ before: before, after: nr, d: nr - before });
    }
    if (!FB.ok) return local();
    var ref = FB.db.collection('players').doc(FB.uid), res = null;
    FB.db.runTransaction(function (t) {
      return t.get(ref).then(function (s) {
        if (!s.exists) throw new Error('noprofile');
        var c = s.data(); if (mid && c.lastMid === mid) { res = { before: c.rating, after: c.rating, d: 0 }; return; }
        var d = eloDelta(c.rating, opRating, score, c.games || 0), nr = Math.max(0, c.rating + d);
        t.update(ref, { nick: c.nick, rating: nr, games: (c.games || 0) + 1, w: (c.w || 0) + (out === 'win' ? 1 : 0), l: (c.l || 0) + (out === 'loss' ? 1 : 0), d: (c.d || 0) + (out === 'draw' ? 1 : 0), lastMid: mid || null, updated: ts() });
        res = { before: c.rating, after: nr, d: nr - c.rating };
        P.rating = nr; P.games = (c.games || 0) + 1; P.w = (c.w || 0) + (out === 'win' ? 1 : 0); P.l = (c.l || 0) + (out === 'loss' ? 1 : 0); P.d = (c.d || 0) + (out === 'draw' ? 1 : 0); saveP();
      });
    }).then(function () { cb(res); }).catch(function () { local(); });
  }
  function resolvePending(next) {   // yarıda bırakılan maç = mağlubiyet
    var pd = jget('wcr_pending', null); if (!pd) return next();
    jset('wcr_pending', null);
    applyResult('loss', pd.opRating || CFG.start, pd.mid, function (r) { toast(X('Yarıda bırakılan maç yenilgi sayıldı (', 'Abandoned match counted as a loss (') + r.d + ')'); next(); });
  }
  function consistent(a, b) { return (a === 'win' && b === 'loss') || (a === 'loss' && b === 'win') || (a === 'draw' && b === 'draw'); }
  function onOver() {
    if (!CUR || CUR.done) { if (CUR) return; CUR = { mid: G.mp.rank, bot: !!G.mp.bot, opRating: CFG.start, opNick: '?', done: false, before: P.rating }; }
    CUR.done = true; try { var o = G.over; } catch (e) { }
    var out = (G.over.draw || G.over.w === 1) ? 'draw' : (G.over.w === 0 ? 'win' : 'loss'), c = CUR, on = ONs();
    var reason = G.over.dq ? X('Bağlantı kopması', 'Disconnect') : G.over.tl ? X('Tur limiti', 'Turn limit') : '';
    hideT(); dcHide(); clearT();
    function fin(r) { jset('wcr_pending', null); showResult(out, r, reason, c); }
    if (c.bot || !c.ref || !FB.ok) return applyResult(out, c.opRating, c.mid, fin);
    rmodal('<h3>' + X('Sonuç doğrulanıyor…', 'Verifying result…') + '</h3><div class="wcr-spin"></div>' + M_(X('Rakibin bildirimi bekleniyor', 'Waiting for the rival\'s report')));
    var mine = c.role === 'host' ? 'rh' : 'rg', theirs = c.role === 'host' ? 'rg' : 'rh', upd = {}; upd[mine] = out;
    c.ref.update(upd).catch(function () { });
    var settled = false, un = null;
    function settle(valid) {
      if (settled) return; settled = true; try { if (un) un(); } catch (e) { }
      if (!valid) { jset('wcr_pending', null); return showResult('invalid', { before: P.rating, after: P.rating, d: 0 }, reason, c); }
      applyResult(out, c.opRating, c.mid, fin);
    }
    un = c.ref.onSnapshot(function (s) { var d = s.data(); if (!d || !d[theirs]) return; settle(consistent(out, d[theirs])); });
    setTimeout(function () { settle(true); }, CFG.verifySec * 1000);   // rakip sessizse (uygulamayı kapattıysa) kendi bildirimimiz geçerli
  }
  function showResult(out, r, reason, c) {
    var b = league(r.before), a = league(r.after), changed = b.i !== a.i || b.div !== a.div, up = r.after > r.before;
    var ttl = out === 'win' ? X('ZAFER', 'VICTORY') : out === 'loss' ? X('YENİLGİ', 'DEFEAT') : out === 'draw' ? X('BERABERLİK', 'DRAW') : X('MAÇ GEÇERSİZ', 'MATCH VOID');
    rmodal('<div class="wcr-res ' + out + '"><h2>' + ttl + '</h2>' + (reason ? '<div class="wcr-sm">' + esc(reason) + '</div>' : '') +
      (out === 'invalid' ? M_(X('İki taraf çelişkili sonuç bildirdi; puan değişmedi.', 'Both sides reported conflicting results; rating unchanged.')) :
        '<div class="wcr-d ' + (r.d > 0 ? 'p' : r.d < 0 ? 'n' : '') + '">' + (r.d > 0 ? '+' : '') + r.d + '</div><div class="wcr-rt">★ ' + r.after + '</div>') +
      (changed ? '<div class="wcr-lg ' + (up ? 'up' : 'down') + '"><span>' + (up ? X('LİG ATLADIN', 'PROMOTED') : X('LİG DÜŞTÜN', 'DEMOTED')) + '</span>' + badge(a, 1) + '<b style="color:' + a.c + '">' + esc(a.label) + '</b></div>' : '<div class="wcr-sm" style="color:' + a.c + '">' + esc(a.label) + '</div>') +
      '</div><button class="big pri" onclick="location.reload()">' + X('Ana Menü', 'Main Menu') + '</button>');
  }
  /* showOver sarmalayıcı: rank maçında standart bitiş ekranı yerine rank sonucu */
  var _so = window.showOver;
  window.showOver = function () { if (live()) { return onOver(); } return _so.apply(this, arguments); };

  window.WCRank = {
    CFG: CFG, league: league, eloDelta: eloDelta,
    open: openHub, hub: hub, find: find, cancelFind: cancelFind, board: board, nick: function () { askNick(false); }, saveNick: saveNick, confirmC: confirmC, reroll: reroll, link: link, linkSwitch: linkSwitch, swap: swap,
    // online.js / v20.js kancaları
    botTurnNow: botTurnNow, botTurn: botTurn, beforeHandoff: beforeHandoff, onDisc: onDisc, onResume: onResume, onFail: onFail, graceSec: function () { return CFG.graceSec; },
    _profile: function () { return P; }
  };
})();
