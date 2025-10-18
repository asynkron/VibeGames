const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

let ctx = null;
let master = null;
let unlocked = false;
let masterGainValue = 0.12;
let unlockListenersAttached = false;

function getContext() {
  if (!AudioContextCtor) return null;
  if (!ctx) {
    ctx = new AudioContextCtor();
    master = ctx.createGain();
    master.gain.value = masterGainValue;
    master.connect(ctx.destination);
  }
  return ctx;
}

function attachUnlockListeners() {
  if (unlockListenersAttached) return;
  unlockListenersAttached = true;
  const events = ['pointerdown', 'touchstart', 'keydown'];
  const handler = () => {
    resumeContext();
    if (ctx?.state === 'running') {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(master);
        source.start(0);
        unlocked = true;
      } catch (_) {
        /* ignored */
      }
    }
    if (!unlocked) {
      // Try again on the next gesture if unlocking still failed.
      events.forEach(evt => {
        window.addEventListener(evt, handler, { once: true });
      });
    }
  };
  events.forEach(evt => {
    window.addEventListener(evt, handler, { once: true });
  });
}

export function setMasterVolume(value) {
  masterGainValue = value;
  if (master) master.gain.value = value;
}

export function getAudioContext() {
  return getContext();
}

export function resumeContext() {
  const actx = getContext();
  if (!actx) return false;
  if (actx.state === 'suspended') {
    actx.resume().catch(() => {});
    return false;
  }
  return true;
}

export function ensureUnlocked() {
  const actx = getContext();
  if (!actx) return false;
  if (actx.state === 'suspended') {
    actx.resume().catch(() => {});
  }
  if (!unlocked && actx.state === 'running') {
    try {
      const buffer = actx.createBuffer(1, 1, 22050);
      const source = actx.createBufferSource();
      source.buffer = buffer;
      source.connect(master);
      source.start(0);
      unlocked = true;
    } catch (_) {
      /* ignored */
    }
  }
  if (!unlocked) attachUnlockListeners();
  return unlocked || actx.state === 'running';
}

function resolveNoteDefaults(note = {}) {
  return {
    frequency: note.frequency ?? note.freq ?? 440,
    duration: note.duration ?? note.dur ?? 0.08,
    type: note.type ?? note.wave ?? 'square',
    gain: note.gain ?? note.volume ?? 0.08,
    delay: note.delay ?? 0,
  };
}

export function playSequence(notes = [], options = {}) {
  const actx = getContext();
  if (!actx) return;
  ensureUnlocked();
  const channel = options.channel ?? master;
  if (!channel) return;
  const start = options.startAt ?? actx.currentTime;
  const masterBefore = channel.gain.value;
  if (typeof options.masterGain === 'number') {
    channel.gain.value = options.masterGain;
  }
  for (const raw of notes) {
    const { frequency, duration, type, gain, delay } = resolveNoteDefaults(raw);
    const when = start + delay;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(Math.max(gain, 0.0001), when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(g).connect(channel);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }
  if (typeof options.masterGain === 'number') {
    channel.gain.setValueAtTime(masterBefore, actx.currentTime);
  }
}

export default {
  ensureUnlocked,
  playSequence,
  setMasterVolume,
  getAudioContext,
  resumeContext,
};
