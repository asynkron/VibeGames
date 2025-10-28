import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

export class WWIIFactory extends BaseSpaceshipFactory {
  constructor() {
    super("ww2");
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
