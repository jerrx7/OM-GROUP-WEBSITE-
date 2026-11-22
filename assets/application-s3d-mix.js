/* scene: a transparent block of concrete, built in three steps: 20 mm coarse aggregate, then M-Sand (the fine aggregate) in the spaces between, then cement paste.
   The particle sizes are compressed so both fractions stay visible, and no proportion, ratio or strength is implied. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { reduce, V3, TAU } from '/assets/application-s3d-sand.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
const { clamp, sm } = L;

const W = 9, H = 6.4, D = 6;
export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 14, key: 2.2, shadow: .26, map: 2048 });
  const r = rng(404);
  /* coarse: sequential placement, no overlap */
  const stones = []; for (let tries = 0; tries < 900 && stones.length < 40; tries++) {
    const s = .82 + r() * .34, x = (r() - .5) * (W - 2 * s * .8), y = s * .8 + r() * (H - 2 * s * 1.6), z = (r() - .5) * (D - 2 * s * .8);
    if (stones.every(o => Math.hypot(o[0] - x, o[1] - y, o[2] - z) > (o[3] + s) * .86)) stones.push([x, y, z, s]);
  }
  /* fine: grains in the spaces, not inside a stone */
  const fines = []; for (let tries = 0; tries < 50000 && fines.length < 9000; tries++) {
    const s = .05 + Math.pow(r(), 1.6) * .11, x = (r() - .5) * (W - .3), y = s + r() * (H - .2), z = (r() - .5) * (D - .3);
    if (stones.some(o => Math.hypot(o[0] - x, o[1] - y, o[2] - z) < o[3] * .92 + s)) continue; fines.push([x, y, z, s]);
  }
  const ease = t => t * t * (3 - 2 * t), win = (v, a, w) => ease(clamp((v - a) / w));
  const TONES = [.34, .5, .66, .84], mCs = TONES.map(t => { const m = realStoneMaterial({ tint: t, bump: .05, floor: 0, gain: .95, contrast: .66, scale: .42, soft: 1, grain: .45, own: true }); return m; });
  const mF = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .96, metalness: 0, envMapIntensity: .45 });
  const root = new THREE.Group(); scene.add(root);
  const gC = new THREE.Group(), gF = new THREE.Group(); root.add(gC, gF); const FB = []; let fineIM = null; const stoneM = [];
  /* coarse: real-photo crushed stone, each stone its own shape, turn and tone */
  const QS = realStones('quarry'), rs = rng(21);
  stones.forEach(([x, y, z, sz], i) => { const m = new THREE.Mesh(QS[i % QS.length], mCs[(i * 7 + (i >> 2)) % 4]); m.position.set(x, y, z); m.scale.set(sz * (1.05 + rs() * .2), sz * (.86 + rs() * .22), sz * (1.05 + rs() * .2)); m.rotation.set(rs() * 6.28, rs() * 6.28, rs() * 6.28); m.castShadow = true; m.receiveShadow = true; gC.add(m); stoneM.push({ m, bs: m.scale.clone(), y }); });
  { const order = stoneM.map((q, i) => i).sort((a, b) => stoneM[a].y - stoneM[b].y); order.forEach((i, rk) => { stoneM[i].t0 = rk / stoneM.length * .3; }); }
  /* fine: sand grains, angular, in beige, grey and white, in many tones */
  { const SAND = ['#b3a58b', '#a39579', '#c8bda5', '#8c8a82', '#7f8387', '#d2cdc0', '#968a70', '#6f7478', '#bdb09a', '#e4dfd2'].map(c => new THREE.Color(c)), gg = (() => { const g = new THREE.SphereGeometry(1, 7, 5), q = g.attributes.position, rg = rng(5); for (let i = 0; i < q.count; i++) { const k = .78 + rg() * .4; q.setXYZ(i, q.getX(i) * k, q.getY(i) * k * .9, q.getZ(i) * k); } g.computeVertexNormals(); return g; })(), im = new THREE.InstancedMesh(gg, mF, fines.length), o = new THREE.Object3D(), rf = rng(33);
    fines.forEach(([x, y, z, sz], i) => { o.position.set(x, y, z); o.scale.set(sz * (.8 + rf() * .6), sz * (.6 + rf() * .5), sz * (.8 + rf() * .6)); o.rotation.set(rf() * 6, rf() * 6, rf() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); FB[i] = { p: o.position.clone(), s: o.scale.clone(), q: o.quaternion.clone(), th: .3 + .34 * ((y / H) * .75 + rf() * .25) }; const c = SAND[(rf() * SAND.length) | 0].clone().multiplyScalar(.8 + rf() * .4); im.setColorAt(i, c); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.castShadow = false; gF.add(im); fineIM = im; }
  const paste = new THREE.Mesh(new THREE.BoxGeometry(W + .05, H, D + .05), new THREE.MeshPhysicalMaterial({ color: 0xa9a496, roughness: .28, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide, clearcoat: .8, clearcoatRoughness: .15, envMapIntensity: 1.3 })); paste.position.y = H / 2; paste.renderOrder = 5; root.add(paste);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + .05, H, D + .05)), new THREE.LineBasicMaterial({ color: 0x7d7f84, transparent: true, opacity: .8 })); edge.position.y = H / 2; root.add(edge);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, .35, D + 1.4), new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: .5, envMapIntensity: .8 })); slab.position.y = -.18; slab.receiveShadow = true; root.add(slab);
  const hotE = new THREE.Color(0xff5e29), off = new THREE.Color(0x000000);

  const views = { iso: { az: -26, el: 24, dist: 26, t: [0, 3, 0] }, front: { az: 0, el: 9, dist: 26, t: [0, 3, 0] }, top: { az: -14, el: 62, dist: 25, t: [0, 3, 0] } };
  const hs = stones.reduce((a, o) => (o[1] > a[1] ? o : a), stones[0]);
  const labels = [
    { id: 'coarse', text: '20 mm coarse aggregate', side: 'l', anchor: new V3(-W / 2 + .2, H * .62, D / 2), show: st => st.show !== 'fine' && (st.build ?? 1) > .18 },
    { id: 'fine', text: (state.nm || 'M-Sand') + ': the fine aggregate', side: 'r', tone: 'hot', anchor: new V3(W / 2 - .6, 1.3, D / 2), show: st => st.show !== 'coarse' && (st.build ?? 1) > .5 },
    { id: 'paste', text: 'Cement paste', side: 'r', anchor: new V3(W / 2, H, D / 2 - 1), show: st => st.show === 'both' && (st.build ?? 1) > .9 },
  ];
  let tp = 14 * .76, lastSync = 0, lastB = -1;   /* the loop opens on the finished block (as the poster shows), holds, fades away and then builds up */
  return {
    scene, views, fov: 30, labels, limits: { az: [-80, 80], el: [4, 72], dist: [10, 50] },
    update(t, dt, st, fig) {
      let anim = false;
      if (st.play && !reduce()) { tp += dt; const cyc = 14, k = (tp % cyc) / cyc; st.build = k < .72 ? k / .72 : k < .9 ? 1 : 1 - win(k, .9, .1); anim = true; if (t - lastSync > .12) { lastSync = t; fig.sync(); } }
      const b = st.build ?? 1, show = st.show || 'both';
      stoneM.forEach(q => { const e = win(b, q.t0, .09); q.m.visible = e > .002; q.m.scale.copy(q.bs).multiplyScalar(e); q.m.position.y = q.y + (1 - e) * .5; });
      if (fineIM && Math.abs(b - lastB) > .0015) { lastB = b; const o = new THREE.Object3D(); FB.forEach((g, i) => { const e = win(b, g.th, .05); o.position.copy(g.p); o.position.y -= (1 - e) * .25; o.quaternion.copy(g.q); o.scale.copy(g.s).multiplyScalar(Math.max(e, .0001)); o.updateMatrix(); fineIM.setMatrixAt(i, o.matrix); }); fineIM.instanceMatrix.needsUpdate = true; }
      const pe = win(b, .62, .3); paste.material.opacity = .3 * pe;
      gC.visible = show !== 'fine'; gF.visible = show !== 'coarse'; paste.visible = show === 'both' && pe > .01;
      mCs.forEach(m => { m.emissive.copy(show === 'coarse' ? hotE : off); m.emissiveIntensity = show === 'coarse' ? .12 : 0; });
      mF.emissive.copy(show === 'fine' ? hotE : off); mF.emissiveIntensity = show === 'fine' ? .22 : 0;
      root.rotation.y = reduce() ? 0 : Math.sin(t * .15) * .0;
      return anim;
    },
    onSet(k, v, st) { if (k === 'play' && v) { tp = 14 * .9; } },
  };
}
