// animals.js - the cows and chickens that wander around inside the animal pen.
window.Game = window.Game || {};
(function () {
  'use strict';

  var TYPES = {
    cow:     { hw: 18, hh: 8, speed: 15, fps: 6 },
    chicken: { hw: 10, hh: 5, speed: 20, fps: 8 },
    chick:   { hw: 6,  hh: 4, speed: 18, fps: 8 }
  };

  // type, picture, feet start position
  var START = [
    ['cow', 'cowF', 300, 260],
    ['cow', 'cowM', 395, 300],
    ['chicken', 'chickenRed', 350, 245],
    ['chicken', 'chickenRed', 410, 250],
    ['chicken', 'chickenBlonde', 300, 300],
    ['chicken', 'chickenBlonde', 370, 285],
    ['chick', 'chick', 330, 300]
  ];

  var DIRS = [];
  (function () {
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      DIRS.push({ x: Math.round(Math.cos(a) * 1000) / 1000, y: Math.round(Math.sin(a) * 1000) / 1000 });
    }
  })();

  var list = [];
  var area = null;          // where animals may stand (pen shrunk by 4px)
  var lastPlayerBox = null;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function box(a, x, y) {
    var t = TYPES[a.type];
    return { x: x - t.hw / 2, y: y - t.hh, w: t.hw, h: t.hh };
  }
  function hitbox(a) { return box(a, a.x, a.y); }
  function inside(b) {
    return b.x >= area.x && b.y >= area.y && b.x + b.w <= area.x + area.w && b.y + b.h <= area.y + area.h;
  }
  function grow(b, g) { return { x: b.x - g, y: b.y - g, w: b.w + g * 2, h: b.h + g * 2 }; }

  function canStand(a, x, y, pb) {
    var b = box(a, x, y);
    if (!inside(b)) return false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] !== a && overlap(b, hitbox(list[i]))) return false;
    }
    if (pb && overlap(b, pb)) return false;
    return true;
  }

  function setFacing(a) {
    if (a.type === 'cow') {
      if (Math.abs(a.vx) >= Math.abs(a.vy)) a.facing = a.vx < 0 ? 'left' : 'right';
      else a.facing = a.vy < 0 ? 'up' : 'down';
    } else if (Math.abs(a.vx) > 0.01) {
      a.side = a.vx > 0 ? 'right' : 'left';
    }
  }

  function startWalk(a, vx, vy) {
    a.state = 'walk';
    a.vx = vx; a.vy = vy;
    a.timer = rnd(1, 2);
    setFacing(a);
  }

  function makeAnimal(s) {
    var a = {
      type: s[0], img: s[1], x: s[2], y: s[3],
      facing: 'down', side: Math.random() < 0.5 ? 'left' : 'right',
      state: 'idle', timer: rnd(0.2, 2), vx: 0, vy: 0, anim: Math.random() * 4
    };
    a.drawable = {
      sortY: a.y,
      draw: function (ctx, cam) { drawAnimal(a, ctx, cam); }
    };
    return a;
  }

  function drawAnimal(a, ctx, cam) {
    var d = Game.Sprites.animals[a.type], t = TYPES[a.type];
    var frame, row, flip;
    if (a.state === 'walk') frame = Math.floor(a.anim) % d.frames;
    else if (a.type === 'cow') frame = 0;
    else frame = Math.floor(a.anim) % d.frames;
    if (a.type === 'cow') {
      row = d.row[a.facing];
      flip = (a.facing === 'right');
    } else {
      row = a.side === 'right' ? 1 : 0;
      flip = false;
    }
    Game.drawSprite(ctx, Game.Assets.get(a.img), frame * d.w, row * d.h, d.w, d.h,
      a.x - d.footX - cam.x, a.y - d.footY - cam.y, flip);
  }

  function updateOne(a, dt, pb) {
    var t = TYPES[a.type];
    a.timer -= dt;

    // Shoo rule: step away when the player is right next to an idle animal
    if (pb && a.state === 'idle' && overlap(grow(pb, 3), hitbox(a))) {
      var h = hitbox(a);
      var gx = (h.x + h.w / 2) - (pb.x + pb.w / 2);
      var gy = (h.y + h.h / 2) - (pb.y + pb.h / 2);
      if (Math.abs(gx) >= Math.abs(gy)) startWalk(a, (gx < 0 ? -1 : 1) * t.speed, 0);
      else startWalk(a, 0, (gy < 0 ? -1 : 1) * t.speed);
    } else if (a.state === 'idle') {
      if (a.timer <= 0) {
        var d = DIRS[Math.floor(Math.random() * DIRS.length)];
        startWalk(a, d.x * t.speed, d.y * t.speed);
      }
    } else if (a.timer <= 0) {
      a.state = 'idle';
      a.timer = rnd(1, 3);
    }

    if (a.state === 'walk') {
      var movedX = false, movedY = false;
      var nx = a.x + a.vx * dt, ny = a.y;
      if (a.vx !== 0 && canStand(a, nx, ny, pb)) { a.x = nx; movedX = true; }
      ny = a.y + a.vy * dt;
      if (a.vy !== 0 && canStand(a, a.x, ny, pb)) { a.y = ny; movedY = true; }
      if (!movedX && !movedY) {
        a.state = 'idle';
        a.timer = rnd(0.4, 1.2);
      }
      a.anim += dt * t.fps;
    } else if (a.type !== 'cow') {
      a.anim += dt * 3;
    }
    a.drawable.sortY = a.y;
  }

  // "Daisy the cow. Field type. ... Take Daisy as your partner?"
  function askPartner(speciesId, kind) {
    var C = Game.Creatures, D = Game.Dialog, T = Game.Team;
    if (!C || !D || !D.open || !T || T.hasStarter()) return;
    var sp = C.SPECIES[speciesId];
    var typeName = (C.TYPES && C.TYPES[sp.type] && C.TYPES[sp.type].name) || sp.type;
    D.open({
      speaker: sp.name,
      lines: [
        sp.name + ' the ' + kind + '. ' + typeName + ' type.',
        sp.blurb || '',
        'Take ' + sp.name + ' as your partner?'
      ],
      choices: ['Yes', 'No'],
      onDone: function (choice) {
        if (choice !== 0 || T.hasStarter()) return;
        T.add(C.create(speciesId, 5));
        if (Game.Audio && Game.Audio.play) Game.Audio.play('levelUp');
        if (Game.HUD && Game.HUD.showMessage) Game.HUD.showMessage(sp.name + ' is now your partner!', 3);
      }
    });
  }

  var A = Game.Animals = {
    init: function (pen) {
      area = { x: pen.x + 4, y: pen.y + 4, w: pen.w - 8, h: pen.h - 8 };
      lastPlayerBox = null;
      list = START.map(makeAnimal);
      // the first red chicken is the one that lays the eggs
      for (var i = 0; i < list.length; i++) {
        if (list[i].img === 'chickenRed') { list[i].layer = true; break; }
      }
    },
    getLayer: function () {
      for (var i = 0; i < list.length; i++) {
        if (list[i].layer) return { x: list[i].x, y: list[i].y, side: list[i].side };
      }
      return null;
    },
    update: function (dt, player) {
      if (!area) return;
      var pb = player && player.hitbox ? player.hitbox() : null;
      lastPlayerBox = pb;
      for (var i = 0; i < list.length; i++) updateOne(list[i], dt, pb);
    },
    getDrawables: function () {
      return list.map(function (a) { return a.drawable; });
    },
    blocksRect: function (x, y, w, h) {
      var r = { x: x, y: y, w: w, h: h };
      for (var i = 0; i < list.length; i++) {
        var b = hitbox(list[i]);
        if (lastPlayerBox && overlap(b, lastPlayerBox)) continue; // never trap the player
        if (overlap(r, b)) return true;
      }
      return false;
    },
    getRects: function () {
      return list.map(hitbox);
    },
    // The animal closest to (x,y) within `reach` pixels of its feet, as something the player can use.
    // Choosing it asks if it should become the player's partner.
    getNearest: function (x, y, reach) {
      var best = null, bestD = reach * reach + 1;
      for (var i = 0; i < list.length; i++) {
        var dx = list[i].x - x, dy = list[i].y - y;
        var d = dx * dx + dy * dy;
        if (d <= reach * reach && d < bestD) { best = list[i]; bestD = d; }
      }
      if (!best) return null;
      var C = Game.Creatures;
      var id = C && C.speciesForAnimalImg ? C.speciesForAnimalImg(best.img) : null;
      if (!id || !C.SPECIES || !C.SPECIES[id]) return null;
      return { interact: function () { askPartner(id, best.type === 'chick' ? 'chick' : best.type); } };
    }
  };
})();
