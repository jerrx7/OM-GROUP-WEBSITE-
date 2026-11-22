/* scene: the five WMM aggregate fractions (40 mm, 20 mm, 10 mm, 6 mm, screenings) and the combined blend.
   Five bins hold crushed stone at their relative particle scale. "Blend" lifts a sample of each into a central chamber to show that no single fraction is the WMM:
   the combination, proportioned to a specified grading, is. No proportion is shown or implied; particle counts are not measured. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { reduceM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;

const FR = [
  { k: '40', t: '40 mm', r: 2.0, n: 46, h: 1 }, { k: '20', t: '20 mm', r: 1.05, n: 140, h: 1 }, { k: '10', t: '10 mm', r: .55, n: 420, h: 1 }, { k: '6', t: '6 mm', r: .34, n: 900, h: 1 }, { k: 'scr', t: 'SCREENINGS', r: .15, n: 2200, h: 1 },
];
export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 46, key: 2.2, shadow: .2, map: 2048 });
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 });
  const fineM = new THREE.MeshStandardMaterial({ color: 0xb9b6ae, vertexColors: true, roughness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide });
  const disc = new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6 });
  const X = [-30, -15, 0, 15, 30], groups = [], rings = [];
  FR.forEach((f, i) => {
    const g = new THREE.Group(); g.position.set(X[i], 0, 4); scene.add(g); groups.push(g);
    const d = mk(new THREE.CylinderGeometry(6.6, 7, .6, 48), disc); d.position.y = .3; g.add(d);
    const ring = mk(new THREE.TorusGeometry(6.9, .14, 8, 64), M.orange, { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.y = .62; ring.visible = false; g.add(ring); rings.push(ring);
    const r = rng(100 + i), items = []; const R = 5.4, Hh = 6.4;
    for (let j = 0; j < f.n; j++) { const rr = R * Math.sqrt(r()), a = r() * TAU, h = Hh * Math.pow(Math.max(0, 1 - (rr / R) ** 2), .85), s = f.r * (.8 + r() * .4); items.push([Math.cos(a) * rr, .6 + Math.max(s * .6, h - r() * s * 2.2), Math.sin(a) * rr, s]); }
    const cone = mk(new THREE.ConeGeometry(R * .97, Hh * .92, 40, 1, true), new THREE.MeshStandardMaterial({ color: f.k === 'scr' ? 0x7b7a78 : 0x2a2b2e, roughness: 1, side: THREE.DoubleSide })); cone.position.y = .6 + Hh * .46; g.add(cone);
    instStones(g, items, f.k === 'scr' ? fineM : stoneM, 60 + i, false);
  });
  /* the blending chamber, behind the row */
  const ch = new THREE.Group(); ch.position.set(0, 0, -18); scene.add(ch);
  const base = mk(new THREE.CylinderGeometry(9, 9.5, .6, 56), disc); base.position.y = .3; ch.add(base);
  const wall = mk(new THREE.CylinderGeometry(8.6, 8.6, 8, 56, 1, true), glass, { cast: false }); wall.position.y = 4.6; ch.add(wall);
  const rim = mk(new THREE.TorusGeometry(8.6, .12, 8, 64), M.steelS, { cast: false }); rim.rotation.x = Math.PI / 2; rim.position.y = 8.6; ch.add(rim);
  /* blend particles: sizes drawn from all five classes; each starts on its own heap and ends in the chamber */
  const geoms = L.STONES, rr = rng(7), NB = 520, parts = [];
  const mesh = new THREE.InstancedMesh(geoms[1], stoneM, NB); mesh.frustumCulled = false; scene.add(mesh);
  for (let i = 0; i < NB; i++) { const u = rr(), ci = u < .06 ? 0 : u < .16 ? 1 : u < .34 ? 2 : u < .6 ? 3 : 4, f = FR[ci], a = rr() * TAU, r0 = 3.6 * Math.sqrt(rr()); const s = f.r * (.8 + rr() * .4);
    const a2 = rr() * TAU, r2 = 6.6 * Math.sqrt(rr()); parts.push({ s, ci, x0: X[ci] + Math.cos(a) * r0, y0: 1.2 + (1 - r0 / 3.6) * 4, z0: 4 + Math.sin(a) * r0, x1: Math.cos(a2) * r2, y1: .8 + s + rr() * 4.8 * (1 - r2 / 7), z1: -18 + Math.sin(a2) * r2, d: rr() * .5, rot: [rr() * 6, rr() * 6, rr() * 6] }); }
  const o = new THREE.Object3D();
  const views = { all: { az: -6, el: 17, dist: 88, t: [0, 4, -6] }, blend: { az: -10, el: 22, dist: 64, t: [0, 5, -14] }, one: { az: -8, el: 18, dist: 60, t: [0, 4, 4] } };
  const labels = FR.map((f, i) => ({ id: f.k, text: f.t, side: 'r', tone: '', anchor: new V3(X[i], i % 2 ? 14.6 : 11.2, 4), show: st => st.view !== 'blend' })).concat([{ id: 'b', text: 'Combined blend: not one fraction alone', side: 'r', tone: 'hot', anchor: new V3(0, 11.5, -18), show: st => (st.blend || 0) > .5 || st.view === 'blend' }]);
  const cur = { b: 0, sel: -1 }; const seekTo = () => { cur.b = 1e9; };
  return {
    scene, views, fov: 30, wide: true, labels, seek: seekTo, limits: { az: [-40, 40], el: [5, 50], dist: [30, 140] },
    update(t, dt, st) {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 3); let moving = false; const goal = st.blend == null ? 0 : st.blend; if (cur.b > 1e8) cur.b = goal; cur.b += (goal - cur.b) * k; if (Math.abs(goal - cur.b) > .002) moving = true; else cur.b = goal;
      const sel = FR.findIndex(f => f.k === st.sel); rings.forEach((r, i) => { r.visible = sel === i; });
      parts.forEach((p, i) => { const e = sm(clamp((cur.b - p.d * .5) / .5)); o.position.set(lerp(p.x0, p.x1, e), lerp(p.y0, p.y1, e) + Math.sin(e * Math.PI) * 9, lerp(p.z0, p.z1, e)); o.scale.setScalar(p.s * (e > 0 ? 1 : .001)); o.rotation.set(...p.rot); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); }); mesh.instanceMatrix.needsUpdate = true;
      return moving;
    },
  };
}
