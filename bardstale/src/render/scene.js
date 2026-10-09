import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { DIR, DX, DY, WALL, yawForDir } from '../dungeon.js';
import { UI_SETTINGS } from '../../config/uiSettings.js';
import { COMBAT_CELLS_PER_MAP_TILE } from '../../config/combatSettings.js';
import { createCombatVoxelActors } from './combatVoxelActors.js';
import { createCombatEffects } from './combatEffects.js';
import { createCombatLighting } from './combatLighting.js';
import { footprintCells, occupiesCell } from '../combatFootprints.js';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = UI_SETTINGS.resolution;

const textureLoader = new THREE.TextureLoader();

function loadTexture(relativePath, options = {}) {
  const { repeatX = 1, repeatY = 1, anisotropy = 1 } = options;
  const texture = textureLoader.load(new URL(relativePath, import.meta.url).href);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  if (anisotropy > 1) {
    texture.anisotropy = anisotropy;
  }
  return texture;
}

// Render the 3D viewport to a fixed low-resolution buffer so the browser upscales it.
const VIEWPORT_RENDER_SIZE = 256;
const COMBAT_VIEWPORT_WIDTH = UI_SETTINGS.combatLayout.viewport.columns * UI_SETTINGS.tileSize;
const COMBAT_VIEWPORT_HEIGHT = UI_SETTINGS.combatLayout.viewport.rows * UI_SETTINGS.tileSize;
const COMBAT_ASPECT = COMBAT_VIEWPORT_WIDTH / COMBAT_VIEWPORT_HEIGHT;
const COMBAT_WALL_HEIGHT = 0.8;
const COMBAT_CELL_SIZE = 1 / COMBAT_CELLS_PER_MAP_TILE;
const COMBAT_RENDER_SCALE = 2;
const COMBAT_CAMERA_ELEVATION_SINE = Math.sqrt(2 / 3);
const COMBAT_CAMERA_ELEVATION_COSINE = Math.sqrt(1 / 3);

