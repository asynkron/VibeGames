import GameScene from './scene/GameScene.js';
import { initCrtPresetHotkeys } from '../../shared/ui/crt.js';
import { createCrtControls } from '../../shared/ui/crtControls.js';
import { createCrtPostProcessor } from '../../shared/fx/crtPostprocess.js';

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

const crtSettings = { enabled: true, warp: 0.15, aberration: 0.1 };
const crtControls = createCrtControls({
  storageKey: 'loderunner_crt_settings',
  defaults: crtSettings,
  onChange: (next) => Object.assign(crtSettings, next),
});
Object.assign(crtSettings, crtControls.getSettings());

if (game && game.context && typeof game.context.drawImage === 'function' && game.events) {
  const crtPost = createCrtPostProcessor({ targetContext: game.context, settings: crtSettings });
  const coreEvents = Phaser && Phaser.Core && Phaser.Core.Events ? Phaser.Core.Events : null;
  const POST_RENDER = coreEvents ? coreEvents.POST_RENDER : 'postrender';
  const DESTROY = coreEvents ? coreEvents.DESTROY : 'destroy';

  const handlePostRender = () => { crtPost.render(); };
  game.events.on(POST_RENDER, handlePostRender);
  game.events.once(DESTROY, () => {
    game.events.off(POST_RENDER, handlePostRender);
  });
}

// Allow the same CRT intensity hotkeys as the other games (F1/F2 cycles).
initCrtPresetHotkeys({ storageKey: 'lodeRunnerCrt', target: document.documentElement });
