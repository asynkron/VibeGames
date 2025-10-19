// Minimal systems layer bridging game code with core contracts.

import { Character, Party, Race, CharacterClass } from '../../../../packages/core/src/contracts/Character.js';
import { Inventory, Item, ItemInstance, ItemType, DamageType } from '../../../../packages/core/src/contracts/Item.js';
import { MonsterSpecies, MonsterGroup } from '../../../../packages/core/src/contracts/Monster.js';
import { Encounter, CombatState, InitiativeEntry, Combatant, TurnSide } from '../../../../packages/core/src/contracts/Encounter.js';

export type Database = {
  items: Item[];
  monsters: MonsterSpecies[];
};

export const SampleDB: Database = {
  items: [
    { id: 'sword_basic', name: 'Short Sword', type: ItemType.Weapon, weight: 3, cost: 40, weapon: { minDamage: 2, maxDamage: 8, damageType: DamageType.Physical, toHitBonus: 0 }, armor: null, usable: null, slot: 'Weapon', maxStack: 1 },
    { id: 'leather_armor', name: 'Leather Armor', type: ItemType.Armor, weight: 5, cost: 60, weapon: null, armor: { armorClassBonus: -1, magicResistBonus: 0 }, usable: null, slot: 'Body', maxStack: 1 },
    { id: 'songbook', name: 'Songbook', type: ItemType.Instrument, weight: 1, cost: 10, weapon: null, armor: null, usable: null, slot: 'Instrument', maxStack: 1 },
    { id: 'healing_potion', name: 'Healing Potion', type: ItemType.Consumable, weight: 1, cost: 25, weapon: null, armor: null, usable: { healsHp: 10, restoresSp: 0, cureStatus: '' }, slot: 'Accessory', maxStack: 5 },
  ],
  // Mirror the runtime demo roster so downstream systems see the same depth-scaled difficulty curve.
  monsters: [
    { id: 'serpent', name: 'Cavern Serpent', stats: { hpMin: 5, hpMax: 9, armorClass: 9, toHit: 0, damageMin: 1, damageMax: 4, magicResist: 5 }, canCastSpells: false, specialAbility: '', fleeChance: 25 },
    { id: 'hobbit', name: 'Trickster Halfling', stats: { hpMin: 6, hpMax: 11, armorClass: 8, toHit: 1, damageMin: 2, damageMax: 5, magicResist: 10 }, canCastSpells: false, specialAbility: 'Backstab', fleeChance: 20 },
    { id: 'hobgoblin', name: 'Tunnel Hobgoblin', stats: { hpMin: 9, hpMax: 14, armorClass: 7, toHit: 2, damageMin: 3, damageMax: 6, magicResist: 12 }, canCastSpells: false, specialAbility: 'War Cry', fleeChance: 10 },
    { id: 'skeleton', name: 'Restless Skeleton', stats: { hpMin: 7, hpMax: 12, armorClass: 7, toHit: 1, damageMin: 2, damageMax: 6, magicResist: 15 }, canCastSpells: false, specialAbility: 'Bone Chill', fleeChance: 5 },
    { id: 'knight', name: 'Banished Knight', stats: { hpMin: 12, hpMax: 20, armorClass: 5, toHit: 3, damageMin: 4, damageMax: 8, magicResist: 18 }, canCastSpells: false, specialAbility: 'Shield Bash', fleeChance: 0 },
    { id: 'monk', name: 'Ashen Monk', stats: { hpMin: 10, hpMax: 16, armorClass: 6, toHit: 2, damageMin: 3, damageMax: 7, magicResist: 20 }, canCastSpells: false, specialAbility: 'Stunning Palm', fleeChance: 5 },
    { id: 'mage', name: 'Arcane Adept', stats: { hpMin: 9, hpMax: 13, armorClass: 8, toHit: 2, damageMin: 3, damageMax: 8, magicResist: 25 }, canCastSpells: true, specialAbility: 'Fire Bolt', fleeChance: 15 },
    { id: 'enchantress', name: 'Storm Enchantress', stats: { hpMin: 10, hpMax: 15, armorClass: 7, toHit: 3, damageMin: 4, damageMax: 9, magicResist: 30 }, canCastSpells: true, specialAbility: 'Chain Lightning', fleeChance: 10 },
  ]
};

