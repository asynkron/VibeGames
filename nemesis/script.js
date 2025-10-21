import { createBeeper } from '../shared/audio/beeper.js';
import { createDPad } from '../shared/input/dpad.js';
import { createPixelContext } from '../shared/render/pixelCanvas.js';
import { initGameCrt } from '../shared/ui/gameCrt.js';
import { createOverlayFX } from '../shared/fx/overlay.js';
import { applyAmbientLighting } from '../shared/fx/lighting.js';
import {
  DEFAULT_TILE_SIZE,
  createDefaultCrtSettings,
} from '../shared/config/display.js';

(() => {
  const canvas = document.getElementById('game');
  // Enable alpha on the main canvas so the lighting mask can punch holes through
  // the ambient overlay instead of clearing to opaque black.
  const pixel = createPixelContext(canvas);
  const { ctx } = pixel;

  const crtSettings = createDefaultCrtSettings({ warp: 0.1, aberration: 0.07 });
  const { post: crtPost } = initGameCrt({
    storageKey: 'nemesis_crt_settings',
    settings: crtSettings,
    defaults: crtSettings,
    targetContext: ctx,
  });
  const overlay = createOverlayFX({ ctx, width: canvas.width, height: canvas.height });
  const { startShockwave, drawShockwave, screenFlash, drawFlash, startIris, drawIris, setBounds } = overlay;

  const beeper = createBeeper({ masterGain: 0.14 });
  beeper.unlockWithGestures();
  const shotTone = beeper.createPreset({ freq: 820, dur: 0.08, type: 'square', gain: 0.05 });
  const explosionTone = beeper.createPreset({ freq: 150, dur: 0.25, type: 'sawtooth', gain: 0.06 });
  const hitTone = beeper.createPreset({ freq: 480, dur: 0.12, type: 'triangle', gain: 0.04 });

  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const stageEl = document.getElementById('stage');
  const fpsEl = document.getElementById('fps');

  const TILE = DEFAULT_TILE_SIZE;
  const COLS = 40;
  const ROWS = 28;
  pixel.resizeToGrid(COLS, ROWS, TILE);

  const SCREEN_WIDTH = canvas.width;
  const SCREEN_HEIGHT = canvas.height;
  setBounds({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  const LEVEL_COLUMNS = 256;
  const LEVEL_LENGTH = LEVEL_COLUMNS * TILE;

  const settings = {
    scrollSpeed: 48,
    playerSpeed: 110,
    verticalSpeed: 98,
    fireInterval: 0.14,
    ambientLight: 0.62,
  };

  const COLORS = {
    space: '#02040b',
    star: '#6fd9ff',
    starAlt: '#9fe8ff',
    floorBase: '#071c34',
    floorEdge: '#2d8cff',
    floorGlow: '#0a375d',
    ceilingBase: '#051427',
    ceilingEdge: '#39a2ff',
    hazard: '#4a1e74',
    hazardEdge: '#c59bff',
    playerBody: '#bff7ff',
    playerAccent: '#60e2ff',
    playerEngine: '#ffb35e',
    playerOutline: '#0c2648',
    bullet: '#a6f6ff',
    enemy: '#ff9b5b',
    enemyAccent: '#ffe07d',
    enemyBullet: '#ff8a9f',
    turret: '#7e6bff',
    pause: 'rgba(14, 20, 40, 0.75)',
    text: '#f4faff',
  };

  let terrain = buildTerrain(1);

  const stars = createStars(90);
  const bullets = [];
  const enemyBullets = [];
  const enemies = [];
  const particles = [];
  const lights = [];

  const lightCanvas = document.createElement('canvas');
  const lightCtx = lightCanvas.getContext('2d');

  const player = {
    x: SCREEN_WIDTH * 0.24,
    y: SCREEN_HEIGHT * 0.5,
    width: 18,
    height: 12,
    fireTimer: 0,
    invincible: 2,
    tilt: 0,
  };

  const state = {
    cameraX: 0,
    stage: 1,
    score: 0,
    lives: 3,
    paused: false,
    gameOver: false,
    spawnTimer: 1.4,
    fpsTimer: 0,
    fpsFrames: 0,
  };

  const keys = { up: false, down: false, left: false, right: false, fire: false };

  const dpad = createDPad({ preventDefault: true, pauseKeys: ['p'], restartKeys: ['r'] });
  dpad.onDirectionChange((dir) => {
    keys.up = dir === 'up';
    keys.down = dir === 'down';
    keys.left = dir === 'left';
    keys.right = dir === 'right';
  });
  dpad.onPause(() => {
    if (state.gameOver) return;
    state.paused = !state.paused;
  });
  dpad.onRestart(() => {
    beeper.resume();
    resetGame();
  });
  dpad.onKeyChange([' ', 'space'], (pressed) => {
    keys.fire = pressed;
    if (pressed) beeper.resume();
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ') {
      keys.fire = true;
      beeper.resume();
    } else if (key === 'p') {
      if (!state.gameOver) state.paused = !state.paused;
    } else if (key === 'r') {
      beeper.resume();
      resetGame();
    }
  });
  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === ' ') keys.fire = false;
  });

  function resetGame() {
    state.cameraX = 0;
    state.stage = 1;
    state.score = 0;
    state.lives = 3;
    state.paused = false;
    state.gameOver = false;
    state.spawnTimer = 1.4;
    player.x = SCREEN_WIDTH * 0.24;
    player.y = SCREEN_HEIGHT * 0.5;
    player.fireTimer = 0;
    player.invincible = 2;
    player.tilt = 0;
    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    terrain = buildTerrain(state.stage);
    startIris('in', 900);
    updateHud(true);
  }

  function advanceStage() {
    state.stage += 1;
    state.cameraX = 0;
    state.spawnTimer = Math.max(0.85, 1.4 - state.stage * 0.08);
    enemies.length = 0;
    enemyBullets.length = 0;
    bullets.length = 0;
    particles.length = 0;
    terrain = buildTerrain(state.stage);
    player.x = SCREEN_WIDTH * 0.24;
    player.y = Math.min(player.y, SCREEN_HEIGHT - TILE * 4);
    player.invincible = 2;
    startIris('in', 750);
    updateHud(true);
  }

  function updateHud(force = false) {
    scoreEl.textContent = `${state.score}`;
    livesEl.textContent = `${state.lives}`;
    stageEl.textContent = `${state.stage}`;
    if (force) fpsEl.textContent = '';
  }

  function createStars(count) {
    return Array.from({ length: count }, () => ({
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      depth: Math.random(),
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function updateStars(dt) {
    for (const star of stars) {
      star.x -= settings.scrollSpeed * dt * (0.25 + star.depth * 0.7);
      if (star.x < -6) {
        star.x = SCREEN_WIDTH + Math.random() * SCREEN_WIDTH * 0.4;
        star.y = Math.random() * SCREEN_HEIGHT;
      }
    }
  }

  function drawStars(now) {
    ctx.save();
    for (const star of stars) {
      const twinkle = 0.4 + 0.6 * Math.sin(star.twinkle + now * 0.0045);
      const alpha = 0.35 + twinkle * 0.45 * (0.4 + star.depth * 0.6);
      const size = 1 + star.depth * 2;
      ctx.fillStyle = star.depth > 0.5
        ? `rgba(159, 232, 255, ${alpha})`
        : `rgba(111, 217, 255, ${alpha})`;
      ctx.fillRect(Math.round(star.x), Math.round(star.y), size, size);
    }
    ctx.restore();
  }

  function drawBackground(now) {
    ctx.fillStyle = COLORS.space;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    drawStars(now);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function wrapColumn(index) {
    let wrapped = index % LEVEL_COLUMNS;
    if (wrapped < 0) wrapped += LEVEL_COLUMNS;
    return wrapped;
  }

  // Procedurally carve a repeating cavern profile using trigonometric waves and
  // a few deterministic pillars so each stage feels familiar yet distinct.
  function buildTerrain(stage = 1) {
    const mask = Array.from({ length: ROWS }, () => new Uint8Array(LEVEL_COLUMNS));
    const floorTop = new Array(LEVEL_COLUMNS).fill(SCREEN_HEIGHT);
    const ceilingBottom = new Array(LEVEL_COLUMNS).fill(0);

    const baseFloor = 3.4 + Math.min(stage, 6) * 0.3;
    const baseCeiling = 2.0 + Math.min(stage, 4) * 0.15;

    for (let x = 0; x < LEVEL_COLUMNS; x += 1) {
      const wave = Math.sin(x * 0.08 + stage * 0.5) * 1.6 + Math.sin(x * 0.023 + stage * 0.18) * 1.1;
      const floorDepth = clamp(Math.round(baseFloor + wave + ((x % 48 < 14) ? 1 : 0)), 2, Math.floor(ROWS * 0.45));
      const floorStart = ROWS - floorDepth;
      for (let y = floorStart; y < ROWS; y += 1) {
        mask[y][x] = 1;
      }

      const ceilingWave = Math.cos(x * 0.06 + stage * 0.4) * 1.1 + Math.sin(x * 0.031) * 0.8;
      const ceilingDepth = clamp(Math.round(baseCeiling + ceilingWave + ((x % 64 > 50) ? 1 : 0)), 0, Math.floor(ROWS * 0.35));
      for (let y = 0; y < ceilingDepth; y += 1) {
        mask[y][x] = 1;
      }

      if (x % 52 === 18) {
        const pillarHeight = clamp(3 + (stage % 3), 3, Math.floor(ROWS * 0.4));
        for (let y = Math.max(0, floorStart - pillarHeight); y < floorStart; y += 1) {
          mask[y][x] = 1;
        }
      }

      if (x % 68 === 32) {
        const drop = 3 + ((stage + x) % 3);
        const ceilingEnd = ceilingDepth;
        for (let y = ceilingEnd; y < Math.min(ROWS, ceilingEnd + drop); y += 1) {
          mask[y][x] = 1;
        }
      }

      if (x % 72 === 45) {
        const mid = Math.floor(ROWS * 0.42 + Math.sin(x * 0.11) * 2);
        for (let y = mid; y < Math.min(ROWS, mid + 2 + (stage & 1)); y += 1) {
          mask[y][x] = 1;
        }
      }
    }

    for (let x = 0; x < LEVEL_COLUMNS; x += 1) {
      let top = 0;
      while (top < ROWS && mask[top][x]) top += 1;
      ceilingBottom[x] = top * TILE;

      let bottom = ROWS - 1;
      while (bottom >= 0 && !mask[bottom][x]) bottom -= 1;
      if (bottom < 0) {
        floorTop[x] = SCREEN_HEIGHT;
      } else {
        let topSolid = bottom;
        while (topSolid >= 0 && mask[topSolid][x]) topSolid -= 1;
        floorTop[x] = (topSolid + 1) * TILE;
      }
    }

    return { mask, floorTop, ceilingBottom };
  }

  function getFloor(worldX) {
    const column = wrapColumn(Math.floor(worldX / TILE));
    return terrain.floorTop[column];
  }

  function getCeiling(worldX) {
    const column = wrapColumn(Math.floor(worldX / TILE));
    return terrain.ceilingBottom[column];
  }

  function isSolid(worldX, worldY) {
    const col = wrapColumn(Math.floor(worldX / TILE));
    const row = Math.floor(worldY / TILE);
    if (row < 0 || row >= ROWS) return false;
    return terrain.mask[row][col] === 1;
  }

  function updatePlayer(dt) {
    player.fireTimer = Math.max(0, player.fireTimer - dt);
    if (player.invincible > 0) player.invincible = Math.max(0, player.invincible - dt);

    const horiz = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const vert = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    player.x += horiz * settings.playerSpeed * dt;
    player.y += vert * settings.verticalSpeed * dt;

    player.x = clamp(player.x, TILE * 2, SCREEN_WIDTH * 0.7);
    player.y = clamp(player.y, TILE * 2, SCREEN_HEIGHT - TILE * 2);

    player.tilt = player.tilt * 0.9 + (-vert) * 0.18;

    if (keys.fire && player.fireTimer <= 0 && !state.gameOver) {
      spawnPlayerShot();
      player.fireTimer = Math.max(0.08, settings.fireInterval * (0.95 - state.stage * 0.02));
    }

    const worldLeft = state.cameraX + player.x - player.width * 0.45;
    const worldRight = state.cameraX + player.x + player.width * 0.45;
    const worldTop = player.y - player.height * 0.5;
    const worldBottom = player.y + player.height * 0.5;

    if (player.invincible <= 0) {
      if (
        isSolid(worldLeft, worldTop) ||
        isSolid(worldRight, worldTop) ||
        isSolid(worldLeft, worldBottom) ||
        isSolid(worldRight, worldBottom) ||
        worldBottom >= getFloor(state.cameraX + player.x) - 1 ||
        worldTop <= getCeiling(state.cameraX + player.x) + 1
      ) {
        loseLife();
      }
    }
  }

  function spawnPlayerShot() {
    const worldX = state.cameraX + player.x + player.width * 0.55;
    bullets.push({
      x: worldX,
      y: player.y - 1,
      vx: 380,
      life: 1.4,
    });
    shotTone();
  }

  function spawnSpark(x, y, color = '#9de6ff') {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.6) * 80,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 2,
      color,
      gravity: 60,
      glow: { radius: 28, color: 'rgba(140, 220, 255, 0.4)' },
    });
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x - state.cameraX > SCREEN_WIDTH + 40) {
        bullets.splice(i, 1);
        continue;
      }
      if (isSolid(bullet.x, bullet.y)) {
        spawnSpark(bullet.x, bullet.y);
        bullets.splice(i, 1);
        continue;
      }
      for (let j = enemies.length - 1; j >= 0; j -= 1) {
        const enemy = enemies[j];
        const dx = enemy.x - bullet.x;
        const dy = enemy.y - bullet.y;
        if (dx * dx + dy * dy < 18 * 18) {
          damageEnemy(enemy, 1, bullet.x, bullet.y);
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  function updateEnemyBullets(dt) {
    for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
      const shot = enemyBullets[i];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (shot.life <= 0 || shot.x - state.cameraX < -40 || shot.x - state.cameraX > SCREEN_WIDTH + 40) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (isSolid(shot.x, shot.y)) {
        spawnSpark(shot.x, shot.y, '#ff9ea8');
        enemyBullets.splice(i, 1);
        continue;
      }
      if (player.invincible <= 0) {
        const dx = (state.cameraX + player.x) - shot.x;
        const dy = player.y - shot.y;
        if (dx * dx + dy * dy < 12 * 12) {
          enemyBullets.splice(i, 1);
          loseLife();
        }
      }
    }
  }

  function updateEnemies(dt, now) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemyWave();
      state.spawnTimer = Math.max(0.75, 1.6 - state.stage * 0.09);
    }

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      if (enemy.type === 'fighter') {
        enemy.x += enemy.vx * dt;
        enemy.t += dt;
        enemy.y = enemy.baseY + Math.sin(enemy.t * enemy.frequency) * enemy.amplitude;
        if (enemy.fireTimer > 0) enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          enemy.fireTimer = 1.2 - Math.min(0.6, state.stage * 0.08) + Math.random() * 0.4;
          enemyBullets.push({
            x: enemy.x - enemy.width * 0.3,
            y: enemy.y,
            vx: -160,
            vy: 60 * Math.sin(enemy.t * 1.4),
            life: 2.4,
          });
        }
      } else if (enemy.type === 'turret') {
        if (enemy.fireTimer > 0) enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          enemy.fireTimer = 1.6 - Math.min(0.7, state.stage * 0.05) + Math.random() * 0.6;
          const dir = Math.atan2(player.y - enemy.y, (state.cameraX + player.x) - enemy.x);
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y - enemy.height * 0.3,
            vx: Math.cos(dir) * 180,
            vy: Math.sin(dir) * 180,
            life: 2.8,
          });
        }
      }

      if (isSolid(enemy.x, enemy.y)) {
        spawnExplosion(enemy.x, enemy.y, { count: 8, radius: 70 });
        enemies.splice(i, 1);
        continue;
      }

      const screenX = enemy.x - state.cameraX;
      if (screenX < -60) {
        enemies.splice(i, 1);
      }
    }
  }

  function spawnEnemyWave() {
    const rightEdge = state.cameraX + SCREEN_WIDTH + TILE * 4;
    const typeRoll = Math.random();
    if (typeRoll < 0.65) {
      const band = SCREEN_HEIGHT * 0.2;
      for (let i = 0; i < 3; i += 1) {
        const offsetY = band + i * (SCREEN_HEIGHT - band * 2) / 3 + Math.sin((state.stage + i) * 0.5) * 14;
        enemies.push({
          type: 'fighter',
          x: rightEdge + i * 36,
          y: offsetY,
          baseY: offsetY,
          amplitude: 16 + Math.random() * 18,
          frequency: 1.5 + Math.random() * 0.6,
          vx: -90 - state.stage * 8,
          fireTimer: 0.6 + Math.random() * 0.4,
          width: 16,
          height: 12,
          hp: 2,
          t: Math.random() * Math.PI,
          score: 180,
        });
      }
    } else {
      const spawnX = rightEdge + 40;
      const floor = getFloor(spawnX) - TILE * 0.5;
      enemies.push({
        type: 'turret',
        x: spawnX,
        y: floor,
        width: 18,
        height: TILE * 2,
        hp: 4,
        fireTimer: 0.6,
        score: 260,
      });
    }
  }

  function damageEnemy(enemy, amount, hitX, hitY) {
    enemy.hp -= amount;
    hitTone();
    spawnSpark(hitX, hitY, '#ffe7a1');
    if (enemy.hp <= 0) {
      killEnemy(enemy);
    }
  }

  function killEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index !== -1) enemies.splice(index, 1);
    state.score += enemy.score ?? 200;
    updateHud();
    spawnExplosion(enemy.x, enemy.y, { count: 14, radius: 96 });
    explosionTone();
  }

  function spawnExplosion(x, y, options = {}) {
    const count = options.count ?? 12;
    const radius = options.radius ?? 80;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 2 + Math.random() * 2,
        color: i % 2 === 0 ? '#ffdca1' : '#ff7e4d',
        gravity: 30,
        glow: { radius, color: 'rgba(255, 180, 120, 0.45)' },
      });
    }
    startShockwave(x - state.cameraX, y, { innerRadius: 12, duration: 520 });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity ?? 0) * dt;
    }
  }

  function loseLife() {
    if (player.invincible > 0 || state.gameOver) return;
    state.lives -= 1;
    player.invincible = 2.4;
    screenFlash({ strength: 0.22, duration: 260 });
    spawnExplosion(state.cameraX + player.x, player.y, { count: 18, radius: 110 });
    if (state.lives <= 0) {
      state.gameOver = true;
      startIris('out', 1100);
    }
    updateHud();
  }

  function drawTerrain() {
    const startColumn = Math.floor(state.cameraX / TILE);
    const offsetX = -(state.cameraX % TILE);

    for (let screenCol = -1; screenCol <= COLS + 1; screenCol += 1) {
      const columnIndex = wrapColumn(startColumn + screenCol);
      const baseX = offsetX + screenCol * TILE;
      if (baseX > SCREEN_WIDTH || baseX + TILE < -TILE) continue;

      const floorRow = Math.floor(terrain.floorTop[columnIndex] / TILE);
      const ceilingRow = Math.floor(terrain.ceilingBottom[columnIndex] / TILE);

      for (let row = 0; row < ROWS; row += 1) {
        if (!terrain.mask[row][columnIndex]) continue;
        const px = baseX;
        const py = row * TILE;
        if (row >= floorRow) {
          ctx.fillStyle = COLORS.floorBase;
          ctx.fillRect(px, py, TILE, TILE);
          if (row === floorRow) {
            ctx.fillStyle = COLORS.floorEdge;
            ctx.fillRect(px, py, TILE, 2);
            ctx.fillStyle = COLORS.floorGlow;
            ctx.fillRect(px, py + 2, TILE, 1);
          }
        } else if (row < ceilingRow) {
          ctx.fillStyle = COLORS.ceilingBase;
          ctx.fillRect(px, py, TILE, TILE);
          if (row === ceilingRow - 1) {
            ctx.fillStyle = COLORS.ceilingEdge;
            ctx.fillRect(px, py + TILE - 2, TILE, 2);
          }
        } else {
          ctx.fillStyle = COLORS.hazard;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = COLORS.hazardEdge;
          ctx.fillRect(px, py, TILE, 1);
        }
      }
    }
  }

  function drawParticles() {
    ctx.save();
    for (const p of particles) {
      const screenX = p.x - state.cameraX;
      if (screenX < -20 || screenX > SCREEN_WIDTH + 20) continue;
      const alpha = clamp(p.life / (p.maxLife ?? 1), 0, 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(screenX - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      if (p.glow) {
        lights.push({
          x: screenX,
          y: p.y,
          radius: p.glow.radius ?? 60,
          innerRadius: 8,
          innerStop: 0.2,
          color: p.glow.color ?? 'rgba(255, 200, 150, 0.4)',
        });
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBullets() {
    ctx.fillStyle = COLORS.bullet;
    for (const bullet of bullets) {
      const screenX = bullet.x - state.cameraX;
      if (screenX < -8 || screenX > SCREEN_WIDTH + 8) continue;
      ctx.fillRect(screenX - 1, bullet.y - 1, 4, 2);
      lights.push({
        x: screenX + 1,
        y: bullet.y,
        radius: 34,
        innerRadius: 4,
        innerStop: 0.1,
        color: 'rgba(140, 230, 255, 0.55)',
      });
    }
  }

  function drawEnemyBullets() {
    ctx.fillStyle = COLORS.enemyBullet;
    for (const bullet of enemyBullets) {
      const screenX = bullet.x - state.cameraX;
      if (screenX < -8 || screenX > SCREEN_WIDTH + 8) continue;
      ctx.fillRect(screenX - 1, bullet.y - 1, 3, 3);
      lights.push({
        x: screenX,
        y: bullet.y,
        radius: 28,
        innerRadius: 3,
        innerStop: 0.2,
        color: 'rgba(255, 140, 160, 0.45)',
      });
    }
  }

  function drawEnemies() {
    for (const enemy of enemies) {
      const screenX = enemy.x - state.cameraX;
      if (screenX < -40 || screenX > SCREEN_WIDTH + 40) continue;
      ctx.save();
      if (enemy.type === 'fighter') {
        ctx.translate(screenX, enemy.y);
        ctx.fillStyle = COLORS.enemy;
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(6, -1);
        ctx.lineTo(10, 0);
        ctx.lineTo(6, 1);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = COLORS.enemyAccent;
        ctx.fillRect(-4, -2, 6, 4);
        ctx.restore();
      } else {
        ctx.fillStyle = COLORS.turret;
        ctx.fillRect(screenX - 7, enemy.y - enemy.height, 14, enemy.height);
        ctx.fillStyle = COLORS.enemyAccent;
        ctx.fillRect(screenX - 5, enemy.y - enemy.height + 3, 10, 4);
        ctx.restore();
      }
      lights.push({
        x: screenX,
        y: enemy.y,
        radius: 50,
        innerRadius: 8,
        innerStop: 0.25,
        color: enemy.type === 'turret'
          ? 'rgba(150, 140, 255, 0.35)'
          : 'rgba(255, 170, 120, 0.35)',
      });
    }
  }

  function drawPlayer(now) {
    const screenX = player.x;
    const shipY = player.y;
    ctx.save();
    ctx.translate(screenX, shipY);
    ctx.rotate(player.tilt * 0.6);
    ctx.fillStyle = COLORS.playerBody;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(6, -2);
    ctx.lineTo(10, 0);
    ctx.lineTo(6, 2);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.playerOutline;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.playerAccent;
    ctx.fillRect(-2, -3, 6, 6);

    const flame = (Math.sin(now * 0.02) + 1) * 0.5;
    ctx.fillStyle = COLORS.playerEngine;
    ctx.beginPath();
    ctx.moveTo(-10, -1);
    ctx.lineTo(-14 - flame * 6, 0);
    ctx.lineTo(-10, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (player.invincible > 0 && !state.gameOver) {
      const alpha = 0.35 + 0.35 * Math.sin(now * 0.018);
      ctx.strokeStyle = `rgba(120, 230, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, shipY, player.width * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    lights.push({
      x: screenX - 8,
      y: shipY,
      radius: 70,
      innerRadius: 10,
      innerStop: 0.15,
      color: 'rgba(255, 180, 110, 0.45)',
    });
    lights.push({
      x: screenX + player.width * 0.5,
      y: shipY,
      radius: 80,
      innerRadius: 18,
      innerStop: 0.2,
      color: 'rgba(120, 220, 255, 0.45)',
    });
  }

  function ensureLightBuffer() {
    if (lightCanvas.width !== SCREEN_WIDTH) lightCanvas.width = SCREEN_WIDTH;
    if (lightCanvas.height !== SCREEN_HEIGHT) lightCanvas.height = SCREEN_HEIGHT;
  }

  // Apply a soft ambient vignette while carving light cones from player fire,
  // engines, and explosions for the requested lighting effect.
  function renderLighting() {
    ensureLightBuffer();
    lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
    lightCtx.save();
    lightCtx.globalCompositeOperation = 'lighter';

    const sources = [];
    for (const light of lights) {
      const radius = light.radius ?? 0;
      if (radius <= 0) continue;
      const innerRadius = Math.max(0, light.innerRadius ?? 0);
      const gradient = lightCtx.createRadialGradient(
        light.x,
        light.y,
        innerRadius,
        light.x,
        light.y,
        radius,
      );
      gradient.addColorStop(0, light.color ?? 'rgba(120, 200, 255, 0.45)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      lightCtx.fillStyle = gradient;
      lightCtx.beginPath();
      lightCtx.arc(light.x, light.y, radius, 0, Math.PI * 2);
      lightCtx.fill();

      sources.push({
        x: light.x,
        y: light.y,
        radius,
        innerRadius,
        innerStop: light.innerStop ?? 0.2,
      });
    }

    lightCtx.restore();

    applyAmbientLighting({
      ctx,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      ambient: settings.ambientLight,
      sources,
      sourceCanvas: sources.length ? lightCanvas : null,
    });

    lights.length = 0;
  }

  function drawStatusOverlays() {
    if (state.gameOver) {
      pixel.overlayText('MISSION FAILED', {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2 - 10,
        fillStyle: 'rgba(10, 20, 40, 0.85)',
        textFill: COLORS.text,
      });
      pixel.overlayText('Press R to restart', {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2 + 14,
        fillStyle: 'rgba(10, 20, 40, 0.65)',
        textFill: COLORS.text,
        font: 'bold 14px ui-monospace',
      });
    } else if (state.paused) {
      pixel.overlayText('PAUSED', {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2,
        fillStyle: COLORS.pause,
        textFill: COLORS.text,
      });
    }
  }

  // Core simulation step: advance scrolling, entities, and particle effects.
  function update(dt, now) {
    state.cameraX += settings.scrollSpeed * dt;
    if (state.cameraX >= LEVEL_LENGTH) {
      advanceStage();
      return;
    }

    updateStars(dt);
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateEnemies(dt, now);
    updateParticles(dt);
  }

  function render(now) {
    lights.length = 0;
    drawBackground(now);
    drawTerrain();
    drawParticles();
    drawEnemies();
    drawBullets();
    drawEnemyBullets();
    drawPlayer(now);
    renderLighting();
    drawShockwave(now);
    drawFlash(now);
    drawStatusOverlays();

    crtPost.render();
    drawIris(now);
  }

  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    if (!state.paused && !state.gameOver) {
      update(dt, now);
    }

    render(now);

    state.fpsTimer += dt;
    state.fpsFrames += 1;
    if (state.fpsTimer >= 0.5) {
      const fps = Math.round(state.fpsFrames / state.fpsTimer);
      fpsEl.textContent = `${fps} FPS`;
      state.fpsTimer = 0;
      state.fpsFrames = 0;
    }

    requestAnimationFrame(frame);
  }

  resetGame();
  requestAnimationFrame(frame);
})();

