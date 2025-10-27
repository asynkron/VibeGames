const SVG_NS = "http://www.w3.org/2000/svg";
const GRID_SIZE = 9;

const VIEW_MODE = {
  value: "both",
  label: "Dual projection",
  shortLabel: "Dual",
};

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
    lengthWeightRange: [0.26, 0.34],
    tipWidthFactorRange: [0.08, 0.14],
    shoulderWidthFactorRange: [0.92, 1.05],
    transitionFactorRange: [0.74, 0.88],
    curveRange: [22, 32],
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
    waistWidthFactorRange: [0.78, 0.9],
    bellyWidthFactorRange: [0.92, 1.04],
    trailingWidthFactorRange: [0.88, 0.98],
    waistPositionRange: [0.28, 0.4],
    bellyPositionRange: [0.62, 0.78],
    insetRange: [10, 18],
  },
  {
    type: "bulwark",
    lengthWeightRange: [0.34, 0.42],
    waistWidthFactorRange: [0.94, 1.06],
    bellyWidthFactorRange: [1.08, 1.2],
    trailingWidthFactorRange: [1.02, 1.14],
    waistPositionRange: [0.32, 0.46],
    bellyPositionRange: [0.68, 0.86],
    insetRange: [6, 12],
  },
  {
    type: "modular",
    lengthWeightRange: [0.36, 0.48],
    waistWidthFactorRange: [0.86, 0.98],
    bellyWidthFactorRange: [1.0, 1.12],
    trailingWidthFactorRange: [0.94, 1.06],
    waistPositionRange: [0.3, 0.45],
    bellyPositionRange: [0.58, 0.8],
    insetRange: [8, 14],
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
    baseWidthFactorRange: [1.02, 1.16],
    exhaustWidthFactorRange: [0.72, 0.86],
    tailWidthFactorRange: [0.58, 0.72],
    exhaustPositionRange: [0.6, 0.82],
    curveRange: [20, 32],
  },
  {
    type: "block",
    lengthWeightRange: [0.28, 0.36],
    baseWidthFactorRange: [1.08, 1.22],
    exhaustWidthFactorRange: [0.78, 0.92],
    tailWidthFactorRange: [0.62, 0.78],
    exhaustPositionRange: [0.54, 0.74],
    curveRange: [18, 28],
  },
];

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

const DEBUG_PART_COLORS = {
  hull: "#ff6b6b",
  wing: "#4ecdc4",
  canopy: "#48cae4",
  stabiliser: "#f8961e",
  thruster: "#f9844a",
  exhaust: "#ffd166",
  weapons: "#b5179e",
  markings: "#00b4d8",
  lights: "#ff9f1c",
  details: "#8338ec",
};

const categorySelect = document.getElementById("categorySelect");
const spriteGrid = document.getElementById("spriteGrid");
const detailTopView = document.getElementById("detailTopView");
const detailSideView = document.getElementById("detailSideView");
const detailViewportContainer = document.querySelector(".detail-viewports");
const definition = document.getElementById("definition");
const newSeedButton = document.getElementById("newSeed");
const shufflePaletteButton = document.getElementById("shufflePalette");
const debugToggleButton = document.getElementById("debugToggle");

let renderCounter = 0;

let currentCategory = "fighter";
let parentConfig = null;
let selectedConfig = null;
let debugColorsEnabled = false;

function partColor(part, fallback) {
  return debugColorsEnabled ? DEBUG_PART_COLORS[part] ?? fallback : fallback;
}

function partStroke(part, fallback) {
  return debugColorsEnabled ? DEBUG_PART_COLORS[part] ?? fallback : fallback;
}

function updateDebugToggleButton() {
  if (!debugToggleButton) {
    return;
  }
  debugToggleButton.textContent = `Debug colors: ${debugColorsEnabled ? "on" : "off"}`;
  debugToggleButton.setAttribute("aria-pressed", debugColorsEnabled ? "true" : "false");
}

populateCategorySelect();
initialise();

