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
  drawUnifiedSpaceship(root, config, defs, axis, "top");
}

function drawSideViewSpaceship(root, config, defs) {
  const axis = buildBodyAxis(config.body);
  drawUnifiedSpaceship(root, config, defs, axis, "side");
}

function drawUnifiedSpaceship(root, config, defs, axis, view) {
  const projection = createProjection(axis, view);
  const palette = config.palette;
  const planform = computeWingPlanform(config.body, config.wings);

  drawUnifiedHull(root, config, projection, palette);
  drawUnifiedWings(root, config, projection, palette, planform);
  drawUnifiedCockpit(root, config, projection, palette);
  drawUnifiedEngines(root, config, projection, palette);
  drawUnifiedArmament(root, config, projection, palette, planform);
  drawUnifiedDetails(root, config, projection, palette);
}

function createProjection(axis, view) {
  const mainAccessor = view === "top" ? axis.percentToTopY : axis.percentToSideX;
  return {
    view,
    axis,
    project(mainPercent, crossOffset) {
      const main = mainAccessor(mainPercent);
      if (view === "top") {
        return [100 + crossOffset, main];
      }
      return [main, 100 - crossOffset];
    },
    projectMirror(mainPercent, crossOffset) {
      const main = mainAccessor(mainPercent);
      if (view === "top") {
        return [100 - crossOffset, main];
      }
      return [main, 100 + crossOffset];
    },
  };
}

function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      element.setAttribute(key, value);
    }
  });
  return element;
}

function drawUnifiedHull(root, config, projection, palette) {
  const hullPath = buildUnifiedHullPath(config.body, projection);
  if (!hullPath) {
    return;
  }
  const hull = createSvgElement("path", {
    d: hullPath,
    fill: palette.primary,
    stroke: palette.trim,
    "stroke-width": "1.5",
  });
  root.appendChild(hull);
}

function buildUnifiedHullPath(body, projection) {
  const samples = buildHullSamples(body);
  if (!samples.length) {
    return "";
  }
  const upper = samples.map((sample) => projection.project(sample.percent, sample.halfWidth));
  const lower = samples
    .slice()
    .reverse()
    .map((sample) => projection.projectMirror(sample.percent, sample.halfWidth));
  const outline = upper.concat(lower);
  return buildPathFromPoints(outline);
}

function buildHullSamples(body) {
  if (!body) {
    return [];
  }
  const segments = body.segments || {};
  const front = segments.front || {};
  const mid = segments.mid || {};
  const rear = segments.rear || {};

  const baseHalf = Math.max(body.halfWidth ?? 12, 6);
  const bodyLength = Math.max(body.length ?? 0, 1);

  let frontLength = front.length ?? bodyLength * 0.3;
  let midLength = mid.length ?? bodyLength * 0.4;
  let rearLength = rear.length ?? bodyLength - frontLength - midLength;
  if (rearLength <= 0) {
    rearLength = bodyLength * 0.3;
  }

  const total = frontLength + midLength + rearLength;
  const scale = total > 0 ? bodyLength / total : 1;
  frontLength *= scale;
  midLength *= scale;
  rearLength *= scale;

  const noseFactor = front.tipWidthFactor ?? body.noseWidthFactor ?? 0.32;
  const shoulderFactor = front.shoulderWidthFactor ?? 1;
  const transitionFactor = clamp(front.transitionFactor ?? 0.85, 0.2, 1.4);
  const waistFactor = mid.waistWidthFactor ?? 0.92;
  const bellyFactor = mid.bellyWidthFactor ?? 1;
  const trailingFactor = mid.trailingWidthFactor ?? bellyFactor;
  const waistPosition = clamp(mid.waistPosition ?? 0.35, 0.05, 0.95);
  const bellyPosition = clamp(mid.bellyPosition ?? 0.7, waistPosition, 0.98);
  const baseFactor = rear.baseWidthFactor ?? 1;
  const exhaustFactor = rear.exhaustWidthFactor ?? 0.8;
  const tailFactor = rear.tailWidthFactor ?? body.tailWidthFactor ?? 0.6;
  const exhaustPosition = clamp(rear.exhaustPosition ?? 0.65, 0, 1);

  const samples = [];
  let distance = 0;

  const addSample = (offset, factor) => {
    samples.push({
      percent: clamp(offset / bodyLength, 0, 1),
      halfWidth: Math.max(baseHalf * factor, baseHalf * 0.1),
    });
  };

  addSample(distance, Math.max(noseFactor, 0.08));
  addSample(distance + frontLength * 0.4, lerp(noseFactor, shoulderFactor, 0.4));
  distance += frontLength * transitionFactor;
  addSample(distance, shoulderFactor);
  distance = frontLength;
  addSample(distance, shoulderFactor);
  addSample(distance + midLength * waistPosition, waistFactor);
  addSample(distance + midLength * bellyPosition, bellyFactor);
  distance += midLength;
  addSample(distance, trailingFactor);
  addSample(distance + rearLength * 0.25, baseFactor);
  addSample(distance + rearLength * exhaustPosition, exhaustFactor);
  distance += rearLength;
  addSample(distance, tailFactor);

  return normaliseSamples(samples);
}

