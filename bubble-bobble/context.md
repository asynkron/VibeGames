# Bubble Bobble (WIP)

Purpose
- 80s arcade vibes with CRT effects; tribute gameplay: blow bubbles, capture enemies, pop for pickups; single-screen platforming with CRT post-process.

Key files
- index.html: Canvas host + shared CRT overlays + HUD styles
- style.css: CRT tuning + layout
- main.js: Game bootstrap; CRT wiring; tilemap; player physics; enemies; bubble capture/escape; pickups and scoring; sprite rendering; SFX; music; multi-round progression with intro/clear cards; bubble ride + tap-pop; background stripes; lives+damage; game over + restart; hi-score; pause mutes music
- sprites.js: Sprite loader and draw helpers (SVG placeholders)
- audio.js: WebAudio SFX + looping music with mute/volume and pause-aware gain
- assets/levels/index.js: LEVELS array for round progression
- assets/levels/level01.js: Round 1 layout and spawns
- assets/levels/level02.js: Round 2 layout and spawns
- assets/levels/level03.js: Round 3 layout and spawns
- assets/sprites/*.svg: Placeholder sprites
- assets/music.mp3: Classic loop alias to provided track (symlink to Main Theme.mp3)
- docs/plan.md: Phased build plan

Tech/Stack
- Shared: ../shared/styles/crt.css, ../shared/styles/screen.css, ../shared/styles/hud.css; ../shared/ui/crtControls.js, ../shared/fx/crtPostprocess.js, ../shared/ui/crt.js, ../shared/config/display.js
- Static HTML/JS canvas; WebAudio for SFX/music

Current status
- Movement/jump; bubbles; enemy patrols; capture in bubbles; pop to spawn pickups; scoring
- Sprites (SVG placeholders) + CRT post-process; SFX (jump/bubble/pop/pickup/capture)
- Music: looping MP3 (M mute/unmute), paused when game is paused or at game over
- Rounds: 3-level progression with intro and clear overlays
- Bubble ride + tap-pop (Down or Space while riding), subtle animated background, lightweight bobbing animations
- Lives with player damage on contact; game over screen with Enter to restart; hi-score persisted in localStorage

Next (suggested)
- Replace SVG placeholders with pixel-art sprites and simple frame-based animations
- Semi-solids, edge/wrap refinements; more enemy types; EXTEND letters
- Round cards polish; attract mode; score/lives UI art; mix controls

Recent fixes
- Enemy spawns align to top of nearest platform (solid/semi-solid) and search downward from the spawn tile to avoid spawning inside tiles.
- Tuning: bubbles now spawn slower, float gently (~-10 px/s), and have a slightly wider ride snap window to make riding reliable.
- Animations: simple 2-frame walk/bob for player and enemies; directional flip
- EXTEND letters: drop on pop, HUD progress, 1UP + 10,000 on completion
- Enemy: added 'jumper' type that pursues and hops

- Fix: cleaned spawnEnemy block, properly added spawnJumper, corrected spawnPickup syntax
- Added: simple 2-frame animations, jumper AI, spawn dispatcher
- Fix: repaired applyLevel closure and rebuilt enemy spawn dispatch
- Fix: repaired Player vs bubble collision block and riding tap-pop for EXTEND drops and proper braces
- Visuals: added C64-style pastel 8x8 backdrop with offscreen rendering and fake 3D tile shadows (solid: right/bottom, semi-solid: slim top). No gameplay changes.
- Visuals: render order adjusted so backdrop blits after black clear, ensuring visibility.
- Visuals: added palette cycling (B), tuned tile shadows (stronger solids, softer semi-solids), and C64-style border.
- Migration (Stage 1): expanded map to 8×8 at load (2×2 per 16px), TS=8, tile spawns scaled; toggle 16↔8 with T.
- Migration: fixed TS=8 stage (clean applyLevel order, spawn headers, scaling centralized in dispatchSpawn).
- Controls: added T toggle to switch 16↔8 and re-apply current level (no gameplay changes).
- Debug: overlay (O) shows TS/COLS/ROWS/mode/round/player pos/vel and counts; HUD shows T (tiles) and O (overlay).
