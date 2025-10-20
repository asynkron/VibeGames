// Bard's Tale–style 3D with procedural dungeon and CRT HUD rendered via shared pixel canvas helpers.
// Serve over HTTP (e.g., npx http-server .)

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { createPixelContext } from '../shared/render/pixelCanvas.js';
import {
  UI_SETTINGS,
  createPartyPanelRect,
} from './config/uiSettings.js';

const DIR = { N: 0, E: 1, S: 2, W: 3 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const WALL = { OPEN: 0, WALL: 1, DOOR: 2 };

const textureLoader = new THREE.TextureLoader();

function loadTexture(relativePath, options = {}) {
  const { repeatX = 1, repeatY = 1 } = options;
  const texture = textureLoader.load(new URL(relativePath, import.meta.url).href);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

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

function createMinimapOverlay(screenElement, state) {
  // Draw a dungeon overview derived from visited cells and overlay it on demand.
  if (typeof document === 'undefined' || !screenElement) return null;

  const overlay = document.createElement('div');
  overlay.className = 'minimap-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  overlay.appendChild(canvas);

  const hint = document.createElement('div');
  hint.className = 'minimap-hint';
  hint.textContent = 'Press M or Esc to close';
  overlay.appendChild(hint);

  screenElement.appendChild(overlay);

  const ctx = canvas.getContext('2d');
  const cellSize = 18;
  const margin = 32;
  const corridorColor = '#46536a';
  const doorColor = '#c4873e';
  const tileColor = '#1e2737';
  const tileOutline = 'rgba(112, 130, 162, 0.32)';
  const playerColor = '#f4d28a';
  const headingColor = '#ffe9b3';
  const wallThickness = Math.max(2, Math.round(cellSize * 0.25));

  function ensureSize() {
    const desiredWidth = margin * 2 + state.width * cellSize;
    const desiredHeight = margin * 2 + state.height * cellSize;
    if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
      canvas.width = desiredWidth;
      canvas.height = desiredHeight;
    }
  }

  function drawHeading(cx, cy) {
    const size = cellSize * 0.55;
    const half = size / 2;
    ctx.fillStyle = headingColor;
    ctx.beginPath();
    if (state.dir === DIR.N) {
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx - half * 0.6, cy + half);
      ctx.lineTo(cx + half * 0.6, cy + half);
    } else if (state.dir === DIR.S) {
      ctx.moveTo(cx - half * 0.6, cy - half);
      ctx.lineTo(cx + half * 0.6, cy - half);
      ctx.lineTo(cx, cy + half);
    } else if (state.dir === DIR.E) {
      ctx.moveTo(cx - half, cy - half * 0.6);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx - half, cy + half * 0.6);
    } else {
      ctx.moveTo(cx + half, cy - half * 0.6);
      ctx.lineTo(cx - half, cy);
      ctx.lineTo(cx + half, cy + half * 0.6);
    }
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    ensureSize();
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(5, 7, 10, 0.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(margin, margin);

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.cells[y][x];
        const px = x * cellSize;
        const py = y * cellSize;
        ctx.strokeStyle = tileOutline;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
        if (!cell.visited) continue;

        ctx.fillStyle = tileColor;
        ctx.fillRect(px + wallThickness, py + wallThickness, cellSize - wallThickness * 2, cellSize - wallThickness * 2);

        for (const dir of [DIR.N, DIR.E, DIR.S, DIR.W]) {
          const wall = getWall(state.cells, state.width, state.height, x, y, dir);
          if (wall === WALL.WALL) continue;
          ctx.fillStyle = wall === WALL.DOOR ? doorColor : corridorColor;
          if (dir === DIR.N) {
            ctx.fillRect(px + wallThickness, py, cellSize - wallThickness * 2, wallThickness + 1);
          } else if (dir === DIR.S) {
            ctx.fillRect(px + wallThickness, py + cellSize - wallThickness - 1, cellSize - wallThickness * 2, wallThickness + 1);
          } else if (dir === DIR.E) {
            ctx.fillRect(px + cellSize - wallThickness - 1, py + wallThickness, wallThickness + 1, cellSize - wallThickness * 2);
          } else if (dir === DIR.W) {
            ctx.fillRect(px, py + wallThickness, wallThickness + 1, cellSize - wallThickness * 2);
          }
        }
      }
    }

    const playerPx = state.x * cellSize + cellSize / 2;
    const playerPy = state.y * cellSize + cellSize / 2;
    ctx.fillStyle = playerColor;
    ctx.beginPath();
    ctx.arc(playerPx, playerPy, Math.max(3, cellSize * 0.25), 0, Math.PI * 2);
    ctx.fill();
    drawHeading(playerPx, playerPy);

    ctx.restore();

    ctx.strokeStyle = 'rgba(244, 210, 138, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16.5, 16.5, canvas.width - 33, canvas.height - 33);
  }

  function show() {
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    draw();
  }

  function hide() {
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
  }

  overlay.addEventListener('click', (event) => {
    event.preventDefault();
    hide();
  });

  return {
    show,
    hide,
    toggle() { if (overlay.classList.contains('is-visible')) hide(); else show(); },
    isVisible() { return overlay.classList.contains('is-visible'); },
    update: draw,
  };
}

