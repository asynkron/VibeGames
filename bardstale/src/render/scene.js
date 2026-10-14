import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { yawForDir } from '../dungeon.js';
import { UI_SETTINGS } from '../../config/uiSettings.js';
import { COMBAT_CELLS_PER_MAP_TILE } from '../../config/combatSettings.js';
import { createCombatVoxelActors } from './combatVoxelActors.js';
import { createCombatEffects } from './combatEffects.js';
import { createCombatLighting } from './combatLighting.js';
import { createVoxelEnvironment } from './voxelEnvironment.js';
import { createVoxelWorld } from './voxelWorld.js';
import { createVoxelTravelExits } from './voxelTravelExits.js';
import { createVoxelWorldServices } from './voxelWorldServices.js';
import { getEnvironment } from '../environments.js';
import { createCombatIndicators } from './combatIndicators.js';

const COMBAT_VIEWPORT_WIDTH = UI_SETTINGS.combatLayout.viewport.columns * UI_SETTINGS.tileSize;
const COMBAT_VIEWPORT_HEIGHT = UI_SETTINGS.combatLayout.viewport.rows * UI_SETTINGS.tileSize;
const COMBAT_ASPECT = COMBAT_VIEWPORT_WIDTH / COMBAT_VIEWPORT_HEIGHT;
const COMBAT_CELL_SIZE = 1 / COMBAT_CELLS_PER_MAP_TILE;
const COMBAT_CAMERA_ELEVATION_SINE = Math.sqrt(2 / 3);
const COMBAT_CAMERA_ELEVATION_COSINE = Math.sqrt(1 / 3);

