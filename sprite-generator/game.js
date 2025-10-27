const SVG_NS = "http://www.w3.org/2000/svg";
const GRID_SIZE = 9;

const VIEW_MODES = {
  both: {
    label: "Dual projection",
    shortLabel: "Both",
    description: "Show top-down and side views together for comparison.",
  },
  side: {
    label: "Side-scrolling shooter",
    shortLabel: "Side",
    description: "Horizontal orientation for classic side shooters.",
  },
  vertical: {
    label: "Vertical shoot 'em up",
    shortLabel: "Vertical",
    description: "Top-down orientation for vertical scrollers.",
  },
};

const CATEGORY_DEFINITIONS = {
  fighter: {
    label: "Fighter",
    description: "Aggressive interceptors with sharp silhouettes and agile control surfaces.",
    wingStyles: ["delta", "swept", "forward"],
    ranges: {
      bodyLength: [120, 150],
      bodyWidth: [32, 42],
      bodyMidInset: [10, 22],
      noseCurve: [18, 30],
      tailCurve: [16, 26],
      noseWidthFactor: [0.32, 0.45],
      tailWidthFactor: [0.48, 0.64],
      cockpitWidth: [28, 36],
      cockpitHeight: [18, 26],
      cockpitOffset: [-6, 6],
      engineCount: [1, 2],
      engineSize: [18, 28],
      engineSpacing: [28, 44],
      nozzleLength: [20, 32],
      wingSpan: [52, 70],
      wingSweep: [26, 40],
      wingForward: [8, 18],
      wingThickness: [12, 18],
      wingOffset: [-6, 6],
      wingDihedral: [-6, 14],
      finHeight: [32, 52],
      finWidth: [10, 18],
      finCount: [1, 2],
      stripeOffset: [18, 38],
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
      bodyLength: [150, 190],
      bodyWidth: [40, 52],
      bodyMidInset: [4, 12],
      noseCurve: [10, 18],
      tailCurve: [22, 36],
      noseWidthFactor: [0.5, 0.65],
      tailWidthFactor: [0.6, 0.78],
      cockpitWidth: [30, 40],
      cockpitHeight: [16, 22],
      cockpitOffset: [4, 16],
      engineCount: [2, 4],
      engineSize: [20, 28],
      engineSpacing: [34, 50],
      nozzleLength: [24, 36],
      wingSpan: [40, 58],
      wingSweep: [12, 24],
      wingForward: [4, 12],
      wingThickness: [18, 26],
      wingOffset: [12, 26],
      wingDihedral: [-4, 8],
      finHeight: [24, 38],
      finWidth: [12, 22],
      finCount: [2, 3],
      stripeOffset: [32, 56],
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
      bodyLength: [130, 170],
      bodyWidth: [34, 46],
      bodyMidInset: [6, 16],
      noseCurve: [14, 24],
      tailCurve: [16, 28],
      noseWidthFactor: [0.38, 0.55],
      tailWidthFactor: [0.55, 0.7],
      cockpitWidth: [26, 34],
      cockpitHeight: [18, 24],
      cockpitOffset: [-2, 10],
      engineCount: [2, 3],
      engineSize: [18, 26],
      engineSpacing: [30, 44],
      nozzleLength: [20, 32],
      wingSpan: [48, 64],
      wingSweep: [18, 32],
      wingForward: [6, 16],
      wingThickness: [14, 20],
      wingOffset: [0, 16],
      wingDihedral: [-2, 12],
      finHeight: [28, 44],
      finWidth: [12, 20],
      finCount: [1, 2],
      stripeOffset: [20, 44],
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
      bodyLength: [90, 120],
      bodyWidth: [28, 36],
      bodyMidInset: [8, 18],
      noseCurve: [10, 22],
      tailCurve: [10, 24],
      noseWidthFactor: [0.4, 0.58],
      tailWidthFactor: [0.5, 0.7],
      cockpitWidth: [16, 24],
      cockpitHeight: [12, 18],
      cockpitOffset: [-10, 4],
      engineCount: [3, 5],
      engineSize: [14, 22],
      engineSpacing: [20, 32],
      nozzleLength: [14, 24],
      wingSpan: [32, 48],
      wingSweep: [10, 22],
      wingForward: [2, 10],
      wingThickness: [12, 18],
      wingOffset: [-10, 4],
      wingDihedral: [-12, 6],
      finHeight: [18, 32],
      finWidth: [8, 16],
      finCount: [0, 2],
      stripeOffset: [12, 26],
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

const modeSelect = document.getElementById("modeSelect");
const categorySelect = document.getElementById("categorySelect");
const spriteGrid = document.getElementById("spriteGrid");
const detailSprite = document.getElementById("detailSprite");
const definition = document.getElementById("definition");
const newSeedButton = document.getElementById("newSeed");
const shufflePaletteButton = document.getElementById("shufflePalette");
const debugToggleButton = document.getElementById("debugToggle");

let renderCounter = 0;

let currentCategory = "fighter";
let currentViewMode = "both";
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

populateModeSelect();
populateCategorySelect();
initialise();

function populateModeSelect() {
  Object.entries(VIEW_MODES).forEach(([key, def]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${def.label}`;
    option.title = def.description;
    modeSelect.appendChild(option);
  });
  modeSelect.value = currentViewMode;
}

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

  modeSelect.addEventListener("change", () => {
    currentViewMode = modeSelect.value;
    renderDetail(selectedConfig);
    renderGrid();
  });

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

  const svg = document.createElementNS(SVG_NS, "svg");
  renderSpaceship(svg, config, { scale: 0.8, viewMode: currentViewMode });

  const meta = document.createElement("div");
  meta.className = "meta";
  const palette = document.createElement("span");
  palette.textContent = config.palette.name;
  const category = document.createElement("span");
  category.textContent = config.label || config.category;
  const mode = document.createElement("span");
  const viewDef = VIEW_MODES[currentViewMode];
  mode.textContent = viewDef ? viewDef.shortLabel : currentViewMode;
  meta.append(category, mode, palette);

  button.append(svg, meta);
  return button;
}

function renderDetail(config) {
  renderSpaceship(detailSprite, config, { scale: 1, viewMode: currentViewMode });
  definition.textContent = JSON.stringify(
    config,
    (key, value) => (typeof value === "number" ? Number(value.toFixed(2)) : value),
    2,
  );
}

function renderSpaceship(svg, config, options = {}) {
  const scale = options.scale ?? 1;
  const viewMode = options.viewMode ?? currentViewMode ?? "both";
  svg.innerHTML = "";
  svg.setAttribute("data-view-mode", viewMode);
  svg.setAttribute("data-debug", debugColorsEnabled ? "true" : "false");

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  if (viewMode === "both") {
    svg.setAttribute("viewBox", "0 0 400 200");
    const projectionScale = scale * 0.9;
    const topGroup = createShipRootGroup(projectionScale, 0, 0);
    const sideGroup = createShipRootGroup(projectionScale, 200, 0);
    svg.append(topGroup.wrapper, sideGroup.wrapper);
    drawTopDownSpaceship(topGroup.root, config, defs);
    drawSideViewSpaceship(sideGroup.root, config, defs);
    return;
  }

  svg.setAttribute("viewBox", "0 0 200 200");
  const rootGroup = createShipRootGroup(scale, 0, 0);
  svg.appendChild(rootGroup.wrapper);

  if (viewMode === "side") {
    drawSideViewSpaceship(rootGroup.root, config, defs);
  } else {
    drawTopDownSpaceship(rootGroup.root, config, defs);
  }
}

function createShipRootGroup(scale, offsetX, offsetY) {
  const wrapper = document.createElementNS(SVG_NS, "g");
  wrapper.classList.add("ship-root");
  const root = document.createElementNS(SVG_NS, "g");
  const transforms = [];
  const baseX = offsetX + 100;
  const baseY = offsetY + 100;
  const translateX = baseX - 100 * scale;
  const translateY = baseY - 100 * scale;
  if (translateX !== 0 || translateY !== 0) {
    transforms.push(`translate(${translateX} ${translateY})`);
  }
  if (scale !== 1) {
    transforms.push(`scale(${scale})`);
  }
  if (transforms.length > 0) {
    root.setAttribute("transform", transforms.join(" "));
  }
  wrapper.appendChild(root);
  return { wrapper, root };
}

function drawTopDownSpaceship(root, config, defs) {
  drawWings(root, config);
  drawBody(root, config);
  drawCockpit(root, config, defs);
  drawEngines(root, config);
  drawFins(root, config);
  drawDetails(root, config);
}

function drawSideViewSpaceship(root, config, defs) {
  const geometry = deriveSideViewGeometry(config);
  drawSideHull(root, config, geometry);
  drawSideWing(root, config, geometry);
  drawSideStabiliser(root, config, geometry);
  drawSideMarkings(root, config, geometry);
  drawSideCanopy(root, config, geometry, defs);
  drawSideThrusters(root, config, geometry);
  drawSideWeapons(root, config, geometry);
  drawSideLights(root, config, geometry);
}

function deriveSideViewGeometry(config) {
  // Translate the shared top-down configuration into approximate side-view dimensions.
  const { body, cockpit, engine, wings, fins, details } = config;

  const halfLength = body.length / 2;
  const fuselageRadius = Math.max(body.halfWidth, 12);
  const baseHeight = Math.max(fuselageRadius * 1.4, (cockpit?.height ?? 18) + 8, (fins?.height ?? 24) * 0.55);

  // Helper closures to keep side-view distances in lockstep with the top-down layout.
  const clampToBody = (value) => clamp(value, 0, body.length);
  const centerOffsetToBody = (offset) => clampToBody(halfLength + offset);

  const noseLength = clamp(body.length * 0.18 + body.noseCurve * 0.35, body.length * 0.16, body.length * 0.32);
  const tailLength = clamp(body.length * 0.22 + body.tailCurve * 0.3, body.length * 0.16, body.length * 0.36);
  const noseHeight = Math.max(8, body.noseCurve * 0.55);
  const dorsalHeight = Math.max((cockpit?.height ?? 18) + 6, (fins?.height ?? 28) * 0.55);
  const tailHeight = Math.max(6, (fins?.height ?? 24) * 0.4);
  const bellyDrop = clamp(body.midInset * 1.6, baseHeight * 0.22, baseHeight * 0.48);
  const ventralDepth = bellyDrop + Math.max(6, body.midInset * 0.6);
  const hasIntakes = (engine?.count ?? 0) > 1;
  const intakeHeight = hasIntakes ? Math.min(baseHeight * 0.45, (engine?.size ?? 18) * 0.9) : 0;
  const intakeDepth = hasIntakes ? Math.min(fuselageRadius * 1.2, (engine?.spacing ?? 24) * 0.6) : 0;

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
  };

  const canopyLength = clamp((cockpit?.width ?? 28) * 1.1, body.length * 0.16, body.length * 0.32);
  const canopyHeight = clamp((cockpit?.height ?? 18) * 1.05, (cockpit?.height ?? 18) * 0.85, dorsalHeight - 4);
  const canopyCenterFromNose = clamp(
    body.length * 0.32 + (cockpit?.offsetY ?? 0),
    canopyLength * 0.5,
    body.length - canopyLength * 0.5,
  );
  const canopy = {
    length: canopyLength,
    height: canopyHeight,
    offset: canopyCenterFromNose - canopyLength * 0.5,
    offsetY: -(cockpit?.offsetY ?? 0) * 0.25,
    frame: clamp((cockpit?.width ?? 28) * 0.08, 1.8, 3.8),
    tint: cockpit?.tint ?? "#7ed4ff",
  };

  const wingEnabled = Boolean(wings?.enabled);
  const wingRootFromNose = wingEnabled ? centerOffsetToBody(wings?.offsetY ?? 0) : 0;
  const wingSpan = wings?.span ?? 0;
  const wingChord = (wings?.forward ?? 0) + (wings?.sweep ?? 0);
  // Match the perceived width of the profile with the planform height so projections stay consistent.
  const wingLength = wingEnabled ? Math.max(24, wingSpan, wingChord * 0.85) : 0;
  const wing = {
    enabled: wingEnabled,
    position: wingEnabled ? clamp(wingRootFromNose, wingLength * 0.12, body.length - wingLength * 0.25) : 0,
    length: wingLength,
    profileSpan: wingSpan,
    // Scale the visible thickness by the true span so the silhouette reads the same in both views.
    thickness: wingEnabled
      ? Math.max(10, (wings?.thickness ?? 0) * 0.5, wingSpan * 0.45)
      : 0,
    dihedral: wingEnabled ? Math.max(0, (wings?.dihedral ?? 0) * 0.8) : 0,
    drop: wingEnabled
      ? Math.max(6, (wings?.sweep ?? 0) * 0.6, wingSpan * 0.25)
      : 0,
    mountHeight: wingEnabled ? ((wings?.offsetY ?? 0) / Math.max(halfLength, 1)) * (baseHeight * 0.35) : 0,
    accent: Boolean(wings?.tipAccent),
  };

  const stabiliser = fins
    ? {
        // Map top view dimensions directly to the side view so the fin footprint stays consistent.
        length: Math.max(12, fins.height),
        height: Math.max(8, fins.width * 1.05),
        sweep: Math.max(10, (wings?.forward ?? 18) * 0.5),
        thickness: Math.max(5, fins.width * 0.55),
        offsetY: ((fins.side ?? 0) - (fins.bottom ?? 0)) * baseHeight * 0.06,
        ventral: (fins.bottom ?? 0) > 0,
      }
    : null;

  const thruster = engine
    ? {
        count: Math.max(1, Math.round(engine.count)),
        radius: Math.max(4, engine.size * 0.45),
        spacing: Math.max(8, engine.spacing * 0.45),
        offsetY: 0,
        nozzleLength: Math.max(6, engine.nozzleLength * 0.65),
        glow: engine.glow,
      }
    : null;

  const heavyArmament = (engine?.count ?? 1) > 2 || (details?.antenna ?? false);
  const wingMountViable = wingEnabled && wing.length > 0;
  const preferWingMount = wingMountViable && nextRandom() < (heavyArmament ? 0.65 : 0.45);
  let armament;

  if (preferWingMount) {
    // Allow the generator to hang missiles or bombs directly from the wing profile.
    const ordnanceType = nextRandom() < 0.55 ? "missile" : "bomb";
    const hardpointCount = heavyArmament ? 2 : 1;
    const basePayloadLength = clamp(body.length * 0.2, 16, Math.min(wing.length * 0.85, 42));
    const basePayloadRadius = clamp(wing.thickness * 0.45, 5, 14);
    const basePylonLength = clamp(wing.thickness * 0.7, 8, 26);
    const chordAnchors = hardpointCount === 1 ? [0.48] : [0.38, 0.68];
    armament = {
      mount: "wing",
      type: ordnanceType,
      barrels: hardpointCount,
      hardpoints: chordAnchors.map((ratio) => ({
        chordRatio: clamp(ratio + randomBetween(-0.04, 0.04), 0.25, 0.78),
        pylonLength: clamp(basePylonLength + randomBetween(-2, 3), 6, 28),
        payloadLength: clamp(basePayloadLength * (1 + randomBetween(-0.12, 0.12)), 14, 48),
        payloadRadius: clamp(
          basePayloadRadius * (ordnanceType === "bomb" ? 1.12 : 0.88),
          4.5,
          16,
        ),
      })),
    };
  } else {
    armament = {
      mount: "nose",
      barrels: heavyArmament ? 2 : 1,
      length: Math.max(18, body.length * 0.12 + (wings?.forward ?? 18) * 0.4),
      spacing: heavyArmament
        ? Math.max(6, (wings?.thickness ?? 12) * 0.35)
        : Math.max(4, (wings?.thickness ?? 10) * 0.25),
      offsetY: -((cockpit?.offsetY ?? 0) / Math.max(halfLength, 1)) * (baseHeight * 0.2),
      housingHeight: Math.max(6, (cockpit?.height ?? 18) * 0.55),
    };
  }

  const markings = {
    enabled: Boolean(details?.stripe),
    stripeLength: body.length * 0.25,
    stripeHeight: clamp(baseHeight * 0.3, baseHeight * 0.2, baseHeight * 0.45),
    stripeOffset: clamp(details?.stripeOffset ?? body.length * 0.3, body.length * 0.12, body.length * 0.85),
    stripeLift: clamp(-(cockpit?.offsetY ?? 0) * 0.4, -baseHeight * 0.3, baseHeight * 0.3),
  };

  const lights = {
    nose: Boolean(details?.antenna),
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
  };
}

function drawSideHull(root, config, geometry) {
  const { palette } = config;
  const { profile } = geometry;
  const group = document.createElementNS(SVG_NS, "g");

  const hull = document.createElementNS(SVG_NS, "path");
  hull.setAttribute("d", buildSideHullPath(profile));
  hull.setAttribute("fill", partColor("hull", palette.primary));
  hull.setAttribute("stroke", palette.accent);
  hull.setAttribute("stroke-width", 2.4);
  hull.setAttribute("stroke-linejoin", "round");
  group.appendChild(hull);

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

function drawSideWing(root, config, geometry) {
  const { palette } = config;
  const { wing: wingProfile, profile } = geometry;
  if (!wingProfile?.enabled) {
    return;
  }

  const points = buildSideWingPoints(wingProfile, profile);
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

function drawSideStabiliser(root, config, geometry) {
  const { palette } = config;
  const { stabiliser, profile } = geometry;
  if (!stabiliser) {
    return;
  }
  const noseX = 100 - profile.length / 2;
  const tailBase = noseX + profile.length - stabiliser.length;
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

function drawSideCanopy(root, config, geometry, defs) {
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

  const noseX = 100 - profile.length / 2;
  const baseX = noseX + canopy.offset;
  const baseY = 100 + (profile.offsetY ?? 0) - canopy.height * 0.1 + (canopy.offsetY ?? 0);

  const canopyShape = document.createElementNS(SVG_NS, "path");
  const apexX = baseX + canopy.length / 2;
  const canopyPath = [
    `M ${baseX} ${baseY}`,
    `Q ${apexX} ${baseY - canopy.height} ${baseX + canopy.length} ${baseY}`,
    `Q ${apexX} ${baseY + canopy.height * 0.25} ${baseX} ${baseY}`,
    "Z",
  ].join(" ");
  canopyShape.setAttribute("d", canopyPath);
  canopyShape.setAttribute("fill", `url(#${gradientId})`);
  canopyShape.setAttribute("stroke", debugColorsEnabled ? canopyColor : palette.trim);
  canopyShape.setAttribute("stroke-width", canopy.frame);
  canopyShape.setAttribute("stroke-linejoin", "round");
  root.appendChild(canopyShape);

  const frame = document.createElementNS(SVG_NS, "path");
  const framePath = `M ${baseX + canopy.length * 0.08} ${baseY} Q ${apexX} ${baseY - canopy.height * 0.85} ${
    baseX + canopy.length * 0.92
  } ${baseY}`;
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

function drawSideThrusters(root, config, geometry) {
  const { palette } = config;
  const { thruster, profile } = geometry;
  if (!thruster) {
    return;
  }
  const tailX = 100 + profile.length / 2;
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

function drawSideWeapons(root, config, geometry) {
  const { palette } = config;
  const { armament, profile, wing } = geometry;
  if (!armament) {
    return;
  }

  if (armament.mount === "wing" && wing?.enabled && armament.hardpoints?.length) {
    // Render ordnance pods under the visible wing hardpoints so they remain readable in profile.
    const noseX = 100 - profile.length / 2;
    const centerY = 100 + (profile.offsetY ?? 0);
    const wingBaseY = centerY + wing.mountHeight + wing.thickness;
    const ordnanceColor = partColor("weapons", shadeColor(palette.secondary, -0.1));
    const pylonColor = partColor("weapons", shadeColor(palette.secondary, -0.25));
    const accentColor = partStroke("weapons", palette.trim);
    const tipColor = partColor("weapons", mixColor(palette.accent, palette.secondary, 0.4));

    armament.hardpoints.forEach((hardpoint) => {
      const anchorX = noseX + wing.position + wing.length * hardpoint.chordRatio;
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

  const noseX = 100 - profile.length / 2;
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

function drawSideMarkings(root, config, geometry) {
  const { palette } = config;
  const { markings, profile } = geometry;
  if (!markings?.enabled) {
    return;
  }
  const noseX = 100 - profile.length / 2;
  const startX = noseX + markings.stripeOffset;
  const endX = Math.min(startX + markings.stripeLength, noseX + profile.length - profile.tailLength * 0.6);
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

function drawSideLights(root, config, geometry) {
  const { palette } = config;
  const { lights, profile } = geometry;
  if (!lights) {
    return;
  }
  const noseX = 100 - profile.length / 2;
  const tailX = 100 + profile.length / 2;
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
    dorsal.setAttribute("cx", (noseX + profile.noseLength + profile.length * 0.36).toString());
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
    intake.setAttribute("cx", (noseX + profile.noseLength * 0.7).toString());
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

function drawBody(root, config) {
  const { body, palette } = config;
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", buildBodyPath(body));
  path.setAttribute("fill", partColor("hull", palette.primary));
  path.setAttribute("stroke", palette.accent);
  path.setAttribute("stroke-width", 2.4);
  path.setAttribute("stroke-linejoin", "round");
  root.appendChild(path);

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

function drawWings(root, config) {
  const { wings, body, palette } = config;
  if (!wings || wings.enabled === false) {
    return;
  }
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("fill", partColor("wing", palette.secondary));
  group.setAttribute("stroke", palette.trim);
  group.setAttribute("stroke-width", 1.6);
  group.setAttribute("stroke-linejoin", "round");

  const leftPoints = buildWingPoints(wings, body, true);
  const rightPoints = buildWingPoints(wings, body, false);

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

function drawCockpit(root, config, defs) {
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

  const centerY = 100 - body.length / 2 + body.length * 0.32 + cockpit.offsetY;
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

function drawEngines(root, config) {
  const { engine, palette, body } = config;
  const group = document.createElementNS(SVG_NS, "g");
  const baseY = 100 + body.length / 2 - 4;
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

function drawFins(root, config) {
  const { fins, palette, body } = config;
  const group = document.createElementNS(SVG_NS, "g");
  const stabiliserColor = partColor("stabiliser", palette.secondary);

  if (fins.top) {
    const baseY = 100 - body.length * 0.28;
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
    const sideBaseY = 100 + body.length * 0.12;
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
    const baseY = 100 + body.length / 2;
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

function drawDetails(root, config) {
  const { details, palette, body, cockpit } = config;
  if (details.stripe) {
    const stripeTop = 100 - body.length / 2 + details.stripeOffset;
    const stripeBottom = stripeTop + body.length * 0.25;
    const canopyCenter = cockpit
      ? 100 - body.length / 2 + body.length * 0.32 + (cockpit.offsetY ?? 0)
      : null;
    const canopyHalfHeight = cockpit ? (cockpit.height ?? 0) / 2 + 4 : 0;
    const canopyTop = canopyCenter !== null ? canopyCenter - canopyHalfHeight : null;
    const canopyBottom = canopyCenter !== null ? canopyCenter + canopyHalfHeight : null;
    const overlapsCanopy =
      canopyTop !== null && canopyBottom !== null && stripeTop < canopyBottom && stripeBottom > canopyTop;

    if (!overlapsCanopy) {
      const stripe = document.createElementNS(SVG_NS, "path");
      stripe.setAttribute("d", buildStripePath(body, details));
      stripe.setAttribute("stroke", partStroke("markings", palette.accent));
      stripe.setAttribute("stroke-width", 3.4);
      stripe.setAttribute("stroke-linecap", "round");
      stripe.setAttribute("opacity", "0.85");
      root.appendChild(stripe);
    }
  }

  if (details.antenna) {
    const antenna = document.createElementNS(SVG_NS, "line");
    const topY = 100 - body.length / 2 - 8;
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
  const halfLength = body.length / 2;
  const noseY = 100 - halfLength;
  const tailY = 100 + halfLength;
  const waistLeft = 100 - body.halfWidth;
  const waistRight = 100 + body.halfWidth;
  const noseWidth = body.halfWidth * body.noseWidthFactor;
  const tailWidth = body.halfWidth * body.tailWidthFactor;
  const midUpper = 100 - body.midInset;
  const midLower = 100 + body.midInset;

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

function buildPlatingPath(body) {
  const halfLength = body.length / 2;
  const top = 100 - halfLength + 18;
  const bottom = 100 + halfLength - 18;
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

function buildWingPoints(wings, body, isLeft) {
  const attachY = 100 + wings.offsetY;
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

function buildSideHullPath(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const noseX = 100 - profile.length / 2;
  const tailX = 100 + profile.length / 2;
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

function buildSidePanelLines(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const noseX = 100 - profile.length / 2 + profile.noseLength * 0.9;
  const tailX = 100 + profile.length / 2 - profile.tailLength * 0.65;
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

function buildSideIntakePath(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const noseX = 100 - profile.length / 2;
  const startX = noseX + profile.noseLength * 0.55;
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

function buildSideWingPoints(wing, profile) {
  const noseX = 100 - profile.length / 2;
  const baseX = noseX + wing.position;
  const baseY = 100 + (profile.offsetY ?? 0) + wing.mountHeight;
  const leadingX = baseX + wing.length;
  const spanInfluence = wing.profileSpan ?? wing.length;
  const leadingY = baseY - Math.max(wing.dihedral, spanInfluence * 0.18);
  const trailingX = baseX + wing.length * 0.78;
  const trailingY = baseY + Math.max(wing.drop, spanInfluence * 0.22);
  const rootBottomX = baseX - wing.length * 0.14;
  const rootBottomY = baseY + Math.max(wing.thickness, spanInfluence * 0.5);
  return [
    [baseX, baseY],
    [baseX + wing.length * 0.3, baseY - Math.max(wing.thickness * 0.85, spanInfluence * 0.4)],
    [leadingX, leadingY],
    [trailingX, trailingY],
    [rootBottomX, rootBottomY],
  ];
}

function buildStripePath(body, details) {
  const noseY = 100 - body.length / 2 + details.stripeOffset;
  const tailY = noseY + body.length * 0.25;
  const left = 100 - body.halfWidth * 0.6;
  const right = 100 + body.halfWidth * 0.6;
  return [`M ${left} ${noseY}`, `L ${right} ${noseY + 6}`, `L ${right} ${tailY}`, `L ${left} ${tailY - 6}`].join(" ");
}

function pointsToString(points) {
  return points.map((point) => point.join(" ")).join(" ");
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


function createBaseConfig(categoryKey) {
  const def = CATEGORY_DEFINITIONS[categoryKey];
  const palette = pickPalette();
  return normaliseConfig(createTopDownConfig(categoryKey, def, palette));
}

function createTopDownConfig(categoryKey, def, palette) {
  const ranges = def.ranges;

  const sideFinCount = nextRandom() < def.features.sideFinProbability ? randomInt(...ranges.finCount) : 0;
  const bodyLength = randomBetween(...ranges.bodyLength);
  const bodyHalfWidth = randomBetween(...ranges.bodyWidth) / 2;

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

  const baseSpan = randomBetween(...ranges.wingSpan);
  const baseSweep = randomBetween(...ranges.wingSweep);
  const baseForward = randomBetween(...ranges.wingForward);
  const baseThickness = randomBetween(...ranges.wingThickness);
  const baseOffset = randomBetween(...ranges.wingOffset);
  const baseDihedral = randomBetween(...ranges.wingDihedral);

  let wingSpan = wingsEnabled ? baseSpan : 0;
  let wingSweep = wingsEnabled ? baseSweep : 0;
  let wingForward = wingsEnabled ? baseForward : 0;
  let wingThickness = wingsEnabled ? baseThickness : 0;
  let wingOffset = wingsEnabled ? baseOffset : 0;
  let wingDihedral = wingsEnabled ? baseDihedral : 0;

  if (wingsEnabled && wingMount === "aft") {
    // Push aft-mounted wings toward the tail so they resemble swept-back fighter wings.
    const halfLength = bodyLength / 2;
    const minTailOffset = Math.max(halfLength * 0.32, 14);
    const maxTailOffset = Math.max(minTailOffset + 4, halfLength - 12);
    wingOffset = randomBetween(minTailOffset, maxTailOffset);
    wingForward *= 0.7;
    wingSpan *= 0.9;
    wingDihedral *= 0.6;
  }

  return {
    id: randomId(),
    category: categoryKey,
    label: def.label,
    description: def.description,
    palette,
    body: {
      length: bodyLength,
      halfWidth: bodyHalfWidth,
      midInset: randomBetween(...ranges.bodyMidInset),
      noseCurve: randomBetween(...ranges.noseCurve),
      tailCurve: randomBetween(...ranges.tailCurve),
      noseWidthFactor: randomBetween(...ranges.noseWidthFactor),
      tailWidthFactor: randomBetween(...ranges.tailWidthFactor),
      plating: nextRandom() < def.features.platingProbability,
    },
    cockpit: {
      width: randomBetween(...ranges.cockpitWidth),
      height: randomBetween(...ranges.cockpitHeight),
      offsetY: randomBetween(...ranges.cockpitOffset),
      tint: palette.cockpit,
    },
    engine: {
      count: randomInt(...ranges.engineCount),
      size: randomBetween(...ranges.engineSize),
      spacing: randomBetween(...ranges.engineSpacing),
      nozzleLength: randomBetween(...ranges.nozzleLength),
      glow: palette.glow,
    },
    wings: {
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
    },
    fins: {
      top: nextRandom() < def.features.topFinProbability ? 1 : 0,
      side: sideFinCount,
      bottom: nextRandom() < def.features.bottomFinProbability ? 1 : 0,
      height: randomBetween(...ranges.finHeight),
      width: randomBetween(...ranges.finWidth),
    },
    details: {
      stripe: nextRandom() < def.features.stripeProbability,
      stripeOffset: randomBetween(...ranges.stripeOffset),
      antenna: nextRandom() < def.features.antennaProbability,
    },
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
  copy.details.stripeOffset = Math.max(6, copy.details.stripeOffset);

  if (copy.wings) {
    copy.wings.enabled = Boolean(copy.wings.enabled);
    if (!copy.wings.enabled) {
      copy.wings.mount = "none";
      copy.wings.tipAccent = false;
      copy.wings.offsetY = 0;
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
    }
  }
  return copy;
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
