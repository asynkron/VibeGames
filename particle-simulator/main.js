const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

const TYPES = {
  up: {
    label: "Quark (up)",
    color: "#ff71ce",
    radius: 11,
    maxSpeed: 1.6,
  },
  down: {
    label: "Quark (down)",
    color: "#72f1f8",
    radius: 11,
    maxSpeed: 1.6,
  },
  proton: {
    label: "Proton",
    color: "#ffb347",
    radius: 16,
    maxSpeed: 1.25,
  },
  neutron: {
    label: "Neutron",
    color: "#9d7bff",
    radius: 16,
    maxSpeed: 1.25,
  },
  hydrogen: {
    label: "Hydrogen",
    color: "#7cf29c",
    radius: 20,
    maxSpeed: 1.1,
  },
  helium: {
    label: "Helium",
    color: "#ffd166",
    radius: 22,
    maxSpeed: 1,
  },
};

const particles = [];
const ripples = [];
let lastTime = performance.now();

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const { innerWidth: w, innerHeight: h } = window;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createParticle(type, x = randRange(60, canvas.width / 2), y = randRange(60, canvas.height / 2), vx = randRange(-0.8, 0.8), vy = randRange(-0.8, 0.8)) {
  const config = TYPES[type];
  return {
    type,
    ...config,
    x,
    y,
    vx,
    vy,
    wobble: randRange(0.02, 0.05),
    wobbleOffset: Math.random() * Math.PI * 2,
  };
}

function seedWorld() {
  particles.length = 0;
  ripples.length = 0;
  const quarkPairs = 18;
  for (let i = 0; i < quarkPairs; i++) {
    particles.push(createParticle("up", randRange(60, canvas.width - 60), randRange(60, canvas.height - 60)));
    particles.push(createParticle("down", randRange(60, canvas.width - 60), randRange(60, canvas.height - 60)));
  }
  updateLegend();
}

function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distSq = dx * dx + dy * dy;
  const rad = a.radius + b.radius;
  return distSq <= rad * rad;
}

function integrate(dt) {
  const width = canvas.width;
  const height = canvas.height;

  particles.forEach((p) => {
    // Gentle wobble keeps motion lively.
    p.vx += (Math.random() - 0.5) * 0.4 + Math.cos(p.wobbleOffset) * p.wobble;
    p.vy += (Math.random() - 0.5) * 0.4 + Math.sin(p.wobbleOffset) * p.wobble;
    p.wobbleOffset += 0.1;

    const speed = Math.hypot(p.vx, p.vy);
    const limit = p.maxSpeed;
    if (speed > limit) {
      p.vx = (p.vx / speed) * limit;
      p.vy = (p.vy / speed) * limit;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Soft wall bounce to keep everything visible.
    if (p.x < p.radius) {
      p.x = p.radius;
      p.vx *= -0.9;
    }
    if (p.x > width - p.radius) {
      p.x = width - p.radius;
      p.vx *= -0.9;
    }
    if (p.y < p.radius) {
      p.y = p.radius;
      p.vy *= -0.9;
    }
    if (p.y > height - p.radius) {
      p.y = height - p.radius;
      p.vy *= -0.9;
    }
  });
}

function combineQuarks() {
  const quarkIndices = particles
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.type === "up" || p.type === "down");

  const visited = new Set();
  const toRemove = new Set();
  const additions = [];

  const overlaps = (i, j) => circlesOverlap(quarkIndices[i], quarkIndices[j]);

  for (let i = 0; i < quarkIndices.length; i++) {
    if (visited.has(i)) continue;
    const stack = [i];
    const component = [];
    visited.add(i);

    // Flood fill to gather touching quarks.
    while (stack.length) {
      const current = stack.pop();
      component.push(quarkIndices[current]);
      for (let j = 0; j < quarkIndices.length; j++) {
        if (!visited.has(j) && overlaps(current, j)) {
          visited.add(j);
          stack.push(j);
        }
      }
    }

    if (component.length < 3) continue;

    const pool = [...component];
    const counts = {
      up: pool.filter((p) => p.type === "up").length,
      down: pool.filter((p) => p.type === "down").length,
    };

    while (pool.length >= 3) {
      let target = null;
      if (counts.up >= 1 && counts.down >= 2) {
        target = "neutron";
      } else if (counts.up >= 2 && counts.down >= 1) {
        target = "proton";
      } else {
        break;
      }

      const picked = [];
      const need = target === "neutron" ? { up: 1, down: 2 } : { up: 2, down: 1 };

      for (const flavor of ["up", "down"]) {
        const take = need[flavor];
        for (let k = 0; k < pool.length && picked.filter((p) => p.type === flavor).length < take; k++) {
          if (pool[k].type === flavor) {
            picked.push(pool[k]);
          }
        }
      }

      if (picked.length !== 3) break;

      // Average position and velocity for the fused particle.
      const cx = picked.reduce((sum, p) => sum + p.x, 0) / 3;
      const cy = picked.reduce((sum, p) => sum + p.y, 0) / 3;
      const cvx = picked.reduce((sum, p) => sum + p.vx, 0) / 3;
      const cvy = picked.reduce((sum, p) => sum + p.vy, 0) / 3;

      additions.push(createParticle(target, cx, cy, cvx, cvy));

      picked.forEach((p) => {
        toRemove.add(p.index);
        const idx = pool.indexOf(p);
        if (idx >= 0) pool.splice(idx, 1);
      });

      counts.up -= need.up;
      counts.down -= need.down;
    }
  }

  if (toRemove.size || additions.length) {
    for (let i = particles.length - 1; i >= 0; i--) {
      if (toRemove.has(i)) particles.splice(i, 1);
    }
    particles.push(...additions);
  }
}

