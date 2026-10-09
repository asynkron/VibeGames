import assert from 'node:assert/strict';
import test from 'node:test';
import { DIR, WALL } from '../src/dungeon.js';
import { initBt3Systems } from '../src/systems/core.js';

function openDungeon() {
  const width = 12;
  const height = 12;
  return {
    width, height, x: 8, y: 8, dir: DIR.E,
    cells: Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => ({
      n: y === 0 ? WALL.WALL : WALL.OPEN,
      e: x === width - 1 ? WALL.WALL : WALL.OPEN,
      s: y === height - 1 ? WALL.WALL : WALL.OPEN,
      w: x === 0 ? WALL.WALL : WALL.OPEN,
      visited: false,
    }))),
  };
}

async function withCombat(run) {
  const originalRandom = Math.random;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = new Map();
  let clock = 0;
  let nextTimerId = 1;
  Math.random = () => 0.4;
  globalThis.setTimeout = (callback, delay = 0, ...args) => {
    const id = nextTimerId++;
    timers.set(id, { callback, args, due: clock + Math.max(0, Number(delay) || 0) });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);

  const dungeon = openDungeon();
  const initialDungeon = structuredClone(dungeon);
  const record = { actions: null, party: null, snapshot: null, snapshots: [], logs: [], effects: [], hides: 0 };
  const hud = {
    setActions(actions) { record.actions = actions; },
    clearActions() { record.actions = null; },
    setParty(party) { record.party = structuredClone(party); },
    appendLog(message) { record.logs.push(message); },
  };
  const combatView = {
    show(snapshot) {
      record.snapshot = structuredClone(snapshot);
      record.snapshots.push(record.snapshot);
    },
    hide() { record.hides += 1; },
    playEffect(effect) {
      record.effects.push({ ...structuredClone(effect), snapshot: structuredClone(record.snapshot) });
      return new Promise((resolve) => setTimeout(resolve, 300));
    },
  };

  async function flush() {
    for (let count = 0; count < 1000; count += 1) {
      for (let microtask = 0; microtask < 8; microtask += 1) await Promise.resolve();
      const next = [...timers.entries()].sort(([idA, a], [idB, b]) => a.due - b.due || idA - idB)[0];
      if (!next) return;
      const [id, timer] = next;
      timers.delete(id);
      clock = timer.due;
      timer.callback(...timer.args);
    }
    throw new Error('Combat did not settle at a player command.');
  }

  function choose(label) {
    const button = record.actions?.buttons.find((entry) => typeof label === 'string' ? entry.label === label : label.test(entry.label));
    assert.ok(button, `Expected the command ${label}; offered: ${record.actions?.buttons.map((entry) => entry.label).join(', ')}`);
    button.onSelect();
  }

  try {
    const systems = initBt3Systems({ hud, combatView, dungeon });
    await run({
      systems, dungeon, initialDungeon, record, choose, flush,
      setRandom(value) { Math.random = typeof value === 'function' ? value : () => value; },
      async begin(depth = 1) {
        for (let step = 0; step < 3; step += 1) systems.onStepComplete(depth);
        assert.equal(systems.isCombatActive, true);
        await flush();
        assert.ok(record.actions, 'The encounter must offer a player command after narration.');
      },
      unit(id) { return record.snapshot.units.find((unit) => unit.id === id); },
      member(id) { return record.party.members.find((member) => member.id === id); },
    });
  } finally {
    Math.random = originalRandom;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
}

test('clicking heroes shows movement immediately and walks legal cells while preserving each hero budget', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit, dungeon, initialDungeon }) => {
    await begin();
    assert.equal(record.snapshot.mode, 'ready');
    assert.ok(record.snapshot.reachable.some((cell) => cell.cost > 0));
    assert.equal(record.actions.buttons.some((button) => /^(Move|Attack)\b/.test(button.label)), false);
    const bard = unit('c_bard');
    systems.selectCombatCell(bard.x, bard.y);
    assert.equal(record.snapshot.activeId, bard.id);
    const previousBardCommands = record.actions.buttons.find((button) => button.label === 'End Turn').onSelect;
    const start = { x: bard.x, y: bard.y };
    const destination = record.snapshot.reachable.find((cell) => cell.cost === 4);
    assert.ok(destination, 'The open room provides a full four-cell route.');
    const firstSnapshot = record.snapshots.length;
    systems.selectCombatCell(destination.x, destination.y);
    assert.equal(record.snapshot.busy, true);
    assert.equal(unit(bard.id).movementRemaining, 3);
    const movingCell = { x: unit(bard.id).x, y: unit(bard.id).y };
    const chrono = unit('c_chrono');
    systems.selectCombatCell(chrono.x, chrono.y);
    systems.handleCombatKey('ArrowDown');
    previousBardCommands();
    assert.equal(record.snapshot.activeId, bard.id, 'Movement locks hero selection and stale commands until the walk finishes.');
    assert.deepEqual({ x: unit(bard.id).x, y: unit(bard.id).y }, movingCell);
    await flush();
    const steps = record.snapshots.slice(firstSnapshot).filter((snapshot) => snapshot.busy).map((snapshot) => snapshot.units.find((entry) => entry.id === bard.id));
    assert.equal(steps.length, 4, 'The view receives every step instead of one teleport.');
    let previous = start;
    for (const step of steps) {
      assert.equal(Math.abs(step.x - previous.x) + Math.abs(step.y - previous.y), 1);
      previous = step;
    }
    assert.deepEqual({ x: unit(bard.id).x, y: unit(bard.id).y }, { x: destination.x, y: destination.y });
    assert.equal(unit(bard.id).movementRemaining, 0);
    systems.selectCombatCell(chrono.x, chrono.y);
    assert.equal(record.snapshot.activeId, chrono.id);
    assert.equal(unit(chrono.id).movementRemaining, 4);
    systems.selectCombatCell(destination.x, destination.y);
    assert.equal(record.snapshot.activeId, bard.id);
    assert.equal(unit(bard.id).movementRemaining, 0, 'Switching heroes must not replenish movement.');
    assert.ok(record.snapshot.reachable.every((cell) => cell.cost === 0));
    systems.handleCombatKey('ArrowDown');
    assert.deepEqual({ x: unit(bard.id).x, y: unit(bard.id).y }, { x: destination.x, y: destination.y });
    previousBardCommands();
    assert.equal(record.snapshot.busy, false, 'An old command from before moving cannot spend a new selection.');
    choose('End Turn');
    await flush();
    assert.equal(unit(bard.id).canAct, false);
    const activeId = record.snapshot.activeId;
    systems.selectCombatCell(destination.x, destination.y);
    assert.equal(record.snapshot.activeId, activeId, 'A spent hero cannot be reselected this round.');
    assert.deepEqual(dungeon, initialDungeon, 'Tactical movement leaves exploration coordinates and map untouched.');
  });
});

