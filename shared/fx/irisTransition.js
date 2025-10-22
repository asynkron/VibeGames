import { clamp01 } from '../utils/math.js';
const defaultEase = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Creates an "iris" style screen transition that can be shared by any game.
 * Draw the game scene first, then call draw(now) to mask it with a shrinking or expanding circle.
 */
export function createIrisTransition({
  ctx,
  width,
  height,
  defaultDuration = 900,
  coverColor = 'rgba(0,0,0,1)',
  getCenter = () => ({ x: width / 2, y: height / 2 }),
  easing = defaultEase,
} = {}) {
  const bounds = { width, height };
  const state = {
    active: false,
    type: 'in',
    start: 0,
    duration: defaultDuration,
    coverColor,
    easing,
    getCenter,
    maxRadius: null,
  };

  function setBounds({ width: nextWidth, height: nextHeight }) {
    if (typeof nextWidth === 'number') bounds.width = nextWidth;
    if (typeof nextHeight === 'number') bounds.height = nextHeight;
  }

  function start(type = 'in', duration = defaultDuration, options = {}) {
    let resolvedDuration = duration;
    let resolvedOptions = options;
    if (typeof duration === 'object' && duration !== null) {
      resolvedOptions = duration;
      resolvedDuration = resolvedOptions.duration ?? defaultDuration;
    }

    state.active = true;
    state.type = type;
    state.start = performance.now();
    state.duration = resolvedOptions.duration ?? resolvedDuration ?? defaultDuration;
    state.coverColor = resolvedOptions.coverColor ?? coverColor;
    state.easing = resolvedOptions.easing ?? easing;
    state.getCenter = resolvedOptions.getCenter ?? getCenter;
    state.maxRadius = resolvedOptions.maxRadius ?? Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);
  }

  function stop() {
    state.active = false;
  }

  function draw(now = performance.now()) {
    if (!ctx || !state.active) return;

    const elapsed = now - state.start;
    const progress = clamp01(state.duration > 0 ? elapsed / state.duration : 1);
    const eased = clamp01(state.easing ? state.easing(progress) : progress);

    const maxRadius = state.maxRadius ?? Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);
    const radius = state.type === 'in' ? eased * maxRadius : (1 - eased) * maxRadius;

    if (state.type === 'in' && progress >= 1) {
      state.active = false;
      return;
    }

    ctx.save();
    ctx.fillStyle = state.coverColor;
    ctx.beginPath();
    ctx.rect(0, 0, bounds.width, bounds.height);

    const { x: cx, y: cy } = state.getCenter ? state.getCenter(bounds) : getCenter(bounds);
    const safeRadius = Math.max(0, radius);

    if (safeRadius <= 0 && state.type === 'out') {
      ctx.fill();
      ctx.restore();
      if (progress >= 1) {
        state.active = false;
      }
      return;
    }

    ctx.moveTo(cx + safeRadius, cy);
    ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();

    if (progress >= 1) {
      state.active = false;
    }
  }

  function isActive() {
    return state.active;
  }

  return { start, draw, stop, isActive, setBounds };
}
