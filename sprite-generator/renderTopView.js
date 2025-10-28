import {
  buildBodyAxis,
  getTopHullPath,
  getTopSegmentPaths,
  getNeedleTop,
  buildPlatingPath,
  getWingTop,
  getDeltaWingTop,
  buildWingAccent,
  computeWingPlanform,
  buildStripePath,
  pointsToString,
} from "./renderParts.js";
import { clamp } from "./math.js";
import { computeCanopyPlacement } from "./geometry.js";
import { mixColor, shadeColor } from "./color.js";
import { isDebugColorsEnabled, nextRenderId, partColor, partStroke } from "./renderContext.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function drawTopDownSpaceship(root, config, defs) {
  const axis = buildBodyAxis(config.body);
  drawWings(root, config, axis);
  drawBody(root, config, axis);
  drawTopArmament(root, config, axis);
  drawCockpit(root, config, axis, defs);
  drawEngines(root, config, axis);
  drawFins(root, config, axis);
  drawDetails(root, config, axis);
}

export function drawBody(root, config, axis) {
  const { body, palette } = config;

  if (body.segments) {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("fill", partColor("hull", palette.primary));

    const segments = getTopSegmentPaths(body);
    const frontPath = getNeedleTop(config, { segments }) ?? segments.front;
    [frontPath, segments.mid, segments.rear].forEach((d) => {
      if (!d) {
        return;
      }
      const segmentPath = document.createElementNS(SVG_NS, "path");
      segmentPath.setAttribute("d", d);
      segmentPath.setAttribute("stroke", "none");
      group.appendChild(segmentPath);
    });

    const outline = document.createElementNS(SVG_NS, "path");
    outline.setAttribute("d", getTopHullPath(body));
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", palette.accent);
    outline.setAttribute("stroke-width", 2.4);
    outline.setAttribute("stroke-linejoin", "round");
    group.appendChild(outline);

    root.appendChild(group);
  } else {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", getTopHullPath(body));
    path.setAttribute("fill", partColor("hull", palette.primary));
    path.setAttribute("stroke", palette.accent);
    path.setAttribute("stroke-width", 2.4);
    path.setAttribute("stroke-linejoin", "round");
    root.appendChild(path);
  }

  if (body.plating) {
    const lines = document.createElementNS(SVG_NS, "path");
    lines.setAttribute("d", buildPlatingPath(body));
    lines.setAttribute("stroke", mixColor(palette.accent, palette.trim, 0.35));
    lines.setAttribute("stroke-width", 1.2);
    lines.setAttribute("stroke-linecap", "round");
    lines.setAttribute("fill", "none");
    lines.setAttribute("opacity", "0.7");
    root.appendChild(lines);
  }
}

export function drawWings(root, config, axis) {
  const { wings, palette } = config;
  if (!wings || wings.enabled === false) {
    return;
  }
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("fill", partColor("wing", palette.secondary));
  group.setAttribute("stroke", palette.trim);
  group.setAttribute("stroke-width", 1.6);
  group.setAttribute("stroke-linejoin", "round");

  const deltaPoints = wings.style === "delta" ? getDeltaWingTop(config, axis) : null;
  const wingPoints = deltaPoints ?? getWingTop(config, axis);
  if (!wingPoints) {
    return;
  }
  const { left: leftPoints, right: rightPoints } = wingPoints;

  const left = document.createElementNS(SVG_NS, "polygon");
  left.setAttribute("points", pointsToString(leftPoints));
  const right = document.createElementNS(SVG_NS, "polygon");
  right.setAttribute("points", pointsToString(rightPoints));

  group.append(left, right);

  if (wings.tipAccent) {
    const accentLeft = document.createElementNS(SVG_NS, "polyline");
    accentLeft.setAttribute("points", pointsToString(buildWingAccent(leftPoints)));
    accentLeft.setAttribute("stroke", partStroke("wing", palette.accent));
    accentLeft.setAttribute("stroke-width", 2.2);
    const accentRight = document.createElementNS(SVG_NS, "polyline");
    accentRight.setAttribute("points", pointsToString(buildWingAccent(rightPoints)));
    accentRight.setAttribute("stroke", partStroke("wing", palette.accent));
    accentRight.setAttribute("stroke-width", 2.2);
    group.append(accentLeft, accentRight);
  }

  root.appendChild(group);
}

