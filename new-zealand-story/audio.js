import { createBeeper } from '../shared/audio/beeper.js';

const beeper = createBeeper({ masterGain: 0.2 });

export const playJump = () => beeper.playTone({ freq: 420, dur: 0.14, type: 'square', gain: 0.22 });
export const playFlap = () => beeper.playTone({ freq: 640, dur: 0.08, type: 'square', gain: 0.15 });
export const playArrow = () => beeper.playTone({ freq: 860, dur: 0.12, type: 'sawtooth', gain: 0.14 });
export const playCollect = () => beeper.sequence([
  { freq: 620, dur: 0.08, type: 'triangle', gain: 0.16 },
  { freq: 880, dur: 0.09, type: 'triangle', gain: 0.16, wait: 0.02 },
]);
export const playHit = () => beeper.playTone({ freq: 240, dur: 0.18, type: 'square', gain: 0.24 });
export const playSplash = () => beeper.playTone({ freq: 160, dur: 0.22, type: 'triangle', gain: 0.2 });

let musicTimer = null;
let musicMuted = false;
let musicPaused = false;

const THEME_STEPS = [
  { freq: 330, dur: 0.18, type: 'triangle', gain: 0.12 },
  { freq: 392, dur: 0.18, type: 'triangle', gain: 0.12, wait: 0.04 },
  { freq: 523, dur: 0.22, type: 'square', gain: 0.11, wait: 0.02 },
  { freq: 659, dur: 0.25, type: 'square', gain: 0.12, wait: 0.04 },
  { freq: 523, dur: 0.18, type: 'triangle', gain: 0.1, wait: 0.08 },
  { freq: 392, dur: 0.18, type: 'triangle', gain: 0.1 },
  { freq: 659, dur: 0.22, type: 'sawtooth', gain: 0.11, wait: 0.08 },
  { freq: 784, dur: 0.2, type: 'triangle', gain: 0.1, wait: 0.04 },
];

function loopTheme() {
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  if (musicMuted || musicPaused) return;
  beeper.sequence(THEME_STEPS, { gap: 0.04 });
  musicTimer = setTimeout(loopTheme, 3600);
}

export function startMusic() {
  musicPaused = false;
  if (!musicMuted) loopTheme();
}

export function stopMusic() {
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  musicPaused = true;
}

export function setMusicPaused(paused) {
  musicPaused = !!paused;
  if (musicPaused) {
    stopMusic();
  } else {
    loopTheme();
  }
}

export function toggleMusicMute() {
  musicMuted = !musicMuted;
  if (musicMuted) {
    stopMusic();
  } else if (!musicPaused) {
    loopTheme();
  }
}

export function primeAudio(target = window) {
  return beeper.unlockWithGestures(target);
}
