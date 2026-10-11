import * as THREE from 'three';

/** Merge exposed, equally colored voxel faces; the caller owns each geometry. */
export function createVoxelSurfaces(voxels) {
  if (!voxels.length) return [];
  const occupied = new Set(voxels.map(({x,y,z}) => `${x},${y},${z}`));
  const min = [Infinity,Infinity,Infinity];
  const max = [-Infinity,-Infinity,-Infinity];
  const appearances = new Map();
  const colors = new Map();
  const surfaces = new Map();
  for (const voxel of voxels) {
    const coordinates = [voxel.x,voxel.y,voxel.z];
    for (let axis=0;axis<3;axis++) {
      min[axis] = Math.min(min[axis],coordinates[axis]);
      max[axis] = Math.max(max[axis],coordinates[axis]);
    }
    if (!colors.has(voxel.color)) colors.set(voxel.color,new THREE.Color(voxel.color));
    const key = `${voxel.material}:${voxel.color}`;
    if (!appearances.has(key)) {
      let surface = surfaces.get(voxel.material);
      if (!surface) {
        surface = { positions:[],normals:[],colors:[],indices:[] };
        surfaces.set(voxel.material,surface);
      }
      appearances.set(key,{ surface,color:colors.get(voxel.color) });
    }
  }

  // Sparse plane masks avoid allocating a full volume for wide or tall models.
  for (let axis=0;axis<3;axis++) for (const sign of [-1,1]) {
    const uAxis = (axis+1)%3, vAxis = (axis+2)%3;
    const width = max[uAxis]-min[uAxis]+1;
    const normal = [0,0,0];
    normal[axis] = sign;
    const planes = new Map();
    for (const voxel of voxels) {
      if (occupied.has(`${voxel.x+normal[0]},${voxel.y+normal[1]},${voxel.z+normal[2]}`)) continue;
      const coordinates = [voxel.x,voxel.y,voxel.z];
      const plane = coordinates[axis]+(sign>0?1:0);
      let mask = planes.get(plane);
      if (!mask) {
        mask = new Map();
        planes.set(plane,mask);
      }
      const index = (coordinates[vAxis]-min[vAxis])*width+coordinates[uAxis]-min[uAxis];
      mask.set(index,appearances.get(`${voxel.material}:${voxel.color}`));
    }
    for (const [plane,mask] of planes) {
      for (const index of [...mask.keys()].sort((a,b)=>a-b)) {
        const appearance = mask.get(index);
        if (!appearance) continue;
        const u = index%width, v = Math.floor(index/width);
        let spanU = 1, spanV = 1;
        while (u+spanU<width && mask.get(index+spanU)===appearance) spanU++;
        rows: while (true) {
          const row = index+spanV*width;
          for (let offset=0;offset<spanU;offset++) {
            if (mask.get(row+offset)!==appearance) break rows;
          }
          spanV++;
        }
        for (let row=0;row<spanV;row++) for (let column=0;column<spanU;column++) {
          mask.delete(index+row*width+column);
        }
        const { surface,color } = appearance;
        const start = surface.positions.length/3;
        for (const [du,dv] of [[0,0],[spanU,0],[spanU,spanV],[0,spanV]]) {
          const corner = [0,0,0];
          corner[axis] = plane;
          corner[uAxis] = min[uAxis]+u+du;
          corner[vAxis] = min[vAxis]+v+dv;
          surface.positions.push(...corner);
          surface.normals.push(...normal);
          surface.colors.push(color.r,color.g,color.b);
        }
        if (sign>0) surface.indices.push(start,start+1,start+2,start,start+2,start+3);
        else surface.indices.push(start,start+2,start+1,start,start+3,start+2);
      }
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
