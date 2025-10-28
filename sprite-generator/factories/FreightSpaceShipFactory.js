import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

export class FreightSpaceShipFactory extends BaseSpaceshipFactory {
  constructor() {
    super("freight");
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
