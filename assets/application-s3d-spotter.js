/* OM GROUP · the spotter: the Blender-built site character already used in the Connected Operations scene (assets/operations-motion/technician-blender.glb:
   OM GROUP helmet and hi-vis vest with the official mark, work boots, gloves). He stands outside the exclusion zone, faces the grapple wherever it goes,
   follows it with his head and gives the operator hand signals that match what the machine is doing: LOWER (palm down, pushing down), CLOSE (palms together),
   RAISE (palm up, lifting), SWING (arm out, pointing the way it travels, sweeping), SET DOWN (both palms down), with his weight, lean and shoulders moving with them.
   The model rests in an A-pose; arms are placed by two-bone IK in the character's own frame (he faces +z, his left is +x). */
import { THREE } from '/assets/application-s3d.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { clone } from '/assets/vendor/three/SkeletonUtils.js';

const TEMPLATE = (await new GLTFLoader().loadAsync('/assets/operations-motion/technician-blender.glb')).scene;
TEMPLATE.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.material) o.material.envMapIntensity = Math.min(o.material.envMapIntensity || 1, .8); } });

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wpos = o => o.getWorldPosition(new THREE.Vector3()), wquat = o => o.getWorldQuaternion(new THREE.Quaternion());
function setWorldQuat(bone, q) { bone.quaternion.copy(wquat(bone.parent).invert().multiply(q)); bone.updateMatrixWorld(true); }
function aim(bone, from, to) {                      /* turn a bone so that the point it carries (now at `from`, world) moves onto the line towards `to` */
  const P = wpos(bone), a = from.clone().sub(P).normalize(), b = to.clone().sub(P).normalize(); if (a.lengthSq() < 1e-9 || b.lengthSq() < 1e-9) return;
  setWorldQuat(bone, new THREE.Quaternion().setFromUnitVectors(a, b).multiply(wquat(bone)));
}
function twoBone(up, lo, end, target, pole) {       /* upper -> lower -> end reaches `target`; the middle joint bends towards `pole` (a world direction) */
  const A = wpos(up), B = wpos(lo), C = wpos(end), l1 = A.distanceTo(B), l2 = B.distanceTo(C);
  const d = target.clone().sub(A), dist = clamp(d.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3), dir = d.normalize();
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const K = A.clone().addScaledVector(dir, l1 * cosA).addScaledVector(p, l1 * sinA), T = A.clone().addScaledVector(dir, dist);
  aim(up, B, K); aim(lo, wpos(end), T);
}

