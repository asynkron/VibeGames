// Q*bert CRT - Pixel-locked CRT overlay, integer scaling, Pause/Help, persisted prefs

const bezel = document.querySelector('.bezel');
const canvas = document.getElementById('game');
const crt = document.getElementById('crt');
const ctx = canvas.getContext('2d');
const octx = crt.getContext('2d', { alpha: true });
ctx.imageSmoothingEnabled = false;
octx.imageSmoothingEnabled = false;
const W = canvas.width;  // 512
const H = canvas.height; // 384

// Palette and entities
const COLORS = {
  bg: '#000000',
  tileBase: '#1c2252',
  tileMid: '#27cda6',
  tileTarget: '#e0e057',
  qbert: '#ff9d2e',
  qbertShade: '#d57700',
  hazard: '#ff4050',
  coily: '#a060ff',
  crawler: '#ff7aff',
  recolor: '#3dfc7a',
  disk: '#a8f5e3',
  text: '#cfe7de'
};

const STATE = { Splash: 0, RoundIntro: 1, Playing: 2, RidingDisk: 3, LifeLost: 4, RoundWon: 5, GameOver: 6 };
let state = STATE.Splash;

// Pyramid config
const PYR_ROWS = 7;
const TILE_W = 28;
const TILE_H = 16; // top rhombus height
let FACE_H = 10;   // depth (can change)
let PYR_TOP_X = W / 2;
let PYR_TOP_Y = 26;

// Lighting presets (G cycles)
const LIGHT_PRESETS = [
  { topHighlight: 1.22, topShadow: 0.90, leftDark: 0.70, rightDark: 0.85 },
  { topHighlight: 1.35, topShadow: 0.80, leftDark: 0.60, rightDark: 0.78 },
  { topHighlight: 1.50, topShadow: 0.72, leftDark: 0.52, rightDark: 0.70 }
];
let LIGHT = { ...LIGHT_PRESETS[1] };
let lightIdx = 1;

// Depth presets (Z cycles)
const DEPTH_PRESETS = [ { faceH: 10, topY: 26 }, { faceH: 12, topY: 22 }, { faceH: 14, topY: 18 } ];
let depthIdx = 0;
function applyDepthPreset(i) { const p = DEPTH_PRESETS[i]; FACE_H = p.faceH; PYR_TOP_Y = p.topY; }
function applyLightingPreset(i) { LIGHT = { ...LIGHT_PRESETS[i] }; }

// Visual toggles and persisted prefs
let maskOn = true; let scanOn = true; let paused = false; let helpOn = false;
function savePrefs() {
  try {
    const prefs = { maskOn, scanOn, lightIdx, depthIdx };
    localStorage.setItem('qbert_crt_prefs', JSON.stringify(prefs));
  } catch {}
}
function loadPrefs() {
  try {
    const txt = localStorage.getItem('qbert_crt_prefs');
    if (!txt) return;
    const p = JSON.parse(txt);
    if (typeof p.maskOn === 'boolean') maskOn = p.maskOn;
    if (typeof p.scanOn === 'boolean') scanOn = p.scanOn;
    if (typeof p.lightIdx === 'number') { lightIdx = Math.max(0, Math.min(LIGHT_PRESETS.length-1, p.lightIdx)); applyLightingPreset(lightIdx); }
    if (typeof p.depthIdx === 'number') { depthIdx = Math.max(0, Math.min(DEPTH_PRESETS.length-1, p.depthIdx)); applyDepthPreset(depthIdx); }
  } catch {}
}
loadPrefs();

// Score/lives/round
let score = 0; let lives = 3; let round = 1; let nextLifeAt = 8000;
function levelConfig(r) { if (r <= 1) return { targetStage: 1, colors: [COLORS.tileBase, COLORS.tileTarget] }; return { targetStage: 2, colors: [COLORS.tileBase, COLORS.tileMid, COLORS.tileTarget] }; }
let cfg = levelConfig(round);

// Tiles
function makePyramid(rows) { const t = []; for (let r = 0; r < rows; r++) { const row = []; for (let c = 0; c <= r; c++) row.push({ stage: 0 }); t.push(row); } return t; }
let tiles = makePyramid(PYR_ROWS);

