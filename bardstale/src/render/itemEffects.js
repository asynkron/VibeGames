import * as THREE from 'three';

const TAU = Math.PI * 2;
const fraction = value => value - Math.floor(value);
const sample = value => fraction(Math.sin(value * 127.1 + 311.7) * 43758.5453);

function phaseFor(id) {
  let hash = 0;
  for (const letter of id) hash = (Math.imul(hash, 31) + letter.charCodeAt(0)) >>> 0;
  return hash % 1000 / 137;
}

function envelope(effect) {
  const { min, max } = effect.bounds, a = effect.anchor;
  const width=max.x-min.x, depth=max.z-min.z;
  if (effect.kind === 'orbit' || effect.kind === 'glow') {
    // A billboard keeps facing the camera while its emitting limb rotates.
    const radius=effect.kind === 'orbit' ? (Math.max(width,depth)/2+2)*2.21 : 5.9;
    return {min:{x:a.x-radius,y:a.y-radius,z:a.z-radius},max:{x:a.x+radius,y:a.y+radius,z:a.z+radius}};
  }
  if (effect.kind === 'mist') {
    const halo=(Math.max(width,depth)+5)*.74;
    const rise=Math.max(5.5,(max.y-min.y)*.35+3);
    return {
      min:{x:Math.min(min.x-6.9,a.x-halo),y:Math.min(min.y-4.3,a.y-halo),z:Math.min(max.z-3.5,a.z-halo)},
      max:{x:Math.max(max.x+6.9,a.x+halo),y:Math.max(max.y+rise+4.3,a.y+halo),z:Math.max(max.z+7.7,a.z+halo)},
    };
  }
  // Include the diagonal of the tallest flame billboard from any camera angle.
  const x=width*.45+5.9, z=depth*.48+5.5;
  return {min:{x:a.x-x,y:min.y-4.8,z:a.z-z},max:{x:a.x+x,y:max.y+9.3,z:a.z+z}};
}

