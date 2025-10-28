import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";
import { createStandardGeometry } from "./geometryDefinitions.js";

const MODERN_JET_GEOMETRY = createStandardGeometry({
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["needle"],
      midTypes: ["slim"],
      rearTypes: ["tapered"],
      widthScaleRange: [0.72, 0.86],
    },
    {
      key: "normal",
      frontTypes: ["needle", "canopy"],
      midTypes: ["slim", "modular"],
      rearTypes: ["tapered", "thruster"],
      widthScaleRange: [0.86, 1.0],
    },
    {
      key: "bulky",
      frontTypes: ["canopy", "ram"],
      midTypes: ["modular"],
      rearTypes: ["thruster"],
      widthScaleRange: [1.0, 1.16],
    },
  ],
  segments: {
    front: [
      {
        type: "needle",
        lengthWeightRange: [0.36, 0.46],
        tipWidthFactorRange: [0.1, 0.16],
        shoulderWidthFactorRange: [1.02, 1.12],
        transitionFactorRange: [0.7, 0.84],
        curveRange: [28, 40],
      },
      {
        type: "canopy",
        lengthWeightRange: [0.32, 0.4],
        tipWidthFactorRange: [0.3, 0.46],
        shoulderWidthFactorRange: [1.04, 1.16],
        transitionFactorRange: [0.86, 1.02],
        curveRange: [16, 26],
      },
      {
        type: "ram",
        lengthWeightRange: [0.28, 0.36],
        tipWidthFactorRange: [0.22, 0.32],
        shoulderWidthFactorRange: [0.96, 1.08],
        transitionFactorRange: [0.82, 0.94],
        curveRange: [20, 30],
      },
    ],
    rear: [
      {
        type: "tapered",
        lengthWeightRange: [0.3, 0.38],
        baseWidthFactorRange: [0.9, 1.04],
        exhaustWidthFactorRange: [0.58, 0.72],
        tailWidthFactorRange: [0.44, 0.58],
        exhaustPositionRange: [0.58, 0.72],
        curveRange: [18, 26],
      },
      {
        type: "thruster",
        lengthWeightRange: [0.36, 0.48],
        baseWidthFactorRange: [1.12, 1.32],
        exhaustWidthFactorRange: [0.84, 1.04],
        tailWidthFactorRange: [0.6, 0.74],
        exhaustPositionRange: [0.64, 0.84],
        curveRange: [22, 32],
      },
      {
        type: "block",
        lengthWeightRange: [0.34, 0.44],
        baseWidthFactorRange: [1.04, 1.24],
        exhaustWidthFactorRange: [0.9, 1.08],
        tailWidthFactorRange: [0.66, 0.82],
        exhaustPositionRange: [0.62, 0.78],
        curveRange: [16, 26],
      },
    ],
  },
});

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
