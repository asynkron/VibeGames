export function mixColor(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bVal = Math.round(b1 + (b2 - b1) * t);
  return rgbToHex(r, g, bVal);
}

export function shadeColor(hex, intensity) {
  const [r, g, b] = hexToRgb(hex);
  const target = intensity >= 0 ? 255 : 0;
  const amount = Math.min(Math.abs(intensity), 1);
  const newR = Math.round(r + (target - r) * amount);
  const newG = Math.round(g + (target - g) * amount);
  const newB = Math.round(b + (target - b) * amount);
  return rgbToHex(newR, newG, newB);
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("")}`;
}
