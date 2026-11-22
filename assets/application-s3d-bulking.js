/* scene: moisture and bulking. Two identical measuring boxes hold the SAME number of grains. The left one is dry and gives the reference level; in the right one the
   moisture slider changes how much space the same grains seem to occupy. Bulking first rises with moisture and then falls back when the sand is
   flooded, but no moisture figure, no percentage and no conversion is shown, and the heights are drawn for the picture, not measured. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk } = L;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };

const W = 5, D = 3.4, H = 6.6, H0 = 3.3, GX = [-4.6, 4.6];
export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 16, key: 2.2, shadow: .22, map: 2048 });
  const floor = mk(new THREE.BoxGeometry(26, .3, 10), new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: .85 })); floor.position.y = -.15; scene.add(floor);
  const dryMat = grainMat(), dampMat = grainMat({ rough: .5 });
  /* the same grains, in unit coordinates (y from 0 to 1); the height of the column scales them */
  const N = 1800, r = rng(91), g0 = grainGeos('sub', 'river'), U = []; for (let i = 0; i < N; i++) U.push({ x: (r() - .5) * (W - .5), y: r(), z: .78 + r() * .8, s: .075 + r() * .07, o: r() * 6, k: (r() * g0.length) | 0 });
  const mkBox = (x, tag) => {
    const g = new THREE.Group(); g.position.x = x; scene.add(g);
    const base = mk(new THREE.BoxGeometry(W + .5, .3, D + .5), M.white); base.position.y = .15; g.add(base);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .04, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide })); glass.position.y = .3 + H / 2; g.add(glass);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: 0x5a6068, transparent: true, opacity: .7 })); edge.position.y = .3 + H / 2; g.add(edge);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(W - .04, 1, 1.7), new THREE.MeshStandardMaterial({ color: tag ? 0x5e4f3a : 0x806c4e, roughness: 1 })); fill.position.z = -.08; g.add(fill);
    const ims = g0.map((geo, gi) => { const n = U.filter(u => u.k === gi).length; const im = new THREE.InstancedMesh(geo, tag ? dampMat : dryMat, n); im.frustumCulled = false; g.add(im); return im; });
    const pool = new THREE.Mesh(new THREE.BoxGeometry(W - .04, 1, D - .04), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .05, transparent: true, opacity: .38, depthWrite: false })); pool.renderOrder = 3; g.add(pool);
    return { g, fill, ims, pool };
  };
  const dry = mkBox(GX[0], 0), damp = mkBox(GX[1], 1);
  const o3 = new THREE.Object3D();
  const place = (b, h) => {
    b.fill.scale.y = Math.max(.01, h); b.fill.position.y = .3 + h / 2 - .02;
    const cnt = b.ims.map(() => 0);
    U.forEach(u => { const im = b.ims[u.k], i = cnt[u.k]++; o3.position.set(u.x, .3 + u.s + u.y * Math.max(.01, h - u.s * 2.2), u.z); o3.scale.setScalar(u.s); o3.rotation.set(u.o, u.o * 2, u.o * 3); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); });
    b.ims.forEach(im => { im.instanceMatrix.needsUpdate = true; });
  };
  /* a thin orange line at the dry level, running across both boxes */
  const lvl = new THREE.Mesh(new THREE.BoxGeometry(GX[1] - GX[0] + W, .05, .05), new THREE.MeshBasicMaterial({ color: 0xff5e29 })); lvl.position.set(0, .3 + H0, D / 2 + .08); scene.add(lvl);
  const lvlCap = []; [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.ConeGeometry(.2, .5, 12), new THREE.MeshBasicMaterial({ color: 0xff5e29 })); c.rotation.z = s * Math.PI / 2; c.position.set(s * ((GX[1] - GX[0] + W) / 2 + .1), .3 + H0, D / 2 + .08); scene.add(c); lvlCap.push(c); });
  place(dry, H0); dry.pool.visible = false;
  /* example curve: apparent volume rises with moisture, peaks, then falls back when the sand is flooded; the peak is drawn, not a real value */
  const rise = m => Math.sin(Math.min(1, m / .78) * Math.PI) * (m < .78 ? 1 : 0) * 1;
  let last = -1;
  const views = { front: { az: 0, el: 9, dist: 29, t: [0, 4, 0] }, iso: { az: -22, el: 22, dist: 29, t: [0, 4, 0] } };
  const labels = [
    { id: 'd', text: 'Dry sand · reference level', side: 'l', anchor: new V3(GX[0] - W / 2, .3 + H0, D / 2), show: () => true },
    { id: 'w', text: 'Same grains · moisture changes the apparent volume', side: 'r', tone: 'hot', anchor: new V3(GX[1] + W / 2, .3 + H0 + .8, D / 2), show: () => true },
    { id: 'p', text: 'Flooded: free water on top', side: 'r', anchor: new V3(GX[1] + W / 2, 5.6, D / 2), show: st => (st.moist ?? .4) > .88 },
  ];
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-60, 60], el: [4, 60], dist: [12, 50] },
    update(t, dt, st) {
      const m = st.moist ?? .4, b = rise(m) * .36; /* the drawn rise reaches about a third above the reference and no more */
      if (m !== last) {
        last = m; const h = H0 * (1 + b); place(damp, h);
        const wet = clamp(m / .35), flood = sm((m - .78) / .22); dampMat.color.setScalar(1 - .5 * wet); dampMat.roughness = .86 - .38 * wet; damp.fill.material.color.setHex(0x806c4e); damp.fill.material.color.multiplyScalar(1 - .3 * wet);
        damp.pool.visible = flood > .02; damp.pool.scale.y = Math.max(.001, flood * 1.3); damp.pool.position.y = .3 + H0 * (1 + b) + flood * .65;
      }
      return false;
    },
  };
}
