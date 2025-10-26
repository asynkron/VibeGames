(function () {
  let isDragging = false;
  let isRotating = false;
  let isDraggingMinimap = false;
  let didDrag = false;
  let previousMousePosition = { x: 0, y: 0 };
  let matrices;
  let minimap;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const tileReadout = () => document.getElementById('tile-readout');

  function updateTileReadout(hex) {
    const element = tileReadout();
    if (!element) return;
    if (!hex) {
      if (VisualizationSystem.selectedHex) {
        const selected = VisualizationSystem.selectedHex;
        element.textContent = `Selected tile: (${selected.userData.q}, ${selected.userData.r}) — ${selected.userData.type}`;
      } else {
        element.textContent = 'No tile selected.';
      }
      return;
    }

    const type = hex.userData.type;
    const height = hex.userData.height.toFixed(2);
    element.textContent = `Hover tile: (${hex.userData.q}, ${hex.userData.r}) — ${type} @ ${height}`;
  }

  function isMinimapPosition(event) {
    const overlay = document.getElementById('minimap-overlay');
    if (!overlay) return false;
    const rect = overlay.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function getMinimapWorldPosition(event) {
    if (!minimap) return null;
    const overlay = document.getElementById('minimap-overlay');
    const rect = overlay.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / rect.width;
    const clickY = (event.clientY - rect.top) / rect.height;
    if (clickX < 0 || clickX > 1 || clickY < 0 || clickY > 1) return null;

    const worldX = clickX * minimap.mapWidth;
    const worldZ = clickY * minimap.mapHeight;
    return { x: worldX, z: worldZ };
  }

  function setupEventListeners() {
    window.addEventListener('contextmenu', (event) => event.preventDefault());

    window.addEventListener('mousedown', (event) => {
      previousMousePosition = { x: event.clientX, y: event.clientY };
      if (event.button === 2) {
        isRotating = true;
        return;
      }

      if (isMinimapPosition(event)) {
        isDraggingMinimap = true;
      } else {
        isDragging = true;
        didDrag = false;
      }
    });

    window.addEventListener('mousemove', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = getHexIntersects(raycaster);
      if (intersects.length > 0) {
        const hex = intersects[0].object.parent;
        VisualizationSystem.setCursorHex(hex);
        updateTileReadout(hex);
      } else {
        VisualizationSystem.setCursorHex(null);
        updateTileReadout(null);
      }

      if (isDraggingMinimap) {
        const worldPos = getMinimapWorldPosition(event);
        if (worldPos) {
          setCameraPosition(worldPos.x, worldPos.z, matrices);
        }
        return;
      }

      if (isRotating) {
        const deltaX = (event.clientX - previousMousePosition.x) * 0.01;
        const target = new THREE.Vector3();
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        target.copy(camera.position).add(cameraDirection.multiplyScalar(camera.position.length()));

        const rotationMatrix = new THREE.Matrix4().makeRotationY(-deltaX);
        const cameraPosition = new THREE.Vector3().copy(camera.position);
        cameraPosition.sub(target).applyMatrix4(rotationMatrix).add(target);
        camera.position.copy(cameraPosition);
        camera.lookAt(target);

        previousMousePosition = { x: event.clientX, y: event.clientY };
        return;
      }

      if (isDragging) {
        const deltaX = -(event.clientX - previousMousePosition.x) * 0.05;
        const deltaY = -(event.clientY - previousMousePosition.y) * 0.05;
        updateCameraPosition(deltaX, deltaY, matrices);
        previousMousePosition = { x: event.clientX, y: event.clientY };
        didDrag = true;
      }
    });

    window.addEventListener('mouseup', (event) => {
      if (isDraggingMinimap) {
        const worldPos = getMinimapWorldPosition(event);
        if (worldPos) {
          setCameraPosition(worldPos.x, worldPos.z, matrices);
        }
      } else if (!didDrag && !isRotating && event.button === 0) {
        const intersects = getHexIntersects(raycaster);
        if (intersects.length > 0) {
          const hex = intersects[0].object.parent;
          VisualizationSystem.setSelectedHex(hex);
          updateTileReadout(hex);
        }
      }

      isDragging = false;
      isRotating = false;
      isDraggingMinimap = false;
      didDrag = false;
    });

    window.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const nextHeight = getCameraHeight() + (event.deltaY > 0 ? MAP_CONFIG.CAMERA.ZOOM_SPEED : -MAP_CONFIG.CAMERA.ZOOM_SPEED);
        setCameraHeight(nextHeight);
        updateCameraZoom(matrices);
      },
      { passive: false }
    );
  }

  async function init() {
    initRenderer();

    const map = new GameMap();
    const { mapCenterX, mapCenterZ } = await GridSystem.createMap(map);
    matrices = setupCamera(mapCenterX, mapCenterZ);
    minimap = setupMinimap(mapCenterX, mapCenterZ);

    animateScene(minimap.miniMapCamera, matrices, minimap.highlightGroup);
    setupEventListeners();
    updateTileReadout(null);
  }

  window.addEventListener('load', init);
})();
