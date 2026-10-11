// Natural terrain shares the 75-voxel room tile with masonry, figures and objects.
// Floors stay below the walk plane; relief comes from recessed, connected surfaces.
const cache = new Map();
const ENVIRONMENTS = ['cave', 'forest', 'village'];
const KINDS = ['wall', 'door', 'floor', 'ceiling'];

function hash(x, y, seed) {
  let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263) ^ Math.imul(seed + 9, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function painter() {
  const cells = new Map();
  function put(x, y, z, color, material = 'stone') {
    cells.set(`${x},${y},${z}`, { x, y, z, color, material });
  }
  function box(x0, y0, z0, x1, y1, z1, color, material = 'stone') {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) put(x, y, z, color, material);
  }
  return { cells, put, box };
}

function caveWall(p, variant) {
  const strata = ['#827f80', '#98918b', '#706f77', '#b0a69b', '#8c939a', '#a5a29a', '#777982', '#aaa091'];
  for (let x = 0; x < 75; x++) {
    for (let y = 0; y < 75; y++) {
      // Tilted strata and broad, smooth fractures make continuous bedrock, not courses.
      const bend = Math.floor(Math.sin((x + variant * 9) / 14) * 3);
      const layerY = y + Math.floor(x / 11) + bend;
      const layer = Math.floor((layerY + variant * 3) / 9);
      const ridge = Math.sin(x / 9 + variant) + Math.cos(y / 13 - x / 21);
      const depth = 3 + (ridge > 0.5 ? 2 : ridge > -0.8 ? 1 : 0);
      const fracture = (x + Math.floor(y / 4) + variant * 17) % 43 < 2;
      const quartz = (layerY + variant * 7) % 38 === 0;
      const damp = y < 13 && Math.sin(x / 9 + variant) > -0.3;
      const color = quartz ? '#c0b8a2' : fracture ? '#565e68' : damp ? '#657575' : strata[layer % strata.length];
      const face = fracture ? Math.max(2, depth - 2) : depth;
      p.box(x, y, -face, x + 1, y + 1, face, color);
    }
  }
}

function caveOpeningHeight(x) {
  if (x < 4 || x >= 71) return 0;
  const edge = Math.min(x - 4, 70 - x);
  return edge < 7 ? 60 : edge < 16 ? 64 : edge < 25 ? 68 : 70;
}

function caveDoor(p, variant) {
  caveWall(p, variant);
  for (const [key, voxel] of p.cells) {
    const opening = caveOpeningHeight(voxel.x);
    if (voxel.y < opening) p.cells.delete(key);
    else if (opening && voxel.y < opening + 2) p.put(voxel.x, voxel.y, voxel.z, '#b0a496');
  }
}

function caveFloor(p, variant) {
  p.box(0, -4, 0, 75, -1, 75, '#66666a');
  const colors = ['#8d8c85', '#a2998a', '#78868c', '#95938f', '#747878'];
  for (let x = 0; x < 75; x++) for (let z = 0; z < 75; z++) {
    const wave = Math.sin((x + variant * 13) / 15) + Math.cos((z - x * 0.35) / 13);
    const band = Math.min(4, Math.max(0, Math.floor((wave + 2) * 1.24)));
    const crack = (z + Math.floor(x / 3) + variant * 7) % 51 === 0;
    if (!crack) p.put(x, -1, z, colors[band]);
  }
  for (let patch = 0; patch < 5; patch++) {
    const seed = hash(patch, variant, 21);
    const x0 = 5 + seed % 61;
    const z0 = 5 + (seed >>> 9) % 61;
    for (let dx = -4; dx < 5; dx++) for (let dz = -3; dz < 4; dz++) {
      if (dx * dx + dz * dz * 2 > 17) continue;
      p.put(x0 + dx, -1, z0 + dz, patch % 2 ? '#777d66' : '#ada696');
    }
  }
}

