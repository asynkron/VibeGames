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

const SVG_NS = "http://www.w3.org/2000/svg";

const palette = {
  primary: "#42547a",
  secondary: "#7a94c4",
  accent: "#f4f6ff",
  trim: "#1f283f",
  glow: "#ffda7a",
};

const sampleConfig = {
  id: "debug-needle",
  palette,
  body: {
    length: 120,
    halfWidth: 28,
    noseWidthFactor: 0.34,
    tailWidthFactor: 0.58,
    midInset: 16,
    noseCurve: 24,
    tailCurve: 18,
    plating: true,
    segments: {
      front: {
        type: "needle",
        length: 36,
        tipWidthFactor: 0.16,
        shoulderWidthFactor: 1.1,
        transitionFactor: 0.84,
        curve: 26,
      },
      mid: {
        length: 44,
        waistWidthFactor: 0.92,
        bellyWidthFactor: 1.08,
        trailingWidthFactor: 0.96,
        waistPosition: 0.36,
        bellyPosition: 0.72,
      },
      rear: {
        length: 40,
        baseWidthFactor: 0.94,
        exhaustWidthFactor: 0.62,
        tailWidthFactor: 0.52,
        exhaustPosition: 0.68,
        curve: 22,
      },
    },
  },
  wings: {
    enabled: true,
    style: "delta",
    span: 44,
    forward: 18,
    sweep: 28,
    thickness: 14,
    dihedral: 9,
    offsetY: 0,
    mountHeight: 0,
    tipAccent: true,
  },
};

