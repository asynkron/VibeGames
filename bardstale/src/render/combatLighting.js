import { footprintCenter, normalizeFootprint } from '../combatFootprints.js';

const TORCH_COLOR = 0xffddb0;
const TORCH_INTENSITY = 1.45;
const TORCH_DECAY = 2.2;
const SHADOW_OPACITY = 0.24;
const DEFEATED_SHADOW_OPACITY = 0.12;
const MAX_SHADOW_LIGHTS = 3;
const TORCH_HEIGHT = 1.55;
const TORCH_OFFSET_X = 0.55;
const TORCH_OFFSET_Z = -0.45;

export function createCombatLighting(THREE, parent, cellSize) {
  const group = new THREE.Group();
  parent.add(group);
  const entries = new Map();
  const shadowSlots = [];
  // Compensate for the raised torch so its pool of floor light keeps its warmth.
  const baseIntensity = TORCH_INTENSITY * Math.pow(cellSize, TORCH_DECAY) * 2;
  let resources = null;
  let previousTime = null;

  function shadowResources() {
    if (resources) return resources;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    resources = { texture, geometry: new THREE.PlaneGeometry(1, 1) };
    return resources;
  }

  function createEntry(unit) {
    const { texture, geometry } = shadowResources();
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0x000000,
      transparent: true,
      opacity: unit.alive ? SHADOW_OPACITY : DEFEATED_SHADOW_OPACITY,
      depthTest: true,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(geometry, material);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(0.48 * cellSize, 0.38 * cellSize, 1);
    shadow.renderOrder = 0;
    group.add(shadow);
    let phase = 0;
    for (const character of String(unit.id)) phase = (phase * 31 + character.charCodeAt(0)) >>> 0;
    return { shadow, light: null, phase: (phase % 628) / 100, targetOpacity: material.opacity };
  }

  function removeEntry(entry) {
    group.remove(entry.shadow);
    entry.shadow.material.dispose();
    if (entry.light) {
      entry.light.shadow.dispose();
      group.remove(entry.light);
    }
    for (const slot of shadowSlots) {
      if (slot.entry !== entry) continue;
      slot.entry = null;
      slot.light.visible = false;
      slot.light.shadow.needsUpdate = false;
    }
  }

  function createTorchLight(castsShadow) {
    const light = new THREE.PointLight(TORCH_COLOR, baseIntensity, 3.6 * cellSize, TORCH_DECAY);
    light.castShadow = castsShadow;
    light.shadow.autoUpdate = false;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.025 * cellSize;
    light.shadow.camera.far = light.distance;
    light.shadow.camera.updateProjectionMatrix();
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.004 * cellSize;
    light.shadow.radius = 1.5;
    group.add(light);
    return light;
  }

  function configureTorch(light, entry, x, y, z) {
    const range = 3.6 * cellSize * entry.lightScale;
    if (light.distance !== range) {
      light.distance = range;
      light.shadow.camera.far = range;
      light.shadow.camera.updateProjectionMatrix();
      if (light.castShadow) light.shadow.needsUpdate = true;
    }
    if (light.position.x !== x || light.position.y !== y || light.position.z !== z) {
      light.position.set(x, y, z);
      if (light.castShadow) light.shadow.needsUpdate = true;
    }
  }

  function sync({ units, activeId }) {
    const alive = units.filter(unit => unit.alive);
    const torchBearers = alive.filter(unit => unit.team === 'party');
    const anchor = alive.find(unit => unit.id === activeId) || alive[0];
    // Nearby party torches dominate the selected character's view. Bound cube-map work
    // independently of encounter size; every figure still casts into these maps.
    const distanceFromAnchor = unit => {
      const from = footprintCenter(anchor), to = footprintCenter(unit);
      return (to.x-from.x)**2+(to.y-from.y)**2;
    };
    const shadowIds = new Set(torchBearers.sort((a,b) => distanceFromAnchor(a)-distanceFromAnchor(b)
      || String(a.id).localeCompare(String(b.id))).slice(0,MAX_SHADOW_LIGHTS).map(unit=>unit.id));
    const ids = new Set(units.map((unit) => unit.id));
    for (const [id, entry] of entries) {
      if (ids.has(id)) continue;
      removeEntry(entry);
      entries.delete(id);
    }
    for (const unit of units) {
      let entry = entries.get(unit.id);
      if (!entry) {
        entry = createEntry(unit);
        entries.set(unit.id, entry);
      }
      const center = footprintCenter(unit);
      const { width, height } = normalizeFootprint(unit.footprint);
      const x = center.x * cellSize, z = center.y * cellSize;
      entry.offsetX = TORCH_OFFSET_X * cellSize * width;
      entry.offsetZ = TORCH_OFFSET_Z * cellSize * height;
      entry.lightScale = Math.max(width,height);
      entry.shadow.scale.set(0.48*cellSize*width,0.38*cellSize*height,1);
      entry.shadow.position.set(x, 0.004 * cellSize, z);
      entry.targetOpacity = unit.alive ? SHADOW_OPACITY : DEFEATED_SHADOW_OPACITY;
      if (unit.alive && unit.team === 'party') {
        if (!entry.light) entry.light = createTorchLight(false);
      } else if (entry.light) {
        entry.light.shadow.dispose();
        group.remove(entry.light);
        entry.light = null;
      }
      entry.shadowLight = null;
    }
    if (shadowIds.size && !shadowSlots.length) {
      for (let index = 0; index < MAX_SHADOW_LIGHTS; index++) {
        const light = createTorchLight(true);
        light.visible = false;
        light.shadow.needsUpdate = false;
        shadowSlots.push({ light, entry: null });
      }
    }
    // Keep each retained source in its slot. Selecting another character only
    // replaces sources that leave the nearest-three set, reusing their maps.
    const selectedEntries = new Set([...shadowIds].map(id => entries.get(id)));
    for (const slot of shadowSlots) {
      if (!selectedEntries.has(slot.entry)) {
        slot.entry = null;
        slot.light.visible = false;
        slot.light.shadow.needsUpdate = false;
      } else {
        slot.entry.shadowLight = slot.light;
      }
    }
    for (const entry of selectedEntries) {
      if (entry.shadowLight) continue;
      const slot = shadowSlots.find(candidate => !candidate.entry);
      slot.entry = entry;
      slot.light.visible = true;
      slot.light.shadow.needsUpdate = true;
      entry.shadowLight = slot.light;
    }
    for (const unit of units) {
      const entry = entries.get(unit.id);
      if (!entry.light) continue;
      entry.light.visible = !entry.shadowLight;
      const center = footprintCenter(unit);
      configureTorch(entry.shadowLight || entry.light, entry,
        center.x * cellSize + entry.offsetX, TORCH_HEIGHT * cellSize,
        center.y * cellSize + entry.offsetZ);
    }
  }

  function update(now, positionFor, { shadowDirty = false } = {}) {
    const elapsed = previousTime === null ? 0 : Math.min(100, Math.max(0, now - previousTime));
    previousTime = now;
    const fade = 1 - Math.exp(-elapsed / 140);
    const seconds = now / 1000;
    for (const [id, entry] of entries) {
      const position = positionFor(id);
      entry.shadow.position.set(position.x, 0.004 * cellSize, position.z);
      entry.shadow.material.opacity += (entry.targetOpacity - entry.shadow.material.opacity) * fade;
      if (entry.light) {
        const light = entry.shadowLight || entry.light;
        configureTorch(light, entry, position.x+entry.offsetX,
          position.y+TORCH_HEIGHT*cellSize,position.z+entry.offsetZ);
        if (shadowDirty && light.castShadow) light.shadow.needsUpdate = true;
        const flicker = Math.sin(seconds * 6.4 + entry.phase) * 0.04 + Math.sin(seconds * 13.1 + entry.phase * 1.7) * 0.025;
        light.intensity = baseIntensity * entry.lightScale ** 2 * (1 + flicker);
      }
    }
  }

  function clear() {
    for (const entry of entries.values()) removeEntry(entry);
    entries.clear();
    for (const { light } of shadowSlots) {
      light.shadow.dispose();
      group.remove(light);
    }
    shadowSlots.length = 0;
    if (resources) {
      resources.texture.dispose();
      resources.geometry.dispose();
      resources = null;
    }
    previousTime = null;
  }

  return { sync, update, clear };
}
