const DRAG_THRESHOLD = 4;
const KEY_ROTATION = Math.PI / 12;

export function createCombatMapControls(canvas, { isActive, containsPoint, pan, rotate, zoom, reset }) {
  let gesture = null;
  let suppressClick = false;

  function endGesture() {
    const pointerId = gesture?.pointerId;
    gesture = null;
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  }

  function cancel() {
    endGesture();
    suppressClick = false;
  }

  canvas.addEventListener('pointerdown', (event) => {
    suppressClick = false;
    if (gesture || !isActive() || !containsPoint(event.clientX, event.clientY)
      || (event.button !== 0 && event.button !== 2)) return;
    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY,
      rotate: event.button === 2 || event.shiftKey,
      dragged: false,
    };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!isActive()) { cancel(); return; }
    if (!gesture.dragged && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < DRAG_THRESHOLD) return;
    gesture.dragged = true;
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    event.preventDefault();
    if (gesture.rotate) rotate(dx * 0.01);
    else pan(dx, dy);
  });

  function finishPointer(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    suppressClick = gesture.dragged;
    endGesture();
  }
  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', finishPointer);
  canvas.addEventListener('lostpointercapture', finishPointer);

  canvas.addEventListener('click', (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });

  canvas.addEventListener('contextmenu', (event) => {
    if (isActive() && containsPoint(event.clientX, event.clientY)) event.preventDefault();
  });

  canvas.addEventListener('wheel', (event) => {
    if (!isActive() || !containsPoint(event.clientX, event.clientY)
      || event.ctrlKey || event.altKey || event.metaKey || !event.deltaY) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.getBoundingClientRect().height : 1;
    event.preventDefault();
    zoom(event.deltaY * unit);
  }, { passive: false });

  canvas.ownerDocument.defaultView.addEventListener('keydown', (event) => {
    if (!isActive() || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === 'q') rotate(-KEY_ROTATION);
    else if (key === 'e') rotate(KEY_ROTATION);
    else if (key === '+' || key === '=') zoom(-120);
    else if (key === '-' || key === '_') zoom(120);
    else if (key === 'home') reset();
    else return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });

  return { cancel };
}
