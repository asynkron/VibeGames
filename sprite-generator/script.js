const SVG_NS = "http://www.w3.org/2000/svg";

const ARCHETYPES = {
  fighter: {
    weight: 3,
    label: "Strike Fighter",
    description: "Compact hull with aggressive wing sweep, exposed engines, and a luminous canopy inspired by arcade shooters.",
    body: {
      length: [92, 128],
      width: [28, 44],
      noseTaper: [0.28, 0.48],
      tailTaper: [0.38, 0.62],
      shoulder: [0.32, 0.48],
      spineBulge: [6, 16],
    },
    cockpit: {
      length: [24, 34],
      width: [18, 26],
      offset: [20, 34],
      frame: [0.12, 0.22],
    },
    wings: {
      sets: [1, 2],
      span: [48, 72],
      sweep: [32, 58],
      forward: [-12, 8],
      chord: [34, 52],
      thickness: [10, 18],
      tipTaper: [0.2, 0.55],
      dihedral: [-6, 8],
      variants: ["delta", "swept", "forward"],
      frontFinChance: 0.55,
    },
    stabilizers: {
      count: [0, 2],
      height: [18, 36],
      separation: [12, 20],
    },
    engines: {
      count: [1, 2],
      width: [20, 24],
      length: [20, 30],
      spacing: [8, 18],
      flame: [24, 36],
    },
    extras: {
      stripes: 0.7,
    },
    notes: "Think R-Type fuselages and sleek Gradius interceptors – light, quick silhouettes that taper sharply toward the nose.",
  },
  freight: {
    weight: 1,
    label: "Heavy Freight",
    description: "Armoured chassis with modular cargo pods, subdued cockpits, and reinforced thruster pylons built for endurance.",
    body: {
      length: [120, 160],
      width: [34, 52],
      noseTaper: [0.42, 0.65],
      tailTaper: [0.55, 0.78],
      shoulder: [0.28, 0.42],
      spineBulge: [4, 12],
    },
    cockpit: {
      length: [26, 36],
      width: [20, 28],
      offset: [28, 44],
      frame: [0.18, 0.28],
    },
    wings: {
      sets: [1, 1],
      span: [38, 54],
      sweep: [42, 64],
      forward: [-4, 12],
      chord: [44, 62],
      thickness: [14, 22],
      tipTaper: [0.4, 0.75],
      dihedral: [-4, 4],
      variants: ["slab", "delta"],
      frontFinChance: 0.18,
    },
    stabilizers: {
      count: [1, 3],
      height: [20, 40],
      separation: [16, 28],
    },
    engines: {
      count: [2, 3],
      width: [18, 24],
      length: [28, 40],
      spacing: [12, 20],
      flame: [18, 28],
    },
    extras: {
      stripes: 0.4,
    },
    notes: "Cargo sleds that echo the batmobile bulk of Katakis transports – chunky shoulders, thick pylons, and calm light strips.",
  },
  transport: {
    weight: 2,
    label: "Long-Range Transport",
    description: "Balanced proportions with blended wings, twin cabins, and smooth plating reminiscent of sci-fi shuttlecraft.",
    body: {
      length: [108, 140],
      width: [30, 46],
      noseTaper: [0.32, 0.56],
      tailTaper: [0.45, 0.68],
      shoulder: [0.32, 0.5],
      spineBulge: [8, 18],
    },
    cockpit: {
      length: [26, 34],
      width: [20, 26],
      offset: [24, 36],
      frame: [0.14, 0.24],
    },
    wings: {
      sets: [1, 2],
      span: [46, 66],
      sweep: [32, 56],
      forward: [-6, 10],
      chord: [38, 58],
      thickness: [12, 20],
      tipTaper: [0.3, 0.65],
      dihedral: [-2, 6],
      variants: ["gull", "swept", "slab"],
      frontFinChance: 0.32,
    },
    stabilizers: {
      count: [1, 2],
      height: [18, 34],
      separation: [12, 24],
    },
    engines: {
      count: [2, 3],
      width: [16, 22],
      length: [24, 32],
      spacing: [10, 18],
      flame: [20, 30],
    },
    extras: {
      stripes: 0.55,
    },
    notes: "Hybrid silhouettes borrowing from 80s anime shuttles – aerodynamic yet practical, with layered leading edges and soft glows.",
  },
  drone: {
    weight: 1,
    label: "Autonomous Drone",
    description: "Compact, often asymmetric thruster layouts with domed sensors and extendable manipulator fins.",
    body: {
      length: [70, 96],
      width: [26, 36],
      noseTaper: [0.2, 0.4],
      tailTaper: [0.35, 0.55],
      shoulder: [0.38, 0.56],
      spineBulge: [10, 22],
    },
    cockpit: {
      length: [18, 26],
      width: [16, 22],
      offset: [18, 28],
      frame: [0.16, 0.3],
    },
    wings: {
      sets: [1, 2],
      span: [32, 50],
      sweep: [18, 38],
      forward: [-18, 6],
      chord: [24, 38],
      thickness: [10, 16],
      tipTaper: [0.2, 0.6],
      dihedral: [-10, 10],
      variants: ["forward", "gull", "delta"],
      frontFinChance: 0.6,
    },
    stabilizers: {
      count: [0, 2],
      height: [14, 28],
      separation: [10, 16],
    },
    engines: {
      count: [1, 4],
      width: [14, 22],
      length: [18, 28],
      spacing: [8, 14],
      flame: [16, 26],
    },
    extras: {
      stripes: 0.65,
    },
    notes: "Inspired by drone fighters and organic mechs – sensor domes, multiple thrusters, and flickering auxiliary fins.",
  },
};

