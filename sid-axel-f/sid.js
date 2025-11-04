const BPM = 124;
const STEPS_PER_BEAT = 4; // 16th-note grid
const TOTAL_STEPS = 64; // four bars at 4/4 time
const STEP_TIME = (60 / BPM) / STEPS_PER_BEAT;
const SCHEDULE_AHEAD = 0.18; // seconds
const LOOK_AHEAD_MS = 25;

// Envelope helper to keep settings tidy.
const DEFAULT_ENV = { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.18 };

const leadEvents = expandEvents([
  { note: "F4", steps: 2, gate: 0.85 },
  { note: "G4", steps: 2, gate: 0.85 },
  { note: "C5", steps: 4, gate: 0.92 },
  { note: "F4", steps: 4, gate: 0.92 },
  { note: "F4", steps: 2, gate: 0.85 },
  { note: "G4", steps: 2, gate: 0.85 },
  { note: "D5", steps: 4, gate: 0.92 },
  { note: "F4", steps: 4, gate: 0.92 },
  { note: "F4", steps: 2, gate: 0.85 },
  { note: "G4", steps: 2, gate: 0.85 },
  { note: "C5", steps: 3, gate: 0.9 },
  { note: "A4", steps: 1, gate: 0.75 },
  { note: "G4", steps: 2, gate: 0.85 },
  { note: "F4", steps: 2, gate: 0.85 },
  { note: "C5", steps: 4, gate: 0.92 },
  { note: null, steps: 4 },
  { note: "F4", steps: 2, gate: 0.85 },
  { note: "G4", steps: 2, gate: 0.85 },
  { note: "D5", steps: 2, gate: 0.85 },
  { note: "F5", steps: 2, gate: 0.85 },
  { note: "E5", steps: 2, gate: 0.85 },
  { note: "D5", steps: 2, gate: 0.85 },
  { note: "C5", steps: 2, gate: 0.85 },
  { note: "A4", steps: 2, gate: 0.85 },
  { note: null, steps: 8 },
]);

const padEvents = expandEvents([
  { note: "F3", steps: 8, gate: 0.98, velocity: 0.8 },
  { note: "C4", steps: 8, gate: 0.9, velocity: 0.7 },
  { note: "A#2", steps: 8, gate: 0.95, velocity: 0.85 },
  { note: "C4", steps: 8, gate: 0.9, velocity: 0.7 },
  { note: "D#3", steps: 8, gate: 0.96, velocity: 0.8 },
  { note: "C4", steps: 8, gate: 0.9, velocity: 0.7 },
  { note: "A#2", steps: 8, gate: 0.95, velocity: 0.85 },
  { note: "A3", steps: 8, gate: 0.9, velocity: 0.8 },
]);

// Chaos/noise voice approximating the SID's drum tricks.
const drumPattern = Array.from({ length: TOTAL_STEPS }, (_, step) => {
  const hits = [];
  const stepInBar = step % 16;

  if (stepInBar === 0) hits.push({ type: "kick", level: 1 });
  if (stepInBar === 8) hits.push({ type: "snare", level: 0.85 });
  if (stepInBar === 12) hits.push({ type: "snare", level: 0.65 });
  if (step % 2 === 0) {
    hits.push({ type: "hat", level: step % 4 === 0 ? 0.45 : 0.3 });
  }

  return hits;
});

const grid = document.getElementById("grid");
const playButton = document.getElementById("play");
const stopButton = document.getElementById("stop");
const volumeSlider = document.getElementById("volume");

const gridCells = [[], [], []];
const highlightTimeouts = new Set();

let audioCtx = null;
let masterGain = null;
let schedulerId = null;
let isPlaying = false;

// Three SID-inspired channels: pulse lead, triangle pad, and chaos drums.
const voices = [
  {
    id: "lead",
    wave: "square",
    detune: 8,
    envelope: { ...DEFAULT_ENV, decay: 0.12, sustain: 0.5 },
    level: 0.22,
    filter: { base: 900, peak: 2200 },
    pattern: leadEvents,
  },
  {
    id: "pad",
    wave: "triangle",
    detune: -4,
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.65, release: 0.35 },
    level: 0.24,
    filter: { base: 500, peak: 1400 },
    pattern: padEvents,
  },
  {
    id: "drums",
    type: "drum",
    level: 0.4,
    pattern: drumPattern,
  },
];

buildGrid();

playButton.addEventListener("click", startPlayback);
stopButton.addEventListener("click", stopPlayback);
volumeSlider.addEventListener("input", () => {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(volumeSlider.valueAsNumber, audioCtx.currentTime, 0.05);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopPlayback();
  }
});

function startPlayback() {
  if (isPlaying) return;

  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  masterGain = audioCtx.createGain();
  masterGain.gain.value = volumeSlider.valueAsNumber;
  masterGain.connect(audioCtx.destination);

  const startTime = audioCtx.currentTime + 0.12;

  voices.forEach((voice, index) => {
    voice.index = index;
    voice.position = 0;
    voice.nextTime = startTime;
    voice.output = audioCtx.createGain();
    voice.output.gain.value = voice.level;
    voice.output.connect(masterGain);

    if (voice.type !== "drum") {
      voice.output.gain.value = voice.level;
    }
  });

  schedulerId = setInterval(scheduler, LOOK_AHEAD_MS);
  isPlaying = true;
  playButton.disabled = true;
  stopButton.disabled = false;
}

function stopPlayback() {
  if (!isPlaying) return;

  isPlaying = false;
  clearInterval(schedulerId);
  schedulerId = null;
  clearHighlights();

  if (masterGain) {
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(0.0001, now, 0.12);
    setTimeout(() => {
      masterGain.disconnect();
      masterGain = null;
    }, 220);
  }

  voices.forEach((voice) => {
    if (voice.output) {
      voice.output.disconnect();
      voice.output = null;
    }
  });

  playButton.disabled = false;
  stopButton.disabled = true;
}

