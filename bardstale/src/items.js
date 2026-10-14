export const INVENTORY_CAPACITY = 24;

export const EQUIPMENT_SLOTS = Object.freeze([
  ['head', 'Head'], ['neck', 'Neck'], ['shoulders', 'Shoulders'],
  ['chest', 'Chest'], ['hands', 'Hands'], ['waist', 'Waist'],
  ['legs', 'Legs'], ['feet', 'Feet'], ['ring1', 'Ring 1'],
  ['ring2', 'Ring 2'], ['back', 'Back'],
  ['mainhand', 'Main hand'], ['offhand', 'Off hand'],
].map(([id, label]) => Object.freeze({ id, label })));

// Factual combat values: SSI Adventurer's Journal pp.35,38 and GBC's DOS ITEMS dump.
// Extra clothing slots change appearance; body armor supplies their protection.
const fighter = ['Fighter'];
const martial = ['Fighter', 'Thief'];
const blunt = ['Fighter', 'Cleric'];
const all = ['Fighter', 'Cleric', 'Magic-user', 'Thief'];
const rings = ['ring1', 'ring2'];
const weapons = [
  ['short_sword', 'Short Sword', '1d6', '1d8', 35, 8, 1, martial, 'shortSword'],
  ['long_sword', 'Long Sword', '1d8', '1d12', 60, 15, 1, martial, 'sword'],
  ['dagger', 'Dagger', '1d4', '1d3', 10, 2, 1, ['Fighter', 'Magic-user', 'Thief'], 'dagger'],
  ['quarterstaff', 'Quarterstaff', '1d6', '1d6', 50, 1, 2, ['Fighter', 'Cleric', 'Magic-user'], 'staff'],
  ['spear', 'Spear', '1d6', '1d8', 50, 1, 2, fighter, 'spear'],
  ['halberd', 'Halberd', '1d10', '2d6', 175, 9, 2, fighter, 'halberd'],
  ['battle_axe', 'Battle Axe', '1d8', '1d8', 75, 5, 1, fighter, 'axe'],
  ['mace', 'Mace', '1d6+1', '1d6', 100, 8, 1, blunt, 'mace'],
  ['flail', 'Flail', '1d6+1', '2d4', 150, 3, 1, blunt, 'flail'],
  ['long_bow', 'Long Bow', '1d6', '1d6', 100, 60, 2, fighter, 'bow'],
].map(([id, name, damageDice, largeDamageDice, weight, valueGold, handedness, classes, model]) => ({
  id, name, slots: handedness === 1 ? ['mainhand', 'offhand'] : ['mainhand'],
  damageDice, largeDamageDice, weight, valueGold, handedness, classes,
  strengthBonus: id !== 'long_bow', ranged: id === 'long_bow', range: id === 'long_bow' ? 21 : 1,
  ...(id === 'long_bow' ? { ammoType: 'arrow' } : {}), visuals: { mainhand: model },
  description: `${name}. ${damageDice} damage; ${largeDamageDice} against large creatures.${handedness === 2 ? ' Requires both hands.' : ''}`,
}));
const armor = [
  ['leather_armor', 'Leather Armor', 8, 12, 150, 5, 'leather', 'leather'],
  ['padded_armor', 'Padded Armor', 8, 9, 100, 4, 'robe', 'sleeves'],
  ['studded_leather', 'Studded Leather', 7, 9, 200, 15, 'leather', 'leather'],
  ['ring_mail', 'Ring Mail', 7, 9, 250, 30, 'chain', 'chain'],
  ['scale_mail', 'Scale Mail', 6, 6, 400, 45, 'chain', 'chain'],
  ['chain_mail', 'Chain Mail', 5, 9, 300, 75, 'chain', 'chain'],
  ['splint_mail', 'Splint Mail', 4, 6, 400, 80, 'steel', 'plate'],
  ['banded_mail', 'Banded Mail', 4, 9, 350, 90, 'steel', 'plate'],
  ['plate_mail', 'Plate Mail', 3, 6, 450, 400, 'steel', 'plate'],
].map(([id, name, armorClass, maxMovement, weight, valueGold, torso, arms]) => ({
  id, name, slots: ['chest'], armorClass, maxMovement, weight, valueGold,
  preventsThiefSkills: id !== 'leather_armor',
  classes: id === 'leather_armor' ? ['Fighter', 'Cleric', 'Thief'] : blunt,
  visuals: { torso, arms }, description: `Armor class ${armorClass}; maximum movement ${maxMovement}.`,
}));
const cosmetic = [
  ['iron_helm', 'Iron Great Helm', 'head', 'head', 'knight', 30],
  ['plumed_helm', 'Plumed Great Helm', 'head', 'head', 'plumed', 30],
  ['leather_hood', 'Leather Hood', 'head', 'head', 'hood', 10],
  ['wizard_hat', 'Wizard Hat', 'head', 'head', 'wizardHat', 10],
  ['circlet', 'Jeweled Circlet', 'head', 'head', 'crown', 10],
  ['iron_pauldrons', 'Steel Pauldrons', 'shoulders', 'shoulders', 'steel', 30],
  ['leather_pauldrons', 'Leather Spaulders', 'shoulders', 'shoulders', 'leather', 10],
  ['cloth_mantle', 'Woven Mantle', 'shoulders', 'shoulders', 'cloth', 10],
  ['iron_gauntlets', 'Steel Gauntlets', 'hands', 'hands', 'steel', 20],
  ['leather_gloves', 'Leather Gloves', 'hands', 'hands', 'leather', 10],
  ['silk_gloves', 'Silk Gloves', 'hands', 'hands', 'cloth', 2],
  ['leather_belt', 'Leather Belt', 'waist', 'waist', 'leather', 5],
  ['war_belt', 'Gilded War Belt', 'waist', 'waist', 'gold', 10],
  ['leather_trousers', 'Travel Trousers', 'legs', 'legs', 'ranger', 20],
  ['plate_leggings', 'Plate Leggings', 'legs', 'legs', 'armored', 40],
  ['robe_skirt', 'Long Robe Skirt', 'legs', 'legs', 'robe', 10],
  ['battle_kilt', 'Battle Kilt', 'legs', 'legs', 'skirt', 10],
  ['leather_boots', 'Leather Boots', 'feet', 'feet', 'leather', 20],
  ['iron_boots', 'Steel Sabatons', 'feet', 'feet', 'steel', 30],
  ['cloth_shoes', 'Cloth Shoes', 'feet', 'feet', 'cloth', 5],
  ['ruby_pendant', 'Ruby Pendant', 'neck', 'neck', 'ruby', 2],
  ['sapphire_pendant', 'Sapphire Pendant', 'neck', 'neck', 'sapphire', 2],
  ['star_amulet', 'Star Amulet', 'neck', 'neck', 'sapphire', 2],
  ['travel_cape', 'Traveler’s Cape', 'back', 'back', 'cape', 10],
  ['leather_pack', 'Leather Backpack', 'back', 'back', 'backpack', 20],
  ['lute', 'Traveler’s Lute', 'back', 'back', 'lute', 10],
].map(([id, name, slot, part, model, weight]) => ({
  id, name, slots: [slot], weight, classes: all, cosmetic: true, visuals: { [part]: model },
  description: 'Changes the visible character outfit. Body armor supplies combat protection.',
  ...(id === 'star_amulet' ? { effect: { kind: 'glow', color: '#b48aff', accent: '#ebe1ff', region: 'crystal' } } : {}),
}));
const shield = { id: 'shield', name: 'Shield', slots: ['offhand'], classes: blunt, shieldBonus: 1, weight: 50, valueGold: 10, visuals: { offhand: 'round' }, description: 'Improves armor class by one. Requires one hand.' };
const byWeapon = Object.fromEntries(weapons.map(item => [item.id, item]));
const enchantWeapon = (id, name, base, magicBonus, effect) => ({
  ...byWeapon[base], id, name, magicBonus, valueGold: 2000,
  description: `${name}. +${magicBonus} to hit and damage.`, ...(effect ? { effect } : {}),
});
const definitions = [
  ...weapons, ...armor, ...cosmetic, shield,
  { ...armor.find(item => item.id === 'chain_mail'), id: 'chain_mail_plus1', name: 'Chain Mail +1', magicBonus: 1, maxMovement: 12, valueGold: 3500, description: 'Magical chain mail. Armor class 4; does not combine with a protection ring’s armor bonus.' },
  { id: 'robes', name: 'Robes', slots: ['chest'], cosmetic: true, weight: 20, classes: all, visuals: { torso: 'robe', arms: 'sleeves' }, description: 'Cloth robes with no armor restriction or added protection.' },
  { ...shield, id: 'shield_plus1', name: 'Shield +1', magicBonus: 1, shieldBonus: 2, valueGold: 2500, visuals: { offhand: 'kite' }, effect: { kind: 'mist', color: '#a262ff', accent: '#e598ff', region: 'surface' }, description: 'A shield +1 with violet wisps. Improves armor class by two.' },
  enchantWeapon('long_sword_plus1', 'Long Sword +1', 'long_sword', 1),
  enchantWeapon('long_sword_flame_tongue', 'Long Sword +2, Flame Tongue', 'long_sword', 2, { kind: 'flame', color: '#ff6b19', accent: '#ffe493', region: 'blade' }),
  enchantWeapon('dagger_plus1', 'Dagger +1', 'dagger', 1, { kind: 'mist', color: '#66ed68', accent: '#c9ff82', region: 'blade' }),
  enchantWeapon('mace_plus1', 'Mace +1', 'mace', 1, { kind: 'mist', color: '#52cfff', accent: '#c1f5ff', region: 'surface' }),
  enchantWeapon('quarterstaff_plus1', 'Quarterstaff +1', 'quarterstaff', 1, { kind: 'orbit', color: '#66ddff', accent: '#bf7cff', region: 'crystal' }),
  ...[1, 2, 3].map(bonus => ({ id: `ring_protection${bonus}`, name: `Ring of Protection +${bonus}`, slots: rings, classes: all, protectionBonus: bonus, weight: 1, valueGold: bonus * 5000, visuals: { ring: bonus === 1 ? 'gold' : bonus === 2 ? 'ruby' : 'sapphire' }, description: `Improves AC and saving throws by ${bonus}. Only the strongest ring applies.` })),
  { id: 'magic_missile_scroll', name: 'Magic-user Scroll: Magic Missile', slots: [], scrollSpell: 'MU_MAGIC_MISSILE', scrollClass: 'Magic-user', requiresReadMagic: true, casterLevel: 6, weight: 1, valueGold: 100, description: 'Read Magic deciphers this single-use arcane spell. It can be cast or scribed.' },
  { id: 'fireball_scroll', name: 'Magic-user Scroll: Fireball', slots: [], scrollSpell: 'MU_FIREBALL', scrollClass: 'Magic-user', requiresReadMagic: true, casterLevel: 6, weight: 1, valueGold: 300, description: 'A single-use Fireball spell written in arcane script.' },
  { id: 'restoration_scroll', name: 'Clerical Scroll: Restoration', slots: [], scrollSpell: 'CL_RESTORATION', scrollClass: 'Cleric', casterLevel: 6, weight: 1, valueGold: 2100, description: 'A cleric can use this scroll to restore a drained level.' },
  { id: 'arrow', name: 'Arrow', slots: [], stackMax: 250, weight: 2, valueGold: 1, description: 'Ammunition for a bow. One arrow is consumed per attack.' },
  { id: 'healing_potion', name: 'Potion of Healing', slots: [], healingDice: '2d4+2', stackMax: 9, weight: 20, valueGold: 400, description: 'Restores 2d4+2 hit points. Cannot raise the dead.' },
  { id: 'extra_healing_potion', name: 'Potion of Extra Healing', slots: [], healingDice: '3d8', stackMax: 9, weight: 20, valueGold: 800, description: 'Restores 3d8 hit points. Cannot raise the dead.' },
];

export const ITEM_DB = Object.freeze(Object.fromEntries(definitions.map(item => [item.id, Object.freeze({
  weight: 0, stackMax: 1, handedness: 1, range: 1, magicBonus: 0,
  ...item, slots: Object.freeze([...item.slots]), classes: Object.freeze([...(item.classes || all)]),
  visuals: Object.freeze({ ...item.visuals }),
  ...(item.effect ? { effect: Object.freeze({ ...item.effect }) } : {}),
})])));
