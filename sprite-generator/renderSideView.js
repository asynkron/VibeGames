import {
  buildSideHullGeometry,
  buildSidePanelLines,
  buildSegmentDividerPath,
  buildSideIntakePath,
  getWingSidePoints,
  getDeltaWingSide,
  pointsToString,
  normalizeWingHardpoint,
} from "./renderParts.js";
import { clamp, lerp } from "./math.js";
import { deriveSideViewGeometry } from "./geometry.js";
import { mixColor, shadeColor } from "./color.js";
import { isDebugColorsEnabled, nextRenderId, partColor, partStroke } from "./renderContext.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function drawSideViewSpaceship(root, config, defs) {
  const geometry = deriveSideViewGeometry(config);
  const axis = geometry.axis;
  drawSideHull(root, config, geometry, axis);
  drawSideAntenna(root, config, geometry, axis);
  drawSideWing(root, config, geometry, axis);
  drawSideStabiliser(root, config, geometry, axis);
  drawSideMarkings(root, config, geometry, axis);
  drawSideCanopy(root, config, geometry, axis, defs);
  drawSideThrusters(root, config, geometry, axis);
  drawSideWeapons(root, config, geometry, axis);
  drawSideLights(root, config, geometry, axis);
}

export function drawSideHull(root, config, geometry, axis) {
  const { palette } = config;
  const { profile } = geometry;
  const group = document.createElementNS(SVG_NS, "g");

  const hullGeometry = buildSideHullGeometry(profile);

  if (hullGeometry.segmentPaths) {
    const segmentOrder = ["front", "mid", "rear"];
    const shading = [0.08, 0, -0.08];
    segmentOrder.forEach((key, index) => {
      const pathData = hullGeometry.segmentPaths[key];
      if (!pathData) {
        return;
      }
      const segment = document.createElementNS(SVG_NS, "path");
      segment.setAttribute("d", pathData);
      segment.setAttribute(
        "fill",
        partColor("hull", shadeColor(palette.primary, shading[index] ?? 0)),
      );
      segment.setAttribute("stroke", "none");
      group.appendChild(segment);
    });

    if (profile.segmentAnchors?.boundaries) {
      const seamCommands = [];
      const { boundaries, topAnchors, bottomAnchors, noseX } = profile.segmentAnchors;
      const dividerOffsets = [boundaries.front, boundaries.mid];
      dividerOffsets.forEach((offset) => {
        const divider = buildSegmentDividerPath(topAnchors, bottomAnchors, noseX, offset);
        if (divider) {
          seamCommands.push(divider);
        }
      });
      if (seamCommands.length) {
        const seams = document.createElementNS(SVG_NS, "path");
        seams.setAttribute("d", seamCommands.join(" "));
        seams.setAttribute("stroke", mixColor(palette.trim, palette.accent, 0.4));
        seams.setAttribute("stroke-width", 1.2);
        seams.setAttribute("stroke-linecap", "round");
        seams.setAttribute("fill", "none");
        seams.setAttribute("opacity", "0.75");
        group.appendChild(seams);
      }
    }

    const outline = document.createElementNS(SVG_NS, "path");
    outline.setAttribute("d", hullGeometry.hullPath);
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", palette.accent);
    outline.setAttribute("stroke-width", 2.4);
    outline.setAttribute("stroke-linejoin", "round");
    group.appendChild(outline);
  } else {
    const hull = document.createElementNS(SVG_NS, "path");
    hull.setAttribute("d", hullGeometry.hullPath);
    hull.setAttribute("fill", partColor("hull", palette.primary));
    hull.setAttribute("stroke", palette.accent);
    hull.setAttribute("stroke-width", 2.4);
    hull.setAttribute("stroke-linejoin", "round");
    group.appendChild(hull);
  }

  if (profile.plating) {
    const plating = document.createElementNS(SVG_NS, "path");
    plating.setAttribute("d", buildSidePanelLines(profile));
    plating.setAttribute("stroke", mixColor(palette.trim, palette.accent, 0.4));
    plating.setAttribute("stroke-width", 1.2);
    plating.setAttribute("stroke-linecap", "round");
    plating.setAttribute("fill", "none");
    plating.setAttribute("opacity", "0.6");
    group.appendChild(plating);
  }

  if (profile.intakeHeight > 0 && profile.intakeDepth > 0) {
    const intake = document.createElementNS(SVG_NS, "path");
    intake.setAttribute("d", buildSideIntakePath(profile));
    intake.setAttribute("fill", partColor("hull", shadeColor(palette.secondary, -0.2)));
    intake.setAttribute("stroke", palette.trim);
    intake.setAttribute("stroke-width", 1.2);
    group.appendChild(intake);
  }

  root.appendChild(group);
}

