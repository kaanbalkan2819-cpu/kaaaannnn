/* V217 — (1) Rakip saldırı kartındaki ⚔ simgesi yerine savaş panelindeki çapraz kılıçlar (WCSwordClash'in son "X" duruşu, bir kez çizilip resim olarak kullanılır)
           (2) Her fetihten sonra savaş sonucu ekranında "FETHEDİLEN ÜLKE n/173" sayacı; en güçlü 60 ülke fethedilince o ülkenin sembol hayvanı
               kırmızı mürekkep damgası olarak ekrana basılır (assets/stamps, Figma ile üretildi).
   Geri almak için index.html'den v217.js ve v217.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }

  /* ---------- (1) çapraz kılıç görseli ---------- */
  var swordURL = null;
  function swords() {
    if (swordURL !== null) return swordURL;
    swordURL = '';
    try {
      if (!window.WCSwordClash) return '';
      var host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-500px;top:0;width:10px;height:10px;opacity:0;pointer-events:none';
      document.body.appendChild(host);
      var sc = WCSwordClash.mount(host, { width: 130, height: 130, scale: .66, originY: .40, holdFinal: true, sound: false });
      sc.active = true; sc.mode = 'once'; sc.animT = 1e6; sc._now = 0; sc._render();
      swordURL = sc.canvas.toDataURL('image/png');
      sc.destroy(); host.remove();
    } catch (e) { swordURL = ''; }
    return swordURL;
  }
  function fixCard(d) {
    try {
      if (!d || !d.classList || !d.classList.contains('atk')) return;
      var ic = d.querySelector('.ai20-ic'); if (!ic || ic.querySelector('.x217')) return;
      var u = swords(); if (!u) return;
      ic.innerHTML = '<i class="x217" style="background-image:url(' + u + ')"></i>';
    } catch (e) { }
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.id === 'ai20') fixCard(n); }); });
  }).observe(document.body, { childList: true });
  setTimeout(swords, 2500);   /* önceden hazırla (ilk kartta gecikme olmasın) */

  /* ---------- (2) fetih sayacı + hayvan damgası ---------- */
  var A = {
    eagle: ['Kartal', 'Eagle', 'USA DEU IDN MEX POL AUT EGY ROU UKR PHL NGA KAZ'],
    falcon: ['Şahin', 'Falcon', 'SAU ARE QAT HUN ISL KWT'],
    lion: ['Aslan', 'Lion', 'GBR NLD NOR BEL CZE LUX IRN'],
    tiger: ['Kaplan', 'Tiger', 'IND KOR MYS BGD'],
    wolf: ['Bozkurt', 'Wolf', 'ITA TUR EST SVK'],
    bear: ['Ayı', 'Bear', 'RUS TWN FIN'],
    dragon: ['Ejderha', 'Dragon', 'CHN'],
    rooster: ['Horoz', 'Rooster', 'FRA PRT'],
    bull: ['Boğa', 'Bull', 'ESP'],
    crane: ['Turna', 'Crane', 'JPN'],
    beaver: ['Kunduz', 'Beaver', 'CAN'],
    jaguar: ['Jaguar', 'Jaguar', 'BRA ARG'],
    kangaroo: ['Kanguru', 'Kangaroo', 'AUS'],
    ibex: ['Dağ Keçisi', 'Ibex', 'CHE PAK'],
    elk: ['Mus Geyiği', 'Elk', 'SWE'],
    swan: ['Kuğu', 'Swan', 'DNK'],
    deer: ['Geyik', 'Stag', 'IRL'],
    elephant: ['Fil', 'Elephant', 'THA'],
    buffalo: ['Manda', 'Buffalo', 'VNM'],
    kiwi: ['Kivi', 'Kiwi', 'NZL'],
    owl: ['Baykuş', 'Owl', 'GRC'],
    gazelle: ['Ceylan', 'Gazelle', 'ZAF ISR OMN'],
    condor: ['Kondor', 'Condor', 'CHL COL'],
    stork: ['Leylek', 'Stork', 'LTU']
  };
  var OF = {};
  Object.keys(A).forEach(function (k) { A[k][2].split(' ').forEach(function (c) { OF[c] = k; }); });
  window.WCStamp = { of: function (c) { return OF[c] || null; } };

  var LAST = null;
  try { var _sb = showBattle; showBattle = function (r, p, e, tg) { LAST = { r: r, p: p, e: e, tg: tg }; return _sb.apply(this, arguments); }; } catch (e) { }

  function nm2(c) { try { return nm(c); } catch (e) { return (window.M && M[c] && M[c].name) || c; } }
  function addStamp() {
    try {
      var fn = document.getElementById('fn'); if (!fn || !LAST || !G || G.mp) return;
      var fh = fn.querySelector('.fh'); if (!fh || fn.querySelector('.st217')) return;
      if (!fh.querySelector('.banner.w')) return;
      var tg = LAST.tg || LAST.e; if (!tg || LAST.p !== G.pl) return;   /* yalnızca oyuncunun kazandığı saldırı */
      var tot = 0, n = 0;
      for (var k in G.owner) { tot++; if (G.owner[k] === G.pl && k !== G.pl) n++; }
      if (G.owner[tg] !== G.pl) n++;   /* sahiplik panel kapanınca yazılıyorsa */
      tot = Math.max(1, tot - 1);
      var an = OF[tg], h = '<div class="st217' + (an ? ' has' : '') + '">' +
        '<div class="cnt217"><small>' + X('FETHEDİLEN ÜLKE', 'COUNTRIES CONQUERED') + '</small><b>' + n + '<i>/' + tot + '</i></b>' +
        '<span class="bar217"><span style="width:' + Math.max(1.5, Math.min(100, n * 100 / tot)).toFixed(1) + '%"></span></span>' +
        (an ? '<em>' + X(nm2(tg) + ' ' + A[an][0] + ' mührü', nm2(tg) + ' ' + A[an][1] + ' seal') + '</em>' : '') + '</div>' +
        (an ? '<div class="stp217" style="background-image:url(assets/stamps/' + an + '.png)"></div>' : '') + '</div>';
      fh.insertAdjacentHTML('afterend', h);
      if (an) setTimeout(function () { try { if (window.AU) AU.play('tick'); } catch (e) { } }, 380);
    } catch (e) { }
  }
  /* fetihten sonra açılan "özellik seç" penceresi (V7 showPick7): aynı sayaç + damga, "ele geçirildi" satırının altına */
  function addPick() {
    try {
      var bx = document.getElementById('box'); if (!bx || !bx.classList.contains('crbox') || bx.querySelector('.st217') || !G || G.mp || !G.pend) return;
      var tg = G.pend.tg, crs = bx.querySelector('.crs'); if (!tg || !crs) return;
      var tot = 0, n = 0; for (var k in G.owner) { tot++; if (G.owner[k] === G.pl && k !== G.pl) n++; }
      if (G.owner[tg] !== G.pl) n++; tot = Math.max(1, tot - 1);
      var an = OF[tg];
      crs.insertAdjacentHTML('afterend', '<div class="st217' + (an ? ' has' : '') + '">' +
        '<div class="cnt217"><small>' + X('FETHEDİLEN ÜLKE', 'COUNTRIES CONQUERED') + '</small><b>' + n + '<i>/' + tot + '</i></b>' +
        '<span class="bar217"><span style="width:' + Math.max(1.5, Math.min(100, n * 100 / tot)).toFixed(1) + '%"></span></span>' +
        (an ? '<em>' + X(nm2(tg) + ' ' + A[an][0] + ' mührü', nm2(tg) + ' ' + A[an][1] + ' seal') + '</em>' : '') + '</div>' +
        (an ? '<div class="stp217" style="background-image:url(assets/stamps/' + an + '.png)"></div>' : '') + '</div>');
      var ar = bx.querySelector('.crf .arr'), u = swords(); if (ar && u) ar.innerHTML = '<i class="x217 sm" style="background-image:url(' + u + ')"></i>';
    } catch (e) { }
  }
  (function watchBox() {
    var bx = document.getElementById('box'); if (!bx) return setTimeout(watchBox, 500);
    var pb = 0; new MutationObserver(function () { if (pb) return; pb = setTimeout(function () { pb = 0; addPick(); }, 30); }).observe(bx, { childList: true });
  })();
  var pend = 0;
  (function watch() {

    var bs = document.getElementById('bs'); if (!bs) return setTimeout(watch, 500);
    new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; addStamp(); }, 60); }).observe(bs, { childList: true, subtree: true });
  })();
  /* damgaları önceden yükle (ilk fetihte boş kare görünmesin) */
  setTimeout(function () { try { Object.keys(A).forEach(function (k) { var im = new Image(); im.src = 'assets/stamps/' + k + '.png'; }); } catch (e) { } }, 6000);
})();