const PALETTES = [
  {
    name: "nebula",
    hull: "#1f2933",
    trim: "#38bdf8",
    accent: "#c084fc",
    cockpit: "#bae6fd",
    glow: "#7dd3fc",
  },
  {
    name: "ember",
    hull: "#331b1a",
    trim: "#fb7185",
    accent: "#fcd34d",
    cockpit: "#fca5a5",
    glow: "#fbbf24",
  },
  {
    name: "aurora",
    hull: "#0f172a",
    trim: "#38efbd",
    accent: "#60a5fa",
    cockpit: "#93c5fd",
    glow: "#5eead4",
  },
  {
    name: "oxide",
    hull: "#2e1d31",
    trim: "#f472b6",
    accent: "#fb923c",
    cockpit: "#fbcfe8",
    glow: "#f97316",
  },
  {
    name: "polar",
    hull: "#0b253a",
    trim: "#94a3b8",
    accent: "#f8fafc",
    cockpit: "#e0f2fe",
    glow: "#bae6fd",
  },
  {
    name: "jade",
    hull: "#062c2b",
    trim: "#34d399",
    accent: "#22d3ee",
    cockpit: "#a7f3d0",
    glow: "#2dd4bf",
  },
];

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

function randChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randBool(chance = 0.5) {
  return Math.random() < chance;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function weightedRandomCategory() {
  const entries = Object.entries(ARCHETYPES);
  const total = entries.reduce((sum, [, archetype]) => sum + archetype.weight, 0);
  let target = Math.random() * total;
  for (const [key, archetype] of entries) {
    target -= archetype.weight;
    if (target <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function pickPalette(category) {
  const palettePool = [...PALETTES];
  if (category === "freight") {
    palettePool.push({
      name: "cobalt",
      hull: "#1a1f3b",
      trim: "#60a5fa",
      accent: "#eab308",
      cockpit: "#bfdbfe",
      glow: "#a855f7",
    });
  }
  if (category === "drone") {
    palettePool.push({
      name: "lumen",
      hull: "#101b26",
      trim: "#f97316",
      accent: "#facc15",
      cockpit: "#fef9c3",
      glow: "#fb923c",
    });
  }
  return clone(randChoice(palettePool));
}

function jitterNumber(value, variance) {
  const jitter = value * randRange(-variance, variance);
  return value + jitter;
}

function mixNumeric(parent, fresh, variance) {
  const source = randBool(variance) ? fresh : parent;
  const mutated = jitterNumber(source, variance * 0.6);
  return Math.max(0, mutated);
}

function deepMix(parent, fresh, variance) {
  if (parent == null) return clone(fresh);
  if (fresh == null) return clone(parent);
  if (typeof parent !== typeof fresh) {
    return randBool(0.5) ? clone(parent) : clone(fresh);
  }
  if (typeof fresh === "number" && typeof parent === "number") {
    return mixNumeric(parent, fresh, variance);
  }
  if (typeof fresh === "string") {
    return randBool(variance) ? fresh : parent;
  }
  if (Array.isArray(fresh) && Array.isArray(parent)) {
    const length = Math.max(parent.length, fresh.length);
    const result = [];
    for (let i = 0; i < length; i += 1) {
      const p = parent[i];
      const f = fresh[i];
      if (p !== undefined && f !== undefined) {
        result.push(deepMix(p, f, variance));
      } else if (p !== undefined) {
        if (!randBool(variance * 1.25)) result.push(clone(p));
      } else if (f !== undefined) {
        if (randBool(variance * 1.25) || result.length === 0) result.push(clone(f));
      }
    }
    return result;
  }
  if (typeof fresh === "object" && typeof parent === "object") {
    const keys = new Set([...Object.keys(parent), ...Object.keys(fresh)]);
    const mixed = {};
    keys.forEach((key) => {
      if (key === "seed") return;
      mixed[key] = deepMix(parent[key], fresh[key], variance);
    });
    return mixed;
  }
  return clone(fresh);
}

function mixPalette(parent, fresh) {
  return {
    hull: randBool(0.35) ? fresh.hull : parent.hull,
    trim: randBool(0.45) ? fresh.trim : parent.trim,
    accent: randBool(0.4) ? fresh.accent : parent.accent,
    cockpit: randBool(0.5) ? fresh.cockpit : parent.cockpit,
    glow: randBool(0.55) ? fresh.glow : parent.glow,
    name: randBool(0.4) ? fresh.name : parent.name,
  };
}

function createBody(spec) {
  return {
    length: randRange(spec.length[0], spec.length[1]),
    width: randRange(spec.width[0], spec.width[1]),
    noseTaper: randRange(spec.noseTaper[0], spec.noseTaper[1]),
    tailTaper: randRange(spec.tailTaper[0], spec.tailTaper[1]),
    shoulder: randRange(spec.shoulder[0], spec.shoulder[1]),
    spineBulge: randRange(spec.spineBulge[0], spec.spineBulge[1]),
    plating: randInt(1, 3),
    dorsalPods: randBool(0.25),
  };
}

function createCockpit(spec) {
  return {
    length: randRange(spec.length[0], spec.length[1]),
    width: randRange(spec.width[0], spec.width[1]),
    offset: randRange(spec.offset[0], spec.offset[1]),
    frame: randRange(spec.frame[0], spec.frame[1]),
    segment: randChoice(["single", "split", "visor"]),
  };
}

function createEngines(spec, category) {
  const count = randInt(spec.count[0], spec.count[1]);
  return {
    count,
    width: randRange(spec.width[0], spec.width[1]),
    length: randRange(spec.length[0], spec.length[1]),
    spacing: randRange(spec.spacing[0], spec.spacing[1]),
    flameLength: randRange(spec.flame[0], spec.flame[1]),
    bellShape: randChoice(["round", "hex", "square"]),
    mount: randChoice(["pylon", "flush", "cowl"]),
    vented: category !== "drone" && randBool(0.4),
  };
}

function createWingLayer(spec) {
  return {
    variant: randChoice(spec.variants),
    span: randRange(spec.span[0], spec.span[1]),
    sweep: randRange(spec.sweep[0], spec.sweep[1]),
    forward: randRange(spec.forward[0], spec.forward[1]),
    chord: randRange(spec.chord[0], spec.chord[1]),
    thickness: randRange(spec.thickness[0], spec.thickness[1]),
    tipTaper: randRange(spec.tipTaper[0], spec.tipTaper[1]),
    dihedral: randRange(spec.dihedral[0], spec.dihedral[1]),
    accent: randBool(0.5),
  };
}

function createWings(spec) {
  const layerCount = randInt(spec.sets[0], spec.sets[1]);
  const layers = [];
  for (let i = 0; i < layerCount; i += 1) {
    layers.push(createWingLayer(spec));
  }
  return {
    layers,
    frontFins: randBool(spec.frontFinChance ?? 0.35)
      ? {
          span: randRange(16, 26),
          chord: randRange(18, 26),
          offset: randRange(10, 24),
          angle: randRange(-14, 14),
        }
      : null,
  };
}

function createStabilizers(spec) {
  const count = randInt(spec.count[0], spec.count[1]);
  if (count === 0) return null;
  return {
    count,
    height: randRange(spec.height[0], spec.height[1]),
    separation: randRange(spec.separation[0], spec.separation[1]),
    style: randChoice(["blade", "fork", "split"]),
  };
}

function createExtras(extrasSpec, category) {
  return {
    stripes:
      randBool(extrasSpec.stripes) && randBool(0.7)
        ? randChoice(["center", "offset", "wing", "tail"])
        : null,
    lighting: randChoice(["leading", "engine", "canopy", "none"]),
    decals: randChoice(["numeral", "kanji", "glyph", "none"]),
    canopyGlow: randBool(category === "drone" ? 0.8 : 0.5),
  };
}

function freshDefinition(category, orientation) {
  const archetype = ARCHETYPES[category];
  const palette = pickPalette(category);
  return {
    id: Math.random().toString(36).slice(2, 9),
    category,
    label: archetype.label,
    description: archetype.description,
    notes: archetype.notes,
    palette,
    body: createBody(archetype.body),
    cockpit: createCockpit(archetype.cockpit),
    engines: createEngines(archetype.engines, category),
    wings: createWings(archetype.wings),
    stabilizers: createStabilizers(archetype.stabilizers),
    extras: createExtras(archetype.extras, category),
    orientation,
    lineage: null,
  };
}

function generateDefinition(parent = null, orientation) {
  const targetOrientation = orientation ?? currentOrientation;
  const baseCategory = parent && randBool(0.85) ? parent.category : weightedRandomCategory();
  const fresh = freshDefinition(baseCategory, targetOrientation);
  if (!parent) return fresh;

  const child = {
    id: Math.random().toString(36).slice(2, 9),
    category: baseCategory,
    label: ARCHETYPES[baseCategory].label,
    description: ARCHETYPES[baseCategory].description,
    notes: ARCHETYPES[baseCategory].notes,
    palette: mixPalette(parent.palette, fresh.palette),
    body: deepMix(parent.body, fresh.body, 0.3),
    cockpit: deepMix(parent.cockpit, fresh.cockpit, 0.35),
    engines: deepMix(parent.engines, fresh.engines, 0.4),
    wings: deepMix(parent.wings, fresh.wings, 0.45),
    stabilizers: deepMix(parent.stabilizers, fresh.stabilizers, 0.35),
    extras: deepMix(parent.extras, fresh.extras, 0.45),
    orientation: targetOrientation,
    lineage: parent.id,
  };
  return child;
}

function makeSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      el.setAttribute(key, value);
    }
  });
  return el;
}

