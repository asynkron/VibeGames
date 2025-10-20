# Bubble Bobble Tribute – Build Plan

Goals
- Single-screen platformer with classic 80s arcade vibes and CRT effects.
- Core loop: blow bubbles → capture enemies → pop for points/pickups → clear round.
- Tight 60 FPS on modern browsers; inputs feel snappy.

Stack reuse
- Styles: ../shared/styles/crt.css, ../shared/styles/screen.css, ../shared/styles/hud.css
- CRT UI/FX: ../shared/ui/crtControls.js, ../shared/ui/crt.js, ../shared/fx/crtPostprocess.js, ../shared/config/display.js

Milestones
1) Foundation (DONE)
   - Project scaffold, index/style, CRT panel+postprocess, level01 tilemap, movement+jump, bubbles.
2) Enemies + Capture (DONE)
   - Patrol on platforms, capture enemies in bubbles, pop to spawn pickups, scoring.
3) Rendering & Art Pipeline
   - Sprite sheets (player, enemies, bubbles, pickups); draw order rules; simple animations.
   - Palette and CRT-tuned colors; background/backplate.
4) Game Feel & Mechanics
   - Bubble ride and tap pop; refined jump curve; semi-solids; better edge/wrap logic.
   - Enemy variants: timing for escape; simple AI patterns; EXTEND letters as a later addition.
5) Audio
   - SFX (jump, bubble, pop, pickup, enemy escape) and background loop; volume/preset controls.
6) Rounds & UI
   - Level set (5–10 rounds initially); round intro/intermission cards; score/lives UI.
   - Basic game over, continue, and attract mode loop.
7) Two-Player
   - Add 2P controls/state; on-screen indicators; shared scoring rules.
8) Polish & Performance
   - CRT tuning presets; sprite batching/dirty rects if needed; collision edge cases; QA pass.

Acceptance criteria (Phase 3–5)
- Smooth 60 FPS on a typical laptop; no major frame drops.
- Player: responsive movement, bubble ride works, pop timing intuitive.
- At least 2 enemy types, capture+escape timings feel fair.
- 5+ rounds, with working round progression and basic cards.
- Basic SFX/music toggles; no audio glitches.

Risks & mitigations
- Overdraw with CRT and sprites → minimize full-canvas effects; use simple postprocess; consider dirty regions.
- Collision edge cases on semi-solids → add tests for tile boundaries; clamp positions post-resolve.
- Input latency → avoid heavy GC; limit allocations per frame.
- Legal/IP → keep title as “Bubble Bobble Tribute”; original assets not used.

Next steps (immediate)
- Implement Phase 3: sprite sheet pipeline and replace placeholders.
- Add simple sound manager and SFX stubs.
- Prepare 3–5 additional levels and a minimal round progression.
