import { createTileFactory } from '../shared/render/tile-forge/factory.js';
import { registerStandardTiles } from '../shared/render/tile-forge/standardTiles.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio ?? 1;
const BASE_WIDTH = 720;
const BASE_HEIGHT = 960;

canvas.width = BASE_WIDTH * dpr;
canvas.height = BASE_HEIGHT * dpr;
ctx.scale(dpr, dpr);

const tileFactory = registerStandardTiles(createTileFactory({ size: 16 }));

// Neon-ready tiles pulled from tile forge so every brick still feels pixel-authentic.
const brickThemes = [
  { id: 'metal/riveted', color: '#35f1ff', sparkle: '#9ffaff' },
  { id: 'pattern/circuit', color: '#54ffb4', sparkle: '#d7fff1' },
  { id: 'gem/ruby', color: '#ff2a92', sparkle: '#ffc4f2' },
  { id: 'gem/emerald', color: '#72ffa4', sparkle: '#d6ffe7' },
  { id: 'gem/diamond-blue', color: '#6ad1ff', sparkle: '#e0f6ff' },
  { id: 'lava/default', color: '#ff6a2a', sparkle: '#ffd9c3' },
];

const brickTextures = brickThemes.map((theme) =>
  tileFactory.render(theme.id, { scale: 4 })
);

const WALL_PADDING = 64;
const TOP_OFFSET = 140;
const BRICK_COLS = 12;
const BRICK_ROWS = 9;
const BRICK_WIDTH = (BASE_WIDTH - WALL_PADDING * 2) / BRICK_COLS;
const BRICK_HEIGHT = 38;

const levels = [
  [
    [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 5],
    [1, 2, 3, 4, 5, 4, 5, 4, 3, 2, 1, 0],
    [2, 3, 4, 5, 0, 1, 0, 5, 4, 3, 2, 1],
    [3, 4, 5, 0, 1, 2, 1, 0, 5, 4, 3, 2],
    [4, 5, 0, 1, 2, 3, 2, 1, 0, 5, 4, 3],
  ],
  [
    [5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 0],
    [0, 5, 4, 3, 2, 1, 2, 3, 4, 5, 0, 1],
    [1, 0, 5, 4, 3, 2, 3, 4, 5, 0, 1, 2],
    [2, 1, 0, 5, 4, 3, 4, 5, 0, 1, 2, 3],
    [3, 2, 1, 0, 5, 4, 5, 0, 1, 2, 3, 4],
    [4, 3, 2, 1, 0, 5, 0, 1, 2, 3, 4, 5],
  ],
];

// Starfield backdrop keeps the 80s arcade cabinet from feeling static.
const stars = Array.from({ length: 180 }, () => ({
  x: Math.random() * BASE_WIDTH,
  y: Math.random() * BASE_HEIGHT,
  depth: Math.random() * 0.7 + 0.3,
}));

// Player paddle keeps extra state for glow pulses triggered by power cores.
const paddle = {
  x: BASE_WIDTH / 2,
  y: BASE_HEIGHT - 140,
  width: BRICK_WIDTH * 1.8,
  height: 20,
  speed: 900,
  target: BASE_WIDTH / 2,
  glow: 0,
};

const ball = {
  x: BASE_WIDTH / 2,
  y: paddle.y - 40,
  radius: 10,
  vx: 0,
  vy: 0,
  speed: 520,
  stuck: true,
};

let bricks = [];
let particles = [];
let powerUps = [];
let score = 0;
let lives = 3;
let levelIndex = 0;
let lastTime = 0;

const scoreEl = document.querySelector('[data-score]');
const livesEl = document.querySelector('[data-lives]');
const levelEl = document.querySelector('[data-level]');

function formatScore(value) {
  return value.toString().padStart(6, '0');
}

function formatLives(value) {
  return value.toString().padStart(2, '0');
}

function resetGame() {
  score = 0;
  lives = 3;
  levelIndex = 0;
  buildLevel(levelIndex);
  resetBall();
  updateHud();
}

