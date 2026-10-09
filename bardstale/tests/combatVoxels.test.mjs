import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDungeon } from '../src/dungeon.js';
import { initBt3Systems } from '../src/systems/core.js';
import { assembleVoxelCharacter } from '../src/render/voxelParts.js';
import { assembleCharacterParts, VOXEL_APPEARANCE_OPTIONS } from '../src/render/voxelCharacterParts.js';
import { COMBAT_VOXEL_KINDS, assembleCombatVoxelModel } from '../src/render/combatVoxelCatalog.js';

const position = ({ x, y, z }) => `${x},${y},${z}`;
const geometry = model => model.assembly.voxels.map(position).sort();
const cellsIn = (model, slot) => model.assembly.parts[slot]?.voxels ?? [];
const appearanceOf = cells => cells.map(({ x, y, z, color, material }) => ({ x, y, z, color, material }));
const extent = (model, axis) => {
  const values = model.assembly.voxels.map(voxel => voxel[axis]);
  return Math.max(...values) - Math.min(...values) + 1;
};

test('the combat catalog produces volumetric figures that survive saving their complete parts', () => {
  assert.equal(new Set(COMBAT_VOXEL_KINDS).size, COMBAT_VOXEL_KINDS.length);
  for (const kind of COMBAT_VOXEL_KINDS) {
    const model = assembleCombatVoxelModel({ kind });
    const { assembly, recipe, parts, scale } = model;
    assert.ok(assembly.voxels.length > 0, `${kind} must have visible geometry.`);
    assert.ok(scale > 0 && Number.isFinite(scale), `${kind} needs a finite world scale.`);
    assert.ok(extent(model, 'z') > 4, `${kind} must have actual depth.`);
    assert.ok(assembly.voxels.every(({ x, y, z }) => [x, y, z].every(Number.isSafeInteger)), kind);
    assert.equal(new Set(assembly.voxels.map(position)).size, assembly.voxels.length, `${kind} must have one visible voxel per cell.`);
    assert.deepEqual(assembly.dimensions, { width: extent(model, 'x'), height: extent(model, 'y'), depth: extent(model, 'z') }, kind);
    const restored = assembleVoxelCharacter(JSON.parse(JSON.stringify(recipe)), new Map(JSON.parse(JSON.stringify([...parts]))));
    assert.deepEqual(restored, assembly, `${kind} must survive saving its recipe and part assets.`);
  }
});

test('each mix-and-match selection replaces its complete part and preserves the other parts', () => {
  const reference = assembleCharacterParts();
  for (const [slot, variants] of Object.entries(VOXEL_APPEARANCE_OPTIONS)) {
    for (const { value } of variants) {
      const requested = assembleCharacterParts({ [slot]: value });
      for (const other of Object.keys(reference.assembly.parts)) {
        if (other !== slot) assert.deepEqual(requested.assembly.parts[other], reference.assembly.parts[other], `${slot}/${value} must preserve ${other}.`);
      }
      const cells = cellsIn(requested, slot);
      if (value === 'none') {
        assert.equal(requested.recipe.parts[slot], null, `${slot}/none must remove the part reference.`);
        assert.equal(cells.length, 0);
      } else {
        assert.ok(cells.length > 0, `${slot}/${value} must have visible geometry.`);
        if (value !== reference.appearance[slot]) {
          assert.notDeepEqual(appearanceOf(cells), appearanceOf(cellsIn(reference, slot)), `${slot}/${value} must visibly change the selected part.`);
        }
      }
    }
  }
});

test('helmet variants enclose the head with armor rather than exposed skin', () => {
  for (const head of ['plumed', 'knight']) {
    const voxels = cellsIn(assembleCharacterParts({ head }), 'head');
    assert.ok(voxels.some(voxel => voxel.material === 'steel'), `${head} must contain metal armor.`);
    assert.equal(voxels.filter(voxel => voxel.material === 'skin').length, 0, `${head} must cover the face, ears, and neck.`);
  }
  const plain = cellsIn(assembleCharacterParts({ head: 'knight' }), 'head');
  const plumed = cellsIn(assembleCharacterParts({ head: 'plumed' }), 'head');
  assert.ok(Math.max(...plumed.map(voxel => voxel.y)) >= Math.max(...plain.map(voxel => voxel.y)) + 6, 'The feather crest must extend above the helmet instead of being clipped to the head height.');
});

