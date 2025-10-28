import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";
import { createStandardGeometry } from "./geometryDefinitions.js";

const FIGHTER_GEOMETRY = createStandardGeometry({
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["needle"],
      midTypes: ["slim", "modular"],
      rearTypes: ["tapered"],
      widthScaleRange: [0.74, 0.88],
    },
    {
      key: "normal",
      frontTypes: ["needle", "canopy"],
      midTypes: ["slim", "modular"],
      rearTypes: ["tapered", "thruster"],
      widthScaleRange: [0.9, 1.02],
    },
    {
      key: "bulky",
      frontTypes: ["canopy", "ram"],
      midTypes: ["modular"],
      rearTypes: ["thruster"],
      widthScaleRange: [1.02, 1.18],
    },
  ],
  segments: {
    front: [
      {
        type: "needle",
        lengthWeightRange: [0.34, 0.44],
        tipWidthFactorRange: [0.1, 0.18],
        shoulderWidthFactorRange: [1.02, 1.14],
        transitionFactorRange: [0.7, 0.86],
        curveRange: [26, 38],
      },
      {
        type: "canopy",
        lengthWeightRange: [0.3, 0.38],
        tipWidthFactorRange: [0.32, 0.46],
        shoulderWidthFactorRange: [1.04, 1.16],
        transitionFactorRange: [0.88, 1.02],
        curveRange: [16, 24],
      },
      {
        type: "ram",
        lengthWeightRange: [0.28, 0.34],
        tipWidthFactorRange: [0.22, 0.3],
        shoulderWidthFactorRange: [0.96, 1.08],
        transitionFactorRange: [0.82, 0.94],
        curveRange: [20, 28],
      },
    ],
    rear: [
      {
        type: "tapered",
        lengthWeightRange: [0.32, 0.4],
        baseWidthFactorRange: [0.92, 1.04],
        exhaustWidthFactorRange: [0.6, 0.72],
        tailWidthFactorRange: [0.44, 0.58],
        exhaustPositionRange: [0.58, 0.72],
        curveRange: [18, 26],
      },
      {
        type: "thruster",
        lengthWeightRange: [0.36, 0.48],
        baseWidthFactorRange: [1.08, 1.28],
        exhaustWidthFactorRange: [0.82, 1.02],
        tailWidthFactorRange: [0.6, 0.72],
        exhaustPositionRange: [0.64, 0.82],
        curveRange: [20, 30],
      },
      {
        type: "block",
        lengthWeightRange: [0.34, 0.46],
        baseWidthFactorRange: [1.04, 1.24],
        exhaustWidthFactorRange: [0.9, 1.08],
        tailWidthFactorRange: [0.66, 0.82],
        exhaustPositionRange: [0.6, 0.76],
        curveRange: [14, 24],
      },
    ],
  },
});

export class FighterSpaceShipFactory extends BaseSpaceshipFactory {
  constructor() {
    super("fighter", FIGHTER_GEOMETRY);
  }

  buildDefinition() {
    return {
      label: "Fighter",
      description:
        "Aggressive interceptors with sharp silhouettes and agile control surfaces.",
      wingStyles: ["delta", "swept", "forward"],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [21.33, 35.0],
        bodyMidInsetPercent: [6.67, 18.33],
        noseCurvePercent: [12.0, 25.0],
        tailCurvePercent: [10.67, 21.67],
        noseWidthFactor: [0.32, 0.45],
        tailWidthFactor: [0.48, 0.64],
        cockpitWidthPercent: [18.67, 30.0],
        cockpitHeightPercent: [12.0, 21.67],
        cockpit_center_start: 46.0,
        cockpit_center_end: 55.0,
        engineCount: [1, 2],
        engineSizePercent: [12.0, 23.33],
        engineSpacingPercent: [18.67, 36.67],
        nozzlePercent: [13.33, 26.67],
        wingSpanPercent: [34.67, 58.33],
        wingSweepPercent: [17.33, 33.33],
        wingForwardPercent: [5.33, 15.0],
        wingThicknessPercent: [8.0, 15.0],
        wing_attach_start: 46.0,
        wing_attach_end: 55.0,
        wingDihedralPercent: [-4.0, 11.67],
        finCount: [1, 2],
        finHeightPercent: [21.33, 43.33],
        finWidthPercent: [6.67, 15.0],
        stripeStartPercent: [12.0, 31.67],
      },
      features: {
        topFinProbability: 0.7,
        sideFinProbability: 0.45,
        bottomFinProbability: 0.25,
        platingProbability: 0.6,
        stripeProbability: 0.55,
        antennaProbability: 0.35,
        wingTipAccentProbability: 0.7,
        winglessProbability: 0.12,
        aftWingProbability: 0.38,
      },
    };
  }
}
