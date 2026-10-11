import { footprintForKind } from '../combatFootprints.js';
import { ITEM_DB, EQUIPMENT_SLOTS } from '../items.js';
import { assembleCharacterParts, VOXEL_APPEARANCE_OPTIONS, EMPTY_VOXEL_GEAR } from './voxelCharacterParts.js';
import { assembleCreatureVoxelModel } from './voxelCreatureParts.js';

// Themes supply unrestricted RGB paint to shared geometric assets.
const THEMES = Object.freeze({
  azure: { teal:'#456b88', crimson:'#456b88', midnight:'#354751', indigo:'#414961', ivory:'#ded2b6', skin:'#bf8d73', hair:'#49392f', crystal:'#8dcbd3' },
  steel: { teal:'#ded5bf', crimson:'#ded5bf', midnight:'#626979', indigo:'#465d72', ivory:'#60839b', skin:'#c8a083', hair:'#c3bbaa', crystal:'#a6d6dc' },
  forest: { teal:'#586e51', crimson:'#586e51', midnight:'#3c5148', indigo:'#697259', ivory:'#c5bea0', skin:'#b48365', hair:'#69462e', crystal:'#a6b97e' },
  ochre: { teal:'#b1844f', crimson:'#b1844f', midnight:'#795d41', indigo:'#68503f', ivory:'#dec59c', skin:'#c39676', hair:'#6d4434', crystal:'#d4b577' },
  violet: { teal:'#786180', crimson:'#786180', midnight:'#4b455b', indigo:'#584c66', ivory:'#c8b7c6', skin:'#b99b88', hair:'#b5aaa0', crystal:'#bfa8d7' },
  crimson: { teal:'#994852', crimson:'#994852', midnight:'#5f3946', indigo:'#4e4352', ivory:'#d6ba90', skin:'#ad816e', hair:'#382f30', crystal:'#d79582' },
  bone: { teal:'#414c5b', crimson:'#414c5b', midnight:'#333d49', indigo:'#4d4b58', ivory:'#ad9e7d', crystal:'#94c6aa', gold:'#b4a277' },
  goblin: { teal:'#987d4f', crimson:'#987d4f', midnight:'#60684f', indigo:'#706b50', ivory:'#c0b58d', skin:'#8b9b62', hair:'#424736', crystal:'#b6bc87' },
  ogre: { teal:'#827958', crimson:'#827958', midnight:'#685942', indigo:'#746349', ivory:'#b5a080', skin:'#9b997b', hair:'#484335' },
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
