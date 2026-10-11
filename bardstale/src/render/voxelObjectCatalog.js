import { OBJECT_DEFINITIONS } from '../worldObjects.js';
import { defineVoxelPart, createCharacterRecipe, assembleVoxelCharacter } from './voxelParts.js';
import { NATURE_OBJECT_BUILDERS } from './voxelNatureProps.js';

export const VOXEL_OBJECT_KINDS = Object.freeze(Object.keys(OBJECT_DEFINITIONS));

const PAINT = Object.freeze({
  oak: ['#987048', 'wood'], honey: ['#bb905c', 'wood'], grain: ['#614833', 'wood'],
  darkWood: ['#49372d', 'wood'], edge: ['#d1aa77', 'wood'], walnut: ['#704735', 'wood'],
  walnutLight: ['#956547', 'wood'], walnutEdge: ['#ae8059', 'wood'],
  pine: ['#b8a083', 'wood'], pineLight: ['#d0b797', 'wood'], pineWeathered: ['#999486', 'wood'],
  iron: ['#4c5355', 'steel'], ironLight: ['#929d9b', 'steel'], ironDark: ['#303a3c', 'steel'],
  brass: ['#b69454', 'gold'], bronze: ['#796641', 'gold'], gold: ['#dfc184', 'gold'],
  patina: ['#557d70', 'gold'], rust: ['#945d42', 'steel'],
  terra: ['#a45d43', 'stone'], clay: ['#cc8b64', 'stone'], clayLight: ['#e3b185', 'stone'],
  clayDark: ['#875342', 'stone'], earth: ['#3c3025', 'stone'],
  leaf: ['#4e7848', 'foliage'], leafLight: ['#88ac5c', 'foliage'], leafDark: ['#305f46', 'foliage'],
  leafOlive: ['#718b47', 'foliage'], leafBlue: ['#3e7960', 'foliage'], leafNew: ['#acc873', 'foliage'],
  stem: ['#5f7250', 'wood'],
  stone: ['#aba997', 'stone'], stoneLight: ['#d4d0b9', 'stone'], stoneDark: ['#747e7b', 'stone'],
  moss: ['#647452', 'stone'], lichen: ['#b8b687', 'stone'], ivory: ['#ece0c4', 'bone'],
  pages: ['#d8c69f', 'bone'], charcoal: ['#333330', 'stone'], ash: ['#797567', 'stone'],
  red: ['#883e46', 'cloth'], redLight: ['#b26365', 'cloth'], blue: ['#456b86', 'cloth'],
  blueLight: ['#7498ac', 'cloth'], green: ['#4f8074', 'cloth'], linen: ['#d0bd97', 'cloth'],
  teal: ['#317f79', 'ceramic'], turquoise: ['#7cb9a6', 'ceramic'], glazeDark: ['#285d5c', 'ceramic'],
  glazeLight: ['#a4d0ba', 'ceramic'],
  oxblood: ['#733f3e', 'leather'], indigo: ['#414f6f', 'leather'], sage: ['#5c7560', 'leather'],
  plum: ['#6a4c62', 'leather'], ochre: ['#a38149', 'leather'], parchment: ['#c5b388', 'leather'],
  ember: ['#df542b', 'flame'], fire: ['#ffb24c', 'flame'], light: ['#fff0c3', 'flame'],
});

