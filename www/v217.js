/* V217 — (1) Rakip saldırı kartındaki ⚔ simgesi yerine savaş panelindeki çapraz kılıçlar (WCSwordClash'in son "X" duruşu, bir kez çizilip resim olarak kullanılır)
           (2) Her fetihten sonra savaş sonucu ve özellik seçme penceresinde "FETHEDİLEN ÜLKE n/173" sayacı + fethedilen ülkenin sembol hayvanı
               kırmızı mürekkep mührü olarak basılır. TÜM ülkeler (174) için; 36 hayvan mührü (assets/stamps, Figma ile üretildi).
           (3) Oyun sonu ekranında (yenilgi kartı ve zafer ekranı) bu oyunda fethedilen her ülke için bir mühür (koleksiyon).
           (4) Savaş panelindeki kılıçlar: çizgi film görünümlü çizim yerine Figma'da üretilen gerçekçi çelik kılıç (assets/art/sword217.png).
   Geri almak için index.html'den v217.js ve v217.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }

  /* ---------- (4) gerçekçi kılıç (v208 savaş paneli bunu kullanır) ----------
     Görsel ucu yukarı; kılıç birimi: uç y=-104, siper y≈+12 (çizimdeki ölçülerle aynı yerde çarpışır). */
  var SW_IMG = new Image(); SW_IMG.src = 'assets/art/sword217.png';
  window.WCSWORD217 = { src: 'assets/art/sword217.png', w: 31, h: 153, px: 15.5, py: 104 };

  /* ---------- (1) çapraz kılıç görseli ---------- */
  var swordURL = null;
  function swords() {
    if (swordURL !== null) return swordURL;
    if (!(SW_IMG.complete && SW_IMG.naturalWidth)) return '';   /* kılıç görseli yüklenince çizilir */
    swordURL = '';
    try {
      if (!window.WCSwordClash) return '';
      var host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-500px;top:0;width:10px;height:10px;opacity:0;pointer-events:none';
      document.body.appendChild(host);
      var sc = WCSwordClash.mount(host, { width: 130, height: 130, scale: .66, originY: .40, holdFinal: true, sound: false, sprite: window.WCSWORD217 });
      sc._spriteOk = true; sc.active = true; sc.mode = 'once'; sc.animT = 1e6; sc._now = 0; sc._render();
      swordURL = sc.canvas.toDataURL('image/png');
      sc.destroy(); host.remove();
    } catch (e) { swordURL = ''; }
    return swordURL;
  }
  function fixCard(d) {
    try {
      if (!d || !d.classList || !d.classList.contains('atk')) return;
      var ic = d.querySelector('.ai20-ic'); if (!ic || ic.querySelector('.x217')) return;
      var u = swords(); if (!u) return;
      ic.innerHTML = '<i class="x217" style="background-image:url(' + u + ')"></i>';
    } catch (e) { }
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.id === 'ai20') fixCard(n); }); });
  }).observe(document.body, { childList: true });
  SW_IMG.onload = function () { setTimeout(swords, 300); };

  /* ---------- (2) ülke → sembol hayvanı (tüm ülkeler) ---------- */
  /* V218: her ülkeye gerçek ulusal / hanedan sembol hayvanı (63 hayvan, Figma). Listede olmayan ülke kartal alır. */
  var A = {
    eagle: ['Kartal', 'Eagle', 'USA DEU MEX POL AUT EGY ALB ARM GHA MNE PAN SRB SSD ZMB ZWE NGA KAZ IDN LBN'],
    falcon: ['Şahin', 'Falcon', 'ARE SAU QAT KWT HUN ISL SYR UZB LBY'],
    lion: ['Aslan', 'Lion', 'GBR NLD NOR BEL CZE LUX IRN BDI BGR CMR ETH GEO IRQ KEN LKA MAR MKD MLI SEN SLE SWZ TCD TGO GMB'],
    tiger: ['Kaplan', 'Tiger', 'IND KOR MYS BGD BRN'],
    wolf: ['Bozkurt', 'Grey Wolf', 'TUR ITA EST SVK BIH'],
    bear: ['Ayı', 'Bear', 'RUS TWN FIN GRL'],
    dragon: ['Ejderha', 'Dragon', 'CHN BTN'],
    rooster: ['Horoz', 'Rooster', 'FRA PRT'],
    bull: ['Boğa', 'Bull', 'ESP'],
    crane: ['Turna', 'Crane', 'JPN UGA'],
    beaver: ['Kunduz', 'Beaver', 'CAN'],
    jaguar: ['Jaguar', 'Jaguar', 'BRA GUY SUR GUF PRY'],
    kangaroo: ['Kanguru', 'Kangaroo', 'AUS'],
    elk: ['Mus Geyiği', 'Elk', 'SWE'],
    swan: ['Kuğu', 'Swan', 'DNK'],
    deer: ['Geyik', 'Deer', 'IRL CRI HND'],
    elephant: ['Fil', 'Elephant', 'THA CAF CIV GIN LAO LBR MOZ'],
    buffalo: ['Manda', 'Water Buffalo', 'VNM KHM PHL'],
    kiwi: ['Kivi', 'Kiwi', 'NZL'],
    owl: ['Baykuş', 'Owl', 'GRC'],
    gazelle: ['Ceylan', 'Gazelle', 'ISR PSE DJI MWI NER'],
    condor: ['Kondor', 'Condor', 'CHL COL BOL ECU'],
    stork: ['Leylek', 'Stork', 'LTU LVA'],
    leopard: ['Leopar', 'Leopard', 'BEN GAB SOM YEM'],
    horse: ['At', 'Horse', 'AZE BFA LSO MNG PRK SVN TKM URY'],
    camel: ['Deve', 'Camel', 'ERI MRT ESH TUN'],
    peacock: ['Tavus Kuşu', 'Peacock', 'MMR'],
    zebra: ['Zebra', 'Zebra', 'BWA'],
    gorilla: ['Goril', 'Gorilla', 'COG GNQ RWA'],
    crocodile: ['Timsah', 'Crocodile', 'GNB TLS'],
    parrot: ['Papağan', 'Parrot', 'DOM'],
    bison: ['Bizon', 'Bison', 'BLR MDA'],
    dolphin: ['Yunus', 'Dolphin', 'ATF FJI FLK SLB VUT ATA'],
    lynx: ['Vaşak', 'Lynx', 'ROU'],
    snowleopard: ['Kar Leoparı', 'Snow Leopard', 'AFG KGZ TJK'],
    cow: ['İnek', 'Cow', 'CHE NPL'],
    marten: ['Sansar', 'Marten', 'HRV'],
    nightingale: ['Bülbül', 'Nightingale', 'UKR'],
    quetzal: ['Ketzal', 'Quetzal', 'GTM'],
    hummingbird: ['Sinekkuşu', 'Hummingbird', 'JAM'],
    flamingo: ['Flamingo', 'Flamingo', 'BHS'],
    oryx: ['Oriks', 'Oryx', 'OMN JOR NAM'],
    springbok: ['Springbok', 'Springbok', 'ZAF'],
    markhor: ['Markhor', 'Markhor', 'PAK'],
    tapir: ['Tapir', 'Tapir', 'BLZ'],
    vicuna: ['Vikunya', 'Vicuña', 'PER'],
    fennec: ['Çöl Tilkisi', 'Fennec Fox', 'DZA'],
    giraffe: ['Zürafa', 'Giraffe', 'TZA'],
    okapi: ['Okapi', 'Okapi', 'COD'],
    lemur: ['Lemur', 'Lemur', 'MDG'],
    birdofparadise: ['Cennet Kuşu', 'Bird-of-Paradise', 'PNG'],
    secretarybird: ['Sekreter Kuşu', 'Secretary Bird', 'SDN'],
    trogon: ['Trogon', 'Trogon', 'CUB HTI'],
    mouflon: ['Muflon', 'Mouflon', 'CYP'],
    ibis: ['Kızıl İbis', 'Scarlet Ibis', 'TTO'],
    motmot: ['Motmot', 'Motmot', 'SLV NIC'],
    troupial: ['Trupial', 'Troupial', 'VEN'],
    sable: ['Samur Antilobu', 'Sable Antelope', 'AGO'],
    kagu: ['Kagu', 'Kagu', 'NCL'],
    coqui: ['Koki Kurbağası', 'Coquí Frog', 'PRI'],
    hornero: ['Fırıncı Kuşu', 'Hornero', 'ARG']
  };
  var OF = {};
  Object.keys(A).forEach(function (k) { A[k][2].split(' ').forEach(function (c) { OF[c] = k; }); });
  function animal(c) { return OF[c] || 'eagle'; }   /* listede olmayan (yeni eklenen) ülke: kartal */
  function surl(c) { return 'assets/stamps/' + animal(c) + '.png'; }
  window.WCStamp = { of: function (c) { return OF[c] || null; }, url: surl };

  function nm2(c) { try { return nm(c); } catch (e) { return (window.M && M[c] && M[c].name) || c; } }
  function counts(tg) {
    var tot = 0, n = 0; for (var k in G.owner) { tot++; if (G.owner[k] === G.pl && k !== G.pl) n++; }
    if (tg && G.owner[tg] !== G.pl) n++;   /* sahiplik panel kapanınca yazılıyorsa */
    return { n: n, tot: Math.max(1, tot - 1) };
  }
  function stampHTML(tg) {
    var c = counts(tg), an = animal(tg);
    return '<div class="st217 has">' +
      '<div class="cnt217"><small>' + X('FETHEDİLEN ÜLKE', 'COUNTRIES CONQUERED') + '</small><b>' + c.n + '<i>/' + c.tot + '</i></b>' +
      '<span class="bar217"><span style="width:' + Math.max(1.5, Math.min(100, c.n * 100 / c.tot)).toFixed(1) + '%"></span></span>' +
      '<em>' + X(nm2(tg) + ' ' + A[an][0] + ' mührü', nm2(tg) + ' ' + A[an][1] + ' seal') + '</em></div>' +
      '<div class="stp217" data-c218s="' + tg + '" style="background-image:url(' + surl(tg) + ')"></div></div>';
  }

  /* fethedilen ülkeler bu oyunun kaydına yazılır (G.cq217) → oyun sonu ekranındaki mühür koleksiyonu */
  var LAST = null;
  try {
    var _sb = showBattle; showBattle = function (r, p, e, tg) {
      LAST = { r: r, p: p, e: e, tg: tg };
      try { if (G && !G.mp && r && r.win && p === G.pl && tg) { G.cq217 = G.cq217 || []; if (G.cq217.indexOf(tg) < 0) G.cq217.push(tg); } } catch (x) { }
      return _sb.apply(this, arguments);
    };
  } catch (e) { }

  function addStamp() {
    try {
      var fn = document.getElementById('fn'); if (!fn || !LAST || !G || G.mp) return;
      var fh = fn.querySelector('.fh'); if (!fh || fn.querySelector('.st217')) return;
      if (!fh.querySelector('.banner.w')) return;
      var tg = LAST.tg || LAST.e; if (!tg || LAST.p !== G.pl) return;   /* yalnızca oyuncunun kazandığı saldırı */
      fh.insertAdjacentHTML('afterend', stampHTML(tg));
      setTimeout(function () { try { if (window.AU) AU.play('tick'); } catch (e) { } }, 380);
    } catch (e) { }
  }
  /* fetihten sonra açılan "özellik seç" penceresi (V7 showPick7) */
  function addPick() {
    try {
      var bx = document.getElementById('box'); if (!bx || !bx.classList.contains('crbox') || bx.querySelector('.st217') || !G || G.mp || !G.pend) return;
      var tg = G.pend.tg, crs = bx.querySelector('.crs'); if (!tg || !crs) return;
      crs.insertAdjacentHTML('afterend', stampHTML(tg));
      var ar = bx.querySelector('.crf .arr'), u = swords(); if (ar && u) ar.innerHTML = '<i class="x217 sm" style="background-image:url(' + u + ')"></i>';
    } catch (e) { }
  }

  /* ---------- (3) oyun sonu: fethedilen her ülke için bir mühür ---------- */
  var lastList = [];
  function conquered() {
    try { if (G && G.cq217 && G.cq217.length) lastList = G.cq217.slice(); } catch (e) { }
    return lastList;
  }
  /* V218: mühre dokununca kısa bilgi. Hayvan başına tek satır (TR, EN); bazı ülkelerde ülkeye özel satır. */
  var INFO = {
    eagle: ['Güç ve egemenlik; Roma\'dan beri imparatorluk armalarının kuşu.', 'Power and sovereignty; the imperial bird since Rome.'],
    falcon: ['Hız ve soyluluk; çöl beylerinin av kuşu.', 'Speed and nobility; the hunting bird of desert lords.'],
    lion: ['Cesaret ve hükümranlık; armaların en eski kralı.', 'Courage and kingship; heraldry\'s oldest king.'],
    tiger: ['Ormanın efendisi; güç ve korkusuzluk.', 'Lord of the jungle; strength and fearlessness.'],
    wolf: ['Sadakat ve sürü gücü; kuzeyin yol gösteren avcısı.', 'Loyalty and the strength of the pack.'],
    bear: ['Kuzeyin dev gücü; sabır ve dayanıklılık.', 'The giant strength of the north; patience and endurance.'],
    dragon: ['Göğün ve suyun efendisi; imparatorluk kudreti.', 'Master of sky and water; imperial might.'],
    rooster: ['Sabahı müjdeleyen; uyanıklık ve gurur.', 'Herald of dawn; vigilance and pride.'],
    bull: ['Güç, inat ve kadim arena geleneği.', 'Strength, stubbornness and an ancient arena tradition.'],
    crane: ['Uzun ömür ve sadakatin kuşu.', 'The bird of long life and fidelity.'],
    beaver: ['Çalışkanlık; kürk ticaretiyle kurulan ülkenin simgesi.', 'Industry; symbol of a land built on the fur trade.'],
    jaguar: ['Amerika\'nın en büyük kedisi; Maya ve Aztek savaşçılarının totemi.', 'The Americas\' largest cat; totem of Maya and Aztec warriors.'],
    kangaroo: ['Geri geri gidemez; hep ileri.', 'It cannot move backwards — always forward.'],
    elk: ['Kuzey ormanlarının kralı.', 'King of the northern forests.'],
    swan: ['Zarafet ve saflık; Andersen masallarının kuşu.', 'Grace and purity; the bird of Andersen\'s tales.'],
    deer: ['Asalet ve ormanın ruhu.', 'Nobility and the spirit of the forest.'],
    elephant: ['Bilgelik, hafıza ve kraliyet gücü.', 'Wisdom, memory and royal power.'],
    buffalo: ['Çiftçinin sadık yoldaşı; emek ve sabır.', 'The farmer\'s loyal companion; toil and patience.'],
    kiwi: ['Uçamayan gece kuşu; halk kendine "Kiwi" der.', 'A flightless night bird; the people call themselves Kiwis.'],
    owl: ['Athena\'nın kuşu; bilgelik.', 'The bird of Athena; wisdom.'],
    gazelle: ['Zarafet ve çeviklik; çölün güzeli.', 'Grace and agility; beauty of the desert.'],
    condor: ['And Dağları\'nın hükümdarı; özgürlük.', 'Ruler of the Andes; freedom.'],
    stork: ['Bahar ve bereket getiren kuş.', 'The bird that brings spring and plenty.'],
    leopard: ['Gizlilik ve kurnazlık; sessiz avcı.', 'Stealth and cunning; the silent hunter.'],
    horse: ['Bozkırın kanadı; fetih ve özgürlük.', 'Wings of the steppe; conquest and freedom.'],
    camel: ['Çölün gemisi; dayanıklılık.', 'Ship of the desert; endurance.'],
    peacock: ['Güzellik ve onur.', 'Beauty and honour.'],
    zebra: ['Her çizgisi eşsiz; birlik.', 'Every stripe unique; unity.'],
    gorilla: ['Dağ ormanlarının sakin devi.', 'The calm giant of the mountain forests.'],
    crocodile: ['Nehirlerin kadim bekçisi.', 'Ancient guardian of the rivers.'],
    parrot: ['Tropik ormanın renkli sesi.', 'The colourful voice of the rainforest.'],
    bison: ['Avrupa\'nın son yaban sığırı; direniş.', 'Europe\'s last wild bison; resilience.'],
    dolphin: ['Denizcilerin dostu; okyanus özgürlüğü.', 'Friend of sailors; freedom of the ocean.'],
    lynx: ['Karpatların keskin gözlü avcısı.', 'The sharp-eyed hunter of the Carpathians.'],
    snowleopard: ['"Dağların hayaleti"; zirvelerin efendisi.', '"Ghost of the mountains"; master of the peaks.'],
    cow: ['Bereket ve barış; Alp ve Himalaya köylerinin hazinesi.', 'Plenty and peace; treasure of Alpine and Himalayan villages.'],
    marten: ['Kürkü bir zamanlar para yerine geçti; para birimi "kuna" adını ondan aldı.', 'Its fur was once money; the "kuna" currency was named after it.'],
    nightingale: ['Şarkının ve özgürlüğün kuşu.', 'The bird of song and freedom.'],
    quetzal: ['Esarette yaşamadığına inanılır; para birimine adını verdi.', 'Said to die in captivity; the currency bears its name.'],
    hummingbird: ['"Doktor kuşu"; uzun kuyruklu ulusal kuş.', 'The "doctor bird"; the long-tailed national bird.'],
    flamingo: ['Adaların pembe süsü; armada yer alır.', 'The pink jewel of the islands, on the coat of arms.'],
    oryx: ['Çölde hayatta kalma ustası; tek boynuz efsanesinin kaynağı.', 'Master of desert survival; source of the unicorn legend.'],
    springbok: ['Sıçrayan ceylan; ulusal ragbi takımının adı.', 'The leaping antelope; name of the national rugby team.'],
    markhor: ['"Yılan yiyen" spiral boynuzlu dağ keçisi.', 'The spiral-horned "snake eater" goat.'],
    tapir: ['Tropik ormanın "dağ ineği"; yaşayan fosil.', 'The rainforest\'s "mountain cow"; a living fossil.'],
    vicuna: ['İnkaların altın yünlü hayvanı; armada yer alır.', 'The Incas\' golden-fleeced animal, on the coat of arms.'],
    fennec: ['Dev kulaklı çöl tilkisi; Sahra\'nın küçük cesuru.', 'The big-eared desert fox; little hero of the Sahara.'],
    giraffe: ['Dünyanın en uzun hayvanı; ufku görür.', 'The tallest animal; it sees the horizon.'],
    okapi: ['Ormanın gizemli "zebra zürafası"; bilim 1901\'de tanıdı.', 'The forest\'s mysterious "forest giraffe", known to science since 1901.'],
    lemur: ['Yalnız Madagaskar\'da yaşar; adanın ruhu.', 'Found only on Madagascar; spirit of the island.'],
    birdofparadise: ['Bayrakta uçan cennet kuşu.', 'The bird-of-paradise flying on the flag.'],
    secretarybird: ['Yılan avcısı; devlet armasındaki kuş.', 'The snake hunter on the state emblem.'],
    trogon: ['Tüyleri bayrağın renklerini taşır; esarette yaşamaz.', 'Its plumage carries the flag\'s colours; it will not live caged.'],
    mouflon: ['Kıbrıs dağlarının yaban koyunu.', 'The wild sheep of Cyprus\'s mountains.'],
    ibis: ['Bataklıkların kızıl kuşu; armanın kanadı.', 'The scarlet bird of the swamps, on the coat of arms.'],
    motmot: ['Raket kuyruklu "guardabarranco".', 'The racket-tailed "guardabarranco".'],
    troupial: ['Turuncu-siyah ötücü; ulusal kuş.', 'The orange-and-black songbird; the national bird.'],
    sable: ['"Palanca Negra"; neslinden kurtarılan ulusal gurur.', '"Palanca Negra"; a national pride saved from extinction.'],
    kagu: ['Neredeyse uçamayan, köpek gibi havlayan kuş.', 'An almost flightless bird that barks like a dog.'],
    coqui: ['Geceleri "ko-ki" diye öten minik kurbağa.', 'The tiny frog that sings "ko-kee" at night.'],
    hornero: ['Çamurdan fırın biçiminde yuva yapan çalışkan kuş.', 'The hard-working bird that builds an oven-shaped mud nest.']
  };
  var INFO_C = {
    TUR: ['Ergenekon\'dan çıkışta yol gösteren Bozkurt Asena.', 'Asena the Grey Wolf, who led the Turks out of Ergenekon.'],
    ITA: ['Roma\'nın kurucuları Romulus ve Remus\'u emziren dişi kurt.', 'The she-wolf who nursed Romulus and Remus, founders of Rome.'],
    GBR: ['Aslan Yürekli Richard\'dan beri kraliyet armasında.', 'On the royal arms since Richard the Lionheart.'],
    RUS: ['Batılıların gözünde Rusya\'nın kendisi: "Rus ayısı".', 'To the West, Russia itself: "the Russian bear".'],
    FRA: ['Galya horozu; Latince "gallus" hem horoz hem Galyalı demek.', 'The Gallic rooster: Latin "gallus" means both rooster and Gaul.'],
    USA: ['Kel kartal 1782\'den beri devlet mührünün kalbinde.', 'The bald eagle has been at the heart of the Great Seal since 1782.'],
    CHN: ['Çin imparatorlarının beş pençeli ejderhası.', 'The five-clawed dragon of China\'s emperors.'],
    MEX: ['Aztekler kaktüs üstünde yılan yiyen kartalı görünce Tenochtitlan\'ı kurdu.', 'The Aztecs founded Tenochtitlan where an eagle ate a snake on a cactus.'],
    BTN: ['Druk, "Gök Gürültüsü Ejderhası"; ülkenin kendi adı.', 'Druk, the "Thunder Dragon" — the country\'s own name.'],
    HUN: ['Turul, Macar hanedanının efsanevi atası.', 'The Turul, legendary ancestor of the Hungarian dynasty.']
  };
  function infoOf(c) { var a = animal(c), t = INFO_C[c] || INFO[a] || ['', '']; return { a: a, an: X(A[a][0], A[a][1]), t: X(t[0], t[1]) }; }
  function flag2(c) { try { return fimg(c, 'sm'); } catch (e) { return ''; } }
  function esc2(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  /* bilgi kartı: ekranın altında, dokununca / 4 sn sonra kapanır */
  var infoT = 0;
  function showInfo(c, n) {
    var el = document.getElementById('sginfo218'); if (!el) { el = document.createElement('div'); el.id = 'sginfo218'; document.body.appendChild(el); el.addEventListener('click', function (e) { e.stopPropagation(); el.classList.remove('on'); }); }
    var f = infoOf(c);
    el.innerHTML = '<i style="background-image:url(' + surl(c) + ')"></i><div><small>' + (n ? '#' + n + ' · ' : '') + X('FETHEDİLDİ', 'CONQUERED') + '</small>' +
      '<b>' + flag2(c) + esc2(nm2(c)) + ' <em>· ' + esc2(f.an) + '</em></b><span>' + esc2(f.t) + '</span></div>';
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(infoT); infoT = setTimeout(function () { el.classList.remove('on'); }, 4200);
    try { if (window.AU) AU.play('tick'); } catch (e) { }
  }
  function itemHTML(c, i, anim) {
    return '<button type="button" class="sgi217" data-c218="' + c + '" data-n218="' + (i + 1) + '"' + (anim ? ' style="animation-delay:' + Math.min(1.2, .2 + i * .06).toFixed(2) + 's"' : ' style="animation:none;opacity:1"') +
      '><i style="background-image:url(' + surl(c) + ')"></i><small>' + esc2(nm2(c)) + '</small></button>';
  }
  /* V218: oyun sonunda yalnızca son fethedilen birkaç mühür; kalanları "Hepsini Gör" penceresinde */
  var PV = 5;
  function gridHTML(list) {
    var h = '<div class="sg217"><div class="sgh217"><span>' + X('MÜHÜR KOLEKSİYONU', 'SEAL COLLECTION') + '</span>' +
      (list.length > PV ? '<button type="button" class="sga218" data-all218="1">' + X('Hepsini Gör', 'See All') + ' ›</button>' : '') + '<b>' + list.length + '</b></div>';
    if (!list.length) return h + '<p class="sge217">' + X('Bu seferde hiç ülke fethedilmedi.', 'No country was conquered in this campaign.') + '</p></div>';
    h += '<div class="sgg217 pv218">';
    var show = list.length > PV ? PV - 1 : list.length, start = list.length - show;   /* en son fethedilenler */
    for (var i = list.length - 1, k = 0; i >= start; i--, k++) h += itemHTML(list[i], i, true).replace(/animation-delay:[\d.]+s/, 'animation-delay:' + (.2 + k * .08).toFixed(2) + 's');
    if (list.length > PV) h += '<button type="button" class="sgm218" data-all218="1"><b>+' + (list.length - show) + '</b><small>' + X('Hepsi', 'All') + '</small></button>';
    return h + '</div><p class="sgt218">' + X('Bilgi için mühre dokun', 'Tap a seal for info') + '</p></div>';
  }
  function openAll() {
    var list = conquered(); if (!list.length) return;
    var o = document.getElementById('sgall218'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'sgall218';
    var h = '<div class="in"><div class="hd"><span>' + X('MÜHÜR KOLEKSİYONU', 'SEAL COLLECTION') + '</span><b>' + list.length + '</b><button type="button" class="x" data-close218="1" aria-label="close">✕</button></div>' +
      '<p class="sub">' + X('Fetih sırasıyla · bilgi için mühre dokun', 'In order of conquest · tap a seal for info') + '</p><div class="sgg217 all218">';
    list.forEach(function (c, i) { h += itemHTML(c, i, false); });
    o.innerHTML = h + '</div></div>';
    document.body.appendChild(o);
    requestAnimationFrame(function () { o.classList.add('on'); });
  }
  function closeAll() { var o = document.getElementById('sgall218'); if (o) { o.classList.remove('on'); setTimeout(function () { o.remove(); }, 220); } var i = document.getElementById('sginfo218'); if (i) i.classList.remove('on'); }
  document.addEventListener('click', function (e) {
    try {
      var t = e.target; if (!t || !t.closest) return;
      var it = t.closest('[data-c218]'); if (it) { e.stopPropagation(); e.preventDefault(); showInfo(it.getAttribute('data-c218'), +it.getAttribute('data-n218') || 0); return; }
      var st = t.closest('.stp217[data-c218s]'); if (st) { e.stopPropagation(); showInfo(st.getAttribute('data-c218s'), 0); return; }
      if (t.closest('[data-all218]')) { e.stopPropagation(); e.preventDefault(); openAll(); return; }
      if (t.closest('[data-close218]') || t.id === 'sgall218') { e.stopPropagation(); closeAll(); return; }
    } catch (x) { }
  }, true);
  /* oyun sonu kartı kapanırsa (Tekrar Başla / Ana Menü) koleksiyon penceresi de kapanır */
  setInterval(function () { try { if (document.getElementById('sgall218') && !document.querySelector('.sg217')) closeAll(); } catch (e) { } }, 600);
  function addEnd() {
    try {
      var bx = document.getElementById('box'), go = bx && bx.querySelector('.go214');
      if (go && !go.querySelector('.sg217')) { var s = go.querySelector('.c141s'); if (s) s.insertAdjacentHTML('afterend', gridHTML(conquered())); }
      var w = document.querySelector('#v139over.win .in');
      if (w && !w.querySelector('.sg217')) { var sc = w.querySelector('.sc'); (sc || w.lastChild).insertAdjacentHTML(sc ? 'afterend' : 'beforebegin', gridHTML(conquered())); }
    } catch (e) { }
  }
  setInterval(function () { conquered(); addEnd(); }, 400);   /* liste, kart açılmadan önce (G sıfırlanmadan) saklanır */

  /* V218: koleksiyon sahiplik değişiminden de izlenir. Eskiden yalnızca oyuncunun kendi kazandığı saldırı yazılıyordu;
     bir imparatorluğu yıkınca toplu geçen topraklar, olay/diplomasiyle katılan ülkeler koleksiyona girmiyor, sayaç (n/173) ile tutmuyordu. */
  var prevG = null, prevOwn = null;
  setInterval(function () {
    try {
      if (!window.G || G.mp || !G.owner || typeof G.pl !== 'string' || ['pick', 'v7pick'].indexOf(G.ph) >= 0) { prevG = null; return; }
      if (G !== prevG) { prevG = G; prevOwn = {}; for (var k0 in G.owner) prevOwn[k0] = G.owner[k0]; return; }
      for (var k in G.owner) {
        var o = G.owner[k];
        if (o === G.pl && prevOwn[k] !== G.pl && k !== G.pl) { G.cq217 = G.cq217 || []; if (G.cq217.indexOf(k) < 0) G.cq217.push(k); }
        prevOwn[k] = o;
      }
    } catch (e) { }
  }, 500);

  (function watchBox() {
    var bx = document.getElementById('box'); if (!bx) return setTimeout(watchBox, 500);
    var pb = 0; new MutationObserver(function () { if (pb) return; pb = setTimeout(function () { pb = 0; addPick(); addEnd(); }, 30); }).observe(bx, { childList: true });
  })();
  var pend = 0;
  (function watch() {
    var bs = document.getElementById('bs'); if (!bs) return setTimeout(watch, 500);
    new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; addStamp(); }, 60); }).observe(bs, { childList: true, subtree: true });
  })();
  /* yeni oyunda eski liste taşınmasın */
  var seenG = null; setInterval(function () { try { if (window.G && G !== seenG) { seenG = G; if (!G.cq217) lastList = []; } } catch (e) { } }, 500);
  /* mühürleri önceden yükle */
  setTimeout(function () { try { Object.keys(A).forEach(function (k) { var im = new Image(); im.src = 'assets/stamps/' + k + '.png'; }); } catch (e) { } }, 6000);
})();
