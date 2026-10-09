import * as THREE from 'three';
import { ITEM_DB, EQUIPMENT_SLOTS } from '../items.js';
import { assembleCombatVoxelModel } from './combatVoxelCatalog.js';
import { createVoxelFigure } from './voxelFigure.js';

const LEFT_SLOTS = ['head', 'neck', 'shoulders', 'chest', 'hands', 'waist', 'legs'];
const RIGHT_SLOTS = ['back', 'mainhand', 'offhand', 'ring1', 'ring2', 'feet'];
const SLOT_LABELS = Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot.id, slot.label]));
const ICONS = {
  mainhand: ['M16 2h4v5h-2v3h-2v3h-2v2h-3v-3h2v-2h2V7h1z', 'M7 12h3v3h3v3h-3l-5 5H2v-3l5-5H4v-3z'],
  offhand: ['M3 3h18v11l-3 5-6 4-6-4-3-5z', 'M10 5h4v14h-4zM5 10h14v4H5z'],
  head: ['M7 3h10v2h3v14h-4v3H8v-3H4V5h3z', 'M5 9h14v3H5zM10 13h4v8h-4z'],
  neck: ['M3 3h3v7h3v3h6v-3h3V3h3v9h-3v3h-3v5h-2v3h-2v-3H9v-5H6v-3H3z', 'M10 15h4v4h-4z'],
  shoulders: ['M1 7h8v3h6V7h8v11h-7v-5H8v5H1z', 'M2 9h5v3H2zM17 9h5v3h-5z'],
  chest: ['M5 3h4v3h6V3h4l4 7-5 3v9H6v-9l-5-3z', 'M8 9h8v3H8zM8 15h8v3H8z'],
  hands: ['M4 5h3v6h1V3h3v8h1V4h3v7h1V6h3v7h3v3l-5 6H6l-4-5V9h2z', 'M7 16h10v4H7z'],
  waist: ['M1 8h22v9H1z', 'M8 6h8v13H8zm3 3v7h2V9z'],
  legs: ['M5 2h14v20h-6V11h-2v11H5z', 'M6 3h12v4H6z'],
  feet: ['M2 3h7v12h3v7H1v-6h1zM14 3h7v12h2v7H13v-6h1z', 'M2 7h7v3H2zM14 7h7v3h-7z'],
  ring1: ['M6 7h12v3h3v9h-3v3H6v-3H3v-9h3zm1 4v7h10v-7z', 'M9 2h6v3h3v4H6V5h3z'],
  back: ['M7 3h10v3h4v16H3V6h4z', 'M8 1h8v3H8zM6 12h12v7H6z'],
  potion: ['M9 1h6v6l5 5v10H4V12l5-5z', 'M7 14h10v5H7zM8 2h8v3H8z'],
  staff: ['M10 2h7v3h3v7h-3v3h-3v9h-3V15H8v-3H5V5h5z', 'M9 5h7v7H9z'],
  bow: ['M7 1h5v3h4v4h3v8h-3v4h-4v3H7v-3h3v-3h3V7h-3V4H7z', 'M6 3h1v18H6zM2 11h20v2H2z'],
  lute: ['M14 1h4v11h3v9h-3v2H7v-2H4v-9h3V9h7z', 'M10 13h5v5h-5zM15 2h1v12h-1z'],
  axe: ['M11 2h3v21h-3zM3 3h5v2h3v8H8v2H3z', 'M3 3h2v12H3zM14 6h6v5h-6z'],
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, className = '') {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function itemIcon(item, slot) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'inventory-icon');
  let kind = item?.slots?.[0] || slot || 'potion';
  if (kind === 'ring2') kind = 'ring1';
  if (item?.heals || item?.restoresSp) kind = 'potion';
  else if (/lute/i.test(item?.name)) kind = 'lute';
  else if (/staff/i.test(item?.name)) kind = 'staff';
  else if (/bow/i.test(item?.name)) kind = 'bow';
  else if (/axe|halberd/i.test(item?.name)) kind = 'axe';
  const visual = Object.values(item?.visuals || {});
  if (visual.includes('ruby')) svg.style.setProperty('--item-accent', '#db6660');
  else if (visual.includes('sapphire') || item?.restoresSp) svg.style.setProperty('--item-accent', '#6fbced');
  else if (item?.heals) svg.style.setProperty('--item-accent', '#db6660');
  for (const [index, d] of (ICONS[kind] || ICONS.chest).entries()) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', index ? 'var(--item-accent)' : 'currentColor');
    path.setAttribute('fill-rule', 'evenodd');
    svg.append(path);
  }
  return svg;
}

