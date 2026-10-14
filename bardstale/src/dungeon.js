export const DIR = { N: 0, E: 1, S: 2, W: 3 };
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const WALL = { OPEN: 0, WALL: 1, DOOR: 2 };

export function leftOf(dir) { return (dir + 3) % 4; }
export function rightOf(dir) { return (dir + 1) % 4; }
export function backOf(dir) { return (dir + 2) % 4; }
export function inBounds(x, y, w, h) { return x >= 0 && x < w && y >= 0 && y < h; }

export function getWall(cells, w, h, x, y, dir) {
  if (!inBounds(x, y, w, h)) return WALL.WALL;
  const c = cells[y][x];
  if (dir === DIR.N) return c.n;
  if (dir === DIR.E) return c.e;
  if (dir === DIR.S) return c.s;
  if (dir === DIR.W) return c.w;
  return WALL.WALL;
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
