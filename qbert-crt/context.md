# Q*bert CRT (HTML/JS) - Subproject Context

Purpose
- A self-contained, old-school arcade style Q*bert implemented in plain HTML/CSS/JS with CRT screen effects. Lives under `.openagent/tmp/qbert-crt` so it’s safe to open and iterate on locally.

Key files
- index.html: Page shell, canvas, UI overlays.
- src/styles.css: CRT effects (scanlines, vignette, flicker), bezel, pixel scaling.
- src/main.js: Game loop, isometric pyramid, Q*bert logic, scoring, hazards, WebAudio bleeps.
- docs/README.md: Run instructions, controls, roadmap, credits.

How to run
- Open index.html directly in a modern browser.
- Or serve statically (e.g. `npx http-server .openagent/tmp/qbert-crt`).

Known risks and notes
- Autoplay restrictions: sounds may require the first user interaction.
- CRT effects use layered CSS; older/low-power devices may see minor perf cost; effects can be toggled in code if needed.
- Input mapping: diagonal movement from arrow keys may feel inverted to some players; WASD/IJKL supported.
- Rendering picks a small internal resolution and upscales for crisp pixels; resizing is letterboxed.
- This is an MVP: includes tile flipping, scoring, lives, falling, and a basic hazard (red ball). Coily and additional enemies are planned follow-ups.

Maintenance
- Update this context if you add features, assets, or change architecture.

Update (3D cubes)
- Tiles now render as isometric cubes: top, left, and right faces with shading derived from the top color.
- Draw order: back rows first, then forward rows to ensure proper overlap of faces.
- Tunables in src/main.js: FACE_H (side depth), TILE_W/TILE_H (proportions), PYR_ROWS (size).
- Risk: excessive FACE_H can over-occlude lower rows; adjust PYR_TOP_Y or FACE_H as needed.

Update (stacking placement)
- rcToXY updated: each row now advances by TILE_H/2 + FACE_H to leave room for side faces between rows.
- If cubes over-occlude or the pyramid grows too tall, adjust FACE_H and/or PYR_TOP_Y.

Update (authentic features)
- Multi-step tiles: rounds can require 2 landings per tile (stage 0→1→2) via levelConfig.
- Floating disks: placed at pyramid edges by row; riding teleports Q*bert to top; Coily can be lured to fall.
- Coily: spawns as purple ball, becomes snake at bottom, then chases Q*bert.
- Profanity bubble: displayed on life loss near the last position.
- CRT aperture mask overlay added (.overlay-mask) for RGB triad look.

Tunables
- src/main.js: levelConfig(), makeDisksForRound(), spawn/update cadence for hazards and Coily, points for events.
- src/styles.css: .overlay-mask opacity and blend mode, scanline intensity.

Update (lighting + enemies)
- Cube rendering: per-face gradients for top/left/right faces; rim highlights on upper edges for CRT pop. Tunables in LIGHT constants (topHighlight, topShadow, leftDark, rightDark, rimAlpha).
- Enemies: Ugg/Wrongway (side crawlers), Sam/Slick (tile recolorers), Coily retains ball→snake chase.
- Systems: extra life every 8000 points; round intro card before play resumes.
- Collision model: crawlers and recolorers share top-face grid for collisions; drawn offset on side faces for the look. Future work could move them onto true side grids.

Update (bigger + crisper)
- Canvas now scales to ~95% of viewport with 4:3 aspect via CSS; game appears much larger.
- Removed outline strokes and rim highlight from cube rendering to avoid anti-aliased fuzzy edges when scaled.
- Strengthened per-face gradients so lighting is clearly visible on the top/side faces.
- Aperture mask opacity reduced to lower shimmer.

Update (controls + resolution)
- Internal canvas resolution increased to 512x384 for smoother gradients.
- Live controls:
  - M: toggle aperture mask
  - N: toggle scanlines
  - G: cycle gradient intensity (3 presets)
  - Z: cycle cube depth (affects FACE_H and row spacing)
- Overlays are toggled by applying/removing the .hidden class on overlay elements.

Update (pixel-locked CRT + UX)
- Replaced CSS scanlines/mask with a pixel-locked overlay canvas (#crt) drawn at 512x384 and upscaled with nearest-neighbor. Eliminates shimmer.
- Pixel scaling: both canvases render at 512x384 and upscale with nearest-neighbor for crisp edges.
- New controls: P pause/resume, H help overlay. M/N now toggle the JS overlay layers.
- Preferences persisted (localStorage): maskOn, scanOn, gradient preset, depth preset.
- Files touched: index.html (added #crt and Help overlay), styles.css (stacked canvases), main.js (overlay drawing, scaling, persistence, pause/help).

Update (default viewport scale)
- Removed the fullscreen hotkey; the playfield now opens at an enlarged viewport-friendly size.
- Scaling now uses the maximum 4:3 fit within 95% of the viewport (no integer rounding) so Q*bert matches the footprint of the other games.
