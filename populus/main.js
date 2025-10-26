import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

const GRID_SIZE = 32; // allow a large terrain and only show a moving viewport
const HEIGHT_MIN = 0;
const HEIGHT_MAX = 6; // extend the plateau so peaks can rise further above sea level
const HEIGHT_STEP = 1;
const HEIGHT_SCALE = 0.6; // world-space height multiplier so the plateau stays readable
const SEA_LEVEL = 1; // user-requested water height
const FRAME_GRID_SIZE = GRID_SIZE + 6; // outer presentation grid hosting the playable area
const WATER_SIZE = GRID_SIZE - 1 + 2.5; // let the sea lap slightly against the frame

const canvas = document.getElementById('populus-canvas');
canvas.style.touchAction = 'none';
const raiseButton = document.getElementById('raise-button');
const lowerButton = document.getElementById('lower-button');
const selectedLabel = document.getElementById('selected-tile');
const heightLabel = document.getElementById('selected-height');
const screen = document.querySelector('.populus-screen');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04070d);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
const cameraTarget = new THREE.Vector3(0, 0, 0);
const cameraOffset = new THREE.Vector3(10, 11, 10);
const PAN_LIMIT = (GRID_SIZE - 1) / 2 - 1.5;

function updateCamera() {
  camera.position.set(
    cameraTarget.x + cameraOffset.x,
    cameraOffset.y,
    cameraTarget.z + cameraOffset.z,
  );
  camera.lookAt(cameraTarget);
}

updateCamera();

const hemi = new THREE.HemisphereLight(0x7fa6ff, 0x172133, 0.65);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffecd1, 0.85);
sun.position.set(6, 10, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
sun.shadow.camera.far = 25;
scene.add(sun);

const groundGeo = new THREE.PlaneGeometry(GRID_SIZE * 2.5, GRID_SIZE * 2.5);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x040913, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);

const terrainGeometry = new THREE.PlaneGeometry(GRID_SIZE - 1, GRID_SIZE - 1, GRID_SIZE - 1, GRID_SIZE - 1);
terrainGeometry.rotateX(-Math.PI / 2);
const vertexCount = terrainGeometry.attributes.position.count;
const terrainColors = new Float32Array(vertexCount * 3);
terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  metalness: 0.12,
  roughness: 0.75,
});
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.castShadow = true;
terrain.receiveShadow = true;
scene.add(terrain);

// Gentle shimmer to sell the watery table.
const waterGeometry = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, 1, 1);
waterGeometry.rotateX(-Math.PI / 2);
const waterMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d4ed8,
  transparent: true,
  opacity: 0.5,
  roughness: 0.18,
  metalness: 0.35,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.position.y = SEA_LEVEL * HEIGHT_SCALE;
water.receiveShadow = false;
scene.add(water);

// Simple stylised frame so the plateau feels embedded in an arena.
const frameGeometry = new THREE.PlaneGeometry(
  FRAME_GRID_SIZE - 1,
  FRAME_GRID_SIZE - 1,
  FRAME_GRID_SIZE - 1,
  FRAME_GRID_SIZE - 1,
);
frameGeometry.rotateX(-Math.PI / 2);
const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.05 });
const frame = new THREE.Mesh(frameGeometry, frameMaterial);
frame.castShadow = false;
frame.receiveShadow = true;
frame.position.y = -0.01; // avoid z-fighting with the terrain.
scene.add(frame);

