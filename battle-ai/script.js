const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hudBlue = document.getElementById('hud-blue');
const hudRed = document.getElementById('hud-red');
const hudScore = document.getElementById('hud-score');
const hudMessage = document.getElementById('hud-msg');
const autoButton = document.querySelector('[data-action="auto"]');
const resetButton = document.querySelector('[data-action="reset"]');
const deployButtons = document.querySelectorAll('[data-team]');

// Track reduced motion early so we can tone down the auto spawn behaviour.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const arena = {
  width: canvas.width,
  height: canvas.height,
  maxUnitsPerTeam: prefersReducedMotion ? 8 : 14,
};

const teamSettings = {
  blue: {
    spawnX: arena.width * 0.18,
    color: '#38bdf8',
    accent: '#0ea5e9',
    beam: 'rgba(56, 189, 248, 0.85)',
  },
  red: {
    spawnX: arena.width * 0.82,
    color: '#f87171',
    accent: '#ef4444',
    beam: 'rgba(239, 68, 68, 0.85)',
  },
};

const unitTemplates = [
  {
    name: 'Scout',
    radius: 9,
    hp: 32,
    speed: 115,
    damage: 6,
    fireRate: 0.65,
    range: 72,
    detection: 180,
  },
  {
    name: 'Vanguard',
    radius: 11,
    hp: 56,
    speed: 78,
    damage: 8,
    fireRate: 0.85,
    range: 90,
    detection: 165,
  },
  {
    name: 'Artillery',
    radius: 10,
    hp: 44,
    speed: 64,
    damage: 11,
    fireRate: 1.15,
    range: 140,
    detection: 230,
  },
  {
    name: 'Assassin',
    radius: 8,
    hp: 28,
    speed: 140,
    damage: 12,
    fireRate: 0.95,
    range: 58,
    detection: 190,
  },
];

const state = {
  units: [],
  beams: [],
  particles: [],
  counts: { blue: 0, red: 0 },
  score: { blue: 0, red: 0 },
  autoDeploy: !prefersReducedMotion,
  autoTimer: 0,
  autoInterval: prefersReducedMotion ? 3.8 : 2.6,
  tick: 0,
};

const rallyPoints = {
  blue: { x: arena.width * 0.38, y: arena.height * 0.5 },
  red: { x: arena.width * 0.62, y: arena.height * 0.5 },
};

let lastFrame = 0;
let messageTimer = 0;
let activeTeam = 'blue';
const defaultMessage = 'Left click inside the arena to set the active team rally point.';

