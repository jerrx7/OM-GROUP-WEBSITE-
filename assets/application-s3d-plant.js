/* scene: the ready-mix batching plant (Ready-mix concrete page, "How RMC is produced"): the 3D twin of the plant drawn on the home page.
   Blender models: assets/3d/om-group-rmc-plant.glb (scripts/excavator3d/build-plant.py: four aggregate bins on their frame with material piles, gathering belt, inclined conveyor, mixing tower with
   weigh hoppers, water vessel, pan mixer, two cement silos with screw conveyors, control cabin) and assets/3d/om-group-transit-mixer.glb (the truck under the mixer outlet, with its drum in
   the plant's colours: charcoal with the orange helix and the OM GROUP mark). Aggregate moves bin -> belt -> inclined conveyor -> weigh hopper; the truck's drum turns; a stream of concrete
   leaves the mixer into the truck. A general view: no batch quantity, ratio or time is shown. No labels on the picture. 1 unit = 1 m. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
import { ss, loopEnv, crispLogo } from '/assets/application-s3d-flow.js';
const { clamp, lerp } = L;
const V3 = THREE.Vector3;

const [PLANT, TRUCK, PJ, MJ] = await Promise.all([
  new GLTFLoader().loadAsync('/assets/3d/om-group-rmc-plant.glb').then(g => g.scene), new GLTFLoader().loadAsync('/assets/3d/om-group-transit-mixer.glb').then(g => g.scene),
  fetch('/assets/3d/om-group-rmc-plant.json').then(r => r.json()), fetch('/assets/3d/om-group-transit-mixer.json').then(r => r.json()),
]);
const LOGO = new THREE.TextureLoader().load('/assets/om-group-machine-logo.png'); LOGO.colorspace = THREE.SRGBColorSpace; LOGO.colorSpace = THREE.SRGBColorSpace; LOGO.anisotropy = 8;
const SHADOW = new THREE.TextureLoader().load('/assets/3d/om-group-rmc-plant-shadow.webp', t => { t.colorSpace = THREE.NoColorSpace; });
const OX = -18;                                              /* the plant is centred on the origin so the light and shadow frustum cover it */

