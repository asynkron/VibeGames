import {
  buildBodyAxis,
  computeWingPlanform,
  createSideProfileAnchors,
  computeSegmentGeometry,
  sampleHullTopY,
} from "./renderParts.js";
import { clamp, lerp } from "./math.js";

export function applySideSegmentProfiles(profile, body, percentToBody) {
  if (!body?.segments) {
    return;
  }

  const { front, mid, rear } = body.segments;
  const frontType = front?.type ?? "";
  const rearType = rear?.type ?? "";
  const isNeedleNose = frontType === "needle";
  const isThrusterTail = rearType === "thruster";
  const baseProfileHeight = profile.height;

  const normalise = (value, min, max) => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (max === min) {
      return 0;
    }
    return clamp((value - min) / (max - min), 0, 1);
  };

  let frontLength = front?.length ?? profile.noseLength ?? profile.length * 0.3;
  let midLength = mid?.length ?? profile.length * 0.4;
  let rearLength = rear?.length ?? profile.tailLength ?? profile.length * 0.3;

  if (isNeedleNose) {
    const lengthBias = clamp((front?.transitionFactor ?? 0.9) - 0.7, 0, 0.6);
    frontLength *= 1 + lengthBias * 0.18;
  }

  if (isThrusterTail) {
    const lengthBias = clamp((rear?.baseWidthFactor ?? 1) - 0.85, 0, 0.7);
    rearLength *= 1 + lengthBias * 0.16;
  }

  const totalLength = frontLength + midLength + rearLength;
  if (totalLength > 0) {
    const scale = profile.length / totalLength;
    frontLength *= scale;
    midLength *= scale;
    rearLength *= scale;
  }
  profile.noseLength = frontLength;
  profile.tailLength = rearLength;

  const noseTipRatio = normalise(front?.tipWidthFactor ?? 0.28, 0.08, 0.5);
  const noseShoulderRatio = normalise(front?.shoulderWidthFactor ?? 1, 0.88, 1.26);
  const noseCurveRatio = normalise(front?.curve ?? body.noseCurve ?? 18, 10, 40);
  const transitionRatio = normalise(front?.transitionFactor ?? 0.9, 0.7, 1.2);
  const taperRatio = clamp(
    1 - (front?.tipWidthFactor ?? 0.28) / Math.max(front?.shoulderWidthFactor ?? 1, 0.12),
    0,
    1,
  );

  const midInsetValue = mid?.inset ?? body.midInset ?? percentToBody(10);
  const insetRatio = normalise(midInsetValue, percentToBody(4), percentToBody(22));
  const waistRatio = normalise(mid?.waistWidthFactor ?? 1, 0.74, 1.18);
  const bellyRatio = normalise(mid?.bellyWidthFactor ?? 1, 0.9, 1.32);
  const bellyBias = bellyRatio - 0.5;

  const tailWidthRatio = normalise(rear?.tailWidthFactor ?? body.tailWidthFactor ?? 0.6, 0.4, 0.92);
  const tailCurveRatio = normalise(rear?.curve ?? body.tailCurve ?? 20, 10, 44);
  const exhaustRatio = normalise(rear?.exhaustWidthFactor ?? 0.8, 0.5, 1.2);
  const baseWidthRatio = normalise(rear?.baseWidthFactor ?? 1, 0.8, 1.28);

  const canopyWeight = clamp(noseShoulderRatio * 0.55 + noseTipRatio * 0.45, 0, 1);
  const spearWeight = taperRatio;
  const needleSharpness = isNeedleNose ? clamp(taperRatio * 0.8 + (1 - noseTipRatio) * 0.6, 0, 1) : 0;
  const thrusterHeft = isThrusterTail ? clamp((rear?.baseWidthFactor ?? 1) - 0.85, 0, 0.7) : 0;

  const noseHeightBase = Math.max(percentToBody(4.3), (body.noseCurve ?? front?.curve ?? 18) * 0.28);
  let noseHeight = clamp(
    noseHeightBase * (0.9 + canopyWeight * 0.4 + spearWeight * 0.28 + noseCurveRatio * 0.18)
      + percentToBody(2.4) * transitionRatio,
    percentToBody(4.0),
    baseProfileHeight * 0.96,
  );

  if (isNeedleNose) {
    noseHeight = clamp(
      noseHeight * (1.05 + needleSharpness * 0.2),
      percentToBody(4.0),
      baseProfileHeight * 1.05,
    );
  }

  profile.noseHeight = noseHeight;

  profile.dorsalHeight = Math.max(
    profile.dorsalHeight * (0.88 + canopyWeight * 0.28 + waistRatio * 0.18),
    profile.dorsalHeight * 0.72,
  );
  profile.dorsalHeight += percentToBody(2.0) * (bellyBias + transitionRatio - 0.5);

  let bellyDrop = clamp(
    percentToBody(3.6)
      + midInsetValue * (0.72 + bellyBias * 0.38)
      + percentToBody(3.0) * insetRatio
      + percentToBody(1.6) * (1 - waistRatio),
    percentToBody(4.0),
    baseProfileHeight * 0.62,
  );

  if (isThrusterTail) {
    bellyDrop = Math.max(
      bellyDrop,
      baseProfileHeight * (0.52 + thrusterHeft * 0.32),
      percentToBody(4.5 + thrusterHeft * 4.0),
    );
  }

  let ventralDepth = Math.max(
    bellyDrop + Math.max(percentToBody(3.4), midInsetValue * (0.38 + bellyBias * 0.22)),
    bellyDrop + percentToBody(2.6),
  );

  if (isThrusterTail) {
    ventralDepth = Math.max(
      ventralDepth,
      bellyDrop + percentToBody(3.6 + thrusterHeft * 4.6),
    );
  }

  profile.bellyDrop = bellyDrop;
  profile.ventralDepth = ventralDepth;

  let tailHeight = clamp(
    Math.max(percentToBody(3.6), (body.tailCurve ?? rear?.curve ?? 18) * 0.22)
      * (0.95 + (1 - tailWidthRatio) * 0.6 + (baseWidthRatio - tailWidthRatio) * 0.35)
      + percentToBody(1.6) * (exhaustRatio - 0.5),
    percentToBody(3.6),
    baseProfileHeight * 0.82,
  );

  if (isThrusterTail) {
    tailHeight = Math.max(
      tailHeight,
      baseProfileHeight * (0.72 + thrusterHeft * 0.32),
      percentToBody(5.2 + thrusterHeft * 3.2),
    );
    profile.dorsalHeight = Math.max(profile.dorsalHeight, tailHeight * (0.92 + thrusterHeft * 0.08));
  }

  profile.tailHeight = tailHeight;

  profile.height = Math.max(
    profile.height,
    profile.noseHeight * 1.12,
    profile.dorsalHeight + percentToBody(1.0),
    profile.tailHeight * 1.08,
    profile.ventralDepth,
  );

  let frontSecondBlend = clamp(lerp(0.44, 0.72, noseTipRatio), 0.18, 0.85);
  let frontEndBlend = clamp(
    lerp(0.24, 0.06, noseTipRatio) + lerp(-0.08, 0.08, spearWeight) + (transitionRatio - 0.5) * 0.08,
    0,
    1,
  );
  let chinBlend = clamp(lerp(0.64, 0.42, noseTipRatio) + canopyWeight * 0.06, 0.22, 0.88);
  let frontBellyBlend = clamp(lerp(0.5, 0.34, bellyRatio), 0.2, 0.85);

  if (isNeedleNose) {
    frontSecondBlend = clamp(lerp(frontSecondBlend, 0.08, 0.6 + needleSharpness * 0.3), 0.04, 0.32);
    frontEndBlend = clamp(lerp(frontEndBlend, 0.14, 0.6 + needleSharpness * 0.25), 0.05, 0.45);
    chinBlend = clamp(lerp(chinBlend, 0.28, 0.55 + needleSharpness * 0.25), 0.2, 0.55);
    frontBellyBlend = clamp(lerp(frontBellyBlend, 0.32, 0.55 + needleSharpness * 0.25), 0.26, 0.62);
  }

  const topDip = clamp(lerp(0.14, 0.06, waistRatio) + spearWeight * 0.05 + canopyWeight * 0.03, 0.03, 0.22);
  const crestOffset = clamp(
    ((mid?.bellyPosition ?? 0.72) - 0.72) * 0.6 + bellyBias * 0.18 - (transitionRatio - 0.5) * 0.08,
    -0.2,
    0.2,
  );

  let rearTopBlend = clamp(lerp(0.48, 0.72, tailCurveRatio * 0.6 + (1 - tailWidthRatio) * 0.4), 0.2, 0.92);
  let rearBottomBlend = clamp(lerp(0.58, 0.72, bellyRatio) + (exhaustRatio - 0.5) * 0.12, 0.25, 0.95);

  if (isThrusterTail) {
    rearTopBlend = clamp(lerp(rearTopBlend, 0.68, 0.55 + thrusterHeft * 0.35), 0.4, 0.92);
    rearBottomBlend = clamp(lerp(rearBottomBlend, 0.88, 0.55 + thrusterHeft * 0.35), 0.55, 0.98);
  }

  profile.sideAnchorConfig = {
    front: {
      topSecondBlend: frontSecondBlend,
      topEndBlend: frontEndBlend,
      bottomSecondBlend: chinBlend,
      bottomEndBlend: frontBellyBlend,
      needleSharpness,
    },
    mid: {
      topDip,
      topCrestOffset: crestOffset,
    },
    rear: {
      topBlend: rearTopBlend,
      bottomBlend: rearBottomBlend,
    },
  };
}

