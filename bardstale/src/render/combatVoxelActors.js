import * as THREE from 'three';
import { assembleCombatVoxelModel } from './combatVoxelCatalog.js';
import { createVoxelFigure } from './voxelFigure.js';

const STEP_DURATION = 150;
const FALL_DURATION = 240;
const POSE_DURATIONS = { slash: 360, arrow: 640, bolt: 720, heal: 900, burst: 780, buff: 850 };

function initialDirection(unit, units) {
  let closest = null;
  let closestDistance = Infinity;
  for (const opponent of units) {
    if (!opponent.alive || opponent.team === unit.team) continue;
    const distance = (opponent.x - unit.x) ** 2 + (opponent.y - unit.y) ** 2;
    if (distance < closestDistance) {
      closest = opponent;
      closestDistance = distance;
    }
  }
  return closest ? { x: closest.x - unit.x, y: closest.y - unit.y }
    : { x: unit.team === 'party' ? 1 : -1, y: 0 };
}

/** Persistent, world-facing voxel actors; combat snapshots remain the source of game state. */
export function createCombatVoxelActors(parent, cellSize) {
  const group = new THREE.Group();
  group.name = 'combat-voxel-actors';
  parent.add(group);
  const entries = new Map();
  const models = new Map();

  function modelFor(unit) {
    const descriptor = { kind: unit.kind, equipment: unit.equipment, appearance: unit.appearance };
    const key = JSON.stringify(descriptor);
    if (!models.has(key)) models.set(key, assembleCombatVoxelModel(descriptor));
    return { key, model: models.get(key) };
  }

  function replaceFigure(entry, model, key) {
    if (entry.figure) {
      entry.pose.remove(entry.figure.group);
      entry.figure.dispose();
    }
    entry.figure = createVoxelFigure(model, { layout: 'figure' });
    entry.modelKey = key;
    entry.bounds = new THREE.Box3().setFromObject(entry.figure.group);
    entry.pose.add(entry.figure.group);
    // Keep voxel density stable when an item extends beyond the body.
    entry.pose.scale.setScalar(0.04 * cellSize * model.scale);
    entry.materials = new Set();
    entry.figure.group.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        material.depthWrite = true;
        entry.materials.add(material);
      }
    });
  }

  function release(entry) {
    group.remove(entry.root);
    entry.figure.dispose();
  }

  function face(entry, direction) {
    if (direction.x === 0 && direction.y === 0) return;
    entry.direction = direction;
    entry.facing.rotation.y = Math.atan2(direction.x, direction.y);
  }

  function sync(snapshot) {
    const now = performance.now();
    const ids = new Set(snapshot.units.map(unit => unit.id));
    for (const [id, entry] of entries) {
      if (ids.has(id)) continue;
      release(entry);
      entries.delete(id);
    }
    const active = snapshot.units.find(unit => unit.id === snapshot.activeId && unit.alive);
    const target = snapshot.units.find(unit => unit.id === snapshot.targetId && unit.alive);
    for (const unit of snapshot.units) {
      let entry = entries.get(unit.id);
      const center = new THREE.Vector3((unit.x + 0.5) * cellSize, 0, (unit.y + 0.5) * cellSize);
      const { key, model } = modelFor(unit);
      if (!entry) {
        const root = new THREE.Group();
        root.name = `combat-actor:${unit.id}`;
        root.userData.combatActor = unit.id;
        root.position.copy(center);
        const facing = new THREE.Group();
        const pose = new THREE.Group();
        facing.add(pose);
        root.add(facing);
        group.add(root);
        entry = { root, facing, pose, from: center.clone(), to: center.clone(), stepStart: now,
          direction: initialDirection(unit, snapshot.units), alive: unit.alive,
          fall: unit.alive ? 0 : 1, fallFrom: unit.alive ? 0 : 1, fallStart: now, action: null };
        entries.set(unit.id, entry);
        replaceFigure(entry, model, key);
      } else if (entry.modelKey !== key) {
        replaceFigure(entry, model, key);
      }
      const previousCell = entry.root.userData.combatCell;
      if (previousCell && (previousCell.x !== unit.x || previousCell.y !== unit.y)) {
        face(entry, { x: unit.x - previousCell.x, y: unit.y - previousCell.y });
        entry.from.copy(entry.root.position).setY(0);
        entry.to.copy(center);
        entry.stepStart = now;
      }
      if (unit === active && target) face(entry, { x: target.x - unit.x, y: target.y - unit.y });
      else face(entry, entry.direction);
      if (entry.alive !== unit.alive) {
        entry.fallFrom = entry.fall;
        entry.fallStart = now;
        entry.alive = unit.alive;
        entry.action = null;
      }
      entry.root.userData.combatCell = { x: unit.x, y: unit.y };
      entry.unit = unit;
    }
    const usedModels = new Set([...entries.values()].map(entry => entry.modelKey));
    for (const key of models.keys()) if (!usedModels.has(key)) models.delete(key);
    update(now);
  }

  function play(effect) {
    const now = performance.now();
    const source = entries.get(effect.source.id);
    const target = effect.targets.find(unit => unit.id !== effect.source.id);
    if (source?.alive) {
      if (target) face(source, { x: target.x - effect.source.x, y: target.y - effect.source.y });
      source.action = { kind: effect.kind === 'slash' || effect.kind === 'arrow' ? 'attack' : 'cast',
        start: now, duration: POSE_DURATIONS[effect.kind] };
    }
    if (effect.kind === 'heal' || effect.kind === 'buff') return;
    const delay = effect.kind === 'arrow' || effect.kind === 'bolt' ? 360 : 90;
    for (const target of effect.targets) {
      const entry = entries.get(target.id);
      if (entry?.alive && entry !== source) entry.action = { kind: 'recoil', start: now + delay, duration: 230 };
    }
  }

  function update(now) {
    for (const entry of entries.values()) {
      const step = Math.min(1, Math.max(0, (now - entry.stepStart) / STEP_DURATION));
      const eased = step * step * (3 - 2 * step);
      entry.root.position.lerpVectors(entry.from, entry.to, eased);
      const walking = entry.from.distanceToSquared(entry.to) > 0.000001 && step < 1 && entry.alive;
      entry.root.position.y = cellSize * (0.012 + (walking ? Math.sin(step * Math.PI) * 0.04 : 0));
      const fallTime = Math.min(1, Math.max(0, (now - entry.fallStart) / FALL_DURATION));
      entry.fall = THREE.MathUtils.lerp(entry.fallFrom, entry.alive ? 0 : 1, fallTime);
      let tilt = -entry.fall * Math.PI / 2;
      let lunge = 0;
      let lift = 0;
      const action = entry.action;
      if (action && entry.alive) {
        const progress = (now - action.start) / action.duration;
        if (progress >= 1) entry.action = null;
        else if (progress >= 0) {
          const pulse = Math.sin(progress * Math.PI);
          if (action.kind === 'attack') { tilt = pulse * 0.18; lunge = pulse * 0.09 * cellSize; }
          else if (action.kind === 'recoil') { tilt = -pulse * 0.2; lunge = -pulse * 0.045 * cellSize; }
          else { tilt = -pulse * 0.08; lift = pulse * 0.025 * cellSize; }
        }
      }
      entry.pose.position.set(0, lift, lunge);
      entry.figure.group.rotation.x = tilt;
      // Keep the lowest voxel on the floor even as a defeated figure tips onto its back.
      const { min, max } = entry.bounds;
      const cosine = Math.cos(tilt), sine = Math.sin(tilt);
      entry.figure.group.position.y = -Math.min(min.y * cosine - min.z * sine, min.y * cosine - max.z * sine);
      const shade = 1 - entry.fall * 0.58;
      for (const material of entry.materials) material.color.setRGB(shade, shade, shade);
    }
  }

  function pick(raycaster) {
    const hits = raycaster.intersectObject(group, true);
    for (const hit of hits) {
      if (!hit.object.isMesh) continue;
      let object = hit.object;
      while (object && object !== group) {
        if (object.userData.combatCell) return { ...object.userData.combatCell };
        object = object.parent;
      }
    }
    return null;
  }

  function clear() {
    for (const entry of entries.values()) release(entry);
    entries.clear();
    models.clear();
  }

  function positionFor(id) {
    return entries.get(id).root.position;
  }

  return { sync, update, play, pick, clear, positionFor };
}
