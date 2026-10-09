// Serve the VibeGames root over HTTP so shared modules are available.
import { clamp } from '../shared/utils/math.js';
import { DX, DY, WALL, buildDungeon, getWall, leftOf, rightOf, backOf, yawForDir } from './src/dungeon.js';
import { createHudRenderer } from './src/render/hud.js';
import { createMinimapOverlay } from './src/render/minimap.js';
import { buildScene } from './src/render/scene.js';
import { createCombatMapControls } from './src/render/combatMapControls.js';
import { initBt3Systems } from './src/systems/core.js';
import { UI_SETTINGS } from './config/uiSettings.js';

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

  const hudCanvas = document.getElementById('hud');
  const stageElement = document.getElementById('stage');
  const screenElement = document.getElementById('screen');
  let combatLayoutActive = false;
  const hud = createHudRenderer(hudCanvas, {
    onViewportClick(event) {
      if (!systems.isCombatActive) return;
      const cell = g.pickBattleCell(event.clientX, event.clientY);
      if (cell) systems.selectCombatCell(cell.x, cell.y);
    },
    onCombatCellClick(x, y) {
      systems.selectCombatCell(x, y);
    },
  });

  function sizeScreen() {
    const { resolution, tileSize, layout } = UI_SETTINGS;
    const scale = Math.max(1, Math.floor(Math.min(
      window.innerWidth / resolution.width,
      window.innerHeight / resolution.height,
    )));
    const width = resolution.width * scale;
    const height = resolution.height * scale;
    Object.assign(screenElement.style, {
      width: `${width}px`, height: `${height}px`,
      left: `${Math.max(0, Math.floor((window.innerWidth - width) / 2))}px`,
      top: `${Math.max(0, Math.floor((window.innerHeight - height) / 2))}px`,
    });
    const view = combatLayoutActive ? UI_SETTINGS.combatLayout.viewport : layout.viewport;
    Object.assign(stageElement.style, {
      left: `${view.column * tileSize * scale}px`,
      top: `${view.row * tileSize * scale}px`,
      width: `${view.columns * tileSize * scale}px`,
      height: `${view.rows * tileSize * scale}px`,
    });
  }
  sizeScreen();
  window.addEventListener('resize', sizeScreen);
  hud.setLocation(state);

  const g = buildScene(state, stageElement);
  const minimap = createMinimapOverlay(screenElement, state);
  const combatView = {
    playEffect(effect) {
      return g.playBattleEffect(effect);
    },
    show(snapshot) {
      if (!combatLayoutActive) {
        combatLayoutActive = true;
        hudCanvas.classList.add('combat-map-controls');
        sizeScreen();
      }
      hud.setCombatStatus(snapshot);
      g.setBattle(snapshot);
    },
    hide() {
      combatLayoutActive = false;
      hudCanvas.classList.remove('combat-map-controls');
      mapControls.cancel();
      sizeScreen();
      hud.setCombatStatus(null);
      g.clearBattle();
    },
  };
  const systems = initBt3Systems({ hud, combatView, dungeon: state });
  const mapControls = createCombatMapControls(hudCanvas, {
    isActive: () => systems.isCombatActive && !minimap.isVisible(),
    containsPoint(clientX, clientY) {
      const rect = stageElement.getBoundingClientRect();
      return clientX >= rect.left && clientX < rect.right && clientY >= rect.top && clientY < rect.bottom;
    },
    pan: g.panBattle,
    rotate: g.rotateBattle,
    zoom: g.zoomBattle,
    reset: g.resetBattleView,
  });
  hud.appendLog('The party enters the dungeon.');

  // Animation state
  let anim = null; // {type:'move'|'turn', start, duration, fromPos:{x,z}, toPos:{x,z}, fromYaw, toYaw}
  let keyQueued = null;
  let lastFrameTime = performance.now();
  let torchPhase = Math.random() * Math.PI * 2;

  function startMove(dirSign) { // +1 forward, -1 backward
    if (anim || systems.isCombatActive || minimap.isVisible()) return;
    const dirToUse = (dirSign === 1) ? state.dir : backOf(state.dir);
    if (getWall(cells, width, height, state.x, state.y, dirToUse) === WALL.WALL) return;

    const nx = state.x + DX[dirToUse];
    const ny = state.y + DY[dirToUse];

    const fromPos = { x: g.player.position.x, z: g.player.position.z };
    const toPos = { x: nx + 0.5, z: ny + 0.5 };

    anim = { type: 'move', start: performance.now(), duration: 280, fromPos, toPos };
    // Track the destination while the camera animates toward it.
    state.x = nx; state.y = ny; cells[state.y][state.x].visited = true;
    hud.setLocation(state);
  }

  function startTurn(left) {
    if (anim || systems.isCombatActive || minimap.isVisible()) return;
    const fromYaw = g.player.rotation.y;
    state.dir = left ? leftOf(state.dir) : rightOf(state.dir);
    hud.setLocation(state);
    const toYawIdeal = yawForDir(state.dir);
    // choose shortest path
    let delta = toYawIdeal - fromYaw;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    anim = { type: 'turn', start: performance.now(), duration: 220, fromYaw, toYaw: fromYaw + delta };
  }

  const navigation = {
    ArrowLeft: () => startTurn(true),
    ArrowRight: () => startTurn(false),
    ArrowUp: () => startMove(1),
    ArrowDown: () => startMove(-1),
  };

  function onKey(ev) {
    if (ev.key === 'm' || ev.key === 'M') {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      minimap.toggle();
      return;
    }
    if (ev.key === 'Escape' && minimap.isVisible()) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      minimap.hide();
      return;
    }
    if (minimap.isVisible()) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      return;
    }
    if (systems.isCombatActive) {
      if (systems.handleCombatKey(ev.key)) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
      return;
    }
    const navigate = navigation[ev.key];
    if (!navigate) return;
    ev.preventDefault();
    if (anim) keyQueued = navigate;
    else navigate();
  }
  window.addEventListener('keydown', onKey, { capture: true });

  function step() {
    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

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
        const wasMove = anim.type === 'move';
        anim = null;
        if (wasMove) systems.onStepComplete(1);
        if (keyQueued) {
          const navigate = keyQueued;
          keyQueued = null;
          navigate();
        }
      }
    }

    // Flicker intensity and anchor wobble with a blend of low/high frequency noise.
    torchPhase += dt * 5.2;
    const spark = Math.sin(torchPhase) * 0.18 + (Math.random() - 0.5) * 0.1;
    const baseIntensity = g.torch.userData.baseIntensity;
    const baseDistance = g.torch.userData.baseDistance;
    g.torch.intensity = clamp(baseIntensity + spark, baseIntensity * 0.65, baseIntensity * 1.35);
    g.torch.distance = clamp(baseDistance + spark * 1.8, baseDistance * 0.75, baseDistance * 1.2);
    const offset = g.torchAnchor.userData.baseOffset;
    g.torchAnchor.position.x = offset.x + Math.sin(torchPhase * 2.4) * 0.035;
    g.torchAnchor.position.y = offset.y + Math.cos(torchPhase * 3.1) * 0.018;

    g.render();
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

main();
