import { createCrtControls, applyScanlineIntensity } from '../shared/ui/crtControls.js';
import { createCrtPostProcessor } from '../shared/fx/crtPostprocess.js';
import { initCrtPresetHotkeys } from '../shared/ui/crt.js';
import { DEFAULT_SCANLINE_ALPHA_RANGE, createDefaultCrtSettings } from '../shared/config/display.js';
import { LEVELS } from './assets/levels/index.js';
import { loadSprites, drawSprite } from './sprites.js';
import { playJump, playBubble, playPop, playPickup, playCapture, primeOnFirstKeydown, loadAndLoopMusic, toggleMusicMute, setMusicPaused } from './audio.js';

// Canvas + CRT setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D context not available');
ctx.imageSmoothingEnabled = false;
// Backdrop (C64-style 8x8 pattern + tile shadows)
const BACKDROP_8 = {  canvas: document.createElement('canvas'), ctx: null, dirty: true, roundSeed: 0, paletteIndex: 0 };
function initBackdropCanvas() { BACKDROP_8.canvas.width = canvas.width; BACKDROP_8.canvas.height = canvas.height; BACKDROP_8.ctx = BACKDROP_8.canvas.getContext('2d'); if (BACKDROP_8.ctx) BACKDROP_8.ctx.imageSmoothingEnabled = false; }
function rebuildBackdrop(roundSeed) { if (!BACKDROP_8.ctx) initBackdropCanvas(); const b=BACKDROP_8.ctx; if(!b) return; BACKDROP_8.roundSeed=(roundSeed|0); b.fillStyle='#000'; b.fillRect(0,0,BACKDROP_8.canvas.width,BACKDROP_8.canvas.height); BACKDROP_8.dirty=false; }

const BORDER_THICKNESS = 12;
const STRIPE_STYLE = {
  solid: { base: '#ff4fa8', stripe: '#ffe4f6', outline: '#ff99cf', shadow: '#d13b84', stripeWidth: 4, stripeSpacing: 8, patternSize: 16 },
  oneWay: { base: '#ff6cc0', stripe: '#fff0fb', outline: '#ffc6e6', shadow: '#e0559a', stripeWidth: 4, stripeSpacing: 8, patternSize: 16 },
  border: { base: '#ff4fa8', stripe: '#ffe4f6', outer: '#ff9bd3', inner: '#c32778', stripeWidth: 5, stripeSpacing: 10, patternSize: 24 }
};
const STRIPE_CACHE = { solid: null, oneWay: null, border: null };
function createDiagonalStripePattern(baseColor, stripeColor, size = 16, stripeWidth = 4, spacing = 8) {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = patternCanvas.height = size;
  const pctx = patternCanvas.getContext('2d');
  if (!pctx) return null;
  pctx.fillStyle = baseColor;
  pctx.fillRect(0, 0, size, size);
  pctx.fillStyle = stripeColor;
  for (let i = -size; i < size; i += spacing) {
    pctx.beginPath();
    pctx.moveTo(i, size);
    pctx.lineTo(i + stripeWidth, size);
    pctx.lineTo(i + stripeWidth + size, 0);
    pctx.lineTo(i + size, 0);
    pctx.closePath();
    pctx.fill();
  }
  return { canvas: patternCanvas, pattern: ctx.createPattern(patternCanvas, 'repeat') };
}
function getStripePattern(kind) {
  const key = kind === 2 ? 'oneWay' : (kind === 'border' ? 'border' : 'solid');
  const cache = STRIPE_CACHE[key];
  if (cache && cache.pattern) return cache.pattern;
  const style = STRIPE_STYLE[key];
  if (!style) return null;
  const size = style.patternSize || 16;
  const patternEntry = createDiagonalStripePattern(style.base, style.stripe, size, style.stripeWidth || 4, style.stripeSpacing || 8);
  if (!patternEntry) return null;
  STRIPE_CACHE[key] = patternEntry;
  return patternEntry.pattern;
}
function drawC64Border(ctx){ const w=canvas.width,h=canvas.height,b=BORDER_THICKNESS; const borderPattern = getStripePattern('border'); ctx.save(); ctx.fillStyle = borderPattern || STRIPE_STYLE.border.base; ctx.fillRect(0,0,w,b); ctx.fillRect(0,h-b,w,b); ctx.fillRect(0,b,b,h-2*b); ctx.fillRect(w-b,b,b,h-2*b); ctx.restore(); ctx.save(); ctx.lineJoin='miter'; ctx.strokeStyle = STRIPE_STYLE.border.outer; ctx.lineWidth = 2; ctx.strokeRect(1,1,w-2,h-2); ctx.strokeStyle = STRIPE_STYLE.border.inner; ctx.strokeRect(b-1,b-1,w-2*(b-1),h-2*(b-1)); ctx.restore(); }

