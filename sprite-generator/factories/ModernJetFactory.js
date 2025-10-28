import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

const MODERN_JET_GEOMETRY = {
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["jet-needle"],
      midTypes: ["jet-spine"],
      rearTypes: ["jet-tailcone"],
      widthScaleRange: [0.7, 0.84],
    },
    {
      key: "normal",
      frontTypes: ["jet-needle", "jet-lens"],
      midTypes: ["jet-spine", "jet-fuselage"],
      rearTypes: ["jet-tailcone", "jet-thruster"],
      widthScaleRange: [0.84, 0.98],
    },
    {
      key: "bulky",
      frontTypes: ["jet-wedge"],
      midTypes: ["jet-fuselage", "jet-intake"],
      rearTypes: ["jet-thruster", "jet-shroud"],
      widthScaleRange: [0.98, 1.14],
    },
  ],
  segments: {
    front: [
      {
        type: "jet-needle",
        lengthWeightRange: [0.36, 0.48],
        tipWidthFactorRange: [0.08, 0.14],
        shoulderWidthFactorRange: [1.04, 1.18],
        transitionFactorRange: [0.7, 0.84],
        curveRange: [26, 38],
      },
      {
        type: "jet-lens",
        lengthWeightRange: [0.32, 0.4],
        tipWidthFactorRange: [0.24, 0.36],
        shoulderWidthFactorRange: [1.08, 1.22],
        transitionFactorRange: [0.82, 0.98],
        curveRange: [18, 28],
      },
      {
        type: "jet-wedge",
        lengthWeightRange: [0.3, 0.38],
        tipWidthFactorRange: [0.3, 0.44],
        shoulderWidthFactorRange: [1.12, 1.28],
        transitionFactorRange: [0.86, 1.02],
        curveRange: [16, 26],
      },
    ],
    mid: [
      {
        type: "jet-spine",
        lengthWeightRange: [0.34, 0.44],
        waistWidthFactorRange: [0.72, 0.86],
        bellyWidthFactorRange: [0.86, 1.0],
        trailingWidthFactorRange: [0.82, 0.96],
        waistPositionRange: [0.32, 0.44],
        bellyPositionRange: [0.64, 0.8],
        insetRange: [16, 26],
      },
      {
        type: "jet-fuselage",
        lengthWeightRange: [0.34, 0.46],
        waistWidthFactorRange: [0.82, 0.96],
        bellyWidthFactorRange: [0.96, 1.14],
        trailingWidthFactorRange: [0.9, 1.04],
        waistPositionRange: [0.36, 0.48],
        bellyPositionRange: [0.68, 0.86],
        insetRange: [12, 20],
      },
      {
        type: "jet-intake",
        lengthWeightRange: [0.32, 0.42],
        waistWidthFactorRange: [0.9, 1.08],
        bellyWidthFactorRange: [1.08, 1.26],
        trailingWidthFactorRange: [0.98, 1.16],
        waistPositionRange: [0.38, 0.5],
        bellyPositionRange: [0.7, 0.88],
        insetRange: [10, 18],
      },
    ],
    rear: [
      {
        type: "jet-tailcone",
        lengthWeightRange: [0.3, 0.38],
        baseWidthFactorRange: [0.92, 1.08],
        exhaustWidthFactorRange: [0.54, 0.7],
        tailWidthFactorRange: [0.42, 0.58],
        exhaustPositionRange: [0.58, 0.74],
        curveRange: [18, 26],
      },
      {
        type: "jet-thruster",
        lengthWeightRange: [0.34, 0.46],
        baseWidthFactorRange: [1.12, 1.3],
        exhaustWidthFactorRange: [0.84, 1.04],
        tailWidthFactorRange: [0.6, 0.76],
        exhaustPositionRange: [0.62, 0.82],
        curveRange: [22, 32],
      },
      {
        type: "jet-shroud",
        lengthWeightRange: [0.32, 0.44],
        baseWidthFactorRange: [1.04, 1.22],
        exhaustWidthFactorRange: [0.92, 1.12],
        tailWidthFactorRange: [0.66, 0.84],
        exhaustPositionRange: [0.62, 0.8],
        curveRange: [18, 28],
      },
    ],
  },
  styleAdjustments: {
    front: {
      normal: {},
      skinny: {
        tipWidthFactor: [0.9, 1.0],
        transitionFactor: [0.94, 1.08],
        curve: [1.06, 1.18],
      },
      bulky: {
        tipWidthFactor: [1.08, 1.18],
        shoulderWidthFactor: [1.06, 1.16],
        transitionFactor: [0.88, 1.02],
        curve: [0.92, 1.04],
      },
    },
    mid: {
      normal: {},
      skinny: {
        waistWidthFactor: [0.92, 1.02],
        bellyWidthFactor: [0.92, 1.02],
        inset: [1.08, 1.22],
      },
      bulky: {
        waistWidthFactor: [1.1, 1.24],
        bellyWidthFactor: [1.14, 1.3],
        inset: [0.84, 0.96],
      },
    },
    rear: {
      normal: {},
      skinny: {
        baseWidthFactor: [0.96, 1.06],
        tailWidthFactor: [0.94, 1.04],
        curve: [1.04, 1.16],
      },
      bulky: {
        baseWidthFactor: [1.08, 1.22],
        tailWidthFactor: [1.04, 1.16],
        curve: [0.92, 1.04],
      },
    },
  },
};

export class ModernJetFactory extends BaseSpaceshipFactory {
  constructor() {
    super("jet", MODERN_JET_GEOMETRY);
  }

  buildDefinition() {
    return {
      label: "Jet Fighter",
      description: "Modern supersonic aircraft with sleek intakes and afterburning engines.",
      wingStyles: ["delta", "swept", "forward"],
      engineStyles: ["jet", "turbofan"],
      engineMountPercentRange: [0.72, 0.96],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [20.0, 30.0],
        bodyMidInsetPercent: [6.0, 16.0],
        noseCurvePercent: [10.0, 22.0],
        tailCurvePercent: [12.0, 24.0],
        noseWidthFactor: [0.32, 0.48],
        tailWidthFactor: [0.46, 0.64],
        cockpitWidthPercent: [18.0, 26.0],
        cockpitHeightPercent: [12.0, 20.0],
        cockpit_center_start: 48.0,
        cockpit_center_end: 58.0,
        engineCount: [1, 2],
        engineSizePercent: [13.0, 22.0],
        engineSpacingPercent: [20.0, 36.0],
        nozzlePercent: [14.0, 26.0],
        wingSpanPercent: [36.0, 58.0],
        wingSweepPercent: [18.0, 34.0],
        wingForwardPercent: [6.0, 14.0],
        wingThicknessPercent: [8.0, 14.0],
        wing_attach_start: 46.0,
        wing_attach_end: 58.0,
        wingDihedralPercent: [-2.0, 10.0],
        finCount: [1, 2],
        finHeightPercent: [22.0, 38.0],
        finWidthPercent: [7.0, 15.0],
        stripeStartPercent: [14.0, 36.0],
      },
      features: {
        topFinProbability: 0.65,
        sideFinProbability: 0.35,
        bottomFinProbability: 0.3,
        platingProbability: 0.5,
        stripeProbability: 0.55,
        antennaProbability: 0.25,
        wingTipAccentProbability: 0.6,
        winglessProbability: 0.08,
        aftWingProbability: 0.45,
      },
    };
  }
}
