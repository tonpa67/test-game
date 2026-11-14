// effects.js - short animated effects (like the smoke puff when an egg is picked up).
window.Game = window.Game || {};
(function () {
  'use strict';

  var TYPES = {
    smoke: { sheet: 'smoke3', frames: 7, frameTime: 0.09, w: 32, h: 16, ox: 16, oy: 15, sortOffset: 4 }
  };
  var MAX = 32;
  var list = [];

  // one source rectangle per frame, built once
  Object.keys(TYPES).forEach(function (k) {
    var t = TYPES[k];
    t.rects = [];
    for (var i = 0; i < t.frames; i++) t.rects.push({ img: t.sheet, x: i * t.w, y: 0, w: t.w, h: t.h });
  });

  function drawEffect(e, ctx, cam) {
    var t = e.type;
    if (!Game.Assets || !Game.Assets.get(t.sheet) || !Game.Sprites) return;
    var f = Math.min(t.frames - 1, Math.floor(e.age / t.frameTime));
    Game.Sprites.draw(ctx, t.rects[f], e.x - t.ox, e.y - t.oy, cam);
  }

  Game.Effects = {
    spawn: function (name, x, y) {
      var t = TYPES[name];
      if (!t) return;
      if (list.length >= MAX) list.shift();
      var e = { type: t, x: x, y: y, age: 0, drawable: null };
      e.drawable = { sortY: y + t.sortOffset, draw: function (ctx, cam) { drawEffect(e, ctx, cam); } };
      list.push(e);
    },
    update: function (dt) {
      for (var i = list.length - 1; i >= 0; i--) {
        var e = list[i];
        e.age += dt;
        if (e.age >= e.type.frames * e.type.frameTime) list.splice(i, 1);
      }
    },
    getDrawables: function () {
      var out = [];
      for (var i = 0; i < list.length; i++) out.push(list[i].drawable);
      return out;
    },
    clear: function () { list = []; },
    count: function () { return list.length; }
  };
})();
