/* scene: plaster on a wall (Plaster Sand page). Three sets, one module.
   layers : an exploded cross-section of a plaster system on a real masonry or concrete background (a running-bond brick wall of 3D units with raked joints, or a cast-concrete wall with form-tie holes):
            the prepared surface (smooth and dusty, or raked to give a key) and a first, intermediate and finishing coat. Each coat is a slab whose edge is a fractured section (angular sand grains in cement
            paste) and whose face is the surface that coat is given (scratched, floated, sponged). The layers can be pulled apart, any layer isolated, one to three coats shown.
   subs   : five wall backgrounds side by side (clay brick, solid block, hollow block, AAC block, cast-in-place concrete), each plastered over its right half, with an optional suction overlay.
   micro  : a magnified cut through a plaster coat: real fractured sand grains held in translucent binder paste, on a pitted brick background.
   Thicknesses are exaggerated, sizes are not to scale, and the suction overlay is a qualitative picture, not a measurement. No thickness, number of coats, mix proportion, bond strength or other value
   is shown or implied. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, plant, mineral, sandOf } from '/assets/application-s3d-msand.js';
import { rbox, cvs, tex, rgb, speck, wrapDraw, brickTex, blockTex, mortarTex, cutTex } from '/assets/application-s3d-msmasonry.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const clamp01 = v => Math.min(1, Math.max(0, v));
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const PT = sandOf({ sand: 'plaster' }).TT;
const std = (t, o = {}) => new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: o.bump ?? 1.3, roughness: o.rough ?? .92, metalness: 0, envMapIntensity: o.env ?? .5, transparent: false });
const poly = (g, x, y, s, n, a, r) => { g.beginPath(); for (let q = 0; q < n; q++) { const t = q / n * TAU + a + r() * .5, rr = s * (.7 + r() * .5); g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr * .85); } g.closePath(); };

/* the cut edge of a coat: angular sand grains in cement paste, in section */
export function secTex(seed) {
  const r = rng(seed), W = 512, H = 512, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = '#b6aea0'; g.fillRect(0, 0, W, H); hg.fillStyle = '#707070'; hg.fillRect(0, 0, W, H);
  speck(g, r, W, H, 9000, 1.2, ['rgba(226,218,200,A)', 'rgba(150,142,128,A)', 'rgba(238,232,218,A)'], .25, .6);
  const L = v => Math.min(255, Math.pow(v, 1 / 2.2) * 255 * 1.35);
  for (let i = 0; i < 1500; i++) {
    const x = r() * W, y = r() * H, s = 2.5 + Math.pow(r(), 1.8) * 11, k = mineral(r).map((v, q) => v * PT[q]);
    wrapDraw(g, W, H, () => { g.fillStyle = rgb(L(k[0]), L(k[1]), L(k[2]), .96); poly(g, x, y, s, 6, r() * 3, r); g.fill(); g.strokeStyle = 'rgba(20,18,16,.5)'; g.lineWidth = 1; g.stroke(); });
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(x - s * .25, y - s * .3, s * .4, s * .25, 0, 0, TAU); g.fill();
    hg.fillStyle = 'rgba(255,255,255,.55)'; hg.beginPath(); hg.arc(x, y, s * .9, 0, TAU); hg.fill();
  }
  return { map: tex(c), bump: tex(hc, false) };
}
/* the face a coat is given: raw (smooth, dusty), key (raked), c1 (scratch coat), c2 (floated), c3 (sponge-floated finish) */
const FACE = { raw: [204, 200, 191], key: [138, 134, 126], c1: [176, 169, 156], c2: [187, 180, 167], c3: [205, 199, 187] };
export function faceTex(kind, seed) {
  const r = rng(seed), W = 1024, H = 640, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d'), P = FACE[kind];
  g.fillStyle = rgb(...P); g.fillRect(0, 0, W, H); hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, q = 60 + r() * 150, d = r() < .5, gr = g.createRadialGradient(x, y, 0, x, y, q); gr.addColorStop(0, d ? 'rgba(96,92,84,.16)' : 'rgba(236,230,218,.2)'); gr.addColorStop(1, 'rgba(150,146,136,0)'); g.fillStyle = gr; wrapDraw(g, W, H, () => g.fillRect(x - q, y - q, q * 2, q * 2)); }
  const n = { raw: 3000, key: 9000, c1: 16000, c2: 13000, c3: 9000 }[kind], sz = { raw: 1.1, key: 1.5, c1: 1.9, c2: 1.5, c3: 1.1 }[kind];
  speck(g, r, W, H, n, sz, ['rgba(232,224,208,A)', 'rgba(204,196,180,A)', 'rgba(242,238,226,A)'], .2, .6); speck(g, r, W, H, n * .8, sz, ['rgba(70,64,58,A)', 'rgba(108,100,90,A)', 'rgba(128,116,100,A)'], .15, .55);
  speck(hg, r, W, H, n * 1.2, sz, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .2, .6);
  if (kind === 'key') for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * H, a = .7 + (r() - .5) * .25, l = 70 + r() * 220; g.strokeStyle = r() < .5 ? 'rgba(70,66,60,.5)' : 'rgba(214,208,196,.5)'; g.lineWidth = 1 + r() * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); hg.strokeStyle = 'rgba(0,0,0,.7)'; hg.lineWidth = 2; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); hg.stroke(); }
  if (kind === 'c1') for (let k = 0; k < 40; k++) { const y = (k + .5) * H / 40 + (r() - .5) * 4; for (let s = 0; s < 4; s++) { const x0 = r() * W, l = 120 + r() * 380; g.strokeStyle = 'rgba(80,72,64,.4)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + l, y + (r() - .5) * 3); g.stroke(); hg.strokeStyle = 'rgba(0,0,0,.8)'; hg.lineWidth = 2.2; hg.beginPath(); hg.moveTo(x0, y); hg.lineTo(x0 + l, y + (r() - .5) * 3); hg.stroke(); } }
  if (kind === 'c2' || kind === 'c3') for (let i = 0; i < (kind === 'c2' ? 28 : 40); i++) { const x = r() * W, y = r() * H, q = 30 + r() * 70; g.strokeStyle = 'rgba(236,230,218,.08)'; g.lineWidth = 3 + r() * 4; g.beginPath(); g.arc(x, y, q, r() * 6, r() * 6 + 2.4); g.stroke(); hg.strokeStyle = 'rgba(255,255,255,.12)'; hg.lineWidth = 4; hg.beginPath(); hg.arc(x, y, q, 0, 2.4); hg.stroke(); }
  for (let i = 0; i < (kind === 'raw' ? 70 : 24); i++) { const x = r() * W, y = r() * H, s = .8 + r() * 1.8; g.fillStyle = 'rgba(52,48,44,.7)'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); hg.fillStyle = 'rgba(0,0,0,.9)'; hg.beginPath(); hg.arc(x, y, s * 1.2, 0, TAU); hg.fill(); }
  return { map: tex(c), bump: tex(hc, false) };
}
/* autoclaved aerated concrete: pale, with a spread of round pores */
function aacTex(seed) {
  const r = rng(seed), W = 512, H = 512, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = '#e1ded6'; g.fillRect(0, 0, W, H); hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  speck(g, r, W, H, 9000, 1.2, ['rgba(244,242,236,A)', 'rgba(200,196,186,A)'], .2, .55);
  for (let i = 0; i < 340; i++) { const x = r() * W, y = r() * H, s = 1.2 + Math.pow(r(), 2.2) * 6; wrapDraw(g, W, H, () => { g.fillStyle = 'rgba(120,116,106,.55)'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); g.fillStyle = 'rgba(250,248,242,.5)'; g.beginPath(); g.arc(x + s * .25, y + s * .3, s * .7, 0, TAU); g.fill(); }); hg.fillStyle = 'rgba(0,0,0,.85)'; hg.beginPath(); hg.arc(x, y, s * 1.1, 0, TAU); hg.fill(); }
  return { map: tex(c), bump: tex(hc, false) };
}
/* cast concrete: pores, board marks, form-tie holes */
function rccTex(seed) {
  const r = rng(seed), W = 1024, H = 640, c = cvs(W, H), g = c.getContext('2d'), hc = cvs(W, H), hg = hc.getContext('2d');
  g.fillStyle = '#a4a39e'; g.fillRect(0, 0, W, H); hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, q = 60 + r() * 160, d = r() < .5, gr = g.createRadialGradient(x, y, 0, x, y, q); gr.addColorStop(0, d ? 'rgba(96,96,92,.2)' : 'rgba(196,195,190,.22)'); gr.addColorStop(1, 'rgba(130,130,126,0)'); g.fillStyle = gr; wrapDraw(g, W, H, () => g.fillRect(x - q, y - q, q * 2, q * 2)); }
  speck(g, r, W, H, 14000, 1.2, ['rgba(214,212,204,A)', 'rgba(184,182,176,A)'], .2, .6); speck(g, r, W, H, 10000, 1.1, ['rgba(70,70,68,A)', 'rgba(110,108,104,A)'], .15, .5); speck(hg, r, W, H, 12000, 1.1, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], .18, .5);
  for (let k = 1; k < 4; k++) { g.fillStyle = 'rgba(60,60,58,.22)'; g.fillRect(0, k * H / 4, W, 2); hg.fillStyle = 'rgba(0,0,0,.5)'; hg.fillRect(0, k * H / 4, W, 3); }
  for (let i = 0; i < 120; i++) { const x = r() * W, y = r() * H, s = 1.2 + Math.pow(r(), 2.2) * 5; g.fillStyle = 'rgba(46,46,44,.75)'; g.beginPath(); g.ellipse(x, y, s, s * (.6 + r() * .4), r() * 3, 0, TAU); g.fill(); hg.fillStyle = 'rgba(0,0,0,.9)'; hg.beginPath(); hg.arc(x, y, s * 1.15, 0, TAU); hg.fill(); }
  [[170, 120], [854, 120], [170, 520], [854, 520]].forEach(([a, b]) => { g.fillStyle = 'rgba(44,44,42,.85)'; g.beginPath(); g.arc(a, b, 9, 0, TAU); g.fill(); g.strokeStyle = 'rgba(210,208,200,.5)'; g.lineWidth = 3; g.stroke(); hg.fillStyle = '#000'; hg.beginPath(); hg.arc(a, b, 10, 0, TAU); hg.fill(); });
  return { map: tex(c), bump: tex(hc, false) };
}
/* the top of a hollow block: three open cores */
function hollowTop() {
  const c = cvs(256, 128), g = c.getContext('2d'); g.fillStyle = '#9a9994'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#3c3c3a'; for (let i = 0; i < 3; i++) g.fillRect(12 + i * 82, 20, 62, 88); g.fillStyle = '#6c6c69'; for (let i = 0; i < 3; i++) g.fillRect(12 + i * 82, 20, 62, 6);
  return tex(c);
}

