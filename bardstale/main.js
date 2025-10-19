// Bard's Tale–style 3D with procedural dungeon and minimap fix.
// Serve over HTTP (e.g., npx http-server .)

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const DIR = { N: 0, E: 1, S: 2, W: 3 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const WALL = { OPEN: 0, WALL: 1, DOOR: 2 };

function leftOf(dir) { return (dir + 3) % 4; }
function rightOf(dir) { return (dir + 1) % 4; }
function backOf(dir) { return (dir + 2) % 4; }
function opposite(dir) { return (dir + 2) % 4; }
function inBounds(x, y, w, h) { return x >= 0 && x < w && y >= 0 && y < h; }

function createCell() {
  return { n: WALL.WALL, e: WALL.WALL, s: WALL.WALL, w: WALL.WALL, visited: false };
}

function setWall(cells, w, h, x, y, dir, type) {
  if (!inBounds(x, y, w, h)) return;
  const c = cells[y][x];
  if (dir === DIR.N) c.n = type;
  if (dir === DIR.E) c.e = type;
  if (dir === DIR.S) c.s = type;
  if (dir === DIR.W) c.w = type;
  const nx = x + DX[dir];
  const ny = y + DY[dir];
  if (inBounds(nx, ny, w, h)) {
    const n = cells[ny][nx];
    const od = opposite(dir);
    if (od === DIR.N) n.n = type;
    if (od === DIR.E) n.e = type;
    if (od === DIR.S) n.s = type;
    if (od === DIR.W) n.w = type;
  }
}

function getWall(cells, w, h, x, y, dir) {
  if (!inBounds(x, y, w, h)) return WALL.WALL;
  const c = cells[y][x];
  if (dir === DIR.N) return c.n;
  if (dir === DIR.E) return c.e;
  if (dir === DIR.S) return c.s;
  if (dir === DIR.W) return c.w;
  return WALL.WALL;
}

// PRNG (mulberry32) and seed helpers
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFromSeed(seedStr) {
  const s = seedStr ? hashString(seedStr) : Math.floor(Math.random() * 2**32);
  const r = mulberry32(s);
  return {
    seed: s,
    next() { return r(); },
    int(min, max) { return Math.floor(r() * (max - min + 1)) + min; },
    choice(arr) { return arr[Math.floor(r() * arr.length)]; }
  };
}

function shuffleInPlace(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildDungeon(opts) {
  const width = Math.max(8, Math.min(128, opts.width || 48));
  const height = Math.max(8, Math.min(128, opts.height || 32));
  const rnd = rngFromSeed(opts.seed || 'bt3');

  const cells = Array.from({ length: height }, () => Array.from({ length: width }, createCell));

  // Ensure outer ring is closed (already walls), interior will be carved.
  const visited = Array.from({ length: height }, () => Array.from({ length: width }, () => false));

  // Pick a random interior start
  const sx = rnd.int(1, width - 2);
  const sy = rnd.int(1, height - 2);

  // DFS carve maze
  const stack = [{ x: sx, y: sy }];
  visited[sy][sx] = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const dirs = [DIR.N, DIR.E, DIR.S, DIR.W];
    shuffleInPlace(dirs, rnd);
    let carved = false;
    for (const d of dirs) {
      const nx = cur.x + DX[d];
      const ny = cur.y + DY[d];
      if (!inBounds(nx, ny, width, height)) continue;
      if (nx === 0 || ny === 0 || nx === width - 1 || ny === height - 1) continue; // keep perimeter strong
      if (!visited[ny][nx]) {
        setWall(cells, width, height, cur.x, cur.y, d, WALL.OPEN);
        visited[ny][nx] = true;
        stack.push({ x: nx, y: ny });
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }

  // Add rooms
  const roomCount = Math.min(14, Math.max(4, Math.floor((width * height) / 200)));
  for (let r = 0; r < roomCount; r++) {
    const rw = rnd.int(3, 8);
    const rh = rnd.int(3, 7);
    const rx = rnd.int(1, Math.max(1, width - rw - 2));
    const ry = rnd.int(1, Math.max(1, height - rh - 2));

    // Clear interior walls within the room to OPEN
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        // Open links inside the room horizontally/vertically
        if (x < rx + rw - 1) setWall(cells, width, height, x, y, DIR.E, WALL.OPEN);
        if (y < ry + rh - 1) setWall(cells, width, height, x, y, DIR.S, WALL.OPEN);
        visited[y][x] = true; // mark as carved
      }
    }

    // Carve 1–3 room doors on random sides
    const doorSpots = [];
    for (let x = rx; x < rx + rw; x++) { doorSpots.push({ x, y: ry, d: DIR.N }); doorSpots.push({ x, y: ry + rh - 1, d: DIR.S }); }
    for (let y = ry; y < ry + rh; y++) { doorSpots.push({ x: rx, y, d: DIR.W }); doorSpots.push({ x: rx + rw - 1, y, d: DIR.E }); }
    shuffleInPlace(doorSpots, rnd);
    const doorsToPlace = rnd.int(1, 3);
    for (let i = 0; i < doorsToPlace && i < doorSpots.length; i++) {
      const s = doorSpots[i];
      if (!inBounds(s.x, s.y, width, height)) continue;
      // Place a door if the boundary currently has a wall
      const t = getWall(cells, width, height, s.x, s.y, s.d);
      if (t !== WALL.WALL) continue;
      setWall(cells, width, height, s.x, s.y, s.d, WALL.DOOR);
    }
  }

  // Sprinkle a few doors in corridors
  const doorBudget = Math.floor((width * height) / 120);
  for (let i = 0; i < doorBudget; i++) {
    const x = rnd.int(1, width - 2);
    const y = rnd.int(1, height - 2);
    const d = rnd.choice([DIR.N, DIR.E, DIR.S, DIR.W]);
    if (getWall(cells, width, height, x, y, d) === WALL.OPEN) {
      setWall(cells, width, height, x, y, d, WALL.DOOR);
    }
  }

  // Choose start near center with at least one open neighbor
  function hasOpenNeighbor(x, y) {
    for (const d of [DIR.N, DIR.E, DIR.S, DIR.W]) {
      if (getWall(cells, width, height, x, y, d) !== WALL.WALL) return true;
    }
    return false;
  }
  let cx = Math.floor(width / 2), cy = Math.floor(height / 2);
  let start = { x: cx, y: cy, dir: DIR.N };
  let found = false;
  const maxR = Math.max(width, height);
  for (let r = 0; r <= maxR && !found; r++) {
    for (let y = Math.max(1, cy - r); y <= Math.min(height - 2, cy + r) && !found; y++) {
      for (let x = Math.max(1, cx - r); x <= Math.min(width - 2, cx + r) && !found; x++) {
        if (hasOpenNeighbor(x, y)) { start.x = x; start.y = y; found = true; }
      }
    }
  }

  return { width, height, cells, start, seed: rnd.seed };
}

function yawForDir(dir) {
  switch (dir) {
    case DIR.N: return 0;           // -Z in our grid-to-world mapping
    case DIR.E: return -Math.PI/2;  // +X
    case DIR.S: return Math.PI;     // +Z
    case DIR.W: return Math.PI/2;   // -X
    default: return 0;
  }
}

function buildMinimap(root, state) {
  const grid = document.createElement('div');
  grid.className = 'grid';

  // Compute cell size to fit container width (cap at 12px)
  const cw = root.clientWidth || 320;
  const cell = Math.max(4, Math.min(12, Math.floor((cw - 16) / state.width)));

  grid.style.gridTemplateColumns = `repeat(${state.width}, ${cell}px)`;
  grid.style.gridTemplateRows = `repeat(${state.height}, ${cell}px)`;

  const cells = [];
  for (let y = 0; y < state.height; y++) {
    cells[y] = [];
    for (let x = 0; x < state.width; x++) {
      const c = document.createElement('div');
      c.className = 'cell';
      c.dataset.pos = `${x},${y}`;
      c.style.width = `${cell}px`;
      c.style.height = `${cell}px`;
      grid.appendChild(c);
      cells[y][x] = c;
    }
  }
  root.innerHTML = '';
  root.appendChild(grid);

  // Single movable facing arrow to avoid trails
  const arrow = document.createElement('div');
  arrow.className = 'facing';

  return { grid, cells, arrow };
}

function updateMinimap(mini, state) {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const el = mini.cells[y][x];
      el.className = 'cell';
      const cell = state.cells[y][x];
      if (cell.visited) el.classList.add('visited');
      if (cell.n === WALL.WALL) el.classList.add('wall-n');
      if (cell.e === WALL.WALL) el.classList.add('wall-e');
      if (cell.s === WALL.WALL) el.classList.add('wall-s');
      if (cell.w === WALL.WALL) el.classList.add('wall-w');
      if (cell.n === WALL.DOOR) el.classList.add('door-n');
      if (cell.e === WALL.DOOR) el.classList.add('door-e');
      if (cell.s === WALL.DOOR) el.classList.add('door-s');
      if (cell.w === WALL.DOOR) el.classList.add('door-w');
    }
  }
  const cur = mini.cells[state.y][state.x];
  cur.classList.add('current');
  const rot = state.dir === DIR.N ? 0 : state.dir === DIR.E ? 90 : state.dir === DIR.S ? 180 : 270;
  mini.arrow.style.transform = `rotate(${rot}deg)`;
  if (mini.arrow.parentElement !== cur) cur.appendChild(mini.arrow);
}