function resetBall() {
  ball.stuck = true;
  ball.vx = 0;
  ball.vy = 0;
  ball.x = paddle.x;
  ball.y = paddle.y - paddle.height - ball.radius - 4;
}

function buildLevel(index) {
  const layout = levels[index % levels.length];
  bricks = [];
  layout.forEach((row, rowIndex) => {
    row.forEach((themeIndex, colIndex) => {
      bricks.push({
        x: WALL_PADDING + colIndex * BRICK_WIDTH,
        y: TOP_OFFSET + rowIndex * BRICK_HEIGHT,
        width: BRICK_WIDTH - 6,
        height: BRICK_HEIGHT - 6,
        theme: themeIndex % brickThemes.length,
        alive: true,
        hp: 1,
      });
    });
  });
}

function launchBall() {
  if (!ball.stuck) return;
  const angle = (-Math.PI / 4) + (Math.random() * Math.PI) / 8;
  ball.vx = Math.cos(angle) * ball.speed;
  ball.vy = Math.sin(angle) * ball.speed;
  ball.stuck = false;
}

const keys = new Set();

document.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  keys.add(event.key.toLowerCase());
  if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    launchBall();
  }
});

document.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const relative = (event.clientX - rect.left) / rect.width;
  paddle.target = Math.max(
    WALL_PADDING + paddle.width / 2,
    Math.min(BASE_WIDTH - WALL_PADDING - paddle.width / 2, relative * BASE_WIDTH)
  );
  if (ball.stuck) {
    ball.x = paddle.target;
  }
});

canvas.addEventListener('pointerdown', () => {
  launchBall();
});

function updateHud() {
  scoreEl.textContent = formatScore(score);
  livesEl.textContent = formatLives(lives);
  levelEl.textContent = formatLives(levelIndex + 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updatePaddle(dt) {
  if (keys.has('arrowleft') || keys.has('a')) {
    paddle.target = Math.max(WALL_PADDING + paddle.width / 2, paddle.target - paddle.speed * dt);
  }
  if (keys.has('arrowright') || keys.has('d')) {
    paddle.target = Math.min(
      BASE_WIDTH - WALL_PADDING - paddle.width / 2,
      paddle.target + paddle.speed * dt
    );
  }
  const targetX = clamp(
    paddle.target,
    WALL_PADDING + paddle.width / 2,
    BASE_WIDTH - WALL_PADDING - paddle.width / 2
  );
  paddle.x += (targetX - paddle.x) * Math.min(1, dt * 12);
  paddle.glow = Math.max(0, paddle.glow - dt * 0.6);
}

// Quick burst of glowing shards whenever a brick shatters.
function spawnParticles(x, y, color) {
  for (let i = 0; i < 24; i += 1) {
    const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.5;
    const speed = 180 + Math.random() * 160;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
    });
  }
}

// Small chance of power cores that widen the paddle and boost its bloom.
function spawnPowerUp(brick) {
  const chance = Math.random();
  if (chance > 0.22) return;
  powerUps.push({
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    vx: (Math.random() - 0.5) * 40,
    vy: 110 + Math.random() * 40,
    type: 'glow',
    life: 10,
  });
}

function updateParticles(dt) {
  particles = particles.filter((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
    p.life -= dt * 1.2;
    return p.life > 0 && p.y < BASE_HEIGHT + 40;
  });
}

function updatePowerUps(dt) {
  powerUps = powerUps.filter((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy = clamp(p.vy + 220 * dt, -400, 320);
    p.life -= dt * 0.1;
    if (
      p.y + 12 >= paddle.y - paddle.height / 2 &&
      p.y - 12 <= paddle.y + paddle.height / 2 &&
      p.x >= paddle.x - paddle.width / 2 &&
      p.x <= paddle.x + paddle.width / 2
    ) {
      paddle.width = clamp(paddle.width * 1.25, BRICK_WIDTH * 1.2, BRICK_WIDTH * 2.8);
      paddle.glow = 1.2;
      return false;
    }
    return p.life > 0 && p.y < BASE_HEIGHT + 40;
  });
}