const crtFrame = document.querySelector('.screen.crt-frame');
const crtSettings = createDefaultCrtSettings();
const syncScanlines = (value) => { if (!crtFrame) return; applyScanlineIntensity(crtFrame, value, { alphaRange: DEFAULT_SCANLINE_ALPHA_RANGE }); };
const crtControls = createCrtControls({ storageKey: 'bubble_crt_settings', defaults: createDefaultCrtSettings(), onChange: (next) => { Object.assign(crtSettings, next); syncScanlines(next.scanlines); } });
Object.assign(crtSettings, crtControls.getSettings());
syncScanlines(crtSettings.scanlines);
const crtPost = createCrtPostProcessor({ targetContext: ctx, settings: crtSettings });
initCrtPresetHotkeys({ storageKey: 'bubble_crt_preset', target: document.documentElement });

// Prime audio and prepare music
primeOnFirstKeydown(window);
const MUSIC_URL = './assets/music.mp3';
loadAndLoopMusic(MUSIC_URL);

// Globals that depend on level
let TS = 16; let COLS = 16; let ROWS = 14; let TILES = [];
let CURRENT_LEVEL = null;
function tileIndex(tx, ty) { return ty * COLS + tx; }
function inBounds(tx, ty) { return tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS; }
function tileTypeAt(tx, ty) { return inBounds(tx, ty) ? TILES[tileIndex(tx, ty)] : 0; }
function solidAt(tx, ty) { return tileTypeAt(tx, ty) === 1; }
function groundAt(tx, ty) { const t = tileTypeAt(tx, ty); return t === 1 || t === 2; }

// 8x8 migration helpers (expand each 16px tile into 2x2 of 8px tiles)
const TILE_MIGRATION = { mode: '8' }; // '8' or '16'
function expandTilesTo8(srcTiles, cols, rows) {
  const dstCols = cols * 2, dstRows = rows * 2;
  const out = new Array(dstCols * dstRows);
  for (let ty=0; ty<rows; ty++){ for(let tx=0; tx<cols; tx++){ const t = srcTiles[ty*cols+tx]; const dx = tx*2, dy = ty*2;
      out[(dy)*dstCols + (dx)] = t;
      out[(dy)*dstCols + (dx+1)] = t;
      out[(dy+1)*dstCols + (dx)] = t;
      out[(dy+1)*dstCols + (dx+1)] = t;
  } }
  return { tiles: out, cols: dstCols, rows: dstRows };
}
// Input
const keys = { left: false, right: false, up: false, down: false, shoot: false };
let SHOW_OVERLAY = false;
addEventListener('keydown', (e) => {
  const k = e.key; if (k === 't' || k === 'T') { TILE_MIGRATION.mode = (TILE_MIGRATION.mode === '8' ? '16' : '8'); applyLevel(roundIndex); return; } BACKDROP_8.dirty = true; 
  if (e.repeat) return;
  if (k === 'o' || k === 'O') { SHOW_OVERLAY = !SHOW_OVERLAY; return; }
  const c = e.code;
  switch (k) {
    case 'ArrowLeft': case 'a': case 'A': keys.left = true; break;
    case 'ArrowRight': case 'd': case 'D': keys.right = true; break;
    case 'ArrowUp': case 'w': case 'W': keys.up = true; break;
    case 'ArrowDown': case 's': case 'S': keys.down = true; break;
    case ' ': case 'Spacebar': keys.shoot = true; break;
    default: if (c === 'Space') keys.shoot = true; break;
  }
  if (k === 'm' || k === 'M') toggleMusicMute();
  if (k === 'p' || k === 'P') { running = !running; setMusicPaused(!running); if (running) requestAnimationFrame(loop); }
  if ((k === 'Enter' || k === 'r' || k === 'R') && gameState === 'gameOver') restartGame();
});
addEventListener('keyup', (e) => {
  const k = e.key;
  const c = e.code;
  switch (k) {
    case 'ArrowLeft': case 'a': case 'A': keys.left = false; break;
    case 'ArrowRight': case 'd': case 'D': keys.right = false; break;
    case 'ArrowUp': case 'w': case 'W': keys.up = false; break;
    case 'ArrowDown': case 's': case 'S': keys.down = false; break;
    case ' ': case 'Spacebar': keys.shoot = false; break;
  }
  if (c === 'Space') keys.shoot = false;
});

