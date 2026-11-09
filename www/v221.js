/* V221 — Türkiye–Azerbaycan (Nahçıvan) sınırı, sağ taraf açılır kare menü (Elçi Gönder / Diplomasi / Kalkınma), 9999 altın, simge ön yükleme.
   Geri almak için index.html'den v221.js ve v221.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function solo() { try { return !!window.G && !G.mp && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner; } catch (e) { return false; } }

  /* ---- 1) yeni simgeler önceden yüklensin (ülke seçme ekranında kısa süre eski simge görünmesin) ---- */
  try { var IC = window.WC_ICONS || {}; ['pop', 'army', 'eco', 'tech', 'dip', 'gold'].forEach(function (k) { if (IC[k]) { var im = new Image(); im.decoding = 'sync'; im.src = IC[k]; (window.__pre221 = window.__pre221 || []).push(im); } }); } catch (e) { }

  /* ---- 2) Türkiye–Azerbaycan kara sınırı (Nahçıvan, ~17 km). Haritada komşu sayılmıyordu; saldırı/diplomasi menzili düzelir. ---- */
  function link(a, b) {
    try {
      var ok = 0;
      R.forEach(function (r) { if (r.id === a && r.nb.indexOf(b) < 0) { r.nb.push(b); ok++; } if (r.id === b && r.nb.indexOf(a) < 0) { r.nb.push(a); ok++; } });
      if (M[a] && M[a].nb && M[a].nb !== (R.filter(function (r) { return r.id === a; })[0] || {}).nb && M[a].nb.indexOf(b) < 0) M[a].nb.push(b);
      if (M[b] && M[b].nb && M[b].nb !== (R.filter(function (r) { return r.id === b; })[0] || {}).nb && M[b].nb.indexOf(a) < 0) M[b].nb.push(a);
      return true;
    } catch (e) { return false; }
  }
  (function fix() { try { if (typeof R === 'undefined' || !R.length || typeof M === 'undefined' || !M.TUR || !M.AZE) return setTimeout(fix, 400); } catch (e) { return setTimeout(fix, 400); } link('TUR', 'AZE'); })();

  /* ---- 3) altın 9999 (tek kişilik oyunda bakiye 9999'un altındaysa bir kez tamamlanır) ---- */
  setInterval(function () { try { if (solo() && !G.g221 && ['pick', 'v7pick'].indexOf(G.ph) < 0) { G.g221 = 1; if ((+G.gold || 0) < 9999) { G.gold = 9999; try { if (window.Gold) Gold.add(0); } catch (e) { } try { save(); } catch (e) { } } } } catch (e) { } }, 1000);

  /* ---- 4) sağ taraf: tek kare düğme -> altta açılan kare düğmeler: Elçi Gönder · Diplomasi · Kalkınma (+/− dışarıda kalır) ---- */
  var open = false;
  function envoy() {
    try {
      var id = G.sel, o = id && G.owner[id];
      if (typeof o === 'string' && o !== G.pl && M[o]) { if (window.v138Sheet) v138Sheet(o); else if (window.v23Envoy) v23Envoy(); return; }
      if (window.v222EnvoyPick) v222EnvoyPick(); else toast('✉ ' + X('Önce haritada elçi göndereceğin ülkeye dokun', 'First tap the country you want to send an envoy to'));   /* V222: önce ülke listesi */
    } catch (e) { }
  }
  function item(k, img, lb, fn) { return '<button type="button" class="it221" data-k="' + k + '" title="' + lb + '"><i style="background-image:url(assets/art/' + img + '.webp)"></i><span>' + lb + '</span></button>'; }
  function build() {
    if (document.getElementById('tg221')) return true;
    var hub = document.getElementById('wdhub'); if (!hub || !hub.parentNode) return false;
    var t = document.createElement('button'); t.type = 'button'; t.id = 'tg221'; t.className = hub.className; t.setAttribute('aria-label', X('Devlet işleri', 'State affairs'));
    t.innerHTML = '<i></i>';
    hub.parentNode.insertBefore(t, hub);
    var c = document.createElement('div'); c.id = 'col221';
    c.innerHTML = item('env', 'envoy', X('Elçi Gönder', 'Send Envoy')) + item('dip', 'dip', X('Diplomasi', 'Diplomacy')) + item('dev', 'city', X('Kalkınma', 'Development'));
    document.body.appendChild(c);
    t.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!open); });
    c.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.it221'); if (!b) return; e.stopPropagation(); setOpen(false);
      var k = b.getAttribute('data-k');
      try { if (k === 'env') envoy(); else if (k === 'dip') { if (window.wdhOpen) wdhOpen(); } else if (k === 'dev') { if (window.dev137Menu) dev137Menu(); } } catch (x) { }
    });
    document.addEventListener('click', function (e) { if (open && !(e.target.closest && e.target.closest('#col221,#tg221'))) setOpen(false); }, true);
    return true;
  }
  function place() {
    var t = document.getElementById('tg221'), c = document.getElementById('col221'); if (!t || !c) return;
    var r = t.getBoundingClientRect(); c.style.top = (r.bottom + 6) + 'px'; c.style.right = Math.max(4, window.innerWidth - r.right) + 'px'; c.style.width = r.width + 'px';
  }
  function setOpen(f) { open = f; place(); var c = document.getElementById('col221'), t = document.getElementById('tg221'); if (c) c.classList.toggle('on', open); if (t) t.classList.toggle('on', open); }
  setInterval(function () {
    try {
      var hub = document.getElementById('wdhub'), t = document.getElementById('tg221');
      if (!build()) return;
      var vis = !!(hub && hub.offsetParent === null ? (getComputedStyle(hub).display !== 'none' || hub.__v221v) : true);
      var show = solo() && G.ph !== 'v7pick' && !document.body.classList.contains('wcm-on') && !G.over;
      if (t) t.style.display = show ? '' : 'none';
      if (!show && open) setOpen(false);
      if (open) place();
    } catch (e) { }
  }, 400);
})();
/* V221: dereceli eşleşmede iki ülke arası sınır adımı (komşuluk mesafesi) en az 4, en çok 6 */
(function () {
  function hops(a, b) {
    try {
      if (a === b) return 0; var seen = {}, q = [a], d = {}; seen[a] = 1; d[a] = 0;
      while (q.length) { var x = q.shift(); if (d[x] >= 8) continue; var nb = (window.M && M[x] && M[x].nb) || []; for (var i = 0; i < nb.length; i++) { var y = nb[i]; if (seen[y]) continue; seen[y] = 1; d[y] = d[x] + 1; if (y === b) return d[y]; q.push(y); } }
    } catch (e) { }
    return 99;
  }
  window.v221Hops = hops;
  (function hook() {
    if (!window.WCStats || !WCStats.pickNear || !WCStats.pool) return setTimeout(hook, 500);
    if (WCStats.pickNear.v221) return;
    var _pn = WCStats.pickNear;
    WCStats.pickNear = function (t, parity, exclude, near, strict) {
      try {
        if (near && window.M && M[near]) {
          /* V226: uzaklık en çok 6 ülke, ortalama 4; güç farkı en az olanlar seçilir (tüm ülkelerden) */
          var sc = function (id) { return WCStats.power ? WCStats.power(id) : 0; }, s0 = sc(near) || 1, roll = Math.random();
          var d0 = roll < .1 ? 2 : roll < .3 ? 3 : roll < .7 ? 4 : roll < .9 ? 5 : 6, all = [];
          for (var g = 0; g < 4; g++) { all = all.concat(WCStats.pool(g, 0) || [], WCStats.pool(g, 1) || []); }
          var cand = [];
          all.forEach(function (id) {
            if ((exclude && exclude.indexOf(id) >= 0) || !M[id] || id === near) return;
            if (WCStats.fair && !WCStats.fair(id, near)) return;   /* V236: yalnızca güçte ve yüzölçümünde denk ülkeler */
            var h = hops(near, id); if (h < 2 || h > 6) return;
            cand.push({ id: id, c: Math.abs(sc(id) - s0) / s0 * 100 + Math.abs(h - d0) * 5 });
          });
          if (cand.length) { cand.sort(function (a, b) { return a.c - b.c; }); return cand[Math.floor(Math.random() * Math.min(3, cand.length))].id; }
          if (strict) return null;
        }
      } catch (e) { }
      return _pn.apply(this, arguments);
    };
    WCStats.pickNear.v221 = 1;
  })();
})();
