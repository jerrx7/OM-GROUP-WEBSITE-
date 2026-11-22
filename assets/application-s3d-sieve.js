/* scene: M-Sand grains. Three views: a macro dish of crushed-stone fine aggregate, two particle shapes, and the 4.75 mm IS sieve.
   1 unit = 1 mm. The grain populations are generated, not a measured sample: the grading of real material comes only from a sieve analysis. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, hotMat, inst, sizeSampler, moundItems, moundBase, dish, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk, put, stone } = L;

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 34, key: 2.3, shadow: .24, map: 2048 });
  const gM = new THREE.Group(), gS = new THREE.Group(), gV = new THREE.Group(); scene.add(gM, gS, gV);
  const mat = grainMat(), hot = hotMat();

  /* ── macro dish ── */
  const rM = rng(11), sizeM = sizeSampler([[.15, 9], [.3, 20], [.6, 38], [1.18, 62], [2.36, 87], [4.75, 100]], rM);
  const dM = dish(20, 1.4); gM.add(dM);
  const turn = new THREE.Group(); gM.add(turn); turn.position.y = 1.2;
  const base = moundBase(14, 6.4, 0x5d5a56); turn.add(base);
  const itemsM = moundItems(5200, 14, 6.2, () => sizeM() / 2 * 1.0, rM); const hotItems = [], restItems = [];
  itemsM.forEach((it, i) => { (it[3] > .7 && it[1] > 3.6 && it[1] < 7 && hotItems.length < 16 && i % 9 === 0 ? hotItems : restItems).push(it); });
  inst(turn, restItems, grainGeos('ang', 'm'), mat, 21, true);
  const hotIm = inst(turn, hotItems, grainGeos('ang', 'm'), hot, 22, false);
  /* 4.75 mm opening drawn as a ring beside the mound, with three grains of different size */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.375, .16, 8, 48), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 })); ring.rotation.x = Math.PI / 2; ring.position.set(9.5, 1.5, 12); gM.add(ring);
  inst(gM, [[8.6, 2.2, 12.4, 1.0], [10.4, 2.4, 11.5, 1.5], [9.6, 2.1, 11.1, .55], [10.6, 2, 13, .35]], grainGeos('ang', 'm'), mat, 5, true);

  /* ── particle shape: two dishes ── */
  const mkShape = (x, kind, seed, flat) => {
    const g = new THREE.Group(); g.position.x = x; gS.add(g); g.add(dish(10.5, 1));
    const r = rng(seed), it = moundItems(620, 7.6, 3.4, () => .55 + r() * .7, r); const mb = moundBase(7.2, 3.4, 0x77746f); mb.position.y = .9; g.add(mb);
    const t = new THREE.Group(); t.position.y = .85; g.add(t); inst(t, it, grainGeos(kind, 'm'), mat, seed + 1, true, flat); return t;
  };
  const tA = mkShape(-13, 'flat', 31, 1), tB = mkShape(13, 'cube', 33, 1);

  /* ── 4.75 mm sieve: a magnified section of the mesh (pitch 6.35 mm, wire 1.6 mm, opening 4.75 mm) ── */
  const N = 10, P = 6.35, WIRE = 1.6, SPAN = N * P;
  const wireGeoX = new THREE.BoxGeometry(SPAN + WIRE, WIRE, WIRE), wireGeoZ = new THREE.BoxGeometry(WIRE, WIRE, SPAN + WIRE);
  for (let i = 0; i <= N; i++) { const a = new THREE.Mesh(wireGeoX, M.steelS); a.position.set(0, 0, (i - N / 2) * P); a.castShadow = true; gV.add(a); const b = new THREE.Mesh(wireGeoZ, M.steelS); b.position.set((i - N / 2) * P, -WIRE, 0); b.castShadow = true; gV.add(b); }
  const frame = new THREE.Group(); gV.add(frame); const brass = new THREE.MeshStandardMaterial({ color: 0xb9a070, metalness: .85, roughness: .32 });
  [[0, SPAN / 2 + 2.5, SPAN + 7, 3.2], [0, -SPAN / 2 - 2.5, SPAN + 7, 3.2]].forEach(([x, z, w, d]) => { const m = mk(new THREE.BoxGeometry(w, 5, d), brass); m.position.set(x, .6, z); frame.add(m); });
  [[SPAN / 2 + 2.5], [-SPAN / 2 - 2.5]].forEach(([x]) => { const m = mk(new THREE.BoxGeometry(3.2, 5, SPAN + 1), brass); m.position.set(x, .6, 0); frame.add(m); });
  const pan = dish(42, 3, M.white); pan.position.y = -42; gV.add(pan);
  const rV = rng(51); const stones = new THREE.Group(); gV.add(stones);
  [[-14, -8, 10], [11, 10, 9.3], [15, -16, 9.6]].forEach(([x, z, s], i) => { const st = stone(rV, s); st.position.set(x, s * .78, z); stones.add(st); });
  /* coarser-than-4.75 mm grains resting on the mesh (a permitted coarser fraction) + the fine grains that pass */
  const rest = []; for (let i = 0; i < 12; i++) { let x, z; do { x = (rV() - .5) * 52; z = (rV() - .5) * 52; } while ([[-14, -8], [11, 10], [15, -16]].some(([a, b]) => Math.hypot(x - a, z - b) < 12)); rest.push([x, 2.1, z, 2.5 + rV() * .8]); }
  const coarse = inst(gV, rest, grainGeos('ang', 'm'), mat, 61, true);
  const fineRest = []; for (let i = 0; i < 160; i++) { let x, z; do { x = (rV() - .5) * 56; z = (rV() - .5) * 56; } while ([[-14, -8], [11, 10], [15, -16]].some(([a, b]) => Math.hypot(x - a, z - b) < 11)); const s = .35 + rV() * 1.2; fineRest.push([x, s * .6 + .8, z, s]); }
  inst(gV, fineRest, grainGeos('ang', 'm'), mat, 62, false);
  const heapItems = moundItems(1100, 20, 11, () => .3 + rV() * 1.0, rV, -39); inst(gV, heapItems, grainGeos('fine', 'm'), mat, 63, false);
  /* the stream that passes */
  const NF = 110, fall = []; const rf = rng(71); const FG = grainGeos('fine', 'm'), fm = new THREE.InstancedMesh(FG[0], mat, NF); fm.frustumCulled = false; gV.add(fm);
  for (let i = 0; i < NF; i++) { const ix = (rf() * N) | 0, iz = (rf() * N) | 0; fall.push({ x: (ix - N / 2 + .5) * P + (rf() - .5) * 1.2, z: (iz - N / 2 + .5) * P + (rf() - .5) * 1.2, ph: rf(), s: .35 + rf() * .95, sp: .22 + rf() * .1, rot: rf() * 6 }); }
  const o = new THREE.Object3D();
  /* the 4.75 mm dimension guide, orange, in front of the mesh */
  const guide = new THREE.Group(); gV.add(guide); const gm = new THREE.MeshBasicMaterial({ color: 0xff5e29 });
  const gx = -SPAN / 2 + P * 2.5, gz = SPAN / 2 + 5; [[0, 0, 0, 4.75, .5, .5], [-2.375, 0, 0, .5, 3.2, .5], [2.375, 0, 0, .5, 3.2, .5]].forEach(([x, y, z, w, h, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gm); m.position.set(gx + x, 1 + y, gz + z); guide.add(m); });

  const views = {
    macro: { az: -12, el: 32, dist: 50, t: [0, 3, 3] },
    shape: { az: -10, el: 32, dist: 62, t: [0, 2.5, 0] },
    sieve: { az: -22, el: 30, dist: 125, t: [0, -14, 0] },
  };
  const L_ = (id, text, side, anchor, views_, tone) => ({ id, text, side, anchor, tone, show: st => views_.includes(st.view) });
  const labels = [
    L_('grains', 'Angular crushed-rock grains', 'r', new V3(2, 8.5, 0), ['macro']),
    L_('fines', 'Fine grains between the larger ones', 'l', new V3(-5, 5, 9), ['macro']),
    L_('ring', '4.75 mm: the IS sieve opening, shown to scale', 'r', new V3(9.5, 2, 12), ['macro'], 'hot'),
    L_('flat', 'More angular or flaky form', 'r', new V3(-13, 7, 0), ['shape']),
    L_('cube', 'Better-shaped, more equidimensional form', 'l', new V3(13, 7, 0), ['shape']),
    L_('stone', '20 mm aggregate: retained on the sieve', 'l', new V3(-14, 16, -8), ['sieve']),
    L_('retained', 'A few coarser grains stay on the mesh', 'r', new V3(-6, 6, 26), ['sieve']),
    L_('pass', 'Fine grains pass through the openings', 'r', new V3(14, -22, 4), ['sieve'], 'hot'),
    L_('dim', '4.75 mm opening', 'r', new V3(gx, 4, gz), ['sieve'], 'hot'),
  ];
  const upd = (t, dt, st) => {
    gM.visible = st.view === 'macro'; gS.visible = st.view === 'shape'; gV.visible = st.view === 'sieve';
    hotIm.forEach(m => { m.visible = !!st.hl; }); ring.visible = true;
    let anim = false;
    if (!reduce()) { if (gM.visible) { turn.rotation.y = t * .06; anim = true; } if (gS.visible) { tA.rotation.y = t * .1; tB.rotation.y = -t * .1; anim = true; } }
    if (gV.visible) {
      fall.forEach((f, i) => { const k = reduce() ? f.ph : (t * f.sp + f.ph) % 1, e = k * k * .6 + k * .4, y = 13 - e * 52; o.position.set(f.x, y, f.z); o.scale.set(f.s, f.s, f.s); o.rotation.set(f.rot + k * 4, f.rot, 0); o.updateMatrix(); fm.setMatrixAt(i, o.matrix); }); fm.instanceMatrix.needsUpdate = true; anim = anim || !reduce();
    }
    return anim;
  };
  return { scene, views, fov: 30, labels, limits: { az: [-70, 70], el: [8, 62], dist: [14, 220] }, update: upd };
}
