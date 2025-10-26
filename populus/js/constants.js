// Shared configuration for the Populus sandbox.
const MAP_CONFIG = {
  ROWS: 48,
  COLS: 48,
  HEX_RADIUS: 1,
  CAMERA: {
    INITIAL_HEIGHT: 18,
    MIN_HEIGHT: 6,
    MAX_HEIGHT: 60,
    ZOOM_SPEED: 1.5,
  },
  MINIMAP: {
    WIDTH: 260,
    HEIGHT: 260,
  },
};

const TERRAIN_CONFIG = {
  PERLIN_SCALE: 10,
  VALLEY_OFFSET: 2.2,
  HEIGHT_SCALE: 8,
};

const VISUAL_OFFSETS = {
  HIGHLIGHT_OFFSET: 0.18,
};

const HIGHLIGHT_COLORS = {
  CURSOR: 0x00bcd4,
  SELECTION: 0xff9800,
};

const WATER_FOAM_COLOR = 0x236da6;
const CRATER_COLOR = 0x3a2b1b;
