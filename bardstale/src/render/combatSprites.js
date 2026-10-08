import { SPRITE_PARTS, CREATURE_TILES } from './combatSpriteTiles.js';

export const COMBAT_TILE_SIZE = 8;
export const COMBAT_SPRITE_SIZE = 24;

// Palette symbols are shared by every interchangeable 8x8 part.
const INK = { K: '#000000', S: '#e4a4a2', s: '#aa5555', H: '#a34844', h: '#ff5555', M: '#ffffff', m: '#aaaaaa', L: '#aa5500', G: '#ffff55', g: '#aa5500', E: '#55ffff' };
const PALETTES = Object.freeze({
  azure: { ...INK, C: '#285eaa', c: '#5f8ee9', A: '#5ecd87', a: '#3f8e64', P: '#81edee', p: '#479e9f' },
  steel: { ...INK, C: '#aaaaaa', c: '#ffffff', A: '#0055aa', a: '#5555ff', P: '#0055aa', p: '#0000aa', H: '#aa5500', h: '#ffff55' },
  forest: { ...INK, C: '#005500', c: '#55aa55', A: '#00aa00', a: '#55ff55', P: '#aa5500', p: '#552a00', H: '#552a00', h: '#aa5500' },
  ochre: { ...INK, C: '#aa5500', c: '#ffaa55', A: '#0055aa', a: '#5555ff', P: '#aa5500', p: '#552a00' },
  violet: { ...INK, C: '#5500aa', c: '#aa55ff', A: '#aa00aa', a: '#ff55ff', P: '#aa55ff', p: '#5500aa', H: '#aaaaaa', h: '#ffffff' },
  crimson: { ...INK, C: '#aa0000', c: '#ff5555', A: '#555555', a: '#aaaaaa', P: '#aa0000', p: '#550000', H: '#000000', h: '#555555' },
  bone: { ...INK, C: '#aaaaaa', c: '#ffffff', A: '#aaaaaa', a: '#ffffff', P: '#aaaaaa', p: '#555555', S: '#ffffff', s: '#aaaaaa', H: '#aaaaaa', h: '#ffffff' },
  goblin: { ...INK, C: '#aa5500', c: '#ffaa55', A: '#00aa00', a: '#55ff55', P: '#0055aa', p: '#0000aa', S: '#55aa55', s: '#005500', H: '#aa0000', h: '#ff5555' },
  flame: { ...INK, C: '#ff5500', c: '#ffff55', A: '#ffaa00', a: '#ffff55', P: '#aa0000', p: '#550000', S: '#ffff55', s: '#ffaa00' },
});

export const COMBAT_APPEARANCE_OPTIONS = Object.freeze({
  ...Object.fromEntries(Object.entries(SPRITE_PARTS).map(([slot, variants]) => [slot, Object.keys(variants)])),
  palette: Object.keys(PALETTES),
});

const PERSON = { head: 'hair', torso: 'tunic', arms: 'sleeves', legs: 'pants', weapon: 'sword', shield: 'none', palette: 'azure' };
const CASTER = { ...PERSON, torso: 'robe', legs: 'robe', weapon: 'staff' };
const PRESETS = Object.freeze({
  warrior: { ...PERSON, torso: 'chain', shield: 'round' },
  paladin: { ...PERSON, head: 'helmet', torso: 'chain', shield: 'kite', palette: 'steel' },
  rogue: { ...PERSON, torso: 'leather', weapon: 'dagger', palette: 'forest' },
  bard: { ...PERSON, torso: 'leather', palette: 'ochre' },
  hunter: { ...PERSON, torso: 'leather', weapon: 'bow', palette: 'forest' },
  monk: { ...PERSON, head: 'bald', arms: 'bare', legs: 'skirt', weapon: 'none', palette: 'ochre' },
  conjurer: { ...CASTER, palette: 'crimson' },
  magician: { ...CASTER, palette: 'azure' },
  sorcerer: { ...CASTER, head: 'hood', palette: 'violet' },
  wizard: { ...CASTER, head: 'hood', palette: 'steel' },
  archmage: { ...CASTER, head: 'crown', palette: 'crimson' },
  chronomancer: { ...CASTER, palette: 'violet' },
  geomancer: { ...CASTER, palette: 'forest' },
  hobbit: { ...PERSON, torso: 'leather', legs: 'bare', weapon: 'dagger', palette: 'ochre' },
  hobgoblin: { ...PERSON, head: 'horned', torso: 'leather', legs: 'skirt', weapon: 'axe', shield: 'round', palette: 'goblin' },
  skeleton: { ...PERSON, head: 'skull', torso: 'ribs', arms: 'bones', legs: 'bones', palette: 'bone' },
  knight: { ...PERSON, head: 'helmet', torso: 'chain', shield: 'kite', palette: 'crimson' },
  mage: { ...CASTER, palette: 'azure' },
  enchantress: { ...CASTER, head: 'longHair', legs: 'skirt', palette: 'violet' },
  warlock: { ...CASTER, head: 'hood', palette: 'crimson' },
  ogre: { ...PERSON, head: 'horned', arms: 'bare', torso: 'leather', legs: 'skirt', weapon: 'club', palette: 'goblin' },
  lich: { ...CASTER, head: 'skull', arms: 'bones', palette: 'bone' },
  serpent: { ...PERSON, form: 'serpent', palette: 'goblin' },
  rat_swarm: { ...PERSON, form: 'rats', palette: 'ochre' },
  elemental: { ...PERSON, form: 'elemental', palette: 'flame' },
});
export const COMBAT_SPRITE_KINDS = Object.freeze(Object.keys(PRESETS));

