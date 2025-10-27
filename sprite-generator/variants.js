// Segment variant definitions shared between the generator and debug tooling so
// the preview page can visualise the complete fuselage vocabulary.
export const FRONT_SEGMENT_VARIANTS = [
  {
    type: "needle",
    lengthWeightRange: [0.26, 0.34],
    tipWidthFactorRange: [0.08, 0.14],
    shoulderWidthFactorRange: [0.92, 1.05],
    transitionFactorRange: [0.74, 0.88],
    curveRange: [22, 32],
  },
  {
    type: "canopy",
    lengthWeightRange: [0.18, 0.24],
    tipWidthFactorRange: [0.32, 0.48],
    shoulderWidthFactorRange: [1.02, 1.18],
    transitionFactorRange: [0.85, 1.05],
    curveRange: [12, 20],
  },
  {
    type: "ram",
    lengthWeightRange: [0.22, 0.3],
    tipWidthFactorRange: [0.2, 0.3],
    shoulderWidthFactorRange: [0.96, 1.1],
    transitionFactorRange: [0.78, 0.96],
    curveRange: [16, 26],
  },
];

export const MID_SEGMENT_VARIANTS = [
  {
    type: "slim",
    lengthWeightRange: [0.38, 0.46],
    waistWidthFactorRange: [0.78, 0.9],
    bellyWidthFactorRange: [0.92, 1.04],
    trailingWidthFactorRange: [0.88, 0.98],
    waistPositionRange: [0.28, 0.4],
    bellyPositionRange: [0.62, 0.78],
    insetRange: [10, 18],
  },
  {
    type: "bulwark",
    lengthWeightRange: [0.34, 0.42],
    waistWidthFactorRange: [0.94, 1.06],
    bellyWidthFactorRange: [1.08, 1.2],
    trailingWidthFactorRange: [1.02, 1.14],
    waistPositionRange: [0.32, 0.46],
    bellyPositionRange: [0.68, 0.86],
    insetRange: [6, 12],
  },
  {
    type: "modular",
    lengthWeightRange: [0.36, 0.48],
    waistWidthFactorRange: [0.86, 0.98],
    bellyWidthFactorRange: [1.0, 1.12],
    trailingWidthFactorRange: [0.94, 1.06],
    waistPositionRange: [0.3, 0.45],
    bellyPositionRange: [0.58, 0.8],
    insetRange: [8, 14],
  },
];

export const REAR_SEGMENT_VARIANTS = [
  {
    type: "tapered",
    lengthWeightRange: [0.26, 0.34],
    baseWidthFactorRange: [0.92, 1.04],
    exhaustWidthFactorRange: [0.64, 0.76],
    tailWidthFactorRange: [0.46, 0.58],
    exhaustPositionRange: [0.52, 0.7],
    curveRange: [16, 24],
  },
  {
    type: "thruster",
    lengthWeightRange: [0.24, 0.3],
    baseWidthFactorRange: [1.02, 1.16],
    exhaustWidthFactorRange: [0.72, 0.86],
    tailWidthFactorRange: [0.58, 0.72],
    exhaustPositionRange: [0.6, 0.82],
    curveRange: [20, 32],
  },
  {
    type: "block",
    lengthWeightRange: [0.28, 0.36],
    baseWidthFactorRange: [1.08, 1.22],
    exhaustWidthFactorRange: [0.78, 0.92],
    tailWidthFactorRange: [0.62, 0.78],
    exhaustPositionRange: [0.54, 0.74],
    curveRange: [18, 28],
  },
];
