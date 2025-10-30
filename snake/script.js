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

  // Colors (retro green phosphor vibe)
  const COLORS = {
    bg: '#000312',
    floorShadow: '#0a1638',
    floorAccent: 'rgba(37, 66, 140, 0.45)',
    snake: '#ffe12b',
    snakeShade: '#d8a710',
    snakeHead: '#fff59a',
    snakeHighlight: '#fffad0',
    snakeEye: '#0a1230',
    food: '#ff7b1f',
    foodStem: '#ffd05a',
    terrainBase: '#0b1030',
    terrainTop: '#1f33ff',
    terrainHighlight: 'rgba(98, 149, 255, 0.45)'
  };

  // Use Tile Forge to generate every sprite so the renderer only has to blit canvases.
  const tileFactory = registerStandardTiles(createTileFactory({ size: TILE }));
  defineSnakeTiles(tileFactory);
  const sprites = createSpriteLookup(tileFactory);
  const backgroundLayer = buildBackgroundLayer();

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
    pixel.drawSprite(backgroundLayer, 0, 0);
  }

  function drawTerrain() {
    // Render fixed obstacles so they read like Pac-Man style maze walls
    for (const { x, y } of terrainTiles) {
      pixel.drawSprite(sprites.terrain, x * TILE, y * TILE);
    }
  }

  function drawSnake() {
    // Body segments reuse the same tile for a consistent sheen.
    for (let i = snake.length - 1; i >= 1; i--) {
      const segment = snake[i];
      pixel.drawSprite(sprites.snakeBody, segment.x * TILE, segment.y * TILE);
    }
    // Head swaps tiles based on the active direction so the eyes track movement.
    const head = snake[0];
    const facing = directionKey(dir);
    pixel.drawSprite(sprites.snakeHead[facing], head.x * TILE, head.y * TILE);
  }

  function drawFood() {
    pixel.drawSprite(sprites.food, food.x * TILE, food.y * TILE);
  }

  function directionKey(vector) {
    if (!vector) return 'right';
    if (vector.y === -1) return 'up';
    if (vector.x === -1) return 'left';
    if (vector.y === 1) return 'down';
    return 'right';
  }

  function buildBackgroundLayer() {
    const buffer = document.createElement('canvas');
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    const bufferCtx = buffer.getContext('2d');
    if (bufferCtx) {
      bufferCtx.imageSmoothingEnabled = false;
      bufferCtx.fillStyle = COLORS.bg;
      bufferCtx.fillRect(0, 0, buffer.width, buffer.height);
      // Cache the static floor so the main loop only performs sprite blits.
      pixel.forEachTile(COLS, ROWS, TILE, (_col, _row, px, py) => {
        bufferCtx.drawImage(sprites.floor, px, py);
      });
    }
    return buffer;
  }

  function createSpriteLookup(factory) {
    return {
      floor: factory.get('snake/floor'),
      terrain: factory.get('snake/terrain'),
      snakeBody: factory.get('snake/body'),
      snakeHead: {
        up: factory.get('snake/head-up'),
        down: factory.get('snake/head-down'),
        left: factory.get('snake/head-left'),
        right: factory.get('snake/head-right'),
      },
      food: factory.get('snake/food'),
    };
  }

  function defineSnakeTiles(factory) {
    // Floor: bake the subtle grid into the texture with a little noise for CRT shimmer.
    factory.define(
      'snake/floor',
      factory.withNoise('snake/floor', (ctx, w, h, rng) => {
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = COLORS.floorShadow;
        ctx.fillRect(0, h - 1, w, 1);
        ctx.fillRect(w - 1, 0, 1, h);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = COLORS.floorAccent;
        for (let i = 0; i < 3; i += 1) {
          const px = Math.floor(rng() * w);
          const py = Math.floor(rng() * h);
          ctx.fillRect(px, py, 1, 1);
        }
        ctx.globalAlpha = 0.18;
        ctx.fillRect(0, 0, w, 1);
        ctx.fillRect(0, 0, 1, h);
        ctx.globalAlpha = 1;
      })
    );

    factory.define('snake/terrain', (ctx, w, h) => {
      ctx.fillStyle = COLORS.terrainBase;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = COLORS.terrainTop;
      ctx.fillRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = COLORS.terrainHighlight;
      ctx.fillRect(2, 1, Math.max(1, w - 4), Math.max(1, Math.floor(h / 3)));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, h - 1, w, 1);
    });

    // Body: glossy segment with a highlight stripe to match the retro palette.
    factory.define('snake/body', (ctx, w, h) => {
      ctx.fillStyle = COLORS.snake;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = COLORS.snakeHead;
      ctx.fillRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = COLORS.snakeShade;
      ctx.fillRect(0, h - 2, w, 2);
      ctx.fillStyle = COLORS.snakeHighlight;
      ctx.fillRect(1, 1, w - 2, Math.max(1, Math.floor(h / 3)));
    });

    ['up', 'down', 'left', 'right'].forEach((orientation) => {
      factory.define(`snake/head-${orientation}`, paintSnakeHead(orientation));
    });

    // Food: stylised fruit that keeps the original warm glow.
    factory.define('snake/food', (ctx, w, h) => {
      const stemWidth = Math.max(1, Math.floor(w / 4));
      const stemHeight = Math.max(1, Math.floor(h / 3));
      ctx.fillStyle = COLORS.food;
      ctx.fillRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = COLORS.foodStem;
      ctx.fillRect(Math.floor(w / 2) - Math.floor(stemWidth / 2), 0, stemWidth, stemHeight);
      ctx.fillStyle = '#fff7';
      ctx.fillRect(1, 1, Math.max(1, Math.floor(w / 3)), Math.max(1, Math.floor(h / 3)));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(1, h - 2, w - 2, 1);
    });
  }

  function paintSnakeHead(orientation) {
    return (ctx, w, h) => {
      const eye = Math.max(1, Math.floor(w / 4));
      const inset = Math.max(1, Math.floor(w / 6));
      ctx.fillStyle = COLORS.snakeHead;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = COLORS.snakeShade;
      ctx.fillRect(0, h - 2, w, 2);
      ctx.fillStyle = COLORS.snakeHighlight;
      ctx.fillRect(1, 1, w - 2, Math.max(1, Math.floor(h / 3)));

      // Orient the pupils so the head tracks the active direction of travel.
      const positions = (() => {
        switch (orientation) {
          case 'left':
            return [
              { x: inset, y: inset },
              { x: inset, y: h - eye - inset },
            ];
          case 'up':
            return [
              { x: inset, y: inset },
              { x: w - eye - inset, y: inset },
            ];
          case 'down':
            return [
              { x: inset, y: h - eye - inset },
              { x: w - eye - inset, y: h - eye - inset },
            ];
          case 'right':
          default:
            return [
              { x: w - eye - inset, y: inset },
              { x: w - eye - inset, y: h - eye - inset },
            ];
        }
      })();

      ctx.fillStyle = COLORS.snakeEye;
      positions.forEach(({ x, y }) => ctx.fillRect(x, y, eye, eye));
    };
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
