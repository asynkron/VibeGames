import { createBeeper } from '../../../shared/audio/beeper.js';

export function createAudio() {
  const beeper = createBeeper({ masterGain: 0.08 });
  beeper.unlockWithGestures();

  return {
    collect() {
      beeper.sequence([
        { freq: 880, dur: 0.09, type: 'square', gain: 0.2 },
        { freq: 1320, dur: 0.06, type: 'square', gain: 0.15, at: 0.08 },
      ]);
    },
    push() {
      beeper.playTone({ freq: 220, dur: 0.04, type: 'triangle', gain: 0.12 });
    },
    exitOpen() {
      beeper.sequence([
        { freq: 660, dur: 0.12, type: 'square', gain: 0.2 },
        { freq: 990, dur: 0.12, type: 'square', gain: 0.2, at: 0.08 },
      ]);
    },
    win() {
      beeper.sequence([
        { freq: 523.25, dur: 0.12, gain: 0.18 },
        { freq: 659.25, dur: 0.12, gain: 0.18, at: 0.12 },
        { freq: 783.99, dur: 0.2, gain: 0.2, at: 0.24 },
      ]);
    },
    die() {
      beeper.playTone({ freq: 220, dur: 0.25, type: 'sawtooth', gain: 0.22 });
    },
  };
}
