/* scene: four reinforced-concrete elements (slab, beam, column, footing) in x-ray: reinforcement steel, coarse aggregate and M-Sand grains inside the concrete.
   Bar sizes, cover, spacing and aggregate proportions are NOT a structural design and nothing here is a mix design. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { mk } = L;

const EL = {
  slab: { x: -26, size: [10, 1, 7] }, beam: { x: -9, size: [10, 1.7, 1.3] }, column: { x: 6, size: [1.5, 7, 1.5] }, footing: { x: 22, size: [6.4, 1.3, 6.4] },
};
export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 34, key: 2.2, shadow: .22, map: 2048 });
  const steelM = new THREE.MeshStandardMaterial({ color: 0x6a5648, roughness: .5, metalness: .6 });
  const concM = new THREE.MeshStandardMaterial({ color: 0xb4b1ab, roughness: .95, transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide });
  const mC = grainMat(), mF = grainMat(), hotE = new THREE.Color(0xff5e29), off = new THREE.Color(0);
  const bodies = [], steels = [], fineG = [];
  const bar = (g, ax, len, x, y, z, rad = .06) => { const m = mk(new THREE.CylinderGeometry(rad, rad, len, 8), steelM); m.position.set(x, y, z); if (ax === 'x') m.rotation.z = Math.PI / 2; else if (ax === 'z') m.rotation.x = Math.PI / 2; g.add(m); return m; };
  const frame = (g, y, w, d, t = .035) => { /* a stirrup or tie: four thin bars in the xz plane */ [[0, d / 2, 'x', w], [0, -d / 2, 'x', w], [w / 2, 0, 'z', d], [-w / 2, 0, 'z', d]].forEach(([x, z, ax, l]) => bar(g, ax, l, x, y, z, t)); };
  const fillBox = (g, w, h, d, nC, nF, seed, sc = [.2, .3]) => {
    const r = rng(seed), C = [], F = [];
    for (let i = 0; i < nC; i++) { const s = sc[0] + r() * (sc[1] - sc[0]); C.push([(r() - .5) * (w - s * 1.6), h / 2 + (r() - .5) * (h - s * 1.6), (r() - .5) * (d - s * 1.6), s]); }
    for (let i = 0; i < nF; i++) { const s = .035 + Math.pow(r(), 1.5) * .06; F.push([(r() - .5) * (w - .1), h / 2 + (r() - .5) * (h - .1), (r() - .5) * (d - .1), s]); }
    inst(g, C, grainGeos('ang', 'stone'), mC, seed + 1, false); fineG.push(...inst(g, F, grainGeos('fine', 'm'), mF, seed + 2, false));
  };
  const root = {};
  Object.entries(EL).forEach(([k, e]) => {
    const g = new THREE.Group(); g.position.x = e.x; scene.add(g); root[k] = g; const [w, h, d] = e.size;
    const body = mk(new THREE.BoxGeometry(w, h, d), concM, { cast: false }); body.position.y = h / 2; body.renderOrder = 4; g.add(body); bodies.push(body);
    const eg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: 0x55565a, transparent: true, opacity: .6 })); eg.position.y = h / 2; g.add(eg);
    const sg = new THREE.Group(); g.add(sg); steels.push(sg);
    if (k === 'slab') { for (let i = 0; i < 9; i++) bar(sg, 'z', d - .5, -w / 2 + .6 + i * (w - 1.2) / 8, .22, 0); for (let j = 0; j < 7; j++) bar(sg, 'x', w - .5, 0, .3 + .06, -d / 2 + .6 + j * (d - 1.2) / 6); for (let i = 0; i < 6; i++) bar(sg, 'z', d - .5, -w / 2 + .8 + i * (w - 1.6) / 5, h - .22, 0); for (let j = 0; j < 5; j++) bar(sg, 'x', w - .5, 0, h - .3 - .06, -d / 2 + .8 + j * (d - 1.6) / 4); fillBox(g, w, h, d, 60, 2200, 11, [.2, .28]); }
    if (k === 'beam') { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bar(sg, 'x', w - .5, 0, h / 2 + b * (h / 2 - .22), a * (d / 2 - .22), .075)); for (let i = 0; i < 10; i++) { const x = -w / 2 + .5 + i * (w - 1) / 9, f = new THREE.Group(); f.position.x = x; sg.add(f); [[h / 2 + (h / 2 - .2), 'top'], [h / 2 - (h / 2 - .2), 'bot']].forEach(([y]) => bar(f, 'z', d - .4, 0, y, 0, .035)); [[d / 2 - .2], [-(d / 2 - .2)]].forEach(([z]) => bar(f, 'y', h - .4, 0, h / 2, z, .035)); } fillBox(g, w, h, d, 32, 1500, 21, [.2, .27]); }
    if (k === 'column') { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bar(sg, 'y', h - .3, a * (w / 2 - .22), h / 2, b * (d / 2 - .22), .08)); for (let i = 0; i < 9; i++) frame(sg, .45 + i * (h - .9) / 8, w - .44, d - .44); fillBox(g, w, h, d, 34, 1700, 31, [.2, .26]); }
    if (k === 'footing') { for (let i = 0; i < 8; i++) { bar(sg, 'z', d - .6, -w / 2 + .5 + i * (w - 1) / 7, .22, 0); bar(sg, 'x', w - .6, 0, .22 + .12, -d / 2 + .5 + i * (d - 1) / 7); } const stub = mk(new THREE.BoxGeometry(1.3, 2.6, 1.3), concM, { cast: false }); stub.position.y = h + 1.3; stub.renderOrder = 4; g.add(stub); bodies.push(stub); const sg2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 2.6, 1.3)), new THREE.LineBasicMaterial({ color: 0x55565a, transparent: true, opacity: .6 })); sg2.position.y = h + 1.3; g.add(sg2); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bar(sg, 'y', 3.5, a * .42, h + .35, b * .42, .07)); fillBox(g, w, h, d, 40, 1500, 41, [.22, .3]); }
  });
  const T = { slab: [-26, 1.2, 0], beam: [-9, 1.2, 0], column: [6, 3.4, 0], footing: [22, 1.6, 0] };
  const views = { slab: { az: -24, el: 28, dist: 19, t: T.slab }, beam: { az: -24, el: 24, dist: 17, t: T.beam }, column: { az: -24, el: 20, dist: 17, t: T.column }, footing: { az: -26, el: 28, dist: 18, t: T.footing } };
  const L_ = (id, text, ex, p, tone, side = 'r') => ({ id: id + ex, text, side, tone, anchor: new V3(EL[ex].x + p[0], p[1], p[2]), show: st => st.view === ex });
  const labels = [];
  [['slab', [4.4, .9, 3.4], [-4.5, .3, 3.4], [2, 1.0, -3.5]], ['beam', [5, 1.5, .65], [-5, .45, .65], [2, 1.7, -.6]], ['column', [.75, 5.6, .75], [-.75, 2.2, .75], [.75, 6.9, -.75]], ['footing', [3.2, 1.0, 3.2], [-3.2, .35, 3.2], [.7, 3.8, .65]]].forEach(([ex, a, b, c]) => {
    labels.push(L_('c', 'Concrete', ex, a, 'std', 'r'), L_('s', 'Reinforcement steel', ex, b, 'std', 'l'), L_('m', (state.nm || 'M-Sand') + ' grains: the fine aggregate', ex, c, 'hot', 'r'));
  });
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-80, 80], el: [6, 64], dist: [6, 60] },
    update(t, dt, st) {
      const xr = st.xray !== false; concM.opacity = xr ? .24 : .94; concM.depthWrite = !xr; concM.needsUpdate = true;
      steels.forEach(s => { s.visible = st.steel !== false; }); mF.emissive.copy(st.hl ? hotE : off); mF.emissiveIntensity = st.hl ? .55 : 0;
      return false;
    },
  };
}
