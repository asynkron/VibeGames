# SpriteGenerator

SpriteGenerator is a procedural sprite viewer that assembles SVG spaceships from modular parts. Each sprite is generated from a configuration that captures the hull profile, wings, fins, engines, cockpit, and accent stripes. Selecting a sprite promotes its configuration to the next generation, encouraging small mutations around the chosen "parent" design.

## Features

- **Ship archetypes** – Fighter, Freight, Transport, and Drone profiles define hull proportions, wing plans, engine layouts, and color palettes inspired by classic shooters.
- **SVG part assembly** – Each spaceship is composed from reusable SVG layers (wings, engines, fins, hull, cockpit, stripes) so shapes can be animated or re-styled.
- **Breeding workflow** – Click any sprite in the grid to seed the next batch of variants. The selected definition is shown as JSON so it can be copied into tooling or saved.
- **CRT presentation** – The viewer adopts the shared CRT frame styles used across the collection for a consistent cabinet feel.

## Extending

New ship categories can be added by extending the `SHIP_TYPES` map in `script.js`. Each category defines the ranges used to randomize:

- color palettes (`palette`)
- hull profiles (`hull`)
- wing assemblies (`wings`)
- dorsal/ventral fins (`fins`)
- cockpit placement and style (`cockpit`)
- engine counts and flame lengths (`engines`)
- accent stripe frequency (`stripes`)

Parts reference the shared `VIEWBOX` (160×160) so additional generators can be composed by reusing the helper functions for blending hull segments, sampling widths, or drawing mirrored shapes.
