/* V205 — KASMA 5. TUR: 3B küre açıkken 2B SVG harita display:none; yine de labels() her çağrıda gizli SVG'de etiket/işaret DOM'unu söküp yeniden kuruyordu
   (savaş açılışında removeChild/createElementNS/GC yükü). 3B açıkken atlanır; 3B kapanınca (v30 hide -> paint -> labels) normal çalışır.
   Geri almak için index.html'den v205.js bağlantısını silin. */
(function () {
  if (typeof labels !== 'function') return;
  var _l = labels;
  labels = function () {
    try { var m = document.getElementById('map'); if (m && m.classList.contains('v30on')) return; } catch (e) { }
    return _l.apply(this, arguments);
  };
})();
