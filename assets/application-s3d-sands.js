/* scene: five construction sands side by side (M-Sand, river sand, P-Sand, stone dust, washed sand). Select one to read what it is.
   The grains are enlarged for legibility. Appearance is never evidence of grading or of conformity with a standard: only a test result is. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, moundItems, moundBase, dish, reduce, V3 } from '/assets/application-s3d-sand.js';

const S5 = [
  { k: 'm', name: 'M-Sand', kind: 'ang', pal: 'm', n: 1800, lo: .09, hi: .24, base: 0x6e6a66, tone: 'hot' },
  { k: 'river', name: 'River sand', kind: 'round', pal: 'river', n: 1800, lo: .08, hi: .21, base: 0x8c7a5f },
  { k: 'p', name: 'P-Sand', kind: 'fine', pal: 'p', n: 3000, lo: .045, hi: .11, base: 0x8b7e69 },
  { k: 'dust', name: 'Stone dust', kind: 'fine', pal: 'dust', n: 3400, lo: .02, hi: .09, base: 0x707075, wide: true },
  { k: 'washed', name: 'Washed sand', kind: 'round', pal: 'washed', n: 1800, lo: .08, hi: .21, base: 0xa89c86 },
];
const S8 = [
  { k: 'river', name: 'River Sand', kind: 'round', pal: 'river', n: 1800, lo: .08, hi: .21, base: 0x8c7a5f, tone: 'hot' },
  { k: 'm', name: 'M-Sand', kind: 'ang', pal: 'm', n: 1800, lo: .09, hi: .24, base: 0x6e6a66 },
  { k: 'p', name: 'P-Sand', kind: 'fine', pal: 'p', n: 3000, lo: .045, hi: .11, base: 0x8b7e69 },
  { k: 'washed', name: 'Washed Sand', kind: 'round', pal: 'washed', n: 1800, lo: .08, hi: .21, base: 0xa89c86 },
  { k: 'sea', name: 'Sea Sand', kind: 'round', pal: 'sea', n: 2200, lo: .06, hi: .17, base: 0xb3a88f },
  { k: 'dust', name: 'Crusher dust', kind: 'fine', pal: 'dust', n: 3400, lo: .02, hi: .09, base: 0x707075, wide: true },
  { k: 'concrete', name: 'Concrete Sand', kind: 'round', pal: 'river', n: 1800, lo: .08, hi: .21, base: 0x8a7a62 },
  { k: 'pit', name: 'Pit Sand', kind: 'sub', pal: 'pit', n: 2000, lo: .06, hi: .18, base: 0x7a4a30 },
];
/* seven for the Concrete Sand page: the application name beside the material that serves it, then the other fine aggregates it is compared with */
const S7 = [
  { k: 'concrete', name: 'Concrete Sand', kind: 'ang', pal: 'm', n: 1800, lo: .09, hi: .24, base: 0x6e6a66, tone: 'hot' },
  { k: 'm', name: 'M-Sand', kind: 'ang', pal: 'm', n: 1800, lo: .09, hi: .24, base: 0x6e6a66, tone: 'hot' },
  { k: 'river', name: 'River Sand', kind: 'round', pal: 'river', n: 1800, lo: .08, hi: .21, base: 0x8c7a5f },
  { k: 'p', name: 'P-Sand', kind: 'fine', pal: 'p', n: 3000, lo: .045, hi: .11, base: 0x8b7e69 },
  { k: 'washed', name: 'Washed Sand', kind: 'round', pal: 'washed', n: 1800, lo: .08, hi: .21, base: 0xa89c86 },
  { k: 'dust', name: 'Stone dust', kind: 'fine', pal: 'dust', n: 3400, lo: .02, hi: .09, base: 0x707075, wide: true },
  { k: 'plaster', name: 'Plaster Sand', kind: 'fine', pal: 'p', n: 3000, lo: .045, hi: .11, base: 0x8b7e69 },
];
/* two for the Plaster Sand page: concrete-grade M-Sand beside plaster-grade P-Sand (a contrast: not a sample, not a test result) */
const PM = [
  { k: 'm', name: 'M-Sand (concrete grade)', kind: 'ang', pal: 'm', n: 1800, lo: .09, hi: .24, base: 0x6e6a66 },
  { k: 'p', name: 'P-Sand (plaster grade)', kind: 'fine', pal: 'p', n: 3400, lo: .045, hi: .115, base: 0x7d786f, tone: 'hot' },
];
const STEP0 = 8.6;
export default function build({ state }) {
  const S = state.set === 'pm' ? PM : state.set === 'eight' ? S8 : state.set === 'seven' ? S7 : S5, STEP = S.length === 2 ? 10 : S.length > 5 ? 8.2 : STEP0, X0 = -STEP * (S.length - 1) / 2;
  const scene = new THREE.Scene(); studio(scene, { ext: 24, key: 2.2, shadow: .2, map: 2048 });
  const mat = grainMat(); const ringM = new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6 }), hot = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .25 });
  const items = S.map((s, i) => {
    const g = new THREE.Group(); g.position.x = X0 + i * STEP; scene.add(g); g.add(dish(3.9, .9));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.95, .07, 8, 56), ringM); rim.rotation.x = Math.PI / 2; rim.position.y = 1.2; g.add(rim);
    const t = new THREE.Group(); t.position.y = .75; g.add(t); t.add(moundBase(3.3, 1.9, s.base));
    const r = rng(100 + i * 9); const sizes = () => s.lo + (s.hi - s.lo) * Math.pow(r(), s.wide ? 2.4 : 1.4);
    let its = moundItems(s.n, 3.3, 1.9, sizes, r);
    if (s.k === 'concrete' && state.set !== 'seven') { const A = its.filter((_, q) => q % 2); const B = its.filter((_, q) => !(q % 2)); inst(t, A, grainGeos('ang', 'm'), mat, 5, false); inst(t, B, grainGeos('round', 'river'), mat, 6, false); }
    else if (s.k === 'washed') { /* half angular, half rounded: washing is a process, not a source */ const A = its.filter((_, q) => q % 2); const B = its.filter((_, q) => !(q % 2)); inst(t, A, grainGeos('ang', 'washed'), mat, 5, false); inst(t, B, grainGeos('round', 'washed'), mat, 6, false); }
    else inst(t, its, grainGeos(s.kind, s.pal), mat, 7 + i, false);
    if (s.k === 'dust') { const haze = new THREE.Mesh(new THREE.SphereGeometry(3.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xa8a8ae, transparent: true, opacity: .16, depthWrite: false })); haze.scale.y = .8; haze.position.y = .0; t.add(haze); }
    return { g, rim, t, s };
  });
  const views = { all: { az: -6, el: 26, dist: S.length === 2 ? 30 : S.length > 7 ? 86 : S.length > 5 ? 72 : 54, t: [0, 1.2, 0] }, ...Object.fromEntries(S.map((s, i) => [s.k, { az: -14, el: 24, dist: 14, t: [X0 + i * STEP, 1.6, 0] }])) };
  const labels = S.map((s, i) => ({ id: s.k, text: s.name, side: 'r', tone: s.tone, anchor: new V3(X0 + i * STEP, 3.8 + (S.length === 7 ? [0, 2.3, 4.6, 0, 2.3, 4.6, 0][i] : S.length > 5 ? (i % 3) * 1.7 : (i % 2) * 2), 0), show: st => st.view === 'all' || st.view === s.k }));
  return {
    scene, views, fov: 30, labels, limits: { az: [-60, 60], el: [8, 60], dist: [7, 60] },
    update(t, dt, st) {
      let a = false; items.forEach(o => { const sel = st.view === o.s.k; o.rim.material = sel ? hot : ringM; if (!reduce() && (sel || st.view === 'all')) { o.t.rotation.y = t * (sel ? .25 : .08); a = true; } });
      return a;
    },
  };
}
