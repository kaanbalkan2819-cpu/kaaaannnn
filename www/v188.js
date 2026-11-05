/* V188 — (1) YENİLGİDE KİLİTLENME DÜZELTMESİ  (2) yeni yenilgi ekranı için bağlantı (TEST EDİLMEDİ; yalnızca node --check)
   SORUN: Son toprak kaybedilince "Haritaya Dön"e basılınca oyun kilitleniyordu. Kesin neden bulunamadı; en güçlü şüphe: kapanış zincirinin
          (v60 yeniden oynatma, render, kamera) toprağı kalmamış oyuncu için çalışması.
   ÇÖZÜM: Tek oyunculu modda oyuncunun toprağı 0 ise closeBattle zinciri ÇALIŞTIRILMAZ; savaş paneli doğrudan kapatılır, oyun "over" durumuna alınır
          ve yenilgi ekranı (v139 showFinal) açılır. Online (G.mp) oyuna dokunmaz.
   GERİ ALMAK İÇİN: index.html'den v188.js ve v188.css bağlantılarını silin. */
(function () {
  'use strict';
  function ownedN(e) { var n = 0; try { for (var k in G.owner) if (G.owner[k] === e) n++; } catch (x) { } return n; }
  function lostAll() {
    try { return !!G && !G.mp && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner && ownedN(G.pl) === 0 && G.ph !== 'pick' && G.ph !== 'v5intro' && G.ph !== 'wheel'; } catch (e) { return false; }
  }
  function endNow() {
    try { var b = document.getElementById('bs'); b.style.display = 'none'; b.style.visibility = ''; b.style.pointerEvents = ''; b.onclick = null; } catch (e) { }
    try { BSH = false; document.body.classList.remove('bsh'); BT = null; OV = {}; FLASH = null; } catch (e) { }
    try { ['panel', 'hint'].forEach(function (i) { var x = document.getElementById(i); if (x) x.style.display = ''; }); } catch (e) { }
    try { var eb = document.getElementById('v7end'); if (eb) eb.style.display = 'none'; } catch (e) { }
    try { if (!G.over) G.over = { w: -1 }; G.ph = 'over'; G.busy = 0; G.act = null; G.cur = null; } catch (e) { }
    try { localStorage.removeItem(SV); } catch (e) { }
    try { var m = document.getElementById('mod'); if (m) m.style.display = 'none'; } catch (e) { }
    var tries = 0;
    (function show() {
      try { if (window.v139Show) window.v139Show(true); } catch (e) { console.error(e); }
      if (++tries < 4 && !document.getElementById('v139over') && G) setTimeout(show, 400);
    })();
  }
  if (typeof closeBattle === 'function') {
    var _cb = closeBattle;
    closeBattle = function () {
      if (!lostAll()) return _cb.apply(this, arguments);
      try {   // sürüyorsa 3B savaş animasyonunu "dokunarak geç" ile bitir
        ['pointerdown', 'pointerup'].forEach(function (t) { try { document.body.dispatchEvent(new Event(t, { bubbles: true })); } catch (e) { } });
      } catch (e) { }
      endNow();
    };
  }
})();
