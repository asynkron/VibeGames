import { OBJECT_DEFINITIONS } from '../worldObjects.js';
import { defineVoxelPart, createCharacterRecipe, assembleVoxelCharacter } from './voxelParts.js';

export const VOXEL_OBJECT_KINDS = Object.freeze(Object.keys(OBJECT_DEFINITIONS));

const PAINT = Object.freeze({
  oak: ['#925c35', 'wood'], honey: ['#ba8050', 'wood'], grain: ['#704326', 'wood'],
  darkWood: ['#4c3227', 'wood'], edge: ['#cb9961', 'wood'],
  iron: ['#394655', 'steel'], ironLight: ['#70828e', 'steel'], brass: ['#d1a34f', 'gold'],
  bronze: ['#886535', 'gold'], gold: ['#f0c876', 'gold'],
  terra: ['#ae583e', 'stone'], clay: ['#d48059', 'stone'], earth: ['#392b28', 'stone'],
  leaf: ['#438650', 'cloth'], leafLight: ['#76b467', 'cloth'], leafDark: ['#24573e', 'cloth'],
  stone: ['#879397', 'stone'], stoneLight: ['#b4bfb9', 'stone'], stoneDark: ['#5e6a70', 'stone'],
  moss: ['#63794b', 'stone'], ivory: ['#e3d8ba', 'bone'],
  red: ['#9c3e47', 'cloth'], blue: ['#416584', 'cloth'], green: ['#4e7565', 'cloth'],
  purple: ['#77557d', 'cloth'], teal: ['#388891', 'stone'], turquoise: ['#63b4b3', 'stone'],
  ember: ['#d84420', 'flame'], fire: ['#ff8e37', 'flame'], light: ['#ffe6a3', 'flame'],
});

// Coordinates describe voxel corners, with the floor at y=0 and the front at +z.
// Props share the character voxel size; their silhouettes fit one combat cell.
function painter() {
  const cells = new Map();
  function put(x, y, z, surface) {
    const [color, material] = PAINT[surface];
    cells.set(`${x},${y},${z}`, { x, y, z, color, material });
  }
  function shape(min, max, inside, surface) {
    for (let x = Math.ceil(min[0] - 0.5); x < max[0] - 0.5; x++) {
      for (let y = Math.ceil(min[1] - 0.5); y < max[1] - 0.5; y++) {
        for (let z = Math.ceil(min[2] - 0.5); z < max[2] - 0.5; z++) {
          if (inside(x + 0.5, y + 0.5, z + 0.5)) put(x, y, z, surface);
        }
      }
    }
  }
  function box(min, max, surface) { shape(min, max, () => true, surface); }
  function oval(center, radii, surface) {
    shape(center.map((v, i) => v - radii[i]), center.map((v, i) => v + radii[i]),
      (x, y, z) => [x, y, z].reduce((sum, v, i) => sum + ((v - center[i]) / radii[i]) ** 2, 0) <= 1, surface);
  }
  function cylinder(y0, y1, radius, surface, inner = 0) {
    shape([-radius, y0, -radius], [radius, y1, radius], (x, y, z) => {
      const r2 = x * x + z * z;
      return r2 <= radius * radius && r2 >= inner * inner;
    }, surface);
  }
  function beam(a, b, radius, surface) {
    const delta = b.map((v, i) => v - a[i]);
    const length2 = delta.reduce((sum, v) => sum + v * v, 0);
    shape(a.map((v, i) => Math.min(v, b[i]) - radius), a.map((v, i) => Math.max(v, b[i]) + radius), (x, y, z) => {
      const point = [x - a[0], y - a[1], z - a[2]];
      const t = Math.max(0, Math.min(1, point.reduce((sum, v, i) => sum + v * delta[i], 0) / length2));
      return point.reduce((sum, v, i) => sum + (v - delta[i] * t) ** 2, 0) <= radius * radius;
    }, surface);
  }
  return { cells, put, box, oval, cylinder, beam };
}

function chest(p) {
  for (const x of [-7, 5]) for (const z of [-5, 3]) p.box([x, 0, z], [x + 2, 3, z + 2], 'darkWood');
  p.box([-8, 2, -5], [8, 8, 5], 'oak');
  for (let y = 2; y < 8; y++) for (const z of [-5, 4]) {
    p.box([-8, y, z], [8, y + 1, z + 1], y % 3 === 0 ? 'grain' : 'honey');
  }
  for (let y = 8; y < 13; y++) {
    const depth = [5, 5, 4, 3, 1][y - 8];
    p.box([-8, y, -depth], [8, y + 1, depth], y % 2 ? 'honey' : 'oak');
    for (const x of [-6, 4]) p.box([x, y, -depth], [x + 2, y + 1, depth], 'iron');
  }
  for (const x of [-6, 4]) {
    for (const z of [-6, 5]) {
      p.box([x, 2, z], [x + 2, 8, z + 1], 'iron');
      for (const y of [3, 6]) p.put(x, y, z, 'ironLight');
    }
  }
  p.box([-8, 7, 5], [8, 8, 6], 'darkWood');
  p.box([-2, 6, 5], [2, 10, 6], 'brass');
  p.box([-1, 6, 6], [1, 8, 7], 'gold');
  p.put(0, 7, 7, 'iron');
}

