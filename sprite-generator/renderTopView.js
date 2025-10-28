import { pointsToString } from "./renderParts.js";
import { clamp } from "./math.js";
import { mixColor, shadeColor } from "./color.js";
import { isDebugColorsEnabled, nextRenderId, partColor, partStroke } from "./renderContext.js";
import { createSvgElement } from "./svgUtils.js";

export function drawTopDownSpaceship(root, config, geometry, defs) {
  const axis = geometry.axis;
  drawWings(root, config, geometry);
  drawBody(root, config, geometry);
  drawTopArmament(root, config, geometry, axis);
  drawCockpit(root, config, geometry, axis, defs);
  drawEngines(root, config, axis);
  drawFins(root, config, axis);
  drawDetails(root, config, geometry, axis);
}

export function drawBody(root, config, geometry) {
  const { body, palette } = config;

  if (body.segments) {
    const group = createSvgElement("g", { fill: partColor("hull", palette.primary) });

    const topSegments = geometry.body.top;
    const segmentPaths = [topSegments.front, topSegments.mid, topSegments.rear];
    segmentPaths.forEach((d) => {
      if (!d) {
        return;
      }
      const segmentPath = createSvgElement("path", { d, stroke: "none" });
      group.appendChild(segmentPath);
    });

    const outline = createSvgElement("path", {
      d: topSegments.hull,
      fill: "none",
      stroke: palette.accent,
      "stroke-width": 2.4,
      "stroke-linejoin": "round",
    });
    group.appendChild(outline);

    root.appendChild(group);
  } else {
    const path = createSvgElement("path", {
      d: geometry.body.top.hull,
      fill: partColor("hull", palette.primary),
      stroke: palette.accent,
      "stroke-width": 2.4,
      "stroke-linejoin": "round",
    });
    root.appendChild(path);
  }

  if (geometry.body.top.plating) {
    const lines = createSvgElement("path", {
      d: geometry.body.top.plating,
      stroke: mixColor(palette.accent, palette.trim, 0.35),
      "stroke-width": 1.2,
      "stroke-linecap": "round",
      fill: "none",
      opacity: "0.7",
    });
    root.appendChild(lines);
  }
}

export function drawWings(root, config, geometry) {
  const { wings, palette } = config;
  const wingGeometry = geometry.wings;
  if (!wings || wings.enabled === false || !wingGeometry?.top) {
    return;
  }
  const layers = Array.isArray(wingGeometry.layers) && wingGeometry.layers.length
    ? wingGeometry.layers
    : [{ points: wingGeometry.top, accent: wingGeometry.accent }];

  layers.forEach((layer) => {
    if (!layer?.points) {
      return;
    }
    const group = createSvgElement("g", {
      fill: partColor("wing", palette.secondary),
      stroke: palette.trim,
      "stroke-width": 1.6,
      "stroke-linejoin": "round",
    });

    const { left: leftPoints, right: rightPoints } = layer.points;
    const left = createSvgElement("polygon", { points: pointsToString(leftPoints) });
    const right = createSvgElement("polygon", { points: pointsToString(rightPoints) });

    group.append(left, right);

    const accent = layer.accent;
    if (accent) {
      const accentLeftPoints = accent.left;
      const accentRightPoints = accent.right;
      if (accentLeftPoints) {
        const accentLeft = createSvgElement("polyline", {
          points: pointsToString(accentLeftPoints),
          stroke: partStroke("wing", palette.accent),
          "stroke-width": 2.2,
        });
        group.appendChild(accentLeft);
      }
      if (accentRightPoints) {
        const accentRight = createSvgElement("polyline", {
          points: pointsToString(accentRightPoints),
          stroke: partStroke("wing", palette.accent),
          "stroke-width": 2.2,
        });
        group.appendChild(accentRight);
      }
    }

    root.appendChild(group);
  });
}