// World state
const world = { tick: 0, score: 0, round: 1, lives: 3, hi: 0 };
try { const saved = localStorage.getItem('bbt_high_score'); if (saved) world.hi = Math.max(0, parseInt(saved, 10) || 0); } catch {}
const EXTEND = ['E','X','T','E','N','D'];
let extendCollected = [false,false,false,false,false,false];
function extendReset(){ extendCollected = [false,false,false,false,false,false]; updateExtendHUD(); }
function updateExtendHUD(){ const ids=['L_E','L_X','L_T','L_E2','L_N','L_D']; for (let i=0;i<6;i++){ const el=document.getElementById(ids[i]); if (el) el.style.opacity = extendCollected[i] ? '1' : '0.25'; } }

const player = { x: 0, y: 0, w: 32, h: 32, vx: 0, vy: 0, dir: 1, facing: 1, onGround: false, canJump: false, shootCooldown: 0, ridingBubble: -1, animTime: 0, animFrame: 0 };
const bubbles = []; const enemies = []; const pickups = [];

// Tunables
const ACCEL = 450;
const FRICTION = 2400;
const MAX_VX = 90;
const GRAV = 900;
const JUMP_VY = -260;
const HITBOX_MARGIN = 1.0; // inset for collision checks (px)
const BUBBLE_CD = 0.35;
const ENEMY_SPEED = 40;
const PICKUP_SCORE = 100;
const STOP_EPS = 4;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rectIntersects(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
function rectCircleIntersects(rx, ry, rw, rh, cx, cy, cr) { const nx = clamp(cx, rx, rx + rw); const ny = clamp(cy, ry, ry + rh); const dx = cx - nx; const dy = cy - ny; return dx*dx + dy*dy <= cr*cr; }

function moveAndCollide(p, dt) {
  // Horizontal
  let newX = p.x + p.vx * dt;
  if (p.vx > 0) {
    const right = newX + p.w - HITBOX_MARGIN; const tileX = Math.floor(right / TS); const top = Math.floor((p.y + HITBOX_MARGIN) / TS); const bottom = Math.floor(((p.y + p.h - HITBOX_MARGIN - 0.001)) / TS);
    for (let ty = top; ty <= bottom; ty++) { if (solidAt(tileX, ty)) { newX = tileX * TS - p.w - 0.001; p.vx = 0; break; } }
  } else if (p.vx < 0) {
    const left = Math.floor((newX + HITBOX_MARGIN) / TS); const top = Math.floor((p.y + HITBOX_MARGIN) / TS); const bottom = Math.floor(((p.y + p.h - HITBOX_MARGIN - 0.001)) / TS);
    for (let ty = top; ty <= bottom; ty++) { if (solidAt(left, ty)) { newX = (left + 1) * TS + 0.001; p.vx = 0; break; } }
  }
  p.x = newX;

  // Horizontal wrap
  wrapEntity(p);

  // Vertical
  p.onGround = false;
  let newY = p.y + p.vy * dt;
  if (p.vy > 0) {
    const prevBottom = p.y + p.h;
    const nextBottom = newY + p.h;
    const tileY = Math.floor(nextBottom / TS);
    const left = Math.floor(p.x / TS);
    const right = Math.floor((p.x + p.w - 0.001) / TS);
    for (let tx = left; tx <= right; tx++) {
      const t = tileTypeAt(tx, tileY);
      const tileTop = tileY * TS;
      const passOneWay = (t === 2) && (prevBottom <= tileTop) && (nextBottom >= tileTop);
      if (t === 1 || passOneWay) {
        newY = tileTop - p.h - 0.001;
        p.vy = 0;
        p.onGround = true;
        p.canJump = true;
        break;
      }
    }
  } else if (p.vy < 0) {
    const tileY = Math.floor((newY + HITBOX_MARGIN) / TS);
    const left = Math.floor(p.x / TS); const right = Math.floor((p.x + p.w - 0.001) / TS);
    for (let tx = left; tx <= right; tx++) { if (solidAt(tx, tileY)) { newY = (tileY + 1) * TS + 0.001; p.vy = 0; break; } }
  }
  p.y = newY;
}

function wrapEntity(e) {
  const W = COLS * TS;
  if (e.x + e.w < 0) e.x = W - e.w;
  else if (e.x > W) e.x = 0;
}

function spawnBubbleFromPlayer() {
  const r = Math.max(12, Math.floor(TS * 1.35));
  // Place the bubble clearly in front of the player to avoid instant overlap
  const dx = (player.dir > 0 ? (player.w / 2 + r + 4) : -(player.w / 2 + r + 4));
  const px = player.x + player.w / 2 + dx;
  const py = player.y + player.h / 2 - 2;
  bubbles.push({ x: px, y: py, r: r, vx: player.dir * 18, vy: -26, life: 3.2, carrying: null, spawnGrace: 0.45 });
}



function spawnEnemy(tx, ty, dir) {
  const w = 32, h = 32;
  // Find nearest ground row around requested (tx,ty)
  let groundRow = -1;
  const t0 = tileTypeAt(tx, ty);
  if (t0 === 1 || t0 === 2) {
    groundRow = ty;
  }
  if (groundRow < 0) {
    for (let r = ty + 1; r < Math.min(ROWS, ty + 30); r++) { if (groundAt(tx, r)) { groundRow = r; break; } }
  }
  if (groundRow < 0) {
    for (let r = ty; r >= Math.max(0, ty - 30); r--) { if (groundAt(tx, r)) { groundRow = r; break; } }
  }
  if (groundRow < 0) groundRow = Math.max(0, Math.min(ROWS - 1, ty));
  const x = tx * TS + (TS - w) / 2;
  const yTop = groundRow * TS;
  const y = yTop - h - 0.001;
  enemies.push({ x, y, w, h, vx: (dir >= 0 ? 1 : -1) * ENEMY_SPEED, vy: 0, onGround: false, state: 'walk', type: 'walker', animTime: 0, animFrame: 0, facing: (dir >= 0 ? 1 : -1) });
}


function spawnJumper(tx, ty, dir) {
  const w = 32, h = 32;
  let groundRow = -1; const t = tileTypeAt(tx, ty);
  if (t === 1 || t === 2) groundRow = ty; else if (groundAt(tx, ty + 1)) groundRow = ty + 1; else { for (let r = ty + 1; r < ROWS; r++) { if (groundAt(tx, r)) { groundRow = r; break; } } }
  if (groundRow < 0) groundRow = ROWS - 1;
  const x = tx * TS + (TS - w) / 2; const yTop = groundRow * TS; const y = yTop - h - 0.001;
  enemies.push({ x, y, w, h, vx: (dir >= 0 ? 1 : -1) * ENEMY_SPEED, vy: 0, onGround: false, state: 'walk', type: 'jumper', animTime: 0, animFrame: 0, jumpCd: 0, facing: (dir >= 0 ? 1 : -1) });
}

function spawnPickup(x, y) { pickups.push({ x, y, w: 8, h: 8, vx: (Math.random()*30-15), vy: -120, life: 7.0, kind: 'fruit' }); }

function spawnLetter(x, y, letter) { pickups.push({ x, y, w: 8, h: 8, vx: (Math.random()*24-12), vy: -100, life: 9.0, kind: 'letter', ch: letter }); }

// Level/round management
let roundIndex = 0; // 0-based
let gameState = 'roundIntro'; // 'roundIntro' | 'playing' | 'roundClear' | 'gameOver'
let stateTimer = 0.9; // shorter intro so testing is snappier
function applyLevel(idx) {
  const L = LEVELS[idx % LEVELS.length];
  CURRENT_LEVEL = L;
  COLS = L.width; ROWS = L.height; TILES = L.tiles;
  if (TILE_MIGRATION.mode === "8") {
    const ex = expandTilesTo8(TILES, COLS, ROWS);
    COLS = ex.cols; ROWS = ex.rows; TILES = ex.tiles; TS = 8;
  } else {
    TS = 16;
  }
  bubbles.length = 0; enemies.length = 0; pickups.length = 0;
  const base = 16;
  player.x = (L.playerSpawn.x + 0.1) * base;
  player.y = (L.playerSpawn.y + 0.1) * base;
  {
    const sx = Math.floor(player.x / TS);
    const sy = Math.floor((player.y + player.h) / TS);
    let groundRow = -1;
    if (groundAt(sx, sy)) groundRow = sy;
    else if (groundAt(sx, sy + 1)) groundRow = sy + 1;
    else { for (let r = sy + 1; r < ROWS; r++) { if (groundAt(sx, r)) { groundRow = r; break; } } }
    if (groundRow < 0) groundRow = ROWS - 1;
    const yTop = groundRow * TS;
    player.y = yTop - player.h - 0.001;
  }
   player.facing = (player.vx<0)?-1:((player.vx>0)?1:player.facing); player.vy = 0; player.dir = 1; player.onGround = false; player.canJump = false; player.shootCooldown = 0; player.ridingBubble = -1;
  if (Array.isArray(L.enemySpawns)) {
    for (const sp of L.enemySpawns) { dispatchSpawn(sp); }
  }
  BACKDROP_8.dirty = true;
}

function loseLife() {
  world.lives = Math.max(0, world.lives - 1);
  if (world.lives <= 0) {
    if (world.score > world.hi) { world.hi = world.score; try { localStorage.setItem('bbt_high_score', String(world.hi)); } catch {} }
    gameState = 'gameOver'; stateTimer = 0.0; setMusicPaused(true);
  } else {
    gameState = 'roundIntro'; stateTimer = 0.9; applyLevel(roundIndex);
  }
}

function restartGame() {
  world.score = 0; world.lives = 3; roundIndex = 0; world.round = 1; setMusicPaused(false);
  extendReset();
  applyLevel(roundIndex); gameState = 'roundIntro'; stateTimer = 0.9;
}

function update(dt) {
  world.tick++;

  if (gameState === 'gameOver') {
    return;
  }

  // Intro → play
  if (gameState === 'roundIntro') { stateTimer -= dt; if (stateTimer <= 0) gameState = 'playing'; }

  // Input and physics
  if (keys.left) { player.vx -= ACCEL * dt; player.dir = -1; }
  if (keys.right) { player.vx += ACCEL * dt; player.dir = 1; }
  player.vx = clamp(player.vx, -MAX_VX, MAX_VX);
  // Update facing from current velocity or last input
  if (player.vx < 0) player.facing = -1;
  else if (player.vx > 0) player.facing = 1;
  else if (player.dir !== 0) player.facing = player.dir;
  player.vy += GRAV * dt;
  if (keys.up && player.canJump) { player.vy = JUMP_VY; player.canJump = false; playJump(); if (player.ridingBubble >= 0) player.ridingBubble = -1; }
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (keys.shoot && player.shootCooldown <= 0) { spawnBubbleFromPlayer(); player.shootCooldown = BUBBLE_CD; playBubble(); }



  moveAndCollide(player, dt);
  // Ground decel only when no input
  if (player.onGround && !keys.left && !keys.right) {
    if (player.vx > 0) player.vx = Math.max(0, player.vx - FRICTION * dt);
    else if (player.vx < 0) player.vx = Math.min(0, player.vx + FRICTION * dt);
    if (Math.abs(player.vx) < STOP_EPS) player.vx = 0;
  }

  // Enemies
  if (gameState === 'playing') {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.state === 'walk') {
        // Jumper AI: chase horizontally; hop when grounded on cooldown
        if (e.type === 'jumper') {
          const ex = e.x + e.w/2, px = player.x + player.w/2;
           e.facing = (e.vx<0)?-1:((e.vx>0)?1:e.facing);
          e.jumpCd = (typeof e.jumpCd === 'number') ? e.jumpCd : 0;
          if (e.onGround && e.jumpCd <= 0) { e.vy = -160; e.onGround = false; e.jumpCd = 1.1 + Math.random()*0.6; }
          else if (!e.onGround) { e.jumpCd = Math.max(0, e.jumpCd - dt); }
        }
        e.vy += GRAV * dt; const prevVx = e.vx; moveAndCollide(e, dt); wrapEntity(e);
        if (e.onGround) {
          const frontX = e.x + (e.vx >= 0 ? e.w + 1 : -1);
          const footY = e.y + e.h + 1; const fx = Math.floor(frontX / TS); const fy = Math.floor(footY / TS);
          if (!groundAt(fx, fy))  e.facing = (e.vx<0)?-1:((e.vx>0)?1:e.facing);
        }
        if (prevVx !== 0) { e.facing = (e.vx<0)?-1:((e.vx>0)?1:e.facing); }
        if (rectIntersects(player.x, player.y, player.w, player.h, e.x, e.y, e.w, e.h)) { loseLife(); return; }
      }
    }
  }
  // ANIM TICK
  player.animTime += dt; if (player.onGround && Math.abs(player.vx)>1) { player.animFrame = Math.floor((player.animTime*10)%2); } else { player.animFrame = 0; }
  for (let i=0;i<enemies.length;i++){ const e=enemies[i]; e.animTime += dt; e.animFrame = Math.floor((e.animTime*8)%2); }

  // Bubbles
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.life -= dt; if (b.spawnGrace && b.spawnGrace > 0) b.spawnGrace = Math.max(0, b.spawnGrace - dt);
    if (!b.carrying) { b.vy = Math.min(b.vy + 70*dt, -10); b.vx *= 0.98; }
    else { b.vy = Math.min(b.vy + 50*dt, -12); b.vx *= 0.985; b.carrying.x = b.x - b.carrying.w/2; b.carrying.y = b.y - b.carrying.h/2; }
    b.x += b.vx * dt;
    const nextY = b.y + b.vy * dt;
    if (b.vy < 0) {
      const topNext = nextY - b.r; const tx0 = Math.floor((b.x - b.r + 0.001) / TS); const tx1 = Math.floor((b.x + b.r - 0.001) / TS); const ty = Math.floor(topNext / TS);
      let hit = false; for (let tx = tx0; tx <= tx1; tx++) { if (solidAt(tx, ty)) { hit = true; break; } }
      if (hit) { b.vy = 0; b.y = (ty + 1) * TS + b.r + 0.001; } else { b.y = nextY; }
    } else { b.y = nextY; }

    // Player vs bubble
    if (rectCircleIntersects(player.x, player.y, player.w, player.h, b.x, b.y, b.r)) {
      // Mount if landing from above; otherwise pop (after grace)
      const bubbleTop = b.y - b.r;
      const playerBottom = player.y + player.h;
      const MOUNT_MARGIN = Math.max(6, Math.floor(b.r * 0.9));
      const HORIZ_MARGIN = Math.max(8, Math.floor(b.r * 0.85));
      const fromAbove = (playerBottom <= bubbleTop + MOUNT_MARGIN) && (player.vy >= -80);
      const centered = Math.abs((player.x + player.w/2) - b.x) <= HORIZ_MARGIN;
if (fromAbove && centered) {
        player.ridingBubble = i;
        player.y = bubbleTop - player.h - 0.001;
        player.vy = 0;
        player.onGround = true;
        player.canJump = true;
      } else if (!b.spawnGrace || b.spawnGrace <= 0) {
        if (b.carrying) {
          const missing=[]; for (let mi=0; mi<6; mi++){ if(!extendCollected[mi]) missing.push(mi); }
          if (missing.length>0) { const roundIndex = missing[Math.floor(Math.random()*missing.length)]; spawnLetter(b.x - 4, b.y - 4, EXTEND[roundIndex]); }
          else { spawnPickup(b.x - 4, b.y - 4); }
        }
        playPop(); bubbles.splice(i, 1); if (player.ridingBubble === i) player.ridingBubble = -1;
      }
      continue;
    }

  

    if (b.life <= 0) {
      if (b.carrying) { const escaped = b.carrying; escaped.state = 'walk'; escaped.vx = (Math.random()<0.5?-1:1)*ENEMY_SPEED; escaped.vy = -80; enemies.push(escaped); }
      bubbles.splice(i, 1); if (player.ridingBubble === i) player.ridingBubble = -1; continue;
    }
  }

    // Riding tap-pop
  if (player.ridingBubble >= 0) {
    const i = player.ridingBubble; const b = bubbles[i];
    if (!b) { player.ridingBubble = -1; }
    else {
      player.y = b.y - b.r - player.h - 0.001; player.onGround = true; player.canJump = true;
      // Carry horizontally with the bubble
      player.x += b.vx * dt;
      // Auto-dismount if moved off the bubble top horizontally
      { const cx = player.x + player.w/2; const rideMargin = Math.max(8, b.r - 2); if (Math.abs(cx - b.x) > rideMargin) { player.ridingBubble = -1; player.onGround = false; } }
      if (keys.down || (keys.shoot && player.shootCooldown <= 0)) {
        if (b.carrying) {
          const missing=[]; for (let mi=0; mi<6; mi++){ if(!extendCollected[mi]) missing.push(mi); }
          if (missing.length>0) { const roundIndex = missing[Math.floor(Math.random()*missing.length)]; spawnLetter(b.x - 4, b.y - 4, EXTEND[roundIndex]); }
          else { spawnPickup(b.x - 4, b.y - 4); }
        }
        playPop(); bubbles.splice(i, 1); player.ridingBubble = -1; player.shootCooldown = BUBBLE_CD;
      }
    }
  }

  // Capture
  if (gameState === 'playing') {
    for (let bi = 0; bi < bubbles.length; bi++) {
      const b = bubbles[bi]; if (b.carrying) continue;
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei]; if (e.state !== 'walk') continue;
        if (rectCircleIntersects(e.x, e.y, e.w, e.h, b.x, b.y, b.r)) { e.state='captured'; enemies.splice(ei,1); b.carrying=e; b.life=Math.max(b.life,4.0); b.vx*=0.7; b.vy*=0.7; playCapture(); break; }
      }
    }
  }

  // Pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    // EXTEND letters handled below
    const p = pickups[i]; p.life -= dt; p.vy += GRAV * 0.9 * dt; p.x += p.vx * dt;
    const nextY = p.y + p.vy * dt; const tileY = Math.floor((nextY + p.h) / TS); const left = Math.floor(p.x / TS); const right = Math.floor((p.x + p.w - 0.001) / TS);
    let landed=false; for (let tx = left; tx <= right; tx++) { if (groundAt(tx, tileY)) { landed = true; break; } }
    if (landed) { p.vy = 0; p.y = tileY * TS - p.h - 0.001; p.vx *= 0.98; } else { p.y = nextY; }
    if (rectIntersects(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
      if (p.kind === 'letter' && p.ch) {
        const roundIndex = EXTEND.indexOf(p.ch);
        if (roundIndex >= 0 && !extendCollected[roundIndex]) { extendCollected[roundIndex] = true; updateExtendHUD(); playPickup(); }
        if (extendCollected.every(Boolean)) { world.lives = Math.min(world.lives + 1, 9); world.score += 10000; extendReset(); }
      } else {
        world.score += PICKUP_SCORE; if (world.score > world.hi) world.hi = world.score; playPickup();
      }
      pickups.splice(i, 1); continue;
    }
    if (p.life <= 0) { pickups.splice(i,1); continue; }
  }

  // Round clear
  if (gameState === 'playing') {
    const anyActiveEnemies = enemies.length > 0;
    const anyCarrying = bubbles.some(b => !!b.carrying);
    if (!anyActiveEnemies && !anyCarrying) { gameState = 'roundClear'; stateTimer = 1.6; }
  } else if (gameState === 'roundClear') {
    stateTimer -= dt; if (stateTimer <= 0) { roundIndex = (roundIndex + 1) % LEVELS.length; world.round = roundIndex + 1; applyLevel(roundIndex); gameState = 'roundIntro'; stateTimer = 0.9; }
  }
}

