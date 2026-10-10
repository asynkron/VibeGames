import assert from 'node:assert/strict';
import test from 'node:test';
import { assembleCombatVoxelModel, COMBAT_VOXEL_KINDS } from '../src/render/combatVoxelCatalog.js';
import { createVoxelRig } from '../src/render/voxelRig.js';

const cellKey = ({ x, y, z }) => `${x},${y},${z}`;
const neutral = { rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 };
const cellsIn = (rig, joint, slot) => rig.joints[joint].voxels.filter(voxel => voxel.slot === slot);
const assertNeutral = (pose, message) => {
  for (const angle of Object.values(pose)) assert.equal(Math.abs(angle), 0, message);
};

test('rigging preserves every assembled voxel exactly once without changing the saved model', () => {
  for (const kind of COMBAT_VOXEL_KINDS) {
    const model = assembleCombatVoxelModel({ kind });
    const before = JSON.stringify(model.assembly);
    const rig = createVoxelRig(model);
    const owned = Object.values(rig.joints).flatMap(joint => joint.voxels);
    assert.equal(owned.length, model.assembly.voxels.length, `${kind}: rigging cannot add or drop geometry.`);
    assert.equal(new Set(owned.map(cellKey)).size, owned.length, `${kind}: two hinges cannot own the same voxel.`);
    const ordered = voxels => [...voxels].sort((a, b) => cellKey(a).localeCompare(cellKey(b)));
    assert.deepEqual(ordered(owned), ordered(model.assembly.voxels), `${kind}: colors, materials, and part ownership survive rigging.`);
    rig.samplePose({ walkPhase: Math.PI / 2, walkAmount: 1, action: 'slash', progress: 0.25 });
    assert.equal(JSON.stringify(model.assembly), before, `${kind}: animation cannot mutate the reusable part assets.`);
  }
});

test('held items, wearables, and their emitters share the correct anatomical hinge', () => {
  const model = assembleCombatVoxelModel({ kind: 'paladin', equipment: {
    mainhand: 'ember_sword', offhand: 'void_shield', shoulders: 'iron_pauldrons',
    hands: 'iron_gauntlets', feet: 'iron_boots', ring1: 'ring_power', ring2: 'ring_warding',
    neck: 'star_amulet', back: 'travel_cape', waist: 'war_belt',
  } });
  const rig = createVoxelRig(model);
  for (const [slot, joint] of [
    ['mainhand', 'rightArm'], ['ring1', 'rightArm'], ['offhand', 'leftArm'], ['ring2', 'leftArm'],
    ['neck', 'body'], ['back', 'body'], ['waist', 'body'],
  ]) {
    const visible = model.assembly.voxels.filter(voxel => voxel.slot === slot);
    assert.ok(visible.length > 0, `${slot} must be exercised by visible equipped geometry.`);
    assert.deepEqual(cellsIn(rig, joint, slot), visible, `${slot} must stay attached to ${joint}.`);
  }
  for (const [right, left, slots] of [
    ['rightArm', 'leftArm', ['arms', 'hands', 'shoulders']],
    ['rightLeg', 'leftLeg', ['feet']],
  ]) {
    for (const slot of slots) {
      const rightCells = cellsIn(rig, right, slot), leftCells = cellsIn(rig, left, slot);
      assert.ok(rightCells.length > 0 && leftCells.length > 0, `${slot} must split into independently moving sides.`);
      assert.ok(rightCells.every(voxel => voxel.x < 0), `${slot}: the main-hand side must use the right hinge.`);
      assert.ok(leftCells.every(voxel => voxel.x >= 0), `${slot}: the offhand side must use the left hinge.`);
    }
  }
  assert.equal(model.itemEffects.length, 3, 'Exercise a flame, offhand mist, and body-mounted glow together.');
  for (const effect of model.itemEffects) {
    const attachment = rig.effectJoint(effect.slot);
    assert.deepEqual(cellsIn(rig, attachment, effect.slot), model.assembly.voxels.filter(voxel => voxel.slot === effect.slot),
      `${effect.kind} must inherit the same transform as its emitting item.`);
  }
});

test('walking keeps the pelvis joined, alternates stiff legs, and returns to a neutral pose', () => {
  const rig = createVoxelRig(assembleCombatVoxelModel({ kind: 'warrior' }));
  const forward = rig.samplePose({ walkPhase: Math.PI / 2, walkAmount: 1 });
  const reverse = rig.samplePose({ walkPhase: Math.PI * 1.5, walkAmount: 1 });
  assert.ok(forward.rightLeg > 0 && forward.leftLeg < 0);
  assert.ok(forward.rightArm < 0 && forward.leftArm > 0, 'Arms counterbalance their own leg.');
  for (const joint of Object.keys(neutral)) {
    assert.ok(forward[joint] * reverse[joint] < 0, `${joint} changes direction on the next stride.`);
  }
  assertNeutral(rig.samplePose(), 'Stopping must not retain the last walking or attack pose.');
  const movingAttack = { walkPhase: Math.PI / 2, walkAmount: 1, action: 'slash', progress: 0.25 };
  assertNeutral(rig.samplePose({ ...movingAttack, reducedMotion: true }));
  assertNeutral(rig.samplePose({ ...movingAttack, active: false }), 'A defeated figure has no continuing limb motion.');
  for (const legs of ['plain','bones']) {
    const body = createVoxelRig(assembleCombatVoxelModel({kind:'monk',appearance:{legs}}));
    for (const x of [-1,0]) {
      assert.ok(body.joints.body.voxels.some(voxel=>voxel.slot==='legs' && voxel.x===x && voxel.y===8 && voxel.z===0),
        `${legs}: both sides of the lower pelvis must stay joined above the moving legs.`);
    }
  }
});

