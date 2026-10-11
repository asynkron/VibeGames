import * as THREE from 'three';
import { WALL } from '../dungeon.js';
import { createVoxelSurfaces } from './voxelSurface.js';
import { MASONRY_VOXELS_PER_TILE, assembleMasonryModel } from './voxelMasonryModels.js';
import { createVoxelMaterial } from './voxelMaterials.js';
import { assembleLandscapeModel } from './voxelLandscapeModels.js';
import { assembleBuildingModel } from './voxelBuildingModels.js';
import { getEnvironment } from '../environments.js';

const CHUNK_TILES = 8;
const VARIANT_COUNT = 4;
const COMBAT_WALL_VOXELS = 60;
const VOXEL_SIZE = 1 / MASONRY_VOXELS_PER_TILE;
const LAYERS = ['floor', 'lower', 'upper', 'ceiling'];
const STONE_REGIONS = Object.freeze([
  [0.76, 0.87, 1.00], // Blue slate and cool quartz.
  [1.00, 0.96, 0.84], // Warm limestone.
  [1.00, 0.81, 0.69], // Iron-rich sandstone.
  [0.79, 0.91, 0.84], // Damp, moss-stained stone.
  [0.94, 0.85, 0.90], // Muted violet shale.
]);
const REGION_TILES = 6;