function createBodyPath(def) {
  const cx = 100;
  const top = 36;
  const length = def.length;
  const bottom = top + length;
  const midY = top + length * def.shoulder;
  const width = def.width;
  const noseWidth = width * def.noseTaper;
  const tailWidth = width * def.tailTaper;
  const shoulderWidth = width * 1.1;

  const points = [
    [cx - noseWidth / 2, top],
    [cx + noseWidth / 2, top],
    [cx + shoulderWidth / 2, midY],
    [cx + width / 2, midY + def.spineBulge],
    [cx + tailWidth / 2, bottom],
    [cx - tailWidth / 2, bottom],
    [cx - width / 2, midY + def.spineBulge],
    [cx - shoulderWidth / 2, midY],
  ];

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point[0]} ${point[1]}`)
    .join(" ") + " Z";
}

function createWingPath(wing, body, side) {
  const cx = 100;
  const rootY = 36 + body.length * 0.22;
  let startY = rootY;
  if (wing.variant === "forward") {
    startY -= wing.forward * 0.35;
  } else if (wing.variant === "gull") {
    startY -= 4;
  } else if (wing.variant === "delta") {
    startY += 2;
  }
  const noseY = startY + wing.forward;
  const endY = startY + wing.chord;
  const tailY = endY + wing.sweep;
  const halfWidth = body.width / 2;
  const rootX = cx + side * halfWidth;
  const spanMultiplier = wing.variant === "delta" ? 1.15 : wing.variant === "slab" ? 0.95 : 1;
  const tipX = rootX + side * wing.span * spanMultiplier;
  const taper = clamp(0.35 + wing.tipTaper * 0.45, 0.2, 1.4);
  const midX = rootX + side * wing.span * taper;
  const dihedral = wing.dihedral * side * 0.35;

  const points = [
    [rootX, startY],
    [tipX, noseY + dihedral],
    [midX, tailY + dihedral * 0.7],
    [rootX, endY],
  ];

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`)
    .join(" ") + " Z";
}

