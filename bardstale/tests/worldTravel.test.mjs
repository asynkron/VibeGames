import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorldJourney } from '../src/worldTravel.js';
import { ENVIRONMENTS } from '../src/environments.js';
import { DIR, DX, DY, WALL, getWall } from '../src/dungeon.js';

function walkingDistances(area) {
  const pending = [{ x: area.start.x, y: area.start.y, distance: 0 }];
  const distances = new Map([[`${area.start.x},${area.start.y}`, 0]]);
  for (let index = 0; index < pending.length; index++) {
    const { x, y, distance } = pending[index];
    for (const direction of [DIR.N, DIR.E, DIR.S, DIR.W]) {
      if (getWall(area.cells, area.width, area.height, x, y, direction) === WALL.WALL) continue;
      const nx = x + DX[direction], ny = y + DY[direction];
      const key = `${nx},${ny}`;
      if (distances.has(key)) continue;
      distances.set(key, distance + 1);
      pending.push({ x: nx, y: ny, distance: distance + 1 });
    }
  }
  return distances;
}

test('connected areas have distinct reachable exits and reciprocal, unobstructed arrivals', () => {
  for (const size of [8, 32]) for (const seed of ['bt3', 'crossroads', 'long-road']) {
    const journey = createWorldJourney({ width: size, height: size, seed });
    const reachableAreas = new Set(['dungeon']);
    const pending = ['dungeon'];
    for (let index = 0; index < pending.length; index++) {
      const id = pending[index];
      const area = journey.areaFor(id);
      const distances = walkingDistances(area);
      assert.equal(area.exits.length, 2);
      assert.equal(new Set(area.exits.map(exit => `${exit.x},${exit.y}`)).size, 2);
      for (const exit of area.exits) {
        const distance = distances.get(`${exit.x},${exit.y}`);
        assert.ok(distance >= 2 && distance <= 5, `${id} exits are a short walk from its entrance`);
        assert.equal(area.cells[exit.y][exit.x].building, null, 'an area exit does not occupy a house');
        assert.ok(!area.objects.some(object => Math.floor(object.x / 3) === exit.x && Math.floor(object.y / 3) === exit.y),
          'exit tiles have space for the arriving party');
        const destination = journey.areaFor(exit.target);
        const returnExit = destination.exits.find(entry => entry.target === id);
        assert.ok(returnExit, 'every route can be traversed in both directions');
        const arrival = journey.arrivalFor(id, exit.target);
        assert.equal(arrival.x, returnExit.x);
        assert.equal(arrival.y, returnExit.y);
        assert.notEqual(getWall(destination.cells, destination.width, destination.height, arrival.x, arrival.y, arrival.dir), WALL.WALL,
          'arrival faces a passage into the destination');
        if (!reachableAreas.has(exit.target)) {
          reachableAreas.add(exit.target);
          pending.push(exit.target);
        }
      }
    }
    assert.equal(reachableAreas.size, ENVIRONMENTS.length, 'all environments belong to one connected world');
  }
});

test('revisiting an area retains its discoveries, position, and altered objects', () => {
  const journey = createWorldJourney({ environment: 'forest', seed: 'remember-the-road' });
  const forest = journey.initialArea;
  forest.cells[forest.start.y][forest.start.x].visited = true;
  forest.x += 1;
  const movedX = forest.x;
  const removedObject = forest.objects.pop();
  journey.areaFor('village');
  journey.areaFor('dungeon');
  journey.areaFor('cave');
  const returned = journey.areaFor('forest');
  assert.equal(returned, forest, 'revisiting does not regenerate the map');
  assert.equal(returned.x, movedX);
  assert.equal(returned.cells[forest.start.y][forest.start.x].visited, true);
  assert.ok(!returned.objects.includes(removedObject));
  const fresh = createWorldJourney({ environment: 'forest', seed: 'remember-the-road' }).initialArea;
  assert.deepEqual(fresh.exits, forest.exits, 'exit locations reproduce from the world seed');
  assert.equal(fresh.objects.length, forest.objects.length + 1, 'separate journeys own separate area state');
  assert.throws(() => journey.connectionFor('forest', 'dungeon'), /No route/);
  assert.throws(() => journey.areaFor('unknown-place'), /Unknown environment/);
});