export function drawTopArmament(root, config, geometry, axis) {
  const { armament, palette, body, wings } = config;
  if (!armament) {
    return;
  }

  if (armament.mount === "wing") {
    if (!wings?.enabled || !armament.hardpoints?.length) {
      return;
    }

    const planform = geometry.wings.planform ?? null;
    if (!planform.enabled) {
      return;
    }

    const mountOffset = planform.mountOffset ?? wings.offsetY ?? 0;
    const wingMountPercent = axis.length > 0 ? clamp(0.5 + mountOffset / axis.length, 0, 1) : 0.5;
    const baseWingY = axis.percentToTopY(wingMountPercent);
    const ordnanceColor = partColor("weapons", shadeColor(palette.secondary, -0.1));
    const accentColor = partStroke("weapons", palette.trim);
    const pylonColor = partColor("weapons", shadeColor(palette.secondary, -0.25));

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
        const sideGroup = createSvgElement("g", {}, "wing-ordnance-top");

        const lateralBase = 100 + direction * (body.halfWidth + Math.max(planform.span * 0.45, 10));
        const pylonTopY = anchorY + planform.thickness * 0.1;
        const pylon = createSvgElement("rect", {
          x: String(lateralBase - 1.6),
          y: String(pylonTopY),
          width: "3.2",
          height: String(pylonLength),
          rx: "1.2",
          fill: pylonColor,
          stroke: accentColor,
          "stroke-width": 0.9,
        });

        if (armament.type === "missile") {
          const payload = createSvgElement("rect", {
            x: String(lateralBase - payloadRadius),
            y: String(payloadOffsetY - ordnanceHeight),
            width: String(payloadRadius * 2),
            height: String(ordnanceHeight),
            rx: String(payloadRadius * 0.55),
            fill: ordnanceColor,
            stroke: accentColor,
            "stroke-width": 1,
          });

          const tipLength = Math.max(payloadLength * 0.28, payloadRadius * 0.9);
          const tipPoints = [
            [lateralBase - payloadRadius, payloadOffsetY - ordnanceHeight],
            [lateralBase, payloadOffsetY - ordnanceHeight - tipLength],
            [lateralBase + payloadRadius, payloadOffsetY - ordnanceHeight],
          ];
          const tip = createSvgElement("polygon", {
            points: pointsToString(tipPoints),
            fill: partColor("weapons", mixColor(palette.accent, palette.secondary, 0.4)),
            stroke: accentColor,
            "stroke-width": 1,
          });

          const fins = createSvgElement("rect", {
            x: String(lateralBase - payloadRadius * 0.9),
            y: String(payloadOffsetY - payloadRadius * 0.4),
            width: String(payloadRadius * 1.8),
            height: String(payloadRadius * 0.8),
            fill: partColor("weapons", shadeColor(palette.accent, -0.15)),
            opacity: "0.75",
          });

          sideGroup.append(pylon, payload, tip, fins);
        } else {
          const payload = createSvgElement("ellipse", {
            cx: String(lateralBase),
            cy: String(payloadOffsetY),
            rx: String(payloadRadius),
            ry: String(Math.max(payloadRadius * 0.75, payloadLength * 0.35)),
            fill: ordnanceColor,
            stroke: accentColor,
            "stroke-width": 1,
          });

          const noseCap = createSvgElement("circle", {
            cx: String(lateralBase),
            cy: String(payloadOffsetY - Math.max(payloadRadius * 0.6, payloadLength * 0.25)),
            r: String(payloadRadius * 0.55),
            fill: partColor("weapons", mixColor(palette.accent, palette.secondary, 0.35)),
          });

          sideGroup.append(pylon, payload, noseCap);
        }

        root.appendChild(sideGroup);
      });
    });

    return;
  }

  const baseY = axis.percentToTopY(0);
  const noseY = axis.top.nose;
  const spacing = armament.spacing ?? 0;
  const housingWidth = armament.housingWidth ?? body.halfWidth * 0.8;
  const barrelWidth = Math.max(4, housingWidth * 0.6);

  const group = createSvgElement("g", {}, "nose-weapon");

  for (let i = 0; i < armament.barrels; i += 1) {
    const offset = i - (armament.barrels - 1) / 2;
    const centerX = 100 + offset * spacing;

    const housing = createSvgElement("rect", {
      x: String(centerX - housingWidth / 2),
      y: String(noseY - Math.max(6, armament.length * 0.35)),
      width: String(housingWidth),
      height: String(Math.max(6, armament.length * 0.35)),
      rx: String(housingWidth * 0.35),
      fill: partColor("weapons", shadeColor(palette.secondary, -0.1)),
      stroke: partStroke("weapons", palette.trim),
      "stroke-width": 1,
    });

    const barrel = createSvgElement("rect", {
      x: String(centerX - barrelWidth / 2),
      y: String(baseY),
      width: String(barrelWidth),
      height: String(armament.length),
      rx: String(barrelWidth * 0.45),
      fill: partColor("weapons", shadeColor(palette.accent, -0.15)),
      stroke: partStroke("weapons", palette.trim),
      "stroke-width": 1,
    });

    const muzzle = createSvgElement("circle", {
      cx: String(centerX),
      cy: String(baseY),
      r: String(barrelWidth * 0.55),
      fill: partColor("weapons", mixColor(palette.accent, palette.secondary, 0.5)),
    });

    group.append(housing, barrel, muzzle);
  }

  root.appendChild(group);
}

