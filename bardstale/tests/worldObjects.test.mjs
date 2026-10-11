import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDungeon, DIR, DX, DY, WALL, getWall } from '../src/dungeon.js';
import { OBJECT_DEFINITIONS } from '../src/worldObjects.js';
import { assembleVoxelObjectModel } from '../src/render/voxelObjectCatalog.js';
import { VOXEL_MATERIALS } from '../src/render/voxelCharacterParts.js';
import { createBattlefield } from '../src/systems/battlefield.js';
import { ENVIRONMENTS } from '../src/environments.js';

test('objects in every environment preserve walking routes and connected large-creature passages', () => {
  for (const { id: environment } of ENVIRONMENTS) for (const options of [{}, { width: 8, height: 8 }, { width: 128, height: 128 }]) {
    for (const seed of ['bt3', 'furniture', 'dragon']) {
      const dungeon = buildDungeon({ ...options, seed, environment });
      const occupied = new Set();
      const positions = new Set();
      const ids = new Set();
      assert.ok(dungeon.objects.length > 0);
      for (const object of dungeon.objects) {
        const { x, y, id, kind, rotation } = object;
        assert.ok(Number.isInteger(x) && Number.isInteger(y));
        assert.ok(x >= 3 && x < (dungeon.width - 1) * 3);
        assert.ok(y >= 3 && y < (dungeon.height - 1) * 3);
        assert.ok(Object.hasOwn(OBJECT_DEFINITIONS, kind));
        assert.ok(Number.isInteger(rotation) && rotation >= 0 && rotation < 4);
        assert.ok(!positions.has(`${x},${y}`), 'one object per combat cell');
        assert.ok(!ids.has(id), 'stable unique object IDs');
        positions.add(`${x},${y}`);
        ids.add(id);
        if (OBJECT_DEFINITIONS[kind].blocksMovement) {
          occupied.add(`${x},${y}`);
          assert.notEqual(x % 3, 1, 'leave the north/south walking lane clear');
          assert.notEqual(y % 3, 1, 'leave the east/west walking lane clear');
        }
        if (OBJECT_DEFINITIONS[kind].mount === 'wall') {
          const mx = Math.floor(x / 3), my = Math.floor(y / 3);
          assert.ok(Number.isInteger(object.wall) && object.wall >= DIR.N && object.wall <= DIR.W);
          const nx = mx + DX[object.wall], ny = my + DY[object.wall];
          assert.equal(getWall(dungeon.cells, dungeon.width, dungeon.height, mx, my, object.wall), WALL.WALL,
            'wall fixtures need solid stone or a facade, never an opening or door');
          assert.ok(nx > 0 && ny > 0 && nx < dungeon.width - 1 && ny < dungeon.height - 1,
            'do not decorate the impassable world boundary');
          assert.equal(x % 3, 1 + DX[object.wall]);
          assert.equal(y % 3, 1 + DY[object.wall]);
          assert.notEqual(environment, 'forest', 'thickets cannot carry a wall fixture');
          if (environment === 'village') assert.ok(dungeon.cells[my][mx].building || dungeon.cells[ny][nx].building,
            'village fixtures attach to a house');
        }
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

test('combatants can walk beneath generated wall torches without crossing the wall', () => {
  for (const environment of ['dungeon', 'cave', 'village']) {
    const dungeon = buildDungeon({ width: 16, height: 16, seed: 'torch-movement', environment });
    const torch = dungeon.objects.find(({ kind }) => kind === 'wallTorch');
    assert.ok(torch, `${environment} should furnish suitable walls`);
    const battlefield = createBattlefield({ ...dungeon,
      x: Math.floor(torch.x / 3), y: Math.floor(torch.y / 3), dir: torch.wall,
    }, [{ id: 'hero', alive: true }], []);
    assert.deepEqual(battlefield.move('hero', torch.x, torch.y, 1), { moved: true, cost: 1 },
      'a raised torch must not consume the cell below it');
    const across = { x: torch.x + DX[torch.wall], y: torch.y + DY[torch.wall] };
    assert.equal(battlefield.canPlace('hero', across.x, across.y), true, 'the cell beyond the wall is vacant');
    assert.equal(battlefield.move('hero', across.x, across.y, 1).moved, false, 'the solid wall still blocks movement');
    const floorObject = dungeon.objects.find(({ kind }) => OBJECT_DEFINITIONS[kind].blocksMovement);
    assert.equal(battlefield.canPlace('hero', floorObject.x, floorObject.y), false, 'floor furniture still occupies its cell');
  }
});

test('a dragon can approach the party through each environment starting area', () => {
  for (const { id: environment } of ENVIRONMENTS) {
    const dungeon = buildDungeon({ width: 8, height: 8, seed: 'furniture-review-25', environment });
    const battlefield = createBattlefield({ ...dungeon, ...dungeon.start },
      [{ id: 'hero', alive: true }], [{ id: 'dragon', alive: true, footprint: { width: 2, height: 2 } }]);
    const path = battlefield.pathToAdjacent('dragon', 'hero');
    if (path.length) {
      const destination = path.at(-1);
      assert.equal(battlefield.move('dragon', destination.x, destination.y, path.length).moved, true);
    }
    assert.equal(battlefield.canTarget('dragon', 'hero', { range: 1, melee: true }), true,
      `${environment} objects must not seal the party away from a large monster`);
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
