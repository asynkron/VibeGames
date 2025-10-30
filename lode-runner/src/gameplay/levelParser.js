import { COLS, ROWS } from './constants.js';

const SYMBOL_MAP = new Map([
  ['=', 'solid'],
  ['X', 'brick'],
  ['L', 'ladder'],
  ['-', 'rope'],
  ['G', 'gold'],
  ['P', 'player'],
  ['E', 'enemy'],
  ['O', 'exit'],
]);

export function parseLevel(source) {
  const lines = source
    .split(/\r?\n/g)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new Error('Level has no playable rows');
  }

  if (lines.length !== ROWS) {
    throw new Error(`Expected ${ROWS} rows but received ${lines.length}`);
  }

  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
  let playerSpawn = null;
  const enemySpawns = [];
  let exitHint = null;

  for (let row = 0; row < ROWS; row += 1) {
    const line = lines[row];
    if (line.length !== COLS) {
      throw new Error(`Row ${row + 1} has length ${line.length} (expected ${COLS})`);
    }
    for (let col = 0; col < COLS; col += 1) {
      const symbol = line[col];
      const type = SYMBOL_MAP.get(symbol) ?? 'empty';
      grid[row][col] = type;
      if (type === 'player') {
        playerSpawn = { row, col };
        grid[row][col] = 'empty';
      } else if (type === 'enemy') {
        enemySpawns.push({ row, col });
        grid[row][col] = 'empty';
      } else if (type === 'exit') {
        exitHint = { row, col };
        grid[row][col] = 'empty';
      }
    }
  }

  if (!playerSpawn) {
    throw new Error('Level is missing a player spawn (P)');
  }

  return {
    grid,
    playerSpawn,
    enemySpawns,
    exitHint,
  };
}
