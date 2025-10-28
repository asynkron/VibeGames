import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";
import { createStandardGeometry } from "./geometryDefinitions.js";

const DRONE_GEOMETRY = createStandardGeometry({
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["needle", "canopy"],
      midTypes: ["slim"],
      rearTypes: ["thruster"],
      widthScaleRange: [0.84, 0.98],
    },
    {
      key: "normal",
      frontTypes: ["needle", "canopy", "ram"],
      midTypes: ["slim", "modular"],
      rearTypes: ["thruster"],
      widthScaleRange: [0.96, 1.12],
    },
    {
      key: "bulky",
      frontTypes: ["canopy", "ram"],
      midTypes: ["modular", "bulwark"],
      rearTypes: ["thruster", "block"],
      widthScaleRange: [1.1, 1.26],
    },
  ],
  segments: {
    front: [
      {
        type: "needle",
        lengthWeightRange: [0.32, 0.4],
        tipWidthFactorRange: [0.12, 0.22],
        shoulderWidthFactorRange: [1.04, 1.18],
        transitionFactorRange: [0.72, 0.9],
        curveRange: [24, 34],
      },
      {
        type: "canopy",
        lengthWeightRange: [0.3, 0.4],
        tipWidthFactorRange: [0.36, 0.54],
        shoulderWidthFactorRange: [1.08, 1.22],
        transitionFactorRange: [0.9, 1.08],
        curveRange: [14, 24],
      },
      {
        type: "ram",
        lengthWeightRange: [0.28, 0.36],
        tipWidthFactorRange: [0.24, 0.38],
        shoulderWidthFactorRange: [1, 1.14],
        transitionFactorRange: [0.84, 1.0],
        curveRange: [18, 28],
      },
    ],
    rear: [
      {
        type: "tapered",
        lengthWeightRange: [0.3, 0.38],
        baseWidthFactorRange: [0.96, 1.12],
        exhaustWidthFactorRange: [0.68, 0.82],
        tailWidthFactorRange: [0.5, 0.66],
        exhaustPositionRange: [0.6, 0.78],
        curveRange: [16, 26],
      },
      {
        type: "thruster",
        lengthWeightRange: [0.34, 0.46],
        baseWidthFactorRange: [1.12, 1.34],
        exhaustWidthFactorRange: [0.88, 1.08],
        tailWidthFactorRange: [0.62, 0.78],
        exhaustPositionRange: [0.64, 0.84],
        curveRange: [20, 30],
      },
      {
        type: "block",
        lengthWeightRange: [0.34, 0.46],
        baseWidthFactorRange: [1.12, 1.3],
        exhaustWidthFactorRange: [0.94, 1.12],
        tailWidthFactorRange: [0.7, 0.86],
        exhaustPositionRange: [0.62, 0.8],
        curveRange: [16, 26],
      },
    ],
  },
});

export class DroneSpaceShipFactory extends BaseSpaceshipFactory {
  constructor() {
    super("drone", DRONE_GEOMETRY);
  }

  buildDefinition() {
    return {
      label: "Drone",
      description: "Compact unmanned craft with exposed thrusters and sensor pods.",
      wingStyles: ["delta", "box", "ladder"],
      engineStyles: ["jet", "turbofan"],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [23.33, 40.0],
        bodyMidInsetPercent: [6.67, 20.0],
        noseCurvePercent: [8.33, 24.44],
        tailCurvePercent: [8.33, 26.67],
        noseWidthFactor: [0.4, 0.58],
        tailWidthFactor: [0.5, 0.7],
        cockpitWidthPercent: [13.33, 26.67],
        cockpitHeightPercent: [10.0, 20.0],
        cockpit_center_start: 41.67,
        cockpit_center_end: 54.44,
        engineCount: [3, 5],
        engineSizePercent: [11.67, 24.44],
        engineSpacingPercent: [16.67, 35.56],
        nozzlePercent: [11.67, 26.67],
        wingSpanPercent: [26.67, 53.33],
        wingSweepPercent: [8.33, 24.44],
        wingForwardPercent: [1.67, 11.11],
        wingThicknessPercent: [10.0, 20.0],
        wing_attach_start: 41.67,
        wing_attach_end: 54.44,
        wingDihedralPercent: [-10.0, 6.67],
        finCount: [0, 2],
        finHeightPercent: [15.0, 35.56],
        finWidthPercent: [6.67, 17.78],
        stripeStartPercent: [10.0, 28.89],
      },
      features: {
        topFinProbability: 0.35,
        sideFinProbability: 0.5,
        bottomFinProbability: 0.55,
        platingProbability: 0.5,
        stripeProbability: 0.35,
        antennaProbability: 0.55,
        wingTipAccentProbability: 0.45,
        winglessProbability: 0.3,
        aftWingProbability: 0.2,
      },
    };
  }
}
