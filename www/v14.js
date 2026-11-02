/* V14: (1) seçili ülke belirgin renk (CSS: path.hl.sel)
        (2) fethedilen ülke kazanan ülkeye birleşir: aynı sahibin ülkeleri arasındaki iç sınırlar çizilmez (topojson.mesh, yalnızca çizim katmanı)
        (3) ülke adı: sahip başına TEK etiket, birleşik toprağın yeni merkezinde (ağırlıklı merkez; ülke dışındaysa içeride bir nokta).
   Kaynak geometriler ve oyun durumu (G.owner) DEĞİŞTİRİLMEZ; her şey mevcut sahiplikten türetilir (kayıt/yükleme ile de uyumlu). */
(function () {
  'use strict';
  var bord = null, BS = '', LK = '';

  function ok(r) { return r && r.length; }
  function okey(id) { return (typeof G !== 'undefined' && G && G.owner && typeof ownerOf === 'function') ? ownerOf(id) : id; }
  function sigOf() { var a = []; for (var i = 0; i < R.length; i++) a.push(okey(R[i].id)); return a.join(','); }

  // ---------- birleşik sınırlar: yalnızca sahipleri farklı komşular arasındaki + kıyı sınırları ----------
  function borders() {
    if (!ok(R) || !gc || !ov || !path || !window.topojson || !window.Datamap) return;
    var s = sigOf(); if (s === BS && bord) return; BS = s;
    if (!bord) bord = d3.select(gc.node().parentNode).insert('path', function () { return ov.node(); }).attr('class', 'bord');
    var topo = Datamap.prototype.worldTopo, d = null;
    try {
      d = path(topojson.mesh(topo, topo.objects.world, function (a, b) {
        if (a === b) return !!M[a.id];
        var am = !!M[a.id], bm = !!M[b.id]; if (!am && !bm) return false;
        var x = am ? okey(a.id) : '~' + a.id, y = bm ? okey(b.id) : '~' + b.id; return x !== y;
      }));
      if (d) d = d.replace(/(\d+\.\d\d)\d+/g, '$1');
    } catch (e) { d = null; }
    bord.attr('d', d);
  }

  // ---------- etiket merkezi ----------
  function proj1(p) {
    var pk = W + '|' + H_ + '|' + S; if (p._pk === pk) return p._pr;
    p._pk = pk; p._pr = null; p._bad = false;
    try {
      p._pr = p.g.coordinates.map(function (ring) {
        var x0 = 1e9, x1 = -1e9, q = ring.map(function (c) { var z = proj(c); if (z[0] < x0) x0 = z[0]; if (z[0] > x1) x1 = z[0]; return z; });
        if (x1 - x0 > Math.PI * S) p._bad = true; return q;
      });
    } catch (e) { p._bad = true; }
    return p._pr;
  }
  function pip(x, y, ring) {
    var c = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function inside(x, y, r) {
    for (var i = 0; i < r.parts.length; i++) {
      var p = r.parts[i], pr = proj1(p); if (!pr || p._bad) continue;
      if (p.b && (x < p.b[0][0] || x > p.b[1][0] || y < p.b[0][1] || y > p.b[1][1])) continue;
      if (!pip(x, y, pr[0])) continue;
      var hole = false; for (var h = 1; h < pr.length; h++) if (pip(x, y, pr[h])) { hole = true; break; }
      if (!hole) return true;
    }
    return false;
  }
  function anchor(mem) {
    if (mem.length === 1) { var r = mem[0]; return { x: r.px[0], y: r.px[1], w: r.bw }; }
    var sx = 0, sy = 0, sw = 0, bb = null, big = mem[0];
    mem.forEach(function (r) {
      if (!r.px || isNaN(r.px[0])) return; var w = r.ar || 1; sx += r.px[0] * w; sy += r.px[1] * w; sw += w;
      if (r.bb) bb = bb ? [Math.min(bb[0], r.bb[0]), Math.min(bb[1], r.bb[1]), Math.max(bb[2], r.bb[2]), Math.max(bb[3], r.bb[3])] : r.bb.slice();
      if ((r.ar || 0) > (big.ar || 0)) big = r;
    });
    var x = sw ? sx / sw : big.px[0], y = sw ? sy / sw : big.px[1];
    if (!mem.some(function (r) { return inside(x, y, r); })) {          // merkez ülke dışında: içeride, merkeze en yakın üye merkezi
      var best = null, bd = 1e18;
      mem.forEach(function (r) { if (!r.px || isNaN(r.px[0]) || !inside(r.px[0], r.px[1], r)) return; var d = (r.px[0] - x) * (r.px[0] - x) + (r.px[1] - y) * (r.px[1] - y); if (d < bd) { bd = d; best = r; } });
      if (!best) best = big; x = best.px[0]; y = best.px[1];
    }
    return { x: x, y: y, w: bb ? bb[2] - bb[0] : big.bw };
  }
  function nameOf(key, mem) {
    if (typeof key === 'string' && M[key]) return M[key].name;
    if (typeof key === 'number' && G && G.P && G.P[key]) {
      var s = G.P[key].start; if (s && M[s] && okey(s) === key) return M[s].name;
    }
    var big = mem[0]; mem.forEach(function (r) { if ((r.ar || 0) > (big.ar || 0)) big = r; }); return big.name;
  }
  function labelData() {
    var groups = {}, out = [];
    R.forEach(function (r) { var k = okey(r.id); (groups[k] = groups[k] || { key: k, m: [] }).m.push(r); });
    Object.keys(groups).forEach(function (gk) {
      var g0 = groups[gk], set = {}, seen = {}, best = null, ba = -1;
      g0.m.forEach(function (r) { set[r.id] = 1; });
      g0.m.forEach(function (r) {                                        // kara bağlantılı bileşenler; en büyük bileşen etiket alır
        if (seen[r.id]) return; var comp = [], st = [r], ar = 0; seen[r.id] = 1;
        while (st.length) { var c = st.pop(); comp.push(c); ar += c.ar || 0; c.nb.forEach(function (n) { if (set[n] && !seen[n]) { seen[n] = 1; st.push(M[n]); } }); }
        if (ar > ba) { ba = ar; best = comp; }
      });
      if (!best) return; var a = anchor(best), nm = nameOf(g0.key, g0.m);
      if (a && !isNaN(a.x) && !isNaN(a.y)) out.push({ x: a.x, y: a.y, w: a.w, name: nm });
    });
    return out;
  }

  // ---------- etiketler (tüm modlar için tek sürüm; v13 hedef simgeleri korunur) ----------
  labels = function () {
    if (!lab || !ok(R)) return;
    var k = CAM.k, gm = G, key = Math.round(Math.log(k) * 8) + '|' + W + '|' + H_ + '|' + sigOf() + '|' + (typeof L !== 'undefined' ? L : '');
    if (key !== LK) {
      LK = key; lab.selectAll('text').remove();
      var sh = labelData().filter(function (d) { return d.w * k > 26 && d.w * k > d.name.length * 5.2; });
      lab.selectAll('text').data(sh).enter().append('text').attr('class', 'lb').attr('x', function (d) { return d.x; }).attr('y', function (d) { return d.y; })
        .attr('font-size', 11 / k).style('stroke-width', (3 / k) + 'px').text(function (d) { return d.name; });
    }
    mkg.selectAll('g').remove();
    var tiny = R.filter(function (r) { var m = Math.max(r.bw, r.bh) * k; return m < 8 && r.px && !isNaN(r.px[0]) && (k >= 2.2 || (gm && (r.id == gm.sel || TG[r.id] || typeof ownerOf(r.id) != 'undefined' && r.id != ownerOf(r.id)))); });
    var e = mkg.selectAll('g').data(tiny).enter().append('g').attr('class', function (r) { return 'mk' + (gm && r.id == gm.sel ? ' sel' : '') + (gm && TG[r.id] ? ' atk' : ''); })
      .on('click', function (r) { if (d3.event && d3.event.defaultPrevented) return; pickC(r.id); });
    e.append('circle').attr('class', 'hit').attr('cx', function (r) { return r.px[0]; }).attr('cy', function (r) { return r.px[1]; }).attr('r', 11 / k);
    e.append('circle').attr('class', 'dot').attr('cx', function (r) { return r.px[0]; }).attr('cy', function (r) { return r.px[1]; }).attr('r', 3.6 / k).style('stroke-width', (1.3 / k) + 'px').style('fill', function (r) { return col(gm ? ownerOf(r.id) : r.id); });
    try { if (window.V13) V13.drawIcons(); } catch (x) { }
  };

  // ---------- boyama: dolgu rengiyle aynı ince kontur (dikiş çizgisi olmasın) + birleşik sınır katmanı ----------
  var _paint = paint;
  paint = function () {
    _paint();
    try {
      pel.each(function (r) { var c = r._c; if (c && r._sk !== c) { r._sk = c; this.style.setProperty('--sk', c); } });
      borders();
    } catch (e) { }
  };
  var _setup = setup;
  setup = function () { _setup(); BS = ''; LK = ''; try { borders(); } catch (e) { } };
  window.V14 = { labelData: labelData, borders: borders };
})();