let SPR = null; // loaded sprites

function drawBackground() {
  const w = canvas.width; const h = canvas.height; const b = BORDER_THICKNESS;
  ctx.fillStyle = '#000';
  ctx.fillRect(b, b, w - b * 2, h - b * 2);
}

function drawPlayer() {
  const bob = Math.sin(world.tick * 0.15) * 0.6;
  const y = Math.floor(player.y + bob);
  if (SPR && SPR.player) drawSprite(ctx, SPR.player, Math.floor(player.x), y, player.w, player.h, player.facing <0);
  else { ctx.fillStyle = '#7ff'; ctx.fillRect(Math.floor(player.x), y, player.w, player.h); }
}
function drawEnemies() {
  for (const e of enemies) {
    const bob = Math.sin((world.tick + e.x * 0.1) * 0.1) * 0.4;
    const y = Math.floor(e.y + bob);
    if (SPR && SPR.enemy) drawSprite(ctx, SPR.enemy, Math.floor(e.x), y, e.w, e.h, e.facing<0);
    else { ctx.fillStyle = '#f55'; ctx.fillRect(Math.floor(e.x), y, e.w, e.h); }
  }
}
function drawBubbles() {
  for (const b of bubbles) {
    const alpha = Math.max(0.2, Math.min(1, b.life / 2.4));
    if (SPR && SPR.bubble) { ctx.save(); ctx.globalAlpha = alpha; drawSprite(ctx, SPR.bubble, Math.floor(b.x - b.r), Math.floor(b.y - b.r), b.r*2, b.r*2); ctx.restore(); }
    else { ctx.strokeStyle = `rgba(180,255,255,${alpha})`; ctx.fillStyle = `rgba(90,200,220,${alpha*0.25})`; ctx.beginPath(); ctx.arc(Math.floor(b.x), Math.floor(b.y), b.r, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
    if (b.carrying) {
      const e = b.carrying; if (SPR && SPR.enemy) { ctx.save(); ctx.globalAlpha = 0.6; drawSprite(ctx, SPR.enemy, Math.floor(e.x), Math.floor(e.y), e.w, e.h, (typeof e.facing==='number'?e.facing<0:e.vx<0)); ctx.restore(); } else { ctx.fillStyle = 'rgba(255,120,120,0.6)'; ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.w, e.h); }
    }
  }
}
function drawPickups() {
  for (const p of pickups) {
    if (SPR && SPR.pickup) drawSprite(ctx, SPR.pickup, Math.floor(p.x), Math.floor(p.y), p.w, p.h);
    else { ctx.fillStyle = '#ffda6b'; ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.w, p.h); ctx.strokeStyle = 'rgba(100,50,0,0.4)'; ctx.strokeRect(Math.floor(p.x)+0.5, Math.floor(p.y)+0.5, p.w-1, p.h-1); }
  }
}
function drawTiles() {
  const solidPattern = getStripePattern(1);
  const oneWayPattern = getStripePattern(2);
  const highlightHeight = Math.max(1, Math.round(TS / 8));
  const shadowHeight = Math.max(1, Math.round(TS / 8));
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const t = tileTypeAt(tx, ty);
      if (t === 0) continue;
      const px = tx * TS;
      const py = ty * TS;
      const isOneWay = (t === 2);
      const pattern = isOneWay ? oneWayPattern : solidPattern;
      const style = STRIPE_STYLE[isOneWay ? 'oneWay' : 'solid'];
      ctx.save();
      ctx.fillStyle = pattern || style.base;
      ctx.fillRect(px, py, TS, TS);
      ctx.restore();
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = style.outline;
      ctx.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, py, TS, highlightHeight);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = style.shadow;
      ctx.fillRect(px, py + TS - shadowHeight, TS, shadowHeight);
      ctx.restore();
    }
  }
}

