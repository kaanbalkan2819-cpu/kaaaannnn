/* V46 — İsyancı devletlerin üzerinde haritada saban (🌾 çiftçi isyanı) simgesi. 2B haritada mkg katmanına çizilir (labels() her çağrıda katmanı yeniden kurar). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function plow(g, u) {
    var s = document.createElementNS(NS, 'g'); s.setAttribute('class', 'rebplow'); s.setAttribute('transform', 'scale(' + (u / 10) + ')');
    s.innerHTML = '<circle r="10" fill="#3b2610" stroke="#efc16b" stroke-width="1.2"/>' +
      '<g fill="none" stroke="#f3e2b3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M-6.5,2.5L5,-3"/><path d="M5,-3L7.2,-7"/><path d="M-1.5,-0.6L-1.5,4.6"/></g>' +
      '<path d="M-7.6,2.2L-2.6,2.2L-5.4,6.6Z" fill="#efc16b" stroke="#6b4a14" stroke-width=".6"/>' +
      '<path d="M5.6,-8.2L8.6,-6.4" stroke="#f3e2b3" stroke-width="1.4" stroke-linecap="round"/>';
    g.appendChild(s);
  }
  function draw() {
    if (typeof mkg === 'undefined' || !mkg || !G || !G.rebel23 || typeof CAM === 'undefined') return;
    var k = CAM.k, node = mkg.node(), done = {};
    Object.keys(G.rebel23).forEach(function (e) {
      if (!G.rebel23[e] || e === G.pl || done[e]) return;
      var id = G.owner[e] === e ? e : null; if (!id) return;   // yalnızca hâlâ kendi başına duran isyancı devlet
      var r = M[id]; if (!r || !r.px || isNaN(r.px[0])) return; done[e] = 1;
      var m = Math.min(r.bw || 0, r.bh || 0) * k, u = Math.max(8, Math.min(14, m * .45)) / k;
      var g = document.createElementNS(NS, 'g'); g.setAttribute('transform', 'translate(' + r.px[0] + ',' + (r.px[1]) + ')'); g.style.pointerEvents = 'none';
      plow(g, u); node.appendChild(g);
    });
  }
  var _l = labels;
  labels = function () { var x = _l.apply(this, arguments); try { draw(); } catch (e) { } return x; };
})();
