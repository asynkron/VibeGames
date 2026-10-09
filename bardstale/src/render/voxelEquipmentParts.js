// Equipment owns the front outer columns, leaving each arm and gauntlet intact.
function handle(p, top, surface = 'leather') {
  p.box([5, 12, 17], [6, top + 1, 18], surface);
  p.put(5, 13, 16, 'leather');
  p.put(5, 11, 17, 'gold');
}

function flail(p) {
  handle(p, 20);
  p.put(5, 20, 17, 'gold');
  const chain = [[5, 21], [4, 22], [3, 22], [2, 21], [1, 20], [1, 19], [1, 18], [1, 17], [1, 16], [1, 15]];
  for (const [x, y] of chain) p.put(x, y, 17, y % 2 ? 'gunmetal' : 'silver');
  // Horizontal links keep the chain connected across its stepped arch.
  for (const [x, y] of [[5, 22], [3, 21], [2, 20]]) p.put(x, y, 17, 'gunmetal');
  p.oval([1.5, 12.5, 17.5], [1.6, 1.8, 1.5], 'gunmetal');
  p.box([1, 11, 18], [3, 14, 19], 'steel');
  for (const [x, y, z] of [[1, 10, 17], [1, 14, 17], [3, 12, 17], [1, 12, 19]]) p.put(x, y, z, 'silver');
}

function sword(p) {
  handle(p, 14);
  p.box([2, 15, 17], [8, 16, 18], 'gold');
  p.put(2, 14, 17, 'gold');
  p.put(7, 14, 17, 'gold');
  p.box([4, 16, 17], [7, 21, 19], 'steel');
  p.box([5, 16, 18], [6, 22, 19], 'silver');
  p.box([5, 21, 17], [6, 23, 19], 'silver');
  p.put(4, 20, 18, 'silver');
  p.put(6, 20, 18, 'silver');
}

function axe(p) {
  handle(p, 22);
  p.box([4, 19, 17], [7, 21, 19], 'gunmetal');
  p.box([2, 18, 17], [5, 22, 19], 'steel');
  p.box([1, 17, 17], [2, 23, 19], 'silver');
  p.put(2, 17, 18, 'silver');
  p.put(2, 22, 18, 'silver');
  p.put(7, 19, 17, 'silver');
  p.put(5, 18, 17, 'gold');
}

function mace(p) {
  handle(p, 18);
  p.put(5, 18, 17, 'gold');
  p.oval([5.5, 20.5, 17.5], [1.8, 1.8, 1.5], 'gunmetal');
  p.box([4, 19, 18], [7, 22, 19], 'steel');
  p.box([5, 19, 19], [6, 22, 20], 'silver');
  for (const [x, y, z] of [[3, 20, 17], [7, 20, 17], [5, 22, 17], [5, 23, 17], [5, 20, 20]]) p.put(x, y, z, 'silver');
}

function shortBlade(p, dagger) {
  handle(p,14);
  p.box([3,15,17],[8,16,18],'gold');
  p.box([5,16,17],[7,dagger?19:21,18],'steel');
  p.box([5,16,18],[6,dagger?20:22,19],'silver');
}

function staff(p) {
  p.box([5,8,17],[6,21,18],'wood');
  p.put(5,13,16,'wood');
  p.box([4,19,16],[7,20,19],'gold');
  p.oval([5.5,21.5,17.5],[1.6,2.3,1.6],'crystal');
  p.put(5,23,17,'silver');
}

function bow(p) {
  for (const [x,y] of [[5,8],[4,9],[3,10],[2,11],[2,12],[2,13],[2,14],[2,15],[2,16],[2,17],[3,18],[4,19],[5,20]]) {
    p.put(x,y,17,'wood');
    if(y>8&&y<20) p.put(Math.min(5,x+1),y,17,'wood');
  }
  p.box([5,9,17],[6,20,18],'string');
  p.box([2,13,16],[6,14,17],'leather');
  p.box([5,13,16],[7,15,17],'leather');
  p.box([1,14,18],[7,15,19],'wood');
  p.put(0,14,18,'silver');
}

function club(p) {
  handle(p,20,'wood');
  p.oval([5,20,18],[2.7,3.6,2],'wood');
  p.box([3,19,16],[7,20,20],'gunmetal');
  p.put(3,22,18,'bone'); p.put(6,21,20,'bone');
}

const weapons = { flail, sword, axe, mace, shortSword:p=>shortBlade(p,false), dagger:p=>shortBlade(p,true), staff, bow, club, none: () => {} };

export function paintWeapon(p, style) {
  if (!Object.hasOwn(weapons, style)) throw new RangeError(`Unknown weapon variant: ${style}`);
  weapons[style](p);
}

function shield(p, rows, surface, round) {
  const cells = new Set(rows.flatMap(([y, minX, maxX]) =>
    Array.from({ length: maxX - minX + 1 }, (_, i) => `${minX + i},${y}`)));
  for (const [y, minX, maxX] of rows) {
    for (let x = minX; x <= maxX; x++) {
      const edge = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
        .some(([nx, ny]) => !cells.has(`${nx},${ny}`));
      p.put(x, y, 17, 'gunmetal');
      p.put(x, y, 18, edge ? 'silver' : surface);
      if (!edge && (x === 19 || x === 20 || y === 13)) p.put(x, y, 18, 'gold');
    }
  }
  // A short back strap meets the complete gauntlet in the adjacent arm block.
  p.put(16, 11, 16, 'steel');
  p.put(17, 11, 16, 'leather');
  p.put(18, 11, 16, 'leather');
  if (round) p.box([19, 11, 19], [21, 13, 20], 'steel');
}

const shields = {
  none: () => {},
  kite: p => shield(p, [[15, 18, 21], [14, 17, 22], [13, 17, 22], [12, 17, 22], [11, 18, 21], [10, 18, 21], [9, 19, 20], [8, 19, 20]], 'crimson', false),
  round: p => shield(p, [[15, 18, 21], [14, 17, 22], [13, 16, 23], [12, 16, 23], [11, 16, 23], [10, 17, 22], [9, 18, 21]], 'teal', true),
};

export function paintShield(p, style) {
  if (!Object.hasOwn(shields, style)) throw new RangeError(`Unknown shield variant: ${style}`);
  shields[style](p);
}
