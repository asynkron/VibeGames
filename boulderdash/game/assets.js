import { createTileFactory, mkCanvas } from '../../shared/render/tile-forge/factory.js';
import { registerStandardTiles } from '../../shared/render/tile-forge/standardTiles.js';
import { TILE } from './world.js';

function playerSprite(frame) {
  const c = mkCanvas(16,16,(ctx,w,h)=>{
    ctx.fillStyle = '#f7d21b';
    ctx.fillRect(5,4,6,8);
    ctx.fillStyle = '#222'; ctx.fillRect(6,6,1,1); ctx.fillRect(9,6,1,1);
    ctx.fillStyle = '#ffef6a'; ctx.fillRect(6,10,4,2);
    // arms/legs wiggle
    if ((frame>>2)%2===0) { ctx.fillStyle = '#d7b10f'; ctx.fillRect(4,12,8,2); ctx.fillRect(6,14,4,2); }
    else { ctx.fillStyle = '#d7b10f'; ctx.fillRect(5,12,6,2); ctx.fillRect(6,14,4,2);}    
  });
  return c;
}

function fireflyFrame(phase) {
  return mkCanvas(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#1a1406'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = phase === 0 ? '#ffe97a' : '#ffc23d';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 4 + (phase === 0 ? 1 : 0), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffdc7'; ctx.fillRect(w / 2 - 1, h / 2 - 5, 2, 2);
    ctx.fillRect(w / 2 - 1, h / 2 + 3, 2, 2);
  });
}

function butterflyFrame(phase) {
  return mkCanvas(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#051028'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9be1ff';
    const wingOffset = phase === 0 ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(3, 8); ctx.quadraticCurveTo(3, wingOffset, 8, 8); ctx.quadraticCurveTo(3, h - wingOffset, 3, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w - 3, 8); ctx.quadraticCurveTo(w - 3, wingOffset, 8, 8); ctx.quadraticCurveTo(w - 3, h - wingOffset, w - 3, 8); ctx.fill();
    ctx.fillStyle = '#cbeeff'; ctx.fillRect(7, 4, 2, 8);
    ctx.fillStyle = '#ffe1ff'; ctx.fillRect(6, 6, 1, 4);
    ctx.fillRect(9, 6, 1, 4);
  });
}

function explosionFrame(colors) {
  return mkCanvas(16, 16, (ctx, w, h) => {
    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, w, h);
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, colors.inner);
    gradient.addColorStop(1, colors.outer);
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2); ctx.fill();
    if (colors.spark) {
      ctx.fillStyle = colors.spark;
      ctx.fillRect(w / 2 - 4, h / 2 - 1, 2, 2);
      ctx.fillRect(w / 2 + 2, h / 2 - 1, 2, 2);
    }
  });
}

export function createAssets() {
  const tiles = registerStandardTiles(createTileFactory({ size: 16 }));

  // Map the numeric world tile ids to the Tile Forge identifiers so we can
  // reuse the shared painter definitions instead of maintaining bespoke art.
  const tileLookup = {
    [TILE.DIRT]: 'dirt/classic',
    [TILE.WALL]: 'stone/brick',
    [TILE.STEEL]: 'metal/plate',
    [TILE.BOULDER]: 'boulder/round',
    [TILE.GEM]: 'gem/emerald',
    [TILE.KEY]: 'key/golden',
    [TILE.DOOR_CLOSED]: 'door/closed',
    [TILE.DOOR_OPEN]: 'door/open',
    [TILE.EXIT_CLOSED]: 'exit/closed',
    [TILE.EXIT_OPEN]: 'exit/open',
  };

  // Empty tiles still need a cached transparent canvas so we can quickly draw
  // them without branching elsewhere in the renderer.
  const emptySprite = mkCanvas(16, 16, (ctx, w, h) => ctx.clearRect(0, 0, w, h));
  const enemyFrames = {
    FIREFLY: [fireflyFrame(0), fireflyFrame(1)],
    BUTTERFLY: [butterflyFrame(0), butterflyFrame(1)],
  };
  const explosionFrames = {
    FIRE: [
      explosionFrame({ bg: '#2b1200', inner: 'rgba(255,210,120,0.85)', outer: 'rgba(120,40,0,0.4)', spark: '#ffe1a0' }),
      explosionFrame({ bg: '#200800', inner: 'rgba(255,165,65,0.9)', outer: 'rgba(100,24,0,0.35)', spark: '#ffefc4' }),
      explosionFrame({ bg: '#120200', inner: 'rgba(255,120,40,0.75)', outer: 'rgba(60,10,0,0.4)' }),
    ],
    BUTTER: [
      explosionFrame({ bg: '#04111c', inner: 'rgba(170,240,255,0.85)', outer: 'rgba(40,120,160,0.4)', spark: '#ffffff' }),
      explosionFrame({ bg: '#03101a', inner: 'rgba(130,220,255,0.9)', outer: 'rgba(30,90,150,0.4)', spark: '#dff6ff' }),
      explosionFrame({ bg: '#020b14', inner: 'rgba(90,180,255,0.8)', outer: 'rgba(20,70,120,0.45)' }),
    ],
  };

  function getSprite(tile, _x, _y, _tick) {
    if (tile === TILE.EMPTY) return emptySprite;
    const key = tileLookup[tile];
    if (key) return tiles.get(key);
    if (tiles.has(tile)) return tiles.get(tile);
    return null;
  }

  function player(tick) { return playerSprite(tick); }

  function enemy(type, tick = 0) {
    const frames = enemyFrames[type];
    if (!frames) return null;
    const index = Math.floor(tick / 6) % frames.length;
    return frames[index];
  }

  function explosion(kind, stage = 0) {
    const frames = explosionFrames[kind === 'BUTTER' ? 'BUTTER' : 'FIRE'];
    if (!frames) return null;
    const idx = Math.max(0, Math.min(frames.length - 1, Math.floor(stage)));
    return frames[idx];
  }

  return { getSprite, player, enemy, explosion };
}
