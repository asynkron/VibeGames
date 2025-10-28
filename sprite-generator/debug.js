import {
  buildBodyAxis,
  getTopSegmentPaths,
  getTopHullPath,
  getNeedleTop,
  buildPlatingPath,
  computeSegmentGeometry,
  createSideProfileAnchors,
  buildSideHullGeometry,
  getNeedleSide,
  buildSideIntakePath,
  computeWingPlanform,
  pointsToString,
  getDeltaWingTop,
  getWingTop,
  buildWingAccent,
  getDeltaWingSide,
  getWingSidePoints,
} from "./renderParts.js";
import { clamp } from "./math.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const palette = {
  primary: "#42547a",
  secondary: "#7a94c4",
  accent: "#f4f6ff",
  trim: "#1f283f",
  glow: "#ffda7a",
};

const BASE_BODY = {
  length: 120,
  halfWidth: 28,
  noseWidthFactor: 0.36,
  tailWidthFactor: 0.6,
  midInset: 14,
  noseCurve: 22,
  tailCurve: 20,
  plating: true,
  startPercent: 0,
  endPercent: 1,
  segments: {
    front: {
      type: "needle",
      length: 36,
      tipWidthFactor: 0.14,
      shoulderWidthFactor: 1.08,
      transitionFactor: 0.86,
      curve: 26,
    },
    mid: {
      type: "modular",
      length: 48,
      waistWidthFactor: 0.94,
      bellyWidthFactor: 1.08,
      trailingWidthFactor: 0.98,
      waistPosition: 0.38,
      bellyPosition: 0.74,
      inset: 12,
    },
    rear: {
      type: "thruster",
      length: 36,
      baseWidthFactor: 1.04,
      exhaustWidthFactor: 0.72,
      tailWidthFactor: 0.6,
      exhaustPosition: 0.68,
      curve: 22,
    },
  },
};

function createBodyVariant(segmentOverrides = {}) {
  return {
    ...BASE_BODY,
    segments: {
      front: { ...BASE_BODY.segments.front, ...(segmentOverrides.front ?? {}) },
      mid: { ...BASE_BODY.segments.mid, ...(segmentOverrides.mid ?? {}) },
      rear: { ...BASE_BODY.segments.rear, ...(segmentOverrides.rear ?? {}) },
    },
  };
}

const FRONT_SEGMENT_VARIANTS = [
  {
    label: "Needle prow",
    body: createBodyVariant({
      front: {
        type: "needle",
        length: 36,
        tipWidthFactor: 0.12,
        shoulderWidthFactor: 1.06,
        transitionFactor: 0.82,
        curve: 28,
      },
    }),
  },
  {
    label: "Canopy prow",
    body: createBodyVariant({
      front: {
        type: "canopy",
        length: 34,
        tipWidthFactor: 0.42,
        shoulderWidthFactor: 1.14,
        transitionFactor: 0.96,
        curve: 16,
      },
    }),
  },
  {
    label: "Ram prow",
    body: createBodyVariant({
      front: {
        type: "ram",
        length: 32,
        tipWidthFactor: 0.26,
        shoulderWidthFactor: 1.02,
        transitionFactor: 0.9,
        curve: 20,
      },
    }),
  },
];

const MID_SEGMENT_VARIANTS = [
  {
    label: "Slim mid-body",
    body: createBodyVariant({
      mid: {
        type: "slim",
        length: 52,
        waistWidthFactor: 0.82,
        bellyWidthFactor: 0.96,
        trailingWidthFactor: 0.92,
        waistPosition: 0.34,
        bellyPosition: 0.7,
        inset: 18,
      },
    }),
  },
  {
    label: "Bulwark fuselage",
    body: createBodyVariant({
      mid: {
        type: "bulwark",
        length: 46,
        waistWidthFactor: 1.02,
        bellyWidthFactor: 1.18,
        trailingWidthFactor: 1.08,
        waistPosition: 0.42,
        bellyPosition: 0.8,
        inset: 10,
      },
    }),
  },
  {
    label: "Modular spine",
    body: createBodyVariant({
      mid: {
        type: "modular",
        length: 48,
        waistWidthFactor: 0.92,
        bellyWidthFactor: 1.04,
        trailingWidthFactor: 0.98,
        waistPosition: 0.36,
        bellyPosition: 0.72,
        inset: 14,
      },
    }),
  },
];

const REAR_SEGMENT_VARIANTS = [
  {
    label: "Tapered tail",
    body: createBodyVariant({
      rear: {
        type: "tapered",
        length: 34,
        baseWidthFactor: 0.98,
        exhaustWidthFactor: 0.68,
        tailWidthFactor: 0.5,
        exhaustPosition: 0.62,
        curve: 18,
      },
    }),
  },
  {
    label: "Thruster cluster",
    body: createBodyVariant({
      rear: {
        type: "thruster",
        length: 38,
        baseWidthFactor: 1.12,
        exhaustWidthFactor: 0.82,
        tailWidthFactor: 0.66,
        exhaustPosition: 0.76,
        curve: 26,
      },
    }),
  },
  {
    label: "Block stern",
    body: createBodyVariant({
      rear: {
        type: "block",
        length: 40,
        baseWidthFactor: 1.18,
        exhaustWidthFactor: 0.9,
        tailWidthFactor: 0.74,
        exhaustPosition: 0.68,
        curve: 24,
      },
    }),
  },
];

