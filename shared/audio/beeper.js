// Tiny WebAudio helper shared across games (lazy context, tone envelopes, unlock hooks).
const AudioCtor = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

function createContext(masterGain = 0.2) {
  if (!AudioCtor) return { ctx: null, master: null };
  const ctx = new AudioCtor();
  const master = ctx.createGain();
  master.gain.value = masterGain;
  master.connect(ctx.destination);
  return { ctx, master };
}

export function createBeeper(options = {}) {
  const { masterGain = 0.18 } = options;
  let ctx = null;
  let master = null;

  function ensureContext() {
    if (ctx) return ctx;
    const created = createContext(masterGain);
    ctx = created.ctx;
    master = created.master;
    return ctx;
  }

  async function resume() {
    const actx = ensureContext();
    if (!actx) return false;
    if (actx.state === 'suspended') {
      try {
        await actx.resume();
      } catch (_) {
        return false;
      }
    }
    return true;
  }

  function playTone(params = {}) {
    const { freq = 440, dur = 0.08, type = 'square', gain = 0.08, delay = 0 } = params;
    const actx = ensureContext();
    if (!actx || !master) return;
    if (actx.state === 'suspended') resume();

    const now = actx.currentTime + Math.max(0, delay);
    const osc = actx.createOscillator();
    const g = actx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.01, dur));

    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.1);
  }

  function sequence(steps = [], opts = {}) {
    const { startDelay = 0, gap = 0 } = opts;
    let cursor = Math.max(0, startDelay);
    for (const step of steps) {
      if (!step) continue;
      const { wait = 0, at = null, ...tone } = step;
      const baseDelay = at != null ? startDelay + at : cursor;
      const delay = (tone.delay || 0) + baseDelay;
      playTone({ ...tone, delay });
      const duration = tone.dur ?? 0.08;
      const next = baseDelay + duration + gap + wait;
      cursor = Math.max(cursor, next);
    }
  }

  function createPreset(base = {}) {
    return (overrides = {}) => playTone({ ...base, ...overrides });
  }

  function unlockWithGestures(target = window, events = ['pointerdown', 'keydown']) {
    if (!AudioCtor) return () => {};
    ensureContext();
    const handler = () => {
      resume();
      for (const evt of events) target.removeEventListener(evt, handler);
    };
    for (const evt of events) target.addEventListener(evt, handler, { passive: true });
    return () => {
      for (const evt of events) target.removeEventListener(evt, handler);
    };
  }

  return {
    get context() { return ctx; },
    ensure: ensureContext,
    resume,
    playTone,
    sequence,
    createPreset,
    unlockWithGestures,
  };
}

export function createSimpleBeeper(options) {
  const beeper = createBeeper(options);
  return Object.assign((freq, dur, type, gain) => beeper.playTone({ freq, dur, type, gain }), beeper);
}
