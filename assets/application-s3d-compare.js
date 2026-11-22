/* scene: 40 mm / 60 mm / 63 mm / large mass-concrete class / construction boulders, side by side on one measured bench (1 unit = 1 cm). */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
const { M, mk, put, stone, canvasTex, clamp, sm, TAU } = L;
const V3 = THREE.Vector3;

/* groups: key, label, x on the bench, stone radius range (cm), count, nominal bracket [lo,hi] (mm), tone */
const G = [
  { k: '40', text: '40 mm · standard', x: -26, r: [1.7, 2.1], n: 9, br: [40, 40], tone: 'std', ring: 9 },
  { k: '60', text: '60 mm · commercial grade', x: -7, r: [2.5, 3.1], n: 9, br: [60, 60], tone: 'com', ring: 10.5 },
  { k: '63', text: '63 mm · standard', x: 12, r: [2.7, 3.2], n: 9, br: [63, 63], tone: 'std', ring: 10.5 },
  { k: 'mass', text: '80–40 mm · mass-concrete class', x: 32, r: [2, 4.1], n: 8, br: [40, 80], tone: 'std', ring: 11.5 },
  { k: 'boulder', text: 'Boulders · project-defined size', x: 62, r: [7.5, 10], n: 4, br: null, tone: 'bld', ring: 20 },
];

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 70, shadow: .26, map: 3072 });
  const CG = realStones('crush'), BG = realStones('boulder'), TINT = { std: 1, com: .92, bld: .66 }; scene.position.y = 0;
  /* bench: measured grid that fades out */
  const grid = canvasTex(1024, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h); const g = x.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * .5); x.save(); x.translate(w / 2, h / 2); x.scale(1, h / w); x.translate(-w / 2, -w / 2); const gg = x.createRadialGradient(w / 2, w / 2, w * .05, w / 2, w / 2, w * .5); gg.addColorStop(0, 'rgba(246,243,238,.55)'); gg.addColorStop(.6, 'rgba(246,243,238,.32)'); gg.addColorStop(1, 'rgba(246,243,238,0)'); x.fillStyle = gg; x.fillRect(0, 0, w, w); x.restore();
    x.globalCompositeOperation = 'source-atop'; for (let i = 0; i <= 80; i++) { x.strokeStyle = i % 10 === 0 ? 'rgba(20,20,22,.2)' : 'rgba(20,20,22,.07)'; x.lineWidth = i % 10 === 0 ? 2 : 1; const px = i * w / 80; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke(); } for (let j = 0; j <= 40; j++) { x.strokeStyle = j % 10 === 0 ? 'rgba(20,20,22,.2)' : 'rgba(20,20,22,.07)'; x.lineWidth = j % 10 === 0 ? 2 : 1; const py = j * h / 40; x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke(); }
  }, true); grid.wrapS = grid.wrapT = THREE.ClampToEdgeWrapping;
  const bench = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), new THREE.MeshBasicMaterial({ map: grid, transparent: true, depthWrite: false })); bench.rotation.x = -Math.PI / 2; bench.position.set(24, -.02, 4); scene.add(bench);
  const ringM = new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6, metalness: 0 }), ringHot = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .22 });
  const barM = new THREE.MeshBasicMaterial({ color: 0x8d8d92 }), barHot = new THREE.MeshBasicMaterial({ color: 0xff5e29 });
  const groups = {}, labels = [];
  G.forEach((g, gi) => {
    const grp = new THREE.Group(); grp.position.set(g.x, 0, 0); scene.add(grp); const turn = new THREE.Group(); grp.add(turn);
    const disc = mk(new THREE.CylinderGeometry(g.ring, g.ring + .5, .5, 64), ringM); disc.position.y = .25; grp.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(g.ring + .15, .13, 8, 80), ringHot); rim.rotation.x = Math.PI / 2; rim.position.y = .52; grp.add(rim);
    const r = rng(300 + gi * 17); let top = 0;
    const lay = g.k === 'boulder' ? [[-2, 1], [8, 7], [-9, -6], [4, -9]] : null;
    for (let i = 0; i < g.n; i++) {
      const rad = g.r[0] + (g.r[1] - g.r[0]) * r(); let px, pz, py;
      if (lay) { [px, pz] = lay[i]; py = .5 + rad * .78 + (i === 3 ? 6 : 0); }
      else { const ring = i < 5 ? 1 : i < 8 ? 0.55 : 0, a = i * 2.4 + r() * .6; px = Math.cos(a) * g.ring * .5 * ring + (r() - .5); pz = Math.sin(a) * g.ring * .5 * ring + (r() - .5); py = .5 + rad * .8 + (i < 5 ? 0 : i < 8 ? rad * 1.2 : rad * 2.35); }
      const gs = g.k === 'boulder' ? BG : CG, s = new THREE.Mesh(gs[(r() * gs.length) | 0], realStoneMaterial(TINT[g.tone] || 1)); s.castShadow = s.receiveShadow = true;
      s.scale.set(rad * (.9 + r() * .25), rad * (.78 + r() * .3), rad * (.9 + r() * .25)); s.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28); s.position.set(px, py, pz); turn.add(s); top = Math.max(top, py + rad);
    }
    /* nominal-size bracket */
    const br = new THREE.Group(); br.position.set(0, top + 2.4 + (g.k === 'boulder' ? 6 : 0), g.k === 'boulder' ? 0 : 0); grp.add(br);
    if (g.br) {
      const lo = g.br[0] / 10, hi = g.br[1] / 10, w = g.br[0] === g.br[1] ? lo : hi, dashed = g.k === '60';
      const bm = barM.clone(); br.userData.mat = bm;
      const bar = (a, b) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, .16, .16), bm); m.position.set((a + b) / 2, 0, 0); br.add(m); };
      if (dashed) { const n = 7, st = w / n; for (let i = 0; i < n; i++) bar(-w / 2 + i * st + st * .08, -w / 2 + (i + 1) * st - st * .08); } else bar(-w / 2, w / 2);
      [-w / 2, w / 2].forEach(x => { const t = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.1, .16), bm); t.position.set(x, -.55, 0); br.add(t); });
      if (g.k === 'mass') { const m = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.1, .16), bm); m.position.set(-w / 2 + lo, -.55, 0); br.add(m); }
    }
    groups[g.k] = { grp, turn, disc, rim, br, top, g };
    labels.push({ id: g.k, text: g.text, tone: g.tone, side: 'r', anchor: new V3(g.x, top + 5.2 + (g.k === 'boulder' ? 5 : 0) + (gi % 2 ? 4.5 : 0), 0), show: (st) => st.view === 'all' || st.view === g.k });
  });
  /* floor ruler: 100 mm with ticks, in front of the 40/60/63 groups */
  const ruler = new THREE.Group(); ruler.position.set(-7, .04, 17);
  const rb = new THREE.Mesh(new THREE.BoxGeometry(30, .06, 1.7), new THREE.MeshStandardMaterial({ color: 0xf6f3ed, roughness: .5 })); ruler.add(rb);
  for (let i = 0; i <= 30; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(.2, .1, i % 10 === 0 ? 1.3 : i % 5 === 0 ? .95 : .6), new THREE.MeshBasicMaterial({ color: i % 10 === 0 ? 0xff5e29 : 0x55565a })); t.position.set(-15 + i, .06, 0); ruler.add(t); }
  scene.add(ruler); labels.push({ id: 'ruler', text: 'Scale: 30 cm ruler', tone: 'std', side: 'r', anchor: new V3(6, .4, 17.6), show: (st) => st.view === 'all' });

  const views = {
    all: { az: -8, el: 27, dist: 160, t: [20, 3, 3] },
    '40': { az: -14, el: 22, dist: 50, t: [-26, 6, 0] }, '60': { az: -14, el: 22, dist: 58, t: [-7, 6.5, 0] }, '63': { az: -14, el: 22, dist: 58, t: [12, 6.5, 0] },
    mass: { az: -14, el: 22, dist: 66, t: [32, 6.5, 0] }, boulder: { az: -14, el: 22, dist: 96, t: [62, 12, 0] },
  };
  const hot = new THREE.Color(0xff5e29), grey = new THREE.Color(0x8d8d92);
  return {
    scene, views, fov: 30, limits: { az: [-55, 55], el: [8, 55], dist: [18, 200] }, labels,
    update(t, dt, st) {
      let anim = false; Object.values(groups).forEach(o => {
        const sel = st.view === o.g.k, hl = sel || st.view === 'all' && false;
        o.rim.material = sel ? ringHot : ringM; o.rim.visible = true; if (o.br.userData.mat) o.br.userData.mat.color.copy(sel || st.view === 'all' ? hot : grey);
        if (sel && !reduce()) { o.turn.rotation.y += dt * .35; anim = true; }
      });
      return anim;
    },
  };
}
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
