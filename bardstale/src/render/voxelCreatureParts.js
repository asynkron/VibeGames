import { defineVoxelPart, createCharacterRecipe, assembleVoxelCharacter } from './voxelParts.js';

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
  dragonScale: ['#a63632', 'skin'], dragonLight: ['#ce6240', 'skin'], dragonDark: ['#652e32', 'skin'],
  dragonBelly: ['#d39d62', 'skin'], dragonPlate: ['#e8bb76', 'skin'],
  wing: ['#bd7746', 'leather'], wingLight: ['#dda568', 'leather'], wingDark: ['#9f543b', 'leather'],
  horn: ['#eee0b3', 'bone'], hornBase: ['#bca574', 'bone'], dragonEye: ['#ffd15a', 'gold'],
  ogreSkin: ['#90976b', 'skin'], ogreLight: ['#adb082', 'skin'], ogreShadow: ['#6d7854', 'skin'],
  ogreBrow: ['#505840', 'skin'], ogreLip: ['#6c6751', 'skin'], ogreEye: ['#edcb79', 'skin'],
  hide: ['#6a4a37', 'leather'], hideLight: ['#8d684b', 'leather'], hideDark: ['#49382d', 'leather'],
  stitching: ['#c8ac77', 'cloth'], iron: ['#787c7c', 'steel'], brass: ['#b79551', 'gold'],
  club: ['#785039', 'wood'], clubLight: ['#a4774b', 'wood'], clubDark: ['#4f392d', 'wood'],
};

