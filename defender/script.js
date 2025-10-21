import { createBeeper } from '../shared/audio/beeper.js';
import { createDPad } from '../shared/input/dpad.js';
import { createPixelContext } from '../shared/render/pixelCanvas.js';
import { initGameCrt } from '../shared/ui/gameCrt.js';
import { createOverlayFX } from '../shared/fx/overlay.js';
import {
  DEFAULT_TILE_SIZE,
  createDefaultCrtSettings,
} from '../shared/config/display.js';

(() => {
  const canvas = document.getElementById('game');
  const pixel = createPixelContext(canvas, { alpha: false });
  const { ctx } = pixel;

  const crtSettings = createDefaultCrtSettings({ warp: 0.12, aberration: 0.08 });
  // Reuse the shared CRT control panel so the player can tune warp/scanlines.
  const { post: crtPost } = initGameCrt({
    storageKey: 'defender_crt_settings',
    settings: crtSettings,
    defaults: crtSettings,
    targetContext: ctx,
  });
  const overlay = createOverlayFX({ ctx, width: canvas.width, height: canvas.height });
  const { startShockwave, drawShockwave, screenFlash, drawFlash, startIris, drawIris, getShockInfo, setBounds } = overlay;

  // Shared WebAudio helper keeps the same synth textures other games use.
  const beeper = createBeeper({ masterGain: 0.12 });
  beeper.unlockWithGestures();
  const fireTone = beeper.createPreset({ freq: 740, dur: 0.08, type: 'sawtooth', gain: 0.045 });
  const boomTone = beeper.createPreset({ freq: 110, dur: 0.24, type: 'triangle', gain: 0.055 });
  const rescueTone = beeper.createPreset({ freq: 520, dur: 0.18, type: 'square', gain: 0.04 });
  const alarmTone = beeper.createPreset({ freq: 280, dur: 0.2, type: 'sawtooth', gain: 0.05 });

  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const humansEl = document.getElementById('humans');
  const fpsEl = document.getElementById('fps');

  // Match the pixel density used by Pac-Man/Snake so post-processing lines up.
  const TILE = DEFAULT_TILE_SIZE;
  const COLS = 40;
  const ROWS = 28;
  pixel.resizeToGrid(COLS, ROWS, TILE);

  const SCREEN_WIDTH = canvas.width;
  const SCREEN_HEIGHT = canvas.height;
  const WORLD_SCREENS = 8;
  const WORLD_WIDTH = SCREEN_WIDTH * WORLD_SCREENS;
  const HUMAN_COUNT = 6;

  const HUD_UPDATE_INTERVAL = 150;

  const starLayers = createStarLayers();
  const groundProfile = createGroundProfile();

  // Primary entity collections: projectiles, AI craft, colonists, debris and light volumes.
  const lasers = [];
  const enemies = [];
  const humans = [];
  const particles = [];
  const lights = [];

  let currentCameraX = 0;

  const player = {
    x: SCREEN_WIDTH * 0.2,
    y: SCREEN_HEIGHT * 0.5,
    vx: 0,
    vy: 0,
    facing: 1,
    fireTimer: 0,
    invincible: 0,
    boost: 0,
    carrying: new Set(),
  };

  const state = {
    score: 0,
    lives: 3,
    wave: 1,
    spawnTimer: 0,
    paused: false,
    gameOver: false,
    humansAlarm: 0,
    hudTimer: 0,
    shakeTime: 0,
    shakeStrength: 0,
    lastHumanCount: HUMAN_COUNT,
  };

  const keys = { left: false, right: false, up: false, down: false, fire: false, boost: false };

  // Hook the shared keyboard D-pad for quick WASD/arrow/pause bindings.
  const dpad = createDPad({ preventDefault: true, pauseKeys: ['p'], restartKeys: ['r'] });
  dpad.onDirectionChange((dir) => {
    keys.left = dir === 'left';
    keys.right = dir === 'right';
    keys.up = dir === 'up';
    keys.down = dir === 'down';
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
  dpad.onKeyChange(['shift'], (pressed) => {
    keys.boost = pressed;
    if (pressed) beeper.resume();
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ') {
      keys.fire = true;
      beeper.resume();
    } else if (key === 'shift') {
      keys.boost = true;
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
    if (key === 'shift') keys.boost = false;
  });

  // Reset the world back to the first wave and rebuild colonist placements.
  function resetGame() {
    lasers.length = 0;
    enemies.length = 0;
    humans.length = 0;
    particles.length = 0;
    player.x = SCREEN_WIDTH * 0.2;
    player.y = SCREEN_HEIGHT * 0.5;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.fireTimer = 0;
    player.invincible = 2.2;
    player.boost = 0;
    player.carrying.clear();

    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.spawnTimer = 0;
    state.paused = false;
    state.gameOver = false;
    state.humansAlarm = 0;
    state.hudTimer = 0;
    state.shakeTime = 0;
    state.shakeStrength = 0;

    for (let i = 0; i < HUMAN_COUNT; i += 1) {
      humans.push(createHuman(i));
    }

    for (let i = 0; i < 4; i += 1) {
      spawnEnemy({ spread: i / 4 });
    }

    updateHud(true);
    startIris('in', 900);
  }

  function createHuman(index) {
    const spacing = WORLD_WIDTH / HUMAN_COUNT;
    const x = spacing * index + spacing * 0.5;
    const ground = sampleGround(x);
    return {
      x,
      y: ground - 6,
      state: 'idle',
      vy: 0,
      wobble: Math.random() * Math.PI * 2,
      carrier: null,
      cooldown: 0,
    };
  }

  function spawnEnemy({ spread = Math.random() } = {}) {
    const x = WORLD_WIDTH * spread + SCREEN_WIDTH * 0.5;
    const y = SCREEN_HEIGHT * (0.2 + Math.random() * 0.5);
    enemies.push({
      x,
      y,
      vx: (Math.random() * 60 + 40) * (Math.random() < 0.5 ? -1 : 1),
      vy: 0,
      state: 'patrol',
      target: null,
      timer: 0,
      glow: Math.random() * 0.8 + 0.4,
    });
  }

  // Lightweight parallax layers reuse a deterministic RNG so the skyline stays consistent.
  function createStarLayers() {
    const layers = [
      { count: 90, parallax: 0.25, size: 1, color: 'rgba(90,140,255,0.5)' },
      { count: 60, parallax: 0.4, size: 1.5, color: 'rgba(110,200,255,0.6)' },
      { count: 40, parallax: 0.65, size: 2, color: 'rgba(190,240,255,0.8)' },
    ];
    const rng = mulberry32(1337);
    return layers.map((layer, i) => {
      const stars = [];
      for (let s = 0; s < layer.count; s += 1) {
        stars.push({
          x: rng() * WORLD_WIDTH,
          y: rng() * SCREEN_HEIGHT,
          twinkle: rng() * Math.PI * 2 + i,
        });
      }
      return { ...layer, stars };
    });
  }

  // Height-map made from sine stacks keeps the skyline arcade-style without external noise libs.
  function createGroundProfile() {
    const segments = Math.ceil(WORLD_WIDTH / TILE) + 2;
    const result = new Float32Array(segments);
    for (let i = 0; i < segments; i += 1) {
      const u = i / segments;
      const base = SCREEN_HEIGHT * 0.72;
      const undulate = Math.sin(u * Math.PI * 6) * 18 + Math.sin(u * Math.PI * 14 + 1.2) * 8;
      const cliff = Math.sin(u * Math.PI * 3.2 + 0.4) * 10;
      const y = base + undulate + cliff;
      result[i] = clamp(y, SCREEN_HEIGHT * 0.58, SCREEN_HEIGHT - TILE * 2);
    }
    return result;
  }

  function sampleGround(x) {
    if (x <= 0) return groundProfile[0];
    if (x >= WORLD_WIDTH) return groundProfile[groundProfile.length - 1];
    const idx = x / TILE;
    const i0 = Math.floor(idx);
    const i1 = Math.min(groundProfile.length - 1, i0 + 1);
    const t = idx - i0;
    return groundProfile[i0] * (1 - t) + groundProfile[i1] * t;
  }

  // Main simulation step keeps time-based movement so everything remains smooth at different FPS.
  function update(now, dt) {
    if (state.paused || state.gameOver) return;

    updatePlayer(dt);
    updateLasers(dt);
    updateEnemies(dt);
    updateHumans(dt);
    updateParticles(dt);

    state.spawnTimer -= dt;
    const targetCount = Math.min(8 + state.wave * 2, 18);
    if (state.spawnTimer <= 0 && enemies.length < targetCount) {
      spawnEnemy();
      state.spawnTimer = 2.2 - Math.min(1.6, state.wave * 0.18);
    }

    if (state.lastHumanCount !== countActiveHumans()) {
      state.humansAlarm = 0.4;
      state.lastHumanCount = countActiveHumans();
      alarmTone();
    }

    if (state.humansAlarm > 0) state.humansAlarm = Math.max(0, state.humansAlarm - dt);

    state.hudTimer += dt * 1000;
    if (state.hudTimer >= HUD_UPDATE_INTERVAL) {
      updateHud();
      state.hudTimer = 0;
    }

    if (state.shakeTime > 0) {
      state.shakeTime = Math.max(0, state.shakeTime - dt);
      if (state.shakeTime <= 0) state.shakeStrength = 0;
    }

    if (state.lives <= 0 || countActiveHumans() <= 0) {
      state.gameOver = true;
      startIris('out', 1200);
    }
  }

  // Ship thrust is intentionally floaty; boost drains a small meter for short bursts.
  function updatePlayer(dt) {
    const ACCEL = 280;
    const BOOST_ACCEL = 420;
    const MAX_SPEED = 260;
    const BOOST_MAX = 380;
    const DRAG = 0.92;
    const V_DRAG = 0.9;
    const boostActive = keys.boost && player.boost > 0.05;

    const ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const ay = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    const accel = boostActive ? BOOST_ACCEL : ACCEL;
    const maxSpeed = boostActive ? BOOST_MAX : MAX_SPEED;

    if (ax !== 0) {
      player.vx += ax * accel * dt;
      player.facing = ax > 0 ? 1 : -1;
    } else {
      player.vx *= Math.pow(DRAG, dt * 60);
    }
    if (ay !== 0) {
      player.vy += ay * accel * 0.7 * dt;
    } else {
      player.vy *= Math.pow(V_DRAG, dt * 60);
    }

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      player.vx *= scale;
      player.vy *= scale;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    const ground = sampleGround(player.x);
    const ceiling = SCREEN_HEIGHT * 0.1;
    if (player.y < ceiling) {
      player.y = ceiling;
      if (player.vy < 0) player.vy = 0;
    }
    if (player.y > ground - 12) {
      player.y = ground - 12;
      if (player.vy > 0) player.vy = 0;
    }
    player.x = clamp(player.x, 0, WORLD_WIDTH);

    if (boostActive) {
      player.boost = Math.max(0, player.boost - dt * 0.35);
    } else {
      player.boost = Math.min(1, player.boost + dt * 0.22);
    }

    if (player.fireTimer > 0) player.fireTimer -= dt;
    if (player.invincible > 0) player.invincible = Math.max(0, player.invincible - dt);

    if (keys.fire) tryFire();

    // Engine light follows thrust direction for subtle lighting.
    const engineOffset = player.facing < 0 ? 10 : -10;
    addLight({
      x: player.x - engineOffset,
      y: player.y + 2,
      radius: 42,
      color: 'rgba(120,220,255,0.35)',
      intensity: 1 + player.boost * 0.8,
    });

    // Carry humans when they are latched onto the ship.
    player.carrying.forEach((human) => {
      human.x = player.x + player.facing * 10;
      human.y = player.y + 6;
      if (player.y >= sampleGround(player.x) - 18) {
        // Touchdown gently returns them to the colony.
        releaseHuman(human, true);
      }
    });
  }

  function tryFire() {
    if (player.fireTimer > 0) return;
    player.fireTimer = 0.18;
    const speed = 420 + player.boost * 160;
    const dir = player.facing;
    lasers.push({
      x: player.x + dir * 14,
      y: player.y - 1,
      vx: dir * speed,
      life: 0.4,
    });
    fireTone();
    addLight({ x: player.x + dir * 12, y: player.y - 1, radius: 54, color: 'rgba(120, 220, 255, 0.55)', intensity: 1.2 });
  }

  // Arcade-style lasers expire quickly; each collision spawns a lighting pulse.
  function updateLasers(dt) {
    for (let i = lasers.length - 1; i >= 0; i -= 1) {
      const laser = lasers[i];
      laser.x += laser.vx * dt;
      laser.life -= dt;
      if (laser.x < 0 || laser.x > WORLD_WIDTH || laser.life <= 0) {
        lasers.splice(i, 1);
        continue;
      }
      for (let j = enemies.length - 1; j >= 0; j -= 1) {
        const enemy = enemies[j];
        if (distanceSq(laser.x, laser.y, enemy.x, enemy.y) < 22 * 22) {
          handleEnemyHit(enemy, { byLaser: true });
          lasers.splice(i, 1);
          break;
        }
      }
    }
  }

  // Invaders juggle patrol/abduct/mutant behaviours depending on nearby colonists and the player.
  function updateEnemies(dt) {
    const playerPos = { x: player.x, y: player.y };
    enemies.forEach((enemy) => {
      enemy.timer += dt;
      if (enemy.state === 'patrol') {
        enemy.vy += Math.sin(enemy.timer * 2) * 14 * dt;
        enemy.y += enemy.vy * dt;
        enemy.x += enemy.vx * dt;
        if (enemy.y < SCREEN_HEIGHT * 0.18 || enemy.y > sampleGround(enemy.x) - 32) {
          enemy.vy *= -0.8;
          enemy.y = clamp(enemy.y, SCREEN_HEIGHT * 0.18, sampleGround(enemy.x) - 32);
        }
        if (enemy.x < 40 || enemy.x > WORLD_WIDTH - 40) enemy.vx *= -1;
        if (!enemy.target || enemy.target.state !== 'idle') {
          enemy.target = findHumanFor(enemy);
        }
        if (enemy.target) {
          enemy.state = 'abduct';
        }
      } else if (enemy.state === 'abduct') {
        if (!enemy.target || enemy.target.state !== 'idle') {
          enemy.state = 'patrol';
        } else {
          const target = enemy.target;
          const dirX = Math.sign(target.x - enemy.x);
          enemy.vx += dirX * 90 * dt;
          enemy.vx = clamp(enemy.vx, -160, 160);
          enemy.x += enemy.vx * dt;

          const desiredY = target.y - 16;
          enemy.y += clamp(desiredY - enemy.y, -150 * dt, 150 * dt);

          if (distanceSq(enemy.x, enemy.y, target.x, target.y - 10) < 16 * 16) {
            target.state = 'carried';
            target.carrier = enemy;
            enemy.state = 'carry';
          }
        }
      } else if (enemy.state === 'carry') {
        if (!enemy.target || enemy.target.state !== 'carried') {
          enemy.state = 'patrol';
        } else {
          const target = enemy.target;
          target.x = enemy.x;
          target.y = enemy.y + 12;
          enemy.y -= 90 * dt;
          if (enemy.y <= SCREEN_HEIGHT * 0.12) {
            target.state = 'lost';
            target.carrier = null;
            enemy.target = null;
            enemy.state = 'mutant';
            state.humansAlarm = 0.6;
          }
        }
      } else if (enemy.state === 'mutant') {
        const angle = Math.atan2(playerPos.y - enemy.y, playerPos.x - enemy.x);
        enemy.vx += Math.cos(angle) * 260 * dt;
        enemy.vy += Math.sin(angle) * 260 * dt;
        enemy.vx = clamp(enemy.vx, -260, 260);
        enemy.vy = clamp(enemy.vy, -260, 260);
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }

      // Screen boundaries
      enemy.x = clamp(enemy.x, 0, WORLD_WIDTH);
      enemy.y = clamp(enemy.y, SCREEN_HEIGHT * 0.08, sampleGround(enemy.x) - 16);

      // Collisions with player (simple radius test)
      if (!state.gameOver && player.invincible <= 0 && distanceSq(enemy.x, enemy.y, player.x, player.y) < 20 * 20) {
        handlePlayerHit(enemy);
      }

      addLight({
        x: enemy.x,
        y: enemy.y,
        radius: 56,
        color: `rgba(255,120,180,${0.4 + Math.sin(enemy.timer * 6) * 0.1})`,
        intensity: 0.9 + enemy.glow * 0.5,
      });
    });
  }

  function findHumanFor(enemy) {
    let closest = null;
    let best = Infinity;
    humans.forEach((human) => {
      if (human.state !== 'idle') return;
      const dx = Math.abs(human.x - enemy.x);
      if (dx < best) {
        best = dx;
        closest = human;
      }
    });
    return closest;
  }

  // Colonists can be abducted, fall, or ride with the player until dropped at ground level.
  function updateHumans(dt) {
    humans.forEach((human) => {
      human.cooldown = Math.max(0, human.cooldown - dt);
      if (human.state === 'carried' && human.carrier) {
        human.x = human.carrier.x;
        human.y = human.carrier.y + 12;
      } else if (human.state === 'falling') {
        human.vy += 280 * dt;
        human.y += human.vy * dt;
        if (playerTouchingHuman(human)) {
          latchHuman(human);
        }
        const ground = sampleGround(human.x) - 6;
        if (human.y >= ground) {
          if (Math.abs(human.vy) > 180) {
            human.state = 'lost';
            human.y = ground;
            state.humansAlarm = 0.6;
          } else {
            human.state = 'idle';
            human.y = ground;
            human.vy = 0;
            human.cooldown = 1.2;
            rescueTone();
            state.score += 200;
          }
        }
      } else if (human.state === 'idle') {
        const base = sampleGround(human.x) - 6;
        human.y = base + Math.sin(human.wobble + performance.now() * 0.002) * 0.5;
        if (playerTouchingHuman(human) && human.cooldown <= 0) {
          // Allow player to scoop idle humans for bonus delivery.
          latchHuman(human);
        }
      } else if (human.state === 'carriedByPlayer') {
        // Position updated in player update.
      }
    });
  }

  function latchHuman(human) {
    human.state = 'carriedByPlayer';
    human.vy = 0;
    human.carrier = null;
    player.carrying.add(human);
    rescueTone();
    state.score += 50;
  }

  function releaseHuman(human, safe = false) {
    if (!player.carrying.has(human)) return;
    player.carrying.delete(human);
    if (safe) {
      human.state = 'idle';
      human.cooldown = 1.5;
      human.y = sampleGround(human.x) - 6;
      state.score += 150;
      rescueTone();
    } else {
      human.state = 'falling';
      human.vy = 60;
    }
  }

  function playerTouchingHuman(human) {
    if (human.state === 'lost') return false;
    return distanceSq(player.x, player.y, human.x, human.y) < 18 * 18;
  }

  function handleEnemyHit(enemy, { byLaser = false } = {}) {
    const idx = enemies.indexOf(enemy);
    if (idx !== -1) enemies.splice(idx, 1);
    state.score += byLaser ? 125 : 80;
    spawnExplosion(enemy.x, enemy.y);
    boomTone();
    state.shakeStrength = Math.min(12, state.shakeStrength + 4);
    state.shakeTime = 0.35;
    screenFlash({ strength: 0.2, duration: 160 });
    const shockX = clamp(enemy.x - getCameraX({ includeShake: false }), 0, SCREEN_WIDTH);
    startShockwave(shockX, enemy.y, { duration: 500, innerRadius: 8, expandTo: SCREEN_WIDTH });

    if (enemy.target && enemy.target.state === 'carried') {
      enemy.target.state = 'falling';
      enemy.target.carrier = null;
      enemy.target.vy = 0;
    }
  }

  function handlePlayerHit(enemy) {
    state.lives -= 1;
    updateHud(true);
    spawnExplosion(player.x, player.y, { sparks: 36, hue: 'rgba(130,220,255,0.8)' });
    boomTone();
    screenFlash({ strength: 0.35, duration: 240 });
    const shockX = clamp(player.x - getCameraX({ includeShake: false }), 0, SCREEN_WIDTH);
    startShockwave(shockX, player.y, { duration: 600, innerRadius: 12, expandTo: SCREEN_WIDTH });
    player.invincible = 2.4;
    player.x = SCREEN_WIDTH * 0.2;
    player.y = SCREEN_HEIGHT * 0.5;
    player.vx = 0;
    player.vy = 0;
    player.carrying.forEach((human) => releaseHuman(human, false));
    player.carrying.clear();
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
      p.vx *= 0.98;
      p.vy += p.gravity * dt;
    }
  }

  // Particle fan-out doubles as a light source to sell the CRT bloom on explosions.
  function spawnExplosion(x, y, { sparks = 22, hue = 'rgba(255,150,190,0.8)' } = {}) {
    for (let i = 0; i < sparks; i += 1) {
      const angle = (i / sparks) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 60 + Math.random() * 160;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.4,
        gravity: 60,
        color: hue,
      });
    }
    addLight({ x, y, radius: 90, color: 'rgba(255,180,220,0.55)', intensity: 1.8 });
  }

  function updateHud(force = false) {
    if (!force && state.hudTimer < HUD_UPDATE_INTERVAL) return;
    scoreEl.textContent = String(state.score | 0);
    livesEl.textContent = String(Math.max(0, state.lives));
    humansEl.textContent = String(countActiveHumans());
  }

  function countActiveHumans() {
    return humans.reduce((sum, human) => sum + (human.state === 'lost' ? 0 : 1), 0);
  }

  // Render pass draws into the low-res canvas before the CRT post-process warps it.
  function draw(now) {
    currentCameraX = getCameraX({ includeShake: true });
    const cam = currentCameraX;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground(cam, now);
    drawGround(cam);
    drawHumans(cam, now);
    drawLasers(cam);
    drawEnemies(cam, now);
    drawPlayer(cam, now);
    drawParticles(cam);
    drawLights(cam);
    const alarmAlpha = Math.min(0.35, state.humansAlarm * 0.8);
    if (alarmAlpha > 0.01) {
      ctx.fillStyle = `rgba(255, 90, 140, ${alarmAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();

    const overlays = [];
    const shock = getShockInfo();
    if (shock.active) {
      const elapsed = now - shock.start;
      const t = Math.min(1, elapsed / shock.duration);
      const split = 1.8 * (1 - t);
      if (split > 0.02) {
        overlays.push({ dx: split, tint: 'rgba(255,120,120,0.7)', alpha: 0.65 });
        overlays.push({ dx: -split, tint: 'rgba(120,200,255,0.7)', alpha: 0.65 });
      }
    }

    crtPost.render({ overlays });

    drawShockwave(now);
    drawFlash(now);
    drawIris(now);

    if (state.gameOver) drawMessage('OUT OF LIVES', 'Press R to restart');
    else if (state.paused) drawMessage('PAUSED', 'Press P to resume');
  }

  function getCameraX({ includeShake = true } = {}) {
    const base = clamp(player.x - SCREEN_WIDTH * 0.33, 0, WORLD_WIDTH - SCREEN_WIDTH);
    if (!includeShake) return base;
    if (state.shakeStrength > 0 && state.shakeTime > 0) {
      const shake = state.shakeStrength * (state.shakeTime);
      const offset = (Math.random() - 0.5) * shake;
      return clamp(base + offset, 0, WORLD_WIDTH - SCREEN_WIDTH);
    }
    return base;
  }

  // Background nebula mixes static gradients with twinkling stars for depth.
  function drawBackground(cam, now) {
    ctx.save();
    ctx.fillStyle = '#020611';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    starLayers.forEach((layer) => {
      const twinkleSpeed = 0.0025;
      const baseAlpha = layer.color.match(/rgba\(([^,]+),([^,]+),([^,]+),([^\)]+)/);
      const alpha = baseAlpha ? parseFloat(baseAlpha[4]) : 0.5;
      layer.stars.forEach((star) => {
        const sx = star.x - cam * layer.parallax;
        if (sx < -4 || sx > SCREEN_WIDTH + 4) return;
        const twinkle = 0.65 + Math.sin(star.twinkle + now * twinkleSpeed) * 0.35;
        ctx.fillStyle = layer.color.replace(/0\.\d+\)/, `${(alpha * twinkle).toFixed(3)})`);
        ctx.fillRect(sx | 0, (star.y | 0), layer.size, layer.size);
      });
    });
    ctx.restore();
  }

  // Stylised cityscape retains a simple silhouette so it reads through the bloom.
  function drawGround(cam) {
    ctx.save();
    ctx.beginPath();
    const startIdx = Math.max(0, Math.floor(cam / TILE) - 2);
    const endIdx = Math.min(groundProfile.length - 1, Math.ceil((cam + SCREEN_WIDTH) / TILE) + 2);
    ctx.moveTo(0, SCREEN_HEIGHT);
    for (let i = startIdx; i <= endIdx; i += 1) {
      const worldX = i * TILE;
      const screenX = worldX - cam;
      const y = groundProfile[i];
      ctx.lineTo(screenX, y);
    }
    ctx.lineTo(SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = 'rgba(8, 18, 36, 0.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // City glow windows
    ctx.fillStyle = 'rgba(60, 160, 255, 0.18)';
    for (let i = startIdx; i <= endIdx; i += 1) {
      if (i % 18 !== 0) continue;
      const worldX = i * TILE + 6;
      const sx = worldX - cam;
      if (sx < -8 || sx > SCREEN_WIDTH + 8) continue;
      const base = groundProfile[i] - 10;
      ctx.fillRect(sx, base - 16, 3, 6);
      ctx.fillRect(sx + 6, base - 28, 3, 8);
    }
    ctx.restore();
  }

  // Colonists glow softly so they pop against the dark terrain.
  function drawHumans(cam, now) {
    ctx.save();
    humans.forEach((human) => {
      if (human.state === 'lost') return;
      const sx = human.x - cam;
      if (sx < -12 || sx > SCREEN_WIDTH + 12) return;
      const pulse = 0.4 + Math.sin(now * 0.01 + human.wobble) * 0.2;
      ctx.fillStyle = human.state === 'carriedByPlayer' ? 'rgba(120,255,210,0.85)' : 'rgba(120,220,255,0.75)';
      ctx.fillRect(sx - 2, human.y - 6, 4, 6);
      ctx.fillStyle = 'rgba(220,240,255,0.8)';
      ctx.fillRect(sx - 1, human.y - 8, 2, 2);
      ctx.fillStyle = `rgba(120,200,255,${0.4 + pulse})`;
      ctx.fillRect(sx - 3, human.y, 6, 1);
      if (human.state === 'falling') {
        addLight({ x: human.x, y: human.y, radius: 36, color: 'rgba(120, 220, 255, 0.35)', intensity: 0.8 });
      }
    });
    ctx.restore();
  }

  // Bright horizontal bolts mimic the classic Defender beam sweep.
  function drawLasers(cam) {
    ctx.save();
    ctx.fillStyle = '#82f6ff';
    lasers.forEach((laser) => {
      const sx = laser.x - cam;
      if (sx < -4 || sx > SCREEN_WIDTH + 4) return;
      ctx.fillRect(sx - 6, laser.y - 1, 12, 2);
      addLight({ x: laser.x, y: laser.y, radius: 48, color: 'rgba(110, 220, 255, 0.45)', intensity: 0.9 });
    });
    ctx.restore();
  }

  // Raiders pulse red/pink to contrast with the teal defender palette.
  function drawEnemies(cam, now) {
    ctx.save();
    enemies.forEach((enemy) => {
      const sx = enemy.x - cam;
      if (sx < -20 || sx > SCREEN_WIDTH + 20) return;
      const pulse = 0.6 + Math.sin(now * 0.012 + enemy.timer * 6) * 0.2;
      ctx.fillStyle = `rgba(255, 150, 180, ${0.6 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(sx, enemy.y, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(sx - 3, enemy.y - 1, 6, 2);
    });
    ctx.restore();
  }

  // Player sprite is intentionally simple triangles to stay readable once warped.
  function drawPlayer(cam, now) {
    const sx = player.x - cam;
    ctx.save();
    const flicker = player.invincible > 0 ? Math.sin(now * 0.02) > 0 : true;
    if (flicker) {
      ctx.fillStyle = '#7bfddb';
      ctx.beginPath();
      const direction = player.facing;
      ctx.moveTo(sx + direction * 12, player.y);
      ctx.lineTo(sx - direction * 10, player.y - 6);
      ctx.lineTo(sx - direction * 10, player.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(sx + direction * 6, player.y - 2, 6 * direction, 4);
    }
    ctx.restore();
  }

  function drawParticles(cam) {
    ctx.save();
    particles.forEach((p) => {
      const sx = p.x - cam;
      if (sx < -8 || sx > SCREEN_WIDTH + 8) return;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx - 1, p.y - 1, 2, 2);
    });
    ctx.restore();
  }

  // Deferred light volumes blended in additive mode to fake bloom without WebGL.
  function drawLights(cam) {
    if (lights.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lights.forEach((light) => {
      const sx = light.x - cam;
      const sy = light.y;
      if (sx < -light.radius || sx > SCREEN_WIDTH + light.radius) return;
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, light.radius);
      gradient.addColorStop(0, light.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = clamp(light.intensity ?? 1, 0, 2);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sx, sy, light.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    lights.length = 0;
  }

  function drawMessage(title, subtitle) {
    ctx.save();
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(3, 8, 18, 0.85)';
    ctx.fillRect(SCREEN_WIDTH / 2 - 120, SCREEN_HEIGHT / 2 - 40, 240, 80);
    ctx.fillStyle = '#aef';
    ctx.fillText(title, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 8);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#def';
    ctx.fillText(subtitle, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 18);
    ctx.restore();
  }

  function loop(now) {
    if (!loop.last) loop.last = now;
    const dt = Math.min(0.05, (now - loop.last) / 1000);
    loop.last = now;

    update(now, dt);
    draw(now);

    updateFps(now);
    setBounds({ width: canvas.width, height: canvas.height });

    requestAnimationFrame(loop);
  }

  let fpsCounter = { frames: 0, time: 0 };
  function updateFps(now) {
    fpsCounter.frames += 1;
    if (!fpsCounter.time) fpsCounter.time = now;
    if (now - fpsCounter.time >= 500) {
      const fps = Math.round((fpsCounter.frames * 1000) / (now - fpsCounter.time));
      fpsEl.textContent = ` ${fps} FPS`;
      fpsCounter.frames = 0;
      fpsCounter.time = now;
    }
  }

  function addLight(light) {
    lights.push(light);
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function distanceSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  function mulberry32(seed) {
    return function next() {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  resetGame();
  requestAnimationFrame(loop);
})();
