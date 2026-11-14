window.Game = window.Game || {};
Game.Camera = {
  x: 0, y: 0, w: 320, h: 180,
  follow: function (tx, ty, worldW, worldH) {
    var x = tx - this.w / 2;
    var y = ty - this.h / 2;
    // Centre the world if the view is bigger than the world.
    x = worldW <= this.w ? (worldW - this.w) / 2 : Math.max(0, Math.min(worldW - this.w, x));
    y = worldH <= this.h ? (worldH - this.h) / 2 : Math.max(0, Math.min(worldH - this.h, y));
    this.x = Math.round(x);
    this.y = Math.round(y);
  }
};