/** Persistent, item-local particles. One small unshadowed light per figure. */
export function createItemEffects(descriptors) {
  const group = new THREE.Group();
  group.name = 'equipped-item-effects';
  const textures = new Map();
  const materials = new Set();
  const geometries = new Set();
  const entries = [];
  const scale = new THREE.Vector3();
  let disposed = false;
  let partOffsets = {};

  function positionEntry(entry) {
    const offset = partOffsets[entry.effect.slot] || [0,0,0];
    const pivot = entry.attachment?.pivot || [0,0,0];
    entry.group.position.set(offset[0]-pivot[0],offset[1]-pivot[1],offset[2]-pivot[2]);
  }

  function texture(kind) {
    if (textures.has(kind)) return textures.get(kind);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = kind === 'spark' ? 8 : 32;
    const ctx = canvas.getContext('2d');
    if (kind === 'spark') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3,0,2,8); ctx.fillRect(0,3,8,2);
      ctx.fillRect(2,2,4,4);
    } else if (kind === 'flame') {
      const gradient = ctx.createLinearGradient(0,32,0,0);
      gradient.addColorStop(0,'rgba(255,255,255,0)');
      gradient.addColorStop(.2,'rgba(255,255,255,.95)');
      gradient.addColorStop(.55,'rgba(255,255,255,.85)');
      gradient.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      for (const [x,y] of [[8,30],[4,22],[8,14],[12,18],[14,8],[18,0],[20,12],[26,20],[24,28],[20,32]]) ctx.lineTo(x,y);
      ctx.closePath(); ctx.fill();
    } else {
      const gradient = ctx.createRadialGradient(16,16,0,16,16,16);
      gradient.addColorStop(0,`rgba(255,255,255,${kind === 'mist' ? .8 : 1})`);
      gradient.addColorStop(.3,'rgba(255,255,255,.5)');
      gradient.addColorStop(.65,'rgba(255,255,255,.16)');
      gradient.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      if (kind === 'mist') {
        // Small irregular clouds retain a little of the figure's pixel texture.
        for (let y=0;y<32;y+=2) for (let x=0;x<32;x+=2) {
          ctx.globalAlpha = .65 + sample(x+y*32)*.35;
          ctx.fillRect(x,y,2,2);
        }
      } else ctx.fillRect(0,0,32,32);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = kind === 'spark' || kind === 'flame' ? THREE.NearestFilter : THREE.LinearFilter;
    map.minFilter = THREE.LinearFilter;
    map.generateMipmaps = false;
    textures.set(kind,map);
    return map;
  }

  function sprite(owner, shape, color, luminous = true) {
    const material = new THREE.SpriteMaterial({ map:texture(shape),color,
      transparent:true,depthTest:true,depthWrite:false,toneMapped:false,
      blending:luminous ? THREE.AdditiveBlending : THREE.NormalBlending });
    materials.add(material);
    const particle = new THREE.Sprite(material);
    particle.renderOrder = luminous ? 5 : 4;
    owner.add(particle);
    return particle;
  }

  function halo(entry, position, size, opacity) {
    const glow = sprite(entry.group,'glow',entry.effect.color);
    glow.position.copy(position);
    glow.scale.setScalar(size);
    glow.material.opacity = opacity;
    entry.halos.push({glow,opacity,size});
  }

  for (const effect of descriptors) {
    const root = new THREE.Group();
    root.name = `item-effect:${effect.id}`;
    root.userData.itemEffect = true;
    group.add(root);
    const anchor = new THREE.Vector3(effect.anchor.x,effect.anchor.y,effect.anchor.z);
    const size = new THREE.Vector3(effect.bounds.max.x-effect.bounds.min.x,effect.bounds.max.y-effect.bounds.min.y,effect.bounds.max.z-effect.bounds.min.z);
    const entry = {effect,group:root,anchor,size,phase:phaseFor(effect.id),particles:[],halos:[],rings:[],bounds:envelope(effect),color:new THREE.Color(effect.color),accent:new THREE.Color(effect.accent)};
    entries.push(entry);
    if (effect.kind === 'flame') {
      for (const t of [.2,.55,.85]) halo(entry,new THREE.Vector3(anchor.x,effect.bounds.min.y+size.y*t,anchor.z),7,.17);
      for (let i=0;i<28;i++) entry.particles.push(sprite(root,i<22?'flame':'spark',effect.color,i>=22));
    } else if (effect.kind === 'orbit') {
      entry.radius = Math.max(size.x,size.z)/2 + 2;
      halo(entry,anchor,entry.radius*3,.3);
      const core = sprite(root,'spark',effect.accent);
      core.position.copy(anchor); core.scale.setScalar(3); core.material.opacity=.8;
      for (let ring=0;ring<2;ring++) {
        const tilt = ring ? -.75 : .65;
        const points = Array.from({length:64},(_,i)=>{
          const a=i/64*TAU, r=entry.radius;
          return new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*Math.sin(tilt),Math.sin(a)*r*Math.cos(tilt));
        });
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({color:ring?effect.accent:effect.color,transparent:true,opacity:.2,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});
        geometries.add(geometry); materials.add(material);
        const loop = new THREE.LineLoop(geometry,material);
        loop.position.copy(anchor); root.add(loop); entry.rings.push(loop);
      }
      for (let i=0;i<32;i++) entry.particles.push(sprite(root,i%4===0?'spark':'glow',i%4===0?effect.accent:effect.color));
    } else if (effect.kind === 'mist') {
      halo(entry,anchor,Math.max(size.x,size.z)+5,.24);
      entry.mistCount=Math.min(36,18+Math.floor(size.x*size.y/10));
      entry.rise=Math.max(5.5,size.y*.35+3);
      for (let i=0;i<entry.mistCount+4;i++) entry.particles.push(sprite(root,i<entry.mistCount?'mist':'spark',effect.color,i>=entry.mistCount));
    } else if (effect.kind === 'glow') {
      halo(entry,anchor,8,.42);
      for (let i=0;i<7;i++) entry.particles.push(sprite(root,'spark',i%2?effect.color:effect.accent));
    } else throw new RangeError(`Unknown item effect: ${effect.kind}`);
  }

  const lightEntry = entries.find(entry=>entry.effect.kind==='flame') || entries.find(entry=>entry.effect.kind==='orbit') || entries[0];
  const light = lightEntry ? new THREE.PointLight(lightEntry.effect.color,0,0,2) : null;
  if (light) {
    light.position.copy(lightEntry.anchor);
    lightEntry.group.add(light);
  }

  function update(now, { reducedMotion=false, active=true } = {}) {
    if (disposed) return;
    group.visible = active;
    // Attached effects are children of the moving limb, rather than this container.
    for (const entry of entries) entry.group.visible = active;
    if (light) light.visible = active;
    if (!active) return;
    const seconds = reducedMotion ? 2.25 : now/1000;
    for (const entry of entries) {
      const { effect,anchor,size,phase } = entry;
      const time = seconds + phase;
      const pulse = reducedMotion ? 0 : Math.sin(time*2.3);
      for (const {glow,opacity,size:diameter} of entry.halos) {
        glow.material.opacity = opacity*(1+pulse*.12);
        glow.scale.setScalar(diameter*(1+pulse*.04));
      }
      for (let i=0;i<entry.particles.length;i++) {
        const particle = entry.particles[i];
        const seed = i+phase*53;
        const age = fraction(time/(effect.kind==='mist'?3.6:1.25)+sample(seed));
        const fade = Math.sin(age*Math.PI);
        if (effect.kind==='flame') {
          const spark = i>=22;
          const angle=sample(seed+9)*TAU;
          particle.position.set(anchor.x+Math.cos(angle)*(size.x*.45+age*.8)+Math.sin(time*4+i)*.3,
            effect.bounds.min.y+sample(seed+2)*size.y+age*(spark?8:4.5),
            anchor.z+Math.sin(angle)*(size.z*.48+.4)+Math.cos(time*3+i)*.3);
          const width=spark?.2+fade*.25:1+fade*(1+sample(seed+4));
          particle.scale.set(width,spark?width:width*(1.6+age),1);
          particle.material.opacity=fade*(spark?.8:.83);
          particle.material.color.copy(entry.accent).lerp(entry.color,age);
          particle.material.rotation=Math.sin(time*2+i)*.12;
        } else if (effect.kind==='orbit') {
          const ring=Math.floor(i/16), orb=Math.floor((i%16)/4), tail=i%4;
          const a=time*(ring?-1.3:1.65)+orb*TAU/4-tail*.12;
          const tilt=ring?-.75:.65, r=entry.radius;
          const spin=time*.2*(ring?-1:1);
          const x=Math.cos(a)*r,z=Math.sin(a)*r*Math.cos(tilt);
          particle.position.set(anchor.x+x*Math.cos(spin)+z*Math.sin(spin),anchor.y+Math.sin(a)*r*Math.sin(tilt),anchor.z-x*Math.sin(spin)+z*Math.cos(spin));
          particle.scale.setScalar(tail?1.3-tail*.2:1.05);
          particle.material.opacity=tail?.35-tail*.075:.9;
          particle.material.rotation=a;
        } else if (effect.kind==='mist') {
          const spark=i>=entry.mistCount, angle=sample(seed+7)*TAU;
          const spread=age*2.6;
          particle.position.set(anchor.x+(sample(seed+1)-.5)*size.x+Math.sin(angle+time*.4)*spread,
            effect.bounds.min.y+sample(seed+2)*size.y+age*(spark?7:entry.rise),
            effect.bounds.max.z+.8+age*1.3+Math.cos(angle+time*.35)*age*1.3);
          particle.scale.setScalar(spark?.22+fade*.15:2+age*4);
          particle.material.opacity=fade*(spark?.7:.4);
          particle.material.color.copy(entry.color).lerp(entry.accent,age*.8);
          particle.material.rotation=angle+time*.15;
        } else {
          const angle=time*.5+i*TAU/entry.particles.length;
          particle.position.set(anchor.x+Math.cos(angle)*(1.4+age),anchor.y+Math.sin(angle)*1.8+age,anchor.z+Math.sin(angle)*(1+age));
          particle.scale.setScalar(.25+fade*.5);
          particle.material.opacity=fade*.9;
          particle.material.rotation=angle;
        }
      }
      entry.rings.forEach((ring,i)=>{ring.rotation.y=time*.2*(i?-1:1);});
    }
    if (light) {
      lightEntry.group.getWorldScale(scale);
      const density=Math.max(scale.x,scale.y,scale.z);
      light.distance=22*density;
      const strength=lightEntry.effect.kind==='flame'?95:lightEntry.effect.kind==='mist'?25:65;
      light.intensity=strength*density*density*(reducedMotion?1:1+Math.sin(seconds*4+lightEntry.phase)*.1);
    }
  }

  return {
    group,
    update,
    setAttachments(resolve) {
      for (const entry of entries) {
        entry.attachment = resolve?.(entry.effect.slot) || null;
        (entry.attachment?.group || group).add(entry.group);
        positionEntry(entry);
      }
    },
    setPartOffsets(offsets) {
      partOffsets = offsets;
      for (const entry of entries) positionEntry(entry);
    },
    getBoundsBySlot() { return entries.map(entry=>({slot:entry.effect.slot,bounds:entry.bounds})); },
    getBounds() {
      if (!entries.length) return null;
      const bounds={min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}};
      for (const entry of entries) for (const [index,axis] of ['x','y','z'].entries()) {
        const offset = partOffsets[entry.effect.slot]?.[index] || 0;
        bounds.min[axis]=Math.min(bounds.min[axis],entry.bounds.min[axis]+offset);
        bounds.max[axis]=Math.max(bounds.max[axis],entry.bounds.max[axis]+offset);
      }
      return bounds;
    },
    dispose() {
      if (disposed) return;
      disposed=true;
      for (const material of materials) material.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const map of textures.values()) map.dispose();
      for (const entry of entries) {
        entry.group.removeFromParent();
        entry.group.clear();
      }
      group.clear();
    },
  };
}
