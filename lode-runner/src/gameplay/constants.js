export const TILE_SIZE = 32;
export const COLS = 28;
export const ROWS = 16;

export const WORLD_WIDTH = COLS * TILE_SIZE;
export const WORLD_HEIGHT = ROWS * TILE_SIZE;

export const HOLE_LIFETIME_MS = 3800;
export const HOLE_WARNING_MS = 700;

export const PLAYER_SPEED = {
  run: 190,
  climb: 120,
  rope: 150,
  jump: 320,
  fall: 460,
};

export const ENEMY_SPEED = {
  run: 120,
  climb: 95,
  rope: 110,
};

export const ENEMY_RESPAWN_DELAY = 600;

export const LEVEL_KEYS = ['levels/level1.txt', 'levels/level2.txt', 'levels/level3.txt'];
