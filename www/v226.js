/* V226 — derecelide tur geçme kuralları, menü anlık görüntüsü, mühür düğmesi hızlandırma.
   Geri almak için index.html'den v226.js ve v226.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function rank() { try { return !!(window.G && G.mp && G.mp.rank && !G.over); } catch (e) { return false; } }
  function side() { try { return WCOnline._state().side; } catch (e) { return null; } }
  var mine = 0, peer = 0, WIN = 20000;
  function fire() {
    mine = peer = 0;
    try { if (window.V20 && V20.skip && G && G.ph === 'v5ai') { V20.skip(true); if (window.v60Active && window.v60Skip) v60Skip(); } } catch (e) { }
  }
  window.WC226 = {
    botActing: function () { try { return rank() && G.mp.bot && G.ph === 'v5ai' && window.__ai226 === G.mp.guest; } catch (e) { return false; } },
    /* derecelide YZ evresinde dokunarak geçme yok (rakip kartı, zar penceresi, savaş animasyonu) */
    noTap: function () { try { return rank() && (G.ph === 'v5ai' || G.ph === 'v5wait'); } catch (e) { return false; } },
    /* hide: YZ rakip oynuyor, geçilemez · both: dünya YZ turu, iki taraf da basınca geçilir · normal: derecelide değil */
    mode: function () { if (!rank()) return 'normal'; try { if (G.mp.bot && (G.mp.act === 'guest' && window.__ai226 === G.mp.guest)) return 'hide'; } catch (e) { } return 'both'; },
    spectating: function () { try { return rank() && !G.mp.bot && G.mp.act !== side() && G.ph === 'v5wait' && !!document.getElementById('ai20'); } catch (e) { return false; } },
    press: function () {
      var now = Date.now(); mine = now;
      if (G.mp.bot) { try { toast(X('Rakip de geçiyor…', 'Rival is skipping too…')); } catch (e) { } setTimeout(fire, 500 + Math.random() * 1100); return; }
      try { WCOnline.sendChat({ t: 'skip226' }); } catch (e) { }
      if (now - peer < WIN) fire(); else try { toast(X('Rakibin de geçmesi bekleniyor', 'Waiting for your rival to skip')); } catch (e) { }
    },
    peerSkip: function () { var now = Date.now(); peer = now; if (now - mine < WIN) fire(); else try { toast(X('Rakip turu geçmek istiyor', 'Your rival wants to skip')); } catch (e) { } }
  };
  /* ---- menü anlık görüntüsü: bir sonraki açılışta gerçek menü betikler yüklenmeden görünür (index.html) ---- */
  var snapT = 0;
  function snapshot() {
    try {
      var w = document.getElementById('wcm'); if (!w || !document.body.classList.contains('wcm-on') || w.querySelector('.launch') || w.querySelector('[data-a="back"]')) return;
      var c = w.cloneNode(true); c.classList.add('on', 'inst226');
      Array.prototype.forEach.call(c.querySelectorAll('canvas'), function (n) { n.remove(); });
      Array.prototype.forEach.call(c.querySelectorAll('button'), function (n) { n.setAttribute('tabindex', '-1'); });
      var h = c.outerHTML; if (h.length < 60000) localStorage.setItem('wc_menu226', h);
    } catch (e) { }
  }
  setInterval(function () { try { if (document.body.classList.contains('wcm-on') && !snapT) snapT = setTimeout(function () { snapT = 0; snapshot(); }, 1500); } catch (e) { } }, 4000);
  setTimeout(function () { try { snapshot(); } catch (e) { } }, 2500);
})();
/* V226: menü küresinin dokusu: Figma ile üretilen altın varak kara + koyu okyanus, oyunun gerçek sınırlarıyla önceden pişirildi (assets/menu/globe226.webp) */
(function () {
  try {
    var im = new Image(); im.onload = function () { try { var c = document.createElement('canvas'); c.width = 2048; c.height = 1024; var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 2048, 1024); window.__tex226 = x.getImageData(0, 0, 2048, 1024).data; } catch (e) { window.__tex226f = 1; } };
    im.onerror = function () { window.__tex226f = 1; }; im.decoding = 'async'; im.src = 'assets/menu/globe230.webp';
  } catch (e) { window.__tex226f = 1; }
})();
