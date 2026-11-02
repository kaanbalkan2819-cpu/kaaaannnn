/* V31: (1) yenilgide kazanana en yakın toprak, (2) fethedilen ülke ana parçayla birleşik görünüm (2B),
   (3) ikon paketi (5 değer, politikalar, elçi) */
(function () {
  'use strict';
  /* ---- 1) Yenilen taraf, KAZANANIN topraklarına en yakın kendi toprağını verir ---- */
  if (window.R5 && R5.pickLoss) {
    var _prev = R5.pickLoss;
    R5.pickLoss = function (loser, tg, owner, nb, dist) {
      var base = _prev.apply(this, arguments);   // önceki zincir (yan etkiler: politika çözümü vb.) korunur
      try {
        var win = owner[tg], own = [], wl = [], k;
        for (k in owner) { if (owner[k] === loser) own.push(k); else if (owner[k] === win) wl.push(k); }
        if (!own.length || !wl.length) return base;
        var best = null, bs = 1e9;
        own.forEach(function (a) {
          var land = (nb[a] || []).some(function (n) { return owner[n] === win; }) ? 0 : 1, m = 1e9;
          wl.forEach(function (w) { var d = dist(a, w); if (d < m) m = d; });
          var sc = land * 100 + m;
          if (sc < bs || (sc === bs && a < best)) { bs = sc; best = a; }
        });
        return best || base;
      } catch (e) { return base; }
    };
  }
  /* ---- 2) 2B haritada fethedilen ülke, sahibinin ana parçasıyla birleşik görünür ---- */
  function merge() {
    try {
      if (typeof pel === 'undefined' || !pel || typeof ownerOf !== 'function' || !G) return;
      pel.each(function (r) {
        var o = ownerOf(r.id);
        if (o !== r.id && o !== undefined && !this.classList.contains('hl')) { var c = this.style.fill; this.style.stroke = c; this.style.strokeWidth = '0.6px'; }
        else { this.style.stroke = ''; this.style.strokeWidth = ''; }
      });
    } catch (e) { }
  }
  if (typeof paint === 'function') { var _paint = paint; paint = function () { var r = _paint.apply(this, arguments); merge(); return r; }; }
  /* ---- 3) İkon paketi ---- */
  var EM = window.WC_EMOJI || {}, IC = window.WC_ICONS || {}, re = new RegExp('(' + Object.keys(EM).join('|') + ')\uFE0F?', 'g');
  function img(k) { return '<img class="wci" alt="" draggable="false" src="' + IC[k] + '">'; }
  function walk(root) {
    if (!root || !root.nodeType) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) { var p = n.parentNode; if (p && !/^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/.test(p.nodeName) && re.test(n.nodeValue)) list.push(n); re.lastIndex = 0; }
    list.forEach(function (t) {
      var span = document.createElement('span'); span.className = 'wcw';
      span.innerHTML = t.nodeValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(re, function (m, e) { return img(EM[e]); });
      t.parentNode.replaceChild(span, t);
    });
    var q = root.querySelectorAll ? root.querySelectorAll('.ecard') : [];
    Array.prototype.forEach.call(q, function (b) {
      var ic = b.querySelector('.eic'); if (!ic || ic.querySelector('.wci')) return; var oc = b.getAttribute('onclick') || '';
      var k = /Pact/.test(oc) ? 'pact' : /Guard/.test(oc) ? 'guard' : /Incite/.test(oc) ? 'incite' : null; if (k) ic.innerHTML = img(k);
    });
    var dv = root.querySelectorAll ? root.querySelectorAll('.envdv') : [];
    Array.prototype.forEach.call(dv, function (d) { if (!d.querySelector('.wci')) d.innerHTML = img('env'); });
  }
  var busy = false;
  function run() { if (busy) return; busy = true; try { walk(document.getElementById('app')); walk(document.getElementById('mod')); } catch (e) { } busy = false; }
  var pend = 0;
  new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; run(); }, 200); }).observe(document.body, { childList: true, subtree: true });
  run();
})();
