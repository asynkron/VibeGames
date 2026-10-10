// Later parts own shared cells, so equipment can sit over clothing and anatomy.
export const VOXEL_PART_SLOTS = Object.freeze([
  'torso', 'legs', 'arms', 'head', 'back', 'shoulders', 'hands', 'feet',
  'waist', 'neck', 'ring1', 'ring2', 'offhand', 'mainhand',
]);

const AXES = ['x', 'y', 'z'];
const JOINTS = new Set(['body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg']);
const cellKey = ({ x, y, z }) => `${x},${y},${z}`;

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a nonempty string.`);
  }
}

function requireCoordinates(value, label) {
  for (const axis of AXES) {
    if (!Number.isSafeInteger(value?.[axis])) {
      throw new RangeError(`${label}.${axis} must be a safe integer.`);
    }
  }
}

function measure(voxels) {
  const min = { x: 0, y: 0, z: 0 };
  const max = { x: 0, y: 0, z: 0 };
  if (voxels.length) {
    for (const axis of AXES) {
      min[axis] = Infinity;
      max[axis] = -Infinity;
    }
    for (const voxel of voxels) for (const axis of AXES) {
      min[axis] = Math.min(min[axis], voxel[axis]);
      max[axis] = Math.max(max[axis], voxel[axis] + 1);
    }
  }
  return {
    bounds: Object.freeze({ min: Object.freeze(min), max: Object.freeze(max) }),
    dimensions: Object.freeze({ width: max.x - min.x, height: max.y - min.y, depth: max.z - min.z }),
  };
}

/** An immutable anatomical or equipment asset, with no prescribed volume. */
export function defineVoxelPart({ id, name, voxels }) {
  requireText(id, 'Part id');
  requireText(name, 'Part name');
  if (!Array.isArray(voxels)) throw new TypeError('Part voxels must be an array.');
  const occupied = new Set();
  const cells = voxels.map(voxel => {
    requireCoordinates(voxel, 'Voxel');
    if (typeof voxel.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(voxel.color)) {
      throw new TypeError('Voxel color must be a six-digit hex color.');
    }
    requireText(voxel.material, 'Voxel material');
    if (voxel.joint !== undefined && !JOINTS.has(voxel.joint)) throw new RangeError(`Unknown voxel joint: ${voxel.joint}.`);
    const key = cellKey(voxel);
    if (occupied.has(key)) throw new Error(`Duplicate voxel at ${key}.`);
    occupied.add(key);
    return Object.freeze({ x: voxel.x, y: voxel.y, z: voxel.z, color: voxel.color, material: voxel.material,
      ...(voxel.joint === undefined ? {} : { joint: voxel.joint }) });
  });
  return Object.freeze({ id, name, voxels: Object.freeze(cells), ...measure(cells) });
}

/** Each named slot references one complete asset with an optional integer offset. */
export function createCharacterRecipe({ id, parts = {} }) {
  requireText(id, 'Character id');
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)) throw new TypeError('Character parts must be an object.');
  for (const slot of Object.keys(parts)) {
    if (!VOXEL_PART_SLOTS.includes(slot)) throw new Error(`Unknown part slot: ${slot}.`);
  }
  const references = {};
  for (const slot of VOXEL_PART_SLOTS) {
    const reference = parts[slot];
    if (reference == null) {
      references[slot] = null;
      continue;
    }
    requireText(reference.partId, `${slot} part reference`);
    const offset = reference.offset ?? { x: 0, y: 0, z: 0 };
    requireCoordinates(offset, `${slot} offset`);
    references[slot] = Object.freeze({
      partId: reference.partId,
      offset: Object.freeze({ x: offset.x, y: offset.y, z: offset.z }),
    });
  }
  return Object.freeze({ id, parts: Object.freeze(references) });
}

/** Resolve complete parts while retaining their cells for independent editing. */
export function assembleVoxelCharacter(recipe, library) {
  if (!(library instanceof Map)) throw new TypeError('Part library must be a Map.');
  const normalized = createCharacterRecipe(recipe);
  const assets = new Map();
  const parts = {};
  const visible = new Map();
  let partCount = 0;
  for (const slot of VOXEL_PART_SLOTS) {
    const reference = normalized.parts[slot];
    if (reference === null) {
      parts[slot] = null;
      continue;
    }
    const { partId, offset } = reference;
    if (!assets.has(partId)) {
      const asset = library.get(partId);
      if (!asset) throw new Error(`Unknown part: ${partId}.`);
      if (asset.id !== partId) throw new Error(`Part id does not match reference: ${partId}.`);
      assets.set(partId, defineVoxelPart(asset));
    }
    const cells = assets.get(partId).voxels.map(voxel => {
      const cell = { ...voxel, x: voxel.x + offset.x, y: voxel.y + offset.y, z: voxel.z + offset.z, slot, partId };
      requireCoordinates(cell, `${slot} translated voxel`);
      const frozen = Object.freeze(cell);
      visible.set(cellKey(frozen), frozen);
      return frozen;
    });
    parts[slot] = Object.freeze({ partId, offset, voxels: Object.freeze(cells), ...measure(cells) });
    partCount += 1;
  }
  const voxels = Object.freeze([...visible.values()]);
  return Object.freeze({ id: normalized.id, parts: Object.freeze(parts), voxels, partCount, ...measure(voxels) });
}
