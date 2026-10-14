import assert from 'node:assert/strict';
import test from 'node:test';
import { DIR, WALL } from '../src/dungeon.js';
import { createGameSystems } from '../src/systems/core.js';
import { validateParty, rollAbilityScores, availableClassOptions } from '../src/rules/characters.js';
import { attackRoll, rollDice, savingThrow } from '../src/rules/dice.js';
import { getCityService } from '../src/cityServices.js';
import { coinValue } from '../src/systems/money.js';

function partyMoney(record) {
  return record.party.members.reduce((sum, hero) => sum + coinValue(hero.coins), 0);
}

function collectTreasureMoney(systems) {
  const response = systems.shareTreasureCoins();
  if (!response.ok) assert.match(response.message, /cannot carry any more coins/);
  assert.equal(systems.exitTreasure(true).ok, true);
  assert.equal(systems.isTreasureOpen, false);
  assert.equal(systems.closeService(), true);
}

function openDungeon() {
  const width = 12;
  const height = 12;
  return {
    id: 'combat-room', name: 'Combat Room', biome: 'dungeon', services: [], encounters: { tier: 1, monsterArea: 'Slums', maxEnemies: 3 },
    width, height, x: 8, y: 8, dir: DIR.E, objects: [],
    cells: Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => ({
      n: y === 0 ? WALL.WALL : WALL.OPEN,
      e: x === width - 1 ? WALL.WALL : WALL.OPEN,
      s: y === height - 1 ? WALL.WALL : WALL.OPEN,
      w: x === 0 ? WALL.WALL : WALL.OPEN,
      visited: false,
    }))),
  };
}

