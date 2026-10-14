import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createVoxelReflectionMap } from './voxelMaterials.js';
import { createVoxelFigure } from './voxelFigure.js';
import { VOXEL_APPEARANCE_OPTIONS } from './voxelCharacterParts.js';
import { assembleCombatVoxelModel, COMBAT_VOXEL_KINDS, COMBAT_VOXEL_PALETTES } from './combatVoxelCatalog.js';

const viewport = document.querySelector('#viewport');
const loading = document.querySelector('#loading');
const viewButtons = [...document.querySelectorAll('[data-view]')];
const rotateButton = document.querySelector('#rotate');
const gridButton = document.querySelector('#grid');
const partBoundsButton = document.querySelector('#part-bounds');
const explodeButton = document.querySelector('#explode');
const referenceButton = document.querySelector('#human-reference');
const walkButton = document.querySelector('#walk');
const swingButton = document.querySelector('#swing');
const caption = document.querySelector('#view-caption');

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Rotatable voxel sculpture. Arrow keys rotate. Plus and minus zoom. Home resets.');
  viewport.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = createVoxelReflectionMap(renderer).texture;
  scene.background = new THREE.Color('#292e27');
  scene.fog = new THREE.Fog('#292e27', 95, 160);
  const camera = new THREE.OrthographicCamera(-22, 22, 22, -22, 0.1, 240);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minZoom = 0.65;
  controls.maxZoom = 2.5;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.autoRotateSpeed = 1.5;
  let kind = 'fighter';
  let overrides = {};
  let model = assembleCombatVoxelModel({ kind });
  let sculpture = createVoxelFigure(model, { layout: 'parts' });
  sculpture.group.scale.setScalar(model.scale);
  let showPartBounds = false;
  let exploded = false;
  let showReference = false;
  let walking = false;
  let swingStarted = null;
  scene.add(sculpture.group);
  const referenceModel = assembleCombatVoxelModel({kind:'fighter',appearance:{mainhand:'none',offhand:'none'}});
  const referenceFigure = createVoxelFigure(referenceModel);
  referenceFigure.group.visible = false;
  referenceFigure.group.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.material.vertexColors = false;
    object.material.color.set('#a4ad9a');
    object.material.metalness = 0;
    object.material.roughness = 1;
  });
  scene.add(referenceFigure.group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  let cameraDistance = 75;

  function updateStats() {
    document.querySelector('#voxel-count').textContent = sculpture.voxelCount.toLocaleString();
    document.querySelector('#part-count').textContent = sculpture.partCount;
    const { width, height, depth } = sculpture.dimensions;
    document.querySelector('#dimensions').textContent = `${width} × ${height} × ${depth}`;
    const footprint = model.footprint;
    const relativeHeight = height * model.scale / referenceModel.assembly.dimensions.height;
    document.querySelector('#size-caption').textContent = `${footprint.width} × ${footprint.height} combat cells · ${relativeHeight.toFixed(1)}× human height`;
    const palette = document.querySelector('#palette');
    palette.replaceChildren(...sculpture.palette.map(({ name, color }) => {
      const swatch = document.createElement('i');
      swatch.style.setProperty('--swatch', color);
      swatch.title = name;
      return swatch;
    }));
  }
  updateStats();

  const partOptions = { ...VOXEL_APPEARANCE_OPTIONS,
    palette: COMBAT_VOXEL_PALETTES.map(value=>({value,label:value[0].toUpperCase()+value.slice(1)})) };
  function showModel() {
    model = assembleCombatVoxelModel({ kind, appearance: overrides });
    const next = createVoxelFigure(model, { layout: 'parts' });
    next.group.scale.setScalar(model.scale);
    next.setPartBounds(showPartBounds);
    next.setExploded(exploded);
    scene.remove(sculpture.group);
    sculpture.dispose();
    sculpture = next;
    scene.add(sculpture.group);
    updateMotionControls();
    for (const part of Object.keys(partOptions)) {
      const select = document.querySelector(`#${part}-variant`);
      select.disabled = Boolean(model.appearance.form);
      select.value = model.appearance[part] ?? '';
    }
    document.querySelector('#creature-note').hidden = !model.appearance.form;
    updateStats();
    frameFigure();
    document.querySelector('#assembly-status').textContent = `${kind.replaceAll('_',' ')} assembled from ${sculpture.partCount} parts.`;
  }
  for (const [part, options] of Object.entries(partOptions)) {
    const select = document.querySelector(`#${part}-variant`);
    select.replaceChildren(...options.map(({ value, label }) => new Option(label, value)));
    select.value = model.appearance[part];
    select.addEventListener('change', () => {
      overrides = { ...overrides, [part]: select.value };
      showModel();
    });
  }
  const kindSelect = document.querySelector('#character-kind');
  kindSelect.replaceChildren(...COMBAT_VOXEL_KINDS.map(value=>new Option(value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),value)));
  kindSelect.value = kind;
  kindSelect.addEventListener('change',()=>{kind=kindSelect.value;overrides={};showModel();});

  scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x554d47, 1.5));
  const key = new THREE.DirectionalLight(0xfff0df, 2.5);
  key.position.set(-25, 48, 38);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -30, right: 30, top: 35, bottom: -30, near: 1, far: 115 });
  key.shadow.normalBias = 0.045;
  key.shadow.bias = -0.0001;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc5dcf7, 1.4);
  rim.position.set(25, 25, -20);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe0e8fa, 0.7);
  fill.position.set(20, 14, 30);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#292e27', roughness: 1, envMapIntensity: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.6;
  floor.receiveShadow = true;
  scene.add(floor);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 64), new THREE.MeshStandardMaterial({ color: '#59614d', roughness: 0.92, envMapIntensity: 0 }));
  plinth.position.y = -0.62;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  scene.add(plinth);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 64), new THREE.MeshStandardMaterial({ color: '#20261e', roughness: 0.8, envMapIntensity: 0 }));
  base.position.y = -1.36;
  scene.add(base);

  const grid = new THREE.GridHelper(110, 55, 0x78836b, 0x78836b);
  grid.position.y = -1.57;
  grid.material.transparent = true;
  grid.material.opacity = 0.12;
  scene.add(grid);

  const viewPositions = {
    angle: new THREE.Vector3(36, 18, 68),
    front: new THREE.Vector3(0, 0.01, 75),
    side: new THREE.Vector3(75, 0.01, 0),
    rear: new THREE.Vector3(0, 0.01, -75),
  };
  const viewLabels = { angle: 'THREE-QUARTER VIEW', front: 'FRONT VIEW', side: 'SIDE VIEW', rear: 'REAR VIEW' };

  function setAutoRotate(enabled) {
    controls.autoRotate = enabled;
    rotateButton.setAttribute('aria-pressed', String(enabled));
  }

  function setView(name) {
    setAutoRotate(false);
    controls.enableDamping = false;
    controls.update();
    controls.target.copy(center);
    camera.position.copy(viewPositions[name]).normalize().multiplyScalar(cameraDistance).add(center);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
    controls.enableDamping = true;
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === name)));
    caption.textContent = viewLabels[name];
  }

  function reset() {
    showReference = false;
    referenceButton.setAttribute('aria-pressed', 'false');
    grid.visible = true;
    gridButton.setAttribute('aria-pressed', 'true');
    setPartBounds(false);
    setExploded(false);
    walking = false;
    swingStarted = null;
    updateMotionControls();
    setView('angle');
  }

  function setPartBounds(enabled) {
    showPartBounds = enabled;
    sculpture.setPartBounds(enabled);
    partBoundsButton.setAttribute('aria-pressed', String(enabled));
  }

  function setExploded(enabled) {
    exploded = enabled;
    sculpture.setExploded(enabled);
    explodeButton.setAttribute('aria-pressed', String(enabled));
    updateMotionControls();
    frameFigure();
  }

  function updateMotionControls() {
    const available = sculpture.hasJoints && !exploded;
    if (!available) { walking = false; swingStarted = null; }
    walkButton.disabled = !available;
    swingButton.disabled = !available;
    walkButton.setAttribute('aria-pressed', String(walking));
  }

  walkButton.addEventListener('click', () => {
    walking = !walking;
    walkButton.setAttribute('aria-pressed', String(walking));
    renderer.shadowMap.needsUpdate = true;
  });
  swingButton.addEventListener('click', () => { swingStarted = performance.now(); });

  function markOrbit() {
    viewButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
    caption.textContent = controls.autoRotate ? 'TURNTABLE VIEW' : 'FREE ORBIT';
  }

  viewButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  rotateButton.addEventListener('click', () => {
    setAutoRotate(!controls.autoRotate);
    markOrbit();
  });
  gridButton.addEventListener('click', () => {
    grid.visible = !grid.visible;
    gridButton.setAttribute('aria-pressed', String(grid.visible));
  });
  partBoundsButton.addEventListener('click', () => setPartBounds(!showPartBounds));
  explodeButton.addEventListener('click', () => setExploded(!exploded));
  referenceButton.addEventListener('click', () => {
    showReference = !showReference;
    referenceButton.setAttribute('aria-pressed', String(showReference));
    frameFigure();
  });
  document.querySelector('#reset').addEventListener('click', reset);
  controls.addEventListener('start', () => { setAutoRotate(false); markOrbit(); });

  renderer.domElement.addEventListener('keydown', event => {
    if (event.key === 'Home') { event.preventDefault(); reset(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
    event.preventDefault();
    setAutoRotate(false);
    if (['+', '=', '-'].includes(event.key)) {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * (event.key === '-' ? 0.9 : 1.1), controls.minZoom, controls.maxZoom);
      camera.updateProjectionMatrix();
    } else {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      if (event.key === 'ArrowLeft') spherical.theta -= 0.12;
      if (event.key === 'ArrowRight') spherical.theta += 0.12;
      if (event.key === 'ArrowUp') spherical.phi -= 0.1;
      if (event.key === 'ArrowDown') spherical.phi += 0.1;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    }
    controls.update();
    markOrbit();
  });

  document.querySelector('#save-image').addEventListener('click', () => {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = `${sculpture.recipe.id}.png`;
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
    document.querySelector('#save-status').textContent = 'Voxel figure image saved.';
  });

  document.querySelector('#export-recipe').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(sculpture.exportData(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.download = `${sculpture.recipe.id}.voxel.json`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.querySelector('#save-status').textContent = 'Character recipe and reusable body parts exported.';
  });

  function frameFigure() {
    const bounds = sculpture.getDisplayBounds();
    const ground = (exploded ? bounds.min.y : sculpture.assembly.bounds.min.y) * model.scale;
    const min = new THREE.Vector3(bounds.min.x,bounds.min.y,bounds.min.z).multiplyScalar(model.scale);
    const max = new THREE.Vector3(bounds.max.x,bounds.max.y,bounds.max.z).multiplyScalar(model.scale);
    referenceFigure.group.visible = showReference;
    if (showReference) {
      const reference = referenceModel.assembly.bounds;
      referenceFigure.group.position.set(min.x-reference.max.x-6,min.y-reference.min.y,(min.z+max.z-reference.min.z-reference.max.z)/2);
      min.min(new THREE.Vector3(reference.min.x,reference.min.y,reference.min.z).add(referenceFigure.group.position));
      max.max(new THREE.Vector3(reference.max.x,reference.max.y,reference.max.z).add(referenceFigure.group.position));
    }
    const nextCenter = new THREE.Vector3((min.x+max.x)/2,(min.y+max.y)/2,(min.z+max.z)/2);
    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() === 0) direction.set(36,18,68);
    center.copy(nextCenter);
    controls.target.copy(center);
    size.set(max.x-min.x,max.y-min.y,max.z-min.z);
    const extent = Math.max(1,size.x,size.y,size.z);
    const radius = Math.max(4,Math.hypot(size.x,size.z)/2+2);
    cameraDistance = Math.max(45,extent*3.2);
    camera.position.copy(direction.normalize()).multiplyScalar(cameraDistance).add(center);
    camera.far = cameraDistance*5;
    scene.fog.near = cameraDistance*1.6;
    scene.fog.far = cameraDistance*3;
    camera.zoom = 1;
    plinth.scale.set(radius,1,radius);
    plinth.position.set(center.x,ground-0.62,center.z);
    base.scale.set(radius*0.96,1,radius*0.96);
    base.position.set(center.x,ground-1.36,center.z);
    floor.position.set(center.x,ground-1.6,center.z);
    floor.scale.setScalar(Math.max(1,cameraDistance/80));
    grid.position.set(center.x,ground-1.57,center.z);
    grid.scale.setScalar(Math.max(1,extent/30));
    key.target.position.copy(center);
    scene.add(key.target);
    const lightScale = Math.max(1,extent/24);
    key.position.set(-25,48,38).multiplyScalar(lightScale).add(center);
    const shadowExtent = Math.max(radius,extent)*1.5;
    Object.assign(key.shadow.camera,{
      left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent,
      far:cameraDistance*3,
    });
    key.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    resize();
  }

  function fitCamera(width, height) {
    const aspect = width/height;
    const diagonal = Math.hypot(size.x,size.z);
    const direction = camera.position.clone().sub(controls.target).normalize();
    const right = new THREE.Vector3().crossVectors(camera.up,direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction,right).normalize();
    // Project the bounding box onto the view axes, including long parts seen from above.
    const projectedWidth = (Math.abs(right.x)*size.x+Math.abs(right.y)*size.y+Math.abs(right.z)*size.z)/2;
    const projectedHeight = (Math.abs(up.x)*size.x+Math.abs(up.y)*size.y+Math.abs(up.z)*size.z)/2;
    const halfHeight = Math.max(5,size.y*0.7,diagonal*0.65/aspect,diagonal*0.38,
      projectedHeight*1.15,projectedWidth*1.15/aspect);
    camera.left = -halfHeight*aspect;
    camera.right = halfHeight*aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }

  function resize() {
    const width = Math.max(1,viewport.clientWidth);
    const height = Math.max(1,viewport.clientHeight);
    fitCamera(width,height);
    renderer.setSize(width,height);
  }
  controls.addEventListener('change',()=>fitCamera(Math.max(1,viewport.clientWidth),Math.max(1,viewport.clientHeight)));
  new ResizeObserver(resize).observe(viewport);
  resize();
  reset();
  loading.remove();
  const clock = new THREE.Clock();
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  renderer.shadowMap.needsUpdate = true;
  renderer.setAnimationLoop(now => {
    controls.update(Math.min(clock.getDelta(), 0.1));
    const progress = swingStarted === null ? 1 : (now-swingStarted)/720;
    const wasSwinging = swingStarted !== null;
    if (progress >= 1) swingStarted = null;
    const action = sculpture.appearance.mainhand === 'bow' ? 'arrow' : 'slash';
    sculpture.setMotion({ walkPhase:now*.008, walkAmount:walking?1:0,
      action:swingStarted === null ? null : action, progress, reducedMotion:motionPreference.matches });
    sculpture.group.position.y = exploded ? 0 : (sculpture.assembly.bounds.min.y-sculpture.getGroundHeight())*model.scale;
    if (walking || wasSwinging) renderer.shadowMap.needsUpdate = true;
    sculpture.updateEffects(now, { reducedMotion: motionPreference.matches });
    if (referenceFigure.group.visible) referenceFigure.updateEffects(now, { reducedMotion: motionPreference.matches });
    renderer.render(scene, camera);
  });
} catch (error) {
  loading.textContent = 'The 3D viewer could not start. Please use a browser with WebGL enabled.';
  console.error(error);
}
