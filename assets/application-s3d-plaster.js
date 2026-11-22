/* scene: plaster on a wall. Three sets, one module.
   layers : an exploded cross-section of a plaster system (background, prepared surface, first / intermediate / finishing coat) that can be taken apart and isolated.
   subs   : five wall backgrounds side by side (clay brick, solid block, hollow block, AAC block, cast-in-place concrete), each half plastered, with an optional suction overlay.
   micro  : a magnified cut through a plaster coat: sand grains held in binder paste, on a pitted background.
   Thicknesses are exaggerated, sizes are not to scale, and the suction overlay is a qualitative picture, not a measurement.
   No thickness, number of coats, mix proportion, bond strength or other value is shown or implied. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, reduce, V3 } from '/assets/application-s3d-sand.js';
const { mk, canvasTex } = L;

/* background textures: drawn once, drawn per kind */
const BG = {
  brick: { base: '#b9593b', top: '#a8a49c', name: 'Clay brick masonry' },
  block: { base: '#a9aaa7', top: '#a2a3a0', name: 'Solid concrete block' },
  hollow: { base: '#a9aaa7', top: '#a2a3a0', name: 'Hollow concrete block' },
  aac: { base: '#e2e0da', top: '#dedbd4', name: 'AAC block' },
  rcc: { base: '#a2a3a0', top: '#9d9e9b', name: 'Cast-in-place concrete' },
};
const bgFront = kind => canvasTex(512, 320, (x, w, h) => {
  const r = rng(kind.length * 13 + 5);
  if (kind === 'brick') {
    x.fillStyle = '#a8a49c'; x.fillRect(0, 0, w, h);
    const bw = 76, bh = 30, j = 5; for (let c = 0; c * (bh + j) < h; c++) for (let i = -1; i * (bw + j) < w; i++) {
      const ox = c % 2 ? (bw + j) / 2 : 0, px = i * (bw + j) + ox, py = c * (bh + j);
      x.fillStyle = ['#a8503a', '#9a4630', '#b05c42', '#a24c36'][(r() * 4) | 0]; x.fillRect(px, py, bw, bh);
      for (let s = 0; s < 22; s++) { x.fillStyle = r() < .5 ? '#8f3f27' : '#cf7c5d'; x.globalAlpha = .35; x.fillRect(px + r() * bw, py + r() * bh, 1 + r() * 3, 1 + r() * 2); } x.globalAlpha = 1;
    }
  } else if (kind === 'block' || kind === 'hollow') {
    x.fillStyle = '#8f8d88'; x.fillRect(0, 0, w, h);
    const bw = 156, bh = 74, j = 6; for (let c = 0; c * (bh + j) < h; c++) for (let i = -1; i * (bw + j) < w; i++) {
      const ox = c % 2 ? (bw + j) / 2 : 0, px = i * (bw + j) + ox, py = c * (bh + j);
      x.fillStyle = '#a9aaa7'; x.fillRect(px, py, bw, bh);
      for (let s = 0; s < 120; s++) { x.fillStyle = r() < .5 ? '#8f918e' : '#c3c4c1'; x.globalAlpha = .45; x.fillRect(px + r() * bw, py + r() * bh, 1 + r() * 2, 1 + r() * 2); } x.globalAlpha = 1;
    }
  } else if (kind === 'aac') {
    x.fillStyle = '#d9d6cf'; x.fillRect(0, 0, w, h);
    const bw = 200, bh = 96, j = 2; for (let c = 0; c * (bh + j) < h; c++) for (let i = -1; i * (bw + j) < w; i++) {
      const ox = c % 2 ? (bw + j) / 2 : 0, px = i * (bw + j) + ox, py = c * (bh + j);
      x.fillStyle = '#e4e2dc'; x.fillRect(px, py, bw, bh);
      for (let s = 0; s < 170; s++) { x.fillStyle = '#c9c6be'; x.globalAlpha = .5; x.beginPath(); x.arc(px + r() * bw, py + r() * bh, .8 + r() * 2.4, 0, 6.3); x.fill(); } x.globalAlpha = 1;
    }
  } else {
    x.fillStyle = '#a2a3a0'; x.fillRect(0, 0, w, h);
    for (let s = 0; s < 2600; s++) { x.fillStyle = r() < .5 ? '#8e8f8c' : '#b4b5b2'; x.globalAlpha = .28; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } x.globalAlpha = 1;
    x.fillStyle = 'rgba(70,70,70,.16)'; for (let k = 1; k < 4; k++) x.fillRect(0, k * h / 4, w, 1.6);
    x.fillStyle = 'rgba(60,60,60,.5)'; [[100, 80], [412, 80], [100, 240], [412, 240]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 5, 0, 6.3); x.fill(); });
  }
}, true);
const hollowTop = () => canvasTex(512, 256, (x, w, h) => {
  x.fillStyle = '#a2a3a0'; x.fillRect(0, 0, w, h); x.fillStyle = '#4c4d4b';
  for (let i = 0; i < 3; i++) { const px = 24 + i * 164; x.fillRect(px, 38, 122, 180); }
  x.fillStyle = '#7c7d7a'; for (let i = 0; i < 3; i++) x.fillRect(24 + i * 164 + 12, 50, 98, 8);
}, false);
const speck = (base, sp, seed, n = 2600, rep = true) => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < n; i++) { x.fillStyle = sp[(r() * sp.length) | 0]; x.globalAlpha = .25 + r() * .5; const s = .8 + r() * 1.8; x.fillRect(r() * w, r() * h, s, s); } x.globalAlpha = 1;
}, rep);
const side = c => new THREE.MeshStandardMaterial({ color: c, roughness: .95 });

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 30, key: 2.2, shadow: .2, map: 2048 });
  const set = state.set || 'layers';
  const WX = 12, WY = 7.4, T = { bg: 2.4, prep: .14, c1: .9, c2: .75, c3: .55 };
  const edge = new THREE.LineBasicMaterial({ color: 0x4a4b50, transparent: true, opacity: .55 });
  const hotE = new THREE.Color(0xff5e29), off = new THREE.Color(0);
  const out = { scene, fov: 30, wide: true };
  const kinds = Object.keys(BG);
  const fronts = {}; const getFront = k => fronts[k] || (fronts[k] = bgFront(k));
  const bgMats = k => { const f = new THREE.MeshStandardMaterial({ map: getFront(k), roughness: .95 }), s = side(BG[k].top);
    const top = k === 'hollow' ? new THREE.MeshStandardMaterial({ map: hollowTop(), roughness: .95 }) : s; return [s, s, top, s, f, s]; };

  if (set === 'layers') {
    const L1 = {}; const order = ['bg', 'prep', 'c1', 'c2', 'c3'];
    const mkLayer = (k, mat) => { const m = mk(new THREE.BoxGeometry(WX, WY, T[k]), mat); const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edge); m.add(e); scene.add(m); L1[k] = { m, mat, e, zc: 0 }; };
    mkLayer('bg', bgMats(state.sub || 'brick'));
    const prepRaw = new THREE.MeshStandardMaterial({ map: speck('#cdc9c0', ['#e4e1da', '#b3afa6'], 21, 1200), roughness: .35 });
    const prepReady = new THREE.MeshStandardMaterial({ map: speck('#8c8984', ['#6f6c67', '#a39f99', '#5c5a56'], 22, 4200), roughness: 1 });
    mkLayer('prep', prepReady);
    const coat = (a, b, seed, n) => new THREE.MeshStandardMaterial({ map: speck(a, b, seed, n), roughness: .96 });
    mkLayer('c1', coat('#b4aea3', ['#9d978c', '#c9c3b8', '#8a857b'], 31, 3600));
    mkLayer('c2', coat('#bdb7ac', ['#a7a196', '#d0cabf'], 32, 2800));
    mkLayer('c3', coat('#cbc6bc', ['#bab5ab', '#dad5cb'], 33, 1400));
    const labText = { bg: () => BG[state.sub || 'brick'].name.replace(/^Cast-in-place concrete/, 'Concrete background'), prep: () => 'Prepared surface: key and suction', c1: () => state.coats === 1 ? 'Single coat' : 'First coat', c2: () => 'Intermediate coat', c3: () => 'Finishing coat' };
    const visOf = st => ({ bg: true, prep: true, c1: true, c2: st.coats === 3, c3: st.coats >= 2 });
    const labels = order.map((k, i) => ({ id: k, text: labText[k](), side: 'l', tone: k === 'c1' || k === 'c3' ? 'hot' : undefined, anchor: () => new V3(-WX / 2, WY * [1.05, .92, .79, .66, .53][i], L1[k].zc), show: st => { const v = visOf(st); return v[k] && (!st.lay || st.lay === 'all' || st.lay === k); } }));
    let ex = 0, lastSub = null, lastPrep = null, lastCoats = null;
    out.views = { all: { az: -34, el: 18, dist: 30, t: [0, 3.2, 2.4] } };
    out.labels = labels; out.limits = { az: [-70, 20], el: [4, 60], dist: [14, 80] };
    out.update = (t, dt, st, fig) => {
      let anim = false; const target = clamp01(st.explode ?? 0); ex += (target - ex) * Math.min(1, dt * 6); if (Math.abs(target - ex) > .003) anim = true; else ex = target;
      if (st.sub !== lastSub) { lastSub = st.sub || 'brick'; L1.bg.m.material = bgMats(lastSub); L1.bg.mat = L1.bg.m.material; if (fig && fig.labs) fig.labs[0].el.querySelector('b').textContent = labText.bg(); }
      if (st.prep !== lastPrep) { lastPrep = st.prep || 'ready'; L1.prep.m.material = lastPrep === 'raw' ? prepRaw : prepReady; }
      if (st.coats !== lastCoats) { lastCoats = st.coats; if (fig && fig.labs) { fig.labs[2].el.querySelector('b').textContent = labText.c1(); } }
      const v = visOf(st), gap = .05 + ex * 2.7; let z = 0;
      L1.bg.zc = -T.bg / 2; L1.bg.m.position.z = -T.bg / 2;
      order.slice(1).forEach(k => { L1[k].m.visible = v[k]; if (!v[k]) return; z += gap; L1[k].zc = z + T[k] / 2; L1[k].m.position.z = L1[k].zc; z += T[k]; });
      order.forEach(k => {
        const dim = st.lay && st.lay !== 'all' && st.lay !== k, mats = Array.isArray(L1[k].m.material) ? L1[k].m.material : [L1[k].m.material];
        mats.forEach(mm => { mm.transparent = !!dim; mm.opacity = dim ? .1 : 1; mm.depthWrite = !dim; });
        L1[k].e.material = dim ? faint : edge;
      });
      const r = fig && fig.c; if (!reduce() && st.spin) { anim = true; }
      return anim;
    };
  } else if (set === 'subs') {
    const STEP = 8.2, X0 = -STEP * 2, PW = 6.4, PH = 6, items = [];
    const sucA = { brick: .5, block: .34, hollow: .34, aac: .74, rcc: .1 };
    kinds.forEach((k, i) => {
      const g = new THREE.Group(); g.position.x = X0 + i * STEP; scene.add(g);
      const bg = mk(new THREE.BoxGeometry(PW, PH, 2.2), bgMats(k)); bg.position.set(0, PH / 2, -1.1); g.add(bg);
      const pl = mk(new THREE.BoxGeometry(PW / 2, PH, .7), new THREE.MeshStandardMaterial({ map: speck('#bdb7ac', ['#a7a196', '#d0cabf'], 40 + i, 2400), roughness: .96 })); pl.position.set(PW / 4, PH / 2, .35); g.add(pl);
      const plE = new THREE.LineSegments(new THREE.EdgesGeometry(pl.geometry), edge); pl.add(plE);
      const suc = new THREE.Mesh(new THREE.BoxGeometry(PW / 2 - .06, PH - .06, .06), new THREE.MeshBasicMaterial({ color: 0x3f98d6, transparent: true, opacity: sucA[k] * .7, depthWrite: false })); suc.position.set(-PW / 4, PH / 2, .04); suc.visible = false; g.add(suc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(PW * .62, .08, 8, 56), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 })); ring.rotation.x = Math.PI / 2; ring.position.y = .06; ring.visible = false; g.add(ring);
      items.push({ k, g, suc, ring });
    });
    out.views = { all: { az: -8, el: 20, dist: 52, t: [0, 3, 0] }, ...Object.fromEntries(items.map((o, i) => [o.k, { az: -20, el: 16, dist: 17, t: [X0 + i * STEP, 3, 0] }])) };
    const SHORT = { brick: 'Clay brick', block: 'Solid block', hollow: 'Hollow block', aac: 'AAC block', rcc: 'Concrete' };
    out.labels = items.map((o, i) => ({ id: o.k, text: SHORT[o.k], side: 'r', tone: 'hot', anchor: new V3(X0 + i * STEP - PW / 2, PH + .6 + (i % 3) * 1.7, 0), show: st => st.view === 'all' || st.view === o.k }));
    out.limits = { az: [-60, 60], el: [6, 55], dist: [8, 70] };
    out.update = (t, dt, st) => { items.forEach(o => { o.suc.visible = !!st.suc; o.ring.visible = st.view === o.k; }); return false; };
  } else {
    /* micro: a magnified coat on a pitted background */
    const JW = 10, JH = 4.2, JD = 5;
    const paste = mk(new THREE.BoxGeometry(JW, JH, JD), new THREE.MeshPhysicalMaterial({ color: 0xb9ae9d, roughness: .6, transparent: true, opacity: .62, depthWrite: false }), { cast: false }); paste.position.y = 1.7 + JH / 2; paste.renderOrder = 4; scene.add(paste);
    const bgm = mk(new THREE.BoxGeometry(JW, 1.7, JD), [side('#a8a49c'), side('#a8a49c'), side('#a8a49c'), side('#a8a49c'), new THREE.MeshStandardMaterial({ map: getFront('brick'), roughness: .95 }), side('#a8a49c')]); bgm.position.y = .85; scene.add(bgm);
    const r = rng(23), items = []; for (let i = 0; i < 1500; i++) { const s = .07 + Math.pow(r(), 1.7) * .26; items.push([(r() - .5) * (JW - .5), 1.7 + s + r() * (JH - s * 2), (r() - .5) * (JD - .5), s]); }
    const gmat = grainMat(); inst(scene, items, grainGeos('ang', 'm'), gmat, 41, false);
    const pit = new THREE.MeshStandardMaterial({ color: 0x5b5853, roughness: 1 }); for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.12 + r() * .14, 10, 8), pit); p.position.set((r() - .5) * (JW - .6), 1.72, (r() - .5) * (JD - .6)); p.scale.y = .5; scene.add(p); }
    out.views = { all: { az: -16, el: 20, dist: 24, t: [0, 3.2, 0] } };
    out.labels = [
      { id: 'g', text: 'Sand grains: the fine aggregate', side: 'r', tone: 'hot', anchor: new V3(JW / 2 - 1, 5, JD / 2), show: () => true },
      { id: 'p', text: 'Binder paste and water around the grains', side: 'r', anchor: new V3(JW / 2, 3.4, JD / 2), show: () => true },
      { id: 'b', text: 'Background surface with pores and key', side: 'l', anchor: new V3(-JW / 2, 1.8, JD / 2), show: () => true },
    ];
    out.limits = { az: [-60, 60], el: [4, 60], dist: [10, 50] };
    out.update = (t, dt, st) => { gmat.emissive.copy(st.hl ? hotE : off); gmat.emissiveIntensity = st.hl ? .55 : 0; return false; };
  }
  return out;
}
const clamp01 = v => Math.min(1, Math.max(0, v));
const faint = new THREE.LineBasicMaterial({ color: 0x4a4b50, transparent: true, opacity: .12 });