function caveCeiling(p, variant) {
  // Periodic diagonal folds continue through neighboring tiles without perimeter ribs.
  // Variant deformation fades smoothly at seams, retaining the same rock profile there.
  p.box(0, 11, 0, 75, 14, 75, '#696d78');
  for (let x = 0; x < 75; x++) for (let z = 0; z < 75; z++) {
    const u = x / 74;
    const v = z / 74;
    const turn = Math.PI * 2;
    const fold = Math.sin(turn * (u + v) + 0.7) * 2.2
      + Math.cos(turn * (2 * u - v) - 1.3) * 1.6
      + Math.sin(turn * (u + 2 * v) + 2.1);
    const interior = Math.sin(Math.PI * u) ** 2 * Math.sin(Math.PI * v) ** 2;
    const deformation = interior * Math.sin(u * 9 + v * 7 + variant * 2.4) * 2;
    const underside = Math.max(1, Math.min(10, Math.round(5 + fold + deformation)));
    const mineral = Math.sin(turn * (u - v) + 0.4) + Math.cos(turn * (u + 2 * v) + 0.6);
    const color = mineral > 0.85 ? '#95948e' : mineral < -0.85 ? '#737d88' : '#858a8c';
    for (let y = underside; y < 11; y++) p.put(x, y, z, color);
  }
  for (let point = 0; point < 1 + variant % 2; point++) {
    const seed = hash(point, variant, 47);
    const cx = 11 + seed % 52;
    const cz = 11 + (seed >>> 10) % 52;
    const tip = point % 2 ? 2 : 0;
    for (let y = tip; y < 11; y++) {
      const radius = 1 + Math.floor((y - tip) / 3);
      for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue;
        const drift = Math.floor((y - tip) / 5);
        p.put(cx + dx + drift, y, cz + dz, y < tip + 3 ? '#b6ad96' : '#96968c');
      }
    }
  }
}

function forestFloor(p, variant) {
  p.box(0, -4, 0, 75, -1, 75, '#5a4937');
  const soil = ['#867055', '#9a8160', '#ae9570'];
  for (let x = 0; x < 75; x++) for (let z = 0; z < 75; z++) {
    // Broad patches of worn earth weave through grass and moss with no raised obstacles.
    const organic = Math.sin((x + variant * 17) / 12) + Math.cos((z + variant * 9) / 15) + Math.sin((x + z) / 19);
    const damp = Math.sin(x / 21 - z / 17 + variant) > 0;
    const grass = organic > 0.15;
    const color = grass ? organic > 1.5 ? '#859951' : damp ? '#687e42' : '#718b4f' : soil[organic < -1 ? 0 : damp ? 1 : 2];
    p.put(x, -1, z, color, grass ? 'foliage' : 'stone');
  }
  for (let leaf = 0; leaf < 18; leaf++) {
    const seed = hash(leaf, variant, 61);
    const x = 3 + seed % 68;
    const z = 3 + (seed >>> 10) % 68;
    p.box(x, -1, z, x + 2 + seed % 2, 0, z + 1, leaf % 3 ? '#b29057' : '#bd7244', 'foliage');
  }
}

function forestWall(p, variant) {
  for (let x = 0; x < 75; x++) {
    const earthHeight = 11 + Math.round(Math.sin(x / 8 + variant) * 3);
    const crown = 29 + Math.round(Math.sin(x / 6 + variant) * 5 + Math.cos(x / 13) * 4);
    for (let y = 0; y < crown; y++) {
      const depth = y < earthHeight ? 4 : y > crown - 3 ? 2 : 5;
      const soil = y < earthHeight - 3;
      const shade = y > crown - 5 ? '#8f9f5d' : y < 18 ? '#435f3f' : Math.sin(x / 11) > 0 ? '#637e48' : '#728a4b';
      p.box(x, y, -depth, x + 1, y + 1, depth, soil ? '#76644c' : shade, soil ? 'stone' : 'foliage');
    }
  }
  for (let stem = 0; stem < 7; stem++) {
    const x = 4 + stem * 11;
    p.box(x, 3, -3, x + 1, 22 + stem % 4, 3, '#7f6d47', 'wood');
  }
}

