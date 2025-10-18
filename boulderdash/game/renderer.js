import { createPixelContext } from '../../shared/render/pixelCanvas.js';

export function createRenderer(canvas, assets) {
  const pixel = createPixelContext(canvas);
  const { ctx } = pixel;

  function draw(world) {
    const { width, height, tilesize } = world;
    pixel.resizeToGrid(width, height, tilesize);

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

  return { draw };
}