export function drawSideAntenna(root, config, geometry, axis) {
  const { palette } = config;
  const { antenna, profile } = geometry;
  if (!antenna) {
    return;
  }

  const centerY = 100 + (profile.offsetY ?? 0);
  const baseX = axis.percentToSideX(antenna.basePercent ?? 0);
  const baseY = centerY + antenna.baseOffset;
  const tipX = baseX + (antenna.lean ?? 0);
  const tipY = baseY - (antenna.length ?? 0);

  const mast = document.createElementNS(SVG_NS, "line");
  mast.setAttribute("x1", baseX.toString());
  mast.setAttribute("y1", baseY.toString());
  mast.setAttribute("x2", tipX.toString());
  mast.setAttribute("y2", tipY.toString());
  mast.setAttribute("stroke", partStroke("details", palette.trim));
  mast.setAttribute("stroke-width", 1.4);
  mast.setAttribute("stroke-linecap", "round");

  const beacon = document.createElementNS(SVG_NS, "circle");
  beacon.setAttribute("cx", tipX.toString());
  beacon.setAttribute("cy", (tipY - antenna.beaconRadius * 0.2).toString());
  beacon.setAttribute("r", antenna.beaconRadius.toString());
  beacon.setAttribute("fill", partColor("lights", palette.glow));
  beacon.setAttribute("opacity", "0.85");

  root.append(mast, beacon);
}

export function drawSideWing(root, config, geometry, axis) {
  const { palette } = config;
  const { wing: wingProfile, profile } = geometry;
  if (!wingProfile?.enabled) {
    return;
  }

  const points = wingProfile.style === "delta"
    ? getDeltaWingSide(config, wingProfile, profile, axis)
    : getWingSidePoints(wingProfile, profile, axis);
  if (!points) {
    return;
  }

  const wing = document.createElementNS(SVG_NS, "polygon");
  wing.setAttribute("points", pointsToString(points));
  wing.setAttribute("fill", partColor("wing", shadeColor(palette.secondary, -0.1)));
  wing.setAttribute("stroke", palette.trim);
  wing.setAttribute("stroke-width", 1.8);
  wing.setAttribute("stroke-linejoin", "round");
  root.appendChild(wing);

  if (wingProfile.accent) {
    const accent = document.createElementNS(SVG_NS, "polyline");
    accent.setAttribute("points", pointsToString([points[0], points[1], points[2]]));
    accent.setAttribute("stroke", partStroke("wing", palette.accent));
    accent.setAttribute("stroke-width", 2);
    accent.setAttribute("fill", "none");
    root.appendChild(accent);
  }
}

export function drawSideStabiliser(root, config, geometry, axis) {
  const { palette } = config;
  const { stabiliser, profile } = geometry;
  if (!stabiliser) {
    return;
  }
  const tailX = axis.percentToSideX(1);
  const tailBase = tailX - stabiliser.length;
  const baseY = 100 + (profile.offsetY ?? 0) + (stabiliser.offsetY ?? 0);

  const fin = document.createElementNS(SVG_NS, "polygon");
  const finPoints = [
    [tailBase, baseY],
    [tailBase + stabiliser.length * 0.48, baseY - stabiliser.height],
    [tailBase + stabiliser.length, baseY - stabiliser.height * 0.55],
    [tailBase + stabiliser.length * 0.22, baseY + stabiliser.thickness * 0.2],
  ];
  fin.setAttribute("points", pointsToString(finPoints));
  fin.setAttribute("fill", partColor("stabiliser", shadeColor(palette.secondary, 0.05)));
  fin.setAttribute("stroke", partStroke("stabiliser", palette.trim));
  fin.setAttribute("stroke-width", 1.6);
  fin.setAttribute("stroke-linejoin", "round");
  root.appendChild(fin);

  if (stabiliser.ventral) {
    const ventral = document.createElementNS(SVG_NS, "polygon");
    const ventralPoints = [
      [tailBase + stabiliser.length * 0.18, baseY + stabiliser.thickness * 0.3],
      [tailBase + stabiliser.length * 0.52, baseY + stabiliser.height * 0.6],
      [tailBase + stabiliser.length * 0.78, baseY + stabiliser.height * 0.5],
      [tailBase + stabiliser.length * 0.32, baseY + stabiliser.thickness * 0.1],
    ];
    ventral.setAttribute("points", pointsToString(ventralPoints));
    ventral.setAttribute("fill", partColor("stabiliser", shadeColor(palette.secondary, -0.15)));
    ventral.setAttribute("stroke", partStroke("stabiliser", palette.trim));
    ventral.setAttribute("stroke-width", 1.4);
    ventral.setAttribute("stroke-linejoin", "round");
    root.appendChild(ventral);
  }
}