// Disks
function makeDisksForRound(rnd) { const rowsL = [2,4].filter(v=>v<PYR_ROWS); const rowsR = [3,5].filter(v=>v<PYR_ROWS); const ds=[]; for (const row of rowsL) ds.push({ side:'L', row, active:true }); for (const row of rowsR) ds.push({ side:'R', row, active:true }); return ds; }
let disks = makeDisksForRound(round);

// Player and enemies
const StartPos = { r: 0, c: 0 };
let q = { r: StartPos.r, c: StartPos.c, jumping: 0, alive: true, invuln: 0, riding: null };
let hazards = []; let hazardTimer = 0;
let coily = null; let coilyTimer = 3.5;
let crawlers = []; let crawlerTimer = 5.0;
let recolorers = []; let recolorTimer = 7.0;

// DOM HUD
function drawUI() { document.getElementById('lives').textContent = 'LIVES: ' + lives; document.getElementById('round').textContent = 'ROUND: ' + round; document.getElementById('score').textContent = 'SCORE: ' + fmtScore(score); }
const helpEl = document.getElementById('help');
function setHelp(visible) { helpOn = visible; if (helpEl) helpEl.classList.toggle('hidden', !visible); }

// Audio
const Audio = (() => { let ctx = null; function ensure() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; } function beep(freq, dur = 0.08, type = 'square', gain = 0.03) { const ac = ensure(); const t0 = ac.currentTime + 0.01; const osc = ac.createOscillator(); const g = ac.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, t0); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.linearRampToValueAtTime(0.0001, t0 + dur); osc.connect(g).connect(ac.destination); osc.start(t0); osc.stop(t0 + dur + 0.02); } return { beep }; })();
function safeBeep(f, d, t, g) { try { Audio.beep(f, d, t, g); } catch {} }

