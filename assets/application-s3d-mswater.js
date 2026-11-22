/* scene: two samples side by side in glass beakers (M-Sand page, "Water demand and workability"). Pick one factor (particle shape, surface texture, fines, grading or moisture) and only that factor changes in mix B.
   Each beaker is a real glass vessel (thick base, rolled rim, reflections) filled with the same crushed-rock grains as the M-Sand macro figure (application-s3d-msand.js): the grains against the glass are individual
   fractured or rounded particles, packed in layers over a dark core, with a heaped top; wet samples are darker and glossy with water beads on the glass. 1 unit = 1 mm. The sizes are compressed so the fines stay visible.
   It shows no water content, slump, strength or percentage, and it is not a test of any material. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, plant, mineral } from '/assets/application-s3d-msand.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;

const R = 22, CUPH = 50, FILL = 40, FLOOR = 2.4, X = 36;
/* what each factor changes in mix B (and only that) */
const CFG = {
  base: { kind: 'ang', lo: .15, hi: 1.4, pw: 1.45, fineN: 700, rough: .8, bump: .2, wet: 0, dust: 0 },
  shape: { a: { kind: 'round' }, b: { kind: 'ang' } },
  texture: { a: { rough: .32, bump: .03 }, b: { rough: 1, bump: .45 } },
  fines: { a: { fineN: 250 }, b: { fineN: 5000, dust: 1 } },
  grading: { a: {}, b: { lo: .46, hi: .56, pw: 1, fineN: 0 } },
  moisture: { a: { wet: 0 }, b: { wet: 1 } },
};
const TXT = {
  shape: ['Rounder particles', 'More angular particles'], texture: ['Smoother surface texture', 'Rougher surface texture'], fines: ['Fewer fine particles', 'More fine particles'],
  grading: ['Well-spread particle sizes', 'Narrow range of sizes'], moisture: ['Dry particle surfaces', 'Wet particle surfaces'],
};

