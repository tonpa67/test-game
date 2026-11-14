window.Game = window.Game || {};
(function () {
  var MAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'slow', ShiftRight: 'slow',
    KeyE: 'interact', Space: 'interact',
    KeyI: 'inventory', Escape: 'close',
    F3: 'debug'
  };
  for (var n = 1; n <= 5; n++) {
    MAP['Digit' + n] = 'slot' + n;
    MAP['Numpad' + n] = 'slot' + n;
  }
  var down = {};
  var pressed = {};
  var wheelAcc = 0;   // raw wheel distance not yet turned into a step
  var steps = 0;      // whole slot steps this frame

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
  window.addEventListener('blur', function () { down = {}; pressed = {}; wheelAcc = 0; steps = 0; });

  window.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) e.preventDefault();
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= 100;
    if (!d) return;
    if ((d > 0) !== (wheelAcc > 0) && wheelAcc !== 0) wheelAcc = 0;
    wheelAcc += d;
    while (Math.abs(wheelAcc) >= 40) {
      if (wheelAcc > 0) { steps++; wheelAcc -= 40; } else { steps--; wheelAcc += 40; }
    }
  }, { passive: false });

  Game.Input = {
    isDown: function (action) {
      for (var c in down) if (MAP[c] === action) return true;
      return false;
    },
    wasPressed: function (action) { return !!pressed[action]; },
    wheelSteps: function () { return steps; },
    endFrame: function () { pressed = {}; steps = 0; }
  };
})();
