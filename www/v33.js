/* V33 — Ülke etiketi ilişki durumunu gösterir (paneldeki kırmızı ülke adı yerine):
   Müttefik  : aktif saldırmazlık paktı veya aktif koruma anlaşması
   Düşman    : daha önce savaşıldı / savaş ilan edildi (iş birliği yeniden kurulana dek)
   Olumsuz   : saldırgan tutum (art arda fetihler) veya bu ülkeyi tehdit eden savaşlar (komşusuna / paktlı olduğu ülkeye saldırdık)
               -> pakt kabul etme olasılığı düşer
   Olumlu    : tek bir elçi yetmez; en az 2 kez kalıcı iş birliği (pakt / koruma) kurulduysa
   Tarafsız  : diğer durumlar */
(function () {
  'use strict';
  var NEED_COOP = 2, HIT_TURNS = 10, HEAT_NEG = 3, NEG_REFUSE = 0.25;   // V45: eski 0.5
  function en() { return typeof L !== 'undefined' && L === 'en'; }
  function turnNo() { return (G && G.T && G.T.turn) || 0; }
  function pk(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function pacted(a, b) { try { return !!(G.pacts && G.pacts[pk(a, b)] > turnNo()); } catch (e) { return false; } }
  function borders(a, b) { try { var tg = targets(a, G.owner); for (var k in tg) if (G.owner[k] === b) return true; } catch (e) { } return false; }
  function active() { return !!G && G.v5 === 1 && typeof G.pl === 'string' && G.owner; }

  // ---- geçmişi izle (render sonrası, tek seferlik kayıtlar) ----
  function track() {
    try {
      if (!active()) return;
      var pl = G.pl, tn = turnNo(), ch = false;
      G.coop33 = G.coop33 || {}; G.hit33 = G.hit33 || {}; G.war33 = G.war33 || {}; G.seenP33 = G.seenP33 || {}; G.seenG33 = G.seenG33 || {};
      var L0 = G.last;
      if (L0 && G.seen33 !== L0) {
        G.seen33 = L0; ch = true;
        if (L0.att === pl && typeof L0.e === 'string') { G.hit33[L0.e] = tn; G.war33[L0.e] = 1; G.coop33[L0.e] = 0; }
        else if (L0.e === pl && typeof L0.att === 'string') { G.war33[L0.att] = 1; G.coop33[L0.att] = 0; }
      }
      for (var k in (G.pacts || {})) {
        var p = k.split('|'); if (p[0] !== pl && p[1] !== pl) continue;
        var o = p[0] === pl ? p[1] : p[0], ex = G.pacts[k];
        if (ex > (G.seenP33[o] || 0)) { G.seenP33[o] = ex; if (ex > tn) { G.coop33[o] = (G.coop33[o] || 0) + 1; G.war33[o] = 0; ch = true; } }
      }
      for (var g in (G.guard23 || {})) {
        var gx = G.guard23[g]; if (gx > (G.seenG33[g] || -1)) { G.seenG33[g] = gx; if (gx >= tn) { G.coop33[g] = (G.coop33[g] || 0) + 1; ch = true; } }
      }
      if (ch) { try { save(); } catch (e) { } }
    } catch (e) { }
  }

  // ---- ilişki hesabı ----
  window.v33Rel = function (e) {
    try {
      var pl = G.pl, tn = turnNo();
      if (pacted(pl, e) || (G.guard23 && G.guard23[e] >= tn) || (G.prot55 && G.prot55[e] >= tn)) return 'ally';
      var coop = (G.coop33 && G.coop33[e]) || 0;
      if (((G.war33 && G.war33[e]) || (G.fought23 && G.fought23[e])) && coop < NEED_COOP) return 'enemy';
      var neg = false, h = G.hit33 || {};
      for (var c in h) {
        if (c === e || tn - h[c] > HIT_TURNS) continue;
        if (pacted(e, c) || borders(e, c) || borders(c, e)) { neg = true; break; }       // bu ülkeyi tehdit eden savaş
      }
      if (!neg && (G.heat23 || 0) >= HEAT_NEG) neg = true;                                // saldırgan tutum
      if (neg) return 'neg';
      if (coop >= NEED_COOP) return 'pos';
      return 'neu';
    } catch (x) { return 'neu'; }
  };
  var INFO = {
    ally: { tr: 'Müttefik', en: 'Ally', bg: '#1f8a4c', fg: '#eafff2' },
    enemy: { tr: 'Düşman', en: 'Enemy', bg: '#b42318', fg: '#ffe4e0' },
    neg: { tr: 'Olumsuz', en: 'Unfavorable', bg: '#c26a14', fg: '#fff1de' },
    pos: { tr: 'Olumlu', en: 'Favorable', bg: '#2b83c9', fg: '#e6f4ff' },
    neu: { tr: 'Tarafsız', en: 'Neutral', bg: '#3a4580', fg: '#dfe5ff' }
  };

  var _oi = ownerInfo;
  ownerInfo = function (o, p) {
    var r = _oi.apply(this, arguments);
    try {
      if (active() && typeof o === 'string' && o !== G.pl) {
        var k = v33Rel(o), i = INFO[k];
        return { c: 'rel33', txt: en() ? i.en : i.tr, bg: i.bg, fg: i.fg };
      }
    } catch (e) { }
    return r;
  };
  var _bd = badge;
  badge = function (o, p) {
    var i = ownerInfo(o, p);
    return '<span class="bdg ' + i.c + '"' + (i.bg ? ' style="background:' + i.bg + (i.fg ? ';color:' + i.fg : '') + '"' : '') + '>' + i.txt + '</span>';
  };

  // ---- olumsuz ilişki: pakt kabul olasılığı düşer ----
  var _po = window.v20PactOk;
  window.v20PactOk = function () {
    try {
      var e = G && G.sel && G.owner[G.sel];
      if (active() && G.ph === 'act' && typeof e === 'string' && e !== G.pl && !pacted(G.pl, e) && v33Rel(e) === 'neg') {
        G.pactNo33 = G.pactNo33 || {}; var r = G.pactNo33[e], tn = turnNo(), ok;
        if (r && r.t === tn) ok = r.ok; else { ok = Math.random() >= NEG_REFUSE; G.pactNo33[e] = { t: tn, ok: ok }; }
        if (!ok) {
          try { save(); } catch (x) { }
          toast('🚫 ' + ((M[e] && M[e].name) || e) + ' — ' + (en() ? 'refused the pact (relations are unfavorable, no charge)' : 'ilişkiler olumsuz olduğu için paktı reddetti (ücret alınmadı)'));
          try { render(); } catch (x) { }
          return;
        }
      }
    } catch (x) { }
    return _po && _po.apply(this, arguments);
  };

  var _r = render;
  render = function () { track(); var x = _r.apply(this, arguments); return x; };
})();
