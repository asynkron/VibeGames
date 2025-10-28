import { BaseSpaceshipFactory } from "./BaseSpaceshipFactory.js";

export class ModernJetFactory extends BaseSpaceshipFactory {
  constructor() {
    super("jet");
  }

  buildDefinition() {
    return {
      label: "Jet Fighter",
      description: "Modern supersonic aircraft with sleek intakes and afterburning engines.",
      wingStyles: ["delta", "swept", "forward"],
      engineStyles: ["jet", "turbofan"],
      engineMountPercentRange: [0.72, 0.96],
      ranges: {
        body_start: 0,
        body_end: 100,
        bodyWidthPercent: [20.0, 30.0],
        bodyMidInsetPercent: [6.0, 16.0],
        noseCurvePercent: [10.0, 22.0],
        tailCurvePercent: [12.0, 24.0],
        noseWidthFactor: [0.32, 0.48],
        tailWidthFactor: [0.46, 0.64],
        cockpitWidthPercent: [18.0, 26.0],
        cockpitHeightPercent: [12.0, 20.0],
        cockpit_center_start: 48.0,
        cockpit_center_end: 58.0,
        engineCount: [1, 2],
        engineSizePercent: [13.0, 22.0],
        engineSpacingPercent: [20.0, 36.0],
        nozzlePercent: [14.0, 26.0],
        wingSpanPercent: [36.0, 58.0],
        wingSweepPercent: [18.0, 34.0],
        wingForwardPercent: [6.0, 14.0],
        wingThicknessPercent: [8.0, 14.0],
        wing_attach_start: 46.0,
        wing_attach_end: 58.0,
        wingDihedralPercent: [-2.0, 10.0],
        finCount: [1, 2],
        finHeightPercent: [22.0, 38.0],
        finWidthPercent: [7.0, 15.0],
        stripeStartPercent: [14.0, 36.0],
      },
      features: {
        topFinProbability: 0.65,
        sideFinProbability: 0.35,
        bottomFinProbability: 0.3,
        platingProbability: 0.5,
        stripeProbability: 0.55,
        antennaProbability: 0.25,
        wingTipAccentProbability: 0.6,
        winglessProbability: 0.08,
        aftWingProbability: 0.45,
      },
    };
  }
}
