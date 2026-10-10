import { rngFromSeed } from '../../shared/utils/random.js';
import { COMBAT_CELLS_PER_MAP_TILE } from '../config/combatSettings.js';

export const DIR = { N: 0, E: 1, S: 2, W: 3 };
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const WALL = { OPEN: 0, WALL: 1, DOOR: 2 };

export function leftOf(dir) { return (dir + 3) % 4; }
export function rightOf(dir) { return (dir + 1) % 4; }
export function backOf(dir) { return (dir + 2) % 4; }
export function inBounds(x, y, w, h) { return x >= 0 && x < w && y >= 0 && y < h; }

function createCell() {
  return { n: WALL.WALL, e: WALL.WALL, s: WALL.WALL, w: WALL.WALL, visited: false };
}

function setWall(cells, w, h, x, y, dir, type) {
  if (!inBounds(x, y, w, h)) return;
  const c = cells[y][x];
  if (dir === DIR.N) c.n = type;
  if (dir === DIR.E) c.e = type;
  if (dir === DIR.S) c.s = type;
  if (dir === DIR.W) c.w = type;
  const nx = x + DX[dir];
  const ny = y + DY[dir];
  if (inBounds(nx, ny, w, h)) {
    const n = cells[ny][nx];
    const od = backOf(dir);
    if (od === DIR.N) n.n = type;
    if (od === DIR.E) n.e = type;
    if (od === DIR.S) n.s = type;
    if (od === DIR.W) n.w = type;
  }
}

export function getWall(cells, w, h, x, y, dir) {
  if (!inBounds(x, y, w, h)) return WALL.WALL;
  const c = cells[y][x];
  if (dir === DIR.N) return c.n;
  if (dir === DIR.E) return c.e;
  if (dir === DIR.S) return c.s;
  if (dir === DIR.W) return c.w;
  return WALL.WALL;
}

function shuffleInPlace(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function furnishDungeon({ width, height, cells, start, seed }, rooms) {
  // A separate stream keeps furniture changes from changing the dungeon layout.
  const rnd = rngFromSeed(`${seed}:furniture`);
  const themes = [
    ['table', 'chair', 'bench', 'lamp'],
    ['barrel', 'crate', 'chest', 'lamp'],
    ['statue', 'urn', 'pottedPlant', 'brazier'],
    ['bookshelf', 'chair', 'pottedPlant', 'lamp'],
  ];
  const corridorKinds = ['barrel', 'urn', 'chest', 'pottedPlant', 'lamp', 'brazier', 'statue'];
  // Two corners on the same edge leave a clear 2x2 region for large creatures.
  // Keeping the center cross empty also preserves first-person walking routes.
  const edgeCorners = [
    [[0, 0], [2, 0]], [[2, 0], [2, 2]],
    [[2, 2], [0, 2]], [[0, 2], [0, 0]],
  ];
  const objects = [];
  const add = (kind, mx, my, corner, rotation) => {
    const x = mx * COMBAT_CELLS_PER_MAP_TILE + corner[0];
    const y = my * COMBAT_CELLS_PER_MAP_TILE + corner[1];
    objects.push({ id: `object:${x}:${y}`, kind, x, y, rotation });
  };
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const roomIndex = rooms.findIndex(room => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height);
      const nearStart = Math.abs(x - start.x) + Math.abs(y - start.y) <= 1;
      if (rnd.next() > (nearStart ? 1 : roomIndex >= 0 ? 0.55 : 0.27)) continue;
      const wallEdges = [DIR.N, DIR.E, DIR.S, DIR.W].filter(d => getWall(cells, width, height, x, y, d) === WALL.WALL);
      const edge = rnd.choice(wallEdges.length ? wallEdges : [DIR.N, DIR.E, DIR.S, DIR.W]);
      const corners = edgeCorners[edge];
      const kinds = roomIndex >= 0 ? themes[roomIndex % themes.length] : corridorKinds;
      // Facing inward: model fronts point toward +Z at rotation zero.
      const rotation = (4 - edge) % 4;
      const first = rnd.int(0, 1);
      const kind = nearStart && x === start.x && y === start.y ? 'lamp' : rnd.choice(kinds);
      add(kind, x, y, corners[first], rotation);
      if (nearStart || rnd.next() < (roomIndex >= 0 ? 0.45 : 0.2)) {
        add(kind === 'table' ? 'chair' : rnd.choice(kinds), x, y, corners[1 - first], rotation);
      }
    }
  }
  // Keep a two-cell-wide crossing at every open map edge. Free 2x2 pockets
  // alone are insufficient: opposing corner props can seal a dragon's route.
  const occupied = new Map(objects.map(object => [`${object.x},${object.y}`, object]));
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    for (const edge of [DIR.E, DIR.S]) {
      if (getWall(cells, width, height, x, y, edge) === WALL.WALL) continue;
      const alternatives = [0, 2].map(corner => edge === DIR.E
        ? [`${x * 3 + 2},${y * 3 + corner}`, `${x * 3 + 3},${y * 3 + corner}`]
        : [`${x * 3 + corner},${y * 3 + 2}`, `${x * 3 + corner},${y * 3 + 3}`]);
      const blockers = alternatives.map(keys => keys.filter(key => occupied.has(key)));
      if (blockers.every(keys => keys.length > 0)) {
        for (const key of blockers[blockers[0].length <= blockers[1].length ? 0 : 1]) occupied.delete(key);
      }
    }
  }
  return objects.filter(object => occupied.has(`${object.x},${object.y}`));
}

