import { createDPad } from '../shared/input/dpad.js';
import { clamp } from '../shared/utils/math.js';
import { createFpsCounter } from '../shared/utils/fpsCounter.js';

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

const CURVE_LOOKAHEAD_STEP = SEGMENT_LENGTH * 2;
const CURVE_LOOKAHEAD_STEPS = 20;
const HORIZON_LOOK_STRENGTH = 2.8;

function easeOutQuad(t) {
  const clamped = clamp(t, 0, 1);
  return 1 - (1 - clamped) * (1 - clamped);
}

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
  addStretch(90, 0, 0, 18, 2.8);

  // Sweeping right-hander that climbs and then drops away.
  addStretch(30, 0.0018, 80, 0);
  addStretch(50, 0.0034, 160, 14, 2.6);
  addStretch(70, 0.004, -200, 0);

  // Quick change of direction into a left curve.
  addStretch(25, -0.0024, 100, 12, 2.3);
  addStretch(45, -0.0036, 180, 0);
  addStretch(45, -0.0036, -180, 0);

  // Time to breathe with a rolling straight.
  addStretch(110, 0, 0, 16, 2.8);
  addStretch(40, 0, 120, 10, 2.8);
  addStretch(40, 0, -120, 0);

  // A fast chicane that sets up a long left sweeper.
  addStretch(20, 0.0036, 40, 0);
  addStretch(20, -0.0038, 40, 0);
  addStretch(20, 0.0038, -40, 0);
  addStretch(20, -0.004, -40, 0);
  addStretch(60, -0.0042, 200, 14, 2.6);
  addStretch(70, -0.0032, -200, 0);

  // Finish with a flowing right turn back onto the highway.
  addStretch(35, 0.0022, 0, 12, 2.4);
  addStretch(60, 0.0038, 160, 0);
  addStretch(80, 0.0032, -160, 0);

  addStretch(140, 0, 0, 20, 2.6);

  trackLength = segments.length * SEGMENT_LENGTH;
}

buildTrack();

function findSegment(z) {
  return segments[Math.floor(z / SEGMENT_LENGTH) % segments.length];
}

// Sample curvature a short distance ahead to anticipate where the road is heading.
function sampleUpcomingCurve(position) {
  let total = 0;
  let weight = 0;

  for (let i = 0; i < CURVE_LOOKAHEAD_STEPS; i += 1) {
    const offset = CURVE_LOOKAHEAD_STEP * (i + 1);
    const segment = findSegment(position + offset);
    const w = 1 - i / CURVE_LOOKAHEAD_STEPS;
    total += segment.curve * w;
    weight += w;
  }

  return weight ? total / weight : 0;
}

// Runtime state for the player's car and camera.
const state = {
  position: 0,
  speed: 0,
  lateral: 0,
  lastFrame: 0,
  distanceTravelled: 0,
  tilt: 0,
  horizonCurve: 0,
  horizonOffset: 0
};

const gauges = {
  speed: document.getElementById('speed'),
  distance: document.getElementById('distance'),
  fps: document.getElementById('fps')
};

const controls = { up: false, down: false, left: false, right: false, turbo: false };
const dpad = createDPad({ preventDefault: true });
const syncDirections = () => {
  controls.up = dpad.isPressed('up');
  controls.down = dpad.isPressed('down');
  controls.left = dpad.isPressed('left');
  controls.right = dpad.isPressed('right');
};
dpad.onDirectionChange(syncDirections);
dpad.onKeyChange(['ShiftLeft', 'ShiftRight'], (pressed) => {
  controls.turbo = pressed;
});
syncDirections();

const MAX_SPEED = SEGMENT_LENGTH * 90;
const ACCELERATION = MAX_SPEED / 2.8;
const BRAKING = MAX_SPEED / 2.2;
const DECELERATION = MAX_SPEED / 3.5;
const LATERAL_FORCE = 2.3;
const OFFROAD_LIMIT = 1.5;
const TURBO_MULTIPLIER = 1.35;