export function buildScene(state, stage) {
  const environment = getEnvironment(state.environment);
  const lighting = {
    dungeon: { sky:0x040507, fog:[4.5,16], ambient:.025, hemisphere:.045, sun:0, ground:0x16151b, torch:1.55 },
    cave: { sky:0x030506, fog:[3,12], ambient:.018, hemisphere:.03, sun:0, ground:0x13201e, torch:1.7 },
    forest: { sky:0x101b28, fog:[5,18], ambient:.045, hemisphere:.14, sun:.18, ground:0x1f2920, torch:1.1 },
    village: { sky:0x182334, fog:[8,25], ambient:.05, hemisphere:.16, sun:.22, ground:0x29251f, torch:1.15 },
  }[environment.id];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(lighting.sky);
  scene.fog = new THREE.Fog(lighting.sky, ...lighting.fog);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; // Torch should cast real-time shadows onto nearby geometry.
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  stage.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const camera = new THREE.PerspectiveCamera(environment.outdoors ? 70 : 60, 1, 0.05, 200);

  // A faint cool fill preserves silhouettes outside the party's pools of torchlight.
  const ambient = new THREE.AmbientLight(0xd5dfea, lighting.ambient);
  const hemiLight = new THREE.HemisphereLight(0xcbdced, lighting.ground, lighting.hemisphere);
  const dirLight = new THREE.DirectionalLight(0xfff2df, lighting.sun);
  dirLight.position.set(3.5, 4.5, 2.5);
  dirLight.castShadow = environment.outdoors;
  dirLight.shadow.mapSize.set(2048, 2048);
  Object.assign(dirLight.shadow.camera, { left:-6, right:6, top:6, bottom:-6, near:.1, far:25 });
  dirLight.shadow.camera.updateProjectionMatrix();
  dirLight.shadow.bias = -.0003;
  dirLight.shadow.normalBias = .005;
  dirLight.shadow.autoUpdate = false;
  scene.add(ambient, hemiLight, dirLight, dirLight.target);

  const eye = 0.55;
  const worldGeometry = createVoxelWorld(scene, state);
  const travelExits = createVoxelTravelExits(scene, state);
  const worldServices = createVoxelWorldServices(scene, state);

  // Player rig
  const player = new THREE.Object3D();
  player.position.set(state.x + 0.5, 0, state.y + 0.5);
  player.rotation.y = yawForDir(state.dir);
  scene.add(player);

  // Furnishings belong to the dungeon and persist across camera modes.
  const environmentObjects = createVoxelEnvironment(scene, state, { cellSize: COMBAT_CELL_SIZE });

  // Warm point light that follows the party to mimic a handheld torch.
  const torchAnchor = new THREE.Object3D();
  const torchOffset = { x: 0.28, y: eye - 0.08, z: -0.32 };
  torchAnchor.position.set(torchOffset.x, torchOffset.y, torchOffset.z);
  torchAnchor.userData.baseOffset = torchOffset;
  const torch = new THREE.PointLight(0xffcf91, lighting.torch, 4.8, 2.2);
  torch.castShadow = true;
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
  camera.rotation.x = environment.outdoors ? .08 : 0;
  player.add(camera);

  const battleCamera = new THREE.OrthographicCamera(-5 * COMBAT_CELL_SIZE, 5 * COMBAT_CELL_SIZE, 5 * COMBAT_CELL_SIZE, -5 * COMBAT_CELL_SIZE, 0.05, 200);
  scene.add(battleCamera);
  const battleGroup = new THREE.Group();
  battleGroup.visible = false;
  scene.add(battleGroup);
  const combatActors = createCombatVoxelActors(battleGroup, COMBAT_CELL_SIZE);
  const combatEffects = createCombatEffects(THREE, battleGroup, COMBAT_CELL_SIZE, combatActors);
  const combatLighting = createCombatLighting(THREE, battleGroup, COMBAT_CELL_SIZE);
  // A dim key keeps voxel faces and cast shadows readable while local light dominates.
  const combatKey = new THREE.DirectionalLight(0xbdcee4, environment.outdoors ? lighting.sun : .025);
  combatKey.castShadow = environment.outdoors;
  combatKey.shadow.mapSize.set(2048, 2048);
  combatKey.shadow.bias = -0.0002;
  combatKey.shadow.normalBias = 0.008 * COMBAT_CELL_SIZE;
  combatKey.shadow.camera.near = 0.1;
  combatKey.shadow.camera.far = 40;
  combatKey.shadow.autoUpdate = false;
  battleGroup.add(combatKey, combatKey.target);
  const combatIndicators = createCombatIndicators(battleGroup, COMBAT_CELL_SIZE);
  const raycaster = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const floorHit = new THREE.Vector3();
  let battleActive = false;
  let battleView = null;
  let battleSnapshot = null;
  let combatShadowDirty = false;
  const sunFocus = new THREE.Vector3(Infinity,Infinity,Infinity);

  function combatCellCenter(cell) {
    return {
      x: (cell.x + 0.5) * COMBAT_CELL_SIZE,
      z: (cell.y + 0.5) * COMBAT_CELL_SIZE,
    };
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
    combatKey.shadow.needsUpdate = true;
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
      worldGeometry.setCombat(true);
      environmentObjects.setCombat(true);
      travelExits.setCombat(true);
      worldServices.setCombat(true);
      dirLight.castShadow = false;
      // Keep the fog shader variant stable; its range is beyond the combat camera.
      scene.fog.near = 1000;
      scene.fog.far = 1100;
      torch.visible = false;
      dirLight.intensity = 0;
      ambient.intensity = Math.max(lighting.ambient, .16);
      hemiLight.intensity = Math.max(lighting.hemisphere, .24);
      battleGroup.visible = true;
      onResize();
    }
    battleSnapshot = snapshot;
    combatShadowDirty = true;
    combatActors.sync(snapshot);
    combatLighting.sync(snapshot);
    combatEffects.sync(snapshot.units);
    frameBattle(snapshot);
    updateBattleCamera();
    combatIndicators.sync(snapshot);
  }

  function clearBattle() {
    if (!battleActive) return;
    battleActive = false;
    battleView = null;
    battleSnapshot = null;
    combatEffects.clear();
    combatLighting.clear();
    battleGroup.visible = false;
    dirLight.intensity = lighting.sun;
    ambient.intensity = lighting.ambient;
    hemiLight.intensity = lighting.hemisphere;
    worldGeometry.setCombat(false);
    environmentObjects.setCombat(false);
    travelExits.setCombat(false);
    worldServices.setCombat(false);
    dirLight.castShadow = environment.outdoors;
    scene.fog.near = lighting.fog[0];
    scene.fog.far = lighting.fog[1];
    dirLight.shadow.needsUpdate = true;
    torch.visible = true;
    combatIndicators.clear();
    combatActors.clear();
    onResize();
  }

  function render() {
    if (renderer.getPixelRatio() !== window.devicePixelRatio) onResize();
    const now = performance.now();
    const focus = battleActive && battleView ? battleView : player.position;
    const radius = battleActive && battleView
      ? Math.hypot(battleView.halfSpan * COMBAT_ASPECT, battleView.halfSpan / COMBAT_CAMERA_ELEVATION_SINE) + 4
      : lighting.fog[1];
    if (environment.outdoors) {
      dirLight.position.set(focus.x - 4, 8, focus.z + 3);
      dirLight.target.position.set(focus.x, 0, focus.z);
      if (sunFocus.x !== focus.x || sunFocus.z !== focus.z) {
        dirLight.shadow.needsUpdate = true;
        sunFocus.set(focus.x,0,focus.z);
      }
    }
    const servicesChanged = worldServices.update(player.position.x, player.position.z);
    let shadowDirty = worldGeometry.update({ focus, radius }) || servicesChanged || combatShadowDirty;
    if (battleActive) {
      shadowDirty = combatActors.update(now) || shadowDirty;
      combatEffects.update(now);
    }
    shadowDirty = environmentObjects.update({ now, focus, radius, shadowDirty }) || shadowDirty;
    if (battleActive) {
      combatLighting.update(now, combatActors.positionFor, { shadowDirty });
      if (shadowDirty) combatKey.shadow.needsUpdate = true;
    } else if (shadowDirty) dirLight.shadow.needsUpdate = true;
    combatShadowDirty = false;
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
    if (!raycaster.ray.intersectPlane(floorPlane, floorHit)) return null;
    const x = Math.floor(floorHit.x * COMBAT_CELLS_PER_MAP_TILE);
    const y = Math.floor(floorHit.z * COMBAT_CELLS_PER_MAP_TILE);
    return x >= 0 && y >= 0 && x < state.width * COMBAT_CELLS_PER_MAP_TILE && y < state.height * COMBAT_CELLS_PER_MAP_TILE ? { x, y } : null;
  }

  function onResize() {
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  onResize();
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(stage);

  function dispose() {
    resizeObserver.disconnect();
    combatEffects.clear();
    combatActors.dispose();
    combatLighting.clear();
    worldGeometry.dispose();
    environmentObjects.dispose();
    travelExits.dispose();
    worldServices.dispose();
    combatIndicators.dispose();
    for (const light of [torch, dirLight, combatKey]) light.shadow.dispose();
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }

  return { scene, renderer, camera, player, torch, dispose, torchAnchor, setBattle, clearBattle, render, pickBattleCell, panBattle, rotateBattle, zoomBattle, resetBattleView, playBattleEffect };
}
