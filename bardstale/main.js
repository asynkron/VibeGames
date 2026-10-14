// Serve the VibeGames root over HTTP so shared modules are available.
import { clamp } from '../shared/utils/math.js';
import { DX, DY, WALL, getWall, leftOf, rightOf, backOf, yawForDir } from './src/dungeon.js';
import { createHudRenderer } from './src/render/hud.js';
import { createMinimapOverlay } from './src/render/minimap.js';
import { buildScene } from './src/render/scene.js';
import { createCombatMapControls } from './src/render/combatMapControls.js';
import { createInventoryPanel } from './src/render/inventoryPanel.js';
import { createCharacterCreationPanel } from './src/render/characterCreationPanel.js';
import { createGameSystems } from './src/systems/core.js';
import { UI_SETTINGS } from './config/uiSettings.js';
import { createWorldJourney } from './src/worldTravel.js';

function parseOptsFromURL() {
  const p = new URLSearchParams(window.location.search);
  return { area: p.get('area') || 'new-phlan' };
}

function main() {
  const opts = parseOptsFromURL();
  const journey = createWorldJourney(opts);
  const state = { ...journey.initialArea };
  state.cells[state.y][state.x].visited = true;
  let travelling = false;

  const hudCanvas = document.getElementById('hud');
  const stageElement = document.getElementById('stage');
  const screenElement = document.getElementById('screen');
  let combatLayoutActive = false;
  const hud = createHudRenderer(hudCanvas, {
    onInventoryClick(characterId) { openInventory(characterId); },
    onCreateParty() { openPartyCreation(); },
    onCamp() { openCamp(); },
    onExploreInteraction() { interact(); },
    onViewportClick(event) {
      if (inventory.isOpen() || travelling) return;
      if (!systems.isCombatActive) { interact(); return; }
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

  let g = buildScene(state, stageElement);
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
      updateInteraction();
    },
    hide() {
      combatLayoutActive = false;
      hudCanvas.classList.remove('combat-map-controls');
      mapControls.cancel();
      sizeScreen();
      hud.setCombatStatus(null);
      g.clearBattle();
      updateInteraction();
    },
  };
  const characterData=sessionStorage.getItem('phlan-character-party');
  const characters=characterData ? JSON.parse(characterData) : undefined;
  const systems = createGameSystems({ hud, combatView, dungeon: state, characters, onPartyDefeated: returnToTemple, onDungeonChanged:refreshWorld });
  const inventory = createInventoryPanel({
    parent: document.body,
    systems,
    onClose() {
      screenElement.inert = false;
      updateInteraction();
      hudCanvas.focus({ preventScroll: true });
    },
  });
  const partyCreation=createCharacterCreationPanel({
    parent:document.body,
    onCreate(descriptors) {
      sessionStorage.setItem('phlan-character-party',JSON.stringify(descriptors));
      const url=new URL(window.location.href);
      url.search='';
      url.searchParams.set('area','new-phlan');
      window.location.assign(url);
    },
    onClose() {
      screenElement.inert=false;
      hud.setObscured(false);
      updateInteraction();
      hudCanvas.focus({preventScroll:true});
    },
  });
  const mapControls = createCombatMapControls(hudCanvas, {
    isActive: () => systems.isCombatActive && !minimap.isVisible() && !inventory.isOpen(),
    containsPoint(clientX, clientY) {
      const rect = stageElement.getBoundingClientRect();
      return clientX >= rect.left && clientX < rect.right && clientY >= rect.top && clientY < rect.bottom;
    },
    pan: (...args) => g.panBattle(...args),
    rotate: (...args) => g.rotateBattle(...args),
    zoom: (...args) => g.zoomBattle(...args),
    reset: () => g.resetBattleView(),
  });
  hud.appendLog(`Welcome to ${state.name}. Visit the council for a commission, ready your gear, and rest at the inn before venturing into the ruins.`);

  // Animation state
  let anim = null; // {type:'move'|'turn', start, duration, fromPos:{x,z}, toPos:{x,z}, fromYaw, toYaw}
  let keyQueued = null;
  let inventoryQueuedFor = null;
  let lastFrameTime = performance.now();
  let torchPhase = Math.random() * Math.PI * 2;
  updateInteraction();

  function openPartyCreation() {
    if (travelling || anim || systems.isCombatActive || inventory.isOpen()) return;
    systems.closeService();minimap.hide();mapControls.cancel();keyQueued=null;
    screenElement.inert=true;
    hud.setObscured(true);
    partyCreation.open();
  }

  function openCamp() {
    if (travelling || anim || systems.isCombatActive || inventory.isOpen() || partyCreation.isOpen()) return;
    systems.closeService();minimap.hide();keyQueued=null;
    systems.openCamp();
  }

  function refreshWorld() {
    g.dispose();
    g=buildScene(state,stageElement);
    updateInteraction();
  }

  function openInventory(characterId) {
    if (travelling) return;
    const targetId = characterId || hud.getInspectedCharacterId();
    systems.closeService();
    minimap.hide();
    mapControls.cancel();
    keyQueued = null;
    if (anim) {
      inventoryQueuedFor = targetId;
      return;
    }
    inventory.open(targetId);
    screenElement.inert = true;
    updateInteraction();
  }

  function exitAtParty() {
    return state.exits.find(exit => exit.x === state.x && exit.y === state.y);
  }

  function serviceAtParty() {
    return state.services.find(service => service.x === state.x && service.y === state.y);
  }

  function updateInteraction() {
    const exit = exitAtParty();
    const service = serviceAtParty();
    hud.setInteraction({
      label: exit ? `Travel to ${exit.name}` : service ? service.name : '',
      enabled: Boolean(exit || service) && !anim && !travelling && !systems.isCombatActive && !inventory.isOpen() && !partyCreation.isOpen(),
    });
  }

  function interact() {
    if (travelling || anim || systems.isCombatActive || inventory.isOpen() || minimap.isVisible()) return;
    if (exitAtParty()) { travel(); return; }
    const service = serviceAtParty();
    if (service && !systems.isServiceOpen) systems.openService(service.id);
  }

  async function changeArea(next, position, message) {
    travelling = true;
    anim = null;
    keyQueued = null;
    inventoryQueuedFor = null;
    systems.closeService();
    minimap.hide();
    mapControls.cancel();
    updateInteraction();
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    Object.assign(journey.areaFor(state.id), { x:state.x, y:state.y, dir:state.dir });
    g.dispose();
    Object.assign(state, next, position);
    state.cells[state.y][state.x].visited = true;
    g = buildScene(state, stageElement);
    hud.setLocation(state);
    hud.appendLog(message);
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('area', state.id);
    history.replaceState(null, '', url);
    travelling = false;
    lastFrameTime = performance.now();
    updateInteraction();
    hudCanvas.focus({ preventScroll:true });
  }

  async function travel() {
    const exit = exitAtParty();
    if (!exit || travelling || anim || systems.isCombatActive || inventory.isOpen()) return;
    const permission = systems.canTravel(exit.target);
    if (!permission.ok) { hud.appendLog(permission.message); return; }
    const next = journey.areaFor(exit.target);
    await changeArea(next, journey.arrivalFor(state.id, exit.target), `The party arrives in ${next.name}. ${next.description}`);
  }

  async function returnToTemple() {
    const { area, position } = journey.resurrectionSpawn();
    await changeArea(area, position, 'The priests of Tyr call the fallen party home. Everyone rises with health and prepared spells restored.');
  }

  function startMove(dirSign) { // +1 forward, -1 reverse
    if (anim || systems.isCombatActive || minimap.isVisible()) return;
    systems.closeService();
    const dirToUse = (dirSign === 1) ? state.dir : backOf(state.dir);
    if (getWall(state.cells, state.width, state.height, state.x, state.y, dirToUse) === WALL.WALL) return;

    const nx = state.x + DX[dirToUse];
    const ny = state.y + DY[dirToUse];

    const fromPos = { x: g.player.position.x, z: g.player.position.z };
    const toPos = { x: nx + 0.5, z: ny + 0.5 };

    anim = { type: 'move', start: performance.now(), duration: 280, fromPos, toPos };
    // Track the destination while the camera animates toward it.
    state.x = nx; state.y = ny; state.cells[state.y][state.x].visited = true;
    hud.setLocation(state);
    updateInteraction();
  }

  function startTurn(left) {
    if (anim || systems.isCombatActive || minimap.isVisible()) return;
    systems.closeService();
    const fromYaw = g.player.rotation.y;
    state.dir = left ? leftOf(state.dir) : rightOf(state.dir);
    hud.setLocation(state);
    const toYawIdeal = yawForDir(state.dir);
    // choose shortest path
    let delta = toYawIdeal - fromYaw;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    anim = { type: 'turn', start: performance.now(), duration: 220, fromYaw, toYaw: fromYaw + delta };
    updateInteraction();
  }

  const navigation = {
    ArrowLeft: () => startTurn(true),
    ArrowRight: () => startTurn(false),
    ArrowUp: () => startMove(1),
    ArrowDown: () => startMove(-1),
  };

  function onKey(ev) {
    if (partyCreation.isOpen()) return;
    if (ev.key === 'Enter' && ev.repeat && !systems.isCombatActive && !inventory.isOpen()) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      return;
    }
    if (travelling) return;
    if (ev.key === 'Enter' && !systems.isServiceOpen && (exitAtParty() || serviceAtParty()) && !systems.isCombatActive && !inventory.isOpen() && !minimap.isVisible()) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      interact();
      return;
    }
    if (inventory.isOpen() || inventoryQueuedFor !== null) return;
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (!systems.isCombatActive && ev.key.toLowerCase() === 'n') {
      ev.preventDefault();ev.stopImmediatePropagation();openPartyCreation();return;
    }
    if (!systems.isCombatActive && ev.key.toLowerCase() === 'r') {
      ev.preventDefault();ev.stopImmediatePropagation();openCamp();return;
    }
    if (ev.key.toLowerCase() === 'i') {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      openInventory();
      return;
    }
    if (ev.key === 'm' || ev.key === 'M') {
      systems.closeService();
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
    if (ev.key === 'Escape' && systems.isServiceOpen && !systems.isCombatActive) {
      systems.closeService();
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
        if (wasMove && !exitAtParty() && !serviceAtParty()) systems.onStepComplete();
        updateInteraction();
        if (inventoryQueuedFor !== null) {
          const targetId = inventoryQueuedFor;
          inventoryQueuedFor = null;
          openInventory(targetId);
        }
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
    const baseIntensity = g.torch.userData.baseIntensity * (state.magic?.light ? 1.6 : 1);
    const baseDistance = g.torch.userData.baseDistance;
    g.torch.intensity = clamp(baseIntensity + spark, baseIntensity * 0.65, baseIntensity * 1.35);
    g.torch.distance = clamp(baseDistance + spark * 1.8, baseDistance * 0.75, baseDistance * 1.2);
    const offset = g.torchAnchor.userData.baseOffset;
    g.torchAnchor.position.x = offset.x + Math.sin(torchPhase * 2.4) * 0.035;
    g.torchAnchor.position.y = offset.y + Math.cos(torchPhase * 3.1) * 0.018;

    updateInteraction();
    hud.setObscured(inventory.isOpen() || partyCreation.isOpen() || minimap.isVisible() || travelling);
    if (!inventory.isOpen() && !travelling) g.render();
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

main();