const WEAPONS = { sword_basic: 'shortSword', longsword: 'sword', dagger: 'dagger', quarterstaff: 'staff' };
const ARMOR = {
  leather_armor: { torso: 'leather' },
  chain_armor: { torso: 'chain' },
  robes: { torso: 'robe', legs: 'robe' },
};

export function getCombatAppearance({ kind, equipment, appearance = {} }) {
  const key = String(kind).toLowerCase().replace(/[ -]/g, '_');
  const preset = PRESETS[key];
  if (!preset) throw new Error(`Unknown combat sprite kind: ${kind}`);
  const result = { ...preset };
  if (equipment) {
    if (equipment.weapon && !WEAPONS[equipment.weapon]) throw new Error(`Unknown combat weapon: ${equipment.weapon}`);
    if (equipment.body && !ARMOR[equipment.body]) throw new Error(`Unknown combat armor: ${equipment.body}`);
    if (equipment.offhand && equipment.offhand !== 'shield_wood') throw new Error(`Unknown combat shield: ${equipment.offhand}`);
    result.weapon = equipment.weapon ? WEAPONS[equipment.weapon] : 'none';
    result.shield = equipment.offhand ? 'round' : 'none';
    result.torso = preset.legs === 'robe' ? 'robe' : 'tunic';
    Object.assign(result, ARMOR[equipment.body]);
  }
  for (const slot of Object.keys(COMBAT_APPEARANCE_OPTIONS)) {
    if (appearance[slot] !== undefined) result[slot] = appearance[slot];
    if (!COMBAT_APPEARANCE_OPTIONS[slot].includes(result[slot])) throw new Error(`Unknown combat ${slot}: ${result[slot]}`);
  }
  return result;
}

// Composition stays on the native pixel grid; only the finished canvas is enlarged.
export function renderCombatSprite(descriptor) {
  const appearance = getCombatAppearance(descriptor);
  const facing = descriptor.facing ?? 'right';
  if (facing !== 'left' && facing !== 'right') throw new Error(`Unknown combat facing: ${facing}`);
  const colors = Object.fromEntries(Object.entries(PALETTES[appearance.palette]).map(([key, hex]) => [key, [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))]));
  const pixels = new Uint8ClampedArray(COMBAT_SPRITE_SIZE * COMBAT_SPRITE_SIZE * 4);
  const layers = appearance.form
    ? [CREATURE_TILES[appearance.form]]
    : ['legs', 'torso', 'head', 'arms', 'weapon', 'shield'].map((slot) => SPRITE_PARTS[slot][appearance[slot]]);
  for (const layer of layers) {
    for (const { column, row, pixels: tile } of layer) {
      for (let y = 0; y < COMBAT_TILE_SIZE; y++) {
        for (let x = 0; x < COMBAT_TILE_SIZE; x++) {
          const ink = tile[y][x];
          if (ink === '.') continue;
          const color = colors[ink];
          if (!color) throw new Error(`Unknown sprite ink: ${ink}`);
          const sourceX = column * COMBAT_TILE_SIZE + x;
          const outputX = facing === 'left' ? COMBAT_SPRITE_SIZE - 1 - sourceX : sourceX;
          const offset = ((row * COMBAT_TILE_SIZE + y) * COMBAT_SPRITE_SIZE + outputX) * 4;
          pixels.set([...color, 255], offset);
        }
      }
    }
  }
  return { width: COMBAT_SPRITE_SIZE, height: COMBAT_SPRITE_SIZE, pixels };
}

export function createCombatSpriteCanvas(descriptor) {
  const sprite = renderCombatSprite(descriptor);
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const image = ctx.createImageData(sprite.width, sprite.height);
  image.data.set(sprite.pixels);
  ctx.putImageData(image, 0, 0);
  return canvas;
}
