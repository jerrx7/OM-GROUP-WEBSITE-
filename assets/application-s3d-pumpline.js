/* scene: concrete in a pump line, as a cutaway (Ready-mix concrete page, "Pumped concrete").
   Blender models: assets/3d/om-group-pump-line.glb (scripts/excavator3d/build-pump.py: pump unit with hopper, trestles, couplings, riser mast, a slab being cast with formwork, rebar and wet
   concrete) and the OM GROUP transit mixer (assets/3d/om-group-transit-mixer.glb) backed up to the hopper with its drum turning. The pipeline is a transparent tube drawn larger than a real
   line so the mix can be seen: 20 mm stones (photo-textured), sand grains and cement paste move along it. A switch changes the mix between a cohesive one and one prone to segregation
   (a picture of the idea, not a simulation). No pressure, rate, distance or pumpability result is shown. No labels on the picture. 1 unit = 1 m. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
import { loopEnv, crispLogo } from '/assets/application-s3d-flow.js';
import { crushed, grainMat, mineral, sandOf } from '/assets/application-s3d-msand.js';
const { clamp } = L;
const V3 = THREE.Vector3, TAU = Math.PI * 2;

const ld = u => new GLTFLoader().loadAsync(u).then(g => g.scene);
const [PUMP, TRUCK, PJ, MJ] = await Promise.all([ld('/assets/3d/om-group-pump-line.glb'), ld('/assets/3d/om-group-transit-mixer.glb'), fetch('/assets/3d/om-group-pump-line.json').then(r => r.json()), fetch('/assets/3d/om-group-transit-mixer.json').then(r => r.json())]);
const LOGO = new THREE.TextureLoader().load('/assets/om-group-machine-logo.png'); LOGO.colorSpace = THREE.SRGBColorSpace; LOGO.anisotropy = 8;
const SHADOW = new THREE.TextureLoader().load('/assets/3d/om-group-pump-line-shadow.webp', t => { t.colorSpace = THREE.NoColorSpace; });
function tune(root) {
  root.traverse(o => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const m = o.material; if (!m) return; m.envMapIntensity = .85; const n = m.name || ''; if (o.name === 'Hopper') { m.side = THREE.DoubleSide; m.color.multiplyScalar(.9); }
    if (/CabinGlass|CabGlass|PumpGlass/.test(n)) { m.transparent = true; m.depthWrite = false; m.envMapIntensity = 1.5; }
    if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
    if (/Concrete$/.test(n)) { m.envMapIntensity = .5; m.roughness = 1; }
    if (/WetConcrete/.test(n)) { m.envMapIntensity = 1.1; }
    if (m.map) m.map.anisotropy = 8;
  });
}
tune(PUMP); tune(TRUCK);

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 30, key: 2.3, shadow: 0, map: 4096, y: .03 });
  const out = { scene, fov: 30, wide: true };
  const world = new THREE.Group(); scene.add(world);
  const pump = PUMP.clone(true); world.add(pump);
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(66, 24), new THREE.MeshBasicMaterial({ map: SHADOW, color: 0x120f0c, transparent: true, opacity: .8, depthWrite: false, toneMapped: false })); g.rotation.x = -Math.PI / 2; g.position.set(2, .014, 0); g.renderOrder = 1; world.add(g); }

  /* the transit mixer, rear to the hopper, drum in the plant colours with the mark curved onto it */
  const truck = TRUCK.clone(true); truck.rotation.y = -Math.PI / 2; truck.position.set(PJ.hopper[0], 0, 5.75); world.add(truck);
  let drum = null; truck.traverse(o => { if (o.name === 'Drum') drum = o; });
  const rad = x => { const P = MJ.profile; if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const t = (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t; } return P[P.length - 1][1]; };
  truck.traverse(o => { if (o.isMesh && o.name === 'DrumOuter') { o.material = o.material.clone(); o.material.color.setRGB(.2, .2, .22); o.material.metalness = .25; o.material.roughness = .5; } });
  const patch = flip => {
    const w = 2.1, h = w * 534 / 787, xc = -.15, nx = 26, nr = 18, pos = [], uv = [], idx = [], R = rad(xc), span = h / R;
    for (let j = 0; j <= nr; j++) for (let i = 0; i <= nx; i++) { const x = xc - w / 2 + w * i / nx, r = rad(x) + .018, ph = (flip ? -Math.PI / 2 : Math.PI / 2) - span / 2 + span * j / nr; pos.push(x, r * Math.cos(ph), r * Math.sin(ph)); uv.push(flip ? 1 - i / nx : i / nx, flip ? j / nr : 1 - j / nr); }
    for (let j = 0; j < nr; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: LOGO, transparent: true, depthWrite: false, roughness: .5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide })); m.renderOrder = 4; return m;
  };
  if (drum) drum.add(patch(false), patch(true));
  /* a fresh-concrete stream from the truck's chute into the hopper */
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, 1, 12), new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: .4, envMapIntensity: .9 })); stream.castShadow = true; world.add(stream);

  /* the line */
  const R = PJ.radius, pts0 = PJ.path.map(p => new V3(p[0], p[1], 0)), path = new THREE.CurvePath();
  for (let i = 1; i < pts0.length; i++) if (pts0[i].distanceTo(pts0[i - 1]) > 1e-4) path.add(new THREE.LineCurve3(pts0[i - 1], pts0[i]));
  const LEN = path.getLength(), NP = 600, pts = [], tans = [];
  for (let i = 0; i <= NP; i++) { const u = i / NP; pts.push(path.getPointAt(u)); tans.push(path.getTangentAt(u)); }
  const at = (u, o, tn) => { const f = u * NP, i = Math.min(NP - 1, f | 0), k = f - i; o.copy(pts[i]).lerp(pts[i + 1], k); tn.copy(tans[i]).lerp(tans[i + 1], k).normalize(); };
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 320, R, 32, false), new THREE.MeshPhysicalMaterial({ color: 0xe3ecf2, roughness: .05, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.6 })); tube.renderOrder = 6; world.add(tube);
  const pasteMat = new THREE.MeshPhysicalMaterial({ color: 0xa8a294, roughness: .35, transparent: true, opacity: .5, depthWrite: false, clearcoat: .6, clearcoatRoughness: .2 });
  const paste = new THREE.Mesh(new THREE.TubeGeometry(path, 320, R * .92, 24, false), pasteMat); paste.renderOrder = 4; world.add(paste);

  /* the mix: photo-textured stones and sand grains */
  const LS = realStones('low'), sMat = realStoneMaterial({ tint: .6, bump: .03, floor: 0, gain: .95, contrast: .66, scale: .6, soft: 1, grain: .3, own: true });
  /* the sand: real fractured (or worn) grains with the shader of the sand figures, in the sand's own colours */
  const SO = sandOf(state), TT = SO.TT || [1, 1, 1], FG = SO.round ? [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')).concat([0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round'))) : [0, 1, 2, 3, 4].map(i => crushed(200 + i * 13, 'small'));
  const mF = grainMat(SO.round ? { bump: .05, rough: .6 } : { bump: .1 }); mF.emissive.set(0xff5e29); mF.emissiveIntensity = 0;
  const rg = rng(7117), NS = 90, NF = 2600;
  const mkInst = (geo, n, mat) => { const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.castShadow = false; world.add(im); return im; };
  const stoneIM = [0, 1, 2].map(k => mkInst(LS[k], 40, sMat)), fineIM = FG.map(g => mkInst(g, Math.ceil(NF / FG.length) + 2, mF));
  const stones = Array.from({ length: NS }, (_, i) => ({ s0: rg(), th: rg() * TAU, rho: Math.sqrt(rg()) * .62, sc: .14 + rg() * .08, rx: rg() * 6, ry: rg() * 6, rz: rg() * 6, j: rg(), w: i % 3 }));
  const fines = Array.from({ length: NF }, (_, i) => ({ s0: rg(), th: rg() * TAU, rho: Math.sqrt(rg()) * .86, sc: .038 + Math.pow(rg(), 1.4) * .05, rx: rg() * 6, ry: rg() * 6, rz: rg() * 6, j: rg(), w: i % FG.length, c: mineral(rg).map((v, k) => v * TT[k]) }));
  let hlNow = null; const recolor = hl => { const c = new THREE.Color(), n = FG.map(() => 0); fines.forEach(p => { if (hl) c.setRGB(1.5, .5, .16); else c.setRGB(p.c[0], p.c[1], p.c[2]); fineIM[p.w].setColorAt(n[p.w]++, c); }); fineIM.forEach(im => { im.instanceColor.needsUpdate = true; }); mF.emissiveIntensity = hl ? .35 : 0; hlNow = hl; }; recolor(false);
  const o3 = new THREE.Object3D(), pos = new V3(), tan = new V3(), nrm = new V3(), bin = new V3(0, 0, 1), SPEED = .016, PLUG = { u: .17, w: .075 };
  const place = (p, t, kSeg, isStone) => {
    let u = (p.s0 + t * SPEED) % 1, th = p.th, rho = p.rho;
    if (kSeg > 0) {
      let u2, th2, rho2;
      if (isStone) { u2 = PLUG.u + (p.s0 - .5) * PLUG.w + Math.sin(t * 5 + p.j * 40) * .0016; th2 = Math.PI * 1.5 + (p.th - Math.PI) * .18; rho2 = .38 + p.rho * .72; }
      else { u2 = (p.s0 + t * SPEED * 1.35) % 1; th2 = p.th * .6 + 1.1; rho2 = p.rho * .78; }
      let d = u2 - u; d -= Math.round(d); u = ((u + d * kSeg) % 1 + 1) % 1; th = th + (th2 - th) * kSeg; rho = rho + (rho2 - rho) * kSeg;
    }
    place.u = u; at(u, pos, tan); nrm.set(-tan.y, tan.x, 0); const rr = rho * R; pos.addScaledVector(nrm, Math.cos(th) * rr).addScaledVector(bin, Math.sin(th) * rr); return pos;
  };
  const cnt = [0, 0, 0]; let kSeg = 0, tt = 0;
  const hop = PJ.hopper, ch = new V3(hop[0], 1.7, .3);
  const views = {
    all: { az: -24, el: 14, dist: 54, t: [3, 6.2, 2] }, pump: { az: -82, el: 24, dist: 15, t: [-12.4, 1.6, 0.8] }, pipe: { az: -8, el: 8, dist: 13, t: [-1.5, 1.6, 0] },
    inside: { az: -62, el: 3, dist: 6.5, t: [-3, 1.4, 0] }, lift: { az: -16, el: 10, dist: 26, t: [8, 7, 0] }, end: { az: -24, el: 14, dist: 19, t: [15, 11.6, 0] },
  };
  return {
    scene, views, fov: 30, wide: true, labels: [], limits: { az: [-100, 45], el: [-2, 60], dist: [4.5, 90] },
    seek() { kSeg = state.mix === 'weak' ? 1 : 0; },
    update(t, dt, st) {
      const motion = !reduceM(), goal = st.mix === 'weak' ? 1 : 0; tt = motion ? tt + dt : 0;
      const kPrev = kSeg; kSeg += (goal - kSeg) * Math.min(1, dt * 2.6); if (!motion) kSeg = goal; if (Math.abs(goal - kSeg) < .002) kSeg = goal;
      const tm = motion ? tt : 2.2; cnt[0] = cnt[1] = cnt[2] = 0;
      stones.forEach(p => { const ps = place(p, tm, kSeg, true), im = stoneIM[p.w], i = cnt[p.w]++; o3.position.copy(ps); o3.scale.setScalar(p.sc * Math.max(.001, loopEnv(place.u, .012, .014))); o3.rotation.set(p.rx + tm * .15 * p.j, p.ry, p.rz); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); });
      stoneIM.forEach((im, k) => { im.count = cnt[k]; im.instanceMatrix.needsUpdate = true; });
      if (!!st.hl !== hlNow) recolor(!!st.hl);
      const fc = FG.map(() => 0); fines.forEach(p => { const ps = place(p, tm, kSeg, false), im = fineIM[p.w]; o3.position.copy(ps); o3.scale.setScalar(p.sc * Math.max(.001, loopEnv(place.u, .012, .014))); o3.rotation.set(p.rx, p.ry, p.rz); o3.updateMatrix(); im.setMatrixAt(fc[p.w]++, o3.matrix); });
      fineIM.forEach((im, k) => { im.count = fc[k]; im.instanceMatrix.needsUpdate = true; });
      pasteMat.color.setHex(0xa8a294).lerp(new THREE.Color(0xa9c7dd), kSeg * .9); pasteMat.opacity = .5 - kSeg * .16;
      if (drum) drum.rotation.x = motion ? t * .85 : 0;
      /* the stream: from the chute end to the hopper's concrete */
      const chute = new V3(); truck.updateMatrixWorld(true); let tipN = null; truck.traverse(o => { if (o.name === 'ChuteTrough') tipN = o; });
      if (tipN) { const bb = new THREE.Box3().setFromObject(tipN); chute.set((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2); stream.visible = true; const h = Math.max(.05, chute.y - 1.32); stream.scale.set(1, h, 1); stream.position.set(chute.x, chute.y - h / 2, chute.z); }
      return motion || Math.abs(goal - kSeg) > .001 || kPrev !== kSeg;
    },
  };
}
