import { parseTextMap } from '../../shared/map/textMap.js';

export const TILE = {
  EMPTY: 0,
  DIRT: 1,
  WALL: 2,
  STEEL: 3,
  BOULDER: 4,
  GEM: 5,
  EXIT_CLOSED: 6,
  EXIT_OPEN: 7,
  KEY: 8,
  DOOR_CLOSED: 9,
  DOOR_OPEN: 10,
};

export const DIRS = {
  UP: {x:0,y:-1}, DOWN: {x:0,y:1}, LEFT: {x:-1,y:0}, RIGHT: {x:1,y:0}
};

export function createWorld(levelDef) {
  let player = { x: 1, y: 1 };
  const enemies = [];
  const initialKeys = levelDef?.startKeys ?? 0;
  let keysOnMap = 0;
  let lockedDoors = 0;
  const grid = parseTextMap(levelDef.map, undefined, undefined, {
    arrayType: Uint8Array,
    padChar: ' ',
    outOfBounds: () => TILE.STEEL,
    mapTile(ch, x, y) {
      if (ch === 'P') { player = { x, y }; return TILE.EMPTY; }
      if (ch === 'F') { enemies.push({ x, y, dir: 0, type: 'FIREFLY' }); return TILE.EMPTY; }
      if (ch === 'B') { enemies.push({ x, y, dir: 0, type: 'BUTTERFLY' }); return TILE.EMPTY; }
      if (ch === 'K') { keysOnMap++; return TILE.KEY; }
      if (ch === 'D') { lockedDoors++; return TILE.DOOR_CLOSED; }
      if (ch === 'd') { return TILE.DOOR_OPEN; }
      switch (ch) {
        case '#': return TILE.WALL;
        case 'X': return TILE.STEEL;
        case '.': return TILE.DIRT;
        case 'o': return TILE.BOULDER;
        case '*': return TILE.GEM;
        case 'E': return TILE.EXIT_CLOSED;
        default: return TILE.EMPTY;
      }
    }
  });

  const { width, height, data: t } = grid;
  const tilesize = 16; // doubled so sprites render at their native 16px resolution
  let falling = new Uint8Array(width * height);
  const events = [];

  function reachableGemCount() {
    const visited = new Uint8Array(width * height);
    const qx = new Int16Array(width * height);
    const qy = new Int16Array(width * height);
    let head = 0;
    let tail = 0;
    qx[tail] = player.x;
    qy[tail] = player.y;
    tail++;
    let gems = 0;
    const passable = (id) =>
      id === TILE.EMPTY ||
      id === TILE.DIRT ||
      id === TILE.GEM ||
      id === TILE.KEY ||
      id === TILE.EXIT_OPEN ||
      id === TILE.DOOR_OPEN;
    while (head < tail) {
      const x = qx[head];
      const y = qy[head];
      head++;
      const i = y * width + x;
      if (visited[i]) continue;
      visited[i] = 1;
      const id = t[i];
      if (id === TILE.GEM) gems++;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (let k = 0; k < 4; k++) {
        const nx = x + dirs[k][0];
        const ny = y + dirs[k][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nid = t[ny * width + nx];
        if (!passable(nid)) continue;
        const ni = ny * width + nx;
        if (visited[ni]) continue;
        qx[tail] = nx;
        qy[tail] = ny;
        tail++;
      }
    }
    return gems;
  }

  const reachableGems = reachableGemCount();
  const computedRequirement = levelDef?.gemsRequired ?? ((reachableGems > 0) ? Math.max(1, Math.floor(reachableGems * 0.8)) : 0);
  const startingTime = levelDef?.time ?? 120;
  const world = {
    width,
    height,
    tilesize,
    t,
    falling,
    player,
    enemies,
    collected: 0,
    gemsRequired: computedRequirement,
    score: 0,
    timeLeft: startingTime,
    state: 'play', // play | dead | timeup | win
    tick: 0,
    keysHeld: initialKeys,
    keysTotal: keysOnMap + initialKeys,
    keysRemaining: keysOnMap,
    lockedDoors,
    events,
    idx: grid.index.bind(grid),
    inb: grid.inBounds.bind(grid),
    get(x, y) {
      return grid.get(x, y, TILE.STEEL);
    },
    set(x, y, v) {
      if (!this.inb(x, y)) return;
      const current = grid.get(x, y, TILE.STEEL);
      if (current === v) return;
      if (current === TILE.DOOR_CLOSED && v !== TILE.DOOR_CLOSED) {
        this.lockedDoors = Math.max(0, this.lockedDoors - 1);
      } else if (current !== TILE.DOOR_CLOSED && v === TILE.DOOR_CLOSED) {
        this.lockedDoors++;
      }
      grid.set(x, y, v);
      this.t[this.idx(x, y)] = v;
    },
    isFree(x, y) {
      const id = this.get(x, y);
      return (
        id === TILE.EMPTY ||
        id === TILE.DIRT ||
        id === TILE.GEM ||
        id === TILE.KEY ||
        id === TILE.EXIT_OPEN ||
        id === TILE.DOOR_OPEN
      );
    },
    isPassable(x, y) {
      const id = this.get(x, y);
      return id === TILE.EMPTY || id === TILE.EXIT_OPEN || id === TILE.DOOR_OPEN || id === TILE.KEY;
    },
    isSteel(x, y) {
      return this.get(x, y) === TILE.STEEL;
    },
    isExit(x, y) {
      const id = this.get(x, y);
      return id === TILE.EXIT_CLOSED || id === TILE.EXIT_OPEN;
    },
    setGem(x, y) {
      if (!this.inb(x, y)) return;
      if (this.player.x === x && this.player.y === y) {
        this.collected++;
        this.score += 15;
        this._on('collect');
        if (this.collected >= this.gemsRequired) this.openExits();
        return;
      }
      this.set(x, y, TILE.GEM);
    },
    setBoulder(x, y) {
      if (!this.inb(x, y)) return;
      if (this.player.x === x && this.player.y === y && this.state === 'play') {
        this.state = 'dead';
        this._on('die');
      }
      this.set(x, y, TILE.BOULDER);
    },
    clearTile(x, y) {
      if (!this.inb(x, y)) return;
      const current = this.get(x, y);
      if (current === TILE.KEY) {
        if (this.keysRemaining > 0) this.keysRemaining--;
        if (this.keysTotal > this.keysHeld) this.keysTotal = Math.max(this.keysHeld, this.keysTotal - 1);
      }
      if (this.player.x === x && this.player.y === y && this.state === 'play') {
        this.state = 'dead';
        this._on('die');
      }
      this.set(x, y, TILE.EMPTY);
      if (this.enemies && this.enemies.length) {
        this.enemies = this.enemies.filter((e) => !(e.x === x && e.y === y));
      }
    },
    flushEvents() {
      if (events.length === 0) return [];
      const out = events.slice();
      events.length = 0;
      return out;
    },
    _on(type, payload) {
      events.push({ type, payload });
    },
    tryMovePlayer(dir) {
      if (this.state !== 'play') return false;
      const nx = this.player.x + dir.x;
      const ny = this.player.y + dir.y;
      let id = this.get(nx, ny);

      if (id === TILE.DOOR_CLOSED) {
        if (this.keysHeld > 0) {
          this.keysHeld--;
          this._on('unlock');
          this.set(nx, ny, TILE.DOOR_OPEN);
          id = TILE.DOOR_OPEN;
        } else {
          return false;
        }
      }

      if (id === TILE.BOULDER && dir.x !== 0 && dir.y === 0) {
        const bx = nx + dir.x;
        const by = ny + dir.y;
        const ahead = this.get(bx, by);
        if ((ahead === TILE.EMPTY || ahead === TILE.DOOR_OPEN) && this.falling[this.idx(nx, ny)] === 0) {
          this.set(bx, by, TILE.BOULDER);
          this.set(nx, ny, TILE.EMPTY);
          this.player.x = nx;
          this.player.y = ny;
          this._on('push');
          this._on('step');
          return true;
        }
      }

      if (id === TILE.WALL || id === TILE.STEEL || id === TILE.BOULDER || id === TILE.EXIT_CLOSED) return false;

      if (id === TILE.GEM) {
        this.collected++;
        this.score += 15;
        this._on('collect');
      } else if (id === TILE.DIRT) {
        this.score += 1;
        this._on('dig');
      } else if (id === TILE.KEY) {
        this.keysHeld++;
        if (this.keysRemaining > 0) this.keysRemaining--;
        if (this.keysTotal < this.keysHeld) this.keysTotal = this.keysHeld;
        this.score += 25;
        this._on('key');
      }

      const shouldClear = !(id === TILE.EXIT_OPEN || id === TILE.DOOR_OPEN);
      if (shouldClear) this.set(nx, ny, TILE.EMPTY);

      this.player.x = nx;
      this.player.y = ny;

      if (this.collected >= this.gemsRequired) this.openExits();

      if (id === TILE.EXIT_OPEN) {
        this.state = 'win';
        this._on('win');
      } else if (id === TILE.EMPTY || id === TILE.DOOR_OPEN) {
        this._on('step');
      }

      return true;
    },
    openExits() {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (this.get(x, y) === TILE.EXIT_CLOSED) this.set(x, y, TILE.EXIT_OPEN);
        }
      }
      this._on('exit-open');
    },
    update(dt) {
      if (this.state !== 'play') return;
      this.tick++;
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.state = 'timeup';
        this._on('die', { reason: 'time' });
        return;
      }

      const wasFalling = this.falling;
      const nextFalling = new Uint8Array(width * height);
      const isAir = (tile) => tile === TILE.EMPTY || tile === TILE.EXIT_OPEN || tile === TILE.DOOR_OPEN || tile === TILE.KEY;
      const isRocky = (tile) => tile === TILE.BOULDER || tile === TILE.GEM;

      for (let y = this.height - 2; y >= 0; y--) {
        for (let x = 0; x < this.width; x++) {
          const id = this.get(x, y);
          if (id !== TILE.BOULDER && id !== TILE.GEM) continue;

          const i = this.idx(x, y);
          const fallingBefore = wasFalling[i] === 1;

          const belowTile = this.get(x, y + 1);
          const playerBelow = this.player.x === x && this.player.y === y + 1;

          if (isAir(belowTile)) {
            if (playerBelow) {
              if (fallingBefore) {
                this.state = 'dead';
                this._on('die');
                this.set(x, y, TILE.EMPTY);
                this.set(x, y + 1, id);
                nextFalling[this.idx(x, y + 1)] = 1;
              }
              continue;
            }
            this.set(x, y + 1, id);
            this.set(x, y, TILE.EMPTY);
            nextFalling[this.idx(x, y + 1)] = 1;
            if (id === TILE.BOULDER && !fallingBefore) this._on('fall');
            continue;
          }

          if (isRocky(belowTile)) {
            const leftFree =
              isAir(this.get(x - 1, y)) && !(this.player.x === x - 1 && this.player.y === y);
            const downLeftFree =
              isAir(this.get(x - 1, y + 1)) && !(this.player.x === x - 1 && this.player.y === y + 1);
            if (leftFree && downLeftFree) {
              if (this.player.x === x - 1 && this.player.y === y + 1) {
                if (fallingBefore) {
                  this.state = 'dead';
                  this._on('die');
                } else {
                  continue;
                }
              }
              this.set(x - 1, y + 1, id);
              this.set(x, y, TILE.EMPTY);
              nextFalling[this.idx(x - 1, y + 1)] = 1;
              if (id === TILE.BOULDER && !fallingBefore) this._on('fall');
              continue;
            }
            const rightFree =
              isAir(this.get(x + 1, y)) && !(this.player.x === x + 1 && this.player.y === y);
            const downRightFree =
              isAir(this.get(x + 1, y + 1)) && !(this.player.x === x + 1 && this.player.y === y + 1);
            if (rightFree && downRightFree) {
              if (this.player.x === x + 1 && this.player.y === y + 1) {
                if (fallingBefore) {
                  this.state = 'dead';
                  this._on('die');
                } else {
                  continue;
                }
              }
              this.set(x + 1, y + 1, id);
              this.set(x, y, TILE.EMPTY);
              nextFalling[this.idx(x + 1, y + 1)] = 1;
              if (id === TILE.BOULDER && !fallingBefore) this._on('fall');
              continue;
            }
          }

          if (fallingBefore && id === TILE.BOULDER) {
            this._on('land');
          }
        }
      }

      try {
        if (this.enemies) enemiesStep(this);
        resolveExplosions(this);
      } catch (e) {
        console.warn('wire-loop-hooks', e);
      }
      this.falling = nextFalling;
    },
  };
  if (world.gemsRequired === 0) world.openExits();
  world.queueExplosion = (...a) => queueExplosion(world, ...a);
  return world;
}
// --- Enemies + Explosions scaffold (Phase 1) ---
export const ENEMY_TYPES = { FIREFLY: 'FIREFLY', BUTTERFLY: 'BUTTERFLY' };
export const DIR = { R:0, D:1, L:2, U:3 };
// Explosion queue items: {x,y,ttl,kind:'FIRE'|'BUTTER'}
// Enemies: {x,y,dir,type}
// Integration points to wire into tick order:
// 1) gravityStep(); 2) enemiesStep(world); 3) resolveExplosions(world); 4) applyPlayer(world); 5) sfx hooks
// Hook registration (implemented in sys/explosions.js)
import { enemiesStep } from './entities/enemies.js';
import { queueExplosion, resolveExplosions } from './sys/explosions.js';

