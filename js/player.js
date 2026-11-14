(function () {
  window.Game = window.Game || {};
  var G = window.Game;

  var FRAME = 32;
  var FEET_X = 16, FEET_Y = 25;
  var HIT_W = 10, HIT_H = 6;
  var IDLE_FRAMES = 4, WALK_FRAMES = 6;
  var ROW = { down: 0, up: 1, left: 2, right: 2 };

  function Player(x, y) {
    this.x = x;
    this.y = y;
    this.facing = 'down';
    this.moving = false;
    this.slow = false;
    this.animTime = 0;
  }

  Player.prototype.hitbox = function () {
    return { x: this.x - HIT_W / 2, y: this.y - HIT_H, w: HIT_W, h: HIT_H };
  };

  Player.prototype.update = function (dt, input, world) {
    var cfg = G.CONFIG || {};
    var runSpeed = cfg.RUN_SPEED || 96;
    var walkSpeed = cfg.WALK_SPEED || 48;

    var l = input.isDown('left'), r = input.isDown('right');
    var u = input.isDown('up'), d = input.isDown('down');
    var dx = (r ? 1 : 0) - (l ? 1 : 0);
    var dy = (d ? 1 : 0) - (u ? 1 : 0);
    this.slow = input.isDown('slow');
    var speed = this.slow ? walkSpeed : runSpeed;

    // Facing: keep current if still one of the pressed directions, else horizontal first.
    if (dx !== 0 || dy !== 0) {
      var pressed = { left: l && !r, right: r && !l, up: u && !d, down: d && !u };
      if (!pressed[this.facing]) {
        if (dx !== 0) this.facing = dx < 0 ? 'left' : 'right';
        else this.facing = dy < 0 ? 'up' : 'down';
      }
    }

    this.moving = (dx !== 0 || dy !== 0);
    if (this.moving) {
      var len = Math.sqrt(dx * dx + dy * dy);
      var mx = dx / len * speed * dt;
      var my = dy / len * speed * dt;
      // Move one axis at a time so the player slides along walls.
      if (mx !== 0) {
        if (!world.isSolidRect(this.x + mx - HIT_W / 2, this.y - HIT_H, HIT_W, HIT_H)) this.x += mx;
      }
      if (my !== 0) {
        if (!world.isSolidRect(this.x - HIT_W / 2, this.y + my - HIT_H, HIT_W, HIT_H)) this.y += my;
      }
    }

    // Animation clock
    var fps;
    if (this.moving) {
      fps = (cfg.WALK_FPS || 10) * (this.slow ? walkSpeed / runSpeed : 1);
    } else {
      fps = cfg.IDLE_FPS || 5;
    }
    this.animTime += dt * fps;

    if (input.wasPressed('interact') && world.getInteractableAt) {
      var obj = world.getInteractableAt(this.x, this.y, this.facing);
      if (obj && obj.interact) obj.interact();
    }
  };

  Player.prototype.getDrawable = function () {
    var self = this;
    return {
      sortY: this.y,
      draw: function (ctx, cam) {
        var img = G.Assets.get(self.moving ? 'charWalk' : 'charIdle');
        var n = self.moving ? WALK_FRAMES : IDLE_FRAMES;
        var frame = Math.floor(self.animTime) % n;
        var row = ROW[self.facing];
        G.drawSprite(ctx, img, frame * FRAME, row * FRAME, FRAME, FRAME,
          self.x - FEET_X - cam.x, self.y - FEET_Y - cam.y, self.facing === 'left');
      }
    };
  };

  G.Player = Player;
})();
