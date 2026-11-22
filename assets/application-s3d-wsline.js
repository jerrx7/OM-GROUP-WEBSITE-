/* scene: a general sand washing-and-screening line (Washed Sand page, "Inside a general washing-and-screening line").
   Blender model assets/3d/om-group-sand-washing.glb (scripts/excavator3d/build-wash.py): a feed hopper, a rising feed conveyor, an inclined screw sand washer (open steel trough with a turning screw and a spray
   manifold), an overflow pipe to a round settling tank carrying the OM GROUP mark, a two-deck dewatering screen on coil springs, a product conveyor and a stockpile of washed sand. Sand (real worn grains,
   dull and dusty on the way in, clean and pale after the trough) rides the line; the loose fines leave with the water over the weir and fall into the settling tank, and a few are left in the product.
   A general line: no capacity, flow rate or fines figure is shown. The stage buttons (whole line, 1-5) move the camera along the plant. No labels on the picture, numbered markers and a key. 1 unit = 1 m. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { crushed, grainMat, buildHeap, plant, mineral } from '/assets/application-s3d-msand.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
import { ss, crispLogo } from '/assets/application-s3d-flow.js';
const V3 = THREE.Vector3, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const [PLANT, PJ] = await Promise.all([new GLTFLoader().loadAsync('/assets/3d/om-group-sand-washing.glb').then(g => g.scene), fetch('/assets/3d/om-group-sand-washing.json').then(r => r.json())]);
PLANT.traverse(o => {
  if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const m = o.material; if (!m) return; m.envMapIntensity = .85; const n = m.name || '';
  if (/GratingSteel/.test(n)) m.envMapIntensity = .7;
  if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
  if (/Concrete$/.test(n)) { m.envMapIntensity = .5; m.roughness = 1; }
  if (/TurbidWater|SprayWater/.test(n)) { m.transparent = true; m.depthWrite = false; m.envMapIntensity = 1.6; o.renderOrder = 4; o.castShadow = false; }
  if (/TroughGlass/.test(n)) { m.envMapIntensity = .4; o.castShadow = false; o.renderOrder = 5; }
  if (/CabinGlass/.test(n)) { m.transparent = true; m.depthWrite = false; }
  if (m.map) m.map.anisotropy = 8;
});
const TTD = [2.1, 1.6, 1.0], TTC = [3.2, 2.75, 1.95];                 /* dull, silty on the way in; clean and pale after washing */

