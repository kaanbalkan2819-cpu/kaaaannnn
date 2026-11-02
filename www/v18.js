/* V18: ALTIN SİSTEMİ (yalnızca oyun içi, gerçek para/ödeme YOK).
   - Bakiye G.gold içinde, mevcut kayıt sistemiyle (save/cont, G'nin tamamı) saklanır. Negatif olamaz, tam sayıdır.
   - Savaş ödülü: oyuncunun dahil olduğu savaşı KAZANMASI = GOLD_CFG.win; kaybetmek = GOLD_CFG.loss (0). Ödül tek yerden ayarlanır (aşağıda).
   - Ödül, savaş çözümünde (R5.conquer / R5.pickLoss) tam bir kez verilir; kayıt yükleme/yenileme savaşı yeniden işlemez.
   - Gelecek mağaza için API: Gold.get(), Gold.can(n), Gold.add(n, neden), Gold.spend(n, neden) -> true/false, Gold.onChange(fn), Gold.shop (boş kayıt defteri). */
(function () {
  'use strict';
  var GOLD_CFG = { win: 1, loss: 0, ecoK: 0.06, ecoCap: 3 };            // <<< ÖDÜL AYARI: tek yer
  var subs = [], shop = {};
  function on() { return !!G && G.v5 === 1 && G.pl; }
  function fmt(n) { try { return n.toLocaleString(L == 'tr' ? 'tr-TR' : 'en-US'); } catch (e) { return String(n); } }
  function bal() { var g = on() ? Math.floor(+G.gold) : 0; return isFinite(g) && g > 0 ? g : 0; }
  function paint() {
    var el = document.getElementById('goldchip'); if (!on()) { if (el) el.remove(); return; }
    var h = document.getElementById('hud'); if (!h) return;
    if (!el || el.parentNode !== h) { if (el) el.remove(); el = document.createElement('span'); el.id = 'goldchip'; el.className = 'chip'; h.insertBefore(el, h.firstChild); }
    var s = '🪙 <span class="lab">' + (L == 'tr' ? 'Altın' : 'Gold') + ': </span><b>' + fmt(bal()) + '</b>';
    if (el._s !== s) { el._s = s; el.innerHTML = s; }
  }
  function change(d, why) { paint(); subs.forEach(function (f) { try { f(bal(), d, why); } catch (e) { } }); }
  var Gold = {
    CFG: GOLD_CFG, shop: shop,
    get: bal,
    can: function (n) { n = Math.floor(+n); return isFinite(n) && n >= 0 && bal() >= n; },
    add: function (n, why) { n = Math.floor(+n); if (!on() || !isFinite(n) || n <= 0) return false; G.gold = bal() + n; change(n, why || 'add'); return true; },
    spend: function (n, why) { n = Math.floor(+n); if (!on() || !isFinite(n) || n <= 0 || bal() < n) return false; G.gold = bal() - n; change(-n, why || 'spend'); try { save(); } catch (e) { } return true; },
    onChange: function (f) { if (typeof f == 'function') subs.push(f); }
  };
  window.Gold = Gold;

  // ---- savaş ödülü: savaş SONUCU ekranı açılırken (showBattle) savaş başına TEK kez hesaplanır ve eklenir ----
  // Hesap: kazanma = win + (tazminat × ecoK, en çok ecoCap) ; kaybetme = loss. Tazminat (r.rep.amt) savaşın gerçek ekonomi sonucudur.
  // Mükerrer koruma: sonuç nesnesi (r) üzerinde _goldInfo işaretlenir; aynı savaş tekrar işlenirse eski sonuç döner, altın tekrar eklenmez.
  function tr(a, b) { return L == 'tr' ? a : b; }
  function settle(r, p, e) {
    if (!on() || !r) return null;
    if (r._goldInfo) return r._goldInfo;
    var pl = G.pl; if (p !== pl && e !== pl) return null;
    var win = p === pl ? !!r.win : !r.win, n = 0;
    if (win) {
      var amt = r.rep && isFinite(+r.rep.amt) ? Math.max(0, +r.rep.amt) : 0;
      n = GOLD_CFG.win + Math.min(GOLD_CFG.ecoCap, Math.round(amt * GOLD_CFG.ecoK));
    } else n = GOLD_CFG.loss;
    n = Math.max(0, Math.floor(n));
    if (n > 0) Gold.add(n, win ? 'battle-win' : 'battle-loss');
    var info = { gain: n, total: bal(), win: win };
    r._goldInfo = info; G.goldLast = info;
    try { save(); } catch (x) { }
    return info;
  }
  function lineHTML(info) {
    return '<div id="goldline" class="goldline">🪙 <b>+' + fmt(info.gain) + '</b> ' + tr('Altın', 'Gold') + ' · ' + tr('Toplam', 'Total') + ': <b>' + fmt(info.total) + '</b></div>';
  }
  function attach(info) {
    var fn = document.getElementById('fn'); if (!fn || !info) return;
    function put() {
      if (fn.querySelector('#goldline')) return true;
      if (!fn.children.length) return false;
      var d = document.createElement('div'); d.innerHTML = lineHTML(info);
      var btn = fn.querySelector('button.big'); if (btn) fn.insertBefore(d.firstChild, btn); else fn.appendChild(d.firstChild);
      return true;
    }
    if (!put()) { var mo = new MutationObserver(function () { if (put()) mo.disconnect(); }); mo.observe(fn, { childList: true }); }
  }
  var _sb = showBattle;
  showBattle = function (r, p, e, tg, mv, att) {
    var info = null; try { info = settle(r, p, e); } catch (x) { }
    var res = _sb.apply(this, arguments);
    try { attach(info); } catch (x) { }
    return res;
  };
  // fetih sonrası "Savaş Sonucu" kartında da göster
  var _md = modal;
  modal = function (h) {
    try { if (typeof h == 'string' && h.indexOf('class="crh"') >= 0 && on() && G.goldLast && h.indexOf('goldline') < 0) h = h.replace('<div class="crc">', lineHTML(G.goldLast) + '<div class="crc">'); } catch (x) { }
    return _md.call(this, h);
  };
  // ---- gösterge: HUD'ın ilk çipi (mevcut render'dan sonra güncellenir; yeni kontrol kapatmaz) ----
  var _rd = render;
  render = function () { var r = _rd.apply(this, arguments); try { paint(); } catch (e) { } return r; };
  try { if (G) { G.gold = bal(); paint(); } } catch (e) { }
})();
