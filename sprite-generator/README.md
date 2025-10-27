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
- **Mutation system** – Clicking any sprite promotes it to the parent slot. Children blend the parent with a fresh random roll using weighted interpolation, ensuring the result stays within the archetype's ranges. Integer traits (engine count, fin repetitions) are rounded and clamped.
- **Definition export** – The right-hand panel prints the JSON definition for the selected ship. Numbers are rounded for readability so the configuration can be reused in tools or unit tests.

## Extending

- Add more archetypes by defining ranges and feature probabilities in `CATEGORY_DEFINITIONS` inside `game.js`.
- To introduce a new part (for example, weapon pods), follow the existing pattern: extend the configuration, add a draw helper, and include it in `renderSpaceship`.
- Sprite families for other asset types (turrets, vehicles) can reuse the layout and mutation helpers. Only part-specific drawing logic needs to change.
- The `normaliseConfig` helper is designed to keep interpolated values sensible; update it if additional discrete traits are introduced.
