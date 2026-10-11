import * as THREE from 'three';
import { RoomEnvironment } from 'https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';
import { VOXEL_MATERIALS } from './voxelCharacterParts.js';

// Detail is evaluated in authored voxel coordinates. It follows moving limbs and
// instanced furniture without adding geometry or reducing authored RGB colors.
const DETAIL = {
  stone: `
    float mineral = voxelNoise(p * .095 + vec3(17.0, 3.0, 8.0));
    float vein = smoothstep(.66, .86, voxelNoise(p * vec3(.045, .18, .06)));
    tint = mix(vec3(.77, .84, .91), vec3(1.18, 1.10, .96), mineral);
    tint *= 1.0 + fine * .13 + (mottle - .5) * .22;
    tint = mix(tint, vec3(.70, .77, .69), vein * .25);
    roughVariation = (mineral - .5) * .12;
  `,
  wood: `
    float grain = sin(p.y * .16 + p.x * .72 + voxelNoise(p * vec3(.15, .025, .18)) * 8.0);
    float fiber = smoothstep(.55, .95, grain);
    tint = mix(vec3(.81, .70, .59), vec3(1.16, 1.10, .94), mottle);
    tint *= 1.0 - fiber * .18 + fine * .065;
    roughVariation = fiber * .08;
  `,
  leather: `
    tint = mix(vec3(.86, .78, .72), vec3(1.13, 1.08, .98), mottle);
    tint *= 1.0 + fine * .09;
    roughVariation = (mottle - .5) * .14;
  `,
  cloth: `
    float weave = mod(cell.x + cell.y + cell.z, 2.0) - .5;
    tint = vec3(1.0) + vec3(.12, .09, .15) * (mottle - .5);
    tint *= 1.0 + weave * .025 + fine * .04;
  `,
  skin: `
    tint = mix(vec3(.96, .87, .84), vec3(1.05, 1.025, .97), mottle);
    tint *= 1.0 + fine * .018;
    roughVariation = (mottle - .5) * .06;
  `,
  steel: `
    float patina = smoothstep(.66, .86, mottle);
    tint = mix(vec3(.90, .96, 1.045), vec3(1.06, 1.05, 1.0), broad);
    tint = mix(tint, vec3(.76, .68, .56), patina * .22);
    tint *= 1.0 + fine * .045;
    roughVariation = (mottle - .5) * .18 + patina * .08;
  `,
  gold: `
    tint = mix(vec3(.79, .83, .76), vec3(1.12, 1.04, .88), mottle);
    tint *= 1.0 + fine * .035;
    roughVariation = (.5 - mottle) * .16;
  `,
  bone: `
    tint = mix(vec3(.88, .82, .68), vec3(1.10, 1.07, .99), broad);
    tint *= 1.0 + fine * .04;
  `,
  fur: `
    float strand = voxelNoise(p * vec3(.7, .09, .65));
    tint = mix(vec3(.82, .78, .73), vec3(1.11, 1.09, 1.04), strand);
    tint *= 1.0 + fine * .035;
  `,
  feather: `
    tint = mix(vec3(.85, .90, .98), vec3(1.10, 1.035, .94), mottle);
    tint *= 1.0 + fine * .04;
  `,
  foliage: `
    tint = mix(vec3(.70, .85, .78), vec3(1.20, 1.08, .70), mottle);
    tint *= 1.0 + fine * .08;
    roughVariation = (mottle - .5) * .12;
  `,
  ceramic: `
    tint = mix(vec3(.76, .91, .96), vec3(1.14, 1.08, .88), broad);
    tint *= 1.0 + fine * .025;
    roughVariation = (mottle - .5) * .09;
  `,
  crystal: `
    tint = mix(vec3(.85, .96, 1.10), vec3(1.09, 1.04, .94), mottle);
    roughVariation = (mottle - .5) * .06;
  `,
  flame: `tint = vec3(1.0) + vec3(.04, .08, .025) * fine;`,
};

const SHADER_COMMON = /* glsl */`
varying vec3 vVoxelPosition;
varying vec3 vVoxelNormal;
float voxelHash(vec3 p) {
  p = fract(p * .1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float voxelNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(voxelHash(i), voxelHash(i + vec3(1,0,0)), f.x),
    mix(voxelHash(i + vec3(0,1,0)), voxelHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(voxelHash(i + vec3(0,0,1)), voxelHash(i + vec3(1,0,1)), f.x),
    mix(voxelHash(i + vec3(0,1,1)), voxelHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

/** All voxel assets share material response and retain their full RGB paint. */
export function createVoxelMaterial(kind) {
  if (!Object.hasOwn(VOXEL_MATERIALS, kind) || !Object.hasOwn(DETAIL, kind)) {
    throw new RangeError(`Unknown voxel material: ${kind}`);
  }
  const material = new THREE.MeshStandardMaterial({ ...VOXEL_MATERIALS[kind], vertexColors: true });
  material.name = `voxel-material-${kind}`;
  material.customProgramCacheKey = () => `voxel-surface-${kind}`;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vVoxelPosition;\nvarying vec3 vVoxelNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvVoxelPosition = position;\nvVoxelNormal = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SHADER_COMMON}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 cell = floor(vVoxelPosition - vVoxelNormal * .002);
        vec3 p = cell + .5;
        float fine = voxelHash(cell + 11.7) - .5;
        float mottle = voxelNoise(p * .19);
        float broad = voxelNoise(p * .075 + 4.3);
        float roughVariation = 0.0;
        vec3 tint = vec3(1.0);
        ${DETAIL[kind]}
        diffuseColor.rgb = clamp(diffuseColor.rgb * tint, vec3(0.0), vec3(1.0));
      `)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + roughVariation, .12, 1.0);');
  };
  return material;
}

/** Neutral reflected light reveals metals without coloring every surface amber. */
export function createVoxelReflectionMap(renderer) {
  const room = new RoomEnvironment(renderer);
  const generator = new THREE.PMREMGenerator(renderer);
  const reflection = generator.fromScene(room, .03);
  room.dispose();
  generator.dispose();
  return reflection;
}
