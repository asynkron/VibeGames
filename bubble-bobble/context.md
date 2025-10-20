# Bubble Bobble (WIP)

Purpose
- 80s arcade vibes with CRT effects; clone-inspired gameplay (bubbles capture enemies, pop for pickups, single-screen platforming).

Key files
- index.html: Canvas host + shared CRT overlays + shared HUD styles
- style.css: CRT tuning + layout
- main.js: Game bootstrap, CRT wiring, tilemap/physics/bubbles shell
- assets/levels/level01.js: First level (JS module to avoid file:// CORS)
- docs/plan.md: Detailed phased build plan

Tech/Stack
- Reuse shared libs: ../shared/styles/crt.css, ../shared/styles/screen.css, ../shared/styles/hud.css
- Reuse shared UI: ../shared/ui/crtControls.js, ../shared/fx/crtPostprocess.js, ../shared/ui/crt.js, ../shared/config/display.js
- Static HTML/JS; canvas rendering with post-processed CRT.

Current status
- MVP shell: level tiles rendered; basic player movement + jump with AABB collisions; bubbles float and stick under platforms; CRT panel and F1/F2 presets wired.

Planned Systems (next)
- Rendering: sprite art for Bub/Bob and enemies; animated tiles; backplate
- Input: refine feel and add ride-bubble rules
- Physics: semi-solids, bubble ride/tap pop, enemy capture & escape
- Actors: enemies with simple patrol and capture timers; pickups
- Levels: expand level set; add round intro/intermission cards
- Audio: add SFX/music via shared audio helpers

Known Risks
- CRT effect performance; sprite layering with bubbles; bubble timing; semi-solid collisions

Next
- Implement Phase 2–3 from docs/plan.md (renderer + player refinements), then bubble capture loop and a first enemy.
