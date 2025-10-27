# SpriteGenerator

SpriteGenerator is a playground for composing modular SVG sprites. The first module focuses on procedural spaceships that are assembled from themed parts and animated with subtle CRT inspired motion. The viewer shows a parent configuration and generates a grid of offspring variants that mutate individual parts without losing the ship's archetype.

## Running locally

Serve the folder with any static file server:

```bash
npx serve sprite-generator
```

Then open the reported `http://localhost` URL.

## How it works

- **Archetypes** – Each category (fighter, freight, transport, drone) exposes tuned ranges for body length, engine count, wing shapes, and optional fins. The generator stores both descriptive copy and the numeric ranges.
- **Palettes** – Distinct color palettes provide contrasting silhouettes. The palette can be rerolled independently of the structural seed.
- **Part generators** – Cockpit, body, wings, engines, and fins have dedicated helper functions that build SVG paths/polygons. They share a common coordinate space (200×200) so parts align cleanly.
- **Axis locking** – Every drawable samples the shared body axis in percentages: 0% always maps to the nose and 100% to the tail. Top-down projections interpret the percentage as height, side views read it as width, and the ship is normalised so those extremes sit on the square frame edges. Start/end percentages are carried with each feature (wings, canopy, markings, weapons, lights) and converted back to coordinates when rendering either projection so the two silhouettes stay perfectly aligned.
- **Mutation system** – Clicking any sprite promotes it to the parent slot. Children blend the parent with a fresh random roll using weighted interpolation, ensuring the result stays within the archetype's ranges. Integer traits (engine count, fin repetitions) are rounded and clamped.
- **Definition export** – The right-hand panel prints the JSON definition for the selected ship. Numbers are rounded for readability so the configuration can be reused in tools or unit tests.

## Extending

- Add more archetypes by defining ranges and feature probabilities in `CATEGORY_DEFINITIONS` inside `game.js`.
- To introduce a new part (for example, weapon pods), follow the existing pattern: extend the configuration, add a draw helper, and include it in `renderSpaceship`.
- Sprite families for other asset types (turrets, vehicles) can reuse the layout and mutation helpers. Only part-specific drawing logic needs to change.
- The `normaliseConfig` helper is designed to keep interpolated values sensible; update it if additional discrete traits are introduced.

## Using sprites in other games

`game.js` now exports a lightweight API that can be imported from other modules or accessed through the `window.SpriteGenerator` namespace when running in the browser. The helpers return fully rendered SVG elements and the configuration that produced them, which can be cached or re-rendered later.

```js
import { generateSpaceshipSprite } from "./sprite-generator/game.js";

const { svg, config } = generateSpaceshipSprite({
  category: "fighter",
  viewMode: "side",
  seed: 1337,
});

document.body.appendChild(svg);
```

You can also generate just the configuration via `createSpaceshipConfig` or inspect available categories and palettes with `listSpaceshipCategories()` and `listSpaceshipPalettes()`.
