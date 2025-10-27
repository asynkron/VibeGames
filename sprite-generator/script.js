// Procedural spaceship sprite generator.
// Each configuration lists the parts used to assemble an SVG sprite.
const VIEWBOX = { width: 160, height: 160, centerX: 80 };
const GRID_SIZE = 12;

const SHIP_TYPES = {
  fighter: {
    key: "fighter",
    label: "Fighter",
    description: "Agile frontline craft with swept wings and aggressive silhouettes.",
    palette: {
      hull: ["#1d4ed8", "#0ea5e9", "#2563eb", "#1e3a8a"],
      hullSecondary: ["#1e40af", "#0f172a", "#1f2937"],
      accent: ["#f59e0b", "#f97316", "#38bdf8"],
      glow: ["#fca5a5", "#fde047", "#67e8f9"],
      cockpit: ["#e0f2fe", "#bae6fd", "#c4b5fd"],
      stroke: ["#93c5fd", "#60a5fa"],
    },
    hull: {
      length: [92, 122],
      noseRatio: [0.16, 0.24],
      noseWidth: [12, 18],
      midWidth: [46, 60],
      tailWidth: [24, 36],
      bulge: [6, 12],
    },
    wings: {
      mainSpan: [32, 50],
      mainLength: [24, 40],
      mainSweep: [12, 22],
      frontChance: 0.45,
      frontSpan: [16, 28],
      frontLength: [16, 22],
      tailChance: 0.55,
      tailSpan: [18, 26],
      tailLength: [16, 26],
    },
    fins: {
      topChance: 0.55,
      bottomChance: 0.35,
      topHeight: [14, 24],
      bottomHeight: [12, 18],
    },
    cockpit: {
      offset: [0.24, 0.32],
      rx: [8, 12],
      ry: [12, 18],
      tilt: 6,
      styles: ["bubble", "visor"],
    },
    engines: {
      count: [2, 3],
      width: [10, 14],
      height: [16, 22],
      flame: [18, 28],
    },
    stripes: {
      chance: 0.75,
      width: [0.45, 0.75],
      length: [0.18, 0.32],
    },
  },
  freight: {
    key: "freight",
    label: "Freight",
    description: "Heavily plated carriers with broad hulls and cargo stabilizers.",
    palette: {
      hull: ["#334155", "#0f172a", "#1e293b"],
      hullSecondary: ["#1f2937", "#475569", "#3f3f46"],
      accent: ["#38bdf8", "#a78bfa", "#fde68a"],
      glow: ["#a855f7", "#f97316", "#fb7185"],
      cockpit: ["#e0f2fe", "#fecdd3", "#fef3c7"],
      stroke: ["#94a3b8", "#cbd5f5"],
    },
    hull: {
      length: [118, 142],
      noseRatio: [0.18, 0.28],
      noseWidth: [16, 22],
      midWidth: [62, 78],
      tailWidth: [42, 58],
      bulge: [8, 16],
    },
    wings: {
      mainSpan: [24, 38],
      mainLength: [30, 48],
      mainSweep: [10, 18],
      frontChance: 0.25,
      frontSpan: [14, 24],
      frontLength: [18, 28],
      tailChance: 0.7,
      tailSpan: [20, 30],
      tailLength: [26, 36],
    },
    fins: {
      topChance: 0.45,
      bottomChance: 0.55,
      topHeight: [16, 28],
      bottomHeight: [14, 24],
    },
    cockpit: {
      offset: [0.32, 0.42],
      rx: [10, 16],
      ry: [14, 20],
      tilt: 3,
      styles: ["visor", "cradle"],
    },
    engines: {
      count: [2, 3, 4],
      width: [12, 18],
      height: [18, 26],
      flame: [16, 24],
    },
    stripes: {
      chance: 0.65,
      width: [0.35, 0.55],
      length: [0.22, 0.36],
    },
  },
  transport: {
    key: "transport",
    label: "Transport",
    description: "Long-range shuttles with balanced profiles and modular pods.",
    palette: {
      hull: ["#14532d", "#1f2937", "#1f2937", "#0f766e"],
      hullSecondary: ["#022c22", "#064e3b", "#1c1917"],
      accent: ["#f9a8d4", "#fcd34d", "#34d399"],
      glow: ["#f472b6", "#f97316", "#5eead4"],
      cockpit: ["#f9fafb", "#d1fae5", "#ede9fe"],
      stroke: ["#a7f3d0", "#bbf7d0"],
    },
    hull: {
      length: [116, 138],
      noseRatio: [0.2, 0.3],
      noseWidth: [12, 20],
      midWidth: [50, 64],
      tailWidth: [30, 44],
      bulge: [6, 14],
    },
    wings: {
      mainSpan: [28, 44],
      mainLength: [26, 42],
      mainSweep: [12, 22],
      frontChance: 0.4,
      frontSpan: [18, 28],
      frontLength: [14, 24],
      tailChance: 0.5,
      tailSpan: [16, 24],
      tailLength: [20, 30],
    },
    fins: {
      topChance: 0.5,
      bottomChance: 0.4,
      topHeight: [14, 24],
      bottomHeight: [12, 18],
    },
    cockpit: {
      offset: [0.28, 0.38],
      rx: [9, 13],
      ry: [13, 18],
      tilt: 4,
      styles: ["bubble", "visor", "capsule"],
    },
    engines: {
      count: [2, 3],
      width: [10, 16],
      height: [18, 24],
      flame: [18, 26],
    },
    stripes: {
      chance: 0.7,
      width: [0.4, 0.65],
      length: [0.2, 0.34],
    },
  },
  drone: {
    key: "drone",
    label: "Drone",
    description: "Compact autonomous craft with radial engines and adaptive fins.",
    palette: {
      hull: ["#3f3cbb", "#4c1d95", "#0f172a"],
      hullSecondary: ["#1f1f3d", "#312e81", "#2e1065"],
      accent: ["#f472b6", "#facc15", "#a5b4fc"],
      glow: ["#22d3ee", "#c084fc", "#f87171"],
      cockpit: ["#e0e7ff", "#ddd6fe", "#bfdbfe"],
      stroke: ["#c4b5fd", "#f0abfc"],
    },
    hull: {
      length: [78, 102],
      noseRatio: [0.18, 0.28],
      noseWidth: [10, 16],
      midWidth: [40, 52],
      tailWidth: [22, 30],
      bulge: [8, 16],
    },
    wings: {
      mainSpan: [22, 34],
      mainLength: [18, 26],
      mainSweep: [10, 18],
      frontChance: 0.55,
      frontSpan: [16, 24],
      frontLength: [12, 20],
      tailChance: 0.6,
      tailSpan: [16, 24],
      tailLength: [16, 24],
    },
    fins: {
      topChance: 0.35,
      bottomChance: 0.55,
      topHeight: [10, 18],
      bottomHeight: [10, 16],
    },
    cockpit: {
      offset: [0.32, 0.42],
      rx: [8, 11],
      ry: [10, 14],
      tilt: 8,
      styles: ["bubble", "capsule"],
    },
    engines: {
      count: [1, 2, 3],
      width: [10, 14],
      height: [14, 20],
      flame: [14, 22],
    },
    stripes: {
      chance: 0.8,
      width: [0.45, 0.7],
      length: [0.16, 0.28],
    },
  },
};

