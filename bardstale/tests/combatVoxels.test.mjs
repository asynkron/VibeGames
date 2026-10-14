import assert from 'node:assert/strict';
import test from 'node:test';
import { ITEM_DB } from '../src/items.js';
import { createWorldArea } from '../src/worldAreas.js';
import { createGameSystems } from '../src/systems/core.js';
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
  const warrior = assembleCombatVoxelModel({ kind: 'fighter', appearance: { mainhand: 'none', offhand: 'none' } });
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
  const ogre = assembleCombatVoxelModel({ kind: 'ogre' });
  assert.equal(ogre.scale, warrior.scale, 'The ogre must use the same voxel size as a human.');
  assert.ok(extent(ogre, 'y') >= extent(warrior, 'y') * 1.9, 'A giant ogre must be sculpted from more normal-sized voxels.');
});

test('weapon types keep distinct silhouettes and polearms extend above the head', () => {
  const equipment = { mainhand: '', chest: 'chain_mail', offhand: '' };
  const silhouettes = [];
  for (const [item, variant] of [
    ['short_sword', 'shortSword'], ['long_sword', 'sword'], ['dagger', 'dagger'], ['quarterstaff', 'staff'], ['spear', 'spear'], ['halberd', 'halberd'],
  ]) {
    const armed = assembleCombatVoxelModel({ kind: 'Fighter', equipment: { ...equipment, mainhand: item } });
    assert.equal(armed.appearance.mainhand, variant, item);
    assert.ok(cellsIn(armed, 'mainhand').length > 0, `${item} must be visible.`);
    if (['staff', 'spear', 'halberd'].includes(variant)) {
      const headTop = Math.max(...cellsIn(armed, 'head').map(voxel => voxel.y));
      assert.ok(cellsIn(armed, 'mainhand').some(voxel => voxel.y >= headTop + 8), `${item} must extend well above the head without being clipped.`);
    }
    silhouettes.push(JSON.stringify(cellsIn(armed, 'mainhand').map(position).sort()));
  }
  assert.equal(new Set(silhouettes).size, silhouettes.length, 'Equipped weapon types must have different silhouettes.');
});

test('each equipped wearable changes only its owned visual parts and can be removed cleanly', () => {
  const base = assembleCombatVoxelModel({ kind:'fighter',equipment:{} });
  assert.equal(base.appearance.head,'bare','An unequipped fighter must not receive a helmet from the class preset.');
  const affected = {
    head:['head'],chest:['torso','arms'],legs:['legs'],
    shoulders:['shoulders'],hands:['hands'],feet:['feet'],waist:['waist'],
    neck:['neck'],ring1:['ring1'],ring2:['ring2'],back:['back'],
    mainhand:['mainhand'],offhand:['offhand'],
  };
  for(const item of Object.values(ITEM_DB)) for(const slot of item.slots) {
    const equipped=assembleCombatVoxelModel({kind:'fighter',equipment:{[slot]:item.id}});
    assert.notDeepEqual(equipped.assembly.voxels,base.assembly.voxels,`${item.name} in ${slot} must visibly change the character.`);
    for(const part of Object.keys(base.assembly.parts)) {
      if(!affected[slot].includes(part)) {
        assert.deepEqual(equipped.assembly.parts[part],base.assembly.parts[part],`${item.name} in ${slot} must preserve ${part}.`);
      }
    }
    assert.ok(equipped.assembly.voxels.some(voxel=>affected[slot].includes(voxel.slot)),`${item.name} must survive assembly as visible voxels.`);
    const removed=assembleCombatVoxelModel({kind:'fighter',equipment:{[slot]:''}});
    assert.deepEqual(removed.assembly.voxels,base.assembly.voxels,`Removing ${item.name} must restore the underlying body.`);
  }
  for(const chest of ['leather_armor','chain_mail','plate_mail','robes']) {
    const dressed=assembleCombatVoxelModel({kind:'fighter',equipment:{chest}});
    for(const slot of ['shoulders','hands','feet','waist','neck']) {
      assert.equal(dressed.assembly.parts[slot],null,`${chest} must not grant a separate ${slot} item.`);
    }
    assert.ok(cellsIn(dressed,'arms').some(voxel=>voxel.material==='skin'&&voxel.z>=3),'Sleeves leave hands uncovered without gloves.');
  }
  const twoRings=assembleCombatVoxelModel({kind:'fighter',equipment:{ring1:'ring_protection1',ring2:'ring_protection2'}});
  assert.ok(cellsIn(twoRings,'ring1').every(voxel=>voxel.x<0),'The first ring follows the main-hand fingers.');
  assert.ok(cellsIn(twoRings,'ring2').every(voxel=>voxel.x>0),'The second ring follows the off-hand fingers.');
  const dual=assembleCombatVoxelModel({kind:'thief',equipment:{mainhand:'short_sword',offhand:'dagger'}});
  assert.ok(cellsIn(dual,'mainhand').every(voxel=>voxel.x<0));
  assert.ok(cellsIn(dual,'offhand').every(voxel=>voxel.x>0),'An offhand dagger must be held in the other hand.');
  const explicit=assembleCombatVoxelModel({kind:'fighter',equipment:{offhand:'shield',mainhand:'long_sword'},appearance:{offhand:'none',mainhand:'none'}});
  assert.equal(cellsIn(explicit,'mainhand').length,0);
  assert.equal(cellsIn(explicit,'offhand').length,0);
});

