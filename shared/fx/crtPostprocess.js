// Lightweight canvas post-processor that applies CRT-inspired warp and
// chromatic aberration. Designed to be reusable across games that render to a
// 2D canvas.

function clamp01(value) {
  const v = Number.isFinite(value) ? value : 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function disableSmoothing(ctx) {
  if (!ctx) return;
  if ('imageSmoothingEnabled' in ctx) ctx.imageSmoothingEnabled = false;
  if ('mozImageSmoothingEnabled' in ctx) ctx.mozImageSmoothingEnabled = false;
  if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = false;
  if ('msImageSmoothingEnabled' in ctx) ctx.msImageSmoothingEnabled = false;
}

export function createCrtPostProcessor({
  targetContext,
  defaultSource,
  settings,
  maxStripCount = 64,
} = {}) {
  if (!targetContext) {
    throw new Error('createCrtPostProcessor: targetContext is required');
  }

  const target = targetContext.canvas;
  const buffer = document.createElement('canvas');
  const bufferCtx = buffer.getContext('2d');
  disableSmoothing(targetContext);
  disableSmoothing(bufferCtx);

  let sourceCanvas = defaultSource || null;

  const ensureBufferSize = () => {
    const w = target.width;
    const h = target.height;
    if (buffer.width !== w) buffer.width = w;
    if (buffer.height !== h) buffer.height = h;
  };

  const captureTarget = () => {
    ensureBufferSize();
    bufferCtx.save();
    bufferCtx.setTransform(1, 0, 0, 1, 0, 0);
    bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
    bufferCtx.drawImage(target, 0, 0, buffer.width, buffer.height);
    bufferCtx.restore();
    return buffer;
  };

  const drawWarped = ({ source, dx = 0, tint = null, alpha = 1, warpStrength = 0 }) => {
    const width = target.width;
    const height = target.height;
    if (!width || !height) return;

    const strips = Math.max(1, Math.min(maxStripCount, Math.round(width / 4)));
    const stripWidth = width / strips;
    const maxOffset = warpStrength * (width * 0.05 + 6);
    const extraScale = warpStrength * 0.3;

    targetContext.save();
    targetContext.globalAlpha = tint ? Math.max(0, Math.min(1, alpha)) : 1;
    targetContext.globalCompositeOperation = tint ? 'lighter' : 'source-over';

    if (warpStrength <= 0.0001) {
      targetContext.drawImage(source, dx, 0, width, height);
    } else {
      for (let i = 0; i < strips; i += 1) {
        const sx = i * stripWidth;
        const sw = i === strips - 1 ? width - sx : stripWidth;
        if (sw <= 0) continue;
        const u = (sx + sw * 0.5) / width;
        const centered = (u - 0.5) * 2; // -1..1
        const curve = centered * centered;
        const direction = centered < 0 ? 1 : -1;
        const inward = curve * maxOffset * direction;
        const destX = sx + dx + inward;
        const destW = sw + curve * maxOffset * extraScale;
        targetContext.drawImage(source, sx, 0, sw, height, destX, 0, Math.max(0.5, destW), height);
      }
    }

    if (tint) {
      targetContext.globalCompositeOperation = 'source-atop';
      targetContext.fillStyle = tint;
      targetContext.fillRect(0, 0, width, height);
    }

    targetContext.restore();
  };

  const render = ({ overlays = [], sourceCanvas: overrideSource } = {}) => {
    const width = target.width;
    const height = target.height;
    if (!width || !height) return;

    const baseSource = overrideSource
      || sourceCanvas
      || captureTarget();
    if (!baseSource) return;

    const enabled = settings ? settings.enabled !== false : true;
    const warpStrength = enabled ? clamp01(settings?.warp ?? 0) : 0;
    const aberration = enabled ? clamp01(settings?.aberration ?? 0) : 0;

    const overlayList = Array.isArray(overlays) ? [...overlays] : [];
    if (aberration > 0.001) {
      const shift = aberration * Math.min(8, width * 0.025 + 1.5);
      const alpha = Math.min(1, 0.35 + aberration * 0.45);
      overlayList.push({ dx: shift, tint: 'rgba(255, 80, 80, 0.95)', alpha });
      overlayList.push({ dx: -shift, tint: 'rgba(80, 255, 255, 0.9)', alpha });
    }

    targetContext.save();
    targetContext.setTransform(1, 0, 0, 1, 0, 0);
    targetContext.clearRect(0, 0, width, height);

    drawWarped({ source: baseSource, warpStrength });

    for (const overlay of overlayList) {
      const dx = overlay?.dx ?? overlay?.offsetX ?? overlay?.offset ?? 0;
      const tint = overlay?.tint ?? overlay?.color ?? null;
      const alpha = overlay?.alpha ?? overlay?.opacity ?? 0.5;
      drawWarped({ source: baseSource, dx, tint, alpha, warpStrength });
    }

    targetContext.restore();
  };

  return {
    render,
    setDefaultSource(next) {
      sourceCanvas = next || null;
    },
    getDefaultSource() {
      return sourceCanvas;
    },
  };
}

