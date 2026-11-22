/* scene: four reinforced-concrete elements (slab, beam, column, footing) shown in x-ray (Ready-mix concrete page, "Beams and columns").
   Inside each: ribbed reinforcement bars (real rib geometry) with rounded stirrups / ties and cover blocks, coarse aggregate (photo-textured stones that keep clear of the steel) and sand grains,
   in a glassy concrete shell with rounded arrises. With the x-ray off the same element is solid concrete with a mottled, pitted surface. Bar sizes, cover, spacing and aggregate
   proportions are NOT a structural design and nothing here is a mix design. Numbered markers, with a key beside the picture. 1 unit = 1 dm-ish (the beam is 10 long). */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { crushed, grainMat, plant, mineral, sandOf } from '/assets/application-s3d-msand.js';
const { mk } = L;
const V3 = THREE.Vector3;
const EL = { slab: { x: -26, size: [10, 1, 7] }, beam: { x: -9, size: [10, 1.7, 1.3] }, column: { x: 6, size: [1.5, 7, 1.5] }, footing: { x: 22, size: [6.4, 1.3, 6.4] } };

function roundedBox(w, h, d, rd, seg = 10) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, hx = w / 2 - rd, hy = h / 2 - rd, hz = d / 2 - rd, v = new V3(), c = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z))); const dd = v.clone().sub(c); if (dd.lengthSq() > 1e-9) dd.normalize().multiplyScalar(rd); p.setXYZ(i, c.x + dd.x, c.y + dd.y, c.z + dd.z); }
  g.computeVertexNormals();
  const nr = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(nr.getX(i)), ay = Math.abs(nr.getY(i)), az = Math.abs(nr.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (ax >= ay && ax >= az) uv.setXY(i, z * .22, y * .22); else if (ay >= az) uv.setXY(i, x * .22, z * .22); else uv.setXY(i, x * .22, y * .22); }
  return g;
}
/* a ribbed (deformed) bar: a lathe with a transverse rib every 0.16 along its length; axis along +y */
const barCache = {};
function ribbedBar(len, r) {
  const key = len.toFixed(2) + r; if (barCache[key]) return barCache[key];
  const prof = [], pitch = .17, n = Math.max(2, Math.round(len / pitch));
  prof.push(new THREE.Vector2(0.0001, -len / 2));
  for (let i = 0; i <= n; i++) { const y = -len / 2 + len * i / n, y1 = y - pitch * .22, y2 = y + pitch * .22; if (i > 0) prof.push(new THREE.Vector2(r, y1)); prof.push(new THREE.Vector2(r * 1.14, Math.max(y - pitch * .12, -len / 2)), new THREE.Vector2(r * 1.14, Math.min(y + pitch * .12, len / 2))); if (i < n) prof.push(new THREE.Vector2(r, y2)); }
  prof.push(new THREE.Vector2(0.0001, len / 2));
  const g = new THREE.LatheGeometry(prof, 10); g.computeVertexNormals(); return (barCache[key] = g);
}
/* a rounded rectangular stirrup / tie in the plane perpendicular to `ax`, as a tube */
function stirrup(w, h, r, rc = .12) {
  const pts = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 4; k++) { const a = a0 + k * Math.PI / 8; pts.push(new V3(cx + Math.cos(a) * rc, cy + Math.sin(a) * rc, 0)); } };
  arc(w / 2 - rc, h / 2 - rc, 0); arc(-w / 2 + rc, h / 2 - rc, Math.PI / 2); arc(-w / 2 + rc, -h / 2 + rc, Math.PI); arc(w / 2 - rc, -h / 2 + rc, Math.PI * 1.5);
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 70, r, 6, true);
}
/* the concrete skin: mottling, sand speckle and pores, as colour + height canvases */
function concreteTex(seed, size = 512) {
  const r = rng(seed), cv = document.createElement('canvas'), hv = document.createElement('canvas'); cv.width = cv.height = hv.width = hv.height = size; const g = cv.getContext('2d'), h = hv.getContext('2d');
  g.fillStyle = '#a9a69f'; g.fillRect(0, 0, size, size); h.fillStyle = 'rgb(128,128,128)'; h.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) { const x = r() * size, y = r() * size, q = 40 + r() * 140, gr = g.createRadialGradient(x, y, 0, x, y, q), d = (r() - .5) * 40; gr.addColorStop(0, 'rgba(' + (166 + d | 0) + ',' + (163 + d | 0) + ',' + (156 + d | 0) + ',.22)'); gr.addColorStop(1, 'rgba(166,163,156,0)'); g.fillStyle = gr; g.fillRect(x - q, y - q, q * 2, q * 2); }
  for (let i = 0; i < 16000; i++) { const v = (r() - .5) * 70, q = 1 + r() * 2.2, x = r() * size, y = r() * size; const L0 = 168 + v | 0; g.fillStyle = 'rgba(' + L0 + ',' + (L0 - 2) + ',' + (L0 - 8) + ',' + (.25 + r() * .35) + ')'; g.fillRect(x, y, q, q); const hv2 = 128 + v * 1.3 | 0; h.fillStyle = 'rgb(' + hv2 + ',' + hv2 + ',' + hv2 + ')'; h.fillRect(x, y, q, q); }
  for (let i = 0; i < 240; i++) { const x = r() * size, y = r() * size, q = .6 + Math.pow(r(), 2.4) * 3.8; g.fillStyle = 'rgba(40,38,36,.7)'; g.beginPath(); g.ellipse(x, y, q, q * (.75 + r() * .4), r() * 3, 0, 6.283); g.fill(); g.fillStyle = 'rgba(232,229,222,.3)'; g.beginPath(); g.ellipse(x + q * .35, y + q * .4, q * .8, q * .5, .6, 0, 6.283); g.fill(); h.fillStyle = 'rgba(0,0,0,.9)'; h.beginPath(); h.arc(x, y, q, 0, 6.283); h.fill(); }
  const col = new THREE.CanvasTexture(cv), bump = new THREE.CanvasTexture(hv); [col, bump].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }); col.colorSpace = THREE.SRGBColorSpace; return { col, bump };
}

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 34, key: 2.3, shadow: .26, map: 4096 });
  const out = { scene, fov: 30, wide: true };
  /* a pale laboratory floor under all four */
  const floor = mk(new THREE.BoxGeometry(80, .5, 16), new THREE.MeshStandardMaterial({ color: 0xe0ddd6, roughness: .55, envMapIntensity: .8 }), { cast: false }); floor.position.set(-2, -.27, 0); scene.add(floor);
  const steelM = new THREE.MeshStandardMaterial({ color: 0x6c4a38, roughness: .5, metalness: .72, envMapIntensity: 1.1 });
  const tieM = new THREE.MeshStandardMaterial({ color: 0x7a5a46, roughness: .45, metalness: .75, envMapIntensity: 1.1 });
  const blockM = new THREE.MeshStandardMaterial({ color: 0x8e8c86, roughness: .95 });
  const T0 = concreteTex(7);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xcfcdc5, roughness: .22, metalness: 0, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide, clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: 1.4 });
  const solidM = new THREE.MeshStandardMaterial({ map: T0.col, bumpMap: T0.bump, bumpScale: 2.2, roughness: .92, envMapIntensity: .55, color: 0xffffff });
  const LS = realStones('low'), TONES = [.26, .4, .54, .7], sMats = TONES.map(t => realStoneMaterial({ tint: t, bump: .03, floor: 0, gain: .95, contrast: .66, scale: .5, soft: 1, grain: .4, own: true }));
  const SAND = ['#b3a58b', '#a39579', '#c8bda5', '#8c8a82', '#7f8387', '#d2cdc0', '#968a70', '#6f7478'].map(c => new THREE.Color(c));
  const sg = (() => { const g = new THREE.SphereGeometry(1, 7, 5), q = g.attributes.position, rg = rng(5); for (let i = 0; i < q.count; i++) { const k = .78 + rg() * .4; q.setXYZ(i, q.getX(i) * k, q.getY(i) * k * .9, q.getZ(i) * k); } g.computeVertexNormals(); return g; })();
  const SO = sandOf(state), river = SO.round, own = !!SO.TT, TT = SO.TT || [1, 1, 1], RG = own ? (river ? [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')).concat([0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round'))) : [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small'))) : null;   /* river sand: worn grains of its own */
  const mF = own ? grainMat(river ? { bump: .05, rough: .6 } : { bump: .1 }) : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .96, envMapIntensity: .45 }), hotE = new THREE.Color(0xff5e29), off = new THREE.Color(0);
  const bodies = [], steels = [], root = {};
  const O = new THREE.Object3D(), Q = new THREE.Quaternion(), Y = new V3(0, 1, 0);

  Object.entries(EL).forEach(([k, e], ei) => {
    const g = new THREE.Group(); g.position.x = e.x; scene.add(g); root[k] = g; const [w, h, d] = e.size, r = rng(100 + ei * 13);
    const body = new THREE.Mesh(roundedBox(w, h, d, .09), glassM); body.position.y = h / 2; body.renderOrder = 4; body.castShadow = true; body.userData.k = k; g.add(body); bodies.push(body);
    const st = new THREE.Group(); g.add(st); steels.push(st); const segs = [];       /* steel segments for keeping the aggregate clear: [ax, ay, az, bx, by, bz, radius] */
    const bar = (a, b, rad = .07) => { const A = new V3(...a), B = new V3(...b), len = A.distanceTo(B); const m = new THREE.Mesh(ribbedBar(len, rad), steelM); m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(Y, B.clone().sub(A).normalize()); m.castShadow = true; st.add(m); segs.push([...a, ...b, rad]); };
    const tie = (pos, rotY, ww, hh, rad = .035) => { const m = new THREE.Mesh(stirrup(ww, hh, rad), tieM); m.position.set(...pos); m.rotation.y = rotY; m.castShadow = true; st.add(m); const hw = ww / 2, hhh = hh / 2, c = Math.cos(rotY), s = Math.sin(rotY); const P = (x, y) => [pos[0] + x * c, pos[1] + y, pos[2] - x * s]; [[-hw, -hhh, hw, -hhh], [hw, -hhh, hw, hhh], [hw, hhh, -hw, hhh], [-hw, hhh, -hw, -hhh]].forEach(q => segs.push([...P(q[0], q[1]), ...P(q[2], q[3]), rad])); };
    const chair = (x, y, z) => { const m = new THREE.Mesh(roundedBox(.2, .2, .2, .02, 2), blockM); m.position.set(x, y, z); m.castShadow = true; st.add(m); };
    if (k === 'slab') {
      for (let i = 0; i < 9; i++) bar([-w / 2 + .6 + i * (w - 1.2) / 8, .24, -(d - .5) / 2], [-w / 2 + .6 + i * (w - 1.2) / 8, .24, (d - .5) / 2]);
      for (let j = 0; j < 7; j++) bar([-(w - .5) / 2, .36, -d / 2 + .6 + j * (d - 1.2) / 6], [(w - .5) / 2, .36, -d / 2 + .6 + j * (d - 1.2) / 6]);
      for (let i = 0; i < 6; i++) bar([-w / 2 + .8 + i * (w - 1.6) / 5, h - .36, -(d - .5) / 2], [-w / 2 + .8 + i * (w - 1.6) / 5, h - .36, (d - .5) / 2]);
      for (let j = 0; j < 5; j++) bar([-(w - .5) / 2, h - .24, -d / 2 + .8 + j * (d - 1.6) / 4], [(w - .5) / 2, h - .24, -d / 2 + .8 + j * (d - 1.6) / 4]);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) chair(-w / 2 + 1.6 + i * (w - 3.2) / 3, .1, -d / 2 + 1.2 + j * (d - 2.4) / 2);
    }
    if (k === 'beam') {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bar([-(w - .5) / 2, h / 2 + b * (h / 2 - .24), a * (d / 2 - .24)], [(w - .5) / 2, h / 2 + b * (h / 2 - .24), a * (d / 2 - .24)], .075));
      bar([-(w - .5) / 2, .24, 0], [(w - .5) / 2, .24, 0], .075);
      for (let i = 0; i < 12; i++) tie([-w / 2 + .5 + i * (w - 1) / 11, h / 2, 0], Math.PI / 2, d - .34, h - .34);
      for (let i = 0; i < 3; i++) chair(-w / 2 + 1.5 + i * (w - 3) / 2, .09, 0);
    }
    if (k === 'column') {
      const o = w / 2 - .24;
      [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([a, b]) => bar([a * o, .15, b * o], [a * o, h - .15, b * o], .075));
      for (let i = 0; i < 9; i++) tie([0, .45 + i * (h - .9) / 8, 0], 0, w - .36, w - .36);
    }
    if (k === 'footing') {
      for (let i = 0; i < 8; i++) { bar([-w / 2 + .5 + i * (w - 1) / 7, .26, -(d - .6) / 2], [-w / 2 + .5 + i * (w - 1) / 7, .26, (d - .6) / 2], .08); bar([-(w - .6) / 2, .4, -d / 2 + .5 + i * (d - 1) / 7], [(w - .6) / 2, .4, -d / 2 + .5 + i * (d - 1) / 7], .08); }
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) chair(-w / 2 + 1 + i * (w - 2) / 3, .1, -d / 2 + 1 + j * (d - 2) / 3);
      const stub = new THREE.Mesh(roundedBox(1.3, 2.6, 1.3, .08), glassM); stub.position.y = h + 1.3; stub.renderOrder = 4; stub.userData.k = k; g.add(stub); bodies.push(stub);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bar([a * .45, .5, b * .45], [a * .45, h + 2.45, b * .45], .08));
      for (let i = 0; i < 4; i++) tie([0, h + .3 + i * .6, 0], 0, 1.0, 1.0);
    }
    /* the aggregate: stones with photographic texture and sand grains, kept out of the steel and inside the element */
    const clear = (x, y, z, rr) => segs.every(s => { const ax = s[0], ay = s[1], az = s[2], bx = s[3], by = s[4], bz = s[5], dx = bx - ax, dy = by - ay, dz = bz - az, L2 = dx * dx + dy * dy + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / L2)); return Math.hypot(x - ax - t * dx, y - ay - t * dy, z - az - t * dz) > s[6] + rr; });
    const place = (n, szA, szB, hh, ww, dd, y0) => { const res = [], cs = szB * 2, grid = new Map(), gk = (i, j, k) => (i + 600) * 1440000 + (j + 600) * 1200 + (k + 600);   /* a grid, so a candidate is tested against its neighbours only */
      for (let tries = 0; tries < n * 40 && res.length < n; tries++) { const s = szA + r() * (szB - szA), x = (r() - .5) * (ww - s * 2), y = y0 + s * 1.1 + r() * (hh - s * 2.2), z = (r() - .5) * (dd - s * 2); if (!clear(x, y, z, s * .9)) continue;
        const ci = Math.floor(x / cs), cj = Math.floor(y / cs), ck = Math.floor(z / cs); let hit = false; for (let a = -1; a <= 1 && !hit; a++) for (let b = -1; b <= 1 && !hit; b++) for (let c = -1; c <= 1 && !hit; c++) { const l = grid.get(gk(ci + a, cj + b, ck + c)); if (l && l.some(q => Math.hypot(q[0] - x, q[1] - y, q[2] - z) < (q[3] + s) * .8)) hit = true; } if (hit) continue;
        const q = [x, y, z, s]; res.push(q); const kk = gk(ci, cj, ck); (grid.get(kk) || grid.set(kk, []).get(kk)).push(q); } return res; };
    const vol = w * h * d, nS = Math.round(Math.min(120, vol * (k === 'slab' ? 1.5 : 7) / (k === 'footing' ? 2.4 : 1))), nF = Math.round(Math.min(1900, vol * (k === 'column' ? 120 : 38)));
    const sc = k === 'column' ? [.17, .24] : k === 'beam' ? [.18, .26] : [.2, .3];
    const stones = place(nS, sc[0], sc[1], h, w, d, 0); const per = [[], [], []]; stones.forEach((q, i) => per[i % 3].push(q));
    per.forEach((arr, gi) => { const im = new THREE.InstancedMesh(LS[(gi + ei) % LS.length], sMats[0], arr.length || 1); im.count = arr.length; arr.forEach((q, i) => { O.position.set(q[0], q[1], q[2]); O.scale.set(q[3] * (.9 + r() * .3), q[3] * (.75 + r() * .3), q[3] * (.9 + r() * .3)); O.rotation.set(r() * 6, r() * 6, r() * 6); O.updateMatrix(); im.setMatrixAt(i, O.matrix); }); im.frustumCulled = false; im.castShadow = true; g.add(im); im.position.y = 0; im.userData.tone = gi; });
    /* each stone group in one tone: re-group by tone for realism */
    g.children.filter(c => c.isInstancedMesh && c.userData.tone != null).forEach((im, i) => { im.material = sMats[(i + ei) % 4]; });
    if (own) { const fines = place(Math.round(nF * 1.25), .05, .1, h, w, d, 0), its = fines.map(q => ({ x: q[0], y: q[1], z: q[2], s: q[3], c: (c => [c[0] * TT[0], c[1] * TT[1], c[2] * TT[2]])(mineral(r)), flat: .85 + r() * .2, jx: .9 + r() * .2, jz: .9 + r() * .2, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)) })); plant(g, its, RG, mF, 400 + ei, false); return; }
    const fines = place(nF, .03, .07, h, w, d, 0); const fm = new THREE.InstancedMesh(sg, mF, fines.length || 1); fm.count = fines.length;
    fines.forEach((q, i) => { O.position.set(q[0], q[1], q[2]); O.scale.set(q[3] * (.8 + r() * .5), q[3] * (.6 + r() * .5), q[3] * (.8 + r() * .5)); O.rotation.set(r() * 6, r() * 6, r() * 6); O.updateMatrix(); fm.setMatrixAt(i, O.matrix); fm.setColorAt(i, SAND[(r() * 8) | 0].clone().multiplyScalar(.8 + r() * .4)); });
    if (fm.instanceColor) fm.instanceColor.needsUpdate = true; fm.frustumCulled = false; g.add(fm); g.userData.fine = fm;
    /* the aggregate groups sit at the element's local origin: the group already carries y = 0 at the base; the body is centred at h/2, so the bar and stone positions above are in base coordinates */
  });

  const T = { slab: [-26, 1.2, 0], beam: [-9, 1.2, 0], column: [6, 3.4, 0], footing: [22, 1.6, 0] };
  out.views = { slab: { az: -24, el: 28, dist: 19, t: T.slab }, beam: { az: -20, el: 22, dist: 12.5, t: T.beam }, column: { az: -24, el: 20, dist: 12.5, t: T.column }, footing: { az: -26, el: 28, dist: 17, t: T.footing } };
  if (state && state.far && innerWidth >= 720) Object.values(out.views).forEach(v => { v.dist *= state.far; });   /* a page can ask for a roomier frame (M-Sand page) */
  if (innerWidth < 720) Object.values(out.views).forEach(v => { v.dist *= 1.55; });   /* a narrow frame needs the camera further back */
  out.limits = { az: [-80, 80], el: [6, 64], dist: [6, 60] };
  const L_ = (id, text, ex, p, tone) => ({ id: id + ex, text, side: 'r', tone, anchor: new V3(EL[ex].x + p[0], p[1], p[2]), show: s => s.view === ex });
  out.labels = [];
  [['slab', [4.4, .9, 3.4], [-4.5, .3, 3.4], [2, 1.0, -3.5]], ['beam', [5, 1.5, .65], [-5, .45, .65], [2, 1.7, -.6]], ['column', [.75, 5.6, .75], [-.75, 2.2, .75], [.75, 6.9, -.75]], ['footing', [3.2, 1.0, 3.2], [-3.2, .35, 3.2], [.7, 3.8, .65]]].forEach(([ex, a, b, c]) => {
    out.labels.push(L_('c', 'Concrete', ex, a), L_('s', 'Reinforcement steel', ex, b), L_('m', 'Fine aggregate: the sand grains', ex, c, 'hot'));
  });
  out.update = (t, dt, st) => {
    if (state && state.far) Object.entries(root).forEach(([k, g]) => { g.visible = k === (st.view || 'slab'); });   /* a roomier page shows one element at a time */
    const xr = st.xray !== false;
    bodies.forEach(b => { if (b.material !== (xr ? glassM : solidM)) b.material = xr ? glassM : solidM; b.castShadow = !xr; });
    steels.forEach(s => { s.visible = st.steel !== false && xr; if (!xr) s.visible = false; });
    Object.values(root).forEach(g => g.children.forEach(c => { if (c.isInstancedMesh) c.visible = xr; }));
    mF.emissive.copy(st.hl ? hotE : off); mF.emissiveIntensity = st.hl ? .5 : 0;
    return false;
  };
  return out;
}
