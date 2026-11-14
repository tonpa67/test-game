// eggs.js - the red chicken lays an egg now and then; the player can pick it up with E.
window.Game = window.Game || {};
(function () {
  'use strict';

  var LAY_INTERVAL = 60;   // seconds between eggs
  var MAX_EGGS = 5;        // most eggs lying on the ground at once
  var RETRY = 2;           // seconds to wait when no free spot was found
  var REACH = 16;          // how close the player must be to pick an egg up

  var eggs = [];
  var pen = null;
  var area = null;         // where eggs may lie (pen shrunk by 4px)
  var timer = LAY_INTERVAL;
  var clock = 0;           // game time that only runs while the game is not paused
  var lastPlayer = null;
  var nearest = null;

  var promptDrawable = { sortY: Infinity, draw: function (ctx, cam) { drawPrompt(ctx, cam); } };

  function ui(name, fallback) {
    var u = Game.CONFIG && Game.CONFIG.UI;
    return (u && u[name]) || fallback;
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function grow(b, g) { return { x: b.x - g, y: b.y - g, w: b.w + g * 2, h: b.h + g * 2 }; }
  function footprint(x, y) { return { x: x - 4, y: y - 7, w: 8, h: 7 }; }

  function validSpot(x, y) {
    if (!area) return false;
    var f = footprint(x, y);
    if (f.x < area.x || f.y < area.y || f.x + f.w > area.x + area.w || f.y + f.h > area.y + area.h) return false;
    var W = Game.World, i;
    if (W && W.isStaticSolidRect && W.isStaticSolidRect(f.x, f.y, f.w, f.h)) return false;
    if (Game.Animals && Game.Animals.getRects) {
      var rects = Game.Animals.getRects();
      for (i = 0; i < rects.length; i++) if (overlap(f, grow(rects[i], 1))) return false;
    }
    if (lastPlayer && lastPlayer.hitbox && overlap(f, grow(lastPlayer.hitbox(), 4))) return false;
    for (i = 0; i < eggs.length; i++) {
      if (overlap(f, grow(footprint(eggs[i].x, eggs[i].y), 3))) return false;
    }
    if (W && W.pathStones) {
      for (i = 0; i < W.pathStones.length; i++) {
        var p = W.pathStones[i];
        if (overlap(f, { x: p.x, y: p.y, w: 13, h: 13 })) return false;
      }
    }
    return true;
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function findSpot() {
    var layer = Game.Animals && Game.Animals.getLayer ? Game.Animals.getLayer() : null;
    var i, x, y;
    if (!layer) {
      for (i = 0; i < 16; i++) {
        x = Math.round(rnd(area.x, area.x + area.w));
        y = Math.round(rnd(area.y, area.y + area.h));
        if (validSpot(x, y)) return { x: x, y: y };
      }
      return null;
    }
    var behind = layer.side === 'right' ? -1 : 1;   // the chicken looks toward its side
    for (i = 0; i < 16; i++) {
      var dist = rnd(8, 16);
      var ang = Math.random() * Math.PI * 2;
      var cx = Math.cos(ang);
      // the first tries only look behind the chicken
      if (i < 10 && cx * behind < 0) cx = -cx;
      x = Math.round(layer.x + cx * dist);
      y = Math.round(layer.y + Math.sin(ang) * dist);
      if (validSpot(x, y)) return { x: x, y: y };
    }
    return null;
  }

  function makeEgg(x, y) {
    var egg = {
      x: x, y: y, born: clock,
      drawable: null
    };
    egg.drawable = {
      sortY: y,
      draw: function (ctx, cam) { drawEgg(egg, ctx, cam); }
    };
    egg.interact = function () { pickUp(egg); };
    return egg;
  }

  function drawEgg(egg, ctx, cam) {
    var S = Game.Sprites;
    if (!S || !S.egg) return;
    var age = clock - egg.born;
    var r = S.egg;
    if (age < 0.9 && Math.floor(age / 0.15) % 2 === 0 && S.eggWobble) r = S.eggWobble;
    S.draw(ctx, r, egg.x - 8, egg.y - 15, cam);
  }

  function removeEgg(egg) {
    var i = eggs.indexOf(egg);
    if (i >= 0) eggs.splice(i, 1);
    if (nearest === egg) nearest = null;
  }

  function pickUp(egg) {
    var left = Game.Inventory && Game.Inventory.add ? Game.Inventory.add('egg', 1) : 1;
    if (left === 0) {
      removeEgg(egg);
      if (Game.Audio && Game.Audio.play) Game.Audio.play('pickup');
    } else {
      if (Game.HUD && Game.HUD.showMessage) Game.HUD.showMessage('Inventory full', 1.5);
      if (Game.Audio && Game.Audio.play) Game.Audio.play('denied');
    }
  }

  function tryLay() {
    var spot = findSpot();
    if (!spot) return false;
    eggs.push(makeEgg(spot.x, spot.y));
    return true;
  }

  function drawPrompt(ctx, cam) {
    if (!nearest) return;
    if (Game.Inventory && Game.Inventory.isOpen && Game.Inventory.isOpen()) return;
    var bob = Math.floor(clock / 0.5) % 2;
    var x = Math.round(nearest.x - 4 - cam.x);
    var y = Math.round(nearest.y - 26 - cam.y) + bob;
    ctx.fillStyle = ui2('OUTLINE', '#32131E');
    ctx.fillRect(x, y, 9, 9);
    ctx.fillStyle = ui2('CREAM_LIGHT', '#EBCFB4');
    ctx.fillRect(x + 1, y + 1, 7, 7);
    ctx.fillStyle = ui2('WOOD_DARK', '#4A2123');
    ctx.fillRect(x + 1, y + 7, 7, 1);
    // the letter E, 3 wide and 5 tall
    ctx.fillStyle = ui2('TEXT_DARK', '#32131E');
    ctx.fillRect(x + 3, y + 2, 3, 1);
    ctx.fillRect(x + 3, y + 3, 1, 1);
    ctx.fillRect(x + 3, y + 4, 2, 1);
    ctx.fillRect(x + 3, y + 5, 1, 1);
    ctx.fillRect(x + 3, y + 6, 3, 1);
  }
  function ui2(name, fallback) { return ui(name, fallback); }

  function closest(x, y, r) {
    var best = null, bestD = r * r + 1;
    for (var i = 0; i < eggs.length; i++) {
      var dx = eggs[i].x - x, dy = eggs[i].y - y;
      var d = dx * dx + dy * dy;
      if (d <= r * r && d < bestD) { best = eggs[i]; bestD = d; }
    }
    return best;
  }

  Game.Eggs = {
    init: function (p) {
      pen = p;
      area = { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 8 };
      eggs = [];
      timer = LAY_INTERVAL;
      clock = 0;
      nearest = null;
    },
    update: function (dt, player) {
      if (!area) return;
      clock += dt;
      lastPlayer = player || lastPlayer;
      timer -= dt;
      if (timer <= 0) {
        if (eggs.length >= MAX_EGGS) timer = LAY_INTERVAL;
        else timer = tryLay() ? LAY_INTERVAL : RETRY;
      }
      nearest = lastPlayer ? closest(lastPlayer.x, lastPlayer.y - 3, REACH) : null;
    },
    getDrawables: function () {
      var out = [];
      for (var i = 0; i < eggs.length; i++) {
        eggs[i].drawable.sortY = eggs[i].y;
        out.push(eggs[i].drawable);
      }
      if (nearest) out.push(promptDrawable);
      return out;
    },
    getNearest: function (x, y, reach) { return closest(x, y, reach); },
    // Test helper: lay an egg right now (does nothing if 5 are already lying around).
    layNow: function () {
      if (eggs.length >= MAX_EGGS) return false;
      return tryLay();
    },
    count: function () { return eggs.length; }
  };
})();