function populateCategorySelect() {
  Object.entries(CATEGORY_DEFINITIONS).forEach(([key, def]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${def.label} – ${def.description}`;
    categorySelect.appendChild(option);
  });
  categorySelect.value = currentCategory;
}

function initialise() {
  parentConfig = createBaseConfig(currentCategory);
  selectedConfig = cloneConfig(parentConfig);
  renderDetail(selectedConfig);
  renderGrid();

  categorySelect.addEventListener("change", () => {
    currentCategory = categorySelect.value;
    parentConfig = createBaseConfig(currentCategory);
    selectedConfig = cloneConfig(parentConfig);
    renderDetail(selectedConfig);
    renderGrid();
  });

  newSeedButton.addEventListener("click", () => {
    parentConfig = createBaseConfig(currentCategory);
    selectedConfig = cloneConfig(parentConfig);
    renderDetail(selectedConfig);
    renderGrid();
  });

  shufflePaletteButton.addEventListener("click", () => {
    const updated = cloneConfig(parentConfig);
    updated.palette = pickPalette(updated.palette.name);
    parentConfig = updated;
    selectedConfig = cloneConfig(updated);
    renderDetail(selectedConfig);
    renderGrid();
  });

  if (debugToggleButton) {
    debugToggleButton.addEventListener("click", () => {
      debugColorsEnabled = !debugColorsEnabled;
      updateDebugToggleButton();
      renderDetail(selectedConfig);
      renderGrid();
    });
    updateDebugToggleButton();
  }
}

function renderGrid() {
  spriteGrid.innerHTML = "";

  const configs = [];
  configs.push(cloneConfig(parentConfig));
  for (let i = 1; i < GRID_SIZE; i += 1) {
    configs.push(mutateConfig(parentConfig));
  }

  configs.forEach((config, index) => {
    const card = createSpriteCard(config, index === 0);
    card.addEventListener("click", () => {
      parentConfig = cloneConfig(config);
      selectedConfig = cloneConfig(config);
      renderDetail(selectedConfig);
      renderGrid();
    });
    spriteGrid.appendChild(card);
  });
}

function createSpriteCard(config, isParent) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sprite-card";
  if (isParent) {
    button.classList.add("selected");
  }

  const viewportWrapper = document.createElement("div");
  viewportWrapper.className = "sprite-viewports";

  if (VIEW_MODE.value === "both") {
    viewportWrapper.classList.add("dual");

    const topSvg = createViewportSvg("Top-down spaceship preview");
    renderSpaceship(topSvg, config, { viewMode: "top", drawFrame: true });

    const sideSvg = createViewportSvg("Side profile spaceship preview");
    renderSpaceship(sideSvg, config, { viewMode: "side", drawFrame: true });

    viewportWrapper.append(topSvg, sideSvg);
  } else {
    const singleSvg = createViewportSvg("Spaceship preview");
    renderSpaceship(singleSvg, config, {
      viewMode: VIEW_MODE.value,
      drawFrame: true,
    });
    viewportWrapper.append(singleSvg);
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  const palette = document.createElement("span");
  palette.textContent = config.palette.name;
  const category = document.createElement("span");
  category.textContent = config.label || config.category;
  const mode = document.createElement("span");
  mode.textContent = VIEW_MODE.shortLabel;
  meta.append(category, mode, palette);

  button.append(viewportWrapper, meta);
  return button;
}

function createViewportSvg(label) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  return svg;
}

function renderDetail(config) {
  const mode = VIEW_MODE.value;

  if (detailViewportContainer) {
    if (mode === "both") {
      detailViewportContainer.classList.add("dual");
    } else {
      detailViewportContainer.classList.remove("dual");
    }
  }

  if (mode === "both") {
    renderSpaceship(detailTopView, config, { viewMode: "top", drawFrame: true });
    renderSpaceship(detailSideView, config, { viewMode: "side", drawFrame: true });
    setViewportVisibility(detailTopView, true);
    setViewportVisibility(detailSideView, true);
  } else if (mode === "side") {
    renderSpaceship(detailSideView, config, { viewMode: "side", drawFrame: true });
    setViewportVisibility(detailSideView, true);
    clearViewport(detailTopView);
  } else {
    renderSpaceship(detailTopView, config, { viewMode: "top", drawFrame: true });
    setViewportVisibility(detailTopView, true);
    clearViewport(detailSideView);
  }

  definition.textContent = JSON.stringify(
    config,
    (key, value) => (typeof value === "number" ? Number(value.toFixed(2)) : value),
    2,
  );
}

function setViewportVisibility(svg, isVisible) {
  if (!svg) {
    return;
  }
  svg.style.display = isVisible ? "" : "none";
  svg.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

function clearViewport(svg) {
  if (!svg) {
    return;
  }
  // Remove any stale artwork while collapsing the viewport from layout flow.
  svg.innerHTML = "";
  svg.removeAttribute("data-view-mode");
  svg.setAttribute("aria-hidden", "true");
  svg.style.display = "none";
}

function renderSpaceship(svg, config, options = {}) {
  if (!svg) {
    return;
  }

  const viewMode = options.viewMode ?? "top";
  const drawFrame = options.drawFrame ?? false;

  svg.innerHTML = "";
  svg.setAttribute("data-view-mode", viewMode);
  svg.setAttribute("data-debug", debugColorsEnabled ? "true" : "false");
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

  const rootGroup = createShipRootGroup(config.body, {
    offsetX: 0,
    offsetY: 0,
  });
  svg.appendChild(rootGroup.wrapper);

  if (viewMode === "side") {
    drawSideViewSpaceship(rootGroup.root, config, defs);
  } else {
    drawTopDownSpaceship(rootGroup.root, config, defs);
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

function buildBodyAxis(body) {
  const length = body?.length ?? 0;
  const startPercent = body?.startPercent ?? 0;
  const endPercent = body?.endPercent ?? 1;
  const centerPercent = (startPercent + endPercent) / 2;
  const centerOffset = (centerPercent - 0.5) * length;
  const noseTop = 100 - length / 2 + centerOffset;
  const noseSide = 100 - length / 2 + centerOffset;
  const tailTop = noseTop + length;
  const tailSide = noseSide + length;
  const percentToTopY = (percent) => noseTop + length * percent;
  const percentToSideX = (percent) => noseSide + length * percent;
  const percentFromTopY = (y) => (length > 0 ? clamp((y - noseTop) / length, 0, 1) : 0);
  const percentFromSideX = (x) => (length > 0 ? clamp((x - noseSide) / length, 0, 1) : 0);
  return {
    length,
    top: { nose: noseTop, tail: tailTop },
    side: { nose: noseSide, tail: tailSide },
    percentToTopY,
    percentToSideX,
    percentFromTopY,
    percentFromSideX,
  };
}

function drawTopDownSpaceship(root, config, defs) {
  const axis = buildBodyAxis(config.body);
  drawWings(root, config, axis);
  drawBody(root, config, axis);
  drawTopArmament(root, config, axis);
  drawCockpit(root, config, axis, defs);
  drawEngines(root, config, axis);
  drawFins(root, config, axis);
  drawDetails(root, config, axis);
}

function drawSideViewSpaceship(root, config, defs) {
  const geometry = deriveSideViewGeometry(config);
  const axis = geometry.axis;
  drawSideHull(root, config, geometry, axis);
  drawSideAntenna(root, config, geometry, axis);
  drawSideWing(root, config, geometry, axis);
  drawSideStabiliser(root, config, geometry, axis);
  drawSideMarkings(root, config, geometry, axis);
  drawSideCanopy(root, config, geometry, axis, defs);
  drawSideThrusters(root, config, geometry, axis);
  drawSideWeapons(root, config, geometry, axis);
  drawSideLights(root, config, geometry, axis);
}

function applySideSegmentProfiles(profile, body, percentToBody) {
  if (!body?.segments) {
    return;
  }

  const { front, mid, rear } = body.segments;

  const normalise = (value, min, max) => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (max === min) {
      return 0;
    }
    return clamp((value - min) / (max - min), 0, 1);
  };

  let frontLength = front?.length ?? profile.noseLength ?? profile.length * 0.3;
  let midLength = mid?.length ?? profile.length * 0.4;
  let rearLength = rear?.length ?? profile.tailLength ?? profile.length * 0.3;
  const totalLength = frontLength + midLength + rearLength;
  if (totalLength > 0) {
    const scale = profile.length / totalLength;
    frontLength *= scale;
    midLength *= scale;
    rearLength *= scale;
  }
  profile.noseLength = frontLength;
  profile.tailLength = rearLength;

  const noseTipRatio = normalise(front?.tipWidthFactor ?? 0.28, 0.08, 0.5);
  const noseShoulderRatio = normalise(front?.shoulderWidthFactor ?? 1, 0.88, 1.26);
  const noseCurveRatio = normalise(front?.curve ?? body.noseCurve ?? 18, 10, 40);
  const transitionRatio = normalise(front?.transitionFactor ?? 0.9, 0.7, 1.2);
  const taperRatio = clamp(
    1 - (front?.tipWidthFactor ?? 0.28) / Math.max(front?.shoulderWidthFactor ?? 1, 0.12),
    0,
    1,
  );

  const midInsetValue = mid?.inset ?? body.midInset ?? percentToBody(10);
  const insetRatio = normalise(midInsetValue, percentToBody(4), percentToBody(22));
  const waistRatio = normalise(mid?.waistWidthFactor ?? 1, 0.74, 1.18);
  const bellyRatio = normalise(mid?.bellyWidthFactor ?? 1, 0.9, 1.32);
  const bellyBias = bellyRatio - 0.5;

  const tailWidthRatio = normalise(rear?.tailWidthFactor ?? body.tailWidthFactor ?? 0.6, 0.4, 0.92);
  const tailCurveRatio = normalise(rear?.curve ?? body.tailCurve ?? 20, 10, 44);
  const exhaustRatio = normalise(rear?.exhaustWidthFactor ?? 0.8, 0.5, 1.2);
  const baseWidthRatio = normalise(rear?.baseWidthFactor ?? 1, 0.8, 1.28);

  const canopyWeight = clamp((noseShoulderRatio * 0.55 + noseTipRatio * 0.45), 0, 1);
  const spearWeight = taperRatio;

  const noseHeightBase = Math.max(percentToBody(4.3), (body.noseCurve ?? front?.curve ?? 18) * 0.28);
  profile.noseHeight = clamp(
    noseHeightBase * (0.9 + canopyWeight * 0.4 + spearWeight * 0.28 + noseCurveRatio * 0.18)
      + percentToBody(2.4) * transitionRatio,
    percentToBody(4.0),
    profile.height * 0.96,
  );

  profile.dorsalHeight = Math.max(
    profile.dorsalHeight * (0.88 + canopyWeight * 0.28 + waistRatio * 0.18),
    profile.dorsalHeight * 0.72,
  );
  profile.dorsalHeight += percentToBody(2.0) * (bellyBias + transitionRatio - 0.5);

  profile.bellyDrop = clamp(
    percentToBody(3.6)
      + midInsetValue * (0.72 + bellyBias * 0.38)
      + percentToBody(3.0) * insetRatio
      + percentToBody(1.6) * (1 - waistRatio),
    percentToBody(4.0),
    profile.height * 0.62,
  );

  profile.ventralDepth = Math.max(
    profile.bellyDrop + Math.max(percentToBody(3.4), midInsetValue * (0.38 + bellyBias * 0.22)),
    profile.bellyDrop + percentToBody(2.6),
  );

  profile.tailHeight = clamp(
    Math.max(percentToBody(3.6), (body.tailCurve ?? rear?.curve ?? 18) * 0.22)
      * (0.95 + (1 - tailWidthRatio) * 0.6 + (baseWidthRatio - tailWidthRatio) * 0.35)
      + percentToBody(1.6) * (exhaustRatio - 0.5),
    percentToBody(3.6),
    profile.height * 0.82,
  );

  profile.height = Math.max(
    profile.height,
    profile.noseHeight * 1.12,
    profile.dorsalHeight + percentToBody(1.0),
    profile.tailHeight * 1.08,
    profile.ventralDepth,
  );

  const frontSecondBlend = clamp(lerp(0.44, 0.72, noseTipRatio), 0.18, 0.85);
  const frontEndBlend = clamp(
    lerp(0.24, 0.06, noseTipRatio) + lerp(-0.08, 0.08, spearWeight) + (transitionRatio - 0.5) * 0.08,
    0,
    1,
  );
  const chinBlend = clamp(lerp(0.64, 0.42, noseTipRatio) + canopyWeight * 0.06, 0.22, 0.88);
  const frontBellyBlend = clamp(lerp(0.5, 0.34, bellyRatio), 0.2, 0.85);

  const topDip = clamp(lerp(0.14, 0.06, waistRatio) + spearWeight * 0.05 + canopyWeight * 0.03, 0.03, 0.22);
  const crestOffset = clamp(
    ((mid?.bellyPosition ?? 0.72) - 0.72) * 0.6 + bellyBias * 0.18 - (transitionRatio - 0.5) * 0.08,
    -0.2,
    0.2,
  );

  const rearTopBlend = clamp(lerp(0.48, 0.72, tailCurveRatio * 0.6 + (1 - tailWidthRatio) * 0.4), 0.2, 0.92);
  const rearBottomBlend = clamp(lerp(0.58, 0.72, bellyRatio) + (exhaustRatio - 0.5) * 0.12, 0.25, 0.95);

  profile.sideAnchorConfig = {
    front: {
      topSecondBlend: frontSecondBlend,
      topEndBlend: frontEndBlend,
      bottomSecondBlend: chinBlend,
      bottomEndBlend: frontBellyBlend,
    },
    mid: {
      topDip,
      topCrestOffset: crestOffset,
    },
    rear: {
      topBlend: rearTopBlend,
      bottomBlend: rearBottomBlend,
    },
  };
}

function deriveSideViewGeometry(config) {
  // Translate the shared top-down configuration into approximate side-view dimensions.
  const { body, cockpit, engine, wings, fins, details } = config;

  const axis = buildBodyAxis(body);
  const halfLength = body.length / 2;
  const percentToBody = (percent) => (percent / 100) * body.length;
  const fuselageRadius = Math.max(body.halfWidth, percentToBody(8.6));
  const baseHeight = Math.max(
    fuselageRadius * 1.4,
    (cockpit?.height ?? percentToBody(12.9)) + percentToBody(5.7),
    (fins?.height ?? percentToBody(17.1)) * 0.55,
  );

  // Helper closures to keep side-view distances in lockstep with the top-down layout.
  const clampToBody = (value) => clamp(value, 0, body.length);
  const centerOffsetToBody = (offset) => clampToBody(halfLength + offset);

  const noseLength = clamp(body.length * 0.18 + body.noseCurve * 0.35, body.length * 0.16, body.length * 0.32);
  const tailLength = clamp(body.length * 0.22 + body.tailCurve * 0.3, body.length * 0.16, body.length * 0.36);
  const noseHeight = Math.max(percentToBody(5.7), body.noseCurve * 0.55);
  const dorsalHeight = Math.max(
    (cockpit?.height ?? percentToBody(12.9)) + percentToBody(4.3),
    (fins?.height ?? percentToBody(20.0)) * 0.55,
  );
  const tailHeight = Math.max(percentToBody(4.3), (fins?.height ?? percentToBody(17.1)) * 0.4);
  const bellyDrop = clamp(body.midInset * 1.6, baseHeight * 0.22, baseHeight * 0.48);
  const ventralDepth = bellyDrop + Math.max(percentToBody(4.3), body.midInset * 0.6);
  const hasIntakes = (engine?.count ?? 0) > 1;
  const intakeHeight = hasIntakes ? Math.min(baseHeight * 0.45, (engine?.size ?? percentToBody(12.9)) * 0.9) : 0;
  const intakeDepth = hasIntakes ? Math.min(fuselageRadius * 1.2, (engine?.spacing ?? percentToBody(17.1)) * 0.6) : 0;

  const profile = {
    length: body.length,
    height: baseHeight,
    noseLength,
    tailLength,
    noseHeight,
    dorsalHeight,
    tailHeight,
    bellyDrop,
    ventralDepth,
    intakeHeight,
    intakeDepth,
    offsetY: 0,
    plating: Boolean(body.plating),
    axis,
  };

  profile.noseX = axis.side.nose;
  profile.tailX = axis.side.tail;

  applySideSegmentProfiles(profile, body, percentToBody);

  const segmentGeometry = body.segments ? computeSegmentGeometry(body, axis) : null;
  const hullAnchors = createSideProfileAnchors(profile, body.segments, segmentGeometry, {
    allowFallback: true,
  });

  if (hullAnchors) {
    profile.hullAnchors = hullAnchors;
  }

  if (body.segments) {
    profile.segmentAnchors = hullAnchors;
  }

  const canopyPlacement = computeCanopyPlacement(body, cockpit);
  const fallbackCanopyHeight = cockpit?.height ?? percentToBody(12.9);
  const canopyHeight = clamp(
    fallbackCanopyHeight * 1.18,
    fallbackCanopyHeight * 0.95,
    dorsalHeight - percentToBody(1.4),
  );
  const canopyOffset = canopyPlacement.centerFromNose - canopyPlacement.length * 0.5;
  const canopyStart = clamp(canopyOffset, 0, body.length);
  const canopyEnd = clamp(canopyStart + canopyPlacement.length, 0, body.length);
  const canopyBaseEmbed = Math.max(percentToBody(1.0), canopyHeight * 0.18);
  const canopyStartTop = sampleHullTopY(profile, canopyStart);
  const canopyEndTop = sampleHullTopY(profile, canopyEnd);
  const canopy = {
    length: canopyPlacement.length,
    height: canopyHeight,
    offset: canopyStart,
    startPercent: canopyStart / body.length,
    endPercent: canopyEnd / body.length,
    centerPercent: canopyPlacement.centerPercent,
    offsetY: -(cockpit?.offsetY ?? 0) * 0.25,
    frame: clamp((cockpit?.width ?? percentToBody(20.0)) * 0.08, percentToBody(1.3), percentToBody(2.7)),
    tint: cockpit?.tint ?? "#7ed4ff",
    baseStart: canopyStartTop - (100 + (profile.offsetY ?? 0)) + canopyBaseEmbed,
    baseEnd: canopyEndTop - (100 + (profile.offsetY ?? 0)) + canopyBaseEmbed,
  };

  const planform = computeWingPlanform(body, wings);
  const wing = planform.enabled
    ? {
        enabled: true,
        position: planform.position,
        length: planform.length,
        positionPercent: planform.positionPercent,
        lengthPercent: planform.lengthPercent,
        profileSpan: planform.span,
        thickness: planform.thickness,
        dihedral: planform.dihedral,
        drop: planform.drop,
        // Preserve any explicit vertical offset instead of inferring it from the fore/aft mount.
        mountHeight: planform.mountHeight ?? 0,
        style: planform.style ?? wings?.style ?? "swept",
        accent: Boolean(wings?.tipAccent),
      }
    : {
        enabled: false,
        position: 0,
        length: 0,
        positionPercent: 0,
        lengthPercent: 0,
        profileSpan: 0,
        thickness: 0,
        dihedral: 0,
        drop: 0,
        mountHeight: 0,
        style: "swept",
        accent: false,
      };

  const stabiliser = fins
    ? {
        // Map top view dimensions directly to the side view so the fin footprint stays consistent.
        length: Math.max(percentToBody(8.6), fins.height),
        height: Math.max(percentToBody(5.7), fins.width * 1.05),
        sweep: Math.max(percentToBody(7.1), (wings?.forward ?? percentToBody(12.9)) * 0.5),
        thickness: Math.max(percentToBody(3.6), fins.width * 0.55),
        offsetY: ((fins.side ?? 0) - (fins.bottom ?? 0)) * baseHeight * 0.06,
        ventral: (fins.bottom ?? 0) > 0,
      }
    : null;

  const thruster = engine
    ? {
        count: Math.max(1, Math.round(engine.count)),
        radius: Math.max(percentToBody(2.9), engine.size * 0.45),
        spacing: Math.max(percentToBody(5.7), engine.spacing * 0.45),
        offsetY: 0,
        nozzleLength: Math.max(percentToBody(4.3), engine.nozzleLength * 0.65),
        glow: engine.glow,
        mountPercent: 1,
      }
    : null;

  const storedArmament = config.armament;
  let armament = null;

  if (storedArmament?.mount === "wing" && wing.enabled) {
    const hardpoints = Array.isArray(storedArmament.hardpoints)
      ? storedArmament.hardpoints.map((hardpoint) => ({
          chordRatio: clamp(hardpoint.chordRatio ?? 0.5, 0.1, 0.9),
          pylonLength: Math.max(percentToBody(2.9), hardpoint.pylonLength ?? planform.thickness * 0.6),
          payloadLength: Math.max(percentToBody(7.1), hardpoint.payloadLength ?? planform.length * 0.25),
          payloadRadius: Math.max(percentToBody(2.1), hardpoint.payloadRadius ?? planform.thickness * 0.35),
        }))
      : [];
    if (hardpoints.length) {
      armament = {
        mount: "wing",
        type: storedArmament.type === "missile" ? "missile" : "bomb",
        barrels: Math.max(1, Math.round(storedArmament.barrels ?? hardpoints.length)),
        hardpoints,
      };
    }
  } else if (storedArmament?.mount === "nose") {
    armament = {
      mount: "nose",
      barrels: Math.max(1, Math.round(storedArmament.barrels ?? 1)),
      length: Math.max(percentToBody(8.6), storedArmament.length ?? body.length * 0.1),
      spacing: Math.max(percentToBody(1.4), storedArmament.spacing ?? (wings?.thickness ?? percentToBody(7.1)) * 0.3),
      offsetY: -((cockpit?.offsetY ?? 0) / Math.max(halfLength, 1)) * (baseHeight * 0.2),
      housingHeight: Math.max(percentToBody(4.3), (cockpit?.height ?? percentToBody(12.9)) * 0.55),
      mountPercent: 0,
    };
  }

  const markings = {
    enabled: Boolean(details?.stripe),
    stripeLength: body.length * 0.25,
    stripeHeight: clamp(baseHeight * 0.3, baseHeight * 0.2, baseHeight * 0.45),
    stripeOffset: clamp(details?.stripeOffset ?? body.length * 0.3, body.length * 0.12, body.length * 0.85),
    stripeLift: clamp(-(cockpit?.offsetY ?? 0) * 0.4, -baseHeight * 0.3, baseHeight * 0.3),
  };
  if (markings.enabled) {
    // Persist stripe bounds as percentages so rendering in either projection stays in sync.
    const stripeStartPercent = clamp(markings.stripeOffset / body.length, 0, 1);
    const stripeEndPercent = clamp((markings.stripeOffset + markings.stripeLength) / body.length, 0, 1);
    markings.stripeStartPercent = stripeStartPercent;
    markings.stripeEndPercent = stripeEndPercent;
  }

  let antenna = null;
  if (details?.antenna) {
    const antennaDistance = clamp(body.length * 0.12, profile.noseLength * 0.35, profile.length * 0.22);
    const baseTop = sampleHullTopY(profile, antennaDistance);
    const baseOffset = baseTop - (100 + (profile.offsetY ?? 0)) + canopyBaseEmbed * 0.85;
    const slopeAhead = sampleHullTopY(profile, clamp(antennaDistance + percentToBody(8.6), 0, profile.length));
    const slopeBehind = sampleHullTopY(profile, clamp(antennaDistance - percentToBody(8.6), 0, profile.length));
    const lean = clamp((slopeBehind - slopeAhead) * 0.18, -percentToBody(4.3), percentToBody(2.9));
    antenna = {
      baseOffset,
      length: clamp(body.length * 0.12, percentToBody(10.0), dorsalHeight + percentToBody(7.1)),
      lean,
      beaconRadius: percentToBody(2.0),
      basePercent: antennaDistance / body.length,
    };
  }

  const lights = {
    nose: !antenna && Boolean(details?.antenna),
    dorsal: (fins?.top ?? 0) > 0,
    intake: hasIntakes,
  };

  return {
    profile,
    canopy,
    wing,
    stabiliser,
    thruster,
    armament,
    markings,
    lights,
    antenna,
    axis,
  };
}

function drawSideHull(root, config, geometry, axis) {
  const { palette } = config;
  const { profile } = geometry;
  const group = document.createElementNS(SVG_NS, "g");

  const hullGeometry = buildSideHullGeometry(profile);

  if (hullGeometry.segmentPaths) {
    const segmentOrder = ["front", "mid", "rear"];
    const shading = [0.08, 0, -0.08];
    segmentOrder.forEach((key, index) => {
      const pathData = hullGeometry.segmentPaths[key];
      if (!pathData) {
        return;
      }
      const segment = document.createElementNS(SVG_NS, "path");
      segment.setAttribute("d", pathData);
      segment.setAttribute(
        "fill",
        partColor("hull", shadeColor(palette.primary, shading[index] ?? 0)),
      );
      segment.setAttribute("stroke", "none");
      group.appendChild(segment);
    });

    if (profile.segmentAnchors?.boundaries) {
      const seamCommands = [];
      const { boundaries, topAnchors, bottomAnchors, noseX } = profile.segmentAnchors;
      const dividerOffsets = [boundaries.front, boundaries.mid];
      dividerOffsets.forEach((offset) => {
        const divider = buildSegmentDividerPath(topAnchors, bottomAnchors, noseX, offset);
        if (divider) {
          seamCommands.push(divider);
        }
      });
      if (seamCommands.length) {
        const seams = document.createElementNS(SVG_NS, "path");
        seams.setAttribute("d", seamCommands.join(" "));
        seams.setAttribute("stroke", mixColor(palette.trim, palette.accent, 0.4));
        seams.setAttribute("stroke-width", 1.2);
        seams.setAttribute("stroke-linecap", "round");
        seams.setAttribute("fill", "none");
        seams.setAttribute("opacity", "0.75");
        group.appendChild(seams);
      }
    }

    const outline = document.createElementNS(SVG_NS, "path");
    outline.setAttribute("d", hullGeometry.hullPath);
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", palette.accent);
    outline.setAttribute("stroke-width", 2.4);
    outline.setAttribute("stroke-linejoin", "round");
    group.appendChild(outline);
  } else {
    const hull = document.createElementNS(SVG_NS, "path");
    hull.setAttribute("d", hullGeometry.hullPath);
    hull.setAttribute("fill", partColor("hull", palette.primary));
    hull.setAttribute("stroke", palette.accent);
    hull.setAttribute("stroke-width", 2.4);
    hull.setAttribute("stroke-linejoin", "round");
    group.appendChild(hull);
  }

  if (profile.plating) {
    const plating = document.createElementNS(SVG_NS, "path");
    plating.setAttribute("d", buildSidePanelLines(profile));
    plating.setAttribute("stroke", mixColor(palette.trim, palette.accent, 0.4));
    plating.setAttribute("stroke-width", 1.2);
    plating.setAttribute("stroke-linecap", "round");
    plating.setAttribute("fill", "none");
    plating.setAttribute("opacity", "0.6");
    group.appendChild(plating);
  }

  if (profile.intakeHeight > 0 && profile.intakeDepth > 0) {
    const intake = document.createElementNS(SVG_NS, "path");
    intake.setAttribute("d", buildSideIntakePath(profile));
    intake.setAttribute("fill", partColor("hull", shadeColor(palette.secondary, -0.2)));
    intake.setAttribute("stroke", palette.trim);
    intake.setAttribute("stroke-width", 1.2);
    group.appendChild(intake);
  }

  root.appendChild(group);
}

function drawSideAntenna(root, config, geometry, axis) {
  const { palette } = config;
  const { antenna, profile } = geometry;
  if (!antenna) {
    return;
  }

  const centerY = 100 + (profile.offsetY ?? 0);
  const baseX = axis.percentToSideX(antenna.basePercent ?? 0);
  const baseY = centerY + antenna.baseOffset;
  const tipX = baseX + (antenna.lean ?? 0);
  const tipY = baseY - antenna.length;

  const mast = document.createElementNS(SVG_NS, "line");
  mast.setAttribute("x1", baseX.toString());
  mast.setAttribute("y1", baseY.toString());
  mast.setAttribute("x2", tipX.toString());
  mast.setAttribute("y2", tipY.toString());
  mast.setAttribute("stroke", partStroke("details", palette.trim));
  mast.setAttribute("stroke-width", "1.6");
  mast.setAttribute("stroke-linecap", "round");

  const beacon = document.createElementNS(SVG_NS, "circle");
  beacon.setAttribute("cx", tipX.toString());
  beacon.setAttribute("cy", (tipY - antenna.beaconRadius * 0.6).toString());
  beacon.setAttribute("r", antenna.beaconRadius.toString());
  beacon.setAttribute("fill", partColor("lights", palette.glow));
  beacon.setAttribute("opacity", "0.9");

  root.append(mast, beacon);
}

function drawSideWing(root, config, geometry, axis) {
  const { palette } = config;
  const { wing: wingProfile, profile } = geometry;
  if (!wingProfile?.enabled) {
    return;
  }

  const points = buildSideWingPoints(wingProfile, profile, axis);
  const wing = document.createElementNS(SVG_NS, "polygon");
  wing.setAttribute("points", pointsToString(points));
  wing.setAttribute("fill", partColor("wing", shadeColor(palette.secondary, -0.1)));
  wing.setAttribute("stroke", palette.trim);
  wing.setAttribute("stroke-width", 1.8);
  wing.setAttribute("stroke-linejoin", "round");
  root.appendChild(wing);

  if (wingProfile.accent) {
    const accent = document.createElementNS(SVG_NS, "polyline");
    accent.setAttribute("points", pointsToString([points[0], points[1], points[2]]));
    accent.setAttribute("stroke", partStroke("wing", palette.accent));
    accent.setAttribute("stroke-width", 2);
    accent.setAttribute("fill", "none");
    root.appendChild(accent);
  }
}

function drawSideStabiliser(root, config, geometry, axis) {
  const { palette } = config;
  const { stabiliser, profile } = geometry;
  if (!stabiliser) {
    return;
  }
  const tailX = axis.percentToSideX(1);
  const tailBase = tailX - stabiliser.length;
  const baseY = 100 + (profile.offsetY ?? 0) + (stabiliser.offsetY ?? 0);

  const fin = document.createElementNS(SVG_NS, "polygon");
  const finPoints = [
    [tailBase, baseY],
    [tailBase + stabiliser.length * 0.48, baseY - stabiliser.height],
    [tailBase + stabiliser.length, baseY - stabiliser.height * 0.55],
    [tailBase + stabiliser.length * 0.22, baseY + stabiliser.thickness * 0.2],
  ];
  fin.setAttribute("points", pointsToString(finPoints));
  fin.setAttribute("fill", partColor("stabiliser", shadeColor(palette.secondary, 0.05)));
  fin.setAttribute("stroke", partStroke("stabiliser", palette.trim));
  fin.setAttribute("stroke-width", 1.6);
  fin.setAttribute("stroke-linejoin", "round");
  root.appendChild(fin);

  if (stabiliser.ventral) {
    const ventral = document.createElementNS(SVG_NS, "polygon");
    const ventralPoints = [
      [tailBase + stabiliser.length * 0.18, baseY + stabiliser.thickness * 0.3],
      [tailBase + stabiliser.length * 0.52, baseY + stabiliser.height * 0.6],
      [tailBase + stabiliser.length * 0.78, baseY + stabiliser.height * 0.5],
      [tailBase + stabiliser.length * 0.32, baseY + stabiliser.thickness * 0.1],
    ];
    ventral.setAttribute("points", pointsToString(ventralPoints));
    ventral.setAttribute("fill", partColor("stabiliser", shadeColor(palette.secondary, -0.15)));
    ventral.setAttribute("stroke", partStroke("stabiliser", palette.trim));
    ventral.setAttribute("stroke-width", 1.4);
    ventral.setAttribute("stroke-linejoin", "round");
    root.appendChild(ventral);
  }
}

function drawSideCanopy(root, config, geometry, axis, defs) {
  const { palette } = config;
  const { canopy, profile } = geometry;
  if (!canopy) {
    return;
  }

  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  const gradientId = `side-canopy-${config.id}-${renderCounter += 1}`;
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("x2", "100%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("y2", "100%");

  const canopyColor = partColor("canopy", canopy.tint);
  const highlightColor = debugColorsEnabled ? canopyColor : mixColor(canopy.tint, "#ffffff", 0.4);
  const midColor = debugColorsEnabled ? canopyColor : canopy.tint;
  const shadowColor = debugColorsEnabled ? canopyColor : shadeColor(canopy.tint, -0.3);

  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", highlightColor);
  stop1.setAttribute("stop-opacity", "0.9");
  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "65%");
  stop2.setAttribute("stop-color", midColor);
  stop2.setAttribute("stop-opacity", "0.95");
  const stop3 = document.createElementNS(SVG_NS, "stop");
  stop3.setAttribute("offset", "100%");
  stop3.setAttribute("stop-color", shadowColor);
  stop3.setAttribute("stop-opacity", "0.9");
  gradient.append(stop1, stop2, stop3);
  defs.appendChild(gradient);

  const baseX = axis.percentToSideX(canopy.startPercent ?? 0);
  const endX = axis.percentToSideX(canopy.endPercent ?? canopy.startPercent ?? 0);
  const centerY = 100 + (profile.offsetY ?? 0);
  const verticalShift = canopy.offsetY ?? 0;
  const baseStartY = centerY + canopy.baseStart + verticalShift;
  const baseEndY = centerY + canopy.baseEnd + verticalShift;
  const apexX = baseX + canopy.length / 2;
  const apexY = Math.min(baseStartY, baseEndY) - canopy.height;
  const frameStartX = baseX + canopy.length * 0.08;
  const frameEndX = endX - canopy.length * 0.08;
  const frameStartY = lerp(baseStartY, baseEndY, 0.08);
  const frameEndY = lerp(baseStartY, baseEndY, 0.92);

  const canopyShape = document.createElementNS(SVG_NS, "path");
  const canopyPath = [
    `M ${baseX} ${baseStartY}`,
    `Q ${apexX} ${apexY} ${endX} ${baseEndY}`,
    `Q ${apexX} ${Math.max(baseStartY, baseEndY) - canopy.height * 0.25} ${baseX} ${baseStartY}`,
    "Z",
  ].join(" ");
  canopyShape.setAttribute("d", canopyPath);
  canopyShape.setAttribute("fill", `url(#${gradientId})`);
  canopyShape.setAttribute("stroke", debugColorsEnabled ? canopyColor : palette.trim);
  canopyShape.setAttribute("stroke-width", canopy.frame);
  canopyShape.setAttribute("stroke-linejoin", "round");
  root.appendChild(canopyShape);

  const frame = document.createElementNS(SVG_NS, "path");
  const framePath = `M ${frameStartX} ${frameStartY} Q ${apexX} ${apexY + canopy.height * 0.1} ${frameEndX} ${frameEndY}`;
  frame.setAttribute("d", framePath);
  frame.setAttribute(
    "stroke",
    debugColorsEnabled ? canopyColor : mixColor(palette.trim, palette.accent, 0.5),
  );
  frame.setAttribute("stroke-width", canopy.frame * 0.7);
  frame.setAttribute("stroke-linecap", "round");
  frame.setAttribute("fill", "none");
  root.appendChild(frame);
}

function drawSideThrusters(root, config, geometry, axis) {
  const { palette } = config;
  const { thruster, profile } = geometry;
  if (!thruster) {
    return;
  }
  const tailX = axis.percentToSideX(1);
  const baseY = 100 + (profile.offsetY ?? 0) + (thruster.offsetY ?? 0);
  const group = document.createElementNS(SVG_NS, "g");
  const thrusterBodyColor = partColor("thruster", shadeColor(palette.secondary, -0.05));
  const thrusterNozzleColor = partColor(
    "thruster",
    mixColor(palette.secondary, palette.accent, 0.35),
  );
  const exhaustColor = partColor("exhaust", thruster.glow);

  for (let i = 0; i < thruster.count; i += 1) {
    const offset = i - (thruster.count - 1) / 2;
    const y = baseY + offset * thruster.spacing;
    const housing = document.createElementNS(SVG_NS, "rect");
    const housingHeight = thruster.radius * 1.8;
    const housingWidth = thruster.radius * 1.6;
    housing.setAttribute("x", (tailX - thruster.nozzleLength - housingWidth).toString());
    housing.setAttribute("y", (y - housingHeight / 2).toString());
    housing.setAttribute("width", housingWidth.toString());
    housing.setAttribute("height", housingHeight.toString());
    housing.setAttribute("rx", (thruster.radius * 0.4).toString());
    housing.setAttribute("fill", thrusterBodyColor);
    housing.setAttribute("stroke", palette.trim);
    housing.setAttribute("stroke-width", 1.4);

    const nozzle = document.createElementNS(SVG_NS, "rect");
    nozzle.setAttribute("x", (tailX - thruster.nozzleLength).toString());
    nozzle.setAttribute("y", (y - thruster.radius * 0.75).toString());
    nozzle.setAttribute("width", thruster.nozzleLength.toString());
    nozzle.setAttribute("height", (thruster.radius * 1.5).toString());
    nozzle.setAttribute("rx", (thruster.radius * 0.3).toString());
    nozzle.setAttribute("fill", thrusterNozzleColor);
    nozzle.setAttribute("stroke", palette.trim);
    nozzle.setAttribute("stroke-width", 1.2);

    const flame = document.createElementNS(SVG_NS, "polygon");
    const flameReach = Math.max(thruster.nozzleLength * 0.85, thruster.radius * 1.2);
    const flamePoints = [
      [tailX, y - thruster.radius * 0.35],
      [tailX - flameReach, y],
      [tailX, y + thruster.radius * 0.35],
    ];
    flame.setAttribute("points", pointsToString(flamePoints));
    flame.setAttribute("fill", exhaustColor);
    flame.setAttribute("opacity", "0.85");
    flame.classList.add("thruster-flame", "thruster-flame--horizontal");

    const glow = document.createElementNS(SVG_NS, "circle");
    glow.setAttribute("cx", tailX.toString());
    glow.setAttribute("cy", y.toString());
    glow.setAttribute("r", (thruster.radius * 0.85).toString());
    glow.setAttribute("fill", exhaustColor);
    glow.setAttribute("opacity", "0.85");

    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("cx", tailX.toString());
    core.setAttribute("cy", y.toString());
    core.setAttribute("r", (thruster.radius * 0.4).toString());
    core.setAttribute(
      "fill",
      debugColorsEnabled ? exhaustColor : mixColor(thruster.glow, "#ffffff", 0.5),
    );
    core.setAttribute("opacity", "0.9");

    group.append(housing, nozzle, flame, glow, core);
  }

  root.appendChild(group);
}

function drawSideWeapons(root, config, geometry, axis) {
  const { palette } = config;
  const { armament, profile, wing } = geometry;
  if (!armament) {
    return;
  }

  if (armament.mount === "wing" && wing?.enabled && armament.hardpoints?.length) {
    // Render ordnance pods under the visible wing hardpoints so they remain readable in profile.
    const centerY = 100 + (profile.offsetY ?? 0);
    const wingBaseY = centerY + wing.mountHeight + wing.thickness;
    const ordnanceColor = partColor("weapons", shadeColor(palette.secondary, -0.1));
    const pylonColor = partColor("weapons", shadeColor(palette.secondary, -0.25));
    const accentColor = partStroke("weapons", palette.trim);
    const tipColor = partColor("weapons", mixColor(palette.accent, palette.secondary, 0.4));

    armament.hardpoints.forEach((hardpoint) => {
      // Mirror the top-view clamp to keep the profile ordnance aligned with the wing.
      const anchorPercent = clamp(wing.positionPercent + wing.lengthPercent * hardpoint.chordRatio, 0, 1);
      const anchorX = axis.percentToSideX(anchorPercent);
      const pylonLength = hardpoint.pylonLength ?? Math.max(wing.thickness * 0.6, 8);
      const payloadLength = hardpoint.payloadLength ?? Math.max(18, wing.length * 0.3);
      const payloadRadius = hardpoint.payloadRadius ?? Math.max(5, wing.thickness * 0.35);
      const pylonTop = wingBaseY - 1;
      const pylonBottom = pylonTop + pylonLength;
      const payloadCenterY = pylonBottom + payloadRadius;
      const bodyHeight = payloadRadius * 2;
      const bodyX = anchorX - payloadLength * 0.55;

      const group = document.createElementNS(SVG_NS, "g");
      group.classList.add("wing-ordnance");

      const pylon = document.createElementNS(SVG_NS, "rect");
      pylon.setAttribute("x", (anchorX - 2).toString());
      pylon.setAttribute("y", pylonTop.toString());
      pylon.setAttribute("width", "4");
      pylon.setAttribute("height", (pylonLength + 2).toString());
      pylon.setAttribute("rx", "1.6");
      pylon.setAttribute("fill", pylonColor);
      pylon.setAttribute("stroke", accentColor);
      pylon.setAttribute("stroke-width", 1);

      const body = document.createElementNS(SVG_NS, "rect");
      body.setAttribute("x", bodyX.toString());
      body.setAttribute("y", (payloadCenterY - bodyHeight / 2).toString());
      body.setAttribute("width", payloadLength.toString());
      body.setAttribute("height", bodyHeight.toString());
      body.setAttribute("rx", (armament.type === "bomb" ? payloadRadius : payloadRadius * 0.5).toString());
      body.setAttribute("fill", ordnanceColor);
      body.setAttribute("stroke", accentColor);
      body.setAttribute("stroke-width", 1.1);

      group.append(pylon, body);

      if (armament.type === "missile") {
        const tip = document.createElementNS(SVG_NS, "polygon");
        const tipPoints = [
          [bodyX, payloadCenterY - bodyHeight / 2],
          [bodyX - payloadLength * 0.22, payloadCenterY],
          [bodyX, payloadCenterY + bodyHeight / 2],
        ];
        tip.setAttribute("points", pointsToString(tipPoints));
        tip.setAttribute("fill", tipColor);
        tip.setAttribute("stroke", accentColor);
        tip.setAttribute("stroke-width", 1);

        const fins = document.createElementNS(SVG_NS, "polygon");
        const finBaseX = bodyX + payloadLength;
        const finSpread = Math.max(3, payloadRadius * 0.8);
        const finPoints = [
          [finBaseX, payloadCenterY - finSpread],
          [finBaseX + payloadLength * 0.18, payloadCenterY],
          [finBaseX, payloadCenterY + finSpread],
        ];
        fins.setAttribute("points", pointsToString(finPoints));
        fins.setAttribute("fill", partColor("weapons", shadeColor(palette.accent, -0.15)));
        fins.setAttribute("opacity", "0.75");

        group.append(tip, fins);
      } else {
        const noseCap = document.createElementNS(SVG_NS, "circle");
        noseCap.setAttribute("cx", (bodyX - payloadRadius * 0.15).toString());
        noseCap.setAttribute("cy", payloadCenterY.toString());
        noseCap.setAttribute("r", (payloadRadius * 0.45).toString());
        noseCap.setAttribute("fill", tipColor);
        noseCap.setAttribute("stroke", accentColor);
        noseCap.setAttribute("stroke-width", 0.9);

        const band = document.createElementNS(SVG_NS, "rect");
        band.setAttribute("x", (bodyX + payloadLength * 0.42).toString());
        band.setAttribute("y", (payloadCenterY - bodyHeight / 2).toString());
        band.setAttribute("width", (payloadLength * 0.16).toString());
        band.setAttribute("height", bodyHeight.toString());
        band.setAttribute("fill", partColor("weapons", mixColor(palette.accent, palette.trim, 0.45)));
        band.setAttribute("opacity", "0.65");

        group.append(noseCap, band);
      }

      root.appendChild(group);
    });

    return;
  }

  if (armament.mount !== "nose") {
    return;
  }

  const noseX = axis.percentToSideX(armament.mountPercent ?? 0);
  const baseX = noseX - armament.length;
  const baseY = 100 + (profile.offsetY ?? 0) + (armament.offsetY ?? 0);

  for (let i = 0; i < armament.barrels; i += 1) {
    const offset = i - (armament.barrels - 1) / 2;
    const y = baseY + offset * armament.spacing;

    const housing = document.createElementNS(SVG_NS, "rect");
    const housingWidth = armament.length * 0.3;
    housing.setAttribute("x", (noseX - housingWidth).toString());
    housing.setAttribute("y", (y - armament.housingHeight / 2).toString());
    housing.setAttribute("width", housingWidth.toString());
    housing.setAttribute("height", armament.housingHeight.toString());
    housing.setAttribute("rx", (armament.housingHeight * 0.25).toString());
    housing.setAttribute("fill", partColor("weapons", shadeColor(palette.secondary, -0.1)));
    housing.setAttribute("stroke", partStroke("weapons", palette.trim));
    housing.setAttribute("stroke-width", 1.2);

    const barrel = document.createElementNS(SVG_NS, "line");
    barrel.setAttribute("x1", baseX.toString());
    barrel.setAttribute("y1", y.toString());
    barrel.setAttribute("x2", (noseX + 2).toString());
    barrel.setAttribute("y2", (y - armament.housingHeight * 0.1).toString());
    barrel.setAttribute("stroke", partStroke("weapons", palette.trim));
    barrel.setAttribute("stroke-width", 2.2);
    barrel.setAttribute("stroke-linecap", "round");

    const muzzle = document.createElementNS(SVG_NS, "circle");
    muzzle.setAttribute("cx", baseX.toString());
    muzzle.setAttribute("cy", y.toString());
    muzzle.setAttribute("r", (armament.housingHeight * 0.25).toString());
    muzzle.setAttribute("fill", partColor("weapons", shadeColor(palette.accent, -0.2)));

    root.append(housing, barrel, muzzle);
  }
}

function drawSideMarkings(root, config, geometry, axis) {
  const { palette } = config;
  const { markings, profile } = geometry;
  if (!markings?.enabled) {
    return;
  }
  // Clamp stored stripe bounds before projecting them into screen space.
  const startPercent = clamp(markings.stripeStartPercent ?? 0, 0, 1);
  const startX = axis.percentToSideX(startPercent);
  // Respect both the tail taper and the hull bounds when limiting the stripe end.
  const endLimitPercent = clamp(
    Math.min(markings.stripeEndPercent ?? 1, 1 - (profile.tailLength / profile.length) * 0.6),
    0,
    1,
  );
  const endX = axis.percentToSideX(endLimitPercent);
  const midY = 100 + (profile.offsetY ?? 0) + (markings.stripeLift ?? 0);
  const stripeHeight = markings.stripeHeight;

  const stripe = document.createElementNS(SVG_NS, "path");
  const stripePath = [
    `M ${startX} ${midY - stripeHeight * 0.6}`,
    `L ${endX} ${midY - stripeHeight * 0.3}`,
    `L ${endX} ${midY + stripeHeight * 0.4}`,
    `L ${startX} ${midY + stripeHeight * 0.2}`,
    "Z",
  ].join(" ");
  stripe.setAttribute("d", stripePath);
  stripe.setAttribute("fill", partColor("markings", palette.accent));
  stripe.setAttribute("opacity", "0.65");
  stripe.setAttribute("stroke", partStroke("markings", mixColor(palette.accent, palette.trim, 0.3)));
  stripe.setAttribute("stroke-width", 1.4);
  stripe.setAttribute("stroke-linejoin", "round");
  root.appendChild(stripe);
}

function drawSideLights(root, config, geometry, axis) {
  const { palette } = config;
  const { lights, profile } = geometry;
  if (!lights) {
    return;
  }
  const noseX = axis.percentToSideX(0);
  const tailX = axis.percentToSideX(1);
  const centerY = 100 + (profile.offsetY ?? 0);

  if (lights.nose) {
    const noseLight = document.createElementNS(SVG_NS, "circle");
    noseLight.setAttribute("cx", (noseX - 4).toString());
    noseLight.setAttribute("cy", (centerY - profile.noseHeight * 0.1).toString());
    noseLight.setAttribute("r", "2.6");
    noseLight.setAttribute("fill", partColor("lights", palette.glow));
    noseLight.setAttribute("opacity", "0.85");
    root.appendChild(noseLight);
  }

  if (lights.dorsal) {
    const dorsal = document.createElementNS(SVG_NS, "circle");
    const dorsalPercent = clamp((profile.noseLength + profile.length * 0.36) / profile.length, 0, 1);
    dorsal.setAttribute("cx", axis.percentToSideX(dorsalPercent).toString());
    dorsal.setAttribute("cy", (centerY - profile.dorsalHeight - 6).toString());
    dorsal.setAttribute("r", "2.2");
    dorsal.setAttribute(
      "fill",
      debugColorsEnabled ? partColor("lights", palette.glow) : mixColor(palette.glow, "#ffffff", 0.2),
    );
    dorsal.setAttribute("opacity", "0.75");
    root.appendChild(dorsal);
  }

  if (lights.intake && profile.intakeHeight > 0) {
    const intake = document.createElementNS(SVG_NS, "circle");
    const intakePercent = clamp((profile.noseLength * 0.7) / profile.length, 0, 1);
    intake.setAttribute("cx", axis.percentToSideX(intakePercent).toString());
    intake.setAttribute("cy", (centerY + profile.ventralDepth - 6).toString());
    intake.setAttribute("r", "2.4");
    intake.setAttribute(
      "fill",
      debugColorsEnabled ? partColor("lights", palette.glow) : mixColor(palette.glow, palette.trim, 0.4),
    );
    intake.setAttribute("opacity", "0.7");
    root.appendChild(intake);
  }

  const tailBeacon = document.createElementNS(SVG_NS, "circle");
  tailBeacon.setAttribute("cx", tailX.toString());
  tailBeacon.setAttribute("cy", (centerY - profile.tailHeight * 0.3).toString());
  tailBeacon.setAttribute("r", "2");
  tailBeacon.setAttribute("fill", partColor("lights", palette.trim));
  tailBeacon.setAttribute("opacity", "0.6");
  root.appendChild(tailBeacon);
}

function drawBody(root, config, axis) {
  const { body, palette } = config;

  if (body.segments) {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("fill", partColor("hull", palette.primary));

    const segments = buildBodySegmentPaths(body);
    [segments.front, segments.mid, segments.rear].forEach((d) => {
      const segmentPath = document.createElementNS(SVG_NS, "path");
      segmentPath.setAttribute("d", d);
      segmentPath.setAttribute("stroke", "none");
      group.appendChild(segmentPath);
    });

    const outline = document.createElementNS(SVG_NS, "path");
    outline.setAttribute("d", buildBodyPath(body));
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", palette.accent);
    outline.setAttribute("stroke-width", 2.4);
    outline.setAttribute("stroke-linejoin", "round");
    group.appendChild(outline);

    root.appendChild(group);
  } else {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", buildBodyPath(body));
    path.setAttribute("fill", partColor("hull", palette.primary));
    path.setAttribute("stroke", palette.accent);
    path.setAttribute("stroke-width", 2.4);
    path.setAttribute("stroke-linejoin", "round");
    root.appendChild(path);
  }

  if (body.plating) {
    const lines = document.createElementNS(SVG_NS, "path");
    lines.setAttribute("d", buildPlatingPath(body));
    lines.setAttribute("stroke", mixColor(palette.accent, palette.trim, 0.35));
    lines.setAttribute("stroke-width", 1.2);
    lines.setAttribute("stroke-linecap", "round");
    lines.setAttribute("fill", "none");
    lines.setAttribute("opacity", "0.7");
    root.appendChild(lines);
  }
}

function drawWings(root, config, axis) {
  const { wings, body, palette } = config;
  if (!wings || wings.enabled === false) {
    return;
  }
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("fill", partColor("wing", palette.secondary));
  group.setAttribute("stroke", palette.trim);
  group.setAttribute("stroke-width", 1.6);
  group.setAttribute("stroke-linejoin", "round");

  const leftPoints = buildWingPoints(wings, body, axis, true);
  const rightPoints = buildWingPoints(wings, body, axis, false);

  const left = document.createElementNS(SVG_NS, "polygon");
  left.setAttribute("points", pointsToString(leftPoints));
  const right = document.createElementNS(SVG_NS, "polygon");
  right.setAttribute("points", pointsToString(rightPoints));

  group.append(left, right);

  if (wings.tipAccent) {
    const accentLeft = document.createElementNS(SVG_NS, "polyline");
    accentLeft.setAttribute("points", pointsToString(buildWingAccent(leftPoints)));
    accentLeft.setAttribute("stroke", partStroke("wing", palette.accent));
    accentLeft.setAttribute("stroke-width", 2.2);
    const accentRight = document.createElementNS(SVG_NS, "polyline");
    accentRight.setAttribute("points", pointsToString(buildWingAccent(rightPoints)));
    accentRight.setAttribute("stroke", partStroke("wing", palette.accent));
    accentRight.setAttribute("stroke-width", 2.2);
    group.append(accentLeft, accentRight);
  }

  root.appendChild(group);
}

function drawTopArmament(root, config, axis) {
  const { armament, palette, body, wings } = config;
  if (!armament) {
    return;
  }

  if (armament.mount === "wing") {
    if (!wings?.enabled || !armament.hardpoints?.length) {
      return;
    }

    const planform = computeWingPlanform(body, wings);
    if (!planform.enabled) {
      return;
    }

    const wingMountPercent = axis.length > 0 ? clamp(0.5 + (wings.offsetY ?? 0) / axis.length, 0, 1) : 0.5;
    const baseWingY = axis.percentToTopY(wingMountPercent);
    const ordnanceColor = partColor("weapons", shadeColor(palette.secondary, -0.1));
    const accentColor = partStroke("weapons", palette.trim);
    const pylonColor = partColor("weapons", shadeColor(palette.secondary, -0.25));

    armament.hardpoints.forEach((hardpoint) => {
      const chordRatio = clamp(hardpoint.chordRatio ?? 0.5, 0.1, 0.9);
      // Clamp to the hull span so missiles cannot float behind the tail.
      const anchorPercent = clamp(planform.positionPercent + planform.lengthPercent * chordRatio, 0, 1);
      const anchorY = axis.percentToTopY(anchorPercent);
      const payloadLength = hardpoint.payloadLength ?? Math.max(18, planform.length * 0.3);
      const payloadRadius = hardpoint.payloadRadius ?? Math.max(5, planform.thickness * 0.35);
      const pylonLength = hardpoint.pylonLength ?? Math.max(planform.thickness * 0.6, 8);
      const payloadOffsetY = baseWingY + planform.thickness * 0.25 + pylonLength + payloadRadius;
      const ordnanceHeight = armament.type === "missile" ? Math.max(payloadLength * 0.6, payloadRadius * 1.8) : payloadRadius * 2;

      [-1, 1].forEach((direction) => {
        const sideGroup = document.createElementNS(SVG_NS, "g");
        sideGroup.classList.add("wing-ordnance-top");

        const lateralBase = 100 + direction * (body.halfWidth + Math.max(planform.span * 0.45, 10));
        const pylonTopY = anchorY + planform.thickness * 0.1;
        const pylon = document.createElementNS(SVG_NS, "rect");
        pylon.setAttribute("x", (lateralBase - 1.6).toString());
        pylon.setAttribute("y", pylonTopY.toString());
        pylon.setAttribute("width", "3.2");
        pylon.setAttribute("height", pylonLength.toString());
        pylon.setAttribute("rx", "1.2");
        pylon.setAttribute("fill", pylonColor);
        pylon.setAttribute("stroke", accentColor);
        pylon.setAttribute("stroke-width", 0.9);

        if (armament.type === "missile") {
          const payload = document.createElementNS(SVG_NS, "rect");
          payload.setAttribute("x", (lateralBase - payloadRadius).toString());
          payload.setAttribute("y", (payloadOffsetY - ordnanceHeight).toString());
          payload.setAttribute("width", (payloadRadius * 2).toString());
          payload.setAttribute("height", ordnanceHeight.toString());
          payload.setAttribute("rx", (payloadRadius * 0.55).toString());
          payload.setAttribute("fill", ordnanceColor);
          payload.setAttribute("stroke", accentColor);
          payload.setAttribute("stroke-width", 1);

          const tip = document.createElementNS(SVG_NS, "polygon");
          const tipLength = Math.max(payloadLength * 0.28, payloadRadius * 0.9);
          const tipPoints = [
            [lateralBase - payloadRadius, payloadOffsetY - ordnanceHeight],
            [lateralBase, payloadOffsetY - ordnanceHeight - tipLength],
            [lateralBase + payloadRadius, payloadOffsetY - ordnanceHeight],
          ];
          tip.setAttribute("points", pointsToString(tipPoints));
          tip.setAttribute("fill", partColor("weapons", mixColor(palette.accent, palette.secondary, 0.4)));
          tip.setAttribute("stroke", accentColor);
          tip.setAttribute("stroke-width", 1);

          const fins = document.createElementNS(SVG_NS, "rect");
          fins.setAttribute("x", (lateralBase - payloadRadius * 0.9).toString());
          fins.setAttribute("y", (payloadOffsetY - payloadRadius * 0.4).toString());
          fins.setAttribute("width", (payloadRadius * 1.8).toString());
          fins.setAttribute("height", (payloadRadius * 0.8).toString());
          fins.setAttribute("fill", partColor("weapons", shadeColor(palette.accent, -0.15)));
          fins.setAttribute("opacity", "0.75");

          sideGroup.append(pylon, payload, tip, fins);
        } else {
          const payload = document.createElementNS(SVG_NS, "ellipse");
          payload.setAttribute("cx", lateralBase.toString());
          payload.setAttribute("cy", payloadOffsetY.toString());
          payload.setAttribute("rx", payloadRadius.toString());
          payload.setAttribute("ry", Math.max(payloadRadius * 0.75, payloadLength * 0.35).toString());
          payload.setAttribute("fill", ordnanceColor);
          payload.setAttribute("stroke", accentColor);
          payload.setAttribute("stroke-width", 1);

          const noseCap = document.createElementNS(SVG_NS, "circle");
          noseCap.setAttribute("cx", lateralBase.toString());
          noseCap.setAttribute("cy", (payloadOffsetY - Math.max(payloadRadius * 0.6, payloadLength * 0.25)).toString());
          noseCap.setAttribute("r", (payloadRadius * 0.55).toString());
          noseCap.setAttribute("fill", partColor("weapons", mixColor(palette.accent, palette.secondary, 0.35)));

          sideGroup.append(pylon, payload, noseCap);
        }

        root.appendChild(sideGroup);
      });
    });

    return;
  }

  if (armament.mount !== "nose") {
    return;
  }

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("nose-armament-top");
  const noseY = axis.top.nose;
  const baseY = noseY - armament.length;
  const spacing = armament.spacing ?? 0;
  const housingWidth = armament.housingWidth ?? Math.max(6, (spacing || body.halfWidth * 0.35) * 1.2);
  const barrelWidth = Math.max(2.4, housingWidth * 0.3);

  for (let i = 0; i < (armament.barrels ?? 1); i += 1) {
    const offset = i - ((armament.barrels ?? 1) - 1) / 2;
    const centerX = 100 + offset * spacing;

    const housing = document.createElementNS(SVG_NS, "rect");
    housing.setAttribute("x", (centerX - housingWidth / 2).toString());
    housing.setAttribute("y", (noseY - Math.max(6, armament.length * 0.35)).toString());
    housing.setAttribute("width", housingWidth.toString());
    housing.setAttribute("height", Math.max(6, armament.length * 0.35).toString());
    housing.setAttribute("rx", (housingWidth * 0.35).toString());
    housing.setAttribute("fill", partColor("weapons", shadeColor(palette.secondary, -0.1)));
    housing.setAttribute("stroke", partStroke("weapons", palette.trim));
    housing.setAttribute("stroke-width", 1);

    const barrel = document.createElementNS(SVG_NS, "rect");
    barrel.setAttribute("x", (centerX - barrelWidth / 2).toString());
    barrel.setAttribute("y", baseY.toString());
    barrel.setAttribute("width", barrelWidth.toString());
    barrel.setAttribute("height", armament.length.toString());
    barrel.setAttribute("rx", (barrelWidth * 0.45).toString());
    barrel.setAttribute("fill", partColor("weapons", shadeColor(palette.accent, -0.15)));
    barrel.setAttribute("stroke", partStroke("weapons", palette.trim));
    barrel.setAttribute("stroke-width", 1);

    const muzzle = document.createElementNS(SVG_NS, "circle");
    muzzle.setAttribute("cx", centerX.toString());
    muzzle.setAttribute("cy", baseY.toString());
    muzzle.setAttribute("r", (barrelWidth * 0.55).toString());
    muzzle.setAttribute("fill", partColor("weapons", mixColor(palette.accent, palette.secondary, 0.5)));

    group.append(housing, barrel, muzzle);
  }

  root.appendChild(group);
}

function drawCockpit(root, config, axis, defs) {
  const { cockpit, palette, body } = config;
  const gradient = document.createElementNS(SVG_NS, "radialGradient");
  const gradientId = `cockpit-${config.id}-${renderCounter += 1}`;
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("cx", "50%");
  gradient.setAttribute("cy", "40%");
  gradient.setAttribute("r", "70%");

  const canopyColor = partColor("canopy", cockpit.tint);
  const highlightColor = debugColorsEnabled ? canopyColor : mixColor(cockpit.tint, "#ffffff", 0.4);
  const midColor = debugColorsEnabled ? canopyColor : cockpit.tint;
  const shadowColor = debugColorsEnabled ? canopyColor : shadeColor(cockpit.tint, -0.25);

  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", highlightColor);
  stop1.setAttribute("stop-opacity", "0.9");

  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "60%");
  stop2.setAttribute("stop-color", midColor);
  stop2.setAttribute("stop-opacity", "0.95");

  const stop3 = document.createElementNS(SVG_NS, "stop");
  stop3.setAttribute("offset", "100%");
  stop3.setAttribute("stop-color", shadowColor);
  stop3.setAttribute("stop-opacity", "0.9");

  gradient.append(stop1, stop2, stop3);
  defs.appendChild(gradient);

  const canopyPlacement = computeCanopyPlacement(body, cockpit);
  const centerY = axis.percentToTopY(canopyPlacement.centerPercent);
  const ellipse = document.createElementNS(SVG_NS, "ellipse");
  ellipse.setAttribute("cx", "100");
  ellipse.setAttribute("cy", centerY.toString());
  ellipse.setAttribute("rx", (cockpit.width / 2).toString());
  ellipse.setAttribute("ry", (cockpit.height / 2).toString());
  ellipse.setAttribute("fill", `url(#${gradientId})`);
  ellipse.setAttribute("stroke", debugColorsEnabled ? canopyColor : palette.trim);
  ellipse.setAttribute("stroke-width", 2);

  const frame = document.createElementNS(SVG_NS, "ellipse");
  frame.setAttribute("cx", "100");
  frame.setAttribute("cy", centerY.toString());
  frame.setAttribute("rx", (cockpit.width / 2 + 4).toString());
  frame.setAttribute("ry", (cockpit.height / 2 + 3).toString());
  frame.setAttribute("fill", "none");
  frame.setAttribute("stroke", debugColorsEnabled ? canopyColor : palette.accent);
  frame.setAttribute("stroke-width", 1.4);
  frame.setAttribute("opacity", "0.7");

  const group = document.createElementNS(SVG_NS, "g");
  group.append(frame, ellipse);
  root.appendChild(group);
}

function drawEngines(root, config, axis) {
  const { engine, palette, body } = config;
  const group = document.createElementNS(SVG_NS, "g");
  const tailY = axis.percentToTopY(1);
  const baseY = tailY - 4;
  const totalWidth = (engine.count - 1) * engine.spacing;
  const thrusterColor = partColor("thruster", palette.secondary);
  const exhaustColor = partColor("exhaust", engine.glow);

  for (let i = 0; i < engine.count; i += 1) {
    const offsetX = engine.count === 1 ? 0 : -totalWidth / 2 + i * engine.spacing;
    const cx = 100 + offsetX;

    const nozzle = document.createElementNS(SVG_NS, "rect");
    nozzle.setAttribute("x", (cx - engine.size / 2).toString());
    nozzle.setAttribute("y", (baseY - engine.nozzleLength).toString());
    nozzle.setAttribute("width", engine.size.toString());
    nozzle.setAttribute("height", engine.nozzleLength.toString());
    nozzle.setAttribute("rx", (engine.size * 0.24).toString());
    nozzle.setAttribute("fill", thrusterColor);
    nozzle.setAttribute("stroke", palette.trim);
    nozzle.setAttribute("stroke-width", 1.4);

    const cap = document.createElementNS(SVG_NS, "ellipse");
    cap.setAttribute("cx", cx.toString());
    cap.setAttribute("cy", (baseY - engine.nozzleLength).toString());
    cap.setAttribute("rx", (engine.size / 2).toString());
    cap.setAttribute("ry", (engine.size * 0.22).toString());
    cap.setAttribute("fill", thrusterColor);
    cap.setAttribute("stroke", palette.trim);
    cap.setAttribute("stroke-width", 1.2);

    const thruster = document.createElementNS(SVG_NS, "ellipse");
    thruster.setAttribute("cx", cx.toString());
    thruster.setAttribute("cy", baseY.toString());
    thruster.setAttribute("rx", (engine.size * 0.45).toString());
    thruster.setAttribute("ry", (engine.size * 0.32).toString());
    thruster.setAttribute(
      "fill",
      debugColorsEnabled ? thrusterColor : shadeColor(palette.secondary, 0.1),
    );
    thruster.setAttribute("stroke", palette.accent);
    thruster.setAttribute("stroke-width", 1.1);

    const flame = document.createElementNS(SVG_NS, "polygon");
    const flamePoints = [
      [cx - engine.size * 0.2, baseY + 4],
      [cx, baseY + engine.size * 1.2],
      [cx + engine.size * 0.2, baseY + 4],
    ];
    flame.setAttribute("points", pointsToString(flamePoints));
    flame.setAttribute("fill", exhaustColor);
    flame.setAttribute("opacity", "0.85");
    flame.classList.add("thruster-flame", "thruster-flame--vertical");

    group.append(nozzle, cap, thruster, flame);
  }

  root.appendChild(group);
}

function drawFins(root, config, axis) {
  const { fins, palette, body } = config;
  const group = document.createElementNS(SVG_NS, "g");
  const stabiliserColor = partColor("stabiliser", palette.secondary);

  if (fins.top) {
    const baseY = axis.percentToTopY(0.22);
    const fin = document.createElementNS(SVG_NS, "path");
    const path = [
      `M ${100 - fins.width / 2} ${baseY}`,
      `L ${100} ${baseY - fins.height}`,
      `L ${100 + fins.width / 2} ${baseY}`,
      `Q ${100} ${baseY + fins.height * 0.25} ${100 - fins.width / 2} ${baseY}`,
      "Z",
    ].join(" ");
    fin.setAttribute("d", path);
    fin.setAttribute("fill", stabiliserColor);
    fin.setAttribute("stroke", palette.trim);
    fin.setAttribute("stroke-width", 1.3);
    group.appendChild(fin);
  }

  if (fins.side > 0) {
    const sideBaseY = axis.percentToTopY(0.62);
    const spacing = fins.width + 6;
    for (let i = 0; i < fins.side; i += 1) {
      const base = sideBaseY + i * (fins.height + 6);
      const leftPoints = [
        [100 - body.halfWidth - 2, base],
        [100 - body.halfWidth - spacing, base + fins.height / 2],
        [100 - body.halfWidth - 2, base + fins.height],
      ];
      const rightPoints = mirrorPoints(leftPoints);

      const left = document.createElementNS(SVG_NS, "polygon");
      left.setAttribute("points", pointsToString(leftPoints));
      const right = document.createElementNS(SVG_NS, "polygon");
      right.setAttribute("points", pointsToString(rightPoints));

      [left, right].forEach((poly) => {
        poly.setAttribute("fill", stabiliserColor);
        poly.setAttribute("stroke", palette.trim);
        poly.setAttribute("stroke-width", 1.1);
        group.appendChild(poly);
      });
    }
  }

  if (fins.bottom) {
    const baseY = axis.percentToTopY(1);
    const fin = document.createElementNS(SVG_NS, "path");
    const path = [
      `M ${100 - fins.width / 2} ${baseY}`,
      `L ${100} ${baseY + fins.height + 4}`,
      `L ${100 + fins.width / 2} ${baseY}`,
      `Q ${100} ${baseY + fins.height * 0.4} ${100 - fins.width / 2} ${baseY}`,
      "Z",
    ].join(" ");
    fin.setAttribute("d", path);
    fin.setAttribute("fill", stabiliserColor);
    fin.setAttribute("stroke", palette.trim);
    fin.setAttribute("stroke-width", 1.2);
    fin.setAttribute("opacity", "0.85");
    group.appendChild(fin);
  }

  if (group.childNodes.length > 0) {
    root.appendChild(group);
  }
}

function drawDetails(root, config, axis) {
  const { details, palette, body, cockpit } = config;
  if (details.stripe) {
    const stripeStartPercent = clamp((details.stripeOffset ?? 0) / body.length, 0, 1);
    const stripeEndPercent = clamp(stripeStartPercent + 0.25, 0, 1);
    const stripeTop = axis.percentToTopY(stripeStartPercent);
    const stripeBottom = axis.percentToTopY(stripeEndPercent);
    const canopyPlacement = cockpit ? computeCanopyPlacement(body, cockpit) : null;
    const canopyCenter = canopyPlacement ? axis.percentToTopY(canopyPlacement.centerPercent) : null;
    const canopyHalfHeight = cockpit ? (cockpit.height ?? 0) / 2 + 4 : 0;
    const canopyTop = canopyCenter !== null ? canopyCenter - canopyHalfHeight : null;
    const canopyBottom = canopyCenter !== null ? canopyCenter + canopyHalfHeight : null;
    const overlapsCanopy =
      canopyTop !== null && canopyBottom !== null && stripeTop < canopyBottom && stripeBottom > canopyTop;

    if (!overlapsCanopy) {
      const stripe = document.createElementNS(SVG_NS, "path");
      stripe.setAttribute("d", buildStripePath(body, details, axis));
      stripe.setAttribute("stroke", partStroke("markings", palette.accent));
      stripe.setAttribute("stroke-width", 3.4);
      stripe.setAttribute("stroke-linecap", "round");
      stripe.setAttribute("opacity", "0.85");
      root.appendChild(stripe);
    }
  }

  if (details.antenna) {
    const antenna = document.createElementNS(SVG_NS, "line");
    const topY = axis.top.nose - 8;
    antenna.setAttribute("x1", "100");
    antenna.setAttribute("y1", (topY - 4).toString());
    antenna.setAttribute("x2", "100");
    antenna.setAttribute("y2", (topY - 20).toString());
    antenna.setAttribute("stroke", partStroke("details", palette.trim));
    antenna.setAttribute("stroke-width", 1.4);
    antenna.setAttribute("stroke-linecap", "round");

    const beacon = document.createElementNS(SVG_NS, "circle");
    beacon.setAttribute("cx", "100");
    beacon.setAttribute("cy", (topY - 24).toString());
    beacon.setAttribute("r", "3");
    beacon.setAttribute("fill", partColor("lights", palette.glow));
    beacon.setAttribute("opacity", "0.9");

    root.append(antenna, beacon);
  }
}

function buildBodyPath(body) {
  const axis = buildBodyAxis(body);

  if (!body.segments) {
    const centerY = axis.percentToTopY(0.5);
    const noseY = axis.top.nose;
    const tailY = axis.top.tail;
    const waistLeft = 100 - body.halfWidth;
    const waistRight = 100 + body.halfWidth;
    const noseWidth = body.halfWidth * body.noseWidthFactor;
    const tailWidth = body.halfWidth * body.tailWidthFactor;
    const midUpper = centerY - body.midInset;
    const midLower = centerY + body.midInset;

    return [
      `M ${100 - noseWidth} ${noseY}`,
      `Q 100 ${noseY - body.noseCurve} ${100 + noseWidth} ${noseY}`,
      `L ${waistRight} ${midUpper}`,
      `Q ${100 + tailWidth} ${midLower} ${100 + tailWidth * 0.8} ${tailY}`,
      `Q 100 ${tailY + body.tailCurve} ${100 - tailWidth * 0.8} ${tailY}`,
      `Q ${100 - tailWidth} ${midLower} ${waistLeft} ${midUpper}`,
      `L ${100 - noseWidth} ${noseY}`,
      "Z",
    ].join(" ");
  }

  const geometry = computeSegmentGeometry(body, axis);
  const { nose, nodes, tail, frontCurve, tailCurve, format } = geometry;

  const commands = [];
  commands.push(`M ${format(100 - nose.width)} ${format(nose.y)}`);
  commands.push(`Q 100 ${format(nose.y - frontCurve)} ${format(100 + nose.width)} ${format(nose.y)}`);

  let prev = nose;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    commands.push(buildCurveCommand(prev, node, 0.6, 1, format));
    prev = node;
  }

  commands.push(buildCurveCommand(prev, tail, 0.8, 1, format));
  commands.push(`Q 100 ${format(tail.y + tailCurve)} ${format(100 - tail.width)} ${format(tail.y)}`);

  prev = tail;
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    commands.push(buildCurveCommand(prev, node, 0.6, -1, format));
    prev = node;
  }

  commands.push(buildCurveCommand(prev, nose, 0.6, -1, format));
  commands.push("Z");

  return commands.join(" ");
}