export function createStarterParty(): { party: Party; characters: Character[]; inventories: Inventory[]; } {
  const hero: Character = {
    id: 'c_hero', name: 'Hero', race: Race.Human, classType: CharacterClass.Warrior,
    level: 1, experience: 0, hpCurrent: 16, hpMax: 16, spCurrent: 0, spMax: 0,
    primary: { strength: 16, intelligence: 10, dexterity: 12, constitution: 15, luck: 10 },
    derived: { armorClass: 9, toHitBonus: 1, damageBonus: 1, magicResist: 0 },
    inventoryId: 'inv_hero',
    equipment: { weapon: '', offhand: '', head: '', body: '', hands: '', feet: '', instrument: '', accessory: '' },
    statusEffects: []
  };
  const bard: Character = {
    id: 'c_bard', name: 'Lyre', race: Race.Human, classType: CharacterClass.Bard,
    level: 1, experience: 0, hpCurrent: 12, hpMax: 12, spCurrent: 0, spMax: 0,
    primary: { strength: 12, intelligence: 12, dexterity: 12, constitution: 10, luck: 12 },
    derived: { armorClass: 9, toHitBonus: 0, damageBonus: 0, magicResist: 0 },
    inventoryId: 'inv_bard',
    equipment: { weapon: '', offhand: '', head: '', body: '', hands: '', feet: '', instrument: '', accessory: '' },
    statusEffects: []
  };
  const invHero: Inventory = { id: 'inv_hero', ownerId: 'c_hero', capacity: 50, items: [] };
  const invBard: Inventory = { id: 'inv_bard', ownerId: 'c_bard', capacity: 50, items: [] };

  // Equip basics
  addItem(invHero, makeInstance('sword_basic', 1));
  addItem(invHero, makeInstance('leather_armor', 1));
  addItem(invBard, makeInstance('songbook', 1));

  return { party: { id: 'p_main', name: 'Main Party', memberIds: [hero.id, bard.id] }, characters: [hero, bard], inventories: [invHero, invBard] };
}

export function makeInstance(itemId: string, quantity: number): ItemInstance {
  return { id: itemId + '_' + Math.random().toString(36).slice(2), itemId, charges: 0, quantity, equipped: false };
}

export function addItem(inv: Inventory, inst: ItemInstance): boolean {
  if (inv.items.length >= 100) { return false; }
  inv.items.push(inst);
  return true;
}

export function equip(character: Character, inv: Inventory, itemId: string): boolean {
  for (let i = 0; i < inv.items.length; i++) {
    const it = inv.items[i];
    if (it.itemId === itemId && it.quantity > 0) {
      it.equipped = true;
      // Simplified: assign to slot by DB definition
      const def = getItem(itemId);
      if (def.slot === 'Weapon') character.equipment.weapon = it.itemId;
      else if (def.slot === 'Body') character.equipment.body = it.itemId;
      else if (def.slot === 'Instrument') character.equipment.instrument = it.itemId;
      return true;
    }
  }
  return false;
}

export function getItem(itemId: string): Item {
  for (let i = 0; i < SampleDB.items.length; i++) { if (SampleDB.items[i].id === itemId) return SampleDB.items[i]; }
  return SampleDB.items[0];
}

export function getMonster(speciesId: string): MonsterSpecies {
  for (let i = 0; i < SampleDB.monsters.length; i++) { if (SampleDB.monsters[i].id === speciesId) return SampleDB.monsters[i]; }
  return SampleDB.monsters[0];
}

export function roll(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

export function generateEncounter(depth: number): Encounter {
  // Keep parity with the runtime demo encounter table so tests reflect game balance tweaks.
  const tables = [
    { maxDepth: 1, options: [ { species: 'serpent', min: 2, max: 4 }, { species: 'hobbit', min: 1, max: 3 } ] },
    { maxDepth: 2, options: [ { species: 'hobgoblin', min: 2, max: 4 }, { species: 'skeleton', min: 1, max: 3 } ] },
    { maxDepth: 3, options: [ { species: 'monk', min: 1, max: 2 }, { species: 'knight', min: 1, max: 2 } ] },
    { maxDepth: Number.POSITIVE_INFINITY, options: [ { species: 'mage', min: 1, max: 2 }, { species: 'enchantress', min: 1, max: 2 } ] },
  ];
  const tier = tables.find(t => depth <= t.maxDepth) || tables[tables.length - 1];
  const picks = tier.options.slice();
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = picks[i];
    picks[i] = picks[j];
    picks[j] = tmp;
  }
  const groups: MonsterGroup[] = [];
  const groupCount = Math.min(picks.length, roll(1, 2));
  for (let i = 0; i < groupCount; i++) {
    const choice = picks[i];
    groups.push({ speciesId: choice.species, count: roll(choice.min, choice.max) });
  }
  return {
    id: 'enc_' + Math.random().toString(36).slice(2),
    locationId: 'loc_demo',
    difficulty: depth,
    surpriseParty: false,
    surpriseMonsters: false,
    canFlee: depth <= 3,
    groups,
  };
}

