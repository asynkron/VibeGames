import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorldJourney } from '../src/worldTravel.js';
import { DIR, DX, DY, WALL, getWall } from '../src/dungeon.js';
import { OBJECT_DEFINITIONS } from '../src/worldObjects.js';
import { assembleVoxelObjectModel } from '../src/render/voxelObjectCatalog.js';
import { VOXEL_MATERIALS } from '../src/render/voxelCharacterParts.js';
import { createBattlefield } from '../src/systems/battlefield.js';

function authoredAreas() {
  const journey = createWorldJourney();
  const pending = [journey.initialArea];
  const found = new Set([journey.initialArea.id]);
  for (let index = 0; index < pending.length; index++) for (const exit of pending[index].exits) {
    if (!found.has(exit.target)) { found.add(exit.target); pending.push(journey.areaFor(exit.target)); }
  }
  return pending;
}

test('authored props preserve walking lanes and connected passages for two-cell-wide creatures', () => {
  for (const area of authoredAreas()) {
    const occupied = new Set(), positions = new Set(), ids = new Set();
    assert.ok(area.objects.length > 0);
    for (const object of area.objects) {
      const { x, y, id, kind, rotation } = object;
      assert.ok(Number.isInteger(x) && Number.isInteger(y));
      assert.ok(x >= 3 && x < (area.width - 1) * 3 && y >= 3 && y < (area.height - 1) * 3);
      assert.ok(Object.hasOwn(OBJECT_DEFINITIONS, kind));
      assert.ok(Number.isInteger(rotation) && rotation >= 0 && rotation < 4);
      assert.ok(!positions.has(`${x},${y}`), 'one prop per combat cell');
      assert.ok(!ids.has(id), 'props have stable unique IDs');
      positions.add(`${x},${y}`); ids.add(id);
      if (OBJECT_DEFINITIONS[kind].blocksMovement) {
        occupied.add(`${x},${y}`);
        assert.notEqual(x % 3, 1, 'north/south walking stays clear');
        assert.notEqual(y % 3, 1, 'east/west walking stays clear');
      }
      const mx = Math.floor(x / 3), my = Math.floor(y / 3);
      assert.ok(['n', 'e', 's', 'w'].some(side => area.cells[my][mx][side] !== WALL.WALL), 'props belong to accessible map tiles');
      if (OBJECT_DEFINITIONS[kind].mount === 'wall') {
        assert.ok(Number.isInteger(object.wall) && object.wall >= DIR.N && object.wall <= DIR.W);
        assert.equal(getWall(area.cells, area.width, area.height, mx, my, object.wall), WALL.WALL, 'a torch attaches to a solid wall');
        assert.equal(x % 3, 1 + DX[object.wall]);
        assert.equal(y % 3, 1 + DY[object.wall]);
        assert.notEqual(area.environment, 'forest');
      }
    }
    for (let my = 1; my < area.height - 1; my++) for (let mx = 1; mx < area.width - 1; mx++) {
      if (['n', 'e', 's', 'w'].every(side => area.cells[my][mx][side] === WALL.WALL)) continue;
      const fits = [0, 1].some(dx => [0, 1].some(dy =>
        [0, 1].every(x => [0, 1].every(y => !occupied.has(`${mx * 3 + dx + x},${my * 3 + dy + y}`)))));
      assert.ok(fits, `${area.id} fits a large creature in tile ${mx},${my}`);
      for (const direction of [DIR.E, DIR.S]) {
        if (getWall(area.cells, area.width, area.height, mx, my, direction) === WALL.WALL) continue;
        const hasPassage = [0, 1].some(offset => [0, 1].every(side => [0, 1].every(across => {
          const x = mx * 3 + (direction === DIR.E ? 2 + side : offset + across);
          const y = my * 3 + (direction === DIR.S ? 2 + side : offset + across);
          return !occupied.has(`${x},${y}`);
        })));
        assert.ok(hasPassage, `${area.id} preserves a large-creature crossing at ${mx},${my}`);
      }
    }
  }
});

