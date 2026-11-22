/* scene: a cut section through a mass-concrete block, drawn as four stacked particle layers (IS 383:2016 Table 8 classes: small, medium, large, very large).
   Scale: 1 unit = 100 mm, the face is 1.2 m x 0.8 m. Particle packing is not measured. It is not a mix design and shows no blend ratio. */
import { THREE, L, studio, rng, noiseTex } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
const { canvasTex, clamp, sm, lerp, TAU, mk } = L;
const V3 = THREE.Vector3;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const CLS = [
  { k: 'VL', name: 'Very large', range: '150–80 mm', dmm: [80, 150], share: .14, tone: [124, 126, 130] },
  { k: 'L', name: 'Large', range: '80–40 mm', dmm: [40, 80], share: .18, tone: [100, 102, 108] },
  { k: 'M', name: 'Medium', range: '40–20 mm', dmm: [20, 40], share: .15, tone: [80, 82, 88] },
  { k: 'S', name: 'Small', range: '20–4.75 mm', dmm: [5, 20], share: .13, tone: [62, 64, 70] },
];
const FW = 1200, FH = 800;

function pack() {
  const r = rng(77), out = { VL: [], L: [], M: [], S: [] }, all = [], cell = 48, grid = new Map(), AREA = FW * FH; let maxR = 0;
  const key = (i, j) => i * 4096 + j;
  const ok = (x, y, rad) => { const R = rad + maxR + 3; for (let i = Math.floor((x - R) / cell); i <= Math.floor((x + R) / cell); i++) for (let j = Math.floor((y - R) / cell); j <= Math.floor((y + R) / cell); j++) { const a = grid.get(key(i, j)); if (a) for (const p of a) if (Math.hypot(p[0] - x, p[1] - y) < (p[2] + rad) * 1.04 + 3) return false; } return true; };
  const add = (c, x, y, rad) => { if (rad > maxR) maxR = rad; const p = [x, y, rad, r()]; out[c].push(p); const i = Math.floor(x / cell), j = Math.floor(y / cell); const k = key(i, j); (grid.get(k) || grid.set(k, []).get(k)).push(p); };
  for (const c of CLS) {
    let area = 0; const goal = AREA * c.share, [lo, hi] = c.dmm;
    for (let tries = 0; area < goal && tries < 60000; tries++) {
      const d = lo + (hi - lo) * Math.pow(r(), c.k === 'S' ? 1.6 : 1.1), rad = d / 2, x = rad + 4 + r() * (FW - 2 * rad - 8), y = rad + 4 + r() * (FH - 2 * rad - 8);
      if (!ok(x, y, rad)) continue; add(c.k, x, y, rad); area += Math.PI * rad * rad * .86;
    }
  }
  return out;
}
function _unusedLayerPainter(c, parts, k, scale) {   /* the flat 2D painter the first version used; kept for reference, no longer called */
  const w = FW * scale, h = FH * scale, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); const r = rng(k.length * 91 + 3);
  parts.forEach(([px, py, rad, q]) => {
    const n = 8 + ((q * 5) | 0), rot = q * TAU, base = c.tone, jit = (q - .5) * 26;
    x.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i / n * TAU + (r() - .5) * .45, rr = rad * (.8 + r() * .26) * scale; const X = px * scale + Math.cos(a) * rr, Y = py * scale + Math.sin(a) * rr * .93; i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.closePath();
    const g = x.createRadialGradient(px * scale - rad * scale * .3, py * scale - rad * scale * .35, 1, px * scale, py * scale, rad * scale * 1.05);
    g.addColorStop(0, 'rgb(' + clamp(base[0] + jit + 34, 0, 255) + ',' + clamp(base[1] + jit + 34, 0, 255) + ',' + clamp(base[2] + jit + 36, 0, 255) + ')'); g.addColorStop(1, 'rgb(' + clamp(base[0] + jit - 26, 0, 255) + ',' + clamp(base[1] + jit - 26, 0, 255) + ',' + clamp(base[2] + jit - 24, 0, 255) + ')');
    x.fillStyle = g; x.fill(); x.lineWidth = Math.max(1, rad * scale * .05); x.strokeStyle = 'rgba(20,20,22,.55)'; x.stroke();
    if (rad > 14) { for (let s = 0; s < 4 + rad / 6; s++) { const a = r() * TAU, d = r() * rad * .8; x.fillStyle = 'rgba(' + (r() < .5 ? '255,255,255' : '20,20,22') + ',' + (.12 + r() * .2) + ')'; x.fillRect(px * scale + Math.cos(a) * d * scale, py * scale + Math.sin(a) * d * scale, Math.max(1, rad * scale * .06), Math.max(1, rad * scale * .05)); } }
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export default function build() {
  const scene = new THREE.Scene(); const { key: keyLight } = studio(scene, { ext: 10, key: 2.2, shadow: .22, y: -4.3, map: 3072 });
  keyLight.shadow.normalBias = .004; keyLight.shadow.bias = -.00025; keyLight.shadow.radius = 2.2;
  const parts = pack(), S = 2;
  const paste = canvasTex(Math.round(FW * S), Math.round(FH * S), (x, w, h) => { x.fillStyle = '#bfbdb7'; x.fillRect(0, 0, w, h); const r = rng(4);
    for (let i = 0; i < 36; i++) { x.fillStyle = r() < .5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.04)'; x.beginPath(); x.ellipse(r() * w, r() * h, 60 + r() * 220, 40 + r() * 140, r() * 3, 0, TAU); x.fill(); }
    for (let i = 0; i < 90000; i++) { const v = 110 + r() * 110 | 0; x.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',' + (.25 + r() * .5) + ')'; x.fillRect(r() * w, r() * h, .8 + r() * 2.2, .8 + r() * 2); }
    for (let i = 0; i < 2600; i++) { const px = r() * w, py = r() * h, pr = .8 + r() * 2.4; const g = x.createRadialGradient(px, py, 0, px, py, pr * 2.2); g.addColorStop(0, 'rgba(30,28,26,.55)'); g.addColorStop(1, 'rgba(30,28,26,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, pr * 2.2, 0, TAU); x.fill(); }
  }, true);
  const sideM = new THREE.MeshStandardMaterial({ color: 0xa9a7a2, roughness: .95 }), faceM = new THREE.MeshStandardMaterial({ map: paste, bumpMap: paste, bumpScale: .9, roughness: .93 });
  const BW = FW / 100, BH = FH / 100, BD = 3.2;
  const block = mk(new THREE.BoxGeometry(BW, BH, BD), [sideM, sideM, sideM, sideM, faceM, sideM]); scene.add(block);
  /* each size class is one group of instanced stones: shapes re-oriented so every stone shows a different face; flat on the face like an aggregate sawn through */
  const baseSets = { VL: realStones('boulder'), L: realStones('boulder'), M: realStones('crush'), S: realStones('low') }, TINTS = { VL: 1.05, L: 1.0, M: .94, S: .9 }, BUMPS = { VL: .045, L: .024, M: .011, S: .006 };   /* the bump is per world unit, so it follows the particle size */
  const layers = CLS.map((c, i) => {
    const grp = new THREE.Group(); scene.add(grp); const mat = realStoneMaterial({ tint: TINTS[c.k], own: true, bump: BUMPS[c.k], floor: 0, gain: .56 }), rr = rng(500 + i * 13), base = baseSets[c.k], NV = c.k === 'S' ? 10 : 8, buckets = Array.from({ length: NV }, () => []);
    parts[c.k].forEach((p, n) => buckets[n % NV].push(p));
    const o = new THREE.Object3D(), tint = new THREE.Color();
    /* contact shading: a soft dark ring where each particle meets the paste, one transparent decal per class so it follows its class */
    const dcv = document.createElement('canvas'); dcv.width = FW; dcv.height = FH; const dx = dcv.getContext('2d');
    parts[c.k].forEach(([px, py, rad]) => { const g = dx.createRadialGradient(px, py, rad * .8, px, py, rad * 1.3); g.addColorStop(0, 'rgba(25,23,20,.42)'); g.addColorStop(1, 'rgba(25,23,20,0)'); dx.fillStyle = g; dx.beginPath(); dx.arc(px, py, rad * 1.3, 0, TAU); dx.fill(); });
    const dtex = new THREE.CanvasTexture(dcv); dtex.colorSpace = THREE.SRGBColorSpace; dtex.anisotropy = 8;
    const dmat = new THREE.MeshBasicMaterial({ map: dtex, transparent: true, depthWrite: false, toneMapped: false }), dm = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), dmat); dm.position.set(0, 0, BD / 2 + .006); dm.renderOrder = 1; grp.add(dm);
    buckets.forEach((arr, v) => {
      if (!arr.length) return; const g = base[v % base.length].clone(); g.rotateX(rr() * TAU); g.rotateY(rr() * TAU); g.rotateZ(rr() * TAU);
      const im = new THREE.InstancedMesh(g, mat, arr.length); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      arr.forEach(([px, py, rad, q], k) => {
        const s = rad / 100; o.position.set(px / 100 - BW / 2, BH / 2 - py / 100, BD / 2 + s * .04); o.rotation.set(0, 0, q * TAU); o.scale.set(s * (.96 + q * .1), s * (.86 + (1 - q) * .14), s * (.5 + q * .14)); o.updateMatrix(); im.setMatrixAt(k, o.matrix);
        const t = .84 + rr() * .32; tint.setRGB(t, t * (.985 + rr() * .03), t * (.97 + rr() * .05)); im.setColorAt(k, tint);
      });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; grp.add(im);
    });
    return { m: grp, mat, dmat, c, i };
  });
  /* scale bar: 100 mm */
  const sbar = new THREE.Group(); sbar.position.set(-BW / 2 + .5, -BH / 2 + .42, BD / 2 + .03); scene.add(sbar);
  const bm = new THREE.MeshBasicMaterial({ color: 0xff5e29 }); const bar = new THREE.Mesh(new THREE.BoxGeometry(1, .07, .02), bm); bar.position.x = .5; sbar.add(bar);
  [0, 1].forEach(x => { const t = new THREE.Mesh(new THREE.BoxGeometry(.05, .3, .02), bm); t.position.set(x, 0, 0); sbar.add(t); });

  const views = { front: { az: -12, el: 9, dist: 23, t: [2.3, 0, 0] }, angled: { az: -42, el: 18, dist: 24, t: [2.2, 0, .6] } };
  const here = id => state => state.cls === 'all' || state.cls === id;
  const labels = [
    ...CLS.map((c, i) => ({ id: c.k, text: c.name.toUpperCase() + ' · ' + c.range, tone: c.k === 'L' ? 'hot' : '', side: 'r', anchor: st => new V3(BW / 2 + .05, BH / 2 - .5 - i * .9, BD / 2 + .15 + (st.explode || 0) * (i * .75)), show: here(c.k) })),
    { id: 'scale', text: '100 mm', side: 'r', anchor: new V3(-BW / 2 + 1.7, -BH / 2 + .42, BD / 2 + .1), show: () => true },
  ];
  let t0 = null; const cur = { ex: 0, op: [0, 0, 0, 0], hl: [1, 1, 1, 1] };
  return {
    scene, views, fov: 30, labels, limits: { az: [-65, 65], el: [-6, 50], dist: [10, 40] },
    update(t, dt, st) {
      if (t0 === null) t0 = t; const intro = reduce() ? 9 : t - t0, k = reduce() ? 1 : 1 - Math.exp(-dt * 6);
      cur.ex += ((st.explode || 0) - cur.ex) * k; let moving = Math.abs(cur.ex - (st.explode || 0)) > .002;
      layers.forEach(({ m, mat, dmat, c, i }) => {
        const inT = sm(clamp((intro - i * .7) / 1.2)); const want = (st.cls === 'all' || st.cls === c.k) ? 1 : .16; cur.hl[i] += (want - cur.hl[i]) * k; if (Math.abs(want - cur.hl[i]) > .003) moving = true;
        const op = inT * cur.hl[i], tr = op < .995; if (mat.transparent !== tr) { mat.transparent = tr; mat.depthWrite = !tr; mat.needsUpdate = true; } mat.opacity = op; dmat.opacity = op; m.position.z = (1 - inT) * 1.4 + cur.ex * i * .75; m.visible = op > .01;
      });
      return moving || intro < 4.2;
    },
  };
}
