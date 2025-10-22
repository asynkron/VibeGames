// Shared CRT settings controller used across games.
// Exposes a small slider/checkbox panel with persistence and change callbacks.
import {
  DEFAULT_SCANLINE_ALPHA_RANGE,
  createDefaultCrtSettings,
} from '../config/display.js';
import { clamp01 } from '../utils/math.js';

const DEFAULTS = Object.freeze(createDefaultCrtSettings());

function loadState(storageKey, defaults) {
  const state = { ...DEFAULTS, ...defaults };
  if (!storageKey) return state;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return state;
    const saved = JSON.parse(raw);
    if (typeof saved !== 'object' || saved === null) return state;
    if ('enabled' in saved) state.enabled = !!saved.enabled;
    if ('warp' in saved) state.warp = clamp01(saved.warp);
    if ('aberration' in saved) state.aberration = clamp01(saved.aberration);
    if ('aberrationOpacity' in saved) {
      state.aberrationOpacity = clamp01(saved.aberrationOpacity);
    }
    if ('scanlines' in saved) state.scanlines = clamp01(saved.scanlines);
  } catch (_) {
    // Ignore persistence errors (private mode, etc.).
  }
  return state;
}

function persistState(storageKey, state) {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (_) {
    // Ignore persistence errors.
  }
}

function createRow(labelText, input) {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '6px';
  row.style.marginBottom = '4px';

  const label = document.createElement('label');
  label.textContent = labelText;
  label.style.flex = '1 1 auto';
  label.style.fontSize = '10px';
  label.style.letterSpacing = '0.05em';
  row.appendChild(label);
  row.appendChild(input);
  return row;
}