test('combatants walk under wall torches while walls and floor furniture retain collision', () => {
  for (const area of authoredAreas().filter(area => !['forest'].includes(area.environment))) {
    const torch = area.objects.find(({ kind }) => kind === 'wallTorch');
    assert.ok(torch, `${area.id} includes wall lights`);
    const battlefield = createBattlefield({ ...area, x: Math.floor(torch.x / 3), y: Math.floor(torch.y / 3), dir: torch.wall },
      [{ id: 'hero', alive: true }], []);
    assert.deepEqual(battlefield.move('hero', torch.x, torch.y, 1), { moved: true, cost: 1 });
    const across = { x: torch.x + DX[torch.wall], y: torch.y + DY[torch.wall] };
    assert.equal(battlefield.move('hero', across.x, across.y, 1).moved, false, 'the torch does not create a passage through its mounting wall');
    const floorObject = area.objects.find(({ kind }) => OBJECT_DEFINITIONS[kind].blocksMovement);
    assert.equal(battlefield.canPlace('hero', floorObject.x, floorObject.y), false);
  }
});

test('large creatures can approach the starting party through every authored area', () => {
  for (const area of authoredAreas()) {
    const battlefield = createBattlefield(area,
      [{ id: 'hero', alive: true }], [{ id: 'dragon', alive: true, footprint: { width: 2, height: 2 } }]);
    const path = battlefield.pathToAdjacent('dragon', 'hero');
    if (path.length) {
      const destination = path.at(-1);
      assert.equal(battlefield.move('dragon', destination.x, destination.y, path.length).moved, true);
    }
    assert.equal(battlefield.canTarget('dragon', 'hero', { range: 1, melee: true }), true,
      `${area.id} does not isolate its entrance from a large creature`);
  }
});

test('every placeable object fits its mount and combat-cell footprint at character voxel size', () => {
  for (const kind of Object.keys(OBJECT_DEFINITIONS)) {
    const model = assembleVoxelObjectModel(kind);
    const voxels = model.assembly.voxels;
    assert.ok(voxels.length > 0, `${kind} must render`);
    const bounds = model.assembly.bounds;
    assert.equal(bounds.min.y, 0, `${kind} has a consistent local mounting origin`);
    const { cutawayHeight, mountHeight = 0 } = OBJECT_DEFINITIONS[kind];
    // Crowns may overhang adjacent cells above the combat cutaway. Trunks,
    // roots, and ordinary furniture must fit their actual occupied cell.
    const groundVoxels = cutawayHeight ? voxels.filter(voxel => voxel.y < cutawayHeight) : voxels;
    for (const axis of ['x', 'z']) {
      const coordinates = groundVoxels.map(voxel => voxel[axis]);
      const extent = Math.max(...coordinates) - Math.min(...coordinates) + 1;
      assert.ok(extent <= 25, `${kind} blocks a neighboring combat cell at ground level`);
    }
    if (cutawayHeight) {
      assert.ok(cutawayHeight < bounds.max.y, `${kind} has a removable canopy`);
      assert.ok(bounds.max.y <= 110, `${kind} remains within the outdoor sightline budget`);
    } else {
      assert.ok(bounds.max.y + mountHeight < 75, `${kind} clips through the dungeon ceiling`);
    }
    for (const voxel of voxels) assert.ok(Object.hasOwn(VOXEL_MATERIALS, voxel.material));
    if (OBJECT_DEFINITIONS[kind].light) {
      assert.ok(model.lightAnchor.every(Number.isFinite), `${kind} has a light position`);
      assert.ok(model.lightAnchor[1] > 0);
      assert.ok(!voxels.some(voxel => [voxel.x, voxel.y, voxel.z].every((value, axis) => value === model.lightAnchor[axis])),
        `${kind} light must not be buried inside an opaque voxel`);
      const emitters = voxels.filter(voxel => VOXEL_MATERIALS[voxel.material].emissive);
      assert.ok(emitters.some(voxel => Math.hypot(voxel.x - model.lightAnchor[0], voxel.y - model.lightAnchor[1], voxel.z - model.lightAnchor[2]) < 8),
        `${kind} light must originate beside the visible flame`);
    }
  }
});