// Collects shared measurement points so segmented and legacy bodies stay aligned.
function computeSegmentGeometry(body, axis = buildBodyAxis(body)) {
  const { front, mid, rear } = body.segments;
  const noseY = axis.top.nose;
  const tailY = axis.top.tail;
  const frontEndY = noseY + front.length;
  const midEndY = frontEndY + mid.length;
  const rearStartY = midEndY;

  const noseWidth = body.halfWidth * front.tipWidthFactor;
  const shoulderWidth = body.halfWidth * front.shoulderWidthFactor;
  const transitionWidth = shoulderWidth * (front.transitionFactor ?? 0.88);
  const waistWidth = body.halfWidth * mid.waistWidthFactor;
  const bellyWidth = body.halfWidth * mid.bellyWidthFactor;
  const trailingMidWidth = body.halfWidth * (mid.trailingWidthFactor ?? mid.bellyWidthFactor);
  const baseWidth = body.halfWidth * rear.baseWidthFactor;
  const exhaustWidth = body.halfWidth * rear.exhaustWidthFactor;
  const tailWidth = body.halfWidth * rear.tailWidthFactor;

  const waistBias = clamp(mid.waistPosition ?? 0.35, 0.18, 0.55);
  const bellyBias = clamp(mid.bellyPosition ?? 0.72, waistBias + 0.12, 0.92);
  const exhaustBias = clamp(rear.exhaustPosition ?? 0.65, 0.35, 0.88);

  const waistY = frontEndY + mid.length * waistBias;
  const bellyTarget = frontEndY + mid.length * bellyBias;
  const bellyY = Math.min(midEndY - 2, Math.max(waistY + 6, bellyTarget));
  const exhaustY = rearStartY + rear.length * exhaustBias;

  const format = (value) => Number(value.toFixed(2));

  return {
    nose: { width: noseWidth, y: noseY },
    nodes: [
      { width: transitionWidth, y: noseY + front.length * 0.45 },
      { width: shoulderWidth, y: frontEndY },
      { width: waistWidth, y: waistY },
      { width: bellyWidth, y: bellyY },
      { width: trailingMidWidth, y: midEndY },
      { width: baseWidth, y: rearStartY + rear.length * 0.3 },
      { width: exhaustWidth, y: exhaustY },
    ],
    tail: { width: tailWidth, y: tailY },
    frontCurve: front.curve,
    tailCurve: rear.curve,
    format,
  };
}

