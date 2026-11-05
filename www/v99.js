/* V99 — "ÜLKEM" düğmesi: ekranın üstünde (sol), dokununca kendi ülkenin 5 değerini ve toprak sayısını gösteren kart açar.
   Yalnızca okur; oyun durumuna dokunmaz. Oyuncu ülkesi seçilmeden / ana menüdeyken / ülke seçim ekranında gizlidir. */
(function () {
  'use strict';
  var SI = ['👥', '🎖', '💰', '🔬', '🕊'], btn = null, card = null, open = false;
  function X(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function css() {
    if (document.getElementById('v99css')) return;
    var s = document.createElement('style'); s.id = 'v99css';
    s.textContent = '#v99b{position:fixed;left:calc(10px + env(safe-area-inset-left,0px));top:calc(58px + env(safe-area-inset-top,0px));z-index:12;height:40px;min-width:40px;padding:0 11px 0 6px;display:none;align-items:center;gap:6px;border-radius:12px;background:rgba(26,23,18,.88);border:1px solid rgba(255,255,255,.16);color:#f1e6d3;font:700 12px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.4);cursor:pointer;-webkit-tap-highlight-color:transparent}'
      + '#v99b .fi{height:22px;width:auto;border-radius:3px}#v99b.on{border-color:rgba(245,181,60,.7);background:rgba(40,28,6,.92)}'
      + '#v99c{position:fixed;left:calc(10px + env(safe-area-inset-left,0px));top:calc(104px + env(safe-area-inset-top,0px));z-index:13;width:min(300px,calc(100vw - 20px));box-sizing:border-box;padding:12px 14px 13px;border-radius:16px;background:linear-gradient(160deg,rgba(39,35,27,.97),rgba(24,21,17,.97));border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 34px rgba(0,0,0,.55);color:#f5eee2;opacity:0;transform:translateY(-8px) scale(.98);transform-origin:top left;pointer-events:none;transition:opacity .22s ease,transform .26s cubic-bezier(.2,.8,.2,1)}'
      + '#v99c.on{opacity:1;transform:none;pointer-events:auto}'
      + '#v99c .h{display:flex;align-items:center;gap:10px;margin-bottom:10px}#v99c .h .fi{height:26px;width:auto;border-radius:3px}'
      + '#v99c .h b{font-size:15px;line-height:1.1}#v99c .h small{display:block;font-size:11px;opacity:.7;margin-top:2px;font-weight:600}'
      + '#v99c .x{margin-left:auto;background:none;border:0;color:#fff;opacity:.6;font-size:18px;padding:4px 6px;cursor:pointer}'
      + '#v99c .r{display:grid;grid-template-columns:22px 1fr 38px;align-items:center;gap:8px;margin:7px 0;font-size:12px}'
      + '#v99c .r span:nth-child(2){display:flex;flex-direction:column;gap:3px}#v99c .r em{font-style:normal;opacity:.85;font-weight:600}'
      + '#v99c .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}#v99c .bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#f5b53c,#ff7a3d)}'
      + '#v99c .r b{text-align:right;font-size:13px}'
      + 'body.wcm-on #v99b,body.wcm-on #v99c{display:none!important}';
    document.head.appendChild(s);
  }
  function ok() { try { return !!(window.G && typeof G.pl === 'string' && G.ph !== 'v7pick' && !G.over && typeof st === 'function' && M[G.pl] && !document.body.classList.contains('wcm-on')); } catch (e) { return false; } }
  function render() {
    var id = G.pl, v = st(id), S = (T[L] || T.tr).S, owned = 0, k;
    for (k in G.owner) if (G.owner[k] === id) owned++;
    var h = '<div class="h">' + (typeof fimg === 'function' ? fimg(id) : '') + '<div><b>' + M[id].name + '</b><small>' + X('Senin ülken', 'Your country') + ' · ' + owned + ' ' + X('toprak', 'territories') + '</small></div><button class="x" aria-label="close">✕</button></div>';
    for (var i = 0; i < 5; i++) h += '<div class="r"><span>' + SI[i] + '</span><span><em>' + S[i] + '</em><div class="bar"><i style="width:' + Math.max(3, Math.min(100, v[i])) + '%"></i></div></span><b>' + v1(v[i]) + '</b></div>';
    if (card.__h === h) return;   /* V134: içerik aynıysa DOM yeniden kurulmaz (600 ms yoklamada boşa iş + dokunma kaybı) */
    card.__h = h; card.innerHTML = h;
    card.querySelector('.x').onclick = function (e) { e.stopPropagation(); toggle(false); };
  }
  function toggle(f) {
    open = f === undefined ? !open : f;
    if (open && ok()) render();
    card.classList.toggle('on', open && ok()); btn.classList.toggle('on', open);
  }
  function sync() {
    var show = ok();
    btn.style.display = show ? 'flex' : 'none';
    if (!show) { open = false; card.classList.remove('on'); btn.classList.remove('on'); return; }
    var lab = '<span style="font-size:15px">📊</span>' + X('Ülkem', 'My stats');
    var key = G.pl + '|' + lab;
    if (btn.__k !== key) { btn.__k = key; btn.innerHTML = (typeof fimg === 'function' ? fimg(G.pl) : '') + lab; }
    if (open) render();
  }
  function init() {
    css();
    btn = document.createElement('button'); btn.id = 'v99b'; btn.type = 'button'; btn.setAttribute('aria-label', 'My country stats');
    card = document.createElement('div'); card.id = 'v99c';
    document.body.appendChild(btn); document.body.appendChild(card);
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    document.addEventListener('pointerdown', function (e) { if (open && !card.contains(e.target) && !btn.contains(e.target)) toggle(false); }, true);
    setInterval(function () { if (!document.hidden) sync(); }, 600); sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
