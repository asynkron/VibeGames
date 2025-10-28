import { getWingSidePoints, getDeltaWingSide, getSideHull, pointsToString } from "./renderParts.js";
import { clamp, lerp } from "./math.js";
import { mixColor, shadeColor } from "./color.js";
import { isDebugColorsEnabled, nextRenderId, partColor, partStroke } from "./renderContext.js";
import { createSvgElement } from "./svgUtils.js";

function getSideProfile(geometry) {
  return geometry?.profile ?? geometry?.body?.side ?? null;
}

function getSideWing(geometry) {
  return geometry?.wing ?? geometry?.wings?.side ?? null;
}

export function drawSideViewSpaceship(root, config, geometry, defs) {
  const axis = geometry.axis;
  drawSideWing(root, config, geometry, axis);
  drawSideBody(root, config, geometry, defs);
  drawSideStabiliser(root, config, geometry, axis);
  drawSideMarkings(root, config, geometry, axis);
  drawSideCanopy(root, config, geometry, axis, defs);
  drawSideEngines(root, config, geometry, axis);
  drawSideWeapons(root, config, geometry, axis);
  drawSideLights(root, config, geometry, axis);
  drawSideAntenna(root, config, geometry, axis);
}

export function drawSideBody(root, config, geometry, defs) {
  const { palette, category } = config;
  const profile = getSideProfile(geometry);
  if (!profile) {
    return;
  }

  const hull = getSideHull(profile);
  if (!hull?.path) {
    return;
  }

  const debugEnabled = isDebugColorsEnabled();
  const styleKey = profile.style ?? "normal";
  const hullGroup = createSvgElement("g", {}, "hull-side");

  let fill = partColor("hull", palette.primary);
  if (!debugEnabled && defs) {
    const gradientId = `side-hull-${config.id}-${nextRenderId()}`;
    const gradient = createSvgElement("linearGradient", {
      id: gradientId,
      x1: "0%",
      y1: "0%",
      x2: "0%",
      y2: "100%",
    });

    // Blend top/mid/bottom tones so each style reads as streamlined or bulky at a glance.
    const gradientProfile = getHullGradientProfile(styleKey, category);
    const highlightColor = mixColor(palette.primary, "#ffffff", gradientProfile.highlightMix);
    const midColor = mixColor(palette.primary, palette.secondary, gradientProfile.midMix);
    const shadowColor = shadeColor(palette.primary, -gradientProfile.shadowMix);

    const stopTop = createSvgElement("stop", {
      offset: "0%",
      "stop-color": highlightColor,
      "stop-opacity": "0.95",
    });
    const stopMid = createSvgElement("stop", {
      offset: `${Math.round(gradientProfile.midOffset * 100)}%`,
      "stop-color": midColor,
      "stop-opacity": "0.92",
    });
    const stopBottom = createSvgElement("stop", {
      offset: "100%",
      "stop-color": shadowColor,
      "stop-opacity": "0.97",
    });
    gradient.append(stopTop, stopMid, stopBottom);
    defs.appendChild(gradient);
    fill = `url(#${gradientId})`;
  }

  const hullPath = createSvgElement("path", {
    d: hull.path,
    fill,
    stroke: partStroke("hull", palette.trim),
    "stroke-width": 2,
    "stroke-linejoin": "round",
  });
  hullGroup.appendChild(hullPath);

  if (!debugEnabled && hull.segments?.length && category !== "biplane") {
    hull.segments.forEach((segment, index) => {
      const tint = index === 0 ? "#ffffff" : index === hull.segments.length - 1 ? palette.accent : palette.secondary;
      const overlay = createSvgElement("path", {
        d: segment.path,
        // Subtle overlays break up the fuselage and reinforce the factory-specific silhouette.
        fill: mixColor(palette.primary, tint, index === 0 ? 0.22 : index === hull.segments.length - 1 ? 0.28 : 0.18),
        opacity: (styleKey === "bulky" ? 0.18 : 0.14).toString(),
      });
      hullGroup.appendChild(overlay);
    });
  }

  root.appendChild(hullGroup);

  if (!debugEnabled) {
    const ratios = getHullHighlightRatios(styleKey, category);
    const highlightPath = buildInterpolatedPath(hull.top, hull.bottom, ratios.highlightRatio);
    if (highlightPath) {
      const highlightStroke = createSvgElement("path", {
        d: highlightPath,
        stroke: partStroke("hull", mixColor(palette.primary, "#ffffff", 0.65)),
        "stroke-width": 1.4,
        "stroke-linecap": "round",
        fill: "none",
        opacity: "0.6",
      });
      root.appendChild(highlightStroke);
    }

    const shadowPath = buildInterpolatedPath(hull.top, hull.bottom, ratios.shadowRatio);
    if (shadowPath) {
      const shadowStroke = createSvgElement("path", {
        d: shadowPath,
        stroke: partStroke("hull", shadeColor(palette.primary, -0.45)),
        "stroke-width": 1.6,
        "stroke-linecap": "round",
        fill: "none",
        opacity: "0.45",
      });
      root.appendChild(shadowStroke);
    }
  }
}

