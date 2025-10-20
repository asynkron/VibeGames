import { createCanvasResolutionManager } from '../shared/render/hudCanvas.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const viewportElement = document.querySelector('.viewport');

const TILE_SIZE = 32;
const BASE_SPRITE_SIZE = 16;
const VIEW_COLS = 25;
const VIEW_ROWS = 15;
const CANVAS_WIDTH = VIEW_COLS * TILE_SIZE;
const CANVAS_HEIGHT = VIEW_ROWS * TILE_SIZE;

const resolutionManager = createCanvasResolutionManager(canvas, {
  logicalWidth: CANVAS_WIDTH,
  logicalHeight: CANVAS_HEIGHT,
  onPixelRatioChange(ratio) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.imageSmoothingEnabled = false;
  },
});

resolutionManager.sync();

const VIEWPORT_ASPECT = CANVAS_WIDTH / CANVAS_HEIGHT;
// Render with the modern colorized tiles while keeping sprite coordinates consistent.
const TILESET_VARIANT = 'modern';

ctx.imageSmoothingEnabled = false;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = '14px "IBM Plex Mono", "Courier New", monospace';

const TILESET_IMAGE_URL = new URL('./assets/ultima.png', import.meta.url).href;
const TILESET_DATA_URL = new URL('./assets/tiles.json', import.meta.url).href;

let spriteSheet = null;
let spriteSize = BASE_SPRITE_SIZE;
const spriteAtlas = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function buildSpriteAtlas(metadata) {
  const tileSet = metadata['tile-set'] ?? {};
  const classicStartRow = Number.isFinite(tileSet['classic-start-row'])
    ? Number(tileSet['classic-start-row'])
    : 0;
  const modernStartRow = Number.isFinite(tileSet['modern-start-row'])
    ? Number(tileSet['modern-start-row'])
    : classicStartRow;
  const selectedStartRow = TILESET_VARIANT === 'modern' ? modernStartRow : classicStartRow;
  spriteSize = tileSet['tile-size'] ?? BASE_SPRITE_SIZE;
  spriteAtlas.clear();
  // Each row entry in the metadata corresponds to both classic and modern
  // tiles; shifting by the classic start row targets the Apple II inspired
  // originals while allowing the metadata to describe alternative atlases.
  const rowEntries = Object.entries(metadata)
    .filter(([key]) => /^row\d+$/.test(key))
    .sort(([a], [b]) => parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10));
  for (const [rowKey, names] of rowEntries) {
    const rowIndex = parseInt(rowKey.slice(3), 10) - 1;
    const actualRow = selectedStartRow + rowIndex;
    names.forEach((name, column) => {
      if (!name) return;
      spriteAtlas.set(name, {
        sx: column * spriteSize,
        sy: actualRow * spriteSize,
        sw: spriteSize,
        sh: spriteSize,
      });
    });
  }
}

function drawSprite(name, px, py) {
  const frame = spriteAtlas.get(name);
  if (!spriteSheet || !frame) return false;
  ctx.drawImage(
    spriteSheet,
    frame.sx,
    frame.sy,
    frame.sw ?? spriteSize,
    frame.sh ?? spriteSize,
    px,
    py,
    TILE_SIZE,
    TILE_SIZE,
  );
  return true;
}

// Keep the CRT viewport scaled inside its frame without distorting pixels.
function resizeViewport() {
  if (!viewportElement) return;
  const screen = viewportElement.parentElement;
  if (!screen) return;
  const styles = window.getComputedStyle(screen);
  const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  const availableWidth = Math.max(0, screen.clientWidth - paddingX);
  const availableHeight = Math.max(0, screen.clientHeight - paddingY);
  if (availableWidth === 0 || availableHeight === 0) return;
  const widthFromHeight = availableHeight * VIEWPORT_ASPECT;
  const heightFromWidth = availableWidth / VIEWPORT_ASPECT;
  let renderWidth;
  let renderHeight;
  if (widthFromHeight <= availableWidth) {
    renderWidth = widthFromHeight;
    renderHeight = availableHeight;
  } else {
    renderWidth = availableWidth;
    renderHeight = heightFromWidth;
  }
  viewportElement.style.width = `${Math.floor(renderWidth)}px`;
  viewportElement.style.height = `${Math.floor(renderHeight)}px`;
}

let resizeScheduled = false;

function scheduleViewportResize() {
  if (resizeScheduled) return;
  resizeScheduled = true;
  window.requestAnimationFrame(() => {
    resizeScheduled = false;
    resolutionManager.sync();
    resizeViewport();
  });
}

