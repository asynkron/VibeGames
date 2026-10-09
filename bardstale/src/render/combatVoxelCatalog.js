import { footprintForKind } from '../combatFootprints.js';
import { ITEM_DB, EQUIPMENT_SLOTS } from '../items.js';
import { assembleCharacterParts, VOXEL_APPEARANCE_OPTIONS, EMPTY_VOXEL_GEAR } from './voxelCharacterParts.js';
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

const PERSON={...EMPTY_VOXEL_GEAR,head:'bare',torso:'tunic',arms:'sleeves',legs:'ranger',mainhand:'sword',offhand:'none',back:'none',palette:'azure'};
const CASTER={...PERSON,torso:'robe',legs:'robe',mainhand:'staff'};
const PRESETS=Object.freeze({
  warrior:{...PERSON,torso:'chain',arms:'chain',legs:'armored',offhand:'round',shoulders:'steel',hands:'steel',feet:'steel',waist:'leather'},
  paladin:{...PERSON,head:'plumed',torso:'steel',arms:'plate',legs:'armored',offhand:'kite',palette:'steel',shoulders:'steel',hands:'steel',feet:'steel',waist:'gold',neck:'sapphire'},
  rogue:{...PERSON,head:'hood',torso:'leather',arms:'leather',mainhand:'dagger',palette:'forest',feet:'leather',hands:'leather',waist:'leather'},
  bard:{...PERSON,head:'longHair',torso:'leather',mainhand:'shortSword',back:'lute',palette:'ochre',feet:'leather',waist:'leather'},
  hunter:{...PERSON,torso:'leather',arms:'leather',mainhand:'bow',palette:'forest',feet:'leather',hands:'leather',waist:'leather'},
  monk:{...PERSON,head:'bald',arms:'bare',legs:'skirt',mainhand:'none',palette:'ochre'},
  conjurer:{...CASTER,palette:'crimson'},
  magician:{...CASTER,palette:'azure'},
  sorcerer:{...CASTER,head:'hood',palette:'violet'},
  wizard:{...CASTER,head:'wizardHat',palette:'steel'},
  archmage:{...CASTER,head:'crown',palette:'crimson'},
  chronomancer:{...CASTER,head:'crown',palette:'violet'},
  geomancer:{...CASTER,head:'bald',palette:'forest'},
  hobbit:{...PERSON,torso:'leather',legs:'bare',mainhand:'dagger',palette:'ochre'},
  hobgoblin:{...PERSON,head:'goblin',torso:'leather',arms:'bare',legs:'skirt',mainhand:'axe',offhand:'round',palette:'goblin'},
  skeleton:{...PERSON,head:'skull',torso:'ribs',arms:'bones',legs:'bones',palette:'bone'},
  knight:{...PERSON,head:'knight',torso:'steel',arms:'plate',legs:'armored',offhand:'kite',palette:'crimson',shoulders:'steel',hands:'steel',feet:'steel',waist:'leather'},
  mage:{...CASTER,head:'wizardHat',palette:'azure'},
  enchantress:{...CASTER,head:'longHair',palette:'violet'},
  warlock:{...CASTER,head:'hood',palette:'crimson'},
  lich:{...CASTER,head:'skull',arms:'bones',palette:'bone'},
});
const CREATURES=Object.freeze(['serpent','rat_swarm','elemental','dragon','ogre']);
export const COMBAT_VOXEL_KINDS=Object.freeze([...Object.keys(PRESETS),...CREATURES]);

const NATURAL_HEAD=Object.freeze({bard:'longHair',enchantress:'longHair',monk:'bald',geomancer:'bald',hobgoblin:'goblin',skeleton:'skull',lich:'skull'});
const NO_ITEM_EFFECTS=Object.freeze([]);

function visualPartFor(slot, part) {
  return part==='ring'?slot:part==='mainhand'&&slot==='offhand'?'offhand':part;
}

function normalizeKind(kind) {
  const key=String(kind).toLowerCase().replace(/[ -]/g,'_');
  if(!COMBAT_VOXEL_KINDS.includes(key)) throw new RangeError(`Unknown combat voxel kind: ${kind}`);
  return key;
}

