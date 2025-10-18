import GameScene from './scene/GameScene.js';
import { initCrtPresetHotkeys } from '../../shared/ui/crt.js';

const WIDTH = 28 * 32;  // 28 cols
const HEIGHT = 16 * 32; // 16 rows

const config = {
  type: Phaser.AUTO,
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

new Phaser.Game(config);

// Allow the same CRT intensity hotkeys as the other games (F1/F2 cycles).
initCrtPresetHotkeys({ storageKey: 'lodeRunnerCrt', target: document.documentElement });
