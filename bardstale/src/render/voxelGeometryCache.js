import { createVoxelSurfaces } from './voxelSurface.js';

const prepared = new WeakMap();

/** Share immutable model surfaces while each scene owns its instance batches. */
export function acquireVoxelSurfaces(model, segment, selectVoxels) {
  let segments = prepared.get(model);
  if (!segments) prepared.set(model,segments=new Map());
  let entry = segments.get(segment);
  if (!entry) {
    entry = {surfaces:createVoxelSurfaces(selectVoxels()),owners:0};
    segments.set(segment,entry);
  }
  entry.owners++;
  let released = false;
  return {
    surfaces:entry.surfaces,
    release() {
      if (released) return;
      released = true;
      if (--entry.owners) return;
      // Three drops GPU buffers on dispose; attributes stay available to upload
      // again when an area reuses this model, without repeating voxel meshing.
      for (const {geometry} of entry.surfaces) geometry.dispose();
    },
  };
}
