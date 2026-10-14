import { ITEM_DB, EQUIPMENT_SLOTS, INVENTORY_CAPACITY } from '../items.js';
import { strengthModifiers, dexterityModifiers } from '../rules/classes.js';
import { rollDice, diceBounds } from '../rules/dice.js';

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

function itemMetadata(entry) {
  const { itemId, qty, ...metadata } = entry;
  return metadata;
}

function sameMetadata(left, right) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key]);
}

function putItem(inventory, itemId, quantity, metadata = {}) {
  const item = ITEM_DB[itemId];
  const properties = itemMetadata({ identified: !item.requiresReadMagic, ...metadata });
  for (const entry of inventory) {
    if (!entry || entry.itemId !== itemId || !sameMetadata(itemMetadata(entry), properties)) continue;
    const added = Math.min(quantity, item.stackMax - entry.qty);
    entry.qty += added;
    quantity -= added;
    if (!quantity) return true;
  }
  for (let index = 0; index < inventory.length && quantity; index += 1) {
    if (inventory[index]) continue;
    const qty = Math.min(quantity, item.stackMax);
    inventory[index] = { ...properties, itemId, qty };
    quantity -= qty;
  }
  return quantity === 0;
}

function removeOne(inventory, index) {
  inventory[index].qty -= 1;
  if (inventory[index].qty === 0) inventory[index] = null;
}

export function addInventoryItem(character, itemId, quantity = 1, metadata = {}) {
  const item = ITEM_DB[itemId];
  if (!item || !Number.isInteger(quantity) || quantity < 1) return result(false, 'Invalid item or quantity.');
  const inventory = copyInventory(character.inventory);
  if (!putItem(inventory, itemId, quantity, metadata)) return result(false, `${character.name}'s pack is full.`);
  const stats = computeCharacterStats({ ...character, inventory });
  if (stats.carriedWeight > stats.maxCarryWeight) {
    return result(false, `${character.name} cannot carry that much weight.`);
  }
  character.inventory = inventory;
  return result(true, `${item.name} added to ${character.name}'s pack.`);
}

export function equipCarriedItem(character, index, slot) {
  const entry = entryAt(character, index);
  if (!entry) return result(false, 'Choose an item from the pack.');
  const item = ITEM_DB[entry.itemId];
  if (!slotIds.has(slot) || !item.slots.includes(slot)) return result(false, `${item.name} cannot be equipped in that slot.`);
  if (!character.classes.some(classType => item.classes.includes(classType))) return result(false, `${character.classes.join('/')} cannot use ${item.name}.`);
  if (slot === 'offhand' && ITEM_DB[character.equipment.mainhand]?.handedness === 2) {
    return result(false, 'Unequip the two-handed mainhand weapon before using the offhand.');
  }
  const inventory = copyInventory(character.inventory);
  const equipment = { ...character.equipment };
  const equipmentMetadata = { ...character.equipmentMetadata };
  removeOne(inventory, index);
  const returnedItems = [{ itemId: equipment[slot], metadata: equipmentMetadata[slot] }];
  equipment[slot] = item.id;
  equipmentMetadata[slot] = itemMetadata(entry);
  if (slot === 'mainhand' && item.handedness === 2 && equipment.offhand) {
    returnedItems.push({ itemId: equipment.offhand, metadata: equipmentMetadata.offhand });
    equipment.offhand = '';
    delete equipmentMetadata.offhand;
  }
  for (const returned of returnedItems.filter(entry => entry.itemId)) {
    if (!putItem(inventory, returned.itemId, 1, returned.metadata)) return result(false, 'Make space in the pack for the equipment being removed.');
  }
  character.inventory = inventory;
  character.equipment = equipment;
  character.equipmentMetadata = equipmentMetadata;
  return result(true, `${character.name} equipped ${item.name}.`);
}

export function unequipItem(character, slot) {
  if (!slotIds.has(slot)) return result(false, 'Unknown equipment slot.');
  const itemId = character.equipment[slot];
  if (!itemId) return result(false, 'That equipment slot is empty.');
  const inventory = copyInventory(character.inventory);
  if (!putItem(inventory, itemId, 1, character.equipmentMetadata?.[slot])) return result(false, 'Make space in the pack before removing equipment.');
  character.inventory = inventory;
  character.equipment = { ...character.equipment, [slot]: '' };
  character.equipmentMetadata = { ...character.equipmentMetadata };
  delete character.equipmentMetadata[slot];
  return result(true, `${ITEM_DB[itemId].name} moved to the pack.`);
}

export function transferCarriedItem(source, index, destination) {
  if (source === destination || source.id === destination.id) return result(false, 'Choose another party member.');
  const entry = entryAt(source, index);
  if (!entry) return result(false, 'Choose an item from the pack.');
  const inventory = copyInventory(destination.inventory);
  if (!putItem(inventory, entry.itemId, entry.qty, itemMetadata(entry))) return result(false, `${destination.name}'s pack has no room for that stack.`);
  const stats = computeCharacterStats({ ...destination, inventory });
  if (stats.carriedWeight > stats.maxCarryWeight) {
    return result(false, `${destination.name} cannot carry that much weight.`);
  }
  destination.inventory = inventory;
  source.inventory = copyInventory(source.inventory);
  source.inventory[index] = null;
  return result(true, `${ITEM_DB[entry.itemId].name} given to ${destination.name}.`);
}

