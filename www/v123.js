/* V123 — GÜVENLİK GARANTİSİ ZİNCİRİ.
   Garanti aktifken (G.guard23[garantör] >= tur) bir YZ ülkesi sana saldırmak isterse:
     1) Önce garantör ülkeyle savaşır (o saldırı hamlesi bu savaşa harcanır; savaş ekranında gerçek savaş olarak görünür).
        Garantör ile saldıran birbirine ulaşabiliyorsa gerçek toprak savaşıdır; ulaşamıyorsa toprak değişmeyen zar savaşı yapılır.
     2) Saldıran KAYBEDERSE sana saldıramaz (hamlesi gitti).
     3) Saldıran KAZANIRSA sana saldırmak için TEKRAR 1 hamle harcaması gerekir; o turda hamlesi kalmadıysa saldırı olmaz.
   Yalnızca tek kişilik (G.mp yok) ve yalnızca sana yönelik YZ saldırılarında çalışır. Garanti süresi (GUARD_TURNS) v23.js'te. */
(function () {
  'use strict';
  var BUSY = null;   // { att, g, tg, fighter } — garantör savaşı ekrandayken

  function tn() { return (G && G.T && G.T.turn) || 0; }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function nm(e) { return (window.M && M[e] && M[e].name) || e; }
  function T(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function say(m) { try { toast(m); } catch (x) { } }

  function guarantorOf(att) {
    if (!G || G.mp || !G.guard23) return null;
    for (var g in G.guard23) {
      if (G.guard23[g] >= tn() && g !== att && g !== G.pl && ownedN(g) > 0) return g;
    }
    return null;
  }

  // saldıran ↔ garantör arasında gerçek savaş yapılabilecek toprak (önce kara, sonra deniz; önce saldıranın saldırısı)
  function pickFight(att, g) {
    var pairs = [[att, g], [g, att]], i, k, sea = null;
    for (i = 0; i < 2; i++) {
      var a = pairs[i][0], d = pairs[i][1], Ta = targets(a, G.owner);
      for (k in Ta) {
        if (G.owner[k] !== d) continue;
        if (Ta[k] === 'land') return { a: a, tg: k };
        if (!sea) sea = { a: a, tg: k };
      }
      if (sea && i === 0) return sea;
    }
    return sea;
  }

  function simulate(att, g) {   // toprak değişmeyen zar savaşı; true = saldıran kazandı
    var WS = window.WCD && WCD.war ? WCD.war(att, g) : null, A = WS ? WS.A : st(att), D = WS ? WS.D : st(g);
    return !!battle(A, D, d6b(), d6b(), false, false).win;
  }

  function install() {
    if (!window.V5 || !window.V20 || typeof V5.attack !== 'function' || typeof V20.after !== 'function' || typeof V20.seq !== 'function') return false;
    if (V5.attack.__g123) return true;
    var _atk = V5.attack, _after = V20.after;

    V5.attack = function (att, tg, isAI) {
      try {
        if (isAI && !BUSY && G && G.ph === 'v5ai' && !G.busy && G.owner[tg] === G.pl && att !== G.pl && V20.seq()) {
          var g = guarantorOf(att);
          if (g) {
            var S = V20.seq();
            say('🛡 ' + nm(g) + ' — ' + T('güvenlik garantisi: ' + nm(att) + ' önce onunla savaşmak zorunda', 'security guarantee: ' + nm(att) + ' must fight it first'));
            var f = pickFight(att, g);
            if (f) {
              BUSY = { att: att, g: g, tg: tg, fighter: f.a };
              if (_atk.call(this, f.a, f.tg, true)) return true;
              BUSY = null;   // savaş başlatılamadı → normal akış
            } else if (S) {
              var won = simulate(att, g);
              if (!won) { say('🛡 ' + nm(g) + ' ' + T('saldırganı püskürttü', 'repelled the aggressor') + ' (' + nm(att) + ')'); return false; }
              if (S.left <= 0) { say('🛡 ' + nm(att) + ' ' + T('garantörü yendi ama sana saldıracak hamlesi kalmadı', 'beat the guarantor but has no move left to attack you')); return false; }
              S.left--;
              say('⚔ ' + nm(att) + ' ' + T('garantörü yendi — ek hamleyle sana saldırıyor', 'beat the guarantor — attacks you with an extra move'));
              return _atk.call(this, att, tg, true);
            }
          }
        }
      } catch (x) { BUSY = null; }
      return _atk.apply(this, arguments);
    };
    V5.attack.__g123 = 1;

    V20.after = function () {
      if (!BUSY) return _after.apply(this, arguments);
      var b = BUSY; BUSY = null;
      try {
        var S = V20.seq(), L0 = G && G.last;
        if (!S || !L0 || G.over || ownedN(S.ai) === 0) return _after.apply(this, arguments);
        var won = L0.att === b.att ? !!L0.win : !L0.win;
        if (ownedN(b.att) === 0) won = false;
        if (!won) { say('🛡 ' + nm(b.g) + ' ' + T('saldırganı durdurdu', 'stopped the aggressor') + ' (' + nm(b.att) + ')'); return _after.apply(this, arguments); }
        var ok = targets(b.att, G.owner)[b.tg] && G.owner[b.tg] === G.pl;
        if (!ok) return _after.apply(this, arguments);
        if (S.left <= 0) { say('🛡 ' + nm(b.att) + ' ' + T('garantörü yendi ama sana saldıracak hamlesi kalmadı', 'beat the guarantor but has no move left to attack you')); return _after.apply(this, arguments); }
        S.left--;   // sana saldırmak için ek hamle
        G.ph = 'v5ai'; G.aiBusy = 1;
        say('⚔ ' + nm(b.att) + ' ' + T('garantörü yendi — ek hamleyle sana saldırıyor', 'beat the guarantor — attacks you with an extra move'));
        setTimeout(function () {
          try {
            if (!window.V5 || !G || G.ph !== 'v5ai' || G.over) return;
            if (!_atk.call(V5, b.att, b.tg, true) && !_after.call(V20)) V5.start();
          } catch (x) { try { if (!_after.call(V20)) V5.start(); } catch (y) { } }
        }, 700);
        return true;
      } catch (x) { return _after.apply(this, arguments); }
    };
    return true;
  }

  install();
  window.addEventListener('load', install);
  var n = 0, iv = setInterval(function () { if (install() || ++n > 40) clearInterval(iv); }, 250);
  window.V123 = { guarantorOf: guarantorOf };
})();
