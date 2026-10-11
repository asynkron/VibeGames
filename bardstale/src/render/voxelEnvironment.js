import * as THREE from 'three';
import { COMBAT_CELLS_PER_MAP_TILE } from '../../config/combatSettings.js';
import { OBJECT_DEFINITIONS } from '../worldObjects.js';
import { VOXEL_MATERIALS } from './voxelCharacterParts.js';
import { createVoxelMaterial } from './voxelMaterials.js';
import { assembleVoxelObjectModel } from './voxelObjectCatalog.js';
import { createVoxelSurfaces } from './voxelSurface.js';
import { WALL } from '../dungeon.js';
import { MASONRY_VOXELS_PER_TILE, MASONRY_WALL_HALF_DEPTH } from './voxelMasonryModels.js';

const CHUNK_MAP_TILES = 8;
const MAX_LIGHTS = 4;

/** Static prop geometry is shared by kind, with instance batches small enough to cull. */
export function createVoxelEnvironment(parent, dungeon, { cellSize }) {
  const { objects } = dungeon;
  const group = new THREE.Group();
  group.name = 'voxel-environment';
  group.userData.objectCount = objects.length;
  parent.add(group);
  const voxelSize = 0.04 * cellSize;
  const chunkCells = CHUNK_MAP_TILES * COMBAT_CELLS_PER_MAP_TILE;
  const chunkSize = chunkCells * cellSize;
  const prototypes = new Map();
  const chunks = new Map();
  const batches = [];
  const materials = Object.fromEntries(Object.keys(VOXEL_MATERIALS).map(kind => [kind, createVoxelMaterial(kind)]));
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3().setScalar(voxelSize);
  const rotation = new THREE.Quaternion();
  const vertical = new THREE.Vector3(0,1,0);
  let maxLightRange = 0;
  let disposed = false;

  function prototypeFor(kind) {
    if (prototypes.has(kind)) return prototypes.get(kind);
    const model = assembleVoxelObjectModel(kind);
    for (const voxel of model.assembly.voxels) {
      if (!materials[voxel.material]) throw new Error(`Unknown voxel material: ${voxel.material}`);
    }
    const { min,max } = model.assembly.bounds;
    const origin = new THREE.Matrix4().makeTranslation(-(min.x+max.x)/2,-min.y,-(min.z+max.z)/2);
    const cutawayHeight = OBJECT_DEFINITIONS[kind].cutawayHeight;
    const surfaces = cutawayHeight === undefined ? createVoxelSurfaces(model.assembly.voxels)
      : [false, true].flatMap(upper => createVoxelSurfaces(model.assembly.voxels.filter(voxel =>
        (voxel.y >= cutawayHeight) === upper)).map(surface => ({ ...surface, upper })));
    const footprintVoxels = cutawayHeight === undefined ? model.assembly.voxels
      : model.assembly.voxels.filter(voxel => voxel.y < cutawayHeight);
    const span = axis => Math.max(...footprintVoxels.map(voxel => voxel[axis] + 1)) - Math.min(...footprintVoxels.map(voxel => voxel[axis]));
    const prototype = { surfaces,origin,lightAnchor:model.lightAnchor,
      width:span('x')*voxelSize,depth:span('z')*voxelSize };
    prototypes.set(kind,prototype);
    return prototype;
  }

  for (const object of objects) {
    const x = Math.floor(object.x/chunkCells), z = Math.floor(object.y/chunkCells);
    const key = `${x},${z}`;
    let chunk = chunks.get(key);
    if (!chunk) {
      const chunkGroup = new THREE.Group();
      chunkGroup.name = `voxel-environment-chunk-${key}`;
      chunkGroup.position.set(x*chunkSize,0,z*chunkSize);
      group.add(chunkGroup);
      chunk = { group:chunkGroup,kinds:new Map(),lights:[] };
      chunks.set(key,chunk);
    }
    if (!chunk.kinds.has(object.kind)) chunk.kinds.set(object.kind,[]);
    chunk.kinds.get(object.kind).push(object);
  }

  for (const chunk of chunks.values()) {
    for (const [kind,entries] of chunk.kinds) {
      const prototype = prototypeFor(kind);
      const ids = entries.map(object=>object.id);
      const meshes = prototype.surfaces.map(({ material,geometry,upper }) => {
        const mesh = new THREE.InstancedMesh(geometry,materials[material],entries.length);
        mesh.name = `voxel-object-${kind}-${material}`;
        mesh.userData.objectIds = ids;
        mesh.userData.cutaway = Boolean(upper);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        chunk.group.add(mesh);
        batches.push(mesh);
        return mesh;
      });
      entries.forEach((object,index) => {
        position.set((object.x+0.5)*cellSize-chunk.group.position.x,0,(object.y+0.5)*cellSize-chunk.group.position.z);
        const tileX = Math.floor(object.x / COMBAT_CELLS_PER_MAP_TILE);
        const tileY = Math.floor(object.y / COMBAT_CELLS_PER_MAP_TILE);
        const tile = dungeon.cells[tileY][tileX];
        const localX = object.x % COMBAT_CELLS_PER_MAP_TILE;
        const localY = object.y % COMBAT_CELLS_PER_MAP_TILE;
        const halfX = (object.rotation % 2 ? prototype.depth : prototype.width) / 2;
        const halfZ = (object.rotation % 2 ? prototype.width : prototype.depth) / 2;
        const wallDepth = (dungeon.environment === 'dungeon' ? MASONRY_WALL_HALF_DEPTH : 5) / MASONRY_VOXELS_PER_TILE;
        const insetX = Math.max(0, wallDepth + halfX - cellSize / 2);
        const insetZ = Math.max(0, wallDepth + halfZ - cellSize / 2);
        if (localX === 0 && tile.w !== WALL.OPEN) position.x += insetX;
        if (localX === COMBAT_CELLS_PER_MAP_TILE - 1 && tile.e !== WALL.OPEN) position.x -= insetX;
        if (localY === 0 && tile.n !== WALL.OPEN) position.z += insetZ;
        if (localY === COMBAT_CELLS_PER_MAP_TILE - 1 && tile.s !== WALL.OPEN) position.z -= insetZ;
        rotation.setFromAxisAngle(vertical,object.rotation*Math.PI/2);
        matrix.compose(position,rotation,scale).multiply(prototype.origin);
        for (const mesh of meshes) mesh.setMatrixAt(index,matrix);
        const light = OBJECT_DEFINITIONS[kind].light;
        if (light) {
          const anchor = new THREE.Vector3().fromArray(prototype.lightAnchor).applyMatrix4(matrix).add(chunk.group.position);
          let phase = 0;
          for (const letter of object.id) phase = (phase*31+letter.charCodeAt(0))>>>0;
          chunk.lights.push({ ...light,position:anchor,phase:phase%628/100,id:object.id });
          maxLightRange = Math.max(maxLightRange,light.range);
        }
      });
      for (const mesh of meshes) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
    chunk.kinds.clear();
  }

  // Keep the shader light count fixed as the party moves past different lamps.
  const lights = Array.from({ length:MAX_LIGHTS },(_,index) => {
    const light = new THREE.PointLight(0xffc87a,0,1,2);
    light.name = `voxel-environment-light-${index}`;
    light.castShadow = false;
    group.add(light);
    return light;
  });
  const nearest = new Array(MAX_LIGHTS).fill(null);
  const distances = new Array(MAX_LIGHTS).fill(Infinity);

  function setCombat(active) {
    for (const mesh of batches) if (mesh.userData.cutaway) mesh.visible = !active;
  }

  function update({ now,focus,radius = 20 }) {
    if (disposed) return;
    for (const chunk of chunks.values()) {
      const dx = Math.max(chunk.group.position.x - focus.x, 0, focus.x - chunk.group.position.x - chunkSize);
      const dz = Math.max(chunk.group.position.z - focus.z, 0, focus.z - chunk.group.position.z - chunkSize);
      chunk.group.visible = dx * dx + dz * dz <= radius * radius;
    }
    nearest.fill(null);
    distances.fill(Infinity);
    const minX = Math.floor((focus.x-maxLightRange)/chunkSize);
    const maxX = Math.floor((focus.x+maxLightRange)/chunkSize);
    const minZ = Math.floor((focus.z-maxLightRange)/chunkSize);
    const maxZ = Math.floor((focus.z+maxLightRange)/chunkSize);
    for (let x=minX;x<=maxX;x++) for (let z=minZ;z<=maxZ;z++) {
      const chunk = chunks.get(`${x},${z}`);
      if (!chunk) continue;
      for (const source of chunk.lights) {
        const distance = (source.position.x-focus.x)**2+(source.position.z-focus.z)**2;
        if (distance>=source.range**2 || distance>=distances[MAX_LIGHTS-1]) continue;
        let index = MAX_LIGHTS-1;
        while (index>0 && distance<distances[index-1]) {
          nearest[index] = nearest[index-1];
          distances[index] = distances[index-1];
          index--;
        }
        nearest[index] = source;
        distances[index] = distance;
      }
    }
    for (let index=0;index<MAX_LIGHTS;index++) {
      const light = lights[index], source = nearest[index];
      if (!source) {
        light.intensity = 0;
        delete light.userData.objectId;
        continue;
      }
      const fade = Math.min(1,(1-Math.sqrt(distances[index])/source.range)/0.2);
      const flicker = 1+Math.sin(now*0.003+source.phase)*0.035;
      light.position.copy(source.position);
      light.color.set(source.color);
      light.distance = source.range;
      light.intensity = source.intensity*fade*flicker;
      light.userData.objectId = source.id;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    for (const mesh of batches) mesh.dispose();
    for (const prototype of prototypes.values()) for (const {geometry} of prototype.surfaces) geometry.dispose();
    for (const material of Object.values(materials)) material.dispose();
    group.clear();
    chunks.clear();
    prototypes.clear();
    batches.length = 0;
    nearest.fill(null);
  }

  return { group,setCombat,update,dispose };
}
