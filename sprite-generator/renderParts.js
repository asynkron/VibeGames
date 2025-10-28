import { clamp, lerp } from "./math.js";

export function buildBodyAxis(body) {
  const length = body?.length ?? 0;
  const startPercent = body?.startPercent ?? 0;
  const endPercent = body?.endPercent ?? 1;
  const centerPercent = (startPercent + endPercent) / 2;
  const centerOffset = (centerPercent - 0.5) * length;
  const noseTop = 100 - length / 2 + centerOffset;
  const noseSide = 100 - length / 2 + centerOffset;
  const tailTop = noseTop + length;
  const tailSide = noseSide + length;
  const percentToTopY = (percent) => noseTop + length * percent;
  const percentToSideX = (percent) => noseSide + length * percent;
  const percentFromTopY = (y) => (length > 0 ? clamp((y - noseTop) / length, 0, 1) : 0);
  const percentFromSideX = (x) => (length > 0 ? clamp((x - noseSide) / length, 0, 1) : 0);
  return {
    length,
    top: { nose: noseTop, tail: tailTop },
    side: { nose: noseSide, tail: tailSide },
    percentToTopY,
    percentToSideX,
    percentFromTopY,
    percentFromSideX,
  };
}

function buildCurveCommand(prev, next, tension, direction, format) {
  const controlX = format(100 + direction * ((prev.width + next.width) / 2));
  const controlY = format(prev.y + (next.y - prev.y) * tension);
  const targetX = format(100 + direction * next.width);
  const targetY = format(next.y);
  return `Q ${controlX} ${controlY} ${targetX} ${targetY}`;
}

function buildSegmentOutline(nodes, options = {}) {
  const { startCap, endCap } = options;
  const format = options.format ?? ((value) => Number(value.toFixed(2)));
  const forwardTensions = options.forwardTensions ?? new Array(nodes.length - 1).fill(0.6);
  const reverseTensions = options.reverseTensions ?? [...forwardTensions].reverse();

  const commands = [];
  const start = nodes[0];
  commands.push(`M ${format(100 - start.width)} ${format(start.y)}`);

  if (startCap && startCap.type === "nose") {
    commands.push(`Q 100 ${format(start.y - startCap.curve)} ${format(100 + start.width)} ${format(start.y)}`);
  } else {
    commands.push(`L ${format(100 + start.width)} ${format(start.y)}`);
  }

  let prev = start;
  for (let i = 1; i < nodes.length; i += 1) {
    const node = nodes[i];
    const tension = forwardTensions[i - 1] ?? 0.6;
    commands.push(buildCurveCommand(prev, node, tension, 1, format));
    prev = node;
  }

  if (endCap && endCap.type === "tail") {
    commands.push(`Q 100 ${format(prev.y + endCap.curve)} ${format(100 - prev.width)} ${format(prev.y)}`);
  } else {
    commands.push(`L ${format(100 - prev.width)} ${format(prev.y)}`);
  }

  prev = nodes[nodes.length - 1];
  for (let i = nodes.length - 2, t = 0; i >= 0; i -= 1, t += 1) {
    const node = nodes[i];
    const tension = reverseTensions[t] ?? 0.6;
    commands.push(buildCurveCommand(prev, node, tension, -1, format));
    prev = node;
  }

  commands.push("Z");
  return commands.join(" ");
}

export function computeSegmentGeometry(body, axis = buildBodyAxis(body)) {
  const { front, mid, rear } = body.segments;
  const noseY = axis.top.nose;
  const tailY = axis.top.tail;
  const frontEndY = noseY + front.length;
  const midEndY = frontEndY + mid.length;
  const rearStartY = midEndY;

  const noseWidth = body.halfWidth * front.tipWidthFactor;
  const shoulderWidth = body.halfWidth * front.shoulderWidthFactor;
  const transitionWidth = shoulderWidth * (front.transitionFactor ?? 0.88);
  const waistWidth = body.halfWidth * mid.waistWidthFactor;
  const bellyWidth = body.halfWidth * mid.bellyWidthFactor;
  const trailingMidWidth = body.halfWidth * (mid.trailingWidthFactor ?? mid.bellyWidthFactor);
  const baseWidth = body.halfWidth * rear.baseWidthFactor;
  const exhaustWidth = body.halfWidth * rear.exhaustWidthFactor;
  const tailWidth = body.halfWidth * rear.tailWidthFactor;

  const waistBias = clamp(mid.waistPosition ?? 0.35, 0.18, 0.55);
  const bellyBias = clamp(mid.bellyPosition ?? 0.72, waistBias + 0.12, 0.92);
  const exhaustBias = clamp(rear.exhaustPosition ?? 0.65, 0.35, 0.88);

  const waistY = frontEndY + mid.length * waistBias;
  const bellyTarget = frontEndY + mid.length * bellyBias;
  const bellyY = Math.min(midEndY - 2, Math.max(waistY + 6, bellyTarget));
  const exhaustY = rearStartY + rear.length * exhaustBias;

  const format = (value) => Number(value.toFixed(2));

  return {
    nose: { width: noseWidth, y: noseY },
    nodes: [
      { width: transitionWidth, y: noseY + front.length * 0.45 },
      { width: shoulderWidth, y: frontEndY },
      { width: waistWidth, y: waistY },
      { width: bellyWidth, y: bellyY },
      { width: trailingMidWidth, y: midEndY },
      { width: baseWidth, y: rearStartY + rear.length * 0.3 },
      { width: exhaustWidth, y: exhaustY },
    ],
    tail: { width: tailWidth, y: tailY },
    frontCurve: front.curve,
    tailCurve: rear.curve,
    format,
  };
}