function createWingConfig(style, wingOverrides = {}, bodyOverrides = {}) {
  return {
    palette,
    body: createBodyVariant(bodyOverrides),
    wings: {
      enabled: true,
      style,
      span: 52,
      forward: 18,
      sweep: 26,
      thickness: 16,
      dihedral: 6,
      offsetY: 0,
      mountHeight: 0,
      tipAccent: true,
      ...wingOverrides,
    },
  };
}

const WING_VARIANTS = [
  { label: "Delta strike wing", config: createWingConfig("delta", { span: 54, forward: 20, sweep: 30, thickness: 18, dihedral: 8 }) },
  { label: "Swept interceptor wing", config: createWingConfig("swept", { span: 48, forward: 18, sweep: 26, thickness: 14, dihedral: 6, offsetY: 6 }) },
  { label: "Forward reconnaissance wing", config: createWingConfig("forward", { span: 46, forward: 26, sweep: 18, thickness: 12, dihedral: 4 }) },
  { label: "Broad hauler wing", config: createWingConfig("broad", { span: 58, forward: 16, sweep: 20, thickness: 18, dihedral: 2, offsetY: 10, tipAccent: false }) },
  { label: "Box transport wing", config: createWingConfig("box", { span: 50, forward: 12, sweep: 18, thickness: 20, dihedral: 3, offsetY: -6 }) },
  { label: "Ladder drone wing", config: createWingConfig("ladder", { span: 44, forward: 14, sweep: 20, thickness: 12, dihedral: 10 }) },
  { label: "Split shuttle wing", config: createWingConfig("split", { span: 42, forward: 16, sweep: 18, thickness: 14, dihedral: 5, offsetY: -4 }) },
];

function createWingArmamentConfig(type, hardpoints, wingOverrides = {}) {
  return {
    palette,
    body: createBodyVariant(),
    wings: {
      enabled: true,
      style: "swept",
      span: 50,
      forward: 18,
      sweep: 24,
      thickness: 16,
      dihedral: 5,
      offsetY: 4,
      mountHeight: 0,
      tipAccent: true,
      ...wingOverrides,
    },
    armament: {
      mount: "wing",
      type,
      hardpoints,
    },
  };
}

const ARMAMENT_WING_VARIANTS = [
  {
    label: "Twin missile pylons",
    config: createWingArmamentConfig("missile", [
      { chordRatio: 0.32, payloadLength: 30, payloadRadius: 7, pylonLength: 10 },
      { chordRatio: 0.58, payloadLength: 28, payloadRadius: 6, pylonLength: 9 },
    ]),
  },
  {
    label: "Heavy bomb racks",
    config: createWingArmamentConfig("bomb", [
      { chordRatio: 0.38, payloadLength: 26, payloadRadius: 9, pylonLength: 12 },
      { chordRatio: 0.66, payloadLength: 24, payloadRadius: 8, pylonLength: 11 },
    ], { style: "broad", span: 56, thickness: 18, offsetY: 8, tipAccent: false }),
  },
  {
    label: "Outer-line rockets",
    config: createWingArmamentConfig("missile", [
      { chordRatio: 0.72, payloadLength: 32, payloadRadius: 6, pylonLength: 9 },
    ], { style: "forward", span: 46, forward: 24, sweep: 18, thickness: 14, offsetY: -2 }),
  },
];

function createNoseBatteryConfig(barrels, overrides = {}) {
  return {
    palette,
    body: createBodyVariant({
      front: {
        type: "ram",
        length: 34,
        tipWidthFactor: 0.28,
        shoulderWidthFactor: 1.08,
        transitionFactor: 0.92,
        curve: 18,
      },
    }),
    armament: {
      mount: "nose",
      barrels,
      length: overrides.length ?? 28,
      spacing: overrides.spacing ?? 8,
      housingWidth: overrides.housingWidth ?? 12,
      housingHeight: overrides.housingHeight ?? 12,
      offsetY: overrides.offsetY ?? 0,
      mountPercent: overrides.mountPercent ?? 0,
    },
  };
}

const ARMAMENT_NOSE_VARIANTS = [
  { label: "Single cannon", config: createNoseBatteryConfig(1, { spacing: 0, length: 24, housingWidth: 10, housingHeight: 10 }) },
  { label: "Dual pulse cannons", config: createNoseBatteryConfig(2, { spacing: 9, length: 28, housingWidth: 12, housingHeight: 12 }) },
  { label: "Triple rotary battery", config: createNoseBatteryConfig(3, { spacing: 8, length: 32, housingWidth: 14, housingHeight: 14, offsetY: -2 }) },
];

