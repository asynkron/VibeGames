import { clamp01 } from '../utils/math.js';

let ambientBuffer = null;
let ambientCtx = null;

// Keep a reusable off-screen canvas so carving the ambient mask does not
// disturb the already-rendered scene. This fixes the issue where sprites were
// being cleared along with the darkness overlay.
function ensureAmbientBuffer(width, height) {
  if (!ambientBuffer) {
    ambientBuffer = document.createElement('canvas');
    ambientCtx = ambientBuffer.getContext('2d');
  }
  if (ambientBuffer.width !== width) ambientBuffer.width = width;
  if (ambientBuffer.height !== height) ambientBuffer.height = height;
  return ambientCtx;
}

export function applyAmbientLighting({
  ctx,
  width,
  height,
  ambient = 0,
  sources = [],
  sourceCanvas = null,
  sourceCanvasIsLightBuffer = false,
}) {
  if (!ctx) return;

  const ambientAmount = clamp01(ambient);
  const hasAmbient = ambientAmount > 0;
  const hasLights = Array.isArray(sources) && sources.length > 0;

  if (!hasAmbient && !hasLights) return;

  let bufferCtx = null;
  if (hasAmbient) {
    bufferCtx = ensureAmbientBuffer(width, height);
    if (!bufferCtx) return;

    bufferCtx.save();
    bufferCtx.globalCompositeOperation = 'source-over';
    bufferCtx.clearRect(0, 0, width, height);
    bufferCtx.globalAlpha = ambientAmount;
    bufferCtx.fillStyle = '#000';
    bufferCtx.fillRect(0, 0, width, height);
    bufferCtx.restore();

    if (hasLights) {
      bufferCtx.save();
      bufferCtx.globalCompositeOperation = 'destination-out';
      for (const source of sources) {
        const radius = source?.radius ?? 0;
        if (radius <= 0) continue;
        const inner = Math.max(0, source?.innerRadius ?? 0);
        const gradient = bufferCtx.createRadialGradient(
          source.x,
          source.y,
          inner,
          source.x,
          source.y,
          radius,
        );
        const stopInner = clamp01(source?.innerStop ?? 0);
        gradient.addColorStop(stopInner, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        bufferCtx.fillStyle = gradient;
        bufferCtx.beginPath();
        bufferCtx.arc(source.x, source.y, radius, 0, Math.PI * 2);
        bufferCtx.fill();
      }
      bufferCtx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(ambientBuffer, 0, 0);
    ctx.restore();
  }

  if (!hasLights) return;

  ctx.save();
  // Blend light sources additively so they bloom over the scene instead of
  // darkening it further.
  ctx.globalCompositeOperation = 'lighter';
  if (sourceCanvas && sourceCanvasIsLightBuffer) {
    ctx.drawImage(sourceCanvas, 0, 0);
  } else {
    for (const source of sources) {
      const radius = source?.radius ?? 0;
      if (radius <= 0) continue;
      const inner = Math.max(0, source?.innerRadius ?? 0);
      const gradient = ctx.createRadialGradient(
        source.x,
        source.y,
        inner,
        source.x,
        source.y,
        radius,
      );
      const color = source?.color ?? 'rgba(255,255,255,0.4)';
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(source.x, source.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