function createFrontFinPath(fin, body, side) {
  const cx = 100;
  const baseY = 36 + fin.offset;
  const rootX = cx + side * (body.width * 0.32);
  const angle = (fin.angle * Math.PI) / 180;
  const tipX = rootX + side * (fin.span + Math.cos(angle) * 6);
  const tipY = baseY + fin.chord + Math.sin(angle) * 6;
  const midY = baseY + fin.chord * 0.45;
  const points = [
    [rootX, baseY],
    [tipX, midY],
    [rootX + side * fin.span * 0.2, tipY],
  ];
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`)
    .join(" ") + " Z";
}

function createStabilizerPath(stab, body, index) {
  const cx = 100;
  const bottom = 36 + body.length;
  const spacing = stab.separation;
  const offset = (index - (stab.count - 1) / 2) * spacing;
  const baseX = cx + offset;
  const width = stab.style === "fork" ? body.width * 0.18 : body.width * 0.14;
  const height = stab.height;

  const points = [
    [baseX - width / 2, bottom - 4],
    [baseX + width / 2, bottom - 4],
    [baseX + (stab.style === "split" ? width * 0.35 : 0), bottom - height],
    [baseX - (stab.style === "split" ? width * 0.35 : 0), bottom - height],
  ];

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`)
    .join(" ") + " Z";
}