export function drawSideCanopy(root, config, geometry, axis, defs) {
  const { palette } = config;
  const { canopy, profile } = geometry;
  if (!canopy) {
    return;
  }

  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  const gradientId = `side-canopy-${config.id}-${nextRenderId()}`;
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("x2", "100%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("y2", "100%");

  const debugEnabled = isDebugColorsEnabled();
  const canopyColor = partColor("canopy", canopy.tint);
  const highlightColor = debugEnabled ? canopyColor : mixColor(canopy.tint, "#ffffff", 0.4);
  const midColor = debugEnabled ? canopyColor : canopy.tint;
  const shadowColor = debugEnabled ? canopyColor : shadeColor(canopy.tint, -0.3);

  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", highlightColor);
  stop1.setAttribute("stop-opacity", "0.9");
  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "65%");
  stop2.setAttribute("stop-color", midColor);
  stop2.setAttribute("stop-opacity", "0.95");
  const stop3 = document.createElementNS(SVG_NS, "stop");
  stop3.setAttribute("offset", "100%");
  stop3.setAttribute("stop-color", shadowColor);
  stop3.setAttribute("stop-opacity", "0.9");
  gradient.append(stop1, stop2, stop3);
  defs.appendChild(gradient);

  const baseX = axis.percentToSideX(canopy.startPercent ?? 0);
  const endX = axis.percentToSideX(canopy.endPercent ?? canopy.startPercent ?? 0);
  const centerY = 100 + (profile.offsetY ?? 0);
  const verticalShift = canopy.offsetY ?? 0;
  const baseStartY = centerY + canopy.baseStart + verticalShift;
  const baseEndY = centerY + canopy.baseEnd + verticalShift;
  const apexX = baseX + canopy.length / 2;
  const apexY = Math.min(baseStartY, baseEndY) - canopy.height;
  const frameInset = canopy.frameInset ?? canopy.length * 0.08;
  const frameStartX = baseX + frameInset;
  const frameEndX = endX - frameInset;
  const frameStartY = lerp(baseStartY, baseEndY, clamp(canopy.frameStartBlend ?? 0.08, 0, 1));
  const frameEndY = lerp(baseStartY, baseEndY, clamp(canopy.frameEndBlend ?? 0.92, 0, 1));
  const frameApexY = apexY + canopy.height * clamp(canopy.frameApexBias ?? 0.1, -0.2, 0.4);

  const bottomControlY = Math.max(baseStartY, baseEndY) - canopy.height * 0.25;

  const sampleTopCurve = (t) => {
    const inv = 1 - t;
    return {
      x: inv * inv * baseX + 2 * inv * t * apexX + t * t * endX,
      y: inv * inv * baseStartY + 2 * inv * t * apexY + t * t * baseEndY,
    };
  };

  const sampleBottomCurve = (t) => {
    const inv = 1 - t;
    return {
      x: inv * inv * baseX + 2 * inv * t * apexX + t * t * endX,
      y: inv * inv * baseStartY + 2 * inv * t * bottomControlY + t * t * baseEndY,
    };
  };

  const canopyShape = document.createElementNS(SVG_NS, "path");
  const canopyPath = [
    `M ${baseX} ${baseStartY}`,
    `Q ${apexX} ${apexY} ${endX} ${baseEndY}`,
    `Q ${apexX} ${Math.max(baseStartY, baseEndY) - canopy.height * 0.25} ${baseX} ${baseStartY}`,
    "Z",
  ].join(" ");
  canopyShape.setAttribute("d", canopyPath);
  canopyShape.setAttribute("fill", `url(#${gradientId})`);
  canopyShape.setAttribute("stroke", debugEnabled ? canopyColor : palette.trim);
  canopyShape.setAttribute("stroke-width", canopy.frame);
  canopyShape.setAttribute("stroke-linejoin", "round");
  root.appendChild(canopyShape);

  const frame = document.createElementNS(SVG_NS, "path");
  const framePath = `M ${frameStartX} ${frameStartY} Q ${apexX} ${frameApexY} ${frameEndX} ${frameEndY}`;
  frame.setAttribute("d", framePath);
  frame.setAttribute(
    "stroke",
    debugEnabled ? canopyColor : mixColor(palette.trim, palette.accent, 0.5),
  );
  frame.setAttribute("stroke-width", canopy.frame * 0.7);
  frame.setAttribute("stroke-linecap", "round");
  frame.setAttribute("fill", "none");
  root.appendChild(frame);

  const ribRatios = Array.isArray(canopy.ribRatios) ? canopy.ribRatios : [];
  const ribStroke = Math.max(0.6, canopy.frame * (canopy.ribStrokeScale ?? 0.7));
  const ribColor = debugEnabled
    ? canopyColor
    : mixColor(palette.trim, palette.accent, 0.45);

  ribRatios.forEach((ratio) => {
    const t = clamp(ratio, 0.05, 0.95);
    const topPoint = sampleTopCurve(t);
    const bottomPoint = sampleBottomCurve(t);
    const controlX = lerp(bottomPoint.x, topPoint.x, 0.55);
    const controlY = lerp(bottomPoint.y, topPoint.y, clamp(canopy.ribCurveBias ?? 0.45, 0, 1));
    const rib = document.createElementNS(SVG_NS, "path");
    rib.setAttribute(
      "d",
      `M ${bottomPoint.x.toFixed(2)} ${bottomPoint.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${topPoint.x.toFixed(2)} ${topPoint.y.toFixed(2)}`,
    );
    rib.setAttribute("stroke", ribColor);
    rib.setAttribute("stroke-width", ribStroke);
    rib.setAttribute("stroke-linecap", "round");
    rib.setAttribute("stroke-linejoin", "round");
    rib.setAttribute("fill", "none");
    rib.setAttribute("opacity", debugEnabled ? "1" : "0.9");
    root.appendChild(rib);
  });

  if (Number.isFinite(canopy.beltRatio)) {
    const beltRatio = clamp(canopy.beltRatio, 0.1, 0.9);
    const beltStroke = Math.max(0.6, canopy.frame * (canopy.beltStrokeScale ?? 0.55));
    const belt = document.createElementNS(SVG_NS, "path");
    const segments = 6;
    const commands = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const topPoint = sampleTopCurve(t);
      const bottomPoint = sampleBottomCurve(t);
      const pointX = lerp(bottomPoint.x, topPoint.x, beltRatio);
      const pointY = lerp(bottomPoint.y, topPoint.y, beltRatio);
      commands.push(`${i === 0 ? "M" : "L"} ${pointX.toFixed(2)} ${pointY.toFixed(2)}`);
    }
    belt.setAttribute("d", commands.join(" "));
    belt.setAttribute("stroke", debugEnabled ? canopyColor : mixColor(palette.trim, palette.accent, 0.4));
    belt.setAttribute("stroke-width", beltStroke);
    belt.setAttribute("stroke-linecap", "round");
    belt.setAttribute("stroke-linejoin", "round");
    belt.setAttribute("fill", "none");
    belt.setAttribute("opacity", debugEnabled ? "1" : "0.85");
    root.appendChild(belt);
  }
}

