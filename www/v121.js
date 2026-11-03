/* V121 — NASIL OYNANIR (öğretici). Ana menüde "Nasıl Oynanır" düğmesi + Ayarlar penceresinde 📖 düğmesi.
   Sayfalar aşağıdaki PAGES dizisinde; metinleri buradan düzenleyebilirsin. Değerler koddaki gerçek kurallardan alındı
   (app.js battle/repar, v18.js altın, v102.js değer görevleri, v40.js diplomasi). */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  var PAGES = [
    { ic: '🌍', t: ['Amaç', 'Goal'], b: [
      '<p>Bir ülke seç, komşularını fethet ve dünyayı ele geçir.</p><p><b>Tüm toprakları alırsan kazanırsın</b>, kendi topraklarının hepsini kaybedersen yenilirsin.</p><p>Her ülkenin 5 değeri vardır; savaşı bu değerler ve zarlar belirler.</p>',
      '<p>Pick a country, conquer your neighbours and take over the world.</p><p><b>Take every region to win</b>; lose all of yours and you are defeated.</p><p>Every country has 5 stats; wars are decided by these stats and the dice.</p>'] },
    { ic: '🎲', t: ['Tur ve Hamle', 'Turns & Moves'], b: [
      '<p>Her tur başında zar atılır. <b>Zar = o turdaki hamle hakkın.</b> 6 gelirse zar tekrar atılır (en çok 3 zar).</p><ul><li>Saldırı: <b>1 hamle</b> (deniz aşırı: <b>2 hamle</b>)</li><li>Keşif: 1 hamle (tur başına 1 kez; rakibin değerlerini açar)</li><li>Diplomasi hamlesi: <b>2 hamle</b> (yetmezse ödüllü reklam izleyebilirsin)</li></ul><p>Hamlen yettiği kadar saldırabilirsin. Kullanılmayan hamleler sonraki tura taşınmaz.</p>',
      '<p>A die is rolled at the start of each turn. <b>The roll = your moves for the turn.</b> A 6 rolls again (up to 3 dice).</p><ul><li>Attack: <b>1 move</b> (overseas: <b>2 moves</b>)</li><li>Scout: 1 move (once per turn; reveals the rival\'s stats)</li><li>Diplomacy action: <b>2 moves</b> (or watch a rewarded ad)</li></ul><p>Attack as many times as your moves allow. Unused moves do not carry over.</p>'] },
    { ic: '📊', t: ['Beş Değer', 'The Five Stats'], b: [
      '<ul><li>👥 <b>Nüfus</b> — savunma avantajı: savunanın nüfusu yüksekse tüm değerleri en çok +%10 artar.</li><li>🎖 <b>Ordu</b> — saldırı avantajı: saldıranın ordusu yüksekse tüm değerleri en çok +%10 artar.</li><li>💰 <b>Ekonomi</b> — tur başında %6–%30 ihtimalle +1 hamle (seferberlik gideri hazineden ödenir); her tur gelir, bakım ve enflasyon uygulanır. Fetihte ele geçirilen toprak, kaybeden hazinenin toprak payı kadar kaynak taşır. Savaş tazminatı da ekonomiden ödenir.</li><li>🔬 <b>Teknoloji</b> — rakipten %20 üstünsen zarına +1, %60 üstünsen +2 eklenir.</li><li>🕊 <b>Diplomasi</b> — savaşa katılan müttefiklerin katkısını artırır (en çok +%20) ve anlaşma tekliflerinin kabulünü kolaylaştırır.</li></ul>',
      '<ul><li>👥 <b>Population</b> — defence edge: if the defender has more, all its stats get up to +10%.</li><li>🎖 <b>Army</b> — attack edge: if the attacker has more, all its stats get up to +10%.</li><li>💰 <b>Economy</b> — a 6–30% chance per turn of +1 move (mobilization cost is paid from the treasury); turn income, upkeep and inflation apply every turn. A captured territory carries its share of the losing treasury. War reparations are paid from Economy.</li><li>🔬 <b>Technology</b> — 20% ahead of the rival: die +1; 60% ahead: die +2.</li><li>🕊 <b>Diplomacy</b> — boosts allies\' contribution in war (up to +20%) and makes treaty offers easier to win.</li></ul>'] },
    { ic: '⚔', t: ['Savaş Nasıl Kazanılır', 'How Wars Are Won'], b: [
      '<p>İki taraf zar atar. 5 değer tek tek karşılaştırılır; <b>5 satırdan 3\'ünü kazanan savaşı kazanır.</b></p><p><b>Zar sadece çarpan verir:</b> yüksek zar atan tarafın <u>tüm</u> değerleri <b>×(1 + 0,15 × zar farkı)</b> olur. Eşit zarda çarpan yoktur. Ekonomi/Teknoloji zarın kendisini değiştirmez; yalnızca Teknoloji, yukarıdaki +1/+2 ile zarı güçlendirir.</p><p>Önceki savaşı kazanma bonusu ×1,35 olabilir. Art arda savaşan ülke yorulur ve değerleri düşer.</p>',
      '<p>Both sides roll. The 5 stats are compared one by one; <b>whoever wins 3 of 5 rows wins the war.</b></p><p><b>The die only gives a multiplier:</b> the side with the higher die gets <b>×(1 + 0.15 × die difference)</b> on <u>all</u> stats. Equal dice give no multiplier. Economy/Technology never change the die itself; only Technology boosts it with the +1/+2 above.</p><p>A previous-win bonus of ×1.35 may apply. A country that fights repeatedly gets tired and its stats drop.</p>'] },
    { ic: '💰', t: ['Savaş Sonu Kazancı', 'Spoils of War'], b: [
      '<p>Kazanan toprak alır, kaybeden <b>ekonomisinden tazminat öder</b>:</p><p><b>Kaybedenin ekonomisi × (%5 + %2 × kazanılan satır farkı) × oran</b></p><p>Satır farkı 1–5 arasıdır (5-0 kazanmak en çok kazandırır). Oran, kaybedenin ekonomisinin kazananınkine bölümüdür (0,5 ile 1,5 arasına sıkıştırılır). Kaybeden en az 1 ekonomi puanı ile kalır. Tazminat kazananın ekonomisine eklenir.</p><p>🪙 <b>Altın:</b> zafer = +1, ayrıca tazminatın %6\'sı kadar ek (en çok +3). Yenilgi = 0. Saldırıyı kaybedersen toprak da kaybedebilirsin.</p>',
      '<p>The winner takes territory and the loser <b>pays reparations from its Economy</b>:</p><p><b>Loser\'s Economy × (5% + 2% × row margin) × ratio</b></p><p>The margin is 1–5 rows (a 5-0 win pays most). The ratio is loser\'s Economy ÷ winner\'s (clamped to 0.5–1.5). The loser keeps at least 1 Economy point. The reparations are added to the winner\'s Economy.</p><p>🪙 <b>Gold:</b> win = +1 plus 6% of the reparations (max +3). Loss = 0. If you lose an attack you may lose a region too.</p>'] },
    { ic: '🤝', t: ['Diplomasi', 'Diplomacy'], b: [
      '<p>Bir ülkeyi seçip <b>Elçi</b> gönder:</p><ul><li>🕊 Saldırmazlık paktı</li><li>🔥 Kışkırt: bir ülkeyi başkasına karşı kışkırtır</li><li>🛡 <b>Koruma talebi</b> ve <b>Güvenlik garantisi</b> (tampon bölge): koruyucu <u>yalnızca sana saldırılırsa</u> seninle savaşır; senin saldırı savaşlarına girmez</li><li>🤝 <b>Dostluk antlaşması</b> (ittifak): en çok 4 devlet, süreli. Müttefikler savaşta değerlerini toplar; panelde bayrakları görünür. Müttefikine saldırırsan bu <b>ihanettir</b>: o savaşta müttefikin ×2 güçlü olur.</li><li>💎 Haraç: güçlü olan zayıftan koruma parası isteyebilir; haraç aldığın ülkeye saldıramazsın.</li></ul>',
      '<p>Pick a country and send an <b>Envoy</b>:</p><ul><li>🕊 Non-aggression pact</li><li>🔥 Incite: turn a country against another</li><li>🛡 <b>Protection request</b> and <b>Security guarantee</b> (buffer zone): the protector fights <u>only if you are attacked</u>; it never joins your attack wars</li><li>🤝 <b>Friendship treaty</b> (alliance): up to 4 states, time-limited. Allies add their stats in war and their flags show on the battle panel. Attacking an ally is <b>betrayal</b>: that ally is ×2 stronger in that war.</li><li>💎 Tribute: the stronger side may demand protection money; you cannot attack a country you collect tribute from.</li></ul>'] },
    { ic: '💡', t: ['İpuçları', 'Tips'], b: [
      '<ul><li>Saldırmadan önce <b>keşfet</b>: değerleri bilmeden saldırmak kumardır.</li><li>5 değerden 3\'ünde üstün olmak yeter; en zayıf rakip satırlarını seç.</li><li>Zar şansına güvenme: Teknoloji üstünlüğü ve müttefikler daha güvenilirdir.</li><li>Çok güçlü (1,6 kattan fazla) ülkeye yalnızca kara sınırından saldırabilirsin.</li><li>Koruma/tampon bölge anlaşmalarını saldırıya değil, savunmaya hazırlık için kullan.</li></ul><p><b>İyi seferler!</b></p>',
      '<ul><li><b>Scout</b> before attacking: attacking blind is a gamble.</li><li>Winning 3 of 5 rows is enough; target the rival\'s weakest rows.</li><li>Don\'t rely on dice luck: Technology edge and allies are more reliable.</li><li>A country more than 1.6× stronger can only be attacked over a land border.</li><li>Use protection/buffer treaties for defence, not offence.</li></ul><p><b>Good luck!</b></p>'] }
  ];
  var cur = 0;
  function page(i) {
    cur = Math.max(0, Math.min(PAGES.length - 1, i)); var p = PAGES[cur], dots = '';
    for (var k = 0; k < PAGES.length; k++) dots += '<span style="display:inline-block;width:8px;height:8px;margin:0 3px;border-radius:50%;background:' + (k === cur ? '#f5b53a' : 'rgba(255,255,255,.25)') + '"></span>';
    var h = '<div style="text-align:right;margin:-4px 0 2px"><button class="big ghost" style="display:inline-block;width:auto;margin:0;padding:6px 14px;font-size:13px" onclick="WCTut.skip()">' + X('Atla', 'Skip') + ' ✕</button></div>' +
      '<h2>' + p.ic + ' ' + X(p.t[0], p.t[1]) + '</h2>' +
      '<div style="text-align:left;font-size:14px;line-height:1.45;max-height:58vh;overflow:auto;padding:0 4px">' + X(p.b[0], p.b[1]) + '</div>' +
      '<div style="text-align:center;margin:10px 0 4px">' + dots + '</div>' +
      '<div style="display:flex;gap:8px">' +
      (cur > 0 ? '<button class="big" style="flex:1" onclick="WCTut.go(' + (cur - 1) + ')">‹ ' + X('Geri', 'Back') + '</button>' : '') +
      (cur < PAGES.length - 1 ? '<button class="big pri" style="flex:1" onclick="WCTut.go(' + (cur + 1) + ')">' + X('İleri', 'Next') + ' ›</button>' : '<button class="big pri" style="flex:1" onclick="WCTut.close()">' + X('Anladım', 'Got it') + '</button>') +
      '</div>' + (cur < PAGES.length - 1 ? '<button class="big ghost" onclick="WCTut.close()">' + X('Kapat', 'Close') + '</button>' : '');
    modal(h);
  }
  var after = null;
  function done() { var f = after; after = null; if (f) { try { f(); } catch (e) { } } }
  function seen() { try { localStorage.setItem('wc_tut_seen', '1'); } catch (e) { } }
  function saveKey() { try { return (typeof SV !== 'undefined' && SV) ? SV : 'wc_save_v1'; } catch (e) { return 'wc_save_v1'; } }
  function hasSv() { try { return !!localStorage.getItem(saveKey()); } catch (e) { return false; } }
  function menuOn() { var m = document.getElementById('wcm'); return !!(m && m.classList.contains('on')); }
  function inSolo() { try { return !!(window.G && !G.mp && G.mode == 1 && !G.over && G.ph !== 'over' && !menuOn()); } catch (e) { return false; } }
  function newTutGame() { try { closeMod(); } catch (e) { } if (window.WCTour) WCTour.arm(); if (window.WCLaunch) WCLaunch(1); }
  window.WCTut = {
    /* V122: ÖĞRETİCİ ARTIK HARİTA ÜZERİNDE (wc_tour.js). Oyun içindeyse mevcut oyunda başlar; menüdeyse yeni bir deneme seferi açar. */
    open: function () {
      seen();
      if (!window.WCTour) return window.WCTut.pages();
      if (inSolo()) { try { closeMod(); } catch (e) { } WCTour.arm(); return; }
      if (!hasSv()) return newTutGame();
      modal('<h2>📖 ' + X('Haritada Öğretici', 'Tutorial on the Map') + '</h2>' +
        '<p style="text-align:center;font-size:14px;line-height:1.45">' + X('Öğretici, gerçek bir oyunun üstünde anlatır ve yeni bir sefer başlatır. Kayıtlı seferin silinir. Devam edilsin mi?', 'The tutorial runs on top of a real game and starts a new campaign. Your saved campaign will be deleted. Continue?') + '</p>' +
        '<button class="big pri" onclick="WCTut._newTut()">' + X('Evet, başlat', 'Yes, start') + '</button>' +
        '<button class="big ghost" onclick="closeMod()">' + X('Vazgeç', 'Cancel') + '</button>');
    },
    _newTut: newTutGame,
    /* eski sayfa sayfa kural rehberi (referans) */
    pages: function (cb) { seen(); after = typeof cb === 'function' ? cb : null; page(0); },
    go: page,
    close: function () { try { closeMod(); } catch (e) { } done(); },
    skip: function () { try { closeMod(); } catch (e) { } done(); },   // tek dokunuşla atla (kural rehberi)
    /* ask(cb): "öğretici ister misin?" — evet: oyun açılır ve öğretici HARİTA ÜZERİNDE çalışır; hayır: cb (varsa) ile doğrudan oyun / yoksa sadece kapanır */
    ask: function (cb) {
      after = null; window.WCTut._cb = cb || null;
      modal('<h2>📖 ' + X('Öğretici ister misin?', 'Want a quick tutorial?') + '</h2>' +
        '<p style="text-align:center;font-size:14px;line-height:1.45">' + X('Kuralları gerçek haritanın üzerinde, oynarken adım adım gösterelim mi? İstersen tek dokunuşla atlayabilirsin.', 'Want us to show the rules step by step on the real map while you play? You can skip it with one tap.') + '</p>' +
        '<button class="big pri" onclick="WCTut._yes()">' + X('Evet, haritada göster', 'Yes, show me on the map') + '</button>' +
        '<button class="big" onclick="WCTut._no()">' + (cb ? X('Hayır, oyuna başla', 'No, start the game') : X('Şimdilik geç', 'Maybe later')) + '</button>');
    },
    /* V125: tek kişilik yeni oyun başladıktan SONRA sor. later(): bir sonraki newGame(1) bitince soru açılır. */
    later: function () { pendingAsk = true; },
    askInGame: function () {
      try { if (!(window.G && !G.mp && G.mode == 1 && !G.over)) return; } catch (e) { return; }
      modal('<h2>📖 ' + X('Öğretici ister misin?', 'Want a quick tutorial?') + '</h2>' +
        '<p style="text-align:center;font-size:14px;line-height:1.45">' + X('Kuralları gerçek haritanın üzerinde, oynarken adım adım gösterelim mi? İstersen tek dokunuşla atlayabilirsin.', 'Want us to show the rules step by step on the real map while you play? You can skip with one tap.') + '</p>' +
        '<button class="big pri" onclick="WCTut._yesIn()">' + X('Evet, haritada göster', 'Yes, show me on the map') + '</button>' +
        '<button class="big" onclick="WCTut._noIn()">' + X('Hayır, oynayayım', 'No, let me play') + '</button>');
    },
    _yesIn: function () { seen(); try { closeMod(); } catch (e) { } if (window.WCTour) WCTour.arm(); },
    _noIn: function () { seen(); try { closeMod(); } catch (e) { } },
    _yes: function () {
      var f = window.WCTut._cb; window.WCTut._cb = null; seen();
      if (window.WCTour) WCTour.arm();
      try { closeMod(); } catch (e) { }
      if (f) f(); else if (window.WCLaunch) WCLaunch(1);
    },
    _no: function () { var f = window.WCTut._cb; window.WCTut._cb = null; seen(); try { closeMod(); } catch (e) { } if (f) f(); }
  };

  /* İlk açılış: kayıtlı sefer yoksa ve öğretici hiç görülmediyse menü açılınca bir kez sorulur (tek dokunuşla geçilir) */
  function autoFirst() {
    try { if (localStorage.getItem('wc_tut_seen')) return; if (localStorage.getItem(saveKey())) return; } catch (e) { return; }
    var n = 0, iv = setInterval(function () {
      n++; var r = document.getElementById('wcm');
      if (r && r.classList.contains('on')) { clearInterval(iv); try { if (!localStorage.getItem('wc_tut_seen')) WCTut.ask(null); } catch (e) { } }
      else if (n > 40) clearInterval(iv);
    }, 500);
  }
  /* V125: ilk açılışta menüde sorma — öğretici sorusu artık tek kişilik oyun BAŞLADIKTAN sonra sorulur */
  // window.addEventListener('load', autoFirst);

  /* Ayarlar penceresine 📖 düğmesi */
  function hookSettings() {
    if (typeof settings !== 'function' || settings.wc121) return;
    var _s = settings;
    settings = function () {
      var r = _s.apply(this, arguments);
      try {
        var box = document.getElementById('box');
        if (box && !box.querySelector('.wctutb')) {
          var b = document.createElement('button'); b.className = 'big wctutb'; b.textContent = '📖 ' + X('Nasıl Oynanır', 'How to Play'); b.onclick = function () { WCTut.open(); };
          box.insertBefore(b, box.lastElementChild);
        }
      } catch (e) { }
      return r;
    };
    settings.wc121 = 1;
  }
  var pendingAsk = false;
  if (typeof newGame === 'function') {
    var _ng = newGame;
    newGame = function (m) {
      var r = _ng.apply(this, arguments);
      if (pendingAsk) {
        pendingAsk = false;
        if (m == 1) { var n = 0, iv = setInterval(function () { n++; try { if (window.v30IntroBusy && v30IntroBusy() && n < 12) return; } catch (e) { } /* V150: küre yaklaşırken (3 sn) soru açılıp küreyi örtmesin */ var md = document.getElementById('mod'); if (!(md && md.style.display === 'flex') || n > 8) { clearInterval(iv); if (!(md && md.style.display === 'flex')) WCTut.askInGame(); } }, 700); }
      }
      return r;
    };
  }
  hookSettings(); window.addEventListener('load', hookSettings);
})();
