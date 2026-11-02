/* ONLINE v2 — iki kişilik ORTAK (aynı ülke, sırayla) ve KARŞILIKLI mod (PeerJS / WebRTC, hesap yok).
   Mimari: sırası gelen oyuncu oyunu kendi cihazında normal oynar (zar, saldırı, YZ fazı dahil).
   Turu bitip YZ fazı da bittiğinde tüm durum (G) anlık görüntü olarak rakibe gönderilir ve sıra ona geçer.
   Sırası olmayan oyuncu izleyici olur: harita, sınır ve istatistikler kayıt anlarında canlı güncellenir.
   Küçük kancalar: v5.js (startPlayerTurn / check5), v20.js (pickActors), v35.js (menü düğmesi). */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  var PID = 'wcq-', CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var ON = { coop: false, side: null, net: null, peer: null, noSave: false, pending: null, timer: 0, lastSeen: '', ranked: null, lost: 0, lastSent: null, lastRecvTurn: -1 };

  // ---------- taşıma katmanı (PeerJS) ----------
  function loadPeer(cb) {
    if (window.Peer) return cb();
    var urls = ['peerjs.min.js', 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
    (function next(i) {
      if (i >= urls.length) return cb('lib');
      var s = document.createElement('script'); s.src = urls[i];
      s.onload = function () { window.Peer ? cb() : next(i + 1); }; s.onerror = function () { next(i + 1); };
      document.head.appendChild(s);
    })(0);
  }
  function mkCode() { var c = ''; for (var i = 0; i < 5; i++) c += CH[Math.floor(Math.random() * CH.length)]; return c; }
  function wire(c) {
    var net = { send: function (o) { try { c.send(o); } catch (e) { } }, close: function () { try { c.close(); } catch (e) { } } };
    c.on('data', recv); c.on('close', closed); c.on('error', closed);
    return net;
  }
  function errTxt(t) {
    return t === 'lib' ? X('PeerJS kütüphanesi yüklenemedi (internet / peerjs.min.js).', 'Could not load PeerJS (internet / peerjs.min.js).')
      : t === 'peer-unavailable' ? X('Bu kodla bir oda bulunamadı.', 'No room found for this code.')
      : X('Bağlantı hatası: ', 'Connection error: ') + t;
  }

  // ---------- menü penceresi ----------
  function open() {
    modal('<h3>' + X('Online — arkadaşına karşı', 'Online — versus a friend') + '</h3>' +
      '<div style="color:var(--tx2);margin-bottom:8px">' + X('Her biri ayrı bir ülkeyi yönetir; sırayla oynarsınız. İkiniz de aynı anda açık olmalısınız.', 'Each of you rules a separate country; you take turns. Both must be online at the same time.') + '</div>' +
      '<button class="big pri" onclick="WCOnline.host(0)">' + X('Oda kur — Karşılıklı (ayrı ülkeler)', 'Create room — Head-to-head (separate countries)') + '</button>' +
      '<div style="display:flex;gap:8px;margin:8px 0"><input id="onc" maxlength="5" placeholder="' + X('Oda kodu', 'Room code') + '" style="flex:1;padding:12px;border-radius:10px;border:1px solid #6b5420;background:#1a1408;color:#f2c14e;font-size:18px;text-transform:uppercase;letter-spacing:4px;text-align:center">' +
      '<button class="big" style="flex:1;margin:0" onclick="WCOnline.join()">' + X('Katıl', 'Join') + '</button></div>' +
      '<button class="big ghost" onclick="WCOnline.cancel()">' + X('Vazgeç', 'Cancel') + '</button>');
  }
  function status(h, cancel) { modal('<h3>Online</h3><div style="text-align:center;padding:10px;color:var(--tx2)">' + h + '</div>' + (cancel === false ? '' : '<button class="big ghost" onclick="WCOnline.cancel()">' + X('Vazgeç', 'Cancel') + '</button>')); }
  function cancel() { teardown(); closeMod(); }
  function teardown() { try { if (ON.net) ON.net.close(); } catch (e) { } try { if (ON.peer) ON.peer.destroy(); } catch (e) { } ON.net = ON.peer = null; }

  function host(coop) {
    ON.coop = !!coop; ON.ranked = null;
    status(X('Oda hazırlanıyor…', 'Creating room…'));
    loadPeer(function (e) {
      if (e) return status(errTxt(e));
      (function tryOpen(n) {
        var code = mkCode(), p = new Peer(PID + code); ON.peer = p;
        p.on('open', function () {
          status(X('Oda kodu', 'Room code') + '<div style="font-size:42px;letter-spacing:8px;color:#f2c14e;margin:10px 0"><b>' + code + '</b></div>' + X('Arkadaşın bu kodu girince oyun başlar.', 'The game starts when your friend enters this code.'));
        });
        p.on('connection', function (c) {
          if (ON.net) { try { c.close(); } catch (e) { } return; }
          c.on('open', function () { connected(wire(c), 'host'); });
        });
        p.on('error', function (er) { if (er.type === 'unavailable-id' && n < 5) { try { p.destroy(); } catch (x) { } tryOpen(n + 1); } else status(errTxt(er.type)); });
      })(0);
    });
  }
  function join() {
    ON.ranked = null;
    var code = ((document.getElementById('onc') || {}).value || '').trim().toUpperCase();
    if (code.length < 5) return toast(X('5 haneli oda kodunu gir', 'Enter the 5-character room code'));
    status(X('Bağlanılıyor…', 'Connecting…'));
    loadPeer(function (e) {
      if (e) return status(errTxt(e));
      var p = new Peer(); ON.peer = p;
      p.on('open', function () {
        var c = p.connect(PID + code, { reliable: true });
        c.on('open', function () { connected(wire(c), 'guest'); });
        c.on('error', function (er) { status(errTxt(er.type || er)); });
      });
      p.on('error', function (er) { status(errTxt(er.type)); });
    });
  }

  // ---------- oyun başlatma + ülke seçimi (önce kurucu, sonra arkadaşı) ----------
  function waitModal(t) { modal('<h3>Online</h3><div style="text-align:center;padding:14px;color:var(--tx2)">' + t + '</div>'); }
  function connected(net, side) {
    ON.net = net; ON.side = side; ON.noSave = true; ON.hostPick = null; ON.picked = false;
    status(X('Bağlandı! Oyun kuruluyor…', 'Connected! Setting up…'), false);
    ON.pending = function () { if (ON.ranked) { rankedAuto(); return; } if (side === 'guest' && !ON.hostPick) waitModal(X('Kurucu ülkesini seçiyor…', 'The host is choosing a country…')); };
    WCLaunch(1);
  }
  var _ng = newGame;
  newGame = function (m) {
    var r = _ng.apply(this, arguments);
    if (m == 1 && ON.pending) { var f = ON.pending; ON.pending = null; f(); }
    return r;
  };
  var _v7c = window.v7Confirm;
  window.v7Confirm = function () {
    if (!ON.side || !G || G.ph !== 'v7pick' || !G.sel) return _v7c.apply(this, arguments);
    var id = G.sel;
    if (ON.side === 'guest' && !ON.hostPick) return;
    if (ON.side === 'guest' && id === ON.hostPick) return toast(X('Bu ülkeyi rakibin seçti', 'Your rival took this country'));
    ON.picked = true;
    G.pl = G.cur = G.act = id; G.sel = null; G.ph = 'v5wait'; G.kn = G.kn || {};
    var pn = document.getElementById('panel'); if (pn) pn.style.display = 'none';
    if (ON.side === 'host') {
      G.mp = { host: id, guest: ON.coop ? id : null, act: 'host', begin: 1, coop: ON.coop ? 1 : 0 }; if (ON.ranked) { G.mp.rank = ON.ranked.mid || 'r'; if (ON.ranked.bot) G.mp.bot = 1; } ON.net.send({ t: 'hostpick', c: id, coop: ON.coop ? 1 : 0 });
      if (ON.coop) { closeMod(); render(); home(0); ON.net.send({ t: 'start', s: snap() }); intro(); return; }
      waitModal(X('Rakip ülkesini seçiyor…', 'Your rival is choosing a country…'));
      if (ON.ranked && ON.ranked.bot) setTimeout(function () { recv({ t: 'guestpick', c: ON.ranked.opp }); }, 400);   // V114: YZ rakip ülkesini 'seçer'
    }
    else { ON.net.send({ t: 'guestpick', c: id }); waitModal(X('Kurucu oyunu başlatıyor…', 'The host is starting the game…')); }
    render();
  };
  function intro() {
    var m = G.mp, me = G.pl, op = ON.side === 'host' ? m.guest : m.host, mine = m.act === ON.side;
    if (m.coop) {
      modal('<h3>' + X('Ortak Sefer', 'Co-op Campaign') + '</h3>' +
        '<div class="dh">' + fimg(me, 'lg') + '<div><h3 style="margin:0 0 6px">' + M[me].name + '</h3><span class="bdg me">' + X('Sen + arkadaşın', 'You + your friend') + '</span></div></div>' +
        '<div style="color:var(--tx2);margin:8px 0">' + X('Aynı ülkeyi sırayla yönetirsiniz. Turunuz (yapay zekâ fazı dahil) bitince sıra arkadaşınıza geçer. Hedef: dünyayı birlikte fethetmek.', 'You rule the same country in turns. When your turn (including the AI phase) ends, it passes to your friend. Goal: conquer the world together.') + '</div>' +
        (mine ? '<button class="big pri" onclick="v5Start()">' + X('Başla — ilk sıra sende', 'Start — you move first') + '</button>'
          : '<button class="big pri" onclick="closeMod()">' + X('Tamam — arkadaşın başlıyor', 'OK — your friend starts') + '</button>'));
      bar();
      return;
    }
    modal('<h3>' + X('Karşılıklı Savaş', 'Head-to-Head') + '</h3>' +
      '<div class="dh">' + fimg(me, 'lg') + '<div><h3 style="margin:0 0 6px">' + M[me].name + '</h3><span class="bdg me">' + X('Sen', 'You') + '</span></div></div>' +
      '<div style="text-align:center;margin:6px 0;color:var(--tx2)">vs</div>' +
      '<div class="dh">' + fimg(op, 'lg') + '<div><h3 style="margin:0 0 6px">' + M[op].name + '</h3><span class="bdg">' + X('Rakip (arkadaşın)', 'Rival (your friend)') + '</span></div></div>' +
      '<div style="color:var(--tx2);margin:8px 0">' + X('Rakibin tüm topraklarını alan kazanır. Diğer ülkeleri yapay zekâ yönetir. Sıra: 1. oyuncu → bir yapay zekâ ülkesi → 2. oyuncu → bir yapay zekâ ülkesi → …', 'Capture all of your rival\'s lands to win. Other nations are run by the AI. Order: player 1 → one AI country → player 2 → one AI country → …') + '</div>' +
      (mine ? '<button class="big pri" onclick="v5Start()">' + X('Başla — ilk sıra sende', 'Start — you move first') + '</button>'
        : '<button class="big pri" onclick="closeMod()">' + X('Tamam — rakip başlıyor', 'OK — your rival starts') + '</button>'));
    bar();
  }

  // ---------- anlık görüntü ----------
  function snap() {
    var c = {}; for (var k in G) if (k !== 'busy' && k !== 'sel' && k !== 'ts') c[k] = G[k];
    return JSON.stringify(c);
  }
  function sendSnap(now) {
    if (!ON.net || !G || !G.mp || (!now && G.mp.act !== ON.side)) return;   // now=true: sıra devri (act zaten karşıya çevrildi)
    clearTimeout(ON.timer); ON.timer = 0;
    ON.lastSent = snap(); ON.net.send({ t: 'snap', s: ON.lastSent });
  }
  function schedule() {
    if (!ON.net || !G || !G.mp || G.mp.act !== ON.side || ON.timer) return;
    ON.timer = setTimeout(function () { ON.timer = 0; sendSnap(); }, 1200);
  }
  var _save = save;
  save = function () { if (ON.noSave || (G && G.mp)) { schedule(); return; } return _save.apply(this, arguments); };

  function adopt(s) {   // gelen görüntüyü bu cihazın bakış açısına çevirir
    var mine = ON.side === 'host' ? s.mp.host : s.mp.guest;
    if (s.over && !s.mp.coop) { var _o = s.over; s.over = { w: _o.w === 0 ? -1 : (_o.w === -1 ? 0 : _o.w) }; if (_o.draw) s.over.draw = 1; if (_o.dq) s.over.dq = 1; if (_o.tl) s.over.tl = 1; }   // kazanan/kaybeden gönderene göre yazılmıştır
    G = s; if (G.mp.act !== ON.side) G.mp.begin = 0; G.pl = G.act = G.cur = mine; G.busy = 0; G.sel = null; G.endLock = 0; G.aiBusy = 0; G.ts = Date.now();
    OV = {}; BT = null; BSH = false;
    return mine;
  }
  function recv(m) {
    if (!m || !m.t) return;
    if (m.t === 'hello') return;
    if (m.t === 'chat') { try { if (window.WCChat) WCChat.onMsg(m); } catch (e) { } return; }
    if (m.t === 'ev') { try { if (window.WCSpec) WCSpec.onEv(m); } catch (e) { } return; }   // V104: sıradaki oyuncunun ekranını izleme
    if (m.t === 'hostpick') {
      ON.hostPick = m.c; if (m.coop) ON.coop = true;
      if (ON.ranked && ON.side === 'guest') { if (G && G.ph === 'v7pick') guestAuto(); return; }
      if (!m.coop && G && G.ph === 'v7pick') { closeMod(); toast(X('Rakip: ', 'Rival: ') + M[m.c].name + X(' — şimdi sen bir ülke seç', ' — now pick your country')); }
      return;
    }
    if (m.t === 'guestpick' && G && G.mp && ON.side === 'host' && !G.mp.guest && m.c !== G.mp.host) {
      G.mp.guest = m.c; G.ecol = G.ecol || {}; G.ecolV68 = 1; G.ecolV73 = 1;
      G.ecol[G.mp.host] = '#2f855a'; G.ecol[m.c] = '#2b6cb0';
      closeMod(); render(); home(0);
      ON.net.send({ t: 'start', s: snap() });
      intro();
      return;
    }
    if (m.t === 'start') {
      adopt(JSON.parse(m.s)); G.ph = 'v5wait'; closeMod(); render(); home(0); intro();
      return;
    }
    if (m.t === 'snap' && G && G.mp) {
      var s = JSON.parse(m.s), wasMine = G.mp.act === ON.side;
      if (s.mp.act === ON.side && s.T && ON.lastRecvTurn >= s.T.turn) return;   // V114: yeniden bağlanmada tekrarlanan sıra anlık görüntüsünü yoksay
      if (s.mp.act === ON.side && s.T) ON.lastRecvTurn = s.T.turn;
      if (s.mp.act === ON.side) { clearTimeout(ON.spT); ON.spT = 0; ON.spPend = null; ON.spSig = ''; }
      else if (G.mp.act !== ON.side && !s.over) {   // V107: izlerken lag azaltma
        var sg = JSON.stringify([s.owner, s.es, s.T && s.T.turn, s.last]), now = Date.now();
        if (sg === ON.spSig) return;
        if (now - (ON.spAt || 0) < 1500) { ON.spPend = m; if (!ON.spT) ON.spT = setTimeout(function () { ON.spT = 0; var p = ON.spPend; ON.spPend = null; if (p && G && G.mp && G.mp.act !== ON.side) recv(p); }, 1500 - (now - ON.spAt)); return; }
        ON.spSig = sg; ON.spAt = now;
        try { if (window.WCChat) WCChat.devDiff(G, s); } catch (e) { }
      }
      adopt(s);
      closeMod(); try { if (window.v5RollResume) v5RollResume(); } catch (e) { }
      if (G.over) { G.ph = 'over'; render(); showOver(); bar(); return; }
      if (G.mp.act === ON.side) {      // sıra bana geçti
        G.mp.begin = 1; G.ph = 'v5wait'; render(); bar();
        toast(X('Sıra sende!', 'Your turn!'));
        if (window.V5 && V5.start) V5.start();
        return;
      }
      G.ph = 'v5wait'; render(); bar();
      var l = G.last && (G.last.att + '>' + G.last.tg + ':' + G.last.win + ':' + G.T.turn);
      if (G.last && l !== ON.lastSeen) { ON.lastSeen = l; if (!G.last.ai) toast('⚔ ' + M[G.last.att].name + ' → ' + M[G.last.tg].name + ' (' + (G.last.win ? X('zafer', 'victory') : X('yenilgi', 'defeat')) + ')'); }
    }
  }
  function closed() {
    if (!ON.net) return;
    if (window.WCRank && G && G.mp && G.mp.rank && !G.mp.bot && !G.over) {   // V114: rank maçında 10 sn geri dönme süresi
      ON.net = null; ON.lost = 1; WCRank.onDisc(); startReconnect(); return;
    }
    ON.net = null;
    modal('<h3>' + X('Bağlantı koptu', 'Connection lost') + '</h3><div style="color:var(--tx2)">' + X('Rakiple bağlantı kesildi. Oyun kaydedilmedi.', 'The link to your rival was lost. This game is not saved.') + '</div><button class="big pri" onclick="location.reload()">' + X('Ana menü', 'Main menu') + '</button>');
  }


  // ---------- V114: RANK MAÇI taşıma/kurulum yardımcıları (ranked.js çağırır) ----------
  function rankedFail(e) { teardown(); closeMod(); if (window.WCRank) WCRank.onFail(e); }
  function rankedAuto() {
    var o = ON.ranked; closeMod();
    if (ON.side === 'host') { G.sel = o.mine; window.v7Confirm(); }
    else if (ON.hostPick) guestAuto(); else waitModal(X('Rakip hazırlanıyor…', 'Rival is getting ready…'));
  }
  function guestAuto() {
    if (ON.picked || !G || G.ph !== 'v7pick') return;
    if (ON.hostPick === ON.ranked.mine) return toast(X('Ülke çakışması', 'Country clash'));
    G.sel = ON.ranked.mine; window.v7Confirm();
  }
  function rankedHost(o) {
    ON.coop = false; ON.ranked = o; ON.lost = 0; ON.lastRecvTurn = -1;
    status(X('Rakip bağlanıyor…', 'Connecting to rival…'), false);
    loadPeer(function (e) {
      if (e) return rankedFail(e);
      var p = new Peer(PID + o.code), to = setTimeout(function () { if (!ON.net) rankedFail('timeout'); }, 30000); ON.peer = p;
      p.on('connection', function (c) {
        if (ON.lost) { c.on('open', function () { resumed(wire(c)); }); return; }
        if (ON.net) { try { c.close(); } catch (e) { } return; }
        c.on('open', function () { clearTimeout(to); connected(wire(c), 'host'); });
      });
      p.on('disconnected', function () { try { p.reconnect(); } catch (e) { } });
      p.on('error', function (er) { if (!ON.net && !ON.lost) rankedFail(er.type); });
    });
  }
  function rankedJoin(o) {
    ON.coop = false; ON.ranked = o; ON.lost = 0; ON.lastRecvTurn = -1;
    status(X('Rakibe bağlanılıyor…', 'Connecting to rival…'), false);
    loadPeer(function (e) {
      if (e) return rankedFail(e);
      var p = new Peer(); ON.peer = p;
      p.on('open', function () { dial(p, o.code, Date.now(), 30000, function (net) { connected(net, 'guest'); }, function () { rankedFail('timeout'); }); });
      p.on('disconnected', function () { try { p.reconnect(); } catch (e) { } });
      p.on('error', function (er) { if (er.type !== 'peer-unavailable' && !ON.net && !ON.lost) rankedFail(er.type); });
    });
  }
  function dial(p, code, t0, maxMs, ok, bad) {   // host hazır olana kadar tekrar dener
    (function go() {
      if (Date.now() - t0 > maxMs) return bad();
      var c = p.connect(PID + code, { reliable: true }), done = false;
      c.on('open', function () { done = true; ok(wire(c)); });
      c.on('error', function () { });
      setTimeout(function () { if (!done) { try { c.close(); } catch (e) { } if (!ON.net || ON.lost) go(); } }, 2500);
    })();
  }
  function rankedBot(o) {
    o.bot = true; ON.coop = false; ON.ranked = o; ON.lost = 0;
    connected({ send: function () { }, close: function () { } }, 'host');
  }
  function startReconnect() {
    var p = ON.peer; if (!p || !ON.ranked) return;
    try { if (p.disconnected) p.reconnect(); } catch (e) { }
    if (ON.side === 'guest') dial(p, ON.ranked.code, Date.now(), (WCRank.graceSec() + 4) * 1000, function (net) { resumed(net); }, function () { });
  }
  function resumed(net) {
    ON.net = net; ON.lost = 0;
    try { WCRank.onResume(); } catch (e) { }
    ON.net.send({ t: 'hello' });
    if (ON.lastSent && G && G.mp && G.mp.act !== ON.side) ON.net.send({ t: 'snap', s: ON.lastSent });   // kaçan sıra devrini yeniden gönder
    try { bar(); } catch (e) { }
  }

  // ---------- tur geçişi ----------
  function handoff() {   // v5.js startPlayerTurn kancası: true = yeni tur BURADA başlamaz
    var m = G.mp;
    if (m.begin) { m.begin = 0; return false; }
    if (!ON.net) return false;
    try { if (window.WCRank && m.rank) WCRank.beforeHandoff(); } catch (e) { }   // V114: tur limiti
    m.act = m.act === 'host' ? 'guest' : 'host';
    G.ph = G.over ? 'over' : 'v5wait'; G.endLock = 0; G.aiBusy = 0; G.busy = 0; G.sel = null;
    if (m.bot) {   // V114: YZ rakip — canlı bağlantı yok, sıra aynı cihazda devredilir
      render(); bar();
      if (G.over) { showOver(); return true; }
      if (m.act === 'guest') WCRank.botTurn(); else { m.begin = 1; G.ph = 'v5wait'; toast(X('Sıra sende!', 'Your turn!')); if (window.V5 && V5.start) V5.start(); }
      return true;
    }
    sendSnap(true); render(); bar();
    if (G.over) showOver();
    return true;
  }
  function wrapStart() {   // olay / tick sarmalayıcılarından ÖNCE yakala (V5.start dış kabuğu)
    if (!window.V5 || !V5.start || V5.start.on1) return;
    var s0 = V5.start;
    V5.start = function () { if (G && G.mp && !G.mp.begin && ON.net) { handoff(); return; } return s0.apply(this, arguments); };
    V5.start.on1 = 1;
  }

  // ---------- arayüz şeridi ----------
  function bar() {
    var b = document.getElementById('onbar');
    if (!G || !G.mp || !ON.net) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div'); b.id = 'onbar';
      b.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);right:calc(env(safe-area-inset-right,0px) + 74px);z-index:60;pointer-events:none;background:rgba(20,14,6,.88);color:#f2c14e;border:1px solid #6b5420;padding:4px 10px;border-radius:999px;font:600 12px system-ui,sans-serif;white-space:nowrap';
      document.body.appendChild(b);
    }
    var mine = G.mp.act === ON.side, op = ON.side === 'host' ? G.mp.guest : G.mp.host;
    b.textContent = G.over ? '' : (mine ? '🟢 ' + X('Senin sıran', 'Your turn') : '⏳ ' + (G.mp.coop ? X('Arkadaşının sırası', 'Friend\'s turn') : (ON.ranked ? ON.ranked.oppNick : M[op].name)));
    b.style.display = G.over ? 'none' : 'block';
  }
  var _render = render;
  render = function () { var r = _render.apply(this, arguments); try { if (G && G.mp) bar(); } catch (e) { } return r; };

  window.WCOnline = {
    open: open, host: host, join: join, cancel: cancel, handoff: handoff,
    rankedHost: rankedHost, rankedJoin: rankedJoin, rankedBot: rankedBot,   // V114
    _connect: connected, sendChat: function (o) { if (ON.net) ON.net.send(o); }, _recv: recv, _state: function () { return ON; }   // test için
  };
  wrapStart();
  window.addEventListener('load', wrapStart); setTimeout(wrapStart, 1500);
})();
