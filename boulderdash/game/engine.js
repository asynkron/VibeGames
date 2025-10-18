import { createDPad } from '../../shared/input/dpad.js';
import { TILE, DIRS } from './world.js';

export class GameEngine {
  constructor(world, renderer, onEvent) {
    this.world = world;
    this.renderer = renderer;
    this.onEvent = onEvent;

    this.acc = 0;
    this.last = 0;

    this.input = { wait: false, restart: false };

    this.tickRate = 1000/20; // 20 logic tps
    this.moveCooldown = 0; // regulate player move rate
    this.moveDelay = 1000/8; // 8 moves per second max

    this.onRestart = null;
    this.onNextLevel = null;
    this.dpad = createDPad({ preventDefault: true, restartKeys: ['r'] });
    this.dpad.onKeyChange([' ', 'spacebar'], (down) => { this.input.wait = down; });
    this.dpad.onRestart(() => { this.input.restart = true; });
  }

  setWorld(w) { this.world = w; }

  frame(t) {
    if (!this.last) this.last = t;
    const dt = t - this.last; this.last = t;
    this.acc += dt;

    // regulate player movement cadence
    this.moveCooldown -= dt;

    while (this.acc >= this.tickRate) {
      this.acc -= this.tickRate;
      this.step(this.tickRate/1000);
    }

    this.renderer.draw(this.world);
  }

  step(dt) {
    const w = this.world;

    if (w.state === 'dead' || w.state === 'win') {
      if (this.input.restart) {
        this.input.restart = false;
        if (this.onRestart) this.onRestart();
      }
      return;
    }

    // handle input -> single move per delay
    let moved = false;
    if (this.moveCooldown <= 0) {
      const dir = this.inputDirection();
      if (dir) {
        moved = w.tryMovePlayer(dir);
        if (moved) this.moveCooldown = this.moveDelay;
      } else if (this.input.wait) {
        moved = true; // pass turn
        this.moveCooldown = this.moveDelay * 0.5;
      }
    }

    const event = w.update(dt);
    if (event && this.onEvent) this.onEvent(event.type, event.payload);

    if (w.state === 'win' && this.onNextLevel) {
      // brief pause then next level
      setTimeout(() => this.onNextLevel && this.onNextLevel(), 1200);
    }
  }

  inputDirection() {
    const dir = this.dpad.getDirection({ exclusive: true });
    if (!dir) return null;
    if (dir === 'up') return DIRS.UP;
    if (dir === 'down') return DIRS.DOWN;
    if (dir === 'left') return DIRS.LEFT;
    if (dir === 'right') return DIRS.RIGHT;
    return null;
  }
}
