import { createPixelContext } from '../../shared/render/pixelCanvas.js';
import { initGameCrt } from '../../shared/ui/gameCrt.js';
import { createOverlayFX } from '../../shared/fx/overlay.js';
import {
  createDefaultCrtSettings,
} from '../../shared/config/display.js';

export function createRenderer(canvas, assets) {
  const pixel = createPixelContext(canvas);
  const { ctx } = pixel;
  const pixelScale = 2; // draw tiles at 2× their logical resolution

  let viewport = {
    cols: 0,
    rows: 0,
    logicalTileSize: 16,
    tileSize: 16 * pixelScale,
    width: canvas.width,
    height: canvas.height,
  };

  function updateViewport(world) {
    const logicalTileSize = world?.tilesize ?? viewport.logicalTileSize;
    const renderTileSize = logicalTileSize * pixelScale;
    const cols = Math.max(1, Math.round(canvas.width / renderTileSize));
    const rows = Math.max(1, Math.round(canvas.height / renderTileSize));
    const { width, height } = pixel.resizeToGrid(cols, rows, renderTileSize);
    viewport = {
      cols,
      rows,
      logicalTileSize,
      tileSize: renderTileSize,
      width,
      height,
    };
    overlayFx.setBounds({ width, height });
    return viewport;
  }

  const crtSettings = createDefaultCrtSettings();
  const { post: crtPost } = initGameCrt({
    storageKey: 'boulderdash_crt_settings',
    settings: crtSettings,
    targetContext: ctx,
    frameElement: document.getElementById('root'),
  });
  const overlayFx = createOverlayFX({ ctx, width: canvas.width, height: canvas.height });
  updateViewport();

  const syncOverlayBounds = (world) => {
    updateViewport(world);
  };

  function draw(world) {
    const { width, height } = world;
    const { tileSize, cols, rows, width: viewWidth, height: viewHeight } = updateViewport(world);

    // clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    const tilesVisibleX = cols;
    const tilesVisibleY = rows;
    const centerTileX = world.player.x + 0.5;
    const centerTileY = world.player.y + 0.5;
    const halfTilesX = tilesVisibleX / 2;
    const halfTilesY = tilesVisibleY / 2;

    const startX = Math.max(0, Math.floor(centerTileX - halfTilesX) - 1);
    const endX = Math.min(width, Math.ceil(centerTileX + halfTilesX) + 1);
    const startY = Math.max(0, Math.floor(centerTileY - halfTilesY) - 1);
    const endY = Math.min(height, Math.ceil(centerTileY + halfTilesY) + 1);

    const playerCenterX = centerTileX * tileSize;
    const playerCenterY = centerTileY * tileSize;
    // Translate the map so the player's center aligns with the viewport center.
    const offsetX = Math.round(viewWidth / 2 - playerCenterX);
    const offsetY = Math.round(viewHeight / 2 - playerCenterY);

    // draw tiles
    const t = world.t;
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const id = t[world.idx(x, y)];
        const sprite = assets.getSprite(id, x, y, world.tick);
        if (!sprite) continue;
        const screenX = x * tileSize + offsetX;
        const screenY = y * tileSize + offsetY;
        if (screenX + tileSize < 0 || screenY + tileSize < 0 || screenX >= viewWidth || screenY >= viewHeight) continue;
        pixel.drawSprite(sprite, screenX, screenY, tileSize, tileSize);
      }
    }

    if (world.enemies && world.enemies.length) {
      for (const e of world.enemies) {
        const sprite = assets.enemy(e.type, world.tick);
        if (!sprite) continue;
        const screenX = e.x * tileSize + offsetX;
        const screenY = e.y * tileSize + offsetY;
        if (screenX + tileSize < 0 || screenY + tileSize < 0 || screenX >= viewWidth || screenY >= viewHeight) continue;
        pixel.drawSprite(sprite, screenX, screenY, tileSize, tileSize);
      }
    }

    // draw player
    const p = assets.player(world.tick);
    const playerScreenX = world.player.x * tileSize + offsetX;
    const playerScreenY = world.player.y * tileSize + offsetY;
    pixel.drawSprite(p, playerScreenX, playerScreenY, tileSize, tileSize);

    if (world.explosions && world.explosions.length) {
      for (const ex of world.explosions) {
        const stage = Math.max(0, (ex.age ?? 0) - 1);
        const sprite = assets.explosion(ex.kind, stage);
        if (!sprite) continue;
        const screenX = ex.x * tileSize + offsetX;
        const screenY = ex.y * tileSize + offsetY;
        if (screenX + tileSize < 0 || screenY + tileSize < 0 || screenX >= viewWidth || screenY >= viewHeight) continue;
        pixel.drawSprite(sprite, screenX, screenY, tileSize, tileSize);
      }
    }

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
