const SINGLE_CELL = Object.freeze({ width: 1, height: 1 });
const LARGE_BODY = Object.freeze({ width: 2, height: 2 });

export function footprintForKind(kind) {
  return ['dragon', 'ogre', 'troll'].includes(String(kind ?? '').trim().toLowerCase()) ? LARGE_BODY : SINGLE_CELL;
}

export function normalizeFootprint(value) {
  if (value === undefined) return SINGLE_CELL;
  if (!value || !Number.isInteger(value.width) || !Number.isInteger(value.height)
    || value.width <= 0 || value.height <= 0) {
    throw new RangeError('A combat footprint needs positive integer width and height.');
  }
  return Object.freeze({ width: value.width, height: value.height });
}

export function footprintCells(unit, x = unit.x, y = unit.y) {
  const { width, height } = normalizeFootprint(unit.footprint);
  const result = [];
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) result.push({ x: x + dx, y: y + dy });
  }
  return result;
}

export function footprintCenter(unit) {
  const { width, height } = normalizeFootprint(unit.footprint);
  return { x: unit.x + width / 2, y: unit.y + height / 2 };
}

export function occupiesCell(unit, x, y) {
  const { width, height } = normalizeFootprint(unit.footprint);
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= unit.x && x < unit.x + width && y >= unit.y && y < unit.y + height;
}
