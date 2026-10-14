const services = [
  { id: 'temple-tyr', name: 'Temple of Tyr', type: 'temple', description: 'Bishop Braccio’s priests heal wounds and restore fallen adventurers. A defeated party returns to this sanctuary.' },
  { id: 'temple-sune', name: 'Temple of Sune', type: 'temple', description: 'The priestesses of Sune offer healing to adventurers returning from the ruined city.' },
  { id: 'temple-tempus', name: 'Temple of Tempus', type: 'temple', description: 'The priests of Tempus tend those who fight to reclaim Phlan.' },
  { id: 'arms-armor', name: 'Arms and Armor', type: 'shop', description: 'Ordinary weapons and armor for expeditions into Old Phlan.', stock: [
    { itemId: 'dagger', price: 2 }, { itemId: 'short_sword', price: 8 }, { itemId: 'long_sword', price: 15 },
    { itemId: 'mace', price: 8 }, { itemId: 'flail', price: 3 }, { itemId: 'battle_axe', price: 5 },
    { itemId: 'quarterstaff', price: 1 }, { itemId: 'spear', price: 1 }, { itemId: 'halberd', price: 9 },
    { itemId: 'long_bow', price: 60 }, { itemId: 'shield', price: 10 }, { itemId: 'leather_armor', price: 5 },
    { itemId: 'arrow', price: 1, quantity: 20 },
    { itemId: 'studded_leather', price: 15 }, { itemId: 'ring_mail', price: 30 }, { itemId: 'scale_mail', price: 45 },
    { itemId: 'chain_mail', price: 75 }, { itemId: 'splint_mail', price: 80 }, { itemId: 'banded_mail', price: 90 },
    { itemId: 'plate_mail', price: 400 },
  ] },
  { id: 'general-store', name: 'General Supplies', type: 'shop', description: 'Clothes, boots, cloaks, and packs for the road.', stock: [
    { itemId: 'robes', price: 2 }, { itemId: 'travel_cape', price: 5 }, { itemId: 'leather_pack', price: 2 },
    { itemId: 'leather_boots', price: 1 }, { itemId: 'leather_belt', price: 1 },
  ] },
  { id: 'silver-shop', name: 'Silver Shop', type: 'shop', description: 'Selected enchanted arms for more dangerous expeditions.', stock: [
    { itemId: 'long_sword_plus1', price: 2000 }, { itemId: 'shield_plus1', price: 2500 },
    { itemId: 'long_sword_flame_tongue', price: 3500 }, { itemId: 'quarterstaff_plus1', price: 2000 },
    { itemId: 'magic_missile_scroll', price: 100 }, { itemId: 'fireball_scroll', price: 300 },
    { itemId: 'restoration_scroll', price: 1500 },
  ] },
  { id: 'jeweler', name: 'Phlan Jeweler', type: 'shop', description: 'Precious jewelry and a carefully guarded protective ring.', stock: [{ itemId: 'ring_protection1', price: 2000 }] },
  { id: 'dueling-hall', name: 'Dueling Hall', type: 'training', description: 'Practice tactical combat before facing the monsters of Old Phlan. The hall restores the party afterward.' },
  { id: 'fighter-trainer', name: 'Fighter Training', type: 'trainer', description: 'Train a fighter who has earned enough experience. Advancement costs 1,000 gold.', classes: ['Fighter'], trainingCost: 1000 },
  { id: 'cleric-trainer', name: 'Clerical Training', type: 'trainer', description: 'Train a cleric who has earned enough experience. Advancement costs 1,000 gold.', classes: ['Cleric'], trainingCost: 1000 },
  { id: 'magic-user-trainer', name: 'Magic-user Training', type: 'trainer', description: 'Train a magic-user who has earned enough experience. Advancement costs 1,000 gold.', classes: ['Magic-user'], trainingCost: 1000 },
  { id: 'thief-trainer', name: 'Thieves’ Training', type: 'trainer', description: 'Train a thief who has earned enough experience. Advancement costs 1,000 gold.', classes: ['Thief'], trainingCost: 1000 },
  { id: 'inn', name: 'New Phlan Inn', type: 'inn', description: 'A safe bed for the entire party. Rest, heal, and prepare spells for 5 gold.', price: 5 },
  { id: 'tavern', name: 'Phlan Tavern', type: 'tavern', description: 'Listen for rumors about the haunted keep, the ruined city, and the powers gathering beyond Phlan.' },
  { id: 'council', name: 'City Council', type: 'council', description: 'Read the council’s commissions, reclaim the Slums, and free Sokal Keep. Return here to collect your rewards.' },
];

export const CITY_SERVICES = Object.freeze(Object.fromEntries(services.map(service => [service.id, Object.freeze({
  ...service,
  ...(service.classes ? { classes: Object.freeze([...service.classes]) } : {}),
  ...(service.stock ? { stock: Object.freeze(service.stock.map(item => Object.freeze({ ...item }))) } : {}),
})])));

export function getCityService(id) {
  return CITY_SERVICES[id] ?? null;
}
