import { defineVoxelPart, createCharacterRecipe, assembleVoxelCharacter } from './voxelParts.js';
import { paintMainhand, paintOffhand } from './voxelEquipmentParts.js';
import { paintHumanTorso, paintHumanArms, paintHumanLegs, paintHumanOverlay } from './voxelHumanoidBody.js';

export const VOXEL_MATERIALS = {
  cloth: { roughness: 0.93, metalness: 0, envMapIntensity: 0.12 },
  leather: { roughness: 0.78, metalness: 0, envMapIntensity: 0.12 },
  skin: { roughness: 0.72, metalness: 0, envMapIntensity: 0.12 },
  steel: { roughness: 0.36, metalness: 0.72, envMapIntensity: 0.45 },
  gold: { roughness: 0.3, metalness: 0.78, envMapIntensity: 0.45 },
  feather: { roughness: 0.96, metalness: 0, envMapIntensity: 0.12 },
  bone: { roughness: 0.8, metalness: 0, envMapIntensity: 0.12 },
  fur: { roughness: 1, metalness: 0, envMapIntensity: 0.1 },
  stone: { roughness: 0.92, metalness: 0.05, envMapIntensity: 0.12 },
  flame: { roughness: 0.75, metalness: 0, emissive: '#fa4d0b', emissiveIntensity: 0.6, envMapIntensity: 0 },
  wood: { roughness: 0.9, metalness: 0, envMapIntensity: 0.1 },
  crystal: { roughness: 0.24, metalness: 0.3, emissive: '#31576a', emissiveIntensity: 0.25, envMapIntensity: 0.5 },
};
const PAINT = {
  teal: ['#087f82', 'cloth'], indigo: ['#293e67', 'cloth'], midnight: ['#20546c', 'cloth'],
  leather: ['#593326', 'leather'], belt: ['#743d31', 'leather'], ivory: ['#e7d7b4', 'cloth'],
  steel: ['#95b4c5', 'steel'], gunmetal: ['#475d73', 'steel'], silver: ['#d7e5ec', 'steel'],
  gold: ['#dfa743', 'gold'], skin: ['#d7946b', 'skin'], lips: ['#844c45', 'skin'],
  eyes: ['#22212c', 'skin'], burgundy: ['#75254e', 'feather'], magenta: ['#cf4b88', 'feather'],
  coral: ['#ffc38c', 'feather'], crimson: ['#a93640', 'cloth'], copper: ['#b97843', 'gold'],
  hair: ['#4f3028', 'leather'], olive: ['#526743', 'cloth'],
  slit: ['#16232c', 'steel'],
  bone: ['#e6d8af', 'bone'], shadowBone: ['#a59778', 'bone'],
  wood: ['#76503a', 'wood'], crystal: ['#68dcf0', 'crystal'],
  ruby: ['#e63b65', 'crystal'], sapphire: ['#367aff', 'crystal'],
  maple: ['#d6a365', 'wood'], fretboard: ['#352822', 'wood'],
  string: ['#d2be9a', 'cloth'], goblinSkin: ['#789944', 'skin'], ogreSkin: ['#94916a', 'skin'],
};

