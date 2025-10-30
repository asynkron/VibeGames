import GameScene from '../scenes/GameScene.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../gameplay/constants.js';
import { createScreenViewport } from '../../../shared/render/screenViewport.js';
import { initGameCrt } from '../../../shared/ui/gameCrt.js';
import { initCrtPresetHotkeys } from '../../../shared/ui/crt.js';
import { createDefaultCrtSettings } from '../../../shared/config/display.js';
import { createOverlayFX } from '../../../shared/fx/overlay.js';

function attachCrtEffects(game) {
  const settings = createDefaultCrtSettings();
  if (!game || !game.context || typeof game.context.drawImage !== 'function' || !game.events) return;
  const { post } = initGameCrt({
    storageKey: 'loderunner_crt_settings',
    settings,
    targetContext: game.context,
  });
  const overlay = createOverlayFX({ ctx: game.context, width: WORLD_WIDTH, height: WORLD_HEIGHT });
  const coreEvents = Phaser?.Core?.Events;
  const POST_RENDER = coreEvents?.POST_RENDER ?? 'postrender';
  const DESTROY = coreEvents?.DESTROY ?? 'destroy';

  const handlePost = () => {
    post.render();
    const width = game.scale?.width ?? WORLD_WIDTH;
    const height = game.scale?.height ?? WORLD_HEIGHT;
    overlay.setBounds({ width, height });
    overlay.drawIris();
  };
  const handleIris = (config = {}) => {
    overlay.startIris(config.type ?? 'in', config.duration, config.options);
  };

  game.events.on(POST_RENDER, handlePost);
  game.events.on('iris-transition', handleIris);
  game.events.once(DESTROY, () => {
    game.events.off(POST_RENDER, handlePost);
    game.events.off('iris-transition', handleIris);
  });
}

export function bootGame() {
  const config = {
    type: Phaser.CANVAS,
    parent: 'game-root',
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
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
    logicalWidth: WORLD_WIDTH,
    logicalHeight: WORLD_HEIGHT,
    css: {
      scale: 1.4,
      minWidth: 820,
      maxWidth: 1280,
    },
  });

  attachCrtEffects(game);
  initCrtPresetHotkeys({ storageKey: 'lodeRunnerCrt', target: document.documentElement });
}
