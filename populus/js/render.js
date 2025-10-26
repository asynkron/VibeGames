// Rendering bootstrap borrowed from the Battle Isle renderer but stripped back
// to expose just the pieces the sandbox uses.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const group = new THREE.Group();
const miniMapScene = new THREE.Scene();
let cameraHeight = MAP_CONFIG.CAMERA.INITIAL_HEIGHT;
let isRendererInitialized = false;
let cameraTarget = new THREE.Vector3();

window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.group = group;
window.miniMapScene = miniMapScene;

function initRenderer() {
  if (isRendererInitialized) return;

  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  document.body.appendChild(renderer.domElement);
  scene.add(group);

  // Soft ambient + a shallow sun to keep the diorama readable.
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(40, 80, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  isRendererInitialized = true;
}

function getLookDirection(height) {
  const minDownwardTilt = -1;
  const maxDownwardTilt = -3;
  const tiltFactor =
    (height - MAP_CONFIG.CAMERA.MIN_HEIGHT) /
    (MAP_CONFIG.CAMERA.MAX_HEIGHT - MAP_CONFIG.CAMERA.MIN_HEIGHT);
  const downwardTilt = minDownwardTilt + tiltFactor * (maxDownwardTilt - minDownwardTilt);
  return new THREE.Vector3(0, downwardTilt, -1).normalize();
}

function setupCamera(mapCenterX, mapCenterZ) {
  const localToWorldMatrix = new THREE.Matrix4();
  const worldToLocalMatrix = new THREE.Matrix4();
  const localCameraPos = new THREE.Vector3(mapCenterX, cameraHeight, mapCenterZ + 15);
  const worldCameraPos = localCameraPos.clone().applyMatrix4(localToWorldMatrix);

  camera.position.copy(worldCameraPos);
  const worldLookDirection = getLookDirection(cameraHeight).applyMatrix4(localToWorldMatrix);
  cameraTarget.copy(worldCameraPos.clone().add(worldLookDirection.multiplyScalar(10)));
  camera.lookAt(cameraTarget);

  return { localToWorldMatrix, worldToLocalMatrix };
}

function setCameraPosition(worldX, worldZ, matrices) {
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  const localPos = new THREE.Vector3(worldX, cameraHeight, worldZ);
  const worldPos = localPos.clone().applyMatrix4(matrices.localToWorldMatrix);
  camera.position.copy(worldPos);
  cameraTarget.copy(worldPos.clone().add(cameraDirection.multiplyScalar(10)));
  camera.lookAt(cameraTarget);
}

function updateCameraPosition(deltaX, deltaY, matrices) {
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraTarget.copy(camera.position).add(cameraDirection.multiplyScalar(100));

  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  right.crossVectors(cameraDirection, up).normalize();
  const forward = new THREE.Vector3();
  forward.crossVectors(up, right).normalize();

  const movement = new THREE.Vector3();
  movement.addScaledVector(right, deltaX);
  movement.addScaledVector(forward, deltaY);

  camera.position.add(movement);
  cameraTarget.add(movement);
  camera.lookAt(cameraTarget);
}

function updateCameraZoom(matrices) {
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraTarget.copy(camera.position).add(cameraDirection.multiplyScalar(100));

  const localCameraPos = camera.position.clone().applyMatrix4(matrices.worldToLocalMatrix);
  localCameraPos.y = cameraHeight;
  const worldCameraPos = localCameraPos.clone().applyMatrix4(matrices.localToWorldMatrix);

  camera.position.copy(worldCameraPos);
  camera.lookAt(cameraTarget);
}

function setupMinimap(mapCenterX, mapCenterZ) {
  const mapWidth = MAP_CONFIG.COLS * MAP_CONFIG.HEX_RADIUS * 1.5;
  const mapHeight = MAP_CONFIG.ROWS * MAP_CONFIG.HEX_RADIUS * Math.sqrt(3);

  const miniMapCamera = new THREE.OrthographicCamera(
    -mapWidth / 2,
    mapWidth / 2,
    mapHeight / 2,
    -mapHeight / 2,
    0.1,
    1000
  );
  miniMapCamera.position.set(mapCenterX, 150, mapCenterZ);
  miniMapCamera.rotation.x = -Math.PI / 2;
  miniMapCamera.updateProjectionMatrix();

  const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const borderPoints = [
    new THREE.Vector3(-mapWidth / 2, 0.1, -mapHeight / 2),
    new THREE.Vector3(mapWidth / 2, 0.1, -mapHeight / 2),
    new THREE.Vector3(mapWidth / 2, 0.1, mapHeight / 2),
    new THREE.Vector3(-mapWidth / 2, 0.1, mapHeight / 2),
    new THREE.Vector3(-mapWidth / 2, 0.1, -mapHeight / 2),
  ];
  const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
  const border = new THREE.Line(borderGeometry, borderMaterial);
  border.position.set(mapCenterX, 0, mapCenterZ);
  miniMapScene.add(border);

  const highlightGroup = new THREE.Group();
  highlightGroup.name = 'miniMapHighlights';
  miniMapScene.add(highlightGroup);

  return { miniMapCamera, mapWidth, mapHeight, highlightGroup };
}

function updateMiniMapHighlights(highlightGroup) {
  while (highlightGroup.children.length > 0) {
    highlightGroup.remove(highlightGroup.children[0]);
  }

  const highlights = group.getObjectByName('highlights');
  if (!highlights) return;

  highlights.children.forEach((child) => {
    const clone = child.clone();
    highlightGroup.add(clone);
  });
}

function animate(miniMapCamera, matrices, highlightGroup) {
  requestAnimationFrame(() => animate(miniMapCamera, matrices, highlightGroup));

  VisualizationSystem.updateCursorHighlight();
  GridSystem.animateWater(performance.now() * 0.001);

  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(true);
  renderer.setClearColor(0x10161d, 1);
  renderer.render(scene, camera);

  const left = window.innerWidth - MAP_CONFIG.MINIMAP.WIDTH - 16;
  const bottom = window.innerHeight - MAP_CONFIG.MINIMAP.HEIGHT - 16;
  renderer.setViewport(left, bottom, MAP_CONFIG.MINIMAP.WIDTH, MAP_CONFIG.MINIMAP.HEIGHT);
  renderer.setScissor(left, bottom, MAP_CONFIG.MINIMAP.WIDTH, MAP_CONFIG.MINIMAP.HEIGHT);
  renderer.setClearColor(0x06090d, 0.92);

  updateMiniMapHighlights(highlightGroup);
  renderer.render(miniMapScene, miniMapCamera);
  renderer.setScissorTest(false);
}

window.initRenderer = initRenderer;
window.setupCamera = setupCamera;
window.setupMinimap = setupMinimap;
window.updateCameraPosition = updateCameraPosition;
window.updateCameraZoom = updateCameraZoom;
window.setCameraPosition = setCameraPosition;
window.animateScene = animate;
window.getLookDirection = getLookDirection;
window.getCameraHeight = () => cameraHeight;
window.setCameraHeight = (nextHeight) => {
  cameraHeight = clamp(nextHeight, MAP_CONFIG.CAMERA.MIN_HEIGHT, MAP_CONFIG.CAMERA.MAX_HEIGHT);
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