function render() {

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Backdrop
  if (BACKDROP_8.dirty) rebuildBackdrop(world.round || 1);
  if (BACKDROP_8.ctx) ctx.drawImage(BACKDROP_8.canvas, 0, 0);
  drawC64Border(ctx);

  drawBackground();
  drawTiles(); drawBubbles(); drawEnemies(); drawPickups(); drawPlayer();
  ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textBaseline = 'top';
  ctx.fillText(`SCORE ${world.score}`, 8, 8); ctx.fillText(`HI ${world.hi}`, 110, 8); ctx.fillText(`LIVES ${world.lives}`, 8, 20); ctx.fillText(`ROUND ${world.round}`, 160, 8); ctx.fillText('M: music  P: pause  B: palette  T: tiles  O: overlay', 8, 32);
  if (gameState === 'roundIntro') { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 14px monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(`ROUND ${world.round}`, canvas.width/2, canvas.height/2); ctx.textAlign = 'left'; }
  if (gameState === 'roundClear') { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 14px monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText('ROUND CLEAR!', canvas.width/2, canvas.height/2); ctx.textAlign = 'left'; }
  if (gameState === 'gameOver') { ctx.fillStyle = 'rgba(255,180,180,0.95)'; ctx.font = 'bold 16px monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 10); ctx.font = '12px monospace'; ctx.fillText('Press Enter to Restart', canvas.width/2, canvas.height/2 + 12); ctx.textAlign = 'left'; }
  crtPost.render();
}

let running = true; let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); if (SHOW_OVERLAY) drawOverlay(ctx); if (running) requestAnimationFrame(loop); }

