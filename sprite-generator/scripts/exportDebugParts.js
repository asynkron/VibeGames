import { mkdirSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, "..");
const debugHtmlPath = path.join(projectDir, "debug.html");
const outputDir = path.join(projectDir, "assets", "svg");

const html = await readFile(debugHtmlPath, "utf8");
const dom = new JSDOM(html, {
  pretendToBeVisual: true,
  url: pathToFileURL(debugHtmlPath).href,
});

const { window } = dom;
const globals = [
  "window",
  "document",
  "Node",
  "Element",
  "HTMLElement",
  "SVGElement",
  "SVGPathElement",
  "DOMMatrix",
  "DOMRect",
  "navigator",
  "getComputedStyle",
  "performance",
  "requestAnimationFrame",
  "cancelAnimationFrame",
];

globals.forEach((name) => {
  if (window[name]) {
    globalThis[name] = window[name];
  }
});

globalThis.console = console;

await import(pathToFileURL(path.join(projectDir, "debug.js")));

mkdirSync(outputDir, { recursive: true });

const groupMap = new Map([
  ["front-segments-top", "body-front-top"],
  ["front-segments-side", "body-front-side"],
  ["mid-segments-top", "body-mid-top"],
  ["mid-segments-side", "body-mid-side"],
  ["rear-segments-top", "body-rear-top"],
  ["rear-segments-side", "body-rear-side"],
  ["wing-styles-top", "wing-top"],
  ["wing-styles-side", "wing-side"],
  ["armament-wing-top", "armament-wing-top"],
  ["armament-wing-side", "armament-wing-side"],
  ["armament-nose-top", "armament-nose-top"],
  ["armament-nose-side", "armament-nose-side"],
  ["composite-top", "composite-top"],
  ["composite-side", "composite-side"],
]);

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function serialiseSvg(svg) {
  const xmlHeader = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
  return `${xmlHeader}${svg.outerHTML}\n`;
}

const results = [];

for (const [containerId, prefix] of groupMap.entries()) {
  const container = window.document.getElementById(containerId);
  if (!container) {
    continue;
  }
  container.querySelectorAll("figure").forEach((figure) => {
    const svg = figure.querySelector("svg");
    const label = figure.querySelector("figcaption")?.textContent?.trim() ?? "variant";
    if (!svg) {
      return;
    }
    const fileName = `${prefix}-${slugify(label)}.svg`;
    const filePath = path.join(outputDir, fileName);
    writeFileSync(filePath, serialiseSvg(svg));
    results.push({ fileName, label, containerId });
  });
}

console.log(`Exported ${results.length} sprites to ${path.relative(projectDir, outputDir)}`);
