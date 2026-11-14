(function () {
  window.Game = window.Game || {};
  var G = window.Game;

  var ac = null;       // AudioContext (created on first key/click)
  var master = null;   // master gain
  var volume = 0.35;
  var muted = false;
  var registry = {};
  var unlocked = false;
  var EVENTS = ['keydown', 'mousedown', 'touchstart'];

  function applyVolume() {
    try { if (master) master.gain.value = muted ? 0 : volume; } catch (e) {}
  }

  function removeListeners() {
    for (var i = 0; i < EVENTS.length; i++) {
      try { window.removeEventListener(EVENTS[i], onUnlock, true); } catch (e) {}
    }
  }

  function onUnlock() {
    try {
      if (!ac) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { removeListeners(); return; }
        ac = new AC();
        master = ac.createGain();
        master.connect(ac.destination);
        applyVolume();
      }
      if (ac.state !== 'running' && ac.resume) {
        var p = ac.resume();
        if (p && p.then) p.then(check, function () {});
      }
      check();
    } catch (e) {}
  }

  function check() {
    try {
      if (ac && ac.state === 'running') {
        unlocked = true;
        removeListeners();
      }
    } catch (e) {}
  }

  try {
    for (var i = 0; i < EVENTS.length; i++) {
      window.addEventListener(EVENTS[i], onUnlock, { capture: true, passive: true });
    }
  } catch (e) {}

  // Helper: oscillator with a short volume envelope.
  function tone(c, out, type, f0, f1, t, dur, peak, attack) {
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  registry.pickup = function (c, out, t) {
    // Soft "pop": quick upward glide, quiet octave on top.
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(1040, t + 0.06);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.16);

    var o2 = c.createOscillator();
    var g2 = c.createGain();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(1040, t);
    o2.frequency.linearRampToValueAtTime(2080, t + 0.06);
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.12, t + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o2.connect(g2);
    g2.connect(out);
    o2.start(t);
    o2.stop(t + 0.16);
  };

  registry.denied = function (c, out, t) {
    tone(c, out, 'triangle', 220, 220, t, 0.07, 0.3, 0.005);
    tone(c, out, 'triangle', 165, 165, t + 0.08, 0.07, 0.3, 0.005);
  };

  registry.open = function (c, out, t) {
    tone(c, out, 'triangle', 300, 180, t, 0.05, 0.35, 0.003);
  };

  registry.close = function (c, out, t) {
    tone(c, out, 'triangle', 180, 120, t, 0.05, 0.35, 0.003);
  };

  registry.select = function (c, out, t) {
    tone(c, out, 'sine', 880, 880, t, 0.03, 0.15, 0.003);
  };

  // Helper: short burst of filtered noise.
  var noiseBufs = [];
  var noiseCtxs = [];
  function noiseBuffer(c) {
    var idx = noiseCtxs.indexOf(c);
    if (idx >= 0) return noiseBufs[idx];
    var len = Math.floor(c.sampleRate * 0.5);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseCtxs.push(c);
    noiseBufs.push(buf);
    return buf;
  }
  function noise(c, out, t, dur, peak, filterType, freq) {
    var s = c.createBufferSource();
    s.buffer = noiseBuffer(c);
    var f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(out);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  registry.chestOpen = function (c, out, t) {
    // Wooden creak: wobbly sawtooth through a bandpass.
    var o = c.createOscillator();
    var g = c.createGain();
    var bp = c.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, t);
    o.frequency.linearRampToValueAtTime(230, t + 0.28);
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 6;
    var lfo = c.createOscillator();
    var lg = c.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 18;
    lg.gain.value = 25;
    lfo.connect(lg);
    lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(bp);
    bp.connect(g);
    g.connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.32);
    lfo.stop(t + 0.32);
    // Latch thunk at the end.
    tone(c, out, 'sine', 140, 60, t + 0.3, 0.09, 0.45, 0.004);
    noise(c, out, t + 0.3, 0.03, 0.2, 'lowpass', 1500);
  };

  registry.chestClose = function (c, out, t) {
    tone(c, out, 'sine', 110, 50, t, 0.14, 0.5, 0.004);
    noise(c, out, t, 0.06, 0.25, 'lowpass', 700);
    tone(c, out, 'triangle', 380, 200, t, 0.02, 0.08, 0.002);
  };

  // ---- Battle and menu sounds (all synthesized, no files needed) ----
  registry.talk = function (c, out, t) {
    tone(c, out, 'square', 520, 480, t, 0.04, 0.08, 0.004);
  };
  registry.menuMove = function (c, out, t) {
    tone(c, out, 'square', 440, 440, t, 0.03, 0.07, 0.003);
  };
  registry.menuSelect = function (c, out, t) {
    tone(c, out, 'square', 660, 660, t, 0.04, 0.09, 0.003);
    tone(c, out, 'square', 990, 990, t + 0.04, 0.06, 0.09, 0.003);
  };
  registry.menuBack = function (c, out, t) {
    tone(c, out, 'square', 400, 260, t, 0.07, 0.08, 0.003);
  };
  registry.battleStart = function (c, out, t) {
    tone(c, out, 'sawtooth', 120, 900, t, 0.9, 0.2, 0.05);
    tone(c, out, 'square', 240, 1800, t, 0.9, 0.06, 0.05);
    noise(c, out, t, 0.9, 0.15, 'highpass', 1500);
  };
  registry.splat = function (c, out, t) {
    noise(c, out, t, 0.18, 0.5, 'lowpass', 900);
    tone(c, out, 'sine', 200, 70, t, 0.35, 0.45, 0.004);
    tone(c, out, 'triangle', 520, 140, t + 0.05, 0.4, 0.15, 0.01);
  };
  registry.hit = function (c, out, t) {
    noise(c, out, t, 0.1, 0.45, 'lowpass', 2200);
    tone(c, out, 'square', 220, 90, t, 0.1, 0.2, 0.003);
  };
  registry.hitSuper = function (c, out, t) {
    noise(c, out, t, 0.18, 0.6, 'lowpass', 3500);
    tone(c, out, 'square', 320, 70, t, 0.18, 0.28, 0.003);
    tone(c, out, 'sawtooth', 160, 50, t, 0.22, 0.2, 0.003);
  };
  registry.hitWeak = function (c, out, t) {
    noise(c, out, t, 0.06, 0.2, 'lowpass', 1200);
    tone(c, out, 'square', 160, 110, t, 0.07, 0.1, 0.003);
  };
  registry.miss = function (c, out, t) {
    noise(c, out, t, 0.15, 0.15, 'bandpass', 1800);
    tone(c, out, 'sine', 700, 350, t, 0.15, 0.1, 0.01);
  };
  registry.faint = function (c, out, t) {
    tone(c, out, 'triangle', 500, 80, t, 0.6, 0.35, 0.01);
  };
  registry.heal = function (c, out, t) {
    var n = [523, 659, 784, 1047];
    for (var i = 0; i < n.length; i++) tone(c, out, 'triangle', n[i], n[i], t + i * 0.07, 0.18, 0.22, 0.005);
  };
  registry.statUp = function (c, out, t) {
    tone(c, out, 'square', 400, 800, t, 0.25, 0.1, 0.01);
  };
  registry.statDown = function (c, out, t) {
    tone(c, out, 'square', 700, 300, t, 0.25, 0.1, 0.01);
  };
  registry.levelUp = function (c, out, t) {
    var n = [523, 659, 784, 1047];
    for (var i = 0; i < n.length; i++) tone(c, out, 'square', n[i], n[i], t + i * 0.1, i === 3 ? 0.4 : 0.12, 0.12, 0.005);
  };
  registry.win = function (c, out, t) {
    var n = [392, 523, 659, 784, 659, 784];
    for (var i = 0; i < n.length; i++) tone(c, out, 'square', n[i], n[i], t + i * 0.11, i === 5 ? 0.5 : 0.14, 0.11, 0.005);
  };
  registry.lose = function (c, out, t) {
    var n = [392, 330, 262];
    for (var i = 0; i < n.length; i++) tone(c, out, 'triangle', n[i], n[i] * 0.97, t + i * 0.22, i === 2 ? 0.6 : 0.24, 0.3, 0.01);
  };
  registry.coin = function (c, out, t) {
    tone(c, out, 'square', 988, 988, t, 0.07, 0.1, 0.003);
    tone(c, out, 'square', 1319, 1319, t + 0.07, 0.25, 0.1, 0.003);
  };

  // ---- Sound files (played with plain audio elements; works from file://) ----
  var files = {};
  var clip = null;       // the one tracked short clip: { el, timer, fade, name }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function synth(name) {
    try {
      if (!ac || !unlocked || muted || !master) return;
      var fn = registry[name];
      if (!fn) return;
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      fn(ac, master, ac.currentTime);
    } catch (e) {}
  }

  function stopClip() {
    var c = clip;
    clip = null;
    if (!c) return;
    try { clearTimeout(c.timer); clearInterval(c.fade); } catch (e) {}
    try { c.el.pause(); } catch (e) {}
  }

  function playClip(name, seconds, fadeSeconds) {
    try {
      stopClip();
      if (muted) return;
      var f = files[name];
      if (!f || f.state === 'failed') { synth(name); return; }
      seconds = Number(seconds) > 0 ? Number(seconds) : 5;
      fadeSeconds = Math.max(0, Math.min(seconds, Number(fadeSeconds) || 0));
      var el = f.el.cloneNode();
      var vol = clamp01(volume * f.gain);
      el.volume = vol;
      try { el.currentTime = 0; } catch (e) {}
      var mine = { el: el, timer: null, fade: null, name: name };
      clip = mine;
      var started = Date.now();
      mine.timer = setTimeout(function () { if (clip === mine) stopClip(); }, seconds * 1000);
      if (fadeSeconds > 0) {
        mine.fade = setInterval(function () {
          if (clip !== mine) return;
          var left = seconds - (Date.now() - started) / 1000;
          if (left < fadeSeconds) {
            try { el.volume = clamp01(vol * Math.max(0, left / fadeSeconds)); } catch (e) {}
          }
        }, 40);
      }
      var p = el.play();
      if (p && p.catch) {
        p.catch(function () {
          if (clip === mine) { stopClip(); synth(name); }
        });
      }
    } catch (e) { try { stopClip(); synth(name); } catch (e2) {} }
  }

  G.Audio = {
    playClip: playClip,
    stopClip: stopClip,
    isClipPlaying: function () { return !!clip; },
    play: function (name) {
      try {
        if (muted) return;
        var f = files[name];
        if (f && f.state !== 'failed') {
          try {
            var a = f.el.cloneNode();
            a.volume = clamp01(volume * f.gain);
            a.currentTime = 0;
            var p = a.play();
            if (p && p.catch) p.catch(function () { synth(name); });
          } catch (e) { synth(name); }
          return;
        }
        synth(name);
      } catch (e) {}
    },
    registerFile: function (name, path, opts) {
      try {
        var gain = opts && Number(opts.gain) > 0 ? Number(opts.gain) : 2;
        var el = new Audio(encodeURI(path));
        var entry = { el: el, state: 'loading', gain: gain };
        el.preload = 'auto';
        el.addEventListener('canplaythrough', function () { entry.state = 'ready'; });
        el.addEventListener('loadeddata', function () { if (entry.state === 'loading') entry.state = 'ready'; });
        el.addEventListener('error', function () { entry.state = 'failed'; });
        files[name] = entry;
        if (el.load) el.load();
      } catch (e) {}
    },
    define: function (name, fn) {
      if (typeof name === 'string' && typeof fn === 'function') registry[name] = fn;
    },
    setVolume: function (v) {
      v = Number(v);
      if (isNaN(v)) return;
      volume = Math.max(0, Math.min(1, v));
      applyVolume();
    },
    setMuted: function (m) {
      muted = !!m;
      if (muted) stopClip();
      applyVolume();
    }
  };

  // ---- SOUND_FILES: which sound slot uses which file. Slots without a file use the built-in synth sound. ----
  G.Audio.registerFile('pickup', 'Audio/floraphonic-bloop-2-186531.mp3');
  // First 5 seconds of this song play when a battle starts (file is not on GitHub; synth whoosh if missing).
  G.Audio.registerFile('battleStart', 'Audio/Pokémon FireRed & LeafGreen - Rival Encounter Music (HQ).mp3', { gain: 1.2 });
  // Ready for your own files (uncomment and point at a file):
  // G.Audio.registerFile('talk', 'Audio/talk.mp3');
  // G.Audio.registerFile('menuMove', 'Audio/menu-move.mp3');
  // G.Audio.registerFile('menuSelect', 'Audio/menu-select.mp3');
  // G.Audio.registerFile('menuBack', 'Audio/menu-back.mp3');
  // G.Audio.registerFile('splat', 'Audio/splat.mp3');
  // G.Audio.registerFile('hit', 'Audio/hit.mp3');
  // G.Audio.registerFile('hitSuper', 'Audio/hit-super.mp3');
  // G.Audio.registerFile('hitWeak', 'Audio/hit-weak.mp3');
  // G.Audio.registerFile('miss', 'Audio/miss.mp3');
  // G.Audio.registerFile('faint', 'Audio/faint.mp3');
  // G.Audio.registerFile('heal', 'Audio/heal.mp3');
  // G.Audio.registerFile('statUp', 'Audio/stat-up.mp3');
  // G.Audio.registerFile('statDown', 'Audio/stat-down.mp3');
  // G.Audio.registerFile('levelUp', 'Audio/level-up.mp3');
  // G.Audio.registerFile('win', 'Audio/win.mp3');
  // G.Audio.registerFile('lose', 'Audio/lose.mp3');
  // G.Audio.registerFile('coin', 'Audio/coin.mp3');
})();
