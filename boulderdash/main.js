import { GameEngine } from './game/engine.js';
import { createRenderer } from './game/renderer.js';
import { createAssets } from './game/assets.js';
import { createWorld, TILE } from './game/world.js';
import { LEVELS } from './game/levels.js';
import { createAudio } from './game/audio.js';
import { startCrtJitter } from '../shared/ui/crt.js';
import { createScreenViewport } from '../shared/render/screenViewport.js';

const canvas = document.getElementById('game');
const hudGems = document.getElementById('hud-gems');
const hudTime = document.getElementById('hud-time');
const hudScore = document.getElementById('hud-score');
const hudLevel = document.getElementById('hud-level');
const hudMsg = document.getElementById('hud-msg');
const hudKeys = document.getElementById('hud-keys');

const assets = createAssets();
const audio = createAudio();

createScreenViewport({
  canvas,
  frame: document.getElementById('root'),
  css: {
    scale: 1.75,
    minWidth: 720,
    maxWidth: 1180,
  },
});

const renderer = createRenderer(canvas, assets);
startCrtJitter({ element: document.getElementById('root'), amplitude: 0.3 });

window.LEVELS = LEVELS;

let levelIndex = 0;
let world = createWorld(LEVELS[levelIndex]);
renderer.syncOverlayBounds(world);

let messageTimer = null;
function clearMessage() {
  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = null;
  }
  hudMsg.textContent = '';
}

function showMessage(text, duration = 2200) {
  clearMessage();
  if (!text) return;
  hudMsg.textContent = text;
  messageTimer = setTimeout(() => {
    hudMsg.textContent = '';
    messageTimer = null;
  }, duration);
}

function updateHUD() {
  hudGems.textContent = `Gems: ${world.collected}/${world.gemsRequired}`;
  hudTime.textContent = `Time: ${String(Math.max(0, Math.floor(world.timeLeft))).padStart(3,'0')}`;
  hudScore.textContent = `Score: ${String(world.score).padStart(6,'0')}`;
  hudLevel.textContent = `L${levelIndex + 1}`;
  if (hudKeys) {
    const total = world.keysTotal ?? 0;
    const doors = world.lockedDoors ?? 0;
    const remaining = world.keysRemaining ?? 0;
    const parts = [];
    if (total > 0) parts.push(`${world.keysHeld}/${total}`);
    else parts.push(`${world.keysHeld}`);
    if (remaining > 0) parts.push(`R:${remaining}`);
    if (doors > 0) parts.push(`D:${doors}`);
    hudKeys.textContent = `Keys: ${parts.join(' ')}`;
  }
}

function onEvent(evt, payload) {
  switch (evt) {
    case 'collect':
      audio.collect();
      break;
    case 'dig':
      audio.dig();
      break;
    case 'step':
      audio.step();
      break;
    case 'push':
      audio.push();
      break;
    case 'fall':
      audio.fall();
      break;
    case 'land':
      audio.land();
      break;
    case 'key':
      audio.key();
      showMessage('Key collected');
      break;
    case 'unlock':
      audio.unlock();
      showMessage('Door unlocked');
      break;
    case 'exit-open':
      audio.exitOpen();
      showMessage('Exit is open!');
      break;
    case 'win':
      audio.win();
      showMessage('Cavern cleared!');
      break;
    case 'die': {
      audio.die();
      const reason = payload?.reason === 'time' ? 'Out of time!' : 'Crushed!';
      showMessage(`${reason} Press R to restart.`, 2800);
      renderer.syncOverlayBounds(world);
      renderer.startIris('out', 900);
      break;
    }
    default:
      break;
  }
}

const engine = new GameEngine(world, renderer, onEvent);
engine.onRestart = () => {
  world = createWorld(LEVELS[levelIndex]);
  engine.setWorld(world);
  renderer.syncOverlayBounds(world);
  renderer.startIris('in', 900);
  clearMessage();
};
engine.onNextLevel = () => {
  levelIndex = (levelIndex + 1) % LEVELS.length;
  world = createWorld(LEVELS[levelIndex]);
  engine.setWorld(world);
  renderer.syncOverlayBounds(world);
  renderer.startIris('in', 900);
  clearMessage();
};

window.loadLevel = (index) => {
  if (!Number.isFinite(index)) return;
  const bounded = ((index % LEVELS.length) + LEVELS.length) % LEVELS.length;
  levelIndex = bounded;
  world = createWorld(LEVELS[levelIndex]);
  engine.setWorld(world);
  renderer.syncOverlayBounds(world);
  renderer.startIris('in', 900);
  clearMessage();
  updateHUD();
};

function loopFrame(t) {
  engine.frame(t);
  updateHUD();
  requestAnimationFrame(loopFrame);
}

updateHUD();
renderer.startIris('in', 900);
requestAnimationFrame(loopFrame);
