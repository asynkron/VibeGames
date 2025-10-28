import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";
import { createStandardGeometry } from "./geometryDefinitions.js";

const FREIGHT_GEOMETRY = createStandardGeometry({
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["canopy"],
      midTypes: ["modular"],
      rearTypes: ["tapered", "thruster"],
      widthScaleRange: [0.9, 1.04],
    },
    {
      key: "normal",
      frontTypes: ["canopy", "ram"],
      midTypes: ["modular", "bulwark"],
      rearTypes: ["thruster", "block"],
      widthScaleRange: [1.08, 1.24],
    },
    {
      key: "bulky",
      frontTypes: ["ram"],
      midTypes: ["bulwark"],
      rearTypes: ["thruster", "block"],
      widthScaleRange: [1.24, 1.38],
    },
  ],
  segments: {
    front: [
      {
        type: "needle",
        lengthWeightRange: [0.34, 0.42],
        tipWidthFactorRange: [0.14, 0.24],
        shoulderWidthFactorRange: [1.08, 1.2],
        transitionFactorRange: [0.76, 0.92],
        curveRange: [24, 34],
      },
      {
        type: "canopy",
        lengthWeightRange: [0.32, 0.42],
        tipWidthFactorRange: [0.46, 0.62],
        shoulderWidthFactorRange: [1.12, 1.26],
        transitionFactorRange: [0.92, 1.12],
        curveRange: [12, 22],
      },
      {
        type: "ram",
        lengthWeightRange: [0.3, 0.38],
        tipWidthFactorRange: [0.3, 0.46],
        shoulderWidthFactorRange: [1.04, 1.2],
        transitionFactorRange: [0.86, 1.02],
        curveRange: [18, 28],
      },
    ],
    mid: [
      {
        type: "slim",
        lengthWeightRange: [0.34, 0.44],
        waistWidthFactorRange: [0.82, 0.96],
        bellyWidthFactorRange: [0.96, 1.12],
        trailingWidthFactorRange: [0.92, 1.06],
        waistPositionRange: [0.32, 0.44],
        bellyPositionRange: [0.64, 0.8],
        insetRange: [12, 20],
      },
      {
        type: "modular",
        lengthWeightRange: [0.34, 0.46],
        waistWidthFactorRange: [0.96, 1.12],
        bellyWidthFactorRange: [1.08, 1.24],
        trailingWidthFactorRange: [1.02, 1.16],
        waistPositionRange: [0.34, 0.48],
        bellyPositionRange: [0.7, 0.86],
        insetRange: [10, 18],
      },
      {
        type: "bulwark",
        lengthWeightRange: [0.34, 0.46],
        waistWidthFactorRange: [1.16, 1.32],
        bellyWidthFactorRange: [1.24, 1.4],
        trailingWidthFactorRange: [1.18, 1.34],
        waistPositionRange: [0.38, 0.52],
        bellyPositionRange: [0.74, 0.88],
        insetRange: [6, 14],
      },
    ],
    rear: [
      {
        type: "tapered",
        lengthWeightRange: [0.32, 0.4],
        baseWidthFactorRange: [1.02, 1.16],
        exhaustWidthFactorRange: [0.7, 0.82],
        tailWidthFactorRange: [0.52, 0.68],
        exhaustPositionRange: [0.6, 0.74],
        curveRange: [16, 24],
      },
      {
        type: "thruster",
        lengthWeightRange: [0.36, 0.48],
        baseWidthFactorRange: [1.2, 1.42],
        exhaustWidthFactorRange: [0.92, 1.12],
        tailWidthFactorRange: [0.66, 0.82],
        exhaustPositionRange: [0.62, 0.82],
        curveRange: [18, 28],
      },
      {
        type: "block",
        lengthWeightRange: [0.36, 0.5],
        baseWidthFactorRange: [1.22, 1.46],
        exhaustWidthFactorRange: [0.96, 1.16],
        tailWidthFactorRange: [0.76, 0.92],
        exhaustPositionRange: [0.62, 0.8],
        curveRange: [14, 24],
      },
    ],
  },
});

export class FreightSpaceShipFactory extends BaseSpaceshipFactory {
  constructor() {
    super("freight", FREIGHT_GEOMETRY);
  }

  buildDefinition() {
    return {
      label: "Freight",
      description: "Bulky haulers with reinforced hulls and multiple engines.",
      wingStyles: ["broad", "box"],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [21.05, 34.67],
        bodyMidInsetPercent: [2.11, 8.0],
        noseCurvePercent: [5.26, 12.0],
        tailCurvePercent: [11.58, 24.0],
        noseWidthFactor: [0.5, 0.65],
        tailWidthFactor: [0.6, 0.78],
        cockpitWidthPercent: [15.79, 26.67],
        cockpitHeightPercent: [8.42, 14.67],
        cockpit_center_start: 52.11,
        cockpit_center_end: 60.67,
        engineCount: [2, 4],
        engineSizePercent: [10.53, 18.67],
        engineSpacingPercent: [17.89, 33.33],
        nozzlePercent: [12.63, 24.0],
        wingSpanPercent: [21.05, 38.67],
        wingSweepPercent: [6.32, 16.0],
        wingForwardPercent: [2.11, 8.0],
        wingThicknessPercent: [9.47, 17.33],
        wing_attach_start: 56.32,
        wing_attach_end: 67.33,
        wingDihedralPercent: [-2.11, 5.33],
        finCount: [2, 3],
        finHeightPercent: [12.63, 25.33],
        finWidthPercent: [6.32, 14.67],
        stripeStartPercent: [16.84, 37.33],
      },
      features: {
        topFinProbability: 0.45,
        sideFinProbability: 0.6,
        bottomFinProbability: 0.4,
        platingProbability: 0.85,
        stripeProbability: 0.4,
        antennaProbability: 0.2,
        wingTipAccentProbability: 0.35,
        winglessProbability: 0.05,
        aftWingProbability: 0.25,
      },
    };
  }
}
