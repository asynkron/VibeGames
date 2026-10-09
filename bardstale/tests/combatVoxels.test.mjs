import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDungeon } from '../src/dungeon.js';
import { initBt3Systems } from '../src/systems/core.js';
import { assembleVoxelCharacter } from '../src/render/voxelBlocks.js';
import { COMBAT_VOXEL_KINDS, assembleCombatVoxelModel } from '../src/render/combatVoxelCatalog.js';

const position = ({ x, y, z }) => `${x},${y},${z}`;
const geometry = model => model.assembly.voxels.map(position).sort();
const inWeapon = ({ blockX, blockY, blockZ }) => blockX === 0 && blockY >= 1 && blockZ === 2;
const inShield = ({ blockX, blockY, blockZ }) => blockX === 2 && blockY === 1 && blockZ === 2;
const cellsIn = (model, predicate) => model.assembly.voxels.filter(predicate);
const extent = (model, axis) => {
  const values = model.assembly.voxels.map(voxel => voxel[axis]);
  return Math.max(...values) - Math.min(...values) + 1;
};

test('the complete combat catalog assembles volumetric figures from reusable 8-cube assets', () => {
  assert.equal(COMBAT_VOXEL_KINDS.length, 25);
  assert.equal(new Set(COMBAT_VOXEL_KINDS).size, COMBAT_VOXEL_KINDS.length);
  for (const kind of COMBAT_VOXEL_KINDS) {
    const model = assembleCombatVoxelModel({ kind });
    const { assembly, recipe, blocks, scale } = model;
    assert.deepEqual(assembly.dimensions, { width: 24, height: 24, depth: 24 }, kind);
    assert.equal(recipe.slots.length, 27, kind);
    assert.ok(assembly.voxels.length > 0, `${kind} must have visible geometry.`);
    assert.ok(scale > 0 && Number.isFinite(scale), `${kind} needs a finite world scale.`);
    assert.ok(extent(model, 'z') > 4, `${kind} must have actual depth.`);
    assert.ok(assembly.voxels.every(({ x, y, z }) => [x, y, z].every(value => Number.isInteger(value) && value >= 0 && value < 24)), kind);
    assert.equal(new Set(assembly.voxels.map(position)).size, assembly.voxels.length, `${kind} must not contain overlapping cells.`);
    for (const block of blocks.values()) {
      assert.ok(block.voxels.length <= 512, block.id);
      assert.ok(block.voxels.every(({ x, y, z }) => [x, y, z].every(value => Number.isInteger(value) && value >= 0 && value < 8)), block.id);
    }
    const restored = assembleVoxelCharacter(JSON.parse(JSON.stringify(recipe)), new Map(JSON.parse(JSON.stringify([...blocks]))));
    assert.deepEqual(restored.voxels, assembly.voxels, `${kind} must survive saving its recipe and block assets.`);
  }
});

test('creatures retain their own silhouettes and materials instead of wearing human bodies', () => {
  const warrior = assembleCombatVoxelModel({ kind: 'warrior' });
  const skeleton = assembleCombatVoxelModel({ kind: 'skeleton' });
  const serpent = assembleCombatVoxelModel({ kind: 'serpent' });
  const rats = assembleCombatVoxelModel({ kind: 'rat_swarm' });
  const elemental = assembleCombatVoxelModel({ kind: 'elemental' });
  const forms = [warrior, skeleton, serpent, rats, elemental].map(model => JSON.stringify(geometry(model)));
  assert.equal(new Set(forms).size, forms.length, 'Each anatomy must differ in occupied cells, beyond a color change.');
  assert.ok(skeleton.assembly.voxels.some(voxel => voxel.material === 'bone'));
  assert.ok(rats.assembly.voxels.some(voxel => voxel.material === 'fur'));
  assert.ok(extent(rats, 'y') <= 8, 'Rats must stay close to the ground.');
  assert.ok(extent(rats, 'x') >= 16, 'The swarm must spread across the ground.');
  assert.ok(serpent.assembly.voxels.some(voxel => voxel.y >= 15), 'The serpent must raise its head above its coil.');
  assert.ok(extent({ assembly: { voxels: serpent.assembly.voxels.filter(voxel => voxel.y < 6) } }, 'x') >= 16, 'The serpent needs a broad ground coil.');
  assert.ok(elemental.assembly.voxels.some(voxel => voxel.material === 'stone'));
  assert.ok(elemental.assembly.voxels.some(voxel => voxel.material === 'flame'));
  assert.ok(assembleCombatVoxelModel({ kind: 'hobbit' }).scale < warrior.scale);
  assert.ok(assembleCombatVoxelModel({ kind: 'ogre' }).scale > warrior.scale);
});

test('equipped weapons replace the weapon blocks without changing the person or shield', () => {
  const equipment = { weapon: '', body: 'chain_armor', offhand: 'shield_wood' };
  const unarmed = assembleCombatVoxelModel({ kind: 'Warrior', equipment });
  assert.equal(cellsIn(unarmed, inWeapon).length, 0);
  const silhouettes = [];
  for (const [item, variant] of [
    ['sword_basic', 'shortSword'], ['longsword', 'sword'], ['dagger', 'dagger'], ['quarterstaff', 'staff'],
  ]) {
    const armed = assembleCombatVoxelModel({ kind: 'Warrior', equipment: { ...equipment, weapon: item } });
    assert.equal(armed.appearance.weapon, variant, item);
    assert.ok(cellsIn(armed, inWeapon).length > 0, `${item} must be visible.`);
    assert.deepEqual(cellsIn(armed, voxel => !inWeapon(voxel)), cellsIn(unarmed, voxel => !inWeapon(voxel)), `${item} must not replace a torso, arm, or shield.`);
    silhouettes.push(JSON.stringify(cellsIn(armed, inWeapon).map(position).sort()));
  }
  assert.equal(new Set(silhouettes).size, silhouettes.length, 'The dagger, short sword, longsword, and staff must have different shapes.');
});

