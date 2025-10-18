// Lightweight keyboard D-pad helper shared across the mini-games.
const DIR_KEY_MAP = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
};

const DIRS = ['up', 'down', 'left', 'right'];

function normalizeKey(key) {
  if (!key) return '';
  const lower = key.length === 1 ? key.toLowerCase() : key.toLowerCase();
  if (lower === 'spacebar' || lower === 'space') return ' ';
  return lower;
}

function createSet(keys) {
  const set = new Set();
  (keys || []).forEach((k) => set.add(normalizeKey(k)));
  return set;
}

export function createDPad(options = {}) {
  const {
    preventDefault = true,
    pauseKeys = [],
    restartKeys = [],
    target = window,
  } = options;

  const directionHandlers = new Set();
  const pauseHandlers = new Set();
  const restartHandlers = new Set();
  const buttonHandlers = new Map();
  const buttonState = new Map();

  const pressed = { up: false, down: false, left: false, right: false };
  const order = [];

  const pauseSet = createSet(pauseKeys);
  const restartSet = createSet(restartKeys);

  let lastDirection = null;

  function removeFromOrder(dir) {
    const idx = order.indexOf(dir);
    if (idx !== -1) order.splice(idx, 1);
  }

  function computeDirection({ exclusive = false } = {}) {
    const active = DIRS.filter((dir) => pressed[dir]);
    if (exclusive) return active.length === 1 ? active[0] : null;
    if (order.length === 0) return null;
    // Always pick the most recent key that is still pressed.
    for (let i = order.length - 1; i >= 0; i -= 1) {
      const dir = order[i];
      if (pressed[dir]) return dir;
    }
    return null;
  }

  function emitDirectionChange(meta = { reason: 'change' }) {
    const dir = computeDirection();
    if (dir === lastDirection) return;
    lastDirection = dir;
    directionHandlers.forEach((cb) => cb(dir, meta));
  }

  function emitButton(key, value) {
    const handlers = buttonHandlers.get(key);
    if (!handlers) return;
    if (buttonState.get(key) === value) return;
    buttonState.set(key, value);
    handlers.forEach((cb) => cb(value));
  }

  function handlePause() {
    pauseHandlers.forEach((cb) => cb());
  }

  function handleRestart() {
    restartHandlers.forEach((cb) => cb());
  }

  function onKeyDown(event) {
    const key = normalizeKey(event.key);
    const dir = DIR_KEY_MAP[key];
    const isPause = pauseSet.has(key);
    const isRestart = restartSet.has(key);
    const hasButtonHandler = buttonHandlers.has(key);
    let handled = false;

    if (dir) {
      if (!pressed[dir]) order.push(dir);
      pressed[dir] = true;
      emitDirectionChange({ reason: 'press', key: dir });
      handled = true;
    }

    if (hasButtonHandler) {
      emitButton(key, true);
      handled = true;
    }

    if (!event.repeat) {
      if (isPause) {
        handlePause();
        handled = true;
      }
      if (isRestart) {
        handleRestart();
        handled = true;
      }
    }

    if (preventDefault && (dir || isPause || isRestart || hasButtonHandler)) {
      event.preventDefault();
    }

    if (handled) return;
  }

  function onKeyUp(event) {
    const key = normalizeKey(event.key);
    const dir = DIR_KEY_MAP[key];

    if (dir) {
      pressed[dir] = false;
      removeFromOrder(dir);
      emitDirectionChange({ reason: 'release', key: dir });
    }

    if (buttonHandlers.size && buttonHandlers.has(key)) {
      emitButton(key, false);
    }
  }

  target.addEventListener('keydown', onKeyDown, { passive: !preventDefault });
  target.addEventListener('keyup', onKeyUp, { passive: true });

  return {
    getDirection(opts) {
      return computeDirection(opts);
    },
    isPressed(direction) {
      return !!pressed[direction];
    },
    onDirectionChange(handler) {
      if (typeof handler !== 'function') return () => {};
      directionHandlers.add(handler);
      handler(computeDirection(), { reason: 'init' });
      return () => directionHandlers.delete(handler);
    },
    onPause(handler) {
      if (typeof handler !== 'function') return () => {};
      pauseHandlers.add(handler);
      return () => pauseHandlers.delete(handler);
    },
    onRestart(handler) {
      if (typeof handler !== 'function') return () => {};
      restartHandlers.add(handler);
      return () => restartHandlers.delete(handler);
    },
    onKeyChange(keys, handler) {
      if (typeof handler !== 'function') return () => {};
      const list = Array.isArray(keys) ? keys : [keys];
      const normKeys = list.map((k) => normalizeKey(k));
      normKeys.forEach((key) => {
        if (!buttonHandlers.has(key)) {
          buttonHandlers.set(key, new Set());
          buttonState.set(key, false);
        }
        buttonHandlers.get(key).add(handler);
      });
      // Provide current state so listeners can sync immediately.
      handler(normKeys.some((key) => buttonState.get(key)));
      return () => {
        normKeys.forEach((key) => {
          const set = buttonHandlers.get(key);
          if (!set) return;
          set.delete(handler);
          if (set.size === 0) {
            buttonHandlers.delete(key);
            buttonState.delete(key);
          }
        });
      };
    },
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      directionHandlers.clear();
      pauseHandlers.clear();
      restartHandlers.clear();
      buttonHandlers.clear();
      buttonState.clear();
    },
  };
}