export function drawTopArmament(root, config, axis) {
  const { armament, palette, body, wings } = config;
  if (!armament) {
    return;
  }

  if (armament.mount === "wing") {
    if (!wings?.enabled || !armament.hardpoints?.length) {
      return;
    }

    const planform = computeWingPlanform(body, wings);
    if (!planform.enabled) {
      return;
    }

    const wingMountPercent = axis.length > 0 ? clamp(0.5 + (wings.offsetY ?? 0) / axis.length, 0, 1) : 0.5;
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
        const sideGroup = document.createElementNS(SVG_NS, "g");
        sideGroup.classList.add("wing-ordnance-top");

        const lateralBase = 100 + direction * (body.halfWidth + Math.max(planform.span * 0.45, 10));
        const pylonTopY = anchorY + planform.thickness * 0.1;
        const pylon = document.createElementNS(SVG_NS, "rect");
        pylon.setAttribute("x", (lateralBase - 1.6).toString());
        pylon.setAttribute("y", pylonTopY.toString());
        pylon.setAttribute("width", "3.2");
        pylon.setAttribute("height", pylonLength.toString());
        pylon.setAttribute("rx", "1.2");
        pylon.setAttribute("fill", pylonColor);
        pylon.setAttribute("stroke", accentColor);
        pylon.setAttribute("stroke-width", 0.9);

        if (armament.type === "missile") {
          const payload = document.createElementNS(SVG_NS, "rect");
          payload.setAttribute("x", (lateralBase - payloadRadius).toString());
          payload.setAttribute("y", (payloadOffsetY - ordnanceHeight).toString());
          payload.setAttribute("width", (payloadRadius * 2).toString());
          payload.setAttribute("height", ordnanceHeight.toString());
          payload.setAttribute("rx", (payloadRadius * 0.55).toString());
          payload.setAttribute("fill", ordnanceColor);
          payload.setAttribute("stroke", accentColor);
          payload.setAttribute("stroke-width", 1);

          const tip = document.createElementNS(SVG_NS, "polygon");
          const tipLength = Math.max(payloadLength * 0.28, payloadRadius * 0.9);
          const tipPoints = [
            [lateralBase - payloadRadius, payloadOffsetY - ordnanceHeight],
            [lateralBase, payloadOffsetY - ordnanceHeight - tipLength],
            [lateralBase + payloadRadius, payloadOffsetY - ordnanceHeight],
          ];
          tip.setAttribute("points", pointsToString(tipPoints));
          tip.setAttribute("fill", partColor("weapons", mixColor(palette.accent, palette.secondary, 0.4)));
          tip.setAttribute("stroke", accentColor);
          tip.setAttribute("stroke-width", 1);

          const fins = document.createElementNS(SVG_NS, "rect");
          fins.setAttribute("x", (lateralBase - payloadRadius * 0.9).toString());
          fins.setAttribute("y", (payloadOffsetY - payloadRadius * 0.4).toString());
          fins.setAttribute("width", (payloadRadius * 1.8).toString());
          fins.setAttribute("height", (payloadRadius * 0.8).toString());
          fins.setAttribute("fill", partColor("weapons", shadeColor(palette.accent, -0.15)));
          fins.setAttribute("opacity", "0.75");

          sideGroup.append(pylon, payload, tip, fins);
        } else {
          const payload = document.createElementNS(SVG_NS, "ellipse");
          payload.setAttribute("cx", lateralBase.toString());
          payload.setAttribute("cy", payloadOffsetY.toString());
          payload.setAttribute("rx", payloadRadius.toString());
          payload.setAttribute("ry", Math.max(payloadRadius * 0.75, payloadLength * 0.35).toString());
          payload.setAttribute("fill", ordnanceColor);
          payload.setAttribute("stroke", accentColor);
          payload.setAttribute("stroke-width", 1);

          const noseCap = document.createElementNS(SVG_NS, "circle");
          noseCap.setAttribute("cx", lateralBase.toString());
          noseCap.setAttribute("cy", (payloadOffsetY - Math.max(payloadRadius * 0.6, payloadLength * 0.25)).toString());
          noseCap.setAttribute("r", (payloadRadius * 0.55).toString());
          noseCap.setAttribute("fill", partColor("weapons", mixColor(palette.accent, palette.secondary, 0.35)));

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

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("nose-weapon");

  for (let i = 0; i < armament.barrels; i += 1) {
    const offset = i - (armament.barrels - 1) / 2;
    const centerX = 100 + offset * spacing;

    const housing = document.createElementNS(SVG_NS, "rect");
    housing.setAttribute("x", (centerX - housingWidth / 2).toString());
    housing.setAttribute("y", (noseY - Math.max(6, armament.length * 0.35)).toString());
    housing.setAttribute("width", housingWidth.toString());
    housing.setAttribute("height", Math.max(6, armament.length * 0.35).toString());
    housing.setAttribute("rx", (housingWidth * 0.35).toString());
    housing.setAttribute("fill", partColor("weapons", shadeColor(palette.secondary, -0.1)));
    housing.setAttribute("stroke", partStroke("weapons", palette.trim));
    housing.setAttribute("stroke-width", 1);

    const barrel = document.createElementNS(SVG_NS, "rect");
    barrel.setAttribute("x", (centerX - barrelWidth / 2).toString());
    barrel.setAttribute("y", baseY.toString());
    barrel.setAttribute("width", barrelWidth.toString());
    barrel.setAttribute("height", armament.length.toString());
    barrel.setAttribute("rx", (barrelWidth * 0.45).toString());
    barrel.setAttribute("fill", partColor("weapons", shadeColor(palette.accent, -0.15)));
    barrel.setAttribute("stroke", partStroke("weapons", palette.trim));
    barrel.setAttribute("stroke-width", 1);

    const muzzle = document.createElementNS(SVG_NS, "circle");
    muzzle.setAttribute("cx", centerX.toString());
    muzzle.setAttribute("cy", baseY.toString());
    muzzle.setAttribute("r", (barrelWidth * 0.55).toString());
    muzzle.setAttribute("fill", partColor("weapons", mixColor(palette.accent, palette.secondary, 0.5)));

    group.append(housing, barrel, muzzle);
  }

  root.appendChild(group);
}

export function drawCockpit(root, config, axis, defs) {
  const { cockpit, palette, body } = config;
  const gradient = document.createElementNS(SVG_NS, "radialGradient");
  const gradientId = `cockpit-${config.id}-${nextRenderId()}`;
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("cx", "50%");
  gradient.setAttribute("cy", "40%");
  gradient.setAttribute("r", "70%");

  const debugEnabled = isDebugColorsEnabled();
  const canopyColor = partColor("canopy", cockpit.tint);
  const highlightColor = debugEnabled ? canopyColor : mixColor(cockpit.tint, "#ffffff", 0.4);
  const midColor = debugEnabled ? canopyColor : cockpit.tint;
  const shadowColor = debugEnabled ? canopyColor : shadeColor(cockpit.tint, -0.25);

  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", highlightColor);
  stop1.setAttribute("stop-opacity", "0.9");

  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "60%");
  stop2.setAttribute("stop-color", midColor);
  stop2.setAttribute("stop-opacity", "0.95");

  const stop3 = document.createElementNS(SVG_NS, "stop");
  stop3.setAttribute("offset", "100%");
  stop3.setAttribute("stop-color", shadowColor);
  stop3.setAttribute("stop-opacity", "0.9");

  gradient.append(stop1, stop2, stop3);
  defs.appendChild(gradient);

  const canopyPlacement = computeCanopyPlacement(body, cockpit);
  const centerY = axis.percentToTopY(canopyPlacement.centerPercent);
  const ellipse = document.createElementNS(SVG_NS, "ellipse");
  ellipse.setAttribute("cx", "100");
  ellipse.setAttribute("cy", centerY.toString());
  ellipse.setAttribute("rx", (cockpit.width / 2).toString());
  ellipse.setAttribute("ry", (cockpit.height / 2).toString());
  ellipse.setAttribute("fill", `url(#${gradientId})`);
  ellipse.setAttribute("stroke", debugEnabled ? canopyColor : palette.trim);
  ellipse.setAttribute("stroke-width", 2);

  const frame = document.createElementNS(SVG_NS, "ellipse");
  frame.setAttribute("cx", "100");
  frame.setAttribute("cy", centerY.toString());
  frame.setAttribute("rx", (cockpit.width / 2 + 4).toString());
  frame.setAttribute("ry", (cockpit.height / 2 + 3).toString());
  frame.setAttribute("fill", "none");
  frame.setAttribute("stroke", debugEnabled ? canopyColor : palette.accent);
  frame.setAttribute("stroke-width", 1.4);
  frame.setAttribute("opacity", "0.7");

  const group = document.createElementNS(SVG_NS, "g");
  group.append(frame, ellipse);
  root.appendChild(group);
}

export function drawEngines(root, config, axis) {
  const { engine, palette } = config;
  const group = document.createElementNS(SVG_NS, "g");
  const tailY = axis.percentToTopY(1);
  const baseY = tailY - 4;
  const totalWidth = (engine.count - 1) * engine.spacing;
  const thrusterColor = partColor("thruster", palette.secondary);
  const exhaustColor = partColor("exhaust", engine.glow);
  const debugEnabled = isDebugColorsEnabled();

  for (let i = 0; i < engine.count; i += 1) {
    const offsetX = engine.count === 1 ? 0 : -totalWidth / 2 + i * engine.spacing;
    const cx = 100 + offsetX;

    const nozzle = document.createElementNS(SVG_NS, "rect");
    nozzle.setAttribute("x", (cx - engine.size / 2).toString());
    nozzle.setAttribute("y", (baseY - engine.nozzleLength).toString());
    nozzle.setAttribute("width", engine.size.toString());
    nozzle.setAttribute("height", engine.nozzleLength.toString());
    nozzle.setAttribute("rx", (engine.size * 0.24).toString());
    nozzle.setAttribute("fill", thrusterColor);
    nozzle.setAttribute("stroke", palette.trim);
    nozzle.setAttribute("stroke-width", 1.4);

    const cap = document.createElementNS(SVG_NS, "ellipse");
    cap.setAttribute("cx", cx.toString());
    cap.setAttribute("cy", (baseY - engine.nozzleLength).toString());
    cap.setAttribute("rx", (engine.size / 2).toString());
    cap.setAttribute("ry", (engine.size * 0.22).toString());
    cap.setAttribute("fill", thrusterColor);
    cap.setAttribute("stroke", palette.trim);
    cap.setAttribute("stroke-width", 1.2);

    const thruster = document.createElementNS(SVG_NS, "ellipse");
    thruster.setAttribute("cx", cx.toString());
    thruster.setAttribute("cy", baseY.toString());
    thruster.setAttribute("rx", (engine.size * 0.45).toString());
    thruster.setAttribute("ry", (engine.size * 0.32).toString());
    thruster.setAttribute(
      "fill",
      debugEnabled ? thrusterColor : shadeColor(palette.secondary, 0.1),
    );
    thruster.setAttribute("stroke", palette.accent);
    thruster.setAttribute("stroke-width", 1.1);

    const flame = document.createElementNS(SVG_NS, "polygon");
    const flamePoints = [
      [cx - engine.size * 0.2, baseY + 4],
      [cx, baseY + engine.size * 1.2],
      [cx + engine.size * 0.2, baseY + 4],
    ];
    flame.setAttribute("points", pointsToString(flamePoints));
    flame.setAttribute("fill", exhaustColor);
    flame.setAttribute("opacity", "0.85");
    flame.classList.add("thruster-flame", "thruster-flame--vertical");

    group.append(nozzle, cap, thruster, flame);
  }

  root.appendChild(group);
}

export function drawFins(root, config, axis) {
  const { fins, palette, body } = config;
  const group = document.createElementNS(SVG_NS, "g");
  const stabiliserColor = partColor("stabiliser", palette.secondary);

  if (fins.top) {
    const baseY = axis.percentToTopY(0.22);
    const fin = document.createElementNS(SVG_NS, "path");
    const path = [
      `M ${100 - fins.width / 2} ${baseY}`,
      `L ${100} ${baseY - fins.height}`,
      `L ${100 + fins.width / 2} ${baseY}`,
      `Q ${100} ${baseY + fins.height * 0.25} ${100 - fins.width / 2} ${baseY}`,
      "Z",
    ].join(" ");
    fin.setAttribute("d", path);
    fin.setAttribute("fill", stabiliserColor);
    fin.setAttribute("stroke", palette.trim);
    fin.setAttribute("stroke-width", 1.3);
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

      const left = document.createElementNS(SVG_NS, "polygon");
      left.setAttribute("points", pointsToString(leftPoints));
      const right = document.createElementNS(SVG_NS, "polygon");
      right.setAttribute("points", pointsToString(rightPoints));

      [left, right].forEach((poly) => {
        poly.setAttribute("fill", stabiliserColor);
        poly.setAttribute("stroke", palette.trim);
        poly.setAttribute("stroke-width", 1.1);
        group.appendChild(poly);
      });
    }
  }

  if (fins.bottom) {
    const baseY = axis.percentToTopY(0.78);
    const fin = document.createElementNS(SVG_NS, "path");
    const path = [
      `M ${100 - fins.width / 2} ${baseY}`,
      `L ${100} ${baseY + fins.height}`,
      `L ${100 + fins.width / 2} ${baseY}`,
      `Q ${100} ${baseY - fins.height * 0.25} ${100 - fins.width / 2} ${baseY}`,
      "Z",
    ].join(" ");
    fin.setAttribute("d", path);
    fin.setAttribute("fill", stabiliserColor);
    fin.setAttribute("stroke", palette.trim);
    fin.setAttribute("stroke-width", 1.2);
    fin.setAttribute("opacity", "0.85");
    group.appendChild(fin);
  }

  if (group.childNodes.length > 0) {
    root.appendChild(group);
  }
}