export const EMPTY_VOXEL_GEAR = Object.freeze({ shoulders:'none', hands:'none', feet:'none', waist:'none', neck:'none', ring1:'none', ring2:'none' });
export const DEFAULT_VOXEL_APPEARANCE = Object.freeze({ ...EMPTY_VOXEL_GEAR, head: 'knight', torso: 'steel', arms: 'plate', legs: 'armored', back: 'none', mainhand: 'sword', offhand: 'kite' });
const armorOptions = label => [{value:'none',label:`No ${label}`},{value:'cloth',label:`Cloth ${label}`},{value:'leather',label:`Leather ${label}`},{value:'steel',label:`Steel ${label}`}];
const jewelryOptions = label => [{value:'none',label:`No ${label}`},{value:'gold',label:`Gold ${label}`},{value:'ruby',label:`Ruby ${label}`},{value:'sapphire',label:`Sapphire ${label}`}];
export const VOXEL_APPEARANCE_OPTIONS = Object.freeze({
  head: [{ value: 'knight', label: 'Knight’s great helm' }, { value: 'plumed', label: 'Plumed great helm' }, { value: 'bare', label: 'Short hair' }, { value: 'bald', label: 'Shaven head' }, { value: 'hood', label: 'Deep hood' }, { value: 'wizardHat', label: 'Pointed wizard hat' }, { value: 'crown', label: 'Crowned head' }, { value: 'longHair', label: 'Long hair' }, { value: 'goblin', label: 'Goblin head' }, { value: 'ogre', label: 'Tusken ogre head' }, { value: 'skull', label: 'Skull' }],
  torso: [{ value: 'bare', label: 'Bare torso' }, { value: 'teal', label: 'Teal brigandine' }, { value: 'crimson', label: 'Crimson coat' }, { value: 'steel', label: 'Steel cuirass' }, { value: 'chain', label: 'Chainmail hauberk' }, { value: 'leather', label: 'Leather jerkin' }, { value: 'tunic', label: 'Cloth tunic' }, { value: 'robe', label: 'Robed torso' }, { value: 'ribs', label: 'Rib cage' }],
  arms: [{ value: 'plate', label: 'Plate sleeves' }, { value:'chain', label:'Chainmail sleeves' }, { value: 'leather', label: 'Leather sleeves' }, { value: 'sleeves', label: 'Cloth sleeves' }, { value: 'bare', label: 'Bare arms' }, { value: 'bones', label: 'Skeletal arms' }],
  legs: [{ value: 'armored', label: 'Plate leggings' }, { value: 'ranger', label: 'Ranger trousers' }, { value:'plain',label:'Plain trousers' }, { value: 'robe', label: 'Long robe' }, { value: 'skirt', label: 'Kilt' }, { value: 'bare', label: 'Shorts' }, { value: 'bones', label: 'Skeletal legs' }],
  shoulders: [{value:'none',label:'No shoulder armor'},{value:'cloth',label:'Woven mantle'},{value:'leather',label:'Leather spaulders'},{value:'steel',label:'Steel pauldrons'}],
  hands: armorOptions('gloves'),
  feet: armorOptions('boots'),
  waist: [{value:'none',label:'No belt'},{value:'leather',label:'Leather belt & pouch'},{value:'gold',label:'Golden girdle'}],
  neck: jewelryOptions('pendant'),
  ring1: jewelryOptions('main-hand ring'),
  ring2: jewelryOptions('off-hand ring'),
  back: [{ value: 'none', label: 'No back item' }, { value: 'cape', label: 'Cloth cape' }, { value: 'backpack', label: 'Leather backpack' }, { value: 'lute', label: 'Bard’s lute' }],
  mainhand: [{ value: 'sword', label: 'Longsword' }, { value: 'shortSword', label: 'Short sword' }, { value: 'dagger', label: 'Dagger' }, { value: 'axe', label: 'Battle axe' }, { value: 'mace', label: 'Spiked mace' }, { value: 'flail', label: 'Flail' }, { value: 'staff', label: 'Tall crystal staff' }, { value: 'spear', label: 'Long spear' }, { value: 'halberd', label: 'Halberd' }, { value: 'bow', label: 'Longbow' }, { value: 'club', label: 'Ogre club' }, { value: 'none', label: 'Empty hand' }],
  offhand: [{ value: 'kite', label: 'Kite shield' }, { value: 'round', label: 'Round shield' }, { value:'dagger',label:'Dagger' }, { value:'shortSword',label:'Short sword' }, { value: 'none', label: 'Empty hand' }],
});

