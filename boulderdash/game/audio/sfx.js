import { ensureUnlocked, playSequence } from '../../../shared/audio/beep.js';

const SFX = {
  explosion: [
    { freq: 120, dur: 0.12, type: 'square', gain: 0.07 },
  ],
  butterSparkle: [
    { freq: 660, dur: 0.08, type: 'sine', gain: 0.05 },
    { freq: 880, dur: 0.08, type: 'sine', gain: 0.04, delay: 0.06 },
  ],
  magicActivate: [
    { freq: 440, dur: 0.2, type: 'sawtooth', gain: 0.04 },
  ],
};

export function sfxExplosion() {
  ensureUnlocked();
  playSequence(SFX.explosion);
}

export function sfxButterSparkle() {
  ensureUnlocked();
  playSequence(SFX.butterSparkle);
}

export function sfxMagicActivate() {
  ensureUnlocked();
  playSequence(SFX.magicActivate);
}

export function unlockAudio() {
  ensureUnlocked();
}
