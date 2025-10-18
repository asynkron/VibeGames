const DEFAULT_PAD = ' ';

function normalizeLines(text, { lineFilter, trimLines = true } = {}) {
  const rawLines = (text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const filtered = lineFilter ? rawLines.filter((line, idx) => lineFilter(line, idx)) : rawLines;
  return filtered.map(line => (trimLines ? line.replace(/\s+$/u, '') : line));
}

export function parseTextMap(text, width, height, options = {}) {
  const {
    mapTile = (ch) => ch,
    arrayType = Array,
    padChar = DEFAULT_PAD,
    lineFilter,
    trimLines,
    outOfBounds = () => undefined,
  } = options;

  const lines = normalizeLines(text, { lineFilter, trimLines });
  const resolvedHeight = typeof height === 'number' ? height : lines.length;
  const resolvedWidth = typeof width === 'number'
    ? width
    : lines.reduce((max, line) => Math.max(max, line.length), 0);

  if (!resolvedWidth || !resolvedHeight) {
    return {
      width: 0,
      height: 0,
      data: arrayType === Array ? [] : new arrayType(0),
      chars: [],
      index: () => 0,
      inBounds: () => false,
      get: () => undefined,
      getChar: () => undefined,
      set: () => {},
      forEachTile: () => {},
      rows: [],
    };
  }

  const total = resolvedWidth * resolvedHeight;
  const data = arrayType === Array ? new Array(total) : new arrayType(total);
  const chars = new Array(total);

  for (let y = 0; y < resolvedHeight; y += 1) {
    const line = lines[y] || '';
    for (let x = 0; x < resolvedWidth; x += 1) {
      const ch = line[x] ?? padChar;
      const idx = y * resolvedWidth + x;
      chars[idx] = ch;
      data[idx] = mapTile(ch, x, y, idx);
    }
  }

  const grid = {
    width: resolvedWidth,
    height: resolvedHeight,
    data,
    chars,
    rows: Array.from({ length: resolvedHeight }, (_, y) =>
      chars.slice(y * resolvedWidth, (y + 1) * resolvedWidth).join('')
    ),
    index(x, y) {
      return y * this.width + x;
    },
    inBounds(x, y) {
      return x >= 0 && y >= 0 && x < this.width && y < this.height;
    },
    get(x, y, fallback) {
      if (this.inBounds(x, y)) {
        return this.data[this.index(x, y)];
      }
      if (fallback !== undefined) {
        return typeof fallback === 'function' ? fallback(x, y) : fallback;
      }
      return outOfBounds(x, y);
    },
    getChar(x, y, fallback) {
      if (this.inBounds(x, y)) {
        return this.chars[this.index(x, y)];
      }
      if (fallback !== undefined) {
        return typeof fallback === 'function' ? fallback(x, y) : fallback;
      }
      return outOfBounds(x, y);
    },
    set(x, y, value, newChar = null) {
      if (!this.inBounds(x, y)) return;
      const idx = this.index(x, y);
      this.data[idx] = value;
      if (newChar !== null) this.chars[idx] = newChar;
    },
    forEachTile(callback) {
      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          const idx = this.index(x, y);
          callback(this.data[idx], x, y, this.chars[idx], idx);
        }
      }
    },
  };

  return grid;
}

export function indexFor(width, x, y) {
  return y * width + x;
}

export function inBounds(width, height, x, y) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function forEachTile(grid, callback) {
  if (!grid || typeof grid.forEachTile !== 'function') return;
  grid.forEachTile((value, x, y, ch, idx) => callback(value, x, y, ch, idx));
}
