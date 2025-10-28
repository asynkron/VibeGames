import { mixColor, shadeColor } from "./color.js";
import { partColor, partStroke } from "./renderContext.js";

export const SVG_NS = "http://www.w3.org/2000/svg";
const VIEWBOX = "0 0 200 200";

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

const ASSET_MANIFEST = {
  "top/hull-arrow": { path: "assets/top/hull-arrow.svg", view: "top" },
  "top/hull-dart": { path: "assets/top/hull-dart.svg", view: "top" },
  "top/hull-broad": { path: "assets/top/hull-broad.svg", view: "top" },
  "top/hull-shuttle": { path: "assets/top/hull-shuttle.svg", view: "top" },
  "top/hull-disc": { path: "assets/top/hull-disc.svg", view: "top" },
  "top/wings-delta": { path: "assets/top/wings-delta.svg", view: "top" },
  "top/wings-box": { path: "assets/top/wings-box.svg", view: "top" },
  "top/wings-forward": { path: "assets/top/wings-forward.svg", view: "top" },
  "top/engine-dual": { path: "assets/top/engine-dual.svg", view: "top" },
  "top/engine-quad": { path: "assets/top/engine-quad.svg", view: "top" },
  "top/engine-ring": { path: "assets/top/engine-ring.svg", view: "top" },
  "top/canopy-bubble": { path: "assets/top/canopy-bubble.svg", view: "top" },
  "top/canopy-teardrop": { path: "assets/top/canopy-teardrop.svg", view: "top" },
  "top/canopy-wide": { path: "assets/top/canopy-wide.svg", view: "top" },
  "top/markings-stripe": { path: "assets/top/markings-stripe.svg", view: "top" },
  "top/markings-chevron": { path: "assets/top/markings-chevron.svg", view: "top" },
  "top/markings-panel": { path: "assets/top/markings-panel.svg", view: "top" },
  "side/fuselage-sleek": { path: "assets/side/fuselage-sleek.svg", view: "side" },
  "side/fuselage-bulky": { path: "assets/side/fuselage-bulky.svg", view: "side" },
  "side/fuselage-shuttle": { path: "assets/side/fuselage-shuttle.svg", view: "side" },
  "side/wing-delta": { path: "assets/side/wing-delta.svg", view: "side" },
  "side/wing-box": { path: "assets/side/wing-box.svg", view: "side" },
  "side/wing-forward": { path: "assets/side/wing-forward.svg", view: "side" },
  "side/cockpit-bubble": { path: "assets/side/cockpit-bubble.svg", view: "side" },
  "side/cockpit-forward": { path: "assets/side/cockpit-forward.svg", view: "side" },
  "side/cockpit-embedded": { path: "assets/side/cockpit-embedded.svg", view: "side" },
  "side/engine-twin": { path: "assets/side/engine-twin.svg", view: "side" },
  "side/engine-quad": { path: "assets/side/engine-quad.svg", view: "side" },
  "side/engine-ring": { path: "assets/side/engine-ring.svg", view: "side" },
  "side/fins-tall": { path: "assets/side/fins-tall.svg", view: "side" },
  "side/fins-paired": { path: "assets/side/fins-paired.svg", view: "side" },
};

