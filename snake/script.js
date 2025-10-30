import { createBeeper } from '../shared/audio/beeper.js';
import { createDPad } from '../shared/input/dpad.js';
import { createPixelContext } from '../shared/render/pixelCanvas.js';
import { createTileFactory } from '../shared/render/tile-forge/factory.js';
import { registerStandardTiles } from '../shared/render/tile-forge/standardTiles.js';
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
  const { ctx } = pixel;

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

  const tileFactory = registerStandardTiles(createTileFactory({ size: TILE }));
  const tiles = createSnakeTiles(tileFactory);

  function createSnakeTiles(factory) {
    // Shared palette keeps each painter in sync with the game's color story.
    const palette = {
      bg: '#000312',
      floorDark: '#030b1f',
      floorLight: '#071535',
      floorGrid: 'rgba(29, 58, 120, 0.45)',
      floorHighlight: 'rgba(132, 180, 255, 0.18)',
      snakeBodyOuter: '#c2911f',
      snakeBodyInner: '#ffe12b',
      snakeBodyHighlight: 'rgba(255, 232, 120, 0.75)',
      snakeHeadOuter: '#d6c85d',
      snakeHeadInner: '#fff59a',
      snakeHeadHighlight: 'rgba(255, 255, 210, 0.8)',
      snakeStripe: 'rgba(0, 0, 0, 0.12)',
      snakeEye: '#0a1230',
      terrainBase: '#0b1030',
      terrainInner: '#1f33ff',
      terrainHighlight: 'rgba(98, 149, 255, 0.45)',
      foodOuter: '#6a2c00',
      foodInner: '#ff7b1f',
      foodHighlight: 'rgba(255, 245, 220, 0.9)',
      foodStem: '#ffd05a',
    };

    // Floor tiles bake in the grid treatment so we can simply alternate them.
    const makeFloorPainter = (baseColor) => (ctx, w, h) => {
      ctx.save();
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = palette.floorGrid;
      ctx.globalAlpha = 0.65;
      ctx.fillRect(0, 0, w, 1);
      ctx.fillRect(0, 0, 1, h);
      ctx.globalAlpha = 0.3;
      ctx.fillRect(w - 1, 0, 1, h);
      ctx.fillRect(0, h - 1, w, 1);
      ctx.globalAlpha = 1;

      ctx.fillStyle = palette.floorHighlight;
      ctx.fillRect(1, 1, 2, 2);
      ctx.restore();
    };

    factory.define('snake/floor/dark', makeFloorPainter(palette.floorDark));
    factory.define('snake/floor/light', makeFloorPainter(palette.floorLight));

    // Reusable body/head painter with subtle shading and edge strokes.
    const paintSegment = (ctx, w, h, { outer, inner, highlight, stripe }) => {
      ctx.fillStyle = outer;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = inner;
      ctx.fillRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = highlight;
      ctx.fillRect(1, 1, w - 2, Math.max(1, Math.ceil(h / 4)));
      ctx.fillRect(1, 1, Math.max(1, Math.ceil(w / 4)), 1);
      if (stripe) {
        ctx.fillStyle = stripe;
        const stripeWidth = Math.max(1, Math.ceil(w / 6));
        const stripeX = Math.max(1, Math.round(w / 2 - stripeWidth / 2));
        ctx.fillRect(stripeX, 1, stripeWidth, h - 2);
      }
      ctx.strokeStyle = 'rgba(10, 18, 48, 0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    };

    factory.define('snake/body', (ctx, w, h) => {
      paintSegment(ctx, w, h, {
        outer: palette.snakeBodyOuter,
        inner: palette.snakeBodyInner,
        highlight: palette.snakeBodyHighlight,
        stripe: palette.snakeStripe,
      });
    });

    const orientEyes = {
      right: ({ w, h, eyeSize, pad }) => [
        [w - eyeSize - pad, pad],
        [w - eyeSize - pad, h - eyeSize - pad],
      ],
      left: ({ eyeSize, pad, h }) => [
        [pad, pad],
        [pad, h - eyeSize - pad],
      ],
      up: ({ w, eyeSize, pad }) => [
        [pad, pad],
        [w - eyeSize - pad, pad],
      ],
      down: ({ w, h, eyeSize, pad }) => [
        [pad, h - eyeSize - pad],
        [w - eyeSize - pad, h - eyeSize - pad],
      ],
    };

    Object.entries(orientEyes).forEach(([id, orient]) => {
      factory.define(`snake/head/${id}`, (ctx, w, h) => {
        paintSegment(ctx, w, h, {
          outer: palette.snakeHeadOuter,
          inner: palette.snakeHeadInner,
          highlight: palette.snakeHeadHighlight,
          stripe: palette.snakeStripe,
        });
        const eyeSize = Math.max(2, Math.round(w / 4));
        const pad = Math.max(1, Math.round(w / 6));
        ctx.fillStyle = palette.snakeEye;
        orient({ w, h, eyeSize, pad }).forEach(([x, y]) => {
          ctx.fillRect(x, y, eyeSize, eyeSize);
        });
      });
    });

    factory.define('snake/terrain', (ctx, w, h) => {
      ctx.fillStyle = palette.terrainBase;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = palette.terrainInner;
      ctx.fillRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = palette.terrainHighlight;
      ctx.fillRect(2, 1, w - 4, Math.max(1, Math.ceil(h / 4)));
    });

    factory.define('snake/food', (ctx, w, h) => {
      ctx.fillStyle = palette.foodOuter;
      ctx.fillRect(0, 0, w, h);
      const pad = 2;
      ctx.fillStyle = palette.foodInner;
      ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);
      ctx.fillStyle = palette.foodHighlight;
      ctx.fillRect(pad, pad, 2, 2);
      ctx.fillStyle = palette.foodStem;
      const stemWidth = Math.max(2, Math.round(w / 8));
      const stemHeight = Math.max(2, Math.round(h / 5));
      ctx.fillRect(Math.round((w - stemWidth) / 2), Math.max(0, pad - 1), stemWidth, stemHeight);
    });

    return {
      floor: {
        dark: factory.get('snake/floor/dark'),
        light: factory.get('snake/floor/light'),
      },
      terrain: factory.get('snake/terrain'),
      food: factory.get('snake/food'),
      body: factory.get('snake/body'),
      head: {
        up: factory.get('snake/head/up'),
        down: factory.get('snake/head/down'),
        left: factory.get('snake/head/left'),
        right: factory.get('snake/head/right'),
      },
      bgColor: palette.bg,
    };
  }

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
    // Paint a subtle phosphor glow under the board before the tile pass.
    ctx.fillStyle = tiles.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Alternate the two floor tiles to preserve the readable grid layout.
    pixel.forEachTile(COLS, ROWS, TILE, (gridX, gridY, px, py) => {
      const sprite = (gridX + gridY) % 2 === 0 ? tiles.floor.dark : tiles.floor.light;
      pixel.drawSprite(sprite, px, py);
    });
  }

  function drawTerrain() {
    // Render fixed obstacles with their bespoke tile so they stand out from the floor.
    for (const { x, y } of terrainTiles) {
      pixel.drawSprite(tiles.terrain, x * TILE, y * TILE);
    }
  }

  function drawSnake() {
    // Draw body segments from tail to neck so the head overlay stays crisp.
    for (let i = snake.length - 1; i >= 1; i--) {
      const segment = snake[i];
      pixel.drawSprite(tiles.body, segment.x * TILE, segment.y * TILE);
    }

    const head = snake[0];
    const headSprite =
      dir.x === 1 ? tiles.head.right :
      dir.x === -1 ? tiles.head.left :
      dir.y === 1 ? tiles.head.down :
      tiles.head.up;
    pixel.drawSprite(headSprite, head.x * TILE, head.y * TILE);
  }

  function drawFood() {
    pixel.drawSprite(tiles.food, food.x * TILE, food.y * TILE);
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