test('custom creatures use one complete torso and retain their distinct silhouettes and materials', () => {
  const warrior = assembleCombatVoxelModel({ kind: 'warrior', appearance: { mainhand: 'none', offhand: 'none' } });
  const skeleton = assembleCombatVoxelModel({ kind: 'skeleton' });
  const serpent = assembleCombatVoxelModel({ kind: 'serpent' });
  const rats = assembleCombatVoxelModel({ kind: 'rat_swarm' });
  const elemental = assembleCombatVoxelModel({ kind: 'elemental' });
  const dragon = assembleCombatVoxelModel({ kind: 'dragon' });
  const forms = [warrior, skeleton, serpent, rats, elemental, dragon].map(model => JSON.stringify(geometry(model)));
  assert.equal(new Set(forms).size, forms.length, 'Each anatomy must differ in occupied cells, beyond a color change.');
  for (const creature of [serpent, rats, elemental, dragon]) {
    assert.equal(creature.assembly.partCount, 1);
    assert.deepEqual(cellsIn(creature, 'torso'), creature.assembly.voxels);
    assert.ok(Object.entries(creature.recipe.parts).every(([slot, reference]) => slot === 'torso' || reference === null));
  }
  assert.ok(skeleton.assembly.voxels.some(voxel => voxel.material === 'bone'));
  assert.ok(rats.assembly.voxels.some(voxel => voxel.material === 'fur'));
  assert.ok(extent(rats, 'y') <= 8, 'Rats must stay close to the ground.');
  assert.ok(extent(rats, 'x') >= 16, 'The swarm must spread across the ground.');
  assert.ok(serpent.assembly.voxels.some(voxel => voxel.y >= 15), 'The serpent must raise its head above its coil.');
  assert.ok(extent({ assembly: { voxels: serpent.assembly.voxels.filter(voxel => voxel.y < 6) } }, 'x') >= 16, 'The serpent needs a broad ground coil.');
  assert.ok(elemental.assembly.voxels.some(voxel => voxel.material === 'stone'));
  assert.ok(elemental.assembly.voxels.some(voxel => voxel.material === 'flame'));
  assert.ok(extent(dragon, 'x') >= 40 && extent(dragon, 'z') >= 40, 'The dragon must occupy a broad volume in both ground axes, beyond a humanoid-sized figure.');
  assert.ok(extent(dragon, 'y') > extent(warrior, 'y'), 'The dragon must rise above the human figures.');
  assert.ok(assembleCombatVoxelModel({ kind: 'hobbit' }).scale < warrior.scale);
  const ogre = assembleCombatVoxelModel({ kind: 'ogre' });
  assert.equal(ogre.scale, warrior.scale, 'The ogre must use the same voxel size as a human.');
  assert.ok(extent(ogre, 'y') >= extent(warrior, 'y') * 1.9, 'A giant ogre must be sculpted from more normal-sized voxels.');
});

test('equipped weapons replace the mainhand item without changing anatomy or offhand', () => {
  const equipment = { weapon: '', body: 'chain_armor', offhand: 'shield_wood' };
  const unarmed = assembleCombatVoxelModel({ kind: 'Warrior', equipment });
  assert.equal(cellsIn(unarmed, 'mainhand').length, 0);
  const silhouettes = [];
  for (const [item, variant] of [
    ['sword_basic', 'shortSword'], ['longsword', 'sword'], ['dagger', 'dagger'], ['quarterstaff', 'staff'], ['spear', 'spear'], ['halberd', 'halberd'],
  ]) {
    const armed = assembleCombatVoxelModel({ kind: 'Warrior', equipment: { ...equipment, weapon: item } });
    assert.equal(armed.appearance.mainhand, variant, item);
    assert.ok(cellsIn(armed, 'mainhand').length > 0, `${item} must be visible.`);
    if (['staff', 'spear', 'halberd'].includes(variant)) {
      const headTop = Math.max(...cellsIn(armed, 'head').map(voxel => voxel.y));
      assert.ok(cellsIn(armed, 'mainhand').some(voxel => voxel.y >= headTop + 8), `${item} must extend well above the head without being clipped.`);
    }
    for (const slot of Object.keys(unarmed.assembly.parts)) {
      if (slot !== 'mainhand') assert.deepEqual(armed.assembly.parts[slot], unarmed.assembly.parts[slot], `${item} must preserve ${slot}.`);
    }
    silhouettes.push(JSON.stringify(cellsIn(armed, 'mainhand').map(position).sort()));
  }
  assert.equal(new Set(silhouettes).size, silhouettes.length, 'Equipped weapon types must have different silhouettes.');
});

