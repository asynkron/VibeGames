export const ENVIRONMENTS = Object.freeze([
  { id: 'dungeon', name: 'Stone dungeon', description: 'Vaulted halls, torchlit passages, and weathered masonry.', outdoors: false },
  { id: 'cave', name: 'Crystal caverns', description: 'Broad rock chambers, mineral seams, and luminous crystals.', outdoors: false },
  { id: 'forest', name: 'Ancient woodland', description: 'Twilit clearings among oaks, pines, ferns, and mossy rocks.', outdoors: true },
  { id: 'village', name: 'Market village', description: 'Open streets and enterable houses with varied facades and rooflines.', outdoors: true },
].map(environment => Object.freeze(environment)));

export function getEnvironment(id) {
  const environment = ENVIRONMENTS.find(entry => entry.id === id);
  if (!environment) throw new Error(`Unknown environment: ${id}`);
  return environment;
}