function buildNeedleFrontSegmentPath(geometry) {
  const { nose, nodes, frontCurve, format } = geometry;
  const shoulderNode = nodes[1] ?? nodes[0] ?? {
    width: nose.width * 1.2,
    y: nose.y + Math.max(frontCurve, 8),
  };
  const apexY = format(nose.y - Math.max(frontCurve, 6));
  const baseY = format(shoulderNode.y);
  const baseRightX = format(100 + shoulderNode.width);
  const baseLeftX = format(100 - shoulderNode.width);

  return [`M 100 ${apexY}`, `L ${baseRightX} ${baseY}`, `L ${baseLeftX} ${baseY}`, "Z"].join(" ");
}

function buildNeedleHullPath(geometry) {
  const { nose, nodes, tail, frontCurve, tailCurve, format } = geometry;
  const noseCurve = Math.max(frontCurve, 6);
  const apexY = format(nose.y - noseCurve);
  const baseNode = nodes[1] ?? nodes[0] ?? nose;
  const baseIndex = nodes[1] ? 1 : nodes[0] ? 0 : -1;
  const baseY = format(baseNode.y);
  const baseRightX = format(100 + baseNode.width);
  const baseLeftX = format(100 - baseNode.width);

  const commands = [`M ${format(100)} ${apexY}`, `L ${baseRightX} ${baseY}`];

  let prev = baseNode;
  for (let i = baseIndex + 1; i < nodes.length; i += 1) {
    const node = nodes[i];
    commands.push(buildCurveCommand(prev, node, 0.6, 1, format));
    prev = node;
  }

  commands.push(buildCurveCommand(prev, tail, 0.8, 1, format));
  commands.push(`Q 100 ${format(tail.y + tailCurve)} ${format(100 - tail.width)} ${format(tail.y)}`);

  prev = tail;
  for (let i = nodes.length - 1; i > baseIndex; i -= 1) {
    const node = nodes[i];
    commands.push(buildCurveCommand(prev, node, 0.6, -1, format));
    prev = node;
  }

  commands.push(`L ${baseLeftX} ${baseY}`);
  commands.push(`L ${format(100)} ${apexY}`);
  commands.push("Z");

  return commands.join(" ");
}

export function getTopHullPath(body) {
  const axis = buildBodyAxis(body);

  if (!body.segments) {
    const centerY = axis.percentToTopY(0.5);
    const noseY = axis.top.nose;
    const tailY = axis.top.tail;
    const waistLeft = 100 - body.halfWidth;
    const waistRight = 100 + body.halfWidth;
    const noseWidth = body.halfWidth * body.noseWidthFactor;
    const tailWidth = body.halfWidth * body.tailWidthFactor;
    const midUpper = centerY - body.midInset;
    const midLower = centerY + body.midInset;

    return [
      `M ${100 - noseWidth} ${noseY}`,
      `Q 100 ${noseY - body.noseCurve} ${100 + noseWidth} ${noseY}`,
      `L ${waistRight} ${midUpper}`,
      `Q ${100 + tailWidth} ${midLower} ${100 + tailWidth * 0.8} ${tailY}`,
      `Q 100 ${tailY + body.tailCurve} ${100 - tailWidth * 0.8} ${tailY}`,
      `Q ${100 - tailWidth} ${midLower} ${waistLeft} ${midUpper}`,
      `L ${100 - noseWidth} ${noseY}`,
      "Z",
    ].join(" ");
  }

  const geometry = computeSegmentGeometry(body, axis);
  const { nose, nodes, tail, frontCurve, tailCurve, format } = geometry;
  const commands = [];
  const frontType = body.segments?.front?.type ?? null;
  const needleAsTriangle = frontType === "needle";

  if (needleAsTriangle) {
    return buildNeedleHullPath(geometry);
  }

  commands.push(`M ${format(100 - nose.width)} ${format(nose.y)}`);
  commands.push(`Q 100 ${format(nose.y - frontCurve)} ${format(100 + nose.width)} ${format(nose.y)}`);

  let prev = nose;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    commands.push(buildCurveCommand(prev, node, 0.6, 1, format));
    prev = node;
  }

  commands.push(buildCurveCommand(prev, tail, 0.8, 1, format));
  commands.push(`Q 100 ${format(tail.y + tailCurve)} ${format(100 - tail.width)} ${format(tail.y)}`);

  prev = tail;
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    commands.push(buildCurveCommand(prev, node, 0.6, -1, format));
    prev = node;
  }

  commands.push(buildCurveCommand(prev, nose, 0.6, -1, format));
  commands.push("Z");

  return commands.join(" ");
}

