/* V125: (1) Ayarlar'da "Ana Menü" düğmesi  (2) telefon GERİ tuşu:
   açık pencere/panel/menü alt ekranı varsa bir adım geri; oyundaysa "Oyundan çıkılsın mı?" sorusu; ana menüde iki kez geri = uygulamadan çıkış.
   Capacitor'un @capacitor/app eklentisi gerekmez: tarayıcı geçmişine bir nöbetçi kayıt eklenir, Android geri tuşu onu 'popstate' olarak verir. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function $(id) { return document.getElementById(id); }
  function menuOn() { var m = $('wcm'); return !!(m && m.classList.contains('on')); }
  function inGame() { try { return !!(window.G && !G.over && G.ph !== 'over' && !menuOn()); } catch (e) { return false; } }
  function modalOpen() { var m = $('mod'); return !!(m && m.style.display === 'flex'); }

  function askExit() {
    if (!inGame()) return;
    var mp = !!G.mp;
    modal('<span data-wcexit="1"></span><h2>🚪 ' + X('Oyundan çıkmak istiyor musunuz?', 'Do you want to leave the game?') + '</h2>' +
      '<p style="text-align:center;font-size:14px;line-height:1.45">' + (mp ? X('Online maçtan ayrılırsın.', 'You will leave the online match.') : X('İlerlemen kaydedilir; ana menüden devam edebilirsin.', 'Your progress is saved; you can continue from the main menu.')) + '</p>' +
      '<button class="big pri" onclick="WC125.exit()">' + X('Evet, çık (ana menü)', 'Yes, leave (main menu)') + '</button>' +
      '<button class="big" onclick="closeMod()">' + X('Hayır, oyuna dön', 'No, keep playing') + '</button>');
  }
  function exitGame() {
    window.WC161_leaving = true;                                                // V161: bilerek çıkış → oturum geri yükleme bayrağı yazılmaz
    try { localStorage.removeItem('wc_live161'); } catch (e) { }
    try { if (window.G && !G.mp) save(); } catch (e) { }
    try { location.reload(); } catch (e) { }
  }

  // ---- geri tuşu ----
  /* V142: Android WebView/Chromium, KULLANICI ETKİLEŞİMİ olmadan eklenen geçmiş kayıtlarını geri tuşunda atlar ("history manipulation intervention").
     Eski sürüm nöbetçiyi yalnızca 'load' ve 'pointerdown' anında koyuyordu; dokunmada pointerdown etkileşim sayılmaz -> nöbetçi atlanıyor, geri tuşu doğrudan uygulamayı kapatıyordu.
     Artık nöbetçi dokunma BİTİŞİNDE (pointerup/touchend/click) ve tuşta konur; ayrıca @capacitor/app eklentisi varsa 'backButton' olayı da dinlenir. */
  function ensure() { try { if (!(history.state && history.state.wc125)) history.pushState({ wc125: 1 }, ''); } catch (e) { } }
  function findClose() {
    var bs = $('box') ? $('box').querySelectorAll('button') : [], re = /^\s*(✕\s*)?(kapat|close|vazgeç|cancel|geri|back|iptal|hayır|no\b|atla|skip|tamam|ok\b)/i;
    for (var i = 0; i < bs.length; i++) { if (!bs[i].disabled && re.test(bs[i].textContent.replace(/^[^A-Za-zÇĞİÖŞÜçğıöşü✕]+/, ''))) return bs[i]; }
    return null;
  }
  var lastBack = 0, rootAt = 0;
  function appPlugin() { try { return (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App) || null; } catch (e) { return null; } }
  function onBack(fromPlugin) {
    var now = Date.now(); if (now - lastBack < 250) { ensure(); return; } lastBack = now;   // çift tetiklenme koruması
    try {
      if (window.G && window.BSH) { ensure(); return; }                       // savaş ekranı: geri tuşu yok sayılır
      if (modalOpen()) {
        if ($('box') && $('box').querySelector('[data-wcexit]')) { closeMod(); ensure(); return; }
        if ($('box') && $('box').querySelector('.wc141p')) { closeMod(); ensure(); return; }   // V173: duraklatma kartında geri = oyuna dön
        var b = findClose(); if (b) b.click();                                 // kapatılabilir pencere → bir adım geri
        else if (menuOn() || !window.G || G.over) { try { closeMod(); } catch (e) { } }   // V161: menüdeki pencerede kapat düğmesi bulunamazsa yine de bir adım geri (pencereyi kapat)
        ensure(); return;
      }
      if (inGame()) {
        var p = $('panel'); if (p && p.style.display === 'block' && G.sel) { try { deselect(); } catch (e) { G.sel = null; try { render(); } catch (e2) { } } ensure(); return; }   // alt panel → seçimi kaldır
        try { menu(); } catch (e) { askExit(); }                               // V184: oyundayken geri = duraklatma menüsü (eskiden "Oyundan çıkmak istiyor musun?"); menü açılamazsa eski soru
        ensure(); return;
      }
      var back = document.querySelector('#wcm [data-a="back"]');               // ana menü alt ekranı → bir adım geri
      if (back && menuOn()) { back.click(); ensure(); return; }
      var ap = appPlugin();                                                    // ana menü kökü: iki kez geri = çıkış
      if (ap && ap.exitApp) {
        if (now - rootAt < 2200) { ap.exitApp(); return; }
        rootAt = now; toast(X('Çıkmak için tekrar geri tuşuna bas', 'Press back again to exit')); ensure(); return;
      }
      toast(X('Çıkmak için tekrar geri tuşuna bas', 'Press back again to exit'));   // eklenti yok: nöbetçi yeniden konmaz, ikinci geri uygulamayı kapatır
    } catch (e) { ensure(); }
  }
  window.addEventListener('popstate', function () { onBack(false); });
  /* V161: @capacitor/app artık package.json'da. Eklenti, sayfa betiklerinden SONRA hazır olabildiği için dinleyici ilk 6 sn içinde yeniden denenir (bir kez kurulur).
     Dinleyici kuruluyken Android geri tuşu uygulamayı kendiliğinden kapatmaz/arka plana atmaz; her basış onBack()'e gelir. */
  var _apBound = false;
  function bindApp() {
    if (_apBound) return true;
    try { var ap = appPlugin(); if (ap && ap.addListener) { ap.addListener('backButton', function () { onBack(true); }); _apBound = true; return true; } } catch (e) { }
    return false;
  }
  if (!bindApp()) { var _bn = 0, _bi = setInterval(function () { if (bindApp() || ++_bn > 24) clearInterval(_bi); }, 250); }
  document.addEventListener('backbutton', function (e) { try { e.preventDefault(); } catch (x) { } onBack(true); }, false);   // Cordova tarzı
  window.addEventListener('load', ensure);
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, ensure, true); });   // gerçek kullanıcı etkileşimi = nöbetçi atlanmaz
  window.WC125_back = function () { onBack(true); };

  // ---- Ayarlar'a "Ana Menü" düğmesi (yalnızca oyun içinde) ----
  function hookSettings() {
    if (typeof settings !== 'function' || settings.wc125) return;
    var _s = settings;
    settings = function () {
      var r = _s.apply(this, arguments);
      try {
        var box = $('box');
        if (inGame() && box && !box.querySelector('.wchomeb')) {
          var b = document.createElement('button'); b.className = 'big wchomeb'; b.textContent = '🏠 ' + X('Ana Menü', 'Main Menu');
          b.onclick = function () { askExit(); };
          box.insertBefore(b, box.lastElementChild);
        }
      } catch (e) { }
      return r;
    };
    settings.wc125 = 1;
  }
  hookSettings(); window.addEventListener('load', hookSettings);
  window.WC125 = { exit: exitGame, askExit: askExit };
})();
