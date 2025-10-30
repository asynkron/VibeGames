const DEFAULT_SIZE = 16;

function hashKey(key) {
  if (typeof key === 'number') return key >>> 0;
  if (typeof key === 'string') {
    let hash = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
      hash ^= key.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash >>> 0;
  }
  return 1337;
}

function createRng(seed) {
  let state = (seed || 1) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function mkCanvas(width, height, draw, { smoothing = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = smoothing;
  draw(ctx, width, height);
  return canvas;
}

export function createTileFactory({ size = DEFAULT_SIZE, smoothing = false } = {}) {
  const definitions = new Map();
  const cache = new Map();

  function define(key, painter) {
    definitions.set(key, painter);
    cache.delete(key);
    return factory;
  }

  function defineMany(entries) {
    if (!entries) return factory;
    if (Array.isArray(entries)) {
      for (const [key, painter] of entries) define(key, painter);
      return factory;
    }
    for (const [key, painter] of Object.entries(entries)) define(key, painter);
    return factory;
  }

  function has(key) {
    return definitions.has(key);
  }

  function build(key) {
    const painter = definitions.get(key);
    if (!painter) {
      throw new Error(`Unknown tile "${String(key)}"`);
    }
    const canvas = mkCanvas(size, size, (ctx, w, h) => painter(ctx, w, h));
    cache.set(key, canvas);
    return canvas;
  }

  function get(key) {
    if (cache.has(key)) return cache.get(key);
    return build(key);
  }

  function render(key, { scale = 1 } = {}) {
    const base = get(key);
    const canvas = mkCanvas(base.width * scale, base.height * scale, (ctx, w, h) => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(base, 0, 0, w, h);
    });
    return canvas;
  }

  function list() {
    return [...definitions.entries()].map(([key, painter]) => ({ key, painter }));
  }

  function clearCache() {
    cache.clear();
    return factory;
  }

  function createSpriteSheet({ columns = 8, padding = 2, background = 'transparent', scale = 1 } = {}) {
    const keys = [...definitions.keys()];
    if (keys.length === 0) {
      return mkCanvas(1, 1, (ctx) => ctx.clearRect(0, 0, 1, 1));
    }
    const cell = size * scale + padding;
    const rows = Math.ceil(keys.length / columns);
    const width = columns * cell + padding;
    const height = rows * cell + padding;
    return mkCanvas(width, height, (ctx, w, h) => {
      if (background !== 'transparent') {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
      keys.forEach((key, index) => {
        const col = index % columns;
        const row = (index / columns) | 0;
        const x = padding + col * cell;
        const y = padding + row * cell;
        const sprite = get(key);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, x, y, size * scale, size * scale);
      });
    });
  }

  function withNoise(key, painter) {
    const seed = hashKey(key);
    return (ctx, w, h) => painter(ctx, w, h, createRng(seed));
  }

  const factory = {
    size,
    smoothing,
    define,
    defineMany,
    has,
    get,
    render,
    list,
    clearCache,
    createSpriteSheet,
    withNoise,
  };

  return factory;
}

export function createNoisePainter(seed, painter) {
  const hashed = hashKey(seed);
  return (ctx, w, h) => painter(ctx, w, h, createRng(hashed));
}