test('clicking highlighted enemies attacks after its effect and rejects duplicate actions before advancing once', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit }) => {
    await begin();
    const monsters = record.snapshot.units.filter((entry) => entry.team === 'monster' && entry.alive);
    if (!record.snapshot.targetIds.length) {
      const approach = record.snapshot.reachable.find((cell) => cell.cost > 0 && monsters.some((monster) => Math.abs(monster.x - cell.x) + Math.abs(monster.y - cell.y) === 1));
      assert.ok(approach);
      systems.selectCombatCell(approach.x, approach.y);
      await flush();
    }
    assert.equal(record.snapshot.targetKind, 'attack');
    const target = unit(record.snapshot.targetIds[0]);
    const previousHp = target.hpCurrent;
    const stalePass = record.actions.buttons.find((button) => button.label === 'End Turn').onSelect;
    systems.selectCombatCell(target.x, target.y);
    assert.equal(record.snapshots.findLast((snapshot) => !snapshot.busy).targetId, target.id, 'The renderer sees the chosen foe before the strike begins so the attacker can face it.');
    assert.equal(record.snapshot.mode, 'resolving');
    assert.equal(record.snapshot.busy, true);
    assert.equal(record.actions, null);
    assert.equal(unit(target.id).hpCurrent, previousHp, 'Damage waits for the visible strike.');
    assert.equal(record.effects.length, 1);
    assert.equal(record.effects[0].kind, 'slash');
    assert.deepEqual(record.effects[0].targets, [{ id: target.id, x: target.x, y: target.y, team: 'monster' }]);
    assert.equal(record.effects[0].source.id, 'c_warrior');
    assert.equal(record.effects[0].source.team, 'party');
    const duringStrike = structuredClone(record.snapshot.units);
    systems.selectCombatCell(target.x, target.y);
    systems.handleCombatKey('ArrowDown');
    stalePass();
    assert.deepEqual(record.snapshot.units, duringStrike);
    assert.equal(record.effects.length, 1);
    await flush();
    assert.ok(unit(target.id).hpCurrent < previousHp);
    assert.equal(unit('c_warrior').canAct, false);
    assert.equal(record.snapshot.activeId, 'c_paladin');
    assert.equal(record.snapshot.round, 1);
    stalePass();
    assert.equal(record.snapshot.activeId, 'c_paladin');
    for (let hero = 0; hero < 4; hero += 1) {
      choose('End Turn');
      await flush();
    }
    assert.equal(record.snapshot.round, 2, 'Completing all five heroes runs exactly one monster phase.');
    assert.equal(record.snapshot.activeId, 'c_warrior');
    assert.equal(unit('c_warrior').movementRemaining, 4);
    assert.equal(unit('c_warrior').canAct, true);
    assert.ok(record.snapshots.some((snapshot) => snapshot.busy && snapshot.units.some((entry) => entry.team === 'monster' && entry.id === snapshot.activeId)));
    const monsterSteps = record.snapshots.filter((snapshot) => snapshot.busy && snapshot.activeId !== 'c_warrior').filter((snapshot) => snapshot.units.some((entry) => entry.team === 'monster' && entry.id === snapshot.activeId));
    assert.ok(monsterSteps.length > 0, 'Monster movement and attacks are presented while interaction remains locked.');
  });
});

