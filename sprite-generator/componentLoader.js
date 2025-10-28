import { mixColor, shadeColor } from "./color.js";
import { partColor, partStroke } from "./renderContext.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const parser = new DOMParser();
const componentCache = new Map();

const COLOR_REMAP = new Map([
  ["#42547a", (palette) => partColor("hull", shadeColor(palette.primary, 0))],
  ["#354362", (palette) => partColor("hull", shadeColor(palette.primary, -0.05))],
  ["#3b4c6e", (palette) => partColor("hull", shadeColor(palette.primary, -0.12))],
  ["#323f5c", (palette) => partColor("hull", shadeColor(palette.primary, -0.16))],
  ["#2b374f", (palette) => partColor("hull", shadeColor(palette.primary, -0.22))],
  ["#384768", (palette) => partColor("hull", shadeColor(palette.primary, -0.1))],
  ["#7a94c4", (palette) => partColor("wing", shadeColor(palette.secondary, 0))],
  ["#6e85b0", (palette) => partColor("wing", mixColor(palette.secondary, palette.trim, 0.35))],
  ["#5c6f93", (palette) => partColor("wing", mixColor(palette.secondary, palette.trim, 0.2))],
  ["#9499a9", (palette) => partColor("thruster", mixColor(palette.trim, palette.accent, 0.35))],
  ["#c3c5cc", (palette) => partColor("thruster", mixColor(palette.trim, "#ffffff", 0.5))],
  ["#c3cfe7", (palette) => partColor("canopy", mixColor(palette.accent, "#ffffff", 0.4))],
  ["#c9d4ea", (palette) => partColor("canopy", mixColor(palette.accent, "#ffffff", 0.6))],
  ["#cfd1d9", (palette) => partColor("canopy", mixColor(palette.accent, "#ffffff", 0.55))],
  ["#b7c5e2", (palette) => partColor("lights", mixColor(palette.accent, palette.trim, 0.45))],
  ["#ffd166", (palette) => partColor("exhaust", palette.glow)],
  ["#1f283f", (palette) => partStroke("details", palette.trim)],
  ["#f4f6ff", (palette) => partStroke("details", palette.accent)],
]);

async function fetchComponentMarkup(name) {
  if (componentCache.has(name)) {
    return componentCache.get(name);
  }
  const response = await fetch(`./assets/svg/${name}.svg`);
  if (!response.ok) {
    throw new Error(`Failed to load SVG component \"${name}\": ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) {
    throw new Error(`SVG component \"${name}\" does not contain a root <svg> element.`);
  }
  const markup = svg.innerHTML;
  componentCache.set(name, markup);
  return markup;
}

function createGroupFromMarkup(markup) {
  const group = document.createElementNS(SVG_NS, "g");
  group.innerHTML = markup;
  return group;
}

function remapColor(value, palette) {
  if (!value) {
    return null;
  }
  const key = value.toLowerCase();
  const resolver = COLOR_REMAP.get(key);
  if (!resolver) {
    return null;
  }
  return resolver(palette);
}

export function applyPalette(group, palette) {
  if (!palette || !group) {
    return group;
  }
  const elements = group.querySelectorAll("[fill], [stroke]");
  elements.forEach((element) => {
    const fill = element.getAttribute("fill");
    const stroke = element.getAttribute("stroke");
    const mappedFill = remapColor(fill, palette);
    if (mappedFill && fill !== "none") {
      element.setAttribute("fill", mappedFill);
    }
    const mappedStroke = remapColor(stroke, palette);
    if (mappedStroke && stroke !== "none") {
      element.setAttribute("stroke", mappedStroke);
    }
  });
  return group;
}

export async function loadComponent(name, palette) {
  const markup = await fetchComponentMarkup(name);
  const group = createGroupFromMarkup(markup);
  return palette ? applyPalette(group, palette) : group;
}

export function cloneComponent(group) {
  if (!group) {
    return null;
  }
  const clone = document.createElementNS(SVG_NS, "g");
  clone.innerHTML = group.innerHTML;
  return clone;
}