function buildScene(state) {
  const container = document.getElementById('viewport3d');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d13);
  scene.fog = new THREE.Fog(0x0b0d13, 5, 22);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });

  // Render at a deliberately reduced pixel ratio so the canvas upscales into chunky pixels.
  const effectivePixelRatio = () => Math.max(0.45, Math.min(window.devicePixelRatio || 1, 2) * 0.55);
  renderer.setPixelRatio(effectivePixelRatio());
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.05, 200);

  const ambient = new THREE.AmbientLight(0xbfc4d0, 0.35);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 3);
  scene.add(ambient, dirLight);

  const tileSize = 1.0;
  const wallHeight = tileSize;
  const eye = tileSize * 0.55;

  const wallMat = new THREE.MeshLambertMaterial({ color: 0x6f7684, emissive: 0x000000, side: THREE.DoubleSide });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2e, emissive: 0x000000, side: THREE.DoubleSide });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x151821, emissive: 0x000000, side: THREE.DoubleSide });
  const ceilMat  = new THREE.MeshLambertMaterial({ color: 0x10131b, emissive: 0x000000, side: THREE.DoubleSide });

  // Floor and ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(state.width * tileSize, state.height * tileSize), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(state.width * tileSize / 2, 0, state.height * tileSize / 2);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(state.width * tileSize, state.height * tileSize), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(state.width * tileSize / 2, wallHeight, state.height * tileSize / 2);
  scene.add(ceiling);

  const wallsGroup = new THREE.Group();
  scene.add(wallsGroup);

  function addWallPanel(x, y, dir, type) {
    const cx = x + 0.5; const cz = y + 0.5;
    const w = tileSize; const h = wallHeight;
    const doorWidth = 0.5; // gap
    const lintelH = 0.3;

    function addPanel(px, py, pz, ry, width, height, mat) {
      const geo = new THREE.PlaneGeometry(width, height);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(px, py, pz);
      mesh.rotation.y = ry;
      wallsGroup.add(mesh);
    }

    if (type === WALL.WALL) {
      if (dir === DIR.N) addPanel(cx, h / 2, cz - 0.5, 0, w, h, wallMat);
      if (dir === DIR.S) addPanel(cx, h / 2, cz + 0.5, Math.PI, w, h, wallMat);
      if (dir === DIR.E) addPanel(cx + 0.5, h / 2, cz, -Math.PI / 2, w, h, wallMat);
      if (dir === DIR.W) addPanel(cx - 0.5, h / 2, cz, Math.PI / 2, w, h, wallMat);
      return;
    }

    if (type === WALL.DOOR) {
      const side = (w - doorWidth) / 2;
      const postH = h;
      const topY = h - lintelH / 2;
      if (dir === DIR.N || dir === DIR.S) {
        const z = dir === DIR.N ? (cz - 0.5) : (cz + 0.5);
        const ry = dir === DIR.N ? 0 : Math.PI;
        addPanel(cx - (doorWidth / 2 + side / 2), postH / 2, z, ry, side, postH, doorMat);
        addPanel(cx + (doorWidth / 2 + side / 2), postH / 2, z, ry, side, postH, doorMat);
        addPanel(cx, topY, z, ry, doorWidth, lintelH, doorMat);
      } else {
        const xw = dir === DIR.E ? (cx + 0.5) : (cx - 0.5);
        const ry = dir === DIR.E ? -Math.PI / 2 : Math.PI / 2;
        addPanel(xw, postH / 2, cz - (doorWidth / 2 + side / 2), ry, side, postH, doorMat);
        addPanel(xw, postH / 2, cz + (doorWidth / 2 + side / 2), ry, side, postH, doorMat);
        addPanel(xw, topY, cz, ry, doorWidth, lintelH, doorMat);
      }
      return;
    }
  }

  // Build edges without duplicates: add N and W for every cell, plus outermost E/S edges
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const c = state.cells[y][x];
      if (c.n !== WALL.OPEN) addWallPanel(x, y, DIR.N, c.n);
      if (c.w !== WALL.OPEN) addWallPanel(x, y, DIR.W, c.w);
      if (x === state.width - 1 && c.e !== WALL.OPEN) addWallPanel(x, y, DIR.E, c.e);
      if (y === state.height - 1 && c.s !== WALL.OPEN) addWallPanel(x, y, DIR.S, c.s);
    }
  }

  // Player rig
  const player = new THREE.Object3D();
  player.position.set(state.x + 0.5, 0, state.y + 0.5);
  player.rotation.y = yawForDir(state.dir);
  scene.add(player);

  camera.position.set(0, eye, 0);
  player.add(camera);

  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setPixelRatio(effectivePixelRatio());
    renderer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);

  return { container, scene, renderer, camera, player };
}

