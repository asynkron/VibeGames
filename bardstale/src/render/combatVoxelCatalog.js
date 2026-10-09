import { assembleCharacterParts, VOXEL_APPEARANCE_OPTIONS } from './voxelCharacterParts.js';
import { assembleCreatureVoxelModel } from './voxelCreatureParts.js';

// Themes supply unrestricted RGB paint to shared geometric assets.
const THEMES = Object.freeze({
  azure: { teal:'#326aab', crimson:'#326aab', midnight:'#344c70', indigo:'#293e67', ivory:'#e8dbb7', crystal:'#6bdcef' },
  steel: { teal:'#f0e1bb', crimson:'#ede0bd', midnight:'#53647c', indigo:'#395981', ivory:'#4f79ab', hair:'#d5ccb6', crystal:'#91e2fb' },
  forest: { teal:'#486a43', crimson:'#486a43', midnight:'#405339', indigo:'#626a46', ivory:'#c6c68b', hair:'#66412a', crystal:'#a6d471' },
  ochre: { teal:'#b07538', crimson:'#b07538', midnight:'#82612c', indigo:'#643e30', ivory:'#efd7a1', hair:'#673728', crystal:'#efc25b' },
  violet: { teal:'#7051a8', crimson:'#7051a8', midnight:'#453d69', indigo:'#4d385f', ivory:'#d1b5e9', hair:'#d1c4b8', crystal:'#dd9de9' },
  crimson: { teal:'#a83845', crimson:'#a83845', midnight:'#653642', indigo:'#443340', ivory:'#e6c486', hair:'#342b32', crystal:'#ff9071' },
  bone: { teal:'#343e52', crimson:'#343e52', midnight:'#303347', indigo:'#343346', ivory:'#ad9470', crystal:'#74dda6', gold:'#b9a56d' },
  goblin: { teal:'#98713b', crimson:'#98713b', midnight:'#626144', indigo:'#656039', ivory:'#bbaa74', skin:'#789944', hair:'#303927', crystal:'#c6d468' },
  ogre: { teal:'#776e4a', crimson:'#776e4a', midnight:'#65543b', indigo:'#6a593b', ivory:'#ad9470', skin:'#94916a', hair:'#3d3929' },
});

export const COMBAT_VOXEL_PALETTES=Object.freeze(Object.keys(THEMES));
export const COMBAT_VOXEL_APPEARANCE_OPTIONS=Object.freeze({
  ...Object.fromEntries(Object.entries(VOXEL_APPEARANCE_OPTIONS).map(([part,options])=>[part,options.map(option=>option.value)])),
  palette:COMBAT_VOXEL_PALETTES,
});

const PERSON={head:'bare',torso:'tunic',arms:'sleeves',legs:'ranger',weapon:'sword',shield:'none',palette:'azure'};
const CASTER={...PERSON,torso:'robe',legs:'robe',weapon:'staff'};
const PRESETS=Object.freeze({
  warrior:{...PERSON,torso:'chain',arms:'plate',legs:'armored',shield:'round'},
  paladin:{...PERSON,head:'plumed',torso:'steel',arms:'plate',legs:'armored',shield:'kite',palette:'steel'},
  rogue:{...PERSON,head:'hood',torso:'leather',arms:'leather',weapon:'dagger',palette:'forest'},
  bard:{...PERSON,head:'longHair',torso:'leather',weapon:'shortSword',palette:'ochre'},
  hunter:{...PERSON,torso:'leather',arms:'leather',weapon:'bow',palette:'forest'},
  monk:{...PERSON,head:'bald',arms:'bare',legs:'skirt',weapon:'none',palette:'ochre'},
  conjurer:{...CASTER,palette:'crimson'},
  magician:{...CASTER,palette:'azure'},
  sorcerer:{...CASTER,head:'hood',palette:'violet'},
  wizard:{...CASTER,head:'wizardHat',palette:'steel'},
  archmage:{...CASTER,head:'crown',palette:'crimson'},
  chronomancer:{...CASTER,head:'crown',palette:'violet'},
  geomancer:{...CASTER,head:'bald',palette:'forest'},
  hobbit:{...PERSON,torso:'leather',legs:'bare',weapon:'dagger',palette:'ochre'},
  hobgoblin:{...PERSON,head:'goblin',torso:'leather',arms:'bare',legs:'skirt',weapon:'axe',shield:'round',palette:'goblin'},
  skeleton:{...PERSON,head:'skull',torso:'ribs',arms:'bones',legs:'bones',palette:'bone'},
  knight:{...PERSON,head:'knight',torso:'steel',arms:'plate',legs:'armored',shield:'kite',palette:'crimson'},
  mage:{...CASTER,head:'wizardHat',palette:'azure'},
  enchantress:{...CASTER,head:'longHair',palette:'violet'},
  warlock:{...CASTER,head:'hood',palette:'crimson'},
  ogre:{...PERSON,head:'ogre',torso:'leather',arms:'bare',legs:'skirt',weapon:'club',palette:'ogre'},
  lich:{...CASTER,head:'skull',arms:'bones',palette:'bone'},
});
const CREATURES=Object.freeze(['serpent','rat_swarm','elemental']);
export const COMBAT_VOXEL_KINDS=Object.freeze([...Object.keys(PRESETS),...CREATURES]);