export default function build({ state }) {
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 64, key: 2.5, shadow: .22, map: 3072, ground: false });
  key.shadow.bias = -.00012; key.shadow.normalBias = .03; key.shadow.camera.near = 60; key.shadow.camera.far = 230; key.shadow.camera.updateProjectionMatrix();
  /* bench */
  const bcv = document.createElement('canvas'); bcv.width = bcv.height = 512; { const g = bcv.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); } }
  const bt = new THREE.CanvasTexture(bcv); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(26, 18); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 8;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(420, 3, 300), new THREE.MeshStandardMaterial({ map: bt, roughness: .5, metalness: 0, envMapIntensity: .8 })); bench.position.set(0, -1.5, 0); bench.receiveShadow = true; scene.add(bench);

  /* grain shapes */
  const G = { ang: [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), round: [0, 1, 2, 3, 4, 5].map(i => crushed(700 + i * 19, 'round')), small: [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), tiny: [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')) };

  /* the beakers: a thick base, straight wall, a rolled rim; reflective glass */
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xeaf2f1, roughness: .03, metalness: 0, transparent: true, opacity: .15, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.6, ior: 1.5 });
  const prof = [[0, 0], [R + 1.0, 0], [R + 1.9, .5], [R + 1.9, CUPH - 1], [R + 2.1, CUPH - .3], [R + 1.6, CUPH + .5], [R + .7, CUPH + .2], [R + .3, CUPH - 1], [R, CUPH - 1.6], [R, FLOOR + .5], [R - 1.2, FLOOR], [0, FLOOR]].map(p => new THREE.Vector2(p[0], p[1]));
  const glassG = new THREE.LatheGeometry(prof, 96);
  const cups = [-X, X].map(x => {
    const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g);
    const glass = new THREE.Mesh(glassG, glassM); glass.renderOrder = 8; g.add(glass);
    const mixG = new THREE.Group(); g.add(mixG); return { g, mixG };
  });
  const dropGeo = new THREE.SphereGeometry(1, 14, 10), dropM = new THREE.MeshPhysicalMaterial({ color: 0xdff2f7, roughness: .02, transparent: true, opacity: .5, clearcoat: 1, envMapIntensity: 2.4, depthWrite: false });
  const coreM = [0, 1].map(() => new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: .95 }));
  const clear = g => { while (g.children.length) { const c = g.children.pop(); if (c.isInstancedMesh || c.geometry) { if (c.dispose) c.dispose(); } } };
  function fill(i, cfg, seed) {
    const c = cups[i]; clear(c.mixG); const r = rng(seed), rc = rng(1234);       /* the same colour sequence in both beakers, so only the factor differs */
    const mat = grainMat({ rough: cfg.rough, bump: cfg.bump, env: cfg.wet ? 1.1 : .55 });
    if (cfg.wet) { mat.color.set(0x6a6a72); mat.roughness = .1; }
    const sz = () => cfg.lo * Math.pow(cfg.hi / cfg.lo, Math.pow(r(), cfg.pw)), items = [], dust = cfg.dust;
    const colour = (s) => { const k = mineral(rc); if (dust && s < .3) { const t = .55; return [k[0] + (.46 - k[0]) * t, k[1] + (.45 - k[1]) * t, k[2] + (.43 - k[2]) * t]; } return k; };
    const pushed = (x, y, z, s) => items.push({ x, y, z, s, c: colour(s), flat: .86 + r() * .2, jx: .92 + r() * .16, jz: .92 + r() * .16, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)) });
    /* wall layers (what shows through the glass), then the heaped top; coverage is counted so the fill is dense whatever the grain size */
    let cov = 0; const wallTarget = TAU * R * (FILL - FLOOR) * 1.25, topTarget = Math.PI * R * R * 1.5;
    while (cov < wallTarget) { const s = sz(), a = r() * TAU, rr = R - s * (.5 + r() * .42) - (r() < .45 ? s * (1.3 + r() * 1.5) : 0), y = FLOOR + s + r() * (FILL - FLOOR - s * 1.4); pushed(Math.cos(a) * rr, y, Math.sin(a) * rr, s); cov += Math.PI * s * s * 1.5; }
    cov = 0; while (cov < topTarget) { const s = sz(), a = r() * TAU, f = Math.sqrt(r()), rr = f * (R - s * .6), y = FILL + (1 - f * f) * 3.2 + s * .1 - r() * s * .8; pushed(Math.cos(a) * rr, y, Math.sin(a) * rr, s); cov += Math.PI * s * s * 1.5; }
    for (let k = 0; k < cfg.fineN; k++) { const s = .085 + r() * .11, a = r() * TAU, rr = R - s * (.5 + r() * .5) - (r() < .4 ? s * 2 : 0), y = FLOOR + s + r() * (FILL - FLOOR); pushed(Math.cos(a) * rr, y, Math.sin(a) * rr, s); }
    const big = items.filter(t => t.s >= .75), mid = items.filter(t => t.s >= .3 && t.s < .75), tiny = items.filter(t => t.s < .3);
    plant(c.mixG, big, G[cfg.kind], mat, seed + 1, true); plant(c.mixG, mid, cfg.kind === 'round' ? G.round : G.small, mat, seed + 2, true); plant(c.mixG, tiny, G.tiny, mat, seed + 3, false);
    coreM[i].color.set(cfg.wet ? 0x3d3b3a : 0x8a847a); coreM[i].roughness = cfg.wet ? .2 : .95; const core = new THREE.Mesh(new THREE.CylinderGeometry(R - 3.2, R - 3.2, FILL - FLOOR, 40), coreM[i]); core.position.y = (FILL + FLOOR) / 2; core.receiveShadow = true; c.mixG.add(core);
    if (cfg.wet) {                                                  /* water beads on the glass, and a darker film of water at the foot of the grains */
      const im = new THREE.InstancedMesh(dropGeo, dropM, 110), o = new THREE.Object3D(); for (let k = 0; k < 110; k++) { const a = r() * TAU, s = .45 + Math.pow(r(), 2) * .9; o.position.set(Math.cos(a) * (R - .15), FLOOR + 1 + r() * (FILL - FLOOR - 3), Math.sin(a) * (R - .15)); o.scale.set(s, s * (1 + r() * .6), s * .5); o.rotation.y = -a; o.updateMatrix(); im.setMatrixAt(k, o.matrix); } im.frustumCulled = false; im.renderOrder = 9; c.mixG.add(im);
    }
  }
  let cur = '';
  const views = { front: { az: -10, el: 15, dist: 196, t: [0, 28, 0] }, top: { az: -10, el: 56, dist: 186, t: [0, 22, 0] } };
  const labels = [
    { id: 'a', text: 'Mix A', side: 'l', anchor: new V3(-X - R + 3, CUPH - 6, R), show: () => true },
    { id: 'b', text: 'Mix B', side: 'r', tone: 'hot', anchor: new V3(X + R - 3, CUPH - 6, R), show: () => true },
  ];
  const apply = (st, fig) => {
    const f = st.factor || 'shape'; if (f === cur) return; cur = f;
    fill(0, { ...CFG.base, ...CFG[f].a }, 91); fill(1, { ...CFG.base, ...CFG[f].b }, 92);
    if (fig && fig.labs) fig.labs.forEach((l, i) => { const txt = (i ? 'Mix B · ' : 'Mix A · ') + TXT[f][i]; l.text = txt; const b = l.el.querySelector('b'); if (b) b.textContent = txt; const sp = fig.legend && fig.legend[i] && fig.legend[i].querySelector('span'); if (sp) sp.textContent = txt; l.w = 0; });
  };
  return { scene, views, fov: 30, wide: true, labels, limits: { az: [-60, 60], el: [6, 66], dist: [40, 260] }, update(t, dt, st, fig) { apply(st, fig); return false; } };
}
