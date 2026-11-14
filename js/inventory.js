window.Game = window.Game || {};
(function () {
  var UI = (Game.CONFIG && Game.CONFIG.UI) || {};
  var COL = {
    OUTLINE: UI.OUTLINE || '#32131E', WOOD_DARK: UI.WOOD_DARK || '#4A2123', WOOD: UI.WOOD || '#8A3625',
    WOOD_LIGHT: UI.WOOD_LIGHT || '#AE4924', CREAM_LIGHT: UI.CREAM_LIGHT || '#EBCFB4',
    SLOT_BG: UI.SLOT_BG || '#C39478', SELECT: UI.SELECT || '#FFE6A0', TEXT_LIGHT: UI.TEXT_LIGHT || '#FFF4E0'
  };
  var HOTBAR = 5, TOTAL = 25, COLS = 5, SLOT = 20, GAP = 2;
  var CHEST_SLOTS = 20, PANEL_W = 120, PANEL_H = 110;

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
  var mode = null;      // null | 'backpack' | 'chest'
  var chestRef = null;
  var held = null;      // {id, count, from:{area, index}}
  var warned = {};
  var lastW = 320, lastH = 180;
  var lastMouse = null; // last known mouse position {x,y}
  var lastInside = false;

  function sound(name) {
    try { if (Game.Audio && Game.Audio.play) Game.Audio.play(name); } catch (e) {}
  }
  function message(text) {
    try { if (Game.HUD && Game.HUD.showMessage) Game.HUD.showMessage(text, 1.5); } catch (e) {}
  }
  function maxStackOf(def) { return (def && def.maxStack) || 99; }
  function maxOfId(id) { return maxStackOf(Game.Items.get(id)); }

  function arr(area) {
    if (area === 'inv') return slots;
    if (area === 'chest' && chestRef && chestRef.storage) return chestRef.storage.slots;
    return null;
  }

  // Add into any slot array. Returns leftover count.
  function addTo(a, id, count) {
    count = Math.floor(count);
    if (!(count > 0)) return 0;
    var def = Game.Items.get(id);
    if (!def) {
      if (!warned[id]) { warned[id] = true; if (window.console) console.warn('Unknown item: ' + id); }
      return count;
    }
    var max = maxStackOf(def), k, s, len = a.length;
    for (k = 0; k < len && count > 0; k++) {
      s = a[k];
      if (s && s.id === id && s.count < max) {
        var put = Math.min(max - s.count, count);
        s.count += put; count -= put;
      }
    }
    for (k = 0; k < len && count > 0; k++) {
      if (!a[k]) {
        var n = Math.min(max, count);
        a[k] = { id: id, count: n }; count -= n;
      }
    }
    return count;
  }

  function add(id, count) { return addTo(slots, id, count); }

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

  // ---- Layout (shared by drawing and clicking) ----
  function layout(viewW, viewH) {
    var L = { hotbar: null, backpack: null, chest: null, slots: [] };
    var fw = 114, fh = 26;
    var fx = Math.floor((viewW - fw) / 2), fy = viewH - 30;
    L.hotbar = { frame: { x: fx, y: fy, w: fw, h: fh } };
    var r, c, i;
    for (i = 0; i < HOTBAR; i++) {
      L.slots.push({ area: 'inv', index: i, x: fx + 3 + i * (SLOT + GAP), y: fy + 3, isHotbar: true });
    }
    var bp = null, ch = null;
    if (mode === 'chest') {
      if (viewH - 32 >= 2 * PANEL_H + 4) {
        var cx = Math.floor((viewW - PANEL_W) / 2);
        var cy = Math.max(2, Math.floor((viewH - 32 - (2 * PANEL_H + 4)) / 2));
        ch = { x: cx, y: cy };
        bp = { x: cx, y: cy + PANEL_H + 4 };
      } else {
        var x0 = Math.floor((viewW - (2 * PANEL_W + 6)) / 2);
        var py = Math.max(2, Math.floor((viewH - 32 - PANEL_H) / 2));
        ch = { x: x0, y: py };
        bp = { x: x0 + PANEL_W + 6, y: py };
      }
    } else if (mode === 'backpack') {
      bp = { x: Math.floor((viewW - PANEL_W) / 2), y: Math.max(2, Math.floor((viewH - 32 - PANEL_H) / 2)) };
    }
    if (bp) {
      L.backpack = { frame: { x: bp.x, y: bp.y, w: PANEL_W, h: PANEL_H }, title: 'Backpack' };
      for (r = 0; r < 4; r++) for (c = 0; c < COLS; c++) {
        L.slots.push({ area: 'inv', index: HOTBAR + r * COLS + c, x: bp.x + 6 + c * (SLOT + GAP), y: bp.y + 18 + r * (SLOT + GAP), isHotbar: false });
      }
    }
    if (ch) {
      L.chest = { frame: { x: ch.x, y: ch.y, w: PANEL_W, h: PANEL_H }, title: 'Chest' };
      for (r = 0; r < 4; r++) for (c = 0; c < COLS; c++) {
        L.slots.push({ area: 'chest', index: r * COLS + c, x: ch.x + 6 + c * (SLOT + GAP), y: ch.y + 18 + r * (SLOT + GAP), isHotbar: false });
      }
    }
    return L;
  }

  function slotAt(L, mx, my) {
    for (var k = 0; k < L.slots.length; k++) {
      var e = L.slots[k];
      if (mx >= e.x && mx < e.x + SLOT && my >= e.y && my < e.y + SLOT) return e;
    }
    return null;
  }

  // ---- Moving items around ----
  function leftClick(e, shift) {
    var a = arr(e.area);
    if (!a) return;
    var s = a[e.index];
    if (!held) {
      if (!s) return;
      if (shift) { quickMove(e); return; }
      held = { id: s.id, count: s.count, from: { area: e.area, index: e.index } };
      a[e.index] = null;
      sound('select');
      return;
    }
    if (!s) {
      a[e.index] = { id: held.id, count: held.count };
      held = null;
      sound('select');
    } else if (s.id === held.id) {
      var put = Math.min(maxOfId(s.id) - s.count, held.count);
      if (put > 0) {
        s.count += put; held.count -= put;
        if (held.count <= 0) held = null;
        sound('select');
      }
    } else {
      var old = { id: s.id, count: s.count };
      a[e.index] = { id: held.id, count: held.count };
      held = { id: old.id, count: old.count, from: { area: e.area, index: e.index } };
      sound('select');
    }
  }

  function moveInto(a, from, to, id, count) {
    // fill same-id stacks first, then empty slots, within index range [from,to)
    var max = maxOfId(id), k, s;
    for (k = from; k < to && count > 0; k++) {
      s = a[k];
      if (s && s.id === id && s.count < max) {
        var put = Math.min(max - s.count, count);
        s.count += put; count -= put;
      }
    }
    for (k = from; k < to && count > 0; k++) {
      if (!a[k]) {
        var n = Math.min(max, count);
        a[k] = { id: id, count: n }; count -= n;
      }
    }
    return count;
  }

  function quickMove(e) {
    var src = arr(e.area), s = src[e.index];
    if (!s) return;
    var dst, from, to, left;
    if (mode === 'chest' && chestRef) {
      if (e.area === 'inv') { dst = arr('chest'); from = 0; to = CHEST_SLOTS; }
      else { dst = slots; from = 0; to = TOTAL; }
    } else {
      dst = slots;
      if (e.index < HOTBAR) { from = HOTBAR; to = TOTAL; } else { from = 0; to = HOTBAR; }
    }
    if (!dst) return;
    left = moveInto(dst, from, to, s.id, s.count);
    if (left === s.count) { sound('denied'); message('No room'); return; }
    if (left > 0) s.count = left; else src[e.index] = null;
    sound('select');
  }

  function rightClick(e) {
    var a = arr(e.area);
    if (!a) return;
    var s = a[e.index];
    if (!held) {
      if (!s) return;
      var take = Math.ceil(s.count / 2);
      held = { id: s.id, count: take, from: { area: e.area, index: e.index } };
      if (take >= s.count) a[e.index] = null; else s.count -= take;
      sound('select');
      return;
    }
    if (!s) {
      a[e.index] = { id: held.id, count: 1 };
    } else if (s.id === held.id && s.count < maxOfId(s.id)) {
      s.count += 1;
    } else {
      return;
    }
    held.count -= 1;
    if (held.count <= 0) held = null;
    sound('select');
  }

  function returnHeld() {
    if (!held) return true;
    var left = held.count, a, s;
    a = arr(held.from.area);
    if (a) {
      s = a[held.from.index];
      if (!s) { a[held.from.index] = { id: held.id, count: left }; left = 0; }
      else if (s.id === held.id) {
        var put = Math.min(maxOfId(s.id) - s.count, left);
        s.count += put; left -= put;
      }
    }
    if (left > 0) left = addTo(slots, held.id, left);
    if (left > 0 && mode === 'chest' && arr('chest')) left = addTo(arr('chest'), held.id, left);
    if (left > 0) { held.count = left; return false; }
    held = null;
    return true;
  }

  function closeUI() {
    if (mode === null) return true;
    if (!returnHeld()) {
      sound('denied');
      message('No room for held item');
      return false;
    }
    if (mode === 'chest') {
      if (chestRef) chestRef.open = false;
      chestRef = null;
      sound('chestClose');
    } else {
      sound('close');
    }
    mode = null;
    return true;
  }

  function openBackpack() {
    if (mode !== null) return;
    mode = 'backpack';
    sound('open');
  }

  function openChest(chestObj) {
    if (!chestObj || mode !== null) return;
    if (!chestObj.storage) {
      var st = [];
      for (var k = 0; k < CHEST_SLOTS; k++) st.push(null);
      chestObj.storage = { slots: st };
    }
    chestRef = chestObj;
    chestObj.open = true;
    mode = 'chest';
    sound('chestOpen');
  }

  function consume(input, action) {
    if (input && input.consume) input.consume(action);
  }

  function handleInput(input, viewW, viewH) {
    if (!(viewW > 0)) viewW = lastW;
    if (!(viewH > 0)) viewH = lastH;
    lastW = viewW; lastH = viewH;

    if (mode === 'chest') {
      if (input.wasPressed('interact') || input.wasPressed('inventory') || input.wasPressed('close')) {
        consume(input, 'interact');
        closeUI();
      }
    } else if (mode === 'backpack') {
      if (input.wasPressed('inventory') || input.wasPressed('close')) closeUI();
    } else if (input.wasPressed('inventory')) {
      openBackpack();
    }

    for (var n = 0; n < HOTBAR; n++) if (input.wasPressed('slot' + (n + 1))) select(n);
    var w = input.wheelSteps ? input.wheelSteps() : 0;
    if (w) select((((selected + w) % HOTBAR) + HOTBAR) % HOTBAR);

    var m = input.mouse ? input.mouse() : null;
    if (m) {
      lastInside = !!m.inside;
      if (m.inside) lastMouse = { x: m.x, y: m.y };
    }

    var clicks = input.mouseClicks ? input.mouseClicks() : [];
    if (clicks && clicks.length) {
      for (var i = 0; i < clicks.length; i++) {
        var c = clicks[i];
        var e = slotAt(layout(viewW, viewH), c.x, c.y);
        if (!e) continue;
        if (mode === null) {
          if (c.button === 0 && e.isHotbar) select(e.index);
        } else if (c.button === 0) leftClick(e, !!c.shift);
        else if (c.button === 2) rightClick(e);
      }
    }
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

  function drawIcon(ctx, s, x, y) {
    var def = Game.Items.get(s.id);
    if (def && Game.Sprites && Game.Sprites.draw) Game.Sprites.draw(ctx, def.icon, x, y, null);
  }

  function drawSlot(ctx, entry, isSel, number) {
    var x = entry.x, y = entry.y;
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
    var a = arr(entry.area);
    var s = a ? a[entry.index] : null;
    if (s) {
      drawIcon(ctx, s, x + 2, y + 2);
      if (s.count > 1) drawCount(ctx, s.count, x + SLOT - 3, y + SLOT - 3);
    }
  }

  function drawPanel(ctx, p) {
    var f = p.frame;
    drawFrame(ctx, f.x, f.y, f.w, f.h);
    ctx.font = '8px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = COL.OUTLINE;
    ctx.fillText(p.title, f.x + f.w / 2, f.y + 5);
    ctx.fillStyle = COL.TEXT_LIGHT;
    ctx.fillText(p.title, f.x + f.w / 2, f.y + 4);
    ctx.textAlign = 'left';
  }

  function draw(ctx, viewW, viewH) {
    lastW = viewW; lastH = viewH;
    var L = layout(viewW, viewH);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    var k, e;
    if (mode !== null) {
      ctx.fillStyle = 'rgba(28,10,24,0.5)';
      ctx.fillRect(0, 0, viewW, viewH);
      if (L.chest) drawPanel(ctx, L.chest);
      if (L.backpack) drawPanel(ctx, L.backpack);
    }
    var f = L.hotbar.frame;
    drawFrame(ctx, f.x, f.y, f.w, f.h);
    var selEntry = null;
    for (k = 0; k < L.slots.length; k++) {
      e = L.slots[k];
      if (e.isHotbar) {
        if (e.index === selected) { selEntry = e; continue; }
        drawSlot(ctx, e, false, e.index + 1);
      } else {
        drawSlot(ctx, e, false, 0);
      }
    }
    // selected last so its ring sits on top of neighbours
    if (selEntry) drawSlot(ctx, selEntry, true, selEntry.index + 1);

    if (mode !== null && lastInside && lastMouse) {
      var hov = slotAt(L, lastMouse.x, lastMouse.y);
      if (hov) {
        ctx.fillStyle = COL.SELECT;
        ctx.fillRect(hov.x, hov.y, SLOT, 1);
        ctx.fillRect(hov.x, hov.y + SLOT - 1, SLOT, 1);
        ctx.fillRect(hov.x, hov.y, 1, SLOT);
        ctx.fillRect(hov.x + SLOT - 1, hov.y, 1, SLOT);
      }
    }
    if (held && lastMouse) {
      var hx = lastMouse.x - 8, hy = lastMouse.y - 8;
      drawIcon(ctx, held, hx, hy);
      if (held.count > 1) drawCount(ctx, held.count, hx + 15, hy + 15);
    }
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
    isOpen: function () { return mode !== null; },
    isChestOpen: function () { return mode === 'chest'; },
    getMode: function () { return mode; },
    open: openBackpack,
    close: closeUI,
    toggle: function () { if (mode === null) openBackpack(); else closeUI(); },
    openChest: openChest,
    getHeld: function () { return held ? { id: held.id, count: held.count } : null; },
    getChestSlot: function (i) {
      var a = arr('chest'), s = a ? a[i] : null;
      return s ? { id: s.id, count: s.count } : null;
    },
    getLayout: function (viewW, viewH) { return layout(viewW || lastW, viewH || lastH); },
    handleInput: handleInput,
    draw: draw
  };
})();
