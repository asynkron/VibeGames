export function createToastManager({
  easing = t => t,
  font = '6px monospace',
  align = 'center',
  baseline = 'middle',
} = {}) {
  const toasts = [];

  function add({ text, x, y, color = '#fff', duration = 800 }) {
    toasts.push({ text, x, y, color, duration, start: performance.now() });
  }

  function draw(ctx, now = performance.now()) {
    if (!ctx || !toasts.length) return;
    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.font = font;
    for (let i = toasts.length - 1; i >= 0; i--) {
      const toast = toasts[i];
      const progress = Math.min(Math.max((now - toast.start) / toast.duration, 0), 1);
      const eased = easing(progress);
      const dy = -6 * eased;
      const alpha = 1 - progress;

      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.25})`;
      ctx.fillText(toast.text, toast.x + 1, toast.y + dy + 1);
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
      ctx.fillText(toast.text, toast.x, toast.y + dy + 0.5);
      ctx.fillStyle = toast.color;
      ctx.fillText(toast.text, toast.x, toast.y + dy);

      if (progress >= 1) {
        toasts.splice(i, 1);
      }
    }
    ctx.restore();
  }

  function clear() {
    toasts.length = 0;
  }

  return { add, draw, clear, get size() { return toasts.length; } };
}
