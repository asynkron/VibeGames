// House architecture uses the same voxel pitch as people, furniture and terrain.
// Walls are centered on Z; floors, ceilings and roofs span one 75-voxel tile.
export const BUILDING_STYLES = Object.freeze(['timber', 'plaster', 'brick', 'stone']);
export const BUILDING_KINDS = Object.freeze(['wall', 'door', 'floor', 'ceiling', 'roof']);

const STYLES = Object.freeze({
  timber: Object.freeze({ plaster: '#d5c3a2', trim: '#685042', wood: '#574034', sill: '#a9977d', shutter: '#526d63', roof: '#9e5946', roofLight: '#b87455', roofDark: '#704137' }),
  plaster: Object.freeze({ plaster: '#9eafb8', trim: '#e0d7c5', wood: '#655348', sill: '#ded0b5', shutter: '#627f8c', roof: '#667580', roofLight: '#82909b', roofDark: '#424e5e' }),
  brick: Object.freeze({ plaster: '#a75d4b', trim: '#c6b18e', wood: '#57423a', sill: '#d6c0a0', shutter: '#64714c', roof: '#866455', roofLight: '#ad8063', roofDark: '#5d4540' }),
  stone: Object.freeze({ plaster: '#a8a89c', trim: '#c7c5b2', wood: '#5a5148', sill: '#c7c7b5', shutter: '#846352', roof: '#646f79', roofLight: '#89949b', roofDark: '#46545e' }),
});
const cache = new Map();

function hash(x, y, seed = 0) {
  let n = Math.imul(x + 31, 374761393) ^ Math.imul(y + 11, 668265263) ^ Math.imul(seed + 7, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function mix(first, second, amount) {
  const a = Number.parseInt(first.slice(1), 16);
  const b = Number.parseInt(second.slice(1), 16);
  let result = 0;
  for (const shift of [16, 8, 0]) {
    const from = (a >>> shift) & 255;
    result = (result << 8) | Math.round(from + (((b >>> shift) & 255) - from) * amount);
  }
  return `#${result.toString(16).padStart(6, '0')}`;
}

function painter() {
  const cells = new Map();
  function put(x, y, z, color, material = 'stone') {
    cells.set(`${x},${y},${z}`, { x, y, z, color, material });
  }
  function box(x0, y0, z0, x1, y1, z1, color, material = 'stone') {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) put(x, y, z, color, material);
  }
  function clear(x0, y0, z0, x1, y1, z1) {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) cells.delete(`${x},${y},${z}`);
  }
  return { cells, put, box, clear };
}

function courses(p, y0, height, style) {
  const palette = STYLES[style];
  const brick = style === 'brick';
  const courseHeight = brick ? 6 : 10;
  const blockWidth = brick ? 14 : 23;
  for (let row = 0; row < Math.ceil(height / courseHeight); row++) {
    const offset = row % 2 ? -Math.floor(blockWidth / 2) : 0;
    for (let col = 0; col < Math.ceil(75 / blockWidth) + 1; col++) {
      const x0 = Math.max(0, offset + col * blockWidth + 1);
      const x1 = Math.min(75, offset + (col + 1) * blockWidth);
      if (x1 <= x0) continue;
      const seed = hash(col, row + y0, brick ? 2 : 5);
      const tone = seed % 997 / 997;
      const color = mix(palette.plaster, tone < 0.5 ? '#665e59' : '#e5c8a4', Math.abs(tone - 0.5) * 0.48);
      const bottom = y0 + row * courseHeight + 1;
      const top = Math.min(y0 + height, bottom + courseHeight - 1);
      const depth = brick || seed % 3 ? 3 : 4;
      p.box(x0, bottom, -depth, x1, top, depth, color);
      // Small recessed corners make the larger rubble blocks catch daylight.
      if (!brick && x1 - x0 > 4) {
        for (const z of [-depth, depth - 1]) p.put(x0, top - 1, z, '#7a817a');
      }
    }
  }
}

function diagonal(p, x0, x1, y0, y1, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / steps);
    const y = Math.round(y0 + (y1 - y0) * i / steps);
    p.box(Math.max(0, x - 1), y, -4, Math.min(75, x + 2), y + 2, 4, color, 'wood');
  }
}