function randomTemplate() {
  const roll = Math.random();
  if (roll < 0.33) return unitTemplates[0];
  if (roll < 0.6) return unitTemplates[1];
  if (roll < 0.83) return unitTemplates[2];
  return unitTemplates[3];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function announce(text, duration = 4) {
  hudMessage.textContent = text;
  messageTimer = duration;
}

function syncAutoButton() {
  autoButton.textContent = `Auto Deploy: ${state.autoDeploy ? 'On' : 'Off'}`;
}

function updateHud() {
  hudBlue.textContent = `Blue Units: ${state.counts.blue}`;
  hudRed.textContent = `Red Units: ${state.counts.red}`;
  hudScore.textContent = `Score ${state.score.blue} : ${state.score.red}`;
}

function resetArena() {
  state.units = [];
  state.beams = [];
  state.particles = [];
  state.counts.blue = 0;
  state.counts.red = 0;
  state.score.blue = 0;
  state.score.red = 0;
  state.autoTimer = 0;
  rallyPoints.blue = { x: arena.width * 0.35, y: arena.height * 0.5 };
  rallyPoints.red = { x: arena.width * 0.65, y: arena.height * 0.5 };
  announce('Arena reset. Deploy squads to kick off a new skirmish.', 3.5);
  for (let i = 0; i < 3; i += 1) {
    spawnUnit('blue', { silent: true });
    spawnUnit('red', { silent: true });
  }
  updateHud();
}

function spawnUnit(team, { silent = false } = {}) {
  if (state.counts[team] >= arena.maxUnitsPerTeam) {
    if (!silent) {
      announce(`${capitalize(team)} staging area is full. Redirect units or wait.`, 2.5);
    }
    return null;
  }

  const template = randomTemplate();
  const spawn = teamSettings[team];
  const yPadding = 54;
  const unit = {
    id: `${team}-${state.tick}`,
    team,
    template: template.name,
    x: spawn.spawnX + (Math.random() - 0.5) * 28,
    y: clamp(Math.random() * (arena.height - yPadding * 2) + yPadding, 48, arena.height - 48),
    vx: 0,
    vy: 0,
    angle: team === 'blue' ? 0 : Math.PI,
    radius: template.radius,
    hp: template.hp,
    maxHp: template.hp,
    speed: template.speed,
    damage: template.damage,
    reload: Math.random() * template.fireRate,
    fireRate: template.fireRate,
    range: template.range,
    detection: template.detection,
    targetId: null,
    rallyDrift: Math.random() * Math.PI * 2,
  };

  state.units.push(unit);
  state.counts[team] += 1;
  state.tick += 1;
  updateHud();
  if (!silent) {
    announce(`${capitalize(team)} deployed a ${unit.template}.`, 2.5);
  }
  return unit;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function findUnitById(id) {
  return state.units.find((unit) => unit.id === id);
}

function acquireTarget(unit) {
  let closest = null;
  let closestDistSq = Infinity;
  const detectSq = unit.detection * unit.detection;
  for (const other of state.units) {
    if (other.team === unit.team || other.hp <= 0) continue;
    const dx = other.x - unit.x;
    const dy = other.y - unit.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < detectSq && distSq < closestDistSq) {
      closest = other;
      closestDistSq = distSq;
    }
  }
  unit.targetId = closest ? closest.id : null;
  return closest;
}

function attack(attacker, defender) {
  defender.hp -= attacker.damage;
  attacker.reload = attacker.fireRate;
  state.beams.push({
    x1: attacker.x,
    y1: attacker.y,
    x2: defender.x,
    y2: defender.y,
    life: 0.14,
    color: teamSettings[attacker.team].beam,
  });
  state.particles.push({
    x: defender.x + (Math.random() - 0.5) * 6,
    y: defender.y + (Math.random() - 0.5) * 6,
    vx: (Math.random() - 0.5) * 60,
    vy: (Math.random() - 0.5) * 60,
    life: 0.35,
    color: teamSettings[attacker.team].accent,
  });
  if (defender.hp <= 0) {
    handleUnitDestroyed(defender, attacker);
  }
}

function handleUnitDestroyed(unit, attacker) {
  unit.hp = 0;
  unit.dead = true;
  state.counts[unit.team] = Math.max(0, state.counts[unit.team] - 1);
  state.score[attacker.team] += 1;
  announce(`${capitalize(attacker.team)} eliminated a ${unit.template}.`, 2.75);
  for (let i = 0; i < 14; i += 1) {
    state.particles.push({
      x: unit.x,
      y: unit.y,
      vx: (Math.random() - 0.5) * 180,
      vy: (Math.random() - 0.5) * 180,
      life: 0.6 + Math.random() * 0.4,
      color: teamSettings[unit.team].color,
    });
  }
  updateHud();
}

function updateUnits(dt) {
  for (const unit of state.units) {
    if (unit.dead) continue;
    unit.reload = Math.max(0, unit.reload - dt);

    let target = unit.targetId ? findUnitById(unit.targetId) : null;
    if (!target || target.dead) {
      target = acquireTarget(unit);
    }

    if (target) {
      const dx = target.x - unit.x;
      const dy = target.y - unit.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        unit.angle = Math.atan2(dy, dx);
      }

      if (distance <= unit.range && unit.reload <= 0) {
        attack(unit, target);
      } else if (distance > unit.range * 0.7) {
        const step = unit.speed * dt;
        if (distance > 1) {
          unit.x += (dx / distance) * step;
          unit.y += (dy / distance) * step;
        }
      } else {
        orbitRally(unit, dt);
      }
    } else {
      orbitRally(unit, dt);
    }

    applySeparation(unit);

    unit.x = clamp(unit.x, unit.radius + 6, arena.width - unit.radius - 6);
    unit.y = clamp(unit.y, unit.radius + 6, arena.height - unit.radius - 6);
  }

  // Remove any defeated units in a separate pass so that targeting stays stable mid-loop.
  if (state.units.some((unit) => unit.dead)) {
    state.units = state.units.filter((unit) => !unit.dead);
  }
}

function orbitRally(unit, dt) {
  const rally = rallyPoints[unit.team];
  const dx = rally.x - unit.x;
  const dy = rally.y - unit.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 12) {
    const step = unit.speed * 0.6 * dt;
    if (distance > 1) {
      unit.x += (dx / distance) * step;
      unit.y += (dy / distance) * step;
    }
    unit.angle = Math.atan2(dy, dx);
  } else {
    unit.rallyDrift += dt * 0.8;
    unit.x += Math.cos(unit.rallyDrift) * dt * 12;
    unit.y += Math.sin(unit.rallyDrift * 0.75) * dt * 10;
    unit.angle += dt * 0.5;
  }
}

