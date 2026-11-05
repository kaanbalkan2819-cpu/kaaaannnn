/* V198 — Ekrandaki emojileri net simgelerle değiştirir:
   🎲 -> siyah-beyaz zar (CSS) ; 🕊 -> dip, ⚔ -> army, 🏗 -> city, 🛡 -> guard madalyonları (assets/art). Telefonun yazı tipinde bu eski emojiler "bit bit" (piksel) çiziliyordu.
   Hariç: .pic (madalyon zaten v194 ile takılıyor) ve #toast (🗡 ihanet bildirimi metne bakıyor). Geri almak için index.html'den v198.js bağlantısını silin. */
(function () {
  var MAP = { '\uD83C\uDFB2': 'die', '\uD83D\uDD4A': 'dip', '\u2694': 'army', '\uD83C\uDFD7': 'city', '\uD83D\uDEE1': 'guard' };
  var RE = /(\uD83C\uDFB2|\uD83D\uDD4A|\u2694|\uD83C\uDFD7|\uD83D\uDEE1)\uFE0F?/g, TEST = /\uD83C\uDFB2|\uD83D\uDD4A|\u2694|\uD83C\uDFD7|\uD83D\uDEE1/;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1, TITLE: 1, NOSCRIPT: 1 };
  function skipEl(el) { try { return !el || SKIP[el.tagName] || (el.closest && el.closest('.pic,#toast')); } catch (e) { return false; } }
  function fix(node) {
    if (!node) return;
    if (node.nodeType === 3) { one(node); return; }
    if (node.nodeType !== 1 || skipEl(node)) return;
    if (!TEST.test(node.textContent || '')) return;
    var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) { if (TEST.test(n.nodeValue) && !skipEl(n.parentNode)) list.push(n); }
    list.forEach(one);
  }
  function one(t) {
    var v = t.nodeValue; if (!TEST.test(v) || !t.parentNode || skipEl(t.parentNode)) return;
    var f = document.createDocumentFragment(), last = 0, m; RE.lastIndex = 0;
    while ((m = RE.exec(v))) {
      if (m.index > last) f.appendChild(document.createTextNode(v.slice(last, m.index)));
      var k = MAP[m[1]], s = document.createElement('i');
      s.className = k === 'die' ? 'wdi' : 'wdm ' + k; s.setAttribute('role', 'img'); f.appendChild(s);
      last = m.index + m[0].length;
    }
    if (last < v.length) f.appendChild(document.createTextNode(v.slice(last)));
    t.parentNode.replaceChild(f, t);
  }
  var q = [], tm = 0;
  function flush() { tm = 0; var a = q; q = []; try { a.forEach(fix); } catch (e) { } }
  function push(n) { q.push(n); if (!tm) tm = setTimeout(flush, 30); }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'characterData') push(m.target);
      else m.addedNodes.forEach(function (n) { if (n.nodeType === 1 || n.nodeType === 3) push(n); });
    });
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  push(document.body || document.documentElement);
})();
