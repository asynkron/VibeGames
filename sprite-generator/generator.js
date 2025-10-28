import { computeWingPlanform } from "./renderParts.js";
import { clamp } from "./math.js";
import { mixColor } from "./color.js";
import { drawTopDownSpaceship } from "./renderTopView.js";
import { drawSideViewSpaceship } from "./renderSideView.js";
import { initializeGeometry } from "./geometry.js";
import { isDebugColorsEnabled } from "./renderContext.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const NORMALISED_HULL_LENGTH = 100;

// Category metadata expressed entirely in hull-relative percentages so generation logic
// never depends on legacy absolute measurements.
const CATEGORY_DEFINITIONS = {
  fighter: {
    label: "Fighter",
    description: "Aggressive interceptors with sharp silhouettes and agile control surfaces.",
    wingStyles: ["delta", "swept", "forward"],
    ranges: {
      body_start: 0,
      body_end: 100,
      bodyWidthPercent: [21.33, 35.0],
      bodyMidInsetPercent: [6.67, 18.33],
      noseCurvePercent: [12.0, 25.0],
      tailCurvePercent: [10.67, 21.67],
      noseWidthFactor: [0.32, 0.45],
      tailWidthFactor: [0.48, 0.64],
      cockpitWidthPercent: [18.67, 30.0],
      cockpitHeightPercent: [12.0, 21.67],
      cockpit_center_start: 46.0,
      cockpit_center_end: 55.0,
      engineCount: [1, 2],
      engineSizePercent: [12.0, 23.33],
      engineSpacingPercent: [18.67, 36.67],
      nozzlePercent: [13.33, 26.67],
      wingSpanPercent: [34.67, 58.33],
      wingSweepPercent: [17.33, 33.33],
      wingForwardPercent: [5.33, 15.0],
      wingThicknessPercent: [8.0, 15.0],
      wing_attach_start: 46.0,
      wing_attach_end: 55.0,
      wingDihedralPercent: [-4.0, 11.67],
      finCount: [1, 2],
      finHeightPercent: [21.33, 43.33],
      finWidthPercent: [6.67, 15.0],
      stripeStartPercent: [12.0, 31.67],
    },
    features: {
      topFinProbability: 0.7,
      sideFinProbability: 0.45,
      bottomFinProbability: 0.25,
      platingProbability: 0.6,
      stripeProbability: 0.55,
      antennaProbability: 0.35,
      wingTipAccentProbability: 0.7,
      winglessProbability: 0.12,
      aftWingProbability: 0.38,
    },
  },
  freight: {
    label: "Freight",
    description: "Bulky haulers with reinforced hulls and multiple engines.",
    wingStyles: ["broad", "box"],
    ranges: {
      body_start: 0,
      body_end: 100,
      bodyWidthPercent: [21.05, 34.67],
      bodyMidInsetPercent: [2.11, 8.0],
      noseCurvePercent: [5.26, 12.0],
      tailCurvePercent: [11.58, 24.0],
      noseWidthFactor: [0.5, 0.65],
      tailWidthFactor: [0.6, 0.78],
      cockpitWidthPercent: [15.79, 26.67],
      cockpitHeightPercent: [8.42, 14.67],
      cockpit_center_start: 52.11,
      cockpit_center_end: 60.67,
      engineCount: [2, 4],
      engineSizePercent: [10.53, 18.67],
      engineSpacingPercent: [17.89, 33.33],
      nozzlePercent: [12.63, 24.0],
      wingSpanPercent: [21.05, 38.67],
      wingSweepPercent: [6.32, 16.0],
      wingForwardPercent: [2.11, 8.0],
      wingThicknessPercent: [9.47, 17.33],
      wing_attach_start: 56.32,
      wing_attach_end: 67.33,
      wingDihedralPercent: [-2.11, 5.33],
      finCount: [2, 3],
      finHeightPercent: [12.63, 25.33],
      finWidthPercent: [6.32, 14.67],
      stripeStartPercent: [16.84, 37.33],
    },
    features: {
      topFinProbability: 0.45,
      sideFinProbability: 0.6,
      bottomFinProbability: 0.4,
      platingProbability: 0.85,
      stripeProbability: 0.4,
      antennaProbability: 0.2,
      wingTipAccentProbability: 0.35,
      winglessProbability: 0.05,
      aftWingProbability: 0.25,
    },
  },
  transport: {
    label: "Transport",
    description: "Versatile shuttles balancing passenger pods and engine pods.",
    wingStyles: ["swept", "ladder", "split"],
    ranges: {
      body_start: 0,
      body_end: 100,
      bodyWidthPercent: [20.0, 35.38],
      bodyMidInsetPercent: [3.53, 12.31],
      noseCurvePercent: [8.24, 18.46],
      tailCurvePercent: [9.41, 21.54],
      noseWidthFactor: [0.38, 0.55],
      tailWidthFactor: [0.55, 0.7],
      cockpitWidthPercent: [15.29, 26.15],
      cockpitHeightPercent: [10.59, 18.46],
      cockpit_center_start: 48.82,
      cockpit_center_end: 57.69,
      engineCount: [2, 3],
      engineSizePercent: [10.59, 20.0],
      engineSpacingPercent: [17.65, 33.85],
      nozzlePercent: [11.76, 24.62],
      wingSpanPercent: [28.24, 49.23],
      wingSweepPercent: [10.59, 24.62],
      wingForwardPercent: [3.53, 12.31],
      wingThicknessPercent: [8.24, 15.38],
      wing_attach_start: 50.0,
      wing_attach_end: 62.31,
      wingDihedralPercent: [-1.18, 9.23],
      finCount: [1, 2],
      finHeightPercent: [16.47, 33.85],
      finWidthPercent: [7.06, 15.38],
      stripeStartPercent: [11.76, 33.85],
    },
    features: {
      topFinProbability: 0.55,
      sideFinProbability: 0.35,
      bottomFinProbability: 0.35,
      platingProbability: 0.65,
      stripeProbability: 0.5,
      antennaProbability: 0.3,
      wingTipAccentProbability: 0.5,
      winglessProbability: 0.08,
      aftWingProbability: 0.3,
    },
  },
  drone: {
    label: "Drone",
    description: "Compact unmanned craft with exposed thrusters and sensor pods.",
    wingStyles: ["delta", "box", "ladder"],
    ranges: {
      body_start: 0,
      body_end: 100,
      bodyWidthPercent: [23.33, 40.0],
      bodyMidInsetPercent: [6.67, 20.0],
      noseCurvePercent: [8.33, 24.44],
      tailCurvePercent: [8.33, 26.67],
      noseWidthFactor: [0.4, 0.58],
      tailWidthFactor: [0.5, 0.7],
      cockpitWidthPercent: [13.33, 26.67],
      cockpitHeightPercent: [10.0, 20.0],
      cockpit_center_start: 41.67,
      cockpit_center_end: 54.44,
      engineCount: [3, 5],
      engineSizePercent: [11.67, 24.44],
      engineSpacingPercent: [16.67, 35.56],
      nozzlePercent: [11.67, 26.67],
      wingSpanPercent: [26.67, 53.33],
      wingSweepPercent: [8.33, 24.44],
      wingForwardPercent: [1.67, 11.11],
      wingThicknessPercent: [10.0, 20.0],
      wing_attach_start: 41.67,
      wing_attach_end: 54.44,
      wingDihedralPercent: [-10.0, 6.67],
      finCount: [0, 2],
      finHeightPercent: [15.0, 35.56],
      finWidthPercent: [6.67, 17.78],
      stripeStartPercent: [10.0, 28.89],
    },
    features: {
      topFinProbability: 0.35,
      sideFinProbability: 0.5,
      bottomFinProbability: 0.55,
      platingProbability: 0.5,
      stripeProbability: 0.35,
      antennaProbability: 0.55,
      wingTipAccentProbability: 0.45,
      winglessProbability: 0.3,
      aftWingProbability: 0.2,
    },
  },
};