export function startCombat(enc: Encounter, party: Party, characters: Character[]): CombatState {
  const combatants: Combatant[] = [];
  // Party combatants
  for (let i = 0; i < party.memberIds.length; i++) {
    const cid = party.memberIds[i];
    const c = findCharacter(cid, characters);
    if (c) {
      combatants.push({ id: c.id, name: c.name, side: TurnSide.Party, hpCurrent: c.hpCurrent, hpMax: c.hpMax, armorClass: c.derived.armorClass, toHit: c.derived.toHitBonus, damageMin: 1 + c.derived.damageBonus, damageMax: 6 + c.derived.damageBonus, magicResist: c.derived.magicResist, alive: true });
    }
  }
  // Monsters
  for (let g = 0; g < enc.groups.length; g++) {
    const grp = enc.groups[g];
    const species = getMonster(grp.speciesId);
    for (let n = 0; n < grp.count; n++) {
      const hp = roll(species.stats.hpMin, species.stats.hpMax);
      const id = species.id + '_' + (g + 1) + '_' + (n + 1);
      combatants.push({ id, name: species.name, side: TurnSide.Monsters, hpCurrent: hp, hpMax: hp, armorClass: species.stats.armorClass, toHit: species.stats.toHit, damageMin: species.stats.damageMin, damageMax: species.stats.damageMax, magicResist: species.stats.magicResist, alive: true });
    }
  }
  const initiative: InitiativeEntry[] = [];
  for (let i = 0; i < combatants.length; i++) {
    initiative.push({ id: combatants[i].id, side: combatants[i].side, order: roll(1, 20) });
  }
  initiative.sort(function(a, b) { return a.order - b.order; });
  return { id: 'cmb_' + Math.random().toString(36).slice(2), encounterId: enc.id, round: 1, initiative, combatants, activeIndex: 0, ended: false, winner: '' };
}

function findCharacter(id: string, list: Character[]): Character | null {
  for (let i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
  return null;
}

export function stepCombat(state: CombatState): CombatState {
  if (state.ended) return state;
  const active = state.initiative[state.activeIndex];
  const actor = findCombatant(state, active.id);
  if (!actor || !actor.alive) return advance(state);
  if (active.side === TurnSide.Party) {
    // simple: attack first living monster
    const target = findFirstAlive(state, TurnSide.Monsters);
    if (target) performAttack(actor, target);
  } else {
    const target = findFirstAlive(state, TurnSide.Party);
    if (target) performAttack(actor, target);
  }
  // check end
  const partyAlive = hasAlive(state, TurnSide.Party);
  const monstersAlive = hasAlive(state, TurnSide.Monsters);
  if (!partyAlive || !monstersAlive) {
    state.ended = true;
    state.winner = partyAlive ? 'Party' : 'Monsters';
    return state;
  }
  return advance(state);
}

function advance(state: CombatState): CombatState {
  state.activeIndex = state.activeIndex + 1;
  if (state.activeIndex >= state.initiative.length) {
    state.activeIndex = 0;
    state.round = state.round + 1;
  }
  return state;
}

function findCombatant(state: CombatState, id: string): Combatant | null {
  for (let i = 0; i < state.combatants.length; i++) { if (state.combatants[i].id === id) return state.combatants[i]; }
  return null;
}

function findFirstAlive(state: CombatState, side: TurnSide): Combatant | null {
  for (let i = 0; i < state.combatants.length; i++) { const c = state.combatants[i]; if (c.side === side && c.alive) return c; }
  return null;
}

function hasAlive(state: CombatState, side: TurnSide): boolean {
  for (let i = 0; i < state.combatants.length; i++) { const c = state.combatants[i]; if (c.side === side && c.alive) return true; }
  return false;
}

function performAttack(attacker: Combatant, defender: Combatant): void {
  const rollD20 = Math.floor(Math.random() * 20) + 1;
  const hit = rollD20 + attacker.toHit >= defender.armorClass;
  if (hit) {
    const dmg = roll(attacker.damageMin, attacker.damageMax);
    defender.hpCurrent = defender.hpCurrent - dmg;
    if (defender.hpCurrent <= 0) { defender.hpCurrent = 0; defender.alive = false; }
  }
}

// Simple demo runner for non-UI test
export function demoBattle(): string {
  const s = createStarterParty();
  const enc = generateEncounter(1);
  let cmb = startCombat(enc, s.party, s.characters);
  let safety = 200;
  while (!cmb.ended && safety > 0) { cmb = stepCombat(cmb); safety = safety - 1; }
  return cmb.winner === 'Party' ? 'Party wins' : 'Monsters win';
}
