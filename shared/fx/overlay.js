import { clamp01 } from '../utils/math.js';
import { createIrisTransition } from './irisTransition.js';

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

export function createOverlayFX({ ctx, width, height }) {
  let boundsWidth = typeof width === 'number' ? width : ctx?.canvas?.width ?? 0;
  let boundsHeight = typeof height === 'number' ? height : ctx?.canvas?.height ?? 0;

  const shock = {
    active: false,
    x: 0,
    y: 0,
    start: 0,
    duration: 450,
    innerRadius: 12,
    expandTo: Math.max(boundsWidth, boundsHeight),
    colorStops: [
      [0, 'rgba(180,180,255,0)'],
      [0.5, 'rgba(200,200,255,0.25)'],
      [1, 'rgba(180,180,255,0)'],
    ],
  };

  const flash = { until: 0, strength: 0.18, duration: 200 };
  const iris = createIrisTransition({ ctx, width: boundsWidth, height: boundsHeight });

  function setBounds({ width: nextWidth, height: nextHeight } = {}) {
    let changed = false;
    if (typeof nextWidth === 'number' && Number.isFinite(nextWidth) && nextWidth >= 0) {
      boundsWidth = nextWidth;
      changed = true;
    }
    if (typeof nextHeight === 'number' && Number.isFinite(nextHeight) && nextHeight >= 0) {
      boundsHeight = nextHeight;
      changed = true;
    }
    if (changed) {
      shock.expandTo = Math.max(boundsWidth, boundsHeight);
      iris.setBounds({ width: boundsWidth, height: boundsHeight });
    }
  }

  function startShockwave(x, y, options = {}) {
    Object.assign(shock, {
      active: true,
      x,
      y,
      start: performance.now(),
      duration: options.duration ?? shock.duration,
      innerRadius: options.innerRadius ?? shock.innerRadius,
      expandTo: options.expandTo ?? Math.max(boundsWidth, boundsHeight),
      colorStops: options.colorStops ?? shock.colorStops,
    });
  }

  function getShockInfo() {
    return { active: shock.active, start: shock.start, duration: shock.duration };
  }

  function drawShockwave(now = performance.now()) {
    if (!shock.active || !ctx) return;
    const t = (now - shock.start) / shock.duration;
    if (t >= 1) {
      shock.active = false;
      return;
    }
    const eased = easeOutCubic(clamp01(t));
    const radius = shock.innerRadius + eased * shock.expandTo;
    const gradient = ctx.createRadialGradient(shock.x, shock.y, Math.max(0, radius - 6), shock.x, shock.y, radius + 6);
    for (const [offset, color] of shock.colorStops) {
      gradient.addColorStop(offset, color);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(shock.x, shock.y, radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function screenFlash({ duration = 200, strength = 0.18 } = {}) {
    flash.until = performance.now() + duration;
    flash.strength = strength;
    flash.duration = duration;
  }

  function drawFlash(now = performance.now()) {
    if (!ctx || now >= flash.until) return;
    const remaining = flash.until - now;
    const alpha = flash.strength * clamp01(remaining / flash.duration);
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, boundsWidth, boundsHeight);
    ctx.restore();
  }

  function startIris(type = 'in', duration = 900, options = {}) {
    iris.start(type, duration, options);
  }

  function drawIris(now = performance.now()) {
    iris.draw(now);
  }

  return {
    startShockwave,
    drawShockwave,
    screenFlash,
    drawFlash,
    startIris,
    drawIris,
    getShockInfo,
    setBounds,
  };
}

export { createIrisTransition } from './irisTransition.js';