export function drawSideThrusters(root, config, geometry, axis) {
  const { palette } = config;
  const { thruster, profile } = geometry;
  if (!thruster) {
    return;
  }
  const tailX = axis.percentToSideX(1);
  const baseY = 100 + (profile.offsetY ?? 0) + (thruster.offsetY ?? 0);
  const group = document.createElementNS(SVG_NS, "g");
  const thrusterBodyColor = partColor("thruster", shadeColor(palette.secondary, -0.05));
  const thrusterNozzleColor = partColor(
    "thruster",
    mixColor(palette.secondary, palette.accent, 0.35),
  );
  const exhaustColor = partColor("exhaust", thruster.glow);
  const debugEnabled = isDebugColorsEnabled();

  for (let i = 0; i < thruster.count; i += 1) {
    const offset = i - (thruster.count - 1) / 2;
    const y = baseY + offset * thruster.spacing;
    const housing = document.createElementNS(SVG_NS, "rect");
    const housingHeight = thruster.radius * 1.8;
    const housingWidth = thruster.radius * 1.6;
    housing.setAttribute("x", (tailX - thruster.nozzleLength - housingWidth).toString());
    housing.setAttribute("y", (y - housingHeight / 2).toString());
    housing.setAttribute("width", housingWidth.toString());
    housing.setAttribute("height", housingHeight.toString());
    housing.setAttribute("rx", (thruster.radius * 0.4).toString());
    housing.setAttribute("fill", thrusterBodyColor);
    housing.setAttribute("stroke", palette.trim);
    housing.setAttribute("stroke-width", 1.4);

    const nozzle = document.createElementNS(SVG_NS, "rect");
    nozzle.setAttribute("x", (tailX - thruster.nozzleLength).toString());
    nozzle.setAttribute("y", (y - thruster.radius * 0.75).toString());
    nozzle.setAttribute("width", thruster.nozzleLength.toString());
    nozzle.setAttribute("height", (thruster.radius * 1.5).toString());
    nozzle.setAttribute("rx", (thruster.radius * 0.3).toString());
    nozzle.setAttribute("fill", thrusterNozzleColor);
    nozzle.setAttribute("stroke", palette.trim);
    nozzle.setAttribute("stroke-width", 1.2);

    const flame = document.createElementNS(SVG_NS, "polygon");
    const flameReach = Math.max(thruster.nozzleLength * 0.85, thruster.radius * 1.2);
    const flamePoints = [
      [tailX, y - thruster.radius * 0.35],
      [tailX + flameReach, y],
      [tailX, y + thruster.radius * 0.35],
    ];
    flame.setAttribute("points", pointsToString(flamePoints));
    flame.setAttribute("fill", exhaustColor);
    flame.setAttribute("opacity", "0.85");
    flame.classList.add("thruster-flame", "thruster-flame--horizontal");

    const glow = document.createElementNS(SVG_NS, "circle");
    glow.setAttribute("cx", tailX.toString());
    glow.setAttribute("cy", y.toString());
    glow.setAttribute("r", (thruster.radius * 0.85).toString());
    glow.setAttribute("fill", exhaustColor);
    glow.setAttribute("opacity", "0.85");

    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("cx", tailX.toString());
    core.setAttribute("cy", y.toString());
    core.setAttribute("r", (thruster.radius * 0.4).toString());
    core.setAttribute(
      "fill",
      debugEnabled ? exhaustColor : mixColor(thruster.glow, "#ffffff", 0.5),
    );
    core.setAttribute("opacity", "0.9");

    group.append(housing, nozzle, flame, glow, core);
  }

  root.appendChild(group);
}

