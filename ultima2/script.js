const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 16;
const COLUMNS = Math.floor(canvas.width / TILE_SIZE);
const ROWS = Math.floor(canvas.height / TILE_SIZE);

ctx.imageSmoothingEnabled = false;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = '14px "IBM Plex Mono", "Courier New", monospace';

// Palette tuned for monochrome tiles reminiscent of the Apple II palette.
const TILES = {
  '.': { name: 'Grassland', color: '#14532d', passable: true },
  '~': { name: 'Ocean', color: '#1d4ed8', passable: false },
  'F': { name: 'Forest', color: '#166534', passable: true, movementCost: 2 },
  '^': { name: 'Mountain', color: '#475569', passable: false },
  'C': { name: 'Castle', color: '#78350f', passable: true },
  'R': { name: 'Ruins', color: '#64748b', passable: true },
  'S': { name: 'Sanctum', color: '#0ea5e9', passable: true },
  'D': { name: 'Desert', color: '#92400e', passable: true },
  '#': { name: 'Wall', color: '#1f2937', passable: false },
  ' ': { name: 'Void', color: '#020617', passable: false },
};

const mapText = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~^^^^^^~~~~~~~~~~^^^^^^~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~^^^^^^~~~~~~~~~~^^^^^^~~~~~~~~~~~~~~
~~~~~~~^^^^^~~~~~~~~~~~~~~~FFF^^^^^^~~~~~~^^^^^~~~~
~~~~~~~^^^^^~~~~~~~~~~~~~~FFFF^^^^~~~~~~~^^^^^~~~~~
~~~~~~~^^^^^~~~~~CCCC~~~~~FFFF~~~~~~RRR~~~~~~~~~~~~
~~~~~~~^^^^^~~~~~C..C~~~~~~~~~~~~~~~RRR~~~~~~~~~~~~
~~~~~~~^^^^^~~~~~C..C~~~~~~~~~~~~~~~RRR~~~~^^^^~~~~
~~~~~~~^^^^^~~~~~CCCC~~~~~~~FFFF~~~~~~~~~~~^^^^~~~~
~~~~~~~^^^^^~~~~~~~~~~~~FFFFF~~~~~~~~~~~~~~^^^^~~~~
~~~~~~~^^^^^~~~~~~~~~~~~FFF~~~~~~~~~~~~~~~D..D~~~~~
~~~~~~~^^^^^~~~~~~~~~~~~FF~~~~~~~~~~~~~DDD....D~~~~
~~~~~~~~~~~~~~~^^^^^~~~~~~~~~~FFFF~~~~~DDD....D~~~~
~~~~~~~~~~~~~~~^^^^^~~~~~~~~~~FFFF~~~~~DDD....D~~~~
~~~~~~~~~~~~~~~^^^^^~~~~~~~~~~FFFF~~~~~~~~....~~~~~
~~~~~~~~~~~~~~~^^^^^~~~~~~~~~~FFFF~~~~~~~S.........
~~~~~~~~~~~~~~~^^^^^~~~~~~~~~~~~~~~~~~~~~S.........
~~~~~~~~~~~~~~~^^^^^~~~~~~~~~~~~~~~~~~~~~S.........
~~~~~~~CCCC~~~~~~~~~^^^^^~~~~~~~FFFF~~~~~S.........
~~~~~~~C..C~~~~~~~~~^^^^^~~~~~~~FFFF~~~~~S.........
~~~~~~~C..C~~~~~~~~~^^^^^~~~~~~~FFFF~~~~~S.........
~~~~~~~CCCC~~~~~~~~~^^^^^~~~~~~~FFFF~~~~~S.........
~~~~~~~~~~~~~~~^^^^^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~FFFF~~~~~~~~~~~~~~~CCCC~~~~~FFFF~~~~~~~~~~~~
~~~~~~~FFFF~~~~~~~~~~~~~~~C..C~~~~~FFFF~~~~~~~~~~~~
~~~~~~~FFFF~~~~~~~~~~~~~~~C..C~~~~~FFFF~~~~~~~~~~~~
~~~~~~~~~~~~~~~^^^^^~~~~~~CCCC~~~~~FFFF~~~~~^^^^~~~
~~~~~~~~~~~~~~~^^^^^~~~~~~~~~~~~~~~~~~~~~~~~^^^^~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^~~~~~~~~~~~~~~`;

const world = createWorld(mapText, COLUMNS, ROWS);

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
    x: 20,
    y: 14,
    hp: 18,
    maxHp: 18,
    attack: 5,
    gold: 25,
    inventory: [],
    quests: {
      lostChart: { status: 'not started' },
      herbGarden: { status: 'not started', collected: 0 },
    },
    spawn: { x: 20, y: 14 },
  },
  monsters: [],
  npcs: [],
  conversation: null,
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

function createWorld(text, width, height) {
  const rows = text.split('\n').slice(0, height);
  const data = [];
  for (let y = 0; y < height; y += 1) {
    const line = rows[y] ?? ''.padEnd(width, '~');
    for (let x = 0; x < width; x += 1) {
      const ch = line[x] ?? '~';
      const tile = TILES[ch] ?? TILES['~'];
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
      if (x < 0 || y < 0 || x >= width || y >= height) return { passable: false, color: '#000' };
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

function spawnMonsters() {
  const monsterTemplates = [
    {
      id: 'moonPirate',
      name: 'Moon Pirate',
      glyph: 'P',
      color: '#fbbf24',
      hp: 9,
      attack: 3,
      biography: 'Sky-scouring corsairs who pillage astral charts to sell to off-worlders.',
      loot: ['starChart', 'rustyCutlass'],
      x: 31,
      y: 11,
    },
    {
      id: 'shadowStalker',
      name: 'Shadow Stalker',
      glyph: 'S',
      color: '#c084fc',
      hp: 7,
      attack: 2,
      biography: 'A remnant of Mondain\'s armies, now haunting the sanctum at twilight.',
      loot: ['moonHerb'],
      x: 37,
      y: 16,
    },
    {
      id: 'lunarWisp',
      name: 'Lunar Wisp',
      glyph: 'W',
      color: '#a5b4fc',
      hp: 5,
      attack: 1,
      biography: 'Luminescent spirits drawn to the ruins in search of forgotten vows.',
      loot: ['moonHerb'],
      x: 30,
      y: 12,
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
      x: 18,
      y: 7,
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
      x: 37,
      y: 18,
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
  pickupItemsAt(nx, ny);
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      drawTile(x, y, world.tileAt(x, y));
    }
  }
  for (const item of itemsOnGround) {
    drawGlyph(item.glyph, item.color, item.x, item.y);
  }
  for (const monster of gameState.monsters) {
    if (!monster.alive) continue;
    drawGlyph(monster.glyph, monster.color, monster.x, monster.y);
  }
  for (const npc of gameState.npcs) {
    drawGlyph(npc.glyph, npc.color, npc.x, npc.y);
  }
  drawGlyph(gameState.player.glyph, gameState.player.color, gameState.player.x, gameState.player.y);
  renderStats();
  renderInventory();
  renderQuests();
  renderLog();
  renderDialogue();
}

function drawTile(x, y, tile) {
  ctx.fillStyle = tile.color;
  ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE - 2, TILE_SIZE, 2);
}

function drawGlyph(glyph, color, x, y) {
  ctx.fillStyle = color;
  ctx.fillText(glyph, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2 + 1);
}

function renderStats() {
  const list = document.getElementById('stats');
  const { player } = gameState;
  list.innerHTML = `
    <li>HP: ${player.hp} / ${player.maxHp}</li>
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
    default:
      break;
  }
}

window.addEventListener('keydown', onKeyDown);

function seedWorld() {
  spawnMonsters();
  spawnNPCs();
  placeItem('moonHerb', 27, 12);
  placeItem('moonHerb', 28, 12);
  placeItem('moonHerb', 29, 12);
  placeItem('moonHerb', 31, 13);
  placeItem('moonHerb', 33, 13);
  addMessage('You arrive on Moon Isle as the tides recede.');
  addMessage('Find Captain Mirna in the castle and speak with her.');
  render();
}

seedWorld();
