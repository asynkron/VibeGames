import {
  buildSideHullGeometry,
  buildSidePanelLines,
  buildSegmentDividerPath,
  buildSideIntakePath,
  getWingSidePoints,
  getDeltaWingSide,
  pointsToString,
} from "./renderParts.js";
import { clamp, lerp } from "./math.js";
import { mixColor, shadeColor } from "./color.js";
import { isDebugColorsEnabled, nextRenderId, partColor, partStroke } from "./renderContext.js";
import { createSvgElement } from "./svgUtils.js";

export function drawSideViewSpaceship(root, config, geometry, defs) {
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
  const group = createSvgElement("g");

  const hullGeometry = buildSideHullGeometry(profile);

  if (hullGeometry.segmentPaths) {
    const segmentOrder = ["front", "mid", "rear"];
    const shading = [0.08, 0, -0.08];
    segmentOrder.forEach((key, index) => {
      const pathData = hullGeometry.segmentPaths[key];
      if (!pathData) {
        return;
      }
      const segment = createSvgElement("path", {
        d: pathData,
        fill: partColor("hull", shadeColor(palette.primary, shading[index] ?? 0)),
        stroke: "none",
      });
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
        const seams = createSvgElement("path", {
          d: seamCommands.join(" "),
          stroke: mixColor(palette.trim, palette.accent, 0.4),
          "stroke-width": 1.2,
          "stroke-linecap": "round",
          fill: "none",
          opacity: "0.75",
        });
        group.appendChild(seams);
      }
    }

    const outline = createSvgElement("path", {
      d: hullGeometry.hullPath,
      fill: "none",
      stroke: palette.accent,
      "stroke-width": 2.4,
      "stroke-linejoin": "round",
    });
    group.appendChild(outline);
  } else {
    const hull = createSvgElement("path", {
      d: hullGeometry.hullPath,
      fill: partColor("hull", palette.primary),
      stroke: palette.accent,
      "stroke-width": 2.4,
      "stroke-linejoin": "round",
    });
    group.appendChild(hull);
  }

  if (profile.plating) {
    const plating = createSvgElement("path", {
      d: buildSidePanelLines(profile),
      stroke: mixColor(palette.trim, palette.accent, 0.4),
      "stroke-width": 1.2,
      "stroke-linecap": "round",
      fill: "none",
      opacity: "0.6",
    });
    group.appendChild(plating);
  }

  if (profile.intakeHeight > 0 && profile.intakeDepth > 0) {
    const intake = createSvgElement("path", {
      d: buildSideIntakePath(profile),
      fill: partColor("hull", shadeColor(palette.secondary, -0.2)),
      stroke: palette.trim,
      "stroke-width": 1.2,
    });
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

  const mast = createSvgElement("line", {
    x1: String(baseX),
    y1: String(baseY),
    x2: String(tipX),
    y2: String(tipY),
    stroke: partStroke("details", palette.trim),
    "stroke-width": 1.4,
    "stroke-linecap": "round",
  });

  const beacon = createSvgElement("circle", {
    cx: String(tipX),
    cy: String(tipY - antenna.beaconRadius * 0.2),
    r: String(antenna.beaconRadius),
    fill: partColor("lights", palette.glow),
    opacity: "0.85",
  });

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

  const wing = createSvgElement("polygon", {
    points: pointsToString(points),
    fill: partColor("wing", shadeColor(palette.secondary, -0.1)),
    stroke: palette.trim,
    "stroke-width": 1.8,
    "stroke-linejoin": "round",
  });
  root.appendChild(wing);

  if (wingProfile.accent) {
    const accent = createSvgElement("polyline", {
      points: pointsToString([points[0], points[1], points[2]]),
      stroke: partStroke("wing", palette.accent),
      "stroke-width": 2,
      fill: "none",
    });
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

  const finPoints = [
    [tailBase, baseY],
    [tailBase + stabiliser.length * 0.48, baseY - stabiliser.height],
    [tailBase + stabiliser.length, baseY - stabiliser.height * 0.55],
    [tailBase + stabiliser.length * 0.22, baseY + stabiliser.thickness * 0.2],
  ];
  const fin = createSvgElement("polygon", {
    points: pointsToString(finPoints),
    fill: partColor("stabiliser", shadeColor(palette.secondary, 0.05)),
    stroke: partStroke("stabiliser", palette.trim),
    "stroke-width": 1.6,
    "stroke-linejoin": "round",
  });
  root.appendChild(fin);

  if (stabiliser.ventral) {
    const ventralPoints = [
      [tailBase + stabiliser.length * 0.18, baseY + stabiliser.thickness * 0.3],
      [tailBase + stabiliser.length * 0.52, baseY + stabiliser.height * 0.6],
      [tailBase + stabiliser.length * 0.78, baseY + stabiliser.height * 0.5],
      [tailBase + stabiliser.length * 0.32, baseY + stabiliser.thickness * 0.1],
    ];
    const ventral = createSvgElement("polygon", {
      points: pointsToString(ventralPoints),
      fill: partColor("stabiliser", shadeColor(palette.secondary, -0.15)),
      stroke: partStroke("stabiliser", palette.trim),
      "stroke-width": 1.4,
      "stroke-linejoin": "round",
    });
    root.appendChild(ventral);
  }
}

export function drawSideCanopy(root, config, geometry, axis, defs) {
  const { palette } = config;
  const { canopy, profile } = geometry;
  if (!canopy) {
    return;
  }

  const gradientId = `side-canopy-${config.id}-${nextRenderId()}`;
  const gradient = createSvgElement("linearGradient", {
    id: gradientId,
    x1: "0%",
    x2: "100%",
    y1: "0%",
    y2: "100%",
  });

  const debugEnabled = isDebugColorsEnabled();
  const canopyColor = partColor("canopy", canopy.tint);
  const highlightColor = debugEnabled ? canopyColor : mixColor(canopy.tint, "#ffffff", 0.4);
  const midColor = debugEnabled ? canopyColor : canopy.tint;
  const shadowColor = debugEnabled ? canopyColor : shadeColor(canopy.tint, -0.3);

  const stop1 = createSvgElement("stop", {
    offset: "0%",
    "stop-color": highlightColor,
    "stop-opacity": "0.9",
  });
  const stop2 = createSvgElement("stop", {
    offset: "65%",
    "stop-color": midColor,
    "stop-opacity": "0.95",
  });
  const stop3 = createSvgElement("stop", {
    offset: "100%",
    "stop-color": shadowColor,
    "stop-opacity": "0.9",
  });
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

  const canopyPath = [
    `M ${baseX} ${baseStartY}`,
    `Q ${apexX} ${apexY} ${endX} ${baseEndY}`,
    `Q ${apexX} ${Math.max(baseStartY, baseEndY) - canopy.height * 0.25} ${baseX} ${baseStartY}`,
    "Z",
  ].join(" ");
  const canopyShape = createSvgElement("path", {
    d: canopyPath,
    fill: `url(#${gradientId})`,
    stroke: debugEnabled ? canopyColor : palette.trim,
    "stroke-width": canopy.frame,
    "stroke-linejoin": "round",
  });
  root.appendChild(canopyShape);

  const framePath = `M ${frameStartX} ${frameStartY} Q ${apexX} ${frameApexY} ${frameEndX} ${frameEndY}`;
  const frame = createSvgElement("path", {
    d: framePath,
    stroke: debugEnabled ? canopyColor : mixColor(palette.trim, palette.accent, 0.5),
    "stroke-width": canopy.frame * 0.7,
    "stroke-linecap": "round",
    fill: "none",
  });
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
    const rib = createSvgElement("path", {
      d: `M ${bottomPoint.x.toFixed(2)} ${bottomPoint.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${topPoint.x.toFixed(2)} ${topPoint.y.toFixed(2)}`,
      stroke: ribColor,
      "stroke-width": ribStroke,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      fill: "none",
      opacity: debugEnabled ? "1" : "0.9",
    });
    root.appendChild(rib);
  });

  if (Number.isFinite(canopy.beltRatio)) {
    const beltRatio = clamp(canopy.beltRatio, 0.1, 0.9);
    const beltStroke = Math.max(0.6, canopy.frame * (canopy.beltStrokeScale ?? 0.55));
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
    const belt = createSvgElement("path", {
      d: commands.join(" "),
      stroke: debugEnabled ? canopyColor : mixColor(palette.trim, palette.accent, 0.4),
      "stroke-width": beltStroke,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      fill: "none",
      opacity: debugEnabled ? "1" : "0.85",
    });
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
  const group = createSvgElement("g");
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
    const housingHeight = thruster.radius * 1.8;
    const housingWidth = thruster.radius * 1.6;
    const housing = createSvgElement("rect", {
      x: String(tailX - thruster.nozzleLength - housingWidth),
      y: String(y - housingHeight / 2),
      width: String(housingWidth),
      height: String(housingHeight),
      rx: String(thruster.radius * 0.4),
      fill: thrusterBodyColor,
      stroke: palette.trim,
      "stroke-width": 1.4,
    });

    const nozzle = createSvgElement("rect", {
      x: String(tailX - thruster.nozzleLength),
      y: String(y - thruster.radius * 0.75),
      width: String(thruster.nozzleLength),
      height: String(thruster.radius * 1.5),
      rx: String(thruster.radius * 0.3),
      fill: thrusterNozzleColor,
      stroke: palette.trim,
      "stroke-width": 1.2,
    });

    const flameReach = Math.max(thruster.nozzleLength * 0.85, thruster.radius * 1.2);
    const flamePoints = [
      [tailX, y - thruster.radius * 0.35],
      [tailX + flameReach, y],
      [tailX, y + thruster.radius * 0.35],
    ];
    const flame = createSvgElement(
      "polygon",
      {
        points: pointsToString(flamePoints),
        fill: exhaustColor,
        opacity: "0.85",
      },
      ["thruster-flame", "thruster-flame--horizontal"],
    );

    const glow = createSvgElement("circle", {
      cx: String(tailX),
      cy: String(y),
      r: String(thruster.radius * 0.85),
      fill: exhaustColor,
      opacity: "0.85",
    });

    const core = createSvgElement("circle", {
      cx: String(tailX),
      cy: String(y),
      r: String(thruster.radius * 0.4),
      fill: debugEnabled ? exhaustColor : mixColor(thruster.glow, "#ffffff", 0.5),
      opacity: "0.9",
    });

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
    const ordnanceColor = partColor("weapons", shadeColor(palette.secondary, -0.1));
    const pylonColor = partColor("weapons", shadeColor(palette.secondary, -0.25));
    const accentColor = partStroke("weapons", palette.trim);
    const tipColor = partColor("weapons", mixColor(palette.accent, palette.secondary, 0.4));

    armament.hardpoints.forEach((hardpoint) => {
      const anchorPercent = clamp(wing.positionPercent + wing.lengthPercent * hardpoint.chordRatio, 0, 1);
      const anchorX = axis.percentToSideX(anchorPercent);
      const pylonLength = hardpoint.pylonLength ?? Math.max(wing.thickness * 0.6, 8);
      const payloadLength = hardpoint.payloadLength ?? Math.max(18, wing.length * 0.3);
      const payloadRadius = hardpoint.payloadRadius ?? Math.max(5, wing.thickness * 0.35);
      const pylonTop = wingBaseY - 1;
      const pylonBottom = pylonTop + pylonLength;
      const payloadCenterY = pylonBottom + payloadRadius;
      const bodyHeight = payloadRadius * 2;
      const bodyX = anchorX - payloadLength * 0.55;

      const group = createSvgElement("g", {}, "wing-ordnance");

      const pylon = createSvgElement("rect", {
        x: String(anchorX - 2),
        y: String(pylonTop),
        width: "4",
        height: String(pylonLength + 2),
        rx: "1.6",
        fill: pylonColor,
        stroke: accentColor,
        "stroke-width": 1,
      });

      const bodyRect = createSvgElement("rect", {
        x: String(bodyX),
        y: String(payloadCenterY - bodyHeight / 2),
        width: String(payloadLength),
        height: String(bodyHeight),
        rx: String(armament.type === "bomb" ? payloadRadius : payloadRadius * 0.5),
        fill: ordnanceColor,
        stroke: accentColor,
        "stroke-width": 1.1,
      });

      group.append(pylon, bodyRect);

      if (armament.type === "missile") {
        const tipPoints = [
          [bodyX, payloadCenterY - bodyHeight / 2],
          [bodyX - payloadLength * 0.22, payloadCenterY],
          [bodyX, payloadCenterY + bodyHeight / 2],
        ];
        const tip = createSvgElement("polygon", {
          points: pointsToString(tipPoints),
          fill: tipColor,
          stroke: accentColor,
          "stroke-width": 1,
        });

        const finBaseX = bodyX + payloadLength;
        const finSpread = Math.max(3, payloadRadius * 0.8);
        const finPoints = [
          [finBaseX, payloadCenterY - finSpread],
          [finBaseX + payloadLength * 0.18, payloadCenterY],
          [finBaseX, payloadCenterY + finSpread],
        ];
        const fins = createSvgElement("polygon", {
          points: pointsToString(finPoints),
          fill: partColor("weapons", shadeColor(palette.accent, -0.15)),
          stroke: accentColor,
          "stroke-width": 1,
        });

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

    const housingWidth = armament.length * 0.3;
    const housing = createSvgElement("rect", {
      x: String(noseX - housingWidth),
      y: String(y - armament.housingHeight / 2),
      width: String(housingWidth),
      height: String(armament.housingHeight),
      rx: String(armament.housingHeight * 0.25),
      fill: partColor("weapons", shadeColor(palette.secondary, -0.1)),
      stroke: partStroke("weapons", palette.trim),
      "stroke-width": 1.2,
    });

    const barrel = createSvgElement("line", {
      x1: String(baseX),
      y1: String(y),
      x2: String(noseX + 2),
      y2: String(y - armament.housingHeight * 0.1),
      stroke: partStroke("weapons", palette.trim),
      "stroke-width": 2.2,
      "stroke-linecap": "round",
    });

    const muzzle = createSvgElement("circle", {
      cx: String(baseX),
      cy: String(y),
      r: String(armament.housingHeight * 0.25),
      fill: partColor("weapons", shadeColor(palette.accent, -0.2)),
    });

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

  const stripePath = [
    `M ${startX} ${midY - stripeHeight * 0.6}`,
    `L ${endX} ${midY - stripeHeight * 0.3}`,
    `L ${endX} ${midY + stripeHeight * 0.4}`,
    `L ${startX} ${midY + stripeHeight * 0.2}`,
    "Z",
  ].join(" ");
  const stripe = createSvgElement("path", {
    d: stripePath,
    fill: partColor("markings", palette.accent),
    opacity: "0.65",
    stroke: partStroke("markings", mixColor(palette.accent, palette.trim, 0.3)),
    "stroke-width": 1.4,
    "stroke-linejoin": "round",
  });
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
    const noseLight = createSvgElement("circle", {
      cx: String(noseX - 4),
      cy: String(centerY - profile.noseHeight * 0.1),
      r: "2.6",
      fill: partColor("lights", palette.glow),
      opacity: "0.85",
    });
    root.appendChild(noseLight);
  }

  if (lights.dorsal) {
    const dorsalPercent = clamp((profile.noseLength + profile.length * 0.36) / profile.length, 0, 1);
    const dorsal = createSvgElement("circle", {
      cx: axis.percentToSideX(dorsalPercent).toString(),
      cy: (centerY - profile.dorsalHeight - 6).toString(),
      r: "2.2",
      fill: debugEnabled ? partColor("lights", palette.glow) : mixColor(palette.glow, "#ffffff", 0.2),
      opacity: "0.75",
    });
    root.appendChild(dorsal);
  }

  if (lights.intake && profile.intakeHeight > 0) {
    const intakePercent = clamp((profile.noseLength * 0.7) / profile.length, 0, 1);
    const intake = createSvgElement("circle", {
      cx: axis.percentToSideX(intakePercent).toString(),
      cy: (centerY + profile.ventralDepth - 6).toString(),
      r: "2.4",
      fill: debugEnabled ? partColor("lights", palette.glow) : mixColor(palette.glow, palette.trim, 0.4),
      opacity: "0.7",
    });
    root.appendChild(intake);
  }

  const tailBeacon = createSvgElement("circle", {
    cx: tailX.toString(),
    cy: (centerY - profile.tailHeight * 0.3).toString(),
    r: "2",
    fill: partColor("lights", palette.trim),
    opacity: "0.6",
  });
  root.appendChild(tailBeacon);
}
