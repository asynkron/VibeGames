export const SPRITE_PATHS = {
  player: './assets/sprites/player.svg',
  enemy: './assets/sprites/enemy.svg',
  bubble: './assets/sprites/bubble.svg',
  pickup: './assets/sprites/pickup.svg',
};

export function loadSprites(paths = SPRITE_PATHS) {
  const entries = Object.entries(paths);
  const pending = entries.map(([key, src]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve([key, img]);
    img.onerror = (e) => reject(new Error('Failed to load sprite ' + key + ' from ' + src));
    img.src = src;
  }));
  return Promise.all(pending).then((pairs) => {
    const out = {};
    for (const [k, v] of pairs) out[k] = v;
    return out;
  });
}

export function drawSprite(ctx, img, x, y, w, h) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.floor(x), Math.floor(y), w, h);
}
