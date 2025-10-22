// Math helpers shared across the mini-games.
// Centralizing these ensures consistent clamping behaviour everywhere.

/**
 * Clamps a number to the provided range.
 */
export function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Convenience clamp for values expected to live in [0, 1].
 */
export function clamp01(value) {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1);
}
