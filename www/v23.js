/* V23 — Keşif yapılınca keşfedilen ülke hakkında tek cümlelik ilginç bilgi gösterilir (veri: v23facts.js). */
(function () {
  'use strict';
  var tm = null;
  function lang() { try { return (typeof L !== 'undefined' && L === 'en') ? 'en' : 'tr'; } catch (e) { return 'tr'; } }
  function pool(id) {      // bir ülkenin tüm bilgileri: ana liste + (varsa) ek liste
    var a = [], F = window.FACTS23 && window.FACTS23[id], B = window.FACTS23B && window.FACTS23B[id];
    if (F) a.push(F); if (B) a = a.concat(B); return a;
  }
  function card(id, txt) {   // V110: "Keşif yapıldı" kartı + (varsa) daha önce görülmemiş bilgi
    try {
      var nm = (window.M && M[id] && M[id].name) || id, en = lang() === 'en';
      var old = document.getElementById('fact23'); if (old) old.remove();
      var d = document.createElement('div'); d.id = 'fact23'; d.className = 'fact23';
      var fl221 = ''; try { fl221 = fimg(id, 'sm'); } catch (x) { }   /* V221: süslü casus raporu kartı */
      d.innerHTML = '<div class="f221h">' + fl221 + '<div><small>' + (en ? 'SPY REPORT' : 'CASUS RAPORU') + '</small><b>' + nm + '</b></div><span class="f221s">' + (en ? 'Scouted' : 'Keşfedildi') + '</span></div>' + '<p>' + (txt || (en ? 'Our agents mapped its army and economy. No notable secret this time.' : 'Ajanlarımız ordusunu ve ekonomisini haritaladı. Bu sefer dikkat çekici bir sır yok.')) + '</p>';
      d.onclick = function () { d.remove(); }; document.body.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.remove(); }, 7000);
    } catch (e) { }
  }
  var shown23 = false;
  function show(id) {
    var P = pool(id); if (!P.length) return;
    G.fx23 = G.fx23 || {};
    var seen = G.fx23[id]; if (!Array.isArray(seen)) seen = G.fx23[id] = (seen ? [0] : []);
    var left = []; for (var i = 0; i < P.length; i++) if (seen.indexOf(i) < 0) left.push(i);
    if (!left.length) return;                                   // hepsi görüldü: tekrar gösterme
    var k = left[Math.floor(Math.random() * left.length)]; seen.push(k);
    var lg = lang(), txt = P[k][lg === 'en' ? 1 : 0]; if (!txt) return;
    G.n24 = G.n24 || {}; (G.n24[id] = G.n24[id] || {}).f = txt; shown23 = true; card(id, txt);
    try { if (window.v24Refresh) v24Refresh(); } catch (e) { }
    try { save(); } catch (e) { }
  }
  var FACT_P = 1;   // <<< AYAR (V24): her keşifte değil, yalnızca bu olasılıkla (≈4'te 1) casus raporu çıkar
  var INTENT_P = 1;   // <<< AYAR (V29): her keşifte ülkenin kime saldırmayı düşündüğü bildirilir
  var _sc = scout;
  scout = function () {
    var before = 0, e;
    try { before = (G.T.scouts || 0) + (G.T.scouted && !G.T.scouts ? 1 : 0); e = G.sel && G.owner[G.sel]; } catch (x) { }
    var r = _sc.apply(this, arguments);
    try {
      var after = (G.T.scouts || 0) + (G.T.scouted && !G.T.scouts ? 1 : 0);
      if (after > before && typeof e === 'string') setTimeout(function () { shown23 = false; if (Math.random() < FACT_P) show(e); if (!shown23) card(e, null); }, 350);   // V110: her keşifte kart; fact tekrar etmez (G.fx23)
      if (after > before && typeof e === 'string' && e !== G.pl && Math.random() < INTENT_P) setTimeout(function () { try { if (window.v24Intent) v24Intent(e); } catch (x) { } }, 1100);
    } catch (x) { }
    return r;
  };

  // ---- İSYAN: çok saldırgan oynarsan, eskiden yok ettiğin bir ülke topraklarını geri alıp bağımsızlığını ilan eder ----
  var REV_HEAT = 4.5, REV_P = 0.25, REV_COOL = 7;   // V220: isyan daha nadir (eski 3.5 / 0.45 / 4). <<< AYAR: isyan eşiği / olasılığı / bekleme (tur)
  function ownedCount(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function revolt() {
    try {
      if (!G || !G.owner || !G.T || G.over || typeof G.pl !== 'string') return;
      var turn = G.T.turn || 0, c = (G.st && G.st[0] && G.st[0].c) || 0;
      if (G.t23 === undefined) { G.t23 = turn; G.c23 = c; G.heat23 = 0; G.cool23 = 0; return; }
      if (turn === G.t23) return;
      var delta = Math.max(0, c - G.c23); G.t23 = turn; G.c23 = c;
      G.heat23 = (G.heat23 || 0) * 0.5 + delta; if (G.cool23 > 0) G.cool23--;
      if (G.heat23 < REV_HEAT || G.cool23 > 0 || ownedCount(G.pl) < 4 || Math.random() > REV_P) return;
      var cand = []; for (var t in G.owner) if (G.owner[t] === G.pl && t !== G.pl && ownedCount(t) === 0) cand.push(t);
      if (!cand.length) return;
      var r = cand[Math.floor(Math.random() * cand.length)];
      G.owner[r] = r; G.rebel23 = G.rebel23 || {}; G.rebel23[r] = 1; if (G.es) delete G.es[r]; if (G.ed) delete G.ed[r];
      G.cool23 = REV_COOL; G.heat23 = 0;
      var lg = lang(), nm = (window.M && M[r] && M[r].name) || r;
      var old = document.getElementById('fact23'); if (old) old.remove();
      var d = document.createElement('div'); d.id = 'fact23'; d.className = 'fact23 rev23';
      d.innerHTML = '<small>🔥 ' + (lg === 'en' ? 'REVOLT!' : 'İSYAN!') + '</small>' + (lg === 'en'
        ? 'Your aggression sparked an uprising: <b>' + nm + '</b> has declared independence again!'
        : 'Saldırgan tutumun halkı ayaklandırdı: <b>' + nm + '</b> yeniden bağımsızlığını ilan etti!');
      d.onclick = function () { d.remove(); }; document.body.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.remove(); }, 8000);
      save(); _r0.call(window);
    } catch (e) { }
  }
  var _r0 = render;
  render = function () { var x = _r0.apply(this, arguments); revolt(); return x; };

  // ---- NEFRET BUFFI: isyancı ülke oyuncuya karşı savaşırken tüm özellikleri 1.5 kat güçlü sayılır (kalıcı değer değişmez) ----
  var HATE = 1.75;
  var _st = st;
  st = function (e) {
    var a = _st.apply(this, arguments);
    try { if (a && G) { if (typeof e === 'string' && G.rebel23 && G.rebel23[e] && e !== G.pl) a._reb = 1; if (e === G.pl) a._pl = 1; } } catch (x) { }
    return a;
  };
  var _bt = battle;
  battle = function (A, D) {
    try {
      if (A && D && A._reb && D._pl) A = A.map(function (v) { return v * HATE; });
      else if (A && D && D._reb && A._pl) D = D.map(function (v) { return v * HATE; });
    } catch (x) { }
    var rest = Array.prototype.slice.call(arguments, 2);
    return _bt.apply(this, [A, D].concat(rest));
  };
  // panelde isyancı etiketi
  var _pn = panel;
  panel = function () {
    var r = _pn.apply(this, arguments);
    try {
      var id = G && G.sel, o = id && G.owner[id], el = document.getElementById('panel');
      if (o && G.rebel23 && G.rebel23[o] && o !== G.pl && el) {
        var b = el.querySelector('.v15b');
        if (b && !b.querySelector('.hate23')) b.insertAdjacentHTML('beforeend', '<span class="tag hate23" style="background:#7a1f12;color:#fff">😡 ' + (lang() === 'en' ? 'Rebel ×1.5' : 'İsyancı ×1.5') + '</span>');
      }
    } catch (x) { }
    return r;
  };

  // ================= ELÇİ: Koruma talebi / Kışkırt / Saldırmazlık paktı =================
  var COST = { guard: 60, incite: 40, prot: 60 }, MV = { guard: 2, incite: 2, prot: 2 }, GUARD_TURNS = 5, PROT_TURNS = 8;   // <<< AYAR
  function T(a, b) { return lang() === 'en' ? b : a; }
  function nmE(e) { return (window.M && M[e] && M[e].name) || e; }
  function turnNo() { return (G && G.T && G.T.turn) || 0; }
  function ownN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function flag(e) { try { return fimg(e, 'sm'); } catch (x) { return ''; } }
  var ICON = {
    pact: '<svg viewBox="0 0 64 64"><defs><linearGradient id="rpPaper" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a98c55"/><stop offset=".07" stop-color="#efe0b8"/><stop offset=".5" stop-color="#fbf1d6"/><stop offset=".93" stop-color="#e3d0a0"/><stop offset="1" stop-color="#9d804a"/></linearGradient><linearGradient id="rpRoll" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f7440"/><stop offset=".35" stop-color="#fff3d2"/><stop offset=".7" stop-color="#d8bf88"/><stop offset="1" stop-color="#7a5f30"/></linearGradient><radialGradient id="rpWax" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#f0605a"/><stop offset=".45" stop-color="#b3161c"/><stop offset="1" stop-color="#560a0d"/></radialGradient><filter id="rpSh" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity=".6"/></filter></defs><g filter="url(#rpSh)"><path d="M12 13h40v37H12z" fill="url(#rpPaper)" stroke="#8a6d3b" stroke-width=".7"/><rect x="8" y="10" width="7" height="43" rx="3.5" fill="url(#rpRoll)" stroke="#6f5528" stroke-width=".6"/><rect x="49" y="10" width="7" height="43" rx="3.5" fill="url(#rpRoll)" stroke="#6f5528" stroke-width=".6"/><g stroke="#4f3a1c" stroke-width=".9" stroke-linecap="round" opacity=".55"><path d="M18 19h28M18 24h26M18 29h28M18 34h20"/></g><path d="M18 41c3-5 5 2 8-2s4 3 7-1 3 2 6 0" fill="none" stroke="#243a74" stroke-width="1.2" stroke-linecap="round"/><path d="M41 36c4 0 7 2 9 5s3 6 1 10-5 6-9 6-8-2-9-6-1-8 2-11 4-4 6-4z" fill="url(#rpWax)" stroke="#4a080b" stroke-width=".5"/><circle cx="42" cy="47" r="6.3" fill="none" stroke="#7b0d12" stroke-width="1.1"/><path d="M42 42.500l1.500 3 3.300.4-2.400 2.300.6 3.300-3-1.600-3 1.600.6-3.300-2.400-2.300 3.300-.4z" fill="#8c1017" opacity=".9"/><ellipse cx="37.500" cy="41.500" rx="3.200" ry="1.600" fill="#fff" opacity=".4" transform="rotate(-35 37.500 41.500)"/></g></svg>',
    guard: '<svg viewBox="0 0 64 64"><defs><linearGradient id="rgRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffefb0"/><stop offset=".45" stop-color="#d4a232"/><stop offset="1" stop-color="#7a560c"/></linearGradient><linearGradient id="rgFace" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#46608f"/><stop offset=".5" stop-color="#26396a"/><stop offset="1" stop-color="#121c3a"/></linearGradient><linearGradient id="rgSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d9aab"/><stop offset=".45" stop-color="#f4f7fb"/><stop offset="1" stop-color="#7b8798"/></linearGradient><filter id="rgSh" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="1.8" stdDeviation="1.5" flood-color="#000" flood-opacity=".6"/></filter></defs><g filter="url(#rgSh)"><path d="M32 3L56 10.500V30C56 45 46 55 32 61 18 55 8 45 8 30V10.500z" fill="url(#rgRim)" stroke="#4a3408" stroke-width=".8" stroke-linejoin="round"/><path d="M32 7.500L52 14V30C52 42 43.500 51 32 56.500 20.500 51 12 42 12 30V14z" fill="url(#rgFace)" stroke="#0c1230" stroke-width=".8"/><path d="M32 7.500L12 14V30C12 42 20.500 51 32 56.500z" fill="#fff" opacity=".09"/><path d="M32 15l2.300 4.200V37h-4.600V19.200z" fill="url(#rgSteel)" stroke="#556070" stroke-width=".5"/><path d="M32 17v20" stroke="#6d7888" stroke-width=".5"/><rect x="25.500" y="36.500" width="13" height="3" rx="1.500" fill="url(#rgRim)" stroke="#5a3f08" stroke-width=".5"/><rect x="30.700" y="39.500" width="2.600" height="7" rx="1" fill="#6b3f1a"/><circle cx="32" cy="48.500" r="2.200" fill="url(#rgRim)" stroke="#5a3f08" stroke-width=".5"/><g fill="url(#rgRim)"><circle cx="15" cy="13" r="1.300"/><circle cx="49" cy="13" r="1.300"/><circle cx="32" cy="9.500" r="1.100"/></g><path d="M32 3L56 10.500V19C44 16 22 21 8 28V10.500z" fill="#fff" opacity=".16"/><path d="M32 4.500L54 11.300" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/></g></svg>',
    incite: '<svg viewBox="0 0 64 64"><defs><radialGradient id="riGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd24a" stop-opacity=".95"/><stop offset=".5" stop-color="#ff6a1a" stop-opacity=".6"/><stop offset="1" stop-color="#ff3b1a" stop-opacity="0"/></radialGradient><linearGradient id="riFire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#c4120f"/><stop offset=".5" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ffe27a"/></linearGradient><linearGradient id="riBlade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f8b9c"/><stop offset=".5" stop-color="#f6f9fc"/><stop offset="1" stop-color="#8a96a7"/></linearGradient><linearGradient id="riGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffefb0"/><stop offset=".5" stop-color="#d4a232"/><stop offset="1" stop-color="#7a560c"/></linearGradient><filter id="riSh" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity=".65"/></filter></defs><circle cx="32" cy="32" r="30" fill="url(#riGlow)"/><path d="M32 4c2 9 13 12 13 25 0 8-5 14-13 14S19 37 19 29c0-6 3-9 5-13 1 4 3 5 5 4-1-6 0-12 3-16z" fill="url(#riFire)" opacity=".95"/><path d="M32 18c1 5 7 7 7 14 0 5-3 8-7 8s-7-3-7-8c0-4 2-5 3-8 1 2 2 3 3 2z" fill="#fff3a8" opacity=".8"/><g filter="url(#riSh)"><g transform="rotate(45 32 32)"><path d="M32 3l2.600 5V40h-5.200V8z" fill="url(#riBlade)" stroke="#4d5766" stroke-width=".5"/><path d="M32 8v31" stroke="#667385" stroke-width=".5"/><rect x="24.500" y="40" width="15" height="3.200" rx="1.600" fill="url(#riGold)" stroke="#5a3f08" stroke-width=".5"/><rect x="30.700" y="43" width="2.600" height="9" rx="1" fill="#5b3414"/><circle cx="32" cy="54" r="2.400" fill="url(#riGold)" stroke="#5a3f08" stroke-width=".5"/></g><g transform="rotate(-45 32 32)"><path d="M32 3l2.600 5V40h-5.200V8z" fill="url(#riBlade)" stroke="#4d5766" stroke-width=".5"/><path d="M32 8v31" stroke="#667385" stroke-width=".5"/><rect x="24.500" y="40" width="15" height="3.200" rx="1.600" fill="url(#riGold)" stroke="#5a3f08" stroke-width=".5"/><rect x="30.700" y="43" width="2.600" height="9" rx="1" fill="#5b3414"/><circle cx="32" cy="54" r="2.400" fill="url(#riGold)" stroke="#5a3f08" stroke-width=".5"/></g></g><g fill="#ffe27a"><circle cx="14" cy="20" r="1"/><circle cx="51" cy="24" r="1.200"/><circle cx="20" cy="8" r=".8"/><circle cx="47" cy="9" r=".9"/><circle cx="55" cy="40" r=".8"/></g></svg>',
    env: '<svg viewBox="0 0 48 48" width="40" height="40"><defs><linearGradient id="reP" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#d9c9a3"/></linearGradient><radialGradient id="reW" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#f0605a"/><stop offset=".5" stop-color="#b3161c"/><stop offset="1" stop-color="#560a0d"/></radialGradient><filter id="reS" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity=".6"/></filter></defs><g filter="url(#reS)"><rect x="5" y="11" width="38" height="27" rx="2" fill="url(#reP)" stroke="#9d855a" stroke-width=".8"/><path d="M5.500 12.500L24 27 42.500 12.500" fill="none" stroke="#9d855a" stroke-width="1"/><path d="M5.500 37.500L19 24M42.500 37.500L29 24" stroke="#c9b68a" stroke-width=".8"/><path d="M24 22c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z" fill="url(#reW)" stroke="#4a080b" stroke-width=".5"/><circle cx="24" cy="27" r="3" fill="none" stroke="#7b0d12" stroke-width=".8"/><ellipse cx="22" cy="24.600" rx="1.800" ry=".9" fill="#fff" opacity=".4" transform="rotate(-35 22 24.600)"/></g></svg>'
  };
  var ENV = null;
  // ---- elçi hareketleri için sinematik animasyonlar ----
  function fx(kind, a, b, cap) {
    try {
      var old = document.getElementById('fx23'); if (old) old.remove();
      var d = document.createElement('div'); d.id = 'fx23'; d.className = 'fx23 fx-' + kind;
      var pts = '', n = kind === 'incite' ? 18 : 14;
      for (var i = 0; i < n; i++) {
        var ang = Math.random() * 360, r = 70 + Math.random() * 110;
        var dx = kind === 'incite' ? (Math.random() * 2 - 1) * 120 : Math.cos(ang * Math.PI / 180) * r, dy = kind === 'incite' ? -(60 + Math.random() * 170) : Math.sin(ang * Math.PI / 180) * r;
        pts += '<i class="pt" style="--dx:' + dx.toFixed(0) + 'px;--dy:' + dy.toFixed(0) + 'px;animation-delay:' + (0.5 + Math.random() * 0.5).toFixed(2) + 's"></i>';
      }
      d.innerHTML = '<div class="fx-vig"></div><div class="fx-stage"><span class="fx-f l">' + flag(a) + '</span><span class="fx-c"><span class="fx-ring"></span><span class="fx-ring r2"></span>' + ICON[kind] + pts + '</span><span class="fx-f r">' + flag(b) + '</span></div><div class="fx-cap">' + cap + '</div>';
      document.body.appendChild(d); setTimeout(function () { if (d.parentNode) d.remove(); }, 2700);
    } catch (e) { }
  }
  window.v23Fx = function (kind, a, b) { fx(kind, G.pl, a, T('Saldırmazlık Paktı İmzalandı', 'Pact Signed')); };

  function inAct() { return G && G.v5 === 1 && G.ph === 'act' && !G.over && !G.busy; }

  // savaş geçmişi + koruma tetikleyici (render sonrası, her yeni savaş kaydı için bir kez)
  function track() {
    try {
      var L0 = G && G.last; if (!L0 || G.seen23 === L0) return; G.seen23 = L0;
      if (L0.att !== G.pl && L0.e !== G.pl) return;
      var other = L0.att === G.pl ? L0.e : L0.att; G.fought23 = G.fought23 || {}; G.fought23[other] = 1;
      if (L0.ai && L0.e === G.pl && G.guard23) {              // sana saldırıldı: koruyucular saldırgana yönelir
        G.inc23 = G.inc23 || {};
        try { protTrig(L0.att); } catch (x) { }
        for (var pr in G.guard23) if (G.guard23[pr] >= turnNo() && pr !== L0.att && ownN(pr) > 0 && pr !== G.pl) G.inc23[pr + '>' + L0.att] = { until: turnNo() + 2, m: 1.6, add: .7, guard: 1 };
      }
    } catch (x) { }
  }
  var _r1 = render;
  render = function () { var x = _r1.apply(this, arguments); track(); return x; };

  function emodal(h) { modal('<div class="envx">' + h + '</div>'); }
  function head(icon, title, e) { return '<div class="envhd"><span class="envf">' + flag(G.pl) + '</span><span class="envdv">' + (ICON.env) + '</span><span class="envf r">' + flag(e) + '</span></div><h3 class="envt">' + title + '</h3>'; }
  function bal() { return window.Gold ? Gold.get() : 0; }
  function cancelBtn() { return '<button class="big" onclick="closeMod()">' + T('Vazgeç', 'Cancel') + '</button>'; }

  window.v23Envoy = function () {
    if (!inAct() || !G.sel || BSH) return;
    var e = G.owner[G.sel]; if (typeof e !== 'string' || e === G.pl) return;
    var tn = turnNo(); G.envT23 = G.envT23 || {};
    var st0 = G.envT23[e];
    if (!st0 || st0.t !== tn) {                              // bu tur ilk elçi: daha önce savaştıysak reddedilebilir
      var refused = !!(G.fought23 && G.fought23[e]) && Math.random() < 0.5;
      st0 = G.envT23[e] = { t: tn, no: refused ? 1 : 0 }; try { save(); } catch (x) { }
    }
    if (st0.no) {
      modal('<h3>🕊 ' + T('Elçi Reddedildi', 'Envoy Rejected') + '</h3><div style="text-align:center;margin:8px 0">' + flag(e) + '</div><p style="color:var(--tx2)">' +
        T('<b>' + nmE(e) + '</b>, daha önceki savaşlar yüzünden elçini kabul etmedi. Bu tur tekrar deneyemezsin.', '<b>' + nmE(e) + '</b> refused your envoy because of past wars. You cannot retry this turn.') + '</p>' + cancelBtn());
      return;
    }
    ENV = { x: e, y: null };
    var pc = window.v20PactCost ? v20PactCost(e) : 10, pactOn = window.v20Pacted && v20Pacted(G.pl, e);
    modal('<div class="envx">' + head('🕊', T('Elçi', 'Envoy') + ' — ' + nmE(e), e) +
      '<button class="ecard" style="--ec:#4fe0a0;animation-delay:.05s" onclick="v20Pact()"' + (pactOn ? ' disabled' : '') + '><span class="eic">' + ICON.pact + '</span><span class="etx"><b>' + T('Saldırmazlık Paktı', 'Non-Aggression Pact') + '</b><small>' + T('Belirli bir süre birbirinize saldıramazsınız.', 'Neither side can attack for a set time.') + '</small></span><span class="ecost">' + (pactOn ? T('Aktif', 'Active') : WCPay.label()) + '</span></button>' +
      (guardShow(e) ? '<button class="ecard" style="--ec:#4aa3ff;animation-delay:.12s" onclick="v23Guard()"><span class="eic">' + ICON.guard + '</span><span class="etx"><b>' + T('Güvenlik Garantisi', 'Security Guarantee') + '</b><small>' + T('İki güçlü devletin arasında kaldın: sana saldıranlara karşı savaşır.', 'You are caught between two strong states: it fights whoever attacks you.') + '</small></span><span class="ecost">' + WCPay.label() + '</span></button>' : '') +
      '<button class="ecard" style="--ec:#4fb0ff;animation-delay:.15s" onclick="v55GuardJoint()"><span class="eic">' + ICON.guard + '</span><span class="etx"><b>' + T('Koruma Talebi', 'Request Protection') + '</b><small>' + T('Biri sana savaş açarsa ikiniz birlikte savaşa girersiniz.', 'If someone attacks you, you both enter the war together.') + '</small></span><span class="ecost">' + WCPay.label() + '</span></button>' +
      '<button class="ecard" style="--ec:#ff6b5a;animation-delay:.19s" onclick="v23Incite()"><span class="eic">' + ICON.incite + '</span><span class="etx"><b>' + T('Kışkırt', 'Incite') + '</b><small>' + T('İki ülkeyi birbirine düşür (%50 daha olası).', 'Push two states into war (+50% likely).') + '</small></span><span class="ecost">' + WCPay.label() + '</span></button>' +
      '<button class="big" onclick="closeMod()">' + T('Kapat', 'Close') + '</button></div>');
  };
  function payRow(kind, fn) { return WCPay.rows(fn); }   // V119: 2 zar ya da reklam
  function strong(e) {      // koruyucu, ortalama devletten çok zayıf olmamalı
    var al = [], tot = 0, n = 0; for (var k in G.owner) { var o = G.owner[k]; if (al.indexOf(o) < 0) al.push(o); }
    al.forEach(function (o) { if (o === G.pl) return; var s = 0, a = st(o); for (var i = 0; i < 5; i++) s += +a[i] || 0; tot += s; n++; });
    var me = 0, b = st(e); for (var j = 0; j < 5; j++) me += +b[j] || 0; return me >= 0.9 * (tot / Math.max(1, n));
  }
  function guardShow(e) { try { return guardOk(e) && !(G.guard23 && G.guard23[e] >= turnNo()); } catch (x) { return false; } }   // V119: yalnızca kullanılabilirken menüde görünür
  function guardOk(e) { try { return strong(e) && !!(window.V24 && V24.isBuffer(e, G.pl)); } catch (x) { return false; } }
  window.v23Guard = function () {
    if (!inAct() || !ENV) return;
    var e = ENV.x, active = G.guard23 && G.guard23[e] >= turnNo(), ok = guardOk(e);
    emodal(head('🛡', T('Güvenlik Garantisi', 'Security Guarantee'), e) + '<p style="color:var(--tx2)">' +
      T('<b>' + nmE(e) + '</b>, ' + GUARD_TURNS + ' tur boyunca sana saldıran ülkeye karşı savaşır (yalnızca savunma savaşı; senin saldırı savaşlarına girmez). Saldıran ülke sana saldırmadan önce onunla savaşmak zorundadır; onu yenerse sana saldırmak için bir hamle daha harcar.<br>Güçlü bir devlet bu garantiyi yalnızca, onunla başka bir güçlü devlet arasında kaldıysan verir.', 'If you accept, <b>' + nmE(e) + '</b> fights whoever attacks you for ' + GUARD_TURNS + ' turns (defensive wars only, never your attack wars). An attacker must first fight it; if the attacker wins, it needs one more move to attack you.<br>A strong state gives this guarantee only when you are caught between it and another strong state.') + '</p>' +
      (active ? '<p>' + T('Güvenlik garantisi zaten aktif.', 'The guarantee is already active.') + '</p>' :
        ok ? '<div class="pacthint24" style="background:#2a7a4a22;border-color:#2a7a4a88;color:#bff0d2">' + T('İki güçlü devletin arasındasın: bu devlet talebini değerlendirecek.', 'You are caught between two strong states: this nation will consider your request.') + '</div><p>' + WCPay.costLine() + '</p>' + payRow('guard', 'v23GuardPay') :
        '<div class="pacthint24">' + T('İki güçlü devletin arasında değilsin; talep kabul edilmez.', 'You are not caught between two strong states; the request will be refused.') + '</div>') +
      '<button class="big" onclick="v23Envoy()">‹ ' + T('Geri', 'Back') + '</button>');
  };
  window.v23GuardPay = function (how) {
    if (!inAct() || !ENV) return; var e = ENV.x;
    if (!guardOk(e)) { closeMod(); toast('🛡 ' + nmE(e) + ' — ' + T('talebi reddetti: iki güçlü devletin arasında değilsin veya yeterince güçlü değil (ücret alınmadı)', 'declined: you are not caught between two strong states, or it is not strong enough (no charge)')); return; }
    closeMod();
    WCPay.spend(how, function () {
      G.guard23 = G.guard23 || {}; G.guard23[e] = turnNo() + GUARD_TURNS;
      try { save(); } catch (x) { } render(); fx('guard', e, G.pl, T('Güvenlik Garantisi', 'Security Guarantee')); toast('🛡 ' + nmE(e) + ' — ' + T('seni korumayı kabul etti', 'agreed to protect you'));
    });
  };

  // ---- KORUMA TALEBİ (V55): biri sana savaş açarsa talep edilen ülke ile birlikte savaşa girersiniz. Her zaman talep edilebilir. ----
  function protCost(e) { var r = 'neu'; try { r = window.v33Rel ? v33Rel(e) : 'neu'; } catch (x) { } return (r === 'pos' || r === 'ally') ? Math.max(1, Math.round(COST.guard / 2)) : COST.guard; }
  function reach(a, b) { try { var tg = targets(a, G.owner); for (var k in tg) if (G.owner[k] === b) return true; } catch (x) { } return false; }
  function protTrig(att) {                       // sana saldırıldı: korumacılar saldırgana karşı seninle birlikte savaşır
    if (!G.prot55) return; G.inc23 = G.inc23 || {}; var tn = turnNo();
    for (var pr in G.prot55) {
      if (G.prot55[pr] < tn || pr === att || pr === G.pl || ownN(pr) < 1) continue;
      G.inc23[pr + '>' + att] = { until: tn + 3, m: 4, add: 1.5, guard: 1 };
      if (true) { try { toast('🛡 ' + nmE(pr) + ' — ' + T('seninle birlikte ' + nmE(att) + ' ülkesine karşı savaşa girdi', 'joined the war against ' + nmE(att) + ' alongside you')); } catch (x) { } }
    }
  }
  window.v55GuardJoint = function () {
    if (!inAct() || !ENV) return;
    var e = ENV.x, active = G.prot55 && G.prot55[e] >= turnNo(), pc = protCost(e); COST.prot = pc;
    var disc = pc < COST.guard;
    emodal(head('🛡', T('Koruma Talebi', 'Protection Request'), e) + '<p style="color:var(--tx2)">' +
      T('<b>' + nmE(e) + '</b>, ' + PROT_TURNS + ' tur boyunca biri sana savaş açarsa <b>seninle birlikte</b> o ülkeye karşı savaşa girer. Yalnızca savunma savaşına katılır; senin başlattığın saldırı savaşlarına girmez.', 'For ' + PROT_TURNS + ' turns, if anyone attacks you, <b>' + nmE(e) + '</b> enters the war against them <b>together with you</b>. It joins defensive wars only, not attack wars you start.') + '</p>' +
      '<p>' + WCPay.costLine() + '</p>' +
      (active ? '<p>' + T('Koruma zaten aktif.', 'Protection is already active.') + '</p>' : payRow('prot', 'v55GuardJointPay')) +
      '<button class="big" onclick="v23Envoy()">‹ ' + T('Geri', 'Back') + '</button>');
  };
  window.v55GuardJointPay = function (how) {
    if (!inAct() || !ENV) return; var e = ENV.x; closeMod();
    WCPay.spend(how, function () {
      G.prot55 = G.prot55 || {}; G.prot55[e] = turnNo() + PROT_TURNS;
      try { save(); } catch (x) { } render(); fx('guard', e, G.pl, T('Ortak Savunma', 'Joint Defense')); toast('🛡 ' + nmE(e) + ' — ' + T('saldırıya uğrarsan seninle birlikte savaşacak', 'will fight alongside you if you are attacked'));
    });
  };
  window.v23Incite = function () {
    if (!inAct() || !ENV) return; var e = ENV.x, seen = {}, opts = [];
    try { var TG0 = targets(e, G.owner); for (var t in TG0) { var o = G.owner[t]; if (o && o !== e && o !== G.pl && !seen[o]) { seen[o] = 1; opts.push(o); } } } catch (x) { }
    var h = head('🔥', T('Kışkırt', 'Incite'), e) + '<p style="color:var(--tx2)">' + T('<b>' + nmE(e) + '</b> hangi ülkeye karşı kışkırtılsın? Sonraki turda saldırma ihtimali %50 artar.', 'Whom should <b>' + nmE(e) + '</b> be incited against? Its chance to attack them rises by 50% next turn.') + '</p>';
    if (!opts.length) h += '<p>' + T('Bu ülkenin saldırabileceği başka ülke yok.', 'This country has no other state it can attack.') + '</p>';
    else opts.slice(0, 8).forEach(function (o) { h += '<button class="big envopt" onclick="v23Incite2(\'' + o + '\')"><span>' + flag(o) + ' ' + nmE(o).replace(/</g, '&lt;') + '</span></button>'; });
    emodal(h + '<button class="big" onclick="v23Envoy()">‹ ' + T('Geri', 'Back') + '</button>');
  };
  window.v23Incite2 = function (y) {
    if (!inAct() || !ENV) return; ENV.y = y;
    emodal(head('🔥', T('Kışkırt', 'Incite'), ENV.x) + '<p style="color:var(--tx2)">' + nmE(ENV.x) + ' ➜ <b>' + nmE(y) + '</b></p>' + payRow('incite', 'v23InciteGo') + '<button class="big" onclick="v23Incite()">‹ ' + T('Geri', 'Back') + '</button>');
  };
  window.v23InciteGo = function (how) {
    if (!inAct() || !ENV || !ENV.y) return; var x = ENV.x, y = ENV.y; closeMod();
    WCPay.spend(how, function () {
      G.inc23 = G.inc23 || {}; G.inc23[x + '>' + y] = { until: turnNo(), m: 1.5, add: 0 };
      try { save(); } catch (e) { } render(); fx('incite', x, y, T('Kışkırtma Başarılı', 'Incitement Successful')); toast('🔥 ' + nmE(x) + ' ➜ ' + nmE(y) + ' — ' + T('kışkırtıldı', 'incited'));
    });
  };

  // ================= DÜKKAN animasyonları =================
  var SHOP_ID = 0;
  function decorate() {
    try {
      var box = document.getElementById('box'), g = box && box.querySelector('.shgrid:not(.s23)'); if (!g) return;
      g.classList.add('s23'); box.classList.add('shopbox23');
      var packs = g.querySelectorAll('.shpk'), n = packs.length;
      for (var i = 0; i < n; i++) {
        packs[i].style.animationDelay = (0.08 * i + 0.1) + 's';
        if (i === n - 2 && n > 2) packs[i].insertAdjacentHTML('beforeend', '<span class="shrib">🔥 ' + T('POPÜLER', 'POPULAR') + '</span>');
        if (i === n - 1 && n > 1) packs[i].insertAdjacentHTML('beforeend', '<span class="shrib best">💎 ' + T('EN İYİ', 'BEST') + '</span>');
      }
      var b = box.querySelector('.shbal b');
      if (b) { var to = parseInt(b.textContent, 10) || 0, t0 = performance.now(), my = ++SHOP_ID; (function tick(t) { if (my !== SHOP_ID) return; var k = Math.min(1, (t - t0) / 700); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); })(t0); }
      if (!box.querySelector('.coinrain')) {
        var r = '<div class="coinrain" aria-hidden="true">'; for (var c = 0; c < 9; c++) r += '<i style="left:' + (6 + c * 11) + '%;animation-delay:' + (c * 0.37).toFixed(2) + 's;animation-duration:' + (2.6 + (c % 4) * 0.5) + 's">🪙</i>'; box.insertAdjacentHTML('afterbegin', r + '</div>');
      }
    } catch (x) { }
  }
  try {
    var bx = document.getElementById('box');
    if (bx && window.MutationObserver) new MutationObserver(function () { decorate(); }).observe(bx, { childList: true, subtree: true });
    document.addEventListener('click', function (ev) {
      var p = ev.target && ev.target.closest && ev.target.closest('.shpk'); if (!p) return;
      p.classList.remove('shpop'); void p.offsetWidth; p.classList.add('shpop');
    }, true);
  } catch (x) { }

  // ---- kendi ülkende KEŞİF/SALDIRI yok; yalnızca Politikalar ----
  var _pn2 = panel;
  panel = function () {
    var r = _pn2.apply(this, arguments);
    try {
      if (G && G.sel && G.owner && G.owner[G.sel] === G.pl) {
        var el = document.getElementById('panel');
        if (el) el.querySelectorAll('.v15a > button:not(.polbtn), .px > button:not(.polbtn)').forEach(function (b) { b.remove(); });
      }
    } catch (x) { }
    return r;
  };
  // ---- oyuncu ülkesi: koyu kırmızı (fethettikçe sahipliğe göre yayılır) ----
  var RED = '#a01220', _c3 = col;
  col = function (e) {
    try { if (typeof e == 'string' && G && G.v5 === 1 && G.pl === e) return RED; } catch (x) { }
    return _c3.apply(this, arguments);
  };
  try { if (window.G && G.v5 === 1) G.plCol = RED; } catch (x) { }

  // ---- zar düğmesi senkronu ----
  var _r4 = render;
  render = function () { var x = _r4.apply(this, arguments); try { if (window.v5RollResume) v5RollResume(); } catch (e) { } return x; };

  // ---- KALİTELİ ZAR ANİMASYONU: çok eksenli yuvarlanma, sönümlü sekme, gölge senkronu, yere çarpma halkası ve kıvılcım ----
  function tick() { try { AU.play('tick'); } catch (e) { } }
  rollDie = function (id, v, ms, dir, cb) {
    var e = document.getElementById(id); if (!e) { if (cb) cb(); return; }
    var c = e.querySelector('.cb'), sdw = e.querySelector('.sdw'), o = ORI[v]; ms = Math.round(ms * 1.35);
    var a = 2 + Math.floor(Math.random() * 2), b = 2 + Math.floor(Math.random() * 2), z = 1 + Math.floor(Math.random() * 2);
    c.style.transition = 'none'; c.style.transform = oriT(1, 0); void c.offsetWidth;
    c.style.transition = 'transform ' + ms + 'ms cubic-bezier(.1,.75,.2,1)';
    c.style.transform = 'rotateX(' + (o[0] + 360 * a * (Math.random() < .5 ? 1 : -1)) + 'deg) rotateY(' + (o[1] + 360 * b) + 'deg) rotateZ(' + (360 * z) + 'deg)';
    e.classList.add('rolling23');
    var sx = (dir || 1) * (46 + Math.random() * 22), E = 'cubic-bezier(.2,.7,.4,1)', I = 'cubic-bezier(.6,0,.9,.5)';
    e.animate([
      { transform: 'translate(' + sx + 'px,-6px) scale(.9) rotate(' + (dir * 14) + 'deg)', easing: E },
      { transform: 'translate(' + sx * .5 + 'px,-86px) scale(1.28) rotate(' + (-dir * 8) + 'deg)', offset: .26, easing: I },
      { transform: 'translate(' + sx * .1 + 'px,0) scale(1.1,.88)', offset: .48, easing: E },
      { transform: 'translate(0,-34px) scale(1.1)', offset: .62, easing: I },
      { transform: 'translate(0,0) scale(1.07,.92)', offset: .76, easing: E },
      { transform: 'translate(0,-11px) scale(1.03)', offset: .86, easing: I },
      { transform: 'translate(0,0) scale(1.02,.97)', offset: .94, easing: E },
      { transform: 'translate(0,0) scale(1)' }], { duration: ms });
    if (sdw) sdw.animate([{ opacity: .25, transform: 'scale(.55)' }, { opacity: .12, transform: 'scale(.35)', offset: .26 }, { opacity: .8, transform: 'scale(1.1)', offset: .48 }, { opacity: .35, transform: 'scale(.65)', offset: .62 }, { opacity: .8, transform: 'scale(1.05)', offset: .76 }, { opacity: .6, transform: 'scale(.9)', offset: .86 }, { opacity: .7, transform: 'scale(1)' }], { duration: ms });
    [.48, .76, .94].forEach(function (f) { setTimeout(tick, ms * f); });
    setTimeout(function () {
      e.classList.remove('rolling23'); shade(e, v);
      var n = document.getElementById(id + 'n'); if (n) { n.textContent = v; n.className = 'dn on'; }
      try {
        var r = document.createElement('i'); r.className = 'ring23'; e.appendChild(r); setTimeout(function () { r.remove(); }, 800);
        for (var k = 0; k < 8; k++) { var sp = document.createElement('i'), ang = k * 45 + Math.random() * 20; sp.className = 'spk23'; sp.style.setProperty('--dx', Math.cos(ang * Math.PI / 180) * (46 + Math.random() * 14) + 'px'); sp.style.setProperty('--dy', Math.sin(ang * Math.PI / 180) * (34 + Math.random() * 12) + 'px'); e.appendChild(sp); (function (q) { setTimeout(function () { q.remove(); }, 800); })(sp); }
      } catch (x) { }
      if (cb) cb();
    }, ms);
  };

  // ---- "Turu Bitir" düğmesi panel boyutu değişince (keşifle genişleyince) panelin içine girmesin ----
  try {
    var pnl = document.getElementById('panel');
    function reEnd() { try { if (window.v7EndBtn && G) v7EndBtn(); } catch (e) { } }
    if (pnl && window.ResizeObserver) new ResizeObserver(reEnd).observe(pnl);
    new MutationObserver(reEnd).observe(pnl, { attributes: true, attributeFilter: ['style'] });
  } catch (e) { }
  var _r5 = render;
  render = function () { var x = _r5.apply(this, arguments); setTimeout(function () { try { if (window.v7EndBtn && G) v7EndBtn(); } catch (e) { } }, 60); return x; };
})();
