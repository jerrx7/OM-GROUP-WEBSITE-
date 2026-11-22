/* scene: drainage trench cut-away (1 unit = 10 cm). Soil, filter fabric, large crushed stone, perforated pipe, water and soil fines.
   Two conditions: a filter layer that retains the surrounding soil, and an arrangement with no filter, where fines move into the voids.
   No permeability, flow rate, grading or design value is shown or implied. */
import { THREE, L, studio, rng, noiseTex } from '/assets/application-s3d.js';
import { ss, loopEnv } from '/assets/application-s3d-flow.js';
const { M, mk, put, stone, clamp, sm, eio, lerp, canvasTex, TAU } = L;
const V3 = THREE.Vector3;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const W = 4.2, D = 3.6, LEN = 5.2, PR = .52, PY = PR + .08;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 9, key: 2.2, shadow: .2, y: -1.15 });
  const soilTex = noiseTex(512, 512, '#8d5c3c', ['#6d432b', '#a9724c', '#59391f', '#c58d5f', '#7a4d33'], 11, 9000, 3); soilTex.repeat.set(2, 2);
  const soilM = new THREE.MeshStandardMaterial({ map: soilTex, roughness: 1, metalness: 0 });
  const soilTop = new THREE.MeshStandardMaterial({ map: soilTex, roughness: 1, color: 0xd9c4ae });
  const fabTex = noiseTex(256, 256, '#f3f1ec', ['#d9d5cb', '#ffffff', '#e6e2d8', '#cfcac0'], 5, 4200, 1.3); fabTex.repeat.set(3, 3);
  const fabM = new THREE.MeshStandardMaterial({ map: fabTex, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: .97 });

  /* soil: left, right, bottom — each its own group so the exploded view can pull them apart */
  const soilL = new THREE.Group(), soilR = new THREE.Group(), soilB = new THREE.Group(); scene.add(soilL, soilR, soilB);
  const sbox = (g, x0, x1, y0, y1, z) => { const m = mk(new THREE.BoxGeometry(x1 - x0, y1 - y0, z), [soilM, soilM, soilTop, soilM, soilM, soilM]); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); g.add(m); return m; };
  sbox(soilL, -6.4, -W / 2, -1.1, D, LEN + .5); sbox(soilR, W / 2, 6.4, -1.1, D, LEN + .5); sbox(soilB, -W / 2, W / 2, -1.1, 0, LEN + .5);
  /* filter fabric: a U of thin sheets just inside the soil */
  const fab = new THREE.Group(); scene.add(fab); const fo = .04;
  [[-W / 2 + fo, D / 2, 0, .02, D, LEN + .3], [W / 2 - fo, D / 2, 0, .02, D, LEN + .3], [0, fo, 0, W - .06, .02, LEN + .3]].forEach(([x, y, z, w, h, d]) => { const m = mk(new THREE.BoxGeometry(w, h, d), fabM, { cast: false }); m.position.set(x, y, z); fab.add(m); });

  /* large crushed stone: packed in layers around the pipe */
  const stones = new THREE.Group(); scene.add(stones); const r = rng(61), sp = [];
  for (let ly = 0; ly < 7; ly++) for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 9; iz++) {
    const rad = .27 + r() * .11, x = -W / 2 + .5 + ix * (W - 1) / 5 + (r() - .5) * .22 + (ly % 2 ? .18 : 0), z = -LEN / 2 + .4 + iz * (LEN - .8) / 8 + (r() - .5) * .22 + (ly % 2 ? .16 : 0), y = .34 + ly * .5 + (r() - .5) * .08;
    if (Math.hypot(x, y - PY) < PR + rad * .8) continue; if (y > D - .2) continue; if (Math.abs(x) > W / 2 - .3) continue;
    const s = stone(r, rad); s.position.set(x, y, z); stones.add(s); sp.push([x, y, z, rad]);
  }
  /* perforated pipe: the holes are in an alpha map, the dark liner shows through them */
  const holes = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.beginPath(); x.ellipse((i + .5) * w / 8, (j + .5) * h / 8, 9, 9, 0, 0, TAU); x.fill(); } });
  holes.repeat.set(3, 6);
  const pipeM = new THREE.MeshPhysicalMaterial({ color: 0xf1f2f4, roughness: .42, clearcoat: .5, clearcoatRoughness: .3, alphaMap: holes, alphaTest: .5, side: THREE.DoubleSide });
  const pipe = new THREE.Group(); scene.add(pipe);
  const tube = mk(new THREE.CylinderGeometry(PR, PR, LEN + 1.2, 48, 1, true), pipeM); tube.rotation.x = Math.PI / 2; pipe.add(tube);
  const liner = mk(new THREE.CylinderGeometry(PR - .03, PR - .03, LEN + 1.2, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: .9, side: THREE.BackSide }), { cast: false }); liner.rotation.x = Math.PI / 2; pipe.add(liner);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(PR, .035, 10, 48), new THREE.MeshStandardMaterial({ color: 0xe3e4e7, roughness: .4 })); ring.position.z = LEN / 2 + .6; pipe.add(ring);
  pipe.position.set(0, PY, 0);
  const flowM = new THREE.MeshPhysicalMaterial({ color: 0x5db7e6, roughness: .05, transparent: true, opacity: .62, depthWrite: false });
  const flow = new THREE.Mesh(new THREE.BoxGeometry(.62, .1, LEN + 1.15), flowM); flow.position.set(0, PY - PR + .09, 0); scene.add(flow);

  /* water droplets and soil fines */
  const NW = 150, NF = 260;
  const dropGeo = new THREE.SphereGeometry(.075, 10, 8), dropM = new THREE.MeshPhysicalMaterial({ color: 0x4fb2e8, roughness: .05, transparent: true, opacity: .8, emissive: 0x1d6f9c, emissiveIntensity: .35 });
  const drops = new THREE.InstancedMesh(dropGeo, dropM, NW); drops.frustumCulled = false; scene.add(drops);
  const fineGeo = new THREE.IcosahedronGeometry(.075, 0), fineM = new THREE.MeshStandardMaterial({ color: 0x9a6a43, roughness: 1 });
  const fines = new THREE.InstancedMesh(fineGeo, fineM, NF); fines.frustumCulled = false; scene.add(fines);
  const rd = rng(7), dp = Array.from({ length: NW }, (_, i) => ({ x: (rd() - .5) * (W - .8), z: (rd() - .5) * (LEN - .6), P: 4.6 + rd() * 2.6, o: rd() * 9, side: rd() < .3 ? (rd() < .5 ? -1 : 1) : 0, fr: rd() }));
  const fp = Array.from({ length: NF }, (_, i) => ({ side: rd() < .5 ? -1 : 1, y: .3 + rd() * (D - .5), z: (rd() - .5) * (LEN - .5), P: 6 + rd() * 4, o: rd() * 10, ex: (rd() - .5) * 2.4, ey: .25 + rd() * 1.9, fr: rd() }));
  const o3 = new THREE.Object3D(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  const cur = { explode: 0, clog: 0, fabric: 1 }; const vis = { soil: 1, filter: 1, stone: 1, pipe: 1, water: 1, fines: 1 };
  const offs = { soil: 0, stone: 0, fab: 0 };
  const views = {
    overview: { az: -26, el: 22, dist: 16, t: [0, 1.5, 0] },
    voids: { az: -12, el: 9, dist: 5.4, t: [.25, 1.7, 2.1] },
    exploded: { az: -30, el: 20, dist: 27, t: [0, 2.2, 0] },
  };
  const labels = [
    { id: 'agg', text: 'DRAINAGE AGGREGATE', side: 'r', anchor: () => new V3(1.0, 3.05 + cur.explode * 2.9, 2.5), show: (s) => s.layer_stone !== false },
    { id: 'filter', text: 'FILTER LAYER', side: 'l', anchor: () => new V3(-W / 2 + .05, 2.9 + cur.explode * 1.6, 2.55), show: (s) => s.filter === 'proper' && s.layer_filter !== false },
    { id: 'soil', text: 'SURROUNDING SOIL', side: 'l', anchor: () => new V3(-3.7 - cur.explode * 2.9, 1.9, 2.8), show: (s) => s.layer_soil !== false },
    { id: 'pipe', text: 'PERFORATED PIPE', side: 'r', anchor: () => new V3(.2, PY + .1, LEN / 2 + .7), show: (s) => s.layer_pipe !== false },
    { id: 'water', text: 'WATER MOVEMENT', side: 'r', anchor: () => new V3(.9, 3.45 + cur.explode * 2.6, 0), show: (s) => s.layer_water !== false && cur.explode < .3 },
    { id: 'fines', text: 'SOIL FINES', side: 'r', tone: 'warn', anchor: () => new V3(2.35, 1.0, 2.75), show: (s) => s.layer_fines !== false && cur.explode < .3 },
  ];
  let tClog = 0;
  function frame(t, dt, st) {
    const none = st.filter === 'none'; const easing = (a, b, k) => a + (b - a) * (1 - Math.exp(-dt * k));
    cur.explode = easing(cur.explode, st.explode || 0, 4); if (Math.abs(cur.explode - (st.explode || 0)) < .002) cur.explode = st.explode || 0;
    tClog = none ? Math.min(1, tClog + dt / 9) : Math.max(0, tClog - dt / 2.4); cur.clog = reduce() ? (none ? .8 : 0) : tClog;
    cur.fabric = easing(cur.fabric, none ? 0 : 1, 5);
    const E = cur.explode, eo = sm(E);
    soilL.position.x = -2.9 * eo; soilR.position.x = 2.9 * eo; soilB.position.y = -1.6 * eo; fab.position.y = 1.5 * eo; stones.position.y = 2.9 * eo;
    soilL.visible = soilR.visible = soilB.visible = st.layer_soil !== false; fab.visible = st.layer_filter !== false && cur.fabric > .02; fab.scale.setScalar(1);
    fabM.opacity = .97 * clamp(cur.fabric * 1.4); stones.visible = st.layer_stone !== false; pipe.visible = flow.visible = st.layer_pipe !== false; flow.position.y = PY - PR + .09;
    flow.scale.set(1, 1 + (1 - cur.clog) * .6, 1); flowM.opacity = .62 * (1 - cur.clog * .72);
    const showW = st.layer_water !== false && E < .35, showF = st.layer_fines !== false && E < .35;
    const T = reduce() ? 3.4 : t;
    /* water */
    for (let i = 0; i < NW; i++) {
      if (!showW) { drops.setMatrixAt(i, ZERO); continue; }
      const p = dp[i], u = ((T + p.o) / p.P) % 1, stall = lerp(PY + .35, D * .86, cur.clog * (p.fr < .8 ? p.fr / .8 : 1));
      let x, y, z; const yTop = D + .35, yP = PY + .55;
      if (u < .74) {
        const k = u / .74, ek = k * k * (3 - 2 * k) * .5 + k * .5;
        const x0 = p.side ? p.side * (W / 2 + .5) : p.x; x = lerp(x0, p.x * .55, p.side ? sm(Math.min(1, k * 2.4)) : 0) + Math.sin(k * 16 + i) * .22 * (1 - k * .5); z = p.z + Math.cos(k * 13 + i * 1.7) * .2;
        y = p.side ? lerp(D * (.3 + p.fr * .55), yP, ek) : lerp(yTop, yP, ek);
        if (none && cur.clog > .02) { y = Math.max(y, stall + Math.sin(T * 3 + i) * .03 * cur.clog); if (y <= stall + .02 && cur.clog > .3) { x += Math.sin(T * 2 + i) * .05; } }
      } else { const k = (u - .74) / .26; x = 0; y = PY - PR + .15; z = lerp(p.z, LEN / 2 + .7, k * k * .5 + k * .5); if (none && cur.clog > .5 && p.fr < cur.clog * .8) { y = -9; } }
      o3.position.set(x, y, z); const sc = (y < -5 ? 0 : 1) * loopEnv(u, .03, .04) * (1 - ss(.7, .74, u) * (1 - ss(.74, .78, u))); o3.scale.setScalar(Math.max(.001, sc)); o3.updateMatrix(); drops.setMatrixAt(i, o3.matrix);
    }
    drops.instanceMatrix.needsUpdate = true;
    /* soil fines: retained at the fabric when it is there, carried into the voids when it is not */
    for (let i = 0; i < NF; i++) {
      if (!showF) { fines.setMatrixAt(i, ZERO); continue; }
      const p = fp[i], u = ((T + p.o) / p.P) % 1, k = Math.min(1, u / .55), xw = p.side * (W / 2 + .5 + (1 - k) * .55);
      let x, y, z = p.z;
      if (!none || cur.clog < .04) { x = p.side * (W / 2 + .06 + (1 - sm(k)) * .55); y = p.y - Math.max(0, u - .55) * 1.2; if (cur.fabric < .98) { x = lerp(p.side * (W / 2 + .06), p.ex * p.fr * .8, 1 - cur.fabric) + 0; } }
      else { const m = sm(k) * cur.clog; x = lerp(xw, p.ex * (W / 2 - .5) / 1.2, m); y = lerp(p.y, p.ey * .9 + .2, m) - Math.max(0, u - .55) * .5 * cur.clog; }
      const show = (none ? (p.fr < .2 + cur.clog * .8 ? 1 : 0) : (p.fr < .55 ? 1 : 0));
      o3.position.set(x, clamp(y, .12, D), z); o3.rotation.set(i, i * 2, 0); o3.scale.setScalar(show * (.8 + p.fr * .6) * Math.max(.001, loopEnv(u, .04, .06))); o3.updateMatrix(); fines.setMatrixAt(i, o3.matrix);
    }
    fines.instanceMatrix.needsUpdate = true;
    return !reduce() || cur.explode !== (st.explode || 0);
  }
  return {
    scene, views, fov: 30, labels, limits: { az: [-75, 75], el: [4, 60], dist: [3.5, 40] },
    onSet(k, v, st) { if (k === 'view') { st.explode = v === 'exploded' ? 1 : 0; } },
    update: frame,
  };
}
