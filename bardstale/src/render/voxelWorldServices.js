import * as THREE from 'three';
import { assembleCombatVoxelModel } from './combatVoxelCatalog.js';
import { createVoxelFigure } from './voxelFigure.js';
import { createVoxelSurfaces } from './voxelSurface.js';
import { createVoxelMaterial } from './voxelMaterials.js';
import { createWorldLabel } from './worldLabels.js';

const VOXEL_SIZE = 1 / 75;
const SERVICE_COLORS = Object.freeze({ shop:'#e4bb77', temple:'#accddd', trainer:'#c3addb', training:'#b5ce95', inn:'#e6c99a', tavern:'#d9a174', council:'#92b9cd' });
const HOST_GEAR = Object.freeze({
  Fighter: { chest:'chain_mail', shoulders:'iron_pauldrons', legs:'plate_leggings', feet:'iron_boots', waist:'leather_belt', mainhand:'long_sword' },
  Cleric: { head:'leather_hood', chest:'chain_mail', legs:'robe_skirt', feet:'leather_boots', back:'travel_cape', mainhand:'mace' },
  Thief: { head:'leather_hood', chest:'leather_armor', legs:'leather_trousers', feet:'leather_boots', waist:'leather_belt', mainhand:'dagger' },
  'Magic-user': { head:'wizard_hat', chest:'robes', shoulders:'cloth_mantle', legs:'robe_skirt', feet:'cloth_shoes', neck:'star_amulet', mainhand:'quarterstaff_plus1' },
  smith: { chest:'leather_armor', legs:'leather_trousers', feet:'leather_boots', waist:'leather_belt', hands:'leather_gloves', mainhand:'mace' },
  citizen: { chest:'robes', legs:'leather_trousers', feet:'leather_boots', waist:'leather_belt' },
});

function hostFor(service) {
  if (service.type === 'temple') return { kind:'Cleric', equipment:HOST_GEAR.Cleric };
  if (service.type === 'trainer') {
    const kind=service.classes[0];
    return { kind,equipment:HOST_GEAR[kind] };
  }
  if (service.type === 'training') return { kind:'Fighter',equipment:HOST_GEAR.Fighter };
  if (service.type === 'shop') return { kind:'Fighter',equipment:HOST_GEAR.smith,appearance:{palette:'ochre'} };
  return { kind:'Fighter',equipment:HOST_GEAR.citizen,appearance:{head:'longHair',palette:service.type === 'council' ? 'azure' : 'ochre'} };
}

function standardVoxels(type, color) {
  const cells = new Map();
  const put = (x,y,z,paint,material) => cells.set(`${x},${y},${z}`, { x,y,z,color:paint,material });
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    put(x,0,z,'#667481','steel');
  }
  for (let y = 1; y <= 41; y++) {
    put(0,y,0,'#705139','wood');
    put(1,y,0,'#94744f','wood');
  }
  for (let x = -15; x <= 1; x++) put(x,40,0,'#c5ae79','gold');
  for (let x = -14; x <= -2; x++) for (let y = 26; y <= 38; y++) {
    const border = x === -14 || x === -2 || y === 38;
    put(x,y,1,border ? '#d3b978' : color,border ? 'gold' : 'cloth');
  }
  const ink = '#263541';
  for (let x = -11; x <= -5; x++) for (let y = 29; y <= 35; y++) {
    const dx = x + 8, dy = y - 32;
    const emblem = type === 'temple' ? Math.abs(dx) <= 1 || Math.abs(dy) <= 1
      : type === 'training' ? Math.max(Math.abs(dx),Math.abs(dy)) === 3 || dx === 0 && dy === 0
      : type === 'trainer' ? Math.abs(dx) === Math.abs(dy)
      : dx === 0 || dy === -2 && Math.abs(dx) <= 2;
    if (emblem) put(x,y,2,ink,'cloth');
  }
  return [...cells.values()];
}

/** City hosts use the same equipped, articulated voxel anatomy as party members. */
export function createVoxelWorldServices(parent, world) {
  const group = new THREE.Group();
  group.name = 'voxel-world-services';
  group.userData.serviceCount = world.services.length;
  parent.add(group);
  const entries = [];
  const standards = new Map();
  const materials = new Map();
  let combat = false;
  let disposed = false;

  function standardFor(type) {
    if (!standards.has(type)) {
      standards.set(type, createVoxelSurfaces(standardVoxels(type,SERVICE_COLORS[type])));
    }
    return standards.get(type);
  }

  for (const service of world.services) {
    if (!Object.hasOwn(SERVICE_COLORS, service.type)) throw new RangeError(`Unknown world service: ${service.type}`);
    const root = new THREE.Group();
    root.name = `world-service-${service.id}`;
    root.userData.serviceId = service.id;
    root.position.set(service.x,0,service.y);
    group.add(root);
    const figure = createVoxelFigure(assembleCombatVoxelModel(hostFor(service)));
    figure.group.name = `service-host-${service.id}`;
    figure.group.scale.setScalar(VOXEL_SIZE);
    figure.group.position.set(.8,-figure.getGroundHeight() * VOXEL_SIZE,.23);
    figure.setMotion({ active:false });
    root.add(figure.group);
    const standard = new THREE.Group();
    standard.name = `service-standard-${service.type}`;
    standard.position.set(.92,0,.1);
    standard.scale.setScalar(VOXEL_SIZE);
    for (const { geometry,material:kind } of standardFor(service.type)) {
      if (!materials.has(kind)) materials.set(kind,createVoxelMaterial(kind));
      const mesh = new THREE.Mesh(geometry,materials.get(kind));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      standard.add(mesh);
    }
    root.add(standard);
    const sign = createWorldLabel(service.name,SERVICE_COLORS[service.type],{ width:.9 });
    const prompt = createWorldLabel(service.name,SERVICE_COLORS[service.type],{ width:.9,subtitle:'Enter · Visit' });
    for (const label of [sign,prompt]) {
      label.sprite.position.set(.5,.84,.5);
      root.add(label.sprite);
    }
    prompt.sprite.visible = false;
    entries.push({ service,root,figure,sign,prompt });
  }

  function update(x,y) {
    if (disposed) return false;
    const now = performance.now();
    let changed = false;
    for (const entry of entries) {
      const { service,root,figure,sign,prompt } = entry;
      const distance = (x-service.x-.5)**2+(y-service.y-.5)**2;
      const visible = !combat && distance <= 25;
      if (root.visible !== visible) changed = true;
      root.visible = visible;
      const inside = Math.floor(x) === service.x && Math.floor(y) === service.y;
      prompt.sprite.visible = inside;
      sign.sprite.visible = !inside && distance <= 9;
      if (visible && figure.hasEffects) figure.updateEffects(now);
    }
    return changed;
  }

  function setCombat(active) {
    if (disposed) return;
    combat = Boolean(active);
    group.visible = !combat;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const { figure,sign,prompt } of entries) {
      figure.dispose();
      for (const { texture,material } of [sign,prompt]) {
        texture.dispose();
        material.dispose();
      }
    }
    for (const surfaces of standards.values()) for (const { geometry } of surfaces) geometry.dispose();
    for (const material of materials.values()) material.dispose();
    entries.length = 0;
    standards.clear();
    materials.clear();
    group.removeFromParent();
    group.clear();
  }

  return { group,update,setCombat,dispose };
}
