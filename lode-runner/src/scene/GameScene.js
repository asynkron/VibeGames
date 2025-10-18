import { ensureUnlocked, playSequence, setMasterVolume } from '../../../shared/audio/beep.js';

const TILE = 32;
const COLS = 28;
const ROWS = 16;
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

function charMap(ch) {
  switch (ch) {
    case 'X': return 'brick';
    case '=': return 'solid';
    case 'L': return 'ladder';
    case '-': return 'rope';
    case 'G': return 'gold';
    case 'P': return 'player';
    case 'E': return 'enemy';
    default: return 'empty';
  }
}

export default class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {}

  async create() {
    this.cameras.main.setBackgroundColor(Colors.bg);

    setMasterVolume(0.1);
    ensureUnlocked();

    // Persisted state
    const savedIndex = this.registry.get('levelIndex');
    this.levelIndex = typeof savedIndex === 'number' ? savedIndex : 0;
    const savedLives = this.registry.get('lives');
    this.lives = typeof savedLives === 'number' ? savedLives : 3;
    this.exitSpawned = false;

    const levelPath = LEVELS[this.levelIndex] ?? LEVELS[0];
    const levelText = await this.loadLevel(levelPath);
    const rows = levelText.trim().split('\n').filter(r => !r.startsWith('#'));

    this.map = this.buildMap(rows);

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

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

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

    // Pause
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
      const paused = this.physics.world.isPaused;
      this.physics.world.isPaused = !paused;
      this.pauseText.setVisible(!paused);
      return;
    }
    if (this.physics.world.isPaused) return;

    // Restart
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) { this.scene.restart(); return; }

    const onLadder = this.isOnLadder(this.player);
    const onRope = this.isTouchingRope(this.player);

    const nowTime = this.time.now;
    const grounded = this.player.body.blocked.down === true;
    if (grounded) this.lastGroundedAt = nowTime;
    const justLanded = !this.wasGrounded && grounded && !onLadder && !onRope;
    if (justLanded && Math.abs(this.player.body.velocity.y) > 60) {
      this.beep(320, 0.05, 'square', 0.05);
      this.cameras.main.shake(40, 0.003);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) { this.jumpBufferUntil = nowTime + this.jumpBufferMs; }

    // Horizontal movement
    const left = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    let accel = 1800;
    const inAir = !grounded && !onLadder && !onRope;
    if (inAir) accel = Math.round(accel * 0.75);
    if (left) this.player.setAccelerationX(-accel); else if (right) this.player.setAccelerationX(accel); else this.player.setAccelerationX(0);
    // Vertical movement logic with ladder top step-up
    const up = this.cursors.up.isDown;
    const down = this.cursors.down.isDown;

    if (onLadder) {
      // If pushing up at ladder top with solid/brick above, step up onto platform
      if (up && this.tryStepUpFromLadder(this.player)) {
        // stepped up, normal gravity resumes below
      } else {
        // Snap X to ladder center when climbing for crispness
        const targetX = Math.round((this.player.x - TILE / 2) / TILE) * TILE + TILE / 2;
        if (Math.abs(this.player.x - targetX) < 8) this.player.x = targetX;
        this.player.setGravityY(0);
        this.player.setVelocityY(0);
        if (up) this.player.setVelocityY(-170); else if (down) this.player.setVelocityY(170);
      }
    } else if (onRope) {
      // Hang on rope; zero gravity. Down drops.
      this.player.setGravityY(0);
      if (down) this.player.setVelocityY(160); else this.player.setVelocityY(0);
    } else {
      this.player.setGravityY(this.physics.world.gravity.y);
      const withinCoyote = (nowTime - this.lastGroundedAt) <= this.coyoteMs;
      if ((grounded || withinCoyote) && nowTime <= this.jumpBufferUntil) {
        this.player.setVelocityY(-380);
        this.beep(560, 0.05, 'triangle', 0.05);
        this.jumpBufferUntil = 0;
    this.wasGrounded = true;
      }
      if (Phaser.Input.Keyboard.JustUp(this.cursors.up) && this.player.body.velocity.y < 0) {
        this.player.setVelocityY(this.player.body.velocity.y * this.jumpCutMultiplier);
    }

    // Ground/air drag split for better feel
    this.player.setDragX(grounded ? 1400 : 450);
    // Digging
    // Digging (cooldown)
    if (Phaser.Input.Keyboard.JustDown(this.keyZ) && nowTime - this.lastDigAt >= this.digCooldownMs) this.tryDig(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keyX) && nowTime - this.lastDigAt >= this.digCooldownMs) this.tryDig(1);

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
  }

  }
  async loadLevel(path) {
    return new Promise((resolve) => {
      this.load.text('level', path);
      this.load.once('complete', () => { resolve(this.cache.text.get('level')); });
      this.load.start();
    });
  }

  buildMap(rows) {
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      const line = rows[r] || ''.padEnd(COLS, '=');
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const ch = line[c] || '=';
        row.push(charMap(ch));
      }
      grid.push(row);
    }
    return grid;
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
    let on = false;
    this.ladderGroup.getChildren().forEach(l => { if (Phaser.Geom.Intersects.RectangleToRectangle(sprite.getBounds(), l.getBounds())) on = true; });
    return on;
  }

  isTouchingRope(sprite) {
    let on = false;
    this.ropeGroup.getChildren().forEach(r => { if (Phaser.Geom.Intersects.RectangleToRectangle(sprite.getBounds(), r.getBounds())) on = true; });
    return on;
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
    ensureUnlocked();
    playSequence([{ freq, dur, type, gain: vol }]);
  }
}
