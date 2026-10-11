import * as THREE from 'three';
import { assembleCombatVoxelModel } from './combatVoxelCatalog.js';
import { createVoxelFigure } from './voxelFigure.js';
import { createVoxelReflectionMap } from './voxelMaterials.js';

/** A live, equipment-aware character portrait shared by the HUD and inventory. */
export function createVoxelCharacterPreview(viewport, { angle = -Math.PI / 7 } = {}) {
  let active = false;
  let disposed = false;
  let descriptor;
  let descriptorKey;
  let figure;
  let renderer;
  let reflections;
  let scene;
  let camera;
  let pivot;
  let animationFrame = null;
  let densityPreference;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  viewport.setAttribute('role', 'img');

  function stopAnimation() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  function canRender() {
    return active && !disposed && !document.hidden;
  }

  function scheduleAnimation() {
    if (animationFrame !== null || !canRender() || !figure?.hasEffects || motionPreference.matches) return;
    animationFrame = requestAnimationFrame(animate);
  }

  function draw(now = performance.now()) {
    figure.updateEffects(now, { reducedMotion: motionPreference.matches });
    renderer.render(scene, camera);
  }

  function animate(now) {
    animationFrame = null;
    if (!canRender() || motionPreference.matches || !figure?.hasEffects) return;
    draw(now);
    scheduleAnimation();
  }

  function initialize() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    viewport.append(renderer.domElement);
    scene = new THREE.Scene();
    reflections = createVoxelReflectionMap(renderer);
    scene.environment = reflections.texture;
    camera = new THREE.OrthographicCamera(-20, 20, 24, -24, .1, 300);
    pivot = new THREE.Group();
    scene.add(pivot);
    scene.add(new THREE.HemisphereLight(0xe5efff, 0x51463f, 1.5));
    const key = new THREE.DirectionalLight(0xfff2e2, 2.4);
    key.position.set(-25, 50, 45);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xaecbf4, 1.1);
    rim.position.set(30, 20, -30);
    scene.add(rim);
  }

  function fitCamera(width, height) {
    pivot.rotation.y = angle;
    pivot.updateWorldMatrix(true, true);
    const bounds = figure.getDisplayBounds({ motion: false });
    const corners = [];
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corners.push(new THREE.Vector3(x, y, z).applyMatrix4(figure.group.matrixWorld));
        }
      }
    }
    const worldBounds = new THREE.Box3().setFromPoints(corners);
    const center = worldBounds.getCenter(new THREE.Vector3());
    const diameter = worldBounds.getSize(new THREE.Vector3()).length();
    const distance = Math.max(80, diameter * 1.3);
    camera.position.copy(center).addScaledVector(new THREE.Vector3(0, .1, 1).normalize(), distance);
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    const projectedBounds = new THREE.Box3().setFromPoints(corners.map(corner => corner.applyMatrix4(camera.matrixWorldInverse)));
    const size = projectedBounds.getSize(new THREE.Vector3());
    const vertical = Math.max(size.y, size.x / (width / height)) * 1.18;
    camera.left = -vertical * width / height / 2;
    camera.right = -camera.left;
    camera.top = vertical / 2;
    camera.bottom = -camera.top;
    camera.far = distance + diameter;
    camera.updateProjectionMatrix();
  }

  function render() {
    if (!canRender() || !descriptor) return;
    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;
    initialize();
    if (!figure) {
      const model = assembleCombatVoxelModel(descriptor);
      figure = createVoxelFigure(model);
      figure.group.scale.setScalar(model.scale);
      pivot.add(figure.group);
    }
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    fitCamera(width, height);
    draw();
    scheduleAnimation();
  }

  function onActivityChange() {
    stopAnimation();
    render();
  }

  function onDensityChange() {
    densityPreference?.removeEventListener('change', onDensityChange);
    densityPreference = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    densityPreference.addEventListener('change', onDensityChange);
    render();
  }

  const resizeObserver = new ResizeObserver(render);
  resizeObserver.observe(viewport);
  motionPreference.addEventListener('change', onActivityChange);
  document.addEventListener('visibilitychange', onActivityChange);
  onDensityChange();

  return {
    setCharacter(nextDescriptor, label) {
      if (disposed) return;
      viewport.setAttribute('aria-label', label);
      const nextKey = JSON.stringify(nextDescriptor);
      if (descriptorKey === nextKey) return;
      stopAnimation();
      if (figure) {
        pivot.remove(figure.group);
        figure.dispose();
        figure = undefined;
      }
      descriptorKey = nextKey;
      descriptor = JSON.parse(nextKey);
      render();
    },
    setActive(value) {
      if (disposed || active === value) return;
      active = value;
      onActivityChange();
    },
    rotate(delta) {
      angle += delta;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopAnimation();
      motionPreference.removeEventListener('change', onActivityChange);
      densityPreference.removeEventListener('change', onDensityChange);
      document.removeEventListener('visibilitychange', onActivityChange);
      resizeObserver.disconnect();
      figure?.dispose();
      reflections?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      scene?.clear();
    },
  };
}
