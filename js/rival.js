// rival.js - Farmer Rex, the friendly neighbour who battles you with his own farm animal.
window.Game = window.Game || {};
(function () {
  'use strict';

  var NAME = 'Farmer Rex';
  var rex = null;            // {x, y, facing, wave, waveT, near, cooldown, clock, sheet}
  var TINT = null;           // optional outfit colour (e.g. '#C8883C'); null keeps the original colours

  function ui(name, fallback) {
    var u = Game.CONFIG && Game.CONFIG.UI;
    return (u && u[name]) || fallback;
  }

  // Layers base, outfit and hair once into one picture (same source area for all three).
  function buildSheet() {
    var A = Game.Assets;
    var base = A.get('rivalBase'), outfit = A.get('rivalOutfit'), hair = A.get('rivalHair');
    if (!base) return null;
    var w = base.width, h = Math.min(base.height, 192);
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0, w, h, 0, 0, w, h);
    if (outfit) {
      var piece = outfit;
      if (TINT) {
        piece = document.createElement('canvas');
        piece.width = outfit.width; piece.height = outfit.height;
        var pg = piece.getContext('2d');
        pg.drawImage(outfit, 0, 0);
        pg.globalCompositeOperation = 'multiply';
        pg.fillStyle = TINT;
        pg.fillRect(0, 0, piece.width, piece.height);
        pg.globalCompositeOperation = 'destination-in';
        pg.drawImage(outfit, 0, 0);
        pg.globalCompositeOperation = 'source-over';
      }
      g.drawImage(piece, 0, 0, w, Math.min(piece.height, h), 0, 0, w, Math.min(piece.height, h));
    }
    if (hair) {
      g.drawImage(hair, 0, 0, w, Math.min(hair.height, h), 0, 0, w, Math.min(hair.height, h));
    }
    return c;
  }

  function dist(p) {
    if (!rex || !p) return 9999;
    var dx = p.x - rex.x, dy = p.y - rex.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function leadName() {
    var T = Game.Team, C = Game.Creatures;
    var lead = T && T.lead ? T.lead() : null;
    if (!lead) return 'your animal';
    var sp = C && C.SPECIES && C.SPECIES[lead.species];
    return sp ? sp.name : 'your animal';
  }

  function startBattle() {
    var B = Game.Battle, T = Game.Team, C = Game.Creatures;
    if (!B || !B.start || !T || !C || !T.lead) return;
    var lead = T.lead();
    if (!lead) return;
    var rivalSpecies = C.pickRivalSpecies ? C.pickRivalSpecies(lead.species, Math.random) : null;
    if (!rivalSpecies) return;
    var foe = C.create(rivalSpecies, lead.level);
    var foeName = C.SPECIES[foe.species] ? C.SPECIES[foe.species].name : 'an animal';
    var cam = Game.Camera || { x: 0, y: 0 };
    var started = B.start({
      trainer: 'Rex',
      foe: foe,
      player: lead,
      introLines: [NAME + ' wants to battle!', 'Rex sent out ' + foeName + '!', 'Go, ' + leadName() + '!'],
      winLines: ['Rex: Wow, you beat me! That was fun!', 'Rex: Come back for a rematch any time!'],
      loseLines: ['Rex: Yes, I won this time!', 'Rex: Rest up and try again, friend!'],
      from: { x: Math.round(rex.x - cam.x), y: Math.round(rex.y - 24 * (Game.Sprites.rival.drawScale || 1) - cam.y) },
      onBlack: function (result) {
        if (result && result.outcome === 'lose') {
          if (T.healAll) T.healAll();
          var p = Game.getPlayer ? Game.getPlayer() : null;
          var W = Game.World;
          if (p && W && W.spawn) {
            p.x = W.spawn.x; p.y = W.spawn.y; p.facing = 'down';
          }
        }
      },
      onEnd: function (result) {
        if (rex) rex.cooldown = 0.5;
        if (result && result.outcome === 'lose' && Game.HUD && Game.HUD.showMessage) {
          Game.HUD.showMessage('You hurried home to rest. ' + leadName() + ' feels better.', 3);
        }
      }
    });
    if (started === false && rex) rex.cooldown = 0.5;
  }

  function talk() {
    if (!rex || rex.cooldown > 0) return;
    var D = Game.Dialog;
    if (!D || !D.open) return;
    var T = Game.Team;
    rex.cooldown = 0.5;
    if (!(T && T.hasStarter && T.hasStarter())) {
      D.open({
        speaker: NAME,
        lines: ["Hi, I'm Farmer Rex!", 'Every farmer needs an animal partner.', 'Go pick one in the pen, then come battle me!']
      });
      return;
    }
    D.open({
      speaker: NAME,
      lines: ['Oh, you have a partner now! Let me see how strong ' + leadName() + ' is.', "Let's have a friendly battle!"],
      onDone: function () { startBattle(); }
    });
  }

  function drawBubble(ctx, x, y) {
    var out = ui('OUTLINE', '#32131E'), fill = ui('CREAM_LIGHT', '#EBCFB4'), dk = ui('WOOD_DARK', '#4A2123');
    ctx.fillStyle = out; ctx.fillRect(x, y, 11, 9);
    ctx.fillRect(x + 4, y + 9, 3, 1);
    ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, 9, 7);
    ctx.fillRect(x + 5, y + 9, 1, 1);
    ctx.fillStyle = dk;
    ctx.fillRect(x + 2, y + 4, 2, 2); ctx.fillRect(x + 5, y + 4, 2, 2); ctx.fillRect(x + 8, y + 4, 1, 2);
  }

  // Each frame is copied (flipped if needed) into its own small picture with 1px of empty padding,
  // so smooth shrinking never blends in the neighbouring frames of the sheet.
  var FRAME_PAD = 1, picCache = {};
  function framePic(sx, sy, flip) {
    var S = Game.Sprites.rival;
    var key = sx + ',' + sy + ',' + (flip ? 1 : 0);
    var c = picCache[key];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = S.cw + FRAME_PAD * 2; c.height = S.ch + FRAME_PAD * 2;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(rex.sheet, sx, sy, S.cw, S.ch, FRAME_PAD, FRAME_PAD, S.cw, S.ch);
    picCache[key] = c;
    return c;
  }

  function drawRex(ctx, cam) {
    var S = Game.Sprites.rival;
    if (!rex || !rex.sheet) return;
    var row, flip = false, group = S.groupX[S.standGroup], frame = S.standFrame;
    if (rex.facing === 'down') row = S.row.down;
    else if (rex.facing === 'up') row = S.row.up;
    else {
      row = S.row.side;
      flip = (rex.facing === 'left') === !!S.sideFacesRight;
    }
    var bob = 0;
    if (rex.wave > 0) { group = S.groupX.wave; frame = Math.floor(rex.waveT * 6) % 4; }
    else bob = Math.floor(rex.clock / 0.5) % 2;
    var sx = group + frame * S.cw, sy = S.top + row * S.ch;
    var k = S.drawScale || 1;
    var pic = framePic(sx, sy, flip);
    var P = FRAME_PAD;
    // pic has P transparent pixels around the cell; the feet sit at (footX, footY) of the cell
    var fx = flip ? S.cw - S.footX : S.footX;
    var dx = Math.round(rex.x - (fx + P) * k - cam.x), dy = Math.round(rex.y - (S.footY + P) * k - cam.y - bob);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(pic, 0, 0, pic.width, pic.height, dx, dy, pic.width * k, pic.height * k);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;    if (rex.near && !(Game.Dialog && Game.Dialog.isOpen && Game.Dialog.isOpen())) {
      var b = Math.floor(rex.clock / 0.5) % 2;
      drawBubble(ctx, Math.round(rex.x - 5 - cam.x), Math.round(rex.y - 14 - 32 * (S.drawScale || 1) - cam.y) + b);
    }
  }

  var drawable = { sortY: 0, draw: drawRex };

  Game.Rival = {
    name: NAME,
    init: function (x, y) {
      rex = { x: x, y: y, facing: 'down', wave: 0, waveT: 0, near: false, away: true, cooldown: 0, clock: 0, sheet: null };
      try { rex.sheet = buildSheet(); } catch (e) { rex.sheet = null; }
      drawable.sortY = y;
    },
    // Solid box at his feet (the world adds it to what blocks the player).
    getSolid: function () {
      return rex ? { x: rex.x - 5, y: rex.y - 6, w: 10, h: 6 } : null;
    },
    update: function (dt, player) {
      if (!rex) return;
      rex.clock += dt;
      if (rex.cooldown > 0) rex.cooldown = Math.max(0, rex.cooldown - dt);
      var d = dist(player);
      if (player && d < 64) {
        var dx = player.x - rex.x, dy = player.y - rex.y;
        if (Math.abs(dx) > Math.abs(dy)) rex.facing = dx < 0 ? 'left' : 'right';
        else rex.facing = dy < 0 ? 'up' : 'down';
      }
      if (d >= 56) rex.away = true;
      if (d < 40 && rex.away) { rex.away = false; rex.wave = 1.5; rex.waveT = 0; }
      if (rex.wave > 0) { rex.wave -= dt; rex.waveT += dt; if (rex.wave < 0) rex.wave = 0; }
      rex.near = d < 24;
    },
    getDrawable: function () { return rex ? drawable : null; },
    getInteractable: function (x, y, facing) {
      if (!rex) return null;
      var dx = 0, dy = 0;
      if (facing === 'left') dx = -1; else if (facing === 'right') dx = 1;
      else if (facing === 'up') dy = -1; else dy = 1;
      var px = x + dx * 12, py = y + dy * 12 - (dx !== 0 ? 4 : 0);
      var r = { x: rex.x - 7, y: rex.y - 9, w: 14, h: 11 };
      if (px >= r.x - 2 && px <= r.x + r.w + 2 && py >= r.y - 2 && py <= r.y + r.h + 2) {
        return { interact: talk };
      }
      return null;
    },
    interact: talk
  };
})();
