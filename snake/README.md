Snake CRT

A retro Snake game with old-school arcade CRT vibes: scanlines, vignette, glow, fixed pixel grid, and satisfying bleeps. Static, offline-friendly bundle.

How to run
- Open index.html in your browser (double-click or use: open index.html on macOS).
- Controls: Arrows/WASD to move, Space to pause, R to restart.
- High score persists via localStorage.

Design choices
- Fixed internal resolution 320x240, scaled via CSS with image-rendering: pixelated for crisp pixels.
- CRT effect stack uses pure CSS (scanlines, vignette, flicker) with a bezel background.
- Fixed-step update loop (~12 tps) for consistent speed; requestAnimationFrame drives rendering.
- WebAudio bleeps to match the arcade feel.

Tweak ideas
- Swap to wrap-around walls.
- Add difficulty modes or variable growth.
- Add shader-based curvature if a WebGL pipeline is acceptable.

Files
- index.html: Bezel UI and overlays
- style.css: CRT look and feel
- script.js: Game logic and audio
- context.md: Purpose, key files, risks
