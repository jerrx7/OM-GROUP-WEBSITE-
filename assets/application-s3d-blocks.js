/* scene: a concrete-block production line (storage, batching, mixing, moulding and compaction, demoulding, curing) and a turntable of other precast products.
   No quantity, mix or strength is shown. The fine aggregate input is marked, but it is only one input among several. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk, canvasTex, clamp } = L;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 30, key: 2.2, shadow: .22, map: 2048 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: .6, roughness: .45 }), dark = M.dark, orange = M.orange;
  const bm = new THREE.MeshStandardMaterial({ color: 0xaaaaa6, roughness: 1 }), fresh = new THREE.MeshStandardMaterial({ color: 0x8e9095, roughness: 1 });
  const add = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };
  const bx = (w, h, d, mat, x, y, z) => add(mk(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
  const cy = (rt, rb, h, mat, x, y, z) => add(mk(new THREE.CylinderGeometry(rt, rb, h, 36), mat), x, y, z);
  bx(36, .3, 12, new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: .8 }), 1, -.15, 0);
  const sign = (t, hot) => new THREE.MeshBasicMaterial({ map: canvasTex(256, 80, (c, w, h) => { c.fillStyle = hot ? '#ff5e29' : '#2a2c30'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 36px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, w / 2, h / 2 + 2); }, true) });
  /* 1 storage */
  [[-15, 'M-SAND', true, 0xc5a77c], [-11.2, 'COARSE', false, 0x55575c]].forEach(([x, t, hot, col]) => { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(.16, 2.6, .16, steel, x + a * .9, 1.3, b * .9)); bx(2.2, 1.8, 2.2, steel, x, 3.5, 0); add(new THREE.Mesh(new THREE.ConeGeometry(1.05, .6, 7), new THREE.MeshStandardMaterial({ color: col, roughness: 1 })), x, 4.7, 0); add(new THREE.Mesh(new THREE.PlaneGeometry(1.7, .55), sign(t, hot)), x, 3.5, 1.11); });
  /* 2 batching: belt + cement */
  bx(8.2, .22, .9, dark, -9, 1.35, 0); cy(.8, .8, 3.2, M.white, -6, 5.2, -2.4); cy(.5, .1, .8, M.white, -6, 3, -2.4);
  /* 3 mixing */
  bx(3, 1.6, 2.6, steel, -3.6, 4.6, 0); const drum = add(mk(new THREE.CylinderGeometry(1, 1, 2.4, 36), M.steelS), -3.6, 3.1, 0); drum.rotation.x = Math.PI / 2; bx(.2, 3, .2, steel, -4.8, 1.5, 0); bx(.2, 3, .2, steel, -2.4, 1.5, 0);
  /* 4 moulding + compaction */
  [[-1.9, -1.5], [1.9, -1.5], [-1.9, 1.5], [1.9, 1.5]].forEach(([a, b]) => bx(.3, 3.8, .3, steel, 1.8 + a, 1.9, b)); bx(4.2, .6, 3.5, steel, 1.8, 3.9, 0); bx(4.2, .3, 3.5, dark, 1.8, .15, 0); cy(.22, .22, 1.2, M.chrome, 1.8, 3.2, 0.4); cy(.22, .22, 1.2, M.chrome, 1.8, 3.2, -.4); bx(1.2, .8, .8, orange, 1.8, 4.5, 0); const head = bx(2.4, .7, 2, orange, 1.8, 3.4, 0); const mould = bx(2.2, 1, 1.6, dark, 1.8, .6, 0); const nb = bx(1.8, .75, 1.2, fresh, 1.8, .55, 0);
  /* belt to curing + moving blocks */
  bx(10, .18, 1.5, dark, 8.4, .5, 0); const NB = 7, moving = []; for (let i = 0; i < NB; i++) { const m = mk(new THREE.BoxGeometry(1.5, .75, 1), bm); scene.add(m); moving.push(m); }
  /* 6 curing rack */
  const rack = new THREE.Group(); rack.position.set(14.2, 0, 0); scene.add(rack);
  [[-2, -1.2], [2, -1.2], [-2, 1.2], [2, 1.2]].forEach(([x, z]) => { const p = mk(new THREE.BoxGeometry(.15, 3.8, .15), steel); p.position.set(x, 1.9, z); rack.add(p); });
  for (let l = 0; l < 3; l++) { const sh = mk(new THREE.BoxGeometry(4.4, .12, 2.6), steel); sh.position.y = .55 + l * 1.2; rack.add(sh); for (let i = 0; i < 4; i++) { const b = mk(new THREE.BoxGeometry(.95, .75, 1.4), bm); b.position.set(-1.5 + i * 1, .98 + l * 1.2, 0); rack.add(b); } }
  const steam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.8, 2.8), new THREE.MeshBasicMaterial({ color: 0x6fc0e6, transparent: true, opacity: .06, depthWrite: false })); steam.position.set(0, 1.9, 0); rack.add(steam);
  /* products turntable */
  const T = new THREE.Group(); T.position.set(40, 0, 0); scene.add(T); const spin = new THREE.Group(); T.add(spin);
  const disc = mk(new THREE.CylinderGeometry(9, 9.2, .4, 72), new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: .6 })); disc.position.y = .2; T.add(disc);
  const prod = (g, mat, x, z, ry = 0) => { g.position.x = x; g.position.z = z; g.rotation.y = ry; spin.add(g); return g; };
  const paverM = [0xb0554b, 0x8f9096, 0xc3b8a6].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
  const pav = new THREE.Group(); pav.name = "pav"; for (let i = 0; i < 9; i++) { const a = mk(new THREE.BoxGeometry(1.5, .55, 1.0), paverM[i % 3]); a.position.set((i % 3 - 1) * 1.55 + (Math.floor(i / 3) % 2 ? .75 : 0), .68, (Math.floor(i / 3) - 1) * 1.05); pav.add(a); } prod(pav, null, 0, 0); pav.position.y = 0;
  const kerb = mk(new THREE.BoxGeometry(4.2, 1.5, .8), new THREE.MeshStandardMaterial({ color: 0xb4b4b0, roughness: 1 })); kerb.position.y = .4 + .75; prod(kerb, null, -.5, -5.2, .15);
  const tiles = new THREE.Group(); for (let i = 0; i < 4; i++) { const t = mk(new THREE.BoxGeometry(2, .18, 2), new THREE.MeshStandardMaterial({ color: [0xb9b6ae, 0x9c9b97, 0xc7bfb0, 0xa59f93][i], roughness: .9 })); t.position.set((i % 2) * 2.1, .5 + (i > 1 ? .2 : 0) * 0, Math.floor(i / 2) * 2.1); tiles.add(t); } prod(tiles, null, 4.6, 3.6, -.2);
  const hb = new THREE.Group(); const hb0 = mk(new THREE.BoxGeometry(3, 1.4, 1.4), bm); hb0.position.y = 1.1; hb.add(hb0); [-.7, .7].forEach(x => { const h = mk(new THREE.BoxGeometry(.85, 1.42, .75), new THREE.MeshStandardMaterial({ color: 0x4a4b4f, roughness: 1 })); h.position.set(x, 1.1, 0); hb.add(h); }); prod(hb, null, -5, 3.4, .3);
  const ring = mk(new THREE.CylinderGeometry(1.3, 1.3, 1.6, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xa6a6a2, roughness: 1, side: THREE.DoubleSide })); ring.position.y = 1.2; prod(ring, null, 4.6, -3.8);
  /* flow */
  const NP = 56, pm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.17, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 }), NP); pm.frustumCulled = false; scene.add(pm); const rr = rng(2), o3 = new THREE.Object3D();
  const items = Array.from({ length: NP }, (_, i) => ({ ph: rr(), sand: i % 3 === 0, x0: i % 2 ? -11.2 : -15 })), C = { sand: new THREE.Color(0xd2b88c), co: new THREE.Color(0x8d9096), hot: new THREE.Color(0xff5e29) };
  const path = it => [new V3(it.sand ? -15 : -11.2, 2.6, 0), new V3(it.sand ? -15 : -11.2, 1.55, 0), new V3(-3.6, 1.55, 0), new V3(-3.6, 5.4, 0)];
  const lp = (pts, u) => { const L_ = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); L_.push(l); tot += l; } let d = u * tot; for (let i = 0; i < L_.length; i++) { if (d <= L_[i]) return pts[i].clone().lerp(pts[i + 1], d / L_[i]); d -= L_[i]; } return pts[pts.length - 1].clone(); };
  const S = [[-13, 3.2], [-8, 3], [-3.6, 3.6], [1.8, 2.2], [6, 1.2], [14, 2.2]];
  const views = { all: { az: -16, el: 20, dist: 44, t: [-1, 2.4, 0] }, ...Object.fromEntries(S.map(([x, y], i) => ['s' + (i + 1), { az: -20, el: 16, dist: 17, t: [x, y, 0] }])), products: { az: -18, el: 24, dist: 28, t: [40, 1.4, 0] } };
  const L_ = (id, text, a, side, vs, tone) => ({ id, text, side, tone, anchor: a, show: st => st.view === 'all' || vs.includes(st.view) });
  const labels = [
    L_('sand', (state.nm || 'M-Sand') + ': the fine aggregate', new V3(-15, 5.2, 0), 'l', ['s1'], 'hot'), L_('co', 'Coarse aggregate', new V3(-11.2, 5.2, 0), 'r', ['s1']),
    L_('bat', 'Controlled batching', new V3(-9, 1.6, 0), 'r', ['s2']), L_('cem', 'Cement', new V3(-6, 7, -2.4), 'r', ['s2']),
    L_('mix', 'Mixer', new V3(-3.6, 5.6, 0), 'r', ['s3']), L_('mould', 'Mould filling and compaction', new V3(1.8, 3.9, 0), 'r', ['s4']),
    L_('dem', 'Demoulding', new V3(6, 1.1, 0), 'r', ['s5']), L_('cur', 'Curing', new V3(14.2, 4.1, 0), 'r', ['s6']),
    { id: 'pv', text: 'Interlocking pavers', side: 'r', anchor: () => { const v = new V3(); pav.getWorldPosition(v); v.y += 1.7; return v; }, show: st => st.view === 'products' }, { id: 'kb', text: 'Precast kerb', side: 'l', anchor: () => { const v = new V3(); kerb.getWorldPosition(v); v.y += 1.7; return v; }, show: st => st.view === 'products' },
    { id: 'tl', text: 'Concrete tiles', side: 'r', anchor: () => { const v = new V3(); tiles.getWorldPosition(v); v.y += 1.7; return v; }, show: st => st.view === 'products' }, { id: 'hb', text: 'Hollow block', side: 'l', anchor: () => { const v = new V3(); hb.getWorldPosition(v); v.y += 1.7; return v; }, show: st => st.view === 'products' },
    { id: 'rg', text: 'Precast unit', side: 'r', anchor: () => { const v = new V3(); ring.getWorldPosition(v); v.y += 1.7; return v; }, show: st => st.view === 'products' },
  ];
  if (state && state.zoom) views.products.dist *= state.zoom;   /* a page with a larger frame can ask for a closer camera */
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-75, 75], el: [6, 60], dist: [9, 70] },
    update(t, dt, st) {
      const pv = st.view === 'products', hl = !!st.hl, k = reduce() ? .5 : t;
      items.forEach((it, i) => { const u = reduce() ? it.ph : (k * .14 + it.ph) % 1, p = lp(path(it), u); o3.position.copy(p); o3.scale.setScalar(1); o3.updateMatrix(); pm.setMatrixAt(i, o3.matrix); pm.setColorAt(i, it.sand ? (hl ? C.hot : C.sand) : C.co); }); pm.instanceMatrix.needsUpdate = true; if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
      drum.rotation.y = reduce() ? 0 : t * 1.4; const cyc = reduce() ? .55 : (t * .16) % 1; head.position.y = 3.4 - (cyc > .35 && cyc < .55 ? .6 + Math.sin(t * 40) * .04 : 0); nb.position.x = 1.8 + (cyc > .55 ? clamp((cyc - .55) / .3) * 3.2 : 0); nb.position.y = .55 + (cyc < .35 ? clamp(cyc / .35) * 0 : 0);
      moving.forEach((m, i) => { const u = reduce() ? i / NB : (t * .1 + i / NB) % 1; m.position.set(5 + u * 8, .96, 0); m.visible = u < .9; });
      spin.rotation.y = reduce() ? .4 : t * .22; return !reduce();
    },
  };
}
