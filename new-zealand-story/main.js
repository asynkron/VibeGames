import { initGameCrt } from '../shared/ui/gameCrt.js';
import { initCrtPresetHotkeys } from '../shared/ui/crt.js';
import { createDefaultCrtSettings } from '../shared/config/display.js';
import { LEVELS, TILE_TYPES } from './assets/levels/index.js';
import { loadSprites, drawSprite } from './sprites.js';
import {
  playJump,
  playFlap,
  playArrow,
  playCollect,
  playHit,
  playSplash,
  toggleMusicMute,
  setMusicPaused,
  startMusic,
  stopMusic,
  primeAudio,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D context not available');
ctx.imageSmoothingEnabled = false;

const worldCanvas = document.createElement('canvas');
worldCanvas.width = canvas.width;
worldCanvas.height = canvas.height;
const worldCtx = worldCanvas.getContext('2d');
if (!worldCtx) throw new Error('2D context not available for world');
worldCtx.imageSmoothingEnabled = false;

const crtSettings = createDefaultCrtSettings();
const { post: crtPost } = initGameCrt({
  storageKey: 'kiwi_crt_settings',
  targetContext: ctx,
  defaultSource: worldCanvas,
  settings: crtSettings,
  frameSelector: '.kiwi-screen.crt-frame',
});
initCrtPresetHotkeys({ storageKey: 'kiwi_crt_preset', target: document.documentElement });

primeAudio(window);

const HUD_SCORE = document.getElementById('hud-score');
const HUD_STAGE = document.getElementById('hud-stage');
const HUD_LIVES = document.getElementById('hud-lives');

const TS = 32;
const PLAYER_SPEED = 150;
const PLAYER_ACCEL = 900;
const PLAYER_FRICTION = 1800;
const MAX_FALL_SPEED = 480;
const GRAVITY = 900;
const JUMP_VELOCITY = -360;
const LADDER_SPEED = 110;
const ARROW_SPEED = 360;
const SHOOT_COOLDOWN = 0.32;
const INVULN_TIME = 1.2;
const LEVEL_COMPLETE_DELAY = 2.6;

const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  fire: false,
};

const KEY_BINDINGS = {
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  z: 'jump',
  space: 'jump',
  x: 'fire',
  k: 'fire',
};

function normalizeKey(raw) {
  if (!raw) return '';
  if (raw === ' ') return 'space';
  return raw.toLowerCase();
}

let paused = false;
let sprites = null;

const state = {
  levelIndex: 0,
  score: 0,
  lives: 3,
  stageTimer: 0,
  status: 'title', // title | playing | levelComplete | gameOver
  nextActionTimer: 0,
  message: 'RESCUE THE KIWI CHICKS!',
};

let level = null;
let player = null;
const arrows = [];
const enemies = [];
const collectibles = [];
const popEffects = [];

function setKeyState(event, pressed) {
  const normalizedKey = normalizeKey(event.key);
  let action = KEY_BINDINGS[normalizedKey];
  if (!action) {
    const normalizedCode = normalizeKey(event.code);
    action = KEY_BINDINGS[normalizedCode];
  }
  if (action) {
    keys[action] = pressed;
  }
}

addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.key === 'p' || event.key === 'P') {
    event.preventDefault();
    paused = !paused;
    setMusicPaused(paused);
    return;
  }
  if (event.key === 'm' || event.key === 'M') {
    toggleMusicMute();
    return;
  }
  if (state.status === 'title' && (event.key === 'Enter' || event.key === ' ' || event.key === 'z' || event.key === 'Z')) {
    beginNewGame();
    return;
  }
  if (state.status === 'gameOver' && (event.key === 'Enter' || event.key === 'r' || event.key === 'R')) {
    beginNewGame();
    return;
  }
  setKeyState(event, true);
});

addEventListener('keyup', (event) => {
  setKeyState(event, false);
});

function resetPlayer(spawn) {
  const width = 24;
  const height = 28;
  const startX = spawn ? spawn.x * TS : 1 * TS;
  const startY = spawn ? spawn.y * TS : 1 * TS;
  player = {
    x: startX + (TS - width) / 2,
    y: startY + (TS - height),
    w: width,
    h: height,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    onLadder: false,
    shootTimer: 0,
    invuln: 0,
    animTime: 0,
    stepTimer: 0.18,
    jumpLatch: false,
  };
}

