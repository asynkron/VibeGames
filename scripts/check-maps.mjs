import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { parseTextMap } from '../shared/map/textMap.js';
import { LEVELS as BOULDER_LEVELS } from '../boulderdash/game/levels.js';
import { COLS as PAC_COLS, ROWS as PAC_ROWS, buildMapRows } from '../pacman/mapData.js';
import { charMap } from '../lode-runner/src/map/charMap.js';
import { COLS as LR_COLS, ROWS as LR_ROWS } from '../lode-runner/src/map/constants.js';

function checkBoulderDash() {
  const level = BOULDER_LEVELS[0];
  const grid = parseTextMap(level.map, undefined, undefined, {
    padChar: ' ',
    mapTile: (ch) => ch,
    outOfBounds: () => 'X',
  });
  let player = null;
  let exit = null;
  let gems = 0;
  grid.forEachTile((value, x, y) => {
    if (value === 'P') player = { x, y };
    else if (value === 'E') exit = { x, y };
    else if (value === '*') gems += 1;
  });
  assert.equal(grid.width, 40, 'Boulder Dash width should remain 40 tiles');
  assert.equal(grid.height, 22, 'Boulder Dash height should remain 22 tiles');
  assert.deepEqual(player, { x: 2, y: 2 }, 'Player spawn should be at (2,2)');
  assert.deepEqual(exit, { x: 37, y: 19 }, 'Exit position changed unexpectedly');
  assert.equal(gems, 15, 'Expected 15 gems in first Boulder Dash level');
  assert.equal(grid.get(-1, 0), 'X', 'Out-of-bounds tiles should read as steel');
}

function checkPacman() {
  const rows = buildMapRows();
  const grid = parseTextMap(rows.join('\n'), PAC_COLS, PAC_ROWS, {
    padChar: ' ',
    trimLines: false,
    mapTile: (ch) => ch,
    outOfBounds: () => '#',
  });
  let pellets = 0;
  let power = 0;
  let gates = 0;
  grid.forEachTile((value, x, y, ch) => {
    if (ch === '.') pellets += 1;
    else if (ch === 'o') power += 1;
    else if (ch === '-') gates += 1;
  });
  assert.equal(grid.width, PAC_COLS, 'Pac-Man map width mismatch');
  assert.equal(grid.height, PAC_ROWS, 'Pac-Man map height mismatch');
  assert.equal(pellets, 224, 'Pac-Man pellet count changed');
  assert.equal(power, 4, 'Pac-Man power pellet count changed');
  assert.equal(gates, 2, 'Pac-Man ghost gate count changed');
  assert.equal(grid.get(-1, 15), '#', 'Pac-Man tunnel edges should be treated as walls');
}

async function checkLodeRunner() {
  const levelText = await fs.readFile(new URL('../lode-runner/levels/level1.txt', import.meta.url), 'utf8');
  const grid = parseTextMap(levelText.trim(), LR_COLS, LR_ROWS, {
    lineFilter: (line) => !line.startsWith('#'),
    padChar: '=',
    mapTile: (ch) => charMap(ch),
    outOfBounds: () => 'solid',
  });
  let playerCount = 0;
  let enemyCount = 0;
  let goldCount = 0;
  let playerPos = null;
  grid.forEachTile((type, x, y) => {
    if (type === 'player') {
      playerCount += 1;
      playerPos = { x, y };
    } else if (type === 'enemy') {
      enemyCount += 1;
    } else if (type === 'gold') {
      goldCount += 1;
    }
  });
  assert.equal(grid.width, LR_COLS, 'Lode Runner map width mismatch');
  assert.equal(grid.height, LR_ROWS, 'Lode Runner map height mismatch');
  assert.equal(playerCount, 1, 'Expected exactly one player spawn in Lode Runner level 1');
  assert.deepEqual(playerPos, { x: 3, y: 13 }, 'Unexpected Lode Runner player spawn position');
  assert.equal(enemyCount, 1, 'Expected one enemy spawn in Lode Runner level 1');
  assert.equal(goldCount, 7, 'Unexpected gold count in Lode Runner level 1');
  assert.equal(grid.get(-1, 0), 'solid', 'Out-of-bounds Lode Runner tiles should be solid');
}

async function main() {
  checkBoulderDash();
  checkPacman();
  await checkLodeRunner();
  console.log('All map regression checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