function tune(root, plant) {
  root.traverse(o => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
    const m = o.material; if (!m) return; m.envMapIntensity = .85; const n = m.name || '';
    if (/GratingSteel/.test(n)) { m.envMapIntensity = .7; }
    if (/CabinGlass|CabGlass/.test(n)) { m.transparent = true; m.depthWrite = false; m.envMapIntensity = 1.5; }
    if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
    if (/Concrete$/.test(n)) { m.envMapIntensity = .5; m.roughness = 1; }
    if (m.map) m.map.anisotropy = 8;
    if (/Tyre/.test(n)) m.envMapIntensity = .35;
  });
}
tune(PLANT, true); tune(TRUCK, false);

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 26, key: 2.3, shadow: .0, map: 4096, y: .03 });
  const out = { scene, fov: 30, wide: true };
  const world = new THREE.Group(); world.position.x = OX; scene.add(world);
  const plant = PLANT.clone(true); world.add(plant);
  /* the baked contact shadow / ambient occlusion on the ground, under the live shadows */
  { const sw = PJ.shadow || { x: 18, z: .5, w: 50, d: 21 }, g = new THREE.Mesh(new THREE.PlaneGeometry(sw.w, sw.d), new THREE.MeshBasicMaterial({ map: SHADOW, color: 0x120f0c, transparent: true, opacity: .8, depthWrite: false, toneMapped: false })); g.rotation.x = -Math.PI / 2; g.position.set(sw.x, .012, sw.z); g.renderOrder = 1; world.add(g); }
  const N = {}; plant.traverse(o => { if (o.name) N[o.name] = o; });

  /* the truck: drum in the plant's colours, with the OM GROUP mark curved onto it */
  const truck = TRUCK.clone(true); const MX = PJ.mixer.outlet[0] + 3.66; truck.position.set(MX, 0, 0); world.add(truck);
  const drum = (() => { let d = null; truck.traverse(o => { if (o.name === 'Drum') d = o; }); return d; })();
  const rad = x => { const P = MJ.profile; if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const t = (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t; } return P[P.length - 1][1]; };
  truck.traverse(o => { if (o.isMesh && o.name === 'DrumOuter') { o.material = o.material.clone(); o.material.color.setRGB(.2, .2, .22); o.material.metalness = .25; o.material.roughness = .5; } });
  const patch = (flip) => {
    const w = 2.1, h = w * 534 / 787, xc = -.15, nx = 26, nr = 18, pos = [], uv = [], idx = [], R = rad(xc), span = h / R;
    for (let j = 0; j <= nr; j++) for (let i = 0; i <= nx; i++) { const x = xc - w / 2 + w * i / nx, r = rad(x) + .018, ph = (flip ? -Math.PI / 2 : Math.PI / 2) - span / 2 + span * j / nr * (flip ? 1 : 1); pos.push(x, r * Math.cos(ph), r * Math.sin(ph)); uv.push(flip ? 1 - i / nx : i / nx, flip ? j / nr : 1 - j / nr); }
    for (let j = 0; j < nr; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: LOGO, transparent: true, depthWrite: false, roughness: .5, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide })); m.renderOrder = 4; return m;
  };
  if (drum) { drum.add(patch(false), patch(true)); }

  /* aggregate on the belts: stones in four colours, one source per bin, moving bin -> gathering belt -> inclined conveyor -> the first weigh hopper */
  const COL = [new THREE.Color(.055, .055, .06), new THREE.Color(.24, .245, .26), new THREE.Color(.62, .47, .28), new THREE.Color(.42, .43, .45)], HOT = new THREE.Color(1, .37, .16);
  const gy = PJ.gather[0][1] + .05, A = PJ.incline[0], B = PJ.incline[1], bx = PJ.bins, hop = [PJ.hopperX[0] - .4, 13.9];
  const paths = bx.map(x => [new V3(x, PJ.gate[0] - .15, 0), new V3(x, gy, 0), new V3(A[0], gy, 0), new V3(B[0], B[1], 0), new V3(PJ.head[0] + .3, PJ.head[1] - .2, 0), new V3(hop[0], hop[1], 0)]);
  const lens = paths.map(p => { const l = []; let t = 0; for (let i = 1; i < p.length; i++) { const d = p[i].distanceTo(p[i - 1]); l.push(d); t += d; } return { l, t }; });
  const NI = 320, r = rng(9), items = Array.from({ length: NI }, (_, i) => ({ src: i % 4, ph: r(), s: .09 + r() * .09, z: (r() - .5) * 1.0, o: r() * 6, k: .8 + r() * .5 }));
  const geo = new THREE.IcosahedronGeometry(1, 0); const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: 0, envMapIntensity: .6 }), NI); im.castShadow = true; im.frustumCulled = false; world.add(im);
  const at = (si, u) => { const P = paths[si], { l, t } = lens[si]; let d = u * t; for (let i = 0; i < l.length; i++) { if (d <= l[i]) return P[i].clone().lerp(P[i + 1], d / l[i]); d -= l[i]; } return P[P.length - 1].clone(); };
  const o3 = new THREE.Object3D(), tmp = new THREE.Color();

  /* the concrete stream from the mixer outlet into the truck's hopper */
  const out0 = PJ.mixer.outlet, stream = new THREE.Mesh(new THREE.CylinderGeometry(.2, .16, 1, 14), new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: .45, envMapIntensity: .8 })); stream.castShadow = true; world.add(stream);
  const sy1 = out0[1] - .12, sy0 = 4.25; stream.scale.y = sy1 - sy0; stream.position.set(out0[0], (sy1 + sy0) / 2, 0);

  /* the fine-aggregate pile can be highlighted */
  const sandPile = N.Pile_Sand, sandMat = sandPile ? sandPile.material : null; if (sandMat) { sandMat.emissive = new THREE.Color(1, .37, .16); sandMat.emissiveIntensity = 0; }

  out.views = { overview: { az: -17, el: 13, dist: 61, t: [-.2, 7.6, -1.2] }, bins: { az: -16, el: 13, dist: 23, t: [-18 + 6.3, 6.2, 0] }, mixer: { az: -26, el: 12, dist: 23, t: [24.8 - 18 + 1, 7.4, 0] } };
  out.limits = { az: [-85, 75], el: [3, 50], dist: [12, 70] };
  out.labels = [];
  let T = 0, hl = 0;
  out.update = (t, dt, st) => {
    const go = !reduceM(); if (go) T += dt;
    const on = !!st.hl; hl += ((on ? 1 : 0) - hl) * (1 - Math.exp(-dt * 5)); if (sandMat) sandMat.emissiveIntensity = hl * .55;
    items.forEach((it, i) => {
      const u = go ? (T * .028 + it.ph) % 1 : it.ph, p = at(it.src, u); p.z += it.z * (.15 + .85 * ss(.12, .2, u) * (1 - ss(.74, .82, u))); const e = Math.max(.001, loopEnv(u, .02, .03)); o3.position.copy(p).add(new V3(0, it.s * .6, 0)); o3.scale.set(it.s * it.k * e, it.s * .7 * e, it.s * e); o3.rotation.set(it.o + u * 9, it.o, 0); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix);
      im.setColorAt(i, it.src === 2 && on ? HOT : COL[it.src]);
    }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    if (drum) drum.rotation.x = go ? T * .85 : 0;
    const w = go ? 1 + .1 * Math.sin(T * 7) : 1; stream.scale.x = stream.scale.z = w;
    return go || hl > .01;
  };
  return out;
}