function buildCurveCommand(prev, next, tension, direction, format) {
  const controlX = format(100 + direction * ((prev.width + next.width) / 2));
  const controlY = format(prev.y + (next.y - prev.y) * tension);
  const targetX = format(100 + direction * next.width);
  const targetY = format(next.y);
  return `Q ${controlX} ${controlY} ${targetX} ${targetY}`;
}

// Builds a closed fill path for a slice of the fuselage using the shared outline data.
function buildSegmentOutline(nodes, options = {}) {
  const { startCap, endCap } = options;
  const format = options.format ?? ((value) => Number(value.toFixed(2)));
  const forwardTensions = options.forwardTensions ?? new Array(nodes.length - 1).fill(0.6);
  const reverseTensions = options.reverseTensions ?? [...forwardTensions].reverse();

  const commands = [];
  const start = nodes[0];
  commands.push(`M ${format(100 - start.width)} ${format(start.y)}`);

  if (startCap && startCap.type === "nose") {
    commands.push(`Q 100 ${format(start.y - startCap.curve)} ${format(100 + start.width)} ${format(start.y)}`);
  } else {
    commands.push(`L ${format(100 + start.width)} ${format(start.y)}`);
  }

  let prev = start;
  for (let i = 1; i < nodes.length; i += 1) {
    const node = nodes[i];
    const tension = forwardTensions[i - 1] ?? 0.6;
    commands.push(buildCurveCommand(prev, node, tension, 1, format));
    prev = node;
  }

  if (endCap && endCap.type === "tail") {
    commands.push(`Q 100 ${format(prev.y + endCap.curve)} ${format(100 - prev.width)} ${format(prev.y)}`);
  } else {
    commands.push(`L ${format(100 - prev.width)} ${format(prev.y)}`);
  }

  prev = nodes[nodes.length - 1];
  for (let i = nodes.length - 2, t = 0; i >= 0; i -= 1, t += 1) {
    const node = nodes[i];
    const tension = reverseTensions[t] ?? 0.6;
    commands.push(buildCurveCommand(prev, node, tension, -1, format));
    prev = node;
  }

  commands.push("Z");
  return commands.join(" ");
}

