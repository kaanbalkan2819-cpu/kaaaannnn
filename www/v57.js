/* V57 — (1) Haraç aldığın ülkeye ve onun müttefiklerine / saldırmazlık-dostluk antlaşması yaptıklarına O TUR saldıramazsın,
         (2) oyuncuyla dostluk/saldırmazlık antlaşması olan ülkeler AÇIK YEŞİL; başka hiçbir ülke yeşil tonu alamaz,
         (3) zarda 6 gelirse tekrar zar atılır (v5.js startPlayerTurn),
         (4) yatay ekranda diplomasi baloncuğu ekrana sığar/kaydırılabilir (v57.css); V58: 2B harita alanı yatayda yan panelleri hesaba katar (app.js area0).
   TEST EDİLMEDİ (yalnızca söz dizimi denetlendi). */
(function () {
  'use strict';
  function on() { return !!G && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner; }
  function tn() { return (G && G.T && G.T.turn) || 0; }
  var FRIEND = 'hsl(112,55%,72%)';   // açık yeşil
  var ALLY_SAME_AS_PLAYER = true;     // V68: true → oyuncunun dostluk antlaşmalı ülkeleri OYUNCUNUN rengini alır; false → eski açık yeşil

  // ---- dostlar: oyuncuyla aktif antlaşması olanlar + oyuncunun ittifak üyeleri ----
  function pactPartners(e) {
    var r = [], t = tn(); if (!G.pacts) return r;
    for (var k in G.pacts) { if (!(G.pacts[k] > t)) continue; var p = k.split('|'); if (p[0] === e) r.push(p[1]); else if (p[1] === e) r.push(p[0]); }
    return r;
  }
  var _fc = null, _ft = 0;
  function friends() {
    var now = performance.now(); if (_fc && now - _ft < 40) return _fc;
    var r = {};
    try {
      if (on()) {
        /* V68: yalnızca DOSTLUK antlaşması (ittifak) renk paylaşır; saldırmazlık paktı (G.pacts) artık renklendirmez */
        if (window.WCD && WCD.allies) WCD.allies(G.pl).forEach(function (e) { r[e] = 1; });
        delete r[G.pl];
      }
    } catch (x) { }
    _fc = r; _ft = now; return r;
  }

  // ---- renk: dostlar açık yeşil; diğer ülkeler yeşil tona (60°-170°) düşmez ----
  var HSL = /^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/;
  function avoidGreen(c) {
    if (typeof c !== 'string') return c; var m = HSL.exec(c); if (!m) return c;
    var h = +m[1], s = +m[2], l = +m[3];
    if (h >= 60 && h <= 170 && s >= 12) return 'hsl(' + ((h + 130) % 360) + ',' + s + '%,' + l + '%)';
    return c;
  }
  var _col = col;
  col = function (e) {
    var r = _col.apply(this, arguments);
    try {
      if (typeof e === 'string' && on() && e !== G.pl) { if (friends()[e]) return ALLY_SAME_AS_PLAYER ? _col.call(this, G.pl) : FRIEND; return avoidGreen(r); }
    } catch (x) { }
    return r;
  };
  // 3B küre ve 2B harita yeniden boyansın: renk imzasına dost listesi eklenir
  try {
    if (window.WCD && WCD.sig) { var _sig = WCD.sig; WCD.sig = function () { var s = _sig.apply(this, arguments); try { s += '|f57:' + Object.keys(friends()).sort().join(','); } catch (x) { } return s; }; }
  } catch (x) { }

  // ---- haraç alındı mı? (G.es[oyuncu] değişirse ödenmiştir) ----
  var _tg = window.wcdTributeGo;
  if (typeof _tg === 'function') {
    window.wcdTributeGo = function () {
      var e = null, before = null;
      try { e = G.sel && G.owner[G.sel]; before = JSON.stringify(G.es && G.es[G.pl]); } catch (x) { }
      var r = _tg.apply(this, arguments);
      try {
        if (typeof e === 'string' && e !== G.pl && JSON.stringify(G.es && G.es[G.pl]) !== before) {
          G.trib57 = G.trib57 || {}; G.trib57[e] = tn();
          try { save(); } catch (x) { }
          try { render(); } catch (x) { }
        }
      } catch (x) { }
      return r;
    };
  }

  // ---- bu tur saldırıya kapalı ülkeler ----
  function blocked() {
    var r = {}, t = tn(), T = G.trib57 || {};
    for (var e in T) {
      if (T[e] !== t) continue;
      r[e] = 1;
      try { if (window.WCD && WCD.allies) WCD.allies(e).forEach(function (a) { r[a] = 1; }); } catch (x) { }
      pactPartners(e).forEach(function (a) { r[a] = 1; });
    }
    delete r[G.pl]; return r;
  }
  window.v57Blocked = function () { try { return on() ? blocked() : {}; } catch (e) { return {}; } };
  var _t = targets;
  targets = function (p, ow) {
    var r = _t.apply(this, arguments);
    try {
      if (on() && p === G.pl && ow === G.owner && G.trib57) {
        var b = blocked();
        for (var id in r) if (b[ow[id]]) delete r[id];
      }
    } catch (x) { }
    return r;
  };

  // ---- yatay ekran: diplomasi baloncuğu (V58) ----
  // Yatay telefonda konum/boyut tamamen v57.css'te (ortada, 2 sütun, taşarsa kaydırılır).
  // Burada yalnızca dikey/geniş ekran için kenar kıstırması yapılır ve yön değişirse balon kapatılır.
  function isLS() { try { return window.matchMedia('(orientation:landscape) and (max-height:520px)').matches; } catch (x) { return innerWidth > innerHeight && innerHeight <= 520; } }
  function fitBubble(d) {
    try {
      d.dataset.ls = isLS() ? '1' : '0';
      if (isLS()) { d.style.removeProperty('left'); d.style.removeProperty('bottom'); d.style.removeProperty('width'); return; }
      var vw = innerWidth, vh = innerHeight, w = d.offsetWidth || Math.min(340, vw - 16);
      var left = parseFloat(d.style.left) || 8; left = Math.max(8, Math.min(left, vw - w - 8)); d.style.left = left + 'px';
      d.style.maxHeight = (vh - 16) + 'px'; d.style.overflowY = 'auto';
      var rc = d.getBoundingClientRect();
      if (rc.top < 8) { d.style.bottom = 'auto'; d.style.top = '8px'; }
      else if (rc.bottom > vh - 8) { d.style.bottom = '8px'; }
    } catch (x) { }
  }
  try {
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes && m.addedNodes.forEach(function (n) { if (n.id === 'wdbub') { fitBubble(n); requestAnimationFrame(function () { fitBubble(n); }); } }); });
    }).observe(document.body, { childList: true });
    var _rz = function () { var d = document.getElementById('wdbub'); if (d && d.dataset.ls !== (isLS() ? '1' : '0')) d.remove(); };
    window.addEventListener('resize', _rz); window.addEventListener('orientationchange', _rz);
  } catch (x) { }
})();