function sculpt() {
  const cells = new Map();
  function put(x, y, z, surface) {
    if (![x, y, z].every(Number.isInteger)) throw new TypeError('Creature voxel coordinates must be integers.');
    if (!SURFACES[surface]) throw new Error(`Unknown creature surface: ${surface}.`);
    cells.set(`${x},${y},${z}`, { x, y, z, surface });
  }
  function shape(min, max, inside, surface) {
    for (let x = Math.ceil(min[0] - .5); x <= Math.floor(max[0] - .5); x++) {
      for (let y = Math.ceil(min[1] - .5); y <= Math.floor(max[1] - .5); y++) {
        for (let z = Math.ceil(min[2] - .5); z <= Math.floor(max[2] - .5); z++) {
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
  function triangle(a, b, c, surface) {
    const u = b.map((n, i) => n - a[i]);
    const v = c.map((n, i) => n - a[i]);
    const normal = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...normal);
    const dot = (left, right) => left.reduce((sum, n, i) => sum + n * right[i], 0);
    const uu = dot(u, u), uv = dot(u, v), vv = dot(v, v);
    const determinant = uu * vv - uv * uv;
    shape(a.map((n, i) => Math.min(n, b[i], c[i]) - 1), a.map((n, i) => Math.max(n, b[i], c[i]) + 1),
      (x, y, z) => {
        const point = [x-a[0], y-a[1], z-a[2]];
        if (Math.abs(dot(point, normal)) / length > .7) return false;
        const pu = dot(point, u), pv = dot(point, v);
        const s = (pu * vv - pv * uv) / determinant;
        const t = (pv * uu - pu * uv) / determinant;
        return s >= -.015 && t >= -.015 && s + t <= 1.015;
      }, surface);
  }
  return { cells, put, oval, limb, box, triangle };
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

function dragon() {
  const p = sculpt();
  // The wings are ribbed membranes, separate from the four weight-bearing legs.
  for (const side of [-1, 1]) {
    const at = (x, y, z) => [12 + side*x, y, z];
    const root = at(4, 18, 15);
    const wrist = at(10, 33, 11);
    const edge = [at(23, 29, 5), at(20, 23, 7), at(21, 17, 1),
      at(15, 20, 6), at(14, 12, 1), at(9, 16, 8), root];
    for (let i = 0; i < edge.length - 1; i++) {
      p.triangle(wrist, edge[i], edge[i+1], i % 3 === 0 ? 'wingLight' : 'wing');
    }
    p.limb(root, wrist, 1.45, 'dragonScale');
    p.limb(wrist, edge[0], 1.1, 'dragonLight');
    for (const i of [2, 4]) p.limb(wrist, edge[i], .8, 'dragonDark');
    for (let i = 0; i < edge.length - 1; i++) p.limb(edge[i], edge[i+1], .6, 'wingDark');
    p.limb(wrist, at(9, 37, 13), 1.1, 'dragonScale');
    p.limb(at(9, 37, 13), at(7.5, 39, 14), .7, 'horn');
    p.limb(edge[0], at(23, 28, 7), .65, 'horn');
  }

  // A tapered tail hooks around the rear haunch rather than extending the footprint.
  const tail = [[12,9,5,3.3], [14,7,-2,2.8], [19,5,-7,2.1],
    [26,3,-10,1.6], [31,2,-8,1.15], [31,3,-4,.9], [27,4,-2,.85]];
  for (let i = 1; i < tail.length; i++) {
    p.limb(tail[i-1].slice(0,3), tail[i].slice(0,3), tail[i][3], 'dragonScale');
  }

  p.oval([12,12,11], [6,5.5,9], 'dragonScale');
  p.oval([12,15,18], [5,6,5.5], 'dragonScale');
  p.oval([12,10,17], [4.2,3.5,4.8], 'dragonBelly');
  for (const side of [-1, 1]) {
    // Hindquarters are heavier; the forward ankles remain slender and articulated.
    p.oval([12+side*5,8,5], [3.6,4.7,3.8], 'dragonScale');
    p.limb([12+side*5,9,5], [12+side*8,4,3], 2.1, 'dragonScale');
    p.limb([12+side*8,4,3], [12+side*8,1.6,7], 1.4, 'dragonScale');
    p.limb([12+side*4,16,18], [12+side*7,7,16], 1.9, 'dragonScale');
    p.limb([12+side*7,7,16], [12+side*7,1.5,20], 1.25, 'dragonScale');
    for (const [x, z] of [[12+side*8,8], [12+side*7,21]]) {
      p.oval([x,1.1,z], [2.5,1.1,3], 'dragonDark');
      p.oval([x,1.8,z-.6], [2.25,1.2,1.7], 'dragonScale');
      for (const toe of [-1.5, 0, 1.5]) p.limb([x+toe,1,z+1.5], [x+toe,.5,z+3.5], .6, 'horn');
    }
  }

  // An S-shaped neck carries a broad brow and a projecting, tooth-lined muzzle.
  p.limb([12,16,20], [12,23,21], 3.25, 'dragonScale');
  p.limb([12,23,21], [12,28,26], 2.9, 'dragonScale');
  p.limb([12,16,22.5], [12,23,23.7], 1.7, 'dragonBelly');
  p.limb([12,23,23.7], [12,27,28.5], 1.65, 'dragonBelly');
  for (const cell of p.cells.values()) {
    if (cell.surface === 'dragonScale') {
      const fleck = ((cell.x * 3 + cell.y * 5 + cell.z * 7) % 19 + 19) % 19;
      if (fleck === 0 || fleck === 1) cell.surface = 'dragonLight';
      else if (fleck === 18) cell.surface = 'dragonDark';
    }
    if (cell.surface === 'dragonBelly' && cell.y % 3 === 0) cell.surface = 'dragonPlate';
  }

  // A row of short pale spines makes the back and the sweeping tail easy to read.
  for (const [x,y,z] of [[12,17,5],[12,18,9],[12,19,13],[12,21,17],
    [12,25,19],[12,29,23],[16,8,-3],[21,6,-7],[27,4,-9]]) {
    p.limb([x,y-2,z], [x,y+2.5,z-1], .85, 'hornBase');
    p.put(Math.floor(x),Math.floor(y+2),Math.floor(z-1),'horn');
  }

  p.oval([12,29,28], [4.6,3.2,4.6], 'dragonScale');
  p.oval([12,27.6,32.2], [3.5,1.6,3.7], 'dragonLight');
  p.oval([12,25.9,32.2], [3.1,.85,3.5], 'black');
  p.oval([12,24.7,32], [3.1,.8,3.6], 'dragonBelly');
  for (const side of [-1, 1]) {
    p.limb([12+side*3,30.5,26], [12+side*5,33.5,24], 1.25, 'hornBase');
    p.limb([12+side*5,33.5,24], [12+side*5.5,36,21.5], .8, 'horn');
    p.limb([12+side*4,28,26], [12+side*6,28.5,24], .85, 'dragonDark');
    p.limb([12+side*3.2,30,30], [12+side*2.1,29.4,32], .9, 'dragonDark');
    p.box([side < 0 ? 8 : 14,28,30], [side < 0 ? 10 : 16,29,32], 'dragonEye');
    p.put(side < 0 ? 8 : 15,28,31,'black');
    p.put(side < 0 ? 8 : 15,28,30,'dragonEye');
    p.put(side < 0 ? 10 : 13,28,35,'black');
    for (const z of [30, 32, 34]) p.put(side < 0 ? 9 : 14,26,z,'tooth');
    p.put(side < 0 ? 10 : 13,26,35,'tooth');
    p.put(side < 0 ? 9 : 14,25,31,'tooth');
  }
  return p.cells;
}

function ogre() {
  const p = sculpt();

  // Unequal bent legs and broad, bare feet hold a heavy, forward-leaning body.
  for (const side of [-1, 1]) {
    const x = 12 + side*6;
    const z = side < 0 ? 14 : 11;
    p.limb([x,19,z], [x+side,10,z+1], 4.15, 'ogreSkin');
    p.oval([x+side,10,z+1], [4.3,4,4.5], 'ogreSkin');
    p.limb([x+side,10,z+1], [x+side*1.5,3,z+1.5], 3.25, 'ogreSkin');
    p.oval([x+side*1.5,2,z+3], [4.35,2,5.8], 'ogreSkin');
    for (const toe of [-2.5, 0, 2.5]) {
      p.oval([x+side*1.5+toe,1.3,z+6.8], [1.25,1.3,2.1], 'ogreSkin');
      p.box([Math.floor(x+side*1.5+toe),1,Math.floor(z+8)],
        [Math.floor(x+side*1.5+toe)+1,2,Math.floor(z+8)+1], 'hornBase');
    }
  }
  p.oval([12,23,13.5], [9.2,8.2,6.7], 'ogreSkin');
  p.oval([12,30,12], [10.8,8.3,6.8], 'ogreSkin');
  p.oval([12,25.5,16.5], [9.5,7.9,6.2], 'ogreSkin');
  p.oval([12,33,10], [9.5,6.4,5.8], 'ogreSkin');
  p.oval([12,36,14], [4.3,5,4.5], 'ogreSkin');

  // The club arm hangs lower; the open hand reaches forward with separate fingers.
  p.oval([2.5,33,12], [5.3,5.6,5.5], 'ogreSkin');
  p.limb([2,33,13], [-1,25,14], 4.2, 'ogreSkin');
  p.oval([-1,25,14], [4.4,4.5,4.5], 'ogreSkin');
  p.limb([-1,25,14], [-4.5,18,18], 3.55, 'ogreSkin');
  p.oval([-5.3,17.2,19.3], [3.6,3.6,3.6], 'ogreSkin');
  p.oval([21.5,34,11], [5.3,5.3,5.7], 'ogreSkin');
  p.limb([22,33,12], [25,25,14], 4.05, 'ogreSkin');
  p.limb([25,25,14], [28,18,17], 3.4, 'ogreSkin');
  p.oval([28.2,16.7,18], [3.6,3.3,3.5], 'ogreSkin');
  for (const finger of [-2.2, 0, 2.2]) {
    p.limb([28.2+finger,16,19], [28.2+finger,12,20], 1.05, 'ogreSkin');
    p.put(Math.floor(28.2+finger),12,20,'hornBase');
  }
  p.limb([25.5,17.5,19], [24.5,14.5,20], 1.25, 'ogreSkin');

  // Skin variation follows broad anatomical areas instead of enlarging a small figure.
  for (const cell of p.cells.values()) {
    if (cell.surface !== 'ogreSkin') continue;
    if (cell.z > 18 && cell.y > 20 && cell.y < 30) cell.surface = 'ogreLight';
    else if ((cell.x*3 + cell.y*7 + cell.z*11) % 31 === 0) cell.surface = 'ogreShadow';
    else if (cell.z < 8) cell.surface = 'ogreShadow';
  }
  p.put(12,23,22,'ogreShadow');
  p.put(13,23,22,'ogreShadow');

  // Ragged hide hangs over the hips, with a broad belt and a stitched front panel.
  p.oval([12,20,13], [9.3,4.4,6.9], 'hide');
  for (let x = 5; x < 19; x++) {
    const hem = 12 + Math.abs(x-12) % 3;
    p.box([x,hem,18], [x+1,21,20], x % 4 === 0 ? 'hideLight' : 'hide');
  }
  for (const cell of p.cells.values()) {
    if (cell.y >= 21 && cell.y <= 23 && cell.x >= 3 && cell.x <= 21 && cell.z >= 6 && cell.z <= 22) {
      cell.surface = 'hideDark';
    }
  }
  p.box([10,21,22], [15,24,23], 'brass');
  p.box([11,22,23], [14,23,24], 'hideDark');
  p.put(12,22,23,'brass');
  for (let y = 14; y < 21; y += 2) {
    p.put(7,y,20,'stitching'); p.put(17,y,20,'stitching');
  }
  p.limb([5,35,17], [16,25,21], 1.25, 'hideDark');
  p.limb([5,35,7], [16,24,6], 1.25, 'hideDark');
  p.oval([22,35,10.5], [5.7,3.4,6], 'hide');
  for (const [x,y,z] of [[20,37,14],[23,36,15],[26,35,14],[21,38,10]]) p.put(x,y,z,'iron');
  p.limb([-3,22,16], [-4,20,17], 3.7, 'hideDark');
  p.limb([27,20,16], [27.5,18,17], 3.55, 'hideDark');

  // The head is small relative to the shoulders, with a hanging jaw and deep brow.
  p.oval([12,41,16.5], [5.7,5.7,5.4], 'ogreSkin');
  p.oval([12,37.7,19], [5.2,3.1,4.3], 'ogreSkin');
  for (const side of [-1, 1]) {
    p.oval([12+side*5.5,41,16.3], [2.1,2.6,1.5], 'ogreSkin');
    p.oval([12+side*6.5,41,17], [.9,1.6,.6], 'ogreShadow');
    p.oval([12+side*2.8,39.8,20.8], [2.1,1.8,1.3], 'ogreLight');
    p.box([side < 0 ? 8 : 14,41,21], [side < 0 ? 10 : 16,42,23], 'ogreBrow');
    p.put(side < 0 ? 8 : 15,41,23,'ogreEye');
    p.put(side < 0 ? 9 : 14,41,23,'black');
    p.limb([12+side*1.3,42,22], [12+side*4,43,21], 1.05, 'ogreBrow');
  }
  p.oval([12,40,22.3], [1.9,2,2.5], 'ogreShadow');
  p.oval([12,39.3,23.2], [2.2,1.2,1.8], 'ogreSkin');
  p.put(10,39,24,'ogreBrow'); p.put(13,39,24,'ogreBrow');
  p.box([8,37,22], [16,38,24], 'ogreLip');
  p.box([9,37,24], [15,38,25], 'black');
  p.box([10,36,23], [14,37,25], 'ogreLip');
  for (const side of [-1, 1]) {
    p.limb([12+side*3,37,24], [12+side*3.5,39,24.5], .9, 'hornBase');
    p.limb([12+side*3.5,39,24.5], [12+side*3.2,41,24], .65, 'horn');
  }
  p.put(8,44,20,'ogreShadow'); p.put(9,44,21,'ogreShadow');
  p.put(9,43,22,'ogreShadow');
  for (const x of [4,5,6]) for (const y of [37,40]) p.put(x,y,18,'brass');
  for (const x of [4,6]) for (const y of [38,39]) p.put(x,y,18,'brass');
  p.put(5,40,17,'brass');

  // A rough tapered log sits on a narrow wrapped grip inside the closed fist.
  p.limb([-4.3,8,21], [-8,28,17.5], 1.15, 'clubDark');
  p.limb([-8,27,17.5], [-10,38,15.5], 3.6, 'club');
  p.oval([-10,38,15.5], [3.8,3,3.6], 'club');
  p.limb([-7.2,28,20], [-9.2,39,18], .7, 'clubLight');
  p.limb([-10.5,28,16], [-12,38,15], .65, 'clubDark');
  p.limb([-5,29,17], [-5.5,36,16], .6, 'clubLight');
  p.limb([-8.5,30,17], [-8.7,31,16.8], 3.75, 'iron');
  p.limb([-9.6,36,15.8], [-9.8,37,15.6], 3.85, 'iron');
  p.limb([-5.5,14,20], [-6.6,22,18.7], 1.35, 'hideLight');
  for (const y of [15,17,19]) {
    p.limb([-8,y,20], [-5,y,22], 1.05, 'ogreSkin');
    p.put(-6,y,23,'hornBase');
  }
  p.limb([-3,19,21], [-5,20,22], 1.2, 'ogreSkin');
  // Balance the club and the free arm around the footprint's center.
  return new Map([...p.cells.values()].map(cell => {
    const shifted = { ...cell, x:cell.x+3, z:cell.z-2 };
    return [`${shifted.x},${shifted.y},${shifted.z}`, shifted];
  }));
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
  const id = `creature/${kind}`;
  const voxels = [...cells.values()].map(cell => ({
    x:cell.x-12, y:cell.y, z:cell.z-12, ...colorFor(cell),
  }));
  const torso = defineVoxelPart({ id, name:kind.replaceAll('_',' '), voxels });
  const parts = new Map([[id,torso]]);
  const recipe = createCharacterRecipe({ id, parts:{torso:{partId:id}} });
  return Object.freeze({
    recipe,
    assembly: assembleVoxelCharacter(recipe,parts),
    parts,
    appearance: Object.freeze({ form:kind }),
    scale,
  });
}

const authors = new Map([
  ['serpent', { sculpt:serpent, scale:1.05 }],
  ['rat_swarm', { sculpt:rats, scale:1.1 }],
  ['elemental', { sculpt:elemental, scale:1.16 }],
  ['dragon', { sculpt:dragon, scale:1 }],
  ['ogre', { sculpt:ogre, scale:1 }],
]);
const models = new Map();

/** A custom creature is one complete torso part, with +Z as its facing direction. */
export function assembleCreatureVoxelModel(kind) {
  const author = authors.get(kind);
  if (!author) throw new Error(`Unknown voxel creature: ${kind}.`);
  if (!models.has(kind)) models.set(kind,compile(kind,author.sculpt(),author.scale));
  return models.get(kind);
}