function getHullGradientProfile(style, category) {
  if (category === "biplane") {
    return { highlightMix: 0.2, midMix: 0.06, shadowMix: 0.32, midOffset: 0.52 };
  }
  switch (style) {
    case "skinny":
      return { highlightMix: 0.4, midMix: 0.08, shadowMix: 0.26, midOffset: 0.44 };
    case "bulky":
      return { highlightMix: 0.28, midMix: 0.14, shadowMix: 0.42, midOffset: 0.6 };
    default:
      return { highlightMix: 0.34, midMix: 0.1, shadowMix: 0.32, midOffset: 0.52 };
  }
}

function getHullHighlightRatios(style, category) {
  if (category === "biplane") {
    return { highlightRatio: 0.5, shadowRatio: 0.86 };
  }
  switch (style) {
    case "skinny":
      return { highlightRatio: 0.3, shadowRatio: 0.84 };
    case "bulky":
      return { highlightRatio: 0.42, shadowRatio: 0.9 };
    default:
      return { highlightRatio: 0.36, shadowRatio: 0.88 };
  }
}

function buildInterpolatedPath(topPoints, bottomPoints, ratio) {
  if (!Array.isArray(topPoints) || !Array.isArray(bottomPoints)) {
    return "";
  }
  const count = Math.min(topPoints.length, bottomPoints.length);
  if (count === 0) {
    return "";
  }
  const clampedRatio = clamp(ratio, 0, 1);
  const segments = [];
  for (let i = 0; i < count; i += 1) {
    const topPoint = topPoints[i];
    const bottomPoint = bottomPoints[i];
    if (!topPoint || !bottomPoint) {
      continue;
    }
    const x = topPoint[0];
    const y = lerp(bottomPoint[1], topPoint[1], clampedRatio);
    segments.push(`${segments.length === 0 ? "M" : "L"} ${x} ${y}`);
  }
  return segments.join(" ");
}