function applySeparation(unit) {
  for (const other of state.units) {
    if (other === unit || other.team !== unit.team || other.dead) continue;
    const dx = unit.x - other.x;
    const dy = unit.y - other.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = unit.radius + other.radius + 6;
    if (distance > 0 && distance < minDistance) {
      const push = (minDistance - distance) * 0.35;
      unit.x += (dx / distance) * push;
      unit.y += (dy / distance) * push;
    }
  }
}

function updateBeams(dt) {
  state.beams = state.beams
    .map((beam) => ({ ...beam, life: beam.life - dt }))
    .filter((beam) => beam.life > 0);
}

function updateParticles(dt) {
  state.particles = state.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * dt,
      y: particle.y + particle.vy * dt,
      vx: particle.vx * 0.92,
      vy: particle.vy * 0.92 + 12 * dt,
      life: particle.life - dt,
    }))
    .filter((particle) => particle.life > 0 && particle.x > -32 && particle.x < arena.width + 32 && particle.y < arena.height + 32);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, arena.height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#020617');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gridSize = 36;
  for (let x = gridSize; x < arena.width; x += gridSize) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, arena.height);
  }
  for (let y = gridSize; y < arena.height; y += gridSize) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(arena.width, y + 0.5);
  }
  ctx.stroke();

  ctx.fillStyle = 'rgba(15, 118, 110, 0.08)';
  ctx.fillRect(arena.width * 0.5 - 2, 0, 4, arena.height);
}

function drawBeams() {
  for (const beam of state.beams) {
    ctx.strokeStyle = beam.color;
    ctx.globalAlpha = clamp(beam.life / 0.14, 0, 1);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = clamp(particle.life / 0.6, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawUnits() {
  for (const unit of state.units) {
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.angle);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, unit.radius + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = teamSettings[unit.team].color;
    ctx.beginPath();
    ctx.arc(0, 0, unit.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = teamSettings[unit.team].accent;
    ctx.fillRect(unit.radius * 0.2, -2, unit.radius, 4);

    ctx.restore();

    const hpRatio = clamp(unit.hp / unit.maxHp, 0, 1);
    const barWidth = unit.radius * 2 + 8;
    const barX = unit.x - barWidth / 2;
    const barY = unit.y - unit.radius - 8;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(barX, barY, barWidth, 4);
    ctx.fillStyle = teamSettings[unit.team].accent;
    ctx.fillRect(barX, barY, barWidth * hpRatio, 4);
  }
}

function draw(dt) {
  drawBackground();
  drawParticles();
  drawBeams();
  drawUnits();

  if (messageTimer > 0) {
    messageTimer = Math.max(0, messageTimer - dt);
    if (messageTimer === 0) {
      hudMessage.textContent = defaultMessage;
    }
  }
}

function autoDeploy(dt) {
  if (!state.autoDeploy) return;
  state.autoTimer += dt;
  if (state.autoTimer < state.autoInterval) return;
  state.autoTimer = 0;
  if (state.counts.blue < arena.maxUnitsPerTeam) {
    spawnUnit('blue', { silent: true });
  }
  if (state.counts.red < arena.maxUnitsPerTeam) {
    spawnUnit('red', { silent: true });
  }
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.12) || 0;
  lastFrame = timestamp;

  autoDeploy(dt);
  updateUnits(dt);
  updateBeams(dt);
  updateParticles(dt);
  draw(dt);

  requestAnimationFrame(loop);
}

function toggleAutoDeploy() {
  state.autoDeploy = !state.autoDeploy;
  syncAutoButton();
  announce(`Auto deployment ${state.autoDeploy ? 'enabled' : 'disabled'}.`, 2.5);
}

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  rallyPoints[activeTeam] = { x, y };
  announce(`${capitalize(activeTeam)} rally moved to (${x.toFixed(0)}, ${y.toFixed(0)}).`, 3);
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

autoButton.addEventListener('click', toggleAutoDeploy);
resetButton.addEventListener('click', resetArena);

for (const button of deployButtons) {
  button.addEventListener('click', () => {
    const team = button.dataset.team;
    activeTeam = team;
    spawnUnit(team);
  });
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    toggleAutoDeploy();
  }
  if (event.key === 'r' || event.key === 'R') {
    resetArena();
  }
});

syncAutoButton();
announce(defaultMessage, 5);
resetArena();
requestAnimationFrame(loop);

