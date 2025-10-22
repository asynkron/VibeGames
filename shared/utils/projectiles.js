// Reusable helper that advances projectile arrays and removes entries when they
// expire or when consumer-defined callbacks signal that they're finished.
export function stepProjectiles(projectiles, dt, options = {}) {
  const settings = typeof options === 'function' ? { onActive: options } : options;
  const {
    advance = defaultAdvance,
    onActive,
    shouldRemove,
    onRemove,
  } = settings;

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];

    advance(projectile, dt);

    if (typeof projectile.life === 'number') {
      projectile.life -= dt;
    } else if (projectile.life === undefined) {
      // Treat projectiles without a predefined lifetime as persistent until
      // the consumer explicitly removes them via callbacks.
      projectile.life = Number.POSITIVE_INFINITY;
    }

    let remove = projectile.life <= 0;

    if (!remove && typeof shouldRemove === 'function' && shouldRemove(projectile, i, projectiles)) {
      remove = true;
    }

    if (!remove && typeof onActive === 'function' && onActive(projectile, i, projectiles)) {
      remove = true;
    }

    if (remove) {
      if (typeof onRemove === 'function') {
        onRemove(projectile, i, projectiles);
      }
      projectiles.splice(i, 1);
    }
  }
}

function defaultAdvance(projectile, dt) {
  if (typeof projectile.x === 'number') {
    const vx = typeof projectile.vx === 'number' ? projectile.vx : 0;
    projectile.x += vx * dt;
  }
  if (typeof projectile.y === 'number') {
    const vy = typeof projectile.vy === 'number' ? projectile.vy : 0;
    projectile.y += vy * dt;
  }
}
