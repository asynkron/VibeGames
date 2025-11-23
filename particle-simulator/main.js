const canvas = document.getElementById('universe');
const ctx = canvas.getContext('2d');

const TYPE_CONFIG = {
  up: { label: 'Quark (up)', color: '#4dc3ff', radius: 13 },
  down: { label: 'Quark (down)', color: '#ff6fa8', radius: 13 },
  proton: { label: 'Proton', color: '#ffd166', radius: 18 },
  neutron: { label: 'Neutron', color: '#7cf3a0', radius: 18 },
  hydrogen: { label: 'Hydrogen', color: '#7f8cff', radius: 20 },
  helium: { label: 'Helium', color: '#f65d7a', radius: 24 },
  lithium: { label: 'Lithium', color: '#86f7ff', radius: 26 },
  beryllium: { label: 'Beryllium', color: '#c6ff7f', radius: 28 },
  boron: { label: 'Boron', color: '#ffa5e6', radius: 30 },
  carbon: { label: 'Carbon', color: '#90b1ff', radius: 32 },
  nitrogen: { label: 'Nitrogen', color: '#9fffe0', radius: 34 },
  oxygen: { label: 'Oxygen', color: '#ffcf8f', radius: 36 },
  fluorine: { label: 'Fluorine', color: '#f5a3ff', radius: 38 },
  neon: { label: 'Neon', color: '#8fffff', radius: 40 },
};

const particles = [];
const flashes = [];
let idCounter = 0;
let width = 0;
let height = 0;

const hudCounts = document.getElementById('counts');
const legend = document.getElementById('legend');

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  // Keep drawing math in CSS pixels while staying crisp on HiDPI.
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawn(type, position, withFlash = false) {
  const cfg = TYPE_CONFIG[type];
  const x = position?.x ?? rand(cfg.radius, width - cfg.radius);
  const y = position?.y ?? rand(cfg.radius, height - cfg.radius);
  const angle = Math.random() * Math.PI * 2;
  const speed = rand(0.2, 1.8);
  particles.push({
    id: idCounter++,
    type,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: cfg.radius,
    senseRadius: cfg.radius * 3,
    swapAt: type === 'proton' || type === 'neutron' ? performance.now() + 10000 : null,
  });

  if (withFlash) flashes.push({ x, y, color: cfg.color, born: performance.now(), duration: 420 });
}

function seedUniverse() {
  particles.length = 0;
  for (let i = 0; i < 26; i += 1) {
    spawn(i % 3 === 0 ? 'up' : 'down');
  }
  for (let i = 0; i < 8; i += 1) {
    spawn(Math.random() > 0.5 ? 'proton' : 'neutron');
  }
}

function limitSpeed(p, max = 2.2) {
  const speedSq = p.vx * p.vx + p.vy * p.vy;
  if (speedSq > max * max) {
    const scale = max / Math.sqrt(speedSq);
    p.vx *= scale;
    p.vy *= scale;
  }
}

function updateMotion() {
  for (const p of particles) {
    p.vx += rand(-0.3, 0.3);
    p.vy += rand(-0.3, 0.3);
    limitSpeed(p);
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < p.radius || p.x > width - p.radius) {
      p.vx *= -0.9;
      p.x = Math.min(Math.max(p.radius, p.x), width - p.radius);
    }
    if (p.y < p.radius || p.y > height - p.radius) {
      p.vy *= -0.9;
      p.y = Math.min(Math.max(p.radius, p.y), height - p.radius);
    }
  }
}

function overlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const range = a.senseRadius + b.senseRadius;
  return dx * dx + dy * dy <= range * range;
}

