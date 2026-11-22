/* scene: M-Sand grading, shown the way a sieve analysis shows it: seven enamel trays on a lab bench, each holding what stays on one IS sieve (4.75 mm, 2.36 mm, 1.18 mm, 600, 300, 150 micron, and the pan), coarse to fine.
   Each pile is poured at the natural angle of repose, so its SIZE follows the cube root of the retained share (the share is the MIDDLE of the selected zone's IS 383:2016 Table 9 range: a picture, not a sample).
   Grain size in each tray is the real size of that sieve fraction; the surface shader and the instanced fractured grains are the ones used by the M-Sand heap (application-s3d-msand.js), and the finest trays are
   shader only, as they are to the eye. Numbered markers on the trays, the key beside the figure. 1 unit = 1 mm. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { heapMat, grainMat, crushed, plant, mineral, sandOf } from '/assets/application-s3d-msand.js';
import { ZONES, retained } from '/assets/application-s3d-grading.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const NAME = ['4.75 mm', '2.36 mm', '1.18 mm', '600 µm', '300 µm', '150 µm'];
const D = [6.8, 3.5, 1.8, .95, .5, .26, .14];                   /* typical grain size of each fraction, mm */
const DUST = [.08, .1, .14, .2, .3, .4, .5];                    /* the finer the tray, the more rock dust on the grains */

