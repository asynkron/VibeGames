import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorldJourney } from '../src/worldTravel.js';
import { DIR, WALL, getWall } from '../src/dungeon.js';

test('the party arrives at New Phlan harbor and can follow reciprocal routes into the ruined city and keep', () => {
  const journey = createWorldJourney();
  const city = journey.initialArea;
  assert.equal(city.id, 'new-phlan');
  assert.equal(city.name, 'New Phlan');
  assert.equal(city.encounters, null, 'the home city is safe for a new party');
  assert.ok(city.cells.every(row => row.every(cell => cell.visited)), 'the city map is known so a new party can find services');
  const temple = city.services.find(service => service.id === 'temple-tyr');
  assert.equal(city.cells[city.y][city.x].terrain, 'dock', 'the first view is from the harbor');
  assert.deepEqual(city.templeSpawn, { x: temple.x, y: temple.y, dir: DIR.W });
  assert.equal(getWall(city.cells, city.width, city.height, temple.x, temple.y, city.templeSpawn.dir), WALL.DOOR,
    'resurrected parties face out through Tyr’s temple door');

  const pending = ['new-phlan'];
  const reached = new Set(pending);
  const biomes = new Set();
  for (let index = 0; index < pending.length; index++) {
    const area = journey.areaFor(pending[index]);
    biomes.add(area.environment);
    if (area.id !== 'new-phlan') {
      assert.ok(area.encounters.tier <= 2 && area.encounters.maxEnemies <= 4, 'connected adventures begin at novice difficulty');
      assert.ok(area.encounters.monsterArea, 'encounters draw on the source location’s monster records');
      assert.equal(area.templeSpawn, null);
    }
    assert.equal(new Set(area.exits.map(exit => `${exit.x},${exit.y}`)).size, area.exits.length);
    for (const exit of area.exits) {
      const destination = journey.areaFor(exit.target);
      assert.equal(exit.name, destination.name, 'signs name the destination area rather than its biome');
      const entrance = journey.connectionFor(exit.target, area.id);
      const arrival = journey.arrivalFor(area.id, exit.target);
      assert.deepEqual(arrival, { x: entrance.x, y: entrance.y, dir: entrance.dir });
      assert.notEqual(getWall(destination.cells, destination.width, destination.height, arrival.x, arrival.y, arrival.dir), WALL.WALL,
        'arrival looks toward an accessible destination passage');
      assert.ok(!destination.objects.some(object => Math.floor(object.x / 3) === arrival.x && Math.floor(object.y / 3) === arrival.y),
        'arriving parties have a clear entrance tile');
      if (!reached.has(exit.target)) { reached.add(exit.target); pending.push(exit.target); }
    }
  }
  assert.equal(reached.size, 5, 'the starting city connects to four distinct adventures');
  assert.equal(biomes.size, 4, 'the route network includes streets, woodland, catacombs, and a stone keep');
  assert.equal(journey.connectionFor('new-phlan', 'moonsea-wilderness').requiredQuest, 'sokal-keep',
    'harbor travel waits for the haunting to be resolved');
  assert.throws(() => journey.connectionFor('new-phlan', 'kutos-well'), /No route/);
  assert.throws(() => journey.areaFor('unknown-place'), /Unknown world area/);
});

test('revisits and temple return retain the same world state, while a new journey starts fresh', () => {
  const journey = createWorldJourney();
  const forest = journey.areaFor('slums');
  const visited = forest.cells[forest.y][forest.x];
  visited.visited = true;
  forest.x -= 1;
  const movedX = forest.x;
  const removedObject = forest.objects.pop();
  journey.areaFor('kutos-well');
  journey.areaFor('sokal-keep');
  const returned = journey.areaFor('slums');
  assert.equal(returned, forest);
  assert.equal(returned.x, movedX);
  assert.equal(returned.cells[forest.start.y][forest.start.x].visited, true);
  assert.ok(!returned.objects.includes(removedObject));
  const city = journey.initialArea;
  city.cells[city.y][city.x].visited = true;
  const resurrection = journey.resurrectionSpawn();
  assert.equal(resurrection.area, city);
  assert.deepEqual(resurrection.position, city.templeSpawn);
  resurrection.position.x += 1;
  assert.equal(city.templeSpawn.x, city.services.find(service => service.id === 'temple-tyr').x,
    'a caller cannot move the saved resurrection point');
  const fresh = createWorldJourney().areaFor('slums');
  assert.ok(fresh.cells.every(row => row.every(cell => !cell.visited)), 'adventure maps still begin undiscovered');
  assert.equal(fresh.x, fresh.start.x);
  assert.equal(fresh.objects.length, forest.objects.length + 1);
  assert.deepEqual(fresh.exits, forest.exits, 'authored destinations are stable across journeys');
});
