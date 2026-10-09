import assert from 'node:assert/strict';
import test from 'node:test';
import { createCombatMapControls } from '../src/render/combatMapControls.js';

function setup() {
  const keyboard = new EventTarget();
  const captures = new Set();
  const canvas = new EventTarget();
  canvas.ownerDocument = { defaultView: keyboard };
  canvas.setPointerCapture = (id) => captures.add(id);
  canvas.hasPointerCapture = (id) => captures.has(id);
  canvas.releasePointerCapture = (id) => captures.delete(id);
  canvas.getBoundingClientRect = () => ({ height: 200 });
  const state = { active: true, pans: [], rotations: [], zooms: [], resets: 0, clicks: 0 };
  const controls = createCombatMapControls(canvas, {
    isActive: () => state.active,
    containsPoint: (x, y) => x >= 0 && x < 100 && y >= 0 && y < 100,
    pan: (x, y) => state.pans.push([x, y]),
    rotate: (angle) => state.rotations.push(angle),
    zoom: (delta) => state.zooms.push(delta),
    reset: () => { state.resets += 1; },
  });
  canvas.addEventListener('click', () => { state.clicks += 1; });
  function send(type, values = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, {
      pointerId: 1, button: 0, clientX: 10, clientY: 10,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      ...values,
    });
    (type === 'keydown' ? keyboard : canvas).dispatchEvent(event);
    return event;
  }
  return { state, controls, canvas, keyboard, send };
}

test('small pointer motions remain clicks; a pan consumes only its resulting click', () => {
  const { state, send } = setup();
  send('pointerdown');
  send('pointermove', { clientX: 12, clientY: 12 });
  send('pointerup');
  assert.equal(send('click').defaultPrevented, false);
  assert.equal(state.clicks, 1);
  assert.deepEqual(state.pans, []);

  send('pointerdown');
  send('pointermove', { clientX: 30 });
  send('pointermove', { clientX: 35, clientY: 22 });
  send('pointerup', { clientX: 35, clientY: 22 });
  assert.deepEqual(state.pans, [[20, 0], [5, 12]]);
  assert.equal(send('click', { clientX: 35, clientY: 22 }).defaultPrevented, true);
  assert.equal(state.clicks, 1);

  send('pointerdown');
  send('pointerup');
  send('click');
  assert.equal(state.clicks, 2);
});

test('only combat viewport gestures start, and the captured pointer keeps panning outside it', () => {
  const { state, send } = setup();
  send('pointerdown', { clientX: 150 });
  send('pointermove', { clientX: 180 });
  send('pointerup');
  state.active = false;
  send('pointerdown');
  send('pointermove', { clientX: 40 });
  send('pointerup');
  state.active = true;
  send('pointerdown', { button: 1 });
  send('pointermove', { clientX: 40 });
  send('pointerup');
  assert.deepEqual(state.pans, []);

  send('pointerdown');
  send('pointermove', { pointerId: 2, clientX: 30 });
  send('pointerup', { pointerId: 2 });
  send('pointermove', { clientX: 150 });
  send('pointerup', { clientX: 150 });
  assert.deepEqual(state.pans, [[140, 0]]);
});

test('right drag and Shift-left drag rotate while normal context menus stay available outside combat', () => {
  const { state, send } = setup();
  for (const values of [{ button: 2 }, { shiftKey: true }]) {
    send('pointerdown', values);
    send('pointermove', { clientX: 30, clientY: 35 });
    send('pointerup');
  }
  assert.deepEqual(state.rotations, [0.2, 0.2]);
  assert.deepEqual(state.pans, []);
  assert.equal(send('contextmenu').defaultPrevented, true);
  assert.equal(send('contextmenu', { clientX: 150 }).defaultPrevented, false);
  state.active = false;
  assert.equal(send('contextmenu').defaultPrevented, false);
});

test('pointer cancellation, lost capture, combat ending, and explicit cancellation end a drag', async (t) => {
  for (const end of ['pointercancel', 'lostpointercapture', 'combat ended', 'cancel']) {
    await t.test(end, () => {
      const { state, controls, canvas, send } = setup();
      send('pointerdown');
      send('pointermove', { clientX: 20 });
      if (end === 'cancel') controls.cancel();
      else if (end === 'combat ended') {
        state.active = false;
        send('pointermove', { clientX: 30 });
        state.active = true;
      } else {
        if (end === 'lostpointercapture') canvas.releasePointerCapture(1);
        send(end);
      }
      send('pointermove', { clientX: 40 });
      assert.deepEqual(state.pans, [[10, 0]]);
      send('pointerdown');
      send('pointermove', { clientX: 20 });
      send('pointerup');
      assert.deepEqual(state.pans, [[10, 0], [10, 0]]);
    });
  }
});

test('wheel deltas use CSS pixels and preserve scrolling outside the combat viewport and browser modifiers', () => {
  const { state, send } = setup();
  for (const [deltaY, deltaMode] of [[100, 0], [2, 1], [-1, 2]]) {
    assert.equal(send('wheel', { deltaY, deltaMode }).defaultPrevented, true);
  }
  assert.deepEqual(state.zooms, [100, 32, -200]);
  for (const values of [{ clientX: 150 }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { deltaY: 0 }]) {
    assert.equal(send('wheel', { deltaY: 50, deltaMode: 0, ...values }).defaultPrevented, false);
  }
  state.active = false;
  assert.equal(send('wheel', { deltaY: 50 }).defaultPrevented, false);
  assert.deepEqual(state.zooms, [100, 32, -200]);
});

test('combat camera shortcuts rotate, zoom and reset without taking browser shortcuts or other game keys', () => {
  const { state, keyboard, send } = setup();
  const gameKeys = [];
  keyboard.addEventListener('keydown', (event) => gameKeys.push(event.key), { capture: true });
  for (const key of ['q', 'E', '+', '=', '-', '_', 'Home']) {
    assert.equal(send('keydown', { key }).defaultPrevented, true);
  }
  assert.deepEqual(state.rotations, [-Math.PI / 12, Math.PI / 12]);
  assert.deepEqual(state.zooms, [-120, -120, 120, 120]);
  assert.equal(state.resets, 1);
  assert.deepEqual(gameKeys, []);
  for (const values of [{ key: 'ArrowUp' }, { key: 'q', ctrlKey: true }, { key: 'e', altKey: true }, { key: '+', metaKey: true }]) {
    assert.equal(send('keydown', values).defaultPrevented, false);
  }
  state.active = false;
  assert.equal(send('keydown', { key: 'Home' }).defaultPrevented, false);
  assert.equal(state.resets, 1);
  assert.equal(state.rotations.length, 2);
  assert.equal(state.zooms.length, 4);
  assert.deepEqual(gameKeys, ['ArrowUp', 'q', 'e', '+', 'Home']);
});
