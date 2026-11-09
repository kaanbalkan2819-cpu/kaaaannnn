/* V219 — ANA MENÜ: "MÜHÜRLER" koleksiyon sayfası, iki sekme:
   1) ALTIN MÜHÜRLER (12): bölgenin tümü fethedilince açılır (gold218.js, localStorage 'wc_gseal218').
   2) MÜHÜRLER (hayvan mühürleri, 63): tek kişilik oyunda bir ülke fethedilince o ülkenin hayvan mührü KALICI olarak koleksiyona girer
      (localStorage 'wc_seals219' = fethedilmiş ülke kodları; hayvan v217.js WCStamp tablosundan).
   Açılan mühürler canlı renkte, açılmayanlar soluk; her sekmede kaç tanesinin açıldığı (n/toplam). Mühre dokununca altta bilgi.
   Geri almak için index.html'den gs219.js ve v219.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function en() { return typeof L !== 'undefined' && L == 'en'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var D = {
    hicaz: ['Hicaz Mührü', 'Hejaz Seal', 'Deve', 'Camel', 'Arap Yarımadası', 'Arabian Peninsula', 'SAU YEM OMN ARE QAT KWT'],
    viking: ['Viking Mührü', 'Viking Seal', 'Kuzgun', 'Raven', 'İskandinavya', 'Scandinavia', 'NOR SWE DNK FIN ISL'],
    amazon: ['Amazon Mührü', 'Amazon Seal', 'Jaguar', 'Jaguar', 'Amazon Havzası', 'Amazon Basin', 'BRA COL VEN ECU PER GUY SUR GUF'],
    balkan: ['Balkan Mührü', 'Balkan Seal', 'Vaşak', 'Lynx', 'Balkanlar', 'Balkans', 'GRC BGR ROU SRB MKD ALB MNE BIH HRV SVN'],
    nil: ['Nil Mührü', 'Nile Seal', 'Timsah', 'Crocodile', 'Nil Havzası', 'Nile Basin', 'EGY SDN SSD ETH ERI'],
    savan: ['Savan Mührü', 'Savanna Seal', 'Aslan', 'Lion', 'Doğu Afrika', 'East Africa', 'KEN TZA UGA RWA BDI SOM'],
    bozkir: ['Bozkır Mührü', 'Steppe Seal', 'At', 'Horse', 'Orta Asya Bozkırı', 'Central Asian Steppe', 'KAZ UZB TKM KGZ TJK MNG'],
    mezopotamya: ['Mezopotamya Mührü', 'Mesopotamia Seal', 'Kanatlı Boğa', 'Lamassu', 'Mezopotamya ve Levant', 'Mesopotamia & Levant', 'IRQ SYR JOR LBN ISR PSE'],
    hint: ['Hint Mührü', 'Indus Seal', 'Kaplan', 'Tiger', 'Hint Alt Kıtası', 'Indian Subcontinent', 'IND PAK BGD NPL BTN LKA'],
    uzakdogu: ['Ejder Mührü', 'Dragon Seal', 'Ejderha', 'Dragon', 'Uzak Doğu', 'Far East', 'CHN KOR PRK JPN TWN'],
    sahra: ['Sahra Mührü', 'Sahara Seal', 'Çöl Tilkisi', 'Fennec Fox', 'Kuzey Afrika', 'North Africa', 'MAR DZA TUN LBY MRT ESH'],
    and: ['And Mührü', 'Andes Seal', 'Kondor', 'Condor', 'Güney Konisi', 'Southern Cone', 'CHL ARG URY PRY BOL']
  };
  var GIDS = Object.keys(D), KEYC = 'wc_seals219', TAB = 'gold', PG = 0, PER = 20, PGH = '';
  function jget(k) { try { var a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function gotG() { return jget('wc_gseal218'); }
  function gotC() { return jget(KEYC); }                    /* kalıcı: fethedilmiş ülkeler */
  function nGold() { var h = gotG(); return GIDS.filter(function (id) { return h.indexOf(id) >= 0; }).length; }
  function S() { return window.WCStamp && WCStamp.A ? WCStamp : null; }
  function animals() { var s = S(); return s ? Object.keys(s.A) : []; }
  function animalOf(c) { var s = S(); return s ? s.animal(c) : 'eagle'; }
  function countriesOf(a) { var s = S(); if (!s) return []; return (s.A[a] && s.A[a][2] ? s.A[a][2].split(' ') : []); }
  function gotAnimals() { var o = {}; gotC().forEach(function (c) { o[animalOf(c)] = 1; }); return o; }
  /* V220: normal mühürler ÜLKE başına (175): her ülkenin kendi mührü */
  function allC() { var o = []; animals().forEach(function (a) { countriesOf(a).forEach(function (c) { if (o.indexOf(c) < 0) o.push(c); }); }); return o; }
  function surlC(c) { var s = S(); return s && s.url ? s.url(c) : 'assets/stamps/' + animalOf(c) + '.png'; }
  function nNormal() { var g = gotC(), all = allC(); return all.filter(function (c) { return g.indexOf(c) >= 0; }).length; }
  function nAll() { return allC().length || 175; }
  function cname(c) {
    try { if (window.I18N) { var t = en() ? I18N.nameEN : I18N.nameTR; if (t && t[c]) return t[c]; } } catch (e) { }
    try { return (window.M && M[c] && M[c].name) || c; } catch (e) { return c; }
  }

  /* ---- kalıcı kayıt: tek kişilik oyunda fethedilen ülkeler (v217 G.cq217) ---- */
  setInterval(function () {
    try {
      if (!window.G || G.mp || !G.cq217 || !G.cq217.length) return;
      var have = gotC(), ch = false;
      G.cq217.forEach(function (c) { if (have.indexOf(c) < 0) { have.push(c); ch = true; } });
      if (ch) localStorage.setItem(KEYC, JSON.stringify(have));
    } catch (e) { }
  }, 1500);

  /* ---- bilgi satırları ---- */
  function infoGold(id) {
    var d = D[id], ok = gotG().indexOf(id) >= 0, E = en(), names = d[6].split(' ').map(cname).join(', ');
    return '<i class="g' + (ok ? '' : ' lk') + '" style="background-image:url(assets/goldseals/' + id + '.png)"></i><div><b>' + esc(E ? d[1] : d[0]) + ' <em>· ' + esc(E ? d[3] : d[2]) + '</em></b>' +
      '<small>' + (ok ? '✔ ' + X('AÇILDI', 'UNLOCKED') : '🔒 ' + X('KİLİTLİ', 'LOCKED')) + ' · ' + esc(E ? d[5] : d[4]) + '</small><span>' +
      (ok ? X('Yeni oyunda bu mühürle başlarsan ' + esc(d[4]) + ' bölgesinden seçtiğin ülkenin tüm değerleri <b>+%2</b>.', 'Start a new game with it: your ' + esc(d[5]) + ' country gets <b>+2%</b> to all stats.')
        : X('Açmak için aynı oyunda fethet: ', 'To unlock, conquer in one game: ') + esc(names)) + '</span></div>';
  }
  function infoNormal(c) {
    var s = S(), a = animalOf(c), nmA = s && s.A[a] ? X(s.A[a][0], s.A[a][1]) : a, ok = gotC().indexOf(c) >= 0, line = s && s.countryInfo ? s.countryInfo(c) : '';
    /* V226: açılmamış mühürde açıklama verilmez */
    if (!ok) return '<i class="lk" style="background-image:url(' + surlC(c) + ')"></i><div><b>' + esc(cname(c)) + '</b><small>🔒 ' + X('KİLİTLİ · bu ülkeyi fethet', 'LOCKED · conquer this country') + '</small></div>';
    return '<i class="' + (ok ? '' : 'lk') + '" style="background-image:url(' + surlC(c) + ')"></i><div><b>' + esc(cname(c)) + ' <em>· ' + esc(nmA) + '</em></b>' +
      '<small>' + (ok ? '✔ ' + X('AÇILDI', 'UNLOCKED') : '🔒 ' + X('KİLİTLİ · bu ülkeyi fethet', 'LOCKED · conquer this country')) + '</small>' +
      '<span>' + esc(line) + '</span></div>';
  }
  /* ---- sayfa ---- */
  function cnt(n, t, lb) { return '<div class="cnt219"><b>' + n + '<i>/' + t + '</i></b><span>' + lb + '</span><div class="bar219"><span style="width:' + (t ? n * 100 / t : 0).toFixed(1) + '%"></span></div></div>'; }
  function gridGold() {
    var have = gotG(), h = '';
    GIDS.forEach(function (id, i) {
      var ok = have.indexOf(id) >= 0, d = D[id];
      h += '<button type="button" class="col219i g' + (ok ? ' ok' : '') + '" style="animation-delay:' + (i * .04).toFixed(2) + 's" onclick="GS219.info(\'g\',\'' + id + '\',this)">' +
        '<i style="background-image:url(assets/goldseals/' + id + '.png)"></i><b>' + esc(X(d[0], d[1])) + '</b><small>' + esc(X(d[4], d[5])) + '</small></button>';
    });
    return cnt(nGold(), GIDS.length, X('altın mühür açıldı', 'golden seals unlocked')) + '<div class="grid219">' + h + '</div>';
  }
  function gridNormal() {
    var g = gotC(), list = allC(), h = '';
    /* açılanlar önde, sonra ülke adına göre */
    list.sort(function (x, y) { var a = g.indexOf(x) >= 0 ? 0 : 1, b = g.indexOf(y) >= 0 ? 0 : 1; return a - b || cname(x).localeCompare(cname(y), en() ? 'en' : 'tr'); });
    /* V226: 175 mühür aynı anda çizilince sayfa kasıyordu: sayfa sayfa gösterilir */
    var pages = Math.max(1, Math.ceil(list.length / PER)); if (PG >= pages) PG = pages - 1; if (PG < 0) PG = 0;
    list.slice(PG * PER, (PG + 1) * PER).forEach(function (c) {
      var ok = g.indexOf(c) >= 0;
      h += '<button type="button" class="col219i n' + (ok ? ' ok' : '') + '" onclick="GS219.info(\'n\',\'' + c + '\',this)">' +
        '<i style="background-image:url(' + surlC(c) + ')"></i><b>' + esc(ok ? cname(c) : cname(c)) + '</b></button>';
    });
    PGH = '<div class="pg226"><button type="button" ' + (PG <= 0 ? 'disabled' : '') + ' onclick="GS219.pg(-1)" aria-label="' + X('Önceki', 'Previous') + '">‹</button><span>' + X('Sayfa ', 'Page ') + (PG + 1) + ' / ' + pages + '</span><button type="button" ' + (PG >= pages - 1 ? 'disabled' : '') + ' onclick="GS219.pg(1)" aria-label="' + X('Sonraki', 'Next') + '">›</button></div>';
    return cnt(nNormal(), list.length, X('ülke mührü açıldı', 'country seals unlocked')) + (window.WCAch && PG === 0 ? WCAch.html() : '') + '<div class="grid219 nn">' + h + '</div>';   /* V223: başarımlar */
  }
  function page() {
    var hint = TAB === 'gold' ? X('Bir mühre dokun: bölgesi, açma koşulu ve avantajı. Bir bölgenin tüm ülkelerini aynı oyunda fethedersen mühür açılır ve canlı rengine döner.',
      'Tap a seal for its region, unlock rule and bonus. Conquer a whole region in one game to unlock it; it turns to full color.')
      : X('Her ülkenin kendi mührü var; ülkeyi fethettiğinde mührü koleksiyona kalıcı olarak girer. Mühre dokun: açıklaması.',         'Conquering a country adds its animal seal to the collection for good. Tap a seal to see which countries grant it.');
    return '<div class="wb-wrap still"><div class="wb-panel wb-pause wc141p col219"><button type="button" class="x226" onclick="GS219.close()" aria-label="' + X('Kapat', 'Close') + '">✕</button><div class="c141h"><span class="p">⚜</span><h3>' + X('MÜHÜR KOLEKSİYONU', 'SEAL COLLECTION') + '</h3></div>' +
      '<div class="tabs219"><button type="button" class="' + (TAB === 'gold' ? 'on' : '') + '" onclick="GS219.tab(\'gold\')">' + X('Altın Mühürler', 'Golden Seals') + ' <i>' + nGold() + '/' + GIDS.length + '</i></button>' +
      '<button type="button" class="' + (TAB === 'norm' ? 'on' : '') + '" onclick="GS219.tab(\'norm\')">' + X('Mühürler', 'Seals') + ' <i>' + nNormal() + '/' + nAll() + '</i></button></div>' +
      '<div class="body219">' + (TAB === 'gold' ? gridGold() : gridNormal()) + '</div>' +
      (TAB === 'norm' ? '<div id="pgw226">' + PGH + '</div>' : '') + '<div class="inf219" id="inf219">' + hint + '</div>' +
      '<div class="c141g"><button type="button" class="c141b pri" onclick="GS219.close()"><span class="ic">‹</span><span class="lb">' + X('Geri', 'Back') + '</span></button></div></div></div>';
  }
  function render() { var bx = document.getElementById('box'); if (bx) { bx.innerHTML = page(); try { if (window.v156Decorate) v156Decorate(); } catch (e) { } } }
  window.GS219 = {
    total: nAll, got: nNormal,   /* V223 */
    open: function (tab) {
      if (tab) TAB = tab;
      var m = document.getElementById('mod'), bx = document.getElementById('box'); if (!m || !bx) return;
      try { window.__wbOn = true; modal('<div></div>'); } catch (e) { } finally { window.__wbOn = false; }
      m.classList.add('wbm'); bx.classList.remove('mm'); render();
      m.style.display = 'flex'; m.onclick = null;
    },
    tab: function (t) { TAB = t; render(); },
    pg: function (d) { PG += d; var b = document.querySelector('.body219'); if (!b) return render(); b.innerHTML = gridNormal(); b.scrollTop = 0; var pw = document.getElementById('pgw226'); if (pw) pw.innerHTML = PGH; var w = document.getElementById('inf219'); if (w) w.innerHTML = X('Bir mühre dokun.', 'Tap a seal.'); try { if (window.AU) AU.play('tick'); } catch (e) { } },
    info: function (k, id, el) {
      var w = document.getElementById('inf219'); if (w) w.innerHTML = k === 'g' ? infoGold(id) : infoNormal(id);
      Array.prototype.forEach.call(document.querySelectorAll('.col219i'), function (b) { b.classList.toggle('sel', b === el); });
      try { if (window.AU) AU.play('tick'); } catch (e) { }
    },
    close: function () { try { closeMod(); } catch (e) { } try { if (!window.G) menu(); } catch (e) { } }
  };
  /* ana menüye "MÜHÜRLER" düğmesi (Ayarlar'ın üstünde), altında açılan sayıları */
  function addMenuBtn() {
    try {
      var w = document.getElementById('wcm'); if (!w || !document.body.classList.contains('wcm-on')) return;
      var mn = w.querySelector('.menu'); if (!mn) return;
      var b = mn.querySelector('.mb219'), txt = X('Altın ', 'Gold ') + nGold() + '/' + GIDS.length + ' · ' + X('Mühür ', 'Seals ') + nNormal() + '/' + nAll();
      if (b) { var s = b.querySelector('.sub218'); if (s && s.textContent !== txt) s.textContent = txt; return; }
      var set = mn.querySelector('[data-a="set"]'); if (!set) return;   /* V220: yalnızca ana menüde (kayıt silme onayında değil) */
      b = document.createElement('button'); b.type = 'button'; b.className = 'mb mb219';
      b.innerHTML = X('MÜHÜRLER', 'SEALS') + '<small class="sub218">' + txt + '</small>';
      mn.insertBefore(b, set);
    } catch (e) { }
  }
  setInterval(addMenuBtn, 400);
  /* V226: düğme menü kurulur kurulmaz eklensin; menü geç dolmuş gibi görünmesin */
  try { new MutationObserver(addMenuBtn).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'], childList: false }); } catch (e) { }
})();
/* V220: menü HTML'i yeniden kurulunca (alt menüden geri dönüş) düğmenin tıklaması kaybolmasın: belge düzeyinde dinlenir */
document.addEventListener('click', function (e) { try { var b = e.target && e.target.closest && e.target.closest('#wcm .mb219'); if (b) { e.stopPropagation(); e.preventDefault(); GS219.open(); } } catch (x) { } }, true);
