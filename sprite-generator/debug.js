import {
  buildBodyAxis,
  getTopSegmentPaths,
  getTopHullPath,
  computeSegmentGeometry,
  createSideProfileAnchors,
  buildSideHullGeometry,
  computeWingPlanform,
  getDeltaWingTop,
  getWingTop,
  buildWingAccent,
  getDeltaWingSide,
  getWingSidePoints,
  pointsToString,
} from "./renderParts.js";
import { FRONT_SEGMENT_VARIANTS, MID_SEGMENT_VARIANTS, REAR_SEGMENT_VARIANTS } from "./variants.js";
import { clamp } from "./math.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const palette = {
  primary: "#42547a",
  secondary: "#7a94c4",
  accent: "#f4f6ff",
  trim: "#1f283f",
  glow: "#ffda7a",
};

const BASE_BODY_LENGTH = 120;
const BASE_HALF_WIDTH = 28;

const segmentContainers = {
  front: {
    top: document.getElementById("front-segment-top"),
    side: document.getElementById("front-segment-side"),
  },
  mid: {
    top: document.getElementById("mid-segment-top"),
    side: document.getElementById("mid-segment-side"),
  },
  rear: {
    top: document.getElementById("rear-segment-top"),
    side: document.getElementById("rear-segment-side"),
  },
};

const wingContainers = {
  top: document.getElementById("wing-top-preview"),
  side: document.getElementById("wing-side-preview"),
};

const armamentContainers = {
  top: document.getElementById("armament-top-preview"),
  side: document.getElementById("armament-side-preview"),
};

const WING_STYLE_PRESETS = [
  {
    style: "delta",
    label: "Delta Wing",
    wings: { span: 48, forward: 22, sweep: 28, thickness: 16, dihedral: 12, offsetY: 0, mountHeight: 4, tipAccent: true },
  },
  {
    style: "swept",
    label: "Swept Wing",
    wings: { span: 44, forward: 18, sweep: 26, thickness: 14, dihedral: 10, offsetY: 6, mountHeight: 6, tipAccent: true },
  },
  {
    style: "forward",
    label: "Forward Wing",
    wings: { span: 42, forward: 20, sweep: 22, thickness: 12, dihedral: 6, offsetY: -6, mountHeight: 4, tipAccent: false },
  },
  {
    style: "broad",
    label: "Broad Wing",
    wings: { span: 46, forward: 14, sweep: 20, thickness: 18, dihedral: 4, offsetY: 0, mountHeight: 5, tipAccent: false },
  },
  {
    style: "box",
    label: "Box Wing",
    wings: { span: 40, forward: 16, sweep: 18, thickness: 16, dihedral: 8, offsetY: 4, mountHeight: 6, tipAccent: false },
  },
  {
    style: "ladder",
    label: "Ladder Wing",
    wings: { span: 44, forward: 18, sweep: 22, thickness: 14, dihedral: 12, offsetY: 2, mountHeight: 5, tipAccent: false },
  },
  {
    style: "split",
    label: "Split Wing",
    wings: { span: 46, forward: 20, sweep: 26, thickness: 14, dihedral: 8, offsetY: 0, mountHeight: 6, tipAccent: true },
  },
];

const ARMAMENT_PRESETS = [
  {
    key: "nose",
    label: "Nose Cannons",
    wings: { span: 42, forward: 18, sweep: 22, thickness: 14, dihedral: 8, offsetY: 4, mountHeight: 4, tipAccent: true, style: "swept" },
    armament: { mount: "nose", barrels: 2, length: 26, spacing: 14, housingWidth: 12, housingHeight: 14 },
  },
  {
    key: "wing-missile",
    label: "Wing Missiles",
    wings: { span: 44, forward: 18, sweep: 26, thickness: 16, dihedral: 10, offsetY: 6, mountHeight: 6, tipAccent: false, style: "swept" },
    armament: {
      mount: "wing",
      type: "missile",
      barrels: 2,
      hardpoints: [
        { chordRatio: 0.36, pylonLength: 12, payloadLength: 28, payloadRadius: 6 },
        { chordRatio: 0.66, pylonLength: 14, payloadLength: 26, payloadRadius: 6 },
      ],
    },
  },
  {
    key: "wing-bomb",
    label: "Wing Bombs",
    wings: { span: 46, forward: 16, sweep: 22, thickness: 18, dihedral: 6, offsetY: 4, mountHeight: 5, tipAccent: false, style: "broad" },
    armament: {
      mount: "wing",
      type: "bomb",
      barrels: 2,
      hardpoints: [
        { chordRatio: 0.34, pylonLength: 14, payloadLength: 22, payloadRadius: 8 },
        { chordRatio: 0.64, pylonLength: 16, payloadLength: 24, payloadRadius: 9 },
      ],
    },
  },
];

