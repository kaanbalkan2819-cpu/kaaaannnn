/* V122 — HARİTA ÜZERİNDE ÖĞRETİCİ (WCTour).
   Gerçek bir tek kişilik oyunun üstünde, oyun durumuna (G.ph / seçili ülke / savaş ekranı) göre ilerleyen ipucu balonları + parlayan halka.
   Oyuna ENGEL OLMAZ: katman dokunuşları geçirir (yalnızca balon ve düğmeleri tıklanır). Atla ✕ her zaman açık.
   Yalnızca tek kişilik oyunda (G.mode == 1, G.mp yok) çalışır; Online ve Rank'ta ASLA görünmez.
   Hata olursa sessizce kapanır, oyunu bozmaz. TEST EDİLMEDİ (yalnızca söz dizimi denetimi). */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function $i(i) { return document.getElementById(i); }

  var S = { armed: false, key: '', ack: false, saw: false, iv: 0, built: false };

  /* ---- metinler ---- */
  var TXT = {
    pick: ['Bu dünya haritası 🌍 Oynamak istediğin ülkeye dokun: 5 değerini (Nüfus, Ordu, Ekonomi, Teknoloji, Diplomasi) ve tarihçesini göreceksin. Haritayı sürükleyip yakınlaştırabilirsin.',
      'This is the world map 🌍 Tap the country you want to play: you will see its 5 stats (Population, Army, Economy, Technology, Diplomacy) and history. Drag and zoom the map freely.'],
    confirm: ['Radar grafik ülkenin gücünü gösterir. Beğendiysen “Bu Ülkeyle Başla”, değilse “Başka Ülke Seç”.',
      'The radar shows the country’s strength. Happy with it? Tap “Start With This Country”, or choose another.'],
    roll: ['Her tur başında zar atılır 🎲 Zar kaç gelirse o kadar hamlen var (6 gelirse zar tekrar atılır).',
      'A die is rolled at the start of every turn 🎲 The roll is your number of moves (a 6 rolls again).'],
    targets: ['Haritada parlayan ülkeler saldırabileceğin komşularındır: 🏔 kara komşusu 1 hamle, 🚢 deniz yoluyla 2 hamle. Birine dokun!',
      'Glowing countries on the map are the neighbours you can attack: 🏔 by land costs 1 move, 🚢 overseas costs 2. Tap one!'],
    attack: ['Ülkeyi seçtin. Önce Ayrıntı ▸ 🔍 Keşfet ile gerçek değerlerini öğren, sonra ⚔ Saldır’a bas. 5 değerden 3’ünü kazanan savaşı kazanır.',
      'Country selected. First open Details ▸ 🔍 Scout to learn its real stats, then press ⚔ Attack. Win 3 of the 5 stats to win the war.'],
    notarget: ['Bu ülkeye şimdi saldıramazsın (komşun değil). Parlayan komşulardan birine dokun.',
      'You can’t attack this one right now (not a neighbour). Tap one of the glowing neighbours.'],
    battle: ['Zarlar atılır 🎲 Yüksek zar, tüm değerlerini çarpanla güçlendirir. 6 gelince “Dokun → yeni zar” yazar. Sonra 5 değer tek tek karşılaştırılır; 3’ünü alan kazanır!',
      'Dice are rolled 🎲 The higher die boosts all stats with a multiplier. A 6 shows “Tap → roll new die”. Then the 5 stats are compared; win 3 to win!'],
    endturn: ['Güzel! Hamlelerin bitince (ya da istediğin an) “Turu Bitir” düğmesine bas. Sonra rakipler oynar.',
      'Nice! When your moves are done (or any time) press the “End Turn” button. Then the rivals play.'],
    done: ['Hazırsın! 👑 Diplomasi için bir ülkeye dokunup Elçi gönderebilirsin. Kuralların tamamı Ayarlar ▸ 📖 altında.',
      'You’re ready! 👑 For diplomacy, tap a country and send an Envoy. All rules are under Settings ▸ 📖.']
  };

  /* ---- yardımcılar ---- */
  function menuOn() { var m = $i('wcm'); return !!(m && m.classList.contains('on')); }
  function soloGame() { try { return !!(G && !G.mp && G.mode == 1); } catch (e) { return false; } }
  function valid(r) { return r && r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.left < window.innerWidth && r.top < window.innerHeight; }
  function elRect(sel) { var e = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!e) return null; var cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return null; var r = e.getBoundingClientRect(); return valid(r) ? r : null; }
  function firstTargetRect() {
    try {
      if (typeof pel === 'undefined' || !pel || !TG) return null;
      var best = null, bd = 1e12, cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      pel.each(function (r) {
        if (!TG[r.id]) return; var rc = this.getBoundingClientRect(); if (!valid(rc)) return;
        var d = Math.pow(rc.left + rc.width / 2 - cx, 2) + Math.pow(rc.top + rc.height / 2 - cy, 2);
        if (d < bd) { bd = d; best = rc; }
      });
      return best;
    } catch (e) { return null; }
  }

  /* ---- oyun durumu → adım ---- */
  function state() {
    if (!soloGame() || G.over || G.ph === 'over') return null;
    if (G.ph === 'v7pick') return G.sel ? 'confirm' : 'pick';
    if (typeof BSH !== 'undefined' && BSH) { S.saw = true; return 'battle'; }
    if (G.ph === 'v5intro' || G.ph === 'v5roll') return 'roll';
    if (G.ph === 'act') {
      if (S.saw) return S.doneAck ? null : 'endturn';
      if (!G.sel) return 'targets';
      return (typeof TG !== 'undefined' && TG && TG[G.sel]) ? 'attack' : 'notarget';
    }
    return null;
  }
  function rectFor(k) {
    switch (k) {
      case 'pick': return elRect('#hud .ttl');
      case 'confirm': case 'attack': return elRect('#panel');
      case 'roll': return elRect('#box');
      case 'targets': return firstTargetRect();
      case 'endturn': return elRect('#v7end');
    }
    return null;
  }

  /* ---- arayüz ---- */
  function build() {
    if (S.built) return; S.built = true;
    var st = document.createElement('style');
    st.textContent = '#wctour{position:fixed;inset:0;z-index:40;pointer-events:none;display:none}' +
      '#wctr{position:fixed;display:none;border:3px solid #f5b53a;border-radius:14px;box-shadow:0 0 0 3px rgba(245,181,58,.25),0 0 18px 4px rgba(245,181,58,.55);animation:wctp 1.2s ease-in-out infinite;pointer-events:none;box-sizing:border-box}' +
      '@keyframes wctp{50%{transform:scale(1.05);opacity:.7}}' +
      '#wctb{position:fixed;left:50%;transform:translateX(-50%);width:min(92vw,380px);box-sizing:border-box;background:linear-gradient(180deg,#1b2a5a,#101a3d);border:1px solid #f5b53a;border-radius:16px;padding:12px 14px;color:#fff;font:14px/1.45 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.55);pointer-events:auto}' +
      '#wctb .t{margin-bottom:8px}#wctb .b{display:flex;gap:8px;justify-content:flex-end}' +
      '#wctb button{border:0;border-radius:12px;padding:8px 14px;font:700 13px system-ui,sans-serif;cursor:pointer;background:rgba(255,255,255,.14);color:#fff}' +
      '#wctb button.pri{background:#f5b53a;color:#241700}';
    document.head.appendChild(st);
    var d = document.createElement('div'); d.id = 'wctour';
    d.innerHTML = '<div id="wctr"></div><div id="wctb"><div class="t" id="wctt"></div><div class="b" id="wctbb"></div></div>';
    document.body.appendChild(d);
  }
  function hide() { var d = $i('wctour'); if (d) d.style.display = 'none'; }
  function end() { S.armed = false; S.key = ''; hide(); try { localStorage.setItem('wc_tut_seen', '1'); } catch (e) { } }

  function show(k) {
    build(); var d = $i('wctour'), ring = $i('wctr'), bub = $i('wctb'), bb = $i('wctbb');
    var rc = rectFor(k), isDone = (k === 'done');
    $i('wctt').innerHTML = X(TXT[k][0], TXT[k][1]);
    if (S.shown !== k) {   // düğmeleri yalnızca adım değişince kur
      S.shown = k;
      if (isDone) bb.innerHTML = '<button id="wctg">' + X('Kural Rehberi', 'Rule Guide') + '</button><button class="pri" id="wctk">' + X('Kapat', 'Close') + '</button>';
      else bb.innerHTML = '<button id="wcts">' + X('Atla ✕', 'Skip ✕') + '</button><button class="pri" id="wctk">' + X('Anladım ✓', 'Got it ✓') + '</button>';
      var K = $i('wctk'), Sk = $i('wcts'), Gd = $i('wctg');
      if (K) K.onclick = function () { if (isDone) end(); else if (k === 'endturn') { S.doneAck = true; S.key = ''; } else { S.ack = true; hide(); } };
      if (Sk) Sk.onclick = end;
      if (Gd) Gd.onclick = function () { end(); try { if (window.WCTut) WCTut.pages(); } catch (e) { } };
    }
    if (rc) {
      var pad = 6, w = Math.max(rc.width, 36) + pad * 2, h = Math.max(rc.height, 36) + pad * 2;
      ring.style.left = (rc.left + rc.width / 2 - w / 2) + 'px'; ring.style.top = (rc.top + rc.height / 2 - h / 2) + 'px';
      ring.style.width = w + 'px'; ring.style.height = h + 'px'; ring.style.display = 'block';
    } else ring.style.display = 'none';
    // balon: halka üst yarıdaysa ve adım "targets" ise altta, aksi halde üstte (HUD'un altında)
    var low = rc && k === 'targets' && (rc.top + rc.height / 2) < window.innerHeight * 0.42;
    if (low) { bub.style.top = 'auto'; bub.style.bottom = 'calc(env(safe-area-inset-bottom,0px) + 18px)'; }
    else { bub.style.bottom = 'auto'; bub.style.top = 'calc(env(safe-area-inset-top,0px) + 58px)'; }
    d.style.display = 'block';
  }

  function tick() {
    try {
      if (!S.armed) { hide(); return; }
      if (menuOn() || !soloGame()) { hide(); return; }
      var k = state();
      if (S.saw && S.doneAck && k === null && G.ph === 'act') k = 'done';   // son mesaj
      if (k === 'done') S.doneShown = true;
      else if (S.doneShown) { end(); return; }                               // son mesajdan sonra tur ilerleyince öğretici biter
      if (k !== S.key) { S.key = k; S.ack = false; S.shown = null; }
      if (!k || S.ack) { hide(); return; }
      show(k);
    } catch (e) { hide(); }
  }

  window.WCTour = {
    arm: function () { S.armed = true; S.key = ''; S.ack = false; S.saw = false; S.doneAck = false; S.doneShown = false; S.shown = null; build(); if (!S.iv) S.iv = setInterval(tick, 450); try { localStorage.setItem('wc_tut_seen', '1'); } catch (e) { } },
    stop: end,
    active: function () { return S.armed; }
  };
})();
