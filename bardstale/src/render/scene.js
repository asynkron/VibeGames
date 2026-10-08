import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { DIR, DX, DY, WALL, yawForDir } from '../dungeon.js';
import { UI_SETTINGS } from '../../config/uiSettings.js';
import { COMBAT_CELLS_PER_MAP_TILE } from '../../config/combatSettings.js';
import { createCombatSpriteCanvas } from './combatSprites.js';

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
const COMBAT_SPRITE_WORLD_SIZE = 0.96 * COMBAT_CELL_SIZE;

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
  battleGroup.add(wallCaps);
  const battleLight = new THREE.DirectionalLight(0xfff4dc, 1.15);
  const battleFloorMaterial = new THREE.MeshLambertMaterial({ color: 0x42403c, side: THREE.DoubleSide });
  battleLight.visible = false;
  scene.add(battleLight, battleLight.target);
  const spriteTextures = new Map();
  const battleSprites = new Map();
  const markers = new THREE.Group();
  battleGroup.add(markers);
  const markerGeometry = new THREE.PlaneGeometry(COMBAT_SPRITE_WORLD_SIZE, COMBAT_SPRITE_WORLD_SIZE);
  const raycaster = new THREE.Raycaster();
  let battleActive = false;
  let battleFrame = null;

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

  function projectedCell(cell, height = 0) {
    const { x, z } = combatCellCenter(cell);
    return { x: (x - z) / Math.SQRT2, y: -(x + z) / Math.sqrt(3) + height };
  }

  function frameBattle(snapshot) {
    const points = snapshot.units.flatMap((unit) => [projectedCell(unit), projectedCell(unit, COMBAT_SPRITE_WORLD_SIZE)]);
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
    const halfSpan = Math.max(7.5 * COMBAT_CELL_SIZE, ((maxX - minX) / 2 + margin) / COMBAT_ASPECT, (maxY - minY) / 2 + margin);
    if (!battleFrame) {
      battleFrame = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, halfSpan };
    } else {
      battleFrame.halfSpan = Math.max(battleFrame.halfSpan, halfSpan);
      const safeWidth = battleFrame.halfSpan * COMBAT_ASPECT - margin;
      const safeHeight = battleFrame.halfSpan - margin;
      if (minX < battleFrame.x - safeWidth) battleFrame.x = minX + safeWidth;
      if (maxX > battleFrame.x + safeWidth) battleFrame.x = maxX - safeWidth;
      if (minY < battleFrame.y - safeHeight) battleFrame.y = minY + safeHeight;
      if (maxY > battleFrame.y + safeHeight) battleFrame.y = maxY - safeHeight;
    }
    const centerX = (battleFrame.x * Math.SQRT2 - battleFrame.y * Math.sqrt(3)) / 2;
    const centerZ = (-battleFrame.x * Math.SQRT2 - battleFrame.y * Math.sqrt(3)) / 2;
    battleCamera.position.set(centerX + 14, 28, centerZ + 14);
    battleCamera.lookAt(centerX, 0, centerZ);
    battleCamera.left = -battleFrame.halfSpan * COMBAT_ASPECT;
    battleCamera.right = battleFrame.halfSpan * COMBAT_ASPECT;
    battleCamera.top = battleFrame.halfSpan;
    battleCamera.bottom = -battleFrame.halfSpan;
    battleCamera.updateProjectionMatrix();
    battleCamera.updateMatrixWorld(true);
    battleLight.position.set(centerX, 18, centerZ);
    battleLight.target.position.set(centerX, 0, centerZ);
  }

  function facingToward(from, to, currentFacing) {
    const horizontal = (to.x - from.x) - (to.y - from.y);
    return horizontal < 0 ? 'left' : horizontal > 0 ? 'right' : currentFacing;
  }

  function initialFacing(unit, units) {
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
    const facing = unit.team === 'party' ? 'right' : 'left';
    return closest ? facingToward(unit, closest, facing) : facing;
  }

  function spriteTexture(unit, facing) {
    const descriptor = {
      kind: unit.kind,
      equipment: unit.equipment,
      appearance: unit.appearance,
      facing,
    };
    const key = JSON.stringify(descriptor);
    let texture = spriteTextures.get(key);
    if (!texture) {
      texture = pixelTexture(createCombatSpriteCanvas(descriptor));
      spriteTextures.set(key, texture);
    }
    return { key, texture };
  }

  function setBattle(snapshot) {
    if (!battleActive) {
      battleActive = true;
      battleFrame = null;
      ceiling.visible = false;
      floor.material = battleFloorMaterial;
      wallsGroup.scale.y = COMBAT_WALL_HEIGHT;
      scene.fog = null;
      torch.visible = false;
      battleGroup.visible = true;
      battleLight.visible = true;
      onResize();
    }
    const unitIds = new Set(snapshot.units.map((unit) => unit.id));
    for (const [id, entry] of battleSprites) {
      if (unitIds.has(id)) continue;
      battleGroup.remove(entry.sprite);
      entry.sprite.material.dispose();
      battleSprites.delete(id);
    }
    const active = snapshot.units.find((unit) => unit.id === snapshot.activeId && unit.alive);
    const target = snapshot.units.find((unit) => unit.id === snapshot.targetId && unit.alive);
    for (const unit of snapshot.units) {
      let entry = battleSprites.get(unit.id);
      const previousCell = entry?.sprite.userData.combatCell;
      let facing = entry?.facing || initialFacing(unit, snapshot.units);
      if (previousCell) facing = facingToward(previousCell, unit, facing);
      if (unit === active && target) facing = facingToward(unit, target, facing);
      const { key, texture } = spriteTexture(unit, facing);
      if (!entry) {
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.1, depthWrite: false });
        const sprite = new THREE.Sprite(material);
        sprite.center.set(0.5, 0);
        sprite.scale.set(COMBAT_SPRITE_WORLD_SIZE, COMBAT_SPRITE_WORLD_SIZE, 1);
        sprite.renderOrder = 5;
        battleGroup.add(sprite);
        entry = { sprite, textureKey: key, facing };
        battleSprites.set(unit.id, entry);
      } else if (entry.textureKey !== key) {
        entry.sprite.material.map = texture;
        entry.sprite.material.needsUpdate = true;
        entry.textureKey = key;
      }
      entry.facing = facing;
      const center = combatCellCenter(unit);
      entry.sprite.position.set(center.x, 0.035 * COMBAT_CELL_SIZE, center.z);
      entry.sprite.userData.combatCell = { x: unit.x, y: unit.y };
      entry.sprite.material.opacity = unit.alive ? 1 : 0.35;
      entry.sprite.material.color.set(unit.alive ? 0xffffff : 0x8f829b);
    }
    markers.clear();
    for (const cell of snapshot.reachable || []) addMarker(cell, markerMaterials.reachable, 0.022);
    addMarker(active, markerMaterials.selected, 0.03);
    addMarker(target, markerMaterials.target, 0.032);
    addMarker(snapshot.cursor, markerMaterials.selected, 0.034);
    frameBattle(snapshot);
  }

  function clearBattle() {
    if (!battleActive) return;
    battleActive = false;
    battleFrame = null;
    battleGroup.visible = false;
    battleLight.visible = false;
    ceiling.visible = true;
    floor.material = floorMat;
    wallsGroup.scale.y = 1;
    scene.fog = explorationFog;
    torch.visible = true;
    markers.clear();
    for (const { sprite } of battleSprites.values()) {
      battleGroup.remove(sprite);
      sprite.material.dispose();
    }
    battleSprites.clear();
    for (const texture of spriteTextures.values()) texture.dispose();
    spriteTextures.clear();
    onResize();
  }

  function render() {
    renderer.render(scene, battleActive ? battleCamera : camera);
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
    const spriteHits = raycaster.intersectObjects([...battleSprites.values()].map((entry) => entry.sprite), false);
    for (const hit of spriteHits) {
      const image = hit.object.material.map.image;
      const pixelX = Math.min(image.width - 1, Math.max(0, Math.floor(hit.uv.x * image.width)));
      const pixelY = Math.min(image.height - 1, Math.max(0, Math.floor((1 - hit.uv.y) * image.height)));
      if (image.getContext('2d').getImageData(pixelX, pixelY, 1, 1).data[3]) {
        return { ...hit.object.userData.combatCell };
      }
    }
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
    renderer.setSize(battleActive ? COMBAT_VIEWPORT_WIDTH : VIEWPORT_RENDER_SIZE, battleActive ? COMBAT_VIEWPORT_HEIGHT : VIEWPORT_RENDER_SIZE, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  onResize();
  window.addEventListener('resize', onResize);

  return { scene, renderer, camera, player, torch, torchAnchor, setBattle, clearBattle, render, pickBattleCell };
}