// All parts are authored in the same unrestricted character coordinates.
function painter() {
  const cells = new Map();
  function put(x, y, z, surface) {
    if (![x, y, z].every(Number.isInteger)) throw new TypeError('Authored voxel coordinates must be integers');
    if (!PAINT[surface]) throw new RangeError(`Unknown voxel surface: ${surface}`);
    cells.set(`${x},${y},${z}`, { x, y, z, surface });
  }
  function shape(min, max, inside, surface) {
    for (let x = Math.ceil(min[0] - 0.5); x <= Math.floor(max[0] - 0.5); x++) {
      for (let y = Math.ceil(min[1] - 0.5); y <= Math.floor(max[1] - 0.5); y++) {
        for (let z = Math.ceil(min[2] - 0.5); z <= Math.floor(max[2] - 0.5); z++) {
          if (inside(x + 0.5, y + 0.5, z + 0.5)) put(x, y, z, surface);
        }
      }
    }
  }
  function oval(c, r, surface, filter = () => true) {
    shape(c.map((v, i) => v - r[i]), c.map((v, i) => v + r[i]), (x, y, z) =>
      ((x-c[0])/r[0])**2 + ((y-c[1])/r[1])**2 + ((z-c[2])/r[2])**2 <= 1 && filter(x, y, z), surface);
  }
  function box(min, max, surface) { shape(min, max, () => true, surface); }
  function limb(a, b, radius, surface) {
    const d = b.map((v, i) => v - a[i]);
    const squared = d.reduce((sum, v) => sum + v*v, 0);
    shape(a.map((v, i) => Math.min(v,b[i])-radius), a.map((v, i) => Math.max(v,b[i])+radius), (x,y,z) => {
      const p = [x-a[0], y-a[1], z-a[2]];
      const t = Math.max(0,Math.min(1,p.reduce((sum,v,i)=>sum+v*d[i],0)/squared));
      return p.reduce((sum,v,i)=>sum+(v-t*d[i])**2,0) <= radius*radius;
    }, surface);
  }
  return { cells, put, oval, box, limb };
}

function makeBodyPart(slot, style) {
  const p = painter();
  ({ torso: paintHumanTorso, arms: paintHumanArms, legs: paintHumanLegs })[slot](p, style);
  return p.cells;
}

function makeOverlay(slot,style) {
  const p = painter();
  paintHumanOverlay(p,slot,style);
  return p.cells;
}

function paintHumanHead(p, hair) {
  // The jaw settles into a short neck, with a round cranium behind the face.
  p.oval([12,17.7,12],[1.8,1.2,1.8],'skin');
  p.oval([12,21,12],[2.9,2.7,2.5],'skin');
  p.oval([12,19.2,12.5],[2.3,1.6,2.2],'skin');
  p.box([10,19,13],[14,22,15],'skin');
  for (const x of [9,14]) p.put(x,20,12,'skin');
  p.put(10,21,14,'eyes'); p.put(13,21,14,'eyes');
  p.put(11,20,15,'skin'); p.put(12,20,15,'skin');
  p.put(11,19,14,'lips'); p.put(12,19,14,'lips');
  if (hair) {
    p.oval([12,21.3,11.6],[3,2.5,2.7],'hair',(x,y,z)=>y>=22 || z<10.6);
    p.box([9,21,11],[10,23,14],'hair');
    p.box([14,21,11],[15,23,13],'hair');
    p.box([10,22,14],[12,23,15],'hair');
  }
}

