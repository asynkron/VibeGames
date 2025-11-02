/**
 * Gravibe Color Helper
 * Generates neon colors based on string hashing for consistent color assignment.
 */

/**
 * Simple hash function to convert a string to a number
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
  let hash = 0;
  if (!str || str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a neon color from a service name.
 * Uses HSL color space with high saturation and brightness for neon effect.
 * @param {string} serviceName
 * @returns {string} HSL color string, e.g., "hsl(180, 85%, 65%)"
 */
export function generateServiceColor(serviceName) {
  if (!serviceName || typeof serviceName !== "string") {
    serviceName = "unknown-service";
  }

  const hash = hashString(serviceName);
  // Use modulo 360 to get hue (0-359 degrees on color wheel)
  const hue = hash % 360;

  // Neon colors need high saturation and medium-high lightness
  // Saturation: 75-95% for vibrant colors
  // Lightness: 55-70% for neon glow effect
  const saturation = 75 + (hash % 20); // 75-95%
  const lightness = 55 + (hash % 15);  // 55-70%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Converts HSL color to RGB string for use in CSS rgb() or rgba()
 * @param {string} hslColor - HSL color string, e.g., "hsl(180, 85%, 65%)"
 * @returns {string} RGB color string, e.g., "rgb(45, 234, 237)"
 */
export function hslToRgb(hslColor) {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) {
    return "rgb(97, 175, 239)"; // Fallback to accent-primary
  }

  const h = Number.parseInt(match[1], 10) / 360;
  const s = Number.parseInt(match[2], 10) / 100;
  const l = Number.parseInt(match[3], 10) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/**
 * Generates a neon color in RGB format for use with CSS rgb() or rgba()
 * @param {string} serviceName
 * @returns {string} RGB color string, e.g., "rgb(45, 234, 237)"
 */
export function generateServiceColorRgb(serviceName) {
  const hslColor = generateServiceColor(serviceName);
  return hslToRgb(hslColor);
}