export function getTopSegmentPaths(body) {
  if (!body.segments) {
    return null;
  }

  const geometry = computeSegmentGeometry(body);
  const { nose, nodes, tail, frontCurve, tailCurve, format } = geometry;

  const frontNodes = [nose, nodes[0], nodes[1]];
  const midNodes = [nodes[1], nodes[2], nodes[3], nodes[4]];
  const rearNodes = [nodes[4], nodes[5], nodes[6], tail];

  const frontPath = body.segments?.front?.type === "needle"
    ? buildNeedleFrontSegmentPath(geometry)
    : buildSegmentOutline(frontNodes, {
      startCap: { type: "nose", curve: frontCurve },
      forwardTensions: [0.6, 0.6],
      format,
    });

  const midPath = buildSegmentOutline(midNodes, {
    forwardTensions: [0.6, 0.6, 0.6],
    format,
  });

  const rearPath = buildSegmentOutline(rearNodes, {
    forwardTensions: [0.6, 0.6, 0.8],
    reverseTensions: [0.6, 0.6, 0.6],
    endCap: { type: "tail", curve: tailCurve },
    format,
  });

  return { front: frontPath, mid: midPath, rear: rearPath };
}

export function getNeedleTop(config, options = {}) {
  const frontType = config?.body?.segments?.front?.type;
  if (frontType !== "needle") {
    return null;
  }
  if (options.segments?.front) {
    return options.segments.front;
  }
  const segments = getTopSegmentPaths(config.body);
  return segments?.front ?? null;
}

export function buildPlatingPath(body) {
  const axis = buildBodyAxis(body);
  const top = axis.top.nose + 18;
  const bottom = axis.top.tail - 18;
  const innerLeft = 100 - body.halfWidth * 0.6;
  const innerRight = 100 + body.halfWidth * 0.6;
  const segments = 4;
  const step = (bottom - top) / segments;
  const parts = [];
  for (let i = 0; i <= segments; i += 1) {
    const y = top + i * step;
    parts.push(`M ${innerLeft} ${y} L ${innerRight} ${y}`);
  }
  return parts.join(" ");
}

function buildWingPoints(wings, body, axis, isLeft) {
  const offset = wings.offsetY ?? 0;
  const attachPercent = axis.length > 0 ? clamp(0.5 + offset / axis.length, 0, 1) : 0.5;
  const attachY = axis.percentToTopY(attachPercent);
  const baseX = isLeft ? 100 - body.halfWidth : 100 + body.halfWidth;
  const direction = isLeft ? -1 : 1;
  const span = wings.span * direction;
  const forward = wings.forward;
  const sweep = wings.sweep;
  const dihedral = wings.dihedral;

  switch (wings.style) {
    case "delta":
      return [
        [baseX, attachY],
        [baseX + span, attachY - forward],
        [baseX + span * 0.7, attachY + sweep],
      ];
    case "forward":
      return [
        [baseX, attachY],
        [baseX + span * 0.6, attachY - forward],
        [baseX + span, attachY + sweep],
        [baseX + span * 0.25, attachY + sweep * 0.6],
      ];
    case "ladder":
      return [
        [baseX, attachY],
        [baseX + span * 0.4, attachY - forward - dihedral],
        [baseX + span * 0.8, attachY - forward + dihedral],
        [baseX + span, attachY + sweep],
        [baseX + span * 0.2, attachY + sweep * 0.8],
      ];
    case "split":
      return [
        [baseX, attachY - 6],
        [baseX + span * 0.45, attachY - forward],
        [baseX + span * 0.35, attachY + sweep * 0.2],
        [baseX + span * 0.8, attachY + sweep],
        [baseX + span * 0.15, attachY + sweep * 0.9],
      ];
    case "box":
      return [
        [baseX, attachY - wings.thickness],
        [baseX + span * 0.8, attachY - wings.thickness - forward],
        [baseX + span, attachY + sweep],
        [baseX + span * 0.2, attachY + sweep + wings.thickness],
      ];
    case "broad":
      return [
        [baseX, attachY - wings.thickness],
        [baseX + span, attachY - forward],
        [baseX + span, attachY + sweep],
        [baseX, attachY + wings.thickness],
      ];
    default:
      return [
        [baseX, attachY],
        [baseX + span, attachY - forward],
        [baseX + span * 0.6, attachY + sweep],
        [baseX + span * 0.2, attachY + sweep * 0.6],
      ];
  }
}

export function getWingTop(config, axis) {
  const { wings, body } = config;
  if (!wings || wings.enabled === false) {
    return null;
  }
  if (wings.style === "delta") {
    return getDeltaWingTop(config, axis);
  }
  return {
    left: buildWingPoints(wings, body, axis, true),
    right: buildWingPoints(wings, body, axis, false),
  };
}

export function getDeltaWingTop(config, axis) {
  const { wings, body } = config;
  if (!wings || wings.enabled === false || wings.style !== "delta") {
    return null;
  }
  return {
    left: buildWingPoints(wings, body, axis, true),
    right: buildWingPoints(wings, body, axis, false),
  };
}

export function buildWingAccent(points) {
  if (points.length < 3) {
    return points;
  }
  const tip = points[1];
  const trailing = points[points.length - 1];
  const base = points[0];
  return [base, tip, trailing];
}