function combineProtonsAndNeutrons() {
  const usedProtons = new Set();
  const usedNeutrons = new Set();
  const additions = [];

  const protons = particles.map((p, i) => ({ p, i })).filter((e) => e.p.type === "proton");
  const neutrons = particles.map((p, i) => ({ p, i })).filter((e) => e.p.type === "neutron");

  for (const proton of protons) {
    if (usedProtons.has(proton.i)) continue;
    for (const neutron of neutrons) {
      if (usedNeutrons.has(neutron.i)) continue;
      if (circlesOverlap(proton.p, neutron.p)) {
        const cx = (proton.p.x + neutron.p.x) / 2;
        const cy = (proton.p.y + neutron.p.y) / 2;
        const cvx = (proton.p.vx + neutron.p.vx) / 2;
        const cvy = (proton.p.vy + neutron.p.vy) / 2;
        additions.push(createParticle("hydrogen", cx, cy, cvx, cvy));
        usedProtons.add(proton.i);
        usedNeutrons.add(neutron.i);
        break;
      }
    }
  }

  if (usedProtons.size || usedNeutrons.size) {
    particles.splice(0, particles.length, ...particles.filter((_, idx) => !usedProtons.has(idx) && !usedNeutrons.has(idx)));
    particles.push(...additions);
  }
}

function applyForceWave(origin, magnitude, radius) {
  particles.forEach((p) => {
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0 || dist > radius) return;
    const strength = (1 - dist / radius) * magnitude;
    p.vx += (dx / dist) * strength;
    p.vy += (dy / dist) * strength;
  });
  ripples.push({ x: origin.x, y: origin.y, r: 0, alpha: 0.35, max: radius });
}

function combineHydrogen() {
  const used = new Set();
  const additions = [];
  const hydrogens = particles.map((p, i) => ({ p, i })).filter((e) => e.p.type === "hydrogen");

  for (let i = 0; i < hydrogens.length; i++) {
    if (used.has(hydrogens[i].i)) continue;
    for (let j = i + 1; j < hydrogens.length; j++) {
      if (used.has(hydrogens[j].i)) continue;
      if (circlesOverlap(hydrogens[i].p, hydrogens[j].p)) {
        const cx = (hydrogens[i].p.x + hydrogens[j].p.x) / 2;
        const cy = (hydrogens[i].p.y + hydrogens[j].p.y) / 2;
        const cvx = (hydrogens[i].p.vx + hydrogens[j].p.vx) / 2;
        const cvy = (hydrogens[i].p.vy + hydrogens[j].p.vy) / 2;
        const helium = createParticle("helium", cx, cy, cvx, cvy);
        additions.push(helium);
        used.add(hydrogens[i].i);
        used.add(hydrogens[j].i);
        applyForceWave({ x: cx, y: cy }, 2.5, 220);
        break;
      }
    }
  }

  if (used.size) {
    particles.splice(0, particles.length, ...particles.filter((_, idx) => !used.has(idx)));
    particles.push(...additions);
  }
}

function handleInteractions() {
  combineQuarks();
  combineProtonsAndNeutrons();
  combineHydrogen();
}

function drawBackground() {
  const { width, height } = canvas;
  const grad = ctx.createRadialGradient(width * 0.3, height * 0.3, 80, width * 0.5, height * 0.6, Math.max(width, height));
  grad.addColorStop(0, "rgba(33, 36, 62, 0.5)");
  grad.addColorStop(1, "rgba(6, 7, 13, 0.8)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawRipples(dt) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const ripple = ripples[i];
    ripple.r += dt * 70;
    ripple.alpha = clamp(ripple.alpha - dt * 0.25, 0, 1);
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(135, 245, 251, ${ripple.alpha})`;
    ctx.lineWidth = 6;
    ctx.stroke();
    if (ripple.r > ripple.max || ripple.alpha <= 0.01) {
      ripples.splice(i, 1);
    }
  }
}

function drawParticles() {
  const sorted = [...particles].sort((a, b) => a.radius - b.radius);
  sorted.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,0.08)`;
    ctx.lineWidth = 3;
    ctx.stroke();

    const radial = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.radius);
    radial.addColorStop(0, "#ffffff");
    radial.addColorStop(1, p.color);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = radial;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius - 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function updateLegend() {
  const legend = document.getElementById("legend");
  const counts = particles.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(TYPES)
    .map(([key, meta]) => {
      const count = counts[key] || 0;
      return `<span><span class="swatch" style="background:${meta.color}"></span>${meta.label}</span><span class="badge">${count}</span>`;
    })
    .join("");
  legend.innerHTML = entries;
}

function frame(now) {
  const dt = clamp((now - lastTime) / 16, 0.2, 2); // Normalize delta for stable motion.
  lastTime = now;

  resizeCanvas();
  integrate(dt);
  handleInteractions();
  updateLegend();

  drawBackground();
  drawRipples(dt);
  drawParticles();

  requestAnimationFrame(frame);
}

function addRandomQuarks() {
  for (let i = 0; i < 8; i++) {
    const type = Math.random() > 0.5 ? "up" : "down";
    particles.push(
      createParticle(type, randRange(50, canvas.width - 50), randRange(50, canvas.height - 50), randRange(-1, 1), randRange(-1, 1))
    );
  }
  updateLegend();
}

window.addEventListener("resize", resizeCanvas);
document.getElementById("addQuarks").addEventListener("click", addRandomQuarks);
document.getElementById("reset").addEventListener("click", seedWorld);

resizeCanvas();
seedWorld();
requestAnimationFrame(frame);