// World should expose helpers used by systems above:
// - isPassable(x,y), isSteel(x,y), isExit(x,y), setGem(x,y), clearTile(x,y)
// - player {x,y}
// - enemies: []
// Wire into main tick: gravity -> enemiesStep(this) -> resolveExplosions(this) -> player
// Provide world.queueExplosion = (...args)=>queueExplosion(this,...args)
if(typeof globalThis!=='undefined'){
  // attach at module eval for simplicity in this scaffold; real code should set on construction
}
// --- Magic Wall scaffold (Phase 3) ---
export const MAGIC_WALL = { INACTIVE:0, ACTIVE:1, SPENT:2 };
// world.magicActiveUntil, world.magicDuration
// world.isMagicWall(x,y) -> state; world.setMagicWall(x,y,state)
// During gravity step, if a falling boulder/diamond enters an ACTIVE wall cell, convert and place below.
// Auto-wired Magic Wall conversion helper (call from gravity when an item enters ACTIVE)
export function magicConvert(world, x, y, item){
  // item: 'BOULDER'|'GEM'; assumes (x,y) is wall cell; output placed at (x,y+1) if empty
  if(!world.isMagicWall||!world.setMagicWall) return;
  const state = world.isMagicWall(x,y);
  if(state!==1 /* ACTIVE */) return;
  const belowX=x, belowY=y+1;
  if(!world.isPassable(belowX,belowY)) return;
  if(item==='BOULDER'){ world.setGem(belowX,belowY); }
  else if(item==='GEM'){ world.setBoulder(belowX,belowY); }
}