const indicator = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 18, 18),
  new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x332000, emissiveIntensity: 0.6 })
);
indicator.visible = false;
scene.add(indicator);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateInitialHeights() {
  // Grow plateaus outward from the centre while keeping a ±1 constraint between neighbours.
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const start = {
    x: Math.floor((GRID_SIZE - 1) / 2),
    z: Math.floor((GRID_SIZE - 1) / 2),
  };
  grid[start.z][start.x] = clampHeight(randomInt(SEA_LEVEL - 1, SEA_LEVEL + 1));
  const queue = [start];

  while (queue.length) {
    const index = Math.floor(Math.random() * queue.length);
    const cell = queue.splice(index, 1)[0];
    for (const { x: nx, z: nz } of neighbours(cell.x, cell.z)) {
      if (grid[nz][nx] !== null) continue;
      const assigned = neighbours(nx, nz).filter(({ x, z }) => grid[z][x] !== null);
      if (!assigned.length) continue;
      let min = HEIGHT_MIN;
      let max = HEIGHT_MAX;
      const neighbourHeights = [];
      for (const { x, z } of assigned) {
        const height = grid[z][x];
        neighbourHeights.push(height);
        min = Math.max(min, height - 1);
        max = Math.min(max, height + 1);
      }
      const average = neighbourHeights.reduce((sum, value) => sum + value, 0) / neighbourHeights.length;
      if (min > max) {
        grid[nz][nx] = clampHeight(Math.round(average));
      } else {
        const plateauTarget = THREE.MathUtils.clamp(Math.round(average), min, max);
        const sameHeightCount = neighbourHeights.filter((value) => value === plateauTarget).length;
        const plateauBias = Math.min(0.9, 0.65 + sameHeightCount * 0.1);
        let chosen;
        if (Math.random() < plateauBias) {
          chosen = plateauTarget;
        } else {
          const options = [];
          for (let h = min; h <= max; h++) options.push(h);
          chosen = options[randomInt(0, options.length - 1)];
        }
        grid[nz][nx] = chosen;
      }
      queue.push({ x: nx, z: nz });
    }
  }

  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[z][x] !== null) continue;
      const fallbackNeighbours = neighbours(x, z).filter(({ x: nx, z: nz }) => grid[nz][nx] !== null);
      if (fallbackNeighbours.length) {
        grid[z][x] = clampHeight(grid[fallbackNeighbours[0].z][fallbackNeighbours[0].x]);
      } else {
        grid[z][x] = SEA_LEVEL;
      }
    }
  }

  enforceConstraint(grid);
  return smoothPlateaus(grid, 2);
}

const heights = generateInitialHeights();
let selected = { x: Math.floor((GRID_SIZE - 1) / 2), z: Math.floor((GRID_SIZE - 1) / 2) };

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const reusableVertex = new THREE.Vector3();
const reusablePoint = new THREE.Vector3();
const reusableWorld = new THREE.Vector3();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const panStartWorld = new THREE.Vector3();
const panStartTarget = new THREE.Vector3();
const panIntersection = new THREE.Vector3();
let panPointerId = null;
let isPanning = false;

function gridIndex(x, z) {
  return z * GRID_SIZE + x;
}

function clampHeight(value) {
  return Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, value));
}

function colorForHeight(height) {
  if (height <= SEA_LEVEL) {
    const depth = THREE.MathUtils.clamp((SEA_LEVEL - height) / SEA_LEVEL, 0, 1);
    const shallow = new THREE.Color(0x38bdf8);
    const deep = new THREE.Color(0x082f49);
    return shallow.clone().lerp(deep, depth);
  }
  const normalized = (height - SEA_LEVEL) / (HEIGHT_MAX - SEA_LEVEL);
  const shore = new THREE.Color(0x22c55e);
  const high = new THREE.Color(0xf8fafc);
  return shore.clone().lerp(high, THREE.MathUtils.clamp(normalized, 0, 1));
}

function updateVertex(x, z) {
  const idx = gridIndex(x, z);
  const y = heights[z][x] * HEIGHT_SCALE;
  terrainGeometry.attributes.position.setY(idx, y);
  const color = colorForHeight(heights[z][x]);
  terrainColors[idx * 3] = color.r;
  terrainColors[idx * 3 + 1] = color.g;
  terrainColors[idx * 3 + 2] = color.b;
}

function refreshTerrain() {
  for (let z = 0; z < GRID_SIZE; z++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      updateVertex(x, z);
    }
  }
  terrainGeometry.attributes.position.needsUpdate = true;
  terrainGeometry.attributes.color.needsUpdate = true;
  terrainGeometry.computeVertexNormals();
}

