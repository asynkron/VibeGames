import { loadComponent } from "./componentLoader.js";
import { pickPalette } from "./generator.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_PALETTE = pickPalette();

const PREVIEWS = [
  {
    containerId: "front-segments-top",
    items: [
      { label: "Needle prow", component: "body-front-top-needle-prow" },
      { label: "Canopy prow", component: "body-front-top-canopy-prow" },
      { label: "Ram prow", component: "body-front-top-ram-prow" },
    ],
  },
  {
    containerId: "front-segments-side",
    items: [
      { label: "Needle prow", component: "body-front-side-needle-prow" },
      { label: "Canopy prow", component: "body-front-side-canopy-prow" },
      { label: "Ram prow", component: "body-front-side-ram-prow" },
    ],
  },
  {
    containerId: "mid-segments-top",
    items: [
      { label: "Slim mid-body", component: "body-mid-top-slim-mid-body" },
      { label: "Bulwark fuselage", component: "body-mid-top-bulwark-fuselage" },
      { label: "Modular spine", component: "body-mid-top-modular-spine" },
    ],
  },
  {
    containerId: "mid-segments-side",
    items: [
      { label: "Slim mid-body", component: "body-mid-side-slim-mid-body" },
      { label: "Bulwark fuselage", component: "body-mid-side-bulwark-fuselage" },
      { label: "Modular spine", component: "body-mid-side-modular-spine" },
    ],
  },
  {
    containerId: "rear-segments-top",
    items: [
      { label: "Tapered tail", component: "body-rear-top-tapered-tail" },
      { label: "Thruster cluster", component: "body-rear-top-thruster-cluster" },
      { label: "Block stern", component: "body-rear-top-block-stern" },
    ],
  },
  {
    containerId: "rear-segments-side",
    items: [
      { label: "Tapered tail", component: "body-rear-side-tapered-tail" },
      { label: "Thruster cluster", component: "body-rear-side-thruster-cluster" },
      { label: "Block stern", component: "body-rear-side-block-stern" },
    ],
  },
  {
    containerId: "wing-styles-top",
    items: [
      { label: "Delta strike", component: "wing-top-delta-strike-wing" },
      { label: "Swept interceptor", component: "wing-top-swept-interceptor-wing" },
      { label: "Forward reconnaissance", component: "wing-top-forward-reconnaissance-wing" },
      { label: "Box transport", component: "wing-top-box-transport-wing" },
      { label: "Broad hauler", component: "wing-top-broad-hauler-wing" },
      { label: "Ladder drone", component: "wing-top-ladder-drone-wing" },
      { label: "Split shuttle", component: "wing-top-split-shuttle-wing" },
    ],
  },
  {
    containerId: "wing-styles-side",
    items: [
      { label: "Delta strike", component: "wing-side-delta-strike-wing" },
      { label: "Swept interceptor", component: "wing-side-swept-interceptor-wing" },
      { label: "Forward reconnaissance", component: "wing-side-forward-reconnaissance-wing" },
      { label: "Box transport", component: "wing-side-box-transport-wing" },
      { label: "Broad hauler", component: "wing-side-broad-hauler-wing" },
      { label: "Ladder drone", component: "wing-side-ladder-drone-wing" },
      { label: "Split shuttle", component: "wing-side-split-shuttle-wing" },
    ],
  },
  {
    containerId: "armament-wing-top",
    items: [
      { label: "Heavy bomb racks", component: "armament-wing-top-heavy-bomb-racks" },
      { label: "Twin missile pylons", component: "armament-wing-top-twin-missile-pylons" },
      { label: "Outer line rockets", component: "armament-wing-top-outer-line-rockets" },
    ],
  },
  {
    containerId: "armament-wing-side",
    items: [
      { label: "Heavy bomb racks", component: "armament-wing-side-heavy-bomb-racks" },
      { label: "Twin missile pylons", component: "armament-wing-side-twin-missile-pylons" },
      { label: "Outer line rockets", component: "armament-wing-side-outer-line-rockets" },
    ],
  },
  {
    containerId: "armament-nose-top",
    items: [
      { label: "Single cannon", component: "armament-nose-top-single-cannon" },
      { label: "Dual pulse cannons", component: "armament-nose-top-dual-pulse-cannons" },
      { label: "Triple rotary battery", component: "armament-nose-top-triple-rotary-battery" },
    ],
  },
  {
    containerId: "armament-nose-side",
    items: [
      { label: "Single cannon", component: "armament-nose-side-single-cannon" },
      { label: "Dual pulse cannons", component: "armament-nose-side-dual-pulse-cannons" },
      { label: "Triple rotary battery", component: "armament-nose-side-triple-rotary-battery" },
    ],
  },
  {
    containerId: "composite-top",
    items: [
      { label: "Escort gunship", component: "composite-top-escort-gunship" },
      { label: "Interceptor loadout", component: "composite-top-interceptor-loadout" },
    ],
  },
  {
    containerId: "composite-side",
    items: [
      { label: "Escort gunship", component: "composite-side-escort-gunship" },
      { label: "Interceptor loadout", component: "composite-side-interceptor-loadout" },
    ],
  },
];

async function renderPreview(containerId, items, palette = DEFAULT_PALETTE) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  for (const item of items) {
    const figure = document.createElement("figure");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("aria-label", item.label);

    try {
      const component = await loadComponent(item.component, palette);
      svg.appendChild(component);
    } catch (error) {
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", "10");
      text.setAttribute("y", "30");
      text.textContent = `Failed to load ${item.component}`;
      svg.appendChild(text);
      console.error(error);
    }

    const caption = document.createElement("figcaption");
    caption.textContent = item.label;

    figure.append(svg, caption);
    container.appendChild(figure);
  }
}

PREVIEWS.forEach((preview) => {
  renderPreview(preview.containerId, preview.items).catch(console.error);
});
