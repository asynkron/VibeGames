import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

const BIPLANE_GEOMETRY = {
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["prop-slim"],
      midTypes: ["truss"],
      rearTypes: ["tail-boom"],
      widthScaleRange: [0.68, 0.82],
    },
    {
      key: "normal",
      frontTypes: ["prop-slim", "prop-canopy"],
      midTypes: ["truss", "pod"],
      rearTypes: ["tailplane", "tail-boom"],
      widthScaleRange: [0.8, 0.92],
    },
    {
      key: "bulky",
      frontTypes: ["prop-broad"],
      midTypes: ["pod", "cargo"],
      rearTypes: ["tailplane"],
      widthScaleRange: [0.88, 1.02],
    },
  ],
  segments: {
    front: [
      {
        type: "prop-slim",
        lengthWeightRange: [0.32, 0.4],
        tipWidthFactorRange: [0.5, 0.62],
        shoulderWidthFactorRange: [0.88, 1.02],
        transitionFactorRange: [0.82, 1.02],
        curveRange: [6, 14],
      },
      {
        type: "prop-canopy",
        lengthWeightRange: [0.3, 0.38],
        tipWidthFactorRange: [0.48, 0.64],
        shoulderWidthFactorRange: [0.94, 1.08],
        transitionFactorRange: [0.86, 1.06],
        curveRange: [8, 16],
      },
      {
        type: "prop-broad",
        lengthWeightRange: [0.32, 0.42],
        tipWidthFactorRange: [0.6, 0.74],
        shoulderWidthFactorRange: [1.0, 1.16],
        transitionFactorRange: [0.9, 1.12],
        curveRange: [6, 12],
      },
    ],
    mid: [
      {
        type: "truss",
        lengthWeightRange: [0.34, 0.46],
        waistWidthFactorRange: [0.62, 0.78],
        bellyWidthFactorRange: [0.78, 0.94],
        trailingWidthFactorRange: [0.8, 0.94],
        waistPositionRange: [0.32, 0.46],
        bellyPositionRange: [0.64, 0.82],
        insetRange: [18, 28],
      },
      {
        type: "pod",
        lengthWeightRange: [0.34, 0.44],
        waistWidthFactorRange: [0.76, 0.9],
        bellyWidthFactorRange: [0.92, 1.08],
        trailingWidthFactorRange: [0.88, 1.02],
        waistPositionRange: [0.34, 0.48],
        bellyPositionRange: [0.68, 0.84],
        insetRange: [12, 20],
      },
      {
        type: "cargo",
        lengthWeightRange: [0.34, 0.46],
        waistWidthFactorRange: [0.86, 1.02],
        bellyWidthFactorRange: [1.0, 1.2],
        trailingWidthFactorRange: [0.96, 1.1],
        waistPositionRange: [0.36, 0.5],
        bellyPositionRange: [0.72, 0.88],
        insetRange: [10, 18],
      },
    ],
    rear: [
      {
        type: "tail-boom",
        lengthWeightRange: [0.32, 0.4],
        baseWidthFactorRange: [0.68, 0.82],
        exhaustWidthFactorRange: [0.5, 0.64],
        tailWidthFactorRange: [0.36, 0.5],
        exhaustPositionRange: [0.54, 0.7],
        curveRange: [12, 20],
      },
      {
        type: "tailplane",
        lengthWeightRange: [0.34, 0.44],
        baseWidthFactorRange: [0.78, 0.92],
        exhaustWidthFactorRange: [0.58, 0.7],
        tailWidthFactorRange: [0.48, 0.62],
        exhaustPositionRange: [0.56, 0.72],
        curveRange: [10, 18],
      },
    ],
  },
  styleAdjustments: {
    front: {
      normal: {},
      skinny: {
        tipWidthFactor: [0.92, 1.02],
        transitionFactor: [0.94, 1.08],
        curve: [1.04, 1.16],
      },
      bulky: {
        tipWidthFactor: [1.04, 1.14],
        shoulderWidthFactor: [1.04, 1.12],
        transitionFactor: [0.9, 1.02],
        curve: [0.92, 1.02],
      },
    },
    mid: {
      normal: {},
      skinny: {
        waistWidthFactor: [0.94, 1.04],
        bellyWidthFactor: [0.94, 1.04],
        inset: [1.1, 1.22],
      },
      bulky: {
        waistWidthFactor: [1.08, 1.18],
        bellyWidthFactor: [1.1, 1.24],
        inset: [0.88, 0.96],
      },
    },
    rear: {
      normal: {},
      skinny: {
        baseWidthFactor: [0.96, 1.08],
        tailWidthFactor: [0.96, 1.08],
        curve: [1.04, 1.18],
      },
      bulky: {
        baseWidthFactor: [1.04, 1.16],
        tailWidthFactor: [1.02, 1.14],
        curve: [0.92, 1.02],
      },
    },
  },
};

export class BiPlaneFactory extends BaseSpaceshipFactory {
  constructor() {
    super("biplane", BIPLANE_GEOMETRY);
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
}
