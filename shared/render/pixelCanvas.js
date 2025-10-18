// Shared helper for working with low-resolution, pixel-perfect canvas scenes.
// Keeps image smoothing disabled and centralizes common grid-based helpers.
export function createPixelContext(canvas, options = {}) {
  const ctx = canvas.getContext('2d', options);
  disableSmoothing(ctx);

  function disableSmoothing(target) {
    if (!target) return;
    if ('imageSmoothingEnabled' in target) target.imageSmoothingEnabled = false;
    if ('mozImageSmoothingEnabled' in target) target.mozImageSmoothingEnabled = false;
    if ('webkitImageSmoothingEnabled' in target) target.webkitImageSmoothingEnabled = false;
    if ('msImageSmoothingEnabled' in target) target.msImageSmoothingEnabled = false;
  }

  function resizeToGrid(cols, rows, tileSize) {
    const width = Math.round(cols * tileSize);
    const height = Math.round(rows * tileSize);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return { width, height };
  }

  function fillRect(x, y, width, height, color) {
    if (color !== undefined) ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }

  function drawSprite(sprite, ...args) {
    if (!sprite) return;
    disableSmoothing(ctx);
    if (args.length === 0) {
      ctx.drawImage(sprite, 0, 0);
    } else if (args.length === 2) {
      ctx.drawImage(sprite, args[0], args[1]);
    } else if (args.length === 4) {
      ctx.drawImage(sprite, args[0], args[1], args[2], args[3]);
    } else if (args.length === 8) {
      ctx.drawImage(sprite, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    } else {
      throw new Error('drawSprite: unsupported argument count');
    }
  }

  function forEachTile(cols, rows, tileSize, callback) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        callback(x, y, x * tileSize, y * tileSize);
      }
    }
  }

  function overlayText(text, {
    x = canvas.width / 2,
    y = canvas.height / 2,
    padding = 12,
    font = 'bold 16px monospace',
    fillStyle = 'rgba(0,0,0,0.55)',
    textFill = '#fff',
    align = 'center',
    baseline = 'middle',
    boxWidth,
    boxHeight,
    boxX,
    boxY,
  } = {}) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    const metrics = ctx.measureText(text);
    const measuredHeight =
      (metrics.actualBoundingBoxAscent ?? 0) +
      (metrics.actualBoundingBoxDescent ?? 0) +
      padding * 2;
    const fallbackHeight = parseInt(font, 10) + padding * 2;
    const height = boxHeight ?? (measuredHeight || fallbackHeight);
    const width = boxWidth ?? (metrics.width + padding * 2);
    const centerX = boxX ?? x;
    const centerY = boxY ?? y;
    const rectX = centerX - width / 2;
    const rectY = centerY - height / 2;

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fillRect(rectX, rectY, width, height);
    }

    ctx.fillStyle = textFill;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  return {
    canvas,
    ctx,
    context: ctx,
    resizeToGrid,
    fillRect,
    drawSprite,
    forEachTile,
    overlayText,
    disableSmoothing: () => disableSmoothing(ctx),
  };
}