function midpoint(range) {
  return (range[0] + range[1]) / 2;
}

function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

function buildFrontSegment(variant) {
  return {
    type: variant.type,
    weight: midpoint(variant.lengthWeightRange),
    tipWidthFactor: midpoint(variant.tipWidthFactorRange),
    shoulderWidthFactor: midpoint(variant.shoulderWidthFactorRange),
    transitionFactor: midpoint(variant.transitionFactorRange),
    curve: midpoint(variant.curveRange),
  };
}

function buildMidSegment(variant) {
  return {
    type: variant.type,
    weight: midpoint(variant.lengthWeightRange),
    waistWidthFactor: midpoint(variant.waistWidthFactorRange),
    bellyWidthFactor: midpoint(variant.bellyWidthFactorRange),
    trailingWidthFactor: midpoint(variant.trailingWidthFactorRange),
    waistPosition: midpoint(variant.waistPositionRange),
    bellyPosition: midpoint(variant.bellyPositionRange),
    inset: midpoint(variant.insetRange),
  };
}

function buildRearSegment(variant) {
  return {
    type: variant.type,
    weight: midpoint(variant.lengthWeightRange),
    baseWidthFactor: midpoint(variant.baseWidthFactorRange),
    exhaustWidthFactor: midpoint(variant.exhaustWidthFactorRange),
    tailWidthFactor: midpoint(variant.tailWidthFactorRange),
    exhaustPosition: midpoint(variant.exhaustPositionRange),
    curve: midpoint(variant.curveRange),
  };
}

function distributeSegmentLengths(segments, bodyLength) {
  const weights = segments.map((segment) => Math.max(segment.weight ?? segment.length ?? 0.1, 0.1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  segments.forEach((segment, index) => {
    segment.length = (weights[index] / total) * bodyLength;
  });
}

function createBodyWithSegments(options = {}) {
  const frontVariant = options.frontVariant ?? FRONT_SEGMENT_VARIANTS[0];
  const midVariant = options.midVariant ?? MID_SEGMENT_VARIANTS[0];
  const rearVariant = options.rearVariant ?? REAR_SEGMENT_VARIANTS[0];

  const front = buildFrontSegment(frontVariant);
  const mid = buildMidSegment(midVariant);
  const rear = buildRearSegment(rearVariant);

  distributeSegmentLengths([front, mid, rear], BASE_BODY_LENGTH);

  const body = {
    length: BASE_BODY_LENGTH,
    halfWidth: BASE_HALF_WIDTH,
    startPercent: 0,
    endPercent: 1,
    plating: true,
    noseWidthFactor: front.tipWidthFactor,
    noseCurve: front.curve,
    midInset: mid.inset,
    tailWidthFactor: rear.tailWidthFactor,
    tailCurve: rear.curve,
    segments: { front, mid, rear },
  };

  return body;
}

function createProfile(body, axis) {
  const front = body.segments.front;
  const mid = body.segments.mid;
  const rear = body.segments.rear;
  const height = Math.max(52, body.halfWidth * 1.7);
  const bellyDrop = Math.max(18, mid.inset * 1.1);
  const ventralDepth = Math.max(bellyDrop + 8, bellyDrop + mid.bellyWidthFactor * 6);

  const profile = {
    length: body.length,
    height,
    noseLength: front.length,
    tailLength: rear.length,
    noseHeight: Math.max(20, front.curve * 0.9),
    dorsalHeight: Math.max(height * 0.65, body.halfWidth * 1.3),
    tailHeight: Math.max(18, rear.curve * 0.75),
    bellyDrop,
    ventralDepth,
    intakeHeight: Math.max(8, body.halfWidth * 0.55),
    intakeDepth: Math.max(14, body.halfWidth * 0.65),
    offsetY: 0,
    plating: Boolean(body.plating),
    axis,
    sideAnchorConfig: {
      front: {
        topSecondBlend: front.type === "needle" ? 0.18 : 0.32,
        topEndBlend: front.type === "needle" ? 0.12 : 0.2,
        bottomSecondBlend: 0.4,
        bottomEndBlend: 0.48,
        needleSharpness: front.type === "needle" ? 0.75 : 0.2,
      },
      mid: {
        topDip: 0.08,
        topCrestOffset: clamp((mid.bellyPosition ?? 0.72) - 0.72, -0.12, 0.12),
      },
      rear: {
        topBlend: 0.64,
        bottomBlend: rear.type === "thruster" ? 0.82 : 0.7,
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

function addFigure(container, label, build) {
  if (!container) {
    return;
  }
  const figure = document.createElement("figure");
  const svg = createSvg();
  build(svg);
  const caption = document.createElement("figcaption");
  caption.textContent = label;
  figure.append(svg, caption);
  container.appendChild(figure);
}

function drawPath(svg, d, options = {}) {
  if (!d) {
    return null;
  }
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      path.setAttribute(key, value);
    }
  });
  svg.appendChild(path);
  return path;
}

function drawPolygon(svg, points, options = {}) {
  if (!points?.length) {
    return null;
  }
  const polygon = document.createElementNS(SVG_NS, "polygon");
  polygon.setAttribute("points", pointsToString(points));
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      polygon.setAttribute(key, value);
    }
  });
  svg.appendChild(polygon);
  return polygon;
}