// Style-specific multipliers keep the hull shaping data-driven rather than hard-coded logic.
const FRONT_STYLE_ADJUSTMENTS = {
  normal: {
    weight: [0.96, 1.08],
    tipWidthFactor: [0.9, 1.08],
    shoulderWidthFactor: [0.94, 1.08],
    curve: [0.94, 1.08],
  },
  skinny: {
    weight: [1.08, 1.22],
    tipWidthFactor: [0.72, 0.85],
    shoulderWidthFactor: [0.88, 0.96],
    transitionFactor: [0.9, 1.05],
    curve: [1.08, 1.22],
  },
  bulky: {
    weight: [0.92, 1.05],
    tipWidthFactor: [1.18, 1.32],
    shoulderWidthFactor: [1.08, 1.2],
    transitionFactor: [1.02, 1.18],
    curve: [0.86, 0.98],
  },
};

const MID_STYLE_ADJUSTMENTS = {
  normal: {
    weight: [0.98, 1.12],
    waistWidthFactor: [0.94, 1.08],
    bellyWidthFactor: [0.96, 1.12],
    trailingWidthFactor: [0.94, 1.08],
    inset: [0.96, 1.08],
  },
  skinny: {
    weight: [0.92, 1.05],
    waistWidthFactor: [0.78, 0.9],
    bellyWidthFactor: [0.82, 0.92],
    trailingWidthFactor: [0.82, 0.94],
    inset: [1.12, 1.28],
    waistPosition: [0.9, 1.05],
    bellyPosition: [0.95, 1.08],
  },
  bulky: {
    weight: [1.08, 1.2],
    waistWidthFactor: [1.08, 1.2],
    bellyWidthFactor: [1.18, 1.32],
    trailingWidthFactor: [1.12, 1.26],
    inset: [0.72, 0.92],
    waistPosition: [0.95, 1.1],
    bellyPosition: [1.0, 1.12],
  },
};

const REAR_STYLE_ADJUSTMENTS = {
  normal: {
    weight: [0.96, 1.1],
    baseWidthFactor: [0.96, 1.08],
    exhaustWidthFactor: [0.92, 1.05],
    tailWidthFactor: [0.96, 1.08],
  },
  skinny: {
    weight: [0.92, 1.05],
    baseWidthFactor: [0.82, 0.94],
    exhaustWidthFactor: [0.78, 0.9],
    tailWidthFactor: [0.78, 0.92],
    curve: [1.0, 1.14],
  },
  bulky: {
    weight: [1.08, 1.22],
    baseWidthFactor: [1.16, 1.3],
    exhaustWidthFactor: [1.05, 1.2],
    tailWidthFactor: [1.08, 1.24],
    curve: [0.9, 1.05],
  },
};

const COLOR_PALETTES = [
  {
    name: "Photon Ember",
    primary: "#28395a",
    secondary: "#142035",
    accent: "#f9813a",
    trim: "#fcd34d",
    cockpit: "#7ed4ff",
    glow: "#fbbf24",
  },
  {
    name: "Vanta Bloom",
    primary: "#1b1f3b",
    secondary: "#0d1321",
    accent: "#90cdf4",
    trim: "#f0f4ff",
    cockpit: "#a5f3fc",
    glow: "#7dd3fc",
  },
  {
    name: "Nebula Forge",
    primary: "#302b63",
    secondary: "#1a1446",
    accent: "#e94560",
    trim: "#ffd166",
    cockpit: "#8ec5ff",
    glow: "#ff9d5c",
  },
  {
    name: "Aurora Relay",
    primary: "#254d6b",
    secondary: "#12263a",
    accent: "#5eead4",
    trim: "#f0fdfa",
    cockpit: "#9ae6b4",
    glow: "#34d399",
  },
  {
    name: "Solar Courier",
    primary: "#49392c",
    secondary: "#2d221c",
    accent: "#fbbf24",
    trim: "#fde68a",
    cockpit: "#fef3c7",
    glow: "#fcd34d",
  },
  {
    name: "Ion Drift",
    primary: "#1c2f35",
    secondary: "#0f1b21",
    accent: "#5bbaed",
    trim: "#a5f3fc",
    cockpit: "#bae6fd",
    glow: "#38bdf8",
  },
  {
    name: "Crimson Carrier",
    primary: "#3b1f2b",
    secondary: "#200912",
    accent: "#f472b6",
    trim: "#fbcfe8",
    cockpit: "#fce7f3",
    glow: "#fb7185",
  },
  {
    name: "Verdant Relay",
    primary: "#27413c",
    secondary: "#11211d",
    accent: "#4ade80",
    trim: "#bbf7d0",
    cockpit: "#86efac",
    glow: "#34d399",
  },
];

