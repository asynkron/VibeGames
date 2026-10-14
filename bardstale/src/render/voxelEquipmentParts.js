// All weapons meet the mainhand at (5.5, 14, 15.5); the front is positive Z.
function haft(p, bottom, top, surface = 'wood') {
  p.box([5,bottom,16],[6,top,17],surface);
  p.box([5,12,16],[6,16,17],'leather');
  p.put(5,13,15,'leather');
  p.oval([5.5,bottom+.5,16.5],[1.15,1.1,1.15],surface==='wood'?'wood':'gold');
}

function hilt(p, guardWidth, bottom) {
  haft(p,bottom,16,'leather');
  p.oval([5.5,bottom+.5,16.5],[1.2,1.2,1.2],'gold');
  p.put(5,bottom,17,'crystal');
  for (const y of [12,15]) p.put(5,y,17,'gold');
  p.limb([5.5-guardWidth,15.5,16.5],[5.5,16.5,16.5],.7,'gold');
  p.limb([5.5,16.5,16.5],[5.5+guardWidth,15.5,16.5],.7,'gold');
}

function blade(p, tip, guardWidth, bottom) {
  hilt(p,guardWidth,bottom);
  for (let y=17;y<=tip;y++) {
    const halfWidth=y>=tip-1?0:1;
    for (let x=5-halfWidth;x<=5+halfWidth;x++) {
      p.put(x,y,16,x===5?'steel':'silver');
      if (x===5 && y<tip) p.put(x,y,17,'silver');
    }
  }
}

function sword(p) { blade(p,33,3.2,10); }
function shortBlade(p, dagger) { blade(p,dagger?21:27,dagger?1.8:2.4,dagger?12:11); }

function spikedHead(p, center, radius) {
  p.oval(center,[radius,radius,radius],'gunmetal');
  for (const cell of p.cells.values()) {
    const distance=(cell.x+.5-center[0])**2+(cell.y+.5-center[1])**2+(cell.z+.5-center[2])**2;
    if (cell.surface==='gunmetal' && distance<=radius*radius && (cell.x+cell.y+cell.z)%3===0) cell.surface='steel';
  }
  for (const [axis,sign] of [[0,-1],[0,1],[1,-1],[1,1],[2,-1],[2,1]]) {
    const root=[...center]; root[axis]+=sign*(radius-.5);
    const tip=[...center]; tip[axis]+=sign*(radius+1.5);
    p.limb(root,tip,.65,'steel');
    p.put(...tip.map(value=>Math.floor(value)),'silver');
  }
}

function flail(p) {
  haft(p,7,26);
  p.put(5,25,16,'gold');
  // Each link is an open ring. The space under the arch is genuinely empty.
  const links=[[5,26],[3,28],[0,28],[-3,26],[-5,23],[-5,20],[-5,17]];
  for (const [index,[cx,cy]] of links.entries()) {
    for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) {
      if (dx===0 && dy===0) continue;
      p.put(cx+dx,cy+dy,16,dy===1||index%2===0?'silver':'gunmetal');
    }
  }
  spikedHead(p,[-5.5,12.5,16.5],2.25);
}

function axe(p) {
  haft(p,6,29);
  p.box([4,23,15],[7,28,18],'gunmetal');
  const rows=[[21,1],[22,-1],[23,-2],[24,-3],[25,-3],[26,-3],[27,-2],[28,0],[29,2]];
  for (const [y,left] of rows) {
    for (let x=left;x<5;x++) {
      p.put(x,y,16,x<=left+1?'silver':'steel');
      if (x>left+1) p.put(x,y,17,'steel');
      if (x>=3) p.put(x,y,15,'gunmetal');
    }
  }
  p.box([7,24,16],[9,27,18],'steel');
  p.box([4,22,16],[7,23,17],'gold');
}

function mace(p) {
  haft(p,8,25,'gunmetal');
  p.box([4,21,16],[7,22,17],'gold');
  spikedHead(p,[5.5,25.5,16.5],2.15);
}

function staff(p) {
  p.box([5,2,17],[6,30,18],'wood');
  p.put(5,13,16,'wood');
  p.box([5,12,17],[6,17,18],'leather');
  for (const y of [2,17,27]) p.box([4,y,16],[7,y+1,19],'gold');
  p.oval([5.5,31.5,17.5],[2.1,3.8,2.1],'crystal');
  p.box([3,28,16],[4,32,19],'gold');
  p.box([7,28,16],[8,32,19],'gold');
  p.box([4,27,16],[7,29,19],'gold');
  p.put(5,35,17,'silver');
}

function poleShaft(p) {
  p.box([5,1,17],[6,33,18],'wood');
  p.box([5,12,17],[6,16,18],'leather');
  p.put(5,13,16,'leather');
  for (const y of [1,16,27]) p.box([5,y,17],[6,y+1,18],'gold');
}

function spear(p) {
  poleShaft(p);
  p.box([4,29,17],[7,32,19],'gunmetal');
  // A long leaf blade narrows to a single bright point above the shaft.
  for (let y=31;y<40;y++) {
    const width=y<33?1:y<36?2:y<38?1:0;
    p.box([5-width,y,17],[6+width,y+1,19],'steel');
    p.put(5-width,y,18,'silver');
    p.put(5+width,y,18,'silver');
    p.put(5,y,19,'silver');
  }
}