function drawPanelLines(svg, body, palette) {
  const group = makeSvgElement("g", { stroke: palette.trim, "stroke-width": 1.2, "stroke-opacity": 0.45, fill: "none" });
  const top = 36;
  const spacing = body.length / (body.plating + 1);
  for (let i = 1; i <= body.plating; i += 1) {
    const y = top + spacing * i;
    const line = makeSvgElement("line", {
      x1: 100 - body.width * 0.4,
      x2: 100 + body.width * 0.4,
      y1: y,
      y2: y,
    });
    group.append(line);
  }
  svg.append(group);
}

function drawStripes(svg, def) {
  if (!def.extras.stripes || def.extras.stripes === "none") return;
  const top = 36;
  const body = def.body;
  const group = makeSvgElement("g", { fill: def.palette.accent, "fill-opacity": 0.6 });

  if (def.extras.stripes === "center") {
    const rect = makeSvgElement("rect", {
      x: 100 - body.width * 0.1,
      y: top + body.length * 0.1,
      width: body.width * 0.2,
      height: body.length * 0.6,
      rx: 4,
    });
    group.append(rect);
  } else if (def.extras.stripes === "offset") {
    const rect = makeSvgElement("rect", {
      x: 100 + body.width * 0.25,
      y: top + body.length * 0.18,
      width: body.width * 0.12,
      height: body.length * 0.45,
      rx: 4,
    });
    group.append(rect);
  } else if (def.extras.stripes === "wing") {
    const left = makeSvgElement("rect", {
      x: 100 - body.width * 0.5 - 6,
      y: top + body.length * 0.42,
      width: body.width * 0.4,
      height: 6,
      rx: 3,
    });
    const right = left.cloneNode();
    right.setAttribute("x", 100 + 6);
    group.append(left, right);
  } else if (def.extras.stripes === "tail") {
    const rect = makeSvgElement("rect", {
      x: 100 - body.width * 0.35,
      y: top + body.length * 0.72,
      width: body.width * 0.7,
      height: body.length * 0.14,
      rx: 6,
    });
    group.append(rect);
  }

  svg.append(group);
}