// Predefined segment variants let the fuselage be assembled from mix-and-match
// shapes instead of a single profile, giving the generator a wider silhouette
// vocabulary without rewriting the downstream consumers that still expect
// aggregate body measurements.
const FRONT_SEGMENT_VARIANTS = [
  {
    type: "needle",
    lengthWeightRange: [0.3, 0.42],
    tipWidthFactorRange: [0.05, 0.1],
    shoulderWidthFactorRange: [0.9, 1.08],
    transitionFactorRange: [0.66, 0.84],
    curveRange: [28, 40],
  },
  {
    type: "canopy",
    lengthWeightRange: [0.18, 0.24],
    tipWidthFactorRange: [0.32, 0.48],
    shoulderWidthFactorRange: [1.02, 1.18],
    transitionFactorRange: [0.85, 1.05],
    curveRange: [12, 20],
  },
  {
    type: "ram",
    lengthWeightRange: [0.22, 0.3],
    tipWidthFactorRange: [0.2, 0.3],
    shoulderWidthFactorRange: [0.96, 1.1],
    transitionFactorRange: [0.78, 0.96],
    curveRange: [16, 26],
  },
];

const MID_SEGMENT_VARIANTS = [
  {
    type: "slim",
    lengthWeightRange: [0.38, 0.46],
    waistWidthFactorRange: [0.7, 0.82],
    bellyWidthFactorRange: [0.84, 0.96],
    trailingWidthFactorRange: [0.8, 0.92],
    waistPositionRange: [0.28, 0.4],
    bellyPositionRange: [0.62, 0.78],
    insetRange: [12, 20],
  },
  {
    type: "bulwark",
    lengthWeightRange: [0.34, 0.42],
    waistWidthFactorRange: [1.06, 1.2],
    bellyWidthFactorRange: [1.22, 1.36],
    trailingWidthFactorRange: [1.14, 1.28],
    waistPositionRange: [0.32, 0.46],
    bellyPositionRange: [0.68, 0.86],
    insetRange: [6, 12],
  },
  {
    type: "modular",
    lengthWeightRange: [0.36, 0.48],
    waistWidthFactorRange: [0.82, 0.96],
    bellyWidthFactorRange: [1.0, 1.16],
    trailingWidthFactorRange: [0.92, 1.08],
    waistPositionRange: [0.3, 0.45],
    bellyPositionRange: [0.58, 0.8],
    insetRange: [8, 16],
  },
];

const REAR_SEGMENT_VARIANTS = [
  {
    type: "tapered",
    lengthWeightRange: [0.26, 0.34],
    baseWidthFactorRange: [0.92, 1.04],
    exhaustWidthFactorRange: [0.64, 0.76],
    tailWidthFactorRange: [0.46, 0.58],
    exhaustPositionRange: [0.52, 0.7],
    curveRange: [16, 24],
  },
  {
    type: "thruster",
    lengthWeightRange: [0.24, 0.3],
    baseWidthFactorRange: [1.16, 1.3],
    exhaustWidthFactorRange: [0.86, 1.02],
    tailWidthFactorRange: [0.6, 0.74],
    exhaustPositionRange: [0.62, 0.84],
    curveRange: [18, 30],
  },
  {
    type: "block",
    lengthWeightRange: [0.28, 0.36],
    baseWidthFactorRange: [1.2, 1.34],
    exhaustWidthFactorRange: [0.84, 0.98],
    tailWidthFactorRange: [0.7, 0.86],
    exhaustPositionRange: [0.54, 0.74],
    curveRange: [12, 22],
  },
];

const BODY_STYLE_VARIANTS = [
  {
    key: "skinny",
    frontTypes: ["needle"],
    midTypes: ["slim", "modular"],
    rearTypes: ["tapered"],
    widthScaleRange: [0.78, 0.9],
  },
  {
    key: "normal",
    frontTypes: ["needle", "canopy", "ram"],
    midTypes: ["slim", "modular"],
    rearTypes: ["tapered", "thruster"],
    widthScaleRange: [0.95, 1.05],
  },
  {
    key: "bulky",
    frontTypes: ["canopy", "ram"],
    midTypes: ["modular", "bulwark"],
    rearTypes: ["thruster", "block"],
    widthScaleRange: [1.12, 1.28],
  },
];

const CANOPY_FRAME_VARIANTS = ["single", "split", "triple", "panoramic"];

const randomStack = [];
let activeRandomSource = Math.random;

function nextRandom() {
  return activeRandomSource();
}

function pushRandomSource(source) {
  randomStack.push(activeRandomSource);
  activeRandomSource = source ?? Math.random;
}

function popRandomSource() {
  activeRandomSource = randomStack.pop() ?? Math.random;
}

function runWithRandomSource(source, factory) {
  pushRandomSource(source);
  try {
    return factory();
  } finally {
    popRandomSource();
  }
}

function runWithSeed(seed, factory) {
  if (seed === undefined || seed === null) {
    return factory();
  }
  return runWithRandomSource(createSeededRandom(seed), factory);
}

function renderSpaceship(svg, config, options = {}) {
  if (!svg || !config) {
    return;
  }

  const preparedConfig = normaliseConfig(config);

  const viewMode = options.viewMode ?? "top";
  const drawFrame = options.drawFrame ?? false;

  svg.innerHTML = "";
  svg.setAttribute("data-view-mode", viewMode);
  svg.setAttribute("data-debug", isDebugColorsEnabled() ? "true" : "false");
  svg.removeAttribute("aria-hidden");
  svg.style.display = "";
  svg.setAttribute("viewBox", "0 0 200 200");

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  if (drawFrame) {
    const frameStroke = mixColor(config.palette.trim, "#0f172a", 0.55);
    const frameFill = "rgba(15, 23, 42, 0.18)";
    const frame = document.createElementNS(SVG_NS, "rect");
    frame.setAttribute("x", "0");
    frame.setAttribute("y", "0");
    frame.setAttribute("width", "200");
    frame.setAttribute("height", "200");
    frame.setAttribute("fill", frameFill);
    frame.setAttribute("stroke", frameStroke);
    frame.setAttribute("stroke-width", "1.5");
    svg.appendChild(frame);
  }

  const rootGroup = createShipRootGroup(preparedConfig.body, {
    offsetX: 0,
    offsetY: 0,
  });
  svg.appendChild(rootGroup.wrapper);

  const geometry = initializeGeometry(preparedConfig);
  preparedConfig.geometry = geometry;

  if (viewMode === "side") {
    drawSideViewSpaceship(rootGroup.root, preparedConfig, geometry, defs);
  } else {
    drawTopDownSpaceship(rootGroup.root, preparedConfig, geometry, defs);
  }
}

