/* V119 — Diplomasi ödemesi: her diplomasi hamlesi 2 ZAR (hamle) karşılığıdır.
   Zar yetmiyorsa oyuncu ödüllü reklam videosu izleyerek aynı işlemi yapabilir.
   Kullanım (diğer dosyalardan): WCPay.rows('fnAdi')  -> ödeme düğmeleri; fnAdi('moves'|'ad') çağrılır
                                  WCPay.spend(how, fn)  -> ödemeyi alır/reklamı gösterir, başarılıysa fn() çalışır
   Gerçek reklam: aşağıdaki "REKLAM" bölümüne bakın. SDK yoksa test amaçlı geri sayım ekranı çıkar. */
(function () {
  'use strict';
  var COST = 2;                      // <<< AYAR: diplomasi başına zar (hamle)
  var SIMULATE_WHEN_NO_SDK = true;   // <<< AYAR: gerçek reklam SDK'sı yokken 5 sn'lik test ekranı göster. YAYIN ÖNCESİ false yap!
  var SIM_SECONDS = 5;

  function en() { return typeof L !== 'undefined' && L === 'en'; }
  function T(tr, e) { return en() ? e : tr; }
  function moves() { try { return (G && G.T && +G.T.moves) || 0; } catch (x) { return 0; } }
  function enough() { return moves() >= COST; }
  function say(m) { try { toast(m); } catch (x) { } }

  /* ================= REKLAM ================= */
  // 1) Kendi reklam kodunu bağlamak için:  window.WCAds = { showRewarded: function (cb) { ...; cb(true/false); } }
  // 2) @capacitor-community/admob eklentisi kuruluysa ve window.WC_REWARDED_AD_ID tanımlıysa otomatik kullanılır.
  function realAd(cb) {
    try {
      var A = window.WCAds;
      if (A && typeof A.showRewarded === 'function') { A.showRewarded(function (ok) { cb(!!ok); }); return true; }
      var P = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob, id = window.WC_REWARDED_AD_ID;
      if (P && id && P.prepareRewardVideoAd && P.showRewardVideoAd) {
        var done = false;
        P.prepareRewardVideoAd({ adId: id })
          .then(function () { return P.showRewardVideoAd(); })
          .then(function () { if (!done) { done = true; cb(true); } })
          .catch(function () { if (!done) { done = true; cb(false); } });
        return true;
      }
    } catch (x) { }
    return false;
  }
  function simAd(cb) {
    var o = document.createElement('div'), n = SIM_SECONDS, fin = false;
    o.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font:16px "Segoe UI",system-ui,-apple-system,Roboto,sans-serif;text-align:center;padding:20px';
    o.innerHTML = '<div style="font-size:44px">▶</div><div style="margin:10px 0 2px"><b>' + T('Ödüllü reklam (test)', 'Rewarded ad (test)') + '</b></div>' +
      '<div style="opacity:.7;font-size:13px">' + T('Reklam bitince ödülün verilir', 'You get the reward when the ad ends') + '</div>' +
      '<div class="wcadn" style="font-size:38px;margin:14px 0">' + n + '</div>' +
      '<button type="button" style="padding:8px 18px">' + T('Vazgeç', 'Cancel') + '</button>';
    document.body.appendChild(o);
    var num = o.querySelector('.wcadn'), iv = setInterval(function () {
      n--; if (num) num.textContent = Math.max(0, n);
      if (n <= 0) end(true);
    }, 1000);
    function end(ok) { if (fin) return; fin = true; clearInterval(iv); if (o.parentNode) o.parentNode.removeChild(o); cb(ok); }
    o.querySelector('button').onclick = function () { end(false); };
  }
  function showAd(cb) {
    if (realAd(cb)) return;
    if (SIMULATE_WHEN_NO_SDK) { simAd(cb); return; }
    cb(false);
    say('📺 ' + T('Reklam şu an yüklenemedi, daha sonra tekrar dene', 'Ad could not be loaded, try again later'));
  }

  /* ================= ÖDEME ================= */
  // how: 'moves' → 2 zar harcanır; 'ad' → reklam izlenir. Başarılıysa ok() çalışır.
  function spend(how, ok) {
    if (how === 'ad') {
      showAd(function (watched) {
        if (watched) { try { ok(); } catch (x) { console.error(x); } }
        else say('📺 ' + T('Reklam tamamlanmadı, ödül verilmedi', 'Ad not completed, no reward'));
      });
      return;
    }
    if (!enough()) { say('🎲 ' + T('Yeterli zarın yok (gerekli: ' + COST + ')', 'Not enough dice (need ' + COST + ')')); return; }
    G.T.moves -= COST;
    try { ok(); } catch (x) { console.error(x); }
  }

  /* ================= ARAYÜZ PARÇALARI ================= */
  function label() { return COST + ' 🎲'; }
  function costLine() {
    return T('Bedel: ', 'Cost: ') + '<b>' + COST + ' 🎲</b> · ' + T('Kalan zar: ', 'Dice left: ') + '<b>' + moves() + '</b>';
  }
  function rows(fn) {
    var ok = enough();
    if (ok) return '<button class="big pri" onclick="' + fn + '(\'moves\')">🎲 ' + T(COST + ' zar harca', 'Spend ' + COST + ' dice') + '</button>';
    return '<button class="big" disabled>🎲 ' + T(COST + ' zar harca (zar yetmiyor)', 'Spend ' + COST + ' dice (not enough)') + '</button>' +
      '<button class="big pri" onclick="' + fn + '(\'ad\')">▶ ' + T('Reklam izle ve kullan', 'Watch an ad to use it') + '<small style="display:block;opacity:.75">' + T('Zar yerine kısa bir video', 'A short video instead of dice') + '</small></button>';
  }

  window.WCPay = { COST: COST, moves: moves, enough: enough, spend: spend, rows: rows, label: label, costLine: costLine, showAd: showAd };
})();
