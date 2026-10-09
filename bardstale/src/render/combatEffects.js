import { footprintCenter, normalizeFootprint } from '../combatFootprints.js';

const EFFECT_COLORS = {
  slash: 0xffffaa, bolt: 0x55ccff, arrow: 0xffdd88,
  heal: 0x55ff55, burst: 0xff7733, buff: 0x55ffff,
};
const EFFECT_DURATIONS = { slash: 360, bolt: 720, arrow: 640, heal: 900, burst: 780, buff: 850 };
const PROJECTILE_DURATION = 360;
const MAX_PUDDLES = 96;
const FLASH_LIGHT_COUNT = 4;
const DOME_HEIGHT = 1.55;

function seedFor(value) {
  let seed = 2166136261;
  for (const character of String(value)) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  return seed;
}

function randomFor(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pixelLine(ctx, x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const next = 2 * error;
    if (next >= dy) { error += dy; x0 += sx; }
    if (next <= dx) { error += dx; y0 += sy; }
  }
}

function pixelCircle(ctx, center, radius, segments = 48) {
  for (let i = 0; i < segments; i++) {
    const a = i * Math.PI * 2 / segments, b = (i + 1) * Math.PI * 2 / segments;
    pixelLine(ctx, center + Math.cos(a) * radius, center + Math.sin(a) * radius,
      center + Math.cos(b) * radius, center + Math.sin(b) * radius);
  }
}