function createShipRootGroup(body, options = {}) {
  const { offsetX = 0, offsetY = 0 } = options;
  const wrapper = document.createElementNS(SVG_NS, "g");
  wrapper.classList.add("ship-root");

  if (offsetX !== 0 || offsetY !== 0) {
    wrapper.setAttribute("transform", `translate(${offsetX} ${offsetY})`);
  }

  const root = document.createElementNS(SVG_NS, "g");

  wrapper.appendChild(root);
  return { wrapper, root };
}

function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return seed >>> 0;
  }
  const text = typeof seed === "string" ? seed : JSON.stringify(seed ?? "sprite");
  let hash = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;
  return hash >>> 0 || 0x1f123bb5;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed);
  return function seeded() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(min, max) {
  return nextRandom() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(nextRandom() * (max - min + 1)) + min;
}

function choose(array) {
  return array[Math.floor(nextRandom() * array.length)];
}

function pickCanopyFraming(styleKey) {
  const poolByStyle = {
    skinny: ["single", "split", "split", "triple"],
    bulky: ["split", "triple", "panoramic", "panoramic"],
    normal: CANOPY_FRAME_VARIANTS,
  };
  const pool = poolByStyle[styleKey] ?? poolByStyle.normal ?? CANOPY_FRAME_VARIANTS;
  const key = choose(pool);

  const base = {
    key,
    frameScale: 1,
    frameInsetRatio: 0.08,
    startBlend: 0.08,
    endBlend: 0.92,
    apexBias: 0.1,
    ribRatios: [],
    ribCurveBias: 0.45,
    ribStrokeScale: 0.7,
    beltRatio: null,
    beltStrokeScale: 0.55,
  };

  switch (key) {
    case "split": {
      const offset = randomBetween(0.04, 0.08);
      base.ribRatios = [0.3 + offset, 0.64 + offset * 0.5];
      base.frameScale = randomBetween(0.95, 1.08);
      base.frameInsetRatio = randomBetween(0.05, 0.08);
      base.startBlend = randomBetween(0.06, 0.1);
      base.endBlend = randomBetween(0.88, 0.94);
      base.apexBias = randomBetween(0.12, 0.18);
      base.ribCurveBias = randomBetween(0.38, 0.52);
      base.ribStrokeScale = randomBetween(0.68, 0.82);
      base.beltRatio = randomBetween(0.46, 0.58);
      break;
    }
    case "triple": {
      const shift = randomBetween(-0.02, 0.02);
      base.ribRatios = [0.26 + shift, 0.5 + shift * 0.5, 0.74 + shift];
      base.frameScale = randomBetween(1.0, 1.12);
      base.frameInsetRatio = randomBetween(0.06, 0.1);
      base.startBlend = randomBetween(0.05, 0.09);
      base.endBlend = randomBetween(0.88, 0.94);
      base.apexBias = randomBetween(0.1, 0.18);
      base.ribCurveBias = randomBetween(0.42, 0.52);
      base.ribStrokeScale = randomBetween(0.64, 0.78);
      base.beltRatio = randomBetween(0.5, 0.62);
      base.beltStrokeScale = randomBetween(0.58, 0.68);
      break;
    }
    case "panoramic": {
      const spread = randomBetween(0.16, 0.22);
      const start = randomBetween(0.18, 0.24);
      base.ribRatios = [start, start + spread * 0.6, start + spread * 1.2, start + spread * 1.8];
      base.frameScale = randomBetween(1.05, 1.18);
      base.frameInsetRatio = randomBetween(0.04, 0.06);
      base.startBlend = randomBetween(0.04, 0.08);
      base.endBlend = randomBetween(0.9, 0.95);
      base.apexBias = randomBetween(0.14, 0.22);
      base.ribCurveBias = randomBetween(0.36, 0.48);
      base.ribStrokeScale = randomBetween(0.58, 0.72);
      base.beltRatio = randomBetween(0.42, 0.5);
      base.beltStrokeScale = randomBetween(0.62, 0.72);
      break;
    }
    default: {
      base.ribRatios = [randomBetween(0.44, 0.56)];
      base.frameScale = randomBetween(0.9, 1.02);
      base.frameInsetRatio = randomBetween(0.07, 0.1);
      base.startBlend = randomBetween(0.08, 0.12);
      base.endBlend = randomBetween(0.86, 0.92);
      base.apexBias = randomBetween(0.08, 0.14);
      base.ribCurveBias = randomBetween(0.44, 0.52);
      base.ribStrokeScale = randomBetween(0.68, 0.82);
      base.beltRatio = null;
      break;
    }
  }

  base.ribRatios = base.ribRatios
    .filter((value) => Number.isFinite(value))
    .map((value) => clamp(value, 0.1, 0.9))
    .sort((a, b) => a - b);

  return base;
}

