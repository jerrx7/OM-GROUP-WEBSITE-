/* scene: masonry mortar (M-Sand page, "How Sand Works Inside a Mortar Joint"). Three views: a wall in running bond (clay brick or concrete block), a magnified cut through one joint, and a mortar pan.
   Surfaces are painted for each material: fired clay (flashed, sand-faced, with iron specks and pits), concrete block (pitted, with sand and aggregate), and cement-sand mortar (sand grains in paste, slightly raked joints).
   The magnified joint is a fractured cut: brick or block above and below, and between them cement paste with crushed-rock sand grains, some standing proud of the cut face. The sand in the pan is the M-Sand heap
   from application-s3d-msand.js. Unit sizes, joint thickness and grain sizes are exaggerated for legibility. No mortar mix, ratio or strength is shown or implied. Numbered markers, key beside the figure. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, plant, mineral, buildHeap, sandOf } from '/assets/application-s3d-msand.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;

/* a box with softly rounded arrises and UVs in world units, so a texture keeps the same scale on every face */
export function rbox(w, h, d, rd, seg = 8, tile = .33, off = [0, 0]) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, hx = w / 2 - rd, hy = h / 2 - rd, hz = d / 2 - rd, v = new V3(), c = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z))); const dd = v.clone().sub(c); if (dd.lengthSq() > 1e-9) dd.normalize().multiplyScalar(rd); p.setXYZ(i, c.x + dd.x, c.y + dd.y, c.z + dd.z); }
  g.computeVertexNormals();
  const nr = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(nr.getX(i)), ay = Math.abs(nr.getY(i)), az = Math.abs(nr.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (ax >= ay && ax >= az) uv.setXY(i, z * tile + off[0], y * tile + off[1]); else if (ay >= az) uv.setXY(i, x * tile + off[0], z * tile + off[1]); else uv.setXY(i, x * tile + off[0], y * tile + off[1]); }
  return g;
}
export const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
export const rgb = (r, g, b, a = 1) => 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + a + ')';
export const speck = (g, r, W, H, n, sz, cols, a0, a1) => { const st = []; cols.forEach(c => { for (let k = 0; k < 4; k++) st.push(c.replace('A', (a0 + (a1 - a0) * (k + .5) / 4).toFixed(2))); }); const per = st.map(() => []); n = Math.round(n * .8); for (let i = 0; i < n; i++) { const k = (r() * st.length) | 0, q = sz * (.5 + r() * 1.5); per[k].push(r() * W, r() * H, q); } per.forEach((a, k) => { g.fillStyle = st[k]; for (let i = 0; i < a.length; i += 3) g.fillRect(a[i], a[i + 1], a[i + 2], a[i + 2]); }); };   /* squares batched by colour: ~10x faster than an ellipse per grain, the same to the eye */
export const wrapDraw = (g, W, H, f) => { for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };

/* ---- fired clay brick: base colour per brick, soft flashing, sand-face granules, iron specks, pits ---- */
export function brickTex(seed, base) {
  const r = rng(seed), W = 512, H = 512, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = rgb(...base); g.fillRect(0, 0, W, H); hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * H, q = 50 + r() * 140, dk = r() < .55, gr = g.createRadialGradient(x, y, 0, x, y, q); const col = dk ? [base[0] * .62, base[1] * .55, base[2] * .55] : [Math.min(255, base[0] * 1.2), base[1] * 1.12, base[2] * 1.05]; gr.addColorStop(0, rgb(...col, .28)); gr.addColorStop(1, rgb(...col, 0)); g.fillStyle = gr; wrapDraw(g, W, H, () => g.fillRect(x - q, y - q, q * 2, q * 2)); }
  for (let i = 0; i < 30; i++) { const y = r() * H, gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, rgb(90, 36, 24, 0)); gr.addColorStop(.5, rgb(90, 36, 24, .08 + r() * .08)); gr.addColorStop(1, rgb(90, 36, 24, 0)); g.fillStyle = gr; g.fillRect(0, y, W, 1 + r() * 4); }
  const lite = ['rgba(232,160,120,A)', 'rgba(210,130,95,A)', 'rgba(244,196,160,A)'], dark = ['rgba(70,26,16,A)', 'rgba(96,36,22,A)', 'rgba(52,20,14,A)'];
  speck(g, r, W, H, 7000, 1.1, lite, .12, .45); speck(g, r, W, H, 6000, 1.0, dark, .1, .4);
  speck(hg, r, W, H, 9000, 1.0, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)', 'rgba(200,200,200,A)'], .15, .5);
  for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H, s = .8 + r() * 1.7; g.fillStyle = 'rgba(34,18,14,.8)'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); hg.fillStyle = 'rgba(0,0,0,.9)'; hg.beginPath(); hg.arc(x, y, s * 1.2, 0, TAU); hg.fill(); }
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, s = 2 + r() * 5, a = r() * 3; g.fillStyle = 'rgba(52,22,16,.45)'; g.beginPath(); g.ellipse(x, y, s, s * .65, a, 0, TAU); g.fill(); g.fillStyle = 'rgba(240,190,160,.35)'; g.beginPath(); g.ellipse(x + s * .35, y + s * .45, s * .8, s * .45, a, 0, TAU); g.fill(); hg.fillStyle = 'rgba(0,0,0,.85)'; hg.beginPath(); hg.ellipse(x, y, s, s * .65, a, 0, TAU); hg.fill(); }
  return { map: tex(c), bump: tex(hc, false) };
}
/* ---- concrete block: grey paste, pores, sand and small aggregate ---- */
export function blockTex(seed) {
  const r = rng(seed), W = 512, H = 512, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = '#9d9c97'; g.fillRect(0, 0, W, H); hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, q = 60 + r() * 150, d = r() < .5, gr = g.createRadialGradient(x, y, 0, x, y, q); gr.addColorStop(0, d ? 'rgba(96,96,92,.2)' : 'rgba(190,189,183,.22)'); gr.addColorStop(1, 'rgba(120,120,116,0)'); g.fillStyle = gr; wrapDraw(g, W, H, () => g.fillRect(x - q, y - q, q * 2, q * 2)); }
  speck(g, r, W, H, 9000, 1.1, ['rgba(214,212,204,A)', 'rgba(184,182,176,A)', 'rgba(220,208,186,A)'], .2, .6); speck(g, r, W, H, 7000, 1.0, ['rgba(70,70,68,A)', 'rgba(110,108,104,A)', 'rgba(90,86,80,A)'], .15, .5);
  speck(hg, r, W, H, 10000, 1.0, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .18, .5);
  for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H, s = 1.2 + Math.pow(r(), 2.2) * 5; g.fillStyle = 'rgba(46,46,44,.75)'; g.beginPath(); g.ellipse(x, y, s, s * (.6 + r() * .4), r() * 3, 0, TAU); g.fill(); g.fillStyle = 'rgba(226,224,218,.3)'; g.beginPath(); g.ellipse(x + s * .3, y + s * .4, s * .8, s * .5, .6, 0, TAU); g.fill(); hg.fillStyle = 'rgba(0,0,0,.9)'; hg.beginPath(); hg.arc(x, y, s * 1.15, 0, TAU); hg.fill(); }
  for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, s = 3 + r() * 6, col = [[198, 190, 176], [120, 120, 118], [160, 148, 130]][(r() * 3) | 0]; g.fillStyle = rgb(...col, .7); g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + r(), rr = s * (.7 + r() * .5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  return { map: tex(c), bump: tex(hc, false) };
}
/* ---- mortar: cement paste with fine sand, between the units ---- */
export function mortarTex(seed) {
  const r = rng(seed), W = 512, H = 512, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = '#a7a196'; g.fillRect(0, 0, W, H); hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { const x = r() * W, y = r() * H, q = 60 + r() * 120, d = r() < .5, gr = g.createRadialGradient(x, y, 0, x, y, q); gr.addColorStop(0, d ? 'rgba(120,114,104,.22)' : 'rgba(206,200,188,.24)'); gr.addColorStop(1, 'rgba(150,146,136,0)'); g.fillStyle = gr; wrapDraw(g, W, H, () => g.fillRect(x - q, y - q, q * 2, q * 2)); }
  speck(g, r, W, H, 14000, 1.3, ['rgba(222,214,196,A)', 'rgba(190,180,160,A)', 'rgba(150,144,134,A)', 'rgba(236,232,220,A)'], .25, .7); speck(g, r, W, H, 9000, 1.2, ['rgba(70,66,62,A)', 'rgba(110,100,88,A)'], .2, .6);
  speck(hg, r, W, H, 12000, 1.3, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .2, .6);
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = 1 + r() * 2.4; g.fillStyle = 'rgba(52,48,44,.7)'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); hg.fillStyle = 'rgba(0,0,0,.9)'; hg.beginPath(); hg.arc(x, y, s * 1.2, 0, TAU); hg.fill(); }
  return { map: tex(c), bump: tex(hg === hg ? hc : hc, false) };
}
/* ---- the fractured cut face of a brick / block (clay with grit and laminations; paste with chips of aggregate) ---- */
export function cutTex(kind, seed) {
  const r = rng(seed), W = 1024, H = 320, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  if (kind === 'brick') { g.fillStyle = '#9b4126'; hg.fillStyle = '#808080'; } else { g.fillStyle = '#8f8e89'; hg.fillStyle = '#808080'; }
  g.fillRect(0, 0, W, H); hg.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H, q = 24 + r() * 90, d = r() < .5, gr = g.createRadialGradient(x, y, 0, x, y, q); const col = kind === 'brick' ? (d ? [110, 40, 24] : [200, 98, 62]) : (d ? [96, 96, 92] : [176, 175, 168]); gr.addColorStop(0, rgb(...col, .3)); gr.addColorStop(1, rgb(...col, 0)); g.fillStyle = gr; g.fillRect(x - q, y - q, q * 2, q * 2); }
  if (kind === 'brick') {
    for (let i = 0; i < 40; i++) { const y = r() * H, gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, rgb(70, 24, 14, 0)); gr.addColorStop(.5, rgb(70, 24, 14, .16)); gr.addColorStop(1, rgb(70, 24, 14, 0)); g.fillStyle = gr; g.fillRect(0, y, W, 1 + r() * 3); }
    speck(g, r, W, H, 9000, 1.5, ['rgba(226,150,110,A)', 'rgba(186,100,66,A)', 'rgba(244,200,170,A)'], .2, .6); speck(g, r, W, H, 7000, 1.4, ['rgba(58,22,14,A)', 'rgba(86,32,20,A)'], .2, .6);
    for (let i = 0; i < 160; i++) { const x = r() * W, y = r() * H, s = 1.4 + Math.pow(r(), 2) * 6; g.fillStyle = ['rgba(212,196,170,.8)', 'rgba(150,128,106,.8)', 'rgba(60,40,30,.8)'][(r() * 3) | 0]; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + r(), rr = s * (.7 + r() * .5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); hg.fillStyle = 'rgba(255,255,255,.5)'; hg.beginPath(); hg.arc(x, y, s, 0, TAU); hg.fill(); }
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = 2 + r() * 5; g.fillStyle = 'rgba(30,14,10,.85)'; g.beginPath(); g.ellipse(x, y, s, s * .7, r() * 3, 0, TAU); g.fill(); hg.fillStyle = 'rgba(0,0,0,.9)'; hg.beginPath(); hg.arc(x, y, s * 1.2, 0, TAU); hg.fill(); }
  } else {
    speck(g, r, W, H, 12000, 1.5, ['rgba(212,210,202,A)', 'rgba(180,176,166,A)', 'rgba(222,208,186,A)'], .2, .6); speck(g, r, W, H, 9000, 1.4, ['rgba(70,70,68,A)', 'rgba(104,102,98,A)'], .2, .6);
    for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, s = 6 + r() * 14, col = [[200, 192, 176], [120, 120, 118], [158, 146, 128], [78, 78, 78]][(r() * 4) | 0]; g.fillStyle = rgb(...col, .9); g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + r() * .6, rr = s * (.72 + r() * .45); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); g.strokeStyle = 'rgba(40,40,38,.5)'; g.lineWidth = 1.5; g.stroke(); hg.fillStyle = 'rgba(255,255,255,.4)'; hg.beginPath(); hg.arc(x, y, s, 0, TAU); hg.fill(); }
    for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H, s = 1.5 + Math.pow(r(), 2) * 5; g.fillStyle = 'rgba(40,40,38,.8)'; g.beginPath(); g.ellipse(x, y, s, s * .7, r() * 3, 0, TAU); g.fill(); hg.fillStyle = 'rgba(0,0,0,.9)'; hg.beginPath(); hg.arc(x, y, s * 1.2, 0, TAU); hg.fill(); }
  }
  return { map: tex(c), bump: tex(hc, false) };
}
/* ---- the cut face of the mortar: sand grains seen in section, packed in cement paste; drawn twice (natural / picked out in orange) ---- */
export function mortarCut(hot, tt) {
  const r = rng(77), W = 1024, H = 128, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = '#6b6760'; g.fillRect(0, 0, W, H); hg.fillStyle = '#707070'; hg.fillRect(0, 0, W, H);
  const mk = rr => { const c = mineral(rr); return tt ? [c[0] * tt[0], c[1] * tt[1], c[2] * tt[2]] : c; };
  for (let i = 0; i < 4200; i++) {
    const x = r() * W, y = r() * H, s = 2 + Math.pow(r(), 1.8) * 9, k = mk(r), L = v => Math.min(255, Math.pow(v, 1 / 2.2) * 255 * 1.35);
    const col = hot ? [255 * (.85 + r() * .15), 94 + r() * 40, 41 + r() * 30] : [L(k[0]), L(k[1]), L(k[2])];
    const a = r() * 3; g.fillStyle = rgb(...col, .96); g.beginPath(); for (let q = 0; q < 6; q++) { const t = q / 6 * TAU + a + r() * .5, rr = s * (.7 + r() * .5); g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr * .85); } g.closePath(); g.fill();
    g.strokeStyle = 'rgba(20,18,16,.55)'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(x - s * .25, y - s * .3, s * .4, s * .25, 0, 0, TAU); g.fill();
    hg.fillStyle = 'rgba(255,255,255,.55)'; hg.beginPath(); hg.arc(x, y, s * .9, 0, TAU); hg.fill();
  }
  return { map: tex(c), bump: tex(hc, false) };
}