test('armor and offhand item IDs produce their corresponding visible parts and empty slots stay empty', () => {
  const unarmored = assembleCombatVoxelModel({ kind: 'paladin', equipment: {} });
  assert.equal(unarmored.appearance.weapon, 'none');
  assert.equal(unarmored.appearance.shield, 'none');
  assert.equal(cellsIn(unarmored, inWeapon).length, 0);
  assert.equal(cellsIn(unarmored, inShield).length, 0);
  const outsideClothing = voxel => voxel.blockY === 2 || inWeapon(voxel) || inShield(voxel);
  for (const [body, torso, arms, legs] of [
    ['leather_armor', 'leather', 'leather', 'armored'],
    ['chain_armor', 'chain', 'plate', 'armored'],
    ['robes', 'robe', 'sleeves', 'robe'],
  ]) {
    const dressed = assembleCombatVoxelModel({ kind: 'paladin', equipment: { body } });
    assert.deepEqual([dressed.appearance.torso, dressed.appearance.arms, dressed.appearance.legs], [torso, arms, legs], body);
    assert.notDeepEqual(cellsIn(dressed, voxel => !outsideClothing(voxel)), cellsIn(unarmored, voxel => !outsideClothing(voxel)), `${body} must visibly replace clothing.`);
    assert.deepEqual(cellsIn(dressed, outsideClothing), cellsIn(unarmored, outsideClothing), `${body} must preserve the head and equipment slots.`);
  }
  const shielded = assembleCombatVoxelModel({ kind: 'paladin', equipment: { offhand: 'shield_wood' } });
  assert.equal(shielded.appearance.shield, 'round');
  assert.ok(cellsIn(shielded, inShield).length > 0);
  assert.deepEqual(cellsIn(shielded, voxel => !inShield(voxel)), cellsIn(unarmored, voxel => !inShield(voxel)));
  const removed = assembleCombatVoxelModel({ kind: 'paladin', equipment: { offhand: 'shield_wood', weapon: 'longsword' }, appearance: { shield: 'none', weapon: 'none' } });
  assert.equal(cellsIn(removed, inShield).length, 0, 'An explicit no-shield choice must be honored.');
  assert.equal(cellsIn(removed, inWeapon).length, 0, 'An explicit empty-hand choice must be honored.');
});

test('real combat snapshots supply renderable party gear and enemy kinds', t => {
  t.mock.method(Math, 'random', () => 0.4);
  t.mock.method(globalThis, 'setTimeout', () => 0);
  const generated = buildDungeon({ width: 12, height: 12, seed: 'voxel-combat-gear' });
  const dungeon = { ...generated, ...generated.start };
  let snapshot;
  const systems = initBt3Systems({
    dungeon,
    hud: { setParty() {}, appendLog() {}, clearActions() {}, setActions() {} },
    combatView: { show(value) { snapshot = value; }, hide() {} },
  });
  for (let step = 0; step < 3; step++) systems.onStepComplete(1);
  assert.equal(systems.isCombatActive, true);
  assert.ok(snapshot.units.some(unit => unit.team === 'monster'));
  const party = snapshot.units.filter(unit => unit.team === 'party');
  assert.equal(party.length, 5);
  for (const unit of snapshot.units) {
    const model = assembleCombatVoxelModel(unit);
    assert.ok(model.assembly.voxels.length > 0, unit.name);
    if (unit.team !== 'party') continue;
    assert.ok(unit.equipment, 'The combat view needs item IDs, not only the human-readable weapon name.');
    assert.ok(unit.equipment.weapon, `${unit.name} must publish the starting weapon.`);
    assert.ok(cellsIn(model, inWeapon).length > 0, `${unit.name}'s equipped weapon must reach the figure.`);
    assert.equal(cellsIn(model, inShield).length > 0, Boolean(unit.equipment.offhand), `${unit.name} must only carry a shield when one is equipped.`);
    const unclothed = assembleCombatVoxelModel({ kind: unit.kind, equipment: {} });
    assert.notDeepEqual(model.assembly.voxels, unclothed.assembly.voxels, `${unit.name}'s gear must visibly change the figure.`);
  }
});

test('unknown figure, part, and equipment identifiers are rejected instead of drawing an unrelated model', () => {
  for (const [descriptor, message] of [
    [{ kind: 'missing' }, /kind/],
    [{ kind: 'warrior', appearance: { head: 'missing' } }, /head/],
    [{ kind: 'warrior', appearance: { tail: 'serpent' } }, /part/],
    [{ kind: 'warrior', equipment: { weapon: 'missing' } }, /weapon/],
    [{ kind: 'warrior', equipment: { body: 'missing' } }, /armor/],
    [{ kind: 'warrior', equipment: { offhand: 'missing' } }, /shield/],
    [{ kind: 'rat_swarm', equipment: { weapon: 'longsword' } }, /equipment/],
    [{ kind: 'serpent', appearance: { head: 'knight' } }, /variants/],
  ]) assert.throws(() => assembleCombatVoxelModel(descriptor), message);
});
