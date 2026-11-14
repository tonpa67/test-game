// sprites.js - where each picture lives inside the asset images (source rectangles).
// All numbers were checked by eye against the PNG files (pixels).
window.Game = window.Game || {};
(function () {
  'use strict';

  var S = {};

  // Plain solid grass tile (col 9,row 2 of the 16x16 tileset)
  S.grass = { img: 'tileset', x: 144, y: 32, w: 16, h: 16 };

  // Cottage (the right-hand house in House.png). The front door, step and windows
  // are already painted on it, so no overlay is needed.
  // Door: x44..60, y67..89 inside the picture. Step goes down to y97.
  // Walls (blocking part): x10..70, y66..89 inside the picture.
  S.house = {
    img: 'house', x: 144, y: 0, w: 80, h: 98,
    doorX: 44, doorW: 16, wallBottom: 89,
    solid: { x: 12, y: 66, w: 56, h: 23 }
  };

  // Maple tree: five 32x48 frames. Feet at (16,46).
  S.tree = { img: 'tree', w: 32, h: 48, footX: 16, footY: 46 };
  S.treeFrame = { seed: 0, sprout: 1, small: 2, full: 3, stump: 4 };

  // Fence: 16x16 pieces inside Fence's copiar.png (col,row)
  function ft(c, r) { return { img: 'fence', x: c * 16, y: r * 16, w: 16, h: 16 }; }
  S.fence = {
    both: ft(1, 2),    // post with rails to left and right
    right: ft(0, 2),   // post with rail going right only
    left: ft(2, 2),    // post with rail going left only
    vertical: ft(0, 1),// tall post, used for vertical runs
    single: ft(1, 4)   // lone post
  };

  // Loose stones in Road copiar.png (13x13 each)
  S.stones = [
    { img: 'road', x: 2, y: 1, w: 13, h: 13 },
    { img: 'road', x: 18, y: 2, w: 13, h: 13 },
    { img: 'road', x: 34, y: 3, w: 13, h: 13 },
    { img: 'road', x: 1, y: 17, w: 13, h: 13 },
    { img: 'road', x: 18, y: 18, w: 13, h: 13 }
  ];

  // Chest: 32x16 frames; the visible part is x8..24, so draw 8px to the left of the tile.
  S.chestClosed = { img: 'chest', x: 0, y: 0, w: 32, h: 16 };
  S.chestOpen = { img: 'chest', x: 0, y: 16, w: 32, h: 16 };

  // Crops: 16x16 cells in Spring Crops.png. Art rows 1,3,5,7; growth stages = columns 0..5.
  S.cropRows = [1, 3, 5, 7];
  S.crop = function (rowIndex, stage) {
    var row = S.cropRows[((rowIndex % 4) + 4) % 4];
    var col = Math.max(0, Math.min(5, stage));
    return { img: 'crops', x: col * 16, y: row * 16, w: 16, h: 16 };
  };

  // Farm animals: frames are laid out in rows; foot point is where the animal touches the ground.
  S.animals = {
    cow: { w: 32, h: 32, footX: 16, footY: 31, frames: 4, row: { left: 0, right: 0, down: 1, up: 2 }, flipRight: true },
    chicken: { w: 16, h: 16, footX: 8, footY: 15, frames: 4, row: { left: 0, right: 1 }, flipRight: false },
    chick: { w: 16, h: 16, footX: 8, footY: 15, frames: 4, row: { left: 0, right: 1 }, flipRight: false }
  };

  // Draw a rectangle from the atlas at world position (dx,dy) minus camera.
  S.draw = function (ctx, r, dx, dy, cam) {
    var img = Game.Assets.get(r.img);
    var px = Math.round(dx - (cam ? cam.x : 0));
    var py = Math.round(dy - (cam ? cam.y : 0));
    ctx.drawImage(img, r.x, r.y, r.w, r.h, px, py, r.w, r.h);
  };

  Game.Sprites = S;
})();