refreshTerrain();

function updateIndicator() {
  if (!selected) {
    indicator.visible = false;
    return;
  }
  const idx = gridIndex(selected.x, selected.z);
  reusableVertex.fromBufferAttribute(terrainGeometry.attributes.position, idx);
  indicator.position.copy(terrain.localToWorld(reusableVertex.clone()));
  indicator.position.y += 0.12;
  indicator.visible = true;
}

function centerCameraOnSelected() {
  if (!selected) return;
  const idx = gridIndex(selected.x, selected.z);
  reusableVertex.fromBufferAttribute(terrainGeometry.attributes.position, idx);
  reusableWorld.copy(reusableVertex);
  terrain.localToWorld(reusableWorld);
  cameraTarget.x = THREE.MathUtils.clamp(reusableWorld.x, -PAN_LIMIT, PAN_LIMIT);
  cameraTarget.z = THREE.MathUtils.clamp(reusableWorld.z, -PAN_LIMIT, PAN_LIMIT);
  updateCamera();
}

function updateHud() {
  if (!selected) {
    selectedLabel.textContent = '—';
    heightLabel.textContent = '0';
    return;
  }
  selectedLabel.textContent = `${selected.x + 1}, ${selected.z + 1}`;
  heightLabel.textContent = heights[selected.z][selected.x];
}

function neighbours(x, z) {
  const result = [];
  if (x > 0) result.push({ x: x - 1, z });
  if (x < GRID_SIZE - 1) result.push({ x: x + 1, z });
  if (z > 0) result.push({ x, z: z - 1 });
  if (z < GRID_SIZE - 1) result.push({ x, z: z + 1 });
  return result;
}

function enforceConstraint(grid) {
  // Iteratively nudge heights until every neighbour pair differs by at most one level.
  let changed = false;
  let guard = 0;
  do {
    changed = false;
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        for (const { x: nx, z: nz } of neighbours(x, z)) {
          const diff = grid[z][x] - grid[nz][nx];
          if (diff > 1) {
            grid[z][x] = clampHeight(grid[z][x] - 1);
            changed = true;
          } else if (diff < -1) {
            grid[z][x] = clampHeight(grid[z][x] + 1);
            changed = true;
          }
        }
      }
    }
    guard += 1;
  } while (changed && guard < GRID_SIZE * 8);
}

function smoothPlateaus(grid, passes = 2) {
  // Lean towards the most common neighbour height while respecting the ±1 rule.
  let working = grid;
  for (let pass = 0; pass < passes; pass++) {
    const next = working.map((row) => row.slice());
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const neighbourHeights = neighbours(x, z).map(({ x: nx, z: nz }) => working[nz][nx]);
        if (!neighbourHeights.length) continue;
        const frequency = new Map();
        for (const height of neighbourHeights) {
          frequency.set(height, (frequency.get(height) || 0) + 1);
        }
        let target = working[z][x];
        let bestScore = -1;
        for (const [height, score] of frequency.entries()) {
          if (
            score > bestScore ||
            (score === bestScore && Math.abs(height - working[z][x]) < Math.abs(target - working[z][x]))
          ) {
            bestScore = score;
            target = height;
          }
        }
        const delta = Math.sign(target - working[z][x]);
        if (Math.abs(target - working[z][x]) <= 1) {
          next[z][x] = target;
        } else if (delta !== 0) {
          next[z][x] = clampHeight(working[z][x] + delta);
        }
      }
    }
    working = next;
    enforceConstraint(working);
  }
  return working;
}

function canSetHeight(x, z, height) {
  return neighbours(x, z).every(({ x: nx, z: nz }) => Math.abs(height - heights[nz][nx]) <= 1);
}

function flashBlocked() {
  screen.classList.remove('blocked');
  // Force reflow so the animation retriggers reliably.
  void screen.offsetWidth;
  screen.classList.add('blocked');
}

