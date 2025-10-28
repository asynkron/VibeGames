import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

export class TransportSpaceShipFactory extends BaseSpaceshipFactory {
  constructor() {
    super("transport");
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
