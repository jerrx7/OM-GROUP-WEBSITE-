/* the road machines for the Wet Mix Macadam and Granular Sub-base scenes: Blender models (scripts/excavator3d/build-road.py)
   - assets/3d/om-group-roller.glb : single-drum vibratory roller (node `Drum`, `RearWheelL`, `RearWheelR` turn), travels +x, drum at +x, wheels and drum rest on y = 0
   - assets/3d/om-group-paver.glb  : tracked paver finisher (node `Auger` turns), travels +x, hopper at +x, tracks rest on y = 0
   - assets/3d/om-group-tipper.glb : the 8x4 tipper (see application-s3d-tipper.js)
   Generic machines: not a particular OM GROUP unit. */
import { THREE } from '/assets/application-s3d.js';
import { crispLogo } from '/assets/application-s3d-flow.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
const ld = u => new GLTFLoader().loadAsync(u).then(g => g.scene);
const [ROLLER, PAVER] = await Promise.all([ld('/assets/3d/om-group-roller.glb'), ld('/assets/3d/om-group-paver.glb')]);
[ROLLER, PAVER].forEach(root => root.traverse(o => {
  if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; const m = o.material; if (!m) return; m.envMapIntensity = .9; const n = m.name || '';
  if (/Tyre/.test(n)) m.envMapIntensity = .35;
  if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
  if (/DecalWhite|Stripe|Reflective/.test(n)) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; }
  if (m.map) m.map.anisotropy = 8;
}));
const wrap = (src, names) => { const g = src.clone(true), N = {}; g.traverse(o => { if (o.name) N[o.name] = o; }); return { g, N }; };
export function rollerMachine(scale = 2.5) { const { g, N } = wrap(ROLLER); g.scale.setScalar(scale); const holder = new THREE.Group(); holder.add(g); return { g: holder, drum: N.Drum, wheels: [N.RearWheelL, N.RearWheelR], scale }; }
export function paverMachine(scale = 2.5) { const { g, N } = wrap(PAVER); g.scale.setScalar(scale); const holder = new THREE.Group(); holder.add(g); return { g: holder, auger: N.Auger, scale }; }
