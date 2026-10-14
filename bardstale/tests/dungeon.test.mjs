import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorldJourney } from '../src/worldTravel.js';
import { DIR, DX, DY, WALL, getWall } from '../src/dungeon.js';

function connectedAreas(journey) {
  const pending = [journey.initialArea];
  const found = new Set([journey.initialArea.id]);
  for (let index = 0; index < pending.length; index++) for (const exit of pending[index].exits) {
    if (!found.has(exit.target)) { found.add(exit.target); pending.push(journey.areaFor(exit.target)); }
  }
  return pending;
}

test('authored maps have sealed boundaries, matching edges, and reachable paths to every service and exit', () => {
  for (const area of connectedAreas(createWorldJourney())) {
    const { width, height, cells, start } = area;
    assert.equal(cells.length, height);
    for (let x = 0; x < width; x++) {
      assert.equal(cells[0][x].n, WALL.WALL);
      assert.equal(cells[height - 1][x].s, WALL.WALL);
    }
    for (let y = 0; y < height; y++) {
      assert.equal(cells[y].length, width);
      assert.equal(cells[y][0].w, WALL.WALL);
      assert.equal(cells[y][width - 1].e, WALL.WALL);
      for (let x = 0; x < width; x++) {
        for (const side of ['n', 'e', 's', 'w']) assert.ok([WALL.OPEN, WALL.WALL, WALL.DOOR].includes(cells[y][x][side]));
        if (x + 1 < width) assert.equal(cells[y][x].e, cells[y][x + 1].w, `${area.id} east/west agreement at ${x},${y}`);
        if (y + 1 < height) assert.equal(cells[y][x].s, cells[y + 1][x].n, `${area.id} north/south agreement at ${x},${y}`);
      }
    }
    const pending = [{ x: start.x, y: start.y }];
    const reached = new Set([`${start.x},${start.y}`]);
    for (let index = 0; index < pending.length; index++) {
      const { x, y } = pending[index];
      for (const direction of [DIR.N, DIR.E, DIR.S, DIR.W]) {
        if (getWall(cells, width, height, x, y, direction) === WALL.WALL) continue;
        const nx = x + DX[direction], ny = y + DY[direction];
        assert.ok(nx > 0 && ny > 0 && nx < width - 1 && ny < height - 1, 'walking cannot leave the authored world');
        const key = `${nx},${ny}`;
        if (!reached.has(key)) { reached.add(key); pending.push({ x: nx, y: ny }); }
      }
    }
    for (const site of [...area.services, ...area.exits]) assert.ok(reached.has(`${site.x},${site.y}`), `${area.id} site ${site.id} is reachable`);
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      if (['n', 'e', 's', 'w'].some(side => cells[y][x][side] !== WALL.WALL)) {
        assert.ok(reached.has(`${x},${y}`), `${area.id} has no stranded passages at ${x},${y}`);
      }
    }
  }
});

test('New Phlan services occupy enterable buildings while the harbor and temple remain connected to the streets', () => {
  const city = createWorldJourney().initialArea;
  const styles = new Set(), heights = new Set(), ids = new Set();
  for (let y = 1; y < city.height - 1; y++) for (let x = 1; x < city.width - 1; x++) {
    const { building } = city.cells[y][x];
    if (!building) continue;
    assert.ok(!ids.has(building.id));
    ids.add(building.id); styles.add(building.style); heights.add(building.stories);
    const entrances = [DIR.N, DIR.E, DIR.S, DIR.W].filter(direction =>
      getWall(city.cells, city.width, city.height, x, y, direction) === WALL.DOOR);
    assert.equal(entrances.length, 1);
    for (const direction of [DIR.N, DIR.E, DIR.S, DIR.W]) {
      assert.equal(city.cells[y + DY[direction]][x + DX[direction]].building, null, 'each facade opens onto a street');
      assert.equal(getWall(city.cells, city.width, city.height, x, y, direction),
        entrances.includes(direction) ? WALL.DOOR : WALL.WALL);
    }
  }
  assert.equal(styles.size, 4);
  assert.deepEqual([...heights].sort(), [1, 2, 3]);
  for (const service of city.services) {
    if (service.type !== 'training') assert.ok(city.cells[service.y][service.x].building, `${service.name} has an indoor home`);
  }
  const temple = city.templeSpawn;
  assert.equal(city.cells[temple.y + DY[temple.dir]][temple.x + DX[temple.dir]].building, null,
    'the resurrection temple opens toward the plaza');
  assert.equal(city.cells[city.start.y][city.start.x].terrain, 'dock');
  assert.equal(city.cells[city.start.y][city.start.x + 1].terrain, 'dock', 'the pier extends toward the sea');
});
