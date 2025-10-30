import { createNoisePainter } from './factory.js';

function blendStops(ctx, stops) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  return gradient;
}

function jitterDots(ctx, count, size, rng, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(rng() * ctx.canvas.width);
    const y = Math.floor(rng() * ctx.canvas.height);
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

function seededPainter(seed, paint) {
  return createNoisePainter(seed, paint);
}

export function paintDirtClassic(seed = 'dirt/classic') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#3b2b17';
    ctx.fillRect(0, 0, w, h);
    jitterDots(ctx, 36, 1, rng, '#5a4325');
    jitterDots(ctx, 16, 1, rng, '#8c6236', 0.6);
  });
}

export function paintDirtPebble(seed = 'dirt/pebble') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#302014';
    ctx.fillRect(0, 0, w, h);
    jitterDots(ctx, 48, 1, rng, '#5f4830');
    ctx.fillStyle = '#a37b47';
    for (let i = 0; i < 7; i += 1) {
      const x = Math.floor(rng() * (w - 4)) + 1;
      const y = Math.floor(rng() * (h - 4)) + 1;
      ctx.fillRect(x, y, 2 + (rng() > 0.5 ? 1 : 0), 1 + (rng() > 0.7 ? 1 : 0));
    }
  });
}

export function paintDirtMossy(seed = 'dirt/mossy') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#362514';
    ctx.fillRect(0, 0, w, h);
    jitterDots(ctx, 40, 1, rng, '#5b4022');
    ctx.fillStyle = '#3d5823';
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 12; i += 1) {
      const x = Math.floor(rng() * w);
      const y = Math.floor(rng() * (h - 4)) + 2;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#6e9338';
    ctx.fillRect(0, 0, w, 3);
    jitterDots(ctx, 14, 1, rng, '#88b949', 0.8);
  });
}

export function paintDirtGrassTop(seed = 'dirt/grass-top') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#3c2916';
    ctx.fillRect(0, 0, w, h);
    jitterDots(ctx, 32, 1, rng, '#5a4127');
    ctx.fillStyle = '#2e4f1a';
    ctx.fillRect(0, 0, w, 4);
    ctx.fillStyle = '#3f7f2c';
    for (let x = 0; x < w; x += 1) {
      const height = 3 + Math.floor(rng() * 2);
      ctx.fillRect(x, 0, 1, height);
    }
    ctx.fillStyle = '#7fd95d';
    jitterDots(ctx, 12, 1, rng, '#9cff7c', 0.8);
  });
}

export function paintGrassBright(seed = 'grass/bright') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#2f6b1f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4ea92f';
    for (let x = 0; x < w; x += 1) {
      const blade = 2 + Math.floor(rng() * 4);
      ctx.fillRect(x, h - blade, 1, blade);
    }
    jitterDots(ctx, 10, 1, rng, '#9bff66', 0.6);
  });
}

export function paintGrassSparse(seed = 'grass/sparse') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#27411a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3e6b28';
    for (let x = 0; x < w; x += 2) {
      const blade = 2 + Math.floor(rng() * 6);
      ctx.fillRect(x, h - blade, 1, blade);
    }
    jitterDots(ctx, 6, 1, rng, '#6cb74a', 0.7);
  });
}

export function paintStoneBlock(seed = 'stone/block') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#5f5f6a');
    gradient.addColorStop(1, '#3a3a44');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(1, h / 2);
    ctx.lineTo(w - 1, h / 2);
    ctx.moveTo(w / 2, 1);
    ctx.lineTo(w / 2, h - 1);
    ctx.stroke();
    jitterDots(ctx, 18, 1, rng, 'rgba(255,255,255,0.08)');
  });
}

export function paintStoneGranite(seed = 'stone/granite') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#494b54';
    ctx.fillRect(0, 0, w, h);
    jitterDots(ctx, 50, 1, rng, '#6d7079');
    jitterDots(ctx, 30, 1, rng, '#2f3038');
  });
}

export function paintStoneRuins(seed = 'stone/ruins') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#383940';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#26272d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 4, 0);
    ctx.lineTo(w / 4, h);
    ctx.moveTo((w * 3) / 4, 0);
    ctx.lineTo((w * 3) / 4, h);
    ctx.stroke();
    jitterDots(ctx, 16, 1, rng, '#6a7840', 0.6);
  });
}