test('armor and offhand item IDs produce the corresponding parts and empty hands stay empty', () => {
  const unarmored = assembleCombatVoxelModel({ kind: 'paladin', equipment: {} });
  assert.equal(unarmored.appearance.mainhand, 'none');
  assert.equal(unarmored.appearance.offhand, 'none');
  assert.equal(cellsIn(unarmored, 'mainhand').length, 0);
  assert.equal(cellsIn(unarmored, 'offhand').length, 0);
  for (const [body, torso, arms, legs] of [
    ['leather_armor', 'leather', 'leather', 'armored'],
    ['chain_armor', 'chain', 'plate', 'armored'],
    ['robes', 'robe', 'sleeves', 'robe'],
  ]) {
    const dressed = assembleCombatVoxelModel({ kind: 'paladin', equipment: { body } });
    assert.deepEqual([dressed.appearance.torso, dressed.appearance.arms, dressed.appearance.legs], [torso, arms, legs], body);
    assert.notDeepEqual(appearanceOf(cellsIn(dressed, 'torso')), appearanceOf(cellsIn(unarmored, 'torso')), `${body} must visibly replace clothing.`);
    for (const slot of ['head', 'mainhand', 'offhand', 'back']) assert.deepEqual(dressed.assembly.parts[slot], unarmored.assembly.parts[slot], `${body} must preserve ${slot}.`);
  }
  const shielded = assembleCombatVoxelModel({ kind: 'paladin', equipment: { offhand: 'shield_wood' } });
  assert.equal(shielded.appearance.offhand, 'round');
  assert.ok(cellsIn(shielded, 'offhand').length > 0);
  for (const slot of Object.keys(unarmored.assembly.parts)) {
    if (slot !== 'offhand') assert.deepEqual(shielded.assembly.parts[slot], unarmored.assembly.parts[slot]);
  }
  const removed = assembleCombatVoxelModel({ kind: 'paladin', equipment: { offhand: 'shield_wood', weapon: 'longsword' }, appearance: { offhand: 'none', mainhand: 'none' } });
  assert.equal(cellsIn(removed, 'offhand').length, 0, 'An explicit empty offhand choice must be honored.');
  assert.equal(cellsIn(removed, 'mainhand').length, 0, 'An explicit empty mainhand choice must be honored.');
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
  assert.equal(snapshot.units.filter(unit => unit.team === 'party').length, 5);
  for (const unit of snapshot.units) {
    const model = assembleCombatVoxelModel(unit);
    assert.ok(model.assembly.voxels.length > 0, unit.name);
    if (unit.team !== 'party') continue;
    assert.ok(unit.equipment, 'The combat view needs item IDs, not only the human-readable weapon name.');
    assert.ok(unit.equipment.weapon, `${unit.name} must publish the starting weapon.`);
    assert.ok(cellsIn(model, 'mainhand').length > 0, `${unit.name}'s equipped weapon must reach the figure.`);
    assert.equal(cellsIn(model, 'offhand').length > 0, Boolean(unit.equipment.offhand), `${unit.name} must only carry a shield when one is equipped.`);
    if (unit.kind === 'Bard') {
      assert.equal(unit.equipment.instrument, 'lute', 'The starting bard must actually carry the instrument shown on the figure.');
      assert.equal(model.appearance.back, 'lute');
      assert.ok(cellsIn(model, 'back').some(voxel => voxel.material === 'wood'));
      const withoutInstrument = assembleCombatVoxelModel({ ...unit, equipment: { ...unit.equipment, instrument: '' } });
      assert.equal(cellsIn(withoutInstrument, 'back').length, 0, 'Unequipping the lute must remove it from the back.');
      for (const slot of Object.keys(model.assembly.parts)) {
        if (slot !== 'back') assert.deepEqual(withoutInstrument.assembly.parts[slot], model.assembly.parts[slot], `Removing the instrument must preserve ${slot}.`);
      }
    }
    const unclothed = assembleCombatVoxelModel({ kind: unit.kind, equipment: {} });
    assert.notDeepEqual(model.assembly.voxels, unclothed.assembly.voxels, `${unit.name}'s gear must visibly change the figure.`);
  }
});

test('unknown figure, part, and equipment identifiers are rejected instead of drawing an unrelated model', () => {
  for (const [descriptor, message] of [
    [{ kind: 'missing' }, /kind/],
    [{ kind: 'warrior', appearance: { head: 'missing' } }, /head/],
    [{ kind: 'warrior', appearance: { back: 'missing' } }, /back/],
    [{ kind: 'warrior', appearance: { tail: 'serpent' } }, /part/],
    [{ kind: 'warrior', equipment: { weapon: 'missing' } }, /weapon/],
    [{ kind: 'warrior', equipment: { body: 'missing' } }, /armor/],
    [{ kind: 'warrior', equipment: { offhand: 'missing' } }, /shield|offhand/],
    [{ kind: 'rat_swarm', equipment: { weapon: 'longsword' } }, /equipment/],
    [{ kind: 'serpent', appearance: { head: 'knight' } }, /variants/],
  ]) assert.throws(() => assembleCombatVoxelModel(descriptor), message);
});