function createProfile(body, axis) {
  const profile = {
    length: body.length,
    height: 48,
    noseLength: body.segments.front.length,
    tailLength: body.segments.rear.length,
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

function createSvg(viewBox = "0 0 200 200") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  return svg;
}

function addPathFigure(container, pathData, label, options = {}) {
  const { fill = palette.primary, stroke = palette.accent } = options;
  const figure = document.createElement("figure");
  const svg = createSvg();
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", options.strokeWidth ?? 2.2);
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  const caption = document.createElement("figcaption");
  caption.textContent = label;
  figure.append(svg, caption);
  container.appendChild(figure);
}

function addPolygonFigure(container, pointSets, label, options = {}) {
  const { fill = palette.secondary, stroke = palette.trim } = options;
  const figure = document.createElement("figure");
  const svg = createSvg();
  pointSets.forEach((points) => {
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute("points", pointsToString(points));
    polygon.setAttribute("fill", fill);
    polygon.setAttribute("stroke", stroke);
    polygon.setAttribute("stroke-width", options.strokeWidth ?? 1.8);
    polygon.setAttribute("stroke-linejoin", "round");
    svg.appendChild(polygon);
  });
  const caption = document.createElement("figcaption");
  caption.textContent = label;
  figure.append(svg, caption);
  container.appendChild(figure);
}

function addPolylineFigure(container, points, label, options = {}) {
  const { stroke = palette.accent } = options;
  const figure = document.createElement("figure");
  const svg = createSvg();
  const polyline = document.createElementNS(SVG_NS, "polyline");
  polyline.setAttribute("points", pointsToString(points));
  polyline.setAttribute("fill", options.fill ?? "none");
  polyline.setAttribute("stroke", stroke);
  polyline.setAttribute("stroke-width", options.strokeWidth ?? 2);
  polyline.setAttribute("stroke-linejoin", "round");
  polyline.setAttribute("stroke-linecap", "round");
  svg.appendChild(polyline);
  const caption = document.createElement("figcaption");
  caption.textContent = label;
  figure.append(svg, caption);
  container.appendChild(figure);
}

function renderNeedleTopPreview() {
  const container = document.getElementById("needle-top-preview");
  container.innerHTML = "";
  const { body } = sampleConfig;
  const segments = getTopSegmentPaths(body) ?? {};
  const figures = [];

  const needleFront = getNeedleTop(sampleConfig, { segments }) ?? segments.front;
  if (needleFront) {
    figures.push({
      path: needleFront,
      label: "Needle Front Segment",
      options: { fill: palette.primary, stroke: palette.accent, strokeWidth: 2.4 },
    });
  }
  if (segments.mid) {
    figures.push({
      path: segments.mid,
      label: "Mid Segment",
      options: { fill: palette.primary, stroke: palette.accent, strokeWidth: 2.2 },
    });
  }
  if (segments.rear) {
    figures.push({
      path: segments.rear,
      label: "Rear Segment",
      options: { fill: palette.primary, stroke: palette.accent, strokeWidth: 2.2 },
    });
  }

  const plating = buildPlatingPath(body);
  if (plating) {
    figures.push({
      path: plating,
      label: "Top Plating Lines",
      options: { fill: "none", stroke: palette.accent, strokeWidth: 1.2 },
    });
  }

  const hull = getTopHullPath(body);
  if (hull) {
    figures.push({
      path: hull,
      label: "Full Hull Outline",
      options: { fill: palette.primary, stroke: palette.accent, strokeWidth: 2.4 },
    });
  }

  figures.forEach(({ path, label, options }) => {
    addPathFigure(container, path, `Top: ${label}`, options);
  });
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

function renderNeedleSidePreview() {
  const container = document.getElementById("needle-side-preview");
  container.innerHTML = "";
  const { body } = sampleConfig;
  const axis = buildBodyAxis(body);
  const { profile } = prepareProfile(body, axis);
  const sideHull = buildSideHullGeometry(profile);
  const segments = sideHull.segmentPaths ?? {};

  const figures = [];
  const needleFront = getNeedleSide(sampleConfig, profile, { segmentPaths: sideHull.segmentPaths });
  if (needleFront) {
    figures.push({
      path: needleFront,
      label: "Needle Front Segment",
      options: { fill: palette.primary, stroke: palette.accent, strokeWidth: 2.2 },
    });
  }
  if (segments.mid) {
    figures.push({
      path: segments.mid,
      label: "Mid Segment",
      options: { fill: palette.primary, stroke: palette.accent, strokeWidth: 2 },
    });
  }
  if (segments.rear) {
    figures.push({
      path: segments.rear,
      label: "Rear Segment",
      options: { fill: palette.primary, stroke: palette.accent, strokeWidth: 2 },
    });
  }

  const intake = buildSideIntakePath(profile);
  if (intake) {
    figures.push({
      path: intake,
      label: "Intake Cutout",
      options: { fill: palette.trim, stroke: palette.accent, strokeWidth: 1.8 },
    });
  }

  if (sideHull.hullPath) {
    figures.push({
      path: sideHull.hullPath,
      label: "Full Hull Outline",
      options: { fill: palette.primary, stroke: palette.accent, strokeWidth: 2.2 },
    });
  }

  figures.forEach(({ path, label, options }) => {
    addPathFigure(container, path, `Side: ${label}`, options);
  });
}

function renderWingTopPreview() {
  const container = document.getElementById("wing-top-preview");
  container.innerHTML = "";
  const axis = buildBodyAxis(sampleConfig.body);
  const delta = getDeltaWingTop(sampleConfig, axis);
  const wingTop = delta ?? getWingTop(sampleConfig, axis);
  if (!wingTop) {
    return;
  }

  addPolygonFigure(container, [wingTop.left], "Top: Left Wing", {
    fill: palette.secondary,
    stroke: palette.trim,
  });
  addPolygonFigure(container, [wingTop.right], "Top: Right Wing", {
    fill: palette.secondary,
    stroke: palette.trim,
  });
  addPolygonFigure(container, [wingTop.left, wingTop.right], "Top: Combined Wings", {
    fill: palette.secondary,
    stroke: palette.trim,
  });

  if (sampleConfig.wings.tipAccent) {
    const accent = buildWingAccent(wingTop.left);
    addPolylineFigure(container, accent, "Top: Wing Accent", {
      stroke: palette.accent,
      strokeWidth: 2.2,
    });
  }
}

function renderWingSidePreview() {
  const container = document.getElementById("wing-side-preview");
  container.innerHTML = "";
  const axis = buildBodyAxis(sampleConfig.body);
  const { profile } = prepareProfile(sampleConfig.body, axis);
  const wingProfile = computeWingPlanform(sampleConfig.body, sampleConfig.wings);
  if (!wingProfile.enabled) {
    return;
  }

  const sidePoints = sampleConfig.wings.style === "delta"
    ? getDeltaWingSide(sampleConfig, wingProfile, profile, axis)
    : getWingSidePoints(wingProfile, profile, axis);
  if (!sidePoints) {
    return;
  }

  addPolygonFigure(container, [sidePoints], "Side: Wing Profile", {
    fill: palette.secondary,
    stroke: palette.trim,
  });

  const accent = [sidePoints[0], sidePoints[1], sidePoints[2]];
  addPolylineFigure(container, accent, "Side: Leading Edge", {
    stroke: palette.accent,
    strokeWidth: 2,
  });
}

renderNeedleTopPreview();
renderNeedleSidePreview();
renderWingTopPreview();
renderWingSidePreview();