function seedHash(seed) {
  let hash = 2166136261;
  for (const letter of String(seed)) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Chunked voxel terrain and architecture shared by exploration and combat. */
export function createVoxelWorld(parent, state) {
  const group = new THREE.Group();
  group.name = 'voxel-world';
  group.userData.tileCount = state.width * state.height;
  group.userData.wallCount = 0;
  group.userData.doorCount = 0;
  parent.add(group);

  const environment = getEnvironment(state.environment);
  const materials = new Map();
  const materialFor = kind => {
    if (!materials.has(kind)) materials.set(kind, createVoxelMaterial(kind));
    return materials.get(kind);
  };
  const prototypes = new Map();
  const chunks = new Map();
  const batches = [];
  const transform = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3().setScalar(VOXEL_SIZE);
  const floorOrigin = new THREE.Matrix4().makeTranslation(-MASONRY_VOXELS_PER_TILE / 2, 0, -MASONRY_VOXELS_PER_TILE / 2);
  const seed = seedHash(state.seed);
  let disposed = false;

  function variantAt(x, z, salt) {
    let hash = seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(z + 1, 668265263) ^ salt;
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    return (hash ^ (hash >>> 16)) >>> 0;
  }

  function regionColorAt(x, z) {
    if (environment.id !== 'dungeon') return new THREE.Color(0xffffff);
    const px = x / REGION_TILES, pz = z / REGION_TILES;
    const x0 = Math.floor(px), z0 = Math.floor(pz);
    const smooth = value => value * value * (3 - 2 * value);
    const u = smooth(px - x0), v = smooth(pz - z0);
    const sample = (sx, sz) => new THREE.Color().setRGB(...STONE_REGIONS[variantAt(sx, sz, 0x68bc21eb) % STONE_REGIONS.length]);
    return sample(x0, z0).lerp(sample(x0 + 1, z0), u)
      .lerp(sample(x0, z0 + 1).lerp(sample(x0 + 1, z0 + 1), u), v);
  }

  function chunkAt(x, z) {
    const cx = Math.floor(x / CHUNK_TILES), cz = Math.floor(z / CHUNK_TILES);
    const key = `${cx},${cz}`;
    let chunk = chunks.get(key);
    if (chunk) return chunk;
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `voxel-world-chunk-${key}`;
    chunkGroup.position.set(cx * CHUNK_TILES, 0, cz * CHUNK_TILES);
    group.add(chunkGroup);
    const layers = Object.fromEntries(LAYERS.map(name => {
      const layer = new THREE.Group();
      layer.name = `terrain-${name}`;
      chunkGroup.add(layer);
      return [name, layer];
    }));
    const bounds = {
      minX: cx * CHUNK_TILES - 0.1,
      maxX: Math.min((cx + 1) * CHUNK_TILES, state.width) + 0.1,
      minZ: cz * CHUNK_TILES - 0.1,
      maxZ: Math.min((cz + 1) * CHUNK_TILES, state.height) + 0.1,
    };
    chunkGroup.userData.bounds = bounds;
    chunk = { group: chunkGroup, layers, bounds, entries: new Map() };
    chunks.set(key, chunk);
    return chunk;
  }

  function sourceKey(source) {
    return source.building ? `house:${source.building.style}:${source.building.stories}` : environment.id;
  }

  function addInstance(chunk, source, kind, variant, layer, matrix, color) {
    if (source.building) variant = 0;
    const key = `${sourceKey(source)}:${kind}:${variant}:${layer}`;
    if (!chunk.entries.has(key)) chunk.entries.set(key, { source, kind, variant, layer, instances: [] });
    chunk.entries.get(key).instances.push({ matrix: matrix.clone(), color });
  }

  function addHorizontal(chunk, kind, x, z, source) {
    const hash = variantAt(x, z, kind === 'floor' ? 0x4f1bbcdc : 0x165667b1);
    const elevation = kind === 'roof' ? source.building.stories : kind === 'ceiling' ? 1 : 0;
    position.set(x + 0.5 - chunk.group.position.x, elevation, z + 0.5 - chunk.group.position.z);
    rotation.setFromAxisAngle(up, source.building ? 0 : (hash % 4) * Math.PI / 2);
    transform.compose(position, rotation, scale).multiply(floorOrigin);
    addInstance(chunk, source, kind, (hash >>> 2) % VARIANT_COUNT, kind === 'roof' ? 'upper' : kind,
      transform, regionColorAt(x + 0.5, z + 0.5));
  }

  function addEdge(chunk, x, z, vertical, type, first, second) {
    if (type === WALL.OPEN) return;
    const kind = type === WALL.DOOR ? 'door' : 'wall';
    const source = first?.building ? first : second?.building ? second : {};
    group.userData[kind === 'door' ? 'doorCount' : 'wallCount']++;
    position.set(x - chunk.group.position.x, 0, z - chunk.group.position.z);
    rotation.setFromAxisAngle(up, vertical ? -Math.PI / 2 : 0);
    transform.compose(position, rotation, scale);
    const variant = variantAt(x, z, vertical ? 0x27d4eb2f : 0x85ebca6b) % VARIANT_COUNT;
    const color = regionColorAt(x + (vertical ? 0 : 0.5), z + (vertical ? 0.5 : 0));
    addInstance(chunk, source, kind, variant, 'lower', transform, color);
    addInstance(chunk, source, kind, variant, 'upper', transform, color);
  }

  for (let z = 0; z < state.height; z++) {
    for (let x = 0; x < state.width; x++) {
      const chunk = chunkAt(x, z);
      const cell = state.cells[z][x];
      addHorizontal(chunk, 'floor', x, z, cell);
      if (!environment.outdoors || cell.building) addHorizontal(chunk, 'ceiling', x, z, cell);
      if (cell.building) addHorizontal(chunk, 'roof', x, z, cell);
      addEdge(chunk, x, z, false, cell.n, cell, state.cells[z - 1]?.[x]);
      addEdge(chunk, x, z, true, cell.w, cell, state.cells[z][x - 1]);
      if (x === state.width - 1) addEdge(chunk, x + 1, z, true, cell.e, cell);
      if (z === state.height - 1) addEdge(chunk, x, z + 1, false, cell.s, cell);
    }
  }

  function prototypeFor(source, kind, variant, layer) {
    const key = `${sourceKey(source)}:${kind}:${source.building ? 0 : variant}:${layer}`;
    if (prototypes.has(key)) return prototypes.get(key);
    const model = source.building ? assembleBuildingModel(kind, source.building.style, source.building.stories)
      : environment.id === 'dungeon' ? assembleMasonryModel(kind, variant)
      : assembleLandscapeModel(environment.id, kind, variant);
    const { voxels } = model;
    const isWall = kind === 'wall' || kind === 'door';
    const visible = isWall && layer === 'lower' ? voxels.filter(voxel => voxel.y < COMBAT_WALL_VOXELS)
      : isWall && layer === 'upper' ? voxels.filter(voxel => voxel.y >= COMBAT_WALL_VOXELS) : voxels;
    const surfaces = createVoxelSurfaces(visible);
    prototypes.set(key, surfaces);
    return surfaces;
  }

  for (const chunk of chunks.values()) {
    for (const { source, kind, variant, layer, instances } of chunk.entries.values()) {
      for (const { geometry, material } of prototypeFor(source, kind, variant, layer)) {
        const mesh = new THREE.InstancedMesh(geometry, materialFor(material), instances.length);
        mesh.name = `terrain-${kind}-${variant}-${layer}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        instances.forEach(({ matrix, color }, index) => {
          mesh.setMatrixAt(index, matrix);
          mesh.setColorAt(index, color);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
        chunk.layers[layer].add(mesh);
        batches.push(mesh);
      }
    }
    chunk.entries.clear();
  }
  group.userData.chunkCount = chunks.size;
  group.userData.prototypeCount = prototypes.size;

  function setCombat(active) {
    if (disposed) return;
    group.userData.combat = Boolean(active);
    for (const chunk of chunks.values()) {
      chunk.layers.upper.visible = !active;
      chunk.layers.ceiling.visible = !active;
    }
  }

  function update({ focus, radius }) {
    if (disposed) return;
    const radiusSquared = radius * radius;
    for (const chunk of chunks.values()) {
      const { minX, maxX, minZ, maxZ } = chunk.bounds;
      const dx = Math.max(minX - focus.x, 0, focus.x - maxX);
      const dz = Math.max(minZ - focus.z, 0, focus.z - maxZ);
      chunk.group.visible = dx * dx + dz * dz <= radiusSquared;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    for (const mesh of batches) mesh.dispose();
    for (const surfaces of prototypes.values()) for (const { geometry } of surfaces) geometry.dispose();
    for (const material of materials.values()) material.dispose();
    materials.clear();
    group.clear();
    chunks.clear();
    prototypes.clear();
    batches.length = 0;
  }

  return { group, setCombat, update, dispose };
}