function buildBodySegmentPaths(body) {
  if (!body.segments) {
    return null;
  }

  const geometry = computeSegmentGeometry(body);
  const { nose, nodes, tail, frontCurve, tailCurve, format } = geometry;

  const frontNodes = [nose, nodes[0], nodes[1]];
  const midNodes = [nodes[1], nodes[2], nodes[3], nodes[4]];
  const rearNodes = [nodes[4], nodes[5], nodes[6], tail];

  const frontPath = buildSegmentOutline(frontNodes, {
    startCap: { type: "nose", curve: frontCurve },
    forwardTensions: [0.6, 0.6],
    format,
  });

  const midPath = buildSegmentOutline(midNodes, {
    forwardTensions: [0.6, 0.6, 0.6],
    format,
  });

  const rearPath = buildSegmentOutline(rearNodes, {
    forwardTensions: [0.6, 0.6, 0.8],
    reverseTensions: [0.6, 0.6, 0.6],
    endCap: { type: "tail", curve: tailCurve },
    format,
  });

  return { front: frontPath, mid: midPath, rear: rearPath };
}

function buildPlatingPath(body) {
  const axis = buildBodyAxis(body);
  const top = axis.top.nose + 18;
  const bottom = axis.top.tail - 18;
  const innerLeft = 100 - body.halfWidth * 0.6;
  const innerRight = 100 + body.halfWidth * 0.6;
  const segments = 4;
  const step = (bottom - top) / segments;
  const parts = [];
  for (let i = 0; i <= segments; i += 1) {
    const y = top + i * step;
    parts.push(`M ${innerLeft} ${y} L ${innerRight} ${y}`);
  }
  return parts.join(" ");
}

