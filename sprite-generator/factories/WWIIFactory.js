import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

const WWII_GEOMETRY = {
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["warbird-spike"],
      midTypes: ["warbird-tube"],
      rearTypes: ["warbird-tailcone"],
      widthScaleRange: [0.74, 0.88],
    },
    {
      key: "normal",
      frontTypes: ["warbird-spike", "warbird-cowl"],
      midTypes: ["warbird-tube", "warbird-bay"],
      rearTypes: ["warbird-tailcone", "warbird-rudder"],
      widthScaleRange: [0.86, 1.02],
    },
    {
      key: "bulky",
      frontTypes: ["warbird-hammer"],
      midTypes: ["warbird-bay", "warbird-ridge"],
      rearTypes: ["warbird-rudder", "warbird-cutoff"],
      widthScaleRange: [0.98, 1.16],
    },
  ],
  segments: {
    front: [
      {
        type: "warbird-spike",
        lengthWeightRange: [0.34, 0.44],
        tipWidthFactorRange: [0.18, 0.28],
        shoulderWidthFactorRange: [1.04, 1.18],
        transitionFactorRange: [0.74, 0.9],
        curveRange: [22, 34],
      },
      {
        type: "warbird-cowl",
        lengthWeightRange: [0.32, 0.4],
        tipWidthFactorRange: [0.42, 0.58],
        shoulderWidthFactorRange: [1.08, 1.22],
        transitionFactorRange: [0.86, 1.04],
        curveRange: [14, 24],
      },
      {
        type: "warbird-hammer",
        lengthWeightRange: [0.3, 0.38],
        tipWidthFactorRange: [0.5, 0.66],
        shoulderWidthFactorRange: [1.14, 1.3],
        transitionFactorRange: [0.9, 1.1],
        curveRange: [12, 20],
      },
    ],
    mid: [
      {
        type: "warbird-tube",
        lengthWeightRange: [0.36, 0.48],
        waistWidthFactorRange: [0.78, 0.92],
        bellyWidthFactorRange: [0.98, 1.14],
        trailingWidthFactorRange: [0.9, 1.04],
        waistPositionRange: [0.36, 0.48],
        bellyPositionRange: [0.68, 0.84],
        insetRange: [12, 20],
      },
      {
        type: "warbird-bay",
        lengthWeightRange: [0.34, 0.44],
        waistWidthFactorRange: [0.86, 1.02],
        bellyWidthFactorRange: [1.06, 1.22],
        trailingWidthFactorRange: [0.96, 1.1],
        waistPositionRange: [0.38, 0.5],
        bellyPositionRange: [0.72, 0.88],
        insetRange: [10, 18],
      },
      {
        type: "warbird-ridge",
        lengthWeightRange: [0.34, 0.46],
        waistWidthFactorRange: [0.92, 1.08],
        bellyWidthFactorRange: [1.12, 1.3],
        trailingWidthFactorRange: [1.02, 1.18],
        waistPositionRange: [0.4, 0.54],
        bellyPositionRange: [0.74, 0.9],
        insetRange: [8, 16],
      },
    ],
    rear: [
      {
        type: "warbird-tailcone",
        lengthWeightRange: [0.32, 0.42],
        baseWidthFactorRange: [0.92, 1.08],
        exhaustWidthFactorRange: [0.62, 0.78],
        tailWidthFactorRange: [0.48, 0.64],
        exhaustPositionRange: [0.58, 0.74],
        curveRange: [16, 26],
      },
      {
        type: "warbird-rudder",
        lengthWeightRange: [0.34, 0.44],
        baseWidthFactorRange: [1.02, 1.18],
        exhaustWidthFactorRange: [0.72, 0.88],
        tailWidthFactorRange: [0.58, 0.74],
        exhaustPositionRange: [0.6, 0.78],
        curveRange: [14, 24],
      },
      {
        type: "warbird-cutoff",
        lengthWeightRange: [0.34, 0.46],
        baseWidthFactorRange: [1.1, 1.28],
        exhaustWidthFactorRange: [0.86, 1.02],
        tailWidthFactorRange: [0.64, 0.8],
        exhaustPositionRange: [0.6, 0.76],
        curveRange: [12, 22],
      },
    ],
  },
  styleAdjustments: {
    front: {
      normal: {},
      skinny: {
        tipWidthFactor: [0.92, 1.02],
        transitionFactor: [0.96, 1.1],
        curve: [1.04, 1.18],
      },
      bulky: {
        tipWidthFactor: [1.08, 1.18],
        shoulderWidthFactor: [1.06, 1.16],
        transitionFactor: [0.9, 1.02],
        curve: [0.9, 1.02],
      },
    },
    mid: {
      normal: {},
      skinny: {
        waistWidthFactor: [0.94, 1.04],
        bellyWidthFactor: [0.94, 1.06],
        inset: [1.08, 1.2],
      },
      bulky: {
        waistWidthFactor: [1.1, 1.22],
        bellyWidthFactor: [1.12, 1.3],
        inset: [0.86, 0.96],
      },
    },
    rear: {
      normal: {},
      skinny: {
        baseWidthFactor: [0.96, 1.06],
        tailWidthFactor: [0.96, 1.06],
        curve: [1.04, 1.16],
      },
      bulky: {
        baseWidthFactor: [1.06, 1.2],
        tailWidthFactor: [1.04, 1.16],
        curve: [0.9, 1.02],
      },
    },
  },
};

export class WWIIFactory extends BaseSpaceshipFactory {
  constructor() {
    super("ww2", WWII_GEOMETRY);
  }

  buildDefinition() {
    return {
      label: "WWII Fighter",
      description:
        "Streamlined 1940s aircraft with powerful piston engines and distinctive tails.",
      wingStyles: ["broad", "swept"],
      engineStyles: ["propeller", "radial"],
      engineMountPercentRange: [0.38, 0.58],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [18.0, 28.0],
        bodyMidInsetPercent: [4.0, 11.0],
        noseCurvePercent: [8.0, 16.0],
        tailCurvePercent: [12.0, 22.0],
        noseWidthFactor: [0.42, 0.6],
        tailWidthFactor: [0.52, 0.72],
        cockpitWidthPercent: [16.0, 24.0],
        cockpitHeightPercent: [12.0, 20.0],
        cockpit_center_start: 48.0,
        cockpit_center_end: 60.0,
        engineCount: [1, 2],
        engineSizePercent: [12.0, 20.0],
        engineSpacingPercent: [24.0, 46.0],
        nozzlePercent: [0, 0],
        wingSpanPercent: [42.0, 64.0],
        wingSweepPercent: [10.0, 24.0],
        wingForwardPercent: [6.0, 16.0],
        wingThicknessPercent: [8.0, 14.0],
        wing_attach_start: 50.0,
        wing_attach_end: 62.0,
        wingDihedralPercent: [6.0, 16.0],
        finCount: [1, 1],
        finHeightPercent: [20.0, 36.0],
        finWidthPercent: [8.0, 16.0],
        stripeStartPercent: [20.0, 48.0],
      },
      features: {
        topFinProbability: 0.6,
        sideFinProbability: 0.2,
        bottomFinProbability: 0.25,
        platingProbability: 0.55,
        stripeProbability: 0.6,
        antennaProbability: 0.35,
        wingTipAccentProbability: 0.45,
        winglessProbability: 0.0,
        aftWingProbability: 0.1,
      },
    };
  }
}