function drawPolyline(svg, points, options = {}) {
  if (!points?.length) {
    return null;
  }
  const polyline = document.createElementNS(SVG_NS, "polyline");
  polyline.setAttribute("points", pointsToString(points));
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      polyline.setAttribute(key, value);
    }
  });
  svg.appendChild(polyline);
  return polyline;
}

function drawSegmentTop(svg, body, highlight) {
  const axis = buildBodyAxis(body);
  const segments = getTopSegmentPaths(body) ?? {};
  const hull = getTopHullPath(body);

  drawPath(svg, hull, {
    fill: shadeColor(palette.secondary, -0.35),
    "fill-opacity": "0.35",
    stroke: palette.trim,
    "stroke-opacity": "0.3",
    "stroke-width": "1.4",
  });

  ["rear", "mid", "front"].forEach((key) => {
    const pathData = segments[key];
    if (!pathData) {
      return;
    }
    const isHighlight = key === highlight;
    drawPath(svg, pathData, {
      fill: isHighlight ? palette.primary : shadeColor(palette.secondary, isHighlight ? 0 : -0.15),
      "fill-opacity": isHighlight ? "0.85" : "0.45",
      stroke: isHighlight ? palette.accent : shadeColor(palette.trim, 0.25),
      "stroke-width": isHighlight ? "2.4" : "1.6",
      "stroke-linejoin": "round",
    });
  });
}

function drawSegmentSide(svg, body, highlight) {
  const axis = buildBodyAxis(body);
  const { profile } = prepareProfile(body, axis);
  const sideHull = buildSideHullGeometry(profile);
  const segments = sideHull.segmentPaths ?? {};

  drawPath(svg, sideHull.hullPath, {
    fill: shadeColor(palette.secondary, -0.35),
    "fill-opacity": "0.35",
    stroke: palette.trim,
    "stroke-opacity": "0.3",
    "stroke-width": "1.4",
  });

  ["rear", "mid", "front"].forEach((key) => {
    const pathData = segments[key];
    if (!pathData) {
      return;
    }
    const isHighlight = key === highlight;
    drawPath(svg, pathData, {
      fill: isHighlight ? palette.primary : shadeColor(palette.secondary, -0.1),
      "fill-opacity": isHighlight ? "0.85" : "0.5",
      stroke: isHighlight ? palette.accent : shadeColor(palette.trim, 0.2),
      "stroke-width": isHighlight ? "2.2" : "1.4",
      "stroke-linejoin": "round",
    });
  });
}

