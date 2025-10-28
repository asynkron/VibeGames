import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";
import { createStandardGeometry } from "./geometryDefinitions.js";

const WWII_GEOMETRY = createStandardGeometry({
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["needle", "canopy"],
      midTypes: ["slim"],
      rearTypes: ["tapered"],
      widthScaleRange: [0.76, 0.9],
    },
    {
      key: "normal",
      frontTypes: ["needle", "canopy", "ram"],
      midTypes: ["slim", "modular"],
      rearTypes: ["tapered", "thruster"],
      widthScaleRange: [0.9, 1.06],
    },
    {
      key: "bulky",
      frontTypes: ["canopy", "ram"],
      midTypes: ["modular", "bulwark"],
      rearTypes: ["thruster", "block"],
      widthScaleRange: [1.04, 1.18],
    },
  ],
  segments: {
    front: [
      {
        type: "needle",
        lengthWeightRange: [0.34, 0.44],
        tipWidthFactorRange: [0.12, 0.18],
        shoulderWidthFactorRange: [1.02, 1.14],
        transitionFactorRange: [0.72, 0.88],
        curveRange: [26, 36],
      },
      {
        type: "canopy",
        lengthWeightRange: [0.3, 0.38],
        tipWidthFactorRange: [0.38, 0.52],
        shoulderWidthFactorRange: [1.06, 1.18],
        transitionFactorRange: [0.88, 1.04],
        curveRange: [16, 26],
      },
      {
        type: "ram",
        lengthWeightRange: [0.28, 0.36],
        tipWidthFactorRange: [0.24, 0.34],
        shoulderWidthFactorRange: [0.98, 1.1],
        transitionFactorRange: [0.84, 0.98],
        curveRange: [18, 28],
      },
    ],
    rear: [
      {
        type: "tapered",
        lengthWeightRange: [0.32, 0.4],
        baseWidthFactorRange: [0.94, 1.08],
        exhaustWidthFactorRange: [0.64, 0.78],
        tailWidthFactorRange: [0.48, 0.64],
        exhaustPositionRange: [0.58, 0.74],
        curveRange: [16, 26],
      },
      {
        type: "thruster",
        lengthWeightRange: [0.34, 0.44],
        baseWidthFactorRange: [1.06, 1.26],
        exhaustWidthFactorRange: [0.82, 1.0],
        tailWidthFactorRange: [0.6, 0.74],
        exhaustPositionRange: [0.62, 0.8],
        curveRange: [18, 28],
      },
      {
        type: "block",
        lengthWeightRange: [0.34, 0.44],
        baseWidthFactorRange: [1.1, 1.28],
        exhaustWidthFactorRange: [0.9, 1.08],
        tailWidthFactorRange: [0.68, 0.84],
        exhaustPositionRange: [0.62, 0.78],
        curveRange: [14, 24],
      },
    ],
  },
});

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
