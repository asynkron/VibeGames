import { parseTextMap } from '../../../shared/map/textMap.js';

export const TILE_TYPES = {
  empty: 0,
  solid: 1,
  platform: 2,
  ladder: 3,
  water: 4,
  goal: 5,
};

const SYMBOLS = {
  '#': { tile: TILE_TYPES.solid },
  '=': { tile: TILE_TYPES.solid },
  '-': { tile: TILE_TYPES.platform },
  'H': { tile: TILE_TYPES.ladder },
  '~': { tile: TILE_TYPES.water },
  'G': { tile: TILE_TYPES.goal, spawn: { type: 'goal' } },
  'P': { tile: TILE_TYPES.empty, spawn: { type: 'player' } },
  'E': { tile: TILE_TYPES.empty, spawn: { type: 'enemy' } },
  'C': { tile: TILE_TYPES.empty, spawn: { type: 'collectible' } },
  '.': { tile: TILE_TYPES.empty },
};

const DEFAULT_SYMBOL = SYMBOLS['.'];

function createLevel(name, rows) {
  const text = rows.join('\n');
  const spawns = {
    player: null,
    goal: null,
    enemies: [],
    collectibles: [],
  };

  const grid = parseTextMap(text, rows[0]?.length ?? 0, rows.length, {
    arrayType: Uint8Array,
    padChar: '.',
    mapTile: (ch, x, y) => {
      const entry = SYMBOLS[ch] ?? DEFAULT_SYMBOL;
      if (entry.spawn) {
        const point = { x, y, type: entry.spawn.type };
        if (entry.spawn.dir) point.dir = entry.spawn.dir;
        switch (entry.spawn.type) {
          case 'player':
            spawns.player = point;
            break;
          case 'goal':
            spawns.goal = point;
            break;
          case 'enemy':
            spawns.enemies.push(point);
            break;
          case 'collectible':
            spawns.collectibles.push(point);
            break;
          default:
            break;
        }
      }
      return entry.tile;
    },
  });

  return {
    name,
    rows,
    text,
    width: grid.width,
    height: grid.height,
    tiles: grid.data,
    chars: grid.chars,
    spawns,
  };
}

const LEVEL_1 = createLevel('Harbour Rescue', [
  '####################',
  '#..............G...#',
  '#....H.............#',
  '#....H....####.....#',
  '#....H.............#',
  '#....H....==.......#',
  '#....H....==..E....#',
  '#........C.........#',
  '#----P-------H.....#',
  '#...........#H#....#',
  '#..####......H...###',
  '#..####....C.H.....#',
  '#..........E.H.....#',
  '#~~~~~~~~~~~~~~~~~~#',
  '####################',
]);

const LEVEL_2 = createLevel('Volcano Balloon Run', [
  '####################',
  '#...G..............#',
  '#.............H....#',
  '#..###........H....#',
  '#..#..#.......H....#',
  '#..#..#.......H....#',
  '#..#..#....E..H....#',
  '#..#..#.......H.C..#',
  '#..#..#######.H....#',
  '#..#..........H###.#',
  '#..#....C....-H--..#',
  '#..#.E........H....#',
  '#..#..........H....#',
  '#~~~~~~~~~~~~~~~~~~#',
  '####################',
]);

export const LEVELS = [LEVEL_1, LEVEL_2];