function halberd(p) {
  poleShaft(p);
  p.box([4,28,17],[7,34,19],'gunmetal');
  const bladeRows=[[26,3],[27,1],[28,-1],[29,-2],[30,-2],[31,-1],[32,1],[33,3]];
  for (const [y,left] of bladeRows) {
    p.box([left,y,17],[5,y+1,19],'steel');
    p.put(left,y,18,'silver');
    p.put(left+1,y,18,'silver');
  }
  p.box([7,31,17],[10,33,19],'steel');
  p.put(9,30,18,'silver');
  p.put(10,29,18,'silver');
  p.put(10,30,18,'silver');
  p.box([5,33,17],[7,37,19],'steel');
  p.box([5,34,18],[6,40,19],'silver');
  p.box([4,28,18],[7,29,19],'gold');
}

function bow(p) {
  const curve=[[9.5,1.5,16.5],[8.5,3.5,16.5],[6.5,7.5,16.5],[5.5,12.5,16.5],[5.5,16.5,16.5],[6.5,21.5,16.5],[8.5,25.5,16.5],[9.5,27.5,16.5]];
  for (let i=1;i<curve.length;i++) p.limb(curve[i-1],curve[i],.75,'wood');
  p.limb(curve[0],curve.at(-1),.51,'string');
  p.put(9,1,16,'bone'); p.put(9,27,16,'bone');
  p.box([5,12,16],[6,16,17],'leather');
  p.put(5,13,15,'leather');
  p.box([-3,14,17],[10,15,18],'wood');
  p.box([-4,13,17],[-2,16,18],'steel');
  p.put(-5,14,17,'silver');
  for (const y of [13,15]) p.box([7,y,17],[10,y+1,18],'ivory');
}

function club(p) {
  haft(p,7,25);
  p.oval([6,23.5,16.5],[2.4,5.2,2.2],'wood');
  p.oval([7.5,27.5,16.5],[1.4,1.8,1.5],'wood');
  for (const cell of p.cells.values()) {
    if (cell.y===22) cell.surface='gunmetal';
    else if (cell.y>19 && cell.x===6 && cell.z===18) cell.surface='fretboard';
  }
  p.box([8,24,16],[10,25,17],'steel');
  p.box([6,25,18],[7,26,20],'steel');
  p.put(9,24,16,'silver'); p.put(6,25,19,'silver');
}

const weapons = { flail, sword, axe, mace, shortSword:p=>shortBlade(p,false), dagger:p=>shortBlade(p,true), staff, spear, halberd, bow, club, none: () => {} };

export function paintMainhand(p, style) {
  if (!Object.hasOwn(weapons, style)) throw new RangeError(`Unknown weapon variant: ${style}`);
  weapons[style](p);
}

function shield(p, rows, surface, round) {
  const cells = new Set(rows.flatMap(([y, minX, maxX]) =>
    Array.from({ length: maxX - minX + 1 }, (_, i) => `${minX + i},${y}`)));
  const frontAt=(x,y)=>18+Math.round(2*Math.max(0,1-((x-20)/6)**2-(round?((y-12)/6)**2:0)));
  for (const [y, minX, maxX] of rows) {
    for (let x = minX; x <= maxX; x++) {
      const edge = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
        .some(([nx, ny]) => !cells.has(`${nx},${ny}`));
      const front=frontAt(x,y);
      p.put(x,y,front-1,'wood');
      p.put(x,y,front,edge?'silver':surface);
      if (!round && !edge && (x===20 || y===14)) p.put(x,y,front,'gold');
      if (round && !edge && x%3===0) p.put(x,y,front,'wood');
    }
  }
  p.oval([20.5,round?12.5:14.5,21],[round?1.8:1.2,round?1.8:1.2,1.4],'steel');
  p.put(20,round?12:14,22,'silver');
  if (round) for (const [x,y] of [[16,12],[24,12],[20,8],[20,16]]) p.put(x,y,frontAt(x,y)+1,'gold');
  // A raised rear handle meets the existing hand and joins the domed shell.
  p.box([17,10,16],[18,13,18],'leather');
  p.box([17,11,17],[21,12,18],'wood');
  p.box([20,10,17],[21,15,20],'leather');
}

const roundShieldRows=[];
for (let y=6;y<=18;y++) {
  const halfWidth=Math.floor(Math.sqrt(6.2**2-(y-12)**2));
  roundShieldRows.push([y,20-halfWidth,20+halfWidth]);
}
const kiteShieldRows=[0,1,1,2,2,3,3,4,4,5,5,5,5,5,4,3,2].map((width,index)=>[index+3,20-width,20+width]);

const shields = {
  none: () => {},
  kite: p => shield(p,kiteShieldRows,'crimson',false),
  round: p => shield(p,roundShieldRows,'teal',true),
};

export function paintOffhand(p, style) {
  if (['dagger','shortSword','sword','axe','mace','flail'].includes(style)) {
    // Reflect complete geometry into the other hand, which grips three rows lower.
    // Painting through a temporary cell map keeps the weapon's shading and details.
    const start=new Set(p.cells.keys());
    paintMainhand(p,style);
    const weapon=[...p.cells.entries()].filter(([key])=>!start.has(key));
    for(const [key] of weapon) p.cells.delete(key);
    for(const [,cell] of weapon) p.put(22-cell.x,cell.y-3,cell.z,cell.surface);
    return;
  }
  if (!Object.hasOwn(shields, style)) throw new RangeError(`Unknown shield variant: ${style}`);
  shields[style](p);
}