export function computeWingPlanform(body, wings) {
  if (!wings?.enabled) {
    return {
      enabled: false,
      position: 0,
      length: 0,
      span: 0,
      thickness: 0,
      dihedral: 0,
      drop: 0,
      mountOffset: 0,
      mountHeight: 0,
      style: wings?.style ?? null,
    };
  }

  const halfLength = body.length / 2;
  const span = Math.max(0, wings.span ?? 0);
  const forward = Math.max(0, wings.forward ?? 0);
  const sweep = Math.max(0, wings.sweep ?? 0);
  const chord = forward + sweep;
  const length = Math.max(24, chord);
  const rootOffset = clamp(halfLength + (wings.offsetY ?? 0), 0, body.length);
  const leadingBuffer = Math.max(length * 0.12, span * 0.05);
  const trailingBuffer = Math.max(length * 0.25, span * 0.1);
  const position = clamp(rootOffset, leadingBuffer, body.length - trailingBuffer);
  const thickness = Math.max(10, (wings.thickness ?? 0) * 0.5, span * 0.45, chord * 0.3);
  const dihedral = Math.max(0, (wings.dihedral ?? 0) * 0.8);
  const drop = Math.max(6, sweep * 0.6, span * 0.25, chord * 0.22);
  const positionPercent = position / body.length;
  const lengthPercent = length / body.length;
  const mountHeight = wings.mountHeight ?? wings.verticalOffset ?? 0;

  return {
    enabled: true,
    position,
    length,
    positionPercent,
    lengthPercent,
    span,
    thickness,
    dihedral,
    drop,
    mountOffset: wings.offsetY ?? 0,
    mountHeight,
    style: wings.style ?? "swept",
  };
}

export function buildStripePath(body, details, axis) {
  const startPercent = clamp((details.stripeOffset ?? 0) / body.length, 0, 1);
  const endPercent = clamp(startPercent + 0.25, 0, 1);
  const noseY = axis.percentToTopY(startPercent);
  const tailY = axis.percentToTopY(endPercent);
  const left = 100 - body.halfWidth * 0.6;
  const right = 100 + body.halfWidth * 0.6;
  return [`M ${left} ${noseY}`, `L ${right} ${noseY + 6}`, `L ${right} ${tailY}`, `L ${left} ${tailY - 6}`].join(" ");
}

export function pointsToString(points) {
  return points.map((point) => point.join(" ")).join(" ");
}

function buildClosedPathFromSamples(topPoints, bottomPoints, format) {
  if (!topPoints.length || !bottomPoints.length) {
    return "";
  }

  const commands = [`M ${format(topPoints[0][0])} ${format(topPoints[0][1])}`];

  for (let i = 1; i < topPoints.length; i += 1) {
    commands.push(`L ${format(topPoints[i][0])} ${format(topPoints[i][1])}`);
  }

  for (let i = bottomPoints.length - 1; i >= 0; i -= 1) {
    commands.push(`L ${format(bottomPoints[i][0])} ${format(bottomPoints[i][1])}`);
  }

  commands.push("Z");
  return commands.join(" ");
}

function buildNeedleSideTrianglePath(topPoints, bottomPoints, apexX, apexY, format) {
  if (!topPoints.length || !bottomPoints.length) {
    return "";
  }

  const tipX = format(apexX);
  const tipY = format(apexY);
  const commands = [`M ${tipX} ${tipY}`, `L ${format(topPoints[0][0])} ${format(topPoints[0][1])}`];

  for (let i = 1; i < topPoints.length; i += 1) {
    commands.push(`L ${format(topPoints[i][0])} ${format(topPoints[i][1])}`);
  }

  for (let i = bottomPoints.length - 1; i >= 0; i -= 1) {
    commands.push(`L ${format(bottomPoints[i][0])} ${format(bottomPoints[i][1])}`);
  }

  commands.push(`L ${tipX} ${tipY}`);
  commands.push("Z");
  return commands.join(" ");
}

function sampleAnchoredCurve(anchors, start, end, noseX, format) {
  const result = [];
  const span = Math.max(end - start, 1);
  const steps = Math.max(4, Math.round(span / 12));

  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps;
    const x = start + span * ratio;
    const y = interpolateAnchoredY(anchors, x);
    result.push([format(noseX + x), format(y)]);
  }

  return result;
}

function interpolateAnchoredY(anchors, x) {
  if (!anchors.length) {
    return 0;
  }

  if (x <= anchors[0][0]) {
    return anchors[0][1];
  }

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const left = anchors[i];
    const right = anchors[i + 1];
    if (x <= right[0]) {
      const delta = right[0] - left[0];
      const t = delta === 0 ? 0 : (x - left[0]) / delta;
      return left[1] + (right[1] - left[1]) * t;
    }
  }

  const last = anchors[anchors.length - 1];
  return last[1];
}