export function drawSideAntenna(root, config, geometry, axis) {
  const { palette } = config;
  const { antenna } = geometry;
  const profile = getSideProfile(geometry);
  if (!antenna || !profile) {
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
  const profile = getSideProfile(geometry);
  const wingProfile = getSideWing(geometry);
  if (!profile || !wingProfile?.enabled) {
    return;
  }
  const layers = Array.isArray(wingProfile.layers) && wingProfile.layers.length
    ? wingProfile.layers
    : [wingProfile];

  layers.forEach((layer) => {
    if (!layer?.enabled) {
      return;
    }
    const layerPoints = layer.style === "delta"
      ? getDeltaWingSide(config, layer, profile, axis)
      : getWingSidePoints(layer, profile, axis);
    if (!layerPoints) {
      return;
    }

    const wing = createSvgElement("polygon", {
      points: pointsToString(layerPoints),
      fill: partColor("wing", shadeColor(palette.secondary, -0.1)),
      stroke: palette.trim,
      "stroke-width": 1.8,
      "stroke-linejoin": "round",
    });
    root.appendChild(wing);

    if (layer.accent) {
      const accent = createSvgElement("polyline", {
        points: pointsToString([layerPoints[0], layerPoints[1], layerPoints[2]]),
        stroke: partStroke("wing", palette.accent),
        "stroke-width": 2,
        fill: "none",
      });
      root.appendChild(accent);
    }
  });
}

export function drawSideStabiliser(root, config, geometry, axis) {
  const { palette } = config;
  const { stabiliser } = geometry;
  const profile = getSideProfile(geometry);
  if (!stabiliser || !profile) {
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
  const { canopy } = geometry;
  const profile = getSideProfile(geometry);
  if (!canopy || !profile) {
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

export function drawSideEngines(root, config, geometry, axis) {
  const { palette } = config;
  const { engine } = geometry;
  const profile = getSideProfile(geometry);
  if (!engine || !profile) {
    return;
  }
  if (engine.type === "propeller") {
    drawSidePropellers(root, palette, engine, profile, axis);
  } else {
    drawSideJetExhaust(root, palette, engine, profile, axis);
  }
}

function drawSideJetExhaust(root, palette, engine, profile, axis) {
  const tailX = axis.percentToSideX(engine.mountPercent ?? 1);
  const baseY = 100 + (profile.offsetY ?? 0) + (engine.offsetY ?? 0);
  const group = createSvgElement("g");
  const bodyColor = partColor("thruster", shadeColor(palette.secondary, -0.05));
  const nozzleColor = partColor("thruster", mixColor(palette.secondary, palette.accent, 0.35));
  const exhaustColor = partColor("exhaust", engine.glow);
  const debugEnabled = isDebugColorsEnabled();

  for (let i = 0; i < engine.count; i += 1) {
    const offset = i - (engine.count - 1) / 2;
    const y = baseY + offset * engine.spacing;
    const housingHeight = engine.radius * 1.8;
    const housingWidth = engine.radius * 1.6;
    const housing = createSvgElement("rect", {
      x: String(tailX - engine.nozzleLength - housingWidth),
      y: String(y - housingHeight / 2),
      width: String(housingWidth),
      height: String(housingHeight),
      rx: String(engine.radius * 0.4),
      fill: bodyColor,
      stroke: palette.trim,
      "stroke-width": 1.4,
    });

    const nozzle = createSvgElement("rect", {
      x: String(tailX - engine.nozzleLength),
      y: String(y - engine.radius * 0.75),
      width: String(engine.nozzleLength),
      height: String(engine.radius * 1.5),
      rx: String(engine.radius * 0.3),
      fill: nozzleColor,
      stroke: palette.trim,
      "stroke-width": 1.2,
    });

    group.append(housing, nozzle);

    if (engine.hasFlame) {
      const flameReach = Math.max(engine.nozzleLength * 0.85, engine.radius * 1.2);
      const flamePoints = [
        [tailX, y - engine.radius * 0.35],
        [tailX + flameReach, y],
        [tailX, y + engine.radius * 0.35],
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
        r: String(engine.radius * 0.85),
        fill: exhaustColor,
        opacity: "0.85",
      });
      const core = createSvgElement("circle", {
        cx: String(tailX),
        cy: String(y),
        r: String(engine.radius * 0.4),
        fill: debugEnabled ? exhaustColor : mixColor(engine.glow, "#ffffff", 0.5),
        opacity: "0.9",
      });
      group.append(flame, glow, core);
    }
  }

  root.appendChild(group);
}

function drawSidePropellers(root, palette, engine, profile, axis) {
  const noseX = axis.percentToSideX(engine.mountPercent ?? 0);
  const baseY = 100 + (profile.offsetY ?? 0) + (engine.mountOffset ?? 0);
  const group = createSvgElement("g");
  const housingColor = partColor("thruster", shadeColor(palette.secondary, -0.05));
  const accentColor = partStroke("thruster", palette.trim);
  const bladeColor = partColor("thruster", mixColor(palette.secondary, palette.accent, 0.3));

  for (let i = 0; i < engine.count; i += 1) {
    const offset = i - (engine.count - 1) / 2;
    const y = baseY + offset * engine.spacing;
    const housingLength = engine.spinnerLength * 0.75;
    const housingHeight = engine.hubRadius * 2;

    const housing = createSvgElement("rect", {
      x: String(noseX - housingLength),
      y: String(y - housingHeight / 2),
      width: String(housingLength),
      height: String(housingHeight),
      rx: String(engine.hubRadius * 0.6),
      fill: housingColor,
      stroke: palette.trim,
      "stroke-width": 1.2,
    });

    const spinnerPoints = [
      [noseX - housingLength * 0.1, y - engine.hubRadius],
      [noseX + engine.spinnerLength, y],
      [noseX - housingLength * 0.1, y + engine.hubRadius],
    ];
    const spinner = createSvgElement("polygon", {
      points: pointsToString(spinnerPoints),
      fill: partColor("thruster", mixColor(palette.accent, palette.secondary, 0.55)),
      stroke: palette.trim,
      "stroke-width": 1.1,
    });

    const propX = noseX + engine.spinnerLength;
    const propDisc = createSvgElement("ellipse", {
      cx: String(propX),
      cy: String(y),
      rx: String(engine.bladeWidth * 1.2),
      ry: String(engine.radius),
      fill: "none",
      stroke: bladeColor,
      "stroke-width": 1.4,
      opacity: "0.75",
    });

    const hub = createSvgElement("circle", {
      cx: String(propX),
      cy: String(y),
      r: String(engine.hubRadius * 0.65),
      fill: partColor("thruster", mixColor(palette.secondary, "#ffffff", 0.25)),
      stroke: accentColor,
      "stroke-width": 1.1,
    });

    group.append(housing, spinner, propDisc, hub);
  }

  root.appendChild(group);
}

export function drawSideWeapons(root, config, geometry, axis) {
  const { palette } = config;
  const { armament } = geometry;
  const profile = getSideProfile(geometry);
  const wing = getSideWing(geometry);
  if (!armament || !profile) {
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
  const { markings } = geometry;
  const profile = getSideProfile(geometry);
  if (!markings?.enabled || !profile) {
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
  const { lights } = geometry;
  const profile = getSideProfile(geometry);
  if (!lights || !profile) {
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
