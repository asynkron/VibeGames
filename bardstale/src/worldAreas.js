import { DIR, DX, DY, WALL, backOf, inBounds } from './dungeon.js';
import { COMBAT_CELLS_PER_MAP_TILE } from '../config/combatSettings.js';
import { getCityService } from './cityServices.js';

// Authored voxel interpretations of the 1988 locations and campaign progression.
// Room layouts, facades, and furnishings are made for this game's 3D scale.
// SSI source: https://dosdays.co.uk/media/games/pool/PoolOfRadiance-ClueBook.pdf
const definitions = [
  {
    id: 'new-phlan', name: 'New Phlan', environment: 'village',
    description: 'The reclaimed city beside the Moonsea. Visit the council, equip and train your party, then take the western gate into the Slums or a boat to haunted Sokal Keep.',
    layout: [
      '##################', '#...............##', '#...............##', '#................#',
      '#...............##', '#...............##', '#...............##', '#...............##',
      '#...............##', '#...............##', '#...............##', '#................#',
      '#...............##', '#...............##', '#...............##', '##################',
    ],
    start: { x: 14, y: 3, dir: DIR.W }, templeSpawn: { x: 8, y: 5, dir: DIR.W }, encounters: null,
    exits: [
      { target: 'slums', x: 1, y: 7, dir: DIR.E },
      { target: 'sokal-keep', x: 14, y: 3, dir: DIR.W },
      { target: 'moonsea-wilderness', x: 14, y: 11, dir: DIR.W, requiredQuest: 'sokal-keep' },
    ],
    services: [
      ['temple-sune', 2, 2], ['cleric-trainer', 6, 2], ['magic-user-trainer', 8, 2],
      ['fighter-trainer', 10, 2], ['thief-trainer', 12, 2], ['temple-tyr', 8, 5],
      ['dueling-hall', 6, 5], ['council', 4, 6], ['arms-armor', 10, 8], ['general-store', 12, 8],
      ['silver-shop', 10, 11], ['jeweler', 12, 11], ['inn', 6, 11], ['tavern', 8, 11], ['temple-tempus', 2, 12],
    ],
    houses: [
      [2, 2, 'plaster', 2, DIR.E], [6, 2, 'stone', 2, DIR.S], [8, 2, 'brick', 3, DIR.S],
      [10, 2, 'stone', 2, DIR.S], [12, 2, 'timber', 2, DIR.S], [8, 5, 'stone', 3, DIR.W],
      [4, 6, 'plaster', 3, DIR.E], [10, 8, 'stone', 2, DIR.W], [12, 8, 'timber', 1, DIR.W],
      [10, 11, 'plaster', 2, DIR.N], [12, 11, 'brick', 2, DIR.N], [6, 11, 'timber', 2, DIR.N],
      [8, 11, 'timber', 2, DIR.N], [2, 12, 'stone', 2, DIR.E],
      [2, 5, 'brick', 1, DIR.E], [2, 9, 'plaster', 2, DIR.E], [4, 13, 'timber', 1, DIR.N],
    ],
    water: Array.from({ length: 14 }, (_, index) => [16, index + 1]).filter(([, y]) => y !== 3 && y !== 11),
    docks: [[14, 3], [15, 3], [16, 3], [14, 11], [15, 11], [16, 11]],
    props: [
      ['urn', 2, 2], ['bookshelf', 6, 2], ['bookshelf', 8, 2], ['chest', 10, 2], ['crate', 12, 2],
      ['statue', 8, 5], ['brazier', 6, 5], ['table', 4, 6], ['brazier', 10, 8], ['crate', 12, 8],
      ['table', 10, 11], ['chest', 12, 11], ['chair', 6, 11], ['table', 8, 11], ['statue', 2, 12],
      ['lamp', 4, 3], ['lamp', 7, 4], ['lamp', 10, 5], ['bench', 4, 8], ['lamp', 7, 8],
      ['pottedPlant', 6, 8], ['oakTree', 4, 10], ['pottedPlant', 11, 6], ['barrel', 15, 2],
      ['crate', 15, 4], ['barrel', 15, 10], ['crate', 15, 12], ['lamp', 13, 9], ['bench', 7, 13],
    ],
    torches: [[8, 5, DIR.N], [4, 6, DIR.N], [10, 8, DIR.N], [12, 2, DIR.E]],
  },
  {
    id: 'slums', name: 'Slums', environment: 'village',
    description: 'The ruined blocks immediately west of New Phlan. Goblins, kobolds, orcs, and hobgoblins shelter in abandoned homes. The northern passage leads to Kuto’s Well.',
    layout: [
      '################', '#...##.........#', '#...##.........#', '#..............#',
      '#........##....#', '#...##...##....#', '#...##.........#', '#..............#',
      '#......##......#', '#......##......#', '#..............#', '#....##....##..#',
      '#....##....##..#', '#..............#', '#..............#', '################',
    ],
    start: { x: 14, y: 7, dir: DIR.W }, templeSpawn: null,
    encounters: { tier: 1, maxEnemies: 4, monsterArea: 'Slums' }, services: [],
    exits: [{ target: 'new-phlan', x: 14, y: 7, dir: DIR.W }, { target: 'kutos-well', x: 8, y: 1, dir: DIR.S }],
    houses: [[2, 2, 'brick', 1, DIR.S], [7, 3, 'timber', 1, DIR.S], [12, 5, 'plaster', 1, DIR.W]],
    doors: [[3, 3, DIR.E], [6, 6, DIR.S], [10, 7, DIR.S]],
    props: [
      ['barrel', 2, 2], ['table', 7, 3], ['chest', 12, 5], ['crate', 2, 5],
      ['barrel', 6, 1], ['urn', 11, 2], ['crate', 13, 3], ['boulder', 7, 5],
      ['barrel', 3, 6], ['crate', 6, 8], ['urn', 2, 9], ['boulder', 10, 9],
      ['table', 3, 11], ['chest', 9, 12], ['barrel', 13, 13], ['crate', 6, 14],
      ['lamp', 13, 6], ['brazier', 3, 13], ['boulder', 10, 13],
    ],
    torches: [[2, 2, DIR.N], [7, 3, DIR.N], [12, 5, DIR.N], [1, 14, DIR.S]],
  },
  {
    id: 'sokal-keep', name: 'Sokal Keep', environment: 'dungeon',
    description: 'A haunted fortress on Thorn Island guards Phlan’s harbor. Search the armory and chapel, free its restless defenders, and restore the sea lanes.',
    layout: [
      '################', '###..........###', '###..........###', '#..............#',
      '#...##....##...#', '#...##....##...#', '#..............#', '#..............#',
      '#..............#', '#..............#', '#..............#', '#..............#',
      '###..........###', '###..........###', '#..............#', '################',
    ],
    start: { x: 8, y: 14, dir: DIR.N }, templeSpawn: null,
    encounters: { tier: 1, maxEnemies: 4, monsterArea: 'Sokal Keep' }, services: [], houses: [],
    exits: [{ target: 'new-phlan', x: 8, y: 14, dir: DIR.N }],
    edges: [[6, 7, DIR.N, 4], [6, 10, DIR.S, 4], [6, 7, DIR.W, 4], [9, 7, DIR.E, 4],
      [3, 3, DIR.N, 3], [3, 3, DIR.W, 3], [12, 3, DIR.N, 3], [12, 3, DIR.W, 3]],
    doors: [[7, 10, DIR.S], [8, 10, DIR.S], [3, 5, DIR.W], [12, 5, DIR.W]],
    props: [
      ['statue', 7, 8], ['brazier', 8, 9], ['urn', 6, 9], ['chest', 4, 3],
      ['bookshelf', 13, 3], ['crate', 13, 5], ['boulder', 2, 7], ['urn', 3, 9],
      ['barrel', 11, 6], ['boulder', 12, 8], ['chest', 10, 12], ['urn', 5, 13],
      ['lamp', 9, 13], ['boulder', 11, 10], ['mushrooms', 4, 11],
    ],
    torches: [[6, 8, DIR.W], [9, 8, DIR.E], [3, 4, DIR.W], [12, 4, DIR.W], [8, 1, DIR.N]],
  },
  {
    id: 'kutos-well', name: 'Kuto’s Well', environment: 'cave',
    description: 'The well supplies the ruined city with fresh water. Damp catacombs beneath it shelter kobolds, lizards, and Norris the Gray’s bandits.',
    layout: [
      '################', '###.....##.....#', '###.....##.....#', '#..............#',
      '#.....##.......#', '#.....##.......#', '#...........##.#', '#...........##.#',
      '#...##.........#', '#...##.........#', '#..............#', '###.....##.....#',
      '###.....##.....#', '#..............#', '#..............#', '################',
    ],
    start: { x: 8, y: 14, dir: DIR.N }, templeSpawn: null,
    encounters: { tier: 2, maxEnemies: 4, monsterArea: "Kuto's Well" }, services: [], houses: [],
    exits: [{ target: 'slums', x: 8, y: 14, dir: DIR.N },
      { target: 'moonsea-wilderness', x: 7, y: 1, dir: DIR.S, requiredQuest: 'sokal-keep' }],
    props: [
      ['boulder', 4, 1], ['barrel', 11, 1], ['urn', 7, 3], ['boulder', 2, 4],
      ['mushrooms', 10, 4], ['crate', 4, 5], ['boulder', 9, 6], ['barrel', 2, 7],
      ['mushrooms', 7, 8], ['chest', 11, 9], ['boulder', 3, 10], ['urn', 13, 10],
      ['crate', 5, 12], ['barrel', 11, 12], ['mushrooms', 4, 14], ['lamp', 10, 14],
    ],
    torches: [[3, 1, DIR.W], [1, 5, DIR.W], [7, 11, DIR.E], [14, 13, DIR.E]],
  },
  {
    id: 'moonsea-wilderness', name: 'Moonsea Wilderness', environment: 'forest',
    description: 'The shores and wooded trails beyond Phlan. Merchants, nomads, and monster patrols travel these roads; the boat landing and well road both lead back toward the city.',
    layout: [
      '##################', '###.....##.......#', '###.....##.......#', '#................#',
      '#................#', '#.....##.........#', '#.....##.........#', '#................#',
      '#................#', '###.......##.....#', '###.......##.....#', '#................#',
      '#................#', '#.....##.........#', '#.....##.........#', '##################',
    ],
    start: { x: 2, y: 7, dir: DIR.E }, templeSpawn: null,
    encounters: { tier: 2, maxEnemies: 4, monsterArea: 'World Map' }, services: [], houses: [],
    exits: [{ target: 'new-phlan', x: 2, y: 7, dir: DIR.E }, { target: 'kutos-well', x: 8, y: 12, dir: DIR.N }],
    props: [
      ['oakTree', 4, 1], ['pineTree', 6, 1], ['fern', 12, 1], ['oakTree', 15, 2],
      ['oakTree', 1, 3], ['boulder', 5, 3], ['pineTree', 10, 3], ['mushrooms', 13, 4],
      ['pineTree', 3, 5], ['fern', 9, 5], ['oakTree', 15, 5], ['boulder', 5, 7],
      ['fern', 10, 7], ['oakTree', 13, 7], ['pineTree', 3, 8], ['mushrooms', 8, 8],
      ['oakTree', 5, 10], ['boulder', 14, 10], ['fern', 3, 11], ['pineTree', 12, 11],
      ['oakTree', 16, 12], ['barrel', 4, 13], ['fern', 9, 13], ['oakTree', 13, 14],
      ['bench', 4, 7], ['crate', 2, 6], ['boulder', 7, 11],
    ],
    torches: [],
  },
];

