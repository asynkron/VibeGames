const BASE_BODY_STYLES = [
  {
    key: "skinny",
    frontTypes: ["needle", "canopy"],
    midTypes: ["slim", "modular"],
    rearTypes: ["tapered"],
    widthScaleRange: [0.78, 0.9],
  },
  {
    key: "normal",
    frontTypes: ["needle", "canopy", "ram"],
    midTypes: ["slim", "modular"],
    rearTypes: ["tapered", "thruster"],
    widthScaleRange: [0.95, 1.05],
  },
  {
    key: "bulky",
    frontTypes: ["canopy", "ram"],
    midTypes: ["modular", "bulwark"],
    rearTypes: ["thruster", "block"],
    widthScaleRange: [1.12, 1.28],
  },
];

const BASE_FRONT_SEGMENTS = [
  {
    type: "needle",
    lengthWeightRange: [0.32, 0.42],
    tipWidthFactorRange: [0.1, 0.2],
    shoulderWidthFactorRange: [1.04, 1.18],
    transitionFactorRange: [0.72, 0.88],
    curveRange: [24, 36],
  },
  {
    type: "canopy",
    lengthWeightRange: [0.3, 0.4],
    tipWidthFactorRange: [0.34, 0.52],
    shoulderWidthFactorRange: [1.06, 1.2],
    transitionFactorRange: [0.88, 1.08],
    curveRange: [14, 24],
  },
  {
    type: "ram",
    lengthWeightRange: [0.28, 0.36],
    tipWidthFactorRange: [0.22, 0.34],
    shoulderWidthFactorRange: [0.98, 1.12],
    transitionFactorRange: [0.82, 0.98],
    curveRange: [18, 28],
  },
];

const BASE_MID_SEGMENTS = [
  {
    type: "slim",
    lengthWeightRange: [0.34, 0.44],
    waistWidthFactorRange: [0.72, 0.88],
    bellyWidthFactorRange: [0.86, 1.02],
    trailingWidthFactorRange: [0.84, 0.96],
    waistPositionRange: [0.32, 0.42],
    bellyPositionRange: [0.62, 0.8],
    insetRange: [14, 24],
  },
  {
    type: "modular",
    lengthWeightRange: [0.32, 0.42],
    waistWidthFactorRange: [0.86, 1],
    bellyWidthFactorRange: [0.96, 1.12],
    trailingWidthFactorRange: [0.92, 1.08],
    waistPositionRange: [0.32, 0.44],
    bellyPositionRange: [0.66, 0.82],
    insetRange: [10, 18],
  },
  {
    type: "bulwark",
    lengthWeightRange: [0.32, 0.4],
    waistWidthFactorRange: [1.08, 1.26],
    bellyWidthFactorRange: [1.16, 1.34],
    trailingWidthFactorRange: [1.08, 1.24],
    waistPositionRange: [0.38, 0.5],
    bellyPositionRange: [0.72, 0.88],
    insetRange: [6, 14],
  },
];

const BASE_REAR_SEGMENTS = [
  {
    type: "tapered",
    lengthWeightRange: [0.32, 0.42],
    baseWidthFactorRange: [0.92, 1.08],
    exhaustWidthFactorRange: [0.62, 0.78],
    tailWidthFactorRange: [0.46, 0.62],
    exhaustPositionRange: [0.58, 0.72],
    curveRange: [16, 24],
  },
  {
    type: "thruster",
    lengthWeightRange: [0.34, 0.46],
    baseWidthFactorRange: [1.08, 1.34],
    exhaustWidthFactorRange: [0.82, 1.02],
    tailWidthFactorRange: [0.6, 0.76],
    exhaustPositionRange: [0.62, 0.8],
    curveRange: [18, 28],
  },
  {
    type: "block",
    lengthWeightRange: [0.34, 0.48],
    baseWidthFactorRange: [1.1, 1.36],
    exhaustWidthFactorRange: [0.9, 1.1],
    tailWidthFactorRange: [0.7, 0.88],
    exhaustPositionRange: [0.6, 0.78],
    curveRange: [12, 22],
  },
];

const BASE_STYLE_ADJUSTMENTS = {
  front: {
    normal: {},
    skinny: {
      tipWidthFactor: [0.88, 0.96],
      shoulderWidthFactor: [0.92, 0.98],
      transitionFactor: [1.04, 1.12],
      curve: [1.05, 1.18],
    },
    bulky: {
      tipWidthFactor: [1.06, 1.14],
      shoulderWidthFactor: [1.04, 1.12],
      transitionFactor: [0.92, 1],
      curve: [0.88, 1],
    },
  },
  mid: {
    normal: {},
    skinny: {
      waistWidthFactor: [0.9, 0.98],
      bellyWidthFactor: [0.9, 0.98],
      inset: [1.05, 1.18],
    },
    bulky: {
      waistWidthFactor: [1.06, 1.16],
      bellyWidthFactor: [1.08, 1.2],
      trailingWidthFactor: [1.02, 1.12],
      inset: [0.82, 0.94],
    },
  },
  rear: {
    normal: {},
    skinny: {
      baseWidthFactor: [0.92, 1],
      exhaustWidthFactor: [0.92, 1.02],
      tailWidthFactor: [0.92, 1.04],
      curve: [1.04, 1.16],
    },
    bulky: {
      baseWidthFactor: [1.08, 1.18],
      exhaustWidthFactor: [1.02, 1.12],
      tailWidthFactor: [1.02, 1.16],
      curve: [0.88, 0.98],
    },
  },
};

function cloneGeometry(data) {
  return JSON.parse(JSON.stringify(data));
}

function mergeStyleAdjustments(base, overrides = {}) {
  const result = cloneGeometry(base);
  Object.entries(overrides).forEach(([section, adjustments]) => {
    result[section] = {
      ...(result[section] ?? {}),
      ...adjustments,
    };
  });
  return result;
}

export function createStandardGeometry(overrides = {}) {
  const geometry = {
    bodyStyles: cloneGeometry(BASE_BODY_STYLES),
    segments: {
      front: cloneGeometry(BASE_FRONT_SEGMENTS),
      mid: cloneGeometry(BASE_MID_SEGMENTS),
      rear: cloneGeometry(BASE_REAR_SEGMENTS),
    },
    styleAdjustments: cloneGeometry(BASE_STYLE_ADJUSTMENTS),
  };

  if (overrides.bodyStyles) {
    geometry.bodyStyles = cloneGeometry(overrides.bodyStyles);
  }
  if (overrides.segments) {
    geometry.segments = {
      ...geometry.segments,
      ...Object.fromEntries(
        Object.entries(overrides.segments).map(([key, value]) => [key, cloneGeometry(value)]),
      ),
    };
  }
  if (overrides.styleAdjustments) {
    geometry.styleAdjustments = mergeStyleAdjustments(
      geometry.styleAdjustments,
      overrides.styleAdjustments,
    );
  }

  return geometry;
}

