window.Game = window.Game || {};
(function () {
  var C = Game.CONFIG;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  document.title = C.TITLE;

  // Stand-ins so the game runs even if the real files are missing.
  var StubWorld = {
    widthPx: 640, heightPx: 480, spawn: { x: 320, y: 240 },
    init: function () {}, update: function () {},
    drawGround: function (c, cam) { c.fillStyle = '#5a9a3c'; c.fillRect(0, 0, cam.w, cam.h); },
    getDrawables: function () { return []; },
    isSolidRect: function (x, y, w, h) { return x < 0 || y < 0 || x + w > 640 || y + h > 480; },
    getSolidRects: function () { return []; },
    getInteractableAt: function () { return null; }
  };
  function StubPlayer(x, y) { this.x = x; this.y = y; this.facing = 'down'; }
  StubPlayer.prototype.update = function (dt, input) {
    var dx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    var dy = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var sp = input.isDown('slow') ? C.WALK_SPEED : C.RUN_SPEED;
    this.x += dx / len * sp * dt; this.y += dy / len * sp * dt;
  };
  StubPlayer.prototype.getDrawable = function () {
    var p = this;
    return { sortY: p.y, draw: function (c, cam) {
      c.fillStyle = '#d33'; c.fillRect(Math.round(p.x - 5 - cam.x), Math.round(p.y - 16 - cam.y), 10, 16);
    } };
  };
  StubPlayer.prototype.hitbox = function () { return { x: this.x - 5, y: this.y - 3, w: 10, h: 6 }; };

  var World, player, cam = Game.Camera, last = 0, scale = 1;

  function resize() {
    var iw = window.innerWidth, ih = window.innerHeight;
    scale = Math.max(1, Math.floor(Math.min(iw / C.BASE_VIEW_W, ih / C.BASE_VIEW_H)));
    var vw = Math.max(1, Math.floor(iw / scale));
    var vh = Math.max(1, Math.floor(ih / scale));
    canvas.width = vw; canvas.height = vh;
    canvas.style.width = (vw * scale) + 'px';
    canvas.style.height = (vh * scale) + 'px';
    cam.w = vw; cam.h = vh;
    ctx.imageSmoothingEnabled = false;
  }

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    if (!(dt >= 0)) dt = 0;
    last = now;
    var Input = Game.Input;

    if (Input.wasPressed('debug')) C.DEBUG = !C.DEBUG;

    var Inv = Game.Inventory;
    if (Inv) Inv.handleInput(Input);
    var paused = !!(Inv && Inv.isOpen());
    if (!paused) {
      player.update(dt, Input, World);
      World.update(dt, player);
    }
    cam.follow(player.x, player.y - 8, World.widthPx, World.heightPx);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    World.drawGround(ctx, cam);

    var list = World.getDrawables().slice();
    list.push(player.getDrawable());
    list.sort(function (a, b) { return a.sortY - b.sortY; });
    for (var i = 0; i < list.length; i++) list[i].draw(ctx, cam);

    if (C.DEBUG) {
      ctx.fillStyle = 'rgba(255,0,0,0.35)';
      ctx.strokeStyle = 'rgba(255,0,0,0.9)';
      ctx.lineWidth = 1;
      var rects = World.getSolidRects();
      for (var j = 0; j < rects.length; j++) {
        var r = rects[j];
        ctx.fillRect(Math.round(r.x - cam.x), Math.round(r.y - cam.y), r.w, r.h);
      }
      var h = player.hitbox();
      ctx.fillRect(Math.round(h.x - cam.x), Math.round(h.y - cam.y), h.w, h.h);
      ctx.strokeRect(Math.round(h.x - cam.x) + 0.5, Math.round(h.y - cam.y) + 0.5, h.w - 1, h.h - 1);
    }

    if (Game.HUD) Game.HUD.draw(ctx, cam.w, cam.h, dt);
    if (Inv) Inv.draw(ctx, cam.w, cam.h);
    Input.endFrame();
    requestAnimationFrame(frame);
  }

  function start() {
    World = Game.World || StubWorld;
    World.init();
    var Player = Game.Player || StubPlayer;
    player = new Player(World.spawn.x, World.spawn.y);
    resize();
    last = performance.now();
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  Game.Assets.load().then(start).catch(function (err) {
    if (window.console) console.error(err);
  });
})();
