// Deterministic RNG helpers shared across games.
// Provides the mulberry32 generator plus a lightweight convenience wrapper.

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFromSeed(seedStr) {
  const seed = seedStr ? hashString(String(seedStr)) : Math.floor(Math.random() * 2 ** 32);
  const base = mulberry32(seed);
  return {
    seed,
    next() {
      return base();
    },
    /**
     * Inclusive integer helper for convenience (min/max order agnostic).
     */
    int(min, max) {
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      return Math.floor(base() * (hi - lo + 1)) + lo;
    },
    /**
     * Picks a random element from an array.
     */
    choice(list) {
      if (!Array.isArray(list) || list.length === 0) return undefined;
      const index = Math.floor(base() * list.length);
      return list[index];
    },
  };
}