export function createCrtControls({
  storageKey = 'crt-controls',
  defaults = {},
  parent = document.body,
  position = 'top-right',
  title = 'CRT Adjust',
  onChange,
} = {}) {
  const listeners = new Set();
  if (typeof onChange === 'function') listeners.add(onChange);

  const state = loadState(storageKey, defaults);

  const panel = document.createElement('div');
  panel.className = 'crt-control-panel';
  panel.style.position = 'absolute';
  panel.style.zIndex = '1200';
  panel.style.minWidth = '170px';
  panel.style.padding = '6px 8px';
  panel.style.borderRadius = '6px';
  panel.style.border = '1px solid rgba(160, 200, 255, 0.28)';
  panel.style.background = 'rgba(0, 0, 0, 0.45)';
  panel.style.backdropFilter = 'blur(2px)';
  panel.style.font = '10px monospace';
  panel.style.color = '#aee';
  panel.style.userSelect = 'none';
  panel.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';

  const pos = (position || '').toLowerCase();
  if (pos.includes('bottom')) {
    panel.style.bottom = '8px';
  } else {
    panel.style.top = '8px';
  }
  if (pos.includes('left')) {
    panel.style.left = '8px';
  } else {
    panel.style.right = '8px';
  }

  if (title) {
    const header = document.createElement('div');
    header.textContent = title;
    header.style.fontSize = '11px';
    header.style.fontWeight = '600';
    header.style.letterSpacing = '0.08em';
    header.style.marginBottom = '6px';
    header.style.color = '#cfe';
    panel.appendChild(header);
  }

  const warp = document.createElement('input');
  warp.type = 'range';
  warp.min = '0';
  warp.max = '0.5';
  warp.step = '0.005';
  warp.value = String(state.warp);
  warp.style.flex = '0 0 96px';

  const aberration = document.createElement('input');
  aberration.type = 'range';
  aberration.min = '0';
  aberration.max = '0.35';
  aberration.step = '0.005';
  aberration.value = String(state.aberration);
  aberration.style.flex = '0 0 96px';

  const aberrationOpacity = document.createElement('input');
  aberrationOpacity.type = 'range';
  aberrationOpacity.min = '0';
  aberrationOpacity.max = '1';
  aberrationOpacity.step = '0.01';
  aberrationOpacity.value = String(state.aberrationOpacity);
  aberrationOpacity.style.flex = '0 0 96px';

  const scanlines = document.createElement('input');
  scanlines.type = 'range';
  scanlines.min = '0';
  scanlines.max = '1';
  scanlines.step = '0.01';
  scanlines.value = String(state.scanlines);
  scanlines.style.flex = '0 0 96px';

  const clampFromInput = (value, input) => {
    const minValue = Number.isFinite(Number(input.min)) ? Number(input.min) : 0;
    const maxValue = Number.isFinite(Number(input.max)) ? Number(input.max) : 1;
    const min = Math.min(minValue, maxValue);
    const max = Math.max(minValue, maxValue);
    const v = Number.isFinite(value) ? value : min;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  };

  const enabled = document.createElement('input');
  enabled.type = 'checkbox';
  enabled.checked = !!state.enabled;

  panel.appendChild(createRow('CRT Warp', warp));
  panel.appendChild(createRow('Chromatic Aber.', aberration));
  panel.appendChild(createRow('Chromatic Opacity', aberrationOpacity));
  panel.appendChild(createRow('Scanline Strength', scanlines));

  const toggleRow = document.createElement('div');
  toggleRow.style.display = 'flex';
  toggleRow.style.alignItems = 'center';
  toggleRow.style.gap = '6px';
  toggleRow.style.marginTop = '4px';

  toggleRow.appendChild(enabled);
  const toggleLabel = document.createElement('label');
  toggleLabel.textContent = 'Enable CRT';
  toggleLabel.style.fontSize = '10px';
  toggleLabel.style.letterSpacing = '0.05em';
  toggleRow.appendChild(toggleLabel);
  panel.appendChild(toggleRow);

  const emit = () => {
    const snapshot = { ...state };
    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        // Avoid breaking the panel if a listener fails.
        console.error(err);
      }
    });
  };

  const updateState = (partial) => {
    if (partial) {
      if ('warp' in partial) state.warp = clampFromInput(partial.warp, warp);
      if ('aberration' in partial) state.aberration = clampFromInput(partial.aberration, aberration);
      if ('aberrationOpacity' in partial) {
        state.aberrationOpacity = clampFromInput(partial.aberrationOpacity, aberrationOpacity);
      }
      if ('scanlines' in partial) state.scanlines = clampFromInput(partial.scanlines, scanlines);
      if ('enabled' in partial) state.enabled = !!partial.enabled;
    }
    state.warp = clampFromInput(state.warp, warp);
    state.aberration = clampFromInput(state.aberration, aberration);
    state.aberrationOpacity = clampFromInput(state.aberrationOpacity, aberrationOpacity);
    state.scanlines = clampFromInput(state.scanlines, scanlines);
    warp.value = String(state.warp);
    aberration.value = String(state.aberration);
    aberrationOpacity.value = String(state.aberrationOpacity);
    scanlines.value = String(state.scanlines);
    enabled.checked = !!state.enabled;
    persistState(storageKey, state);
    emit();
  };

  warp.addEventListener('input', () => updateState({ warp: parseFloat(warp.value) || 0 }));
  aberration.addEventListener('input', () => updateState({ aberration: parseFloat(aberration.value) || 0 }));
  aberrationOpacity.addEventListener('input', () => updateState({
    aberrationOpacity: parseFloat(aberrationOpacity.value) || 0,
  }));
  scanlines.addEventListener('input', () => updateState({ scanlines: parseFloat(scanlines.value) || 0 }));
  enabled.addEventListener('change', () => updateState({ enabled: !!enabled.checked }));

  parent.appendChild(panel);

  // Clamp and notify listeners immediately so consumers sync without waiting.
  updateState();

  return {
    element: panel,
    getSettings: () => ({ ...state }),
    setSettings: updateState,
    onChange: (listener) => {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      // Push current state immediately for convenience.
      try { listener({ ...state }); } catch (err) { console.error(err); }
      return () => listeners.delete(listener);
    },
    destroy: () => {
      listeners.clear();
      if (panel.parentElement) panel.parentElement.removeChild(panel);
    },
  };
}

export function applyScanlineIntensity(target, intensity, {
  opacityRange = [0, 1],
  alphaRange = DEFAULT_SCANLINE_ALPHA_RANGE,
} = {}) {
  if (!target || !target.style) return;
  const amount = clamp01(intensity);
  const [minOpacity, maxOpacity] = opacityRange;
  const [minAlpha, maxAlpha] = alphaRange;
  const lerp = (a, b) => a + (b - a) * amount;
  target.style.setProperty('--crt-scanline-opacity', lerp(minOpacity, maxOpacity).toFixed(3));
  target.style.setProperty('--crt-scanline-alpha', lerp(minAlpha, maxAlpha).toFixed(3));
}