function makeHead(style) {
  const p = painter();
  if (style === 'skull') {
    p.box([11,16,11],[13,18,13],'shadowBone');
    p.box([9,19,10],[15,23,14],'bone');
    p.box([10,18,10],[14,23,15],'bone');
    p.box([10,17,11],[14,19,14],'bone');
    for (const x of [10,13]) p.box([x,20,14],[x+1,22,15],'eyes');
    p.put(11,19,14,'eyes'); p.put(12,19,14,'eyes');
    p.put(11,18,14,'bone'); p.put(13,18,14,'bone');
    return p.cells;
  }
  if (style === 'goblin' || style === 'ogre') {
    const skin=style==='goblin'?'goblinSkin':'ogreSkin';
    p.box([10,16,10],[14,19,14],skin);
    p.box([9,18,10],[15,22,15],skin);
    p.box([10,22,10],[14,23,14],'hair');
    p.box([10,18,14],[14,20,16],skin);
    p.box([9,21,14],[15,22,15],'hair');
    p.put(10,20,14,'eyes'); p.put(13,20,14,'eyes');
    if (style==='goblin') {
      p.box([8,20,11],[9,22,13],skin); p.box([15,20,11],[16,22,13],skin);
      p.put(11,20,15,skin); p.put(12,20,15,skin);
    } else {
      p.box([8,19,10],[9,22,14],skin); p.box([15,19,10],[16,22,14],skin);
      p.box([10,18,15],[11,20,16],'bone'); p.box([13,18,15],[14,20,16],'bone');
    }
    return p.cells;
  }
  if (style === 'hood') {
    paintHumanHead(p, false);
    p.oval([12,20.5,11.5],[3.7,3.6,3.4],'teal',(x,y,z)=>z<13.5 || x<10 || x>14 || y>22);
    p.box([9,18,13],[10,23,15],'teal');
    p.box([14,18,13],[15,23,15],'teal');
    p.limb([10.5,18.5,12.5],[11.5,17.5,14.5],.8,'teal');
    p.limb([13.5,18.5,12.5],[12.5,17.5,14.5],.8,'teal');
    p.box([10,22,14],[14,23,15],'midnight');
    return p.cells;
  }
  if (['bare','bald','longHair','crown','wizardHat'].includes(style)) {
    paintHumanHead(p, style!=='bald');
    if (style==='longHair') {
      p.oval([12,19,10],[3,3.4,1.5],'hair');
      p.box([9,18,11],[10,22,14],'hair');
      p.box([14,17,11],[15,22,13],'hair');
    }
    if (style==='crown') {
      p.oval([12,22.2,12],[3.3,.8,3.2],'gold',(x,y,z)=>z<10.5||z>13.5||x<10||x>14);
      for (const x of [9,11,14]) p.box([x,23,13],[x+1,25,15],'gold');
      p.put(11,23,14,'crystal');
    }
    if (style==='wizardHat') {
      p.oval([12,22.5,12],[4.8,.8,3.6],'teal');
      p.oval([12,23.5,12],[3.1,1.4,2.6],'teal');
      p.oval([11.5,25,11.8],[2.4,1.8,2.1],'teal');
      p.oval([10.8,26.5,11.5],[1.7,1.5,1.5],'teal');
      p.box([9,27,11],[11,29,13],'teal');
      p.put(8,27,11,'teal');
      p.box([10,23,14],[14,24,15],'gold');
      p.put(12,23,15,'crystal');
    }
    return p.cells;
  }

  p.box([10,17,10],[14,18,14],'gunmetal');
  // Continuous chamfered steel shell, including temples, back and covered jaw.
  for (let y = 17; y <= 22; y++) {
    const inset = y === 17 || y === 22;
    for (let x = inset ? 10 : 9; x <= (inset ? 13 : 14); x++) {
      for (let z = inset ? 10 : 9; z <= 14; z++) {
        if (!inset && (x === 9 || x === 14) && (z === 9 || z === 14)) continue;
        p.put(x,y,z,y === 17 ? 'gunmetal' : 'steel');
      }
    }
  }
  p.box([10,21,14],[14,22,15],'silver');
  p.box([10,20,14],[14,21,15],'slit');
  p.box([11,21,14],[13,23,15],'silver');
  for (const x of [9,14]) p.put(x,19,12,'gold');
  if (style === 'plumed') {
    p.box([11,23,10],[13,25,13],'gold');
    const feather=painter();
    feather.limb([12,24,11.5],[12,28,10.5],1.5,'burgundy');
    feather.limb([12,28,10.5],[12,30,7],1.8,'burgundy');
    feather.limb([12,30,7],[12,29,3],1.8,'burgundy');
    feather.limb([12,29,3],[12,26,1],1.25,'burgundy');
    for (const {x,y,z} of feather.cells.values()) {
      const highlight=(y>=29&&z>=3)||(y>=27&&z>=10);
      p.put(x,y,z,highlight?(x===11?'coral':'magenta'):'burgundy');
    }
  }
  return p.cells;
}

function makeEquipment(part, style) {
  const p = painter();
  (part === 'mainhand' ? paintMainhand : paintOffhand)(p,style);
  return p.cells;
}

