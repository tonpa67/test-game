(function () {
  window.Game = window.Game || {};
  var G = window.Game;

  var SHOW_TIME = 6;   // seconds fully visible
  var FADE_TIME = 1.5; // seconds to fade out
  var TEXT = 'WASD to move, Shift to walk slowly, E to use';
  var elapsed = 0;

  G.HUD = {
    draw: function (ctx, viewW, viewH, dt) {
      elapsed += dt || 0;
      var alpha = 1;
      if (elapsed > SHOW_TIME) alpha = 1 - (elapsed - SHOW_TIME) / FADE_TIME;
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '8px monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      var w = Math.ceil(ctx.measureText(TEXT).width);
      var bx = Math.round((viewW - w) / 2) - 4;
      var by = Math.round(viewH - 18);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx, by, w + 8, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(TEXT, bx + 4, by + 2);
      ctx.restore();
    }
  };
})();
