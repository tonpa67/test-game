window.Game = window.Game || {};
(function () {
  var MAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'slow', ShiftRight: 'slow',
    KeyE: 'interact', Space: 'interact',
    F3: 'debug'
  };
  var down = {};
  var pressed = {};

  window.addEventListener('keydown', function (e) {
    var a = MAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!down[e.code]) pressed[a] = true;
    down[e.code] = true;
  });
  window.addEventListener('keyup', function (e) {
    var a = MAP[e.code];
    if (!a) return;
    e.preventDefault();
    delete down[e.code];
  });
  window.addEventListener('blur', function () { down = {}; pressed = {}; });

  Game.Input = {
    isDown: function (action) {
      for (var c in down) if (MAP[c] === action) return true;
      return false;
    },
    wasPressed: function (action) { return !!pressed[action]; },
    endFrame: function () { pressed = {}; }
  };
})();