export default function build() {
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 30, key: 2.4, shadow: .3, map: 4096, y: .03 });
  key.shadow.bias = -.0002; key.shadow.normalBias = .04;
  const out = { scene, fov: 30, wide: true };
  const world = new THREE.Group(); scene.add(world); const plant_ = PLANT.clone(true); world.add(plant_);
  let screw = null; plant_.traverse(o => { if (o.name === 'Screw') screw = o; });
  const T = PJ.trough, S = PJ.screen, TK = PJ.tank, F = PJ.feed, P = PJ.product, SP = PJ.stockpile, FP = PJ.feedpile;
  const inc = (x0, y0, th, s, v) => new V3(x0 + s * Math.cos(th) - v * Math.sin(th), y0 + s * Math.sin(th) + v * Math.cos(th), 0);

  /* two heaps of grain-shader sand: the incoming pile, dull and silty, and the washed stockpile, pale and clean */
  const heapAt = (o, tint, dust, seed) => { const sc = o.r / 15, h = buildHeap({ R: 15, nC: 0, nM: 3600, nF: 11000, nH: 0, seed, maxD: .85, gs: .5, tint, csf: .11 * sc, csm: .28 * sc, dust, TH: Math.tan(Math.min(40, Math.atan(o.h / (o.r * .68)) * 180 / Math.PI) * Math.PI / 180) });
    h.group.scale.setScalar(sc); h.group.position.set(o.x, 0, o.z); world.add(h.group); return h; };
  const G = [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')).concat([0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round'))), GT = [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny'));
  const pm = grainMat({ bump: .05, rough: .6 });
  { const h = heapAt(FP, TTD, .55, 31); plant(h.group, h.items.mid, G, pm, 32, true); plant(h.group, h.items.fine, GT, pm, 33, false); }
  { const h = heapAt(SP, TTC, .05, 41); plant(h.group, h.items.mid, G, pm, 42, true); plant(h.group, h.items.fine, GT, pm, 43, false); }

  /* ───────── the main sand, one long path: feed belt, chute, trough, chute, screen, product belt, stockpile; each stretch has its own pace ───────── */
  const tv = T.D * .62 + .16, tp = (s, v = tv) => inc(T.x0, T.y0, T.th, s, v), sp = (s, v) => inc(S.x0, S.y0, S.th, s, v);
  const lnA = (pts, speed) => { let L = 0; const l = []; for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); l.push(d); L += d; } return { pts, l, L, speed, time: L / speed }; };
  const fa = new V3(F.a[0], F.a[1] + .12, 0), fb = new V3(F.b[0], F.b[1] + .12, 0), pa = new V3(P.a[0], P.a[1] + .12, 0), pb = new V3(P.b[0], P.b[1] + .12, 0);
  const pile = (x, z) => { const rr = Math.hypot(x - SP.x, z - SP.z) / SP.r; return rr >= 1 ? 0 : SP.h * Math.pow(1 - Math.pow(rr, 1.55), 1.15); };
  const SEG = [
    lnA([new V3(fa.x - .3, 1.05, 0), fa, fb], 1.3),
    lnA([fb, new V3(fb.x + .55, fb.y - .6, 0), tp(.5, T.D + .2), tp(1.2)], 2.4),
    lnA([tp(1.2), tp(T.L - .2)], .62),
    lnA([tp(T.L - .2), tp(T.L + .55, T.D * .45), sp(.45, SH_(S))], 1.8),
    lnA([sp(.45, SH_(S)), sp(S.L - .1, .55)], .75),
    lnA([sp(S.L - .1, .55), new V3(S.low[0] + .2, S.low[1] - .5, 0), pa], 1.7),
    lnA([pa, pb], 1.3),
    lnA([pb, new V3(pb.x + .5, pb.y - .5, 0), new V3(SP.x - .7, pile(SP.x - .7, 0) + .12, 0)], 2.2),
  ];
  function SH_(s) { return s.h * .66; }
  const CYC = SEG.reduce((a, s) => a + s.time, 0);
  const place = (phase, out3) => { let t = ((phase % CYC) + CYC) % CYC; for (let i = 0; i < SEG.length; i++) { const sg = SEG[i]; if (t <= sg.time) { let d = t / sg.time * sg.L; for (let k = 0; k < sg.l.length; k++) { if (d <= sg.l[k]) return out3.copy(sg.pts[k]).lerp(sg.pts[k + 1], d / sg.l[k]); d -= sg.l[k]; } return out3.copy(sg.pts[sg.pts.length - 1]); } t -= sg.time; } return out3; };
  /* how clean the grain is (0 dull ... 1 pale), and whether a fine one has been taken away, from where it is in the cycle */
  const TROUGH_AT = SEG[0].time + SEG[1].time, TROUGH_END = TROUGH_AT + SEG[2].time;

  const NS = 230, rs = rng(7), sand = [], per = G.map(() => []); const o3 = new THREE.Object3D(), col = new THREE.Color(), tmp = new V3(), HOT = new THREE.Color(1.5, .5, .16);
  for (let i = 0; i < NS; i++) { const fine = i % 3 === 0, it = { ph: i / NS * CYC + rs() * .5, s: fine ? .035 + rs() * .03 : .06 + rs() * .06, z: (rs() - .5) * .55, o: rs() * 6, k: .8 + rs() * .5, c: mineral(rs), fine, keep: rs() < .22, gi: (rs() * G.length) | 0, ix: 0 }; sand.push(it); per[it.gi].push(it); }
  const ims = per.map((arr, gi) => { const im = new THREE.InstancedMesh(G[gi], pm, Math.max(1, arr.length)); im.count = arr.length; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; arr.forEach((a, k) => { a.ix = k; col.setRGB(a.c[0] * TTD[0], a.c[1] * TTD[1], a.c[2] * TTD[2]); im.setColorAt(k, col); }); world.add(im); return im; });

  /* ───────── the loose fines: they leave over the weir with the overflow, vanish into the pipe and fall into the settling tank ───────── */
  const w0 = new V3(T.weir[0][0], T.weir[0][1], 0), ov = PJ.overflow.map(p => new V3(p[0], p[1], p[2])), inlet = ov[ov.length - 1], tankSurf = TK.water;
  const NFN = 150, fines = Array.from({ length: NFN }, (_, i) => ({ ph: rs(), s: .055 + rs() * .05, z: (rs() - .5) * T.W * .7, a: rs() * 6, ix: 0 }));
  const fim = new THREE.InstancedMesh(G[3], new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55, envMapIntensity: .5 }), NFN); fim.frustumCulled = false; fim.castShadow = false; world.add(fim);
  const FC = [new THREE.Color(.34, .26, .17), new THREE.Color(.28, .21, .13), new THREE.Color(.4, .31, .2)];
  /* spray drops from the manifold nozzles */
  const nz = T.nozzles.map(p => new V3(p[0], p[1], 0)), ND = nz.length * 3 * 4, drops = []; nz.forEach(n => { for (let j = -1; j <= 1; j++) for (let k = 0; k < 4; k++) drops.push({ n, j, ph: k / 4 + rs() * .1, sp: .9 + rs() * .3 }); });
  const dim = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xcfe4f2, roughness: .05, transparent: true, opacity: .55, depthWrite: false, clearcoat: 1, envMapIntensity: 1.8 }), ND); dim.frustumCulled = false; dim.renderOrder = 6; world.add(dim);
  /* a brown curtain over the weir */
  const wr = new THREE.Mesh(new THREE.BoxGeometry(.06, .9, T.W - .2), new THREE.MeshPhysicalMaterial({ color: 0x6a5238, roughness: .05, transparent: true, opacity: .55, depthWrite: false, clearcoat: 1 })); wr.position.set(w0.x - .12, w0.y - .45, 0); wr.renderOrder = 5; world.add(wr);

  const v = (az, el, dist, t) => ({ az, el, dist, t });
  const narrow = matchMedia('(max-width:640px)').matches, wide = innerWidth < 1000 && !narrow;
  out.views = {
    all: v(-20, 20, narrow ? 74 : wide ? 56 : 46, [1.6, 2.4, 1.2]), feed: v(26, 14, 22, [-12, 2.6, 0]), wash: v(-14, 24, 18, [-1.4, 3.2, 0]), sep: v(-26, 22, 17, [-3.4, 1.8, 4.2]),
    screen: v(-16, 26, 17, [8.3, 2.6, 0]), stock: v(-22, 14, 23, [15, 3.2, 0]),
  };
  out.limits = { az: [-85, 75], el: [3, 55], dist: [7, 95] };
  const L_ = (id, text, anchor, vs, tone) => ({ id, text, side: 'r', tone, anchor, show: st => (st.view || 'all') === 'all' || vs.includes(st.view) });
  out.labels = [
    L_('feed', 'Incoming sand: a variable amount of fines', new V3(PJ.hopper.x, 3.6, 2.2), ['feed']),
    L_('wash', 'Washing: spray water and the turning screw release the loose fines', tp(4.4, T.D + 1.1), ['wash'], 'hot'),
    L_('sep', 'The overflow carries part of the fines to the settling tank', new V3(TK.x, TK.h + .6, TK.z), ['sep']),
    L_('screen', 'Screening: the sand is drained and separated by size', sp(S.L * .5, S.h + 1.5), ['screen']),
    L_('stock', 'Washed sand stockpile', new V3(SP.x, SP.h + .5, 0), ['stock']),
  ];
  let T0 = 0, hl = 0;
  out.update = (t, dt, st) => {
    const go = !reduceM() && st.play !== false; if (go) T0 += dt; const on = !!st.hl; hl += ((on ? 1 : 0) - hl) * (1 - Math.exp(-dt * 5));
    if (screw && go) screw.rotation.x -= dt * 1.5;
    const sandBase = go ? T0 : 3;
    for (let i = 0; i < NS; i++) {
      const it = sand[i], ph = it.ph + sandBase, tt = ((ph % CYC) + CYC) % CYC; place(ph, tmp); const zA = SEG[0].time + SEG[1].time, zC = TROUGH_END + SEG[3].time; tmp.z = it.z * (.7 + .2 * ss(zA - .3, zA + .3, tt) - .3 * ss(TROUGH_END - .3, TROUGH_END + .3, tt) + .1 * ss(zC - .3, zC + .3, tt));
      const clean = sm(TROUGH_AT + 2.2, TROUGH_END - 3, tt), gone = it.fine && !it.keep ? sm(TROUGH_AT + 4, TROUGH_AT + 7, tt) * (tt < TROUGH_END + 20 ? 1 : 0) : 0, sc = it.s * (1 - gone) * Math.max(.001, ss(0, .5, tt) * ss(0, .6, CYC - tt)), flash = it.fine && hl > .02 && gone < .98;
      if (!isFinite(tmp.x)) continue;
      o3.position.copy(tmp).y += sc * .5; o3.scale.set(sc * it.k, sc * .8, sc); o3.rotation.set(it.o + tt * .5, it.o, 0); o3.updateMatrix(); ims[it.gi].setMatrixAt(it.ix, o3.matrix);
      const mix = flash ? hl : 0, r_ = it.c[0] * (TTD[0] + (TTC[0] - TTD[0]) * clean), g_ = it.c[1] * (TTD[1] + (TTC[1] - TTD[1]) * clean), b_ = it.c[2] * (TTD[2] + (TTC[2] - TTD[2]) * clean); col.setRGB(r_ + (HOT.r - r_) * mix, g_ + (HOT.g - g_) * mix, b_ + (HOT.b - b_) * mix); ims[it.gi].setColorAt(it.ix, col);
    }
    ims.forEach(im => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
    /* fines: on the water towards the weir, over it, (inside the pipe, hidden), then falling into the tank */
    fines.forEach((f, i) => {
      const u = go ? (f.ph + T0 * .06) % 1 : f.ph; let s = f.s * ss(0, .04, u);
      if (u < .42) { const k = u / .42, s0 = .8 + (f.a % 1) * 2.4, sNow = s0 * (1 - k) - .12 * k, b = inc(T.x0, T.y0, T.th, sNow, T.D * .62 + .04); tmp.set(b.x, b.y, f.z); }
      else if (u < .5) { const k = (u - .42) / .08, b1 = inc(T.x0, T.y0, T.th, -.12, T.D * .62 + .04), m = ss(0, .35, k); tmp.set(b1.x + (w0.x - .12 - k * .1 - b1.x) * m, b1.y + (w0.y - .1 - k * .8 - b1.y) * m, f.z + (f.z * .3 - f.z) * m); }
      else if (u < .78) { s = 0; tmp.set(0, -5, 0); }
      else { const k = (u - .78) / .22; tmp.set(inlet.x + .1 + (f.a % 1) * .5 - .25, inlet.y + .4 - Math.min(1, k * 1.4) * .65 - (k > .72 ? (k - .72) * 1.2 : 0), inlet.z + Math.sin(f.a) * .25); if (k > .85) s *= (1 - (k - .85) / .15); s *= ss(0, .1, k); }
      o3.position.copy(tmp); o3.scale.set(s * 1.3, s * .9, s * 1.1); o3.rotation.set(f.a, f.a * 2, 0); o3.updateMatrix(); fim.setMatrixAt(i, o3.matrix);
      const base = FC[i % 3]; col.copy(base); if (hl > .02) col.lerp(HOT, hl); fim.setColorAt(i, col);
    });
    fim.instanceMatrix.needsUpdate = true; if (fim.instanceColor) fim.instanceColor.needsUpdate = true;
    drops.forEach((d, i) => { const k = go ? (d.ph + T0 * .9 * d.sp) % 1 : d.ph, y = d.n.y - .12 - k * k * 1.35; o3.position.set(d.n.x + d.j * .02 * k, y, d.j * .5 + d.j * k * .18); o3.scale.setScalar(.03 * (1 - k * .4) * Math.max(.001, ss(0, .1, k) * ss(0, .12, 1 - k))); o3.rotation.set(0, 0, 0); o3.updateMatrix(); dim.setMatrixAt(i, o3.matrix); });
    dim.instanceMatrix.needsUpdate = true;
    return go || hl > .01;
  };
  return out;
}
