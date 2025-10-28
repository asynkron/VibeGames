# Sprite Generator Refactor Plan

## Issue: Unify spaceship configuration schema across views *(completed)*

:::task-stub{title="Unify spaceship configuration schema across views"}
1. Refactor `createBaseConfig` in `sprite-generator/generator.js` to return a single, view-agnostic spaceship schema (e.g., keep the existing top-down structure as the canonical definition). Remove the conditional that builds separate `createTopDownConfig` vs. `createSideViewConfig`; instead, generate any additional metadata needed for the side projection alongside the shared body/wing/engine fields.
2. Rework the side-view helpers (`drawSideViewSpaceship` and the functions it calls) to derive their geometry from the unified schema rather than from `sideProfile`/`wingProfile`/etc. You may create helper functions that translate the shared definition into side-profile polygons on the fly, but keep those derivations local to the renderer so the stored definition stays the same.
3. Consolidate normalization and mutation paths in `normaliseConfig`, ensuring the single schema clamps values appropriately for both renderers. Any derived side-view data should be recomputed from the canonical fields instead of normalized separately.
4. Update UI logic (detail view, grid render) so a spaceship definition can be displayed in both projections simultaneously—e.g., render two SVGs per ship or add a toggle—without duplicating or mutating the stored config.
:::

## Testing
- ⚠️ No tests were run (not requested).
