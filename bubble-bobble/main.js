import { createCrtControls, applyScanlineIntensity } from '../shared/ui/crtControls.js';
import { createCrtPostProcessor } from '../shared/fx/crtPostprocess.js';
import { initCrtPresetHotkeys } from '../shared/ui/crt.js';
import { DEFAULT_SCANLINE_ALPHA_RANGE, createDefaultCrtSettings } from '../shared/config/display.js';
import { LEVEL_01 } from './assets/levels/level01.js';

// Canvas + CRT setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D context not available');
ctx.imageSmoothingEnabled = false;

const crtFrame = document.querySelector('.screen.crt-frame');
const crtSettings = createDefaultCrtSettings();
const syncScanlines = (value) => {
  if (!crtFrame) return;
  applyScanlineIntensity(crtFrame, value, { alphaRange: DEFAULT_SCANLINE_ALPHA_RANGE });
};
const crtControls = createCrtControls({
  storageKey: 'bubble_crt_settings',
  defaults: createDefaultCrtSettings(),
  onChange: (next) => { Object.assign(crtSettings, next); syncScanlines(next.scanlines); }
});
Object.assign(crtSettings, crtControls.getSettings());
syncScanlines(crtSettings.scanlines);
const crtPost = createCrtPostProcessor({ targetContext: ctx, settings: crtSettings });
initCrtPresetHotkeys({ storageKey: 'bubble_crt_preset', target: document.documentElement });

// Level
const TS = LEVEL_01.tileSize;
const COLS = LEVEL_01.width;
const ROWS = LEVEL_01.height;
const TILES = LEVEL_01.tiles;

function tileIndex(tx, ty) { return ty * COLS + tx; }
function inBounds(tx, ty) { return tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS; }
function solidAt(tx, ty) { return inBounds(tx, ty) && TILES[tileIndex(tx, ty)] === 1; }

// Input
const keys = { left: false, right: false, up: false, shoot: false };
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': keys.left = true; break;
    case 'ArrowRight': case 'd': case 'D': keys.right = true; break;
    case 'ArrowUp': case 'w': case 'W': keys.up = true; break;
    case ' ': keys.shoot = true; break;
    case 'p': case 'P': running = !running; if (running) requestAnimationFrame(loop); break;
  }
});
addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': keys.left = false; break;
    case 'ArrowRight': case 'd': case 'D': keys.right = false; break;
    case 'ArrowUp': case 'w': case 'W': keys.up = false; break;
    case ' ': keys.shoot = false; break;
  }
});

// World state
const world = {
  tick: 0,
  score: 0,
  round: 1,
};

const player = {
  x: (LEVEL_01.playerSpawn.x + 0.1) * TS,
  y: (LEVEL_01.playerSpawn.y + 0.1) * TS,
  w: 12,
  h: 14,
  vx: 0,
  vy: 0,
  dir: 1, // 1 right, -1 left
  onGround: false,
  canJump: false,
  shootCooldown: 0,
};

const bubbles = [];

// Tunables (rough arcade feel)
const ACCEL = 450;     // px/s^2
const FRICTION = 800;  // px/s^2
const MAX_VX = 90;     // px/s
const GRAV = 900;      // px/s^2
const JUMP_VY = -260;  // px/s
const BUBBLE_CD = 0.35; // s

function aabb(x, y, w, h) { return { x, y, w, h }; }
function forEachTileOverlapping(box, fn) {
  const x0 = Math.floor(box.x / TS);
  const x1 = Math.floor((box.x + box.w) / TS);
  const y0 = Math.floor(box.y / TS);
  const y1 = Math.floor((box.y + box.h) / TS);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) { fn(tx, ty); }
  }
}

function moveAndCollide(p, dt) {
  // Horizontal
  let newX = p.x + p.vx * dt;
  if (p.vx > 0) {
    const right = newX + p.w;
    const tileX = Math.floor(right / TS);
    const top = Math.floor(p.y / TS);
    const bottom = Math.floor((p.y + p.h - 0.001) / TS);
    for (let ty = top; ty <= bottom; ty++) {
      if (solidAt(tileX, ty)) {
        newX = tileX * TS - p.w - 0.001;
        p.vx = 0;
        break;
      }
    }
  } else if (p.vx < 0) {
    const left = Math.floor(newX / TS);
    const top = Math.floor(p.y / TS);
    const bottom = Math.floor((p.y + p.h - 0.001) / TS);
    for (let ty = top; ty <= bottom; ty++) {
      if (solidAt(left, ty)) {
        newX = (left + 1) * TS + 0.001;
        p.vx = 0;
        break;
      }
    }
  }
  p.x = newX;

  // Vertical
  p.onGround = false;
  let newY = p.y + p.vy * dt;
  if (p.vy > 0) {
    const bottomPix = newY + p.h;
    const tileY = Math.floor(bottomPix / TS);
    const left = Math.floor(p.x / TS);
    const right = Math.floor((p.x + p.w - 0.001) / TS);
    for (let tx = left; tx <= right; tx++) {
      if (solidAt(tx, tileY)) {
        newY = tileY * TS - p.h - 0.001;
        p.vy = 0;
        p.onGround = true;
        p.canJump = true;
        break;
      }
    }
  } else if (p.vy < 0) {
    const tileY = Math.floor(newY / TS);
    const left = Math.floor(p.x / TS);
    const right = Math.floor((p.x + p.w - 0.001) / TS);
    for (let tx = left; tx <= right; tx++) {
      if (solidAt(tx, tileY)) {
        newY = (tileY + 1) * TS + 0.001;
        p.vy = 0;
        break;
      }
    }
  }
  p.y = newY;
}

