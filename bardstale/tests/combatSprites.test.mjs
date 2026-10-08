import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCombatSprite } from '../src/render/combatSprites.js';

function changedPixels(before, after) {
  assert.equal(after.width, before.width);
  assert.equal(after.height, before.height);
  const changes = [];
  for (let y = 0; y < before.height; y += 1) {
    for (let x = 0; x < before.width; x += 1) {
      const offset = (y * before.width + x) * 4;
      if (before.pixels.subarray(offset, offset + 4).some((value, channel) => value !== after.pixels[offset + channel])) {
        changes.push({ x, y });
      }
    }
  }
  return changes;
}

test('left-facing characters mirror the entire 24 by 24 RGBA cell', async (t) => {
  for (const [name, descriptor] of [
    ['armed fighter', { kind: 'rogue', appearance: { weapon: 'axe' } }],
    ['fighter with a shield', { kind: 'paladin', equipment: { weapon: 'longsword', offhand: 'shield_wood', body: 'chain_armor' } }],
    ['robed caster with a staff', { kind: 'magician', equipment: { weapon: 'quarterstaff', body: 'robes' } }],
  ]) {
    await t.test(name, () => {
      const right = renderCombatSprite({ ...descriptor, facing: 'right' });
      const left = renderCombatSprite({ ...descriptor, facing: 'left' });
      assert.equal(right.width, 24);
      assert.equal(right.height, 24);
      assert.equal(left.width, 24);
      assert.equal(left.height, 24);
      assert.equal(right.pixels.length, 24 * 24 * 4);
      assert.equal(left.pixels.length, 24 * 24 * 4);
      let opaque = 0;
      let transparent = 0;
      for (let y = 0; y < 24; y += 1) {
        for (let x = 0; x < 24; x += 1) {
          const source = (y * 24 + x) * 4;
          const reflected = (y * 24 + 23 - x) * 4;
          assert.deepEqual(left.pixels.subarray(reflected, reflected + 4), right.pixels.subarray(source, source + 4), `The pixel at ${x},${y} must move with every layer.`);
          if (right.pixels[source + 3]) opaque += 1;
          else transparent += 1;
        }
      }
      assert.ok(opaque > 0, 'The assembled character must be visible.');
      assert.ok(transparent > 0, 'The character cell must retain transparent pixels.');
    });
  }
});

test('changing a character part preserves all pixels outside its tile region', async (t) => {
  const appearance = { head: 'hair', torso: 'tunic', arms: 'sleeves', legs: 'pants', weapon: 'sword', shield: 'round' };
  const before = renderCombatSprite({ kind: 'magician', appearance, facing: 'right' });
  const cases = [
    { slot: 'head', variant: 'helmet', contains: ({ y }) => y < 8 },
    { slot: 'torso', variant: 'chain', contains: ({ y }) => y >= 8 && y < 16 },
    { slot: 'arms', variant: 'gauntlets', contains: ({ y }) => y >= 8 && y < 16 },
    { slot: 'legs', variant: 'skirt', contains: ({ y }) => y >= 16 },
    { slot: 'legs', variant: 'robe', contains: ({ y }) => y >= 16 },
    { slot: 'weapon', variant: 'staff', contains: ({ x }) => x >= 16 },
    { slot: 'shield', variant: 'kite', contains: ({ x, y }) => x < 8 && y >= 8 && y < 16 },
  ];
  for (const { slot, variant, contains } of cases) {
    await t.test(`${slot}: ${appearance[slot]} to ${variant}`, () => {
      const after = renderCombatSprite({ kind: 'magician', appearance: { ...appearance, [slot]: variant }, facing: 'right' });
      const changes = changedPixels(before, after);
      assert.ok(changes.length > 0, `${slot} must visibly change.`);
      for (const pixel of changes) {
        assert.ok(contains(pixel), `Changing ${slot} also changed the unrelated pixel at ${pixel.x},${pixel.y}.`);
      }
    });
  }
});

test('equipped sword, shield, and armor change their rendered parts without mutating the descriptor', async (t) => {
  for (const kind of ['rogue', 'warrior']) {
    await t.test(kind, () => {
      const unequipped = Object.freeze({ kind, facing: 'right', equipment: Object.freeze({}) });
      const equipped = Object.freeze({
        kind,
        facing: 'right',
        equipment: Object.freeze({ weapon: 'longsword', offhand: 'shield_wood', body: 'chain_armor' }),
        appearance: Object.freeze({ head: 'hair' }),
      });
      const original = structuredClone(equipped);
      const changes = changedPixels(renderCombatSprite(unequipped), renderCombatSprite(equipped));
      assert.ok(changes.some(({ x }) => x >= 16), 'Equipping the longsword must change the weapon column.');
      assert.ok(changes.some(({ x, y }) => x < 8 && y >= 8 && y < 16), 'Equipping the shield must change the left middle tile.');
      assert.ok(changes.some(({ x, y }) => x >= 8 && x < 16 && y >= 8 && y < 16), 'Equipping and removing chain armor must change the torso tile, even when the class preset wears armor.');
      assert.deepEqual(equipped, original);
      assert.deepEqual(unequipped.equipment, {});
    });
  }
});
