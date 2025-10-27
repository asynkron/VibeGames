export function clamp(value, min, max) {
  if (max < min) {
    [min, max] = [max, min];
  }
  return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
