import * as THREE from 'three';

/** Merge exposed, equally colored voxel faces; the caller owns each geometry. */
export function createVoxelSurfaces(voxels) {
  if (!voxels.length) return [];
  const occupied = new Map();
  const appearances = new Map();
  const colors = new Map();
  const surfaces = new Map();
  const cells = [];
  for (const voxel of voxels) {
    const {x,y,z,material,color} = voxel;
    let column = occupied.get(x);
    if (!column) occupied.set(x,column=new Map());
    let depth = column.get(y);
    if (!depth) column.set(y,depth=new Set());
    depth.add(z);
    let paints = appearances.get(material);
    if (!paints) {
      paints = new Map();
      appearances.set(material,paints);
      surfaces.set(material,{ positions:[],normals:[],colors:[],indices:[] });
    }
    let appearance = paints.get(color);
    if (!appearance) {
      let rgb = colors.get(color);
      if (!rgb) colors.set(color,rgb=new THREE.Color(color));
      appearance = { surface:surfaces.get(material),color:rgb };
      paints.set(color,appearance);
    }
    cells.push({coordinates:[x,y,z],appearance,faces:0});
  }
  // Numeric coordinate maps remain sparse and never pack distant cells into a
  // potentially inexact integer. Determine each neighbor once, before merging.
  for (const cell of cells) {
    const [x,y,z] = cell.coordinates;
    const column = occupied.get(x), depth = column.get(y);
    if (!occupied.get(x-1)?.get(y)?.has(z)) cell.faces |= 1;
    if (!occupied.get(x+1)?.get(y)?.has(z)) cell.faces |= 2;
    if (!column.get(y-1)?.has(z)) cell.faces |= 4;
    if (!column.get(y+1)?.has(z)) cell.faces |= 8;
    if (!depth.has(z-1)) cell.faces |= 16;
    if (!depth.has(z+1)) cell.faces |= 32;
  }

  // Sparse plane masks avoid allocating a full volume for wide or tall models.
  for (let axis=0;axis<3;axis++) for (const sign of [-1,1]) {
    const uAxis = (axis+1)%3, vAxis = (axis+2)%3;
    const face = 1 << (axis*2+(sign>0?1:0));
    const normal = [0,0,0];
    normal[axis] = sign;
    const planes = new Map();
    for (const {coordinates,appearance,faces} of cells) {
      if (!(faces&face)) continue;
      const plane = coordinates[axis]+(sign>0?1:0);
      let mask = planes.get(plane);
      if (!mask) {
        mask = new Map();
        planes.set(plane,mask);
      }
      const u = coordinates[uAxis], v = coordinates[vAxis];
      let row = mask.get(v);
      if (!row) mask.set(v,row=new Map());
      row.set(u,appearance);
    }
    for (const [plane,mask] of planes) {
      for (const v of [...mask.keys()].sort((a,b)=>a-b)) {
        const row = mask.get(v);
        for (const u of [...row.keys()].sort((a,b)=>a-b)) {
          const appearance = row.get(u);
          if (!appearance) continue;
          let spanU = 1, spanV = 1;
          while (row.get(u+spanU)===appearance) spanU++;
          rows: while (true) {
            const next = mask.get(v+spanV);
            if (!next) break;
            for (let offset=0;offset<spanU;offset++) {
              if (next.get(u+offset)!==appearance) break rows;
            }
            spanV++;
          }
          for (let dv=0;dv<spanV;dv++) {
            const merged = mask.get(v+dv);
            for (let du=0;du<spanU;du++) merged.delete(u+du);
          }
          const { surface,color } = appearance;
          const start = surface.positions.length/3;
          for (const [du,dv] of [[0,0],[spanU,0],[spanU,spanV],[0,spanV]]) {
            const corner = [0,0,0];
            corner[axis] = plane;
            corner[uAxis] = u+du;
            corner[vAxis] = v+dv;
            surface.positions.push(...corner);
            surface.normals.push(...normal);
            surface.colors.push(color.r,color.g,color.b);
          }
          if (sign>0) surface.indices.push(start,start+1,start+2,start,start+2,start+3);
          else surface.indices.push(start,start+2,start+1,start,start+3,start+2);
        }
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