test('melee winds up before contact, other actions move arms, and all poses fit their camera envelopes', () => {
  for (const descriptor of [{ kind: 'warrior' }, { kind: 'rogue', equipment: { mainhand: 'dagger', offhand: 'dagger' } }]) {
    const rig = createVoxelRig(assembleCombatVoxelModel(descriptor));
    const winding = rig.samplePose({ action: 'slash', progress: 0.12 });
    const contact = rig.samplePose({ action: 'slash', progress: 0.25 });
    assert.ok(winding.rightArm < 0 && contact.rightArm > 0, 'The weapon must travel through a strike, not remain in a raised pose.');
    for (const action of ['slash', 'arrow', 'cast', 'recoil']) {
      assert.ok(Object.values(rig.samplePose({ action, progress: 0.5 })).some(angle => Math.abs(angle) > 0.01), `${action} must visibly move the arms.`);
      assertNeutral(rig.samplePose({ action, progress: 1 }), `${action} returns to the grip pose after finishing.`);
      for (let tick = 0; tick <= 40; tick++) {
        const pose = rig.samplePose({ action, progress: tick / 40, walkPhase: tick / 40 * Math.PI * 2, walkAmount: 1 });
        for (const [name, angle] of Object.entries(pose)) {
          const [min, max] = rig.joints[name].angleRange;
          assert.ok(angle >= min && angle <= max, `${action}/${name} must fit the declared animation envelope used for framing.`);
        }
      }
    }
  }
});

test('robes and skirts retain a hanging hem while real legs and feet swing underneath', () => {
  for (const legs of ['robe', 'skirt']) {
    const model = assembleCombatVoxelModel({ kind: 'monk', appearance: { legs } });
    const rig = createVoxelRig(model);
    const hem = model.assembly.voxels.filter(voxel => voxel.slot === 'legs' && voxel.material === 'gold' && voxel.y < 10);
    assert.ok(hem.length > 0, `${legs} must exercise the visible lower hem.`);
    assert.ok(hem.every(voxel => rig.joints.body.voxels.includes(voxel)), `${legs} cannot split its hem between rotating thighs.`);
    for (const joint of ['rightLeg', 'leftLeg']) {
      const leg = cellsIn(rig, joint, 'legs');
      assert.ok(leg.some(voxel => voxel.y <= 1), `${legs}: ${joint} retains its foot below the cloth.`);
      assert.ok(leg.some(voxel => voxel.y >= 5), `${legs}: ${joint} must retain a real leg, not only a detached shoe.`);
      assert.ok(rig.joints[joint].pivot[1] > Math.min(...leg.map(voxel => voxel.y)), 'The hinge belongs at the hip above the feet.');
    }
    const pose = rig.samplePose({ walkPhase: Math.PI / 2, walkAmount: 1 });
    assert.ok(pose.rightLeg > 0 && pose.leftLeg < 0, `${legs} still walks with separate rigid legs.`);
  }
});

test('a custom ogre moves its club with its hand while complete single-torso creatures remain supported', () => {
  const model = assembleCombatVoxelModel({ kind: 'ogre' });
  assert.equal(model.assembly.partCount, 1, 'The ogre remains authored as a complete custom torso.');
  const rig = createVoxelRig(model);
  const club = model.assembly.voxels.filter(voxel => voxel.material === 'wood');
  assert.ok(club.length > 0);
  assert.ok(club.every(voxel => rig.joints.rightArm.voxels.includes(voxel)), 'The sculpted club follows the weapon arm despite belonging to the torso asset.');
  assert.ok(rig.joints.rightArm.voxels.some(voxel => voxel.material === 'skin' && voxel.y < 22), 'The hand and club are owned by one hinge.');
  assert.ok(rig.joints.body.voxels.some(voxel => voxel.material === 'skin' && voxel.y > 40), 'The ogre head stays with the body.');
  assert.ok(rig.samplePose({ action: 'slash', progress: 0.25 }).rightArm > 0);

  const dragon = assembleCombatVoxelModel({ kind: 'dragon' });
  const dragonRig = createVoxelRig(dragon);
  assert.deepEqual(dragonRig.joints.body.voxels, dragon.assembly.voxels, 'An unarticulated custom torso retains its full geometry.');
  assertNeutral(dragonRig.samplePose({ walkPhase: Math.PI / 2, walkAmount: 1, action: 'slash', progress: 0.25 }),
    'Custom forms without authored hinges must not acquire human limbs.');
});
