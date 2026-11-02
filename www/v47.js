/* V47 — yatay ekran: kilit + "telefonu çevirin" kalkanı; ittifaklı renklerin yenilenmesi */
(function () {
  // ittifak değişince 2B haritayı yeniden boya (renk imzası değişirse)
  var last = '';
  setInterval(function () { if (document.hidden) return; try { var s = WCD.sig(); if (s !== last) { last = s; if (typeof paint === 'function') paint(); } } catch (e) { } }, 1500);
})();
