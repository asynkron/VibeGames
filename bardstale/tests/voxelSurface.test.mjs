import assert from 'node:assert/strict';
import test from 'node:test';
import { Color } from 'three';
import { createVoxelSurfaces } from '../src/render/voxelSurface.js';

const coordinateKey = ([x,y,z]) => `${x},${y},${z}`;
const faceKey = (axis, sign, plane, u, v, material, rgb) => [axis,sign,plane,u,v,material,...rgb].join('/');
const linearRgb = color => new Float32Array(new Color(color).toArray());

function expectedFaces(voxels) {
  const occupied = new Set(voxels.map(({x,y,z}) => coordinateKey([x,y,z])));
  const faces = new Set();
  for (const {x,y,z,color,material} of voxels) {
    const at = [x,y,z];
    for (let axis=0;axis<3;axis++) for (const sign of [-1,1]) {
      const adjacent = [...at];
      adjacent[axis] += sign;
      if (occupied.has(coordinateKey(adjacent))) continue;
      faces.add(faceKey(axis,sign,at[axis]+(sign>0?1:0),at[(axis+1)%3],at[(axis+2)%3],material,linearRgb(color)));
    }
  }
  return faces;
}

function sampledFaces(surfaces, offset) {
  const faces = new Set();
  for (const {material,geometry} of surfaces) {
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const colors = geometry.getAttribute('color');
    const point = (attribute, index) => [attribute.getX(index),attribute.getY(index),attribute.getZ(index)];
    for (let index=0;index<geometry.index.count;index+=3) {
      const vertices = [0,1,2].map(n => geometry.index.getX(index+n));
      const corners = vertices.map(vertex => point(positions,vertex));
      const normal = point(normals,vertices[0]);
      const rgb = point(colors,vertices[0]);
      const axis = normal.findIndex(value => value!==0), sign = normal[axis];
      assert.ok(axis>=0 && Math.abs(sign)===1);
      assert.equal(normal.filter(value=>value!==0).length,1);
      const uAxis = (axis+1)%3, vAxis = (axis+2)%3;
      const plane = corners[0][axis];
      for (const vertex of vertices) {
        assert.equal(positions.array[vertex*3+axis],plane);
        assert.deepEqual(point(normals,vertex),normal);
        assert.deepEqual(point(colors,vertex),rgb,'a triangle must not interpolate paint across voxel colors');
      }
      const [a,b,c] = corners.map(corner=>[corner[uAxis],corner[vAxis]]);
      const cross = (p,q,r) => (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
      assert.ok(cross(a,b,c)*sign>0,'triangle winding must face outwards');
      const minU = Math.min(a[0],b[0],c[0]), maxU = Math.max(a[0],b[0],c[0]);
      const minV = Math.min(a[1],b[1],c[1]), maxV = Math.max(a[1],b[1],c[1]);
      for (let u=minU;u<maxU;u++) for (let v=minV;v<maxV;v++) {
        const sample = [u+offset[0],v+offset[1]];
        const edges = [cross(a,b,sample),cross(b,c,sample),cross(c,a,sample)];
        if (!edges.every(value=>value>=0) && !edges.every(value=>value<=0)) continue;
        const key = faceKey(axis,sign,plane,u,v,material,rgb);
        assert.ok(!faces.has(key),'exposed faces must not overlap');
        faces.add(key);
      }
    }
  }
  return faces;
}

test('merged voxel geometry preserves every exposed painted face, cavity, and outward orientation', () => {
  const voxels = [];
  // A hollow shell tests all six outside directions and six internal cavity faces.
  for (let x=-4;x<-1;x++) for (let y=-2;y<1;y++) for (let z=1;z<4;z++) {
    if (x===-3 && y===-1 && z===2) continue;
    voxels.push({x,y,z,color:x===-4?'#83a5c7':'#f07b31',material:y===-2?'steel':'stone'});
  }
  // A detached uniformly painted slab can merge in both dimensions.
  for (let x=2;x<6;x++) for (let y=-3;y<-1;y++) {
    voxels.push({x,y,z:-4,color:'#7fc491',material:'stone'});
  }
  const surfaces = createVoxelSurfaces(voxels);
  try {
    const expected = expectedFaces(voxels);
    for (const offset of [[.23,.37],[.73,.61]]) assert.deepEqual(sampledFaces(surfaces,offset),expected);
    assert.equal(surfaces.filter(surface=>surface.material==='stone').length,1,'different RGB colors share one material surface');
    assert.ok(surfaces.reduce((count,{geometry})=>count+geometry.index.count/3,0)<expected.size*2,'matching adjacent faces must merge');
  } finally {
    for (const {geometry} of surfaces) geometry.dispose();
  }
});

test('widely separated signed coordinates do not alias in sparse surface masks', () => {
  const voxels = [
    {x:-74,y:-(2**49),z:0,color:'#557799',material:'stone'},
    {x:0,y:0,z:0,color:'#aa5522',material:'stone'},
    {x:0,y:1,z:0,color:'#aa5522',material:'stone'},
  ];
  const surfaces = createVoxelSurfaces(voxels);
  try {
    assert.equal(surfaces.length,1);
    const {geometry} = surfaces[0];
    assert.equal(geometry.index.count/3,24,'an isolated cube and a two-voxel prism each have six rectangular exterior faces');
    const local = {...surfaces[0],geometry:geometry.clone()};
    const positions = local.geometry.getAttribute('position');
    const indices = [];
    for (let i=0;i<geometry.index.count;i+=3) {
      const triangle = [0,1,2].map(n=>geometry.index.getX(i+n));
      if (triangle.every(vertex=>positions.getY(vertex)>=0)) indices.push(...triangle);
    }
    local.geometry.setIndex(indices);
    try {
      assert.deepEqual(sampledFaces([local],[.23,.37]),expectedFaces(voxels.slice(1)));
    } finally {
      local.geometry.dispose();
    }
  } finally {
    for (const {geometry} of surfaces) geometry.dispose();
  }
});
