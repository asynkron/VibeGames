import { CLASS_DATA, classProgression, constitutionBonus, spellSlots, characterProgression } from '../rules/classes.js';
import { validateParty, maximumLevel, starterLoadout } from '../rules/characters.js';
import { attackRoll, rollDice, savingThrow } from '../rules/dice.js';
import { SPELL_LIBRARY, spellRange, spellDuration, spellDamageDice } from '../rules/spells.js';
import { POOL_MONSTERS } from '../data/poolMonsters.js';
import { getWall, WALL, DX, DY, backOf } from '../dungeon.js';
import { createBattlefield } from './battlefield.js';
import { footprintForKind } from '../combatFootprints.js';
import { INVENTORY_CAPACITY, ITEM_DB } from '../items.js';
import { getCityService } from '../cityServices.js';
import { createInventory, createEquipment, addInventoryItem, equipCarriedItem, unequipItem, transferCarriedItem, useCarriedItem, getEquippedItem, computeCharacterStats, consumeWeaponAmmo, effectiveAttributes } from './inventory.js';

export function createGameSystems({ hud, combatView, dungeon, onPartyDefeated, characters, onDungeonChanged = () => {} }) {
  if (typeof onPartyDefeated !== 'function') throw new TypeError('A party defeat must be handled by the world journey.');
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

  function makeCharacter(id, name, classType, changes = {}) {
    const definition = CLASS_DATA[classType];
    const attributes = { ...definition.attributes, ...changes };
    const progression = classProgression(classType, 1);
    const character = {
      id, name, classType, classes: [classType], classLevels: { [classType]: 1 }, classXp: { [classType]: 0 }, race: 'Human', alignment: 'Neutral good', attributes,
      level: 1, xp: 0, exceptionalStrength: 0,
      base: { ac: 10, thac0: progression.thac0, saves: progression.saves, movement: 12, damageDice: '1d2', damageBonus: 0, magicRes: 0 },
      inventory: createInventory(), equipment: createEquipment(), statusEffects: [],
      knownSpells: [], spellPreparation: [], preparedSpells: [],
      description: definition.description, alive: true, healthStatus: 'okay',
    };
    character.hpMax = definition.hitDie + constitutionBonus(character);
    character.hpCurrent = character.hpMax;
    character.knownSpells = classType === 'Cleric'
      ? Object.values(SPELL_LIBRARY).filter(spell => spell.classType === classType && spell.level === 1).map(spell => spell.code)
      : classType === 'Magic-user' ? ['MU_SLEEP', 'MU_MAGIC_MISSILE', 'MU_SHIELD', 'MU_READ_MAGIC'] : [];
    return character;
  }

  function describeStatuses(entity) {
    const health = entity.healthStatus && entity.healthStatus !== 'okay' ? entity.healthStatus : '';
    return [health, ...entity.statusEffects.map(status => `${status.name}${Number.isFinite(status.duration) ? ` (${status.duration})` : ''}`)].filter(Boolean).join(', ');
  }

  function applyStatus(target, status) {
    const effect = { ...status, expiresAfterRound: combatState ? combatState.round + Math.max(1, status.duration || 1) : null };
    const index = target.statusEffects.findIndex(existing => existing.id === effect.id);
    if (index >= 0) target.statusEffects[index] = effect;
    else target.statusEffects.push(effect);
  }

  function tickStatuses(targets) {
    for (const entity of targets) {
      entity.statusEffects = entity.statusEffects.filter(status => {
        if (status.persistent || status.duration === Infinity) return true;
        if (combatState.round < status.expiresAfterRound) {
          status.duration = status.expiresAfterRound - combatState.round;
          return true;
        }
        return false;
      });
    }
  }

  function hasStatus(entity, predicate) { return entity.statusEffects.some(predicate); }
  function abilityClassLevel(character, classType) { return character.classLevels[classType]; }
  function canCastInCamp(spell) { return spell.usableInCamp && spell.target !== 'deadEnemy' && spell.type !== 'summon'; }
  function isUnableToAct(entity) {
    return entity.healthStatus !== 'okay' || hasStatus(entity, status => status.modifiers?.stunned || status.modifiers?.held || status.modifiers?.sleep);
  }

  function healTarget(target, amount) {
    if (['dead', 'gone'].includes(target.healthStatus)) return false;
    const before = target.hpCurrent;
    target.hpCurrent = Math.min(target.hpMax, target.hpCurrent + amount);
    if (target.hpCurrent > 0) { target.alive = true; target.healthStatus = 'okay'; }
    return target.hpCurrent > before;
  }

  const inventoryListeners = new Set();
  if (characters !== undefined) {
    const validation = validateParty(characters);
    if (!validation.ok) throw new TypeError(validation.message);
  }
  const party = {
    id: 'p_main', name: 'Adventurers of Phlan', gold: 150,
    members: characters !== undefined ? characters.map((descriptor, index) => ({ ...makeCharacter(`c_${index + 1}`, descriptor.name.trim(), descriptor.classType, descriptor.attributes), race: descriptor.race, alignment: descriptor.alignment, exceptionalStrength: descriptor.exceptionalStrength || 0 })) : [
      makeCharacter('c_fighter', 'Brynn', 'Fighter'),
      makeCharacter('c_fighter2', 'Aegis', 'Fighter', { strength: 17, dexterity: 13, constitution: 17 }),
      makeCharacter('c_cleric', 'Meris', 'Cleric'),
      makeCharacter('c_mage', 'Quint', 'Magic-user'),
      makeCharacter('c_thief', 'Shade', 'Thief'),
      makeCharacter('c_mage2', 'Elora', 'Magic-user', { dexterity: 15, charisma: 15 }),
    ],
  };
  if (characters === undefined) party.members[0].exceptionalStrength = 76;
  for (const [index, hero] of party.members.entries()) {
    hero.classes = [...(characters?.[index].classes || [hero.classType])];
    hero.classLevels = Object.fromEntries(hero.classes.map(classType => [classType, 1]));
    hero.classXp = Object.fromEntries(hero.classes.map(classType => [classType, 0]));
    const progression = characterProgression(hero);
    hero.base.thac0 = progression.thac0; hero.base.saves = progression.saves;
    hero.hpMax = Math.ceil(progression.hitDie + constitutionBonus(hero)); hero.hpCurrent = hero.hpMax;
    hero.knownSpells = [];
    hero.spellPreparation = [];
    if (hero.classes.includes('Cleric')) {
      hero.knownSpells.push(...Object.values(SPELL_LIBRARY).filter(spell => spell.classType === 'Cleric' && spell.level === 1 && !spell.scrollOnly).map(spell => spell.code));
      hero.spellPreparation.push(...Array(spellSlots(hero, 'Cleric')[0]).fill('CL_CURE_LIGHT_WOUNDS'));
    }
    if (hero.classes.includes('Magic-user')) {
      hero.knownSpells.push('MU_SLEEP', 'MU_MAGIC_MISSILE', 'MU_SHIELD', 'MU_READ_MAGIC');
      hero.spellPreparation.push(hero === party.members.find(member => member.classes?.includes('Magic-user')) ? 'MU_SLEEP' : 'MU_MAGIC_MISSILE');
    }
    hero.preparedSpells = [...hero.spellPreparation];
  }

  const quests = [
    { id: 'slums', name: 'Clear the Slums', area: 'Slums', required: 3, victories: 0, gold: 6000, xp: 2000, claimed: false },
    { id: 'sokal-keep', name: 'Secure Sokal Keep', area: 'Sokal Keep', required: 2, victories: 0, gold: 5000, xp: 1500, claimed: false },
    { id: 'kutos-well', name: "Patrol Kuto's Well", area: "Kuto's Well", required: 2, victories: 0, gold: 1000, xp: 400, claimed: false },
  ];

  function setupStartingGear() {
    party.members.forEach((hero, index) => {
      const loadout = starterLoadout(hero.classType, index === 1 ? 1 : 0);
      for (const [slot, itemId] of Object.entries(loadout.equipment)) {
        const added = addInventoryItem(hero, itemId);
        if (!added.ok) throw new Error(added.message);
        const equipped = equipCarriedItem(hero, hero.inventory.findIndex(entry => entry?.itemId === itemId), slot);
        if (!equipped.ok) throw new Error(equipped.message);
      }
      for (const entry of loadout.carried) {
        const [itemId, quantity] = Array.isArray(entry) ? entry : [entry, 1];
        const added = addInventoryItem(hero, itemId, quantity);
        if (!added.ok) throw new Error(added.message);
      }
    });
  }
  setupStartingGear();

  let serviceState = null;

  function openCamp() {
    if (combatState) return { ok: false, message: 'Camp is unavailable during combat.' };
    closeService();
    serviceState = { id: 'camp', revision: 0, area: dungeon.id, x: dungeon.x, y: dungeon.y };
    campMenu();
    return { ok: true, message: 'Camp' };
  }

  function campMenu(message = '') {
    const service = { id: 'camp', name: 'Camp', description: 'Inspect spellbooks, choose preparations, and cast memorized spells. Rest at an inn to replenish them.' };
    serviceMenu(service, message || 'Choose a companion for spell preparation or casting.', party.members.filter(hero => hero.knownSpells.length).map(hero => ({ label: `${hero.name} — ${hero.classes.join(' / ')}`, onSelect: () => campHero(service, hero) })));
  }

  function campHero(service, hero, message = '') {
    serviceMenu(service, message || `${hero.name}: ${hero.preparedSpells.length} memorized spells.`, [
      { label: 'Choose spell preparations', onSelect: () => preparationMenu(service, hero) },
      ...[...new Set(hero.preparedSpells)].map(code => SPELL_LIBRARY[code]).filter(canCastInCamp).map(spell => ({ label: `Cast ${spell.name}`, onSelect() {
        if (['ally','any'].includes(spell.target)) serviceMenu(service, `Cast ${spell.name} on whom?`, party.members.filter(target => !['dead','gone'].includes(target.healthStatus)).map(target => ({ label: target.name, onSelect() { const response = castAdventureSpell(hero.id, spell.code, target.id); campHero(service, hero, response.message); } })), hero);
        else { const response = castAdventureSpell(hero.id, spell.code); campHero(service, hero, response.message); }
      } })),
      ...hero.inventory.flatMap((entry,index) => entry?.identified && ITEM_DB[entry.itemId].scrollClass === 'Magic-user' && hero.classes.includes('Magic-user') ? [{ label: `Scribe ${ITEM_DB[entry.itemId].name}`, onSelect() { const response = scribeScroll(hero.id, index); campHero(service, hero, response.message); } }] : []),
      { label: 'Camp menu', onSelect: () => campMenu() },
    ], hero);
  }

  function standingAtService(id) {
    if (id === 'camp') return serviceState?.id === 'camp' && serviceState.area === dungeon.id && serviceState.x === dungeon.x && serviceState.y === dungeon.y;
    return dungeon.services?.find(service => service.id === id && service.x === dungeon.x && service.y === dungeon.y);
  }

  function closeService() {
    if (!serviceState) return;
    serviceState = null;
    hud.clearActions();
  }

  function serviceMenu(service, prompt, buttons, hero = null) {
    if (!serviceState || serviceState.id !== service.id) return;
    const menu = serviceState;
    const revision = ++menu.revision;
    hud.setActions({
      prompt,
      buttons: [...buttons, { label: 'Leave', role: 'back', onSelect: closeService }].map(button => ({
        ...button,
        onSelect() {
          if (serviceState === menu && menu.revision === revision && !combatState && standingAtService(service.id)) button.onSelect();
        },
      })),
      active: { id: hero?.id, heading: service.name, details: service.description },
    });
  }

  function restoreParty() {
    for (const hero of party.members) {
      hero.alive = true;
      hero.hpCurrent = hero.hpMax;
      hero.healthStatus = 'okay';
      hero.preparedSpells = [...hero.spellPreparation];
      hero.statusEffects = [];
    }
  }

  function shopItems(service, hero, message = '') {
    serviceMenu(service, `${hero.name} — ${party.gold} gold${message ? `. ${message}` : ''}`, service.stock.map(({ itemId, price: basePrice, quantity = 1 }) => {
      const price = Math.max(1, Math.floor(basePrice * (1 - Math.max(0, effectiveAttributes(hero).charisma - 15) * 0.01)));
      return ({
      label: `${ITEM_DB[itemId].name}${quantity > 1 ? ` x${quantity}` : ''} — ${price} gold`,
      onSelect() {
        if (party.gold < price) {
          shopItems(service, hero, 'Not enough gold.');
          return;
        }
        const result = addInventoryItem(hero, itemId, quantity);
        if (result.ok) {
          party.gold -= price;
          renderParty();
        }
        shopItems(service, hero, result.message);
      },
    }); }), hero);
  }

  function trainingRequirements(hero, classType = hero.classType) {
    const level = hero.classLevels[classType];
    return { xp: level >= maximumLevel(hero.race, classType) ? null : classProgression(classType, level).nextLevelXp, gold: 1000 };
  }

  function trainHero(service, hero) {
    const classType = service.classes.find(classType => hero.classes.includes(classType));
    const required = trainingRequirements(hero, classType);
    let message;
    if (!hero.classes.includes(classType)) message = 'This trainer does not teach that class.';
    else if (required.xp === null) message = 'The character has reached the campaign level limit.';
    else if (!hero.alive) message = 'Visit the temple before training a fallen companion.';
    else if (hero.classXp[classType] < required.xp) message = `${hero.name} needs ${required.xp} earned XP; ${hero.xp} available.`;
    else if (party.gold < required.gold) message = `Training costs ${required.gold} gold; ${party.gold} available.`;
    else {
      const hpGain = Math.max(1, Math.ceil((rollDice(`1d${CLASS_DATA[classType].hitDie}`) + constitutionBonus(hero)) / hero.classes.length));
      party.gold -= required.gold;
      hero.classLevels[classType] += 1;
      hero.level = Math.max(...Object.values(hero.classLevels));
      hero.hpMax += hpGain;
      hero.hpCurrent += hpGain;
      const progression = characterProgression(hero);
      hero.base.thac0 = progression.thac0;
      hero.base.saves = progression.saves;
      for (const spellClass of hero.classes) {
        for (const spell of Object.values(SPELL_LIBRARY).filter(spell => spell.classType === spellClass && !spell.scrollOnly && spellSlots(hero, spellClass)[spell.level - 1] > 0)) {
          if (!hero.knownSpells.includes(spell.code)) hero.knownSpells.push(spell.code);
        }
      }
      message = `${hero.name} reached ${classType} level ${hero.classLevels[classType]}: +${hpGain} HP. Visit the inn to prepare new spells.`;
      renderParty();
    }
    trainerMenu(service, message, hero);
  }

  function nextExperience(hero) {
    const requirements = hero.classes.map(classType => trainingRequirements(hero, classType).xp).filter(xp => xp !== null);
    return requirements.length ? Math.min(...requirements) * hero.classes.length : null;
  }

  function trainerMenu(service, message = '', selectedHero = null) {
    const heroes = party.members.filter(hero => hero.classes.some(classType => service.classes.includes(classType)));
    serviceMenu(service, message || `${service.name} — ${party.gold} gold`, heroes.map(hero => {
      const classType = service.classes.find(classType => hero.classes.includes(classType));
      const required = trainingRequirements(hero, classType);
      return { label: required.xp === null ? `${hero.name} — level ${hero.level}: campaign limit` : `${hero.name} — ${classType} level ${hero.classLevels[classType] + 1}: ${hero.classXp[classType]}/${required.xp} XP, ${required.gold} gold`, onSelect: () => trainHero(service, hero) };
    }), selectedHero);
  }

  function openService(id) {
    const service = getCityService(id);
    if (combatState || !service || !standingAtService(id)) return { ok: false, message: 'Stand at this service outside combat to enter.' };
    closeService();
    serviceState = { id, revision: 0 };
    if (service.type === 'shop') {
      serviceMenu(service, `Choose whose pack to fill — ${party.gold} gold`, party.members.map(hero => ({
        label: `${hero.name} — ${hero.classType}`, onSelect: () => shopItems(service, hero),
      })));
    } else if (service.type === 'trainer') trainerMenu(service);
    else if (service.type === 'temple') {
      serviceMenu(service, service.name, [{
        label: 'Restore the party — free blessing',
        onSelect() {
          restoreParty();
          renderParty();
          serviceMenu(service, 'Every companion is restored. Health, memorized spells, and conditions are renewed.', []);
        },
      }]);
    } else if (service.type === 'training') {
      serviceMenu(service, service.name, [{
        label: 'Begin a safe practice battle',
        onSelect() {
          closeService();
          beginEncounter({ tier: 1, monsterArea: 'Slums', maxEnemies: 1 }, true);
        },
      }]);
    }
    if (service.type === 'inn') innMenu(service);
    else if (service.type === 'council') councilMenu(service);
    else if (service.type === 'tavern') serviceMenu(service, 'Travelers speak of goblins in the Slums and restless dead at Sokal Keep. The council pays those who make Phlan safe.', []);
    return { ok: true, message: service.name };
  }

  function renderParty() {
    const members = party.members.map((member) => {
      const stats = computeCharacterStats(member);
      return {
        id: member.id,
        name: member.name,
        classType: member.classType, classes: [...member.classes], displayClass: member.classes.join(' / '), levelText: member.classes.map(classType => `${classType} ${member.classLevels[classType]}`).join(' / '),
        level: member.level,
        xp: member.xp,
        hpCurrent: member.hpCurrent,
        hpMax: member.hpMax,
        preparedCount: member.preparedSpells.length,
        spellCapacity: spellSlots(member).reduce((total, count) => total + count, 0),
        nextLevelXp: nextExperience(member),
        ac: stats.ac,
        thac0: stats.thac0,
        damageMin: stats.minDamage,
        damageMax: stats.maxDamage,
        alive: member.alive,
        equipment: { ...member.equipment },
        attributes: effectiveAttributes(member),
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
        id: member.id, name: member.name, classType: member.classType, displayClass: member.classes.join(' / '), levelText: member.classes.map(classType => `${classType} ${member.classLevels[classType]}`).join(' / '), level: member.level, xp: member.xp,
        hpCurrent: member.hpCurrent, hpMax: member.hpMax, thac0: computeCharacterStats(member).thac0,
        preparedCount: member.preparedSpells.length, spellCapacity: spellSlots(member).reduce((sum, slots) => sum + slots, 0),
        nextLevelXp: nextExperience(member), healthStatus: member.healthStatus,
        alive: member.alive, race: member.race, alignment: member.alignment, attributes: effectiveAttributes(member),
      },
      equipment: { ...member.equipment },
      inventory: member.inventory.map(entry => entry ? { ...entry } : null),
      stats: computeCharacterStats(member),
      capacity: INVENTORY_CAPACITY,
      party: party.members.map(({ id, name, classType, classes }) => ({ id, name, classType, classes: [...classes], displayClass: classes.join(' / ') })),
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

  function prepareSpell(characterId, code) {
    const hero = findPartyMember(characterId);
    const spell = SPELL_LIBRARY[code];
    if (combatState || !hero || !spell || !hero.knownSpells.includes(code)) return { ok: false, message: 'Choose a known spell outside combat.' };
    const slots = spellSlots(hero, spell.classType);
    const count = hero.spellPreparation.filter(entry => SPELL_LIBRARY[entry].classType === spell.classType && SPELL_LIBRARY[entry].level === spell.level).length;
    if (count >= slots[spell.level - 1]) return { ok: false, message: `No level ${spell.level} preparation slot available.` };
    hero.spellPreparation.push(code);
    renderParty();
    return { ok: true, message: `${spell.name} selected. Rest at the inn to memorize it.` };
  }

  function unprepareSpell(characterId, index) {
    const hero = findPartyMember(characterId);
    if (combatState || !hero || !Number.isInteger(index) || index < 0 || index >= hero.spellPreparation.length) return { ok: false, message: 'Choose a preparation slot outside combat.' };
    hero.spellPreparation.splice(index, 1);
    renderParty();
    return { ok: true, message: 'Preparation removed. Existing memorized charges last until the next rest.' };
  }

  function preparationMenu(service, hero, message = '') {
    const slots = spellSlots(hero);
    serviceMenu(service, message || `${hero.name}: choose spells to prepare. Slots ${slots.join('/')}. Rest to memorize them.`, [
      ...hero.spellPreparation.map((code, index) => ({ label: `Remove ${SPELL_LIBRARY[code].name} (${index + 1})`, onSelect() { const result = unprepareSpell(hero.id, index); preparationMenu(service, hero, result.message); } })),
      ...hero.knownSpells.map(code => ({ label: `Prepare ${SPELL_LIBRARY[code].name} — level ${SPELL_LIBRARY[code].level}`, onSelect() { const result = prepareSpell(hero.id, code); preparationMenu(service, hero, result.message); } })),
      { label: service.id === 'camp' ? 'Camp menu' : 'Inn menu', onSelect: () => service.id === 'camp' ? campMenu() : innMenu(service) },
    ], hero);
  }

  function innMenu(service, message = '') {
    serviceMenu(service, message || `Safe rest and spell preparation — ${party.gold} gold`, [
      { label: `Rest and memorize spells — ${service.price} gold`, onSelect() {
        if (party.gold < service.price) { innMenu(service, 'Not enough gold for lodging.'); return; }
        party.gold -= service.price;
        for (const hero of party.members) {
          if (!['dead', 'gone'].includes(hero.healthStatus)) healTarget(hero, 1);
          if (hero.alive) hero.preparedSpells = [...hero.spellPreparation];
        }
        renderParty();
        innMenu(service, 'A day of safe rest restores 1 HP and memorizes the selected spells.');
      } },
      ...party.members.filter(hero => hero.knownSpells.length).map(hero => ({ label: `Prepare spells — ${hero.name}`, onSelect: () => preparationMenu(service, hero) })),
    ]);
  }

  function awardExperience(hero, amount) {
    for (const classType of hero.classes) {
      const prime = classType === 'Fighter' ? 'strength' : classType === 'Cleric' ? 'wisdom' : classType === 'Thief' ? 'dexterity' : 'intelligence';
      hero.classXp[classType] += Math.floor(amount / hero.classes.length * (hero.attributes[prime] >= 16 ? 1.1 : 1));
    }
    hero.xp = Object.values(hero.classXp).reduce((total, xp) => total + xp, 0);
  }

  function councilMenu(service, message = '') {
    serviceMenu(service, message || 'The Council of New Phlan offers commissions to reclaim the ruined districts.', quests.map(quest => ({
      label: `${quest.name} — ${quest.claimed ? 'reward claimed' : `${Math.min(quest.victories, quest.required)}/${quest.required} victories`}`,
      onSelect() {
        if (quest.claimed) { councilMenu(service, 'This commission is complete.'); return; }
        if (quest.victories < quest.required) { councilMenu(service, `${quest.name}: win ${quest.required} battles in ${quest.area}, then return for ${quest.gold} gold and ${quest.xp} XP each.`); return; }
        quest.claimed = true;
        party.gold += quest.gold;
        for (const hero of party.members) awardExperience(hero, quest.xp);
        renderParty();
        councilMenu(service, `${quest.name} complete: ${quest.gold} gold and ${quest.xp} XP each.${quest.id === 'sokal-keep' ? ' The wilderness boat route is open.' : ''}`);
      },
    })));
  }

  function livingPartyMembers() { return party.members.filter(member => member.alive); }
  function livingMonsters(monsters) { return monsters.filter(monster => monster.alive && !hasStatus(monster, status => status.modifiers?.charmed)); }

  const monsterKinds = {
    kobold: 'KOBOLD', goblin: 'GOBLIN GUARD', orc: 'ORC', hobgoblin: 'HOBGOBLIN', gnoll: 'GNOLL',
    bugbear: 'BUGBEAR', ogre: 'OGRE', troll: 'TROLL', skeleton: 'SKELETON', zombie: 'ZOMBIE', ghoul: 'GHOUL', dragon: 'TYRANITHRAXUS',
  };
  const MONSTER_DB = Object.fromEntries(Object.entries(monsterKinds).map(([kind, name]) => [kind, POOL_MONSTERS.find(record => record.name === name)]));
  const AREA_ENCOUNTERS = {
    Slums: ['kobold', 'goblin', 'orc'], 'Sokal Keep': ['skeleton', 'zombie'],
    "Kuto's Well": ['orc', 'hobgoblin', 'gnoll'], 'World Map': ['kobold', 'orc', 'gnoll', 'bugbear', 'ogre'],
  };

  function makeMonster(speciesId, index) {
    const record = MONSTER_DB[speciesId];
    if (!record) throw new RangeError(`Unknown monster kind ${speciesId}`);
    return {
      id: `${record.id}_${index}`, recordId: record.id, name: record.name.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase()),
      speciesId, footprint: footprintForKind(speciesId), hpCurrent: record.hp, hpMax: record.hp,
      ac: record.ac, thac0: record.thac0, saves: { ...record.saves }, attacks: record.attacks,
      movement: record.movement, attributes: record.attributes, magicRes: record.magicRes, xpAward: record.xp,
      effects: record.effects, statusEffects: [], healthStatus: 'okay', alive: true,
    };
  }

  function computeMonsterAttack(monster) {
    let thac0 = monster.thac0, damageBonus = 0, ac = monster.ac, movement = monster.movement;
    const saves = { ...monster.saves };
    for (const status of monster.statusEffects) {
      thac0 += status.modifiers?.thac0 || 0; damageBonus += status.modifiers?.damageBonus || 0; ac += status.modifiers?.ac || 0;
      movement *= status.modifiers?.movementMultiplier ?? 1;
      for (const key of Object.keys(saves)) saves[key] += status.modifiers?.saves || 0;
    }
    return { thac0, damageBonus, ac, saves, movement, magicRes: monster.magicRes };
  }

  function generateEncounter({ tier = 1, maxEnemies, monsterArea }) {
    const options = AREA_ENCOUNTERS[monsterArea];
    if (!options || !Number.isInteger(maxEnemies) || maxEnemies < 1) throw new RangeError('An encounter needs an original area and a positive enemy limit.');
    const species = options[roll(0, options.length - 1)];
    const count = roll(1, Math.min(maxEnemies, tier + 2, party.members.length));
    return { id: `enc_${Math.random().toString(36).slice(2)}`, tier, monsterArea, canFlee: true, groups: [{ species, count }] };
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

  function hitCheck(thac0, armorClass, bonus = 0) { return attackRoll(thac0, armorClass, bonus); }

  function applyPhysicalDamage(defender, amount) {
    defender.hpCurrent -= amount;
    if (defender.base) {
      defender.healthStatus = defender.hpCurrent > 0 ? 'okay' : defender.hpCurrent === 0 ? 'unconscious' : defender.hpCurrent > -10 ? 'dying' : 'dead';
      defender.alive = defender.hpCurrent > 0;
    } else if (defender.hpCurrent <= 0) { defender.hpCurrent = 0; defender.alive = false; defender.healthStatus = 'dead'; }
    if (combatState) { renderParty(); publishBattle(combatState); }
  }

  function performAttack(attacker, defender, options = {}) {
    if (!attacker.alive || !defender?.alive || isUnableToAct(attacker)) return { hit: false, damage: 0 };
    const stats = computeCharacterStats(attacker);
    const weapon = getEquippedItem(attacker, 'mainhand');
    if (weapon?.ranged && !weapon.magicBonus && hasStatus(defender, status => status.modifiers?.immuneNormalMissiles)) { log(`${defender.name} is protected from normal missiles.`); return { hit: false, damage: 0 }; }
    attacker.statusEffects = attacker.statusEffects.filter(status => !status.untilAttack);
    const helpless = isUnableToAct(defender);
    const backstab = attacker.classes.includes('Thief') && !getEquippedItem(attacker, 'mainhand')?.ammoType && !getEquippedItem(attacker, 'chest')?.preventsThiefSkills && defender.facing
      && (() => { const from = combatState.board.position(attacker.id), to = combatState.board.position(defender.id); return Math.sign(from.x - to.x) === -defender.facing.x && Math.sign(from.y - to.y) === -defender.facing.y; })();
    const result = hitCheck(stats.thac0, computeMonsterAttack(defender).ac, (options.toHitBonus || 0) + (backstab ? 4 : 0));
    if (!helpless && !result.success) { log(`${attacker.name} misses ${defender.name}.`); return { hit: false, damage: 0 }; }
    let damage = Math.max(1, rollDice(defender.footprint.width > 1 ? stats.largeDamageDice : stats.damageDice) + stats.damageBonus + (options.damageBonus || 0));
    if (backstab) damage *= abilityClassLevel(attacker, 'Thief') >= 9 ? 4 : abilityClassLevel(attacker, 'Thief') >= 5 ? 3 : 2;
    if (defender.speciesId === 'skeleton' && !['mace', 'flail', 'quarterstaff'].includes(attacker.equipment.mainhand)) damage = Math.max(1, Math.floor(damage / 2));
    if (helpless) damage = Math.max(damage, defender.hpCurrent);
    applyPhysicalDamage(defender, damage);
    if (!defender.facing) { const from = combatState.board.position(attacker.id), to = combatState.board.position(defender.id); defender.facing = { x: Math.sign(from.x - to.x), y: Math.sign(from.y - to.y) }; }
    log(`${attacker.name}${backstab ? ' backstabs' : ' hits'} ${defender.name} for ${damage} damage${defender.alive ? '.' : ' — defeated.'}`);
    return { hit: true, damage };
  }

  function performMonsterAttack(monster, defender, group = monster.attacks[0]) {
    if (!monster.alive || !defender?.alive || isUnableToAct(monster)) return { hit: false, damage: 0 };
    const stats = computeMonsterAttack(monster);
    const defenderStats = defender.base ? computeCharacterStats(defender) : computeMonsterAttack(defender);
    const image = defender.statusEffects.find(status => status.modifiers?.images > 0);
    if (image && roll(1, image.modifiers.images + 1) > 1) { image.modifiers.images -= 1; log(`${monster.name} destroys a mirror image of ${defender.name}.`); return { hit: false, damage: 0 }; }
    if (hasStatus(defender, status => status.modifiers?.blink) && Math.random() < 0.5) { log(`${defender.name} blinks away from the attack.`); return { hit: false, damage: 0 }; }
    const result = hitCheck(stats.thac0, defenderStats.ac);
    if (!result.success) { log(`${monster.name} misses ${defender.name}.`); return { hit: false, damage: 0 }; }
    const damage = Math.max(1, rollDice(group.dice) + stats.damageBonus);
    applyPhysicalDamage(defender, damage);
    log(`${monster.name} hits ${defender.name} for ${damage} damage${defender.alive ? '.' : ` — ${defender.healthStatus}.`}`);
    if (monster.speciesId === 'ghoul' && defender.alive && !savingThrow(defenderStats.saves, 'death')) {
      applyStatus(defender, { id: 'ghoul_paralysis', name: 'Paralyzed', duration: 2, modifiers: { held: true }, visual: { kind: 'rune', style: 'frost', color: 0x90c8ff } });
      log(`${defender.name} is paralyzed.`);
    }
    return { hit: true, damage };
  }

  const MAGIC_PALETTE = { holy: 0xf4d66a, arcane: 0x55ffff, flame: 0xff8034, frost: 0x90c8ff };
  function spellRune(spell) {
    const style = spell.code === 'MU_FIREBALL' ? 'flame' : spell.classType === 'Cleric' ? 'holy' : spell.code === 'MU_STINKING_CLOUD' ? 'frost' : 'arcane';
    return { style, color: MAGIC_PALETTE[style] };
  }
  function statusVisual(modifiers, rune) { return { kind: modifiers.ac < 0 || modifiers.acBase ? 'shield' : 'rune', ...rune }; }

  async function playBattleEffect(state, kind, source, targets, color, rune) {
    const cell = (entity) => {
      const position = state.board.position(entity.id);
      return { id: entity.id, x: position.x, y: position.y, team: position.team, footprint: position.footprint };
    };
    await combatView.playEffect({ kind, source: cell(source), targets: targets.map(cell), color, ...(rune ? { rune } : {}) });
    return isCurrentBattle(state);
  }

  function resolveTargetsForSpell(state, caster, spell, explicitTargetId, casterLevel = abilityClassLevel(caster, spell.classType)) {
    const allies = caster.base ? state.party : state.monsters;
    const enemies = caster.base ? state.monsters : state.party;
    const inRange = target => state.board.canTarget(caster.id, target.id, { range: Math.max(1, spellRange(spell, casterLevel)) });
    if (spell.target === 'any') return [...allies, ...enemies].filter(target => target.id === explicitTargetId && inRange(target));
    if (spell.target === 'deadEnemy') return enemies.filter(target => target.id === explicitTargetId && !target.alive && target.healthStatus === 'dead' && inRange(target) && canRestorePosition(state, target));
    if (spell.target === 'enemy') return enemies.filter(target => target.id === explicitTargetId && target.alive && inRange(target));
    if (spell.target === 'enemies') {
      const center = explicitTargetId ? state.board.position(explicitTargetId) : null;
      let targets = (spell.friendlyFire && center ? [...enemies, ...allies] : enemies).filter(target => target.alive && inRange(target));
      if (spell.areaRadius != null && center) targets = targets.filter(target => {
        const position = state.board.position(target.id);
        return Math.max(Math.abs(position.x - center.x), Math.abs(position.y - center.y)) <= spell.areaRadius;
      });
      if (spell.areaShape === 'line' && center) {
        const source = state.board.position(caster.id);
        const dx = Math.sign(center.x - source.x), dy = Math.sign(center.y - source.y);
        targets = targets.filter(target => {
          const position = state.board.position(target.id);
          for (let step = 1; step <= spellRange(spell, casterLevel); step += 1) if (state.board.occupies(target.id, source.x + dx * step, source.y + dy * step)) return true;
          return position.x === center.x && position.y === center.y;
        });
      }
      return targets.slice(0, spell.maxTargets || (spell.maxTargetsPerLevel ? casterLevel * spell.maxTargetsPerLevel : Infinity));
    }
    if (spell.target === 'ally') return allies.filter(target => target.id === explicitTargetId && !['dead', 'gone'].includes(target.healthStatus) && inRange(target) && canRestorePosition(state, target));
    if (spell.target === 'party') return allies.filter(target => target.alive).slice(0, spell.maxTargetsPerLevel ? casterLevel * spell.maxTargetsPerLevel : Infinity);
    if (spell.target === 'self') return [caster];
    return [];
  }

  function spellUtility(caster, spell, targets) {
    const utility = spell.utility;
    if (utility === 'detectMagic') {
      const names = new Set();
      for (const hero of party.members) for (const entry of hero.inventory.filter(Boolean)) {
        const item = ITEM_DB[entry.itemId];
        if (item.magicBonus || item.effect || item.scrollSpell || item.healingDice || item.protectionBonus) { entry.magicalVisible = true; names.add(item.name); }
      }
      dungeon.magic = { ...dungeon.magic, detectMagic: true };
      onDungeonChanged();
      return { ok: true, message: names.size ? `Magical items: ${[...names].join(', ')}.` : 'No carried magical items are detected. Magical sight is active.' };
    }
    if (utility === 'readMagic') {
      const scrolls = caster.inventory.filter(entry => entry && ITEM_DB[entry.itemId].scrollClass === 'Magic-user' && !entry.identified);
      if (!scrolls.length) return { ok: false, message: 'No unread arcane scroll is carried. The spell is retained.' };
      for (const scroll of scrolls) scroll.identified = true;
      return { ok: true, message: `Deciphered ${scrolls.length} arcane scroll${scrolls.length === 1 ? '' : 's'}.` };
    }
    if (utility === 'detectTraps') {
      dungeon.magic = { ...dungeon.magic, detectTraps: true };
      const traps = (dungeon.traps || []).filter(trap => Math.abs(trap.x - dungeon.x) + Math.abs(trap.y - dungeon.y) <= spell.range);
      for (const trap of traps) { trap.revealed = true; dungeon.cells[trap.y][trap.x].visited = true; }
      onDungeonChanged();
      return { ok: true, message: traps.length ? `${traps.length} nearby traps are revealed.` : 'No nearby traps are detected. Trap detection is active.' };
    }
    if (utility === 'knock') {
      const keys = ['n','e','s','w'];
      for (let direction = 0; direction < 4; direction += 1) {
        if (getWall(dungeon.cells, dungeon.width, dungeon.height, dungeon.x, dungeon.y, direction) !== WALL.DOOR) continue;
        dungeon.cells[dungeon.y][dungeon.x][keys[direction]] = WALL.OPEN;
        const nextX = dungeon.x + DX[direction], nextY = dungeon.y + DY[direction];
        if (dungeon.cells[nextY]?.[nextX]) dungeon.cells[nextY][nextX][keys[backOf(direction)]] = WALL.OPEN;
        onDungeonChanged();
        return { ok: true, message: 'Knock opens the adjacent door.' };
      }
      return { ok: false, message: 'No adjacent door can be opened. The spell is retained.' };
    }
    if (utility === 'dispelMagic') {
      let removed = 0;
      for (const target of targets) {
        const before = target.statusEffects.length;
        target.statusEffects = target.statusEffects.filter(status => !status.id.startsWith('spell_'));
        removed += before - target.statusEffects.length;
      }
      return { ok: removed > 0, message: removed ? `Dispelled ${removed} magical effects.` : 'No magical effect can be dispelled. The spell is retained.' };
    }
    if (utility === 'removeCurse') {
      let removed = 0;
      for (const target of targets) {
        const before = target.statusEffects.length;
        target.statusEffects = target.statusEffects.filter(status => !status.modifiers?.cursed && !status.modifiers?.bestow_curse && !status.name.toLowerCase().includes('curse'));
        removed += before - target.statusEffects.length;
      }
      return { ok: removed > 0, message: removed ? 'The curse is lifted.' : 'No curse can be removed. The spell is retained.' };
    }
    if (utility === 'restoreLevels') {
      const target = targets.find(target => target.drainedLevels?.length);
      if (!target) return { ok: false, message: 'No drained level can be restored. The scroll is retained.' };
      const drained = target.drainedLevels.pop();
      target.classLevels[drained.classType] += 1;
      target.classXp[drained.classType] = CLASS_DATA[drained.classType].xp[target.classLevels[drained.classType] - 1];
      target.level = Math.max(...Object.values(target.classLevels));
      target.hpMax += drained.hp;
      target.hpCurrent += drained.hp;
      target.xp = Object.values(target.classXp).reduce((total, xp) => total + xp, 0);
      const progression = characterProgression(target);
      target.base.thac0 = progression.thac0; target.base.saves = progression.saves;
      return { ok: true, message: `${target.name}'s drained level is restored.` };
    }
    throw new RangeError(`Unknown spell utility ${utility}`);
  }

  function spellModifiers(spell, caster, target, level) {
    const modifiers = { ...spell.modifiers, ...(spell.status ? { [spell.status === 'asleep' ? 'sleep' : spell.status]: true } : {}) };
    if (spell.effect === 'strength') modifiers.strength = rollDice(spell.abilityDiceByClass[target.classType] || '1d4');
    if (spell.effect === 'friends') modifiers.charisma = rollDice(spell.abilityDice);
    if (spell.effect === 'enlarge') { modifiers.minStrength = 18; modifiers.damageBonus = Math.max(1, Math.floor(level / 2)); }
    if (spell.effect === 'reduce') { modifiers.damageBonus = -Math.max(1, Math.floor(level / 2)); modifiers.movementMultiplier = 0.5; }
    if (spell.imageDice) modifiers.images = rollDice(spell.imageDice);
    return modifiers;
  }

  function applySpellToTarget(caster, target, spell, level) {
    if (spell.target === 'deadEnemy' && (!combatState?.monsters.includes(target) || target.base || target.alive || target.healthStatus !== 'dead')) return `No defeated enemy is available for ${spell.name}.`;
    const targetStats = target.base ? computeCharacterStats(target) : computeMonsterAttack(target);
    if (spell.touchAttack && !hitCheck(caster.base ? computeCharacterStats(caster).thac0 : caster.thac0, targetStats.ac).success) return `${caster.name}'s touch misses ${target.name}.`;
    if (targetStats.magicRes > 0 && roll(1, 100) <= targetStats.magicRes) return `${target.name} resists ${spell.name}.`;
    const immunity = target.effects?.some(effect => effect.includes('Immunity to sleep/charm')) && ['MU_SLEEP', 'MU_CHARM_PERSON'].includes(spell.code);
    const sleepEligible = target.base ? target.level <= 4 : ['kobold','goblin','orc','hobgoblin','gnoll','bugbear'].includes(target.speciesId);
    const humanoid = target.base || !['skeleton','zombie','ghoul','troll','dragon'].includes(target.speciesId);
    if (immunity || (spell.code === 'MU_SLEEP' && !sleepEligible) || (spell.humanoidOnly && !humanoid) || (spell.creatureTags?.includes('snake') && !target.speciesId.includes('snake'))) return `${target.name} is immune to ${spell.name}.`;
    const saved = spell.save && savingThrow(targetStats.saves, spell.save);
    if (saved && !spell.saveHalf) return `${target.name} saves against ${spell.name}.`;
    if (spell.type === 'damage') {
      let damage = rollDice(spellDamageDice(spell, level));
      if (spell.code === 'MU_MAGIC_MISSILE' && hasStatus(target, status => status.modifiers?.shielded)) damage = 0;
      if (saved) damage = Math.floor(damage / 2);
      if (hasStatus(target, status => status.modifiers?.[`resist_${spell.element}`])) damage = Math.floor(damage / 2);
      applyPhysicalDamage(target, damage);
      return `${target.name} takes ${damage} damage from ${spell.name}${saved ? ' (saved)' : ''}.`;
    }
    if (spell.type === 'heal') {
      const amount = rollDice(spell.dice); healTarget(target, amount);
      return `${target.name} recovers ${amount} HP.`;
    }
    if (spell.type === 'cure') {
      const before = target.statusEffects.length;
      target.statusEffects = target.statusEffects.filter(status => !spell.conditions.some(condition => status.modifiers?.[condition]));
      return before !== target.statusEffects.length ? `${target.name} is cured by ${spell.name}.` : `${target.name} has no matching affliction.`;
    }
    if (spell.type === 'summon') {
      const source = MONSTER_DB.zombie;
      target.hpCurrent = source.hp; target.hpMax = source.hp; target.alive = true; target.healthStatus = 'okay';
      target.speciesId = 'zombie'; target.name = `Animated ${target.name}`; target.attacks = source.attacks; target.ac = source.ac; target.thac0 = source.thac0;
      applyStatus(target, { id: 'spell_animated', name: 'Animated ally', duration: Infinity, modifiers: { charmed: true }, visual: { kind: 'rune', style: 'holy', color: MAGIC_PALETTE.holy } });
      return `${target.name} rises as a zombie ally.`;
    }
    if (spell.cancels) target.statusEffects = target.statusEffects.filter(status => !status.modifiers?.[spell.cancels]);
    const modifiers = spellModifiers(spell, caster, target, level);
    const rune = spellRune(spell);
    applyStatus(target, { id: `spell_${spell.code}`, name: spell.name, duration: spellDuration(spell, level), persistent: spell.permanent || spell.untilAttack, untilAttack: spell.untilAttack, modifiers, visual: statusVisual(modifiers, rune) });
    return `${target.name} is affected by ${spell.name}.`;
  }

  async function castSpell(state, caster, code, explicitTargetId, scrollIndex = null) {
    const spell = SPELL_LIBRARY[code];
    const charge = caster.preparedSpells.indexOf(code);
    const scroll = scrollIndex === null ? null : caster.inventory[scrollIndex];
    const scrollItem = scroll && ITEM_DB[scroll.itemId];
    if (!spell || (scrollIndex === null ? charge < 0 : !scroll || scrollItem.scrollSpell !== code || !caster.classes.includes(scrollItem.scrollClass) || !scroll.identified) || !spell.usableInCombat || hasStatus(caster, status => status.modifiers?.silenced)) return false;
    const level = scrollItem?.casterLevel ?? abilityClassLevel(caster, spell.classType);
    const targets = resolveTargetsForSpell(state, caster, spell, explicitTargetId, level).filter(target => !spell.creatureTags || spell.creatureTags.some(tag => target.speciesId?.includes(tag)));
    if (!targets.length) { log(`No eligible target for ${spell.name}. The spell is retained.`); return false; }
    if (spell.type === 'utility') {
      const response = spellUtility(caster, spell, targets);
      log(response.message);
      if (!response.ok) return false;
    }
    if (scrollIndex === null) caster.preparedSpells.splice(charge, 1);
    else { scroll.qty -= 1; if (!scroll.qty) caster.inventory[scrollIndex] = null; }
    log(`${caster.name} casts ${spell.name}!`);
    const rune = spellRune(spell);
    if (!await playBattleEffect(state, spell.type === 'heal' || spell.type === 'cure' ? 'heal' : spell.type === 'buff' || spell.type === 'utility' ? 'buff' : spell.target === 'enemies' ? 'burst' : 'bolt', caster, targets, rune.color, rune)) return false;
    if (spell.type !== 'utility') for (const target of targets) log(applySpellToTarget(caster, target, spell, level));
    if (spell.effect === 'prayer') for (const target of livingMonsters(state.monsters)) applyStatus(target, { id: 'spell_prayer_enemy', name: 'Prayer', duration: level, modifiers: { thac0: 1, damageBonus: -1, saves: 1 }, visual: { kind: 'rune', ...rune } });
    caster.statusEffects = caster.statusEffects.filter(status => !status.untilAttack || spell.type === 'buff' || spell.type === 'heal' || spell.type === 'utility');
    return true;
  }

  function castAdventureSpell(characterId, code, targetId = characterId) {
    if (combatState) return { ok: false, message: 'Use the combat spell menu during a battle.' };
    const caster = findPartyMember(characterId), spell = SPELL_LIBRARY[code];
    if (!caster || !spell || !canCastInCamp(spell) || !caster.alive || isUnableToAct(caster)) return { ok: false, message: 'That spell cannot be cast in camp.' };
    const charge = caster.preparedSpells.indexOf(code);
    if (charge < 0) return { ok: false, message: 'No memorized charge is available.' };
    const level = abilityClassLevel(caster, spell.classType);
    const targets = (spell.target === 'party' ? livingPartyMembers() : spell.target === 'self' ? [caster] : party.members.filter(hero => hero.id === targetId && !['dead','gone'].includes(hero.healthStatus)))
      .slice(0, spell.maxTargetsPerLevel ? level * spell.maxTargetsPerLevel : Infinity);
    if (!targets.length) return { ok: false, message: 'No eligible companion is selected.' };
    let response;
    if (spell.type === 'utility') response = spellUtility(caster, spell, targets);
    else {
      for (const target of targets) log(applySpellToTarget(caster, target, spell, level));
      response = { ok: true, message: `${caster.name} casts ${spell.name}.` };
    }
    if (!response.ok) return response;
    caster.preparedSpells.splice(charge, 1);
    renderParty();
    log(response.message);
    return response;
  }

  function scribeScroll(characterId, inventoryIndex) {
    if (combatState) return { ok: false, message: 'Copy scrolls into a spellbook outside combat.' };
    const caster = findPartyMember(characterId), entry = caster?.inventory[inventoryIndex], item = entry && ITEM_DB[entry.itemId];
    if (!caster?.classes.includes('Magic-user') || !entry?.identified || item.scrollClass !== 'Magic-user') return { ok: false, message: 'Read Magic must decipher an arcane scroll first.' };
    const spell = SPELL_LIBRARY[item.scrollSpell];
    if (!spellSlots(caster, 'Magic-user')[spell.level - 1]) return { ok: false, message: 'This scroll is beyond the current spellbook level.' };
    if (caster.knownSpells.includes(spell.code)) return { ok: false, message: 'The spell is already in the spellbook.' };
    caster.knownSpells.push(spell.code);
    entry.qty -= 1; if (!entry.qty) caster.inventory[inventoryIndex] = null;
    renderParty();
    return { ok: true, message: `${spell.name} copied into the spellbook; the scroll is consumed.` };
  }

  function canRestorePosition(state, target) {
    if (target.alive) return true;
    const position = state.board.position(target.id);
    return state.board.canPlace(target.id, position.x, position.y);
  }
  function canSee(attacker, target) { return !hasStatus(target, status => status.modifiers?.invisible) || hasStatus(attacker, status => status.modifiers?.seeInvisible) || attacker.effects?.includes('Sees invisible'); }
  function heroesInRange(state, monster, range = 1, melee = true) { return livingPartyMembers().filter(hero => canSee(monster, hero) && state.board.canTarget(monster.id, hero.id, { range, melee })); }

  async function turnUndead(state, cleric) {
    const minimum = { skeleton: 1, zombie: 1, ghoul: 1 };
    const targets = livingMonsters(state.monsters).filter(monster => minimum[monster.speciesId] && state.board.canTarget(cleric.id, monster.id, { range: 6 }));
    if (!targets.length) { log('No undead are in turning range.'); return false; }
    const rune = { style: 'holy', color: MAGIC_PALETTE.holy };
    if (!await playBattleEffect(state, 'burst', cleric, targets, rune.color, rune)) return false;
    const rolled = rollDice('1d20');
    let remaining = rollDice('2d6');
    for (const target of targets) {
      const need = Math.max(2, (target.speciesId === 'skeleton' ? 10 : target.speciesId === 'zombie' ? 13 : 16) - (abilityClassLevel(cleric, 'Cleric') - 1) * 3);
      if (rolled < need || remaining <= 0) continue;
      remaining -= 1;
      target.alive = false;
      target.healthStatus = 'turned';
      log(`${target.name} flees before ${cleric.name}'s holy symbol.`);
    }
    return true;
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
    const conjuredRange = actor.statusEffects.find(status => status.modifiers?.weaponRange)?.modifiers.weaponRange;
    const range = conjuredRange || getEquippedItem(actor, 'mainhand')?.range || 1;
    if (conjuredRange) return { melee: false, range };
    return { melee: range === 1, range, avoidAdjacentEnemies: range > 1 };
  }

  function attackableMonsters(state, actor) {
    const monsters = livingMonsters(state.monsters);
    const paths = state.board.pathsToTargets(actor.id, monsters.map(monster => monster.id), state.heroTurns.get(actor.id).movementRemaining, weaponTargeting(actor));
    return monsters.filter(monster => paths.has(monster.id));
  }

  function targetKind(action) {
    if (action.type === 'spell' || action.type === 'scroll') {
      const spell = SPELL_LIBRARY[action.spellCode];
      return spell.type === 'heal' ? 'heal' : spell.type === 'buff' ? 'buff' : 'spell';
    }
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
        id, team: hasStatus(entity, status => status.modifiers?.charmed) ? 'party' : team, x, y, footprint,
        kind: entity.classType || entity.speciesId,
        name: entity.name,
        hpCurrent: entity.hpCurrent,
        hpMax: entity.hpMax,
        preparedCount: entity.preparedSpells?.length || 0,
        spellCapacity: team === 'party' ? spellSlots(entity).reduce((sum, count) => sum + count, 0) : 0,
        thac0: team === 'party' ? computeCharacterStats(entity).thac0 : computeMonsterAttack(entity).thac0,
        healthStatus: entity.healthStatus, statusText: describeStatuses(entity),
        damageMin: team === 'party' ? computeCharacterStats(entity).minDamage : 0,
        damageMax: team === 'party' ? computeCharacterStats(entity).maxDamage : 0,
        nextLevelXp: team === 'party' ? nextExperience(entity) : null,
        ac: team === 'party' ? computeCharacterStats(entity).ac : computeMonsterAttack(entity).ac,
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
        details: `MOVE ${state.heroTurns.get(actor.id).movementRemaining}/${state.heroTurns.get(actor.id).movementMax}  SPELLS ${actor.preparedSpells.length}. ${details}`,
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
    if (actor.preparedSpells.some(code => SPELL_LIBRARY[code]?.usableInCombat) && !hasStatus(actor, status => status.modifiers?.silenced)) {
      buttons.push({ label: 'Cast Spell', onSelect: () => promptSpellSelect(state, actor) });
    }
    if (actor.inventory.some(entry => entry?.identified && actor.classes.includes(ITEM_DB[entry.itemId].scrollClass))) buttons.push({ label: 'Use Scroll', onSelect: () => promptScrollSelect(state, actor) });
    if (actor.classes.includes('Cleric')) buttons.push({ label: 'Turn Undead', onSelect: () => commitHeroAction(state, actor, { type: 'turn' }) });
    buttons.push({ label: 'Guard', onSelect: () => commitHeroAction(state, actor, { type: 'guard' }) });
    if (state.party.some(hero => hero.healthStatus === 'dying')) buttons.push({ label: 'Bandage', onSelect: () => commitHeroAction(state, actor, { type: 'bandage' }) });
    if (state.party.some(hero => hero !== actor && heroIsAvailable(state, hero))) buttons.push({ label: 'Delay', onSelect() {
      state.delayed.add(actor.id);
      const next = state.party.find(hero => hero !== actor && heroIsAvailable(state, hero) && !state.delayed.has(hero.id));
      if (next) selectHero(state, next); else promptMainAction(state, actor, 'Every other companion has acted or delayed.');
    } });
    if (state.encounter.canFlee) buttons.push({ label: 'Flee', onSelect: () => commitHeroAction(state, actor, { type: 'flee' }) });
    buttons.push({ label: 'End Turn', onSelect: () => commitHeroAction(state, actor, { type: 'pass' }) });
    const prompt = message || `Round ${state.round}: ${actor.name}`;
    showActionMenu(state, actor, prompt, buttons);
  }

  function lockHeroResolution(state) {
    state.busy = true;
    state.mode = 'resolving';
    state.targeting = null;
    hud.clearActions();
  }

  async function walkHeroPath(state, actor, path) {
    const turn = state.heroTurns.get(actor.id);
    for (const cell of path) {
      if (!isCurrentBattle(state)) return false;
      const result = state.board.move(actor.id, cell.x, cell.y, 1);
      if (!result.moved) return false;
      turn.movementRemaining -= result.cost;
      state.cursor = { ...cell };
      publishBattle(state);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return isCurrentBattle(state);
  }

  async function moveHero(state, actor, x, y) {
    if (!heroCanSelect(state, actor) || state.mode !== 'ready') return;
    const turn = state.heroTurns.get(actor.id);
    const path = state.board.pathToCell(actor.id, x, y, turn.movementRemaining);
    if (!path.length) return;
    lockHeroResolution(state);
    await walkHeroPath(state, actor, path);
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

  function promptSpellTarget(state, actor, spell, scrollIndex = null) {
    if (scrollIndex === null && !actor.preparedSpells.includes(spell.code)) {
      promptMainAction(state, actor, 'That spell has no memorized charge. Rest at the inn to prepare it.');
      return;
    }
    const action = { type: scrollIndex === null ? 'spell' : 'scroll', spellCode: spell.code, scrollIndex };
    const scrollItem = scrollIndex === null ? null : ITEM_DB[actor.inventory[scrollIndex].itemId];
    const level = scrollItem?.casterLevel ?? abilityClassLevel(actor, spell.classType);
    if (spell.target === 'enemy' || spell.target === 'ally' || spell.target === 'any' || spell.target === 'deadEnemy' || (spell.target === 'enemies' && (spell.areaRadius != null || spell.areaShape))) {
      const candidates = spell.target === 'any' ? [...state.party, ...state.monsters] : spell.target === 'deadEnemy' ? state.monsters.filter(monster => !monster.alive && monster.healthStatus === 'dead') : spell.target !== 'ally' ? livingMonsters(state.monsters) : state.party.filter(member => !['dead', 'gone'].includes(member.healthStatus));
      const targets = candidates.filter((target) => state.board.canTarget(actor.id, target.id, { range: Math.max(1, spellRange(spell, level)) }) && canRestorePosition(state, target));
      promptTargetSelection(state, actor, {
        targets, action,
        prompt: `Target for ${spell.name}`,
        details: spell.description,
        onCancel: () => promptSpellSelect(state, actor),
      });
      return;
    }
    if (spell.target === 'enemies' && !resolveTargetsForSpell(state, actor, spell, undefined, level).length) {
      promptMainAction(state, actor, 'No enemy within spell range and line of sight.');
      return;
    }
    commitHeroAction(state, actor, action);
  }

  function promptSpellSelect(state, actor) {
    state.mode = 'menu';
    state.targeting = null;
    const spells = [...new Set(actor.preparedSpells)].map(code => SPELL_LIBRARY[code]).filter(spell => spell.usableInCombat);
    const buttons = spells.map((spell) => ({
      label: `${spell.name} — ${actor.preparedSpells.filter(code => code === spell.code).length} memorized`,
      onSelect: () => promptSpellTarget(state, actor, spell),
    }));
    buttons.push({ label: 'Back', role: 'back', onSelect: () => promptMainAction(state, actor) });
    showActionMenu(state, actor, 'Cast which spell?', buttons);
  }

  function promptScrollSelect(state, actor) {
    state.mode = 'menu'; state.targeting = null;
    const buttons = actor.inventory.flatMap((entry,index) => entry?.identified && actor.classes.includes(ITEM_DB[entry.itemId].scrollClass)
      ? [{ label: ITEM_DB[entry.itemId].name, onSelect: () => promptSpellTarget(state, actor, SPELL_LIBRARY[ITEM_DB[entry.itemId].scrollSpell], index) }] : []);
    buttons.push({ label: 'Back', role: 'back', onSelect: () => promptMainAction(state, actor) });
    showActionMenu(state, actor, 'Cast a carried scroll?', buttons);
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
    if (Math.random() < 0.45 + state.encounter.tier * 0.05) {
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
    if (!state.practiceVitals && state.winner === 'Party' && !state.fled) {
      const gold = roll(12, 28) + state.encounter.tier * 6;
      const experience = state.monsters.reduce((total, monster) => total + monster.xpAward, 0);
      const survivors = livingPartyMembers();
      const share = Math.floor((experience + gold) / Math.max(1, survivors.length));
      party.gold += gold;
      for (const hero of survivors) {
        awardExperience(hero, share);
      }
      const quest = quests.find(quest => quest.area === state.encounter.monsterArea);
      if (quest) { quest.victories += 1; log(`${quest.name}: ${Math.min(quest.victories, quest.required)}/${quest.required} victories. Report to the council when complete.`); }
      log(`The party claims ${gold} gold and ${share} XP per surviving companion, before ability bonuses.`);
      if (Math.random() < 0.35) {
        const carrier = party.members.find(member => addInventoryItem(member, 'healing_potion').ok);
        log(carrier ? `${carrier.name} recovers a healing potion.` : 'The packs are full; a spare healing potion is left behind.');
      }
    }
    log(`Combat ends. Winner: ${state.winner}.`);
    if (state.practiceVitals) {
      for (const hero of party.members) Object.assign(hero, state.practiceVitals.get(hero.id));
      log('Practice is complete. Health, memorized spells, and conditions are restored. No rewards are granted.');
    } else for (const hero of party.members) {
      hero.statusEffects = hero.statusEffects.filter(status => status.persistent || status.duration > 0);
      if (hero.healthStatus === 'dying') { hero.healthStatus = 'unconscious'; hero.hpCurrent = 0; }
    }
    renderParty();
    await waitForLogIdle();
    if (combatState !== state) return;
    combatView.hide();
    hud.clearActions();
    try {
      if (!state.practiceVitals && state.winner === 'Monsters') {
        restoreParty();
        renderParty();
        await onPartyDefeated();
      }
    } finally {
      if (combatState === state) {
        combatState = null;
        renderParty();
      }
    }
  }

  async function commitHeroAction(state, actor, action) {
    if (!heroCanSelect(state, actor)) return;
    let performed = false;
    if (action.type === 'attack') {
      const target = state.monsters.find(monster => monster.id === action.targetId && monster.alive);
      const targeting = weaponTargeting(actor);
      const path = target && state.board.pathsToTargets(actor.id, [target.id], state.heroTurns.get(actor.id).movementRemaining, targeting).get(target.id);
      if (!path) {
        promptMainAction(state, actor, 'The target cannot be reached this turn.');
        return;
      }
      lockHeroResolution(state);
      if (path.length && !await walkHeroPath(state, actor, path)) {
        if (!isCurrentBattle(state)) return;
        state.busy = false;
        promptMainAction(state, actor, 'The approach is blocked. Choose another action.');
        return;
      }
      publishBattle(state);
      if (!state.board.canTarget(actor.id, target.id, targeting)) {
        state.busy = false;
        promptMainAction(state, actor, 'The target is no longer in weapon range.');
        return;
      }
      const ammunition = hasStatus(actor, status => status.modifiers?.magicalWeapon) ? { ok: true } : consumeWeaponAmmo(actor);
      if (!ammunition.ok) { state.busy = false; promptMainAction(state, actor, ammunition.message); return; }
      if (!await playBattleEffect(state, targeting.range > 1 ? 'arrow' : 'slash', actor, [target], 0xffd26b)) return;
      const extra = actor.statusEffects.some(status => status.modifiers?.extraAttack) ? 1 : 0;
      const blows = actor.classes.includes('Fighter') && abilityClassLevel(actor, 'Fighter') >= 7 && state.round % 2 === 0 ? 2 : 1;
      for (let blow = 0; blow < blows + extra && target.alive; blow += 1) {
        if (blow > 0 && !hasStatus(actor, status => status.modifiers?.magicalWeapon)) { const next = consumeWeaponAmmo(actor); if (!next.ok) { log(next.message); break; } }
        performAttack(actor, target);
      }
      performed = true;
    } else {
      lockHeroResolution(state);
      publishBattle(state);
      if (action.type === 'spell' || action.type === 'scroll') performed = await castSpell(state, actor, action.spellCode, action.targetId, action.type === 'scroll' ? action.scrollIndex : null);
      else if (action.type === 'turn') performed = await turnUndead(state, actor);
      else if (action.type === 'guard') { state.heroTurns.get(actor.id).guarding = true; performed = true; }
      else if (action.type === 'bandage') {
        const target = state.party.find(hero => hero.healthStatus === 'dying');
        if (target) { target.healthStatus = 'unconscious'; target.hpCurrent = 0; log(`${actor.name} bandages ${target.name}.`); performed = true; }
      }
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
    const candidates = livingPartyMembers().filter(hero => canSee(monster, hero)).map((hero) => ({
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
    for (const cell of route.path.slice(0, Math.floor(monster.statusEffects.reduce((movement, status) => movement * (status.modifiers?.movementMultiplier ?? 1), monster.movement)))) {
      if (!isCurrentBattle(state)) return;
      const result = state.board.move(monster.id, cell.x, cell.y, 1);
      if (!result.moved) break;
      state.cursor = { x: cell.x, y: cell.y };
      publishBattle(state);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  async function runMonsterPhase(state) {
    state.phase = 'monsters'; state.busy = true; state.mode = 'resolving'; state.targeting = null;
    hud.clearActions();
    for (const monster of state.monsters.filter(monster => monster.alive)) {
      if (!isCurrentBattle(state)) return;
      state.activeId = monster.id;
      if (monster.speciesId === 'troll') healTarget(monster, 3);
      publishBattle(state);
      if (isUnableToAct(monster)) log(`${monster.name} cannot act.`);
      else if (hasStatus(monster, status => status.modifiers?.charmed)) {
        const targets = livingMonsters(state.monsters).filter(target => target !== monster);
        let target = targets.find(target => state.board.canTarget(monster.id, target.id, { melee: true, range: 1 }));
        if (!target && targets.length) {
          const destination = state.board.reachable(monster.id, monster.movement).sort((a,b) => {
            const distance = cell => Math.min(...targets.map(target => { const position = state.board.position(target.id); return Math.abs(cell.x-position.x)+Math.abs(cell.y-position.y); }));
            return distance(a)-distance(b) || a.cost-b.cost;
          })[0];
          const path = state.board.pathToCell(monster.id, destination.x, destination.y, monster.movement);
          for (const cell of path) { if (!isCurrentBattle(state)) return; state.board.move(monster.id,cell.x,cell.y,1); publishBattle(state); await new Promise(resolve => setTimeout(resolve,120)); }
          target = targets.find(target => state.board.canTarget(monster.id,target.id,{melee:true,range:1}));
        }
        if (target && await playBattleEffect(state, 'slash', monster, [target], 0x55ffff)) performMonsterAttack(monster, target);
        else log(`${monster.name} is charmed and refuses to harm the party.`);
      } else {
        if (!heroesInRange(state, monster).length) await walkMonster(state, monster);
        const target = heroesInRange(state, monster)[0];
        if (target) {
          const guard = state.heroTurns.get(target.id);
          if (guard?.guarding) {
            guard.guarding = false;
            const weapon = getEquippedItem(target, 'mainhand');
            if (!weapon?.ranged && consumeWeaponAmmo(target).ok && await playBattleEffect(state, 'slash', target, [monster], 0xffd26b)) performAttack(target, monster);
          }
          if (monster.alive && await playBattleEffect(state, 'slash', monster, [target], 0xff7070)) {
            for (const group of monster.attacks) for (let attack = 0; attack < (hasStatus(monster, status => status.modifiers?.slowed) ? Math.floor(group.count / 2) + (state.round % 2 === 0 ? group.count % 2 : 0) : group.count) && target.alive; attack += 1) performMonsterAttack(monster, target, group);
          }
        }
      }
      if (hasBattleWinner(state)) { await concludeCombat(state); return; }
      renderParty(); publishBattle(state); await waitForLogIdle();
    }
    if (!isCurrentBattle(state)) return;
    for (const hero of state.party) if (hero.healthStatus === 'dying') {
      hero.hpCurrent -= 1;
      if (hero.hpCurrent <= -10) hero.healthStatus = 'dead';
    }
    state.round += 1;
    tickStatuses(state.party); tickStatuses(state.monsters);
    for (const entity of [...state.party, ...state.monsters]) if (entity.alive && hasStatus(entity, status => status.modifiers?.diseased)) applyPhysicalDamage(entity, 1);
    if (hasBattleWinner(state)) { await concludeCombat(state); return; }
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
    const actor = state.party.find(hero => heroIsAvailable(state, hero) && !state.delayed.has(hero.id)) || state.party.find(hero => heroIsAvailable(state, hero));
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
    state.delayed = new Set();
    state.heroTurns = new Map(state.party.filter(hero => hero.alive).map(hero => {
      const movement = computeCharacterStats(hero).movement;
      return [hero.id, { movementRemaining: movement, movementMax: movement, actionSpent: false, guarding: false }];
    }));
    state.targeting = null;
    publishBattle(state);
    log(`-- Round ${state.round} --`);
    for (const hero of state.party) {
      if (!hero.alive || !isUnableToAct(hero)) continue;
      const turn = state.heroTurns.get(hero.id);
      turn.actionSpent = true;
      turn.movementRemaining = 0;
      log(`${hero.name} is incapacitated and misses a turn.`);
    }
    await waitForLogIdle();
    if (!isCurrentBattle(state)) return;
    await beginNextHeroTurn(state);
  }

  async function beginEncounter(policy, practice = false) {
    closeService();
    const practiceVitals = practice ? new Map(party.members.map(hero => [hero.id, {
      alive: hero.alive, healthStatus: hero.healthStatus, hpCurrent: hero.hpCurrent, preparedSpells: [...hero.preparedSpells],
      statusEffects: hero.statusEffects.map(status => ({ ...status, modifiers: { ...status.modifiers }, visual: { ...status.visual } })),
    }])) : null;
    if (practice) restoreParty();
    const state = startCombat(generateEncounter(policy));
    state.practiceVitals = practiceVitals;
    combatState = state;
    for (const hero of party.members) for (const status of hero.statusEffects) status.expiresAfterRound = state.round + Math.max(1, status.duration || 1);
    hud.clearActions();
    publishBattle(state);
    renderParty();
    log(`Encounter! ${state.monsters.length} ${state.monsters.length === 1 ? 'foe' : 'foes'} approach.`);
    await waitForLogIdle();
    if (!isCurrentBattle(state)) return;
    await beginPlayerRound(state);
  }

  function maybeEncounter() {
    const policy = dungeon.encounters;
    if (combatState || serviceState || !policy || !livingPartyMembers().length) {
      stepsSinceEncounter = 0;
      return;
    }
    stepsSinceEncounter += 1;
    const threshold = Math.max(1, 4 - Math.min(policy.tier, 3));
    if (stepsSinceEncounter >= threshold && Math.random() < 0.35 + policy.tier * 0.08) {
      stepsSinceEncounter = 0;
      beginEncounter(policy);
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
    get isServiceOpen() {
      return serviceState !== null;
    },
    openService,
    closeService,
    onStepComplete() {
      for (const hero of party.members) hero.statusEffects = hero.statusEffects.filter(status => {
        if (status.duration === Infinity) return true;
        status.duration -= 1;
        return status.duration > 0;
      });
      renderParty();
      maybeEncounter();
    },
    handleCombatKey,
    selectCombatCell,
    getInventorySnapshot,
    castAdventureSpell,
    scribeScroll,
    openCamp,
    prepareSpell,
    unprepareSpell,
    getSpellPreparation(characterId) {
      const hero = findPartyMember(characterId);
      return hero ? { known: hero.knownSpells.map(code => SPELL_LIBRARY[code]), plan: [...hero.spellPreparation], prepared: [...hero.preparedSpells], slots: spellSlots(hero), locked: combatState !== null } : null;
    },
    getQuestSnapshot() { return quests.map(quest => ({ ...quest })); },
    canTravel(targetId) {
      const unlocked = targetId !== 'moonsea-wilderness' || quests.find(quest => quest.id === 'sokal-keep').claimed;
      return { ok: unlocked, message: unlocked ? '' : 'Secure Sokal Keep and report to the council to open the wilderness boat route.' };
    },
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