export const CATEGORY_DEFINITIONS = {
  fighter: {
    label: "Fighter",
    description: "Agile interceptors built from sleek fixed-size SVG components.",
    top: {
      order: ["wings", "hull", "engines", "canopy", "markings"],
      slots: {
        wings: { choices: ["top/wings-delta", "top/wings-forward"] },
        hull: { choices: ["top/hull-arrow", "top/hull-dart"] },
        engines: { choices: ["top/engine-dual", "top/engine-ring"] },
        canopy: { choices: ["top/canopy-bubble", "top/canopy-teardrop"] },
        markings: { choices: [null, "top/markings-stripe", "top/markings-chevron"] },
      },
    },
    side: {
      order: ["wings", "fuselage", "engines", "cockpit", "fins"],
      slots: {
        wings: { choices: ["side/wing-delta", "side/wing-forward"] },
        fuselage: { choices: ["side/fuselage-sleek"] },
        engines: { choices: ["side/engine-twin", "side/engine-ring"] },
        cockpit: { choices: ["side/cockpit-bubble", "side/cockpit-forward"] },
        fins: { choices: [null, "side/fins-tall", "side/fins-paired"] },
      },
    },
  },
  freight: {
    label: "Freight",
    description: "Heavy lifters that assemble broad cargo shells without any runtime scaling.",
    top: {
      order: ["wings", "hull", "engines", "canopy", "markings"],
      slots: {
        wings: { choices: ["top/wings-box", "top/wings-forward"] },
        hull: { choices: ["top/hull-broad", "top/hull-disc"] },
        engines: { choices: ["top/engine-quad", "top/engine-ring"] },
        canopy: { choices: [null, "top/canopy-wide"] },
        markings: { choices: [null, "top/markings-panel"] },
      },
    },
    side: {
      order: ["wings", "fuselage", "engines", "cockpit", "fins"],
      slots: {
        wings: { choices: ["side/wing-box", "side/wing-forward"] },
        fuselage: { choices: ["side/fuselage-bulky"] },
        engines: { choices: ["side/engine-quad"] },
        cockpit: { choices: [null, "side/cockpit-embedded"] },
        fins: { choices: [null, "side/fins-paired"] },
      },
    },
  },
  transport: {
    label: "Transport",
    description: "Shuttles that mix fixed wing pods with medium hulls for reliable silhouettes.",
    top: {
      order: ["wings", "hull", "engines", "canopy", "markings"],
      slots: {
        wings: { choices: ["top/wings-forward", "top/wings-box"] },
        hull: { choices: ["top/hull-shuttle", "top/hull-broad"] },
        engines: { choices: ["top/engine-dual", "top/engine-ring"] },
        canopy: { choices: ["top/canopy-wide", "top/canopy-bubble"] },
        markings: { choices: [null, "top/markings-panel", "top/markings-stripe"] },
      },
    },
    side: {
      order: ["wings", "fuselage", "engines", "cockpit", "fins"],
      slots: {
        wings: { choices: ["side/wing-forward", "side/wing-box"] },
        fuselage: { choices: ["side/fuselage-shuttle"] },
        engines: { choices: ["side/engine-twin", "side/engine-ring"] },
        cockpit: { choices: ["side/cockpit-forward", "side/cockpit-embedded"] },
        fins: { choices: [null, "side/fins-paired"] },
      },
    },
  },
  drone: {
    label: "Drone",
    description: "Compact remotes composed entirely from pre-sized SVG plates.",
    top: {
      order: ["wings", "hull", "engines", "canopy", "markings"],
      slots: {
        wings: { choices: ["top/wings-box", "top/wings-forward"] },
        hull: { choices: ["top/hull-disc", "top/hull-dart"] },
        engines: { choices: ["top/engine-ring", "top/engine-quad"] },
        canopy: { choices: [null, "top/canopy-bubble"] },
        markings: { choices: [null, "top/markings-chevron"] },
      },
    },
    side: {
      order: ["wings", "fuselage", "engines", "cockpit", "fins"],
      slots: {
        wings: { choices: ["side/wing-box", "side/wing-forward"] },
        fuselage: { choices: ["side/fuselage-sleek"] },
        engines: { choices: ["side/engine-ring"] },
        cockpit: { choices: [null, "side/cockpit-embedded"] },
        fins: { choices: [null, "side/fins-tall"] },
      },
    },
  },
};

const assetCache = new Map();
let randomFn = Math.random;

export function pickPalette(excludeName) {
  const options = excludeName
    ? COLOR_PALETTES.filter((palette) => palette.name !== excludeName)
    : COLOR_PALETTES;
  const choice = choose(options);
  return { ...choice };
}

export function createBaseConfig(categoryKey) {
  const key = resolveCategoryKey(categoryKey);
  const def = CATEGORY_DEFINITIONS[key];
  const palette = pickPalette();
  return normaliseConfig({
    id: randomId(),
    category: key,
    label: def.label,
    description: def.description,
    palette,
    selections: {
      top: createSectionSelection(def.top),
      side: createSectionSelection(def.side),
    },
  });
}

