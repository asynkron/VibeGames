import { BLOCK_SIZE, CHARACTER_SIZE, defineVoxelBlock, createCharacterRecipe, assembleVoxelCharacter } from './voxelBlocks.js';

const SURFACES = {
  scale: ['#367d55', 'skin'], scaleDark: ['#1b5141', 'skin'], scaleLight: ['#68a65c', 'skin'],
  belly: ['#d7bd78', 'skin'], snakeEye: ['#edb740', 'gold'], black: ['#171719', 'skin'],
  tongue: ['#d35468', 'skin'], tooth: ['#eee3bb', 'bone'],
  brownFur: ['#765747', 'fur'], grayFur: ['#6e767b', 'fur'], darkFur: ['#494344', 'fur'],
  muzzle: ['#b7a28e', 'fur'], paws: ['#ae7c7d', 'skin'], ears: ['#ca8b88', 'skin'],
  tail: ['#9d7776', 'skin'], ratEye: ['#e6a454', 'skin'], nose: ['#463033', 'skin'],
  basalt: ['#3c3a49', 'stone'], rockLight: ['#64616f', 'stone'], rockDark: ['#242732', 'stone'],
  lava: ['#fc6729', 'flame'], ember: ['#df371c', 'flame'], fire: ['#ffa643', 'flame'],
  hot: ['#ffe6a0', 'flame'],
};

function sculpt() {
  const cells = new Map();
  function put(x, y, z, surface) {
    if (![x, y, z].every(value => Number.isInteger(value) && value >= 0 && value < CHARACTER_SIZE)) {
      throw new RangeError('Creature voxel must be inside its 24³ volume.');
    }
    if (!SURFACES[surface]) throw new Error(`Unknown creature surface: ${surface}.`);
    cells.set(`${x},${y},${z}`, { x, y, z, surface });
  }
  function shape(min, max, inside, surface) {
    for (let x = Math.max(0, Math.ceil(min[0] - .5)); x <= Math.min(23, Math.floor(max[0] - .5)); x++) {
      for (let y = Math.max(0, Math.ceil(min[1] - .5)); y <= Math.min(23, Math.floor(max[1] - .5)); y++) {
        for (let z = Math.max(0, Math.ceil(min[2] - .5)); z <= Math.min(23, Math.floor(max[2] - .5)); z++) {
          if (inside(x + .5, y + .5, z + .5)) put(x, y, z, surface);
        }
      }
    }
  }
  function oval(center, radius, surface) {
    shape(center.map((n, i) => n - radius[i]), center.map((n, i) => n + radius[i]),
      (x, y, z) => [x, y, z].reduce((sum, n, i) => sum + ((n - center[i]) / radius[i]) ** 2, 0) <= 1, surface);
  }
  function limb(a, b, radius, surface) {
    const direction = b.map((n, i) => n - a[i]);
    const lengthSquared = direction.reduce((sum, n) => sum + n * n, 0);
    shape(a.map((n, i) => Math.min(n, b[i]) - radius), a.map((n, i) => Math.max(n, b[i]) + radius),
      (x, y, z) => {
        const point = [x - a[0], y - a[1], z - a[2]];
        const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, point.reduce((sum, n, i) => sum + n * direction[i], 0) / lengthSquared));
        return point.reduce((sum, n, i) => sum + (n - t * direction[i]) ** 2, 0) <= radius ** 2;
      }, surface);
  }
  function box(min, max, surface) { shape(min, max, () => true, surface); }
  return { cells, put, oval, limb, box };
}

