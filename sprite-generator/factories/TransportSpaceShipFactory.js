import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";
import { createStandardGeometry } from "./geometryDefinitions.js";

const TRANSPORT_GEOMETRY = createStandardGeometry({
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["canopy"],
      midTypes: ["slim", "modular"],
      rearTypes: ["tapered"],
      widthScaleRange: [0.82, 0.96],
    },
    {
      key: "normal",
      frontTypes: ["canopy", "ram"],
      midTypes: ["modular", "bulwark"],
      rearTypes: ["tapered", "thruster"],
      widthScaleRange: [0.98, 1.14],
    },
    {
      key: "bulky",
      frontTypes: ["ram"],
      midTypes: ["bulwark"],
      rearTypes: ["thruster", "block"],
      widthScaleRange: [1.14, 1.28],
    },
  ],
  segments: {
    front: [
      {
        type: "needle",
        lengthWeightRange: [0.32, 0.4],
        tipWidthFactorRange: [0.12, 0.2],
        shoulderWidthFactorRange: [1.06, 1.18],
        transitionFactorRange: [0.74, 0.9],
        curveRange: [24, 34],
      },
      {
        type: "canopy",
        lengthWeightRange: [0.32, 0.42],
        tipWidthFactorRange: [0.4, 0.56],
        shoulderWidthFactorRange: [1.1, 1.24],
        transitionFactorRange: [0.9, 1.08],
        curveRange: [14, 24],
      },
      {
        type: "ram",
        lengthWeightRange: [0.3, 0.38],
        tipWidthFactorRange: [0.26, 0.4],
        shoulderWidthFactorRange: [1.02, 1.16],
        transitionFactorRange: [0.86, 1.0],
        curveRange: [18, 28],
      },
    ],
    mid: [
      {
        type: "slim",
        lengthWeightRange: [0.34, 0.44],
        waistWidthFactorRange: [0.76, 0.92],
        bellyWidthFactorRange: [0.92, 1.08],
        trailingWidthFactorRange: [0.9, 1.04],
        waistPositionRange: [0.32, 0.44],
        bellyPositionRange: [0.66, 0.82],
        insetRange: [12, 22],
      },
      {
        type: "modular",
        lengthWeightRange: [0.34, 0.44],
        waistWidthFactorRange: [0.92, 1.08],
        bellyWidthFactorRange: [1.04, 1.2],
        trailingWidthFactorRange: [0.98, 1.14],
        waistPositionRange: [0.34, 0.48],
        bellyPositionRange: [0.7, 0.86],
        insetRange: [10, 18],
      },
      {
        type: "bulwark",
        lengthWeightRange: [0.34, 0.44],
        waistWidthFactorRange: [1.14, 1.3],
        bellyWidthFactorRange: [1.2, 1.36],
        trailingWidthFactorRange: [1.12, 1.3],
        waistPositionRange: [0.38, 0.5],
        bellyPositionRange: [0.72, 0.88],
        insetRange: [8, 16],
      },
    ],
    rear: [
      {
        type: "tapered",
        lengthWeightRange: [0.32, 0.42],
        baseWidthFactorRange: [0.98, 1.12],
        exhaustWidthFactorRange: [0.64, 0.78],
        tailWidthFactorRange: [0.48, 0.64],
        exhaustPositionRange: [0.58, 0.74],
        curveRange: [16, 24],
      },
      {
        type: "thruster",
        lengthWeightRange: [0.34, 0.46],
        baseWidthFactorRange: [1.12, 1.32],
        exhaustWidthFactorRange: [0.86, 1.04],
        tailWidthFactorRange: [0.62, 0.78],
        exhaustPositionRange: [0.62, 0.8],
        curveRange: [18, 28],
      },
      {
        type: "block",
        lengthWeightRange: [0.34, 0.46],
        baseWidthFactorRange: [1.16, 1.34],
        exhaustWidthFactorRange: [0.92, 1.1],
        tailWidthFactorRange: [0.72, 0.88],
        exhaustPositionRange: [0.62, 0.78],
        curveRange: [14, 24],
      },
    ],
  },
});

export class TransportSpaceShipFactory extends BaseSpaceshipFactory {
  constructor() {
    super("transport", TRANSPORT_GEOMETRY);
  }

  buildDefinition() {
    return {
      label: "Transport",
      description: "Versatile shuttles balancing passenger pods and engine pods.",
      wingStyles: ["swept", "ladder", "split"],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [20.0, 35.38],
        bodyMidInsetPercent: [3.53, 12.31],
        noseCurvePercent: [8.24, 18.46],
        tailCurvePercent: [9.41, 21.54],
        noseWidthFactor: [0.38, 0.55],
        tailWidthFactor: [0.55, 0.7],
        cockpitWidthPercent: [15.29, 26.15],
        cockpitHeightPercent: [10.59, 18.46],
        cockpit_center_start: 48.82,
        cockpit_center_end: 57.69,
        engineCount: [2, 3],
        engineSizePercent: [10.59, 20.0],
        engineSpacingPercent: [17.65, 33.85],
        nozzlePercent: [11.76, 24.62],
        wingSpanPercent: [28.24, 49.23],
        wingSweepPercent: [10.59, 24.62],
        wingForwardPercent: [3.53, 12.31],
        wingThicknessPercent: [8.24, 15.38],
        wing_attach_start: 50.0,
        wing_attach_end: 62.31,
        wingDihedralPercent: [-1.18, 9.23],
        finCount: [1, 2],
        finHeightPercent: [16.47, 33.85],
        finWidthPercent: [7.06, 15.38],
        stripeStartPercent: [11.76, 33.85],
      },
      features: {
        topFinProbability: 0.55,
        sideFinProbability: 0.35,
        bottomFinProbability: 0.35,
        platingProbability: 0.65,
        stripeProbability: 0.5,
        antennaProbability: 0.3,
        wingTipAccentProbability: 0.5,
        winglessProbability: 0.08,
        aftWingProbability: 0.3,
      },
    };
  }
}
