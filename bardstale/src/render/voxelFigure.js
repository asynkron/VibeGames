import * as THREE from 'three';
import { VOXEL_MATERIALS } from './voxelCharacterParts.js';
import { createItemEffects } from './itemEffects.js';
import { createVoxelRig } from './voxelRig.js';
import { createVoxelSurfaces } from './voxelSurface.js';

// Merge exposed faces: combat figures need one draw per material and hinge.
function surfaceMeshes(voxels, materials, geometries) {
  for (const voxel of voxels) {
    if (!materials[voxel.material]) throw new Error(`Unknown voxel material: ${voxel.material}`);
  }
  return createVoxelSurfaces(voxels).map(({material:kind,geometry}) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials[kind]);
    mesh.name = `voxel-${kind}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  });
}

function boxFromBounds(bounds) {
  return new THREE.Box3(
    new THREE.Vector3(bounds.min.x,bounds.min.y,bounds.min.z),
    new THREE.Vector3(bounds.max.x,bounds.max.y,bounds.max.z),
  );
}

function voxelBounds(voxels) {
  const box = new THREE.Box3();
  for (const {x,y,z} of voxels) {
    box.min.x=Math.min(box.min.x,x); box.max.x=Math.max(box.max.x,x+1);
    box.min.y=Math.min(box.min.y,y); box.max.y=Math.max(box.max.y,y+1);
    box.min.z=Math.min(box.min.z,z); box.max.z=Math.max(box.max.z,z+1);
  }
  return box;
}

// Only the Y/Z silhouette can touch the ground under a rigid X-axis hinge.
function supportHull(voxels, pivot) {
  const unique = new Map();
  for (const voxel of voxels) for (const y of [voxel.y,voxel.y+1]) for (const z of [voxel.z,voxel.z+1]) {
    unique.set(`${y},${z}`,[y-pivot[1],z-pivot[2]]);
  }
  const points=[...unique.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if (points.length<3) return points;
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half = ordered => {
    const hull=[];
    for (const point of ordered) {
      while(hull.length>1&&cross(hull[hull.length-2],hull[hull.length-1],point)<=0) hull.pop();
      hull.push(point);
    }
    hull.pop();
    return hull;
  };
  return [...half(points),...half([...points].reverse())];
}

// Bound an entire hinge sweep once so camera fitting never follows animation frames.
function hingeEnvelope(bounds, pivot, [from,to]) {
  const result = new THREE.Box3();
  const point = new THREE.Vector3();
  for (const x of [bounds.min.x,bounds.max.x]) {
    for (const y of [bounds.min.y-pivot[1],bounds.max.y-pivot[1]]) {
      for (const z of [bounds.min.z-pivot[2],bounds.max.z-pivot[2]]) {
        const angles = [from,to];
        for (const angle of [Math.atan2(-z,y),Math.atan2(y,z)]) {
          for (let turn=Math.ceil((from-angle)/Math.PI);angle+turn*Math.PI<=to;turn++) angles.push(angle+turn*Math.PI);
        }
        for (const angle of angles) {
          const cosine=Math.cos(angle), sine=Math.sin(angle);
          result.expandByPoint(point.set(x,pivot[1]+y*cosine-z*sine,pivot[2]+y*sine+z*cosine));
        }
      }
    }
  }
  return result;
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
  const rig = createVoxelRig(model);
  const joints = {};
  const surface = new THREE.Group();
  surface.name = 'assembled-figure';
  const motionBounds = new THREE.Box3();
  for (const [name,joint] of Object.entries(rig.joints)) {
    const pivot = new THREE.Group();
    pivot.name = `joint-${name}`;
    pivot.position.fromArray(joint.pivot);
    const meshes = new THREE.Group();
    meshes.position.copy(pivot.position).negate();
    // Each hinge owns all its boundary faces, including faces hidden at rest.
    meshes.add(...surfaceMeshes(joint.voxels,materials,geometries));
    pivot.add(meshes);
    surface.add(pivot);
    const bounds = voxelBounds(joint.voxels);
    if (!bounds.isEmpty()) motionBounds.union(hingeEnvelope(bounds,joint.pivot,joint.angleRange));
    joints[name] = { ...joint,group:pivot,bounds:bounds.translate(pivot.position.clone().negate()),support:supportHull(joint.voxels,joint.pivot) };
  }
  const jointEntries = Object.entries(joints);
  const hasLegs = jointEntries.some(([name,joint])=>name.endsWith('Leg')&&joint.voxels.length);
  const groundJoints = jointEntries.filter(([name])=>!hasLegs||name==='body'||name.endsWith('Leg')).map(([,joint])=>joint);
  group.add(surface);
  const itemEffects = model.itemEffects ?? [];
  const effects = createItemEffects(itemEffects);
  group.add(effects.group);
  const effectAttachment = slot => joints[rig.effectJoint(slot)];
  effects.setAttachments(effectAttachment);
  const restSolidBounds = boxFromBounds(assembly.bounds);
  const restDisplayBounds = restSolidBounds.clone();
  for (const {slot,bounds} of effects.getBoundsBySlot()) {
    const joint = effectAttachment(slot);
    restDisplayBounds.union(boxFromBounds(bounds));
    motionBounds.union(hingeEnvelope(boxFromBounds(bounds),joint.pivot,joint.angleRange));
  }
  if (motionBounds.isEmpty()) motionBounds.copy(restSolidBounds);
  const poseBounds = new THREE.Box3();
  const jointBounds = new THREE.Box3();
  const parts = [];
  let outlineMaterial;
  let exploded = false;
  const gap = Math.max(3, Math.max(...Object.values(assembly.dimensions)) * 0.16);
  const separation = {
    torso: [0,gap,0], legs: [0,0,0], arms: [0,gap,gap * 1.5],
    head: [0,gap * 2,0], back: [0,gap,-gap * 1.5],
    offhand: [gap * 1.5,gap,0], mainhand: [-gap * 1.5,gap,0],
    shoulders:[0,gap*2,gap], hands:[0,gap,gap*3], feet:[0,-gap,gap],
    waist:[0,gap,gap*2], neck:[0,gap*2,gap*2],
    ring1:[-gap,gap,gap*4], ring2:[gap,gap,gap*4],
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
    setMotion({active:false});
    effects.setAttachments(exploded ? null : effectAttachment);
    effects.setPartOffsets(exploded ? separation : {});
  }

  function setMotion(options = {}) {
    const angles = rig.samplePose(exploded ? {active:false} : options);
    for (const [name,joint] of jointEntries) {
      joint.group.rotation.x = angles[name] || 0;
      joint.group.updateMatrix();
    }
  }

  // The returned box is reused. Callers retaining it across updates must copy it.
  function getPoseBounds() {
    poseBounds.makeEmpty();
    if (exploded) {
      const bounds = solidDisplayBounds();
      poseBounds.min.copy(bounds.min); poseBounds.max.copy(bounds.max);
      return poseBounds;
    }
    for (const [,joint] of jointEntries) {
      if (!joint.bounds.isEmpty()) poseBounds.union(jointBounds.copy(joint.bounds).applyMatrix4(joint.group.matrix));
    }
    if (poseBounds.isEmpty()) poseBounds.copy(restSolidBounds);
    return poseBounds;
  }

  function getGroundHeight(rotationX = 0) {
    let height=Infinity;
    const cosine=Math.cos(rotationX), sine=Math.sin(rotationX);
    for (const joint of groundJoints) {
      const angle=rotationX+joint.group.rotation.x;
      const localCosine=Math.cos(angle), localSine=Math.sin(angle);
      const offset=joint.pivot[1]*cosine-joint.pivot[2]*sine;
      for (const [y,z] of joint.support) height=Math.min(height,offset+y*localCosine-z*localSine);
    }
    return Number.isFinite(height) ? height : assembly.bounds.min.y;
  }
  setMotion();

  function solidDisplayBounds() {
    if (!exploded) return assembly.bounds;
    const bounds = {min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}};
    for (const part of parts) for (const axis of ['x','y','z']) {
      bounds.min[axis] = Math.min(bounds.min[axis],part.bounds.min[axis]+part.group.position[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis],part.bounds.max[axis]+part.group.position[axis]);
    }
    return parts.length ? bounds : assembly.bounds;
  }

  function getDisplayBounds({motion=true} = {}) {
    if (!exploded) return motion ? motionBounds : restDisplayBounds;
    const solid = solidDisplayBounds();
    const particles = effects.getBounds();
    if (!particles) return solid;
    return {
      min: Object.fromEntries(['x','y','z'].map(axis=>[axis,Math.min(solid.min[axis],particles.min[axis])])),
      max: Object.fromEntries(['x','y','z'].map(axis=>[axis,Math.max(solid.max[axis],particles.max[axis])])),
    };
  }

  const swatches = new Map();
  for (const voxel of assembly.voxels) if (!swatches.has(voxel.material)) {
    swatches.set(voxel.material,{name:voxel.material,color:voxel.color});
  }
  return {
    group,recipe,appearance,assembly,
    surfaceMaterials:Object.values(materials),
    hasJoints:jointEntries.some(([name,joint])=>name!=='body'&&joint.voxels.length>0),
    hasEffects:itemEffects.length>0,
    updateEffects:effects.update,
    voxelCount:assembly.voxels.length,
    partCount:assembly.partCount,
    dimensions:assembly.dimensions,
    palette:[...swatches.values()],
    getDisplayBounds,
    getPoseBounds,
    getGroundHeight,
    setMotion,
    setExploded,
    setPartBounds(visible) { parts.forEach(part=>{part.outline.visible=visible;}); },
    exportData() {
      const ids=[...new Set(Object.values(recipe.parts).filter(Boolean).map(part=>part.partId))];
      return {format:'voxel-character/2',appearance,scale:model.scale,footprint:model.footprint,recipe,parts:ids.map(id=>library.get(id)),itemEffects};
    },
    dispose() {
      effects.dispose();
      geometries.forEach(geometry=>geometry.dispose());
      Object.values(materials).forEach(material=>material.dispose());
      outlineMaterial?.dispose();
    },
  };
}
