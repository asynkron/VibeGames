import GameScene from './scene/GameScene.js';
import { initCrtPresetHotkeys } from '../../shared/ui/crt.js';
import { createCrtControls, applyScanlineIntensity } from '../../shared/ui/crtControls.js';
import { createCrtPostProcessor } from '../../shared/fx/crtPostprocess.js';
import { createOverlayFX } from '../../shared/fx/overlay.js';

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

const crtFrame = document.querySelector('.bezel.crt-frame');
const syncScanlines = (value) => {
  if (!crtFrame) return;
  applyScanlineIntensity(crtFrame, value, { alphaRange: [0.05, 0.26] });
};

const crtSettings = {
  enabled: true,
  warp: 0.08,
  aberration: 0.05,
  aberrationOpacity: 0.45,
  scanlines: 0.45,
};
const crtControls = createCrtControls({
  storageKey: 'loderunner_crt_settings',
  defaults: crtSettings,
  onChange: (next) => {
    Object.assign(crtSettings, next);
    syncScanlines(next.scanlines);
  },
});
Object.assign(crtSettings, crtControls.getSettings());
syncScanlines(crtSettings.scanlines);

if (game && game.context && typeof game.context.drawImage === 'function' && game.events) {
  const crtPost = createCrtPostProcessor({ targetContext: game.context, settings: crtSettings });
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