function forestDoor(p, variant) {
  forestWall(p, variant);
  for (const [key, voxel] of p.cells) if (voxel.x >= 4 && voxel.x < 71) p.cells.delete(key);
}

function villageFloor(p, variant) {
  p.box(0, -4, 0, 75, -1, 75, '#726b62');
  const colors = ['#a69e90', '#bec0b7', '#8f9da0', '#b6a591', '#97998f', '#c2b5a3', '#8b8884'];
  for (let row = 0; row < 8; row++) {
    for (let column = -1; column < 7; column++) {
      const x0 = column * 13 + (row % 2 ? 6 : 0);
      const z0 = row * 10;
      const seed = hash(column, row, variant + 71);
      const color = colors[seed % colors.length];
      for (let x = Math.max(0, x0 + 1); x < Math.min(75, x0 + 12); x++) {
        for (let z = z0 + 1; z < Math.min(75, z0 + 9); z++) {
          const corner = (x === x0 + 1 || x === x0 + 11) && (z === z0 + 1 || z === z0 + 8);
          if (!corner) p.put(x, -1, z, color);
        }
      }
    }
  }
}

function villageWall(p, variant) {
  p.box(0, 0, -2, 75, 26, 2, '#747873');
  const colors = ['#a8aca1', '#c0bbaa', '#8e9b9b', '#b5af9f', '#989a90'];
  for (let row = 0; row < 3; row++) for (let column = -1; column < 5; column++) {
    const x0 = Math.max(0, column * 20 + (row % 2 ? 10 : 0));
    const x1 = Math.min(75, column * 20 + (row % 2 ? 10 : 0) + 19);
    if (x1 <= x0) continue;
    p.box(x0, row * 8 + 1, -4, x1, row * 8 + 8, 4, colors[hash(column, row, variant) % colors.length]);
  }
  p.box(0, 25, -5, 75, 28, 5, '#b9b7a8');
  p.box(0, 28, -4, 75, 29, 4, '#cecab6');
}

function villageDoor(p, variant) {
  villageWall(p, variant);
  for (const [key, voxel] of p.cells) if (voxel.x >= 4 && voxel.x < 71) p.cells.delete(key);
}

const BUILDERS = {
  cave: { wall: caveWall, door: caveDoor, floor: caveFloor, ceiling: caveCeiling },
  forest: { wall: forestWall, door: forestDoor, floor: forestFloor, ceiling() {} },
  village: { wall: villageWall, door: villageDoor, floor: villageFloor, ceiling() {} },
};

export function assembleLandscapeModel(environment, kind, variant = 0) {
  if (!ENVIRONMENTS.includes(environment)) throw new RangeError(`Unknown landscape environment: ${environment}.`);
  if (!KINDS.includes(kind)) throw new RangeError(`Unknown landscape kind: ${kind}.`);
  if (!Number.isInteger(variant) || variant < 0 || variant > 3) throw new RangeError('Landscape variant must be an integer from 0 to 3.');
  const key = `${environment}:${kind}:${variant}`;
  if (cache.has(key)) return cache.get(key);
  const p = painter();
  BUILDERS[environment][kind](p, variant);
  const voxels = Object.freeze([...p.cells.values()].map(Object.freeze));
  const min = { x: 0, y: 0, z: 0 };
  const max = { x: 0, y: 0, z: 0 };
  if (voxels.length) {
    for (const axis of ['x', 'y', 'z']) {
      min[axis] = Infinity;
      max[axis] = -Infinity;
      for (const voxel of voxels) {
        min[axis] = Math.min(min[axis], voxel[axis]);
        max[axis] = Math.max(max[axis], voxel[axis] + 1);
      }
    }
  }
  const bounds = Object.freeze({ min: Object.freeze(min), max: Object.freeze(max) });
  const dimensions = Object.freeze(Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, max[axis] - min[axis]])));
  const model = Object.freeze({ environment, kind, variant, voxels, bounds, dimensions });
  cache.set(key, model);
  return model;
}