export function drawSideWeapons(root, config, geometry, axis) {
  const { palette } = config;
  const { armament, profile, wing } = geometry;
  if (!armament) {
    return;
  }

  if (armament.mount === "wing" && wing?.enabled && armament.hardpoints?.length) {
    const centerY = 100 + (profile.offsetY ?? 0);
    const wingBaseY = centerY + wing.mountHeight + wing.thickness;

    armament.hardpoints.forEach((hardpoint) => {
      const normalized = normalizeWingHardpoint(
        hardpoint,
        armament,
        palette,
        {
          positionPercent: wing.positionPercent,
          lengthPercent: wing.lengthPercent,
          length: wing.length,
          thickness: wing.thickness,
          span: wing.profileSpan,
        },
      );
      if (!normalized) {
        return;
      }

      const anchorPercent = normalized.anchorPercent ?? wing.positionPercent;
      const anchorX = axis.percentToSideX(anchorPercent);
      const pylonTop = wingBaseY - 1;
      const pylonBottom = pylonTop + normalized.pylonLength;
      const payloadCenterY = pylonBottom + normalized.payloadRadius;
      const bodyHeight = normalized.sideProfile.bodyHeight;
      const bodyX = anchorX - normalized.payloadLength * 0.55;

      const group = document.createElementNS(SVG_NS, "g");
      group.classList.add("wing-ordnance");

      const pylon = document.createElementNS(SVG_NS, "rect");
      pylon.setAttribute("x", (anchorX - 2).toString());
      pylon.setAttribute("y", pylonTop.toString());
      pylon.setAttribute("width", "4");
      pylon.setAttribute("height", (normalized.pylonLength + 2).toString());
      pylon.setAttribute("rx", "1.6");
      pylon.setAttribute("fill", normalized.colors.pylon);
      pylon.setAttribute("stroke", normalized.colors.accent);
      pylon.setAttribute("stroke-width", 1);

      const bodyRect = document.createElementNS(SVG_NS, "rect");
      bodyRect.setAttribute("x", bodyX.toString());
      bodyRect.setAttribute("y", (payloadCenterY - bodyHeight / 2).toString());
      bodyRect.setAttribute("width", normalized.payloadLength.toString());
      bodyRect.setAttribute("height", bodyHeight.toString());
      bodyRect.setAttribute(
        "rx",
        (
          armament.type === "bomb"
            ? normalized.payloadRadius
            : normalized.payloadRadius * 0.5
        ).toString(),
      );
      bodyRect.setAttribute("fill", normalized.colors.ordnance);
      bodyRect.setAttribute("stroke", normalized.colors.accent);
      bodyRect.setAttribute("stroke-width", 1.1);

      group.append(pylon, bodyRect);

      if (armament.type === "missile") {
        const tip = document.createElementNS(SVG_NS, "polygon");
        const tipPoints = [
          [bodyX, payloadCenterY - bodyHeight / 2],
          [bodyX - normalized.sideProfile.tipLength, payloadCenterY],
          [bodyX, payloadCenterY + bodyHeight / 2],
        ];
        tip.setAttribute("points", pointsToString(tipPoints));
        tip.setAttribute("fill", normalized.colors.tip);
        tip.setAttribute("stroke", normalized.colors.accent);
        tip.setAttribute("stroke-width", 1);

        const fins = document.createElementNS(SVG_NS, "polygon");
        const finBaseX = bodyX + normalized.payloadLength;
        const finPoints = [
          [finBaseX, payloadCenterY - normalized.sideProfile.finSpread],
          [finBaseX + normalized.sideProfile.finLength, payloadCenterY],
          [finBaseX, payloadCenterY + normalized.sideProfile.finSpread],
        ];
        fins.setAttribute("points", pointsToString(finPoints));
        fins.setAttribute("fill", normalized.colors.fin);
        fins.setAttribute("stroke", normalized.colors.accent);
        fins.setAttribute("stroke-width", 1);

        group.append(tip, fins);
      }

      root.appendChild(group);
    });

    return;
  }

  const noseX = axis.percentToSideX(armament.mountPercent ?? 0);
  const baseX = noseX - armament.length;
  const baseY = 100 + (profile.offsetY ?? 0) + (armament.offsetY ?? 0);

  for (let i = 0; i < armament.barrels; i += 1) {
    const offset = i - (armament.barrels - 1) / 2;
    const y = baseY + offset * armament.spacing;

    const housing = document.createElementNS(SVG_NS, "rect");
    const housingWidth = armament.length * 0.3;
    housing.setAttribute("x", (noseX - housingWidth).toString());
    housing.setAttribute("y", (y - armament.housingHeight / 2).toString());
    housing.setAttribute("width", housingWidth.toString());
    housing.setAttribute("height", armament.housingHeight.toString());
    housing.setAttribute("rx", (armament.housingHeight * 0.25).toString());
    housing.setAttribute("fill", partColor("weapons", shadeColor(palette.secondary, -0.1)));
    housing.setAttribute("stroke", partStroke("weapons", palette.trim));
    housing.setAttribute("stroke-width", 1.2);

    const barrel = document.createElementNS(SVG_NS, "line");
    barrel.setAttribute("x1", baseX.toString());
    barrel.setAttribute("y1", y.toString());
    barrel.setAttribute("x2", (noseX + 2).toString());
    barrel.setAttribute("y2", (y - armament.housingHeight * 0.1).toString());
    barrel.setAttribute("stroke", partStroke("weapons", palette.trim));
    barrel.setAttribute("stroke-width", 2.2);
    barrel.setAttribute("stroke-linecap", "round");

    const muzzle = document.createElementNS(SVG_NS, "circle");
    muzzle.setAttribute("cx", baseX.toString());
    muzzle.setAttribute("cy", y.toString());
    muzzle.setAttribute("r", (armament.housingHeight * 0.25).toString());
    muzzle.setAttribute("fill", partColor("weapons", shadeColor(palette.accent, -0.2)));

    root.append(housing, barrel, muzzle);
  }
}

