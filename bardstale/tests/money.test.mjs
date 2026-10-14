import assert from 'node:assert/strict';
import test from 'node:test';
import { createInventory, createEquipment, addInventoryItem } from '../src/systems/inventory.js';
import { createCoins, coinCount, coinValue, canAffordCoins, spendCoins, takeCoins, transferCoins, poolCoins, shareCoins } from '../src/systems/money.js';

function character(id, initialCoins = {}) {
  return {
    id, name: id, classes: ['Fighter'],
    attributes: { strength: 13, intelligence: 13, wisdom: 13, dexterity: 14, constitution: 14, charisma: 13 },
    base: { ac: 10, thac0: 20, damageDice: '1d2', movement: 12, saves: {} },
    coins: createCoins(initialCoins), inventory: createInventory(), equipment: createEquipment(), statusEffects: [],
  };
}

test('purchases use the original coin exchange values, retain unspent denominations, and make exact change', () => {
  for (const coins of [{ copper: 200 }, { silver: 20 }, { electrum: 2 }, { gold: 1 }]) {
    const purse = createCoins(coins);
    assert.equal(coinValue(purse), 200);
    assert.equal(canAffordCoins(purse, 1), true);
    assert.equal(spendCoins(purse, 1).ok, true);
    assert.equal(coinValue(purse), 0);
  }
  const purse = createCoins({ copper: 4, silver: 1, electrum: 1, gold: 2, platinum: 1 });
  const startingValue = coinValue(purse);
  assert.equal(spendCoins(purse, 1).ok, true);
  assert.equal(coinValue(purse), startingValue - 200);
  assert.deepEqual(purse, createCoins({ copper: 4, silver: 1, electrum: 1, gold: 1, platinum: 1 }));
  const platinum = createCoins({ platinum: 1 });
  assert.equal(spendCoins(platinum, 1.5).ok, true);
  assert.deepEqual(platinum, createCoins({ gold: 3, electrum: 1 }));
  assert.equal(coinValue(platinum), 700);
  const smallChange = createCoins({ copper: 20 });
  assert.equal(spendCoins(smallChange, 0.07).ok, true, 'A fourteen-copper price remains valid despite binary floating point.');
  assert.equal(smallChange.copper, 6);
  const before = structuredClone(platinum);
  for (const price of [4, -1, Infinity, NaN, '1', 0.001, null, undefined, {}, Symbol('price')]) {
    assert.equal(canAffordCoins(platinum, price), false);
    assert.equal(spendCoins(platinum, price).ok, false);
    assert.deepEqual(platinum, before, 'An unaffordable or invalid purchase cannot consume coins.');
  }
});

test('taking and trading money conserve denominations and reject invalid or overweight requests atomically', () => {
  const treasure = createCoins({ copper: 110, gold: 12 });
  const recipient = character('recipient', { silver: 1500 });
  const donor = character('donor', { copper: 3, platinum: 2 });
  const before = structuredClone([treasure, donor, recipient]);
  assert.equal(takeCoins(treasure, recipient, 'copper', 101).ok, false);
  assert.equal(transferCoins(donor, recipient, 'copper', 4).ok, false);
  for (const [type, amount] of [['copper', -1], ['gold', 0], ['gold', 1.5], ['gems', 1]]) {
    assert.equal(takeCoins(treasure, recipient, type, amount).ok, false);
  }
  assert.deepEqual([treasure, donor, recipient], before);
  assert.equal(takeCoins(treasure, recipient, 'copper', 100).ok, true);
  assert.equal(recipient.coins.copper, 100);
  assert.equal(treasure.copper, 10);
  const atCapacity = structuredClone([donor, recipient]);
  assert.equal(transferCoins(donor, recipient, 'platinum', 1).ok, false);
  assert.deepEqual([donor, recipient], atCapacity);
  assert.equal(transferCoins(recipient, donor, 'copper', 3).ok, true);
  assert.equal(recipient.coins.copper, 97);
  assert.equal(donor.coins.copper, 6);
  assert.equal(donor.coins.platinum, 2);
  assert.equal(coinValue(treasure) + coinValue(donor.coins) + coinValue(recipient.coins),
    coinValue(before[0]) + coinValue(before[1].coins) + coinValue(before[2].coins));
});

test('POOL moves the party purses into a temporary fund and SHARE divides money per denomination without touching equipment', () => {
  const first = character('first', { copper: 3, electrum: 1 });
  const second = character('second', { silver: 3, platinum: 1 });
  const third = character('third', { gold: 1 });
  assert.equal(addInventoryItem(first, 'long_sword').ok, true);
  const members = [first, second, third];
  const inventories = members.map(member => structuredClone(member.inventory));
  const pool = createCoins({ copper: 2, silver: 2, gold: 2 });
  const total = coinValue(pool) + members.reduce((value, member) => value + coinValue(member.coins), 0);
  assert.equal(poolCoins(members, pool).ok, true);
  assert.ok(members.every(member => coinCount(member.coins) === 0));
  assert.equal(coinValue(pool), total);
  assert.equal(shareCoins(pool, members).ok, true);
  assert.deepEqual(first.coins, createCoins({ copper: 2, silver: 2, electrum: 1, gold: 1, platinum: 1 }));
  assert.deepEqual(second.coins, createCoins({ copper: 2, silver: 2, gold: 1 }));
  assert.deepEqual(third.coins, createCoins({ copper: 1, silver: 1, gold: 1 }));
  assert.equal(coinCount(pool), 0);
  assert.equal(members.reduce((value, member) => value + coinValue(member.coins), 0), total);
  assert.deepEqual(members.map(member => member.inventory), inventories, 'SHARE distributes money only.');
});

test('SHARE skips full purses and leaves uncarryable treasure instead of destroying or converting it', () => {
  const members = [character('full', { copper: 1600 }), character('two spaces', { copper: 1598 }), character('one space', { silver: 1599 })];
  const treasure = createCoins({ gold: 6, platinum: 1 });
  const total = coinValue(treasure) + members.reduce((value, member) => value + coinValue(member.coins), 0);
  assert.equal(shareCoins(treasure, members).ok, true);
  assert.deepEqual(members.map(member => member.coins.gold), [0, 2, 1]);
  assert.deepEqual(treasure, createCoins({ gold: 3, platinum: 1 }));
  assert.ok(members.every(member => coinCount(member.coins) === 1600));
  assert.equal(coinValue(treasure) + members.reduce((value, member) => value + coinValue(member.coins), 0), total);
  const before = structuredClone([treasure, ...members]);
  assert.equal(shareCoins(treasure, members).ok, false);
  assert.deepEqual([treasure, ...members], before);
});
