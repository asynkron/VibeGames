import { CLASS_DATA } from './classes.js';
import { rollDice } from './dice.js';

export const ABILITIES = Object.freeze(['strength', 'intelligence', 'wisdom', 'dexterity', 'constitution', 'charisma']);
export const ALIGNMENTS = Object.freeze(['Lawful good', 'Lawful neutral', 'Lawful evil', 'Neutral good', 'True neutral', 'Neutral evil', 'Chaotic good', 'Chaotic neutral', 'Chaotic evil']);
const all = ['Fighter', 'Cleric', 'Magic-user', 'Thief'];
// SSI Rule Book rear-cover table, with the Quick Start Card's halfling correction.
export const RACE_RULES = Object.freeze({
  Human: { classes: all, minimum: [3,3,3,3,3,3], maximum: [18,18,18,18,18,18], exceptionalMaximum: 100 },
  Dwarf: { classes: ['Fighter','Thief'], minimum: [8,3,3,3,12,3], maximum: [18,18,18,17,19,16], exceptionalMaximum: 99, caps: { Fighter: 9 } },
  Elf: { classes: ['Fighter','Magic-user','Thief'], minimum: [3,8,3,7,6,8], maximum: [18,18,18,19,18,18], exceptionalMaximum: 75, caps: { Fighter: 7, 'Magic-user': 11 } },
  Gnome: { classes: ['Fighter','Thief'], minimum: [6,7,3,3,8,3], maximum: [18,18,18,18,18,18], exceptionalMaximum: 50, caps: { Fighter: 6 } },
  'Half-elf': { classes: all, minimum: [3,4,3,6,6,3], maximum: [18,18,18,18,18,18], exceptionalMaximum: 90, caps: { Fighter: 8, Cleric: 5, 'Magic-user': 8 } },
  Halfling: { classes: ['Fighter','Thief'], minimum: [6,6,3,8,10,3], maximum: [17,18,17,18,19,18], exceptionalMaximum: 0, caps: { Fighter: 6 } },
});
const prime = { Fighter: 'strength', Cleric: 'wisdom', 'Magic-user': 'intelligence', Thief: 'dexterity' };

export function getCharacterCreationOptions() {
  return { races: Object.keys(RACE_RULES), classes: Object.keys(CLASS_DATA), alignments: [...ALIGNMENTS], abilities: [...ABILITIES], raceRules: RACE_RULES };
}

export function availableClasses(race) { return [...(RACE_RULES[race]?.classes || [])]; }

export function maximumLevel(race, classType) {
  return Math.min(CLASS_DATA[classType].maxLevel, RACE_RULES[race].caps?.[classType] ?? CLASS_DATA[classType].maxLevel);
}

export function rollAbilityScores(race = 'Human', classType = 'Fighter') {
  const classes = Array.isArray(classType) ? classType : [classType];
  const rules = RACE_RULES[race];
  if (!rules || !classes.every(className => rules.classes.includes(className))) throw new RangeError('Choose an eligible race and class.');
  return Object.fromEntries(ABILITIES.map((ability, index) => {
    const dice = Array.from({ length: 4 }, () => rollDice('1d6')).sort((a,b) => b-a);
    const value = dice.slice(0,3).reduce((sum, die) => sum+die, 0);
    const minimum = Math.max(rules.minimum[index], classes.some(className => ability === prime[className]) ? 9 : 3);
    return [ability, Math.max(minimum, Math.min(rules.maximum[index], value))];
  }));
}

export function rollExceptionalStrength(race, classType, attributes) {
  if (!(Array.isArray(classType) ? classType : [classType]).includes('Fighter') || attributes.strength !== 18) return 0;
  return Math.min(RACE_RULES[race].exceptionalMaximum, rollDice('1d100'));
}