test('item enchantments follow equipped items without leaking between models that share geometry', () => {
  const descriptor={kind:'fighter',equipment:{mainhand:'long_sword'}};
  const ordinary=assembleCombatVoxelModel(descriptor);
  const enchanted=assembleCombatVoxelModel({...descriptor,equipment:{mainhand:'long_sword_flame_tongue'}});
  assert.deepEqual(enchanted.assembly,ordinary.assembly,'Enchanting the sword does not replace its authored blade.');
  assert.deepEqual(ordinary.itemEffects,[]);
  assert.equal(enchanted.itemEffects.length,1);
  assert.equal(enchanted.itemEffects[0].kind,'flame');
  assert.equal(enchanted.itemEffects[0].slot,'mainhand');
  assert.deepEqual(assembleCombatVoxelModel(descriptor).itemEffects,[],'A cached plain sword must not acquire the enchanted sword’s flames.');
  assert.deepEqual(assembleCombatVoxelModel({kind:'fighter',equipment:{}}).itemEffects,[],'Unequipping the item removes its effect.');
  assert.deepEqual(assembleCombatVoxelModel({kind:'fighter',equipment:{mainhand:'long_sword_flame_tongue'},appearance:{mainhand:'axe'}}).itemEffects,[],
    'Replacing the item’s part cannot leave flames attached to an unrelated weapon.');
  assert.equal(assembleCombatVoxelModel({kind:'fighter',equipment:{mainhand:'long_sword_flame_tongue'},appearance:{head:'plumed'}}).itemEffects.length,1,
    'Changing another part preserves the weapon effect.');
  assert.deepEqual(assembleCombatVoxelModel({kind:'magic_user'}).itemEffects,[],'A class preset must not grant an item enchantment.');
});

test('emitting regions stay on blades, crystals, and the selected hand instead of the character origin', () => {
  const staff=assembleCombatVoxelModel({kind:'magic_user',equipment:{mainhand:'quarterstaff_plus1',neck:'star_amulet'}});
  const orbit=staff.itemEffects.find(effect=>effect.kind==='orbit');
  const glow=staff.itemEffects.find(effect=>effect.kind==='glow');
  assert.ok(orbit.anchor.y>28&&orbit.anchor.y<36,'The orbit is centered on the crystal above the head.');
  assert.ok(orbit.bounds.min.y>26,'The wooden shaft must not emit crystal particles.');
  assert.ok(glow.anchor.y<18&&glow.anchor.z>2,'The amulet glows on the chest, independently of the staff.');

  const main=assembleCombatVoxelModel({kind:'thief',equipment:{mainhand:'dagger_plus1'}}).itemEffects[0];
  const off=assembleCombatVoxelModel({kind:'thief',equipment:{offhand:'dagger_plus1'}}).itemEffects[0];
  assert.ok(main.bounds.max.x<0&&off.bounds.min.x>0,'Each dagger emits on its own side of the body.');
  assert.equal(off.anchor.x,-1-main.anchor.x,'The effect follows the reflected weapon, including voxel-center reflection.');
  assert.equal(off.anchor.y,main.anchor.y-3,'The offhand blade sits three voxels lower.');
  assert.equal(off.anchor.z,main.anchor.z);
  assert.ok(main.bounds.min.y>=17&&off.bounds.min.y>=14,'Vapor originates above the gold guard, away from the gripping fingers.');

  for(const equipment of [{mainhand:'long_sword_flame_tongue'},{mainhand:'mace_plus1'},{offhand:'shield_plus1'}]) {
    const model=assembleCombatVoxelModel({kind:'fighter',equipment});
    const [effect]=model.itemEffects;
    const part=model.assembly.parts[effect.slot];
    for(const axis of ['x','y','z']) {
      assert.ok(effect.bounds.min[axis]>=part.bounds.min[axis]&&effect.bounds.max[axis]<=part.bounds.max[axis],
        `${effect.id} must emit from its own geometry.`);
      assert.ok(Number.isFinite(effect.anchor[axis])&&effect.anchor[axis]>=effect.bounds.min[axis]&&effect.anchor[axis]<=effect.bounds.max[axis]);
    }
  }
});

