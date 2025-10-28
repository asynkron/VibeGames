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
