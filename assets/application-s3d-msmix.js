/* scene: a transparent block of concrete, built in three steps: 20 mm coarse aggregate, then M-Sand (the fine aggregate) in the spaces between, then cement paste (M-Sand page).
   Coarse stones are photo-textured quarry stones; the sand is the same fractured, speckled crushed-rock grain used in the M-Sand macro figure (application-s3d-msand.js), in many tones; the paste is smoky glass
   on a glossy plinth. Particle sizes are compressed so both fractions stay visible, and no proportion, ratio or strength is implied. Numbered markers, key beside the figure. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { reduce } from '/assets/application-s3d-sand.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { crushed, grainMat, mineral, sandOf } from '/assets/application-s3d-msand.js';
const { clamp } = L;
const V3 = THREE.Vector3;

const W = 9, H = 6.4, D = 6;
export default function build({ state }) {
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 14, key: 2.5, shadow: .22, map: 3072 });
  key.shadow.bias = -.0002; key.shadow.normalBias = .02;
  const r = rng(404);
  /* coarse: sequential placement, no overlap */
  const stones = []; for (let tries = 0; tries < 1200 && stones.length < 42; tries++) {
    const s = .8 + r() * .36, x = (r() - .5) * (W - 2 * s * .8), y = s * .8 + r() * (H - 2 * s * 1.6), z = (r() - .5) * (D - 2 * s * .8);
    if (stones.every(o => Math.hypot(o[0] - x, o[1] - y, o[2] - z) > (o[3] + s) * .86)) stones.push([x, y, z, s]);
  }
  /* fine: sand grains in the spaces, not inside a stone */
  const fines = []; for (let tries = 0; tries < 90000 && fines.length < 15000; tries++) {
    const s = .045 + Math.pow(r(), 1.7) * .12, x = (r() - .5) * (W - .3), y = s + r() * (H - .2), z = (r() - .5) * (D - .3);
    if (stones.some(o => Math.hypot(o[0] - x, o[1] - y, o[2] - z) < o[3] * .92 + s)) continue; if (z > D / 2 - 1.2 && r() > .45) continue; fines.push([x, y, z, s]);
  }
  const ease = t => t * t * (3 - 2 * t), win = (v, a, w) => ease(clamp((v - a) / w));
  /* coarse stones: real photo texture, darker and richer than the first version, each stone its own shape, turn and tone */
  const TONES = [.32, .42, .52, .64], mCs = TONES.map(t => realStoneMaterial({ tint: t, bump: .045, floor: 0, gain: 1.05, contrast: .6, scale: .6, soft: 1, grain: .2, own: true }));
  const root = new THREE.Group(); scene.add(root);
  const gC = new THREE.Group(), gF = new THREE.Group(); root.add(gC, gF); const FB = []; let fineIM = []; const stoneM = [];
  const QS = realStones('quarry'), rs = rng(21);
  stones.forEach(([x, y, z, sz], i) => { const m = new THREE.Mesh(QS[i % QS.length], mCs[(i * 7 + (i >> 2)) % 4]); m.position.set(x, y, z); m.scale.set(sz * (1.05 + rs() * .2), sz * (.86 + rs() * .22), sz * (1.05 + rs() * .2)); m.rotation.set(rs() * 6.28, rs() * 6.28, rs() * 6.28); m.castShadow = true; m.receiveShadow = true; gC.add(m); stoneM.push({ m, bs: m.scale.clone(), y }); });
  { const order = stoneM.map((q, i) => i).sort((a, b) => stoneM[a].y - stoneM[b].y); order.forEach((i, rk) => { stoneM[i].t0 = rk / stoneM.length * .3; }); }
  /* fine: M-Sand grains, fractured and speckled, grey, charcoal, quartz-white and tan */
  const SO = sandOf(state), river = SO.round, TT = SO.TT || [1, 1, 1];   /* river sand: worn, rounded grains in warm quartz and feldspar tones */
  const mF = grainMat(river ? { bump: .05, rough: .6 } : {}), geos = river ? [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')).concat([0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round'))) : [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), per = geos.map(() => []);
  fines.forEach((f, i) => per[i % geos.length].push(f));
  { const o = new THREE.Object3D(), rf = rng(33), col = new THREE.Color(); let k = 0;
    per.forEach((arr, gi) => {
      const im = new THREE.InstancedMesh(geos[gi], mF, arr.length); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true;
      arr.forEach(([x, y, z, sz], i) => { o.position.set(x, y, z); o.scale.set(sz * (.8 + rf() * .5), sz * (.6 + rf() * .5), sz * (.8 + rf() * .5)); o.rotation.set(rf() * 6, rf() * 6, rf() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); FB.push({ im, i, p: o.position.clone(), s: o.scale.clone(), q: o.quaternion.clone(), th: .3 + .34 * ((y / H) * .75 + rf() * .25) }); const c = mineral(rf); col.setRGB(c[0] * TT[0], c[1] * TT[1], c[2] * TT[2]); im.setColorAt(i, col); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; gF.add(im); fineIM.push(im);
    }); }
  /* the paste: smoky glass around everything, with a fine bright edge, on a glossy plinth */
  const paste = new THREE.Mesh(new THREE.BoxGeometry(W + .05, H, D + .05), new THREE.MeshPhysicalMaterial({ color: 0x8e8b82, roughness: .16, transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.5 })); paste.position.y = H / 2; paste.renderOrder = 5; root.add(paste);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + .05, H, D + .05)), new THREE.LineBasicMaterial({ color: 0xcfd1d4, transparent: true, opacity: .55 })); edge.position.y = H / 2; root.add(edge);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 1.6, .4, D + 1.6), new THREE.MeshPhysicalMaterial({ color: 0xf2f0ec, roughness: .28, metalness: 0, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: 1 })); plinth.position.y = -.2; plinth.receiveShadow = true; root.add(plinth);
  
  const views = { iso: { az: -26, el: 24, dist: 24.5, t: [0, 3, 0] }, front: { az: 0, el: 9, dist: 24.5, t: [0, 3, 0] }, top: { az: -14, el: 62, dist: 24, t: [0, 3, 0] } };
  const pick = stones.filter(o => o[2] > 0 && o[0] < -.6).sort((a, b) => b[3] - a[3])[0] || stones[0];
  const labels = [
    { id: 'coarse', text: '20 mm coarse aggregate', side: 'l', anchor: new V3(pick[0], pick[1] + pick[3] * .7, D / 2), show: st => st.show !== 'fine' && (st.build ?? 1) > .18 },
    { id: 'fine', text: (state.nm || 'M-Sand') + ': the fine aggregate', side: 'r', tone: 'hot', anchor: new V3(W / 2 - 1.2, 1.1, D / 2), show: st => st.show !== 'coarse' && (st.build ?? 1) > .5 },
    { id: 'paste', text: 'Cement paste', side: 'r', anchor: new V3(W / 2, H, D / 2 - .8), show: st => st.show === 'both' && (st.build ?? 1) > .9 },
  ];
  let tp = 14 * .76, lastSync = 0, lastB = -1;   /* opens on the finished block, holds, fades away and then builds up */
  const o2 = new THREE.Object3D();
  return {
    scene, views, fov: 30, labels, limits: { az: [-80, 80], el: [4, 72], dist: [10, 50] },
    update(t, dt, st, fig) {
      let anim = false;
      if (st.play && !reduce()) { tp += dt; const cyc = 14, k = (tp % cyc) / cyc; st.build = k < .72 ? k / .72 : k < .9 ? 1 : 1 - win(k, .9, .1); anim = true; if (t - lastSync > .12) { lastSync = t; fig.sync(); } }
      const b = st.build ?? 1, show = st.show || 'both';
      stoneM.forEach(q => { const e = win(b, q.t0, .09); q.m.visible = e > .002; q.m.scale.copy(q.bs).multiplyScalar(e); q.m.position.y = q.y + (1 - e) * .5; });
      if (Math.abs(b - lastB) > .0015) { lastB = b; FB.forEach(g => { const e = win(b, g.th, .05); o2.position.copy(g.p); o2.position.y -= (1 - e) * .25; o2.quaternion.copy(g.q); o2.scale.copy(g.s).multiplyScalar(Math.max(e, .0001)); o2.updateMatrix(); g.im.setMatrixAt(g.i, o2.matrix); }); fineIM.forEach(im => { im.instanceMatrix.needsUpdate = true; }); }
      const pe = win(b, .62, .3); paste.material.opacity = .2 * pe; edge.material.opacity = .55 * pe;
      gC.visible = show !== 'fine'; gF.visible = show !== 'coarse'; paste.visible = show === 'both' && pe > .01; edge.visible = paste.visible;
      return anim;
    },
    onSet(k, v, st) { if (k === 'play' && v) { tp = 14 * .9; } },
  };
}
