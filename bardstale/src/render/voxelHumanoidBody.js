// One posed human is sculpted first, then assigned to anatomical part owners.
// Garments follow this frame; part boundaries are joints rather than grid planes.
const FRAME = Object.freeze({
  arms: [
    { shoulder: [7.8,16,12], elbow: [5.7,12.8,12.5], wrist: [5.5,13.7,14.7], hand: [5.5,14,15.5] },
    { shoulder: [16.2,16,12], elbow: [18.3,12.6,12.5], wrist: [17.7,11.5,14.7], hand: [17.5,11.5,15.5] },
  ],
  legs: [
    { hip: [10,10,12.5], knee: [9.5,5.7,13], ankle: [9.5,1.8,13], foot: [9.5,.9,14] },
    { hip: [14,10,11.5], knee: [14.5,5.7,11.5], ankle: [14.5,1.8,11.5], foot: [14.5,.9,12.5] },
  ],
});

function sculptHuman() {
  const cells = new Map();
  function sample(min, max, inside, owner, region) {
    for (let x=Math.ceil(min[0]-.5);x<=Math.floor(max[0]-.5);x++) {
      for (let y=Math.max(0,Math.ceil(min[1]-.5));y<=Math.floor(max[1]-.5);y++) {
        for (let z=Math.ceil(min[2]-.5);z<=Math.floor(max[2]-.5);z++) {
          if (inside(x+.5,y+.5,z+.5)) cells.set(`${x},${y},${z}`,{x,y,z,owner,region});
        }
      }
    }
  }
  function oval(c,r,owner,region) {
    sample(c.map((v,i)=>v-r[i]),c.map((v,i)=>v+r[i]),(x,y,z)=>
      ((x-c[0])/r[0])**2+((y-c[1])/r[1])**2+((z-c[2])/r[2])**2<=1,owner,region);
  }
  function limb(a,b,ra,rb,owner,region) {
    const d=b.map((v,i)=>v-a[i]), lengthSquared=d.reduce((sum,v)=>sum+v*v,0),radius=Math.max(ra,rb);
    sample(a.map((v,i)=>Math.min(v,b[i])-radius),a.map((v,i)=>Math.max(v,b[i])+radius),(x,y,z)=>{
      const q=[x-a[0],y-a[1],z-a[2]];
      const t=Math.max(0,Math.min(1,q.reduce((sum,v,i)=>sum+v*d[i],0)/lengthSquared));
      const r=ra+(rb-ra)*t;
      return q.reduce((sum,v,i)=>sum+(v-t*d[i])**2,0)<=r*r;
    },owner,region);
  }

  // A joined pelvis and two weight-bearing legs, with a small stagger in depth.
  oval([12,10.2,12],[3.3,1.8,2.2],'legs','pelvis');
  for (const leg of FRAME.legs) {
    limb(leg.hip,leg.knee,1.8,1.3,'legs','thigh');
    oval(leg.knee,[1.35,1.15,1.3],'legs','knee');
    limb(leg.knee,leg.ankle,1.2,.95,'legs','shin');
    oval([leg.ankle[0],3.8,leg.ankle[2]-.2],[1.35,1.65,1.2],'legs','calf');
    const ankle=[leg.ankle[0]+(leg.ankle[0]<12?.25:-.25),leg.ankle[1],leg.ankle[2]];
    oval(ankle,[1.3,1.6,1.4],'legs','ankle');
    oval(leg.foot,[1.5,1.1,2.15],'legs','foot');
  }

  // Cross sections form a waist, rib cage, chest, and sloping trapezius muscles.
  const sections=[[10,2.65,1.9],[11,2.7,2],[12,3,2.15],[13,3.5,2.35],
    [14,3.85,2.4],[15,4.05,2.3],[16,3.65,2.05],[17,2.5,1.7]];
  for (const [y,width,depth] of sections) {
    sample([12-width,y,12-depth],[12+width,y+1,12+depth],(x,_y,z)=>
      ((x-12)/width)**2+((z-12)/depth)**2<=1,'torso',y<12?'waist':y===17?'traps':'chest');
  }

  // Deltoids flow into upper arms. Each forearm bends toward its own grip.
  for (const arm of FRAME.arms) {
    oval(arm.shoulder,[1.7,1.4,1.65],'arms','shoulder');
    limb(arm.shoulder,arm.elbow,1.4,1.2,'arms','upperArm');
    oval(arm.elbow,[1.3,.95,1.3],'arms','elbow');
    limb(arm.elbow,arm.wrist,1.25,.95,'arms','forearm');
    oval(arm.wrist,[1.05,1.05,1.15],'arms','wrist');
    const handMin=[Math.floor(arm.hand[0])-1,Math.floor(arm.hand[1]-.75),14];
    sample(handMin,[handMin[0]+3,handMin[1]+2,17],()=>true,'arms','hand');
  }
  return [...cells.values()];
}