test('spell targeting highlights only reachable foes, resolves projectile before damage, and spends SP once', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit, member }) => {
    await begin();
    const chrono = unit('c_chrono');
    systems.selectCombatCell(chrono.x, chrono.y);
    assert.equal(record.snapshot.activeId, chrono.id);
    const previousSp = member(chrono.id).spCurrent;
    choose('Cast Spell');
    choose(/^MIJA /);
    assert.equal(record.snapshot.mode, 'target');
    assert.equal(record.snapshot.targetKind, 'spell');
    assert.ok(record.snapshot.targetIds.length);
    for (const id of record.snapshot.targetIds) {
      const foe = unit(id);
      assert.equal(foe.team, 'monster');
      assert.ok(Math.abs(foe.x - chrono.x) + Math.abs(foe.y - chrono.y) <= 6);
    }
    const target = unit(record.snapshot.targetIds[0]);
    const previousHp = target.hpCurrent;
    systems.selectCombatCell(0, 0);
    assert.equal(record.snapshot.mode, 'target');
    assert.equal(record.effects.length, 0, 'An out-of-range click never starts a cast effect.');
    assert.equal(member(chrono.id).spCurrent, previousSp);
    systems.selectCombatCell(target.x, target.y);
    assert.equal(record.effects[0].kind, 'arrow');
    assert.deepEqual(record.effects[0].rune, { style: 'arcane', color: 0x55ffff });
    assert.equal(record.snapshots.findLast((snapshot) => !snapshot.busy).targetId, target.id);
    assert.equal(record.snapshot.busy, true);
    assert.equal(unit(target.id).hpCurrent, previousHp);
    systems.selectCombatCell(target.x, target.y);
    systems.handleCombatKey('Enter');
    assert.equal(record.effects.length, 1);
    await flush();
    assert.equal(member(chrono.id).spCurrent, previousSp - 4);
    assert.ok(unit(target.id).hpCurrent < previousHp);
    assert.equal(unit(chrono.id).canAct, false);
    assert.equal(record.snapshot.activeId, 'c_warrior', 'Free selection returns to the first unspent hero.');
  });
});

test('targeting an ally with healing takes priority over selecting that hero, while cancelling restores movement', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit }) => {
    await begin();
    const paladin = unit('c_paladin');
    systems.selectCombatCell(paladin.x, paladin.y);
    choose('Use Ability');
    assert.equal(record.snapshot.targetKind, 'heal');
    const warrior = unit('c_warrior');
    assert.ok(record.snapshot.targetIds.includes(warrior.id));
    systems.selectCombatCell(warrior.x, warrior.y);
    assert.equal(record.snapshot.activeId, paladin.id, 'An ally click casts the selected heal rather than switching active hero.');
    assert.equal(record.effects[0].kind, 'heal');
    assert.deepEqual(record.effects[0].targets, [{ id: warrior.id, x: warrior.x, y: warrior.y, team: 'party' }]);
    assert.deepEqual(record.effects[0].rune, { style: 'holy', color: 0xf4d66a });
    await flush();
    assert.equal(unit(paladin.id).canAct, false);
    const chrono = unit('c_chrono');
    systems.selectCombatCell(chrono.x, chrono.y);
    const availableCells = structuredClone(record.snapshot.reachable);
    choose('Cast Spell');
    choose(/^MIJA /);
    systems.handleCombatKey('Escape');
    assert.equal(record.snapshot.mode, 'menu');
    systems.handleCombatKey('Escape');
    assert.equal(record.snapshot.mode, 'ready');
    assert.deepEqual(record.snapshot.reachable, availableCells);
  });
});

