/* scene: the concrete-product (precast block) production line, stage by stage (Ready-mix concrete page, "Precast"). 3D twin of the plant drawn on the home page, plus the yard.
   Blender models (scripts/excavator3d): om-group-rmc-plant.glb (bins with piles, belts, mixing tower, silos) and om-group-precast-line.glb (feed belt from the mixer, block machine with
   tamper head, pallet line, stacker gantry, curing racks, hollow blocks). Aggregate runs bin -> belt -> hopper; concrete runs from the mixer along the feed belt into the machine; the tamper head
   presses, pallets of blocks come out and travel to the stacker; finished blocks stand in the racks. No labels on the picture. No mix, quantity or ratio is shown. 1 unit = 1 m. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
import { ss, loopEnv, crispLogo } from '/assets/application-s3d-flow.js';
const { clamp } = L;
const V3 = THREE.Vector3;

const ld = u => new GLTFLoader().loadAsync(u).then(g => g.scene);
const [PLANT, YARD, PJ, YJ] = await Promise.all([ld('/assets/3d/om-group-rmc-plant.glb'), ld('/assets/3d/om-group-precast-line.glb'), fetch('/assets/3d/om-group-rmc-plant.json').then(r => r.json()), fetch('/assets/3d/om-group-precast-line.json').then(r => r.json())]);
const tex = u => new THREE.TextureLoader().load(u, t => { t.colorSpace = THREE.NoColorSpace; });
const SH1 = tex('/assets/3d/om-group-rmc-plant-shadow.webp'), SH2 = tex('/assets/3d/om-group-precast-line-shadow.webp');
const OX = -24;

function tune(root) {
  root.traverse(o => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const m = o.material; if (!m) return; m.envMapIntensity = .85; const n = m.name || '';
    if (/CabinGlass|CabGlass|CuringCover/.test(n)) { m.transparent = true; m.depthWrite = false; m.envMapIntensity = 1.5; if (/Curing/.test(n)) { m.opacity = .09; o.castShadow = false; o.receiveShadow = false; } }
    if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
    if (/Concrete$/.test(n)) { m.envMapIntensity = .5; m.roughness = 1; }
    if (m.map) m.map.anisotropy = 8;
  });
}
tune(PLANT); tune(YARD);

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 34, key: 2.3, shadow: 0, map: 4096, y: .03 });
  const out = { scene, fov: 30, wide: true };
  const world = new THREE.Group(); world.position.x = OX; scene.add(world);
  const plant = PLANT.clone(true), yard = YARD.clone(true); world.add(plant, yard);
  const N = {}; yard.traverse(o => { if (o.name) N[o.name] = o; });
  let sandMat = null, hl = 0; plant.traverse(o => { if (o.name === 'Pile_Sand' && o.material) { sandMat = o.material = o.material.clone(); sandMat.emissive = new THREE.Color(1, .37, .16); sandMat.emissiveIntensity = 0; } });   /* the fine-aggregate pile can be picked out (M-Sand page) */
  if (N.YardGround) N.YardGround.position.y -= .012;
  const shadow = (t, x, z, w, d, y) => { const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, color: 0x120f0c, transparent: true, opacity: .8, depthWrite: false, toneMapped: false })); g.rotation.x = -Math.PI / 2; g.position.set(x, y, z); g.renderOrder = 1; world.add(g); };
  shadow(SH1, 18, .5, 50, 21, .012); shadow(SH2, 22.8, 15.4, 56.4, 14.4, .016);
  /* the plant's transit-truck bay is not used here */
  const proto = N.ProtoBlock, protoP = N.ProtoPallet; proto.visible = false; protoP.visible = false;

  /* aggregate on the belts, as in the plant */
  const COL = [new THREE.Color(.055, .055, .06), new THREE.Color(.24, .245, .26), new THREE.Color(.62, .47, .28), new THREE.Color(.42, .43, .45)];
  const gy = PJ.gather[0][1] + .05, A = PJ.incline[0], B = PJ.incline[1], bx = PJ.bins, hop = [PJ.hopperX[0] - .4, 13.9];
  const paths = bx.map(x => [new V3(x, PJ.gate[0] - .15, 0), new V3(x, gy, 0), new V3(A[0], gy, 0), new V3(B[0], B[1], 0), new V3(PJ.head[0] + .3, PJ.head[1] - .2, 0), new V3(hop[0], hop[1], 0)]);
  const lens = paths.map(p => { const l = []; let t = 0; for (let i = 1; i < p.length; i++) { const d = p[i].distanceTo(p[i - 1]); l.push(d); t += d; } return { l, t }; });
  const NI = 300, r = rng(9), items = Array.from({ length: NI }, (_, i) => ({ src: i % 4, ph: r(), s: .09 + r() * .09, z: (r() - .5), o: r() * 6, k: .8 + r() * .5 }));
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, envMapIntensity: .6 }), NI); im.castShadow = true; im.frustumCulled = false; world.add(im);
  const at = (si, u) => { const P = paths[si], { l, t } = lens[si]; let d = u * t; for (let i = 0; i < l.length; i++) { if (d <= l[i]) return P[i].clone().lerp(P[i + 1], d / l[i]); d -= l[i]; } return P[P.length - 1].clone(); };
  const o3 = new THREE.Object3D();
  /* fresh concrete on the feed belt */
  const FB = YJ.belt, NF = 46, fm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8c8e92, roughness: .5, envMapIntensity: .8 }), NF); fm.frustumCulled = false; fm.castShadow = true; world.add(fm);
  const fr = rng(4), fi = Array.from({ length: NF }, () => ({ ph: fr(), s: .13 + fr() * .1, x: (fr() - .5) * .8 }));
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.18, .14, 1, 12), new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: .45 })); stream.castShadow = true; world.add(stream); const oy = PJ.mixer.outlet[1] - .1; stream.scale.y = oy - FB[0][1]; stream.position.set(YJ.mixx, (oy + FB[0][1]) / 2, 0);
  /* pallets of blocks leaving the machine */
  const PL = YJ.pallet, GX = YJ.gantry, NP = 6, pal = [];
  for (let i = 0; i < NP; i++) { const g = new THREE.Group(), p = protoP.clone(); p.position.set(0, 0, 0); g.add(p); [-.27, .27].forEach(z => { const b = proto.clone(); b.visible = true; b.position.set(0, YJ.block[1] / 2 + .04, z); g.add(b); }); const tm = new THREE.Group(); world.add(g); pal.push(g); }
  pal.forEach(g => g.traverse(o => { o.visible = true; o.castShadow = true; o.receiveShadow = true; }));
  const head = N.TamperHead, head0 = head.position.y;

  const V = (x, y, z, d, az = -20, el = 16) => ({ az, el, dist: d, t: [x + OX, y, z] });
  out.views = { all: V(24, 4.2, 6, 62, -14, 22), s1: V(6.4, 6.4, 0, 24), s2: V(24.8, 10.5, 1, 26, -22, 14), s3: V(24.8, 6, 3, 22, -26, 12), s4: V(24.75, 3.2, 13, 20, -28, 14), s5: V(31.5, 2.2, 13, 18, -24, 14), s6: V(40.5, 2.4, 13, 24, -24, 14) };
  out.limits = { az: [-85, 75], el: [3, 50], dist: [10, 100] };
  out.labels = [];
  let T = 0;
  out.update = (t, dt, st) => {
    const go = !reduceM(); if (go) T += dt;
    const on = !!(st && st.hl); hl += ((on ? 1 : 0) - hl) * (1 - Math.exp(-dt * 5)); if (sandMat) sandMat.emissiveIntensity = hl * 1.25;
    items.forEach((it, i) => { const u = go ? (T * .028 + it.ph) % 1 : it.ph, p = at(it.src, u); p.z += it.z * (.15 + .85 * ss(.12, .2, u) * (1 - ss(.74, .82, u))); const e = Math.max(.001, loopEnv(u, .02, .03)); o3.position.copy(p).add(new V3(0, it.s * .6, 0)); o3.scale.set(it.s * it.k * e, it.s * .7 * e, it.s * e); o3.rotation.set(it.o + u * 9, it.o, 0); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); im.setColorAt(i, it.src === 2 && on ? new THREE.Color(1, .37, .16) : COL[it.src]); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    fi.forEach((f, i) => { const u = go ? (T * .06 + f.ph) % 1 : f.ph, e2 = Math.max(.001, loopEnv(u, .04, .05)); o3.position.set(YJ.mixx + f.x * .8, FB[0][1] + f.s * .6, FB[0][2] + u * (FB[1][2] - FB[0][2])); o3.scale.set(f.s * 1.2 * e2, f.s * .8 * e2, f.s * 1.2 * e2); o3.rotation.set(0, 0, 0); o3.updateMatrix(); fm.setMatrixAt(i, o3.matrix); });
    fm.instanceMatrix.needsUpdate = true;
    const cyc = go ? (T / 9) % 1 : .2, press = cyc > .3 && cyc < .5 ? Math.sin((cyc - .3) / .2 * Math.PI) : 0;
    head.position.y = head0 + .55 - press * .55 + (press > .05 ? Math.sin(T * 45) * .018 : 0);
    pal.forEach((g, i) => { const u = go ? (T / 9 * 1 + i / NP) % 1 : i / NP, x = PL.x0 + 1.1 + u * (GX - .2 - PL.x0 - 1.1), e = u < .06 ? u / .06 : u > .94 ? (1 - u) / .06 : 1; g.position.set(x, PL.y + .07, PL.z); g.scale.setScalar(Math.max(.001, e)); });
    return go || hl > .01;
  };
  return out;
}