export function createSideProfileAnchors(profile, segments, geometry, options = {}) {
  const { allowFallback = false } = options;

  let hasSegments = Boolean(segments);
  if (!hasSegments && !allowFallback) {
    return null;
  }

  let frontLength = segments?.front?.length ?? profile.noseLength ?? profile.length * 0.32;
  let midLength = segments?.mid?.length ?? profile.length * 0.36;
  let rearLength = segments?.rear?.length ?? profile.tailLength ?? profile.length * 0.32;

  if (!hasSegments) {
    const fallbackTotal = frontLength + midLength + rearLength;
    if (!Number.isFinite(fallbackTotal) || fallbackTotal <= 0) {
      return null;
    }
    const deficit = profile.length - fallbackTotal;
    midLength = Math.max(1, midLength + deficit);
  }

  frontLength = Math.max(1, frontLength);
  midLength = Math.max(1, midLength);
  rearLength = Math.max(1, rearLength);

  const total = frontLength + midLength + rearLength;
  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const scale = profile.length / total;
  frontLength *= scale;
  midLength *= scale;
  rearLength *= scale;

  const centerY = 100 + (profile.offsetY ?? 0);
  const noseTop = centerY - profile.noseHeight;
  const crest = centerY - profile.dorsalHeight;
  const tailTop = centerY - profile.tailHeight;
  const noseBottom = centerY + profile.noseHeight * 0.55;
  const belly = centerY + profile.bellyDrop;
  const ventral = centerY + profile.ventralDepth;
  const tailBottom = centerY + Math.max(profile.tailHeight * 0.8, profile.bellyDrop * 0.85);

  const frontEnd = frontLength;
  const midEnd = frontEnd + midLength;

  const mix = (a, b, t) => a + (b - a) * t;

  const frontConfig = profile.sideAnchorConfig?.front ?? {};
  const midConfig = profile.sideAnchorConfig?.mid ?? {};
  const rearConfig = profile.sideAnchorConfig?.rear ?? {};
  const frontSegment = segments?.front ?? null;
  const isNeedleNose = frontSegment?.type === "needle";
  const configNeedleSharpness = clamp(frontConfig.needleSharpness ?? 0, 0, 1);
  const tipWidthFactor = frontSegment?.tipWidthFactor;
  const shoulderWidthFactor = frontSegment?.shoulderWidthFactor;
  let taperStrength = 0;
  if (isNeedleNose && Number.isFinite(tipWidthFactor) && Number.isFinite(shoulderWidthFactor) && shoulderWidthFactor > 0) {
    taperStrength = clamp(1 - tipWidthFactor / Math.max(shoulderWidthFactor, 0.12), 0, 1);
  }
  const transitionFactorBias = isNeedleNose ? clamp((frontSegment?.transitionFactor ?? 0.9) - 0.7, 0, 0.6) : 0;
  const needleInfluence = isNeedleNose
    ? clamp(Math.max(configNeedleSharpness, taperStrength) + transitionFactorBias * 0.35, 0, 1)
    : 0;

  const frontSecondBlend = clamp(frontConfig.topSecondBlend ?? 0.6, 0, 1);
  const frontEndBlend = clamp(frontConfig.topEndBlend ?? 0.1, 0, 1);
  const chinBlend = clamp(frontConfig.bottomSecondBlend ?? 0.55, 0, 1);
  const frontBellyBlend = clamp(frontConfig.bottomEndBlend ?? 0.4, 0, 1);

  const midDip = clamp(midConfig.topDip ?? 0.08, 0.02, 0.2);
  const crestOffset = (midConfig.topCrestOffset ?? 0) * profile.height;

  const rearTopBlend = clamp(rearConfig.topBlend ?? 0.55, 0, 1);
  const rearBottomBlend = clamp(rearConfig.bottomBlend ?? 0.65, 0, 1);

  const axis = profile.axis ?? null;
  const convertNodeOffset = (value) => {
    if (!axis || !Number.isFinite(value)) {
      return null;
    }
    const percent = axis.percentFromTopY?.(value);
    if (!Number.isFinite(percent)) {
      return null;
    }
    return clamp(percent * profile.length, 0, profile.length);
  };

  const getNodeOffset = (index) => convertNodeOffset(geometry?.nodes?.[index]?.y);
  const tailOffset = convertNodeOffset(geometry?.tail?.y) ?? profile.length;

  let frontTransitionOffset =
    getNodeOffset(0) ?? clamp(frontLength * 0.45, 0, profile.length);
  let frontShoulderOffset = getNodeOffset(1) ?? frontEnd;
  const waistOffset = getNodeOffset(2) ?? clamp(frontEnd + midLength * 0.4, 0, profile.length);
  const bellyOffset = getNodeOffset(3) ?? clamp(frontEnd + midLength * 0.75, 0, profile.length);
  const midTrailingOffset =
    getNodeOffset(4) ?? clamp(frontEnd + midLength, 0, profile.length);
  const rearBaseOffset =
    getNodeOffset(5) ?? clamp(profile.length - rearLength * 0.55, 0, profile.length);
  const exhaustOffset =
    getNodeOffset(6) ?? clamp(profile.length - rearLength * 0.35, 0, profile.length);

  const minTransition = frontLength * (0.12 + needleInfluence * 0.05);
  const safeMaxTransition = Math.min(frontLength * (0.68 - needleInfluence * 0.18), frontLength - 1);
  frontTransitionOffset = clamp(frontTransitionOffset ?? minTransition, minTransition, safeMaxTransition);

  const minShoulder = Math.max(frontTransitionOffset + 2, frontLength * (0.58 + needleInfluence * 0.08));
  const safeMaxShoulder = Math.min(frontLength * (0.92 - needleInfluence * 0.1), frontLength + midLength * 0.15);
  frontShoulderOffset = clamp(frontShoulderOffset ?? minShoulder, minShoulder, safeMaxShoulder);

  const transitionX = frontTransitionOffset;
  const shoulderX = frontShoulderOffset;
  const waistX = waistOffset;
  const bellyX = bellyOffset;
  const trailingX = midTrailingOffset;
  const baseX = rearBaseOffset;
  const exhaustX = exhaustOffset;
  const tailX = tailOffset;

  const useNeedleTriangle = isNeedleNose;

  const topAnchors = [[0, noseTop]];
  if (useNeedleTriangle) {
    topAnchors.push([shoulderX, mix(crest, noseTop, frontEndBlend)]);
  } else {
    topAnchors.push([transitionX, mix(noseTop, crest, frontSecondBlend)]);
    topAnchors.push([shoulderX, mix(crest, noseTop, frontEndBlend)]);
  }
  topAnchors.push([waistX, crest - profile.height * midDip]);
  topAnchors.push([bellyX, crest + crestOffset]);
  topAnchors.push([baseX, mix(crest, tailTop, rearTopBlend)]);
  topAnchors.push([tailX, tailTop]);

  const bottomAnchors = [[0, noseBottom]];
  if (useNeedleTriangle) {
    bottomAnchors.push([shoulderX, mix(ventral, belly, frontBellyBlend)]);
  } else {
    let chinX = clamp(transitionX * 0.92, 0, shoulderX);
    if (needleInfluence > 0) {
      const chinTarget = Math.min(
        transitionX * (0.78 - needleInfluence * 0.22),
        shoulderX * (0.88 - needleInfluence * 0.1),
      );
      chinX = clamp(chinTarget, 0, shoulderX);
    }
    bottomAnchors.push([chinX, mix(noseBottom, belly, chinBlend)]);
    bottomAnchors.push([shoulderX, mix(ventral, belly, frontBellyBlend)]);
  }
  bottomAnchors.push([waistX, ventral]);
  bottomAnchors.push([trailingX, belly]);
  bottomAnchors.push([exhaustX, mix(belly, tailBottom, rearBottomBlend)]);
  bottomAnchors.push([tailX, tailBottom]);

  if (!useNeedleTriangle && needleInfluence > 0.05) {
    const tipBase = transitionX * (0.6 - needleInfluence * 0.2);
    const tipMin = Math.max(frontLength * (0.1 + needleInfluence * 0.04), transitionX * 0.25);
    const tipMax = Math.max(tipMin + 0.5, transitionX * (0.92 - needleInfluence * 0.1));
    const tipX = clamp(tipBase, tipMin, tipMax);
    const needleTopBlend = clamp(frontSecondBlend * (0.72 - needleInfluence * 0.25), 0.02, 0.6);
    topAnchors.splice(1, 0, [tipX, mix(noseTop, crest, needleTopBlend)]);

    const chinBlendTaper = clamp(chinBlend * (0.74 - needleInfluence * 0.28), 0.08, 0.65);
    const tipChinX = clamp(tipX * (0.82 - needleInfluence * 0.2), 0, tipX * 0.96);
    bottomAnchors.splice(1, 0, [tipChinX, mix(noseBottom, belly, chinBlendTaper)]);
  }

  const triangle = useNeedleTriangle
    ? {
        apexInset: clamp(
          frontLength * (0.24 + needleInfluence * 0.18) + (frontSegment?.curve ?? body.noseCurve ?? 18) * 0.12,
          frontLength * 0.14,
          frontLength * 0.45,
        ),
        apexBlend: clamp(0.44 - needleInfluence * 0.18, 0.22, 0.56),
      }
    : null;

  const noseX = profile.axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;

  return {
    noseX,
    topAnchors,
    bottomAnchors,
    triangle,
    boundaries: hasSegments
      ? {
          front: shoulderX,
          mid: trailingX,
        }
      : null,
  };
}

