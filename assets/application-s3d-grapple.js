/* OM GROUP · the tracked material-handling excavator with a stone grapple (Blender model, scripts/excavator3d/build-excavator.py -> assets/3d/hydraulic-grapple-machine.glb).
   Loads the real model and gives the scene the same handle the old box machine had: { g, turret, pose(boom, stick, grapple, open), tip, ... }.
   Every moving part is a node at its true pivot (Turret > Boom > Stick > Grapple > JawL / JawR). The hydraulic cylinders are not rotated as a whole:
   each barrel is aimed from its base pin at the rod pin on the part it pushes, and the chrome rod slides out of the barrel by exactly the distance between the pins. */
import { THREE } from '/assets/application-s3d.js';
import { crispLogo } from '/assets/application-s3d-flow.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';

/* mirrored in the Blender script (KIN block) */
export const K = { TY: 1.25, BP: [1.5, .9], BL: 4.9, SL: 3.0, HG: 2.3 };
const GLB = '/assets/3d/hydraulic-grapple-machine.glb';
const OPEN = 38 * Math.PI / 180;             /* jaw angle when fully open */
const CYLS = ['Cyl_Boom_A', 'Cyl_Boom_B', 'Cyl_Stick', 'Cyl_Tilt', 'Cyl_JawL', 'Cyl_JawR'];

/* where the grapple tip (the bottom of the tines) has to be, relative to the swing axis (radius tx) and the ground (height ty): the angles of the boom chord and the stick chord */
export function solve(tx, ty) {
  const ox = tx - K.BP[0], gy = ty + K.HG - (K.TY + K.BP[1]);
  const D = Math.min(Math.max(Math.hypot(ox, gy), Math.abs(K.BL - K.SL) + .2), K.BL + K.SL - .05), phi = Math.atan2(gy, ox);
  const dl = Math.acos(Math.max(-1, Math.min(1, (K.BL * K.BL + D * D - K.SL * K.SL) / (2 * K.BL * D)))), al = phi + dl;
  return [al, Math.atan2(gy - K.BL * Math.sin(al), ox - K.BL * Math.cos(al))];
}

/* the model is loaded once (top-level await: the scene that imports this file only starts once it is in) and cloned for every figure on the page */
const TEMPLATE = (await new GLTFLoader().loadAsync(GLB)).scene;
{
  const mats = new Set();
  TEMPLATE.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; mats.add(o.material); });
  /* material tuning for the studio light of the shared engine */
  mats.forEach(m => {
    const n = m.name || ''; m.envMapIntensity = .9;
    if (/PaintYellow/.test(n)) m.envMapIntensity = .85;
    if (/Chrome/.test(n)) { m.roughness = .4; m.envMapIntensity = .85; }
    if (/Machined/.test(n)) { m.envMapIntensity = 1.1; m.roughness = 1.25; }
    if (/Graphite|DarkSteel|TrackSteel/.test(n)) { m.envMapIntensity = 1.0; }
    if (/CabGlass/.test(n)) { m.envMapIntensity = 1.6; m.transparent = true; m.depthWrite = false; m.opacity = .6; }
    if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
    if (/Decal/.test(n)) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; }
    if (m.map) m.map.anisotropy = 8;
  });
  TEMPLATE.traverse(o => { if (o.isMesh && /Logo_/.test(o.name)) o.renderOrder = 3; });
}

export function excavator() {
  const g = TEMPLATE.clone(true), N = {}; g.traverse(o => { if (o.name) N[o.name] = o; });

  const turret = N.Turret, boom = N.Boom, stick = N.Stick, gr = N.Grapple, jl = N.JawL, jr = N.JawR, tip = N.GrappleTip;
  const cyl = CYLS.map(n => ({ e: N[n], tip: N['Tip_' + n], rod: N[n + '_Rod'], Lr: N[n].userData.Lr })).filter(c => c.e && c.tip && c.rod);
  const v = new THREE.Vector3();
  const aim = () => {
    g.updateMatrixWorld(true);
    cyl.forEach(c => {
      c.tip.getWorldPosition(v); c.e.parent.worldToLocal(v);
      const dx = v.x - c.e.position.x, dy = v.y - c.e.position.y;
      c.e.rotation.z = Math.atan2(dy, dx); c.rod.position.x = Math.hypot(dx, dy) - c.Lr;
    });
    g.updateMatrixWorld(true);
  };
  /* pose(boom, stick, grapple, open): same call as the old machine; open 0 = jaws closed on a stone, 1 = fully open */
  const pose = (ab, as, ag, open) => { boom.rotation.z = ab; stick.rotation.z = as; gr.rotation.z = ag; jr.rotation.z = open * OPEN; jl.rotation.z = -open * OPEN; aim(); };
  pose(1, -1, 0, 1);
  return { g, turret, pose, tip, boom, stick, gr, N, head: N.GrappleHead || gr };
}