function drawWingTop(svg, config, axis, options = {}) {
  const wingTop =
    config.wings.style === "delta"
      ? getDeltaWingTop(config, axis)
      : getWingTop(config, axis);
  if (!wingTop) {
    return;
  }

  const fillOpacity = options.fillOpacity ?? 0.85;
  const strokeOpacity = options.strokeOpacity ?? 0.85;

  drawPolygon(svg, wingTop.left, {
    fill: palette.secondary,
    "fill-opacity": fillOpacity,
    stroke: palette.trim,
    "stroke-opacity": strokeOpacity,
    "stroke-width": "1.6",
    "stroke-linejoin": "round",
  });
  drawPolygon(svg, wingTop.right, {
    fill: palette.secondary,
    "fill-opacity": fillOpacity,
    stroke: palette.trim,
    "stroke-opacity": strokeOpacity,
    "stroke-width": "1.6",
    "stroke-linejoin": "round",
  });

  if (config.wings.tipAccent) {
    drawPolyline(svg, buildWingAccent(wingTop.left), {
      stroke: palette.accent,
      "stroke-width": "2.2",
      fill: "none",
      "stroke-opacity": strokeOpacity,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    });
    drawPolyline(svg, buildWingAccent(wingTop.right), {
      stroke: palette.accent,
      "stroke-width": "2.2",
      fill: "none",
      "stroke-opacity": strokeOpacity,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    });
  }
}

function drawWingSide(svg, config, axis, options = {}) {
  const { profile } = prepareProfile(config.body, axis);
  const planform = computeWingPlanform(config.body, config.wings);
  if (!planform.enabled) {
    return;
  }

  const sidePoints =
    config.wings.style === "delta"
      ? getDeltaWingSide(config, planform, profile, axis)
      : getWingSidePoints(planform, profile, axis);
  if (!sidePoints) {
    return;
  }

  drawPolygon(svg, sidePoints, {
    fill: palette.secondary,
    "fill-opacity": options.fillOpacity ?? 0.8,
    stroke: palette.trim,
    "stroke-opacity": options.strokeOpacity ?? 0.8,
    "stroke-width": "1.6",
    "stroke-linejoin": "round",
  });
}

function drawArmamentTop(svg, config) {
  const axis = buildBodyAxis(config.body);
  const hull = getTopHullPath(config.body);
  drawPath(svg, hull, {
    fill: shadeColor(palette.secondary, -0.4),
    "fill-opacity": "0.28",
    stroke: palette.trim,
    "stroke-opacity": "0.35",
    "stroke-width": "1.4",
  });

  if (config.wings?.enabled) {
    drawWingTop(svg, config, axis, { fillOpacity: 0.25, strokeOpacity: 0.35 });
  }

  if (config.armament.mount === "nose") {
    drawNoseArmamentTop(svg, config.armament, axis);
  } else if (config.armament.mount === "wing") {
    drawWingArmamentTop(svg, config, axis);
  }
}

function drawArmamentSide(svg, config) {
  const axis = buildBodyAxis(config.body);
  const { profile } = prepareProfile(config.body, axis);
  const sideHull = buildSideHullGeometry(profile);
  drawPath(svg, sideHull.hullPath, {
    fill: shadeColor(palette.secondary, -0.4),
    "fill-opacity": "0.28",
    stroke: palette.trim,
    "stroke-opacity": "0.35",
    "stroke-width": "1.4",
  });

  if (config.wings?.enabled) {
    drawWingSide(svg, config, axis, { fillOpacity: 0.25, strokeOpacity: 0.35 });
  }

  if (config.armament.mount === "nose") {
    drawNoseArmamentSide(svg, config.armament, axis, profile);
  } else if (config.armament.mount === "wing") {
    drawWingArmamentSide(svg, config, axis, profile);
  }
}