export function dropCarriedItem(character, index) {
  const entry = entryAt(character, index);
  if (!entry) return result(false, 'Choose an item from the pack.');
  character.inventory = copyInventory(character.inventory);
  character.inventory[index] = null;
  return result(true, `${character.name} dropped ${entry.qty} × ${ITEM_DB[entry.itemId].name}.`);
}

export function useCarriedItem(character, index) {
  const entry = entryAt(character, index);
  if (!entry) return result(false, 'Choose an item from the pack.');
  const item = ITEM_DB[entry.itemId];
  if (!item.healingDice) return result(false, 'That item cannot be consumed.');
  if (character.healthStatus === 'dead' || character.healthStatus === 'gone') return result(false, 'A potion cannot raise the dead.');
  if (character.hpCurrent >= character.hpMax) return result(false, 'Already fully restored; the potion was kept.');
  const healed = Math.min(rollDice(item.healingDice), character.hpMax - character.hpCurrent);
  character.hpCurrent += healed;
  if (character.hpCurrent > 0) {
    character.alive = true;
    character.healthStatus = 'okay';
  }
  character.inventory = copyInventory(character.inventory);
  removeOne(character.inventory, index);
  return result(true, `${character.name} recovered ${healed} HP.`);
}

export function consumeWeaponAmmo(character) {
  const weapon = getEquippedItem(character, 'mainhand');
  if (!weapon?.ammoType) return result(true, '');
  const index = character.inventory.findIndex(entry => entry?.itemId === weapon.ammoType && entry.qty > 0);
  if (index < 0) return result(false, `${character.name} has no arrows.`);
  character.inventory = copyInventory(character.inventory);
  removeOne(character.inventory, index);
  return result(true, '');
}

export function getEquippedItem(character, slot) {
  return ITEM_DB[character.equipment[slot]] || null;
}

export function effectiveAttributes(character) {
  const attributes = { ...character.attributes };
  for (const status of character.statusEffects) {
    for (const key of Object.keys(attributes)) attributes[key] += status.modifiers?.[key] || 0;
    if (status.modifiers?.minStrength) attributes.strength = Math.max(attributes.strength, status.modifiers.minStrength);
  }
  for (const key of Object.keys(attributes)) attributes[key] = Math.max(3, Math.min(25, attributes[key]));
  return attributes;
}

export function computeCharacterStats(character) {
  const { base } = character;
  const mainhand = getEquippedItem(character, 'mainhand');
  const offhand = getEquippedItem(character, 'offhand');
  const body = getEquippedItem(character, 'chest');
  const attributes = effectiveAttributes(character);
  const strength = strengthModifiers({ ...character, attributes });
  const dexterity = dexterityModifiers(attributes.dexterity);
  let damageDice = mainhand?.damageDice || base.damageDice;
  let largeDamageDice = mainhand?.largeDamageDice || base.largeDamageDice || damageDice;
  let range = mainhand?.range || 1;
  let ac = Math.min(base.ac, body?.armorClass ?? base.ac) + dexterity.ac - (body?.magicBonus || 0) - (offhand?.shieldBonus || 0);
  let thac0 = base.thac0 - (mainhand?.magicBonus || 0) - (mainhand?.ranged ? dexterity.missileToHit : strength.toHit);
  let damageBonus = (base.damageBonus || 0) + (mainhand?.magicBonus || 0) + (mainhand?.strengthBonus || !mainhand ? strength.damage : 0);
  let movement = Math.min(base.movement, body?.maxMovement ?? base.movement);
  let protection = 0;
  let carriedWeight = Object.values(character.coins || {}).reduce((total, count) => total + count, 0);
  const saves = { ...base.saves };
  for (const slot of slotIds) {
    const item = getEquippedItem(character, slot);
    if (!item) continue;
    carriedWeight += item.weight;
    protection = Math.max(protection, item.protectionBonus || 0);
  }
  for (const entry of character.inventory) if (entry) carriedWeight += ITEM_DB[entry.itemId].weight * entry.qty;
  if (!body?.magicBonus) ac -= protection;
  for (const key of Object.keys(saves)) saves[key] -= protection;
  const over = Math.max(0, carriedWeight - strength.weightAllowance);
  if (over > 1024) movement = Math.min(movement, 3);
  else if (over > 768) movement = Math.min(movement, 6);
  else if (over > 512) movement = Math.min(movement, 9);
  for (const status of character.statusEffects) {
    const modifiers = status.modifiers || {};
    if (modifiers.weaponDice) damageDice = modifiers.weaponDice;
    if (modifiers.weaponLargeDice) largeDamageDice = modifiers.weaponLargeDice;
    if (modifiers.weaponRange != null) range = modifiers.weaponRange;
    if (modifiers.acBase != null) ac = Math.min(ac, modifiers.acBase + dexterity.ac);
    ac += modifiers.ac || 0;
    thac0 += modifiers.thac0 || 0;
    damageBonus += modifiers.damageBonus || 0;
    movement *= modifiers.movementMultiplier ?? 1;
    for (const key of Object.keys(saves)) saves[key] += modifiers.saves || 0;
  }
  const bounds = diceBounds(damageDice);
  return { ac, thac0, damageDice, largeDamageDice, damageBonus, range, attributes,
    minDamage: Math.max(1, bounds.min + damageBonus), maxDamage: Math.max(1, bounds.max + damageBonus),
    movement: Math.max(1, Math.floor(movement)), saves, magicRes: base.magicRes || 0, carriedWeight,
    maxCarryWeight: strength.carryWeight, weightAllowance: strength.weightAllowance };
}
