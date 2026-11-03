/* V162 — SAVAŞ PANELİ TEKNİK PÜRÜZLERİ (TEST EDİLMEDİ; yalnızca node --check)
   1) closeBattle çift çağrı koruması: panel zaten kapalıysa (BSH=false) çağrı yok sayılır. Zincirdeki sarmalayıcılar (V20.after, afterWar, otomatik kayıt, flushMsg...)
      iki kez çalışıp YZ sırasını/kaydı/mesajları çiftleyebiliyordu.
   2) showBattle senkron hata kurtarma: panel kurulurken hata olursa BSH=true takılı kalıp oyun donuyordu; artık hata yutulur, savaş kapatılır ve oyun devam eder.
   3) Ana menüye (G yok) dönüşte savaş paneli artifakt temizliği: BSH/BT/OV/FLASH sıfırlanır, #bs gizlenir. (BSH takılı kalırsa küre 1,2 sn'de bir çiziliyor ve eylemler engelleniyordu.)
   GERİ ALMAK İÇİN: index.html'den v162.js bağlantısını silin. */
(function () {
  'use strict';
  function $b() { return document.getElementById('bs'); }
  function resetPanel() {
    try { BSH = false; BT = null; OV = {}; FLASH = null; } catch (e) { }
    try { var b = $b(); if (b) { b.style.display = 'none'; b.onclick = null; b.className = ''; } } catch (e) { }
  }
  try {
    if (typeof closeBattle === 'function' && !closeBattle.v162) {
      var _cb = closeBattle;
      closeBattle = function () { if (typeof BSH !== 'undefined' && !BSH) return; return _cb.apply(this, arguments); };
      closeBattle.v162 = 1;
    }
  } catch (e) { console.error(e); }
  try {
    if (typeof showBattle === 'function' && !showBattle.v162) {
      var _sb = showBattle;
      showBattle = function () {
        try { return _sb.apply(this, arguments); }
        catch (e) {
          try { console.error('V162 showBattle', e); } catch (x) { }
          try { BSH = true; closeBattle(); } catch (x) { resetPanel(); }
        }
      };
      showBattle.v162 = 1;
    }
  } catch (e) { console.error(e); }
  try {
    if (typeof menu === 'function' && !menu.v162) {
      var _m = menu;
      menu = function () { try { if (!G) resetPanel(); } catch (e) { resetPanel(); } return _m.apply(this, arguments); };
      menu.v162 = 1;
    }
  } catch (e) { console.error(e); }
})();
