import assert from 'node:assert/strict';
import test from 'node:test';
import { defineVoxelBlock, createCharacterRecipe, assembleVoxelCharacter } from '../src/render/voxelBlocks.js';
import { assembleCharacterParts, VOXEL_APPEARANCE_OPTIONS, VOXEL_PARTS } from '../src/render/voxelCharacterParts.js';

const cell = (x, y, z, color = '#d7946b', material = 'skin') => ({ x, y, z, color, material });
const asset = (id, voxels) => defineVoxelBlock({ id, name: id, voxels });

test('27 solid reusable blocks fill exactly the 24 by 24 by 24 character volume', () => {
  const voxels = [];
  const placements = [];
  for (let z = 0; z < 8; z++) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) voxels.push(cell(x, y, z));
  for (let z = 0; z < 3; z++) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) placements.push({ x, y, z, blockId: 'solid' });
  const result = assembleVoxelCharacter(createCharacterRecipe({ id: 'cube', placements }), new Map([['solid', asset('solid', voxels)]]));
  assert.deepEqual(result.dimensions, { width: 24, height: 24, depth: 24 });
  assert.equal(result.occupiedBlockCount, 27);
  assert.equal(result.voxels.length, 13824);
  const occupied = new Set(result.voxels.map(({ x, y, z }) => `${x},${y},${z}`));
  assert.equal(occupied.size, 13824);
  assert.ok(occupied.has('0,0,0'));
  assert.ok(occupied.has('23,23,23'));
  assert.ok(result.voxels.every(({ x, y, z }) => [x, y, z].every(n => Number.isInteger(n) && n >= 0 && n < 24)));
});

test('sparse block placement preserves local colors and materials at literal world coordinates', () => {
  const block = asset('corners', [cell(0, 0, 0), cell(7, 6, 5, '#95b4c5', 'steel')]);
  const recipe = createCharacterRecipe({ id: 'sparse', placements: [{ x: 2, y: 1, z: 2, blockId: block.id }] });
  const result = assembleVoxelCharacter(recipe, new Map([[block.id, block]]));
  assert.equal(result.slots.length, 27);
  assert.deepEqual(result.slots[23], { x: 2, y: 1, z: 2, blockId: 'corners' });
  assert.equal(result.slots.filter(slot => slot.blockId === null).length, 26);
  assert.equal(result.occupiedBlockCount, 1);
  assert.deepEqual(result.voxels, [
    { x: 16, y: 8, z: 16, color: '#d7946b', material: 'skin', blockId: 'corners', blockX: 2, blockY: 1, blockZ: 2 },
    { x: 23, y: 14, z: 21, color: '#95b4c5', material: 'steel', blockId: 'corners', blockX: 2, blockY: 1, blockZ: 2 },
  ]);
});

test('shared assets can be used in multiple slots and recipes without mutable aliases', () => {
  const source = [cell(1, 2, 3)];
  const block = asset('shared', source);
  source[0].x = 7;
  const placement = { x: 0, y: 0, z: 0, blockId: 'shared' };
  const recipe = createCharacterRecipe({ id: 'pair', placements: [placement, { x: 2, y: 0, z: 0, blockId: 'shared' }] });
  placement.x = 1;
  const library = new Map([['shared', block]]);
  const pair = assembleVoxelCharacter(recipe, library);
  const elevated = assembleVoxelCharacter(createCharacterRecipe({ id: 'upper', placements: [{ x: 0, y: 2, z: 0, blockId: 'shared' }] }), library);
  assert.deepEqual(pair.voxels.map(({ x, y, z }) => [x, y, z]), [[1, 2, 3], [17, 2, 3]]);
  assert.deepEqual(elevated.voxels.map(({ x, y, z }) => [x, y, z]), [[1, 18, 3]]);
  assert.throws(() => { block.voxels[0].x = 4; }, TypeError);
  assert.throws(() => { recipe.slots[0].blockId = null; }, TypeError);
  assert.deepEqual(block.voxels, [cell(1, 2, 3)]);
  assert.equal(recipe.slots[0].x, 0);
});

const partDomains = {
  head: [[1, 2, 1]],
  torso: [[1, 1, 1]],
  arms: [[0, 1, 1], [2, 1, 1]],
  legs: [[1, 0, 1]],
  weapon: [[0, 1, 2], [0, 2, 2]],
  shield: [[2, 1, 2]],
};
const slotKey = ({ x, y, z }) => `${x},${y},${z}`;
const visibleCells = voxels => voxels.map(({ x, y, z, color, material }) => ({ x, y, z, color, material }));
const mixedAppearance = Object.fromEntries(Object.entries(VOXEL_APPEARANCE_OPTIONS)
  .map(([part, variants], index) => [part, variants[(index + 1) % variants.length].value]));