function normaliseSamples(samples) {
  return samples
    .filter((sample) => Number.isFinite(sample.percent) && Number.isFinite(sample.halfWidth))
    .map((sample) => ({
      percent: clamp(sample.percent, 0, 1),
      halfWidth: Math.max(sample.halfWidth, 0),
    }))
    .sort((a, b) => a.percent - b.percent)
    .reduce((acc, sample) => {
      if (!acc.length) {
        acc.push(sample);
        return acc;
      }
      const last = acc[acc.length - 1];
      if (Math.abs(last.percent - sample.percent) < 0.001) {
        acc[acc.length - 1] = sample;
      } else {
        acc.push(sample);
      }
      return acc;
    }, []);
}

function buildPathFromPoints(points) {
  if (!points.length) {
    return "";
  }
  const commands = [`M ${points[0][0]} ${points[0][1]}`];
  for (let i = 1; i < points.length; i += 1) {
    commands.push(`L ${points[i][0]} ${points[i][1]}`);
  }
  commands.push("Z");
  return commands.join(" ");
}

function drawUnifiedWings(root, config, projection, palette, planform) {
  if (!planform.enabled || planform.span <= 0) {
    return;
  }
  const wingFill = mixColor(palette.secondary, palette.trim, 0.15);
  const group = createSvgElement("g");
  group.classList.add("wings");

  const leftPoints = buildWingPolygon(planform, config.body, projection, false);
  const rightPoints = buildWingPolygon(planform, config.body, projection, true);

  if (leftPoints.length) {
    const left = createSvgElement("polygon", {
      points: leftPoints.map((point) => point.join(",")).join(" "),
      fill: wingFill,
      stroke: palette.trim,
      "stroke-width": "1",
    });
    group.appendChild(left);
  }

  if (rightPoints.length) {
    const right = createSvgElement("polygon", {
      points: rightPoints.map((point) => point.join(",")).join(" "),
      fill: wingFill,
      stroke: palette.trim,
      "stroke-width": "1",
    });
    group.appendChild(right);
  }

  root.appendChild(group);
}

function buildWingPolygon(planform, body, projection, mirrored) {
  const lengthPercent = planform.lengthPercent > 0 ? planform.lengthPercent : planform.length / body.length;
  const halfLengthPercent = lengthPercent / 2;
  const base = clamp(planform.positionPercent, 0, 1);
  const leading = clamp(base - halfLengthPercent, 0, 1);
  const trailing = clamp(base + halfLengthPercent, 0, 1);
  const tipLeading = clamp(base - halfLengthPercent * 0.25, 0, 1);
  const tipTrailing = clamp(base + halfLengthPercent * 0.75, 0, 1);

  const baseOffset = Math.max(body.halfWidth ?? 12, 6) * 0.95;
  const tipOffset = baseOffset + planform.span;

  const project = mirrored ? projection.projectMirror.bind(projection) : projection.project.bind(projection);

  return [
    project(leading, baseOffset),
    project(tipLeading, tipOffset),
    project(tipTrailing, tipOffset * 0.96),
    project(trailing, baseOffset * 0.92),
  ];
}