function signed(number) {
  return number > 0 ? `+${number}` : String(number);
}

/** The inventory reads and changes the same equipment that combat renders. */
export function createInventoryPanel({ parent = document.body, systems, onClose = () => {} }) {
  const screen = element('section', 'inventory-screen');
  screen.hidden = true;
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', 'inventory-title');
  const shell = element('div', 'inventory-shell');
  const header = element('header', 'inventory-header');
  const heading = element('h1', '', 'Inventory');
  heading.id = 'inventory-title';
  const closeButton = button('Return to game  [Esc]', close, 'inventory-close');
  header.append(heading, closeButton);
  const party = element('nav', 'inventory-party');
  party.setAttribute('aria-label', 'Choose a party member');
  const characterHeader = element('div', 'inventory-character-header');
  const characterName = element('h2');
  const characterVitals = element('p');
  characterHeader.append(characterName, characterVitals);
  const lockNotice = element('p', 'inventory-lock');
  const workspace = element('div', 'inventory-workspace');
  const loadout = element('section', 'inventory-loadout');
  loadout.setAttribute('aria-label', 'Equipped items and character');
  const leftSlots = element('div', 'inventory-slots');
  const rightSlots = element('div', 'inventory-slots');
  const preview = element('div', 'inventory-preview');
  const viewport = element('div', 'inventory-preview-viewport');
  viewport.setAttribute('role', 'img');
  viewport.setAttribute('aria-label', 'Live voxel character wearing equipped items');
  const rotateControls = element('div', 'inventory-rotate');
  const leftRotate = button('↶', () => rotate(-Math.PI / 4));
  const rightRotate = button('↷', () => rotate(Math.PI / 4));
  leftRotate.setAttribute('aria-label', 'Rotate character left');
  rightRotate.setAttribute('aria-label', 'Rotate character right');
  rotateControls.append(leftRotate, element('span', '', 'Rotate'), rightRotate);
  preview.append(viewport, rotateControls);
  loadout.append(leftSlots, preview, rightSlots);
  const pack = element('section', 'inventory-pack');
  const packHeader = element('div', 'inventory-pack-header');
  packHeader.append(element('h3', '', 'Carried items'));
  const packCount = element('span');
  packHeader.append(packCount);
  const bag = element('div', 'inventory-bag');
  bag.setAttribute('aria-label', 'Carried inventory slots');
  pack.append(packHeader, bag);
  workspace.append(loadout, pack);
  const statistics = element('dl', 'inventory-statistics');
  const details = element('section', 'inventory-details');
  details.setAttribute('aria-label', 'Selected item');
  const status = element('p', 'inventory-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  shell.append(header, party, characterHeader, lockNotice, workspace, statistics, details, status);
  screen.append(shell);
  parent.append(screen);

  let characterId;
  let snapshot;
  let selection = null;
  let chosenSlot;
  let previousFocus;
  let unsubscribe;
  let modelKey;
  let figure;
  let renderer;
  let scene;
  let camera;
  let pivot;
  let angle = -Math.PI / 7;
  let resizeObserver;
  let animationFrame = null;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  function stopPreviewAnimation() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  function schedulePreviewAnimation() {
    if (animationFrame !== null || screen.hidden || document.hidden || !figure?.hasEffects || motionPreference.matches) return;
    animationFrame = requestAnimationFrame(animatePreview);
  }

  function drawPreview(now = performance.now()) {
    if (screen.hidden || document.hidden || !figure || !renderer) return;
    figure.updateEffects(now, { reducedMotion: motionPreference.matches });
    renderer.render(scene, camera);
  }

  function animatePreview(now) {
    animationFrame = null;
    if (screen.hidden || document.hidden || motionPreference.matches || !figure?.hasEffects) return;
    drawPreview(now);
    schedulePreviewAnimation();
  }

  function onPreviewActivityChange() {
    stopPreviewAnimation();
    renderPreview();
  }

  motionPreference.addEventListener('change', onPreviewActivityChange);
  document.addEventListener('visibilitychange', onPreviewActivityChange);

  function initializePreview() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    viewport.append(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-20, 20, 24, -24, .1, 300);
    pivot = new THREE.Group();
    scene.add(pivot);
    scene.add(new THREE.HemisphereLight(0xe4f5ff, 0x644b43, 2));
    const key = new THREE.DirectionalLight(0xffead1, 3.5);
    key.position.set(-25, 50, 45);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7cbbff, 2);
    rim.position.set(30, 20, -30);
    scene.add(rim);
    resizeObserver = new ResizeObserver(renderPreview);
    resizeObserver.observe(viewport);
  }

  function refreshFigure() {
    const descriptor = { kind: snapshot.character.classType, equipment: snapshot.equipment };
    const nextKey = JSON.stringify(descriptor);
    viewport.setAttribute('aria-label', `${snapshot.character.name}, live voxel character wearing equipped items. Use the rotate buttons to inspect the back.`);
    if (modelKey === nextKey) return;
    initializePreview();
    stopPreviewAnimation();
    if (figure) {
      pivot.remove(figure.group);
      figure.dispose();
    }
    const model = assembleCombatVoxelModel(descriptor);
    figure = createVoxelFigure(model);
    figure.group.scale.setScalar(model.scale);
    pivot.add(figure.group);
    modelKey = nextKey;
    renderPreview();
  }

  function renderPreview() {
    if (screen.hidden || document.hidden || !figure || !renderer) return;
    const width = viewport.clientWidth, height = viewport.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    pivot.rotation.y = angle;
    pivot.updateWorldMatrix(true, true);
    const displayBounds = figure.getDisplayBounds();
    const bounds = new THREE.Box3(
      new THREE.Vector3(displayBounds.min.x, displayBounds.min.y, displayBounds.min.z),
      new THREE.Vector3(displayBounds.max.x, displayBounds.max.y, displayBounds.max.z),
    ).applyMatrix4(figure.group.matrixWorld);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const vertical = Math.max(size.y * 1.2, (size.x + size.z * .2) / (width / height) * 1.15);
    camera.left = -vertical * width / height / 2;
    camera.right = -camera.left;
    camera.top = vertical / 2;
    camera.bottom = -camera.top;
    camera.position.set(center.x, center.y + 8, center.z + 80);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    drawPreview();
    schedulePreviewAnimation();
  }

  function rotate(delta) {
    angle += delta;
    renderPreview();
  }

  function select(next) {
    selection = next;
    chosenSlot = undefined;
    status.textContent = '';
    refresh();
  }

  function renderSlots(container, slots) {
    container.replaceChildren(...slots.map(slot => {
      const item = ITEM_DB[snapshot.equipment[slot]];
      const selected = selection?.source === 'equipment' && selection.slot === slot;
      const node = button('', () => select({ source: 'equipment', slot }), 'inventory-slot');
      node.dataset.focusKey = `slot-${slot}`;
      node.classList.toggle('is-selected', selected);
      node.classList.toggle('is-empty', !item);
      node.setAttribute('aria-pressed', String(selected));
      node.setAttribute('aria-label', `${SLOT_LABELS[slot]}: ${item?.name || 'Empty'}`);
      node.append(itemIcon(item, slot));
      const label = element('span', 'inventory-slot-text');
      label.append(element('span', 'inventory-slot-label', SLOT_LABELS[slot]), element('span', 'inventory-slot-item', item?.name || 'Empty'));
      node.append(label);
      return node;
    }));
  }

  function renderBag() {
    const used = snapshot.inventory.filter(Boolean).length;
    packCount.textContent = `${used} / ${snapshot.capacity} slots`;
    bag.replaceChildren(...Array.from({ length: snapshot.capacity }, (_, index) => {
      const entry = snapshot.inventory[index];
      const item = entry && ITEM_DB[entry.itemId];
      const selected = selection?.source === 'inventory' && selection.index === index;
      const node = button('', () => select({ source: 'inventory', index }), 'inventory-cell');
      node.dataset.focusKey = `bag-${index}`;
      node.classList.toggle('is-selected', selected);
      node.classList.toggle('is-empty', !item);
      node.setAttribute('aria-pressed', String(selected));
      node.setAttribute('aria-label', `Bag slot ${index + 1}: ${item ? `${item.name}${entry.qty > 1 ? `, ${entry.qty}` : ''}` : 'Empty'}`);
      node.title = item?.name || `Empty slot ${index + 1}`;
      if (item) {
        node.append(itemIcon(item), element('span', 'inventory-cell-name', item.name));
        if (entry.qty > 1) node.append(element('span', 'inventory-quantity', String(entry.qty)));
      } else node.append(element('span', 'inventory-cell-number', String(index + 1).padStart(2, '0')));
      return node;
    }));
  }

  function renderStats() {
    const s = snapshot.stats;
    statistics.replaceChildren(...[
      ['Armor class', s.ac], ['To hit', signed(s.toHit)],
      ['Damage', `${s.minDamage}–${s.maxDamage}`], ['Magic resist', `${s.magicRes}%`],
    ].map(([label, value]) => {
      const pair = element('div');
      pair.append(element('dt', '', label), element('dd', '', String(value)));
      if (label === 'Armor class') pair.title = 'Lower armor class gives better protection.';
      return pair;
    }));
  }

  function itemProperties(item) {
    const properties = [];
    if (item.maxDamage) properties.push(`${item.minDamage}–${item.maxDamage} weapon damage`);
    if (item.toHit) properties.push(`${signed(item.toHit)} to hit`);
    if (item.acBonus) properties.push(`${signed(item.acBonus)} AC`);
    if (item.damageBonus) properties.push(`${signed(item.damageBonus)} damage`);
    if (item.magicRes) properties.push(`${signed(item.magicRes)}% magic resist`);
    if (item.heals) properties.push(`Restores ${item.heals} HP`);
    if (item.restoresSp) properties.push(`Restores ${item.restoresSp} SP`);
    if (item.handedness === 2) properties.push('Two-handed');
    if (item.weight) properties.push(`Weight ${item.weight}`);
    return properties.join(' · ');
  }

  function renderComparison(container, slot) {
    const proposed = systems.previewInventoryEquipment(characterId, selection.index, slot);
    container.replaceChildren();
    if (!proposed.ok) {
      container.append(element('p', 'inventory-item-note is-error', proposed.message));
      return false;
    }
    const returned = EQUIPMENT_SLOTS.flatMap(({ id }) => {
      const oldItem = snapshot.equipment[id];
      return oldItem && oldItem !== proposed.equipment[id] ? [ITEM_DB[oldItem].name] : [];
    });
    container.append(element('p', 'inventory-comparison-title', `After equipping in ${SLOT_LABELS[slot].toLowerCase()}`));
    const before = snapshot.stats, after = proposed.stats;
    const changes = element('dl', 'inventory-comparison-stats');
    for (const [label, oldValue, newValue, improvement] of [
      ['Armor class', before.ac, after.ac, before.ac - after.ac],
      ['To hit', signed(before.toHit), signed(after.toHit), after.toHit - before.toHit],
      ['Damage', `${before.minDamage}–${before.maxDamage}`, `${after.minDamage}–${after.maxDamage}`,
        after.minDamage >= before.minDamage && after.maxDamage >= before.maxDamage ? after.minDamage + after.maxDamage - before.minDamage - before.maxDamage
          : after.minDamage <= before.minDamage && after.maxDamage <= before.maxDamage ? -1 : 0],
      ['Magic resist', `${before.magicRes}%`, `${after.magicRes}%`, after.magicRes - before.magicRes],
    ]) {
      const pair = element('div');
      const value = element('dd', improvement > 0 ? 'is-improvement' : improvement < 0 ? 'is-reduction' : '', `${oldValue} → ${newValue}`);
      pair.append(element('dt', '', label), value);
      changes.append(pair);
    }
    container.append(changes, element('p', 'inventory-item-note', 'Lower armor class gives better protection.'));
    if (returned.length) container.append(element('p', 'inventory-item-note', `To bag: ${returned.join(', ')}.`));
    if (slot === 'offhand' && ITEM_DB[snapshot.inventory[selection.index].itemId].maxDamage) {
      container.append(element('p', 'inventory-item-note', 'Half of the offhand weapon’s damage, rounded down, is added to your attacks.'));
    }
    return true;
  }

  function mutate(action) {
    const result = action();
    status.textContent = result.message || (result.ok ? 'Inventory updated.' : 'That action is unavailable.');
    status.classList.toggle('is-error', !result.ok);
    refresh();
  }

  function renderDetails() {
    details.replaceChildren();
    const fromBag = selection?.source === 'inventory';
    const entry = fromBag ? snapshot.inventory[selection.index] : null;
    const item = ITEM_DB[fromBag ? entry?.itemId : snapshot.equipment[selection?.slot]];
    if (!item) {
      details.append(element('h3', '', selection ? 'Empty slot' : 'Choose an item'), element('p', 'inventory-item-description', 'Select carried gear to equip it, or an equipped item to put it away. Equipment changes your character here and in combat.'));
      return;
    }
    const info = element('div', 'inventory-item-info');
    info.append(element('h3', '', item.name), element('p', 'inventory-item-description', item.description), element('p', 'inventory-item-properties', itemProperties(item)));
    const slotText = fromBag ? 'Carried' : `Equipped · ${SLOT_LABELS[selection.slot]}`;
    info.append(element('p', 'inventory-item-location', slotText));
    if (!fromBag && selection.slot === 'offhand' && item.maxDamage) info.append(element('p', 'inventory-item-note', 'Half of this weapon’s damage, rounded down, is added to your attacks.'));
    const actions = element('div', 'inventory-item-actions');
    if (fromBag && item.slots.length) {
      chosenSlot = item.slots.includes(chosenSlot) ? chosenSlot : item.slots.find(slot => !snapshot.equipment[slot]) || item.slots[0];
      const compare = element('div', 'inventory-comparison');
      info.append(compare);
      const equipRow = element('div', 'inventory-action-row');
      const equip = button('Equip', () => mutate(() => systems.equipInventoryItem(characterId, selection.index, chosenSlot)), 'inventory-primary');
      function updateComparison() {
        const allowed = renderComparison(compare, chosenSlot);
        equip.disabled = snapshot.locked || !allowed;
      }
      if (item.slots.length > 1) {
        const slotSelect = element('select');
        slotSelect.setAttribute('aria-label', 'Equipment slot');
        slotSelect.dataset.focusKey = 'equipment-choice';
        for (const slot of item.slots) {
          const option = element('option', '', `${SLOT_LABELS[slot]} · ${snapshot.equipment[slot] ? ITEM_DB[snapshot.equipment[slot]].name : 'Empty'}`);
          option.value = slot;
          slotSelect.append(option);
        }
        slotSelect.value = chosenSlot;
        slotSelect.addEventListener('change', () => { chosenSlot = slotSelect.value; updateComparison(); });
        equipRow.append(slotSelect);
      }
      updateComparison();
      equip.dataset.focusKey = 'equip';
      equipRow.append(equip);
      actions.append(equipRow);
      if (item.handedness === 2) info.append(element('p', 'inventory-item-note', 'Uses both hands.'));
    }
    if (!fromBag) {
      const unequip = button('Unequip', () => mutate(() => systems.unequipInventoryItem(characterId, selection.slot)), 'inventory-primary');
      unequip.disabled = snapshot.locked;
      unequip.dataset.focusKey = 'unequip';
      actions.append(unequip);
    }
    if (fromBag && (item.heals || item.restoresSp)) {
      const use = button('Use', () => mutate(() => systems.useInventoryItem(characterId, selection.index)), 'inventory-primary');
      use.disabled = snapshot.locked;
      use.dataset.focusKey = 'use';
      actions.append(use);
    }
    if (fromBag && snapshot.party.length > 1) {
      const giveRow = element('div', 'inventory-action-row');
      const recipient = element('select');
      recipient.setAttribute('aria-label', 'Give item to');
      recipient.dataset.focusKey = 'recipient';
      for (const hero of snapshot.party.filter(hero => hero.id !== characterId)) {
        const option = element('option', '', hero.name);
        option.value = hero.id;
        recipient.append(option);
      }
      recipient.disabled = snapshot.locked;
      const give = button('Give', () => mutate(() => systems.transferInventoryItem(characterId, selection.index, recipient.value)));
      give.disabled = snapshot.locked;
      give.dataset.focusKey = 'give';
      giveRow.append(recipient, give);
      actions.append(giveRow);
    }
    details.append(info, actions);
  }

  function refresh() {
    if (screen.hidden) return;
    const focusKey = screen.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
    snapshot = systems.getInventorySnapshot(characterId);
    characterId = snapshot.character.id;
    characterName.textContent = snapshot.character.name;
    characterVitals.textContent = `Level ${snapshot.character.level} ${snapshot.character.classType}   ·   HP ${snapshot.character.hpCurrent}/${snapshot.character.hpMax}   ·   SP ${snapshot.character.spCurrent}/${snapshot.character.spMax}`;
    party.replaceChildren(...snapshot.party.map(hero => {
      const node = button('', () => {
        characterId = hero.id;
        selection = null;
        chosenSlot = undefined;
        status.textContent = '';
        refresh();
      }, 'inventory-party-member');
      node.dataset.focusKey = `hero-${hero.id}`;
      node.setAttribute('aria-pressed', String(hero.id === characterId));
      node.append(element('span', '', hero.name), element('small', '', hero.classType));
      return node;
    }));
    lockNotice.hidden = !snapshot.locked;
    lockNotice.textContent = snapshot.lockReason || 'Equipment cannot be changed during combat.';
    renderSlots(leftSlots, LEFT_SLOTS);
    renderSlots(rightSlots, RIGHT_SLOTS);
    renderBag();
    renderStats();
    renderDetails();
    refreshFigure();
    if (focusKey) {
      const target = [...screen.querySelectorAll('[data-focus-key]')].find(node => node.dataset.focusKey === focusKey);
      if (target && !target.disabled) target.focus({ preventScroll: true });
      else if (!screen.contains(document.activeElement) || document.activeElement === document.body) {
        const selected = screen.querySelector('.is-selected');
        (selected || closeButton).focus({ preventScroll: true });
      }
    }
  }

  function open(id) {
    if (!screen.hidden) {
      if (id) characterId = id;
      refresh();
      return;
    }
    previousFocus = document.activeElement;
    characterId = id;
    selection = null;
    status.textContent = '';
    screen.hidden = false;
    document.body.classList.add('inventory-open');
    unsubscribe = systems.subscribeInventory(refresh);
    refresh();
    closeButton.focus({ preventScroll: true });
    renderPreview();
  }

  function close() {
    if (screen.hidden) return;
    screen.hidden = true;
    stopPreviewAnimation();
    document.body.classList.remove('inventory-open');
    unsubscribe?.();
    unsubscribe = undefined;
    previousFocus?.focus({ preventScroll: true });
    onClose();
  }

  screen.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      const controls = [...screen.querySelectorAll('button:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  screen.addEventListener('keyup', event => event.stopPropagation());

  return {
    open, close,
    isOpen: () => !screen.hidden,
    dispose() {
      close();
      motionPreference.removeEventListener('change', onPreviewActivityChange);
      document.removeEventListener('visibilitychange', onPreviewActivityChange);
      resizeObserver?.disconnect();
      figure?.dispose();
      renderer?.dispose();
      screen.remove();
    },
  };
}
