/**
 * Apply a CRT preset by toggling helper classes on the chosen element.
 * The presets are expressed with CSS custom properties in each game.
 */
export function applyCrtPreset(preset = 'medium', { target = document.documentElement, storageKey = 'crtPreset' } = {}) {
  if (!target) return preset;
  target.classList.remove('crt-subtle', 'crt-strong');
  if (preset === 'subtle') target.classList.add('crt-subtle');
  if (preset === 'strong') target.classList.add('crt-strong');
  try {
    window.localStorage.setItem(storageKey, preset);
  } catch (_) {
    /* localStorage can be unavailable (private mode, etc.) */
  }
  return preset;
}

/**
 * Wire up the default F1/F2 hotkeys used in Boulder Dash to cycle CRT intensity.
 * Returns a disposer in case the caller wants to unbind the listener.
 */
export function initCrtPresetHotkeys({
  subtleKey = 'F1',
  strongKey = 'F2',
  storageKey = 'crtPreset',
  target = document.documentElement,
} = {}) {
  let current = 'medium';
  try {
    current = window.localStorage.getItem(storageKey) || current;
  } catch (_) {
    /* ignore */
  }
  applyCrtPreset(current, { target, storageKey });

  const handler = (event) => {
    if (event.key === subtleKey) {
      current = current === 'subtle' ? 'medium' : 'subtle';
      applyCrtPreset(current, { target, storageKey });
    } else if (event.key === strongKey) {
      current = current === 'strong' ? 'medium' : 'strong';
      applyCrtPreset(current, { target, storageKey });
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

/**
 * Tiny jitter helper originally used by Boulder Dash.
 * Returns a disposer that clears the animation frame and resets the transform.
 */
export function startCrtJitter({
  element,
  axis = 'y',
  amplitude = 0.3,
} = {}) {
  if (!element) return () => {};
  let rafId;
  const step = () => {
    const offset = (Math.random() - 0.5) * amplitude;
    const translateX = axis === 'x' ? offset : 0;
    const translateY = axis === 'y' ? offset : 0;
    element.style.transform = `translate(${translateX}px, ${translateY}px)`;
    rafId = window.requestAnimationFrame(step);
  };
  rafId = window.requestAnimationFrame(step);
  return () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    element.style.transform = '';
  };
}
