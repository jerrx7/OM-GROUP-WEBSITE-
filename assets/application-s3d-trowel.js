/* scene: from sand to a plastered wall. Two sets, one module.
   reveal : plaster-grade sand falls into a heap, becomes mortar on a hawk, and a trowel carries it across a prepared wall in three passes.
   work   : the six movements of applying plaster (loading, spreading, levelling, ruling, floating, finishing); the wall surface changes with each.
   The mortar, the wall and the tools are simplified and the surface does not become perfect on its own. No mix, thickness or finish quality is shown or implied. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, moundBase, moundItems, reduce, V3 } from '/assets/application-s3d-sand.js';
const { mk, canvasTex, clamp, sm } = L;

const speck = (base, sp, seed, n = 2600) => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < n; i++) { x.fillStyle = sp[(r() * sp.length) | 0]; x.globalAlpha = .25 + r() * .5; const s = .8 + r() * 1.8; x.fillRect(r() * w, r() * h, s, s); } x.globalAlpha = 1;
}, true);
const brickTex = () => canvasTex(512, 320, (x, w, h) => {
  const r = rng(9); x.fillStyle = '#a8a49c'; x.fillRect(0, 0, w, h); const bw = 76, bh = 30, j = 5;
  for (let c = 0; c * (bh + j) < h; c++) for (let i = -1; i * (bw + j) < w; i++) { const ox = c % 2 ? (bw + j) / 2 : 0, px = i * (bw + j) + ox, py = c * (bh + j); x.fillStyle = ['#a8503a', '#9a4630', '#b05c42', '#a24c36'][(r() * 4) | 0]; x.fillRect(px, py, bw, bh); }
}, true);

export default function build({ state }) {
  const set = state.set === 'work' ? 'work' : 'reveal';
  const scene = new THREE.Scene(); studio(scene, { ext: 24, key: 2.2, shadow: .2, map: 2048 });
  const WX = 12, WY = 7.5, BAND = WY / 3, X0 = set === 'work' ? 0 : 7;
  /* the wall: a plain masonry background, then three bands of mortar that grow across it */
  const wall = mk(new THREE.BoxGeometry(WX, WY, .8), new THREE.MeshStandardMaterial({ map: brickTex(), roughness: .95 })); wall.position.set(X0, WY / 2, -.4); scene.add(wall);
  const mortarM = new THREE.MeshStandardMaterial({ map: speck('#9b968b', ['#7e796f', '#b4afa4', '#6d6a62'], 61, 3800), roughness: 1, color: 0xffffff });
  const bands = [0, 1, 2].map(i => { const g = new THREE.BoxGeometry(WX, BAND + .02, .26); g.translate(WX / 2, 0, 0); const m = mk(g, mortarM); m.position.set(X0 - WX / 2, BAND * (2 - i) + BAND / 2, .13); m.scale.x = .0001; m.visible = false; scene.add(m); return m; });
  const coverAt = (cov) => bands.forEach((b, i) => { const c = clamp(cov * 3 - i, 0, 1); b.scale.x = Math.max(.0001, c); b.visible = c > .001; });
  /* tools */
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: .75, roughness: .32 }), wood = new THREE.MeshStandardMaterial({ color: 0xb98a52, roughness: .7 });
  const trowel = new THREE.Group(); { const pl = mk(new THREE.BoxGeometry(3.4, 1.15, .07), steel); const hd = mk(new THREE.CylinderGeometry(.11, .11, 1.1, 10), wood); hd.rotation.x = Math.PI / 2; hd.position.set(0, 0, .55); const ar = mk(new THREE.BoxGeometry(.1, .1, .5), steel); ar.position.z = .25; trowel.add(pl, hd, ar); } trowel.visible = false; scene.add(trowel);
  const rule = new THREE.Group(); { const bar = mk(new THREE.BoxGeometry(WX + .8, .32, .16), wood); rule.add(bar); } rule.visible = false; scene.add(rule);
  const floatT = new THREE.Group(); { const pl = mk(new THREE.BoxGeometry(2.6, 1.6, .12), wood); const hd = mk(new THREE.BoxGeometry(.22, .22, .5), wood); hd.position.z = .3; floatT.add(pl, hd); } floatT.visible = false; scene.add(floatT);
  /* the sand heap and the mortar on the hawk */
  const heapG = new THREE.Group(); heapG.position.set(set === 'work' ? -13 : -3, 0, 2.2); scene.add(heapG);
  const R0 = 3.4, H0 = 3.1, gmat = grainMat(), rr = rng(77);
  const hbase = moundBase(R0, H0, 0x77726a); heapG.add(hbase);
  const ims = inst(heapG, moundItems(1500, R0 * .96, H0, () => .06 + rr() * .1, rr), grainGeos('ang', 'm'), gmat, 77, false);
  const counts = ims.map(m => m.count);
  const hawk = new THREE.Group(); hawk.position.set(set === 'work' ? -8.5 : -9.6, 2.2, 2.2); scene.add(hawk);
  const board = mk(new THREE.CylinderGeometry(1.8, 1.8, .1, 36), wood); const hHand = mk(new THREE.CylinderGeometry(.1, .1, 1.5, 10), wood); hHand.position.y = -.75; hawk.add(board, hHand);
  const mound = mk(new THREE.SphereGeometry(1.15, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: speck('#8b867c', ['#6f6b62', '#aaa59a'], 62, 2400), roughness: 1 })); mound.scale.set(1, .55, 1); mound.position.y = .05; hawk.add(mound);
  /* falling grains: a small instanced stream above the heap */
  const fall = []; const rf = rng(5); for (let i = 0; i < 160; i++) fall.push([(rf() - .5) * .5, rf() * 14, (rf() - .5) * .5, .05 + rf() * .06]);
  const fims = inst(heapG, fall, grainGeos('ang', 'm'), gmat, 81, false); const fo = new THREE.Object3D(), frng = rng(81);
  const fbase = fall.map(a => a.slice());
  const place = (t) => fims.forEach(im => { /* positions animate, scale kept from creation */ });

  const stages = ['Loading', 'Spreading', 'Levelling', 'Ruling', 'Floating', 'Finishing'];
  const views = set === 'work' ? { all: { az: -18, el: 12, dist: 34, t: [-2, 3.6, 0] } } : { all: { az: -14, el: 14, dist: 32, t: [1.6, 3.4, 0] } };
  const labels = set === 'work' ? [
    { id: 'h', text: 'Mortar on the hawk', side: 'r', anchor: new V3(-8.5, 3.5, 2.2), show: st => (st.stage ?? 0) <= 1 },
    { id: 'w', text: 'Prepared background', side: 'r', anchor: new V3(-5.2, 6.8, .2), show: st => (st.stage ?? 0) === 0 },
    { id: 't', text: 'The plaster layer', side: 'r', tone: 'hot', anchor: new V3(4.6, 5.2, .4), show: st => (st.stage ?? 0) >= 1 },
  ] : [
    { id: 's', text: 'Plaster-grade sand', side: 'r', tone: 'hot', anchor: new V3(-3, 4.2, 2.2), show: st => (st.build ?? 0) < .6 },
    { id: 'm', text: 'Mortar: sand, binder and water', side: 'l', anchor: new V3(-9.6, 4.4, 2.2), show: st => (st.build ?? 0) > .3 && (st.build ?? 0) < .75 },
    { id: 'p', text: 'Plaster layer on the wall', side: 'r', tone: 'hot', anchor: new V3(11, 7.6, .4), show: st => (st.build ?? 0) > .55 },
  ];
  let cur = -1, ph = 0;
  const finishCol = new THREE.Color(0xd2cdc3), roughCol = new THREE.Color(0xffffff);
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-60, 40], el: [4, 50], dist: [12, 70] },
    update(t, dt, st) {
      let anim = false;
      if (set === 'work') {
        const s = st.stage ?? 0, f = [[0, 0], [.7, 0], [1, .35], [1, .65], [1, .85], [1, 1]][s];
        /* wall: coverage grows, then the surface settles from rough to matte to finished */
        coverAt(f[0] * (s === 1 ? .66 : 1)); mortarM.color.copy(roughCol).lerp(finishCol, s >= 4 ? (s === 4 ? .5 : 1) : 0);
        mortarM.roughness = s === 5 ? .72 : 1; bands.forEach(b => { b.scale.z = s >= 3 ? .86 : 1; });
        heapG.visible = s === 0; mound.visible = s <= 1; hawk.visible = s <= 2;
        counts.forEach((c, i) => { ims[i].count = c; }); fims.forEach(im => { im.visible = false; });
        const k = reduce() ? 0 : Math.sin(t * 2.4);
        trowel.visible = s >= 0 && s <= 2 || s === 5; rule.visible = s === 3; floatT.visible = s === 4;
        if (s === 0) { trowel.position.set(-8.5 + k * .5, 3.3, 2.7); trowel.rotation.set(-.35, 0, -.1); }
        else if (s === 1) { trowel.position.set(-3 + ((k + 1) / 2) * 8, 5.4 - ((k + 1) / 2) * .2 - .2, 1.0); trowel.rotation.set(-.12, 0, .06); }
        else if (s === 2) { trowel.position.set(-3 + ((k + 1) / 2) * 8, 3.4 + k * .5, .85); trowel.rotation.set(0, 0, 0); }
        else if (s === 3) { rule.position.set(0, 3.9 + Math.sin(t * 1.3) * 2.6, .75); }
        else if (s === 4) { floatT.position.set(-1 + Math.cos(t * 1.8) * 3, 3.8 + Math.sin(t * 1.8) * 1.2, .75); floatT.rotation.z = Math.sin(t * 1.8) * .2; }
        else { trowel.position.set(-3 + ((k + 1) / 2) * 8, 3.8 + k * 2, .62); trowel.rotation.set(0, 0, .1); }
        anim = !reduce();
      } else {
        const b = st.build ?? 0;
        if (st.play && !reduce()) { ph = (ph + dt / 14) % 1.12; if (ph > 1) ph = 1; }
        const u = st.play && !reduce() ? ph : b; if (!(st.play && !reduce())) ph = b;
        const grow = sm(0, .32, u), mortar = sm(.3, .5, u), wall01 = sm(.5, .92, u), fin = sm(.9, 1, u);
        counts.forEach((c, i) => { ims[i].count = Math.max(0, Math.round(c * grow * (1 - mortar * .92))); }); hbase.scale.set(1 - mortar * .7, Math.max(.05, grow * (1 - mortar * .85)), 1 - mortar * .7);
        fims.forEach(im => { im.visible = u < .34; }); heapG.visible = true;
        mound.scale.set(1, .55 * (.2 + .8 * mortar) * (1 - .75 * sm(.5, .85, u)), 1); mound.visible = mortar > .02;
        coverAt(wall01); mortarM.color.copy(roughCol).lerp(finishCol, fin); mortarM.roughness = 1 - .28 * fin;
        trowel.visible = u > .45 && u < .96; const pass = clamp(wall01 * 3, 0, 3), row = Math.min(2, Math.floor(pass)), fx = pass - row;
        trowel.position.set(X0 - WX / 2 + fx * WX, BAND * (2 - row) + BAND / 2 + Math.sin(t * 5) * .08, .75); trowel.rotation.set(-.1, 0, row % 2 ? .12 : -.1);
        if (u < .5) trowel.position.set(-9.6 + (u - .45) * 20, 3.6, 2.5);
        if (u < .5 && u > .45) trowel.visible = true;
        anim = st.play ? !reduce() : u !== cur; cur = u;
        /* falling stream: positions move through a fixed column and land on the heap */
        if (u < .34 && !reduce()) { const tt = t * 5; fims.forEach(im => { const o = new THREE.Object3D(); for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, o.matrix); o.matrix.decompose(o.position, o.quaternion, o.scale); o.position.y = ((o.position.y - dt * 8) + 14) % 14 + .3 * H0 * grow; o.updateMatrix(); im.setMatrixAt(i, o.matrix); } im.instanceMatrix.needsUpdate = true; }); anim = true; }
      }
      return anim;
    },
    onSet() { },
    seek(u) { ph = u; },
  };
}
