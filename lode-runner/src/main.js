import GameScene from './scene/GameScene.js';
import { initCrtPresetHotkeys } from '../../shared/ui/crt.js';
import { initGameCrt } from '../../shared/ui/gameCrt.js';
import { createOverlayFX } from '../../shared/fx/overlay.js';
import {
  createDefaultCrtSettings,
} from '../../shared/config/display.js';
import { createScreenViewport } from '../../shared/render/screenViewport.js';

const WIDTH = 28 * 32;  // 28 cols
const HEIGHT = 16 * 32; // 16 rows

const config = {
  type: Phaser.CANVAS,
  parent: 'game-root',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#000000',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 820 },
      debug: false,
    },
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

createScreenViewport({
  frame: document.querySelector('.lode-screen'),
  logicalWidth: WIDTH,
  logicalHeight: HEIGHT,
  css: {
    scale: 1.4,
    minWidth: 820,
    maxWidth: 1280,
  },
});

const crtSettings = createDefaultCrtSettings();
if (game && game.context && typeof game.context.drawImage === 'function' && game.events) {
  const { post: crtPost } = initGameCrt({
    storageKey: 'loderunner_crt_settings',
    settings: crtSettings,
    targetContext: game.context,
  });
  const overlayFx = createOverlayFX({ ctx: game.context, width: WIDTH, height: HEIGHT });
  const coreEvents = Phaser && Phaser.Core && Phaser.Core.Events ? Phaser.Core.Events : null;
  const POST_RENDER = coreEvents ? coreEvents.POST_RENDER : 'postrender';
  const DESTROY = coreEvents ? coreEvents.DESTROY : 'destroy';

  const handlePostRender = () => {
    crtPost.render();
    const w = game.scale?.width ?? WIDTH;
    const h = game.scale?.height ?? HEIGHT;
    overlayFx.setBounds({ width: w, height: h });
    overlayFx.drawIris();
  };
  const handleIrisEvent = (config = {}) => {
    const { type = 'in', duration, options } = config;
    overlayFx.startIris(type, duration, options);
  };
  game.events.on(POST_RENDER, handlePostRender);
  game.events.on('iris-transition', handleIrisEvent);
  game.events.once(DESTROY, () => {
    game.events.off(POST_RENDER, handlePostRender);
    game.events.off('iris-transition', handleIrisEvent);
  });
}

// Allow the same CRT intensity hotkeys as the other games (F1/F2 cycles).
initCrtPresetHotkeys({ storageKey: 'lodeRunnerCrt', target: document.documentElement });