// Coordinates describe voxel corners, with the mounting origin at y=0 and the front at +z.
// Props share the character voxel size; their silhouettes fit one combat cell.
function painter() {
  const cells = new Map();
  function put(x, y, z, surface) {
    const [color, material] = typeof surface === 'string' ? PAINT[surface] : surface;
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
  p.box([-8, 2, -5], [8, 8, 5], 'walnut');
  for (let y = 2; y < 8; y++) for (const z of [-5, 4]) {
    p.box([-8, y, z], [8, y + 1, z + 1], ['walnut', 'walnutLight', 'walnutLight', 'grain', 'walnut', 'walnutEdge'][y - 2]);
  }
  for (let y = 8; y < 13; y++) {
    const depth = [5, 5, 4, 3, 1][y - 8];
    p.box([-8, y, -depth], [8, y + 1, depth], ['walnut', 'walnutLight', 'walnutLight', 'walnutEdge', 'walnutLight'][y - 8]);
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
  p.box([-4, 2, 5], [4, 3, 6], 'walnutEdge');
  p.put(-6, 2, 5, 'rust');
  p.put(5, 3, 5, 'rust');
  p.put(-2, 6, 5, 'patina');
}

function chair(p) {
  for (const x of [-5, 3]) for (const z of [-5, 3]) p.box([x, 0, z], [x + 2, 8, z + 2], 'darkWood');
  p.box([-5, 3, -4], [5, 4, -3], 'oak');
  for (const x of [-5, 4]) p.box([x, 3, -4], [x + 1, 4, 5], 'oak');
  p.box([-6, 7, -5], [6, 9, 6], 'walnutEdge');
  p.box([-5, 9, -4], [5, 10, 5], 'red');
  p.box([-4, 9, 4], [4, 10, 5], 'redLight');
  for (const x of [-5, 3]) p.box([x, 8, -5], [x + 2, 20, -3], 'walnut');
  for (const x of [-2, 1]) p.box([x, 11, -5], [x + 1, 18, -4], 'walnutLight');
  p.box([-5, 17, -5], [5, 20, -3], 'walnutLight');
  p.box([-3, 18, -3], [3, 19, -2], 'walnut');
  p.box([-4, 19, -4], [4, 20, -3], 'walnutEdge');
  p.put(-1, 18, -2, 'brass');
  for (const x of [-4, 3]) p.put(x, 8, 5, 'brass');
}

function table(p) {
  for (const x of [-9, 7]) for (const z of [-6, 4]) {
    p.box([x, 0, z], [x + 2, 12, z + 2], 'darkWood');
    p.box([x, 1, z], [x + 2, 3, z + 2], 'oak');
  }
  p.box([-9, 9, -6], [9, 12, 6], 'grain');
  p.box([-11, 12, -8], [11, 14, 8], 'oak');
  const boards = ['#a17c54', '#b18d63', '#bf9b6c', '#ae875b', '#b79466'];
  for (let board = 0; board < boards.length; board++) {
    const z = -7 + board * 3;
    p.box([-10, 13, z], [10, 14, z + 2], [boards[board], 'wood']);
  }
  p.box([-3, 14, -8], [1, 15, 8], 'green');
  p.box([-3, 10, 7], [1, 14, 8], 'green');
  for (const x of [-3, 0]) {
    p.box([x, 14, -8], [x + 1, 15, 8], 'linen');
    p.box([x, 10, 7], [x + 1, 14, 8], 'linen');
  }
  p.oval([5, 14.5, 2], [3, 0.7, 3], 'ivory');
  p.box([-7, 14, -4], [-5, 17, -2], 'brass');
  p.box([-7, 17, -4], [-5, 18, -2], 'earth');
  p.box([3, 14, -5], [7, 15, -3], 'oxblood');
  p.box([4, 14, -4], [7, 15, -3], 'pages');
}

function pottedPlant(p) {
  p.cylinder(0, 1, 4, 'terra');
  for (let y = 1; y < 8; y++) p.cylinder(y, y + 1, 3.3 + y * 0.3, ['clayDark', 'terra', 'terra', 'clay', 'clay', 'clayLight', 'clay'][y - 1], y > 5 ? 4 : 0);
  p.cylinder(7, 9, 6, 'clayLight', 4.6);
  p.cylinder(5, 6, 4.8, 'teal', 4);
  p.cylinder(7, 8, 4.6, 'earth');
  p.beam([0, 8, 0], [0, 21, 0], 0.8, 'stem');
  const foliage = ['leafBlue', 'leaf', 'leafOlive', 'leaf', 'leafDark', 'leafBlue', 'leafOlive'];
  for (let branch = 0; branch < 7; branch++) {
    const angle = branch * Math.PI * 2 / 7;
    const reach = branch % 2 ? 9 : 7;
    const tip = [Math.cos(angle) * reach, 16 + branch % 3 * 2, Math.sin(angle) * reach];
    p.beam([0, 10 + branch % 3, 0], tip, 0.75, 'stem');
    for (let step = 1; step <= 3; step++) {
      const t = step / 3;
      p.oval([tip[0] * t, 12 + (tip[1] - 12) * t, tip[2] * t], [2.2, 1, 2.2], step === 3 ? 'leafLight' : foliage[branch]);
    }
  }
  p.oval([0, 21, 0], [2, 3, 2], 'leafLight');
  p.oval([0, 23, 0], [1.2, 1.6, 1.2], 'leafNew');
}

function lamp(p) {
  p.cylinder(0, 2, 5, 'iron');
  p.cylinder(2, 4, 3, 'bronze');
  p.box([-1, 3, -1], [1, 22, 1], 'iron');
  for (const y of [6, 17, 20]) p.box([-2, y, -2], [2, y + 1, 2], 'brass');
  p.box([-4, 21, -4], [4, 23, 4], 'bronze');
  p.box([-3, 23, -3], [3, 28, 3], ['#e8c07c', 'flame']);
  p.box([-2, 23, -3], [2, 27, 3], 'light');
  for (const x of [-4, 3]) for (const z of [-4, 3]) p.box([x, 22, z], [x + 1, 29, z + 1], 'iron');
  p.box([-5, 28, -5], [5, 29, 5], 'iron');
  p.box([-4, 29, -4], [4, 30, 4], 'bronze');
  p.box([-3, 30, -3], [3, 31, 3], 'brass');
  p.box([-2, 31, -2], [2, 32, 2], 'bronze');
  p.box([-1, 32, -1], [1, 34, 1], 'gold');
  p.box([-3, 21, 3], [-1, 22, 4], 'patina');
  p.box([1, 29, 3], [4, 30, 4], 'patina');
  p.box([-4, 28, 4], [4, 29, 5], 'ironLight');
}

function wallTorch(p) {
  // Riveted shield-shaped plate, with the back against the wall at -z.
  p.box([-2, 0, -5], [2, 15, -3], 'ironDark');
  p.box([-3, 2, -5], [3, 13, -3], 'iron');
  p.box([-2, 14, -4], [2, 15, -3], 'ironLight');
  for (const x of [-2, 1]) for (const y of [3, 11]) p.put(x, y, -3, 'ironLight');
  p.put(-2, 4, -3, 'rust');
  // A bent iron arm supports a wood handle tilted out from the stone.
  p.box([-1, 5, -3], [1, 7, 3], 'iron');
  p.beam([0, 3, -3], [0, 6, 3], 0.9, 'ironDark');
  p.beam([0, 3, 1], [0, 16, 5], 1.2, 'walnut');
  p.beam([-0.5, 5, 2], [-0.5, 14, 5], 0.6, 'honey');
  p.box([-2, 6, 1], [2, 8, 4], 'iron');
  p.box([-2, 13, 3], [2, 15, 7], 'bronze');
  p.box([-3, 15, 2], [3, 17, 8], 'iron');
  p.box([-2, 16, 3], [2, 17, 7], 'charcoal');
  for (const x of [-3, 2]) p.box([x, 16, 3], [x + 1, 18, 7], 'ironLight');
  // Uneven tongues and an ivory core give the fire a readable voxel silhouette.
  p.oval([0, 18, 5], [2.7, 2.8, 2.4], 'ember');
  p.beam([-1, 17, 5], [-2, 21, 5], 1.2, 'fire');
  p.beam([1, 18, 5], [2, 23, 6], 1.1, 'fire');
  p.beam([0, 18, 6], [-1, 24, 6], 0.8, 'fire');
  p.oval([0, 18, 6], [1.4, 2, 1.2], 'light');
  p.beam([0, 19, 6], [0, 22, 6], 0.6, 'light');
}

function barrel(p) {
  const staves = ['#957149', '#a88556', '#896541', '#b08d5c', '#9e784b', '#8e6e47', '#ac8552', '#a68052'];
  for (let y = 0; y < 15; y++) {
    const radius = 4.7 + Math.sin((y + 0.5) / 15 * Math.PI) * 1.8;
    p.cylinder(y, y + 1, radius, [2, 3, 11, 12].includes(y) ? 'iron' : 'oak');
  }
  for (const cell of [...p.cells.values()]) {
    if (cell.material !== 'wood') continue;
    const angle = Math.atan2(cell.z + 0.5, cell.x + 0.5);
    const stave = Math.floor((angle + Math.PI) / Math.PI * 8);
    p.put(cell.x, cell.y, cell.z, [staves[stave % staves.length], 'wood']);
  }
  p.cylinder(14, 15, 4.5, 'honey');
  for (const z of [-2, 1]) p.box([-4, 14, z], [4, 15, z + 1], 'grain');
  p.box([-1, 6, 6], [1, 8, 8], 'brass');
  p.box([-2, 8, 7], [2, 9, 8], 'darkWood');
  for (const y of [3, 12]) {
    p.put(-4, y, 4, 'ironLight');
    p.put(4, y, 4, 'ironLight');
    p.put(-1, y, 6, 'rust');
  }
  p.put(0, 6, 7, 'patina');
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
  p.box([-8, 2, 4], [-5, 3, 7], 'lichen');
  p.box([4, 3, 5], [6, 4, 7], 'lichen');
  p.box([-3, 2, 6], [3, 4, 7], 'bronze');
  p.box([-2, 3, 6], [2, 4, 7], 'gold');
  p.put(2, 2, 6, 'patina');
}

function crate(p) {
  p.box([-7, 0, -6], [7, 12, 6], 'pineWeathered');
  for (const z of [-7, 6]) {
    for (let x = -7; x < 7; x += 3) p.box([x, 1, z], [Math.min(x + 2, 7), 11, z + 1], x === -1 ? 'pineWeathered' : 'pine');
    for (const y of [0, 10]) p.box([-7, y, z], [7, y + 2, z + 1], 'pine');
    for (let i = 0; i < 10; i++) p.box([-5 + i, 1 + i, z], [-3 + i, 2 + i, z + 1], 'pineLight');
    for (const x of [-6, 5]) for (const y of [1, 10]) p.put(x, y, z, 'iron');
  }
  for (const x of [-7, 6]) for (const z of [-5, 3]) p.box([x, 0, z], [x + 1, 12, z + 2], 'pine');
  for (let x = -7; x < 7; x += 3) p.box([x, 11, -6], [Math.min(x + 2, 7), 12, 6], x === 2 ? 'pineLight' : 'pine');
  p.box([-5, 3, 6], [-3, 6, 7], 'ivory');
  p.put(-4, 4, 6, 'ironDark');
}

function bookshelf(p) {
  p.box([-9, 0, -5], [9, 2, 5], 'darkWood');
  p.box([-9, 2, -5], [9, 27, -3], 'walnut');
  for (const x of [-10, 8]) p.box([x, 1, -5], [x + 2, 28, 5], 'walnut');
  for (const y of [2, 10, 18, 26]) {
    p.box([-10, y, -5], [10, y + 1, 5], 'walnutLight');
    p.box([-10, y, 4], [10, y + 1, 5], 'walnutEdge');
  }
  p.box([-11, 27, -5], [11, 29, 5], 'darkWood');
  p.box([-10, 28, -5], [10, 29, 5], 'walnutEdge');
  const colors = ['oxblood', 'indigo', 'sage', 'parchment', 'plum', 'ochre', 'oxblood'];
  for (let row = 0; row < 3; row++) for (let book = 0; book < 7; book++) {
    const x = -7 + book * 2;
    const y = 3 + row * 8;
    const height = 4 + (book + row * 2) % 3;
    p.box([x, y, -3], [x + 2, y + height, 3], colors[(book + row) % colors.length]);
    p.box([x, y + height - 1, -2], [x + 2, y + height, 2], row % 2 ? 'ivory' : 'pages');
    p.put(x, y + 1, 3, 'brass');
    if (height > 4) p.put(x, y + height - 2, 3, 'gold');
  }
}

function brazier(p) {
  for (const x of [-4, 2]) for (const z of [-4, 2]) {
    p.box([x, 0, z], [x + 2, 8, z + 2], 'iron');
    p.box([x, 0, z], [x + 3, 1, z + 2], 'bronze');
  }
  for (let y = 6; y < 12; y++) p.cylinder(y, y + 1, 3 + (y - 6) * 0.65, 'iron', Math.max(0, y - 7));
  p.cylinder(11, 12, 6.5, 'brass', 5.1);
  p.cylinder(10, 11, 4.5, 'charcoal');
  p.beam([-3, 10, 1], [3, 11, -1], 1.4, 'ember');
  p.beam([-2, 11, -2], [2, 10, 3], 1.2, 'ash');
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
  p.box([3, 10, -5], [4, 11, 5], 'blueLight');
  p.box([3, 7, 4], [4, 10, 5], 'blueLight');
  p.box([6, 10, -5], [7, 11, 5], 'linen');
  p.box([6, 7, 4], [7, 10, 5], 'linen');
}

function urn(p) {
  p.cylinder(0, 2, 3.5, 'bronze');
  for (let y = 2; y < 16; y++) {
    const radius = y < 11 ? 3.5 + Math.sin((y - 2) / 10 * Math.PI) * 2.7 : y < 14 ? 3 : 4;
    const surface = y === 5 || y === 11 || y === 15 ? 'brass' : y < 4 || y > 11 ? 'glazeDark' : 'teal';
    p.cylinder(y, y + 1, radius, surface, y >= 14 ? 2.5 : 0);
  }
  // Broad pools of lighter glaze follow the rounded shoulder of the vessel.
  for (const cell of [...p.cells.values()]) {
    if (cell.material !== 'ceramic' || cell.y < 6 || cell.y > 10) continue;
    if (cell.x < -1 && cell.z > 2) p.put(cell.x, cell.y, cell.z, cell.y > 8 ? 'glazeLight' : 'turquoise');
  }
  p.cylinder(14, 15, 2.5, 'earth');
  for (const side of [-1, 1]) {
    p.beam([side * 4, 12, 0], [side * 7, 12, 0], 1, 'bronze');
    p.beam([side * 7, 12, 0], [side * 7, 8, 0], 1, 'brass');
    p.beam([side * 7, 8, 0], [side * 5, 7, 0], 1, 'bronze');
  }
  p.put(-6, 8, 0, 'patina');
  p.put(6, 8, 0, 'patina');
}

const BUILDERS = Object.freeze({ chest, chair, table, pottedPlant, lamp, wallTorch, barrel, statue, crate, bookshelf, brazier, bench, urn, ...NATURE_OBJECT_BUILDERS });
const MODELS = new Map();
// Keep emitters outside opaque flame and metal voxels so props can cast shadows.
const LIGHT_ANCHORS = Object.freeze({
  lamp: Object.freeze([0, 26, 5]),
  wallTorch: Object.freeze([0, 26, 8]),
  brazier: Object.freeze([0, 24, 0]),
});

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
    const lightAnchor = LIGHT_ANCHORS[kind];
    MODELS.set(kind, Object.freeze({ recipe, assembly, parts, appearance: Object.freeze({ form: kind }), scale: 1,
      itemEffects: Object.freeze([]), ...(lightAnchor ? { lightAnchor } : {}) }));
  }
  return MODELS.get(kind);
}
