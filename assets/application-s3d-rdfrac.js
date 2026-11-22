/* scene: aggregate fractions and gradings (WMM and GSB pages). Three sets, one module.
   frac  : the five WMM aggregate fractions (40 mm, 20 mm, 10 mm, 6 mm, screenings) as heaps on white plates, the coarse ones built of photo-textured angular stones (instanced), the fine ones of the grain-shader
           heap with real fractured grains; "Blend" lifts a sample of each into a glass chamber to show that no single fraction is the WMM: the combination, proportioned to a specified grading, is.
           No proportion is shown or implied; particle counts are not measured.
   six   : six cylinders, one per traditional GSB grading (I to VI), the cut face painted with stones whose sizes follow that grading's example curve, and a few stones on top.
   three : a nominal 20 mm single-size product, a nominal 40 mm single-size product and a graded GSB blend: a single-size fraction is not a GSB grading.
   Drawings: particle sizes are compressed so the finest are still visible, and nothing here is a sample, a blend, an OM GROUP result or a design. The grading table is the traditional MoRTH Fifth Revision
   reference, not a universal requirement. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { crushed, grainMat, buildHeap, plant } from '/assets/application-s3d-msand.js';
import { bakedTex, scaleUV, cvs, tex, reduceM } from '/assets/application-s3d-rdkit.js';
import { sizeAt } from '/assets/application-gsbdata.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const FR = [
  { k: '40', t: '40 mm', r: 2.0, n: 52 }, { k: '20', t: '20 mm', r: 1.05, n: 150 }, { k: '10', t: '10 mm', r: .55, n: 460 }, { k: '6', t: '6 mm', r: .34 }, { k: 'scr', t: 'Screenings', r: .15 },
];
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI'];
/* the cut-face tile of each grading is painted once (scripts/bake-roadtex.js) from these sizes */
export const GR = { I: u => sizeAt('I', u), II: u => sizeAt('II', u), III: u => sizeAt('III', u), IV: u => sizeAt('IV', u), V: u => sizeAt('V', u), VI: u => sizeAt('VI', u), '20': u => 20 * (.85 + u * .3), '40': u => 40 * (.85 + u * .3) };
export function gradeRadii(name) { const r = rng(77), radii = []; for (let i = 0; i < 1500; i++) radii.push(2.2 + 34 * Math.pow(GR[name](r()) / 75, .62)); return radii; }
const rOf = d => Math.max(.12, .3 * Math.sqrt(d / 2));