export function paintWaterShallow(seed = 'water/shallow') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    const gradient = blendStops(ctx, [
      [0, '#1a6ccf'],
      [1, '#0e3b91'],
    ]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      const y = 3 + i * 4 + Math.floor(rng() * 2);
      ctx.beginPath();
      ctx.moveTo(1, y);
      ctx.quadraticCurveTo(w / 2, y - 1, w - 1, y);
      ctx.stroke();
    }
  });
}

export function paintWaterDeep(seed = 'water/deep') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, '#04335f');
    gradient.addColorStop(1, '#021126');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    jitterDots(ctx, 20, 1, rng, 'rgba(255,255,255,0.18)');
  });
}

export function paintWaterFoam(seed = 'water/foam') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#0e4a96';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      const y = Math.floor(rng() * h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(w / 2, y + (rng() * 2 - 1) * 2, w, y);
      ctx.stroke();
    }
    jitterDots(ctx, 14, 1, rng, '#d9f7ff', 0.7);
  });
}

export function paintSandWarm(seed = 'sand/warm') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    const gradient = blendStops(ctx, [
      [0, '#f7d58b'],
      [1, '#e6a95e'],
    ]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    jitterDots(ctx, 18, 1, rng, '#c98c44', 0.8);
    jitterDots(ctx, 12, 1, rng, '#fff1c6', 0.6);
  });
}

export function paintSandCool(seed = 'sand/cool') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#d4c5aa';
    ctx.fillRect(0, 0, w, h);
    jitterDots(ctx, 18, 1, rng, '#b29c74', 0.7);
    jitterDots(ctx, 9, 1, rng, '#fef5e2', 0.7);
  });
}

export function paintPatternChecker(seed = 'pattern/checker') {
  return (ctx, w, h) => {
    ctx.fillStyle = '#2e2e38';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4c4c5c';
    for (let y = 0; y < h; y += 4) {
      for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < w; x += 4) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  };
}

export function paintPatternDiamond(seed = 'pattern/diamond') {
  return (ctx, w, h) => {
    ctx.fillStyle = '#1c1f44';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3b4fd1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w, h / 2);
    ctx.lineTo(w / 2, h);
    ctx.lineTo(0, h / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 2);
    ctx.lineTo(w - 2, h / 2);
    ctx.lineTo(w / 2, h - 2);
    ctx.lineTo(2, h / 2);
    ctx.closePath();
    ctx.stroke();
  };
}

export function paintPatternWaves(seed = 'pattern/waves') {
  return (ctx, w, h) => {
    ctx.fillStyle = '#1a1e33';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2f91ff';
    ctx.lineWidth = 1;
    for (let y = 2; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(w / 2, y - 2, w, y);
      ctx.stroke();
    }
  };
}

export function paintMetalPanel(seed = 'metal/panel') {
  return (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#6f7684');
    gradient.addColorStop(1, '#3f424a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const rivet = 2;
    ctx.fillRect(2, 2, rivet, rivet);
    ctx.fillRect(w - rivet - 2, 2, rivet, rivet);
    ctx.fillRect(2, h - rivet - 2, rivet, rivet);
    ctx.fillRect(w - rivet - 2, h - rivet - 2, rivet, rivet);
  };
}

export function paintMetalRiveted(seed = 'metal/riveted') {
  return (ctx, w, h) => {
    ctx.fillStyle = '#4e565f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2c3138';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.fillStyle = '#222831';
    for (let i = 0; i < 4; i += 1) {
      const x = (i % 2 === 0 ? 2 : w - 4);
      const y = i < 2 ? 2 : h - 4;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(1, h / 2);
    ctx.lineTo(w - 1, h / 2);
    ctx.stroke();
  };
}

export function paintMetalGrate(seed = 'metal/grate') {
  return (ctx, w, h) => {
    ctx.fillStyle = '#22252c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4d5460';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.fillStyle = '#6e7684';
    for (let x = 0; x < w; x += 4) {
      ctx.fillRect(x, 0, 1, h);
    }
  };
}

export function paintWoodPlanks(seed = 'wood/planks') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    ctx.fillStyle = '#8b5529';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a86c37';
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#71401e';
    ctx.fillRect(0, h / 2, w, h / 2);
    ctx.strokeStyle = '#43230f';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    jitterDots(ctx, 10, 1, rng, '#5d2f13', 0.8);
  });
}