function spawnEnemy(point) {
  const w = 24;
  const h = 26;
  enemies.push({
    x: point.x * TS + (TS - w) / 2,
    y: point.y * TS + (TS - h),
    w,
    h,
    vx: (point.dir ?? (point.x % 2 === 0 ? 1 : -1)) * 60,
    vy: 0,
    onGround: false,
    anim: 0,
  });
}

function spawnCollectible(point) {
  collectibles.push({
    x: point.x * TS + TS / 2,
    y: point.y * TS + TS / 2,
    baseY: point.y * TS + TS / 2,
    phase: Math.random() * Math.PI * 2,
    collected: false,
  });
}

function loadLevel(index) {
  const data = LEVELS[index % LEVELS.length];
  level = {
    ...data,
    width: data.width,
    height: data.height,
    tiles: data.tiles,
    chars: data.chars,
  };
  arrows.length = 0;
  enemies.length = 0;
  collectibles.length = 0;
  popEffects.length = 0;

  if (data.spawns.player) resetPlayer(data.spawns.player);
  else resetPlayer({ x: 1, y: data.height - 3 });
  for (const enemy of data.spawns.enemies) spawnEnemy(enemy);
  for (const item of data.spawns.collectibles) spawnCollectible(item);
  state.stageTimer = 0;
  state.status = 'playing';
  state.nextActionTimer = 0;
  state.message = data.name;
  HUD_STAGE.textContent = String(index + 1);
}

function beginNewGame() {
  state.score = 0;
  state.lives = 3;
  state.levelIndex = 0;
  paused = false;
  HUD_SCORE.textContent = '000000';
  HUD_LIVES.textContent = String(state.lives);
  HUD_STAGE.textContent = '1';
  startMusic();
  loadLevel(state.levelIndex);
  state.status = 'playing';
}

function restartFromCheckpoint() {
  const { levelIndex } = state;
  loadLevel(levelIndex);
  if (player) player.invuln = INVULN_TIME;
  state.status = 'playing';
}

function tileIndex(tx, ty) {
  return ty * level.width + tx;
}

function inBounds(tx, ty) {
  return tx >= 0 && ty >= 0 && tx < level.width && ty < level.height;
}

function tileAt(tx, ty) {
  if (!inBounds(tx, ty)) return TILE_TYPES.solid;
  return level.tiles[tileIndex(tx, ty)];
}

function worldToTile(value) {
  return Math.floor(value / TS);
}

function rectToTiles(x, y, w, h) {
  const left = worldToTile(x);
  const right = worldToTile(x + w - 1);
  const top = worldToTile(y);
  const bottom = worldToTile(y + h - 1);
  return { left, right, top, bottom };
}

function isSolid(tile) {
  return tile === TILE_TYPES.solid;
}

function isPlatform(tile) {
  return tile === TILE_TYPES.platform;
}

function isLadder(tile) {
  return tile === TILE_TYPES.ladder;
}

function isWater(tile) {
  return tile === TILE_TYPES.water;
}

function isGoal(tile) {
  return tile === TILE_TYPES.goal;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function moveHorizontal(entity, dt) {
  if (!entity.vx) return;
  entity.x += entity.vx * dt;
  const { left, right, top, bottom } = rectToTiles(entity.x, entity.y, entity.w, entity.h);
  if (entity.vx > 0) {
    for (let ty = top; ty <= bottom; ty += 1) {
      const tile = tileAt(right, ty);
      if (isSolid(tile)) {
        entity.x = right * TS - entity.w;
        entity.vx = 0;
        break;
      }
    }
  } else if (entity.vx < 0) {
    for (let ty = top; ty <= bottom; ty += 1) {
      const tile = tileAt(left, ty);
      if (isSolid(tile)) {
        entity.x = (left + 1) * TS;
        entity.vx = 0;
        break;
      }
    }
  }
}

function moveVertical(entity, dt) {
  if (!entity.vy) return;
  const prevY = entity.y;
  entity.y += entity.vy * dt;
  const bounds = rectToTiles(entity.x, entity.y, entity.w, entity.h);
  const prevBounds = rectToTiles(entity.x, prevY, entity.w, entity.h);
  entity.onGround = false;

  if (entity.vy > 0) {
    const bottom = bounds.bottom;
    for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
      const tile = tileAt(tx, bottom);
      if (isSolid(tile) || (isPlatform(tile) && prevBounds.bottom < bottom)) {
        entity.y = bottom * TS - entity.h;
        entity.vy = 0;
        entity.onGround = true;
        break;
      }
    }
  } else if (entity.vy < 0) {
    const top = bounds.top;
    for (let tx = bounds.left; tx <= bounds.right; tx += 1) {
      const tile = tileAt(tx, top);
      if (isSolid(tile)) {
        entity.y = (top + 1) * TS;
        entity.vy = 0;
        break;
      }
    }
  }
}

