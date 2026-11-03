/* V158 — ana menüdeki küre amblemine (.crest) dokununca küre hafifçe döner (bir turun ~%30'u = 108°, yumuşak yavaşlayarak).
   Menü her kurulduğunda amblem yeniden oluştuğu için dinleyici document üzerinde (olay delegasyonu). Geri almak için index.html'den v158.js bağlantısını silin. */
(function () {
  'use strict';
  var ang = 0, st = document.createElement('style');
  st.textContent = '#wcm .crest{cursor:pointer;pointer-events:auto!important;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}';
  (document.head || document.documentElement).appendChild(st);
  document.addEventListener('click', function (e) {
    try {
      var t = e.target && e.target.closest ? e.target.closest('#wcm .crest') : null; if (!t) return;
      ang += 108;
      t.style.transition = 'transform .75s cubic-bezier(.2,.8,.2,1)';
      t.style.transform = 'rotate(' + ang + 'deg)';
    } catch (x) { }
  }, true);
  /* menü yeniden kurulunca amblem son açıda başlasın (ani sıçrama olmasın) */
  new MutationObserver(function () {
    try { var c = document.querySelector('#wcm .crest'); if (c && ang && !c.style.transform) c.style.transform = 'rotate(' + ang + 'deg)'; } catch (x) { }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
