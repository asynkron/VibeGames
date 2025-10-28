import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

export class DroneSpaceShipFactory extends BaseSpaceshipFactory {
  constructor() {
    super("drone");
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