// Math helpers
function fmtScore(s) { return s.toString().padStart(6, '0'); }
function rcToXY(r, c) { const stepY = (TILE_H / 2) + FACE_H; const x = PYR_TOP_X + (c - (r - c)) * (TILE_W / 2); const y = PYR_TOP_Y + r * stepY; return { x, y }; }
function shade(hex, factor) { const m = /^#?([a-fA-F0-9]{6})$/.exec(hex); if (!m) return hex; const n = parseInt(m[1], 16); const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * factor))); const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * factor))); const b = Math.min(255, Math.max(0, Math.round((n & 255) * factor))); const to2 = (v)=>v.toString(16).padStart(2,'0'); return `#${to2(r)}${to2(g)}${to2(b)}`; }
function topColorForStage(stage) { const arr = cfg.colors; const idx = Math.min(stage, arr.length - 1); return arr[idx]; }

// Rendering
function drawCube(x, y, stage) {
  const w2 = TILE_W / 2, h2 = TILE_H / 2;
  const top = { x: x, y: y - h2 }, right = { x: x + w2, y }, bottom = { x: x, y: y + h2 }, left = { x: x - w2, y };
  const topBase = topColorForStage(stage);
  // Left face gradient
  const gl = ctx.createLinearGradient(left.x, left.y, left.x, left.y + FACE_H + (bottom.y - left.y));
  gl.addColorStop(0, shade(topBase, LIGHT.rightDark));
  gl.addColorStop(1, shade(topBase, LIGHT.leftDark));
  ctx.beginPath(); ctx.moveTo(left.x, left.y); ctx.lineTo(bottom.x, bottom.y); ctx.lineTo(bottom.x, bottom.y + FACE_H); ctx.lineTo(left.x, left.y + FACE_H); ctx.closePath(); ctx.fillStyle = gl; ctx.fill();
  // Right face gradient
  const gr = ctx.createLinearGradient(right.x, right.y, right.x, right.y + FACE_H + (bottom.y - right.y));
  gr.addColorStop(0, shade(topBase, 1.0));
  gr.addColorStop(1, shade(topBase, LIGHT.rightDark));
  ctx.beginPath(); ctx.moveTo(right.x, right.y); ctx.lineTo(bottom.x, bottom.y); ctx.lineTo(bottom.x, bottom.y + FACE_H); ctx.lineTo(right.x, right.y + FACE_H); ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
  // Top face gradient
  const gt = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
  gt.addColorStop(0, shade(topBase, LIGHT.topHighlight));
  gt.addColorStop(1, shade(topBase, LIGHT.topShadow));
  ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(right.x, right.y); ctx.lineTo(bottom.x, bottom.y); ctx.lineTo(left.x, left.y); ctx.closePath(); ctx.fillStyle = gt; ctx.fill();
}
function drawPyramid() { for (let r = 0; r < tiles.length; r++) { for (let c = 0; c < tiles[r].length; c++) { const p = rcToXY(r, c); drawCube(p.x, p.y, tiles[r][c].stage); } } }
function drawDisk(d) { if (!d.active) return; const anchorRC = d.side === 'L' ? { r: d.row, c: 0 } : { r: d.row, c: d.row }; const p = rcToXY(anchorRC.r, anchorRC.c); const ax = d.side === 'L' ? p.x - TILE_W/2 - 6 : p.x + TILE_W/2 + 6; const ay = p.y + 2; ctx.strokeStyle = '#4ad2bb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ay - 2); ctx.lineTo(ax, ay + 5); ctx.stroke(); ctx.fillStyle = COLORS.disk; ctx.beginPath(); ctx.ellipse(ax, ay, 6, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#6fead9'; ctx.beginPath(); ctx.ellipse(ax, ay, 6, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
function drawQbertAt(x, y) { ctx.fillStyle = COLORS.qbert; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = COLORS.qbertShade; ctx.beginPath(); ctx.arc(x + 2, y + 2, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = COLORS.qbert; ctx.beginPath(); ctx.ellipse(x + 6, y, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); }
function drawQbert() { const p = rcToXY(q.r, q.c); const jumpOffset = Math.sin(q.jumping * Math.PI) * 6; const x = p.x; const y = p.y - 6 - jumpOffset; if (q.invuln > 0 && Math.floor(perfNow * 20) % 2 === 0) { ctx.globalAlpha = 0.6; } drawQbertAt(x, y); if (q.invuln > 0) ctx.globalAlpha = 1; }
function drawCoily() { if (!coily) return; const p = rcToXY(coily.r, coily.c); if (coily.mode === 'ball') { ctx.fillStyle = COLORS.coily; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 4, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = COLORS.coily; ctx.beginPath(); ctx.arc(p.x, p.y - 5, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 2, p.y - 8, 1, 1); ctx.fillRect(p.x + 1, p.y - 8, 1, 1); } }
function drawCrawler(cr) { const p = rcToXY(cr.r, cr.c); const offX = cr.side === 'L' ? -TILE_W/3 : TILE_W/3; const offY = FACE_H / 2; ctx.fillStyle = COLORS.crawler; ctx.beginPath(); ctx.arc(p.x + offX, p.y + offY - 4, 4, 0, Math.PI * 2); ctx.fill(); }
function drawRecolorer(rc) { const p = rcToXY(rc.r, rc.c); ctx.fillStyle = COLORS.recolor; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 3, 0, Math.PI * 2); ctx.fill(); }

// Round helpers
function resetRound() { tiles = makePyramid(PYR_ROWS); cfg = levelConfig(round); disks = makeDisksForRound(round); q.r = StartPos.r; q.c = StartPos.c; q.jumping = 0; q.alive = true; q.invuln = 0; q.riding = null; hazards = []; hazardTimer = 1.0 + Math.random(); coily = null; coilyTimer = 3 + Math.random() * 2; crawlers = []; crawlerTimer = 4.5 + Math.random() * 2.5; recolorers = []; recolorTimer = 6.5 + Math.random() * 2.5; }
function allAtTarget() { for (let r = 0; r < tiles.length; r++) for (let c = 0; c < tiles[r].length; c++) if (tiles[r][c].stage < cfg.targetStage) return false; return true; }

// Disk riding
function startDiskRide(diskIndex) { const d = disks[diskIndex]; if (!d || !d.active) return false; const anchorRC = d.side === 'L' ? { r: d.row, c: 0 } : { r: d.row, c: d.row }; const p = rcToXY(anchorRC.r, anchorRC.c); const ax = d.side === 'L' ? p.x - TILE_W/2 - 6 : p.x + TILE_W/2 + 6; const ay = p.y + 2 - 6; const end = rcToXY(StartPos.r, StartPos.c); q.riding = { from: { x: ax, y: ay }, to: { x: end.x, y: end.y - 10 }, t: 0, duration: 1.2, diskIndex }; state = STATE.RidingDisk; q.invuln = 2.0; if (coily && coily.mode === 'snake') { coily = null; score += 500; safeBeep(800, 0.12, 'triangle', 0.03); } return true; }

// Input
const input = { ul: false, ur: false, dl: false, dr: false, start: false };
addEventListener('keydown', (e) => {
  switch (e.key) {
    // Movement
    case 'ArrowUp': case 'w': case 'W': case 'i': case 'I': input.ul = true; break;
    case 'ArrowRight': case 'd': case 'D': case 'l': case 'L': input.ur = true; break;
    case 'ArrowDown': case 's': case 'S': case 'k': case 'K': input.dr = true; break;
    case 'ArrowLeft': case 'a': case 'A': case 'j': case 'J': input.dl = true; break;
    case 'Enter': input.start = true; break;
    // Visual controls
    case 'f': case 'F': toggleFullscreen(); break;
    case 'm': case 'M': maskOn = !maskOn; renderCRTOverlay(); savePrefs(); break;
    case 'n': case 'N': scanOn = !scanOn; renderCRTOverlay(); savePrefs(); break;
    case 'g': case 'G': lightIdx = (lightIdx + 1) % LIGHT_PRESETS.length; applyLightingPreset(lightIdx); savePrefs(); break;
    case 'z': case 'Z': depthIdx = (depthIdx + 1) % DEPTH_PRESETS.length; applyDepthPreset(depthIdx); savePrefs(); break;
    case 'p': case 'P': paused = !paused; break;
    case 'h': case 'H': setHelp(!helpOn); break;
  }
});
addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowUp': case 'w': case 'W': case 'i': case 'I': input.ul = false; break;
    case 'ArrowRight': case 'd': case 'D': case 'l': case 'L': input.ur = false; break;
    case 'ArrowDown': case 's': case 'S': case 'k': case 'K': input.dr = false; break;
    case 'ArrowLeft': case 'a': case 'A': case 'j': case 'J': input.dl = false; break;
    case 'Enter': input.start = false; break;
  }
});