function drawLighting(svg, def) {
  const { extras, palette, body } = def;
  if (extras.lighting === "none") return;
  const top = 36;
  const glowGroup = makeSvgElement("g", { fill: palette.glow, "fill-opacity": 0.55 });
  if (extras.lighting === "leading") {
    const ellipse = makeSvgElement("ellipse", {
      cx: 100,
      cy: top + 12,
      rx: body.width * 0.4,
      ry: 6,
    });
    glowGroup.append(ellipse);
  } else if (extras.lighting === "engine") {
    const rect = makeSvgElement("rect", {
      x: 100 - body.width * 0.45,
      y: top + body.length - 12,
      width: body.width * 0.9,
      height: 6,
      rx: 3,
    });
    glowGroup.append(rect);
  } else if (extras.lighting === "canopy") {
    const ellipse = makeSvgElement("ellipse", {
      cx: 100,
      cy: top + body.length * 0.35,
      rx: body.width * 0.32,
      ry: 8,
    });
    glowGroup.append(ellipse);
  }
  svg.append(glowGroup);
}
function buildShip(def) {
  const svg = makeSvgElement("svg", {
    viewBox: "0 0 200 200",
    role: "img",
    "aria-label": `${def.label} ${def.category} ship`,
  });

  const shipGroup = makeSvgElement("g", { class: "ship-hover" });
  if (def.orientation === "horizontal") {
    shipGroup.setAttribute("transform", "rotate(90 100 100)");
  }
  svg.append(shipGroup);

  const bodyShape = makeSvgElement("path", {
    d: createBodyPath(def.body),
    fill: def.palette.hull,
    stroke: def.palette.trim,
    "stroke-width": 2,
    "stroke-linejoin": "round",
  });
  shipGroup.append(bodyShape);

  if (def.extras.stripes) {
    drawStripes(shipGroup, def);
  }
  drawPanelLines(shipGroup, def.body, def.palette);

  if (def.stabilizers) {
    for (let i = 0; i < def.stabilizers.count; i += 1) {
      const path = createStabilizerPath(def.stabilizers, def.body, i);
      const stabilizer = makeSvgElement("path", {
        d: path,
        fill: def.palette.trim,
        "fill-opacity": 0.85,
        stroke: def.palette.accent,
        "stroke-width": 1.2,
      });
      shipGroup.append(stabilizer);
    }
  }

  def.wings.layers
    .slice()
    .sort((a, b) => a.span - b.span)
    .forEach((layer) => {
      const left = makeSvgElement("path", {
        d: createWingPath(layer, def.body, -1),
        fill: layer.accent ? def.palette.accent : def.palette.trim,
        "fill-opacity": layer.accent ? 0.75 : 0.55,
        stroke: def.palette.trim,
        "stroke-width": 1.4,
      });
      const right = makeSvgElement("path", {
        d: createWingPath(layer, def.body, 1),
        fill: layer.accent ? def.palette.accent : def.palette.trim,
        "fill-opacity": layer.accent ? 0.75 : 0.55,
        stroke: def.palette.trim,
        "stroke-width": 1.4,
      });
      shipGroup.append(left, right);
    });

  if (def.wings.frontFins) {
    const finAttrs = {
      fill: def.palette.trim,
      "fill-opacity": 0.68,
      stroke: def.palette.accent,
      "stroke-width": 1,
    };
    shipGroup.append(
      makeSvgElement("path", { d: createFrontFinPath(def.wings.frontFins, def.body, -1), ...finAttrs }),
      makeSvgElement("path", { d: createFrontFinPath(def.wings.frontFins, def.body, 1), ...finAttrs })
    );
  }

  const cockpit = def.cockpit;
  const cockpitGroup = makeSvgElement("g");
  const canopy = makeSvgElement("path", {
    d: (() => {
      const cx = 100;
      const baseY = 36 + cockpit.offset;
      const topY = baseY - cockpit.length * 0.5;
      const bottomY = baseY + cockpit.length * 0.5;
      const halfWidth = cockpit.width / 2;
      return `M${cx - halfWidth} ${bottomY} Q ${cx - halfWidth * 0.6} ${topY} ${cx} ${topY - 4} Q ${cx + halfWidth * 0.6} ${topY} ${cx + halfWidth} ${bottomY} Z`;
    })(),
    fill: def.palette.cockpit,
    "fill-opacity": def.extras.canopyGlow ? 0.85 : 0.7,
    stroke: def.palette.trim,
    "stroke-width": 1.6,
  });
  cockpitGroup.append(canopy);

  if (cockpit.segment !== "single") {
    const divider = makeSvgElement("line", {
      x1: 100,
      y1: 36 + cockpit.offset - cockpit.length * 0.35,
      x2: 100,
      y2: 36 + cockpit.offset + cockpit.length * 0.45,
      stroke: def.palette.trim,
      "stroke-width": 1.1,
      "stroke-opacity": 0.75,
    });
    cockpitGroup.append(divider);
    if (cockpit.segment === "split") {
      cockpitGroup.append(
        makeSvgElement("line", {
          x1: 100 - cockpit.width * 0.4,
          x2: 100 + cockpit.width * 0.4,
          y1: 36 + cockpit.offset,
          y2: 36 + cockpit.offset,
          stroke: def.palette.trim,
          "stroke-width": 1,
          "stroke-opacity": 0.6,
        })
      );
    }
  }
  shipGroup.append(cockpitGroup);

  const engineGroup = makeSvgElement("g");
  const engineBaseY = 36 + def.body.length - def.engines.length * 0.5;
  for (let i = 0; i < def.engines.count; i += 1) {
    const offset = (i - (def.engines.count - 1) / 2) * (def.engines.width + def.engines.spacing);
    const pod = makeSvgElement("rect", {
      x: 100 - def.engines.width / 2 + offset,
      y: engineBaseY,
      width: def.engines.width,
      height: def.engines.length,
      rx: def.engines.mount === "cowl" ? 6 : 4,
      fill: def.palette.hull,
      stroke: def.palette.trim,
      "stroke-width": 1.4,
    });
    engineGroup.append(pod);

    const nozzle = makeSvgElement("rect", {
      x: 100 - def.engines.width / 2 + offset + 1.5,
      y: engineBaseY + def.engines.length - 6,
      width: def.engines.width - 3,
      height: 6,
      rx: 3,
      fill: def.palette.trim,
    });
    engineGroup.append(nozzle);

    const flame = makeSvgElement("path", {
      class: "thruster-flame",
      d: (() => {
        const top = engineBaseY + def.engines.length;
        const bottom = top + def.engines.flameLength;
        const width = def.engines.width * 0.6;
        const cx = 100 + offset;
        return `M${cx - width / 2} ${top} Q ${cx} ${bottom - 6} ${cx} ${bottom} Q ${cx} ${bottom - 6} ${cx + width / 2} ${top} Z`;
      })(),
      fill: def.palette.glow,
      "fill-opacity": 0.75,
    });
    engineGroup.append(flame);
  }
  shipGroup.append(engineGroup);

  if (def.body.dorsalPods) {
    const pod = makeSvgElement("path", {
      d: (() => {
        const cx = 100;
        const startY = 36 + def.body.length * 0.55;
        const endY = startY + def.body.length * 0.18;
        const width = def.body.width * 0.5;
        return `M${cx - width / 2} ${endY} L ${cx + width / 2} ${endY} Q ${cx} ${startY - 6} ${cx - width / 2} ${endY} Z`;
      })(),
      fill: def.palette.trim,
      "fill-opacity": 0.5,
    });
    shipGroup.append(pod);
  }

  drawLighting(shipGroup, def);

  return svg;
}
function formatDefinition(def) {
  const exportable = {
    id: def.id,
    category: def.category,
    label: def.label,
    orientation: def.orientation,
    palette: def.palette,
    body: def.body,
    cockpit: def.cockpit,
    engines: def.engines,
    wings: def.wings,
    stabilizers: def.stabilizers,
    extras: def.extras,
    notes: def.notes,
    lineage: def.lineage,
  };
  return JSON.stringify(exportable, null, 2);
}

