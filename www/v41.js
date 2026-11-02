/* V45 — Diplomasi Merkezi: diplomasiye yalnızca "ülke seç → balon" yoluyla değil, harita kontrol sütunundaki 🕊 düğmesinden de ulaşılır.
   - İttifaklar (harita rengiyle birlikte), aktif paktlar, ilişki seviyesi, haraç hakkı
   - Komşular listesi + tüm ülkelerde arama; her satırdan doğrudan 🤝 Dostluk / 🛡 Saldırmazlık / 💰 Haraç
   Bağımlılık: v40.js (window.WCD). Test: playwright ile denendi. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function is5() { return !!G && G.v5 === 1 && typeof G.pl === 'string' && !!G.pl; }
  function nm(e) { return (M[e] && M[e].name) || e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function turn() { return (G && G.T && G.T.turn) || 0; }
  function fl(e) { return (typeof fimg === 'function') ? fimg(e, 'sm') : ''; }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function regionOf(e) { if (G.owner[e] === e) return e; for (var k in G.owner) if (G.owner[k] === e) return k; return null; }
  function pactLeft(e) { try { var v = G.pacts && G.pacts[G.pl < e ? G.pl + '|' + e : e + '|' + G.pl]; return v > turn() ? v - turn() : 0; } catch (x) { return 0; } }

  function neighbourList() {
    var s = {};
    for (var id in G.owner) if (G.owner[id] === G.pl && M[id] && M[id].nb) M[id].nb.forEach(function (n) { var o = G.owner[n]; if (typeof o === 'string' && o !== G.pl) s[o] = 1; });
    try { var tg = targets(G.pl, G.owner); for (var k in tg) { var o2 = G.owner[k]; if (typeof o2 === 'string' && o2 !== G.pl) s[o2] = 1; } } catch (x) { }
    WCD.allies(G.pl).forEach(function (a) { s[a] = 1; });
    return Object.keys(s).filter(function (e) { return ownedN(e) > 0 && M[e]; });
  }
  function allList() { return aliveEmp().filter(function (e) { return e !== G.pl && ownedN(e) > 0 && M[e]; }); }
  function sortNames(a) { return a.sort(function (x, y) { return nm(x).localeCompare(nm(y), (typeof L !== 'undefined' && L === 'en') ? 'en' : 'tr'); }); }

  function row(e) {
    var inC = WCD.allied(G.pl, e), pl = pactLeft(e), sw = WCD.coColor(e), sub = '';
    if (inC) sub = X('Müttefik', 'Ally') + (WCD.allyLeft && WCD.allyLeft(e) ? ' · ' + WCD.allyLeft(e) + X(' tur kaldı', ' turns left') : '') + ' · ' + WCD.friend(e).n + ' ' + WCD.friend(e).h; else if (pl > 0) sub = X('Saldırmazlık paktı · ', 'Pact · ') + pl + X(' tur', ' turns');
    var q = '\'' + e + '\'';
    return '<div class="wdh-row">' + (sw ? '<i class="wdh-sw" style="background:' + sw + '"></i>' : '') + fl(e) +
      '<button type="button" class="wdh-n" onclick="wdhGo(' + q + ',\'b\')"><b>' + esc(nm(e)) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>' +
      '<div class="wdh-act">' +
      '<button type="button" title="' + X('Dostluk Antlaşması', 'Friendship Treaty') + '"' + (inC ? ' disabled' : '') + ' onclick="wdhGo(' + q + ',\'f\')">🤝</button>' +
      '<button type="button" title="' + X('Saldırmazlık Antlaşması', 'Non-Aggression Pact') + '"' + (inC || pl > 0 ? ' disabled' : '') + ' onclick="wdhGo(' + q + ',\'p\')">🛡</button>' +
      '<button type="button" title="' + X('Haraç Talep Et', 'Demand Tribute') + '" onclick="wdhGo(' + q + ',\'t\')">💰</button>' +
      '</div></div>';
  }
  function listHtml(qs) {
    var arr, qq = (qs || '').trim().toLocaleLowerCase((typeof L !== 'undefined' && L === 'en') ? 'en' : 'tr');
    if (qq) arr = allList().filter(function (e) { return nm(e).toLocaleLowerCase((typeof L !== 'undefined' && L === 'en') ? 'en' : 'tr').indexOf(qq) >= 0; });
    else arr = neighbourList();
    sortNames(arr);
    // müttefikler ve paktlılar üstte
    arr.sort(function (a, b) { var wa = WCD.allied(G.pl, a) ? 0 : pactLeft(a) ? 1 : 2, wb = WCD.allied(G.pl, b) ? 0 : pactLeft(b) ? 1 : 2; return wa - wb; });
    if (!arr.length) return '<div class="wdh-empty">' + X('Sonuç yok.', 'No results.') + '</div>';
    return arr.slice(0, 60).map(row).join('');
  }
  function coalitions() {
    var d = G.dip; if (!d || !d.co || !d.co.length) return '<div class="wdh-empty">' + X('Henüz ittifak yok. Bir ülkeyle Dostluk Antlaşması imzalayınca burada ve haritada ortak renkle görünür.', 'No alliances yet. Once a Friendship Treaty is signed it shows here and on the map in a shared colour.') + '</div>';
    var out = '';
    d.co.forEach(function (c) {
      var mem = c.m.filter(function (x) { return ownedN(x) > 0; }); if (mem.length < 2) return;
      var mine = mem.indexOf(G.pl) >= 0, sw = WCD.coColor(mem[0]);
      out += '<div class="wdh-co"><b><i class="wdh-sw" style="background:' + sw + '"></i>' + (mine ? X('Senin ittifakın', 'Your alliance') : X('İttifak', 'Alliance')) + '</b>' +
        mem.map(function (x) { return (x === G.pl ? '<u>' + X('Sen', 'You') + '</u>' : esc(nm(x))); }).join(' · ') +
        (c.vs && M[c.vs] ? '<br><small style="opacity:.75">' + X('Ortak tehdit: ', 'Common threat: ') + esc(nm(c.vs)) + '</small>' : '') +
        (mine ? '<br><button type="button" class="big" style="margin-top:6px;padding:6px 10px;font-size:12px" onclick="wdhLeave()">🚪 ' + X('İttifaktan Çık', 'Leave Alliance') + '</button>' : '') + '</div>';
    });
    return out || '<div class="wdh-empty">—</div>';
  }

  function openHub() {
    if (!is5() || !WCD.canAct()) { try { toast(X('Şu an diplomasi yapılamaz', 'Diplomacy is not available now')); } catch (x) { } return; }
    try { var b = document.getElementById('wdbub'); if (b) b.remove(); } catch (x) { }
    modal('<div class="wdh"><h3>🕊 ' + X('Diplomasi Merkezi', 'Diplomacy Hub') + '</h3>' +
      '<div class="wdh-sub">' + X('Bu tur kalan haraç hakkı: ', 'Tribute demands left this turn: ') + '<b>' + WCD.tribLeft() + '/' + WCD.tribMax + '</b></div>' +
      '<div class="wdh-sec">' + X('İttifaklar', 'Alliances') + '</div>' + coalitions() +
      '<div class="wdh-sec">' + X('Ülkeler', 'Countries') + '</div>' +
      '<input class="wdh-q" id="wdhq" type="search" autocomplete="off" placeholder="' + X('Ülke ara… (boşsa komşular)', 'Search country… (empty = neighbours)') + '" oninput="wdhFilter(this.value)">' +
      '<div class="wdh-list" id="wdhl">' + listHtml('') + '</div>' +
      '<button class="big" style="margin-top:10px" onclick="closeMod()">' + X('Kapat', 'Close') + '</button></div>');
  }
  window.wdhOpen = openHub;
  window.wdhFilter = function (v) { var l = document.getElementById('wdhl'); if (l && is5()) l.innerHTML = listHtml(v); };
  window.wdhLeave = function () { closeMod(); if (window.WCD) WCD.leave(); };
  window.wdhGo = function (e, a) {
    if (!is5() || !WCD.canAct()) { closeMod(); return; }
    var id = regionOf(e); if (!id) return;
    closeMod(); pickC(id);
    setTimeout(function () {
      try {
        if (a === 'f') wcdFriend(); else if (a === 'p') wcdNap(); else if (a === 't') wcdTribute(); else wcdBubble();
      } catch (x) { console.error(x); }
    }, 80);
  };

  /* ---- harita kontrol sütunundaki düğme ---- */
  function ensureBtn() {
    var ctl = document.getElementById('ctl'); if (!ctl) return;
    var b = document.getElementById('wdhub');
    if (!b) {
      b = document.createElement('button'); b.id = 'wdhub'; b.type = 'button'; b.textContent = '🕊';
      b.addEventListener('click', function (ev) { ev.stopPropagation(); openHub(); });
      ctl.appendChild(b);
    }
    b.title = X('Diplomasi Merkezi', 'Diplomacy Hub');
    var on = is5() && !G.over && G.ph !== 'over' && G.ph !== 'v7pick' && G.ph !== 'v5intro';
    b.style.display = on ? '' : 'none';
    b.style.opacity = (on && G.ph === 'act' && !G.busy) ? '' : '.45';
  }
  var _r = render;
  render = function () { var x = _r.apply(this, arguments); try { ensureBtn(); } catch (e) { } return x; };
})();
