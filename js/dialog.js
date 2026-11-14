// dialog.js - the talking box at the bottom of the screen (used for Farmer Rex and for choosing a partner).
// Game.Dialog.open({speaker, lines, choices, onDone}); onDone runs after the box has closed.
window.Game = window.Game || {};
(function () {
  'use strict';

  var CPS = 60;          // typed letters per second
  var LINE_H = 10;
  var BOX_H = 44;

  var cur = null;        // {speaker, lines, choices, onDone, line, shown, cursor, t}
  var lastLayout = null;
  var lastT = 0;

  function ui(name, fallback) {
    var u = Game.CONFIG && Game.CONFIG.UI;
    return (u && u[name]) || fallback;
  }
  function sound(name) {
    try { if (Game.Audio && Game.Audio.play) Game.Audio.play(name); } catch (e) {}
  }
  function consume(input, a) { if (input && input.consume) input.consume(a); }

  function layout(viewW, viewH) {
    var reserve = ui('HOTBAR_RESERVE', 32);
    var w = Math.min(viewW - 8, 300);
    var x = Math.floor((viewW - w) / 2);
    var y = viewH - reserve - 4 - BOX_H;
    var L = { x: x, y: y, w: w, h: BOX_H, textX: x + 8, textY: y + 7, textW: w - 24 };
    if (cur && cur.choices) {
      var n = cur.choices.length;
      var cw = 0;
      for (var i = 0; i < n; i++) cw = Math.max(cw, cur.choices[i].length * 5);
      var pw = cw + 20, ph = 6 + n * 11;
      L.choicePanel = { x: x + w - pw - 2, y: y - ph - 1, w: pw, h: ph };
      L.choiceRects = [];
      for (var j = 0; j < n; j++) {
        L.choiceRects.push({ x: L.choicePanel.x + 3, y: L.choicePanel.y + 3 + j * 11, w: pw - 6, h: 11 });
      }
    }
    return L;
  }

  // Cuts one long line into pieces that fit the box width.
  var measureCtx = null;
  function wrap(ctx, str, maxW) {
    var words = String(str).split(' '), out = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(t).width > maxW) { out.push(line); line = words[i]; }
      else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function startLine(i) {
    cur.line = i;
    cur.shown = 0;
    cur.t = 0;
    sound('talk');
  }

  function finish(choice) {
    var d = cur;
    cur = null;
    if (d && d.onDone) {
      try { d.onDone(choice); } catch (e) { if (window.console) console.error(e); }
    }
  }

  function isLast() { return cur.line >= cur.lines.length - 1; }
  function fullText() { return String(cur.lines[cur.line]); }
  function typing() { return cur.shown < fullText().length; }

  function confirm() {
    if (typing()) { cur.shown = fullText().length; return; }
    if (!isLast()) { startLine(cur.line + 1); return; }
    if (cur.choices) { sound('menuSelect'); finish(cur.cursor); return; }
    finish(null);
  }

  var Dialog = Game.Dialog = {
    open: function (opts) {
      opts = opts || {};
      var lines = (opts.lines && opts.lines.length) ? opts.lines.slice() : [''];
      var choices = (opts.choices && opts.choices.length) ? opts.choices.slice() : null;
      cur = { speaker: opts.speaker || '', lines: lines, choices: choices, onDone: opts.onDone || null,
        line: 0, shown: 0, cursor: 0, t: 0 };
      lastT = 0;
      startLine(0);
    },
    isOpen: function () { return !!cur; },
    close: function () { cur = null; },

    handleInput: function (input, viewW, viewH) {
      if (!cur) return;
      var L = layout(viewW, viewH);
      lastLayout = L;
      var onChoices = !!cur.choices && isLast() && !typing();

      if (input.wasPressed('interact')) {
        consume(input, 'interact');
        confirm();
        return;
      }
      if (input.wasPressed('close')) {
        consume(input, 'close');
        if (cur.choices) { sound('menuBack'); finish(cur.choices.length - 1); }
        else finish(null);
        return;
      }
      if (onChoices) {
        var n = cur.choices.length;
        var step = 0;
        if (input.wasPressed('up') || input.wasPressed('left')) step = -1;
        else if (input.wasPressed('down') || input.wasPressed('right')) step = 1;
        if (step) {
          cur.cursor = (cur.cursor + step + n) % n;
          sound('menuMove');
        }
        var m = input.mouse ? input.mouse() : null;
        if (m && m.inside) {
          for (var i = 0; i < n; i++) {
            var r = L.choiceRects[i];
            if (m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h && cur.cursor !== i) {
              cur.cursor = i; sound('menuMove');
            }
          }
        }
      }
      var clicks = input.mouseClicks ? input.mouseClicks() : [];
      for (var k = 0; k < clicks.length; k++) {
        var c = clicks[k];
        if (c.button === 2) {
          if (cur.choices) { sound('menuBack'); finish(cur.choices.length - 1); }
          else finish(null);
          return;
        }
        if (c.button !== 0) continue;
        if (onChoices) {
          for (var j = 0; j < cur.choices.length; j++) {
            var rr = L.choiceRects[j];
            if (c.x >= rr.x && c.x < rr.x + rr.w && c.y >= rr.y && c.y < rr.y + rr.h) {
              cur.cursor = j; sound('menuSelect'); finish(j); return;
            }
          }
          continue;   // clicking elsewhere does not choose
        }
        confirm();
        return;
      }
    },

    draw: function (ctx, viewW, viewH) {
      if (!cur) return;
      var L = layout(viewW, viewH);
      lastLayout = L;
      var nowT = (window.performance && performance.now) ? performance.now() : Date.now();
      var dt = lastT ? Math.min(0.05, (nowT - lastT) / 1000) : 0;
      lastT = nowT;
      cur.t += dt;
      var full = fullText();
      if (cur.shown < full.length) cur.shown = Math.min(full.length, cur.shown + CPS * dt);

      var OUT = ui('OUTLINE', '#32131E'), WOOD = ui('WOOD', '#8A3625'), HI = ui('WOOD_LIGHT', '#AE4924'),
        DK = ui('WOOD_DARK', '#4A2123'), CREAM = ui('CREAM_LIGHT', '#EBCFB4'), TXT = ui('TEXT_DARK', '#32131E'),
        LIGHT = ui('TEXT_LIGHT', '#FFF4E0');

      function frame(x, y, w, h) {
        ctx.fillStyle = OUT; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = WOOD; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        ctx.fillStyle = HI; ctx.fillRect(x + 1, y + 1, w - 2, 1);
        ctx.fillStyle = DK; ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
      }
      function panel(x, y, w, h) {
        ctx.fillStyle = OUT; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = CREAM; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        ctx.fillStyle = DK; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2);
      }

      ctx.save();
      ctx.font = Game.CONFIG.UI.font(8);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.imageSmoothingEnabled = false;

      frame(L.x, L.y, L.w, L.h);
      panel(L.x + 3, L.y + 3, L.w - 6, L.h - 6);

      if (cur.speaker) {
        var sw = Math.ceil(ctx.measureText(cur.speaker).width) + 10;
        frame(L.x + 6, L.y - 9, sw, 12);
        ctx.fillStyle = LIGHT;
        ctx.fillText(cur.speaker, L.x + 11, L.y - 6);
      }

      // typed text (wrap the full line first so words do not jump around)
      var rows = wrap(ctx, full, L.textW);
      var left = Math.floor(cur.shown);
      ctx.fillStyle = TXT;
      for (var i = 0; i < rows.length && left > 0; i++) {
        var part = rows[i].substring(0, left);
        ctx.fillText(part, Math.round(L.textX), Math.round(L.textY + i * LINE_H));
        left -= rows[i].length + 1;
      }

      var done = cur.shown >= full.length;
      if (done && !(cur.choices && isLast())) {
        // blinking "more" arrow at the bottom right
        if (Math.floor(cur.t * 2.5) % 2 === 0) {
          var ax = L.x + L.w - 13, ay = L.y + L.h - 11;
          ctx.fillStyle = TXT;
          ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1);
        }
      }

      if (done && cur.choices && isLast()) {
        var P = L.choicePanel;
        frame(P.x, P.y, P.w, P.h);
        panel(P.x + 2, P.y + 2, P.w - 4, P.h - 4);
        for (var j = 0; j < cur.choices.length; j++) {
          var r = L.choiceRects[j];
          ctx.fillStyle = TXT;
          ctx.fillText(cur.choices[j], r.x + 12, r.y + 2);
          if (j === cur.cursor) {
            var cx = r.x + 4, cy = r.y + 2;
            ctx.fillRect(cx, cy, 1, 5); ctx.fillRect(cx + 1, cy + 1, 1, 3); ctx.fillRect(cx + 2, cy + 2, 1, 1);
          }
        }
      }
      ctx.restore();
    }
  };
})();
