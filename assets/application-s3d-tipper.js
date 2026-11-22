/* OM GROUP · the 8x4 tipper truck (Blender model: scripts/excavator3d/build-tipper.py -> assets/3d/om-group-tipper.glb).
   White cab with the OM GROUP mark, charcoal steel body with the mark on both sides, four axles. The body tips about its real rear hinge; the 3-stage
   telescopic hoist follows it (each stage slides by the real distance between the chassis pin and the body lug).
   tipperTruck() returns { g, bed, tilt(rad), fill(0..1) }: fill() shows the stones lying in the body, one after another, so a stone set down by the grapple adds to the load. */
import { THREE, L } from '/assets/application-s3d.js';
import { crispLogo } from '/assets/application-s3d-flow.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';

const GLB = '/assets/3d/om-group-tipper.glb';
const TEMPLATE = (await new GLTFLoader().loadAsync(GLB)).scene;
{
  const mats = new Set(); TEMPLATE.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; mats.add(o.material); });
  mats.forEach(m => {
    const n = m.name || ''; m.envMapIntensity = .9;
    if (/PaintWhiteCab/.test(n)) m.envMapIntensity = .8;
    if (/BodyCharcoal/.test(n)) m.envMapIntensity = .9;
    if (/Tyre/.test(n)) m.envMapIntensity = .35;
    if (/Chrome/.test(n)) { m.roughness = .4; m.envMapIntensity = .85; }
    if (/Machined|RimSteel/.test(n)) { m.envMapIntensity = 1.0; m.roughness = Math.max(m.roughness, 1.2); }
    if (/CabGlass/.test(n)) { m.envMapIntensity = 1.5; m.transparent = true; m.depthWrite = false; m.opacity = .6; }
    if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
    if (/DecalWhite|Stripe|Reflective/.test(n)) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; }
    if (m.map) m.map.anisotropy = 8;
  });
  TEMPLATE.traverse(o => { if (o.isMesh && /Logo_/.test(o.name)) o.renderOrder = 3; });
}

export function tipperTruck() {
  const g = TEMPLATE.clone(true), N = {}; g.traverse(o => { if (o.name) N[o.name] = o; });
  const bed = N.Bed, hoist = N.Cyl_Hoist, tipH = N.Tip_Hoist, s1 = N.Hoist_Stage1, s2 = N.Hoist_Stage2, d0 = hoist.userData.d0, v = new THREE.Vector3();
  const tilt = a => {
    bed.rotation.z = a; g.updateMatrixWorld(true);
    tipH.getWorldPosition(v); hoist.parent.worldToLocal(v);
    const dx = v.x - hoist.position.x, dy = v.y - hoist.position.y, e = Math.max(0, Math.hypot(dx, dy) - d0);
    hoist.rotation.z = Math.atan2(dy, dx); s1.position.x = e / 2; s2.position.x = e;
  };
  /* the load: angular stones lying in the body (bed frame: x 0..6.3 from the rear hinge, z ±1.1, floor y 0), lowest first */
  const R = realStones('rock'), M = realStoneMaterial({ tint: .52, bump: .02, floor: 0, gain: .9, contrast: .6, scale: 1.1 }), stones = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = [[.9, .62], [2.1, .66], [3.3, .64], [4.5, .66], [5.5, .6]];
  rows.forEach(([x, s], ri) => [-.62, .62].forEach((z, k) => stones.push([x + (rnd() - .5) * .35, s * .74, z + (rnd() - .5) * .25, s * .95, ri * 2 + k])));
  rows.slice(0, 4).forEach(([x, s], ri) => stones.push([x + .55 + (rnd() - .5) * .3, s * 1.45, (rnd() - .5) * .3, s * .88, ri + 20]));
  const load = new THREE.Group(); bed.add(load);
  stones.forEach(([x, y, z, s, i]) => { const m = new THREE.Mesh(R[i % R.length], M); m.castShadow = m.receiveShadow = true; m.scale.set(s, s * .78, s); m.position.set(x, y, z); m.rotation.set(rnd() * .4, rnd() * 6.28, rnd() * .4); m.visible = false; load.add(m); });
  const fill = f => { const n = Math.round(Math.max(0, Math.min(1, f)) * stones.length); load.children.forEach((m, i) => { m.visible = i < n; }); };
  tilt(0); fill(0);
  return { g, bed, tilt, fill };
}
