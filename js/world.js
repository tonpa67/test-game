// world.js - the farm map, what is on it, and what blocks the player.
// The map is drawn with letters below, so you can edit it by hand.
window.Game = window.Game || {};
(function () {
  'use strict';

  var TILE = 16;

  // GROUND: '.' grass, 'd' dirt (40 columns x 30 rows)
  var GROUND = [
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '.....dddddddd...........................',
    '.....dddddddd...........................',
    '.....dddddddd...........................',
    '.....dddddddd...........................',
    '.....dddddddd...........................',
    '.....dddddddd...........................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................'
  ];

  // OBJECTS: T tree, t stump / small tree, F fence, C chest, o stepping stone,
  // H house (top-left tile), P player start, c crop, s loose stone
  var OBJECTS = [
    '.......................................F',
    '.T.TtT.T.T.T.TtT.T.T.T.T.TtT.T.T.T.T.T.F',
    '.......................................F',
    '.T....H................................F',
    '.......................................F',
    '.T......................T...........s..F',
    '......................T................F',
    '.T.........................T...........F',
    '....s................t...T.............F',
    '.T......C.......s......T...............F',
    '.t.......o................t............F',
    '.T......o...................s..........F',
    '.........o.......................T.....F',
    '.T..FFFFo.FFFF..FFFFF..FFFFF...T...t...F',
    '....F....o...F..F...s......F...........F',
    '.T..F.cco..ccF..F..........F..t...T....F',
    '....F........F..F..........F....T......F',
    '.T..F.cc..cc.F..F.......s..F...........F',
    '....F...c...cF..F.s........F...........F',
    '.T..F.c...c..F..F..........F...........F',
    '....FFFFFFFFFF..FFFFFFFFFFFF........s..F',
    '.T.....................................F',
    '.t..............t...........T....T.....F',
    '.T..................t..................F',
    '............s..T...........t..T........F',
    '.T...s.............T.........t....T....F',
    '.................T.............T.......F',
    '.T.....................................F',
    '.......................................F',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
  ];

  var COLS = 40, ROWS = 30;

  var W = Game.World = {
    widthPx: COLS * TILE,
    heightPx: ROWS * TILE,
    spawn: { x: 152, y: 168 },
    solids: [],
    drawables: [],
    pathStones: [],   // flat decoration drawn on the ground
    chest: null
  };

  // Animal pen area (must match the fence in OBJECTS: cols 16-27, rows 13-20, inside edges).
  W.pen = { x: 17 * TILE, y: 14 * TILE, w: 10 * TILE, h: 6 * TILE };

  function hash(c, r) {
    return (((c * 73856093) ^ (r * 19349663)) >>> 0);
  }
  function objAt(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return '.';
    return OBJECTS[r].charAt(c);
  }
  function isFence(c, r) { return objAt(c, r) === 'F'; }
  function addSolid(x, y, w, h) { W.solids.push({ x: x, y: y, w: w, h: h }); }
  function addDrawable(sortY, fn) { W.drawables.push({ sortY: sortY, draw: fn }); }

  function spr(ctx, r, dx, dy, cam) { Game.Sprites.draw(ctx, r, dx, dy, cam); }

  W.init = function () {
    var S = Game.Sprites;
    W.solids = [];
    W.drawables = [];
    W.pathStones = [];
    W.chest = null;

    // Edge of the map: tree line in the north and west (trunks sit at row 1 / col 1)
    addSolid(0, 0, COLS * TILE, 24);
    addSolid(0, 0, 18, ROWS * TILE);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var ch = OBJECTS[r].charAt(c);
        var x = c * TILE, y = r * TILE;
        if (ch === '.') continue;

        if (ch === 'T' || ch === 't') {
          (function (c, r, ch) {
            var fx = c * TILE + 8, fy = (r + 1) * TILE;
            var frame = S.treeFrame.full;
            var half = 6, h = 8;
            if (ch === 't') {
              var pick = hash(c, r) % 4;
              frame = [S.treeFrame.stump, S.treeFrame.small, S.treeFrame.stump, S.treeFrame.sprout][pick];
              if (frame === S.treeFrame.small) { half = 4; h = 6; }
              else if (frame === S.treeFrame.stump) { half = 6; h = 6; }
              else { half = 0; }
            }
            if (half > 0) addSolid(fx - half, fy - h, half * 2, h);
            var rect = { img: 'tree', x: frame * 32, y: 0, w: 32, h: 48 };
            addDrawable(fy, function (ctx, cam) { spr(ctx, rect, fx - 16, fy - 46, cam); });
          })(c, r, ch);
        } else if (ch === 'F') {
          (function (c, r) {
            var n = isFence(c, r - 1), s = isFence(c, r + 1), e = isFence(c + 1, r), w = isFence(c - 1, r);
            var rect;
            if (w && e) rect = S.fence.both;
            else if (e) rect = S.fence.right;
            else if (w) rect = S.fence.left;
            else if (n || s) rect = S.fence.vertical;
            else rect = S.fence.single;
            var x = c * TILE, y = r * TILE;
            if (w || e) addSolid(x, y + 6, TILE, 10);
            if (n || s) addSolid(x + 3, y, 10, TILE);
            if (!(w || e || n || s)) addSolid(x + 3, y + 4, 10, 12);
            addDrawable(y + TILE, function (ctx, cam) { spr(ctx, rect, x, y, cam); });
          })(c, r);
        } else if (ch === 'C') {
          (function (x, y) {
            var chest = { open: false, x: x, y: y };
            chest.interact = function () {
              if (Game.Inventory && Game.Inventory.openChest) Game.Inventory.openChest(chest);
              else chest.open = !chest.open;
            };
            chest.rect = { x: x + 1, y: y + 5, w: 14, h: 10 };
            W.chest = chest;
            addSolid(chest.rect.x, chest.rect.y, chest.rect.w, chest.rect.h);
            addDrawable(y + TILE, function (ctx, cam) {
              spr(ctx, chest.open ? S.chestOpen : S.chestClosed, x - 8, y, cam);
            });
          })(x, y);
        } else if (ch === 'H') {
          (function (c, r) {
            // Picture placed so the door sits exactly on tile column c+3 and the wall bottom on a tile edge.
            var ox = c * TILE + 4, oy = r * TILE + 7;
            var sr = S.house.solid;
            addSolid(ox + sr.x, oy + sr.y, sr.w, sr.h);
            addDrawable(oy + S.house.wallBottom, function (ctx, cam) { spr(ctx, S.house, ox, oy, cam); });
          })(c, r);
        } else if (ch === 'o') {
          W.pathStones.push({ rect: S.stones[hash(c, r) % S.stones.length], x: x + 1 + (hash(r, c) % 3), y: y + 1 + (hash(c + 5, r) % 3) });
        } else if (ch === 's') {
          // loose stones also lie flat, so the player always walks in front of them
          W.pathStones.push({ rect: S.stones[hash(c, r) % S.stones.length], x: x + 1, y: y + 1 });
        } else if (ch === 'c') {
          (function (c, r, x, y) {
            var rect = S.crop(hash(c, r) >> 3, (c * 7 + r * 3) % 6);
            addDrawable(y + TILE, function (ctx, cam) { spr(ctx, rect, x, y, cam); });
          })(c, r, x, y);
        } else if (ch === 'P') {
          W.spawn = { x: x + 8, y: y + 8 };
        }
      }
    }
    if (Game.Animals) Game.Animals.init(W.pen);
    if (Game.Eggs) Game.Eggs.init(W.pen);
  };

  W.update = function (dt, player) {
    if (Game.Animals) Game.Animals.update(dt, player);
    if (Game.Eggs) Game.Eggs.update(dt, player);
  };

  // Like isSolidRect but only looks at fixed things (trees, fences, house...), not animals.
  W.isStaticSolidRect = function (x, y, w, h) {
    if (x < 0 || y < 0 || x + w > W.widthPx || y + h > W.heightPx) return true;
    var list = W.solids;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y) return true;
    }
    return false;
  };

  W.drawGround = function (ctx, cam) {
    var A = Game.Assets, S = Game.Sprites;
    var grass = A.get('tileset');
    var cx = Math.round(cam.x), cy = Math.round(cam.y);
    var c0 = Math.max(0, Math.floor(cx / TILE)), c1 = Math.min(COLS - 1, Math.floor((cx + cam.w) / TILE));
    var r0 = Math.max(0, Math.floor(cy / TILE)), r1 = Math.min(ROWS - 1, Math.floor((cy + cam.h) / TILE));
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        var dx = c * TILE - cx, dy = r * TILE - cy;
        ctx.drawImage(grass, S.grass.x, S.grass.y, 16, 16, dx, dy, 16, 16);
        if (GROUND[r].charAt(c) === 'd') {
          ctx.fillStyle = '#8B5E3C';
          ctx.fillRect(dx, dy, 16, 16);
          // little specks so the soil does not look flat
          var h = hash(c, r);
          ctx.fillStyle = '#74492D';
          ctx.fillRect(dx + (h % 12) + 1, dy + ((h >> 4) % 12) + 1, 2, 1);
          ctx.fillRect(dx + ((h >> 8) % 12) + 1, dy + ((h >> 12) % 12) + 1, 1, 2);
          ctx.fillStyle = '#9C6E48';
          ctx.fillRect(dx + ((h >> 16) % 12) + 1, dy + ((h >> 20) % 12) + 1, 2, 1);
        }
      }
    }
    // stepping stones lie flat on the ground
    for (var i = 0; i < W.pathStones.length; i++) {
      var p = W.pathStones[i];
      ctx.drawImage(A.get(p.rect.img), p.rect.x, p.rect.y, p.rect.w, p.rect.h,
        Math.round(p.x - cx), Math.round(p.y - cy), p.rect.w, p.rect.h);
    }
  };

  W.getDrawables = function () {
    var out = W.drawables;
    if (Game.Animals) out = out.concat(Game.Animals.getDrawables());
    if (Game.Eggs) out = out.concat(Game.Eggs.getDrawables());
    return out;
  };

  W.isSolidRect = function (x, y, w, h) {
    if (x < 0 || y < 0 || x + w > W.widthPx || y + h > W.heightPx) return true;
    var list = W.solids;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y) return true;
    }
    if (Game.Animals && Game.Animals.blocksRect(x, y, w, h)) return true;
    return false;
  };

  W.getSolidRects = function () {
    return Game.Animals ? W.solids.concat(Game.Animals.getRects()) : W.solids;
  };

  // Look ~12px in front of the feet for something the player can use.
  W.getInteractableAt = function (x, y, facing) {
    var dx = 0, dy = 0;
    if (facing === 'left') dx = -1; else if (facing === 'right') dx = 1;
    else if (facing === 'up') dy = -1; else dy = 1;
    var px = x + dx * 12;
    var py = y + dy * 12 - (dx !== 0 ? 4 : 0);
    var ch = W.chest;
    if (ch) {
      var r = ch.rect;
      if (px >= r.x - 2 && px <= r.x + r.w + 2 && py >= r.y - 2 && py <= r.y + r.h + 2) return ch;
    }
    if (Game.Eggs && Game.Eggs.getNearest) return Game.Eggs.getNearest(x, y - 3, 16);
    return null;
  };

  // Optional helper: shows the picture pieces (handy if something looks wrong).
  W.debugAtlas = function (ctx) {
    var S = Game.Sprites, A = Game.Assets;
    var list = [S.house, S.fence.both, S.fence.right, S.fence.left, S.fence.vertical, S.fence.single,
      S.chestClosed, S.chestOpen].concat(S.stones);
    var x = 2;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      ctx.drawImage(A.get(r.img), r.x, r.y, r.w, r.h, x, 2, r.w, r.h);
      x += r.w + 2;
    }
  };
})();
