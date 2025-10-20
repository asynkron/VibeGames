Bubble Bobble (CRT)

A retro-styled Bubble Bobble homage using the shared CRT stack:
- CSS overlays: shared/styles/crt.css, shared/styles/screen.css
- JS controls: shared/ui/crtControls.js (panel, scanline intensity)
- Post-process: shared/fx/crtPostprocess.js (warp, aberration)
- Preset hotkeys: shared/ui/crt.js (F1/F2)

How to run
- Open index.html in a modern browser (no build step required).
- Use the CRT panel (floating UI) to tweak warp/scanlines; F1/F2 cycles presets.

Next steps
- Implement tilemap, player, bubbles, enemies, pickups, and levels as per docs/plan.md
