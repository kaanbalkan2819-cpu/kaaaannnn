/* ONLINE İZLEME (V104): sırası olmayan oyuncu, sıradaki oyuncunun ekranını "telefonuna bakıyormuş gibi" izler.
   Sırası gelen cihaz: açık pencere (zar atışı, savaş sonucu), savaş ekranı (#bs), ülke paneli (#panel), YZ hamle kartı,
   kamera hedefi ve bildirimleri 'ev' mesajlarıyla gönderir. İzleyen cihaz bunları KORUMALI (dokunulamaz) olarak gösterir.
   Bayrak resimleri (base64) bir kez gönderilir, sonra kısa anahtarla anılır. Tüm kancalar try/catch içindedir. */
(function () {
  'use strict';
  var S = { mod: false, card: false, pn: null, bs: false }, U = {}, SENT = {}, TM = {}, LAST = {}, camKey = '';
  function ON_() { try { return window.WCOnline && WCOnline._state(); } catch (e) { return null; } }
  function net() { var o = ON_(); return (o && o.net && window.G && G.mp) ? o : null; }
  function active() { var o = net(); return !!(o && G.mp.act === o.side && !G.over); }
  function spectating() { var o = net(); return !!(o && G.mp.act !== o.side && !G.over); }
  function send(m) { try { var o = net(); if (o && active()) { m.t = 'ev'; o.net.send(m); } } catch (e) { } }
  function $i(id) { return document.getElementById(id); }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length.toString(36); }

  // ---- gönderen: büyük base64 resimleri kısa anahtara çevir ----
  var REV = null;
  function rev() { if (REV) return REV; REV = {}; try { var F = window.FLAGSVG || {}; for (var c in F) REV[F[c]] = c; } catch (e) { } return REV; }
  function pack(html, out) {
    return String(html || '').replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+\/=]+/gi, function (u) {
      var fc = rev()[u]; if (fc) return '@@F:' + fc + '@@';   // bayrak: kod gider, resim izleyen cihazdaki flags.js'den gelir
      var k = hash(u); if (!SENT[k]) { SENT[k] = 1; (out.u = out.u || {})[k] = u; } return '@@' + k + '@@';
    });
  }
  function unpack(html) {
    return String(html || '').replace(/@@F:([A-Za-z0-9_-]+)@@/g, function (a, c) { return (window.FLAGSVG && FLAGSVG[c]) || ('flags/' + c + '.svg'); })
      .replace(/@@([a-z0-9]+)@@/g, function (a, k) { return U[k] || ''; })
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '');   // izleyen cihazda hiçbir düğme çalışmasın
  }

  // ---- gönderen: DOM gözlemcileri (kısa gecikmeli, değişmeyeni göndermez) ----
  function watch(id, build) {
    var el = $i(id); if (!el || !window.MutationObserver) return;
    function flush() {
      TM[id] = 0;
      try { if (!active()) return; var m = build(el), j = JSON.stringify(m); if (j === LAST[id]) return; LAST[id] = j; send(m); } catch (e) { }
    }
    new MutationObserver(function () { if (!TM[id]) TM[id] = setTimeout(flush, 380); })
      .observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
  }
  function init() {
    // V107: pencereler ve ülke paneli yansıtılmaz (rakibin anlaşma/politikaları görünmez)
    watch('bs', function (el) {   // 3B zarlar (sürekli değişen) yansıtılmaz: hem lag hem boş küp sorunu
      var cl = el.cloneNode(true); [].forEach.call(cl.querySelectorAll('.d3w,.d3'), function (n) { n.remove(); });
      var m = { k: 'bs', d: el.style.display, c: el.className }; m.h = pack(cl.innerHTML, m); return m;
    });
    // YZ hamle kartı (#ai20) body'ye eklenir/çıkarılır
    if (window.MutationObserver) new MutationObserver(function (ms) {
      try {
        if (!active()) return;
        ms.forEach(function (r) {
          [].forEach.call(r.addedNodes || [], function (n) { if (n.id === 'ai20' && /\batk\b/.test(n.className || '')) { var m = { k: 'card' }; m.h = pack(n.outerHTML, m); send(m); } });
          [].forEach.call(r.removedNodes || [], function (n) { if (n.id === 'ai20') send({ k: 'cardx' }); });
        });
      } catch (e) { }
    }).observe(document.body, { childList: true });
    // kamera: seçili / savaşılan ülke (sıradaki oyuncu için) 
    setInterval(function () {
      try {
        if (!active()) return;
        var r = (window.BT && BT.d) || G.sel; if (!r || !G.owner) return;
        var o = G.owner[r] || r; if (o === camKey) return; camKey = o; send({ k: 'cam', id: o });
      } catch (e) { }
    }, 400);
    if (window.v24CamTo) { var _c = window.v24CamTo; window.v24CamTo = function (a) { try { if (active() && a) { camKey = a; send({ k: 'cam', id: a }); } } catch (e) { } return _c.apply(this, arguments); }; }
    var _t = toast; toast = function (m) { var r = _t.apply(this, arguments); try { if (active() && /^\s*⚔/.test(String(m))) send({ k: 'toast', m: String(m) }); } catch (e) { } return r; };
  }

  // ---- izleyen: gelen görüntüyü uygula ----
  function applyPanel() {
    var p = $i('panel'); if (!p || !S.pn) return;
    p.style.display = S.pn.d; p.className = S.pn.c || ''; if (p.innerHTML !== S.pn.h) p.innerHTML = S.pn.h; p.style.pointerEvents = 'none';
  }
  function onEv(m) {
    try {
      if (!spectating() || !m) return;
      if (m.u) for (var k in m.u) U[k] = m.u[k];
      if (m.k === 'mod' || m.k === 'pn') { return; }
      if (m.k === 'mod') {
        var mod = $i('mod'), box = $i('box');
        if (m.d === 'none') { S.mod = false; mod.style.pointerEvents = ''; mod.style.display = 'none'; return; }
        S.mod = true; box.onclick = null; box.innerHTML = unpack(m.h); mod.style.pointerEvents = 'none'; mod.style.display = m.d || 'flex';
      } else if (m.k === 'bs') {
        var bs = $i('bs'); S.bs = m.d !== 'none'; bs.className = m.c || ''; bs.setAttribute('data-spec', '1'); bs.innerHTML = unpack(m.h); bs.style.display = m.d; bs.style.pointerEvents = S.bs ? 'none' : '';
      } else if (m.k === 'pn') {
        S.pn = { d: m.d, c: m.c, h: unpack(m.h) }; applyPanel();
      } else if (m.k === 'card') {
        var o = $i('ai20'); if (o) o.remove(); var w = document.createElement('div'); w.innerHTML = unpack(m.h); var c = w.firstChild;
        if (c) { c.style.pointerEvents = 'none'; document.body.appendChild(c); S.card = true; }
      } else if (m.k === 'cardx') { var o2 = $i('ai20'); if (o2) o2.remove(); S.card = false; }
      else if (m.k === 'cam') { var nw = Date.now(); if (window.v24CamTo && nw - (S.camAt || 0) > 1500) { S.camAt = nw; v24CamTo(m.id); } }
      else if (m.k === 'toast') { toast('👁 ' + m.m); }
    } catch (e) { }
  }

  // ---- izleyen: sıra bana geçince / yerel çağrılarda izleme kalıntılarını temizle ----
  function cleanup() {
    if (!S.mod && !S.card && !S.pn && !S.bs) return;
    var mod = $i('mod'); if (S.mod && mod) { mod.style.pointerEvents = ''; mod.style.display = 'none'; }
    var o = $i('ai20'); if (S.card && o) o.remove();
    var bs = $i('bs'); if (S.bs && bs) { bs.style.display = 'none'; bs.style.pointerEvents = ''; bs.innerHTML = ''; }
    var p = $i('panel'); if (p) { p.style.pointerEvents = ''; if (S.pn) { p.style.display = 'none'; p.innerHTML = ''; } }
    S.mod = S.card = S.bs = false; S.pn = null;
  }
  function hook() {
    var _cm = closeMod; closeMod = function () { if (S.mod && spectating()) return; return _cm.apply(this, arguments); };   // anlık görüntü geldikçe izlenen pencere kapanmasın
    var _rd = render; render = function () { var x = _rd.apply(this, arguments); try { if (spectating()) applyPanel(); else cleanup(); } catch (e) { } return x; };
    if (typeof panel === 'function') { var _pn = panel; panel = function () { var x = _pn.apply(this, arguments); try { if (spectating()) applyPanel(); } catch (e) { } return x; }; }
  }
  window.WCSpec = { onEv: onEv, _s: S };
  try { init(); hook(); } catch (e) { console.error('WCSpec', e); }
})();
