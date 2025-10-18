import { createBeeper } from '../../../shared/audio/beeper.js';

const beeper = createBeeper({ masterGain: 0.12 });
beeper.unlockWithGestures();

function burst(freq, dur, type = 'square', gain = 0.05) {
  beeper.playTone({ freq, dur, type, gain });
}

export function sfxExplosion() { burst(120, 0.12, 'square', 0.07); }
export function sfxButterSparkle() {
  burst(660, 0.08, 'sine', 0.05);
  beeper.sequence([{ freq: 880, dur: 0.08, type: 'sine', gain: 0.04, at: 0.06 }]);
}
export function sfxMagicActivate() { burst(440, 0.2, 'sawtooth', 0.04); }
export function unlockAudio() { beeper.resume(); }
