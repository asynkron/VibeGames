import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

export class BiPlaneFactory extends BaseSpaceshipFactory {
  constructor() {
    super("biplane");
  }

  buildDefinition() {
    return {
      label: "Biplane",
      description: "Classic 1910s two-wing fighters with exposed frames and rotary props.",
      wingStyles: ["box", "broad"],
      engineStyles: ["propeller"],
      engineMountPercentRange: [0.02, 0.12],
      wingLayers: [
        { offsetPercent: -6, heightPercent: 4.5, thicknessScale: 0.85 },
        { offsetPercent: 6, heightPercent: -4.5, thicknessScale: 0.85 },
      ],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [16.0, 24.0],
        bodyMidInsetPercent: [4.0, 10.0],
        noseCurvePercent: [6.0, 12.0],
        tailCurvePercent: [8.0, 16.0],
        noseWidthFactor: [0.42, 0.58],
        tailWidthFactor: [0.5, 0.68],
        cockpitWidthPercent: [14.0, 22.0],
        cockpitHeightPercent: [12.0, 22.0],
        cockpit_center_start: 46.0,
        cockpit_center_end: 58.0,
        engineCount: [1, 1],
        engineSizePercent: [10.0, 16.0],
        engineSpacingPercent: [0, 0],
        nozzlePercent: [0, 0],
        wingSpanPercent: [48.0, 70.0],
        wingSweepPercent: [4.0, 10.0],
        wingForwardPercent: [2.0, 8.0],
        wingThicknessPercent: [9.0, 15.0],
        wing_attach_start: 46.0,
        wing_attach_end: 60.0,
        wingDihedralPercent: [4.0, 14.0],
        finCount: [1, 1],
        finHeightPercent: [18.0, 32.0],
        finWidthPercent: [8.0, 16.0],
        stripeStartPercent: [18.0, 42.0],
      },
      features: {
        topFinProbability: 0.4,
        sideFinProbability: 0.15,
        bottomFinProbability: 0.25,
        platingProbability: 0.35,
        stripeProbability: 0.45,
        antennaProbability: 0.25,
        wingTipAccentProbability: 0.3,
        winglessProbability: 0.0,
        aftWingProbability: 0.0,
      },
    };
  }
}
