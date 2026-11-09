/* V73 — SAVAŞ YORGUNLUĞU: bir turda savaşan devletin değerleri, o turun sonraki savaşlarında düşer.
   Her savaşa giren iki taraf (saldıran + savunan) 1 yorgunluk puanı kazanır; her puan o tur içindeki sonraki savaşlarında 5 değeri de %7 düşürür (en çok 4 puan = %28).
   Tur değişince sıfırlanır (G.fat = {t: tur, s: {ülke: puan}}; kayıtla birlikte saklanır). Kalıcı değerlere dokunmaz: yalnızca o savaşın hesabında uygulanır.
   Hem oyuncu hem yapay zekâ için geçerli. Ayar: FAT_STEP, FAT_MAX. */
(function () {
  'use strict';
  var FAT_STEP = .09, FAT_MAX = 4;
  function T(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function nm(e) { return (M[e] && M[e].name) || e; }
  function tn() { return (G && G.T && G.T.turn) || 0; }
  /* V226: tüm modlarda yeni tur başlayınca (zar yeniden atılınca) herkesin savaş yorgunluğu tamamen sıfırlanır. */
  function decay() {
    var f = G.fat; if (!f) return false;
    var ns = {};
    G.fat = { t: tn(), s: ns }; return true;
  }
  function fd() { if (!G.fat) G.fat = { t: tn(), s: {} }; else if (G.fat.t !== tn()) decay(); return G.fat; }
  function fac(e) { return 1 - FAT_STEP * Math.min(FAT_MAX, fd().s[e] || 0); }
  function mul(a, f) { return a.map(function (v) { return v * f; }); }
  /* V229: keşif raporu yorgunluğu buradan okur */
  window.WCFat = { f: function (e) { try { return fac(e); } catch (x) { return 1; } }, pct: function (e) { try { return Math.round((1 - fac(e)) * 100); } catch (x) { return 0; } } };
  /* V84: İMPARATORLUK YÜKÜ — çok toprağı olan devletin savaş değerleri düşer (kazanan ardı ardına her yeri fethetmesin).
     Her toprak (3'ten sonra) %OVR_STEP, en çok %OVR_MAX. Hem saldıran hem savunan için; kalıcı değere dokunmaz. Ayar: OVR_STEP, OVR_MAX. */
  var OVR_STEP = .02, OVR_MAX = .3;
  function ownN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function ovr(e) { return 1 - Math.min(OVR_MAX, Math.max(0, ownN(e) - 3) * OVR_STEP); }
  /* V97: SAVAŞ YORGUNLUĞU BİLDİRİMİ — düz toast yerine kendi kartı: ikon, başlık, açıklama ve 4 kademelik yorgunluk göstergesi. */
  var pendMsg = null, fatEl = null, fatT = 0;
  function injectCss() {
    if (document.getElementById('wfatcss')) return;
    var st = document.createElement('style'); st.id = 'wfatcss';
    st.textContent = '.wfat{position:fixed;left:50%;top:calc(66px + env(safe-area-inset-top,0px));z-index:31;display:flex;align-items:center;gap:11px;box-sizing:border-box;width:max-content;max-width:min(92vw,340px);padding:10px 15px 10px 11px;border-radius:16px;background:linear-gradient(135deg,rgba(44,24,18,.96),rgba(22,14,30,.96));border:1px solid rgba(255,150,90,.38);box-shadow:0 8px 26px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.35) inset;color:#f4e9dc;pointer-events:none;opacity:0;transform:translate(-50%,-12px) scale(.97);transition:opacity .28s ease,transform .32s cubic-bezier(.2,.8,.2,1)}'
      + '.wfat.on{opacity:1;transform:translate(-50%,0) scale(1)}'
      + '.wfat .wf-i{flex:0 0 38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;background:radial-gradient(circle at 35% 30%,rgba(255,170,100,.35),rgba(255,110,60,.12));border:1px solid rgba(255,150,90,.4)}'
      + '.wfat .wf-b{display:flex;flex-direction:column;gap:3px;min-width:0;text-align:left}'
      + '.wfat .wf-t{font-size:13px;font-weight:800;letter-spacing:.01em;color:#ffb98a;line-height:1.15}'
      + '.wfat .wf-d{font-size:12px;line-height:1.3;color:#e8dccf;opacity:.92}'
      + '.wfat .wf-d b{color:#fff;font-weight:800;white-space:nowrap}'
      + '.wfat .wf-p{display:flex;gap:4px;margin-top:2px}'
      + '.wfat .wf-p i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.14)}'
      + '.wfat .wf-p i.f{background:linear-gradient(90deg,#ffb347,#ff6a3d);box-shadow:0 0 6px rgba(255,120,60,.55)}'
      + 'body.rm .wfat{transition:none}';
    document.head.appendChild(st);
  }
  function showFat(m) {
    try {
      injectCss();
      if (!fatEl) { fatEl = document.createElement('div'); fatEl.className = 'wfat'; fatEl.setAttribute('role', 'status'); document.body.appendChild(fatEl); }
      var pips = ''; for (var i = 0; i < FAT_MAX; i++) pips += '<i' + (i < m.lvl ? ' class="f"' : '') + '></i>';
      fatEl.innerHTML = '<div class="wf-i"><img src="assets/icons/fatigue226.webp" alt="" class="wf-k"></div><div class="wf-b"><div class="wf-t">' + T('Savaş yorgunluğu', 'War fatigue') + (m.lvl >= FAT_MAX ? ' · ' + T('en yüksek', 'max') : '') + '</div>'
        + '<div class="wf-d">' + T('Sonraki savaşlarında değerlerin <b>−%' + m.pct + '</b> (yeni turda sıfırlanır)', 'Your stats are <b>−' + m.pct + '%</b> in further battles (resets next turn)') + '</div><div class="wf-p">' + pips + '</div></div>';
      void fatEl.offsetWidth; fatEl.classList.add('on');
      clearTimeout(fatT); fatT = setTimeout(function () { if (fatEl) fatEl.classList.remove('on'); }, 3600);
    } catch (e) { }
  }
  function showEnd() {   // V110: etki bitince "geçti" bildirimi
    try {
      injectCss();
      if (!fatEl) { fatEl = document.createElement('div'); fatEl.className = 'wfat'; fatEl.setAttribute('role', 'status'); document.body.appendChild(fatEl); }
      fatEl.innerHTML = '<div class="wf-i"><img src="assets/icons/rested229.webp" alt="" class="wf-k"></div><div class="wf-b"><div class="wf-t">' + T('Savaş yorgunluğu geçti', 'War fatigue has passed') + '</div><div class="wf-d">' + T('Değerlerin <b>normale döndü</b>', 'Your stats are <b>back to normal</b>') + '</div></div>';
      void fatEl.offsetWidth; fatEl.classList.add('on');
      clearTimeout(fatT); fatT = setTimeout(function () { if (fatEl) fatEl.classList.remove('on'); }, 3600);
    } catch (e) { }
  }
  function showDrop(lv) {   // V160: yorgunluk 1 seviye düştü ama bitmedi
    try {
      injectCss();
      if (!fatEl) { fatEl = document.createElement('div'); fatEl.className = 'wfat'; fatEl.setAttribute('role', 'status'); document.body.appendChild(fatEl); }
      var pips = ''; for (var i = 0; i < FAT_MAX; i++) pips += '<i' + (i < lv ? ' class="f"' : '') + '></i>';
      fatEl.innerHTML = '<div class="wf-i"><img src="assets/icons/fatigue226.webp" alt="" class="wf-k"></div><div class="wf-b"><div class="wf-t">' + T('Savaş yorgunluğu 1 seviye düştü', 'War fatigue dropped one level') + '</div>'
        + '<div class="wf-d">' + T('Değerlerin hâlâ <b>−%' + Math.round(FAT_STEP * lv * 100) + '</b>', 'Your stats are still <b>−' + Math.round(FAT_STEP * lv * 100) + '%</b>') + '</div><div class="wf-p">' + pips + '</div></div>';
      void fatEl.offsetWidth; fatEl.classList.add('on');
      clearTimeout(fatT); fatT = setTimeout(function () { if (fatEl) fatEl.classList.remove('on'); }, 3600);
    } catch (e) { }
  }
  function checkEnd() {
    try {
      if (!G || G.v5 !== 1 || typeof G.pl !== 'string' || !G.fat || BSH || G.busy) return;
      if (G.fat.t !== tn()) {
        var had = Math.min(FAT_MAX, G.fat.s[G.pl] || 0); decay(); var now = G.fat.s[G.pl] || 0;
        if (had > 0 && now <= 0) setTimeout(showEnd, 500); else if (had > 0) setTimeout(function () { showDrop(now); }, 500);
      }
    } catch (e) { }
  }
  var _rn73 = render;
  render = function () { var r = _rn73.apply(this, arguments); checkEnd(); return r; };
  /* V110: seçilen düşman ülke de yorgunsa panelde gösterilir (yorgunluk herkes için geçerli) */
  var _pn73 = panel;
  panel = function () {
    var r = _pn73.apply(this, arguments);
    try {
      var old = document.getElementById('wfatE'); if (old) old.remove();
      if (!G || G.v5 !== 1 || !G.sel || G.over || BSH || !G.fat) return r;
      fd();   // V160: bayat kayıt varsa önce 1 seviye düşür
      var e = G.owner[G.sel], lv = Math.min(FAT_MAX, (G.fat.s[e] || 0)), el = document.getElementById('panel');
      if (typeof e !== 'string' || e === G.pl || !lv || !el || el.style.display === 'none') return r;
      var d = document.createElement('div'); d.id = 'wfatE'; d.style.cssText = 'margin:6px 0;padding:6px 10px;border:1px solid rgba(255,150,90,.45);border-radius:10px;background:rgba(80,40,20,.35);color:#ffd2b0;font-size:12px';
      d.innerHTML = '<img src="assets/icons/fatigue226.webp" alt="" style="width:22px;height:22px;vertical-align:-6px;margin-right:4px">' + T(nm(e) + ' savaş yorgunu: değerleri <b>−%' + Math.round(FAT_STEP * lv * 100) + '</b> (yeni turda sıfırlanır)', nm(e) + ' is war-weary: stats <b>−' + Math.round(FAT_STEP * lv * 100) + '%</b> (resets next turn)');
      var f = el.firstElementChild; if (f && f.nextSibling) el.insertBefore(d, f.nextSibling); else el.appendChild(d);
    } catch (x) { }
    return r;
  };
  function flushMsg() { if (pendMsg) { var m = pendMsg; pendMsg = null; showFat(m); } }
  function hookClose() {   // V79: yorgunluk bildirimi savaş ekranı kapanınca çıkar
    if (typeof closeBattle !== 'function' || closeBattle.v79) return;
    var _cb = closeBattle;
    closeBattle = function () { var r = _cb.apply(this, arguments); setTimeout(flushMsg, 600); return r; };
    closeBattle.v79 = 1;
  }
  hookClose();
  function install() {
    if (!window.WCD || typeof WCD.war !== 'function' || WCD.war.v73) return !!(window.WCD && WCD.war && WCD.war.v73);
    var _war = WCD.war;
    WCD.war = function (att, de) {
      var r = _war.apply(this, arguments);
      try {
        if (!G || G.v5 !== 1 || typeof G.pl !== 'string') return r;
        var fa = fac(att) * ovr(att), fb = fac(de) * ovr(de);
        if (fa < 1) r.A = mul(r.A, fa);
        if (fb < 1) r.D = mul(r.D, fb);
        var S = fd().s; S[att] = (S[att] || 0) + 1; S[de] = (S[de] || 0) + 1;   // bu savaştan sonra ikisi de yorulur
        var me = att === G.pl ? att : (de === G.pl ? de : null);
        if (me) {
          var f0 = fac(me), pct = Math.round((1 - f0) * 100);
          if (f0 < 1) pendMsg = { pct: pct, lvl: Math.min(FAT_MAX, fd().s[me] || 0) };   // V79: savaştan SONRA gösterilir
        }
      } catch (e) { console.error(e); }
      return r;
    };
    WCD.war.v73 = 1; return true;
  }
  if (!install()) { var n = 0, iv = setInterval(function () { if (install() || ++n > 40) clearInterval(iv); }, 250); }
})();
