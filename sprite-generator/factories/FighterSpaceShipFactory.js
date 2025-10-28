import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

export class FighterSpaceShipFactory extends BaseSpaceshipFactory {
  constructor() {
    super("fighter");
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
