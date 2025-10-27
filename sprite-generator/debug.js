import { renderSpaceshipSprite, createSpaceshipConfig } from "./game.js";
import {
  FRONT_SEGMENT_VARIANTS,
  MID_SEGMENT_VARIANTS,
  REAR_SEGMENT_VARIANTS,
} from "./segmentVariants.js";

const baseConfig = createSpaceshipConfig({ category: "fighter", seed: "debug-catalogue" });

const SVG_NS = "http://www.w3.org/2000/svg";

function cloneConfig(config) {
  if (typeof structuredClone === "function") {
    return structuredClone(config);
  }
  return JSON.parse(JSON.stringify(config));
}

function midpoint(range, fallback) {
  return Array.isArray(range) && range.length === 2 ? (range[0] + range[1]) / 2 : fallback;
}

let debugIdCounter = 0;
function nextDebugId(prefix) {
  debugIdCounter += 1;
  return `${prefix}-${debugIdCounter}`;
}

function createBaseDebugConfig() {
  const config = cloneConfig(baseConfig);
  config.id = nextDebugId("debug");
  config.wings = {
    ...config.wings,
    enabled: false,
    tipAccent: false,
    offsetY: 0,
    mountHeight: 0,
  };
  config.details = {
    ...config.details,
    stripe: false,
    antenna: false,
  };
  config.fins = {
    ...config.fins,
    top: 0,
    side: 0,
    bottom: 0,
  };
  config.armament = null;
  return config;
}

function buildSegmentFromVariant(variant, baseLength, defaults) {
  const lengthRatio = midpoint(variant.lengthWeightRange, defaults.length / baseLength);
  const length = baseLength * lengthRatio;
  return {
    type: variant.type,
    length,
    weight: length,
    tipWidthFactor: midpoint(variant.tipWidthFactorRange, defaults.tipWidthFactor),
    shoulderWidthFactor: midpoint(variant.shoulderWidthFactorRange, defaults.shoulderWidthFactor),
    transitionFactor: midpoint(variant.transitionFactorRange, defaults.transitionFactor),
    curve: midpoint(variant.curveRange, defaults.curve),
  };
}

function buildMidSegmentFromVariant(variant, baseLength, defaults) {
  const lengthRatio = midpoint(variant.lengthWeightRange, defaults.length / baseLength);
  const length = baseLength * lengthRatio;
  return {
    type: variant.type,
    length,
    weight: length,
    waistWidthFactor: midpoint(variant.waistWidthFactorRange, defaults.waistWidthFactor),
    bellyWidthFactor: midpoint(variant.bellyWidthFactorRange, defaults.bellyWidthFactor),
    trailingWidthFactor: midpoint(variant.trailingWidthFactorRange, defaults.trailingWidthFactor),
    waistPosition: midpoint(variant.waistPositionRange, defaults.waistPosition),
    bellyPosition: midpoint(variant.bellyPositionRange, defaults.bellyPosition),
    inset: midpoint(variant.insetRange, defaults.inset),
  };
}

function buildRearSegmentFromVariant(variant, baseLength, defaults) {
  const lengthRatio = midpoint(variant.lengthWeightRange, defaults.length / baseLength);
  const length = baseLength * lengthRatio;
  return {
    type: variant.type,
    length,
    weight: length,
    baseWidthFactor: midpoint(variant.baseWidthFactorRange, defaults.baseWidthFactor),
    exhaustWidthFactor: midpoint(variant.exhaustWidthFactorRange, defaults.exhaustWidthFactor),
    tailWidthFactor: midpoint(variant.tailWidthFactorRange, defaults.tailWidthFactor),
    exhaustPosition: midpoint(variant.exhaustPositionRange, defaults.exhaustPosition),
    curve: midpoint(variant.curveRange, defaults.curve),
  };
}