function chair(p) {
  for (const x of [-5, 3]) for (const z of [-5, 3]) p.box([x, 0, z], [x + 2, 8, z + 2], 'darkWood');
  p.box([-5, 3, -4], [5, 4, -3], 'oak');
  for (const x of [-5, 4]) p.box([x, 3, -4], [x + 1, 4, 5], 'oak');
  p.box([-6, 7, -5], [6, 9, 6], 'edge');
  p.box([-5, 9, -4], [5, 10, 5], 'red');
  for (const x of [-5, 3]) p.box([x, 8, -5], [x + 2, 20, -3], 'oak');
  for (const x of [-2, 1]) p.box([x, 11, -5], [x + 1, 18, -4], 'honey');
  p.box([-5, 17, -5], [5, 20, -3], 'honey');
  p.box([-3, 18, -3], [3, 19, -2], 'grain');
  p.put(-1, 18, -2, 'brass');
}

function table(p) {
  for (const x of [-9, 7]) for (const z of [-6, 4]) {
    p.box([x, 0, z], [x + 2, 12, z + 2], 'darkWood');
    p.box([x, 1, z], [x + 2, 3, z + 2], 'oak');
  }
  p.box([-9, 9, -6], [9, 12, 6], 'grain');
  p.box([-11, 12, -8], [11, 14, 8], 'oak');
  for (let z = -7; z < 8; z += 3) p.box([-10, 13, z], [10, 14, z + 2], z % 2 ? 'honey' : 'edge');
  p.box([-3, 14, -8], [1, 15, 8], 'green');
  p.box([-3, 10, 7], [1, 14, 8], 'green');
  p.oval([5, 14.5, 2], [3, 0.7, 3], 'ivory');
  p.box([-7, 14, -4], [-5, 17, -2], 'brass');
  p.box([-7, 17, -4], [-5, 18, -2], 'darkWood');
  p.box([3, 14, -5], [7, 15, -3], 'red');
}

function pottedPlant(p) {
  p.cylinder(0, 1, 4, 'terra');
  for (let y = 1; y < 8; y++) p.cylinder(y, y + 1, 3.3 + y * 0.3, y < 3 ? 'terra' : 'clay', y > 5 ? 4 : 0);
  p.cylinder(7, 9, 6, 'terra', 4.6);
  p.cylinder(7, 8, 4.6, 'earth');
  p.beam([0, 8, 0], [0, 21, 0], 0.8, 'leafDark');
  for (let branch = 0; branch < 7; branch++) {
    const angle = branch * Math.PI * 2 / 7;
    const reach = branch % 2 ? 9 : 7;
    const tip = [Math.cos(angle) * reach, 16 + branch % 3 * 2, Math.sin(angle) * reach];
    p.beam([0, 10 + branch % 3, 0], tip, 0.75, 'leafDark');
    for (let step = 1; step <= 3; step++) {
      const t = step / 3;
      p.oval([tip[0] * t, 12 + (tip[1] - 12) * t, tip[2] * t], [2.2, 1, 2.2], (branch + step) % 3 ? 'leaf' : 'leafLight');
    }
  }
  p.oval([0, 21, 0], [2, 3, 2], 'leafLight');
}

function lamp(p) {
  p.cylinder(0, 2, 5, 'iron');
  p.cylinder(2, 4, 3, 'bronze');
  p.box([-1, 3, -1], [1, 22, 1], 'iron');
  for (const y of [6, 17, 20]) p.box([-2, y, -2], [2, y + 1, 2], 'brass');
  p.box([-4, 21, -4], [4, 23, 4], 'bronze');
  p.box([-3, 23, -3], [3, 28, 3], 'light');
  for (const x of [-4, 3]) for (const z of [-4, 3]) p.box([x, 22, z], [x + 1, 29, z + 1], 'iron');
  p.box([-5, 28, -5], [5, 29, 5], 'iron');
  p.box([-4, 29, -4], [4, 30, 4], 'bronze');
  p.box([-3, 30, -3], [3, 31, 3], 'brass');
  p.box([-2, 31, -2], [2, 32, 2], 'bronze');
  p.box([-1, 32, -1], [1, 34, 1], 'gold');
}

