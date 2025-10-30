import { createBeeper } from '../../../shared/audio/beeper.js';
import { createDPad } from '../../../shared/input/dpad.js';
import { parseTextMap } from '../../../shared/map/textMap.js';
import { charMap } from '../map/charMap.js';
import { TILE_SIZE, COLS, ROWS } from '../map/constants.js';
import { createTileFactory } from '../../../shared/render/tile-forge/factory.js';
import { registerStandardTiles } from '../../../shared/render/tile-forge/standardTiles.js';

const TILE = TILE_SIZE;
const LEVELS = ['levels/level1.txt','levels/level2.txt','levels/level3.txt'];
const IRIS_DURATION = 900;

const Colors = {
  bg: 0x14171f,
  player: 0xfff5c4,
  playerShadow: 0xe2bf75,
  playerOutline: 0x3d2b1a,
  enemy: 0xf58a4d,
  enemyShadow: 0xbd4c22,
  enemyOutline: 0x301007,
};

const tileFactory = registerStandardTiles(createTileFactory({ size: 16 }));
const TILE_CANVAS_SCALE = Math.max(1, Math.round(TILE_SIZE / tileFactory.size));
const TILE_TEXTURE_MAP = {
  brick: 'loderunner/brick',
  solid: 'loderunner/solid',
  ladder: 'structure/ladder-wood',
  rope: 'loderunner/rope',
  gold: 'loderunner/gold',
  exit: 'loderunner/exit',
};