// Apply throttle/brake/steering input and keep the car glued to the current segment.
function update(dt) {
  const hasTurbo = controls.turbo;
  const accelerating = controls.up;
  const braking = controls.down;
  const steeringLeft = controls.left;
  const steeringRight = controls.right;
  const steeringInput = (steeringRight ? 1 : 0) - (steeringLeft ? 1 : 0);

  if (accelerating) {
    state.speed += (hasTurbo ? ACCELERATION * TURBO_MULTIPLIER : ACCELERATION) * dt;
  } else if (!braking) {
    state.speed -= DECELERATION * dt;
  }

  if (braking) {
    state.speed -= BRAKING * dt;
  }

  state.speed = clamp(state.speed, 0, MAX_SPEED * (hasTurbo ? 1.1 : 1));

  const previousLateral = state.lateral;

  if (steeringLeft) {
    state.lateral -= (LATERAL_FORCE + state.speed / MAX_SPEED) * dt;
  }
  if (steeringRight) {
    state.lateral += (LATERAL_FORCE + state.speed / MAX_SPEED) * dt;
  }

  const baseSegment = findSegment(state.position);
  state.lateral -= baseSegment.curve * 50 * dt * (state.speed / MAX_SPEED);

  state.lateral = clamp(state.lateral, -OFFROAD_LIMIT, OFFROAD_LIMIT);

  const lateralDelta = state.lateral - previousLateral;

  if (Math.abs(state.lateral) > 1.05) {
    state.speed -= (state.speed * 0.9) * dt;
  }

  state.position += state.speed * dt;
  state.distanceTravelled += state.speed * dt;

  if (state.position >= trackLength) {
    state.position -= trackLength;
  }

  const curveInfluence = baseSegment.curve * (state.speed / MAX_SPEED);
  const driftInfluence = lateralDelta / Math.max(0.0001, dt);
  const targetTilt = clamp(
    (steeringInput * 0.34) + (curveInfluence * 110) - (driftInfluence * 0.05),
    -0.6,
    0.6
  );
  const tiltResponse = Math.min(1, dt * 7);
  state.tilt += (targetTilt - state.tilt) * tiltResponse;

  // Smooth the upcoming curve sample so the horizon glides instead of snapping.
  const targetCurveSample = sampleUpcomingCurve(state.position);
  const curveLerp = Math.min(1, dt * 2.8);
  state.horizonCurve += (targetCurveSample - state.horizonCurve) * curveLerp;
  const speedFactor = 0.2 + (state.speed / MAX_SPEED) * 0.8;
  const targetOffset = state.horizonCurve * ROAD_WIDTH * HORIZON_LOOK_STRENGTH * speedFactor;
  state.horizonOffset += (targetOffset - state.horizonOffset) * curveLerp;

  gauges.speed.textContent = String(Math.round(state.speed * SPEED_TO_KMH)).padStart(3, '0');
  gauges.distance.textContent = (state.distanceTravelled * DISTANCE_TO_KM).toFixed(1);
}

const fpsCounter = createFpsCounter({ element: gauges.fps, intervalMs: 250 });

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

  const horizonRatio = state.horizonOffset / ROAD_WIDTH;
  const glowCenterX = halfWidth + horizonRatio * width * 0.35;
  const glow = ctx.createRadialGradient(glowCenterX, halfHeight * 0.95, 10, glowCenterX, halfHeight * 0.95, halfWidth * 1.1);
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
  const horizonOffset = state.horizonOffset;

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

    // Blend the horizon offset so far-away slices hint at the upcoming turn.
    const offset1 = horizonOffset * easeOutQuad(n / DRAW_DISTANCE);
    const offset2 = horizonOffset * easeOutQuad((n + 1) / DRAW_DISTANCE);
    const p1 = project(x + offset1, segment.y, segmentZ, cameraX, cameraY, cameraZ);
    const p2 = project(x + dx + offset2, next.y, nextZ, cameraX, cameraY, cameraZ);

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

  ctx.save();
  ctx.translate(baseX, baseY);

  // Keep the drop shadow planted on the road surface.
  ctx.fillStyle = '#040205';
  ctx.beginPath();
  ctx.ellipse(0, -carHeight * 0.2, carWidth * 0.65, carHeight * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(state.tilt);

  ctx.fillStyle = '#ff2b88';
  ctx.beginPath();
  ctx.moveTo(0, -carHeight);
  ctx.lineTo(-carWidth * 0.6, 0);
  ctx.lineTo(carWidth * 0.6, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffe46c';
  ctx.fillRect(-carWidth * 0.2, -carHeight * 0.4, carWidth * 0.4, carHeight * 0.22);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(-carWidth * 0.4, -carHeight * 0.15, carWidth * 0.8, carHeight * 0.08);

  ctx.restore();
  ctx.restore();
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

  fpsCounter.frame(now);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
