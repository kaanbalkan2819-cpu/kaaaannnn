/* V29 — Menü ve arayüz katmanı: oyun içi duraklatma menüsü, parşömen ayarlar, parşömen onay penceresi.
   Mevcut işlevler (save/closeMod/settings/askNew/setLang/menu) aynen çağrılır; yalnızca görünüm ve akış eklenir. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'tr') ? tr : en; }
  var ORN = '<div class="wb-orn"><span></span>❖<span></span></div>';
  var _menu = menu, _set = settings, _ask = askNew;

  // v27'nin sahnesini (başlık + savaş silueti) yeniden kullanır, yalnızca parşömen içeriğini değiştirir
  function frame(cls, html, still, cmp) {
    _menu();
    var b = document.getElementById('box'), p = b.querySelector('.wb-panel'), w = b.querySelector('.wb-wrap');
    if (!p) return null;
    p.className = 'wb-panel ' + (cls || ''); p.innerHTML = html;
    if (w) { w.classList.toggle('cmp', !!cmp); w.classList.toggle('still', !!still); }
    return p;
  }
  function btn(label, fn, cls, sub) {
    return '<button class="wb-b ' + (cls || '') + '" onclick="' + fn + '">' + label + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
  }
  function stat(v, k) { return '<div><b>' + v + '</b><small>' + k + '</small></div>'; }
  function num(v) { v = +v; return isFinite(v) ? v : 0; }

  // ---- Oyun içi duraklatma menüsü ----
  menu = function () {
    if (!G) return _menu();
    var s = '';
    try {
      var turn = (G.T && G.T.turn) || G.turn || 1, tot = R.length;
      if (solo()) {
        s = '<div class="wb-stats">' + stat(turn, X('TUR', 'TURN')) + stat(owned(G.pl != null ? G.pl : 0).length + '<i>/' + tot + '</i>', X('BÖLGE', 'LANDS')) +
          stat(Math.floor(num(G.gold)), X('ALTIN', 'GOLD')) + '</div>';
      } else {
        s = '<div class="wb-stats">' + stat(G.turn || 1, X('TUR', 'TURN')) + stat(owned(0).length, G.P[0].name) + stat(owned(1).length, G.P[1].name) + '</div>';
      }
    } catch (e) { s = ''; }
    try { var tt = document.getElementById('toast'); if (tt) tt.style.display = 'none'; } catch (e) { }   // eski ipucu balonu menünün üstüne binmesin
    frame('wb-pause', '<h3>' + X('DURAKLATILDI', 'PAUSED') + '</h3>' + ORN + s +
      btn(X('Oyuna Dön', 'Resume'), 'closeMod()') +
      btn('<span id="wb29save">' + X('Kaydet', 'Save') + '</span>', 'wb29Save()') +
      btn(t('set'), 'settings()') +
      btn(t('nw'), 'askNew()') +
      btn(t('lg'), 'setLang();menu()', 'sm'));
  };
  window.wb29Save = function () {
    var el = document.getElementById('wb29save'); if (!el) return;
    try { if (G && !G.over) save(); el.textContent = '✔ ' + X('Kaydedildi', 'Saved'); }
    catch (e) { el.textContent = X('Kaydedilemedi', 'Could not save'); }
    setTimeout(function () { var e2 = document.getElementById('wb29save'); if (e2) e2.textContent = X('Kaydet', 'Save'); }, 1600);
  };

  // ---- Parşömen ayarlar ----
  settings = function () {
    var again = !!document.querySelector('#box .wb-set');          // dil değişimi gibi yeniden çizimlerde animasyon tekrarlanmasın
    _set.apply(this, arguments);                                    // içerik (ses, tam ekran, efekt kalitesi...) mevcut katmanlardan gelir
    var box = document.getElementById('box'), nodes = Array.prototype.slice.call(box.childNodes);
    var p = frame('wb-set', '<h3>' + t('set').toUpperCase() + '</h3>' + ORN, again, true);
    if (!p) return;
    var rmLab = t('rm'), first = true;
    nodes.forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'H2') return;
      if (n.nodeType === 1 && n.classList.contains('set')) {
        var sp = n.querySelector('span'), txt = sp ? sp.textContent : '';
        if (first) { p.insertAdjacentHTML('beforeend', '<div class="wb-sec">' + X('Ses', 'Sound') + '</div>'); first = false; }
        if (txt === rmLab) p.insertAdjacentHTML('beforeend', '<div class="wb-sec">' + X('Görünüm ve oynanış', 'Display & gameplay') + '</div>');
      }
      if (n.nodeType === 1 && n.tagName === 'BUTTON' && /closeSet/.test(n.getAttribute('onclick') || '')) {
        n.textContent = '← ' + X('Geri', 'Back'); n.setAttribute('onclick', 'menu()');
      }
      p.appendChild(n);
    });
  };

  // ---- Parşömen onay penceresi (Yeni Oyun) ----
  askNew = function () {
    if (!hasSave()) return _ask();
    frame('wb-ask', '<h3>' + X('ONAY', 'CONFIRM') + '</h3>' + ORN + '<p class="wb-msg">' + t('del') + '</p>' +
      btn(t('yes'), 'modes()') + btn(t('no'), 'menu()', 'sm'));
  };
})();