export function spotter() {
  const g = clone(TEMPLATE), B = {}; g.traverse(o => { if (o.isBone) B[o.name.replace('mixamorig:', '').replace('mixamorig', '')] = o; });
  const root = new THREE.Group(); root.add(g); root.updateMatrixWorld(true);
  const rest = {}; ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'].forEach(n => { if (B[n]) rest[n] = B[n].quaternion.clone(); });
  const restHips = B.Hips.position.clone();
  const headFwd = V(0, 0, 1).applyQuaternion(wquat(B.Head).invert());           /* the head's own "forward" axis, from the rest pose */
  const arm = { Left: { off: V(.12, -.15, .2), pole: V(.3, -1, -.2) }, Right: { off: V(-.12, -.15, .2), pole: V(-.3, -1, -.2) } };
  const lastDir = V(0, 0, 1); let lastT = null, yaw = null, lean = 0;
  const qa = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a), AX = V(1, 0, 0), AY = V(0, 1, 0), AZ = V(0, 0, 1);

  /* the signal for each phase of the machine's cycle (ph, 0..1): hand targets relative to the shoulder, in the character's frame (x left, y up, z forward; an arm is ~.5 long) */
  function signals(ph, t, dirL) {
    const s = Math.sin, w = t * 4.6;
    let R = { off: V(-.14, -.05, .26), pole: V(-.2, -1, -.2) }, L = { off: V(.14, -.12, .2), pole: V(.2, -1, -.2) }, lean = 0, bob = 0, name = 'wait';
    if (ph < 0) { name = 'idle'; R = { off: V(-.09, -.47, .03), pole: V(-.3, -.2, -1) }; L = { off: V(.09, -.47, .03), pole: V(.3, -.2, -1) }; }          /* standing relaxed, arms at his sides */
    else if (ph < .2) { name = 'lower'; R = { off: V(-.12, .02 + .13 * s(w), .4), pole: V(-.3, -1, -.1) }; L = { off: V(.1, -.1, .22), pole: V(.2, -1, -.2) }; lean = .06 + .02 * s(w); }
    else if (ph < .3) { name = 'close'; const c = .5 + .5 * s(w * 1.4); R = { off: V(-.08 + .04 * c, .02, .38), pole: V(-.4, -1, 0) }; L = { off: V(.08 - .04 * c, .02, .38), pole: V(.4, -1, 0) }; lean = .05; }
    else if (ph < .45 || (ph >= .88 && ph < .93)) { name = 'raise'; R = { off: V(-.14, .3 + .14 * s(w), .3), pole: V(-.3, -1, -.1) }; L = { off: V(.1, -.1, .22), pole: V(.2, -1, -.2) }; lean = -.03; bob = .01 * s(w); }
    else if (ph < .72 || ph >= .93) {                                           /* swing: the arm on the side it travels towards points the way, sweeping */
      name = 'swing'; const sd = dirL.x >= 0 ? 'L' : 'R', sg = sd === 'L' ? 1 : -1, sw = 1 + .16 * s(w * .9);
      const pt = { off: V(dirL.x * .5 * sw, .13 + .05 * s(w), Math.max(.08, dirL.z * .5) * sw), pole: V(sg * .2, -1, -.4) }, other = { off: V(-sg * .1, .12 + .05 * s(w + 1.7), .3), pole: V(-sg * .4, -1, 0) };
      if (sd === 'L') { L = pt; R = other; } else { R = pt; L = other; } lean = .02; bob = .012 * s(w * .5);
    } else { name = 'setdown'; const k = .5 + .5 * s(w * .8); R = { off: V(-.2, -.02 - .08 * k, .36), pole: V(-.4, -1, 0) }; L = { off: V(.2, -.02 - .08 * k, .36), pole: V(.4, -1, 0) }; lean = .07; }
    return { R, L, lean, bob, name };
  }

  /* pose({ t: seconds, ph: phase of the machine's cycle, grapple: world point to watch, vel: world direction of travel }) */
  function pose(o = {}) {
    const t = o.t || 0, dt = lastT === null ? .016 : clamp(t - lastT, 0, .1); lastT = t; const f = 1 - Math.exp(-dt * 8);
    /* turn to face the grapple (smoothly) */
    if (o.grapple) { const p = root.position, ty = Math.atan2(o.grapple.x - p.x, o.grapple.z - p.z); if (yaw === null) yaw = ty; let d = ty - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * (1 - Math.exp(-dt * 5)); root.rotation.y = yaw; }
    root.updateMatrixWorld(true);
    if (o.vel && o.vel.lengthSq() > 1e-8) lastDir.copy(o.vel).normalize();
    const dirL = lastDir.clone().transformDirection(root.matrixWorld.clone().invert()); dirL.y = 0; if (dirL.lengthSq() < 1e-6) dirL.set(0, 0, 1); dirL.normalize();
    const S = signals(o.ph || 0, t, dirL);
    /* body: rest pose first, then lean, twist and weight shift on top */
    Object.keys(rest).forEach(n => { B[n].quaternion.copy(rest[n]); }); B.Hips.position.copy(restHips);
    lean += (S.lean - lean) * f;
    const sway = Math.sin(t * 1.5) * .02, twist = S.name === 'swing' ? clamp(dirL.x, -1, 1) * .12 : 0;
    ['Spine', 'Spine1', 'Spine2'].forEach(n => { B[n].quaternion.multiply(qa(AX, lean * .33)).multiply(qa(AZ, sway * .6)).multiply(qa(AY, twist * .33)); });
    B.Hips.position.x += Math.sin(t * 1.5) * .018; B.Hips.position.y += S.bob;
    root.updateMatrixWorld(true);
    /* head follows the grapple */
    if (o.grapple) {
      const H = wpos(B.Head), want = o.grapple.clone().sub(H).normalize(), cur = headFwd.clone().applyQuaternion(wquat(B.Head)).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(cur, want), ang = 2 * Math.acos(clamp(q.w, -1, 1)); if (ang > .9) q.slerp(new THREE.Quaternion(), 1 - .9 / ang);
      setWorldQuat(B.Head, q.multiply(wquat(B.Head)));
    }
    /* arms: ease towards this phase's signal, then IK */
    ['Right', 'Left'].forEach(side => {
      const k = side === 'Right' ? S.R : S.L, a = arm[side]; a.off.lerp(k.off, f); a.pole.lerp(k.pole, f); root.updateMatrixWorld(true);
      const sh = wpos(B[side + 'Arm']), tgt = sh.clone().add(a.off.clone().applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()))), pole = a.pole.clone().transformDirection(root.matrixWorld);
      twoBone(B[side + 'Arm'], B[side + 'ForeArm'], B[side + 'Hand'], tgt, pole);
    });
  }
  pose({ t: 0, ph: .5 });
  return { g: root, pose };
}
