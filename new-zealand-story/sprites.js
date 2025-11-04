function createSprite(width, height, painter) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D context not available for sprite creation');
  }
  ctx.imageSmoothingEnabled = false;
  painter(ctx, width, height);
  return canvas;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

export function loadSprites() {
  const kiwiIdle = createSprite(28, 28, (ctx, w, h) => {
    ctx.fillStyle = '#f3d23b';
    drawRoundedRect(ctx, 2, 4, w - 4, h - 6, 6);
    ctx.fillStyle = '#ffe893';
    drawRoundedRect(ctx, 6, 8, w - 12, h - 14, 6);
    ctx.fillStyle = '#1b1b24';
    ctx.fillRect(10, 12, 4, 4);
    ctx.fillRect(16, 12, 4, 4);
    ctx.fillStyle = '#ef7a2e';
    ctx.fillRect(12, h - 6, 4, 6);
    ctx.fillRect(16, h - 6, 4, 6);
  });

  const kiwiFlap = createSprite(28, 28, (ctx, w, h) => {
    ctx.fillStyle = '#f3d23b';
    drawRoundedRect(ctx, 2, 4, w - 4, h - 6, 6);
    ctx.fillStyle = '#ffe893';
    drawRoundedRect(ctx, 6, 8, w - 12, h - 14, 6);
    ctx.fillStyle = '#1b1b24';
    ctx.fillRect(10, 12, 4, 4);
    ctx.fillRect(16, 12, 4, 4);
    ctx.fillStyle = '#ef7a2e';
    ctx.save();
    ctx.translate(w / 2, h - 4);
    ctx.rotate(-0.3);
    ctx.fillRect(-6, -4, 12, 4);
    ctx.restore();
  });

  const foe = createSprite(28, 26, (ctx, w, h) => {
    ctx.fillStyle = '#64b7ff';
    drawRoundedRect(ctx, 2, 4, w - 4, h - 6, 6);
    ctx.fillStyle = '#1b1b24';
    ctx.fillRect(9, 11, 5, 5);
    ctx.fillRect(16, 11, 5, 5);
    ctx.fillStyle = '#f4ffff';
    ctx.fillRect(11, 13, 3, 3);
    ctx.fillRect(17, 13, 3, 3);
    ctx.fillStyle = '#2c8ce0';
    ctx.fillRect(12, h - 6, 4, 6);
  });

  const arrow = createSprite(18, 6, (ctx, w, h) => {
    ctx.fillStyle = '#e0c8a0';
    ctx.fillRect(0, h / 2 - 1, w - 4, 2);
    ctx.fillStyle = '#f8f0d0';
    ctx.fillRect(w - 6, h / 2 - 2, 6, 4);
    ctx.fillStyle = '#ef7a2e';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(6, 0);
    ctx.lineTo(6, h);
    ctx.closePath();
    ctx.fill();
  });

  const collectible = createSprite(20, 20, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, 10);
    gradient.addColorStop(0, '#fffbcd');
    gradient.addColorStop(0.6, '#f6ba4a');
    gradient.addColorStop(1, '#c55a14');
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, 2, 2, w - 4, h - 4, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(6, 4, 4, 8);
  });

  const goalMarker = createSprite(28, 40, (ctx, w, h) => {
    ctx.fillStyle = '#f4faff';
    ctx.fillRect(w / 2 - 2, 8, 4, h - 10);
    const gradient = ctx.createLinearGradient(0, 0, 0, 24);
    gradient.addColorStop(0, '#f8f8f8');
    gradient.addColorStop(1, '#fa5e9b');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w - 4, 16);
    ctx.lineTo(w / 2, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b1a4e';
    ctx.fillRect(w / 2 - 4, h - 4, 8, 4);
  });

  return Promise.resolve({
    player: [kiwiIdle, kiwiFlap],
    enemy: [foe],
    arrow,
    collectible,
    goal: goalMarker,
  });
}

export function drawSprite(ctx, sprite, x, y, options = {}) {
  if (!sprite) return;
  const { anchorX = 0.5, anchorY = 1, flipX = false, scale = 1 } = options;
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const drawX = Math.floor(x - width * anchorX);
  const drawY = Math.floor(y - height * anchorY);
  ctx.save();
  if (flipX) {
    ctx.translate(drawX + width, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, 0, 0, width, height);
  } else {
    ctx.drawImage(sprite, drawX, drawY, width, height);
  }
  ctx.restore();
}
