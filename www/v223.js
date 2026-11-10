/* V223 — (1) Teklif taahhütleri belirgin şekilde uygulanır (kabul edince söz verilen değer artar, miktarı gösterilir)
   (2) Atom bombası cephaneliği: Dükkân'dan alınır, stokta durur, oyunda kullanılır (localStorage 'wc_nuke223')
   (3) Mühür başarımları: her 20 mühürde bir başarım; tüm mühürler toplanınca 3 atom bombası hediye ('wc_ach223')
   (4) Sağ kare menüye Atom Bombası düğmesi; Diplomasi / Kalkınma kare görselleri (v223.css)
   Geri almak için index.html'den v223.js ve v223.css bağlantılarını silin. */
(function () {
  'use strict';
  function X(tr, en) { return (typeof L !== 'undefined' && L == 'en') ? en : tr; }
  function solo() { try { return !!window.G && !G.mp && G.v5 === 1 && typeof G.pl === 'string' && !!G.owner; } catch (e) { return false; } }
  function turn() { try { return (G.T && G.T.turn) || 0; } catch (e) { return 0; } }
  function say(m) { try { toast(m); } catch (e) { } }
  function lget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  /* ================= (1) TEKLİF TAAHHÜDÜ ================= */
  var SN = [['Nüfus', 'Population'], ['Ordu', 'Army'], ['Ekonomi', 'Economy'], ['Teknoloji', 'Technology'], ['Diplomasi', 'Diplomacy']];
  var SI = ['👥', '🎖', '💰', '🔬', '🕊'];
  function wrapOffer(name, getO) {
    var f = window[name]; if (typeof f !== 'function') return false; if (f.__v223) return true;
    var g = function (yes) {
      var o = null, k = null, b = null;
      try { o = getO(); k = o && o.k; if (yes && k != null && solo()) b = st(G.pl).slice(); } catch (e) { }
      var r = f.apply(this, arguments);
      try {
        if (b && k != null) {
          var a = st(G.pl);
          if (a[k] > b[k] + 1e-9) {   /* anlaşma gerçekten kuruldu (özgün katkı uygulandı) → belirgin artış */
            var tgt = Math.max(b[k] * 1.12, b[k] + 3), es = a.slice(); es[k] = Math.round(tgt * 1e6) / 1e6;
            if (k === 2 && G.ed && G.ed[G.pl]) es[k] -= G.ed[G.pl];
            G.es = G.es || {}; G.es[G.pl] = es;
            var d = st(G.pl)[k] - b[k];
            setTimeout(function () { say(SI[k] + ' ' + X(SN[k][0], SN[k][1]) + ' +' + (Math.round(d * 10) / 10) + ' — ' + X('taahhüt yerine getirildi', 'pledge delivered')); }, 900);
            try { save(); } catch (e) { } try { render(); } catch (e) { }
          }
        }
      } catch (e) { }
      return r;
    };
    g.__v223 = 1; window[name] = g; return true;
  }
  (function hookOffers() {
    var a = wrapOffer('v138Offer', function () { return G && G.dip2 && G.dip2.offer; });
    var b = wrapOffer('wcdOffer', function () { return G && G.dip && G.dip.offer; });
    if (!a || !b) setTimeout(hookOffers, 600);
  })();

  /* ================= (2) ATOM BOMBASI CEPHANELİĞİ ================= */
  var NK = 'wc_nuke223';
  function nN() { return Math.max(0, lget(NK, 0) | 0); }
  function nAdd(k) { lset(NK, nN() + k); try { if (window.v220Shop && v220Shop.refresh) v220Shop.refresh(); } catch (e) { } upd(); }
  function why() {
    if (!solo() || G.over) return X('Oyun içinde kullanılır', 'Use it in-game');
    if (G.ph !== 'act') return X('Kendi turunda kullan', 'Use on your turn');
    if (G.nuke222 != null && turn() - G.nuke222 < 3) return X('Yeniden kullanım: ' + (3 - (turn() - G.nuke222)) + ' tur', 'Ready in ' + (3 - (turn() - G.nuke222)) + ' turns');
    return '';
  }
  window.WCNuke = {
    n: nN, add: nAdd,
    take: function () { var n = nN(); if (n <= 0) return false; lset(NK, n - 1); upd(); return true; },
    buy: function (p) {
      if (!window.Gold || !Gold.spend(p, 'nuke223')) { say(X('Yeterli altının yok', 'Not enough gold')); return false; }
      nAdd(1); say('🚀 ' + X('Yıkım Füzesi cephaneliğe eklendi (' + nN() + ')', 'Havoc Missile added to your arsenal (' + nN() + ')')); return true;
    },
    use: function () {
      var w = why(); if (w) { say('🚀 ' + w); return; }
      if (nN() <= 0) { say(X('Cephaneliğinde Yıkım Füzesi yok — Dükkândan al', 'No Havoc Missile in your arsenal — buy one in the Shop')); try { Shop.open(); } catch (e) { } return; }
      try { closeMod(); } catch (e) { } setTimeout(function () { if (window.v222NukePick) v222NukePick(); }, 30);
    },
    shopRow: function (it, g) {
      var n = nN(), w = why(), canBuy = g >= it.p;
      return '<div class="si220 nk223"><i>' + it.ic + '</i><div><b>' + X(it.n[0], it.n[1]) + ' <span class="nkc223">' + X('Cephanelik: ', 'Arsenal: ') + n + '</span></b><small>' + X(it.d[0], it.d[1]) + '</small>' +
        (n > 0 && w ? '<em>' + w + '</em>' : '') + '</div><div class="nkb223">' +
        '<button type="button" ' + (canBuy ? 'onclick="v220Shop.buy(\'nuke\')"' : 'disabled') + '>' + it.p + ' 🪙</button>' +
        (n > 0 ? '<button type="button" class="use" ' + (w ? 'disabled' : 'onclick="WCNuke.use()"') + '>🚀 ' + X('Kullan', 'Use') + '</button>' : '') + '</div></div>';
    }
  };

  /* sağ kare menüye bomba düğmesi (stok sayısıyla) */
  function upd() {
    var b = document.querySelector('#col221 .it221[data-k="nk"]'); if (!b) return;
    var n = nN(), c = b.querySelector('.nkn223'); if (c) c.textContent = n; b.classList.toggle('zero', n <= 0);
  }
  setInterval(function () {
    try {
      var c = document.getElementById('col221'); if (!c || c.querySelector('[data-k="nk"]')) { upd(); return; }
      var b = document.createElement('button'); b.type = 'button'; b.className = 'it221'; b.setAttribute('data-k', 'nk'); b.title = X('Yıkım Füzesi', 'Havoc Missile');
      b.innerHTML = '<i></i><b class="nkn223">0</b><span>🚀 ' + X('Yıkım Füzesi', 'Havoc Missile') + '</span>';
      b.addEventListener('click', function (e) { e.stopPropagation(); try { var t = document.getElementById('tg221'); if (t) t.click(); } catch (x) { } WCNuke.use(); });
      c.appendChild(b); upd();
    } catch (e) { }
  }, 700);

  /* ================= (3) MÜHÜR BAŞARIMLARI ================= */
  var AK = 'wc_ach223';
  var ACH = [
    [20, 'Sınır Muhafızı', 'Border Warden'], [40, 'Fatih Adayı', 'Aspiring Conqueror'], [60, 'Bölge Hâkimi', 'Regional Ruler'],
    [80, 'Kıta Efendisi', 'Lord of a Continent'], [100, 'İmparatorluk Mührü', 'Imperial Seal'], [120, 'Cihan Hükümdarı', 'World Sovereign'],
    [140, 'Tarihin Efendisi', 'Master of History'], [160, 'Efsane Fatih', 'Legendary Conqueror']
  ];
  function total() { try { return (window.GS219 && GS219.total && GS219.total()) || 175; } catch (e) { return 175; } }
  function have() { try { return (window.GS219 && GS219.got) ? GS219.got() : lget('wc_seals219', []).length; } catch (e) { return 0; } }
  function done() { var a = lget(AK, []); return Array.isArray(a) ? a : []; }
  function banner(t, s) {
    var o = document.createElement('div'); o.className = 'ach223';
    o.innerHTML = '<i>🏆</i><div><small>' + X('BAŞARIM AÇILDI', 'ACHIEVEMENT UNLOCKED') + '</small><b>' + t + '</b><span>' + s + '</span></div>';
    document.body.appendChild(o); requestAnimationFrame(function () { o.classList.add('on'); });
    try { if (window.AU) AU.play('win'); } catch (e) { }
    setTimeout(function () { o.classList.remove('on'); }, 4200); setTimeout(function () { o.remove(); }, 4800);
  }
  var queue = [], busy = false;
  function next() { if (busy || !queue.length) return; busy = true; var q = queue.shift(); banner(q[0], q[1]); setTimeout(function () { busy = false; next(); }, 5000); }
  function check() {
    try {
      var n = have(), T = total(), d = done(), ch = false;
      ACH.forEach(function (a) {
        if (n >= a[0] && d.indexOf(a[0]) < 0) { d.push(a[0]); ch = true; queue.push([X(a[1], a[2]), a[0] + ' ' + X('mühür toplandı', 'seals collected')]); }
      });
      if (n >= T && d.indexOf('all') < 0) {
        d.push('all'); ch = true; nAdd(3);
        queue.push([X('Dünya Hâkimi', 'Ruler of the World'), X('Tüm mühürler toplandı — hediye: 3 🚀 Yıkım Füzesi', 'Every seal collected — gift: 3 🚀 Havoc Missiles')]);
      }
      if (ch) { lset(AK, d); next(); }
    } catch (e) { }
  }
  setInterval(check, 2500);
  window.WCAch = {
    html: function () {
      var n = have(), T = total(), d = done(), h = '';
      ACH.forEach(function (a) { var ok = d.indexOf(a[0]) >= 0 || n >= a[0]; h += '<span class="a223' + (ok ? ' ok' : '') + '" title="' + X(a[1], a[2]) + '"><i>' + (ok ? '🏆' : '🔒') + '</i><b>' + a[0] + '</b><small>' + X(a[1], a[2]) + '</small></span>'; });
      var all = d.indexOf('all') >= 0 || n >= T;
      h += '<span class="a223 all' + (all ? ' ok' : '') + '"><i>' + (all ? '🚀' : '🔒') + '</i><b>' + T + '</b><small>' + X('Dünya Hâkimi · 3 ☢ hediye', 'World Ruler · 3 ☢ gift') + '</small></span>';
      return '<div class="ach223s"><div class="ach223t">🏆 ' + X('Başarımlar', 'Achievements') + ' <em>' + X('her 20 mühürde bir', 'one every 20 seals') + '</em></div><div class="ach223r">' + h + '</div></div>';
    },
    check: check
  };
})();