function computeArmamentLoadout(body, wings, engine, details, cockpit) {
  const planform = computeWingPlanform(body, wings);
  const heavyArmament = (engine?.count ?? 1) > 2 || Boolean(details?.antenna);
  const wingMountViable = planform.enabled && planform.length > 0;

  if (wingMountViable && nextRandom() < (heavyArmament ? 0.65 : 0.45)) {
    const ordnanceType = nextRandom() < 0.55 ? "missile" : "bomb";
    const hardpointCount = heavyArmament ? 2 : 1;
    const basePayloadLength = clamp(body.length * 0.2, 16, Math.min(planform.length * 0.85, 42));
    const basePayloadRadius = clamp(planform.thickness * 0.45, 5, 14);
    const basePylonLength = clamp(planform.thickness * 0.7, 8, 26);
    const chordAnchors = hardpointCount === 1 ? [0.48] : [0.38, 0.68];

    return {
      mount: "wing",
      type: ordnanceType,
      barrels: hardpointCount,
      hardpoints: chordAnchors.map((ratio) => ({
        chordRatio: clamp(ratio + randomBetween(-0.04, 0.04), 0.2, 0.82),
        pylonLength: clamp(basePylonLength + randomBetween(-2, 3), 6, 30),
        payloadLength: clamp(basePayloadLength * (1 + randomBetween(-0.12, 0.12)), 12, 52),
        payloadRadius: clamp(
          basePayloadRadius * (ordnanceType === "bomb" ? 1.12 : 0.88),
          4.5,
          16,
        ),
      })),
    };
  }

  const length = Math.max(18, body.length * 0.12 + (wings?.forward ?? 18) * 0.4);
  const spacing = heavyArmament
    ? Math.max(6, (wings?.thickness ?? 12) * 0.35)
    : Math.max(4, (wings?.thickness ?? 10) * 0.25);
  const housingWidth = clamp((cockpit?.width ?? 26) * 0.45, 6, body.halfWidth * 0.9);

  return {
    mount: "nose",
    barrels: heavyArmament ? 2 : 1,
    length,
    spacing,
    housingWidth,
  };
}


function chooseVariantByType(variants, allowedTypes) {
  const pool = Array.isArray(allowedTypes) && allowedTypes.length
    ? variants.filter((variant) => allowedTypes.includes(variant.type))
    : variants;
  if (!pool.length) {
    return choose(variants);
  }
  return choose(pool);
}

function createBodySegments(ranges) {
  const style = choose(BODY_STYLE_VARIANTS);
  const widthScale = randomBetween(...(style.widthScaleRange ?? [1, 1]));

  const segments = {
    front: createFrontSegmentVariant(ranges, style),
    mid: createMidSegmentVariant(ranges, style),
    rear: createRearSegmentVariant(ranges, style),
    style: style.key,
    widthScale,
  };

  return segments;
}

function applySegmentStyleAdjustments(segment, style, adjustmentMap) {
  const key = style?.key && adjustmentMap[style.key] ? style.key : "normal";
  const adjustments = adjustmentMap[key] ?? adjustmentMap.normal;
  if (!adjustments) {
    return;
  }

  Object.entries(adjustments).forEach(([property, [min, max]]) => {
    if (segment[property] == null) {
      return;
    }
    segment[property] *= randomBetween(min, max);
  });
}

function createFrontSegmentVariant(ranges, style) {
  const variant = chooseVariantByType(FRONT_SEGMENT_VARIANTS, style?.frontTypes);
  const segment = {
    type: variant.type,
    weight: randomBetween(...variant.lengthWeightRange),
    tipWidthFactor: randomBetween(...variant.tipWidthFactorRange),
    shoulderWidthFactor: randomBetween(...variant.shoulderWidthFactorRange),
    transitionFactor: randomBetween(...variant.transitionFactorRange),
    curve: randomBetween(...variant.curveRange),
  };

  applySegmentStyleAdjustments(segment, style, FRONT_STYLE_ADJUSTMENTS);

  if (ranges?.noseWidthFactor) {
    segment.tipWidthFactor = clamp(segment.tipWidthFactor, ...ranges.noseWidthFactor);
  }
  if (ranges?.noseCurve) {
    segment.curve = clamp(segment.curve, ...ranges.noseCurve);
  }
  return segment;
}

function createMidSegmentVariant(ranges, style) {
  const variant = chooseVariantByType(MID_SEGMENT_VARIANTS, style?.midTypes);
  const segment = {
    type: variant.type,
    weight: randomBetween(...variant.lengthWeightRange),
    waistWidthFactor: randomBetween(...variant.waistWidthFactorRange),
    bellyWidthFactor: randomBetween(...variant.bellyWidthFactorRange),
    trailingWidthFactor: randomBetween(...variant.trailingWidthFactorRange),
    waistPosition: randomBetween(...variant.waistPositionRange),
    bellyPosition: randomBetween(...variant.bellyPositionRange),
    inset: randomBetween(...variant.insetRange),
  };

  applySegmentStyleAdjustments(segment, style, MID_STYLE_ADJUSTMENTS);

  if (ranges?.bodyMidInset) {
    segment.inset = clamp(segment.inset, ...ranges.bodyMidInset);
  }
  return segment;
}

function createRearSegmentVariant(ranges, style) {
  const variant = chooseVariantByType(REAR_SEGMENT_VARIANTS, style?.rearTypes);
  const segment = {
    type: variant.type,
    weight: randomBetween(...variant.lengthWeightRange),
    baseWidthFactor: randomBetween(...variant.baseWidthFactorRange),
    exhaustWidthFactor: randomBetween(...variant.exhaustWidthFactorRange),
    tailWidthFactor: randomBetween(...variant.tailWidthFactorRange),
    exhaustPosition: randomBetween(...variant.exhaustPositionRange),
    curve: randomBetween(...variant.curveRange),
  };

  applySegmentStyleAdjustments(segment, style, REAR_STYLE_ADJUSTMENTS);

  if (ranges?.tailWidthFactor) {
    segment.tailWidthFactor = clamp(segment.tailWidthFactor, ...ranges.tailWidthFactor);
  }
  if (ranges?.tailCurve) {
    segment.curve = clamp(segment.curve, ...ranges.tailCurve);
  }
  return segment;
}

