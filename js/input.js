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
  var clicks = [];
  var canvas = null;
  var mouseClientX = 0, mouseClientY = 0, hasMouse = false;
  var lastWheelTime = 0, cooldownUntil = 0;

  window.addEventListener('blur', function () {
    down = {}; pressed = {}; wheelAcc = 0; steps = 0; clicks = [];
  });

  window.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) e.preventDefault();
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 33; else if (e.deltaMode === 2) d *= 100;
    if (!d) return;
    var now = performance.now();
    if (e.deltaMode !== 0 || Math.abs(d) >= 50) {
      // Mouse wheel notch: always counts, 1 to 3 slots
      var n = Math.max(1, Math.min(3, Math.round(Math.abs(d) / 100)));
      steps += (d > 0 ? 1 : -1) * n;
      wheelAcc = 0;
      lastWheelTime = now;
      return;
    }
    // Trackpad: small deltas add up, one step at a time with a short pause
    if (now < cooldownUntil) { lastWheelTime = now; return; }
    if ((wheelAcc !== 0 && (d > 0) !== (wheelAcc > 0)) || now - lastWheelTime > 200) wheelAcc = 0;
    lastWheelTime = now;
    wheelAcc += d;
    if (Math.abs(wheelAcc) >= 100) {
      steps += wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      cooldownUntil = now + 150;
    }
  }, { passive: false });

  function getCanvas() {
    if (!canvas) canvas = document.getElementById('game');
    return canvas;
  }
  // Turns a screen position into game-pixel position on the canvas.
  function toCanvas(cx, cy) {
    var c = getCanvas();
    if (!c) return { x: 0, y: 0, inside: false };
    var r = c.getBoundingClientRect();
    if (!r.width || !r.height) return { x: 0, y: 0, inside: false };
    var x = Math.floor((cx - r.left) * c.width / r.width);
    var y = Math.floor((cy - r.top) * c.height / r.height);
    return { x: x, y: y, inside: x >= 0 && y >= 0 && x < c.width && y < c.height };
  }

  window.addEventListener('mousemove', function (e) {
    mouseClientX = e.clientX; mouseClientY = e.clientY; hasMouse = true;
  });
  window.addEventListener('mousedown', function (e) {
    mouseClientX = e.clientX; mouseClientY = e.clientY; hasMouse = true;
    if (e.button !== 0 && e.button !== 2) return;
    var p = toCanvas(e.clientX, e.clientY);
    if (!p.inside) return;
    clicks.push({ x: p.x, y: p.y, button: e.button, shift: !!e.shiftKey });
    e.preventDefault();
  });
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('mouseout', function (e) { if (!e.relatedTarget) hasMouse = false; });

  Game.Input = {
    isDown: function (action) {
      for (var c in down) if (MAP[c] === action) return true;
      return false;
    },
    wasPressed: function (action) { return !!pressed[action]; },
    consume: function (action) { delete pressed[action]; },
    wheelSteps: function () { return steps; },
    mouse: function () {
      if (!hasMouse) return { x: 0, y: 0, inside: false };
      return toCanvas(mouseClientX, mouseClientY);
    },
    mouseClicks: function () { return clicks; },
    endFrame: function () { pressed = {}; steps = 0; clicks = []; }
  };
})();