function barrel(p) {
  for (let y = 0; y < 15; y++) {
    const radius = 4.7 + Math.sin((y + 0.5) / 15 * Math.PI) * 1.8;
    p.cylinder(y, y + 1, radius, [2, 3, 11, 12].includes(y) ? 'iron' : 'oak');
  }
  for (const cell of [...p.cells.values()]) {
    if (cell.material !== 'wood') continue;
    const angle = Math.atan2(cell.z + 0.5, cell.x + 0.5);
    const stave = Math.floor((angle + Math.PI) / Math.PI * 8);
    p.put(cell.x, cell.y, cell.z, stave % 3 === 0 ? 'grain' : stave % 2 ? 'honey' : 'oak');
  }
  p.cylinder(14, 15, 4.5, 'honey');
  for (const z of [-2, 1]) p.box([-4, 14, z], [4, 15, z + 1], 'grain');
  p.box([-1, 6, 6], [1, 8, 8], 'brass');
  p.box([-2, 8, 7], [2, 9, 8], 'darkWood');
}

function statue(p) {
  p.box([-9, 0, -8], [9, 2, 8], 'stoneDark');
  p.box([-8, 2, -7], [8, 4, 7], 'stoneLight');
  p.box([-6, 4, -5], [6, 5, 5], 'stone');
  for (const x of [-5, 1]) {
    p.box([x, 5, -2], [x + 4, 8, 5], 'stoneDark');
    p.box([x, 8, -2], [x + 4, 17, 2], 'stone');
    p.box([x, 12, 2], [x + 4, 14, 3], 'stoneLight');
  }
  p.oval([0, 20, 0], [6, 6, 4], 'stone');
  p.box([-5, 22, 3], [5, 24, 4], 'stoneLight');
  p.box([-5, 16, -3], [5, 18, 4], 'stoneDark');
  p.box([-1, 16, 4], [1, 18, 5], 'stoneLight');
  for (const side of [-1, 1]) {
    p.oval([side * 6, 23, 0], [2.5, 2.5, 3], 'stoneLight');
    p.beam([side * 6, 22, 0], [side * 5, 18, 3], 1.8, 'stone');
    p.beam([side * 5, 18, 3], [side, 18, 5], 1.8, 'stoneLight');
  }
  p.box([-2, 25, -2], [2, 28, 2], 'stoneDark');
  p.oval([0, 30, 0], [4, 4, 3.5], 'stone');
  p.box([-3, 29, 3], [3, 30, 4], 'stoneDark');
  p.box([-1, 29, 3], [1, 34, 4], 'stoneLight');
  p.box([-1, 6, 5], [1, 20, 6], 'stoneLight');
  p.box([-4, 17, 5], [4, 18, 6], 'stoneDark');
  p.box([-1, 20, 5], [1, 21, 6], 'stoneDark');
  p.box([-8, 2, -6], [-5, 4, -3], 'moss');
  p.box([4, 4, -4], [6, 5, -2], 'moss');
}

function crate(p) {
  p.box([-7, 0, -6], [7, 12, 6], 'grain');
  for (const z of [-7, 6]) {
    for (let x = -7; x < 7; x += 3) p.box([x, 1, z], [Math.min(x + 2, 7), 11, z + 1], 'honey');
    for (const y of [0, 10]) p.box([-7, y, z], [7, y + 2, z + 1], 'oak');
    for (let i = 0; i < 10; i++) p.box([-5 + i, 1 + i, z], [-3 + i, 2 + i, z + 1], 'edge');
    for (const x of [-6, 5]) for (const y of [1, 10]) p.put(x, y, z, 'iron');
  }
  for (const x of [-7, 6]) for (const z of [-5, 3]) p.box([x, 0, z], [x + 1, 12, z + 2], 'oak');
  for (let x = -7; x < 7; x += 3) p.box([x, 11, -6], [Math.min(x + 2, 7), 12, 6], 'honey');
}

function bookshelf(p) {
  p.box([-9, 0, -5], [9, 2, 5], 'darkWood');
  p.box([-9, 2, -5], [9, 27, -3], 'grain');
  for (const x of [-10, 8]) p.box([x, 1, -5], [x + 2, 28, 5], 'oak');
  for (const y of [2, 10, 18, 26]) {
    p.box([-10, y, -5], [10, y + 1, 5], 'honey');
    p.box([-10, y, 4], [10, y + 1, 5], 'edge');
  }
  p.box([-11, 27, -5], [11, 29, 5], 'darkWood');
  p.box([-10, 28, -5], [10, 29, 5], 'honey');
  const colors = ['red', 'blue', 'green', 'purple', 'darkWood'];
  for (let row = 0; row < 3; row++) for (let book = 0; book < 7; book++) {
    const x = -7 + book * 2;
    const y = 3 + row * 8;
    const height = 4 + (book + row * 2) % 3;
    p.box([x, y, -3], [x + 2, y + height, 3], colors[(book + row) % colors.length]);
    p.box([x, y + height - 1, -2], [x + 2, y + height, 2], 'ivory');
    p.put(x, y + 1, 3, 'brass');
    if (height > 4) p.put(x, y + height - 2, 3, 'brass');
  }
}