export function getWorldAreaDefinition(id) {
  const definition = definitions.find(area => area.id === id);
  if (!definition) throw new Error(`Unknown world area: ${id}`);
  return definition;
}

function setEdge(cells, x, y, direction, type) {
  const sides = ['n', 'e', 's', 'w'];
  cells[y][x][sides[direction]] = type;
  const nx = x + DX[direction], ny = y + DY[direction];
  if (inBounds(nx, ny, cells[0].length, cells.length)) cells[ny][nx][sides[backOf(direction)]] = type;
}

export function createWorldArea(id) {
  const definition = getWorldAreaDefinition(id);
  const { name, description, environment, layout } = definition;
  const width = layout[0].length, height = layout.length;
  const cells = layout.map(row => Array.from(row, () => ({
    n: WALL.WALL, e: WALL.WALL, s: WALL.WALL, w: WALL.WALL, visited: id === 'new-phlan', building: null,
  })));
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    if (layout[y][x] !== '.') continue;
    if (layout[y][x + 1] === '.') setEdge(cells, x, y, DIR.E, WALL.OPEN);
    if (layout[y + 1][x] === '.') setEdge(cells, x, y, DIR.S, WALL.OPEN);
  }
  for (const [x, y, style, stories, door] of definition.houses) {
    cells[y][x].building = { id: `house:${id}:${x}:${y}`, style, stories };
    for (const direction of [DIR.N, DIR.E, DIR.S, DIR.W]) {
      setEdge(cells, x, y, direction, direction === door ? WALL.DOOR : WALL.WALL);
    }
  }
  for (const [x, y, direction, length] of definition.edges ?? []) {
    for (let offset = 0; offset < length; offset++) {
      setEdge(cells, x + (direction % 2 === 0 ? offset : 0), y + (direction % 2 === 1 ? offset : 0), direction, WALL.WALL);
    }
  }
  for (const [x, y, direction] of definition.doors ?? []) setEdge(cells, x, y, direction, WALL.DOOR);
  for (const [x, y] of definition.water ?? []) cells[y][x].terrain = 'water';
  for (const [x, y] of definition.docks ?? []) cells[y][x].terrain = 'dock';
  const exits = definition.exits.map(({ target, ...entry }) => ({
    id: `exit:${id}:${target}`, target, ...entry, name: getWorldAreaDefinition(target).name,
  }));
  // Furnish corners, preserving the center walking cross and wider bodies.
  const objects = definition.props.map(([kind, x, y]) => ({
    id: `object:${id}:${x}:${y}:floor`, kind,
    x: x * COMBAT_CELLS_PER_MAP_TILE, y: y * COMBAT_CELLS_PER_MAP_TILE, rotation: 0,
  }));
  for (const [x, y, wall] of definition.torches) objects.push({
    id: `object:${id}:${x}:${y}:wall`, kind: 'wallTorch', wall,
    x: x * COMBAT_CELLS_PER_MAP_TILE + 1 + DX[wall],
    y: y * COMBAT_CELLS_PER_MAP_TILE + 1 + DY[wall], rotation: (4 - wall) % 4,
  });
  const start = { ...definition.start };
  return {
    id, name, description, environment, width, height, seed: `pool-of-radiance:${id}`, cells, start, ...start,
    objects, exits, services: definition.services.map(([serviceId, x, y]) => ({ ...getCityService(serviceId), x, y })),
    encounters: definition.encounters ? { ...definition.encounters } : null,
    magic: {},
    templeSpawn: definition.templeSpawn ? { ...definition.templeSpawn } : null,
  };
}
