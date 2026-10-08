import {
  COMBAT_APPEARANCE_OPTIONS,
  COMBAT_SPRITE_KINDS,
  createCombatSpriteCanvas,
  getCombatAppearance,
} from './combatSprites.js';

const kindSelect = document.querySelector('#kind');
const partsContainer = document.querySelector('#parts');
const variantPartSelect = document.querySelector('#variant-part');
const variantList = document.querySelector('#variant-list');
const partSelects = new Map();
const state = { kind: 'warrior', appearance: null, variantPart: 'weapon' };

function label(value) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, character => character.toUpperCase());
}

function addOption(select, value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label(value);
  select.append(option);
}

function makeSprite(facing, appearance = state.appearance) {
  const canvas = createCombatSpriteCanvas({ kind: state.kind, appearance, facing });
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${label(state.kind)} facing ${facing}`);
  return canvas;
}

function renderVariants() {
  variantList.replaceChildren();
  for (const value of COMBAT_APPEARANCE_OPTIONS[state.variantPart]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'variant';
    button.setAttribute('aria-pressed', String(state.appearance[state.variantPart] === value));
    button.setAttribute('aria-label', `Use ${label(value)} ${label(state.variantPart).toLowerCase()}`);
    button.append(makeSprite('right', { ...state.appearance, [state.variantPart]: value }));
    const caption = document.createElement('span');
    caption.textContent = label(value);
    button.append(caption);
    button.addEventListener('click', () => {
      state.appearance[state.variantPart] = value;
      render();
    });
    variantList.append(button);
  }
}

function render() {
  for (const [part, select] of partSelects) select.value = state.appearance[part];
  for (const facing of ['left', 'right']) {
    document.querySelector(`#${facing}-preview`).replaceChildren(makeSprite(facing));
    document.querySelector(`#native-${facing}`).replaceChildren(makeSprite(facing));
  }
  renderVariants();
}

function resetAppearance() {
  state.appearance = { ...getCombatAppearance({ kind: state.kind }) };
  render();
}

for (const kind of COMBAT_SPRITE_KINDS) {
  if (!getCombatAppearance({ kind }).form) addOption(kindSelect, kind);
}
kindSelect.value = state.kind;
kindSelect.addEventListener('change', () => {
  state.kind = kindSelect.value;
  resetAppearance();
});

for (const [part, options] of Object.entries(COMBAT_APPEARANCE_OPTIONS)) {
  const field = document.createElement('label');
  field.className = 'field';
  const caption = document.createElement('span');
  caption.textContent = label(part);
  const select = document.createElement('select');
  select.id = `part-${part}`;
  for (const value of options) addOption(select, value);
  select.addEventListener('change', () => {
    state.appearance[part] = select.value;
    state.variantPart = part;
    variantPartSelect.value = part;
    render();
  });
  field.append(caption, select);
  partsContainer.append(field);
  partSelects.set(part, select);
  addOption(variantPartSelect, part);
}

variantPartSelect.value = state.variantPart;
variantPartSelect.addEventListener('change', () => {
  state.variantPart = variantPartSelect.value;
  renderVariants();
});

document.querySelector('#reset').addEventListener('click', resetAppearance);
document.querySelector('#grid-toggle').addEventListener('change', event => {
  for (const preview of document.querySelectorAll('.sprite')) preview.classList.toggle('with-grid', event.target.checked);
});

resetAppearance();
