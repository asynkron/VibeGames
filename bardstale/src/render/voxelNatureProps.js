// Grounded footprints fit a combat cell; tall crowns overhang above a character's head.
// The shared painter supplies integer voxels, so trunks and branches remain articulated steps.
const bark = ['#655342', 'wood'];
const barkLight = ['#90715a', 'wood'];
const barkDark = ['#443d34', 'wood'];
const leaves = [
  ['#345d42', 'foliage'], ['#48754b', 'foliage'], ['#61884e', 'foliage'],
  ['#7f9955', 'foliage'], ['#98ae68', 'foliage'],
];

function oakTree(p) {
  for (const [x, z] of [[-8, 0], [6, 5], [1, -8], [-5, 6]]) p.beam([0, 8, 0], [x, 0.5, z], 1.9, barkDark);
  p.beam([0, 0, 0], [-1, 40, 1], 3.4, bark);
  p.beam([-1, 35, 1], [2, 72, 0], 2.4, barkLight);
  p.beam([-2, 3, 2], [-3, 38, 2], 0.8, barkLight);
  p.beam([1, 2, -2], [1, 36, -1], 0.7, barkDark);
  for (const [x, y, z] of [[-15, 65, 1], [15, 72, 3], [-4, 78, -15], [1, 82, 15]]) {
    p.beam([0, y - 22, 0], [x, y, z], 1.5, bark);
  }
  const crowns = [
    [-10, 67, 1, 14, 12, 15, 0], [10, 70, 3, 14, 12, 15, 1],
    [-3, 77, -10, 17, 13, 14, 2], [0, 82, 9, 17, 12, 15, 2],
    [-10, 83, 1, 13, 10, 14, 3], [6, 91, 0, 12, 10, 12, 3],
  ];
  for (const [x, y, z, rx, ry, rz, shade] of crowns) {
    p.oval([x, y, z], [rx, ry, rz], leaves[shade]);
    p.oval([x - 1, y + ry * 0.48, z + 1], [rx * 0.72, ry * 0.56, rz * 0.75], leaves[Math.min(4, shade + 1)]);
  }
  p.oval([-2, 8, 2], [3, 4, 2], ['#62734d', 'foliage']);
}

function pineTree(p) {
  p.beam([0, 0, 0], [0, 94, 0], 2.2, ['#7c5943', 'wood']);
  p.beam([0, 94, 0], [0, 104, 0], 1, ['#7c5943', 'wood']);
  for (const [x, z] of [[-6, 0], [4, 4], [0, -6]]) p.beam([0, 5, 0], [x, 0.5, z], 1.4, barkDark);
  const colors = ['#274f42', '#366b52', '#42785a', '#568765', '#75a17b'];
  for (let tier = 0; tier < 6; tier++) {
    const base = 55 + tier * 7;
    const reach = 19 - tier * 2.5;
    for (let y = base; y < base + 16; y++) {
      const radius = reach * (1 - (y - base) / 17);
      const surface = [colors[Math.min(4, tier % 2 + (y > base + 8 ? 1 : 0))], 'foliage'];
      p.oval([0, y + 0.5, 0], [radius, 0.7, radius], surface);
    }
    for (const side of [-1, 1]) p.beam([0, base + 4, 0], [side * reach * 0.8, base + 1, 0], 0.8, barkDark);
  }
  p.beam([0, 101, 0], [0, 107, 0], 1.1, ['#8bb08b', 'foliage']);
}

function boulder(p) {
  p.oval([0, 7, 0], [11.5, 8, 9.5], ['#707c86', 'stone']);
  p.oval([-2, 10, -1], [9, 7, 8], ['#969da0', 'stone']);
  p.oval([-3, 13, 0], [7, 4, 6], ['#b0b2a9', 'stone']);
  p.oval([4, 5, 5], [5, 5, 4], ['#59656b', 'stone']);
  p.oval([-6, 4, 4], [5, 3, 4], ['#65774d', 'foliage']);
  p.oval([-6, 7, 3], [3, 2, 3], ['#8f985d', 'foliage']);
  // A pale quartz vein follows one broad fracture rather than random speckles.
  p.beam([-8, 6, 6], [-5, 12, 6], 0.75, ['#d4cbbb', 'stone']);
  p.beam([-5, 12, 6], [1, 15, 4], 0.75, ['#d4cbbb', 'stone']);
}

function fern(p) {
  p.oval([0, 1, 0], [3, 2, 3], ['#5d6138', 'foliage']);
  for (let branch = 0; branch < 9; branch++) {
    const angle = branch * Math.PI * 2 / 9;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    const reach = branch % 3 === 0 ? 11 : 9;
    for (let segment = 1; segment <= 5; segment++) {
      const t = segment / 5;
      const y = 3 + Math.sin(t * Math.PI * 0.8) * (branch % 2 ? 8 : 11);
      const x = dx * reach * t;
      const z = dz * reach * t;
      const width = (1 - t) * 3 + 0.5;
      p.beam([dx * reach * (t - 0.2), y - 1, dz * reach * (t - 0.2)], [x, y, z], 0.65, ['#82975b', 'wood']);
      for (const side of [-1, 1]) {
        p.beam([x, y, z], [x - dz * width * side - dx, y - 1, z + dx * width * side - dz], 0.8, leaves[segment > 3 ? 3 : branch % 3]);
      }
    }
  }
}

function mushrooms(p) {
  for (const [x, z, height, radius, color] of [[-4, -1, 8, 4.5, '#b6604c'], [4, 3, 5, 3.5, '#bb865e'], [3, -5, 3, 2.5, '#af624d']]) {
    p.beam([x, 0, z], [x + 0.5, height, z], 1.1, ['#d5c8a8', 'bone']);
    p.oval([x, height, z], [radius, 1.6, radius], ['#cfbba1', 'bone']);
    p.oval([x, height + 1, z], [radius, 2.5, radius], [color, 'leather']);
    p.oval([x - 1, height + 2.5, z], [radius * 0.65, 0.9, radius * 0.65], ['#d58d6b', 'leather']);
    for (const [dx, dz] of [[-2, 0], [1, 2], [1, -2]]) if (radius > 3) p.put(x + dx, height + 3, z + dz, ['#e9d9bd', 'bone']);
  }
}

function crystals(p) {
  p.oval([0, 1.5, 0], [9, 2, 7], ['#52596a', 'stone']);
  for (const [cx, cz, top, radius, color] of [[-3, 0, 21, 3, '#829ed5'], [3, 2, 14, 2, '#71bdb9'], [1, -4, 11, 2, '#b099d7'], [-6, 3, 8, 2, '#657dac']]) {
    for (let y = 2; y < top; y++) {
      const r = y < top - radius * 2 ? radius : Math.max(1, Math.ceil((top - y) / 2));
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
        if (Math.abs(x) + Math.abs(z) > r + 1) continue;
        p.put(cx + x, y, cz + z, [x < 0 ? '#b8d1e5' : color, 'crystal']);
      }
    }
  }
}

export const NATURE_OBJECT_BUILDERS = Object.freeze(Object.fromEntries(
  Object.entries({ oakTree, pineTree, boulder, fern, mushrooms, crystals }).map(([kind, build]) => [kind, p => {
    build(p);
    // Rounded roots and boulders end at the floor instead of protruding through it.
    for (const [key, cell] of p.cells) if (cell.y < 0) p.cells.delete(key);
  }]),
));