function buildWingPoints(wings, body, axis, isLeft) {
  const offset = wings.offsetY ?? 0;
  const attachPercent = axis.length > 0 ? clamp(0.5 + offset / axis.length, 0, 1) : 0.5;
  const attachY = axis.percentToTopY(attachPercent);
  const baseX = isLeft ? 100 - body.halfWidth : 100 + body.halfWidth;
  const direction = isLeft ? -1 : 1;
  const span = wings.span * direction;
  const forward = wings.forward;
  const sweep = wings.sweep;
  const dihedral = wings.dihedral;

  switch (wings.style) {
    case "delta":
      return [
        [baseX, attachY],
        [baseX + span, attachY - forward],
        [baseX + span * 0.7, attachY + sweep],
      ];
    case "forward":
      return [
        [baseX, attachY],
        [baseX + span * 0.6, attachY - forward],
        [baseX + span, attachY + sweep],
        [baseX + span * 0.25, attachY + sweep * 0.6],
      ];
    case "ladder":
      return [
        [baseX, attachY],
        [baseX + span * 0.4, attachY - forward - dihedral],
        [baseX + span * 0.8, attachY - forward + dihedral],
        [baseX + span, attachY + sweep],
        [baseX + span * 0.2, attachY + sweep * 0.8],
      ];
    case "split":
      return [
        [baseX, attachY - 6],
        [baseX + span * 0.45, attachY - forward],
        [baseX + span * 0.35, attachY + sweep * 0.2],
        [baseX + span * 0.8, attachY + sweep],
        [baseX + span * 0.15, attachY + sweep * 0.9],
      ];
    case "box":
      return [
        [baseX, attachY - wings.thickness],
        [baseX + span * 0.8, attachY - wings.thickness - forward],
        [baseX + span, attachY + sweep],
        [baseX + span * 0.2, attachY + sweep + wings.thickness],
      ];
    case "broad":
      return [
        [baseX, attachY - wings.thickness],
        [baseX + span, attachY - forward],
        [baseX + span, attachY + sweep],
        [baseX, attachY + wings.thickness],
      ];
    default:
      return [
        [baseX, attachY],
        [baseX + span, attachY - forward],
        [baseX + span * 0.6, attachY + sweep],
        [baseX + span * 0.2, attachY + sweep * 0.6],
      ];
  }
}

