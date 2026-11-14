window.Game = window.Game || {};
(function () {
  'use strict';

  var MAX_LEVEL = 50;

  // ---- Types ----
  var TYPES = {
    normal: { name: 'Normal', color: '#A8A090' },
    field:  { name: 'Field',  color: '#5C9C38' },
    water:  { name: 'Water',  color: '#4088D0' },
    fire:   { name: 'Fire',   color: '#E06030' }
  };
  // Field beats Water, Water beats Fire, Fire beats Field.
  var TUNE = { SUPER: 1.25, WEAK: 0.8, STAB: 1.1, DIV: 50, FLAT: 2 };
  var BEATS = { field: 'water', water: 'fire', fire: 'field' };

  function typeMult(moveType, defType) {
    if (moveType === 'normal' || defType === 'normal' || !BEATS[moveType]) return 1;
    if (moveType === defType) return TUNE.WEAK;
    if (BEATS[moveType] === defType) return TUNE.SUPER;
    if (BEATS[defType] === moveType) return TUNE.WEAK;
    return 1;
  }

  // ---- Moves ----
  function mv(id, name, type, kind, power, acc, extra) {
    var m = { id: id, name: name, type: type, kind: kind, power: power, acc: acc, priority: 0,
      healFrac: 0, target: 'foe', stat: null, stages: 0, desc: '' };
    for (var k in extra) m[k] = extra[k];
    return m;
  }
  var MOVES = {
    headbutt:     mv('headbutt', 'Headbutt', 'normal', 'damage', 40, 100, { desc: 'A solid bonk.' }),
    stomp:        mv('stomp', 'Stomp', 'field', 'damage', 60, 95, { desc: 'Stamps down hard.' }),
    mooBlast:     mv('mooBlast', 'Moo Blast', 'normal', 'damage', 70, 85, { desc: 'A very loud moo.' }),
    graze:        mv('graze', 'Graze', 'field', 'heal', 0, 100, { healFrac: 0.35, target: 'self', desc: 'Munches grass to heal.' }),
    hornCharge:   mv('hornCharge', 'Horn Charge', 'field', 'damage', 70, 90, { desc: 'Charges with its horns.' }),
    bellow:       mv('bellow', 'Bellow', 'normal', 'stat', 0, 100, { stat: 'atk', stages: -1, desc: 'Lowers foe Attack.' }),
    peck:         mv('peck', 'Peck', 'normal', 'damage', 40, 100, { desc: 'A quick peck.' }),
    flameFlap:    mv('flameFlap', 'Flame Flap', 'fire', 'damage', 60, 95, { desc: 'Flaps fiery wings.' }),
    eggToss:      mv('eggToss', 'Egg Toss', 'normal', 'damage', 65, 90, { desc: 'Throws an egg.' }),
    cluck:        mv('cluck', 'Cluck', 'normal', 'stat', 0, 100, { stat: 'def', stages: -1, desc: 'Lowers foe Defense.' }),
    puddleSplash: mv('puddleSplash', 'Puddle Splash', 'water', 'damage', 60, 95, { desc: 'Splashes muddy water.' }),
    preen:        mv('preen', 'Preen', 'normal', 'heal', 0, 100, { healFrac: 0.30, target: 'self', desc: 'Tidies up to heal.' }),
    quickHop:     mv('quickHop', 'Quick Hop', 'normal', 'damage', 50, 100, { priority: 1, desc: 'Always goes first.' }),
    seedSpit:     mv('seedSpit', 'Seed Spit', 'field', 'damage', 55, 95, { desc: 'Spits hard seeds.' }),
    fluffUp:      mv('fluffUp', 'Fluff Up', 'normal', 'stat', 0, 100, { target: 'self', stat: 'def', stages: 1, desc: 'Raises own Defense.' })
  };

  // ---- Species ----
  function sp(id, name, type, base, moves, xpYield, blurb, sprite) {
    var s = { id: id, name: name, type: type, base: base, moves: moves, xpYield: xpYield, blurb: blurb };
    var imgKey = sprite.img;
    var spr = { imgKey: imgKey, fw: sprite.fw, fh: sprite.fh, frames: 4, scale: sprite.scale,
      front: sprite.front, back: sprite.back };
    // img is the real picture (looked up when used, since pictures load after this file).
    Object.defineProperty(spr, 'img', { enumerable: true, get: function () {
      return (Game.Assets && Game.Assets.get) ? Game.Assets.get(imgKey) : null;
    } });
    s.sprite = spr;
    return s;
  }
  function cow(img) { return { img: img, fw: 32, fh: 32, scale: 3, front: { row: 1, flip: false }, back: { row: 2, flip: false } }; }
  function bird(img) { return { img: img, fw: 16, fh: 16, scale: 4, front: { row: 0, flip: false }, back: { row: 1, flip: false } }; }

  var SPECIES = {
    daisy: sp('daisy', 'Daisy', 'field', { hp: 70, atk: 60, def: 58, spd: 40 },
      ['headbutt', 'stomp', 'mooBlast', 'graze'], 64, 'A calm, tough cow.', cow('cowF')),
    bruno: sp('bruno', 'Bruno', 'field', { hp: 70, atk: 66, def: 62, spd: 40 },
      ['headbutt', 'hornCharge', 'stomp', 'bellow'], 64, 'A strong, stubborn bull.', cow('cowM')),
    ember: sp('ember', 'Ember', 'fire', { hp: 58, atk: 62, def: 58, spd: 62 },
      ['peck', 'flameFlap', 'eggToss', 'cluck'], 60, 'A fiery, fast red hen.', bird('chickenRed')),
    puddles: sp('puddles', 'Puddles', 'water', { hp: 68, atk: 70, def: 64, spd: 65 },
      ['peck', 'puddleSplash', 'eggToss', 'preen'], 60, 'A cheerful hen who loves puddles.', bird('chickenBlonde')),
    peep: sp('peep', 'Peep', 'normal', { hp: 68, atk: 72, def: 58, spd: 80 },
      ['peck', 'quickHop', 'seedSpit', 'fluffUp'], 56, 'A tiny, very quick chick.', bird('chick'))
  };
  var SPECIES_IDS = ['daisy', 'bruno', 'ember', 'puddles', 'peep'];

  // ---- Stats / creatures ----
  function calcStats(speciesId, level) {
    var b = SPECIES[speciesId].base;
    return {
      hp: Math.floor(b.hp * 2 * level / 100) + level + 10,
      atk: Math.floor(b.atk * 2 * level / 100) + 5,
      def: Math.floor(b.def * 2 * level / 100) + 5,
      spd: Math.floor(b.spd * 2 * level / 100) + 5
    };
  }
  function xpForLevel(L) { return L * L * L; }

  function create(speciesId, level) {
    var s = SPECIES[speciesId];
    if (!s) return null;
    level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level) || 1));
    var stats = calcStats(speciesId, level);
    return { species: speciesId, level: level, xp: xpForLevel(level), hp: stats.hp, stats: stats, moves: s.moves.slice() };
  }

  function xpProgress(c) {
    if (c.level >= MAX_LEVEL) return 1;
    var lo = xpForLevel(c.level), hi = xpForLevel(c.level + 1);
    return Math.max(0, Math.min(1, (c.xp - lo) / (hi - lo)));
  }

  function addXp(c, amount) {
    var events = [];
    amount = Math.floor(amount);
    if (!(amount > 0) || c.level >= MAX_LEVEL) return events;
    c.xp += amount;
    while (c.level < MAX_LEVEL && c.xp >= xpForLevel(c.level + 1)) {
      var old = c.stats;
      c.level++;
      var ns = calcStats(c.species, c.level);
      var gains = { hp: ns.hp - old.hp, atk: ns.atk - old.atk, def: ns.def - old.def, spd: ns.spd - old.spd };
      c.stats = ns;
      c.hp = Math.min(ns.hp, c.hp + gains.hp);
      events.push({ level: c.level, gains: gains });
    }
    if (c.level >= MAX_LEVEL) c.xp = Math.min(c.xp, xpForLevel(MAX_LEVEL));
    return events;
  }

  function xpReward(foe) {
    return Math.floor(SPECIES[foe.species].xpYield * foe.level / 7);
  }
  function coinReward(foe) { return 10 + 2 * foe.level; }
  function coinPenalty(coins) {
    coins = Math.max(0, Math.floor(coins) || 0);
    return Math.min(coins, Math.max(5, Math.floor(coins / 10)));
  }
  function heal(c) { c.hp = c.stats.hp; }
  function nameOf(c) { return SPECIES[c.species].name; }

  var IMG_TO_SPECIES = { cowF: 'daisy', cowM: 'bruno', chickenRed: 'ember', chickenBlonde: 'puddles', chick: 'peep' };
  function speciesForAnimalImg(k) { return IMG_TO_SPECIES[k] || null; }

  function pickRivalSpecies(playerSpeciesId, rng) {
    rng = rng || Math.random;
    var others = SPECIES_IDS.filter(function (id) { return id !== playerSpeciesId; });
    return others[Math.min(others.length - 1, Math.floor(rng() * others.length))];
  }

  Game.Creatures = {
    TUNE: TUNE, TYPES: TYPES, MOVES: MOVES, SPECIES: SPECIES, SPECIES_IDS: SPECIES_IDS, MAX_LEVEL: MAX_LEVEL,
    typeMult: typeMult, create: create, calcStats: calcStats, xpForLevel: xpForLevel, xpProgress: xpProgress,
    addXp: addXp, xpReward: xpReward, coinReward: coinReward, coinPenalty: coinPenalty, heal: heal,
    nameOf: nameOf, speciesForAnimalImg: speciesForAnimalImg, pickRivalSpecies: pickRivalSpecies
  };

  // ---- Team & wallet ----
  var members = [];
  Game.Team = {
    members: members, MAX: 6,
    add: function (c) {
      if (!c || members.length >= 6) return false;
      members.push(c);
      return true;
    },
    lead: function () {
      for (var i = 0; i < members.length; i++) if (members[i].hp > 0) return members[i];
      return members[0] || null;
    },
    size: function () { return members.length; },
    hasStarter: function () { return members.length > 0; },
    healAll: function () { for (var i = 0; i < members.length; i++) heal(members[i]); },
    toJSON: function () { return JSON.parse(JSON.stringify({ members: members })); },
    load: function (obj) {
      members.length = 0;
      var list = obj && obj.members ? obj.members : [];
      for (var i = 0; i < list.length && i < 6; i++) members.push(list[i]);
    }
  };

  var coins = 0;
  Game.Wallet = {
    get: function () { return coins; },
    add: function (n) { n = Math.floor(n) || 0; if (n > 0) coins += n; return coins; },
    take: function (n) {
      n = Math.max(0, Math.floor(n) || 0);
      var t = Math.min(coins, n);
      coins -= t;
      return t;
    }
  };

  // ---- Battle rules (no drawing, no input) ----
  function stageMult(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
  function msg(text, wait) { return { t: 'msg', text: text, wait: wait !== false }; }
  function snd(name) { return { t: 'sound', name: name }; }
  function other(side) { return side === 'p' ? 'f' : 'p'; }
  function nm(side) { return nameOf(side.c); }

  function newSide(c, side) { return { c: c, st: { atk: 0, def: 0 }, side: side }; }

  function begin(playerC, foeC) {
    return { p: newSide(playerC, 'p'), f: newSide(foeC, 'f'), turn: 0, usedStat: {}, turns: { p: 0, f: 0 }, over: null };
  }

  function calcDamage(att, def, move, rng) {
    rng = rng || Math.random;
    if (!(rng() * 100 < move.acc)) return { amount: 0, mult: 1, missed: true };
    var L = att.c.level;
    var A = att.c.stats.atk * stageMult(att.st.atk);
    var D = def.c.stats.def * stageMult(def.st.def);
    var base = Math.floor(Math.floor((2 * L / 5 + 2) * move.power * A / D) / TUNE.DIV) + TUNE.FLAT;
    var stab = move.type === SPECIES[att.c.species].type ? TUNE.STAB : 1;
    var mult = typeMult(move.type, SPECIES[def.c.species].type);
    var dmg = base * stab * mult * (0.85 + rng() * 0.15);
    return { amount: Math.max(1, Math.floor(dmg)), mult: mult, missed: false };
  }

  function movePriority(id) { return MOVES[id].priority || 0; }

  function scoreMove(state, side, move) {
    var att = state[side], def = state[other(side)];
    var stab = move.type === SPECIES[att.c.species].type ? TUNE.STAB : 1;
    return move.power * move.acc / 100 * typeMult(move.type, SPECIES[def.c.species].type) * stab;
  }

  // Picks a move id for `side` (default the foe).
  function foeChooseMove(state, rng, side) {
    rng = rng || Math.random;
    side = side || 'f';
    var me = state[side], c = me.c;
    var ms = c.moves.map(function (id) { return MOVES[id]; });
    var i, m;
    if (c.hp / c.stats.hp < 0.35) {
      for (i = 0; i < ms.length; i++) {
        if (ms[i].kind === 'heal') {
          if (rng() < 0.6) return ms[i].id;
          break;
        }
      }
    }
    if (state.turns[side] === 0) {
      for (i = 0; i < ms.length; i++) {
        m = ms[i];
        if (m.kind === 'stat' && !state.usedStat[side + ':' + m.id]) {
          if (rng() < 0.3) return m.id;
          break;
        }
      }
    }
    var dmgMoves = ms.filter(function (x) { return x.kind === 'damage'; });
    if (!dmgMoves.length) return ms[0].id;
    if (rng() < 0.75) {
      var best = dmgMoves[0], bs = -1;
      for (i = 0; i < dmgMoves.length; i++) {
        var s = scoreMove(state, side, dmgMoves[i]);
        if (s > bs) { bs = s; best = dmgMoves[i]; }
      }
      return best.id;
    }
    return dmgMoves[Math.min(dmgMoves.length - 1, Math.floor(rng() * dmgMoves.length))].id;
  }

  function hpStep(sideObj, from, to) { return { t: 'hp', side: sideObj.side, from: from, to: to }; }

  // Run one move. Pushes steps; sets state.over if someone faints.
  function execMove(state, steps, sideKey, moveId, rng) {
    var att = state[sideKey], def = state[other(sideKey)], move = MOVES[moveId];
    var an = nm(att), dn = nm(def);
    state.turns[sideKey]++;
    steps.push(msg(an + ' used ' + move.name + '!', false));

    if (move.kind === 'damage') {
      steps.push({ t: 'anim', side: sideKey, anim: 'lunge' });
      var r = calcDamage(att, def, move, rng);
      if (r.missed) {
        steps.push(snd('miss'));
        steps.push(msg('But it missed!'));
        return;
      }
      steps.push(snd(r.mult > 1 ? 'hitSuper' : (r.mult < 1 ? 'hitWeak' : 'hit')));
      steps.push({ t: 'anim', side: def.side, anim: 'hit' });
      var from = def.c.hp;
      def.c.hp = Math.max(0, def.c.hp - r.amount);
      steps.push(hpStep(def, from, def.c.hp));
      if (r.mult > 1) steps.push(msg("It's super effective!"));
      else if (r.mult < 1) steps.push(msg("It's not very effective..."));
      if (def.c.hp <= 0) {
        steps.push({ t: 'anim', side: def.side, anim: 'faint' });
        steps.push(snd('faint'));
        steps.push(msg(dn + ' fainted!'));
        state.over = def.side === 'f' ? 'win' : 'lose';
      }
    } else if (move.kind === 'heal') {
      var max = att.c.stats.hp;
      var amt = Math.min(max - att.c.hp, Math.floor(max * move.healFrac));
      if (amt <= 0) { steps.push(msg(an + "'s HP is already full!")); return; }
      var f0 = att.c.hp;
      att.c.hp += amt;
      steps.push(snd('heal'));
      steps.push({ t: 'anim', side: sideKey, anim: 'heal' });
      steps.push(hpStep(att, f0, att.c.hp));
      steps.push(msg(an + ' regained ' + amt + ' HP!'));
    } else if (move.kind === 'stat') {
      state.usedStat[sideKey + ':' + moveId] = true;
      var tgt = move.target === 'self' ? att : def;
      var tn = nm(tgt), label = move.stat === 'atk' ? 'Attack' : 'Defense';
      var cur = tgt.st[move.stat], nxt = Math.max(-3, Math.min(3, cur + move.stages));
      if (nxt === cur) {
        steps.push(msg(tn + "'s " + label + " won't go any " + (move.stages > 0 ? 'higher!' : 'lower!')));
      } else {
        tgt.st[move.stat] = nxt;
        steps.push(snd(move.stages > 0 ? 'statUp' : 'statDown'));
        steps.push({ t: 'anim', side: tgt.side, anim: move.stages > 0 ? 'statUp' : 'statDown' });
        steps.push(msg(tn + "'s " + label + (move.stages > 0 ? ' rose!' : ' fell!')));
      }
    }
  }

  function resolveTurn(state, action, rng) {
    rng = rng || Math.random;
    var steps = [];
    if (state.over) return steps;
    state.turn++;
    var foeMove = foeChooseMove(state, rng, 'f');

    if (action.kind === 'item') {
      var p = state.p, max = p.c.stats.hp;
      var amt = Math.max(0, Math.min(max - p.c.hp, Math.floor(action.heal) || 0));
      var f0 = p.c.hp;
      p.c.hp += amt;
      steps.push(msg('You used an Egg on ' + nm(p) + '!', false));
      steps.push(snd('heal'));
      steps.push({ t: 'anim', side: 'p', anim: 'heal' });
      steps.push(hpStep(p, f0, p.c.hp));
      steps.push(msg(nm(p) + ' regained ' + amt + ' HP!'));
      execMove(state, steps, 'f', foeMove, rng);
      return steps;
    }

    var pm = action.moveId, order;
    var pp = movePriority(pm), fp = movePriority(foeMove);
    if (pp !== fp) order = pp > fp ? ['p', 'f'] : ['f', 'p'];
    else if (state.p.c.stats.spd !== state.f.c.stats.spd) order = state.p.c.stats.spd > state.f.c.stats.spd ? ['p', 'f'] : ['f', 'p'];
    else order = rng() < 0.5 ? ['p', 'f'] : ['f', 'p'];
    for (var i = 0; i < 2 && !state.over; i++) {
      execMove(state, steps, order[i], order[i] === 'p' ? pm : foeMove, rng);
    }
    return steps;
  }

  function finish(state) {
    var steps = [], p = state.p.c, foe = state.f.c, pn = nameOf(p);
    var res = { outcome: state.over, xpGained: 0, levelsGained: 0, coinsDelta: 0 };
    if (state.over === 'win') {
      steps.push(snd('win'));
      var xp = xpReward(foe), W = Game.Wallet;
      var coinsGot = coinReward(foe);
      var wasMax = p.level >= MAX_LEVEL;
      if (!wasMax) {
        var f0 = xpProgress(p);
        var evs = addXp(p, xp);
        res.xpGained = xp;
        res.levelsGained = evs.length;
        steps.push(msg(pn + ' gained ' + xp + ' XP!'));
        if (!evs.length) steps.push({ t: 'xp', fromFrac: f0, toFrac: xpProgress(p) });
        else {
          steps.push({ t: 'xp', fromFrac: f0, toFrac: 1 });
          for (var i = 0; i < evs.length; i++) {
            var e = evs[i], g = e.gains;
            steps.push(snd('levelUp'));
            steps.push({ t: 'level', level: e.level });
            steps.push(msg(pn + ' grew to level ' + e.level + '!'));
            steps.push(msg('HP +' + g.hp + '  Atk +' + g.atk + '  Def +' + g.def + '  Spd +' + g.spd));
            var last = i === evs.length - 1;
            steps.push({ t: 'xp', fromFrac: 0, toFrac: last ? xpProgress(p) : 1 });
          }
        }
      }
      if (W) W.add(coinsGot);
      res.coinsDelta = coinsGot;
      steps.push(snd('coin'));
      steps.push(msg('You earned ' + coinsGot + ' coins!'));
    } else if (state.over === 'lose') {
      steps.push(snd('lose'));
      steps.push(msg(pn + ' is too tired to go on!'));
      var lost = Game.Wallet ? Game.Wallet.take(coinPenalty(Game.Wallet.get())) : 0;
      res.coinsDelta = -lost;
      if (lost > 0) steps.push(msg('You dropped ' + lost + ' coins...'));
    }
    heal(p);
    return { steps: steps, result: res };
  }

  // Win rate (0..1) of species A against species B at the given level over n battles.
  function simulate(spA, spB, level, n, rng) {
    rng = rng || Math.random;
    var wins = 0;
    for (var k = 0; k < n; k++) {
      var st = begin(create(spA, level), create(spB, level));
      for (var turns = 0; turns < 200 && !st.over; turns++) {
        resolveTurn(st, { kind: 'move', moveId: foeChooseMove(st, rng, 'p') }, rng);
      }
      if (st.over === 'win') wins++;
    }
    return wins / n;
  }

  Game.BattleRules = {
    begin: begin, resolveTurn: resolveTurn, foeChooseMove: foeChooseMove, calcDamage: calcDamage,
    finish: finish, simulate: simulate
  };
})();
