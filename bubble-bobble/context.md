# Bubble Bobble (WIP)

Purpose
- 80s arcade vibes with CRT effects; clone-inspired gameplay (bubbles capture enemies, pop for pickups, single-screen platforming).

Key files
- index.html: Canvas host + shared CRT overlays + shared HUD styles
- style.css: CRT tuning + layout
- main.js: Game bootstrap; CRT wiring; tilemap; player physics; enemies; bubble capture/escape; pickups and scoring; sprite rendering; SFX triggers
- sprites.js: Sprite loader and draw helpers (SVG placeholders)
- audio.js: WebAudio SFX (bleeps) for jump, bubble, pop, pickup, capture
- assets/levels/level01.js: First level (JS module to avoid file:// CORS)
- assets/sprites/*.svg: Placeholder art (player, enemy, bubble, pickup)
- docs/plan.md: Phased build plan

Tech/Stack
- Reuse shared libs: ../shared/styles/crt.css, ../shared/styles/screen.css, ../shared/styles/hud.css
- Reuse shared UI: ../shared/ui/crtControls.js, ../shared/fx/crtPostprocess.js, ../shared/ui/crt.js, ../shared/config/display.js
- Static HTML/JS; canvas rendering with post-processed CRT; WebAudio for SFX

Current status
- Level tiles rendered; player movement + jump with AABB collisions
- Enemies patrol, can be trapped in bubbles; popping drops pickups; enemies escape on timeout
- Pickups fall and are collectible; score increments
- Sprites: SVG placeholders for player/enemy/bubble/pickup with draw pipeline
- Audio: basic SFX (jump, bubble, pop, pickup, capture) with WebAudio
- CRT panel and F1/F2 presets wired

Planned Systems (next)
- Rendering: replace placeholders with pixel-art sprites; simple animations; background/backplate
- Input: bubble ride; tap pop; refinement of movement curves
- Physics: semi-solids, better edge detection, vertical wrap (if desired)
- Actors: more enemy types; capture timers and behaviors; EXTEND letters
- Levels: expand set; round intro/intermission cards; currents in later rounds
- Audio: Mix controls; music loop with mute toggle

Known Risks
- CRT performance under heavy overdraw; sprite layering with bubbles; timing nuances for capture and pop; semi-solid/platform edge cases

Next
- Animate sprites (2–3 frames); add background; add simple round progression and minimal UI screens
