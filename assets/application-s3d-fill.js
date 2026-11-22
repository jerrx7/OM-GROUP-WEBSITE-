/* scene: building an engineered stone fill in lifts: ground preparation, delivery, placement and spreading, compaction, completed formation (1 unit = 1 m).
   A general sequence only. It does not describe a specific specification, layer thickness, compaction method or OM GROUP project. */
import { THREE, L, studio, rng, noiseTex, instStones } from '/assets/application-s3d.js';
const { M, mk, clamp, sm, lerp, eio } = L;
const V3 = THREE.Vector3;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEP_AT = [0, 3, 8, 13, 17.2], END = 21;

export default function build({ fig }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 34, key: 2.1, shadow: .24, map: 2048 });
  const soilTex = noiseTex(512, 512, '#8d5c3c', ['#6d432b', '#a9724c', '#59391f', '#c58d5f'], 31, 9000, 3); soilTex.repeat.set(6, 1);
  const stoneTex = noiseTex(512, 512, '#6f6e6b', ['#4f4e4c', '#8d8b87', '#3f3e3c', '#a3a19c'], 17, 9000, 2.2); stoneTex.repeat.set(8, 1);
  const LEN = 52, ground = mk(new THREE.BoxGeometry(LEN + 8, 3, 18), new THREE.MeshStandardMaterial({ map: soilTex, roughness: 1 })); ground.position.set(0, -1.5, 0); scene.add(ground);
  /* setting-out pegs and a string line: what the first step shows */
  const pegM = new THREE.MeshStandardMaterial({ color: 0xf6f3ed, roughness: .6 });
  for (let i = -3; i <= 3; i++) for (const z of [-6.8, 6.8]) { const p = mk(new THREE.CylinderGeometry(.07, .07, 1.5, 8), pegM); p.position.set(i * 8, .75, z); scene.add(p); const f = mk(new THREE.BoxGeometry(.5, .3, .04), M.orange); f.position.set(i * 8 + .25, 1.3, z); scene.add(f); }
  for (const z of [-6.8, 6.8]) { const ln = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 48, 4), new THREE.MeshBasicMaterial({ color: 0xff5e29 })); ln.rotation.z = Math.PI / 2; ln.position.set(0, 1.2, z); scene.add(ln); }
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .95 }), LH = 1.4;
  const lifts = [0, 1, 2].map(i => {
    const wb = 12.5 - i * 2.6, wt = wb - 1.9, s = new THREE.Shape(); s.moveTo(-wb / 2, 0); s.lineTo(wb / 2, 0); s.lineTo(wt / 2, LH); s.lineTo(-wt / 2, LH); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: LEN, bevelEnabled: false }); g.translate(0, 0, -LEN / 2); g.rotateY(Math.PI / 2);
    const m = mk(g, stoneM); m.position.y = i * LH; scene.add(m); return m;
  });
  const r = rng(12);
  const surf = [0, 1, 2].map(i => { const g = new THREE.Group(), it = [], wt = 12.5 - i * 2.6 - 1.9; for (let n = 0; n < 300; n++) it.push([(r() - .5) * LEN, (i + 1) * LH + .04, (r() - .5) * (wt - .4), .12 + r() * .1]); instStones(g, it, M.stone, 60 + i, false); scene.add(g); g.visible = false; return g; });
  const heap = new THREE.Group(); scene.add(heap); heap.visible = false;
  { const it = []; for (let n = 0; n < 200; n++) { const a = r() * 6.28, rr = 2.1 * Math.sqrt(r()), h = 1.8 * (1 - rr / 2.1); it.push([Math.cos(a) * rr, Math.max(.12, h - r() * .2), Math.sin(a) * rr, .13 + r() * .1]); } instStones(heap, it, M.stone, 70, true); }
  const white = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: .5, metalness: .1 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .6, metalness: .4 }), org = M.orange, glass = new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: .15, metalness: .6 });
  const tb = (w, h, d, m, x, y, z, p) => { const o = mk(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
  const truck = new THREE.Group(); scene.add(truck); truck.visible = false;
  tb(9, .5, 2.7, dark, 0, 1.1, 0, truck); tb(2.5, 2.1, 2.6, white, 3.4, 2.35, 0, truck); tb(.1, 1, 2.2, glass, 4.68, 2.75, 0, truck); tb(2.6, .35, 2.7, org, 3.4, 1.25, 0, truck);
  [-3.2, -1.6, 2.8].forEach(x => [-1.3, 1.3].forEach(z => { const w = mk(new THREE.CylinderGeometry(.85, .85, .55, 28), dark); w.rotation.x = Math.PI / 2; w.position.set(x, .85, z); truck.add(w); }));
  const bed = new THREE.Group(); bed.position.set(-4.3, 1.35, 0); truck.add(bed);
  tb(7, .2, 2.9, white, 3.5, 0, 0, bed); tb(7, 1.5, .2, white, 3.5, .75, 1.45, bed); tb(7, 1.5, .2, white, 3.5, .75, -1.45, bed); tb(.2, 1.7, 2.9, white, 0, .85, 0, bed); tb(.2, 1.1, 2.9, white, 7, .55, 0, bed); tb(7, .22, .24, org, 3.5, 1.5, 1.45, bed); tb(7, .22, .24, org, 3.5, 1.5, -1.45, bed);
  const load = new THREE.Group(); load.position.set(3.4, .2, 0); bed.add(load); { const it = []; for (let n = 0; n < 160; n++) it.push([(r() - .5) * 6, .2 + r() * .85, (r() - .5) * 2.5, .14 + r() * .1]); instStones(load, it, M.stone, 80, false); }
  const roller = new THREE.Group(); scene.add(roller); roller.visible = false;
  tb(4.2, 1.6, 2.4, org, 0, 1.55, 0, roller); tb(1.8, 1.6, 2.2, white, -.9, 2.9, 0, roller); tb(.1, .9, 1.9, glass, .02, 2.95, 0, roller);
  [-1.9, 1.9].forEach(x => { const d = mk(new THREE.CylinderGeometry(1.1, 1.1, 2.7, 32), dark); d.rotation.x = Math.PI / 2; d.position.set(x, 1.1, 0); roller.add(d); });

  let T = reduce() ? END - .5 : 0, internal = false, lastStep = 0;
  const stepOf = t => t >= STEP_AT[4] ? 5 : t >= STEP_AT[3] ? 4 : t >= STEP_AT[2] ? 3 : t >= STEP_AT[1] ? 2 : 1;
  const views = { close: { az: -18, el: 16, dist: 44, t: [-3, 2.4, 0] }, wide: { az: -32, el: 30, dist: 70, t: [0, 2.2, 0] } };
  const labels = [
    { id: 'ground', text: 'PREPARED GROUND', side: 'l', anchor: new V3(-14, -.2, 9), show: () => true },
    { id: 'truck', text: 'MATERIAL DELIVERY', side: 'r', anchor: () => new V3(truck.position.x, 5, 0), show: () => truck.visible },
    { id: 'lift', text: 'PLACED AND SPREAD LIFT', side: 'r', anchor: new V3(-12, 1.9, 5.4), show: () => T > 13.2 },
    { id: 'roll', text: 'COMPACTION BY SUITABLE PLANT', side: 'r', anchor: () => new V3(roller.position.x, 4.4, 0), show: () => roller.visible },
    { id: 'done', text: 'COMPLETED FORMATION · BUILT IN LIFTS', side: 'r', anchor: new V3(-14, 5.6, 4.6), show: () => T > STEP_AT[4] + 1.2 },
  ];
  return {
    scene, views, fov: 30, labels, limits: { az: [-65, 65], el: [6, 58], dist: [16, 100] },
    seek(v) { T = v; },
    onSet(k, v, st) {
      if (k === 'step' && !internal) { T = STEP_AT[clamp(v - 1, 0, 4)] + .02; lastStep = v; st.play = true; fig.set('view', v >= 5 ? 'wide' : 'close'); }
      if (k === 'play' && v && T >= END) T = 0;
    },
    update(t, dt, st) {
      if (st.play !== false && !reduce()) T = Math.min(END, T + dt);
      const s = stepOf(T); if (s !== lastStep) { lastStep = s; internal = true; fig.set('step', s); internal = false; fig.set('view', s >= 5 ? 'wide' : 'close'); }
      const l0 = T < 9.4 ? 0 : sm(clamp((T - 9.4) / 3.6)), l1 = sm(clamp((T - STEP_AT[4] - .2) / 1.6)), l2 = sm(clamp((T - STEP_AT[4] - 1.6) / 1.6));
      lifts[0].scale.y = Math.max(.001, l0); lifts[1].scale.y = Math.max(.001, l1); lifts[2].scale.y = Math.max(.001, l2);
      lifts[0].visible = l0 > .004; lifts[1].visible = l1 > .004; lifts[2].visible = l2 > .004; surf[0].visible = l0 > .985; surf[1].visible = l1 > .985; surf[2].visible = l2 > .985;
      /* truck: arrives 3-8, tips 8-11, leaves 11.2-14.2 */
      const tx = T < STEP_AT[2] ? lerp(-36, -4.5, eio(clamp((T - STEP_AT[1]) / (STEP_AT[2] - STEP_AT[1])))) : T < 11.2 ? -4.5 : lerp(-4.5, -36, eio(clamp((T - 11.2) / 3)));
      truck.position.set(tx, LH * l0, 0); truck.visible = T > STEP_AT[1] - .1 && T < 14.4;
      const tip = sm(clamp((T - 8.2) / 1.6)) * (1 - sm(clamp((T - 10.6) / 1.4))); bed.rotation.z = tip * .72; load.scale.setScalar(Math.max(.001, 1 - sm(clamp((T - 8.6) / 2.2))));
      const sp = sm(clamp((T - 9.4) / 3.6)); heap.visible = T > 8.9 && sp < .99; heap.position.set(-10.6, LH * l0, 0); heap.scale.set(1 + sp * 2.2, Math.max(.02, (1 - sp * .97) * sm(clamp((T - 8.7) / .7))), 1 + sp * 1.1);
      const rp = (T - 13.6) / 3.6; roller.visible = T > 13.4 && T < STEP_AT[4] + .8; roller.position.set(13 * Math.sin(clamp(rp, 0, 1.2) * 5.4 - .2), LH * l0, 0);
      return st.play !== false && !reduce() && T < END;
    },
  };
}
