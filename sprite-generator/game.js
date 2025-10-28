import {
  SVG_NS,
  CATEGORY_DEFINITIONS,
  createBaseConfig,
  cloneConfig,
  mutateConfig,
  pickPalette,
  renderSpaceship,
} from "./generator.js";
import { isDebugColorsEnabled, setDebugColorsEnabled } from "./renderContext.js";

const GRID_SIZE = 9;

const VIEW_MODE = {
  value: "both",
  label: "Dual projection",
  shortLabel: "Dual",
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

const hasGeneratorUi = Boolean(
  categorySelect &&
  spriteGrid &&
  detailTopView &&
  detailSideView &&
  definition &&
  newSeedButton &&
  shufflePaletteButton
);

let currentCategory = "fighter";
let parentConfig = null;
let selectedConfig = null;

function updateDebugToggleButton() {
  if (!debugToggleButton) {
    return;
  }
  const debugEnabled = isDebugColorsEnabled();
  debugToggleButton.textContent = `Debug colors: ${debugEnabled ? "on" : "off"}`;
  debugToggleButton.setAttribute("aria-pressed", debugEnabled ? "true" : "false");
}

if (hasGeneratorUi) {
  populateCategorySelect();
  initialise();
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
      const nextValue = !isDebugColorsEnabled();
      setDebugColorsEnabled(nextValue);
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
  svg.innerHTML = "";
  svg.removeAttribute("data-view-mode");
  svg.setAttribute("aria-hidden", "true");
  svg.style.display = "none";
}