function toggleFullscreen() { const el = document.querySelector('.bezel'); const doc = document; if (!doc.fullscreenElement && el) { (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el); } else { (doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen)?.call(doc); } }

// Moves & collisions
function tryDiskFromEdge(r, c, dr, dc) { if (c === 0 && (c + dc) < 0) { const idx = disks.findIndex(d => d.active && d.side === 'L' && d.row === r); if (idx !== -1) return idx; } if (c === r && (c + dc) > r) { const idx = disks.findIndex(d => d.active && d.side === 'R' && d.row === r); if (idx !== -1) return idx; } return -1; }
function tryMoveQbert(dr, dc) { const nr = q.r + dr, nc = q.c + dc; if (nr < 0 || nc < 0 || nr >= PYR_ROWS || nc > nr) { const diskIdx = tryDiskFromEdge(q.r, q.c, dr, dc); if (diskIdx !== -1) { startDiskRide(diskIdx); return; } lives -= 1; q.alive = false; profanityPop(q.r, q.c); safeBeep(140, 0.22, 'sawtooth', 0.05); state = lives > 0 ? STATE.LifeLost : STATE.GameOver; return; } q.r = nr; q.c = nc; q.jumping = 0.0001; if (tiles[nr][nc].stage < cfg.targetStage) { tiles[nr][nc].stage += 1; score += 25; } safeBeep(660, 0.08, 'square', 0.03); }
function handleInput() { if (state === STATE.Playing && q.jumping === 0) { if (input.ul) { tryMoveQbert(-1, -1); return; } if (input.ur) { tryMoveQbert(-1, 0); return; } if (input.dr) { tryMoveQbert(1, 1); return; } if (input.dl) { tryMoveQbert(1, 0); return; } } }

