/* V135 — SAVAŞ SİSTEMİ SAĞLAMLAŞTIRMA (TEST EDİLMEDİ)
   1) Küçük ülkeler: az topraklı savunan, çok büyük saldırana karşı UNDER_BONUS direniş alır.
   2) Deniz / kara ayrımı: deniz aşırı saldırıda saldıranın Ordu değeri SEA_ARMY ile çarpılır (çıkarma zorluğu); savaş notunda görünür.
   3) Bekleme: savaş ekranındaki zamanlayıcılar ×0.7; "6 geldi → dokun" bekleyişi 0,55 sn sonra otomatik atılır; varsayılan hız 1 → 1,5.
   4) Toprak devri: her savaştan sonra sahiplik tablosu doğrulanır (geçersiz sahip → kendi ülkesine döner).
   5) Ülke yok oluşu: yok olan ülkeye ait paktlar, garantiler, haraç, keşif bilgisi, intikam kayıtları temizlenir.
   6) Ödül/kaynak: Ekonomi 1'in altına inemez; NaN / negatif değerler başlangıç değerine döner.
   7) Tekrar oynama isteği: oyuncu üst üste 2+ savaş kaybederse sonraki savaşlarında değerleri ×1.06 (4+ kayıpta ×1.10); kazanınca sıfırlanır.
   Ayar sabitleri aşağıda. Geri almak için index.html'den v135.js bağlantısını silin. */
