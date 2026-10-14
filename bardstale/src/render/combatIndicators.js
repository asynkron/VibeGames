import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { footprintCenter, normalizeFootprint, occupiesCell } from '../combatFootprints.js';

const STYLES = {
  reachable: { color: 0x63d68d, width: 0.018, line: 0.72, fill: 0.19, height: 0.022 },
  active: { color: 0xf6d18a, width: 0.03, line: 0.96, fill: 0.035, height: 0.03 },
  attack: { color: 0xff6d63, width: 0.028, line: 0.94, fill: 0.22, height: 0.034 },
  spell: { color: 0x83d6ed, width: 0.028, line: 0.94, fill: 0.04, height: 0.034 },
  cursor: { color: 0xfff2cd, width: 0.04, line: 1, fill: 0.025, height: 0.04 },
};

const VERTEX_SHADER = `
  uniform float cellSize;
  varying vec2 localPosition;
  varying vec2 halfSize;

  void main() {
    vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz)) / cellSize;
    halfSize = size * 0.5;
    localPosition = (uv - 0.5) * size;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 color;
  uniform float lineWidth;
  uniform float lineOpacity;
  uniform float fillOpacity;
  varying vec2 localPosition;
  varying vec2 halfSize;

  void main() {
    vec2 edge = abs(localPosition) - halfSize;
    float distance = max(edge.x, edge.y);
    float antialias = max(fwidth(distance), 0.0001);
    float inner = 1.0 - smoothstep(-antialias, antialias, distance + lineWidth);
    float opacity = (1.0 - inner) * lineOpacity + inner * fillOpacity;
    if (opacity < 0.001) discard;
    gl_FragColor = vec4(color, opacity);
    #include <colorspace_fragment>
  }
`;

/** Crisp floor indicators with one retained GPU batch for each interaction state. */
export function createCombatIndicators(parent, cellSize) {
  const group = new THREE.Group();
  group.name = 'combat-indicators';
  parent.add(group);
  const geometry = new THREE.PlaneGeometry(1, 1);
  const transform = new THREE.Object3D();
  transform.rotation.x = -Math.PI / 2;
  const batches = new Map();
  for (const [name, style] of Object.entries(STYLES)) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        cellSize: { value: cellSize },
        color: { value: new THREE.Color(style.color) },
        lineWidth: { value: style.width },
        lineOpacity: { value: style.line },
        fillOpacity: { value: style.fill },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      extensions: { derivatives: true },
    });
    material.name = `combat-indicator-${name}`;
    batches.set(name, { style, material, mesh: null, capacity: 0 });
  }

  function meshFor(name, count) {
    const batch = batches.get(name);
    if (count <= batch.capacity) return batch.mesh;
    if (batch.mesh) {
      group.remove(batch.mesh);
      batch.mesh.dispose();
    }
    batch.capacity = 2 ** Math.ceil(Math.log2(Math.max(4, count)));
    const mesh = new THREE.InstancedMesh(geometry, batch.material, batch.capacity);
    mesh.name = `combat-indicator-${name}`;
    mesh.userData.indicatorStyle = name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = name === 'cursor' ? 4 : name === 'reachable' ? 2 : 3;
    mesh.raycast = () => {};
    group.add(mesh);
    batch.mesh = mesh;
    return mesh;
  }

  function write(name, markers) {
    const batch = batches.get(name);
    const mesh = meshFor(name, markers.length);
    if (!mesh) return;
    mesh.count = markers.length;
    mesh.visible = markers.length > 0;
    if (!markers.length) return;
    for (let index = 0; index < markers.length; index += 1) {
      const marker = markers[index];
      const center = footprintCenter(marker);
      const { width, height } = normalizeFootprint(marker.footprint);
      transform.position.set(center.x * cellSize, batch.style.height * cellSize, center.y * cellSize);
      transform.scale.set(width * cellSize, height * cellSize, 1);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function sync(snapshot) {
    const active = snapshot.units.find(unit => unit.alive && unit.id === snapshot.activeId);
    const targetIds = new Set(snapshot.targetIds);
    const targets = snapshot.units.filter(unit => unit.alive && targetIds.has(unit.id));
    const attack = snapshot.targetKind === 'attack';
    const cursor = snapshot.mode === 'target' && snapshot.cursor
      ? snapshot.units.find(unit => unit.alive && occupiesCell(unit, snapshot.cursor.x, snapshot.cursor.y))
        || snapshot.cursor
      : null;
    write('reachable', snapshot.reachable.filter(cell => cell.cost > 0));
    write('active', active ? [active] : []);
    write('attack', attack ? targets : []);
    write('spell', attack ? [] : targets);
    write('cursor', cursor ? [cursor] : []);
  }

  function clear() {
    for (const { mesh } of batches.values()) {
      if (!mesh) continue;
      mesh.count = 0;
      mesh.visible = false;
    }
  }

  function dispose() {
    parent.remove(group);
    for (const { mesh, material } of batches.values()) {
      if (mesh) mesh.dispose();
      material.dispose();
    }
    geometry.dispose();
    group.clear();
    batches.clear();
  }

  return { sync, clear, dispose };
}
