# SpriteGenerator

SpriteGenerator is a procedural sprite viewer that assembles modular SVG spacecraft. Each ship is broken down into reusable "parts" like the body, cockpit, thrusters, wings, and optional stabilizers. The game renders a highlighted hero craft and a grid of mutations that inherit from the current selection. Clicking any sprite promotes it to the hero slot and seeds the next batch of variations. A shooter orientation toggle lets you flip every design between vertical (top-down) and horizontal (side-scrolling) compositions so you can visualise sprites for different arcade perspectives.

## How it works

* **Categories:** Ships are grouped into archetypes (fighter, freight, transport, drone). Every archetype provides ranges and behaviours for generating body proportions, thruster layouts, canopy shapes, and wing silhouettes. These constraints are intentionally stylised after classic shooters like *R-Type* or *Katakis* to keep the silhouettes readable.
* **Parts:** The generator builds individual definitions for the hull, cockpit, engines, wings, stabilizers, and optional front fins. Each part can be tweaked independently, which keeps the resulting SVGs modular. Panel lines, stripes, and lighting accents are layered afterwards.
* **Palettes:** Palettes are sampled from a curated list per archetype. Mutations selectively inherit colours from their parent so successive generations keep a coherent mood while still drifting.
* **Mutation model:** When a new grid is produced the parent definition is mixed with a freshly rolled baseline using a soft mutation rate. Numeric attributes jitter slightly, while categorical properties (wing variant, thruster mount, decal type, etc.) occasionally flip. The definition panel on the left shows the exact data used to draw the hero ship.

## Controls

* **Orientation toggle** – Switch between vertical shoot-'em-up and horizontal side-shooter layouts. Toggling resets the lineage with fresh rolls in the chosen orientation.
* **Reroll Highlight** – Mutate the currently selected hero sprite.
* **Reseed Grid** – Generate a new grid of children derived from the hero definition.
* **Fresh Lineage** – Start a brand-new random ship and regenerate the grid from scratch.
* **Click any sprite card** – Promote the clicked definition to the hero slot and immediately spawn a new generation of children.

## Definition schema

Definitions are plain JSON objects with the following high-level structure:

```json
{
  "category": "fighter",
  "orientation": "vertical",
  "palette": { "hull": "#0f172a", "trim": "#38efbd", ... },
  "body": { "length": 120, "width": 36, "noseTaper": 0.4, ... },
  "cockpit": { "length": 28, "segment": "split", ... },
  "engines": { "count": 2, "flameLength": 30, ... },
  "wings": { "layers": [ { "variant": "delta", ... } ], "frontFins": { ... } },
  "stabilizers": { "count": 2, "style": "fork", ... },
  "extras": { "stripes": "wing", "lighting": "engine", ... }
}
```

Every field feeds directly into the SVG assembler, so adjusting numeric ranges or adding new fields in `script.js` immediately changes the rendered ships. This makes it easy to introduce new archetypes (e.g. turrets or vehicles) using the same part pipeline.

## Extending the generator

* Add a new archetype to `ARCHETYPES` with bespoke ranges for hull length/width, wing sweep, and thruster count.
* Provide a palette bias by pushing additional entries inside `pickPalette` when the new archetype is selected.
* Update `buildShip` to consume any new part data (for example: weapon hardpoints or animated cargo pods).
* Reuse the mutation helpers (`deepMix`, `mixPalette`) to keep new parts compatible with the breeding mechanic.
