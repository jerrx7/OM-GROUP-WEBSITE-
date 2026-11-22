/* scene: two concrete mixes side by side. Pick one factor (particle shape, surface texture, fines, grading or moisture) and only that factor changes in mix B.
   It shows no water content, slump, strength or percentage, and it is not a test of any material. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk } = L;

const CR = 3, CH = 5.2, FILL = 4.4;
const CFG = {
  base: { kind: 'cube', n: 520, lo: .2, hi: .42, pw: 1.2, fines: 220, rough: .8, wet: 0 },
  shape: { a: { kind: 'round' }, b: { kind: 'ang' } },
  texture: { a: { rough: .3 }, b: { rough: 1 } },
  fines: { a: { fines: 120 }, b: { fines: 1700 } },
  grading: { a: {}, b: { lo: .3, hi: .34, fines: 0, n: 330 } },
  moisture: { a: { wet: 0 }, b: { wet: 1 } },
};
const TXT = {
  shape: ['Rounder particles', 'More angular particles'], texture: ['Smoother surface texture', 'Rougher surface texture'], fines: ['Fewer fine particles', 'More fine particles'],
  grading: ['Well-spread particle sizes', 'Narrow range of sizes'], moisture: ['Dry particle surfaces', 'Wet particle surfaces'],
};
export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 12, key: 2.2, shadow: .2 });
  const cups = [-4.2, 4.2].map(x => {
    const g = new THREE.Group(); g.position.x = x; scene.add(g);
    const glass = mk(new THREE.CylinderGeometry(CR + .12, CR + .12, CH, 48, 1, true), M.glass, { cast: false }); glass.position.y = CH / 2; g.add(glass);
    const bottom = mk(new THREE.CylinderGeometry(CR + .12, CR + .12, .2, 48), new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: .6 })); bottom.position.y = -.1; g.add(bottom);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(CR + .12, .05, 8, 56), new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: .2, metalness: .2 })); rim.rotation.x = Math.PI / 2; rim.position.y = CH; g.add(rim);
    const mixG = new THREE.Group(); g.add(mixG); return { g, mixG, paste: null };
  });
  const pasteM = [0, 1].map(() => new THREE.MeshPhysicalMaterial({ color: 0xb9b2a6, roughness: .45, transparent: true, opacity: .33, depthWrite: false, clearcoat: .4, side: THREE.DoubleSide }));
  const dropGeo = new THREE.SphereGeometry(1, 10, 8), dropM = new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .05, transparent: true, opacity: .75 });
  const clear = g => { while (g.children.length) { const c = g.children.pop(); if (c.isInstancedMesh) c.dispose(); } };
  function fill(i, cfg, seed) {
    const c = cups[i]; clear(c.mixG); const r = rng(seed);
    const mat = grainMat({ rough: cfg.rough, extra: cfg.wet ? { roughness: .16, color: 0xb9b9c2 } : {} }); mat.vertexColors = true;
    const items = []; const add = (n, lo, hi, pw) => { for (let k = 0; k < n; k++) { const s = lo + (hi - lo) * Math.pow(r(), pw), a = r() * TAU, rr = (CR - s) * Math.sqrt(r()); items.push([Math.cos(a) * rr, s + r() * (FILL - s * 2), Math.sin(a) * rr, s]); } };
    add(cfg.n, cfg.lo, cfg.hi, cfg.pw); add(cfg.fines, .06, .12, 1);
    inst(c.mixG, items, grainGeos(cfg.kind, 'm'), mat, seed + 3, true);
    const col = mk(new THREE.CylinderGeometry(CR, CR, FILL + .1, 48), pasteM[i], { cast: false }); col.position.y = (FILL + .1) / 2; col.renderOrder = 4; c.mixG.add(col);
    pasteM[i].color.set(cfg.wet ? 0x9fb8c9 : 0xb9b2a6);
    if (cfg.wet) { const dr = []; for (let k = 0; k < 90; k++) { const a = r() * TAU, rr = (CR - .2) * Math.sqrt(r()); dr.push([Math.cos(a) * rr, .2 + r() * (FILL - .3), Math.sin(a) * rr, .05 + r() * .06]); } const im = new THREE.InstancedMesh(dropGeo, dropM, dr.length), o = new THREE.Object3D(); dr.forEach((d, q) => { o.position.set(d[0], d[1], d[2]); o.scale.setScalar(d[3]); o.updateMatrix(); im.setMatrixAt(q, o.matrix); }); im.frustumCulled = false; c.mixG.add(im); }
    /* a thin water film on top of the paste in the wet case */
  }
  let cur = '';
  const views = { front: { az: -10, el: 18, dist: 22, t: [0, 2.6, 0] }, top: { az: -10, el: 56, dist: 21, t: [0, 2.2, 0] } };
  const labels = [
    { id: 'a', text: 'Mix A', side: 'l', tone: 'std', anchor: new V3(-4.2, CH + .5, 0), show: () => true },
    { id: 'b', text: 'Mix B', side: 'r', tone: 'hot', anchor: new V3(4.2, CH + .5, 0), show: () => true },
  ];
  const apply = (st, fig) => {
    const f = st.factor || 'shape'; if (f === cur) return; cur = f;
    fill(0, { ...CFG.base, ...CFG[f].a }, 91); fill(1, { ...CFG.base, ...CFG[f].b }, 92);
    if (fig && fig.labs) { fig.labs[0].el.querySelector('b').textContent = 'Mix A · ' + TXT[f][0]; fig.labs[1].el.querySelector('b').textContent = 'Mix B · ' + TXT[f][1]; fig.labs.forEach(l => { l.w = 0; }); }
  };
  return { scene, views, fov: 30, wide: true, labels, limits: { az: [-60, 60], el: [6, 64], dist: [10, 40] }, update(t, dt, st, fig) { apply(st, fig); let a = false; if (!reduce()) { cups.forEach((c, i) => { c.mixG.rotation.y = t * .12 * (i ? -1 : 1); }); a = true; } return a; } };
}