export function drawSideMarkings(root, config, geometry, axis) {
  const { palette } = config;
  const { markings, profile } = geometry;
  if (!markings?.enabled) {
    return;
  }
  const startPercent = clamp(markings.stripeStartPercent ?? 0, 0, 1);
  const startX = axis.percentToSideX(startPercent);
  const endLimitPercent = clamp(
    Math.min(markings.stripeEndPercent ?? 1, 1 - (profile.tailLength / profile.length) * 0.6),
    0,
    1,
  );
  const endX = axis.percentToSideX(endLimitPercent);
  const midY = 100 + (profile.offsetY ?? 0) + (markings.stripeLift ?? 0);
  const stripeHeight = markings.stripeHeight;

  const stripe = document.createElementNS(SVG_NS, "path");
  const stripePath = [
    `M ${startX} ${midY - stripeHeight * 0.6}`,
    `L ${endX} ${midY - stripeHeight * 0.3}`,
    `L ${endX} ${midY + stripeHeight * 0.4}`,
    `L ${startX} ${midY + stripeHeight * 0.2}`,
    "Z",
  ].join(" ");
  stripe.setAttribute("d", stripePath);
  stripe.setAttribute("fill", partColor("markings", palette.accent));
  stripe.setAttribute("opacity", "0.65");
  stripe.setAttribute("stroke", partStroke("markings", mixColor(palette.accent, palette.trim, 0.3)));
  stripe.setAttribute("stroke-width", 1.4);
  stripe.setAttribute("stroke-linejoin", "round");
  root.appendChild(stripe);
}

