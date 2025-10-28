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

let debugColorsEnabled = false;
let renderCounter = 0;

export function isDebugColorsEnabled() {
  return debugColorsEnabled;
}

export function setDebugColorsEnabled(enabled) {
  debugColorsEnabled = Boolean(enabled);
}

export function partColor(part, fallback) {
  return debugColorsEnabled ? DEBUG_PART_COLORS[part] ?? fallback : fallback;
}

export function partStroke(part, fallback) {
  return debugColorsEnabled ? DEBUG_PART_COLORS[part] ?? fallback : fallback;
}

export function nextRenderId() {
  renderCounter += 1;
  return renderCounter;
}
