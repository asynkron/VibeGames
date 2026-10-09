import { DIR, DX, DY, WALL, getWall, leftOf, rightOf, backOf } from '../dungeon.js';
import { COMBAT_CELLS_PER_MAP_TILE } from '../../config/combatSettings.js';

export function createBattlefield(dungeon, heroes, monsters) {
  const { width: mapWidth, height: mapHeight, cells, x: mapX, y: mapY, dir } = dungeon;
  const width = mapWidth * COMBAT_CELLS_PER_MAP_TILE;
  const height = mapHeight * COMBAT_CELLS_PER_MAP_TILE;
  const center = Math.floor(COMBAT_CELLS_PER_MAP_TILE / 2);
  const origin = Object.freeze({
    x: mapX * COMBAT_CELLS_PER_MAP_TILE + center,
    y: mapY * COMBAT_CELLS_PER_MAP_TILE + center,
  });
  const directions = [dir, leftOf(dir), rightOf(dir), backOf(dir)];
  const cellKey = (cx, cy) => cy * width + cx;

  function inBounds(cx, cy) {
    return Number.isInteger(cx) && Number.isInteger(cy) && cx >= 0 && cy >= 0 && cx < width && cy < height;
  }

  if (!Number.isInteger(mapX) || !Number.isInteger(mapY) || mapX < 0 || mapY < 0 || mapX >= mapWidth || mapY >= mapHeight || !Number.isInteger(dir) || dir < DIR.N || dir > DIR.W) {
    throw new RangeError('A battlefield must begin at a valid dungeon cell and heading.');
  }

  function openEdge(fromX, fromY, toX, toY) {
    if (!inBounds(fromX, fromY) || !inBounds(toX, toY)) return false;
    const edge = directions.find((direction) => fromX + DX[direction] === toX && fromY + DY[direction] === toY);
    if (edge === undefined) return false;
    const fromMapX = Math.floor(fromX / COMBAT_CELLS_PER_MAP_TILE);
    const fromMapY = Math.floor(fromY / COMBAT_CELLS_PER_MAP_TILE);
    const toMapX = Math.floor(toX / COMBAT_CELLS_PER_MAP_TILE);
    const toMapY = Math.floor(toY / COMBAT_CELLS_PER_MAP_TILE);
    if (fromMapX === toMapX && fromMapY === toMapY) return true;
    return getWall(cells, mapWidth, mapHeight, fromMapX, fromMapY, edge) !== WALL.WALL;
  }

  function neighbors(cx, cy) {
    const result = [];
    for (const direction of directions) {
      const nx = cx + DX[direction];
      const ny = cy + DY[direction];
      if (openEdge(cx, cy, nx, ny)) result.push({ x: nx, y: ny });
    }
    return result;
  }

  const combatants = [
    ...heroes.map((entity) => ({ team: 'party', entity })),
    ...monsters.map((entity) => ({ team: 'monster', entity })),
  ];
  if (new Set(combatants.map(({ entity }) => entity.id)).size !== combatants.length) {
    throw new Error('Battlefield combatants must have unique ids.');
  }

  function nearestCells(anchor, count, occupied = new Set()) {
    const pending = [anchor];
    const discovered = new Set([cellKey(anchor.x, anchor.y)]);
    const available = [];
    for (let index = 0; index < pending.length && available.length < count; index += 1) {
      const current = pending[index];
      if (!occupied.has(cellKey(current.x, current.y))) available.push(current);
      for (const next of neighbors(current.x, current.y)) {
        const key = cellKey(next.x, next.y);
        if (discovered.has(key)) continue;
        discovered.add(key);
        pending.push(next);
      }
    }
    if (available.length < count) {
      throw new RangeError('The connected dungeon area is too small for these combatants.');
    }
    return available;
  }

  const entrance = directions.find((direction) => {
    const nx = mapX + DX[direction];
    const ny = mapY + DY[direction];
    return nx >= 0 && ny >= 0 && nx < mapWidth && ny < mapHeight
      && getWall(cells, mapWidth, mapHeight, mapX, mapY, direction) !== WALL.WALL;
  });
  const monsterAnchor = entrance === undefined ? origin : {
    x: (mapX + DX[entrance]) * COMBAT_CELLS_PER_MAP_TILE + center,
    y: (mapY + DY[entrance]) * COMBAT_CELLS_PER_MAP_TILE + center,
  };
  const frontDirection = entrance === undefined ? dir : entrance;
  // Keep the lead fighter on the front of the formation, with allies behind.
  // Assigning the leader to its center can seal all four of their exits.
  const partyFootprint = nearestCells(origin, heroes.length);
  const partyKeys = new Set(partyFootprint.map((cell) => cellKey(cell.x, cell.y)));
  const isFrontier = (cell) => neighbors(cell.x, cell.y).some((next) => !partyKeys.has(cellKey(next.x, next.y)));
  const partyCells = partyFootprint.sort((a, b) => {
    const frontier = Number(isFrontier(b)) - Number(isFrontier(a));
    if (frontier) return frontier;
    const forwardA = (a.x - origin.x) * DX[frontDirection] + (a.y - origin.y) * DY[frontDirection];
    const forwardB = (b.x - origin.x) * DX[frontDirection] + (b.y - origin.y) * DY[frontDirection];
    return forwardB - forwardA;
  });
  const formation = [...partyCells, ...nearestCells(monsterAnchor, monsters.length, partyKeys)];
  const units = combatants.map(({ team, entity }, index) => ({
    id: entity.id,
    team,
    x: formation[index].x,
    y: formation[index].y,
    entity,
  }));
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));

  function position(id) {
    return unitsById.get(id) ?? null;
  }

  function occupiedCells(actorId) {
    return new Set(units
      .filter((unit) => unit.id !== actorId && unit.entity.alive)
      .map((unit) => cellKey(unit.x, unit.y)));
  }

  function search(actor, budget, goals = null) {
    const blocked = occupiedCells(actor.id);
    const first = { x: actor.x, y: actor.y, cost: 0, previous: null };
    const reached = new Map([[cellKey(actor.x, actor.y), first]]);
    const pending = [first];
    for (let index = 0; index < pending.length; index += 1) {
      const current = pending[index];
      const currentKey = cellKey(current.x, current.y);
      if (goals?.has(currentKey)) return { reached, destination: current };
      if (current.cost >= budget) continue;
      for (const next of neighbors(current.x, current.y)) {
        const key = cellKey(next.x, next.y);
        if (blocked.has(key) || reached.has(key)) continue;
        const entry = { ...next, cost: current.cost + 1, previous: currentKey };
        reached.set(key, entry);
        pending.push(entry);
      }
    }
    return { reached, destination: null };
  }

  function reachable(id, budget) {
    const actor = position(id);
    if (!actor?.entity.alive || !(budget >= 0)) return [];
    const { reached } = search(actor, Math.floor(budget));
    return [...reached.values()].map(({ x: cx, y: cy, cost }) => ({ x: cx, y: cy, cost }));
  }

  function move(id, toX, toY, budget) {
    const actor = position(id);
    if (!actor?.entity.alive || !inBounds(toX, toY) || !(budget >= 0)) return { moved: false, cost: 0 };
    if (actor.x === toX && actor.y === toY) return { moved: false, cost: 0 };
    const goals = new Set([cellKey(toX, toY)]);
    const { destination } = search(actor, Math.floor(budget), goals);
    if (!destination) return { moved: false, cost: 0 };
    actor.x = toX;
    actor.y = toY;
    return { moved: true, cost: destination.cost };
  }

  function reconstructPath(reached, destination) {
    const path = [];
    let current = destination;
    while (current && current.previous !== null) {
      path.push({ x: current.x, y: current.y });
      current = reached.get(current.previous);
    }
    return path.reverse();
  }

  function pathToCell(id, toX, toY, budget) {
    const actor = position(id);
    if (!actor?.entity.alive || !inBounds(toX, toY) || !(budget >= 0)) return [];
    const { reached, destination } = search(actor, Math.floor(budget), new Set([cellKey(toX, toY)]));
    return destination ? reconstructPath(reached, destination) : [];
  }

  function pathToAdjacent(id, targetId, maxSteps = Infinity) {
    const actor = position(id);
    const target = position(targetId);
    if (!actor?.entity.alive || !target?.entity.alive || actor.team === target.team || !(maxSteps > 0)) return [];
    const blocked = occupiedCells(actor.id);
    const goals = new Set(neighbors(target.x, target.y)
      .filter((cell) => !blocked.has(cellKey(cell.x, cell.y)))
      .map((cell) => cellKey(cell.x, cell.y)));
    if (!goals.size) return [];
    const { reached, destination } = search(actor, Infinity, goals);
    if (!destination) return [];
    return reconstructPath(reached, destination).slice(0, Math.floor(maxSteps));
  }

  function hasLineOfSight(actor, target) {
    const distanceX = Math.abs(target.x - actor.x);
    const distanceY = Math.abs(target.y - actor.y);
    const stepX = Math.sign(target.x - actor.x);
    const stepY = Math.sign(target.y - actor.y);
    let cx = actor.x;
    let cy = actor.y;
    let crossedX = 0;
    let crossedY = 0;

    // Compare grid-boundary times as integer ratios; corner crossings cover all four touching cells.
    while (cx !== target.x || cy !== target.y) {
      const crossingX = distanceX ? (crossedX * 2 + 1) * distanceY : Infinity;
      const crossingY = distanceY ? (crossedY * 2 + 1) * distanceX : Infinity;
      if (crossingX < crossingY) {
        if (!openEdge(cx, cy, cx + stepX, cy)) return false;
        cx += stepX;
        crossedX += 1;
      } else if (crossingY < crossingX) {
        if (!openEdge(cx, cy, cx, cy + stepY)) return false;
        cy += stepY;
        crossedY += 1;
      } else {
        if (!openEdge(cx, cy, cx + stepX, cy)
          || !openEdge(cx, cy, cx, cy + stepY)
          || !openEdge(cx + stepX, cy, cx + stepX, cy + stepY)
          || !openEdge(cx, cy + stepY, cx + stepX, cy + stepY)) return false;
        cx += stepX;
        cy += stepY;
        crossedX += 1;
        crossedY += 1;
      }
    }
    return true;
  }

  function canTarget(actorId, targetId, { range = 1, melee = false } = {}) {
    const actor = position(actorId);
    const target = position(targetId);
    if (!actor?.entity.alive || !target || !(range >= 0)) return false;
    const distance = Math.abs(actor.x - target.x) + Math.abs(actor.y - target.y);
    if (distance > range) return false;
    if (melee) return distance === 1 && openEdge(actor.x, actor.y, target.x, target.y);
    return hasLineOfSight(actor, target);
  }

  return { width, height, origin, units, position, reachable, move, pathToCell, pathToAdjacent, canTarget };
}