export function buildScene(state, stage) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.Fog(0x0a0c10, 4.5, 20);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; // Torch should cast real-time shadows onto nearby geometry.
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(1);
  stage.appendChild(renderer.domElement);
  renderer.domElement.classList.add('pixel-canvas');
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.imageRendering = 'pixelated';

  const maxAnisotropy = Math.max(1, renderer.capabilities.getMaxAnisotropy());
  // Lean on hardware texture filtering without changing the requested render resolution.

  const camera = new THREE.PerspectiveCamera(60, SCREEN_WIDTH / SCREEN_HEIGHT, 0.05, 200);

  // Fill the maze with a soft base light so darker corners remain readable.
  // Bump the global and accent lighting so the dungeon reads ~20% brighter overall.
  const ambient = new THREE.AmbientLight(0xbcb6a8, 0.7); // Leave gentle fill lighting so shadowed areas stay readable.
  // Hemisphere light lifts the vertical surfaces without over-exposing the floor.
  const hemiLight = new THREE.HemisphereLight(0xd9d0c0, 0x111318, 0.46);
  const dirLight = new THREE.DirectionalLight(0xfdf6e4, 0.6);
  dirLight.position.set(3.5, 4.5, 2.5);
  scene.add(ambient, hemiLight, dirLight);
  const explorationLighting = {
    ambient: ambient.intensity,
    hemisphere: hemiLight.intensity,
    directional: dirLight.intensity,
  };

  const tileSize = 1.0;
  const wallHeight = tileSize;
  const eye = tileSize * 0.55;

  const wallTexture = loadTexture('../../assets/monsters/green-wall.png', { anisotropy: maxAnisotropy });
  const floorTexture = loadTexture('../../assets/monsters/floor.png', {
    // Repeat across the dungeon grid so each tile gets the proper texel density.
    repeatX: state.width,
    repeatY: state.height,
    anisotropy: maxAnisotropy,
  });
  const ceilingTexture = loadTexture('../../assets/monsters/ceiling.png', {
    repeatX: state.width,
    repeatY: state.height,
    anisotropy: maxAnisotropy,
  });
  const doorTexture = loadTexture('../../assets/monsters/green-wall-door.png', { anisotropy: maxAnisotropy });

  const wallMat = new THREE.MeshLambertMaterial({ map: wallTexture, color: 0xffffff, side: THREE.DoubleSide });
  const doorMat = new THREE.MeshLambertMaterial({ map: doorTexture, color: 0xffffff, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTexture, color: 0xffffff, side: THREE.DoubleSide });
  const ceilMat  = new THREE.MeshLambertMaterial({ map: ceilingTexture, color: 0xffffff, side: THREE.DoubleSide });

  // Floor and ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(state.width * tileSize, state.height * tileSize), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(state.width * tileSize / 2, 0, state.height * tileSize / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(state.width * tileSize, state.height * tileSize), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(state.width * tileSize / 2, wallHeight, state.height * tileSize / 2);
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  const wallsGroup = new THREE.Group();
  scene.add(wallsGroup);

  const wallGeometry = new THREE.PlaneGeometry(tileSize, wallHeight);

  function addWallPanel(x, y, dir, type) {
    const mesh = new THREE.Mesh(wallGeometry, type === WALL.DOOR ? doorMat : wallMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x + 0.5 + DX[dir] / 2, wallHeight / 2, y + 0.5 + DY[dir] / 2);
    mesh.rotation.y = yawForDir(dir);
    wallsGroup.add(mesh);
  }

  // Build edges without duplicates: add N and W for every cell, plus outermost E/S edges
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const c = state.cells[y][x];
      if (c.n !== WALL.OPEN) addWallPanel(x, y, DIR.N, c.n);
      if (c.w !== WALL.OPEN) addWallPanel(x, y, DIR.W, c.w);
      if (x === state.width - 1 && c.e !== WALL.OPEN) addWallPanel(x, y, DIR.E, c.e);
      if (y === state.height - 1 && c.s !== WALL.OPEN) addWallPanel(x, y, DIR.S, c.s);
    }
  }

  // Player rig
  const player = new THREE.Object3D();
  player.position.set(state.x + 0.5, 0, state.y + 0.5);
  player.rotation.y = yawForDir(state.dir);
  scene.add(player);

  // Warm point light that follows the party to mimic a handheld torch.
  const torchAnchor = new THREE.Object3D();
  const torchOffset = { x: 0.28, y: eye - 0.08, z: -0.32 };
  torchAnchor.position.set(torchOffset.x, torchOffset.y, torchOffset.z);
  torchAnchor.userData.baseOffset = torchOffset;
  const torch = new THREE.PointLight(0xffc87a, 1.86, 7.5, 2.2);
  torch.castShadow = true; // The party's torch now paints dynamic shadows on the surrounding walls.
  torch.shadow.mapSize.set(512, 512);
  torch.shadow.bias = -0.0012;
  torch.shadow.normalBias = 0.02;
  torch.shadow.radius = 3;
  torch.shadow.camera.near = 0.1;
  torch.shadow.camera.far = 9;
  torch.userData.baseIntensity = torch.intensity;
  torch.userData.baseDistance = torch.distance;
  torchAnchor.add(torch);
  player.add(torchAnchor);

  camera.position.set(0, eye, 0);
  player.add(camera);

  const explorationFog = scene.fog;
  const battleCamera = new THREE.OrthographicCamera(-5 * COMBAT_CELL_SIZE, 5 * COMBAT_CELL_SIZE, 5 * COMBAT_CELL_SIZE, -5 * COMBAT_CELL_SIZE, 0.05, 200);
  scene.add(battleCamera);
  const battleGroup = new THREE.Group();
  battleGroup.visible = false;
  scene.add(battleGroup);
  const combatActors = createCombatVoxelActors(battleGroup, COMBAT_CELL_SIZE);
  const combatEffects = createCombatEffects(THREE, battleGroup, COMBAT_CELL_SIZE, combatActors);
  const combatLighting = createCombatLighting(THREE, battleGroup, COMBAT_CELL_SIZE);
  // A dim key keeps voxel faces and cast shadows readable while local light dominates.
  const combatKey = new THREE.DirectionalLight(0xe7eaff, 0.28);
  combatKey.castShadow = true;
  combatKey.shadow.mapSize.set(2048, 2048);
  combatKey.shadow.bias = -0.0002;
  combatKey.shadow.normalBias = 0.008 * COMBAT_CELL_SIZE;
  combatKey.shadow.camera.near = 0.1;
  combatKey.shadow.camera.far = 40;
  battleGroup.add(combatKey, combatKey.target);
  // Stone caps define the taller combat walls without changing the exploration mesh.
  const wallCaps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.04 * COMBAT_CELL_SIZE, 0.12 * COMBAT_CELL_SIZE),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    wallsGroup.children.length,
  );
  const capTransform = new THREE.Object3D();
  wallsGroup.children.forEach((wall, index) => {
    capTransform.position.set(wall.position.x, COMBAT_WALL_HEIGHT + 0.02 * COMBAT_CELL_SIZE, wall.position.z);
    capTransform.rotation.y = wall.rotation.y;
    capTransform.updateMatrix();
    wallCaps.setMatrixAt(index, capTransform.matrix);
    wallCaps.setColorAt(index, new THREE.Color(wall.material === doorMat ? 0xb38b52 : 0xa59d8c));
  });
  wallCaps.castShadow = true;
  wallCaps.receiveShadow = true;
  battleGroup.add(wallCaps);
  const markers = new THREE.Group();
  battleGroup.add(markers);
  const markerGeometry = new THREE.PlaneGeometry(0.96 * COMBAT_CELL_SIZE, 0.96 * COMBAT_CELL_SIZE);
  const raycaster = new THREE.Raycaster();
  let battleActive = false;
  let battleView = null;
  let battleSnapshot = null;

  function pixelTexture(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  function createMarkerTexture(color, filled = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = color;
    if (filled) {
      for (let y = 1; y < 7; y += 2) {
        for (let x = 1; x < 7; x += 2) ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillRect(0, 0, 8, 1);
    ctx.fillRect(0, 7, 8, 1);
    ctx.fillRect(0, 1, 1, 6);
    ctx.fillRect(7, 1, 1, 6);
    return pixelTexture(canvas);
  }

  const markerMaterials = {
    reachable: new THREE.MeshBasicMaterial({ map: createMarkerTexture('#55ff55', true), transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }),
    selected: new THREE.MeshBasicMaterial({ map: createMarkerTexture('#ffff55'), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    target: new THREE.MeshBasicMaterial({ map: createMarkerTexture('#ff5555'), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    spellTarget: new THREE.MeshBasicMaterial({ map: createMarkerTexture('#55ffff'), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  };

  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = 8;
  gridCanvas.height = 8;
  const gridContext = gridCanvas.getContext('2d');
  gridContext.fillStyle = '#172a28';
  gridContext.fillRect(0, 0, 8, 1);
  gridContext.fillRect(0, 0, 1, 8);
  const gridTexture = pixelTexture(gridCanvas);
  gridTexture.wrapS = THREE.RepeatWrapping;
  gridTexture.wrapT = THREE.RepeatWrapping;
  gridTexture.repeat.set(state.width * COMBAT_CELLS_PER_MAP_TILE, state.height * COMBAT_CELLS_PER_MAP_TILE);
  const grid = new THREE.Mesh(
    floor.geometry,
    new THREE.MeshBasicMaterial({ map: gridTexture, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
  );
  grid.rotation.copy(floor.rotation);
  grid.position.copy(floor.position);
  grid.position.y = 0.012 * COMBAT_CELL_SIZE;
  grid.renderOrder = 1;
  battleGroup.add(grid);

  function combatCellCenter(cell) {
    return {
      x: (cell.x + 0.5) * COMBAT_CELL_SIZE,
      z: (cell.y + 0.5) * COMBAT_CELL_SIZE,
    };
  }

  function addMarker(cell, material, height) {
    if (!cell || cell.x < 0 || cell.y < 0 || cell.x >= state.width * COMBAT_CELLS_PER_MAP_TILE || cell.y >= state.height * COMBAT_CELLS_PER_MAP_TILE) return;
    const center = combatCellCenter(cell);
    const marker = new THREE.Mesh(markerGeometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(center.x, height * COMBAT_CELL_SIZE, center.z);
    marker.renderOrder = 2;
    markers.add(marker);
  }

  function projectedPoint({ x, y, z }) {
    const azimuth = battleView?.azimuth ?? Math.PI / 4;
    return {
      x: x * Math.cos(azimuth) - z * Math.sin(azimuth),
      y: -(x * Math.sin(azimuth) + z * Math.cos(azimuth)) * COMBAT_CAMERA_ELEVATION_SINE
        + y * COMBAT_CAMERA_ELEVATION_COSINE,
    };
  }

  function projectedCell(cell) {
    return projectedPoint({ ...combatCellCenter(cell), y: 0 });
  }

  function frameBattle(snapshot) {
    if (battleView?.manual) return;
    const points = combatActors.framingBounds().flatMap(({ min, max }) => {
      const corners = [];
      for (const x of [min.x,max.x]) for (const y of [min.y,max.y]) for (const z of [min.z,max.z]) {
        corners.push(projectedPoint({x,y,z}));
      }
      return corners;
    });
    if (snapshot.cursor) points.push(projectedCell(snapshot.cursor));
    if (!points.length) {
      points.push(projectedCell({
        x: state.x * COMBAT_CELLS_PER_MAP_TILE + Math.floor(COMBAT_CELLS_PER_MAP_TILE / 2),
        y: state.y * COMBAT_CELLS_PER_MAP_TILE + Math.floor(COMBAT_CELLS_PER_MAP_TILE / 2),
      }));
    }
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const margin = 1.2 * COMBAT_CELL_SIZE;
    const halfSpan = Math.max(4.5 * COMBAT_CELL_SIZE, ((maxX - minX) / 2 + margin) / COMBAT_ASPECT, (maxY - minY) / 2 + margin);
    let centerX = (minX + maxX) / 2;
    let centerY = (minY + maxY) / 2;
    if (!battleView) {
      battleView = { x: 0, z: 0, azimuth: Math.PI / 4, halfSpan, manual: false };
    } else {
      battleView.halfSpan = Math.max(battleView.halfSpan, halfSpan);
      centerX = battleView.x * Math.cos(battleView.azimuth) - battleView.z * Math.sin(battleView.azimuth);
      centerY = -(battleView.x * Math.sin(battleView.azimuth) + battleView.z * Math.cos(battleView.azimuth)) * COMBAT_CAMERA_ELEVATION_SINE;
      const safeWidth = battleView.halfSpan * COMBAT_ASPECT - margin;
      const safeHeight = battleView.halfSpan - margin;
      if (minX < centerX - safeWidth) centerX = minX + safeWidth;
      if (maxX > centerX + safeWidth) centerX = maxX - safeWidth;
      if (minY < centerY - safeHeight) centerY = minY + safeHeight;
      if (maxY > centerY + safeHeight) centerY = maxY - safeHeight;
    }
    const depth = -centerY / COMBAT_CAMERA_ELEVATION_SINE;
    battleView.x = centerX * Math.cos(battleView.azimuth) + depth * Math.sin(battleView.azimuth);
    battleView.z = -centerX * Math.sin(battleView.azimuth) + depth * Math.cos(battleView.azimuth);
  }

  function updateBattleCamera() {
    if (!battleView) return;
    const { x, z, azimuth, halfSpan } = battleView;
    const horizontalDistance = 14 * Math.SQRT2;
    battleCamera.position.set(x + Math.sin(azimuth) * horizontalDistance, 28, z + Math.cos(azimuth) * horizontalDistance);
    battleCamera.lookAt(x, 0, z);
    battleCamera.left = -halfSpan * COMBAT_ASPECT;
    battleCamera.right = halfSpan * COMBAT_ASPECT;
    battleCamera.top = halfSpan;
    battleCamera.bottom = -halfSpan;
    battleCamera.updateProjectionMatrix();
    battleCamera.updateMatrixWorld(true);
    combatKey.position.set(x - 5, 9, z + 4);
    combatKey.target.position.set(x, 0, z);
    const shadowSpan = Math.max(4 * COMBAT_CELL_SIZE, Math.min(halfSpan * 1.4, 12));
    Object.assign(combatKey.shadow.camera, { left: -shadowSpan, right: shadowSpan, top: shadowSpan, bottom: -shadowSpan });
    combatKey.shadow.camera.updateProjectionMatrix();
  }

  function panBattle(dx, dy) {
    if (!battleActive || !battleView) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const horizontal = -dx * 2 * battleView.halfSpan * COMBAT_ASPECT / rect.width;
    const depth = -dy * 2 * battleView.halfSpan / rect.height / COMBAT_CAMERA_ELEVATION_SINE;
    const { azimuth } = battleView;
    battleView.x = THREE.MathUtils.clamp(battleView.x + horizontal * Math.cos(azimuth) + depth * Math.sin(azimuth), 0, state.width);
    battleView.z = THREE.MathUtils.clamp(battleView.z - horizontal * Math.sin(azimuth) + depth * Math.cos(azimuth), 0, state.height);
    battleView.manual = true;
    updateBattleCamera();
  }

  function rotateBattle(radians) {
    if (!battleActive || !battleView) return;
    battleView.azimuth = THREE.MathUtils.euclideanModulo(battleView.azimuth + radians, Math.PI * 2);
    battleView.manual = true;
    updateBattleCamera();
  }

  function zoomBattle(delta) {
    if (!battleActive || !battleView) return;
    battleView.halfSpan = THREE.MathUtils.clamp(battleView.halfSpan * Math.exp(THREE.MathUtils.clamp(delta * 0.0015, -1, 1)), 1.5 * COMBAT_CELL_SIZE, Math.max(state.width, state.height) / COMBAT_ASPECT);
    battleView.manual = true;
    updateBattleCamera();
  }

  function resetBattleView() {
    if (!battleActive || !battleSnapshot) return;
    battleView = null;
    frameBattle(battleSnapshot);
    updateBattleCamera();
  }

  function setBattle(snapshot) {
    if (!battleActive) {
      battleActive = true;
      battleView = null;
      ceiling.visible = false;
      wallsGroup.scale.y = COMBAT_WALL_HEIGHT;
      scene.fog = null;
      torch.visible = false;
      ambient.intensity = 0.14;
      hemiLight.intensity = 0.18;
      dirLight.intensity = 0.08;
      battleGroup.visible = true;
      onResize();
    }
    battleSnapshot = snapshot;
    combatActors.sync(snapshot);
    combatLighting.sync(snapshot);
    combatEffects.sync(snapshot.units);
    frameBattle(snapshot);
    updateBattleCamera();
    const active = snapshot.units.find((unit) => unit.id === snapshot.activeId && unit.alive);
    markers.clear();
    for (const cell of snapshot.reachable) {
      if (cell.cost > 0) addMarker(cell, markerMaterials.reachable, 0.022);
    }
    if (active) for (const cell of footprintCells(active)) addMarker(cell, markerMaterials.selected, 0.03);
    const targetMaterial = snapshot.targetKind === 'attack' ? markerMaterials.target : markerMaterials.spellTarget;
    for (const unit of snapshot.units) {
      if (snapshot.targetIds.includes(unit.id)) {
        for (const cell of footprintCells(unit)) addMarker(cell, targetMaterial, 0.032);
      }
    }
    if (snapshot.mode === 'target' && snapshot.cursor) {
      const underCursor = snapshot.units.find(unit => unit.alive && occupiesCell(unit,snapshot.cursor.x,snapshot.cursor.y));
      for (const cell of underCursor ? footprintCells(underCursor) : [snapshot.cursor]) {
        addMarker(cell, markerMaterials.selected, 0.034);
      }
    }
  }

  function clearBattle() {
    if (!battleActive) return;
    battleActive = false;
    battleView = null;
    battleSnapshot = null;
    combatEffects.clear();
    combatLighting.clear();
    battleGroup.visible = false;
    ambient.intensity = explorationLighting.ambient;
    hemiLight.intensity = explorationLighting.hemisphere;
    dirLight.intensity = explorationLighting.directional;
    ceiling.visible = true;
    wallsGroup.scale.y = 1;
    scene.fog = explorationFog;
    torch.visible = true;
    markers.clear();
    combatActors.clear();
    onResize();
  }

  function render() {
    if (battleActive) {
      const now = performance.now();
      combatActors.update(now);
      combatEffects.update(now);
      combatLighting.update(now, combatActors.positionFor);
    }
    renderer.render(scene, battleActive ? battleCamera : camera);
  }

  function playBattleEffect(effect) {
    if (!battleActive) return Promise.resolve();
    combatActors.play(effect);
    return combatEffects.play(effect);
  }

  function pickBattleCell(clientX, clientY) {
    if (!battleActive) return null;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height || clientX < rect.left || clientY < rect.top || clientX >= rect.right || clientY >= rect.bottom) return null;
    const point = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((clientY - rect.top) / rect.height) * 2,
    );
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(point, battleCamera);
    const actorCell = combatActors.pick(raycaster);
    if (actorCell) return actorCell;
    const hit = raycaster.intersectObject(floor, false)[0];
    if (!hit) return null;
    const x = Math.floor(hit.point.x * COMBAT_CELLS_PER_MAP_TILE);
    const y = Math.floor(hit.point.z * COMBAT_CELLS_PER_MAP_TILE);
    return x >= 0 && y >= 0 && x < state.width * COMBAT_CELLS_PER_MAP_TILE && y < state.height * COMBAT_CELLS_PER_MAP_TILE ? { x, y } : null;
  }

  function onResize() {
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, rect.width || SCREEN_WIDTH);
    const h = Math.max(1, rect.height || SCREEN_HEIGHT);
    // Keep the camera aspect tied to the DOM size while rendering to a fixed buffer.
    renderer.setSize(battleActive ? COMBAT_VIEWPORT_WIDTH * COMBAT_RENDER_SCALE : VIEWPORT_RENDER_SIZE, battleActive ? COMBAT_VIEWPORT_HEIGHT * COMBAT_RENDER_SCALE : VIEWPORT_RENDER_SIZE, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  onResize();
  window.addEventListener('resize', onResize);

  return { scene, renderer, camera, player, torch, torchAnchor, setBattle, clearBattle, render, pickBattleCell, panBattle, rotateBattle, zoomBattle, resetBattleView, playBattleEffect };
}
