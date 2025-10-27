const SVG_NS = "http://www.w3.org/2000/svg";
const GRID_SIZE = 9;

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

const modeSelect = document.getElementById("modeSelect");
const categorySelect = document.getElementById("categorySelect");
const spriteGrid = document.getElementById("spriteGrid");
const detailSprite = document.getElementById("detailSprite");
const definition = document.getElementById("definition");
const newSeedButton = document.getElementById("newSeed");
const shufflePaletteButton = document.getElementById("shufflePalette");

let renderCounter = 0;

let currentOrientation = "horizontal";
let currentCategory = "fighter";
let parentConfig = null;
let selectedConfig = null;

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
  modeSelect.value = currentOrientation;

  parentConfig = createBaseConfig(currentCategory, currentOrientation);
  selectedConfig = cloneConfig(parentConfig);
  renderDetail(selectedConfig);
  renderGrid();

  modeSelect.addEventListener("change", () => {
    currentOrientation = modeSelect.value;
    parentConfig = createBaseConfig(currentCategory, currentOrientation);
    selectedConfig = cloneConfig(parentConfig);
    renderDetail(selectedConfig);
    renderGrid();
  });

  categorySelect.addEventListener("change", () => {
    currentCategory = categorySelect.value;
    parentConfig = createBaseConfig(currentCategory, currentOrientation);
    selectedConfig = cloneConfig(parentConfig);
    renderDetail(selectedConfig);
    renderGrid();
  });

  newSeedButton.addEventListener("click", () => {
    parentConfig = createBaseConfig(currentCategory, currentOrientation);
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
  svg.setAttribute("viewBox", "0 0 200 200");
  renderSpaceship(svg, config, { scale: 0.8 });

  const meta = document.createElement("div");
  meta.className = "meta";
  const palette = document.createElement("span");
  palette.textContent = config.palette.name;
  const category = document.createElement("span");
  category.textContent = config.label || config.category;
  meta.append(category, palette);

  button.append(svg, meta);
  return button;
}

function renderDetail(config) {
  renderSpaceship(detailSprite, config, { scale: 1 });
  definition.textContent = JSON.stringify(
    config,
    (key, value) => (typeof value === "number" ? Number(value.toFixed(2)) : value),
    2,
  );
}

function renderSpaceship(svg, config, options = {}) {
  const scale = options.scale ?? 1;
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 200 200");

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  const root = document.createElementNS(SVG_NS, "g");
  const transforms = [];
  if (scale !== 1) {
    transforms.push(`translate(${100 - 100 * scale} ${100 - 100 * scale}) scale(${scale})`);
  }
  const orientation = config.orientation || "vertical";
  if (orientation === "horizontal") {
    // Rotate to present side-scroller friendly sprites without duplicating geometry logic.
    transforms.push("rotate(90 100 100)");
  }
  if (transforms.length > 0) {
    root.setAttribute("transform", transforms.join(" "));
  }
  root.classList.add("ship-root");
  svg.appendChild(root);

  drawWings(root, config);
  drawBody(root, config);
  drawCockpit(root, config, defs);
  drawEngines(root, config);
  drawFins(root, config);
  drawDetails(root, config);
}

function drawBody(root, config) {
  const { body, palette } = config;
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", buildBodyPath(body));
  path.setAttribute("fill", palette.primary);
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
  if (!wings.enabled) {
    return;
  }
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("fill", palette.secondary);
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
    accentLeft.setAttribute("stroke", palette.accent);
    accentLeft.setAttribute("stroke-width", 2.2);
    const accentRight = document.createElementNS(SVG_NS, "polyline");
    accentRight.setAttribute("points", pointsToString(buildWingAccent(rightPoints)));
    accentRight.setAttribute("stroke", palette.accent);
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

  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", mixColor(cockpit.tint, "#ffffff", 0.4));
  stop1.setAttribute("stop-opacity", "0.9");

  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "60%");
  stop2.setAttribute("stop-color", cockpit.tint);
  stop2.setAttribute("stop-opacity", "0.95");

  const stop3 = document.createElementNS(SVG_NS, "stop");
  stop3.setAttribute("offset", "100%");
  stop3.setAttribute("stop-color", shadeColor(cockpit.tint, -0.25));
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
  ellipse.setAttribute("stroke", palette.trim);
  ellipse.setAttribute("stroke-width", 2);

  const frame = document.createElementNS(SVG_NS, "ellipse");
  frame.setAttribute("cx", "100");
  frame.setAttribute("cy", centerY.toString());
  frame.setAttribute("rx", (cockpit.width / 2 + 4).toString());
  frame.setAttribute("ry", (cockpit.height / 2 + 3).toString());
  frame.setAttribute("fill", "none");
  frame.setAttribute("stroke", palette.accent);
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

  for (let i = 0; i < engine.count; i += 1) {
    const offsetX = engine.count === 1 ? 0 : -totalWidth / 2 + i * engine.spacing;
    const cx = 100 + offsetX;

    const nozzle = document.createElementNS(SVG_NS, "rect");
    nozzle.setAttribute("x", (cx - engine.size / 2).toString());
    nozzle.setAttribute("y", (baseY - engine.nozzleLength).toString());
    nozzle.setAttribute("width", engine.size.toString());
    nozzle.setAttribute("height", engine.nozzleLength.toString());
    nozzle.setAttribute("rx", (engine.size * 0.24).toString());
    nozzle.setAttribute("fill", palette.secondary);
    nozzle.setAttribute("stroke", palette.trim);
    nozzle.setAttribute("stroke-width", 1.4);

    const cap = document.createElementNS(SVG_NS, "ellipse");
    cap.setAttribute("cx", cx.toString());
    cap.setAttribute("cy", (baseY - engine.nozzleLength).toString());
    cap.setAttribute("rx", (engine.size / 2).toString());
    cap.setAttribute("ry", (engine.size * 0.22).toString());
    cap.setAttribute("fill", palette.secondary);
    cap.setAttribute("stroke", palette.trim);
    cap.setAttribute("stroke-width", 1.2);

    const thruster = document.createElementNS(SVG_NS, "ellipse");
    thruster.setAttribute("cx", cx.toString());
    thruster.setAttribute("cy", baseY.toString());
    thruster.setAttribute("rx", (engine.size * 0.45).toString());
    thruster.setAttribute("ry", (engine.size * 0.32).toString());
    thruster.setAttribute("fill", shadeColor(palette.secondary, 0.1));
    thruster.setAttribute("stroke", palette.accent);
    thruster.setAttribute("stroke-width", 1.1);

    const flame = document.createElementNS(SVG_NS, "polygon");
    const flamePoints = [
      [cx - engine.size * 0.2, baseY + 4],
      [cx, baseY + engine.size * 1.2],
      [cx + engine.size * 0.2, baseY + 4],
    ];
    flame.setAttribute("points", pointsToString(flamePoints));
    flame.setAttribute("fill", engine.glow);
    flame.setAttribute("opacity", "0.85");
    flame.classList.add("thruster-flame");

    group.append(nozzle, cap, thruster, flame);
  }

  root.appendChild(group);
}

