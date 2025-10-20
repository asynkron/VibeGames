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