export function mutateConfig(base) {
  const def = CATEGORY_DEFINITIONS[base.category] ?? CATEGORY_DEFINITIONS.fighter;
  const clone = cloneConfig(base);
  clone.id = randomId();
  if (nextRandom() < 0.4) {
    clone.palette = pickPalette(base.palette?.name);
  }
  mutateSection(clone.selections.top, def.top);
  mutateSection(clone.selections.side, def.side);
  return normaliseConfig(clone);
}

export function cloneConfig(config) {
  if (typeof structuredClone === "function") {
    return structuredClone(config);
  }
  return JSON.parse(JSON.stringify(config));
}

function createSectionSelection(sectionDef) {
  if (!sectionDef) {
    return {};
  }
  const selection = {};
  sectionDef.order.forEach((slot) => {
    selection[slot] = pickSlotValue(sectionDef.slots[slot]);
  });
  return selection;
}

function mutateSection(selection, sectionDef) {
  if (!selection || !sectionDef) {
    return;
  }
  const mutableSlots = sectionDef.order.filter((slot) => {
    const choices = sectionDef.slots[slot]?.choices ?? [];
    const nonNullChoices = choices.filter((value) => value !== null);
    return nonNullChoices.length > 1 || choices.includes(null);
  });
  const changeCount = Math.max(1, Math.round(nextRandom() * mutableSlots.length));
  for (let i = 0; i < changeCount; i += 1) {
    const slot = choose(mutableSlots);
    selection[slot] = pickSlotValue(sectionDef.slots[slot]);
  }
}

function pickSlotValue(slotDef) {
  if (!slotDef) {
    return null;
  }
  const { choices = [] } = slotDef;
  if (!choices.length) {
    return null;
  }
  return choose(choices);
}

function resolveCategoryKey(category) {
  if (category && CATEGORY_DEFINITIONS[category]) {
    return category;
  }
  if (typeof category === "string") {
    const lower = category.toLowerCase();
    if (CATEGORY_DEFINITIONS[lower]) {
      return lower;
    }
  }
  return "fighter";
}

function nextRandom() {
  return randomFn();
}