function parseOptsFromURL() {
  const p = new URLSearchParams(window.location.search);
  const w = parseInt(p.get('w') || p.get('width') || '0', 10) || undefined;
  const h = parseInt(p.get('h') || p.get('height') || '0', 10) || undefined;
  const seed = p.get('seed') || undefined;
  return { width: w, height: h, seed };
}

function main() {
  const opts = parseOptsFromURL();
  const { width, height, cells, start, seed } = buildDungeon(opts);
  const state = { width, height, cells, x: start.x, y: start.y, dir: start.dir, seed };
  cells[state.y][state.x].visited = true;

  const mini = buildMinimap(document.getElementById('minimap'), state);
  const g = buildScene(state);

  // Animation state
  let anim = null; // {type:'move'|'turn', start, duration, fromPos:{x,z}, toPos:{x,z}, fromYaw, toYaw}
  let keyQueued = null;

  function canMoveForward() {
    const ft = getWall(cells, width, height, state.x, state.y, state.dir);
    return ft !== WALL.WALL;
  }
  function canMoveBackward() {
    const bt = getWall(cells, width, height, state.x, state.y, backOf(state.dir));
    return bt !== WALL.WALL;
  }

  function startMove(dirSign) { // +1 forward, -1 backward
    if (anim) return;
    const dirToUse = (dirSign === 1) ? state.dir : backOf(state.dir);
    const ok = dirSign === 1 ? canMoveForward() : canMoveBackward();
    if (!ok) return;

    const nx = state.x + DX[dirToUse];
    const ny = state.y + DY[dirToUse];

    const fromPos = { x: g.player.position.x, z: g.player.position.z };
    const toPos = { x: nx + 0.5, z: ny + 0.5 };

    anim = { type: 'move', start: performance.now(), duration: 280, fromPos, toPos };
    // Commit logical cell at the end of the motion
    state.x = nx; state.y = ny; cells[state.y][state.x].visited = true;
  }

  function startTurn(left) {
    if (anim) return;
    const fromYaw = g.player.rotation.y;
    state.dir = left ? leftOf(state.dir) : rightOf(state.dir);
    const toYawIdeal = yawForDir(state.dir);
    // choose shortest path
    let delta = toYawIdeal - fromYaw;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    anim = { type: 'turn', start: performance.now(), duration: 220, fromYaw, toYaw: fromYaw + delta };
  }

  function onKey(ev) {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); if (!anim) startTurn(true); else keyQueued = 'L'; }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); if (!anim) startTurn(false); else keyQueued = 'R'; }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (!anim) startMove(+1); else keyQueued = 'F'; }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); if (!anim) startMove(-1); else keyQueued = 'B'; }
  }
  window.addEventListener('keydown', onKey);

  function step() {
    const now = performance.now();

    if (anim) {
      const t = Math.min(1, (now - anim.start) / anim.duration);
      if (anim.type === 'move') {
        const x = anim.fromPos.x + (anim.toPos.x - anim.fromPos.x) * t;
        const z = anim.fromPos.z + (anim.toPos.z - anim.fromPos.z) * t;
        g.player.position.set(x, 0, z);
      } else if (anim.type === 'turn') {
        const y = anim.fromYaw + (anim.toYaw - anim.fromYaw) * t;
        g.player.rotation.y = y;
      }
      if (t >= 1) {
        const __wasMove = anim && anim.type === 'move';
        anim = null;
        updateMinimap(mini, state);
        if (__wasMove && typeof window !== 'undefined' && window.__bt3_onStepComplete) { try { window.__bt3_onStepComplete(1); } catch(e){} }
        if (keyQueued) {
          const k = keyQueued; keyQueued = null;
          if (k === 'L') startTurn(true);
          else if (k === 'R') startTurn(false);
          else if (k === 'F') startMove(+1);
          else if (k === 'B') startMove(-1);
        }
      }
    }

    g.renderer.render(g.scene, g.camera);
    requestAnimationFrame(step);
  }

  updateMinimap(mini, state);
  requestAnimationFrame(step);
}

