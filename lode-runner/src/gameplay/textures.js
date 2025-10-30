import { createTileFactory } from '../../../shared/render/tile-forge/factory.js';
import { createLodeRunnerPosePainter, paintLadderWood } from '../../../shared/render/tile-forge/painters.js';
import { registerStandardTiles } from '../../../shared/render/tile-forge/standardTiles.js';
import { TILE_SIZE } from './constants.js';

const tileFactory = registerStandardTiles(
  createTileFactory({ size: TILE_SIZE, smoothing: false }),
);

function definePose(id, role, config) {
  if (!tileFactory.has(id)) {
    tileFactory.define(id, createLodeRunnerPosePainter(role, config));
  }
}

function defineLodeRunnerExtras() {
  // Extend the shared tile-forge catalog with poses our scene expects.
  if (!tileFactory.has('loderunner/ladder')) {
    tileFactory.define('loderunner/ladder', paintLadderWood());
  }

  definePose('loderunner/player/climb-0', 'player', {
    torso: { x: 13, y: 11, w: 6, h: 11 },
    limbs: [
      { x: 10, y: 20, w: 4, h: 11 },
      { x: 18, y: 22, w: 4, h: 9 },
      { x: 8, y: 6, w: 3, h: 12, shade: false },
      { x: 22, y: 12, w: 3, h: 8, shade: false },
    ],
  });

  definePose('loderunner/player/climb-1', 'player', {
    torso: { x: 13, y: 11, w: 6, h: 11 },
    limbs: [
      { x: 11, y: 22, w: 4, h: 9 },
      { x: 19, y: 20, w: 4, h: 11 },
      { x: 9, y: 12, w: 3, h: 8, shade: false },
      { x: 21, y: 6, w: 3, h: 12, shade: false },
    ],
  });

  definePose('loderunner/player/hang', 'player', {
    torso: { x: 13, y: 12, w: 6, h: 11 },
    head: { x: 13, y: 5, w: 8, h: 6 },
    limbs: [
      { x: 11, y: 22, w: 4, h: 9 },
      { x: 19, y: 22, w: 4, h: 9 },
      { x: 8, y: 4, w: 3, h: 13, shade: false },
      { x: 21, y: 4, w: 3, h: 13, shade: false },
    ],
  });

  definePose('loderunner/enemy/climb-0', 'enemy', {
    torso: { x: 13, y: 11, w: 6, h: 11 },
    limbs: [
      { x: 10, y: 20, w: 4, h: 11 },
      { x: 18, y: 22, w: 4, h: 9 },
      { x: 8, y: 6, w: 3, h: 12, shade: false },
      { x: 22, y: 12, w: 3, h: 8, shade: false },
    ],
  });

  definePose('loderunner/enemy/climb-1', 'enemy', {
    torso: { x: 13, y: 11, w: 6, h: 11 },
    limbs: [
      { x: 11, y: 22, w: 4, h: 9 },
      { x: 19, y: 20, w: 4, h: 11 },
      { x: 9, y: 12, w: 3, h: 8, shade: false },
      { x: 21, y: 6, w: 3, h: 12, shade: false },
    ],
  });

  definePose('loderunner/enemy/hang', 'enemy', {
    torso: { x: 13, y: 12, w: 6, h: 11 },
    head: { x: 13, y: 5, w: 8, h: 6 },
    limbs: [
      { x: 11, y: 22, w: 4, h: 9 },
      { x: 19, y: 22, w: 4, h: 9 },
      { x: 8, y: 4, w: 3, h: 13, shade: false },
      { x: 21, y: 4, w: 3, h: 13, shade: false },
    ],
  });
}

defineLodeRunnerExtras();

const TEXTURE_MAP = [
  { key: 'lr-tile-brick', tileId: 'loderunner/brick' },
  { key: 'lr-tile-solid', tileId: 'loderunner/solid' },
  { key: 'lr-tile-ladder', tileId: 'loderunner/ladder' },
  { key: 'lr-tile-rope', tileId: 'loderunner/rope' },
  { key: 'lr-tile-gold', tileId: 'loderunner/gold' },
  { key: 'lr-tile-exit', tileId: 'loderunner/exit' },
  { key: 'lr-runner-idle', tileId: 'loderunner/player/idle' },
  { key: 'lr-runner-run-0', tileId: 'loderunner/player/run-0' },
  { key: 'lr-runner-run-1', tileId: 'loderunner/player/run-1' },
  { key: 'lr-runner-run-2', tileId: 'loderunner/player/run-2' },
  { key: 'lr-runner-run-3', tileId: 'loderunner/player/run-3' },
  { key: 'lr-runner-climb-0', tileId: 'loderunner/player/climb-0' },
  { key: 'lr-runner-climb-1', tileId: 'loderunner/player/climb-1' },
  { key: 'lr-runner-hang', tileId: 'loderunner/player/hang' },
  { key: 'lr-guard-idle', tileId: 'loderunner/enemy/idle' },
  { key: 'lr-guard-run-0', tileId: 'loderunner/enemy/run-0' },
  { key: 'lr-guard-run-1', tileId: 'loderunner/enemy/run-1' },
  { key: 'lr-guard-run-2', tileId: 'loderunner/enemy/run-2' },
  { key: 'lr-guard-run-3', tileId: 'loderunner/enemy/run-3' },
  { key: 'lr-guard-climb-0', tileId: 'loderunner/enemy/climb-0' },
  { key: 'lr-guard-climb-1', tileId: 'loderunner/enemy/climb-1' },
  { key: 'lr-guard-hang', tileId: 'loderunner/enemy/hang' },
];

function addCanvasTexture(scene, key, canvas) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.addCanvas(key, canvas);
  if (texture && typeof Phaser !== 'undefined' && Phaser?.Textures?.FilterMode?.NEAREST != null) {
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}

export function ensureTextures(scene) {
  TEXTURE_MAP.forEach(({ key, tileId }) => {
    if (!scene.textures.exists(key)) {
      const canvas = tileFactory.get(tileId);
      addCanvasTexture(scene, key, canvas);
    }
  });
}
