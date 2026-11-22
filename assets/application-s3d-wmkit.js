/* shared pieces for the Wet Mix Macadam scenes: cut-face textures, generic road machines (tipper, paver, roller), road-section blocks.
   Generic drawings of generic machines. None of it is an OM GROUP plant, vehicle or project, and no dimension, mix or test value is implied. */
import { THREE, L, rng } from '/assets/application-s3d.js';
const { M, mk, canvasTex, clamp, sm, lerp, TAU } = L;

export const yellowM = () => new THREE.MeshStandardMaterial({ color: 0xe5a000, roughness: .55, metalness: .1 });
export const greyM = c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 });
export const reduceM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* a cut face of a granular layer, painted as faceted particles of mixed sizes. kind: wmm (graded, tight), loose (more gaps), gsb (lighter, finer), coarse (large only), fines (small only), rock */
export function sectionTex(seed, w = 1024, h = 256, kind = 'wmm', rep = [1, 1]) {
  const t = canvasTex(w, h, (x, cw, ch) => {
    const r = rng(seed);
    const bg = { wmm: '#2a2b2e', loose: '#1a1b1d', gsb: '#6b6862', coarse: '#161719', fines: '#4a4a4d', dbm: '#151517', bc: '#1c1d20', rock: '#5a5750', conc: '#8d8f8d', conc2: '#a3a5a3', gsbl: '#3f3d39' }[kind];
    x.fillStyle = bg; x.fillRect(0, 0, cw, ch);
    const pal = { wmm: [[.2, .22, .25], [.3, .31, .34], [.42, .43, .46], [.14, .15, .17]], loose: [[.2, .22, .25], [.3, .31, .34], [.1, .1, .12]], gsb: [[.62, .6, .56], [.5, .48, .45], [.72, .7, .66], [.4, .38, .35]], coarse: [[.24, .25, .28], [.34, .35, .38], [.16, .17, .2]], fines: [[.46, .46, .48], [.36, .36, .38], [.56, .56, .58]], dbm: [[.12, .12, .14], [.18, .18, .2], [.08, .08, .1]], bc: [[.14, .14, .16], [.2, .2, .22]], rock: [[.45, .43, .38], [.35, .33, .3], [.55, .52, .47]], conc: [[.55, .56, .55], [.62, .63, .62], [.47, .48, .47]], conc2: [[.64, .65, .64], [.7, .71, .7], [.57, .58, .57]], gsbl: [[.62, .6, .56], [.5, .48, .45], [.72, .7, .66], [.4, .38, .35]] }[kind];
    const sizes = { wmm: [[1, 48, 150], [.8, 22, 480], [.7, 8, 1300]], loose: [[1, 44, 120], [.8, 20, 280], [.7, 7, 600]], gsb: [[1, 36, 110], [.8, 14, 520], [.7, 6, 1500]], coarse: [[1, 56, 220], [.5, 30, 100]], fines: [[1, 9, 2600], [.7, 4, 3000]], dbm: [[1, 10, 1500], [.6, 4, 1800]], bc: [[1, 6, 2600]], rock: [[1, 70, 40], [.8, 30, 160]], conc: [[1, 6, 2400], [.7, 3, 2600]], conc2: [[1, 5, 2200]], gsbl: [[1, 36, 100], [.8, 14, 330], [.7, 6, 800]] }[kind];
    const scale = cw / 1024;
    sizes.forEach(([rr, s, n]) => {
      for (let i = 0; i < n * scale * scale * (ch / 256 > 1 ? ch / 256 : 1); i++) {
        const cx = r() * cw, cy = r() * ch, rad = s * scale * (.55 + r() * .6) * (kind === 'coarse' ? 1 : 1), k = 5 + (r() * 3 | 0), p = pal[(r() * pal.length) | 0], sh = .85 + r() * .3, a0 = r() * TAU;
        x.beginPath(); for (let j = 0; j < k; j++) { const a = a0 + j / k * TAU + (r() - .5) * .5, rd = rad * (.6 + r() * .55); const px = cx + Math.cos(a) * rd * 1.1, py = cy + Math.sin(a) * rd * .9; j ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath();
        x.fillStyle = 'rgb(' + ((p[0] * sh * 255) | 0) + ',' + ((p[1] * sh * 255) | 0) + ',' + ((p[2] * sh * 255) | 0) + ')'; x.globalAlpha = .9; x.fill();
        x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.stroke(); x.globalAlpha = 1;
      }
    });
  }, true);
  t.repeat.set(rep[0], rep[1]); return t;
}
export const faceMat = (seed, kind, w, h, rep) => new THREE.MeshStandardMaterial({ map: sectionTex(seed, w, h, kind, rep), roughness: kind === 'bc' || kind === 'dbm' ? .6 : .95 });
export const soilMat = seed => new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#8d5c3c'; x.fillRect(0, 0, w, h); const r = rng(seed); for (let i = 0; i < 3400; i++) { x.fillStyle = ['#6d432b', '#a9724c', '#59391f', '#b58058'][(r() * 4) | 0]; x.globalAlpha = .3 + r() * .5; const s = 1 + r() * 3; x.fillRect(r() * w, r() * h, s, s * (.5 + r())); } x.globalAlpha = 1; }, true), roughness: 1 });

/* a layered block whose faces take the cut-face texture on the front (+z) and plain tone elsewhere */
export function layerBlock(w, h, d, kind, seed, topCol) {
  const front = faceMat(seed, kind, 1024, Math.max(64, Math.round(1024 * h / w) * 2), [1, 1]);
  const side = new THREE.MeshStandardMaterial({ color: topCol || 0x3a3b3e, roughness: .95 });
  const topM = new THREE.MeshStandardMaterial({ color: topCol || 0x3a3b3e, roughness: .95, map: kind === 'wmm' || kind === 'loose' ? sectionTex(seed + 3, 512, 512, kind === 'loose' ? 'loose' : 'wmm', [Math.max(1, w / 24), Math.max(1, d / 24)]) : null });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, topM, side, front, side]); m.castShadow = true; m.receiveShadow = true; return m;
}