function buildClusters(allowedTypes) {
  const allowed = new Set(allowedTypes);
  const indices = particles
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => allowed.has(p.type));

  const visited = new Set();
  const clusters = [];

  for (const { i } of indices) {
    if (visited.has(i)) continue;
    const cluster = [];
    const stack = [i];
    visited.add(i);

    while (stack.length) {
      const idx = stack.pop();
      const part = particles[idx];
      cluster.push(idx);

      for (const { i: otherIdx, p: other } of indices) {
        if (visited.has(otherIdx)) continue;
        if (overlap(part, other)) {
          visited.add(otherIdx);
          stack.push(otherIdx);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

function consumeParticles(indices) {
  const ids = new Set(indices.map((i) => particles[i].id));
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (ids.has(particles[i].id)) {
      particles.splice(i, 1);
    }
  }
}

function centroid(parts) {
  const sum = parts.reduce(
    (acc, idx) => {
      const p = particles[idx];
      acc.x += p.x;
      acc.y += p.y;
      return acc;
    },
    { x: 0, y: 0 },
  );
  return { x: sum.x / parts.length, y: sum.y / parts.length };
}

function bestQuarkCombos(ups, downs) {
  let best = { neutrons: 0, protons: 0, combos: 0 };
  const maxNeutrons = Math.min(ups, Math.floor(downs / 2));
  for (let n = 0; n <= maxNeutrons; n += 1) {
    const remainingUps = ups - n;
    const remainingDowns = downs - n * 2;
    const maxProtons = Math.min(Math.floor(remainingUps / 2), remainingDowns);
    for (let p = 0; p <= maxProtons; p += 1) {
      const combos = n + p;
      if (combos > best.combos) {
        best = { neutrons: n, protons: p, combos };
      }
    }
  }
  return best;
}

function quarkFusion() {
  // Overlapping quarks combine into neutrons or protons depending on counts.
  const clusters = buildClusters(['up', 'down']);
  for (const cluster of clusters) {
    if (cluster.length < 3) continue;
    const ups = cluster.filter((idx) => particles[idx].type === 'up');
    const downs = cluster.filter((idx) => particles[idx].type === 'down');
    const recipe = bestQuarkCombos(ups.length, downs.length);
    if (!recipe.combos) continue;

    const consumed = [];
    for (let i = 0; i < recipe.neutrons; i += 1) {
      consumed.push(ups.shift(), downs.shift(), downs.shift());
      const center = centroid(consumed.slice(-3));
      spawn('neutron', center, true);
    }
    for (let i = 0; i < recipe.protons; i += 1) {
      consumed.push(ups.shift(), ups.shift(), downs.shift());
      const center = centroid(consumed.slice(-3));
      spawn('proton', center, true);
    }
    consumeParticles(consumed);
  }
}

function nucleonFusion() {
  // One proton plus one neutron makes a hydrogen atom.
  const clusters = buildClusters(['proton', 'neutron']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const protons = cluster.filter((idx) => particles[idx].type === 'proton');
    const neutrons = cluster.filter((idx) => particles[idx].type === 'neutron');
    const pairs = Math.min(protons.length, neutrons.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [protons.shift(), neutrons.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('hydrogen', center, true);
    }
    consumeParticles(consumed);
  }
}

function hydrogenFusion() {
  // Two hydrogens fuse into helium and kick nearby particles away.
  const clusters = buildClusters(['hydrogen']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const pairs = Math.floor(cluster.length / 2);
    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [cluster[i * 2], cluster[i * 2 + 1]];
      consumed.push(...used);
      const center = centroid(used);
      spawn('helium', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function heliumHydrogenFusion() {
  // One helium plus one hydrogen forms lithium with a shock wave.
  const clusters = buildClusters(['helium', 'hydrogen']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const heliums = cluster.filter((idx) => particles[idx].type === 'helium');
    const hydrogens = cluster.filter((idx) => particles[idx].type === 'hydrogen');
    const pairs = Math.min(heliums.length, hydrogens.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [heliums.shift(), hydrogens.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('lithium', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function lithiumHeliumFusion() {
  // One lithium plus one helium forms boron and releases a shock wave.
  const clusters = buildClusters(['lithium', 'helium']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const lithiums = cluster.filter((idx) => particles[idx].type === 'lithium');
    const heliums = cluster.filter((idx) => particles[idx].type === 'helium');
    const pairs = Math.min(lithiums.length, heliums.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [lithiums.shift(), heliums.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('boron', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function lithiumHydrogenFusion() {
  // One lithium plus one hydrogen fuses into beryllium with a shock wave.
  const clusters = buildClusters(['lithium', 'hydrogen']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const lithiums = cluster.filter((idx) => particles[idx].type === 'lithium');
    const hydrogens = cluster.filter((idx) => particles[idx].type === 'hydrogen');
    const pairs = Math.min(lithiums.length, hydrogens.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [lithiums.shift(), hydrogens.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('beryllium', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function berylliumHydrogenFusion() {
  // One beryllium plus one hydrogen makes boron and radiates energy.
  const clusters = buildClusters(['beryllium', 'hydrogen']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const berylliums = cluster.filter((idx) => particles[idx].type === 'beryllium');
    const hydrogens = cluster.filter((idx) => particles[idx].type === 'hydrogen');
    const pairs = Math.min(berylliums.length, hydrogens.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [berylliums.shift(), hydrogens.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('boron', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function berylliumHeliumFusion() {
  // One beryllium plus one helium builds carbon and emits a shock wave.
  const clusters = buildClusters(['beryllium', 'helium']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const berylliums = cluster.filter((idx) => particles[idx].type === 'beryllium');
    const heliums = cluster.filter((idx) => particles[idx].type === 'helium');
    const pairs = Math.min(berylliums.length, heliums.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [berylliums.shift(), heliums.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('carbon', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function boronHydrogenFusion() {
  // One boron plus one hydrogen climbs to carbon with a shock wave.
  const clusters = buildClusters(['boron', 'hydrogen']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const borons = cluster.filter((idx) => particles[idx].type === 'boron');
    const hydrogens = cluster.filter((idx) => particles[idx].type === 'hydrogen');
    const pairs = Math.min(borons.length, hydrogens.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [borons.shift(), hydrogens.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('carbon', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function boronHeliumFusion() {
  // One boron plus one helium fuses into nitrogen and kicks matter away.
  const clusters = buildClusters(['boron', 'helium']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const borons = cluster.filter((idx) => particles[idx].type === 'boron');
    const heliums = cluster.filter((idx) => particles[idx].type === 'helium');
    const pairs = Math.min(borons.length, heliums.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [borons.shift(), heliums.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('nitrogen', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function carbonHydrogenFusion() {
  // One carbon plus one hydrogen yields nitrogen and a ripple.
  const clusters = buildClusters(['carbon', 'hydrogen']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const carbons = cluster.filter((idx) => particles[idx].type === 'carbon');
    const hydrogens = cluster.filter((idx) => particles[idx].type === 'hydrogen');
    const pairs = Math.min(carbons.length, hydrogens.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [carbons.shift(), hydrogens.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('nitrogen', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function carbonHeliumFusion() {
  // One carbon plus one helium produces oxygen and blasts nearby particles.
  const clusters = buildClusters(['carbon', 'helium']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const carbons = cluster.filter((idx) => particles[idx].type === 'carbon');
    const heliums = cluster.filter((idx) => particles[idx].type === 'helium');
    const pairs = Math.min(carbons.length, heliums.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [carbons.shift(), heliums.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('oxygen', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function nitrogenHydrogenFusion() {
  // One nitrogen plus one hydrogen steps to oxygen with a shock wave.
  const clusters = buildClusters(['nitrogen', 'hydrogen']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const nitrogens = cluster.filter((idx) => particles[idx].type === 'nitrogen');
    const hydrogens = cluster.filter((idx) => particles[idx].type === 'hydrogen');
    const pairs = Math.min(nitrogens.length, hydrogens.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [nitrogens.shift(), hydrogens.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('oxygen', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function nitrogenHeliumFusion() {
  // One nitrogen plus one helium creates fluorine and radiates outward.
  const clusters = buildClusters(['nitrogen', 'helium']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const nitrogens = cluster.filter((idx) => particles[idx].type === 'nitrogen');
    const heliums = cluster.filter((idx) => particles[idx].type === 'helium');
    const pairs = Math.min(nitrogens.length, heliums.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [nitrogens.shift(), heliums.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('fluorine', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function oxygenHydrogenFusion() {
  // One oxygen plus one hydrogen yields fluorine alongside a blast wave.
  const clusters = buildClusters(['oxygen', 'hydrogen']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const oxygens = cluster.filter((idx) => particles[idx].type === 'oxygen');
    const hydrogens = cluster.filter((idx) => particles[idx].type === 'hydrogen');
    const pairs = Math.min(oxygens.length, hydrogens.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [oxygens.shift(), hydrogens.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('fluorine', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function oxygenHeliumFusion() {
  // One oxygen plus one helium forms neon and jolts the surroundings.
  const clusters = buildClusters(['oxygen', 'helium']);
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const oxygens = cluster.filter((idx) => particles[idx].type === 'oxygen');
    const heliums = cluster.filter((idx) => particles[idx].type === 'helium');
    const pairs = Math.min(oxygens.length, heliums.length);
    if (!pairs) continue;

    const consumed = [];
    for (let i = 0; i < pairs; i += 1) {
      const used = [oxygens.shift(), heliums.shift()];
      consumed.push(...used);
      const center = centroid(used);
      spawn('neon', center, true);
      ripple(center);
    }
    consumeParticles(consumed);
  }
}

function ripple(origin) {
  const waveRadius = 240;
  const wavePower = 5.5;
  for (const p of particles) {
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    if (dist > waveRadius) continue;
    const strength = (1 - dist / waveRadius) * wavePower;
    p.vx += (dx / dist) * strength;
    p.vy += (dy / dist) * strength;
  }
}

function swapNucleon(p, targetType) {
  const cfg = TYPE_CONFIG[targetType];
  p.type = targetType;
  p.radius = cfg.radius;
  p.senseRadius = cfg.radius * 3;
  p.swapAt = performance.now() + 10000;
  flashes.push({ x: p.x, y: p.y, color: cfg.color, born: performance.now(), duration: 320 });
}

function updateNucleonOscillation() {
  const now = performance.now();
  for (const p of particles) {
    if ((p.type === 'proton' || p.type === 'neutron') && p.swapAt && now >= p.swapAt) {
      swapNucleon(p, p.type === 'proton' ? 'neutron' : 'proton');
    }
  }
}

function runReactions() {
  quarkFusion();
  nucleonFusion();
  hydrogenFusion();
  heliumHydrogenFusion();
  lithiumHydrogenFusion();
  lithiumHeliumFusion();
  berylliumHydrogenFusion();
  berylliumHeliumFusion();
  boronHydrogenFusion();
  boronHeliumFusion();
  carbonHydrogenFusion();
  carbonHeliumFusion();
  nitrogenHydrogenFusion();
  nitrogenHeliumFusion();
  oxygenHydrogenFusion();
  oxygenHeliumFusion();
}

function updateFlashes() {
  const now = performance.now();
  for (let i = flashes.length - 1; i >= 0; i -= 1) {
    if (now - flashes[i].born > flashes[i].duration) {
      flashes.splice(i, 1);
    }
  }
}

function drawParticle(p) {
  const cfg = TYPE_CONFIG[p.type];
  const gradient = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.radius);
  gradient.addColorStop(0, `${cfg.color}ee`);
  gradient.addColorStop(1, `${cfg.color}22`);

  ctx.beginPath();
  ctx.arc(p.x, p.y, p.senseRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `${cfg.color}22`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = `${cfg.color}55`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 12px "Space Grotesk", system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cfg.label.split(' ')[0], p.x, p.y);
}

function drawBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0b1324');
  gradient.addColorStop(1, '#0d1a33');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff0f';
  for (let i = 0; i < 40; i += 1) {
    const x = ((Date.now() * 0.015 + i * 200) % (width + 120)) - 60;
    const y = (i * 97) % height;
    ctx.fillRect(x, y, 40, 1);
  }
}

function render() {
  ctx.save();
  drawBackdrop();
  drawFlashes();
  for (const p of particles) {
    drawParticle(p);
  }
  ctx.restore();
}

function drawFlashes() {
  const now = performance.now();
  for (const flash of flashes) {
    const progress = Math.min(1, (now - flash.born) / flash.duration);
    const radius = 30 + progress * 90;
    const alpha = 1 - progress;
    const gradient = ctx.createRadialGradient(flash.x, flash.y, 4, flash.x, flash.y, radius);
    gradient.addColorStop(0, `${flash.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${flash.color}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateHud() {
  const entries = Object.entries(TYPE_CONFIG);
  const counts = particles.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {});

  hudCounts.innerHTML = entries
    .map(([key, cfg]) => {
      const count = counts[key] || 0;
      return `<div class="counter"><span class="swatch" style="color:${cfg.color};"></span>${cfg.label}: <strong>${count}</strong></div>`;
    })
    .join('');
}

function renderLegend() {
  const rules = [
    { from: '1 up + 2 down', to: 'Neutron' },
    { from: '2 up + 1 down', to: 'Proton' },
    { from: '1 proton + 1 neutron', to: 'Hydrogen' },
    { from: '2 hydrogen', to: 'Helium + shock wave' },
    { from: '1 helium + 1 hydrogen', to: 'Lithium + shock wave' },
    { from: '1 lithium + 1 hydrogen', to: 'Beryllium + shock wave' },
    { from: '1 lithium + 1 helium', to: 'Boron + shock wave' },
    { from: '1 beryllium + 1 hydrogen', to: 'Boron + shock wave' },
    { from: '1 beryllium + 1 helium', to: 'Carbon + shock wave' },
    { from: '1 boron + 1 hydrogen', to: 'Carbon + shock wave' },
    { from: '1 boron + 1 helium', to: 'Nitrogen + shock wave' },
    { from: '1 carbon + 1 hydrogen', to: 'Nitrogen + shock wave' },
    { from: '1 carbon + 1 helium', to: 'Oxygen + shock wave' },
    { from: '1 nitrogen + 1 hydrogen', to: 'Oxygen + shock wave' },
    { from: '1 nitrogen + 1 helium', to: 'Fluorine + shock wave' },
    { from: '1 oxygen + 1 hydrogen', to: 'Fluorine + shock wave' },
    { from: '1 oxygen + 1 helium', to: 'Neon + shock wave' },
  ];
  legend.innerHTML = rules
    .map(
      (r) => `
        <div class="rule">
          <span class="badge" style="background:${TYPE_CONFIG.helium.color}33;color:${TYPE_CONFIG.helium.color};">Rule</span>
          ${r.from} → <strong>${r.to}</strong>
        </div>`,
    )
    .join('');
}

function tick() {
  updateMotion();
  runReactions();
  updateNucleonOscillation();
  updateFlashes();
  render();
  updateHud();
  requestAnimationFrame(tick);
}

function burstQuarks(x, y) {
  const center = { x, y };
  for (let i = 0; i < 10; i += 1) {
    spawn(i % 3 === 0 ? 'up' : 'down', center);
  }
}

canvas.addEventListener('click', (event) => {
  burstQuarks(event.clientX, event.clientY);
});

document.getElementById('quarkBurst').addEventListener('click', () => {
  burstQuarks(width * 0.5, height * 0.5);
});

document.getElementById('atomPair').addEventListener('click', () => {
  spawn('hydrogen', { x: width * 0.4, y: height * 0.5 });
  spawn('hydrogen', { x: width * 0.6, y: height * 0.5 });
});

document.getElementById('reset').addEventListener('click', seedUniverse);

renderLegend();
seedUniverse();
requestAnimationFrame(tick);
