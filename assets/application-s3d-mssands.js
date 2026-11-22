/* scene: five construction sands in white enamel dishes on a lab bench (M-Sand page, "M-Sand versus other construction sands"): M-Sand, river sand, P-Sand, stone dust and washed sand.
   Each dish is a poured heap at the angle of repose: a grain-shader surface (hundreds of thousands of faceted crystals, fading to a mean colour where a grain is smaller than a pixel) with real instanced
   grains over it. What differs between the dishes is what really differs between the materials: grain shape (fractured and angular, or worn and rounded), grain size, colour (grey and charcoal rock, warm
   quartz-and-feldspar river sand, pale washed quartz) and how much fine dust coats the grains. Grains are enlarged and generated: they are not a sample, and appearance is never evidence of grading or of
   conformity with a standard. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, plant, buildHeap } from '/assets/application-s3d-msand.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;

const SANDS5 = [
  { k: 'm', name: 'M-Sand', kind: 'ang', tint: null, csf: .24, csm: .6, dust: .22, nC: 520, nM: 1800, nF: 6500, maxD: 4.0, gs: 1, pos: [-42, -24] },
  { k: 'river', name: 'River sand', kind: 'round', tint: [2.5, 1.85, 1.05], csf: .26, csm: .64, dust: .12, nC: 260, nM: 2400, nF: 6500, maxD: 2.5, gs: 1, pos: [0, -24] },
  { k: 'p', name: 'P-Sand', kind: 'ang', tint: [2.1, 1.7, 1.18], csf: .12, csm: .3, dust: .36, nC: 0, nM: 3600, nF: 9000, maxD: 1.18, gs: .55, pos: [42, -24] },
  { k: 'dust', name: 'Stone dust', kind: 'ang', tint: [1.55, 1.55, 1.62], csf: .07, csm: .16, dust: .62, nC: 0, nM: 1200, nF: 9000, maxD: 1.18, gs: .3, pos: [-21, 22] },
  { k: 'washed', name: 'Washed sand', kind: 'round', tint: [3.2, 2.75, 1.95], csf: .25, csm: .62, dust: .06, nC: 220, nM: 2300, nF: 6500, maxD: 2.4, gs: 1, pos: [21, 22] },
];
/* the eight sands of the River Sand page: two rows of four */
const EIGHT = [
  { k: 'river', name: 'River Sand', kind: 'round', tint: [2.5, 1.85, 1.05], csf: .26, csm: .64, dust: .12, nC: 260, nM: 2400, nF: 6500, maxD: 2.5, gs: 1, pos: [-63, -24] },
  { k: 'm', name: 'M-Sand', kind: 'ang', tint: null, csf: .24, csm: .6, dust: .22, nC: 520, nM: 1800, nF: 6500, maxD: 4.0, gs: 1, pos: [-21, -24] },
  { k: 'p', name: 'P-Sand', kind: 'ang', tint: [2.1, 1.7, 1.18], csf: .12, csm: .3, dust: .36, nC: 0, nM: 3600, nF: 9000, maxD: 1.18, gs: .55, pos: [21, -24] },
  { k: 'washed', name: 'Washed Sand', kind: 'round', tint: [3.2, 2.75, 1.95], csf: .25, csm: .62, dust: .06, nC: 220, nM: 2300, nF: 6500, maxD: 2.4, gs: 1, pos: [63, -24] },
  { k: 'sea', name: 'Sea Sand', kind: 'round', tint: [3.0, 2.5, 1.85], csf: .2, csm: .5, dust: .1, nC: 80, nM: 2800, nF: 7500, maxD: 1.6, gs: .8, pos: [-63, 24] },
  { k: 'dust', name: 'Crusher dust', kind: 'ang', tint: [1.55, 1.55, 1.62], csf: .07, csm: .16, dust: .62, nC: 0, nM: 1200, nF: 9000, maxD: 1.18, gs: .3, pos: [-21, 24] },
  { k: 'concrete', name: 'Concrete Sand', kind: 'ang', tint: [1.75, 1.45, 1.08], csf: .23, csm: .58, dust: .2, nC: 420, nM: 2000, nF: 6500, maxD: 3.6, gs: 1, pos: [21, 24] },
  { k: 'pit', name: 'Pit Sand', kind: 'sub', tint: [3.3, 1.45, .62], csf: .24, csm: .6, dust: .22, nC: 160, nM: 2400, nF: 7000, maxD: 2.2, gs: 1, pos: [63, 24] },
];
/* the seven sands of the Concrete Sand page: four behind, three in front */
const SEVEN = [
  { k: 'concrete', name: 'Concrete Sand', kind: 'ang', tint: [1.75, 1.45, 1.08], csf: .23, csm: .58, dust: .2, nC: 420, nM: 2000, nF: 6500, maxD: 3.6, gs: 1, pos: [-63, -24] },
  { k: 'm', name: 'M-Sand', kind: 'ang', tint: null, csf: .24, csm: .6, dust: .22, nC: 520, nM: 1800, nF: 6500, maxD: 4.0, gs: 1, pos: [-21, -24] },
  { k: 'river', name: 'River Sand', kind: 'round', tint: [2.5, 1.85, 1.05], csf: .26, csm: .64, dust: .12, nC: 260, nM: 2400, nF: 6500, maxD: 2.5, gs: 1, pos: [21, -24] },
  { k: 'p', name: 'P-Sand', kind: 'ang', tint: [2.1, 1.7, 1.18], csf: .12, csm: .3, dust: .36, nC: 0, nM: 3600, nF: 9000, maxD: 1.18, gs: .55, pos: [63, -24] },
  { k: 'washed', name: 'Washed Sand', kind: 'round', tint: [3.2, 2.75, 1.95], csf: .25, csm: .62, dust: .06, nC: 220, nM: 2300, nF: 6500, maxD: 2.4, gs: 1, pos: [-42, 24] },
  { k: 'dust', name: 'Stone dust', kind: 'ang', tint: [1.55, 1.55, 1.62], csf: .07, csm: .16, dust: .62, nC: 0, nM: 1200, nF: 9000, maxD: 1.18, gs: .3, pos: [0, 24] },
  { k: 'plaster', name: 'Plaster Sand', kind: 'round', tint: [2.3, 1.9, 1.3], csf: .14, csm: .36, dust: .2, nC: 0, nM: 3200, nF: 9000, maxD: 1.4, gs: .6, pos: [42, 24] },
];
/* concrete-grade M-Sand beside P-Sand (the Plaster Sand page) */
const PM = [SANDS5[0], SANDS5[2]].map((s, i) => ({ ...s, pos: [i ? 24 : -24, 0] }));
const RD = 19.5, FLOOR = 1.2;

