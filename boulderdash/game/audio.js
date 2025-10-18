import { ensureUnlocked, playSequence, setMasterVolume } from '../../shared/audio/beep.js';

const SEQUENCES = {
  collect: [
    { freq: 880, dur: 0.09, type: 'square', gain: 0.2 },
    { freq: 1320, dur: 0.06, type: 'square', gain: 0.15, delay: 0.02 },
  ],
  push: [
    { freq: 220, dur: 0.04, type: 'triangle', gain: 0.12 },
  ],
  exitOpen: [
    { freq: 660, dur: 0.12, type: 'square', gain: 0.2 },
    { freq: 990, dur: 0.12, type: 'square', gain: 0.2, delay: 0.08 },
  ],
  win: [
    { freq: 523.25, dur: 0.12, type: 'square', gain: 0.18 },
    { freq: 659.25, dur: 0.12, type: 'square', gain: 0.18, delay: 0.12 },
    { freq: 783.99, dur: 0.2, type: 'square', gain: 0.2, delay: 0.24 },
  ],
  die: [
    { freq: 220, dur: 0.25, type: 'sawtooth', gain: 0.22 },
  ],
};

export function createAudio() {
  setMasterVolume(0.08);
  ensureUnlocked();
  return {
    collect() { ensureUnlocked(); playSequence(SEQUENCES.collect); },
    push() { ensureUnlocked(); playSequence(SEQUENCES.push); },
    exitOpen() { ensureUnlocked(); playSequence(SEQUENCES.exitOpen); },
    win() { ensureUnlocked(); playSequence(SEQUENCES.win); },
    die() { ensureUnlocked(); playSequence(SEQUENCES.die); },
  };
}