// Palette tuned for monochrome tiles reminiscent of the Apple II palette.
const TILES = {
  '.': { name: 'Grassland', color: '#14532d', passable: true, sprite: 'grass' },
  '~': { name: 'Ocean', color: '#1d4ed8', passable: false, sprite: 'water' },
  'F': { name: 'Forest', color: '#166534', passable: true, movementCost: 2, sprite: 'forest' },
  '^': { name: 'Mountain', color: '#475569', passable: false, sprite: 'mountains' },
  'C': { name: 'Castle', color: '#78350f', passable: true, sprite: 'castle' },
  'R': { name: 'Ruins', color: '#64748b', passable: true, sprite: 'mountain-entrance' },
  'S': { name: 'Sanctum', color: '#0ea5e9', passable: true, sprite: 'castle-flag-green' },
  'D': { name: 'Desert', color: '#b45309', passable: true },
  'P': { name: 'Harbor', color: '#1f2937', passable: true },
  'G': { name: 'Moongate', color: '#f472b6', passable: true, sprite: 'portal' },
  '#': { name: 'Wall', color: '#1f2937', passable: false, sprite: 'shield-blue' },
  ' ': { name: 'Void', color: '#020617', passable: false },
};

// The overworld layout features a central island with a castle hub,
// surrounding forests, and shoreline settlements so the Avatar spawns on walkable land.
const mapText = `
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^FF^FF^FF^FF^FF^FF^F~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^..................^~~~~
~~~~~~~~~~~~~~~~~~~~...^^^^^^^^^...~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~F..................F~~~~
~~~~~~~~~~~~~~~~~~~~...............~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~F..................F~~~~
~~~~~~~~~~~~~~~~~~~~...............~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^..................^~~~~
~~~~~~~~~~~~~~~~~~~~.......R.......~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~F.....G....S.......F~~~~
~~~~~~~~~~~~~~~~~~~~..........C....~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~F...........R......F~~~~
~~~~~~~~~~~~~~~~~~~~...............~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^..................^~~~~
~~~~~~~~~~~~~~~~~~~~...............~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~F.....R............F~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~F..................F~~~~
~~~~~~~~~~~~~~~~~~FFFFFFFFFF.FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF~~~~~~^...DDDD.DDDDD.....^~~~~
~~~~~~~~~~~~~~~~~~F........................................F~~~~~~F..................F~~~~
~~~~~~~~FFFFFFFFFFF........................................F~~~~~~F...DDDDDDDDDD.....F~~~~
~~~~~~~~FFFFFFFFFFF........................................F~~~~~~^...DDDDDDDDDD.....^~~~~
~~~~~~~~FFFFFFFFFFF.....^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^.....F~~~~~~F..................F~~~~
~~~~~~~~FFFFFFFFFFF.......^^^^^^^^^^^^^^^^^^^^^^^^^^.......F~~~~~~^FF^FF^FF^FF^FF^FF^F~~~~
~~~~~~~~FFFFFFFFFFF.........^^^^^^^^^^^^^^^^^^^^^^.........F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF...............................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF.FFFFF^^....................R...R...R..........F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF.FFFFF^^.......................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF.FFFFF^^..........F..FDDDD.F..F..F..F..........F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF.FFFFF^^.......................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF.FFFFF^^..............CCCC.............RPPP~...F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF.FFFFF^^..............CCCC.................G...F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF.FFFFF^^..................................C....F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~FFFF.FFFFF^^......C..........................R.....F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~F...............DDDD.......C.............F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~F........................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~F........................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~F...........F..F..F..F..F..F..F..........F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~..........................R......................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~.DDDDDDDD........................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~.DDDDDDDD.......................................GF~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~.DDDDDDDS........................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~.DDDRDDDD.....G..................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~.DDDDDDDD........................................F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~.DGDDDSDD.FFFFFFFFFFFF.FFFFFFFFFFFFFFFFFFFFFFFFFFF~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~..F...F...DDDD.~~~~~~~~~~~~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~.F...F...FDDDD.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~F...F...F......~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~...F...F..~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~..F...F...~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~.F...F...F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~^~~~^~~~^~~~^~~~^~~~^~~~^~
~~~~~F...F...F.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~...F...F..~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~..F...F...~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~.F...F...F~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;


const world = createWorld(mapText);

const moongateNetwork = new Map([
  ['55,31', { x: 72, y: 13, name: 'Moonrise Glade' }],
  ['72,13', { x: 24, y: 42, name: 'Causeway of Winds' }],
  ['24,42', { x: 12, y: 44, name: 'Sunken Dunes' }],
  ['12,44', { x: 58, y: 40, name: 'Southwatch Causeway' }],
  ['58,40', { x: 55, y: 31, name: 'Harbor of Dawn' }],
]);

const MAP_SCALE = 4;
const MAP_TILE_COLORS = {
  '~': '#1e3a8a',
  '.': '#16a34a',
  F: '#15803d',
  '^': '#e2e8f0',
  C: '#f59e0b',
  R: '#94a3b8',
  S: '#38bdf8',
  D: '#c2410c',
  P: '#475569',
  G: '#f472b6',
  '#': '#1f2937',
  ' ': '#020617',
};

const mapOverlay = document.getElementById('map-overlay');
const mapCanvas = document.getElementById('world-map');
const mapCtx = mapCanvas ? mapCanvas.getContext('2d') : null;

if (mapCanvas) {
  mapCanvas.width = world.width * MAP_SCALE;
  mapCanvas.height = world.height * MAP_SCALE;
}

const itemsOnGround = [];
const messageLog = [];

// Core quest descriptors keep text separate from logic, making it easier to expand content.
const questDefinitions = {
  lostChart: {
    title: 'Recover the Star Chart',
    description: 'Captain Mirna lost her astral chart to a moon pirate. Recover it and bring it back to her in the castle port.',
    reward: 'Mirna teaches you celestial navigation (max HP +2).',
  },
  herbGarden: {
    title: 'Replant the Herb Garden',
    description: 'Apprentice druid Elowen needs three Moon Herbs from the ruins to restore the sanctum garden.',
    reward: 'Elowen brews a healing draught (restores you to full health).',
  },
};

const gameState = {
  player: {
    name: 'Avatar',
    glyph: '@',
    color: '#f8fafc',
    sprite: 'knight-green',
    x: 35,
    y: 31,
    hp: 18,
    maxHp: 18,
    attack: 5,
    level: 4,
    experience: 1200,
    strength: 13,
    dexterity: 11,
    intelligence: 10,
    constitution: 12,
    gold: 25,
    inventory: [],
    spells: ['Light', 'Blink', 'Flame Bolt'],
    scrolls: ['Rune of Return', 'Chart of the Silver Sky'],
    potions: ['Healing Draught', 'Nightshade Tonic'],
    quests: {
      lostChart: { status: 'not started' },
      herbGarden: { status: 'not started', collected: 0 },
    },
    spawn: { x: 35, y: 31 },
  },
  monsters: [],
  npcs: [],
  conversation: null,
  lastMoongate: null,
  mapVisible: false,
};

// Item templates allow for simple cloning when loot drops or rewards are granted.
const itemTemplates = {
  moonHerb: {
    id: 'moonHerb',
    name: 'Moon Herb',
    glyph: '*',
    color: '#22c55e',
    description: 'A luminous herb prized by druids for its restorative oils.',
  },
  starChart: {
    id: 'starChart',
    name: 'Astral Chart',
    glyph: '✶',
    color: '#facc15',
    description: 'A vellum map of the heavens, plotted by Captain Mirna.',
  },
  rustyCutlass: {
    id: 'rustyCutlass',
    name: 'Rusty Cutlass',
    glyph: '/',
    color: '#f97316',
    description: 'A pirate blade, better served as scrap than a weapon.',
  },
  druidicCharm: {
    id: 'druidicCharm',
    name: 'Druidic Charm',
    glyph: '☘',
    color: '#34d399',
    description: 'A charm that hums with gentle forest magic. Adds +1 attack.',
    onAcquire(state) {
      state.player.attack += 1;
      addMessage('You feel your strikes guided by the wilds (+1 attack).');
    },
  },
};

function createWorld(text) {
  const rows = text.trim().split('\n');
  const height = rows.length;
  const width = rows.reduce((max, line) => Math.max(max, line.length), 0);
  const data = [];
  for (let y = 0; y < height; y += 1) {
    const line = rows[y] ?? '';
    for (let x = 0; x < width; x += 1) {
      const ch = line[x] ?? '.';
      const tile = TILES[ch] ?? TILES['.'];
      data.push({
        symbol: ch,
        ...tile,
      });
    }
  }
  return {
    width,
    height,
    data,
    tileAt(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return { symbol: ' ', passable: false, color: '#020617', name: 'void' };
      return data[y * width + x];
    },
  };
}

function addMessage(text) {
  messageLog.push({ text, time: Date.now() });
  if (messageLog.length > 20) {
    messageLog.shift();
  }
  renderLog();
}

function placeItem(templateId, x, y) {
  const template = itemTemplates[templateId];
  if (!template) return;
  itemsOnGround.push({ ...template, x, y });
}

function playerHasItem(id) {
  return gameState.player.inventory.some((item) => item.id === id);
}

function pickupItemsAt(x, y) {
  for (let i = itemsOnGround.length - 1; i >= 0; i -= 1) {
    const item = itemsOnGround[i];
    if (item.x === x && item.y === y) {
      itemsOnGround.splice(i, 1);
      gameState.player.inventory.push(item);
      addMessage(`You pick up the ${item.name}.`);
      if (typeof item.onAcquire === 'function') {
        item.onAcquire(gameState);
      }
      if (item.id === 'moonHerb') {
        gameState.player.quests.herbGarden.collected += 1;
      }
      if (item.id === 'starChart') {
        gameState.player.quests.lostChart.status = 'has item';
      }
    }
  }
  renderInventory();
  renderQuests();
}

function useMoongateIfPresent() {
  const { player } = gameState;
  const key = `${player.x},${player.y}`;
  const destination = moongateNetwork.get(key);
  if (!destination) {
    gameState.lastMoongate = null;
    return false;
  }
  if (gameState.lastMoongate === key) {
    return false;
  }
  gameState.lastMoongate = key;
  player.x = destination.x;
  player.y = destination.y;
  addMessage(`The moongate shimmers and carries you to ${destination.name}. Step through again to follow the ley-line.`);
  return true;
}

function spawnMonsters() {
  const monsterTemplates = [
    {
      id: 'moonPirate',
      name: 'Moon Pirate',
      glyph: 'P',
      color: '#fbbf24',
      sprite: 'rogue',
      hp: 9,
      attack: 3,
      biography: 'Sky-scouring corsairs who pillage astral charts to sell to off-worlders.',
      loot: ['starChart', 'rustyCutlass'],
      x: 53,
      y: 31,
    },
    {
      id: 'shadowStalker',
      name: 'Shadow Stalker',
      glyph: 'S',
      color: '#c084fc',
      sprite: 'golem',
      hp: 7,
      attack: 2,
      biography: 'A remnant of Mondain\'s armies, now haunting the sanctum at twilight.',
      loot: ['moonHerb'],
      x: 76,
      y: 15,
    },
    {
      id: 'lunarWisp',
      name: 'Lunar Wisp',
      glyph: 'W',
      color: '#a5b4fc',
      sprite: 'portal',
      hp: 5,
      attack: 1,
      biography: 'Luminescent spirits drawn to the ruins in search of forgotten vows.',
      loot: ['moonHerb'],
      x: 24,
      y: 35,
    },
  ];

  gameState.monsters = monsterTemplates.map((template) => ({
    ...template,
    alive: true,
  }));
}

// Dialogue-driven NPC definitions with branching state transitions and quest hooks.
function spawnNPCs() {
  const npcs = [
    {
      id: 'mirna',
      name: 'Captain Mirna',
      glyph: 'M',
      color: '#f8fafc',
      sprite: 'knight',
      x: 36,
      y: 31,
      biography: 'Former Royal Navy navigator of Sosaria, now guarding the tides at Moon Isle.',
      dialogue: {
        start(state) {
          const quest = state.player.quests.lostChart;
          if (quest.status === 'complete') return 'completed';
          if (quest.status === 'has item') return 'return';
          if (quest.status === 'in progress') return 'progress';
          return 'intro';
        },
        states: {
          intro: {
            text: 'The sea charts were stolen by pirates of the dark moon. Without them the royal fleet is blind.',
            options: [
              {
                label: 'Ask about work',
                run(state, npc) {
                  const quest = state.player.quests.lostChart;
                  if (quest.status === 'not started') {
                    quest.status = 'in progress';
                    addMessage('Quest started: Recover the Star Chart.');
                    renderQuests();
                  }
                  return 'progress';
                },
              },
              { label: 'Offer a word of courage', run: () => 'encourage' },
              { label: 'Take your leave', run: () => null },
            ],
          },
          progress: {
            text: 'Search the ruins eastward; the corsair was last seen there. Bring me the astral chart and the tides will be ours again.',
            options: [
              { label: 'I will return', run: () => null },
            ],
          },
          encourage: {
            text: 'Mirna smiles wearily. "The winds favor the brave, Avatar. Return with haste."',
            options: [
              { label: 'Back to business', run: () => 'progress' },
            ],
          },
          return: {
            text: 'You found it! With these stars the fleet sails once more. Hold fast while I commit the patterns to memory.',
            options: [
              {
                label: 'Hand over the chart',
                run(state) {
                  const itemIndex = state.player.inventory.findIndex((item) => item.id === 'starChart');
                  if (itemIndex >= 0) {
                    state.player.inventory.splice(itemIndex, 1);
                    state.player.quests.lostChart.status = 'complete';
                    state.player.maxHp += 2;
                    state.player.hp = state.player.maxHp;
                    addMessage('Mirna rewards you with celestial insight (+2 max HP).');
                    renderInventory();
                    renderQuests();
                    return 'completed';
                  }
                  return 'progress';
                },
              },
            ],
          },
          completed: {
            text: 'The fleet charts are safe again thanks to you. Sosaria sails beneath kinder tides this night.',
            options: [
              { label: 'Savor the victory', run: () => null },
            ],
          },
        },
      },
    },
    {
      id: 'elowen',
      name: 'Elowen the Verdant',
      glyph: 'E',
      color: '#bbf7d0',
      sprite: 'archer',
      x: 74,
      y: 16,
      biography: 'A young druid apprenticed in the sanctum, sworn to heal the scars of Mondain\'s war.',
      dialogue: {
        start(state) {
          const quest = state.player.quests.herbGarden;
          if (quest.status === 'complete') return 'gratitude';
          if (quest.collected >= 3 && quest.status === 'in progress') return 'turnIn';
          if (quest.status === 'in progress') return 'encourage';
          return 'greeting';
        },
        states: {
          greeting: {
            text: 'This sanctum once bloomed with Moon Herbs. The war scorched them away. Would you gather new sprouts?',
            options: [
              {
                label: 'Agree to help',
                run(state) {
                  const quest = state.player.quests.herbGarden;
                  quest.status = 'in progress';
                  quest.collected = quest.collected || 0;
                  addMessage('Quest started: Replant the Herb Garden.');
                  renderQuests();
                  return 'encourage';
                },
              },
              { label: 'Decline politely', run: () => null },
            ],
          },
          encourage: {
            text: 'Seek the ruins west of here. Three Moon Herbs will suffice for the sanctum beds.',
            options: [
              { label: 'I am on it', run: () => null },
            ],
          },
          turnIn: {
            text: 'You have the herbs! Place them here and I shall brew a draught to mend your wounds.',
            options: [
              {
                label: 'Deliver the Moon Herbs',
                run(state) {
                  const quest = state.player.quests.herbGarden;
                  let turnedIn = 0;
                  state.player.inventory = state.player.inventory.filter((item) => {
                    if (item.id === 'moonHerb' && turnedIn < 3) {
                      turnedIn += 1;
                      return false;
                    }
                    return true;
                  });
                  if (turnedIn >= 3) {
                    quest.status = 'complete';
                    quest.collected = 3;
                    state.player.hp = state.player.maxHp;
                    const charm = { ...itemTemplates.druidicCharm };
                    state.player.inventory.push(charm);
                    if (typeof charm.onAcquire === 'function') {
                      charm.onAcquire(state);
                    }
                    addMessage('Elowen crafts a restorative draught and gifts you a druidic charm.');
                    renderInventory();
                    renderQuests();
                    return 'gratitude';
                  }
                  addMessage('You still need more Moon Herbs.');
                  renderInventory();
                  return 'encourage';
                },
              },
            ],
          },
          gratitude: {
            text: 'May the forests shelter you, Avatar. The sanctum is alive once more.',
            options: [
              { label: 'Leave the sanctum', run: () => null },
            ],
          },
        },
      },
    },
  ];

  gameState.npcs = npcs;
}

function isBlocked(x, y) {
  const tile = world.tileAt(x, y);
  if (!tile.passable) return true;
  if (gameState.npcs.some((npc) => npc.x === x && npc.y === y)) return true;
  if (gameState.monsters.some((monster) => monster.alive && monster.x === x && monster.y === y)) return true;
  return false;
}

function movePlayer(dx, dy) {
  if (gameState.conversation) return;
  const { player } = gameState;
  const nx = player.x + dx;
  const ny = player.y + dy;
  const tile = world.tileAt(nx, ny);
  const monster = gameState.monsters.find((m) => m.alive && m.x === nx && m.y === ny);
  if (monster) {
    engageCombat(monster);
    return;
  }
  if (!tile.passable) {
    addMessage(`You cannot cross the ${tile.name.toLowerCase()}.`);
    return;
  }
  const npc = gameState.npcs.find((n) => n.x === nx && n.y === ny);
  if (npc) {
    addMessage(`${npc.name} blocks your path.`);
    return;
  }
  player.x = nx;
  player.y = ny;
  useMoongateIfPresent();
  pickupItemsAt(player.x, player.y);
  tickWorld();
}

function engageCombat(monster) {
  const { player } = gameState;
  const damage = Math.max(1, player.attack + Math.floor(Math.random() * 3) - 1);
  monster.hp -= damage;
  addMessage(`You strike the ${monster.name} for ${damage} damage.`);
  if (monster.hp <= 0) {
    monster.alive = false;
    addMessage(`The ${monster.name} is defeated.`);
    dropLoot(monster);
  } else {
    const retaliation = Math.max(0, monster.attack + Math.floor(Math.random() * 2) - 1);
    if (retaliation > 0) {
      player.hp -= retaliation;
      addMessage(`The ${monster.name} retaliates for ${retaliation} damage.`);
    } else {
      addMessage(`The ${monster.name} misses.`);
    }
  }
  if (player.hp <= 0) {
    handlePlayerDefeat();
  }
  tickWorld();
  renderStats();
}

function handlePlayerDefeat() {
  const { player } = gameState;
  addMessage('You fall unconscious and awaken back at the castle infirmary.');
  player.hp = Math.ceil(player.maxHp / 2);
  player.x = player.spawn.x;
  player.y = player.spawn.y;
}

function dropLoot(monster) {
  if (!monster.loot || monster.loot.length === 0) return;
  let itemId = monster.loot[Math.floor(Math.random() * monster.loot.length)];
  if (
    monster.loot.includes('starChart') &&
    gameState.player.quests.lostChart.status !== 'complete' &&
    !playerHasItem('starChart') &&
    !itemsOnGround.some((item) => item.id === 'starChart')
  ) {
    itemId = 'starChart';
  }
  placeItem(itemId, monster.x, monster.y);
  addMessage(`The ${monster.name} drops ${itemTemplates[itemId]?.name ?? 'something'}.`);
}

function tickWorld() {
  tickMonsters();
  render();
}

function tickMonsters() {
  for (const monster of gameState.monsters) {
    if (!monster.alive) continue;
    const dx = Math.sign(gameState.player.x - monster.x);
    const dy = Math.sign(gameState.player.y - monster.y);
    const attempt = Math.random() < 0.6 ? [dx, 0] : [0, dy];
    const alternatives = [attempt, [dx, dy], [Math.random() < 0.5 ? -1 : 1, 0], [0, Math.random() < 0.5 ? -1 : 1]];
    for (const [mx, my] of alternatives) {
      const nx = monster.x + mx;
      const ny = monster.y + my;
      if (nx === gameState.player.x && ny === gameState.player.y) {
        const retaliation = Math.max(1, monster.attack + Math.floor(Math.random() * 2) - 1);
        gameState.player.hp -= retaliation;
        addMessage(`The ${monster.name} lashes out and hits you for ${retaliation}.`);
        if (gameState.player.hp <= 0) handlePlayerDefeat();
        break;
      }
      const tile = world.tileAt(nx, ny);
      const occupiedByMonster = gameState.monsters.some((other) => other !== monster && other.alive && other.x === nx && other.y === ny);
      const occupiedByNPC = gameState.npcs.some((npc) => npc.x === nx && npc.y === ny);
      if (!tile.passable || occupiedByMonster || occupiedByNPC) {
        continue;
      }
      monster.x = nx;
      monster.y = ny;
      break;
    }
  }
  renderStats();
}

function talkToNPC() {
  if (gameState.conversation) return;
  const { player } = gameState;
  const npc = gameState.npcs.find((character) => Math.abs(character.x - player.x) + Math.abs(character.y - player.y) === 1);
  if (!npc) {
    addMessage('No one is close enough to hear you.');
    return;
  }
  openConversation(npc, npc.dialogue.start(gameState));
}

function openConversation(npc, stateId) {
  if (!stateId) {
    closeConversation();
    return;
  }
  gameState.conversation = {
    npcId: npc.id,
    stateId,
  };
  renderDialogue();
}

function closeConversation() {
  gameState.conversation = null;
  renderDialogue();
}

function resolveConversationOption(index) {
  const convo = gameState.conversation;
  if (!convo) return;
  const npc = gameState.npcs.find((character) => character.id === convo.npcId);
  if (!npc) return;
  const state = npc.dialogue.states[convo.stateId];
  const option = state.options[index];
  if (!option) return;
  const next = option.run(gameState, npc);
  if (next) {
    gameState.conversation.stateId = next;
    renderDialogue();
  } else {
    closeConversation();
  }
  renderStats();
}

function render() {
  resolutionManager.sync();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const camera = getCamera();

  for (let sy = 0; sy < VIEW_ROWS; sy += 1) {
    const worldY = camera.y + sy;
    for (let sx = 0; sx < VIEW_COLS; sx += 1) {
      const worldX = camera.x + sx;
      drawTile(sx, sy, world.tileAt(worldX, worldY));
    }
  }

  const project = (entity) => ({
    screenX: (entity.x - camera.x) * TILE_SIZE,
    screenY: (entity.y - camera.y) * TILE_SIZE,
  });

  for (const item of itemsOnGround) {
    if (!isInView(item, camera)) continue;
    const { screenX, screenY } = project(item);
    drawItemSprite(item, screenX, screenY);
  }
  for (const monster of gameState.monsters) {
    if (!monster.alive || !isInView(monster, camera)) continue;
    const { screenX, screenY } = project(monster);
    drawMonsterSprite(monster, screenX, screenY);
  }
  for (const npc of gameState.npcs) {
    if (!isInView(npc, camera)) continue;
    const { screenX, screenY } = project(npc);
    drawNPCSprite(npc, screenX, screenY);
  }
  const { screenX: playerX, screenY: playerY } = project(gameState.player);
  drawPlayerSprite(gameState.player, playerX, playerY);

  renderStats();
  renderInventory();
  renderSpellbook();
  renderScrolls();
  renderPotions();
  renderQuests();
  renderLog();
  renderDialogue();

  if (gameState.mapVisible) {
    renderWorldMap();
  }
}

function mapColorForTile(tile) {
  return MAP_TILE_COLORS[tile.symbol] ?? tile.color ?? '#0f172a';
}

function drawMapBase() {
  if (!mapCtx) return;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tileAt(x, y);
      mapCtx.fillStyle = mapColorForTile(tile);
      mapCtx.fillRect(x * MAP_SCALE, y * MAP_SCALE, MAP_SCALE, MAP_SCALE);
    }
  }
}

function drawMapMarker(x, y, color) {
  if (!mapCtx) return;
  const px = x * MAP_SCALE;
  const py = y * MAP_SCALE;
  mapCtx.fillStyle = color;
  mapCtx.fillRect(px, py, MAP_SCALE, MAP_SCALE);
  mapCtx.strokeStyle = 'rgba(2, 6, 23, 0.8)';
  mapCtx.lineWidth = 1;
  mapCtx.strokeRect(px + 0.5, py + 0.5, MAP_SCALE - 1, MAP_SCALE - 1);
}

function renderWorldMap() {
  if (!mapCtx) return;
  drawMapBase();

  const moongatePositions = new Set();
  for (const [key, destination] of moongateNetwork.entries()) {
    moongatePositions.add(key);
    moongatePositions.add(`${destination.x},${destination.y}`);
  }
  for (const position of moongatePositions) {
    const [x, y] = position.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      drawMapMarker(x, y, '#f472b6');
    }
  }

  for (const item of itemsOnGround) {
    drawMapMarker(item.x, item.y, '#34d399');
  }

  for (const monster of gameState.monsters) {
    if (!monster.alive) continue;
    drawMapMarker(monster.x, monster.y, '#fbbf24');
  }

  for (const npc of gameState.npcs) {
    drawMapMarker(npc.x, npc.y, '#38bdf8');
  }

  drawMapMarker(gameState.player.x, gameState.player.y, '#f8fafc');
  mapCtx.strokeStyle = '#f8fafc';
  mapCtx.lineWidth = 1;
  mapCtx.strokeRect(
    gameState.player.x * MAP_SCALE + 0.5,
    gameState.player.y * MAP_SCALE + 0.5,
    MAP_SCALE - 1,
    MAP_SCALE - 1,
  );
}

function toggleMapOverlay(force) {
  if (!mapOverlay) return;
  const nextState = typeof force === 'boolean' ? force : !gameState.mapVisible;
  gameState.mapVisible = nextState;
  if (gameState.mapVisible) {
    renderWorldMap();
    mapOverlay.classList.add('active');
    mapOverlay.setAttribute('aria-hidden', 'false');
  } else {
    mapOverlay.classList.remove('active');
    mapOverlay.setAttribute('aria-hidden', 'true');
  }
}

function getCamera() {
  const { player } = gameState;
  const halfCols = Math.floor(VIEW_COLS / 2);
  const halfRows = Math.floor(VIEW_ROWS / 2);
  let camX = player.x - halfCols;
  let camY = player.y - halfRows;
  camX = Math.max(0, Math.min(world.width - VIEW_COLS, camX));
  camY = Math.max(0, Math.min(world.height - VIEW_ROWS, camY));
  return { x: camX, y: camY };
}

function isInView(entity, camera) {
  return (
    entity.x >= camera.x - 1 &&
    entity.x <= camera.x + VIEW_COLS &&
    entity.y >= camera.y - 1 &&
    entity.y <= camera.y + VIEW_ROWS
  );
}

function drawTile(screenX, screenY, tile) {
  const px = screenX * TILE_SIZE;
  const py = screenY * TILE_SIZE;
  ctx.fillStyle = tile.color ?? '#0f172a';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  if (tile.sprite) {
    drawSprite(tile.sprite, px, py);
  }
}

function drawPlayerSprite(player, px, py) {
  if (player.sprite && drawSprite(player.sprite, px, py)) return;
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - TILE_SIZE / 3.2, TILE_SIZE / 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - TILE_SIZE / 6);
  ctx.lineTo(cx, cy + TILE_SIZE / 4);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - TILE_SIZE / 4, cy + TILE_SIZE / 12);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + TILE_SIZE / 4, cy + TILE_SIZE / 12);
  ctx.moveTo(cx, cy + TILE_SIZE / 4);
  ctx.lineTo(cx - TILE_SIZE / 6, cy + TILE_SIZE / 2.6);
  ctx.moveTo(cx, cy + TILE_SIZE / 4);
  ctx.lineTo(cx + TILE_SIZE / 6, cy + TILE_SIZE / 2.6);
  ctx.stroke();
}

function drawNPCSprite(npc, px, py) {
  if (npc.sprite && drawSprite(npc.sprite, px, py)) return;
  ctx.fillStyle = npc.color;
  ctx.beginPath();
  ctx.moveTo(px + TILE_SIZE / 2, py + 6);
  ctx.lineTo(px + TILE_SIZE - 6, py + TILE_SIZE - 6);
  ctx.lineTo(px + 6, py + TILE_SIZE - 6);
  ctx.closePath();
  ctx.fill();
}

function drawMonsterSprite(monster, px, py) {
  if (monster.sprite && drawSprite(monster.sprite, px, py)) return;
  ctx.fillStyle = monster.color;
  ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
  ctx.fillStyle = '#020617';
  ctx.fillRect(px + 10, py + 10, 4, 4);
  ctx.fillRect(px + TILE_SIZE - 14, py + 10, 4, 4);
}

function drawItemSprite(item, px, py) {
  if (item.sprite && drawSprite(item.sprite, px, py)) return;
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function renderStats() {
  const list = document.getElementById('stats');
  const { player } = gameState;
  list.innerHTML = `
    <li>Level: ${player.level}</li>
    <li>Experience: ${player.experience}</li>
    <li>HP: ${player.hp} / ${player.maxHp}</li>
    <li>STR: ${player.strength}</li>
    <li>DEX: ${player.dexterity}</li>
    <li>INT: ${player.intelligence}</li>
    <li>CON: ${player.constitution}</li>
    <li>Attack: ${player.attack}</li>
    <li>Gold: ${player.gold}</li>
    <li>Position: (${player.x}, ${player.y})</li>
  `;
}

function renderInventory() {
  const list = document.getElementById('inventory');
  if (!gameState.player.inventory.length) {
    list.innerHTML = '<li><em>Empty</em></li>';
    return;
  }
  list.innerHTML = gameState.player.inventory
    .map((item) => `<li>${item.name}</li>`)
    .join('');
}

function renderSpellbook() {
  const list = document.getElementById('spells');
  const spells = gameState.player.spells || [];
  if (!spells.length) {
    list.innerHTML = '<li><em>No spells prepared</em></li>';
    return;
  }
  list.innerHTML = spells.map((spell) => `<li>${spell}</li>`).join('');
}

function renderScrolls() {
  const list = document.getElementById('scrolls');
  const scrolls = gameState.player.scrolls || [];
  if (!scrolls.length) {
    list.innerHTML = '<li><em>No scrolls</em></li>';
    return;
  }
  list.innerHTML = scrolls.map((scroll) => `<li>${scroll}</li>`).join('');
}

function renderPotions() {
  const list = document.getElementById('potions');
  const potions = gameState.player.potions || [];
  if (!potions.length) {
    list.innerHTML = '<li><em>No potions</em></li>';
    return;
  }
  list.innerHTML = potions.map((potion) => `<li>${potion}</li>`).join('');
}

function renderQuests() {
  const list = document.getElementById('quests');
  const entries = [];
  for (const [questId, status] of Object.entries(gameState.player.quests)) {
    const definition = questDefinitions[questId];
    const label = definition ? definition.title : questId;
    if (status.status === 'not started') continue;
    let suffix = '';
    if (questId === 'herbGarden' && status.status === 'in progress') {
      suffix = ` (${status.collected ?? 0}/3 herbs)`;
    }
    entries.push(`<li>${label}: <strong>${status.status}</strong>${suffix}</li>`);
  }
  if (!entries.length) {
    list.innerHTML = '<li><em>No active quests</em></li>';
  } else {
    list.innerHTML = entries.join('');
  }
}

function renderLog() {
  const list = document.getElementById('log');
  list.innerHTML = messageLog.slice(-8).map((entry) => `<li>${entry.text}</li>`).reverse().join('');
}

function renderDialogue() {
  const container = document.getElementById('dialogue');
  const convo = gameState.conversation;
  if (!convo) {
    container.classList.remove('active');
    container.innerHTML = '';
    return;
  }
  const npc = gameState.npcs.find((character) => character.id === convo.npcId);
  if (!npc) {
    closeConversation();
    return;
  }
  const state = npc.dialogue.states[convo.stateId];
  if (!state) {
    closeConversation();
    return;
  }
  container.classList.add('active');
  const biography = npc.biography ? `<p><em>${npc.biography}</em></p>` : '';
  const options = state.options
    .map((option, idx) => `<li><span class="key">${idx + 1}</span>${option.label}</li>`)
    .join('');
  container.innerHTML = `
    <h3>${npc.name}</h3>
    ${biography}
    <p>${state.text}</p>
    <ul>${options}</ul>
  `;
}

function waitTurn() {
  tickWorld();
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === 'm') {
    toggleMapOverlay();
    event.preventDefault();
    return;
  }

  if (gameState.mapVisible) {
    if (key === 'escape') {
      toggleMapOverlay(false);
    }
    event.preventDefault();
    return;
  }

  const convo = gameState.conversation;
  if (convo) {
    if (key === 'escape') {
      closeConversation();
      return;
    }
    const optionIndex = parseInt(key, 10) - 1;
    if (!Number.isNaN(optionIndex)) {
      resolveConversationOption(optionIndex);
    }
    return;
  }
  switch (key) {
    case 'arrowup':
    case 'w':
      movePlayer(0, -1);
      break;
    case 'arrowdown':
    case 's':
      movePlayer(0, 1);
      break;
    case 'arrowleft':
    case 'a':
      movePlayer(-1, 0);
      break;
    case 'arrowright':
    case 'd':
      movePlayer(1, 0);
      break;
    case 't':
    case 'enter':
      talkToNPC();
      break;
    case ' ':
    case 'spacebar':
      waitTurn();
      break;
    case 'escape':
      toggleMapOverlay(false);
      break;
    default:
      break;
  }
}

window.addEventListener('keydown', onKeyDown);
window.addEventListener('resize', scheduleViewportResize);
scheduleViewportResize();

if (mapOverlay) {
  mapOverlay.addEventListener('click', (event) => {
    if (event.target === mapOverlay) {
      toggleMapOverlay(false);
    }
  });
}

function seedWorld() {
  resizeViewport();
  spawnMonsters();
  spawnNPCs();
  placeItem('moonHerb', 73, 16);
  placeItem('moonHerb', 75, 19);
  placeItem('moonHerb', 24, 35);
  placeItem('moonHerb', 21, 42);
  placeItem('moonHerb', 18, 43);
  addMessage('You arrive on the vastly expanded Moon Isle as the tides recede.');
  addMessage('Speak with Captain Mirna in the castle, then seek the harbor moongate to reach distant shores.');
  render();
}

// Load the modern tileset atlas before seeding the world so map and entity
// sprites render from the shared sprite sheet.
async function initializeGame() {
  try {
    const [metadata, image] = await Promise.all([
      fetch(TILESET_DATA_URL).then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load tileset metadata: ${response.status}`);
        }
        return response.json();
      }),
      loadImage(TILESET_IMAGE_URL),
    ]);
    spriteSheet = image;
    buildSpriteAtlas(metadata);
  } catch (error) {
    console.error(error);
  } finally {
    seedWorld();
  }
}

initializeGame();