export default function build({ state } = {}) {
  const SET = state && state.set, SANDS = SET === 'eight' ? EIGHT : SET === 'seven' ? SEVEN : SET === 'pm' ? PM : SANDS5, eight = SANDS === EIGHT || SANDS === SEVEN, two = SANDS === PM;
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: eight ? 100 : 72, key: 2.5, shadow: .22, map: 4096, ground: false });
  key.shadow.bias = -.0001; key.shadow.normalBias = .03; key.shadow.camera.near = eight ? 100 : 70; key.shadow.camera.far = eight ? 380 : 270; key.shadow.camera.updateProjectionMatrix();
  /* bench */
  const bcv = document.createElement('canvas'); bcv.width = bcv.height = 512; { const g = bcv.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); } }
  const bt = new THREE.CanvasTexture(bcv); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(30, 20); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 8;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(520, 3, 360), new THREE.MeshStandardMaterial({ map: bt, roughness: .5, metalness: 0, envMapIntensity: .8 })); bench.position.set(0, -1.5, 0); bench.receiveShadow = true; scene.add(bench);

  /* the dishes: white enamel, a rolled rim */
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: .24, metalness: 0, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9 });
  const rimM = new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: .24 }), hotM = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 });
  const prof = [[0, 0], [RD - 2, 0], [RD - .8, .6], [RD + .4, 5], [RD + 1.2, 6.2], [RD + 1.9, 6], [RD + 1.6, 5], [RD + .8, 4.6], [RD - .6, 1.7], [RD - 2, FLOOR], [0, FLOOR]].map(p => new THREE.Vector2(p[0], p[1]));
  const dishG = new THREE.LatheGeometry(prof, 96);
  const G = { sub: [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')), ang: [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), round: [0, 1, 2, 3, 4, 5].map(i => crushed(700 + i * 19, 'round')), small: [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), roundS: [0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round')), tiny: [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')) };
  const mat = grainMat({ bump: .12 });
  const items = SANDS.map((s, i) => {
    const g = new THREE.Group(); g.position.set(s.pos[0], 0, s.pos[1]); scene.add(g);
    const d = new THREE.Mesh(dishG, enamel); d.castShadow = d.receiveShadow = true; g.add(d);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RD + 1.45, .5, 10, 96), rimM); rim.rotation.x = Math.PI / 2; rim.position.y = 5.95; rim.castShadow = true; g.add(rim);
    const heap = buildHeap({ R: 15, nC: s.nC, nM: s.nM, nF: s.nF, nH: 0, seed: 31 + i * 17, y0: FLOOR, maxD: s.maxD, gs: s.gs, tint: s.tint, csf: s.csf, csm: s.csm, dust: s.dust });
    g.add(heap.group);
    const round = s.kind === 'round', sub = s.kind === 'sub';
    if (s.nC) plant(heap.group, heap.items.coarse, round ? G.round : sub ? G.sub : G.ang, mat, 41 + i, true);
    plant(heap.group, heap.items.mid, round || sub ? G.roundS : G.small, mat, 51 + i, i < 3);
    plant(heap.group, heap.items.fine, G.tiny, mat, 61 + i, false);
    return { g, rim, s, top: heap.hAt(0, 0) + FLOOR };
  });

  const views = { all: { az: -4, el: 36, dist: (matchMedia('(max-width:640px)').matches ? 205 : 178) * (eight ? 1.34 : two ? .62 : 1), t: [0, 4, 0] }, ...Object.fromEntries(SANDS.map((s, i) => [s.k, { az: -10, el: 30, dist: 70, t: [s.pos[0], 4, s.pos[1]] }])) };
  const labels = SANDS.map((s, i) => ({ id: s.k, text: s.name, side: 'r', tone: s.k === 'm' ? 'hot' : undefined, anchor: new V3(s.pos[0] + 2, items[i].top + 3, s.pos[1] + 2), show: st => st.view === 'all' || st.view === s.k }));
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-60, 60], el: [10, 66], dist: [30, 330] },
    update(t, dt, st) { items.forEach(o => { o.rim.material = st.view === o.s.k ? hotM : rimM; }); return false; },
  };
}
