/* scene: GSB particle-size distributions, drawn from the middle of each MoRTH Fifth Revision Table 400-1 range.
   six   : six glass chambers, one per traditional grading (I to VI), each filled with particles whose sizes follow that grading's example curve.
   three : a nominal 20 mm single-size product, a nominal 40 mm single-size product and a graded GSB blend: a single-size fraction is not a GSB grading.
   Drawings: particle sizes are compressed so the finest are still visible, and nothing here is a sample, a blend, an OM GROUP result or a design.
   The table is the traditional Fifth Revision reference, not a universal requirement. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { reduceM } from '/assets/application-s3d-wmkit.js';
import { sizeAt } from '/assets/application-gsbdata.js';
const { M, mk, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;
const rOf = d => Math.max(.075, .18 * Math.sqrt(d / 2));
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export default function build({ state }) {
  const set = state.set || 'six';
  const scene = new THREE.Scene(); studio(scene, { ext: 58, key: 2.2, shadow: .2, map: 2048 });
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide });
  const disc = new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6 });
  const fill = new THREE.MeshStandardMaterial({ color: 0x4a4a4c, roughness: 1 });
  const chambers = [], rings = [];
  /* a cut face painted from the grading: particle sizes follow the example curve, drawn by mass */
  const faceTex = (sizer, seed, w = 1024, h = 400) => L.canvasTex(w, h, (x, cw, ch) => {
    x.fillStyle = '#2b2b2e'; x.fillRect(0, 0, cw, ch); const r = rng(seed), PAL = { fine: [[.26, .3, .38], [.2, .24, .32], [.32, .36, .44]], mid: [[.5, .48, .45], [.42, .4, .37], [.58, .56, .52]], big: [[.78, .76, .7], [.84, .82, .76], [.7, .68, .62]] };
    const items = []; for (let i = 0; i < 2600; i++) items.push(sizer(r()));
    items.sort(() => r() - .5); items.forEach(d => { const rad = 2 + 24 * Math.pow(d / 75, .7), cx = r() * cw, cy = r() * ch, k = 5 + (r() * 3 | 0), pl = d < 4.75 ? PAL.fine : d < 26.5 ? PAL.mid : PAL.big, p = pl[(r() * pl.length) | 0], sh = .85 + r() * .3, a0 = r() * TAU;
      x.beginPath(); for (let j = 0; j < k; j++) { const a = a0 + j / k * TAU + (r() - .5) * .5, rd = rad * (.6 + r() * .55); const px = cx + Math.cos(a) * rd * 1.1, py = cy + Math.sin(a) * rd * .9; j ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath();
      x.fillStyle = 'rgb(' + ((p[0] * sh * 255) | 0) + ',' + ((p[1] * sh * 255) | 0) + ',' + ((p[2] * sh * 255) | 0) + ')'; x.fill(); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1; x.stroke(); });
  }, true);
  const chamber = (x, z, sizer, seed, n) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const R = 5.6, H = 8.6, lvl = 7.2;
    const d = mk(new THREE.CylinderGeometry(R + .8, R + 1, .6, 48), disc); d.position.y = .3; g.add(d);
    const ring = mk(new THREE.TorusGeometry(R + 1.2, .14, 8, 64), M.orange, { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.y = .64; ring.visible = false; g.add(ring); rings.push(ring);
    const side = faceTex(sizer, seed), top = faceTex(sizer, seed + 5, 512, 512);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, lvl, 56, 1, false), [new THREE.MeshStandardMaterial({ map: side, roughness: 1 }), new THREE.MeshStandardMaterial({ map: top, roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x2b2b2e })]); body.position.y = .6 + lvl / 2; body.castShadow = body.receiveShadow = true; g.add(body);
    const rim = mk(new THREE.TorusGeometry(R + .05, .1, 8, 64), M.steelS, { cast: false }); rim.rotation.x = Math.PI / 2; rim.position.y = .6 + lvl; g.add(rim);
    const r = rng(seed), items = []; for (let i = 0; i < 46; i++) { const a = r() * TAU, rr = (R - .9) * Math.sqrt(r()), s = sizer(.35 + r() * .65), rad = rOf(s); items.push([Math.cos(a) * rr, .6 + lvl + rad * .35, Math.sin(a) * rr, rad]); }
    instStones(g, items, stoneM, seed, false); chambers.push(g); return g;
  };
  const out = { scene, fov: 30, wide: true };
  const lab = (id, text, a, vs, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: st => vs(st) });

  if (set === 'six') {
    const X = [-40, -24, -8, 8, 24, 40];
    ROM.forEach((g, i) => chamber(X[i], 0, u => sizeAt(g, u), 100 + i * 13, 0));
    out.views = { all: { az: -4, el: 14, dist: 112, t: [0, 5, 0] } }; out.limits = { az: [-35, 35], el: [5, 45], dist: [40, 150] };
    out.labels = ROM.map((g, i) => lab('g' + g, 'Grading ' + g, new V3(X[i], 11 + (i % 2) * 2.6, 0), () => true, (g === 'V' || g === 'VI') ? 'hot' : '', 'r'));
    out.update = (t, dt, st) => { rings.forEach((r, i) => { r.visible = st.sel === ROM[i]; }); return false; };
    return out;
  }
  /* three */
  const X = [-18, 0, 18];
  chamber(X[0], 0, u => 20 * (.85 + u * .3), 71, 0); chamber(X[1], 0, u => 40 * (.85 + u * .3), 72, 0); chamber(X[2], 0, u => sizeAt('I', u), 73, 0);
  out.views = { all: { az: -6, el: 15, dist: 70, t: [0, 5, 0] } }; out.limits = { az: [-35, 35], el: [5, 45], dist: [30, 110] };
  out.labels = [lab('a', 'Nominal 20 mm: one size', new V3(X[0], 11, 0), () => true, ''), lab('b', 'Nominal 40 mm: one size', new V3(X[1], 13.6, 0), () => true, ''), lab('c', 'GSB: a graded blend', new V3(X[2], 11, 0), () => true, 'hot')];
  out.update = (t, dt, st) => { rings.forEach((r, i) => { r.visible = st.sel === ['a', 'b', 'c'][i]; }); return false; };
  return out;
}