/* generic tipper truck. facing +x (cab at +x), bed hinged at its rear (-x). returns {g, bed, wheels} */
export function tipper(o = {}) {
  const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: .5 }), dark = M.dark, wheels = [];
  const ch = mk(new THREE.BoxGeometry(16, .9, 5), dark); ch.position.set(0, 1.9, 0); g.add(ch);
  [[-5.5, -2.7], [-5.5, 2.7], [-3.1, -2.7], [-3.1, 2.7], [5.2, -2.7], [5.2, 2.7]].forEach(([x, z]) => { const w = mk(new THREE.CylinderGeometry(1.2, 1.2, 1, 22), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, 1.2, z); g.add(w); wheels.push(w); const hub = mk(new THREE.CylinderGeometry(.55, .55, 1.05, 14), M.steelS); hub.rotation.x = Math.PI / 2; hub.position.set(x, 1.2, z); g.add(hub); });
  const cab = mk(new THREE.BoxGeometry(4, 4, 4.8), white); cab.position.set(6.6, 4.2, 0); g.add(cab); const wind = mk(new THREE.BoxGeometry(.12, 1.8, 4.2), new THREE.MeshStandardMaterial({ color: 0x5a7d93, roughness: .1, metalness: .3 })); wind.position.set(8.6, 4.8, 0); g.add(wind);
  const bed = new THREE.Group(); bed.position.set(-7.4, 2.4, 0); g.add(bed);
  const floor = mk(new THREE.BoxGeometry(13.4, .35, 5.6), new THREE.MeshStandardMaterial({ color: o.body || 0xc9c5bb, roughness: .7 })); floor.position.set(6.7, 0, 0); bed.add(floor);
  [[6.7, 1.6, -2.75, 13.4, 3.2, .3], [6.7, 1.6, 2.75, 13.4, 3.2, .3], [13.3, 1.6, 0, .3, 3.2, 5.6], [.6, 1.1, 0, .3, 2.2, 5.6]].forEach(([x, y, z, w, h, d]) => { const p = mk(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: o.body || 0xc9c5bb, roughness: .7 })); p.position.set(x, y, z); bed.add(p); });
  const load = mk(new THREE.BoxGeometry(12.2, 1.9, 5), new THREE.MeshStandardMaterial({ map: sectionTex(41, 512, 256, 'wmm', [2, 1]), roughness: 1 }), { cast: false }); load.position.set(6.7, 1.05, 0); bed.add(load);
  const tarp = mk(new THREE.BoxGeometry(13, .12, 5.7), new THREE.MeshStandardMaterial({ color: 0x3f6a48, roughness: .9 }), { cast: false }); tarp.position.set(6.7, 3.2, 0); tarp.visible = !!o.tarp; bed.add(tarp);
  return { g, bed, wheels, load, tarp };
}

