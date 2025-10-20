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
const enemies = [];
const pickups = [];

// Tunables (rough arcade feel)
const ACCEL = 450;       // px/s^2
const FRICTION = 800;    // px/s^2
const MAX_VX = 90;       // px/s
const GRAV = 900;        // px/s^2
const JUMP_VY = -260;    // px/s
const BUBBLE_CD = 0.35;  // s
const ENEMY_SPEED = 40;  // px/s
const PICKUP_SCORE = 100;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function aabb(x, y, w, h) { return { x, y, w, h }; }
function rectIntersects(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
function rectCircleIntersects(rx, ry, rw, rh, cx, cy, cr) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= cr * cr;
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
  bubbles.push({ x: px, y: py, r: 5, vx: dir * 30, vy: -60, life: 2.4, carrying: null });
}

function spawnEnemy(tx, ty, dir) {
  const w = 12, h = 14;
  const x = tx * TS + (TS - w) / 2;
  const y = ty * TS - h; // place on top of tile row
  enemies.push({ x, y, w, h, vx: dir * ENEMY_SPEED, vy: 0, onGround: false, state: 'walk' });
}

function spawnPickup(x, y) {
  pickups.push({ x, y, w: 8, h: 8, vx: (Math.random() * 30 - 15), vy: -120, life: 7.0 });
}

// Initial enemies
spawnEnemy(10, 13, -1); // near floor
spawnEnemy(6, 7, 1);    // mid-left platform region

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

  // Move + collide player
  moveAndCollide(player, dt);

  // Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.state === 'walk') {
      e.vy += GRAV * dt;
      const prevVx = e.vx;
      moveAndCollide(e, dt);
      // Turn at edges if on ground
      if (e.onGround) {
        const frontX = e.x + (e.vx >= 0 ? e.w + 1 : -1);
        const footY = e.y + e.h + 1;
        const fx = Math.floor(frontX / TS);
        const fy = Math.floor(footY / TS);
        if (!solidAt(fx, fy)) {
          e.vx = -Math.sign(e.vx || prevVx) * ENEMY_SPEED;
        }
      }
      // If hit wall (vx zeroed), bounce
      if (prevVx !== 0 && e.vx === 0) {
        e.vx = -Math.sign(prevVx) * ENEMY_SPEED;
      }
    }
  }

  // Bubbles update
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life -= dt;
    // gentle float and slight horizontal damping if not carrying
    if (!b.carrying) {
      b.vy = Math.min(b.vy + (-40) * dt, -20);
      b.vx *= 0.995;
    } else {
      // carrying enemy: slower drift, keep enemy aligned
      b.vy = Math.min(b.vy + (-30) * dt, -15);
      b.vx *= 0.992;
      b.carrying.x = b.x - b.carrying.w / 2;
      b.carrying.y = b.y - b.carrying.h / 2;
    }

    // Integrate X
    b.x += b.vx * dt;
    // Integrate Y with simple ceiling/platform interaction (stop under blocks)
    const nextY = b.y + b.vy * dt;
    if (b.vy < 0) {
      const topNext = nextY - b.r;
      const tx0 = Math.floor((b.x - b.r + 0.001) / TS);
      const tx1 = Math.floor((b.x + b.r - 0.001) / TS);
      const ty = Math.floor(topNext / TS);
      let hit = false;
      for (let tx = tx0; tx <= tx1; tx++) { if (solidAt(tx, ty)) { hit = true; break; } }
      if (hit) {
        b.vy = 0;
        b.y = (ty + 1) * TS + b.r + 0.001;
      } else {
        b.y = nextY;
      }
    } else {
      b.y = nextY;
    }

    // Player can pop bubbles by touching them
    if (rectCircleIntersects(player.x, player.y, player.w, player.h, b.x, b.y, b.r)) {
      // Pop
      if (b.carrying) {
        spawnPickup(b.x - 4, b.y - 4);
      }
      bubbles.splice(i, 1);
      continue;
    }

    // Bubble expiration
    if (b.life <= 0) {
      if (b.carrying) {
        // Enemy escapes from here
        const escaped = b.carrying;
        escaped.state = 'walk';
        escaped.vx = (Math.random() < 0.5 ? -1 : 1) * ENEMY_SPEED;
        escaped.vy = -80;
        enemies.push(escaped);
      }
      bubbles.splice(i, 1);
      continue;
    }
  }

  // Bubble capture: enemy intersects bubble
  for (let bi = 0; bi < bubbles.length; bi++) {
    const b = bubbles[bi];
    if (b.carrying) continue;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (e.state !== 'walk') continue;
      if (rectCircleIntersects(e.x, e.y, e.w, e.h, b.x, b.y, b.r)) {
        // Capture this enemy
        e.state = 'captured';
        // Remove enemy from active list and attach to bubble
        enemies.splice(ei, 1);
        b.carrying = e;
        b.life = Math.max(b.life, 4.0); // longer life while carrying
        b.vx *= 0.7; b.vy *= 0.7;
        break;
      }
    }
  }

  // Pickups update
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.vy += GRAV * 0.9 * dt;
    p.x += p.vx * dt;
    // collide with floor for a simple bounce/stop
    const nextY = p.y + p.vy * dt;
    const tileY = Math.floor((nextY + p.h) / TS);
    const left = Math.floor(p.x / TS);
    const right = Math.floor((p.x + p.w - 0.001) / TS);
    let landed = false;
    for (let tx = left; tx <= right; tx++) {
      if (solidAt(tx, tileY)) { landed = true; break; }
    }
    if (landed) {
      p.vy = 0;
      p.y = tileY * TS - p.h - 0.001;
      p.vx *= 0.98;
    } else {
      p.y = nextY;
    }

    // Collect by player
    if (rectIntersects(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
      world.score += PICKUP_SCORE;
      pickups.splice(i, 1);
      continue;
    }

    if (p.life <= 0) {
      pickups.splice(i, 1);
      continue;
    }
  }
}