test('real combat snapshots supply renderable party gear and enemy kinds', t => {
  t.mock.method(Math, 'random', () => 0.4);
  t.mock.method(globalThis, 'setTimeout', () => 0);
  const generated = createWorldArea('slums');
  const dungeon = { ...generated, ...generated.start };
  let snapshot;
  const systems = createGameSystems({
    dungeon,
    onPartyDefeated() {},
    hud: { setParty() {}, appendLog() {}, clearActions() {}, setActions() {} },
    combatView: { show(value) { snapshot = value; }, hide() {} },
  });
  for (let step = 0; step < 3; step++) systems.onStepComplete();
  assert.equal(systems.isCombatActive, true);
  assert.ok(snapshot.units.some(unit => unit.team === 'monster'));
  assert.equal(snapshot.units.filter(unit => unit.team === 'party').length, 6);
  for (const unit of snapshot.units) {
    const model = assembleCombatVoxelModel(unit);
    assert.ok(model.assembly.voxels.length > 0, unit.name);
    if (unit.team !== 'party') continue;
    assert.ok(unit.equipment, 'The combat view needs item IDs, not only the human-readable weapon name.');
    assert.ok(unit.equipment.mainhand, `${unit.name} must publish the starting weapon.`);
    assert.ok(cellsIn(model, 'mainhand').length > 0, `${unit.name}'s equipped weapon must reach the figure.`);
    assert.equal(cellsIn(model, 'offhand').length > 0, Boolean(unit.equipment.offhand), `${unit.name} must only carry a shield when one is equipped.`);
    const unclothed = assembleCombatVoxelModel({ kind: unit.kind, equipment: {} });
    assert.notDeepEqual(model.assembly.voxels, unclothed.assembly.voxels, `${unit.name}'s gear must visibly change the figure.`);
  }
});

test('unknown figure, part, and equipment identifiers are rejected instead of drawing an unrelated model', () => {
  for (const [descriptor, message] of [
    [{ kind: 'missing' }, /kind/],
    [{ kind: 'fighter', appearance: { head: 'missing' } }, /head/],
    [{ kind: 'fighter', appearance: { back: 'missing' } }, /back/],
    [{ kind: 'fighter', appearance: { tail: 'serpent' } }, /part/],
    [{ kind: 'fighter', equipment: { mainhand: 'missing' } }, /mainhand/],
    [{ kind: 'fighter', equipment: { chest: 'missing' } }, /chest/],
    [{ kind: 'fighter', equipment: { offhand: 'missing' } }, /shield|offhand/],
    [{ kind: 'rat_swarm', equipment: { mainhand: 'long_sword' } }, /equipment/],
    [{ kind: 'fighter', equipment: { feet: 'long_sword' } }, /cannot be equipped/],
    [{ kind: 'fighter', equipment: { tail: 'long_sword' } }, /equipment slot/],
    [{ kind: 'serpent', appearance: { head: 'knight' } }, /variants/],
  ]) assert.throws(() => assembleCombatVoxelModel(descriptor), message);
});
