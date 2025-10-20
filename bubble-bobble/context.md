# Bubble Bobble (WIP)

Purpose
- 80s arcade vibes with CRT effects; clone-inspired gameplay (bubbles capture enemies, pop for pickups, single-screen platforming).

Key files
- index.html: Canvas host + shared CRT overlays + shared HUD styles
- style.css: CRT tuning + layout
- main.js: Game bootstrap; CRT wiring; tilemap; player physics; enemies; bubble capture/escape; pickups and scoring
- assets/levels/level01.js: First level (JS module to avoid file:// CORS)
- docs/plan.md: Detailed phased build plan

Tech/Stack
- Reuse shared libs: ../shared/styles/crt.css, ../shared/styles/screen.css, ../shared/styles/hud.css
- Reuse shared UI: ../shared/ui/crtControls.js, ../shared/fx/crtPostprocess.js, ../shared/ui/crt.js, ../shared/config/display.js
- Static HTML/JS; canvas rendering with post-processed CRT.

Current status
- Level tiles rendered; player movement + jump with AABB collisions
- Enemies patrol and can be trapped in bubbles; bubble pops convert to pickups; enemy escapes if bubble times out
- Pickups fall and are collectible; score increments
- CRT panel and F1/F2 presets wired

Planned Systems (next)
- Rendering: replace placeholders with sprites; animated tiles; background/backplate
- Input: bubble ride; tap pop; refinement of movement curves
- Physics: semi-solids, better edge detection, vertical wrap (if desired)
- Actors: more enemy types; capture timers and behaviors; EXTEND letters
- Levels: expand set; round intro/intermission cards; currents in later rounds
- Audio: SFX/music via shared helpers

Known Risks
- CRT performance under heavy overdraw; sprite layering with bubbles; timing nuances for capture and pop; semi-solid/platform edge cases

Next
- Add simple sprite rendering pipeline (sprite sheets); first audio stubs; expand to a few rounds
