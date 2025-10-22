import { createBeeper } from '../shared/audio/beeper.js';
import { createDPad } from '../shared/input/dpad.js';
import { createPixelContext } from '../shared/render/pixelCanvas.js';
import { initGameCrt } from '../shared/ui/gameCrt.js';
import { createOverlayFX } from '../shared/fx/overlay.js';
import {
  DEFAULT_TILE_SIZE,
  createDefaultCrtSettings,
} from '../shared/config/display.js';
import { createScreenViewport } from '../shared/render/screenViewport.js';
import { createFpsCounter } from '../shared/utils/fpsCounter.js';

(() => {
  const canvas = document.getElementById('game');
  const pixel = createPixelContext(canvas, { alpha: false });
  const { ctx, fillRect: fillPixels } = pixel;

  const crtSettings = createDefaultCrtSettings();
  const { post: crtPost } = initGameCrt({
    storageKey: 'snake_crt_settings',
    settings: crtSettings,
    targetContext: ctx,
  });

  // Grid config
  const COLS = 32;
  const ROWS = 24;
  const TILE = DEFAULT_TILE_SIZE; // shared pixel density across games

  pixel.resizeToGrid(COLS, ROWS, TILE);
  createScreenViewport({
    canvas,
    css: {
      scale: 3.2,
      minWidth: 600,
      maxWidth: 1120,
    },
  });
  const { startIris, drawIris, setBounds } = createOverlayFX({ ctx, width: canvas.width, height: canvas.height });

  // Colors (retro green phosphor vibe)
  const COLORS = {
    bg: '#000312',
    grid: 'rgba(18, 32, 78, 0.16)',
    snake: '#ffe12b',
    snakeHead: '#fff59a',
    snakeEye: '#0a1230',
    food: '#ff7b1f',
    foodStem: '#ffd05a',
    terrainBase: '#0b1030',
    terrainTop: '#1f33ff',
    terrainHighlight: 'rgba(98, 149, 255, 0.45)'
  };

  // HUD elements
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const fpsEl = document.getElementById('fps');

  // Audio helper shared across games
  const beeper = createBeeper({ masterGain: 0.12 });
  beeper.unlockWithGestures();
  const crashTone = beeper.createPreset({ freq: 90, dur: 0.2, type: 'sawtooth', gain: 0.05 });
  const eatTone = beeper.createPreset({ freq: 560, dur: 0.06, type: 'square', gain: 0.03 });

  // Game state
  const { mask: terrainMask, tiles: terrainTiles } = buildTerrain(); // fixed obstacles + drawing helpers

  let snake, dir, nextDir, food, score, high, alive, paused;
  let lastTime = 0, acc = 0;
  let stepPerSec = 12; // ticks per second
  let stepMs = 1000 / stepPerSec;
  const fpsCounter = createFpsCounter({
    element: fpsEl,
    intervalMs: 500,
    formatter: (fps) => ` ${fps} FPS`,
  });

  function init() {
    const startLen = 4;
    const startX = Math.floor(COLS * 0.25);
    const startY = Math.floor(ROWS / 2);
    snake = Array.from({ length: startLen }, (_, i) => ({
      x: startX - i,
      y: startY
    }));
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food = spawnFood();
    score = 0;
    alive = true;
    paused = false;
    scoreEl.textContent = String(score);
    high = Number(localStorage.getItem('snake_crt_high') || '0');
    highEl.textContent = String(high);
    startIris('in', 900);
  }

  function spawnFood() {
    while (true) {
      const x = (Math.random() * COLS) | 0;
      const y = (Math.random() * ROWS) | 0;
      if (terrainMask[y][x]) continue;
      if (!snake || !snake.some(s => s.x === x && s.y === y)) return { x, y };
    }
  }

  function setDir(nx, ny) {
    // prevent 180° turn
    if (nx === -dir.x && ny === -dir.y) return;
    nextDir = { x: nx, y: ny };
  }

  // Inputs via shared D-pad helper
  const dpad = createDPad({ preventDefault: true, pauseKeys: [' ', 'spacebar'], restartKeys: ['r'] });
  dpad.onDirectionChange((dir) => {
    if (!dir) return; // releases simply yield null
    if (dir === 'left') setDir(-1, 0);
    else if (dir === 'right') setDir(1, 0);
    else if (dir === 'up') setDir(0, -1);
    else if (dir === 'down') setDir(0, 1);
  });
  dpad.onPause(() => { paused = !paused; beeper.resume(); });
  dpad.onRestart(() => { beeper.resume(); init(); });

  function update() {
    if (!alive || paused) return;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision (solid)
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      if (handleCrash()) return;
    }

    if (terrainMask[head.y][head.x]) {
      if (handleCrash()) return;
    }

    // Self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      if (handleCrash()) return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      // Eat
      score += 1;
      scoreEl.textContent = String(score);
      if (score > high) { high = score; localStorage.setItem('snake_crt_high', String(high)); highEl.textContent = String(high); }
      food = spawnFood();
      eatTone();
      // Optional slight speed-up over time
      if (score % 5 === 0 && stepPerSec < 20) { stepPerSec += 1; stepMs = 1000 / stepPerSec; }
    } else {
      snake.pop();
    }
  }

  function drawBG() {
    // Fill background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * TILE + 0.5, 0);
      ctx.lineTo(x * TILE + 0.5, ROWS * TILE);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * TILE + 0.5);
      ctx.lineTo(COLS * TILE, y * TILE + 0.5);
    }
    ctx.stroke();
  }

  function drawTerrain() {
    // Render fixed obstacles so they read like Pac-Man style maze walls
    for (const { x, y } of terrainTiles) {
      const px = x * TILE;
      const py = y * TILE;
      fillPixels(px, py, TILE, TILE, COLORS.terrainBase);
      fillPixels(px + 1, py + 1, TILE - 2, TILE - 2, COLORS.terrainTop);
      fillPixels(
        px + 2,
        py + 1,
        Math.max(1, TILE - 4),
        Math.max(1, Math.floor(TILE / 4)),
        COLORS.terrainHighlight
      );
    }
  }

  function drawSnake() {
    // Body
    for (let i = snake.length - 1; i >= 1; i--) {
      const s = snake[i];
      ctx.fillStyle = COLORS.snake;
      ctx.fillRect(s.x * TILE, s.y * TILE, TILE, TILE);
    }
    // Head with brighter tint and tiny eyes
    const h = snake[0];
    ctx.fillStyle = COLORS.snakeHead;
    ctx.fillRect(h.x * TILE, h.y * TILE, TILE, TILE);
    // Eyes
    const eye = Math.max(1, Math.floor(TILE / 4));
    const off = Math.max(1, Math.floor(TILE / 6));
    if (dir.x === 1) { // right
      fillPixels(h.x * TILE + TILE - eye - off, h.y * TILE + off, eye, eye, COLORS.snakeEye);
      fillPixels(h.x * TILE + TILE - eye - off, h.y * TILE + TILE - eye - off, eye, eye, COLORS.snakeEye);
    } else if (dir.x === -1) { // left
      fillPixels(h.x * TILE + off, h.y * TILE + off, eye, eye, COLORS.snakeEye);
      fillPixels(h.x * TILE + off, h.y * TILE + TILE - eye - off, eye, eye, COLORS.snakeEye);
    } else if (dir.y === 1) { // down
      fillPixels(h.x * TILE + off, h.y * TILE + TILE - eye - off, eye, eye, COLORS.snakeEye);
      fillPixels(h.x * TILE + TILE - eye - off, h.y * TILE + TILE - eye - off, eye, eye, COLORS.snakeEye);
    } else { // up
      fillPixels(h.x * TILE + off, h.y * TILE + off, eye, eye, COLORS.snakeEye);
      fillPixels(h.x * TILE + TILE - eye - off, h.y * TILE + off, eye, eye, COLORS.snakeEye);
    }
  }

  function drawFood() {
    const px = food.x * TILE; const py = food.y * TILE;
    // body
    fillPixels(px + 2, py + 2, TILE - 4, TILE - 4, COLORS.food);
    // stem
    fillPixels(px + Math.floor(TILE / 2) - 1, py + 0, 2, 3, COLORS.foodStem);
    // highlight
    fillPixels(px + 2, py + 2, 2, 2, '#fff7');
  }

  function drawGameOver() {
    const msg = 'GAME OVER';
    drawLabel(msg, canvas.width/2, canvas.height/2 - 8, '#fbb');
    drawLabel('Press R to restart', canvas.width/2, canvas.height/2 + 14, '#cfe');
  }

  function drawPaused() {
    drawLabel('PAUSED', canvas.width/2, canvas.height/2, '#cfe');
  }

  function drawLabel(text, cx, cy, color) {
    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 5, 20, 0.85)';
    ctx.fillRect(cx - 80, cy - 10, 160, 20);
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(110, 190, 255, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, cx, cy);
    ctx.restore();
  }

  function frame(t) {
    if (!lastTime) { lastTime = t; }
    const dt = t - lastTime; lastTime = t;
    acc += dt;
    fpsCounter.frame(t);

    while (acc >= stepMs) { acc -= stepMs; update(); }

    // Draw
    drawBG();
    drawTerrain();
    drawFood();
    drawSnake();

    if (!alive) drawGameOver();
    else if (paused) drawPaused();

    // Apply CRT post-processing after drawing the frame.
    crtPost.render();
    setBounds({ width: canvas.width, height: canvas.height });
    drawIris();

    requestAnimationFrame(frame);
  }

  init();
  requestAnimationFrame(frame);

  function handleCrash() {
    // Centralized crash handling keeps collision branches consistent.
    alive = false;
    crashTone();
    startIris('out', 900);
    return true;
  }

  function buildTerrain() {
    // Build a light-touch obstacle layout so the arena stays mostly open.
    // This prevents unavoidable deaths at spawn while keeping a few landmarks
    // for visual interest and pathing variety.
    const mask = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
    const tiles = [];

    const mark = (x, y) => {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
      if (mask[y][x]) return;
      mask[y][x] = 1;
      tiles.push({ x, y });
    };

    const addRect = (x, y, w, h) => {
      for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
          mark(x + ix, y + iy);
        }
      }
    };

    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(ROWS / 2);

    // Small center diamond
    addRect(midX - 1, midY - 1, 2, 2);

    // Two short vertical pillars placed far from the spawn lane (left side)
    addRect(4, 6, 1, 4);
    addRect(4, ROWS - 10, 1, 4);

    // Mirror the pillars on the right for symmetry
    addRect(COLS - 5, 6, 1, 4);
    addRect(COLS - 5, ROWS - 10, 1, 4);

    return { mask, tiles };
  }
})();