export function drawDetails(root, config, axis) {
  const { details, palette, body, cockpit } = config;
  if (details.stripe) {
    const stripeStartPercent = clamp((details.stripeOffset ?? 0) / body.length, 0, 1);
    const stripeEndPercent = clamp(stripeStartPercent + 0.25, 0, 1);
    const stripeTop = axis.percentToTopY(stripeStartPercent);
    const stripeBottom = axis.percentToTopY(stripeEndPercent);
    const canopyPlacement = cockpit ? computeCanopyPlacement(body, cockpit) : null;
    const canopyCenter = canopyPlacement ? axis.percentToTopY(canopyPlacement.centerPercent) : null;
    const canopyHalfHeight = cockpit ? (cockpit.height ?? 0) / 2 + 4 : 0;
    const canopyTop = canopyCenter !== null ? canopyCenter - canopyHalfHeight : null;
    const canopyBottom = canopyCenter !== null ? canopyCenter + canopyHalfHeight : null;
    const overlapsCanopy =
      canopyTop !== null && canopyBottom !== null && stripeTop < canopyBottom && stripeBottom > canopyTop;

    if (!overlapsCanopy) {
      const stripe = document.createElementNS(SVG_NS, "path");
      stripe.setAttribute("d", buildStripePath(body, details, axis));
      stripe.setAttribute("stroke", partStroke("markings", palette.accent));
      stripe.setAttribute("stroke-width", 3.4);
      stripe.setAttribute("stroke-linecap", "round");
      stripe.setAttribute("opacity", "0.85");
      root.appendChild(stripe);
    }
  }

  if (details.antenna) {
    const antenna = document.createElementNS(SVG_NS, "line");
    const topY = axis.top.nose - 8;
    antenna.setAttribute("x1", "100");
    antenna.setAttribute("y1", (topY - 4).toString());
    antenna.setAttribute("x2", "100");
    antenna.setAttribute("y2", (topY - 20).toString());
    antenna.setAttribute("stroke", partStroke("details", palette.trim));
    antenna.setAttribute("stroke-width", 1.4);
    antenna.setAttribute("stroke-linecap", "round");

    const beacon = document.createElementNS(SVG_NS, "circle");
    beacon.setAttribute("cx", "100");
    beacon.setAttribute("cy", (topY - 24).toString());
    beacon.setAttribute("r", "3");
    beacon.setAttribute("fill", partColor("lights", palette.glow));
    beacon.setAttribute("opacity", "0.9");

    root.append(antenna, beacon);
  }
}

function mirrorPoints(points) {
  return points.map(([x, y]) => [200 - x, y]);
}