export default function build({ state }) {
  const set = state.set || 'frac', narrow = matchMedia('(max-width:640px)').matches;
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: set === 'six' ? 66 : 50, key: 2.5, shadow: .2, map: 4096, ground: false });
  key.shadow.bias = -.0002; key.shadow.normalBias = .04; key.shadow.camera.near = 30; key.shadow.camera.far = 300; key.shadow.camera.updateProjectionMatrix();
  { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); }
    const t = tex(b); t.repeat.set(36, 22); const bench = new THREE.Mesh(new THREE.BoxGeometry(400, 2, 240), new THREE.MeshStandardMaterial({ map: t, roughness: .55, metalness: 0, envMapIntensity: .75 })); bench.position.set(0, -1, 0); bench.receiveShadow = true; scene.add(bench); }
  const RS = realStones('quarry'), stoneM = realStoneMaterial({ tint: .4, bump: .03, floor: 0, gain: .82, contrast: .74, scale: .6, soft: 1, grain: .3, own: true });
  const disc = new THREE.MeshPhysicalMaterial({ color: 0xf0eee8, roughness: .26, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: .9 }), hotM = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 });
  const GS = [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), GA = [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), GT = [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')), gm = grainMat({ bump: .12 });
  const out = { scene, fov: 30, wide: true };
  const lab = (id, text, anchor, show, tone, side = 'r') => ({ id, text, side, tone, anchor, show: show || (() => true) });
  /* instanced photo-stones: one InstancedMesh per stone shape */
  const stonesAt = (parent, items, seed) => { const r = rng(seed), per = RS.map(() => []); items.forEach(it => per[(r() * RS.length) | 0].push(it)); const o = new THREE.Object3D(), ims = [];
    per.forEach((arr, gi) => { if (!arr.length) return; const im = new THREE.InstancedMesh(RS[gi], stoneM, arr.length); arr.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); o.scale.set(it[3] * (.9 + r() * .25), it[3] * (.7 + r() * .22), it[3] * (.9 + r() * .25)); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; parent.add(im); ims.push(im); }); return ims; };

  if (set === 'frac') {
    const X = [-30, -15, 0, 15, 30], rings = [];
    FR.forEach((f, i) => {
      const g = new THREE.Group(); g.position.set(X[i], 0, 4); scene.add(g);
      const d = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7, .6, 64), disc); d.position.y = .3; d.castShadow = d.receiveShadow = true; g.add(d);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(6.9, .14, 8, 64), hotM); ring.rotation.x = Math.PI / 2; ring.position.y = .62; ring.visible = false; g.add(ring); rings.push(ring);
      const R = 5.4, Hh = 6.4;
      if (f.n) {                                                     /* the coarse piles: a dark cone with photo stones on it */
        const r = rng(100 + i), items = []; for (let j = 0; j < f.n; j++) { const rr = R * Math.sqrt(r()), a = r() * TAU, h = Hh * Math.pow(Math.max(0, 1 - (rr / R) ** 2), .85), s = f.r * (.8 + r() * .4); items.push([Math.cos(a) * rr, .6 + Math.max(s * .6, h - r() * s * 2.2), Math.sin(a) * rr, s]); }
        const cone = new THREE.Mesh(new THREE.ConeGeometry(R * .97, Hh * .92, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 1, side: THREE.DoubleSide })); cone.position.y = .6 + Hh * .46; g.add(cone); stonesAt(g, items, 60 + i);
      } else {                                                       /* the fine piles: the grain-shader heap and fractured grains */
        const sc = R / 15, scr = f.k === 'scr', h = buildHeap({ R: 15, nC: scr ? 0 : 700, nM: scr ? 3200 : 3000, nF: scr ? 11000 : 8000, nH: 0, seed: 170 + i * 5, maxD: scr ? 1.6 : 6.2, gs: scr ? .34 : .55, tint: scr ? [1.05, 1.05, 1.1] : null, csf: (scr ? .1 : .2) * sc, csm: (scr ? .3 : .5) * sc, dust: scr ? .5 : .28 });
        h.group.scale.set(sc, Hh * .92 / (15 * .68), sc); h.group.position.y = .6; g.add(h.group);
        if (!scr) plant(h.group, h.items.coarse, GA, gm, 171 + i, true); plant(h.group, h.items.mid, GS, gm, 172 + i, true); plant(h.group, h.items.fine, GT, gm, 173 + i, false);
      }
    });
    /* the blending chamber behind the row */
    const ch = new THREE.Group(); ch.position.set(0, 0, -18); scene.add(ch);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, .6, 56), disc); base.position.y = .3; base.receiveShadow = true; ch.add(base);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.6, 8, 56, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xeaf3f1, roughness: .04, transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, envMapIntensity: 1.6 })); wall.position.y = 4.6; wall.renderOrder = 8; ch.add(wall);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8.6, .12, 8, 64), new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: .9, roughness: .3 })); rim.rotation.x = Math.PI / 2; rim.position.y = 8.6; ch.add(rim);
    /* blend particles: sizes drawn from all five classes; each starts on its own heap and ends in the chamber */
    const rr = rng(7), NB = [30, 90, 240, 300, 420], parts = [], ims = FR.map((f, ci) => { const geo = ci < 3 ? RS[ci % RS.length] : ci === 3 ? GS[0] : GT[0], im = new THREE.InstancedMesh(geo, ci < 3 ? stoneM : gm, NB[ci]); im.frustumCulled = false; im.castShadow = true; scene.add(im); return im; });
    FR.forEach((f, ci) => { for (let i = 0; i < NB[ci]; i++) { const a = rr() * TAU, r0 = 3.6 * Math.sqrt(rr()), s = f.r * (.8 + rr() * .4), a2 = rr() * TAU, r2 = 6.6 * Math.sqrt(rr()); parts.push({ ci, ix: i, s, x0: X[ci] + Math.cos(a) * r0, y0: 1.2 + (1 - r0 / 3.6) * 4, z0: 4 + Math.sin(a) * r0, x1: Math.cos(a2) * r2, y1: .8 + s + rr() * 4.8 * (1 - r2 / 7), z1: -18 + Math.sin(a2) * r2, d: rr() * .5, rot: [rr() * 6, rr() * 6, rr() * 6] }); } });
    const o = new THREE.Object3D();
    out.views = { all: { az: -6, el: 17, dist: narrow ? 120 : 88, t: [0, 4, -6] }, blend: { az: -10, el: 22, dist: narrow ? 90 : 64, t: [0, 5, -14] }, one: { az: -8, el: 18, dist: 60, t: [0, 4, 4] } };
    out.limits = { az: [-40, 40], el: [5, 50], dist: [30, 150] };
    out.labels = FR.map((f, i) => lab(f.k, f.t, new V3(X[i], i % 2 ? 14.6 : 11.2, 4), st => st.view !== 'blend')).concat([lab('b', 'Combined blend: not one fraction alone', new V3(0, 11.5, -18), st => (st.blend || 0) > .5 || st.view === 'blend', 'hot')]);
    const cur = { b: -1 };
    out.update = (t, dt, st) => {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 3); let moving = false; const goal = st.blend == null ? 0 : st.blend; if (cur.b < 0) cur.b = goal; cur.b += (goal - cur.b) * k; if (Math.abs(goal - cur.b) > .002) moving = true; else cur.b = goal;
      const sel = FR.findIndex(f => f.k === st.sel); rings.forEach((r, i) => { r.visible = sel === i; });
      parts.forEach(p => { const e = sm(clamp((cur.b - p.d * .5) / .5)); o.position.set(lerp(p.x0, p.x1, e), lerp(p.y0, p.y1, e) + Math.sin(e * Math.PI) * 9, lerp(p.z0, p.z1, e)); o.scale.setScalar(p.s * (e > 0 ? 1 : .001)); o.rotation.set(...p.rot); o.updateMatrix(); ims[p.ci].setMatrixAt(p.ix, o.matrix); }); ims.forEach(im => { im.instanceMatrix.needsUpdate = true; });
      return moving;
    };
    return out;
  }

  /* six / three: cylinders whose cut face is painted from the grading */
  const rings = [];
  const chamber = (x, z, name, seed) => {
    const sizer = GR[name];
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const R = 5.6, lvl = 7.2;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(R + .8, R + 1, .6, 64), disc); d.position.y = .3; d.receiveShadow = true; g.add(d);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 1.2, .14, 8, 64), hotM); ring.rotation.x = Math.PI / 2; ring.position.y = .64; ring.visible = false; g.add(ring); rings.push(ring);
    const r = rng(seed), tx = bakedTex('g-' + name), sideM = new THREE.MeshStandardMaterial({ map: tx.map, bumpMap: tx.bump, bumpScale: 4, roughness: .92, envMapIntensity: .55 });
    const body = new THREE.Mesh(scaleUV(new THREE.CylinderGeometry(R, R, lvl, 72, 1, false), 4, 1, 0), [sideM, sideM, new THREE.MeshStandardMaterial({ color: 0x2b2b2e })]); body.position.y = .6 + lvl / 2; body.castShadow = body.receiveShadow = true; g.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + .05, .1, 8, 64), new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: .9, roughness: .3 })); rim.rotation.x = Math.PI / 2; rim.position.y = .6 + lvl; g.add(rim);
    const items = []; for (let i = 0; i < 40; i++) { const a = r() * TAU, rr = (R - .9) * Math.sqrt(r()), rad = rOf(sizer(.3 + r() * .7)); items.push([Math.cos(a) * rr, .6 + lvl + rad * .3, Math.sin(a) * rr, rad]); }
    stonesAt(g, items, seed); return g;
  };
  if (set === 'six') {
    const X = [-40, -24, -8, 8, 24, 40];
    ROM.forEach((g, i) => chamber(X[i], 0, g, 100 + i * 13));
    out.views = { all: { az: -4, el: 14, dist: narrow ? 160 : 112, t: [0, 5, 0] } }; out.limits = { az: [-35, 35], el: [5, 45], dist: [40, 170] };
    out.labels = ROM.map((g, i) => lab('g' + g, 'Grading ' + g, new V3(X[i], 11 + (i % 2) * 2.6, 0), null, (g === 'V' || g === 'VI') ? 'hot' : ''));
    out.update = (t, dt, st) => { rings.forEach((r, i) => { r.visible = st.sel === ROM[i]; }); return false; };
    return out;
  }
  const X = [-18, 0, 18];
  chamber(X[0], 0, '20', 71); chamber(X[1], 0, '40', 72); chamber(X[2], 0, 'I', 73);
  out.views = { all: { az: -6, el: 15, dist: narrow ? 100 : 70, t: [0, 5, 0] } }; out.limits = { az: [-35, 35], el: [5, 45], dist: [30, 120] };
  out.labels = [lab('a', 'Nominal 20 mm: one size', new V3(X[0], 11, 0)), lab('b', 'Nominal 40 mm: one size', new V3(X[1], 13.6, 0)), lab('c', 'GSB: a graded blend', new V3(X[2], 11, 0), null, 'hot')];
  out.update = (t, dt, st) => { rings.forEach((r, i) => { r.visible = st.sel === ['a', 'b', 'c'][i]; }); return false; };
  return out;
}