export function drawSideLights(root, config, geometry, axis) {
  const { palette } = config;
  const { lights, profile } = geometry;
  if (!lights) {
    return;
  }
  const noseX = axis.percentToSideX(0);
  const tailX = axis.percentToSideX(1);
  const centerY = 100 + (profile.offsetY ?? 0);
  const debugEnabled = isDebugColorsEnabled();

  if (lights.nose) {
    const noseLight = document.createElementNS(SVG_NS, "circle");
    noseLight.setAttribute("cx", (noseX - 4).toString());
    noseLight.setAttribute("cy", (centerY - profile.noseHeight * 0.1).toString());
    noseLight.setAttribute("r", "2.6");
    noseLight.setAttribute("fill", partColor("lights", palette.glow));
    noseLight.setAttribute("opacity", "0.85");
    root.appendChild(noseLight);
  }

  if (lights.dorsal) {
    const dorsal = document.createElementNS(SVG_NS, "circle");
    const dorsalPercent = clamp((profile.noseLength + profile.length * 0.36) / profile.length, 0, 1);
    dorsal.setAttribute("cx", axis.percentToSideX(dorsalPercent).toString());
    dorsal.setAttribute("cy", (centerY - profile.dorsalHeight - 6).toString());
    dorsal.setAttribute("r", "2.2");
    dorsal.setAttribute(
      "fill",
      debugEnabled ? partColor("lights", palette.glow) : mixColor(palette.glow, "#ffffff", 0.2),
    );
    dorsal.setAttribute("opacity", "0.75");
    root.appendChild(dorsal);
  }

  if (lights.intake && profile.intakeHeight > 0) {
    const intake = document.createElementNS(SVG_NS, "circle");
    const intakePercent = clamp((profile.noseLength * 0.7) / profile.length, 0, 1);
    intake.setAttribute("cx", axis.percentToSideX(intakePercent).toString());
    intake.setAttribute("cy", (centerY + profile.ventralDepth - 6).toString());
    intake.setAttribute("r", "2.4");
    intake.setAttribute(
      "fill",
      debugEnabled ? partColor("lights", palette.glow) : mixColor(palette.glow, palette.trim, 0.4),
    );
    intake.setAttribute("opacity", "0.7");
    root.appendChild(intake);
  }

  const tailBeacon = document.createElementNS(SVG_NS, "circle");
  tailBeacon.setAttribute("cx", tailX.toString());
  tailBeacon.setAttribute("cy", (centerY - profile.tailHeight * 0.3).toString());
  tailBeacon.setAttribute("r", "2");
  tailBeacon.setAttribute("fill", partColor("lights", palette.trim));
  tailBeacon.setAttribute("opacity", "0.6");
  root.appendChild(tailBeacon);
}