const COMPOSITE_VARIANTS = [
  {
    label: "Interceptor loadout",
    config: {
      palette,
      body: createBodyVariant({
        front: { type: "needle", tipWidthFactor: 0.12, shoulderWidthFactor: 1.08, curve: 28 },
        mid: { type: "slim", waistWidthFactor: 0.86, bellyWidthFactor: 0.98, inset: 18 },
        rear: { type: "tapered", baseWidthFactor: 0.96, exhaustWidthFactor: 0.66, tailWidthFactor: 0.5 },
      }),
      wings: {
        enabled: true,
        style: "delta",
        span: 54,
        forward: 22,
        sweep: 30,
        thickness: 18,
        dihedral: 8,
        offsetY: 2,
        mountHeight: 0,
        tipAccent: true,
      },
      armament: {
        mount: "wing",
        type: "missile",
        hardpoints: [
          { chordRatio: 0.34, payloadLength: 30, payloadRadius: 7, pylonLength: 10 },
          { chordRatio: 0.62, payloadLength: 28, payloadRadius: 6, pylonLength: 9 },
        ],
      },
    },
  },
  {
    label: "Escort gunship",
    config: {
      palette,
      body: createBodyVariant({
        front: { type: "canopy", tipWidthFactor: 0.44, shoulderWidthFactor: 1.16, curve: 18 },
        mid: { type: "bulwark", waistWidthFactor: 1.08, bellyWidthFactor: 1.2, inset: 10 },
        rear: { type: "block", baseWidthFactor: 1.2, exhaustWidthFactor: 0.88, tailWidthFactor: 0.72 },
      }),
      wings: {
        enabled: true,
        style: "box",
        span: 58,
        forward: 14,
        sweep: 20,
        thickness: 20,
        dihedral: 3,
        offsetY: 8,
        mountHeight: 4,
        tipAccent: false,
      },
      armament: {
        mount: "nose",
        barrels: 2,
        length: 32,
        spacing: 10,
        housingWidth: 16,
        housingHeight: 14,
        offsetY: -3,
        mountPercent: 0,
      },
    },
  },
];

function mixColor(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bVal = Math.round(b1 + (b2 - b1) * t);
  return rgbToHex(r, g, bVal);
}