main();

// =========================
// BT3-like systems (overlay, party, items, encounters, combat)
// =========================
(function initBt3Systems() {
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }
  function roll(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  onReady(function() {
    // HUD overlay
    const overlay = document.createElement('div');
    overlay.id = 'bt3-overlay';
    overlay.innerHTML = '<div id="bt3-party"></div><div id="bt3-log"></div>';
    document.body.appendChild(overlay);

    function log(msg){ const el = document.getElementById('bt3-log'); if (!el) return; el.textContent += (el.textContent ? '\n' : '') + msg; el.scrollTop = el.scrollHeight; }
    function setPartyView(html){ const el = document.getElementById('bt3-party'); if (el) el.innerHTML = html; }

    const DB = {
      items: {
        sword_basic: { id: 'sword_basic', name: 'Short Sword', slot: 'Weapon', minDamage: 2, maxDamage: 8, toHit: 0, acBonus: 0, magicRes: 0, weight: 3 },
        leather_armor: { id: 'leather_armor', name: 'Leather Armor', slot: 'Body', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: -1, magicRes: 0, weight: 5 },
        songbook: { id: 'songbook', name: 'Songbook', slot: 'Instrument', minDamage: 0, maxDamage: 0, toHit: 0, acBonus: 0, magicRes: 0, weight: 1 },
        potion_small: { id: 'potion_small', name: 'Healing Potion', slot: 'Consumable', heals: 10, weight: 1 },
      },
      monsters: {
        rat: { id: 'rat', name: 'Giant Rat', hpMin: 3, hpMax: 6, ac: 8, toHit: 0, dmgMin: 1, dmgMax: 3, magicRes: 0 },
        skeleton: { id: 'skeleton', name: 'Skeleton', hpMin: 6, hpMax: 10, ac: 7, toHit: 1, dmgMin: 2, dmgMax: 5, magicRes: 10 },
      }
    };

    function makeChar(id, name, classType, hp, acBase, toHit, dmgBonus){
      return { id, name, classType, level: 1, xp: 0, hpCurrent: hp, hpMax: hp, spCurrent: 0, spMax: 0,
        base: { ac: acBase, toHit, dmgBonus, magicRes: 0 }, equip: { weapon: '', offhand: '', head: '', body: '', hands: '', feet: '', instrument: '', accessory: '' }, inv: [], alive: true };
    }

    const party = { id: 'p_main', gold: 0, members: [ makeChar('c_hero','Hero','Warrior',16,9,1,1), makeChar('c_bard','Lyre','Bard',12,9,0,0) ] };

    function addItem(char, itemId, qty){ for (let i=0;i<char.inv.length;i++){ const it=char.inv[i]; if(it.itemId===itemId && !it.equipped){ it.qty+=qty; return; } } char.inv.push({ itemId, qty, equipped:false }); }
    function equip(char, itemId){ const def=DB.items[itemId]; if(!def) return false; for(let i=0;i<char.inv.length;i++){ const it=char.inv[i]; if(it.itemId===itemId && it.qty>0){ it.equipped=true; if(def.slot==='Weapon') char.equip.weapon=itemId; else if(def.slot==='Body') char.equip.body=itemId; else if(def.slot==='Instrument') char.equip.instrument=itemId; return true; } } return false; }

    // Starter kit
    addItem(party.members[0],'sword_basic',1); addItem(party.members[0],'leather_armor',1); addItem(party.members[0],'potion_small',2);
    addItem(party.members[1],'songbook',1);
    equip(party.members[0],'sword_basic'); equip(party.members[0],'leather_armor'); equip(party.members[1],'songbook');

    function charAC(c){ let ac=c.base.ac; if(c.equip.body){ const d=DB.items[c.equip.body]; ac+= (d.acBonus||0); } return ac; }
    function charToHit(c){ let th=c.base.toHit; if(c.equip.weapon){ const d=DB.items[c.equip.weapon]; th+= (d.toHit||0);} return th; }
    function charDamage(c){ let min=1+c.base.dmgBonus, max=6+c.base.dmgBonus; if(c.equip.weapon){ const w=DB.items[c.equip.weapon]; min=Math.max(min, w.minDamage||min); max=Math.max(max, w.maxDamage||max);} return {min,max}; }

    function renderParty(){ const rows=[]; for(let i=0;i<party.members.length;i++){ const c=party.members[i]; rows.push(`${c.name} L${c.level}  HP ${c.hpCurrent}/${c.hpMax}  AC ${charAC(c)}  TH ${charToHit(c)} ${c.alive?'':'(DEAD)'}`);} setPartyView(rows.join(' | ')); }

    function generateEncounter(depth){ const groups=[]; if(depth<=1) groups.push({ species:'rat', count: roll(1,4)}); else groups.push({ species:'skeleton', count: roll(1,3)}); return { id:'enc_'+Math.random().toString(36).slice(2), groups, canFlee:true }; }
    function makeMon(specId, idx){ const sp=DB.monsters[specId]; const hp=roll(sp.hpMin, sp.hpMax); return { id: specId+'_'+idx, name: sp.name, hpCurrent: hp, hpMax: hp, ac: sp.ac, toHit: sp.toHit, dmgMin: sp.dmgMin, dmgMax: sp.dmgMax, alive: true }; }
    function startCombat(enc){ const monsters=[]; for(let g=0;g<enc.groups.length;g++){ const grp=enc.groups[g]; for(let n=0;n<grp.count;n++) monsters.push(makeMon(grp.species, (g+1)+'_'+(n+1))); } log(`Encounter! ${monsters.length} ${(monsters.length===1?'foe':'foes')} appear.`); return { round:1, party: party.members.map(c=>c), monsters, activeSide:'Party', ended:false, winner:'' }; }

    function firstAlive(list){ for(let i=0;i<list.length;i++){ if(list[i].alive) return list[i]; } return null; }
    function hasAlive(list){ for(let i=0;i<list.length;i++){ if(list[i].alive) return true; } return false; }

    function attackChar(att, def){ const d=charDamage(att); const hitRoll=Math.floor(Math.random()*20)+1; const hit=(hitRoll + charToHit(att)) >= def.ac; if(hit){ const dmg=roll(d.min,d.max); def.hpCurrent-=dmg; if(def.hpCurrent<=0){ def.hpCurrent=0; def.alive=false; } log(`${att.name} hits ${def.name} for ${dmg}.`);} else { log(`${att.name} misses ${def.name}.`);} }
    function attackMonster(att, def){ const hitRoll=Math.floor(Math.random()*20)+1; const hit=(hitRoll + att.toHit) >= charAC(def); if(hit){ const dmg=roll(att.dmgMin, att.dmgMax); def.hpCurrent-=dmg; if(def.hpCurrent<=0){ def.hpCurrent=0; def.alive=false; } log(`${att.name} hits ${def.name} for ${dmg}.`);} else { log(`${att.name} misses ${def.name}.`);} }

    function stepCombat(st){ if(st.ended) return st; if(st.activeSide==='Party'){ for(let i=0;i<st.party.length;i++){ const c=st.party[i]; if(!c.alive) continue; const tgt=firstAlive(st.monsters); if(!tgt) break; attackChar(c,tgt);} if(!hasAlive(st.monsters)){ st.ended=true; st.winner='Party'; return st; } st.activeSide='Monsters'; return st; } else { for(let i=0;i<st.monsters.length;i++){ const m=st.monsters[i]; if(!m.alive) continue; const tgt=firstAlive(st.party); if(!tgt) break; attackMonster(m,tgt);} if(!hasAlive(st.party)){ st.ended=true; st.winner='Monsters'; return st; } st.activeSide='Party'; st.round+=1; return st; } }
    function distributeLoot(st){ if(st.winner!=='Party') return; const gold=roll(5,20); party.gold+=gold; log(`Loot: ${gold} gold.`); if(Math.random()<0.2){ addItem(party.members[0],'potion_small',1); log('Found a Healing Potion.'); } }

    let stepsSinceEncounter=0; let inCombat=false; let combatState=null;
    function maybeEncounter(depth){ if(inCombat) return; stepsSinceEncounter+=1; const threshold=Math.max(2, 6 - Math.min(depth,4)); if(stepsSinceEncounter>=threshold){ const chance=0.25 + 0.05*depth; if(Math.random()<chance){ const enc=generateEncounter(depth); combatState=startCombat(enc); inCombat=true; stepsSinceEncounter=0; renderParty(); const tick=()=>{ if(!inCombat) return; combatState=stepCombat(combatState); renderParty(); if(combatState.ended){ log(`Combat ends. Winner: ${combatState.winner}.`); distributeLoot(combatState); inCombat=false; renderParty(); return; } setTimeout(tick, 350); }; setTimeout(tick, 350); } } }

    window.__bt3_onStepComplete = function(depth){ const d=(typeof depth==='number' && depth>0) ? depth : 1; maybeEncounter(d); };

    renderParty();
  });
})();