const HUMAN_BODY = sculptHuman();

function paintBodyPart(p,owner,surfaceFor) {
  for (const cell of HUMAN_BODY) {
    if (cell.owner===owner) p.put(cell.x,cell.y,cell.z,surfaceFor(cell));
  }
}

function frontSurface(cell,depth=13) { return cell.z>=depth; }

export function paintHumanTorso(p,style) {
  if (style==='ribs') {
    // A curved cage wraps a spine and meets both clavicles and the pelvis.
    p.box([11,10,10],[13,18,12],'shadowBone');
    for (const y of [12,14,16]) {
      const halfWidth=y===12?2.5:3.5;
      for (let x=Math.ceil(12-halfWidth);x<12+halfWidth;x++) {
        const edge=Math.abs(x+.5-12)>halfWidth-1;
        p.box([x,y,edge?11:13],[x+1,y+1,edge?14:15],'bone');
        p.put(x,y,10,'bone');
      }
    }
    p.box([11,12,14],[13,17,15],'bone');
    p.limb([8.5,16.5,12],[11.5,17.5,12],.8,'bone');
    p.limb([15.5,16.5,12],[12.5,17.5,12],.8,'bone');
    return;
  }
  const coat={bare:'skin',teal:'teal',crimson:'crimson',steel:'steel',chain:'gunmetal',
    leather:'leather',tunic:'teal',robe:'teal'}[style];
  paintBodyPart(p,'torso',cell=>{
    if (style==='bare') return 'skin';
    if (cell.region==='waist') return cell.y===10?'belt':coat;
    if (style==='steel') {
      if (cell.z<11 || Math.abs(cell.x-11.5)>2.5) return 'gunmetal';
      if (frontSurface(cell) && (cell.x===11 || cell.x===12)) return 'silver';
    }
    if (style==='chain' && frontSurface(cell) && cell.y%2===0) return 'steel';
    return coat;
  });
  if (style==='bare') return;

  // The waist closes the cuirass/jerkin; the complete hips remain on the legs.
  p.put(11,10,14,'gold'); p.put(12,10,14,'gold');
  if (style==='steel') {
    p.limb([9.5,16.5,12.5],[11.5,17.5,13.5],.55,'silver');
    p.limb([14.5,16.5,12.5],[12.5,17.5,13.5],.55,'silver');
    p.put(11,14,14,'gold'); p.put(12,14,14,'gold');
  } else if (style==='robe' || style==='tunic') {
    for (let y=11;y<=16;y++) {
      p.put(11,y,14,'ivory'); p.put(12,y,14,'ivory');
    }
    if (style==='robe') { p.put(11,16,14,'gold'); p.put(12,16,14,'crystal'); }
  } else if (style==='leather') {
    for (const [x,y,z] of [[9,16,13],[10,15,14],[10,14,14],[11,13,14],[12,12,14],[13,11,13]]) p.put(x,y,z,'belt');
    p.put(10,14,15,'gold');
  } else if (style==='teal' || style==='crimson') {
    p.limb([10,16.5,13.5],[11.5,14.5,14.5],.6,'ivory');
    p.limb([14,16.5,13.5],[12.5,14.5,14.5],.6,'ivory');
    for (const y of [12,14]) for (const x of [10,13]) p.put(x,y,14,'gold');
  }
}

