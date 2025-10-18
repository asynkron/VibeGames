import { createPixelContext } from '../../shared/render/pixelCanvas.js';
import { createCrtControls, applyScanlineIntensity } from '../../shared/ui/crtControls.js';
import { createCrtPostProcessor } from '../../shared/fx/crtPostprocess.js';
import { createOverlayFX } from '../../shared/fx/overlay.js';

export function createRenderer(canvas, assets) {
  const pixel = createPixelContext(canvas);
  const { ctx } = pixel;

  const crtFrame = document.getElementById('root');
  const syncScanlines = (amount) => {
    if (!crtFrame) return;
    applyScanlineIntensity(crtFrame, amount, { alphaRange: [0.05, 0.28] });
  };

  const crtSettings = {
    enabled: true,
    warp: 0.08,
    aberration: 0.05,
    aberrationOpacity: 0.45,
    scanlines: 0.45,
  };
  const crtControls = createCrtControls({
    storageKey: 'boulderdash_crt_settings',
    defaults: crtSettings,
    onChange: (next) => {
      Object.assign(crtSettings, next);
      syncScanlines(next.scanlines);
    },
  });
  Object.assign(crtSettings, crtControls.getSettings());
  syncScanlines(crtSettings.scanlines);
  const crtPost = createCrtPostProcessor({ targetContext: ctx, settings: crtSettings });
  const overlayFx = createOverlayFX({ ctx, width: canvas.width, height: canvas.height });

  const syncOverlayBounds = (world) => {
    if (!world) return;
    overlayFx.setBounds({ width: world.width * world.tilesize, height: world.height * world.tilesize });
  };

  function draw(world) {
    const { width, height, tilesize } = world;
    pixel.resizeToGrid(width, height, tilesize);
    syncOverlayBounds(world);

    // clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw tiles
    const t = world.t;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const id = t[world.idx(x,y)];
        const sprite = assets.getSprite(id, x, y, world.tick);
        if (sprite) pixel.drawSprite(sprite, x*tilesize, y*tilesize, tilesize, tilesize);
      }
    }

    // draw player
    const p = assets.player(world.tick);
    pixel.drawSprite(p, world.player.x*tilesize, world.player.y*tilesize, tilesize, tilesize);

    // status overlays
    if (world.state === 'dead') overlayText('CRUSHED! Press R to restart');
    else if (world.state === 'timeup') overlayText('TIME UP! Press R to restart');
    else if (world.state === 'win') overlayText('LEVEL CLEARED!');

    // Apply CRT warp/aberration after the frame is drawn.
    crtPost.render();
    overlayFx.drawIris();
  }

  function overlayText(text) {
    pixel.overlayText(text, {
      font: 'bold 20px monospace',
      textFill: '#a8ffbf',
      fillStyle: 'rgba(0,0,0,0.45)',
      boxWidth: canvas.width,
      boxHeight: 48,
      boxY: canvas.height / 2,
      y: canvas.height / 2 + 7,
    });
  }

  return {
    draw,
    startIris: overlayFx.startIris,
    syncOverlayBounds,
  };
}
