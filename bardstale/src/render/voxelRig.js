import { HUMAN_JOINT_PIVOTS } from './voxelHumanoidBody.js';

const OGRE_PIVOTS = {
  rightArm: [-6.5,33,-2], leftArm: [12.5,34,-3],
  rightLeg: [-3,19,0], leftLeg: [9,19,-3],
};
const RANGE = { body:[0,0], rightArm:[-1.15,1.05], leftArm:[-.85,.85], rightLeg:[-.52,.52], leftLeg:[-.52,.52] };
const clamp = value => Math.max(0,Math.min(1,value));
const smooth = value => { const t=clamp(value); return t*t*(3-2*t); };

/** Rigid body ownership is independent of item slots: both boots share one slot,
 * but each boot follows its own hip; a complete custom torso may have joints. */
export function createVoxelRig(model) {
  const { assembly, appearance } = model;
  const pivots = appearance.form === 'ogre' ? OGRE_PIVOTS : appearance.form ? {} : HUMAN_JOINT_PIVOTS;
  const joints = Object.fromEntries(Object.entries({body:[0,0,0],...pivots}).map(([name,pivot]) =>
    [name,{pivot,angleRange:RANGE[name],voxels:[]}]));
  function effectJoint(slot) {
    if (!joints.rightArm) return 'body';
    if (slot === 'mainhand' || slot === 'ring1') return 'rightArm';
    if (slot === 'offhand' || slot === 'ring2') return 'leftArm';
    return 'body';
  }
  function owner(voxel) {
    if (voxel.joint) return voxel.joint;
    if (!joints.rightArm) return 'body';
    const side=voxel.x<0?'right':'left';
    if (['arms','hands','shoulders'].includes(voxel.slot)) return `${side}Arm`;
    if (voxel.slot === 'feet' || (voxel.slot === 'legs' && voxel.y<10)) return `${side}Leg`;
    return effectJoint(voxel.slot);
  }
  for (const voxel of assembly.voxels) joints[owner(voxel)].voxels.push(voxel);

  function samplePose({walkPhase=0,walkAmount=0,action=null,progress=0,reducedMotion=false,active=true}={}) {
    const pose={rightArm:0,leftArm:0,rightLeg:0,leftLeg:0};
    if (reducedMotion || !active || !joints.rightArm) return pose;
    const stride=appearance.legs==='robe'?.24:appearance.legs==='skirt'?.36:.48;
    const swing=Math.sin(walkPhase)*clamp(walkAmount)*stride;
    pose.rightLeg=swing; pose.leftLeg=-swing;
    pose.rightArm=-swing*.48; pose.leftArm=swing*.48;
    if (progress<0 || progress>=1 || !action) return pose;
    const p=clamp(progress), pulse=Math.sin(p*Math.PI);
    if (action==='slash') {
      // Wind up, cut through the target at 90ms, then recover to the grip pose.
      pose.rightArm=p<.12 ? -.75*smooth(p/.12)
        : p<.25 ? -.75+1.8*smooth((p-.12)/.13)
        : 1.05*(1-smooth((p-.25)/.75));
      pose.leftArm=-pulse*.32;
      if (['dagger','shortSword'].includes(appearance.offhand)) pose.leftArm=pose.rightArm*.72;
    } else if (action==='arrow') {
      pose.rightArm=-pulse*.7;
      pose.leftArm=-pulse*.85;
    } else if (action==='cast') {
      pose.rightArm=-pulse*1.05;
      pose.leftArm=-pulse*.65;
    } else if (action==='recoil') {
      pose.rightArm=pulse*.25;
      pose.leftArm=pulse*.3;
    }
    return pose;
  }
  return {joints,effectJoint,samplePose};
}
