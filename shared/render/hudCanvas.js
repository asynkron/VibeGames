// Utilities for keeping HUD canvases crisp while scaling with their CSS containers.
// The helpers exported here centralize the logic previously embedded in Bard's Tale so
// other games can reuse the same aspect ratio and HiDPI management behaviour.

/**
 * Creates a resolution manager that keeps a canvas sized to the desired logical
 * dimensions while providing enough backing pixels for HiDPI displays.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas element.
 * @param {object} options
 * @param {number} options.logicalWidth - Width of the logical drawing space.
 * @param {number} options.logicalHeight - Height of the logical drawing space.
 * @param {number} [options.minDevicePixelRatio=1] - Lower clamp for device pixel ratio.
 * @param {number} [options.maxDevicePixelRatio=4] - Upper clamp for device pixel ratio.
 * @param {(ratio:number, metrics:{width:number,height:number}) => void} [options.onPixelRatioChange]
 *   Optional callback fired whenever the backing resolution or device pixel ratio changes.
 */
export function createCanvasResolutionManager(canvas, {
  logicalWidth,
  logicalHeight,
  minDevicePixelRatio = 1,
  maxDevicePixelRatio = 4,
  onPixelRatioChange,
} = {}) {
  if (!canvas) {
    throw new Error('createCanvasResolutionManager requires a canvas element.');
  }
  if (!Number.isFinite(logicalWidth) || !Number.isFinite(logicalHeight)) {
    throw new Error('createCanvasResolutionManager requires logicalWidth and logicalHeight.');
  }

  if (canvas.style) {
    if (!canvas.style.width) canvas.style.width = '100%';
    if (!canvas.style.height) canvas.style.height = '100%';
  }

  let pixelRatio = 1;

  function clampDevicePixelRatio(value) {
    const min = Math.max(0.5, minDevicePixelRatio);
    const max = Math.max(min, maxDevicePixelRatio);
    return Math.min(max, Math.max(min, value));
  }

  function desiredDevicePixelRatio() {
    if (typeof window === 'undefined') return 1;
    if (!window.devicePixelRatio) return 1;
    return clampDevicePixelRatio(window.devicePixelRatio);
  }

  function sync() {
    const ratio = desiredDevicePixelRatio();
    const targetWidth = Math.round(logicalWidth * ratio);
    const targetHeight = Math.round(logicalHeight * ratio);
    const sizeChanged = canvas.width !== targetWidth || canvas.height !== targetHeight;

    if (sizeChanged) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    if (sizeChanged || pixelRatio !== ratio) {
      pixelRatio = ratio;
      if (typeof onPixelRatioChange === 'function') {
        onPixelRatioChange(pixelRatio, { width: targetWidth, height: targetHeight });
      }
    }

    return { width: targetWidth, height: targetHeight, pixelRatio };
  }

  function getPixelRatio() {
    return pixelRatio;
  }

  return {
    logicalWidth,
    logicalHeight,
    sync,
    getPixelRatio,
  };
}

/**
 * Projects a rectangle defined in logical canvas coordinates into DOM space so
 * absolutely positioned overlays (e.g., WebGL stages) can align with a scaled canvas.
 *
 * @param {HTMLCanvasElement} canvas - Canvas used as the logical reference frame.
 * @param {{left?:number, top?:number, right?:number, bottom?:number, x?:number, y?:number, width?:number, height?:number}} logicalBounds
 *   Rectangle in logical coordinates.
 * @param {object} options
 * @param {number} options.logicalWidth - Logical width used when drawing to the canvas.
 * @param {number} options.logicalHeight - Logical height used when drawing to the canvas.
 * @param {HTMLElement} [options.targetElement]
 *   Optional DOM element that will have its positioning styles updated to match the projected rectangle.
 * @returns {{left:number, top:number, width:number, height:number, scaleX:number, scaleY:number} | null}
 */
export function projectLogicalRect(canvas, logicalBounds, {
  logicalWidth,
  logicalHeight,
  targetElement,
} = {}) {
  if (!canvas || !logicalBounds) return null;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !Number.isFinite(logicalWidth) || !Number.isFinite(logicalHeight)) {
    return null;
  }

  const scaleX = rect.width / logicalWidth;
  const scaleY = rect.height / logicalHeight;

  const logicalLeft =
    (logicalBounds.left ?? logicalBounds.x ?? 0);
  const logicalTop =
    (logicalBounds.top ?? logicalBounds.y ?? 0);
  const logicalRight =
    logicalBounds.right ?? ((logicalBounds.width ?? 0) + logicalLeft);
  const logicalBottom =
    logicalBounds.bottom ?? ((logicalBounds.height ?? 0) + logicalTop);

  const width = Math.max(0, (logicalRight - logicalLeft) * scaleX);
  const height = Math.max(0, (logicalBottom - logicalTop) * scaleY);
  const left = logicalLeft * scaleX;
  const top = logicalTop * scaleY;

  if (targetElement && targetElement.style) {
    targetElement.style.left = `${left}px`;
    targetElement.style.top = `${top}px`;
    targetElement.style.width = `${width}px`;
    targetElement.style.height = `${height}px`;
    targetElement.style.maxWidth = 'none';
    targetElement.style.maxHeight = 'none';
    targetElement.style.minWidth = '0px';
    targetElement.style.minHeight = '0px';
  }

  return { left, top, width, height, scaleX, scaleY };
}