(function () {
  'use strict';
  var SEA_ARMY = .95, UNDER_MAX = 2, UNDER_RATIO = 4, UNDER_MIN_ATK = 8, UNDER_BONUS = 1.05, COMEBACK_1 = 1.06, COMEBACK_2 = 1.10;
  var KIND = null, LASTSEEN = null, LONE = null;
  function tr() { return !(typeof L !== 'undefined' && L === 'en'); }
  function X(a, b) { return tr() ? a : b; }
  function cnt(ow, e) { var n = 0; for (var k in ow) if (ow[k] === e) n++; return n; }
  function say(m, d) { try { setTimeout(function () { try { toast(m); } catch (e) { } }, d || 200); } catch (e) { } }
  function is5() { try { return !!G && G.v5 === 1; } catch (e) { return false; } }

  /* ---------- savaş çarpanları (deniz, küçük ülke, toparlanma) ---------- */
  var idCache = {};
  function sameArr(a, b) { if (!a || !b || a.length < 5 || b.length < 5) return false; for (var i = 0; i < 5; i++) if (Math.abs((+a[i] || 0) - (+b[i] || 0)) > 1e-9) return false; return true; }
  function ownerOf(arr) {
    if (arr && arr._e !== undefined && arr._e !== null) return arr._e;   /* V136: v136.js dizileri sahibiyle etiketler */
    var key = arr.join(','); if (idCache[key] !== undefined) return idCache[key];
    var seen = {}, k, e, res = null;
    for (k in G.owner) { e = G.owner[k]; if (seen[e]) continue; seen[e] = 1; try { if (sameArr(st(e), arr)) { res = e; break; } } catch (x) { } }
    if (Object.keys(idCache).length > 400) idCache = {};
    return (idCache[key] = res);
  }
  function scale(a, f, only) {
    var o = a.map(function (v, i) { return (only == null || only === i) ? v * f : v; });
    for (var k in a) if (k.charAt(0) === '_') o[k] = a[k];
    return o;
  }
  if (typeof battle === 'function') {
    var _b = battle;
    battle = function (A, D) {
      var rest = Array.prototype.slice.call(arguments, 2), note = [];
      try {
        if (G && G.owner && A && D && A.length >= 5 && D.length >= 5) {
          // 2) deniz harekâtı
          if (KIND === 'sea') { A = scale(A, SEA_ARMY, 1); note.push('🌊 ' + X('Deniz harekâtı: saldıranın Ordu değeri ×', 'Naval landing: attacker Army ×') + SEA_ARMY.toFixed(2)); }
          // 1) küçük ülke direnişi
          var ea = ownerOf(A), ed = ownerOf(D);
          if (ea !== null && ed !== null && !G.mp) {
            var ca = cnt(G.owner, ea), cd = cnt(G.owner, ed);
            if (cd <= UNDER_MAX && ca >= UNDER_MIN_ATK && ca >= UNDER_RATIO * Math.max(1, cd)) { D = scale(D, UNDER_BONUS); note.push('🛡 ' + X('Küçük ülke direnişi: savunan ×', 'Small-nation resistance: defender ×') + UNDER_BONUS.toFixed(2)); }
          }
          // 7) toparlanma desteği
          var s = (G.l135 || 0);
          if (s >= 2 && !G.mp && is5()) {
            var f = s >= 4 ? COMEBACK_2 : COMEBACK_1;
            if (A._pl) { A = scale(A, f); note.push('💪 ' + X('Toparlanma desteği: değerlerin ×', 'Comeback support: your stats ×') + f.toFixed(2)); }
            else if (D._pl) { D = scale(D, f); note.push('💪 ' + X('Toparlanma desteği: değerlerin ×', 'Comeback support: your stats ×') + f.toFixed(2)); }
          }
        }
      } catch (e) { note = []; }
      var r = _b.apply(this, [A, D].concat(rest));
      try { if (note.length && r) r.adv = note.concat(r.adv || []); } catch (e) { }
      return r;
    };
  }

  /* ---------- 4) sahiplik doğrulama ---------- */
  function sanitize() {
    try { for (var k in G.owner) if (!M[G.owner[k]]) G.owner[k] = k; } catch (e) { }
  }

  /* ---------- 5) yok olan ülkelerin kalıntılarını temizle ---------- */
  var EMP_KEYED = ['es', 'ed', 'done', 'ecol', 'guard23', 'prot55', 'trib57', 'aik', 'pacts', 'rv', 'inc23'];
  function purge() {
    try {
      var alive = {}, k, i;
      for (k in G.owner) alive[G.owner[k]] = 1;
      var dead = function (key) { return String(key).split(/[|>:,]/).some(function (p) { return p !== G.pl && M[p] && !alive[p]; }); };
      var clean = function (o) { if (!o || typeof o !== 'object' || Array.isArray(o)) return; Object.keys(o).forEach(function (kk) { if (dead(kk)) delete o[kk]; }); };
      for (i = 0; i < EMP_KEYED.length; i++) clean(G[EMP_KEYED[i]]);
      if (G.kn && typeof G.kn === 'object' && !Array.isArray(G.kn)) {
        Object.keys(G.kn).forEach(function (o) { if (dead(o)) delete G.kn[o]; else clean(G.kn[o]); });
      }
    } catch (e) { }
  }

  /* ---------- 6) kaynak / değer sağlamlığı ---------- */
  function clampStats() {
    try {
      var seen = {}, k, e;
      for (k in G.owner) {
        e = G.owner[k]; if (seen[e]) continue; seen[e] = 1;
        var base = BASE[e]; if (!base) continue;
        G.es = G.es || {}; G.ed = G.ed || {};
        var s = G.es[e];
        if (s) { for (var i = 0; i < 5; i++) if (!isFinite(s[i]) || s[i] < 0) s[i] = base[i]; }
        var ed = G.ed[e] || 0; if (!isFinite(ed)) ed = G.ed[e] = 0;
        var b2 = (s || base)[2];
        if (b2 + ed < 1) G.ed[e] = 1 - b2;
      }
    } catch (e) { }
  }

  /* ---------- 7) kayıp serisi takibi + sonrası düzenleme ---------- */
  function afterWar() {
    sanitize(); purge(); clampStats();
    try {
      if (!G || !is5() || G.mp) return;
      var Lw = G.last; if (!Lw || Lw === LASTSEEN) return; LASTSEEN = Lw;
      var pw = Lw.att === G.pl, pd = Lw.e === G.pl; if (!pw && !pd) { LONE = null; return; }
      var plWon = pw ? !!Lw.win : !Lw.win;
      LONE = null;
      if (plWon) G.l135 = 0;
      else {
        G.l135 = (G.l135 || 0) + 1;
        if (G.l135 === 2) say(X('💪 Toparlanma desteği: sonraki savaşlarında değerlerin ×1,06. Bir sonraki savaşı kazan!', '💪 Comeback support: your stats ×1.06 in upcoming battles. Win the next one!'), 2200);
      }
    } catch (e) { }
  }

  /* ---------- saldırı girişlerini sar (deniz/kara türü + son kontroller) ---------- */
  if (window.V5 && V5.attack) {
    var _va = V5.attack;
    V5.attack = function (att, tg) {
      var res;
      try { KIND = (targets(att, G.owner) || {})[tg] || null; } catch (e) { KIND = null; }
      try { res = _va.apply(this, arguments); } finally { KIND = null; }
      afterWar(); return res;
    };
  }
  if (typeof doAttack === 'function') {
    var _da = doAttack;
    doAttack = function () {
      try { KIND = G && G.sel ? ((targets(G.pl, G.owner) || {})[G.sel] || null) : null; } catch (e) { KIND = null; }
      try { return _da.apply(this, arguments); } finally { KIND = null; afterWar(); }
    };
  }
  if (typeof closeBattle === 'function') {
    var _cb = closeBattle;
    closeBattle = function () { var r = _cb.apply(this, arguments); afterWar(); return r; };
  }

  /* ---------- 3) bekleme süreleri ---------- */
  try { if (window.SET && SET.spd === 1) SET.spd = 1.5; } catch (e) { }
  var _st = window.setTimeout;
  window.setTimeout = function (f, d) {
    try { if (typeof d === 'number' && d >= 250 && d <= 2500 && typeof BSH !== 'undefined' && BSH && !(window.SET && SET.rm)) d = Math.round(d * .7); } catch (e) { }
    return _st.apply(window, [f, d].concat(Array.prototype.slice.call(arguments, 2)));
  };
  var waitP = 0;
  setInterval(function () {
    try {
      if (waitP || typeof BSH === 'undefined' || !BSH) return;
      var mu = document.getElementById('mu'); if (!mu || !/Dokun|Tap/.test(mu.textContent)) return;
      waitP = 1;
      _st(function () {
        waitP = 0;
        var m2 = document.getElementById('mu'), bs = document.getElementById('bs');
        if (m2 && bs && /Dokun|Tap/.test(m2.textContent)) bs.click();
      }, 550);
    } catch (e) { waitP = 0; }
  }, 300);
})();
