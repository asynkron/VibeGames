import { TILE } from './world.js';

function mkCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false; draw(ctx, w, h); return c;
}

function shade(ctx, w, h, color) {
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0, color);
  g.addColorStop(1, 'black');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
}

function brick(ctx, w, h) {
  ctx.fillStyle = '#6e6e6e'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle = '#515151';
  for (let y=0;y<h;y+=6) for (let x=((y/6)%2)*4;x<w;x+=8) ctx.fillRect(x,y,6,2);
}

function steel(ctx, w, h) {
  ctx.fillStyle = '#1a1f2b'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#334'; ctx.lineWidth = 1;
  ctx.strokeRect(0.5,0.5,w-1,h-1);
  ctx.strokeStyle = '#99a'; ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w,h); ctx.moveTo(w,0); ctx.lineTo(0,h); ctx.stroke(); ctx.globalAlpha = 1.0;
}

function dirt(ctx, w, h) {
  ctx.fillStyle = '#3b2b17'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle = '#5a4325';
  for (let i=0;i<40;i++) { const x = Math.random()*w|0; const y = Math.random()*h|0; ctx.fillRect(x,y,1,1); }
  ctx.globalAlpha = 0.2; ctx.fillStyle = '#a87a3a'; for (let i=0;i<12;i++){ const x=Math.random()*w|0, y=Math.random()*h|0; ctx.fillRect(x,y,1,1);} ctx.globalAlpha = 1;
}

function boulder(ctx, w, h) {
  ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(w/2, h/2, w*0.45, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(w/2+1, h/2+1, w*0.45, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ccc'; ctx.fillRect(w*0.55, h*0.28, 2, 2);
}

function gem(ctx, w, h, hue) {
  const c = `hsl(${hue},85%,60%)`;
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(w/2,2); ctx.lineTo(w-3,h/2); ctx.lineTo(w/2,h-2); ctx.lineTo(3,h/2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.stroke();
}

function keyTile(ctx, w, h) {
  ctx.fillStyle = '#14100a'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d4b84f';
  ctx.beginPath(); ctx.arc(w * 0.35, h * 0.55, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(w * 0.35, h * 0.48, w * 0.36, 2.4);
  ctx.fillRect(w * 0.62, h * 0.55, w * 0.16, 2.4);
  ctx.fillRect(w * 0.66, h * 0.49, 2, 3);
  ctx.fillRect(w * 0.7, h * 0.49, 2, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(w * 0.32, h * 0.48, 2, 2);
}

function doorClosed(ctx, w, h) {
  ctx.fillStyle = '#3b2110'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#522e15'; ctx.fillRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = '#2a170a'; ctx.fillRect(4, 2, 2, h - 4);
  ctx.fillRect(10, 2, 2, h - 4);
  ctx.fillStyle = '#cfa85a'; ctx.fillRect(w - 5, h / 2 - 1, 2, 2);
}

function doorOpen(ctx, w, h) {
  ctx.fillStyle = '#120a06'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = '#0a0402'; ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = 'rgba(140,90,40,0.25)'; ctx.fillRect(2, 2, w - 4, 3);
}

function exitClosed(ctx, w, h) {
  ctx.fillStyle = '#1a1f2b'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle = '#2f3d5c'; ctx.fillRect(2,2,w-4,h-4);
  ctx.fillStyle = '#111'; ctx.fillRect(w/2-2,3,4,h-6);
}

function exitOpen(ctx, w, h) {
  const g = ctx.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);
  g.addColorStop(0, 'rgba(100,255,180,0.9)'); g.addColorStop(1, 'rgba(20,40,30,0.05)');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
}

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
  const cache = new Map();
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

  function getSprite(tile, x, y, tick) {
    const key = `${tile}`;
    if (cache.has(key)) return cache.get(key);
    let c;
    if (tile === TILE.EMPTY) c = mkCanvas(16,16,(ctx)=>ctx.clearRect(0,0,16,16));
    else if (tile === TILE.DIRT) c = mkCanvas(16,16,dirt);
    else if (tile === TILE.WALL) c = mkCanvas(16,16,brick);
    else if (tile === TILE.STEEL) c = mkCanvas(16,16,steel);
    else if (tile === TILE.BOULDER) c = mkCanvas(16,16,boulder);
    else if (tile === TILE.GEM) c = mkCanvas(16,16,(ctx,w,h)=>gem(ctx,w,h, 160));
    else if (tile === TILE.KEY) c = mkCanvas(16,16,keyTile);
    else if (tile === TILE.DOOR_CLOSED) c = mkCanvas(16,16,doorClosed);
    else if (tile === TILE.DOOR_OPEN) c = mkCanvas(16,16,doorOpen);
    else if (tile === TILE.EXIT_CLOSED) c = mkCanvas(16,16,exitClosed);
    else if (tile === TILE.EXIT_OPEN) c = mkCanvas(16,16,exitOpen);
    cache.set(key, c); return c;
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