export function buildSideHullGeometry(profile) {
  if (profile.segmentAnchors) {
    return buildSideSegmentedHull(profile);
  }

  return {
    hullPath: buildLegacySideHullPath(profile),
    segmentPaths: null,
  };
}

function buildLegacySideHullPath(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const axis = profile.axis ?? null;
  const noseX = axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;
  const tailX = axis?.side?.tail ?? profile.tailX ?? 100 + profile.length / 2;
  const dorsalTop = centerY - profile.dorsalHeight;
  const tailTop = centerY - profile.tailHeight;
  const belly = centerY + profile.bellyDrop;
  const ventral = centerY + profile.ventralDepth;
  const dorsalRampStart = noseX + profile.noseLength * 0.9;
  const dorsalMidX = noseX + profile.length * 0.45;
  const tailShoulderX = tailX - profile.tailLength * 0.85;
  const keelFrontX = noseX + profile.length * 0.4;
  const keelDipX = noseX + profile.length * 0.6;

  return [
    `M ${noseX} ${centerY}`,
    `Q ${noseX + profile.noseLength * 0.55} ${centerY - profile.noseHeight} ${dorsalRampStart} ${centerY - profile.noseHeight * 0.5}`,
    `C ${dorsalRampStart + profile.length * 0.16} ${dorsalTop - profile.height * 0.22} ${dorsalMidX} ${dorsalTop - profile.height * 0.05} ${tailShoulderX} ${dorsalTop}`,
    `Q ${tailX - profile.tailLength * 0.28} ${tailTop - profile.tailHeight * 0.08} ${tailX} ${centerY}`,
    `Q ${tailX - profile.tailLength * 0.3} ${centerY + profile.tailHeight * 0.75} ${tailShoulderX} ${centerY + profile.tailHeight * 0.9}`,
    `C ${keelDipX} ${ventral} ${keelFrontX} ${belly} ${noseX + profile.noseLength * 0.4} ${centerY + profile.noseHeight * 0.55}`,
    `Q ${noseX + profile.noseLength * 0.1} ${centerY + profile.noseHeight * 0.25} ${noseX} ${centerY}`,
    "Z",
  ].join(" ");
}