function scheduler() {
  if (!audioCtx) return;

  voices.forEach((voice) => {
    if (voice.type === "drum") {
      while (voice.nextTime < audioCtx.currentTime + SCHEDULE_AHEAD) {
        scheduleDrumStep(voice);
      }
    } else {
      while (voice.nextTime < audioCtx.currentTime + SCHEDULE_AHEAD) {
        scheduleVoiceStep(voice);
      }
    }
  });
}

function scheduleVoiceStep(voice) {
  const stepIndex = voice.position;
  const step = voice.pattern[stepIndex];
  const time = voice.nextTime;

  markStep(voice.index, stepIndex);

  if (step && !step.rest && !step.tie && step.note) {
    const totalDuration = STEP_TIME * (step.steps || 1);
    const gate = step.gate ?? 0.9;
    const duration = totalDuration * gate;
    playNote(voice, step, time, duration, totalDuration);
  }

  advanceVoice(voice);
}

function scheduleDrumStep(voice) {
  const stepIndex = voice.position;
  const hits = voice.pattern[stepIndex];
  const time = voice.nextTime;

  if (hits.length > 0) {
    markStep(voice.index, stepIndex);
    hits.forEach((hit) => playDrum(hit, time));
  }

  advanceVoice(voice);
}

function advanceVoice(voice) {
  voice.position = (voice.position + 1) % TOTAL_STEPS;
  voice.nextTime += STEP_TIME;
}

function playNote(voice, step, time, duration, totalDuration) {
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();

  osc.type = voice.wave;
  osc.detune.value = voice.detune || 0;
  osc.frequency.setValueAtTime(noteToFrequency(step.note), time);

  const peak = step.velocity ? voice.level * step.velocity : voice.level;
  const env = voice.envelope;

  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), time + env.attack);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * env.sustain), time + env.attack + env.decay);
  amp.gain.setValueAtTime(Math.max(0.0001, peak * env.sustain), time + duration - env.release);
  amp.gain.linearRampToValueAtTime(0.0001, time + duration);

  let destination = amp;

  if (voice.filter) {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(voice.filter.base, time);
    filter.frequency.linearRampToValueAtTime(voice.filter.peak, time + env.attack + env.decay);
    filter.frequency.linearRampToValueAtTime(voice.filter.base, time + totalDuration);
    amp.connect(filter);
    destination = filter;
  }

  destination.connect(voice.output);

  osc.connect(amp);
  osc.start(time);
  osc.stop(time + totalDuration + 0.1);
}

function playDrum(hit, time) {
  const noise = createNoiseBuffer();
  const source = audioCtx.createBufferSource();
  source.buffer = noise;

  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  if (hit.type === "kick") {
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + 0.08);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.9 * hit.level, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
  } else if (hit.type === "snare") {
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.value = 1.5;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.6 * hit.level, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
  } else {
    filter.type = "highpass";
    filter.frequency.setValueAtTime(6000, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.35 * hit.level, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
  }

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  source.start(time);
  source.stop(time + 0.25);
}

let cachedNoise = null;
function createNoiseBuffer() {
  if (cachedNoise) return cachedNoise;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < channelData.length; i += 1) {
    channelData[i] = Math.random() * 2 - 1;
  }
  cachedNoise = buffer;
  return buffer;
}

function noteToFrequency(note) {
  const match = note.match(/^([A-G])([#b]?)(\d)$/);
  if (!match) return 0;
  const [, base, accidental, octaveStr] = match;
  const octave = Number(octaveStr);
  const semitoneMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitone = semitoneMap[base];
  if (accidental === "#") semitone += 1;
  if (accidental === "b") semitone -= 1;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

function expandEvents(events) {
  const expanded = [];
  events.forEach((event) => {
    const steps = Math.max(1, Math.floor(event.steps || 1));
    const gate = event.gate ?? 0.9;
    const velocity = event.velocity ?? 1;

    if (!event.note) {
      for (let i = 0; i < steps; i += 1) {
        expanded.push({ rest: true });
      }
      return;
    }

    expanded.push({
      note: event.note,
      steps,
      gate,
      velocity,
      tie: false,
    });

    for (let i = 1; i < steps; i += 1) {
      expanded.push({ note: event.note, tie: true, rest: false });
    }
  });

  while (expanded.length < TOTAL_STEPS) {
    expanded.push({ rest: true });
  }

  return expanded.slice(0, TOTAL_STEPS);
}

function buildGrid() {
  voices.forEach((voice, row) => {
    for (let step = 0; step < TOTAL_STEPS; step += 1) {
      const cell = document.createElement("span");
      const hasNote = voice.type === "drum"
        ? voice.pattern[step].length > 0
        : voice.pattern[step] && !voice.pattern[step].rest && !voice.pattern[step].tie;
      if (hasNote) {
        cell.dataset.hasNote = "true";
      }
      gridCells[row].push(cell);
      grid.appendChild(cell);
    }
  });
}

function markStep(row, step) {
  const cell = gridCells[row][step];
  if (!cell) return;
  cell.dataset.active = "true";
  const timeout = setTimeout(() => {
    cell.dataset.active = "false";
    highlightTimeouts.delete(timeout);
  }, STEP_TIME * 800);
  highlightTimeouts.add(timeout);
}

function clearHighlights() {
  highlightTimeouts.forEach((timeout) => clearTimeout(timeout));
  highlightTimeouts.clear();
  gridCells.flat().forEach((cell) => {
    cell.dataset.active = "false";
  });
}
