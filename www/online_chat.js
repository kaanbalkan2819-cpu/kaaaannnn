/* ONLINE SOHBET + INFO (V106)
   - Sohbet: küçük 💬 baloncuk; açılan pencere ekranın en fazla %60'ını kaplar (oyun arkada izlenebilir).
   - Info: rakibin sırasında sol altta küçük yazı ("Rakip Ordu Gücü geliştirdi"). Anlaşma/politika ayrıntısı gösterilmez.
   Mesajlar PeerJS bağlantısından {t:'chat'} olarak gider (online.js recv kancası). Tüm kancalar try/catch içindedir. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function $i(id) { return document.getElementById(id); }
  function ON_() { try { return window.WCOnline && WCOnline._state(); } catch (e) { return null; } }
  function live() { var o = ON_(); return !!(o && o.net && window.G && G.mp); }

  var C = { open: false, unread: 0, msgs: [], infoT: 0, infos: [] };

  // ---------- stil ----------
  var css = document.createElement('style');
  css.textContent = '#bs[data-spec="1"] .d3w,#bs[data-spec="1"] .d3{display:none!important}' +
    '#wcchb{position:fixed;left:calc(env(safe-area-inset-left,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 40px);z-index:58;width:42px;height:42px;border-radius:50%;border:1px solid #6b5420;background:rgba(20,14,6,.9);color:#f2c14e;font-size:20px;line-height:40px;text-align:center;cursor:pointer;display:none;-webkit-tap-highlight-color:transparent}' +
    '#wcchb i{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;border-radius:9px;background:#d33;color:#fff;font:700 11px/17px system-ui,sans-serif;font-style:normal;padding:0 4px;display:none}' +
    '#wcchp{position:fixed;left:calc(env(safe-area-inset-left,0px) + 56px);bottom:calc(env(safe-area-inset-bottom,0px) + 44px);z-index:58;max-width:40vw;background:rgba(242,193,78,.95);color:#1a1408;font:600 12px system-ui,sans-serif;padding:6px 10px;border-radius:14px 14px 14px 3px;display:none;pointer-events:none}' +
    '#wccht{position:fixed;left:0;bottom:0;z-index:59;width:min(60vw,420px);max-height:60%;height:60%;display:none;flex-direction:column;background:rgba(26,23,18,.94);border:1px solid #6b5420;border-radius:0 12px 0 0;padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}' +
    '#wccht .h{display:flex;align-items:center;justify-content:space-between;padding:5px 10px;color:#f2c14e;font:700 13px system-ui,sans-serif;border-bottom:1px solid #3a2f14}' +
    '#wccht .h b{cursor:pointer;padding:0 6px;font-size:18px}' +
    '#wccht .l{flex:1;overflow-y:auto;padding:6px 8px;display:flex;flex-direction:column;gap:5px;-webkit-overflow-scrolling:touch}' +
    '#wccht .m{max-width:82%;padding:5px 9px;border-radius:12px;font:13px/1.3 system-ui,sans-serif;word-break:break-word;color:#eee}' +
    '#wccht .m.me{align-self:flex-end;background:#2b6cb0;border-bottom-right-radius:3px}' +
    '#wccht .m.op{align-self:flex-start;background:#4b463c;border-bottom-left-radius:3px}' +
    '#wccht .f{display:flex;gap:6px;padding:6px 8px;border-top:1px solid #3a2f14}' +
    '#wccht input{flex:1;min-width:0;padding:7px 10px;border-radius:16px;border:1px solid #6b5420;background:#1a1408;color:#f2c14e;font-size:16px;outline:none}' +
    '#wccht button{border:0;border-radius:16px;background:#f2c14e;color:#1a1408;font-weight:700;padding:0 14px;font-size:15px}' +
    '#wcinfo{position:fixed;left:calc(env(safe-area-inset-left,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 8px);z-index:57;max-width:46vw;pointer-events:none;display:none;flex-direction:column;gap:2px;font:600 11px system-ui,sans-serif;color:#f2c14e;text-shadow:0 1px 2px #000}' +
    '#wcinfo div{background:rgba(20,14,6,.78);border:1px solid #6b5420;border-radius:8px;padding:2px 8px}';
  document.head.appendChild(css);
  /* V122: sohbet düğmesi alt paneli (#panel) örtmesin — panel açıkken düğme panelin hemen üstüne çıkar */
  function place() {
    try {
      if (document.hidden) return;   /* V134: sekme gizliyken düzen hesabı yapma */
      var hb = $i('wcchb'); if (!hb || hb.style.display === 'none') return;   /* V134: sohbet kapalıyken getComputedStyle/getBoundingClientRect çağrılmaz */
      var p = $i('panel'), b = null;
      if (p && getComputedStyle(p).display !== 'none') { var r = p.getBoundingClientRect(); if (r.height > 0) b = Math.round(window.innerHeight - r.top) + 8; }
      hb.style.bottom = b == null ? '' : b + 'px';
      var pv = $i('wcchp'); if (pv) pv.style.bottom = b == null ? '' : (b + 4) + 'px';
    } catch (e) { }
  }
  setInterval(function () { if (typeof BSH !== 'undefined' && BSH) return; place(); }, 400);

  // ---------- Info (sol alt) ----------
  function info(txt) {
    var b = $i('wcinfo');
    if (!b) { b = document.createElement('div'); b.id = 'wcinfo'; document.body.appendChild(b); }
    C.infos.push(String(txt)); if (C.infos.length > 3) C.infos.shift();
    b.innerHTML = ''; C.infos.forEach(function (t) { var d = document.createElement('div'); d.textContent = 'ℹ ' + t; b.appendChild(d); });
    b.style.display = 'flex';
    clearTimeout(C.infoT); C.infoT = setTimeout(function () { C.infos = []; b.style.display = 'none'; }, 9000);
  }
  // spectator tarafı: gelen anlık görüntüde rakip hangi özelliği artırmış
  function devDiff(oldG, s) {
    try {
      var o = ON_(); if (!o || !oldG || !oldG.mp || !s || !s.mp) return;
      var e = o.side === 'host' ? s.mp.guest : s.mp.host; if (e == null) return;
      var a = oldG.es && oldG.es[e], b = s.es && s.es[e]; if (!a || !b) return;
      var names = (typeof t === 'function' && t('S')) || [], out = [];
      for (var i = 0; i < 5; i++) if (b[i] > a[i] + 1e-6) out.push(names[i] || ('#' + i));
      if (!out.length) return;
      var who = s.mp.coop ? X('Arkadaşın', 'Your friend') : ((window.M && M[e] && M[e].name) || X('Rakip', 'Rival'));
      info(who + ': ' + out.join(', ') + ' ' + X('geliştirdi', 'upgraded'));
    } catch (er) { }
  }

  // ---------- Sohbet ----------
  function ui() {
    var on = live(), hb = $i('wcchb');
    if (!on) { if (hb) hb.style.display = 'none'; var p0 = $i('wccht'); if (p0) p0.style.display = 'none'; C.open = false; return; }
    if (!hb) {
      hb = document.createElement('div'); hb.id = 'wcchb'; hb.innerHTML = '💬<i></i>';
      hb.addEventListener('click', function (ev) { ev.stopPropagation(); toggle(); });
      document.body.appendChild(hb);
      var pv = document.createElement('div'); pv.id = 'wcchp'; document.body.appendChild(pv);
      var pn = document.createElement('div'); pn.id = 'wccht';
      pn.innerHTML = '<div class="h"><span>💬 ' + X('Sohbet', 'Chat') + '</span><b id="wcchx">×</b></div><div class="l" id="wcchl"></div>' +
        '<div class="f"><input id="wcchi" maxlength="200" autocomplete="off" placeholder="' + X('Mesaj yaz…', 'Type…') + '"><button id="wcchs">➤</button></div>';
      document.body.appendChild(pn);
      ['touchstart', 'touchmove', 'pointerdown', 'mousedown', 'wheel', 'click'].forEach(function (n) { pn.addEventListener(n, function (ev) { ev.stopPropagation(); }, { passive: true }); });
      $i('wcchx').addEventListener('click', toggle);
      $i('wcchs').addEventListener('click', send);
      $i('wcchi').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); send(); } });
      C.msgs.forEach(draw);
    }
    hb.style.display = 'block';
  }
  function toggle() {
    C.open = !C.open; var p = $i('wccht'), hb = $i('wcchb'); if (!p) return;
    p.style.display = C.open ? 'flex' : 'none'; hb.style.display = C.open ? 'none' : 'block';
    if (C.open) { C.unread = 0; badge(); var l = $i('wcchl'); l.scrollTop = l.scrollHeight; setTimeout(function () { try { $i('wcchi').focus(); } catch (e) { } }, 50); }
  }
  function badge() { var i = document.querySelector('#wcchb i'); if (!i) return; i.textContent = C.unread; i.style.display = C.unread ? 'block' : 'none'; }
  function draw(m) {
    var l = $i('wcchl'); if (!l) return;
    var d = document.createElement('div'); d.className = 'm ' + (m.me ? 'me' : 'op'); d.textContent = m.x; l.appendChild(d);
    while (l.children.length > 80) l.removeChild(l.firstChild);
    l.scrollTop = l.scrollHeight;
  }
  function add(x, me) {
    var m = { x: x, me: !!me }; C.msgs.push(m); if (C.msgs.length > 80) C.msgs.shift(); draw(m);
    if (!me && !C.open) {
      C.unread++; badge();
      var pv = $i('wcchp'); if (pv) { pv.textContent = x.length > 60 ? x.slice(0, 60) + '…' : x; pv.style.display = 'block'; clearTimeout(C.pt); C.pt = setTimeout(function () { pv.style.display = 'none'; }, 4000); }
    }
  }
  function send() {
    var i = $i('wcchi'), x = ((i && i.value) || '').trim().slice(0, 200); if (!x) return;
    try { WCOnline.sendChat({ t: 'chat', x: x }); add(x, true); i.value = ''; } catch (e) { }
  }
  function onMsg(m) { if (m && typeof m.x === 'string') add(m.x.slice(0, 200), false); ui(); }

  window.WCChat = { onMsg: onMsg, devDiff: devDiff, info: info, _s: C };
  setInterval(function () { try { if (!document.hidden) ui(); } catch (e) { } }, 1000);   /* V134: gizli sekmede çalışmaz */
})();