/* the wall behind the plaster: real units in running bond with raked joints, or a cast slab. Front face at z = 0, the wall runs back to z = -D. */
const MC = {};
const mats = kind => MC[kind] || (MC[kind] = kind === 'brick' ? { u: [[168, 70, 44], [182, 82, 50], [156, 62, 40], [190, 98, 60]].map((b, i) => std(brickTex(11 + i * 7, b), { bump: 1.6 })) }
  : kind === 'aac' ? { u: [0, 1].map(i => std(aacTex(61 + i * 9), { bump: 1.2, rough: .98 })) }
  : kind === 'rcc' ? { u: [std(rccTex(71), { bump: 1.5, rough: .96 })] }
  : { u: [0, 1, 2].map(i => std(blockTex(31 + i * 5), { bump: 1.8, rough: .96 })) });
export function buildWall(kind, W, H, D, seed) {
  const g = new THREE.Group(), r = rng(seed), M = mats(kind), sc = W / 11.8;
  if (kind === 'rcc') { const m = new THREE.Mesh(rbox(W, H, D, .06 * sc, 4, .22 / sc), M.u[0]); m.position.set(0, H / 2, -D / 2); m.castShadow = m.receiveShadow = true; g.add(m); return g; }
  const cfg = { brick: { per: 5, n: 8, jt: .2 }, block: { per: 3, n: 4, jt: .2 }, hollow: { per: 3, n: 4, jt: .2 }, aac: { per: 3, n: 4, jt: .07 } }[kind], jt = cfg.jt * sc, per = cfg.per, n = cfg.n;
  const w = (W + jt) / per - jt, h = (H + jt) / n - jt, ht = hollowTop();
  for (let c = 0; c < n; c++) {
    const ws = c % 2 ? [w / 2 - jt / 2, ...Array(per - 1).fill(w), w / 2 - jt / 2] : Array(per).fill(w); let x = -W / 2;
    ws.forEach(ww => {
      const geo = rbox(ww, h, D, .07 * sc, 6, .33 / sc, [r(), r()]); let m = M.u[(r() * M.u.length) | 0];
      const top = kind === 'hollow' && c === n - 1 ? new THREE.MeshStandardMaterial({ map: ht, roughness: .96 }) : m, mesh = new THREE.Mesh(geo, top === m ? m : [m, m, top, m, m, m]);
      mesh.position.set(x + ww / 2, c * (h + jt) + h / 2, -D / 2 + (r() - .5) * .02); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); x += ww + jt;
    });
  }
  const mm = std(mortarTex(52), { bump: 1.8, rough: 1 }), core = new THREE.Mesh(rbox(W - .16 * sc, H - .16 * sc, D - jt * .5, 0, 2, .33 / sc), mm)   /* inset on every side: a core exactly as wide and tall as the bricks shares its left, right and top faces with them and z-fights (flickers) */; core.position.set(0, H / 2, -(D - jt * .5) / 2 - jt * .5); core.receiveShadow = true; g.add(core);
  return g;
}
const sideM = c => new THREE.MeshStandardMaterial({ color: c, roughness: .95 });
/* the painted textures are made ONCE per page and shared by every plaster figure (painting each took 100-250 ms on the main thread) */
const FTC = {}, SEED_F = { raw: 81, key: 82, c1: 83, c2: 84, c3: 85 }; let SECC = null;
export const frontTex = k => FTC[k] || (FTC[k] = faceTex(k, SEED_F[k]));
export const secShared = () => SECC || (SECC = secTex(97));
export function scaleUV(geo, sx, sy, group) { const uv = geo.attributes.uv, ix = geo.index, g = geo.groups[group], seen = new Set(); for (let i = g.start; i < g.start + g.count; i++) { const v = ix ? ix.getX(i) : i; if (seen.has(v)) continue; seen.add(v); uv.setXY(v, uv.getX(v) * sx, uv.getY(v) * sy); } uv.needsUpdate = true; return geo; }