function reflectBall(normalX, normalY) {
  const dot = ball.vx * normalX + ball.vy * normalY;
  ball.vx -= 2 * dot * normalX;
  ball.vy -= 2 * dot * normalY;
}

function collideRect(rect) {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.width);
  const closestY = clamp(ball.y, rect.y, rect.y + rect.height);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq > ball.radius * ball.radius) {
    return false;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    reflectBall(Math.sign(dx || ball.vx), 0);
  } else {
    reflectBall(0, Math.sign(dy || ball.vy));
  }
  const distance = Math.sqrt(distanceSq) || 1;
  const penetration = ball.radius - distance;
  ball.x += (dx / distance || 0) * penetration;
  ball.y += (dy / distance || 0) * penetration;
  return true;
}

// Integrate ball physics, handle bounces, and advance to the next pattern when cleared.
function updateBall(dt) {
  if (ball.stuck) {
    ball.x = paddle.x;
    ball.y = paddle.y - paddle.height - ball.radius - 4;
    return;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - ball.radius <= WALL_PADDING) {
    ball.x = WALL_PADDING + ball.radius;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.radius >= BASE_WIDTH - WALL_PADDING) {
    ball.x = BASE_WIDTH - WALL_PADDING - ball.radius;
    ball.vx = -Math.abs(ball.vx);
  }

  if (ball.y - ball.radius <= TOP_OFFSET - 70) {
    ball.y = TOP_OFFSET - 70 + ball.radius;
    ball.vy = Math.abs(ball.vy);
  }

  if (ball.y - ball.radius > BASE_HEIGHT) {
    lives -= 1;
    paddle.width = BRICK_WIDTH * 1.8;
    if (lives <= 0) {
      resetGame();
    } else {
      resetBall();
    }
    updateHud();
    return;
  }

  const paddleRect = {
    x: paddle.x - paddle.width / 2,
    y: paddle.y - paddle.height / 2,
    width: paddle.width,
    height: paddle.height,
  };
  if (collideRect(paddleRect)) {
    const offset = (ball.x - paddle.x) / (paddle.width / 2);
    const maxBounce = Math.PI / 2.8;
    const bounceAngle = offset * maxBounce;
    const speed = Math.hypot(ball.vx, ball.vy);
    ball.vx = Math.sin(bounceAngle) * speed;
    ball.vy = -Math.abs(Math.cos(bounceAngle) * speed);
    paddle.glow = Math.min(1.4, paddle.glow + 0.3);
  }

  bricks.forEach((brick) => {
    if (!brick.alive) return;
    if (
      ball.x + ball.radius < brick.x ||
      ball.x - ball.radius > brick.x + brick.width ||
      ball.y + ball.radius < brick.y ||
      ball.y - ball.radius > brick.y + brick.height
    ) {
      return;
    }
    if (collideRect(brick)) {
      brick.alive = false;
      score += 50 + levelIndex * 10;
      spawnParticles(ball.x, ball.y, brickThemes[brick.theme].sparkle);
      spawnPowerUp(brick);
      updateHud();
    }
  });

  const remaining = bricks.some((brick) => brick.alive);
  if (!remaining) {
    levelIndex = (levelIndex + 1) % levels.length;
    buildLevel(levelIndex);
    resetBall();
    updateHud();
  }
}

