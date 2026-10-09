import assert from 'node:assert/strict';
import test from 'node:test';
import { DIR, DX, DY, WALL, backOf, getWall } from '../src/dungeon.js';
import { createBattlefield } from '../src/systems/battlefield.js';

const SIDES = ['n', 'e', 's', 'w'];
const combatant = (id) => ({ id, alive: true });

function dungeon(width, height, { x = 0, y = 0, dir = DIR.E } = {}) {
  return {
    width, height, x, y, dir,
    cells: Array.from({ length: height }, () => Array.from({ length: width }, () => ({
      n: WALL.WALL, e: WALL.WALL, s: WALL.WALL, w: WALL.WALL, visited: false,
    }))),
  };
}

function link(map, x, y, direction, wall = WALL.OPEN) {
  map.cells[y][x][SIDES[direction]] = wall;
  map.cells[y + DY[direction]][x + DX[direction]][SIDES[backOf(direction)]] = wall;
}

function room(width, height, origin) {
  const map = dungeon(width, height, origin);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x + 1 < width) link(map, x, y, DIR.E);
      if (y + 1 < height) link(map, x, y, DIR.S);
    }
  }
  return map;
}

test('one original dungeon tile holds nine distinct combatants without changing the map', () => {
  const map = dungeon(1, 1);
  const before = structuredClone(map);
  const heroes = Array.from({ length: 5 }, (_, i) => combatant(`hero${i}`));
  const monsters = Array.from({ length: 4 }, (_, i) => combatant(`foe${i}`));
  const board = createBattlefield(map, heroes, monsters);

  assert.equal(board.width, 3);
  assert.equal(board.height, 3);
  assert.deepEqual(board.origin, { x: 1, y: 1 });
  assert.deepEqual(new Set(board.units.map((unit) => `${unit.x},${unit.y}`)), new Set([
    '0,0', '1,0', '2,0', '0,1', '1,1', '2,1', '0,2', '1,2', '2,2',
  ]));
  for (const unit of board.units) {
    const entities = unit.team === 'party' ? heroes : monsters;
    assert.equal(unit.entity, entities.find((entity) => entity.id === unit.id));
  }
  assert.deepEqual(map, before);
  assert.throws(() => createBattlefield(map, heroes, [...monsters, combatant('tenth')]), RangeError);
});

test('edge encounters keep the party together in its original map tile and put the lead on an exposed front', () => {
  const map = room(5, 4, { x: 4, y: 0, dir: DIR.W });
  const before = structuredClone(map);
  const heroes = Array.from({ length: 5 }, (_, i) => combatant(`hero${i}`));
  const monsters = Array.from({ length: 15 }, (_, i) => combatant(`foe${i}`));
  const board = createBattlefield(map, heroes, monsters);

  assert.equal(board.width, 15);
  assert.equal(board.height, 12);
  assert.deepEqual(board.origin, { x: 13, y: 1 });
  assert.equal(new Set(board.units.map((unit) => `${unit.x},${unit.y}`)).size, 20);
  for (const unit of board.units) {
    assert.ok(Number.isInteger(unit.x) && Number.isInteger(unit.y));
    assert.ok(unit.x >= 0 && unit.x < 15 && unit.y >= 0 && unit.y < 12);
    if (unit.team === 'party') {
      assert.equal(Math.floor(unit.x / 3), 4);
      assert.equal(Math.floor(unit.y / 3), 0);
    }
  }
  const lead = board.position('hero0');
  assert.equal(lead.x, 12);
  assert.equal(lead.y, 1);
  assert.deepEqual({ x: board.position('foe0').x, y: board.position('foe0').y }, { x: 10, y: 1 });
  assert.ok(board.reachable(lead.id, 1).some((cell) => cell.cost === 1)
    || monsters.some((foe) => board.canTarget(lead.id, foe.id, { melee: true })));
  assert.deepEqual(map, before);

  const sideMap = dungeon(3, 3, { x: 1, y: 1, dir: DIR.E });
  link(sideMap, 1, 1, DIR.N, WALL.DOOR);
  link(sideMap, 1, 1, DIR.S);
  const sideBoard = createBattlefield(sideMap, heroes, [combatant('nearby'), combatant('second')]);
  assert.deepEqual({ x: sideBoard.position('nearby').x, y: sideBoard.position('nearby').y }, { x: 4, y: 1 });
  assert.deepEqual({ x: sideBoard.position('hero0').x, y: sideBoard.position('hero0').y }, { x: 4, y: 3 });
  assert.ok(sideBoard.reachable('hero0', 1).some((cell) => cell.x === 4 && cell.y === 2 && cell.cost === 1));
  assert.equal(sideBoard.canTarget('hero0', 'nearby', { melee: true }), false);
  assert.deepEqual(sideBoard.move('hero0', 4, 2, 1), { moved: true, cost: 1 });
  assert.equal(sideBoard.canTarget('hero0', 'nearby', { melee: true }), true);
});