/* generic paver finisher. travels +x; hopper at +x, screed at -x. */
export function paver() {
  const g = new THREE.Group(), y = yellowM(), blk = M.black;
  const body = mk(new THREE.BoxGeometry(9, 2.6, 7.2), y); body.position.set(0, 2.8, 0); g.add(body);
  [[-3, -3.9], [-3, 3.9], [3.6, -3.7], [3.6, 3.7]].forEach(([x, z], i) => { const w = mk(new THREE.CylinderGeometry(i < 2 ? 1.5 : 1, i < 2 ? 1.5 : 1, 1.2, 20), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, i < 2 ? 1.5 : 1, z); g.add(w); });
  const hop = new THREE.Group(); hop.position.set(5.4, 3, 0); g.add(hop);
  const floor = mk(new THREE.BoxGeometry(3.4, .3, 6.8), blk); floor.position.y = -.6; hop.add(floor);
  [-1, 1].forEach(s => { const wing = mk(new THREE.BoxGeometry(3.4, 2.4, .3), y); wing.position.set(0, .4, s * 3.55); wing.rotation.x = -s * .45; hop.add(wing); });
  const heap = mk(new THREE.BoxGeometry(2.6, 1.2, 5.2), new THREE.MeshStandardMaterial({ map: sectionTex(51, 512, 256, 'wmm', [1.5, 1]), roughness: 1 }), { cast: false }); heap.position.set(-.2, .1, 0); hop.add(heap);
  const screed = mk(new THREE.BoxGeometry(2.2, .8, 8), M.dark); screed.position.set(-5.6, .8, 0); g.add(screed);
  const arm = mk(new THREE.BoxGeometry(3.4, .5, .5), M.steelS); arm.position.set(-3.7, 2.4, 3.4); g.add(arm); const arm2 = arm.clone(); arm2.position.z = -3.4; g.add(arm2);
  [-3, 3].forEach(z => { const p = mk(new THREE.BoxGeometry(.2, 3.2, .2), blk); p.position.set(1.2, 5.6, z * .9); g.add(p); }); const roof = mk(new THREE.BoxGeometry(5, .25, 6), y); roof.position.set(1.2, 7.2, 0); g.add(roof);
  const seat = mk(new THREE.BoxGeometry(1.2, 1.2, 1.2), blk); seat.position.set(0, 4.7, -2); g.add(seat);
  return { g, hop, heap, screed };
}

/* generic single-drum vibratory roller. travels +x, drum at +x. */
export function roller() {
  const g = new THREE.Group(), y = yellowM();
  const drum = new THREE.Group(); drum.position.set(3.4, 2.1, 0); g.add(drum);
  const dm = new THREE.MeshStandardMaterial({ color: 0x8a8c90, metalness: .6, roughness: .45 }); const cy = mk(new THREE.CylinderGeometry(2.1, 2.1, 6.6, 36), dm); cy.rotation.x = Math.PI / 2; drum.add(cy);
  [-1, 1].forEach(s => { const cap = mk(new THREE.CylinderGeometry(1.2, 1.2, .2, 20), y); cap.rotation.x = Math.PI / 2; cap.position.z = s * 3.4; drum.add(cap); });
  const rib = mk(new THREE.BoxGeometry(.3, 4.1, 6.4), M.dark); drum.add(rib);
  const body = mk(new THREE.BoxGeometry(6, 2.2, 6.2), y); body.position.set(-2.2, 3.1, 0); g.add(body);
  const yoke = mk(new THREE.BoxGeometry(1.4, .8, 7.2), y); yoke.position.set(2.2, 3.2, 0); g.add(yoke);
  [-1, 1].forEach(s => { const w = mk(new THREE.CylinderGeometry(2, 2, 1.4, 22), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(-3.6, 2, s * 2.9); g.add(w); });
  [[-1.6, -2.7], [-1.6, 2.7], [-4.4, -2.7], [-4.4, 2.7]].forEach(([x, z]) => { const p = mk(new THREE.BoxGeometry(.2, 3.4, .2), M.black); p.position.set(x, 6, z); g.add(p); }); const roof = mk(new THREE.BoxGeometry(4.6, .25, 6.2), y); roof.position.set(-3, 7.8, 0); g.add(roof);
  const seat = mk(new THREE.BoxGeometry(1.2, 1.3, 1.3), M.black); seat.position.set(-2.8, 5.1, 0); g.add(seat);
  return { g, drum };
}
export { THREE, L, M, mk, clamp, sm, lerp, TAU, rng };