export default function build({ state }) {
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 126, key: 2.5, shadow: .2, map: 4096, ground: false });
  key.shadow.bias = -.00006; key.shadow.normalBias = .02; key.shadow.camera.near = 150; key.shadow.camera.far = 520; key.shadow.camera.updateProjectionMatrix();
  const plaster = state.set === 'plaster', zones = plaster ? ['P', 'PC'] : ['I', 'II', 'III', 'IV'];
  const STEP = 38, RT = 16.2, RM = 14.4, POS = i => i < 4 ? [(i - 1.5) * STEP, -27] : [(i - 5) * STEP, 27];   /* two staggered rows: 1-4 behind, 5-7 in front */
  const SO = sandOf(state), river = SO.round, TT = SO.TT, T = c => TT ? [c[0] * TT[0], c[1] * TT[1], c[2] * TT[2]] : c;   /* river sand: worn grains in warm quartz and feldspar tones; the other sands carry their own tint */
  const gAng = river ? [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')).concat([0, 1, 2].map(i => crushed(700 + i * 19, 'round'))) : [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), gSmall = river ? [0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round')) : [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), gTiny = [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny'));
  const matG = grainMat(river ? { bump: .05, rough: .6 } : {});

  /* bench: pale speckled laminate */
  const bcv = document.createElement('canvas'); bcv.width = bcv.height = 512; { const g = bcv.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); } }
  const bt = new THREE.CanvasTexture(bcv); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(30, 10); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 8;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(520, 3, 360), new THREE.MeshStandardMaterial({ map: bt, roughness: .62, metalness: 0, envMapIntensity: .7 })); bench.position.set(0, -1.5, 0); bench.receiveShadow = true; scene.add(bench);

  /* trays: white enamel, a shallow wall with a rolled rim */
  const enamel = new THREE.MeshStandardMaterial({ color: 0xf1efea, roughness: .26, metalness: 0, envMapIntensity: .9 });
  const prof = [[0, .5], [RT - 1.2, .5], [RT - .4, 1.0], [RT, 3.0], [RT + .5, 3.9], [RT + 1.1, 3.9], [RT + 1.4, 3.4], [RT + 1.2, 2.8], [RT + .7, 3.0], [RT + .2, 1.2], [RT, 0]].map(p => new THREE.Vector2(p[0], p[1]));
  const trayG = new THREE.LatheGeometry(prof, 72);
  const bins = []; for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(trayG, enamel); t.castShadow = t.receiveShadow = true; t.position.set(POS(i)[0], 0, POS(i)[1]); scene.add(t); bins.push(t); }
  const floorY = .5;

  /* one pile: a polar surface (grain shader) + instanced grains for the coarser trays */
  const pileMax = Math.max(...zones.flatMap(z => retained(z)));
  const Rth = (th, seed) => 1 + .06 * Math.sin(3 * th + seed) + .04 * Math.sin(5 * th + 2 * seed);
  function mkPile(zi, i, pct) {
    const g = new THREE.Group(); g.position.set(POS(i)[0], floorY, POS(i)[1]); g.visible = false; scene.add(g);
    const r = rng(zi * 60 + i * 9 + 5), seed = zi * 7 + i, Rp = Math.max(3.2, RM * Math.cbrt(Math.max(pct, .6) / pileMax)), H = Rp * Math.tan(32 * Math.PI / 180) * .85, d = D[i];
    const hAt = (x, z) => { const th = Math.atan2(z, x), rr = Math.hypot(x, z) / (Rp * Rth(th, seed)); return rr >= 1 ? 0 : H * Math.pow(1 - Math.pow(rr, 1.55), 1.15); };
    const NR = 34, NS = 96, pos = new Float32Array((NR + 1) * (NS + 1) * 3), rad = new Float32Array((NR + 1) * (NS + 1)), idx = [];
    for (let a = 0; a <= NR; a++) for (let b = 0; b <= NS; b++) { const th = b / NS * TAU, rr = a / NR * Rp * Rth(th, seed) * 1.02, k = a * (NS + 1) + b, x = Math.cos(th) * rr, z = Math.sin(th) * rr; pos[k * 3] = x; pos[k * 3 + 1] = hAt(x, z) + .02; pos[k * 3 + 2] = z; rad[k] = a / NR; }
    for (let a = 0; a < NR; a++) for (let b = 0; b < NS; b++) { const p = a * (NS + 1) + b, q = p + 1, c = p + NS + 1, e = c + 1; idx.push(p, q, c, q, e, c); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('aRad', new THREE.BufferAttribute(rad, 1)); sg.setIndex(idx); sg.computeVertexNormals();
    const surf = new THREE.Mesh(sg, MATS[i]); surf.receiveShadow = true; surf.castShadow = true; g.add(surf);
    if (i <= 4) {                                                   /* real grains where they are big enough to see */
      const area = Math.PI * Rp * Rp * 1.25, per = Math.PI / 4 * (d * .8) * (d * .8), n = Math.min(i === 4 ? 4200 : 2600, Math.round(area / per * 1.7)), items = [];
      for (let k = 0; k < n; k++) { const th = r() * TAU, f = Math.sqrt(r()), rr = f * Rp * Rth(th, seed) * .97, x = Math.cos(th) * rr, z = Math.sin(th) * rr, s = d * (.7 + r() * .6) / 2.3; items.push({ x, y: hAt(x, z) + s * .2, z, s, c: T(mineral(r)), flat: .86 + r() * .2, jx: .92 + r() * .16, jz: .92 + r() * .16, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)) }); }
      plant(g, items, i <= 1 ? gAng : i <= 3 ? gSmall : gTiny, matG, seed + 3, i <= 3);
    }
    return { g, H };
  }
  const MATS = D.map((d, i) => heapMat(d * .42, d * 1.05, TT ? Math.min(.7, DUST[i] * SO.dust / .22) : DUST[i], TT || [1, 1, 1]));
  const piles = {}, built = {}; let cur = null, pulse = 0;
  const ensure = z => { if (built[z]) return; built[z] = 1; const zi = zones.indexOf(z), ret = retained(z); piles[z] = ret.map((pct, i) => mkPile(zi, i, pct)); };
  ensure(state.zone || zones[zones.length > 1 ? 1 : 0]);

  const views = { all: { az: -5, el: 37, dist: matchMedia('(max-width:640px)').matches ? 224 : 190, t: [0, 2, 2] } };
  const labels = bins.map((b, i) => ({ id: 'b' + i, text: i === 6 ? 'Pan: passes 150 µm' : 'Retained on ' + NAME[i], side: 'r', anchor: st => new V3(b.position.x, (piles[cur] ? piles[cur][i].H : 6) + 10, b.position.z), show: () => true }));
  const apply = (st, fig) => {
    const z = st.zone || 'II'; if (z === cur || !zones.includes(z)) return; ensure(z); cur = z; pulse = 1;
    zones.forEach(k => piles[k] && piles[k].forEach(p => { p.g.visible = k === z; }));
    const ret = retained(z); if (fig && fig.labs) fig.labs.forEach((l, i) => { const txt = (i === 6 ? 'Pan' : 'Retained on ' + NAME[i]) + ' · about ' + Math.round(ret[i]) + '%'; l.text = txt; const b = l.el.querySelector('b'); if (b) b.textContent = txt; const sp = fig.legend && fig.legend[i] && fig.legend[i].querySelector('span'); if (sp) sp.textContent = txt; l.w = 0; });
  };
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-55, 55], el: [10, 66], dist: [30, 330] },
    update(t, dt, st, fig) {
      apply(st, fig); let anim = false;
      if (pulse > 0) { pulse = Math.max(0, pulse - dt * 2.6); const k = 1 - Math.pow(pulse, 2) * .14; piles[cur].forEach(p => p.g.scale.set(1, k, 1)); anim = true; }
      return anim;
    },
  };
}
