/* V122 — Telefon GERİ tuşu.
   • Menülerde: bir önceki adıma döner (Geri/Vazgeç/Kapat düğmesini kendisi bulup basar; alt adım yoksa pencereyi kapatır).
   • Maçta: "Maçtan çıkmak istiyor musunuz?" sorar. Evet → ilerleme kaydedilir (tek kişilik) ve ana menüye dönülür.
   • Ana menüde: 2 sn içinde iki kez geri = uygulamadan çık.
   Yöntem: @capacitor/app varsa onun backButton olayı; yoksa history (popstate) tuzağı + document 'backbutton'. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function $i(id) { return document.getElementById(id); }
  function vis(e) { return !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length)); }
  function idle() { try { return !G || G.over || G.ph === 'over'; } catch (e) { return true; } }
  function modalOpen() { var m = $i('mod'); return !!(m && m.style.display === 'flex'); }
  function menuRoot() { var r = $i('wcm'); return (r && r.classList.contains('on')) ? r : null; }

  /* ---------- onay penceresi ---------- */
  var css = document.createElement('style');
  css.textContent = '#wc121q{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);padding:20px}' +
    '#wc121q .q{max-width:330px;width:100%;background:linear-gradient(#2a1f0e,#171007);border:2px solid #b8923a;border-radius:14px;padding:20px 18px;text-align:center;color:#f3e6c4;box-shadow:0 10px 40px #000}' +
    '#wc121q h3{margin:0 0 8px;font-size:19px;color:#f2c14e}#wc121q p{margin:0 0 16px;font-size:14px;opacity:.85;line-height:1.4}' +
    '#wc121q button{display:block;width:100%;margin:8px 0 0;padding:13px;font-size:16px;border-radius:10px;border:1px solid #6b5420;background:#2b2112;color:#f3e6c4}' +
    '#wc121q button.y{background:linear-gradient(#e8c15a,#b8862a);color:#2a1a04;font-weight:700;border-color:#f2d98a}';
  document.head.appendChild(css);

  function qOpen() { return !!$i('wc121q'); }
  function qClose() { var q = $i('wc121q'); if (q) q.remove(); }
  function ask() {
    if (qOpen()) return;
    var mp = false, ranked = false;
    try { mp = !!(G && G.mp); ranked = !!(mp && window.WCOnline && WCOnline._state && WCOnline._state().ranked); } catch (e) { }
    var sub = ranked ? X('Rank maçını bırakırsan yenilgi sayılır.', 'Leaving a ranked match counts as a loss.')
      : mp ? X('Online maçtan çıkarsan oyun sona erer.', 'Leaving an online match ends the game.')
      : X('İlerlemen kaydedilir, "Devam" ile kaldığın yerden sürdürebilirsin.', 'Your progress is saved; use "Continue" to resume.');
    var q = document.createElement('div'); q.id = 'wc121q';
    q.innerHTML = '<div class="q"><h3>' + X('Maçtan çıkmak istiyor musunuz?', 'Leave the match?') + '</h3><p>' + sub + '</p>' +
      '<button class="y" id="wc121y">' + X('Evet, çık', 'Yes, leave') + '</button><button id="wc121n">' + X('Hayır, devam et', 'No, keep playing') + '</button></div>';
    document.body.appendChild(q);
    $i('wc121n').onclick = qClose;
    $i('wc121y').onclick = function () { qClose(); leave(true); };
  }

  function leave(sv) {
    try { if (sv && G && !G.mp && !G.over && typeof save === 'function') save(); } catch (e) { }
    try { if (G && G.mp && window.WCOnline && WCOnline.cancel) WCOnline.cancel(); } catch (e) { }
    try { closeMod(); } catch (e) { }
    try { var bs = $i('bs'); if (bs) { bs.style.display = 'none'; bs.onclick = null; } BSH = false; BT = null; OV = {}; } catch (e) { }
    ['onbar', 'wcr-t', 'wcr-dc', 'fact23', 'wdbub'].forEach(function (id) { var e = $i(id); if (e) e.style.display = 'none'; });
    try { G = null; } catch (e) { }
    try { menu(); } catch (e) { }
  }

  /* ---------- menülerde "bir önceki adım" düğmesini bul ---------- */
  function findBack(box, allowMenuBtn) {
    var bs = [].slice.call(box.querySelectorAll('button,[data-a]')).filter(function (b) { return vis(b) && !b.disabled; });
    function tx(b) { return (b.textContent || '').replace(/[←‹×✕✖✓]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
    function raw(b) { return (b.textContent || '').trim(); }
    var i, b, t;
    for (i = 0; i < bs.length; i++) { b = bs[i]; t = tx(b); if (raw(b).charAt(0) === '←' || /^(geri|back)$/.test(t) || b.getAttribute('data-a') === 'back') return b; }
    for (i = 0; i < bs.length; i++) { b = bs[i]; t = tx(b); if (/^(vazgeç|vazgec|cancel|iptal|hayır|hayir|no)$/.test(t)) return b; }
    for (i = 0; i < bs.length; i++) { b = bs[i]; t = tx(b); if (/^(kapat|close)$/.test(t) || /closeMod|closeSet/.test(b.getAttribute('onclick') || '')) return b; }
    if (allowMenuBtn) for (i = 0; i < bs.length; i++) { t = tx(bs[i]); if (/ana men|main menu/.test(t)) return bs[i]; }
    return null;
  }

  /* ---------- geri tuşunun ana mantığı. true = uygulama içinde işlendi, 'exit' = en üst düzey ---------- */
  function step() {
    if (qOpen()) { qClose(); return true; }
    var box = $i('box'), inGame = false;
    try { inGame = !!(G && !idle()); } catch (e) { }

    if (inGame) {
      if (G.ph === 'pick' || G.ph === 'v7pick') { if (G.sel) { try { deselect(); } catch (e) { } return true; } leave(false); return true; }
      if (typeof BSH !== 'undefined' && BSH) { ask(); return true; }
      if (modalOpen() && box) {
        if (box.querySelector('.wb-pause')) { closeMod(); return true; }          // duraklatma menüsü → oyuna dön
        var b = findBack(box, false);
        if (b) { b.click(); return true; }                                          // ayarlar → Geri, diplomasi → Kapat vb.
        ask(); return true;                                                         // zorunlu pencere (zar, geliştirme…): maçtan çıkma sorusu
      }
      if (G.sel) { try { deselect(); } catch (e) { } return true; }                 // seçili ülke paneli → kapat
      ask(); return true;
    }

    if (modalOpen() && box) {
      var bb = findBack(box, true);
      if (bb) { bb.click(); return true; }
      if (box.querySelector('.wcr-spin')) return true;                              // bağlanıyor/doğrulanıyor: boşa tıklama
      if (menuRoot()) { closeMod(); return true; }                                  // 3B ana menünün üstündeki pencere
      return 'exit';                                                                // eski modal ana menü
    }
    var r = menuRoot();
    if (r) { var back = r.querySelector('.menu [data-a="back"]'); if (back && vis(back)) { back.click(); return true; } }
    return 'exit';
  }

  /* ---------- tetikleyiciler ---------- */
  var APP = null, armed = false, armT = 0, last = 0;
  try { APP = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App; if (APP && !APP.addListener) APP = null; } catch (e) { APP = null; }
  function push() { try { history.pushState({ wc: 1 }, ''); } catch (e) { } }
  function disarm() { armed = false; clearTimeout(armT); }

  function onBack() {   // true: sentinel'i geri koy
    var r = step();
    if (r !== 'exit') { disarm(); return true; }
    if (armed) { disarm(); try { if (APP && APP.exitApp) APP.exitApp(); else if (navigator.app && navigator.app.exitApp) navigator.app.exitApp(); } catch (e) { } return true; }
    armed = true;
    try { toast(X('Çıkmak için tekrar geri tuşuna bas', 'Press back again to exit')); } catch (e) { }
    armT = setTimeout(function () { var was = armed; disarm(); if (was && !APP) push(); }, 2200);
    return !!APP || false;   // history modunda 2. basış yerel olarak çıkabilsin diye sentinel geri konmaz
  }
  function once() { var n = Date.now(); if (n - last < 300) return false; last = n; return true; }

  if (APP) {
    APP.addListener('backButton', function () { if (once()) onBack(); });
  } else {
    try { history.replaceState({ wc: 0 }, ''); } catch (e) { }
    push();
    window.addEventListener('popstate', function () { var keep = once() ? onBack() : true; if (keep) push(); });
    document.addEventListener('touchstart', function () { if (armed) { disarm(); push(); } }, true);
    document.addEventListener('backbutton', function (e) { e.preventDefault && e.preventDefault(); if (once()) onBack(); }, false);
  }
  window.WCBack = { step: step, ask: ask, leave: leave };
})();

/* V122 — Seçili bölge artık bizim değilse (rakip aldı vb.) panelden "Politikalar" düğmesi kalkar. */
(function () {
  'use strict';
  function fix() {
    try {
      var el = document.getElementById('panel'); if (!el) return;
      var b = el.querySelector('.polbtn'); if (!b) return;
      if (!(G && G.sel && G.owner && G.owner[G.sel] === G.pl)) b.remove();
    } catch (e) { }
  }
  try {
    var _r = render;
    render = function () { var x = _r.apply(this, arguments); fix(); return x; };
  } catch (e) { }
  setInterval(fix, 700);   // render çağrılmadan sahiplik değişirse (ör. online senkron) yine temizle
})();
