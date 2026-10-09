export const BLOCK_SIZE = 8;
export const BLOCK_GRID_SIZE = 3;
export const CHARACTER_SIZE = BLOCK_SIZE * BLOCK_GRID_SIZE;

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a nonempty string.`);
  }
}

function requireCoordinates(value, size, label) {
  for (const axis of ['x', 'y', 'z']) {
    if (!Number.isInteger(value[axis]) || value[axis] < 0 || value[axis] >= size) {
      throw new RangeError(`${label}.${axis} must be an integer from 0 to ${size - 1}.`);
    }
  }
}

/** An immutable, reusable tile of occupied cells in an 8 × 8 × 8 volume. */
export function defineVoxelBlock({ id, name, voxels }) {
  requireText(id, 'Block id');
  requireText(name, 'Block name');
  if (!Array.isArray(voxels) || voxels.length > BLOCK_SIZE ** 3) {
    throw new RangeError('A block must contain an array of at most 512 voxels.');
  }
  const occupied = new Set();
  const cells = voxels.map(voxel => {
    requireCoordinates(voxel, BLOCK_SIZE, 'Voxel');
    if (typeof voxel.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(voxel.color)) {
      throw new TypeError('Voxel color must be a six-digit hex color.');
    }
    requireText(voxel.material, 'Voxel material');
    const key = `${voxel.x},${voxel.y},${voxel.z}`;
    if (occupied.has(key)) throw new Error(`Duplicate voxel at ${key}.`);
    occupied.add(key);
    return Object.freeze({ x: voxel.x, y: voxel.y, z: voxel.z, color: voxel.color, material: voxel.material });
  });
  return Object.freeze({ id, name, voxels: Object.freeze(cells) });
}

/** Slots are ordered by x + 3 * (y + 3 * z); null references mean empty space. */
export function createCharacterRecipe({ id, placements }) {
  requireText(id, 'Character id');
  if (!Array.isArray(placements)) throw new TypeError('Placements must be an array.');
  const slots = Array.from({ length: BLOCK_GRID_SIZE ** 3 }, (_, index) => ({
    x: index % BLOCK_GRID_SIZE,
    y: Math.floor(index / BLOCK_GRID_SIZE) % BLOCK_GRID_SIZE,
    z: Math.floor(index / (BLOCK_GRID_SIZE ** 2)),
    blockId: null,
  }));
  for (const placement of placements) {
    requireCoordinates(placement, BLOCK_GRID_SIZE, 'Block slot');
    requireText(placement.blockId, 'Block reference');
    const index = placement.x + BLOCK_GRID_SIZE * (placement.y + BLOCK_GRID_SIZE * placement.z);
    if (slots[index].blockId !== null) throw new Error(`Duplicate block slot at ${placement.x},${placement.y},${placement.z}.`);
    slots[index].blockId = placement.blockId;
  }
  return Object.freeze({ id, slots: Object.freeze(slots.map(Object.freeze)) });
}

/** Resolve a recipe without changing its assets; voxel coordinates remain integers. */
export function assembleVoxelCharacter(recipe, library) {
  requireText(recipe.id, 'Character id');
  if (!(library instanceof Map)) throw new TypeError('Block library must be a Map.');
  if (!Array.isArray(recipe.slots) || recipe.slots.length !== BLOCK_GRID_SIZE ** 3) {
    throw new RangeError('A character recipe must contain exactly 27 slots.');
  }
  for (const [index, slot] of recipe.slots.entries()) {
    requireCoordinates(slot, BLOCK_GRID_SIZE, 'Block slot');
    const expected = slot.x + BLOCK_GRID_SIZE * (slot.y + BLOCK_GRID_SIZE * slot.z);
    if (expected !== index) throw new Error('Recipe slots must use canonical coordinate order.');
    if (slot.blockId !== null) requireText(slot.blockId, 'Block reference');
  }
  const normalized = createCharacterRecipe({ id: recipe.id, placements: recipe.slots.filter(slot => slot.blockId !== null) });
  const voxels = [];
  const assets = new Map();
  let occupiedBlockCount = 0;
  for (const slot of normalized.slots) {
    if (slot.blockId === null) continue;
    if (!assets.has(slot.blockId)) {
      const asset = library.get(slot.blockId);
      if (!asset) throw new Error(`Unknown block: ${slot.blockId}.`);
      if (asset.id !== slot.blockId) throw new Error(`Block id does not match reference: ${slot.blockId}.`);
      assets.set(slot.blockId, defineVoxelBlock(asset));
    }
    occupiedBlockCount += 1;
    for (const voxel of assets.get(slot.blockId).voxels) {
      voxels.push(Object.freeze({
        ...voxel,
        x: slot.x * BLOCK_SIZE + voxel.x,
        y: slot.y * BLOCK_SIZE + voxel.y,
        z: slot.z * BLOCK_SIZE + voxel.z,
        blockId: slot.blockId,
        blockX: slot.x,
        blockY: slot.y,
        blockZ: slot.z,
      }));
    }
  }
  return Object.freeze({
    id: normalized.id,
    slots: normalized.slots,
    voxels: Object.freeze(voxels),
    occupiedBlockCount,
    dimensions: Object.freeze({ width: CHARACTER_SIZE, height: CHARACTER_SIZE, depth: CHARACTER_SIZE }),
  });
}