function createHudRenderer(canvas, stageElement) {
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  const pixel = createPixelContext(canvas, { alpha: true });
  const ctx = pixel.ctx;
  const state = {
    log: [],
    party: [],
    gold: 0,
    prompt: '',
    buttons: [],
    activeCharacterId: '',
    activePortrait: '',
    activeHeading: '',
    activeDetails: '',
    encounter: {
      url: '',
      image: null,
      isVisible: false,
      isLoading: false,
      token: 0,
    },
  };
  let buttonZones = [];
  const portraitCache = new Map();
  const scaledImageCache = new WeakMap();

  // Cache scaled versions of HUD images so the main canvas only ever blits
  // pre-sized buffers (keeps the 640x480 HUD crisp while allowing high-quality resizes).
  function getScaledImage(image, width, height) {
    if (!image) return null;
    const targetWidth = Math.max(1, Math.round(width));
    const targetHeight = Math.max(1, Math.round(height));
    if (!targetWidth || !targetHeight) return null;

    let sizeCache = scaledImageCache.get(image);
    if (!sizeCache) {
      sizeCache = new Map();
      scaledImageCache.set(image, sizeCache);
    }

    const key = `${targetWidth}x${targetHeight}`;
    const cached = sizeCache.get(key);
    if (cached) return cached;

    const buffer = document.createElement('canvas');
    buffer.width = targetWidth;
    buffer.height = targetHeight;
    const bufferCtx = buffer.getContext('2d');
    if (!bufferCtx) {
      sizeCache.set(key, buffer);
      return buffer;
    }

    if ('imageSmoothingEnabled' in bufferCtx) bufferCtx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in bufferCtx) bufferCtx.imageSmoothingQuality = 'high';

    bufferCtx.clearRect(0, 0, targetWidth, targetHeight);
    bufferCtx.drawImage(image, 0, 0, targetWidth, targetHeight);

    sizeCache.set(key, buffer);
    return buffer;
  }

  const { fonts, colors, layout } = UI_SETTINGS;
  const PANEL_MARGIN = layout.panelMargin;
  const INFO_PANEL_MIN_WIDTH = layout.infoPanelMinWidth;
  const INFO_PANEL_MIN_HEIGHT = layout.infoPanelMinHeight;
  const INFO_PANEL_GAP = layout.infoPanelGap;
  const PARTY_PANEL = createPartyPanelRect();
  const TITLE_FONT = fonts.title;
  const TEXT_FONT = fonts.text;
  const TEXT_COLOR = colors.text;
  const ACCENT_COLOR = colors.accent;
  const PANEL_BG = colors.panelBackground;
  const PANEL_BORDER = colors.panelBorder;
  const PANEL_SHADOW = colors.panelShadow;
  // The 3D viewport occupies a fixed square in the top-left HUD quadrant.
  const VIEWPORT_SIZE = Math.round(SCREEN_HEIGHT / 2 - PANEL_MARGIN);
  const VIEWPORT_RECT = Object.freeze({
    x: PANEL_MARGIN,
    y: PANEL_MARGIN,
    width: VIEWPORT_SIZE,
    height: VIEWPORT_SIZE,
  });
  const VIEWPORT_BOUNDS = Object.freeze({
    left: VIEWPORT_RECT.x,
    right: VIEWPORT_RECT.x + VIEWPORT_RECT.width,
    top: VIEWPORT_RECT.y,
    bottom: VIEWPORT_RECT.y + VIEWPORT_RECT.height,
  });

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

  function measureStageBounds() {
    // Keep the 3D viewport anchored to the HUD slot defined by VIEWPORT_RECT.
    // We compute the desired rectangle in HUD coordinates and then project it
    // into DOM space so the WebGL stage lines up with the painted HUD frame.
    if (!stageElement) return VIEWPORT_BOUNDS;

    const hudRect = canvas.getBoundingClientRect();
    if (!hudRect.width || !hudRect.height) return VIEWPORT_BOUNDS;

    const scaleX = hudRect.width / SCREEN_WIDTH;
    const scaleY = hudRect.height / SCREEN_HEIGHT;
    const width = (VIEWPORT_BOUNDS.right - VIEWPORT_BOUNDS.left) * scaleX;
    const height = (VIEWPORT_BOUNDS.bottom - VIEWPORT_BOUNDS.top) * scaleY;

    stageElement.style.left = `${VIEWPORT_BOUNDS.left * scaleX}px`;
    stageElement.style.top = `${VIEWPORT_BOUNDS.top * scaleY}px`;
    stageElement.style.width = `${width}px`;
    stageElement.style.height = `${height}px`;
    stageElement.style.maxWidth = 'none';
    stageElement.style.maxHeight = 'none';
    stageElement.style.minWidth = '0px';
    stageElement.style.minHeight = '0px';

    return VIEWPORT_BOUNDS;
  }

  function getPortraitImage(path) {
    if (!path) return null;
    let entry = portraitCache.get(path);
    if (!entry) {
      const img = new Image();
      img.decoding = 'async';
      img.src = path;
      img.addEventListener('load', () => render(), { once: false });
      img.addEventListener('error', () => {
        portraitCache.delete(path);
        render();
      }, { once: true });
      entry = { img };
      portraitCache.set(path, entry);
    }
    const img = entry.img;
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return img;
    }
    return null;
  }

  function drawViewportFrame(bounds) {
    const width = Math.max(0, bounds.right - bounds.left);
    const height = Math.max(0, bounds.bottom - bounds.top);
    if (!width || !height) return;

    const outerX = bounds.left - 2;
    const outerY = bounds.top - 2;
    const outerWidth = width + 4;
    const outerHeight = height + 4;
    const innerPadding = 6;
    const innerWidth = Math.max(0, width - innerPadding * 2);
    const innerHeight = Math.max(0, height - innerPadding * 2);

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PANEL_BORDER;
    ctx.strokeRect(outerX + 0.5, outerY + 0.5, outerWidth - 1, outerHeight - 1);
    if (innerWidth >= 1 && innerHeight >= 1) {
      ctx.strokeStyle = 'rgba(244, 210, 138, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        bounds.left + innerPadding + 0.5,
        bounds.top + innerPadding + 0.5,
        innerWidth - 1,
        innerHeight - 1,
      );
    }
    ctx.restore();
  }

  function drawEncounterArt(bounds) {
    const artState = state.encounter;
    if (!artState?.isLoading && !artState?.isVisible) return;

    const width = Math.max(0, bounds.right - bounds.left);
    const height = Math.max(0, bounds.bottom - bounds.top);
    if (!width || !height) return;

    const innerPadding = 6;
    const innerWidth = Math.max(0, width - innerPadding * 2);
    const innerHeight = Math.max(0, height - innerPadding * 2);
    if (!innerWidth || !innerHeight) return;

    const innerX = bounds.left + innerPadding;
    const innerY = bounds.top + innerPadding;
    const centerX = innerX + innerWidth / 2;
    const centerY = innerY + innerHeight / 2;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      Math.min(innerWidth, innerHeight) * 0.1,
      centerX,
      centerY,
      Math.max(innerWidth, innerHeight) * 0.75,
    );
    gradient.addColorStop(0, 'rgba(10, 12, 16, 0.82)');
    gradient.addColorStop(0.75, 'rgba(5, 6, 8, 0.92)');
    gradient.addColorStop(1, 'rgba(5, 6, 8, 0.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight);

    if (artState.isVisible && artState.image) {
      const img = artState.image;
      const scale = Math.min(innerWidth / img.width, innerHeight / img.height);
      const drawWidth = Math.max(1, Math.round(img.width * scale));
      const drawHeight = Math.max(1, Math.round(img.height * scale));
      const drawX = innerX + Math.round((innerWidth - drawWidth) / 2);
      const drawY = innerY + Math.round((innerHeight - drawHeight) / 2);
      const scaled = getScaledImage(img, drawWidth, drawHeight);

      if (scaled) {
        pixel.disableSmoothing();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(scaled, drawX, drawY);
      }
    }

    ctx.restore();
  }

  function computeInfoPanel(stageBounds) {
    const x = Math.round(stageBounds.right + INFO_PANEL_GAP);
    const availableWidth = Math.max(0, SCREEN_WIDTH - PANEL_MARGIN - x);
    let width = INFO_PANEL_MIN_WIDTH;
    if (availableWidth > 0) {
      width = availableWidth;
    }
    width = Math.max(0, width);
    const stageHeight = Math.max(0, stageBounds.bottom - stageBounds.top);
    const height = Math.max(INFO_PANEL_MIN_HEIGHT, stageHeight);
    return {
      x,
      y: PANEL_MARGIN,
      width,
      height,
    };
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    buttonZones = [];

    ctx.save();
    ctx.font = TEXT_FONT;
    ctx.textBaseline = 'top';
    ctx.fillStyle = TEXT_COLOR;

    const stageBounds = measureStageBounds();
    drawEncounterArt(stageBounds);
    drawViewportFrame(stageBounds);
    const infoPanel = computeInfoPanel(stageBounds);
    drawPanel(infoPanel);

    const lineHeight = layout.logLineHeight;
    const logMargin = 12;
    const portraitDisplaySize = 86;
    const contentTop = infoPanel.y + 18;
    let logX = infoPanel.x + logMargin;
    let logTop = contentTop;
    let logWidth = Math.max(0, infoPanel.width - logMargin * 2);

    if (state.activePortrait) {
      const portrait = getPortraitImage(state.activePortrait);
      if (portrait) {
        const px = infoPanel.x + logMargin;
        const py = contentTop;
        const scaledPortrait = getScaledImage(portrait, portraitDisplaySize, portraitDisplaySize);
        if (scaledPortrait) {
          pixel.disableSmoothing();
          ctx.drawImage(scaledPortrait, px, py);
        }
        ctx.strokeStyle = 'rgba(244, 210, 138, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 1, py - 1, portraitDisplaySize + 2, portraitDisplaySize + 2);
        logX = px + portraitDisplaySize + 10;
        logWidth = Math.max(0, infoPanel.width - (portraitDisplaySize + 10 + logMargin * 2));
        let textY = py;
        if (state.activeHeading) {
          ctx.fillStyle = ACCENT_COLOR;
          ctx.fillText(state.activeHeading, logX, textY);
          textY += lineHeight + 2;
          ctx.fillStyle = TEXT_COLOR;
        }
        if (state.activeDetails) {
          const detailLines = wrapLine(state.activeDetails, logWidth);
          for (let i = 0; i < detailLines.length; i++) {
            ctx.fillText(detailLines[i], logX, textY + i * lineHeight);
          }
          textY += detailLines.length * lineHeight + 4;
        }
        logTop = Math.max(textY, py + portraitDisplaySize + 4);
      } else {
        // Trigger lazy load if not already cached.
        getPortraitImage(state.activePortrait);
      }
    }

    const flattened = [];
    for (let i = 0; i < state.log.length; i++) {
      const message = state.log[i];
      const lines = wrapLine(message, logWidth);
      for (let j = 0; j < lines.length; j++) flattened.push(lines[j]);
    }
    const logBottomLimit = infoPanel.y + infoPanel.height - layout.logBottomPadding;
    const maxVisible = Math.max(1, Math.floor(Math.max(0, logBottomLimit - logTop) / lineHeight));
    const visible = flattened.slice(-maxVisible);
    const startY = Math.max(logTop, logBottomLimit - visible.length * lineHeight);
    for (let i = 0; i < visible.length; i++) {
      ctx.fillText(visible[i], logX, startY + i * lineHeight);
    }

    let actionY = Math.min(logBottomLimit, startY + visible.length * lineHeight) + layout.buttonVerticalSpacing;
    const infoPanelBottom = infoPanel.y + infoPanel.height - layout.infoPanelFooterPadding;
    if (state.prompt && actionY <= infoPanelBottom) {
      ctx.fillStyle = ACCENT_COLOR;
      ctx.fillText(state.prompt, logX, actionY);
      ctx.fillStyle = TEXT_COLOR;
      actionY += lineHeight + 2;
    }

    const buttonStride = lineHeight + layout.buttonVerticalSpacing;
    const availableButtonSpace = Math.max(0, infoPanelBottom - actionY + 4);
    const maxButtons = Math.max(0, Math.floor(availableButtonSpace / buttonStride));
    for (let i = 0; i < state.buttons.length && i < maxButtons; i++) {
      const btn = state.buttons[i];
      const bx = logX;
      const by = actionY + i * buttonStride;
      const bw = Math.max(0, logWidth);
      const bh = lineHeight + 6;
      ctx.save();
      ctx.fillStyle = colors.buttonBackground;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = colors.buttonBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
      const hotkey = btn.hotkey ? btn.hotkey : String(i + 1);
      ctx.fillText(`[${hotkey}] ${btn.label}`, bx + layout.buttonPaddingX, by + layout.buttonPaddingY);
      buttonZones.push({ x: bx, y: by, width: bw, height: bh, onSelect: btn.onSelect });
    }

    drawPanel(PARTY_PANEL, `ROSTER — GOLD ${state.gold}`);
    const headerY = PARTY_PANEL.y + layout.partyPanelHeaderOffset;
    ctx.fillStyle = ACCENT_COLOR;
    ctx.fillText('MEMBERS', PARTY_PANEL.x + 12, headerY);
    ctx.fillStyle = TEXT_COLOR;

    const partyPanelBottom = PARTY_PANEL.y + PARTY_PANEL.height - layout.partyPanelFooterPadding;
    const rowPadding = 6;
    const lineSpacing = lineHeight + 2;
    let rowTop = headerY + layout.partyPanelRowOffset + lineHeight;
    for (let i = 0; i < state.party.length; i++) {
      const row = state.party[i];
      const statusLine = row.alive ? (row.statusText || '') : 'DEAD';
      let lineCount = 2;
      if (row.attributes) lineCount += 1;
      if (statusLine) lineCount += 1;
      const rowHeight = rowPadding * 2 + lineCount * lineHeight + Math.max(0, lineCount - 1) * 2;
      if (rowTop + rowHeight > partyPanelBottom) {
        break;
      }
      if (row.id && row.id === state.activeCharacterId) {
        ctx.save();
        ctx.fillStyle = 'rgba(244, 210, 138, 0.16)';
        ctx.fillRect(PARTY_PANEL.x + 10, rowTop - 2, PARTY_PANEL.width - 20, rowHeight);
        ctx.restore();
      }
      const textX = PARTY_PANEL.x + 18;
      let textY = rowTop + rowPadding;
      ctx.fillStyle = ACCENT_COLOR;
      ctx.fillText(`${row.name} — ${row.classType} (Lv ${row.level})`, textX, textY);
      ctx.fillStyle = TEXT_COLOR;
      textY += lineSpacing;
      ctx.fillText(`HP ${row.hpCurrent}/${row.hpMax}   SP ${row.spCurrent}/${row.spMax}   AC ${row.ac}   Hit ${row.toHit}   DMG ${row.damageMin}-${row.damageMax}`, textX, textY);
      textY += lineSpacing;
      if (row.attributes) {
        const attrs = row.attributes;
        const attrLine = `STR ${attrs.strength}  INT ${attrs.intelligence}  DEX ${attrs.dexterity}  CON ${attrs.constitution}  LCK ${attrs.luck}`;
        ctx.fillText(attrLine, textX, textY);
        textY += lineSpacing;
      }
      if (statusLine) {
        ctx.fillText(statusLine, textX, textY);
      }
      rowTop += rowHeight;
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

  function requestEncounterArt(url, callbacks = {}) {
    const artState = state.encounter;
    if (!artState) return;

    artState.token += 1;
    const token = artState.token;
    const { onLoad, onError } = callbacks;

    if (!url) {
      artState.url = '';
      artState.image = null;
      artState.isVisible = false;
      artState.isLoading = false;
      render();
      return;
    }

    artState.url = url;
    artState.isVisible = false;
    artState.isLoading = true;
    render();

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (token !== artState.token) return;
      artState.image = img;
      artState.isVisible = true;
      artState.isLoading = false;
      render();
      if (typeof onLoad === 'function') onLoad();
    };
    img.onerror = () => {
      if (token !== artState.token) return;
      artState.image = null;
      artState.isVisible = false;
      artState.isLoading = false;
      render();
      if (typeof onError === 'function') onError();
    };
    img.src = url;
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

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(render).catch(() => render());
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', render);
    window.addEventListener('keydown', (event) => {
      if (!state.buttons.length) return;
      const key = String(event.key || '').toLowerCase();
      for (let i = 0; i < state.buttons.length; i++) {
        const btn = state.buttons[i];
        const hotkey = (btn?.hotkey ? String(btn.hotkey) : String(i + 1)).toLowerCase();
        if (hotkey === key) {
          event.preventDefault();
          triggerButton(btn);
          break;
        }
      }
    });
  }

  render();

  return {
    appendLog(message) {
      state.log.push(message);
      if (state.log.length > 64) state.log.splice(0, state.log.length - 64);
      render();
    },
    setParty(data) {
      state.party = Array.isArray(data?.members)
        ? data.members.map((member) => {
            if (member?.portrait) getPortraitImage(member.portrait);
            return member;
          })
        : [];
      state.gold = data?.gold ?? state.gold;
      if (state.activeCharacterId && !state.party.some((m) => m.id === state.activeCharacterId)) {
        state.activeCharacterId = '';
        state.activePortrait = '';
        state.activeHeading = '';
        state.activeDetails = '';
      }
      render();
    },
    setActions({ prompt = '', buttons = [], active = null, details = '' } = {}) {
      state.prompt = prompt;
      state.buttons = Array.isArray(buttons) ? buttons.slice() : [];
      const activeData = active || {};
      state.activeCharacterId = activeData.id || '';
      state.activePortrait = activeData.portrait || '';
      state.activeHeading = activeData.heading || activeData.name || '';
      const detailText = activeData.details || details || '';
      state.activeDetails = detailText;
      if (state.activePortrait) getPortraitImage(state.activePortrait);
      render();
    },
    clearActions() {
      state.prompt = '';
      state.buttons = [];
      state.activeCharacterId = '';
      state.activePortrait = '';
      state.activeHeading = '';
      state.activeDetails = '';
      render();
    },
    showEncounterArt(url, callbacks) {
      requestEncounterArt(url, callbacks);
    },
    hideEncounterArt() {
      requestEncounterArt('');
    },
    redraw: render,
  };
}