const gridEl = document.getElementById("grid");
const heroSvgEl = document.getElementById("hero-svg");
const heroCategoryEl = document.getElementById("hero-category");
const definitionEl = document.getElementById("definition");
const rerollGridBtn = document.getElementById("reroll-grid");
const randomizeAllBtn = document.getElementById("randomize-all");
const rerollHeroBtn = document.getElementById("reroll-hero");
const orientationButtons = Array.from(document.querySelectorAll(".orientation-btn"));

let currentHero = null;
let currentGrid = [];
let currentOrientation = "vertical";

function updateOrientationControls() {
  orientationButtons.forEach((button) => {
    const active = button.dataset.orientation === currentOrientation;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active.toString());
  });
}

function renderHero() {
  heroSvgEl.innerHTML = "";
  heroSvgEl.append(buildShip(currentHero));
  heroCategoryEl.textContent = `${currentHero.label}`;
  definitionEl.textContent = formatDefinition(currentHero);
}

function renderGrid() {
  gridEl.innerHTML = "";
  currentGrid.forEach((def) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "sprite-card";
    card.append(buildShip(def));
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const label = document.createElement("span");
    label.textContent = def.category;
    const palette = document.createElement("span");
    palette.textContent = def.palette.name ?? "custom";
    meta.append(label, palette);
    card.append(meta);
    card.addEventListener("click", () => {
      currentHero = def;
      renderHero();
      spawnGrid();
    });
    gridEl.append(card);
  });
}

function spawnGrid() {
  currentGrid = Array.from({ length: 12 }, () => generateDefinition(currentHero, currentOrientation));
  renderGrid();
}

function bootstrap() {
  currentHero = generateDefinition(null, currentOrientation);
  renderHero();
  spawnGrid();
}

orientationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.orientation;
    if (!next || next === currentOrientation) return;
    currentOrientation = next;
    updateOrientationControls();
    currentHero = generateDefinition(null, currentOrientation);
    renderHero();
    spawnGrid();
  });
});

rerollGridBtn.addEventListener("click", () => {
  spawnGrid();
});

randomizeAllBtn.addEventListener("click", () => {
  currentHero = generateDefinition(null, currentOrientation);
  renderHero();
  spawnGrid();
});

rerollHeroBtn.addEventListener("click", () => {
  currentHero = generateDefinition(currentHero, currentOrientation);
  renderHero();
  spawnGrid();
});

updateOrientationControls();
bootstrap();
