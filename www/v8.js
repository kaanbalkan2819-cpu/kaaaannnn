/* V8: ek %10 bonus ekranı, tam ekran ayarı, ülke adları + tarihçe (i18n), canvas bayrak katmanı + akıcı kamera.
   Önceki katmanlara (app/v5/v6/v7) bağlanır; ilgili global fonksiyonları sarar. */
(function () {
  'use strict';
  function X(tr, en) { return L == 'tr' ? tr : en; }
  function is5() { return !!G && G.v5 === 1; }
  var SI = ['👥', '🎖', '💰', '🔬', '🕊'];
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  // =================== EK %10 BONUS EKRANI ===================
  var bSel = -1;
  window.v8Bonus = function () {
    if (!is5() || G.ph != 'v8bonus' || !G.bpend) return;
    bSel = -1;
    var me = st(G.pl), h = '<div class="cr"><div class="crh">🎁 ' + X('EK BONUS', 'EXTRA BONUS') + '</div><div class="crt">+%10</div>' +
      '<div class="crc">' + X('Beş özelliğin de fethettiğin devletten yüksekti. Hangi özelliğin %10 artacağını SEN seç. Hesap: mevcut değer × 1,10 (1 ondalığa yuvarlanır). Bu hak yalnızca bu fetih için, bir kez kullanılır.',
        'All five of your stats beat the conquered state. YOU choose which stat rises by 10%. Formula: current value × 1.10 (rounded to 1 decimal). This right is single-use and only for this conquest.') + '</div><div class="cards">';
    for (var i = 0; i < 5; i++) {
      var nv = R5.bonusValue(me[i]);
      h += '<button class="cd" id="bn' + i + '" onclick="v8BonusSel(' + i + ')"><span class="ci">' + SI[i] + '</span><span class="cn">' + t('S')[i] + '</span>' +
        '<span class="cv"><i>' + X('Şimdi', 'Now') + '</i><b>' + v1(me[i]) + '</b></span><span class="cv"><i>× 1,10</i><b></b></span>' +
        '<span class="cv af"><i>' + X('Sonra', 'After') + '</i><b>' + v1(nv) + '</b></span><span class="dl up">▲ +' + v1(nv - me[i]) + '</span></button>';
    }
    modal(h + '</div><button class="big pri" id="bnok" disabled onclick="v8BonusOk()">' + X('Bonusu Uygula', 'Apply Bonus') + '</button></div>');
    $('box').classList.add('crbox');
  };
  window.v8BonusSel = function (i) {
    if (!G || G.ph != 'v8bonus') return; bSel = i;
    for (var k = 0; k < 5; k++) { var c = $('bn' + k); if (c) c.classList.toggle('on', k == i); }
    $('bnok').disabled = false; AU.play('click');
  };
  window.v8BonusOk = function () {
    if (bSel < 0 || !G || G.ph != 'v8bonus') return;
    var i = bSel; bSel = -1; $('bnok').disabled = true; $('box').classList.remove('crbox'); window.v5Bonus(i);
  };

  // =================== TAM EKRAN (yalnızca gerçekten destekleniyorsa) ===================
  function fsOK() { var d = document, e = d.documentElement; return !!(d.fullscreenEnabled && e.requestFullscreen); }
  function fsOn() { return !!document.fullscreenElement; }
  window.v8Fs = function () {
    try {
      if (fsOn()) document.exitFullscreen(); else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(function () { toast(X('Tam ekran bu ortamda açılamadı', 'Fullscreen is not available here')); });
    } catch (e) { toast(X('Tam ekran desteklenmiyor', 'Fullscreen not supported')); }
    setTimeout(function () { if (document.getElementById('v8fs')) document.getElementById('v8fs').checked = fsOn(); }, 300);
  };
  var _settings = settings;
  settings = function () {
    _settings();
    if (!fsOK()) return;                      // desteklenmeyen özellik çalışıyor gibi gösterilmez
    var row = document.createElement('div'); row.className = 'set';
    row.innerHTML = '<span>' + X('Tam ekran', 'Fullscreen') + '</span><input type="checkbox" id="v8fs" ' + (fsOn() ? 'checked' : '') + ' onchange="v8Fs()">';
    var box = $('box'), anchor = box.querySelector('button.big'); box.insertBefore(row, anchor);
  };
  window.V8 = window.V8 || {};
  window.V8.X = X;

  // =================== ÜLKE ADLARI + DİL TUTARLILIĞI ===================
  function applyNames() {
    if (!window.I18N || !window.R) return;
    R.forEach(function (r) { if (!r.en) r.en = r.name; r.name = I18N.cname(r, L); });
    LBK = null;                                   // harita etiketlerini yeni dille yeniden kur
    document.documentElement.lang = L;
  }
  var _setLang = setLang;
  setLang = function () {
    _setLang();
    applyNames();
    if (G && !BSH) render(); else if (!G && $('mod').style.display == 'flex') menu();
    if (window.V6) V6.recompute();
    labels();
    if (window.v7EndBtn && G) v7EndBtn();
  };
  window.addEventListener('load', function () { applyNames(); labels(); });
  window.V8.applyNames = applyNames;
})();
