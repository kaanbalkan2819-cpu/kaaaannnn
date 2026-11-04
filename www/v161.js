/* V161 — OYUN ARKA PLANDAYKEN SIFIRLANMASIN (oturumu geri yükleme).
   Sorun: oyuncu oyunu aşağı alıp (ör. WhatsApp'a geçip) hemen dönünce oyun sıfırlanıp ana menüye düşüyordu.
   Telefon bellek yetmeyince oyunun web ekranını arka planda kapatır; geri dönüşte sayfa baştan yüklenir ve ana menü açılır.
   Çözüm: oyun arka plana alınırken "oyun sürüyordu" işareti (zaman damgasıyla) yazılır; sayfa baştan yüklenirse ve işaret
   MAKUL SÜRE (SURE_DK) içindeyse ana menü atlanır, kayıtlı sefer otomatik açılır. Oyun kapatılmadan geri dönülürse işaret silinir.
   Bilerek çıkış (Oyundan çık → Evet / Ana Menü) işareti yazmaz. Online ve Rank oyunları geri yüklenmez (rakiple bağlantı kopar).
   V173: arka plana alınınca ve geri dönünce DURAKLATMA menüsü açılır; son işlem kaydedilir.
   V174: "Oyuna Dön"a basınca menünün geri açılması hatası giderildi; yalnızca 'act' aşamasında kayıt/duraklatma; appStateChange eklendi.
   V174 başsız Chromium'da denendi (arka plan/ön plan, sayfa yeniden yükleme, Oyuna Dön). */
(function () {
  'use strict';
  var KEY = 'wc_live161', SURE_DK = 30;   // oyuncuyu bekleme süresi: dakika
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function menuOn() { var m = document.getElementById('wcm'); return !!(m && m.classList.contains('on')); }
  function liveSolo() {
    try { return !!(window.G && !G.mp && !G.over && G.ph !== 'over' && G.ph !== 'pick' && G.ph !== 'v7pick' && G.ph !== 'v5intro' && !menuOn()); } catch (e) { return false; }
  }
  /* V174: çok ülkeli (v5) oyunda yalnızca oyuncunun serbest hamle ('act') ve zar bekleme ('v5roll') aşamalarında kayıt/duraklatma yapılır.
     Zar atılırken, YZ turunda, bekleyen seçimde kayıt yazılsaydı dönüşte yarım tur bozulurdu; o aşamalarda son kayıt korunur, duraklatma 'act' olunca açılır. */
  function phaseOk() { try { return !(G.v5 === 1 && typeof G.pl === 'string') || G.ph === 'act' || G.ph === 'v5roll'; } catch (e) { return false; } }
  function cardOpen() { try { return !!document.querySelector('#box .wc141p') && modalOpen(); } catch (e) { return false; } }
  function inBattle() { try { return !!(typeof BSH !== 'undefined' && BSH); } catch (e) { return false; } }
  function mark() {
    try {
      if (window.WC161_leaving || !liveSolo()) return;
      if (!inBattle() && phaseOk()) { try { save(); } catch (e) { } }                 // V173: son yapılan işlemin durumu kaydedilir (tur ortası hamleler/zar dahil)
      localStorage.setItem(KEY, String(Date.now()));
    } catch (e) { }
  }
  /* V173: oyun aşağı alınınca / geri gelince DURAKLATMA menüsü açılır; oyuncu "Oyuna Dön" diyene kadar beklenir. */
  function modalOpen() { var m = document.getElementById('mod'); return !!(m && m.style.display === 'flex'); }
  function canPause() {
    try { return !!(liveSolo() && phaseOk() && !inBattle() && !modalOpen() && typeof menu === 'function'); } catch (e) { return false; }
  }
  function pauseNow() { try { if (cardOpen()) return true; if (canPause()) { menu(); return true; } } catch (e) { } return false; }
  var pIv = 0;
  function pauseSoon(maxMs) {   // koşullar uygun olana kadar bekle, en çok maxMs. Kart bir kez açılınca (ya da zaten açıksa) döngü biter: oyuncu "Oyuna Dön" deyince geri AÇILMAZ.
    clearInterval(pIv); var t0 = Date.now();
    if (pauseNow()) return;
    pIv = setInterval(function () {
      try { if (!window.G || G.mp || G.over) { clearInterval(pIv); return; } } catch (e) { clearInterval(pIv); return; }
      if (pauseNow() || Date.now() - t0 > maxMs) clearInterval(pIv);
    }, 500);
  }
  function clr() { try { localStorage.removeItem(KEY); } catch (e) { } }

  /* arka plana alınırken işaretle; aynı sayfada geri dönülürse (sayfa yok olmadıysa) işareti sil */
  function toBg() { mark(); pauseNow(); }
  function toFg() { clr(); pauseSoon(30000); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) toBg(); else toFg(); });
  /* V174: Android'de bazı cihazlarda visibilitychange gelmeyebilir; @capacitor/app varsa appStateChange de dinlenir (ikisi birden gelirse zararsız). */
  var _apB = false;
  function bindAS() {
    if (_apB) return true;
    try {
      var ap = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
      if (ap && ap.addListener) { ap.addListener('appStateChange', function (st) { if (st && st.isActive === false) toBg(); else toFg(); }); _apB = true; return true; }
    } catch (e) { }
    return false;
  }
  if (!bindAS()) { var _an = 0, _ai = setInterval(function () { if (bindAS() || ++_an > 24) clearInterval(_ai); }, 250); }
  window.addEventListener('pagehide', mark);
  window.addEventListener('pageshow', function () { window.WC161_leaving = false; });

  /* açılış: işaret taze ise ana menüyü atla, kayıtlı seferi aç */
  var t = 0;
  try { t = +localStorage.getItem(KEY) || 0; localStorage.removeItem(KEY); } catch (e) { t = 0; }
  if (!t || (Date.now() - t) > SURE_DK * 60000 || (Date.now() - t) < 0) return;

  function bootBye() {   // açılış perdesi ancak ana menü açılınca kalkıyor; menü hiç açılmayacağı için elle kaldır
    try { var b = document.getElementById('boot'); if (b) { b.className = 'out'; setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 500); } } catch (e) { }
  }
  function resume() {
    try {
      if (typeof hasSave === 'function' && !hasSave()) return true;     // kayıt yok: ana menü açılsın
      cont(); bootBye(); setTimeout(function () { pauseSoon(20000); }, 1200);   // V173: kaldığın yerde duraklatma menüsü açık beklesin
      setTimeout(function () { try { if (window.G) toast(X('Oyun duraklatıldı: kaldığın yerden devam edebilirsin', 'Game paused: continue where you left off')); else bootBye(); } catch (e) { } }, 400);
    } catch (e) { try { bootBye(); } catch (x) { } }
    return true;
  }
  var born = Date.now(), n = 0, iv = setInterval(function () {
    n++;
    try {
      if (window.G) { clearInterval(iv); return; }                       // kullanıcı zaten bir şey başlatmış
      var ready = document.readyState === 'complete' && typeof cont === 'function' && window.R && R.length && (Date.now() - born) > 600;
      if (ready) { clearInterval(iv); resume(); }
      else if (n > 60) clearInterval(iv);                               // ~15 sn sonra vazgeç; ana menü normal açılır
    } catch (e) { clearInterval(iv); }
  }, 250);
})();
