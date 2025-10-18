import { createBeeper } from '../../../shared/audio/beeper.js';
import { createDPad } from '../../../shared/input/dpad.js';
import { parseTextMap } from '../../../shared/map/textMap.js';
import { charMap } from '../map/charMap.js';
import { TILE_SIZE, COLS, ROWS } from '../map/constants.js';

const TILE = TILE_SIZE;
const LEVELS = ['levels/level1.txt','levels/level2.txt','levels/level3.txt'];

const Colors = {
  bg: 0x0b0d12,
  brick: 0x8b3a1a,
  solid: 0x5a2a0f,
  ladder: 0xcaa36a,
  rope: 0xe8d8a6,
  gold: 0xffd14d,
  player: 0x7fe8ff,
  playerShadow: 0x3fa3b5,
  enemy: 0xff6c6c,
  exit: 0x58ff85,
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
          this.player.setMaxVelocity(320, 560);
          this.player.setDragX(900);
          // Narrower body for smoother ledges and ladder exits
          this.player.body.setSize(18, 26).setOffset(7, 6);
          this.player.play('player-idle');
        } else if (type === 'enemy') {
          const e = this.physics.add.sprite(x, y, 'enemy');
          e.setCollideWorldBounds(true);
          e.setMaxVelocity(200, 540);
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
  }

  update() {
    if (!this.player) return;

    if (this.queueRestart) {
      this.queueRestart = false;
      this.scene.restart();
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

    let accel = 1800;
    const inAir = !grounded && !onLadder && !onRope;
    if (inAir) accel = Math.round(accel * 0.75);
    if (left) this.player.setAccelerationX(-accel); else if (right) this.player.setAccelerationX(accel); else this.player.setAccelerationX(0);
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
        if (up) ladderSpeed = -170;
        else if (down) ladderSpeed = 170;
        this.player.setVelocityY(ladderSpeed);
      }
    } else if (onRope) {
      // Hang on rope; zero gravity so you don't slowly slide off. Up/down let
      // you shimmy to nearby ladders just like the classic game.
      this.player.setGravityY(0);
      let ropeSpeed = 0;
      if (up) ropeSpeed = -160;
      else if (down) ropeSpeed = 160;
      this.player.setVelocityY(ropeSpeed);
    } else {
      this.player.setGravityY(this.physics.world.gravity.y);
      const withinCoyote = (nowTime - this.lastGroundedAt) <= this.coyoteMs;
      if ((grounded || withinCoyote) && nowTime <= this.jumpBufferUntil) {
        this.player.setVelocityY(-380);
        this.beep(560, 0.05, 'triangle', 0.05);
        this.jumpBufferUntil = 0;
      }
      if (upJustReleased && this.player.body.velocity.y < 0) {
        this.player.setVelocityY(this.player.body.velocity.y * this.jumpCutMultiplier);
      }
    }

    // Ground/air drag split for better feel
    this.player.setDragX(grounded ? 1400 : 450);

    // Enemy simple AI
    this.enemies.getChildren().forEach(e => {
      // Enemy hole stun: if enemy stands in a dug hole, trap briefly
      const ec = Math.floor(e.x / TILE); const er = Math.floor(e.y / TILE);
      const prevStuck = e.getData("stuckUntil") || 0;
      if (this.map[er] && this.map[er][ec] === 'hole') {
        if (prevStuck < nowTime) { e.setData("stuckUntil", nowTime + 2200); this.beep(180, 0.05, 'sawtooth', 0.04); }
      }
      if ((e.getData("stuckUntil") || 0) > nowTime) { e.setVelocity(0, 0); e.setAcceleration(0, 0); return; }
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const onL = this.isOnLadder(e);
      const vx = Math.sign(dx) * 120;
      e.setAccelerationX(vx * 6);
      if (onL) {
        if (Math.abs(dx) < 20) e.setVelocityY(Math.sign(dy) * 120); else e.setVelocityY(0);
      }
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
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Brick (shaded)
    g.clear();
    g.fillStyle(Colors.brick, 1); g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xffffff, 0.06); g.fillRect(0, 0, TILE, 6);
    g.lineStyle(2, 0x000000, 0.2); for (let i=8;i<TILE;i+=8) g.lineBetween(0, i, TILE, i);
    g.generateTexture('brick', TILE, TILE);

    // Solid bedrock
    g.clear(); g.fillStyle(Colors.solid, 1); g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x000000, 0.15); g.fillRect(0, TILE-6, TILE, 6);
    g.generateTexture('solid', TILE, TILE);

    // Ladder
    g.clear(); g.fillStyle(0x000000, 0); g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(3, Colors.ladder, 1); g.strokeRect(8, 4, TILE-16, TILE-8);
    for (let y = 8; y < TILE; y += 8) { g.lineBetween(8, y, TILE-8, y); }
    g.generateTexture('ladder', TILE, TILE);

    // Rope
    g.clear(); g.fillStyle(0x000000, 0); g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(4, Colors.rope, 1); g.lineBetween(4, TILE/2, TILE-4, TILE/2);
    g.generateTexture('rope', TILE, TILE);

    // Gold
    g.clear(); g.fillStyle(Colors.gold, 1); g.fillRoundedRect(6, 10, TILE-12, TILE-20, 6);
    g.lineStyle(2, 0xffffff, 0.6); g.strokeRoundedRect(6, 10, TILE-12, TILE-20, 6);
    g.generateTexture('gold', TILE, TILE);

    // Enemy (simple with eyes)
    g.clear();
    g.fillStyle(Colors.enemy, 1); g.fillRoundedRect(6, 10, TILE-12, TILE-14, 6);
    g.fillStyle(0x000000, 0.7); g.fillRect(10, 12, 4, 4); g.fillRect(18, 12, 4, 4);
    g.generateTexture('enemy', TILE, TILE);

    // Exit
    g.clear(); g.fillStyle(Colors.exit, 1); g.fillRoundedRect(6, 6, TILE-12, TILE-12, 6);
    g.lineStyle(2, 0xffffff, 0.5); g.strokeRoundedRect(6, 6, TILE-12, TILE-12, 6);
    g.generateTexture('exit', TILE, TILE);
  }

  makePlayerFramesAndAnimations() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const base = (fill = Colors.player, shadow = Colors.playerShadow) => {
      // Torso
      g.fillStyle(fill, 1); g.fillRect(11, 8, 10, 10);
      // Head
      g.fillRect(12, 4, 8, 4);
      // Shadow accent
      g.fillStyle(shadow, 0.6); g.fillRect(11, 8, 10, 2);
    };
    const legs = (l1x, l1y, l2x, l2y) => {
      g.fillStyle(Colors.player, 1);
      g.fillRect(l1x, l1y, 3, 8);
      g.fillRect(l2x, l2y, 3, 8);
    };
    const arms = (ax1, ay1, ax2, ay2) => {
      g.fillStyle(Colors.player, 1);
      g.fillRect(ax1, ay1, 3, 6);
      g.fillRect(ax2, ay2, 3, 6);
    };

    function gen(key, draw) {
      g.clear(); g.fillStyle(0x000000, 0); g.fillRect(0, 0, TILE, TILE);
      base(); draw();
      g.generateTexture(key, TILE, TILE);
    }

    // Idle
    gen('player_idle', () => { legs(12, 18, 17, 18); arms(10, 10, 21, 10); });
    // Run cycle (4 frames)
    gen('player_run_0', () => { legs(10, 18, 18, 20); arms(9, 10, 22, 12); });
    gen('player_run_1', () => { legs(12, 20, 16, 18); arms(10, 12, 21, 10); });
    gen('player_run_2', () => { legs(18, 18, 10, 20); arms(9, 12, 22, 10); });
    gen('player_run_3', () => { legs(12, 18, 16, 20); arms(10, 10, 21, 12); });
    // Climb (2 frames)
    gen('player_climb_0', () => { legs(12, 18, 17, 14); arms(10, 8, 21, 12); });
    gen('player_climb_1', () => { legs(12, 14, 17, 18); arms(10, 12, 21, 8); });
    // Hang (rope) (2 frames)
    gen('player_hang_0', () => { legs(12, 20, 17, 20); arms(10, 8, 21, 8); });
    gen('player_hang_1', () => { legs(12, 20, 17, 20); arms(10, 9, 21, 9); });

    // Animations
    const anims = this.anims;
    if (!anims.exists('player-idle')) {
      anims.create({ key: 'player-idle', frames: [{ key: 'player_idle' }], frameRate: 6, repeat: -1 });
      anims.create({ key: 'player-run', frames: [ 'player_run_0','player_run_1','player_run_2','player_run_3' ].map(k => ({ key: k })), frameRate: 10, repeat: -1 });
      anims.create({ key: 'player-climb', frames: [ 'player_climb_0','player_climb_1' ].map(k => ({ key: k })), frameRate: 6, repeat: -1 });
      anims.create({ key: 'player-hang', frames: [ 'player_hang_0','player_hang_1' ].map(k => ({ key: k })), frameRate: 4, repeat: -1 });
    }
  }

  updatePlayerAnimation(onLadder, onRope) {
    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;
    const grounded = this.player.body.blocked.down;

    // Flip by direction
    if (Math.abs(vx) > 5) this.player.setFlipX(vx < 0);

    if (onLadder) {
      this.player.anims.play('player-climb', true);
    } else if (onRope) {
      this.player.anims.play('player-hang', true);
    } else if (grounded && Math.abs(vx) > 30) {
      this.player.anims.play('player-run', true);
    } else {
      this.player.anims.play('player-idle', true);
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
      this.scene.restart();
    } else {
      this.scene.restart();
    }
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