// Profanity bubble
let bubble = null; function profanityPop(r, c) { const p = rcToXY(r, c); bubble = { x: p.x + 10, y: p.y - 16, t: 1.2 }; }
function drawBubble(dt) { if (!bubble) return; bubble.t -= dt; if (bubble.t <= 0) { bubble = null; return; } ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.strokeStyle = '#ffffff'; if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bubble.x - 18, bubble.y - 10, 40, 18, 3); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(bubble.x - 18, bubble.y - 10, 40, 18); ctx.strokeRect(bubble.x - 18, bubble.y - 10, 40, 18); } ctx.fillStyle = '#ffffff'; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('@!#?@!', bubble.x - 14, bubble.y); }

// Hazards & enemies
function spawnHazard() { hazards.push({ r: 0, c: 0, t: 0 }); }
function updateHazards(dt) { hazardTimer -= dt; if (hazardTimer <= 0) { spawnHazard(); hazardTimer = 2.2 + Math.random() * 2.0; } for (let i = hazards.length - 1; i >= 0; i--) { const h = hazards[i]; h.t += dt * 2.2; if (h.t >= 1) { h.t = 0; const choice = Math.random() < 0.5 ? 0 : 1; const nr = h.r + 1; const nc = h.c + choice; if (nr >= PYR_ROWS || nc > nr) { hazards.splice(i, 1); continue; } h.r = nr; h.c = nc; } if (state === STATE.Playing && q.invuln <= 0 && q.alive && h.r === q.r && h.c === q.c) { lives -= 1; q.alive = false; profanityPop(q.r, q.c); safeBeep(120, 0.22, 'sawtooth', 0.05); state = lives > 0 ? STATE.LifeLost : STATE.GameOver; } } }
function spawnCoily() { const startRight = Math.random() < 0.5; coily = { mode: 'ball', r: 0, c: 0, dir: startRight ? 1 : 0, t: 0 }; }
function updateCoily(dt) { if (!coily) { coilyTimer -= dt; if (coilyTimer <= 0) { spawnCoily(); coilyTimer = 7 + Math.random() * 4; } return; } coily.t += dt * 2.0; if (coily.mode === 'ball') { if (coily.t >= 1) { coily.t = 0; const nr = coily.r + 1; const nc = coily.c + (coily.dir === 1 ? 1 : 0); if (nr >= PYR_ROWS) { coily.mode = 'snake'; coily.r = PYR_ROWS - 1; coily.c = Math.min(coily.c, coily.r); } else { coily.r = nr; coily.c = nc; } } } else { if (coily.t >= 1) { coily.t = 0; const dr = q.r - coily.r; const dc = q.c - coily.c; let mr = 0, mc = 0; if (dr < 0) { if (dc < 0) { mr = -1; mc = -1; } else { mr = -1; mc = 0; } } else if (dr > 0) { if (dc > 0) { mr = 1; mc = 1; } else { mr = 1; mc = 0; } } else { if (dc < 0) { mr = -1; mc = -1; } else if (dc > 0) { mr = -1; mc = 0; } } const nr = coily.r + mr; const nc = coily.c + mc; if (nr < 0 || nc < 0 || nr >= PYR_ROWS || nc > nr) { coily = null; score += 500; safeBeep(820, 0.11, 'triangle', 0.03); } else { coily.r = nr; coily.c = nc; } } } if (coily && state === STATE.Playing && q.invuln <= 0 && q.alive && coily.r === q.r && coily.c === q.c) { lives -= 1; q.alive = false; profanityPop(q.r, q.c); safeBeep(100, 0.25, 'sawtooth', 0.05); state = lives > 0 ? STATE.LifeLost : STATE.GameOver; } }
function spawnCrawler() { const side = Math.random() < 0.5 ? 'L' : 'R'; crawlers.push({ side, r: 1, c: side === 'L' ? 0 : 1, t: 0 }); }
function updateCrawlers(dt) { crawlerTimer -= dt; if (crawlerTimer <= 0) { spawnCrawler(); crawlerTimer = 5 + Math.random() * 3; } for (let i = crawlers.length - 1; i >= 0; i--) { const cr = crawlers[i]; cr.t += dt * 1.6; if (cr.t >= 1) { cr.t = 0; let nr = cr.r + 1; let nc = cr.c + (cr.side === 'L' ? 0 : 1); if (nr >= PYR_ROWS || nc > nr) { crawlers.splice(i, 1); continue; } cr.r = nr; cr.c = nc; } if (state === STATE.Playing && q.invuln <= 0 && q.alive && cr.r === q.r && cr.c === q.c) { lives -= 1; q.alive = false; profanityPop(q.r, q.c); safeBeep(110, 0.22, 'sawtooth', 0.05); state = lives > 0 ? STATE.LifeLost : STATE.GameOver; } } }
function spawnRecolorer() { recolorers.push({ r: 0, c: 0, t: 0 }); }
function updateRecolorers(dt) { recolorTimer -= dt; if (recolorTimer <= 0) { spawnRecolorer(); recolorTimer = 7 + Math.random() * 3; } for (let i = recolorers.length - 1; i >= 0; i--) { const rc = recolorers[i]; rc.t += dt * 1.8; if (rc.t >= 1) { rc.t = 0; const choice = Math.random() < 0.5 ? 0 : 1; const nr = rc.r + 1; const nc = rc.c + choice; if (nr >= PYR_ROWS || nc > nr) { recolorers.splice(i, 1); continue; } rc.r = nr; rc.c = nc; const tile = tiles[nr][nc]; if (tile.stage > 0) tile.stage -= 1; } if (state === STATE.Playing && q.alive && rc.r === q.r && rc.c === q.c) { score += 300; safeBeep(720, 0.09, 'square', 0.03); recolorers.splice(i, 1); } } }

