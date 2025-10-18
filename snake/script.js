import { createBeeper } from '../shared/audio/beeper.js';
import { createDPad } from '../shared/input/dpad.js';
import { createPixelContext } from '../shared/render/pixelCanvas.js';
import { createCrtControls, applyScanlineIntensity } from '../shared/ui/crtControls.js';
import { createCrtPostProcessor } from '../shared/fx/crtPostprocess.js';

(() => {
  const canvas = document.getElementById('game');
  const pixel = createPixelContext(canvas, { alpha: false });
  const { ctx, fillRect: fillPixels } = pixel;

  const crtFrame = document.querySelector('.bezel.crt-frame');
  const syncScanlines = (value) => {
    if (!crtFrame) return;
    applyScanlineIntensity(crtFrame, value, { alphaRange: [0.05, 0.28] });
  };

  const crtSettings = {
    enabled: true,
    warp: 0.08,
    aberration: 0.05,
    aberrationOpacity: 0.45,
    scanlines: 0.5,
  };
  const crtControls = createCrtControls({
    storageKey: 'snake_crt_settings',
    defaults: crtSettings,
    onChange: (next) => {
      Object.assign(crtSettings, next);
      syncScanlines(next.scanlines);
    },
  });
  Object.assign(crtSettings, crtControls.getSettings());
  syncScanlines(crtSettings.scanlines);
  const crtPost = createCrtPostProcessor({ targetContext: ctx, settings: crtSettings });

  // Grid config
  const COLS = 32;
  const ROWS = 24;
  const TILE = 10; // canvas is 320x240 -> 32x24 grid

  pixel.resizeToGrid(COLS, ROWS, TILE);

  // Colors (retro green phosphor vibe)
  const COLORS = {
    bg: '#00140a',
    grid: 'rgba(20,70,40,0.12)',
    snake: '#4cff4c',
    snakeHead: '#9aff9a',
    food: '#ff4c4c',
    foodStem: '#2fbf71'
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
  let snake, dir, nextDir, food, score, high, alive, paused;
  let lastTime = 0, acc = 0;
  let stepPerSec = 12; // ticks per second
  let stepMs = 1000 / stepPerSec;
  let frames = 0, fpsTime = 0;

  function init() {
    const startLen = 4;
    const startX = Math.floor(COLS / 3);
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
  }

  function spawnFood() {
    while (true) {
      const x = (Math.random() * COLS) | 0;
      const y = (Math.random() * ROWS) | 0;
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
      alive = false; crashTone(); return;
    }

    // Self collision
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        alive = false; crashTone(); return;
      }
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
      fillPixels(h.x * TILE + TILE - eye - off, h.y * TILE + off, eye, eye, '#021');
      fillPixels(h.x * TILE + TILE - eye - off, h.y * TILE + TILE - eye - off, eye, eye, '#021');
    } else if (dir.x === -1) { // left
      fillPixels(h.x * TILE + off, h.y * TILE + off, eye, eye, '#021');
      fillPixels(h.x * TILE + off, h.y * TILE + TILE - eye - off, eye, eye, '#021');
    } else if (dir.y === 1) { // down
      fillPixels(h.x * TILE + off, h.y * TILE + TILE - eye - off, eye, eye, '#021');
      fillPixels(h.x * TILE + TILE - eye - off, h.y * TILE + TILE - eye - off, eye, eye, '#021');
    } else { // up
      fillPixels(h.x * TILE + off, h.y * TILE + off, eye, eye, '#021');
      fillPixels(h.x * TILE + TILE - eye - off, h.y * TILE + off, eye, eye, '#021');
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
    ctx.font = '10px \"Press Start 2P\", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00140a';
    ctx.fillRect(cx - 80, cy - 10, 160, 20);
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(80,255,160,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, cx, cy);
    ctx.restore();
  }

  function frame(t) {
    if (!lastTime) { lastTime = t; }
    const dt = t - lastTime; lastTime = t;
    acc += dt;
    fpsTime += dt; frames += 1;
    if (fpsTime >= 500) { // update fps every 0.5s
      const fps = Math.round(frames * 1000 / fpsTime);
      fpsEl.textContent = ` ${fps} FPS`;
      frames = 0; fpsTime = 0;
    }

    while (acc >= stepMs) { acc -= stepMs; update(); }

    // Draw
    drawBG();
    drawFood();
    drawSnake();

    if (!alive) drawGameOver();
    else if (paused) drawPaused();

    // Apply CRT post-processing after drawing the frame.
    crtPost.render();

    requestAnimationFrame(frame);
  }

  init();
  requestAnimationFrame(frame);
})();