function serpent() {
  const p = sculpt();
  // A broad low coil remains visible behind a raised, forward-facing viper head.
  let previous;
  for (let step = 0; step <= 44; step++) {
    const angle = -.4 + step / 44 * Math.PI * 1.83;
    const point = [11 + Math.cos(angle) * 6.1, 2.4 + step / 44 * .8, 10 + Math.sin(angle) * 6.1];
    if (previous) p.limb(previous, point, 2.15, 'scale');
    previous = point;
  }
  p.limb([16.5,2.5,7.5],[18.5,1.5,4.5],1.4,'scale');
  p.limb([18.5,1.5,4.5],[21.5,.5,4.5],.65,'scale');
  p.limb([16,3.5,13],[17.5,7.5,14],2.05,'scale');
  p.limb([17.5,7.5,14],[15.5,12.5,14.5],1.9,'scale');
  p.limb([15.5,12.5,14.5],[13.5,16,16],1.8,'scale');
  for (const cell of p.cells.values()) {
    if (cell.y <= 1 || (cell.y >= 5 && cell.z >= 15 && (cell.y % 3 !== 0))) cell.surface = 'belly';
    else if ((cell.x + cell.z + cell.y * 2) % 7 <= 1) cell.surface = 'scaleDark';
    else if ((cell.x * 3 + cell.z + cell.y) % 11 <= 1) cell.surface = 'scaleLight';
  }
  p.oval([13.5,17,17],[3.3,2.2,3.4],'scale');
  p.oval([13.5,15.8,18],[2.5,.8,2.7],'belly');
  p.box([11,16,19],[16,17,20],'scaleDark');
  p.put(11,17,19,'snakeEye'); p.put(15,17,19,'snakeEye');
  p.put(10,17,18,'snakeEye'); p.put(16,17,18,'snakeEye');
  p.put(11,18,19,'scaleDark'); p.put(15,18,19,'scaleDark');
  p.put(12,17,20,'black'); p.put(14,17,20,'black');
  p.put(11,15,20,'tooth'); p.put(15,15,20,'tooth');
  p.put(13,15,20,'tongue'); p.put(13,15,21,'tongue');
  p.put(12,15,22,'tongue'); p.put(14,15,22,'tongue');
  return p.cells;
}

function rats() {
  const p = sculpt();
  const group = [
    { x: 5.5, z: 8.5, fur: 'brownFur', bend: -1 },
    { x: 18.5, z: 9.5, fur: 'grayFur', bend: 1 },
    { x: 12, z: 16, fur: 'darkFur', bend: -1 },
  ];
  for (const rat of group) {
    const { x, z, fur, bend } = rat;
    const tailBase = [x,1.5,z-3];
    const tailMiddle = [x+bend*3,.5,z-5];
    const tailTip = [x+bend*4,.5,z-7];
    p.limb(tailBase,tailMiddle,.62,'tail');
    p.limb(tailMiddle,tailTip,.52,'tail');
    p.oval([x,3.2,z],[2.8,2.25,3.7],fur);
    for (const side of [-1,1]) {
      for (const stride of [-2,1.5]) {
        p.limb([x+side*1.8,2,z+stride],[x+side*2.3,.6,z+stride+.6],.7,fur);
        p.oval([x+side*2.3,.55,z+stride+1],[.8,.55,1.1],'paws');
      }
    }
    p.oval([x,3.8,z+3.5],[2.15,1.75,2.15],fur);
    p.oval([x,3.2,z+5],[1.2,1.05,1.5],'muzzle');
    for (const side of [-1,1]) {
      p.oval([x+side*1.6,5.6,z+2.7],[1.1,1.5,.8],fur);
      p.oval([x+side*1.6,5.7,z+3.2],[.65,1,.4],'ears');
      p.put(Math.floor(x+side*1.3),4,Math.floor(z+4.8),'black');
      p.put(Math.floor(x+side*1.8),4,Math.floor(z+4.1),'ratEye');
    }
    p.put(Math.floor(x),3,Math.floor(z+6),'nose');
    p.put(Math.floor(x-.8),2,Math.floor(z+5.8),'tooth');
    p.put(Math.floor(x+.8),2,Math.floor(z+5.8),'tooth');
  }
  return p.cells;
}

