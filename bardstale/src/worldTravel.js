import { createWorldArea, getWorldAreaDefinition } from './worldAreas.js';

// Each journey owns its mutable map discoveries, objects, and saved positions.
export function createWorldJourney({ area = 'new-phlan' } = {}) {
  getWorldAreaDefinition(area);
  const areas = new Map();
  const areaFor = id => {
    if (!areas.has(id)) areas.set(id, createWorldArea(id));
    return areas.get(id);
  };
  const connectionFor = (fromId, toId) => {
    getWorldAreaDefinition(toId);
    const exit = areaFor(fromId).exits.find(entry => entry.target === toId);
    if (!exit) throw new Error(`No route from ${fromId} to ${toId}`);
    return exit;
  };
  const arrivalFor = (fromId, toId) => {
    connectionFor(fromId, toId);
    const { x, y, dir } = connectionFor(toId, fromId);
    return { x, y, dir };
  };
  const resurrectionSpawn = () => {
    const templeArea = areaFor('new-phlan');
    return { area: templeArea, position: { ...templeArea.templeSpawn } };
  };
  return { initialArea: areaFor(area), areaFor, connectionFor, arrivalFor, resurrectionSpawn };
}
