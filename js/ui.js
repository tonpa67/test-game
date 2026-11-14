window.Game = window.Game || {};
(function () {
  'use strict';
  var C = (Game.CONFIG && Game.CONFIG.UI) || {};
  var COL = {
    OUTLINE: C.OUTLINE || '#32131E', WOOD_DARK: C.WOOD_DARK || '#4A2123', WOOD: C.WOOD || '#8A3625',
    WOOD_LIGHT: C.WOOD_LIGHT || '#AE4924', WOOD_HI: C.WOOD_HI || '#C46120',
    CREAM: C.CREAM || '#D9AB91', CREAM_LIGHT: C.CREAM_LIGHT || '#EBCFB4', SLOT_BG: C.SLOT_BG || '#C39478',
    SELECT: C.SELECT || '#FFE6A0', TEXT_DARK: C.TEXT_DARK || '#32131E', TEXT_LIGHT: C.TEXT_LIGHT || '#FFF4E0'
  };
  var FONT = Game.CONFIG.UI.font(8);

  function frame(ctx, x, y, w, h) {
    ctx.fillStyle = COL.OUTLINE; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COL.WOOD; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = COL.WOOD_LIGHT; ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = COL.WOOD_DARK; ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = COL.OUTLINE; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COL.CREAM_LIGHT; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = COL.WOOD_DARK;
    ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillRect(x + 1, y + 2, 1, h - 3);
  }

  function text(ctx, str, x, y, color, opts) {
    opts = opts || {};
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    var align = opts.align || 'left';
    ctx.textAlign = align;
    x = Math.round(x); y = Math.round(y);
    str = String(str);
    if (opts.shadow) {
      ctx.fillStyle = typeof opts.shadow === 'string' ? opts.shadow : COL.OUTLINE;
      ctx.fillText(str, x + 1, y + 1);
    }
    ctx.fillStyle = color || COL.TEXT_DARK;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function wrap(ctx, str, maxW) {
    ctx.font = FONT;
    var out = [], paras = String(str).split('\n');
    for (var p = 0; p < paras.length; p++) {
      var words = paras[p].split(' '), line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (line && ctx.measureText(test).width > maxW) { out.push(line); line = words[i]; }
        else line = test;
      }
      out.push(line);
    }
    return out;
  }

  function bar(ctx, x, y, w, h, frac, color, bg) {
    frac = Math.max(0, Math.min(1, frac || 0));
    ctx.fillStyle = bg || COL.OUTLINE; ctx.fillRect(x, y, w, h);
    var fw = Math.round(w * frac);
    if (frac > 0 && fw < 1) fw = 1;
    if (fw > 0) { ctx.fillStyle = color; ctx.fillRect(x, y, fw, h); }
  }

  function hpColor(frac) {
    return frac > 0.5 ? '#58C048' : (frac > 0.2 ? '#E8C030' : '#D84830');
  }

  function cursor(ctx, x, y, color) {
    ctx.fillStyle = color || COL.TEXT_DARK;
    ctx.fillRect(x, y, 1, 5);
    ctx.fillRect(x + 1, y + 1, 1, 3);
    ctx.fillRect(x + 2, y + 2, 1, 1);
  }

  function moreArrow(ctx, x, y, t) {
    if (Math.floor((t || 0) * 2.5) % 2 !== 0) return;
    ctx.fillStyle = COL.TEXT_DARK;
    ctx.fillRect(x, y, 5, 1);
    ctx.fillRect(x + 1, y + 1, 3, 1);
    ctx.fillRect(x + 2, y + 2, 1, 1);
  }

  Game.UI = { COL: COL, font: Game.CONFIG.UI.font, FONT: FONT, frame: frame, panel: panel, text: text, wrap: wrap, bar: bar,
    hpColor: hpColor, cursor: cursor, moreArrow: moreArrow };
})();
