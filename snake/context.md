# Snake CRT (.openagent/temp/snake-crt)

Purpose
- A self-contained, static Snake game showcasing old-school arcade CRT aesthetics (scanlines, vignette, subtle flicker) and a crisp pixel grid.

Key files
- index.html: Canvas host with HUD and CRT overlays
- style.css: CRT effect stack (scanlines, vignette, glow) and bezel
- script.js: Game loop (fixed-step), input, collision, and WebAudio bleeps
- README.md: Usage and design notes

Known risks
- Fonts: Uses Google Font "Press Start 2P"; offline use will fall back to system monospace.
- Audio: Browsers may require a user gesture for WebAudio; first key press enables sound.
- Platform: The included open command is macOS-specific; skip if not on macOS.
- Performance: Effects are lightweight, but very old GPUs may show minor flicker variance.

Maintenance hints
- Change COLS/ROWS/TILE in script.js to adjust the grid.
- Tweak scanline density or vignette strength in style.css.
- Snake initialization now seeds the head at the leading segment; keep spawn order intact if you refactor `init()` to avoid immediate self-collisions on the first tick.
