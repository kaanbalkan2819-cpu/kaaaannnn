/* V124: İLK SAVAŞ KORUMASI. Oyuncunun oyundaki ilk savaşı (saldırı ya da savunma) kaybedilmesi zor olsun diye
   oyuncunun 5 değeri FIRST_BONUS ile çarpılır. Yalnızca tek kişilik oyunda; online/rank'ta yok.
   İlk savaş = G.st[0].w + G.st[0].l == 0 (oyuncunun hiç savaşı yok). Savaş ekranında 'adv' satırı olarak görünür. */
(function () {
  'use strict';
  var FIRST_BONUS = 1.15;
  function en() { try { return typeof L !== 'undefined' && L === 'en'; } catch (e) { return false; } }
  function first() { try { return !!(G && !G.mp && G.st && G.st[0] && (G.st[0].w || 0) + (G.st[0].l || 0) === 0); } catch (e) { return false; } }
  if (typeof battle !== 'function') return;
  var _b = battle;
  battle = function (A, D) {
    var rest = Array.prototype.slice.call(arguments, 2), note = null;
    try {
      if (A && D && first()) {
        var sc = function (a) { var o = a.map(function (v) { return v * FIRST_BONUS; }); for (var k in a) if (k.charAt(0) === '_') o[k] = a[k]; return o; };
        if (A._pl) { A = sc(A); note = 1; } else if (D._pl) { D = sc(D); note = 1; }
      }
    } catch (e) { note = null; }
    var r = _b.apply(this, [A, D].concat(rest));
    try { if (note && r) { r.adv = r.adv || []; r.adv.unshift('🍀 ' + (en() ? 'First-battle support: your stats ×' : 'İlk savaş desteği: değerlerin ×') + FIRST_BONUS.toFixed(2)); } } catch (e) { }
    return r;
  };
})();
