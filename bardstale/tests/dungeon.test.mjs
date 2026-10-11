import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDungeon, DIR, DX, DY, getWall, WALL } from '../src/dungeon.js';
import { ENVIRONMENTS } from '../src/environments.js';

function assertValidDungeon({ width, height, cells, start }) {
  assert.equal(cells.length, height);
  assert.ok(Number.isInteger(start.x) && Number.isInteger(start.y));
  assert.ok(start.x > 0 && start.x < width - 1);
  assert.ok(start.y > 0 && start.y < height - 1);

  for (let x = 0; x < width; x++) {
    assert.equal(cells[0][x].n, WALL.WALL, `north boundary at ${x},0`);
    assert.equal(cells[height - 1][x].s, WALL.WALL, `south boundary at ${x},${height - 1}`);
  }
  for (let y = 0; y < height; y++) {
    assert.equal(cells[y].length, width);
    assert.equal(cells[y][0].w, WALL.WALL, `west boundary at 0,${y}`);
    assert.equal(cells[y][width - 1].e, WALL.WALL, `east boundary at ${width - 1},${y}`);
    for (let x = 0; x < width; x++) {
      const cell = cells[y][x];
      for (const side of ['n', 'e', 's', 'w']) {
        assert.ok([WALL.OPEN, WALL.WALL, WALL.DOOR].includes(cell[side]), `invalid wall at ${x},${y} ${side}`);
      }
      if (x + 1 < width) assert.equal(cell.e, cells[y][x + 1].w, `east/west agreement at ${x},${y}`);
      if (y + 1 < height) assert.equal(cell.s, cells[y + 1][x].n, `south/north agreement at ${x},${y}`);
    }
  }

  const steps = [
    { side: 'n', dx: 0, dy: -1 },
    { side: 'e', dx: 1, dy: 0 },
    { side: 's', dx: 0, dy: 1 },
    { side: 'w', dx: -1, dy: 0 },
  ];
  const pending = [{ x: start.x, y: start.y }];
  const reached = new Set([`${start.x},${start.y}`]);
  for (let index = 0; index < pending.length; index++) {
    const { x, y } = pending[index];
    for (const { side, dx, dy } of steps) {
      if (cells[y][x][side] === WALL.WALL) continue;
      const nx = x + dx;
      const ny = y + dy;
      assert.ok(nx >= 0 && nx < width && ny >= 0 && ny < height, `path leaves dungeon at ${x},${y} ${side}`);
      const key = `${nx},${ny}`;
      if (!reached.has(key)) {
        reached.add(key);
        pending.push({ x: nx, y: ny });
      }
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      assert.ok(reached.has(`${x},${y}`), `unreachable interior cell at ${x},${y}`);
    }
  }
}

test('a seed reproduces each environment and different seeds change its layout', () => {
  for (const { id: environment } of ENVIRONMENTS) {
    const options = { width: 20, height: 16, seed: 'bt3', environment };
    assert.deepEqual(buildDungeon(options), buildDungeon(options));
    const layouts = ['bt3', 'stone', 'torch', 'bard'].map(seed =>
      JSON.stringify(buildDungeon({ ...options, seed }).cells));
    assert.equal(new Set(layouts).size, layouts.length, `${environment} layout changes with its seed`);
  }
});

test('all environments have sealed boundaries, reciprocal walls, and connected interiors', async t => {
  const sizes = [
    { name: 'default', options: {} },
    { name: 'smallest', options: { width: 8, height: 8 } },
    { name: 'narrow', options: { width: 8, height: 32 } },
    { name: 'short', options: { width: 48, height: 8 } },
  ];
  for (const { id: environment } of ENVIRONMENTS) for (const { name, options } of sizes) {
    const seeds = name === 'default'
      ? ['bt3', 'stone', 'torch', 'bard', 'dungeon', 'maze', 'dragon', 'door', 'room', 'winter']
      : ['bt3', 'stone', 'torch', 'bard'];
    for (const seed of seeds) {
      await t.test(`${environment}, ${name}, seed ${seed}`, () => {
        assertValidDungeon(buildDungeon({ ...options, seed, environment }));
      });
    }
  }
});

