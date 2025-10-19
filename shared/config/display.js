// Shared display defaults derived from Pac-Man so every game starts from
// the same pixel density, CRT tuning, and HUD font.
export const DEFAULT_TILE_SIZE = 8;

export const DEFAULT_FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
export const DEFAULT_OVERLAY_FONT = `bold 16px ${DEFAULT_FONT_STACK}`;

const CRT_SETTINGS_BASE = {
  enabled: true,
  warp: 0.08,
  aberration: 0.05,
  aberrationOpacity: 0.45,
  scanlines: 0.45,
};

export const DEFAULT_SCANLINE_ALPHA_RANGE = Object.freeze([0.04, 0.24]);

export function createDefaultCrtSettings(overrides = {}) {
  // Each caller can tweak individual knobs without mutating the shared template.
  return {
    ...CRT_SETTINGS_BASE,
    ...overrides,
  };
}

export function getDefaultOverlayFont() {
  return DEFAULT_OVERLAY_FONT;
}