export function paintLava(seed = 'lava') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    const gradient = blendStops(ctx, [
      [0, '#ff6b1a'],
      [0.5, '#ff2d00'],
      [1, '#610000'],
    ]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = Math.floor((Math.sin((x / w) * Math.PI * 2) + 1) * (h / 4)) + h / 4;
      ctx.lineTo(x, y + rng() * 2 - 1);
    }
    ctx.stroke();
  });
}

export function paintIce(seed = 'ice') {
  return seededPainter(seed, (ctx, w, h, rng) => {
    const gradient = blendStops(ctx, [
      [0, '#a6f0ff'],
      [1, '#3f91ff'],
    ]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w / 3, h / 2);
    ctx.lineTo((2 * w) / 3, h);
    ctx.lineTo(w, h / 3);
    ctx.stroke();
    jitterDots(ctx, 10, 1, rng, '#ffffff', 0.7);
  });
}

export function paintCircuit(seed = 'pattern/circuit') {
  return (ctx, w, h) => {
    ctx.fillStyle = '#062b2d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0fbab1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, h - 2);
    ctx.lineTo(2, 2);
    ctx.lineTo(w - 2, 2);
    ctx.moveTo(w / 2, 2);
    ctx.lineTo(w / 2, h - 2);
    ctx.moveTo(2, h / 2);
    ctx.lineTo(w - 2, h / 2);
    ctx.stroke();
  };
}

export function paintCrystal(seed = 'crystal') {
  return (ctx, w, h) => {
    ctx.fillStyle = '#120a1f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7c4dff';
    ctx.beginPath();
    ctx.moveTo(w / 2, 2);
    ctx.lineTo(w - 3, h / 2);
    ctx.lineTo(w / 2, h - 2);
    ctx.lineTo(3, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(w / 2 - 1, 4, 1, 4);
  };
}

export function paintBrickIndustrial() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#6e6e6e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#515151';
    for (let y = 0; y < h; y += 6) {
      for (let x = ((y / 6) % 2) * 4; x < w; x += 8) {
        ctx.fillRect(x, y, 6, 2);
      }
    }
  };
}

export function paintSteelPlate() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#1a1f2b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.strokeStyle = '#99a';
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.moveTo(w, 0);
    ctx.lineTo(0, h);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
}

export function paintBoulderRound() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(w / 2 + 1, h / 2 + 1, w * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.fillRect(w * 0.55, h * 0.28, 2, 2);
  };
}

export function createGemPainter({ hue = 160 } = {}) {
  return (ctx, w, h) => {
    const color = `hsl(${hue},85%,60%)`;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(w / 2, 2);
    ctx.lineTo(w - 3, h / 2);
    ctx.lineTo(w / 2, h - 2);
    ctx.lineTo(3, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
}

export function paintKeyTile() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#14100a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d4b84f';
    ctx.beginPath();
    ctx.arc(w * 0.35, h * 0.55, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.35, h * 0.48, w * 0.36, 2.4);
    ctx.fillRect(w * 0.62, h * 0.55, w * 0.16, 2.4);
    ctx.fillRect(w * 0.66, h * 0.49, 2, 3);
    ctx.fillRect(w * 0.7, h * 0.49, 2, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(w * 0.32, h * 0.48, 2, 2);
  };
}

export function paintDoorClosed() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#3b2110';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#522e15';
    ctx.fillRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = '#2a170a';
    ctx.fillRect(4, 2, 2, h - 4);
    ctx.fillRect(10, 2, 2, h - 4);
    ctx.fillStyle = '#cfa85a';
    ctx.fillRect(w - 5, h / 2 - 1, 2, 2);
  };
}

export function paintDoorOpen() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#120a06';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#5a3416';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = '#0a0402';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(140,90,40,0.25)';
    ctx.fillRect(2, 2, w - 4, 3);
  };
}

export function paintExitClosed() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#1a1f2b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f3d5c';
    ctx.fillRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = '#111';
    ctx.fillRect(w / 2 - 2, 3, 4, h - 6);
  };
}

export function paintExitOpen() {
  return (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(100,255,180,0.9)');
    gradient.addColorStop(1, 'rgba(20,40,30,0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };
}
