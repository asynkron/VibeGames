import assert from 'node:assert/strict';
import test from 'node:test';
import { ITEM_DB, INVENTORY_CAPACITY } from '../src/items.js';
import { createInventory, createEquipment, addInventoryItem, equipCarriedItem, unequipItem, transferCarriedItem, useCarriedItem, computeCharacterStats } from '../src/systems/inventory.js';
import { initBt3Systems } from '../src/systems/core.js';

function character(id = 'hero') {
  return {
    id, name: id, classType: 'Warrior', level: 1, alive: true,
    hpCurrent: 12, hpMax: 30, spCurrent: 3, spMax: 15,
    base: { ac: 10, toHit: 2, weaponDamageBonus: 3, damage: { min: 4, max: 9 }, magicResist: 0 },
    inventory: createInventory(), equipment: createEquipment(), statusEffects: [],
  };
}

function itemCounts(...characters) {
  const counts = {};
  for (const hero of characters) {
    for (const entry of hero.inventory) if (entry) counts[entry.itemId] = (counts[entry.itemId] || 0) + entry.qty;
    for (const itemId of Object.values(hero.equipment)) if (itemId) counts[itemId] = (counts[itemId] || 0) + 1;
  }
  return counts;
}

function carry(hero, itemId, quantity = 1) {
  assert.equal(addInventoryItem(hero, itemId, quantity).ok, true);
  return hero.inventory.findIndex(entry => entry?.itemId === itemId);
}

function equip(hero, itemId, slot) {
  assert.equal(equipCarriedItem(hero, carry(hero, itemId), slot).ok, true);
}

test('equipment swaps conserve every item, use the vacated bag slot, and reject a two-handed swap atomically without enough space', () => {
  const hero = character();
  equip(hero, 'longsword', 'mainhand');
  equip(hero, 'shield_wood', 'offhand');
  const halberdIndex = carry(hero, 'halberd');
  carry(hero, 'dagger', INVENTORY_CAPACITY - 1);
  const before = structuredClone(hero);
  assert.equal(equipCarriedItem(hero, halberdIndex, 'mainhand').ok, false);
  assert.deepEqual(hero, before, 'A failed swap must preserve both hands and every carried item.');
  assert.equal(unequipItem(hero, 'offhand').ok, false, 'An equipped item cannot disappear into a full pack.');
  const secondHero = character('other');
  const daggerIndex = hero.inventory.findIndex(entry => entry?.itemId === 'dagger');
  const counts = itemCounts(hero, secondHero);
  assert.equal(transferCarriedItem(hero, daggerIndex, secondHero).ok, true);
  assert.equal(equipCarriedItem(hero, halberdIndex, 'mainhand').ok, true);
  assert.equal(hero.equipment.mainhand, 'halberd');
  assert.equal(hero.equipment.offhand, '');
  assert.deepEqual(itemCounts(hero, secondHero), counts);
  const shieldIndex = hero.inventory.findIndex(entry => entry?.itemId === 'shield_wood');
  const withHalberd = structuredClone(hero);
  assert.equal(equipCarriedItem(hero, shieldIndex, 'offhand').ok, false);
  assert.deepEqual(hero, withHalberd);
  const swordIndex = hero.inventory.findIndex(entry => entry?.itemId === 'longsword');
  assert.equal(equipCarriedItem(hero, swordIndex, 'mainhand').ok, true, 'A single-slot swap can use the space freed by the selected item.');
  assert.deepEqual(itemCounts(hero, secondHero), counts);
});