export function getCombatVoxelAppearance({kind,equipment,appearance={}}) {
  const key=normalizeKind(kind);
  if(CREATURES.includes(key)) {
    if(equipment && Object.values(equipment).some(Boolean)) throw new RangeError(`${key} does not use humanoid equipment`);
    if(Object.keys(appearance).some(part=>part!=='form') || (appearance.form && appearance.form!==key)) throw new RangeError(`${key} does not use humanoid part variants`);
    return {form:key};
  }
  const result={...PRESETS[key]};
  if(equipment) {
    // Explicit game equipment starts from anatomy and ordinary underclothes.
    // Workshop/monster presets only apply when no equipment descriptor is supplied.
    Object.assign(result,EMPTY_VOXEL_GEAR,{
      head:NATURAL_HEAD[key]??'bare',torso:'tunic',arms:'sleeves',legs:'plain',
      mainhand:'none',offhand:'none',back:'none',
    });
    if(['skeleton','lich'].includes(key)) Object.assign(result,{torso:'ribs',arms:'bones',legs:'bones'});
    for(const [slot,itemId] of Object.entries(equipment)) {
      if(!EQUIPMENT_SLOTS.some(({id})=>id===slot)) throw new RangeError(`Unknown equipment slot: ${slot}`);
      if(!itemId) continue;
      const item=ITEM_DB[itemId];
      if(!item) throw new RangeError(`Unknown ${slot} item: ${itemId}`);
      if(!item.slots.includes(slot)) throw new RangeError(`${itemId} cannot be equipped in ${slot}`);
      for(const [part,variant] of Object.entries(item.visuals)) {
        const target=visualPartFor(slot,part);
        if(!Object.hasOwn(COMBAT_VOXEL_APPEARANCE_OPTIONS,target)) throw new RangeError(`Unknown item visual part: ${target}`);
        result[target]=variant;
      }
    }
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

function equippedEffects(equipment, appearance) {
  const effects=[];
  for(const {id:equipmentSlot} of EQUIPMENT_SLOTS) {
    const item=ITEM_DB[equipment?.[equipmentSlot]];
    if(!item?.effect) continue;
    for(const [part,variant] of Object.entries(item.visuals)) {
      const slot=visualPartFor(equipmentSlot,part);
      // A workshop replacement removes the enchantment along with its item geometry.
      if(appearance[slot]!==variant) continue;
      effects.push({id:`${equipmentSlot}:${item.id}:${slot}`,slot,variant,effect:item.effect});
    }
  }
  return effects;
}

function effectRegion({slot,variant,effect}, assembly) {
  const cells=assembly.parts[slot].voxels;
  if(effect.region==='crystal') return cells.filter(cell=>cell.material==='crystal');
  if(effect.region==='blade'||variant==='mace') {
    // The gold crossguard/collar separates the active metal from the grip.
    // Reading the assembled cells also includes each hand's position and offset.
    const collarTop=Math.max(...cells.filter(cell=>cell.material==='gold').map(cell=>cell.y));
    return cells.filter(cell=>cell.material==='steel'&&cell.y>collarTop);
  }
  const front=new Map();
  for(const cell of cells) {
    const key=`${cell.x},${cell.y}`;
    if(!front.has(key)||front.get(key).z<cell.z) front.set(key,cell);
  }
  return [...front.values()];
}

function assembleItemEffects(bindings, assembly) {
  return Object.freeze(bindings.map(binding=>{
    const cells=effectRegion(binding,assembly);
    if(!cells.length) throw new Error(`Item effect ${binding.id} has no emitting surface.`);
    const min={},max={},anchor={};
    for(const axis of ['x','y','z']) {
      min[axis]=Math.min(...cells.map(cell=>cell[axis]));
      max[axis]=Math.max(...cells.map(cell=>cell[axis]+1));
      anchor[axis]=(min[axis]+max[axis])/2;
    }
    const {id,slot,effect:{kind,color,accent}}=binding;
    return Object.freeze({id,slot,kind,color,accent,
      bounds:Object.freeze({min:Object.freeze(min),max:Object.freeze(max)}),
      anchor:Object.freeze(anchor),
    });
  }));
}

const models=new Map();
export function assembleCombatVoxelModel(descriptor) {
  const kind=normalizeKind(descriptor.kind);
  const appearance=getCombatVoxelAppearance({...descriptor,kind});
  if(CREATURES.includes(kind)) {
    if(!models.has(kind)) models.set(kind,Object.freeze({...assembleCreatureVoxelModel(kind),footprint:footprintForKind(kind),itemEffects:NO_ITEM_EFFECTS}));
    return models.get(kind);
  }
  const bindings=equippedEffects(descriptor.equipment,appearance);
  const key=JSON.stringify([kind,appearance,bindings.map(binding=>binding.id)]);
  if(!models.has(key)) {
    const model=assembleCharacterParts(appearance,THEMES[appearance.palette]);
    const id=`${kind}/${model.recipe.id}`;
    const recipe=Object.freeze({...model.recipe,id});
    const assembly=Object.freeze({...model.assembly,id});
    const itemEffects=assembleItemEffects(bindings,assembly);
    models.set(key,Object.freeze({...model,recipe,assembly,itemEffects,appearance:Object.freeze(appearance),footprint:footprintForKind(kind),scale:kind==='hobbit'?.74:1}));
  }
  return models.get(key);
}