// CRT vibe: layered gradient backdrop, scrolling grid, and twinkling stars.
function drawBackground(time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  gradient.addColorStop(0, '#050d1c');
  gradient.addColorStop(0.45, '#0a1530');
  gradient.addColorStop(1, '#1a0430');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  const gridSpacing = 48;
  const offset = (time * 0.04) % gridSpacing;
  for (let x = WALL_PADDING; x <= BASE_WIDTH - WALL_PADDING; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, TOP_OFFSET - 90);
    ctx.lineTo(x, BASE_HEIGHT);
    ctx.stroke();
  }
  for (let y = TOP_OFFSET - 90; y <= BASE_HEIGHT; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(WALL_PADDING, y + offset);
    ctx.lineTo(BASE_WIDTH - WALL_PADDING, y + offset);
    ctx.stroke();
  }
  ctx.restore();

  stars.forEach((star) => {
    const twinkle = 0.4 + Math.sin(time * 0.003 + star.x * 0.02) * 0.2;
    const radius = 1.2 + star.depth * 1.6 * twinkle;
    ctx.fillStyle = `rgba(${150 + star.depth * 100}, ${180 + star.depth * 60}, 255, ${0.35 +
      star.depth * 0.35})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBricks() {
  bricks.forEach((brick) => {
    if (!brick.alive) return;
    const theme = brickThemes[brick.theme];
    const texture = brickTextures[brick.theme];
    ctx.save();
    ctx.translate(brick.x, brick.y);
    ctx.drawImage(texture, 0, 0, brick.width, brick.height);

    const shine = ctx.createLinearGradient(0, 0, brick.width, brick.height);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    shine.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    shine.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, brick.width, brick.height);

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(
      brick.width / 2,
      brick.height / 2,
      4,
      brick.width / 2,
      brick.height / 2,
      brick.width
    );
    glow.addColorStop(0, `${theme.color}80`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, brick.width, brick.height);
    ctx.restore();
  });
}

function drawPaddle(time) {
  ctx.save();
  ctx.translate(paddle.x, paddle.y);
  ctx.shadowColor = `rgba(0, 255, 255, ${0.4 + paddle.glow * 0.5})`;
  ctx.shadowBlur = 32 + paddle.glow * 40;
  ctx.shadowOffsetY = 0;

  const paddleGradient = ctx.createLinearGradient(-paddle.width / 2, 0, paddle.width / 2, 0);
  paddleGradient.addColorStop(0, '#00f7ff');
  paddleGradient.addColorStop(0.5, '#ff00c3');
  paddleGradient.addColorStop(1, '#00f7ff');

  ctx.fillStyle = paddleGradient;
  ctx.fillRect(-paddle.width / 2, -paddle.height / 2, paddle.width, paddle.height);

  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(0, 0, paddle.height / 2, 0, 0, paddle.width);
  aura.addColorStop(0, `rgba(0, 255, 255, ${0.5 + paddle.glow * 0.3})`);
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-paddle.width, -paddle.height, paddle.width * 2, paddle.height * 2);
  ctx.restore();
}

function drawBall(time) {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 20;
  const gradient = ctx.createRadialGradient(0, 0, ball.radius * 0.2, 0, 0, ball.radius);
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(0.3, '#ffe6ff');
  gradient.addColorStop(1, '#00c8ff');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 160);
  glow.addColorStop(0, 'rgba(0, 255, 255, 0.32)');
  glow.addColorStop(0.45, 'rgba(255, 0, 170, 0.18)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(ball.x - 200, ball.y - 200, 400, 400);
  ctx.restore();
}

function drawParticles() {
  particles.forEach((p) => {
    const alpha = Math.max(0, p.life);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 + (1 - alpha) * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawPowerUps(time) {
  powerUps.forEach((p) => {
    const flicker = 0.6 + Math.sin(time * 0.01 + p.x * 0.2) * 0.2;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((time * 0.001) % (Math.PI * 2));
    ctx.globalCompositeOperation = 'screen';
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
    gradient.addColorStop(0, `rgba(0, 255, 255, ${0.5 * flicker})`);
    gradient.addColorStop(0.7, 'rgba(255, 0, 200, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-28, -28, 56, 56);

    ctx.fillStyle = `rgba(0, 255, 255, ${0.85 * flicker})`;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawFrame(time) {
  const now = time / 1000;
  const dt = Math.min(0.033, now - lastTime);
  lastTime = now;

  updatePaddle(dt);
  updateBall(dt);
  updateParticles(dt);
  updatePowerUps(dt);

  drawBackground(time);
  drawBricks();
  drawPaddle(time);
  drawBall(time);
  drawParticles();
  drawPowerUps(time);

  requestAnimationFrame(drawFrame);
}

function init() {
  buildLevel(levelIndex);
  updateHud();
  requestAnimationFrame(drawFrame);
}

resetGame();
init();
