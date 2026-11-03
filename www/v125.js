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
    modal('<span data-wcexit="1"></span><h2>🚪 ' + X('Oyundan çıkılsın mı?', 'Leave the game?') + '</h2>' +
      '<p style="text-align:center;font-size:14px;line-height:1.45">' + (mp ? X('Online maçtan ayrılırsın.', 'You will leave the online match.') : X('İlerlemen kaydedilir; ana menüden devam edebilirsin.', 'Your progress is saved; you can continue from the main menu.')) + '</p>' +
      '<button class="big pri" onclick="WC125.exit()">' + X('Evet, ana menüye dön', 'Yes, go to main menu') + '</button>' +
      '<button class="big" onclick="closeMod()">' + X('Hayır, oyuna dön', 'No, keep playing') + '</button>');
  }
  function exitGame() {
    try { if (window.G && !G.mp) save(); } catch (e) { }
    try { location.reload(); } catch (e) { }
  }

  // ---- geri tuşu ----
  function ensure() { try { if (!(history.state && history.state.wc125)) history.pushState({ wc125: 1 }, ''); } catch (e) { } }
  function findClose() {
    var bs = $('box') ? $('box').querySelectorAll('button') : [], re = /^\s*(✕\s*)?(kapat|close|vazgeç|cancel|geri|back|iptal|hayır|no\b|atla|skip|tamam|ok\b)/i;
    for (var i = 0; i < bs.length; i++) { if (!bs[i].disabled && re.test(bs[i].textContent.replace(/^[^A-Za-zÇĞİÖŞÜçğıöşü✕]+/, ''))) return bs[i]; }
    return null;
  }
  function onBack() {
    try {
      if (window.G && window.BSH) { ensure(); return; }                       // savaş ekranı: geri tuşu yok sayılır
      if (modalOpen()) {
        if ($('box') && $('box').querySelector('[data-wcexit]')) { closeMod(); ensure(); return; }
        var b = findClose(); if (b) b.click();                                 // kapatılabilir pencere → bir adım geri
        ensure(); return;
      }
      if (inGame()) {
        var p = $('panel'); if (p && p.style.display === 'block' && G.sel) { deselect(); ensure(); return; }   // alt panel → seçimi kaldır
        askExit(); ensure(); return;
      }
      var back = document.querySelector('#wcm [data-a="back"]');               // ana menü alt ekranı → geri
      if (back && menuOn()) { back.click(); ensure(); return; }
      toast(X('Çıkmak için tekrar geri tuşuna bas', 'Press back again to exit'));   // ana menü: nöbetçi yeniden konmaz, ikinci geri uygulamayı kapatır
    } catch (e) { ensure(); }
  }
  window.addEventListener('popstate', onBack);
  window.addEventListener('load', ensure);
  document.addEventListener('pointerdown', ensure, true);

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
