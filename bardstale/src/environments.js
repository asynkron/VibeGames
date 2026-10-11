export const ENVIRONMENTS = Object.freeze([
  { id: 'dungeon', name: 'Stone dungeon', description: 'Vaulted halls, torchlit passages, and weathered masonry.', outdoors: false, connections: ['cave', 'village'] },
  { id: 'cave', name: 'Crystal caverns', description: 'Broad rock chambers, mineral seams, and luminous crystals.', outdoors: false, connections: ['forest', 'dungeon'] },
  { id: 'forest', name: 'Ancient woodland', description: 'Sunlit clearings among oaks, pines, ferns, and mossy rocks.', outdoors: true, connections: ['village', 'cave'] },
  { id: 'village', name: 'Market village', description: 'Open streets and enterable houses with varied facades and rooflines.', outdoors: true, connections: ['dungeon', 'forest'] },
].map(environment => Object.freeze({ ...environment, connections: Object.freeze(environment.connections) })));

export function getEnvironment(id) {
  const environment = ENVIRONMENTS.find(entry => entry.id === id);
  if (!environment) throw new Error(`Unknown environment: ${id}`);
  return environment;
}