function createBodyFromVariants(frontVariant, midVariant, rearVariant, baseBody) {
  const body = cloneConfig(baseBody);
  const baseLength = body.length;
  const frontDefaults = {
    length: body.segments.front.length,
    tipWidthFactor: body.segments.front.tipWidthFactor,
    shoulderWidthFactor: body.segments.front.shoulderWidthFactor,
    transitionFactor: body.segments.front.transitionFactor,
    curve: body.segments.front.curve,
  };
  const midDefaults = {
    length: body.segments.mid.length,
    waistWidthFactor: body.segments.mid.waistWidthFactor,
    bellyWidthFactor: body.segments.mid.bellyWidthFactor,
    trailingWidthFactor: body.segments.mid.trailingWidthFactor,
    waistPosition: body.segments.mid.waistPosition,
    bellyPosition: body.segments.mid.bellyPosition,
    inset: body.segments.mid.inset,
  };
  const rearDefaults = {
    length: body.segments.rear.length,
    baseWidthFactor: body.segments.rear.baseWidthFactor,
    exhaustWidthFactor: body.segments.rear.exhaustWidthFactor,
    tailWidthFactor: body.segments.rear.tailWidthFactor,
    exhaustPosition: body.segments.rear.exhaustPosition,
    curve: body.segments.rear.curve,
  };

  const front = buildSegmentFromVariant(frontVariant, baseLength, frontDefaults);
  const mid = buildMidSegmentFromVariant(midVariant, baseLength, midDefaults);
  const rear = buildRearSegmentFromVariant(rearVariant, baseLength, rearDefaults);

  const totalLength = front.length + mid.length + rear.length;
  const scale = totalLength > 0 ? body.length / totalLength : 1;
  front.length *= scale;
  front.weight = front.length;
  mid.length *= scale;
  mid.weight = mid.length;
  rear.length *= scale;
  rear.weight = rear.length;

  body.segments = { front, mid, rear };
  body.noseCurve = front.curve;
  body.tailCurve = rear.curve;
  body.midInset = mid.inset;
  body.noseWidthFactor = front.tipWidthFactor;
  body.tailWidthFactor = rear.tailWidthFactor;
  return body;
}

function createSvg(viewBox = "0 0 200 200") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  return svg;
}

function extractSvg(config, selectors, options = {}) {
  const svg = renderSpaceshipSprite(config, { viewMode: options.viewMode ?? "top" });
  const output = createSvg();
  const defs = svg.querySelector("defs");
  if (defs && defs.childNodes.length) {
    output.appendChild(defs.cloneNode(true));
  }
  selectors.forEach((selector) => {
    svg.querySelectorAll(selector).forEach((node) => {
      output.appendChild(node.cloneNode(true));
    });
  });
  if (typeof options.postProcess === "function") {
    options.postProcess(output);
  }
  return output;
}

function addSvgFigure(container, svg, label) {
  const figure = document.createElement("figure");
  const caption = document.createElement("figcaption");
  caption.textContent = label;
  figure.append(svg, caption);
  container.appendChild(figure);
}

