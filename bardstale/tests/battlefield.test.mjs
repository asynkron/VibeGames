import assert from 'node:assert/strict';
import test from 'node:test';
import { DIR, DX, DY, WALL, backOf, getWall } from '../src/dungeon.js';
import { createBattlefield } from '../src/systems/battlefield.js';
import { footprintCells, footprintCenter, normalizeFootprint, occupiesCell } from '../src/combatFootprints.js';

const SIDES = ['n', 'e', 's', 'w'];
const combatant = (id) => ({ id, alive: true });

function dungeon(width, height, { x = 0, y = 0, dir = DIR.E } = {}) {
  return {
    width, height, x, y, dir, objects: [],
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

test('furniture persists through deployment and consumes combat-cell capacity', () => {
  const map = dungeon(1, 1);
  map.objects.push({ id: 'chest', kind: 'chest', x: 0, y: 0, rotation: 0 });
  const before = structuredClone(map);
  const heroes = Array.from({ length: 5 }, (_, i) => combatant(`hero${i}`));
  const monsters = Array.from({ length: 3 }, (_, i) => combatant(`foe${i}`));
  const board = createBattlefield(map, heroes, monsters);

  assert.equal(board.units.length, 8);
  assert.ok(board.units.every((unit) => unit.x !== 0 || unit.y !== 0));
  assert.equal(new Set(board.units.map((unit) => `${unit.x},${unit.y}`)).size, 8);
  assert.throws(() => createBattlefield(map, heroes, [...monsters, combatant('extra')]), RangeError);
  const dragon = { ...combatant('dragon'), footprint: { width: 2, height: 2 } };
  assert.throws(() => createBattlefield(map, heroes, [dragon]), RangeError);
  const largeBoard = createBattlefield(map, heroes.slice(0, 4), [dragon]);
  assert.ok(largeBoard.units.flatMap((unit) => footprintCells(unit)).every(({ x, y }) => x !== 0 || y !== 0));
  assert.deepEqual(map, before, 'Deployment must not remove or relocate dungeon furniture.');
});

test('furniture blocks destinations and forces movement and AI approach paths around it', () => {
  const map = room(3, 1);
  map.objects.push({ id: 'table', kind: 'table', x: 2, y: 1, rotation: 0 });
  const board = createBattlefield(map, [combatant('hero')], [combatant('foe')]);

  assert.equal(board.canPlace('hero', 2, 1), false);
  assert.ok(board.reachable('hero', 10).every(({ x, y }) => x !== 2 || y !== 1));
  assert.deepEqual(board.move('hero', 2, 1, 10), { moved: false, cost: 0 });
  assert.deepEqual(board.pathToCell('hero', 3, 1, 3), []);
  const route = board.pathToCell('hero', 3, 1, 4);
  const approach = board.pathToAdjacent('hero', 'foe');
  assert.equal(board.pathsToTargets('hero', ['foe'], 3, { melee: true }).has('foe'), false,
    'A partial approach never advertises an attack that cannot finish within the movement budget.');
  const attackRoute = board.pathsToTargets('hero', ['foe'], 4, { melee: true }).get('foe');
  assert.equal(route.length, 4);
  assert.equal(approach.length, 4);
  assert.equal(attackRoute.length, 4);
  for (const path of [route, approach, attackRoute]) {
    assert.ok(path.every(({ x, y }) => x !== 2 || y !== 1));
  }
  assert.deepEqual(board.move('hero', 3, 1, 3), { moved: false, cost: 0 });
  for (const step of approach) assert.equal(board.move('hero', step.x, step.y, 1).moved, true);
  assert.equal(board.canTarget('hero', 'foe', { melee: true }), true);
});

test('furniture-separated spaces cannot receive combatants from the other side', () => {
  const map = room(3, 1);
  map.objects.push(...[0, 1, 2].map((y) => ({ id: `barrel${y}`, kind: 'barrel', x: 2, y, rotation: 0 })));
  const heroes = Array.from({ length: 7 }, (_, i) => combatant(`hero${i}`));
  assert.throws(() => createBattlefield(map, heroes, []), RangeError,
    'Only six cells are connected to the party origin; free cells beyond the barrels cannot be used.');
});

test('large bodies cannot overlap furniture or squeeze through its one-cell opening', () => {
  const map = room(3, 1);
  map.objects.push(...[0, 2].map((y) => ({ id: `barrel${y}`, kind: 'barrel', x: 3, y, rotation: 0 })));
  const dragon = { ...combatant('dragon'), footprint: { width: 2, height: 2 } };
  const board = createBattlefield(map, [], [dragon]);

  assert.equal(board.canPlace('dragon', 2, 1), false, 'The far side of the body overlaps the lower barrel.');
  assert.ok(board.reachable('dragon', 30).every(({ x }) => x >= 4));
  assert.deepEqual(board.pathToCell('dragon', 0, 1, 30), []);
  assert.deepEqual(board.move('dragon', 0, 1, 30), { moved: false, cost: 0 });
});

test('tall furniture blocks ranged sight and low furniture can be shot over', () => {
  for (const [kind, visible] of [['chest', true], ['table', true], ['statue', false], ['bookshelf', false]]) {
    const map = room(3, 2);
    map.objects.push({ id: 'obstacle', kind, x: 2, y: 1, rotation: 0 });
    const board = createBattlefield(map, [combatant('hero')], [combatant('foe')]);
    assert.equal(board.canTarget('hero', 'foe', { range: 3 }), visible, kind);
    assert.equal(board.canTarget('foe', 'hero', { range: 3 }), visible, `${kind} in reverse`);
    assert.equal(board.move('foe', 2, 2, 10).moved, true);
    assert.equal(board.canTarget('hero', 'foe', { range: 2 }), visible, `${kind} at a diagonal corner`);
    assert.equal(board.canTarget('foe', 'hero', { range: 2 }), visible, `${kind} diagonal in reverse`);
  }
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

test('a threatened archer can preview a target and move to a legal firing cell', () => {
  const board = createBattlefield(room(2, 2), [combatant('hero')], [combatant('foe')]);
  assert.equal(board.move('foe', 2, 1, 2).moved, true);
  const shot = { range: 6, avoidAdjacentEnemies: true };
  const origin = { x: board.position('hero').x, y: board.position('hero').y };

  assert.equal(board.canTarget('hero', 'foe', shot), false);
  assert.equal(board.pathsToTargets('hero', ['foe'], 0, shot).has('foe'), false);
  const path = board.pathsToTargets('hero', ['foe'], 1, shot).get('foe');
  assert.equal(path.length, 1);
  assert.deepEqual({ x: board.position('hero').x, y: board.position('hero').y }, origin);
  assert.equal(board.move('hero', path[0].x, path[0].y, 1).moved, true);
  assert.equal(board.canTarget('hero', 'foe', shot), true);
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

test('footprints define cell coverage and visual centers without sharing mutable dimensions', () => {
  const source = { width: 2, height: 3 };
  const footprint = normalizeFootprint(source);
  source.width = 7;
  const unit = { x: 4, y: 2, footprint };
  assert.equal(Object.isFrozen(footprint), true);
  assert.deepEqual(footprintCenter(unit), { x: 5, y: 3.5 });
  assert.deepEqual(footprintCells(unit), [
    { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 4, y: 3 },
    { x: 5, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 4 },
  ]);
  assert.deepEqual(footprintCells(unit, 0, 1)[0], { x: 0, y: 1 });
  for (const [x, y, occupied] of [[4, 2, true], [5, 4, true], [6, 4, false], [5, 5, false], [4.5, 2, false]]) {
    assert.equal(occupiesCell(unit, x, y), occupied);
  }
  assert.deepEqual(normalizeFootprint(), { width: 1, height: 1 });
  for (const invalid of [null, {}, { width: 0, height: 1 }, { width: 2, height: -1 }, { width: 1.5, height: 2 }]) {
    assert.throws(() => normalizeFootprint(invalid), RangeError);
  }
});

test('a dragon reserves four combat cells before the five heroes fill a closed dungeon tile', () => {
  const heroes = Array.from({ length: 5 }, (_, i) => combatant(`hero${i}`));
  const dragon = { ...combatant('dragon'), footprint: { width: 2, height: 2 } };
  const board = createBattlefield(dungeon(1, 1), heroes, [dragon]);
  const occupied = board.units.flatMap((unit) => footprintCells(unit));
  assert.equal(occupied.length, 9);
  assert.deepEqual(new Set(occupied.map(({ x, y }) => `${x},${y}`)), new Set([
    '0,0', '1,0', '2,0', '0,1', '1,1', '2,1', '0,2', '1,2', '2,2',
  ]));
  const large = board.position('dragon');
  assert.equal(board.occupies('dragon', large.x + 1, large.y + 1), true);
  assert.equal(board.canPlace('dragon', large.x, large.y), true);
  assert.equal(board.canPlace('dragon', 2, 2), false, 'The whole footprint must stay inside the board.');
  assert.throws(() => createBattlefield(dungeon(1, 1), heroes, [dragon, combatant('extra')]), RangeError);
  assert.throws(() => createBattlefield(dungeon(1, 1), [{ ...dragon, id: 'giant' }], [dragon]), RangeError,
    'Enough total area does not guarantee that two large rectangles fit.');
});

test('large movement and paths cannot squeeze through a single-cell gap', () => {
  const board = createBattlefield(room(3, 1), [combatant('hero')], [{ ...combatant('dragon'), footprint: { width: 2, height: 2 } }]);
  assert.equal(board.move('hero', 3, 1, 2).moved, true);
  assert.deepEqual(board.pathToCell('dragon', 0, 0, 30), []);
  assert.equal(board.move('dragon', 0, 0, 30).moved, false);
  assert.ok(board.reachable('dragon', 30).every(({ x }) => x >= 4));
  board.position('hero').entity.alive = false;
  const route = board.pathToCell('dragon', 0, 0, 30);
  assert.ok(route.length > 0);
  for (const next of route) assert.equal(board.move('dragon', next.x, next.y, 1).moved, true);
  assert.deepEqual({ x: board.position('dragon').x, y: board.position('dragon').y }, { x: 0, y: 0 });
});

test('the far side of a large body cannot overlap or sweep across a dungeon wall', () => {
  const map = room(2, 2);
  link(map, 0, 1, DIR.E, WALL.WALL);
  const board = createBattlefield(map, [{ ...combatant('giant'), footprint: { width: 2, height: 2 } }], []);
  assert.equal(board.move('giant', 1, 2, 1).moved, true);
  assert.equal(board.canPlace('giant', 2, 2), false);
  assert.deepEqual(board.move('giant', 2, 2, 1), { moved: false, cost: 0 });
  assert.deepEqual(board.pathToCell('giant', 3, 2, 2), []);
  const around = board.pathToCell('giant', 3, 2, 4);
  assert.equal(around.length, 4);
  for (const next of around) assert.equal(board.move('giant', next.x, next.y, 1).moved, true);
  assert.equal(board.canPlace('giant', 3, 2), true);
});

test('death frees every occupied cell and revival requires the complete footprint to be clear', () => {
  const dragon = { ...combatant('dragon'), footprint: { width: 2, height: 2 } };
  const board = createBattlefield(room(3, 2), [combatant('hero')], [dragon]);
  const target = board.position('dragon');
  const corner = { x: target.x + 1, y: target.y + 1 };
  assert.equal(board.move('hero', corner.x, corner.y, 20).moved, false);
  dragon.alive = false;
  assert.equal(board.canPlace('dragon', target.x, target.y), true);
  assert.equal(board.move('hero', corner.x, corner.y, 20).moved, true);
  assert.equal(board.canPlace('dragon', target.x, target.y), false);
  assert.equal(board.move('hero', 0, 0, 20).moved, true);
  assert.equal(board.canPlace('dragon', target.x, target.y), true);
  dragon.alive = true;
  assert.equal(board.move('hero', corner.x, corner.y, 20).moved, false);
});

test('melee and AI approach the nearest exposed edge of both large combatants', () => {
  const board = createBattlefield(room(4, 3), [{ ...combatant('giant'), footprint: { width: 2, height: 2 } }], [{ ...combatant('dragon'), footprint: { width: 2, height: 2 } }]);
  assert.equal(board.move('dragon', 7, 4, 20).moved, true);
  const route = board.pathToAdjacent('giant', 'dragon');
  assert.ok(route.length > 0);
  assert.deepEqual(board.pathToAdjacent('giant', 'dragon', 2), route.slice(0, 2));
  for (const next of route) assert.equal(board.move('giant', next.x, next.y, 1).moved, true);
  assert.equal(board.canTarget('giant', 'dragon', { melee: true }), true);
  assert.equal(board.canTarget('dragon', 'giant', { melee: true }), true);
  assert.equal(board.canTarget('giant', 'giant', { melee: true }), false);
  assert.equal(board.canTarget('giant', 'giant', { range: 0 }), true);
  assert.deepEqual(board.pathToAdjacent('giant', 'dragon'), []);
  const giant = board.position('giant');
  const dragon = board.position('dragon');
  assert.ok(Math.abs(giant.x - dragon.x) + Math.abs(giant.y - dragon.y) > 1, 'Melee measures the exposed body edges, not anchor cells.');
});

test('ranged targeting uses one exposed cell pair that satisfies both distance and line of sight', () => {
  const map = room(2, 2);
  link(map, 0, 0, DIR.E, WALL.WALL);
  const board = createBattlefield(map, [combatant('hero')], [{ ...combatant('dragon'), footprint: { width: 2, height: 2 } }]);
  assert.equal(board.move('hero', 1, 2, 1).moved, true);
  assert.equal(board.move('dragon', 3, 2, 10).moved, true);
  // The near corner at (3,2) is two cells away behind a wall. The visible corner
  // at (3,3) is three cells away through the neighboring open dungeon boundary.
  for (const [actor, target] of [['hero', 'dragon'], ['dragon', 'hero']]) {
    assert.equal(board.canTarget(actor, target, { range: 2 }), false);
    assert.equal(board.canTarget(actor, target, { range: 3 }), true);
  }
  const before = { x: board.position('hero').x, y: board.position('hero').y };
  assert.equal(board.pathsToTargets('hero', ['dragon'], 0, { range: 2 }).has('dragon'), false);
  assert.deepEqual(board.pathsToTargets('hero', ['dragon'], 0, { range: 3 }).get('dragon'), [],
    'The exposed far corner permits a direct shot without spending movement.');
  const firingRoute = board.pathsToTargets('hero', ['dragon'], 1, { range: 2 }).get('dragon');
  assert.deepEqual(firingRoute, [{ x: 1, y: 3 }], 'A one-step approach uses the prospective firing position and an unobstructed footprint corner.');
  assert.deepEqual({ x: board.position('hero').x, y: board.position('hero').y }, before, 'Planning must leave combatants in their current positions.');
  for (const step of firingRoute) assert.equal(board.move('hero', step.x, step.y, 1).moved, true);
  assert.equal(board.canTarget('hero', 'dragon', { range: 2 }), true);
});