export function buildDungeon(opts = {}) {
  const width = Math.max(8, Math.min(128, Math.floor(Number.isFinite(opts.width) ? opts.width : 48)));
  const height = Math.max(8, Math.min(128, Math.floor(Number.isFinite(opts.height) ? opts.height : 32)));
  const rnd = rngFromSeed(opts.seed || 'bt3');

  const cells = Array.from({ length: height }, () => Array.from({ length: width }, createCell));

  // Ensure outer ring is closed (already walls), interior will be carved.
  const visited = Array.from({ length: height }, () => Array.from({ length: width }, () => false));

  // Pick a random interior start
  const sx = rnd.int(1, width - 2);
  const sy = rnd.int(1, height - 2);

  // DFS carve maze
  const stack = [{ x: sx, y: sy }];
  visited[sy][sx] = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const dirs = [DIR.N, DIR.E, DIR.S, DIR.W];
    shuffleInPlace(dirs, rnd);
    let carved = false;
    for (const d of dirs) {
      const nx = cur.x + DX[d];
      const ny = cur.y + DY[d];
      if (!inBounds(nx, ny, width, height)) continue;
      if (nx === 0 || ny === 0 || nx === width - 1 || ny === height - 1) continue; // keep perimeter strong
      if (!visited[ny][nx]) {
        setWall(cells, width, height, cur.x, cur.y, d, WALL.OPEN);
        visited[ny][nx] = true;
        stack.push({ x: nx, y: ny });
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }

  // Add rooms
  const rooms = [];
  const roomCount = Math.min(14, Math.max(4, Math.floor((width * height) / 200)));
  for (let r = 0; r < roomCount; r++) {
    const rw = rnd.int(3, Math.min(8, width - 2));
    const rh = rnd.int(3, Math.min(7, height - 2));
    const rx = rnd.int(1, Math.max(1, width - rw - 2));
    const ry = rnd.int(1, Math.max(1, height - rh - 2));
    rooms.push({ x: rx, y: ry, width: rw, height: rh });

    // Clear interior walls within the room to OPEN
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        // Open links inside the room horizontally/vertically
        if (x < rx + rw - 1) setWall(cells, width, height, x, y, DIR.E, WALL.OPEN);
        if (y < ry + rh - 1) setWall(cells, width, height, x, y, DIR.S, WALL.OPEN);
        visited[y][x] = true; // mark as carved
      }
    }

    // Carve 1–3 room doors on random sides
    const doorSpots = [];
    for (let x = rx; x < rx + rw; x++) { doorSpots.push({ x, y: ry, d: DIR.N }); doorSpots.push({ x, y: ry + rh - 1, d: DIR.S }); }
    for (let y = ry; y < ry + rh; y++) { doorSpots.push({ x: rx, y, d: DIR.W }); doorSpots.push({ x: rx + rw - 1, y, d: DIR.E }); }
    shuffleInPlace(doorSpots, rnd);
    const doorsToPlace = rnd.int(1, 3);
    for (let i = 0; i < doorsToPlace && i < doorSpots.length; i++) {
      const s = doorSpots[i];
      if (!inBounds(s.x, s.y, width, height)) continue;
      // Place a door if the boundary currently has a wall
      const t = getWall(cells, width, height, s.x, s.y, s.d);
      if (t !== WALL.WALL) continue;
      setWall(cells, width, height, s.x, s.y, s.d, WALL.DOOR);
    }
  }

  // Sprinkle a few doors in corridors
  const doorBudget = Math.floor((width * height) / 120);
  for (let i = 0; i < doorBudget; i++) {
    const x = rnd.int(1, width - 2);
    const y = rnd.int(1, height - 2);
    const d = rnd.choice([DIR.N, DIR.E, DIR.S, DIR.W]);
    if (getWall(cells, width, height, x, y, d) === WALL.OPEN) {
      setWall(cells, width, height, x, y, d, WALL.DOOR);
    }
  }

  // Choose start near center with at least one open neighbor
  function hasOpenNeighbor(x, y) {
    for (const d of [DIR.N, DIR.E, DIR.S, DIR.W]) {
      if (getWall(cells, width, height, x, y, d) !== WALL.WALL) return true;
    }
    return false;
  }
  let cx = Math.floor(width / 2), cy = Math.floor(height / 2);
  let start = { x: cx, y: cy, dir: DIR.N };
  let found = false;
  const maxR = Math.max(width, height);
  for (let r = 0; r <= maxR && !found; r++) {
    for (let y = Math.max(1, cy - r); y <= Math.min(height - 2, cy + r) && !found; y++) {
      for (let x = Math.max(1, cx - r); x <= Math.min(width - 2, cx + r) && !found; x++) {
        if (hasOpenNeighbor(x, y)) { start.x = x; start.y = y; found = true; }
      }
    }
  }

  const dungeon = { width, height, cells, start, seed: rnd.seed };
  return { ...dungeon, objects: furnishDungeon(dungeon, rooms) };
}

export function yawForDir(dir) {
  switch (dir) {
    case DIR.N: return 0;           // -Z in our grid-to-world mapping
    case DIR.E: return -Math.PI/2;  // +X
    case DIR.S: return Math.PI;     // +Z
    case DIR.W: return Math.PI/2;   // -X
    default: return 0;
  }
}
