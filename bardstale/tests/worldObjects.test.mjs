import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDungeon, DIR, WALL, getWall } from '../src/dungeon.js';
import { OBJECT_DEFINITIONS } from '../src/worldObjects.js';
import { assembleVoxelObjectModel } from '../src/render/voxelObjectCatalog.js';
import { VOXEL_MATERIALS } from '../src/render/voxelCharacterParts.js';
import { createBattlefield } from '../src/systems/battlefield.js';

test('furnished dungeons preserve walking routes and connected large-creature passages', () => {
  for (const options of [{}, { width: 8, height: 8 }, { width: 128, height: 128 }]) {
    for (const seed of ['bt3', 'furniture', 'dragon']) {
      const dungeon = buildDungeon({ ...options, seed });
      const occupied = new Set();
      const ids = new Set();
      assert.ok(dungeon.objects.length > 0);
      for (const object of dungeon.objects) {
        const { x, y, id, kind, rotation } = object;
        assert.ok(Number.isInteger(x) && Number.isInteger(y));
        assert.ok(x >= 3 && x < (dungeon.width - 1) * 3);
        assert.ok(y >= 3 && y < (dungeon.height - 1) * 3);
        assert.ok(Object.hasOwn(OBJECT_DEFINITIONS, kind));
        assert.ok(Number.isInteger(rotation) && rotation >= 0 && rotation < 4);
        assert.ok(!occupied.has(`${x},${y}`), 'one object per combat cell');
        assert.ok(!ids.has(id), 'stable unique object IDs');
        occupied.add(`${x},${y}`);
        ids.add(id);
        assert.notEqual(x % 3, 1, 'leave the north/south walking lane clear');
        assert.notEqual(y % 3, 1, 'leave the east/west walking lane clear');
      }
      for (let my = 1; my < dungeon.height - 1; my++) for (let mx = 1; mx < dungeon.width - 1; mx++) {
        const fits = [0, 1].some(dx => [0, 1].some(dy =>
          [0, 1].every(x => [0, 1].every(y => !occupied.has(`${mx * 3 + dx + x},${my * 3 + dy + y}`)))));
        assert.ok(fits, `2x2 creature must fit in tile ${mx},${my}`);
        for (const direction of [DIR.E, DIR.S]) {
          if (getWall(dungeon.cells, dungeon.width, dungeon.height, mx, my, direction) === WALL.WALL) continue;
          const hasPassage = [0, 1].some(offset => [0, 1].every(side => [0, 1].every(across => {
            const x = mx * 3 + (direction === DIR.E ? 2 + side : offset + across);
            const y = my * 3 + (direction === DIR.S ? 2 + side : offset + across);
            return !occupied.has(`${x},${y}`);
          })));
          assert.ok(hasPassage, `2x2 creature must cross the ${direction === DIR.E ? 'east' : 'south'} opening at ${mx},${my}`);
        }
      }
    }
  }
});

test('a dragon can approach the party through a furnished starting area', () => {
  const dungeon = buildDungeon({ width: 8, height: 8, seed: 'furniture-review-25' });
  const battlefield = createBattlefield({ ...dungeon, ...dungeon.start },
    [{ id: 'hero', alive: true }], [{ id: 'dragon', alive: true, footprint: { width: 2, height: 2 } }]);
  const path = battlefield.pathToAdjacent('dragon', 'hero');
  if (path.length) {
    const destination = path.at(-1);
    assert.equal(battlefield.move('dragon', destination.x, destination.y, path.length).moved, true);
  }
  assert.equal(battlefield.canTarget('dragon', 'hero', { range: 1, melee: true }), true,
    'furniture must not seal the party away from a large monster');
});

test('every placeable object has grounded geometry that fits its combat cell at character voxel size', () => {
  for (const kind of Object.keys(OBJECT_DEFINITIONS)) {
    const model = assembleVoxelObjectModel(kind);
    const voxels = model.assembly.voxels;
    assert.ok(voxels.length > 0, `${kind} must render`);
    const bounds = model.assembly.bounds;
    assert.equal(bounds.min.y, 0, `${kind} rests on the floor`);
    // The renderer uses .04 voxels per combat-cell width, so 25 voxels fill a cell.
    assert.ok(bounds.max.x - bounds.min.x <= 25, `${kind} extends into a neighboring cell`);
    assert.ok(bounds.max.z - bounds.min.z <= 25, `${kind} extends into a neighboring cell`);
    assert.ok(bounds.max.y < 75, `${kind} clips through the dungeon ceiling`);
    for (const voxel of voxels) assert.ok(Object.hasOwn(VOXEL_MATERIALS, voxel.material));
    if (OBJECT_DEFINITIONS[kind].light) {
      assert.ok(model.lightAnchor.every(Number.isFinite), `${kind} has a light position`);
      assert.ok(model.lightAnchor[1] > 0 && model.lightAnchor[1] <= bounds.max.y);
    }
  }
});