function spawnBubble(px, py, dir) {
  bubbles.push({ x: px, y: py, r: 5, vx: dir * 30, vy: -60, life: 2.4 });
}

function update(dt) {
  world.tick++;

  // Player input
  if (keys.left) { player.vx -= ACCEL * dt; player.dir = -1; }
  if (keys.right) { player.vx += ACCEL * dt; player.dir = 1; }
  if (!keys.left && !keys.right) {
    // friction toward stop
    if (player.vx > 0) { player.vx = Math.max(0, player.vx - FRICTION * dt); }
    if (player.vx < 0) { player.vx = Math.min(0, player.vx + FRICTION * dt); }
  }
  // clamp
  if (player.vx > MAX_VX) player.vx = MAX_VX;
  if (player.vx < -MAX_VX) player.vx = -MAX_VX;

  // Gravity
  player.vy += GRAV * dt;

  // Jump (simple)
  if (keys.up && player.canJump) {
    player.vy = JUMP_VY;
    player.canJump = false;
  }

  // Shoot bubble
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (keys.shoot && player.shootCooldown <= 0) {
    spawnBubble(player.x + player.w / 2 + player.dir * 6, player.y + 4, player.dir);
    player.shootCooldown = BUBBLE_CD;
  }

  // Move + collide
  moveAndCollide(player, dt);

  // Bubbles update
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life -= dt;
    // gentle float and slight horizontal damping
    b.vy = Math.min(b.vy + (-40) * dt, -20);
    b.vx *= 0.995;

    // Integrate X
    b.x += b.vx * dt;
    // Integrate Y with simple ceiling/platform interaction (stop under blocks)
    const nextY = b.y + b.vy * dt;
    if (b.vy < 0) {
      // moving up, will we intersect a solid tile above?
      const topNext = nextY - b.r;
      const tx0 = Math.floor((b.x - b.r + 0.001) / TS);
      const tx1 = Math.floor((b.x + b.r - 0.001) / TS);
      const ty = Math.floor(topNext / TS);
      let hit = false;
      for (let tx = tx0; tx <= tx1; tx++) { if (solidAt(tx, ty)) { hit = true; break; } }
      if (hit) {
        // Stick just under the tile
        b.vy = 0;
        b.y = (ty + 1) * TS + b.r + 0.001;
      } else {
        b.y = nextY;
      }
    } else {
      b.y = nextY;
    }

    if (b.life <= 0) bubbles.splice(i, 1);
  }
}

function drawTiles() {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (solidAt(tx, ty)) {
        ctx.fillStyle = '#1a2a44';
        ctx.fillRect(tx * TS, ty * TS, TS, TS);
        // simple outline to evoke tile edges under CRT
        ctx.strokeStyle = 'rgba(180,220,255,0.08)';
        ctx.strokeRect(tx * TS + 0.5, ty * TS + 0.5, TS - 1, TS - 1);
      }
    }
  }
}

function drawPlayer() {
  ctx.fillStyle = '#7ff';
  ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);
  // eye to show facing
  ctx.fillStyle = '#013';
  const eyeX = Math.floor(player.x + (player.dir > 0 ? player.w - 4 : 2));
  ctx.fillRect(eyeX, Math.floor(player.y + 3), 2, 2);
}

function drawBubbles() {
  for (const b of bubbles) {
    const alpha = Math.max(0.2, Math.min(1, b.life / 2.4));
    ctx.strokeStyle = `rgba(180,255,255,${alpha})`;
    ctx.fillStyle = `rgba(90,200,220,${alpha * 0.25})`;
    ctx.beginPath();
    ctx.arc(Math.floor(b.x), Math.floor(b.y), b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function render() {
  // Clear
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Backdrop tint (subtle)
  ctx.fillStyle = '#02131c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTiles();
  drawBubbles();
  drawPlayer();

  // HUD text
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(`SCORE ${world.score}`, 8, 8);
  ctx.fillText(`ROUND ${world.round}`, 160, 8);

  // Apply CRT post-process
  crtPost.render();
}

let running = true;
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  if (running) requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
