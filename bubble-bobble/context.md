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
- Debug: ensured overlay draws each frame by moving call into loop() before rAF.
- Fix: replaced stray idx reference with roundIndex to avoid ReferenceError.
- Fix: restored applyLevel(idx) and encapsulated level-init logic; prevents runtime ReferenceError.
- Chore: ignore *.tmp in bubble-bobble and removed stray main.js.tmp.

Resolution
- Internal canvas is now 640×480. Current world content draws in a 256×224 base inside this canvas.
- If we center and scale the playfield with an integer 2× (512×448), we’ll add offsets (64px L/R, 16px T/B) and keep pixels crisp.
- Backdrop/border code still renders against full canvas; scaling wrapper is optional and can be added on request.

HTML fix
- Removed stray broken canvas text so only a single valid <canvas id="game"> remains.

Sprites
- drawSprite(ctx, name, x, y, w, h, flipX) now supports horizontal flip.
- Player/enemies flip left when vx<0; right when vx>0; idle keeps last facing.

Changes
- Player and enemies set to 48×48 px; rebuilt spawnEnemy/spawnJumper.
- Syntax checks pass (main.js, sprites.js).
- Level redesign pending your choice: auto-clearance or curated.

Sprite+Map update (32×32)
- Player/enemies set to 32×32; enemy spawns use 32×32.
- wrapEntity now uses world width (COLS*TS).
- Levels 1–4 enlarged to 20×16 tiles (+4 cols, +2 rows).
- Spawns shifted by (+2,+2).
- Clearance ensured: ≥2 tiles above platforms.
- Syntax checks pass (main.js, sprites.js, levels).

Map scaling update (2×)
- All levels scaled by 2× in width and height (nearest-neighbor on tiles).
- Spawns scaled by 2× (playerSpawn, enemySpawns).
- Sprites remain 32×32; wrap uses world width (COLS*TS).
- Syntax checks pass for all levels.

Fixes (2025-10-21)
- Sprite flip: Added player.facing with default 1 and update each frame from vx/dir; draw uses facing<0 for flip.
- Bubble riding: Widened mount window proportional to bubble radius, allowed slight upward approach, zeroed/synced vertical position while riding.
- Fix: cleaned Riding tap-pop block after resolution edits (merged duplicate else, keep player synced to bubble, Down/Space pops).
- Bubble riding tuning (2025-10-21):
  - Mount requires centered horizontally (HORIZ_MARGIN = max(6, floor(r*0.6))) and reduced vertical window (MOUNT_MARGIN = max(4, floor(r*0.5))).
  - While riding, player is carried by bubble (x += b.vx*dt) and will auto-dismount if moving off top (|center delta| > max(8, r-2)).
  - Adjustments: increase HORIZ_MARGIN/MOUNT_MARGIN for easier mounts; lower rideMargin for quicker dismount.
- Visual tuning (2025-10-21):
  - Bubbles enlarged via spawnBubbleFromPlayer (r ≈ TS*1.35) and consistent spawn offset uses r.
  - Carried enemies inside bubbles render semi-transparent (alpha 0.6).