const grid = document.getElementById("sprite-grid");
const definitionJson = document.getElementById("definition-json");
const definitionType = document.getElementById("definition-type");
const definitionSeed = document.getElementById("definition-seed");
const definitionDescription = document.getElementById("definition-description");
const randomizeButton = document.getElementById("randomize");

let parentConfig = null;

function randomBetween([min, max]) {
  return min + Math.random() * (max - min);
}

function randomChoice(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function makeSeed() {
  if (window.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return buffer[0].toString(36).toUpperCase().slice(-6).padStart(6, "0");
  }
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return { r, g, b };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`;
}

function mixHex(colorA, colorB, weight = 0.5) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const mixed = {
    r: lerp(a.r, b.r, weight),
    g: lerp(a.g, b.g, weight),
    b: lerp(a.b, b.b, weight),
  };
  return rgbToHex(mixed);
}

function adjustLightness(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const lighten = (channel) => clamp(channel + amount * 255, 0, 255);
  return rgbToHex({ r: lighten(r), g: lighten(g), b: lighten(b) });
}

function createPalette(profile, base) {
  if (!base) {
    const hull = randomChoice(profile.palette.hull);
    return {
      hull,
      hullSecondary: randomChoice(profile.palette.hullSecondary),
      accent: randomChoice(profile.palette.accent),
      glow: randomChoice(profile.palette.glow),
      cockpit: randomChoice(profile.palette.cockpit),
      stroke: randomChoice(profile.palette.stroke),
    };
  }
  return {
    hull: Math.random() < 0.5 ? base.hull : randomChoice(profile.palette.hull),
    hullSecondary:
      Math.random() < 0.5 ? base.hullSecondary : randomChoice(profile.palette.hullSecondary),
    accent: Math.random() < 0.55 ? base.accent : randomChoice(profile.palette.accent),
    glow: Math.random() < 0.55 ? base.glow : randomChoice(profile.palette.glow),
    cockpit: Math.random() < 0.5 ? base.cockpit : randomChoice(profile.palette.cockpit),
    stroke: Math.random() < 0.65 ? base.stroke : randomChoice(profile.palette.stroke),
  };
}

function generateSegments(profile) {
  const total = randomBetween(profile.hull.length);
  const start = 18 + Math.random() * 8;
  const positions = [0, 0.18, 0.36, 0.58, 0.78, 1];
  const noseRatio = randomBetween(profile.hull.noseRatio);
  const noseWidth = randomBetween(profile.hull.noseWidth);
  const midWidth = randomBetween(profile.hull.midWidth);
  const tailWidth = randomBetween(profile.hull.tailWidth);
  const bulge = randomBetween(profile.hull.bulge);

  const widthAt = (ratio) => {
    const clamped = clamp(ratio, 0, 1);
    const frontBlend = clamp(clamped / noseRatio, 0, 1);
    const midBlend = clamp((clamped - noseRatio) / (1 - noseRatio), 0, 1);
    let width = lerp(noseWidth, midWidth, Math.pow(frontBlend, 0.7));
    width = lerp(width, tailWidth, Math.pow(midBlend, 1.35));
    width += Math.sin(clamped * Math.PI) * bulge;
    width += (Math.random() - 0.5) * 4;
    return Math.max(12, width);
  };

  return positions.map((ratio) => ({
    y: start + ratio * total,
    halfWidth: widthAt(ratio) / 2,
  }));
}

function blendSegments(base, target, factor) {
  return base.map((segment, index) => {
    const targetSegment = target[index] ?? target[target.length - 1];
    return {
      y: lerp(segment.y, targetSegment.y, factor),
      halfWidth: lerp(segment.halfWidth, targetSegment.halfWidth, factor),
    };
  });
}

function sampleSegments(segments, ratio) {
  const startY = segments[0].y;
  const endY = segments[segments.length - 1].y;
  const targetY = lerp(startY, endY, ratio);
  for (let i = 0; i < segments.length - 1; i += 1) {
    const current = segments[i];
    const next = segments[i + 1];
    if (targetY >= current.y && targetY <= next.y) {
      const localRatio = (targetY - current.y) / (next.y - current.y || 1);
      const halfWidth = lerp(current.halfWidth, next.halfWidth, localRatio);
      return { y: targetY, halfWidth };
    }
  }
  const last = segments[segments.length - 1];
  return { y: targetY, halfWidth: last.halfWidth };
}

function createHull(profile, palette, baseHull) {
  const segments = baseHull
    ? blendSegments(baseHull.segments, generateSegments(profile), 0.35 + Math.random() * 0.4)
    : generateSegments(profile);
  return {
    segments,
    fill: baseHull ? mixHex(baseHull.fill, palette.hull, 0.5) : palette.hull,
    stroke: baseHull ? mixHex(baseHull.stroke, palette.stroke, 0.45) : palette.stroke,
    plating: baseHull ? baseHull.plating : Math.random() < 0.5,
  };
}

function createWingPair(centerX, baseY, baseHalfWidth, span, length, sweep, thickness, color, stroke) {
  const top = baseY;
  const leading = top + sweep;
  const tipY = top + length;
  const rootInset = Math.min(thickness, baseHalfWidth * 0.65);

  const left = [
    [centerX - baseHalfWidth, top],
    [centerX - baseHalfWidth - span, leading],
    [centerX - baseHalfWidth - span * 0.75, tipY],
    [centerX - baseHalfWidth + rootInset * -0.1, tipY - thickness],
  ];

  const right = left.map(([x, y]) => [centerX + (centerX - x), y]);

  const pathFrom = (points) =>
    points.reduce((acc, [x, y], index) => {
      const command = index === 0 ? "M" : "L";
      return `${acc}${command}${x.toFixed(2)},${y.toFixed(2)} `;
    }, "") + "Z";

  return [
    { side: "left", path: pathFrom(left), fill: color, stroke },
    { side: "right", path: pathFrom(right), fill: color, stroke },
  ];
}

function createWings(profile, palette, hull, baseWings) {
  const wings = [];
  const segments = hull.segments;
  const mixFactor = baseWings ? 0.4 + Math.random() * 0.25 : null;

  const mainBase = sampleSegments(segments, 0.55 + (Math.random() - 0.5) * 0.1);
  const mainSpan = randomBetween(profile.wings.mainSpan);
  const mainLength = randomBetween(profile.wings.mainLength);
  const mainSweep = randomBetween(profile.wings.mainSweep);
  const thickness = mainLength * 0.45;
  wings.push(
    ...createWingPair(
      VIEWBOX.centerX,
      mainBase.y - mainSweep,
      mainBase.halfWidth,
      mainSpan,
      mainLength,
      mainSweep,
      thickness,
      mixFactor && baseWings?.[0]
        ? mixHex(baseWings[0].fill, palette.hullSecondary, mixFactor)
        : palette.hullSecondary,
      palette.stroke,
    ),
  );

  if (Math.random() < profile.wings.frontChance) {
    const frontBase = sampleSegments(segments, 0.35 + Math.random() * 0.12);
    const frontSpan = randomBetween(profile.wings.frontSpan);
    const frontLength = randomBetween(profile.wings.frontLength);
    wings.push(
      ...createWingPair(
        VIEWBOX.centerX,
        frontBase.y - frontLength * 0.4,
        frontBase.halfWidth * 0.8,
        frontSpan,
        frontLength,
        frontLength * 0.3,
        frontLength * 0.4,
        mixFactor && baseWings?.[2]
          ? mixHex(baseWings[2].fill, palette.accent, 0.5)
          : adjustLightness(palette.hullSecondary, 0.12),
        palette.stroke,
      ),
    );
  }

  if (Math.random() < profile.wings.tailChance) {
    const tailBase = sampleSegments(segments, 0.78 + Math.random() * 0.12);
    const tailSpan = randomBetween(profile.wings.tailSpan);
    const tailLength = randomBetween(profile.wings.tailLength);
    wings.push(
      ...createWingPair(
        VIEWBOX.centerX,
        tailBase.y - tailLength * 0.35,
        tailBase.halfWidth,
        tailSpan,
        tailLength,
        tailLength * 0.2,
        tailLength * 0.35,
        mixFactor && baseWings?.[4]
          ? mixHex(baseWings[4].fill, palette.hull, 0.4)
          : mixHex(palette.hull, palette.hullSecondary, 0.65),
        palette.stroke,
      ),
    );
  }

  return wings;
}

function createFins(profile, palette, hull, baseFins) {
  const fins = [];
  const segments = hull.segments;
  const factor = baseFins ? 0.35 + Math.random() * 0.3 : null;

  if (Math.random() < profile.fins.topChance) {
    const base = sampleSegments(segments, 0.58 + Math.random() * 0.2);
    const height = randomBetween(profile.fins.topHeight);
    const width = Math.min(8 + Math.random() * 4, base.halfWidth * 0.6);
    const color = factor && baseFins?.find((fin) => fin.kind === "top")
      ? mixHex(baseFins.find((fin) => fin.kind === "top").fill, palette.hull, factor)
      : mixHex(palette.hull, palette.accent, 0.35);
    fins.push({
      kind: "top",
      points: [
        [VIEWBOX.centerX, base.y - height],
        [VIEWBOX.centerX - width, base.y],
        [VIEWBOX.centerX + width, base.y],
      ],
      fill: color,
      stroke: palette.stroke,
    });
  }

  if (Math.random() < profile.fins.bottomChance) {
    const base = sampleSegments(segments, 0.72 + Math.random() * 0.18);
    const height = randomBetween(profile.fins.bottomHeight);
    const width = Math.min(10 + Math.random() * 6, base.halfWidth * 0.75);
    const color = factor && baseFins?.find((fin) => fin.kind === "bottom")
      ? mixHex(baseFins.find((fin) => fin.kind === "bottom").fill, palette.hullSecondary, factor)
      : adjustLightness(palette.hullSecondary, -0.05);
    fins.push({
      kind: "bottom",
      points: [
        [VIEWBOX.centerX, base.y + height],
        [VIEWBOX.centerX - width, base.y],
        [VIEWBOX.centerX + width, base.y],
      ],
      fill: color,
      stroke: palette.stroke,
    });
  }

  return fins;
}

function createEngines(profile, palette, hull, baseEngines) {
  const countOptions = Array.isArray(profile.engines.count) ? profile.engines.count : [profile.engines.count];
  const count = randomChoice(countOptions);
  const segments = hull.segments;
  const tail = segments[segments.length - 1];
  const baseY = tail.y - 4;
  const width = randomBetween(profile.engines.width);
  const height = randomBetween(profile.engines.height);
  const flame = randomBetween(profile.engines.flame);

  const positions = [];
  if (count === 1) {
    positions.push(0);
  } else if (count === 2) {
    const spread = tail.halfWidth * 0.6;
    positions.push(-spread, spread);
  } else if (count === 3) {
    const spread = tail.halfWidth * 0.65;
    positions.push(-spread, 0, spread);
  } else {
    const spread = tail.halfWidth * 0.7;
    positions.push(-spread * 0.9, -spread * 0.3, spread * 0.3, spread * 0.9);
  }

  const factor = baseEngines ? 0.35 + Math.random() * 0.3 : null;

  return positions.map((offset, index) => {
    const origin = VIEWBOX.centerX + offset;
    const reference = baseEngines?.[index];
    return {
      cx: origin,
      cy: baseY,
      width: reference ? lerp(reference.width, width, factor) : width,
      height: reference ? lerp(reference.height, height, factor) : height,
      flame: reference ? lerp(reference.flame, flame, factor) : flame,
      fill: reference ? mixHex(reference.fill, palette.hullSecondary, factor) : palette.hullSecondary,
      glow: reference ? mixHex(reference.glow, palette.glow, 0.45) : palette.glow,
    };
  });
}

function createCockpit(profile, palette, hull, baseCockpit) {
  const segments = hull.segments;
  const offset = randomBetween(profile.cockpit.offset);
  const sample = sampleSegments(segments, offset);
  const rx = randomBetween(profile.cockpit.rx);
  const ry = randomBetween(profile.cockpit.ry);
  const tilt = (Math.random() - 0.5) * profile.cockpit.tilt;
  const style = randomChoice(profile.cockpit.styles);

  if (!baseCockpit) {
    return {
      cx: VIEWBOX.centerX,
      cy: sample.y,
      rx,
      ry,
      rotation: tilt,
      fill: palette.cockpit,
      highlight: adjustLightness(palette.cockpit, 0.3),
      stroke: palette.stroke,
      style,
    };
  }

  const factor = 0.4 + Math.random() * 0.3;
  return {
    cx: lerp(baseCockpit.cx, VIEWBOX.centerX, factor),
    cy: lerp(baseCockpit.cy, sample.y, factor),
    rx: lerp(baseCockpit.rx, rx, factor),
    ry: lerp(baseCockpit.ry, ry, factor),
    rotation: lerp(baseCockpit.rotation, tilt, factor),
    fill: mixHex(baseCockpit.fill, palette.cockpit, 0.45),
    highlight: adjustLightness(mixHex(baseCockpit.highlight, palette.cockpit, 0.5), 0.1),
    stroke: mixHex(baseCockpit.stroke, palette.stroke, 0.5),
    style,
  };
}

function createStripes(profile, palette, hull) {
  if (Math.random() > profile.stripes.chance) {
    return [];
  }
  const stripes = [];
  const segments = hull.segments;
  const count = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < count; i += 1) {
    const baseRatio = 0.28 + Math.random() * 0.5;
    const sample = sampleSegments(segments, baseRatio);
    const widthRatio = randomBetween(profile.stripes.width);
    const lengthRatio = randomBetween(profile.stripes.length);
    const hullWidth = sample.halfWidth * 2;
    const stripeWidth = hullWidth * widthRatio;
    const stripeHeight = (segments[segments.length - 1].y - segments[0].y) * lengthRatio;
    stripes.push({
      x: VIEWBOX.centerX - stripeWidth / 2,
      y: sample.y - stripeHeight / 2,
      width: stripeWidth,
      height: stripeHeight,
      radius: Math.min(6, stripeHeight / 2),
      fill: mixHex(palette.accent, palette.hull, 0.35),
      opacity: 0.85,
    });
  }
  return stripes;
}

function createSpaceshipConfig(typeKey, baseConfig) {
  const profile = SHIP_TYPES[typeKey];
  const palette = createPalette(profile, baseConfig?.palette);
  const hull = createHull(profile, palette, baseConfig?.hull);
  const wings = createWings(profile, palette, hull, baseConfig?.wings);
  const fins = createFins(profile, palette, hull, baseConfig?.fins);
  const engines = createEngines(profile, palette, hull, baseConfig?.engines);
  const cockpit = createCockpit(profile, palette, hull, baseConfig?.cockpit);
  const stripes = createStripes(profile, palette, hull);

  return {
    seed: makeSeed(),
    type: typeKey,
    typeLabel: profile.label,
    description: profile.description,
    palette,
    hull,
    wings,
    fins,
    engines,
    cockpit,
    stripes,
    viewBox: VIEWBOX,
  };
}

function pointsToPath(points) {
  return points.reduce((acc, [x, y], index) => {
    const command = index === 0 ? "M" : "L";
    return `${acc}${command}${x.toFixed(2)},${y.toFixed(2)} `;
  }, "") + "Z";
}

function renderHull(svg, config) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const segments = config.hull.segments;
  const left = segments.map((segment) => [VIEWBOX.centerX - segment.halfWidth, segment.y]);
  const right = segments
    .slice()
    .reverse()
    .map((segment) => [VIEWBOX.centerX + segment.halfWidth, segment.y]);
  const points = [[VIEWBOX.centerX, segments[0].y], ...left.slice(1), ...right, [VIEWBOX.centerX, segments[0].y]];
  path.setAttribute("d", pointsToPath(points));
  path.setAttribute("fill", config.hull.fill);
  path.setAttribute("stroke", config.hull.stroke);
  path.setAttribute("stroke-width", "1.6");
  path.setAttribute("stroke-linejoin", "round");
  group.appendChild(path);

  if (config.hull.plating) {
    const detail = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const mid = sampleSegments(segments, 0.6);
    const top = sampleSegments(segments, 0.35);
    const d = `M${(VIEWBOX.centerX - mid.halfWidth * 0.6).toFixed(2)},${mid.y.toFixed(2)} ` +
      `L${(VIEWBOX.centerX + mid.halfWidth * 0.6).toFixed(2)},${mid.y.toFixed(2)} ` +
      `M${(VIEWBOX.centerX - top.halfWidth * 0.5).toFixed(2)},${top.y.toFixed(2)} ` +
      `L${(VIEWBOX.centerX + top.halfWidth * 0.5).toFixed(2)},${top.y.toFixed(2)}`;
    detail.setAttribute("d", d);
    detail.setAttribute("stroke", adjustLightness(config.hull.fill, 0.18));
    detail.setAttribute("stroke-width", "1");
    detail.setAttribute("opacity", "0.55");
    detail.setAttribute("stroke-linecap", "round");
    group.appendChild(detail);
  }

  svg.appendChild(group);
}

function renderWings(svg, config) {
  const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  layer.setAttribute("opacity", "0.92");
  config.wings.forEach((wing) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", wing.path);
    path.setAttribute("fill", wing.fill);
    path.setAttribute("stroke", wing.stroke);
    path.setAttribute("stroke-width", "1.2");
    path.setAttribute("stroke-linejoin", "round");
    layer.appendChild(path);
  });
  svg.appendChild(layer);
}

function renderFins(config) {
  const underLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const topLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  config.fins.forEach((fin) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", "path");
    element.setAttribute("d", pointsToPath(fin.points));
    element.setAttribute("fill", fin.fill);
    element.setAttribute("stroke", fin.stroke);
    element.setAttribute("stroke-width", "1");
    element.setAttribute("stroke-linejoin", "round");
    if (fin.kind === "top") {
      topLayer.appendChild(element);
    } else {
      underLayer.appendChild(element);
    }
  });
  return { underLayer, topLayer };
}

function renderEngines(svg, config) {
  const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  config.engines.forEach((engine, index) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("transform", `translate(${engine.cx}, ${engine.cy})`);

    const body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    body.setAttribute("x", (-engine.width / 2).toFixed(2));
    body.setAttribute("y", (-engine.height).toFixed(2));
    body.setAttribute("width", engine.width.toFixed(2));
    body.setAttribute("height", engine.height.toFixed(2));
    body.setAttribute("rx", (engine.width * 0.25).toFixed(2));
    body.setAttribute("fill", engine.fill);
    body.setAttribute("stroke", config.palette.stroke);
    body.setAttribute("stroke-width", "1");
    group.appendChild(body);

    const nozzle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    nozzle.setAttribute("x", (-engine.width * 0.4).toFixed(2));
    nozzle.setAttribute("y", (-engine.height * 0.2).toFixed(2));
    nozzle.setAttribute("width", (engine.width * 0.8).toFixed(2));
    nozzle.setAttribute("height", (engine.height * 0.2).toFixed(2));
    nozzle.setAttribute("rx", (engine.width * 0.2).toFixed(2));
    nozzle.setAttribute("fill", mixHex(engine.fill, config.palette.accent, 0.4));
    group.appendChild(nozzle);

    const flame = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const flameWidth = engine.width * 0.6;
    flame.setAttribute(
      "d",
      `M${(-flameWidth / 2).toFixed(2)},0 L0,${engine.flame.toFixed(2)} L${(flameWidth / 2).toFixed(2)},0 Z`,
    );
    flame.setAttribute("fill", engine.glow);
    flame.setAttribute("fill-opacity", "0.65");
    flame.setAttribute("stroke", mixHex(engine.glow, "#ffffff", 0.15));
    flame.setAttribute("stroke-width", "0.6");
    flame.setAttribute("stroke-linejoin", "round");
    flame.setAttribute("filter", `url(#flame-glow-${config.seed}-${index})`);
    group.appendChild(flame);

    layer.appendChild(group);
  });
  svg.appendChild(layer);
}

