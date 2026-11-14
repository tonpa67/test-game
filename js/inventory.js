window.Game = window.Game || {};
(function () {
  var UI = (Game.CONFIG && Game.CONFIG.UI) || {};
  var COL = {
    OUTLINE: UI.OUTLINE || '#32131E', WOOD_DARK: UI.WOOD_DARK || '#4A2123', WOOD: UI.WOOD || '#8A3625',
    WOOD_LIGHT: UI.WOOD_LIGHT || '#AE4924', CREAM_LIGHT: UI.CREAM_LIGHT || '#EBCFB4',
    SLOT_BG: UI.SLOT_BG || '#C39478', SELECT: UI.SELECT || '#FFE6A0', TEXT_LIGHT: UI.TEXT_LIGHT || '#FFF4E0'
  };
  var HOTBAR = 5, TOTAL = 25, COLS = 5, SLOT = 20, GAP = 2;

  // ---- Items ----
  var items = {
    egg: { id: 'egg', name: 'Egg', icon: { img: 'chick', x: 0, y: 32, w: 16, h: 16 }, maxStack: 99 }
  };
  Game.Items = {
    egg: items.egg,
    get: function (id) { return items[id] || null; }
  };

  // ---- State ----
  var slots = [];
  for (var i = 0; i < TOTAL; i++) slots.push(null);
  var selected = 0;
  var open = false;
  var warned = {};

  function sound(name) {
    try { if (Game.Audio && Game.Audio.play) Game.Audio.play(name); } catch (e) {}
  }
  function maxStackOf(def) { return def.maxStack || 99; }

  function add(id, count) {
    count = Math.floor(count);
    if (!(count > 0)) return 0;
    var def = Game.Items.get(id);
    if (!def) {
      if (!warned[id]) { warned[id] = true; if (window.console) console.warn('Unknown item: ' + id); }
      return count;
    }
    var max = maxStackOf(def), k, s;
    for (k = 0; k < TOTAL && count > 0; k++) {
      s = slots[k];
      if (s && s.id === id && s.count < max) {
        var put = Math.min(max - s.count, count);
        s.count += put; count -= put;
      }
    }
    for (k = 0; k < TOTAL && count > 0; k++) {
      if (!slots[k]) {
        var n = Math.min(max, count);
        slots[k] = { id: id, count: n }; count -= n;
      }
    }
    return count;
  }

  function canAdd(id, count) {
    count = Math.floor(count);
    if (!(count > 0)) return true;
    var def = Game.Items.get(id);
    if (!def) return false;
    var max = maxStackOf(def), room = 0;
    for (var k = 0; k < TOTAL; k++) {
      var s = slots[k];
      if (!s) room += max;
      else if (s.id === id) room += max - s.count;
    }
    return room >= count;
  }

  function countOf(id) {
    var t = 0;
    for (var k = 0; k < TOTAL; k++) if (slots[k] && slots[k].id === id) t += slots[k].count;
    return t;
  }

  function select(i) {
    i = Math.floor(i);
    if (!(i >= 0 && i < HOTBAR) || i === selected) return;
    selected = i;
    sound('select');
  }

  function setOpen(v) {
    v = !!v;
    if (v === open) return;
    open = v;
    sound(open ? 'open' : 'close');
  }

  function handleInput(input) {
    if (input.wasPressed('inventory')) setOpen(!open);
    else if (open && input.wasPressed('close')) setOpen(false);
    for (var n = 0; n < HOTBAR; n++) if (input.wasPressed('slot' + (n + 1))) select(n);
    var w = input.wheelSteps ? input.wheelSteps() : 0;
    if (w) select((((selected + w) % HOTBAR) + HOTBAR) % HOTBAR);
  }

  // ---- Drawing ----
  var DIGITS = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001',
    '8': '111101111101111', '9': '111101111001111'
  };
  function textWidth(str) { return str.length * 4 - 1; }
  function drawDigits(ctx, str, x, y, color) {
    ctx.fillStyle = color;
    for (var c = 0; c < str.length; c++) {
      var g = DIGITS[str.charAt(c)];
      if (!g) continue;
      for (var p = 0; p < 15; p++) {
        if (g.charAt(p) === '1') ctx.fillRect(x + c * 4 + (p % 3), y + Math.floor(p / 3), 1, 1);
      }
    }
  }
  function drawCount(ctx, n, right, bottom) {
    var str = String(n), x = right - textWidth(str) + 1, y = bottom - 4;
    var o = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var k = 0; k < o.length; k++) drawDigits(ctx, str, x + o[k][0], y + o[k][1], COL.OUTLINE);
    drawDigits(ctx, str, x, y, COL.TEXT_LIGHT);
  }

  function drawFrame(ctx, x, y, w, h) {
    ctx.fillStyle = COL.OUTLINE; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COL.WOOD; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = COL.WOOD_LIGHT; ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = COL.WOOD_DARK; ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
  }

  function drawSlot(ctx, idx, x, y, isSel, number) {
    if (isSel) { ctx.fillStyle = COL.SELECT; ctx.fillRect(x - 1, y - 1, SLOT + 2, SLOT + 2); }
    ctx.fillStyle = COL.OUTLINE; ctx.fillRect(x, y, SLOT, SLOT);
    ctx.fillStyle = isSel ? COL.CREAM_LIGHT : COL.SLOT_BG; ctx.fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2);
    ctx.fillStyle = COL.WOOD_DARK;
    ctx.fillRect(x + 1, y + 1, SLOT - 2, 1);
    ctx.fillRect(x + 1, y + 2, 1, SLOT - 3);
    if (number) {
      ctx.globalAlpha = 0.45;
      drawDigits(ctx, String(number), x + 3, y + 3, COL.WOOD_DARK);
      ctx.globalAlpha = 1;
    }
    var s = slots[idx];
    if (s) {
      var def = Game.Items.get(s.id);
      if (def && Game.Sprites && Game.Sprites.draw) Game.Sprites.draw(ctx, def.icon, x + 2, y + 2, null);
      if (s.count > 1) drawCount(ctx, s.count, x + SLOT - 3, y + SLOT - 3);
    }
  }

  function drawHotbar(ctx, viewW, viewH) {
    var fw = 114, fh = 26;
    var fx = Math.floor((viewW - fw) / 2), fy = viewH - 30;
    drawFrame(ctx, fx, fy, fw, fh);
    for (var i = 0; i < HOTBAR; i++) {
      if (i !== selected) drawSlot(ctx, i, fx + 3 + i * (SLOT + GAP), fy + 3, false, i + 1);
    }
    // selected last so its ring sits on top of neighbours
    drawSlot(ctx, selected, fx + 3 + selected * (SLOT + GAP), fy + 3, true, selected + 1);
  }

  function drawBackpack(ctx, viewW, viewH) {
    ctx.fillStyle = 'rgba(28,10,24,0.5)';
    ctx.fillRect(0, 0, viewW, viewH);
    var pw = 120, ph = 110;
    var px = Math.floor((viewW - pw) / 2), py = Math.max(2, Math.floor((viewH - 32 - ph) / 2));
    drawFrame(ctx, px, py, pw, ph);
    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = COL.OUTLINE;
    ctx.fillText('Backpack', px + pw / 2, py + 5);
    ctx.fillStyle = COL.TEXT_LIGHT;
    ctx.fillText('Backpack', px + pw / 2, py + 4);
    ctx.textAlign = 'left';
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < COLS; c++) {
        drawSlot(ctx, HOTBAR + r * COLS + c, px + 6 + c * (SLOT + GAP), py + 18 + r * (SLOT + GAP), false, 0);
      }
    }
  }

  function draw(ctx, viewW, viewH) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (open) drawBackpack(ctx, viewW, viewH);
    drawHotbar(ctx, viewW, viewH);
    ctx.restore();
  }

  Game.Inventory = {
    add: add,
    canAdd: canAdd,
    count: countOf,
    getSlot: function (i) {
      var s = slots[i];
      return s ? { id: s.id, count: s.count } : null;
    },
    getSelected: function () { return selected; },
    select: select,
    isOpen: function () { return open; },
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    toggle: function () { setOpen(!open); },
    handleInput: handleInput,
    draw: draw
  };
})();