test('a wall blocks all three subcell edges in every direction and a door opens those same edges', async (t) => {
  const boundaries = [
    { direction: DIR.E, origin: { x: 0, y: 0 }, from: (offset) => [2, offset], to: (offset) => [3, offset] },
    { direction: DIR.S, origin: { x: 0, y: 0 }, from: (offset) => [offset, 2], to: (offset) => [offset, 3] },
    { direction: DIR.W, origin: { x: 1, y: 0 }, from: (offset) => [3, offset], to: (offset) => [2, offset] },
    { direction: DIR.N, origin: { x: 0, y: 1 }, from: (offset) => [offset, 3], to: (offset) => [offset, 2] },
  ];
  for (const boundary of boundaries) {
    for (const [name, wall, traversable] of [['wall', WALL.WALL, false], ['door', WALL.DOOR, true]]) {
      await t.test(`${SIDES[boundary.direction]} ${name}`, () => {
        for (let offset = 0; offset < 3; offset += 1) {
          const map = dungeon(2, 2, boundary.origin);
          link(map, map.x, map.y, boundary.direction, wall);
          const before = structuredClone(map);
          const board = createBattlefield(map, [combatant('hero')], []);
          const from = boundary.from(offset);
          const to = boundary.to(offset);
          assert.equal(board.move('hero', ...from, 3).moved, true);
          assert.deepEqual(board.move('hero', ...to, 1), { moved: traversable, cost: traversable ? 1 : 0 });
          if (traversable) assert.deepEqual(board.move('hero', ...from, 1), { moved: true, cost: 1 });
          else assert.deepEqual([board.position('hero').x, board.position('hero').y], from);
          assert.deepEqual(map, before);
        }
      });
    }
  }
});

test('movement charges every subcell step including wall detours and keeps the exploration origin fixed', () => {
  const map = dungeon(3, 2);
  link(map, 0, 0, DIR.E, WALL.DOOR);
  link(map, 1, 0, DIR.E);
  const before = structuredClone(map);
  const board = createBattlefield(map, [combatant('hero')], []);
  const origin = board.origin;
  const reachable = board.reachable('hero', 2);

  assert.ok(reachable.some((cell) => cell.x === 1 && cell.y === 1 && cell.cost === 0));
  assert.ok(reachable.some((cell) => cell.x === 2 && cell.y === 1 && cell.cost === 1));
  assert.ok(reachable.some((cell) => cell.x === 3 && cell.y === 1 && cell.cost === 2));
  for (const [x, y, budget] of [[7, 1, 5], [1, 3, 5], [2.5, 1, 3], [-1, 1, 3], [9, 1, 20]]) {
    assert.deepEqual(board.move('hero', x, y, budget), { moved: false, cost: 0 });
  }
  assert.deepEqual(board.move('hero', 7, 1, 6), { moved: true, cost: 6 });
  assert.deepEqual(board.move('hero', 7, 1, 6), { moved: false, cost: 0 });
  assert.equal(board.origin, origin);
  assert.deepEqual(board.origin, { x: 1, y: 1 });
  assert.deepEqual(map, before);

  const detourMap = room(2, 2);
  link(detourMap, 0, 0, DIR.E, WALL.WALL);
  const detour = createBattlefield(detourMap, [combatant('hero')], []);
  assert.deepEqual(detour.pathToCell('hero', 4, 1, 6), [], 'Animation paths must obey the same detour budget as movement.');
  const route = detour.pathToCell('hero', 4, 1, 7);
  assert.equal(route.length, 7);
  assert.deepEqual(route.at(-1), { x: 4, y: 1 });
  let previous = { x: 1, y: 1 };
  for (const step of route) {
    const direction = [DIR.N, DIR.E, DIR.S, DIR.W].find((dir) => previous.x + DX[dir] === step.x && previous.y + DY[dir] === step.y);
    assert.notEqual(direction, undefined, 'A plotted animation path advances one orthogonal cell per frame.');
    const mapX = Math.floor(previous.x / 3);
    const mapY = Math.floor(previous.y / 3);
    if (mapX !== Math.floor(step.x / 3) || mapY !== Math.floor(step.y / 3)) {
      assert.notEqual(getWall(detourMap.cells, 2, 2, mapX, mapY, direction), WALL.WALL);
    }
    previous = step;
  }
  assert.deepEqual({ x: detour.position('hero').x, y: detour.position('hero').y }, { x: 1, y: 1 }, 'Plotting a route does not move the actor.');
  assert.deepEqual(detour.move('hero', 4, 1, 6), { moved: false, cost: 0 });
  assert.deepEqual(detour.move('hero', 4, 1, 7), { moved: true, cost: 7 });
});