for (const [part, first, second] of [
  ['head', 'plumed', 'knight'],
  ['torso', 'teal', 'crimson'],
  ['arms', 'plate', 'leather'],
  ['legs', 'armored', 'ranger'],
  ['weapon', 'flail', 'sword'],
  ['shield', 'none', 'kite'],
]) {
  test(`${part} choices visibly replace only their own complete blocks`, () => {
    const domain = new Set(partDomains[part].map(slot => slot.join(',')));
    const inPart = ({ x, y, z }) => domain.has([x, y, z].map(value => Math.floor(value / 8)).join(','));
    const reference = assembleCharacterParts({ ...mixedAppearance, [part]: first }).assembly;
    const requested = assembleCharacterParts({ ...mixedAppearance, [part]: second }).assembly;
    assert.notDeepEqual(visibleCells(requested.voxels.filter(inPart)), visibleCells(reference.voxels.filter(inPart)), `${part} must visibly change when its selection changes.`);
    for (const { value } of VOXEL_APPEARANCE_OPTIONS[part]) {
      const { recipe, assembly } = assembleCharacterParts({ ...mixedAppearance, [part]: value });
      assert.deepEqual(assembly.dimensions, { width: 24, height: 24, depth: 24 });
      assert.equal(new Set(recipe.slots.map(slotKey)).size, 27);
      assert.ok(assembly.voxels.every(({ x, y, z }) => [x, y, z].every(n => Number.isInteger(n) && n >= 0 && n < 24)));
      assert.equal(new Set(assembly.voxels.map(slotKey)).size, assembly.voxels.length);
      const placements = VOXEL_PARTS[part][value];
      assert.ok(placements.every(slot => domain.has(slotKey(slot))), `${part}/${value} must not contain another part's block.`);
      const changedSlots = assembly.slots.filter((slot, index) => slot.blockId !== reference.slots[index].blockId);
      assert.ok(changedSlots.every(slot => domain.has(slotKey(slot))), `${part}/${value} must leave unrelated block references unchanged.`);
      assert.deepEqual(assembly.voxels.filter(voxel => !inPart(voxel)), reference.voxels.filter(voxel => !inPart(voxel)), `${part}/${value} must leave all unrelated voxels unchanged.`);
      if (value === 'none') {
        assert.equal(placements.length, 0, `${part}/none must leave its slots empty.`);
        assert.equal(assembly.voxels.filter(inPart).length, 0);
      } else {
        assert.ok(placements.length > 0, `${part}/${value} must have visible blocks.`);
        if (part === 'arms') assert.equal(placements.length, 2, 'Both complete arm blocks must be present.');
      }
    }
  });
}

test('helmet variants enclose the head with armor rather than exposed skin', () => {
  for (const head of ['plumed', 'knight']) {
    const { assembly } = assembleCharacterParts({ head });
    const headVoxels = assembly.voxels.filter(({ blockX, blockY, blockZ }) => blockX === 1 && blockY === 2 && blockZ === 1);
    assert.ok(headVoxels.some(voxel => voxel.material === 'steel'), `${head} must contain metal armor.`);
    assert.equal(headVoxels.filter(voxel => voxel.material === 'skin').length, 0, `${head} must cover the face, ears, and neck.`);
  }
});

test('invalid cells, placements, and unresolved references are rejected at their boundary', async t => {
  for (const [name, voxels, message] of [
    ['duplicate cell', [cell(1, 2, 3), cell(1, 2, 3)], /Duplicate voxel/],
    ['negative coordinate', [cell(-1, 2, 3)], /Voxel.x/],
    ['outside cube', [cell(1, 8, 3)], /Voxel.y/],
    ['fractional coordinate', [cell(1, 2, 3.5)], /Voxel.z/],
    ['invalid color', [cell(1, 2, 3, 'red')], /color/],
    ['missing material', [{ x: 1, y: 2, z: 3, color: '#ffffff' }], /material/],
  ]) await t.test(name, () => assert.throws(() => asset('bad', voxels), message));
  const slot = { x: 1, y: 2, z: 1, blockId: 'head' };
  assert.throws(() => createCharacterRecipe({ id: 'bad', placements: [slot, slot] }), /Duplicate block slot/);
  assert.throws(() => createCharacterRecipe({ id: 'bad', placements: [{ ...slot, z: 3 }] }), /Block slot.z/);
  const recipe = createCharacterRecipe({ id: 'unknown', placements: [slot] });
  assert.throws(() => assembleVoxelCharacter(recipe, new Map()), /Unknown block: head/);
  assert.throws(() => assembleVoxelCharacter({ ...recipe, slots: recipe.slots.slice(1) }, new Map()), /27 slots/);
  const reversed = [...recipe.slots].reverse();
  assert.throws(() => assembleVoxelCharacter({ ...recipe, slots: reversed }, new Map()), /canonical coordinate order/);
});
