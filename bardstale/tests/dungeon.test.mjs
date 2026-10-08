import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDungeon, WALL } from '../src/dungeon.js';

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

test('a seed reproduces the dungeon and different seeds change its layout', () => {
  const options = { width: 20, height: 16, seed: 'bt3' };
  assert.deepEqual(buildDungeon(options), buildDungeon(options));
  const layouts = ['bt3', 'stone', 'torch', 'bard'].map(seed =>
    JSON.stringify(buildDungeon({ ...options, seed }).cells));
  assert.equal(new Set(layouts).size, layouts.length);
});

test('generated dungeons have sealed boundaries, reciprocal walls, and connected interiors', async t => {
  const sizes = [
    { name: 'default', options: {} },
    { name: 'smallest', options: { width: 8, height: 8 } },
    { name: 'narrow', options: { width: 8, height: 32 } },
    { name: 'short', options: { width: 48, height: 8 } },
  ];
  for (const { name, options } of sizes) {
    const seeds = name === 'default'
      ? ['bt3', 'stone', 'torch', 'bard', 'dungeon', 'maze', 'dragon', 'door', 'room', 'winter']
      : ['bt3', 'stone', 'torch', 'bard'];
    for (const seed of seeds) {
      await t.test(`${name}, seed ${seed}`, () => {
        assertValidDungeon(buildDungeon({ ...options, seed }));
      });
    }
  }
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
