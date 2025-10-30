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
import { stepProjectiles } from '../shared/utils/projectiles.js';
import { generateSpaceshipSprite } from '../sprite-generator/generator.js';

(async () => {
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
  const weaponEl = document.getElementById('weapon');
  const stageEl = document.getElementById('stage');
  const fpsEl = document.getElementById('fps');
  const fpsCounter = createFpsCounter({ element: fpsEl, intervalMs: 500 });

  const TILE = DEFAULT_TILE_SIZE;
  const COLS = 40;
  const ROWS = 28;
  pixel.resizeToGrid(COLS, ROWS, TILE);
  createScreenViewport({
    canvas,
    css: {
      scale: 3,
      minWidth: 700,
      maxWidth: 1200,
    },
  });

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
    bombBullet: '#ffd8a6',
    homingBullet: '#b7f1ff',
    powerupMain: '#8ae8ff',
    powerupBomb: '#ffcf6b',
    powerupMissile: '#b7f1ff',
    powerupShield: '#a4ffcf',
    bulletMinigun: '#c6f8ff',
    bulletPlasma: '#d7c6ff',
    bulletFireball: '#ffb88a',
    helperBody: '#baf2ff',
    helperAccent: '#4cd2ff',
    helperBullet: '#e0fbff',
    missileGround: '#ffe9a1',
    turret: '#7e6bff',
    pause: 'rgba(14, 20, 40, 0.75)',
    text: '#f4faff',
  };

  // Sprite cache shared between the player and enemy spawners.
  const spriteAssets = {
    player: null,
    enemies: [],
  };

  function getSourceDimensions(source) {
    if (!source) return { width: 0, height: 0 };
    const width = source.naturalWidth ?? source.width ?? 0;
    const height = source.naturalHeight ?? source.height ?? 0;
    return { width, height };
  }

  // Convert an SVG blob URL into an image we can blit onto the main canvas.
  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load spaceship sprite'));
      img.src = url;
    });
  }

  // Mirror the Time Pilot loader: clone the generated SVG and turn it into a data URL
  // so we can feed it straight into an Image element.
  function svgToDataUrl(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const markup = new XMLSerializer().serializeToString(clone);
    const encoded = window.btoa(unescape(encodeURIComponent(markup)));
    return `data:image/svg+xml;base64,${encoded}`;
  }

  // Measure the sprite without mutating the original DOM node so we can reuse it later.
  function measureSvgBounds(svg) {
    const probe = svg.cloneNode(true);
    probe.setAttribute('width', '200');
    probe.setAttribute('height', '200');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    const bbox = probe.getBBox();
    document.body.removeChild(probe);
    return bbox;
  }

  // Generate a spaceship sprite using the shared generator and prepare canvas-friendly metadata.
  async function createSpaceshipTexture(options = {}) {
    const {
      category = 'fighter',
      seed,
      paletteName,
      palette,
      viewMode = 'side',
      flipHorizontal = false,
    } = options;

    const { svg, config } = generateSpaceshipSprite({
      category,
      seed,
      paletteName,
      palette,
      viewMode,
    });

    const bbox = measureSvgBounds(svg);
    const dataUrl = svgToDataUrl(svg);
    const image = await loadImageFromUrl(dataUrl);

    const { width: imgWidth, height: imgHeight } = getSourceDimensions(image);
    const anchorX = bbox.x + bbox.width / 2;
    const anchorY = bbox.y + bbox.height / 2;

    const baseBounds = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    };
    const baseExtents = {
      left: anchorX - bbox.x,
      right: (bbox.x + bbox.width) - anchorX,
      top: anchorY - bbox.y,
      bottom: (bbox.y + bbox.height) - anchorY,
    };

    let finalImage = image;
    let anchor = { x: anchorX, y: anchorY };
    let bounds = { ...baseBounds };
    let extents = { ...baseExtents };

    if (flipHorizontal) {
      const canvas = document.createElement('canvas');
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0);
      finalImage = canvas;
      anchor = { x: canvas.width - anchorX, y: anchorY };
      bounds = {
        x: canvas.width - (baseBounds.x + baseBounds.width),
        y: baseBounds.y,
        width: baseBounds.width,
        height: baseBounds.height,
      };
      extents = {
        left: baseExtents.right,
        right: baseExtents.left,
        top: baseExtents.top,
        bottom: baseExtents.bottom,
      };
    }

    const tailOffset = flipHorizontal ? -extents.left : extents.right;
    const noseOffset = flipHorizontal ? extents.right : -extents.left;

    return {
      image: finalImage,
      config,
      anchor,
      bounds,
      extents,
      tailOffset,
      noseOffset,
      sourceDimensions: { width: imgWidth, height: imgHeight },
      scale: 1,
      renderWidth: 0,
      renderHeight: 0,
    };
  }

  // Normalise the sprite so it renders at roughly the requested in-game width.
  function applySpriteScale(sprite, targetWidth) {
    const width = sprite?.bounds?.width || sprite?.sourceDimensions?.width || 1;
    const height = sprite?.bounds?.height || sprite?.sourceDimensions?.height || 1;
    const scale = width > 0 ? targetWidth / width : 1;
    sprite.scale = scale;
    sprite.renderWidth = width * scale;
    sprite.renderHeight = height * scale;
    return sprite;
  }

  // Preload a deterministic set of sprites for the player and fighters.
  async function prepareSpriteAssets() {
    const enemySeeds = [9027, 9031, 9043];
    const playerSpritePromise = createSpaceshipTexture({
      category: 'fighter',
      seed: 1337,
      paletteName: 'Ion Drift',
      viewMode: 'side',
      flipHorizontal: true,
    });
    const enemyPromises = enemySeeds.map((seed) => createSpaceshipTexture({
      category: 'fighter',
      seed,
      paletteName: 'Photon Ember',
      viewMode: 'side',
    }));

    const [playerSprite, ...enemySprites] = await Promise.all([
      playerSpritePromise,
      ...enemyPromises,
    ]);

    applySpriteScale(playerSprite, 24);
    playerSprite.tailOffsetScaled = playerSprite.tailOffset * playerSprite.scale;
    playerSprite.noseOffsetScaled = playerSprite.noseOffset * playerSprite.scale;

    const scaledEnemies = enemySprites.map((sprite) => {
      applySpriteScale(sprite, 20);
      sprite.tailOffsetScaled = sprite.tailOffset * sprite.scale;
      sprite.noseOffsetScaled = sprite.noseOffset * sprite.scale;
      return sprite;
    });

    return { player: playerSprite, enemies: scaledEnemies };
  }

  const spriteAssetsPromise = prepareSpriteAssets();

  // Shared draw helper so both the player and enemies can blit the cached SVG output.
  function drawSpaceshipSprite(ctx, sprite, options = {}) {
    if (!sprite?.image) return;
    const scale = options.scale ?? sprite.scale ?? 1;
    const rotation = options.rotation ?? 0;
    const sourceWidth = sprite.sourceDimensions?.width ?? sprite.image.width ?? 0;
    const sourceHeight = sprite.sourceDimensions?.height ?? sprite.image.height ?? 0;
    if (!sourceWidth || !sourceHeight) return;

    ctx.save();
    if (rotation !== 0) ctx.rotate(rotation);
    const anchorX = (sprite.anchor?.x ?? sourceWidth / 2) * scale;
    const anchorY = (sprite.anchor?.y ?? sourceHeight / 2) * scale;
    ctx.drawImage(sprite.image, -anchorX, -anchorY, sourceWidth * scale, sourceHeight * scale);
    ctx.restore();
  }

  const POWERUP_TYPES = {
    main: [
      { type: 'laser', label: 'Lazer Cannon' },
      { type: 'minigun', label: 'Minigun' },
      { type: 'plasma', label: 'Plasma Lance' },
      { type: 'fireball', label: 'Fireball' },
    ],
    bomb: [
      { type: 'bomb', label: 'Impact Bombs' },
      { type: 'firebomb', label: 'Firebombs' },
      { type: 'cluster', label: 'Cluster Bombs' },
    ],
    missile: [
      { type: 'homing', label: 'Homing Missiles' },
      { type: 'ground', label: 'Ground Missiles' },
    ],
    shield: [
      { type: 'aegis', label: 'Aegis Shield' },
      { type: 'phase', label: 'Phase Shield' },
      { type: 'pulse', label: 'Pulse Shield' },
    ],
  };

  const MAIN_WEAPON_DATA = {
    laser: { cooldown: () => Math.max(0.08, settings.fireInterval * (0.95 - state.stage * 0.02)), spread: 0 },
    minigun: { cooldown: () => 0.06, spread: 0.12 },
    plasma: { cooldown: () => 0.16, spread: 0.05 },
    fireball: { cooldown: () => 0.22, spread: 0.08 },
  };

  const BOMB_DATA = {
    bomb: { cooldown: 0.8 },
    firebomb: { cooldown: 1.05 },
    cluster: { cooldown: 1.2 },
  };

  const MISSILE_DATA = {
    homing: { cooldown: 0.6 },
    ground: { cooldown: 0.75 },
  };

  const SHIELD_DATA = {
    aegis: { cooldown: 5, invincible: 1.2 },
    phase: { cooldown: 6, invincible: 1.6 },
    pulse: { cooldown: 4.5, invincible: 1, shockwave: true },
  };

  // Predefined enemy packs that fly in tight classic-style formations.
  const FORMATION_TEMPLATES = [
    {
      name: 'arrow',
      offsets: [
        { x: 0, y: 0 },
        { x: -24, y: -18 },
        { x: -24, y: 18 },
        { x: -48, y: -30 },
        { x: -48, y: 30 },
      ],
      amplitude: 16,
      frequency: 0.9,
      speed: 82,
      bobAmplitude: 5,
      bobFrequency: 1.6,
      canFire: false,
      score: 180,
    },
    {
      name: 'wall',
      offsets: [
        { x: 0, y: -24, canFire: true },
        { x: -22, y: -8 },
        { x: -44, y: 8, canFire: true },
        { x: -66, y: 24 },
        { x: -88, y: 40 },
      ],
      amplitude: 12,
      frequency: 0.6,
      speed: 72,
      bobAmplitude: 4,
      canFire: true,
      fireChance: 0.35,
      fireInterval: 2.4,
      fireVariance: 0.7,
      score: 200,
    },
    {
      name: 'column',
      offsets: [
        { x: 0, y: -30 },
        { x: -24, y: -10 },
        { x: -48, y: 10 },
        { x: -72, y: 30 },
      ],
      amplitude: 22,
      frequency: 1.2,
      speed: 88,
      bobAmplitude: 7,
      canFire: false,
      score: 210,
    },
    {
      name: 'loop',
      offsets: [
        { x: 0, y: 0, canFire: true },
        { x: -20, y: -20 },
        { x: -40, y: 20 },
        { x: -60, y: -20 },
        { x: -80, y: 20 },
      ],
      amplitude: 18,
      frequency: 1.5,
      speed: 94,
      bobAmplitude: 10,
      canFire: true,
      fireChance: 0.4,
      fireInterval: 1.9,
      fireVariance: 0.8,
      score: 220,
    },
  ];

  let terrain = buildTerrain(1);

  const stars = createStars(90);
  const bullets = [];
  const enemyBullets = [];
  const enemies = [];
  // Floating pickups that upgrade the player's weapons temporarily.
  const powerups = [];
  const formations = new Map();
  let nextFormationId = 1;
  let nextFormationTemplate = 0;
  const particles = [];
  const lights = [];

  const lightCanvas = document.createElement('canvas');
  const lightCtx = lightCanvas.getContext('2d');

  const player = {
    x: SCREEN_WIDTH * 0.24,
    y: SCREEN_HEIGHT * 0.5,
    width: 18,
    height: 12,
    invincible: 2,
    tilt: 0,
    fireTimers: {
      main: 0,
      bomb: 0,
      missile: 0,
    },
    weapons: {
      main: { type: 'laser' },
      bomb: { type: null },
      missile: { type: null },
      shield: { type: null, cooldown: 0 },
    },
  };

  // Lightweight drone companion that stays near the player and provides fire support.
  const helper = {
    mode: 'docked',
    x: SCREEN_WIDTH * 0.24 + 20,
    y: SCREEN_HEIGHT * 0.5 - 6,
    vx: 0,
    vy: 0,
    cooldown: 0,
    fireInterval: 0.36,
    fireRange: 220,
    shotSpeed: 360,
    standoffDistance: 32,
    maxDistance: 140,
    chaseStrength: 4,
    damping: 7,
    maxSpeed: 200,
    dockOffsetX: 22,
    dockOffsetY: -6,
    standbyOffsetX: 36,
    standbyOffsetY: -10,
  };

  const state = {
    cameraX: 0,
    stage: 1,
    score: 0,
    lives: 3,
    paused: false,
    gameOver: false,
    spawnTimer: 1.4,
    powerupTimer: 5.5,
  };

  function snapHelperToPlayer() {
    helper.x = state.cameraX + player.x + helper.dockOffsetX;
    helper.y = player.y + helper.dockOffsetY;
  }

  function dockHelper(immediate = false) {
    helper.mode = 'docked';
    helper.cooldown = 0;
    helper.vx = 0;
    helper.vy = 0;
    if (immediate) snapHelperToPlayer();
  }

  function deployHelper() {
    helper.mode = 'deployed';
  }

  function toggleHelper() {
    if (state.gameOver) return;
    if (helper.mode === 'docked') {
      deployHelper();
    } else {
      dockHelper();
    }
  }

  snapHelperToPlayer();

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
    } else if (key === 'enter') {
      toggleHelper();
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
    state.spawnTimer = 1.6;
    state.powerupTimer = 5.5;
    player.x = SCREEN_WIDTH * 0.24;
    player.y = SCREEN_HEIGHT * 0.5;
    player.invincible = 2;
    player.tilt = 0;
    player.fireTimers.main = 0;
    player.fireTimers.bomb = 0;
    player.fireTimers.missile = 0;
    player.weapons.main.type = 'laser';
    player.weapons.bomb.type = null;
    player.weapons.missile.type = null;
    player.weapons.shield.type = null;
    player.weapons.shield.cooldown = 0;
    dockHelper(true);
    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    powerups.length = 0;
    particles.length = 0;
    formations.clear();
    nextFormationId = 1;
    terrain = buildTerrain(state.stage);
    startIris('in', 900);
    updateHud(true);
  }

  function advanceStage() {
    state.stage += 1;
    state.cameraX = 0;
    state.spawnTimer = Math.max(1.1, 1.9 - state.stage * 0.06);
    state.powerupTimer = Math.max(4.2, 6.5 - state.stage * 0.25);
    enemies.length = 0;
    enemyBullets.length = 0;
    bullets.length = 0;
    powerups.length = 0;
    particles.length = 0;
    formations.clear();
    terrain = buildTerrain(state.stage);
    player.x = SCREEN_WIDTH * 0.24;
    player.y = Math.min(player.y, SCREEN_HEIGHT - TILE * 4);
    player.invincible = 2;
    player.fireTimers.main = 0;
    player.fireTimers.bomb = 0;
    player.fireTimers.missile = 0;
    if (helper.mode === 'docked') {
      snapHelperToPlayer();
    } else {
      helper.x = state.cameraX + player.x + helper.standbyOffsetX;
      helper.y = player.y + helper.standbyOffsetY;
      helper.vx = 0;
      helper.vy = 0;
      helper.cooldown = 0;
    }
    startIris('in', 750);
    updateHud(true);
  }

  function updateHud(force = false) {
    scoreEl.textContent = `${state.score}`;
    livesEl.textContent = `${state.lives}`;
    stageEl.textContent = `${state.stage}`;
    if (weaponEl) weaponEl.textContent = describeWeapon();
    if (force) fpsCounter.reset();
  }

  function describeWeapon() {
    const segments = [];
    segments.push(`Main: ${getPowerupLabel('main', player.weapons.main.type ?? 'laser')}`);
    segments.push(`Bomb: ${getPowerupLabel('bomb', player.weapons.bomb.type)}`);
    segments.push(`Missile: ${getPowerupLabel('missile', player.weapons.missile.type)}`);
    segments.push(`Shield: ${getPowerupLabel('shield', player.weapons.shield.type)}`);
    return segments.join(' | ');
  }

  function getPowerupLabel(category, type) {
    if (!type) return 'None';
    const options = POWERUP_TYPES[category] ?? [];
    const found = options.find((entry) => entry.type === type);
    if (found) return found.label;
    if (typeof type === 'string') {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    return 'Unknown';
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
    player.fireTimers.main = Math.max(0, player.fireTimers.main - dt);
    player.fireTimers.bomb = Math.max(0, player.fireTimers.bomb - dt);
    player.fireTimers.missile = Math.max(0, player.fireTimers.missile - dt);
    if (player.weapons.shield.cooldown > 0) {
      player.weapons.shield.cooldown = Math.max(0, player.weapons.shield.cooldown - dt);
    }
    if (player.invincible > 0) player.invincible = Math.max(0, player.invincible - dt);

    const horiz = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const vert = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    player.x += horiz * settings.playerSpeed * dt;
    player.y += vert * settings.verticalSpeed * dt;

    player.x = clamp(player.x, TILE * 2, SCREEN_WIDTH * 0.7);
    player.y = clamp(player.y, TILE * 2, SCREEN_HEIGHT - TILE * 2);

    player.tilt = player.tilt * 0.9 + (-vert) * 0.18;

    if (keys.fire && !state.gameOver) {
      firePlayerWeapons();
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

  function updateHelper(dt) {
    helper.cooldown = Math.max(0, helper.cooldown - dt);
    const playerWorldX = state.cameraX + player.x;
    const playerWorldY = player.y;

    if (helper.mode === 'docked') {
      const targetX = playerWorldX + helper.dockOffsetX;
      const targetY = playerWorldY + helper.dockOffsetY;
      const lerp = Math.min(1, dt * 12);
      helper.x += (targetX - helper.x) * lerp;
      helper.y += (targetY - helper.y) * lerp;
      helper.vx = 0;
      helper.vy = 0;
      return;
    }

    const standbyX = playerWorldX + helper.standbyOffsetX;
    const standbyY = playerWorldY + helper.standbyOffsetY;
    let desiredX = standbyX;
    let desiredY = standbyY;
    const target = findNearestEnemy(helper.x, helper.y);

    if (target) {
      const offsetX = target.x - helper.x;
      const offsetY = target.y - helper.y;
      const distance = Math.hypot(offsetX, offsetY) || 1;
      desiredX = target.x - (offsetX / distance) * helper.standoffDistance;
      desiredY = target.y - (offsetY / distance) * helper.standoffDistance;

      const relPlayerX = desiredX - playerWorldX;
      const relPlayerY = desiredY - playerWorldY;
      const desiredDist = Math.hypot(relPlayerX, relPlayerY);
      if (desiredDist > helper.maxDistance * 0.95) {
        const angle = Math.atan2(target.y - playerWorldY, target.x - playerWorldX);
        desiredX = playerWorldX + Math.cos(angle) * helper.maxDistance * 0.75;
        desiredY = playerWorldY + Math.sin(angle) * helper.maxDistance * 0.75;
      }
    }

    const dxPlayer = helper.x - playerWorldX;
    const dyPlayer = helper.y - playerWorldY;
    const distPlayer = Math.hypot(dxPlayer, dyPlayer);
    if (distPlayer > helper.maxDistance) {
      const scale = (helper.maxDistance * 0.9) / distPlayer;
      desiredX = playerWorldX + dxPlayer * scale;
      desiredY = playerWorldY + dyPlayer * scale;
    }

    const desiredVX = clamp((desiredX - helper.x) * helper.chaseStrength, -helper.maxSpeed, helper.maxSpeed);
    const desiredVY = clamp((desiredY - helper.y) * helper.chaseStrength, -helper.maxSpeed, helper.maxSpeed);
    const blend = Math.min(1, dt * helper.damping);
    helper.vx += (desiredVX - helper.vx) * blend;
    helper.vy += (desiredVY - helper.vy) * blend;

    helper.x += helper.vx * dt;
    helper.y += helper.vy * dt;

    const floor = getFloor(helper.x) - TILE * 1.2;
    const ceiling = getCeiling(helper.x) + TILE * 1.2;
    helper.y = clamp(helper.y, ceiling + 10, floor - 10);

    if (target) {
      const distance = Math.hypot(target.x - helper.x, target.y - helper.y);
      if (distance < helper.fireRange && helper.cooldown <= 0) {
        fireHelperAt(target);
      }
    }
  }

  function fireHelperAt(target) {
    const angle = Math.atan2(target.y - helper.y, target.x - helper.x);
    spawnHelperShot({
      x: helper.x,
      y: helper.y,
      angle,
    });
    helper.cooldown = helper.fireInterval;
  }

  function spawnHelperShot({ x, y, angle }) {
    const speed = helper.shotSpeed;
    bullets.push({
      kind: 'drone',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.2,
      damage: 1,
      color: COLORS.helperBullet,
    });
    shotTone();
  }

  function firePlayerWeapons() {
    const angle = player.tilt * 0.6;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const muzzleOffsetX = player.width * 0.55;
    const muzzleOffsetY = -1;
    const shipWorldX = state.cameraX + player.x;
    const shipWorldY = player.y;
    const spawnX = shipWorldX + muzzleOffsetX * cos - muzzleOffsetY * sin;
    const spawnY = shipWorldY + muzzleOffsetX * sin + muzzleOffsetY * cos;
    const muzzle = { x: spawnX, y: spawnY, angle, cos, sin };

    fireMainWeapon(muzzle);
    fireBombWeapon(muzzle);
    fireMissileWeapon(muzzle);
  }

  function fireMainWeapon(muzzle) {
    const type = player.weapons.main.type ?? 'laser';
    const data = MAIN_WEAPON_DATA[type] ?? MAIN_WEAPON_DATA.laser;
    const cooldown = typeof data.cooldown === 'function' ? data.cooldown() : data.cooldown;
    if (player.fireTimers.main > 0 || cooldown == null) return;

    if (type === 'minigun') {
      spawnMinigunBurst(muzzle, data.spread ?? 0);
    } else if (type === 'plasma') {
      spawnPlasmaShot(muzzle, data.spread ?? 0.05);
    } else if (type === 'fireball') {
      spawnFireballShot(muzzle, data.spread ?? 0.08);
    } else {
      spawnLaserShot(muzzle);
    }

    player.fireTimers.main = cooldown;
  }

  function fireBombWeapon(muzzle) {
    const type = player.weapons.bomb.type;
    if (!type) return;
    const data = BOMB_DATA[type];
    if (!data || player.fireTimers.bomb > 0) return;
    spawnBombShot({ ...muzzle, variant: type });
    player.fireTimers.bomb = data.cooldown;
  }

  function fireMissileWeapon(muzzle) {
    const type = player.weapons.missile.type;
    if (!type) return;
    const data = MISSILE_DATA[type];
    if (!data || player.fireTimers.missile > 0) return;
    if (type === 'ground') {
      spawnGroundMissile({ ...muzzle });
    } else {
      spawnHomingShot({ ...muzzle });
    }
    player.fireTimers.missile = data.cooldown;
  }

  function spawnLaserShot({ x, y, cos, sin }) {
    bullets.push({
      x,
      y,
      vx: cos * 380,
      vy: sin * 380,
      life: 1.4,
    });
    shotTone();
  }

  function spawnMinigunBurst({ x, y, angle }, spread) {
    const bulletsPerBurst = 2;
    for (let i = 0; i < bulletsPerBurst; i += 1) {
      const offset = (i - (bulletsPerBurst - 1) / 2) * spread;
      const theta = angle + offset * 0.6 + (Math.random() - 0.5) * spread * 0.3;
      bullets.push({
        x,
        y: y + (i === 0 ? -1 : 1),
        vx: Math.cos(theta) * 420,
        vy: Math.sin(theta) * 420,
        life: 0.9,
        damage: 0.7,
        color: COLORS.bulletMinigun,
      });
    }
    shotTone();
  }

  function spawnPlasmaShot({ x, y, angle }, spread) {
    const theta = angle + (Math.random() - 0.5) * spread;
    bullets.push({
      kind: 'plasma',
      x,
      y,
      vx: Math.cos(theta) * 320,
      vy: Math.sin(theta) * 320,
      life: 1.6,
      damage: 2,
      hitRadius: 18,
      color: COLORS.bulletPlasma,
    });
    shotTone();
  }

  function spawnFireballShot({ x, y, angle }, spread) {
    const theta = angle + (Math.random() - 0.5) * spread;
    const speed = 260;
    bullets.push({
      kind: 'fireball',
      x,
      y,
      vx: Math.cos(theta) * speed,
      vy: Math.sin(theta) * speed,
      life: 1.9,
      damage: 1.5,
      hitRadius: 20,
      color: COLORS.bulletFireball,
      onHit(hitX, hitY) {
        spawnExplosion(hitX, hitY, { count: 10, radius: 70 });
      },
    });
    shotTone();
  }

  function spawnBombShot({ x, y, angle, variant }) {
    const launchAngle = angle * 0.5;
    const cos = Math.cos(launchAngle);
    const sin = Math.sin(launchAngle);
    const baseSpeed = variant === 'firebomb' ? 240 : 260;
    const gravity = variant === 'cluster' ? 120 : 110;
    const bomb = {
      kind: 'bomb',
      variant: variant ?? 'bomb',
      x,
      y,
      vx: cos * baseSpeed,
      vy: sin * baseSpeed - 40,
      gravity,
      life: 1.8,
    };
    bomb.advance = (dt) => {
      bomb.vy += bomb.gravity * dt;
      bomb.x += bomb.vx * dt;
      bomb.y += bomb.vy * dt;
    };
    bullets.push(bomb);
    shotTone();
  }

  function spawnHomingShot({ x, y, angle }) {
    const speed = 320;
    const homing = {
      kind: 'homing',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      turnRate: 4.8,
      life: 2.9,
    };
    homing.advance = createHomingAdvance(homing);
    bullets.push(homing);
    shotTone();
  }

  function spawnGroundMissile({ x, y, angle }) {
    const speed = 300;
    const missile = {
      kind: 'missile',
      variant: 'ground',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      turnRate: 3.4,
      life: 2.6,
    };
    missile.advance = createGroundSeekingAdvance(missile);
    bullets.push(missile);
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

  function spawnFlameField(x, y) {
    for (let i = 0; i < 14; i += 1) {
      particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 1.2) * 30,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 2 + Math.random() * 1.6,
        color: '#ff9c64',
        gravity: -10,
        glow: { radius: 48, color: 'rgba(255, 150, 90, 0.32)' },
      });
    }
  }

  function spawnClusterBursts(x, y) {
    const bursts = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < bursts; i += 1) {
      const angle = (Math.PI * 2 * i) / bursts + Math.random() * 0.3;
      const distance = 20 + Math.random() * 16;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      spawnExplosion(px, py, { count: 6, radius: 60 });
    }
  }

  function updateBullets(dt) {
    stepProjectiles(bullets, dt, {
      advance(bullet, delta) {
        if (typeof bullet.advance === 'function') {
          bullet.advance(delta);
        } else {
          if (typeof bullet.vx === 'number') bullet.x += bullet.vx * delta;
          if (typeof bullet.vy === 'number') bullet.y += bullet.vy * delta;
        }
      },
      shouldRemove(bullet) {
        const margin = bullet.kind === 'bomb' ? 80 : 40;
        const screenX = bullet.x - state.cameraX;
        return (
          screenX > SCREEN_WIDTH + margin ||
          screenX < -margin ||
          bullet.y < -60 ||
          bullet.y > SCREEN_HEIGHT + 60
        );
      },
      onActive(bullet) {
        if (isSolid(bullet.x, bullet.y)) {
          if (bullet.kind === 'bomb') {
            detonateBomb(bullet);
          } else if (bullet.kind === 'fireball') {
            if (typeof bullet.onHit === 'function') bullet.onHit(bullet.x, bullet.y);
          } else {
            spawnSpark(bullet.x, bullet.y);
          }
          return true;
        }
        const radius = bullet.hitRadius ?? (bullet.kind === 'bomb'
          ? 26
          : bullet.kind === 'homing' || bullet.kind === 'missile'
            ? 16
            : 12);
        const radiusSq = radius * radius;
        for (let j = enemies.length - 1; j >= 0; j -= 1) {
          const enemy = enemies[j];
          const dx = enemy.x - bullet.x;
          const dy = enemy.y - bullet.y;
          if (dx * dx + dy * dy < radiusSq) {
            if (bullet.kind === 'bomb') {
              detonateBomb(bullet);
            } else {
              damageEnemy(enemy, bullet.damage ?? 1, bullet.x, bullet.y);
              if (typeof bullet.onHit === 'function') {
                bullet.onHit(enemy.x, enemy.y);
              }
            }
            return true;
          }
        }
        return false;
      },
      onRemove(bullet) {
        if (bullet.kind === 'bomb') {
          detonateBomb(bullet);
        } else if (bullet.kind === 'fireball' && typeof bullet.onHit === 'function') {
          bullet.onHit(bullet.x, bullet.y);
        }
      },
    });
  }

  function detonateBomb(bomb) {
    if (!bomb || bomb.detonated) return;
    bomb.detonated = true;
    const variant = bomb.variant ?? 'bomb';
    const explosionRadius = variant === 'firebomb' ? 130 : variant === 'cluster' ? 100 : 110;
    const particleCount = variant === 'firebomb' ? 20 : 16;
    spawnExplosion(bomb.x, bomb.y, { count: particleCount, radius: explosionRadius });
    let damaged = false;
    const blastRadius = 90;
    const blastSq = blastRadius * blastRadius;
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      const dx = enemy.x - bomb.x;
      const dy = enemy.y - bomb.y;
      if (dx * dx + dy * dy <= blastSq) {
        damageEnemy(enemy, 3, bomb.x, bomb.y);
        damaged = true;
      }
    }
    if (!damaged) hitTone();
    if (variant === 'firebomb') {
      spawnFlameField(bomb.x, bomb.y);
    } else if (variant === 'cluster') {
      spawnClusterBursts(bomb.x, bomb.y);
    }
  }

  function createHomingAdvance(bullet) {
    let heading = Math.atan2(bullet.vy ?? 0, bullet.vx ?? bullet.speed ?? 0);
    return (dt) => {
      const target = findNearestEnemy(bullet.x, bullet.y);
      if (target) {
        const desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        let delta = normalizeAngle(desired - heading);
        const maxTurn = (bullet.turnRate ?? 4.8) * dt;
        if (delta > maxTurn) delta = maxTurn;
        if (delta < -maxTurn) delta = -maxTurn;
        heading += delta;
        const speed = bullet.speed ?? (Math.hypot(bullet.vx ?? 0, bullet.vy ?? 0) || 280);
        bullet.vx = Math.cos(heading) * speed;
        bullet.vy = Math.sin(heading) * speed;
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    };
  }

  function createGroundSeekingAdvance(bullet) {
    let heading = Math.atan2(bullet.vy ?? 0, bullet.vx ?? bullet.speed ?? 0);
    return (dt) => {
      const target = findGroundEnemy(bullet.x, bullet.y);
      if (target) {
        const desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        let delta = normalizeAngle(desired - heading);
        const maxTurn = (bullet.turnRate ?? 3.4) * dt;
        if (delta > maxTurn) delta = maxTurn;
        if (delta < -maxTurn) delta = -maxTurn;
        heading += delta;
      } else {
        heading += (Math.sin(Date.now() * 0.0015 + bullet.x * 0.01) * 0.12) * dt;
      }
      const speed = bullet.speed ?? 280;
      bullet.vx = Math.cos(heading) * speed;
      bullet.vy = Math.sin(heading) * speed;
      if (bullet.vy > 180) bullet.vy = 180;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      const floor = getFloor(bullet.x) - TILE * 0.5;
      if (bullet.y > floor) bullet.y = floor;
    };
  }

  function findNearestEnemy(x, y) {
    let closest = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const enemy of enemies) {
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDist) {
        bestDist = distSq;
        closest = enemy;
      }
    }
    return closest;
  }

  function findGroundEnemy(x, y) {
    let closest = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const enemy of enemies) {
      const nearGround = enemy.type === 'turret' || enemy.y > getFloor(enemy.x) - TILE * 1.5;
      if (!nearGround) continue;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDist) {
        bestDist = distSq;
        closest = enemy;
      }
    }
    return closest;
  }

  function normalizeAngle(angle) {
    let result = angle;
    while (result > Math.PI) result -= Math.PI * 2;
    while (result < -Math.PI) result += Math.PI * 2;
    return result;
  }

  function updateEnemyBullets(dt) {
    stepProjectiles(enemyBullets, dt, {
      shouldRemove(shot) {
        const screenX = shot.x - state.cameraX;
        return screenX < -40 || screenX > SCREEN_WIDTH + 40;
      },
      onActive(shot) {
        if (isSolid(shot.x, shot.y)) {
          spawnSpark(shot.x, shot.y, '#ff9ea8');
          return true;
        }
        if (player.invincible <= 0) {
          const dx = (state.cameraX + player.x) - shot.x;
          const dy = player.y - shot.y;
          if (dx * dx + dy * dy < 12 * 12) {
            loseLife();
            return true;
          }
        }
        return false;
      },
    });
  }

  function updateEnemies(dt, now) {
    updateFormations(dt);
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemyWave();
      state.spawnTimer = Math.max(1.1, 1.9 - state.stage * 0.06) + Math.random() * 0.25;
    }

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      if (enemy.type === 'fighter') {
        if (enemy.formationId) {
          const formation = formations.get(enemy.formationId);
          if (!formation) {
            removeEnemyAt(i);
            continue;
          }
          const bob = enemy.bobAmplitude
            ? Math.sin(formation.t * (enemy.bobFrequency || 1) + enemy.bobPhase) * enemy.bobAmplitude
            : 0;
          enemy.x = formation.anchorX + enemy.offsetX;
          enemy.y = formation.anchorY + enemy.offsetY + bob;

          if (enemy.canFire) {
            if (enemy.fireTimer > 0) enemy.fireTimer -= dt;
            if (enemy.fireTimer <= 0) {
              const vx = -140 - state.stage * 6;
              const vy = Math.sin(formation.t * 1.3 + enemy.offsetX * 0.04) * 55;
              enemyBullets.push({
                x: enemy.x - enemy.width * 0.3,
                y: enemy.y,
                vx,
                vy,
                life: 2.8,
              });
              enemy.fireTimer = (enemy.fireCooldown ?? 2.3) + Math.random() * (enemy.fireVariance ?? 0.6);
            }
          }
        } else {
          enemy.x += (enemy.vx ?? -90) * dt;
          enemy.y += (enemy.vy ?? 0) * dt;
        }
      } else if (enemy.type === 'turret') {
        if (enemy.fireTimer > 0) enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          enemy.fireTimer = (enemy.fireCooldown ?? 2.5) + Math.random() * 0.6;
          const dir = Math.atan2(player.y - enemy.y, (state.cameraX + player.x) - enemy.x);
          enemyBullets.push({
            x: enemy.x,
            y: enemy.y - enemy.height * 0.3,
            vx: Math.cos(dir) * 150,
            vy: Math.sin(dir) * 150,
            life: 3.2,
          });
        }
      }

      if (isSolid(enemy.x, enemy.y)) {
        spawnExplosion(enemy.x, enemy.y, { count: 8, radius: 70 });
        removeEnemyAt(i);
        continue;
      }

      const screenX = enemy.x - state.cameraX;
      if (screenX < -60) {
        removeEnemyAt(i);
      }
    }
  }

  function spawnEnemyWave() {
    const rightEdge = state.cameraX + SCREEN_WIDTH + TILE * 4;
    const turretChance = clamp(0.14 + state.stage * 0.02, 0.14, 0.32);
    if (Math.random() < turretChance) {
      spawnTurret(rightEdge + 36);
      return;
    }

    const template = FORMATION_TEMPLATES[nextFormationTemplate % FORMATION_TEMPLATES.length];
    nextFormationTemplate = (nextFormationTemplate + 1) % FORMATION_TEMPLATES.length;
    spawnFormationWave(template, rightEdge + 40);
  }

  function spawnFormationWave(template, spawnX) {
    const formationId = nextFormationId++;
    const sampleX = spawnX + TILE * 2;
    const floor = getFloor(sampleX) - TILE * 2.5;
    const ceiling = getCeiling(sampleX) + TILE * 2.5;
    const minY = clamp(ceiling + 26, TILE * 3, SCREEN_HEIGHT - TILE * 5);
    const maxY = clamp(floor - 26, TILE * 4, SCREEN_HEIGHT - TILE * 3);
    const band = Math.max(12, maxY - minY);
    const baseY = clamp(minY + Math.random() * band, TILE * 3, SCREEN_HEIGHT - TILE * 3);
    const amplitude = (template.amplitude ?? 12) + Math.min(10, state.stage * 1.2);
    const allowFire = template.canFire && Math.random() < (template.fireChance ?? 0.25);
    const formation = {
      id: formationId,
      anchorX: spawnX,
      baseY,
      anchorY: baseY,
      amplitude,
      frequency: template.frequency ?? 1,
      speed: -(template.speed + state.stage * 4.2),
      bobFrequency: template.bobFrequency ?? 0,
      t: 0,
      members: template.offsets.length,
      allowFire,
      fireInterval: template.fireInterval ?? 2.2,
      fireVariance: template.fireVariance ?? 0.6,
    };
    formations.set(formationId, formation);

    for (const offset of template.offsets) {
      const bobAmplitude = offset.bobAmplitude ?? template.bobAmplitude ?? 0;
      const bobFrequency = offset.bobFrequency ?? template.bobFrequency ?? (bobAmplitude ? 1.2 + Math.random() * 0.6 : 0);
      const sprite = spriteAssets.enemies.length
        ? spriteAssets.enemies[Math.floor(Math.random() * spriteAssets.enemies.length)]
        : null;
      const spriteWidth = sprite?.renderWidth ?? 16;
      const spriteHeight = sprite?.renderHeight ?? 12;
      enemies.push({
        type: 'fighter',
        formationId,
        offsetX: offset.x,
        offsetY: offset.y,
        bobAmplitude,
        bobFrequency,
        bobPhase: Math.random() * Math.PI * 2,
        width: Math.max(14, spriteWidth * 0.7),
        height: Math.max(10, spriteHeight * 0.6),
        hp: 2,
        score: template.score ?? 180,
        canFire: formation.allowFire && (offset.canFire ?? false),
        fireTimer: (formation.fireInterval ?? 2.2) * 0.6 + Math.random() * 0.5,
        fireCooldown: formation.fireInterval,
        fireVariance: formation.fireVariance,
        sprite,
      });
    }
  }

  function spawnTurret(spawnX) {
    const floor = getFloor(spawnX) - TILE * 0.5;
    enemies.push({
      type: 'turret',
      x: spawnX,
      y: floor,
      width: 18,
      height: TILE * 2,
      hp: 4,
      fireTimer: 1.2,
      fireCooldown: Math.max(1.8, 2.7 - state.stage * 0.1),
      score: 260,
    });
  }

  function updateFormations(dt) {
    const expired = [];
    for (const formation of formations.values()) {
      formation.t += dt;
      formation.anchorX += formation.speed * dt;
      const wave = Math.sin(formation.t * (formation.frequency ?? 1)) * formation.amplitude;
      const desiredY = formation.baseY + wave;
      const floor = getFloor(formation.anchorX) - TILE * 2.4;
      const ceiling = getCeiling(formation.anchorX) + TILE * 2.4;
      const minY = clamp(ceiling + 24, TILE * 3, SCREEN_HEIGHT - TILE * 4);
      const maxY = clamp(floor - 24, TILE * 4, SCREEN_HEIGHT - TILE * 3);
      formation.anchorY = clamp(desiredY, minY, maxY);

      if (formation.members <= 0 || formation.anchorX - state.cameraX < -SCREEN_WIDTH - 140) {
        expired.push(formation.id);
      }
    }
    for (const id of expired) {
      formations.delete(id);
    }
  }

  function detachEnemy(enemy) {
    if (!enemy || !enemy.formationId) return;
    const formation = formations.get(enemy.formationId);
    if (formation) {
      formation.members -= 1;
      if (formation.members <= 0) formations.delete(enemy.formationId);
    }
  }

  function removeEnemyAt(index) {
    if (index < 0 || index >= enemies.length) return null;
    const [enemy] = enemies.splice(index, 1);
    detachEnemy(enemy);
    return enemy;
  }

  function removeEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index !== -1) {
      enemies.splice(index, 1);
    }
    detachEnemy(enemy);
  }

  function chooseRandomPowerup() {
    const options = [];
    for (const [category, variants] of Object.entries(POWERUP_TYPES)) {
      for (const variant of variants) {
        options.push({ category, type: variant.type });
      }
    }
    const filtered = options.filter((option) => {
      if (option.category === 'main') return option.type !== (player.weapons.main.type ?? 'laser');
      if (option.category === 'bomb') return option.type !== player.weapons.bomb.type;
      if (option.category === 'missile') return option.type !== player.weapons.missile.type;
      if (option.category === 'shield') return option.type !== player.weapons.shield.type;
      return true;
    });
    const pool = filtered.length ? filtered : options;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnPowerup() {
    const spawnX = state.cameraX + SCREEN_WIDTH + TILE * 3;
    const floor = getFloor(spawnX) - TILE * 2.2;
    const ceiling = getCeiling(spawnX) + TILE * 2.2;
    const minY = clamp(ceiling + 20, TILE * 3, SCREEN_HEIGHT - TILE * 4);
    const maxY = clamp(floor - 20, TILE * 4, SCREEN_HEIGHT - TILE * 3);
    const baseY = clamp(minY + Math.random() * Math.max(10, maxY - minY), TILE * 3, SCREEN_HEIGHT - TILE * 3);
    const selection = chooseRandomPowerup();
    powerups.push({
      type: selection.type,
      category: selection.category,
      x: spawnX,
      baseY,
      y: baseY,
      vx: -(settings.scrollSpeed * 0.6),
      bobTimer: 0,
      bobAmplitude: 18,
      width: 14,
      height: 12,
    });
  }

  function activatePowerup(power) {
    if (!power || !power.category || !power.type) return;
    if (power.category === 'main') {
      player.weapons.main.type = power.type;
      player.fireTimers.main = 0;
    } else if (power.category === 'bomb') {
      player.weapons.bomb.type = power.type;
      player.fireTimers.bomb = 0;
    } else if (power.category === 'missile') {
      player.weapons.missile.type = power.type;
      player.fireTimers.missile = 0;
    } else if (power.category === 'shield') {
      player.weapons.shield.type = power.type;
      player.weapons.shield.cooldown = 0;
      screenFlash({ strength: 0.12, duration: 200 });
    }
    hitTone();
    updateHud();
  }

  function updatePowerups(dt) {
    state.powerupTimer -= dt;
    if (state.powerupTimer <= 0) {
      spawnPowerup();
      state.powerupTimer = Math.max(4, 6.2 - state.stage * 0.25) + Math.random() * 1.2;
    }

    for (let i = powerups.length - 1; i >= 0; i -= 1) {
      const power = powerups[i];
      power.x += power.vx * dt;
      power.bobTimer += dt;
      power.y = power.baseY + Math.sin(power.bobTimer * 2.6) * power.bobAmplitude;
      const ceiling = clamp(getCeiling(power.x) + TILE * 2, TILE * 3, SCREEN_HEIGHT - TILE * 4);
      const floor = clamp(getFloor(power.x) - TILE * 2, TILE * 4, SCREEN_HEIGHT - TILE * 3);
      power.y = clamp(power.y, ceiling + 12, floor - 12);

      const screenX = power.x - state.cameraX;
      if (screenX < -30) {
        powerups.splice(i, 1);
        continue;
      }

      const dx = (state.cameraX + player.x) - power.x;
      const dy = player.y - power.y;
      const pickupRadius = player.invincible > 0 ? 22 : 18;
      if (dx * dx + dy * dy < pickupRadius * pickupRadius) {
        activatePowerup(power);
        const sparkColor = power.category === 'bomb'
          ? '#ffe3a8'
          : power.category === 'missile'
            ? '#b7f3ff'
            : power.category === 'shield'
              ? '#a2ffd2'
              : '#d0f0ff';
        spawnSpark(power.x, power.y, sparkColor);
        powerups.splice(i, 1);
      }
    }
  }

  function drawPowerups() {
    for (const power of powerups) {
      const screenX = power.x - state.cameraX;
      if (screenX < -20 || screenX > SCREEN_WIDTH + 40) continue;
      ctx.save();
      ctx.translate(screenX, power.y);
      const fillColor = power.category === 'bomb'
        ? COLORS.powerupBomb
        : power.category === 'missile'
          ? COLORS.powerupMissile
          : power.category === 'shield'
            ? COLORS.powerupShield
            : COLORS.powerupMain;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.playerOutline;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = COLORS.space;
      if (power.category === 'bomb') {
        ctx.fillRect(-2, -2, 4, 4);
      } else if (power.category === 'missile') {
        ctx.beginPath();
        ctx.moveTo(-2, -3);
        ctx.lineTo(3, 0);
        ctx.lineTo(-2, 3);
        ctx.closePath();
        ctx.fill();
      } else if (power.category === 'shield') {
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(3, 0);
        ctx.lineTo(0, 3);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-1, -3, 2, 6);
        ctx.fillRect(-3, -1, 6, 2);
      }
      ctx.restore();
      lights.push({
        x: screenX,
        y: power.y,
        radius: 60,
        innerRadius: 6,
        innerStop: 0.25,
        color: power.category === 'bomb'
          ? 'rgba(255, 190, 120, 0.38)'
          : power.category === 'missile'
            ? 'rgba(150, 240, 255, 0.38)'
            : power.category === 'shield'
              ? 'rgba(160, 255, 200, 0.38)'
              : 'rgba(170, 220, 255, 0.38)',
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
    removeEnemy(enemy);
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
        glow: { radius: radius * 0.65, color: 'rgba(255, 180, 120, 0.28)' },
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
    if (absorbDamageWithShield()) return;
    state.lives -= 1;
    player.invincible = 2.4;
    screenFlash({ strength: 0.22, duration: 260 });
    spawnExplosion(state.cameraX + player.x, player.y, { count: 18, radius: 110 });
    dockHelper(true);
    if (state.lives <= 0) {
      state.gameOver = true;
      startIris('out', 1100);
    }
    updateHud();
  }

  function absorbDamageWithShield() {
    const shield = player.weapons.shield;
    if (!shield || !shield.type) return false;
    if (shield.cooldown > 0) return false;
    const data = SHIELD_DATA[shield.type];
    if (!data) return false;
    shield.cooldown = data.cooldown ?? 4.5;
    player.invincible = Math.max(player.invincible, data.invincible ?? 1);
    triggerShieldEffect(shield.type);
    updateHud();
    return true;
  }

  function triggerShieldEffect(type) {
    const px = state.cameraX + player.x;
    const py = player.y;
    if (type === 'aegis') {
      screenFlash({ strength: 0.16, duration: 220 });
      spawnExplosion(px, py, { count: 10, radius: 90 });
      damageEnemiesInRadius(px, py, 90, 2);
    } else if (type === 'phase') {
      screenFlash({ strength: 0.12, duration: 180 });
      player.x = clamp(player.x + TILE * 1.5, TILE * 2, SCREEN_WIDTH * 0.7);
      player.y = clamp(player.y - TILE * 1.5, TILE * 2, SCREEN_HEIGHT - TILE * 2);
      spawnSpark(px, py, '#c0f7ff');
    } else if (type === 'pulse') {
      startShockwave(player.x, player.y, { innerRadius: 20, duration: 420 });
      damageEnemiesInRadius(px, py, 110, 1);
      for (let i = 0; i < 6; i += 1) {
        spawnSpark(px + (Math.random() - 0.5) * 20, py + (Math.random() - 0.5) * 20, '#a8ffda');
      }
    }
  }

  function damageEnemiesInRadius(x, y, radius, damage = 1) {
    const radiusSq = radius * radius;
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        damageEnemy(enemy, damage, x, y);
      }
    }
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
      if (
        screenX < -8 ||
        screenX > SCREEN_WIDTH + 8 ||
        bullet.y < -8 ||
        bullet.y > SCREEN_HEIGHT + 8
      ) {
        continue;
      }
      if (bullet.kind === 'bomb') {
        ctx.save();
        ctx.translate(screenX, bullet.y);
        ctx.fillStyle = COLORS.bombBullet;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.playerOutline;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        lights.push({
          x: screenX,
          y: bullet.y,
          radius: bullet.variant === 'firebomb' ? 80 : 60,
          innerRadius: 6,
          innerStop: 0.2,
          color: bullet.variant === 'firebomb'
            ? 'rgba(255, 170, 120, 0.45)'
            : 'rgba(255, 210, 150, 0.45)',
        });
      } else if (bullet.kind === 'plasma') {
        ctx.save();
        ctx.translate(screenX, bullet.y);
        const angle = Math.atan2(bullet.vy ?? 0, bullet.vx ?? 1);
        ctx.rotate(angle);
        ctx.fillStyle = bullet.color ?? COLORS.bulletPlasma;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        lights.push({
          x: screenX,
          y: bullet.y,
          radius: 46,
          innerRadius: 6,
          innerStop: 0.15,
          color: 'rgba(200, 190, 255, 0.45)',
        });
      } else if (bullet.kind === 'fireball') {
        ctx.save();
        ctx.translate(screenX, bullet.y);
        ctx.fillStyle = bullet.color ?? COLORS.bulletFireball;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        lights.push({
          x: screenX,
          y: bullet.y,
          radius: 54,
          innerRadius: 7,
          innerStop: 0.18,
          color: 'rgba(255, 180, 120, 0.4)',
        });
      } else if (bullet.kind === 'drone') {
        ctx.save();
        ctx.translate(screenX, bullet.y);
        const angle = Math.atan2(bullet.vy ?? 0, bullet.vx ?? 1);
        ctx.rotate(angle);
        ctx.fillStyle = bullet.color ?? COLORS.helperBullet;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        lights.push({
          x: screenX,
          y: bullet.y,
          radius: 40,
          innerRadius: 5,
          innerStop: 0.18,
          color: 'rgba(170, 240, 255, 0.45)',
        });
      } else if (bullet.kind === 'missile') {
        ctx.save();
        ctx.translate(screenX, bullet.y);
        const angle = Math.atan2(bullet.vy ?? 0, bullet.vx ?? 1);
        ctx.rotate(angle);
        ctx.fillStyle = COLORS.missileGround;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-3, -2.5);
        ctx.lineTo(-3, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        lights.push({
          x: screenX + Math.cos(angle) * 2,
          y: bullet.y + Math.sin(angle) * 2,
          radius: 46,
          innerRadius: 5,
          innerStop: 0.15,
          color: 'rgba(255, 230, 150, 0.45)',
        });
      } else if (bullet.kind === 'homing') {
        ctx.save();
        ctx.translate(screenX, bullet.y);
        const angle = Math.atan2(bullet.vy ?? 0, bullet.vx ?? 1);
        ctx.rotate(angle);
        ctx.fillStyle = COLORS.homingBullet;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-3, -2);
        ctx.lineTo(-3, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        lights.push({
          x: screenX + Math.cos(angle) * 2,
          y: bullet.y + Math.sin(angle) * 2,
          radius: 50,
          innerRadius: 5,
          innerStop: 0.15,
          color: 'rgba(160, 240, 255, 0.55)',
        });
      } else {
        ctx.save();
        ctx.translate(screenX, bullet.y);
        const angle = Math.atan2(bullet.vy ?? 0, bullet.vx);
        ctx.rotate(angle);
        ctx.fillStyle = bullet.color ?? COLORS.bullet;
        ctx.fillRect(-1, -1, 4, 2);
        ctx.restore();
        lights.push({
          x: screenX + Math.cos(angle) * 1,
          y: bullet.y + Math.sin(angle) * 1,
          radius: 30,
          innerRadius: 4,
          innerStop: 0.1,
          color: 'rgba(140, 230, 255, 0.45)',
        });
      }
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
      const sprite = enemy.sprite ?? null;
      ctx.save();
      ctx.translate(screenX, enemy.y);
      if (enemy.type === 'fighter' && sprite?.image) {
        drawSpaceshipSprite(ctx, sprite, { scale: sprite.scale });
      } else if (enemy.type === 'fighter') {
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
      } else {
        ctx.fillStyle = COLORS.turret;
        ctx.fillRect(-7, -enemy.height, 14, enemy.height);
        ctx.fillStyle = COLORS.enemyAccent;
        ctx.fillRect(-5, -enemy.height + 3, 10, 4);
      }
      ctx.restore();
      lights.push({
        x: screenX + (sprite?.tailOffsetScaled ?? 0) * 0.4,
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

  function drawHelper(now) {
    const screenX = helper.x - state.cameraX;
    if (screenX < -40 || screenX > SCREEN_WIDTH + 40) return;
    const bob = helper.mode === 'docked'
      ? Math.sin(now * 0.01) * 0.6
      : Math.sin((now + helper.x) * 0.004) * 1.2;

    ctx.save();
    ctx.translate(screenX, helper.y + bob);
    const heading = helper.mode === 'docked'
      ? player.tilt * 0.4
      : Math.atan2(helper.vy || 0, helper.vx || 1) * 0.3;
    ctx.rotate(heading);
    ctx.fillStyle = COLORS.helperBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.playerOutline;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.helperAccent;
    ctx.fillRect(1.5, -1.4, 3.8, 2.8);
    ctx.fillStyle = COLORS.playerEngine;
    ctx.beginPath();
    const flame = 1 + Math.sin(now * 0.03 + helper.x * 0.01) * 0.5;
    ctx.moveTo(-4.6, -1);
    ctx.lineTo(-6.6 - flame * 1.8, 0);
    ctx.lineTo(-4.6, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    lights.push({
      x: screenX,
      y: helper.y,
      radius: 58,
      innerRadius: 10,
      innerStop: 0.22,
      color: 'rgba(150, 235, 255, 0.42)',
    });
  }

  function drawPlayer(now) {
    const screenX = player.x;
    const shipY = player.y;
    const sprite = spriteAssets.player;
    if (sprite?.image) {
      ctx.save();
      ctx.translate(screenX, shipY);
      ctx.rotate(player.tilt * 0.6);

      const flamePulse = 0.6 + (Math.sin(now * 0.02) + 1) * 0.2;
      const tailX = sprite.tailOffsetScaled ?? -10;
      const flameLength = Math.max(6, sprite.renderWidth * 0.18) * flamePulse;
      const flameHalfHeight = Math.max(2.4, sprite.renderHeight * 0.18);
      ctx.fillStyle = COLORS.playerEngine;
      ctx.beginPath();
      ctx.moveTo(tailX, -flameHalfHeight);
      ctx.lineTo(tailX - flameLength, 0);
      ctx.lineTo(tailX, flameHalfHeight);
      ctx.closePath();
      ctx.fill();

      drawSpaceshipSprite(ctx, sprite, { scale: sprite.scale });
      ctx.restore();
    } else {
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
    }

    if (player.invincible > 0 && !state.gameOver) {
      const alpha = 0.35 + 0.35 * Math.sin(now * 0.018);
      ctx.strokeStyle = `rgba(120, 230, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, shipY, player.width * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    lights.push({
      x: screenX + (sprite?.tailOffsetScaled ?? -8),
      y: shipY,
      radius: 70,
      innerRadius: 10,
      innerStop: 0.15,
      color: 'rgba(255, 180, 110, 0.45)',
    });
    lights.push({
      x: screenX + (sprite?.noseOffsetScaled ?? player.width * 0.5),
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
    // When CRT post-processing is disabled, skip the extra light buffer so the
    // additive glow does not carry the CRT look on its own.
    const useLightBuffer = crtSettings.enabled !== false;
    const sources = [];

    if (useLightBuffer) {
      ensureLightBuffer();
      lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
      lightCtx.save();
      lightCtx.globalCompositeOperation = 'lighter';
    }

    for (const light of lights) {
      if (sources.length > 240) break;
      const radius = light.radius ?? 0;
      if (radius <= 0) continue;
      const innerRadius = Math.max(0, light.innerRadius ?? 0);
      const color = light.color ?? 'rgba(120, 200, 255, 0.45)';

      if (useLightBuffer) {
        const gradient = lightCtx.createRadialGradient(
          light.x,
          light.y,
          innerRadius,
          light.x,
          light.y,
          radius,
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        lightCtx.fillStyle = gradient;
        lightCtx.beginPath();
        lightCtx.arc(light.x, light.y, radius, 0, Math.PI * 2);
        lightCtx.fill();
      }

      sources.push({
        x: light.x,
        y: light.y,
        radius,
        innerRadius,
        innerStop: light.innerStop ?? 0.2,
        color,
      });
    }

    if (useLightBuffer) {
      lightCtx.restore();
    }

    applyAmbientLighting({
      ctx,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      ambient: settings.ambientLight,
      sources,
      sourceCanvas: useLightBuffer && sources.length ? lightCanvas : null,
      sourceCanvasIsLightBuffer: useLightBuffer && sources.length > 0,
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
    updateHelper(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateEnemies(dt, now);
    updatePowerups(dt);
    updateParticles(dt);
  }

  function render(now) {
    lights.length = 0;
    drawBackground(now);
    drawTerrain();
    drawParticles();
    drawEnemies();
    drawPowerups();
    drawBullets();
    drawEnemyBullets();
    drawHelper(now);
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

    fpsCounter.frame(now);

    requestAnimationFrame(frame);
  }

  const assets = await spriteAssetsPromise;
  spriteAssets.player = assets.player;
  spriteAssets.enemies = assets.enemies;

  if (spriteAssets.player?.renderWidth) {
    // Update collision footprint so the new sprite still matches gameplay expectations.
    player.width = Math.max(18, spriteAssets.player.renderWidth * 0.82);
    player.height = Math.max(12, spriteAssets.player.renderHeight * 0.68);
  }

  resetGame();
  requestAnimationFrame(frame);
})().catch((error) => {
  console.error('Nemesis failed to start', error);
});