function buildWingAccent(points) {
  if (points.length < 3) {
    return points;
  }
  const tip = points[1];
  const trailing = points[points.length - 1];
  const base = points[0];
  return [base, tip, trailing];
}

function computeCanopyPlacement(body, cockpit) {
  const canopyLength = clamp((cockpit?.width ?? 28) * 1.1, body.length * 0.16, body.length * 0.32);
  const centerFromNose = clamp(
    body.length * 0.32 + (cockpit?.offsetY ?? 0),
    canopyLength * 0.5,
    body.length - canopyLength * 0.5,
  );
  const start = centerFromNose - canopyLength / 2;
  const end = start + canopyLength;
  const startPercent = start / body.length;
  const endPercent = end / body.length;
  const centerPercent = centerFromNose / body.length;
  const axis = buildBodyAxis(body);
  return {
    length: canopyLength,
    centerFromNose,
    start,
    end,
    startPercent,
    endPercent,
    centerPercent,
    centerY: axis.top.nose + centerFromNose,
  };
}

function computeWingPlanform(body, wings) {
  if (!wings?.enabled) {
    return {
      enabled: false,
      position: 0,
      length: 0,
      span: 0,
      thickness: 0,
      dihedral: 0,
      drop: 0,
      mountOffset: 0,
      mountHeight: 0,
      style: wings?.style ?? null,
    };
  }

  const halfLength = body.length / 2;
  const span = Math.max(0, wings.span ?? 0);
  const forward = Math.max(0, wings.forward ?? 0);
  const sweep = Math.max(0, wings.sweep ?? 0);
  const chord = forward + sweep;
  const length = Math.max(24, chord);
  const rootOffset = clamp(halfLength + (wings.offsetY ?? 0), 0, body.length);
  const leadingBuffer = Math.max(length * 0.12, span * 0.05);
  const trailingBuffer = Math.max(length * 0.25, span * 0.1);
  const position = clamp(rootOffset, leadingBuffer, body.length - trailingBuffer);
  const thickness = Math.max(10, (wings.thickness ?? 0) * 0.5, span * 0.45, chord * 0.3);
  const dihedral = Math.max(0, (wings.dihedral ?? 0) * 0.8);
  const drop = Math.max(6, sweep * 0.6, span * 0.25, chord * 0.22);
  const positionPercent = position / body.length;
  const lengthPercent = length / body.length;
  const mountHeight = wings.mountHeight ?? wings.verticalOffset ?? 0;

  return {
    enabled: true,
    position,
    length,
    positionPercent,
    lengthPercent,
    span,
    thickness,
    dihedral,
    drop,
    mountOffset: wings.offsetY ?? 0,
    mountHeight,
    style: wings.style ?? "swept",
  };
}

function buildSideHullGeometry(profile) {
  if (profile.segmentAnchors) {
    return buildSideSegmentedHull(profile);
  }

  return {
    hullPath: buildLegacySideHullPath(profile),
    segmentPaths: null,
  };
}

function buildLegacySideHullPath(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const axis = profile.axis ?? null;
  const noseX = axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;
  const tailX = axis?.side?.tail ?? profile.tailX ?? 100 + profile.length / 2;
  const dorsalTop = centerY - profile.dorsalHeight;
  const tailTop = centerY - profile.tailHeight;
  const belly = centerY + profile.bellyDrop;
  const ventral = centerY + profile.ventralDepth;
  const dorsalRampStart = noseX + profile.noseLength * 0.9;
  const dorsalMidX = noseX + profile.length * 0.45;
  const tailShoulderX = tailX - profile.tailLength * 0.85;
  const keelFrontX = noseX + profile.length * 0.4;
  const keelDipX = noseX + profile.length * 0.6;

  return [
    `M ${noseX} ${centerY}`,
    `Q ${noseX + profile.noseLength * 0.55} ${centerY - profile.noseHeight} ${dorsalRampStart} ${centerY - profile.noseHeight * 0.5}`,
    `C ${dorsalRampStart + profile.length * 0.16} ${dorsalTop - profile.height * 0.22} ${dorsalMidX} ${dorsalTop - profile.height * 0.05} ${tailShoulderX} ${dorsalTop}`,
    `Q ${tailX - profile.tailLength * 0.28} ${tailTop - profile.tailHeight * 0.08} ${tailX} ${centerY}`,
    `Q ${tailX - profile.tailLength * 0.3} ${centerY + profile.tailHeight * 0.75} ${tailShoulderX} ${centerY + profile.tailHeight * 0.9}`,
    `C ${keelDipX} ${ventral} ${keelFrontX} ${belly} ${noseX + profile.noseLength * 0.4} ${centerY + profile.noseHeight * 0.55}`,
    `Q ${noseX + profile.noseLength * 0.1} ${centerY + profile.noseHeight * 0.25} ${noseX} ${centerY}`,
    "Z",
  ].join(" ");
}

function buildSideSegmentedHull(profile) {
  const anchors = profile.segmentAnchors;
  if (!anchors) {
    return { hullPath: buildLegacySideHullPath(profile), segmentPaths: null };
  }

  const format = (value) => Number(value.toFixed(2));
  const noseX = anchors.noseX ?? profile.axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;
  const hullTop = sampleAnchoredCurve(anchors.topAnchors, 0, profile.length, noseX, format);
  const hullBottom = sampleAnchoredCurve(
    anchors.bottomAnchors,
    0,
    profile.length,
    noseX,
    format,
  );

  const hullPath = buildClosedPathFromSamples(hullTop, hullBottom, format);
  const segmentPaths = {};

  const segments = [
    ["front", 0, anchors.boundaries.front],
    ["mid", anchors.boundaries.front, anchors.boundaries.mid],
    ["rear", anchors.boundaries.mid, profile.length],
  ];

  segments.forEach(([key, start, end]) => {
    if (end - start <= 0.1) {
      return;
    }
    const top = sampleAnchoredCurve(anchors.topAnchors, start, end, noseX, format);
    const bottom = sampleAnchoredCurve(anchors.bottomAnchors, start, end, noseX, format);
    segmentPaths[key] = buildClosedPathFromSamples(top, bottom, format);
  });

  return { hullPath, segmentPaths };
}

function buildSidePanelLines(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const axis = profile.axis ?? null;
  const noseOrigin = axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;
  const tailOrigin = axis?.side?.tail ?? profile.tailX ?? 100 + profile.length / 2;
  const noseX = noseOrigin + profile.noseLength * 0.9;
  const tailX = tailOrigin - profile.tailLength * 0.65;
  const top = centerY - profile.height * 0.35;
  const bottom = centerY + profile.height * 0.25;
  const steps = 3;
  const spacing = (bottom - top) / (steps + 1);
  const segments = [];
  for (let i = 1; i <= steps; i += 1) {
    const y = top + spacing * i;
    segments.push(`M ${noseX} ${y} L ${tailX} ${y}`);
  }
  return segments.join(" ");
}

function buildSegmentDividerPath(topAnchors, bottomAnchors, noseX, offset) {
  if (!Number.isFinite(offset)) {
    return "";
  }
  const format = (value) => Number(value.toFixed(2));
  const top = interpolateAnchoredY(topAnchors, offset);
  const bottom = interpolateAnchoredY(bottomAnchors, offset);
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
    return "";
  }
  const inset = 1.6;
  const topY = top + inset;
  const bottomY = bottom - inset;
  if (bottomY - topY <= 0.1) {
    return "";
  }
  const x = format(noseX + offset);
  return `M ${x} ${format(topY)} L ${x} ${format(bottomY)}`;
}

function buildSideIntakePath(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const axis = profile.axis ?? null;
  const noseOrigin = axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;
  const startX = noseOrigin + profile.noseLength * 0.55;
  const lowerY = centerY + profile.bellyDrop * 0.85;
  const deepestY = centerY + profile.ventralDepth;
  const endX = startX + profile.intakeDepth;
  return [
    `M ${startX} ${lowerY}`,
    `Q ${startX + profile.intakeDepth * 0.25} ${deepestY} ${endX} ${centerY + profile.bellyDrop * 0.75}`,
    `L ${startX + profile.intakeDepth * 0.35} ${centerY + profile.bellyDrop * 0.55}`,
    "Z",
  ].join(" ");
}

function sampleHullTopY(profile, distanceFromNose) {
  if (!profile) {
    return 0;
  }
  const anchors = profile.hullAnchors ?? profile.segmentAnchors;
  if (anchors?.topAnchors) {
    const clamped = clamp(distanceFromNose, 0, profile.length);
    return interpolateAnchoredY(anchors.topAnchors, clamped);
  }
  const centerY = 100 + (profile.offsetY ?? 0);
  return centerY - profile.dorsalHeight;
}

