/* scene: two different ways of looking at the fine material in a sand sample. Left: a field silt-jar screening (a jar of water and sand settling in layers).
   Right: a laboratory determination of material finer than 75 microns (a 75 µm IS test sieve with a sample, the fines passing through to the pan).
   The two measure different things and must not be compared as if they were the same number. No percentage, result or limit is shown on the 3D model. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, hotMat, inst, moundItems, moundBase, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk } = L;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };

const JX = -8.5, SX = 8.5, JR = 2.1, JH = 7.2;
export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 20, key: 2.2, shadow: .22, map: 2048 });
  const gmat = grainMat(), hot = hotMat();
  const add = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };
  add(mk(new THREE.BoxGeometry(34, .3, 12), new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: .85 })), 0, -.15, 0);

  /* ── field silt jar ── */
  const jar = new THREE.Group(); jar.position.set(JX, 0, 0); scene.add(jar);
  const glassJ = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, JH, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .03, transparent: true, opacity: .16, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide })); glassJ.position.y = JH / 2 + .2; jar.add(glassJ);
  const rimJ = new THREE.Mesh(new THREE.TorusGeometry(JR, .07, 10, 48), M.chrome); rimJ.rotation.x = Math.PI / 2; rimJ.position.y = JH + .2; jar.add(rimJ);
  const floorJ = mk(new THREE.CylinderGeometry(JR + .08, JR + .12, .22, 48), M.white); floorJ.position.y = .1; jar.add(floorJ);
  const waterJ = new THREE.Mesh(new THREE.CylinderGeometry(JR - .03, JR - .03, JH - 1.2, 48), new THREE.MeshPhysicalMaterial({ color: 0x8cc6df, roughness: .06, transparent: true, opacity: .3, depthWrite: false })); waterJ.position.y = .2 + (JH - 1.2) / 2; waterJ.renderOrder = 3; jar.add(waterJ);
  /* three layers: sand (settles first), silt, a thin clay-coloured film on top. Heights are drawn for the picture and are not a measurement */
  const LAYS = [{ h: 2.2, c: 0xb89f78 }, { h: .95, c: 0x8d8579 }, { h: .45, c: 0xb4836b }];
  const layers = LAYS.map(l => { const m = new THREE.Mesh(new THREE.CylinderGeometry(JR - .06, JR - .06, 1, 48), new THREE.MeshStandardMaterial({ color: l.c, roughness: 1 })); jar.add(m); return m; });
  /* suspended grains that settle */
  const NS = 360, rs = rng(21), sg = grainGeos('subf', 'washed'), sus = new THREE.InstancedMesh(sg[1], gmat, NS); sus.frustumCulled = false; jar.add(sus);
  const sp = []; for (let i = 0; i < NS; i++) { const k = i < 90 ? 0 : i < 250 ? 1 : 2; sp.push({ k, a: rs() * TAU, rr: Math.sqrt(rs()) * (JR - .3), ph: rs(), s: [.17, .1, .06][k] * (.8 + rs() * .5), o: rs() * 6 }); }
  /* ticks are unmarked on purpose: no number is drawn on the jar */
  const jt = new THREE.Mesh(new THREE.BoxGeometry(JR * 2.1, .04, .04), new THREE.MeshBasicMaterial({ color: 0xff5e29 })); jt.visible = false; jar.add(jt);

  /* ── laboratory 75 micron sieve ── */
  const lab = new THREE.Group(); lab.position.set(SX, 0, 0); scene.add(lab);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc2a96e, metalness: .85, roughness: .3 });
  const pan = mk(new THREE.CylinderGeometry(3.3, 2.9, 1.6, 56), M.white); pan.position.y = .9; lab.add(pan);
  const panIn = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, .06, 48), new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: .6, roughness: .4 })); panIn.position.y = 1.6; lab.add(panIn);
  const sieve = new THREE.Group(); sieve.position.y = 3; lab.add(sieve);
  const body = mk(new THREE.CylinderGeometry(3.25, 3.25, 1.5, 56, 1, true), brass); body.material = brass.clone(); body.material.side = THREE.DoubleSide; sieve.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.25, .1, 10, 56), brass); ring.rotation.x = Math.PI / 2; ring.position.y = .75; sieve.add(ring);
  const meshD = new THREE.Mesh(new THREE.CircleGeometry(3.2, 56), new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: .38, alphaMap: M.mesh.alphaMap, alphaTest: .4, side: THREE.DoubleSide })); meshD.material.alphaMap = M.mesh.alphaMap.clone(); meshD.material.alphaMap.repeat.set(40, 40); meshD.material.alphaMap.needsUpdate = true; meshD.rotation.x = -Math.PI / 2; meshD.position.y = -.5; sieve.add(meshD);
  const rl = rng(33), heap = new THREE.Group(); heap.position.y = -.45; sieve.add(heap); heap.add(moundBase(2.7, .8, 0x8f8068)); inst(heap, moundItems(760, 2.6, .75, () => .07 + rl() * .16, rl), grainGeos('sub', 'river'), gmat, 3, false);
  const NF = 150, rf = rng(41), fgm = new THREE.InstancedMesh(grainGeos('subf', 'dust')[2], gmat, NF); fgm.frustumCulled = false; lab.add(fgm);
  const fp = []; for (let i = 0; i < NF; i++) fp.push({ x: (rf() - .5) * 4.4, z: (rf() - .5) * 4.4, ph: rf(), s: .035 + rf() * .045, sp: .35 + rf() * .5 });
  const cap = mk(new THREE.CylinderGeometry(3.28, 3.28, .12, 56), M.white); cap.position.set(0, 7.2, 0); cap.visible = false; lab.add(cap);
  /* the fines that have passed settle on the pan */
  const fines = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.9, .22, 40), new THREE.MeshStandardMaterial({ color: 0x9a9185, roughness: 1 })); fines.position.y = 1.72; lab.add(fines);
  /* 75 µm indicator ring, orange */
  const ind = new THREE.Mesh(new THREE.TorusGeometry(3.45, .08, 10, 56), new THREE.MeshStandardMaterial({ color: 0xff5e29, emissive: 0xff5e29, emissiveIntensity: .4, roughness: .4 })); ind.rotation.x = Math.PI / 2; ind.position.y = 3.05; lab.add(ind);

  const views = {
    both: { az: -6, el: 22, dist: 36, t: [0, 3.6, 0] }, jar: { az: -16, el: 14, dist: 21, t: [JX, 4, 0] }, lab: { az: -18, el: 24, dist: 21, t: [SX, 2.6, 0] },
    mesh: { az: -12, el: 52, dist: 9, t: [SX + .3, 2.5, 0] },
  };
  const labels = [
    { id: 'j', text: 'Field silt-jar screening', side: 'r', anchor: new V3(JX, JH + .6, 0), show: st => st.view !== 'lab' && st.view !== 'mesh' },
    { id: 'j1', text: 'Sand settles first', side: 'l', tone: 'std', anchor: new V3(JX - JR, 1.5, 0), show: st => st.view === 'jar' },
    { id: 'j2', text: 'Finer material settles above it', side: 'l', anchor: new V3(JX - JR, 3.4, 0), show: st => st.view === 'jar' },
    { id: 'l', text: 'Laboratory: finer than 75 µm', side: 'r', tone: 'hot', anchor: new V3(SX, 5.4, 0), show: st => st.view !== 'jar' },
    { id: 'l1', text: '75 µm IS test sieve', side: 'r', tone: 'hot', anchor: new V3(SX + 3.4, 3.2, 0), show: st => st.view === 'lab' || st.view === 'mesh' },
    { id: 'l2', text: 'Fines that pass the mesh', side: 'l', anchor: new V3(SX - 2.6, 1.8, 2.4), show: st => st.view === 'lab' },
  ];
  const o3 = new THREE.Object3D(); let tp = 0, lastSync = 0;
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-70, 70], el: [6, 78], dist: [5, 60] },
    update(t, dt, st, fig) {
      let anim = false; const still = reduce();
      if (st.play && !still) { tp += dt; const cyc = 12, k = (tp % cyc) / cyc; st.settle = clamp(k / .8); anim = true; if (t - lastSync > .12) { lastSync = t; fig.sync(); } }
      const S = st.settle ?? 1;
      /* layers grow in turn: sand, then silt, then the thin top film */
      let y = .31; layers.forEach((m, i) => { const k = sm((S - [0, .28, .62][i]) / [.34, .36, .38][i]), h = Math.max(.001, LAYS[i].h * k); m.scale.y = h; m.position.y = y + h / 2; y += h; });
      /* the water clears as the fine material settles */
      waterJ.material.opacity = .46 - .2 * sm((S - .2) / .8); waterJ.material.color.setRGB(.58 - .08 * S, .62 + .05 * S, .7 + .08 * S);
      sp.forEach((p, i) => { const sSet = [.3, .66, 1][p.k], u = clamp(S / sSet), top = JH - 1.4, bot = y + .08 + p.ph * .12, yy = (p.k === 0 ? top * .9 : top) * (1 - sm(u)) + bot * sm(u), vis = u < 1 ? 1 : 0; o3.position.set(Math.cos(p.a + (still ? 0 : t * .2)) * p.rr, .25 + yy * (.35 + .65 * p.ph) * (1 - sm(u)) + (bot - .25) * sm(u), Math.sin(p.a + (still ? 0 : t * .2)) * p.rr); o3.scale.setScalar(p.s * vis); o3.rotation.set(p.o, p.o * 2, 0); o3.updateMatrix(); sus.setMatrixAt(i, o3.matrix); }); sus.instanceMatrix.needsUpdate = true;
      /* fines falling through the 75 µm mesh */
      fp.forEach((p, i) => { const u = still ? p.ph : (t * p.sp * .5 + p.ph) % 1; o3.position.set(p.x, 3.7 - u * 1.9, p.z); o3.scale.setScalar(p.s * (u < .05 ? u / .05 : 1)); o3.rotation.set(u * 5, u * 3, 0); o3.updateMatrix(); fgm.setMatrixAt(i, o3.matrix); }); fgm.instanceMatrix.needsUpdate = true;
      sieve.position.x = still ? 0 : Math.sin(t * 22) * .012; ind.material.emissiveIntensity = .3 + (st.view === 'lab' || st.view === 'mesh' ? .25 * Math.sin(t * 2.2) : 0);
      return anim || !still;
    },
    onSet(k, v) { if (k === 'play' && v) tp = 0; },
  };
}
