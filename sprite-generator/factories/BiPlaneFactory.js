import { BaseSpaceshipFactory, DEFAULT_PART_LIBRARY } from "./BaseSpaceshipFactory.js";

export class BiPlaneFactory extends BaseSpaceshipFactory {
  constructor() {
    super("biplane");
  }

  buildDefinition() {
    return {
      label: "Biplane",
      description: "Classic 1910s two-wing fighters with exposed frames and rotary props.",
      wingStyles: ["box", "broad"],
      engineStyles: ["propeller"],
      engineMountPercentRange: [0.02, 0.12],
      wingLayers: [
        { offsetPercent: -6, heightPercent: 4.5, thicknessScale: 0.85 },
        { offsetPercent: 6, heightPercent: -4.5, thicknessScale: 0.85 },
      ],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [16.0, 24.0],
        bodyMidInsetPercent: [4.0, 10.0],
        noseCurvePercent: [6.0, 12.0],
        tailCurvePercent: [8.0, 16.0],
        noseWidthFactor: [0.42, 0.58],
        tailWidthFactor: [0.5, 0.68],
        cockpitWidthPercent: [14.0, 22.0],
        cockpitHeightPercent: [12.0, 22.0],
        cockpit_center_start: 46.0,
        cockpit_center_end: 58.0,
        engineCount: [1, 1],
        engineSizePercent: [10.0, 16.0],
        engineSpacingPercent: [0, 0],
        nozzlePercent: [0, 0],
        wingSpanPercent: [48.0, 70.0],
        wingSweepPercent: [4.0, 10.0],
        wingForwardPercent: [2.0, 8.0],
        wingThicknessPercent: [9.0, 15.0],
        wing_attach_start: 46.0,
        wing_attach_end: 60.0,
        wingDihedralPercent: [4.0, 14.0],
        finCount: [1, 1],
        finHeightPercent: [18.0, 32.0],
        finWidthPercent: [8.0, 16.0],
        stripeStartPercent: [18.0, 42.0],
      },
      features: {
        topFinProbability: 0.4,
        sideFinProbability: 0.15,
        bottomFinProbability: 0.25,
        platingProbability: 0.35,
        stripeProbability: 0.45,
        antennaProbability: 0.25,
        wingTipAccentProbability: 0.3,
        winglessProbability: 0.0,
        aftWingProbability: 0.0,
      },
    };
  }

  buildPartLibrary() {
    const base = DEFAULT_PART_LIBRARY;
    return {
      bodyStyles: [
        {
          key: "biplane",
          frontTypes: ["prop", "prop-needle"],
          midTypes: ["truss", "canvas"],
          rearTypes: ["rudder", "tailboom"],
          widthScaleRange: [0.9, 1.05],
        },
        {
          key: "biplane-skinny",
          frontTypes: ["prop-needle"],
          midTypes: ["truss"],
          rearTypes: ["tailboom"],
          widthScaleRange: [0.82, 0.92],
        },
      ],
      frontSegments: [
        {
          type: "prop",
          lengthWeightRange: [0.28, 0.36],
          tipWidthFactorRange: [0.52, 0.68],
          shoulderWidthFactorRange: [1.02, 1.18],
          transitionFactorRange: [0.78, 0.98],
          curveRange: [8, 16],
        },
        {
          type: "prop-needle",
          lengthWeightRange: [0.26, 0.34],
          tipWidthFactorRange: [0.34, 0.48],
          shoulderWidthFactorRange: [1.0, 1.16],
          transitionFactorRange: [0.82, 1.06],
          curveRange: [12, 20],
        },
      ],
      midSegments: [
        {
          type: "truss",
          lengthWeightRange: [0.4, 0.5],
          waistWidthFactorRange: [0.76, 0.9],
          bellyWidthFactorRange: [0.88, 1.02],
          trailingWidthFactorRange: [0.84, 0.98],
          waistPositionRange: [0.34, 0.48],
          bellyPositionRange: [0.66, 0.82],
          insetRange: [10, 18],
        },
        {
          type: "canvas",
          lengthWeightRange: [0.36, 0.46],
          waistWidthFactorRange: [0.86, 1.0],
          bellyWidthFactorRange: [0.96, 1.12],
          trailingWidthFactorRange: [0.9, 1.04],
          waistPositionRange: [0.3, 0.44],
          bellyPositionRange: [0.64, 0.82],
          insetRange: [8, 14],
        },
      ],
      rearSegments: [
        {
          type: "rudder",
          lengthWeightRange: [0.26, 0.34],
          baseWidthFactorRange: [0.82, 0.96],
          exhaustWidthFactorRange: [0.5, 0.64],
          tailWidthFactorRange: [0.42, 0.56],
          exhaustPositionRange: [0.48, 0.68],
          curveRange: [12, 22],
        },
        {
          type: "tailboom",
          lengthWeightRange: [0.24, 0.32],
          baseWidthFactorRange: [0.9, 1.02],
          exhaustWidthFactorRange: [0.58, 0.72],
          tailWidthFactorRange: [0.46, 0.6],
          exhaustPositionRange: [0.54, 0.74],
          curveRange: [14, 24],
        },
      ],
      frontStyleAdjustments: {
        ...base.frontStyleAdjustments,
        biplane: {
          weight: [0.95, 1.05],
          tipWidthFactor: [1.08, 1.2],
          shoulderWidthFactor: [1.0, 1.12],
          transitionFactor: [0.9, 1.05],
          curve: [0.85, 1.02],
        },
        "biplane-skinny": {
          weight: [1.0, 1.12],
          tipWidthFactor: [0.92, 1.06],
          shoulderWidthFactor: [0.92, 1.05],
          transitionFactor: [0.96, 1.12],
          curve: [0.96, 1.1],
        },
      },
      midStyleAdjustments: {
        ...base.midStyleAdjustments,
        biplane: {
          weight: [0.96, 1.08],
          waistWidthFactor: [0.92, 1.04],
          bellyWidthFactor: [0.94, 1.08],
          trailingWidthFactor: [0.92, 1.04],
          inset: [0.96, 1.12],
        },
        "biplane-skinny": {
          weight: [0.92, 1.02],
          waistWidthFactor: [0.78, 0.9],
          bellyWidthFactor: [0.84, 0.96],
          trailingWidthFactor: [0.82, 0.96],
          inset: [1.05, 1.22],
          waistPosition: [1.0, 1.12],
          bellyPosition: [1.02, 1.14],
        },
      },
      rearStyleAdjustments: {
        ...base.rearStyleAdjustments,
        biplane: {
          weight: [0.92, 1.04],
          baseWidthFactor: [0.88, 1.02],
          exhaustWidthFactor: [0.72, 0.88],
          tailWidthFactor: [0.82, 0.96],
          curve: [0.95, 1.08],
        },
        "biplane-skinny": {
          weight: [0.9, 1.02],
          baseWidthFactor: [0.76, 0.88],
          exhaustWidthFactor: [0.66, 0.8],
          tailWidthFactor: [0.74, 0.88],
          curve: [1.02, 1.16],
        },
      },
      canopyFrames: ["single", "split"],
    };
  }
}