export default function build({ state }) {
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 46, key: 2.5, shadow: .22, map: 4096, ground: false });
  key.shadow.bias = -.00015; key.shadow.normalBias = .03;
  const OX = -10, world = new THREE.Group(); world.position.x = OX; scene.add(world);
  const std = (t, o = {}) => new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: o.bump ?? 1.3, roughness: o.rough ?? .92, metalness: 0, envMapIntensity: o.env ?? .5 });

  /* bench */
  { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); }
    const t = tex(b); t.repeat.set(20, 8); const bench = new THREE.Mesh(new THREE.BoxGeometry(110, 3, 52), new THREE.MeshStandardMaterial({ map: t, roughness: .55, metalness: 0, envMapIntensity: .75 })); bench.position.set(10, -1.5, 3); bench.receiveShadow = true; scene.add(bench); }

  /* materials */
  const BR = [[168, 70, 44], [182, 82, 50], [156, 62, 40], [190, 98, 60]];
  const brickMs = BR.map((b, i) => std(brickTex(11 + i * 7, b), { bump: 1.6 })), blockMs = [0, 1, 2].map(i => std(blockTex(31 + i * 5), { bump: 1.8, rough: .96 }));
  const mt = mortarTex(51), mortarM = std(mt, { bump: 1.6, rough: 1 }); mt.map.repeat.set(1, 1);

  /* ───────── the wall ───────── */
  const wall = { brick: new THREE.Group(), block: new THREE.Group() }; Object.values(wall).forEach(g => { g.position.x = -10; world.add(g); });
  const unit = (g, w, h, d, mats, jt, courses, per, seed) => {
    const r = rng(seed), total = per * (w + jt) - jt, ID = d * .8;
    for (let c = 0; c < courses; c++) {
      const ws = c % 2 ? [w / 2 - jt / 2, ...Array(per - 1).fill(w), w / 2 - jt / 2] : Array(per).fill(w); let x = -total / 2;
      ws.forEach(ww => { const geo = rbox(ww, h, d, .07, 8, .33, [r(), r()]), m = new THREE.Mesh(geo, mats[(r() * mats.length) | 0]); m.position.set(x + ww / 2, c * (h + jt) + h / 2 + .02, (r() - .5) * .04); m.rotation.y = (r() - .5) * .01; m.castShadow = m.receiveShadow = true; g.add(m); x += ww + jt; });
    }
    const hh = courses * (h + jt) - jt, mt2 = mortarTex(52), cm = std(mt2, { bump: 1.8, rough: 1 }); const geo = rbox(total - .18, hh - .18, ID, .0, 2, .33); /* inset on every side: a core exactly as wide and tall as the bricks z-fights with their ends and tops (flicker) */ const core = new THREE.Mesh(geo, cm); core.position.set(0, hh / 2 + .02, 0); core.castShadow = core.receiveShadow = true; g.add(core);
    /* a header course strip of mortar bed under the wall */
    const bed = new THREE.Mesh(rbox(total + .5, .12, d + .3, .04, 4, .33), mortarM); bed.position.set(0, .0, 0); bed.receiveShadow = true; g.add(bed);
  };
  unit(wall.brick, 2.4, .75, 1.15, brickMs, .16, 7, 5, 3); unit(wall.block, 3.4, 1.7, 1.1, blockMs, .16, 3, 4, 4);

  /* ───────── the magnified joint, a fractured cut ───────── */
  const J = new THREE.Group(); J.position.set(9, 0, 0); world.add(J); const JW = 12, JD = 5.5, JT = 1.0, BH = 3.2;
  const part = (mats, cutKind, seed) => { const g = new THREE.Group(); [0, 1].forEach(k => { const geo = rbox(JW, BH, JD, .1, 8, .33, [k * .37, k * .19]), m = new THREE.Mesh(geo, mats[k % mats.length]); m.position.y = k ? BH + JT + BH / 2 : BH / 2; m.castShadow = m.receiveShadow = true; g.add(m);
    const ct = cutTex(cutKind, seed + k * 13), pm = new THREE.Mesh(new THREE.PlaneGeometry(JW - .22, BH - .22), new THREE.MeshStandardMaterial({ map: ct.map, bumpMap: ct.bump, bumpScale: 2.6, roughness: .95, envMapIntensity: .4 })); pm.position.set(0, m.position.y, JD / 2 + .012); pm.receiveShadow = true; g.add(pm); }); return g; };
  const jBrick = part([brickMs[0], brickMs[1]], 'brick', 5), jBlock = part([blockMs[0], blockMs[1]], 'block', 9); J.add(jBrick, jBlock);
  const pasteM = std(mortarTex(53), { bump: 1.4, rough: .95 }); const paste = new THREE.Mesh(new THREE.BoxGeometry(JW - .22, JT - .012, JD - .02), pasteM); paste.position.y = BH + JT / 2; paste.castShadow = paste.receiveShadow = true; J.add(paste);
  const SO = sandOf(state), river = SO.round, TT = SO.TT, faceN = mortarCut(false, TT), faceH = mortarCut(true, TT), faceM = new THREE.MeshStandardMaterial({ map: faceN.map, bumpMap: faceN.bump, bumpScale: 2.2, roughness: .85, envMapIntensity: .55 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(JW - .22, JT), faceM); face.position.set(0, BH + JT / 2, JD / 2 + .01); face.receiveShadow = true; J.add(face);
  /* a few real grains standing proud of the cut, so the section has depth */
  const G = { small: river ? [0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round')) : [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), tiny: [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')), coarse: river ? [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')).concat([0, 1, 2].map(i => crushed(700 + i * 19, 'round'))) : [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')) }, gmat = grainMat(river ? { bump: .05, rough: .6 } : { bump: .1 });
  const pr = rng(19), proud = []; for (let i = 0; i < 90; i++) { const s = .11 + Math.pow(pr(), 1.6) * .17; proud.push({ x: (pr() - .5) * (JW - .8), y: BH + s * .9 + pr() * (JT - s * 1.8), z: JD / 2 + s * .08, s, c: (c => TT ? [c[0] * TT[0], c[1] * TT[1], c[2] * TT[2]] : c)(mineral(pr)), flat: .9 + pr() * .2, jx: 1, jz: .6, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(pr() * 6, pr() * 6, pr() * 6)) }); }
  plant(J, proud, G.small, gmat, 23, true);
  /* a ragged, hand-struck edge on the mortar bed (grains spilled at the front of the paste) is left to the cut face */

  /* ───────── the mortar pan ───────── */
  const P = new THREE.Group(); P.position.set(30, 0, 0); world.add(P);
  const steel = new THREE.MeshStandardMaterial({ color: 0x6c7076, metalness: .85, roughness: .46, envMapIntensity: .75, side: THREE.DoubleSide });
  const prof = [[0, 0], [8.4, 0], [9.2, .3], [10.1, 2.1], [10.4, 2.6], [10.1, 2.7], [9.9, 2.3], [9.0, .6], [0, .5]].map(p => new THREE.Vector2(p[0], p[1]));
  const pan = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), steel); pan.castShadow = pan.receiveShadow = true; P.add(pan);
  /* M-Sand heap (the same heap as the M-Sand figure, scaled down) */
  const SC = .3, heap = buildHeap({ R: 15, nC: 160, nM: 1700, nF: 9000, nH: 0, seed: 91, maxD: 2.6, csf: SO.csf * SC * (river ? 1.1 : 1), csm: SO.csm * SC * (river ? 1.1 : 1), dust: SO.dust, tint: TT || undefined }); heap.group.scale.setScalar(SC); heap.group.position.set(-3.6, .5, .6); P.add(heap.group);
  plant(heap.group, heap.items.coarse, G.coarse, gmat, 92, true); plant(heap.group, heap.items.mid, G.small, gmat, 93, true); plant(heap.group, heap.items.fine, G.tiny, gmat, 94, false);
  /* cement: a soft grey powder mound */
  { const cv = cvs(256, 256), g = cv.getContext('2d'), rr = rng(61); g.fillStyle = '#8e9093'; g.fillRect(0, 0, 256, 256); speck(g, rr, 256, 256, 9000, 1.0, ['rgba(176,178,180,A)', 'rgba(112,114,118,A)', 'rgba(150,152,154,A)'], .2, .6); const t = tex(cv); t.repeat.set(3, 3);
    const NR = 28, NS = 72, pos = [], idx = [], Rm = 3.1, Hm = 2.1; for (let i = 0; i <= NR; i++) for (let j = 0; j <= NS; j++) { const th = j / NS * TAU, f = i / NR, rr2 = f * Rm * (1 + .06 * Math.sin(3 * th + 1) + .04 * Math.sin(5 * th)), h = Hm * Math.pow(1 - f * f, 1.25) * (1 + .04 * Math.sin(7 * th + f * 9)); pos.push(Math.cos(th) * rr2, h + .02, Math.sin(th) * rr2); }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const uvs = []; for (let i = 0; i < pos.length; i += 3) uvs.push(pos[i] * .3, pos[i + 2] * .3); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); gg.setIndex(idx); gg.computeVertexNormals();
    const cm = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: .6, roughness: 1, metalness: 0, envMapIntensity: .35 })); cm.position.set(3.8, .5, -2.2); cm.castShadow = cm.receiveShadow = true; P.add(cm); }
  /* water: a clear, glossy pool */
  const wat = new THREE.Mesh(new THREE.CircleGeometry(1.9, 64), new THREE.MeshPhysicalMaterial({ color: 0x5f98ad, roughness: .08, metalness: 0, transparent: true, opacity: .85, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: .9, ior: 1.33 })); wat.rotation.x = -Math.PI / 2; wat.position.set(3.0, .56, 3.7); wat.renderOrder = 6; P.add(wat);
  { const rim = new THREE.Mesh(new THREE.TorusGeometry(1.9, .05, 8, 64), new THREE.MeshPhysicalMaterial({ color: 0xe8f4f8, roughness: .05, transparent: true, opacity: .55, clearcoat: 1, envMapIntensity: 2 })); rim.rotation.x = Math.PI / 2; rim.position.set(3.0, .58, 3.7); P.add(rim); }

  /* ───────── views and markers ───────── */
  const views = { wall: { az: -16, el: 18, dist: 21, t: [-10 + OX, 2.4, 0] }, joint: { az: -14, el: 12, dist: 25, t: [9 + OX, 4, 0] }, mix: { az: -14, el: 38, dist: 31, t: [30 + OX, 0, 0] } };
  const A = (x, y, z) => new V3(x + OX, y, z);
  const labels = [
    { id: 'w', text: 'Masonry units', side: 'l', anchor: st => st.unit === 'block' ? A(-12.4, 3.2, .6) : A(-12, 4.6, .6), show: st => st.view === 'wall' },
    { id: 'j', text: 'Mortar joint', side: 'r', tone: 'hot', anchor: st => st.unit === 'block' ? A(-11.5, 1.8, .6) : A(-7.2, 2.4, .6), show: st => st.view === 'wall' },
    { id: 'u', text: 'Masonry unit', side: 'l', anchor: A(2.8, BH * 1.9, JD / 2), show: st => st.view === 'joint' },
    { id: 'g', text: 'Sand grains: the fine aggregate', side: 'r', tone: 'hot', anchor: A(15, BH + .5, JD / 2), show: st => st.view === 'joint' },
    { id: 'p', text: 'Cement paste around the grains', side: 'r', anchor: A(15, BH + .9, -JD / 2), show: st => st.view === 'joint' },
    { id: 'a', text: state.nm || 'M-Sand', side: 'l', tone: 'hot', anchor: A(26.6, 3.3, .6), show: st => st.view === 'mix' },
    { id: 'b', text: 'Binder (cement)', side: 'r', anchor: A(33.8, 2.9, -2.2), show: st => st.view === 'mix' },
    { id: 'c', text: 'Water', side: 'r', anchor: A(33, 1.1, 3.7), show: st => st.view === 'mix' },
  ];
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-70, 70], el: [4, 62], dist: [8, 60] },
    update(t, dt, st) {
      const bl = st.unit === 'block'; wall.brick.visible = !bl; wall.block.visible = bl; jBrick.visible = !bl; jBlock.visible = bl;
      faceM.map = st.hl ? faceH.map : faceN.map; gmat.emissive.setHex(st.hl ? 0xff5e29 : 0x000000); gmat.emissiveIntensity = st.hl ? .5 : 0; gmat.color.setHex(st.hl ? 0xffb090 : 0xffffff);
      heap.group.visible = true; return false;
    },
  };
}