// Background & overlay
function drawBackground() { ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H); }
function clearOverlay() { octx.clearRect(0, 0, W, H); }
function renderCRTOverlay() {
  clearOverlay();
  // Scanlines: every other row darkens
  if (scanOn) {
    octx.globalAlpha = 0.22; octx.fillStyle = '#000000';
    for (let y = 1; y < H; y += 2) octx.fillRect(0, y, W, 1);
    octx.globalAlpha = 1;
  }
  // Aperture mask: subtle RGB stripes
  if (maskOn) {
    octx.globalAlpha = 0.10;
    for (let x = 0; x < W; x += 3) {
      octx.fillStyle = 'rgba(255,0,0,1)'; octx.fillRect(x, 0, 1, H);
      if (x + 1 < W) { octx.fillStyle = 'rgba(0,255,0,1)'; octx.fillRect(x + 1, 0, 1, H); }
      if (x + 2 < W) { octx.fillStyle = 'rgba(0,0,255,1)'; octx.fillRect(x + 2, 0, 1, H); }
    }
    octx.globalAlpha = 1;
  }
}

// Pixel-perfect integer scaling and overlay alignment
function applyPixelScale() {
  const vw = window.innerWidth * 0.95;
  const vh = window.innerHeight * 0.95;
  const maxW = Math.min(vw, vh * 4 / 3);
  const scale = Math.max(1, Math.floor(maxW / W));
  const cssW = W * scale;
  const cssH = H * scale;
  // Apply size to both canvases
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  crt.style.width = cssW + 'px';
  crt.style.height = cssH + 'px';
  // Align overlay to game canvas position inside bezel
  const left = canvas.offsetLeft;
  const top = canvas.offsetTop;
  crt.style.left = left + 'px';
  crt.style.top = top + 'px';
}
window.addEventListener('resize', () => { applyPixelScale(); });
applyPixelScale();
renderCRTOverlay();

// Round/score helpers
function drawCenteredText(text, y) { ctx.fillStyle = COLORS.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '12px "Press Start 2P", monospace'; ctx.fillText(text, W/2, y); }
function grantExtraLifeIfNeeded() { if (score >= nextLifeAt) { lives += 1; nextLifeAt += 8000; safeBeep(1000, 0.12, 'triangle', 0.03); } }