function synchroniseBodySegments(body, ranges) {
  if (!body?.segments) {
    return body;
  }

  const { front, mid, rear } = body.segments;
  const parts = [front, mid, rear].filter(Boolean);
  if (!parts.length) {
    return body;
  }

  const weights = parts.map((segment) => Math.max(0.1, segment.weight ?? segment.length ?? 0.1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  parts.forEach((segment, index) => {
    segment.length = (weights[index] / totalWeight) * body.length;
  });

  front.tipWidthFactor = clamp(front.tipWidthFactor ?? body.noseWidthFactor ?? 0.34, 0.05, 1.2);
  front.shoulderWidthFactor = clamp(front.shoulderWidthFactor ?? 1, 0.7, 1.35);
  front.transitionFactor = clamp(front.transitionFactor ?? 0.88, 0.6, 1.25);
  front.curve = clamp(front.curve ?? body.noseCurve ?? 18, 6, 40);
  if (ranges?.noseWidthFactor) {
    front.tipWidthFactor = clamp(front.tipWidthFactor, ...ranges.noseWidthFactor);
  }
  if (ranges?.noseCurve) {
    front.curve = clamp(front.curve, ...ranges.noseCurve);
  }

  mid.waistWidthFactor = clamp(mid.waistWidthFactor ?? 0.92, 0.6, 1.3);
  mid.bellyWidthFactor = clamp(mid.bellyWidthFactor ?? 1, 0.7, 1.45);
  mid.trailingWidthFactor = clamp(mid.trailingWidthFactor ?? mid.bellyWidthFactor ?? 1, 0.7, 1.35);
  mid.waistPosition = clamp(mid.waistPosition ?? 0.35, 0.2, 0.6);
  mid.bellyPosition = clamp(mid.bellyPosition ?? 0.7, mid.waistPosition + 0.12, 0.95);
  mid.inset = clamp(mid.inset ?? body.midInset ?? 10, 2, Math.max(6, body.length / 2));
  if (ranges?.bodyMidInset) {
    mid.inset = clamp(mid.inset, ...ranges.bodyMidInset);
  }

  rear.baseWidthFactor = clamp(rear.baseWidthFactor ?? 1, 0.6, 1.4);
  rear.exhaustWidthFactor = clamp(rear.exhaustWidthFactor ?? 0.8, 0.4, 1.2);
  rear.tailWidthFactor = clamp(rear.tailWidthFactor ?? body.tailWidthFactor ?? 0.6, 0.3, 1.1);
  rear.exhaustPosition = clamp(rear.exhaustPosition ?? 0.65, 0.3, 0.9);
  rear.curve = clamp(rear.curve ?? body.tailCurve ?? 20, 6, 48);
  if (ranges?.tailWidthFactor) {
    rear.tailWidthFactor = clamp(rear.tailWidthFactor, ...ranges.tailWidthFactor);
  }
  if (ranges?.tailCurve) {
    rear.curve = clamp(rear.curve, ...ranges.tailCurve);
  }

  body.noseWidthFactor = front.tipWidthFactor;
  body.noseCurve = front.curve;
  body.midInset = mid.inset;
  body.tailWidthFactor = rear.tailWidthFactor;
  body.tailCurve = rear.curve;
  if (!body.style) {
    body.style = body.segments?.style ?? null;
  }

  return body;
}


function createBaseConfig(categoryKey) {
  const def = CATEGORY_DEFINITIONS[categoryKey];
  const palette = pickPalette();
  return normaliseConfig(createTopDownConfig(categoryKey, def, palette));
}

function createTopDownConfig(categoryKey, def, palette) {
  const ranges = def.ranges;

  const bodyLengthPercent = (ranges.body_end ?? 100) - (ranges.body_start ?? 0);
  const bodyLength = (bodyLengthPercent / 100) * NORMALISED_HULL_LENGTH;
  const percentToBody = (percent) => (percent / 100) * bodyLength;
  const percentRangeToBody = (percentRange) =>
    percentRange && percentRange.length === 2 ? percentRange.map(percentToBody) : null;
  const pickPercent = (percentRange) =>
    percentRange && percentRange.length === 2 ? randomBetween(percentRange[0], percentRange[1]) : 0;

  const sideFinCount = nextRandom() < def.features.sideFinProbability ? randomInt(...ranges.finCount) : 0;

  const bodyWidthPercent = pickPercent(ranges.bodyWidthPercent);
  const bodyHalfWidth = percentToBody(bodyWidthPercent) / 2;

  const segmentRanges = {
    bodyMidInset: percentRangeToBody(ranges.bodyMidInsetPercent),
    noseCurve: percentRangeToBody(ranges.noseCurvePercent),
    tailCurve: percentRangeToBody(ranges.tailCurvePercent),
    noseWidthFactor: ranges.noseWidthFactor,
    tailWidthFactor: ranges.tailWidthFactor,
  };

  const wingRoll = nextRandom();
  const winglessChance = def.features.winglessProbability ?? 0;
  const aftChance = def.features.aftWingProbability ?? 0;
  const wingMount =
    wingRoll < winglessChance
      ? "none"
      : wingRoll < winglessChance + aftChance
      ? "aft"
      : "mid";
  const wingsEnabled = wingMount !== "none";

  const baseSpan = percentToBody(pickPercent(ranges.wingSpanPercent));
  const baseSweep = percentToBody(pickPercent(ranges.wingSweepPercent));
  const baseForward = percentToBody(pickPercent(ranges.wingForwardPercent));
  const baseThickness = percentToBody(pickPercent(ranges.wingThicknessPercent));
  const attachPercent = pickPercent([ranges.wing_attach_start, ranges.wing_attach_end]);
  const baseOffset = ((attachPercent - 50) / 100) * bodyLength;
  const baseDihedral = percentToBody(pickPercent(ranges.wingDihedralPercent));

  let wingSpan = wingsEnabled ? baseSpan : 0;
  let wingSweep = wingsEnabled ? baseSweep : 0;
  let wingForward = wingsEnabled ? baseForward : 0;
  let wingThickness = wingsEnabled ? baseThickness : 0;
  let wingOffset = wingsEnabled ? baseOffset : 0;
  let wingDihedral = wingsEnabled ? baseDihedral : 0;

  if (wingsEnabled && wingMount === "aft") {
    // Push aft-mounted wings toward the tail so they resemble swept-back fighter wings.
    const halfLength = bodyLength / 2;
    const minTailOffset = Math.max(halfLength * 0.32, percentToBody(9));
    const maxTailOffset = Math.max(minTailOffset + percentToBody(3), halfLength - percentToBody(9));
    wingOffset = randomBetween(minTailOffset, maxTailOffset);
    wingForward *= 0.7;
    wingSpan *= 0.9;
    wingDihedral *= 0.6;
  }

  const bodySegments = createBodySegments(segmentRanges);
  const widthScale = clamp(bodySegments.widthScale ?? 1, 0.6, 1.6);

  const body = {
    length: bodyLength,
    halfWidth: bodyHalfWidth * widthScale,
    startPercent: (ranges.body_start ?? 0) / 100,
    endPercent: (ranges.body_end ?? 100) / 100,
    segments: bodySegments,
    plating: nextRandom() < def.features.platingProbability,
  };
  synchroniseBodySegments(body, segmentRanges);
  body.style = bodySegments.style;
  body.widthScale = widthScale;

  const cockpit = {
    width: percentToBody(pickPercent(ranges.cockpitWidthPercent)),
    height: percentToBody(pickPercent(ranges.cockpitHeightPercent)),
    offsetY: percentToBody(pickPercent([ranges.cockpit_center_start, ranges.cockpit_center_end]) - 50),
    tint: palette.cockpit,
  };

  const engine = {
    count: randomInt(...ranges.engineCount),
    size: percentToBody(pickPercent(ranges.engineSizePercent)),
    spacing: percentToBody(pickPercent(ranges.engineSpacingPercent)),
    nozzleLength: percentToBody(pickPercent(ranges.nozzlePercent)),
    glow: palette.glow,
  };

  const wingsConfig = {
    enabled: wingsEnabled,
    mount: wingMount,
    style: wingsEnabled ? choose(def.wingStyles) : "none",
    span: wingSpan,
    sweep: wingSweep,
    forward: wingForward,
    thickness: wingThickness,
    offsetY: wingOffset,
    dihedral: wingDihedral,
    tipAccent: wingsEnabled && nextRandom() < def.features.wingTipAccentProbability,
  };

  const fins = {
    top: nextRandom() < def.features.topFinProbability ? 1 : 0,
    side: sideFinCount,
    bottom: nextRandom() < def.features.bottomFinProbability ? 1 : 0,
    height: percentToBody(pickPercent(ranges.finHeightPercent)),
    width: percentToBody(pickPercent(ranges.finWidthPercent)),
  };

  const details = {
    stripe: nextRandom() < def.features.stripeProbability,
    stripeOffset: percentToBody(pickPercent(ranges.stripeStartPercent)),
    antenna: nextRandom() < def.features.antennaProbability,
  };

  cockpit.canopyFraming = pickCanopyFraming(body.style);

  const armament = computeArmamentLoadout(body, wingsConfig, engine, details, cockpit);

  return {
    id: randomId(),
    category: categoryKey,
    label: def.label,
    description: def.description,
    palette,
    body,
    cockpit,
    engine,
    wings: wingsConfig,
    fins,
    details,
    armament,
  };
}


function mutateConfig(base) {
  const fresh = createBaseConfig(base.category);
  const ratio = 0.35 + nextRandom() * 0.4;
  const mixed = mixConfigs(base, fresh, ratio);
  mixed.id = randomId();
  return normaliseConfig(mixed);
}

function pickPalette(excludeName) {
  const options = excludeName ? COLOR_PALETTES.filter((palette) => palette.name !== excludeName) : COLOR_PALETTES;
  const choice = choose(options);
  return { ...choice };
}

function mixConfigs(original, fresh, ratio) {
  // The generator occasionally encounters optional branches that resolve to null;
  // treat those as immutable values so recursive merging never touches Object.keys(null).
  if (fresh == null && original == null) {
    return null;
  }
  if (fresh == null) {
    return original == null ? undefined : cloneConfig(original);
  }
  if (original == null) {
    return cloneConfig(fresh);
  }
  if (typeof original !== typeof fresh) {
    if (fresh === undefined) {
      return cloneConfig(original);
    }
    return cloneConfig(fresh);
  }
  if (typeof original === "number" && typeof fresh === "number") {
    return original + (fresh - original) * ratio;
  }
  if (typeof original === "string" && typeof fresh === "string") {
    return nextRandom() < ratio ? fresh : original;
  }
  if (typeof original === "boolean" && typeof fresh === "boolean") {
    return nextRandom() < ratio ? fresh : original;
  }
  if (Array.isArray(original) && Array.isArray(fresh)) {
    return original.map((value, index) => mixConfigs(value, fresh[index] ?? value, ratio));
  }
  if (typeof original === "object" && typeof fresh === "object") {
    const result = {};
    const keys = new Set([...Object.keys(original), ...Object.keys(fresh)]);
    keys.forEach((key) => {
      result[key] = mixConfigs(original[key], fresh[key], ratio);
    });
    return result;
  }
  return cloneConfig(fresh);
}

function cloneConfig(config) {
  if (config === undefined) {
    return undefined;
  }
  if (typeof structuredClone === "function") {
    return structuredClone(config);
  }
  return JSON.parse(JSON.stringify(config));
}


function normaliseConfig(config) {
  const copy = cloneConfig(config);
  return normaliseTopDownConfig(copy);
}

function normaliseTopDownConfig(copy) {
  copy.engine.count = Math.max(1, Math.round(copy.engine.count));
  copy.fins.side = Math.max(0, Math.round(copy.fins.side));
  copy.fins.height = Math.max(8, copy.fins.height);
  copy.fins.width = Math.max(6, copy.fins.width);
  copy.body.midInset = Math.max(4, copy.body.midInset);
  copy.body.halfWidth = Math.max(10, copy.body.halfWidth);
  copy.body.startPercent = clamp(copy.body.startPercent ?? 0, 0, 1);
  copy.body.endPercent = clamp(copy.body.endPercent ?? 1, copy.body.startPercent, 1);
  copy.details.stripeOffset = Math.max(6, copy.details.stripeOffset);

  if (copy.wings) {
    copy.wings.enabled = Boolean(copy.wings.enabled);
    if (!copy.wings.enabled) {
      copy.wings.mount = "none";
      copy.wings.tipAccent = false;
      copy.wings.offsetY = 0;
      copy.wings.mountHeight = 0;
      copy.wings.span = Math.max(0, copy.wings.span ?? 0);
      copy.wings.thickness = Math.max(0, copy.wings.thickness ?? 0);
    } else {
      copy.wings.mount = copy.wings.mount || "mid";
      const halfLength = copy.body.length / 2;
      if (copy.wings.mount === "aft") {
        const minTail = Math.max(halfLength * 0.28, 10);
        const maxTail = Math.max(minTail, halfLength - 10);
        copy.wings.offsetY = Math.min(Math.max(copy.wings.offsetY, minTail), maxTail);
      } else {
        const midRange = halfLength * 0.35;
        copy.wings.offsetY = Math.min(Math.max(copy.wings.offsetY, -midRange), midRange);
      }
      copy.wings.span = Math.max(12, copy.wings.span);
      copy.wings.thickness = Math.max(4, copy.wings.thickness);
      if (!Number.isFinite(copy.wings.mountHeight)) {
        copy.wings.mountHeight = 0;
      }
    }
  }
  if (copy.body?.segments) {
    const ranges = CATEGORY_DEFINITIONS[copy.category]?.ranges;
    if (ranges) {
      const percentToBody = (percent) => (percent / 100) * copy.body.length;
      const toBodyRange = (range) => (range ? range.map(percentToBody) : null);
      const segmentRanges = {
        bodyMidInset: toBodyRange(ranges.bodyMidInsetPercent),
        noseCurve: toBodyRange(ranges.noseCurvePercent),
        tailCurve: toBodyRange(ranges.tailCurvePercent),
        noseWidthFactor: ranges.noseWidthFactor,
        tailWidthFactor: ranges.tailWidthFactor,
      };
      synchroniseBodySegments(copy.body, segmentRanges);
    }
  }
  if (!copy.cockpit) {
    copy.cockpit = {};
  }
  if (!copy.cockpit.canopyFraming) {
    copy.cockpit.canopyFraming = pickCanopyFraming(copy.body?.style ?? copy.body?.segments?.style ?? null);
  }
  copy.armament = normaliseArmament(copy);
  return copy;
}

function normaliseArmament(config) {
  const { body, wings, engine, details, cockpit } = config;
  const planform = computeWingPlanform(body, wings);
  const heavyArmament = (engine?.count ?? 1) > 2 || Boolean(details?.antenna);
  const original = config.armament;

  if (!original || typeof original !== "object") {
    return computeArmamentLoadout(body, wings, engine, details, cockpit);
  }

  if (original.mount === "wing") {
    if (!planform.enabled) {
      return computeArmamentLoadout(body, wings, engine, details, cockpit);
    }
    const hardpoints = Array.isArray(original.hardpoints)
      ? original.hardpoints
          .map((hardpoint) => ({
            chordRatio: clamp(hardpoint.chordRatio ?? 0.5, 0.2, 0.82),
            pylonLength: clamp(hardpoint.pylonLength ?? planform.thickness * 0.6, 4, 36),
            payloadLength: clamp(hardpoint.payloadLength ?? planform.length * 0.3, 10, 64),
            payloadRadius: clamp(hardpoint.payloadRadius ?? planform.thickness * 0.35, 3, 18),
          }))
          .filter(Boolean)
      : [];
    if (!hardpoints.length) {
      return computeArmamentLoadout(body, wings, engine, details, cockpit);
    }
    return {
      mount: "wing",
      type: original.type === "missile" ? "missile" : "bomb",
      barrels: Math.max(1, Math.round(original.barrels ?? hardpoints.length)),
      hardpoints,
    };
  }

  if (original.mount === "nose") {
    return {
      mount: "nose",
      barrels: Math.max(1, Math.round(original.barrels ?? (heavyArmament ? 2 : 1))),
      length: clamp(original.length ?? body.length * 0.12, 10, body.length * 0.45),
      spacing: clamp(
        original.spacing ?? (wings?.thickness ?? 10) * 0.3,
        2,
        Math.max(body.halfWidth * 1.2, 26),
      ),
      housingWidth: clamp(
        original.housingWidth ?? (cockpit?.width ?? 26) * 0.45,
        4,
        Math.max(body.halfWidth * 0.95, 8),
      ),
    };
  }

  return computeArmamentLoadout(body, wings, engine, details, cockpit);
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ship-${nextRandom().toString(36).slice(2, 9)}`;
}

function resolveCategoryKey(category) {
  if (category && CATEGORY_DEFINITIONS[category]) {
    return category;
  }
  if (typeof category === "string") {
    const lower = category.toLowerCase();
    const match = Object.keys(CATEGORY_DEFINITIONS).find((key) => key === lower);
    if (match) {
      return match;
    }
  }
  return "fighter";
}

function clonePalette(palette) {
  return palette ? { ...palette } : palette;
}

export function listSpaceshipCategories() {
  return Object.keys(CATEGORY_DEFINITIONS);
}

export function listSpaceshipPalettes() {
  return COLOR_PALETTES.map((palette) => ({ ...palette }));
}

export function createSpaceshipConfig(options = {}) {
  const { category = "fighter", seed, paletteName, palette } = options;
  const categoryKey = resolveCategoryKey(category);
  const config = runWithSeed(seed, () => createBaseConfig(categoryKey));

  if (paletteName) {
    const match = COLOR_PALETTES.find((entry) => entry.name === paletteName);
    if (match) {
      config.palette = clonePalette(match);
    }
  }
  if (palette) {
    config.palette = clonePalette(palette);
  }

  return normaliseConfig(config);
}

export function renderSpaceshipSprite(config, options = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  renderSpaceship(svg, config, options);
  return svg;
}

export function generateSpaceshipSprite(options = {}) {
  const config = options.config ? normaliseConfig(options.config) : createSpaceshipConfig(options);
  const svg = renderSpaceshipSprite(config, options);
  return { config, svg };
}

export {
  SVG_NS,
  CATEGORY_DEFINITIONS,
  createBaseConfig,
  cloneConfig,
  mutateConfig,
  pickPalette,
  normaliseConfig,
  renderSpaceship,
};

const spriteGeneratorApi = {
  createSpaceshipConfig,
  renderSpaceshipSprite,
  generateSpaceshipSprite,
  listSpaceshipCategories,
  listSpaceshipPalettes,
};

if (typeof window !== "undefined") {
  window.SpriteGenerator = {
    ...(window.SpriteGenerator ?? {}),
    ...spriteGeneratorApi,
  };
}
