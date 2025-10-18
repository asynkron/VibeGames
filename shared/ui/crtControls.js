// Shared CRT settings controller used across games.
// Exposes a small slider/checkbox panel with persistence and change callbacks.

const DEFAULTS = { enabled: true, warp: 0.18, aberration: 0.12 };

function clamp01(value) {
  const v = Number.isFinite(value) ? value : 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

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
  warp.max = '1';
  warp.step = '0.01';
  warp.value = String(state.warp);
  warp.style.flex = '0 0 96px';

  const aberration = document.createElement('input');
  aberration.type = 'range';
  aberration.min = '0';
  aberration.max = '1';
  aberration.step = '0.01';
  aberration.value = String(state.aberration);
  aberration.style.flex = '0 0 96px';

  const enabled = document.createElement('input');
  enabled.type = 'checkbox';
  enabled.checked = !!state.enabled;

  panel.appendChild(createRow('CRT Warp', warp));
  panel.appendChild(createRow('Chromatic Aber.', aberration));

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
      if ('warp' in partial) state.warp = clamp01(partial.warp);
      if ('aberration' in partial) state.aberration = clamp01(partial.aberration);
      if ('enabled' in partial) state.enabled = !!partial.enabled;
    }
    warp.value = String(state.warp);
    aberration.value = String(state.aberration);
    enabled.checked = !!state.enabled;
    persistState(storageKey, state);
    emit();
  };

  warp.addEventListener('input', () => updateState({ warp: parseFloat(warp.value) || 0 }));
  aberration.addEventListener('input', () => updateState({ aberration: parseFloat(aberration.value) || 0 }));
  enabled.addEventListener('change', () => updateState({ enabled: !!enabled.checked }));

  parent.appendChild(panel);

  // Notify listeners with the initial state so consumers can sync immediately.
  setTimeout(() => emit(), 0);

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

