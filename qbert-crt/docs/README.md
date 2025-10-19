Q*bert CRT (HTML/JS)
====================

An old-school, CRT-styled Q*bert in pure HTML/CSS/JS. Lives under `.openagent/tmp/qbert-crt`.

Run
- Open `index.html` in a modern browser, or serve statically: `npx http-server .`

Controls
- Arrow keys / WASD / IJKL for diagonals:
  - Up = Up-Left, Right = Up-Right, Down = Down-Right, Left = Down-Left
- Enter to start/continue.

Features
- Isometric cube pyramid with top/left/right faces, gradient lighting, and rim highlights for CRT pop.
- Multi-step tiles: later rounds require multiple landings to reach the target color.
- Floating disks on edges: ride back to the top and bait Coily to fall for bonus points.
- Coily: purple ball becomes a snake, then chases you.
- Ugg/Wrongway: side crawlers skitter along the faces; colliding costs a life.
- Sam/Slick: recolor tiles back down; catch them for points.
- Hazards: red balls descend.
- Profanity bubble on death; extra life every 8000 points.
- CRT overlays: scanlines, aperture mask, vignette, glow, pixel upscaling.

Tips
- Time disk rides to drop Coily for big points.
- Prioritize tiles being reverted by Sam/Slick.
- Extra lives arrive at 8000, 16000, ...

Tuning
- src/main.js: LIGHT constants for gradient intensity and rim highlight; levelConfig() and makeDisksForRound(); spawn cadences and speeds; scoring; extra-life threshold (nextLifeAt increments by 8000).
- src/styles.css: .overlay-mask opacity and blend mode, scanline intensity.

Notes
- Audio may remain muted until your first interaction (browser autoplay policies).
