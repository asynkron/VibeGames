# Bubble Bobble — Build Plan

Goals
- Faithful feel: single-screen platforming, blow bubbles, trap/popup enemies, fruit chains, EXTEND letters, water/air currents in later rounds.
- 80s arcade CRT vibe: scanlines, vignette, glow, subtle warp; adjustable via shared controls.

Stack
- No-build static HTML/JS/CSS.
- Shared libs reused: ../shared/ui/crtControls.js, ../shared/fx/crtPostprocess.js, ../shared/ui/crt.js, ../shared/config/display.js

Project layout
- index.html — canvas + CRT overlays
- style.css — CRT tuning + layout
- main.js — game bootstrap and loop
- assets/sprites — PNG sprite sheets (players, enemies, bubbles, pickups)
- assets/levels — JSON tilemaps (platform layout, spawn points, currents)

Phases
1) Scaffold + CRT wiring (done)
2) Core renderer
   - Tilemap renderer (8x8 or 16x16 tiles), parallax backplate optional
   - Sprite system (frame animation, flip, palette tint)
   - HUD: score, high score, lives, round, credits
3) Player + input
   - Movement (walk, slip on edges), one-button bubble breath (cooldown)
   - Collisions: AABB vs tiles; semi-solid platforms; drop-through via down+press
4) Bubbles
   - Spawn with inertia; float upward; stick under platforms; lifetime then pop
   - Trap enemies on hit; pop to convert to pickups; chain pops
5) Enemies
   - Basic patrol and chase behaviors; escape from bubbles after timer
   - Variants: different speeds and aggression
6) Pickups + scoring
   - Fruit gems spawning from popped enemies; chain/combos; end-of-round EXTEND letters
7) Rounds + progression
   - Level JSON: platform layout, spawn points, currents, timing
   - Round intro card; intermissions after milestones
8) Audio
   - SFX (bubble, pop, pickup, enemy burst); short music loops; respect browser autoplay
9) CRT polish + performance
   - Presets via shared panel; barrel warp and scanline strength tuning
   - Ensure 60 FPS on modern browsers; reduce overdraw; coalesce draw calls

Risks / mitigations
- Collision tuning for semi-solid platforms: use conservative penetration resolution
- Overdraw with glow/warp: keep post-process resolution at canvas res; avoid extra layers
- Input latency: fixed timestep update; queue inputs per frame

Milestone criteria
- MVP: 10 rounds, 2 enemy types, bubble capture/pop loop, fruit scoring, lives, simple intermission
- 1.0: full pickup set, multiple enemy types, EXTEND, currents, more rounds