function choose(options) {
  if (!options?.length) {
    return null;
  }
  const index = Math.floor(nextRandom() * options.length);
  return options[index];
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let text = "ship-";
  for (let i = 0; i < 8; i += 1) {
    text += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return text;
}

function createRandomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed) {
  if (seed === undefined || seed === null) {
    return null;
  }
  if (typeof seed === "number") {
    return seed;
  }
  const text = String(seed);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function runWithSeed(seed, fn) {
  const hashed = hashSeed(seed);
  if (hashed === null) {
    return fn();
  }
  const previous = randomFn;
  randomFn = createRandomGenerator(hashed);
  try {
    return fn();
  } finally {
    randomFn = previous;
  }
}

export function normaliseConfig(config) {
  const clone = cloneConfig(config);
  clone.category = resolveCategoryKey(clone.category);
  const def = CATEGORY_DEFINITIONS[clone.category];
  clone.selections = clone.selections ?? { top: {}, side: {} };
  clone.selections.top = ensureSectionSelection(clone.selections.top, def.top);
  clone.selections.side = ensureSectionSelection(clone.selections.side, def.side);
  return clone;
}

function ensureSectionSelection(selection, sectionDef) {
  const result = { ...selection };
  if (!sectionDef) {
    return result;
  }
  sectionDef.order.forEach((slot) => {
    if (!result[slot] && result[slot] !== null) {
      result[slot] = pickSlotValue(sectionDef.slots[slot]);
    }
  });
  return result;
}

async function instantiateAsset(assetName) {
  if (!assetName) {
    const emptyGroup = document.createElementNS(SVG_NS, "g");
    emptyGroup.setAttribute("data-empty", "true");
    return emptyGroup;
  }
  const manifestEntry = ASSET_MANIFEST[assetName];
  if (!manifestEntry) {
    console.warn(`Missing asset: ${assetName}`);
    const placeholder = document.createElementNS(SVG_NS, "g");
    return placeholder;
  }
  if (!assetCache.has(assetName)) {
    const promise = fetch(manifestEntry.path)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${manifestEntry.path}`);
        }
        return response.text();
      })
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        return doc.documentElement.innerHTML;
      });
    assetCache.set(assetName, promise);
  }
  const content = await assetCache.get(assetName);
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("data-asset", assetName);
  group.innerHTML = content;
  return group;
}

function resolvePaletteColor(part, palette) {
  switch (part) {
    case "hull":
      return palette.primary;
    case "wing":
      return palette.secondary;
    case "canopy":
      return mixColor(palette.cockpit, "#ffffff", 0.15);
    case "thruster":
      return mixColor(palette.trim, palette.secondary, 0.4);
    case "exhaust":
      return shadeColor(palette.glow, 0.25);
    case "markings":
      return palette.accent;
    case "outline":
      return palette.trim;
    case "stabiliser":
      return mixColor(palette.secondary, palette.trim, 0.35);
    case "detail":
      return mixColor(palette.primary, palette.trim, 0.45);
    case "lights":
      return palette.trim;
    default:
      return palette.primary;
  }
}

function applyPaletteToGroup(group, palette) {
  const elements = group.querySelectorAll("[data-fill], [data-stroke]");
  elements.forEach((element) => {
    const fillPart = element.getAttribute("data-fill");
    if (fillPart && fillPart !== "none") {
      const fillColor = partColor(fillPart, resolvePaletteColor(fillPart, palette));
      element.setAttribute("fill", fillColor);
    }
    const strokePart = element.getAttribute("data-stroke");
    if (strokePart && strokePart !== "none") {
      const strokeColor = partStroke(strokePart, resolvePaletteColor(strokePart, palette));
      element.setAttribute("stroke", strokeColor);
    }
  });
}

function drawFrame(svg, palette) {
  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", "200");
  background.setAttribute("height", "200");
  background.setAttribute("rx", "16");
  background.setAttribute("fill", "#0b1220");
  svg.appendChild(background);

  const frame = document.createElementNS(SVG_NS, "rect");
  frame.setAttribute("x", "3");
  frame.setAttribute("y", "3");
  frame.setAttribute("width", "194");
  frame.setAttribute("height", "194");
  frame.setAttribute("rx", "14");
  frame.setAttribute("fill", "none");
  frame.setAttribute("stroke", mixColor(palette.trim, "#0f172a", 0.35));
  frame.setAttribute("stroke-width", "2");
  svg.appendChild(frame);
}

export async function renderSpaceship(svg, config, options = {}) {
  const { viewMode = "top", drawFrame: shouldDrawFrame = false } = options;
  const prepared = normaliseConfig(config);
  svg.setAttribute("viewBox", VIEWBOX);
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  if (shouldDrawFrame) {
    drawFrame(svg, prepared.palette);
  }

  const def = CATEGORY_DEFINITIONS[prepared.category];
  const section = viewMode === "side" ? def.side : def.top;
  const selection = viewMode === "side" ? prepared.selections.side : prepared.selections.top;
  const layerGroup = document.createElementNS(SVG_NS, "g");
  layerGroup.setAttribute("data-view", viewMode);
  svg.appendChild(layerGroup);

  for (const slot of section.order) {
    const assetName = selection[slot];
    if (!assetName) {
      continue;
    }
    const group = await instantiateAsset(assetName);
    group.setAttribute("data-slot", slot);
    applyPaletteToGroup(group, prepared.palette);
    layerGroup.appendChild(group);
  }
}

export async function renderSpaceshipSprite(config, options = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  await renderSpaceship(svg, config, options);
  return svg;
}

export async function generateSpaceshipSprite(options = {}) {
  const config = options.config ? normaliseConfig(options.config) : createSpaceshipConfig(options);
  const svg = await renderSpaceshipSprite(config, options);
  return { config, svg };
}

export function listSpaceshipCategories() {
  return Object.keys(CATEGORY_DEFINITIONS);
}

export function listSpaceshipPalettes() {
  return COLOR_PALETTES.map((palette) => ({ ...palette }));
}

export function createSpaceshipConfig(options = {}) {
  const { category = "fighter", seed, paletteName, palette } = options;
  return runWithSeed(seed, () => {
    const base = createBaseConfig(category);
    if (paletteName) {
      const match = COLOR_PALETTES.find((entry) => entry.name === paletteName);
      if (match) {
        base.palette = { ...match };
      }
    }
    if (palette) {
      base.palette = { ...palette };
    }
    return normaliseConfig(base);
  });
}

export { COLOR_PALETTES };

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