test('carried stacks merge and overflow into empty slots while failed transfers and loot leave both owners unchanged', () => {
  const giver = character('giver');
  const receiver = character('receiver');
  const max = ITEM_DB.healing_potion.stackMax;
  const sourceIndex = carry(giver, 'healing_potion', max);
  carry(receiver, 'healing_potion', max - 1);
  carry(receiver, 'dagger', INVENTORY_CAPACITY - 1);
  const before = structuredClone([giver, receiver]);
  assert.equal(transferCarriedItem(giver, sourceIndex, receiver).ok, false);
  assert.deepEqual([giver, receiver], before, 'Partial stack space cannot consume part of a failed whole-stack transfer.');
  assert.equal(addInventoryItem(receiver, 'healing_potion', 2).ok, false);
  assert.deepEqual([giver, receiver], before, 'Loot must also preflight the complete quantity.');
  const daggerIndex = receiver.inventory.findIndex(entry => entry?.itemId === 'dagger');
  assert.equal(transferCarriedItem(receiver, daggerIndex, giver).ok, true);
  const counts = itemCounts(giver, receiver);
  assert.equal(transferCarriedItem(giver, sourceIndex, receiver).ok, true);
  assert.equal(giver.inventory[sourceIndex], null);
  assert.deepEqual(receiver.inventory.filter(entry => entry?.itemId === 'healing_potion').map(entry => entry.qty), [max, max - 1]);
  assert.deepEqual(itemCounts(giver, receiver), counts);
});

test('both ring slots and every armor slot contribute while weapon changes and dual wielding alter actual attack damage', () => {
  const hero = character();
  const baseline = computeCharacterStats(hero);
  const ring = Object.values(ITEM_DB).find(item => item.slots.includes('ring1') && item.toHit);
  assert.ok(ring, 'The playable catalog provides an accuracy ring.');
  equip(hero, ring.id, 'ring1');
  equip(hero, ring.id, 'ring2');
  assert.equal(computeCharacterStats(hero).toHit, baseline.toHit + ring.toHit * 2);
  for (const slot of ['head', 'neck', 'shoulders', 'chest', 'hands', 'waist', 'legs', 'feet', 'back']) {
    const item = Object.values(ITEM_DB).find(candidate => candidate.slots.includes(slot) && (candidate.acBonus || candidate.magicRes || candidate.toHit || candidate.damageBonus));
    assert.ok(item, `The ${slot} slot must offer meaningful equipment.`);
    const before = computeCharacterStats(hero);
    equip(hero, item.id, slot);
    const after = computeCharacterStats(hero);
    assert.equal(after.ac - before.ac, item.acBonus, `${slot} protection contributes`);
    assert.equal(after.toHit - before.toHit, item.toHit, `${slot} accuracy contributes`);
    assert.equal(after.magicRes - before.magicRes, item.magicRes, `${slot} resistance contributes`);
    assert.equal(after.minDamage - before.minDamage, item.damageBonus, `${slot} damage contributes`);
  }
  const beforeWeapons = computeCharacterStats(hero);
  equip(hero, 'longsword', 'mainhand');
  const sword = computeCharacterStats(hero);
  assert.equal(sword.minDamage - beforeWeapons.minDamage, ITEM_DB.longsword.minDamage - 1);
  assert.equal(sword.maxDamage - beforeWeapons.maxDamage, ITEM_DB.longsword.maxDamage - 6);
  equip(hero, 'dagger', 'offhand');
  const dual = computeCharacterStats(hero);
  assert.equal(dual.maxDamage, sword.maxDamage + Math.floor(ITEM_DB.dagger.maxDamage / 2));
  assert.equal(dual.toHit, sword.toHit + ITEM_DB.dagger.toHit);
  assert.equal(equipCarriedItem(hero, carry(hero, 'shield_wood'), 'head').ok, false);
});

test('potions restore only missing resources, consume one dose, and remain owned when unusable', () => {
  const hero = character();
  const index = carry(hero, 'healing_potion', 2);
  assert.equal(useCarriedItem(hero, index).ok, true);
  assert.equal(hero.hpCurrent, 30);
  assert.equal(hero.inventory[index].qty, 1);
  const full = structuredClone(hero);
  assert.equal(useCarriedItem(hero, index).ok, false);
  assert.deepEqual(hero, full);
  hero.alive = false;
  hero.hpCurrent = 0;
  assert.equal(useCarriedItem(hero, index).ok, false);
  assert.equal(hero.inventory[index].qty, 1);
  hero.alive = true;
  const mana = Object.values(ITEM_DB).find(item => item.restoresSp);
  const manaIndex = carry(hero, mana.id);
  assert.equal(useCarriedItem(hero, manaIndex).ok, true);
  assert.equal(hero.spCurrent, Math.min(15, 3 + mana.restoresSp));
  assert.equal(hero.inventory[manaIndex], null);
});

