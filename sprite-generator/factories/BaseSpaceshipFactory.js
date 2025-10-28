/**
 * Base factory shared by every vehicle type. The class only stores the
 * definition for the subtype while the heavy lifting (mutation, rendering,
 * geometry normalisation) is provided through helper callbacks. Concrete
 * factories extend this class and supply their unique configuration payloads.
 */
export class BaseSpaceshipFactory {
  constructor(key) {
    this.key = key;
    this.definition = this.buildDefinition();
    this.partLibrary = this.buildPartLibrary();
    this.helpers = null;
  }

  /**
   * Subclasses must return the configuration blob that used to live in
   * CATEGORY_DEFINITIONS. Keeping the payload on the type itself means every
   * vehicle variant is self-contained.
   */
  buildDefinition() {
    throw new Error("Factory subclasses must implement buildDefinition()");
  }

  getDefinition() {
    return this.definition;
  }

  attachHelpers(helpers) {
    this.helpers = helpers;
  }

  getPartLibrary() {
    return this.partLibrary;
  }

  buildPartLibrary() {
    return DEFAULT_PART_LIBRARY;
  }

  generateModelData(options = {}) {
    this.#assertHelpers();
    return this.helpers.generateModelData(this, options);
  }

  generateGeometry(config) {
    this.#assertHelpers();
    return this.helpers.generateGeometry(this, config);
  }

  renderTopView(root, config, geometry, defs) {
    this.#assertHelpers();
    return this.helpers.renderTopView(this, root, config, geometry, defs);
  }

  renderSideView(root, config, geometry) {
    this.#assertHelpers();
    return this.helpers.renderSideView(this, root, config, geometry);
  }

  #assertHelpers() {
    if (!this.helpers) {
      throw new Error(`Factory ${this.key} has no helpers attached.`);
    }
  }
}

export const DEFAULT_PART_LIBRARY = {
  bodyStyles: [
    {
      key: "skinny",
      frontTypes: ["needle"],
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
  ],
  frontSegments: [
    {
      type: "needle",
      lengthWeightRange: [0.3, 0.42],
      tipWidthFactorRange: [0.05, 0.1],
      shoulderWidthFactorRange: [0.9, 1.08],
      transitionFactorRange: [0.66, 0.84],
      curveRange: [28, 40],
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
  ],
  midSegments: [
    {
      type: "slim",
      lengthWeightRange: [0.38, 0.46],
      waistWidthFactorRange: [0.7, 0.82],
      bellyWidthFactorRange: [0.84, 0.96],
      trailingWidthFactorRange: [0.8, 0.92],
      waistPositionRange: [0.28, 0.4],
      bellyPositionRange: [0.62, 0.78],
      insetRange: [12, 20],
    },
    {
      type: "bulwark",
      lengthWeightRange: [0.34, 0.42],
      waistWidthFactorRange: [1.06, 1.2],
      bellyWidthFactorRange: [1.22, 1.36],
      trailingWidthFactorRange: [1.14, 1.28],
      waistPositionRange: [0.32, 0.46],
      bellyPositionRange: [0.68, 0.86],
      insetRange: [6, 12],
    },
    {
      type: "modular",
      lengthWeightRange: [0.36, 0.48],
      waistWidthFactorRange: [0.82, 0.96],
      bellyWidthFactorRange: [1.0, 1.16],
      trailingWidthFactorRange: [0.92, 1.08],
      waistPositionRange: [0.3, 0.45],
      bellyPositionRange: [0.58, 0.8],
      insetRange: [8, 16],
    },
  ],
  rearSegments: [
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
      baseWidthFactorRange: [1.16, 1.3],
      exhaustWidthFactorRange: [0.86, 1.02],
      tailWidthFactorRange: [0.6, 0.74],
      exhaustPositionRange: [0.62, 0.84],
      curveRange: [18, 30],
    },
    {
      type: "block",
      lengthWeightRange: [0.28, 0.36],
      baseWidthFactorRange: [1.2, 1.34],
      exhaustWidthFactorRange: [0.84, 0.98],
      tailWidthFactorRange: [0.7, 0.86],
      exhaustPositionRange: [0.54, 0.74],
      curveRange: [12, 22],
    },
  ],
  frontStyleAdjustments: {
    normal: {
      weight: [0.96, 1.08],
      tipWidthFactor: [0.9, 1.08],
      shoulderWidthFactor: [0.94, 1.08],
      curve: [0.94, 1.08],
    },
    skinny: {
      weight: [1.08, 1.22],
      tipWidthFactor: [0.72, 0.85],
      shoulderWidthFactor: [0.88, 0.96],
      transitionFactor: [0.9, 1.05],
      curve: [1.08, 1.22],
    },
    bulky: {
      weight: [0.92, 1.05],
      tipWidthFactor: [1.18, 1.32],
      shoulderWidthFactor: [1.08, 1.2],
      transitionFactor: [1.02, 1.18],
      curve: [0.86, 0.98],
    },
  },
  midStyleAdjustments: {
    normal: {
      weight: [0.98, 1.12],
      waistWidthFactor: [0.94, 1.08],
      bellyWidthFactor: [0.96, 1.12],
      trailingWidthFactor: [0.94, 1.08],
      inset: [0.96, 1.08],
    },
    skinny: {
      weight: [0.92, 1.05],
      waistWidthFactor: [0.78, 0.9],
      bellyWidthFactor: [0.82, 0.92],
      trailingWidthFactor: [0.82, 0.94],
      inset: [1.12, 1.28],
      waistPosition: [0.9, 1.05],
      bellyPosition: [0.95, 1.08],
    },
    bulky: {
      weight: [1.08, 1.2],
      waistWidthFactor: [1.08, 1.2],
      bellyWidthFactor: [1.18, 1.32],
      trailingWidthFactor: [1.12, 1.26],
      inset: [0.72, 0.92],
      waistPosition: [0.95, 1.1],
      bellyPosition: [1.0, 1.12],
    },
  },
  rearStyleAdjustments: {
    normal: {
      weight: [0.96, 1.1],
      baseWidthFactor: [0.96, 1.08],
      exhaustWidthFactor: [0.92, 1.05],
      tailWidthFactor: [0.96, 1.08],
    },
    skinny: {
      weight: [0.92, 1.05],
      baseWidthFactor: [0.82, 0.94],
      exhaustWidthFactor: [0.78, 0.9],
      tailWidthFactor: [0.78, 0.92],
      curve: [1.0, 1.14],
    },
    bulky: {
      weight: [1.08, 1.22],
      baseWidthFactor: [1.16, 1.3],
      exhaustWidthFactor: [1.05, 1.2],
      tailWidthFactor: [1.08, 1.24],
      curve: [0.9, 1.05],
    },
  },
  canopyFrames: ["single", "split", "triple", "panoramic"],
};
