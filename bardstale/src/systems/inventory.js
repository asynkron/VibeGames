import { ITEM_DB, EQUIPMENT_SLOTS, INVENTORY_CAPACITY } from '../items.js';

const slotIds = new Set(EQUIPMENT_SLOTS.map(slot => slot.id));
const result = (ok, message) => ({ ok, message });

export function createInventory() {
  return Array(INVENTORY_CAPACITY).fill(null);
}

export function createEquipment() {
  return Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot.id, '']));
}

function copyInventory(inventory) {
  return inventory.map(entry => entry ? { ...entry } : null);
}

function entryAt(character, index) {
  return Number.isInteger(index) && index >= 0 && index < INVENTORY_CAPACITY
    ? character.inventory[index] : null;
}

function putItem(inventory, itemId, quantity) {
  const item = ITEM_DB[itemId];
  for (const entry of inventory) {
    if (!entry || entry.itemId !== itemId) continue;
    const added = Math.min(quantity, item.stackMax - entry.qty);
    entry.qty += added;
    quantity -= added;
    if (!quantity) return true;
  }
  for (let index = 0; index < inventory.length && quantity; index += 1) {
    if (inventory[index]) continue;
    const qty = Math.min(quantity, item.stackMax);
    inventory[index] = { itemId, qty };
    quantity -= qty;
  }
  return quantity === 0;
}

function removeOne(inventory, index) {
  inventory[index].qty -= 1;
  if (inventory[index].qty === 0) inventory[index] = null;
}

export function addInventoryItem(character, itemId, quantity = 1) {
  const item = ITEM_DB[itemId];
  if (!item || !Number.isInteger(quantity) || quantity < 1) return result(false, 'Invalid item or quantity.');
  const inventory = copyInventory(character.inventory);
  if (!putItem(inventory, itemId, quantity)) return result(false, `${character.name}'s pack is full.`);
  character.inventory = inventory;
  return result(true, `${item.name} added to ${character.name}'s pack.`);
}

export function equipCarriedItem(character, index, slot) {
  const entry = entryAt(character, index);
  if (!entry) return result(false, 'Choose an item from the pack.');
  const item = ITEM_DB[entry.itemId];
  if (!slotIds.has(slot) || !item.slots.includes(slot)) return result(false, `${item.name} cannot be equipped in that slot.`);
  if (slot === 'offhand' && ITEM_DB[character.equipment.mainhand]?.handedness === 2) {
    return result(false, 'Unequip the two-handed mainhand weapon before using the offhand.');
  }
  const inventory = copyInventory(character.inventory);
  const equipment = { ...character.equipment };
  removeOne(inventory, index);
  const returnedItems = [equipment[slot]];
  equipment[slot] = item.id;
  if (slot === 'mainhand' && item.handedness === 2 && equipment.offhand) {
    returnedItems.push(equipment.offhand);
    equipment.offhand = '';
  }
  for (const returnedId of returnedItems.filter(Boolean)) {
    if (!putItem(inventory, returnedId, 1)) return result(false, 'Make space in the pack for the equipment being removed.');
  }
  character.inventory = inventory;
  character.equipment = equipment;
  return result(true, `${character.name} equipped ${item.name}.`);
}

export function unequipItem(character, slot) {
  if (!slotIds.has(slot)) return result(false, 'Unknown equipment slot.');
  const itemId = character.equipment[slot];
  if (!itemId) return result(false, 'That equipment slot is empty.');
  const inventory = copyInventory(character.inventory);
  if (!putItem(inventory, itemId, 1)) return result(false, 'Make space in the pack before removing equipment.');
  character.inventory = inventory;
  character.equipment = { ...character.equipment, [slot]: '' };
  return result(true, `${ITEM_DB[itemId].name} moved to the pack.`);
}

export function transferCarriedItem(source, index, destination) {
  if (source === destination || source.id === destination.id) return result(false, 'Choose another party member.');
  const entry = entryAt(source, index);
  if (!entry) return result(false, 'Choose an item from the pack.');
  const inventory = copyInventory(destination.inventory);
  if (!putItem(inventory, entry.itemId, entry.qty)) return result(false, `${destination.name}'s pack has no room for that stack.`);
  destination.inventory = inventory;
  source.inventory = copyInventory(source.inventory);
  source.inventory[index] = null;
  return result(true, `${ITEM_DB[entry.itemId].name} given to ${destination.name}.`);
}

export function useCarriedItem(character, index) {
  const entry = entryAt(character, index);
  if (!entry) return result(false, 'Choose an item from the pack.');
  const item = ITEM_DB[entry.itemId];
  if (!item.heals && !item.restoresSp) return result(false, 'That item cannot be consumed.');
  if (!character.alive) return result(false, 'A fallen character cannot drink a potion.');
  const healed = Math.min(item.heals || 0, character.hpMax - character.hpCurrent);
  const restored = Math.min(item.restoresSp || 0, character.spMax - character.spCurrent);
  if (!healed && !restored) return result(false, 'Already fully restored; the potion was kept.');
  character.hpCurrent += healed;
  character.spCurrent += restored;
  character.inventory = copyInventory(character.inventory);
  removeOne(character.inventory, index);
  const changes = [healed && `${healed} HP`, restored && `${restored} SP`].filter(Boolean).join(' and ');
  return result(true, `${character.name} recovered ${changes}.`);
}

export function getEquippedItem(character, slot) {
  return ITEM_DB[character.equipment[slot]] || null;
}

export function computeCharacterStats(character) {
  const { base } = character;
  const mainhand = getEquippedItem(character, 'mainhand');
  const offhand = getEquippedItem(character, 'offhand');
  let ac = base.ac;
  let toHit = base.toHit;
  let minDamage = mainhand?.maxDamage ? mainhand.minDamage + base.weaponDamageBonus : base.damage.min;
  let maxDamage = mainhand?.maxDamage ? mainhand.maxDamage + base.weaponDamageBonus : base.damage.max;
  let magicRes = base.magicResist;
  let critBonus = 0;
  for (const slot of slotIds) {
    const item = getEquippedItem(character, slot);
    if (!item) continue;
    ac += item.acBonus;
    toHit += item.toHit;
    magicRes += item.magicRes;
    minDamage += item.damageBonus;
    maxDamage += item.damageBonus;
  }
  if (offhand?.maxDamage) {
    minDamage += Math.floor(offhand.minDamage / 2);
    maxDamage += Math.floor(offhand.maxDamage / 2);
  }
  for (const status of character.statusEffects) {
    const modifiers = status.modifiers || {};
    ac += modifiers.ac || 0;
    toHit += modifiers.toHit || 0;
    minDamage += modifiers.damageBonus || 0;
    maxDamage += modifiers.damageBonus || 0;
    magicRes += modifiers.magicResist || 0;
    critBonus += modifiers.critBonus || 0;
  }
  if (character.classType === 'Monk' && !character.equipment.chest) ac -= Math.max(1, Math.floor(character.level / 2));
  if (character.classType === 'Monk' && !mainhand) {
    const scale = Math.max(4, 6 + character.level);
    minDamage = Math.max(minDamage, Math.floor(scale / 2));
    maxDamage = Math.max(maxDamage, scale);
  }
  return { ac, toHit, minDamage: Math.max(1, minDamage), maxDamage: Math.max(1, maxDamage), magicRes, critBonus };
}