test('living fighters block a full three-subcell passage and their deaths immediately free occupied cells', () => {
  const hero = combatant('hero');
  const ally = combatant('ally');
  const upper = combatant('upper');
  const lower = combatant('lower');
  const board = createBattlefield(room(4, 1), [hero, ally], [upper, lower]);

  assert.equal(board.move('upper', 4, 0, 1).moved, true);
  assert.equal(board.move('lower', 5, 2, 1).moved, true);
  assert.equal(board.move('hero', 4, 1, 2).moved, true);
  assert.equal(board.move('ally', 3, 1, 2).moved, true);
  assert.equal(board.move('hero', 2, 1, 4).moved, true);
  assert.equal(board.move('upper', 3, 0, 1).moved, true);
  assert.equal(board.move('lower', 3, 2, 2).moved, true);
  assert.ok(board.reachable('hero', 12).every((cell) => cell.x < 3));
  assert.deepEqual(board.move('hero', 4, 1, 12), { moved: false, cost: 0 });
  ally.alive = false;
  assert.deepEqual(board.move('hero', 4, 1, 2), { moved: true, cost: 2 });
  assert.deepEqual(board.move('hero', 3, 0, 3), { moved: false, cost: 0 });
  upper.alive = false;
  assert.deepEqual(board.move('hero', 3, 0, 2), { moved: true, cost: 2 });
  assert.deepEqual(board.move('hero', 3, 2, 5), { moved: false, cost: 0 });
  lower.alive = false;
  assert.deepEqual(board.move('hero', 3, 2, 2), { moved: true, cost: 2 });
  assert.deepEqual(board.reachable('ally', 4), []);
  assert.deepEqual(board.move('ally', 6, 1, 4), { moved: false, cost: 0 });
  assert.equal(board.position('hero').entity, hero);
});

test('melee needs adjacent subcells across an open edge while ranged distance counts substeps', () => {
  const board = createBattlefield(room(2, 2), [combatant('hero')], [combatant('foe')]);
  assert.equal(board.move('foe', 2, 1, 2).moved, true);
  assert.equal(board.canTarget('hero', 'foe', { melee: true }), true);
  assert.equal(board.canTarget('hero', 'hero', { range: 0 }), true);
  assert.equal(board.move('foe', 2, 2, 1).moved, true);
  assert.equal(board.canTarget('hero', 'foe', { range: 2, melee: true }), false);
  assert.equal(board.canTarget('hero', 'foe', { range: 1 }), false);
  assert.equal(board.canTarget('hero', 'foe', { range: 2 }), true);

  const map = room(2, 2);
  link(map, 0, 0, DIR.E, WALL.WALL);
  const blocked = createBattlefield(map, [combatant('hero')], [combatant('foe')]);
  assert.equal(blocked.move('foe', 3, 1, 5).moved, true);
  assert.equal(blocked.move('hero', 2, 1, 1).moved, true);
  assert.equal(blocked.canTarget('hero', 'foe', { range: 1, melee: true }), false);
  assert.equal(blocked.canTarget('hero', 'foe', { range: 1 }), false);
});