function makeBack(style) {
  const p = painter();
  if (style === 'cape') {
    p.oval([12,16,10],[4.5,1.8,1.6],'teal');
    for (let y=3;y<17;y++) {
      const width=y<7?5:y<13?4:3;
      const z=y<7?6:y<12?7:8;
      for (let x=12-width;x<12+width;x++) {
        const fold=(x===9||x===12||x===15)?1:0;
        p.put(x,y,z-fold,y===3?'gold':fold?'midnight':'teal');
        if (fold) p.put(x,y,z,'teal');
      }
    }
    for (const x of [8.5,15.5]) p.limb([x,16,10],[x,16.5,14],.75,'teal');
    p.put(8,16,14,'gold'); p.put(15,16,14,'gold');
  } else if (style === 'backpack') {
    p.oval([12,12,7],[4,3.7,2.5],'leather');
    p.box([9,10,5],[15,15,9],'leather');
    p.oval([12,14.5,6],[3.5,1.5,2],'belt');
    p.box([10,9,4],[14,12,6],'belt');
    for (const x of [9,14]) {
      p.limb([x+.5,14.5,7.5],[x+.5,17.5,11.5],.65,'belt');
      p.limb([x+.5,17.5,11.5],[x+.5,15.5,14.5],.65,'belt');
      p.limb([x+.5,15.5,14.5],[x+.5,11.5,14.5],.65,'belt');
      p.put(x,13,14,'gold');
    }
    p.box([11,12,4],[13,15,5],'belt'); p.put(11,12,3,'gold');
    p.limb([8.5,16,6.5],[15.5,16,6.5],1.3,'ivory');
    p.box([10,15,5],[11,17,8],'belt');
    p.box([13,15,5],[14,17,8],'belt');
  } else if (style === 'lute') {
    paintLute(p);
  }
  return p.cells;
}

function paintLute(p) {
  // The soundboard faces away from the wearer; the round bowl rests on the back.
  const bodyRows=[[5,9,11],[6,8,12],[7,7,13],[8,7,14],[9,7,14],[10,7,14],[11,8,14],[12,8,14],[13,9,13],[14,10,13],[15,11,13]];
  for (const [y,left,right] of bodyRows) {
    for (let x=left;x<=right;x++) {
      p.box([x,y,4],[x+1,y+1,7],'wood');
      p.put(x,y,3,x===left||x===right||y===5?'wood':'maple');
      if (x>left&&x<right) p.put(x,y,7,'wood');
    }
  }
  p.box([11,11,2],[13,13,3],'fretboard');
  p.box([9,7,2],[13,8,3],'fretboard');
  for (let y=8;y<26;y++) {
    const x=Math.round(10+(y-8)*.36);
    if (y>=15) {
      p.box([x-1,y,4],[x+2,y+1,7],'wood');
      p.box([x-1,y,3],[x+2,y+1,4],'fretboard');
      if ([17,20,23].includes(y)) p.box([x-1,y,2],[x+2,y+1,3],'gold');
    }
    p.put(x,y,2,'string');
    if (y<15) p.put(x+2,y,2,'string');
  }
  p.box([15,24,4],[18,27,7],'wood');
  for (const y of [24,26]) {
    p.box([14,y,5],[19,y+1,6],'gunmetal');
    p.put(14,y,5,'gold'); p.put(18,y,5,'gold');
  }
  p.limb([8.5,15.5,9.5],[15.5,17.5,9.5],.65,'leather');
  p.limb([8.5,15.5,9.5],[10.5,7.5,7.5],.85,'leather');
  p.limb([15.5,17.5,9.5],[15.5,17.5,13.5],.65,'leather');
  p.limb([15.5,17.5,13.5],[10.5,11.5,15.5],.65,'leather');
}

function voxelColor(cell) {
  const base = PAINT[cell.surface][0];
  const n = Math.sin(cell.x*127.1+cell.y*311.7+cell.z*74.7)*43758.5453;
  const variation = (n-Math.floor(n)-.5)*9;
  return '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(base.slice(i,i+2),16)+variation))).toString(16).padStart(2,'0')).join('');
}

