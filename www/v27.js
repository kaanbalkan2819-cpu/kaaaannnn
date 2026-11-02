/* V27 — parşömen ana menü + mod seçimi. Düğmeler mevcut işlevleri (cont/askNew/settings/setLang/closeMod/newGame/menu) aynen çağırır. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'tr') ? tr : en; }
  // Özgün sahne: sis, mızrak ormanı ve miğferli piyade siluetleri
  function scene() {
    var s = '<svg viewBox="0 0 400 320" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">';
    var i, x, h, a;
    for (i = 0; i < 26; i++) { x = 120 + i * 11 + (i % 3) * 3; a = -8 + (i * 7 % 17); h = 150 + (i * 37 % 90);
      s += '<g transform="translate(' + x + ' 320) rotate(' + a + ')" fill="#12160d" opacity="' + (0.45 + (i % 4) * .1) + '"><rect x="-.9" y="-' + h + '" width="1.8" height="' + h + '"/><path d="M0 -' + (h + 16) + ' L4 -' + h + ' L0 -' + (h - 4) + ' L-4 -' + h + 'Z"/></g>'; }
    function man(cx, cy, sc, op) {
      return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + sc + ')" fill="#171b10" opacity="' + op + '">' +
        '<path d="M-46 0 L-40 -70 Q-30 -92 0 -96 Q30 -92 40 -70 L46 0Z"/>' +                      // omuz + zırh
        '<path d="M-17 -98 Q-17 -128 0 -130 Q17 -128 17 -98 Q0 -92 -17 -98Z"/>' +                  // miğfer
        '<rect x="-2" y="-122" width="4" height="22"/>' +                                           // burunluk
        '<rect x="-60" y="-150" width="3.4" height="150"/><path d="M-58 -168 L-53 -150 L-58 -146 L-63 -150Z"/>' + // mızrak
        '<ellipse cx="30" cy="-40" rx="24" ry="32" fill="#22281a"/></g>'; }
    s += man(300, 330, 1.05, .98) + man(215, 322, .8, .9) + man(355, 318, .7, .85) + man(160, 316, .6, .7);
    return s + '</svg>';
  }
  function show(inner, wide) {
    var m = document.getElementById('mod'), b = document.getElementById('box');
    window.__wbOn = true; try { modal('<div></div>'); } finally { window.__wbOn = false; }
    m.classList.add('wbm'); b.classList.remove('mm');
    b.innerHTML = '<div class="wb-scene">' + scene() + '</div><div class="wb-wrap">' +
      '<div class="wb-title"><small>' + X('CİHAN HÂKİMİYETİ', 'DOMINION OF NATIONS') + '</small><b>WORLD</b><i>CONQUEST</i></div>' + inner +
      '<div class="wb-foot">⚜ ' + X('Taht için savaş', 'Fight for the throne') + ' ⚜</div></div>';
    m.style.display = 'flex';
  }
  var ORN = '<div class="wb-orn"><span></span>❖<span></span></div>';
  menu = function () {
    var sv = hasSave();
    show('<div class="wb-panel"><h3>' + X('ANA MENÜ', 'MAIN MENU') + '</h3>' + ORN +
      '<button class="wb-b" ' + (sv ? '' : 'disabled') + ' onclick="cont()">' + t('cont') + '</button>' +
      '<button class="wb-b" onclick="askNew()">' + t('nw') + '</button>' +
      '<button class="wb-b" onclick="settings()">' + t('set') + '</button>' +
      '<button class="wb-b" onclick="setLang()">' + t('lg') + '</button>' +
      (G ? '<button class="wb-b sm" onclick="closeMod()">' + t('cl') + '</button>' : '') + '</div>');
  };
  modes = function () {
    show('<div class="wb-panel"><h3>' + X('MOD SEÇ', 'CHOOSE MODE') + '</h3>' + ORN +
      '<button class="wb-b" onclick="newGame(1)">' + t('m1') + '<small>' + t('m1d') + '</small></button>' +
      '<button class="wb-b sm" onclick="menu()">← ' + X('Geri', 'Back') + '</button></div>');
  };
  // Başka bir pencere açılınca sahne modundan çık
  var _m = modal;
  modal = function (h) { if (!window.__wbOn) { var m = document.getElementById('mod'); if (m) m.classList.remove('wbm'); } return _m.apply(this, arguments); };
})();
