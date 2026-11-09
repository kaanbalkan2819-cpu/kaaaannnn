/* V35 — Sinematik ana menü (Three.js). Oyun boştayken (aktif oyun yok) menu() bu ekranı açar; oyun içinde eski modal menü korunur.
   3B üretici kancası: window.WC_MENU = { bg:'assets/menu/bg.webp', emblem:'assets/menu/emblem.png', globeTex:'assets/menu/earth.webp' } */
(function () {
  'use strict';
  var CFG = window.WC_MENU = Object.assign({ bg: 'assets/menu/bg.webp', emblem: 'assets/menu/emblem.webp', globeTex: null, flat: true }, window.WC_MENU || {});   /* V129: flat:true = 3B küresiz, görselli ana menü; eski 3B menü için WC_MENU={flat:false,bg:null,emblem:null} */
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'tr') ? tr : en; }
  function idle() { try { return !G || G.over || G.ph === 'over'; } catch (e) { return true; } }
  var root, cv, T3, renderer, scene, camera, globe, spin, rings, arcs = [], embers, stars, raf = 0, clock0 = 0, running = false, ready = false, loading = false, glFail = false;
  var drag = { on: false, x: 0, y: 0, vx: 0, vy: 0 }, par = { x: 0, y: 0, tx: 0, ty: 0 }, rotY = 0, rotX = 0.28, qi = 0, qTimer = 0, W = 1, H = 1;

  var QUOTES = [
    ['Sevilmekten çok korkulmak güvenlidir; ikisini birden olamıyorsan korkuyu seç.', 'To be loved and feared at once is hard; if you must choose, choose fear.'],
    ['Tilki gibi sinsi, aslan gibi güçlü ol. Biri tuzakları görür, öteki kurtları ürkütür.', 'Be a fox to see the snares and a lion to scare the wolves.'],
    ['Zafer sonrası acıma, bir sonraki isyanın tohumudur. Ya tam ez, ya hiç dokunma.', 'Pity after victory seeds the next revolt. Crush fully, or do not touch.'],
    ['Pakt, güçlü olan zayıf kalana kadar geçerli bir sözdür.', 'A pact is only a word that holds while the strong remain weak.'],
    ['Bir hükümdarın en büyük silahı ordusu değil, düşmanlarının neye inandığıdır.', 'A ruler’s greatest weapon is not his army but what his enemies believe.'],
    ['Elçi gönder, ama hançeri unutma. Diplomasi, savaşın daha ucuz halidir.', 'Send the envoy, but never forget the dagger. Diplomacy is war made cheaper.'],
    ['Kader yarısını elinde tutar; kalan yarısı cesaretini bekler.', 'Fortune holds half of all deeds; the other half waits for boldness.']
  ];
  /* V122: alıntılar yalnızca Il Principe'den değil; 3. eleman kaynak numarasıdır (yoksa 0). Kaynak yazısı SRC'den gelir. */
  var SRC = [
    ['Il Principe’den esinle', 'Inspired by Il Principe'],
    ['Discorsi’den esinle', 'Inspired by the Discourses on Livy'],
    ['Savaş Sanatı’ndan esinle', 'Inspired by The Art of War'],
    ['Floransa Tarihi’nden esinle', 'Inspired by Florentine Histories'],
    ['Mektuplar’dan esinle', 'Inspired by his Letters']
  ];
  QUOTES.push(
    ['İnsanlar zorunluluk sıkıştırmadıkça iyilik yapmaz; kanunlar bu yüzden vardır.', 'Men do good only when necessity compels them; that is why laws exist.', 1],
    ['Savaş istediğin zaman başlar, ama istediğin zaman bitmez.', 'War begins when you choose, but it ends only when it chooses.', 1],
    ['Savaşın kasları para değil, iyi askerdir; iyi asker parayı da bulur.', 'The sinews of war are not gold but good soldiers; good soldiers find the gold.', 1],
    ['Soylularla halkın çekişmesi Roma’yı yıkmadı; onu özgür ve güçlü kıldı.', 'The strife between nobles and people did not ruin Rome; it made her free and strong.', 1],
    ['Düzeni değiştirirken eski biçimlerin gölgesini koru; halk değişimi geç fark etsin.', 'When you reshape an order, keep the shadow of the old forms; let the people notice late.', 1],
    ['Barışta savaşı düşünmeyen komutan, savaşta barışı hayal eder.', 'The commander who ignores war in peacetime will dream of peace in war.', 2],
    ['Paralı askere güvenen devlet, sonunu kiralamış olur.', 'A state that trusts hired swords has rented out its own ending.', 2],
    ['İyi plan, düşmanı savaş başlamadan seçeneksiz bırakandır.', 'The best plan leaves the enemy without choices before the battle begins.', 2],
    ['Erdem huzur doğurur, huzur tembellik, tembellik karışıklık, karışıklık yeniden erdemi.', 'Virtue brings quiet, quiet brings idleness, idleness brings disorder, and disorder brings virtue again.', 3],
    ['Güç boşluğu asla boş kalmaz; onu ya sen doldurursun ya komşun.', 'A power vacuum never stays empty; you fill it, or your neighbour does.', 3],
    ['Vatanımı ruhumdan çok seviyorum.', 'I love my homeland more than my own soul.', 4],
    ['Haberi erken alan, kararı erken verir; kararı erken veren, savaşı seçer.', 'Who learns early decides early; who decides early chooses the war.', 4]
  );
  function who(q) { var s = SRC[q[2] || 0] || SRC[0]; return s[X(0, 1)]; }

  function lonlat(lon, lat, r) {
    var phi = (lon + 180) * Math.PI / 180, la = lat * Math.PI / 180, c = Math.cos(la);
    return new T3.Vector3(-r * Math.cos(phi) * c, r * Math.sin(la), r * Math.sin(phi) * c);
  }
  function saveInfo() {
    try {
      var raw = localStorage.getItem('wc_save_v1'); if (!raw) return null;
      var s = JSON.parse(raw); if (!s || !s.owner) return null;
      var tot = 0, mine = 0, k, who = s.pl;
      for (k in s.owner) { tot++; if (who != null && s.owner[k] === who) mine++; }
      return { turn: s.turn || 0, mine: mine, tot: tot, pl: who, owner: s.owner };
    } catch (e) { return null; }
  }

  // ---------- DOM ----------
  var CREST = '<svg class="crest" viewBox="0 0 140 140"><defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#e3b94f"/><stop offset="1" stop-color="#9a6b12"/></linearGradient><mask id="wm"><rect width="140" height="140" fill="#fff"/><circle cx="76" cy="70" r="37" fill="#000"/></mask></defs><circle cx="70" cy="70" r="64" fill="none" stroke="url(#wg)" stroke-width="1.6" stroke-dasharray="2 5"/><circle cx="70" cy="70" r="58" fill="none" stroke="url(#wg)"/><circle cx="62" cy="70" r="42" fill="url(#wg)" mask="url(#wm)"/><g transform="translate(94 70)"><rect x="-11" y="-11" width="22" height="22" fill="url(#wg)"/><rect x="-11" y="-11" width="22" height="22" fill="url(#wg)" transform="rotate(45)"/><circle r="4" fill="#5e0b17"/></g></svg>';
  function letters(s, d0) { var o = ''; for (var i = 0; i < s.length; i++) o += '<i style="animation-delay:' + (d0 + i * 0.07).toFixed(2) + 's">' + s[i] + '</i>'; return o; }
  function btn(cls, n, label, sub, act, dis, i) {
    return '<button class="mb ' + cls + '" style="animation-delay:' + (CFG.flat ? (0.1 + i * 0.08) : (1.1 + i * 0.1)).toFixed(2) + 's"' + (dis ? ' disabled' : '') + ' data-a="' + act + '"><em>' + n + '</em>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
  }
  /* V140: "CONQUEST" yazısı cihaz yazı tipine göre genişliyordu (T harfi taşıp kesiliyor, menü yana kayıyordu). Gerçek genişlik ölçülür, sığana kadar küçülür. */
  function fitTitle() {
    try {
      var s = root && root.querySelector('h1 span'); if (!s) return;
      s.style.removeProperty('font-size');
      /* V213: blok ogede yazi sigsa da scrollWidth == clientWidth olur; eski "scrollWidth > clientWidth - 2" kosulu hep dogruydu ve CONQUEST hep en kucuk boyuta (16 px) iniyordu. Artik yalnizca gercekten tasinca kucultulur. */ var lim = s.clientWidth + 1, fs = parseFloat(getComputedStyle(s).fontSize) || 40, g = 0;
      while (lim > 20 && s.scrollWidth > lim && fs > 16 && g++ < 40) { fs -= 1; s.style.setProperty('font-size', fs + 'px', 'important'); }
    } catch (e) { }
  }
  /* V152: alıntı kutusunun yüksekliği SABİT (CSS); metin uzunsa yazı küçülür. Böylece alıntı değişince amblem/başlık/düğmeler hiçbir koşulda kaymaz. */
  function fitQuote() {
    try {
      var el = document.getElementById('wcq'); if (!el || !el.offsetParent) return;
      el.style.removeProperty('font-size'); var fs = parseFloat(getComputedStyle(el).fontSize) || 11, g = 0;
      while (el.scrollHeight > el.clientHeight + 1 && fs > 7.5 && g++ < 24) { fs -= 0.5; el.style.setProperty('font-size', fs + 'px', 'important'); }
    } catch (e) { }
  }
  /* V152: ana düğme bloğunun yüksekliği kilitlenir; alt menüler (Yeni Fetih seçenekleri, onay) farklı sayıda düğmeyle açılınca üstteki amblem kaymaz. */
  function lockMenu() {
    try { var m = root && root.querySelector('.menu'); if (!m || mainHTML) return; m.style.minHeight = ''; m.style.minHeight = m.offsetHeight + 'px'; } catch (e) { }
  }
  function build() {
    if (!root) {
      root = document.createElement('div'); root.id = 'wcm'; if (CFG.flat) root.className = 'flat'; document.body.appendChild(root);
      root.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-a]'); if (!b || b.disabled) return;
        act(b.getAttribute('data-a'));
      });
      root.addEventListener('pointerdown', function (e) { if (e.target.closest('.col')) return; drag.on = true; drag.x = e.clientX; drag.y = e.clientY; });
      window.addEventListener('pointermove', function (e) {
        if (!running) return;
        par.tx = (e.clientX / window.innerWidth - .5); par.ty = (e.clientY / window.innerHeight - .5);
        if (drag.on) { drag.vx = (e.clientX - drag.x) * .006; drag.vy = (e.clientY - drag.y) * .004; rotY += drag.vx; rotX = Math.max(-.7, Math.min(.9, rotX + drag.vy)); drag.x = e.clientX; drag.y = e.clientY; }
      });
      window.addEventListener('pointerup', function () { drag.on = false; });
      window.addEventListener('resize', fit);
      window.addEventListener('resize', fitTitle); window.addEventListener('orientationchange', function () { setTimeout(fitTitle, 250); });
      document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (root.classList.contains('on')) start(); });
    }
    var sv = saveInfo(), emb = CFG.emblem ? '<img class="crest" src="' + CFG.emblem + '" alt="" style="animation:none">' : CREST;
    var q = QUOTES[qi % QUOTES.length];
    mainHTML = ''; root.innerHTML =
      (CFG.bg ? '<div class="bgimg" style="background-image:url(' + CFG.bg + ')"></div>' : '') + (CFG.flat ? '<div class="floor"></div>' : '') +
      '<canvas></canvas><div class="vig"></div><div class="grain"></div><div class="frame"></div>' +
      '<div class="tick">' + X('Divan toplantıda', 'The council convenes') + '<br><b>●</b> ' + X('Cihan masası açık', 'World table open') + '</div>' +
      '<div class="col"><div class="seal">' + emb + '<span>' + X('Cihan Hâkimiyeti Yolunda', 'The Road to World Dominion') + '</span></div>' +
      '<h1>' + letters('WORLD', 0.4) + '<span>' + letters('CONQUEST', 0.9) + '</span></h1>' +
      (CFG.flat ? '<div class="rule"><i></i><b></b><i></i></div>' : '') + '<div class="quote" id="wcq">' + X(q[0], q[1]) + '<b>' + who(q) + '</b></div>' +
      (sv ? '<div class="stats"><div><small>' + X('Tur', 'Turn') + '</small><b>' + sv.turn + '</b></div><div><small>' + X('Fethedilen', 'Conquered') + '</small><b>' + sv.mine + '</b></div><div><small>' + X('Dünya', 'World') + '</small><b>' + Math.round(sv.mine / Math.max(1, sv.tot) * 100) + '%</b></div></div>' : '<div class="stats" style="visibility:hidden" aria-hidden="true"><div><small>-</small><b>0</b></div><div><small>-</small><b>0</b></div><div><small>-</small><b>0</b></div></div>') +   /* V152: kayıt yokken de aynı yükseklik ayrılır; amblem/başlık kayıtlı-kayıtsız yer değiştirmez */
      '<div class="menu">' +
      btn('pri', 'I', X('Yeni Fetih', 'New Conquest'), '', 'new', false, 0) +
      btn('', 'II', X('Seferi Sürdür', 'Resume Campaign'), sv && !CFG.flat ? X('Tur ', 'Turn ') + sv.turn : '', 'cont', !sv, 1) +
      (window.WCRank ? (CFG.flat ? btn('', '★', X('Dereceli Mücadele', 'Ranked Struggle'), '', 'rank', false, 2) : btn('rk', '★', X('Rank Maçı', 'Ranked Match'), X('Sıralamalı', 'Ladder'), 'rank', false, 2.5)) : '') +
      (window.WCTut ? btn('', '?', X('Nasıl Oynanır', 'How to Play'), CFG.flat ? '' : X('Öğretici', 'Tutorial'), 'tut', false, CFG.flat ? 3 : 2.8) : '') +
      (CFG.flat ? btn('', '⚙', X('Ayarlar', 'Settings'), '', 'set', false, 4)
        : '<div class="row">' + btn('', '⚙', X('Ayarlar', 'Settings'), '', 'set', false, 3) + btn('', '☉', X('Dil', 'Lang'), L === 'tr' ? 'TR' : 'EN', 'lang', false, 4) + '</div>') +
      '</div></div>' +
      (CFG.flat ? '<button class="lang" data-a="lang" aria-label="Language"><span>' + (L === 'tr' ? 'TR' : 'EN') + '</span></button>' : '') +
      '';   /* V141: alttaki "Makyavelist Sürüm" yazısı kaldırıldı */
    cv = root.querySelector('canvas');
    fitTitle(); try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitTitle(); fitQuote(); lockMenu(); }); } catch (e) { } setTimeout(fitTitle, 120); fitQuote(); lockMenu(); setTimeout(function () { fitQuote(); lockMenu(); }, 300);   /* V152 */
    clearInterval(qTimer);
    qTimer = setInterval(function () {
      var el = document.getElementById('wcq'); if (!el || (!running && !CFG.flat)) return; qi++; var q2 = QUOTES[qi % QUOTES.length];
      el.classList.remove('sw'); void el.offsetWidth; el.innerHTML = X(q2[0], q2[1]) + '<b>' + who(q2) + '</b>'; el.classList.add('sw'); fitQuote();   /* V152 */
    }, 7500);
  }
  qi = Math.floor(Math.random() * QUOTES.length);

  /* ---- Yeni oyun adımları (onay + mod seçimi) menü içinde çözülür ---- */
  var mainHTML = '';
  function fixDelay(m) { [].forEach.call(m.querySelectorAll('.mb'), function (b) { b.style.animationDelay = '0s'; }); }
  function setMenu(html) { var m = root && root.querySelector('.menu'); if (!m) return false; if (!mainHTML) mainHTML = m.innerHTML; m.innerHTML = html; fixDelay(m); return true; }
  function subModes() {
    if (CFG.flat) return setMenu((window.WCRank ? btn('', '★', X('Dereceli Mücadele', 'Ranked Struggle'), '', 'rank', 0, 0) : '') + btn('', 'I', X('Tek Oyunculu', 'Single Player'), '', 'm1', 0, 0) + (window.WCOnline ? btn('', '⇄', X('Arkadaşınla Maç', 'Match with a Friend'), '', 'onl', 0, 0) : '') + btn('', '←', X('Geri', 'Back'), '', 'back', 0, 0));
    setMenu(btn('pri', 'I', t('m1'), t('m1d'), 'm1', 0, 0) + (window.WCOnline ? btn('', '⇄', X('Online (2 kişi)', 'Online (2 players)'), X('Arkadaşına karşı', 'Versus a friend'), 'onl', 0, 0) : '') + btn('', '←', X('Geri', 'Back'), '', 'back', 0, 0)); }
  function subNew() { if (!hasSave()) return subModes(); setMenu('<div class="subm">' + t('del') + '</div>' + btn('pri', '✓', t('yes'), '', 'yes', 0, 0) + btn('', '←', t('no'), '', 'back', 0, 0)); }
  function subBack() { var m = root && root.querySelector('.menu'); if (m && mainHTML) { m.innerHTML = mainHTML; mainHTML = ''; fixDelay(m); setTimeout(lockMenu, 0); } }
  function live() { return idle() && root && root.classList.contains('on'); }
  var _ask35 = askNew, _modes35 = modes;
  askNew = function () { if (live()) return subNew(); return _ask35.apply(this, arguments); };
  modes = function () { if (live()) return subModes(); return _modes35.apply(this, arguments); };

  /* V221: yükleme simgesi — dönen altın usturlap (dış halka, iç halka, ibre, ortada küçük dünya) */
  var LD221 = '<div class="gl226" aria-hidden="true"><div class="gl226a"><em></em><em></em><em></em><em></em><u></u></div><s></s></div>';   /* V226: yalnızca CSS dönüşü: kurulum sırasında ana iş parçacığı meşgulken de akıcı */
  var launching = false;
  function launch(m) {
    if (launching) return; launching = true;
    var d = document.createElement('div'); d.className = 'launch';
    d.innerHTML = '<div class="lb"><b>' + (m === 1 ? X('Sefer Başlıyor', 'Campaign Begins') : X('İki Hâkan, Tek Taht', 'Two Rulers, One Throne')) + '</b><i></i>' + LD221 + '</div>';
    root.appendChild(d); root.classList.add('go');
    /* V102: perde, hem en az 1,1 sn hem de 3B oyun küresi hazır olana kadar (en çok 9 sn) kalır. Kurulum bu sürede perdenin altında yapılır;
       menü kapanınca "dünya uzaktan yaklaşır" sinematiği boş bekleme olmadan hemen başlar. */
    var minOk = false, gOk = false, fired = false;
    function fin() {
      if (fired || !(minOk && gOk)) return; fired = true;
      launching = false; try { if (d.parentNode) d.parentNode.removeChild(d); root.classList.remove('go'); } catch (e) { } newGame(m);
    }
    setTimeout(function () { minOk = true; fin(); }, 800);   /* V142: 1100 -> 800 */
    setTimeout(function () { gOk = true; fin(); }, 20000);   /* V132: 9 sn'lik erken geçiş kaldırıldı; perde küre + büyük ülke blokları hazır olana kadar kalır (40 sn yalnızca takılma emniyeti) */
    setTimeout(function () { if (window.v30Prep) { try { dispose(); } catch (e) { } /* menü küresinin GPU belleğini oyun küresi kurulmadan ÖNCE boşalt (telefonda iki bağlam birden bellek yetmeyip kurulumu bozuyordu) */ try { v30Prep(function () { gOk = true; fin(); }); } catch (e) { gOk = true; fin(); } } else { gOk = true; fin(); } }, 120);   /* V142: 650 -> 120 ms; düz menüde dispose edilecek GL yok, küre kurulumu hemen başlar */
  }
  window.WCLaunch = function (m) { launch(m); };   // ONLINE: online.js menüyü bu kapıdan kapatıp oyunu başlatır
  function act(a) {
    try {
      if (a === 'yes') { subModes(); return; }
      if (a === 'back') { subBack(); return; }
      if (a === 'm1') { if (window.WCTut && WCTut.later) WCTut.later(); launch(1); return; }   /* V125: öğretici sorusu oyun başladıktan sonra */
      if (a === 'onl') { if (window.WCOnline) WCOnline.open(); return; }
      if (a === 'rank') { if (window.WCRank) WCRank.open(); return; }
      if (a === 'tut') { if (window.WCTut) WCTut.open(); return; }
      if (a === 'cont') { root.classList.add('flash'); cont(); setTimeout(function () { root.classList.remove('flash'); }, 950); }
      else if (a === 'new') { askNew(); }
      else if (a === 'shop') { window.Shop.open(); }
      else if (a === 'set') { settings(); }
      else if (a === 'lang') { setLang(); setTimeout(function () { if (idle()) { show(true); closeMod(); } }, 30); }
    } catch (e) { }
  }

  // ---------- 3B sahne ----------
  function loadThree() {
    return new Promise(function (ok, no) {
      if (window.THREE) return ok();
      var s = document.createElement('script'); s.src = 'globe/three.min.js'; s.onload = ok; s.onerror = function () { no(); }; document.head.appendChild(s);
    });
  }
  function earthCanvases(sv) {
    var big = !(window.matchMedia && matchMedia('(pointer:coarse)').matches), w = 2048, h = w / 2, c = document.createElement('canvas'), g = document.createElement('canvas'); c.width = g.width = w; c.height = g.height = h;
    var x = c.getContext('2d'), y = g.getContext('2d');
    x.fillStyle = '#0a0711'; x.fillRect(0, 0, w, h); y.fillStyle = '#000'; y.fillRect(0, 0, w, h);
    var pr = d3.geo.equirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2]).precision(.3);
    var pc = d3.geo.path().projection(pr).context(x), pg = d3.geo.path().projection(pr).context(y);
    // enlem/boylam ızgarası
    y.strokeStyle = 'rgba(201,162,77,.18)'; y.lineWidth = 1; y.beginPath(); pg(d3.geo.graticule().step([15, 15])()); y.stroke();
    (window.R || []).forEach(function (r, i) {
      var mine = sv && sv.pl != null && sv.owner && sv.owner[r.id] === sv.pl, h1 = (i * 47) % 100;
      x.beginPath(); pc(r.f);
      x.fillStyle = mine ? 'hsl(43,70%,' + (36 + h1 % 10) + '%)' : 'hsl(' + (345 + h1 % 18) + ',' + (30 + h1 % 25) + '%,' + (11 + h1 % 9) + '%)'; x.fill();
      x.lineWidth = 1.2; x.strokeStyle = 'rgba(227,185,79,.55)'; x.stroke();
      y.beginPath(); pg(r.f); y.lineWidth = mine ? 2.2 : 1.1; y.strokeStyle = mine ? 'rgba(255,230,150,1)' : 'rgba(210,150,60,.75)'; y.stroke();
      if (mine) { y.fillStyle = 'rgba(227,185,79,.28)'; y.fill(); }
    });
    return [c, g];
  }
  function sprite(col) {
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(.25, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    var t = new T3.CanvasTexture(c); return t;
  }
  function initGL() {
    try {
      var sv = saveInfo(), coarse = matchMedia('(pointer:coarse)').matches;
      renderer = new T3.WebGLRenderer({ canvas: cv, antialias: !coarse, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.25)); renderer.setClearColor(0x000000, 0);
      scene = new T3.Scene(); camera = new T3.PerspectiveCamera(40, 1, .1, 100); camera.position.set(0, 0, 3.8);
      var sun = new T3.DirectionalLight(0xffd9a0, 2.6); sun.position.set(-3, 1.5, 3); scene.add(sun);
      var rim = new T3.DirectionalLight(0xb3201a, 3.2); rim.position.set(4, 1, -3); if (!coarse) scene.add(rim);   /* V203: kırmızı kenar ışığı telefonda yok */
      scene.add(new T3.AmbientLight(0x4a3040, .9));
      globe = new T3.Group(); scene.add(globe); spin = new T3.Group(); globe.add(spin);
      var cs = earthCanvases(sv), map = new T3.CanvasTexture(cs[0]), glow = new T3.CanvasTexture(cs[1]);
      map.colorSpace = T3.SRGBColorSpace; glow.colorSpace = T3.SRGBColorSpace; map.anisotropy = glow.anisotropy = coarse ? 2 : 4;
      var earth = new T3.Mesh(new T3.SphereGeometry(1, coarse ? 48 : 80, coarse ? 32 : 56), (coarse ? new T3.MeshLambertMaterial({ map: map, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: .9 }) : new T3.MeshStandardMaterial({ map: map, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: .9, roughness: .55, metalness: .45 })));
      spin.add(earth);
      // atmosfer
      var atm = new T3.Mesh(new T3.SphereGeometry(1.2, 64, 40), new T3.ShaderMaterial({
        transparent: true, blending: T3.AdditiveBlending, side: T3.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'varying vec3 n;void main(){float i=pow(max(0.,-n.z),2.4);gl_FragColor=vec4(mix(vec3(.75,.1,.08),vec3(1.,.62,.22),i*1.4),1.)*i*1.5;}'
      }));
      globe.add(atm);
      // astrolab halkaları
      rings = new T3.Group(); globe.add(rings);
      [[1.42, .004, .5, 0], [1.62, .003, -.9, .35], [1.82, .002, 1.2, -.25]].forEach(function (d, i) {
        var m = new T3.Mesh(new T3.TorusGeometry(d[0], d[1], 8, 220), new T3.MeshBasicMaterial({ color: i === 1 ? 0xb3201a : 0xc9a24d, transparent: true, opacity: .75 }));
        m.rotation.x = Math.PI / 2 + d[2] * .35; m.rotation.y = d[3]; m.userData.sp = (i % 2 ? -1 : 1) * (.06 + i * .03); rings.add(m);
        if (i === 0) {
          var p = []; for (var k = 0; k < 144; k++) { var a = k / 144 * Math.PI * 2, l = k % 6 ? 0.025 : 0.06, r0 = d[0] + .02; p.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * (r0 + l), Math.sin(a) * (r0 + l), 0); }
          var tg = new T3.BufferGeometry(); tg.setAttribute('position', new T3.Float32BufferAttribute(p, 3));
          m.add(new T3.LineSegments(tg, new T3.LineBasicMaterial({ color: 0xe3b94f, transparent: true, opacity: .8 })));
        }
        if (i === 2) { for (var s = 0; s < 3; s++) { var sat = new T3.Mesh(new T3.OctahedronGeometry(.035), new T3.MeshBasicMaterial({ color: 0xffd98a })); var a2 = s * 2.094; sat.position.set(Math.cos(a2) * d[0], Math.sin(a2) * d[0], 0); m.add(sat); } }
      });
      // fetih okları
      var pts = (window.R || []).filter(function (r) { return r.c; }), spr = sprite('rgba(255,120,80,1)'), spg = sprite('rgba(255,220,140,1)');
      for (var i = 0; i < (coarse ? 4 : 6); i++) {
        var geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.BufferAttribute(new Float32Array(60 * 3), 3));
        var line = new T3.Line(geo, new T3.LineBasicMaterial({ color: 0xff6a4a, transparent: true, opacity: .9, blending: T3.AdditiveBlending, depthWrite: false }));
        var head = new T3.Sprite(new T3.SpriteMaterial({ map: spg, blending: T3.AdditiveBlending, transparent: true, depthWrite: false })); head.scale.set(.1, .1, 1);
        var dst = new T3.Sprite(new T3.SpriteMaterial({ map: spr, blending: T3.AdditiveBlending, transparent: true, depthWrite: false })); dst.scale.set(.01, .01, 1);
        spin.add(line, head, dst); arcs.push({ line: line, geo: geo, head: head, dst: dst, t: -i * .9, life: 4.6, pts: pts }); newArc(arcs[i]);
      }
      // yıldızlar
      var sp = [], i2; for (i2 = 0; i2 < (coarse ? 300 : 600); i2++) { var u = Math.random() * 6.283, v = Math.acos(2 * Math.random() - 1), rr = 12 + Math.random() * 20; sp.push(rr * Math.sin(v) * Math.cos(u), rr * Math.cos(v), rr * Math.sin(v) * Math.sin(u)); }
      var sg = new T3.BufferGeometry(); sg.setAttribute('position', new T3.Float32BufferAttribute(sp, 3));
      stars = new T3.Points(sg, new T3.PointsMaterial({ size: .06, color: 0xcdb98a, transparent: true, opacity: .7, sizeAttenuation: true, depthWrite: false })); scene.add(stars);
      // kor/kıvılcımlar
      var ep = [], ev = []; for (i2 = 0; i2 < (coarse ? 40 : 80); i2++) { ep.push((Math.random() - .5) * 9, (Math.random() - .5) * 6, (Math.random() - .5) * 4); ev.push(.1 + Math.random() * .25); }
      var eg = new T3.BufferGeometry(); eg.setAttribute('position', new T3.Float32BufferAttribute(ep, 3)); eg.userData.v = ev;
      embers = new T3.Points(eg, new T3.PointsMaterial({ size: .09, map: spr, color: 0xffa060, transparent: true, opacity: .8, blending: T3.AdditiveBlending, depthWrite: false })); scene.add(embers);
      try { renderer.compile(scene, camera); renderer.render(scene, camera); } catch (e2) { }
      ready = true; fit(); setTimeout(fit, 600); setTimeout(fit, 2200);
    } catch (e) { glFail = true; ready = false; root.insertAdjacentHTML('afterbegin', '<div class="noGL">☪</div>'); }
  }
  function newArc(a) {
    var P = a.pts; if (!P.length) { a.t = 1e9; return; }
    var A = P[Math.floor(Math.random() * P.length)], B = P[Math.floor(Math.random() * P.length)], tries = 0;
    while ((B === A || Math.abs(A.c[0] - B.c[0]) + Math.abs(A.c[1] - B.c[1]) < 25) && tries++ < 20) B = P[Math.floor(Math.random() * P.length)];
    var v1 = lonlat(A.c[0], A.c[1], 1.005), v2 = lonlat(B.c[0], B.c[1], 1.005), dist = v1.distanceTo(v2), mid = v1.clone().add(v2).normalize().multiplyScalar(1 + dist * .42);
    var pos = a.geo.attributes.position, curve = new T3.QuadraticBezierCurve3(v1, mid, v2);
    a.curve = curve; a.n = 60; a.pa = curve.getPoints(59);
    for (var i = 0; i < 60; i++) pos.setXYZ(i, a.pa[0].x, a.pa[0].y, a.pa[0].z);
    pos.needsUpdate = true; a.dst.position.copy(v2); a.life = 3.6 + Math.random() * 1.6; a.t = 0;
  }
  function stepArc(a, dt) {
    a.t += dt; if (a.t < 0) { a.line.visible = a.head.visible = a.dst.visible = false; return; }
    a.line.visible = a.head.visible = a.dst.visible = true;
    var p = a.t / a.life; if (p > 1.35) { newArc(a); return; }
    var k = Math.min(1, p / .7), cnt = Math.max(2, Math.floor(k * 59)), pos = a.geo.attributes.position, fade = p > 1 ? Math.max(0, 1 - (p - 1) / .35) : 1;
    for (var i = 0; i < 60; i++) { var s = a.pa[Math.min(i, cnt)]; pos.setXYZ(i, s.x, s.y, s.z); }
    pos.needsUpdate = true; a.line.material.opacity = .9 * fade; a.head.position.copy(a.pa[cnt]); a.head.material.opacity = fade;
    var pulse = p > .7 ? (p - .7) / .65 : 0; a.dst.scale.setScalar(.01 + Math.sin(Math.min(1, pulse) * Math.PI) * .38); a.dst.material.opacity = Math.max(0, 1 - pulse);
  }
  function fit() {
    if (!ready || !root) return; W = root.clientWidth || window.innerWidth; H = root.clientHeight || window.innerHeight;
    var _pr = Math.max(.6, Math.min(COARSE ? 1.25 : 1.5, window.devicePixelRatio || 1, Math.sqrt((COARSE ? 600000 : 1100000) / (W * H))) * qMul);
    if (W !== fW || H !== fH || Math.abs(_pr - fR) > .01) { fW = W; fH = H; fR = _pr; try { renderer.setPixelRatio(_pr); } catch (e) { } renderer.setSize(W, H, false); }   /* V56: gereksiz yeniden boyutlandırma yok (küre yaklaşırken takılma) */
    camera.aspect = W / H; camera.updateProjectionMatrix();
    // Kamera yakınlaşma animasyonunda z değişir; yerleşim her zaman son mesafeye (3.8) göre hesaplanır
    var hh = Math.tan(20 * Math.PI / 180) * 3.8, hw = hh * camera.aspect, wide = W > 720 && W / H > 1.05, ppu = (H / 2) / hh;
    if (wide) {
      var s = Math.max(.35, Math.min(hh * .78, hw * .42) / 1.4);
      globe.scale.setScalar(s * 1.05); globe.position.set(hw * .42, 0, 0);
    } else {
      var col = root.querySelector('.col'), first = col && col.firstElementChild, top = first ? first.getBoundingClientRect().top : H * .45;
      top = Math.max(150, Math.min(top, H * .6));
      var r = Math.max(48, Math.min(W * .3, (top - 36) / 2 - 4)), cy = (top - 8) / 2;
      globe.scale.setScalar(r / ppu); globe.position.set(0, hh * (1 - 2 * cy / H), 0);
    }
  }
  function frame(t) {
    raf = requestAnimationFrame(frame); if (!ready) return;
    /* V118: pencere (Rank, Ayarlar, Hazine...) açıkken veya uygulama arka plandayken küre çizilmez; dokunmatikte ~30 fps */
    var _md = document.getElementById('mod');
    if (document.hidden || (_md && _md.style.display === 'flex')) { clock0 = t; return; }
    if (COARSE && t - lastR < 30) return;
    lastR = t;
    var dt = Math.min(.05, (t - clock0) / 1000 || .016); clock0 = t;
    if (!drag.on) { rotY += dt * .07 + drag.vx * .9; drag.vx *= .94; rotX += (.28 - rotX) * dt * .4; }
    par.x += (par.tx - par.x) * .04; par.y += (par.ty - par.y) * .04;
    spin.rotation.y = rotY; spin.rotation.x = 0; globe.rotation.x = rotX + par.y * .25; globe.rotation.y = par.x * .4; globe.rotation.z = -.2;
    rings.children.forEach(function (m) { m.rotation.z += dt * m.userData.sp; });
    stars.rotation.y += dt * .004; stars.position.x = -par.x * .6; stars.position.y = par.y * .4;
    var ep = embers.geometry.attributes.position, ev = embers.geometry.userData.v;
    for (var i = 0; i < ev.length; i++) { var y = ep.getY(i) + ev[i] * dt; if (y > 3.2) { y = -3.2; ep.setX(i, (Math.random() - .5) * 9); } ep.setY(i, y); ep.setX(i, ep.getX(i) + Math.sin(t / 1400 + i) * dt * .06); }
    ep.needsUpdate = true;
    arcs.forEach(function (a) { stepArc(a, dt); });
    if (fc > 20) { if (dt > (COARSE ? .045 : .026)) { if (++slowN > 20 && qMul > .5) { qMul *= .85; slowN = 0; fit(); } } else if (slowN > 0) slowN--; }   /* uyarlanabilir çözünürlük: yavaş cihazda otomatik düşür */
    fc++; if (fc > 3) introAcc += dt; if (fc === 4) cv.classList.add('rd');
    var intro = Math.min(1, introAcc / 2.4); camera.position.z = 3.8 + (1 - intro * intro * (3 - 2 * intro)) * 1.8;
    renderer.render(scene, camera);
  }
  var qMul = 1, slowN = 0, fW = 0, fH = 0, fR = 0, introT = 0, fc = 0, introAcc = 0, lastR = 0, COARSE = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
  function start() { if (running || !ready) return; running = true; fc = 0; introAcc = 0; try { cv.classList.remove('rd'); } catch (e) { } clock0 = introT = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // ---------- göster / gizle ----------
  function show(force) {
    // Menü zaten açıksa yeniden kurma (v20 bekçisi 600 ms'de bir menu() çağırır; yeniden kurmak animasyonları ve küreyi sıfırlıyordu)
    if (!force && root && root.classList.contains('on') && root.firstChild) return;
    var snap226 = document.querySelector('#boot #wcm'); if (snap226) { snap226.remove(); var bb226 = document.getElementById('boot'); if (bb226) bb226.remove(); }   /* V226: anlık menü görüntüsü gerçek menüyle yer değiştirir */
    build(); root.classList.add('on'); if (snap226) root.classList.add('inst226'); document.body.classList.add('wcm-on'); introT = performance.now();
    if (glFail || CFG.flat) return;   /* V129: flat menüde WebGL hiç kurulmaz (pil/bellek tasarrufu) */
    var go = function () {
      if (!root.classList.contains('on')) return;
      if (ready) { // doku/kayıt değişmiş olabilir: yeniden kur
        dispose(); }
      T3 = window.THREE; initGL(); if (ready) start();
    };
    var goLater = function () { setTimeout(go, 1100); };
    if (window.THREE) goLater(); else if (!loading) { loading = true; loadThree().then(function () { loading = false; goLater(); }).catch(function () { loading = false; glFail = true; }); }
  }
  function dispose() {
    stop(); try { if (renderer) { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } } catch (e) { }
    ready = false; arcs = []; renderer = null;
  }
  function hide() { if (!root || !root.classList.contains('on')) return; root.classList.remove('on'); document.body.classList.remove('wcm-on'); stop(); clearInterval(qTimer); dispose(); root.innerHTML = ''; }

  var _menu35 = menu;
  menu = function () {
    if (idle()) { try { closeMod(); } catch (e) { } show(); return; }
    hide(); _menu35.apply(this, arguments);
  };
  setInterval(function () { if (root && root.classList.contains('on') && !idle()) hide(); }, 1000);
  // oyun başlayınca beyaz parlama geçişi
  var _ng = newGame; newGame = function () { var r = _ng.apply(this, arguments); try { if (!idle()) hide(); } catch (e) { } return r; };
  var _ct = cont; cont = function () { var r = _ct.apply(this, arguments); try { if (!idle()) hide(); } catch (e) { } return r; };
  window.WCMenu = { show: show, hide: hide };
  // ilk açılışta init() zaten menu() çağırmış olabilir (script load'dan önce); yoksa kendimiz aç.
  window.addEventListener('load', function () { setTimeout(function () { if (idle() && !(root && root.classList.contains('on'))) menu(); }, 900); });
})();
