// Helper for syncing the CRT screen container size with the logical viewport
// used by a game. The helper computes a CSS custom property value for
// `--screen-width` based on the game's logical resolution so the visible canvas
// can scale up while maintaining the proper aspect ratio. Games can keep their
// drawing code in logical pixel space and simply opt in to a larger display by
// calling this function once during bootstrap.

function toCssDimension(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return `${Math.round(value)}px`;
  return String(value);
}

const DEFAULT_OPTIONS = Object.freeze({
  viewportClamp: '96vw',
  scale: 3,
});

/**
 * Applies standardised sizing rules to a CRT frame so pixel-view games can be
 * scaled consistently across the collection.
 *
 * @param {Object} options
 * @param {HTMLCanvasElement} [options.canvas]
 *   Canvas that defines the logical viewport. If omitted, `frame` must be
 *   provided alongside explicit `logicalWidth`/`logicalHeight` values.
 * @param {HTMLElement} [options.frame]
 *   CRT frame element whose CSS variables should be updated. Defaults to the
 *   closest ancestor matching `.screen` when a canvas is supplied.
 * @param {number} [options.logicalWidth]
 *   Width of the logical drawing space. Falls back to `canvas.width`.
 * @param {number} [options.logicalHeight]
 *   Height of the logical drawing space. Falls back to `canvas.height`.
 * @param {Object} [options.css]
 *   Optional overrides for the CSS sizing heuristics. Supported keys:
 *   - `scale`: multiplier applied to the logical width when computing the
 *     target pixel width. Defaults to 3.
 *   - `minWidth` / `maxWidth`: numeric or CSS string clamps applied to the
 *     computed width.
 *   - `viewportClamp`: clamp used to keep the CRT within the viewport (defaults
 *     to `96vw`). Set to `null` to disable the clamp.
 *   - `width`: explicit CSS value used verbatim instead of the generated one.
 *   - `padding`: optional override for `--screen-padding`.
 *   - `aspect`: optional override for `--screen-aspect` when the default
 *     `logicalWidth / logicalHeight` needs tweaking.
 *
 * @returns {{
 *   sync: () => void,
 *   setLogicalSize: ({width?:number,height?:number}) => void,
 *   updateCss: (Partial<{scale:number,minWidth:number|string,maxWidth:number|string,viewportClamp:string|null,width:number|string,padding:number|string,aspect:string}>) => void,
 *   getLogicalSize: () => {width:number,height:number},
 *   element: HTMLElement | null,
 * }}
 */
export function createScreenViewport({
  canvas,
  frame,
  logicalWidth,
  logicalHeight,
  css = {},
} = {}) {
  const screen = frame ?? canvas?.closest?.('.screen') ?? null;
  if (!screen) {
    return {
      sync() {},
      setLogicalSize() {},
      updateCss() {},
      getLogicalSize() { return { width: logicalWidth ?? 0, height: logicalHeight ?? 0 }; },
      element: null,
    };
  }

  const resolvedWidth = Number.isFinite(logicalWidth)
    ? logicalWidth
    : Number.isFinite(canvas?.width)
    ? canvas.width
    : null;
  const resolvedHeight = Number.isFinite(logicalHeight)
    ? logicalHeight
    : Number.isFinite(canvas?.height)
    ? canvas.height
    : null;

  if (!Number.isFinite(resolvedWidth) || !Number.isFinite(resolvedHeight)) {
    throw new Error('createScreenViewport requires logicalWidth/logicalHeight or a canvas with width/height.');
  }

  const state = {
    logicalWidth: resolvedWidth,
    logicalHeight: resolvedHeight,
    css: { ...DEFAULT_OPTIONS, ...css },
  };

  function computeWidthCss() {
    const { css: cssOptions, logicalWidth: lw } = state;
    if (cssOptions.width !== undefined) {
      return toCssDimension(cssOptions.width);
    }

    const scale = Number.isFinite(cssOptions.scale) ? cssOptions.scale : DEFAULT_OPTIONS.scale;
    let pixels = Math.max(1, Math.round(lw * scale));
    let value = `${pixels}px`;

    if (cssOptions.minWidth !== undefined) {
      value = `max(${toCssDimension(cssOptions.minWidth)}, ${value})`;
    }
    if (cssOptions.maxWidth !== undefined) {
      value = `min(${toCssDimension(cssOptions.maxWidth)}, ${value})`;
    }

    if (cssOptions.viewportClamp !== undefined && cssOptions.viewportClamp !== null) {
      value = `min(${cssOptions.viewportClamp}, ${value})`;
    }

    return value;
  }

  function applyCss() {
    const aspect = state.css.aspect ?? `${state.logicalWidth} / ${state.logicalHeight}`;
    if (aspect) {
      screen.style.setProperty('--screen-aspect', aspect);
    }

    const widthValue = computeWidthCss();
    if (widthValue) {
      screen.style.setProperty('--screen-width', widthValue);
    }

    if (state.css.padding !== undefined) {
      screen.style.setProperty('--screen-padding', toCssDimension(state.css.padding));
    }
  }

  function sync() {
    applyCss();
  }

  function setLogicalSize({ width, height } = {}) {
    if (Number.isFinite(width)) state.logicalWidth = width;
    if (Number.isFinite(height)) state.logicalHeight = height;
    applyCss();
  }

  function updateCss(overrides = {}) {
    Object.assign(state.css, overrides);
    applyCss();
  }

  function getLogicalSize() {
    return { width: state.logicalWidth, height: state.logicalHeight };
  }

  sync();

  return {
    sync,
    setLogicalSize,
    updateCss,
    getLogicalSize,
    element: screen,
  };
}

