/* scene: the two plants behind WMM and GSB (WMM and GSB pages). Two sets, one module.
   src   : "from quarry to fraction stockpiles". Blender model assets/3d/om-group-wmm-source.glb (scripts/excavator3d/build-wmm.py): a benched rock pile, a feed conveyor into a jaw crusher on a frame (hopper,
           two orange flywheels, motor), a conveyor up to a two-deck vibrating screen on coil springs, and a long product conveyor over a row of five fraction stockpiles (40 mm, 20 mm, 10 mm, 6 mm,
           screenings). The stockpiles are photo-textured angular stones (coarse) and grain-shader heaps (fine). Stone rides the belts; the stage buttons move the camera along the plant.
   plant : "the wet-mix plant". assets/3d/om-group-wmm-plant.glb: four aggregate bins on a frame with variable-speed feeders, a gathering belt, an inclined conveyor, an oversize screen, a twin-shaft pugmill with
           a glass side wall and a water spray bar, a discharge hopper over the OM GROUP tipper, a water tank and pump, a control cabin. A switch shows the mix too dry (dusty, pale), properly conditioned (dark, damp)
           or too wet (glossy slurry with a puddle). The paddle shafts turn.
   General plants: no capacity, feed rate, water content or test value is shown or implied. Numbered markers, key beside the figure. 1 unit = 1 m. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { crushed, grainMat, buildHeap, plant } from '/assets/application-s3d-msand.js';
import { reduceM } from '/assets/application-s3d-rdkit.js';
import { segEnv, crispLogo } from '/assets/application-s3d-flow.js';
import { tipperTruck } from '/assets/application-s3d-tipper.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
const ld = u => new GLTFLoader().loadAsync(u).then(g => g.scene), js = u => fetch(u).then(r => r.json());
const [SRC, SJ, PLT, PJ] = await Promise.all([ld('/assets/3d/om-group-wmm-source.glb'), js('/assets/3d/om-group-wmm-source.json'), ld('/assets/3d/om-group-wmm-plant.glb'), js('/assets/3d/om-group-wmm-plant.json')]);
[SRC, PLT].forEach(root => root.traverse(o => {
  if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const m = o.material; if (!m) return; m.envMapIntensity = .85; const n = m.name || '';
  if (/Concrete$/.test(n)) { m.envMapIntensity = .5; m.roughness = 1; } if (/Pile|Gravel/.test(n)) m.envMapIntensity = .55;
  if (/PugGlass|CabinGlass/.test(n)) { m.transparent = true; m.depthWrite = false; m.envMapIntensity = 1.4; o.castShadow = false; o.renderOrder = 6; }
  if (/PlantWater/.test(n)) { m.transparent = true; m.depthWrite = false; }
  if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
  if (m.map) m.map.anisotropy = 8;
}));
const FR = [{ k: '40', r: 1.1, n: 70 }, { k: '20', r: .58, n: 190 }, { k: '10', r: .3, n: 520 }, { k: '6' }, { k: 'scr' }];

export default function build({ state }) {
  const set = state.set === 'plant' ? 'plant' : 'src', narrow = matchMedia('(max-width:640px)').matches;
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 42, key: 2.4, shadow: .3, map: 4096, y: .03 });
  key.shadow.bias = -.0002; key.shadow.normalBias = .04;
  const out = { scene, fov: 30, wide: true }; const world = new THREE.Group(); scene.add(world);
  const RS = realStones('quarry'), stoneM = realStoneMaterial({ tint: .4, bump: .03, floor: 0, gain: .82, contrast: .74, scale: .6, soft: 1, grain: .3, own: true });
  const GA = [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), GS = [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), GT = [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')), gm = grainMat({ bump: .12 });
  const o3 = new THREE.Object3D(), tmp = new V3();
  const lab = (id, text, a, vs, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: st => vs.includes(st.view || 'all') });
  const lnA = (pts, speed) => { let L = 0; const l = []; for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); l.push(d); L += d; } return { pts, l, L, speed, time: L / speed }; };
  const place = (SEG, phase, o) => { const CYC = SEG.reduce((a, s) => a + s.time, 0); let t = ((phase % CYC) + CYC) % CYC; for (const sg of SEG) { if (t <= sg.time) { let d = t / sg.time * sg.L; for (let k = 0; k < sg.l.length; k++) { if (d <= sg.l[k]) return o.copy(sg.pts[k]).lerp(sg.pts[k + 1], d / sg.l[k]); d -= sg.l[k]; } return o.copy(sg.pts[sg.pts.length - 1]); } t -= sg.time; } return o; };
  const imesh = (geos, n, mat) => geos.map(g => { const im = new THREE.InstancedMesh(g, mat, Math.ceil(n / geos.length) + 1); im.frustumCulled = false; im.castShadow = false; world.add(im); return im; });
  let T0 = 0;

  if (set === 'src') {
    world.add(SRC.clone(true)); const P = SJ.prod, F = SJ.feed, M = SJ.mid, SC = SJ.screen;
    /* the five fraction stockpiles */
    const R = 3.2, Hh = 3.5; const mkPile = (f, i, x) => {
      const g = new THREE.Group(); g.position.set(x, 0, 0); world.add(g);
      if (f.n) { const r = rng(300 + i), per = RS.map(() => []); for (let j = 0; j < f.n; j++) { const rr = R * Math.sqrt(r()), a = r() * TAU, h = Hh * Math.pow(Math.max(0, 1 - (rr / R) ** 2), .85), s = f.r * (.8 + r() * .4); per[(r() * RS.length) | 0].push([Math.cos(a) * rr, Math.max(s * .6, h - r() * s * 2.2), Math.sin(a) * rr, s]); }
        const cone = new THREE.Mesh(new THREE.ConeGeometry(R * .97, Hh * .92, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 1, side: THREE.DoubleSide })); cone.position.y = Hh * .46; g.add(cone);
        per.forEach((arr, gi) => { if (!arr.length) return; const im = new THREE.InstancedMesh(RS[gi], stoneM, arr.length); arr.forEach((it, k) => { o3.position.set(it[0], it[1], it[2]); o3.scale.set(it[3], it[3] * .8, it[3]); o3.rotation.set(r() * 6, r() * 6, r() * 6); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); }); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; g.add(im); });
      } else { const sc = R / 15, scr = f.k === 'scr', h = buildHeap({ R: 15, nC: scr ? 0 : 600, nM: 3000, nF: 8500, nH: 0, seed: 170 + i * 5, maxD: scr ? 1.6 : 6.2, gs: scr ? .34 : .55, tint: scr ? [1.05, 1.05, 1.1] : null, csf: (scr ? .1 : .2) * sc, csm: (scr ? .3 : .5) * sc, dust: scr ? .5 : .28 });
        h.group.scale.set(sc, Hh * .92 / (15 * .68), sc); g.add(h.group); if (!scr) plant(h.group, h.items.coarse, GA, gm, 171 + i, true); plant(h.group, h.items.mid, GS, gm, 172 + i, true); plant(h.group, h.items.fine, GT, gm, 173 + i, false); }
    };
    FR.forEach((f, i) => mkPile(f, i, SJ.piles[i].x));
    const fa = new V3(F.a[0], F.a[1] + .15, 0), fb = new V3(F.b[0], F.b[1] + .15, 0), pa = new V3(M.a[0], M.a[1] + .15, 0), pb = new V3(M.b[0], M.b[1] + .15, 0), sa = new V3(P.a[0], P.a[1] + .15, 0), sb = new V3(P.b[0], P.b[1] + .15, 0);
    const scrA = new V3(SC.x0 + .5 * Math.cos(SC.th), SC.y0 + .5 * Math.sin(SC.th) + .5, 0), scrB = new V3(SC.x0 + SC.L * Math.cos(SC.th), SC.y0 + SC.L * Math.sin(SC.th) + .3, 0);
    const SEG = [lnA([new V3(fa.x - .4, .9, 0), fa, fb, new V3(SJ.crusher.x, SJ.crusher.top - .6, 0)], 1.3), lnA([new V3(pa.x, pa.y, 0), pb, scrA], 1.3), lnA([scrA, scrB, sa], .9), lnA([sa, sb], 1.4)];
    const NR = 120, parts = Array.from({ length: NR }, (_, i) => ({ ph: i / NR * SEG.reduce((a, s) => a + s.time, 0), s: .12 + Math.random() * 0 + (i % 7) * .02, z: ((i * 37) % 10 / 10 - .5) * .6, o: i * 1.7, k: .8 + (i % 5) * .1 }));
    const ims = imesh(RS, NR, stoneM), col = new THREE.Color();
    const v = (az, el, dist, t) => ({ az, el, dist, t });
    out.views = { all: v(-14, 17, narrow ? 112 : 82, [8, 3.6, 0]), rock: v(18, 15, 30, [-22, 3, -1]), crush: v(-18, 14, 26, [-11, 5, 0]), screen: v(-22, 15, 26, [4, 6, 0]), stock: v(-14, 17, narrow ? 62 : 46, [28, 3.4, 0]) };
    out.limits = { az: [-85, 75], el: [3, 55], dist: [8, 120] };
    out.labels = [lab('r', 'Source rock: a benched hard-rock face', new V3(SJ.rock.x, SJ.rock.h + .8, 0), ['all', 'rock'], 'warn'), lab('j', 'Primary crusher', new V3(SJ.crusher.x, SJ.crusher.top + .6, 0), ['all', 'crush'], 'hot'), lab('v', 'Vibrating screen', new V3(SC.x0 + 3.3, SC.y0 + 2, 0), ['all', 'screen'], 'hot'), lab('s', 'Five fraction stockpiles', new V3(SJ.piles[2].x, 4.8, 2), ['all', 'stock'], 'hot')];
    out.update = (t, dt, st) => {
      const go = !reduceM() && st.play !== false; if (go) T0 += dt; const ph0 = go ? T0 : 6; const per = RS.map(() => 0);
      parts.forEach((p, i) => { place(SEG, p.ph + ph0 * 1.0, tmp); const e = Math.max(.001, segEnv(SEG, p.ph + ph0 * 1.0)); const gi = i % RS.length, k = per[gi]++; o3.position.copy(tmp); o3.position.z += p.z; o3.position.y += p.s * .5; o3.scale.set(p.s * p.k * e, p.s * .8 * e, p.s * e); o3.rotation.set(p.o + ph0, p.o, 0); o3.updateMatrix(); ims[gi].setMatrixAt(k, o3.matrix); });
      ims.forEach((im, gi) => { im.count = per[gi]; im.instanceMatrix.needsUpdate = true; }); void col;
      return go;
    };
    return out;
  }

  /* plant */
  world.add(PLT.clone(true)); const BN = PJ.bins, G = PJ.gather, I = PJ.incl, PG = PJ.pug, D = PJ.dis;
  let shA = null, shB = null; world.traverse(o => { if (o.name === 'ShaftA') shA = o; if (o.name === 'ShaftB') shB = o; });
  const tp = tipperTruck(); tp.g.scale.setScalar(1); tp.g.rotation.y = Math.PI; tp.g.position.set(D[0] + 4.6, 0, 0); tp.tilt(0); tp.fill(.55); world.add(tp.g);
  const ga = new V3(G.a[0], G.a[1] + .15, 0), gb = new V3(G.b[0], G.b[1] + .15, 0), ia = new V3(I.a[0], I.a[1] + .15, 0), ib = new V3(I.b[0], I.b[1] + .15, 0);
  const SEG = [lnA([ga, gb, ia, ib, new V3(ib.x + .4, ib.y - .4, 0), new V3(PG.x0 + .6, PG.y + .5, 0)], 1.5)];
  const NP = 110, parts = Array.from({ length: NP }, (_, i) => ({ ph: i / NP * SEG[0].time, s: .1 + (i % 6) * .02, z: ((i * 53) % 10 / 10 - .5) * .5, o: i * 1.3 })), ims = imesh(GA, NP, gm), per = GA.map(() => 0), cc = new THREE.Color();
  /* the mix in the trough: grains jostled by the paddles, coloured by condition */
  const NM = 300, mix = imesh(GA, NM, gm), rm = rng(9), mp = Array.from({ length: NM }, (_, i) => ({ x: PG.x0 + .6 + rm() * (PG.x1 - PG.x0 - 1.4), y: PG.y - .55 + rm() * .45, z: (rm() - .5) * 1.5, s: .09 + rm() * .1, o: rm() * 6, sp: .6 + rm() * .8, gi: i % GA.length, c: .6 + rm() * .6 }));
  const mixCol = { dry: [1.7, 1.65, 1.55], ok: [.7, .7, .75], wet: [.5, .5, .56] };
  const puddle = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, .03, 40), new THREE.MeshPhysicalMaterial({ color: 0x2a3036, roughness: .05, transparent: true, opacity: .8, clearcoat: 1, depthWrite: false })); puddle.position.set(D[0] + 4.6, .03, 0); world.add(puddle);
  const dcv = document.createElement('canvas'); dcv.width = dcv.height = 64; { const g = dcv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(200,194,182,.5)'); gr.addColorStop(1, 'rgba(200,194,182,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const dtex = new THREE.CanvasTexture(dcv), dust = Array.from({ length: 12 }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dtex, transparent: true, depthWrite: false, opacity: 0 })); m.renderOrder = 7; world.add(m); return { m, ph: i / 12 }; });
  const wmat = new THREE.MeshPhysicalMaterial({ color: 0xcfe4f2, roughness: .05, transparent: true, opacity: .6, depthWrite: false }), wd = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), wmat, 40); wd.frustumCulled = false; wd.renderOrder = 6; world.add(wd);
  const fallP = Array.from({ length: 60 }, (_, i) => ({ ph: i / 60, s: .07 + (i % 4) * .02, x: ((i * 29) % 10 / 10 - .5) * .5, z: ((i * 17) % 10 / 10 - .5) * .5 })), fi = imesh(GA, 60, gm), fper = GA.map(() => 0);
  const v = (az, el, dist, t) => ({ az, el, dist, t });
  out.views = { all: v(-16, 18, narrow ? 120 : 88, [-4, 6, -1]), feed: v(-10, 16, narrow ? 64 : 48, [-24, 4, -1]), mix: v(-18, 18, narrow ? 40 : 30, [20, 6.2, 0]) };
  out.limits = { az: [-85, 75], el: [3, 55], dist: [8, 130] };
  out.labels = [lab('b', 'Aggregate feed bins, one per fraction', new V3(BN[1].x, 6, 2.6), ['all', 'feed'], 'hot'), lab('f', 'Variable-speed feeders', new V3(BN[0].x, 1.9, 1.2), ['all', 'feed']), lab('c', 'Conveyor to the mixer', new V3((I.a[0] + I.b[0]) / 2, (I.a[1] + I.b[1]) / 2 + 1.4, 1), ['all', 'feed']), lab('p', 'Pugmill: forced mixing with controlled water', new V3((PG.x0 + PG.x1) / 2, PG.y + 1.6, 1), ['all', 'mix'], 'hot'), lab('w', 'Water supply', new V3(PJ.water.x, 4.2, PJ.water.z), ['all', 'mix']), lab('d', 'Discharge to a covered tipper', new V3(D[0], D[1] - .5, 1.2), ['all', 'mix'])];
  let curCond = '';
  out.update = (t, dt, st) => {
    const go = !reduceM() && st.play !== false; if (go) T0 += dt; const ph0 = go ? T0 : 5, cond = st.cond || 'ok';
    if (shA && go) { shA.rotation.x += dt * 1.6; shB.rotation.x -= dt * 1.6; }
    per.fill(0); parts.forEach((p, i) => { place(SEG, p.ph + ph0, tmp); const e = Math.max(.001, segEnv(SEG, p.ph + ph0)); const gi = i % GA.length, k = per[gi]++; o3.position.copy(tmp); o3.position.z += p.z; o3.position.y += p.s * .5; o3.scale.set(p.s * e, p.s * .8 * e, p.s * e); o3.rotation.set(p.o + ph0, p.o, 0); o3.updateMatrix(); ims[gi].setMatrixAt(k, o3.matrix); cc.setRGB(...mixCol.dry.map(c => c * .25)); ims[gi].setColorAt(k, cc); });
    ims.forEach((im, gi) => { im.count = per[gi]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
    const mc = mixCol[cond], mper = GA.map(() => 0);
    mp.forEach(p => { const a = ph0 * p.sp * 1.6 + p.o, k = mper[p.gi]++; o3.position.set(p.x + Math.sin(a) * .22, p.y + Math.abs(Math.sin(a * 1.3)) * .22 * (cond === 'dry' ? .6 : 1), p.z + Math.cos(a * .8) * .2); o3.scale.set(p.s, p.s * .8, p.s); o3.rotation.set(a, p.o, a * .5); o3.updateMatrix(); mix[p.gi].setMatrixAt(k, o3.matrix); cc.setRGB(mc[0] * p.c * .45, mc[1] * p.c * .45, mc[2] * p.c * .45); mix[p.gi].setColorAt(k, cc); });
    mix.forEach((im, gi) => { im.count = mper[gi]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
    if (cond !== curCond) { curCond = cond; gm.roughness = cond === 'wet' ? .2 : cond === 'ok' ? .55 : .95; gm.needsUpdate = true; }
    puddle.visible = cond === 'wet'; dust.forEach(d => { const k = go ? (ph0 * .2 + d.ph) % 1 : d.ph; d.m.position.set(PG.x0 + 1.2 + k * (PG.x1 - PG.x0 - 2), PG.y + .4 + k * 1.2, (d.ph - .5) * 1.4); const s = 1 + k * 2.2; d.m.scale.set(s, s, 1); d.m.material.opacity = cond === 'dry' ? Math.sin(Math.PI * k) * .35 : 0; });
    const nW = cond === 'dry' ? 8 : cond === 'ok' ? 24 : 40; for (let i = 0; i < 40; i++) { const k = (ph0 * .9 + i / 40) % 1, x = PG.x0 + 1.4 + (i % 6) * 1.3; o3.position.set(x, PG.y + 1.0 - k * .8, 0); o3.scale.setScalar(i < nW ? .035 * (1 - k * .5) : .0001); o3.rotation.set(0, 0, 0); o3.updateMatrix(); wd.setMatrixAt(i, o3.matrix); } wd.instanceMatrix.needsUpdate = true;
    fper.fill(0); fallP.forEach((p, i) => { const k = go ? (ph0 * .8 + p.ph) % 1 : p.ph, gi = i % GA.length, n = fper[gi]++; o3.position.set(D[0] + p.x, D[1] - k * (D[1] - 1.8) + .0, p.z); o3.scale.setScalar(p.s * (cond === 'dry' ? .8 : 1)); o3.rotation.set(k * 9, k * 5, 0); o3.updateMatrix(); fi[gi].setMatrixAt(n, o3.matrix); });
    fi.forEach((im, gi) => { im.count = fper[gi]; im.instanceMatrix.needsUpdate = true; });
    return go;
  };
  return out;
}
