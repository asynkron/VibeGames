import * as THREE from 'three';
import { BLOCK_SIZE, CHARACTER_SIZE } from './voxelBlocks.js';
import { VOXEL_MATERIALS } from './voxelCharacterParts.js';

const FACES = [
  { normal: [1,0,0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { normal: [-1,0,0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { normal: [0,1,0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { normal: [0,-1,0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { normal: [0,0,1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { normal: [0,0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

// Merge exposed faces: combat figures need one draw per material, not per cube.
function surfaceMeshes(voxels, materials, geometries) {
  const occupied = new Set(voxels.map(({x,y,z}) => `${x},${y},${z}`));
  const surfaces = new Map();
  const color = new THREE.Color();
  for (const voxel of voxels) {
    if (!materials[voxel.material]) throw new Error(`Unknown voxel material: ${voxel.material}`);
    let surface = surfaces.get(voxel.material);
    if (!surface) {
      surface = { positions: [], normals: [], colors: [], indices: [] };
      surfaces.set(voxel.material, surface);
    }
    color.set(voxel.color);
    for (const { normal, corners } of FACES) {
      if (occupied.has(`${voxel.x+normal[0]},${voxel.y+normal[1]},${voxel.z+normal[2]}`)) continue;
      const start = surface.positions.length / 3;
      for (const corner of corners) {
        surface.positions.push(voxel.x+corner[0],voxel.y+corner[1],voxel.z+corner[2]);
        surface.normals.push(...normal);
        surface.colors.push(color.r,color.g,color.b);
      }
      surface.indices.push(start,start+1,start+2,start,start+2,start+3);
    }
  }
  return [...surfaces].flatMap(([kind, surface]) => {
    if (!surface.indices.length) return [];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(surface.normals,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(surface.colors,3));
    geometry.setIndex(surface.indices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials[kind]);
    mesh.name = `voxel-${kind}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return [mesh];
  });
}

/** The same assembled block recipe renders in combat and in the block workshop. */
export function createVoxelFigure(model, { layout = 'figure' } = {}) {
  if (layout !== 'figure' && layout !== 'blocks') throw new Error(`Unknown voxel layout: ${layout}`);
  const { assembly, recipe, appearance, blocks: library } = model;
  const group = new THREE.Group();
  group.name = recipe.id;
  const geometries = [];
  const materials = Object.fromEntries(Object.entries(VOXEL_MATERIALS).map(([kind, properties]) =>
    [kind,new THREE.MeshStandardMaterial({ ...properties, vertexColors: true })]));
  const parts = [];
  let outlineGeometry;
  let outlineMaterial;

  if (layout === 'blocks') {
    const box = new THREE.BoxGeometry(BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE);
    outlineGeometry = new THREE.EdgesGeometry(box);
    box.dispose();
    outlineMaterial = new THREE.LineBasicMaterial({color:'#e5c298',transparent:true,opacity:0.32});
    for (const slot of assembly.slots) {
      const block = new THREE.Group();
      block.name = slot.blockId ?? `empty-${slot.x}-${slot.y}-${slot.z}`;
      const outline = new THREE.LineSegments(outlineGeometry,outlineMaterial);
      outline.position.setScalar(BLOCK_SIZE/2);
      outline.visible = false;
      block.add(outline);
      if (slot.blockId !== null) block.add(...surfaceMeshes(library.get(slot.blockId).voxels,materials,geometries));
      parts.push({...slot,group:block,outline});
      group.add(block);
    }
  } else {
    const surface = new THREE.Group();
    surface.position.set(-CHARACTER_SIZE/2,0,-CHARACTER_SIZE/2);
    surface.add(...surfaceMeshes(assembly.voxels,materials,geometries));
    group.add(surface);
  }

  function setExploded(enabled) {
    const gap = enabled ? 3 : 0;
    for (const part of parts) part.group.position.set(
      part.x*BLOCK_SIZE-CHARACTER_SIZE/2+(part.x-1)*gap,
      part.y*(BLOCK_SIZE+gap),
      part.z*BLOCK_SIZE-CHARACTER_SIZE/2+(part.z-1)*gap,
    );
  }
  setExploded(false);
  const swatches = new Map();
  for (const voxel of assembly.voxels) if (!swatches.has(voxel.material)) {
    swatches.set(voxel.material,{name:voxel.material,color:voxel.color});
  }
  return {
    group,recipe,appearance,assembly,
    voxelCount:assembly.voxels.length,
    occupiedBlockCount:assembly.occupiedBlockCount,
    dimensions:assembly.dimensions,
    palette:[...swatches.values()],
    setExploded,
    setBlockBoundaries(visible) { parts.forEach(part=>{part.outline.visible=visible;}); },
    exportData() {
      const ids=[...new Set(recipe.slots.map(slot=>slot.blockId).filter(id=>id!==null))];
      return {format:'voxel-character/1',blockSize:BLOCK_SIZE,gridSize:[3,3,3],appearance,recipe,blocks:ids.map(id=>library.get(id))};
    },
    dispose() {
      geometries.forEach(geometry=>geometry.dispose());
      Object.values(materials).forEach(material=>material.dispose());
      outlineGeometry?.dispose();
      outlineMaterial?.dispose();
    },
  };
}