test('inventory presentation snapshots cannot mutate ownership and subscribers observe real changes only until unsubscribed', () => {
  let partyView;
  const systems = initBt3Systems({ hud: { setParty(value) { partyView = value; } }, combatView: {}, dungeon: {} });
  const first = systems.getInventorySnapshot();
  assert.equal(first.character.id, partyView.members[0].id);
  assert.equal(first.inventory.length, 24);
  assert.equal(first.capacity, 24);
  assert.equal(first.locked, false);
  const expected = structuredClone(first);
  first.equipment.mainhand = '';
  first.inventory.fill(null);
  first.character.hpCurrent = -100;
  first.character.attributes.strength = -100;
  first.party[0].name = 'Changed';
  assert.deepEqual(systems.getInventorySnapshot(), expected);
  let changes = 0;
  const unsubscribe = systems.subscribeInventory(() => { changes += 1; });
  assert.equal(systems.unequipInventoryItem(expected.character.id, 'mainhand').ok, true);
  assert.equal(changes, 1);
  assert.notEqual(partyView.members[0].damageMin, expected.stats.minDamage, 'HUD attack stats refresh with the real equipment state.');
  const removed = systems.getInventorySnapshot();
  const index = removed.inventory.findIndex(entry => entry?.itemId === expected.equipment.mainhand);
  assert.equal(systems.equipInventoryItem(expected.character.id, index, 'head').ok, false);
  assert.equal(changes, 1);
  unsubscribe();
  assert.equal(systems.equipInventoryItem(expected.character.id, index, 'mainhand').ok, true);
  assert.equal(changes, 1);
});

test('equipment previews use complete proposed stats without changing ownership or publishing mutations', () => {
  const systems = initBt3Systems({ hud: { setParty() {} }, combatView: {}, dungeon: {} });
  const characterId = 'c_warrior';
  let changes = 0;
  systems.subscribeInventory(() => { changes += 1; });
  for (const [itemId, slot] of [['halberd', 'mainhand'], ['ring_precision', 'ring1'], ['ring_precision', 'ring2']]) {
    const before = systems.getInventorySnapshot(characterId);
    const index = before.inventory.findIndex(entry => entry?.itemId === itemId);
    assert.ok(index >= 0);
    const beforeChanges = changes;
    const preview = systems.previewInventoryEquipment(characterId, index, slot);
    assert.equal(preview.ok, true);
    assert.deepEqual(systems.getInventorySnapshot(characterId), before, 'Browsing a comparison cannot mutate owned gear or stats.');
    assert.equal(changes, beforeChanges, 'A comparison never publishes a mutation.');
    if (itemId === 'halberd') {
      assert.equal(preview.equipment.offhand, '', 'The prospective loadout must include the displaced shield.');
      assert.equal(preview.stats.ac, before.stats.ac + 1, 'The comparison includes lost shield protection.');
    }
    assert.equal(systems.equipInventoryItem(characterId, index, slot).ok, true);
    assert.equal(changes, beforeChanges + 1, 'Only the committed transaction publishes a mutation.');
    const after = systems.getInventorySnapshot(characterId);
    assert.deepEqual(after.stats, preview.stats);
    assert.deepEqual(after.equipment, preview.equipment);
  }
  const before = systems.getInventorySnapshot(characterId);
  const shieldIndex = before.inventory.findIndex(entry => entry?.itemId === 'shield_wood');
  const beforeChanges = changes;
  const blocked = systems.previewInventoryEquipment(characterId, shieldIndex, 'offhand');
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.stats, before.stats);
  assert.deepEqual(systems.getInventorySnapshot(characterId), before);
  assert.equal(changes, beforeChanges);
});