export function computeCanopyPlacement(body, cockpit) {
  const canopyLength = clamp((cockpit?.width ?? 28) * 1.1, body.length * 0.16, body.length * 0.32);
  const centerFromNose = clamp(
    body.length * 0.32 + (cockpit?.offsetY ?? 0),
    canopyLength * 0.5,
    body.length - canopyLength * 0.5,
  );
  const start = centerFromNose - canopyLength / 2;
  const end = start + canopyLength;
  const startPercent = start / body.length;
  const endPercent = end / body.length;
  const centerPercent = centerFromNose / body.length;
  const axis = buildBodyAxis(body);
  return {
    length: canopyLength,
    centerFromNose,
    start,
    end,
    startPercent,
    endPercent,
    centerPercent,
    centerY: axis.top.nose + centerFromNose,
  };
}

export function deriveSideViewGeometry(config) {
  const { body, cockpit, engine, wings, fins, details } = config;
  const rearSegment = body?.segments?.rear ?? null;

  const axis = buildBodyAxis(body);
  const halfLength = body.length / 2;
  const percentToBody = (percent) => (percent / 100) * body.length;
  const fuselageRadius = Math.max(body.halfWidth, percentToBody(8.6));
  const baseHeight = Math.max(
    fuselageRadius * 1.4,
    (cockpit?.height ?? percentToBody(12.9)) + percentToBody(5.7),
    (fins?.height ?? percentToBody(17.1)) * 0.55,
  );

  const clampToBody = (value) => clamp(value, 0, body.length);
  const centerOffsetToBody = (offset) => clampToBody(halfLength + offset);

  const noseLength = clamp(body.length * 0.18 + body.noseCurve * 0.35, body.length * 0.16, body.length * 0.32);
  const tailLength = clamp(body.length * 0.22 + body.tailCurve * 0.3, body.length * 0.16, body.length * 0.36);
  const noseHeight = Math.max(percentToBody(5.7), body.noseCurve * 0.55);
  const dorsalHeight = Math.max(
    (cockpit?.height ?? percentToBody(12.9)) + percentToBody(4.3),
    (fins?.height ?? percentToBody(20.0)) * 0.55,
  );
  const tailHeight = Math.max(percentToBody(4.3), (fins?.height ?? percentToBody(17.1)) * 0.4);
  const bellyDrop = clamp(body.midInset * 1.6, baseHeight * 0.22, baseHeight * 0.48);
  const ventralDepth = bellyDrop + Math.max(percentToBody(4.3), body.midInset * 0.6);
  const hasIntakes = (engine?.count ?? 0) > 1;
  const intakeHeight = hasIntakes ? Math.min(baseHeight * 0.45, (engine?.size ?? percentToBody(12.9)) * 0.9) : 0;
  const intakeDepth = hasIntakes ? Math.min(fuselageRadius * 1.2, (engine?.spacing ?? percentToBody(17.1)) * 0.6) : 0;

  const profile = {
    length: body.length,
    height: baseHeight,
    noseLength,
    tailLength,
    noseHeight,
    dorsalHeight,
    tailHeight,
    bellyDrop,
    ventralDepth,
    intakeHeight,
    intakeDepth,
    offsetY: 0,
    plating: Boolean(body.plating),
    axis,
  };

  profile.noseX = axis.side.nose;
  profile.tailX = axis.side.tail;

  applySideSegmentProfiles(profile, body, percentToBody);

  const segmentGeometry = body.segments ? computeSegmentGeometry(body, axis) : null;
  const hullAnchors = createSideProfileAnchors(profile, body.segments, segmentGeometry, {
    allowFallback: true,
  });

  if (hullAnchors) {
    profile.hullAnchors = hullAnchors;
  }

  if (body.segments) {
    profile.segmentAnchors = hullAnchors;
  }

  const canopyPlacement = computeCanopyPlacement(body, cockpit);
  const fallbackCanopyHeight = cockpit?.height ?? percentToBody(12.9);
  const canopyHeight = clamp(
    fallbackCanopyHeight * 1.18,
    fallbackCanopyHeight * 0.95,
    dorsalHeight - percentToBody(1.4),
  );
  const canopyOffset = canopyPlacement.centerFromNose - canopyPlacement.length * 0.5;
  const canopyStart = clamp(canopyOffset, 0, body.length);
  const canopyEnd = clamp(canopyStart + canopyPlacement.length, 0, body.length);
  const canopyBaseEmbed = Math.max(percentToBody(1.0), canopyHeight * 0.18);
  const canopyStartTop = sampleHullTopY(profile, canopyStart);
  const canopyEndTop = sampleHullTopY(profile, canopyEnd);
  const canopy = {
    length: canopyPlacement.length,
    height: canopyHeight,
    offset: canopyStart,
    startPercent: canopyStart / body.length,
    endPercent: canopyEnd / body.length,
    centerPercent: canopyPlacement.centerPercent,
    offsetY: -(cockpit?.offsetY ?? 0) * 0.25,
    frame: clamp((cockpit?.width ?? percentToBody(20.0)) * 0.08, percentToBody(1.3), percentToBody(2.7)),
    tint: cockpit?.tint ?? "#7ed4ff",
    baseStart: canopyStartTop - (100 + (profile.offsetY ?? 0)) + canopyBaseEmbed,
    baseEnd: canopyEndTop - (100 + (profile.offsetY ?? 0)) + canopyBaseEmbed,
  };

  const planform = computeWingPlanform(body, wings);
  const wing = planform.enabled
    ? {
        enabled: true,
        position: planform.position,
        length: planform.length,
        positionPercent: planform.positionPercent,
        lengthPercent: planform.lengthPercent,
        profileSpan: planform.span,
        thickness: planform.thickness,
        dihedral: planform.dihedral,
        drop: planform.drop,
        mountHeight: planform.mountHeight ?? 0,
        style: planform.style ?? wings?.style ?? "swept",
        accent: Boolean(wings?.tipAccent),
      }
    : {
        enabled: false,
        position: 0,
        length: 0,
        positionPercent: 0,
        lengthPercent: 0,
        profileSpan: 0,
        thickness: 0,
        dihedral: 0,
        drop: 0,
        mountHeight: 0,
        style: "swept",
        accent: false,
      };

  const stabiliser = fins
    ? {
        length: Math.max(percentToBody(8.6), fins.height),
        height: Math.max(percentToBody(5.7), fins.width * 1.05),
        sweep: Math.max(percentToBody(7.1), (wings?.forward ?? percentToBody(12.9)) * 0.5),
        thickness: Math.max(percentToBody(3.6), fins.width * 0.55),
        offsetY: ((fins.side ?? 0) - (fins.bottom ?? 0)) * baseHeight * 0.06,
        ventral: (fins.bottom ?? 0) > 0,
      }
    : null;

  const thruster = engine
    ? {
        count: Math.max(1, Math.round(engine.count)),
        radius: Math.max(percentToBody(2.9), engine.size * 0.45),
        spacing: Math.max(percentToBody(5.7), engine.spacing * 0.45),
        offsetY: 0,
        nozzleLength: Math.max(percentToBody(4.3), engine.nozzleLength * 0.65),
        glow: engine.glow,
        mountPercent: 1,
      }
    : null;

  if (thruster && rearSegment?.type === "thruster") {
    const heft = clamp((rearSegment.baseWidthFactor ?? 1) - 0.85, 0, 0.7);
    thruster.radius *= 1.2 + heft * 0.35;
    thruster.spacing = Math.max(thruster.spacing, percentToBody(6.0 + heft * 5));
    thruster.nozzleLength *= 1.05 + heft * 0.25;
  }

  const storedArmament = config.armament;
  let armament = null;

  if (storedArmament?.mount === "wing" && wing.enabled) {
    const hardpoints = Array.isArray(storedArmament.hardpoints)
      ? storedArmament.hardpoints.map((hardpoint) => ({
          chordRatio: clamp(hardpoint.chordRatio ?? 0.5, 0.1, 0.9),
          pylonLength: Math.max(percentToBody(2.9), hardpoint.pylonLength ?? planform.thickness * 0.6),
          payloadLength: Math.max(percentToBody(7.1), hardpoint.payloadLength ?? planform.length * 0.25),
          payloadRadius: Math.max(percentToBody(2.1), hardpoint.payloadRadius ?? planform.thickness * 0.35),
        }))
      : [];
    if (hardpoints.length) {
      armament = {
        mount: "wing",
        type: storedArmament.type === "missile" ? "missile" : "bomb",
        barrels: Math.max(1, Math.round(storedArmament.barrels ?? hardpoints.length)),
        hardpoints,
      };
    }
  } else if (storedArmament?.mount === "nose") {
    armament = {
      mount: "nose",
      barrels: Math.max(1, Math.round(storedArmament.barrels ?? 1)),
      length: Math.max(percentToBody(8.6), storedArmament.length ?? body.length * 0.1),
      spacing: Math.max(percentToBody(1.4), storedArmament.spacing ?? (wings?.thickness ?? percentToBody(7.1)) * 0.3),
      offsetY: -((cockpit?.offsetY ?? 0) / Math.max(halfLength, 1)) * (baseHeight * 0.2),
      housingHeight: Math.max(percentToBody(4.3), (cockpit?.height ?? percentToBody(12.9)) * 0.55),
      mountPercent: 0,
    };
  }

  const markings = {
    enabled: Boolean(details?.stripe),
    stripeLength: body.length * 0.25,
    stripeHeight: clamp(baseHeight * 0.3, baseHeight * 0.2, baseHeight * 0.45),
    stripeOffset: clamp(details?.stripeOffset ?? body.length * 0.3, body.length * 0.12, body.length * 0.85),
    stripeLift: clamp(-(cockpit?.offsetY ?? 0) * 0.4, -baseHeight * 0.3, baseHeight * 0.3),
  };
  if (markings.enabled) {
    const stripeStartPercent = clamp(markings.stripeOffset / body.length, 0, 1);
    const stripeEndPercent = clamp((markings.stripeOffset + markings.stripeLength) / body.length, 0, 1);
    markings.stripeStartPercent = stripeStartPercent;
    markings.stripeEndPercent = stripeEndPercent;
  }

  let antenna = null;
  if (details?.antenna) {
    const antennaDistance = clamp(body.length * 0.12, profile.noseLength * 0.35, profile.length * 0.22);
    const baseTop = sampleHullTopY(profile, antennaDistance);
    const baseOffset = baseTop - (100 + (profile.offsetY ?? 0)) + canopyBaseEmbed * 0.85;
    const slopeAhead = sampleHullTopY(profile, clamp(antennaDistance + percentToBody(8.6), 0, profile.length));
    const slopeBehind = sampleHullTopY(profile, clamp(antennaDistance - percentToBody(8.6), 0, profile.length));
    const lean = clamp((slopeBehind - slopeAhead) * 0.18, -percentToBody(4.3), percentToBody(2.9));
    antenna = {
      baseOffset,
      length: clamp(body.length * 0.12, percentToBody(10.0), dorsalHeight + percentToBody(7.1)),
      lean,
      beaconRadius: percentToBody(2.0),
      basePercent: antennaDistance / body.length,
    };
  }

  const lights = {
    nose: !antenna && Boolean(details?.antenna),
    dorsal: (fins?.top ?? 0) > 0,
    intake: hasIntakes,
  };

  return {
    profile,
    canopy,
    wing,
    stabiliser,
    thruster,
    armament,
    markings,
    lights,
    antenna,
    axis,
  };
}
