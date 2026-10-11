import { buildDungeon, DIR, DX, DY, WALL, getWall } from './dungeon.js';
import { getEnvironment } from './environments.js';
import { COMBAT_CELLS_PER_MAP_TILE } from '../config/combatSettings.js';

function nearbyPassages(area) {
  const pending = [{ ...area.start, distance: 0 }];
  const visited = new Set([`${area.start.x},${area.start.y}`]);
  for (let index = 0; index < pending.length; index++) {
    const current = pending[index];
    if (current.distance === 5) continue;
    for (const direction of [DIR.N, DIR.E, DIR.S, DIR.W]) {
      if (getWall(area.cells, area.width, area.height, current.x, current.y, direction) === WALL.WALL) continue;
      const x = current.x + DX[direction];
      const y = current.y + DY[direction];
      const key = `${x},${y}`;
      if (x < 1 || y < 1 || x >= area.width - 1 || y >= area.height - 1 || visited.has(key)) continue;
      visited.add(key);
      pending.push({ x, y, distance: current.distance + 1, dir: (direction + 2) % 4 });
    }
  }
  return pending.filter(cell => cell.distance >= 2 && !area.cells[cell.y][cell.x].building);
}

function placeExits(area) {
  const candidates = nearbyPassages(area);
  if (candidates.length < 2) throw new Error(`Insufficient accessible exits in ${area.environment}`);
  const selected = [candidates[0]];
  selected.push(candidates.slice(1).sort((a, b) =>
    (Math.abs(b.x - selected[0].x) + Math.abs(b.y - selected[0].y))
      - (Math.abs(a.x - selected[0].x) + Math.abs(a.y - selected[0].y)))[0]);
  area.exits = getEnvironment(area.environment).connections.map((target, index) => ({
    id: `exit:${area.environment}:${target}`, target,
    x: selected[index].x, y: selected[index].y, dir: selected[index].dir,
  }));
  const exitTiles = new Set(area.exits.map(exit => `${exit.x},${exit.y}`));
  area.objects = area.objects.filter(object => !exitTiles.has(
    `${Math.floor(object.x / COMBAT_CELLS_PER_MAP_TILE)},${Math.floor(object.y / COMBAT_CELLS_PER_MAP_TILE)}`));
}

// Areas retain their cells, discoveries, furniture, and party location for the
// lifetime of a journey. The game keeps the same party when it changes areas.
export function createWorldJourney(opts = {}) {
  const initialId = getEnvironment(opts.environment ?? 'dungeon').id;
  const areas = new Map();
  const areaFor = id => {
    getEnvironment(id);
    if (!areas.has(id)) {
      const seed = opts.seed || 'bt3';
      const area = buildDungeon({ ...opts, environment: id, seed: id === 'dungeon' ? seed : `${seed}:${id}` });
      Object.assign(area, area.start);
      placeExits(area);
      areas.set(id, area);
    }
    return areas.get(id);
  };
  const connectionFor = (fromId, toId) => {
    getEnvironment(toId);
    if (!getEnvironment(fromId).connections.includes(toId)) {
      throw new Error(`No route from ${fromId} to ${toId}`);
    }
    return areaFor(fromId).exits.find(exit => exit.target === toId);
  };
  const arrivalFor = (fromId, toId) => {
    connectionFor(fromId, toId);
    const { x, y, dir } = connectionFor(toId, fromId);
    return { x, y, dir };
  };
  return { initialArea: areaFor(initialId), areaFor, connectionFor, arrivalFor };
}
