const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const width = canvas.width;
const height = canvas.height;
const halfWidth = width / 2;
const halfHeight = height / 2;

const rootStyles = getComputedStyle(document.body);
// Pull the neon palette from CSS so the road matches the HUD styling.
const palette = [
  {
    road: rootStyles.getPropertyValue('--road-dark').trim() || '#181726',
    rumble: rootStyles.getPropertyValue('--rumble-dark').trim() || '#ff2b6e',
    grass: rootStyles.getPropertyValue('--grass-dark').trim() || '#0c2a2f'
  },
  {
    road: rootStyles.getPropertyValue('--road-light').trim() || '#22203b',
    rumble: rootStyles.getPropertyValue('--rumble-light').trim() || '#fbd44b',
    grass: rootStyles.getPropertyValue('--grass-light').trim() || '#164349'
  }
];
const horizonGlow = rootStyles.getPropertyValue('--horizon-glow').trim() || 'rgba(255, 96, 182, 0.65)';

const billboardThemes = [
  { base: '#ff4fa7', accent: '#ffd166', text: '#160510', label: 'SUNSET' },
  { base: '#51f5ff', accent: '#ff83ff', text: '#031416', label: 'NITRO' },
  { base: '#ffe066', accent: '#ff4ba8', text: '#190410', label: 'PALMS' },
  { base: '#8a7bff', accent: '#ffb3ec', text: '#08050f', label: 'ARCADE' }
];

const SEGMENT_LENGTH = 40;
const DRAW_DISTANCE = 180;
const ROAD_WIDTH = 2200;
const CAMERA_HEIGHT = 1200;
const CAMERA_DISTANCE = CAMERA_HEIGHT * 1.35;
const FIELD_OF_VIEW = 85;
const CAMERA_DEPTH = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180);
const SPEED_TO_KMH = 0.09;
const DISTANCE_TO_KM = SPEED_TO_KMH / 3600;

const segments = [];
let trackLength = 0;
let lastY = 0;

function addSegment(curve, elevationDelta = 0) {
  const index = segments.length;
  const z = index * SEGMENT_LENGTH;
  const startY = lastY;
  lastY += elevationDelta;

  segments.push({
    index,
    z,
    curve,
    y: startY,
    y2: lastY,
    sprites: [],
    colorIndex: Math.floor(index / 3) % 2
  });
}

// Create a run of segments that share curvature, elevation delta, and billboard cadence.
function addStretch(length, curve = 0, elevation = 0, spriteEvery = 0, spriteOffset = 2.6) {
  const elevationStep = elevation / length;
  for (let i = 0; i < length; i += 1) {
    addSegment(curve, elevationStep);
    if (spriteEvery && i % spriteEvery === 0) {
      const segmentIndex = segments.length - 1;
      const themeIndex = Math.floor(segmentIndex / spriteEvery) % billboardThemes.length;
      const theme = billboardThemes[themeIndex];
      const side = ((segmentIndex % 2 === 0) ? 1 : -1) * spriteOffset;
      segments[segmentIndex].sprites.push({
        offset: side,
        width: 120,
        height: 300,
        theme
      });
    }
  }
}

// Assemble a looping course that mixes straights, sweepers, and rolling hills.
function buildTrack() {
  addStretch(120, 0, 0, 18, 2.8);
  addStretch(40, 0.0006, 160, 0);
  addStretch(40, 0.0006, -160, 0);

  addStretch(80, 0.001, 0, 14, 2.4);
  addStretch(60, 0.0014, 260, 0);
  addStretch(50, 0.0014, -260, 0);

  addStretch(110, -0.0012, 0, 16, 2.2);
  addStretch(60, -0.0012, 180, 0);
  addStretch(60, -0.0014, -180, 0);

  addStretch(90, 0, 0, 12, 2.8);
  addStretch(70, 0.0008, 220, 10, 2.6);
  addStretch(60, 0.0008, -220, 0);

  addStretch(120, -0.0015, 80, 14, 3.1);
  addStretch(120, 0.0015, -80, 0);

  addStretch(160, 0, 0, 20, 2.2);

  trackLength = segments.length * SEGMENT_LENGTH;
}

buildTrack();

function findSegment(z) {
  return segments[Math.floor(z / SEGMENT_LENGTH) % segments.length];
}

// Runtime state for the player's car and camera.
const state = {
  position: 0,
  speed: 0,
  lateral: 0,
  lastFrame: 0,
  distanceTravelled: 0
};

const gauges = {
  speed: document.getElementById('speed'),
  distance: document.getElementById('distance'),
  fps: document.getElementById('fps')
};

const input = new Set();

const blockKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']);