function drawNoseArmamentTop(svg, armament, axis) {
  const noseY = axis.top.nose;
  const baseY = noseY - armament.length;
  const spacing = armament.spacing ?? 0;
  const barrels = armament.barrels ?? 1;
  const housingWidth = armament.housingWidth ?? 12;
  const housingHeight = armament.housingHeight ?? Math.max(10, armament.length * 0.35);

  for (let i = 0; i < barrels; i += 1) {
    const offset = i - (barrels - 1) / 2;
    const centerX = 100 + offset * spacing;

    const housing = document.createElementNS(SVG_NS, "rect");
    housing.setAttribute("x", (centerX - housingWidth / 2).toString());
    housing.setAttribute("y", (noseY - housingHeight).toString());
    housing.setAttribute("width", housingWidth.toString());
    housing.setAttribute("height", housingHeight.toString());
    housing.setAttribute("rx", (housingWidth * 0.35).toString());
    housing.setAttribute("fill", shadeColor(palette.secondary, -0.1));
    housing.setAttribute("stroke", palette.trim);
    housing.setAttribute("stroke-width", "1.2");
    svg.appendChild(housing);

    const barrel = document.createElementNS(SVG_NS, "rect");
    barrel.setAttribute("x", (centerX - housingWidth * 0.3).toString());
    barrel.setAttribute("y", baseY.toString());
    barrel.setAttribute("width", (housingWidth * 0.6).toString());
    barrel.setAttribute("height", armament.length.toString());
    barrel.setAttribute("rx", (housingWidth * 0.28).toString());
    barrel.setAttribute("fill", shadeColor(palette.accent, -0.2));
    barrel.setAttribute("stroke", palette.trim);
    barrel.setAttribute("stroke-width", "1");
    svg.appendChild(barrel);

    const muzzle = document.createElementNS(SVG_NS, "circle");
    muzzle.setAttribute("cx", centerX.toString());
    muzzle.setAttribute("cy", baseY.toString());
    muzzle.setAttribute("r", (housingWidth * 0.32).toString());
    muzzle.setAttribute("fill", mixColor(palette.accent, palette.secondary, 0.5));
    muzzle.setAttribute("stroke", palette.trim);
    muzzle.setAttribute("stroke-width", "0.8");
    svg.appendChild(muzzle);
  }
}

function drawWingArmamentTop(svg, config, axis) {
  const { armament, wings, body } = config;
  const planform = computeWingPlanform(body, wings);
  if (!planform.enabled || !armament.hardpoints?.length) {
    return;
  }
  const wingMountPercent = axis.length > 0 ? clamp(0.5 + (wings.offsetY ?? 0) / axis.length, 0, 1) : 0.5;
  const baseWingY = axis.percentToTopY(wingMountPercent);
  const ordnanceColor = shadeColor(palette.secondary, -0.1);
  const accentColor = palette.trim;
  const tipColor = mixColor(palette.accent, palette.secondary, 0.4);

  armament.hardpoints.forEach((hardpoint) => {
    const chordRatio = clamp(hardpoint.chordRatio ?? 0.5, 0.1, 0.9);
    const anchorPercent = clamp(planform.positionPercent + planform.lengthPercent * chordRatio, 0, 1);
    const anchorY = axis.percentToTopY(anchorPercent);
    const payloadLength = hardpoint.payloadLength ?? Math.max(18, planform.length * 0.3);
    const payloadRadius = hardpoint.payloadRadius ?? Math.max(5, planform.thickness * 0.35);
    const pylonLength = hardpoint.pylonLength ?? Math.max(planform.thickness * 0.6, 8);
    const payloadOffsetY = baseWingY + planform.thickness * 0.25 + pylonLength + payloadRadius;

    [-1, 1].forEach((direction) => {
      const lateralBase = 100 + direction * (body.halfWidth + Math.max(planform.span * 0.45, 10));
      const pylonTopY = anchorY + planform.thickness * 0.1;

      drawPath(svg, `M ${lateralBase - 1.6} ${pylonTopY} h 3.2 v ${pylonLength} h -3.2 Z`, {
        fill: shadeColor(palette.secondary, -0.25),
        stroke: accentColor,
        "stroke-width": "0.9",
      });

      if (armament.type === "missile") {
        drawPath(
          svg,
          `M ${lateralBase - payloadRadius} ${payloadOffsetY - payloadLength} h ${payloadRadius * 2} v ${payloadLength} h ${-payloadRadius * 2} Z`,
          {
            fill: ordnanceColor,
            stroke: accentColor,
            "stroke-width": "0.9",
          },
        );
        drawPolygon(svg, [
          [lateralBase - payloadRadius, payloadOffsetY - payloadLength],
          [lateralBase, payloadOffsetY - payloadLength - Math.max(payloadLength * 0.25, payloadRadius * 0.9)],
          [lateralBase + payloadRadius, payloadOffsetY - payloadLength],
        ], {
          fill: tipColor,
          stroke: accentColor,
          "stroke-width": "0.9",
        });
      } else {
        const ellipse = document.createElementNS(SVG_NS, "ellipse");
        ellipse.setAttribute("cx", lateralBase.toString());
        ellipse.setAttribute("cy", payloadOffsetY.toString());
        ellipse.setAttribute("rx", payloadRadius.toString());
        ellipse.setAttribute("ry", Math.max(payloadRadius * 0.75, payloadLength * 0.35).toString());
        ellipse.setAttribute("fill", ordnanceColor);
        ellipse.setAttribute("stroke", accentColor);
        ellipse.setAttribute("stroke-width", "0.9");
        svg.appendChild(ellipse);

        const noseCap = document.createElementNS(SVG_NS, "circle");
        noseCap.setAttribute("cx", lateralBase.toString());
        noseCap.setAttribute("cy", (payloadOffsetY - Math.max(payloadRadius * 0.6, payloadLength * 0.25)).toString());
        noseCap.setAttribute("r", (payloadRadius * 0.55).toString());
        noseCap.setAttribute("fill", tipColor);
        noseCap.setAttribute("stroke", accentColor);
        noseCap.setAttribute("stroke-width", "0.8");
        svg.appendChild(noseCap);
      }
    });
  });
}