async function init() { SPR = await loadSprites(); applyLevel(roundIndex); world.round = roundIndex + 1; requestAnimationFrame(loop); }
init();

function dispatchSpawn(sp) {
  const dir = (sp.dir || 1);
  const tx = (TILE_MIGRATION && TILE_MIGRATION.mode === '8' ? sp.tx * 2 : sp.tx);
  const ty = (TILE_MIGRATION && TILE_MIGRATION.mode === '8' ? sp.ty * 2 : sp.ty);
  if (sp.type==='jumper') return spawnJumper(tx, ty, dir);
  return spawnEnemy(tx, ty, dir);
}

function drawOverlay(ctx) {
  try {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const boxW = 190, boxH = 96; ctx.fillRect(4,4,boxW,boxH);
    ctx.fillStyle = '#0f0';
    let y = 6; const line = (s)=>{ ctx.fillText(s, 8, y); y += 12; };
    line(`TS=${TS} COLS=${COLS} ROWS=${ROWS}`);
    line(`mode=${TILE_MIGRATION.mode} round=${world.round} roundIndex=${roundIndex}`);
    line(`px=${(player.x|0)} py=${(player.y|0)}`);
    line(`vx=${player.vx.toFixed(1)} vy=${player.vy.toFixed(1)}`);
    line(`enemies=${enemies.length} bubbles=${bubbles.length}`);
    ctx.restore();
  } catch {}
}
