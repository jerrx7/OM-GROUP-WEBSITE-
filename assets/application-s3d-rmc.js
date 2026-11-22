/* scene: a ready-mix batching plant, diagram. Separate aggregate bins feed a belt to the mixer; cement, water and admixture join; fresh concrete runs into a transit mixer.
   A general view: no batch quantity, ratio or mix is shown or implied, and it is not a picture of any particular plant. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk, put, clamp } = L;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 20, key: 2.2, shadow: .22, map: 2048 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: .6, roughness: .45 }), orange = M.orange, dark = M.dark;
  const bx = (w, h, d, mat, x, y, z) => { const m = mk(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); return m; };
  const cy = (rt, rb, h, mat, x, y, z, seg = 40) => { const m = mk(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); scene.add(m); return m; };
  /* ground slab + belt gantry */
  bx(30, .3, 14, new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: .8 }), 0, -.15, 0);
  const fills = [0xc5a77c, 0x55575c, 0x6a6c72], binX = [-10.5, -7, -3.5];
  binX.forEach((x, i) => {
    /* bin: open box on legs with a funnel */
    [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([a, b]) => bx(.18, 3.4, .18, steel, x + a, 1.7, b));
    const body = mk(new THREE.BoxGeometry(3, 2.2, 3), steel); body.position.set(x, 4.5, 0); scene.add(body);
    const fn = mk(new THREE.CylinderGeometry(1.5, .35, 1.2, 4, 1, true), steel); fn.rotation.y = Math.PI / 4; fn.position.set(x, 3.2, 0); scene.add(fn);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.45, .8, 7), new THREE.MeshStandardMaterial({ color: fills[i], roughness: 1 })); top.position.set(x, 5.9, 0); scene.add(top); const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .7), new THREE.MeshBasicMaterial({ map: L.canvasTex(256, 80, (c, w, h) => { c.fillStyle = i === 0 ? '#ff5e29' : '#2a2c30'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 38px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(i === 0 ? 'M-SAND' : 'COARSE', w / 2, h / 2 + 2); }, true) })); sign.position.set(x, 4.6, 1.51); scene.add(sign);
    
  });
  bx(13.5, .26, 1.2, dark, -6.2, 2.4, 0); /* belt, flat part */
  const inc = mk(new THREE.BoxGeometry(8.6, .26, 1.2), dark); inc.position.set(1.9, 5.1, 0); inc.rotation.z = Math.atan2(5.2 - 2.4, 8.6) * 0 + .33; scene.add(inc);
  /* mixer + hopper */
  bx(3.6, 2.2, 3.2, steel, 6, 8.6, 0); const drum = mk(new THREE.CylinderGeometry(1.2, 1.2, 3.0, 40), M.steelS); drum.rotation.x = Math.PI / 2; drum.position.set(6, 6.2, 0); scene.add(drum);
  const hop = mk(new THREE.CylinderGeometry(1.5, .6, 1.4, 4, 1, true), steel); hop.rotation.y = Math.PI / 4; hop.position.set(4.3, 9.9, 0); scene.add(hop);
  [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]].forEach(([a, b]) => bx(.2, 5.2, .2, steel, 6 + a, 2.6 * 1 + 0, b * 1.2));
  /* silo, water, admixture */
  cy(1.25, 1.25, 7.5, M.white, 11.5, 4.6, -3.2); cy(1.25, .3, 1.2, M.white, 11.5, .6, -3.2); cy(.05, .05, 5.8, steel, 8.8, 8.8, -1.6).rotation.z = Math.PI / 2 - .35;
  cy(1.1, 1.1, 2.6, new THREE.MeshPhysicalMaterial({ color: 0x8fc9ea, roughness: .2, transparent: true, opacity: .7 }), 11.5, 1.5, 3.4);
  cy(.55, .55, 1.6, orange, 8.7, 10.2, 3.2);
  /* transit mixer */
  const truck = new THREE.Group(); truck.position.set(6, 0, 5.4); scene.add(truck);
  const ch = mk(new THREE.BoxGeometry(8.5, .5, 2.2), dark); ch.position.set(0, 1.1, 0); truck.add(ch);
  const cab = mk(new THREE.BoxGeometry(2, 1.8, 2.2), orange); cab.position.set(3.4, 2.2, 0); truck.add(cab);
  [[-2.8], [1.2], [2.6]].forEach(([x]) => { const w = mk(new THREE.CylinderGeometry(.62, .62, .5, 24), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, .62, 1.05); truck.add(w); const w2 = w.clone(); w2.position.z = -1.05; truck.add(w2); });
  const td = mk(new THREE.CylinderGeometry(1.25, .55, 4.8, 36), M.white); td.rotation.z = Math.PI / 2 + .17; td.position.set(-1, 2.7, 0); truck.add(td);
  const chute = mk(new THREE.BoxGeometry(2, .15, .6), steel); chute.position.set(-4.2, 3.3, 0); chute.rotation.z = .5; truck.add(chute);
  /* flowing material */
  const N = 130, geos = grainGeos('ang', 'm'), gm = grainMat(); const im = new THREE.InstancedMesh(geos[1], gm, N); im.frustumCulled = false; scene.add(im);
  const P = [new V3(-10.5, 3.0, 0), new V3(-3.5, 3.0, 0), new V3(0, 2.7, 0)].length; const r = rng(5);
  const path = i => { const x = binX[i], pts = [new V3(x, 3.4, 0), new V3(x, 2.65, 0), new V3(-1, 2.65, 0), new V3(3.4, 4.9, 0), new V3(4.3, 9.6, 0), new V3(5, 7.6, 0)]; return pts; };
  const items = Array.from({ length: N }, (_, k) => ({ src: k % 3, ph: r(), sp: .1 + r() * .02, s: .2 + r() * .13, o: r() * 6 }));
  const hotC = new THREE.Color(0xff5e29), tan = new THREE.Color(0xd2b88c), gr = new THREE.Color(0x8d9096), o3 = new THREE.Object3D();
  const lerpPath = (pts, u) => { const lens = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); lens.push(l); tot += l; } let d = u * tot; for (let i = 0; i < lens.length; i++) { if (d <= lens[i]) return pts[i].clone().lerp(pts[i + 1], d / lens[i]); d -= lens[i]; } return pts[pts.length - 1].clone(); };
  const paths = [0, 1, 2].map(path);
  /* fresh concrete stream */
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 1, 12), new THREE.MeshStandardMaterial({ color: 0x8b8d92, roughness: .5 })); stream.position.set(6, 3.2, 0); scene.add(stream);
  const views = { overview: { az: -28, el: 20, dist: 44, t: [0, 4.2, 0] }, bins: { az: -18, el: 16, dist: 22, t: [-7, 3.8, 0] }, mixer: { az: -30, el: 14, dist: 22, t: [7, 5.6, 0] } };
  const L_ = (id, text, a, side, show, tone) => ({ id, text, side, tone, anchor: a, show });
  const labels = [
    L_('sand', (state.nm || 'M-Sand') + ' bin: the fine aggregate', new V3(-10.5, 6.2, 0), 'l', () => true, 'hot'),
    L_('coarse', 'Coarse aggregate bins', new V3(-5.2, 6.2, 0), 'r', () => true),
    L_('belt', 'Conveyor to the mixer', new V3(-2.2, 3.2, 1), 'r', () => true),
    L_('cement', 'Cement silo', new V3(11.5, 8.6, -3.2), 'r', () => true),
    L_('water', 'Water', new V3(11.5, 3, 3.4), 'r', st => st.view !== 'bins'),
    L_('adm', 'Admixture, where specified', new V3(8.7, 11.1, 3.2), 'r', () => true),
    L_('mixer', 'Mixer', new V3(6, 9.9, 1.6), 'r', () => true),
    L_('truck', 'Fresh concrete to the transit mixer', new V3(1.6, 3.4, 5.4), 'l', () => true),
  ];
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-80, 80], el: [4, 60], dist: [12, 70] },
    update(t, dt, st) {
      const hl = !!st.hl; items.forEach((it, i) => {
        const u = reduce() ? it.ph : (t * it.sp * 1.6 + it.ph) % 1, p = lerpPath(paths[it.src], u); o3.position.copy(p).add(new V3((r() - .5) * 0, 0, 0)); o3.scale.setScalar(it.s); o3.rotation.set(it.o + u * 5, it.o, 0); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix);
        im.setColorAt(i, it.src === 0 ? (hl ? hotC : tan) : gr);
      }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      drum.rotation.y = reduce() ? 0 : t * 1.6; td.rotation.x = reduce() ? 0 : t * 1.1; const fl = reduce() ? 1 : .5 + .5 * Math.sin(t * 2); stream.scale.set(1, 2.4, 1); stream.position.set(6, 3.1, 0);
      return !reduce();
    },
  };
}