export function paintHumanArms(p,style) {
  if (style==='bones') {
    for (const arm of FRAME.arms) {
      p.oval(arm.shoulder,[1.1,1.1,1.1],'bone');
      p.limb(arm.shoulder,arm.elbow,.7,'bone');
      p.oval(arm.elbow,[.95,.95,.95],'shadowBone');
      p.limb(arm.elbow,arm.wrist,.7,'bone');
      p.limb(arm.wrist,arm.hand,.85,'bone');
      p.oval(arm.hand,[1,1,1],'bone');
    }
    p.put(6,14,15,'bone'); p.put(16,11,15,'bone');
    return;
  }
  paintBodyPart(p,'arms',cell=>{
    if (style==='bare') return 'skin';
    const hand=cell.region==='hand'||cell.region==='wrist';
    if (style==='sleeves') return hand?'skin':'teal';
    if (style==='leather') return hand?'leather':cell.region==='forearm'?'belt':'leather';
    if (cell.region==='elbow'||cell.region==='wrist') return 'gunmetal';
    return frontSurface(cell,12)?'steel':'gunmetal';
  });
  const handSurface={plate:'steel',leather:'leather',sleeves:'skin',bare:'skin'}[style];
  // Inner thumbs wrap the shaft and shield handle without filling their grips.
  p.put(6,14,15,handSurface); p.put(16,11,15,handSurface);
  if (style==='plate') {
    for (const arm of FRAME.arms) {
      p.oval([arm.shoulder[0],16,12],[2,1.4,1.95],'steel',(_x,y)=>y>=15);
      p.oval([arm.elbow[0],arm.elbow[1],12.5],[1.45,1.15,1.4],'steel');
    }
    for (const cell of p.cells.values()) {
      if (cell.y===16) cell.surface='silver';
    }
  } else if (style==='leather') {
    for (const arm of FRAME.arms) {
      p.oval([arm.shoulder[0],16,12],[1.75,1.4,1.7],'belt',(_x,y)=>y>15);
    }
  }
}

function paintSkeletalLegs(p) {
  // Two curved hip wings join at the sacrum; the gap beneath reads as a pelvis.
  p.box([11,10,10],[13,12,12],'shadowBone');
  p.limb([9.5,11,11.5],[9.5,9.5,12.5],1.15,'bone');
  p.limb([14.5,11,11.5],[14.5,9.5,12.5],1.15,'bone');
  p.limb([9.5,9.5,12.5],[12,8.5,13],.75,'bone');
  p.limb([14.5,9.5,12.5],[12,8.5,13],.75,'bone');
  p.box([10,10,10],[14,11,12],'bone');
  for (const leg of FRAME.legs) {
    p.limb(leg.hip,leg.knee,.85,'bone');
    p.oval(leg.knee,[1.1,.9,1.05],'bone');
    p.limb(leg.knee,leg.ankle,.75,'bone');
    p.oval([leg.foot[0],.7,leg.foot[2]],[1.1,.8,1.9],'bone');
    p.put(Math.floor(leg.foot[0]),1,Math.floor(leg.foot[2]),'shadowBone');
  }
}

function paintHem(p,bottom,top,surface) {
  for (let y=bottom;y<top;y++) {
    const t=(y-bottom)/(top-bottom),width=4.3-t*1.1,depth=2.8-t*.65;
    for (let x=7;x<17;x++) for (let z=9;z<16;z++) {
      const u=(x+.5-12)/width,v=(z+.5-12)/depth;
      if (u*u+v*v<=1) p.put(x,y,z,surface);
    }
    for (const x of [9,12,14]) {
      const dx=x+.5-12,z=Math.floor(12+depth*Math.sqrt(Math.max(0,1-(dx/width)**2))-.5);
      if (Math.abs(dx)<width) p.put(x,y,z,x===12?'ivory':'midnight');
    }
  }
}

export function paintHumanLegs(p,style) {
  if (style==='bones') { paintSkeletalLegs(p); return; }
  paintBodyPart(p,'legs',cell=>{
    const lower=['knee','shin','calf','ankle','foot'].includes(cell.region);
    if (style==='bare') return lower?'skin':'indigo';
    if (style==='skirt') return cell.region==='foot'||cell.region==='ankle'?'leather':lower?'skin':'teal';
    if (style==='ranger') return lower?'leather':'olive';
    if (style==='robe') return lower?'leather':'teal';
    if (cell.y===0) return 'leather';
    if (cell.region==='pelvis') return 'indigo';
    if (cell.region==='ankle') return 'gunmetal';
    if (cell.region==='thigh' && cell.z<(cell.x<12?13:11)) return 'indigo';
    return 'steel';
  });
  if (style==='armored') {
    for (const leg of FRAME.legs) {
      p.oval([leg.knee[0],leg.knee[1],leg.knee[2]+.6],[1.4,1.15,1.05],'silver');
      p.limb([leg.ankle[0],2.5,leg.ankle[2]+1],[leg.knee[0],4.5,leg.knee[2]+1],.6,'silver');
    }
  } else if (style==='ranger') {
    for (const leg of FRAME.legs) p.oval([leg.knee[0],5.2,leg.knee[2]],[1.4,.65,1.35],'belt');
  } else if (style==='robe') {
    paintHem(p,1,12,'teal');
    for (let x=8;x<16;x++) p.put(x,1,14,'gold');
  } else if (style==='skirt') {
    paintHem(p,6,12,'teal');
    for (let x=8;x<16;x++) p.put(x,6,14,'gold');
  }
}
