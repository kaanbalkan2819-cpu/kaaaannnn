/* V160 — TUR SONUNDA SEVİYE DÜŞÜŞÜ (TEST EDİLMEDİ; yalnızca node --check)
   Her yeni turda (sen veya YZ turunu bitirince) şunlar 1 seviye düşer:
   - Diplomasi: tüm devletlerle ilişki puanı (G.dip.fr) -1.
   - Keşif: keşfettiğin her ülkenin bilinen değerlerinden biri (rastgele) yeniden gizlenir (G.kn).
   (Savaş yorgunluğu: v73.js, Politika etkisi: v17.js içinde.)
   Ayar: FR_DROP, KN_DROP. Online (G.mp) oyunda devre dışı. Geri almak için index.html'den v160.js bağlantısını silin. */
(function () {
  'use strict';
  var FR_DROP = 1, KN_DROP = 1;
  function X(a, b) { return (typeof L !== 'undefined' && L === 'en') ? b : a; }
  function ok() { try { return !!G && G.v5 === 1 && typeof G.pl === 'string' && !G.mp; } catch (e) { return false; } }
  function step(T) {
    var fr = 0, kn = 0, k, e, a, i, idx, n;
    if (G.d160 === T.turn) return; G.d160 = T.turn;
    if (G.dip && G.dip.fr) for (k in G.dip.fr) { if (G.dip.fr[k] > 0) { G.dip.fr[k] = Math.max(0, G.dip.fr[k] - FR_DROP); fr++; } }
    var K = G.kn && !Array.isArray(G.kn) ? G.kn[G.pl] : null;
    if (K) for (e in K) {
      a = K[e]; if (!a || e === G.pl) continue;
      for (n = 0; n < KN_DROP; n++) {
        idx = []; for (i = 0; i < 5; i++) if (a[i]) idx.push(i);
        if (!idx.length) break;
        a[idx[Math.floor(Math.random() * idx.length)]] = 0; kn++;
      }
    }
    if (fr || kn) setTimeout(function () {
      try { toast('⏳ ' + X('Zaman geçti: ', 'Time passed: ') + (fr ? '🕊 ' + X('ilişkiler −' + FR_DROP, 'relations −' + FR_DROP) : '') + (fr && kn ? ' · ' : '') + (kn ? '🔍 ' + X('keşif bilgisi −' + KN_DROP, 'intel −' + KN_DROP) : '')); } catch (x) { }
    }, 2800);
  }
  function install() {
    if (!window.R5 || typeof R5.startTurn !== 'function') return false;
    if (R5.startTurn.v160) return true;
    var _s = R5.startTurn, w = function (T, roll) {
      var r = _s.apply(this, arguments);
      try { if (ok() && G.T === T && T.turn > 1) step(T); } catch (e) { try { console.error(e); } catch (x) { } }
      return r;
    };
    for (var k in _s) w[k] = _s[k];
    w.v160 = 1; R5.startTurn = w; return true;
  }
  if (!install()) { var n = 0, iv = setInterval(function () { if (install() || ++n > 40) clearInterval(iv); }, 250); }
})();
