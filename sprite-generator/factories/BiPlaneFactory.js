import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

const BIPLANE_GEOMETRY = {
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["prop-lantern"],
      midTypes: ["keel-truss"],
      rearTypes: ["boom-spar"],
      widthScaleRange: [0.66, 0.8],
    },
    {
      key: "normal",
      frontTypes: ["prop-lantern", "prop-bubble"],
      midTypes: ["keel-truss", "keel-tube"],
      rearTypes: ["boom-spar", "boom-fairing"],
      widthScaleRange: [0.78, 0.92],
    },
    {
      key: "bulky",
      frontTypes: ["prop-barrel"],
      midTypes: ["keel-tube", "keel-cargo"],
      rearTypes: ["boom-fairing"],
      widthScaleRange: [0.9, 1.06],
    },
  ],
  segments: {
    front: [
      {
        type: "prop-lantern",
        lengthWeightRange: [0.34, 0.44],
        tipWidthFactorRange: [0.46, 0.58],
        shoulderWidthFactorRange: [0.92, 1.06],
        transitionFactorRange: [0.84, 1.04],
        curveRange: [8, 16],
      },
      {
        type: "prop-bubble",
        lengthWeightRange: [0.3, 0.38],
        tipWidthFactorRange: [0.54, 0.68],
        shoulderWidthFactorRange: [1.02, 1.18],
        transitionFactorRange: [0.88, 1.12],
        curveRange: [6, 14],
      },
      {
        type: "prop-barrel",
        lengthWeightRange: [0.32, 0.42],
        tipWidthFactorRange: [0.64, 0.78],
        shoulderWidthFactorRange: [1.12, 1.28],
        transitionFactorRange: [0.92, 1.16],
        curveRange: [6, 12],
      },
    ],
    mid: [
      {
        type: "keel-truss",
        lengthWeightRange: [0.36, 0.48],
        waistWidthFactorRange: [0.64, 0.8],
        bellyWidthFactorRange: [0.8, 0.96],
        trailingWidthFactorRange: [0.82, 0.96],
        waistPositionRange: [0.3, 0.44],
        bellyPositionRange: [0.62, 0.8],
        insetRange: [18, 28],
      },
      {
        type: "keel-tube",
        lengthWeightRange: [0.34, 0.46],
        waistWidthFactorRange: [0.78, 0.92],
        bellyWidthFactorRange: [0.94, 1.12],
        trailingWidthFactorRange: [0.9, 1.04],
        waistPositionRange: [0.34, 0.48],
        bellyPositionRange: [0.68, 0.86],
        insetRange: [12, 20],
      },
      {
        type: "keel-cargo",
        lengthWeightRange: [0.36, 0.48],
        waistWidthFactorRange: [0.88, 1.04],
        bellyWidthFactorRange: [1.04, 1.24],
        trailingWidthFactorRange: [0.98, 1.12],
        waistPositionRange: [0.36, 0.52],
        bellyPositionRange: [0.7, 0.88],
        insetRange: [10, 18],
      },
    ],
    rear: [
      {
        type: "boom-spar",
        lengthWeightRange: [0.32, 0.42],
        baseWidthFactorRange: [0.7, 0.84],
        exhaustWidthFactorRange: [0.5, 0.64],
        tailWidthFactorRange: [0.36, 0.5],
        exhaustPositionRange: [0.54, 0.7],
        curveRange: [12, 20],
      },
      {
        type: "boom-fairing",
        lengthWeightRange: [0.34, 0.46],
        baseWidthFactorRange: [0.8, 0.94],
        exhaustWidthFactorRange: [0.58, 0.72],
        tailWidthFactorRange: [0.48, 0.64],
        exhaustPositionRange: [0.56, 0.72],
        curveRange: [10, 18],
      },
    ],
  },
  styleAdjustments: {
    front: {
      normal: {},
      skinny: {
        tipWidthFactor: [0.9, 1.0],
        transitionFactor: [0.96, 1.1],
        curve: [1.06, 1.18],
      },
      bulky: {
        tipWidthFactor: [1.06, 1.16],
        shoulderWidthFactor: [1.06, 1.14],
        transitionFactor: [0.9, 1.02],
        curve: [0.9, 1.02],
      },
    },
    mid: {
      normal: {},
      skinny: {
        waistWidthFactor: [0.94, 1.02],
        bellyWidthFactor: [0.94, 1.04],
        inset: [1.12, 1.26],
      },
      bulky: {
        waistWidthFactor: [1.08, 1.2],
        bellyWidthFactor: [1.12, 1.28],
        inset: [0.86, 0.96],
      },
    },
    rear: {
      normal: {},
      skinny: {
        baseWidthFactor: [0.96, 1.06],
        tailWidthFactor: [0.96, 1.08],
        curve: [1.06, 1.18],
      },
      bulky: {
        baseWidthFactor: [1.04, 1.18],
        tailWidthFactor: [1.04, 1.16],
        curve: [0.9, 1.02],
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
