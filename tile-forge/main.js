import { createTileFactory } from '../shared/render/tile-forge/factory.js';
import { registerStandardTiles, standardTileDefinitions } from '../shared/render/tile-forge/standardTiles.js';

const tileFactory = registerStandardTiles(createTileFactory({ size: 16 }));

const template = document.querySelector('#tile-card-template');
const categoryList = document.querySelector('[data-category-list]');

function groupByCategory(definitions) {
  const map = new Map();
  for (const def of definitions) {
    if (!map.has(def.category)) {
      map.set(def.category, []);
    }
    map.get(def.category).push(def);
  }
  for (const defs of map.values()) {
    defs.sort((a, b) => a.label.localeCompare(b.label));
  }
  return map;
}

function createTileCard(definition) {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector('.tile-card');
  const preview = fragment.querySelector('.tile-preview');
  const name = fragment.querySelector('.tile-name');
  const id = fragment.querySelector('.tile-id');

  const canvas = tileFactory.render(definition.id, { scale: 4 });
  preview.append(canvas);
  name.textContent = definition.label;
  id.textContent = definition.id;
  card.dataset.tileId = definition.id;

  card.addEventListener('click', () => copyIdentifier(definition.id));
  card.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      copyIdentifier(definition.id);
    }
  });
  card.tabIndex = 0;

  return fragment;
}

const toast = (() => {
  const el = document.createElement('div');
  el.className = 'copy-toast';
  document.body.append(el);
  let hideTimeout;
  return {
    show(message) {
      el.textContent = message;
      el.classList.add('show');
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        el.classList.remove('show');
      }, 1600);
    },
    fail(message) {
      el.textContent = message;
      el.classList.add('show');
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        el.classList.remove('show');
      }, 2000);
    },
  };
})();

async function copyIdentifier(identifier) {
  try {
    await navigator.clipboard.writeText(identifier);
    toast.show(`Copied "${identifier}"`);
  } catch (error) {
    console.warn('Clipboard copy failed', error);
    toast.fail('Clipboard unavailable');
  }
}

function render() {
  const groups = groupByCategory(standardTileDefinitions);
  for (const [category, defs] of groups.entries()) {
    const section = document.createElement('section');
    section.className = 'category';
    const heading = document.createElement('h2');
    heading.textContent = category;
    const grid = document.createElement('div');
    grid.className = 'tile-grid';

    defs.forEach((def) => {
      grid.append(createTileCard(def));
    });

    section.append(heading, grid);
    categoryList.append(section);
  }
}

render();
