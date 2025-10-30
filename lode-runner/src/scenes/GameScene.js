import { createBeeper } from '../../../shared/audio/beeper.js';
import { ensureTextures } from '../gameplay/textures.js';
import {
  COLS,
  ROWS,
  TILE_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  HOLE_LIFETIME_MS,
  HOLE_WARNING_MS,
  PLAYER_SPEED,
  ENEMY_SPEED,
  ENEMY_RESPAWN_DELAY,
  LEVEL_KEYS,
} from '../gameplay/constants.js';
import { parseLevel } from '../gameplay/levelParser.js';

const PLAYER_BODY = { width: 18, height: 26, offsetX: 3, offsetY: 4 };
const ENEMY_BODY = { width: 18, height: 26, offsetX: 3, offsetY: 4 };

function toWorldPosition(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
    this.beeper = createBeeper({ masterGain: 0.08 });
    if (typeof window !== 'undefined') {
      this.beeper.unlockWithGestures(window, ['pointerdown', 'keydown']);
    }
    this.levelIndex = 0;
    this.score = 0;
    this.lives = 3;
    this.keys = null;
    this.hudText = null;
    this.pauseText = null;
    this.mapGrid = [];
    this.brickSprites = [];
    this.holes = [];
    this.goldRemaining = 0;
    this.exitSprite = null;
    this.player = null;
    this.enemies = null;
    this.spawnPoints = [];
    this.exitHint = null;
    this.paused = false;
    this.digCooldown = 0;
  }

  init(data) {
    this.levelIndex = typeof data.levelIndex === 'number' ? data.levelIndex : (this.registry.get('lr.levelIndex') ?? 0);
    this.score = typeof data.score === 'number' ? data.score : (this.registry.get('lr.score') ?? 0);
    this.lives = typeof data.lives === 'number' ? data.lives : (this.registry.get('lr.lives') ?? 3);
    this.paused = false;
    this.holes = [];
    this.mapGrid = [];
    this.brickSprites = [];
    this.exitSprite = null;
    this.exitHint = null;
    this.goldRemaining = 0;
    this.spawnPoints = [];
    this.digCooldown = 0;
  }

  preload() {
    LEVEL_KEYS.forEach((path, index) => {
      this.load.text(`level-${index}`, path);
    });
  }

  create() {
    ensureTextures(this);
    const removeAnim = (key) => {
      if (this.anims.exists(key)) this.anims.remove(key);
    };
    removeAnim('runner-run');
    removeAnim('runner-climb');
    removeAnim('runner-hang');
    removeAnim('guard-run');
    removeAnim('guard-climb');
    removeAnim('guard-hang');

    this.anims.create({
      key: 'runner-run',
      frames: [
        { key: 'lr-runner-run-0' },
        { key: 'lr-runner-run-1' },
        { key: 'lr-runner-run-2' },
        { key: 'lr-runner-run-3' },
      ],
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'runner-climb',
      frames: [
        { key: 'lr-runner-climb-0' },
        { key: 'lr-runner-climb-1' },
      ],
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({ key: 'runner-idle', frames: [{ key: 'lr-runner-idle' }], frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'runner-hang', frames: [{ key: 'lr-runner-hang' }], frameRate: 1, repeat: -1 });

    this.anims.create({
      key: 'guard-run',
      frames: [
        { key: 'lr-guard-run-0' },
        { key: 'lr-guard-run-1' },
        { key: 'lr-guard-run-2' },
        { key: 'lr-guard-run-3' },
      ],
      frameRate: 9,
      repeat: -1,
    });
    this.anims.create({
      key: 'guard-climb',
      frames: [
        { key: 'lr-guard-climb-0' },
        { key: 'lr-guard-climb-1' },
      ],
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({ key: 'guard-idle', frames: [{ key: 'lr-guard-idle' }], frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'guard-hang', frames: [{ key: 'lr-guard-hang' }], frameRate: 1, repeat: -1 });

    this.cameras.main.setBackgroundColor('#11131b');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.gravity.y = 820;
    this.physics.world.isPaused = false;
    this.cameras.main.roundPixels = true;

    this.solidGroup = this.physics.add.staticGroup();
    this.brickGroup = this.physics.add.staticGroup();
    this.ladderGroup = this.physics.add.staticGroup();
    this.ropeGroup = this.physics.add.staticGroup();
    this.goldGroup = this.physics.add.staticGroup();
    this.exitGroup = this.physics.add.staticGroup();

    this.enemies = this.physics.add.group();

    this.setupInput();
    this.createHud();

    this.time.addEvent({
      delay: 0,
      callback: () => {
        this.loadLevel(this.levelIndex);
      },
      loop: false,
    });
  }

  createHud() {
    this.hudText = this.add.text(10, 8, '', {
      fontFamily: 'monospace',
      fontSize: 14,
      color: '#a6ddff',
    }).setDepth(30).setScrollFactor(0);

    this.pauseText = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'PAUSED', {
      fontFamily: 'monospace',
      fontSize: 26,
      color: '#a6ddff',
    }).setDepth(40).setScrollFactor(0).setOrigin(0.5).setVisible(false);

    this.updateHud();
  }

  setupInput() {
    const { KeyCodes } = Phaser.Input.Keyboard;
    const addKey = (code) => this.input.keyboard.addKey(code);

    this.keys = {
      left: addKey(KeyCodes.LEFT),
      right: addKey(KeyCodes.RIGHT),
      up: addKey(KeyCodes.UP),
      down: addKey(KeyCodes.DOWN),
      a: addKey(KeyCodes.A),
      d: addKey(KeyCodes.D),
      w: addKey(KeyCodes.W),
      s: addKey(KeyCodes.S),
      digLeft: addKey(KeyCodes.Z),
      digRight: addKey(KeyCodes.X),
      pause: addKey(KeyCodes.P),
      restart: addKey(KeyCodes.R),
    };

    this.keys.pause.on('down', () => this.togglePause());
    this.keys.restart.on('down', () => this.restartLevel());
  }

  updateHud() {
    const levelNumber = this.levelIndex + 1;
    this.hudText?.setText(`LEVEL ${levelNumber}  SCORE ${this.score.toString().padStart(4, '0')}  LIVES ${this.lives}`);
  }

  loadLevel(index) {
    const key = `level-${index}`;
    const raw = this.cache.text.get(key);
    if (typeof raw !== 'string') {
      throw new Error(`Missing level text for ${key}`);
    }

    const data = parseLevel(raw);

    this.cleanupLevel();

    this.mapGrid = data.grid.map((row) => row.slice());
    this.brickSprites = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.spawnPoints = data.enemySpawns.map((spawn) => toWorldPosition(spawn.col, spawn.row));
    this.exitHint = data.exitHint ? toWorldPosition(data.exitHint.col, data.exitHint.row) : null;

    const playerPos = toWorldPosition(data.playerSpawn.col, data.playerSpawn.row);
    this.player = this.physics.add.sprite(playerPos.x, playerPos.y, 'lr-runner-idle');
    this.player.setCollideWorldBounds(true);
    this.player.setMaxVelocity(PLAYER_SPEED.run, PLAYER_SPEED.fall);
    this.player.body.setSize(PLAYER_BODY.width, PLAYER_BODY.height).setOffset(PLAYER_BODY.offsetX, PLAYER_BODY.offsetY);
    this.player.setDataEnabled();
    this.player.setData('respawning', false);
    this.player.play('runner-idle');

    this.enemies.clear(true, true);
    if (this.spawnPoints.length === 0) {
      this.spawnPoints.push(playerPos);
    }
    for (const spawn of this.spawnPoints) {
      const enemy = this.enemies.create(spawn.x, spawn.y, 'lr-guard-idle');
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(ENEMY_BODY.width, ENEMY_BODY.height).setOffset(ENEMY_BODY.offsetX, ENEMY_BODY.offsetY);
      enemy.setMaxVelocity(ENEMY_SPEED.run, PLAYER_SPEED.fall);
      enemy.setDataEnabled();
      enemy.setData('home', { x: spawn.x, y: spawn.y });
      enemy.setData('respawning', false);
      enemy.play('guard-idle');
    }

    this.goldGroup.clear(true, true);
    this.solidGroup.clear(true, true);
    this.brickGroup.clear(true, true);
    this.ladderGroup.clear(true, true);
    this.ropeGroup.clear(true, true);
    this.exitGroup.clear(true, true);

    this.goldRemaining = 0;

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const type = this.mapGrid[row][col];
        const { x, y } = toWorldPosition(col, row);
        switch (type) {
          case 'solid': {
            this.solidGroup.create(x, y, 'lr-tile-solid');
            break;
          }
          case 'brick': {
            const brick = this.brickGroup.create(x, y, 'lr-tile-brick');
            brick.setDataEnabled();
            brick.setData('row', row);
            brick.setData('col', col);
            this.brickSprites[row][col] = brick;
            break;
          }
          case 'ladder': {
            this.ladderGroup.create(x, y, 'lr-tile-ladder').setAlpha(0.95);
            break;
          }
          case 'rope': {
            const rope = this.ropeGroup.create(x, y, 'lr-tile-rope');
            rope.setAlpha(0.95);
            break;
          }
          case 'gold': {
            const gold = this.goldGroup.create(x, y, 'lr-tile-gold');
            gold.setDataEnabled();
            gold.setData('collected', false);
            gold.setData('row', row);
            gold.setData('col', col);
            this.goldRemaining += 1;
            break;
          }
          default:
            break;
        }
      }
    }

    this.exitSprite = null;

    this.physics.add.collider(this.player, this.solidGroup);
    this.physics.add.collider(this.player, this.brickGroup);
    this.physics.add.collider(this.enemies, this.solidGroup);
    this.physics.add.collider(this.enemies, this.brickGroup);
    this.physics.add.collider(this.enemies, this.enemies);

    this.physics.add.overlap(this.player, this.goldGroup, (_, gold) => this.collectGold(gold));
    this.physics.add.overlap(this.player, this.exitGroup, () => this.advanceLevel());
    this.physics.add.overlap(this.player, this.enemies, () => this.onPlayerCaught());

    this.updateHud();
  }

  cleanupLevel() {
    this.player?.destroy();
    this.player = null;
    this.exitSprite?.destroy();
    this.exitSprite = null;
    this.enemies?.clear(true, true);
    this.holes = [];
  }

  togglePause() {
    this.paused = !this.paused;
    this.physics.world.isPaused = this.paused;
    this.pauseText?.setVisible(this.paused);
  }

  restartLevel() {
    if (this.paused) this.togglePause();
    this.scene.restart({ levelIndex: this.levelIndex, score: this.score, lives: this.lives });
  }

  collectGold(gold) {
    if (!gold || gold.getData('collected')) return;
    gold.setData('collected', true);
    gold.disableBody(true, true);
    this.goldRemaining = Math.max(0, this.goldRemaining - 1);
    this.score += 100;
    const row = gold.getData('row');
    const col = gold.getData('col');
    if (typeof row === 'number' && typeof col === 'number') {
      this.mapGrid[row][col] = 'empty';
    }
    this.beeper.play({ frequency: 880, type: 'sine', duration: 0.08 });
    this.updateHud();
    if (this.goldRemaining === 0) {
      this.spawnExit();
    }
  }

  spawnExit() {
    if (this.exitSprite) return;
    const defaultExit = toWorldPosition(COLS - 2, 1);
    const pos = this.exitHint ?? defaultExit;
    this.exitSprite = this.exitGroup.create(pos.x, pos.y, 'lr-tile-exit');
    this.beeper.play({ frequency: 660, type: 'square', duration: 0.2 });
  }

  advanceLevel() {
    this.levelIndex = (this.levelIndex + 1) % LEVEL_KEYS.length;
    this.registry.set('lr.levelIndex', this.levelIndex);
    this.registry.set('lr.score', this.score);
    this.registry.set('lr.lives', this.lives);
    this.scene.restart({ levelIndex: this.levelIndex, score: this.score, lives: this.lives });
  }

  onPlayerCaught() {
    if (!this.player || this.player.getData('respawning')) return;
    this.player.setData('respawning', true);
    this.beeper.play({ frequency: 120, type: 'sawtooth', duration: 0.4 });
    this.cameras.main.shake(200, 0.01);
    this.lives = Math.max(0, this.lives - 1);
    this.registry.set('lr.lives', this.lives);
    this.updateHud();
    this.time.delayedCall(600, () => {
      if (this.lives <= 0) {
        this.score = 0;
        this.lives = 3;
        this.levelIndex = 0;
        this.registry.set('lr.score', this.score);
        this.registry.set('lr.levelIndex', this.levelIndex);
        this.registry.set('lr.lives', this.lives);
        this.scene.restart({ levelIndex: 0, score: 0, lives: 3 });
      } else {
        this.scene.restart({ levelIndex: this.levelIndex, score: this.score, lives: this.lives });
      }
    });
  }

  attemptDig(direction) {
    if (!this.player) return;
    const now = this.time.now;
    if (now < this.digCooldown) return;
    const baseCol = Phaser.Math.Clamp(Math.floor(this.player.x / TILE_SIZE), 0, COLS - 1);
    const belowRow = Phaser.Math.Clamp(Math.floor(this.player.body.bottom / TILE_SIZE), 0, ROWS - 1);
    const targetCol = Phaser.Math.Clamp(baseCol + direction, 0, COLS - 1);
    const targetRow = Phaser.Math.Clamp(belowRow, 0, ROWS - 1);
    const aboveRow = Phaser.Math.Clamp(targetRow - 1, 0, ROWS - 1);
    const tile = this.mapGrid[targetRow]?.[targetCol];
    const above = this.mapGrid[aboveRow]?.[targetCol];
    if (tile !== 'brick') return;
    if (above === 'solid' || above === 'brick') return;

    const brick = this.brickSprites[targetRow][targetCol];
    if (!brick || brick.getData('dug')) return;

    brick.setData('dug', true);
    brick.disableBody(true, true);
    this.mapGrid[targetRow][targetCol] = 'hole';

    this.holes.push({
      row: targetRow,
      col: targetCol,
      restoreAt: now + HOLE_LIFETIME_MS,
      warningAt: now + Math.max(0, HOLE_LIFETIME_MS - HOLE_WARNING_MS),
    });

    this.beeper.play({ frequency: 320, type: 'triangle', duration: 0.1 });
    this.digCooldown = now + 260;
  }

  update(time, delta) {
    if (!this.player || this.paused) return;

    this.updatePlayer(time, delta);
    this.updateEnemies(time, delta);
    this.updateHoles(time);
  }

  updatePlayer(time, delta) {
    const keys = this.keys;
    const left = keys.left.isDown || keys.a.isDown;
    const right = keys.right.isDown || keys.d.isDown;
    const up = keys.up.isDown || keys.w.isDown;
    const down = keys.down.isDown || keys.s.isDown;

    if (Phaser.Input.Keyboard.JustDown(keys.digLeft)) {
      this.attemptDig(-1);
    }
    if (Phaser.Input.Keyboard.JustDown(keys.digRight)) {
      this.attemptDig(1);
    }

    const body = this.player.body;
    const grounded = body.blocked.down;
    const onLadder = this.checkLadder(this.player.x, this.player.y);
    const onRope = this.checkRope(this.player.x, this.player.y - 8);

    if (onLadder) {
      body.setAllowGravity(false);
      body.setVelocityX(0);
      const snapX = Math.floor(this.player.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      if (Math.abs(this.player.x - snapX) < 8) {
        this.player.x = snapX;
      }
      if (up && !down) {
        body.setVelocityY(-PLAYER_SPEED.climb);
      } else if (down && !up) {
        body.setVelocityY(PLAYER_SPEED.climb);
      } else {
        body.setVelocityY(0);
      }
    } else if (onRope) {
      body.setAllowGravity(false);
      const ropeRow = Phaser.Math.Clamp(Math.floor((this.player.y - 8) / TILE_SIZE), 0, ROWS - 1);
      const ropeY = ropeRow * TILE_SIZE + TILE_SIZE / 2 + 4;
      if (Math.abs(this.player.y - ropeY) < 6) {
        this.player.y = ropeY;
      }
      if (left && !right) {
        body.setVelocityX(-PLAYER_SPEED.rope);
      } else if (right && !left) {
        body.setVelocityX(PLAYER_SPEED.rope);
      } else {
        body.setVelocityX(0);
      }
      if (up && !down) {
        body.setVelocityY(-PLAYER_SPEED.climb * 0.75);
      } else if (down && !up) {
        const belowRow = Phaser.Math.Clamp(Math.floor(this.player.body.bottom / TILE_SIZE), 0, ROWS - 1);
        const belowType = this.mapGrid[belowRow]?.[Math.floor(this.player.x / TILE_SIZE)];
        if (belowType === 'ladder' || belowType === 'rope') {
          body.setVelocityY(PLAYER_SPEED.climb * 0.75);
          body.setAllowGravity(false);
        } else {
          body.setAllowGravity(true);
          body.setVelocityY(80);
        }
      } else {
        body.setVelocityY(0);
      }
    } else {
      body.setAllowGravity(true);
      if (left && !right) {
        body.setVelocityX(-PLAYER_SPEED.run);
      } else if (right && !left) {
        body.setVelocityX(PLAYER_SPEED.run);
      } else {
        body.setVelocityX(0);
      }
      if (up && grounded) {
        body.setVelocityY(-PLAYER_SPEED.jump);
        this.beeper.play({ frequency: 560, type: 'triangle', duration: 0.08 });
      }
    }

    if (!onLadder && !onRope && !grounded) {
      body.setMaxVelocity(PLAYER_SPEED.run, PLAYER_SPEED.fall);
    }

    this.updatePlayerAnimation({ onLadder, onRope, moving: Math.abs(body.velocity.x) > 4 });
  }

  updatePlayerAnimation(state) {
    if (!this.player) return;
    if (state.onRope) {
      this.player.play('runner-hang', true);
    } else if (state.onLadder) {
      this.player.play('runner-climb', true);
    } else if (state.moving) {
      this.player.play('runner-run', true);
    } else {
      this.player.play('runner-idle', true);
    }
    if (this.player.body.velocity.x < 0) {
      this.player.setFlipX(true);
    } else if (this.player.body.velocity.x > 0) {
      this.player.setFlipX(false);
    }
  }

  updateEnemies(time, delta) {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.getData('respawning')) return;
      const body = enemy.body;
      const onLadder = this.checkLadder(enemy.x, enemy.y);
      const onRope = this.checkRope(enemy.x, enemy.y - 6);
      const grounded = body.blocked.down;

      if (onLadder) {
        body.setAllowGravity(false);
        const dy = this.player.y - enemy.y;
        if (Math.abs(dy) > 6) {
          const vertical = dy < 0 ? -ENEMY_SPEED.climb : ENEMY_SPEED.climb;
          body.setVelocityY(vertical);
        } else {
          body.setVelocityY(0);
        }
        body.setVelocityX(0);
        enemy.play('guard-climb', true);
      } else if (onRope) {
        body.setAllowGravity(false);
        const dir = this.player.x < enemy.x ? -1 : 1;
        body.setVelocityX(dir * ENEMY_SPEED.rope);
        body.setVelocityY(0);
        enemy.play('guard-hang', true);
      } else {
        body.setAllowGravity(true);
        if (grounded) {
          const dir = this.player.x < enemy.x ? -1 : 1;
          body.setVelocityX(dir * ENEMY_SPEED.run);
        }
        enemy.play(Math.abs(body.velocity.x) > 4 ? 'guard-run' : 'guard-idle', true);
      }

      if (body.velocity.x < 0) enemy.setFlipX(true);
      else if (body.velocity.x > 0) enemy.setFlipX(false);

      const row = Math.floor(enemy.y / TILE_SIZE);
      const col = Math.floor(enemy.x / TILE_SIZE);
      if (this.mapGrid[row]?.[col] === 'hole') {
        // Guard stuck in hole, wait for respawn.
        body.setVelocityX(0);
        body.setAllowGravity(true);
      }
    });
  }

  updateHoles(now) {
    if (this.holes.length === 0) return;
    const remaining = [];
    for (const hole of this.holes) {
      if (now >= hole.warningAt && now < hole.restoreAt) {
        const brick = this.brickSprites[hole.row][hole.col];
        if (brick) {
          brick.setTint(0xf7c280);
        }
      }
      if (now >= hole.restoreAt) {
        const brick = this.brickSprites[hole.row][hole.col];
        if (brick) {
          brick.clearTint();
          brick.enableBody(false, brick.x, brick.y, true, true);
          brick.refreshBody();
          brick.setData('dug', false);
        }
        const tileRect = new Phaser.Geom.Rectangle(
          hole.col * TILE_SIZE,
          hole.row * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
        );
        this.enemies.getChildren().forEach((enemy) => {
          if (enemy.getData('respawning')) return;
          if (Phaser.Geom.Rectangle.Contains(tileRect, enemy.x, enemy.y)) {
            const home = enemy.getData('home');
            enemy.setData('respawning', true);
            enemy.disableBody(true, true);
            this.time.delayedCall(ENEMY_RESPAWN_DELAY, () => {
              enemy.enableBody(true, home.x, home.y, true, true);
              enemy.body.setSize(ENEMY_BODY.width, ENEMY_BODY.height).setOffset(ENEMY_BODY.offsetX, ENEMY_BODY.offsetY);
              enemy.setVelocity(0, 0);
              enemy.setAlpha(1);
              enemy.setData('respawning', false);
              enemy.play('guard-idle');
            });
          }
        });
        this.mapGrid[hole.row][hole.col] = 'brick';
      } else {
        remaining.push(hole);
      }
    }
    this.holes = remaining;
  }

  checkLadder(x, y) {
    const col = Phaser.Math.Clamp(Math.floor(x / TILE_SIZE), 0, COLS - 1);
    const rowTop = Phaser.Math.Clamp(Math.floor((y - PLAYER_BODY.height / 2) / TILE_SIZE), 0, ROWS - 1);
    const rowBottom = Phaser.Math.Clamp(Math.floor((y + PLAYER_BODY.height / 2) / TILE_SIZE), 0, ROWS - 1);
    return this.mapGrid[rowTop]?.[col] === 'ladder' || this.mapGrid[rowBottom]?.[col] === 'ladder';
  }

  checkRope(x, y) {
    const col = Phaser.Math.Clamp(Math.floor(x / TILE_SIZE), 0, COLS - 1);
    const row = Phaser.Math.Clamp(Math.floor(y / TILE_SIZE), 0, ROWS - 1);
    return this.mapGrid[row]?.[col] === 'rope';
  }
}
