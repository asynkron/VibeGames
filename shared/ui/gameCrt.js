import { DEFAULT_SCANLINE_ALPHA_RANGE, createDefaultCrtSettings } from '../config/display.js';
import { createCrtControls, applyScanlineIntensity } from './crtControls.js';
import { createCrtPostProcessor } from '../fx/crtPostprocess.js';

/**
 * Centralizes the boilerplate each game previously repeated to wire CRT controls,
 * sync scanline styling, and create the shared post-processing pass.
 *
 * @param {Object} options
 * @param {string} options.storageKey localStorage bucket for persisted settings
 * @param {CanvasRenderingContext2D} options.targetContext final draw context for CRT post FX
 * @param {HTMLCanvasElement} [options.defaultSource] optional offscreen buffer to treat as the post source
 * @param {Object} [options.settings] mutable object the caller keeps for live settings
 * @param {Object} [options.defaults] baseline settings used when no persisted values exist
 * @param {Element} [options.frameElement] DOM node whose CSS vars control scanline intensity
 * @param {string|null} [options.frameSelector='.screen.crt-frame'] selector used when frameElement is omitted
 * @param {number[]} [options.alphaRange] overrides the default scanline alpha ramp
 * @param {Function} [options.onSettingsChange] hook invoked after settings/sync updates
 * @param {Object} [options.controls] extra props forwarded to createCrtControls (position, parent, etc.)
 */
export function initGameCrt({
  storageKey,
  targetContext,
  defaultSource,
  settings,
  defaults,
  frameElement,
  frameSelector = '.screen.crt-frame',
  alphaRange = DEFAULT_SCANLINE_ALPHA_RANGE,
  onSettingsChange,
  controls: controlsOptions = {},
} = {}) {
  const {
    onChange: userOnChange,
    defaults: controlsDefaults,
    storageKey: controlsStorageKey,
    ...restControls
  } = controlsOptions;

  const crtSettings = settings ?? createDefaultCrtSettings();
  const resolvedDefaults = defaults
    ?? controlsDefaults
    ?? (settings ? { ...settings } : createDefaultCrtSettings());

  const frame = frameElement ?? (frameSelector ? document.querySelector(frameSelector) : null);
  const syncScanlines = (value = crtSettings.scanlines) => {
    if (!frame) return;
    const disabled = crtSettings.enabled === false;
    frame.classList.toggle('crt-disabled', disabled);
    const intensity = disabled ? 0 : value;
    applyScanlineIntensity(frame, intensity, { alphaRange });
  };

  let hasSyncedFromControls = false;
  const applyAndNotify = (next) => {
    if (next && typeof next === 'object') {
      Object.assign(crtSettings, next);
    }
    syncScanlines(crtSettings.scanlines);
    if (typeof onSettingsChange === 'function') {
      onSettingsChange(crtSettings);
    }
    hasSyncedFromControls = true;
  };

  const crtControls = createCrtControls({
    ...restControls,
    storageKey: controlsStorageKey ?? storageKey,
    defaults: resolvedDefaults,
    onChange: (snapshot) => {
      if (typeof userOnChange === 'function') {
        userOnChange(snapshot);
      }
      applyAndNotify(snapshot);
    },
  });

  if (!hasSyncedFromControls) {
    const initial = crtControls.getSettings?.();
    if (initial) {
      applyAndNotify(initial);
    } else {
      applyAndNotify();
    }
  }

  const post = targetContext
    ? createCrtPostProcessor({
        targetContext,
        ...(defaultSource ? { defaultSource } : {}),
        settings: crtSettings,
      })
    : null;

  return {
    settings: crtSettings,
    controls: crtControls,
    post,
    syncScanlines,
  };
}