function renderCockpit(svg, config) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const base = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  base.setAttribute("cx", config.cockpit.cx.toFixed(2));
  base.setAttribute("cy", config.cockpit.cy.toFixed(2));
  base.setAttribute("rx", config.cockpit.rx.toFixed(2));
  base.setAttribute("ry", config.cockpit.ry.toFixed(2));
  base.setAttribute("fill", config.cockpit.fill);
  base.setAttribute("stroke", config.cockpit.stroke);
  base.setAttribute("stroke-width", "1.2");
  base.setAttribute("transform", `rotate(${config.cockpit.rotation.toFixed(2)} ${config.cockpit.cx.toFixed(2)} ${config.cockpit.cy.toFixed(2)})`);
  group.appendChild(base);

  const highlight = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  highlight.setAttribute("cx", (config.cockpit.cx - config.cockpit.rx * 0.35).toFixed(2));
  highlight.setAttribute("cy", (config.cockpit.cy - config.cockpit.ry * 0.3).toFixed(2));
  highlight.setAttribute("rx", (config.cockpit.rx * 0.45).toFixed(2));
  highlight.setAttribute("ry", (config.cockpit.ry * 0.4).toFixed(2));
  highlight.setAttribute("fill", config.cockpit.highlight);
  highlight.setAttribute("fill-opacity", "0.7");
  group.appendChild(highlight);

  svg.appendChild(group);
}

