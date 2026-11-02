/* V21 — Dükkan + Google Play Faturalandırma köprüsü.
   - Altın paketleri PACKS'ten (ürün kimlikleri Play Console'daki "tüketilebilir ürün" kimlikleriyle birebir aynı olmalı).
   - Satın alma yalnızca Capacitor/Cordova içinde `cordova-plugin-purchase` (global CdvPurchase) varsa çalışır; yoksa dükkan açılır ama satın alma yapılmaz.
   - Onaylanan satın alma işlem kimliğiyle (transactionId) TEK kez kuyruğa yazılır, sonra tüketilir; altın oyun açıkken Gold.add ile eklenir.
   - Sahte/ücretsiz altın verme YOK. Sunucu tarafı makbuz doğrulaması yoktur (README_APK.md'ye bakın). */
(function () {
  'use strict';
  var PACKS = [{ id: 'gold_50', gold: 50 }, { id: 'gold_150', gold: 150 }, { id: 'gold_500', gold: 500 }, { id: 'gold_1500', gold: 1500 }];   // <<< AYAR
  var PKEY = 'wc_pending_gold_v1', DKEY = 'wc_iap_done_v1';
  function T(tr, en) { return L == 'tr' ? tr : en; }
  function on() { return !!G && G.v5 === 1 && G.pl && window.Gold; }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function pack(id) { for (var i = 0; i < PACKS.length; i++) if (PACKS[i].id === id) return PACKS[i]; return null; }

  // ---- kuyruk: onaylanan satın alma -> bekleyen altın (işlem kimliğiyle tekilleştirilir) ----
  function grant(tid, gold) {
    var d = jget(DKEY, {}); if (tid && d[tid]) return; if (tid) { d[tid] = 1; jset(DKEY, d); }
    var q = jget(PKEY, []); q.push(gold); jset(PKEY, q); apply();
  }
  function apply() {
    if (!on()) return; var q = jget(PKEY, []), tot = 0; q.forEach(function (n) { tot += Math.floor(+n) || 0; });
    if (!tot) return;
    if (Gold.add(tot, 'iap')) { try { save(); } catch (e) { } jset(PKEY, []); toast('🪙 +' + tot + ' ' + T('Altın eklendi', 'Gold added')); refreshShop(); }
  }

  // ---- Google Play (cordova-plugin-purchase) ----
  var B = { ready: false, tried: false };
  function init() {
    if (B.ready || B.tried) return;
    try {
      var C = window.CdvPurchase; if (!C || !C.store) return; B.tried = true;
      var store = C.store, PL = C.Platform.GOOGLE_PLAY;
      store.register(PACKS.map(function (p) { return { id: p.id, type: C.ProductType.CONSUMABLE, platform: PL }; }));
      store.when().productUpdated(function () { refreshShop(); })
        .approved(function (tr) { try { tr.products.forEach(function (pr) { var p = pack(pr.id); if (p) grant(tr.transactionId, p.gold); }); tr.finish(); } catch (e) { console.error(e); } });
      store.error(function (e) { console.warn('IAP', e); });
      store.initialize([PL]).then(function () { B.ready = true; refreshShop(); });
    } catch (e) { B.tried = false; }
  }
  function priceOf(id) {
    try { var C = window.CdvPurchase, pr = C.store.get(id, C.Platform.GOOGLE_PLAY), o = pr && pr.getOffer(); return o && o.pricing ? o.pricing.price : null; } catch (e) { return null; }
  }
  function buy(id) {
    if (!pack(id)) return;
    init();
    if (!B.ready) { toast(T('Satın alma yalnızca Google Play sürümünde kullanılabilir', 'Purchases are only available in the Google Play version')); return; }
    try {
      var C = window.CdvPurchase, pr = C.store.get(id, C.Platform.GOOGLE_PLAY), o = pr && pr.getOffer();
      if (!o) { toast(T('Ürün şu an yüklenemedi, tekrar dene', 'Product not available, try again')); return; }
      C.store.order(o).then(function (err) { if (err && err.isError && err.code !== C.ErrorCode.PAYMENT_CANCELLED) toast(T('Satın alma başarısız', 'Purchase failed')); });
    } catch (e) { toast(T('Satın alma başlatılamadı', 'Could not start purchase')); }
  }

  // ---- dükkan arayüzü ----
  var open = false;
  function html() {
    var h = '<h3>🛒 ' + T('Dükkan', 'Shop') + '</h3><div class="shbal">🪙 <b>' + (window.Gold ? Gold.get() : 0) + '</b> ' + T('Altın', 'Gold') + '</div><div class="shgrid">';
    PACKS.forEach(function (p) {
      var pr = priceOf(p.id);
      h += '<button class="shpk" onclick="Shop.buy(\'' + p.id + '\')"><span class="shg">🪙 ' + p.gold + '</span><span class="shp">' + (pr || 'Google Play') + '</span></button>';
    });
    h += '</div>';
    if (!B.ready) h += '<p class="shnote">' + T('Satın alma yalnızca Google Play sürümünde çalışır.', 'Purchases only work in the Google Play version.') + '</p>';
    return h + '<button class="big" onclick="closeMod()">' + T('Kapat', 'Close') + '</button>';
  }
  function openShop() {
    if (!on()) { toast(T('Dükkan oyun içinde açılır', 'The shop opens in-game')); return; }
    init(); open = true; modal(html());
  }
  function refreshShop() { try { var m = $('mod'); if (open && m && m.style.display != 'none' && $('box').querySelector('.shgrid')) $('box').innerHTML = html(); } catch (e) { } }
  var _cm = closeMod; closeMod = function () { var r = _cm.apply(this, arguments); open = false; try { if (window.V20 && V20.reTribute) setTimeout(V20.reTribute, 0); } catch (e) { } return r; };
  window.Shop = { open: openShop, buy: buy, packs: PACKS };
  try { if (window.Gold) Gold.shop.packs = PACKS; } catch (e) { }

  // altın göstergesine dokununca dükkan
  document.addEventListener('click', function (e) { var t = e.target; if (t && t.closest && t.closest('#goldchip')) openShop(); });
  // ana menüde Dükkan düğmesi (oyun açıkken)
  var _menu = menu;
  menu = function () {
    _menu.apply(this, arguments);
    try { if (on()) { var b = document.querySelector('#box .mm-btns'); if (b && !b.querySelector('.shopb')) { var g = b.querySelector('.mm-b.ghost'), s = '<button class="mm-b shopb" onclick="Shop.open()">🛒 ' + T('Dükkan', 'Shop') + '</button>'; if (g) g.insertAdjacentHTML('beforebegin', s); else b.insertAdjacentHTML('beforeend', s); } } } catch (e) { }
  };
  var _rd = render; render = function () { var r = _rd.apply(this, arguments); try { apply(); } catch (e) { } return r; };
  document.addEventListener('deviceready', init); window.addEventListener('load', function () { setTimeout(init, 800); });
})();
