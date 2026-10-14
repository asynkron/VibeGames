import { CLASS_DATA } from '../rules/classes.js';
import {
  getCharacterCreationOptions, availableClassOptions, rollAbilityScores,
  rollExceptionalStrength, validateParty, maximumLevel, starterEquipment,
} from '../rules/characters.js';
import { createVoxelCharacterPreview } from './voxelCharacterPreview.js';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(label, action, className = '') {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function labelFor(text, input, wide = false) {
  input.setAttribute('aria-label',text);
  const label = element('label', `character-field${wide ? ' character-field-wide' : ''}`);
  label.append(element('span', '', text), input);
  return label;
}
function options(select, values, selected) {
  select.replaceChildren(...values.map(value => {
    const option = element('option', '', typeof value === 'string' ? value : value.label);
    option.value = typeof value === 'string' ? value : value.id;
    return option;
  }));
  select.value = selected;
}

/** Edits an isolated new-party roster; starting is the only game-state mutation. */
export function createCharacterCreationPanel({ parent = document.body, onCreate, onClose = () => {} }) {
  const configuration = getCharacterCreationOptions();
  const roster = [];
  let selected = -1;
  let previousFocus;
  let pending = false;
  let background = [];

  const screen = element('section', 'inventory-screen character-creation-screen');
  screen.hidden = true;
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', 'character-creation-title');
  screen.setAttribute('aria-describedby', 'character-creation-intro');
  const shell = element('div', 'inventory-shell character-creation-shell');
  const header = element('header', 'inventory-header');
  const title = element('h1', '', 'Create a party');
  title.id = 'character-creation-title';
  const cancel = button('Cancel  [Esc]', close, 'inventory-close');
  header.append(title, cancel);
  const intro = element('p', 'character-intro', 'Build one to six adventurers for a fresh adventure in New Phlan. Starting replaces the current party and begins a new journey.');
  intro.id = 'character-creation-intro';
  const body = element('div', 'character-creation-body');
  const rosterPanel = element('section', 'character-roster');
  rosterPanel.setAttribute('aria-label', 'New party roster');
  const rosterHeading = element('div', 'character-roster-header');
  const count = element('span');
  rosterHeading.append(element('h3', '', 'Your party'), count);
  const rosterList = element('ol', 'character-roster-list');
  const emptyRoster = element('p', 'character-roster-empty', 'Add your first adventurer, then choose their race, class, and abilities.');
  const rosterControls = element('div', 'character-roster-controls');
  const earlier = button('Earlier', () => reorder(-1));
  const later = button('Later', () => reorder(1));
  const remove = button('Remove', removeCharacter);
  rosterControls.append(earlier, later, remove);
  const add = button('Add character', addCharacter, 'character-add');
  rosterPanel.append(rosterHeading, rosterList, emptyRoster, rosterControls, add);

  const editor = element('form', 'character-editor');
  editor.noValidate = true;
  editor.addEventListener('submit', event => event.preventDefault());
  editor.setAttribute('aria-label', 'Edit selected adventurer');
  const editorTitle = element('h2');
  const identity = element('div', 'character-identity');
  const name = element('input');
  name.type = 'text'; name.maxLength = 20; name.autocomplete = 'off'; name.spellcheck = false;
  name.required = true;
  const race = element('select');
  const characterClass = element('select');
  const alignment = element('select');
  identity.append(labelFor('Name', name, true), labelFor('Race', race), labelFor('Class', characterClass), labelFor('Alignment', alignment, true));
  const classNote = element('p', 'character-class-note');
  const abilities = element('fieldset', 'character-abilities');
  abilities.append(element('legend', '', 'Ability scores'));
  const abilityGrid = element('div', 'character-ability-grid');
  const scoreInputs = new Map();
  for (const ability of configuration.abilities) {
    const input = element('input');
    input.type = 'number'; input.step = '1'; input.required = true;
    input.addEventListener('input', () => {
      const character = roster[selected];
      const oldScore = character.attributes[ability];
      character.attributes[ability] = input.valueAsNumber;
      if (ability === 'strength') {
        if (character.attributes.strength !== 18) character.exceptionalStrength = 0;
        else if (oldScore !== 18) character.exceptionalStrength = rollExceptionalStrength(character.race, character.classes, character.attributes);
      }
      updateExceptional();
      updateState();
    });
    scoreInputs.set(ability, input);
    abilityGrid.append(labelFor(ability[0].toUpperCase() + ability.slice(1), input));
  }
  abilities.append(abilityGrid);
  const exceptional = element('input');
  exceptional.type = 'number'; exceptional.min = '0'; exceptional.step = '1';
  const exceptionalField = labelFor('Exceptional strength (18/xx)', exceptional);
  exceptionalField.classList.add('character-exceptional');
  const rollControls = element('div', 'character-roll-controls');
  const reroll = button('Reroll abilities', rerollCharacter);
  rollControls.append(reroll);
  const rollNote = element('p', 'character-roll-note', 'Roll four six-sided dice for each ability and keep the best three. Race limits and class requirements apply. You can adjust the scores before starting.');
  const errors = element('ul', 'character-errors');
  errors.setAttribute('aria-live', 'polite');
  editor.append(editorTitle, identity, classNote, abilities, exceptionalField, rollControls, rollNote, errors);

  const previewPanel = element('section', 'character-preview');
  previewPanel.setAttribute('aria-label', 'Character appearance');
  const previewBackdrop = element('div', 'inventory-preview');
  const viewport = element('div', 'inventory-preview-viewport');
  const rotation = element('div', 'inventory-rotate');
  const rotateLeft = button('Left', () => preview.rotate(-Math.PI / 4));
  const rotateRight = button('Right', () => preview.rotate(Math.PI / 4));
  rotateLeft.setAttribute('aria-label', 'Rotate character left');
  rotateRight.setAttribute('aria-label', 'Rotate character right');
  rotation.append(rotateLeft, element('span', '', 'Rotate'), rotateRight);
  previewBackdrop.append(viewport, rotation);
  const previewNote = element('p', 'character-preview-note', 'Starter equipment uses the same voxel character as inventory and combat.');
  previewPanel.append(previewBackdrop, previewNote);
  const emptyEditor = element('div', 'character-empty-editor');
  emptyEditor.append(element('h2', '', 'Your adventure starts here'), element('p', '', 'Choose a name, roll abilities, and assemble a party. Fighters hold the line, clerics heal and turn undead, magic-users prepare spells, and thieves strike from behind.'));
  body.append(rosterPanel, editor, previewPanel, emptyEditor);
  const footer = element('footer', 'character-creation-footer');
  const readiness = element('p');
  const start = button('Start new adventure', startAdventure, 'inventory-primary');
  footer.append(readiness, start);
  const status = element('p', 'character-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  shell.append(header, intro, body, footer, status);
  screen.append(shell);
  parent.append(screen);
  const preview = createVoxelCharacterPreview(viewport);

  name.addEventListener('input', () => { roster[selected].name = name.value; updateState(); });
  race.addEventListener('change', () => {
    const character = roster[selected];
    character.race = race.value;
    const choices = availableClassOptions(character.race);
    if (!choices.some(option => option.id === character.classes.join('/'))) {
      character.classes = [...choices[0].classes];
      character.classType = character.classes[0];
    }
    character.attributes = rollAbilityScores(character.race, character.classes);
    character.exceptionalStrength = rollExceptionalStrength(character.race, character.classes, character.attributes);
    renderEditor(); updateState();
    status.textContent = `Scores rerolled for ${character.race}.`;
  });
  characterClass.addEventListener('change', () => {
    const character = roster[selected];
    const chosen = availableClassOptions(character.race).find(option => option.id === characterClass.value);
    character.classes = [...chosen.classes]; character.classType = character.classes[0];
    character.exceptionalStrength = rollExceptionalStrength(character.race, character.classes, character.attributes);
    renderEditor(); updateState();
  });
  alignment.addEventListener('change', () => { roster[selected].alignment = alignment.value; updateState(); });
  exceptional.addEventListener('input', () => { roster[selected].exceptionalStrength = exceptional.valueAsNumber; updateState(); });

  function updateExceptional() {
    const character = roster[selected];
    const available = character?.classes.includes('Fighter') && character.attributes.strength === 18
      && configuration.raceRules[character.race].exceptionalMaximum > 0;
    exceptionalField.hidden = !available;
    if (available) {
      exceptional.max = String(configuration.raceRules[character.race].exceptionalMaximum);
      exceptional.value = String(character.exceptionalStrength);
    }
  }

  function renderEditor() {
    const character = roster[selected];
    const hasCharacter = Boolean(character);
    editor.hidden = !hasCharacter; previewPanel.hidden = !hasCharacter; emptyEditor.hidden = hasCharacter;
    preview.setActive(hasCharacter && !screen.hidden);
    if (!hasCharacter) return;
    name.value = character.name;
    options(race, configuration.races, character.race);
    options(characterClass, availableClassOptions(character.race), character.classes.join('/'));
    options(alignment, configuration.alignments, character.alignment);
    const rules = configuration.raceRules[character.race];
    for (const [index, ability] of configuration.abilities.entries()) {
      const input = scoreInputs.get(ability);
      input.min = String(rules.minimum[index]); input.max = String(rules.maximum[index]);
      input.value = Number.isFinite(character.attributes[ability]) ? String(character.attributes[ability]) : '';
    }
    const descriptions = character.classes.map(classType => `${CLASS_DATA[classType].description} Maximum level ${maximumLevel(character.race, classType)}.`);
    classNote.textContent = descriptions.join(' ');
    updateExceptional();
  }

  function updateState() {
    const current = roster[selected];
    count.textContent = `${roster.length} / 6`;
    emptyRoster.hidden = roster.length > 0;
    rosterControls.hidden = roster.length === 0;
    earlier.disabled = selected <= 0 || pending;
    later.disabled = selected < 0 || selected >= roster.length - 1 || pending;
    remove.disabled = selected < 0 || pending;
    add.disabled = roster.length >= 6 || pending;
    cancel.disabled = pending; reroll.disabled = pending;
    for (const input of editor.querySelectorAll('input, select')) input.disabled = pending;
    earlier.setAttribute('aria-label', `Move ${current?.name || 'character'} earlier in the party`);
    later.setAttribute('aria-label', `Move ${current?.name || 'character'} later in the party`);
    remove.setAttribute('aria-label', `Remove ${current?.name || 'character'} from the new party`);
    rosterList.replaceChildren(...roster.map((character, index) => {
      const row = element('li');
      const select = button('', () => { selected = index; status.textContent = ''; renderEditor(); updateState(); name.focus(); }, 'inventory-party-member character-roster-member');
      select.disabled = pending;
      select.setAttribute('aria-pressed', String(index === selected));
      select.setAttribute('aria-label', `Edit ${character.name || 'Unnamed adventurer'}, ${character.race} ${character.classes.join('/')}`);
      select.append(element('span', '', character.name || 'Unnamed adventurer'), element('small', '', `${character.race} · ${character.classes.join('/')}`));
      row.append(select); return row;
    }));
    const validation = validateParty(roster);
    start.disabled = pending || !validation.ok;
    start.textContent = pending ? 'Starting adventure…' : 'Start new adventure';
    readiness.textContent = roster.length === 0 ? 'Add one to six adventurers.'
      : validation.ok ? `${roster.length} ${roster.length === 1 ? 'adventurer is' : 'adventurers are'} ready for New Phlan.` : 'Finish the character details before starting.';
    errors.replaceChildren();
    if (roster.length && !validation.ok) errors.append(element('li', '', validation.message));
    if (current) {
      editorTitle.textContent = current.name || 'Unnamed adventurer';
      preview.setCharacter({ kind: current.classType, equipment: starterEquipment(current.classType) },
        `${current.name || 'Adventurer'}, ${current.race} ${current.classes.join('/')}, wearing starter equipment.`);
    }
  }

  function addCharacter() {
    let number = 1;
    while (roster.some(character => character.name === `Adventurer ${number}`)) number += 1;
    const attributes = rollAbilityScores('Human', 'Fighter');
    roster.push({ name: `Adventurer ${number}`, race: 'Human', classType: 'Fighter', classes: ['Fighter'], alignment: 'Neutral good',
      attributes, exceptionalStrength: rollExceptionalStrength('Human', 'Fighter', attributes) });
    selected = roster.length - 1;
    status.textContent = ''; renderEditor(); updateState(); name.focus(); name.select();
  }

  function removeCharacter() {
    roster.splice(selected, 1); selected = Math.min(selected, roster.length - 1);
    status.textContent = ''; renderEditor(); updateState();
    if (selected >= 0) name.focus(); else add.focus();
  }

  function reorder(direction) {
    const destination = selected + direction;
    [roster[selected], roster[destination]] = [roster[destination], roster[selected]];
    selected = destination;
    renderEditor(); updateState();
    rosterList.querySelector('[aria-pressed="true"]').focus();
  }

  function rerollCharacter() {
    const character = roster[selected];
    character.attributes = rollAbilityScores(character.race, character.classes);
    character.exceptionalStrength = rollExceptionalStrength(character.race, character.classes, character.attributes);
    renderEditor(); updateState(); status.textContent = 'Ability scores rerolled.';
  }

  async function startAdventure() {
    const validation = validateParty(roster);
    if (!validation.ok || pending) return;
    pending = true; updateState(); status.textContent = '';
    try {
      const descriptors = roster.map(character => ({ ...character, name: character.name.trim(), classes: [...character.classes], attributes: { ...character.attributes } }));
      const result = await onCreate(descriptors);
      if (result?.ok === false) { status.textContent = result.message; return; }
      pending = false; close();
    } catch (error) {
      status.textContent = error.message || 'The adventure could not start. Please try again.';
    } finally {
      pending = false;
      if (!screen.hidden) updateState();
    }
  }

  function open() {
    if (!screen.hidden) return;
    previousFocus = document.activeElement;
    roster.length = 0; selected = -1; status.textContent = '';
    background = [...parent.children].filter(node => node !== screen).map(node => ({ node, inert: node.inert }));
    for (const { node } of background) node.inert = true;
    screen.hidden = false;
    document.body.classList.add('character-creation-open');
    renderEditor(); updateState(); add.focus({ preventScroll: true });
  }

  function close() {
    if (screen.hidden || pending) return;
    screen.hidden = true; preview.setActive(false);
    document.body.classList.remove('character-creation-open');
    for (const { node, inert } of background) node.inert = inert;
    background = [];
    previousFocus?.focus?.({ preventScroll: true });
    onClose();
  }

  document.addEventListener('keydown', event => {
    if (screen.hidden) return;
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...screen.querySelectorAll('button, input, select')].filter(node => !node.disabled && node.getClientRects().length > 0);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !screen.contains(document.activeElement))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !screen.contains(document.activeElement))) {
      event.preventDefault(); first?.focus();
    }
  }, true);

  return { open, close, isOpen: () => !screen.hidden };
}
