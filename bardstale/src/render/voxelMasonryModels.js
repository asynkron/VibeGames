// Masonry uses the same physical voxel size as figures and furnishings.
// Coordinates identify voxel corners; bounds are inclusive at min, exclusive at max.
export const MASONRY_VOXELS_PER_TILE = 75;
export const MASONRY_WALL_HALF_DEPTH = 3;
export const MASONRY_KINDS = Object.freeze(['wall', 'floor', 'ceiling', 'door']);

const MORTAR = '#555458';
const cache = new Map();

function hash(x, y, seed) {
  let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263) ^ Math.imul(seed + 9, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function mixRgb(first, second, amount) {
  const a = Number.parseInt(first.slice(1), 16);
  const b = Number.parseInt(second.slice(1), 16);
  let result = 0;
  for (const shift of [16, 8, 0]) {
    const from = (a >>> shift) & 255;
    const to = (b >>> shift) & 255;
    result = (result << 8) | Math.round(from + (to - from) * amount);
  }
  return `#${result.toString(16).padStart(6, '0')}`;
}

// Each block gets its own continuous RGB mineral mix. Large connected areas keep
// the same color so exposed voxel faces can still merge into inexpensive surfaces.
function stoneColor(seed, surface = 'wall') {
  const temperature = (seed & 0xffff) / 0xffff;
  const value = ((seed >>> 16) & 0xff) / 255;
  const cool = surface === 'floor' ? '#929ea9' : surface === 'ceiling' ? '#a0a9b4' : '#b4c0ca';
  const warm = surface === 'floor' ? '#afa293' : surface === 'ceiling' ? '#bab5ab' : '#cbc1ad';
  const mineral = mixRgb(cool, warm, temperature);
  return mixRgb(mineral, value < 0.5 ? '#505964' : '#eee5d4', Math.abs(value - 0.5) * 0.34);
}

function painter() {
  const cells = new Map();
  function put(x, y, z, color) {
    cells.set(`${x},${y},${z}`, { x, y, z, color, material: 'stone' });
  }
  function box(x0, y0, z0, x1, y1, z1, color) {
    for (let x = x0; x < x1; x++) {
      for (let y = y0; y < y1; y++) {
        for (let z = z0; z < z1; z++) put(x, y, z, color);
      }
    }
  }
  return { cells, put, box };
}

function wall(p, variant) {
  // A continuous stone core prevents light leaking through recessed mortar.
  p.box(0, 0, -1, 75, 75, 1, MORTAR);
  for (let course = 0; course < 6; course++) {
    const y0 = course * 12 + 1;
    const y1 = Math.min(y0 + 11, 72);
    const offset = course % 2 ? -13 : 0;
    for (let column = 0; column < 4; column++) {
      const rawX = offset + column * 25;
      const x0 = Math.max(0, rawX + 1);
      const x1 = Math.min(75, rawX + 25);
      if (x0 >= x1) continue;
      const seed = hash(column, course, variant);
      const color = stoneColor(seed);
      const dampColor = mixRgb(color, '#596b67', 0.3 + (seed % 11) / 60);
      const mossColor = mixRgb(color, '#6c7650', 0.52);
      const depth = MASONRY_WALL_HALF_DEPTH - (seed % 3 === 0 ? 0 : 1);
      for (let x = x0; x < x1; x++) {
        for (let y = y0; y < y1; y++) {
          const edge = Math.min(x - x0, x1 - x - 1, y - y0, y1 - y - 1);
          // Small stepped chamfers expose the darker joint and catch torchlight.
          let face = depth - (edge === 0 ? 2 : edge === 1 ? 1 : 0);
          const pitX = x0 + 3 + seed % Math.max(1, x1 - x0 - 6);
          const pitY = y0 + 3 + (seed >>> 8) % 4;
          if (seed % 4 === 0 && Math.abs(x - pitX) + Math.abs(y - pitY) < 2) face = Math.max(1, face - 1);
          const damp = course < 2 && seed % 3 === 1 && y < y0 + 3 && x < x0 + 9;
          const moss = course === 0 && seed % 5 === 1 && x < x0 + 5 && y < y0 + 2;
          const faceColor = moss ? mossColor : damp ? dampColor : color;
          for (let z = -face; z < face; z++) p.put(x, y, z, faceColor);
        }
      }
    }
  }
  // Low plinth and a solid cornice close the wall ends and make its thickness visible.
  p.box(0, 0, -MASONRY_WALL_HALF_DEPTH, 75, 2, MASONRY_WALL_HALF_DEPTH, '#87928f');
  p.box(0, 59, -MASONRY_WALL_HALF_DEPTH, 75, 60, MASONRY_WALL_HALF_DEPTH, '#b8b7ae');
  p.box(0, 72, -2, 75, 73, 2, '#939caa');
  p.box(0, 73, -MASONRY_WALL_HALF_DEPTH, 75, 75, MASONRY_WALL_HALF_DEPTH, '#c1c3bb');
}

function openingHeight(x) {
  if (x < 4 || x >= 71) return 0;
  const fromJamb = Math.min(x - 4, 70 - x);
  if (fromJamb < 7) return 60;
  if (fromJamb < 16) return 64;
  if (fromJamb < 25) return 68;
  return 70;
}

function door(p, variant) {
  wall(p, variant);
  for (const [key, voxel] of p.cells) {
    const { x, y, z } = voxel;
    const top = openingHeight(x);
    if (y < top) {
      p.cells.delete(key);
      continue;
    }
    // Pale voussoirs follow the stepped arch, with substantial square jambs.
    const jamb = x < 4 || x >= 71;
    const arch = top > 0 && y < top + 5;
    if ((jamb && y < 60) || arch) {
      const seed = hash(Math.floor(x / 7), Math.floor(y / 9), variant + 97);
      p.put(x, y, z, mixRgb(stoneColor(seed), '#e5d8bd', 0.26));
    }
  }
  // One protruding keystone ties the crown together on both faces.
  p.box(34, 70, -MASONRY_WALL_HALF_DEPTH, 41, 75, MASONRY_WALL_HALF_DEPTH, '#dbd1bc');
}

function floor(p, variant) {
  p.box(0, -5, 0, 75, -2, 75, '#4b5057');
  for (let row = 0; row < 3; row++) {
    const split = [35, 47, 28][(row + variant) % 3];
    const cuts = [0, split, 75];
    for (let col = 0; col < 2; col++) {
      const x0 = cuts[col];
      const x1 = cuts[col + 1];
      const z0 = row * 25;
      const z1 = z0 + 25;
      const seed = hash(col, row, variant + 19);
      const color = stoneColor(seed, 'floor');
      for (let x = x0; x < x1; x++) {
        for (let z = z0; z < z1; z++) {
          const edge = Math.min(x - x0, x1 - x - 1, z - z0, z1 - z - 1);
          if (edge === 0) continue;
          const chipped = seed % 3 === 0 && x - x0 < 5 && z - z0 < 5 && x - x0 + z - z0 < 7;
          p.put(x, -2, z, color);
          if (!chipped) p.put(x, -1, z, color);
        }
      }
    }
  }
}

function ceiling(p, variant) {
  // A continuous upper slab carries recessed stone panels; four low ribs form a coffer.
  p.box(0, 7, 0, 75, 9, 75, '#5d6470');
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const color = stoneColor(hash(col, row, variant + 41), 'ceiling');
      p.box(col * 25 + 1, 5, row * 25 + 1, col * 25 + 24, 7, row * 25 + 24, color);
    }
  }
  // Half-width perimeter ribs meet exactly with those of the neighboring tile.
  for (let x = 0; x < 75; x++) {
    for (let z = 0; z < 75; z++) {
      const edge = Math.min(x, 74 - x, z, 74 - z);
      if (edge >= 6) continue;
      const underside = edge < 3 ? 0 : edge < 5 ? 2 : 4;
      for (let y = underside; y < 7; y++) p.put(x, y, z, edge < 3 ? '#c0c2b9' : '#98a2ae');
    }
  }
  // A restrained diamond boss gives the underside a carved, medieval rhythm.
  for (let x = 32; x <= 42; x++) {
    for (let z = 32; z <= 42; z++) {
      const distance = Math.abs(x - 37) + Math.abs(z - 37);
      if (distance > 5) continue;
      for (let y = distance <= 2 ? 2 : 3; y < 5; y++) p.put(x, y, z, '#d1c8b6');
    }
  }
}

const BUILDERS = Object.freeze({ wall, floor, ceiling, door });

export function assembleMasonryModel(kind, variant = 0) {
  if (!MASONRY_KINDS.includes(kind)) throw new Error(`Unknown masonry kind: ${kind}`);
  if (!Number.isInteger(variant) || variant < 0 || variant > 3) throw new Error('Masonry variant must be an integer from 0 to 3.');
  const key = `${kind}:${variant}`;
  if (cache.has(key)) return cache.get(key);
  const p = painter();
  BUILDERS[kind](p, variant);
  const voxels = Object.freeze([...p.cells.values()].map(Object.freeze));
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const voxel of voxels) for (const axis of ['x', 'y', 'z']) {
    min[axis] = Math.min(min[axis], voxel[axis]);
    max[axis] = Math.max(max[axis], voxel[axis] + 1);
  }
  const bounds = Object.freeze({ min: Object.freeze(min), max: Object.freeze(max) });
  const dimensions = Object.freeze(Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, max[axis] - min[axis]])));
  const model = Object.freeze({ kind, variant, voxels, bounds, dimensions });
  cache.set(key, model);
  return model;
}
