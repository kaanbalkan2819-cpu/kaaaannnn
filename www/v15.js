/* V15: haritada ülkeye tıklayınca detay paneli doğrudan açılır (ad, bilgiler, tarih notu, KEŞİF / SALDIRI);
   eski üst simge çubuğu kaldırıldı (yalnızca ülke baloncuğu + menü baloncuğu); ayarlar menü baloncuğundan açılır. */
(function () {
  'use strict';
  function X(tr, en) { return L == 'tr' ? tr : en; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var SI = ['👥', '🎖', '💰', '🔬', '🕊'], expanded = null;

  // ---------- Üst bar: yalnızca ülke baloncuğu + menü baloncuğu ----------
  hud = function () {
    var id = (G && (G.sel || G.pl)) || null, h = '';
    try { if (id && G.sel && typeof G.owner[id] == 'string' && M[G.owner[id]]) id = G.owner[id]; } catch (e) { }   // V28: fethedilmiş bölgede fetheden ülke gösterilir
    if (id && M[id]) h = '<span class="chip pl v15c">' + fimg(id, 'sm') + ' <b>' + esc(M[id].name) + '</b></span>';
    else h = '<span class="chip v15c"><b>' + X('Bir ülke seç', 'Pick a country') + '</b></span>';
    $('hud').innerHTML = h + '<span class="sp"></span><button class="hb v15m" aria-label="menu" onclick="menu()">' + IC.menu + '</button>';
  };

  // ---------- Detay paneli ----------
  function canScout(id) { return G.ph == 'act' && TG[id] && !G.noscout && !(G.T && (G.T.scouted || G.T.moves <= 0)) && !(G.noscout) && !(G.T && G.T.sids && G.T.sids[G.owner[id]]); }
  panel = function () {
    var el = $('panel'), id = G && G.sel;
    if (!id || !M[id] || G.over || BSH) { el.style.display = 'none'; return; }
    var o = G.owner[id], p = G.cur, atk = G.ph == 'act' && o !== p && !!TG[id];
    var tag = atk ? '<span class="tag ok">⚔ ' + t('atkable') + ' · ' + t(TG[id] == 'land' ? 'landb' : 'seab') + '</span>' : '';
    /* V185: keşfedilmemiş özellikler (Zayıf / Çok zayıf / Güçlü… yazıları) gösterilmez; özellik şeridi keşiften sonra, yalnızca açılan değerlerle (sayı) gelir. Hiçbiri açık değilse şerit hiç çıkmaz. */
    function knw(j) { return G.ph == 'pick' || o === p || !!know(p, o, j); }
    var info = '';
    for (var i = 0; i < 5; i++) if (knw(i)) info += '<span class="v15s" title="' + esc(t('S')[i]) + '">' + SI[i] + ' <b>' + rangeTxt(p, o, i) + '</b></span>';
    var more = '';
    if (expanded === id) for (i = 0; i < 5; i++) if (knw(i)) { var v = st(o)[i], kn = true; more += '<div class="v15r"><span>' + SI[i] + ' ' + t('S')[i] + '</span><i><u style="width:' + (kn ? Math.min(100, v) : [10, 30, 50, 70, 90][relTier(p, v)]) + '%"></u></i><b>' + rangeTxt(p, o, i) + '</b></div>'; }
    var ally218 = false; try { ally218 = typeof o == 'string' && o !== G.pl && !!window.WCD && !!WCD.allied(G.pl, o); } catch (e) { }   /* V218: dostluk (ittifak) anlaşması varsa ad yanında 🤝 */
    var dd = (typeof o == 'string' && M[o]) ? o : id;   // V28: fethedilen bölgede eski ülke değil, sahibi (fetheden ülke) gösterilir
    var quote = (window.I18N ? I18N.hist(dd, L) : '');
    var scoutDis = (G.ph == 'act' && atk) ? !canScout(id) : false;
    el.innerHTML = '<div class="v15p"><button class="cls" onclick="deselect()">' + IC.x + '</button>' +
      '<div class="v15h">' + fimg(dd) + '<div class="v15n"><div class="nm">' + esc(M[dd].name) + (ally218 ? ' <span class="ally218" title="' + X('Dostluk anlaşması', 'Friendship pact') + '">🤝</span>' : '') + '</div><div class="v15b">' + badge(o, p) + tag + '</div></div></div>' +
      (info ? '<div class="v15st">' + info + '</div>' : '') + more +
      /* V218: kendi toprağında / fethettiğin yerde o toprağın kronolojisi (yatay ekranda da görünür); diğerlerinde eski tanıtım cümlesi */
      ((o === G.pl && window.hist218HTML && hist218HTML(id)) ? '<blockquote class="v15q h218q"><small>' + X('Tarihçe', 'Chronicle') + (id !== G.pl ? ' · ' + esc(M[id].name) : '') + '</small>' + hist218HTML(id) + '</blockquote>' :
      '<blockquote class="v15q"><small>' + X('Tarih Notu', 'History Note') + '</small>' + esc(quote) + '</blockquote>') +
      '<div class="v15a"><button onclick="v15Explore()"' + (scoutDis ? ' disabled' : '') + '>🔍 ' + X('KEŞİF', 'SCOUT') + '</button>' +
      '<button class="pri" onclick="v15Attack()"' + (atk ? '' : ' disabled') + '>⚔ ' + X('SALDIRI', 'ATTACK') + '</button></div></div>';
    el.style.display = 'block';
  };
  // KEŞİF: saldırılabilir ülkede mevcut keşif kuralı (1 hamle, özellikleri açar); diğer ülkelerde yalnızca bilgi detayını açar. Asla savaş başlatmaz.
  window.v15Explore = function () {
    if (!G || !G.sel || BSH) return;
    var id = G.sel, atk = G.ph == 'act' && G.owner[id] !== G.cur && !!TG[id];
    if (atk && canScout(id)) { expanded = id; scout(); return; }
    expanded = expanded === id ? null : id; panel();
  };
  // SALDIRI: yalnızca bu düğmeden, mevcut doAttack kurallarıyla
  window.v15Attack = function () { if (!G || !G.sel || BSH || G.busy) return; if (G.ph == 'act' && TG[G.sel]) doAttack(); };
  var _desel = deselect; deselect = function () { expanded = null; _desel(); };
  var _pk = pickC; pickC = function (id) { if (G && G.sel !== id) expanded = null; _pk(id); };
  window.V15 = { panel: panel };
})();