function drawTiles() {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (solidAt(tx, ty)) {
        ctx.fillStyle = '#1a2a44';
        ctx.fillRect(tx * TS, ty * TS, TS, TS);
        ctx.strokeStyle = 'rgba(180,220,255,0.08)';
        ctx.strokeRect(tx * TS + 0.5, ty * TS + 0.5, TS - 1, TS - 1);
      }
    }
  }
}

function drawPlayer() {
  ctx.fillStyle = '#7ff';
  ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);
  ctx.fillStyle = '#013';
  const eyeX = Math.floor(player.x + (player.dir > 0 ? player.w - 4 : 2));
  ctx.fillRect(eyeX, Math.floor(player.y + 3), 2, 2);
}

function drawEnemies() {
  for (const e of enemies) {
    ctx.fillStyle = '#f55';
    ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.w, e.h);
    // simple eye to show direction via velocity
    ctx.fillStyle = '#300';
    const dir = e.vx >= 0 ? 1 : -1;
    const eyeX = Math.floor(e.x + (dir > 0 ? e.w - 4 : 2));
    ctx.fillRect(eyeX, Math.floor(e.y + 3), 2, 2);
  }
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

    if (b.carrying) {
      const e = b.carrying;
      ctx.fillStyle = 'rgba(255,120,120,0.6)';
      ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.w, e.h);
    }
  }
}

function drawPickups() {
  for (const p of pickups) {
    ctx.fillStyle = '#ffda6b';
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.w, p.h);
    ctx.strokeStyle = 'rgba(100,50,0,0.4)';
    ctx.strokeRect(Math.floor(p.x) + 0.5, Math.floor(p.y) + 0.5, p.w - 1, p.h - 1);
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
  drawEnemies();
  drawPickups();
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
