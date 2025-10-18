# Lode Runner Clone (Phaser + CRT)

Purpose:
- A browser-based Lode Runner-style platformer implemented in JavaScript + HTML using Phaser 3.
- Emphasis on retro CRT aesthetic and authentic mechanics (digging, ladders, ropes, guards, gold, level exit).

Key files:
- index.html: Entry page, includes Phaser via CDN and CRT overlay.
- styles/crt.css: CSS-based CRT scanlines, curvature, glow, vignette.
- src/main.js: Game bootstrap and Phaser configuration.
- src/scene/GameScene.js: Core game scene handling level, input, physics, digging, pickups, guards.
- levels/level1.txt: ASCII level definition mapping characters to tiles/entities.
- assets/: Placeholder for sprites or audio (initial prototype uses generated/simple shapes).

Tech decisions:
- Phaser 3 via CDN for robust tile/platform mechanics and future extensibility (tilemaps, shaders, pathfinding, pipelines).
- ASCII map loader for easy authoring/versioning without external Tiled dependency.
- No build step; static HTML works from file:// or a static server.

Known risks and open items:
- Enemy AI still basic; authentic path rules TBD.
- Ladder and rope behaviors improved but not yet a perfect match to classic LR.
- Exit opens after all gold; level progression cycles through 3 demo levels.
- Audio is minimal (procedural beeps).
- Programmer art is now upgraded to simple pixel-art with animations; can be swapped for real sprites later.

How to run:
- Start a local static server: `node serve.mjs`
- Open http://localhost:5173 in your browser

Maintenance:
- If this project evolves, update this context.md and add parent references if a higher-level context aggregates .openagent projects.

Mechanics updates:
- Enemy touch causes death (lose a life, restart level).
- Lives: 3; reaching 0 resets to level 1 with 3 lives.
- Ladder alignment while climbing for crisper control.

Graphics & Controls updates:
- Player now uses simple pixel-art animations (idle/run/climb/hang).
- Narrower physics body for smoother ledges.
- Ladder-top step-up implemented: press Up at the top to step onto platforms.


## Physics tuning (2025-10-18 12:25 UTC)
- World gravity: 900 -> 820 for slightly more airtime.
- Jump impulse: -300 -> -380 so the player can clear enemy heads reliably.
- Horizontal: accel 1500 -> 1800, max X velocity 260 -> 320 for better carry during jumps.
- Drag X: 1500 -> 900 to reduce midair slow-down.
- Standardized gravity calls to use this.physics.world.gravity.y instead of literals.

Risks/notes:
- Some gaps may become easier; adjust level design if needed.
- If enemies become trivial to avoid, consider modestly increasing enemy X speed or acceleration later.
- Future feel upgrades: coyote time (~100ms) and jump buffering (~100ms).


## Movement feel update (2025-10-18 12:30 UTC)
- Added coyote time (120ms) for forgiving ledge jumps.
- Added jump buffering (120ms) to capture early jump presses before landing.
- Added variable jump height (early Up release cuts upward speed to 45%).
- Ground/air drag split (ground 1400, air 450) for snappier control but better carry in air.
- Kept prior tuning: gravity 820, jump impulse -380, accel X 1800, max X 320.

Notes:
- If jumps feel too floaty now, raise air drag (e.g. 550) or gravity slightly.
- If midair control is too high, we can scale accel when !grounded (e.g. 70%).

## Movement + AI polish (2025-10-18 12:33 UTC)
- Air control scaling: horizontal accel reduced to 75% while airborne (not on ladder/rope).
- Ground/air drag split: ground 1400, air 450.
- Enemy hole stun: guards trapped ~2.2s when in a dug hole.

Tuning knobs:
- Air control factor: inAir accel multiplier (default 0.75).
- Drag: ground 1400, air 450.
- Hole stun duration: stuckUntil = now + 2200ms.

## Fixes after movement/AI updates (2025-10-18 12:33 UTC)
- Repaired horizontal acceleration block (air control 75% while airborne).
- Normalized ground/air drag split placement (single line before Digging).
- Fixed enemy hole-stun typos: 'hole' literal and 'sawtooth' waveform were unquoted.

## Pacing and cleanup (2025-10-18 12:35 UTC)
- Added dig cooldown (350ms) with visual/audio feedback unchanged; prevents dig spam.
- Fixed stray double-brace in update() and normalized ground/air drag comment placement.
- Prior improvements retained: higher jump, air control scaling, coyote time, jump buffer, variable jump height, enemy hole stun.

Tuning:
- digCooldownMs: 350ms (adjust for faster/slower cadence)

## Feedback polish (2025-10-18 12:37 UTC)
- Added grounded tracking and landing feedback: 320Hz square tone + 40ms camera shake on hard landings.
- Added jump SFX: 560Hz triangle tone when a jump actually triggers.
- Removed duplicate dig cooldown fields that had leaked into update().

## Parse error fix (2025-10-18 12:41 UTC)
- Closed update() properly before method declarations (e.g., async loadLevel), resolving "Unexpected identifier 'loadLevel'".
- Removed stray state line inside update(): this.wasGrounded = true; (now only set in create and updated each frame with wasGrounded = grounded).
- Ensured jump SFX waveform string is quoted ('triangle').