function detectLadder(entity) {
  const { left, right, top, bottom } = rectToTiles(entity.x + entity.w * 0.2, entity.y + entity.h * 0.25, entity.w * 0.6, entity.h * 0.6);
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (isLadder(tileAt(tx, ty))) return true;
    }
  }
  return false;
}

function checkHazards(entity) {
  const { left, right, top, bottom } = rectToTiles(entity.x, entity.y, entity.w, entity.h);
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      const tile = tileAt(tx, ty);
      if (isWater(tile)) return 'water';
      if (isGoal(tile)) return 'goal';
    }
  }
  return null;
}

function applyPlayerPhysics(dt) {
  const targetDir = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  if (targetDir !== 0) {
    player.vx += targetDir * PLAYER_ACCEL * dt;
    player.facing = targetDir;
  } else {
    const friction = Math.min(Math.abs(player.vx), PLAYER_FRICTION * dt);
    player.vx -= Math.sign(player.vx) * friction;
  }
  player.vx = clamp(player.vx, -PLAYER_SPEED, PLAYER_SPEED);

  player.onLadder = detectLadder(player);

  if (player.onLadder) {
    if (keys.up) player.vy = -LADDER_SPEED;
    else if (keys.down) player.vy = LADDER_SPEED;
    else player.vy = 0;
  } else {
    player.vy += GRAVITY * dt;
    player.vy = clamp(player.vy, -Infinity, MAX_FALL_SPEED);
  }

  const wantsJump = keys.jump;
  if (wantsJump && player.onLadder && !player.jumpLatch) {
    player.onLadder = false;
    player.vy = JUMP_VELOCITY * 0.85;
    playJump();
  } else if (wantsJump && player.onGround && !player.jumpLatch) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
    playJump();
  }
  player.jumpLatch = wantsJump;

  moveHorizontal(player, dt);
  moveVertical(player, dt);

  const hazard = checkHazards(player);
  if (hazard === 'water') {
    handlePlayerHit('splash');
  } else if (hazard === 'goal') {
    handleLevelComplete();
  }

  if (player.invuln > 0) player.invuln -= dt;

  if (player.y > level.height * TS + 32) {
    handlePlayerHit('fall');
  }

  if (targetDir !== 0 && (player.onGround || player.onLadder)) {
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      playFlap();
      player.stepTimer = player.onLadder ? 0.28 : 0.18;
    }
  } else {
    player.stepTimer = Math.min(player.stepTimer, 0.12);
  }

  player.shootTimer = Math.max(0, player.shootTimer - dt);
  player.animTime += dt;
}


function spawnArrow() {
  if (player.shootTimer > 0) return;
  player.shootTimer = SHOOT_COOLDOWN;
  const facing = player.facing >= 0 ? 1 : -1;
  const arrow = {
    x: player.x + player.w / 2 + facing * 12,
    y: player.y + player.h * 0.55,
    vx: ARROW_SPEED * facing,
    vy: 0,
    lifetime: 1.5,
  };
  arrows.push(arrow);
  playArrow();
}

function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i -= 1) {
    const arrow = arrows[i];
    arrow.x += arrow.vx * dt;
    arrow.lifetime -= dt;
    if (arrow.lifetime <= 0) {
      arrows.splice(i, 1);
      continue;
    }
    const tx = worldToTile(arrow.x);
    const ty = worldToTile(arrow.y);
    if (!inBounds(tx, ty) || isSolid(tileAt(tx, ty)) || isPlatform(tileAt(tx, ty))) {
      arrows.splice(i, 1);
      continue;
    }
    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      if (
        arrow.x >= enemy.x - 8 &&
        arrow.x <= enemy.x + enemy.w + 8 &&
        arrow.y >= enemy.y &&
        arrow.y <= enemy.y + enemy.h
      ) {
        enemies.splice(j, 1);
        arrows.splice(i, 1);
        createPopEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#64b7ff');
        addScore(300);
        playHit();
        break;
      }
    }
  }
}

function createPopEffect(x, y, color) {
  popEffects.push({ x, y, color, life: 0.4 });
}

