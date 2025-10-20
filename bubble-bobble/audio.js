let ctx = null;
function ensureCtx() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  return ctx;
}
function now() { const c = ensureCtx(); return c ? c.currentTime : 0; }
function env(g, t0, a=0.005, d=0.07, s=0.0, r=0.08, peak=0.9) {
  const t = now();
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, s), t + a + d);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
}
function beep(freqStart, freqEnd, dur=0.12, type='square', vol=0.15) {
  const c = ensureCtx(); if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freqStart, c.currentTime);
  if (freqEnd !== freqStart) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), c.currentTime + dur);
  env(g, c.currentTime, 0.003, dur*0.7, 0.0001, Math.max(0.03, dur*0.3), vol);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.1);
}
export function playJump()    { beep(400, 320, 0.12, 'square', 0.18); }
export function playBubble()  { beep(660, 880, 0.10, 'sine',   0.12); }
export function playPop()     { beep(220, 140, 0.08, 'triangle',0.16); }
export function playPickup()  { beep(500, 760, 0.14, 'square', 0.14); }
export function playCapture() { beep(300, 240, 0.16, 'sawtooth',0.12); }

// Music handling
const music = { buffer: null, gain: null, source: null, volume: 0.25, muted: false, paused: false };
function startMusicSource() {
  const c = ensureCtx(); if (!c || !music.buffer) return;
  if (music.source) { try { music.source.stop(); } catch (_) {} }
  const s = c.createBufferSource();
  s.buffer = music.buffer;
  s.loop = true;
  if (!music.gain) music.gain = c.createGain();
  const target = (music.muted || music.paused) ? 0 : music.volume;
  music.gain.gain.setValueAtTime(target, c.currentTime);
  s.connect(music.gain).connect(c.destination);
  s.start();
  music.source = s;
}
export async function loadAndLoopMusic(url) {
  const c = ensureCtx(); if (!c) return;
  try {
    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    const buf = await c.decodeAudioData(ab);
    music.buffer = buf;
    startMusicSource();
  } catch (e) {
    console.warn('Music load failed', e);
  }
}
export function toggleMusicMute() {
  const c = ensureCtx(); if (!c) return;
  music.muted = !music.muted;
  if (music.gain) music.gain.gain.setTargetAtTime((music.muted || music.paused) ? 0 : music.volume, c.currentTime, 0.03);
}
export function setMusicVolume(v) {
  const c = ensureCtx(); if (!c) return;
  music.volume = Math.max(0, Math.min(1, v));
  if (music.gain) music.gain.gain.setTargetAtTime((music.muted || music.paused) ? 0 : music.volume, c.currentTime, 0.03);
}
export function setMusicPaused(paused) {
  const c = ensureCtx(); if (!c) return;
  music.paused = !!paused;
  if (music.gain) music.gain.gain.setTargetAtTime((music.muted || music.paused) ? 0 : music.volume, c.currentTime, 0.03);
}
// Prime audio on first user gesture (resume suspended contexts)
export function primeOnFirstKeydown(target = window) {
  const handler = () => {
    const c = ensureCtx(); if (c && c.state === 'suspended') c.resume();
    target.removeEventListener('keydown', handler);
  };
  target.addEventListener('keydown', handler, { once: true });
}