document.addEventListener('keydown', (event) => {
  if (blockKeys.has(event.code)) {
    event.preventDefault();
  }
  input.add(event.code);
});

document.addEventListener('keyup', (event) => {
  input.delete(event.code);
});

const MAX_SPEED = SEGMENT_LENGTH * 90;
const ACCELERATION = MAX_SPEED / 2.8;
const BRAKING = MAX_SPEED / 2.2;
const DECELERATION = MAX_SPEED / 3.5;
const LATERAL_FORCE = 2.3;
const OFFROAD_LIMIT = 1.5;
const TURBO_MULTIPLIER = 1.35;

// Apply throttle/brake/steering input and keep the car glued to the current segment.
function update(dt) {
  const hasTurbo = input.has('ShiftLeft') || input.has('ShiftRight');
  const accelerating = input.has('ArrowUp') || input.has('KeyW');
  const braking = input.has('ArrowDown') || input.has('KeyS');
  const steeringLeft = input.has('ArrowLeft') || input.has('KeyA');
  const steeringRight = input.has('ArrowRight') || input.has('KeyD');

  if (accelerating) {
    state.speed += (hasTurbo ? ACCELERATION * TURBO_MULTIPLIER : ACCELERATION) * dt;
  } else if (!braking) {
    state.speed -= DECELERATION * dt;
  }

  if (braking) {
    state.speed -= BRAKING * dt;
  }

  state.speed = Math.max(0, Math.min(state.speed, MAX_SPEED * (hasTurbo ? 1.1 : 1)));

  if (steeringLeft) {
    state.lateral -= (LATERAL_FORCE + state.speed / MAX_SPEED) * dt;
  }
  if (steeringRight) {
    state.lateral += (LATERAL_FORCE + state.speed / MAX_SPEED) * dt;
  }

  const baseSegment = findSegment(state.position);
  state.lateral -= baseSegment.curve * 50 * dt * (state.speed / MAX_SPEED);

  state.lateral = Math.max(-OFFROAD_LIMIT, Math.min(OFFROAD_LIMIT, state.lateral));

  if (Math.abs(state.lateral) > 1.05) {
    state.speed -= (state.speed * 0.9) * dt;
  }

  state.position += state.speed * dt;
  state.distanceTravelled += state.speed * dt;

  if (state.position >= trackLength) {
    state.position -= trackLength;
  }

  gauges.speed.textContent = String(Math.round(state.speed * SPEED_TO_KMH)).padStart(3, '0');
  gauges.distance.textContent = (state.distanceTravelled * DISTANCE_TO_KM).toFixed(1);
}

let frameCounter = 0;
let fpsAccumulator = 0;
const FPS_UPDATE_INTERVAL = 0.25;

function project(worldX, worldY, worldZ, cameraX, cameraY, cameraZ) {
  const dx = worldX - cameraX;
  const dy = worldY - cameraY;
  const dz = worldZ - cameraZ;
  const scale = CAMERA_DEPTH / dz;
  return {
    scale,
    x: halfWidth + scale * dx * halfWidth,
    y: halfHeight - scale * dy * height,
    w: scale * ROAD_WIDTH * halfWidth,
    dz
  };
}

function drawQuad(x1, y1, w1, x2, y2, w2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x2 - w2, y2);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x1 + w1, y1);
  ctx.closePath();
  ctx.fill();
}

