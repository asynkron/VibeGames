import * as THREE from 'three';
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

/** Combat and the workshop share the same assembled body parts and materials. */
export function createVoxelFigure(model, { layout = 'figure' } = {}) {
  if (layout !== 'figure' && layout !== 'parts') throw new Error(`Unknown voxel layout: ${layout}`);
  const { assembly, recipe, appearance, parts: library } = model;
  const group = new THREE.Group();
  group.name = recipe.id;
  const geometries = [];
  const materials = Object.fromEntries(Object.entries(VOXEL_MATERIALS).map(([kind, properties]) =>
    [kind,new THREE.MeshStandardMaterial({ ...properties, vertexColors: true })]));
  const surface = new THREE.Group();
  surface.name = 'assembled-figure';
  surface.add(...surfaceMeshes(assembly.voxels,materials,geometries));
  group.add(surface);
  const parts = [];
  let outlineMaterial;
  let exploded = false;
  const gap = Math.max(3, Math.max(...Object.values(assembly.dimensions)) * 0.16);
  const separation = {
    torso: [0,gap,0], legs: [0,0,0], arms: [0,gap,gap * 1.5],
    head: [0,gap * 2,0], back: [0,gap,-gap * 1.5],
    offhand: [gap * 1.5,gap,0], mainhand: [-gap * 1.5,gap,0],
  };

  if (layout === 'parts') {
    outlineMaterial = new THREE.LineBasicMaterial({color:'#e5c298',transparent:true,opacity:0.48});
    for (const [slot, part] of Object.entries(assembly.parts)) {
      if (!part || !part.voxels.length) continue;
      const partGroup = new THREE.Group();
      partGroup.name = `part-${slot}`;
      const meshes = new THREE.Group();
      meshes.add(...surfaceMeshes(part.voxels,materials,geometries));
      meshes.visible = false;
      const { width, height, depth } = part.dimensions;
      const box = new THREE.BoxGeometry(width,height,depth);
      const edges = new THREE.EdgesGeometry(box);
      geometries.push(edges);
      box.dispose();
      const outline = new THREE.LineSegments(edges,outlineMaterial);
      outline.position.set(
        (part.bounds.min.x+part.bounds.max.x)/2,
        (part.bounds.min.y+part.bounds.max.y)/2,
        (part.bounds.min.z+part.bounds.max.z)/2,
      );
      outline.visible = false;
      partGroup.add(meshes,outline);
      parts.push({slot,...part,group:partGroup,meshes,outline});
      group.add(partGroup);
    }
  }

  function setExploded(enabled) {
    exploded = enabled && layout === 'parts';
    surface.visible = !exploded;
    for (const part of parts) {
      part.group.position.fromArray(exploded ? separation[part.slot] : [0,0,0]);
      part.meshes.visible = exploded;
    }
  }

  function getDisplayBounds() {
    if (!exploded) return assembly.bounds;
    const bounds = {min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}};
    for (const part of parts) for (const axis of ['x','y','z']) {
      bounds.min[axis] = Math.min(bounds.min[axis],part.bounds.min[axis]+part.group.position[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis],part.bounds.max[axis]+part.group.position[axis]);
    }
    return parts.length ? bounds : assembly.bounds;
  }

  const swatches = new Map();
  for (const voxel of assembly.voxels) if (!swatches.has(voxel.material)) {
    swatches.set(voxel.material,{name:voxel.material,color:voxel.color});
  }
  return {
    group,recipe,appearance,assembly,
    voxelCount:assembly.voxels.length,
    partCount:assembly.partCount,
    dimensions:assembly.dimensions,
    palette:[...swatches.values()],
    getDisplayBounds,
    setExploded,
    setPartBounds(visible) { parts.forEach(part=>{part.outline.visible=visible;}); },
    exportData() {
      const ids=[...new Set(Object.values(recipe.parts).filter(Boolean).map(part=>part.partId))];
      return {format:'voxel-character/2',appearance,scale:model.scale,footprint:model.footprint,recipe,parts:ids.map(id=>library.get(id))};
    },
    dispose() {
      geometries.forEach(geometry=>geometry.dispose());
      Object.values(materials).forEach(material=>material.dispose());
      outlineMaterial?.dispose();
    },
  };
}