function adjustSelected(delta) {
  if (!selected) return;
  const current = heights[selected.z][selected.x];
  const target = clampHeight(current + delta);
  if (target === current) {
    flashBlocked();
    return;
  }
  if (!canSetHeight(selected.x, selected.z, target)) {
    flashBlocked();
    return;
  }
  heights[selected.z][selected.x] = target;
  updateVertex(selected.x, selected.z);
  terrainGeometry.attributes.position.needsUpdate = true;
  terrainGeometry.attributes.color.needsUpdate = true;
  terrainGeometry.computeVertexNormals();
  updateIndicator();
  updateHud();
}

function setSelectedFromIndex(idx) {
  const x = idx % GRID_SIZE;
  const z = Math.floor(idx / GRID_SIZE);
  selected = { x, z };
  updateIndicator();
  updateHud();
}

function pointerToWorld(clientX, clientY, target = panIntersection) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, target)) {
    return null;
  }
  return target;
}

function handlePointer(event) {
  if (!pointerToWorld(event.clientX, event.clientY)) return;
  const hits = raycaster.intersectObject(terrain);
  if (!hits.length) return;
  const hit = hits[0];
  terrain.worldToLocal(reusablePoint.copy(hit.point));
  const candidates = [hit.face.a, hit.face.b, hit.face.c];
  let closestIndex = candidates[0];
  let closestDistance = Infinity;
  for (const candidate of candidates) {
    reusableVertex.fromBufferAttribute(terrainGeometry.attributes.position, candidate);
    const distance = reusableVertex.distanceTo(reusablePoint);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = candidate;
    }
  }
  setSelectedFromIndex(closestIndex);
}

function startPan(event) {
  const world = pointerToWorld(event.clientX, event.clientY);
  if (!world) return;
  isPanning = true;
  panPointerId = event.pointerId;
  panStartWorld.copy(world);
  panStartTarget.copy(cameraTarget);
  canvas.setPointerCapture(panPointerId);
}

function handlePanMove(event) {
  if (!isPanning || event.pointerId !== panPointerId) return;
  const world = pointerToWorld(event.clientX, event.clientY);
  if (!world) return;
  const desiredX = panStartTarget.x + (panStartWorld.x - world.x);
  const desiredZ = panStartTarget.z + (panStartWorld.z - world.z);
  cameraTarget.x = THREE.MathUtils.clamp(desiredX, -PAN_LIMIT, PAN_LIMIT);
  cameraTarget.z = THREE.MathUtils.clamp(desiredZ, -PAN_LIMIT, PAN_LIMIT);
  updateCamera();
  updateIndicator();
}

function stopPan(event) {
  if (!isPanning || event.pointerId !== panPointerId) return;
  isPanning = false;
  if (canvas.hasPointerCapture(panPointerId)) {
    canvas.releasePointerCapture(panPointerId);
  }
  panPointerId = null;
}

function onPointerDown(event) {
  const shouldPan =
    event.button === 1 ||
    event.button === 2 ||
    event.shiftKey ||
    (event.pointerType !== 'mouse' && event.button === 0);

  if (shouldPan) {
    event.preventDefault();
    startPan(event);
    return;
  }

  if (event.button === 0) {
    handlePointer(event);
  }
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', handlePanMove);
canvas.addEventListener('pointerup', stopPan);
canvas.addEventListener('pointerleave', stopPan);
canvas.addEventListener('pointercancel', stopPan);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

raiseButton.addEventListener('click', () => adjustSelected(HEIGHT_STEP));
lowerButton.addEventListener('click', () => adjustSelected(-HEIGHT_STEP));

window.addEventListener('keydown', (event) => {
  if (!selected) return;
  if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W' || event.key === 'r' || event.key === 'R') {
    adjustSelected(HEIGHT_STEP);
  } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S' || event.key === 'f' || event.key === 'F') {
    adjustSelected(-HEIGHT_STEP);
  }
});

function resizeRenderer() {
  const { clientWidth, clientHeight } = canvas;
  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  resizeRenderer();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

centerCameraOnSelected();
updateIndicator();
updateHud();
animate();