test('straight ranged attacks stop at original map walls and pass through doors symmetrically', async (t) => {
  for (const [name, wall, visible] of [['wall', WALL.WALL, false], ['door', WALL.DOOR, true]]) {
    await t.test(name, () => {
      const map = room(3, 2);
      link(map, 1, 0, DIR.E, wall);
      const board = createBattlefield(map, [combatant('hero')], [combatant('foe')]);
      assert.equal(board.move('foe', 7, 1, 12).moved, true);
      assert.equal(board.canTarget('hero', 'foe', { range: 6 }), visible);
      assert.equal(board.canTarget('foe', 'hero', { range: 6 }), visible);
    });
  }
});

test('supercover LOS blocks every original wall touching a diagonal map corner', async (t) => {
  for (const [x, y, direction] of [[0, 0, DIR.E], [0, 0, DIR.S], [1, 0, DIR.S], [0, 1, DIR.E]]) {
    await t.test(`wall at ${x},${y} ${SIDES[direction]}`, () => {
      const map = room(3, 3);
      link(map, x, y, direction, WALL.WALL);
      const board = createBattlefield(map, [combatant('hero')], [combatant('foe')]);
      assert.equal(board.move('foe', 7, 7, 20).moved, true);
      assert.equal(board.canTarget('hero', 'foe', { range: 12 }), false);
      assert.equal(board.canTarget('foe', 'hero', { range: 12 }), false);
    });
  }
});

test('non-diagonal LOS checks the original borders its subcell ray actually crosses', async (t) => {
  const crossings = [
    { x: 0, y: 0, direction: DIR.S, visible: true },
    { x: 0, y: 0, direction: DIR.E, visible: false },
    { x: 1, y: 0, direction: DIR.S, visible: false },
    { x: 1, y: 1, direction: DIR.E, visible: false },
  ];
  for (const { x, y, direction, visible } of crossings) {
    await t.test(`wall at ${x},${y} ${SIDES[direction]}`, () => {
      const map = room(3, 3);
      link(map, x, y, direction, WALL.WALL);
      const board = createBattlefield(map, [combatant('hero')], [combatant('foe')]);
      assert.equal(board.move('foe', 7, 4, 20).moved, true);
      assert.equal(board.canTarget('hero', 'foe', { range: 9 }), visible);
      assert.equal(board.canTarget('foe', 'hero', { range: 9 }), visible);
    });
  }
});

test('AI follows legal subcell routes through dungeon turns and truncates movement without moving the actor', () => {
  const map = dungeon(3, 2);
  for (const [x, y, direction] of [[0, 0, DIR.E], [1, 0, DIR.S], [1, 1, DIR.E]]) link(map, x, y, direction);
  const board = createBattlefield(map, [combatant('hero')], [combatant('foe')]);
  assert.equal(board.move('foe', 7, 4, 8).moved, true);
  const actor = board.position('hero');
  const initial = { x: actor.x, y: actor.y };
  const path = board.pathToAdjacent('hero', 'foe');
  assert.equal(path.length, 8);
  assert.deepEqual(board.pathToAdjacent('hero', 'foe', 3), path.slice(0, 3));
  assert.deepEqual({ x: actor.x, y: actor.y }, initial);
  let previous = initial;
  for (const next of path) {
    const direction = [DIR.N, DIR.E, DIR.S, DIR.W].find((dir) => previous.x + DX[dir] === next.x && previous.y + DY[dir] === next.y);
    assert.notEqual(direction, undefined);
    const fromX = Math.floor(previous.x / 3);
    const fromY = Math.floor(previous.y / 3);
    if (fromX !== Math.floor(next.x / 3) || fromY !== Math.floor(next.y / 3)) {
      assert.notEqual(getWall(map.cells, map.width, map.height, fromX, fromY, direction), WALL.WALL);
    }
    assert.equal(board.move('hero', next.x, next.y, 1).moved, true);
    previous = next;
  }
  assert.equal(board.canTarget('hero', 'foe', { melee: true }), true);
  board.position('foe').entity.alive = false;
  assert.deepEqual(board.pathToAdjacent('hero', 'foe'), []);
});