function buildSideSegmentedHull(profile) {
  const anchors = profile.segmentAnchors;
  if (!anchors) {
    return { hullPath: buildLegacySideHullPath(profile), segmentPaths: null };
  }

  const format = (value) => Number(value.toFixed(2));
  const noseX = anchors.noseX ?? profile.axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;
  const hullTop = sampleAnchoredCurve(anchors.topAnchors, 0, profile.length, noseX, format);
  const hullBottom = sampleAnchoredCurve(
    anchors.bottomAnchors,
    0,
    profile.length,
    noseX,
    format,
  );

  let hullPath = buildClosedPathFromSamples(hullTop, hullBottom, format);
  const segmentPaths = {};
  const triangle = anchors.triangle ?? null;
  let apexX = noseX;
  let apexY = hullTop[0]?.[1] ?? 100;

  if (triangle) {
    const inset = clamp(triangle.apexInset ?? profile.noseLength * 0.2, profile.length * 0.08, profile.noseLength * 0.65);
    const blend = clamp(triangle.apexBlend ?? 0.5, 0, 1);
    const noseTop = anchors.topAnchors?.[0]?.[1] ?? apexY;
    const noseBottom = anchors.bottomAnchors?.[0]?.[1] ?? noseTop;
    apexX = noseX - inset;
    apexY = noseTop + (noseBottom - noseTop) * blend;
    hullPath = buildNeedleSideTrianglePath(hullTop, hullBottom, apexX, apexY, format);
  }

  const segments = [
    ["front", 0, anchors.boundaries.front],
    ["mid", anchors.boundaries.front, anchors.boundaries.mid],
    ["rear", anchors.boundaries.mid, profile.length],
  ];

  segments.forEach(([key, start, end]) => {
    if (end - start <= 0.1) {
      return;
    }
    const top = sampleAnchoredCurve(anchors.topAnchors, start, end, noseX, format);
    const bottom = sampleAnchoredCurve(anchors.bottomAnchors, start, end, noseX, format);
    segmentPaths[key] = buildClosedPathFromSamples(top, bottom, format);
  });

  if (triangle && (anchors.boundaries?.front ?? 0) > 0.1) {
    const frontTop = sampleAnchoredCurve(anchors.topAnchors, 0, anchors.boundaries.front, noseX, format);
    const frontBottom = sampleAnchoredCurve(anchors.bottomAnchors, 0, anchors.boundaries.front, noseX, format);
    segmentPaths.front = buildNeedleSideTrianglePath(frontTop, frontBottom, apexX, apexY, format);
  }

  return { hullPath, segmentPaths };
}

export function buildSidePanelLines(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const axis = profile.axis ?? null;
  const noseOrigin = axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;
  const tailOrigin = axis?.side?.tail ?? profile.tailX ?? 100 + profile.length / 2;
  const noseX = noseOrigin + profile.noseLength * 0.9;
  const tailX = tailOrigin - profile.tailLength * 0.65;
  const top = centerY - profile.height * 0.35;
  const bottom = centerY + profile.height * 0.25;
  const steps = 3;
  const spacing = (bottom - top) / (steps + 1);
  const segments = [];
  for (let i = 1; i <= steps; i += 1) {
    const y = top + spacing * i;
    segments.push(`M ${noseX} ${y} L ${tailX} ${y}`);
  }
  return segments.join(" ");
}

export function buildSegmentDividerPath(topAnchors, bottomAnchors, noseX, offset) {
  if (!Number.isFinite(offset)) {
    return "";
  }
  const format = (value) => Number(value.toFixed(2));
  const top = interpolateAnchoredY(topAnchors, offset);
  const bottom = interpolateAnchoredY(bottomAnchors, offset);
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
    return "";
  }
  const inset = 1.6;
  const topY = top + inset;
  const bottomY = bottom - inset;
  if (bottomY - topY <= 0.1) {
    return "";
  }
  const x = format(noseX + offset);
  return `M ${x} ${format(topY)} L ${x} ${format(bottomY)}`;
}

export function buildSideIntakePath(profile) {
  const offsetY = profile.offsetY ?? 0;
  const centerY = 100 + offsetY;
  const axis = profile.axis ?? null;
  const noseOrigin = axis?.side?.nose ?? profile.noseX ?? 100 - profile.length / 2;
  const startX = noseOrigin + profile.noseLength * 0.55;
  const lowerY = centerY + profile.bellyDrop * 0.85;
  const deepestY = centerY + profile.ventralDepth;
  const endX = startX + profile.intakeDepth;
  return [
    `M ${startX} ${lowerY}`,
    `Q ${startX + profile.intakeDepth * 0.25} ${deepestY} ${endX} ${centerY + profile.bellyDrop * 0.75}`,
    `L ${startX + profile.intakeDepth * 0.35} ${centerY + profile.bellyDrop * 0.55}`,
    "Z",
  ].join(" ");
}

