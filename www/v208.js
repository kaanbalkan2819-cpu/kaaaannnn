/* V208 — SAVAŞ PANELİ: bayrakların arasındaki eski SVG kılıçlar yerine Rönesans kılıç çarpışması (wc_sword_clash.js, Canvas 2D).
   showBattle sarılır: özgün işlev çalışır, sonra #sx içine canvas kılıçlar bağlanır. Oyun mantığı/zamanlaması DEĞİŞMEZ
   (v7.js 'sx go' ve 'sx go hit' zamanlayıcıları ve 'click' sesi aynen kalır). Modül yüklenemezse eski kılıçlar görünür kalır. */
(function () {
  'use strict';
  if (typeof showBattle !== 'function' || !window.WCSwordClash) return;
  var prev = null, orig = showBattle;
  showBattle = function () {
    var r = orig.apply(this, arguments);
    try {
      if (prev) { prev.destroy(); prev = null; }
      var sx = document.getElementById('sx');
      if (!sx || sx.className.indexOf('go') < 0) return r;      // animasyonsuz (hızlı/azaltılmış hareket) mod: dokunma
      var S = window.SET || {}, sp = Math.min(S.spd || 1, 1.5);
      var vol = (S.vol == null ? .8 : S.vol) * (S.sfx == null ? .9 : S.sfx) * .35;
      sx.classList.add('wcsc');
      prev = WCSwordClash.mount(sx, {
        width: 220, height: 150, scale: .62, originY: .38, intensity: 1,
        quality: (navigator.hardwareConcurrency || 4) <= 4 ? 'low' : 'high',
        timeScale: sp, holdFinal: true, sound: !!S.sfxOn, volume: vol,
        attacker: '#3b82f6', defender: '#ef4444'
      });
      prev.playOnce();
    } catch (e) { try { var s2 = document.getElementById('sx'); if (s2) s2.classList.remove('wcsc'); } catch (x) { } }
    return r;
  };
})();