function updatePopEffects(dt) {
  for (let i = popEffects.length - 1; i >= 0; i -= 1) {
    const fx = popEffects[i];
    fx.life -= dt;
    if (fx.life <= 0) popEffects.splice(i, 1);
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    enemy.vy += GRAVITY * dt;
    enemy.vy = clamp(enemy.vy, -Infinity, MAX_FALL_SPEED);
    moveHorizontal(enemy, dt);
    moveVertical(enemy, dt);

    const aheadX = enemy.vx >= 0 ? enemy.x + enemy.w + 6 : enemy.x - 6;
    const aheadFootY = enemy.y + enemy.h + 4;
    const aheadTileX = worldToTile(aheadX);
    const aheadTileY = worldToTile(aheadFootY);
    if (enemy.onGround && (!inBounds(aheadTileX, aheadTileY) || (!isSolid(tileAt(aheadTileX, aheadTileY)) && !isPlatform(tileAt(aheadTileX, aheadTileY))))) {
      enemy.vx = -enemy.vx;
    }

    if (enemy.vx === 0) enemy.vx = (Math.random() < 0.5 ? -1 : 1) * 60;

    if (rectIntersect(enemy, player) && player.invuln <= 0) {
      handlePlayerHit('enemy');
    }
  }
}

function rectIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function updateCollectibles(dt) {
  for (let i = collectibles.length - 1; i >= 0; i -= 1) {
    const item = collectibles[i];
    item.phase += dt * 4;
    item.y = item.baseY + Math.sin(item.phase) * 6;
    if (!item.collected && Math.abs(player.x + player.w / 2 - item.x) < 18 && Math.abs(player.y + player.h / 2 - item.y) < 24) {
      item.collected = true;
      collectibles.splice(i, 1);
      addScore(200);
      createPopEffect(item.x, item.y, '#f6ba4a');
      playCollect();
    }
  }
}

function addScore(amount) {
  state.score += amount;
  HUD_SCORE.textContent = state.score.toString().padStart(6, '0');
}

function handlePlayerHit(reason) {
  if (player.invuln > 0) return;
  if (reason === 'splash') {
    playSplash();
  } else {
    playHit();
  }
  state.lives -= 1;
  HUD_LIVES.textContent = String(Math.max(0, state.lives));
  if (state.lives < 0) {
    gameOver();
    return;
  }
  restartFromCheckpoint();
}

function handleLevelComplete() {
  state.status = 'levelComplete';
  state.nextActionTimer = LEVEL_COMPLETE_DELAY;
  addScore(500);
  state.message = 'STAGE CLEAR!';
}

function gameOver() {
  state.status = 'gameOver';
  state.message = 'THE ZOO KEEPER WON...';
  stopMusic();
}

function advanceLevel() {
  state.levelIndex = (state.levelIndex + 1) % LEVELS.length;
  if (state.levelIndex === 0) {
    state.lives += 1;
    HUD_LIVES.textContent = String(state.lives);
  }
  loadLevel(state.levelIndex);
}

function update(dt) {
  if (!sprites) return;
  if (paused) return;

  state.stageTimer += dt;

  switch (state.status) {
    case 'title':
      return;
    case 'playing':
      applyPlayerPhysics(dt);
      if (keys.fire) spawnArrow();
      updateArrows(dt);
      updateEnemies(dt);
      updateCollectibles(dt);
      updatePopEffects(dt);
      break;
    case 'levelComplete':
      state.nextActionTimer -= dt;
      if (state.nextActionTimer <= 0) advanceLevel();
      updatePopEffects(dt);
      break;
    case 'gameOver':
      updatePopEffects(dt);
      break;
    default:
      break;
  }
}

