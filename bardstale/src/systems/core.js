import { createBattlefield } from './battlefield.js';
import { footprintForKind } from '../combatFootprints.js';
import { INVENTORY_CAPACITY } from '../items.js';
import { createInventory, createEquipment, addInventoryItem, equipCarriedItem, unequipItem, transferCarriedItem, useCarriedItem, getEquippedItem, computeCharacterStats } from './inventory.js';

export function initBt3Systems({ hud, combatView, dungeon }) {
  function roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const LOG_SCROLL_DELAY = 420; // Pace log entries to mimic the classic slow scroll.
  const logQueue = [];
  let isProcessingLog = false;
  const logIdleResolvers = [];

  function resolveLogIdle() {
    const pending = logIdleResolvers.splice(0, logIdleResolvers.length);
    for (const resolve of pending) resolve();
  }

  function processLogQueue() {
    if (!logQueue.length) {
      isProcessingLog = false;
      resolveLogIdle();
      return;
    }
    isProcessingLog = true;
    hud.appendLog(logQueue.shift());
    setTimeout(processLogQueue, LOG_SCROLL_DELAY);
  }

  function log(message) {
    logQueue.push(message);
    if (!isProcessingLog) {
      processLogQueue();
    }
  }

  function waitForLogIdle() {
    if (!isProcessingLog && !logQueue.length) {
      return Promise.resolve();
    }
    return new Promise((resolve) => logIdleResolvers.push(resolve));
  }

  const CLASS_DATA = {
    Warrior: {
      hitDie: 16,
      spBase: 0,
      baseAttributes: { strength: 18, intelligence: 8, dexterity: 12, constitution: 17, luck: 10 },
      baseAc: 8,
      baseToHit: 2,
      damageBonus: 3,
      ability: 'warrior_power_strike',
      description: 'Battle-hardened veteran who wields heavy weapons with crushing force.'
    },
    Paladin: {
      hitDie: 14,
      spBase: 6,
      baseAttributes: { strength: 16, intelligence: 10, dexterity: 11, constitution: 16, luck: 12 },
      baseAc: 8,
      baseToHit: 1,
      damageBonus: 2,
      ability: 'paladin_lay_on_hands',
      description: 'Holy knight capable of bolstering allies with restorative miracles.'
    },
    Rogue: {
      hitDie: 12,
      spBase: 0,
      baseAttributes: { strength: 12, intelligence: 11, dexterity: 17, constitution: 12, luck: 16 },
      baseAc: 9,
      baseToHit: 1,
      damageBonus: 1,
      ability: 'rogue_backstab',
      description: 'Shadowy specialist who excels at striking distracted foes.'
    },
    Bard: {
      hitDie: 12,
      spBase: 4,
      baseAttributes: { strength: 12, intelligence: 13, dexterity: 14, constitution: 12, luck: 14 },
      baseAc: 9,
      baseToHit: 0,
      damageBonus: 1,
      songs: ['TRAV', 'ROGU', 'SEEK', 'WACH', 'DEST', 'FALK'],
      description: 'Wandering minstrel whose songs fortify, heal, and confound.'
    },
    Hunter: {
      hitDie: 13,
      spBase: 0,
      baseAttributes: { strength: 15, intelligence: 9, dexterity: 18, constitution: 13, luck: 13 },
      baseAc: 8,
      baseToHit: 2,
      damageBonus: 2,
      ability: 'hunter_aimed_shot',
      description: 'Keen-eyed archer whose critical strikes can fell the mightiest foes.'
    },
    Monk: {
      hitDie: 13,
      spBase: 0,
      baseAttributes: { strength: 15, intelligence: 11, dexterity: 16, constitution: 14, luck: 12 },
      baseAc: 7,
      baseToHit: 2,
      damageBonus: 2,
      ability: 'monk_stunning_blow',
      description: 'Unarmored martial artist whose disciplined strikes stagger enemies.'
    },
    Conjurer: {
      hitDie: 10,
      spBase: 14,
      baseAttributes: { strength: 9, intelligence: 17, dexterity: 12, constitution: 11, luck: 12 },
      baseAc: 10,
      baseToHit: 0,
      damageBonus: 0,
      spellList: ['MAFL', 'ARFI', 'TRZP', 'FRFO', 'MACO', 'WOHL', 'LEVI', 'WAST'],
      description: 'Elemental scholar focused on direct evocation and exploration magic.'
    },
    Magician: {
      hitDie: 10,
      spBase: 14,
      baseAttributes: { strength: 9, intelligence: 17, dexterity: 12, constitution: 11, luck: 12 },
      baseAc: 10,
      baseToHit: 0,
      damageBonus: 0,
      spellList: ['SCSI', 'HOWA', 'STLI', 'PHBL', 'MAGA', 'AREN', 'GRRE', 'WAWA'],
      description: 'Offensive mage specializing in weapon enchantments and holy damage.'
    },
    Sorcerer: {
      hitDie: 10,
      spBase: 16,
      baseAttributes: { strength: 8, intelligence: 18, dexterity: 13, constitution: 10, luck: 13 },
      baseAc: 10,
      baseToHit: 0,
      damageBonus: 0,
      spellList: ['MIJA', 'PHDO', 'YAWR', 'MAGM', 'OGST', 'INWO', 'FLCO', 'MAMA'],
      description: 'Illusionist whose reality-bending magics disable and devastate.'
    },
    Wizard: {
      hitDie: 10,
      spBase: 18,
      baseAttributes: { strength: 8, intelligence: 19, dexterity: 12, constitution: 10, luck: 14 },
      baseAc: 10,
      baseToHit: 0,
      damageBonus: 0,
      spellList: ['MIBL', 'INVI', 'GRSU', 'ANMA', 'FLRE', 'REST', 'WZWA', 'APAR'],
      description: 'Master of high sorcery wielding mind blades and protective wards.'
    },
    Archmage: {
      hitDie: 11,
      spBase: 20,
      baseAttributes: { strength: 9, intelligence: 20, dexterity: 13, constitution: 11, luck: 15 },
      baseAc: 9,
      baseToHit: 0,
      damageBonus: 0,
      spellList: ['SOSI', 'MORT', 'DEMI', 'SPTO', 'WIZB', 'APAR', 'REST', 'BLAZ'],
      inherits: ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'],
      description: 'Spell-archivist who commands the full repertoire of lesser disciplines.'
    },
    Chronomancer: {
      hitDie: 11,
      spBase: 18,
      baseAttributes: { strength: 8, intelligence: 20, dexterity: 14, constitution: 11, luck: 15 },
      baseAc: 9,
      baseToHit: 0,
      damageBonus: 0,
      spellList: ['DELV', 'HAST', 'SLOW', 'TARD', 'ROTL', 'DIVA', 'TIME', 'STAS'],
      inherits: ['Sorcerer', 'Wizard'],
      description: 'Guardian of time who hastens allies and suspends enemies in stasis.'
    },
    Geomancer: {
      hitDie: 11,
      spBase: 18,
      baseAttributes: { strength: 10, intelligence: 19, dexterity: 13, constitution: 12, luck: 14 },
      baseAc: 9,
      baseToHit: 0,
      damageBonus: 1,
      spellList: ['QUAK', 'STON', 'VINE', 'LAVA', 'SAND', 'GAEA', 'TOXF', 'BREA'],
      inherits: ['Conjurer', 'Magician'],
      description: 'Earth-shaper blending primal fury with protective wards.'
    },
  };

  const SPELL_LIBRARY = {
    MAFL: { code: 'MAFL', name: 'Magic Flame', classType: 'Conjurer', cost: 2, type: 'buff', target: 'party', duration: 3, modifiers: { toHit: 1, damageBonus: 1 }, description: 'Ignites a spectral flame that sharpens party attacks.', usableInCombat: true },
    ARFI: { code: 'ARFI', name: 'Arc Fire', classType: 'Conjurer', cost: 3, type: 'damage', target: 'enemy', power: 12, description: 'Arcing flames scorch a single foe.', usableInCombat: true },
    TRZP: { code: 'TRZP', name: 'Trap Zap', classType: 'Conjurer', cost: 3, type: 'utility', target: 'none', description: 'Neutralizes mundane traps; little use in combat.', usableInCombat: false },
    FRFO: { code: 'FRFO', name: 'Freeze Foes', classType: 'Conjurer', cost: 5, type: 'debuff', target: 'enemies', duration: 2, modifiers: { toHit: -2 }, description: 'Sheets of frost sap enemy accuracy.', usableInCombat: true },
    MACO: { code: 'MACO', name: 'Magic Compass', classType: 'Conjurer', cost: 2, type: 'utility', target: 'none', description: 'Calibrates the party compass.', usableInCombat: false },
    WOHL: { code: 'WOHL', name: 'Word of Healing', classType: 'Conjurer', cost: 4, type: 'heal', target: 'ally', amount: 18, description: 'Divine word mends wounds.', usableInCombat: true },
    LEVI: { code: 'LEVI', name: 'Levitate', classType: 'Conjurer', cost: 4, type: 'utility', target: 'party', description: 'Allows levitation over floor hazards.', usableInCombat: false },
    WAST: { code: 'WAST', name: 'Warstrike', classType: 'Conjurer', cost: 6, type: 'damage', target: 'enemy', power: 22, description: 'Concentrated beam that devastates a single foe.', usableInCombat: true },

    SCSI: { code: 'SCSI', name: 'Scry Site', classType: 'Magician', cost: 3, type: 'utility', target: 'party', description: 'Reveals dungeon layout.', usableInCombat: false },
    HOWA: { code: 'HOWA', name: 'Holy Water', classType: 'Magician', cost: 4, type: 'damage', target: 'enemy', power: 14, description: 'Consecrated water burns undead.', usableInCombat: true },
    STLI: { code: 'STLI', name: 'Stillness', classType: 'Magician', cost: 5, type: 'debuff', target: 'enemy', duration: 2, modifiers: { stunned: true }, description: 'Suspends a foe in place.', usableInCombat: true },
    PHBL: { code: 'PHBL', name: 'Phase Blur', classType: 'Magician', cost: 4, type: 'buff', target: 'ally', duration: 3, modifiers: { ac: -2 }, description: 'Envelops an ally in shimmering mist, lowering AC.', usableInCombat: true },
    MAGA: { code: 'MAGA', name: 'Mage Gauntlets', classType: 'Magician', cost: 4, type: 'buff', target: 'ally', duration: 3, modifiers: { damageBonus: 3 }, description: 'Empowers a weapon with arcane might.', usableInCombat: true },
    AREN: { code: 'AREN', name: 'Area Enchant', classType: 'Magician', cost: 5, type: 'buff', target: 'party', duration: 3, modifiers: { ac: -1, toHit: 1 }, description: 'Augments the entire party with protective wards.', usableInCombat: true },
    GRRE: { code: 'GRRE', name: 'Greater Revelation', classType: 'Magician', cost: 5, type: 'utility', target: 'party', description: 'Exposes hidden doors and illusions.', usableInCombat: false },
    WAWA: { code: 'WAWA', name: 'War Wind', classType: 'Magician', cost: 7, type: 'damage', target: 'enemies', power: 18, description: 'Storm of blades lashes all enemies.', usableInCombat: true },

    MIJA: { code: 'MIJA', name: 'Mind Jab', classType: 'Sorcerer', cost: 4, type: 'damage', target: 'enemy', power: 16, ignoreArmor: true, description: 'Psychic lance bypasses armor.', usableInCombat: true },
    PHDO: { code: 'PHDO', name: 'Phase Door', classType: 'Sorcerer', cost: 6, type: 'utility', target: 'party', description: 'Teleports the party short distances.', usableInCombat: false },
    YAWR: { code: 'YAWR', name: "Ybarra's Ward", classType: 'Sorcerer', cost: 5, type: 'buff', target: 'party', duration: 3, modifiers: { magicResist: 10 }, description: 'Mystical barrier improves magical resistance.', usableInCombat: true },
    MAGM: { code: 'MAGM', name: 'Magi Magma', classType: 'Sorcerer', cost: 6, type: 'damage', target: 'enemies', power: 16, description: 'Molten rock erupts beneath enemies.', usableInCombat: true },
    OGST: { code: 'OGST', name: 'Oscon\'s Stasis', classType: 'Sorcerer', cost: 7, type: 'debuff', target: 'enemy', duration: 2, modifiers: { stunned: true }, description: 'Locks a foe in temporal amber.', usableInCombat: true },
    INWO: { code: 'INWO', name: 'Invisible Wall', classType: 'Sorcerer', cost: 6, type: 'buff', target: 'party', duration: 2, modifiers: { ac: -2 }, description: 'Invisible barrier shields the party.', usableInCombat: true },
    FLCO: { code: 'FLCO', name: 'Flesh to Coal', classType: 'Sorcerer', cost: 7, type: 'damage', target: 'enemy', power: 20, description: 'Attempts to petrify the target.', usableInCombat: true },
    MAMA: { code: 'MAMA', name: 'Mana Maelstrom', classType: 'Sorcerer', cost: 8, type: 'damage', target: 'enemies', power: 24, description: 'Explosive conflagration engulfing all foes.', usableInCombat: true },

    MIBL: { code: 'MIBL', name: "Mangar's Mind Blade", classType: 'Wizard', cost: 8, type: 'damage', target: 'enemies', power: 26, ignoreArmor: true, description: 'Legendary psionic blade ravages enemy minds.', usableInCombat: true },
    INVI: { code: 'INVI', name: 'Invisibility', classType: 'Wizard', cost: 6, type: 'buff', target: 'ally', duration: 3, modifiers: { ac: -3, toHit: 1 }, description: 'Bends light around an ally.', usableInCombat: true },
    GRSU: { code: 'GRSU', name: 'Group Shield', classType: 'Wizard', cost: 6, type: 'buff', target: 'party', duration: 3, modifiers: { ac: -2 }, description: 'Protective field cushions the entire party.', usableInCombat: true },
    ANMA: { code: 'ANMA', name: 'Anti-Magic', classType: 'Wizard', cost: 5, type: 'buff', target: 'party', duration: 3, modifiers: { magicResist: 15 }, description: 'Nullifies hostile spells.', usableInCombat: true },
    FLRE: { code: 'FLRE', name: 'Flesh Restore', classType: 'Wizard', cost: 8, type: 'revive', target: 'ally', amount: 20, description: 'Restores a fallen ally to fighting shape.', usableInCombat: true },
    REST: { code: 'REST', name: 'Restoration', classType: 'Wizard', cost: 7, type: 'heal', target: 'party', amount: 14, description: 'Heals all allies with rejuvenating light.', usableInCombat: true },
    WZWA: { code: 'WZWA', name: 'Wizard War', classType: 'Wizard', cost: 9, type: 'damage', target: 'enemies', power: 24, description: 'Arcane barrage batters every enemy.', usableInCombat: true },
    APAR: { code: 'APAR', name: 'Apport Arcane', classType: 'Wizard', cost: 8, type: 'utility', target: 'none', description: 'Warps the party across space.', usableInCombat: false },

    SOSI: { code: 'SOSI', name: 'Soul Siphon', classType: 'Archmage', cost: 10, type: 'drain', target: 'enemy', power: 24, description: 'Steals vitality from an enemy and feeds the caster.', usableInCombat: true },
    MORT: { code: 'MORT', name: 'Mortal Blast', classType: 'Archmage', cost: 9, type: 'damage', target: 'enemy', power: 30, description: 'Pure destruction focused on one target.', usableInCombat: true },
    DEMI: { code: 'DEMI', name: 'Demi Armor', classType: 'Archmage', cost: 8, type: 'buff', target: 'party', duration: 3, modifiers: { ac: -3, magicResist: 20 }, description: 'Layers party in ethereal mail.', usableInCombat: true },
    SPTO: { code: 'SPTO', name: 'Spirit Touch', classType: 'Archmage', cost: 6, type: 'restore', target: 'ally', amount: 8, description: 'Restores spell points to a weary ally.', usableInCombat: true },
    WIZB: { code: 'WIZB', name: 'Wizard Bolt', classType: 'Archmage', cost: 8, type: 'damage', target: 'enemies', power: 26, description: 'Bolts of force slam every foe.', usableInCombat: true },
    BLAZ: { code: 'BLAZ', name: 'Blazing Star', classType: 'Archmage', cost: 10, type: 'damage', target: 'enemies', power: 32, description: 'A blazing star detonates in the enemy ranks.', usableInCombat: true },

    DELV: { code: 'DELV', name: 'Delayed Void', classType: 'Chronomancer', cost: 8, type: 'debuff', target: 'enemy', duration: 2, modifiers: { toHit: -3 }, description: 'Accelerates entropy around a foe.', usableInCombat: true },
    HAST: { code: 'HAST', name: 'Haste', classType: 'Chronomancer', cost: 7, type: 'buff', target: 'party', duration: 3, modifiers: { toHit: 2 }, description: 'Speeds the party, improving accuracy.', usableInCombat: true },
    SLOW: { code: 'SLOW', name: 'Slow Time', classType: 'Chronomancer', cost: 7, type: 'debuff', target: 'enemies', duration: 2, modifiers: { toHit: -2, damageBonus: -1 }, description: 'Slows enemies, dulling their strikes.', usableInCombat: true },
    TARD: { code: 'TARD', name: 'Temporal Dervish', classType: 'Chronomancer', cost: 9, type: 'damage', target: 'enemies', power: 24, description: 'Temporal blades rip through all foes.', usableInCombat: true },
    ROTL: { code: 'ROTL', name: 'Rotate Life', classType: 'Chronomancer', cost: 10, type: 'revive', target: 'ally', amount: 18, description: 'Turns back time on a fallen ally.', usableInCombat: true },
    DIVA: { code: 'DIVA', name: 'Divine Intervention', classType: 'Chronomancer', cost: 9, type: 'heal', target: 'party', amount: 20, description: 'Temporal plea mends grievous wounds.', usableInCombat: true },
    TIME: { code: 'TIME', name: 'Time Stop', classType: 'Chronomancer', cost: 11, type: 'debuff', target: 'enemies', duration: 1, modifiers: { stunned: true }, description: 'Freezes all enemies for a moment.', usableInCombat: true },
    STAS: { code: 'STAS', name: 'Stasis Field', classType: 'Chronomancer', cost: 8, type: 'buff', target: 'ally', duration: 2, modifiers: { ac: -4 }, description: 'Encases an ally in time-dilated protection.', usableInCombat: true },

    QUAK: { code: 'QUAK', name: 'Earthquake', classType: 'Geomancer', cost: 8, type: 'damage', target: 'enemies', power: 22, description: 'The ground heaves violently under every foe.', usableInCombat: true },
    STON: { code: 'STON', name: 'Stone Skin', classType: 'Geomancer', cost: 6, type: 'buff', target: 'party', duration: 3, modifiers: { ac: -3 }, description: 'Hardens skin to stone-like resilience.', usableInCombat: true },
    VINE: { code: 'VINE', name: 'Vine Snare', classType: 'Geomancer', cost: 6, type: 'debuff', target: 'enemy', duration: 2, modifiers: { stunned: true }, description: 'Thorny vines bind a target.', usableInCombat: true },
    LAVA: { code: 'LAVA', name: 'Lava Burst', classType: 'Geomancer', cost: 8, type: 'damage', target: 'enemy', power: 24, description: 'Lava erupts beneath a foe.', usableInCombat: true },
    SAND: { code: 'SAND', name: 'Sandstorm', classType: 'Geomancer', cost: 7, type: 'debuff', target: 'enemies', duration: 2, modifiers: { toHit: -2 }, description: 'Sand lashes enemies, blinding them.', usableInCombat: true },
    GAEA: { code: 'GAEA', name: "Gaia's Embrace", classType: 'Geomancer', cost: 8, type: 'heal', target: 'party', amount: 16, description: 'Nature\'s energy restores the party.', usableInCombat: true },
    TOXF: { code: 'TOXF', name: 'Toxic Fumes', classType: 'Geomancer', cost: 7, type: 'damage', target: 'enemies', power: 18, description: 'Poisonous vapors sap enemy vitality.', usableInCombat: true },
    BREA: { code: 'BREA', name: 'Breach Earth', classType: 'Geomancer', cost: 10, type: 'damage', target: 'enemy', power: 28, description: 'Jagged pillars erupt through an enemy.', usableInCombat: true },
  };

  const SONG_LIBRARY = {
    TRAV: { id: 'TRAV', name: "Traveler's Tune", type: 'buff', target: 'party', duration: 3, modifiers: { ac: -2 }, description: 'Calming melody reduces incoming blows.' },
    ROGU: { id: 'ROGU', name: "Rogue's March", type: 'buff', target: 'party', duration: 3, modifiers: { toHit: 1, damageBonus: 1 }, description: 'Rousing march sharpens blades and wits.' },
    SEEK: { id: 'SEEK', name: "Seeker's Ballad", type: 'buff', target: 'party', duration: 3, modifiers: { magicResist: 12 }, description: 'Haunting ballad steels minds against magic.' },
    WACH: { id: 'WACH', name: "Watchwood Melody", type: 'buff', target: 'party', duration: 3, modifiers: { ac: -1, toHit: 1 }, description: 'Forest melody heightens reflexes.' },
    DEST: { id: 'DEST', name: "Destiny's Dirge", type: 'heal', target: 'party', amount: 12, description: 'Somber dirge mends the weary.' },
    FALK: { id: 'FALK', name: "Falkentyne's Fury", type: 'buff', target: 'party', duration: 2, modifiers: { damageBonus: 3 }, description: 'Legendary anthem unleashes fierce strikes.' },
  };

  const ABILITY_LIBRARY = {
    warrior_power_strike: { id: 'warrior_power_strike', name: 'Power Strike', type: 'attack', damageBonus: 8, description: 'Overhand swing that adds significant damage.' },
    paladin_lay_on_hands: { id: 'paladin_lay_on_hands', name: 'Lay on Hands', type: 'heal', amount: 22, description: 'Restores an ally with a burst of holy light.' },
    rogue_backstab: { id: 'rogue_backstab', name: 'Backstab', type: 'attack', toHitBonus: 4, damageMultiplier: 2.5, description: 'Devastating strike against an unwary foe.' },
    hunter_aimed_shot: { id: 'hunter_aimed_shot', name: 'Aimed Shot', type: 'prep', duration: 2, modifiers: { critBonus: 0.3 }, description: 'Take careful aim to improve the next shot.' },
    monk_stunning_blow: { id: 'monk_stunning_blow', name: 'Stunning Blow', type: 'attack', damageBonus: 4, apply: { stunned: true, duration: 1 }, description: 'Chi-focused strike that may stun the target.' },
  };

  const MONSTER_DB = {
    serpent: { id: 'serpent', name: 'Cavern Serpent', hpMin: 6, hpMax: 12, ac: 9, toHit: 1, dmgMin: 2, dmgMax: 5, magicRes: 5, special: '' },
    rat_swarm: { id: 'rat_swarm', name: 'Rat Swarm', hpMin: 5, hpMax: 10, ac: 9, toHit: 0, dmgMin: 1, dmgMax: 4, magicRes: 0, special: 'swarm' },
    hobbit: { id: 'hobbit', name: 'Trickster Halfling', hpMin: 8, hpMax: 14, ac: 8, toHit: 2, dmgMin: 2, dmgMax: 6, magicRes: 10, special: 'backstab' },
    hobgoblin: { id: 'hobgoblin', name: 'Tunnel Hobgoblin', hpMin: 10, hpMax: 18, ac: 7, toHit: 3, dmgMin: 3, dmgMax: 7, magicRes: 12, special: 'war_cry' },
    skeleton: { id: 'skeleton', name: 'Restless Skeleton', hpMin: 9, hpMax: 16, ac: 7, toHit: 2, dmgMin: 3, dmgMax: 6, magicRes: 15, special: 'bone_chill' },
    monk: { id: 'monk', name: 'Ashen Monk', hpMin: 12, hpMax: 18, ac: 6, toHit: 3, dmgMin: 3, dmgMax: 8, magicRes: 20, special: 'stun_palm' },
    knight: { id: 'knight', name: 'Banished Knight', hpMin: 14, hpMax: 22, ac: 5, toHit: 4, dmgMin: 4, dmgMax: 9, magicRes: 18, special: 'shield_bash' },
    mage: { id: 'mage', name: 'Arcane Adept', hpMin: 12, hpMax: 18, ac: 8, toHit: 3, dmgMin: 3, dmgMax: 8, magicRes: 25, special: 'fire_bolt' },
    enchantress: { id: 'enchantress', name: 'Storm Enchantress', hpMin: 13, hpMax: 20, ac: 7, toHit: 4, dmgMin: 4, dmgMax: 9, magicRes: 28, special: 'chain_lightning' },
    warlock: { id: 'warlock', name: 'Void Warlock', hpMin: 14, hpMax: 22, ac: 6, toHit: 4, dmgMin: 4, dmgMax: 8, magicRes: 30, special: 'shadow_flame' },
    ogre: { id: 'ogre', name: 'Crag Ogre', hpMin: 18, hpMax: 28, ac: 6, toHit: 5, dmgMin: 5, dmgMax: 10, magicRes: 12, special: 'smash' },
    lich: { id: 'lich', name: 'Fallen Lich', hpMin: 18, hpMax: 28, ac: 4, toHit: 5, dmgMin: 4, dmgMax: 9, magicRes: 40, special: 'life_drain' },
    dragon: { id: 'dragon', name: 'Ember Dragon', hpMin: 36, hpMax: 52, ac: 3, toHit: 6, dmgMin: 6, dmgMax: 12, magicRes: 35, special: 'dragon_breath' },
    elemental: { id: 'elemental', name: 'Chaos Elemental', hpMin: 16, hpMax: 26, ac: 5, toHit: 4, dmgMin: 5, dmgMax: 9, magicRes: 35, special: 'elemental_burst' },
  };

  const ENCOUNTER_TABLES = [
    { maxDepth: 1, roamingWeight: 5, options: [
      { species: 'rat_swarm', min: 2, max: 5 },
      { species: 'serpent', min: 1, max: 3 },
      { species: 'hobbit', min: 1, max: 3 }
    ] },
    { maxDepth: 2, roamingWeight: 4, options: [
      { species: 'hobgoblin', min: 2, max: 4 },
      { species: 'skeleton', min: 2, max: 4 },
      { species: 'monk', min: 1, max: 3 }
    ] },
    { maxDepth: 3, roamingWeight: 3, options: [
      { species: 'knight', min: 1, max: 3 },
      { species: 'mage', min: 1, max: 2 },
      { species: 'ogre', min: 1, max: 2 }
    ] },
    { maxDepth: 4, roamingWeight: 2, options: [
      { species: 'enchantress', min: 1, max: 2 },
      { species: 'warlock', min: 1, max: 2 },
      { species: 'elemental', min: 1, max: 2 }
    ] },
    { maxDepth: 5, roamingWeight: 1, options: [
      { species: 'lich', min: 1, max: 2 },
      { species: 'warlock', min: 1, max: 3 },
      { species: 'elemental', min: 1, max: 3 },
      { species: 'dragon', min: 1, max: 1 }
    ] },
  ];

  function abilityModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  function getClassSpellList(classType) {
    const def = CLASS_DATA[classType];
    if (!def) return [];
    const combined = new Set(def.spellList || []);
    if (Array.isArray(def.inherits)) {
      for (const parent of def.inherits) {
        const parentDef = CLASS_DATA[parent];
        if (parentDef?.spellList) {
          for (const code of parentDef.spellList) combined.add(code);
        }
      }
    }
    return Array.from(combined);
  }

  function makeCharacter(id, name, classType, level = 1) {
    const def = CLASS_DATA[classType];
    if (!def) throw new Error(`Unknown class ${classType}`);
    const attrs = { ...def.baseAttributes };
    const conMod = abilityModifier(attrs.constitution);
    const intMod = abilityModifier(attrs.intelligence);
    const hpMax = def.hitDie + Math.max(0, conMod);
    const spMax = Math.max(0, def.spBase + Math.max(0, intMod * 2));
    return {
      id,
      name,
      classType,
      level,
      xp: 0,
      hpCurrent: hpMax,
      hpMax,
      spCurrent: spMax,
      spMax,
      attributes: attrs,
      base: {
        ac: def.baseAc,
        toHit: def.baseToHit + abilityModifier(attrs.dexterity),
        damage: { min: 1 + def.damageBonus + abilityModifier(attrs.strength), max: 6 + def.damageBonus + abilityModifier(attrs.strength) },
        weaponDamageBonus: def.damageBonus + abilityModifier(attrs.strength),
        magicResist: abilityModifier(attrs.luck) * 3,
      },
      inventory: createInventory(),
      equipment: createEquipment(),
      statusEffects: [],
      knownSpells: getClassSpellList(classType),
      knownSongs: def.songs ? def.songs.slice() : [],
      abilityId: def.ability || '',
      description: def.description,
      alive: true,
    };
  }

  function describeStatuses(entity) {
    if (!entity.statusEffects || !entity.statusEffects.length) return '';
    const parts = [];
    for (const status of entity.statusEffects) {
      if (status.duration && status.duration !== Infinity) {
        parts.push(`${status.name} (${status.duration})`);
      } else {
        parts.push(status.name);
      }
    }
    return parts.join(', ');
  }

  function applyStatus(target, status) {
    if (!target.statusEffects) target.statusEffects = [];
    const effect = { ...status };
    if (target.base && status.modifiers?.stunned && combatState?.phase === 'monsters') effect.awaitingHeroTurn = true;
    const existingIndex = target.statusEffects.findIndex((s) => s.id === status.id);
    if (existingIndex >= 0) {
      target.statusEffects[existingIndex] = { ...target.statusEffects[existingIndex], ...effect };
    } else {
      target.statusEffects.push(effect);
    }
  }

  function tickStatuses(targets) {
    for (const entity of targets) {
      if (!entity?.statusEffects?.length) continue;
      const next = [];
      for (const status of entity.statusEffects) {
        if (status.awaitingHeroTurn) {
          next.push(status);
          continue;
        }
        if (status.duration === Infinity || typeof status.duration !== 'number') {
          next.push(status);
          continue;
        }
        if (status.duration > 1) {
          next.push({ ...status, duration: status.duration - 1 });
        } else if (status.onExpire) {
          status.onExpire(entity);
        }
      }
      entity.statusEffects = next;
    }
  }

  function hasStatus(entity, predicate) {
    if (!entity?.statusEffects?.length) return false;
    return entity.statusEffects.some(predicate);
  }

  function isUnableToAct(entity) {
    return hasStatus(entity, (status) => status.modifiers?.stunned);
  }

  function healTarget(target, amount) {
    if (!target.alive) return false;
    const before = target.hpCurrent;
    target.hpCurrent = Math.min(target.hpMax, target.hpCurrent + amount);
    return target.hpCurrent > before;
  }

  function reviveTarget(target, amount) {
    if (target.alive) return healTarget(target, amount);
    target.alive = true;
    target.hpCurrent = Math.max(1, Math.min(target.hpMax, amount));
    return true;
  }

  function spendSpellPoints(caster, cost) {
    if (caster.spCurrent < cost) return false;
    caster.spCurrent -= cost;
    return true;
  }

  const inventoryListeners = new Set();
  const party = {
    id: 'p_main',
    name: 'Main Party',
    gold: 0,
    members: [
      makeCharacter('c_warrior', 'Brynn', 'Warrior'),
      makeCharacter('c_paladin', 'Ser Ana', 'Paladin'),
      makeCharacter('c_rogue', 'Shade', 'Rogue'),
      makeCharacter('c_bard', 'Lyre', 'Bard'),
      makeCharacter('c_chrono', 'Quint', 'Chronomancer'),
    ],
  };

  function setupStartingGear() {
    const loadouts = [
      {
        equipment: { mainhand: 'longsword', offhand: 'shield_wood', head: 'iron_helm', chest: 'chain_armor', shoulders: 'iron_pauldrons', hands: 'iron_gauntlets', waist: 'leather_belt', legs: 'leather_trousers', feet: 'leather_boots' },
        carried: ['plumed_helm', 'plate_armor', 'halberd', 'plate_leggings', 'iron_boots', 'war_belt', 'ruby_pendant', ['ring_precision', 2], 'ring_power', 'travel_cape', ['healing_potion', 2], 'ember_sword', 'rime_mace'],
      },
      {
        equipment: { mainhand: 'longsword', offhand: 'shield_kite', head: 'plumed_helm', chest: 'chain_armor', shoulders: 'iron_pauldrons', hands: 'iron_gauntlets', waist: 'leather_belt', legs: 'plate_leggings', feet: 'leather_boots', neck: 'ward_amulet' },
        carried: ['spear', 'mace', 'iron_boots', 'sapphire_pendant', 'ring_warding', ['healing_potion', 2], 'void_shield'],
      },
      {
        equipment: { mainhand: 'dagger', head: 'leather_hood', chest: 'leather_armor', shoulders: 'leather_pauldrons', hands: 'leather_gloves', waist: 'leather_belt', legs: 'leather_trousers', feet: 'leather_boots', back: 'travel_cape' },
        carried: ['longbow', 'dagger', 'battle_axe', 'leather_pack', 'healing_potion', 'venom_dagger'],
      },
      {
        equipment: { mainhand: 'sword_basic', chest: 'leather_armor', shoulders: 'cloth_mantle', hands: 'leather_gloves', waist: 'leather_belt', legs: 'leather_trousers', feet: 'leather_boots', back: 'lute' },
        carried: ['flail', 'battle_kilt', 'ring_power', 'healing_potion'],
      },
      {
        equipment: { mainhand: 'quarterstaff', head: 'circlet', chest: 'robes', shoulders: 'cloth_mantle', hands: 'silk_gloves', waist: 'leather_belt', legs: 'robe_skirt', feet: 'cloth_shoes' },
        carried: ['wizard_hat', 'travel_cape', 'ward_amulet', 'ring_warding', ['mana_potion', 2], 'healing_potion', 'star_amulet'],
      },
    ];
    party.members.forEach((member, index) => {
      for (const [slot, itemId] of Object.entries(loadouts[index].equipment)) {
        const added = addInventoryItem(member, itemId);
        if (!added.ok) throw new Error(added.message);
        const inventoryIndex = member.inventory.findIndex(entry => entry?.itemId === itemId);
        const equipped = equipCarriedItem(member, inventoryIndex, slot);
        if (!equipped.ok) throw new Error(equipped.message);
      }
      for (const entry of loadouts[index].carried) {
        const [itemId, qty] = Array.isArray(entry) ? entry : [entry, 1];
        const added = addInventoryItem(member, itemId, qty);
        if (!added.ok) throw new Error(added.message);
      }
    });
  }

  setupStartingGear();

  function renderParty() {
    const members = party.members.map((member) => {
      const stats = computeCharacterStats(member);
      return {
        id: member.id,
        name: member.name,
        classType: member.classType,
        level: member.level,
        hpCurrent: member.hpCurrent,
        hpMax: member.hpMax,
        spCurrent: member.spCurrent,
        spMax: member.spMax,
        ac: stats.ac,
        toHit: stats.toHit,
        damageMin: stats.minDamage,
        damageMax: stats.maxDamage,
        alive: member.alive,
        equipment: { ...member.equipment },
        attributes: { ...member.attributes },
        statusText: describeStatuses(member),
      };
    });
    hud.setParty({ gold: party.gold, members });
    for (const listener of inventoryListeners) listener();
  }

  function getInventorySnapshot(characterId = party.members[0].id) {
    const member = findPartyMember(characterId);
    if (!member) return null;
    return {
      character: {
        id: member.id, name: member.name, classType: member.classType, level: member.level,
        hpCurrent: member.hpCurrent, hpMax: member.hpMax, spCurrent: member.spCurrent, spMax: member.spMax,
        alive: member.alive, attributes: { ...member.attributes },
      },
      equipment: { ...member.equipment },
      inventory: member.inventory.map(entry => entry ? { ...entry } : null),
      stats: computeCharacterStats(member),
      capacity: INVENTORY_CAPACITY,
      party: party.members.map(({ id, name, classType }) => ({ id, name, classType })),
      locked: combatState !== null,
      lockReason: combatState !== null ? 'Equipment, transfers, and potions are available after combat.' : '',
    };
  }

  function changeInventory(characterId, change) {
    if (combatState !== null) return { ok: false, message: 'Equipment, transfers, and potions are available after combat.' };
    const member = findPartyMember(characterId);
    if (!member) return { ok: false, message: 'Character not found.' };
    const response = change(member);
    if (response.ok) renderParty();
    return response;
  }

  function findPartyMember(id) {
    return party.members.find((member) => member.id === id) || null;
  }

  function livingPartyMembers() {
    return party.members.filter((member) => member.alive);
  }

  function livingMonsters(monsters) {
    return monsters.filter((monster) => monster.alive);
  }

  function makeMonster(speciesId, index) {
    const spec = MONSTER_DB[speciesId];
    if (!spec) throw new Error(`Unknown monster species ${speciesId}`);
    const hp = roll(spec.hpMin, spec.hpMax);
    return {
      id: `${spec.id}_${index}`,
      name: spec.name,
      speciesId: spec.id,
      footprint: footprintForKind(spec.id),
      hpCurrent: hp,
      hpMax: hp,
      ac: spec.ac,
      toHit: spec.toHit,
      dmgMin: spec.dmgMin,
      dmgMax: spec.dmgMax,
      magicRes: spec.magicRes,
      special: spec.special,
      statusEffects: [],
      alive: true,
    };
  }

  function computeMonsterAttack(monster) {
    let toHit = monster.toHit;
    let minDamage = monster.dmgMin;
    let maxDamage = monster.dmgMax;
    const statuses = monster.statusEffects || [];
    for (const status of statuses) {
      if (status?.modifiers?.toHit) toHit += status.modifiers.toHit;
      if (status?.modifiers?.damageBonus) {
        minDamage += status.modifiers.damageBonus;
        maxDamage += status.modifiers.damageBonus;
      }
    }
    return { toHit, minDamage, maxDamage };
  }

  function monsterMagicResist(monster) {
    let resist = monster.magicRes || 0;
    if (monster.statusEffects) {
      for (const status of monster.statusEffects) {
        if (status?.modifiers?.magicResist) resist += status.modifiers.magicResist;
      }
    }
    return resist;
  }

  function generateEncounter(depth) {
    const roaming = depth === undefined;
    let tier;
    if (roaming) {
      let draw = Math.random() * ENCOUNTER_TABLES.reduce((total, entry) => total + entry.roamingWeight, 0);
      tier = ENCOUNTER_TABLES.find((entry) => (draw -= entry.roamingWeight) < 0);
      depth = tier.maxDepth;
    } else {
      tier = ENCOUNTER_TABLES.find((entry) => depth <= entry.maxDepth) || ENCOUNTER_TABLES[ENCOUNTER_TABLES.length - 1];
    }
    const choices = tier.options.slice();
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    const groupCount = roaming && depth > 1 ? 1 : Math.min(choices.length, roll(1, 3));
    const groups = [];
    for (let i = 0; i < groupCount; i++) {
      const option = choices[i];
      const max = roaming && depth > 1 ? Math.min(option.max, depth === 2 ? 2 : 1) : option.max;
      groups.push({ species: option.species, count: roll(Math.min(option.min, max), max) });
    }
    return {
      id: 'enc_' + Math.random().toString(36).slice(2),
      depth,
      canFlee: roaming || depth <= 4,
      groups,
    };
  }

  function startCombat(encounter) {
    const monsters = [];
    let index = 1;
    for (const group of encounter.groups) {
      for (let i = 0; i < group.count; i++) {
        monsters.push(makeMonster(group.species, index++));
      }
    }
    const board = createBattlefield(dungeon, party.members, monsters);
    return {
      encounter,
      round: 1,
      party: party.members,
      monsters,
      board,
      heroTurns: new Map(),
      actorId: '',
      activeId: '',
      menuRevision: 0,
      phase: 'opening',
      mode: 'resolving',
      busy: true,
      cursor: { ...board.origin },
      targeting: null,
      ended: false,
      winner: '',
      fled: false,
      concluded: false,
    };
  }

  function hitCheck(attackerToHit, defenderAc) {
    const rollResult = Math.floor(Math.random() * 20) + 1;
    return { roll: rollResult, success: (rollResult + attackerToHit) >= defenderAc };
  }

  function applyPhysicalDamage(defender, amount) {
    defender.hpCurrent -= amount;
    if (defender.hpCurrent <= 0) {
      defender.hpCurrent = 0;
      defender.alive = false;
    }
    if (combatState) {
      renderParty();
      publishBattle(combatState);
    }
  }

  function hunterCriticalChance(attacker, stats) {
    if (attacker.classType !== 'Hunter') return 0;
    const base = 0.1 + Math.max(0, abilityModifier(attacker.attributes.dexterity)) * 0.02;
    const statusBonus = stats.critBonus || 0;
    return Math.min(0.6, base + statusBonus);
  }

  function performAttack(attacker, defender, options = {}) {
    if (!attacker.alive) return { hit: false, damage: 0 };
    if (!defender?.alive) return { hit: false, damage: 0 };
    if (isUnableToAct(attacker)) {
      log(`${attacker.name} is unable to act!`);
      return { hit: false, damage: 0 };
    }
    const attackerStats = computeCharacterStats(attacker);
    const toHit = attackerStats.toHit + (options.toHitBonus || 0);
    const minDamage = attackerStats.minDamage + (options.damageBonus || 0);
    const maxDamage = attackerStats.maxDamage + (options.damageBonus || 0);
    const defenderStats = defender.base ? computeCharacterStats(defender) : null;
    const defenderAc = defender.base ? defenderStats.ac : defender.ac;
    const result = hitCheck(toHit, defenderAc);
    if (!result.success) {
      log(`${attacker.name} misses ${defender.name}.`);
      return { hit: false, damage: 0 };
    }
    let damage = roll(minDamage, maxDamage);
    if (attacker.classType === 'Rogue' && options.isBackstab) {
      damage = Math.floor(damage * (options.damageMultiplier || 2));
    }
    const critChance = hunterCriticalChance(attacker, attackerStats);
    if (critChance > 0 && Math.random() < critChance) {
      damage = Math.max(defender.hpCurrent, damage + Math.floor(maxDamage * 0.75));
      log(`${attacker.name} lands a critical hit on ${defender.name}!`);
    }
    applyPhysicalDamage(defender, damage);
    if (!defender.alive) {
      log(`${attacker.name} strikes down ${defender.name} for ${damage} damage.`);
    } else {
      log(`${attacker.name} hits ${defender.name} for ${damage} damage.`);
    }
    return { hit: true, damage };
  }

  function performMonsterAttack(monster, defender, options = {}) {
    if (!monster.alive || !defender?.alive) return { hit: false, damage: 0 };
    if (isUnableToAct(monster)) {
      log(`${monster.name} is held fast and cannot attack!`);
      return { hit: false, damage: 0 };
    }
    const stats = computeMonsterAttack(monster);
    const defenderStats = computeCharacterStats(defender);
    const result = hitCheck(stats.toHit + (options.toHitBonus || 0), defenderStats.ac);
    if (!result.success) {
      log(`${monster.name} misses ${defender.name}.`);
      return { hit: false, damage: 0 };
    }
    let damage = roll(stats.minDamage, stats.maxDamage);
    if (options.damageBonus) damage += options.damageBonus;
    applyPhysicalDamage(defender, damage);
    if (!defender.alive) {
      log(`${monster.name} slays ${defender.name} for ${damage} damage!`);
    } else {
      log(`${monster.name} hits ${defender.name} for ${damage} damage.`);
    }
    return { hit: true, damage };
  }

  function resolveTargetsForSpell(state, caster, spellDef, explicitTargetId) {
    const allies = caster.base ? state.party : state.monsters;
    const enemies = caster.base ? state.monsters : state.party;
    const inRange = (target) => state.board.canTarget(caster.id, target.id, { range: 6 });
    if (spellDef.target === 'enemy') {
      return enemies.filter((target) => target.id === explicitTargetId && target.alive && inRange(target));
    }
    if (spellDef.target === 'enemies') return enemies.filter((target) => target.alive && inRange(target));
    if (spellDef.target === 'ally') {
      return allies.filter((target) => target.id === explicitTargetId && (target.alive || spellDef.type === 'revive') && inRange(target) && canRestorePosition(state, target));
    }
    if (spellDef.target === 'party') return allies.filter((target) => target.alive);
    if (spellDef.target === 'self') return [caster];
    return [];
  }

  function applySpellDamage(caster, target, spellDef, powerBonus = 0) {
    const intBonus = abilityModifier(caster.attributes?.intelligence ?? 10);
    const base = spellDef.power + powerBonus + Math.max(0, intBonus * 2);
    const variance = Math.max(2, Math.floor(base * 0.25));
    const damage = Math.max(1, roll(base - variance, base + variance));
    const resist = target.base ? computeCharacterStats(target).magicRes : monsterMagicResist(target);
    if (!spellDef.ignoreArmor && Math.random() * 100 < resist) {
      log(`${target.name} resists ${spellDef.name}!`);
      return 0;
    }
    applyPhysicalDamage(target, damage);
    return damage;
  }

  const MAGIC_PALETTE = {
    holy: 0xf4d66a,
    arcane: 0x55ffff,
    temporal: 0xb875ff,
    flame: 0xff8034,
    frost: 0x90c8ff,
    nature: 0x55ff55,
  };

  function spellRune(spell) {
    const style = ['ARFI', 'MAGM', 'FLCO', 'LAVA', 'BLAZ', 'MAFL'].includes(spell.code) ? 'flame'
      : ['FRFO', 'STLI', 'OGST'].includes(spell.code) ? 'frost'
      : ['HOWA', 'WOHL', 'FLRE', 'REST', 'SPTO', 'DIVA'].includes(spell.code) ? 'holy'
      : spell.classType === 'Chronomancer' ? 'temporal'
      : spell.classType === 'Geomancer' ? 'nature' : 'arcane';
    return { style, color: MAGIC_PALETTE[style] };
  }

  function statusVisual(modifiers, rune) {
    const protective = modifiers.ac < 0 || modifiers.magicResist > 0;
    return { kind: protective ? 'shield' : 'rune', ...rune };
  }

  async function playBattleEffect(state, kind, source, targets, color, rune) {
    const cell = (entity) => {
      const position = state.board.position(entity.id);
      return { id: entity.id, x: position.x, y: position.y, team: position.team, footprint: position.footprint };
    };
    await combatView.playEffect({ kind, source: cell(source), targets: targets.map(cell), color, ...(rune ? { rune } : {}) });
    return isCurrentBattle(state);
  }

  async function castSpell(state, caster, spellCode, explicitTargetId) {
    const spellDef = SPELL_LIBRARY[spellCode];
    if (!spellDef || !caster.knownSpells.includes(spellCode)) {
      log(`${caster.name} tries to cast an unknown spell.`);
      return false;
    }
    if (!spellDef.usableInCombat) {
      log(`${spellDef.name} cannot be used during combat.`);
      return false;
    }
    const targets = resolveTargetsForSpell(state, caster, spellDef, explicitTargetId);
    if (!targets.length && spellDef.target !== 'none') {
      log(`${spellDef.name} fizzles without a target.`);
      return false;
    }
    if (!spendSpellPoints(caster, spellDef.cost)) {
      log(`${caster.name} lacks the spell points to cast ${spellDef.name}.`);
      return false;
    }
    log(`${caster.name} casts ${spellDef.name}!`);
    const effectKind = ['heal', 'revive', 'restore'].includes(spellDef.type) ? 'heal'
      : spellDef.type === 'buff' ? 'buff' : spellCode === 'MIJA' ? 'arrow'
        : spellDef.target === 'enemies' ? 'burst' : 'bolt';
    const rune = spellRune(spellDef);
    if (!await playBattleEffect(state, effectKind, caster, targets, rune.color, rune)) return false;
    if (spellDef.type === 'damage' || spellDef.type === 'drain') {
      for (const target of targets) {
        const damage = applySpellDamage(caster, target, spellDef);
        if (damage > 0) {
          log(`${target.name} takes ${damage} damage from ${spellDef.name}.`);
          if (spellDef.type === 'drain') {
            const heal = Math.max(1, Math.floor(damage / 2));
            healTarget(caster, heal);
            log(`${caster.name} siphons ${heal} health.`);
          }
          if (!target.alive) {
            log(`${target.name} is defeated by ${spellDef.name}!`);
          }
        }
      }
    } else if (spellDef.type === 'heal') {
      for (const target of targets) {
        if (healTarget(target, spellDef.amount)) {
          log(`${target.name} recovers ${spellDef.amount} health.`);
        }
      }
    } else if (spellDef.type === 'revive') {
      for (const target of targets) {
        if (reviveTarget(target, spellDef.amount)) {
          log(`${target.name} is restored by ${spellDef.name}!`);
        }
      }
    } else if (spellDef.type === 'restore') {
      for (const target of targets) {
        const before = target.spCurrent;
        target.spCurrent = Math.min(target.spMax, target.spCurrent + spellDef.amount);
        if (target.spCurrent > before) {
          log(`${target.name} regains ${target.spCurrent - before} spell points.`);
        }
      }
    } else if (spellDef.type === 'buff' || spellDef.type === 'debuff') {
      for (const target of targets) {
        const status = {
          id: `spell_${spellDef.code}_${target.id}`,
          name: spellDef.name,
          duration: spellDef.duration ?? 0,
          modifiers: { ...spellDef.modifiers },
          visual: statusVisual(spellDef.modifiers, rune),
        };
        applyStatus(target, status);
        if (spellDef.duration) {
          log(`${target.name} is affected by ${spellDef.name} for ${spellDef.duration} rounds.`);
        } else {
          log(`${target.name} is affected by ${spellDef.name}.`);
        }
      }
    }
    return true;
  }

  async function performSong(state, bard, songId) {
    const song = SONG_LIBRARY[songId];
    if (!song || !bard.knownSongs.includes(songId)) {
      log(`${bard.name} does not recall that melody.`);
      return false;
    }
    if (!getEquippedItem(bard, 'back')?.instrument) {
      log(`${bard.name} fumbles without an instrument.`);
      return false;
    }
    const targets = song.target === 'enemies'
      ? livingMonsters(state.monsters).filter((target) => state.board.canTarget(bard.id, target.id, { range: 6 }))
      : (song.target === 'party' ? party.members.filter((member) => member.alive) : [bard]);
    if (!targets.length) return false;
    log(`${bard.name} plays ${song.name}.`);
    const rune = { style: 'holy', color: MAGIC_PALETTE.holy };
    if (!await playBattleEffect(state, song.type === 'heal' ? 'heal' : 'buff', bard, targets, rune.color, rune)) return false;
    let success = false;
    if (song.type === 'buff') {
      for (const target of targets) {
        const status = {
          id: `song_${song.id}_${target.id}`,
          name: song.name,
          duration: song.duration ?? 0,
          modifiers: { ...song.modifiers },
          visual: statusVisual(song.modifiers, rune),
        };
        applyStatus(target, status);
        success = true;
      }
      if (song.duration) {
        log(`The party is inspired for ${song.duration} rounds.`);
      }
    } else if (song.type === 'heal') {
      for (const target of targets) {
        if (healTarget(target, song.amount)) success = true;
      }
      if (success) log('Wounds knit as the song crescendos.');
    } else if (song.type === 'debuff') {
      for (const target of targets) {
        const status = {
          id: `song_${song.id}_${target.id}`,
          name: song.name,
          duration: song.duration ?? 0,
          modifiers: { ...song.modifiers },
          visual: statusVisual(song.modifiers, rune),
        };
        applyStatus(target, status);
        success = true;
      }
      if (success) log('Enemies falter under the melody.');
    }
    return true;
  }

  async function useAbility(state, actor, abilityId, targetId) {
    const ability = ABILITY_LIBRARY[abilityId];
    if (!ability || actor.abilityId !== abilityId) {
      log(`${actor.name} tries a technique they have not mastered.`);
      return false;
    }
    if (ability.type === 'attack') {
      const target = state.monsters.find((monster) => monster.id === targetId && monster.alive && state.board.canTarget(actor.id, monster.id, { melee: true, range: 1 }));
      if (!target) {
        log(`${actor.name} has no target for ${ability.name}.`);
        return false;
      }
      const options = {
        toHitBonus: ability.toHitBonus || 0,
        damageBonus: ability.damageBonus || 0,
        isBackstab: abilityId === 'rogue_backstab',
        damageMultiplier: ability.damageMultiplier || 1,
      };
      if (!await playBattleEffect(state, 'slash', actor, [target], 0xffd26b)) return false;
      const result = performAttack(actor, target, options);
      if (result.hit && ability.apply?.stunned && target.alive) {
        applyStatus(target, {
          id: `ability_${ability.id}_${target.id}`, name: ability.name, duration: ability.apply.duration || 1,
          modifiers: { stunned: true }, visual: statusVisual({ stunned: true }, { style: 'holy', color: MAGIC_PALETTE.holy }),
        });
        log(`${target.name} is stunned!`);
      }
      return true;
    }
    if (ability.type === 'heal') {
      const target = state.party.find((member) => member.id === targetId && state.board.canTarget(actor.id, member.id, { range: 6 }) && canRestorePosition(state, member));
      if (!target) return false;
      const rune = { style: 'holy', color: MAGIC_PALETTE.holy };
      if (!await playBattleEffect(state, 'heal', actor, [target], rune.color, rune)) return false;
      if (reviveTarget(target, ability.amount)) {
        log(`${actor.name} uses ${ability.name} on ${target.name}.`);
        return true;
      }
      log(`${target.name} already has full health.`);
      return true;
    }
    if (ability.type === 'prep') {
      const rune = { style: 'holy', color: MAGIC_PALETTE.holy };
      if (!await playBattleEffect(state, 'buff', actor, [actor], rune.color, rune)) return false;
      applyStatus(actor, {
        id: `ability_${ability.id}_${actor.id}`,
        name: ability.name,
        duration: ability.duration ?? 1,
        modifiers: { ...(ability.modifiers || {}) },
        visual: statusVisual(ability.modifiers || {}, rune),
      });
      log(`${actor.name} prepares with ${ability.name}.`);
      return true;
    }
    return false;
  }

  function canRestorePosition(state, target) {
    if (target.alive) return true;
    const position = state.board.position(target.id);
    return state.board.canPlace(target.id, position.x, position.y);
  }

  function heroesInRange(state, monster, range = 6, melee = false) {
    return livingPartyMembers().filter((hero) => state.board.canTarget(monster.id, hero.id, { range, melee }));
  }

  async function monsterSpecialAction(state, monster, meleeTarget) {
    if (!monster.special || Math.random() > 0.35) return false;
    const rangedTargets = heroesInRange(state, monster);
    const target = meleeTarget || rangedTargets[0];
    if (!target) return false;
    switch (monster.special) {
      case 'swarm': {
        if (!meleeTarget) return false;
        if (!await playBattleEffect(state, 'slash', monster, [target], 0xff7070)) return false;
        log(`${monster.name} swarms over ${target.name}!`);
        const result = performMonsterAttack(monster, target, { damageBonus: 2 });
        if (result.hit) performMonsterAttack(monster, target, { damageBonus: 1 });
        return true;
      }
      case 'backstab': {
        if (!meleeTarget) return false;
        if (!await playBattleEffect(state, 'slash', monster, [target], 0xff7070)) return false;
        log(`${monster.name} darts behind ${target.name}!`);
        performMonsterAttack(monster, target, { toHitBonus: 3, damageBonus: 3 });
        return true;
      }
      case 'war_cry': {
        if (!rangedTargets.length) return false;
        const rune = { style: 'flame', color: MAGIC_PALETTE.flame };
        if (!await playBattleEffect(state, 'buff', monster, rangedTargets, rune.color, rune)) return false;
        log(`${monster.name} unleashes a war cry!`);
        for (const hero of rangedTargets) {
          applyStatus(hero, {
            id: `debuff_war_cry_${hero.id}`, name: 'War Cry', duration: 2,
            modifiers: { toHit: -1 }, visual: statusVisual({ toHit: -1 }, rune),
          });
        }
        return true;
      }
      case 'bone_chill': {
        if (!rangedTargets.length) return false;
        const rune = { style: 'frost', color: MAGIC_PALETTE.frost };
        if (!await playBattleEffect(state, 'burst', monster, rangedTargets, rune.color, rune)) return false;
        log(`${monster.name} exhales bone-chilling frost!`);
        for (const hero of rangedTargets) {
          applyStatus(hero, {
            id: `bone_chill_${hero.id}`, name: 'Bone Chill', duration: 2,
            modifiers: { ac: 1 }, visual: statusVisual({ ac: 1 }, rune),
          });
        }
        return true;
      }
      case 'stun_palm': {
        if (!meleeTarget) return false;
        if (!await playBattleEffect(state, 'slash', monster, [target], 0xff7070)) return false;
        log(`${monster.name} attempts a stunning palm!`);
        const result = performMonsterAttack(monster, target, { toHitBonus: 2 });
        if (result.hit && target.alive) {
          applyStatus(target, {
            id: `stun_${monster.id}`, name: 'Stunned', duration: 1, modifiers: { stunned: true },
            visual: statusVisual({ stunned: true }, { style: 'holy', color: MAGIC_PALETTE.holy }),
          });
          log(`${target.name} is stunned!`);
        }
        return true;
      }
      case 'shield_bash': {
        if (!meleeTarget) return false;
        if (!await playBattleEffect(state, 'slash', monster, [target], 0xff7070)) return false;
        log(`${monster.name} bashes ${target.name} with a shield!`);
        const result = performMonsterAttack(monster, target, { damageBonus: 2 });
        if (result.hit && target.alive) {
          applyStatus(target, {
            id: `bash_${monster.id}`, name: 'Dazed', duration: 2, modifiers: { toHit: -1 },
            visual: statusVisual({ toHit: -1 }, { style: 'holy', color: MAGIC_PALETTE.holy }),
          });
        }
        return true;
      }
      case 'dragon_breath': {
        if (!rangedTargets.length) return false;
        const rune = { style: 'flame', color: MAGIC_PALETTE.flame };
        if (!await playBattleEffect(state, 'bolt', monster, rangedTargets, rune.color, rune)) return false;
        log(`${monster.name} breathes a torrent of fire!`);
        for (const hero of rangedTargets) {
          const damage = roll(8, 14);
          applyPhysicalDamage(hero, damage);
          log(`${hero.name} takes ${damage} fire damage.`);
        }
        return true;
      }
      case 'fire_bolt': {
        if (!rangedTargets.length) return false;
        const defender = rangedTargets[0];
        const spell = SPELL_LIBRARY.ARFI;
        const rune = spellRune(spell);
        if (!await playBattleEffect(state, 'bolt', monster, [defender], rune.color, rune)) return false;
        log(`${monster.name} casts ${spell.name}!`);
        const damage = applySpellDamage(monster, defender, spell);
        if (damage) log(`${defender.name} takes ${damage} damage from ${spell.name}.`);
        return true;
      }
      case 'chain_lightning': {
        if (!rangedTargets.length) return false;
        const rune = { style: 'arcane', color: MAGIC_PALETTE.arcane };
        if (!await playBattleEffect(state, 'bolt', monster, rangedTargets, rune.color, rune)) return false;
        log(`${monster.name} hurls chain lightning!`);
        for (const hero of rangedTargets) {
          const damage = roll(8, 16);
          applyPhysicalDamage(hero, damage);
          log(`${hero.name} is shocked for ${damage} damage.`);
        }
        return true;
      }
      case 'shadow_flame': {
        if (!rangedTargets.length) return false;
        const defender = rangedTargets[0];
        const rune = { style: 'temporal', color: MAGIC_PALETTE.temporal };
        if (!await playBattleEffect(state, 'bolt', monster, [defender], rune.color, rune)) return false;
        log(`${monster.name} conjures shadow flame!`);
        const damage = roll(12, 20);
        applyPhysicalDamage(defender, damage);
        log(`${defender.name} is scorched for ${damage}.`);
        if (defender.spCurrent > 0) {
          defender.spCurrent = Math.max(0, defender.spCurrent - 4);
          log(`${defender.name}'s spell energy is drained.`);
        }
        return true;
      }
      case 'smash': {
        const nearby = heroesInRange(state, monster, 2);
        if (!nearby.length) return false;
        if (!await playBattleEffect(state, 'burst', monster, nearby, 0xffd26b)) return false;
        log(`${monster.name} smashes the ground!`);
        for (const hero of nearby) {
          const result = hitCheck(monster.toHit + 2, computeCharacterStats(hero).ac);
          if (result.success) {
            const damage = roll(monster.dmgMin + 2, monster.dmgMax + 4);
            applyPhysicalDamage(hero, damage);
            log(`${hero.name} suffers ${damage} damage from the quake.`);
          }
        }
        return true;
      }
      case 'life_drain': {
        if (!rangedTargets.length) return false;
        const defender = rangedTargets[0];
        const rune = { style: 'temporal', color: MAGIC_PALETTE.temporal };
        if (!await playBattleEffect(state, 'bolt', monster, [defender], rune.color, rune)) return false;
        log(`${monster.name} drains life from ${defender.name}!`);
        const damage = roll(10, 18);
        applyPhysicalDamage(defender, damage);
        healTarget(monster, Math.max(4, Math.floor(damage / 2)));
        log(`${monster.name} is reinvigorated.`);
        return true;
      }
      case 'elemental_burst': {
        if (!rangedTargets.length) return false;
        const rune = { style: 'flame', color: MAGIC_PALETTE.flame };
        if (!await playBattleEffect(state, 'burst', monster, rangedTargets, rune.color, rune)) return false;
        log(`${monster.name} detonates elemental energy!`);
        for (const hero of rangedTargets) {
          const damage = roll(9, 15);
          applyPhysicalDamage(hero, damage);
          log(`${hero.name} is blasted for ${damage}.`);
        }
        return true;
      }
      default:
        return false;
    }
  }

  let stepsSinceEncounter = 0;
  let combatState = null;

  function isCurrentBattle(state) {
    return combatState === state && !state.ended;
  }

  function activeHero(state) {
    return findPartyMember(state.actorId);
  }

  function heroIsAvailable(state, actor) {
    const turn = state.heroTurns.get(actor?.id);
    return Boolean(actor?.alive && turn && !turn.actionSpent && !isUnableToAct(actor));
  }

  function weaponTargeting(actor) {
    const range = getEquippedItem(actor, 'mainhand')?.range || 1;
    return { melee: range === 1, range };
  }

  function attackableMonsters(state, actor) {
    return livingMonsters(state.monsters).filter((monster) => state.board.canTarget(actor.id, monster.id, weaponTargeting(actor)));
  }

  function targetKind(action) {
    if (action.type === 'spell') {
      const spell = SPELL_LIBRARY[action.spellCode];
      return ['heal', 'revive', 'restore'].includes(spell.type) ? 'heal' : spell.type === 'buff' ? 'buff' : 'spell';
    }
    if (action.type === 'ability' && ABILITY_LIBRARY[action.abilityId]?.type === 'heal') return 'heal';
    return 'attack';
  }

  function publishBattle(state) {
    if (combatState !== state) return;
    const actor = activeHero(state);
    const selectable = !state.busy && state.phase === 'hero' && heroIsAvailable(state, actor);
    const targets = selectable ? state.targeting?.targets || (state.mode === 'ready' ? attackableMonsters(state, actor) : []) : [];
    const targetId = targets.find((target) => state.board.occupies(target.id, state.cursor.x, state.cursor.y))?.id || '';
    combatView.show({
      units: state.board.units.map(({ id, team, x, y, footprint, entity }) => ({
        id, team, x, y, footprint,
        kind: entity.classType || entity.speciesId,
        name: entity.name,
        hpCurrent: entity.hpCurrent,
        hpMax: entity.hpMax,
        spCurrent: entity.spCurrent ?? 0,
        spMax: entity.spMax ?? 0,
        ac: team === 'party' ? computeCharacterStats(entity).ac : entity.ac,
        weapon: team === 'party' ? getEquippedItem(entity, 'mainhand')?.name || 'Unarmed' : '',
        equipment: team === 'party' ? { ...entity.equipment } : undefined,
        alive: entity.alive,
        auras: entity.alive ? entity.statusEffects.map((status) => ({ id: status.id, ...status.visual })) : [],
        canAct: team === 'party' && state.phase === 'hero' && heroIsAvailable(state, entity),
        movementRemaining: state.heroTurns.get(id)?.movementRemaining ?? 0,
      })),
      activeId: state.activeId,
      targetId,
      targetIds: targets.map((target) => target.id),
      targetKind: state.targeting ? targetKind(state.targeting.action) : 'attack',
      cursor: { ...state.cursor },
      reachable: selectable && state.mode === 'ready' ? state.board.reachable(state.actorId, state.heroTurns.get(state.actorId).movementRemaining) : [],
      mode: state.mode,
      busy: state.busy,
      round: state.round,
    });
  }

  function heroCanSelect(state, actor) {
    return isCurrentBattle(state) && state.phase === 'hero' && !state.busy && state.actorId === actor?.id && heroIsAvailable(state, actor);
  }

  function showActionMenu(state, actor, prompt, buttons, details = actor.description) {
    const revision = ++state.menuRevision;
    publishBattle(state);
    hud.setActions({
      prompt,
      buttons: buttons.map((button) => ({
        ...button,
        onSelect: () => {
          if (state.menuRevision === revision && heroCanSelect(state, actor)) button.onSelect();
        },
      })),
      active: {
        id: actor.id,
        heading: `${actor.name} — ${actor.classType}`,
        details: `MOVE ${state.heroTurns.get(actor.id).movementRemaining}/4  SP ${actor.spCurrent}/${actor.spMax}. ${details}`,
      },
    });
  }

  function promptMainAction(state, actor, message = '') {
    if (!isCurrentBattle(state)) return;
    state.mode = 'ready';
    state.targeting = null;
    const position = state.board.position(actor.id);
    state.cursor = { x: position.x, y: position.y };
    const buttons = [];
    if ((actor.knownSpells || []).some((code) => SPELL_LIBRARY[code]?.usableInCombat) && actor.spCurrent > 0) {
      buttons.push({ label: 'Cast Spell', onSelect: () => promptSpellSelect(state, actor) });
    }
    if ((actor.knownSongs || []).length) buttons.push({ label: 'Sing', onSelect: () => promptSongSelect(state, actor) });
    if (actor.abilityId) buttons.push({ label: 'Use Ability', onSelect: () => promptAbilitySelect(state, actor) });
    if (state.encounter.canFlee) buttons.push({ label: 'Flee', onSelect: () => commitHeroAction(state, actor, { type: 'flee' }) });
    buttons.push({ label: 'End Turn', onSelect: () => commitHeroAction(state, actor, { type: 'pass' }) });
    const prompt = message || `Round ${state.round}: ${actor.name}`;
    showActionMenu(state, actor, prompt, buttons);
  }

  async function moveHero(state, actor, x, y) {
    if (!heroCanSelect(state, actor) || state.mode !== 'ready') return;
    const turn = state.heroTurns.get(actor.id);
    const path = state.board.pathToCell(actor.id, x, y, turn.movementRemaining);
    if (!path.length) return;
    state.busy = true;
    state.mode = 'resolving';
    state.targeting = null;
    hud.clearActions();
    for (const cell of path) {
      if (!isCurrentBattle(state)) return;
      const result = state.board.move(actor.id, cell.x, cell.y, 1);
      if (!result.moved) break;
      turn.movementRemaining -= result.cost;
      state.cursor = { ...cell };
      publishBattle(state);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    if (!isCurrentBattle(state)) return;
    state.busy = false;
    promptMainAction(state, actor);
  }

  function promptTargetSelection(state, actor, { targets, action, prompt, details, onCancel }) {
    if (!targets.length) {
      promptMainAction(state, actor, 'No target in range. Move to an open line of attack.');
      return;
    }
    state.mode = 'target';
    state.targeting = { targets, action, onCancel };
    const position = state.board.position(targets[0].id);
    state.cursor = { x: position.x, y: position.y };
    const buttons = targets.map((target) => ({
      label: `${target.name} (${target.hpCurrent}/${target.hpMax})${target.alive ? '' : ' [KO]'}`,
      onSelect: () => {
        const position = state.board.position(target.id);
        selectCombatCell(position.x, position.y);
      },
    }));
    buttons.push({ label: 'Back', role: 'back', onSelect: onCancel });
    showActionMenu(state, actor, prompt, buttons, details);
  }

  function promptAbilityAttackTargets(state, actor, ability) {
    const targets = livingMonsters(state.monsters).filter((monster) => state.board.canTarget(actor.id, monster.id, { melee: true, range: 1 }));
    promptTargetSelection(state, actor, {
      targets,
      action: { type: 'ability', abilityId: ability.id },
      prompt: `Choose target for ${actor.name}`,
      details: ability.description,
      onCancel: () => promptMainAction(state, actor),
    });
  }

  function promptSpellTarget(state, actor, spell) {
    if (actor.spCurrent < spell.cost) {
      promptMainAction(state, actor, `${spell.name} needs ${spell.cost} SP; ${actor.spCurrent} available.`);
      return;
    }
    const action = { type: 'spell', spellCode: spell.code };
    if (spell.target === 'enemy' || spell.target === 'ally') {
      const candidates = spell.target === 'enemy' ? livingMonsters(state.monsters) : state.party.filter((member) => member.alive || spell.type === 'revive');
      const targets = candidates.filter((target) => state.board.canTarget(actor.id, target.id, { range: 6 }) && canRestorePosition(state, target));
      promptTargetSelection(state, actor, {
        targets, action,
        prompt: `Target for ${spell.name}`,
        details: spell.description,
        onCancel: () => promptSpellSelect(state, actor),
      });
      return;
    }
    if (spell.target === 'enemies' && !resolveTargetsForSpell(state, actor, spell).length) {
      promptMainAction(state, actor, 'No enemy within six cells and line of sight.');
      return;
    }
    commitHeroAction(state, actor, action);
  }

  function promptSpellSelect(state, actor) {
    state.mode = 'menu';
    state.targeting = null;
    const spells = (actor.knownSpells || []).map((code) => SPELL_LIBRARY[code]).filter((spell) => spell?.usableInCombat);
    const buttons = spells.map((spell) => ({
      label: `${spell.code} SP${spell.cost} ${spell.name}`,
      onSelect: () => promptSpellTarget(state, actor, spell),
    }));
    buttons.push({ label: 'Back', role: 'back', onSelect: () => promptMainAction(state, actor) });
    showActionMenu(state, actor, 'Cast which spell?', buttons);
  }

  function promptSongSelect(state, actor) {
    state.mode = 'menu';
    state.targeting = null;
    const buttons = (actor.knownSongs || []).map((songId) => ({
      label: SONG_LIBRARY[songId].name,
      onSelect: () => {
        const song = SONG_LIBRARY[songId];
        if (song.target === 'enemies' && !livingMonsters(state.monsters).some((target) => state.board.canTarget(actor.id, target.id, { range: 6 }))) {
          promptMainAction(state, actor, 'No enemy within six cells and line of sight.');
          return;
        }
        commitHeroAction(state, actor, { type: 'song', songId });
      },
    }));
    buttons.push({ label: 'Back', role: 'back', onSelect: () => promptMainAction(state, actor) });
    showActionMenu(state, actor, 'Choose a melody', buttons);
  }

  function promptAbilitySelect(state, actor) {
    const ability = ABILITY_LIBRARY[actor.abilityId];
    if (!ability) {
      promptMainAction(state, actor, 'No special ability available.');
      return;
    }
    if (ability.type === 'attack') {
      promptAbilityAttackTargets(state, actor, ability);
      return;
    }
    if (ability.type === 'heal') {
      promptTargetSelection(state, actor, {
        targets: state.party.filter((member) => state.board.canTarget(actor.id, member.id, { range: 6 }) && canRestorePosition(state, member)),
        action: { type: 'ability', abilityId: ability.id },
        prompt: `Use ${ability.name} on whom?`,
        details: ability.description,
        onCancel: () => promptMainAction(state, actor),
      });
      return;
    }
    commitHeroAction(state, actor, { type: 'ability', abilityId: ability.id });
  }

  function hasBattleWinner(state) {
    if (!livingMonsters(state.monsters).length) {
      state.winner = 'Party';
      state.ended = true;
    } else if (!livingPartyMembers().length) {
      state.winner = 'Monsters';
      state.ended = true;
    }
    return state.ended;
  }

  function attemptFlee(state, actor) {
    if (!state.encounter.canFlee) return false;
    if (Math.random() < 0.45 + state.encounter.depth * 0.05) {
      log(`${actor.name} signals a retreat!`);
      state.ended = true;
      state.winner = 'Party';
      state.fled = true;
    } else log(`${actor.name} fails to escape!`);
    return true;
  }

  async function concludeCombat(state) {
    if (state.concluded || combatState !== state) return;
    state.concluded = true;
    state.busy = true;
    state.mode = 'resolving';
    state.targeting = null;
    hud.clearActions();
    publishBattle(state);
    if (state.winner === 'Party' && !state.fled) {
      const gold = roll(12, 28) + state.encounter.depth * 6;
      party.gold += gold;
      log(`The party claims ${gold} gold.`);
      if (Math.random() < 0.35) {
        const carrier = party.members.find(member => addInventoryItem(member, 'healing_potion').ok);
        log(carrier ? `${carrier.name} recovers a healing potion.` : 'The packs are full; a spare healing potion is left behind.');
      }
    }
    log(`Combat ends. Winner: ${state.winner}.`);
    for (const hero of party.members) hero.statusEffects = hero.statusEffects.filter((status) => status.persistent);
    renderParty();
    await waitForLogIdle();
    if (combatState !== state) return;
    combatState = null;
    combatView.hide();
    hud.clearActions();
    renderParty();
  }

  async function commitHeroAction(state, actor, action) {
    if (!heroCanSelect(state, actor)) return;
    let performed = false;
    if (action.type === 'attack') {
      const target = state.monsters.find((monster) => monster.id === action.targetId && monster.alive && state.board.canTarget(actor.id, monster.id, weaponTargeting(actor)));
      if (!target) {
        promptMainAction(state, actor, 'The target is no longer in weapon range.');
        return;
      }
      state.busy = true;
      state.mode = 'resolving';
      state.targeting = null;
      hud.clearActions();
      publishBattle(state);
      if (!await playBattleEffect(state, weaponTargeting(actor).range > 1 ? 'arrow' : 'slash', actor, [target], 0xffd26b)) return;
      performAttack(actor, target);
      performed = true;
    } else {
      state.busy = true;
      state.mode = 'resolving';
      state.targeting = null;
      hud.clearActions();
      publishBattle(state);
      if (action.type === 'spell') performed = await castSpell(state, actor, action.spellCode, action.targetId);
      else if (action.type === 'song') performed = await performSong(state, actor, action.songId);
      else if (action.type === 'ability') performed = await useAbility(state, actor, action.abilityId, action.targetId);
      else if (action.type === 'flee') performed = attemptFlee(state, actor);
      else if (action.type === 'pass') performed = true;
    }
    if (combatState !== state) return;
    if (performed) state.heroTurns.get(actor.id).actionSpent = true;
    renderParty();
    publishBattle(state);
    if (!performed) {
      await waitForLogIdle();
      if (!isCurrentBattle(state)) return;
      state.busy = false;
      promptMainAction(state, actor, 'Choose another action.');
      return;
    }
    if (hasBattleWinner(state)) {
      await concludeCombat(state);
      return;
    }
    await waitForLogIdle();
    if (!isCurrentBattle(state)) return;
    await beginNextHeroTurn(state);
  }

  function closestHeroRoute(state, monster) {
    const candidates = livingPartyMembers().map((hero) => ({
      hero,
      adjacent: state.board.canTarget(monster.id, hero.id, { melee: true, range: 1 }),
      path: state.board.pathToAdjacent(monster.id, hero.id),
    })).filter((entry) => entry.adjacent || entry.path.length);
    candidates.sort((a, b) => a.path.length - b.path.length);
    return candidates[0];
  }

  async function walkMonster(state, monster) {
    const route = closestHeroRoute(state, monster);
    if (!route) return;
    for (const cell of route.path.slice(0, 3)) {
      if (!isCurrentBattle(state)) return;
      const result = state.board.move(monster.id, cell.x, cell.y, 1);
      if (!result.moved) break;
      state.cursor = { x: cell.x, y: cell.y };
      publishBattle(state);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  async function runMonsterPhase(state) {
    state.phase = 'monsters';
    state.busy = true;
    state.mode = 'resolving';
    state.targeting = null;
    hud.clearActions();
    const rangedSpecials = new Set(['war_cry', 'bone_chill', 'fire_bolt', 'chain_lightning', 'shadow_flame', 'life_drain', 'elemental_burst', 'dragon_breath']);
    for (const monster of livingMonsters(state.monsters)) {
      if (!isCurrentBattle(state)) return;
      state.activeId = monster.id;
      const position = state.board.position(monster.id);
      state.cursor = { x: position.x, y: position.y };
      publishBattle(state);
      if (isUnableToAct(monster)) {
        log(`${monster.name} is held fast and cannot act!`);
      } else {
        let target = heroesInRange(state, monster, 1, true)[0];
        const mayCast = rangedSpecials.has(monster.special) && heroesInRange(state, monster).length;
        let moved = false;
        if (!target && !mayCast) {
          await walkMonster(state, monster);
          moved = true;
          target = heroesInRange(state, monster, 1, true)[0];
        }
        if (!await monsterSpecialAction(state, monster, target)) {
          if (!target && !moved) {
            await walkMonster(state, monster);
            target = heroesInRange(state, monster, 1, true)[0];
          }
          if (target && await playBattleEffect(state, 'slash', monster, [target], 0xff7070)) performMonsterAttack(monster, target);
        }
      }
      renderParty();
      publishBattle(state);
      if (hasBattleWinner(state)) {
        await concludeCombat(state);
        return;
      }
      await waitForLogIdle();
    }
    if (!isCurrentBattle(state)) return;
    state.round += 1;
    tickStatuses(state.party);
    tickStatuses(state.monsters);
    renderParty();
    await beginPlayerRound(state);
  }

  function selectHero(state, actor) {
    if (!isCurrentBattle(state) || state.phase !== 'hero' || state.busy || !heroIsAvailable(state, actor)) return;
    state.actorId = actor.id;
    state.activeId = actor.id;
    promptMainAction(state, actor);
  }

  async function beginNextHeroTurn(state) {
    if (!isCurrentBattle(state)) return;
    const actor = state.party.find((hero) => heroIsAvailable(state, hero));
    if (actor) {
      state.phase = 'hero';
      state.busy = false;
      selectHero(state, actor);
    } else await runMonsterPhase(state);
  }

  async function beginPlayerRound(state) {
    if (!isCurrentBattle(state)) return;
    state.phase = 'hero';
    state.busy = true;
    state.mode = 'resolving';
    state.heroTurns = new Map(state.party.filter((hero) => hero.alive).map((hero) => [hero.id, { movementRemaining: 4, actionSpent: false }]));
    state.targeting = null;
    publishBattle(state);
    log(`-- Round ${state.round} --`);
    for (const hero of state.party) {
      if (!hero.alive || !isUnableToAct(hero)) continue;
      const turn = state.heroTurns.get(hero.id);
      turn.actionSpent = true;
      turn.movementRemaining = 0;
      for (const status of hero.statusEffects) status.awaitingHeroTurn = false;
      log(`${hero.name} is incapacitated and misses a turn.`);
    }
    await waitForLogIdle();
    if (!isCurrentBattle(state)) return;
    await beginNextHeroTurn(state);
  }

  async function beginEncounter(depth) {
    const state = startCombat(generateEncounter(depth));
    combatState = state;
    hud.clearActions();
    publishBattle(state);
    renderParty();
    log(`Encounter! ${state.monsters.length} ${state.monsters.length === 1 ? 'foe' : 'foes'} approach.`);
    await waitForLogIdle();
    if (!isCurrentBattle(state)) return;
    await beginPlayerRound(state);
  }

  function maybeEncounter(depth) {
    if (combatState || !livingPartyMembers().length) return;
    stepsSinceEncounter += 1;
    const cadenceDepth = depth ?? 1;
    const threshold = Math.max(1, 4 - Math.min(cadenceDepth, 3));
    if (stepsSinceEncounter >= threshold && Math.random() < 0.35 + cadenceDepth * 0.08) {
      stepsSinceEncounter = 0;
      beginEncounter(depth);
    }
  }

  function moveTargetCursor(state, dx, dy) {
    const x = state.cursor.x + dx;
    const y = state.cursor.y + dy;
    if (x < 0 || y < 0 || x >= state.board.width || y >= state.board.height) return;
    state.cursor = { x, y };
    publishBattle(state);
  }

  function selectCombatCell(x, y) {
    const state = combatState;
    if (!state || state.busy || state.ended || state.phase !== 'hero') return;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= state.board.width || y >= state.board.height) return;
    const actor = activeHero(state);
    if (!heroCanSelect(state, actor)) return;
    if (state.mode === 'target') {
      const target = state.targeting.targets.find((candidate) => state.board.occupies(candidate.id, x, y));
      if (target) {
        state.cursor = { x, y };
        publishBattle(state);
        commitHeroAction(state, actor, { ...state.targeting.action, targetId: target.id });
        return;
      }
    }
    const clickedHero = state.party.find((hero) => state.board.occupies(hero.id, x, y) && heroIsAvailable(state, hero));
    if (clickedHero) {
      selectHero(state, clickedHero);
      return;
    }
    if (state.mode !== 'ready') return;
    const clickedMonster = attackableMonsters(state, actor).find((monster) => state.board.occupies(monster.id, x, y));
    if (clickedMonster) {
      state.cursor = { x, y };
      publishBattle(state);
      commitHeroAction(state, actor, { type: 'attack', targetId: clickedMonster.id });
    } else moveHero(state, actor, x, y);
  }

  function handleCombatKey(key) {
    const state = combatState;
    if (!state) return false;
    if (state.busy || state.ended || state.phase !== 'hero') return true;
    const actor = activeHero(state);
    if (!heroCanSelect(state, actor)) return true;
    const arrows = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] };
    const step = arrows[key];
    if (state.mode === 'ready') {
      if (step) {
        const position = state.board.position(actor.id);
        moveHero(state, actor, position.x + step[0], position.y + step[1]);
        return true;
      }
    } else if (state.mode === 'target') {
      if (step) {
        moveTargetCursor(state, step[0], step[1]);
        return true;
      }
      if (key === 'Enter') {
        selectCombatCell(state.cursor.x, state.cursor.y);
        return true;
      }
      if (key === 'Escape') {
        state.targeting.onCancel();
        return true;
      }
    } else if (key === 'Escape') {
      promptMainAction(state, actor);
      return true;
    }
    return Boolean(step);
  }

  renderParty();
  return {
    get isCombatActive() {
      return combatState !== null;
    },
    onStepComplete(depth) {
      maybeEncounter(depth);
    },
    handleCombatKey,
    selectCombatCell,
    getInventorySnapshot,
    previewInventoryEquipment(characterId, index, slot) {
      const member = findPartyMember(characterId);
      if (!member) return { ok: false, message: 'Character not found.' };
      const preview = {
        ...member,
        inventory: member.inventory.map(entry => entry ? { ...entry } : null),
        equipment: { ...member.equipment },
      };
      const response = equipCarriedItem(preview, index, slot);
      return { ...response, stats: computeCharacterStats(preview), equipment: { ...preview.equipment } };
    },
    equipInventoryItem(characterId, index, slot) {
      return changeInventory(characterId, member => equipCarriedItem(member, index, slot));
    },
    unequipInventoryItem(characterId, slot) {
      return changeInventory(characterId, member => unequipItem(member, slot));
    },
    transferInventoryItem(characterId, index, targetId) {
      return changeInventory(characterId, member => {
        const recipient = findPartyMember(targetId);
        return recipient ? transferCarriedItem(member, index, recipient) : { ok: false, message: 'Recipient not found.' };
      });
    },
    useInventoryItem(characterId, index) {
      return changeInventory(characterId, member => useCarriedItem(member, index));
    },
    subscribeInventory(listener) {
      inventoryListeners.add(listener);
      return () => inventoryListeners.delete(listener);
    },
  };
}