export const VOXEL_PART_LIBRARY = new Map();
const partSurfaces = new Map();
const themedParts = new Map();
function registerPart(id, cells) {
  if (cells.size === 0) return null;
  const authored = [...cells.values()].sort((a,b)=>a.x-b.x || a.y-b.y || a.z-b.z);
  const voxels = authored.map(cell => ({
    x: cell.x-12, y: cell.y, z: cell.z-12,
    color: voxelColor(cell), material: PAINT[cell.surface][1],
  }));
  const part = defineVoxelPart({ id, name:id.replaceAll('/',' · '), voxels });
  VOXEL_PART_LIBRARY.set(id,part);
  partSurfaces.set(id,authored.map(cell=>cell.surface));
  return part;
}

export const VOXEL_PARTS = Object.freeze({
  torso: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.torso.map(({value})=>[value,registerPart(`torso/${value}`,makeBodyPart('torso',value))]))),
  legs: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.legs.map(({value})=>[value,registerPart(`legs/${value}`,makeBodyPart('legs',value))]))),
  arms: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.arms.map(({value})=>[value,registerPart(`arms/${value}`,makeBodyPart('arms',value))]))),
  head: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.head.map(({value})=>[value,registerPart(`head/${value}`,makeHead(value))]))),
  ...Object.fromEntries(Object.keys(EMPTY_VOXEL_GEAR).map(slot=>[
    slot,Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS[slot].map(({value})=>[value,registerPart(`${slot}/${value}`,makeOverlay(slot,value))]))),
  ])),
  back: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.back.map(({value})=>[value,registerPart(`back/${value}`,makeBack(value))]))),
  offhand: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.offhand.map(({value})=>[value,registerPart(`offhand/${value}`,makeEquipment('offhand',value))]))),
  mainhand: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.mainhand.map(({value})=>[value,registerPart(`mainhand/${value}`,makeEquipment('mainhand',value))]))),
});

// Themes recolor complete parts while preserving the authored shading and shape.
function themedPart(partId, colors) {
  const source=VOXEL_PART_LIBRARY.get(partId);
  const surfaces=partSurfaces.get(partId);
  const used=Object.fromEntries([...new Set(surfaces)].filter(surface=>colors[surface]!==undefined).sort().map(surface=>[surface,colors[surface]]));
  if(Object.keys(used).length===0) return source;
  for(const [surface,color] of Object.entries(used)) {
    if(!/^#[0-9a-f]{6}$/i.test(color)) throw new TypeError(`Invalid ${surface} color: ${color}`);
  }
  const key=`${partId}/${Object.entries(used).map(([surface,color])=>`${surface}-${color.slice(1)}`).join('_')}`;
  if(!themedParts.has(key)) {
    const voxels=source.voxels.map((voxel,index)=>{
      const surface=surfaces[index];
      if(!used[surface]) return voxel;
      const color='#'+[1,3,5].map(offset=>{
        const shade=parseInt(voxel.color.slice(offset,offset+2),16)-parseInt(PAINT[surface][0].slice(offset,offset+2),16);
        return Math.max(0,Math.min(255,parseInt(used[surface].slice(offset,offset+2),16)+shade)).toString(16).padStart(2,'0');
      }).join('');
      return {...voxel,color};
    });
    themedParts.set(key,defineVoxelPart({id:key,name:source.name,voxels}));
  }
  return themedParts.get(key);
}

export function assembleCharacterParts(appearance = DEFAULT_VOXEL_APPEARANCE, colors = {}) {
  const selected={...DEFAULT_VOXEL_APPEARANCE,...appearance};
  const references={};
  const parts=new Map();
  for(const slot of Object.keys(VOXEL_PARTS)) {
    if(!Object.hasOwn(VOXEL_PARTS[slot],selected[slot])) throw new RangeError(`Unknown ${slot} variant: ${selected[slot]}`);
    const source=VOXEL_PARTS[slot][selected[slot]];
    const part=source?themedPart(source.id,colors):null;
    if (part) parts.set(part.id,part);
    references[slot]=part?{partId:part.id}:null;
  }
  const recipe=createCharacterRecipe({id:[...Object.keys(VOXEL_PARTS).map(slot=>selected[slot]),selected.palette].filter(Boolean).join('-'),parts:references});
  return { appearance:selected, recipe, parts, assembly:assembleVoxelCharacter(recipe,parts) };
}
