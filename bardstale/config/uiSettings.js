// Every interface coordinate is an 8×8 character cell in this native bitmap.
const TILE_SIZE = 8;
const COLUMNS = 80;
const ROWS = 50;

export const UI_SETTINGS = Object.freeze({
  tileSize: TILE_SIZE,
  columns: COLUMNS,
  rows: ROWS,
  resolution: Object.freeze({ width: COLUMNS * TILE_SIZE, height: ROWS * TILE_SIZE }),
  colors: Object.freeze({
    background: '#000000',
    text: '#ffffff',
    cyan: '#55ffff',
    green: '#55ff55',
    yellow: '#ffff55',
    red: '#f46a64',
  }),
  layout: Object.freeze({
    dividerColumn: 33,
    dividerRow: 33,
    viewport: Object.freeze({ column: 1, row: 1, columns: 32, rows: 32 }),
  }),
  combatLayout: Object.freeze({
    dividerColumn: 46,
    viewport: Object.freeze({ column: 1, row: 1, columns: 45, rows: 48 }),
  }),
});
