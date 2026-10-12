import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireVoxelSurfaces } from '../src/render/voxelGeometryCache.js';

const voxel = (x,y,z,color='#79a6cd') => Object.freeze({x,y,z,color,material:'stone'});
const modelOf = cells => Object.freeze({voxels:Object.freeze(cells)});
const cacheHit = () => { throw new Error('Prepared geometry must not select or compile voxels again.'); };

test('shared geometry releases GPU resources only after the last scene and reuses CPU buffers on return', () => {
  const model = modelOf([voxel(-2,0,1),voxel(-1,0,1)]);
  const first = acquireVoxelSurfaces(model,'full',() => model.voxels);
  const second = acquireVoxelSurfaces(model,'full',cacheHit);
  assert.equal(first.surfaces,second.surfaces);
  const geometry = first.surfaces[0].geometry;
  const position = geometry.getAttribute('position').array;
  const rgb = geometry.getAttribute('color').array;
  const indices = geometry.index.array;
  let disposals = 0;
  const onDispose = () => disposals++;
  geometry.addEventListener('dispose',onDispose);
  try {
    first.release();
    first.release();
    assert.equal(disposals,0,'disposing one scene must keep the other scene geometry uploaded');
    assert.deepEqual(geometry.boundingBox.min.toArray(),[-2,0,1]);
    assert.deepEqual(geometry.boundingBox.max.toArray(),[0,1,2]);
    second.release();
    assert.equal(disposals,1,'the final scene releases GPU buffers');

    const returning = acquireVoxelSurfaces(model,'full',cacheHit);
    try {
      assert.equal(returning.surfaces[0].geometry,geometry);
      assert.equal(geometry.getAttribute('position').array,position);
      assert.equal(geometry.getAttribute('color').array,rgb);
      assert.equal(geometry.index.array,indices);
      second.release();
      assert.equal(disposals,1,'a stale scene release must not dispose a returning scene');
    } finally {
      returning.release();
    }
    assert.equal(disposals,2);
  } finally {
    first.release();
    second.release();
    geometry.removeEventListener('dispose',onDispose);
  }
});

test('cutaway segments retain separate painted geometry and independent lifetimes for each immutable model', () => {
  const model = modelOf([voxel(0,0,0,'#83592f'),voxel(0,60,0,'#497f3d')]);
  const lower = acquireVoxelSurfaces(model,'lower',() => model.voxels.filter(cell=>cell.y<60));
  const upper = acquireVoxelSurfaces(model,'upper',() => model.voxels.filter(cell=>cell.y>=60));
  const another = modelOf([voxel(5,0,0)]);
  const independent = acquireVoxelSurfaces(another,'lower',() => another.voxels);
  const lowerGeometry = lower.surfaces[0].geometry;
  const upperGeometry = upper.surfaces[0].geometry;
  let upperDisposals = 0;
  const onUpperDispose = () => upperDisposals++;
  upperGeometry.addEventListener('dispose',onUpperDispose);
  try {
    assert.notEqual(lowerGeometry,upperGeometry);
    assert.notEqual(lowerGeometry,independent.surfaces[0].geometry);
    assert.deepEqual(lowerGeometry.boundingBox.min.toArray(),[0,0,0]);
    assert.deepEqual(upperGeometry.boundingBox.min.toArray(),[0,60,0]);
    assert.deepEqual(independent.surfaces[0].geometry.boundingBox.min.toArray(),[5,0,0]);
    assert.notDeepEqual(lowerGeometry.getAttribute('color').array,upperGeometry.getAttribute('color').array);
    lower.release();
    assert.equal(upperDisposals,0,'cutting away one segment must keep the other segment valid');
    assert.equal(upperGeometry.index.count,36);
    upper.release();
    assert.equal(upperDisposals,1);
  } finally {
    lower.release();
    upper.release();
    independent.release();
    upperGeometry.removeEventListener('dispose',onUpperDispose);
  }
});
