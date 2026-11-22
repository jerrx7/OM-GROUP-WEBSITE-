/* scene: fine-aggregate grading, shown the way a sieve analysis shows it: seven trays, each holding what stays on one IS sieve (coarse to fine).
   The pile heights are drawn from the MIDDLE of each IS 383:2016 Table 9 range for the selected zone: a picture, not a sample.
   Grain size is compressed so the finest tray is still visible (the real size ratio is about 30 to 1). */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, moundItems, moundBase, dish, reduce, V3 } from '/assets/application-s3d-sand.js';
const { M, clamp, sm } = L;

/* percentage passing at 4.75, 2.36, 1.18, 600, 300, 150 micron: [min, max] per zone (IS 383:2016 Table 9, as printed on the page) */
export const ZONES = {
  I: [[90, 100], [60, 95], [30, 70], [15, 34], [5, 20], [0, 10]],
  II: [[90, 100], [75, 100], [55, 90], [35, 59], [8, 30], [0, 10]],
  III: [[90, 100], [85, 100], [75, 100], [60, 79], [12, 40], [0, 10]],
  IV: [[95, 100], [95, 100], [90, 100], [80, 100], [15, 50], [0, 15]],
  /* IS 1542:1992 Table 1 (plaster sand): P = the general limits, PC = the crushed stone / crushed gravel sand allowance (150 micron limit raised to 20) */
  P: [[95, 100], [95, 100], [90, 100], [80, 100], [20, 65], [0, 15]],
  PC: [[95, 100], [95, 100], [90, 100], [80, 100], [20, 65], [0, 20]],
};
const NAME = ['4.75 mm', '2.36 mm', '1.18 mm', '600 µm', '300 µm', '150 µm'];
export const retained = z => { const mid = ZONES[z].map(r => (r[0] + r[1]) / 2), out = [100 - mid[0]]; for (let i = 0; i < 5; i++) out.push(mid[i] - mid[i + 1]); out.push(mid[5]); return out; };
const GR = [.46, .34, .25, .18, .13, .09, .07];

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 22, key: 2.2, shadow: .2, map: 2048 });
  const mat = grainMat(), R0 = 2.35, STEP = 5.6, X0 = -STEP * 3;
  const bins = []; const zones = state.set === 'plaster' ? ['P', 'PC'] : ['I', 'II', 'III', 'IV'], pile = {};
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(); g.position.set(X0 + i * STEP, 0, 0); scene.add(g);
    const d = dish(R0 + .55, .5); g.add(d); bins.push(g);
  }
  zones.forEach((z, zi) => {
    const ret = retained(z); pile[z] = [];
    ret.forEach((pct, i) => {
      const g = new THREE.Group(); g.position.y = .35; bins[i].add(g); g.visible = false; pile[z].push(g);
      const H = Math.max(.12, pct * .125), r = rng(zi * 40 + i * 7 + 3), s = GR[i];
      const base = moundBase(R0 * .98, H * .94, [0x6c6a66, 0x6b6965, 0x6a6864, 0x696763, 0x686662, 0x676561, 0x666460][i]); g.add(base);
      const surf = Math.PI * R0 * R0 + H * R0 * 2, n = Math.min(2600, Math.round(surf * 3 / (s * s * 3.4)));
      inst(g, moundItems(n, R0 * .96, H, () => s * (.7 + r() * .6), r), grainGeos('ang', 'm'), mat, zi * 50 + i, i < 3);
    });
  });
  const views = { all: { az: -6, el: 26, dist: 50, t: [0, 3, 0] } };
  const labels = bins.map((b, i) => ({ id: 'b' + i, text: i === 6 ? 'Pan: passes 150 µm' : 'Retained on ' + NAME[i], side: 'r', tone: i === 6 ? 'std' : 'std', anchor: () => new V3(X0 + i * STEP, 5.2 + (i % 3) * 1.5, 0), show: () => true }));
  let cur = null, pulse = 0;
  const apply = (st, fig) => {
    const z = st.zone || 'II'; if (z === cur) return; cur = z; pulse = 1;
    zones.forEach(k => pile[k].forEach(g => { g.visible = k === z; }));
    const ret = retained(z); if (fig && fig.labs) fig.labs.forEach((l, i) => { const b = l.el.querySelector('b'); if (b) b.textContent = (i === 6 ? 'Pan' : NAME[i]) + ' · ≈' + Math.round(ret[i]) + '%'; l.w = 0; });
  };
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-50, 50], el: [10, 60], dist: [14, 90] },
    update(t, dt, st, fig) {
      apply(st, fig); let anim = false;
      if (pulse > 0) { pulse = Math.max(0, pulse - dt * 2.6); const k = 1 - Math.pow(pulse, 2) * .12; pile[cur].forEach(g => g.scale.set(1, k, 1)); anim = true; }
      return anim;
    },
    onSet(k, v) { },
  };
}