function window(p, center, base, palette) {
  const left = center - 6;
  const right = center + 6;
  const bottom = base + 29;
  const top = base + 56;
  p.clear(left, bottom, -5, right, top, 5);
  // Recessed leaded glass is a real inset between the two facade faces.
  p.box(left, bottom, -1, right, top, 1, '#293f48', 'crystal');
  p.box(left + 1, bottom + 2, -1, center - 1, bottom + 12, 1, '#445963', 'crystal');
  p.box(center + 1, bottom + 15, -1, right - 1, top - 2, 1, '#637677', 'crystal');
  p.box(left - 2, bottom - 2, -4, left, top + 2, 4, palette.trim, 'wood');
  p.box(right, bottom - 2, -4, right + 2, top + 2, 4, palette.trim, 'wood');
  p.box(left, top, -4, right, top + 2, 4, palette.trim, 'wood');
  p.box(left - 3, bottom - 3, -5, right + 3, bottom - 1, 5, palette.sill);
  p.box(center - 1, bottom, -2, center + 1, top, 2, palette.wood, 'wood');
  p.box(left, bottom + 13, -2, right, bottom + 15, 2, palette.wood, 'wood');
  for (const x0 of [left - 7, right + 3]) {
    p.box(x0, bottom, -4, x0 + 4, top, 4, palette.shutter, 'wood');
    for (const y of [bottom + 4, top - 6]) {
      p.box(x0, y, -5, x0 + 4, y + 2, -4, '#383d3b', 'steel');
      p.box(x0, y, 4, x0 + 4, y + 2, 5, '#383d3b', 'steel');
    }
    for (const face of [-4, 3]) p.box(x0 + 1, bottom + 1, face, x0 + 2, top - 1, face + 1, mix(palette.shutter, '#bdc2aa', 0.18), 'wood');
  }
}

function wall(p, style, stories) {
  const palette = STYLES[style];
  const height = stories * 75;
  const masonry = style === 'brick' || style === 'stone';
  p.box(0, 0, -2, 75, height, 2, masonry ? '#8b8980' : palette.plaster);
  for (let story = 0; story < stories; story++) {
    const y = story * 75;
    if (masonry) courses(p, y, 75, style);
    else {
      // Slightly distinct plaster panels keep the facade broad and readable.
      for (let panel = 0; panel < 3; panel++) {
        const tone = mix(palette.plaster, story % 2 ? '#e7dcc9' : '#899b9a', (panel + 1) * 0.035);
        p.box(panel * 25 + 1, y + 4, -3, panel * 25 + 24, y + 70, 3, tone);
      }
    }
    const trimMaterial = style === 'timber' ? 'wood' : 'stone';
    for (const x of [0, 71]) p.box(x, y, -4, x + 4, y + 75, 4, palette.trim, trimMaterial);
    p.box(0, y, -4, 75, y + 4, 4, palette.trim, trimMaterial);
    p.box(0, y + 70, -4, 75, y + 75, 4, palette.trim, trimMaterial);
    if (style === 'timber') {
      p.box(36, y + 4, -4, 39, y + 70, 4, palette.wood, 'wood');
      p.box(0, y + 24, -4, 75, y + 27, 4, palette.wood, 'wood');
      diagonal(p, 5, 33, y + 5, y + 21, palette.wood);
      diagonal(p, 42, 69, y + 21, y + 5, palette.wood);
      diagonal(p, 5, 15, y + 68, y + 58, palette.wood);
      diagonal(p, 60, 70, y + 58, y + 68, palette.wood);
    }
    if (style === 'plaster') {
      p.box(4, y + 9, -4, 71, y + 11, 4, '#859da6');
      p.box(4, y + 67, -4, 71, y + 69, 4, '#becbd0');
    }
    window(p, 23, y, palette);
    window(p, 52, y, palette);
  }
  // A stone foundation anchors timber and stucco houses to the ground.
  p.box(0, 0, -4, 75, 5, 4, style === 'stone' ? '#737e76' : '#878477');
  p.box(0, height - 2, -5, 75, height, 5, palette.trim, style === 'timber' ? 'wood' : 'stone');
}

function openingHeight(x) {
  if (x < 4 || x >= 71) return 0;
  const inset = Math.min(x - 4, 70 - x);
  return inset < 8 ? 60 : inset < 17 ? 64 : inset < 26 ? 68 : 70;
}

function door(p, style, stories) {
  wall(p, style, stories);
  const palette = STYLES[style];
  for (const [key, voxel] of p.cells) if (voxel.y < openingHeight(voxel.x)) p.cells.delete(key);
  // The broad arcade is open across all three combat lanes, including its sills.
  for (let x = 4; x < 71; x++) {
    const y = openingHeight(x);
    const color = mix(palette.sill, '#ede3ce', Math.floor(x / 6) % 2 ? 0.17 : 0);
    p.box(x, y, -5, x + 1, Math.min(75, y + 4), 5, color);
  }
  for (const x of [0, 71]) p.box(x, 0, -5, x + 4, 60, 5, palette.sill);
  p.box(34, 70, -5, 41, 75, 5, '#dac8a8');
}

function floor(p, style) {
  const palette = STYLES[style];
  p.box(0, -4, 0, 75, -2, 75, '#403830', 'wood');
  for (let row = 0; row < 10; row++) {
    const z0 = row * 8;
    const z1 = Math.min(75, z0 + 7);
    const split = row % 2 ? 27 : 51;
    for (const [x0, x1] of [[0, split], [split + 1, 75]]) {
      const seed = hash(row, x0, 91);
      const color = mix(palette.wood, '#c7a27b', 0.22 + seed % 19 / 100);
      p.box(x0, -2, z0, x1, 0, z1, color, 'wood');
      for (const x of [x0 + 2, x1 - 3]) if (x >= 0 && x < 75) p.put(x, -1, z0 + 2, '#49443c', 'steel');
    }
  }
}

