import * as THREE from 'three';
import { getWorldAreaDefinition } from '../worldAreas.js';
import { createWorldLabel } from './worldLabels.js';
import { createVoxelSurfaces } from './voxelSurface.js';
import { createVoxelMaterial } from './voxelMaterials.js';

const VOXEL_SIZE = 1 / 75;
const DESTINATION_COLORS = Object.freeze({
  dungeon: '#b4a0d2',
  cave: '#70cbd4',
  forest: '#a1c77b',
  village: '#e4bb77',
});

function markerVoxels(color) {
  const cells = new Map();
  function put(x, y, z, paint, material) {
    cells.set(`${x},${y},${z}`, { x, y, z, color: paint, material });
  }
  for (let x = -27; x <= 27; x++) for (let z = -27; z <= 27; z++) {
    const distance = Math.abs(x) + Math.abs(z);
    const edge = Math.max(Math.abs(x), Math.abs(z));
    if (distance > 42) continue;
    const border = edge >= 24 || distance >= 38;
    if (!border) continue;
    put(x, -2, z, '#59616a', 'stone');
    put(x, -1, z, (x + z + 108) % 17 < 2 ? '#bdc2bb' : '#8f9b98', 'stone');
  }
  // Four inset compass arrows point outward; all geometry is flush with the path.
  for (let direction = 0; direction < 4; direction++) {
    for (let distance = 7; distance <= 20; distance++) {
      const width = distance <= 13 ? 2 : Math.floor((20 - distance) / 2) + 1;
      for (let across = -width; across <= width; across++) {
        const x = direction === 0 ? across : direction === 1 ? distance : direction === 2 ? -across : -distance;
        const z = direction === 0 ? -distance : direction === 1 ? across : direction === 2 ? distance : -across;
        put(x, -1, z, color, 'crystal');
      }
    }
  }
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
    if (Math.abs(x) + Math.abs(z) <= 4) put(x, -1, z, color, 'crystal');
  }
  return [...cells.values()];
}

/** Physical floor markers and readable destinations; travel itself belongs to game state. */
export function createVoxelTravelExits(parent, world) {
  const group = new THREE.Group();
  group.name = 'voxel-travel-exits';
  parent.add(group);
  const geometries = [];
  const materials = new Map();
  const labels = [];
  let disposed = false;
  for (const exit of world.exits) {
    const destination = getWorldAreaDefinition(exit.target);
    const color = DESTINATION_COLORS[destination.environment];
    const marker = new THREE.Group();
    marker.name = `travel-exit-${exit.id}`;
    marker.userData.destination = exit.target;
    marker.position.set(exit.x + 0.5, 0.006, exit.y + 0.5);
    marker.scale.setScalar(VOXEL_SIZE);
    for (const { geometry, material: kind } of createVoxelSurfaces(markerVoxels(color))) {
      geometries.push(geometry);
      if (!materials.has(kind)) materials.set(kind, createVoxelMaterial(kind));
      const mesh = new THREE.Mesh(geometry, materials.get(kind));
      mesh.receiveShadow = true;
      marker.add(mesh);
    }
    group.add(marker);
    const label = createWorldLabel(destination.name, color);
    label.sprite.position.set(exit.x + 0.5, 0.85, exit.y + 0.5);
    group.add(label.sprite);
    labels.push(label);
  }

  function setCombat(active) {
    if (disposed) return;
    group.userData.combat = Boolean(active);
    for (const { sprite } of labels) {
      sprite.position.y = active ? 0.12 : 0.85;
      const width = active ? 0.85 : 1.05;
      sprite.scale.set(width, width * 160 / 768, 1);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials.values()) material.dispose();
    for (const { texture, material } of labels) {
      texture.dispose();
      material.dispose();
    }
    parent.remove(group);
    group.clear();
  }

  return { group, setCombat, dispose };
}
