/* V19: (1) Oyuncu ülkesi için çakışmayan, yüksek kontrastlı harita rengi (G.plCol; kayıtla saklanır)
        (2) Fetih sonrası ülke adı: birleşen toprağın içinde, kara üzerinde, en geniş uygun noktaya taşınır.
   - Renk: oyuncunun anahtarı (G.pl) için col() geçersiz kılınır; tüm topraklar (fethedilenler dahil) sahibin rengiyle boyandığından hepsi yeni rengi alır.
     Dolgu, ince kontur (--sk), sınır katmanı, küçük ülke noktaları, HUD çipi ve ülke adı hep col()/r._c üzerinden gelir.
   - Doğrulama yalnızca oyuncunun toprak listesi değişince (fetih/kayıp) ve fetih KESİNLEŞTİKTEN sonra (G.pend yok/done) yapılır.
   - Etiket konumu yalnızca sahiplik/harita ölçeği değişince, yalnızca değişen sahipler için yeniden hesaplanır; zoom/kamera hareketinde yeniden hesap YOK
     (etiketler dönüştürülen katmanda, taban koordinatlarda durur). */
(function () {
  'use strict';
  function on() { return !!G && G.v5 === 1 && !!G.pl && !!M[G.pl]; }
  function frozen() { return !!(G && G.pend && !G.pend.done); }

  // ================= RENK =================
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
    var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
  }
  function hex(c) { return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  function parse(s) {
    var m;
    if ((m = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i.exec(s))) return hsl2rgb(+m[1], +m[2], +m[3]);
    if ((m = /^#([0-9a-f]{6})$/i.exec(s))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    return [128, 128, 128];
  }
  function toLab(c) {
    function lin(v) { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }
    var r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
    var x = (r * .4124 + g * .3576 + b * .1805) / .95047, y = (r * .2126 + g * .7152 + b * .0722), z = (r * .0193 + g * .1192 + b * .9505) / 1.08883;
    function f(t) { return t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  function dE(a, b) { var d0 = a[0] - b[0], d1 = a[1] - b[1], d2 = a[2] - b[2]; return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2); }

  var _col = col;
  col = function (e) {
    if (typeof e == 'string' && G && G.v5 === 1 && G.pl === e && G.plCol) return G.plCol;
    if (typeof e == 'string' && DC[e] && G && G.v5 === 1) return DC[e];
    return _col(e);
  };
  function cc(o) { return (DC[o] && o !== G.pl) ? DC[o] : _col(o); }

  // ---- Komşu ülkeler aynı tonda olmasın: sahip grafiği (fetih sonrası birleşmiş ülkeler) üzerinde yeniden renklendirme ----
  var PAL = [[38, 34, 52], [14, 34, 46], [345, 26, 52], [290, 16, 50], [215, 24, 50], [178, 28, 40], [128, 20, 42], [68, 26, 42], [30, 40, 44], [260, 18, 52]];
  var PALL = PAL.map(function (p) { return toLab(hsl2rgb(p[0], p[1], p[2])); });
  var DC = {}, DSIG = '';
  function dcol(e, i) { var p = PAL[i], l = p[2] + (H(e) - .5) * 5; return 'hsl(' + p[0] + ',' + p[1] + '%,' + l.toFixed(1) + '%)'; }
  function rebuildDC() {
    var adj = {}, ids = [], seen = {};
    R.forEach(function (r) {
      var o = G.owner[r.id]; if (typeof o != 'string' || o === G.pl) return;
      if (!seen[o]) { seen[o] = 1; ids.push(o); adj[o] = {}; }
      r.nb.forEach(function (n) { var o2 = G.owner[n]; if (typeof o2 == 'string' && o2 !== o && o2 !== G.pl) { adj[o][o2] = 1; } });
    });
    ids.sort(function (a, b) { return Object.keys(adj[b]).length - Object.keys(adj[a]).length; });
    var asg = {}, out = {};
    ids.forEach(function (o) {
      var nbL = []; Object.keys(adj[o]).forEach(function (n) { if (asg[n] != null) nbL.push(PALL[asg[n]]); });
      var pref = (NC[o] || 0) % PAL.length, order = [pref], i;
      for (i = 0; i < PAL.length; i++) if (i !== pref) order.push(i);
      var best = pref, bs = -1;
      for (i = 0; i < order.length; i++) {
        var d = nbL.length ? minD(PALL[order[i]], nbL) : 99;
        if (d >= 16) { best = order[i]; bs = 99; break; }
        if (d > bs) { bs = d; best = order[i]; }
      }
      asg[o] = best; out[o] = dcol(o, best);
    });
    DC = out;
  }
  var CANDS = null;
  function cands() {
    if (CANDS) return CANDS; CANDS = [];
    var sl = [[72, 58], [78, 62], [66, 56], [70, 52]];   // yumuşak, göz yormayan tonlar (cırtlak değil)
    for (var h = 0; h < 360; h += 6) sl.forEach(function (q) { var c = hsl2rgb(h, q[0], q[1]); CANDS.push({ hex: hex(c), lab: toLab(c) }); });
    return CANDS;
  }
  // Diğer tüm ülkelerin (+ ikinci oyuncu rengi + okyanus) renkleri ve oyuncunun mevcut komşu sahipleri
  function others() {
    var all = [], nb = [], seen = {}, i;
    R.forEach(function (r) { if (r.id === G.pl) return; all.push(toLab(parse(cc(r.id)))); });
    try { PC.forEach(function (c) { all.push(toLab(parse(c))); }); } catch (e) { }
    ['#0b1d33', '#0b2335', '#10306b'].forEach(function (c) { all.push(toLab(parse(c))); });
    R.forEach(function (r) {
      if (G.owner[r.id] !== G.pl) return;
      r.nb.forEach(function (n) { var o = G.owner[n]; if (o !== G.pl && o !== undefined && !seen[o] && M[o]) { seen[o] = 1; nb.push(toLab(parse(cc(o)))); } });
    });
    return { all: all, nb: nb };
  }
  function minD(l, arr) { var m = 1e9; for (var i = 0; i < arr.length; i++) { var d = dE(l, arr[i]); if (d < m) m = d; } return m; }
  function pick(o) {
    if (G && G.v5 === 1) return '#a01220';   // V24: oyuncu rengi sabit koyu kırmızı; diğer ülke renk kuralları aynen sürer
    var best = null, bs = -1;
    cands().forEach(function (c) {
      var a = minD(c.lab, o.all), n = o.nb.length ? minD(c.lab, o.nb) : 1e9, s = Math.min(a, n * .75);
      if (c.hex === G.plCol) s += 3;                       // eşitlikte mevcut rengi koru
      if (s > bs) { bs = s; best = c; }
    });
    return best.hex;
  }
  var OSIG = null;
  function ownSig() { var a = []; R.forEach(function (r) { a.push(G.owner[r.id]); }); return a.join(','); }
  // Fetih kesinleşmeden (seçim bekliyorsa) çalışmaz; ilk atama hariç. Yalnızca sahiplik değişince hesaplanır.
  function ensureColor() {
    if (!on() || BSH) return false;
    if (G.v5 === 1) { G.plCol = '#a01220'; G.plColV = 2; return false; }   // V48: oyuncu hep koyu kırmızı
    var first = !G.plCol;
    if (!first && frozen()) return false;
    var sg = G.pl + '|' + ownSig();
    if (!first && sg === OSIG && G.plColV === 2) return false;
    OSIG = sg;
    rebuildDC();
    var o = others(), cur = G.plCol ? toLab(parse(G.plCol)) : null, changed = false;
    if (G.plColV !== 2 || !cur || minD(cur, o.all) < 18 || (o.nb.length && minD(cur, o.nb) < 22)) { G.plCol = pick(o); G.plColV = 2; changed = true; }
    return changed;
  }
  var _rd = render;
  render = function () {
    var ch = false;
    try { ch = ensureColor(); } catch (e) { }
    var r = _rd.apply(this, arguments);
    if (ch) { try { save(); } catch (e) { } }
    return r;
  };

  // ================= ETİKET KONUMU =================
  var PK = '', GC = {}, LC = null, LK = '';
  function pkey() { return W + '|' + H_ + '|' + S; }
  function proj2(p) {
    var pk = pkey(); if (p._k2 === pk) return p._r2;
    p._k2 = pk; p._r2 = null;
    try {
      var bad = false;
      p._r2 = p.g.coordinates.map(function (ring) {
        var x0 = 1e9, x1 = -1e9, q = ring.map(function (c) { var z = proj(c); if (z[0] < x0) x0 = z[0]; if (z[0] > x1) x1 = z[0]; return z; });
        if (x1 - x0 > Math.PI * S) bad = true; return q;
      });
      if (bad) p._r2 = null;
    } catch (e) { p._r2 = null; }
    return p._r2;
  }
  function pip(x, y, ring) {
    var c = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function inMem(x, y, mem) {
    for (var m = 0; m < mem.length; m++) {
      var ps = mem[m].parts || [];
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i], pr = proj2(p); if (!pr) continue;
        if (p.b && (x < p.b[0][0] || x > p.b[1][0] || y < p.b[0][1] || y > p.b[1][1])) continue;
        if (!pip(x, y, pr[0])) continue;
        var hole = false; for (var h = 1; h < pr.length; h++) if (pip(x, y, pr[h])) { hole = true; break; }
        if (!hole) return true;
      }
    }
    return false;
  }
  var DIRS = [[1, 0], [.7071, .7071], [0, 1], [-.7071, .7071], [-1, 0], [-.7071, -.7071], [0, -1], [.7071, -.7071]];
  var RAD = [.02, .04, .07, .11, .16, .22];
  function clearance(x, y, mem, u) {
    var best = 0;
    for (var i = 0; i < RAD.length; i++) {
      var rr = RAD[i] * u;
      for (var d = 0; d < 8; d++) if (!inMem(x + DIRS[d][0] * rr, y + DIRS[d][1] * rr, mem)) return best;
      best = rr;
    }
    return best;
  }
  // Birleşik kara bileşeni için: ağırlıklı merkeze yakın VE sınırlardan en uzak (içeride, denizde/başka ülkede olmayan) nokta
  function anchor2(mem) {
    if (mem.length === 1) { var r0 = mem[0]; return { x: r0.px[0], y: r0.px[1], w: r0.bw }; }
    var sx = 0, sy = 0, sw = 0, bb = null, big = mem[0];
    mem.forEach(function (r) {
      if (!r.px || isNaN(r.px[0])) return; var w = r.ar || 1; sx += r.px[0] * w; sy += r.px[1] * w; sw += w;
      if (r.bb) bb = bb ? [Math.min(bb[0], r.bb[0]), Math.min(bb[1], r.bb[1]), Math.max(bb[2], r.bb[2]), Math.max(bb[3], r.bb[3])] : r.bb.slice();
      if ((r.ar || 0) > (big.ar || 0)) big = r;
    });
    var cx = sw ? sx / sw : big.px[0], cy = sw ? sy / sw : big.px[1], wd = bb ? bb[2] - bb[0] : big.bw;
    if (!bb) return { x: big.px[0], y: big.px[1], w: wd };
    var u = Math.max(1, Math.min(bb[2] - bb[0], bb[3] - bb[1])), N = 18, bx = null, bs = -1e18, i, j;
    function tryPt(x, y) {
      if (!inMem(x, y, mem)) return;
      var s = clearance(x, y, mem, u) - .5 * Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (s > bs) { bs = s; bx = [x, y]; }
    }
    tryPt(cx, cy);
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) tryPt(bb[0] + (i + .5) / N * (bb[2] - bb[0]), bb[1] + (j + .5) / N * (bb[3] - bb[1]));
    if (!bx) {                                                         // son çare: ülke içindeki en yakın üye merkezi
      var bd = 1e18, bm = big;
      mem.forEach(function (r) { if (!r.px || isNaN(r.px[0]) || !inMem(r.px[0], r.px[1], [r])) return; var d = (r.px[0] - cx) * (r.px[0] - cx) + (r.px[1] - cy) * (r.px[1] - cy); if (d < bd) { bd = d; bm = r; } });
      bx = [bm.px[0], bm.px[1]];
    }
    return { x: bx[0], y: bx[1], w: wd };
  }
  function nameOf(key, mem) {
    if (typeof key === 'string' && M[key]) return M[key].name;
    var big = mem[0]; mem.forEach(function (r) { if ((r.ar || 0) > (big.ar || 0)) big = r; }); return big.name;
  }
  function okey(id) { return (G && G.owner && typeof ownerOf === 'function') ? ownerOf(id) : id; }
  function sigOf() { var a = []; for (var i = 0; i < R.length; i++) a.push(okey(R[i].id)); return a.join(','); }
  function labelData2(sig) {
    var pk = pkey(); if (pk !== PK) { PK = pk; GC = {}; }
    var groups = {}, out = [];
    R.forEach(function (r) { var k = okey(r.id); (groups[k] = groups[k] || { key: k, m: [] }).m.push(r); });
    Object.keys(groups).forEach(function (gk) {
      var g0 = groups[gk], msig = g0.m.map(function (r) { return r.id; }).join(',');
      var hit = GC[gk];
      if (!hit || hit.sig !== msig) {                                  // yalnızca üyeliği değişen sahipler yeniden hesaplanır
        var set = {}, seen = {}, best = null, ba = -1;
        g0.m.forEach(function (r) { set[r.id] = 1; });
        g0.m.forEach(function (r) {
          if (seen[r.id]) return; var comp = [], st = [r], ar = 0; seen[r.id] = 1;
          while (st.length) { var c = st.pop(); comp.push(c); ar += c.ar || 0; c.nb.forEach(function (n) { if (set[n] && !seen[n]) { seen[n] = 1; st.push(M[n]); } }); }
          if (ar > ba) { ba = ar; best = comp; }
        });
        var a = best ? anchor2(best) : null;
        hit = GC[gk] = { sig: msig, d: a && !isNaN(a.x) && !isNaN(a.y) ? { x: a.x, y: a.y, w: a.w, name: nameOf(g0.key, g0.m) } : null };
      }
      if (hit.d) out.push(hit.d);
    });
    return out;
  }

  labels = function () {
    if (!lab || !R || !R.length) return;
    var k = CAM.k, gm = G, fz = frozen(), sig = sigOf();
    var key = Math.round(Math.log(k) * 8) + '|' + W + '|' + H_ + '|' + sig + '|' + (typeof L !== 'undefined' ? L : '') + '|' + (fz ? 'F' : '');
    if (key !== LK) {
      LK = key;
      // fetih kesinleşmeden (seçim bekliyor) önceki etiket verisi korunur; kesinleşince yukarıdaki anahtar değişir ve yeniden kurulur
      if (!(fz && LC)) LC = labelData2(sig);
      lab.selectAll('text').remove();
      var sh = LC.filter(function (d) { return d.w * k > 26 && d.w * k > d.name.length * 5.2; });
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
  // Harita ölçeği değişince (setup) etiket anahtarı W|H içerdiği için kendiliğinden yenilenir.
  window.V19 = { inMem: inMem, clearance: clearance, anchor: anchor2, pick: pick, ensureColor: ensureColor };
})();