function drawNoseArmamentSide(svg, armament, axis, profile) {
  const noseX = axis.percentToSideX(armament.mountPercent ?? 0);
  const baseX = noseX - armament.length;
  const centerY = 100 + (profile.offsetY ?? 0) + (armament.offsetY ?? 0);
  const spacing = armament.spacing ?? 0;
  const housingHeight = armament.housingHeight ?? Math.max(12, armament.length * 0.35);

  for (let i = 0; i < (armament.barrels ?? 1); i += 1) {
    const offset = i - ((armament.barrels ?? 1) - 1) / 2;
    const y = centerY + offset * spacing;

    drawPath(svg, `M ${noseX - housingHeight * 0.6} ${y - housingHeight / 2} h ${housingHeight * 0.6} v ${housingHeight} h ${-housingHeight * 0.6} Z`, {
      fill: shadeColor(palette.secondary, -0.15),
      stroke: palette.trim,
      "stroke-width": "1",
    });

    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", baseX.toString());
    line.setAttribute("y1", y.toString());
    line.setAttribute("x2", (noseX + 2).toString());
    line.setAttribute("y2", (y - housingHeight * 0.1).toString());
    line.setAttribute("stroke", palette.trim);
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);

    const muzzle = document.createElementNS(SVG_NS, "circle");
    muzzle.setAttribute("cx", baseX.toString());
    muzzle.setAttribute("cy", y.toString());
    muzzle.setAttribute("r", (housingHeight * 0.25).toString());
    muzzle.setAttribute("fill", mixColor(palette.accent, palette.secondary, 0.5));
    svg.appendChild(muzzle);
  }
}

function drawWingArmamentSide(svg, config, axis, profile) {
  const { armament, wings, body } = config;
  const planform = computeWingPlanform(body, wings);
  if (!planform.enabled || !armament.hardpoints?.length) {
    return;
  }
  const centerY = 100 + (profile.offsetY ?? 0);
  const wingBaseY = centerY + (wings.mountHeight ?? 0) + planform.thickness;
  const ordnanceColor = shadeColor(palette.secondary, -0.1);
  const accentColor = palette.trim;
  const tipColor = mixColor(palette.accent, palette.secondary, 0.4);

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

    drawPath(svg, `M ${anchorX - 2} ${pylonTop} h 4 v ${pylonLength + 2} h -4 Z`, {
      fill: shadeColor(palette.secondary, -0.25),
      stroke: accentColor,
      "stroke-width": "1",
      "stroke-linejoin": "round",
    });

    const bodyRect = document.createElementNS(SVG_NS, "rect");
    bodyRect.setAttribute("x", bodyX.toString());
    bodyRect.setAttribute("y", (payloadCenterY - bodyHeight / 2).toString());
    bodyRect.setAttribute("width", payloadLength.toString());
    bodyRect.setAttribute("height", bodyHeight.toString());
    bodyRect.setAttribute("rx", (armament.type === "bomb" ? payloadRadius : payloadRadius * 0.5).toString());
    bodyRect.setAttribute("fill", ordnanceColor);
    bodyRect.setAttribute("stroke", accentColor);
    bodyRect.setAttribute("stroke-width", "1.1");
    svg.appendChild(bodyRect);

    if (armament.type === "missile") {
      drawPolygon(svg, [
        [bodyX, payloadCenterY - bodyHeight / 2],
        [bodyX - payloadLength * 0.22, payloadCenterY],
        [bodyX, payloadCenterY + bodyHeight / 2],
      ], {
        fill: tipColor,
        stroke: accentColor,
        "stroke-width": "1",
      });
    } else {
      const band = document.createElementNS(SVG_NS, "rect");
      band.setAttribute("x", (bodyX + payloadLength * 0.4).toString());
      band.setAttribute("y", (payloadCenterY - bodyHeight / 2).toString());
      band.setAttribute("width", (payloadLength * 0.18).toString());
      band.setAttribute("height", bodyHeight.toString());
      band.setAttribute("fill", tipColor);
      band.setAttribute("opacity", "0.65");
      svg.appendChild(band);
    }
  });
}