function drawUnifiedCockpit(root, config, projection, palette) {
  const { cockpit, body } = config;
  if (!cockpit) {
    return;
  }
  const placement = computeCanopyPlacement(body, cockpit);
  const mainRadius = Math.max(4, placement.length * 0.5);
  const crossRadius = projection.view === "top"
    ? Math.max(4, (cockpit.width ?? body.halfWidth ?? 20) * 0.3)
    : Math.max(4, (cockpit.height ?? body.halfWidth ?? 20) * 0.5);

  const ellipse = createSvgElement("ellipse", {
    fill: cockpit.tint ?? palette.accent,
    stroke: palette.trim,
    "stroke-width": "1",
    opacity: "0.85",
  });

  applyEllipseAttributes(ellipse, projection, placement.centerPercent, 0, crossRadius, mainRadius);
  root.appendChild(ellipse);
}

function drawUnifiedEngines(root, config, projection, palette) {
  const { engine, body } = config;
  if (!engine) {
    return;
  }
  const count = Math.max(1, Math.round(engine.count ?? 1));
  const radius = Math.max(3, (engine.size ?? body.halfWidth ?? 18) * 0.22);
  const spacing = Math.max(radius * 1.6, (engine.spacing ?? radius * 3) * 0.5);
  const offsetPercent = clamp(1 - (engine.nozzleLength ?? body.length * 0.18) / body.length, 0, 1);

  const offsets = [];
  if (count === 1) {
    offsets.push(0);
  } else {
    for (let i = 0; i < count; i += 1) {
      offsets.push((i - (count - 1) / 2) * spacing);
    }
  }

  offsets.forEach((crossOffset) => {
    const engineCircle = createSvgElement("circle", {
      fill: palette.secondary,
      stroke: palette.trim,
      "stroke-width": "1",
      r: radius.toString(),
    });
    const [cx, cy] = projectCenter(projection, offsetPercent, crossOffset);
    engineCircle.setAttribute("cx", cx.toString());
    engineCircle.setAttribute("cy", cy.toString());
    root.appendChild(engineCircle);
  });
}

function drawUnifiedArmament(root, config, projection, palette, planform) {
  const { armament, body } = config;
  if (!armament) {
    return;
  }

  if (armament.mount === "nose") {
    const lengthPercent = clamp((armament.length ?? body.length * 0.12) / body.length, 0.04, 0.4);
    const width = Math.max(4, (armament.housingWidth ?? body.halfWidth * 0.6) * 0.5);
    const tipWidth = Math.max(2, width * 0.6);
    const polygon = [
      projection.project(0, width),
      projection.project(lengthPercent * 0.6, width),
      projection.project(lengthPercent, tipWidth),
      projection.projectMirror(lengthPercent, tipWidth),
      projection.projectMirror(lengthPercent * 0.6, width),
      projection.projectMirror(0, width),
    ];
    const housing = createSvgElement("path", {
      d: buildPathFromPoints(polygon),
      fill: mixColor(palette.trim, palette.primary, 0.35),
      stroke: palette.trim,
      "stroke-width": "0.8",
    });
    root.appendChild(housing);
    return;
  }

  if (armament.mount === "wing" && planform?.enabled) {
    const hardpoints = Array.isArray(armament.hardpoints) && armament.hardpoints.length
      ? armament.hardpoints
      : [{ chordRatio: 0.5, payloadLength: planform.length * 0.3, payloadRadius: planform.thickness * 0.35 }];
    const baseOffset = Math.max(config.body.halfWidth ?? 12, 6) + planform.span * 0.9;

    hardpoints.forEach((hardpoint) => {
      const chord = clamp(hardpoint.chordRatio ?? 0.5, 0, 1);
      const mainPercent = clamp(
        planform.positionPercent - planform.lengthPercent / 2 + planform.lengthPercent * chord,
        0,
        1,
      );
      const mainRadius = Math.max(3, (hardpoint.payloadLength ?? planform.length * 0.3) / 2);
      const crossRadius = Math.max(2, hardpoint.payloadRadius ?? planform.thickness * 0.35);

      const payload = createSvgElement("ellipse", {
        fill: palette.trim,
        opacity: armament.type === "bomb" ? "0.75" : "0.6",
      });
      applyEllipseAttributes(payload, projection, mainPercent, baseOffset, crossRadius, mainRadius);
      root.appendChild(payload);

      const mirrored = createSvgElement("ellipse", {
        fill: palette.trim,
        opacity: armament.type === "bomb" ? "0.75" : "0.6",
      });
      applyEllipseAttributes(mirrored, projection, mainPercent, -baseOffset, crossRadius, mainRadius);
      root.appendChild(mirrored);
    });
  }
}