export function sampleHullTopY(profile, distanceFromNose) {
  if (!profile) {
    return 0;
  }
  const anchors = profile.hullAnchors ?? profile.segmentAnchors;
  if (anchors?.topAnchors) {
    const clamped = clamp(distanceFromNose, 0, profile.length);
    return interpolateAnchoredY(anchors.topAnchors, clamped);
  }
  const centerY = 100 + (profile.offsetY ?? 0);
  return centerY - profile.dorsalHeight;
}

export function getWingSidePoints(wing, profile, axis) {
  return buildSideWingPoints(wing, profile, axis);
}

export function getDeltaWingSide(config, wingProfile, profile, axis) {
  if (wingProfile?.style !== "delta") {
    return null;
  }
  return buildSideWingPoints(wingProfile, profile, axis);
}

function buildSideWingPoints(wing, profile, axis) {
  const baseX = axis.percentToSideX(wing.positionPercent);
  const baseY = 100 + (profile.offsetY ?? 0) + wing.mountHeight;
  const spanInfluence = Math.max(wing.profileSpan ?? 0, 1);
  const chord = Math.max(wing.length, spanInfluence * 0.6);
  const topReach = Math.max(wing.thickness * 0.75, spanInfluence * 0.32);
  const dihedralReach = Math.max(wing.dihedral, spanInfluence * 0.18);
  const trailingDrop = Math.max(wing.drop, spanInfluence * 0.22);
  const bottomReach = Math.max(wing.thickness, spanInfluence * 0.45);
  const style = wing.style ?? "swept";

  const root = [baseX, baseY];
  const rootTop = [baseX + chord * 0.3, baseY - topReach];
  const tip = [baseX + chord, baseY - dihedralReach];
  const trailing = [baseX + chord * 0.78, baseY + trailingDrop];
  const rootBottom = [baseX - chord * 0.14, baseY + bottomReach];

  let points = [root, rootTop, tip, trailing, rootBottom];

  switch (style) {
    case "delta":
      rootTop[0] = baseX + chord * 0.2;
      rootTop[1] = baseY - topReach * 0.55;
      tip[1] = baseY - dihedralReach * 1.4;
      trailing[0] = baseX + chord * 0.68;
      trailing[1] = baseY + trailingDrop * 0.5;
      rootBottom[0] = baseX - chord * 0.08;
      rootBottom[1] = baseY + bottomReach * 0.65;
      break;
    case "forward":
      root[1] = baseY - topReach * 0.18;
      rootTop[0] = baseX + chord * 0.42;
      rootTop[1] = baseY - topReach * 0.95;
      tip[0] = baseX + chord * 0.86;
      tip[1] = baseY - dihedralReach * 0.45;
      trailing[0] = baseX + chord * 0.74;
      trailing[1] = baseY + trailingDrop * 1.12;
      rootBottom[0] = baseX - chord * 0.22;
      rootBottom[1] = baseY + bottomReach * 1.05;
      break;
    case "ladder": {
      const rungRise = topReach * 0.55;
      const rungDrop = trailingDrop * 0.4;
      points = [
        [baseX, baseY - rungRise * 0.15],
        [baseX + chord * 0.32, baseY - topReach],
        [baseX + chord * 0.62, baseY - dihedralReach * 0.6],
        [baseX + chord * 0.56, baseY - dihedralReach * 0.05],
        [baseX + chord * 0.82, baseY + rungDrop],
        [baseX + chord * 0.35, baseY + trailingDrop * 0.75],
        [baseX - chord * 0.12, baseY + bottomReach],
      ];
      break;
    }
    case "split":
      points = [
        [baseX, baseY - topReach * 0.35],
        [baseX + chord * 0.36, baseY - topReach],
        [baseX + chord * 0.48, baseY - dihedralReach * 0.35],
        [baseX + chord * 0.82, baseY - dihedralReach * 0.85],
        [baseX + chord * 0.94, baseY + trailingDrop * 0.55],
        [baseX + chord * 0.46, baseY + trailingDrop * 0.92],
        [baseX - chord * 0.16, baseY + bottomReach * 0.95],
      ];
      break;
    case "box":
      points = [
        [baseX, baseY - wing.thickness * 0.5],
        [baseX + chord * 0.2, baseY - topReach * 0.6],
        [baseX + chord * 0.92, baseY - dihedralReach * 0.35],
        [baseX + chord * 0.95, baseY + trailingDrop * 0.45],
        [baseX + chord * 0.34, baseY + trailingDrop * 0.6],
        [baseX - chord * 0.05, baseY + bottomReach * 0.85],
      ];
      break;
    case "broad":
      points = [
        [baseX, baseY - wing.thickness * 0.42],
        [baseX + chord * 0.78, baseY - dihedralReach * 0.6],
        [baseX + chord * 0.98, baseY - dihedralReach * 0.2],
        [baseX + chord * 0.98, baseY + trailingDrop * 0.68],
        [baseX + chord * 0.28, baseY + trailingDrop * 0.82],
        [baseX - chord * 0.1, baseY + bottomReach * 0.9],
      ];
      break;
    default:
      break;
  }

  return points;
}

export function getNeedleSide(config, profile, options = {}) {
  const frontType = config?.body?.segments?.front?.type;
  if (frontType !== "needle") {
    return null;
  }
  if (options.segmentPaths?.front) {
    return options.segmentPaths.front;
  }
  if (!profile) {
    return null;
  }
  const hull = buildSideHullGeometry(profile);
  return hull.segmentPaths?.front ?? null;
}