test('a stun from the monster phase skips one hero round and expires after that skipped round', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit, setRandom }) => {
    const encounterRolls = [0.4, 0.4, 0.4, 0.1, 0.1, 0.4, 0.4];
    setRandom(() => encounterRolls.shift() ?? 0.4);
    await begin(2);
    assert.ok(record.snapshot.units.some((entry) => entry.kind === 'monk'), 'This encounter must contain a real stunning foe.');
    const monks = record.snapshot.units.filter((entry) => entry.kind === 'monk');
    const approach = record.snapshot.reachable.find((cell) => cell.cost > 0 && monks.some((monk) => Math.abs(monk.x - cell.x) + Math.abs(monk.y - cell.y) === 1));
    assert.ok(approach, 'The warrior can move into a monk palm strike range.');
    systems.selectCombatCell(approach.x, approach.y);
    await flush();
    setRandom(0.2);
    for (let hero = 0; hero < 5; hero += 1) {
      choose('End Turn');
      await flush();
    }
    assert.equal(record.snapshot.round, 2);
    const warrior = unit('c_warrior');
    assert.equal(warrior.alive, true);
    assert.equal(warrior.canAct, false, 'A stun cannot expire before its victim misses a turn.');
    assert.equal(warrior.movementRemaining, 0);
    assert.equal(record.logs.filter((message) => message === 'Brynn is incapacitated and misses a turn.').length, 1);
    const activeId = record.snapshot.activeId;
    systems.selectCombatCell(warrior.x, warrior.y);
    assert.equal(record.snapshot.activeId, activeId);
    const chrono = unit('c_chrono');
    systems.selectCombatCell(chrono.x, chrono.y);
    choose('Cast Spell');
    choose(/^TIME /);
    await flush();
    while (record.snapshot.round === 2) {
      choose('End Turn');
      await flush();
    }
    assert.equal(record.snapshot.round, 3);
    assert.equal(unit(warrior.id).alive, true);
    assert.equal(unit(warrior.id).canAct, true, 'The previously skipped hero regains eligibility after status expiry.');
    assert.equal(record.snapshot.activeId, warrior.id);
    assert.equal(record.logs.filter((message) => message === 'Brynn is incapacitated and misses a turn.').length, 1);
  });
});

test('protective spell auras follow their unit through movement and disappear when the real ward expires', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit, setRandom }) => {
    await begin();
    assert.ok(record.snapshot.units.every((entry) => Array.isArray(entry.auras)));
    const warrior = unit('c_warrior');
    assert.deepEqual(warrior.auras, []);
    const chrono = unit('c_chrono');
    systems.selectCombatCell(chrono.x, chrono.y);
    choose('Cast Spell');
    choose(/^STAS /);
    systems.selectCombatCell(warrior.x, warrior.y);
    assert.deepEqual(record.effects[0].rune, { style: 'temporal', color: 0xb875ff });
    assert.deepEqual(unit(warrior.id).auras, [], 'The ward appears only after the spell resolves.');
    await flush();
    const aura = unit(warrior.id).auras.find((entry) => entry.kind === 'shield');
    assert.ok(aura);
    assert.equal(aura.style, 'temporal');
    assert.equal(aura.color, 0xb875ff);
    assert.equal(unit(warrior.id).ac, warrior.ac - 4, 'The shield represents actual protection.');

    const retreat = () => {
      const foes = record.snapshot.units.filter((entry) => entry.team === 'monster' && entry.alive);
      const distance = (cell) => Math.min(...foes.map((foe) => Math.abs(foe.x - cell.x) + Math.abs(foe.y - cell.y)));
      return record.snapshot.reachable.filter((cell) => cell.cost === 4).sort((a, b) => distance(b) - distance(a))[0];
    };
    const destination = retreat();
    assert.ok(destination);
    const firstStep = record.snapshots.length;
    systems.selectCombatCell(destination.x, destination.y);
    await flush();
    const walk = record.snapshots.slice(firstStep).filter((snapshot) => snapshot.busy).map((snapshot) => snapshot.units.find((entry) => entry.id === warrior.id));
    assert.equal(walk.length, 4);
    for (const step of walk) assert.deepEqual(step.auras, [aura], 'The same ward moves with each published character step.');
    assert.deepEqual({ x: unit(warrior.id).x, y: unit(warrior.id).y }, { x: destination.x, y: destination.y });

    setRandom(0);
    while (record.snapshot.round === 1) {
      choose('End Turn');
      await flush();
    }
    assert.deepEqual(unit(warrior.id).auras, [aura], 'A two-round ward remains active in round two.');
    const furtherRetreat = retreat();
    assert.ok(furtherRetreat);
    systems.selectCombatCell(furtherRetreat.x, furtherRetreat.y);
    await flush();
    while (record.snapshot.round === 2) {
      choose('End Turn');
      await flush();
    }
    assert.equal(unit(warrior.id).alive, true);
    assert.deepEqual(unit(warrior.id).auras, []);
    assert.equal(unit(warrior.id).ac, warrior.ac, 'Visual and mechanical protection expire together.');
  });
});