function brazier(p) {
  for (const x of [-4, 2]) for (const z of [-4, 2]) {
    p.box([x, 0, z], [x + 2, 8, z + 2], 'iron');
    p.box([x, 0, z], [x + 3, 1, z + 2], 'bronze');
  }
  for (let y = 6; y < 12; y++) p.cylinder(y, y + 1, 3 + (y - 6) * 0.65, 'iron', Math.max(0, y - 7));
  p.cylinder(11, 12, 6.5, 'brass', 5.1);
  p.cylinder(10, 11, 4.5, 'ember');
  for (const [x, z, height] of [[-3, 0, 6], [2, 2, 8], [1, -2, 5], [-1, 1, 10]]) {
    p.oval([x, 12, z], [2, 3, 2], 'ember');
    p.beam([x, 12, z], [x + 1, 11 + height, z], 1.2, 'fire');
    p.beam([x, 12, z + 1], [x, 9 + height, z + 1], 0.7, 'light');
  }
}

function bench(p) {
  for (const x of [-8, 6]) {
    p.box([x, 0, -4], [x + 2, 8, 4], 'darkWood');
    p.box([x - 1, 0, -5], [x + 3, 1, 5], 'oak');
  }
  p.box([-8, 3, -1], [8, 5, 1], 'oak');
  p.box([-11, 8, -5], [11, 10, 5], 'oak');
  for (const z of [-4, -1, 2]) p.box([-10, 9, z], [10, 10, z + 2], 'honey');
  for (const x of [-8, 7]) for (const z of [-3, 3]) p.put(x, 9, z, 'iron');
  p.box([3, 10, -5], [8, 11, 5], 'blue');
  p.box([3, 7, 4], [8, 10, 5], 'blue');
}

function urn(p) {
  p.cylinder(0, 2, 3.5, 'bronze');
  for (let y = 2; y < 16; y++) {
    const radius = y < 11 ? 3.5 + Math.sin((y - 2) / 10 * Math.PI) * 2.7 : y < 14 ? 3 : 4;
    p.cylinder(y, y + 1, radius, y === 5 || y === 11 || y === 15 ? 'brass' : y % 4 === 0 ? 'turquoise' : 'teal', y >= 14 ? 2.5 : 0);
  }
  p.cylinder(14, 15, 2.5, 'earth');
  for (const side of [-1, 1]) {
    p.beam([side * 4, 12, 0], [side * 7, 12, 0], 1, 'bronze');
    p.beam([side * 7, 12, 0], [side * 7, 8, 0], 1, 'brass');
    p.beam([side * 7, 8, 0], [side * 5, 7, 0], 1, 'bronze');
  }
}

const BUILDERS = Object.freeze({ chest, chair, table, pottedPlant, lamp, barrel, statue, crate, bookshelf, brazier, bench, urn });
const MODELS = new Map();

/** Cached, immutable voxel geometry shared by exploration and combat scenery. */
export function assembleVoxelObjectModel(kind) {
  if (!Object.hasOwn(OBJECT_DEFINITIONS, kind) || !Object.hasOwn(BUILDERS, kind)) throw new RangeError(`Unknown voxel object: ${kind}.`);
  if (!MODELS.has(kind)) {
    const p = painter();
    BUILDERS[kind](p);
    const part = defineVoxelPart({ id: `object:${kind}`, name: OBJECT_DEFINITIONS[kind].name, voxels: [...p.cells.values()] });
    const parts = new Map([[part.id, part]]);
    const recipe = createCharacterRecipe({ id: `object:${kind}`, parts: { torso: { partId: part.id } } });
    const assembly = assembleVoxelCharacter(recipe, parts);
    const lightAnchor = kind === 'lamp' ? Object.freeze([0, 25, 0]) : kind === 'brazier' ? Object.freeze([0, 14, 0]) : undefined;
    MODELS.set(kind, Object.freeze({ recipe, assembly, parts, appearance: Object.freeze({ form: kind }), scale: 1,
      itemEffects: Object.freeze([]), ...(lightAnchor ? { lightAnchor } : {}) }));
  }
  return MODELS.get(kind);
}
