// Small helper that keeps FPS text nodes in sync across games.
// Call frame(now) from a requestAnimationFrame loop.

const DEFAULT_INTERVAL = 500;
const DEFAULT_FORMATTER = (fps) => `${fps} FPS`;

export function createFpsCounter({ element = null, intervalMs = DEFAULT_INTERVAL, formatter = DEFAULT_FORMATTER } = {}) {
  let target = element || null;
  let interval = Number.isFinite(intervalMs) && intervalMs > 16 ? intervalMs : DEFAULT_INTERVAL;
  let format = typeof formatter === 'function' ? formatter : DEFAULT_FORMATTER;
  let frameCount = 0;
  let windowStart = null;

  const write = (text) => {
    if (target) target.textContent = text;
  };

  const resetWindow = () => {
    frameCount = 0;
    windowStart = null;
  };

  return {
    frame(now) {
      frameCount += 1;
      if (windowStart === null) {
        windowStart = now;
        return;
      }
      const elapsed = now - windowStart;
      if (elapsed < interval) return;
      const fps = Math.max(0, Math.round((frameCount * 1000) / (elapsed || 1)));
      write(format(fps));
      frameCount = 0;
      windowStart = now;
    },
    reset() {
      write('');
      resetWindow();
    },
    setElement(next) {
      target = next || null;
      this.reset();
    },
    setFormatter(nextFormatter) {
      format = typeof nextFormatter === 'function' ? nextFormatter : DEFAULT_FORMATTER;
      this.reset();
    },
    setInterval(nextIntervalMs) {
      if (Number.isFinite(nextIntervalMs) && nextIntervalMs > 0) {
        interval = nextIntervalMs;
      } else {
        interval = DEFAULT_INTERVAL;
      }
      resetWindow();
    },
  };
}
