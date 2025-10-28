import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlSkeleton = `<!doctype html>
<html lang="en">
  <body>
    <div id="front-segments-top"></div>
    <div id="front-segments-side"></div>
    <div id="mid-segments-top"></div>
    <div id="mid-segments-side"></div>
    <div id="rear-segments-top"></div>
    <div id="rear-segments-side"></div>
    <div id="wing-styles-top"></div>
    <div id="wing-styles-side"></div>
    <div id="armament-wing-top"></div>
    <div id="armament-wing-side"></div>
    <div id="armament-nose-top"></div>
    <div id="armament-nose-side"></div>
    <div id="composite-top"></div>
    <div id="composite-side"></div>
  </body>
</html>`;

// Build a lightweight DOM that matches the containers used by debug.js.
const dom = new JSDOM(htmlSkeleton, { pretendToBeVisual: true });
const { window } = dom;

// Expose the DOM globals so the debug module can render exactly as it does
// inside the browser preview.
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.SVGElement = window.SVGElement;
global.Element = window.Element;
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;

// Load the original debug module; its top-level code performs the rendering.
const debugModuleUrl = pathToFileURL(path.join(__dirname, "../debug.js"));
await import(debugModuleUrl.href);

const containerTargets = [
  { id: "front-segments-top", folder: "body/front/top" },
  { id: "front-segments-side", folder: "body/front/side" },
  { id: "mid-segments-top", folder: "body/mid/top" },
  { id: "mid-segments-side", folder: "body/mid/side" },
  { id: "rear-segments-top", folder: "body/rear/top" },
  { id: "rear-segments-side", folder: "body/rear/side" },
  { id: "wing-styles-top", folder: "wings/top" },
  { id: "wing-styles-side", folder: "wings/side" },
  { id: "armament-wing-top", folder: "armament/wing/top" },
  { id: "armament-wing-side", folder: "armament/wing/side" },
  { id: "armament-nose-top", folder: "armament/nose/top" },
  { id: "armament-nose-side", folder: "armament/nose/side" },
  { id: "composite-top", folder: "composite/top" },
  { id: "composite-side", folder: "composite/side" },
];

const outputRoot = path.resolve(__dirname, "../assets/svg");
const slugCounts = new Map();

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")
    || "sprite";
}

let exportCount = 0;

for (const { id, folder } of containerTargets) {
  const container = document.getElementById(id);
  if (!container) {
    throw new Error(`Missing container: ${id}`);
  }

  const figures = Array.from(container.querySelectorAll("figure"));
  if (figures.length === 0) {
    console.warn(`No figures rendered for ${id}`);
    continue;
  }

  for (const figure of figures) {
    const svg = figure.querySelector("svg");
    if (!svg) {
      console.warn(`Skipping figure without SVG in ${id}`);
      continue;
    }

    const caption = figure.querySelector("figcaption");
    const label = caption?.textContent?.trim() ?? "sprite";
    const baseSlug = slugify(label);
    const key = `${folder}/${baseSlug}`;
    const offset = slugCounts.get(key) ?? 0;
    slugCounts.set(key, offset + 1);
    const slug = offset === 0 ? baseSlug : `${baseSlug}-${offset + 1}`;

    const destinationDir = path.join(outputRoot, folder);
    await mkdir(destinationDir, { recursive: true });

    const filePath = path.join(destinationDir, `${slug}.svg`);
    const markup = `${svg.outerHTML}\n`;
    await writeFile(filePath, markup, "utf8");
    exportCount += 1;
  }
}

console.log(`Exported ${exportCount} SVG files to ${outputRoot}`);