// Billboard rectangles are scaled using the same projection as the road surface.
function drawSprite(projection, sprite) {
  const scale = projection.scale;
  const spriteWidth = (sprite.width || 120) * scale;
  const spriteHeight = (sprite.height || 320) * scale;
  const offsetX = projection.w * sprite.offset;
  const x = projection.x + offsetX;
  const y = projection.y - spriteHeight;

  if (spriteHeight < 2 || x + spriteWidth < 0 || x - spriteWidth > width) {
    return;
  }

  const postWidth = spriteWidth * 0.12;
  const baseY = projection.y;

  ctx.fillStyle = 'rgba(12, 8, 22, 0.65)';
  ctx.fillRect(x - spriteWidth / 2 + postWidth * 0.5, baseY - spriteHeight * 0.08, postWidth, spriteHeight * 1.1);

  ctx.fillStyle = sprite.theme.base;
  ctx.fillRect(x - spriteWidth / 2, y, spriteWidth, spriteHeight);

  ctx.fillStyle = sprite.theme.accent;
  ctx.fillRect(x - spriteWidth / 2, y, spriteWidth, spriteHeight * 0.2);

  ctx.fillStyle = sprite.theme.accent;
  ctx.fillRect(x - spriteWidth / 2, y + spriteHeight * 0.62, spriteWidth, spriteHeight * 0.08);

  ctx.fillStyle = sprite.theme.text;
  const labelSize = Math.max(8, spriteHeight * 0.24);
  ctx.font = `700 ${labelSize}px 'IBM Plex Mono', 'Segoe UI', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sprite.theme.label, x, y + spriteHeight * 0.45);
}

// Paint a stylised horizon with a neon sun glow.
function renderSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, halfHeight);
  gradient.addColorStop(0, '#141a4b');
  gradient.addColorStop(0.6, '#33105a');
  gradient.addColorStop(1, '#17092c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, halfHeight);

  const glow = ctx.createRadialGradient(halfWidth, halfHeight * 0.95, 10, halfWidth, halfHeight * 0.95, halfWidth * 1.1);
  glow.addColorStop(0, horizonGlow);
  glow.addColorStop(1, 'rgba(255, 96, 182, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, halfHeight * 0.6, width, halfHeight * 0.8);
}

// Draw road slices from farthest to nearest, layering grass, rumble, and lane markings.
function renderRoad() {
  ctx.fillStyle = '#06060c';
  ctx.fillRect(0, halfHeight, width, halfHeight);

  const baseSegment = findSegment(state.position);
  const baseIndex = baseSegment.index;
  const basePercent = (state.position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const cameraX = state.lateral * ROAD_WIDTH;
  const cameraY = baseSegment.y + CAMERA_HEIGHT;
  const cameraZ = state.position - CAMERA_DISTANCE;

  let x = 0;
  let dx = -baseSegment.curve * basePercent;
  let maxY = height;

  for (let n = 0; n < DRAW_DISTANCE; n += 1) {
    const segment = segments[(baseIndex + n) % segments.length];
    const next = segments[(baseIndex + n + 1) % segments.length];

    const looped = segment.index < baseIndex;
    const nextLooped = next.index < baseIndex;

    const segmentZ = segment.z + (looped ? trackLength : 0);
    const nextZ = next.z + (nextLooped ? trackLength : 0);

    x += dx;
    dx += segment.curve;

    const p1 = project(x, segment.y, segmentZ, cameraX, cameraY, cameraZ);
    const p2 = project(x + dx, next.y, nextZ, cameraX, cameraY, cameraZ);

    if (p1.dz <= CAMERA_DEPTH || p2.dz <= CAMERA_DEPTH) {
      continue;
    }

    if (p2.y >= maxY || p1.y >= maxY) {
      continue;
    }

    drawQuad(p1.x, p1.y, width, p2.x, p2.y, width, palette[segment.colorIndex].grass);
    drawQuad(p1.x, p1.y, p1.w * 1.2, p2.x, p2.y, p2.w * 1.2, palette[segment.colorIndex].rumble);
    drawQuad(p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, palette[segment.colorIndex].road);

    const lineColor = 'rgba(253, 235, 255, 0.9)';
    if (((segment.index + Math.floor(state.position / SEGMENT_LENGTH)) % 2) === 0) {
      drawQuad(p1.x, p1.y, p1.w * 0.08, p2.x, p2.y, p2.w * 0.08, lineColor);
    }

    for (const sprite of segment.sprites) {
      drawSprite(p2, sprite);
    }

    maxY = p2.y;
  }
}

// Overlay a simple low-poly player car for extra arcade flavour.
function renderPlayer() {
  const carWidth = width * 0.08;
  const carHeight = height * 0.12;
  const baseY = height * 0.92;
  const baseX = halfWidth + state.lateral * width * 0.18;

  ctx.fillStyle = '#040205';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY - carHeight * 0.2, carWidth * 0.65, carHeight * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff2b88';
  ctx.beginPath();
  ctx.moveTo(baseX, baseY - carHeight);
  ctx.lineTo(baseX - carWidth * 0.6, baseY);
  ctx.lineTo(baseX + carWidth * 0.6, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffe46c';
  ctx.fillRect(baseX - carWidth * 0.2, baseY - carHeight * 0.4, carWidth * 0.4, carHeight * 0.22);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(baseX - carWidth * 0.4, baseY - carHeight * 0.15, carWidth * 0.8, carHeight * 0.08);
}

function frame(now) {
  if (!state.lastFrame) {
    state.lastFrame = now;
  }
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;

  update(dt);

  ctx.clearRect(0, 0, width, height);
  renderSky();
  renderRoad();
  renderPlayer();

  frameCounter += 1;
  fpsAccumulator += dt;
  if (fpsAccumulator >= FPS_UPDATE_INTERVAL) {
    const fps = Math.round(frameCounter / fpsAccumulator);
    gauges.fps.textContent = `${fps} FPS`;
    frameCounter = 0;
    fpsAccumulator = 0;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