// Centralised guard movement tuning so we can easily keep the AI logic readable
// while dialing overall speed. Values chosen to slow enemies dramatically compared
// to the previous prototype pace.
const ENEMY_TUNING = {
  maxSpeedX: 120,
  dragX: 520,
  accelGround: 420,
  accelRope: 260,
  climbSpeed: 60,
  ropeSpeed: 70,
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
    this.beeper = createBeeper({ masterGain: 0.1 });
    if (typeof window !== 'undefined') {
      this.beeper.unlockWithGestures(window, ['pointerdown', 'keydown']);
    }
    this.controls = null;
    this.prevDirections = { up: false, down: false, left: false, right: false };
    this.pendingDigDirs = [];
    this.queuePauseToggle = false;
    this.queueRestart = false;
    this.pendingRestart = false;
  }

  preload() {
    // Preload all level layouts so create() can stay synchronous and Phaser
    // doesn't enter the update loop before the stage data is ready.
    LEVELS.forEach((path, index) => {
      this.load.text(`level-${index}`, path);
    });
  }

  create() {
    this.cameras.main.setBackgroundColor(Colors.bg);

    // Persisted state
    const savedIndex = this.registry.get('levelIndex');
    this.levelIndex = typeof savedIndex === 'number' ? savedIndex : 0;
    const savedLives = this.registry.get('lives');
    this.lives = typeof savedLives === 'number' ? savedLives : 3;
    this.exitSpawned = false;
    this.pendingRestart = false;

    const levelKey = `level-${this.levelIndex}`;
    let levelText = this.cache.text.get(levelKey);
    if (typeof levelText !== 'string') {
      this.levelIndex = 0;
      this.registry.set('levelIndex', 0);
      // Fallback to the first level if the cached entry is missing for any reason.
      levelText = this.cache.text.get('level-0') ?? '';
    }
    const levelSource = (typeof levelText === 'string' ? levelText : '').trim();
    const levelGrid = parseTextMap(levelSource, COLS, ROWS, {
      lineFilter: (line) => !line.startsWith('#'),
      padChar: '=',
      mapTile: (ch) => charMap(ch),
      outOfBounds: () => 'solid',
    });

    this.map = this.buildMap(levelGrid);

    // Static/dynamic groups
    this.solidLayer = this.physics.add.staticGroup();
    this.goldGroup = this.physics.add.staticGroup();
    this.ladderGroup = this.physics.add.staticGroup();
    this.ropeGroup = this.physics.add.staticGroup();
    this.exitGroup = this.physics.add.staticGroup();

    // Generate tiles and sprite frames
    this.makeTileTextures();
    this.makePlayerFramesAndAnimations();
    this.makeEnemyFramesAndAnimations();

    this.player = null;
    this.playerSpawn = { x: TILE * 1.5, y: TILE * 1.5 };
    this.enemies = this.physics.add.group();

    // Build world from map
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = this.map[r][c];
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;
        if (type === 'brick') {
          const b = this.solidLayer.create(x, y, 'brick');
          b.setData('type', 'brick');
        } else if (type === 'solid') {
          const s = this.solidLayer.create(x, y, 'solid');
          s.setData('type', 'solid');
        } else if (type === 'ladder') {
          const l = this.ladderGroup.create(x, y, 'ladder');
          l.setAlpha(0.9);
        } else if (type === 'rope') {
          const t = this.ropeGroup.create(x, y, 'rope');
          t.setAlpha(0.95);
        } else if (type === 'gold') {
          const g = this.goldGroup.create(x, y, 'gold');
          g.setData('collected', false);
        } else if (type === 'player') {
          this.playerSpawn = { x, y };
          this.player = this.physics.add.sprite(x, y, 'player_idle');
          this.player.setCollideWorldBounds(true);
          this.player.setMaxVelocity(200, 420);
          this.player.setDragX(600);
          // Narrower body for smoother ledges and ladder exits
          this.player.body.setSize(18, 26).setOffset(7, 6);
          this.player.play('player-idle');
        } else if (type === 'enemy') {
          const e = this.physics.add.sprite(x, y, 'enemy_idle');
          e.setCollideWorldBounds(true);
          e.setMaxVelocity(ENEMY_TUNING.maxSpeedX, 420);
          e.setDragX(ENEMY_TUNING.dragX);
          e.body.setSize(18, 26).setOffset(7, 6);
          e.play('enemy-idle');
          e.setData('aiState', 'chase');
          this.enemies.add(e);
        }
      }
    }

    // Collisions
    if (this.player) this.physics.add.collider(this.player, this.solidLayer);
    this.physics.add.collider(this.enemies, this.solidLayer);

    // Overlaps
    if (this.player) {
      this.physics.add.overlap(this.player, this.goldGroup, (pl, g) => {
        if (!g.getData('collected')) {
          g.setData('collected', true);
          g.disableBody(true, true);
          this.score += 1;
          this.updateHUD();
          this.beep(880, 0.05);
        }
      });
      this.physics.add.overlap(this.player, this.exitGroup, () => { this.nextLevel(); });
      this.physics.add.overlap(this.player, this.enemies, () => { this.onPlayerHit(); });
    }

    // Input via the shared helper (handles arrows/WASD plus pause/restart bindings).
    this.queuePauseToggle = false;
    this.queueRestart = false;
    this.pendingDigDirs = [];
    this.prevDirections = { up: false, down: false, left: false, right: false };

    const controls = createDPad({
      preventDefault: true,
      pauseKeys: ['p'],
      restartKeys: ['r'],
    });
    this.controls = controls;

    const disposers = [
      controls.onPause(() => { this.queuePauseToggle = true; }),
      controls.onRestart(() => { this.queueRestart = true; }),
      controls.onKeyChange(['z'], (pressed) => { if (pressed) this.pendingDigDirs.push(-1); }),
      controls.onKeyChange(['x'], (pressed) => { if (pressed) this.pendingDigDirs.push(1); }),
    ];
    let cleaned = false;
    const cleanupControls = () => {
      if (cleaned) return;
      cleaned = true;
      disposers.forEach((dispose) => { if (typeof dispose === 'function') dispose(); });
      controls.dispose();
      this.controls = null;
    };
    this.events.once('shutdown', cleanupControls);
    this.events.once('destroy', cleanupControls);

    // Gameplay state
    this.score = 0;
    this.totalGold = this.goldGroup.getChildren().length;
    this.holes = []; // {r,c,sprite,created}
    this.invulnUntil = 0;

    // Jump feel improvements
    // - Coyote time: allow jump shortly after leaving ground
    // - Jump buffering: respect a jump press shortly before landing
    // - Variable jump height: releasing Up early cuts upward velocity
    this.coyoteMs = 120;
    this.jumpBufferMs = 120;
    this.jumpCutMultiplier = 0.45; // 0..1 smaller = stronger cut
    this.lastGroundedAt = 0;
    this.jumpBufferUntil = 0;
    this.wasGrounded = true;
    this.digCooldownMs = 350;
    this.lastDigAt = 0;

    // HUD
    this.hudText = this.add.text(8, 6, '', { fontFamily: 'monospace', fontSize: 14, color: '#9fe7ff' })
      .setScrollFactor(0).setDepth(10);
    this.updateHUD();

    this.pauseText = this.add.text(COLS*TILE/2, ROWS*TILE/2, 'PAUSED', { fontFamily: 'monospace', fontSize: 24, color: '#9fe7ff' })
      .setOrigin(0.5).setDepth(20).setVisible(false).setAlpha(0.9);

    this.cameras.main.roundPixels = true;
    this.physics.world.setBounds(0, 0, COLS * TILE, ROWS * TILE);

    if (this.game?.events) {
      this.game.events.emit('iris-transition', { type: 'in', duration: IRIS_DURATION });
    }
  }

  update() {
    if (!this.player) return;

    if (this.pendingRestart) return;

    if (this.queueRestart) {
      this.queueRestart = false;
      this.scheduleRestart();
      return;
    }

    if (this.queuePauseToggle) {
      this.queuePauseToggle = false;
      const paused = this.physics.world.isPaused;
      this.physics.world.isPaused = !paused;
      this.pauseText.setVisible(!paused);
      return;
    }

    if (this.physics.world.isPaused) return;

    const controls = this.controls;
    const left = controls?.isPressed('left') ?? false;
    const right = controls?.isPressed('right') ?? false;
    const up = controls?.isPressed('up') ?? false;
    const down = controls?.isPressed('down') ?? false;

    const nowTime = this.time.now;
    const upJustPressed = up && !this.prevDirections.up;
    const upJustReleased = !up && this.prevDirections.up;

    if (upJustPressed) {
      this.jumpBufferUntil = nowTime + this.jumpBufferMs;
    }

    if (this.pendingDigDirs.length > 0) {
      const digRequests = this.pendingDigDirs.splice(0, this.pendingDigDirs.length);
      for (const dir of digRequests) {
        if (nowTime - this.lastDigAt >= this.digCooldownMs) {
          this.tryDig(dir);
        }
      }
    }

    const grounded = this.player.body.blocked.down === true;
    if (grounded) this.lastGroundedAt = nowTime;

    const touchingLadder = this.isOnLadder(this.player);
    const onRope = this.isTouchingRope(this.player);

    // Only treat the ladder as "active" when the player is climbing or has
    // moved off the ground. This lets you run straight past a ladder without
    // getting snapped onto it, while still allowing climbs to begin from the
    // floor.
    const onLadder = touchingLadder && (!grounded || up || down);
    const justLanded = !this.wasGrounded && grounded && !onLadder && !onRope;
    if (justLanded && Math.abs(this.player.body.velocity.y) > 60) {
      this.beep(320, 0.05, 'square', 0.05);
      this.cameras.main.shake(40, 0.003);
    }

    const baseAccel = 900;
    let accel = baseAccel;
    const inAir = !grounded && !onLadder && !onRope;
    if (inAir) accel = 600;

    if (!onRope) {
      if (left && !right) {
        this.player.setAccelerationX(-accel);
      } else if (right && !left) {
        this.player.setAccelerationX(accel);
      } else {
        this.player.setAccelerationX(0);
        if (Math.abs(this.player.body.velocity.x) < 8) {
          this.player.setVelocityX(0);
        }
      }
    } else {
      this.player.setAccelerationX(0);
    }

    // Vertical movement logic with ladder top step-up

    if (onLadder) {
      // If pushing up at ladder top with solid/brick above, step up onto platform
      if (up && this.tryStepUpFromLadder(this.player)) {
        // stepped up, normal gravity resumes below
      } else {
        // Snap X to ladder center when we're actually climbing the rungs. We
        // still give a bit of wiggle room so horizontal inputs continue to work.
        const targetX = Math.round((this.player.x - TILE / 2) / TILE) * TILE + TILE / 2;
        if (!left && !right && Math.abs(this.player.x - targetX) < 8) {
          this.player.x = targetX;
        } else if (Math.abs(this.player.x - targetX) < 2) {
          this.player.x = targetX;
        }
        this.player.setGravityY(0);
        let ladderSpeed = 0;
        if (up && !down) ladderSpeed = -120;
        else if (down && !up) ladderSpeed = 120;
        this.player.setVelocityY(ladderSpeed);
      }
    } else if (onRope) {
      // Hang on rope; zero gravity so you don't slowly slide off. Up/down let
      // you shimmy to nearby ladders and horizontal taps swing hand-over-hand.
      const col = Math.floor(this.player.x / TILE);
      const row = Math.floor(this.player.y / TILE);
      const ropeY = row * TILE + TILE / 2;
      this.player.setGravityY(0);
      if (Math.abs(this.player.y - ropeY) < 4) {
        this.player.y = ropeY;
      }

      const ropeHorizontalSpeed = 140;
      const below = this.tileAt(row + 1, col);
      if (left && !right) {
        this.player.setVelocityX(-ropeHorizontalSpeed);
      } else if (right && !left) {
        this.player.setVelocityX(ropeHorizontalSpeed);
      } else {
        this.player.setVelocityX(0);
      }

      let ropeVerticalSpeed = 0;
      if (up && !down) {
        ropeVerticalSpeed = -120;
      } else if (down && !up) {
        if (below === 'ladder' || below === 'rope') {
          ropeVerticalSpeed = 120;
        } else if (below !== 'brick' && below !== 'solid') {
          // Drop from the rope when there is no support beneath.
          this.player.setGravityY(this.physics.world.gravity.y);
          this.player.setVelocityY(80);
          this.player.setVelocityX(this.player.body.velocity.x * 0.9);
        }
      }
      if (ropeVerticalSpeed !== 0) {
        this.player.setVelocityY(ropeVerticalSpeed);
      } else if (!(down && !up && below !== 'ladder' && below !== 'rope')) {
        this.player.setVelocityY(0);
      }
    } else {
      this.player.setGravityY(this.physics.world.gravity.y);
      const withinCoyote = (nowTime - this.lastGroundedAt) <= this.coyoteMs;
      if ((grounded || withinCoyote) && nowTime <= this.jumpBufferUntil) {
        this.player.setVelocityY(-320);
        this.beep(560, 0.05, 'triangle', 0.05);
        this.jumpBufferUntil = 0;
      }
      if (upJustReleased && this.player.body.velocity.y < 0) {
        this.player.setVelocityY(this.player.body.velocity.y * this.jumpCutMultiplier);
      }
    }

    // Ground/air drag split for better feel
    this.player.setDragX(grounded ? 900 : 420);

    // Enemy pathfinding + animation
    this.enemies.getChildren().forEach(e => {
      const ec = Math.floor(e.x / TILE);
      const er = Math.floor(e.y / TILE);
      const prevStuck = e.getData('stuckUntil') || 0;
      if (this.map[er] && this.map[er][ec] === 'hole') {
        if (prevStuck < nowTime) {
          e.setData('stuckUntil', nowTime + 2200);
          this.beep(180, 0.05, 'sawtooth', 0.04);
        }
      }
      if ((e.getData('stuckUntil') || 0) > nowTime) {
        e.setVelocity(0, 0);
        e.setAcceleration(0, 0);
        this.updateEnemyAnimation(e, false, false);
        return;
      }

      this.updateEnemyAI(e, nowTime);
    });

    // Holes lifecycle
    const now = this.time.now;
    this.holes = this.holes.filter(h => {
      if (now - h.created > 5000) {
        const r = h.r, c = h.c;
        if (this.map[r][c] === 'hole') {
          this.map[r][c] = 'brick';
          const x = c * TILE + TILE/2, y = r * TILE + TILE/2;
          const b = this.solidLayer.create(x, y, 'brick');
          b.setData('type', 'brick');
        }
        h.sprite.destroy();
        return false;
      }
      return true;
    });

    // Exit spawn when all gold collected
    if (!this.exitSpawned && this.score === this.totalGold) { this.spawnExit(); }

    // Animation state
    this.wasGrounded = grounded;
    this.updatePlayerAnimation(onLadder, onRope);
    this.prevDirections.up = up;
    this.prevDirections.down = down;
    this.prevDirections.left = left;
    this.prevDirections.right = right;
  }

  buildMap(grid) {
    const rows = Array.from({ length: ROWS }, () => new Array(COLS));
    grid.forEachTile((value, c, r) => {
      rows[r][c] = value;
    });
    return rows;
  }

  makeTileTextures() {
    // Render the shared Tile Forge art to Phaser canvas textures so the rest of
    // the scene can keep referencing the familiar sprite keys.
    Object.entries(TILE_TEXTURE_MAP).forEach(([textureKey, tileId]) => {
      const canvas = tileFactory.render(tileId, { scale: TILE_CANVAS_SCALE });
      if (this.textures.exists(textureKey)) {
        this.textures.remove(textureKey);
      }
      this.textures.addCanvas(textureKey, canvas);
    });
  }

  makePlayerFramesAndAnimations() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const palette = { fill: Colors.player, shadow: Colors.playerShadow, outline: Colors.playerOutline };
    const defaultTorso = { x: 13, y: 10, w: 6, h: 11 };
    const defaultHead = { x: 12, y: 4, w: 8, h: 6 };

    const drawPose = (key, config = {}) => {
      const torso = { ...defaultTorso, ...(config.torso ?? {}) };
      const head = { ...defaultHead, ...(config.head ?? {}) };
      const limbs = (config.limbs ?? []).map((limb) => ({ shade: true, ...limb }));
      const extraOutlines = config.outlines ?? [];
      const additions = config.additions ?? [];

      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, TILE, TILE);

      const outlineRect = (rect, pad = 1) => {
        g.fillStyle(palette.outline, 0.95);
        g.fillRect(rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad * 2);
      };

      outlineRect(torso);
      outlineRect(head);
      limbs.forEach((rect) => outlineRect(rect));
      extraOutlines.forEach((rect) => outlineRect(rect.rect ?? rect, rect.pad ?? 1));

      g.fillStyle(palette.fill, 1);
      g.fillRect(torso.x, torso.y, torso.w, torso.h);
      g.fillStyle(palette.shadow, 1);
      g.fillRect(torso.x, torso.y + torso.h - 3, torso.w, 3);

      g.fillStyle(palette.fill, 1);
      g.fillRect(head.x, head.y, head.w, head.h);
      g.fillStyle(palette.shadow, 1);
      g.fillRect(head.x, head.y + head.h - 2, head.w, 2);

      limbs.forEach((limb) => {
        g.fillStyle(palette.fill, 1);
        g.fillRect(limb.x, limb.y, limb.w, limb.h);
        if (limb.shade) {
          const shadeHeight = Math.min(2, limb.h);
          g.fillStyle(palette.shadow, 1);
          g.fillRect(limb.x, limb.y + limb.h - shadeHeight, limb.w, shadeHeight);
        }
      });

      additions.forEach((fn) => fn(g, palette));
      g.generateTexture(key, TILE, TILE);
    };

    // Idle pose keeps arms at the sides ready to sprint
    drawPose('player_idle', {
      limbs: [
        { x: 12, y: 22, w: 3, h: 8 },
        { x: 17, y: 22, w: 3, h: 8 },
        { x: 10, y: 13, w: 3, h: 7, shade: false },
        { x: 21, y: 13, w: 3, h: 7, shade: false },
      ],
    });

    const runFrames = [
      {
        key: 'player_run_0',
        torso: { x: 12 },
        head: { x: 11 },
        limbs: [
          { x: 8, y: 22, w: 4, h: 7 },
          { x: 18, y: 19, w: 4, h: 11 },
          { x: 6, y: 14, w: 4, h: 6, shade: false },
          { x: 22, y: 12, w: 3, h: 7, shade: false },
        ],
      },
      {
        key: 'player_run_1',
        limbs: [
          { x: 10, y: 21, w: 3, h: 9 },
          { x: 18, y: 21, w: 3, h: 9 },
          { x: 7, y: 12, w: 3, h: 7, shade: false },
          { x: 21, y: 14, w: 3, h: 6, shade: false },
        ],
      },
      {
        key: 'player_run_2',
        torso: { x: 14 },
        head: { x: 13 },
        limbs: [
          { x: 12, y: 19, w: 4, h: 11 },
          { x: 20, y: 22, w: 4, h: 7 },
          { x: 9, y: 11, w: 3, h: 7, shade: false },
          { x: 23, y: 13, w: 3, h: 7, shade: false },
        ],
      },
      {
        key: 'player_run_3',
        limbs: [
          { x: 11, y: 21, w: 3, h: 9 },
          { x: 19, y: 20, w: 3, h: 10 },
          { x: 8, y: 13, w: 3, h: 6, shade: false },
          { x: 22, y: 12, w: 3, h: 7, shade: false },
        ],
      },
    ];
    runFrames.forEach((frame) => drawPose(frame.key, frame));

    const climbFrames = [
      {
        key: 'player_climb_0',
        limbs: [
          { x: 12, y: 20, w: 3, h: 10 },
          { x: 17, y: 17, w: 3, h: 13 },
          { x: 10, y: 9, w: 3, h: 9, shade: false },
          { x: 21, y: 13, w: 3, h: 9, shade: false },
        ],
      },
      {
        key: 'player_climb_1',
        limbs: [
          { x: 12, y: 17, w: 3, h: 13 },
          { x: 17, y: 22, w: 3, h: 8 },
          { x: 10, y: 12, w: 3, h: 8, shade: false },
          { x: 21, y: 8, w: 3, h: 10, shade: false },
        ],
      },
      {
        key: 'player_climb_2',
        limbs: [
          { x: 12, y: 22, w: 3, h: 8 },
          { x: 17, y: 18, w: 3, h: 12 },
          { x: 10, y: 13, w: 3, h: 8, shade: false },
          { x: 21, y: 9, w: 3, h: 9, shade: false },
        ],
      },
      {
        key: 'player_climb_3',
        limbs: [
          { x: 12, y: 18, w: 3, h: 12 },
          { x: 17, y: 21, w: 3, h: 9 },
          { x: 10, y: 8, w: 3, h: 10, shade: false },
          { x: 21, y: 12, w: 3, h: 8, shade: false },
        ],
      },
    ];
    climbFrames.forEach((frame) => drawPose(frame.key, frame));

    const hangFrames = [
      {
        key: 'player_hang_0',
        torso: { y: 9 },
        head: { y: 3 },
        limbs: [
          { x: 10, y: 19, w: 4, h: 9 },
          { x: 18, y: 19, w: 4, h: 9 },
          { x: 6, y: 9, w: 7, h: 3, shade: false },
          { x: 19, y: 9, w: 7, h: 3, shade: false },
        ],
      },
      {
        key: 'player_hang_1',
        torso: { y: 9 },
        head: { y: 3 },
        limbs: [
          { x: 11, y: 21, w: 4, h: 7 },
          { x: 18, y: 19, w: 4, h: 9 },
          { x: 6, y: 10, w: 7, h: 3, shade: false },
          { x: 19, y: 8, w: 7, h: 3, shade: false },
        ],
      },
      {
        key: 'player_hang_2',
        torso: { y: 9 },
        head: { y: 3 },
        limbs: [
          { x: 10, y: 20, w: 4, h: 8 },
          { x: 18, y: 21, w: 4, h: 7 },
          { x: 6, y: 8, w: 7, h: 3, shade: false },
          { x: 19, y: 10, w: 7, h: 3, shade: false },
        ],
      },
      {
        key: 'player_hang_3',
        torso: { y: 9 },
        head: { y: 3 },
        limbs: [
          { x: 11, y: 19, w: 4, h: 9 },
          { x: 18, y: 19, w: 4, h: 9 },
          { x: 6, y: 9, w: 7, h: 3, shade: false },
          { x: 19, y: 9, w: 7, h: 3, shade: false },
        ],
      },
    ];
    hangFrames.forEach((frame) => drawPose(frame.key, frame));

    const anims = this.anims;
    if (!anims.exists('player-idle')) {
      anims.create({ key: 'player-idle', frames: [{ key: 'player_idle' }], frameRate: 4, repeat: -1 });
      anims.create({ key: 'player-run', frames: runFrames.map((f) => ({ key: f.key })), frameRate: 8, repeat: -1 });
      anims.create({ key: 'player-climb', frames: climbFrames.map((f) => ({ key: f.key })), frameRate: 6, repeat: -1 });
      anims.create({ key: 'player-hang', frames: hangFrames.map((f) => ({ key: f.key })), frameRate: 6, repeat: -1 });
    }
  }

  makeEnemyFramesAndAnimations() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const palette = { fill: Colors.enemy, shadow: Colors.enemyShadow, outline: Colors.enemyOutline };
    const defaultTorso = { x: 13, y: 10, w: 6, h: 11 };
    const defaultHead = { x: 12, y: 4, w: 8, h: 6 };

    const drawPose = (key, config = {}) => {
      const torso = { ...defaultTorso, ...(config.torso ?? {}) };
      const head = { ...defaultHead, ...(config.head ?? {}) };
      const limbs = (config.limbs ?? []).map((limb) => ({ shade: true, ...limb }));
      const extraOutlines = config.outlines ?? [];

      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, TILE, TILE);

      const outlineRect = (rect, pad = 1) => {
        g.fillStyle(palette.outline, 0.9);
        g.fillRect(rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad * 2);
      };

      outlineRect(torso);
      outlineRect(head);
      limbs.forEach((rect) => outlineRect(rect));
      extraOutlines.forEach((rect) => outlineRect(rect.rect ?? rect, rect.pad ?? 1));

      g.fillStyle(palette.fill, 1);
      g.fillRect(torso.x, torso.y, torso.w, torso.h);
      g.fillStyle(palette.shadow, 1);
      g.fillRect(torso.x, torso.y + torso.h - 3, torso.w, 3);

      g.fillStyle(palette.fill, 1);
      g.fillRect(head.x, head.y, head.w, head.h);
      g.fillStyle(palette.shadow, 1);
      g.fillRect(head.x, head.y + head.h - 2, head.w, 2);

      limbs.forEach((limb) => {
        g.fillStyle(palette.fill, 1);
        g.fillRect(limb.x, limb.y, limb.w, limb.h);
        if (limb.shade) {
          const shadeHeight = Math.min(2, limb.h);
          g.fillStyle(palette.shadow, 1);
          g.fillRect(limb.x, limb.y + limb.h - shadeHeight, limb.w, shadeHeight);
        }
      });

      g.generateTexture(key, TILE, TILE);
    };

    drawPose('enemy_idle', {
      limbs: [
        { x: 12, y: 22, w: 3, h: 8 },
        { x: 17, y: 22, w: 3, h: 8 },
        { x: 10, y: 13, w: 3, h: 7, shade: false },
        { x: 21, y: 13, w: 3, h: 7, shade: false },
      ],
    });

    const runFrames = [
      {
        key: 'enemy_run_0',
        torso: { x: 12 },
        head: { x: 11 },
        limbs: [
          { x: 8, y: 22, w: 4, h: 7 },
          { x: 18, y: 19, w: 4, h: 11 },
          { x: 6, y: 14, w: 4, h: 6, shade: false },
          { x: 22, y: 12, w: 3, h: 7, shade: false },
        ],
      },
      {
        key: 'enemy_run_1',
        limbs: [
          { x: 10, y: 21, w: 3, h: 9 },
          { x: 18, y: 21, w: 3, h: 9 },
          { x: 7, y: 12, w: 3, h: 7, shade: false },
          { x: 21, y: 14, w: 3, h: 6, shade: false },
        ],
      },
      {
        key: 'enemy_run_2',
        torso: { x: 14 },
        head: { x: 13 },
        limbs: [
          { x: 12, y: 19, w: 4, h: 11 },
          { x: 20, y: 22, w: 4, h: 7 },
          { x: 9, y: 11, w: 3, h: 7, shade: false },
          { x: 23, y: 13, w: 3, h: 7, shade: false },
        ],
      },
      {
        key: 'enemy_run_3',
        limbs: [
          { x: 11, y: 21, w: 3, h: 9 },
          { x: 19, y: 20, w: 3, h: 10 },
          { x: 8, y: 13, w: 3, h: 6, shade: false },
          { x: 22, y: 12, w: 3, h: 7, shade: false },
        ],
      },
    ];
    runFrames.forEach((frame) => drawPose(frame.key, frame));

    const climbFrames = [
      {
        key: 'enemy_climb_0',
        limbs: [
          { x: 12, y: 20, w: 3, h: 10 },
          { x: 17, y: 17, w: 3, h: 13 },
          { x: 10, y: 9, w: 3, h: 9, shade: false },
          { x: 21, y: 13, w: 3, h: 9, shade: false },
        ],
      },
      {
        key: 'enemy_climb_1',
        limbs: [
          { x: 12, y: 17, w: 3, h: 13 },
          { x: 17, y: 22, w: 3, h: 8 },
          { x: 10, y: 12, w: 3, h: 8, shade: false },
          { x: 21, y: 8, w: 3, h: 10, shade: false },
        ],
      },
      {
        key: 'enemy_climb_2',
        limbs: [
          { x: 12, y: 22, w: 3, h: 8 },
          { x: 17, y: 18, w: 3, h: 12 },
          { x: 10, y: 13, w: 3, h: 8, shade: false },
          { x: 21, y: 9, w: 3, h: 9, shade: false },
        ],
      },
      {
        key: 'enemy_climb_3',
        limbs: [
          { x: 12, y: 18, w: 3, h: 12 },
          { x: 17, y: 21, w: 3, h: 9 },
          { x: 10, y: 8, w: 3, h: 10, shade: false },
          { x: 21, y: 12, w: 3, h: 8, shade: false },
        ],
      },
    ];
    climbFrames.forEach((frame) => drawPose(frame.key, frame));

    const hangFrames = [
      {
        key: 'enemy_hang_0',
        torso: { y: 9 },
        head: { y: 3 },
        limbs: [
          { x: 10, y: 19, w: 4, h: 9 },
          { x: 18, y: 19, w: 4, h: 9 },
          { x: 6, y: 9, w: 7, h: 3, shade: false },
          { x: 19, y: 9, w: 7, h: 3, shade: false },
        ],
      },
      {
        key: 'enemy_hang_1',
        torso: { y: 9 },
        head: { y: 3 },
        limbs: [
          { x: 11, y: 21, w: 4, h: 7 },
          { x: 18, y: 19, w: 4, h: 9 },
          { x: 6, y: 10, w: 7, h: 3, shade: false },
          { x: 19, y: 8, w: 7, h: 3, shade: false },
        ],
      },
      {
        key: 'enemy_hang_2',
        torso: { y: 9 },
        head: { y: 3 },
        limbs: [
          { x: 10, y: 20, w: 4, h: 8 },
          { x: 18, y: 21, w: 4, h: 7 },
          { x: 6, y: 8, w: 7, h: 3, shade: false },
          { x: 19, y: 10, w: 7, h: 3, shade: false },
        ],
      },
      {
        key: 'enemy_hang_3',
        torso: { y: 9 },
        head: { y: 3 },
        limbs: [
          { x: 11, y: 19, w: 4, h: 9 },
          { x: 18, y: 19, w: 4, h: 9 },
          { x: 6, y: 9, w: 7, h: 3, shade: false },
          { x: 19, y: 9, w: 7, h: 3, shade: false },
        ],
      },
    ];
    hangFrames.forEach((frame) => drawPose(frame.key, frame));

    const anims = this.anims;
    if (!anims.exists('enemy-idle')) {
      anims.create({ key: 'enemy-idle', frames: [{ key: 'enemy_idle' }], frameRate: 4, repeat: -1 });
      anims.create({ key: 'enemy-run', frames: runFrames.map((f) => ({ key: f.key })), frameRate: 7, repeat: -1 });
      anims.create({ key: 'enemy-climb', frames: climbFrames.map((f) => ({ key: f.key })), frameRate: 5, repeat: -1 });
      anims.create({ key: 'enemy-hang', frames: hangFrames.map((f) => ({ key: f.key })), frameRate: 5, repeat: -1 });
    }
  }

  updatePlayerAnimation(onLadder, onRope) {
    const vx = this.player.body.velocity.x;
    const grounded = this.player.body.blocked.down;

    // Flip by direction
    if (Math.abs(vx) > 5) this.player.setFlipX(vx < 0);

    if (onLadder) {
      this.player.anims.play('player-climb', true);
    } else if (onRope) {
      this.player.anims.play('player-hang', true);
    } else if (grounded && Math.abs(vx) > 18) {
      this.player.anims.play('player-run', true);
    } else {
      this.player.anims.play('player-idle', true);
    }
  }

  updateEnemyAnimation(enemy, onLadder, onRope) {
    const vx = enemy.body.velocity.x;
    const grounded = enemy.body.blocked.down;
    if (Math.abs(vx) > 5) enemy.setFlipX(vx < 0);
    if (onLadder) {
      enemy.anims.play('enemy-climb', true);
    } else if (onRope) {
      enemy.anims.play('enemy-hang', true);
    } else if (grounded && Math.abs(vx) > 18) {
      enemy.anims.play('enemy-run', true);
    } else {
      enemy.anims.play('enemy-idle', true);
    }
  }

  isOnLadder(sprite) {
    // Guard against the group not being ready during async scene start
    const ladders = this.ladderGroup?.getChildren?.() ?? [];
    for (const ladder of ladders) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(sprite.getBounds(), ladder.getBounds())) {
        return true;
      }
    }
    return false;
  }

  isTouchingRope(sprite) {
    // The rope group may not exist yet if the level is still loading
    const ropes = this.ropeGroup?.getChildren?.() ?? [];
    for (const rope of ropes) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(sprite.getBounds(), rope.getBounds())) {
        return true;
      }
    }
    return false;
  }

  updateEnemyAI(enemy, nowTime) {
    // Guards chase by planning toward the player's current tile with a
    // lightweight breadth-first search on the level grid.
    const onLadder = this.isOnLadder(enemy);
    const onRope = this.isTouchingRope(enemy);

    const currentTile = this.worldToTile(enemy.x, enemy.y);
    const targetTile = this.worldToTile(this.player.x, this.player.y);

    const storedPath = enemy.getData('path') || [];
    const needPlan =
      storedPath.length === 0 ||
      nowTime >= (enemy.getData('nextPathRefresh') || 0) ||
      storedPath[0].r !== currentTile.r ||
      storedPath[0].c !== currentTile.c;

    let path = storedPath;
    if (needPlan) {
      path = this.findEnemyPath(currentTile, targetTile);
      enemy.setData('path', path);
      enemy.setData('nextPathRefresh', nowTime + 200);
    }

    let desiredTile = path.length > 1 ? path[1] : path[0];
    if (!desiredTile) desiredTile = targetTile;

    const targetX = desiredTile.c * TILE + TILE / 2;
    const targetY = desiredTile.r * TILE + TILE / 2;
    const accel = onRope ? ENEMY_TUNING.accelRope : ENEMY_TUNING.accelGround;
    const dx = targetX - enemy.x;

    if (onLadder) {
      const targetColCenter = Math.round((enemy.x - TILE / 2) / TILE) * TILE + TILE / 2;
      if (Math.abs(enemy.x - targetColCenter) < 2) {
        enemy.x = targetColCenter;
      }
      enemy.setGravityY(0);
      const dy = targetY - enemy.y;
      const climbDir = Math.abs(dy) > 6 ? Math.sign(dy) : 0;
      enemy.setVelocityY(climbDir * ENEMY_TUNING.climbSpeed);
      enemy.setAccelerationX(0);
      if (Math.abs(dx) > 6 && climbDir === 0) {
        enemy.setAccelerationX(Math.sign(dx) * accel);
      }
    } else if (onRope) {
      enemy.setGravityY(0);
      const ropeY = Math.floor(enemy.y / TILE) * TILE + TILE / 2;
      if (Math.abs(enemy.y - ropeY) < 4) {
        enemy.y = ropeY;
      }
      enemy.setVelocityY(0);
      enemy.setAccelerationX(0);
      const ropeSpeed = ENEMY_TUNING.ropeSpeed;
      if (Math.abs(dx) > 6) {
        enemy.setVelocityX(Math.sign(dx) * ropeSpeed);
      } else {
        enemy.setVelocityX(0);
      }
    } else {
      enemy.setGravityY(this.physics.world.gravity.y);
      if (Math.abs(dx) > 8) {
        enemy.setAccelerationX(Math.sign(dx) * accel);
      } else {
        enemy.setAccelerationX(0);
        if (Math.abs(enemy.body.velocity.x) < 20) enemy.setVelocityX(0);
      }
    }

    this.updateEnemyAnimation(enemy, onLadder, onRope);
  }

  worldToTile(x, y) {
    const c = Phaser.Math.Clamp(Math.floor(x / TILE), 0, COLS - 1);
    const r = Phaser.Math.Clamp(Math.floor(y / TILE), 0, ROWS - 1);
    return { r, c };
  }

  findEnemyPath(start, goal) {
    const queue = [start];
    const key = (t) => `${t.r},${t.c}`;
    const visited = new Map();
    visited.set(key(start), null);

    while (queue.length > 0) {
      const node = queue.shift();
      if (node.r === goal.r && node.c === goal.c) {
        return this.reconstructEnemyPath(node, visited);
      }
      const neighbors = this.getEnemyNeighbors(node);
      for (const n of neighbors) {
        const k = key(n);
        if (!visited.has(k)) {
          visited.set(k, node);
          queue.push(n);
        }
      }
    }

    return [start];
  }

  reconstructEnemyPath(end, visited) {
    const key = (t) => `${t.r},${t.c}`;
    const path = [end];
    let parent = visited.get(key(end));
    while (parent) {
      path.unshift(parent);
      parent = visited.get(key(parent));
    }
    return path;
  }

  getEnemyNeighbors(tile) {
    const { r, c } = tile;
    const neighbors = [];
    const here = this.tileAt(r, c);
    const support = this.tileHasSupport(r, c);

    // Up: only possible if we're actively on a ladder.
    if (here === 'ladder' && this.isTileWalkable(this.tileAt(r - 1, c))) {
      neighbors.push({ r: r - 1, c });
    }

    // Down: either on a ladder or falling due to lack of support.
    if (here === 'ladder' || !support) {
      const downTile = this.tileAt(r + 1, c);
      if (this.isTileWalkable(downTile)) {
        neighbors.push({ r: r + 1, c });
      }
    }

    // Horizontal: only when standing on something (or a ladder/rope).
    const canStepHoriz = support || here === 'ladder' || here === 'rope';
    if (canStepHoriz && this.isTileWalkable(this.tileAt(r, c - 1))) {
      neighbors.push({ r, c: c - 1 });
    }
    if (canStepHoriz && this.isTileWalkable(this.tileAt(r, c + 1))) {
      neighbors.push({ r, c: c + 1 });
    }

    return neighbors;
  }

  tileAt(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 'solid';
    return this.map[r][c];
  }

  isTileWalkable(tile) {
    if (!tile) return false;
    return tile !== 'solid' && tile !== 'brick';
  }

  tileHasSupport(r, c) {
    const tile = this.tileAt(r, c);
    if (tile === 'ladder') return true;
    const below = this.tileAt(r + 1, c);
    return below === 'solid' || below === 'brick' || below === 'ladder';
  }

  tryStepUpFromLadder(sprite) {
    // Place the player on top of the solid tile above the ladder when pressing Up at the top
    const c = Math.floor(sprite.x / TILE);
    const r = Math.floor(sprite.y / TILE);
    if (r <= 0 || r >= ROWS) return false;
    const above = this.map[r-1][c];
    if (above === 'brick' || above === 'solid') {
      // Snap the player so their feet land on top of the above tile
      const topY = (r-1) * TILE; // top surface of the above tile
      const bodyH = sprite.body.height;
      sprite.setGravityY(this.physics.world.gravity.y);
      sprite.setVelocityY(0);
      sprite.y = topY - bodyH/2 - 0.1;
      return true;
    }
    return false;
  }

  tryDig(dir) {
    const px = this.player.x; const py = this.player.y;
    const c = Math.floor(px / TILE) + dir; const r = Math.floor(py / TILE) + 1;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (this.map[r][c] === 'brick' && this.map[r-1][c] !== 'brick' && this.map[r-1][c] !== 'solid') {
      this.map[r][c] = 'hole';
      const x = c * TILE + TILE/2, y = r * TILE + TILE/2;
      this.solidLayer.children.iterate(child => { if (!child) return; if (Math.abs(child.x - x) < 1 && Math.abs(child.y - y) < 1 && child.getData('type') === 'brick') child.destroy(); });
      const hole = this.add.rectangle(x, y, TILE, TILE, 0x000000, 0.01).setStrokeStyle(2, 0x222222, 0.7);
      this.holes.push({ r, c, sprite: hole, created: this.time.now });
      this.lastDigAt = this.time.now;
      this.beep(220, 0.04);
    }
  }

  spawnExit() {
    // Find a top row empty-ish spot
    const r = 1; let c = Math.floor(COLS / 2);
    let found = false;
    for (let radius = 0; radius < COLS/2; radius++) {
      for (const dc of [-radius, radius]) {
        const cc = c + dc; if (cc < 0 || cc >= COLS) continue;
        if ((this.map[r][cc] === 'empty' || this.map[r][cc] === 'gold') && this.map[r+1][cc] !== 'empty') { c = cc; found = true; break; }
      }
      if (found) break;
    }
    this.exitSpawned = true;
    const x = c * TILE + TILE/2, y = r * TILE + TILE/2;
    const ex = this.exitGroup.create(x, y, 'exit');
    ex.setAlpha(0.95);
    this.hudText.setText('Exit opened! Reach the green tile.');
  }

  scheduleRestart(delay = IRIS_DURATION) {
    if (this.pendingRestart) return;
    this.pendingRestart = true;
    this.queueRestart = false;
    if (this.game?.events) {
      this.game.events.emit('iris-transition', { type: 'out', duration: delay });
    }
    this.physics.world.isPaused = true;
    this.time.delayedCall(delay, () => {
      this.physics.world.isPaused = false;
      this.scene.restart();
    });
  }

  onPlayerHit() {
    const now = this.time.now;
    if (now < this.invulnUntil) return;
    this.invulnUntil = now + 800;
    this.lives -= 1;
    this.registry.set('lives', this.lives);
    this.beep(150, 0.12, 'square', 0.08);

    if (this.lives <= 0) {
      this.registry.set('lives', 3);
      this.registry.set('levelIndex', 0);
    }

    this.updateHUD();

    this.scheduleRestart(IRIS_DURATION);
  }

  nextLevel() {
    const next = (this.levelIndex + 1) % LEVELS.length;
    this.registry.set('levelIndex', next);
    this.scene.restart();
  }

  updateHUD() {
    const lvl = (this.levelIndex % LEVELS.length) + 1;
    this.hudText.setText(`LVL ${lvl}  GOLD: ${this.score}/${this.totalGold}  LIVES: ${this.lives}`);
  }

  beep(freq = 440, dur = 0.05, type = 'square', vol = 0.06) {
    if (!this.beeper) return;
    this.beeper.playTone({ freq, dur, type, gain: vol });
  }
}
