(function () {
  window.Game = window.Game || {};
  var G = window.Game;

  var SHOW_TIME = 6;   // seconds fully visible
  var FADE_TIME = 1.5; // seconds to fade out
  var LINES = [
    'WASD move, Shift walk slowly, E use/talk',
    'I backpack, 1-5/scroll/click: hotbar'
  ];
  var elapsed = 0;
  var message = null; // {text, left, total}

  function ui() {
    var U = (G.CONFIG && G.CONFIG.UI) || {};
    return {
      outline: U.OUTLINE || '#32131E',
      fill: U.CREAM_LIGHT || '#EBCFB4',
      text: U.TEXT_DARK || '#32131E',
      reserve: U.HOTBAR_RESERVE != null ? U.HOTBAR_RESERVE : 32
    };
  }

  function box(ctx, x, y, w, h, c) {
    ctx.fillStyle = c.outline;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = c.fill;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }

  // Coin counter next to the hotbar. Only shown once you have coins or a partner animal.
  function drawCoins(ctx, viewW, viewH) {
    var Wl = G.Wallet;
    if (!Wl || !Wl.get) return;
    var coins = Wl.get() || 0;
    if (!(coins > 0 || (G.Team && G.Team.hasStarter && G.Team.hasStarter()))) return;
    var inv = G.Inventory;
    if (!inv || !inv.getLayout) return;
    var L = inv.getLayout(viewW, viewH).hotbar.frame;
    var U = (G.CONFIG && G.CONFIG.UI) || {};
    var str = String(Math.floor(coins));
    ctx.font = Game.CONFIG.UI.font(8);
    var tw = Math.ceil(ctx.measureText(str).width);
    var w = Math.max(34, tw + 18), h = 12;
    var x = L.x + L.w + 4, y = L.y + 7;
    if (x + w > viewW - 2) { x = viewW - w - 2; y = L.y - h - 3; }
    x = Math.round(x); y = Math.round(y);
    var out = U.OUTLINE || '#32131E';
    ctx.fillStyle = out; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = U.WOOD || '#8A3625'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = U.WOOD_LIGHT || '#AE4924'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = U.WOOD_DARK || '#4A2123'; ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
    // gold coin 6x6
    var cx = x + 4, cy = y + 3;
    ctx.fillStyle = '#B07818'; ctx.fillRect(cx + 1, cy, 4, 6); ctx.fillRect(cx, cy + 1, 6, 4);
    ctx.fillStyle = '#FFD040'; ctx.fillRect(cx + 1, cy + 1, 4, 4);
    ctx.fillStyle = '#FFF0A0'; ctx.fillRect(cx + 2, cy + 1, 1, 2);
    // number with outline
    var tx = x + 12, ty = y + 2;
    ctx.fillStyle = out;
    ctx.fillText(str, tx - 1, ty); ctx.fillText(str, tx + 1, ty);
    ctx.fillText(str, tx, ty - 1); ctx.fillText(str, tx, ty + 1);
    ctx.fillStyle = U.TEXT_LIGHT || '#FFF4E0';
    ctx.fillText(str, tx, ty);
  }

  G.HUD = {
    showMessage: function (text, seconds) {
      var s = Number(seconds);
      if (!(s > 0)) s = 1.5;
      message = { text: String(text), left: s };
    },

    draw: function (ctx, viewW, viewH, dt) {
      dt = dt || 0;
      elapsed += dt;
      var c = ui();

      ctx.save();
      ctx.font = Game.CONFIG.UI.font(8);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      // Control hint (fades out after a few seconds)
      var hintTop = null;
      var alpha = 1;
      if (elapsed > SHOW_TIME) alpha = 1 - (elapsed - SHOW_TIME) / FADE_TIME;
      if (alpha > 0) {
        var w = 0;
        for (var i = 0; i < LINES.length; i++) {
          w = Math.max(w, Math.ceil(ctx.measureText(LINES[i]).width));
        }
        var bw = w + 8;
        var bx = Math.round((viewW - bw) / 2);
        var by = Math.round(viewH - c.reserve - 2 - 22);
        hintTop = by;
        ctx.globalAlpha = alpha;
        box(ctx, bx, by, bw, 22, c);
        ctx.fillStyle = c.text;
        for (var j = 0; j < LINES.length; j++) {
          ctx.fillText(LINES[j], bx + 4, by + 3 + j * 9);
        }
        ctx.globalAlpha = 1;
      }

      // Short message (e.g. "Inventory full")
      if (message) {
        message.left -= dt;
        if (message.left <= 0) {
          message = null;
        } else {
          var ma = message.left < 0.3 ? message.left / 0.3 : 1;
          var mw = Math.ceil(ctx.measureText(message.text).width) + 8;
          var mx = Math.round((viewW - mw) / 2);
          var my = hintTop !== null ? hintTop - 4 - 12 : viewH - c.reserve - 16;
          ctx.globalAlpha = ma;
          box(ctx, mx, my, mw, 12, c);
          ctx.fillStyle = c.text;
          ctx.fillText(message.text, mx + 4, my + 2);
          ctx.globalAlpha = 1;
        }
      }

      try { drawCoins(ctx, viewW, viewH); } catch (e) {}

      ctx.restore();
    }
  };
})();