function drawFins(root, config) {
  const { fins, palette, body } = config;
  const group = document.createElementNS(SVG_NS, "g");

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
    fin.setAttribute("fill", palette.secondary);
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
        poly.setAttribute("fill", palette.secondary);
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
    fin.setAttribute("fill", palette.secondary);
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
  const { details, palette, body } = config;
  if (details.stripe) {
    const stripe = document.createElementNS(SVG_NS, "path");
    stripe.setAttribute("d", buildStripePath(body, details));
    stripe.setAttribute("stroke", palette.accent);
    stripe.setAttribute("stroke-width", 3.4);
    stripe.setAttribute("stroke-linecap", "round");
    stripe.setAttribute("opacity", "0.85");
    root.appendChild(stripe);
  }

  if (details.antenna) {
    const antenna = document.createElementNS(SVG_NS, "line");
    const topY = 100 - body.length / 2 - 8;
    antenna.setAttribute("x1", "100");
    antenna.setAttribute("y1", (topY - 4).toString());
    antenna.setAttribute("x2", "100");
    antenna.setAttribute("y2", (topY - 20).toString());
    antenna.setAttribute("stroke", palette.trim);
    antenna.setAttribute("stroke-width", 1.4);
    antenna.setAttribute("stroke-linecap", "round");

    const beacon = document.createElementNS(SVG_NS, "circle");
    beacon.setAttribute("cx", "100");
    beacon.setAttribute("cy", (topY - 24).toString());
    beacon.setAttribute("r", "3");
    beacon.setAttribute("fill", palette.glow);
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

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choose(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function createBaseConfig(categoryKey, orientation = "vertical") {
  const def = CATEGORY_DEFINITIONS[categoryKey];
  const palette = pickPalette();
  const ranges = def.ranges;

  const sideFinCount = Math.random() < def.features.sideFinProbability ? randomInt(...ranges.finCount) : 0;

  const config = {
    id: randomId(),
    category: categoryKey,
    label: def.label,
    orientation,
    palette,
    body: {
      length: randomBetween(...ranges.bodyLength),
      halfWidth: randomBetween(...ranges.bodyWidth) / 2,
      midInset: randomBetween(...ranges.bodyMidInset),
      noseCurve: randomBetween(...ranges.noseCurve),
      tailCurve: randomBetween(...ranges.tailCurve),
      noseWidthFactor: randomBetween(...ranges.noseWidthFactor),
      tailWidthFactor: randomBetween(...ranges.tailWidthFactor),
      plating: Math.random() < def.features.platingProbability,
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
      style: choose(def.wingStyles),
      span: randomBetween(...ranges.wingSpan),
      sweep: randomBetween(...ranges.wingSweep),
      forward: randomBetween(...ranges.wingForward),
      thickness: randomBetween(...ranges.wingThickness),
      offsetY: randomBetween(...ranges.wingOffset),
      dihedral: randomBetween(...ranges.wingDihedral),
      tipAccent: Math.random() < def.features.wingTipAccentProbability,
      placement: "mid",
      enabled: true,
    },
    fins: {
      top: Math.random() < def.features.topFinProbability,
      bottom: Math.random() < def.features.bottomFinProbability,
      side: sideFinCount,
      height: randomBetween(...ranges.finHeight),
      width: randomBetween(...ranges.finWidth),
    },
    details: {
      stripe: Math.random() < def.features.stripeProbability,
      stripeOffset: randomBetween(...ranges.stripeOffset),
      antenna: Math.random() < def.features.antennaProbability,
    },
    description: def.description,
  };

  applyWingPlacement(config, { reseed: true });

  return config;
}

function mutateConfig(base) {
  const fresh = createBaseConfig(base.category, base.orientation);
  const ratio = 0.35 + Math.random() * 0.4;
  const mixed = mixConfigs(base, fresh, ratio);
  mixed.id = randomId();
  mixed.orientation = base.orientation;
  applyWingPlacement(mixed);
  return normaliseConfig(mixed);
}

// Align wing configuration with the current orientation and requested variation.
function applyWingPlacement(config, options = {}) {
  const { reseed = false } = options;
  const { wings, body, category } = config;
  const orientation = config.orientation || "vertical";
  const def = CATEGORY_DEFINITIONS[category];
  const placements = ["none", "mid", "aft"];
  let placement = wings.placement;

  if (reseed || !placements.includes(placement)) {
    placement = pickWingPlacement(orientation);
  }

  wings.placement = placement;

  if (placement === "none") {
    wings.enabled = false;
    wings.tipAccent = false;
    wings.offsetY = 0;
    return;
  }

  wings.enabled = true;

  if (placement === "aft") {
    const tailLimit = body.length / 2 - 10;
    const desired = body.length * 0.22 + randomBetween(-6, 8);
    const maxRange = Math.min(tailLimit, def.ranges.wingOffset[1] + 12);
    const minRange = Math.max(def.ranges.wingOffset[0], tailLimit * 0.35);
    wings.offsetY = clamp(desired, minRange, maxRange);
  } else {
    wings.offsetY = randomBetween(...def.ranges.wingOffset);
  }
}

function pickWingPlacement(orientation) {
  const roll = Math.random();
  if (orientation === "horizontal") {
    if (roll < 0.3) return "none";
    if (roll < 0.7) return "mid";
    return "aft";
  }
  if (roll < 0.15) return "none";
  if (roll < 0.45) return "aft";
  return "mid";
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
    return Math.random() < ratio ? fresh : original;
  }
  if (typeof original === "boolean" && typeof fresh === "boolean") {
    return Math.random() < ratio ? fresh : original;
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
  copy.engine.count = Math.max(1, Math.round(copy.engine.count));
  copy.fins.side = Math.max(0, Math.round(copy.fins.side));
  copy.fins.height = Math.max(8, copy.fins.height);
  copy.fins.width = Math.max(6, copy.fins.width);
  copy.body.midInset = Math.max(4, copy.body.midInset);
  copy.body.halfWidth = Math.max(10, copy.body.halfWidth);
  copy.details.stripeOffset = Math.max(6, copy.details.stripeOffset);
  copy.wings.enabled = Boolean(copy.wings.enabled);
  if (!copy.wings.enabled) {
    copy.wings.placement = "none";
    copy.wings.tipAccent = false;
    copy.wings.span = 0;
    copy.wings.offsetY = 0;
  } else {
    copy.wings.placement = copy.wings.placement || "mid";
    const wingLimit = copy.body.length / 2 - 10;
    copy.wings.offsetY = clamp(copy.wings.offsetY, -wingLimit, wingLimit);
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
  return `ship-${Math.random().toString(36).slice(2, 9)}`;
}