function shadeColor(hex, intensity) {
  const [r, g, b] = hexToRgb(hex);
  const target = intensity >= 0 ? 255 : 0;
  const amount = Math.min(Math.abs(intensity), 1);
  const newR = Math.round(r + (target - r) * amount);
  const newG = Math.round(g + (target - g) * amount);
  const newB = Math.round(b + (target - b) * amount);
  return rgbToHex(newR, newG, newB);
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("")}`;
}

function createProfile(body, axis) {
  const frontLength = body.segments.front.length ?? body.length * 0.32;
  const rearLength = body.segments.rear.length ?? body.length * 0.32;
  const profile = {
    length: body.length,
    height: 48,
    noseLength: frontLength,
    tailLength: rearLength,
    noseHeight: 24,
    dorsalHeight: 32,
    tailHeight: 22,
    bellyDrop: 18,
    ventralDepth: 26,
    intakeHeight: 10,
    intakeDepth: 18,
    offsetY: 0,
    plating: true,
    axis,
    sideAnchorConfig: {
      front: {
        topSecondBlend: 0.28,
        topEndBlend: 0.16,
        bottomSecondBlend: 0.42,
        bottomEndBlend: 0.48,
        needleSharpness: 0.8,
      },
      mid: {
        topDip: 0.08,
        topCrestOffset: 0.04,
      },
      rear: {
        topBlend: 0.62,
        bottomBlend: 0.7,
      },
    },
  };

  profile.noseX = axis.side.nose;
  profile.tailX = axis.side.tail;
  profile.hullAnchors = null;
  profile.segmentAnchors = null;
  return profile;
}

function prepareProfile(body, axis) {
  const profile = createProfile(body, axis);
  const geometry = computeSegmentGeometry(body, axis);
  const anchors = createSideProfileAnchors(profile, body.segments, geometry, { allowFallback: true });
  if (anchors) {
    profile.hullAnchors = anchors;
    profile.segmentAnchors = anchors;
  }
  return { profile, geometry };
}

function createSvg(viewBox = "0 0 200 200") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  return svg;
}

function addCompositeFigure(container, label, builder) {
  const figure = document.createElement("figure");
  const svg = createSvg();
  builder(svg);
  const caption = document.createElement("figcaption");
  caption.textContent = label;
  figure.append(svg, caption);
  container.appendChild(figure);
}

function appendPath(svg, d, options = {}) {
  if (!d) {
    return null;
  }
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  if (options.fill !== undefined) {
    path.setAttribute("fill", options.fill);
  }
  if (options.stroke !== undefined) {
    path.setAttribute("stroke", options.stroke);
  }
  if (options.strokeWidth !== undefined) {
    path.setAttribute("stroke-width", options.strokeWidth.toString());
  }
  if (options.opacity !== undefined) {
    path.setAttribute("opacity", options.opacity.toString());
  }
  if (options.lineJoin) {
    path.setAttribute("stroke-linejoin", options.lineJoin);
  }
  svg.appendChild(path);
  return path;
}

function appendPolygon(svg, points, options = {}) {
  if (!points?.length) {
    return null;
  }
  const polygon = document.createElementNS(SVG_NS, "polygon");
  polygon.setAttribute("points", pointsToString(points));
  if (options.fill !== undefined) {
    polygon.setAttribute("fill", options.fill);
  }
  if (options.stroke !== undefined) {
    polygon.setAttribute("stroke", options.stroke);
  }
  if (options.strokeWidth !== undefined) {
    polygon.setAttribute("stroke-width", options.strokeWidth.toString());
  }
  if (options.opacity !== undefined) {
    polygon.setAttribute("opacity", options.opacity.toString());
  }
  if (options.lineJoin) {
    polygon.setAttribute("stroke-linejoin", options.lineJoin);
  }
  svg.appendChild(polygon);
  return polygon;
}

function appendPolyline(svg, points, options = {}) {
  if (!points?.length) {
    return null;
  }
  const polyline = document.createElementNS(SVG_NS, "polyline");
  polyline.setAttribute("points", pointsToString(points));
  polyline.setAttribute("fill", options.fill ?? "none");
  if (options.stroke !== undefined) {
    polyline.setAttribute("stroke", options.stroke);
  }
  if (options.strokeWidth !== undefined) {
    polyline.setAttribute("stroke-width", options.strokeWidth.toString());
  }
  if (options.opacity !== undefined) {
    polyline.setAttribute("opacity", options.opacity.toString());
  }
  if (options.lineJoin) {
    polyline.setAttribute("stroke-linejoin", options.lineJoin);
  }
  if (options.lineCap) {
    polyline.setAttribute("stroke-linecap", options.lineCap);
  }
  svg.appendChild(polyline);
  return polyline;
}

function appendRect(svg, x, y, width, height, options = {}) {
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", x.toString());
  rect.setAttribute("y", y.toString());
  rect.setAttribute("width", width.toString());
  rect.setAttribute("height", height.toString());
  if (options.rx !== undefined) {
    rect.setAttribute("rx", options.rx.toString());
  }
  if (options.ry !== undefined) {
    rect.setAttribute("ry", options.ry.toString());
  }
  if (options.fill !== undefined) {
    rect.setAttribute("fill", options.fill);
  }
  if (options.stroke !== undefined) {
    rect.setAttribute("stroke", options.stroke);
  }
  if (options.strokeWidth !== undefined) {
    rect.setAttribute("stroke-width", options.strokeWidth.toString());
  }
  if (options.opacity !== undefined) {
    rect.setAttribute("opacity", options.opacity.toString());
  }
  svg.appendChild(rect);
  return rect;
}

function appendCircle(svg, cx, cy, r, options = {}) {
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", cx.toString());
  circle.setAttribute("cy", cy.toString());
  circle.setAttribute("r", r.toString());
  if (options.fill !== undefined) {
    circle.setAttribute("fill", options.fill);
  }
  if (options.stroke !== undefined) {
    circle.setAttribute("stroke", options.stroke);
  }
  if (options.strokeWidth !== undefined) {
    circle.setAttribute("stroke-width", options.strokeWidth.toString());
  }
  if (options.opacity !== undefined) {
    circle.setAttribute("opacity", options.opacity.toString());
  }
  svg.appendChild(circle);
  return circle;
}

function appendEllipse(svg, cx, cy, rx, ry, options = {}) {
  const ellipse = document.createElementNS(SVG_NS, "ellipse");
  ellipse.setAttribute("cx", cx.toString());
  ellipse.setAttribute("cy", cy.toString());
  ellipse.setAttribute("rx", rx.toString());
  ellipse.setAttribute("ry", ry.toString());
  if (options.fill !== undefined) {
    ellipse.setAttribute("fill", options.fill);
  }
  if (options.stroke !== undefined) {
    ellipse.setAttribute("stroke", options.stroke);
  }
  if (options.strokeWidth !== undefined) {
    ellipse.setAttribute("stroke-width", options.strokeWidth.toString());
  }
  if (options.opacity !== undefined) {
    ellipse.setAttribute("opacity", options.opacity.toString());
  }
  svg.appendChild(ellipse);
  return ellipse;
}

function appendLine(svg, x1, y1, x2, y2, options = {}) {
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", x1.toString());
  line.setAttribute("y1", y1.toString());
  line.setAttribute("x2", x2.toString());
  line.setAttribute("y2", y2.toString());
  if (options.stroke !== undefined) {
    line.setAttribute("stroke", options.stroke);
  }
  if (options.strokeWidth !== undefined) {
    line.setAttribute("stroke-width", options.strokeWidth.toString());
  }
  if (options.opacity !== undefined) {
    line.setAttribute("opacity", options.opacity.toString());
  }
  if (options.lineCap) {
    line.setAttribute("stroke-linecap", options.lineCap);
  }
  svg.appendChild(line);
  return line;
}

function paintTopSegment(svg, body, segment, options = {}) {
  const { strokeWidth = 2.2, fill = palette.primary } = options;
  const segments = getTopSegmentPaths(body) ?? {};
  const frontPath = body.segments.front.type === "needle"
    ? getNeedleTop({ body }, { segments }) ?? segments.front
    : segments.front;
  const segmentPath = segment === "front"
    ? frontPath
    : segment === "mid"
      ? segments.mid
      : segments.rear;

  if (!segmentPath) {
    return;
  }

  appendPath(svg, segmentPath, {
    fill,
    stroke: palette.accent,
    strokeWidth,
    lineJoin: "round",
  });
}

function paintSideSegment(svg, body, profile, sideHull, segment, options = {}) {
  const { strokeWidth = 2, fill = palette.primary } = options;
  const segmentPaths = sideHull.segmentPaths ?? {};
  const frontPath = body.segments.front.type === "needle"
    ? getNeedleSide({ body }, profile, { segmentPaths }) ?? segmentPaths.front
    : segmentPaths.front;
  const segmentPath = segment === "front"
    ? frontPath
    : segment === "mid"
      ? segmentPaths.mid
      : segmentPaths.rear;

  if (!segmentPath) {
    return;
  }

  appendPath(svg, segmentPath, {
    fill,
    stroke: palette.accent,
    strokeWidth,
    lineJoin: "round",
  });
}

function paintFullTopHull(svg, body, options = {}) {
  const { highlight, showPlating = true, baseOpacity = 0.45 } = options;
  const segments = getTopSegmentPaths(body) ?? {};
  const frontPath = body.segments.front.type === "needle"
    ? getNeedleTop({ body }, { segments }) ?? segments.front
    : segments.front;
  const segmentEntries = [
    ["front", frontPath],
    ["mid", segments.mid],
    ["rear", segments.rear],
  ];
  const fills = [
    shadeColor(palette.primary, -0.35),
    shadeColor(palette.primary, -0.25),
    shadeColor(palette.primary, -0.15),
  ];

  segmentEntries.forEach(([key, path], index) => {
    if (!path) {
      return;
    }
    const isHighlight = highlight === key;
    appendPath(svg, path, {
      fill: isHighlight ? palette.primary : fills[index],
      stroke: palette.accent,
      strokeWidth: isHighlight ? 2.2 : 1.4,
      opacity: isHighlight ? 1 : baseOpacity,
      lineJoin: "round",
    });
  });

  if (showPlating) {
    const plating = buildPlatingPath(body);
    appendPath(svg, plating, {
      fill: "none",
      stroke: palette.accent,
      strokeWidth: 1,
      opacity: 0.55,
    });
  }

  const hull = getTopHullPath(body);
  appendPath(svg, hull, {
    fill: "none",
    stroke: palette.accent,
    strokeWidth: 1.8,
  });
}

function paintFullSideHull(svg, body, profile, sideHull, options = {}) {
  const { highlight, showIntake = true, baseOpacity = 0.45 } = options;
  const segmentPaths = sideHull.segmentPaths ?? {};
  const frontPath = body.segments.front.type === "needle"
    ? getNeedleSide({ body }, profile, { segmentPaths }) ?? segmentPaths.front
    : segmentPaths.front;
  const segmentEntries = [
    ["front", frontPath],
    ["mid", segmentPaths.mid],
    ["rear", segmentPaths.rear],
  ];
  const fills = [
    shadeColor(palette.primary, -0.35),
    shadeColor(palette.primary, -0.25),
    shadeColor(palette.primary, -0.15),
  ];

  segmentEntries.forEach(([key, path], index) => {
    if (!path) {
      return;
    }
    const isHighlight = highlight === key;
    appendPath(svg, path, {
      fill: isHighlight ? palette.primary : fills[index],
      stroke: palette.accent,
      strokeWidth: isHighlight ? 2 : 1.2,
      opacity: isHighlight ? 1 : baseOpacity,
      lineJoin: "round",
    });
  });

  if (showIntake) {
    const intake = buildSideIntakePath(profile);
    appendPath(svg, intake, {
      fill: palette.trim,
      stroke: palette.accent,
      strokeWidth: 1.2,
      opacity: 0.65,
    });
  }

  appendPath(svg, sideHull.hullPath, {
    fill: "none",
    stroke: palette.accent,
    strokeWidth: 1.8,
  });
}

function getWingTopPoints(config, axis) {
  if (!config?.wings?.enabled) {
    return null;
  }
  return config.wings.style === "delta"
    ? getDeltaWingTop(config, axis)
    : getWingTop(config, axis);
}

function getWingSidePointsForConfig(config, planform, profile, axis) {
  if (!planform?.enabled) {
    return null;
  }
  return config.wings.style === "delta"
    ? getDeltaWingSide(config, planform, profile, axis)
    : getWingSidePoints(planform, profile, axis);
}

function paintWingTop(svg, wingPoints, options = {}) {
  if (!wingPoints) {
    return;
  }
  const { opacity = 1, strokeWidth = 1.6, showAccent = true } = options;
  appendPolygon(svg, wingPoints.left, {
    fill: palette.secondary,
    stroke: palette.trim,
    strokeWidth,
    opacity,
    lineJoin: "round",
  });
  appendPolygon(svg, wingPoints.right, {
    fill: palette.secondary,
    stroke: palette.trim,
    strokeWidth,
    opacity,
    lineJoin: "round",
  });
  if (showAccent) {
    const accentLeft = buildWingAccent(wingPoints.left);
    const accentRight = buildWingAccent(wingPoints.right);
    appendPolyline(svg, accentLeft, {
      stroke: palette.accent,
      strokeWidth: 2.2,
      opacity,
      lineJoin: "round",
      lineCap: "round",
    });
    appendPolyline(svg, accentRight, {
      stroke: palette.accent,
      strokeWidth: 2.2,
      opacity,
      lineJoin: "round",
      lineCap: "round",
    });
  }
}

function paintWingSide(svg, sidePoints, options = {}) {
  if (!sidePoints) {
    return;
  }
  const { opacity = 1, strokeWidth = 1.6 } = options;
  appendPolygon(svg, sidePoints, {
    fill: palette.secondary,
    stroke: palette.trim,
    strokeWidth,
    opacity,
    lineJoin: "round",
  });
  const accent = [sidePoints[0], sidePoints[1], sidePoints[2]];
  appendPolyline(svg, accent, {
    stroke: palette.accent,
    strokeWidth: 2,
    opacity,
    lineJoin: "round",
    lineCap: "round",
  });
}

function renderWingOrdnanceTop(svg, config, axis) {
  const { body, wings, armament } = config;
  if (!armament || armament.mount !== "wing" || !armament.hardpoints?.length) {
    return;
  }
  const planform = computeWingPlanform(body, wings);
  if (!planform.enabled) {
    return;
  }
  const wingMountPercent = axis.length > 0 ? clamp(0.5 + (wings.offsetY ?? 0) / axis.length, 0, 1) : 0.5;
  const baseWingY = axis.percentToTopY(wingMountPercent);
  const ordnanceColor = shadeColor(palette.secondary, -0.1);
  const accentColor = palette.trim;
  const pylonColor = shadeColor(palette.secondary, -0.25);
  const tipColor = mixColor(palette.accent, palette.secondary, 0.4);
  const finColor = shadeColor(palette.accent, -0.15);

  armament.hardpoints.forEach((hardpoint) => {
    const chordRatio = clamp(hardpoint.chordRatio ?? 0.5, 0.1, 0.9);
    const anchorPercent = clamp(planform.positionPercent + planform.lengthPercent * chordRatio, 0, 1);
    const anchorY = axis.percentToTopY(anchorPercent);
    const payloadLength = hardpoint.payloadLength ?? Math.max(18, planform.length * 0.3);
    const payloadRadius = hardpoint.payloadRadius ?? Math.max(5, planform.thickness * 0.35);
    const pylonLength = hardpoint.pylonLength ?? Math.max(planform.thickness * 0.6, 8);
    const payloadOffsetY = baseWingY + planform.thickness * 0.25 + pylonLength + payloadRadius;
    const ordnanceHeight = armament.type === "missile"
      ? Math.max(payloadLength * 0.6, payloadRadius * 1.8)
      : payloadRadius * 2;

    [-1, 1].forEach((direction) => {
      const lateralBase = 100 + direction * (body.halfWidth + Math.max(planform.span * 0.45, 10));
      const pylonTopY = anchorY + planform.thickness * 0.1;
      appendRect(svg, lateralBase - 1.6, pylonTopY, 3.2, pylonLength, {
        rx: 1.2,
        fill: pylonColor,
        stroke: accentColor,
        strokeWidth: 0.9,
      });

      if (armament.type === "missile") {
        appendRect(svg, lateralBase - payloadRadius, payloadOffsetY - ordnanceHeight, payloadRadius * 2, ordnanceHeight, {
          rx: payloadRadius * 0.55,
          fill: ordnanceColor,
          stroke: accentColor,
          strokeWidth: 1,
        });
        const tipPoints = [
          [lateralBase - payloadRadius, payloadOffsetY - ordnanceHeight],
          [lateralBase, payloadOffsetY - ordnanceHeight - Math.max(payloadLength * 0.28, payloadRadius * 0.9)],
          [lateralBase + payloadRadius, payloadOffsetY - ordnanceHeight],
        ];
        appendPolygon(svg, tipPoints, {
          fill: tipColor,
          stroke: accentColor,
          strokeWidth: 1,
        });
        appendRect(svg, lateralBase - payloadRadius * 0.9, payloadOffsetY - payloadRadius * 0.4, payloadRadius * 1.8, payloadRadius * 0.8, {
          fill: finColor,
          opacity: 0.75,
        });
      } else {
        appendEllipse(svg, lateralBase, payloadOffsetY, payloadRadius, Math.max(payloadRadius * 0.75, payloadLength * 0.35), {
          fill: ordnanceColor,
          stroke: accentColor,
          strokeWidth: 1,
        });
        appendCircle(svg, lateralBase, payloadOffsetY - Math.max(payloadRadius * 0.6, payloadLength * 0.25), payloadRadius * 0.55, {
          fill: mixColor(palette.accent, palette.secondary, 0.35),
        });
      }
    });
  });
}

function renderWingOrdnanceSide(svg, config, planform, profile, axis) {
  const { armament } = config;
  if (!armament || armament.mount !== "wing" || !armament.hardpoints?.length || !planform?.enabled) {
    return;
  }
  const centerY = 100 + (profile.offsetY ?? 0);
  const wingBaseY = centerY + planform.mountHeight + planform.thickness;
  const ordnanceColor = shadeColor(palette.secondary, -0.1);
  const pylonColor = shadeColor(palette.secondary, -0.25);
  const accentColor = palette.trim;
  const tipColor = mixColor(palette.accent, palette.secondary, 0.4);
  const finColor = shadeColor(palette.accent, -0.15);

  armament.hardpoints.forEach((hardpoint) => {
    const anchorPercent = clamp(planform.positionPercent + planform.lengthPercent * hardpoint.chordRatio, 0, 1);
    const anchorX = axis.percentToSideX(anchorPercent);
    const pylonLength = hardpoint.pylonLength ?? Math.max(planform.thickness * 0.6, 8);
    const payloadLength = hardpoint.payloadLength ?? Math.max(18, planform.length * 0.3);
    const payloadRadius = hardpoint.payloadRadius ?? Math.max(5, planform.thickness * 0.35);
    const pylonTop = wingBaseY - 1;
    const pylonBottom = pylonTop + pylonLength;
    const payloadCenterY = pylonBottom + payloadRadius;
    const bodyHeight = payloadRadius * 2;
    const bodyX = anchorX - payloadLength * 0.55;

    appendRect(svg, anchorX - 2, pylonTop, 4, pylonLength + 2, {
      rx: 1.6,
      fill: pylonColor,
      stroke: accentColor,
      strokeWidth: 1,
    });
    appendRect(svg, bodyX, payloadCenterY - bodyHeight / 2, payloadLength, bodyHeight, {
      rx: armament.type === "bomb" ? payloadRadius : payloadRadius * 0.5,
      fill: ordnanceColor,
      stroke: accentColor,
      strokeWidth: 1.1,
    });

    if (armament.type === "missile") {
      const tipPoints = [
        [bodyX, payloadCenterY - bodyHeight / 2],
        [bodyX - payloadLength * 0.22, payloadCenterY],
        [bodyX, payloadCenterY + bodyHeight / 2],
      ];
      appendPolygon(svg, tipPoints, {
        fill: tipColor,
        stroke: accentColor,
        strokeWidth: 1,
      });
      const finBaseX = bodyX + payloadLength;
      const finSpread = Math.max(3, payloadRadius * 0.8);
      const finPoints = [
        [finBaseX, payloadCenterY - finSpread],
        [finBaseX + payloadLength * 0.18, payloadCenterY],
        [finBaseX, payloadCenterY + finSpread],
      ];
      appendPolygon(svg, finPoints, {
        fill: finColor,
        opacity: 0.75,
      });
    } else {
      appendCircle(svg, bodyX - payloadRadius * 0.15, payloadCenterY, payloadRadius * 0.45, {
        fill: tipColor,
        stroke: accentColor,
        strokeWidth: 0.9,
      });
      appendRect(svg, bodyX + payloadLength * 0.42, payloadCenterY - bodyHeight / 2, payloadLength * 0.16, bodyHeight, {
        fill: mixColor(palette.accent, palette.trim, 0.45),
        opacity: 0.65,
      });
    }
  });
}

function renderNoseArmamentTop(svg, config, axis) {
  const { armament, body } = config;
  if (!armament || armament.mount !== "nose") {
    return;
  }
  const noseY = axis.top.nose;
  const baseY = noseY - armament.length;
  const spacing = armament.spacing ?? 0;
  const housingWidth = armament.housingWidth ?? Math.max(6, (spacing || body.halfWidth * 0.35) * 1.2);
  const barrelWidth = Math.max(2.4, housingWidth * 0.3);

  for (let i = 0; i < armament.barrels; i += 1) {
    const offset = i - (armament.barrels - 1) / 2;
    const centerX = 100 + offset * spacing;
    const housingHeight = Math.max(6, armament.length * 0.35);
    appendRect(svg, centerX - housingWidth / 2, noseY - housingHeight, housingWidth, housingHeight, {
      rx: housingWidth * 0.35,
      fill: shadeColor(palette.secondary, -0.1),
      stroke: palette.trim,
      strokeWidth: 1,
    });
    appendRect(svg, centerX - barrelWidth / 2, baseY, barrelWidth, armament.length, {
      rx: barrelWidth * 0.45,
      fill: shadeColor(palette.accent, -0.15),
      stroke: palette.trim,
      strokeWidth: 1,
    });
    appendCircle(svg, centerX, baseY, barrelWidth * 0.55, {
      fill: mixColor(palette.accent, palette.secondary, 0.5),
    });
  }
}

function renderNoseArmamentSide(svg, config, profile, axis) {
  const { armament } = config;
  if (!armament || armament.mount !== "nose") {
    return;
  }
  const noseX = axis.percentToSideX(armament.mountPercent ?? 0);
  const baseX = noseX - armament.length;
  const baseY = 100 + (profile.offsetY ?? 0) + (armament.offsetY ?? 0);

  for (let i = 0; i < armament.barrels; i += 1) {
    const offset = i - (armament.barrels - 1) / 2;
    const y = baseY + offset * armament.spacing;
    appendRect(svg, noseX - armament.length * 0.3, y - armament.housingHeight / 2, armament.length * 0.3, armament.housingHeight, {
      rx: armament.housingHeight * 0.25,
      fill: shadeColor(palette.secondary, -0.1),
      stroke: palette.trim,
      strokeWidth: 1.2,
    });
    appendLine(svg, baseX, y, noseX + 2, y - armament.housingHeight * 0.1, {
      stroke: palette.trim,
      strokeWidth: 2.2,
      lineCap: "round",
    });
    appendCircle(svg, baseX, y, armament.housingHeight * 0.25, {
      fill: shadeColor(palette.accent, -0.2),
    });
  }
}

function clearContainer(id) {
  const container = document.getElementById(id);
  if (container) {
    container.innerHTML = "";
  }
  return container;
}

function renderSegmentGroups() {
  const frontTop = clearContainer("front-segments-top");
  const frontSide = clearContainer("front-segments-side");
  const midTop = clearContainer("mid-segments-top");
  const midSide = clearContainer("mid-segments-side");
  const rearTop = clearContainer("rear-segments-top");
  const rearSide = clearContainer("rear-segments-side");

  FRONT_SEGMENT_VARIANTS.forEach(({ label, body }) => {
    const axis = buildBodyAxis(body);
    const { profile } = prepareProfile(body, axis);
    const sideHull = buildSideHullGeometry(profile);
    addCompositeFigure(frontTop, label, (svg) => {
      paintTopSegment(svg, body, "front");
    });
    addCompositeFigure(frontSide, label, (svg) => {
      paintSideSegment(svg, body, profile, sideHull, "front");
    });
  });

  MID_SEGMENT_VARIANTS.forEach(({ label, body }) => {
    const axis = buildBodyAxis(body);
    const { profile } = prepareProfile(body, axis);
    const sideHull = buildSideHullGeometry(profile);
    addCompositeFigure(midTop, label, (svg) => {
      paintTopSegment(svg, body, "mid", { fill: shadeColor(palette.primary, -0.2) });
    });
    addCompositeFigure(midSide, label, (svg) => {
      paintSideSegment(svg, body, profile, sideHull, "mid", { fill: shadeColor(palette.primary, -0.2) });
    });
  });

  REAR_SEGMENT_VARIANTS.forEach(({ label, body }) => {
    const axis = buildBodyAxis(body);
    const { profile } = prepareProfile(body, axis);
    const sideHull = buildSideHullGeometry(profile);
    addCompositeFigure(rearTop, label, (svg) => {
      paintTopSegment(svg, body, "rear", { fill: shadeColor(palette.primary, -0.1) });
    });
    addCompositeFigure(rearSide, label, (svg) => {
      paintSideSegment(svg, body, profile, sideHull, "rear", { fill: shadeColor(palette.primary, -0.1) });
    });
  });
}

function renderWingVariants() {
  const topContainer = clearContainer("wing-styles-top");
  const sideContainer = clearContainer("wing-styles-side");

  WING_VARIANTS.forEach(({ label, config }) => {
    const axis = buildBodyAxis(config.body);
    const { profile } = prepareProfile(config.body, axis);
    const planform = computeWingPlanform(config.body, config.wings);
    const wingTop = getWingTopPoints(config, axis);
    const wingSide = getWingSidePointsForConfig(config, planform, profile, axis);

    addCompositeFigure(topContainer, label, (svg) => {
      paintWingTop(svg, wingTop, { opacity: 0.95, showAccent: config.wings.tipAccent !== false });
    });

    addCompositeFigure(sideContainer, label, (svg) => {
      paintWingSide(svg, wingSide, { opacity: 0.95 });
    });
  });
}

function renderArmamentVariants() {
  const wingTop = clearContainer("armament-wing-top");
  const wingSide = clearContainer("armament-wing-side");
  const noseTop = clearContainer("armament-nose-top");
  const noseSide = clearContainer("armament-nose-side");

  ARMAMENT_WING_VARIANTS.forEach(({ label, config }) => {
    const axis = buildBodyAxis(config.body);
    const { profile } = prepareProfile(config.body, axis);
    const planform = computeWingPlanform(config.body, config.wings);

    addCompositeFigure(wingTop, label, (svg) => {
      renderWingOrdnanceTop(svg, config, axis);
    });

    addCompositeFigure(wingSide, label, (svg) => {
      renderWingOrdnanceSide(svg, config, planform, profile, axis);
    });
  });

  ARMAMENT_NOSE_VARIANTS.forEach(({ label, config }) => {
    const axis = buildBodyAxis(config.body);
    const { profile } = prepareProfile(config.body, axis);

    addCompositeFigure(noseTop, label, (svg) => {
      renderNoseArmamentTop(svg, config, axis);
    });

    addCompositeFigure(noseSide, label, (svg) => {
      renderNoseArmamentSide(svg, config, profile, axis);
    });
  });
}

function renderCompositeVariants() {
  const topContainer = clearContainer("composite-top");
  const sideContainer = clearContainer("composite-side");

  COMPOSITE_VARIANTS.forEach(({ label, config }) => {
    const axis = buildBodyAxis(config.body);
    const { profile } = prepareProfile(config.body, axis);
    const sideHull = buildSideHullGeometry(profile);
    const planform = computeWingPlanform(config.body, config.wings);
    const wingTop = getWingTopPoints(config, axis);
    const wingSide = getWingSidePointsForConfig(config, planform, profile, axis);

    addCompositeFigure(topContainer, label, (svg) => {
      paintFullTopHull(svg, config.body, { baseOpacity: 0.6 });
      paintWingTop(svg, wingTop, { opacity: 0.85, showAccent: config.wings?.tipAccent !== false });
      if (config.armament?.mount === "wing") {
        renderWingOrdnanceTop(svg, config, axis);
      } else if (config.armament?.mount === "nose") {
        renderNoseArmamentTop(svg, config, axis);
      }
    });

    addCompositeFigure(sideContainer, label, (svg) => {
      paintFullSideHull(svg, config.body, profile, sideHull, { baseOpacity: 0.6 });
      paintWingSide(svg, wingSide, { opacity: 0.85 });
      if (config.armament?.mount === "wing") {
        renderWingOrdnanceSide(svg, config, planform, profile, axis);
      } else if (config.armament?.mount === "nose") {
        renderNoseArmamentSide(svg, config, profile, axis);
      }
    });
  });
}

renderSegmentGroups();
renderWingVariants();
renderArmamentVariants();
renderCompositeVariants();