export default function build({ state }) {
  const set = state.set || 'layers', scene = new THREE.Scene(), { key } = studio(scene, { ext: set === 'subs' ? 36 : 22, key: 2.5, shadow: .2, map: 4096, ground: false });
  key.shadow.bias = -.0002; key.shadow.normalBias = .03;
  /* bench */
  const bt = (() => { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); } const t = tex(b); t.repeat.set(24, 12); return t; })();
  const bench = new THREE.Mesh(new THREE.BoxGeometry(200, 2, 120), new THREE.MeshStandardMaterial({ map: bt, roughness: .55, metalness: 0, envMapIntensity: .75 })); bench.position.set(0, -1, 10); bench.receiveShadow = true; scene.add(bench);
  const hotM = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 });
  const out = { scene, fov: 30, wide: true };
  const front = frontTex;

  /* a plaster slab: world-unit UVs, the face texture covering the slab once, the edge the sand-in-paste section */
  const slab = (W, H, T, kind, seed) => {
    const geo = scaleUV(rbox(W, H, T, Math.min(.05, T * .3), 4, 1 / 3, [.5, .5]), 3 / W, 3 / W, 4), ft = front(kind), sec = secShared();   /* edges: one section tile per 3 units; the face: one surface tile across the slab */
    const sT = sec.map, sB = sec.bump;
    const sm = new THREE.MeshStandardMaterial({ map: sT, bumpMap: sB, bumpScale: 2.2, roughness: .95, envMapIntensity: .45 });
    const fm = new THREE.MeshStandardMaterial({ map: ft.map, bumpMap: ft.bump, bumpScale: 1.5, roughness: .96, envMapIntensity: .45 }), bm = new THREE.MeshStandardMaterial({ color: 0x9c968a, roughness: 1 });
    const m = new THREE.Mesh(geo, [sm, sm, sm, sm, fm, bm]); m.castShadow = m.receiveShadow = true; m.userData.mats = [sm, fm, bm]; m.userData.fm = fm; return m;
  };

  if (set === 'layers') {
    const WX = 11.8, WY = 7.0, T = { bg: 2.4, prep: .22, c1: .9, c2: .75, c3: .55 }, order = ['bg', 'prep', 'c1', 'c2', 'c3'], L1 = {};
    const world = new THREE.Group(); scene.add(world);
    let bgKind = state.sub === 'rcc' ? 'rcc' : 'brick'; const bgG = new THREE.Group(); world.add(bgG); L1.bg = { m: bgG, zc: -T.bg / 2 };
    const setBg = k => { while (bgG.children.length) bgG.remove(bgG.children[0]); bgG.add(buildWall(k, WX, WY, T.bg, 7)); bgKind = k; };
    setBg(bgKind);
    const mk = (k, kind, seed) => { const m = slab(WX, WY, T[k], kind, seed); m.position.y = WY / 2; world.add(m); L1[k] = { m, zc: 0 }; return m; };
    mk('prep', 'key', 91); mk('c1', 'c1', 92); mk('c2', 'c2', 93); mk('c3', 'c3', 94);
    const prepM = { raw: front('raw'), ready: front('key') };
    const labText = { bg: () => bgKind === 'rcc' ? 'Concrete background' : 'Clay brick masonry', prep: () => 'Prepared surface: key and suction', c1: st => st.coats === 1 ? 'Single coat' : 'First coat', c2: () => 'Intermediate coat', c3: () => 'Finishing coat' };
    const visOf = st => ({ bg: true, prep: true, c1: true, c2: st.coats === 3, c3: st.coats >= 2 });
    out.labels = order.map((k, i) => ({ id: k, text: labText[k](state), side: 'l', tone: k === 'c1' || k === 'c3' ? 'hot' : undefined, anchor: () => new V3(-WX / 2, WY * [.9, .76, .62, .48, .34][i], L1[k].zc + T[k] / 2 * (k === 'bg' ? -1 : 0)), show: st => { const v = visOf(st); return v[k] && (!st.lay || st.lay === 'all' || st.lay === k); } }));
    let ex = -1, lastSub = bgKind, lastPrep = null, lastCoats = null, lastLay = null;
    const dimIt = (grp, dim) => grp.traverse(o => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(mm => { if (mm.transparent !== dim) { mm.transparent = dim; mm.needsUpdate = true; } mm.opacity = dim ? .1 : 1; mm.depthWrite = !dim; }); });
    out.views = { all: { az: -34, el: 18, dist: matchMedia('(max-width:640px)').matches ? 44 : 34, t: [0, WY / 2 - .6, 2.4] } };
    out.limits = { az: [-70, 20], el: [4, 60], dist: [14, 80] };
    out.update = (t, dt, st, fig) => {
      let anim = false; const target = clamp01(st.explode ?? .5); if (ex < 0) ex = target; ex += (target - ex) * Math.min(1, dt * 6); if (Math.abs(target - ex) > .003) anim = true; else ex = target;
      const want = st.sub === 'rcc' ? 'rcc' : 'brick'; if (want !== lastSub) { lastSub = want; setBg(want); lastLay = null; const el = fig && fig.labs && fig.labs[0]; if (el) { el.text = labText.bg(); const sp = fig.legend && fig.legend[0] && fig.legend[0].querySelector('span'); if (sp) sp.textContent = el.text; } }
      if (st.prep !== lastPrep) { lastPrep = st.prep; const raw = st.prep === 'raw', mm = L1.prep.m.userData.fm; mm.map = (raw ? prepM.raw : prepM.ready).map; mm.bumpMap = (raw ? prepM.raw : prepM.ready).bump; mm.needsUpdate = true; }
      if (st.coats !== lastCoats) { lastCoats = st.coats; const l = fig && fig.labs && fig.labs[2]; if (l) { l.text = labText.c1(st); const sp = fig.legend && fig.legend[2] && fig.legend[2].querySelector('span'); if (sp) sp.textContent = l.text; } }
      const v = visOf(st), gap = .06 + ex * 2.9; let z = 0; L1.bg.zc = -T.bg / 2; bgG.position.z = 0;
      order.slice(1).forEach(k => { L1[k].m.visible = v[k]; if (!v[k]) return; z += gap; L1[k].zc = z + T[k] / 2; L1[k].m.position.z = L1[k].zc; z += T[k]; });
      if ((st.lay || 'all') !== lastLay) { lastLay = st.lay || 'all'; order.forEach(k => dimIt(L1[k].m, lastLay !== 'all' && lastLay !== k)); }
      return anim;
    };
  } else if (set === 'subs') {
    const KINDS = ['brick', 'block', 'hollow', 'aac', 'rcc'], NAME = { brick: 'Clay brick', block: 'Solid block', hollow: 'Hollow block', aac: 'AAC block', rcc: 'Concrete' };
    const STEP = 8.2, X0 = -STEP * 2, PW = 6.4, PH = 6, items = [], sucA = { brick: .5, block: .34, hollow: .34, aac: .74, rcc: .1 };
    KINDS.forEach((k, i) => {
      const g = new THREE.Group(); g.position.x = X0 + i * STEP; scene.add(g);
      g.add(buildWall(k, PW, PH, 2.2, 5 + i));
      const pl = slab(PW / 2, PH, .7, 'c2', 40 + i); pl.position.set(PW / 4, PH / 2, .35 + .01); g.add(pl);
      const suc = new THREE.Mesh(new THREE.BoxGeometry(PW / 2 - .06, PH - .06, .06), new THREE.MeshBasicMaterial({ color: 0x3f98d6, transparent: true, opacity: sucA[k] * .7, depthWrite: false })); suc.position.set(-PW / 4, PH / 2, .05); suc.visible = false; g.add(suc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(PW * .62, .08, 8, 56), hotM); ring.rotation.x = Math.PI / 2; ring.position.y = .06; ring.visible = false; g.add(ring);
      items.push({ k, g, suc, ring });
    });
    out.views = { all: { az: -8, el: 20, dist: matchMedia('(max-width:640px)').matches ? 78 : 52, t: [0, 3, 0] }, ...Object.fromEntries(items.map((o, i) => [o.k, { az: -20, el: 16, dist: 17, t: [X0 + i * STEP, 3, 0] }])) };
    out.labels = items.map((o, i) => ({ id: o.k, text: NAME[o.k], side: 'r', tone: 'hot', anchor: new V3(X0 + i * STEP - PW / 2 + .6, PH + .3, 0), show: st => st.view === 'all' || st.view === o.k }));
    out.limits = { az: [-60, 60], el: [6, 55], dist: [8, 100] };
    out.update = (t, dt, st) => { items.forEach(o => { o.suc.visible = !!st.suc; o.ring.visible = st.view === o.k; }); return false; };
  } else {
    /* micro: a magnified coat on a pitted brick background */
    const JW = 10, JH = 4.2, JD = 5, BH = 1.7;
    const paste = new THREE.Mesh(new THREE.BoxGeometry(JW, JH, JD), new THREE.MeshPhysicalMaterial({ color: 0xb9ae9d, roughness: .45, transparent: true, opacity: .38, depthWrite: false, clearcoat: .5, clearcoatRoughness: .2, side: THREE.DoubleSide })); paste.position.y = BH + JH / 2 + .012; paste.renderOrder = 4;   /* lifted a hair off the brick top: the two faces used to lie in one plane and flicker */ scene.add(paste);
    const bt2 = brickTex(11, [168, 70, 44]), ct = cutTex('brick', 7); const sideB = std(brickTex(18, [156, 62, 40]), { bump: 1.6 });
    const bg = new THREE.Mesh(rbox(JW, BH, JD, .08, 6, .33), [sideB, sideB, std(bt2, { bump: 2.2 }), sideB, new THREE.MeshStandardMaterial({ map: ct.map, bumpMap: ct.bump, bumpScale: 2.6, roughness: .95, envMapIntensity: .4 }), sideB]); bg.position.y = BH / 2; bg.castShadow = bg.receiveShadow = true; scene.add(bg);
    const r = rng(23), pits = new THREE.MeshStandardMaterial({ color: 0x3a2018, roughness: 1 });
    for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.1 + r() * .14, 10, 8), pits); p.position.set((r() - .5) * (JW - .8), BH + .01, (r() - .5) * (JD - .8)); p.scale.y = .35; scene.add(p); }
    const G = [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), GS = [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), GT = [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny'));
    const mk = (n, lo, hi) => { const it = []; for (let i = 0; i < n; i++) { const s = lo + Math.pow(r(), 1.7) * (hi - lo); it.push({ x: (r() - .5) * (JW - .5), y: BH + s * .9 + r() * (JH - s * 2), z: (r() - .5) * (JD - .5), s, c: mineral(r).map((v, k) => v * PT[k]), flat: .86 + r() * .2, jx: .92 + r() * .16, jz: .92 + r() * .16, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)) }); } return it; };
    const gm = grainMat({ bump: .1 }); gm.emissive.set(0xff5e29); gm.emissiveIntensity = 0;
    plant(scene, mk(700, .18, .42), G, gm, 41, true); plant(scene, mk(2400, .09, .2), GS, gm, 42, false); plant(scene, mk(5200, .045, .09), GT, gm, 43, false);
    out.views = { all: { az: -16, el: 20, dist: matchMedia('(max-width:640px)').matches ? 34 : 24, t: [0, 3.2, 0] } };
    out.labels = [
      { id: 'g', text: 'Sand grains: the fine aggregate', side: 'r', tone: 'hot', anchor: new V3(JW / 2 - 1, 5, JD / 2), show: () => true },
      { id: 'p', text: 'Binder paste and water around the grains', side: 'r', anchor: new V3(JW / 2, 3.4, JD / 2), show: () => true },
      { id: 'b', text: 'Background surface with pores and key', side: 'l', anchor: new V3(-JW / 2, 1.0, JD / 2), show: () => true },
    ];
    out.limits = { az: [-60, 60], el: [4, 60], dist: [10, 50] };
    out.update = (t, dt, st) => { const h = st.hl ? .55 : 0; if (gm.emissiveIntensity !== h) gm.emissiveIntensity = h; return false; };
  }
  return out;
}