// Main loop
let perfNow = 0, last = 0, roundIntroT = 0;
function loop(ts) {
  perfNow = ts / 1000; if (!last) last = perfNow; const dt = Math.min(0.05, perfNow - last); last = perfNow;
  drawBackground();

  switch (state) {
    case STATE.Splash:
      drawPyramid(); disks.forEach(drawDisk);
      drawCenteredText('Q*BERT', 140); drawCenteredText('PRESS ENTER', 172);
      if (input.start) { score = 0; lives = 3; round = 1; nextLifeAt = 8000; cfg = levelConfig(round); resetRound(); roundIntroT = 1.1; state = STATE.RoundIntro; safeBeep(420, 0.12, 'square', 0.03); }
      break;
    case STATE.RoundIntro:
      drawPyramid(); disks.forEach(drawDisk);
      drawCenteredText('ROUND ' + round, 160);
      roundIntroT -= dt; if (roundIntroT <= 0) state = STATE.Playing;
      break;
    case STATE.Playing:
      if (!paused) {
        handleInput();
        if (q.jumping > 0) { q.jumping += dt * 4.2; if (q.jumping >= 1) q.jumping = 0; }
        if (q.invuln > 0) q.invuln = Math.max(0, q.invuln - dt);
        updateHazards(dt); updateCoily(dt); updateCrawlers(dt); updateRecolorers(dt);
      }
      drawPyramid(); disks.forEach(drawDisk);
      hazards.forEach(h => { const p = rcToXY(h.r, h.c); ctx.fillStyle = COLORS.hazard; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 4, 0, Math.PI * 2); ctx.fill(); });
      drawCoily(); crawlers.forEach(drawCrawler); recolorers.forEach(drawRecolorer); drawQbert();
      if (!paused && allAtTarget()) { score += 500; round += 1; cfg = levelConfig(round); state = STATE.RoundWon; safeBeep(900, 0.15, 'triangle', 0.03); }
      if (!paused) grantExtraLifeIfNeeded();
      if (paused) { drawCenteredText('PAUSED', 40); }
      break;
    case STATE.RidingDisk: {
      const r = q.riding; if (!paused) r.t += dt; const t = Math.min(1, r.t / r.duration); const x = r.from.x + (r.to.x - r.from.x) * t; const y = r.from.y + (r.to.y - r.from.y) * t; drawPyramid(); disks.forEach(drawDisk); drawCoily(); crawlers.forEach(drawCrawler); recolorers.forEach(drawRecolorer); drawQbertAt(x, y); if (!paused && t >= 1) { q.r = StartPos.r; q.c = StartPos.c; q.riding = null; q.invuln = 1.2; const d = disks[r.diskIndex]; if (d) d.active = false; score += 250; state = STATE.Playing; } if (!paused) grantExtraLifeIfNeeded(); if (paused) drawCenteredText('PAUSED', 40); break; }
    case STATE.LifeLost:
      drawPyramid(); disks.forEach(drawDisk); hazards.forEach(h => { const p = rcToXY(h.r, h.c); ctx.fillStyle = COLORS.hazard; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 4, 0, Math.PI * 2); ctx.fill(); }); drawCoily(); crawlers.forEach(drawCrawler); recolorers.forEach(drawRecolorer);
      drawCenteredText('OOPS!', 144); drawCenteredText('PRESS ENTER', 176);
      drawBubble(dt);
      if (input.start) { q.alive = true; q.invuln = 1.5; q.r = StartPos.r; q.c = StartPos.c; q.jumping = 0; state = STATE.Playing; }
      break;
    case STATE.RoundWon:
      drawPyramid(); disks.forEach(drawDisk);
      drawCenteredText('ROUND CLEAR!', 144); drawCenteredText('PRESS ENTER', 176);
      if (input.start) { resetRound(); roundIntroT = 1.0; state = STATE.RoundIntro; }
      break;
    case STATE.GameOver:
      drawPyramid(); disks.forEach(drawDisk);
      drawCenteredText('GAME OVER', 144); drawCenteredText('PRESS ENTER', 176);
      if (input.start) { score = 0; lives = 3; round = 1; nextLifeAt = 8000; cfg = levelConfig(round); resetRound(); roundIntroT = 1.1; state = STATE.RoundIntro; }
      break;
  }

  drawUI();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