async function withCombat(run, characters) {
  const originalRandom = Math.random;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = new Map();
  let clock = 0;
  let nextTimerId = 1;
  Math.random = () => 0.4;
  globalThis.setTimeout = (callback, delay = 0, ...args) => {
    const id = nextTimerId++;
    timers.set(id, { callback, args, due: clock + Math.max(0, Number(delay) || 0) });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);

  const dungeon = openDungeon();
  const initialDungeon = structuredClone(dungeon);
  const record = { actions: null, party: null, snapshot: null, snapshots: [], logs: [], effects: [], hides: 0, defeats: 0 };
  let defeatHandler = () => {};
  const hud = {
    setActions(actions) { record.actions = actions; },
    clearActions() { record.actions = null; },
    setParty(party) { record.party = structuredClone(party); },
    appendLog(message) { record.logs.push(message); },
  };
  const combatView = {
    show(snapshot) {
      record.snapshot = structuredClone(snapshot);
      record.snapshots.push(record.snapshot);
    },
    hide() { record.hides += 1; },
    playEffect(effect) {
      record.effects.push({ ...structuredClone(effect), snapshot: structuredClone(record.snapshot) });
      return new Promise((resolve) => setTimeout(resolve, 300));
    },
  };

  async function flush(until = () => false) {
    for (let count = 0; count < 1000; count += 1) {
      for (let microtask = 0; microtask < 8; microtask += 1) await Promise.resolve();
      if (until()) return;
      const next = [...timers.entries()].sort(([idA, a], [idB, b]) => a.due - b.due || idA - idB)[0];
      if (!next) return;
      const [id, timer] = next;
      timers.delete(id);
      clock = timer.due;
      timer.callback(...timer.args);
    }
    throw new Error('Combat did not settle at a player command.');
  }

  function choose(label) {
    const button = record.actions?.buttons.find(entry => typeof label === 'string' ? entry.label === label : label.test(entry.label));
    assert.ok(button, `Expected ${label}; offered: ${record.actions?.buttons.map(entry => entry.label).join(', ')}`);
    button.onSelect();
  }
  try {
    const systems = createGameSystems({ hud, combatView, dungeon, characters, async onPartyDefeated() { record.defeats += 1; await defeatHandler(); } });
    await run({
      systems, dungeon, initialDungeon, record, choose, flush,
      setDefeatHandler(handler) { defeatHandler = handler; },
      atService(id) { dungeon.services = [{ ...getCityService(id), x: dungeon.x, y: dungeon.y }]; },
      setRandom(value) { Math.random = typeof value === 'function' ? value : () => value; },
      async begin(monsterArea = 'Slums') {
        dungeon.encounters = { tier: 1, monsterArea, maxEnemies: 3 };
        Math.random = () => 0.4;
        for (let step = 0; step < 3; step += 1) systems.onStepComplete();
        assert.equal(systems.isCombatActive, true);
        await flush();
        assert.ok(record.actions, 'An encounter settles at a player command.');
      },
      unit(id) { return record.snapshot.units.find(unit => unit.id === id); },
      member(id) { return record.party.members.find(member => member.id === id); },
    });
  } finally {
    Math.random = originalRandom;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
}

test('six adventurers use original classes, abilities, armor and memorized spell charges', async () => {
  await withCombat(async ({ systems, record }) => {
    assert.deepEqual(record.party.members.map(hero => hero.classType), ['Fighter', 'Fighter', 'Cleric', 'Magic-user', 'Thief', 'Magic-user']);
    const brynn = systems.getInventorySnapshot('c_fighter');
    assert.equal(brynn.stats.ac, 4);
    assert.equal(brynn.stats.thac0, 18);
    assert.equal(brynn.stats.damageDice, '1d8');
    assert.equal(brynn.stats.largeDamageDice, '1d12');
    assert.deepEqual(Object.keys(brynn.character.attributes).sort(), ['charisma','constitution','dexterity','intelligence','strength','wisdom']);
    assert.equal(brynn.character.nextLevelXp, 2001);
    assert.equal(brynn.equipment.head, 'iron_helm');
    assert.equal(systems.getSpellPreparation('c_cleric').prepared.length, 3);
    assert.equal(systems.getSpellPreparation('c_mage').prepared.length, 1);
  });
});

test('a reachable enemy click walks before striking, publishes effects before damage, and locks inventory until resolution ends', async () => {
  await withCombat(async ({ systems, record, begin, unit, flush, setRandom }) => {
    await begin();
    const actor = unit('c_fighter');
    const target = record.snapshot.targetIds.map(unit).find(foe => Math.abs(foe.x - actor.x) + Math.abs(foe.y - actor.y) > 1);
    assert.ok(target, 'The walkable display also includes enemies reachable this turn.');
    const before = record.snapshots.length;
    setRandom(0.99);
    systems.selectCombatCell(target.x, target.y);
    assert.equal(record.snapshot.busy, true);
    assert.equal(systems.getInventorySnapshot(actor.id).locked, true);
    assert.equal(systems.unequipInventoryItem(actor.id, 'mainhand').ok, false);
    await flush();
    const effect = record.effects.find(effect => effect.kind === 'slash' && effect.source.id === actor.id);
    assert.ok(effect);
    assert.equal(effect.snapshot.units.find(foe => foe.id === target.id).hpCurrent, target.hpCurrent);
    assert.ok(record.snapshots.slice(before).some(snapshot => snapshot.units.find(hero => hero.id === actor.id).movementRemaining < actor.movementRemaining));
    assert.equal(unit(actor.id).canAct, false);
    assert.equal(unit(target.id).alive, false);
  });
});

test('natural one misses and spends an action without invented damage', async () => {
  await withCombat(async ({ systems, record, begin, unit, flush, setRandom }) => {
    await begin();
    const target = unit(record.snapshot.targetIds[0]);
    setRandom(0);
    systems.selectCombatCell(target.x, target.y);
    await flush();
    assert.equal(unit(target.id).hpCurrent, target.hpCurrent);
    assert.equal(unit('c_fighter').canAct, false);
    assert.ok(record.logs.includes(`Brynn misses ${target.name}.`));
  });
});

test('spell preparation requires an inn rest and a cast consumes exactly one charge', async () => {
  await withCombat(async ({ systems, record, atService, choose, begin, unit, flush }) => {
    assert.equal(systems.prepareSpell('c_mage2', 'MU_SHIELD').ok, false, 'A occupied preparation slot cannot be overfilled.');
    assert.equal(systems.unprepareSpell('c_mage2', 0).ok, true);
    assert.equal(systems.prepareSpell('c_mage2', 'MU_SHIELD').ok, true);
    assert.deepEqual(systems.getSpellPreparation('c_mage2').prepared, ['MU_MAGIC_MISSILE'], 'Selecting a plan grants no immediate spell charge.');
    const money = partyMoney(record);
    atService('inn');
    systems.openService('inn');
    choose(/^Rest and memorize spells/);
    assert.equal(partyMoney(record), money - 1000);
    assert.deepEqual(systems.getSpellPreparation('c_mage2').prepared, ['MU_SHIELD']);
    systems.closeService();
    await begin();
    const mage = unit('c_mage2');
    systems.selectCombatCell(mage.x, mage.y);
    choose('Cast Spell');
    choose(/^Shield —/);
    await flush();
    assert.equal(unit(mage.id).preparedCount, 0);
    assert.equal(unit(mage.id).ac, 3);
    assert.ok(unit(mage.id).auras.some(aura => aura.kind === 'shield'));
    assert.equal(unit(mage.id).canAct, false);
    assert.equal(systems.prepareSpell(mage.id, 'MU_SHIELD').ok, false, 'Combat cannot refill charges.');
  });
});

test('sleep makes weak enemies helpless and a melee hit defeats one without waiting for its saving throw', async () => {
  await withCombat(async ({ systems, record, choose, begin, unit, flush, setRandom }) => {
    await begin();
    const mage = unit('c_mage');
    systems.selectCombatCell(mage.x, mage.y);
    choose('Cast Spell');
    choose(/^Sleep —/);
    assert.equal(record.snapshot.targetKind, 'spell');
    const target = unit(record.snapshot.targetIds[0]);
    systems.selectCombatCell(target.x, target.y);
    setRandom(0);
    await flush();
    assert.match(unit(target.id).statusText, /Sleep/);
    assert.equal(unit(mage.id).preparedCount, 0);
    const fighter = unit('c_fighter');
    systems.selectCombatCell(fighter.x, fighter.y);
    systems.selectCombatCell(target.x, target.y);
    await flush();
    assert.equal(unit(target.id).alive, false, 'A helpless foe is dispatched even when the attack die rolls one.');
  });
});

test('an archer can click a red target, retreat from melee, and expend an arrow before projectile damage', async () => {
  await withCombat(async ({ systems, record, begin, unit, flush, setRandom }) => {
    const inventory = systems.getInventorySnapshot('c_fighter');
    const bow = inventory.inventory.findIndex(entry => entry?.itemId === 'long_bow');
    assert.equal(systems.equipInventoryItem('c_fighter', bow, 'mainhand').ok, true);
    const arrowCount = () => systems.getInventorySnapshot('c_fighter').inventory.find(entry => entry?.itemId === 'arrow').qty;
    assert.equal(arrowCount(), 30);
    await begin();
    const foes = record.snapshot.units.filter(foe => foe.team === 'monster');
    const origin = unit('c_fighter');
    systems.selectCombatCell(origin.x, origin.y);
    assert.ok(foes.some(foe => Math.abs(origin.x - foe.x) + Math.abs(origin.y - foe.y) === 1));
    const target = unit(record.snapshot.targetIds[0]);
    assert.ok(target, 'The red preview includes a target reachable after moving out of melee.');
    setRandom(0.99);
    systems.selectCombatCell(target.x, target.y);
    await flush(() => record.effects.at(-1)?.kind === 'arrow');
    assert.equal(record.effects.at(-1).kind, 'arrow');
    const firingPosition = unit('c_fighter');
    assert.notDeepEqual({ x: firingPosition.x, y: firingPosition.y }, { x: origin.x, y: origin.y });
    assert.ok(foes.every(foe => Math.abs(firingPosition.x - foe.x) + Math.abs(firingPosition.y - foe.y) > 1));
    assert.equal(arrowCount(), 29);
    assert.equal(unit(target.id).hpCurrent, target.hpCurrent);
    await flush();
    assert.equal(arrowCount(), 29);
    assert.ok(unit(target.id).hpCurrent < target.hpCurrent);
  });
});

async function winBattle(context, area = 'Slums', { collect = true, potion = false } = {}) {
  const { systems, record, begin, unit, flush, setRandom } = context;
  await begin(area);
  setRandom(0.99);
  for (let action = 0; action < 30 && systems.isCombatActive; action += 1) {
    const snapshot = record.snapshot;
    const fighter = snapshot.units.find(hero => hero.team === 'party' && hero.canAct && hero.kind === 'Fighter');
    if (fighter) systems.selectCombatCell(fighter.x, fighter.y);
    const targetId = record.snapshot.targetIds[0];
    if (targetId) {
      const target = unit(targetId);
      if (potion && record.snapshot.units.filter(foe => foe.team === 'monster' && foe.alive).length === 1) {
        const rolls = [0.99, 0.99, 0.99, 0];
        setRandom(() => rolls.shift() ?? 0.99);
      }
      systems.selectCombatCell(target.x, target.y);
    }
    else context.choose('End Turn');
    await flush();
  }
  assert.equal(systems.isCombatActive, false);
  if (collect) collectTreasureMoney(systems);
}

test('combat treasure stays unassigned until TAKE, while POOL and SHARE conserve coins, leave items for a chosen companion and award equal XP', async () => {
  await withCombat(async context => {
    const { systems, record, atService } = context;
    const beforeMoney = partyMoney(record);
    const beforePacks = record.party.members.map(hero => systems.getInventorySnapshot(hero.id).inventory);
    await winBattle(context, 'Slums', { collect: false, potion: true });
    const treasure = systems.getTreasureSnapshot();
    assert.equal(systems.isTreasureOpen, true);
    assert.equal(treasure.coins.gold, 34);
    assert.deepEqual(treasure.items, [{ itemId: 'healing_potion', qty: 1, identified: true }]);
    assert.equal(partyMoney(record), beforeMoney);
    assert.deepEqual(record.party.members.map(hero => systems.getInventorySnapshot(hero.id).inventory), beforePacks);
    const exit = systems.exitTreasure();
    assert.equal(exit.ok, false);
    assert.equal(exit.needsConfirmation, true);
    assert.deepEqual(systems.getTreasureSnapshot(), treasure, 'Declining to abandon treasure changes no state.');
    assert.equal(systems.openCamp().ok, false);
    atService('inn');
    assert.equal(systems.openService('inn').ok, false);
    assert.equal(systems.canTravel('new-phlan').ok, false);
    for (let step = 0; step < 3; step += 1) systems.onStepComplete();
    assert.equal(systems.isCombatActive, false, 'Uncollected treasure blocks another encounter.');
    assert.equal(systems.takeTreasureCoins('c_thief', 'gold', 35).ok, false);
    assert.deepEqual(systems.getTreasureSnapshot(), treasure, 'An excessive coin request leaves both purses and treasure unchanged.');
    assert.equal(systems.takeTreasureCoins('c_thief', 'gold', 5).ok, true);
    assert.equal(systems.getInventorySnapshot('c_thief').coins.gold, 95);
    assert.equal(systems.getTreasureSnapshot().coins.gold, 29);
    const availableMoney = beforeMoney + 6800;
    assert.equal(partyMoney(record) + coinValue(systems.getTreasureSnapshot().coins), availableMoney);
    assert.equal(systems.poolTreasureCoins().ok, true);
    assert.equal(partyMoney(record), 0);
    assert.equal(coinValue(systems.getTreasureSnapshot().coins), availableMoney);
    assert.equal(systems.shareTreasureCoins().ok, true);
    assert.equal(partyMoney(record), availableMoney);
    assert.equal(coinValue(systems.getTreasureSnapshot().coins), 0);
    assert.deepEqual(systems.getTreasureSnapshot().items, treasure.items, 'SHARE distributes money alone.');
    const goldPurses = record.party.members.map(hero => hero.coins.gold);
    assert.ok(Math.max(...goldPurses) - Math.min(...goldPurses) <= 1);
    const xpAfterCollection = record.party.members.map(hero => hero.xp);
    assert.equal(systems.poolTreasureCoins().ok, true);
    assert.equal(systems.shareTreasureCoins().ok, true);
    assert.deepEqual(record.party.members.map(hero => hero.xp), xpAfterCollection, 'Pooling and sharing collected coins cannot grant their treasure XP twice.');
    assert.equal(systems.takeTreasureItem('c_thief', 0).ok, true);
    assert.equal(systems.getInventorySnapshot('c_thief').inventory.find(entry => entry?.itemId === 'healing_potion').qty, 2);
    assert.deepEqual(systems.getInventorySnapshot('c_fighter').inventory, beforePacks[0]);
    assert.equal(systems.exitTreasure().ok, true);
    assert.equal(systems.isTreasureOpen, false);
    assert.equal(systems.getTreasureSnapshot(), null);
    assert.equal(systems.takeTreasureItem('c_fighter', 0).ok, false);
    assert.equal(partyMoney(record), availableMoney);
  });
  const descriptor = { name: 'Talan', race: 'Elf', classType: 'Fighter', classes: ['Fighter', 'Magic-user'], alignment: 'Chaotic good', exceptionalStrength: 75,
    attributes: { strength: 18, intelligence: 17, wisdom: 10, dexterity: 16, constitution: 13, charisma: 11 } };
  const progress = [];
  for (const collection of ['one coin at a time', 'SHARE']) {
    await withCombat(async context => {
      const { systems } = context;
      await winBattle(context, 'Slums', { collect: false });
      assert.equal(systems.getTreasureSnapshot().coins.gold, 34);
      const xpBeforeCollection = systems.getInventorySnapshot('c_1').character.xp;
      if (collection === 'SHARE') assert.equal(systems.shareTreasureCoins().ok, true);
      else {
        while (systems.getTreasureSnapshot().coins.gold) {
          assert.equal(systems.takeTreasureCoins('c_1', 'gold', 1).ok, true);
        }
      }
      const hero = systems.getInventorySnapshot('c_1').character;
      assert.equal(hero.xp - xpBeforeCollection, 36, `${collection}: 34 treasure XP splits into 17 per class, then each prime requisite grants 18 XP.`);
      progress.push({ xp: hero.xp, levelText: hero.levelText });
      assert.equal(systems.exitTreasure().ok, true);
    }, [descriptor]);
  }
  assert.deepEqual(progress[0], progress[1], 'The same treasure grants identical multiclass progress regardless of collection size.');
});

test('a full pack rejects treasure atomically and the unclaimed item remains available to another companion', async () => {
  await withCombat(async context => {
    const { systems, record, atService, choose } = context;
    const potion = systems.getInventorySnapshot('c_fighter').inventory.findIndex(entry => entry?.itemId === 'healing_potion');
    assert.equal(systems.transferInventoryItem('c_fighter', potion, 'c_mage').ok, true);
    atService('general-store'); systems.openService('general-store'); choose(/^Brynn — Fighter/);
    while (systems.getInventorySnapshot('c_fighter').inventory.some(entry => !entry)) choose(/^Leather Belt —/);
    assert.equal(systems.closeService(), true);
    await winBattle(context, 'Slums', { collect: false, potion: true });
    const fullPack = systems.getInventorySnapshot('c_fighter');
    const treasure = systems.getTreasureSnapshot();
    const money = partyMoney(record);
    const denied = systems.takeTreasureItem('c_fighter', 0);
    assert.equal(denied.ok, false);
    assert.match(denied.message, /pack is full/);
    assert.deepEqual(systems.getInventorySnapshot('c_fighter'), fullPack);
    assert.deepEqual(systems.getTreasureSnapshot(), treasure);
    assert.equal(partyMoney(record), money);
    assert.equal(systems.takeTreasureItem('c_thief', 0).ok, true);
    assert.equal(systems.getTreasureSnapshot().items.some(Boolean), false);
    collectTreasureMoney(systems);
  });
});

test('shops use the buyer purse unless money is explicitly pooled, and require collecting the fund before leaving', async () => {
  await withCombat(async ({ systems, record, atService, choose }) => {
    const initialMoney = partyMoney(record);
    const fighterGold = systems.getInventorySnapshot('c_fighter').coins.gold;
    assert.equal(systems.transferInventoryCoins('c_fighter', 'c_fighter2', 'gold', fighterGold).ok, true);
    assert.equal(partyMoney(record), initialMoney, 'TRADE changes ownership without changing coin value.');
    atService('arms-armor'); systems.openService('arms-armor'); choose(/^Brynn — Fighter/);
    const pack = systems.getInventorySnapshot('c_fighter').inventory;
    choose(/^Long Sword —/);
    assert.deepEqual(systems.getInventorySnapshot('c_fighter').inventory, pack);
    assert.equal(partyMoney(record), initialMoney, 'Another companion’s purse is unavailable to the buyer.');
    choose('POOL money');
    assert.equal(systems.isTreasureOpen, true);
    assert.equal(partyMoney(record), 0);
    assert.equal(coinValue(systems.getTreasureSnapshot().coins), initialMoney);
    assert.equal(systems.exitTreasure().ok, true, 'Returning to the shop retains its temporary purchasing fund.');
    choose(/^Brynn — Fighter/);
    const retainedPurchase = record.actions.buttons.find(button => /^Long Sword —/.test(button.label)).onSelect;
    choose(/^Long Sword —/);
    assert.equal(systems.getInventorySnapshot('c_fighter').inventory.filter(entry => entry?.itemId === 'long_sword').length, 1);
    assert.equal(partyMoney(record), 0);
    assert.equal(systems.closeService(), false);
    assert.equal(systems.isTreasureOpen, true);
    assert.equal(systems.getTreasureSnapshot().pendingLeave, true);
    const remainingMoney = initialMoney - 3000;
    assert.equal(coinValue(systems.getTreasureSnapshot().coins), remainingMoney);
    assert.equal(systems.exitTreasure().needsConfirmation, true);
    const pendingTreasure = systems.getTreasureSnapshot();
    retainedPurchase();
    assert.deepEqual(systems.getTreasureSnapshot(), pendingTreasure, 'A retained shop action cannot spend during money collection.');
    collectTreasureMoney(systems);
    assert.equal(systems.isServiceOpen, false);
    assert.equal(partyMoney(record), remainingMoney);
    const collectedPack = systems.getInventorySnapshot('c_fighter').inventory;
    retainedPurchase();
    assert.deepEqual(systems.getInventorySnapshot('c_fighter').inventory, collectedPack);
    assert.equal(partyMoney(record), remainingMoney);
    assert.equal(systems.dropInventoryCoins('c_fighter', 'gold', 1).ok, true);
    assert.equal(partyMoney(record), remainingMoney - 200);
  });
});

test('council commissions persist and pay once, fund class training, and unlock the wilderness only after Sokal Keep is reported', async () => {
  await withCombat(async context => {
    const { systems, record, atService, choose } = context;
    assert.equal(systems.canTravel('moonsea-wilderness').ok, false);
    for (let battle = 0; battle < 3; battle += 1) await winBattle(context);
    assert.equal(systems.getQuestSnapshot().find(quest => quest.id === 'slums').victories, 3);
    atService('council'); systems.openService('council');
    const money = partyMoney(record);
    choose(/^Clear the Slums/);
    assert.equal(partyMoney(record), money, 'Council coins remain on the treasure pile until collected.');
    assert.equal(systems.getTreasureSnapshot().coins.gold, 6000);
    const councilReward = systems.getTreasureSnapshot();
    const overweight = systems.takeTreasureCoins('c_fighter', 'gold', 6000);
    assert.equal(overweight.ok, false);
    assert.match(overweight.message, /cannot carry/);
    assert.deepEqual(systems.getTreasureSnapshot(), councilReward, 'A valid coin amount exceeding carrying capacity remains in the reward pile.');
    collectTreasureMoney(systems);
    assert.equal(partyMoney(record), money + 1200000);
    const rewarded = partyMoney(record);
    systems.openService('council');
    choose(/^Clear the Slums/);
    assert.equal(partyMoney(record), rewarded, 'A retained commission cannot pay twice.');
    assert.equal(systems.isTreasureOpen, false);
    systems.closeService();
    atService('fighter-trainer'); systems.openService('fighter-trainer');
    const before = systems.getInventorySnapshot('c_fighter');
    choose(/^Brynn — Fighter level/);
    const trained = systems.getInventorySnapshot('c_fighter');
    assert.equal(trained.character.level, 2);
    assert.equal(partyMoney(record), rewarded - 200000);
    assert.ok(trained.character.hpMax > before.character.hpMax);
    assert.equal(trained.stats.thac0, before.stats.thac0 - 1);
    assert.deepEqual(trained.equipment, before.equipment);
    systems.closeService();
    for (let battle = 0; battle < 2; battle += 1) await winBattle(context, 'Sokal Keep');
    assert.equal(systems.canTravel('moonsea-wilderness').ok, false);
    atService('council'); systems.openService('council');
    choose(/^Secure Sokal Keep/);
    collectTreasureMoney(systems);
    assert.equal(systems.canTravel('moonsea-wilderness').ok, true);
  });
});

test('practice restores prior health and spell charges and grants no rewards or temple relocation', async () => {
  await withCombat(async context => {
    const { systems, record, atService, choose, unit, flush, setRandom, begin } = context;
    await begin();
    const mage = unit('c_mage2');
    systems.selectCombatCell(mage.x, mage.y);
    choose('Cast Spell'); choose(/^Magic Missile —/);
    const target = unit(record.snapshot.targetIds[0]);
    systems.selectCombatCell(target.x, target.y); await flush();
    setRandom(0); choose('Flee'); await flush();
    const original = record.party.members.map(hero => ({ id: hero.id, hp: hero.hpCurrent, charges: hero.preparedCount }));
    const money = partyMoney(record);
    atService('dueling-hall'); systems.openService('dueling-hall');
    choose('Begin a safe practice battle'); await flush();
    setRandom(0.99);
    const foe = unit(record.snapshot.targetIds[0]);
    systems.selectCombatCell(foe.x, foe.y); await flush();
    assert.equal(systems.isCombatActive, false);
    assert.deepEqual(record.party.members.map(hero => ({ id: hero.id, hp: hero.hpCurrent, charges: hero.preparedCount })), original);
    assert.equal(partyMoney(record), money);
    assert.equal(systems.isTreasureOpen, false);
    assert.equal(record.defeats, 0);
  });
});

test('a full-party defeat restores all companions and memorized charges before invoking the city temple return', async () => {
  await withCombat(async ({ systems, record, begin, choose, flush, setRandom, setDefeatHandler }) => {
    let observed;
    setDefeatHandler(() => { observed = structuredClone(record.party); });
    await begin();
    setRandom(0.99);
    for (let action = 0; action < 200 && systems.isCombatActive; action += 1) { choose('End Turn'); await flush(); }
    assert.equal(record.defeats, 1);
    assert.equal(systems.isCombatActive, false);
    assert.ok(observed.members.every(hero => hero.alive && hero.hpCurrent === hero.hpMax));
    assert.equal(observed.members.find(hero => hero.id === 'c_cleric').preparedCount, 3);
    assert.ok(record.snapshots.some(snapshot => snapshot.units.some(hero => ['unconscious','dying','dead'].includes(hero.healthStatus))), 'Damage must expose real incapacitation states before resurrection.');
    assert.equal(record.hides, 1);
  });
});

test('retained service and flee commands cannot mutate state after their menus close', async () => {
  await withCombat(async ({ systems, record, atService, choose, begin, flush, setRandom }) => {
    atService('arms-armor'); systems.openService('arms-armor'); choose(/^Brynn — Fighter/);
    const purchase = record.actions.buttons.find(button => /^Long Sword —/.test(button.label)).onSelect;
    const money = partyMoney(record);
    systems.closeService(); purchase();
    assert.equal(partyMoney(record), money);
    await begin();
    const flee = record.actions.buttons.find(button => button.label === 'Flee').onSelect;
    setRandom(0); flee(); await flush();
    const snapshots = record.snapshots.length;
    flee(); systems.selectCombatCell(0,0); await flush();
    assert.equal(record.snapshots.length, snapshots);
    assert.equal(record.hides, 1);
    assert.equal(record.actions, null);
  });
});

test('character creation validates original race and class combinations and constructs the chosen adventurer', async () => {
  const descriptor = { name: 'Talan', race: 'Elf', classType: 'Fighter', classes: ['Fighter','Magic-user'], alignment: 'Chaotic good', exceptionalStrength: 75,
    attributes: { strength: 18, intelligence: 17, wisdom: 10, dexterity: 16, constitution: 13, charisma: 11 } };
  assert.equal(validateParty([descriptor]).ok, true);
  assert.equal(validateParty([{ ...descriptor, race: 'Human' }]).ok, false, 'Humans do not select simultaneous classes.');
  assert.equal(validateParty([{ ...descriptor, race: 'Halfling', classType: 'Cleric', classes: ['Cleric'] }]).ok, false);
  assert.equal(validateParty([{ ...descriptor, attributes: { ...descriptor.attributes, intelligence: 8 } }]).ok, false);
  assert.equal(validateParty(Array.from({ length: 7 }, (_, index) => ({ ...descriptor, name: `Elf ${index}` }))).ok, false);
  assert.ok(availableClassOptions('Half-elf').some(option => option.classes.join('/') === 'Cleric/Fighter/Magic-user'));
  const rolled = rollAbilityScores('Halfling','Thief');
  assert.ok(rolled.dexterity >= 9 && rolled.constitution >= 10 && rolled.strength <= 17);
  await withCombat(async ({ systems, record }) => {
    assert.equal(record.party.members.length, 1);
    const hero = systems.getInventorySnapshot('c_1');
    assert.equal(hero.character.name, 'Talan');
    assert.equal(hero.character.race, 'Elf');
    assert.equal(hero.character.displayClass, 'Fighter / Magic-user');
    assert.equal(hero.character.hpMax, 7);
    assert.equal(hero.stats.saves.spell, 12, 'A multiclass adventurer takes the better saving throw.');
    assert.equal(hero.equipment.head, 'iron_helm');
    assert.equal(systems.getSpellPreparation(hero.character.id).prepared.length, 1);
  }, [descriptor]);
});

test('camp Read Magic identifies a purchased scroll which can then be cast without consuming a prepared charge', async () => {
  await withCombat(async ({ systems, record, choose, atService, begin, unit, flush, setRandom }) => {
    assert.equal(systems.transferInventoryCoins('c_fighter', 'c_mage', 'gold', 50).ok, true);
    atService('silver-shop'); systems.openService('silver-shop'); choose(/^Quint — Magic-user/);
    choose(/^Magic-user Scroll: Magic Missile —/);
    systems.closeService();
    const scrollIndex = systems.getInventorySnapshot('c_mage').inventory.findIndex(entry => entry?.itemId === 'magic_missile_scroll');
    assert.equal(systems.getInventorySnapshot('c_mage').inventory[scrollIndex].identified, false);
    systems.unprepareSpell('c_mage',0); systems.prepareSpell('c_mage','MU_READ_MAGIC');
    atService('inn'); systems.openService('inn'); choose(/^Rest and memorize spells/); systems.closeService();
    assert.equal(systems.openCamp().ok, true); choose(/^Quint — Magic-user/); choose('Cast Read Magic');
    assert.equal(systems.getInventorySnapshot('c_mage').inventory[scrollIndex].identified, true);
    assert.equal(systems.getSpellPreparation('c_mage').prepared.length, 0);
    systems.closeService();
    await begin();
    const mage = unit('c_mage'); systems.selectCombatCell(mage.x,mage.y); choose('Use Scroll'); choose('Magic-user Scroll: Magic Missile');
    const foe = unit(record.snapshot.targetIds[0]); setRandom(0.99); systems.selectCombatCell(foe.x,foe.y); await flush();
    assert.equal(systems.getInventorySnapshot(mage.id).inventory[scrollIndex], null);
    assert.equal(unit(mage.id).preparedCount, 0);
    assert.equal(unit(foe.id).alive, false);
  });
});

test('combat dice use descending AC, natural roll limits, separate damage dice and saving throws', () => {
  assert.equal(attackRoll(18,4,0,()=>0.65).success,true, '14 hits armor class4 at THAC0 18.');
  assert.equal(attackRoll(18,-1,0,()=>0.85).success,false, '18 misses armor class-1.');
  assert.equal(attackRoll(40,-10,0,()=>0.99).success,true, 'A natural twenty hits even impossible armor.');
  assert.equal(attackRoll(1,10,100,()=>0).success,false, 'A natural one always misses.');
  assert.equal(rollDice('3d6+2',()=>0.4),11);
  assert.equal(savingThrow({spell:12},'spell',0,()=>0.55),true);
  assert.equal(savingThrow({spell:12},'spell',0,()=>0.5),false);
});

test('multiclass experience splits and a class trainer advances its own level without granting an unearned mage level', async () => {
  const descriptor = { name: 'Talan', race: 'Elf', classType: 'Fighter', classes: ['Fighter','Magic-user'], alignment: 'Chaotic good', exceptionalStrength: 75,
    attributes: { strength: 18, intelligence: 17, wisdom: 10, dexterity: 16, constitution: 13, charisma: 11 } };
  await withCombat(async context => {
    const { systems, record, atService, choose, begin, unit, flush } = context;
    for (let battle=0;battle<3;battle+=1) await winBattle(context);
    atService('council'); systems.openService('council'); choose(/^Clear the Slums/); collectTreasureMoney(systems);
    atService('fighter-trainer'); systems.openService('fighter-trainer'); choose(/^Talan — Fighter level/);
    assert.equal(systems.getInventorySnapshot('c_1').character.level,1, 'The shared XP pool cannot be used as full XP in both classes.');
    systems.closeService();
    for (let battle=0;battle<2;battle+=1) await winBattle(context,'Sokal Keep');
    atService('council'); systems.openService('council'); choose(/^Secure Sokal Keep/); collectTreasureMoney(systems);
    atService('fighter-trainer'); systems.openService('fighter-trainer');
    const money=partyMoney(record); choose(/^Talan — Fighter level/);
    assert.equal(partyMoney(record),money-200000);
    assert.match(systems.getInventorySnapshot('c_1').character.levelText,/Fighter 2 \/ Magic-user 1/);
    systems.closeService();
    atService('magic-user-trainer'); systems.openService('magic-user-trainer'); choose(/^Talan — Magic-user level/);
    assert.match(systems.getInventorySnapshot('c_1').character.levelText,/Magic-user 1/);
    assert.equal(partyMoney(record),money-200000);
    systems.closeService();
    assert.equal(systems.unprepareSpell('c_1',0).ok,true);
    assert.equal(systems.prepareSpell('c_1','MU_MAGIC_MISSILE').ok,true);
    atService('inn'); systems.openService('inn'); choose(/^Rest and memorize spells/); systems.closeService();
    await begin();
    const foe=record.snapshot.units.find(target=>target.team==='monster');
    const retreat=record.snapshot.reachable.find(cell=>Math.abs(cell.x-foe.x)+Math.abs(cell.y-foe.y)===8);
    assert.ok(retreat);
    systems.selectCombatCell(retreat.x,retreat.y); await flush();
    choose('Cast Spell'); choose(/^Magic Missile —/);
    assert.equal(record.snapshot.targetIds.includes(foe.id),false,'Fighter level two must not extend a level-one mage spell beyond seven cells.');
    assert.equal(unit('c_1').preparedCount,1,'An out-of-range preview retains the memorized charge.');
  },[descriptor]);
});

test('a fighter level does not improve an untrained multiclass cleric’s Turn Undead roll', async () => {
  const descriptor = { name: 'Lysa', race: 'Half-elf', classType: 'Cleric', classes: ['Cleric','Fighter'], alignment: 'Neutral good', exceptionalStrength: 75,
    attributes: { strength: 18, intelligence: 12, wisdom: 17, dexterity: 16, constitution: 13, charisma: 11 } };
  await withCombat(async context => {
    const { systems, record, atService, choose, begin, unit, flush, setRandom } = context;
    for (let battle=0;battle<3;battle+=1) await winBattle(context);
    atService('council'); systems.openService('council'); choose(/^Clear the Slums/); collectTreasureMoney(systems);
    for (let battle=0;battle<2;battle+=1) await winBattle(context,'Sokal Keep');
    atService('council'); systems.openService('council'); choose(/^Secure Sokal Keep/); collectTreasureMoney(systems);
    atService('fighter-trainer'); systems.openService('fighter-trainer'); choose(/^Lysa — Fighter level/); systems.closeService();
    assert.match(systems.getInventorySnapshot('c_1').character.levelText,/Cleric 1 \/ Fighter 2/);
    await begin('Sokal Keep');
    const skeleton=record.snapshot.units.find(target=>target.kind==='skeleton');
    assert.ok(skeleton);
    setRandom(0.4); // A nine fails the level-one skeleton turning threshold of ten.
    choose('Turn Undead'); await flush();
    assert.equal(unit(skeleton.id).alive,true);
    assert.notEqual(unit(skeleton.id).healthStatus,'turned');
  },[descriptor]);
});

test('camp rejects Animate Dead without changing a living companion or expending charges', async () => {
  await withCombat(async ({ systems }) => {
    const before=systems.getInventorySnapshot('c_cleric');
    const response=systems.castAdventureSpell('c_cleric','CL_ANIMATE_DEAD','c_cleric');
    assert.equal(response.ok,false);
    assert.match(response.message,/cannot be cast in camp/);
    const after=systems.getInventorySnapshot('c_cleric');
    assert.deepEqual(after,before);
  });
});