export function drawCockpit(root, config, geometry, axis, defs) {
  const { cockpit, palette } = config;
  if (!cockpit) {
    return;
  }

  const canopyPlacement = geometry.canopy;
  if (!canopyPlacement) {
    return;
  }

  const gradientId = `cockpit-${config.id}-${nextRenderId()}`;
  const gradient = createSvgElement("radialGradient", {
    id: gradientId,
    cx: "50%",
    cy: "40%",
    r: "70%",
  });

  const debugEnabled = isDebugColorsEnabled();
  const canopyColor = partColor("canopy", cockpit.tint);
  const highlightColor = debugEnabled ? canopyColor : mixColor(cockpit.tint, "#ffffff", 0.4);
  const midColor = debugEnabled ? canopyColor : cockpit.tint;
  const shadowColor = debugEnabled ? canopyColor : shadeColor(cockpit.tint, -0.25);

  const stop1 = createSvgElement("stop", {
    offset: "0%",
    "stop-color": highlightColor,
    "stop-opacity": "0.9",
  });

  const stop2 = createSvgElement("stop", {
    offset: "60%",
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

  const centerY = axis.percentToTopY(canopyPlacement.centerPercent ?? 0.5);
  const ellipse = createSvgElement("ellipse", {
    cx: "100",
    cy: String(centerY),
    rx: String(cockpit.width / 2),
    ry: String(cockpit.height / 2),
    fill: `url(#${gradientId})`,
    stroke: debugEnabled ? canopyColor : palette.trim,
    "stroke-width": 2,
  });

  const frame = createSvgElement("ellipse", {
    cx: "100",
    cy: String(centerY),
    rx: String(cockpit.width / 2 + 4),
    ry: String(cockpit.height / 2 + 3),
    fill: "none",
    stroke: debugEnabled ? canopyColor : palette.accent,
    "stroke-width": 1.4,
    opacity: "0.7",
  });

  const group = createSvgElement("g");
  group.append(frame, ellipse);
  root.appendChild(group);
}

export function drawEngines(root, config, axis) {
  const { engine, palette } = config;
  const group = createSvgElement("g");
  if (!engine) {
    return;
  }

  if (engine.type === "propeller") {
    drawTopPropellers(group, engine, palette, axis);
  } else {
    drawTopJetEngines(group, engine, palette, axis);
  }

  if (group.childNodes.length > 0) {
    root.appendChild(group);
  }
}

function drawTopJetEngines(group, engine, palette, axis) {
  const baseY = axis.percentToTopY(engine.mountPercent ?? 1) - 4;
  const totalWidth = (engine.count - 1) * engine.spacing;
  const thrusterColor = partColor("thruster", palette.secondary);
  const exhaustColor = partColor("exhaust", engine.glow);
  const debugEnabled = isDebugColorsEnabled();

  for (let i = 0; i < engine.count; i += 1) {
    const offsetX = engine.count === 1 ? 0 : -totalWidth / 2 + i * engine.spacing;
    const cx = 100 + offsetX;

    const nozzle = createSvgElement("rect", {
      x: String(cx - engine.size / 2),
      y: String(baseY - engine.nozzleLength),
      width: String(engine.size),
      height: String(engine.nozzleLength),
      rx: String(engine.size * 0.24),
      fill: thrusterColor,
      stroke: palette.trim,
      "stroke-width": 1.4,
    });

    const cap = createSvgElement("ellipse", {
      cx: String(cx),
      cy: String(baseY - engine.nozzleLength),
      rx: String(engine.size / 2),
      ry: String(engine.size * 0.22),
      fill: thrusterColor,
      stroke: palette.trim,
      "stroke-width": 1.2,
    });

    const thruster = createSvgElement("ellipse", {
      cx: String(cx),
      cy: String(baseY),
      rx: String(engine.size * 0.45),
      ry: String(engine.size * 0.32),
      fill: debugEnabled ? thrusterColor : shadeColor(palette.secondary, 0.1),
      stroke: palette.accent,
      "stroke-width": 1.1,
    });

    group.append(nozzle, cap, thruster);

    if (engine.hasFlame) {
      const flamePoints = [
        [cx - engine.size * 0.2, baseY + 4],
        [cx, baseY + engine.size * 1.2],
        [cx + engine.size * 0.2, baseY + 4],
      ];
      const flame = createSvgElement(
        "polygon",
        {
          points: pointsToString(flamePoints),
          fill: exhaustColor,
          opacity: "0.85",
        },
        ["thruster-flame", "thruster-flame--vertical"],
      );
      group.appendChild(flame);
    }
  }
}

function drawTopPropellers(group, engine, palette, axis) {
  const baseY = axis.percentToTopY(engine.mountPercent ?? 0);
  const totalWidth = (engine.count - 1) * engine.spacing;
  const diskStroke = partColor("thruster", mixColor(palette.accent, palette.secondary, 0.35));
  const spinnerFill = partColor("thruster", mixColor(palette.secondary, "#ffffff", 0.2));
  const bladeStroke = partStroke("thruster", palette.trim);
  const bladeStrokeWidth = Math.max(
    1.2,
    ((engine.bladeWidth ?? engine.propellerRadius ?? engine.size) * 0.12),
  );

  for (let i = 0; i < engine.count; i += 1) {
    const offsetX = engine.count === 1 ? 0 : -totalWidth / 2 + i * engine.spacing;
    const cx = 100 + offsetX;

    const disc = createSvgElement("circle", {
      cx: String(cx),
      cy: String(baseY),
      r: String(engine.propellerRadius ?? engine.size),
      fill: "none",
      stroke: diskStroke,
      "stroke-width": 1.4,
      opacity: "0.85",
    });

    const spinner = createSvgElement("circle", {
      cx: String(cx),
      cy: String(baseY),
      r: String(engine.hubRadius ?? engine.size * 0.4),
      fill: spinnerFill,
      stroke: palette.trim,
      "stroke-width": 1.1,
    });

    const blades = createSvgElement("g", {
      stroke: bladeStroke,
      "stroke-width": bladeStrokeWidth,
      "stroke-linecap": "round",
    });

    const bladeRadius = engine.propellerRadius ?? engine.size;
    for (let bladeIndex = 0; bladeIndex < (engine.bladeCount ?? 2); bladeIndex += 1) {
      const angle = (Math.PI * 2 * bladeIndex) / (engine.bladeCount ?? 2);
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const innerX = cx + sin * (engine.hubRadius ?? engine.size * 0.4) * 0.3;
      const innerY = baseY - cos * (engine.hubRadius ?? engine.size * 0.4) * 0.3;
      const outerX = cx + sin * bladeRadius;
      const outerY = baseY - cos * bladeRadius;
      const blade = createSvgElement("line", {
        x1: innerX.toFixed(2),
        y1: innerY.toFixed(2),
        x2: outerX.toFixed(2),
        y2: outerY.toFixed(2),
      });
      blades.appendChild(blade);
    }

    group.append(disc, blades, spinner);
  }
}

export function drawFins(root, config, axis) {
  const { fins, palette, body } = config;
  const group = createSvgElement("g");
  const stabiliserColor = partColor("stabiliser", palette.secondary);

  if (fins.top) {
    const baseY = axis.percentToTopY(0.22);
    const path = [
      `M ${100 - fins.width / 2} ${baseY}`,
      `L ${100} ${baseY - fins.height}`,
      `L ${100 + fins.width / 2} ${baseY}`,
      `Q ${100} ${baseY + fins.height * 0.25} ${100 - fins.width / 2} ${baseY}`,
      "Z",
    ].join(" ");
    const fin = createSvgElement("path", {
      d: path,
      fill: stabiliserColor,
      stroke: palette.trim,
      "stroke-width": 1.3,
    });
    group.appendChild(fin);
  }

  if (fins.side > 0) {
    const sideBaseY = axis.percentToTopY(0.62);
    const spacing = fins.width + 6;
    for (let i = 0; i < fins.side; i += 1) {
      const base = sideBaseY + i * (fins.height + 6);
      const leftPoints = [
        [100 - body.halfWidth - 2, base],
        [100 - body.halfWidth - spacing, base + fins.height / 2],
        [100 - body.halfWidth - 2, base + fins.height],
      ];
      const rightPoints = mirrorPoints(leftPoints);

      const left = createSvgElement("polygon", {
        points: pointsToString(leftPoints),
        fill: stabiliserColor,
        stroke: palette.trim,
        "stroke-width": 1.1,
      });
      const right = createSvgElement("polygon", {
        points: pointsToString(rightPoints),
        fill: stabiliserColor,
        stroke: palette.trim,
        "stroke-width": 1.1,
      });

      group.append(left, right);
    }
  }

  if (fins.bottom) {
    const baseY = axis.percentToTopY(0.78);
    const path = [
      `M ${100 - fins.width / 2} ${baseY}`,
      `L ${100} ${baseY + fins.height}`,
      `L ${100 + fins.width / 2} ${baseY}`,
      `Q ${100} ${baseY - fins.height * 0.25} ${100 - fins.width / 2} ${baseY}`,
      "Z",
    ].join(" ");
    const fin = createSvgElement("path", {
      d: path,
      fill: stabiliserColor,
      stroke: palette.trim,
      "stroke-width": 1.2,
      opacity: "0.85",
    });
    group.appendChild(fin);
  }

  if (group.childNodes.length > 0) {
    root.appendChild(group);
  }
}

export function drawDetails(root, config, geometry, axis) {
  const { details, palette, body, cockpit } = config;
  const markings = geometry.markings;
  const stripePath = geometry.body.top.stripe;

  if (details.stripe && stripePath && markings?.enabled !== false) {
    const stripeStartPercent = markings?.stripeStartPercent ?? clamp((details.stripeOffset ?? 0) / body.length, 0, 1);
    const stripeEndPercent = markings?.stripeEndPercent ?? clamp(stripeStartPercent + 0.25, 0, 1);
    const stripeTop = axis.percentToTopY(stripeStartPercent);
    const stripeBottom = axis.percentToTopY(stripeEndPercent);
    const canopyPlacement = geometry.canopy ?? null;
    const canopyCenter = canopyPlacement ? axis.percentToTopY(canopyPlacement.centerPercent ?? 0.5) : null;
    const canopyHalfHeight = cockpit ? (cockpit.height ?? 0) / 2 + 4 : 0;
    const canopyTop = canopyCenter !== null ? canopyCenter - canopyHalfHeight : null;
    const canopyBottom = canopyCenter !== null ? canopyCenter + canopyHalfHeight : null;
    const overlapsCanopy =
      canopyTop !== null && canopyBottom !== null && stripeTop < canopyBottom && stripeBottom > canopyTop;

    if (!overlapsCanopy) {
      const stripe = createSvgElement("path", {
        d: stripePath,
        stroke: partStroke("markings", palette.accent),
        "stroke-width": 3.4,
        "stroke-linecap": "round",
        opacity: "0.85",
      });
      root.appendChild(stripe);
    }
  }

  if (details.antenna) {
    const topY = axis.top.nose - 8;
    const antenna = createSvgElement("line", {
      x1: "100",
      y1: String(topY - 4),
      x2: "100",
      y2: String(topY - 20),
      stroke: partStroke("details", palette.trim),
      "stroke-width": 1.4,
      "stroke-linecap": "round",
    });

    const beacon = createSvgElement("circle", {
      cx: "100",
      cy: String(topY - 24),
      r: "3",
      fill: partColor("lights", palette.glow),
      opacity: "0.9",
    });

    root.append(antenna, beacon);
  }
}

function mirrorPoints(points) {
  return points.map(([x, y]) => [200 - x, y]);
}