function ceiling(p, style) {
  const palette = STYLES[style];
  p.box(0, 5, 0, 75, 7, 75, mix(palette.plaster, '#e9dfcb', 0.3));
  for (let row = 0; row < 6; row++) {
    p.box(0, 4, row * 13, 75, 5, Math.min(75, row * 13 + 12), mix(palette.wood, '#c5ac89', 0.46), 'wood');
  }
  for (const x of [0, 35, 71]) {
    p.box(x, 0, 0, x + 4, 5, 75, palette.wood, 'wood');
    p.box(x, 0, 0, x + 4, 2, 5, '#5c5147', 'steel');
    p.box(x, 0, 70, x + 4, 2, 75, '#5c5147', 'steel');
  }
  p.box(0, 0, 0, 75, 4, 3, palette.trim, 'wood');
  p.box(0, 0, 72, 75, 4, 75, palette.trim, 'wood');
}

function roofHeight(x) {
  return Math.floor(Math.min(x + 3, 77 - x) * 0.8) + 2;
}

function roof(p, style) {
  const palette = STYLES[style];
  // A hollow pitched shell: only the tile skin and gable ends contain voxels.
  for (let x = -3; x < 78; x++) {
    const y = roofHeight(x);
    for (let z = -3; z < 78; z++) {
      const seed = hash(Math.floor((z + (Math.floor(x / 7) % 2) * 4) / 9), Math.floor(x / 7), 101);
      const tone = seed % 4093 / 4093;
      const color = mix(palette.roof, tone < 0.5 ? palette.roofDark : palette.roofLight, Math.abs(tone - 0.5) * 1.5);
      p.box(x, y, z, x + 1, y + 3, z + 1, color, 'ceramic');
      if (x >= 0 && x < 75 && ((z >= 0 && z < 2) || (z >= 73 && z < 75))) p.box(x, 0, z, x + 1, y, z + 1, palette.plaster);
    }
    // Dark bargeboards trace the stepped slope on the two gables.
    for (const z of [-2, 76]) p.box(x, Math.max(0, y - 2), z, x + 1, y + 1, z + 1, palette.wood, 'wood');
  }
  for (let z = -3; z < 78; z += 8) p.box(35, 34, z, 40, 37, Math.min(78, z + 7), mix(palette.roof, palette.roofLight, 0.3), 'ceramic');
  for (const x of [0, 72]) p.box(x, 0, 0, x + 3, 3, 75, palette.wood, 'wood');
  for (const z of [0, 73]) {
    p.box(35, 0, z, 40, 32, z + 2, palette.wood, 'wood');
    p.box(0, 0, z, 75, 3, z + 2, palette.wood, 'wood');
    // An attic vent sits below the ridge in each gable.
    p.box(29, 8, z, 35, 17, z + 2, '#343e41');
    for (const y of [8, 12, 16]) p.box(29, y, z, 35, y + 1, z + 2, palette.trim, 'wood');
  }
  // The chimney has a hollow mouth and a broad weathered sandstone cap.
  for (let y = 14; y < 47; y++) for (let x = 52; x < 63; x++) for (let z = 43; z < 55; z++) {
    if (x > 53 && x < 61 && z > 44 && z < 53 && y > 41) continue;
    const mortar = y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 4) % 9 === 0;
    p.put(x, y, z, mortar ? '#8c8579' : mix('#9a6655', '#c18a66', hash(Math.floor(x / 6), Math.floor(y / 5), 109) % 100 / 180));
  }
  p.box(54, 41, 45, 61, 42, 53, '#272b2a');
  for (let x = 51; x < 64; x++) for (let z = 42; z < 56; z++) {
    if (x >= 54 && x < 61 && z >= 45 && z < 53) continue;
    p.box(x, 47, z, x + 1, 50, z + 1, '#beb7a4');
  }
}

const BUILDERS = Object.freeze({ wall, door, floor, ceiling, roof });

export function assembleBuildingModel(kind, style = 'timber', stories = 1) {
  if (!BUILDING_KINDS.includes(kind)) throw new Error(`Unknown building kind: ${kind}`);
  if (!BUILDING_STYLES.includes(style)) throw new Error(`Unknown building style: ${style}`);
  if (!Number.isInteger(stories) || stories < 1 || stories > 3) throw new Error('Building stories must be an integer from 1 to 3.');
  const key = `${kind}:${style}:${stories}`;
  if (cache.has(key)) return cache.get(key);
  const p = painter();
  BUILDERS[kind](p, style, stories);
  const voxels = Object.freeze([...p.cells.values()].map(Object.freeze));
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const voxel of voxels) for (const axis of ['x', 'y', 'z']) {
    min[axis] = Math.min(min[axis], voxel[axis]);
    max[axis] = Math.max(max[axis], voxel[axis] + 1);
  }
  const bounds = Object.freeze({ min: Object.freeze(min), max: Object.freeze(max) });
  const dimensions = Object.freeze(Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, max[axis] - min[axis]])));
  const model = Object.freeze({ kind, style, stories, voxels, bounds, dimensions });
  cache.set(key, model);
  return model;
}