export function createCombatEffects(THREE, parent, cellSize, actors) {
  const group = new THREE.Group();
  group.name = 'combat-effects';
  parent.add(group);
  const textures = new Map();
  const geometries = new Map();
  const effects = new Set();
  const auras = new Map();
  const puddles = new Map();
  const previousUnits = new Map();
  const flashLights = [];

  function geometry(name) {
    if (!geometries.has(name)) {
      const item = name === 'dome' ? new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)
        : name === 'rim' ? new THREE.TorusGeometry(1, 0.012, 4, 24) : new THREE.PlaneGeometry(1, 1);
      geometries.set(name, item);
    }
    return geometries.get(name);
  }

  function texture(shape) {
    if (textures.has(shape)) return textures.get(shape);
    const canvas = document.createElement('canvas');
    const floorShape = shape.startsWith('rune:') || shape.startsWith('blood:');
    canvas.width = floorShape ? 32 : shape === 'arrow' ? 16 : 8;
    canvas.height = floorShape ? 32 : 8;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ffffff';
    if (shape.startsWith('rune:')) {
      pixelCircle(ctx, 15.5, 14);
      pixelCircle(ctx, 15.5, 10);
      const style = shape.slice(5);
      const sides = style === 'holy' ? 4 : style === 'nature' ? 5 : 6;
      const jump = style === 'holy' ? 1 : 2;
      for (let i = 0; i < sides; i++) {
        const angle = i * Math.PI * 2 / sides - Math.PI / 2;
        const next = (i + jump) * Math.PI * 2 / sides - Math.PI / 2;
        pixelLine(ctx, 15.5 + Math.cos(angle) * 7, 15.5 + Math.sin(angle) * 7,
          15.5 + Math.cos(next) * 7, 15.5 + Math.sin(next) * 7);
      }
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const x = 15.5 + Math.cos(angle) * 12, y = 15.5 + Math.sin(angle) * 12;
        pixelLine(ctx, x - 1, y - 1, x + 1, y + 1);
        if (i % 2 === 0) pixelLine(ctx, x - 1, y + 1, x + 1, y - 1);
      }
      ctx.fillRect(15, 15, 2, 2);
    } else if (shape.startsWith('blood:')) {
      const random = randomFor(seedFor(shape));
      ctx.fillStyle = '#bb7777';
      for (let i = 0; i < 23; i++) {
        const angle = random() * Math.PI * 2, radius = random() * 12;
        const size = i < 10 ? 3 + Math.floor(random() * 5) : 1 + Math.floor(random() * 3);
        ctx.fillRect(Math.floor(16 + Math.cos(angle) * radius - size / 2),
          Math.floor(16 + Math.sin(angle) * radius - size / 2), size, size);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 12, 9, 7);
      ctx.fillRect(13, 10, 5, 12);
      ctx.fillStyle = '#884444';
      ctx.fillRect(12, 14, 6, 3);
    } else if (shape === 'arrow') {
      ctx.fillStyle = '#111118';
      ctx.fillRect(1, 2, 3, 4); ctx.fillRect(3, 3, 10, 2); ctx.fillRect(11, 1, 2, 6);
      ctx.fillRect(13, 2, 1, 4); ctx.fillRect(14, 3, 1, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 2, 1, 1); ctx.fillRect(2, 5, 1, 1); ctx.fillRect(3, 3, 10, 1);
      ctx.fillRect(12, 2, 1, 4); ctx.fillRect(13, 3, 1, 2);
    } else if (shape === 'slash') {
      for (let i = 1; i < 7; i++) ctx.fillRect(i, 7 - i, 2, 1);
    } else if (shape === 'plus') {
      ctx.fillRect(3, 1, 2, 6); ctx.fillRect(1, 3, 6, 2);
    } else if (shape === 'ring') {
      ctx.fillRect(2, 1, 4, 1); ctx.fillRect(2, 6, 4, 1);
      ctx.fillRect(1, 2, 1, 4); ctx.fillRect(6, 2, 1, 4);
    } else if (shape === 'flame') {
      ctx.fillRect(3, 0, 1, 2); ctx.fillRect(3, 2, 2, 2);
      ctx.fillRect(2, 4, 4, 3); ctx.fillRect(1, 5, 6, 2);
    } else if (shape === 'shard') {
      pixelLine(ctx, 1, 6, 6, 1); pixelLine(ctx, 2, 6, 6, 2);
      ctx.fillRect(3, 3, 2, 2);
    } else if (shape === 'chunk') {
      ctx.fillStyle = '#180b11'; ctx.fillRect(1, 1, 6, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(2, 2, 4, 3); ctx.fillRect(3, 5, 2, 1);
    } else {
      ctx.fillRect(3, 1, 2, 6); ctx.fillRect(1, 3, 6, 2);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    textures.set(shape, map);
    return map;
  }

  function position(cell, height = 0.5) {
    const center = footprintCenter(cell);
    return new THREE.Vector3(center.x*cellSize,height*cellSize,center.y*cellSize);
  }

  function bodyPosition(unit, fraction) {
    return actors.effectAnchorFor(unit.id,fraction);
  }

  function sprite(owner, shape, color, size, luminous = true) {
    const material = new THREE.SpriteMaterial({
      map: texture(shape), color, transparent: true, alphaTest: 0.04,
      depthTest: true, depthWrite: false,
      blending: luminous ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const item = new THREE.Sprite(material);
    item.scale.set(size * cellSize, size * cellSize, 1);
    item.renderOrder = 8;
    owner.group.add(item);
    owner.materials.push(material);
    return item;
  }

  function floorRune(owner, cell, style, color, size = 1.45) {
    const material = new THREE.MeshBasicMaterial({
      map: texture(`rune:${style}`), color, transparent: true, opacity: 0.7,
      depthTest: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(geometry('plane'), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position(cell, 0.016));
    ring.userData.footprint = normalizeFootprint(cell.footprint);
    ring.scale.set(size*cellSize*ring.userData.footprint.width,size*cellSize*ring.userData.footprint.height,1);
    ring.renderOrder = 1;
    owner.group.add(ring);
    owner.materials.push(material);
    return ring;
  }

  function createEffect(kind, duration) {
    let resolve;
    const done = new Promise((complete) => { resolve = complete; });
    const effect = {
      group: new THREE.Group(), materials: [], tracks: [], circles: [],
      start: performance.now(), duration, resolve, kind, done,
    };
    group.add(effect.group);
    effects.add(effect);
    return effect;
  }

  function makeFlashLights() {
    if (flashLights.length) return;
    for (let i = 0; i < FLASH_LIGHT_COUNT; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 2.4 * cellSize, 2);
      group.add(light);
      flashLights.push(light);
    }
  }

  function impact(effect, target, kind, color, style) {
    const count = kind === 'burst' ? 24 : kind === 'heal' || kind === 'buff' ? 16 : 12;
    const random = randomFor(seedFor(`${target.id}:${kind}`));
    const particles = [];
    for (let i = 0; i < count; i++) {
      const shape = kind === 'heal' ? 'plus' : kind === 'buff' ? 'ring'
        : style === 'flame' ? 'flame' : style === 'frost' ? 'shard' : 'spark';
      const item = sprite(effect, shape, i % 5 === 0 ? 0xffffff : color, (kind === 'heal' ? 0.17 : 0.08) + random() * 0.08);
      particles.push({ item, angle: i * Math.PI * 2 / count, height: random() * 0.25,
        spread: 0.65 + random() * 0.55, origin: bodyPosition(target, 0.25) });
    }
    return particles;
  }

  function drawParticles(particles, progress, kind, style) {
    for (const { item, angle, height, origin, spread } of particles) {
      item.visible = progress >= 0 && progress < 1;
      if (!item.visible) continue;
      const rising = kind === 'heal' || kind === 'buff';
      const radius = rising ? 0.28 + Math.sin(progress * Math.PI) * 0.14 : progress * spread;
      const turn = angle + (rising ? progress * Math.PI * 2 : style === 'arcane' || style === 'temporal' ? progress * Math.PI / 2 : 0);
      const lift = rising ? progress * 1.05 : style === 'flame' ? progress * 0.85 : Math.sin(progress * Math.PI) * 0.5;
      item.position.set(origin.x + Math.cos(turn) * radius * cellSize,
        origin.y + (height + lift) * cellSize,
        origin.z + Math.sin(turn) * radius * cellSize);
      item.material.opacity = Math.min(1, (1 - progress) * 2.2);
    }
  }

  function release(effect) {
    effects.delete(effect);
    group.remove(effect.group);
    for (const material of effect.materials) material.dispose();
    effect.resolve();
  }

  function play({ kind, source, targets, color = EFFECT_COLORS[kind], rune }) {
    if (!Object.hasOwn(EFFECT_DURATIONS, kind)) throw new Error(`Unknown combat effect: ${kind}`);
    if (!targets.length) return Promise.resolve();
    makeFlashLights();
    const effect = createEffect(kind, EFFECT_DURATIONS[kind]);
    effect.color = color;
    effect.style = rune?.style || (color === 0xff8034 || color === 0xff7733 ? 'flame'
      : color === 0x90c8ff || color === 0x64eeff ? 'frost' : 'arcane');
    effect.source = bodyPosition(source, 0.65);
    if (rune) effect.circles.push({ mesh: floorRune(effect, source, rune.style, rune.color), baseSize: 1.45 });
    for (const target of targets) {
      const particles = impact(effect, target, kind, color, effect.style);
      const at = bodyPosition(target, 0.55);
      const track = { particles, at, color };
      if (kind === 'arrow' || kind === 'bolt') {
        track.projectile = sprite(effect, kind === 'arrow' ? 'arrow' : effect.style === 'flame' ? 'flame' : effect.style === 'frost' ? 'shard' : 'spark', color, kind === 'arrow' ? 0.65 : 0.27);
        if (kind === 'arrow') track.projectile.scale.y *= 0.5;
        track.from = bodyPosition(source, 0.6);
        track.to = at;
        track.trail = Array.from({ length: kind === 'bolt' ? 8 : 3 }, (_, index) =>
          sprite(effect, 'spark', index % 3 === 0 ? 0xffffff : color, 0.13 - index * 0.008));
        if (kind === 'arrow') {
          const cameraFrom = new THREE.Vector3(), cameraTo = new THREE.Vector3();
          track.projectile.onBeforeRender = (_renderer, _scene, camera) => {
            cameraFrom.copy(track.from).applyMatrix4(camera.matrixWorldInverse);
            cameraTo.copy(track.to).applyMatrix4(camera.matrixWorldInverse);
            track.projectile.material.rotation = Math.atan2(cameraTo.y - cameraFrom.y, cameraTo.x - cameraFrom.x);
          };
        }
      } else if (kind === 'slash') {
        track.slash = sprite(effect, 'slash', color, 0.95);
        track.slash.position.copy(at);
      } else {
        track.ring = sprite(effect, 'ring', color, 0.65);
        track.ring.position.copy(at);
        if (rune && target.id !== source.id) effect.circles.push({ mesh: floorRune(effect, target, rune.style, rune.color, 1.2), baseSize: 1.2 });
      }
      effect.tracks.push(track);
    }
    draw(effect, 0);
    return effect.done;
  }

  function draw(effect, elapsed) {
    const progress = elapsed / effect.duration;
    if (effect.kind === 'blood') {
      for (const { item, angle, distance, lift, origin, spin } of effect.tracks) {
        item.position.set(origin.x + Math.cos(angle) * progress * distance * cellSize,
          Math.max(0.04 * cellSize, origin.y * (1 - progress) + Math.sin(progress * Math.PI) * lift * cellSize),
          origin.z + Math.sin(angle) * progress * distance * cellSize);
        item.material.opacity = Math.min(1, (1 - progress) * 3);
        item.material.rotation = spin * progress;
      }
      return;
    }
    for (const track of effect.tracks) {
      if (track.projectile) {
        const flight = Math.min(1, elapsed / PROJECTILE_DURATION);
        track.projectile.visible = flight < 1;
        track.projectile.position.copy(track.from).lerp(track.to, flight);
        if (effect.kind === 'arrow') track.projectile.position.y += Math.sin(flight * Math.PI) * 0.16 * cellSize;
        for (let i = 0; i < track.trail.length; i++) {
          const tail = Math.max(0, (elapsed - (i + 1) * 20) / PROJECTILE_DURATION);
          const item = track.trail[i];
          item.visible = elapsed > (i + 1) * 20 && tail < 1;
          item.position.copy(track.from).lerp(track.to, Math.min(1, tail));
          item.material.opacity = (1 - i / track.trail.length) * 0.55;
        }
        drawParticles(track.particles, (elapsed - PROJECTILE_DURATION) / (effect.duration - PROJECTILE_DURATION), effect.kind, effect.style);
      } else drawParticles(track.particles, progress, effect.kind, effect.style);
      if (track.slash) {
        track.slash.material.rotation = progress * Math.PI / 2;
        track.slash.material.opacity = 1 - progress;
      }
      if (track.ring) {
        const size = (0.5 + progress * 0.95) * cellSize;
        track.ring.scale.set(size, size, 1);
        track.ring.material.rotation = progress * Math.PI / 2;
        track.ring.material.opacity = Math.sin(progress * Math.PI) * 0.8;
      }
    }
    for (const { mesh, baseSize } of effect.circles) {
      const size = baseSize * (0.75 + Math.sin(progress * Math.PI) * 0.35) * cellSize;
      mesh.scale.set(size*mesh.userData.footprint.width,size*mesh.userData.footprint.height,1);
      mesh.rotation.z = progress * Math.PI / 3;
      mesh.material.opacity = Math.sin(progress * Math.PI) * 0.85;
    }
  }

  function createAura(unit, descriptor) {
    const entry = { group: new THREE.Group(), unitId: unit.id, materials: [], descriptor, phase: seedFor(`${unit.id}:${descriptor.id}`) % 628 / 100 };
    group.add(entry.group);
    entry.circle = floorRune(entry, { x: -0.5, y: -0.5 }, descriptor.style, descriptor.color, 1.4);
    if (descriptor.kind === 'shield') {
      const material = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(descriptor.color) }, opacity: { value: 0.26 } },
        vertexShader: `varying vec3 eyeNormal; varying vec3 eyePosition;
          void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
            eyeNormal = normalize(normalMatrix * normal); eyePosition = -p.xyz;
            gl_Position = projectionMatrix * p; }`,
        fragmentShader: `uniform vec3 color; uniform float opacity;
          varying vec3 eyeNormal; varying vec3 eyePosition;
          void main() { float edge = pow(1.0 - abs(dot(normalize(eyeNormal), normalize(eyePosition))), 2.0);
            gl_FragColor = vec4(color, opacity * (0.14 + edge * 0.86));
            #include <colorspace_fragment>
          }`,
        transparent: true, depthTest: true, depthWrite: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      });
      entry.dome = new THREE.Mesh(geometry('dome'), material);
      entry.dome.scale.set(0.67 * cellSize, DOME_HEIGHT * cellSize, 0.67 * cellSize);
      entry.dome.renderOrder = 4;
      entry.group.add(entry.dome);
      entry.materials.push(material);
      entry.rims = [];
      for (const height of [0.04, 0.62]) {
        const rimMaterial = new THREE.MeshBasicMaterial({ color: descriptor.color, transparent: true, opacity: 0.6,
          depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending });
        const rim = new THREE.Mesh(geometry('rim'), rimMaterial);
        rim.rotation.x = -Math.PI / 2;
        const radius = Math.sqrt(1 - (height / DOME_HEIGHT) ** 2) * 0.67 * cellSize;
        rim.scale.setScalar(radius);
        rim.position.y = height * cellSize;
        rim.renderOrder = 4;
        entry.group.add(rim);
        entry.materials.push(rimMaterial);
        entry.rims.push(rim);
      }
    }
    entry.sparks = Array.from({ length: descriptor.kind === 'shield' ? 5 : 3 }, () =>
      sprite(entry, 'spark', descriptor.color, 0.075));
    return entry;
  }

  function removeAura(entry) {
    group.remove(entry.group);
    for (const material of entry.materials) material.dispose();
  }

  function bloodColors(unit) {
    if (/serpent|slime|ooze/i.test(unit.kind)) return { particle: 0x8bd83d, floor: 0x314d16 };
    if (/skeleton|lich|wraith|ghost/i.test(unit.kind)) return { particle: 0xc6baa1, floor: 0x484139 };
    return { particle: 0xd93b47, floor: 0x701621 };
  }

  function addBlood(unit, damage, death) {
    const random = randomFor(seedFor(`${unit.id}:${unit.hpCurrent}:${unit.x}:${unit.y}`));
    const colors = bloodColors(unit);
    const key = `${unit.x}:${unit.y}`;
    let puddle = puddles.get(key);
    if (!puddle && puddles.size >= MAX_PUDDLES) {
      const at = position(unit, 0.008);
      let nearestDistance = Infinity;
      for (const existing of puddles.values()) {
        const distance = existing.position.distanceTo(at);
        if (distance < nearestDistance) { nearestDistance = distance; puddle = existing; }
      }
      puddle.userData.size = Math.max(puddle.userData.size, nearestDistance * 2 / cellSize + 0.8);
    }
    if (!puddle) {
      const material = new THREE.MeshBasicMaterial({ map: texture(`blood:${seedFor(unit.id) % 4}`), color: colors.floor,
        transparent: true, opacity: 0.86, depthTest: true, depthWrite: false, side: THREE.DoubleSide });
      puddle = new THREE.Mesh(geometry('plane'), material);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.copy(position(unit, 0.008));
      puddle.position.x += (random() - 0.5) * 0.38 * cellSize;
      puddle.position.z += (random() - 0.5) * 0.38 * cellSize;
      puddle.rotation.z = random() * Math.PI * 2;
      puddle.userData.size = 0.55;
      puddle.renderOrder = 1;
      group.add(puddle);
      puddles.set(key, puddle);
    }
    puddle.userData.size = Math.max(puddle.userData.size, Math.min(1.5, puddle.userData.size + (death ? 0.45 : Math.min(0.24, damage * 0.025))));
    puddle.scale.set(puddle.userData.size * cellSize, puddle.userData.size * cellSize, 1);
    const effect = createEffect('blood', death ? 1050 : 620);
    const count = death ? 26 : Math.min(15, 5 + Math.ceil(damage / 2));
    for (let i = 0; i < count; i++) {
      const chunk = death && i % 4 === 0;
      effect.tracks.push({ item: sprite(effect, chunk ? 'chunk' : 'spark', colors.particle, chunk ? 0.14 : 0.045 + random() * 0.05, false),
        angle: random() * Math.PI * 2, distance: (death ? 0.65 : 0.25) + random() * (death ? 0.7 : 0.5),
        lift: 0.15 + random() * 0.6, origin: bodyPosition(unit, 0.45), spin: (random() - 0.5) * Math.PI * 4 });
    }
    draw(effect, 0);
  }

  function sync(units) {
    if (units.length) makeFlashLights();
    const liveAuras = new Set();
    const ids = new Set();
    for (const unit of units) {
      ids.add(unit.id);
      const previous = previousUnits.get(unit.id);
      if (previous && unit.hpCurrent < previous.hpCurrent) addBlood(unit, previous.hpCurrent - unit.hpCurrent, previous.alive && !unit.alive);
      previousUnits.set(unit.id, { hpCurrent: unit.hpCurrent, alive: unit.alive });
      for (const descriptor of unit.auras) {
        const key = `${unit.id}:${descriptor.id}`;
        liveAuras.add(key);
        let entry = auras.get(key);
        if (entry && (entry.descriptor.kind !== descriptor.kind || entry.descriptor.color !== descriptor.color || entry.descriptor.style !== descriptor.style)) {
          removeAura(entry); auras.delete(key); entry = null;
        }
        if (!entry) { entry = createAura(unit, descriptor); auras.set(key, entry); }
        const footprint = normalizeFootprint(unit.footprint);
        const modelHeight = actors.boundsFor(unit.id).getSize(new THREE.Vector3()).y;
        entry.group.scale.set(footprint.width,Math.max(1,modelHeight/(DOME_HEIGHT*cellSize)),footprint.height);
        entry.group.position.copy(position(unit, 0));
      }
    }
    for (const [key, entry] of auras) {
      if (!liveAuras.has(key)) { removeAura(entry); auras.delete(key); }
    }
    for (const id of previousUnits.keys()) if (!ids.has(id)) previousUnits.delete(id);
  }

  function update(now) {
    const flashes = [];
    for (const effect of effects) {
      const elapsed = Math.max(0, now - effect.start);
      if (elapsed >= effect.duration) { release(effect); continue; }
      draw(effect, elapsed);
      if (effect.kind === 'blood') continue;
      const projectile = effect.kind === 'bolt' || effect.kind === 'arrow';
      const phase = projectile ? (elapsed - PROJECTILE_DURATION) / (effect.duration - PROJECTILE_DURATION) : elapsed / effect.duration;
      if (phase >= 0) {
        const strength = Math.sin(Math.min(1, phase) * Math.PI);
        for (const track of effect.tracks) flashes.push({ at: track.at, color: effect.color, strength });
      }
      if (effect.circles.length && elapsed < 350) flashes.push({ at: effect.source, color: effect.color, strength: Math.sin(elapsed / 350 * Math.PI) * 0.55 });
    }
    flashes.sort((a, b) => b.strength - a.strength);
    for (let i = 0; i < flashLights.length; i++) {
      const flash = flashes[i], light = flashLights[i];
      light.intensity = flash ? flash.strength * 1.6 * cellSize ** 2 : 0;
      if (flash) { light.position.copy(flash.at); light.color.set(flash.color); }
    }
    const seconds = now / 1000;
    for (const entry of auras.values()) {
      const at = actors.positionFor(entry.unitId);
      entry.group.position.set(at.x,0,at.z);
      const pulse = Math.sin(seconds * 2.8 + entry.phase);
      entry.circle.material.opacity = 0.4 + pulse * 0.12;
      entry.circle.rotation.z = seconds * 0.18 + entry.phase;
      if (entry.dome) entry.dome.material.uniforms.opacity.value = 0.23 + pulse * 0.035;
      for (let i = 0; i < entry.sparks.length; i++) {
        const angle = seconds * 0.8 + entry.phase + i * Math.PI * 2 / entry.sparks.length;
        const item = entry.sparks[i];
        item.position.set(Math.cos(angle) * 0.6 * cellSize,
          (0.25 + ((seconds * 0.22 + i / entry.sparks.length) % 1) * 0.68) * cellSize,
          Math.sin(angle) * 0.6 * cellSize);
        item.material.opacity = 0.45 + Math.sin(angle) * 0.2;
      }
    }
  }

  function clear() {
    for (const effect of effects) release(effect);
    for (const entry of auras.values()) removeAura(entry);
    auras.clear();
    for (const puddle of puddles.values()) { group.remove(puddle); puddle.material.dispose(); }
    puddles.clear();
    previousUnits.clear();
    for (const light of flashLights) group.remove(light);
    flashLights.length = 0;
    for (const map of textures.values()) map.dispose();
    textures.clear();
    for (const item of geometries.values()) item.dispose();
    geometries.clear();
  }

  return { play, sync, update, clear };
}
