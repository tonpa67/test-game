// battle.js - the turn-based battle screen: menus, message steps, animations and the transitions.
// The rules (damage, XP, coins) live in Game.BattleRules; this file shows them and reads the player's input.
window.Game = window.Game || {};
(function () {
  'use strict';

  var FX = function () { return Game.BattleFX; };

  // ---------- drawing helpers (use Game.UI, with a plain fallback) ----------
  var CU = (Game.CONFIG && Game.CONFIG.UI) || {};
  var FBCOL = {
    OUTLINE: CU.OUTLINE || '#32131E', WOOD_DARK: CU.WOOD_DARK || '#4A2123', WOOD: CU.WOOD || '#8A3625',
    WOOD_LIGHT: CU.WOOD_LIGHT || '#AE4924', CREAM: CU.CREAM || '#D9AB91', CREAM_LIGHT: CU.CREAM_LIGHT || '#EBCFB4',
    SELECT: CU.SELECT || '#FFE6A0', TEXT_DARK: CU.TEXT_DARK || '#32131E', TEXT_LIGHT: CU.TEXT_LIGHT || '#FFF4E0'
  };
  var Fallback = {
    COL: FBCOL,
    frame: function (c, x, y, w, h) {
      c.fillStyle = FBCOL.OUTLINE; c.fillRect(x, y, w, h);
      c.fillStyle = FBCOL.WOOD; c.fillRect(x + 1, y + 1, w - 2, h - 2);
      c.fillStyle = FBCOL.WOOD_LIGHT; c.fillRect(x + 1, y + 1, w - 2, 1);
    },
    panel: function (c, x, y, w, h) {
      c.fillStyle = FBCOL.OUTLINE; c.fillRect(x, y, w, h);
      c.fillStyle = FBCOL.CREAM_LIGHT; c.fillRect(x + 1, y + 1, w - 2, h - 2);
      c.fillStyle = FBCOL.WOOD_DARK; c.fillRect(x + 1, y + 1, w - 2, 1); c.fillRect(x + 1, y + 1, 1, h - 2);
    },
    text: function (c, s, x, y, color, o) {
      o = o || {};
      c.font = Game.CONFIG.UI.font(8); c.textBaseline = 'top';
      c.textAlign = o.align || 'left';
      x = Math.round(x); y = Math.round(y);
      if (o.shadow) { c.fillStyle = FBCOL.OUTLINE; c.fillText(s, x + 1, y + 1); }
      c.fillStyle = color || FBCOL.TEXT_DARK; c.fillText(s, x, y);
      c.textAlign = 'left';
    },
    wrap: function (c, s, maxW) {
      c.font = Game.CONFIG.UI.font(8);
      var words = String(s).split(' '), lines = [], cur = '';
      for (var i = 0; i < words.length; i++) {
        var t = cur ? cur + ' ' + words[i] : words[i];
        if (cur && c.measureText(t).width > maxW) { lines.push(cur); cur = words[i]; } else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    },
    bar: function (c, x, y, w, h, f, color, bg) {
      c.fillStyle = bg || FBCOL.OUTLINE; c.fillRect(x, y, w, h);
      var n = Math.round((w - 2) * Math.max(0, Math.min(1, f)));
      c.fillStyle = color; c.fillRect(x + 1, y + 1, n, Math.max(1, h - 2));
    },
    hpColor: function (f) { return f > 0.5 ? '#58C048' : f > 0.2 ? '#E8C030' : '#D84830'; },
    cursor: function (c, x, y, color) {
      c.fillStyle = color || FBCOL.TEXT_DARK;
      c.fillRect(x, y, 1, 5); c.fillRect(x + 1, y + 1, 1, 3); c.fillRect(x + 2, y + 2, 1, 1);
    },
    moreArrow: function (c, x, y, t) {
      if (Math.floor(t * 2.5) % 2) return;
      c.fillStyle = FBCOL.TEXT_DARK;
      c.fillRect(x, y, 5, 1); c.fillRect(x + 1, y + 1, 3, 1); c.fillRect(x + 2, y + 2, 1, 1);
    }
  };
  function UI() { return Game.UI || Fallback; }
  function colOf(k) { var u = Game.UI; return (u && u.COL && u.COL[k]) || FBCOL[k]; }

  // ---------- state ----------
  var active = false, phase = '', pt = 0, clock = 0;
  var opts = null, bs = null, playerC = null, foeC = null;
  var queue = [], cur = null, finished = false, finalResult = null, blackDone = false, outPhase = 'out';
  var anims = { p: null, f: null }, fainted = { p: false, f: false };
  var shownHp = { p: 0, f: 0 }, shownMax = { p: 1, f: 1 }, shownLevel = { p: 1, f: 1 }, shownXp = 0;
  var menuCur = 0, moveCur = 0, itemCur = 0;
  var lastMouse = { x: -1, y: -1 };
  var tin = null, splatPlayed = false;
  var lastL = null;

  var ANIM_DUR = { lunge: 0.25, hit: 0.45, faint: 0.6, heal: 0.5, statUp: 0.5, statDown: 0.5 };
  var MENU = ['Fight', 'Items', 'Switch', 'Run'];

  // ---------- small utilities ----------
  function snd(name) { if (Game.Audio && Game.Audio.play) { try { Game.Audio.play(name); } catch (e) {} } }
  function stopClip() { if (Game.Audio && Game.Audio.stopClip) { try { Game.Audio.stopClip(); } catch (e) {} } }
  function speciesOf(c) { return (Game.Creatures && Game.Creatures.SPECIES && Game.Creatures.SPECIES[c.species]) || { name: '???', type: 'normal', moves: [] }; }
  function nameOf(c) { return c ? speciesOf(c).name : ''; }
  function sideC(s) { return s === 'p' ? playerC : foeC; }
  function eggCount() { return (Game.Inventory && Game.Inventory.count) ? (Game.Inventory.count('egg') || 0) : 0; }
  function moveOf(id) { var M = Game.Creatures && Game.Creatures.MOVES; return (M && M[id]) || null; }
  function moveId(m) { return typeof m === 'string' ? m : (m && m.id); }
  function inRect(px, py, r) { return px >= r.x && py >= r.y && px < r.x + r.w && py < r.y + r.h; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function syncShown() {
    var s;
    for (var i = 0; i < 2; i++) {
      s = i ? 'f' : 'p';
      var c = sideC(s);
      if (!c) continue;
      shownHp[s] = c.hp; shownMax[s] = c.stats.hp; shownLevel[s] = c.level;
    }
    shownXp = (Game.Creatures && Game.Creatures.xpProgress) ? Game.Creatures.xpProgress(playerC) : 0;
  }

  // ---------- layout ----------
  function layout(W, H) {
    var A = H - 48;
    var S = Math.min(W, 400);
    var X0 = Math.floor((W - S) / 2);
    var bonus = (W >= 400 && H >= 260) ? 1 : 0;
    var L = {
      W: W, H: H, A: A, S: S, X0: X0, bonus: bonus,
      box: { x: 0, y: H - 48, w: W, h: 48 },
      boxIn: { x: 4, y: H - 44, w: W - 8, h: 40 },
      ef: { x: X0 + Math.round(S * 0.70), y: Math.round(A * 0.50) },
      pf: { x: X0 + Math.round(S * 0.27), y: A - 4 },
      ePanel: { x: X0 + 6, y: 6, w: 116, h: 30 },
      pPanel: { x: X0 + S - 6 - 116, y: A - 46, w: 116, h: 40 }
    };
    // keep tall creatures on screen (the enemy sits high up)
    L.eBonus = fitBonus(foeC, 'f', L.ef.y, bonus);
    L.pBonus = fitBonus(playerC, 'p', L.pf.y, bonus);
    return L;
  }
  function fitBonus(c, side, footY, bonus) {
    var F = FX();
    if (!c || !F) return bonus;
    var sz = F.creatureSize(c, bonus);
    var fh = sz.h / sz.scale;
    var maxScale = Math.max(1, Math.floor((footY - 2) / fh));
    if (sz.scale > maxScale) return bonus - (sz.scale - maxScale);
    return bonus;
  }

  // ---------- start / end ----------
  function start(o) {
    if (active) return false;
    var T = Game.Team, R = Game.BattleRules;
    if (!Game.Creatures || !R || !o || !o.foe) return false;
    var pc = o.player || (T && T.lead && T.lead());
    if (!pc) return false;
    opts = o; playerC = pc; foeC = o.foe;
    bs = R.begin(playerC, foeC);
    active = true; phase = 'transIn'; pt = 0; clock = 0;
    queue = []; cur = null; finished = false; finalResult = null; blackDone = false; outPhase = 'out';
    anims = { p: null, f: null }; fainted = { p: false, f: false };
    menuCur = 0; moveCur = 0; itemCur = 0; lastMouse = { x: -1, y: -1 };
    splatPlayed = false;
    syncShown();
    tin = FX() ? FX().transIn({ from: o.from }) : null;
    if (Game.Audio && Game.Audio.playClip) { try { Game.Audio.playClip('battleStart', 5, 0.6); } catch (e) { snd('battleStart'); } }
    else snd('battleStart');
    return true;
  }

  function msgStep(text, wait) { return { t: 'msg', text: text, wait: wait !== false }; }

  function beginReveal() {
    phase = 'reveal'; pt = 0;
  }

  function beginIntro() {
    var lines = (opts && opts.introLines && opts.introLines.length) ? opts.introLines.slice() : null;
    if (!lines) {
      lines = [(opts.trainer || 'The rival') + ' sent out ' + nameOf(foeC) + '!', 'Go, ' + nameOf(playerC) + '!'];
    }
    queue = [];
    for (var i = 0; i < lines.length; i++) queue.push(msgStep(lines[i], i < lines.length - 1));
    phase = 'steps'; pt = 0; cur = null;
  }

  function beginTransOut() {
    stopClip();
    phase = 'transOut'; pt = 0; outPhase = 'out'; blackDone = false;
    queue = []; cur = null;
  }

  function finishBattle() {
    var R = Game.BattleRules;
    var res = null;
    if (R && R.finish) { try { res = R.finish(bs); } catch (e) { res = null; } }
    finished = true;
    var steps = (res && res.steps) ? res.steps.slice() : [];
    finalResult = (res && res.result) || { outcome: bs.over, xpGained: 0, levelsGained: 0, coinsDelta: 0 };
    var extra = bs.over === 'win' ? opts.winLines : opts.loseLines;
    if (extra) for (var i = 0; i < extra.length; i++) steps.push(msgStep(extra[i], true));
    return steps;
  }

  function endAll() {
    var res = finalResult || { outcome: (bs && bs.over) || null };
    active = false; phase = '';
    stopClip();
    var o = opts;
    if (o && o.onEnd) { try { o.onEnd(res); } catch (e) { if (window.console) console.error(e); } }
  }

  function debugEnd(outcome) {
    if (!active) return;
    if (outcome !== 'win' && outcome !== 'lose') outcome = 'win';
    if (phase === 'transOut') return;
    bs.over = outcome;
    if (!finished) finishBattle();
    anims = { p: null, f: null };
    beginTransOut();
  }

  // ---------- step player ----------
  function wrapPages(text, maxW) {
    var ctx2 = lastCtx;
    var lines = ctx2 ? UI().wrap(ctx2, text, maxW) : [text];
    var pages = [];
    for (var i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
    if (!pages.length) pages.push(['']);
    return pages;
  }
  var lastCtx = null, lastW = 320;

  function initStep(s) {
    switch (s.t) {
      case 'msg':
        return { t: 'msg', pages: wrapPages(String(s.text), lastW - 24), page: 0, shown: 0, timer: 0, wait: s.wait !== false };
      case 'sound':
        snd(s.name); return { t: 'sound' };
      case 'anim':
        anims[s.side] = { name: s.anim, t: 0, dur: ANIM_DUR[s.anim] || 0.4 };
        return { t: 'anim', side: s.side };
      case 'hp': {
        var mx = Math.max(1, sideC(s.side).stats.hp);
        shownMax[s.side] = mx;
        shownHp[s.side] = s.from;
        return { t: 'hp', side: s.side, from: s.from, to: s.to, el: 0, dur: Math.max(0.3, Math.abs(s.to - s.from) / mx * 1.0) };
      }
      case 'xp':
        shownXp = s.fromFrac;
        return { t: 'xp', from: s.fromFrac, to: s.toFrac, el: 0, dur: Math.max(0.3, Math.abs(s.toFrac - s.fromFrac) * 1.0) };
      case 'level':
        shownLevel.p = s.level;
        shownMax.p = playerC.stats.hp;
        return { t: 'level' };
    }
    return { t: 'none' };
  }

  function pageLen(pg) { var n = 0; for (var i = 0; i < pg.length; i++) n += pg[i].length; return n; }

  // returns true when the current step is finished
  function updateStep(dt, confirm) {
    var s = cur;
    switch (s.t) {
      case 'msg': {
        var pg = s.pages[s.page], total = pageLen(pg);
        if (s.shown < total) {
          s.shown += dt * 60;
          if (confirm) s.shown = total;
          return false;
        }
        var last = s.page >= s.pages.length - 1;
        if (!last || s.wait) {
          if (confirm) {
            if (last) return true;
            s.page++; s.shown = 0; return false;
          }
          return false;
        }
        s.timer += dt;
        return s.timer >= 0.7 || confirm;
      }
      case 'anim': {
        var a = anims[s.side];
        if (!a) return true;
        return false; // finished by updateAnims
      }
      case 'hp': {
        s.el += dt;
        var f = Math.min(1, s.el / s.dur);
        shownHp[s.side] = s.from + (s.to - s.from) * f;
        if (f >= 1) { shownHp[s.side] = s.to; return true; }
        return false;
      }
      case 'xp': {
        s.el += dt;
        var g = Math.min(1, s.el / s.dur);
        shownXp = s.from + (s.to - s.from) * g;
        if (g >= 1) { shownXp = s.to; return true; }
        return false;
      }
    }
    return true;
  }

  function updateAnims(dt) {
    var sides = ['p', 'f'];
    for (var i = 0; i < 2; i++) {
      var a = anims[sides[i]];
      if (!a) continue;
      a.t += dt;
      if (a.t >= a.dur) {
        if (a.name === 'faint') fainted[sides[i]] = true;
        anims[sides[i]] = null;
      }
    }
  }

  function queueEmpty() {
    if (finished) { beginTransOut(); return; }
    if (bs.over) {
      queue = finishBattle();
      return;
    }
    syncShown();
    phase = 'menu'; pt = 0;
  }

  function runSteps(dt, confirm) {
    var guard = 0;
    while (guard++ < 60) {
      if (!cur) {
        if (!queue.length) { queueEmpty(); return; }
        cur = initStep(queue.shift());
      }
      var done = updateStep(dt, confirm);
      dt = 0; confirm = false;
      if (!done) return;
      cur = null;
    }
  }

  // ---------- input ----------
  function readInput(input) {
    var r = { confirm: false, back: false, up: false, down: false, left: false, right: false, click: null, rclick: false, mouse: null, moved: false };
    if (!input) return r;
    r.confirm = !!input.wasPressed('interact');
    r.back = !!input.wasPressed('close');
    r.up = !!input.wasPressed('up'); r.down = !!input.wasPressed('down');
    r.left = !!input.wasPressed('left'); r.right = !!input.wasPressed('right');
    var cl = input.mouseClicks ? input.mouseClicks() : [];
    for (var i = 0; i < cl.length; i++) {
      if (cl[i].button === 2) r.rclick = true;
      else if (cl[i].button === 0 && !r.click) r.click = cl[i];
    }
    if (input.mouse) {
      var m = input.mouse();
      if (m && m.inside) {
        r.mouse = m;
        r.moved = (m.x !== lastMouse.x || m.y !== lastMouse.y);
        lastMouse.x = m.x; lastMouse.y = m.y;
      }
    }
    if (r.rclick) r.back = true;
    ['interact', 'close', 'inventory', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'].forEach(function (a) { if (input.consume) input.consume(a); });
    return r;
  }

  function menuCell(L, i) { return { x: L.W - 128 + 3 + (i % 2) * 59, y: L.H - 44 + 2 + Math.floor(i / 2) * 19, w: 58, h: 18 }; }
  function moveCell(L, i) {
    var cw = Math.floor((L.W - 104 - 6) / 2);
    return { x: 7 + (i % 2) * cw, y: L.H - 44 + 2 + Math.floor(i / 2) * 19, w: cw - 1, h: 18 };
  }
  function backRect(L) { return { x: L.W - 96 + 92 - 28 - 3, y: L.H - 44 + 27, w: 28, h: 10 }; }

  function itemRows() {
    var rows = [], n = eggCount();
    if (n > 0) rows.push({ id: 'egg', label: 'Egg x' + n, enabled: true });
    else rows.push({ id: null, label: 'No items', enabled: false });
    rows.push({ id: 'back', label: 'Back', enabled: true });
    return rows;
  }
  function itemRect(L, rows) {
    var h = 6 + 12 * rows.length;
    return { x: L.W - 128, y: L.A - 4 - h, w: 124, h: h };
  }

  function moveList() {
    var out = [], ms = playerC.moves || [];
    for (var i = 0; i < ms.length && i < 4; i++) { var mv = moveOf(moveId(ms[i])); if (mv) out.push(mv); }
    return out;
  }

  function updateMenu(inp, L) {
    var old = menuCur;
    if (inp.left && menuCur % 2 === 1) menuCur--;
    if (inp.right && menuCur % 2 === 0) menuCur++;
    if (inp.up && menuCur >= 2) menuCur -= 2;
    if (inp.down && menuCur < 2) menuCur += 2;
    var sel = -1, i;
    if (inp.mouse && inp.moved) {
      for (i = 0; i < 4; i++) if (inRect(inp.mouse.x, inp.mouse.y, menuCell(L, i))) { if (menuCur !== i) { menuCur = i; old = i; } }
    }
    if (menuCur !== old) snd('menuMove');
    if (inp.click) {
      for (i = 0; i < 4; i++) if (inRect(inp.click.x, inp.click.y, menuCell(L, i))) { menuCur = i; sel = i; }
    } else if (inp.confirm) sel = menuCur;
    if (sel < 0) return;
    snd('menuSelect');
    if (sel === 0) { if (moveList().length) { phase = 'moves'; moveCur = clamp(moveCur, 0, moveList().length - 1); } }
    else if (sel === 1) { phase = 'items'; itemCur = 0; }
    else if (sel === 2) {
      var n = Game.Team && Game.Team.size ? Game.Team.size() : 1;
      queue = [msgStep(n <= 1 ? 'You have no other creatures!' : "You can't switch right now.", true)]; phase = 'steps'; cur = null;
    } else {
      queue = [msgStep("You can't run from a rival battle!", true)]; phase = 'steps'; cur = null;
    }
  }

  function startTurn(action) {
    var steps = Game.BattleRules.resolveTurn(bs, action);
    queue = steps ? steps.slice() : [];
    phase = 'steps'; cur = null;
  }

  function updateMoves(inp, L) {
    var ml = moveList(), n = ml.length, old = moveCur, i;
    if (n === 0) { phase = 'menu'; return; }
    if (moveCur === 4) {
      if (inp.up) moveCur = n > 2 ? 2 : 0;
    } else {
      if (inp.left && moveCur % 2 === 1) moveCur--;
      if (inp.right && moveCur % 2 === 0 && moveCur + 1 < n) moveCur++;
      if (inp.up && moveCur >= 2) moveCur -= 2;
      if (inp.down) { if (moveCur + 2 < n) moveCur += 2; else moveCur = 4; }
    }
    var br = backRect(L);
    if (inp.mouse && inp.moved) {
      for (i = 0; i < n; i++) if (inRect(inp.mouse.x, inp.mouse.y, moveCell(L, i))) moveCur = i;
      if (inRect(inp.mouse.x, inp.mouse.y, br)) moveCur = 4;
    }
    if (moveCur !== old) snd('menuMove');
    if (inp.back) { snd('menuBack'); phase = 'menu'; return; }
    var sel = -1;
    if (inp.click) {
      for (i = 0; i < n; i++) if (inRect(inp.click.x, inp.click.y, moveCell(L, i))) { moveCur = i; sel = i; }
      if (inRect(inp.click.x, inp.click.y, br)) { moveCur = 4; sel = 4; }
    } else if (inp.confirm) sel = moveCur;
    if (sel < 0) return;
    if (sel === 4) { snd('menuBack'); phase = 'menu'; return; }
    snd('menuSelect');
    startTurn({ kind: 'move', moveId: ml[sel].id });
  }

  function updateItems(inp, L) {
    var rows = itemRows(), n = rows.length, old = itemCur, i;
    itemCur = clamp(itemCur, 0, n - 1);
    function step(d) {
      var k = itemCur;
      for (var g = 0; g < n; g++) { k = (k + d + n) % n; if (rows[k].enabled) { itemCur = k; return; } }
    }
    if (!rows[itemCur].enabled) step(1);
    if (inp.up) step(-1);
    if (inp.down) step(1);
    var rc = itemRect(L, rows);
    if (inp.mouse && inp.moved) {
      for (i = 0; i < n; i++) if (rows[i].enabled && inRect(inp.mouse.x, inp.mouse.y, { x: rc.x, y: rc.y + 3 + 12 * i, w: rc.w, h: 12 })) itemCur = i;
    }
    if (itemCur !== old) snd('menuMove');
    if (inp.back) { snd('menuBack'); phase = 'menu'; return; }
    var sel = -1;
    if (inp.click) {
      for (i = 0; i < n; i++) if (rows[i].enabled && inRect(inp.click.x, inp.click.y, { x: rc.x, y: rc.y + 3 + 12 * i, w: rc.w, h: 12 })) { itemCur = i; sel = i; }
    } else if (inp.confirm) sel = itemCur;
    if (sel < 0) return;
    var row = rows[sel];
    if (!row.enabled) return;
    if (row.id === 'back') { snd('menuBack'); phase = 'menu'; return; }
    snd('menuSelect');
    if (row.id === 'egg') {
      if (playerC.hp >= playerC.stats.hp) {
        queue = [msgStep("It won't have any effect.", true)]; phase = 'steps'; cur = null; return;
      }
      var def = Game.Items && Game.Items.get ? Game.Items.get('egg') : null;
      var heal = (def && def.battle && def.battle.heal) || 20;
      var removed = (Game.Inventory && Game.Inventory.remove) ? Game.Inventory.remove('egg', 1) : 0;
      if (removed >= 1) startTurn({ kind: 'item', itemId: 'egg', heal: heal });
    }
  }

  // ---------- update ----------
  function update(dt, input, viewW, viewH) {
    if (!active) return;
    dt = Math.min(dt || 0, 0.05);
    clock += dt; pt += dt;
    lastW = viewW || lastW;
    var inp = readInput(input);
    var L = layout(viewW, viewH);
    lastL = L;

    if (phase === 'transIn') {
      if (!splatPlayed && pt >= 0.55) { splatPlayed = true; snd('splat'); }
      if (pt >= (FX() ? FX().TRANS_TIME : 1.9)) beginReveal();
    } else if (phase === 'reveal') {
      if (pt >= 0.9) beginIntro();
    } else if (phase === 'steps') {
      updateAnims(dt);
      runSteps(dt, inp.confirm || !!inp.click);
    } else if (phase === 'menu') {
      updateAnims(dt);
      updateMenu(inp, L);
    } else if (phase === 'moves') {
      updateAnims(dt); updateMoves(inp, L);
    } else if (phase === 'items') {
      updateAnims(dt); updateItems(inp, L);
    } else if (phase === 'transOut') {
      if (outPhase === 'out' && pt >= 0.4) {
        outPhase = 'black'; pt = 0;
        var o = opts, res = finalResult || { outcome: bs.over };
        if (o && o.onBlack) { try { o.onBlack(res); } catch (e) { if (window.console) console.error(e); } }
        blackDone = true;
      } else if (outPhase === 'black' && pt >= 0.4) {
        endAll();
      }
    }
  }

  // ---------- drawing ----------
  function animOffset(side, a) {
    var o = { x: 0, y: 0, flash: false, clipY: null };
    if (!a) return o;
    var p = Math.min(1, a.t / a.dur);
    if (a.name === 'lunge') {
      var d = Math.sin(p * Math.PI) * 8;
      o.x = side === 'p' ? d : -d; o.y = side === 'p' ? -d * 0.5 : d * 0.5;
    } else if (a.name === 'hit') {
      o.flash = Math.floor(a.t / 0.075) % 2 === 0;
      o.x = (Math.floor(a.t / 0.075) % 2 === 0 ? 2 : -2);
    }
    return o;
  }

  function drawSide(ctx, L, side, slideX) {
    var F = FX(), c = sideC(side);
    var foot = side === 'f' ? L.ef : L.pf;
    var bonus = side === 'f' ? L.eBonus : L.pBonus;
    var px = foot.x + slideX;
    if (side === 'f') F.drawPlatform(ctx, px, foot.y, 72, 14); else F.drawPlatform(ctx, px, foot.y, 88, 16);
    if (fainted[side]) return;
    var a = anims[side], o = animOffset(side, a);
    var sz = F.creatureSize(c, bonus);
    var frame = Math.floor(clock * 4) % 4;
    var op = { frame: frame, flash: o.flash, offX: o.x };
    var offY = o.y;
    if (a && a.name === 'faint') {
      offY = Math.round(Math.min(1, a.t / a.dur) * sz.h);
      op.clipY = foot.y;
    }
    op.offY = offY;
    F.drawCreature(ctx, c, side === 'f' ? 'front' : 'back', px, foot.y, bonus, op);
    if (a && (a.name === 'heal' || a.name === 'statUp' || a.name === 'statDown')) {
      F.drawSparkles(ctx, a.name, px, foot.y - Math.round(sz.h / 2), a.t / a.dur, Math.max(16, Math.round(sz.w / 2)));
    }
  }

  function drawPanels(ctx, L) {
    var u = UI(), TD = colOf('TEXT_DARK');
    var e = L.ePanel, p = L.pPanel, c, f;
    // enemy
    u.panel(ctx, e.x, e.y, e.w, e.h);
    u.text(ctx, nameOf(foeC), e.x + 6, e.y + 4, TD);
    u.text(ctx, 'Lv' + shownLevel.f, e.x + e.w - 6, e.y + 4, TD, { align: 'right' });
    u.text(ctx, 'HP', e.x + 6, e.y + 17, TD);
    f = clamp(shownHp.f / Math.max(1, shownMax.f), 0, 1);
    u.bar(ctx, e.x + 30, e.y + 18, 76, 4, f, u.hpColor(f), colOf('WOOD_DARK'));
    // player
    u.panel(ctx, p.x, p.y, p.w, p.h);
    u.text(ctx, nameOf(playerC), p.x + 6, p.y + 4, TD);
    u.text(ctx, 'Lv' + shownLevel.p, p.x + p.w - 6, p.y + 4, TD, { align: 'right' });
    u.text(ctx, 'HP', p.x + 6, p.y + 17, TD);
    f = clamp(shownHp.p / Math.max(1, shownMax.p), 0, 1);
    u.bar(ctx, p.x + 30, p.y + 18, 76, 4, f, u.hpColor(f), colOf('WOOD_DARK'));
    var cur = Math.max(0, Math.round(shownHp.p)), mx = shownMax.p;
    u.text(ctx, cur + '/' + mx, p.x + p.w - 6, p.y + 25, TD, { align: 'right' });
    u.bar(ctx, p.x + 6, p.y + 35, 104, 2, clamp(shownXp, 0, 1), '#4890E0', colOf('WOOD_DARK'));
  }

  function drawBox(ctx, L) {
    var u = UI();
    u.frame(ctx, L.box.x, L.box.y, L.box.w, L.box.h);
    u.panel(ctx, L.boxIn.x, L.boxIn.y, L.boxIn.w, L.boxIn.h);
  }

  function drawMessage(ctx, L) {
    var u = UI(), s = cur;
    if (!s || s.t !== 'msg') return;
    var pg = s.pages[s.page], rem = Math.floor(s.shown), total = pageLen(pg);
    for (var i = 0; i < pg.length; i++) {
      var ln = pg[i];
      var part = ln.substring(0, Math.max(0, rem));
      rem -= ln.length;
      if (part) u.text(ctx, part, 10, L.H - 40 + i * 11, colOf('TEXT_DARK'));
      if (rem <= 0) break;
    }
    if (s.shown >= total && (s.page < s.pages.length - 1 || s.wait)) {
      u.moreArrow(ctx, L.W - 16, L.H - 12, clock);
    }
  }

  function drawCellText(ctx, u, label, cell, selected, color) {
    if (selected) u.cursor(ctx, cell.x + 3, cell.y + 6, colOf('TEXT_DARK'));
    u.text(ctx, label, cell.x + 10, cell.y + 5, color || colOf('TEXT_DARK'));
  }

  function drawMenu(ctx, L) {
    var u = UI(), i;
    var lines = u.wrap(ctx, 'What will ' + nameOf(playerC) + ' do?', L.W - 140);
    for (i = 0; i < lines.length && i < 3; i++) u.text(ctx, lines[i], 10, L.H - 40 + i * 11, colOf('TEXT_DARK'));
    u.panel(ctx, L.W - 128, L.H - 44, 124, 40);
    for (i = 0; i < 4; i++) {
      var cell = menuCell(L, i);
      if (i === menuCur) { ctx.fillStyle = colOf('SELECT'); ctx.fillRect(cell.x, cell.y, cell.w, cell.h); }
      drawCellText(ctx, u, MENU[i], cell, i === menuCur);
    }
  }

  function drawMoves(ctx, L) {
    var u = UI(), i, TD = colOf('TEXT_DARK');
    var ml = moveList();
    u.panel(ctx, 4, L.H - 44, L.W - 104, 40);
    for (i = 0; i < ml.length; i++) {
      var cell = moveCell(L, i);
      if (i === moveCur) { ctx.fillStyle = colOf('SELECT'); ctx.fillRect(cell.x, cell.y, cell.w, cell.h); }
      drawCellText(ctx, u, ml[i].name, cell, i === moveCur);
    }
    u.panel(ctx, L.W - 96, L.H - 44, 92, 40);
    var mv = ml[Math.min(moveCur, ml.length - 1)];
    var bx = L.W - 96 + 5, by = L.H - 44 + 4;
    if (mv) {
      var T = Game.Creatures && Game.Creatures.TYPES && Game.Creatures.TYPES[mv.type];
      u.text(ctx, T ? T.name : mv.type, bx, by, T ? T.color : TD);
      u.text(ctx, mv.kind === 'damage' ? 'POW ' + mv.power : mv.kind === 'heal' ? 'HEAL' : 'STAT', bx, by + 10, TD);
      u.text(ctx, 'ACC ' + mv.acc, bx, by + 20, TD);
    }
    var br = backRect(L);
    ctx.fillStyle = moveCur === 4 ? colOf('SELECT') : colOf('CREAM');
    ctx.fillRect(br.x, br.y, br.w, br.h);
    ctx.fillStyle = colOf('OUTLINE');
    ctx.fillRect(br.x, br.y, br.w, 1); ctx.fillRect(br.x, br.y + br.h - 1, br.w, 1);
    ctx.fillRect(br.x, br.y, 1, br.h); ctx.fillRect(br.x + br.w - 1, br.y, 1, br.h);
    u.text(ctx, 'Back', br.x + br.w / 2, br.y + 1, TD, { align: 'center' });
  }

  function drawItems(ctx, L) {
    var u = UI(), rows = itemRows(), rc = itemRect(L, rows), TD = colOf('TEXT_DARK');
    u.frame(ctx, rc.x, rc.y, rc.w, rc.h);
    u.panel(ctx, rc.x + 2, rc.y + 2, rc.w - 4, rc.h - 4);
    for (var i = 0; i < rows.length; i++) {
      var ry = rc.y + 3 + 12 * i;
      if (i === itemCur && rows[i].enabled) { ctx.fillStyle = colOf('SELECT'); ctx.fillRect(rc.x + 3, ry, rc.w - 6, 12); u.cursor(ctx, rc.x + 6, ry + 3, TD); }
      u.text(ctx, rows[i].label, rc.x + 14, ry + 2, rows[i].enabled ? TD : '#8A7A70');
    }
    // keep the prompt visible on the left
    var lines = u.wrap(ctx, 'Use which item?', L.W - 140);
    for (i = 0; i < lines.length && i < 3; i++) u.text(ctx, lines[i], 10, L.H - 40 + i * 11, TD);
  }

  function slideOffsets(L) {
    var e = 1;
    if (phase === 'reveal') {
      var q = clamp((pt - 0.4) / 0.5, 0, 1);
      e = 1 - (1 - q) * (1 - q);
    }
    return { f: -Math.round((1 - e) * (L.ef.x + 90)), p: Math.round((1 - e) * (L.W - L.pf.x + 90)), hide: phase === 'reveal' && pt < 0.4 };
  }

  function draw(ctx, viewW, viewH) {
    if (!active) return;
    var F = FX();
    lastCtx = ctx; lastW = viewW;
    var L = layout(viewW, viewH);
    lastL = L;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.font = Game.CONFIG.UI.font(8); ctx.textBaseline = 'top';

    if (phase === 'transIn') {
      if (F) F.drawTransIn(ctx, viewW, viewH, tin, pt);
      ctx.restore();
      return;
    }
    if (phase === 'transOut' && outPhase === 'black') {
      // the world is showing underneath: only the fade-in from black is drawn
      F.drawFade(ctx, viewW, viewH, 1 - Math.min(4, Math.floor(pt / 0.4 * 5)) / 4);
      ctx.restore();
      return;
    }
    // the battle scene
    F.drawBackground(ctx, L, clock);
    var so = slideOffsets(L);
    drawSide(ctx, L, 'f', so.f);
    drawSide(ctx, L, 'p', so.p);
    if (phase === 'reveal') {
      if (pt >= 0.9) drawPanels(ctx, L);
    } else drawPanels(ctx, L);
    drawBox(ctx, L);
    if (phase === 'steps') drawMessage(ctx, L);
    else if (phase === 'menu') drawMenu(ctx, L);
    else if (phase === 'moves') drawMoves(ctx, L);
    else if (phase === 'items') { drawItems(ctx, L); }

    if (phase === 'reveal' && pt < 0.4) {
      F.drawFade(ctx, viewW, viewH, 1 - Math.min(4, Math.floor(pt / 0.4 * 5)) / 4);
    } else if (phase === 'transOut') {
      if (outPhase === 'out') F.drawFade(ctx, viewW, viewH, Math.min(4, Math.floor(pt / 0.4 * 5)) / 4);
      else F.drawFade(ctx, viewW, viewH, 1 - Math.min(4, Math.floor(pt / 0.4 * 5)) / 4);
    }
    ctx.restore();
  }

  Game.Battle = {
    start: start,
    isActive: function () { return active; },
    coversWorld: function () {
      if (!active) return false;
      if (phase === 'transIn') return false;
      if (phase === 'transOut') return outPhase === 'out';
      return true;
    },
    getPhase: function () { return active ? phase : ''; },
    update: update,
    draw: draw,
    layout: layout,
    debugEnd: debugEnd
  };
})();
