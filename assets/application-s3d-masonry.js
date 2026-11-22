/* scene: masonry mortar. A wall in running bond (brick or concrete block), a magnified cut through one joint showing sand grains held in cement paste, and a mixing pan.
   Unit sizes, joint thickness and grain sizes are exaggerated for legibility. No mortar mix, ratio or strength is shown or implied. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, dish, moundBase, moundItems, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk, canvasTex } = L;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 24, key: 2.2, shadow: .22, map: 2048 });
  const noise = (base, sp, seed) => canvasTex(256, 256, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(seed); for (let i = 0; i < 1400; i++) { x.fillStyle = sp[(r() * sp.length) | 0]; x.globalAlpha = .3 + r() * .4; const s = 1 + r() * 2.4; x.fillRect(r() * w, r() * h, s, s); } x.globalAlpha = 1; }, true);
  const brickM = new THREE.MeshStandardMaterial({ map: noise('#b9593b', ['#9c4329', '#c9704f', '#a64d31'], 3), roughness: .95 });
  const blockM = new THREE.MeshStandardMaterial({ map: noise('#a7a8a6', ['#8c8d8b', '#c0c1be', '#999a98'], 4), roughness: 1 });
  const mortarM = new THREE.MeshStandardMaterial({ color: 0x8e8b85, roughness: 1 });
  /* wall */
  const wall = { brick: new THREE.Group(), block: new THREE.Group() }; Object.values(wall).forEach(g => { g.position.x = -10; scene.add(g); });
  const unit = (g, w, h, d, mat, jt, courses, per) => {
    const total = per * (w + jt) - jt;
    for (let c = 0; c < courses; c++) { const ws = c % 2 ? [w / 2 - jt / 2, ...Array(per - 1).fill(w), w / 2 - jt / 2] : Array(per).fill(w); let x = -total / 2; ws.forEach(ww => { const m = mk(new THREE.BoxGeometry(ww, h, d), mat); m.position.set(x + ww / 2, c * (h + jt) + h / 2 + .02, 0); g.add(m); x += ww + jt; }); }
    const core = mk(new THREE.BoxGeometry(total - .18, courses * (h + jt) - jt - .18, d * .8), mortarM); core.position.set(0, (courses * (h + jt) - jt) / 2 + .02, 0); g.add(core);
  };
  unit(wall.brick, 2.4, .75, 1.15, brickM, .16, 7, 5); unit(wall.block, 3.4, 1.7, 1.1, blockM, .16, 3, 4);
  /* magnified joint */
  const J = new THREE.Group(); J.position.set(9, 0, 0); scene.add(J); const JW = 12, JD = 5.5, JT = 1.0, BH = 3.2;
  const lo = mk(new THREE.BoxGeometry(JW, BH, JD), brickM); lo.position.y = BH / 2; const hi = lo.clone(); hi.position.y = BH + JT + BH / 2; J.add(lo, hi);
  const loB = mk(new THREE.BoxGeometry(JW, BH, JD), blockM), hiB = loB.clone(); loB.position.y = BH / 2; hiB.position.y = BH + JT + BH / 2; J.add(loB, hiB);
  const past = mk(new THREE.BoxGeometry(JW, JT, JD), new THREE.MeshPhysicalMaterial({ color: 0xa59f95, roughness: .6, transparent: true, opacity: .82, depthWrite: false }), { cast: false }); past.position.y = BH + JT / 2; past.renderOrder = 4; J.add(past);
  const r = rng(17), gi = []; for (let i = 0; i < 2300; i++) { const s = .06 + Math.pow(r(), 1.5) * .17; gi.push([(r() - .5) * (JW - .3), BH + s + r() * (JT - s * 2), (r() - .5) * (JD - .3), s]); }
  const gmat = grainMat(); inst(J, gi, grainGeos('ang', 'm'), gmat, 19, false);
  const hotE = new THREE.Color(0xff5e29), off = new THREE.Color(0);
  /* mixing pan */
  const P = new THREE.Group(); P.position.set(30, 0, 0); scene.add(P); P.add(dish(7.5, 1.6, new THREE.MeshStandardMaterial({ color: 0x8f9299, metalness: .6, roughness: .5, side: THREE.DoubleSide })));
  const mnd = (x, z, R, H, col, pal, kind, n, seed) => { const g = new THREE.Group(); g.position.set(x, .5, z); P.add(g); g.add(moundBase(R, H, col)); const rr = rng(seed); if (n) inst(g, moundItems(n, R * .96, H, () => .08 + rr() * .1, rr), grainGeos(kind, pal), gmat, seed, false); };
  mnd(-1.8, .4, 3.4, 1.6, 0x9d927a, 'm', 'ang', 1600, 31); mnd(2.8, -1.4, 2.3, 1.2, 0x9c9a97, 'dust', 'fine', 500, 33);
  const wat = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .05, transparent: true, opacity: .7 })); wat.rotation.x = -Math.PI / 2; wat.position.set(2.4, .55, 3.2); P.add(wat);
  const views = { wall: { az: -16, el: 18, dist: 21, t: [-10, 2.4, 0] }, joint: { az: -14, el: 12, dist: 25, t: [9, 4, 0] }, mix: { az: -14, el: 34, dist: 20, t: [30, 1, 0] } };
  const labels = [
    { id: 'w', text: 'Masonry units', side: 'l', anchor: new V3(-12, 4.6, .6), show: st => st.view === 'wall' },
    { id: 'j', text: 'Mortar joint', side: 'r', tone: 'hot', anchor: new V3(-7.2, 2.4, .6), show: st => st.view === 'wall' },
    { id: 'u', text: 'Masonry unit', side: 'l', anchor: new V3(2.8, BH * 1.9, JD / 2), show: st => st.view === 'joint' },
    { id: 'g', text: 'Sand grains: the fine aggregate', side: 'r', tone: 'hot', anchor: new V3(15, BH + .5, JD / 2), show: st => st.view === 'joint' },
    { id: 'p', text: 'Cement paste around the grains', side: 'r', anchor: new V3(15, BH + .9, -JD / 2), show: st => st.view === 'joint' },
    { id: 'a', text: state.nm || 'M-Sand', side: 'l', tone: 'hot', anchor: new V3(28.2, 2.2, .4), show: st => st.view === 'mix' },
    { id: 'b', text: 'Binder (cement)', side: 'r', anchor: new V3(32.8, 1.8, -1.4), show: st => st.view === 'mix' },
    { id: 'c', text: 'Water', side: 'r', anchor: new V3(32.4, .9, 3.2), show: st => st.view === 'mix' },
  ];
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-70, 70], el: [4, 62], dist: [8, 60] },
    update(t, dt, st) {
      const bl = st.unit === 'block'; wall.brick.visible = !bl; wall.block.visible = bl; lo.visible = hi.visible = !bl; loB.visible = hiB.visible = bl;
      gmat.emissive.copy(st.hl ? hotE : off); gmat.emissiveIntensity = st.hl ? .55 : 0; return false;
    },
  };
}
