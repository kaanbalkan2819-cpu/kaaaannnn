/* V120 — (1) Savaş panelinde müttefik bayrakları: her tarafta savaşa katılan müttefiklerin bayrağı ana bayrağın altında görünür.
          (2) Koruma talebi / Güvenlik garantisi (tampon bölge) koruyucuları yalnızca SAVUNMA savaşına girer:
              oyuncu saldırı başlatırsa, saldırdığı ülkeye yönelik koruyucu önyargıları (inc23 guard) silinir. */
(function () {
  'use strict';
  var LW = null, warOk = false, sbOk = false;

  /* ---- son savaşın tarafları (WCD.war sonucu) ---- */
  function installWar() {
    if (warOk) return true;
    if (!window.WCD || typeof WCD.war !== 'function') return false;
    var _w = WCD.war;
    var w2 = function (att, de) {
      var r = _w.apply(this, arguments);
      try { LW = { att: att, de: de, al: ((r && r.al) || []).slice(), dl: ((r && r.dl) || []).slice() }; } catch (e) { }
      return r;
    };
    for (var k in _w) { try { w2[k] = _w[k]; } catch (e) { } }   // v73/v102 işaretleri korunur (çift sarma olmasın)
    WCD.war = w2; warOk = true; return true;
  }

  function joined(p, e) {
    var a = [], d = [];
    if (LW && LW.att === p && LW.de === e) { a = LW.al; d = LW.dl; }
    else {
      try { if (window.WCD && WCD.side) { a = WCD.side(p, e).j || []; d = WCD.side(e, p).j || []; } } catch (x) { }
    }
    return { a: a, d: d };
  }

  function addFlags(boxId, list) {
    var box = document.getElementById(boxId); if (!box || !list || !list.length) return;
    var old = box.querySelector('.wcal'); if (old) old.remove();
    var nm = box.querySelector('.nm'); if (!nm) return;
    var h = '<div class="wcal" style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:3px 4px;margin:2px 0 3px">';
    list.forEach(function (c) { try { h += '<span title="' + String((window.M && M[c] && M[c].name) || c).replace(/"/g, '') + '" style="display:inline-flex;width:26px;height:18px">' + fimg(c, 'sm') + '</span>'; } catch (x) { } });
    h += '</div>';
    var d = document.createElement('div'); d.innerHTML = h; nm.parentNode.insertBefore(d.firstChild, nm.nextSibling);
  }

  /* ---- koruyucular yalnızca savunmada: oyuncu saldırdıysa o ülkeye karşı koruma önyargısını sil ---- */
  function clearGuard(p, e) {
    try {
      if (!window.G || p !== G.pl || typeof e !== 'string' || !G.inc23) return;
      for (var k in G.inc23) { var q = k.split('>'); if (q[1] === e && G.inc23[k] && G.inc23[k].guard) delete G.inc23[k]; }
    } catch (x) { }
  }

  function installSB() {
    if (sbOk) return true;
    if (typeof showBattle !== 'function') return false;
    var _sb = showBattle;
    showBattle = function (r, p, e) {
      try { clearGuard(p, e); } catch (x) { }
      var res = _sb.apply(this, arguments);
      try {
        if (typeof p === 'string' && typeof e === 'string') {
          var j = joined(p, e);
          addFlags('sa', j.a); addFlags('sdf', j.d);
        }
      } catch (x) { }
      return res;
    };
    sbOk = true; return true;
  }

  function go() { installWar(); installSB(); }
  go(); window.addEventListener('load', go);
  var n = 0, iv = setInterval(function () { go(); if ((warOk && sbOk) || ++n > 40) clearInterval(iv); }, 250);
})();
