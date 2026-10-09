import assert from 'node:assert/strict';
import test from 'node:test';
import { defineVoxelPart, createCharacterRecipe, assembleVoxelCharacter } from '../src/render/voxelParts.js';

const cell = (x, y, z, color = '#d7946b', material = 'skin') => ({ x, y, z, color, material });
const asset = (id, voxels) => defineVoxelPart({ id, name: id, voxels });

test('one unrestricted torso asset can represent an entire custom figure', () => {
  const body = asset('long-dragon', Array.from({ length: 600 }, (_, x) => cell(x - 300, -2, 31)));
  const recipe = createCharacterRecipe({ id: 'dragon', parts: { torso: { partId: body.id, offset: { x: 10, y: 7, z: -5 } } } });
  const result = assembleVoxelCharacter(recipe, new Map([[body.id, body]]));
  assert.equal(result.partCount, 1);
  assert.equal(result.voxels.length, 600);
  assert.deepEqual(body.bounds, { min: { x: -300, y: -2, z: 31 }, max: { x: 300, y: -1, z: 32 } });
  assert.deepEqual(result.bounds, { min: { x: -290, y: 5, z: 26 }, max: { x: 310, y: 6, z: 27 } });
  assert.deepEqual(result.dimensions, { width: 600, height: 1, depth: 1 });
  assert.deepEqual(result.parts.torso.bounds, result.bounds);
  assert.ok(Object.entries(result.parts).every(([slot, part]) => slot === 'torso' || part === null));
  assert.deepEqual(result.voxels[0], { ...cell(-290, 5, 26), slot: 'torso', partId: 'long-dragon' });
});

test('parts can be reused at different offsets without mutable aliases', () => {
  const source = [cell(-3, 8, 2), cell(1, 10, 4, '#95b4c5', 'steel')];
  const shared = asset('shared', source);
  const offset = { x: 40, y: -8, z: 6 };
  const recipe = createCharacterRecipe({ id: 'pair', parts: { head: { partId: 'shared' }, mainhand: { partId: 'shared', offset } } });
  source[0].x = 99;
  offset.x = 99;
  const result = assembleVoxelCharacter(recipe, new Map([['shared', shared]]));
  assert.deepEqual(result.voxels.map(({ x, y, z }) => [x, y, z]), [[-3, 8, 2], [1, 10, 4], [37, 0, 8], [41, 2, 10]]);
  assert.deepEqual(result.bounds, { min: { x: -3, y: 0, z: 2 }, max: { x: 42, y: 11, z: 11 } });
  assert.equal(result.parts.mainhand.voxels[1].color, '#95b4c5');
  assert.equal(result.parts.mainhand.voxels[1].material, 'steel');
  assert.throws(() => { shared.voxels[0].x = 4; }, TypeError);
  assert.throws(() => { recipe.parts.head.partId = 'other'; }, TypeError);
  assert.throws(() => { recipe.parts.mainhand.offset.x = 4; }, TypeError);
  assert.throws(() => { result.parts.head.bounds.min.x = 4; }, TypeError);
  assert.throws(() => { result.voxels[0].color = '#000000'; }, TypeError);
});

test('equipment covers shared cells predictably while underlying parts remain intact', () => {
  const body = asset('body', [cell(0, 0, 0), cell(0, 1, 0)]);
  const cape = asset('cape', [cell(0, 0, 0, '#cc0000', 'cloth')]);
  const item = asset('item', [cell(0, 0, 0, '#ffffff', 'steel')]);
  const library = new Map([body, cape, item].map(part => [part.id, part]));
  const recipe = createCharacterRecipe({ id: 'layered', parts: { mainhand: { partId: 'item' }, back: { partId: 'cape' }, torso: { partId: 'body' } } });
  const result = assembleVoxelCharacter(recipe, library);
  assert.equal(result.voxels.length, 2, 'A shared cell must produce one visible voxel.');
  assert.equal(result.voxels.find(voxel => voxel.y === 0).slot, 'mainhand');
  assert.equal(result.voxels.find(voxel => voxel.y === 0).material, 'steel');
  assert.equal(result.parts.torso.voxels.length, 2, 'The torso asset must remain whole for independent editing.');
  assert.equal(result.parts.back.voxels[0].color, '#cc0000');
  const unequipped = assembleVoxelCharacter(createCharacterRecipe({ id: 'unequipped', parts: { ...recipe.parts, mainhand: null } }), library);
  assert.equal(unequipped.voxels.find(voxel => voxel.y === 0).slot, 'back');
  assert.deepEqual(unequipped.parts.torso, result.parts.torso);
});

test('empty assets and empty characters have zero bounds', () => {
  const empty = asset('empty', []);
  const result = assembleVoxelCharacter(createCharacterRecipe({ id: 'empty' }), new Map());
  assert.equal(result.partCount, 0);
  assert.deepEqual(result.voxels, []);
  assert.deepEqual(result.bounds, { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } });
  assert.deepEqual(result.dimensions, { width: 0, height: 0, depth: 0 });
  assert.deepEqual(empty.bounds, result.bounds);
});

test('invalid cells, slot names, offsets, and unresolved references are rejected', async t => {
  for (const [name, voxels, message] of [
    ['duplicate cell', [cell(1, 2, 3), cell(1, 2, 3)], /Duplicate voxel/],
    ['fractional coordinate', [cell(1, 2, 3.5)], /Voxel.z/],
    ['unsafe coordinate', [cell(Number.MAX_SAFE_INTEGER + 1, 2, 3)], /Voxel.x/],
    ['nonfinite coordinate', [cell(1, Infinity, 3)], /Voxel.y/],
    ['invalid color', [cell(1, 2, 3, 'red')], /color/],
    ['missing material', [{ x: 1, y: 2, z: 3, color: '#ffffff' }], /material/],
  ]) await t.test(name, () => assert.throws(() => asset('bad', voxels), message));
  assert.throws(() => createCharacterRecipe({ id: 'bad', parts: { tail: { partId: 'tail' } } }), /Unknown part slot/);
  assert.throws(() => createCharacterRecipe({ id: 'bad', parts: { head: { partId: 'head', offset: { x: 0, y: 0.5, z: 0 } } } }), /head offset.y/);
  const recipe = createCharacterRecipe({ id: 'head', parts: { head: { partId: 'head' } } });
  assert.throws(() => assembleVoxelCharacter(recipe, new Map()), /Unknown part: head/);
  assert.throws(() => assembleVoxelCharacter(recipe, new Map([['head', asset('other', [])]])), /does not match reference/);
  const overflow = createCharacterRecipe({ id: 'overflow', parts: { head: { partId: 'head', offset: { x: Number.MAX_SAFE_INTEGER, y: 0, z: 0 } } } });
  assert.throws(() => assembleVoxelCharacter(overflow, new Map([['head', asset('head', [cell(1, 0, 0)])]])), /translated voxel.x/);
});
