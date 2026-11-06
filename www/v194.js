/* V194 — Resimli madalyonlar: Elçi/Diplomasi menüsü (Haraç, Kışkırt, Paktı Boz, Elçi başlığı) ve Kalkınma kartları (Halk, Silahlanma, Ar-Ge, Ticaret).
   Resimler: assets/art/*.webp. Başka dosyaya dokunmaz; yalnızca açılan menüleri süsler. Geri almak için index.html'den v194.js/v194.css bağlantılarını silin. */
(function () {
  var A = 'assets/art/';
  var ROW = { wcdTribute: 'tribute', v23Incite: 'incite', v138BreakAsk: 'break' };
  var SVG = {};
  var ROW2 = { wcdFriend: 'ally', v138Renew: 'renew', wcdNap: 'pact', v23Guard: 'guard', v55GuardJoint: 'prot', wcdLeave: 'leave' };
  function img(n) { return '<img class="wa" alt="" draggable="false" src="' + A + n + (SVG[n] ? '.svg' : '.webp') + '">'; }
  function deco(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.d38-r').forEach(function (b) {
      var i = b.querySelector('.d38-i'); if (!i || i.getAttribute('data-wa')) return;
      var oc = b.getAttribute('onclick') || '', k = null;
      for (var f in ROW) if (oc.indexOf(f) >= 0) k = ROW[f];
      for (var f2 in ROW2) if (oc.indexOf(f2) >= 0) k = ROW2[f2];
      if (!k) { var tb = b.querySelector('.d38-t b'), tx = tb ? tb.textContent.trim() : '';
        if (/^(İttifakı Yenile|Renew Alliance)$/i.test(tx)) k = 'renew'; else if (/^(İttifak|Alliance)$/i.test(tx)) k = 'ally'; else if (/^(Saldırmazlık|Non-Aggression)$/i.test(tx)) k = 'pact'; }
      if (k) { i.setAttribute('data-wa', k); i.classList.add('wa-s'); i.innerHTML = img(k); }
    });
    root.querySelectorAll('.pcard.d38p .pic').forEach(function (p) {
      if (p.getAttribute('data-wa')) return;
      var c = p.closest('.pcard'), b = c && c.querySelector('.polgo'), oc = b ? (b.getAttribute('onclick') || '') : '', k = null;
      for (var f in ROW) if (oc.indexOf(f) >= 0) k = ROW[f];
      for (var f2 in ROW2) if (oc.indexOf(f2) >= 0) k = ROW2[f2];
      if (!k) { var tb = c && c.querySelector('.ptt b'), tx = tb ? tb.textContent.trim() : '';
        if (/^(İttifakı Yenile|Renew Alliance)$/i.test(tx)) k = 'renew'; else if (/^(İttifak|Alliance)$/i.test(tx)) k = 'ally'; else if (/^(Saldırmazlık|Non-Aggression)$/i.test(tx)) k = 'pact'; }
      if (k) { p.setAttribute('data-wa', k); p.classList.add('wa-s'); p.innerHTML = img(k); }
    });
    root.querySelectorAll('.pcard .pic').forEach(function (p) {
      if (p.getAttribute('data-wa')) return;
      var h = (p.innerHTML || ''), k = null;
      var tt220 = ''; try { tt220 = p.closest('.pcard').querySelector('.ptt b').textContent; } catch (e) { }   /* V220: Silahlanma Programı ayrı görsel; yeni madalyon simgeleri de eşlenir */
      if (/Silahlanma|Armament/i.test(tt220)) k = 'guard'; else if (/pop(218)?.(svg|png)|👥/.test(h)) k = 'city'; else if (/army(218)?.(svg|png)|🎖/.test(h)) k = 'army'; else if (/tech(218)?.(svg|png)|🔬/.test(h)) k = 'tech'; else if (/💼/.test(h)) k = 'trade'; else if (/dip(218)?.(svg|png)|🕊/.test(h)) k = 'dip';
      if (k) { p.setAttribute('data-wa', k); p.classList.add('wa-s'); p.innerHTML = img(k); }
    });
  }
  var t = 0;
  function go() { if (t) return; t = setTimeout(function () { t = 0; try { deco(document.getElementById('mod') || document.body); } catch (e) { } }, 60); }
  new MutationObserver(go).observe(document.body, { childList: true, subtree: true });
  go();

  /* İhanet: müttefike saldırınca çıkan bildirimin yanında madalyon göster */
  (function () {
    var tm = 0;
    function hide() { var o = document.getElementById('wabetray'); if (o) o.remove(); }
    function chk() {
      try {
        var t = document.getElementById('toast'); if (!t) return;
        var on = t.style.display !== 'none' && /^\uD83D\uDDE1/.test((t.textContent || '').trim());
        var o = document.getElementById('wabetray');
        if (on && !o) { document.body.insertAdjacentHTML('beforeend', '<div id="wabetray">' + img('betray') + '</div>'); clearTimeout(tm); tm = setTimeout(hide, 2600); }
        else if (!on && o) hide();
      } catch (e) { }
    }
    var t0 = document.getElementById('toast');
    if (t0) new MutationObserver(chk).observe(t0, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  })();
})();
