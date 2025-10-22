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
import { createScreenViewport } from '../shared/render/screenViewport.js';
import { clamp } from '../shared/utils/math.js';
import { createFpsCounter } from '../shared/utils/fpsCounter.js';

(() => {
  const canvas = document.getElementById('game');
  const pixel = createPixelContext(canvas, { alpha: true });
  const { ctx } = pixel;

  const crtSettings = createDefaultCrtSettings({ warp: 0.12, aberration: 0.05 });
  const { post: crtPost } = initGameCrt({
    storageKey: 'time_pilot_crt_settings',
    settings: crtSettings,
    defaults: crtSettings,
    targetContext: ctx,
  });

  const overlay = createOverlayFX({ ctx, width: canvas.width, height: canvas.height });
  const { startShockwave, drawShockwave, screenFlash, drawFlash, startIris, drawIris, setBounds } = overlay;

  const beeper = createBeeper({ masterGain: 0.12 });
  beeper.unlockWithGestures();
  const shotTone = beeper.createPreset({ freq: 720, dur: 0.12, type: 'square', gain: 0.05 });
  const missileTone = beeper.createPreset({ freq: 310, dur: 0.18, type: 'sawtooth', gain: 0.05 });
  const explosionTone = beeper.createPreset({ freq: 140, dur: 0.32, type: 'triangle', gain: 0.06 });
  const warpTone = beeper.createPreset({ freq: 280, dur: 0.9, type: 'sine', gain: 0.07 });

  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const eraEl = document.getElementById('era');
  const killsEl = document.getElementById('kills');
  const fpsEl = document.getElementById('fps');
  const fpsCounter = createFpsCounter({ element: fpsEl, intervalMs: 500 });

  const TILE = DEFAULT_TILE_SIZE;
  const COLS = 44;
  const ROWS = 28;
  pixel.resizeToGrid(COLS, ROWS, TILE);
  createScreenViewport({
    canvas,
    css: {
      scale: 3.2,
      minWidth: 720,
      maxWidth: 1280,
    },
  });

  const SCREEN_WIDTH = canvas.width;
  const SCREEN_HEIGHT = canvas.height;
  setBounds({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  const TWO_PI = Math.PI * 2;
  const HALF_PI = Math.PI / 2;

  const settings = {
    maxSpeed: 180,
    reverseSpeed: 60,
    acceleration: 220,
    brake: 260,
    turnRate: 2.8,
    friction: 60,
    fireInterval: 0.16,
    bulletSpeed: 360,
    engineGlowRadius: 28,
    ambientLight: 0.58,
  };

  const ERAS = [
    {
      year: 1910,
      label: 'Dawn of Flight',
      skyTop: '#1b2e4f',
      skyBottom: '#050b1a',
      cloudColor: 'rgba(231, 242, 255, 0.85)',
      cloudColorNear: 'rgba(199, 225, 255, 0.9)',
      enemyColor: '#f4c38a',
      enemyAccent: '#ffe7b4',
      bulletColor: '#ffdfaa',
      trailColor: 'rgba(255, 180, 120, 0.65)',
      spawnInterval: [1.9, 2.4],
      maxEnemies: 6,
      killTarget: 14,
      enemySpeed: 52,
      enemyTurn: 2.3,
      enemyFire: [1.6, 2.2],
      enemyFireRange: 280,
    },
    {
      year: 1940,
      label: 'World at War',
      skyTop: '#152847',
      skyBottom: '#040713',
      cloudColor: 'rgba(216, 234, 255, 0.82)',
      cloudColorNear: 'rgba(191, 219, 255, 0.88)',
      enemyColor: '#8fd7ff',
      enemyAccent: '#c8f3ff',
      bulletColor: '#9fe0ff',
      trailColor: 'rgba(136, 220, 255, 0.7)',
      spawnInterval: [1.6, 2.1],
      maxEnemies: 7,
      killTarget: 16,
      enemySpeed: 74,
      enemyTurn: 2.9,
      enemyFire: [1.3, 1.9],
      enemyFireRange: 320,
    },
    {
      year: 1970,
      label: 'Rotor Fury',
      skyTop: '#14263d',
      skyBottom: '#03060f',
      cloudColor: 'rgba(204, 232, 255, 0.8)',
      cloudColorNear: 'rgba(175, 215, 255, 0.88)',
      enemyColor: '#ffd676',
      enemyAccent: '#fff6c4',
      bulletColor: '#ffe6a6',
      trailColor: 'rgba(255, 210, 140, 0.72)',
      spawnInterval: [1.45, 1.9],
      maxEnemies: 8,
      killTarget: 18,
      enemySpeed: 86,
      enemyTurn: 3.2,
      enemyFire: [1.1, 1.6],
      enemyFireRange: 340,
    },
    {
      year: 1982,
      label: 'Jetstream',
      skyTop: '#101f36',
      skyBottom: '#02040b',
      cloudColor: 'rgba(192, 220, 255, 0.78)',
      cloudColorNear: 'rgba(168, 205, 255, 0.86)',
      enemyColor: '#7edcff',
      enemyAccent: '#d3f4ff',
      bulletColor: '#bff6ff',
      trailColor: 'rgba(125, 225, 255, 0.7)',
      spawnInterval: [1.2, 1.6],
      maxEnemies: 9,
      killTarget: 20,
      enemySpeed: 108,
      enemyTurn: 3.6,
      enemyFire: [0.9, 1.4],
      enemyFireRange: 360,
    },
    {
      year: 2001,
      label: 'Future Shock',
      skyTop: '#0c1a2f',
      skyBottom: '#010208',
      cloudColor: 'rgba(180, 210, 255, 0.75)',
      cloudColorNear: 'rgba(146, 204, 255, 0.82)',
      enemyColor: '#94f4ff',
      enemyAccent: '#e6fdff',
      bulletColor: '#d4faff',
      trailColor: 'rgba(170, 240, 255, 0.78)',
      spawnInterval: [1.05, 1.45],
      maxEnemies: 10,
      killTarget: 22,
      enemySpeed: 128,
      enemyTurn: 3.9,
      enemyFire: [0.75, 1.2],
      enemyFireRange: 380,
    },
  ];

  const player = {
    x: 0,
    y: 0,
    angle: -HALF_PI,
    speed: 0,
    fireTimer: 0,
    invincible: 0,
    flamePulse: 0,
  };

  const state = {
    score: 0,
    lives: 3,
    eraIndex: 0,
    kills: 0,
    paused: false,
    gameOver: false,
    spawnTimer: 1.5,
    portal: null,
    bannerText: '',
    bannerTimer: 0,
    shake: 0,
  };

  const keys = { up: false, down: false, left: false, right: false, fire: false };

  const bullets = [];
  const enemyBullets = [];
  const enemies = [];
  const particles = [];
  const lights = [];

  const cloudLayers = [
    createCloudLayer({
      count: 26,
      parallax: 0.45,
      color: (era) => era.cloudColor,
      drift: 6,
      size: [32, 84],
    }),
    createCloudLayer({
      count: 18,
      parallax: 0.6,
      color: (era) => era.cloudColorNear,
      drift: 12,
      size: [48, 110],
    }),
  ];

  const dpad = createDPad({ preventDefault: true, pauseKeys: ['p'], restartKeys: ['r'] });
  const keyGroups = [
    { keys: ['arrowup', 'w', 'i'], prop: 'up' },
    { keys: ['arrowdown', 's', 'k'], prop: 'down' },
    { keys: ['arrowleft', 'a', 'j'], prop: 'left' },
    { keys: ['arrowright', 'd', 'l'], prop: 'right' },
  ];
  keyGroups.forEach(({ keys: group, prop }) => {
    dpad.onKeyChange(group, (pressed) => {
      keys[prop] = pressed;
    });
  });
  dpad.onKeyChange([' ', 'space'], (pressed) => {
    keys.fire = pressed;
    if (pressed) beeper.resume();
  });
  dpad.onPause(() => {
    if (state.gameOver) return;
    state.paused = !state.paused;
  });
  dpad.onRestart(() => {
    beeper.resume();
    resetGame();
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

  function randRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function angleDiff(a, b) {
    let diff = (b - a + Math.PI) % TWO_PI - Math.PI;
    if (diff < -Math.PI) diff += TWO_PI;
    return diff;
  }

  function createCloudLayer({ count, parallax, color, drift, size }) {
    const range = 1600;
    const clouds = [];
    for (let i = 0; i < count; i += 1) {
      clouds.push({
        x: (Math.random() - 0.5) * range,
        y: (Math.random() - 0.5) * range,
        size: randRange(size[0], size[1]),
        alpha: randRange(0.4, 0.9),
        driftAngle: Math.random() * TWO_PI,
        driftSpeed: randRange(drift * 0.5, drift * 1.4),
      });
    }
    return { clouds, parallax, color, range };
  }

  function currentEra() {
    return ERAS[state.eraIndex % ERAS.length];
  }

  function resetGame() {
    state.score = 0;
    state.lives = 3;
    state.eraIndex = 0;
    state.kills = 0;
    state.paused = false;
    state.gameOver = false;
    state.portal = null;
    state.spawnTimer = currentEra().spawnInterval[1];
    state.bannerText = `Year ${currentEra().year} — ${currentEra().label}`;
    state.bannerTimer = 3.2;
    state.shake = 0;
    player.x = 0;
    player.y = 0;
    player.angle = -HALF_PI;
    player.speed = 0;
    player.fireTimer = 0;
    player.invincible = 2.4;
    player.flamePulse = 0;
    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    lights.length = 0;
    updateHud(true);
    startIris('in', 900);
  }

  function updateHud(force = false) {
    if (force || scoreEl.textContent !== String(state.score)) scoreEl.textContent = state.score;
    if (force || livesEl.textContent !== String(state.lives)) livesEl.textContent = state.lives;
    const era = currentEra();
    const eraText = `${era.year}`;
    if (force || eraEl.textContent !== eraText) eraEl.textContent = eraText;
    if (force || killsEl.textContent !== String(state.kills)) killsEl.textContent = state.kills;
  }

  function spawnEnemy() {
    const era = currentEra();
    if (enemies.length >= era.maxEnemies) return;
    const angle = Math.random() * TWO_PI;
    const distance = randRange(280, 520);
    enemies.push({
      x: player.x + Math.cos(angle) * distance,
      y: player.y + Math.sin(angle) * distance,
      angle: Math.random() * TWO_PI,
      speed: era.enemySpeed * randRange(0.85, 1.15),
      fireTimer: randRange(...era.enemyFire),
      radius: 16,
      wobble: randRange(0.4, 1.2),
      wobblePhase: Math.random() * TWO_PI,
      hp: 1,
    });
  }

  function spawnPortal() {
    const era = currentEra();
    const angle = Math.random() * TWO_PI;
    const distance = randRange(360, 520);
    state.portal = {
      x: player.x + Math.cos(angle) * distance,
      y: player.y + Math.sin(angle) * distance,
      angle: 0,
      radius: 34,
      hp: 12,
      drift: randRange(18, 28),
      wobble: Math.random() * TWO_PI,
      eraLabel: era.label,
    };
    state.bannerText = 'Time Capsule sighted!';
    state.bannerTimer = 2.6;
  }

  function spawnParticles({ x, y, count = 12, speed = 120, life = [0.4, 0.8], color, size = [2, 5], glow = 42 }) {
    for (let i = 0; i < count; i += 1) {
      const ang = Math.random() * TWO_PI;
      const mag = randRange(speed * 0.4, speed);
      const lifetime = randRange(life[0], life[1]);
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * mag,
        vy: Math.sin(ang) * mag,
        life: lifetime,
        maxLife: lifetime,
        size: randRange(size[0], size[1]),
        color,
        glow,
      });
    }
  }

  function addScore(amount) {
    state.score += amount;
    updateHud();
  }

  function destroyEnemy(enemy, { big = false } = {}) {
    const era = currentEra();
    const color = big ? era.enemyAccent : era.trailColor;
    spawnParticles({
      x: enemy.x,
      y: enemy.y,
      count: big ? 32 : 14,
      speed: big ? 200 : 140,
      life: big ? [0.6, 1.1] : [0.4, 0.75],
      color,
      glow: big ? 110 : 60,
      size: big ? [4, 8] : [2, 5],
    });
    explosionTone();
    state.shake = Math.min(12, state.shake + (big ? 6 : 3));
  }

  function handleEnemyHit(enemy, damage = 1) {
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      destroyEnemy(enemy);
      state.kills += 1;
      addScore(100);
      updateHud();
      if (!state.portal && state.kills >= currentEra().killTarget) {
        spawnPortal();
      }
      return true;
    }
    return false;
  }

  function warpToNextEra() {
    warpTone();
    screenFlash({ duration: 480, strength: 0.32 });
    startShockwave(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, {
      duration: 650,
      innerRadius: 20,
      colorStops: [
        [0, 'rgba(180,220,255,0.05)'],
        [0.4, 'rgba(168,236,255,0.28)'],
        [1, 'rgba(120,200,255,0)'],
      ],
    });
    state.eraIndex = (state.eraIndex + 1) % ERAS.length;
    state.kills = 0;
    state.portal = null;
    enemies.length = 0;
    enemyBullets.length = 0;
    bullets.length = 0;
    particles.length = 0;
    state.spawnTimer = currentEra().spawnInterval[1];
    state.bannerText = `Year ${currentEra().year} — ${currentEra().label}`;
    state.bannerTimer = 3.4;
    updateHud(true);
  }

  function damagePlayer() {
    if (player.invincible > 0 || state.gameOver) return;
    explosionTone();
    spawnParticles({
      x: player.x,
      y: player.y,
      count: 36,
      speed: 220,
      life: [0.6, 1.2],
      color: 'rgba(255, 240, 200, 0.9)',
      glow: 120,
      size: [4, 8],
    });
    state.shake = 14;
    state.lives -= 1;
    updateHud();
    if (state.lives < 0) {
      state.gameOver = true;
      state.bannerText = 'Mission failed';
      state.bannerTimer = 0;
      return;
    }
    player.invincible = 2.4;
    player.speed = 0;
    player.x -= Math.cos(player.angle) * 12;
    player.y -= Math.sin(player.angle) * 12;
  }

  function updatePlayer(dt) {
    const turn = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    player.angle += turn * settings.turnRate * dt;

    if (keys.up) {
      player.speed = clamp(player.speed + settings.acceleration * dt, -settings.reverseSpeed, settings.maxSpeed);
    } else if (keys.down) {
      player.speed = clamp(player.speed - settings.brake * dt, -settings.reverseSpeed, settings.maxSpeed);
    } else {
      if (player.speed > 0) {
        player.speed = Math.max(0, player.speed - settings.friction * dt);
      } else if (player.speed < 0) {
        player.speed = Math.min(0, player.speed + settings.friction * dt);
      }
    }

    const vx = Math.cos(player.angle) * player.speed;
    const vy = Math.sin(player.angle) * player.speed;
    player.x += vx * dt;
    player.y += vy * dt;

    player.fireTimer -= dt;
    if (keys.fire && player.fireTimer <= 0) {
      const bulletSpeed = settings.bulletSpeed + Math.max(0, player.speed * 0.35);
      const bx = player.x + Math.cos(player.angle) * 14;
      const by = player.y + Math.sin(player.angle) * 14;
      bullets.push({
        x: bx,
        y: by,
        vx: Math.cos(player.angle) * bulletSpeed,
        vy: Math.sin(player.angle) * bulletSpeed,
        life: 0.8,
        radius: 4,
      });
      player.fireTimer = settings.fireInterval;
      shotTone();
    }

    if (player.invincible > 0) {
      player.invincible = Math.max(0, player.invincible - dt);
    }

    player.flamePulse = (player.flamePulse + dt * 6) % TWO_PI;

    cloudLayers.forEach((layer) => {
      const follow = layer.parallax;
      const offsetX = vx * dt * follow;
      const offsetY = vy * dt * follow;
      layer.clouds.forEach((cloud) => {
        cloud.x += -offsetX + Math.cos(cloud.driftAngle) * cloud.driftSpeed * dt * 0.2;
        cloud.y += -offsetY + Math.sin(cloud.driftAngle) * cloud.driftSpeed * dt * 0.2;
        const limit = layer.range;
        if (cloud.x - player.x < -limit) cloud.x += limit * 2;
        if (cloud.x - player.x > limit) cloud.x -= limit * 2;
        if (cloud.y - player.y < -limit) cloud.y += limit * 2;
        if (cloud.y - player.y > limit) cloud.y -= limit * 2;
      });
    });
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) {
        bullets.splice(i, 1);
        continue;
      }
      for (let j = enemies.length - 1; j >= 0; j -= 1) {
        const enemy = enemies[j];
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        if (dx * dx + dy * dy <= (enemy.radius + bullet.radius) ** 2) {
          bullets.splice(i, 1);
          const killed = handleEnemyHit(enemy);
          if (killed) enemies.splice(j, 1);
          break;
        }
      }
      if (!state.portal) continue;
      const portal = state.portal;
      const dx = bullet.x - portal.x;
      const dy = bullet.y - portal.y;
      const radius = portal.radius + bullet.radius;
      if (dx * dx + dy * dy <= radius * radius) {
        bullets.splice(i, 1);
        portal.hp -= 1;
        spawnParticles({
          x: portal.x + dx * 0.1,
          y: portal.y + dy * 0.1,
          count: 6,
          speed: 90,
          life: [0.3, 0.6],
          color: 'rgba(180, 240, 255, 0.8)',
          glow: 80,
          size: [2, 4],
        });
        missileTone();
        if (portal.hp <= 0) {
          destroyEnemy(portal, { big: true });
          state.portal = null;
          addScore(500);
          warpToNextEra();
        }
      }
    }
  }

  function updateEnemyBullets(dt) {
    for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = enemyBullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) {
        enemyBullets.splice(i, 1);
        continue;
      }
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      if (dx * dx + dy * dy <= (bullet.radius + 12) ** 2) {
        enemyBullets.splice(i, 1);
        damagePlayer();
      }
    }
  }

  function updateEnemies(dt) {
    const era = currentEra();
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && !state.portal) {
      spawnEnemy();
      state.spawnTimer = randRange(...era.spawnInterval);
    }

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const desired = Math.atan2(dy, dx);
      const diff = angleDiff(enemy.angle, desired);
      const maxTurn = era.enemyTurn * dt;
      enemy.angle += clamp(diff, -maxTurn, maxTurn);
      enemy.x += Math.cos(enemy.angle) * enemy.speed * dt;
      enemy.y += Math.sin(enemy.angle) * enemy.speed * dt;
      enemy.wobblePhase += enemy.wobble * dt;
      const wobbleRadius = enemy.radius + Math.sin(enemy.wobblePhase) * 2;

      if (dx * dx + dy * dy < wobbleRadius * wobbleRadius) {
        damagePlayer();
        destroyEnemy(enemy);
        enemies.splice(i, 1);
        continue;
      }

      if (dx * dx + dy * dy > 1600 * 1600) {
        enemies.splice(i, 1);
        continue;
      }

      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && dx * dx + dy * dy <= era.enemyFireRange ** 2) {
        const spread = randRange(-0.18, 0.18);
        const angle = Math.atan2(dy, dx) + spread;
        const speed = 220 + era.enemySpeed * 0.65;
        enemyBullets.push({
          x: enemy.x + Math.cos(angle) * enemy.radius,
          y: enemy.y + Math.sin(angle) * enemy.radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.2,
          radius: 6,
          color: era.bulletColor,
        });
        enemy.fireTimer = randRange(...era.enemyFire);
      }
    }

    if (state.portal) {
      const portal = state.portal;
      portal.wobble += dt * 2.6;
      portal.angle += dt * 0.8;
      portal.x += Math.cos(player.angle + portal.wobble * 0.1) * portal.drift * dt;
      portal.y += Math.sin(player.angle + portal.wobble * 0.1) * portal.drift * dt;
      const dx = portal.x - player.x;
      const dy = portal.y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) > 600) {
        portal.x = player.x + dx * 0.6;
        portal.y = player.y + dy * 0.6;
      }
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function updateState(dt) {
    if (state.bannerTimer > 0) {
      state.bannerTimer = Math.max(0, state.bannerTimer - dt);
    }
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt * 12);
    }
  }

  function drawBackground() {
    const era = currentEra();
    const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    gradient.addColorStop(0, era.skyTop);
    gradient.addColorStop(1, era.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    cloudLayers.forEach((layer, index) => {
      const color = typeof layer.color === 'function' ? layer.color(era) : layer.color;
      ctx.fillStyle = color;
      for (const cloud of layer.clouds) {
        const screenX = SCREEN_WIDTH / 2 + (cloud.x - player.x) * layer.parallax;
        const screenY = SCREEN_HEIGHT / 2 + (cloud.y - player.y) * layer.parallax;
        if (screenX < -120 || screenX > SCREEN_WIDTH + 120 || screenY < -120 || screenY > SCREEN_HEIGHT + 120) {
          continue;
        }
        ctx.globalAlpha = cloud.alpha * (index === 0 ? 0.6 : 0.9);
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, cloud.size * 0.7, cloud.size * 0.38, 0, 0, TWO_PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  function toScreen(x, y) {
    return {
      x: SCREEN_WIDTH / 2 + (x - player.x),
      y: SCREEN_HEIGHT / 2 + (y - player.y),
    };
  }

  function drawPlayer(now) {
    const { x, y } = toScreen(player.x, player.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.angle);

    const era = currentEra();
    const bodyColor = era.enemyAccent;
    const accentColor = era.enemyColor;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(-4, -2, 6, 4);

    ctx.fillStyle = 'rgba(255, 160, 64, 0.9)';
    const flameScale = 6 + Math.sin(player.flamePulse * 3) * 2 + Math.max(0, player.speed) * 0.05;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(-16 - flameScale, 0);
    ctx.lineTo(-16, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    if (player.invincible > 0 && Math.floor(now / 80) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }

    lights.push({
      x,
      y,
      radius: settings.engineGlowRadius,
      innerRadius: 6,
      innerStop: 0.4,
      color: 'rgba(255,180,80,0.32)',
    });
  }

  function drawEnemies() {
    const era = currentEra();
    for (const enemy of enemies) {
      const { x, y } = toScreen(enemy.x, enemy.y);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(enemy.angle);
      ctx.fillStyle = era.enemyColor;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = era.enemyAccent;
      ctx.fillRect(-4, -2, 5, 4);
      ctx.restore();
      lights.push({
        x,
        y,
        radius: 26,
        innerRadius: 4,
        innerStop: 0.35,
        color: `${era.trailColor}`,
      });
    }

    if (state.portal) {
      const portal = state.portal;
      const { x, y } = toScreen(portal.x, portal.y);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(portal.angle);
      const gradient = ctx.createRadialGradient(0, 0, 8, 0, 0, portal.radius + 6);
      gradient.addColorStop(0, 'rgba(180, 240, 255, 0.9)');
      gradient.addColorStop(0.5, 'rgba(120, 200, 255, 0.45)');
      gradient.addColorStop(1, 'rgba(40, 80, 120, 0.05)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius + 6, 0, TWO_PI);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 240, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius * (0.65 + Math.sin(portal.wobble) * 0.05), 0, TWO_PI);
      ctx.stroke();
      ctx.restore();
      lights.push({
        x,
        y,
        radius: 120,
        innerRadius: 12,
        innerStop: 0.2,
        color: 'rgba(170,230,255,0.35)',
      });
    }
  }

  function drawBullets() {
    ctx.fillStyle = 'rgba(255, 240, 210, 0.95)';
    for (const bullet of bullets) {
      const { x, y } = toScreen(bullet.x, bullet.y);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, TWO_PI);
      ctx.fill();
      lights.push({
        x,
        y,
        radius: 14,
        innerRadius: 2,
        innerStop: 0.2,
        color: 'rgba(255,220,150,0.45)',
      });
    }

    const era = currentEra();
    ctx.fillStyle = era.bulletColor;
    for (const bullet of enemyBullets) {
      const { x, y } = toScreen(bullet.x, bullet.y);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TWO_PI);
      ctx.fill();
      lights.push({
        x,
        y,
        radius: 18,
        innerRadius: 3,
        innerStop: 0.25,
        color: `${era.trailColor}`,
      });
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const { x, y } = toScreen(p.x, p.y);
      const lifeT = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = lifeT;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, TWO_PI);
      ctx.fill();
      lights.push({
        x,
        y,
        radius: p.glow,
        innerRadius: p.size,
        innerStop: 0.3,
        color: p.color,
      });
    }
    ctx.restore();
  }

  function drawStatus() {
    if (state.gameOver) {
      pixel.overlayText('MISSION FAILED', {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2 - 10,
        fillStyle: 'rgba(6, 14, 28, 0.82)',
        textFill: '#e5f7ff',
      });
      pixel.overlayText('Press R to restart', {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2 + 18,
        fillStyle: 'rgba(6, 14, 28, 0.68)',
        textFill: '#e5f7ff',
        font: 'bold 14px ui-monospace',
      });
    } else if (state.paused) {
      pixel.overlayText('PAUSED', {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2,
        fillStyle: 'rgba(6, 14, 28, 0.72)',
        textFill: '#e5f7ff',
      });
    }

    if (state.bannerTimer > 0 && state.bannerText) {
      pixel.overlayText(state.bannerText, {
        x: SCREEN_WIDTH / 2,
        y: 36,
        fillStyle: 'rgba(6, 18, 32, 0.75)',
        textFill: '#f4fbff',
        font: 'bold 14px ui-monospace',
      });
    }
  }

  function render(now) {
    lights.length = 0;
    drawBackground();
    drawParticles();
    drawEnemies();
    drawBullets();
    drawPlayer(now);

    applyAmbientLighting({
      ctx,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      ambient: settings.ambientLight,
      sources: lights,
    });

    drawShockwave(now);
    drawFlash(now);
    drawStatus();

    crtPost.render();
    drawIris(now);
  }

  function update(dt) {
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateEnemies(dt);
    updateParticles(dt);
    updateState(dt);
  }

  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    if (!state.paused && !state.gameOver) {
      update(dt, now);
    }

    const shake = state.shake > 0 ? randRange(-state.shake, state.shake) : 0;
    if (shake !== 0) {
      ctx.save();
      ctx.translate(shake, shake * 0.6);
      render(now);
      ctx.restore();
    } else {
      render(now);
    }

    fpsCounter.frame(now);
    requestAnimationFrame(frame);
  }

  resetGame();
  requestAnimationFrame(frame);
})();