function elemental() {
  const p = sculpt();
  // An ember vortex supports an irregular mass of floating volcanic stone.
  p.limb([12,1.5,12],[10,5,12],1.1,'ember');
  p.limb([10,5,12],[13,8,12],2,'lava');
  p.oval([12,10.5,12],[4.2,4.7,3.2],'basalt');
  p.oval([11,14,12],[5.4,2.7,3.6],'basalt');
  p.oval([12,18.3,12.8],[3.6,3.1,3],'rockDark');
  p.oval([12,19.3,12.6],[3.3,2.4,3],'basalt');
  p.limb([6.5,14.2,12],[3.6,11.4,13.2],1.75,'basalt');
  p.oval([3.6,9.8,14.5],[2.4,2.8,2.35],'basalt');
  p.limb([17.1,14.5,12],[19.6,16,13.4],1.8,'basalt');
  p.oval([20,15.2,15],[2.4,2.65,2.55],'basalt');
  for (const cell of p.cells.values()) {
    if (cell.surface !== 'basalt' && cell.surface !== 'rockDark') continue;
    const jagged = (cell.x * 3 + cell.y * 2 + cell.z) % 11;
    if (jagged === 0 || (cell.x + 2 * cell.y) % 9 === 0) cell.surface = 'lava';
    else if (jagged < 3) cell.surface = 'rockLight';
    else if (jagged > 8) cell.surface = 'rockDark';
  }
  p.limb([8.5,13.5,12],[6.5,18.5,11],1.2,'ember');
  p.limb([6.5,18.5,11],[7.5,21.5,11],.7,'fire');
  p.limb([16.5,14.5,12],[18.5,19.5,11.5],1.1,'lava');
  p.limb([18.5,19.5,11.5],[17.5,22.5,12.5],.65,'fire');
  p.limb([11,20,12],[10.5,23.5,11.5],.9,'lava');
  p.limb([13.5,20.5,12.5],[14.5,22.5,12.5],1,'fire');
  p.box([10,18,15],[12,19,16],'hot');
  p.box([13,18,15],[15,19,16],'hot');
  p.put(11,16,15,'lava'); p.put(12,16,15,'hot'); p.put(13,16,15,'lava');
  p.oval([11.5,11.5,15],[2,2.5,.8],'ember');
  p.oval([11.5,11.8,15.5],[1.1,1.7,.65],'hot');
  for (const [x,y,z,r] of [[5,3,11,1.4],[18,4,9,1.8],[15,2,17,1],[7,6,17,1.1]]) {
    p.oval([x,y,z],[r,r,r],'basalt');
    p.put(Math.floor(x),Math.floor(y),Math.floor(z+r),'lava');
  }
  return p.cells;
}

function colorFor(cell) {
  const [color, material] = SURFACES[cell.surface];
  const noise = ((cell.x * 13 + cell.y * 7 + cell.z * 17) % 9) - 4;
  return {
    color: '#' + [1,3,5].map(index => Math.max(0,Math.min(255,parseInt(color.slice(index,index+2),16) + noise)).toString(16).padStart(2,'0')).join(''),
    material,
  };
}

function compile(kind, cells, scale) {
  const chunks = new Map();
  for (const cell of cells.values()) {
    const slot = [cell.x,cell.y,cell.z].map(n => Math.floor(n / BLOCK_SIZE));
    const key = slot.join('-');
    if (!chunks.has(key)) chunks.set(key,{ slot, voxels: [] });
    chunks.get(key).voxels.push({ x:cell.x % BLOCK_SIZE, y:cell.y % BLOCK_SIZE, z:cell.z % BLOCK_SIZE, ...colorFor(cell) });
  }
  const blocks = new Map();
  const placements = [];
  for (const [key, { slot, voxels }] of chunks) {
    const id = `creature/${kind}/${key}`;
    blocks.set(id,defineVoxelBlock({ id, name:`${kind.replaceAll('_',' ')} · ${key}`, voxels }));
    placements.push({ x:slot[0], y:slot[1], z:slot[2], blockId:id });
  }
  const recipe = createCharacterRecipe({ id:`creature/${kind}`, placements });
  return Object.freeze({
    recipe,
    assembly: assembleVoxelCharacter(recipe,blocks),
    blocks,
    appearance: Object.freeze({ form:kind }),
    scale,
  });
}

const authors = new Map([
  ['serpent', { sculpt:serpent, scale:1.05 }],
  ['rat_swarm', { sculpt:rats, scale:1.1 }],
  ['elemental', { sculpt:elemental, scale:1.16 }],
]);
const models = new Map();

/** Resolve immutable block assets for a creature, with +Z as its facing direction. */
export function assembleCreatureVoxelModel(kind) {
  const author = authors.get(kind);
  if (!author) throw new Error(`Unknown voxel creature: ${kind}.`);
  if (!models.has(kind)) models.set(kind,compile(kind,author.sculpt(),author.scale));
  return models.get(kind);
}
