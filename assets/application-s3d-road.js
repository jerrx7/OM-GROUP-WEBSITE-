/* scene: 60 mm aggregate vs GSB vs WMM. (1) three stockpiles show the particle make-up: one large fraction, a continuously graded blend, a processed damp road-base.
   (2) a road cross-section shows where the finished layers sit; the individual 60 mm fraction is not one of them.
   Layer thicknesses and particle proportions are not a pavement design, a grading or a measurement (1 unit = 1 cm in the piles). */
import { THREE, L, studio, rng, noiseTex } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
const { M, mk, canvasTex, clamp, sm, lerp, stone } = L;
const V3 = THREE.Vector3;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 70, shadow: .24, map: 3072 });
  const pileG = new THREE.Group(), roadG = new THREE.Group(); scene.add(pileG, roadG);
  const mat = (k, rough, tint) => { const m = M.stone.clone(); m.roughness = rough; Array.isArray(tint) ? m.color.setRGB(...tint) : m.color.setScalar(tint); return m; };
  /* photographic stones: one material per pile (floor = 0: the piles sit on a plinth, not on y = 0), hue set per instance */
  const rm = (bump, gain) => realStoneMaterial({ tint: 1, bump, floor: 0, gain, own: true });
  const mStone = rm(.24, .78), mGsb = rm(.14, 1.0), mWmm = rm(.13, .82); mWmm.roughness = .74;
  const CRUSH = realStones('crush'), LOW = realStones('low');
  const fineTex = (base, sp, seed) => { const t = noiseTex(256, 256, base, sp, seed, 7000, 1.4); t.repeat.set(3, 2); return t; };
  const heaps = [
    { k: '60', x: -34, text: '60 mm · one large fraction', tone: 'com', R: 20, H: 16, n: 300, size: u => 2.55 + u * .75, mat: mStone, base: 0x5a5a5c, hue: [.88, .88, .92], geo: CRUSH },
    { k: 'gsb', x: 0, text: 'GSB · graded blend', tone: 'std', R: 20, H: 15, n: 900, size: u => Math.exp(lerp(Math.log(.42), Math.log(2.9), Math.pow(u, .85))), mat: mGsb, hue: [1.08, .98, .8], geo: LOW, tex: fineTex('#a9a59d', ['#8d8981', '#c4bfb5', '#78746d'], 3) },
    { k: 'wmm', x: 34, text: 'WMM · processed road-base', tone: 'std', R: 20, H: 14, n: 950, size: u => Math.exp(lerp(Math.log(.34), Math.log(2.3), Math.pow(u, .9))), mat: mWmm, hue: [.72, .73, .78], geo: LOW, tex: fineTex('#6c6a66', ['#4d4b48', '#8a8782', '#5b5956'], 9) },
  ];
  const discM = new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6 });
  heaps.forEach((h, hi) => {
    const g = new THREE.Group(); g.position.set(h.x, 0, 0); pileG.add(g);
    const disc = mk(new THREE.CylinderGeometry(h.R + 3, h.R + 3.5, .6, 64), discM); disc.position.y = .3; g.add(disc);
    const cone = mk(new THREE.ConeGeometry(h.R * .96, h.H * .94, 56, 1, true), h.tex ? new THREE.MeshStandardMaterial({ map: h.tex, roughness: h.k === 'wmm' ? .65 : 1, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: h.base, roughness: 1, side: THREE.DoubleSide })); cone.position.y = .6 + h.H * .47; g.add(cone);
    const r = rng(40 + hi * 13), items = [];
    for (let i = 0; i < h.n; i++) { const u = r(), rr = h.R * Math.sqrt(r()) * .95, a = r() * 6.283, hh = h.H * (1 - Math.pow(rr / h.R, 1.18)), rad = h.size(u); items.push([Math.cos(a) * rr, .6 + Math.max(rad * .6, hh - r() * rad * 2.2), Math.sin(a) * rr, rad]); }
    /* photographic stones, each shape a different cleavage, tipped at random so no two show the same face; tone varies stone to stone */
    const per = h.geo.map(() => []); items.forEach(it => per[(r() * h.geo.length) | 0].push(it));
    const o = new THREE.Object3D(), tc = new THREE.Color(), rr2 = rng(900 + hi * 7);
    per.forEach((arr, gi) => {
      if (!arr.length) return; const im = new THREE.InstancedMesh(h.geo[gi], h.mat, arr.length);
      arr.forEach((it, i) => {
        o.position.set(it[0], it[1], it[2]); o.scale.set(it[3] * (.9 + rr2() * .25), it[3] * (.78 + rr2() * .3), it[3] * (.9 + rr2() * .25)); o.rotation.set(rr2() * 6.28, rr2() * 6.28, rr2() * 6.28); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
        const t = .78 + rr2() * .44, w = (rr2() - .5) * .08; tc.setRGB(t * h.hue[0] * (1 + w), t * h.hue[1], t * h.hue[2] * (1 - w)); im.setColorAt(i, tc);
      });
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; g.add(im);
    });
  });

  /* road section: subgrade, GSB, WMM, bituminous surface */
  const W = 64, DEP = 22, layersDef = [
    { id: 'sub', text: 'SUBGRADE', h: 7, tex: noiseTex(256, 256, '#8d5c3c', ['#6d432b', '#a9724c', '#59391f'], 12, 6000, 2.6), tone: 'std' },
    { id: 'gsb', text: 'GRANULAR SUB-BASE (GSB)', h: 5.2, tex: noiseTex(256, 256, '#a9a59d', ['#8d8981', '#c4bfb5', '#78746d', '#d7d2c8'], 3, 8000, 1.6), tone: 'std' },
    { id: 'wmm', text: 'WET MIX MACADAM (WMM)', h: 4.4, tex: noiseTex(256, 256, '#6c6a66', ['#4d4b48', '#8a8782', '#5b5956', '#9a9791'], 9, 8000, 1.4), tone: 'std' },
    { id: 'bit', text: 'BITUMINOUS SURFACING', h: 2.6, tex: noiseTex(256, 256, '#26272a', ['#1a1b1d', '#3a3b3f', '#2f3033'], 5, 3000, 1.2), tone: 'std' },
  ];
  const lay = layersDef.map(d => { d.tex.repeat.set(4, 1.5); const m = mk(new THREE.BoxGeometry(W, d.h, DEP), new THREE.MeshStandardMaterial({ map: d.tex, roughness: d.id === 'bit' ? .55 : 1 })); roadG.add(m); d.m = m; return d; });
  const tag = new THREE.Group(); tag.position.set(W / 2 + 14, 0, 4); roadG.add(tag); const rt = rng(5);
  const tdisc = mk(new THREE.CylinderGeometry(9, 9.4, .6, 48), discM); tdisc.position.y = .3; tag.add(tdisc);
  [[0, 0], [4, 3], [-4, 2.5], [1, -4], [3.6, -3.4], [-3, -3]].forEach(([x, z], i) => { const s = new THREE.Mesh(CRUSH[(rt() * CRUSH.length) | 0], mStone); s.castShadow = s.receiveShadow = true; s.scale.set(3.1 * (.92 + rt() * .2), 2.5 * (.9 + rt() * .2), 3.1 * (.92 + rt() * .2)); s.rotation.set(rt() * 6.28, rt() * 6.28, rt() * 6.28); s.position.set(x, .6 + 2.2, z); tag.add(s); });

  const views = { materials: { az: -10, el: 21, dist: 130, t: [0, 7, 0] }, section: { az: -30, el: 20, dist: 112, t: [10, 9, 0] } };
  const labels = [
    ...heaps.map(h => ({ id: h.k, text: h.text, tone: h.tone, side: 'r', anchor: new V3(h.x, h.H + 8, 0), show: s => s.view === 'materials' && pileG.scale.x > .97 })),
    ...layersDef.map((d, i) => ({ id: d.id, text: d.text, side: 'l', anchor: () => new V3(-W / 2 + 1, d.m.position.y, DEP / 2), show: s => s.view === 'section' && roadG.scale.x > .97 })),
    { id: 'tag', text: '60 mm FRACTION · NOT A PAVEMENT LAYER', tone: 'warn', side: 'r', anchor: new V3(W / 2 + 14, 9.6, 4), show: s => s.view === 'section' && roadG.scale.x > .97 },
  ];
  const cur = { ex: 0, sec: 0 };
  return {
    scene, views, fov: 30, labels, limits: { az: [-70, 70], el: [6, 56], dist: [30, 150] },
    update(t, dt, st) {
      const k = reduce() ? 1 : 1 - Math.exp(-dt * 5); const goalSec = st.view === 'section' ? 1 : 0; let moving = false;
      cur.sec += (goalSec - cur.sec) * k; if (Math.abs(goalSec - cur.sec) > .003) moving = true; else cur.sec = goalSec;
      cur.ex += ((st.explode || 0) - cur.ex) * k; if (Math.abs((st.explode || 0) - cur.ex) > .002) moving = true;
      /* one after the other, never together: the piles settle away first (first half), then the road section grows in (second half), so the two sets never overlap */
      const po = 1 - sm(cur.sec / .5), ro = sm((cur.sec - .5) / .5); pileG.visible = po > .004; roadG.visible = ro > .004; pileG.scale.setScalar(Math.max(po, .001)); roadG.scale.setScalar(Math.max(ro, .001));
      let y = 0; lay.forEach((d, i) => { d.m.position.y = y + d.h / 2 + cur.ex * i * 5.2; y += d.h; });
      return moving;
    },
  };
}
