/* V238 — Zafer Ekranı yardımcıları: paylaşılabilir zafer kartı (1200x630), zorluk adı, sıradaki hedef.
   Ekranın kendisi v139.js (winHTML); stil v226.css. Kart telefonda @capacitor/share + @capacitor/filesystem ile paylaşılır. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  var DIFF = [['Normal', 'Normal'], ['Zor Mod', 'Hard Mode'], ['Iron Man', 'Iron Man']];
  function diffName(h) { var d = DIFF[h | 0] || DIFF[0]; return X(d[0], d[1]); }
  function load(src) { return new Promise(function (ok) { if (!src) return ok(null); var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function mmss(sec) { sec = Math.max(0, sec | 0); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function name(c) { try { return (window.M && M[c] && M[c].name) || c; } catch (e) { return c; } }
  function fitFont(x, txt, max, px, fam) { do { x.font = '700 ' + px + 'px ' + fam; if (x.measureText(txt).width <= max || px <= 26) break; px -= 3; } while (true); return px; }
  function nextHint(h) {
    h = h | 0;
    return h === 0 ? X('Zor Mod açıldı: rakipler %25 daha güçlü', 'Hard Mode unlocked: rivals are 25% stronger')
      : h === 1 ? X('Iron Man açıldı: rakipler %50 daha güçlü', 'Iron Man unlocked: rivals are 50% stronger')
        : X('En zor modu bitirdin. Bu sefer başka bir ülkeyle dene', 'You beat the hardest mode. Try another country next');
  }
  function sealLine() {
    try { if (window.GS219 && GS219.total && GS219.got) return X('Mühür koleksiyonun: ', 'Seal collection: ') + GS219.got() + ' / ' + GS219.total(); } catch (e) { }
    return '';
  }

  var FAM = 'Georgia,"Times New Roman",serif', LAST = null;
  function draw(m, flagSrc) {
    return Promise.all([load('assets/menu/bg.webp'), load(flagSrc), load('assets/menu/emblem.webp')]).then(function (im) {
      var W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d'), bg = im[0], fl = im[1], em = im[2];
      x.fillStyle = '#100c07'; x.fillRect(0, 0, W, H);
      if (bg) { var k = Math.max(W / bg.width, H / bg.height), bw = bg.width * k, bh = bg.height * k; x.globalAlpha = .55; x.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh); x.globalAlpha = 1; }
      var g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(10,7,3,.72)'); g.addColorStop(1, 'rgba(10,7,3,.88)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#d9b45a'; x.lineWidth = 5; x.strokeRect(22, 22, W - 44, H - 44); x.lineWidth = 1.5; x.strokeRect(36, 36, W - 72, H - 72);

      var fx = 96, fy = 150, fw = 330, fh = 220;
      if (fl) {
        var r = Math.min(fw / fl.width, fh / fl.height) || 1, dw = fl.width * r, dh = fl.height * r;
        if (!isFinite(dw) || !dw) { dw = fw; dh = fh; }
        fx += (fw - dw) / 2; fy += (fh - dh) / 2; x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(fx + 8, fy + 10, dw, dh);
        x.drawImage(fl, fx, fy, dw, dh); x.strokeStyle = '#e8c76c'; x.lineWidth = 4; x.strokeRect(fx, fy, dw, dh);
      }
      var tx = 480, tw = W - tx - 80, win = m.res === 'win';
      x.textBaseline = 'alphabetic'; x.textAlign = 'left';
      x.fillStyle = '#e8c76c'; x.font = '700 30px ' + FAM; x.fillText(win ? X('DÜNYA FETHEDİLDİ', 'WORLD CONQUERED') : X('ÜSTÜNLÜKLE ZAFER', 'VICTORY ON POINTS'), tx, 150);
      var nm = name(m.c); fitFont(x, nm, tw, 92, FAM); x.fillStyle = '#fff6df'; x.fillText(nm, tx, 252);
      var cells = [[String(m.turns), X('TUR', 'TURNS')], [mmss(m.sec), X('SÜRE', 'TIME')], [diffName(m.hard), X('ZORLUK', 'DIFFICULTY')]], cw = (tw - 28) / 3;
      cells.forEach(function (q, i) {
        var bx = tx + i * (cw + 14), by = 292; x.fillStyle = 'rgba(255,235,190,.1)'; x.fillRect(bx, by, cw, 118); x.strokeStyle = 'rgba(232,199,108,.55)'; x.lineWidth = 1.5; x.strokeRect(bx, by, cw, 118);
        x.textAlign = 'center'; x.fillStyle = '#fff6df'; fitFont(x, q[0], cw - 22, 42, FAM); x.fillText(q[0], bx + cw / 2, by + 62);
        x.fillStyle = '#d9c797'; x.font = '700 18px ' + FAM; x.fillText(q[1], bx + cw / 2, by + 96); x.textAlign = 'left';
      });
      x.fillStyle = '#e8c76c'; x.font = '700 30px ' + FAM; x.fillText(X('Skor ', 'Score ') + m.score, tx, 466);
      if (em) x.drawImage(em, 88, 482, 92, 92);
      x.fillStyle = '#fff6df'; x.font = '700 40px ' + FAM; x.fillText('WORLD CONQUEST', 196, 540);
      return c;
    });
  }
  function build() {
    if (!LAST) return Promise.reject(new Error('no card'));
    var im = document.querySelector('#v139over .fg img'), src = im && (im.currentSrc || im.src);
    return draw(LAST, src).then(function (c) { try { c.toDataURL('image/png'); return c; } catch (e) { return draw(LAST, null); } });
  }
  function say(t) { try { toast(t); } catch (e) { } }
  function share() {
    var m = LAST; if (!m) return;
    var txt = X('World Conquest\'te ' + name(m.c) + ' ile ' + m.turns + ' turda dünyayı fethettim! (' + diffName(m.hard) + ')', 'I conquered the world with ' + name(m.c) + ' in ' + m.turns + ' turns in World Conquest! (' + diffName(m.hard) + ')');
    build().then(function (c) {
      var P = window.Capacitor && Capacitor.Plugins;
      if (P && P.Share && P.Filesystem && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
        return P.Filesystem.writeFile({ path: 'zafer-karti.png', data: c.toDataURL('image/png').split(',')[1], directory: 'CACHE' })
          .then(function (r) { return P.Share.share({ title: 'World Conquest', text: txt, files: [r.uri], dialogTitle: X('Zafer Kartını Paylaş', 'Share Victory Card') }); });
      }
      return new Promise(function (ok) { c.toBlob(ok, 'image/png'); }).then(function (b) {
        var f = new File([b], 'zafer-karti.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], text: txt });
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'zafer-karti.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      });
    }).catch(function (e) { if (!/cancel|abort/i.test(String(e && (e.message || e.name)))) say(X('Kart paylaşılamadı', 'Could not share the card')); });
  }
  window.V238 = { set: function (m) { LAST = m; }, diff: diffName, next: nextHint, seals: sealLine, share: share, card: build };
})();