test('missed attacks and resisted spells publish effects without inventing damage for splatter', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit, setRandom }) => {
    await begin();
    const monsters = record.snapshot.units.filter((entry) => entry.team === 'monster' && entry.alive);
    if (!record.snapshot.targetIds.length) {
      const approach = record.snapshot.reachable.find((cell) => cell.cost > 0 && monsters.some((monster) => Math.abs(monster.x - cell.x) + Math.abs(monster.y - cell.y) === 1));
      assert.ok(approach);
      systems.selectCombatCell(approach.x, approach.y);
      await flush();
    }
    setRandom(0);
    const target = unit(record.snapshot.targetIds[0]);
    const beforeStrike = record.snapshots.length;
    systems.selectCombatCell(target.x, target.y);
    await flush();
    assert.ok(record.logs.includes(`Brynn misses ${target.name}.`));
    assert.equal(record.effects[0].kind, 'slash');
    assert.ok(record.snapshots.slice(beforeStrike).every((snapshot) => snapshot.units.find((entry) => entry.id === target.id).hpCurrent === target.hpCurrent));

    const chrono = unit('c_chrono');
    systems.selectCombatCell(chrono.x, chrono.y);
    choose('Cast Spell');
    choose(/^FLCO /);
    const resistant = record.snapshot.targetIds.map(unit).find((entry) => entry.kind === 'hobbit');
    assert.ok(resistant, 'A real magic-resistant halfling is in spell range.');
    const beforeSpell = record.snapshots.length;
    systems.selectCombatCell(resistant.x, resistant.y);
    await flush();
    assert.ok(record.logs.includes(`${resistant.name} resists Flesh to Coal!`));
    assert.equal(record.effects[1].kind, 'bolt');
    assert.ok(record.snapshots.slice(beforeSpell).every((snapshot) => snapshot.units.find((entry) => entry.id === resistant.id).hpCurrent === resistant.hpCurrent));
  });
});

test('flee ends selection without further hero commands and clears combat once narration settles', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, dungeon, initialDungeon }) => {
    assert.equal(systems.isCombatActive, false);
    assert.equal(systems.handleCombatKey('ArrowUp'), false);
    systems.selectCombatCell(3, 3);
    assert.equal(record.snapshot, null);
    await begin();
    const enemiesBeforeFlee = record.snapshot.units.filter((entry) => entry.team === 'monster');
    const retainedFleeCommand = record.actions.buttons.find((button) => button.label === 'Flee').onSelect;
    choose('Flee');
    assert.equal(record.actions, null);
    assert.equal(systems.handleCombatKey('ArrowRight'), true);
    systems.selectCombatCell(4, 3);
    retainedFleeCommand();
    assert.deepEqual(record.snapshot.units.filter((entry) => entry.team === 'monster'), enemiesBeforeFlee);
    await flush();

    assert.equal(systems.isCombatActive, false);
    assert.equal(record.hides, 1);
    assert.equal(record.actions, null);
    assert.deepEqual(dungeon, initialDungeon);
    const finalSnapshots = record.snapshots.length;
    retainedFleeCommand();
    systems.selectCombatCell(4, 3);
    assert.equal(systems.handleCombatKey('ArrowRight'), false);
    await flush();
    assert.equal(record.snapshots.length, finalSnapshots);
    assert.equal(record.hides, 1);
    assert.equal(record.actions, null);
  });
});
