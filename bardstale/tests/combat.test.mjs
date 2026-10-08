import assert from 'node:assert/strict';
import test from 'node:test';
import { DIR, WALL } from '../src/dungeon.js';
import { initBt3Systems } from '../src/systems/core.js';
import { COMBAT_CELLS_PER_MAP_TILE } from '../config/combatSettings.js';

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
  const record = { actions: null, party: null, snapshot: null, snapshots: [], logs: [], hides: 0 };
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
      async begin() {
        for (let step = 0; step < 3; step += 1) systems.onStepComplete(1);
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

test('the lead hero can act, attacks resolve before the next hero, and movement spends only four steps', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit, dungeon, initialDungeon }) => {
    await begin();
    assert.equal(record.actions.active.id, 'c_warrior');
    choose(/^Move /);
    const monsters = record.snapshot.units.filter((entry) => entry.team === 'monster' && entry.alive);
    const warrior = unit('c_warrior');
    const adjacentFoe = monsters.some((monster) => Math.abs(monster.x - warrior.x) + Math.abs(monster.y - warrior.y) === 1);
    assert.ok(adjacentFoe || record.snapshot.reachable.some((cell) => cell.cost > 0), 'The lead fighter must have a legal move or an adjacent foe instead of being boxed in by allies.');
    if (!adjacentFoe) {
      const approach = record.snapshot.reachable.find((cell) => cell.cost > 0 && monsters.some((monster) => Math.abs(monster.x - cell.x) + Math.abs(monster.y - cell.y) === 1));
      assert.ok(approach, 'Brynn must be able to approach a foe within his movement budget.');
      systems.selectCombatCell(approach.x, approach.y);
    }
    systems.handleCombatKey('Escape');
    choose('Attack');
    assert.equal(record.snapshot.mode, 'target');
    const target = record.snapshot.units.find((entry) => entry.x === record.snapshot.cursor.x && entry.y === record.snapshot.cursor.y && entry.team === 'monster');
    assert.ok(target);
    const previousHp = target.hpCurrent;
    const retainedTargetCommand = record.actions.buttons.find((button) => button.role !== 'back').onSelect;
    systems.handleCombatKey('Enter');

    assert.ok(unit(target.id).hpCurrent < previousHp, 'Damage must occur before Ser Ana is prompted.');
    assert.equal(record.snapshot.mode, 'resolving');
    assert.equal(record.actions, null);
    const afterAttack = structuredClone(record.snapshot.units);
    assert.equal(systems.handleCombatKey('ArrowDown'), true);
    systems.selectCombatCell(target.x, target.y);
    retainedTargetCommand();
    assert.deepEqual(record.snapshot.units, afterAttack, 'Resolving must reject movement, targeting, and stale menu commands.');
    await flush();
    assert.equal(record.actions.active.id, 'c_paladin');
    assert.equal(record.snapshot.round, 1);
    choose('Pass');
    await flush();
    assert.equal(record.actions.active.id, 'c_rogue');
    choose('Pass');
    await flush();
    assert.equal(record.actions.active.id, 'c_bard');
    choose(/^Move /);
    const startingCell = { x: unit('c_bard').x, y: unit('c_bard').y };
    const directions = [
      { key: 'ArrowUp', dx: 0, dy: -1 }, { key: 'ArrowRight', dx: 1, dy: 0 },
      { key: 'ArrowDown', dx: 0, dy: 1 }, { key: 'ArrowLeft', dx: -1, dy: 0 },
    ];
    const occupied = (x, y) => record.snapshot.units.some((entry) => entry.alive && entry.x === x && entry.y === y);
    const blockedDirection = directions.find(({ dx, dy }) => occupied(startingCell.x + dx, startingCell.y + dy));
    assert.ok(blockedDirection, 'The fixture must exercise an occupied neighboring cell.');
    assert.equal(systems.handleCombatKey(blockedDirection.key), true);
    assert.deepEqual({ x: unit('c_bard').x, y: unit('c_bard').y }, startingCell);
    const freeDirection = directions.find(({ dx, dy }) => Array.from({ length: 5 }, (_, index) => index + 1).every((step) => {
      const x = startingCell.x + dx * step;
      const y = startingCell.y + dy * step;
      return x >= 0 && y >= 0 && x < dungeon.width * COMBAT_CELLS_PER_MAP_TILE && y < dungeon.height * COMBAT_CELLS_PER_MAP_TILE && !occupied(x, y);
    }));
    assert.ok(freeDirection, 'The fixture must provide five clear cells so the fifth step tests the budget.');
    for (let step = 1; step <= 4; step += 1) {
      assert.equal(systems.handleCombatKey(freeDirection.key), true);
      assert.deepEqual({ x: unit('c_bard').x, y: unit('c_bard').y }, {
        x: startingCell.x + freeDirection.dx * step,
        y: startingCell.y + freeDirection.dy * step,
      });
    }
    const exhaustedCell = { x: unit('c_bard').x, y: unit('c_bard').y };
    systems.handleCombatKey(freeDirection.key);
    systems.selectCombatCell(exhaustedCell.x + freeDirection.dx, exhaustedCell.y + freeDirection.dy);
    assert.deepEqual({ x: unit('c_bard').x, y: unit('c_bard').y }, exhaustedCell);
    assert.ok(record.snapshot.reachable.every((cell) => cell.cost === 0));
    systems.handleCombatKey('Escape');
    assert.equal(record.snapshot.mode, 'menu');
    assert.equal(record.actions.buttons.some((button) => /^Move /.test(button.label)), false);
    assert.deepEqual(dungeon, initialDungeon, 'Combat movement must preserve exploration position, facing, and dungeon cells.');
  });
});

test('a selected spell spends SP and updates the enemy immediately, then advances through the monster phase', async () => {
  await withCombat(async ({ systems, record, choose, flush, begin, unit, member }) => {
    await begin();
    for (let hero = 0; hero < 4; hero += 1) {
      choose('Pass');
      await flush();
    }
    assert.equal(record.actions.active.id, 'c_chrono');
    const previousSp = member('c_chrono').spCurrent;
    choose('Cast Spell');
    choose(/^MIJA /);
    assert.equal(record.snapshot.mode, 'target');
    const target = record.snapshot.units.find((entry) => entry.x === record.snapshot.cursor.x && entry.y === record.snapshot.cursor.y && entry.team === 'monster');
    assert.ok(target);
    const previousHp = target.hpCurrent;
    systems.selectCombatCell(target.x, target.y);

    assert.equal(member('c_chrono').spCurrent, previousSp - 4);
    assert.ok(unit(target.id).hpCurrent < previousHp);
    assert.equal(record.snapshot.mode, 'resolving');
    assert.equal(record.actions, null);
    const damageAfterCast = unit(target.id).hpCurrent;
    systems.handleCombatKey('Enter');
    systems.selectCombatCell(target.x, target.y);
    assert.equal(member('c_chrono').spCurrent, previousSp - 4);
    assert.equal(unit(target.id).hpCurrent, damageAfterCast);
    await flush();

    assert.equal(record.snapshot.round, 2);
    assert.equal(record.actions.active.id, 'c_warrior');
    assert.equal(member('c_chrono').spCurrent, previousSp - 4);
    assert.ok(record.snapshots.some((snapshot) => snapshot.mode === 'resolving' && snapshot.units.some((entry) => entry.team === 'monster' && entry.id === snapshot.activeId)), 'The view must identify the monster whose turn is resolving.');
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