function buildSideWingPoints(wing, profile, axis) {
  const baseX = axis.percentToSideX(wing.positionPercent);
  const baseY = 100 + (profile.offsetY ?? 0) + wing.mountHeight;
  const spanInfluence = Math.max(wing.profileSpan ?? 0, 1);
  const chord = Math.max(wing.length, spanInfluence * 0.6);
  const topReach = Math.max(wing.thickness * 0.75, spanInfluence * 0.32);
  const dihedralReach = Math.max(wing.dihedral, spanInfluence * 0.18);
  const trailingDrop = Math.max(wing.drop, spanInfluence * 0.22);
  const bottomReach = Math.max(wing.thickness, spanInfluence * 0.45);
  const style = wing.style ?? "swept";

  const root = [baseX, baseY];
  const rootTop = [baseX + chord * 0.3, baseY - topReach];
  const tip = [baseX + chord, baseY - dihedralReach];
  const trailing = [baseX + chord * 0.78, baseY + trailingDrop];
  const rootBottom = [baseX - chord * 0.14, baseY + bottomReach];

  let points = [root, rootTop, tip, trailing, rootBottom];

  switch (style) {
    case "delta":
      rootTop[0] = baseX + chord * 0.2;
      rootTop[1] = baseY - topReach * 0.55;
      tip[1] = baseY - dihedralReach * 1.4;
      trailing[0] = baseX + chord * 0.68;
      trailing[1] = baseY + trailingDrop * 0.5;
      rootBottom[0] = baseX - chord * 0.08;
      rootBottom[1] = baseY + bottomReach * 0.65;
      break;
    case "forward":
      root[1] = baseY - topReach * 0.18;
      rootTop[0] = baseX + chord * 0.42;
      rootTop[1] = baseY - topReach * 0.95;
      tip[0] = baseX + chord * 0.86;
      tip[1] = baseY - dihedralReach * 0.45;
      trailing[0] = baseX + chord * 0.74;
      trailing[1] = baseY + trailingDrop * 1.12;
      rootBottom[0] = baseX - chord * 0.22;
      rootBottom[1] = baseY + bottomReach * 1.05;
      break;
    case "ladder": {
      const rungRise = topReach * 0.55;
      const rungDrop = trailingDrop * 0.4;
      points = [
        [baseX, baseY - rungRise * 0.15],
        [baseX + chord * 0.32, baseY - topReach],
        [baseX + chord * 0.62, baseY - dihedralReach * 0.6],
        [baseX + chord * 0.56, baseY - dihedralReach * 0.05],
        [baseX + chord * 0.82, baseY + rungDrop],
        [baseX + chord * 0.35, baseY + trailingDrop * 0.75],
        [baseX - chord * 0.12, baseY + bottomReach],
      ];
      break;
    }
    case "split":
      points = [
        [baseX, baseY - topReach * 0.35],
        [baseX + chord * 0.36, baseY - topReach],
        [baseX + chord * 0.48, baseY - dihedralReach * 0.35],
        [baseX + chord * 0.82, baseY - dihedralReach * 0.85],
        [baseX + chord * 0.94, baseY + trailingDrop * 0.55],
        [baseX + chord * 0.46, baseY + trailingDrop * 0.92],
        [baseX - chord * 0.16, baseY + bottomReach * 0.95],
      ];
      break;
    case "box":
      points = [
        [baseX, baseY - wing.thickness * 0.5],
        [baseX + chord * 0.2, baseY - topReach * 0.6],
        [baseX + chord * 0.92, baseY - dihedralReach * 0.35],
        [baseX + chord * 0.95, baseY + trailingDrop * 0.45],
        [baseX + chord * 0.34, baseY + trailingDrop * 0.6],
        [baseX - chord * 0.05, baseY + bottomReach * 0.85],
      ];
      break;
    case "broad":
      points = [
        [baseX, baseY - wing.thickness * 0.42],
        [baseX + chord * 0.78, baseY - dihedralReach * 0.6],
        [baseX + chord * 0.98, baseY - dihedralReach * 0.2],
        [baseX + chord * 0.98, baseY + trailingDrop * 0.68],
        [baseX + chord * 0.28, baseY + trailingDrop * 0.82],
        [baseX - chord * 0.1, baseY + bottomReach * 0.9],
      ];
      break;
    default:
      break;
  }

  return points;
}

function buildStripePath(body, details, axis) {
  // Stripe offsets are expressed as body-relative lengths, so keep them within the hull interval.
  const startPercent = clamp((details.stripeOffset ?? 0) / body.length, 0, 1);
  const endPercent = clamp(startPercent + 0.25, 0, 1);
  const noseY = axis.percentToTopY(startPercent);
  const tailY = axis.percentToTopY(endPercent);
  const left = 100 - body.halfWidth * 0.6;
  const right = 100 + body.halfWidth * 0.6;
  return [`M ${left} ${noseY}`, `L ${right} ${noseY + 6}`, `L ${right} ${tailY}`, `L ${left} ${tailY - 6}`].join(" ");
}

function pointsToString(points) {
  return points.map((point) => point.join(" ")).join(" ");
}

function buildClosedPathFromSamples(topPoints, bottomPoints, format) {
  if (!topPoints.length || !bottomPoints.length) {
    return "";
  }

  const commands = [`M ${format(topPoints[0][0])} ${format(topPoints[0][1])}`];

  for (let i = 1; i < topPoints.length; i += 1) {
    commands.push(`L ${format(topPoints[i][0])} ${format(topPoints[i][1])}`);
  }

  for (let i = bottomPoints.length - 1; i >= 0; i -= 1) {
    commands.push(`L ${format(bottomPoints[i][0])} ${format(bottomPoints[i][1])}`);
  }

  commands.push("Z");
  return commands.join(" ");
}

function sampleAnchoredCurve(anchors, start, end, noseX, format) {
  const result = [];
  const span = Math.max(end - start, 1);
  const steps = Math.max(4, Math.round(span / 12));

  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps;
    const x = start + span * ratio;
    const y = interpolateAnchoredY(anchors, x);
    result.push([format(noseX + x), format(y)]);
  }

  return result;
}

function interpolateAnchoredY(anchors, x) {
  if (!anchors.length) {
    return 0;
  }

  if (x <= anchors[0][0]) {
    return anchors[0][1];
  }

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const left = anchors[i];
    const right = anchors[i + 1];
    if (x <= right[0]) {
      const delta = right[0] - left[0];
      const t = delta === 0 ? 0 : (x - left[0]) / delta;
      return left[1] + (right[1] - left[1]) * t;
    }
  }

  const last = anchors[anchors.length - 1];
  return last[1];
}

function createSideProfileAnchors(profile, segments, geometry, options = {}) {
  const { allowFallback = false } = options;

  let hasSegments = Boolean(segments);
  if (!hasSegments && !allowFallback) {
    return null;
  }

  let frontLength = segments?.front?.length ?? profile.noseLength ?? profile.length * 0.32;
  let midLength = segments?.mid?.length ?? profile.length * 0.36;
  let rearLength = segments?.rear?.length ?? profile.tailLength ?? profile.length * 0.32;

  if (!hasSegments) {
    const fallbackTotal = frontLength + midLength + rearLength;
    if (!Number.isFinite(fallbackTotal) || fallbackTotal <= 0) {
      return null;
    }
    const deficit = profile.length - fallbackTotal;
    midLength = Math.max(1, midLength + deficit);
  }

  frontLength = Math.max(1, frontLength);
  midLength = Math.max(1, midLength);
  rearLength = Math.max(1, rearLength);

  const total = frontLength + midLength + rearLength;
  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const scale = profile.length / total;
  frontLength *= scale;
  midLength *= scale;
  rearLength *= scale;

  const centerY = 100 + (profile.offsetY ?? 0);
  const noseTop = centerY - profile.noseHeight;
  const crest = centerY - profile.dorsalHeight;
  const tailTop = centerY - profile.tailHeight;
  const noseBottom = centerY + profile.noseHeight * 0.55;
  const belly = centerY + profile.bellyDrop;
  const ventral = centerY + profile.ventralDepth;
  const tailBottom = centerY + Math.max(profile.tailHeight * 0.8, profile.bellyDrop * 0.85);

  const frontEnd = frontLength;
  const midEnd = frontEnd + midLength;

  const mix = (a, b, t) => a + (b - a) * t;

  const frontConfig = profile.sideAnchorConfig?.front ?? {};
  const midConfig = profile.sideAnchorConfig?.mid ?? {};
  const rearConfig = profile.sideAnchorConfig?.rear ?? {};

  const frontSecondBlend = clamp(frontConfig.topSecondBlend ?? 0.6, 0, 1);
  const frontEndBlend = clamp(frontConfig.topEndBlend ?? 0.1, 0, 1);
  const chinBlend = clamp(frontConfig.bottomSecondBlend ?? 0.55, 0, 1);
  const frontBellyBlend = clamp(frontConfig.bottomEndBlend ?? 0.4, 0, 1);

  const midDip = clamp(midConfig.topDip ?? 0.08, 0.02, 0.2);
  const crestOffset = (midConfig.topCrestOffset ?? 0) * profile.height;

  const rearTopBlend = clamp(rearConfig.topBlend ?? 0.55, 0, 1);
  const rearBottomBlend = clamp(rearConfig.bottomBlend ?? 0.65, 0, 1);

  const axis = profile.axis ?? null;
  const convertNodeOffset = (value) => {
    if (!axis || !Number.isFinite(value)) {
      return null;
    }
    const percent = axis.percentFromTopY?.(value);
    if (!Number.isFinite(percent)) {
      return null;
    }
    return clamp(percent * profile.length, 0, profile.length);
  };

  const getNodeOffset = (index) => convertNodeOffset(geometry?.nodes?.[index]?.y);
  const tailOffset = convertNodeOffset(geometry?.tail?.y) ?? profile.length;

  const frontTransitionOffset =
    getNodeOffset(0) ?? clamp(frontLength * 0.45, 0, profile.length);
  const frontShoulderOffset = getNodeOffset(1) ?? frontEnd;
  const waistOffset = getNodeOffset(2) ?? clamp(frontEnd + midLength * 0.4, 0, profile.length);
  const bellyOffset = getNodeOffset(3) ?? clamp(frontEnd + midLength * 0.75, 0, profile.length);
  const midTrailingOffset =
    getNodeOffset(4) ?? clamp(frontEnd + midLength, 0, profile.length);
  const rearBaseOffset =
    getNodeOffset(5) ?? clamp(profile.length - rearLength * 0.55, 0, profile.length);
  const exhaustOffset =
    getNodeOffset(6) ?? clamp(profile.length - rearLength * 0.35, 0, profile.length);

  const ensureProgression = (values) => {
    let last = 0;
    return values.map((value) => {
      const next = Number.isFinite(value) ? Math.max(value, last) : last;
      last = next;
      return next;
    });
  };

  const [transitionX, shoulderX, waistX, bellyX, trailingX, baseX, exhaustX] = ensureProgression([
    frontTransitionOffset,
    frontShoulderOffset,
    waistOffset,
    bellyOffset,
    midTrailingOffset,
    rearBaseOffset,
    exhaustOffset,
  ]);

  const tailX = Math.max(tailOffset, exhaustX);

  const topAnchors = [
    [0, noseTop],
    [transitionX, mix(noseTop, crest, frontSecondBlend)],
    [shoulderX, mix(crest, noseTop, frontEndBlend)],
    [waistX, crest - profile.height * midDip],
    [bellyX, crest + crestOffset],
    [baseX, mix(crest, tailTop, rearTopBlend)],
    [tailX, tailTop],
  ];

  const chinX = clamp(transitionX * 0.92, 0, shoulderX);
  const bottomAnchors = [
    [0, noseBottom],
    [chinX, mix(noseBottom, belly, chinBlend)],
    [shoulderX, mix(ventral, belly, frontBellyBlend)],
    [waistX, ventral],
    [trailingX, belly],
    [exhaustX, mix(belly, tailBottom, rearBottomBlend)],
    [tailX, tailBottom],
  ];

  const noseX = profile.axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;

  return {
    noseX,
    topAnchors,
    bottomAnchors,
    boundaries: hasSegments
      ? {
          front: shoulderX,
          mid: trailingX,
        }
      : null,
  };
}

function mirrorPoints(points) {
  return points.map(([x, y]) => [200 - x, y]);
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

function clamp(value, min, max) {
  if (max < min) {
    [min, max] = [max, min];
  }
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
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


function createBodySegments(ranges) {
  return {
    front: createFrontSegmentVariant(ranges),
    mid: createMidSegmentVariant(ranges),
    rear: createRearSegmentVariant(ranges),
  };
}

function createFrontSegmentVariant(ranges) {
  const variant = choose(FRONT_SEGMENT_VARIANTS);
  const segment = {
    type: variant.type,
    weight: randomBetween(...variant.lengthWeightRange),
    tipWidthFactor: randomBetween(...variant.tipWidthFactorRange),
    shoulderWidthFactor: randomBetween(...variant.shoulderWidthFactorRange),
    transitionFactor: randomBetween(...variant.transitionFactorRange),
    curve: randomBetween(...variant.curveRange),
  };

  if (ranges?.noseWidthFactor) {
    segment.tipWidthFactor = clamp(segment.tipWidthFactor, ...ranges.noseWidthFactor);
  }
  if (ranges?.noseCurve) {
    segment.curve = clamp(segment.curve, ...ranges.noseCurve);
  }
  return segment;
}

function createMidSegmentVariant(ranges) {
  const variant = choose(MID_SEGMENT_VARIANTS);
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

  if (ranges?.bodyMidInset) {
    segment.inset = clamp(segment.inset, ...ranges.bodyMidInset);
  }
  return segment;
}

function createRearSegmentVariant(ranges) {
  const variant = choose(REAR_SEGMENT_VARIANTS);
  const segment = {
    type: variant.type,
    weight: randomBetween(...variant.lengthWeightRange),
    baseWidthFactor: randomBetween(...variant.baseWidthFactorRange),
    exhaustWidthFactor: randomBetween(...variant.exhaustWidthFactorRange),
    tailWidthFactor: randomBetween(...variant.tailWidthFactorRange),
    exhaustPosition: randomBetween(...variant.exhaustPositionRange),
    curve: randomBetween(...variant.curveRange),
  };

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

  const body = {
    length: bodyLength,
    halfWidth: bodyHalfWidth,
    startPercent: (ranges.body_start ?? 0) / 100,
    endPercent: (ranges.body_end ?? 100) / 100,
    segments: createBodySegments(segmentRanges),
    plating: nextRandom() < def.features.platingProbability,
  };
  synchroniseBodySegments(body, segmentRanges);

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
  if (typeof original !== typeof fresh) {
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

function mixColor(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bVal = Math.round(b1 + (b2 - b1) * t);
  return rgbToHex(r, g, bVal);
}

function shadeColor(hex, intensity) {
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
