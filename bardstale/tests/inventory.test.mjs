import assert from 'node:assert/strict';
import test from 'node:test';
import { ITEM_DB, INVENTORY_CAPACITY } from '../src/items.js';
import { createInventory, createEquipment, addInventoryItem, equipCarriedItem, unequipItem, transferCarriedItem, dropCarriedItem, useCarriedItem, computeCharacterStats } from '../src/systems/inventory.js';
import { createGameSystems } from '../src/systems/core.js';
import { SPELL_LIBRARY } from '../src/rules/spells.js';

function character(id = 'hero', classType = 'Fighter') {
  return {
    id, name: id, classType, classes: [classType], level: 1, alive: true, healthStatus: 'okay',
    hpCurrent: 12, hpMax: 30,
    attributes: { strength: 13, intelligence: 13, wisdom: 13, dexterity: 14, constitution: 14, charisma: 13 },
    base: { ac: 10, thac0: 20, damageDice: '1d2', damageBonus: 0, movement: 12,
      saves: { death: 14, petrification: 15, wand: 16, breath: 17, spell: 17 } },
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
  equip(hero, 'long_sword', 'mainhand');
  equip(hero, 'shield', 'offhand');
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
  const shieldIndex = hero.inventory.findIndex(entry => entry?.itemId === 'shield');
  const withHalberd = structuredClone(hero);
  assert.equal(equipCarriedItem(hero, shieldIndex, 'offhand').ok, false);
  assert.deepEqual(hero, withHalberd);
  const swordIndex = hero.inventory.findIndex(entry => entry?.itemId === 'long_sword');
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

test('armor and shields set descending AC, magic improves attacks, and rings use the strongest protection once', () => {
  const hero = character();
  equip(hero, 'long_sword', 'mainhand');
  equip(hero, 'chain_mail', 'chest');
  equip(hero, 'shield', 'offhand');
  assert.equal(computeCharacterStats(hero).ac, 4);
  assert.equal(computeCharacterStats(hero).movement, 9);
  assert.equal(computeCharacterStats(hero).damageDice, '1d8');
  assert.equal(computeCharacterStats(hero).largeDamageDice, '1d12');
  assert.equal(computeCharacterStats(hero).thac0, 20);
  equip(hero, 'long_sword_plus1', 'mainhand');
  const enchanted = computeCharacterStats(hero);
  assert.equal(enchanted.thac0, 19);
  assert.equal(enchanted.damageBonus, 1);
  assert.deepEqual([enchanted.minDamage, enchanted.maxDamage], [2, 9]);
  equip(hero, 'ring_protection1', 'ring1');
  equip(hero, 'ring_protection3', 'ring2');
  assert.equal(computeCharacterStats(hero).ac, 1);
  assert.equal(computeCharacterStats(hero).saves.spell, 14);
  equip(hero, 'chain_mail_plus1', 'chest');
  assert.equal(computeCharacterStats(hero).ac, 3, 'Magical armor replaces ring AC protection.');
  assert.equal(computeCharacterStats(hero).saves.spell, 14, 'The ring still protects saving throws.');
  const plateWearer = character('plate');
  equip(plateWearer, 'plate_mail', 'chest');
  assert.equal(computeCharacterStats(plateWearer).movement, 6);
});

test('class restrictions reject unusable weapons and armor without losing items; clothing and offhand blades add no invented combat bonus', () => {
  for (const [classType, itemId, slot] of [['Cleric', 'long_sword', 'mainhand'], ['Magic-user', 'chain_mail', 'chest'], ['Thief', 'shield', 'offhand']]) {
    const hero = character(classType, classType);
    const index = carry(hero, itemId);
    const before = structuredClone(hero);
    assert.equal(equipCarriedItem(hero, index, slot).ok, false);
    assert.deepEqual(hero, before);
  }
  const hybrid = character('hybrid', 'Magic-user');
  hybrid.classes = ['Fighter', 'Magic-user'];
  equip(hybrid, 'long_sword', 'mainhand');
  equip(hybrid, 'chain_mail', 'chest');
  assert.equal(computeCharacterStats(hybrid).ac, 5, 'A multiclass character can use gear allowed to either class.');
  const hero = character();
  equip(hero, 'long_sword', 'mainhand');
  const before = computeCharacterStats(hero);
  equip(hero, 'dagger', 'offhand');
  equip(hero, 'plumed_helm', 'head');
  equip(hero, 'iron_gauntlets', 'hands');
  const after = computeCharacterStats(hero);
  assert.deepEqual([after.ac, after.thac0, after.damageBonus, after.minDamage, after.maxDamage],
    [before.ac, before.thac0, before.damageBonus, before.minDamage, before.maxDamage]);
  assert.ok(after.carriedWeight > before.carriedWeight);
});

test('temporary strength changes real attacks and expires without changing natural attributes', () => {
  const hero = character();
  equip(hero, 'long_sword', 'mainhand');
  hero.statusEffects.push({ id: 'strength', name: 'Strength', modifiers: { strength: 4 } });
  assert.equal(computeCharacterStats(hero).thac0, 19);
  assert.equal(computeCharacterStats(hero).maxDamage, 9);
  assert.equal(hero.attributes.strength, 13);
  hero.statusEffects = [];
  assert.equal(computeCharacterStats(hero).thac0, 20);
  assert.equal(computeCharacterStats(hero).maxDamage, 8);
});

test('Spiritual Hammer replaces attack dice and range until it expires without changing owned equipment', () => {
  const hero = character('cleric', 'Cleric');
  equip(hero, 'mace', 'mainhand');
  const owned = itemCounts(hero);
  hero.statusEffects.push({ id: 'spiritual_hammer', name: 'Spiritual Hammer', modifiers: { ...SPELL_LIBRARY.CL_SPIRITUAL_HAMMER.modifiers } });
  const conjured = computeCharacterStats(hero);
  assert.equal(conjured.damageDice, '1d4+1');
  assert.equal(conjured.largeDamageDice, '1d4');
  assert.equal(conjured.range, 3);
  assert.deepEqual([conjured.minDamage, conjured.maxDamage], [2, 5]);
  assert.equal(hero.equipment.mainhand, 'mace');
  assert.deepEqual(itemCounts(hero), owned);
  hero.statusEffects = [];
  const physical = computeCharacterStats(hero);
  assert.equal(physical.damageDice, '1d6+1');
  assert.equal(physical.largeDamageDice, '1d6');
  assert.equal(physical.range, 1);
});

test('coins reduce movement within the carrying limit and overweight item pickups and trades leave ownership unchanged', () => {
  const hero = character();
  hero.coins = { gold: 1500 };
  assert.equal(computeCharacterStats(hero).maxCarryWeight, 1600);
  assert.equal(computeCharacterStats(hero).movement, 3);
  const giver = character('giver');
  const index = carry(giver, 'halberd');
  const before = structuredClone([giver, hero]);
  assert.equal(addInventoryItem(hero, 'halberd').ok, false);
  assert.equal(transferCarriedItem(giver, index, hero).ok, false);
  assert.deepEqual([giver, hero], before, 'Weight rejection must preserve the loot and both inventories.');
  hero.coins.gold = 0;
  assert.equal(computeCharacterStats(hero).movement, 12);
  assert.equal(transferCarriedItem(giver, index, hero).ok, true);
  assert.equal(computeCharacterStats(hero).carriedWeight, 175);
});

test('item knowledge survives trades and equipment changes, distinct knowledge does not merge, and dropping removes a whole stack', () => {
  const giver = character('giver');
  const receiver = character('receiver');
  const knowledge = { identified: false, magicalVisible: true };
  assert.equal(addInventoryItem(giver, 'healing_potion', 3, knowledge).ok, true);
  carry(receiver, 'healing_potion', 2);
  assert.equal(transferCarriedItem(giver, 0, receiver).ok, true);
  const potions = receiver.inventory.filter(entry => entry?.itemId === 'healing_potion');
  assert.equal(potions.length, 2, 'A known potion and an unknown magical potion must retain separate identities.');
  assert.deepEqual(potions[1], { ...knowledge, itemId: 'healing_potion', qty: 3 });
  const counts = itemCounts(giver, receiver);
  assert.equal(dropCarriedItem(receiver, receiver.inventory.indexOf(potions[1])).ok, true);
  assert.equal(itemCounts(giver, receiver).healing_potion, counts.healing_potion - 3);
  assert.deepEqual(receiver.inventory.filter(Boolean), [{ identified: true, itemId: 'healing_potion', qty: 2 }]);
  assert.equal(addInventoryItem(receiver, 'long_sword_plus1', 1, knowledge).ok, true);
  const swordIndex = receiver.inventory.findIndex(entry => entry?.itemId === 'long_sword_plus1');
  assert.equal(equipCarriedItem(receiver, swordIndex, 'mainhand').ok, true);
  assert.equal(unequipItem(receiver, 'mainhand').ok, true);
  assert.deepEqual(receiver.inventory.find(entry => entry?.itemId === 'long_sword_plus1'),
    { ...knowledge, itemId: 'long_sword_plus1', qty: 1 });
});

test('healing potions roll their published dice, preserve unused doses, and heal dying companions without raising the dead', (t) => {
  t.mock.method(Math, 'random', () => 0);
  const hero = character();
  const index = carry(hero, 'healing_potion', 2);
  assert.equal(useCarriedItem(hero, index).ok, true);
  assert.equal(hero.hpCurrent, 16, 'Minimum healing is 2d4+2 = 4.');
  assert.equal(hero.inventory[index].qty, 1);
  hero.hpCurrent = hero.hpMax;
  const full = structuredClone(hero);
  assert.equal(useCarriedItem(hero, index).ok, false);
  assert.deepEqual(hero, full);
  hero.alive = false;
  hero.healthStatus = 'dead';
  hero.hpCurrent = -10;
  assert.equal(useCarriedItem(hero, index).ok, false);
  assert.equal(hero.inventory[index].qty, 1);
  hero.healthStatus = 'dying';
  hero.hpCurrent = -1;
  assert.equal(useCarriedItem(hero, index).ok, true);
  assert.equal(hero.hpCurrent, 3);
  assert.equal(hero.alive, true);
  assert.equal(hero.healthStatus, 'okay');
});

test('inventory presentation snapshots cannot mutate ownership and subscribers observe real changes only until unsubscribed', () => {
  let partyView;
  const systems = createGameSystems({ hud: { setParty(value) { partyView = value; } }, combatView: {}, dungeon: { encounters: null, services: [] }, onPartyDefeated: async () => {} });
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
  assert.notEqual(partyView.members[0].damageDice, expected.stats.damageDice, 'HUD attack stats refresh with the real equipment state.');
  const removed = systems.getInventorySnapshot();
  const index = removed.inventory.findIndex(entry => entry?.itemId === expected.equipment.mainhand);
  assert.equal(systems.equipInventoryItem(expected.character.id, index, 'head').ok, false);
  assert.equal(changes, 1);
  unsubscribe();
  assert.equal(systems.equipInventoryItem(expected.character.id, index, 'mainhand').ok, true);
  assert.equal(changes, 1);
});

test('equipment previews use complete proposed stats without changing ownership or publishing mutations', () => {
  const systems = createGameSystems({ hud: { setParty() {} }, combatView: {}, dungeon: { encounters: null, services: [] }, onPartyDefeated: async () => {} });
  const characterId = systems.getInventorySnapshot().character.id;
  let changes = 0;
  systems.subscribeInventory(() => { changes += 1; });
  for (const [itemId, slot] of [['halberd', 'mainhand']]) {
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
  const shieldIndex = before.inventory.findIndex(entry => entry?.itemId === 'shield');
  const beforeChanges = changes;
  const blocked = systems.previewInventoryEquipment(characterId, shieldIndex, 'offhand');
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.stats, before.stats);
  assert.deepEqual(systems.getInventorySnapshot(characterId), before);
  assert.equal(changes, beforeChanges);
});
