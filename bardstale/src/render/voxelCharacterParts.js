import { defineVoxelPart, createCharacterRecipe, assembleVoxelCharacter } from './voxelParts.js';
import { paintMainhand, paintOffhand } from './voxelEquipmentParts.js';

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
  string: ['#d2be9a', 'cloth'], goblinSkin: ['#789944', 'skin'], ogreSkin: ['#94916a', 'skin'],
};

export const DEFAULT_VOXEL_APPEARANCE = Object.freeze({ head: 'knight', torso: 'steel', arms: 'plate', legs: 'armored', back: 'none', mainhand: 'sword', offhand: 'kite' });
export const VOXEL_APPEARANCE_OPTIONS = Object.freeze({
  head: [{ value: 'knight', label: 'Knight’s great helm' }, { value: 'plumed', label: 'Plumed great helm' }, { value: 'bare', label: 'Short hair' }, { value: 'bald', label: 'Shaven head' }, { value: 'hood', label: 'Deep hood' }, { value: 'wizardHat', label: 'Pointed wizard hat' }, { value: 'crown', label: 'Crowned head' }, { value: 'longHair', label: 'Long hair' }, { value: 'goblin', label: 'Goblin head' }, { value: 'ogre', label: 'Tusken ogre head' }, { value: 'skull', label: 'Skull' }],
  torso: [{ value: 'teal', label: 'Teal brigandine' }, { value: 'crimson', label: 'Crimson coat' }, { value: 'steel', label: 'Steel cuirass' }, { value: 'chain', label: 'Chainmail hauberk' }, { value: 'leather', label: 'Leather jerkin' }, { value: 'tunic', label: 'Cloth tunic' }, { value: 'robe', label: 'Robed torso' }, { value: 'ribs', label: 'Rib cage' }],
  arms: [{ value: 'plate', label: 'Plate arms & gauntlets' }, { value: 'leather', label: 'Leather sleeves & gloves' }, { value: 'sleeves', label: 'Cloth sleeves' }, { value: 'bare', label: 'Bare arms' }, { value: 'bones', label: 'Skeletal arms' }],
  legs: [{ value: 'armored', label: 'Armored boots' }, { value: 'ranger', label: 'Ranger leathers' }, { value: 'robe', label: 'Long robe' }, { value: 'skirt', label: 'Kilt & boots' }, { value: 'bare', label: 'Bare feet' }, { value: 'bones', label: 'Skeletal legs' }],
  back: [{ value: 'none', label: 'No back item' }, { value: 'cape', label: 'Cloth cape' }, { value: 'backpack', label: 'Leather backpack' }],
  mainhand: [{ value: 'sword', label: 'Longsword' }, { value: 'shortSword', label: 'Short sword' }, { value: 'dagger', label: 'Dagger' }, { value: 'axe', label: 'Battle axe' }, { value: 'mace', label: 'Spiked mace' }, { value: 'flail', label: 'Flail' }, { value: 'staff', label: 'Crystal staff' }, { value: 'bow', label: 'Longbow' }, { value: 'club', label: 'Ogre club' }, { value: 'none', label: 'Empty hand' }],
  offhand: [{ value: 'kite', label: 'Kite shield' }, { value: 'round', label: 'Round shield' }, { value: 'none', label: 'Empty hand' }],
});

