import * as THREE from 'three';

const FACES = [
  { normal: [1,0,0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { normal: [-1,0,0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { normal: [0,1,0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { normal: [0,-1,0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { normal: [0,0,1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { normal: [0,0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

/** Exposed voxel faces grouped by material; the caller owns each geometry. */
export function createVoxelSurfaces(voxels) {
  const occupied = new Set(voxels.map(({x,y,z}) => `${x},${y},${z}`));
  const surfaces = new Map();
  const color = new THREE.Color();
  for (const voxel of voxels) {
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
  return [...surfaces].flatMap(([material, surface]) => {
    if (!surface.indices.length) return [];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(surface.normals,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(surface.colors,3));
    geometry.setIndex(surface.indices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return [{ material, geometry }];
  });
}
