// Bard's Tale–style 3D with procedural dungeon and CRT HUD rendered via shared pixel canvas helpers.
// Serve over HTTP (e.g., npx http-server .)

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { createPixelContext } from '../shared/render/pixelCanvas.js';

const DIR = { N: 0, E: 1, S: 2, W: 3 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const WALL = { OPEN: 0, WALL: 1, DOOR: 2 };

function leftOf(dir) { return (dir + 3) % 4; }
function rightOf(dir) { return (dir + 1) % 4; }
function backOf(dir) { return (dir + 2) % 4; }
function opposite(dir) { return (dir + 2) % 4; }
function inBounds(x, y, w, h) { return x >= 0 && x < w && y >= 0 && y < h; }

function createCell() {
  return { n: WALL.WALL, e: WALL.WALL, s: WALL.WALL, w: WALL.WALL, visited: false };
}

function setWall(cells, w, h, x, y, dir, type) {
  if (!inBounds(x, y, w, h)) return;
  const c = cells[y][x];
  if (dir === DIR.N) c.n = type;
  if (dir === DIR.E) c.e = type;
  if (dir === DIR.S) c.s = type;
  if (dir === DIR.W) c.w = type;
  const nx = x + DX[dir];
  const ny = y + DY[dir];
  if (inBounds(nx, ny, w, h)) {
    const n = cells[ny][nx];
    const od = opposite(dir);
    if (od === DIR.N) n.n = type;
    if (od === DIR.E) n.e = type;
    if (od === DIR.S) n.s = type;
    if (od === DIR.W) n.w = type;
  }
}

function getWall(cells, w, h, x, y, dir) {
  if (!inBounds(x, y, w, h)) return WALL.WALL;
  const c = cells[y][x];
  if (dir === DIR.N) return c.n;
  if (dir === DIR.E) return c.e;
  if (dir === DIR.S) return c.s;
  if (dir === DIR.W) return c.w;
  return WALL.WALL;
}

// PRNG (mulberry32) and seed helpers
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFromSeed(seedStr) {
  const s = seedStr ? hashString(seedStr) : Math.floor(Math.random() * 2**32);
  const r = mulberry32(s);
  return {
    seed: s,
    next() { return r(); },
    int(min, max) { return Math.floor(r() * (max - min + 1)) + min; },
    choice(arr) { return arr[Math.floor(r() * arr.length)]; }
  };
}

function shuffleInPlace(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Quick helpers for procedural texture work on the dungeon props.
function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createStoneTexture(baseHex, options = {}) {
  const {
    accentHex = '#3a3329',
    noise = 0.18,
    crackColor = 'rgba(0,0,0,0.25)',
    crackCount = 10,
    repeat = 4,
    repeatY = repeat
  } = options;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const base = hexToRgb(baseHex);
  const accent = hexToRgb(accentHex);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const cell = 4;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const jitter = () => (Math.random() - 0.5) * 2 * 255 * noise;
      const r = clamp(base.r + jitter(), 0, 255);
      const g = clamp(base.g + jitter(), 0, 255);
      const b = clamp(base.b + jitter(), 0, 255);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, cell, cell);

      if (Math.random() < 0.22) {
        const ar = clamp(accent.r + jitter() * 0.35, 0, 255);
        const ag = clamp(accent.g + jitter() * 0.35, 0, 255);
        const ab = clamp(accent.b + jitter() * 0.35, 0, 255);
        ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, 0.45)`;
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }

  ctx.strokeStyle = crackColor;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < crackCount; i++) {
    const startX = Math.random() * size;
    const startY = Math.random() * size;
    const segments = 3 + Math.floor(Math.random() * 4);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    let px = startX;
    let py = startY;
    for (let s = 0; s < segments; s++) {
      px += (Math.random() - 0.5) * 32;
      py += (Math.random() - 0.5) * 32;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.repeat.set(repeat, repeatY);
  texture.needsUpdate = true;

  return texture;
}

function createWoodTexture(baseHex, options = {}) {
  const {
    accentHex = '#6e4a2b',
    ringIntensity = 0.12,
    repeat = 3,
    repeatY = repeat
  } = options;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const base = hexToRgb(baseHex);
  const accent = hexToRgb(accentHex);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const noise = Math.sin((y / size) * Math.PI * 2) * ringIntensity * 120;
    for (let x = 0; x < size; x++) {
      const progress = Math.sin(((x + y * 0.3) / size) * Math.PI * 2);
      const factor = 0.5 + progress * 0.5;
      const r = clamp(base.r * factor + accent.r * (1 - factor) + noise, 0, 255);
      const g = clamp(base.g * factor + accent.g * (1 - factor) + noise * 0.6, 0, 255);
      const b = clamp(base.b * factor + accent.b * (1 - factor) + noise * 0.3, 0, 255);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 8, size * 0.35, x - 12, size * 0.65, x + 6, size);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.repeat.set(repeat, repeatY);
  texture.needsUpdate = true;

  return texture;
}

function createHudRenderer(canvas) {
  const pixel = createPixelContext(canvas, { alpha: true });
  const ctx = pixel.ctx;
  const state = {
    log: [],
    party: [],
    gold: 0,
    prompt: '',
    buttons: [],
  };
  let buttonZones = [];

  const PANEL_MARGIN = 18;
  const INFO_PANEL_WIDTH = 240;
  // Place the log on the right so the stage can occupy the newly opened top-left corner.
  const INFO_PANEL = {
    x: SCREEN_WIDTH - PANEL_MARGIN - INFO_PANEL_WIDTH,
    y: PANEL_MARGIN,
    width: INFO_PANEL_WIDTH,
    height: 210,
  };
  const PARTY_PANEL = {
    x: PANEL_MARGIN,
    y: SCREEN_HEIGHT / 2 - 6,
    width: SCREEN_WIDTH - PANEL_MARGIN * 2,
    height: SCREEN_HEIGHT / 2 - 32,
  };
  const TITLE_FONT = '9px "Press Start 2P", "VT323", monospace';
  const TEXT_FONT = '7px "Press Start 2P", "VT323", monospace';
  const TEXT_COLOR = '#f7efd6';
  const ACCENT_COLOR = '#f4d28a';
  const PANEL_BG = 'rgba(18, 16, 22, 0.86)';
  const PANEL_BORDER = '#6a4f31';
  const PANEL_SHADOW = 'rgba(0, 0, 0, 0.65)';

  function wrapLine(text, maxWidth) {
    const words = text.split(/\s+/g);
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawPanel({ x, y, width, height }, title) {
    ctx.save();
    ctx.fillStyle = PANEL_BG;
    ctx.shadowColor = PANEL_SHADOW;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(x, y, width, height);
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2;
    ctx.strokeStyle = PANEL_BORDER;
    ctx.strokeRect(x, y, width, height);
    if (title) {
      ctx.fillStyle = ACCENT_COLOR;
      ctx.font = TITLE_FONT;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(title, x + 12, y + 10);
      ctx.strokeStyle = 'rgba(244, 210, 138, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 34);
      ctx.lineTo(x + width - 10, y + 34);
      ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    buttonZones = [];

    ctx.save();
    ctx.font = TEXT_FONT;
    ctx.textBaseline = 'top';
    ctx.fillStyle = TEXT_COLOR;

    drawPanel(INFO_PANEL);
    const logX = INFO_PANEL.x + 12;
    const logY = INFO_PANEL.y + 16;
    const maxWidth = INFO_PANEL.width - 24;
    const lineHeight = 10;
    const flattened = [];
    for (let i = 0; i < state.log.length; i++) {
      const message = state.log[i];
      const lines = wrapLine(message, maxWidth);
      for (let j = 0; j < lines.length; j++) flattened.push(lines[j]);
    }
    const availableLogHeight = INFO_PANEL.height - (logY - INFO_PANEL.y) - 12;
    const maxVisible = Math.max(1, Math.floor(availableLogHeight / lineHeight));
    const visible = flattened.slice(-maxVisible);
    for (let i = 0; i < visible.length; i++) {
      ctx.fillText(visible[i], logX, logY + i * lineHeight);
    }

    let actionY = logY + Math.max(visible.length, 1) * lineHeight + 4;
    if (state.prompt) {
      ctx.fillStyle = ACCENT_COLOR;
      ctx.fillText(state.prompt, logX, actionY);
      ctx.fillStyle = TEXT_COLOR;
      actionY += lineHeight + 2;
    }

    for (let i = 0; i < state.buttons.length; i++) {
      const btn = state.buttons[i];
      const bx = INFO_PANEL.x + 10;
      const by = actionY + i * (lineHeight + 6);
      const bw = INFO_PANEL.width - 20;
      const bh = lineHeight + 6;
      ctx.save();
      ctx.fillStyle = 'rgba(70, 50, 30, 0.85)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(255, 216, 160, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
      ctx.fillText(`[${i + 1}] ${btn.label}`, bx + 8, by + 3);
      buttonZones.push({ x: bx, y: by, width: bw, height: bh, onSelect: btn.onSelect });
    }

    drawPanel(PARTY_PANEL, `PARTY — GOLD ${state.gold}`);
    const headerY = PARTY_PANEL.y + 26;
    const rowHeight = 12;
    const cols = [
      { title: 'NAME', x: PARTY_PANEL.x + 12 },
      { title: 'CLASS', x: PARTY_PANEL.x + 180 },
      { title: 'LVL', x: PARTY_PANEL.x + 270 },
      { title: 'HP', x: PARTY_PANEL.x + 320 },
      { title: 'AC', x: PARTY_PANEL.x + 400 },
      { title: 'TO-HIT', x: PARTY_PANEL.x + 450 },
      { title: 'STATUS', x: PARTY_PANEL.x + 540 },
    ];
    ctx.fillStyle = ACCENT_COLOR;
    for (const col of cols) {
      ctx.fillText(col.title, col.x, headerY);
    }
    ctx.fillStyle = TEXT_COLOR;
    for (let i = 0; i < state.party.length; i++) {
      const row = state.party[i];
      const y = headerY + 6 + (i + 1) * rowHeight;
      ctx.fillText(row.name, cols[0].x, y);
      ctx.fillText(row.classType, cols[1].x, y);
      ctx.fillText(String(row.level), cols[2].x, y);
      ctx.fillText(`${row.hpCurrent}/${row.hpMax}`, cols[3].x, y);
      ctx.fillText(String(row.ac), cols[4].x, y);
      ctx.fillText(String(row.toHit), cols[5].x, y);
      ctx.fillText(row.alive ? '' : 'DEAD', cols[6].x, y);
    }

    ctx.restore();
  }

  function pointerToCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function triggerButton(btn) {
    if (typeof btn?.onSelect === 'function') {
      btn.onSelect();
    }
  }

  canvas.addEventListener('click', (event) => {
    if (!state.buttons.length) return;
    const { x, y } = pointerToCanvas(event);
    for (const zone of buttonZones) {
      if (x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) {
        event.preventDefault();
        triggerButton(zone);
        break;
      }
    }
  });

  window.addEventListener('keydown', (event) => {
    if (!state.buttons.length) return;
    const digit = parseInt(event.key, 10);
    if (Number.isInteger(digit) && digit >= 1 && digit <= state.buttons.length) {
      event.preventDefault();
      const btn = state.buttons[digit - 1];
      triggerButton(btn);
    }
  });

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(render).catch(() => render());
  }

  render();

  return {
    appendLog(message) {
      state.log.push(message);
      if (state.log.length > 64) state.log.splice(0, state.log.length - 64);
      render();
    },
    setParty(data) {
      state.party = Array.isArray(data?.members) ? data.members.slice() : [];
      state.gold = data?.gold ?? state.gold;
      render();
    },
    setActions({ prompt = '', buttons = [] } = {}) {
      state.prompt = prompt;
      state.buttons = buttons;
      render();
    },
    clearActions() {
      state.prompt = '';
      state.buttons = [];
      render();
    },
    redraw: render,
  };
}

function setupEncounterBillboard(camera) {
  const group = new THREE.Group();
  group.position.set(0, 0.35, -1.35);

  const geometry = new THREE.PlaneGeometry(1.3, 1.3);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 50;
  group.add(mesh);
  camera.add(group);

  const loader = new THREE.TextureLoader();
  let currentTexture = null;

  function disposeTexture() {
    if (currentTexture) {
      currentTexture.dispose();
      currentTexture = null;
    }
  }

  function applyTexture(tex) {
    disposeTexture();
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    currentTexture = tex;
    material.map = tex;
    material.opacity = 1;
  }

  return {
    show(url) {
      loader.load(url, applyTexture, undefined, () => {
        material.opacity = 0;
      });
    },
    hide() {
      material.opacity = 0;
      material.map = null;
      disposeTexture();
    }
  };
}

function buildDungeon(opts) {
  const width = Math.max(8, Math.min(128, opts.width || 48));
  const height = Math.max(8, Math.min(128, opts.height || 32));
  const rnd = rngFromSeed(opts.seed || 'bt3');

  const cells = Array.from({ length: height }, () => Array.from({ length: width }, createCell));

  // Ensure outer ring is closed (already walls), interior will be carved.
  const visited = Array.from({ length: height }, () => Array.from({ length: width }, () => false));

  // Pick a random interior start
  const sx = rnd.int(1, width - 2);
  const sy = rnd.int(1, height - 2);

  // DFS carve maze
  const stack = [{ x: sx, y: sy }];
  visited[sy][sx] = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const dirs = [DIR.N, DIR.E, DIR.S, DIR.W];
    shuffleInPlace(dirs, rnd);
    let carved = false;
    for (const d of dirs) {
      const nx = cur.x + DX[d];
      const ny = cur.y + DY[d];
      if (!inBounds(nx, ny, width, height)) continue;
      if (nx === 0 || ny === 0 || nx === width - 1 || ny === height - 1) continue; // keep perimeter strong
      if (!visited[ny][nx]) {
        setWall(cells, width, height, cur.x, cur.y, d, WALL.OPEN);
        visited[ny][nx] = true;
        stack.push({ x: nx, y: ny });
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }

  // Add rooms
  const roomCount = Math.min(14, Math.max(4, Math.floor((width * height) / 200)));
  for (let r = 0; r < roomCount; r++) {
    const rw = rnd.int(3, 8);
    const rh = rnd.int(3, 7);
    const rx = rnd.int(1, Math.max(1, width - rw - 2));
    const ry = rnd.int(1, Math.max(1, height - rh - 2));

    // Clear interior walls within the room to OPEN
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        // Open links inside the room horizontally/vertically
        if (x < rx + rw - 1) setWall(cells, width, height, x, y, DIR.E, WALL.OPEN);
        if (y < ry + rh - 1) setWall(cells, width, height, x, y, DIR.S, WALL.OPEN);
        visited[y][x] = true; // mark as carved
      }
    }

    // Carve 1–3 room doors on random sides
    const doorSpots = [];
    for (let x = rx; x < rx + rw; x++) { doorSpots.push({ x, y: ry, d: DIR.N }); doorSpots.push({ x, y: ry + rh - 1, d: DIR.S }); }
    for (let y = ry; y < ry + rh; y++) { doorSpots.push({ x: rx, y, d: DIR.W }); doorSpots.push({ x: rx + rw - 1, y, d: DIR.E }); }
    shuffleInPlace(doorSpots, rnd);
    const doorsToPlace = rnd.int(1, 3);
    for (let i = 0; i < doorsToPlace && i < doorSpots.length; i++) {
      const s = doorSpots[i];
      if (!inBounds(s.x, s.y, width, height)) continue;
      // Place a door if the boundary currently has a wall
      const t = getWall(cells, width, height, s.x, s.y, s.d);
      if (t !== WALL.WALL) continue;
      setWall(cells, width, height, s.x, s.y, s.d, WALL.DOOR);
    }
  }

  // Sprinkle a few doors in corridors
  const doorBudget = Math.floor((width * height) / 120);
  for (let i = 0; i < doorBudget; i++) {
    const x = rnd.int(1, width - 2);
    const y = rnd.int(1, height - 2);
    const d = rnd.choice([DIR.N, DIR.E, DIR.S, DIR.W]);
    if (getWall(cells, width, height, x, y, d) === WALL.OPEN) {
      setWall(cells, width, height, x, y, d, WALL.DOOR);
    }
  }

  // Choose start near center with at least one open neighbor
  function hasOpenNeighbor(x, y) {
    for (const d of [DIR.N, DIR.E, DIR.S, DIR.W]) {
      if (getWall(cells, width, height, x, y, d) !== WALL.WALL) return true;
    }
    return false;
  }
  let cx = Math.floor(width / 2), cy = Math.floor(height / 2);
  let start = { x: cx, y: cy, dir: DIR.N };
  let found = false;
  const maxR = Math.max(width, height);
  for (let r = 0; r <= maxR && !found; r++) {
    for (let y = Math.max(1, cy - r); y <= Math.min(height - 2, cy + r) && !found; y++) {
      for (let x = Math.max(1, cx - r); x <= Math.min(width - 2, cx + r) && !found; x++) {
        if (hasOpenNeighbor(x, y)) { start.x = x; start.y = y; found = true; }
      }
    }
  }

  return { width, height, cells, start, seed: rnd.seed };
}

function yawForDir(dir) {
  switch (dir) {
    case DIR.N: return 0;           // -Z in our grid-to-world mapping
    case DIR.E: return -Math.PI/2;  // +X
    case DIR.S: return Math.PI;     // +Z
    case DIR.W: return Math.PI/2;   // -X
    default: return 0;
  }
}

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 480;

function buildScene(state) {
  const stage = document.getElementById('stage');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.Fog(0x0a0c10, 4.5, 20);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });

  // Render into a deliberately undersized back-buffer to amplify chunky pixels when the canvas stretches.
  const pixelScale = 0.58;
  renderer.setPixelRatio(1);
  stage.appendChild(renderer.domElement);
  renderer.domElement.classList.add('pixel-canvas');
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const camera = new THREE.PerspectiveCamera(60, SCREEN_WIDTH / SCREEN_HEIGHT, 0.05, 200);

  const ambient = new THREE.AmbientLight(0xbcb6a8, 0.42);
  const dirLight = new THREE.DirectionalLight(0xfdf6e4, 0.7);
  dirLight.position.set(5, 10, 3);
  scene.add(ambient, dirLight);

  const tileSize = 1.0;
  const wallHeight = tileSize;
  const eye = tileSize * 0.55;

  const wallTexture = createStoneTexture('#6a6154', { accentHex: '#4c4338', noise: 0.2, crackCount: 14, repeat: 3, repeatY: 2.5 });
  const floorTexture = createStoneTexture('#2c2f33', { accentHex: '#1e2126', noise: 0.15, crackColor: 'rgba(0,0,0,0.18)', crackCount: 8, repeat: 6 });
  const ceilingTexture = createStoneTexture('#3a3d45', { accentHex: '#2f3238', noise: 0.12, crackColor: 'rgba(0,0,0,0.12)', crackCount: 6, repeat: 4 });
  const doorTexture = createWoodTexture('#5c3d26', { accentHex: '#7c5632', repeat: 2, repeatY: 3 });

  const wallMat = new THREE.MeshLambertMaterial({ map: wallTexture, color: 0xffffff, side: THREE.DoubleSide });
  const doorMat = new THREE.MeshLambertMaterial({ map: doorTexture, color: 0xffffff, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTexture, color: 0xffffff, side: THREE.DoubleSide });
  const ceilMat  = new THREE.MeshLambertMaterial({ map: ceilingTexture, color: 0xffffff, side: THREE.DoubleSide });

  // Floor and ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(state.width * tileSize, state.height * tileSize), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(state.width * tileSize / 2, 0, state.height * tileSize / 2);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(state.width * tileSize, state.height * tileSize), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(state.width * tileSize / 2, wallHeight, state.height * tileSize / 2);
  scene.add(ceiling);

  const wallsGroup = new THREE.Group();
  scene.add(wallsGroup);

  function addWallPanel(x, y, dir, type) {
    const cx = x + 0.5; const cz = y + 0.5;
    const w = tileSize; const h = wallHeight;
    const doorWidth = 0.5; // gap
    const lintelH = 0.3;

    function addPanel(px, py, pz, ry, width, height, mat) {
      const geo = new THREE.PlaneGeometry(width, height);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(px, py, pz);
      mesh.rotation.y = ry;
      wallsGroup.add(mesh);
    }

    if (type === WALL.WALL) {
      if (dir === DIR.N) addPanel(cx, h / 2, cz - 0.5, 0, w, h, wallMat);
      if (dir === DIR.S) addPanel(cx, h / 2, cz + 0.5, Math.PI, w, h, wallMat);
      if (dir === DIR.E) addPanel(cx + 0.5, h / 2, cz, -Math.PI / 2, w, h, wallMat);
      if (dir === DIR.W) addPanel(cx - 0.5, h / 2, cz, Math.PI / 2, w, h, wallMat);
      return;
    }

    if (type === WALL.DOOR) {
      const side = (w - doorWidth) / 2;
      const postH = h;
      const topY = h - lintelH / 2;
      if (dir === DIR.N || dir === DIR.S) {
        const z = dir === DIR.N ? (cz - 0.5) : (cz + 0.5);
        const ry = dir === DIR.N ? 0 : Math.PI;
        addPanel(cx - (doorWidth / 2 + side / 2), postH / 2, z, ry, side, postH, doorMat);
        addPanel(cx + (doorWidth / 2 + side / 2), postH / 2, z, ry, side, postH, doorMat);
        addPanel(cx, topY, z, ry, doorWidth, lintelH, doorMat);
      } else {
        const xw = dir === DIR.E ? (cx + 0.5) : (cx - 0.5);
        const ry = dir === DIR.E ? -Math.PI / 2 : Math.PI / 2;
        addPanel(xw, postH / 2, cz - (doorWidth / 2 + side / 2), ry, side, postH, doorMat);
        addPanel(xw, postH / 2, cz + (doorWidth / 2 + side / 2), ry, side, postH, doorMat);
        addPanel(xw, topY, cz, ry, doorWidth, lintelH, doorMat);
      }
      return;
    }
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

  camera.position.set(0, eye, 0);
  player.add(camera);

  function onResize() {
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, rect.width || SCREEN_WIDTH);
    const h = Math.max(1, rect.height || SCREEN_HEIGHT);
    renderer.setSize(w * pixelScale, h * pixelScale, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  onResize();
  window.addEventListener('resize', onResize);

  return { stage, scene, renderer, camera, player };
}

function parseOptsFromURL() {
  const p = new URLSearchParams(window.location.search);
  const w = parseInt(p.get('w') || p.get('width') || '0', 10) || undefined;
  const h = parseInt(p.get('h') || p.get('height') || '0', 10) || undefined;
  const seed = p.get('seed') || undefined;
  return { width: w, height: h, seed };
}

function main() {
  const opts = parseOptsFromURL();
  const { width, height, cells, start, seed } = buildDungeon(opts);
  const state = { width, height, cells, x: start.x, y: start.y, dir: start.dir, seed };
  cells[state.y][state.x].visited = true;

  const hudCanvas = document.getElementById('hud');
  const hud = hudCanvas ? createHudRenderer(hudCanvas) : null;
  if (typeof window !== 'undefined') {
    window.__bt3_hud = hud;
  }

  const g = buildScene(state);
  const encounterBillboard = setupEncounterBillboard(g.camera);
  if (typeof window !== 'undefined') {
    window.__bt3_encounterBillboard = encounterBillboard;
  }

  // Animation state
  let anim = null; // {type:'move'|'turn', start, duration, fromPos:{x,z}, toPos:{x,z}, fromYaw, toYaw}
  let keyQueued = null;

  function canMoveForward() {
    const ft = getWall(cells, width, height, state.x, state.y, state.dir);
    return ft !== WALL.WALL;
  }
  function canMoveBackward() {
    const bt = getWall(cells, width, height, state.x, state.y, backOf(state.dir));
    return bt !== WALL.WALL;
  }

  function startMove(dirSign) { // +1 forward, -1 backward
    if (anim) return;
    if (typeof window !== 'undefined' && window.__bt3_isCombatActive) return;
    const dirToUse = (dirSign === 1) ? state.dir : backOf(state.dir);
    const ok = dirSign === 1 ? canMoveForward() : canMoveBackward();
    if (!ok) return;

    const nx = state.x + DX[dirToUse];
    const ny = state.y + DY[dirToUse];

    const fromPos = { x: g.player.position.x, z: g.player.position.z };
    const toPos = { x: nx + 0.5, z: ny + 0.5 };

    anim = { type: 'move', start: performance.now(), duration: 280, fromPos, toPos };
    // Commit logical cell at the end of the motion
    state.x = nx; state.y = ny; cells[state.y][state.x].visited = true;
  }

  function startTurn(left) {
    if (anim) return;
    if (typeof window !== 'undefined' && window.__bt3_isCombatActive) return;
    const fromYaw = g.player.rotation.y;
    state.dir = left ? leftOf(state.dir) : rightOf(state.dir);
    const toYawIdeal = yawForDir(state.dir);
    // choose shortest path
    let delta = toYawIdeal - fromYaw;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    anim = { type: 'turn', start: performance.now(), duration: 220, fromYaw, toYaw: fromYaw + delta };
  }

  function onKey(ev) {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); if (!anim) startTurn(true); else keyQueued = 'L'; }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); if (!anim) startTurn(false); else keyQueued = 'R'; }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (!anim) startMove(+1); else keyQueued = 'F'; }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); if (!anim) startMove(-1); else keyQueued = 'B'; }
  }
  window.addEventListener('keydown', onKey);

  function step() {
    const now = performance.now();

    if (anim) {
      const t = Math.min(1, (now - anim.start) / anim.duration);
      if (anim.type === 'move') {
        const x = anim.fromPos.x + (anim.toPos.x - anim.fromPos.x) * t;
        const z = anim.fromPos.z + (anim.toPos.z - anim.fromPos.z) * t;
        g.player.position.set(x, 0, z);
      } else if (anim.type === 'turn') {
        const y = anim.fromYaw + (anim.toYaw - anim.fromYaw) * t;
        g.player.rotation.y = y;
      }
      if (t >= 1) {
        const __wasMove = anim && anim.type === 'move';
        anim = null;
        if (__wasMove && typeof window !== 'undefined' && window.__bt3_onStepComplete) { try { window.__bt3_onStepComplete(1); } catch(e){} }
        if (keyQueued) {
          const k = keyQueued; keyQueued = null;
          if (k === 'L') startTurn(true);
          else if (k === 'R') startTurn(false);
          else if (k === 'F') startMove(+1);
          else if (k === 'B') startMove(-1);
        }
      }
    }

    g.renderer.render(g.scene, g.camera);
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

main();

// =========================
// BT3-like systems (overlay, party, items, encounters, combat)
// =========================
(function initBt3Systems() {
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }
  function roll(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  onReady(function() {
    if (typeof window !== 'undefined') window.__bt3_isCombatActive = false;

    function createFallbackHud() {
      return {
        appendLog(message) { console.log('[BT3]', message); },
        setParty() {},
        setActions() {},
        clearActions() {},
        redraw() {},
      };
    }

    const hud = (typeof window !== 'undefined' && window.__bt3_hud) ? window.__bt3_hud : createFallbackHud();

    function log(msg) { hud.appendLog(msg); }
    function clearActions() { hud.clearActions(); }

    // Local pixel art placeholders so the encounter billboard can load without external fetches.
    const MONSTER_ART = {
      rat: 'assets/monsters/rat.png',
      skeleton: 'assets/monsters/skeleton.png'
    };

    const billboard = (typeof window !== 'undefined' && window.__bt3_encounterBillboard) ? window.__bt3_encounterBillboard : null;
    function showEncounterArt(species){ if (!billboard) return; const path = MONSTER_ART[species]; if (path) billboard.show(path); else billboard.hide(); }
    function hideEncounterArt(){ if (billboard) billboard.hide(); }

    const DB = {
      items: {
        sword_basic: { id: 'sword_basic', name: 'Short Sword', slot: 'Weapon', minDamage: 2, maxDamage: 8, toHit: 0, acBonus: 0, magicRes: 0, weight: 3 },
        leather_armor: { id: 'leather_armor', name: 'Leather Armor', slot: 'Body', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: -1, magicRes: 0, weight: 5 },
        songbook: { id: 'songbook', name: 'Songbook', slot: 'Instrument', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: 0, magicRes: 0, weight: 1 },
        potion_small: { id: 'potion_small', name: 'Healing Potion', slot: 'Consumable', heals: 10, weight: 1 },
      },
      monsters: {
        rat: { id: 'rat', name: 'Giant Rat', hpMin: 3, hpMax: 6, ac: 8, toHit: 0, dmgMin: 1, dmgMax: 3, magicRes: 0 },
        skeleton: { id: 'skeleton', name: 'Skeleton', hpMin: 6, hpMax: 10, ac: 7, toHit: 1, dmgMin: 2, dmgMax: 5, magicRes: 10 },
      }
    };

    function makeChar(id, name, classType, hp, acBase, toHit, dmgBonus){
      return { id, name, classType, level: 1, xp: 0, hpCurrent: hp, hpMax: hp, spCurrent: 0, spMax: 0,
        base: { ac: acBase, toHit, dmgBonus, magicRes: 0 }, equip: { weapon: '', offhand: '', head: '', body: '', hands: '', feet: '', instrument: '', accessory: '' }, inv: [], alive: true };
    }

    const party = { id: 'p_main', gold: 0, members: [ makeChar('c_hero','Hero','Warrior',16,9,1,1), makeChar('c_bard','Lyre','Bard',12,9,0,0) ] };

    function addItem(char, itemId, qty){ for (let i=0;i<char.inv.length;i++){ const it=char.inv[i]; if(it.itemId===itemId && !it.equipped){ it.qty+=qty; return; } } char.inv.push({ itemId, qty, equipped:false }); }
    function equip(char, itemId){ const def=DB.items[itemId]; if(!def) return false; for(let i=0;i<char.inv.length;i++){ const it=char.inv[i]; if(it.itemId===itemId && it.qty>0){ it.equipped=true; if(def.slot==='Weapon') char.equip.weapon=itemId; else if(def.slot==='Body') char.equip.body=itemId; else if(def.slot==='Instrument') char.equip.instrument=itemId; return true; } } return false; }

    // Starter kit
    addItem(party.members[0],'sword_basic',1); addItem(party.members[0],'leather_armor',1); addItem(party.members[0],'potion_small',2);
    addItem(party.members[1],'songbook',1);
    equip(party.members[0],'sword_basic'); equip(party.members[0],'leather_armor'); equip(party.members[1],'songbook');

    function charAC(c){ let ac=c.base.ac; if(c.equip.body){ const d=DB.items[c.equip.body]; ac+= (d.acBonus||0); } return ac; }
    function charToHit(c){ let th=c.base.toHit; if(c.equip.weapon){ const d=DB.items[c.equip.weapon]; th+= (d.toHit||0);} return th; }
    function charDamage(c){ let min=1+c.base.dmgBonus, max=6+c.base.dmgBonus; if(c.equip.weapon){ const w=DB.items[c.equip.weapon]; min=Math.max(min, w.minDamage||min); max=Math.max(max, w.maxDamage||max);} return {min,max}; }

    function renderParty(){
      const members = party.members.map((c) => ({
        name: c.name,
        classType: c.classType,
        level: c.level,
        hpCurrent: c.hpCurrent,
        hpMax: c.hpMax,
        ac: charAC(c),
        toHit: charToHit(c),
        alive: c.alive,
      }));
      hud.setParty({ gold: party.gold, members });
    }

    function generateEncounter(depth){ const groups=[]; if(depth<=1) groups.push({ species:'rat', count: roll(1,4)}); else groups.push({ species:'skeleton', count: roll(1,3)}); return { id:'enc_'+Math.random().toString(36).slice(2), groups, canFlee:true }; }
    function makeMon(specId, idx){ const sp=DB.monsters[specId]; const hp=roll(sp.hpMin, sp.hpMax); return { id: specId+'_'+idx, name: sp.name, hpCurrent: hp, hpMax: hp, ac: sp.ac, toHit: sp.toHit, dmgMin: sp.dmgMin, dmgMax: sp.dmgMax, alive: true }; }
    function startCombat(enc){
      const monsters=[];
      for(let g=0;g<enc.groups.length;g++){
        const grp=enc.groups[g];
        for(let n=0;n<grp.count;n++) monsters.push(makeMon(grp.species, (g+1)+'_'+(n+1)));
      }
      const leadSpecies = enc.groups[0] ? enc.groups[0].species : '';
      showEncounterArt(leadSpecies);
      if (typeof window !== 'undefined') window.__bt3_isCombatActive = true;
      log(`Encounter! ${monsters.length} ${(monsters.length===1?'foe':'foes')} appear.`);
      log('Awaiting party commands...');
      clearActions();
      return { round:1, party: party.members.map(c=>c), monsters, encounter: enc, pendingActions: [], selectionOrder: [], selectionIndex: 0, ended:false, winner:'', fled:false };
    }

    function firstAlive(list){ for(let i=0;i<list.length;i++){ if(list[i].alive) return list[i]; } return null; }
    function hasAlive(list){ for(let i=0;i<list.length;i++){ if(list[i].alive) return true; } return false; }

    function attackChar(att, def){ const d=charDamage(att); const hitRoll=Math.floor(Math.random()*20)+1; const hit=(hitRoll + charToHit(att)) >= def.ac; if(hit){ const dmg=roll(d.min,d.max); def.hpCurrent-=dmg; if(def.hpCurrent<=0){ def.hpCurrent=0; def.alive=false; } log(`${att.name} hits ${def.name} for ${dmg}.`);} else { log(`${att.name} misses ${def.name}.`);} }
    function attackMonster(att, def){ const hitRoll=Math.floor(Math.random()*20)+1; const hit=(hitRoll + att.toHit) >= charAC(def); if(hit){ const dmg=roll(att.dmgMin, att.dmgMax); def.hpCurrent-=dmg; if(def.hpCurrent<=0){ def.hpCurrent=0; def.alive=false; } log(`${att.name} hits ${def.name} for ${dmg}.`);} else { log(`${att.name} misses ${def.name}.`);} }

    function concludeCombat(st){
      if(st.__concluded) return;
      st.__concluded = true;
      hideEncounterArt();
      if (typeof window !== 'undefined') window.__bt3_isCombatActive = false;
      log(`Combat ends. Winner: ${st.winner}.`);
      if(st.winner==='Party' && !st.fled){
        const gold=roll(5,20);
        party.gold+=gold;
        log(`Loot: ${gold} gold.`);
        if(Math.random()<0.2){ addItem(party.members[0],'potion_small',1); log('Found a Healing Potion.'); }
      }
      clearActions();
      inCombat = false;
      combatState = null;
      renderParty();
    }

    function beginPlayerPhase(st){
      if(st.ended) return;
      const order=[];
      for(let i=0;i<st.party.length;i++){ const c=st.party[i]; if(c.alive) order.push({ index:i, id:c.id }); }
      st.selectionOrder = order;
      st.selectionIndex = 0;
      st.pendingActions = [];
      log(`-- Round ${st.round} --`);
      renderParty();
      if(order.length===0){
        resolveActions(st);
        return;
      }
      promptAction(st);
    }

    function promptAction(st){
      const entry = st.selectionOrder[st.selectionIndex];
      if(!entry){ clearActions(); resolveActions(st); return; }
      const actor = st.party[entry.index];
      if(!actor || !actor.alive){ st.selectionIndex+=1; promptAction(st); return; }
      const aliveMonsters = st.monsters.filter(m=>m.alive);
      if(aliveMonsters.length===0){ clearActions(); resolveActions(st); return; }
      const canFlee = !!st.encounter.canFlee;
      const buttons = aliveMonsters.map((monster) => {
        const targetId = monster.id;
        return {
          label: `Attack ${monster.name} (${monster.hpCurrent} HP)`,
          onSelect: () => {
            st.pendingActions.push({ type:'attack', actorId: actor.id, targetId });
            st.selectionIndex += 1;
            promptAction(st);
          },
        };
      });
      if (canFlee) {
        buttons.push({
          label: 'Flee',
          onSelect: () => {
            st.pendingActions.push({ type:'flee', actorId: actor.id });
            st.selectionIndex += 1;
            promptAction(st);
          },
        });
      }
      hud.setActions({ prompt: `Round ${st.round}: ${actor.name}`, buttons });
    }

    function resolveActions(st){
      clearActions();
      if(st.ended) return;
      for(let i=0;i<st.pendingActions.length;i++){
        const act = st.pendingActions[i];
        const actor = st.party.find(c=>c.id===act.actorId);
        if(!actor || !actor.alive) continue;
        if(act.type==='flee'){
          if(!st.encounter.canFlee){ log(`${actor.name} cannot flee!`); continue; }
          const success = Math.random() < 0.55;
          if(success){
            log(`${actor.name} signals a retreat! The party escapes.`);
            st.ended = true;
            st.winner = 'Party';
            st.fled = true;
            concludeCombat(st);
            return;
          } else {
            log(`${actor.name} fails to escape!`);
          }
        } else if(act.type==='attack'){
          let tgt = st.monsters.find(m=>m.id===act.targetId && m.alive);
          if(!tgt) tgt = firstAlive(st.monsters);
          if(!tgt){ log(`${actor.name} has no foe to strike.`); continue; }
          attackChar(actor, tgt);
          renderParty();
        }
      }
      if(!hasAlive(st.monsters)){
        st.ended = true;
        st.winner = 'Party';
        concludeCombat(st);
        renderParty();
        return;
      }
      const aliveParty = st.party.filter(c=>c.alive);
      if(aliveParty.length===0){
        st.ended = true;
        st.winner = 'Monsters';
        concludeCombat(st);
        renderParty();
        return;
      }
      for(let i=0;i<st.monsters.length;i++){
        const m = st.monsters[i];
        if(!m.alive) continue;
        const tgt = firstAlive(st.party);
        if(!tgt) break;
        attackMonster(m, tgt);
        renderParty();
        if(!hasAlive(st.party)) break;
      }
      if(!hasAlive(st.party)){
        st.ended = true;
        st.winner = 'Monsters';
        concludeCombat(st);
        renderParty();
        return;
      }
      st.round += 1;
      renderParty();
      setTimeout(()=>beginPlayerPhase(st), 250);
    }

    let stepsSinceEncounter=0; let inCombat=false; let combatState=null;
    function maybeEncounter(depth){
      if(inCombat) return;
      stepsSinceEncounter+=1;
      const threshold=Math.max(2, 6 - Math.min(depth,4));
      if(stepsSinceEncounter>=threshold){
        const chance=0.25 + 0.05*depth;
        if(Math.random()<chance){
          const enc=generateEncounter(depth);
          combatState=startCombat(enc);
          inCombat=true;
          stepsSinceEncounter=0;
          renderParty();
          setTimeout(()=>beginPlayerPhase(combatState), 200);
        }
      }
    }

    window.__bt3_onStepComplete = function(depth){ const d=(typeof depth==='number' && depth>0) ? depth : 1; maybeEncounter(d); };

    renderParty();
  });
})();
