const clamp01 = v => Math.min(1, Math.max(0, v));

export function rgbaFromHex(hex, alpha = 1) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
}

export function drawRadialGlow(ctx, {
  x,
  y,
  radius,
  innerRadius = 0,
  stops,
  composite = 'lighter',
  alpha = 1,
}) {
  if (!ctx || !radius || !stops || !stops.length) return;
  ctx.save();
  if (composite) ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);
  for (const { offset, color } of stops) {
    gradient.addColorStop(offset, color);
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGlowBatch(ctx, glows = [], options = {}) {
  if (!glows.length) return;
  const { composite = 'lighter', alpha = 1 } = options;
  ctx.save();
  if (composite) ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = alpha;
  for (const glow of glows) {
    const gradient = ctx.createRadialGradient(
      glow.x,
      glow.y,
      glow.innerRadius ?? 0,
      glow.x,
      glow.y,
      glow.radius,
    );
    for (const { offset, color } of glow.stops) {
      gradient.addColorStop(offset, color);
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(glow.x, glow.y, glow.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
