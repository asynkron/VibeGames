import assert from 'node:assert/strict';
import test from 'node:test';
import { assembleMasonryModel } from '../src/render/voxelMasonryModels.js';
import { assembleLandscapeModel } from '../src/render/voxelLandscapeModels.js';
import { assembleBuildingModel, BUILDING_STYLES } from '../src/render/voxelBuildingModels.js';

function* doorwayModels() {
  for (let variant = 0; variant < 4; variant++) {
    yield { name: `dungeon ${variant}`, model: assembleMasonryModel('door', variant), arched: true };
    for (const environment of ['cave', 'forest', 'village']) {
      yield { name: `${environment} ${variant}`, model: assembleLandscapeModel(environment, 'door', variant), arched: environment === 'cave' };
    }
  }
  for (const style of BUILDING_STYLES) for (const stories of [1, 2, 3]) {
    yield { name: `${style} house ${stories} stories`, model: assembleBuildingModel('door', style, stories), arched: true };
  }
}

test('stone walls have continuous cores, real surface relief, and bounded thickness', () => {
  for (let variant = 0; variant < 4; variant++) {
    const wall = assembleMasonryModel('wall', variant);
    const columns = new Map();
    for (const { x, y, z } of wall.voxels) {
      assert.ok(x >= 0 && x < 75 && y >= 0 && y < 75);
      assert.ok(z >= -3 && z < 3, 'wall relief must fit beside furniture and fighters');
      const key = `${x},${y}`;
      columns.set(key, Math.max(columns.get(key) ?? -Infinity, z));
    }
    assert.equal(columns.size, 75 * 75, 'mortar must seal every stone joint');
    assert.ok(new Set(columns.values()).size >= 3, 'stone faces must project beyond recessed joints');
  }
});

test('floor slabs and ceiling coffers cover each tile with recessed three-dimensional joints', () => {
  for (let variant = 0; variant < 4; variant++) for (const kind of ['floor', 'ceiling']) {
    const model = assembleMasonryModel(kind, variant);
    const surface = new Map();
    for (const { x, y, z } of model.voxels) {
      assert.ok(x >= 0 && x < 75 && z >= 0 && z < 75);
      const key = `${x},${z}`;
      if (kind === 'floor') {
        assert.ok(y < 0, 'floor must stay below actors, furniture, and combat markers');
        surface.set(key, Math.max(surface.get(key) ?? -Infinity, y + 1));
      } else {
        assert.ok(y >= 0, 'ceiling ribs must not intrude into the room');
        surface.set(key, Math.min(surface.get(key) ?? Infinity, y));
      }
    }
    assert.equal(surface.size, 75 * 75, `${kind} must not have gaps through the tile`);
    assert.ok(new Set(surface.values()).size >= 3, `${kind} needs actual relief`);
    if (kind === 'floor') assert.equal(Math.max(...surface.values()), 0);
  }
});

test('all environment doorways keep every combat lane and tall-creature clearance open', () => {
  for (const { name, model, arched } of doorwayModels()) {
    assert.ok(model.voxels.some(v => v.x < 4 && v.y === 0), `${name}: left jamb reaches the floor`);
    assert.ok(model.voxels.some(v => v.x >= 71 && v.y === 0), `${name}: right jamb reaches the floor`);
    if (arched) assert.ok(model.voxels.some(v => v.x === 37 && v.y >= 70), `${name}: arch crown joins the jambs`);
    for (const { x, y, z } of model.voxels) {
      assert.ok(x < 4 || x >= 71 || y >= 60, `${name}: entrance must fit all three lanes and a double-height figure`);
      assert.ok(x >= 0 && x < 75 && z >= -5 && z < 5, `${name}: entrance must stay within the boundary's relief allowance`);
    }
  }
});

test('landscape and house floors support the whole tile without rising through actors', () => {
  const floors = [];
  for (const environment of ['cave', 'forest', 'village']) for (let variant = 0; variant < 4; variant++) {
    floors.push({ name: `${environment} ${variant}`, model: assembleLandscapeModel(environment, 'floor', variant) });
  }
  for (const style of BUILDING_STYLES) floors.push({ name: `${style} house`, model: assembleBuildingModel('floor', style) });
  for (const { name, model } of floors) {
    const supported = new Set();
    let highestSurface = -Infinity;
    for (const { x, y, z } of model.voxels) {
      assert.ok(x >= 0 && x < 75 && z >= 0 && z < 75, `${name}: floor must fit its tile`);
      assert.ok(y < 0, `${name}: relief must not obstruct the walking plane`);
      supported.add(`${x},${z}`);
      highestSurface = Math.max(highestSurface, y + 1);
    }
    assert.equal(supported.size, 75 * 75, `${name}: cracks and plank joints must retain support underneath`);
    assert.equal(highestSurface, 0, `${name}: actors and furniture rest on the same world plane`);
  }
});

test('building stories use full-size voxel geometry and keep roofs and ceilings inside their placement envelopes', () => {
  for (const style of BUILDING_STYLES) {
    for (const stories of [1, 2, 3]) {
      const wall = assembleBuildingModel('wall', style, stories);
      const facade = new Set();
      let bottom = Infinity, top = -Infinity;
      for (const { x, y, z } of wall.voxels) {
        assert.ok(x >= 0 && x < 75 && z >= -5 && z < 5, `${style}: facade detail must not obstruct neighboring cells`);
        bottom = Math.min(bottom, y);
        top = Math.max(top, y + 1);
        facade.add(`${x},${y}`);
      }
      assert.equal(bottom, 0, `${style}: every house is grounded`);
      assert.equal(top, stories * 75, `${style}: additional stories extend the model at the original voxel size`);
      assert.equal(facade.size, 75 * stories * 75, `${style}: recessed windows and joints must retain a closed facade`);
    }
    for (const kind of ['ceiling', 'roof']) {
      const model = assembleBuildingModel(kind, style);
      const overhang = kind === 'roof' ? 4 : 0;
      for (const { x, y, z } of model.voxels) {
        assert.ok(x >= -overhang && x < 75 + overhang && z >= -overhang && z < 75 + overhang, `${style} ${kind}: footprint must fit its placement allowance`);
        assert.ok(y >= 0 && y < 75, `${style} ${kind}: upper architecture must neither intrude below its origin nor span another story`);
      }
      assert.ok(model.voxels.length > 0, `${style}: ${kind} closes the house`);
    }
  }
});

test('natural boundaries and cavern ceilings stay clear of adjacent navigation space', () => {
  for (const environment of ['cave', 'forest', 'village']) for (let variant = 0; variant < 4; variant++) {
    const wall = assembleLandscapeModel(environment, 'wall', variant);
    for (const { x, y, z } of wall.voxels) {
      assert.ok(x >= 0 && x < 75 && y >= 0 && y < 75 && z >= -5 && z < 5, `${environment}: boundary must stay inside one room-height and its shallow relief allowance`);
    }
    if (environment === 'cave') {
      const supported = new Set();
      for (const { x, y, z } of assembleLandscapeModel(environment, 'ceiling', variant).voxels) {
        assert.ok(x >= 0 && x < 75 && z >= 0 && z < 75 && y >= 0, 'cavern roof and stalactites must stay above the room');
        supported.add(`${x},${z}`);
      }
      assert.equal(supported.size, 75 * 75, 'cavern ceiling must close every column of the tile');
    }
  }
});