function renderStripes(svg, config) {
  const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  config.stripes.forEach((stripe) => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", stripe.x.toFixed(2));
    rect.setAttribute("y", stripe.y.toFixed(2));
    rect.setAttribute("width", stripe.width.toFixed(2));
    rect.setAttribute("height", stripe.height.toFixed(2));
    rect.setAttribute("rx", stripe.radius.toFixed(2));
    rect.setAttribute("fill", stripe.fill);
    rect.setAttribute("fill-opacity", stripe.opacity.toFixed(2));
    layer.appendChild(rect);
  });
  svg.appendChild(layer);
}

function createSprite(config) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
  svg.setAttribute("class", "sprite-root");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${config.typeLabel} spaceship sprite`);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  config.engines.forEach((engine, index) => {
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", `flame-glow-${config.seed}-${index}`);
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");
    const gaussian = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    gaussian.setAttribute("stdDeviation", "1.8");
    gaussian.setAttribute("result", "coloredBlur");
    filter.appendChild(gaussian);
    const merge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
    const mergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    mergeNode1.setAttribute("in", "coloredBlur");
    const mergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    mergeNode2.setAttribute("in", "SourceGraphic");
    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);
    filter.appendChild(merge);
    defs.appendChild(filter);
  });
  svg.appendChild(defs);

  renderWings(svg, config);
  renderEngines(svg, config);
  const finLayers = renderFins(config);
  svg.appendChild(finLayers.underLayer);
  renderHull(svg, config);
  renderStripes(svg, config);
  svg.appendChild(finLayers.topLayer);
  renderCockpit(svg, config);

  return svg;
}

function updateDefinition(config) {
  definitionJson.textContent = JSON.stringify(
    {
      seed: config.seed,
      type: config.type,
      palette: config.palette,
      hull: config.hull,
      wings: config.wings,
      fins: config.fins,
      engines: config.engines,
      cockpit: config.cockpit,
      stripes: config.stripes,
    },
    null,
    2,
  );
  definitionType.textContent = `${config.typeLabel}`;
  definitionSeed.textContent = `Seed ${config.seed}`;
  definitionDescription.textContent = config.description;
}

function generateGrid(baseConfig = null) {
  const configs = [];
  if (!baseConfig) {
    for (let i = 0; i < GRID_SIZE; i += 1) {
      const typeKey = randomChoice(Object.keys(SHIP_TYPES));
      configs.push(createSpaceshipConfig(typeKey));
    }
  } else {
    configs.push({ ...baseConfig, seed: baseConfig.seed });
    for (let i = 1; i < GRID_SIZE; i += 1) {
      configs.push(createSpaceshipConfig(baseConfig.type, baseConfig));
    }
  }
  return configs;
}

function renderGrid(baseConfig = null) {
  const configs = generateGrid(baseConfig);
  grid.innerHTML = "";
  configs.forEach((config, index) => {
    const card = document.createElement("button");
    card.className = "sprite-card";
    card.type = "button";
    card.setAttribute("aria-label", `${config.typeLabel} sprite ${config.seed}`);
    card.appendChild(createSprite(config));
    const footer = document.createElement("footer");
    const label = document.createElement("span");
    label.textContent = config.typeLabel;
    const seed = document.createElement("span");
    seed.textContent = config.seed.slice(-4);
    footer.appendChild(label);
    footer.appendChild(seed);
    card.appendChild(footer);
    if (baseConfig && index === 0) {
      card.dataset.parent = "true";
    }
    card.addEventListener("click", () => {
      parentConfig = config;
      updateDefinition(config);
      renderGrid(parentConfig);
    });
    grid.appendChild(card);
    if (index === 0 && !parentConfig) {
      updateDefinition(config);
    }
  });
}

randomizeButton.addEventListener("click", () => {
  parentConfig = null;
  renderGrid();
});

renderGrid();