function renderSegmentVariants() {
  Object.values(segmentContainers).forEach(({ top, side }) => {
    if (top) top.innerHTML = "";
    if (side) side.innerHTML = "";
  });

  FRONT_SEGMENT_VARIANTS.forEach((variant) => {
    const body = createBodyWithSegments({ frontVariant: variant });
    addFigure(segmentContainers.front.top, `${variant.type} – Top`, (svg) => drawSegmentTop(svg, body, "front"));
    addFigure(segmentContainers.front.side, `${variant.type} – Side`, (svg) => drawSegmentSide(svg, body, "front"));
  });

  MID_SEGMENT_VARIANTS.forEach((variant) => {
    const body = createBodyWithSegments({ midVariant: variant });
    addFigure(segmentContainers.mid.top, `${variant.type} – Top`, (svg) => drawSegmentTop(svg, body, "mid"));
    addFigure(segmentContainers.mid.side, `${variant.type} – Side`, (svg) => drawSegmentSide(svg, body, "mid"));
  });

  REAR_SEGMENT_VARIANTS.forEach((variant) => {
    const body = createBodyWithSegments({ rearVariant: variant });
    addFigure(segmentContainers.rear.top, `${variant.type} – Top`, (svg) => drawSegmentTop(svg, body, "rear"));
    addFigure(segmentContainers.rear.side, `${variant.type} – Side`, (svg) => drawSegmentSide(svg, body, "rear"));
  });
}

function renderWingVariants() {
  if (wingContainers.top) {
    wingContainers.top.innerHTML = "";
  }
  if (wingContainers.side) {
    wingContainers.side.innerHTML = "";
  }

  WING_STYLE_PRESETS.forEach((preset) => {
    const body = createBodyWithSegments();
    const wings = { enabled: true, mount: "mid", ...clone(preset.wings), style: preset.style };
    const config = { body, wings };
    const axis = buildBodyAxis(body);
    addFigure(wingContainers.top, `${preset.label} – Top`, (svg) => drawWingTop(svg, config, axis));
    addFigure(wingContainers.side, `${preset.label} – Side`, (svg) => drawWingSide(svg, config, axis));
  });
}

function renderArmamentVariants() {
  if (armamentContainers.top) {
    armamentContainers.top.innerHTML = "";
  }
  if (armamentContainers.side) {
    armamentContainers.side.innerHTML = "";
  }

  ARMAMENT_PRESETS.forEach((preset) => {
    const body = createBodyWithSegments();
    const wings = preset.wings
      ? { enabled: true, mount: "mid", ...clone(preset.wings) }
      : { enabled: false, style: "none" };
    const armament = clone(preset.armament);
    const config = { body, wings, armament };
    addFigure(armamentContainers.top, `${preset.label} – Top`, (svg) => drawArmamentTop(svg, config));
    addFigure(armamentContainers.side, `${preset.label} – Side`, (svg) => drawArmamentSide(svg, config));
  });
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

renderSegmentVariants();
renderWingVariants();
renderArmamentVariants();