function drawBackdrop(context) {
  context.fillStyle = '#041025';
  context.fillRect(0, 0, worldCanvas.width, worldCanvas.height);
  const stripeHeight = 32;
  context.fillStyle = 'rgba(22, 48, 85, 0.4)';
  for (let y = 0; y < worldCanvas.height; y += stripeHeight * 2) {
    context.fillRect(0, y, worldCanvas.width, stripeHeight);
  }
  context.save();
  const gradient = context.createLinearGradient(0, 0, 0, worldCanvas.height);
  gradient.addColorStop(0, 'rgba(62, 126, 218, 0.4)');
  gradient.addColorStop(1, 'rgba(9, 17, 34, 0.6)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, worldCanvas.width, worldCanvas.height);
  context.restore();
}

function drawTiles(context) {
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const tile = level.tiles[tileIndex(x, y)];
      if (tile === TILE_TYPES.empty) continue;
      const px = x * TS;
      const py = y * TS;
      if (tile === TILE_TYPES.solid) {
        context.fillStyle = '#0d2c5a';
        context.fillRect(px, py, TS, TS);
        context.fillStyle = '#1f4c8d';
        context.fillRect(px + 2, py + 2, TS - 4, TS - 4);
      } else if (tile === TILE_TYPES.platform) {
        context.fillStyle = '#f6b947';
        context.fillRect(px, py + TS - 6, TS, 6);
        context.fillStyle = '#a35b1b';
        context.fillRect(px, py + TS - 2, TS, 2);
      } else if (tile === TILE_TYPES.ladder) {
        context.fillStyle = '#ffb468';
        context.fillRect(px + 10, py, 4, TS);
        context.fillRect(px + TS - 14, py, 4, TS);
        context.fillStyle = '#d77b1c';
        for (let rung = 6; rung < TS; rung += 10) {
          context.fillRect(px + 4, py + rung, TS - 8, 3);
        }
      } else if (tile === TILE_TYPES.water) {
        const waterGradient = context.createLinearGradient(px, py, px, py + TS);
        waterGradient.addColorStop(0, '#1b78d5');
        waterGradient.addColorStop(1, '#0a356a');
        context.fillStyle = waterGradient;
        context.fillRect(px, py, TS, TS);
      } else if (tile === TILE_TYPES.goal) {
        drawSprite(context, sprites.goal, px + TS / 2, py + TS, { anchorX: 0.5, anchorY: 1 });
      }
    }
  }
}

function drawPlayer(context) {
  if (!player) return;
  const flicker = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0;
  if (flicker) return;
  const frames = sprites.player;
  const frame = Math.floor(player.animTime * 8) % frames.length;
  drawSprite(context, frames[frame], player.x + player.w / 2, player.y + player.h, {
    anchorX: 0.5,
    anchorY: 1,
    flipX: player.facing < 0,
  });
}

function drawEnemies(context) {
  for (const enemy of enemies) {
    drawSprite(context, sprites.enemy[0], enemy.x + enemy.w / 2, enemy.y + enemy.h, {
      anchorX: 0.5,
      anchorY: 1,
      flipX: enemy.vx < 0,
    });
  }
}

function drawArrows(context) {
  for (const arrow of arrows) {
    drawSprite(context, sprites.arrow, arrow.x, arrow.y, {
      anchorX: arrow.vx > 0 ? 0 : 1,
      anchorY: 0.5,
      flipX: arrow.vx < 0,
    });
  }
}

function drawCollectibles(context) {
  for (const item of collectibles) {
    drawSprite(context, sprites.collectible, item.x, item.y, {
      anchorX: 0.5,
      anchorY: 0.5,
    });
  }
}

function drawPopEffects(context) {
  for (const fx of popEffects) {
    const alpha = clamp(fx.life / 0.4, 0, 1);
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = fx.color;
    context.beginPath();
    context.arc(fx.x, fx.y, (1 - alpha) * 24 + 6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.85)';
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }
}

function drawOverlay(context) {
  context.save();
  context.fillStyle = 'rgba(8, 16, 32, 0.75)';
  context.fillRect(64, 120, canvas.width - 128, 120);
  context.fillStyle = '#fddc6c';
  context.font = '18px "Press Start 2P", "VT323", monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(state.message, canvas.width / 2, canvas.height / 2 - 20);
  context.font = '12px "Press Start 2P", "VT323", monospace';
  if (state.status === 'title') {
    context.fillText('PRESS ENTER OR Z TO BEGIN', canvas.width / 2, canvas.height / 2 + 16);
  } else if (state.status === 'levelComplete') {
    context.fillText('PREPARE FOR THE NEXT STAGE', canvas.width / 2, canvas.height / 2 + 16);
  } else if (state.status === 'gameOver') {
    context.fillText('PRESS ENTER TO TRY AGAIN', canvas.width / 2, canvas.height / 2 + 16);
  }
  context.restore();
}

function render() {
  drawBackdrop(worldCtx);
  if (level) {
    drawTiles(worldCtx);
    drawCollectibles(worldCtx);
    drawEnemies(worldCtx);
    drawPlayer(worldCtx);
    drawArrows(worldCtx);
    drawPopEffects(worldCtx);
  }

  if (state.status === 'title' || state.status === 'levelComplete' || state.status === 'gameOver') {
    drawOverlay(worldCtx);
  }

  crtPost.render();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

async function init() {
  HUD_SCORE.textContent = '000000';
  HUD_STAGE.textContent = '1';
  HUD_LIVES.textContent = '3';
  sprites = await loadSprites();
  state.status = 'title';
  state.message = 'RESCUE THE KIWI CHICKS!';
  stopMusic();
  requestAnimationFrame(loop);
}

init();
