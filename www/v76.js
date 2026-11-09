/* V76 — RASTGELE OLAYLAR (parşömen penceresi). Rakip turu bitince, oyuncu turu başlamadan önce nadiren bir olay çıkar.
   Her olayda Kabul / Reddet vardır; seçeneklerin altında hangi değerlerin artıp azalacağı yazar (aynı veriden hem gösterilir hem uygulanır).
   Olaylar: dini lider sığınma, azınlık lideri özgürlük talebi (fethedersen isyan şansı), silah tüccarı, beyin göçü, kıtlık.
   Ayarlar: EVT_P (her tur olasılık), EVT_GAP (iki olay arası en az tur), EVT_FIRST (ilk olay en erken tur), LIB_REVOLT_CHANCE, LIB_POWER_CUT.
   Veri: G.ev76 = {last, prev}, G.lib76 = {ülke: {since, rolled, at}} (kayıtla saklanır). */
(function () {
  'use strict';
  var EVT_P = .85, EVT_GAP = 2, EVT_FIRST = 2,   /* V230: .6 -> .85 */   /* V215: eskiden .16 / 4 / 3 (çok seyrek); artık en erken 2 turda bir, %60 olasılık */ LIB_REVOLT_CHANCE = .3 /* V220: .5 -> .3 */, LIB_POWER_CUT = 10;
  function T(tr, en) { return (typeof L !== 'undefined' && L === 'en') ? en : tr; }
  function nm(e) { return (M[e] && M[e].name) || e; }
  /* V215: Türkçe bulunma eki (ses uyumu + sertleşme): İran'da, Almanya'da, Mısır'da, Türkiye'de, Fas'ta */
  function loc(e) { var s = String(nm(e)).toLocaleLowerCase('tr'), v = (s.match(/[aıoueiöü]/g) || ['e']).pop(), hard = /[çfhkpsşt]$/.test(s); return "'" + (hard ? 't' : 'd') + ('aıou'.indexOf(v) >= 0 ? 'a' : 'e'); }
  function turn() { return (G && G.T && G.T.turn) || 0; }
  function ownedN(e) { var n = 0; for (var k in G.owner) if (G.owner[k] === e) n++; return n; }
  function D() { if (!G.dip) G.dip = { co: [], cd: {}, rel: {}, rev: {} }; G.dip.rel = G.dip.rel || {}; G.dip.fr = G.dip.fr || {}; G.dip.co = G.dip.co || []; return G.dip; }
  function allied(a, b) { var c = D().co; for (var i = 0; i < c.length; i++) { if ((c[i].until == null || c[i].until > turn()) && c[i].m.indexOf(a) >= 0 && c[i].m.indexOf(b) >= 0) return true; } return false; }
  function neighbours(e) {
    var s = {}; for (var id in G.owner) if (G.owner[id] === e && M[id] && M[id].nb) M[id].nb.forEach(function (n) { var o = G.owner[n]; if (o !== undefined && o !== e) s[o] = 1; });
    return Object.keys(s);
  }
  function foes() { return neighbours(G.pl).filter(function (e) { return typeof e === 'string' && ownedN(e) > 0 && G.owner[e] === e && !allied(G.pl, e); }); }   /* V236: başkenti fethedilmiş ülkeyle olay çıkmaz */
  function myAllies() { var r = [], c = D().co; for (var i = 0; i < c.length; i++) { if ((c[i].until == null || c[i].until > turn()) && c[i].m.indexOf(G.pl) >= 0) c[i].m.forEach(function (x) { if (x !== G.pl && ownedN(x) > 0 && r.indexOf(x) < 0) r.push(x); }); } return r; }
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
  var SN = function () { return [T('Nüfus', 'Population'), T('Ordu', 'Army'), T('Ekonomi', 'Economy'), T('Teknoloji', 'Technology'), T('Diplomasi', 'Diplomacy')]; };

  /* ---------- etki uygulama ---------- */
  function mulStat(e, idx, pct) {
    var cur = st(e); G.es = G.es || {};
    G.es[e] = cur.map(function (v, i) { return (idx === 'all' || i === idx) ? Math.round(v * (1 + pct / 100) * 1e6) / 1e6 : v; });
    if (G.ed) G.ed[e] = 0;
  }
  function relShift(e, worse) {
    var d = D();
    if (worse) { d.rel[e] = (d.rel[e] || 0) + 1; d.fr[e] = Math.max(0, (d.fr[e] || 0) - 1); }
    else { d.rel[e] = Math.max(0, (d.rel[e] || 0) - 1); d.fr[e] = (d.fr[e] || 0) + 1; }
  }
  function applyFx(fx, ctx) {
    fx.forEach(function (f) {
      if (f.p) mulStat(G.pl, f.p[0], f.p[1]);
      if (f.nb) foes().forEach(function (e) { relShift(e, f.nb === 'worse'); });
      if (f.t && ctx.target) mulStat(ctx.target, 'all', f.t);
      if (f.tr && ctx.target) {
        relShift(ctx.target, f.tr === 'worse');
        if (f.tr === 'worse') { G.inc23 = G.inc23 || {}; G.inc23[ctx.target + '>' + G.pl] = { until: turn() + 4, m: 1.5, add: .1 }; }
      }
      if (f.ally && ctx.target) mulStat(ctx.target, 'all', f.ally);
      if (f.rl && ctx.target) relShift(ctx.target, f.rl === 'worse');
      if (f.lib && ctx.target) { G.lib76 = G.lib76 || {}; G.lib76[ctx.target] = { since: turn() }; }
      if (f.min && ctx.target) { G.min215 = G.min215 || {}; G.min215[ctx.target] = turn(); }   /* V215 */
      if (f.pact && ctx.target) { G.pacts = G.pacts || {}; G.pacts[pkey(G.pl, ctx.target)] = turn() + 5; relShift(ctx.target, false); try { if (window.WC138Rel) WC138Rel(ctx.target, 8); } catch (x) { } }   /* V230 */
      if (f.snub && ctx.target) { relShift(ctx.target, true); try { if (window.WC138Rel) WC138Rel(ctx.target, -25); } catch (x) { } G.inc23 = G.inc23 || {}; G.inc23[ctx.target + '>' + G.pl] = { until: turn() + 4, m: 1.5, add: .1 }; }
    });
  }
  function pkey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function fxLines(fx, ctx) {   // [{sym, txt, good}]
    var out = [], S = SN(), tg = ctx.target ? nm(ctx.target) : '';
    fx.forEach(function (f) {
      if (f.p) { var up = f.p[1] > 0; out.push({ sym: up ? '▲' : '▼', good: up, txt: S[f.p[0]] + ' ' + (up ? '+' : '−') + '%' + Math.abs(f.p[1]) }); }
      if (f.nb) out.push({ sym: f.nb === 'worse' ? '▼' : '▲', good: f.nb !== 'worse', txt: T('Komşularla ilişkiler ', 'Relations with neighbours ') + (f.nb === 'worse' ? T('kötüleşir', 'worsen') : T('iyileşir', 'improve')) });
      if (f.t) out.push({ sym: '▼', good: true, txt: T(tg + ' gücü −%' + Math.abs(f.t) + ' (direniş senden yana)', tg + ' power −' + Math.abs(f.t) + '% (resistance backs you)') });
      if (f.tr) out.push({ sym: f.tr === 'worse' ? '▼' : '▲', good: f.tr !== 'worse', txt: T(tg + ' ile ilişki ' + (f.tr === 'worse' ? 'kötüleşir' : 'iyileşir'), 'Relations with ' + tg + (f.tr === 'worse' ? ' worsen' : ' improve')) });
      if (f.ally) out.push({ sym: '▲', good: true, txt: T(tg + ' gücü +%' + f.ally + ' (müttefik)', tg + ' power +' + f.ally + '% (ally)') });
      if (f.rl) out.push({ sym: f.rl === 'worse' ? '▼' : '▲', good: f.rl !== 'worse', txt: T(tg + ' ile ilişki ' + (f.rl === 'worse' ? 'kötüleşir' : 'iyileşir'), 'Relations with ' + tg + (f.rl === 'worse' ? ' worsen' : ' improve')) });
      if (f.lib) out.push({ sym: '▲', good: false, txt: T('Fethedersen o topraklarda isyan olasılığı %' + Math.round(LIB_REVOLT_CHANCE * 100) + ' (saldırgan olmasan bile)', 'If you conquer it, %' + Math.round(LIB_REVOLT_CHANCE * 100) + ' chance of revolt there (even if not aggressive)') });
    });
    fx.forEach(function (f) {   /* V230 */
      if (f.pact) out.push({ sym: '▲', good: true, txt: T(tg + ' ile 4 tur saldırmazlık paktı', '4-turn non-aggression pact with ' + tg) });
      if (f.snub) out.push({ sym: '▼', good: false, txt: T(tg + ' ile aran ciddi biçimde bozulur', 'Relations with ' + tg + ' break down') });
    });
    fx.forEach(function (f) { if (f.min) out.push({ sym: '▼', good: true, txt: T('Savaşırsanız ' + tg + ' −%15 (azınlıklar katılmaz)', 'If you go to war, ' + tg + ' −15% (minorities stay out)') }); });   /* V215 */
    if (!out.length) out.push({ sym: '•', good: null, txt: T('Değişiklik yok', 'No change') });
    return out;
  }

  /* ---------- olay tablosu ---------- */
  var EVENTS = [
    { id: 'refuge', icon: '🕌', ok: function () { return foes().length > 0; }, ctx: function () { return {}; },
      title: function () { return T('Sığınma Talebi', 'Plea for Refuge'); },
      text: function () { return T('Takipten kaçan bir dini lider sana sığınmak istiyor. Kabul edersen itibarın ve halkın desteği artar, ama komşuların bunu düşmanca sayar.', 'A religious leader fleeing persecution seeks refuge with you. Granting it boosts your prestige and popular support, but your neighbours see it as hostile.'); },
      yes: [{ p: [4, 10] }, { p: [0, 3] }, { nb: 'worse' }], no: [{ p: [4, -2] }, { nb: 'better' }] },   /* V215: artı/eksi netleştirildi */
    { id: 'liberate', icon: '⛓', ok: function () { return foes().length > 0; }, ctx: function () { return { target: pickOne(foes()) }; },
      title: function (c) { return T(nm(c.target) + ' Azınlığı Yardım İstiyor', nm(c.target) + ' Minority Begs for Help'); },
      text: function (c) { return T('<b>' + nm(c.target) + '</b> topraklarında yaşayan azınlığın lideri, ülkeye saldırıp halkını özgürleştirmeni istiyor. Kabul edersen direnişçiler senin yanında savaşır ve o ülkenin gücü düşer. Ama bu topraklar sonradan elinde tutulması zor olabilir.', 'The leader of the minority living in <b>' + nm(c.target) + '</b> asks you to invade and free their people. If you agree, resistance fighters side with you and the country weakens. But holding those lands afterwards may prove hard.'); },
      yes: [{ t: -LIB_POWER_CUT }, { tr: 'worse' }, { lib: 1 }], no: [{ p: [4, -3] }, { tr: 'better' }] },
    { id: 'arms', icon: '⚔', ok: function () { return true; }, ctx: function () { return {}; },
      title: function () { return T('Silah Tüccarı', 'Arms Dealer'); },
      text: function () { return T('Gezgin bir silah tüccarı, ordun için ucuz ama pahalıya mal olan bir parti silah sunuyor.', 'A travelling arms dealer offers your army a cheap batch of weapons that will still drain the treasury.'); },
      yes: [{ p: [1, 8] }, { p: [2, -6] }], no: [] },
    { id: 'brain', icon: '🔬', ok: function () { return foes().length > 0; }, ctx: function () { return {}; },
      title: function () { return T('Bilim İnsanları', 'Scientists Defect'); },
      text: function () { return T('Komşu bir ülkenin bilim insanları sana katılmak istiyor. Teknolojin gelişir, ama komşuların bundan hoşlanmaz.', 'Scientists from a neighbouring state want to join you. Your technology advances, but your neighbours resent it.'); },
      yes: [{ p: [3, 10] }, { nb: 'worse' }], no: [] },
    { id: 'famine', icon: '🌾', ok: function () { return true; }, ctx: function () { return {}; },
      title: function () { return T('Kıtlık', 'Famine'); },
      text: function () { return T('Kötü hasat kırsalda açlığa yol açtı. Tahıl ambarlarını halka açabilir ya da hazineyi korumayı seçebilirsin.', 'A bad harvest has brought hunger to the countryside. You may open the granaries or protect the treasury.'); },
      yes: [{ p: [2, -8] }, { p: [0, 5] }], no: [{ p: [0, -6] }, { p: [4, -2] }] },
    { id: 'coup', icon: '🗡', ok: function () { return foes().length > 0; }, ctx: function () { return { target: pickOne(foes()) }; },
      title: function (c) { return T(nm(c.target) + ' Darbe Teklifi', 'Coup Offer in ' + nm(c.target)); },
      text: function (c) { return T('<b>' + nm(c.target) + '</b> ordusundan bir grup subay, hükümeti devirmek için gizli destek istiyor. Kabul edersen o ülke iç karışıkla zayıflar; ama işin ortaya çıkması itibarına zarar verir.', 'A group of officers in <b>' + nm(c.target) + '</b> asks for secret backing to topple the government. The country will be weakened by turmoil, but exposure would damage your reputation.'); },
      yes: [{ t: -12 }, { tr: 'worse' }, { p: [4, -5] }], no: [{ p: [4, 2] }] },
    { id: 'ally', icon: '👑', ok: function () { return myAllies().length > 0; }, ctx: function () { return { target: pickOne(myAllies()) }; },
      title: function (c) { return T(nm(c.target) + ' Taht Kavgası', 'Succession Crisis in ' + nm(c.target)); },
      text: function (c) { return T('Müttefikin <b>' + nm(c.target) + '</b> taht kavgasıyla sarsılıyor ve senden askerî ve mali yardım istiyor. Yardım edersen güçlenir ve sana minnet duyar; etmezsen ittifak soğur.', 'Your ally <b>' + nm(c.target) + '</b> is shaken by a succession struggle and begs for military and financial aid. Help makes it stronger and grateful; refusing cools the alliance.'); },
      yes: [{ p: [1, -5] }, { p: [2, -4] }, { ally: 10 }, { rl: 'better' }], no: [{ p: [4, -4] }, { rl: 'worse' }] },
    { id: 'pirates', icon: '🏴‍☠️', ok: function () { return true; }, ctx: function () { return {}; },
      title: function () { return T('Korsanlar', 'Pirates'); },
      text: function () { return T('Korsanlar ve haydutlar ticaret yollarını basıyor. Donanma gönderip temizleyebilir ya da haraç verip başından savabilirsin.', 'Pirates and bandits are raiding your trade routes. You can send a fleet to clear them or pay them off.'); },
      yes: [{ p: [1, -4] }, { p: [2, 6] }], no: [{ p: [2, -6] }] },
    { id: 'plague', icon: '☠', ok: function () { return true; }, ctx: function () { return {}; },
      title: function () { return T('Salgın', 'Plague'); },
      text: function () { return T('Şehirlerde bir salgın başladı. Karantina ilan edersen ticaret durur; hiçbir şey yapmazsan hastalık halka ve orduya yayılır.', 'A plague has broken out in your cities. A quarantine halts trade; doing nothing lets the disease spread among the people and the army.'); },
      yes: [{ p: [2, -7] }, { p: [0, -2] }], no: [{ p: [0, -10] }, { p: [1, -3] }] },
    /* ---------- V215: yeni olaylar ---------- */
    { id: 'minority', icon: '🕯', ok: function () { return foes().length > 0; }, ctx: function () { return { target: pickOne(foes()) }; },
      title: function (c) { return T(nm(c.target) + loc(c.target) + 'ki Azınlık Lideri', 'Minority Leader in ' + nm(c.target)); },
      text: function (c) { return T('<b>' + nm(c.target) + '</b>' + loc(c.target) + 'ki azınlığın lideri gizlice destek istiyor. Hazinenden yardım edersen, o ülkeyle savaştığında azınlıklar onun ordusuna katılmaz.', 'The minority leader in <b>' + nm(c.target) + '</b> secretly asks for support. Fund them and, when you fight that country, its minorities will not join its army.'); },
      yes: [{ p: [2, -7] }, { min: 1 }], no: [{ p: [4, 2] }] },
    { id: 'merchant', icon: '⚖', ok: function () { return true; }, ctx: function () { return {}; },
      title: function () { return T('Tüccar Loncasının Kredisi', 'Merchant Guild Loan'); },
      text: function () { return T('Büyük tüccar loncası hazinene cömert bir kredi öneriyor; karşılığında saraydaki sözü artacak.', 'The great merchant guild offers your treasury a generous loan, in return for more say at court.'); },
      yes: [{ p: [2, 12] }, { p: [4, -4] }], no: [] },
    { id: 'fort', icon: '🏰', ok: function () { return true; }, ctx: function () { return {}; },
      title: function () { return T('Sınır Kalesi', 'Border Fortress'); },
      text: function () { return T('Komutanların sınıra yeni bir kale kurmayı öneriyor. Ordun güçlenir, inşaat hazineyi yorar.', 'Your commanders propose a new fortress on the border. Your army grows stronger, but construction strains the treasury.'); },
      yes: [{ p: [1, 9] }, { p: [2, -6] }], no: [] },
    { id: 'academy', icon: '🔭', ok: function () { return true; }, ctx: function () { return {}; },
      title: function () { return T('Kraliyet Akademisi', 'Royal Academy'); },
      text: function () { return T('Âlimler bir akademi kurulması için izin ve para istiyor. Teknolojin ilerler, bütçe daralır.', 'Scholars ask for permission and funds to found an academy. Your technology advances, the budget tightens.'); },
      yes: [{ p: [3, 9] }, { p: [2, -5] }], no: [{ p: [3, -2] }] },
    { id: 'deserters', icon: '🏳', ok: function () { return foes().length > 0; }, ctx: function () { return { target: pickOne(foes()) }; },
      title: function (c) { return T(nm(c.target) + ' Askerleri Saf Değiştiriyor', nm(c.target) + ' Soldiers Defect'); },
      text: function (c) { return T('<b>' + nm(c.target) + '</b> ordusundan bir birlik sana katılmak istiyor. Kabul edersen ordun büyür, o ülke zayıflar ve sana kin besler.', 'A unit from <b>' + nm(c.target) + '</b>\'s army wants to join you. Accept and your army grows, that country weakens and bears a grudge.'); },
      yes: [{ p: [1, 7] }, { t: -6 }, { tr: 'worse' }], no: [{ tr: 'better' }] },
    { id: 'wedding', icon: '💍', ok: function () { return foes().length > 0; }, ctx: function () { return { target: pickOne(foes()) }; },
      title: function (c) { return T(nm(c.target) + ' ile Hanedan Evliliği', 'Royal Marriage with ' + nm(c.target)); },
      text: function (c) { return T('<b>' + nm(c.target) + '</b> hanedanı iki saray arasında bir evlilik öneriyor. İlişkiler ısınır ve itibarın artar; çeyiz hazineden çıkar.', 'The house of <b>' + nm(c.target) + '</b> proposes a marriage between the two courts. Relations warm and your prestige rises; the dowry comes from your treasury.'); },
      yes: [{ p: [4, 8] }, { p: [2, -5] }, { rl: 'better' }], no: [{ rl: 'worse' }] },
    { id: 'spy', icon: '🗝', ok: function () { return foes().length > 0; }, ctx: function () { return { target: pickOne(foes()) }; },
      title: function (c) { return T(nm(c.target) + loc(c.target) + ' Casus Şebekesi', 'Spy Ring in ' + nm(c.target)); },
      text: function (c) { return T('Casusların <b>' + nm(c.target) + '</b> sarayına sızabileceğini söylüyor. Sabotaj o ülkeyi zayıflatır; ortaya çıkarsa ilişkiler bozulur.', 'Your spies say they can infiltrate the court of <b>' + nm(c.target) + '</b>. Sabotage weakens it; if exposed, relations sour.'); },
      yes: [{ t: -8 }, { p: [2, -3] }, { tr: 'worse' }], no: [] }
  ];
  /* ---------- V230: yeni olaylar. Bazısında iki şık da kötü, bazısında ikisi de iyi, bazısında artı ve eksi karışık. ---------- */
  var IMG230 = {};
  function ev230(id, icon, img, tt, tx, yL, nL, yes, no, tg) {
    var named = function (s, c) { return c && c.target ? s.replace(/\{c\}/g, nm(c.target)) : s; };
    IMG230[id] = img;
    EVENTS.push({ id: id, icon: icon, ok: tg ? function () { return tg().length > 0; } : function () { return true; }, ctx: tg ? function () { return { target: pickOne(tg()) }; } : function () { return {}; },
      title: function (c) { return named(T(tt[0], tt[1]), c); }, text: function (c) { return named(T(tx[0], tx[1]), c); }, yL: yL, nL: nL, yes: yes, no: no });
  }
  function foes230() { return foes(); }
  function noPact() { return foes().filter(function (e) { return !(G.pacts && G.pacts[pkey(G.pl, e)] > turn()); }); }
  /* iki şık da kötü */
  ev230('quake', '🌋', 'famine', ['Deprem', 'Earthquake'], ['Şiddetli bir deprem şehirlerini yıktı. Yeniden inşa hazineyi boşaltır; yardım etmezsen halk göç eder.', 'A violent earthquake has flattened your cities. Rebuilding drains the treasury; without aid, people flee.'], ['Yeniden İnşa Et', 'Rebuild'], ['Kendi Hallerine Bırak', 'Leave Them'], [{ p: [2, -9] }], [{ p: [0, -8] }, { p: [4, -2] }]);
  ev230('mutiny', '🔥', 'deserters', ['Ordu İsyanı', 'Army Mutiny'], ['Maaşları geciken birlikler kışlalarda ayaklandı. Ödersen hazine erir; bastırırsan ordu ve itibarın yara alır.', 'Unpaid troops have risen in the barracks. Paying melts the treasury; crushing them hurts your army and standing.'], ['Maaşları Öde', 'Pay Them'], ['Bastır', 'Crush It'], [{ p: [2, -8] }], [{ p: [1, -8] }, { p: [4, -3] }]);
  ev230('drought', '🌵', 'famine', ['Kuraklık', 'Drought'], ['Yağmurlar kesildi. Dışarıdan tahıl almak pahalı; karneye geçmek halkı eritir.', 'The rains have failed. Importing grain is costly; rationing wastes your people.'], ['Tahıl Al', 'Import Grain'], ['Karneye Geç', 'Ration'], [{ p: [2, -7] }, { p: [4, -2] }], [{ p: [0, -7] }]);
  ev230('traitor', '🗝', 'spy', ['Hain Vezir', 'Traitorous Vizier'], ['Vezirin düşmana sır sattığı ortaya çıktı. Açık yargılama itibarını sarsar; gizlersen rüşvet ve kaçan sırlar pahalıya patlar.', 'Your vizier has been selling secrets. A public trial shakes your standing; a cover-up costs bribes and lost secrets.'], ['Açıkça Yargıla', 'Public Trial'], ['Örtbas Et', 'Cover Up'], [{ p: [4, -6] }], [{ p: [2, -5] }, { p: [3, -3] }]);
  ev230('flood', '🌊', 'famine', ['Sel Felaketi', 'Great Flood'], ['Nehirler taştı. Bent yapmak hazineye, tahliye etmek askere ve halka yük olur.', 'The rivers have burst. Dams burden the treasury; evacuation burdens your troops and people.'], ['Bent Yaptır', 'Build Dams'], ['Tahliye Et', 'Evacuate'], [{ p: [2, -8] }], [{ p: [0, -5] }, { p: [1, -3] }]);
  ev230('blaze', '🔥', 'famine', ['Büyük Yangın', 'Great Fire'], ['Başkentte yangın çıktı. Askerleri göndermek orduyu ve hazineyi yorar; kendi haline bırakırsan şehir kül olur.', 'Fire has broken out in the capital. Sending soldiers tires the army and treasury; left alone, the city burns.'], ['Askerleri Gönder', 'Send Soldiers'], ['Kendi Haline Bırak', 'Let It Burn'], [{ p: [1, -4] }, { p: [2, -4] }], [{ p: [0, -6] }, { p: [3, -2] }]);
  /* iki şık da iyi */
  ev230('goldvein', '⛏', 'merchant', ['Altın Damarı', 'Gold Vein'], ['Dağlarda zengin bir altın damarı bulundu. Hazineye mi aktarırsın, yoksa halka ve komşulara dağıtıp şan mı kazanırsın?', 'A rich gold vein has been found. Into the treasury, or shared out for glory?'], ['Hazineye Aktar', 'To the Treasury'], ['Halka Dağıt', 'Share It'], [{ p: [2, 10] }], [{ p: [4, 7] }, { p: [0, 3] }]);
  ev230('harvest', '🌾', 'merchant', ['Bereketli Hasat', 'Bountiful Harvest'], ['Bu yıl ambarlar taşıyor. Fazlasını satabilir ya da halkı doyurup nüfusu büyütebilirsin.', 'The granaries overflow this year. Sell the surplus or feed a growing people.'], ['Fazlayı Sat', 'Sell Surplus'], ['Halkı Doyur', 'Feed the People'], [{ p: [2, 8] }], [{ p: [0, 8] }]);
  ev230('explorer', '🧭', 'academy', ['Kâşifin Dönüşü', 'The Explorer Returns'], ['Uzak diyarlardan dönen kâşif hem haritalar hem baharat getirdi. Hangisine öncelik vereceksin?', 'Your explorer returns with maps and spices. Which comes first?'], ['Haritaları Al', 'Take the Maps'], ['Baharatı Sat', 'Sell the Spices'], [{ p: [3, 8] }], [{ p: [2, 8] }]);
  ev230('festival', '🎉', 'wedding', ['Zafer Şenlikleri', 'Victory Festival'], ['Halk zaferleri kutluyor. Görkemli bir geçit töreni orduyu, büyük bir şölen sarayını parlatır.', 'The people celebrate your victories. A grand parade lifts the army; a great feast lifts the court.'], ['Geçit Töreni', 'Grand Parade'], ['Büyük Şölen', 'Great Feast'], [{ p: [1, 7] }], [{ p: [4, 7] }, { p: [0, 2] }]);
  ev230('genius', '⚙', 'academy', ['Dahi Mühendis', 'Genius Engineer'], ['Sarayına genç bir dahi geldi. Silah tasarlatabilir ya da yeni makineler yaptırabilirsin.', 'A young genius has come to court. Design weapons, or build new machines.'], ['Silah Tasarlat', 'Design Weapons'], ['Makine Yaptır', 'Build Machines'], [{ p: [1, 8] }], [{ p: [3, 8] }]);
  ev230('migrants', '🧳', 'refuge', ['Yetenekli Göçmenler', 'Skilled Migrants'], ['Komşu diyarlardan usta göçmenler geliyor. Atölyelere mi yerleştirirsin, boş topraklara mı?', 'Skilled migrants are arriving. To the workshops, or the empty lands?'], ['Atölyelere', 'Workshops'], ['Boş Topraklara', 'Empty Lands'], [{ p: [2, 6] }, { p: [3, 3] }], [{ p: [0, 9] }]);
  ev230('congress', '🕊', 'wedding', ['Barış Kongresi', 'Peace Congress'], ['Elçiler başkentinde toplandı. Şanını artırabilir ya da komşularla bağları güçlendirebilirsin.', 'Envoys have gathered in your capital. Raise your prestige, or strengthen ties with your neighbours.'], ['Şanını Artır', 'Raise Prestige'], ['Komşularla Bağ Kur', 'Build Ties'], [{ p: [4, 8] }], [{ nb: 'better' }, { p: [4, 3] }]);
  /* artı ve eksi karışık */
  ev230('draft', '🪖', 'fort', ['Zorunlu Askerlik', 'Conscription'], ['Komutanlar genel seferberlik istiyor. Ordu büyür, ama tarla ve dükkânlar boşalır.', 'Your commanders demand mobilisation. The army grows, but fields and shops empty.'], ['Seferberlik İlan Et', 'Mobilise'], ['Gönüllülerle Yetin', 'Volunteers Only'], [{ p: [1, 10] }, { p: [2, -4] }, { p: [0, -3] }], [{ p: [1, -3] }, { p: [4, 3] }]);
  ev230('newtax', '💰', 'merchant', ['Yeni Vergi', 'New Tax'], ['Hazine yeni bir vergi öneriyor. Kasa dolar, halk ve saray söylenir.', 'The treasury proposes a new tax. The coffers fill while people grumble.'], ['Vergiyi Koy', 'Levy It'], ['Vergiyi Düşür', 'Cut Taxes'], [{ p: [2, 10] }, { p: [0, -4] }, { p: [4, -3] }], [{ p: [2, -3] }, { p: [0, 3] }]);
  ev230('roads', '🛤', 'academy', ['Büyük Yol Projesi', 'Great Road Project'], ['Mühendisler ülkeyi baştan başa yollarla bağlamak istiyor. Pahalı ama ileriye dönük.', 'Engineers want to link the realm with roads. Costly but far-sighted.'], ['Başlat', 'Begin'], ['Ertele', 'Postpone'], [{ p: [2, -6] }, { p: [3, 7] }, { p: [0, 2] }], [{ p: [3, -2] }, { p: [2, 2] }]);
  ev230('censor', '📜', 'spy', ['Sansür Yasası', 'Censorship Law'], ['Saray muhalif yayınları yasaklamak istiyor. Düzen sağlanır, itibar zedelenir.', 'The court wants dissent banned. Order improves; your reputation suffers.'], ['Yasakla', 'Ban Them'], ['Serbest Bırak', 'Allow Them'], [{ p: [1, 5] }, { p: [4, -6] }], [{ p: [4, 4] }, { p: [1, -3] }]);
  ev230('strike', '⚒', 'merchant', ['İşçi Grevi', 'Workers Strike'], ['Maden ve liman işçileri greve gitti. Haklarını verirsen hazine azalır; dağıtırsan iş sürer ama halk öfkelenir.', 'Miners and dockers are on strike. Conceding costs money; breaking it keeps work going but angers the people.'], ['Hak Ver', 'Concede'], ['Dağıt', 'Break It Up'], [{ p: [2, -5] }, { p: [0, 6] }], [{ p: [2, 3] }, { p: [0, -5] }, { p: [4, -3] }]);
  ev230('advisor', '🎓', 'refuge', ['Yabancı Danışman', 'Foreign Advisor'], ['Yabancı bir danışman bilgisini sunuyor. Yerli saray ise bundan rahatsız.', 'A foreign advisor offers expertise. Your own court is unhappy about it.'], ['Kabul Et', 'Accept'], ['Geri Çevir', 'Decline'], [{ p: [3, 6] }, { p: [4, -3] }], [{ p: [3, -2] }, { p: [4, 2] }]);
  ev230('mercs', '⚔', 'fort', ['Paralı Askerler', 'Mercenaries'], ['Bir paralı asker birliği hizmet teklif ediyor. Güçlüler, ama ucuz değiller.', 'A mercenary company offers its service. Strong, but not cheap.'], ['Kirala', 'Hire Them'], ['Gönder', 'Send Away'], [{ p: [1, 9] }, { p: [2, -7] }], [{ p: [1, -2] }, { p: [2, 3] }]);
  ev230('colony', '⛵', 'pirates', ['Deniz Aşırı Üs', 'Overseas Base'], ['Amirallerin uzak bir limanda ticaret üssü kurmak istiyor. Kazançlı, ama gemiler ve askerler oraya gider.', 'Your admirals want a distant trading post. Profitable, but it takes ships and men.'], ['Üssü Kur', 'Found It'], ['Filoyu Evde Tut', 'Keep the Fleet Home'], [{ p: [2, 8] }, { p: [1, -5] }], [{ p: [2, -2] }, { p: [1, 3] }]);
  /* ülkeye özel */
  ev230('napoffer', '🛡', 'wedding', ['{c}: Saldırmazlık Teklifi', '{c}: Non-Aggression Offer'], ['<b>{c}</b> elçileri birbirinize saldırmamayı öneriyor. Reddedersen bunu hakaret sayacaklar.', 'Envoys from <b>{c}</b> propose mutual non-aggression. Refuse and they will take it as an insult.'], ['İmzala', 'Sign'], ['Reddet', 'Refuse'], [{ pact: 1 }], [{ snub: 1 }], noPact);
  ev230('tension', '🚧', 'fort', ['{c} Sınırında Gerginlik', 'Tension on the {c} Border'], ['<b>{c}</b> sınırında askerler karşı karşıya geldi. Takviye göndermek orduyu güçlendirir ama ilişkiyi bozar; geri çekilmek itibarını zedeler.', 'Troops face off on the <b>{c}</b> border. Reinforcing strengthens the army but sours relations; backing down hurts your standing.'], ['Takviye Gönder', 'Reinforce'], ['Geri Çekil', 'Pull Back'], [{ p: [1, 5] }, { tr: 'worse' }], [{ p: [4, -3] }, { rl: 'better' }], foes230);
  ev230('gift', '🎁', 'wedding', ['{c} Armağan Gönderdi', 'A Gift from {c}'], ['<b>{c}</b> sarayı değerli armağanlar yolladı. Kabul etmek kasayı doldurur ve ilişkiyi ısıtır; iade etmek bağımsızlığını gösterir.', 'The court of <b>{c}</b> has sent costly gifts. Accepting fills the coffers and warms relations; returning them shows independence.'], ['Kabul Et', 'Accept'], ['İade Et', 'Return Them'], [{ p: [2, 6] }, { rl: 'better' }], [{ p: [4, 5] }], foes230);
  ev230('exiles', '🏕', 'refuge', ['{c} Sürgünleri', 'Exiles from {c}'], ['<b>{c}</b> topraklarından kaçan binlerce kişi sınırda bekliyor. Almak nüfusu artırır ama hazineyi yorar ve o ülkeyi kızdırır.', 'Thousands fleeing <b>{c}</b> wait at your border. Taking them in grows your people but strains the treasury and angers that country.'], ['İçeri Al', 'Let Them In'], ['Sınırı Kapat', 'Close the Border'], [{ p: [0, 6] }, { p: [2, -4] }, { tr: 'worse' }], [{ p: [4, -4] }, { rl: 'better' }], foes230);
  /* V215: olay görselleri (assets/events/ev_*.jpg, Figma ile üretildi). Benzer olaylar aynı görseli paylaşır. */
  var IMG215 = { refuge: 'refuge', liberate: 'minority', minority: 'minority', arms: 'fort', fort: 'fort', brain: 'academy', academy: 'academy', famine: 'famine', plague: 'famine',
    coup: 'spy', spy: 'spy', ally: 'wedding', wedding: 'wedding', pirates: 'pirates', merchant: 'merchant', deserters: 'deserters' };
  /* V215: AZINLIK DESTEĞİ — desteklenen azınlığın ülkesiyle savaşta (hangi taraf saldırırsa saldırsın) o ülkenin değerleri −%15 */
  (function wrapWar() {
    if (!window.WCD || !WCD.war) return setTimeout(wrapWar, 500);
    if (WCD.war.v215) return;
    var _w = WCD.war;
    WCD.war = function (att, de) {
      var r = _w.apply(this, arguments);
      try {
        var MN = G && G.min215, foe = att === G.pl ? de : (de === G.pl ? att : null);
        if (MN && foe && MN[foe] && ownedN(foe) > 0 && r) {
          if (att === G.pl) r.D = r.D.map(function (v) { return v * .85; }); else r.A = r.A.map(function (v) { return v * .85; });
          toast('🕯 ' + T(nm(foe) + loc(foe) + 'ki azınlıklar savaşa katılmadı: ' + nm(foe) + ' −%15', nm(foe) + '\'s minorities refused to fight: ' + nm(foe) + ' −15%'));
        }
      } catch (e) { }
      return r;
    };
    WCD.war.v215 = 1;
  })();

  /* ---------- parşömen penceresi ---------- */
  function lines(l) { return '<ul>' + l.map(function (x) { return '<li class="' + (x.good === true ? 'g' : x.good === false ? 'b' : 'n') + '"><i>' + x.sym + '</i> ' + x.txt + '</li>'; }).join('') + '</ul>'; }
  function showEvent(ev, ctx, done) {
    var old = document.getElementById('ev76'); if (old) old.remove();
    var o = document.createElement('div'); o.id = 'ev76'; document.body.classList.add('ev235');   /* V235: seçim yaparken Ülkem açılabilir */
    /* V215: duraklatma menüsü şablonu (taş kart, altın çerçeve, köşe süsleri) + üst ortada dikdörtgen olay görseli. Eski parşömen görünümü kaldırıldı. */
    var imk = IMG215[ev.id] || IMG230[ev.id], img = imk ? 'assets/events/ev_' + imk + '.jpg' : '';
    var yLab = ev.yL ? T(ev.yL[0], ev.yL[1]) : T('Kabul', 'Accept'), nLab = ev.nL ? T(ev.nL[0], ev.nL[1]) : T('Reddet', 'Refuse');
    o.className = 'ev215o';
    o.innerHTML = '<div class="ev215"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i>' +
      (img ? '<div class="im215" style="background-image:url(' + img + ')"></div>' : '') +
      '<small class="kick215">' + T('OLAY', 'EVENT') + ' · ' + T('TUR ', 'TURN ') + turn() + '</small><h3>' + ev.title(ctx) + '</h3><p>' + ev.text(ctx) + '</p>' +
      '<div class="ch215"><div class="c215"><button class="b76 y" data-a="1">' + (ev.yL ? '' : '✔ ') + yLab + '</button>' + lines(fxLines(ev.yes, ctx)) + '</div>' +
      '<div class="c215"><button class="b76 n" data-a="0">' + (ev.nL ? '' : '✖ ') + nLab + '</button>' + lines(fxLines(ev.no, ctx)) + '</div></div></div>';
    var busy = false;
    o.querySelectorAll('.b76').forEach(function (b) {
      b.onclick = function () {
        if (busy) return; busy = true;
        var yes = b.getAttribute('data-a') === '1';
        try { applyFx(yes ? ev.yes : ev.no, ctx); } catch (e) { console.error(e); }
        G.ev76 = G.ev76 || {}; G.ev76.last = turn(); G.ev76.prev = ev.id;
        o.classList.add('out');
        document.body.classList.remove('ev235');
        setTimeout(function () { o.remove(); try { save(); render(); } catch (e) { } done(); }, 420);
      };
    });
    document.body.appendChild(o);
  }

  /* ---------- fethedilen azınlık topraklarında isyan ---------- */
  function libTick() {
    if (!G.lib76) return;
    var tn = turn();
    Object.keys(G.lib76).forEach(function (t) {
      var o = G.lib76[t];
      if (G.owner[t] !== G.pl || t === G.pl) { if (tn - o.since > 14) delete G.lib76[t]; return; }
      if (!o.rolled) {   // oyuncu bu toprağı fethetti: isyan çıkıp çıkmayacağı bir kez belirlenir
        o.rolled = 1;
        if (Math.random() < LIB_REVOLT_CHANCE) o.at = tn + 2 + Math.floor(Math.random() * 4); else delete G.lib76[t];
        return;
      }
      if (o.at && tn >= o.at) {
        delete G.lib76[t];
        G.owner[t] = t; G.rebel23 = G.rebel23 || {}; G.rebel23[t] = 1; if (G.es) delete G.es[t]; if (G.ed) delete G.ed[t];
        var old = document.getElementById('fact23'); if (old) old.remove();
        var d = document.createElement('div'); d.id = 'fact23'; d.className = 'fact23 rev23';
        d.innerHTML = '<small>🔥 ' + T('İSYAN!', 'REVOLT!') + '</small>' + T('Özgürleştirdiğin <b>' + nm(t) + '</b> topraklarında direniş yeniden bağımsızlığını ilan etti!', 'Resistance in <b>' + nm(t) + '</b>, the land you took, has declared independence again!');
        d.onclick = function () { d.remove(); }; document.body.appendChild(d);
        setTimeout(function () { if (d.parentNode) d.remove(); }, 8000);
      }
    });
  }

  function maybeEvent(go) {
    try {
      if (!G || G.v5 !== 1 || G.over || typeof G.pl !== 'string' || !G.T) return false;
      libTick();
      var tn = turn(), E = G.ev76 = G.ev76 || {};
      if (tn < EVT_FIRST || (E.last != null && tn - E.last < EVT_GAP) || Math.random() > EVT_P) return false;
      var pool = EVENTS.filter(function (x) { return x.id !== E.prev && x.ok(); });
      if (!pool.length) return false;
      var ev = pickOne(pool); showEvent(ev, ev.ctx(), go); return true;
    } catch (e) { console.error(e); return false; }
  }
  function install() {
    if (!window.V5 || !V5.start || V5.start.v76) return !!(window.V5 && V5.start && V5.start.v76);
    var _st = V5.start;
    V5.start = function () { var self = this, a = arguments; if (maybeEvent(function () { _st.apply(self, a); })) return; return _st.apply(self, a); };
    V5.start.v76 = 1; return true;
  }
  window.WCEV = { events: EVENTS, test: function (id) { var ev = EVENTS.filter(function (x) { return x.id === id; })[0]; if (ev) showEvent(ev, ev.ctx(), function () { }); } };   // konsoldan deneme: WCEV.test('refuge')
  if (!install()) { var n = 0, iv = setInterval(function () { if (install() || ++n > 40) clearInterval(iv); }, 250); }
})();