test('village houses have varied rooflines and an accessible doorway onto open streets', () => {
  const dungeon = buildDungeon({ environment: 'village', seed: 'market-square' });
  const styles = new Set();
  const heights = new Set();
  const ids = new Set();
  for (let y = 0; y < dungeon.height; y++) for (let x = 0; x < dungeon.width; x++) {
    const { building } = dungeon.cells[y][x];
    if (!building) continue;
    assert.ok(!ids.has(building.id), 'each house has a stable unique identity');
    ids.add(building.id);
    styles.add(building.style);
    heights.add(building.stories);
    const entrances = [DIR.N, DIR.E, DIR.S, DIR.W].filter(direction =>
      getWall(dungeon.cells, dungeon.width, dungeon.height, x, y, direction) === WALL.DOOR);
    assert.ok(entrances.length > 0, `${building.id} must be enterable`);
    for (const direction of [DIR.N, DIR.E, DIR.S, DIR.W]) {
      const neighbor = dungeon.cells[y + DY[direction]][x + DX[direction]];
      assert.equal(neighbor.building, null, 'houses leave a street between neighboring facades');
      if (!entrances.includes(direction)) {
        assert.equal(getWall(dungeon.cells, dungeon.width, dungeon.height, x, y, direction), WALL.WALL,
          'a facade without a doorway closes movement through that edge');
      }
    }
  }
  assert.equal(styles.size, 4, 'the village mixes timber, plaster, brick, and stone facades');
  assert.deepEqual([...heights].sort(), [1, 2, 3]);
  const { x, y, dir } = dungeon.start;
  assert.equal(dungeon.cells[y][x].building, null, 'the player begins on a street');
  assert.equal(getWall(dungeon.cells, dungeon.width, dungeon.height, x, y, dir), WALL.OPEN);
  assert.equal(dungeon.cells[y + DY[dir]][x + DX[dir]].building, null,
    'the starting square gives the camera room to see exterior facades');
  let distance = 1;
  while (distance < 5 && !dungeon.cells[y + DY[dir] * distance][x + DX[dir] * distance].building) distance++;
  const houseX = x + DX[dir] * distance, houseY = y + DY[dir] * distance;
  assert.ok(dungeon.cells[houseY][houseX].building, 'an enterable house faces the starting square');
  assert.equal(getWall(dungeon.cells, dungeon.width, dungeon.height, houseX, houseY, (dir + 2) % 4), WALL.DOOR);
});

test('outdoor clearings and caverns open up the maze while invalid environment IDs are rejected', () => {
  const openness = environment => {
    const { width, height, cells } = buildDungeon({ environment, seed: 'landforms', width: 32, height: 24 });
    let passages = 0;
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      passages += Number(cells[y][x].e !== WALL.WALL) + Number(cells[y][x].s !== WALL.WALL);
    }
    return passages / ((width - 2) * (height - 2) * 2);
  };
  assert.ok(openness('forest') > 0.9, 'woodland movement uses open clearings');
  assert.ok(openness('village') > 0.65, 'the village has open streets between houses');
  assert.ok(openness('cave') > openness('dungeon') + 0.1, 'cave chambers are broader than dungeon passages');
  assert.throws(() => buildDungeon({ environment: 'unknown-place' }), /Unknown environment/);
});

test('dimensions produce integer grids bounded from 8 to 128', () => {
  const cases = [
    { options: {}, width: 48, height: 32 },
    { options: { width: 2, height: -1 }, width: 8, height: 8 },
    { options: { width: 512, height: 129 }, width: 128, height: 128 },
    { options: { width: 8.9, height: 12.4 }, width: 8, height: 12 },
  ];
  for (const { options, width, height } of cases) {
    const dungeon = buildDungeon({ ...options, seed: 'bt3' });
    assert.equal(dungeon.width, width);
    assert.equal(dungeon.height, height);
    assert.equal(dungeon.cells.length, height);
    assert.ok(dungeon.cells.every(row => row.length === width));
  }
});