function capitalise(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function highlightSegment(svg, key) {
  svg.querySelectorAll(".body-segment").forEach((node) => {
    const isTarget = node.classList.contains(`body-segment-${key}`);
    node.setAttribute("fill-opacity", isTarget ? "1" : "0.25");
  });
}

function fadeNonTarget(svg, selector) {
  svg.querySelectorAll(selector).forEach((node) => {
    node.setAttribute("opacity", "0.25");
  });
}

function renderSegmentGallery() {
  const frontContainer = document.getElementById("front-segments-preview");
  const midContainer = document.getElementById("mid-segments-preview");
  const rearContainer = document.getElementById("rear-segments-preview");
  frontContainer.innerHTML = "";
  midContainer.innerHTML = "";
  rearContainer.innerHTML = "";

  const defaultMid = MID_SEGMENT_VARIANTS[0];
  const defaultRear = REAR_SEGMENT_VARIANTS[0];
  FRONT_SEGMENT_VARIANTS.forEach((variant) => {
    const config = createBaseDebugConfig();
    config.body = createBodyFromVariants(variant, defaultMid, defaultRear, config.body);
    const svg = extractSvg(config, [".body-segment", ".body-outline"]);
    highlightSegment(svg, "front");
    addSvgFigure(frontContainer, svg, `Front: ${capitalise(variant.type)}`);
  });

  const defaultFront = FRONT_SEGMENT_VARIANTS[0];
  MID_SEGMENT_VARIANTS.forEach((variant) => {
    const config = createBaseDebugConfig();
    config.body = createBodyFromVariants(defaultFront, variant, defaultRear, config.body);
    const svg = extractSvg(config, [".body-segment", ".body-outline"]);
    highlightSegment(svg, "mid");
    addSvgFigure(midContainer, svg, `Mid: ${capitalise(variant.type)}`);
  });

  REAR_SEGMENT_VARIANTS.forEach((variant) => {
    const config = createBaseDebugConfig();
    config.body = createBodyFromVariants(defaultFront, defaultMid, variant, config.body);
    const svg = extractSvg(config, [".body-segment", ".body-outline"]);
    highlightSegment(svg, "rear");
    addSvgFigure(rearContainer, svg, `Rear: ${capitalise(variant.type)}`);
  });
}

function configureWing(config, overrides) {
  config.wings = {
    ...config.wings,
    ...overrides,
    enabled: true,
    mount: overrides.mount ?? "mid",
  };
}

function renderWingGallery() {
  const container = document.getElementById("wing-gallery");
  container.innerHTML = "";
  const length = baseConfig.body.length;
  const span = length * 0.52;
  const sweep = length * 0.24;
  const forward = length * 0.18;
  const thickness = length * 0.12;
  const wingSamples = [
    {
      style: "delta",
      label: "Delta Wing",
      setup: (config) => {
        configureWing(config, { style: "delta", span, sweep, forward, thickness, dihedral: length * 0.08, tipAccent: true });
      },
    },
    {
      style: "swept",
      label: "Swept Wing",
      setup: (config) => {
        configureWing(config, { style: "swept", span, sweep, forward: forward * 0.8, thickness, dihedral: length * 0.06 });
      },
    },
    {
      style: "forward",
      label: "Forward Wing",
      setup: (config) => {
        configureWing(config, { style: "forward", span: span * 0.92, sweep, forward: forward * 1.2, thickness: thickness * 0.9, dihedral: length * 0.05 });
      },
    },
    {
      style: "ladder",
      label: "Ladder Wing",
      setup: (config) => {
        configureWing(config, { style: "ladder", span: span * 0.86, sweep, forward, thickness, dihedral: length * 0.04 });
      },
    },
    {
      style: "split",
      label: "Split Wing",
      setup: (config) => {
        configureWing(config, { style: "split", span: span * 0.9, sweep, forward: forward * 0.85, thickness, dihedral: length * 0.05 });
      },
    },
    {
      style: "box",
      label: "Box Wing",
      setup: (config) => {
        configureWing(config, { style: "box", span: span * 0.78, sweep, forward: forward * 0.65, thickness: thickness * 1.1, dihedral: length * 0.03 });
      },
    },
    {
      style: "broad",
      label: "Broad Wing",
      setup: (config) => {
        configureWing(config, { style: "broad", span: span * 1.05, sweep: sweep * 0.8, forward: forward * 0.6, thickness: thickness * 1.05, dihedral: length * 0.02 });
      },
    },
  ];

  wingSamples.forEach((sample) => {
    const config = createBaseDebugConfig();
    sample.setup(config);
    const svg = extractSvg(config, [".body-outline", ".top-wings"]);
    fadeNonTarget(svg, ".body-outline");
    addSvgFigure(container, svg, sample.label);
  });
}

function renderArmamentGallery() {
  const container = document.getElementById("armament-preview");
  container.innerHTML = "";
  const length = baseConfig.body.length;
  const hardpoint = (ratio) => ({
    chordRatio: ratio,
    pylonLength: length * 0.1,
    payloadLength: length * 0.28,
    payloadRadius: length * 0.08,
  });
  const samples = [
    {
      label: "Nose Cannons",
      setup: (config) => {
        config.armament = {
          mount: "nose",
          barrels: 2,
          length: length * 0.2,
          spacing: config.body.halfWidth * 0.7,
          housingWidth: config.body.halfWidth * 0.8,
        };
      },
      selectors: [".body-outline", ".nose-armament-top"],
      post: (svg) => fadeNonTarget(svg, ".body-outline"),
    },
    {
      label: "Wing Missiles",
      setup: (config) => {
        configureWing(config, { style: "swept", span: length * 0.5, sweep: length * 0.22, forward: length * 0.16, thickness: length * 0.1 });
        config.armament = {
          mount: "wing",
          type: "missile",
          barrels: 2,
          hardpoints: [hardpoint(0.36), hardpoint(0.64)],
        };
      },
      selectors: [".body-outline", ".top-wings", ".wing-ordnance-top"],
      post: (svg) => fadeNonTarget(svg, ".body-outline"),
    },
    {
      label: "Wing Bombs",
      setup: (config) => {
        configureWing(config, { style: "broad", span: length * 0.58, sweep: length * 0.18, forward: length * 0.12, thickness: length * 0.12 });
        config.armament = {
          mount: "wing",
          type: "bomb",
          barrels: 2,
          hardpoints: [hardpoint(0.42), hardpoint(0.7)],
        };
      },
      selectors: [".body-outline", ".top-wings", ".wing-ordnance-top"],
      post: (svg) => fadeNonTarget(svg, ".body-outline"),
    },
  ];

  samples.forEach((sample) => {
    const config = createBaseDebugConfig();
    sample.setup(config);
    const svg = extractSvg(config, sample.selectors, { postProcess: sample.post });
    addSvgFigure(container, svg, sample.label);
  });
}

function renderSystemsGallery() {
  const container = document.getElementById("systems-preview");
  container.innerHTML = "";
  const length = baseConfig.body.length;
  const samples = [
    {
      label: "Cockpit Canopy",
      setup: (config) => {
        config.details.stripe = false;
      },
      selectors: [".top-cockpit"],
    },
    {
      label: "Engine Cluster",
      setup: (config) => {
        config.engine.count = 3;
        config.engine.spacing = config.body.halfWidth * 0.9;
        config.engine.size = config.body.halfWidth * 0.85;
        config.engine.nozzleLength = length * 0.14;
      },
      selectors: [".top-engines"],
    },
    {
      label: "Stabiliser Fins",
      setup: (config) => {
        config.fins = {
          ...config.fins,
          top: 1,
          side: 2,
          bottom: 1,
          height: length * 0.22,
          width: config.body.halfWidth * 0.9,
        };
      },
      selectors: [".top-fins"],
    },
    {
      label: "Hull Plating",
      setup: (config) => {
        config.body.plating = true;
      },
      selectors: [".body-plating", ".body-outline"],
      post: (svg) => fadeNonTarget(svg, ".body-outline"),
    },
    {
      label: "Markings & Beacon",
      setup: (config) => {
        config.details = {
          ...config.details,
          stripe: true,
          antenna: true,
        };
      },
      selectors: [".top-detail", ".body-outline"],
      post: (svg) => fadeNonTarget(svg, ".body-outline"),
    },
  ];

  samples.forEach((sample) => {
    const config = createBaseDebugConfig();
    sample.setup(config);
    const svg = extractSvg(config, sample.selectors, { postProcess: sample.post });
    addSvgFigure(container, svg, sample.label);
  });
}

renderSegmentGallery();
renderWingGallery();
renderArmamentGallery();
renderSystemsGallery();