const WEAPONS={sword_basic:'shortSword',longsword:'sword',dagger:'dagger',quarterstaff:'staff'};
const ARMOR={
  leather_armor:{torso:'leather',arms:'leather'},
  chain_armor:{torso:'chain',arms:'plate'},
  robes:{torso:'robe',arms:'sleeves',legs:'robe'},
};

function normalizeKind(kind) {
  const key=String(kind).toLowerCase().replace(/[ -]/g,'_');
  if(!COMBAT_VOXEL_KINDS.includes(key)) throw new RangeError(`Unknown combat voxel kind: ${kind}`);
  return key;
}

export function getCombatVoxelAppearance({kind,equipment,appearance={}}) {
  const key=normalizeKind(kind);
  if(CREATURES.includes(key)) {
    if(equipment && Object.values(equipment).some(Boolean)) throw new RangeError(`${key} does not use humanoid equipment`);
    if(Object.keys(appearance).some(part=>part!=='form') || (appearance.form && appearance.form!==key)) throw new RangeError(`${key} does not use humanoid block variants`);
    return {form:key};
  }
  const result={...PRESETS[key]};
  if(equipment) {
    if(equipment.weapon && !Object.hasOwn(WEAPONS,equipment.weapon)) throw new RangeError(`Unknown combat weapon: ${equipment.weapon}`);
    if(equipment.body && !Object.hasOwn(ARMOR,equipment.body)) throw new RangeError(`Unknown combat armor: ${equipment.body}`);
    if(equipment.offhand && equipment.offhand!=='shield_wood') throw new RangeError(`Unknown combat shield: ${equipment.offhand}`);
    result.weapon=equipment.weapon?WEAPONS[equipment.weapon]:'none';
    result.shield=equipment.offhand?'round':'none';
    result.torso=PRESETS[key].torso==='robe'?'robe':'tunic';
    result.arms=PRESETS[key].arms==='bare'?'bare':'sleeves';
    Object.assign(result,ARMOR[equipment.body]);
  }
  for(const part of Object.keys(appearance)) {
    if(!Object.hasOwn(COMBAT_VOXEL_APPEARANCE_OPTIONS,part)) throw new RangeError(`Unknown combat appearance part: ${part}`);
  }
  for(const [part,options] of Object.entries(COMBAT_VOXEL_APPEARANCE_OPTIONS)) {
    if(appearance[part]!==undefined) result[part]=appearance[part];
    if(!options.includes(result[part])) throw new RangeError(`Unknown combat ${part}: ${result[part]}`);
  }
  return result;
}

const models=new Map();
export function assembleCombatVoxelModel(descriptor) {
  const kind=normalizeKind(descriptor.kind);
  const appearance=getCombatVoxelAppearance({...descriptor,kind});
  if(CREATURES.includes(kind)) return assembleCreatureVoxelModel(kind);
  const key=JSON.stringify([kind,appearance]);
  if(!models.has(key)) {
    const model=assembleCharacterParts(appearance,THEMES[appearance.palette]);
    const id=`${kind}/${model.recipe.id}`;
    const recipe=Object.freeze({...model.recipe,id});
    const assembly=Object.freeze({...model.assembly,id});
    models.set(key,Object.freeze({...model,recipe,assembly,appearance:Object.freeze(appearance),scale:kind==='hobbit'?.74:kind==='ogre'?1.3:1}));
  }
  return models.get(key);
}
