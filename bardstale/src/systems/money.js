import { computeCharacterStats } from './inventory.js';

export const COIN_TYPES = Object.freeze([
  { id: 'copper', label: 'Copper', abbreviation: 'CP', value: 1 },
  { id: 'silver', label: 'Silver', abbreviation: 'SP', value: 10 },
  { id: 'electrum', label: 'Electrum', abbreviation: 'EP', value: 100 },
  { id: 'gold', label: 'Gold', abbreviation: 'GP', value: 200 },
  { id: 'platinum', label: 'Platinum', abbreviation: 'PP', value: 1000 },
].map(type => Object.freeze(type)));

const result = (ok, message) => ({ ok, message });
const validCount = value => Number.isSafeInteger(value) && value >= 0;

export function createCoins(initial = {}) {
  return Object.fromEntries(COIN_TYPES.map(({ id }) => {
    const count = initial[id] ?? 0;
    if (!validCount(count)) throw new RangeError(`Invalid ${id} coin count.`);
    return [id, count];
  }));
}

export function coinCount(coins) {
  return COIN_TYPES.reduce((total, { id }) => total + coins[id], 0);
}

export function coinValue(coins) {
  return COIN_TYPES.reduce((total, { id, value }) => total + coins[id] * value, 0);
}

export function formatCoins(coins) {
  return COIN_TYPES.filter(({ id }) => coins[id] > 0)
    .map(({ id, abbreviation }) => `${coins[id]} ${abbreviation}`).join(', ') || 'No coins';
}

function copperPrice(goldPrice) {
  if (typeof goldPrice !== 'number' || !Number.isFinite(goldPrice) || goldPrice < 0) return null;
  const exactPrice = goldPrice * 200;
  const price = Math.round(exactPrice);
  return Number.isSafeInteger(price) && Math.abs(exactPrice - price) <= Number.EPSILON * Math.max(1, exactPrice)
    ? price : null;
}

export function canAffordCoins(coins, goldPrice) {
  const price = copperPrice(goldPrice);
  return price !== null && coinValue(coins) >= price;
}

export function spendCoins(coins, goldPrice) {
  const price = copperPrice(goldPrice);
  if (price === null) return result(false, 'Invalid price.');
  if (coinValue(coins) < price) return result(false, 'There is not enough money in this purse.');
  const paid = createCoins(coins);
  let remaining = price;
  for (let index = 0; index < COIN_TYPES.length && remaining > 0; index += 1) {
    const { id, value } = COIN_TYPES[index];
    const count = Math.min(paid[id], Math.floor(remaining / value));
    paid[id] -= count;
    remaining -= count * value;
    if (remaining > 0 && remaining < value && paid[id] > 0) {
      paid[id] -= 1;
      let change = value - remaining;
      for (let lower = index - 1; lower >= 0; lower -= 1) {
        const denomination = COIN_TYPES[lower];
        const changeCount = Math.floor(change / denomination.value);
        paid[denomination.id] += changeCount;
        change -= changeCount * denomination.value;
      }
      remaining = 0;
    }
  }
  Object.assign(coins, paid);
  return result(true, `Paid ${goldPrice} GP.`);
}

function coinRequest(sourceCoins, type, amount) {
  const denomination = COIN_TYPES.find(coin => coin.id === type);
  if (!denomination || !Number.isSafeInteger(amount) || amount < 1) return result(false, 'Choose a coin type and a positive whole number of coins.');
  if (sourceCoins[type] < amount) return result(false, `There are not that many ${denomination.label.toLowerCase()} coins.`);
  return result(true, '');
}

function carryingRoom(character) {
  const stats = computeCharacterStats(character);
  return Math.max(0, Math.floor(stats.maxCarryWeight - stats.carriedWeight));
}

export function takeCoins(sourceCoins, character, type, amount) {
  if (sourceCoins === character.coins) return result(false, 'That money is already in this purse.');
  const request = coinRequest(sourceCoins, type, amount);
  if (!request.ok) return request;
  if (carryingRoom(character) < amount) return result(false, `${character.name} cannot carry that many coins.`);
  sourceCoins[type] -= amount;
  character.coins[type] += amount;
  return result(true, `${character.name} took ${amount} ${COIN_TYPES.find(coin => coin.id === type).abbreviation}.`);
}

export function transferCoins(sourceCharacter, destination, type, amount) {
  if (sourceCharacter === destination || sourceCharacter.id === destination.id) return result(false, 'Choose another party member.');
  const response = takeCoins(sourceCharacter.coins, destination, type, amount);
  if (!response.ok) return response;
  return result(true, `${sourceCharacter.name} gave ${amount} ${COIN_TYPES.find(coin => coin.id === type).abbreviation} to ${destination.name}.`);
}

export function poolCoins(members, destinationCoins) {
  if (members.some(member => member.coins === destinationCoins)) return result(false, 'Choose a separate money pool.');
  let pooled = 0;
  for (const member of members) {
    for (const { id } of COIN_TYPES) {
      pooled += member.coins[id];
      destinationCoins[id] += member.coins[id];
      member.coins[id] = 0;
    }
  }
  return result(pooled > 0, pooled > 0 ? `${pooled} coins placed in the pool.` : 'The party has no money to pool.');
}

export function shareCoins(sourceCoins, members) {
  if (members.some(member => member.coins === sourceCoins)) return result(false, 'Share money from a separate treasure or service pool.');
  const recipients = members.map(member => ({ member, room: carryingRoom(member) }));
  let shared = 0;
  for (const { id } of COIN_TYPES) {
    while (sourceCoins[id] > 0) {
      const available = recipients.filter(recipient => recipient.room > 0);
      if (!available.length) break;
      const equalShare = Math.min(Math.floor(sourceCoins[id] / available.length), ...available.map(recipient => recipient.room));
      if (equalShare > 0) {
        for (const recipient of available) {
          recipient.member.coins[id] += equalShare;
          recipient.room -= equalShare;
          sourceCoins[id] -= equalShare;
          shared += equalShare;
        }
      } else {
        for (const recipient of available) {
          if (!sourceCoins[id]) break;
          recipient.member.coins[id] += 1;
          recipient.room -= 1;
          sourceCoins[id] -= 1;
          shared += 1;
        }
      }
    }
  }
  const remaining = coinCount(sourceCoins);
  return result(shared > 0, shared > 0
    ? `${shared} coins shared.${remaining ? ` ${remaining} coins remain because the party cannot carry them.` : ''}`
    : remaining ? 'The party cannot carry any more coins.' : 'There is no money to share.');
}