// Optional horizontal cuts shape waist seams and hemlines in the authored figures.
// The resulting parts have unrestricted coordinates and dimensions.
function painter(minY = -Infinity, maxY = Infinity) {
  const cells = new Map();
  function put(x, y, z, surface) {
    if (![x, y, z].every(Number.isInteger)) throw new TypeError('Authored voxel coordinates must be integers');
    if (!PAINT[surface]) throw new RangeError(`Unknown voxel surface: ${surface}`);
    cells.set(`${x},${y},${z}`, { x, y, z, surface });
  }
  function shape(min, max, inside, surface) {
    for (let x = Math.ceil(min[0] - 0.5); x <= Math.floor(max[0] - 0.5); x++) {
      for (let y = Math.max(minY, Math.ceil(min[1] - 0.5)); y <= Math.min(maxY, Math.floor(max[1] - 0.5)); y++) {
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

function makeLegs(style) {
  const p = painter(0, 7);
  if (style === 'bones') {
    p.box([10,7,11],[14,8,13],'bone');
    p.limb([10.5,7.5,11.5],[9.5,4.5,13.5],.65,'bone');
    p.limb([13.5,7.5,11.5],[14.5,4.5,9.5],.65,'bone');
    p.limb([9.5,4.5,13.5],[9.5,.5,13.5],.65,'bone');
    p.limb([14.5,4.5,9.5],[14.5,.5,9.5],.65,'bone');
    p.box([9,0,13],[11,1,16],'bone'); p.box([13,0,9],[15,1,12],'bone');
    return p.cells;
  }
  if (style === 'robe') {
    for (let y=1;y<8;y++) {
      const width=y<4?4:3;
      p.box([12-width,y,10],[12+width,y+1,14],'teal');
      p.box([11,y,14],[13,y+1,15],'ivory');
    }
    p.box([8,0,11],[11,1,15],'leather'); p.box([13,0,11],[16,1,15],'leather');
    p.box([8,1,10],[16,2,14],'gold');
    return p.cells;
  }
  const trousers = style === 'ranger' ? 'olive' : 'indigo';
  const shin = style === 'bare' || style === 'skirt' ? 'skin' : style === 'ranger' ? 'leather' : 'gunmetal';
  p.limb([10.5,7.5,11.5],[9.5,4.5,13.5],1.3,trousers);
  p.limb([12.5,7.5,11.5],[14.5,4.5,9.5],1.3,trousers);
  p.limb([9.5,4.5,13.5],[9.5,1.5,13.5],1.05,shin);
  p.limb([14.5,4.5,9.5],[14.5,1.5,9.5],1.05,shin);
  if (style === 'armored' || style === 'ranger') {
    p.oval([9.5,4.5,13.5],[1.3,.85,1.25],style === 'ranger' ? 'belt' : 'steel');
    p.oval([14.5,4.5,9.5],[1.3,.85,1.25],style === 'ranger' ? 'belt' : 'steel');
  }
  p.box([8.5,0,12.5],[10.5,1.8,15.5],style === 'bare' ? 'skin' : 'leather');
  p.box([13.5,0,8.5],[15.5,1.8,11.5],style === 'bare' ? 'skin' : 'leather');
  if (style === 'skirt') {
    p.box([8,5,10],[16,8,14],'teal');
    p.box([9,4,13],[15,7,15],'teal');
    p.box([11,4,14],[12,7,15],'gold');
  }
  return p.cells;
}

function makeTorso(style) {
  const p = painter(8, 15);
  if (style === 'ribs') {
    p.box([11,8,11],[13,16,12],'shadowBone');
    p.box([10,8,11],[14,10,14],'bone');
    for (const y of [11,13,15]) {
      p.box([9,y,11],[15,y+1,12],'bone');
      p.box([9,y,12],[10,y+1,14],'bone'); p.box([14,y,12],[15,y+1,14],'bone');
      p.box([10,y,14],[14,y+1,15],'bone');
    }
    p.box([11,11,14],[13,16,15],'bone');
    p.box([8,14,11],[16,15,13],'bone');
    return p.cells;
  }
  const coat = { teal:'teal', crimson:'crimson', steel:'steel', chain:'gunmetal', leather:'leather', tunic:'teal', robe:'teal' }[style];
  p.oval([12,8.6,12],[2.8,1.5,2],'indigo');
  p.oval([12,12,12],[3.8,3.7,2.4],coat);
  p.box([8,13,11],[16,15,13],coat);
  for (const cell of p.cells.values()) {
    if (style === 'chain' && (cell.x+cell.y+cell.z)%2 === 0) cell.surface='steel';
    if (['teal','crimson','leather','tunic'].includes(style) && cell.y >= 10 && cell.z >= 13 && Math.abs(cell.x-11.5+(cell.y-12)*.65)<.6) cell.surface=style==='leather'?'belt':'ivory';
    if (cell.y === 9) cell.surface='belt';
  }
  if (style === 'robe') {
    p.box([9,8,10],[15,12,14],coat);
    p.box([11,10,14],[13,15,15],'ivory');
    p.put(11,14,15,'crystal'); p.put(12,14,15,'gold');
  }
  if (style === 'steel') {
    p.box([10,11,14],[14,14,15],'steel');
    p.box([11,11,14],[13,14,15],'silver');
  }
  p.box([11,9,14],[13,10,15],'gold');
  p.box([10,15,10],[14,16,14],style==='steel'||style==='chain'?'gunmetal':coat);
  return p.cells;
}

function makeArms(style) {
  const p = painter(8, 15);
  const armored = style === 'plate';
  const sleeve = {plate:'gunmetal',leather:'midnight',sleeves:'teal',bare:'skin',bones:'bone'}[style];
  const forearm = {plate:'steel',leather:'leather',sleeves:'teal',bare:'skin',bones:'bone'}[style];
  const radius=style==='bones'?.65:1.05;
  p.limb([6.5,14.5,12.5],[4.5,11.5,12.5],radius,sleeve);
  p.limb([4.5,11.5,12.5],[5.5,13.5,14.5],radius,forearm);
  p.limb([17.5,14.5,12.5],[19.5,11.5,12.5],radius,sleeve);
  p.limb([19.5,11.5,12.5],[17.5,10.5,14.5],radius,forearm);
  for (const x of [6,16]) {
    if (style==='bones') p.box([x,14,12],[x+2,15,13],'bone');
    else {
      p.box([x,13,11],[x+2,16,14],forearm);
      if (armored || style==='leather') p.box([x,15,11],[x+2,16,14],armored ? 'silver' : 'belt');
    }
  }
  // Each complete hand includes its fingers; equipment attaches in front.
  const hand=style==='sleeves'?'skin':forearm;
  p.box([5,13,14],[7,15,16],hand);
  p.box([16,10,14],[18,12,16],hand);
  return p.cells;
}

function makeHead(style) {
  const p = painter(16, 23);
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
    p.box([10,16,10],[14,19,14],'teal');
    p.box([9,18,9],[15,22,14],'teal');
    p.box([10,22,10],[14,24,14],'teal');
    p.box([10,18,14],[14,22,15],'skin');
    p.box([9,17,14],[10,22,15],'teal'); p.box([14,17,14],[15,22,15],'teal');
    p.box([10,21,14],[14,23,15],'teal');
    p.put(10,20,14,'eyes'); p.put(13,20,14,'eyes');
    p.box([11,17,14],[13,18,15],'ivory');
    return p.cells;
  }
  if (['bare','bald','longHair','crown','wizardHat'].includes(style)) {
    p.box([11,16,11],[13,18,13],'skin');
    p.box([10,18,10],[14,22,15],'skin');
    p.box([9,19,11],[15,21,14],'skin');
    p.box([10,22,10],[14,23,14],style==='bald'?'skin':'hair');
    if (style!=='bald') {
      p.box([9,21,10],[15,22,14],'hair');
      p.box([9,19,9],[15,21,11],'hair');
    }
    if (style==='longHair') {
      p.box([9,16,9],[15,21,11],'hair');
      p.box([9,17,11],[10,22,14],'hair'); p.box([14,17,11],[15,22,14],'hair');
    }
    p.put(10,20,14,'eyes'); p.put(13,20,14,'eyes');
    p.put(11,19,15,'skin'); p.put(12,19,15,'skin');
    p.put(11,18,14,'lips'); p.put(12,18,14,'lips');
    if (style==='crown') {
      p.box([9,21,10],[15,22,15],'gold');
      for (const x of [9,11,14]) p.box([x,22,13],[x+1,24,15],'gold');
      p.put(11,22,14,'crystal');
    }
    if (style==='wizardHat') {
      p.box([8,21,9],[16,22,15],'teal');
      p.box([10,22,10],[14,23,14],'teal');
      p.box([11,23,11],[13,24,13],'teal');
      p.box([10,22,14],[14,23,15],'gold');
      p.box([11,17,14],[13,19,15],'ivory');
    }
    return p.cells;
  }

  p.box([11,16,11],[13,18,13],'gunmetal');
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
    p.box([11,22,10],[13,23,13],'burgundy');
    p.box([11,23,9],[13,24,13],'crimson');
    p.box([11,23,9],[13,24,10],'magenta');
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
    p.box([8,14,8],[16,16,10],'teal');
    for (let y=3;y<15;y++) {
      const width=y<8?6:5;
      const z=y<7?6:y<12?7:8;
      p.box([12-width,y,z],[12+width,y+1,z+1],'teal');
      for (const x of [9,12,15]) p.put(x,y,z-1,'midnight');
      if (y===3) p.box([12-width,y,z],[12+width,y+1,z+1],'gold');
    }
  } else if (style === 'backpack') {
    p.box([8,9,5],[16,15,9],'leather');
    p.box([9,15,6],[15,16,9],'belt');
    p.box([9,9,4],[15,12,5],'belt');
    for (const x of [9,14]) {
      p.box([x,10,4],[x+1,15,6],'belt');
      p.put(x,12,4,'gold');
    }
    p.box([9,16,6],[15,18,8],'ivory');
    p.box([10,16,6],[11,18,8],'belt');
    p.box([13,16,6],[14,18,8],'belt');
  }
  return p.cells;
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
  torso: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.torso.map(({value})=>[value,registerPart(`torso/${value}`,makeTorso(value))]))),
  legs: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.legs.map(({value})=>[value,registerPart(`legs/${value}`,makeLegs(value))]))),
  arms: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.arms.map(({value})=>[value,registerPart(`arms/${value}`,makeArms(value))]))),
  head: Object.freeze(Object.fromEntries(VOXEL_APPEARANCE_OPTIONS.head.map(({value})=>[value,registerPart(`head/${value}`,makeHead(value))]))),
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
