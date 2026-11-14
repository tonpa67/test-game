// battle_fx.js - the pictures for battles: creature drawing, background, egg-splash transition, sparkles.
// Everything is drawn with plain shapes and compositing (no pixel reading), so it works from file://.
window.Game = window.Game || {};
(function () {
  'use strict';

  var TRANS_TIME = 1.9;

  // ---------- small helpers ----------
  function circle(c, cx, cy, r, color, clipW, clipH) {
    // filled "pixel circle" built from rectangles (only visible rows)
    r = Math.round(r);
    if (r <= 0) return;
    c.fillStyle = color;
    var y0 = Math.max(-r, -cy), y1 = Math.min(r, clipH - 1 - cy);
    for (var dy = y0; dy <= y1; dy++) {
      var hw = Math.floor(Math.sqrt(r * r - dy * dy));
      var x0 = Math.max(cx - hw, 0), x1 = Math.min(cx + hw + 1, clipW);
      if (x1 > x0) c.fillRect(x0, cy + dy, x1 - x0, 1);
    }
  }

  function ellipse(c, cx, cy, rx, ry, color) {
    c.fillStyle = color;
    for (var dy = -ry; dy <= ry; dy++) {
      var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.0001))));
      c.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  }

  function imgOf(sp) {
    var im = sp.img;
    if (typeof im === 'string') im = Game.Assets && Game.Assets.get ? Game.Assets.get(im) : null;
    return im || null;
  }

  var scratch = null;
  function getScratch(w, h) {
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
    return scratch;
  }

  // ---------- creatures ----------
  // Size (in screen pixels) of a creature at the given extra scale.
  function creatureSize(creature, scaleBonus) {
    var sp = spriteOf(creature);
    if (!sp) return { w: 32, h: 32, scale: 1 };
    var s = Math.max(1, Math.round((sp.scale || 1) + (scaleBonus || 0)));
    return { w: sp.fw * s, h: sp.fh * s, scale: s };
  }
  function spriteOf(creature) {
    var C = Game.Creatures;
    if (!C || !C.SPECIES || !creature) return null;
    var sp = C.SPECIES[creature.species];
    return sp && sp.sprite ? sp.sprite : null;
  }

  // opts: {frame, flash, offX, offY, clipY, alpha}. footX/footY = bottom centre of the picture.
  function drawCreature(ctx, creature, view, footX, footY, scaleBonus, opts) {
    opts = opts || {};
    var sp = spriteOf(creature);
    if (!sp) return;
    var img = imgOf(sp);
    var v = sp[view] || sp.front || { row: 0, flip: false };
    var s = Math.max(1, Math.round((sp.scale || 1) + (scaleBonus || 0)));
    var fw = sp.fw, fh = sp.fh;
    var frame = ((opts.frame || 0) % (sp.frames || 1) + (sp.frames || 1)) % (sp.frames || 1);
    var dx = Math.round(footX - fw * s / 2 + (opts.offX || 0));
    var dy = Math.round(footY - fh * s + (opts.offY || 0));
    var tmp = null;
    if (img) {
      var sc = getScratch(fw, fh);
      var c2 = sc.getContext('2d');
      c2.setTransform(1, 0, 0, 1, 0, 0);
      c2.globalCompositeOperation = 'source-over';
      c2.globalAlpha = 1;
      c2.clearRect(0, 0, fw, fh);
      c2.imageSmoothingEnabled = false;
      if (v.flip) { c2.save(); c2.translate(fw, 0); c2.scale(-1, 1); }
      c2.drawImage(img, frame * fw, v.row * fh, fw, fh, 0, 0, fw, fh);
      if (v.flip) c2.restore();
      if (opts.flash) {
        c2.globalCompositeOperation = 'source-atop';
        c2.fillStyle = '#FFFFFF';
        c2.fillRect(0, 0, fw, fh);
        c2.globalCompositeOperation = 'source-over';
      }
      tmp = sc;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (opts.clipY != null) {
      ctx.beginPath();
      ctx.rect(0, 0, 100000, Math.round(opts.clipY));
      ctx.clip();
    }
    if (tmp) ctx.drawImage(tmp, 0, 0, fw, fh, dx, dy, fw * s, fh * s);
    else { ctx.fillStyle = opts.flash ? '#fff' : '#a77'; ctx.fillRect(dx, dy, fw * s, fh * s); }
    ctx.restore();
  }

  // ---------- background ----------
  // L = {W,H,A}: A is the height of the scene area (above the text box).
  var SKY = ['#78B8F0', '#8CC4F4', '#A4D2F8', '#BCE0FA'];
  var GRASS = ['#6CB04C', '#5CA040', '#68AC48', '#54983C'];

  function drawBackground(ctx, L, t) {
    var W = L.W, A = L.A;
    var horizon = Math.round(A * 0.40);
    var i;
    for (i = 0; i < SKY.length; i++) {
      var y0 = Math.round(horizon * i / SKY.length), y1 = Math.round(horizon * (i + 1) / SKY.length);
      ctx.fillStyle = SKY[i];
      ctx.fillRect(0, y0, W, y1 - y0);
    }
    // a few pixel clouds drifting slowly
    ctx.fillStyle = '#F4FAFF';
    for (i = 0; i < 3; i++) {
      var cx = Math.round(((i * 137 + (t || 0) * (3 + i)) % (W + 60)) - 40);
      var cy = 8 + i * 12;
      ctx.fillRect(cx + 4, cy, 22, 4);
      ctx.fillRect(cx, cy + 4, 30, 4);
      ctx.fillRect(cx + 8, cy - 3, 12, 3);
    }
    // grass bands
    var gh = A - horizon;
    for (i = 0; i < GRASS.length; i++) {
      var g0 = horizon + Math.round(gh * i / GRASS.length), g1 = horizon + Math.round(gh * (i + 1) / GRASS.length);
      ctx.fillStyle = GRASS[i];
      ctx.fillRect(0, g0, W, g1 - g0);
    }
    // fence along the horizon
    var S = Game.Sprites, fence = S && S.fence, fimg = Game.Assets && Game.Assets.get ? Game.Assets.get('fence') : null;
    if (fence && fimg) {
      var fy = horizon - 13;
      for (var x = -4; x < W; x += 16) {
        var r = fence.both;
        ctx.drawImage(fimg, r.x, r.y, r.w, r.h, x, fy, 16, 16);
      }
    } else {
      ctx.fillStyle = '#8A5A30';
      ctx.fillRect(0, horizon - 4, W, 2);
    }
    ctx.fillStyle = '#3C7A30';
    ctx.fillRect(0, horizon + 3, W, 1);
  }

  // Oval ground patch under a creature (centre x, centre y, width, height).
  function drawPlatform(ctx, cx, cy, w, h) {
    cx = Math.round(cx); cy = Math.round(cy);
    var rx = Math.round(w / 2), ry = Math.round(h / 2);
    ellipse(ctx, cx, cy + 2, rx, ry, '#3C7A30');
    ellipse(ctx, cx, cy + 1, rx, ry, '#8CCB6A');
    ellipse(ctx, cx, cy, rx - 2, Math.max(1, ry - 2), '#A4DC7C');
  }

  // ---------- fades ----------
  function stepAlpha(a) { return Math.max(0, Math.min(4, Math.round(a * 4))) / 4; }
  function drawFade(ctx, W, H, a) {
    a = stepAlpha(a);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---------- egg splash transition ----------
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function transIn(opts) {
    opts = opts || {};
    var st = { from: opts.from || null, blobs: [], drips: [], streaks: [], wob: Math.random() < 0.5 ? 0 : 1 };
    var n = 16 + Math.floor(Math.random() * 5), i;
    st.blobs.push({ a: 0, d: 0, r: 1 });
    for (i = 1; i < n; i++) st.blobs.push({ a: rnd(0, Math.PI * 2), d: rnd(0.05, 0.55), r: rnd(0.45, 0.85) });
    var nd = 4 + Math.floor(Math.random() * 3);
    for (i = 0; i < nd; i++) {
      st.drips.push({ u: -0.85 + 1.7 * (i + rnd(0.1, 0.9)) / nd, w: 2 + Math.floor(Math.random() * 3), spd: rnd(0.8, 1.6) });
    }
    for (i = 0; i < 6; i++) st.streaks.push({ x: Math.random(), y: rnd(0.05, 0.6), len: rnd(0.2, 0.5), spd: rnd(0.6, 1.2) });
    return st;
  }

  var EGG_ROWS = [2, 4, 6, 6, 6, 6, 4, 2];
  function eggShape(c, cx, cy, s, color, grow) {
    // egg drawn from rectangles; s = pixel size, grow = outline thickness
    c.fillStyle = color;
    var top = cy - Math.round(EGG_ROWS.length * s / 2);
    for (var r = 0; r < EGG_ROWS.length; r++) {
      var w = EGG_ROWS[r] * s;
      c.fillRect(Math.round(cx - w / 2 - grow), top + r * s - (r === 0 ? grow : 0),
        w + grow * 2, s + (r === 0 ? grow : 0) + (r === EGG_ROWS.length - 1 ? grow : 0));
    }
  }

  var off = null;
  function drawTransIn(ctx, W, H, st, t) {
    var w2 = Math.ceil(W / 2), h2 = Math.ceil(H / 2);
    if (!off) off = document.createElement('canvas');
    if (off.width !== w2 || off.height !== h2) { off.width = w2; off.height = h2; }
    var c = off.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.clearRect(0, 0, w2, h2);
    c.imageSmoothingEnabled = false;
    var cx = Math.round(w2 / 2), cy = Math.round(h2 / 2);
    var diag = Math.sqrt(w2 * w2 + h2 * h2);
    var i;

    if (t < 0.55) {
      var p = t / 0.55;
      var fx = st.from ? st.from.x / 2 : w2 * 0.5, fy = st.from ? st.from.y / 2 : h2 * 0.7;
      var x = fx + (cx - fx) * p;
      var y = fy + (cy - fy) * p - Math.sin(p * Math.PI) * h2 * 0.35;
      var s = 1 + Math.min(5, Math.floor(p * 5.999));
      var wob = (Math.floor(t / 0.07) + st.wob) % 2;
      var ex = Math.round(x) + (wob ? 1 : -1);
      eggShape(c, ex, Math.round(y), s, '#32131E', 1);
      eggShape(c, ex, Math.round(y), s, '#FFF4E0', 0);
      c.fillStyle = '#FFFFFF';
      c.fillRect(ex - s * 2, Math.round(y) - s * 3, s, s * 2);
      c.fillStyle = '#EBCFB4';
      c.fillRect(ex + s, Math.round(y) + s, s * 2, s * 2);
    } else {
      var q = Math.min(1, (t - 0.55) / 0.2);
      var e = 1 - (1 - q) * (1 - q);
      var R = diag * (0.1 + 1.3 * e);
      if (R >= diag * 1.05 * 1.0 && q >= 1) {
        c.fillStyle = '#FFFFFF';
        c.fillRect(0, 0, w2, h2);
      } else {
        for (i = 0; i < st.blobs.length; i++) {
          var b = st.blobs[i];
          circle(c, Math.round(cx + Math.cos(b.a) * b.d * R), Math.round(cy + Math.sin(b.a) * b.d * R),
            R * b.r, '#FFFFFF', w2, h2);
        }
      }
      // light grey streaks on the white
      var dt = Math.max(0, t - 0.75);
      c.fillStyle = '#E2E2E2';
      for (i = 0; i < st.streaks.length; i++) {
        var sk = st.streaks[i];
        var len = Math.min(sk.len * h2, dt * sk.spd * h2 * 0.7);
        if (len > 0) c.fillRect(Math.round(sk.x * w2), Math.round(sk.y * h2), 1, Math.round(len));
      }
      // yolk
      var yr = Math.round(0.11 * Math.min(W, H) * (0.3 + 0.7 * Math.min(1, (t - 0.55) / 0.25)));
      // drips first (behind the yolk)
      for (i = 0; i < st.drips.length; i++) {
        var d = st.drips[i];
        var dx = Math.round(cx + d.u * yr * 0.9);
        var startY = cy + Math.round(yr * Math.sqrt(Math.max(0, 1 - d.u * d.u * 0.81)) * 0.8);
        var run = Math.min(h2 - startY + 4, dt * d.spd * h2 * 0.9);
        if (run > 0 && t >= 0.75) {
          c.fillStyle = '#E8A020';
          c.fillRect(dx - 1, startY, d.w + 2, Math.round(run));
          c.fillStyle = '#FFD23A';
          c.fillRect(dx, startY, d.w, Math.round(run));
          circle(c, dx + Math.floor(d.w / 2), startY + Math.round(run), Math.ceil(d.w / 2) + 1, '#E8A020', w2, h2);
          circle(c, dx + Math.floor(d.w / 2), startY + Math.round(run), Math.ceil(d.w / 2), '#FFD23A', w2, h2);
          c.fillStyle = '#E2E2E2';
          c.fillRect(dx + d.w + 2, startY, 1, Math.round(run * 0.7));
        }
      }
      if (yr > 0) {
        circle(c, cx, cy, yr + 2, '#E8A020', w2, h2);
        circle(c, cx, cy, yr, '#FFD23A', w2, h2);
        c.fillStyle = '#FFF2A0';
        c.fillRect(cx - Math.round(yr * 0.5), cy - Math.round(yr * 0.5), 3, 3);
        c.fillStyle = '#FFFFFF';
        c.fillRect(cx - Math.round(yr * 0.5) + 1, cy - Math.round(yr * 0.5) + 1, 3, 3);
      }
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, w2, h2, 0, 0, w2 * 2, h2 * 2);
    ctx.restore();

    // fade to dark at the end
    if (t >= 1.45) {
      var a = t < 1.55 ? 0.25 : t < 1.65 ? 0.5 : t < 1.78 ? 0.75 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // ---------- sparkles (heal / stat up / stat down) ----------
  // kind: 'heal'|'statUp'|'statDown'; p = progress 0..1; x,y = centre of the creature.
  function drawSparkles(ctx, kind, x, y, p, spread) {
    spread = spread || 24;
    var col = kind === 'heal' ? '#58E048' : kind === 'statUp' ? '#FFD040' : '#8098D8';
    var n = 7;
    ctx.save();
    for (var i = 0; i < n; i++) {
      var px = Math.round(x + ((i * 37) % (spread * 2 + 1)) - spread);
      var phase = (p + i / n) % 1;
      var py = kind === 'statDown' ? Math.round(y - spread * 1.4 + phase * spread * 1.6) : Math.round(y - phase * spread * 1.6 + 6);
      ctx.globalAlpha = Math.max(0, 1 - Math.abs(phase - 0.5) * 1.2) * (1 - p * 0.3);
      ctx.fillStyle = col;
      if (kind === 'heal') {
        ctx.fillRect(px - 1, py, 3, 1);
        ctx.fillRect(px, py - 1, 1, 3);
      } else if (kind === 'statUp') {
        ctx.fillRect(px, py - 2, 1, 5);
        ctx.fillRect(px - 1, py - 1, 3, 1);
        ctx.fillRect(px - 2, py, 5, 1);
      } else {
        ctx.fillRect(px, py - 2, 1, 5);
        ctx.fillRect(px - 1, py + 1, 3, 1);
        ctx.fillRect(px - 2, py, 5, 1);
      }
    }
    ctx.restore();
  }

  Game.BattleFX = {
    TRANS_TIME: TRANS_TIME,
    creatureSize: creatureSize,
    drawCreature: drawCreature,
    drawBackground: drawBackground,
    drawPlatform: drawPlatform,
    transIn: transIn,
    drawTransIn: drawTransIn,
    drawFade: drawFade,
    drawSparkles: drawSparkles
  };
})();