export function validateParty(descriptors) {
  if (!Array.isArray(descriptors) || descriptors.length < 1 || descriptors.length > 6) return { ok: false, message: 'Create one to six adventurers.' };
  const names = new Set();
  for (const character of descriptors) {
    if (!character || typeof character.name !== 'string' || !character.name.trim() || character.name.trim().length > 20) return { ok: false, message: 'Each adventurer needs a name of 1–20 characters.' };
    const name = character.name.trim().toLowerCase();
    if (names.has(name)) return { ok: false, message: 'Give each adventurer a distinct name.' };
    names.add(name);
    const rules = RACE_RULES[character.race];
    const classes = character.classes || [character.classType];
    if (!rules || !Array.isArray(classes) || classes[0] !== character.classType || !availableClassOptions(character.race).some(option => option.classes.join('/') === classes.join('/'))) return { ok: false, message: `${character.name}: choose an eligible race and class.` };
    if (!ALIGNMENTS.includes(character.alignment)) return { ok: false, message: `${character.name}: choose one of the nine alignments.` };
    for (let index = 0; index < ABILITIES.length; index += 1) {
      const ability = ABILITIES[index], score = character.attributes?.[ability];
      const minimum = Math.max(rules.minimum[index], classes.some(className => ability === prime[className]) ? 9 : 3);
      if (!Number.isInteger(score) || score < minimum || score > rules.maximum[index]) return { ok: false, message: `${character.name}: ${ability} must be ${minimum}–${rules.maximum[index]}.` };
    }
    const exceptional = character.exceptionalStrength ?? 0;
    const limit = classes.includes('Fighter') && character.attributes.strength === 18 ? rules.exceptionalMaximum : 0;
    if (!Number.isInteger(exceptional) || exceptional < 0 || exceptional > limit) return { ok: false, message: `${character.name}: exceptional strength must be 0–${limit}.` };
  }
  return { ok: true, message: 'The party is ready.' };
}

export function availableClassOptions(race) {
  const single = availableClasses(race).map(classType => ({ id: classType, label: classType, classes: [classType] }));
  const combinations = race === 'Elf' || race === 'Half-elf'
    ? [['Fighter','Magic-user'],['Fighter','Thief'],['Magic-user','Thief'],['Fighter','Magic-user','Thief']]
    : race === 'Human' ? [] : [['Fighter','Thief']];
  if (race === 'Half-elf') combinations.push(['Cleric','Fighter'],['Cleric','Magic-user'],['Cleric','Fighter','Magic-user']);
  return [...single, ...combinations.map(classes => ({ id: classes.join('/'), label: classes.join(' / '), classes }))];
}

const outfits = {
  Fighter: { equipment: { mainhand: 'long_sword', offhand: 'shield', chest: 'chain_mail', head: 'iron_helm', shoulders: 'iron_pauldrons', hands: 'iron_gauntlets', waist: 'war_belt', legs: 'plate_leggings', feet: 'iron_boots', back: 'travel_cape' }, carried: ['halberd', 'long_bow', ['arrow', 30], 'healing_potion'] },
  Cleric: { equipment: { mainhand: 'mace', offhand: 'shield', chest: 'chain_mail', head: 'leather_hood', shoulders: 'cloth_mantle', hands: 'leather_gloves', waist: 'leather_belt', legs: 'robe_skirt', feet: 'leather_boots' }, carried: ['flail', 'healing_potion'] },
  'Magic-user': { equipment: { mainhand: 'dagger', chest: 'robes', head: 'wizard_hat', shoulders: 'cloth_mantle', hands: 'silk_gloves', waist: 'leather_belt', legs: 'robe_skirt', feet: 'cloth_shoes' }, carried: ['quarterstaff', 'healing_potion'] },
  Thief: { equipment: { mainhand: 'short_sword', chest: 'leather_armor', head: 'leather_hood', shoulders: 'leather_pauldrons', hands: 'leather_gloves', waist: 'leather_belt', legs: 'leather_trousers', feet: 'leather_boots', back: 'travel_cape' }, carried: ['dagger', 'healing_potion'] },
};
export function starterEquipment(classType) { return { ...outfits[classType].equipment }; }
export function starterLoadout(classType, variant = 0) {
  const outfit = outfits[classType];
  const equipment = starterEquipment(classType);
  if (classType === 'Fighter' && variant === 1) { equipment.mainhand = 'battle_axe'; equipment.head = 'plumed_helm'; delete equipment.back; }
  return { equipment, carried: outfit.carried.map(entry => Array.isArray(entry) ? [...entry] : entry) };
}
