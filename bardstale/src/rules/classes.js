// Pool of Radiance progression: https://gbc.zorbus.net/xp/xp_01_por.txt
// Four original playable classes; human characters avoid racial level limits.
export const CLASS_DATA = Object.freeze({
  Fighter: { hitDie: 10, maxLevel: 8, description: 'Armored warrior trained in every weapon.', attributes: { strength: 18, intelligence: 10, wisdom: 10, dexterity: 14, constitution: 16, charisma: 13 }, xp: [0, 2001, 4001, 8001, 18001, 35001, 70001, 125001], thac0: [20,19,18,17,16,15,14,13], saves: [[14,15,16,17,17],[14,15,16,17,17],[13,14,15,16,16],[13,14,15,16,16],[11,12,13,13,14],[11,12,13,13,14],[10,11,12,12,13],[10,11,12,12,13]] },
  Cleric: { hitDie: 8, maxLevel: 6, description: 'Divine healer who wears armor and turns undead.', attributes: { strength: 14, intelligence: 11, wisdom: 17, dexterity: 12, constitution: 15, charisma: 15 }, xp: [0,1501,3001,6001,13001,27501], thac0: [20,20,20,18,18,18], saves: [[10,13,14,16,15],[10,13,14,16,15],[10,13,14,16,15],[9,12,13,15,14],[9,12,13,15,14],[9,12,13,15,14]], slots: [[1,0,0],[2,0,0],[2,1,0],[3,2,0],[3,3,1],[3,3,2]] },
  'Magic-user': { hitDie: 4, maxLevel: 6, description: 'Arcane scholar who memorizes spells from a spellbook.', attributes: { strength: 9, intelligence: 17, wisdom: 12, dexterity: 16, constitution: 14, charisma: 11 }, xp: [0,2501,5001,10001,22501,40001], thac0: [20,20,20,20,20,19], saves: [[14,13,11,15,12],[14,13,11,15,12],[14,13,11,15,12],[14,13,11,15,12],[14,13,11,15,12],[13,11,9,13,10]], slots: [[1,0,0],[2,0,0],[2,1,0],[3,2,0],[4,2,1],[4,2,2]] },
  Thief: { hitDie: 6, maxLevel: 9, description: 'Agile scout who attacks exposed enemies from behind.', attributes: { strength: 13, intelligence: 13, wisdom: 10, dexterity: 18, constitution: 14, charisma: 12 }, xp: [0,1251,2501,5001,10001,20001,42501,70001,110001], thac0: [20,20,20,20,19,19,19,19,16], saves: [[13,12,14,16,15],[13,12,14,16,15],[13,12,14,16,15],[13,12,14,16,15],[12,11,12,15,13],[12,11,12,15,13],[12,11,12,15,13],[12,11,12,15,13],[11,10,10,14,11]] },
});

export const SAVE_TYPES = ['death', 'petrification', 'wand', 'breath', 'spell'];

export function classProgression(classType, level) {
  const definition = CLASS_DATA[classType];
  if (!definition || !Number.isInteger(level) || level < 1 || level > definition.maxLevel) throw new RangeError('Invalid class or level.');
  return {
    xp: definition.xp[level - 1],
    nextLevelXp: definition.xp[level] ?? null,
    thac0: definition.thac0[level - 1],
    attacksPerRound: classType === 'Fighter' && level >= 7 ? 1.5 : 1,
    saves: Object.fromEntries(SAVE_TYPES.map((type, index) => [type, definition.saves[level - 1][index]])),
    spellSlots: [...(definition.slots?.[level - 1] || [0,0,0])],
    hitDie: definition.hitDie,
    maxLevel: definition.maxLevel,
  };
}

export function constitutionBonus(character) {
  const con = character.attributes.constitution;
  if (con <= 3) return -2;
  if (con <= 6) return -1;
  if (con <= 14) return 0;
  if (con === 15) return 1;
  return (character.classes || [character.classType]).includes('Fighter') ? Math.min(4, con - 14) : 2;
}

export function strengthModifiers(character) {
  const strength = character.attributes.strength;
  const exceptional = character.exceptionalStrength || 0;
  let toHit = 0, damage = 0, allowance = 0;
  if (strength <= 3) { toHit = -3; damage = -1; allowance = -350; }
  else if (strength <= 5) { toHit = -2; damage = -1; allowance = -250; }
  else if (strength <= 7) { toHit = -1; allowance = -150; }
  else if (strength <= 11) allowance = 0;
  else if (strength <= 13) allowance = 100;
  else if (strength <= 15) allowance = 200;
  else if (strength === 16) { damage = 1; allowance = 350; }
  else if (strength === 17) { toHit = 1; damage = 1; allowance = 500; }
  else if (!exceptional) { toHit = 1; damage = 2; allowance = 750; }
  else if (exceptional <= 50) { toHit = 1; damage = 3; allowance = 1000; }
  else if (exceptional <= 75) { toHit = 2; damage = 3; allowance = 1250; }
  else if (exceptional <= 90) { toHit = 2; damage = 4; allowance = 1500; }
  else if (exceptional < 100) { toHit = 2; damage = 5; allowance = 2000; }
  else { toHit = 3; damage = 6; allowance = 3000; }
  return { toHit, damage, carryWeight: 1500 + allowance, weightAllowance: allowance };
}

export function dexterityModifiers(score) {
  const ac = score <= 3 ? 4 : score === 4 ? 3 : score === 5 ? 2 : score === 6 ? 1 : score <= 14 ? 0 : score === 15 ? -1 : score === 16 ? -2 : score === 17 ? -3 : -4;
  const missileToHit = score <= 3 ? -3 : score === 4 ? -2 : score === 5 ? -1 : score <= 15 ? 0 : Math.min(3, score - 15);
  return { ac, missileToHit, initiative: missileToHit };
}

export function spellSlots(character, spellClass) {
  const classes = character.classes || [character.classType];
  const result = [0,0,0];
  for (const classType of classes) {
    if (spellClass && spellClass !== classType) continue;
    const slots = classProgression(classType, character.classLevels?.[classType] || character.level).spellSlots;
    if (classType === 'Cleric') {
      const wisdom = character.attributes.wisdom;
      if (slots[0]) slots[0] += wisdom >= 14 ? 2 : wisdom >= 13 ? 1 : 0;
      if (slots[1]) slots[1] += wisdom >= 16 ? 2 : wisdom >= 15 ? 1 : 0;
      if (slots[2] && wisdom >= 17) slots[2] += 1;
    }
    for (let index = 0; index < 3; index += 1) result[index] += slots[index];
  }
  return result;
}

export function characterProgression(character) {
  const classes = character.classes || [character.classType];
  const entries = classes.map(classType => classProgression(classType, character.classLevels?.[classType] || character.level));
  return {
    thac0: Math.min(...entries.map(entry => entry.thac0)),
    saves: Object.fromEntries(SAVE_TYPES.map(type => [type, Math.min(...entries.map(entry => entry.saves[type]))])),
    hitDie: entries.reduce((total, entry) => total + entry.hitDie, 0) / classes.length,
    attacksPerRound: Math.max(...entries.map(entry => entry.attacksPerRound)),
  };
}