function setupEncounterBillboard(stageElement, hudRenderer) {
  if (!stageElement) return null;

  function setEncounterVisibility(active) {
    // Hide the WebGL canvas while the encounter billboard is meant to occupy the space.
    stageElement.classList.toggle('is-encountering', !!active);
  }

  let currentUrl = '';
  let loadToken = 0;

  function hide() {
    currentUrl = '';
    loadToken += 1;
    if (typeof hudRenderer?.hideEncounterArt === 'function') {
      hudRenderer.hideEncounterArt();
    }
    setEncounterVisibility(false);
  }

  function show(url) {
    if (!url) {
      hide();
      return;
    }

    const token = ++loadToken;
    currentUrl = url;
    setEncounterVisibility(true);
    if (typeof hudRenderer?.showEncounterArt === 'function') {
      hudRenderer.showEncounterArt(url, {
        onError: () => {
          if (token !== loadToken || currentUrl !== url) return;
          hide();
        },
      });
    }
  }

  setEncounterVisibility(false);

  return {
    show,
    hide,
    sync() {
      setEncounterVisibility(!!currentUrl);
      if (typeof hudRenderer?.redraw === 'function') {
        hudRenderer.redraw();
      }
    },
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

const SCREEN_WIDTH = UI_SETTINGS.resolution.width;
const SCREEN_HEIGHT = UI_SETTINGS.resolution.height;
// Render the 3D viewport to a fixed low-resolution buffer so the browser upscales it.
const VIEWPORT_RENDER_SIZE = 256;

function buildScene(state) {
  const stage = document.getElementById('stage');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.Fog(0x0a0c10, 4.5, 20);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  stage.appendChild(renderer.domElement);
  renderer.domElement.classList.add('pixel-canvas');
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.imageRendering = 'pixelated';

  const camera = new THREE.PerspectiveCamera(60, SCREEN_WIDTH / SCREEN_HEIGHT, 0.05, 200);

  // Fill the maze with a soft base light so darker corners remain readable.
  const ambient = new THREE.AmbientLight(0xbcb6a8, 0.65);
  // Hemisphere light lifts the vertical surfaces without over-exposing the floor.
  const hemiLight = new THREE.HemisphereLight(0xd9d0c0, 0x111318, 0.4);
  const dirLight = new THREE.DirectionalLight(0xfdf6e4, 0.5);
  dirLight.position.set(3.5, 4.5, 2.5);
  scene.add(ambient, hemiLight, dirLight);

  const tileSize = 1.0;
  const wallHeight = tileSize;
  const eye = tileSize * 0.55;

  const wallTexture = loadTexture('./assets/monsters/green-wall.png');
  const floorTexture = loadTexture('./assets/monsters/floor.png', {
    // Repeat across the dungeon grid so each tile gets the proper texel density.
    repeatX: state.width,
    repeatY: state.height,
  });
  const ceilingTexture = loadTexture('./assets/monsters/ceiling.png', {
    repeatX: state.width,
    repeatY: state.height,
  });
  const doorTexture = loadTexture('./assets/monsters/green-wall-door.png');

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
      const doorHeight = h;
      const doorY = doorHeight / 2;

      if (dir === DIR.N || dir === DIR.S) {
        const z = dir === DIR.N ? (cz - 0.5) : (cz + 0.5);
        const ry = dir === DIR.N ? 0 : Math.PI;
        addPanel(cx, doorY, z, ry, w, doorHeight, doorMat);
      } else {
        const xw = dir === DIR.E ? (cx + 0.5) : (cx - 0.5);
        const ry = dir === DIR.E ? -Math.PI / 2 : Math.PI / 2;
        addPanel(xw, doorY, cz, ry, w, doorHeight, doorMat);
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

  // Warm point light that follows the party to mimic a handheld torch.
  const torchAnchor = new THREE.Object3D();
  const torchOffset = { x: 0.28, y: eye - 0.08, z: -0.32 };
  torchAnchor.position.set(torchOffset.x, torchOffset.y, torchOffset.z);
  torchAnchor.userData.baseOffset = torchOffset;
  const torch = new THREE.PointLight(0xffc87a, 1.55, 7.5, 2.2);
  torch.castShadow = false;
  torch.userData.baseIntensity = torch.intensity;
  torch.userData.baseDistance = torch.distance;
  torchAnchor.add(torch);
  player.add(torchAnchor);

  camera.position.set(0, eye, 0);
  player.add(camera);

  function onResize() {
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, rect.width || SCREEN_WIDTH);
    const h = Math.max(1, rect.height || SCREEN_HEIGHT);
    // Keep the camera aspect tied to the DOM size while rendering to a fixed buffer.
    renderer.setSize(VIEWPORT_RENDER_SIZE, VIEWPORT_RENDER_SIZE, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  onResize();
  window.addEventListener('resize', onResize);

  return { stage, scene, renderer, camera, player, torch, torchAnchor };
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
  const stageElement = document.getElementById('stage');
  const screenElement = document.getElementById('screen');
  const hud = hudCanvas ? createHudRenderer(hudCanvas, stageElement) : null;
  if (typeof window !== 'undefined') {
    window.__bt3_hud = hud;
  }

  const g = buildScene(state);
  const minimap = createMinimapOverlay(screenElement, state);
  if (minimap) minimap.update();
  const encounterBillboard = setupEncounterBillboard(stageElement, hud);
  if (encounterBillboard?.sync) encounterBillboard.sync();
  if (typeof window !== 'undefined') {
    window.__bt3_encounterBillboard = encounterBillboard;
  }

  // Animation state
  let anim = null; // {type:'move'|'turn', start, duration, fromPos:{x,z}, toPos:{x,z}, fromYaw, toYaw}
  let keyQueued = null;
  let lastFrameTime = performance.now();
  let torchPhase = Math.random() * Math.PI * 2;

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
    if (minimap?.isVisible()) return;
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
    if (minimap) minimap.update();
  }

  function startTurn(left) {
    if (anim) return;
    if (typeof window !== 'undefined' && window.__bt3_isCombatActive) return;
    if (minimap?.isVisible()) return;
    const fromYaw = g.player.rotation.y;
    state.dir = left ? leftOf(state.dir) : rightOf(state.dir);
    const toYawIdeal = yawForDir(state.dir);
    // choose shortest path
    let delta = toYawIdeal - fromYaw;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    anim = { type: 'turn', start: performance.now(), duration: 220, fromYaw, toYaw: fromYaw + delta };
    if (minimap) minimap.update();
  }

  function onKey(ev) {
    if (ev.key === 'm' || ev.key === 'M') {
      ev.preventDefault();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      if (minimap) minimap.toggle();
      return;
    }
    if (ev.key === 'Escape' && minimap?.isVisible()) {
      ev.preventDefault();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      minimap.hide();
      return;
    }
    if (minimap?.isVisible()) {
      ev.preventDefault();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      return;
    }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); if (!anim) startTurn(true); else keyQueued = 'L'; }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); if (!anim) startTurn(false); else keyQueued = 'R'; }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (!anim) startMove(+1); else keyQueued = 'F'; }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); if (!anim) startMove(-1); else keyQueued = 'B'; }
  }
  window.addEventListener('keydown', onKey);

  function step() {
    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

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

    if (g.torch) {
      // Flicker intensity and anchor wobble with a blend of low/high frequency noise.
      torchPhase += dt * 5.2;
      const spark = Math.sin(torchPhase) * 0.18 + (Math.random() - 0.5) * 0.1;
      const baseIntensity = g.torch.userData.baseIntensity;
      const baseDistance = g.torch.userData.baseDistance;
      g.torch.intensity = clamp(baseIntensity + spark, baseIntensity * 0.65, baseIntensity * 1.35);
      g.torch.distance = clamp(baseDistance + spark * 1.8, baseDistance * 0.75, baseDistance * 1.2);
      if (g.torchAnchor?.userData?.baseOffset) {
        const b = g.torchAnchor.userData.baseOffset;
        g.torchAnchor.position.x = b.x + Math.sin(torchPhase * 2.4) * 0.035;
        g.torchAnchor.position.y = b.y + Math.cos(torchPhase * 3.1) * 0.018;
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
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  onReady(function() {
    if (typeof window !== 'undefined') window.__bt3_isCombatActive = false;

    function createFallbackHud() {
      return {
        appendLog(message) { console.log('[BT3]', message); },
        setParty() {},
        setActions() {},
        clearActions() {},
        showEncounterArt() {},
        hideEncounterArt() {},
        redraw() {},
      };
    }

    const hud = (typeof window !== 'undefined' && window.__bt3_hud) ? window.__bt3_hud : createFallbackHud();

    const LOG_SCROLL_DELAY = 420; // Pace log entries to mimic the classic slow scroll.
    const logQueue = [];
    let logTimer = null;
    let isProcessingLog = false;
    const logIdleResolvers = [];

    function resolveLogIdle() {
      const pending = logIdleResolvers.splice(0, logIdleResolvers.length);
      for (const resolve of pending) resolve();
    }

    function processLogQueue() {
      if (!logQueue.length) {
        isProcessingLog = false;
        if (logTimer) {
          clearTimeout(logTimer);
          logTimer = null;
        }
        resolveLogIdle();
        return;
      }
      isProcessingLog = true;
      const { message, delay } = logQueue.shift();
      hud.appendLog(message);
      const wait = typeof delay === 'number' && delay >= 0 ? delay : LOG_SCROLL_DELAY;
      logTimer = setTimeout(processLogQueue, wait);
    }

    function enqueueLog(message, delay = LOG_SCROLL_DELAY) {
      logQueue.push({ message, delay });
      if (!isProcessingLog) {
        processLogQueue();
      }
    }

    function waitForLogIdle() {
      if (!isProcessingLog && !logQueue.length) {
        return Promise.resolve();
      }
      return new Promise((resolve) => logIdleResolvers.push(resolve));
    }

    function log(message, options = {}) {
      const delay = typeof options?.delay === 'number' ? options.delay : LOG_SCROLL_DELAY;
      enqueueLog(message, delay);
    }

    function clearActions() {
      hud.clearActions();
    }

    const MONSTER_ART = {
      serpent: './assets/monsters/serpent.png',
      hobbit: './assets/monsters/hobbit.png',
      hobgoblin: './assets/monsters/hobgoblin.png',
      skeleton: './assets/monsters/skeleton.png',
      knight: './assets/monsters/knight.png',
      monk: './assets/monsters/monk.png',
      mage: './assets/monsters/mage.png',
      enchantress: './assets/monsters/female-mage.png',
      rat: './assets/monsters/rat.png',
      default: './assets/monsters/monster.png',
      treasure: './assets/monsters/treasure.png',
    };

    const billboard = (typeof window !== 'undefined' && window.__bt3_encounterBillboard) ? window.__bt3_encounterBillboard : null;
    let postVictoryTimer = null;

    function clearVictoryTimer() {
      if (postVictoryTimer) {
        clearTimeout(postVictoryTimer);
        postVictoryTimer = null;
      }
    }

    function showEncounterArt(speciesId) {
      if (!billboard) return;
      clearVictoryTimer();
      const path = MONSTER_ART[speciesId] || MONSTER_ART.default;
      if (path) {
        billboard.show(path);
      } else {
        billboard.hide();
      }
    }

    function hideEncounterArt() {
      clearVictoryTimer();
      if (billboard) billboard.hide();
    }

    const CLASS_DATA = {
      Warrior: {
        hitDie: 16,
        spBase: 0,
        baseAttributes: { strength: 18, intelligence: 8, dexterity: 12, constitution: 17, luck: 10 },
        baseAc: 8,
        baseToHit: 2,
        damageBonus: 3,
        ability: 'warrior_power_strike',
        portrait: './assets/portraits/warrior.png',
        description: 'Battle-hardened veteran who wields heavy weapons with crushing force.'
      },
      Paladin: {
        hitDie: 14,
        spBase: 6,
        baseAttributes: { strength: 16, intelligence: 10, dexterity: 11, constitution: 16, luck: 12 },
        baseAc: 8,
        baseToHit: 1,
        damageBonus: 2,
        ability: 'paladin_lay_on_hands',
        portrait: './assets/portraits/paladin.png',
        description: 'Holy knight capable of bolstering allies with restorative miracles.'
      },
      Rogue: {
        hitDie: 12,
        spBase: 0,
        baseAttributes: { strength: 12, intelligence: 11, dexterity: 17, constitution: 12, luck: 16 },
        baseAc: 9,
        baseToHit: 1,
        damageBonus: 1,
        ability: 'rogue_backstab',
        portrait: './assets/portraits/rogue.png',
        description: 'Shadowy specialist who excels at striking distracted foes.'
      },
      Bard: {
        hitDie: 12,
        spBase: 4,
        baseAttributes: { strength: 12, intelligence: 13, dexterity: 14, constitution: 12, luck: 14 },
        baseAc: 9,
        baseToHit: 0,
        damageBonus: 1,
        songs: ['TRAV', 'ROGU', 'SEEK', 'WACH', 'DEST', 'FALK'],
        portrait: './assets/portraits/bard.png',
        description: 'Wandering minstrel whose songs fortify, heal, and confound.'
      },
      Hunter: {
        hitDie: 13,
        spBase: 0,
        baseAttributes: { strength: 15, intelligence: 9, dexterity: 18, constitution: 13, luck: 13 },
        baseAc: 8,
        baseToHit: 2,
        damageBonus: 2,
        ability: 'hunter_aimed_shot',
        portrait: './assets/portraits/hunter.png',
        description: 'Keen-eyed archer whose critical strikes can fell the mightiest foes.'
      },
      Monk: {
        hitDie: 13,
        spBase: 0,
        baseAttributes: { strength: 15, intelligence: 11, dexterity: 16, constitution: 14, luck: 12 },
        baseAc: 7,
        baseToHit: 2,
        damageBonus: 2,
        ability: 'monk_stunning_blow',
        portrait: './assets/portraits/monk.png',
        description: 'Unarmored martial artist whose disciplined strikes stagger enemies.'
      },
      Conjurer: {
        hitDie: 10,
        spBase: 14,
        baseAttributes: { strength: 9, intelligence: 17, dexterity: 12, constitution: 11, luck: 12 },
        baseAc: 10,
        baseToHit: 0,
        damageBonus: 0,
        spellList: ['MAFL', 'ARFI', 'TRZP', 'FRFO', 'MACO', 'WOHL', 'LEVI', 'WAST'],
        portrait: './assets/portraits/conjurer.png',
        description: 'Elemental scholar focused on direct evocation and exploration magic.'
      },
      Magician: {
        hitDie: 10,
        spBase: 14,
        baseAttributes: { strength: 9, intelligence: 17, dexterity: 12, constitution: 11, luck: 12 },
        baseAc: 10,
        baseToHit: 0,
        damageBonus: 0,
        spellList: ['SCSI', 'HOWA', 'STLI', 'PHBL', 'MAGA', 'AREN', 'GRRE', 'WAWA'],
        portrait: './assets/portraits/magician.png',
        description: 'Offensive mage specializing in weapon enchantments and holy damage.'
      },
      Sorcerer: {
        hitDie: 10,
        spBase: 16,
        baseAttributes: { strength: 8, intelligence: 18, dexterity: 13, constitution: 10, luck: 13 },
        baseAc: 10,
        baseToHit: 0,
        damageBonus: 0,
        spellList: ['MIJA', 'PHDO', 'YAWR', 'MAGM', 'OGST', 'INWO', 'FLCO', 'MAMA'],
        portrait: './assets/portraits/sorcerer.png',
        description: 'Illusionist whose reality-bending magics disable and devastate.'
      },
      Wizard: {
        hitDie: 10,
        spBase: 18,
        baseAttributes: { strength: 8, intelligence: 19, dexterity: 12, constitution: 10, luck: 14 },
        baseAc: 10,
        baseToHit: 0,
        damageBonus: 0,
        spellList: ['MIBL', 'INVI', 'GRSU', 'ANMA', 'FLRE', 'REST', 'WZWA', 'APAR'],
        portrait: './assets/portraits/wizard.png',
        description: 'Master of high sorcery wielding mind blades and protective wards.'
      },
      Archmage: {
        hitDie: 11,
        spBase: 20,
        baseAttributes: { strength: 9, intelligence: 20, dexterity: 13, constitution: 11, luck: 15 },
        baseAc: 9,
        baseToHit: 0,
        damageBonus: 0,
        spellList: ['SOSI', 'MORT', 'DEMI', 'SPTO', 'WIZB', 'APAR', 'REST', 'BLAZ'],
        inherits: ['Conjurer', 'Magician', 'Sorcerer', 'Wizard'],
        portrait: './assets/portraits/archmage.png',
        description: 'Spell-archivist who commands the full repertoire of lesser disciplines.'
      },
      Chronomancer: {
        hitDie: 11,
        spBase: 18,
        baseAttributes: { strength: 8, intelligence: 20, dexterity: 14, constitution: 11, luck: 15 },
        baseAc: 9,
        baseToHit: 0,
        damageBonus: 0,
        spellList: ['DELV', 'HAST', 'SLOW', 'TARD', 'ROTL', 'DIVA', 'TIME', 'STAS'],
        inherits: ['Sorcerer', 'Wizard'],
        portrait: './assets/portraits/chronomancer.png',
        description: 'Guardian of time who hastens allies and suspends enemies in stasis.'
      },
      Geomancer: {
        hitDie: 11,
        spBase: 18,
        baseAttributes: { strength: 10, intelligence: 19, dexterity: 13, constitution: 12, luck: 14 },
        baseAc: 9,
        baseToHit: 0,
        damageBonus: 1,
        spellList: ['QUAK', 'STON', 'VINE', 'LAVA', 'SAND', 'GAEA', 'TOXF', 'BREA'],
        inherits: ['Conjurer', 'Magician'],
        portrait: './assets/portraits/geomancer.png',
        description: 'Earth-shaper blending primal fury with protective wards.'
      },
    };

    const SPELL_LIBRARY = {
      MAFL: { code: 'MAFL', name: 'Magic Flame', classType: 'Conjurer', cost: 2, type: 'buff', target: 'party', duration: 3, modifiers: { toHit: 1, damageBonus: 1 }, description: 'Ignites a spectral flame that sharpens party attacks.', usableInCombat: true },
      ARFI: { code: 'ARFI', name: 'Arc Fire', classType: 'Conjurer', cost: 3, type: 'damage', target: 'enemy', power: 12, description: 'Arcing flames scorch a single foe.', usableInCombat: true },
      TRZP: { code: 'TRZP', name: 'Trap Zap', classType: 'Conjurer', cost: 3, type: 'utility', target: 'none', description: 'Neutralizes mundane traps; little use in combat.', usableInCombat: false },
      FRFO: { code: 'FRFO', name: 'Freeze Foes', classType: 'Conjurer', cost: 5, type: 'debuff', target: 'enemies', duration: 2, modifiers: { toHit: -2 }, description: 'Sheets of frost sap enemy accuracy.', usableInCombat: true },
      MACO: { code: 'MACO', name: 'Magic Compass', classType: 'Conjurer', cost: 2, type: 'utility', target: 'none', description: 'Calibrates the party compass.', usableInCombat: false },
      WOHL: { code: 'WOHL', name: 'Word of Healing', classType: 'Conjurer', cost: 4, type: 'heal', target: 'ally', amount: 18, description: 'Divine word mends wounds.', usableInCombat: true },
      LEVI: { code: 'LEVI', name: 'Levitate', classType: 'Conjurer', cost: 4, type: 'utility', target: 'party', description: 'Allows levitation over floor hazards.', usableInCombat: false },
      WAST: { code: 'WAST', name: 'Warstrike', classType: 'Conjurer', cost: 6, type: 'damage', target: 'enemy', power: 22, description: 'Concentrated beam that devastates a single foe.', usableInCombat: true },

      SCSI: { code: 'SCSI', name: 'Scry Site', classType: 'Magician', cost: 3, type: 'utility', target: 'party', description: 'Reveals dungeon layout.', usableInCombat: false },
      HOWA: { code: 'HOWA', name: 'Holy Water', classType: 'Magician', cost: 4, type: 'damage', target: 'enemy', power: 14, description: 'Consecrated water burns undead.', usableInCombat: true },
      STLI: { code: 'STLI', name: 'Stillness', classType: 'Magician', cost: 5, type: 'debuff', target: 'enemy', duration: 2, modifiers: { stunned: true }, description: 'Suspends a foe in place.', usableInCombat: true },
      PHBL: { code: 'PHBL', name: 'Phase Blur', classType: 'Magician', cost: 4, type: 'buff', target: 'ally', duration: 3, modifiers: { ac: -2 }, description: 'Envelops an ally in shimmering mist, lowering AC.', usableInCombat: true },
      MAGA: { code: 'MAGA', name: 'Mage Gauntlets', classType: 'Magician', cost: 4, type: 'buff', target: 'ally', duration: 3, modifiers: { damageBonus: 3 }, description: 'Empowers a weapon with arcane might.', usableInCombat: true },
      AREN: { code: 'AREN', name: 'Area Enchant', classType: 'Magician', cost: 5, type: 'buff', target: 'party', duration: 3, modifiers: { ac: -1, toHit: 1 }, description: 'Augments the entire party with protective wards.', usableInCombat: true },
      GRRE: { code: 'GRRE', name: 'Greater Revelation', classType: 'Magician', cost: 5, type: 'utility', target: 'party', description: 'Exposes hidden doors and illusions.', usableInCombat: false },
      WAWA: { code: 'WAWA', name: 'War Wind', classType: 'Magician', cost: 7, type: 'damage', target: 'enemies', power: 18, description: 'Storm of blades lashes all enemies.', usableInCombat: true },

      MIJA: { code: 'MIJA', name: 'Mind Jab', classType: 'Sorcerer', cost: 4, type: 'damage', target: 'enemy', power: 16, ignoreArmor: true, description: 'Psychic lance bypasses armor.', usableInCombat: true },
      PHDO: { code: 'PHDO', name: 'Phase Door', classType: 'Sorcerer', cost: 6, type: 'utility', target: 'party', description: 'Teleports the party short distances.', usableInCombat: false },
      YAWR: { code: 'YAWR', name: "Ybarra's Ward", classType: 'Sorcerer', cost: 5, type: 'buff', target: 'party', duration: 3, modifiers: { magicResist: 10 }, description: 'Mystical barrier improves magical resistance.', usableInCombat: true },
      MAGM: { code: 'MAGM', name: 'Magi Magma', classType: 'Sorcerer', cost: 6, type: 'damage', target: 'enemies', power: 16, description: 'Molten rock erupts beneath enemies.', usableInCombat: true },
      OGST: { code: 'OGST', name: 'Oscon\'s Stasis', classType: 'Sorcerer', cost: 7, type: 'debuff', target: 'enemy', duration: 2, modifiers: { stunned: true }, description: 'Locks a foe in temporal amber.', usableInCombat: true },
      INWO: { code: 'INWO', name: 'Invisible Wall', classType: 'Sorcerer', cost: 6, type: 'buff', target: 'party', duration: 2, modifiers: { ac: -2 }, description: 'Invisible barrier shields the party.', usableInCombat: true },
      FLCO: { code: 'FLCO', name: 'Flesh to Coal', classType: 'Sorcerer', cost: 7, type: 'damage', target: 'enemy', power: 20, description: 'Attempts to petrify the target.', usableInCombat: true },
      MAMA: { code: 'MAMA', name: 'Mana Maelstrom', classType: 'Sorcerer', cost: 8, type: 'damage', target: 'enemies', power: 24, description: 'Explosive conflagration engulfing all foes.', usableInCombat: true },

      MIBL: { code: 'MIBL', name: "Mangar's Mind Blade", classType: 'Wizard', cost: 8, type: 'damage', target: 'enemies', power: 26, ignoreArmor: true, description: 'Legendary psionic blade ravages enemy minds.', usableInCombat: true },
      INVI: { code: 'INVI', name: 'Invisibility', classType: 'Wizard', cost: 6, type: 'buff', target: 'ally', duration: 3, modifiers: { ac: -3, toHit: 1 }, description: 'Bends light around an ally.', usableInCombat: true },
      GRSU: { code: 'GRSU', name: 'Group Shield', classType: 'Wizard', cost: 6, type: 'buff', target: 'party', duration: 3, modifiers: { ac: -2 }, description: 'Protective field cushions the entire party.', usableInCombat: true },
      ANMA: { code: 'ANMA', name: 'Anti-Magic', classType: 'Wizard', cost: 5, type: 'buff', target: 'party', duration: 3, modifiers: { magicResist: 15 }, description: 'Nullifies hostile spells.', usableInCombat: true },
      FLRE: { code: 'FLRE', name: 'Flesh Restore', classType: 'Wizard', cost: 8, type: 'revive', target: 'ally', amount: 20, description: 'Restores a fallen ally to fighting shape.', usableInCombat: true },
      REST: { code: 'REST', name: 'Restoration', classType: 'Wizard', cost: 7, type: 'heal', target: 'party', amount: 14, description: 'Heals all allies with rejuvenating light.', usableInCombat: true },
      WZWA: { code: 'WZWA', name: 'Wizard War', classType: 'Wizard', cost: 9, type: 'damage', target: 'enemies', power: 24, description: 'Arcane barrage batters every enemy.', usableInCombat: true },
      APAR: { code: 'APAR', name: 'Apport Arcane', classType: 'Wizard', cost: 8, type: 'utility', target: 'none', description: 'Warps the party across space.', usableInCombat: false },

      SOSI: { code: 'SOSI', name: 'Soul Siphon', classType: 'Archmage', cost: 10, type: 'drain', target: 'enemy', power: 24, description: 'Steals vitality from an enemy and feeds the caster.', usableInCombat: true },
      MORT: { code: 'MORT', name: 'Mortal Blast', classType: 'Archmage', cost: 9, type: 'damage', target: 'enemy', power: 30, description: 'Pure destruction focused on one target.', usableInCombat: true },
      DEMI: { code: 'DEMI', name: 'Demi Armor', classType: 'Archmage', cost: 8, type: 'buff', target: 'party', duration: 3, modifiers: { ac: -3, magicResist: 20 }, description: 'Layers party in ethereal mail.', usableInCombat: true },
      SPTO: { code: 'SPTO', name: 'Spirit Touch', classType: 'Archmage', cost: 6, type: 'restore', target: 'ally', amount: 8, description: 'Restores spell points to a weary ally.', usableInCombat: true },
      WIZB: { code: 'WIZB', name: 'Wizard Bolt', classType: 'Archmage', cost: 8, type: 'damage', target: 'enemies', power: 26, description: 'Bolts of force slam every foe.', usableInCombat: true },
      BLAZ: { code: 'BLAZ', name: 'Blazing Star', classType: 'Archmage', cost: 10, type: 'damage', target: 'enemies', power: 32, description: 'A blazing star detonates in the enemy ranks.', usableInCombat: true },

      DELV: { code: 'DELV', name: 'Delayed Void', classType: 'Chronomancer', cost: 8, type: 'debuff', target: 'enemy', duration: 2, modifiers: { toHit: -3 }, description: 'Accelerates entropy around a foe.', usableInCombat: true },
      HAST: { code: 'HAST', name: 'Haste', classType: 'Chronomancer', cost: 7, type: 'buff', target: 'party', duration: 3, modifiers: { toHit: 2 }, description: 'Speeds the party, improving accuracy.', usableInCombat: true },
      SLOW: { code: 'SLOW', name: 'Slow Time', classType: 'Chronomancer', cost: 7, type: 'debuff', target: 'enemies', duration: 2, modifiers: { toHit: -2, damageBonus: -1 }, description: 'Slows enemies, dulling their strikes.', usableInCombat: true },
      TARD: { code: 'TARD', name: 'Temporal Dervish', classType: 'Chronomancer', cost: 9, type: 'damage', target: 'enemies', power: 24, description: 'Temporal blades rip through all foes.', usableInCombat: true },
      ROTL: { code: 'ROTL', name: 'Rotate Life', classType: 'Chronomancer', cost: 10, type: 'revive', target: 'ally', amount: 18, description: 'Turns back time on a fallen ally.', usableInCombat: true },
      DIVA: { code: 'DIVA', name: 'Divine Intervention', classType: 'Chronomancer', cost: 9, type: 'heal', target: 'party', amount: 20, description: 'Temporal plea mends grievous wounds.', usableInCombat: true },
      TIME: { code: 'TIME', name: 'Time Stop', classType: 'Chronomancer', cost: 11, type: 'debuff', target: 'enemies', duration: 1, modifiers: { stunned: true }, description: 'Freezes all enemies for a moment.', usableInCombat: true },
      STAS: { code: 'STAS', name: 'Stasis Field', classType: 'Chronomancer', cost: 8, type: 'buff', target: 'ally', duration: 2, modifiers: { ac: -4 }, description: 'Encases an ally in time-dilated protection.', usableInCombat: true },

      QUAK: { code: 'QUAK', name: 'Earthquake', classType: 'Geomancer', cost: 8, type: 'damage', target: 'enemies', power: 22, description: 'The ground heaves violently under every foe.', usableInCombat: true },
      STON: { code: 'STON', name: 'Stone Skin', classType: 'Geomancer', cost: 6, type: 'buff', target: 'party', duration: 3, modifiers: { ac: -3 }, description: 'Hardens skin to stone-like resilience.', usableInCombat: true },
      VINE: { code: 'VINE', name: 'Vine Snare', classType: 'Geomancer', cost: 6, type: 'debuff', target: 'enemy', duration: 2, modifiers: { stunned: true }, description: 'Thorny vines bind a target.', usableInCombat: true },
      LAVA: { code: 'LAVA', name: 'Lava Burst', classType: 'Geomancer', cost: 8, type: 'damage', target: 'enemy', power: 24, description: 'Lava erupts beneath a foe.', usableInCombat: true },
      SAND: { code: 'SAND', name: 'Sandstorm', classType: 'Geomancer', cost: 7, type: 'debuff', target: 'enemies', duration: 2, modifiers: { toHit: -2 }, description: 'Sand lashes enemies, blinding them.', usableInCombat: true },
      GAEA: { code: 'GAEA', name: "Gaia's Embrace", classType: 'Geomancer', cost: 8, type: 'heal', target: 'party', amount: 16, description: 'Nature\'s energy restores the party.', usableInCombat: true },
      TOXF: { code: 'TOXF', name: 'Toxic Fumes', classType: 'Geomancer', cost: 7, type: 'damage', target: 'enemies', power: 18, description: 'Poisonous vapors sap enemy vitality.', usableInCombat: true },
      BREA: { code: 'BREA', name: 'Breach Earth', classType: 'Geomancer', cost: 10, type: 'damage', target: 'enemy', power: 28, description: 'Jagged pillars erupt through an enemy.', usableInCombat: true },
    };

    const SONG_LIBRARY = {
      TRAV: { id: 'TRAV', name: "Traveler's Tune", type: 'buff', target: 'party', duration: 3, modifiers: { ac: -2 }, description: 'Calming melody reduces incoming blows.' },
      ROGU: { id: 'ROGU', name: "Rogue's March", type: 'buff', target: 'party', duration: 3, modifiers: { toHit: 1, damageBonus: 1 }, description: 'Rousing march sharpens blades and wits.' },
      SEEK: { id: 'SEEK', name: "Seeker's Ballad", type: 'buff', target: 'party', duration: 3, modifiers: { magicResist: 12 }, description: 'Haunting ballad steels minds against magic.' },
      WACH: { id: 'WACH', name: "Watchwood Melody", type: 'buff', target: 'party', duration: 3, modifiers: { ac: -1, toHit: 1 }, description: 'Forest melody heightens reflexes.' },
      DEST: { id: 'DEST', name: "Destiny's Dirge", type: 'heal', target: 'party', amount: 12, description: 'Somber dirge mends the weary.' },
      FALK: { id: 'FALK', name: "Falkentyne's Fury", type: 'buff', target: 'party', duration: 2, modifiers: { damageBonus: 3 }, description: 'Legendary anthem unleashes fierce strikes.' },
    };

    const ABILITY_LIBRARY = {
      warrior_power_strike: { id: 'warrior_power_strike', name: 'Power Strike', type: 'attack', damageBonus: 8, description: 'Overhand swing that adds significant damage.' },
      paladin_lay_on_hands: { id: 'paladin_lay_on_hands', name: 'Lay on Hands', type: 'heal', amount: 22, description: 'Restores an ally with a burst of holy light.' },
      rogue_backstab: { id: 'rogue_backstab', name: 'Backstab', type: 'attack', toHitBonus: 4, damageMultiplier: 2.5, description: 'Devastating strike against an unwary foe.' },
      hunter_aimed_shot: { id: 'hunter_aimed_shot', name: 'Aimed Shot', type: 'prep', duration: 2, modifiers: { critBonus: 0.3 }, description: 'Take careful aim to improve the next shot.' },
      monk_stunning_blow: { id: 'monk_stunning_blow', name: 'Stunning Blow', type: 'attack', damageBonus: 4, apply: { stunned: true, duration: 1 }, description: 'Chi-focused strike that may stun the target.' },
    };

    const ITEM_DB = {
      sword_basic: { id: 'sword_basic', name: 'Short Sword', slot: 'Weapon', minDamage: 2, maxDamage: 8, toHit: 1, acBonus: 0, magicRes: 0, weight: 3 },
      longsword: { id: 'longsword', name: 'Longsword', slot: 'Weapon', minDamage: 3, maxDamage: 9, toHit: 2, acBonus: 0, magicRes: 0, weight: 4 },
      dagger: { id: 'dagger', name: 'Dagger', slot: 'Weapon', minDamage: 1, maxDamage: 6, toHit: 2, acBonus: 0, magicRes: 0, weight: 1 },
      quarterstaff: { id: 'quarterstaff', name: 'Quarterstaff', slot: 'Weapon', minDamage: 2, maxDamage: 7, toHit: 1, acBonus: 0, magicRes: 0, weight: 3 },
      leather_armor: { id: 'leather_armor', name: 'Leather Armor', slot: 'Body', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: -1, magicRes: 0, weight: 5 },
      chain_armor: { id: 'chain_armor', name: 'Chain Armor', slot: 'Body', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: -2, magicRes: 0, weight: 7 },
      robes: { id: 'robes', name: 'Mystic Robes', slot: 'Body', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: 0, magicRes: 5, weight: 2 },
      shield_wood: { id: 'shield_wood', name: 'Wooden Shield', slot: 'Offhand', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: -1, magicRes: 0, weight: 3 },
      songbook: { id: 'songbook', name: 'Songbook', slot: 'Instrument', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: 0, magicRes: 0, weight: 1 },
      lute: { id: 'lute', name: 'Traveler\'s Lute', slot: 'Instrument', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: 0, magicRes: 0, weight: 1 },
      healing_potion: { id: 'healing_potion', name: 'Healing Potion', slot: 'Consumable', heals: 20, weight: 1 },
    };

    const MONSTER_DB = {
      serpent: { id: 'serpent', name: 'Cavern Serpent', hpMin: 6, hpMax: 12, ac: 9, toHit: 1, dmgMin: 2, dmgMax: 5, magicRes: 5, special: '' },
      rat_swarm: { id: 'rat_swarm', name: 'Rat Swarm', hpMin: 5, hpMax: 10, ac: 9, toHit: 0, dmgMin: 1, dmgMax: 4, magicRes: 0, special: 'swarm' },
      hobbit: { id: 'hobbit', name: 'Trickster Halfling', hpMin: 8, hpMax: 14, ac: 8, toHit: 2, dmgMin: 2, dmgMax: 6, magicRes: 10, special: 'backstab' },
      hobgoblin: { id: 'hobgoblin', name: 'Tunnel Hobgoblin', hpMin: 10, hpMax: 18, ac: 7, toHit: 3, dmgMin: 3, dmgMax: 7, magicRes: 12, special: 'war_cry' },
      skeleton: { id: 'skeleton', name: 'Restless Skeleton', hpMin: 9, hpMax: 16, ac: 7, toHit: 2, dmgMin: 3, dmgMax: 6, magicRes: 15, special: 'bone_chill' },
      monk: { id: 'monk', name: 'Ashen Monk', hpMin: 12, hpMax: 18, ac: 6, toHit: 3, dmgMin: 3, dmgMax: 8, magicRes: 20, special: 'stun_palm' },
      knight: { id: 'knight', name: 'Banished Knight', hpMin: 14, hpMax: 22, ac: 5, toHit: 4, dmgMin: 4, dmgMax: 9, magicRes: 18, special: 'shield_bash' },
      mage: { id: 'mage', name: 'Arcane Adept', hpMin: 12, hpMax: 18, ac: 8, toHit: 3, dmgMin: 3, dmgMax: 8, magicRes: 25, special: 'fire_bolt' },
      enchantress: { id: 'enchantress', name: 'Storm Enchantress', hpMin: 13, hpMax: 20, ac: 7, toHit: 4, dmgMin: 4, dmgMax: 9, magicRes: 28, special: 'chain_lightning' },
      warlock: { id: 'warlock', name: 'Void Warlock', hpMin: 14, hpMax: 22, ac: 6, toHit: 4, dmgMin: 4, dmgMax: 8, magicRes: 30, special: 'shadow_flame' },
      ogre: { id: 'ogre', name: 'Crag Ogre', hpMin: 18, hpMax: 28, ac: 6, toHit: 5, dmgMin: 5, dmgMax: 10, magicRes: 12, special: 'smash' },
      lich: { id: 'lich', name: 'Fallen Lich', hpMin: 18, hpMax: 28, ac: 4, toHit: 5, dmgMin: 4, dmgMax: 9, magicRes: 40, special: 'life_drain' },
      elemental: { id: 'elemental', name: 'Chaos Elemental', hpMin: 16, hpMax: 26, ac: 5, toHit: 4, dmgMin: 5, dmgMax: 9, magicRes: 35, special: 'elemental_burst' },
    };

    const ENCOUNTER_TABLES = [
      { maxDepth: 1, options: [
        { species: 'rat_swarm', min: 2, max: 5 },
        { species: 'serpent', min: 1, max: 3 },
        { species: 'hobbit', min: 1, max: 3 }
      ] },
      { maxDepth: 2, options: [
        { species: 'hobgoblin', min: 2, max: 4 },
        { species: 'skeleton', min: 2, max: 4 },
        { species: 'monk', min: 1, max: 3 }
      ] },
      { maxDepth: 3, options: [
        { species: 'knight', min: 1, max: 3 },
        { species: 'mage', min: 1, max: 2 },
        { species: 'ogre', min: 1, max: 2 }
      ] },
      { maxDepth: 4, options: [
        { species: 'enchantress', min: 1, max: 2 },
        { species: 'warlock', min: 1, max: 2 },
        { species: 'elemental', min: 1, max: 2 }
      ] },
      { maxDepth: Number.POSITIVE_INFINITY, options: [
        { species: 'lich', min: 1, max: 2 },
        { species: 'warlock', min: 1, max: 3 },
        { species: 'elemental', min: 1, max: 3 }
      ] },
    ];

    function abilityModifier(score) {
      return Math.floor((score - 10) / 2);
    }

    function getPortraitForClass(classType) {
      const def = CLASS_DATA[classType];
      return def?.portrait || '';
    }

    function getClassSpellList(classType) {
      const def = CLASS_DATA[classType];
      if (!def) return [];
      const combined = new Set(def.spellList || []);
      if (Array.isArray(def.inherits)) {
        for (const parent of def.inherits) {
          const parentDef = CLASS_DATA[parent];
          if (parentDef?.spellList) {
            for (const code of parentDef.spellList) combined.add(code);
          }
        }
      }
      return Array.from(combined);
    }

    function makeCharacter(id, name, classType, level = 1) {
      const def = CLASS_DATA[classType];
      if (!def) throw new Error(`Unknown class ${classType}`);
      const attrs = { ...def.baseAttributes };
      const conMod = abilityModifier(attrs.constitution);
      const intMod = abilityModifier(attrs.intelligence);
      const hpMax = def.hitDie + Math.max(0, conMod);
      const spMax = Math.max(0, def.spBase + Math.max(0, intMod * 2));
      return {
        id,
        name,
        classType,
        level,
        xp: 0,
        hpCurrent: hpMax,
        hpMax,
        spCurrent: spMax,
        spMax,
        attributes: attrs,
        base: {
          ac: def.baseAc,
          toHit: def.baseToHit + abilityModifier(attrs.dexterity),
          damage: { min: 1 + def.damageBonus + abilityModifier(attrs.strength), max: 6 + def.damageBonus + abilityModifier(attrs.strength) },
          magicResist: abilityModifier(attrs.luck) * 3,
        },
        inventory: [],
        equipment: { weapon: '', offhand: '', body: '', head: '', hands: '', feet: '', instrument: '', accessory: '' },
        statusEffects: [],
        knownSpells: getClassSpellList(classType),
        knownSongs: def.songs ? def.songs.slice() : [],
        abilityId: def.ability || '',
        portrait: def.portrait,
        description: def.description,
        alive: true,
      };
    }

    function ensureInventory(character) {
      if (!character.inventory) character.inventory = [];
    }

    function addItem(character, itemId, qty = 1) {
      ensureInventory(character);
      const existing = character.inventory.find((entry) => entry.itemId === itemId && !entry.equipped);
      if (existing) {
        existing.qty += qty;
      } else {
        character.inventory.push({ itemId, qty, equipped: false });
      }
    }

    function getItemDef(itemId) {
      return ITEM_DB[itemId] || null;
    }

    function equipItem(character, itemId) {
      const def = getItemDef(itemId);
      if (!def) return false;
      ensureInventory(character);
      const entry = character.inventory.find((item) => item.itemId === itemId && item.qty > 0);
      if (!entry) return false;
      entry.equipped = true;
      if (def.slot === 'Weapon') character.equipment.weapon = itemId;
      else if (def.slot === 'Offhand') character.equipment.offhand = itemId;
      else if (def.slot === 'Body') character.equipment.body = itemId;
      else if (def.slot === 'Instrument') character.equipment.instrument = itemId;
      return true;
    }

    function getEquippedItem(character, slot) {
      const id = character.equipment?.[slot];
      if (!id) return null;
      return getItemDef(id);
    }

    function computeCharacterStats(character) {
      const base = { ...character.base };
      let ac = base.ac;
      let toHit = base.toHit;
      let minDamage = base.damage.min;
      let maxDamage = base.damage.max;
      let magicRes = base.magicResist;
      const weapon = getEquippedItem(character, 'weapon');
      if (weapon) {
        if (typeof weapon.minDamage === 'number') minDamage = Math.max(minDamage, weapon.minDamage);
        if (typeof weapon.maxDamage === 'number') maxDamage = Math.max(maxDamage, weapon.maxDamage);
        if (typeof weapon.toHit === 'number') toHit += weapon.toHit;
      }
      const offhand = getEquippedItem(character, 'offhand');
      if (offhand?.acBonus) ac += offhand.acBonus;
      const body = getEquippedItem(character, 'body');
      if (body?.acBonus) ac += body.acBonus;
      if (body?.magicRes) magicRes += body.magicRes;
      const instrument = getEquippedItem(character, 'instrument');
      if (instrument?.magicRes) magicRes += instrument.magicRes;
      const statuses = character.statusEffects || [];
      let critBonus = 0;
      for (const status of statuses) {
        if (status?.modifiers?.ac) ac += status.modifiers.ac;
        if (status?.modifiers?.toHit) toHit += status.modifiers.toHit;
        if (status?.modifiers?.damageBonus) {
          minDamage += status.modifiers.damageBonus;
          maxDamage += status.modifiers.damageBonus;
        }
        if (status?.modifiers?.magicResist) magicRes += status.modifiers.magicResist;
        if (status?.modifiers?.critBonus) critBonus += status.modifiers.critBonus;
      }
      if (character.classType === 'Monk' && !getEquippedItem(character, 'body')) {
        ac -= Math.max(1, Math.floor(character.level / 2));
      }
      if (character.classType === 'Monk' && !weapon) {
        const scale = Math.max(4, 6 + character.level);
        minDamage = Math.max(minDamage, Math.floor(scale / 2));
        maxDamage = Math.max(maxDamage, scale);
      }
      return {
        ac,
        toHit,
        minDamage,
        maxDamage,
        magicRes,
        critBonus,
      };
    }

    function describeStatuses(entity) {
      if (!entity.statusEffects || !entity.statusEffects.length) return '';
      const parts = [];
      for (const status of entity.statusEffects) {
        if (status.duration && status.duration !== Infinity) {
          parts.push(`${status.name} (${status.duration})`);
        } else {
          parts.push(status.name);
        }
      }
      return parts.join(', ');
    }

    function applyStatus(target, status) {
      if (!target.statusEffects) target.statusEffects = [];
      const existingIndex = target.statusEffects.findIndex((s) => s.id === status.id);
      if (existingIndex >= 0) {
        target.statusEffects[existingIndex] = { ...target.statusEffects[existingIndex], ...status };
      } else {
        target.statusEffects.push({ ...status });
      }
    }

    function removeStatus(target, id) {
      if (!target.statusEffects) return;
      target.statusEffects = target.statusEffects.filter((status) => status.id !== id);
    }

    function tickStatuses(targets) {
      for (const entity of targets) {
        if (!entity?.statusEffects?.length) continue;
        const next = [];
        for (const status of entity.statusEffects) {
          if (status.duration === Infinity || typeof status.duration !== 'number') {
            next.push(status);
            continue;
          }
          if (status.duration > 1) {
            next.push({ ...status, duration: status.duration - 1 });
          } else if (status.onExpire) {
            status.onExpire(entity);
          }
        }
        entity.statusEffects = next;
      }
    }

    function hasStatus(entity, predicate) {
      if (!entity?.statusEffects?.length) return false;
      return entity.statusEffects.some(predicate);
    }

    function isUnableToAct(entity) {
      return hasStatus(entity, (status) => status.modifiers?.stunned);
    }

    function healTarget(target, amount) {
      if (!target.alive) return false;
      const before = target.hpCurrent;
      target.hpCurrent = Math.min(target.hpMax, target.hpCurrent + amount);
      return target.hpCurrent > before;
    }

    function reviveTarget(target, amount) {
      if (target.alive) return healTarget(target, amount);
      target.alive = true;
      target.hpCurrent = Math.max(1, Math.min(target.hpMax, amount));
      return true;
    }

    function spendSpellPoints(caster, cost) {
      if (caster.spCurrent < cost) return false;
      caster.spCurrent -= cost;
      return true;
    }

    const party = {
      id: 'p_main',
      name: 'Main Party',
      gold: 0,
      members: [
        makeCharacter('c_warrior', 'Brynn', 'Warrior'),
        makeCharacter('c_paladin', 'Ser Ana', 'Paladin'),
        makeCharacter('c_rogue', 'Shade', 'Rogue'),
        makeCharacter('c_bard', 'Lyre', 'Bard'),
        makeCharacter('c_chrono', 'Quint', 'Chronomancer'),
      ],
    };

    function setupStartingGear() {
      const [warrior, paladin, rogue, bard, chrono] = party.members;
      addItem(warrior, 'longsword'); equipItem(warrior, 'longsword');
      addItem(warrior, 'chain_armor'); equipItem(warrior, 'chain_armor');
      addItem(warrior, 'shield_wood'); equipItem(warrior, 'shield_wood');

      addItem(paladin, 'longsword'); equipItem(paladin, 'longsword');
      addItem(paladin, 'chain_armor'); equipItem(paladin, 'chain_armor');
      addItem(paladin, 'shield_wood'); equipItem(paladin, 'shield_wood');
      addItem(paladin, 'healing_potion', 2);

      addItem(rogue, 'dagger'); equipItem(rogue, 'dagger');
      addItem(rogue, 'leather_armor'); equipItem(rogue, 'leather_armor');
      addItem(rogue, 'healing_potion');

      addItem(bard, 'sword_basic'); equipItem(bard, 'sword_basic');
      addItem(bard, 'leather_armor'); equipItem(bard, 'leather_armor');
      addItem(bard, 'lute'); equipItem(bard, 'lute');

      addItem(chrono, 'quarterstaff'); equipItem(chrono, 'quarterstaff');
      addItem(chrono, 'robes'); equipItem(chrono, 'robes');
      addItem(chrono, 'healing_potion');
    }

    setupStartingGear();

    function renderParty() {
      const members = party.members.map((member) => {
        const stats = computeCharacterStats(member);
        return {
          id: member.id,
          name: member.name,
          classType: member.classType,
          level: member.level,
          hpCurrent: member.hpCurrent,
          hpMax: member.hpMax,
          spCurrent: member.spCurrent,
          spMax: member.spMax,
          ac: stats.ac,
          toHit: stats.toHit,
          damageMin: stats.minDamage,
          damageMax: stats.maxDamage,
          alive: member.alive,
          portrait: getPortraitForClass(member.classType) || member.portrait,
          attributes: member.attributes,
          statusText: describeStatuses(member),
        };
      });
      hud.setParty({ gold: party.gold, members });
    }

    function findPartyMember(id) {
      return party.members.find((member) => member.id === id) || null;
    }

    function livingPartyMembers() {
      return party.members.filter((member) => member.alive);
    }

    function livingMonsters(monsters) {
      return monsters.filter((monster) => monster.alive);
    }

    function makeMonster(speciesId, index) {
      const spec = MONSTER_DB[speciesId] || MONSTER_DB.serpent;
      const hp = roll(spec.hpMin, spec.hpMax);
      return {
        id: `${spec.id}_${index}`,
        name: spec.name,
        speciesId: spec.id,
        hpCurrent: hp,
        hpMax: hp,
        ac: spec.ac,
        toHit: spec.toHit,
        dmgMin: spec.dmgMin,
        dmgMax: spec.dmgMax,
        magicRes: spec.magicRes,
        special: spec.special,
        statusEffects: [],
        alive: true,
      };
    }

    function computeMonsterAttack(monster) {
      let toHit = monster.toHit;
      let minDamage = monster.dmgMin;
      let maxDamage = monster.dmgMax;
      const statuses = monster.statusEffects || [];
      for (const status of statuses) {
        if (status?.modifiers?.toHit) toHit += status.modifiers.toHit;
        if (status?.modifiers?.damageBonus) {
          minDamage += status.modifiers.damageBonus;
          maxDamage += status.modifiers.damageBonus;
        }
      }
      return { toHit, minDamage, maxDamage };
    }

    function monsterMagicResist(monster) {
      let resist = monster.magicRes || 0;
      if (monster.statusEffects) {
        for (const status of monster.statusEffects) {
          if (status?.modifiers?.magicResist) resist += status.modifiers.magicResist;
        }
      }
      return resist;
    }

    function generateEncounter(depth) {
      const tier = ENCOUNTER_TABLES.find((entry) => depth <= entry.maxDepth) || ENCOUNTER_TABLES[ENCOUNTER_TABLES.length - 1];
      const choices = tier.options.slice();
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      const groupCount = Math.min(choices.length, roll(1, 3));
      const groups = [];
      for (let i = 0; i < groupCount; i++) {
        const option = choices[i];
        groups.push({ species: option.species, count: roll(option.min, option.max) });
      }
      return {
        id: 'enc_' + Math.random().toString(36).slice(2),
        depth,
        canFlee: depth <= 4,
        groups,
      };
    }

    function startCombat(encounter) {
      const monsters = [];
      let index = 1;
      for (const group of encounter.groups) {
        for (let i = 0; i < group.count; i++) {
          monsters.push(makeMonster(group.species, index++));
        }
      }
      const leadSpecies = encounter.groups[0]?.species || '';
      if (leadSpecies) showEncounterArt(leadSpecies);
      if (typeof window !== 'undefined') window.__bt3_isCombatActive = true;
      log(`Encounter! ${monsters.length} ${(monsters.length === 1 ? 'foe' : 'foes')} approach.`);
      log('Awaiting party commands...');
      clearActions();
      return {
        encounter,
        round: 1,
        party: party.members,
        monsters,
        pendingActions: [],
        selectionOrder: [],
        selectionIndex: 0,
        ended: false,
        winner: '',
        fled: false,
      };
    }

    function hitCheck(attackerToHit, defenderAc) {
      const rollResult = Math.floor(Math.random() * 20) + 1;
      return { roll: rollResult, success: (rollResult + attackerToHit) >= defenderAc };
    }

    function applyPhysicalDamage(defender, amount) {
      defender.hpCurrent -= amount;
      if (defender.hpCurrent <= 0) {
        defender.hpCurrent = 0;
        defender.alive = false;
      }
    }

    function hunterCriticalChance(attacker, stats) {
      if (attacker.classType !== 'Hunter') return 0;
      const base = 0.1 + Math.max(0, abilityModifier(attacker.attributes.dexterity)) * 0.02;
      const statusBonus = stats.critBonus || 0;
      return Math.min(0.6, base + statusBonus);
    }

    function performAttack(attacker, defender, options = {}) {
      if (!attacker.alive) return { hit: false, damage: 0 };
      if (!defender?.alive) return { hit: false, damage: 0 };
      if (isUnableToAct(attacker)) {
        log(`${attacker.name} is unable to act!`);
        return { hit: false, damage: 0 };
      }
      const attackerStats = computeCharacterStats(attacker);
      let toHit = attackerStats.toHit + (options.toHitBonus || 0);
      let minDamage = attackerStats.minDamage + (options.damageBonus || 0);
      let maxDamage = attackerStats.maxDamage + (options.damageBonus || 0);
      const defenderStats = defender.base ? computeCharacterStats(defender) : null;
      const defenderAc = defender.base ? defenderStats.ac : defender.ac;
      const result = hitCheck(toHit, defenderAc);
      if (!result.success) {
        log(`${attacker.name} misses ${defender.name}.`);
        return { hit: false, damage: 0 };
      }
      let damage = roll(minDamage, maxDamage);
      if (attacker.classType === 'Rogue' && options.isBackstab) {
        damage = Math.floor(damage * (options.damageMultiplier || 2));
      }
      const critChance = hunterCriticalChance(attacker, attackerStats);
      if (critChance > 0 && Math.random() < critChance) {
        damage = Math.max(defender.hpCurrent, damage + Math.floor(maxDamage * 0.75));
        log(`${attacker.name} lands a critical hit on ${defender.name}!`);
      }
      applyPhysicalDamage(defender, damage);
      if (!defender.alive) {
        log(`${attacker.name} strikes down ${defender.name} for ${damage} damage.`);
      } else {
        log(`${attacker.name} hits ${defender.name} for ${damage} damage.`);
      }
      return { hit: true, damage };
    }

    function performMonsterAttack(monster, defender, options = {}) {
      if (!monster.alive || !defender?.alive) return { hit: false, damage: 0 };
      if (isUnableToAct(monster)) {
        log(`${monster.name} is held fast and cannot attack!`);
        return { hit: false, damage: 0 };
      }
      const stats = computeMonsterAttack(monster);
      const defenderStats = computeCharacterStats(defender);
      const result = hitCheck(stats.toHit + (options.toHitBonus || 0), defenderStats.ac);
      if (!result.success) {
        log(`${monster.name} misses ${defender.name}.`);
        return { hit: false, damage: 0 };
      }
      let damage = roll(stats.minDamage, stats.maxDamage);
      if (options.damageBonus) damage += options.damageBonus;
      applyPhysicalDamage(defender, damage);
      if (!defender.alive) {
        log(`${monster.name} slays ${defender.name} for ${damage} damage!`);
      } else {
        log(`${monster.name} hits ${defender.name} for ${damage} damage.`);
      }
      return { hit: true, damage };
    }

    function resolveTargetsForSpell(state, caster, spellDef, explicitTargetId) {
      const targets = [];
      if (spellDef.target === 'enemy') {
        let target = null;
        if (explicitTargetId) target = state.monsters.find((m) => m.id === explicitTargetId && m.alive);
        if (!target) target = livingMonsters(state.monsters)[0] || null;
        if (target) targets.push(target);
      } else if (spellDef.target === 'enemies') {
        targets.push(...livingMonsters(state.monsters));
      } else if (spellDef.target === 'ally') {
        let target = null;
        if (explicitTargetId) target = findPartyMember(explicitTargetId);
        if (!target) target = livingPartyMembers()[0] || null;
        if (target) targets.push(target);
      } else if (spellDef.target === 'party') {
        targets.push(...party.members);
      } else if (spellDef.target === 'self') {
        targets.push(caster);
      }
      return targets;
    }

    function applySpellDamage(caster, target, spellDef, powerBonus = 0) {
      const intBonus = abilityModifier(caster.attributes?.intelligence ?? 10);
      const base = spellDef.power + powerBonus + Math.max(0, intBonus * 2);
      const variance = Math.max(2, Math.floor(base * 0.25));
      const damage = Math.max(1, roll(base - variance, base + variance));
      if (target.base) {
        const resist = monsterMagicResist(target);
        if (!spellDef.ignoreArmor && Math.random() * 100 < resist) {
          log(`${target.name} resists ${spellDef.name}!`);
          return 0;
        }
      }
      applyPhysicalDamage(target, damage);
      return damage;
    }

    function castSpell(state, caster, spellCode, explicitTargetId) {
      const spellDef = SPELL_LIBRARY[spellCode];
      if (!spellDef) {
        log(`${caster.name} tries to cast an unknown spell.`);
        return false;
      }
      if (!spellDef.usableInCombat) {
        log(`${spellDef.name} cannot be used during combat.`);
        return false;
      }
      const targets = resolveTargetsForSpell(state, caster, spellDef, explicitTargetId);
      if (!targets.length && spellDef.target !== 'none') {
        log(`${spellDef.name} fizzles without a target.`);
        return false;
      }
      if (!spendSpellPoints(caster, spellDef.cost)) {
        log(`${caster.name} lacks the spell points to cast ${spellDef.name}.`);
        return false;
      }
      log(`${caster.name} casts ${spellDef.name}!`);
      let success = false;
      if (spellDef.type === 'damage' || spellDef.type === 'drain') {
        for (const target of targets) {
          const damage = applySpellDamage(caster, target, spellDef);
          if (damage > 0) {
            success = true;
            log(`${target.name} takes ${damage} damage from ${spellDef.name}.`);
            if (spellDef.type === 'drain') {
              const heal = Math.max(1, Math.floor(damage / 2));
              healTarget(caster, heal);
              log(`${caster.name} siphons ${heal} health.`);
            }
            if (!target.alive) {
              log(`${target.name} is defeated by ${spellDef.name}!`);
            }
          }
        }
      } else if (spellDef.type === 'heal') {
        for (const target of targets) {
          if (healTarget(target, spellDef.amount)) {
            success = true;
            log(`${target.name} recovers ${spellDef.amount} health.`);
          }
        }
      } else if (spellDef.type === 'revive') {
        for (const target of targets) {
          if (reviveTarget(target, spellDef.amount)) {
            success = true;
            log(`${target.name} is restored by ${spellDef.name}!`);
          }
        }
      } else if (spellDef.type === 'restore') {
        for (const target of targets) {
          const before = target.spCurrent;
          target.spCurrent = Math.min(target.spMax, target.spCurrent + spellDef.amount);
          if (target.spCurrent > before) {
            success = true;
            log(`${target.name} regains ${target.spCurrent - before} spell points.`);
          }
        }
      } else if (spellDef.type === 'buff' || spellDef.type === 'debuff') {
        for (const target of targets) {
          const status = {
            id: `spell_${spellDef.code}_${target.id}`,
            name: spellDef.name,
            duration: spellDef.duration ?? 0,
            modifiers: { ...spellDef.modifiers },
          };
          applyStatus(target, status);
          success = true;
          if (spellDef.duration) {
            log(`${target.name} is affected by ${spellDef.name} for ${spellDef.duration} rounds.`);
          } else {
            log(`${target.name} is affected by ${spellDef.name}.`);
          }
        }
      }
      return success;
    }

    function performSong(state, bard, songId) {
      const song = SONG_LIBRARY[songId];
      if (!song) {
        log(`${bard.name} does not recall that melody.`);
        return false;
      }
      if (!bard.equipment.instrument) {
        log(`${bard.name} fumbles without an instrument.`);
        return false;
      }
      log(`${bard.name} plays ${song.name}.`);
      let success = false;
      if (song.type === 'buff') {
        const targets = song.target === 'party' ? party.members : [bard];
        for (const target of targets) {
          const status = {
            id: `song_${song.id}_${target.id}`,
            name: song.name,
            duration: song.duration ?? 0,
            modifiers: { ...song.modifiers },
          };
          applyStatus(target, status);
          success = true;
        }
        if (song.duration) {
          log(`The party is inspired for ${song.duration} rounds.`);
        }
      } else if (song.type === 'heal') {
        const targets = song.target === 'party' ? party.members : [bard];
        for (const target of targets) {
          if (healTarget(target, song.amount)) success = true;
        }
        if (success) log('Wounds knit as the song crescendos.');
      } else if (song.type === 'debuff') {
        const targets = livingMonsters(state.monsters);
        for (const target of targets) {
          const status = {
            id: `song_${song.id}_${target.id}`,
            name: song.name,
            duration: song.duration ?? 0,
            modifiers: { ...song.modifiers },
          };
          applyStatus(target, status);
          success = true;
        }
        if (success) log('Enemies falter under the melody.');
      }
      return success;
    }

    function useAbility(state, actor, abilityId, targetId) {
      const ability = ABILITY_LIBRARY[abilityId];
      if (!ability) {
        log(`${actor.name} tries a technique they have not mastered.`);
        return false;
      }
      if (ability.type === 'attack') {
        let target = null;
        if (targetId) target = state.monsters.find((m) => m.id === targetId && m.alive);
        if (!target) target = livingMonsters(state.monsters)[0] || null;
        if (!target) {
          log(`${actor.name} has no target for ${ability.name}.`);
          return false;
        }
        const options = {
          toHitBonus: ability.toHitBonus || 0,
          damageBonus: ability.damageBonus || 0,
          isBackstab: abilityId === 'rogue_backstab',
          damageMultiplier: ability.damageMultiplier || 1,
        };
        const result = performAttack(actor, target, options);
        if (result.hit && ability.apply?.stunned && target.alive) {
          applyStatus(target, { id: `ability_${ability.id}_${target.id}`, name: ability.name, duration: ability.apply.duration || 1, modifiers: { stunned: true } });
          log(`${target.name} is stunned!`);
        }
        return result.hit;
      }
      if (ability.type === 'heal') {
        let target = null;
        if (targetId) target = findPartyMember(targetId);
        if (!target) target = actor;
        if (!target) return false;
        if (reviveTarget(target, ability.amount)) {
          log(`${actor.name} uses ${ability.name} on ${target.name}.`);
          return true;
        }
        return false;
      }
      if (ability.type === 'prep') {
        applyStatus(actor, {
          id: `ability_${ability.id}_${actor.id}`,
          name: ability.name,
          duration: ability.duration ?? 1,
          modifiers: { ...(ability.modifiers || {}) },
        });
        log(`${actor.name} prepares with ${ability.name}.`);
        return true;
      }
      return false;
    }

    function monsterSpecialAction(state, monster) {
      if (!monster.special || Math.random() > 0.35) return false;
      const target = livingPartyMembers()[0];
      if (!target) return false;
      switch (monster.special) {
        case 'swarm': {
          log(`${monster.name} swarms over ${target.name}!`);
          const result = performMonsterAttack(monster, target, { damageBonus: 2 });
          if (result.hit) performMonsterAttack(monster, target, { damageBonus: 1 });
          return true;
        }
        case 'backstab': {
          log(`${monster.name} darts behind ${target.name}!`);
          performMonsterAttack(monster, target, { toHitBonus: 3, damageBonus: 3 });
          return true;
        }
        case 'war_cry': {
          log(`${monster.name} unleashes a war cry!`);
          for (const hero of livingPartyMembers()) {
            applyStatus(hero, { id: `debuff_war_cry_${hero.id}`, name: 'War Cry', duration: 2, modifiers: { toHit: -1 } });
          }
          return true;
        }
        case 'bone_chill': {
          log(`${monster.name} exhales bone-chilling frost!`);
          for (const hero of livingPartyMembers()) {
            applyStatus(hero, { id: `bone_chill_${hero.id}`, name: 'Bone Chill', duration: 2, modifiers: { ac: 1 } });
          }
          return true;
        }
        case 'stun_palm': {
          log(`${monster.name} attempts a stunning palm!`);
          const result = performMonsterAttack(monster, target, { toHitBonus: 2 });
          if (result.hit && target.alive) {
            applyStatus(target, { id: `stun_${monster.id}`, name: 'Stunned', duration: 1, modifiers: { stunned: true } });
            log(`${target.name} is stunned!`);
          }
          return true;
        }
        case 'shield_bash': {
          log(`${monster.name} bashes ${target.name} with a shield!`);
          const result = performMonsterAttack(monster, target, { damageBonus: 2 });
          if (result.hit && target.alive) {
            applyStatus(target, { id: `bash_${monster.id}`, name: 'Dazed', duration: 2, modifiers: { toHit: -1 } });
          }
          return true;
        }
        case 'fire_bolt': {
          const spell = SPELL_LIBRARY.ARFI;
          if (spell) castSpell(state, monster, 'ARFI', target.id);
          return true;
        }
        case 'chain_lightning': {
          log(`${monster.name} hurls chain lightning!`);
          for (const hero of livingPartyMembers()) {
            const damage = roll(8, 16);
            applyPhysicalDamage(hero, damage);
            log(`${hero.name} is shocked for ${damage} damage.`);
          }
          return true;
        }
        case 'shadow_flame': {
          log(`${monster.name} conjures shadow flame!`);
          const damage = roll(12, 20);
          applyPhysicalDamage(target, damage);
          log(`${target.name} is scorched for ${damage}.`);
          if (target.spCurrent > 0) {
            target.spCurrent = Math.max(0, target.spCurrent - 4);
            log(`${target.name}'s spell energy is drained.`);
          }
          return true;
        }
        case 'smash': {
          log(`${monster.name} smashes the ground!`);
          for (const hero of livingPartyMembers()) {
            const result = hitCheck(monster.toHit + 2, computeCharacterStats(hero).ac);
            if (result.success) {
              const damage = roll(monster.dmgMin + 2, monster.dmgMax + 4);
              applyPhysicalDamage(hero, damage);
              log(`${hero.name} suffers ${damage} damage from the quake.`);
            }
          }
          return true;
        }
        case 'life_drain': {
          log(`${monster.name} drains life from ${target.name}!`);
          const damage = roll(10, 18);
          applyPhysicalDamage(target, damage);
          healTarget(monster, Math.max(4, Math.floor(damage / 2)));
          log(`${monster.name} is reinvigorated.`);
          return true;
        }
        case 'elemental_burst': {
          log(`${monster.name} detonates elemental energy!`);
          const heroes = livingPartyMembers();
          for (const hero of heroes) {
            const damage = roll(9, 15);
            applyPhysicalDamage(hero, damage);
            log(`${hero.name} is blasted for ${damage}.`);
          }
          return true;
        }
        default:
          return false;
      }
    }

    function concludeCombat(state) {
      if (state.__concluded) return;
      state.__concluded = true;
      const partyVictory = state.winner === 'Party' && !state.fled;
      if (partyVictory) {
        showEncounterArt('treasure');
        if (typeof window !== 'undefined') {
          postVictoryTimer = window.setTimeout(() => hideEncounterArt(), 2000);
        }
        const gold = roll(12, 28) + state.encounter.depth * 6;
        party.gold += gold;
        log(`The party claims ${gold} gold.`);
        if (Math.random() < 0.35) {
          addItem(party.members[0], 'healing_potion');
          log('A spare healing potion is recovered.');
        }
      } else {
        hideEncounterArt();
      }
      if (typeof window !== 'undefined') window.__bt3_isCombatActive = false;
      log(`Combat ends. Winner: ${state.winner}.`);
      for (const hero of party.members) {
        hero.statusEffects = hero.statusEffects.filter((status) => status.persistent);
      }
      clearActions();
      renderParty();
      endCombatCleanup({ preserveEncounterArt: partyVictory });
    }

    function monstersAct(state) {
      const livingHeroes = livingPartyMembers();
      const livingFoes = livingMonsters(state.monsters);
      if (!livingHeroes.length || !livingFoes.length) return;
      for (const monster of livingFoes) {
        if (!monster.alive) continue;
        if (monsterSpecialAction(state, monster)) {
          if (!livingPartyMembers().length) break;
          continue;
        }
        const target = livingPartyMembers()[0];
        if (!target) break;
        performMonsterAttack(monster, target);
        if (!livingPartyMembers().length) break;
      }
    }

    function attemptFlee(state, actor) {
      if (!state.encounter.canFlee) {
        log('Escape is impossible!');
        return false;
      }
      const chance = 0.45 + state.encounter.depth * 0.05;
      if (Math.random() < chance) {
        log(`${actor.name} signals a retreat!`);
        state.ended = true;
        state.winner = 'Party';
        state.fled = true;
        concludeCombat(state);
        return true;
      }
      log(`${actor.name} fails to escape!`);
      return false;
    }

    function resolvePendingActions(state) {
      clearActions();
      if (state.ended) return;
      for (const action of state.pendingActions) {
        const actor = findPartyMember(action.actorId);
        if (!actor || !actor.alive) continue;
        if (action.type === 'attack') {
          const target = state.monsters.find((m) => m.id === action.targetId && m.alive);
          if (target) performAttack(actor, target);
        } else if (action.type === 'spell') {
          castSpell(state, actor, action.spellCode, action.targetId);
        } else if (action.type === 'song') {
          performSong(state, actor, action.songId);
        } else if (action.type === 'ability') {
          useAbility(state, actor, action.abilityId, action.targetId);
        } else if (action.type === 'flee') {
          if (attemptFlee(state, actor)) return;
        }
        renderParty();
      }
      state.pendingActions = [];
      if (!livingMonsters(state.monsters).length) {
        state.ended = true;
        state.winner = 'Party';
        concludeCombat(state);
        return;
      }
      if (!livingPartyMembers().length) {
        state.ended = true;
        state.winner = 'Monsters';
        concludeCombat(state);
        return;
      }
      monstersAct(state);
      renderParty();
      if (!livingPartyMembers().length) {
        state.ended = true;
        state.winner = 'Monsters';
        concludeCombat(state);
        return;
      }
      state.round += 1;
      tickStatuses(state.party);
      tickStatuses(state.monsters);
      renderParty();
      // Let the narration finish before prompting the next round of commands.
      waitForLogIdle().then(() => {
        if (state.ended) return;
        setTimeout(() => {
          if (!state.ended) beginPlayerPhase(state);
        }, 150);
      });
    }

    function queueAction(state, action) {
      state.pendingActions.push(action);
    }

    function promptAttackTargets(state, actor, config = {}) {
      const monsters = livingMonsters(state.monsters);
      if (!monsters.length) {
        state.selectionIndex += 1;
        promptNextAction(state);
        return;
      }
      const buttons = monsters.map((monster, idx) => ({
        label: `${monster.name} (${monster.hpCurrent}/${monster.hpMax})`,
        hotkey: String(idx + 1),
        onSelect: () => {
          if (config.actionType === 'ability' && config.abilityId) {
            queueAction(state, { type: 'ability', actorId: actor.id, abilityId: config.abilityId, targetId: monster.id });
          } else {
            queueAction(state, { type: 'attack', actorId: actor.id, targetId: monster.id });
          }
          state.selectionIndex += 1;
          promptNextAction(state);
        },
      }));
      buttons.push({ label: 'Back', hotkey: '0', onSelect: () => (config.onCancel ? config.onCancel() : promptMainAction(state, actor)) });
      hud.setActions({
        prompt: `Choose target for ${actor.name}`,
        buttons,
        active: { id: actor.id, portrait: actor.portrait, heading: `${actor.name} — ${actor.classType}`, details: 'Select a foe to strike.' },
      });
    }

    function promptSpellTarget(state, actor, spellDef) {
      const needsEnemy = spellDef.target === 'enemy';
      const needsAlly = spellDef.target === 'ally';
      if (needsEnemy) {
        const monsters = livingMonsters(state.monsters);
        const buttons = monsters.map((monster, idx) => ({
          label: `${monster.name} (${monster.hpCurrent}/${monster.hpMax})`,
          hotkey: String(idx + 1),
          onSelect: () => {
            queueAction(state, { type: 'spell', actorId: actor.id, spellCode: spellDef.code, targetId: monster.id });
            state.selectionIndex += 1;
            promptNextAction(state);
          },
        }));
        buttons.push({ label: 'Back', hotkey: '0', onSelect: () => promptSpellSelect(state, actor) });
        hud.setActions({
          prompt: `Target for ${spellDef.name}`,
          buttons,
          active: { id: actor.id, portrait: actor.portrait, heading: `${actor.name} — ${actor.classType}`, details: spellDef.description },
        });
        return;
      }
      if (needsAlly) {
        const allies = party.members;
        const buttons = allies.map((ally, idx) => ({
          label: `${ally.name} (${ally.hpCurrent}/${ally.hpMax})${ally.alive ? '' : ' [KO]'}`,
          hotkey: String(idx + 1),
          onSelect: () => {
            queueAction(state, { type: 'spell', actorId: actor.id, spellCode: spellDef.code, targetId: ally.id });
            state.selectionIndex += 1;
            promptNextAction(state);
          },
        }));
        buttons.push({ label: 'Back', hotkey: '0', onSelect: () => promptSpellSelect(state, actor) });
        hud.setActions({
          prompt: `Target for ${spellDef.name}`,
          buttons,
          active: { id: actor.id, portrait: actor.portrait, heading: `${actor.name} — ${actor.classType}`, details: spellDef.description },
        });
        return;
      }
      queueAction(state, { type: 'spell', actorId: actor.id, spellCode: spellDef.code });
      state.selectionIndex += 1;
      promptNextAction(state);
    }

    function promptSpellSelect(state, actor) {
      const spells = (actor.knownSpells || []).map((code) => SPELL_LIBRARY[code]).filter((spell) => spell?.usableInCombat);
      if (!spells.length) {
        log(`${actor.name} has no combat-ready spells.`);
        state.selectionIndex += 1;
        promptNextAction(state);
        return;
      }
      const buttons = spells.map((spell, idx) => ({
        label: `${spell.code} ${spell.name} (SP ${spell.cost})`,
        hotkey: String(idx + 1),
        onSelect: () => {
          promptSpellTarget(state, actor, spell);
        },
      }));
      buttons.push({ label: 'Back', hotkey: '0', onSelect: () => promptMainAction(state, actor) });
      hud.setActions({
        prompt: `Cast which spell?`,
        buttons,
        active: { id: actor.id, portrait: actor.portrait, heading: `${actor.name} — ${actor.classType}`, details: `Spell Points: ${actor.spCurrent}/${actor.spMax}` },
      });
    }

    function promptSongSelect(state, actor) {
      const songs = actor.knownSongs || [];
      if (!songs.length) {
        log(`${actor.name} knows no useful songs.`);
        state.selectionIndex += 1;
        promptNextAction(state);
        return;
      }
      const buttons = songs.map((songId, idx) => {
        const song = SONG_LIBRARY[songId];
        return {
          label: `${song.name}`,
          hotkey: String(idx + 1),
          onSelect: () => {
            queueAction(state, { type: 'song', actorId: actor.id, songId });
            state.selectionIndex += 1;
            promptNextAction(state);
          },
        };
      });
      buttons.push({ label: 'Back', hotkey: '0', onSelect: () => promptMainAction(state, actor) });
      hud.setActions({
        prompt: 'Choose a melody',
        buttons,
        active: { id: actor.id, portrait: actor.portrait, heading: `${actor.name} — ${actor.classType}`, details: actor.description },
      });
    }

    function promptAbilitySelect(state, actor) {
      const ability = ABILITY_LIBRARY[actor.abilityId];
      if (!ability) {
        log(`${actor.name} has no special ability ready.`);
        state.selectionIndex += 1;
        promptNextAction(state);
        return;
      }
      if (ability.type === 'attack') {
        promptAttackTargets(state, actor, { actionType: 'ability', abilityId: ability.id, onCancel: () => promptMainAction(state, actor) });
        return;
      }
      if (ability.type === 'heal') {
        const allies = party.members;
        const buttons = allies.map((ally, idx) => ({
          label: `${ally.name} (${ally.hpCurrent}/${ally.hpMax})${ally.alive ? '' : ' [KO]'}`,
          hotkey: String(idx + 1),
          onSelect: () => {
            queueAction(state, { type: 'ability', actorId: actor.id, abilityId: ability.id, targetId: ally.id });
            state.selectionIndex += 1;
            promptNextAction(state);
          },
        }));
        buttons.push({ label: 'Back', hotkey: '0', onSelect: () => promptMainAction(state, actor) });
        hud.setActions({
          prompt: `Use ${ability.name} on whom?`,
          buttons,
          active: { id: actor.id, portrait: actor.portrait, heading: `${actor.name} — ${actor.classType}`, details: ability.description },
        });
        return;
      }
      queueAction(state, { type: 'ability', actorId: actor.id, abilityId: ability.id });
      state.selectionIndex += 1;
      promptNextAction(state);
    }

    function promptMainAction(state, actor) {
      const buttons = [];
      let optionIndex = 1;
      if (livingMonsters(state.monsters).length) {
        buttons.push({ label: 'Attack', hotkey: String(optionIndex++), onSelect: () => promptAttackTargets(state, actor) });
      }
      if ((actor.knownSpells || []).some((code) => SPELL_LIBRARY[code]?.usableInCombat) && actor.spCurrent > 0) {
        buttons.push({ label: 'Cast Spell', hotkey: String(optionIndex++), onSelect: () => promptSpellSelect(state, actor) });
      }
      if ((actor.knownSongs || []).length) {
        buttons.push({ label: 'Sing', hotkey: String(optionIndex++), onSelect: () => promptSongSelect(state, actor) });
      }
      if (actor.abilityId) {
        buttons.push({ label: 'Use Ability', hotkey: String(optionIndex++), onSelect: () => promptAbilitySelect(state, actor) });
      }
      if (state.encounter.canFlee) {
        buttons.push({ label: 'Flee', hotkey: String(optionIndex++), onSelect: () => {
          queueAction(state, { type: 'flee', actorId: actor.id });
          state.selectionIndex += 1;
          promptNextAction(state);
        }});
      }
      buttons.push({ label: 'Pass', hotkey: String(optionIndex++), onSelect: () => {
        state.selectionIndex += 1;
        promptNextAction(state);
      }});
      hud.setActions({
        prompt: `Round ${state.round}: ${actor.name}`,
        buttons,
        active: { id: actor.id, portrait: actor.portrait, heading: `${actor.name} — ${actor.classType}`, details: actor.description },
      });
    }

    function promptNextAction(state) {
      if (state.selectionIndex >= state.selectionOrder.length) {
        resolvePendingActions(state);
        return;
      }
      const entry = state.selectionOrder[state.selectionIndex];
      const actor = findPartyMember(entry.id);
      if (!actor || !actor.alive) {
        state.selectionIndex += 1;
        promptNextAction(state);
        return;
      }
      if (isUnableToAct(actor)) {
        log(`${actor.name} is incapacitated and misses a turn.`);
        state.selectionIndex += 1;
        promptNextAction(state);
        return;
      }
      promptMainAction(state, actor);
    }

    function beginPlayerPhase(state) {
      if (state.ended) return;
      state.selectionOrder = livingPartyMembers().map((member) => ({ id: member.id }));
      state.selectionIndex = 0;
      state.pendingActions = [];
      log(`-- Round ${state.round} --`);
      renderParty();
      if (!state.selectionOrder.length) {
        resolvePendingActions(state);
        return;
      }
      promptNextAction(state);
    }

    let stepsSinceEncounter = 0;
    let inCombat = false;
    let combatState = null;

    function beginEncounter(depth) {
      const encounter = generateEncounter(depth);
      combatState = startCombat(encounter);
      inCombat = true;
      renderParty();
      const stateRef = combatState;
      // Delay the command phase until the opening narration finishes scrolling.
      waitForLogIdle().then(() => {
        if (!stateRef || stateRef.ended || combatState !== stateRef) return;
        setTimeout(() => {
          if (combatState === stateRef && !stateRef.ended) beginPlayerPhase(stateRef);
        }, 150);
      });
    }

    function maybeEncounter(depth) {
      if (inCombat) return;
      stepsSinceEncounter += 1;
      const threshold = Math.max(1, 4 - Math.min(depth, 3));
      if (stepsSinceEncounter >= threshold) {
        const chance = 0.35 + depth * 0.08;
        if (Math.random() < chance) {
          stepsSinceEncounter = 0;
          beginEncounter(depth);
        }
      }
    }

    function endCombatCleanup({ preserveEncounterArt = false } = {}) {
      inCombat = false;
      combatState = null;
      if (!preserveEncounterArt) {
        hideEncounterArt();
      }
    }

    renderParty();

    if (typeof window !== 'undefined') {
      window.__bt3_onStepComplete = function(depth) {
        const d = (typeof depth === 'number' && depth > 0) ? depth : 1;
        maybeEncounter(d);
      };
    }

    if (billboard && typeof billboard.sync === 'function') {
      billboard.sync();
    }
  });
})();