function drawUnifiedDetails(root, config, projection, palette) {
  const { details, body } = config;
  if (!details?.stripe) {
    return;
  }
  const startPercent = clamp((details.stripeOffset ?? body.length * 0.2) / body.length, 0, 1);
  const endPercent = clamp(startPercent + 0.25, 0, 1);
  const stripeWidth = Math.max(3, (body.halfWidth ?? 10) * 0.3);

  const pathPoints = [
    projection.project(startPercent, stripeWidth),
    projection.project(endPercent, stripeWidth),
    projection.projectMirror(endPercent, stripeWidth * 0.4),
    projection.projectMirror(startPercent, stripeWidth * 0.4),
  ];

  const stripe = createSvgElement("path", {
    d: buildPathFromPoints(pathPoints),
    fill: mixColor(palette.accent, palette.primary, 0.2),
    stroke: palette.trim,
    "stroke-width": "0.6",
    opacity: "0.8",
  });
  root.appendChild(stripe);
}

function projectCenter(projection, mainPercent, crossOffset) {
  if (crossOffset === 0) {
    return projection.project(mainPercent, 0);
  }
  if (crossOffset > 0) {
    return projection.project(mainPercent, crossOffset);
  }
  return projection.projectMirror(mainPercent, Math.abs(crossOffset));
}

function applyEllipseAttributes(element, projection, mainPercent, crossOffset, crossRadius, mainRadius) {
  const [cx, cy] = projectCenter(projection, mainPercent, crossOffset);
  element.setAttribute("cx", cx.toString());
  element.setAttribute("cy", cy.toString());
  if (projection.view === "top") {
    element.setAttribute("rx", Math.max(0.5, crossRadius).toString());
    element.setAttribute("ry", Math.max(0.5, mainRadius).toString());
  } else {
    element.setAttribute("rx", Math.max(0.5, mainRadius).toString());
    element.setAttribute("ry", Math.max(0.5, crossRadius).toString());
  }
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


function computeCanopyPlacement(body, cockpit) {
  const bodyLength = Math.max(body?.length ?? 0, 1);
  const baseWidth = cockpit?.width ?? body?.halfWidth ?? 20;
  const canopyLength = clamp(baseWidth * 1.1, bodyLength * 0.16, bodyLength * 0.32);
  const rawCenter = bodyLength * 0.32 + (cockpit?.offsetY ?? 0);
  const halfLength = canopyLength / 2;
  const centerFromNose = clamp(rawCenter, halfLength, bodyLength - halfLength);
  const start = centerFromNose - halfLength;
  const end = centerFromNose + halfLength;
  return {
    length: canopyLength,
    centerFromNose,
    start,
    end,
    startPercent: start / bodyLength,
    endPercent: end / bodyLength,
    centerPercent: centerFromNose / bodyLength,
  };
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
