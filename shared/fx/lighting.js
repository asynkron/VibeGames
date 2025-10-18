const clamp01 = v => Math.min(1, Math.max(0, v));

export function applyAmbientLighting({
  ctx,
  width,
  height,
  ambient = 0,
  sources = [],
  sourceCanvas = null,
}) {
  if (!ctx || ambient <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = clamp01(ambient);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  if (sources.length) {
    ctx.globalCompositeOperation = 'destination-out';
    for (const source of sources) {
      const radius = source.radius ?? 0;
      const inner = Math.max(0, source.innerRadius ?? 0);
      if (radius <= 0) continue;
      const gradient = ctx.createRadialGradient(
        source.x,
        source.y,
        inner,
        source.x,
        source.y,
        radius,
      );
      const stopInner = clamp01(source.innerStop ?? 0);
      gradient.addColorStop(stopInner, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(source.x, source.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sourceCanvas) {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(sourceCanvas, 0, 0);
    }
  }
  ctx.restore();
}
