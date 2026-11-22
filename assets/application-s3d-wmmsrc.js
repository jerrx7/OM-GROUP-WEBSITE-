/* scene: a general hard-rock crushing and screening route for road aggregate: source rock, primary crushing (jaw cutaway), conveying, a three-deck vibrating screen, and five fraction stockpiles.
    It is NOT the OM GROUP Banda Wafoli face, plant layout, machinery or capacity: those need approved photographs and must be confirmed.
   Particle counts and sizes are not to scale. No throughput, proportion or product result is shown. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { reduceM, yellowM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU, stone } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 70, key: 2.2, shadow: .2, map: 2048 });
  const out = { scene, fov: 30, wide: true };
  const steel = M.steelS, dark = M.dark, ground = mk(new THREE.BoxGeometry(190, .4, 40), new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: .9 })); ground.position.set(0, -.2, 0); scene.add(ground);
  const rockCol = new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 1, flatShading: true });
  /* 1 · source rock: a benched face */
  const rock = new THREE.Group(); rock.position.set(-78, 0, 0); scene.add(rock); const r1 = rng(5);
  [[0, 3, 0, 16, 6, 18], [3, 8, 0, 11, 5, 16], [5.5, 12.5, 0, 7, 4, 13]].forEach(([x, y, z, w, h, d]) => { const b = mk(new THREE.BoxGeometry(w, h, d, 5, 3, 5), rockCol); const p = b.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + (r1() - .5) * 1.1, p.getY(i) + (r1() - .5) * .8, p.getZ(i) + (r1() - .5) * 1.1); b.geometry.computeVertexNormals(); b.position.set(x, y, z); rock.add(b); });
  for (let i = 0; i < 9; i++) { const s = stone(r1, 1.2 + r1() * 1.8, 1, .9, 1); s.position.set(9 + r1() * 7, 1 + r1() * 1.2, (r1() - .5) * 16); rock.add(s); }
  const exc = new THREE.Group(); exc.position.set(17, 0, 8); rock.add(exc); const ey = yellowM();
  const eb = mk(new THREE.BoxGeometry(7, 2.2, 4.4), ey); eb.position.y = 2; exc.add(eb); [-2.4, 2.4].forEach(z => { const tr = mk(new THREE.BoxGeometry(8, 1.4, 1.3), M.rubber); tr.position.set(0, .8, z * .8); exc.add(tr); }); const cb = mk(new THREE.BoxGeometry(2.6, 2.4, 2.6), ey); cb.position.set(-1.2, 4, 0); exc.add(cb);
  const boom = mk(new THREE.BoxGeometry(8, .9, .9), ey); boom.position.set(5, 5, 0); boom.rotation.z = .35; exc.add(boom);
  /* 2 · jaw crusher cutaway */
  const cr = new THREE.Group(); cr.position.set(-52, 0, 0); scene.add(cr);
  const hop = mk(new THREE.CylinderGeometry(7, 4, 5, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .5, roughness: .5, side: THREE.DoubleSide })); hop.rotation.y = Math.PI / 4; hop.position.set(0, 16, 0); cr.add(hop);
  [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([x, z]) => { const l = mk(new THREE.BoxGeometry(.6, 13, .6), steel); l.position.set(x, 6.5, z); cr.add(l); });
  const body = mk(new THREE.BoxGeometry(9, 9, 10), new THREE.MeshStandardMaterial({ color: 0x4a4d52, metalness: .5, roughness: .55, transparent: true, opacity: .55 })); body.position.set(0, 9.5, 0); cr.add(body);
  const fixedJaw = mk(new THREE.BoxGeometry(1.2, 8, 8.6), M.black); fixedJaw.position.set(-2.4, 9.5, 0); fixedJaw.rotation.z = -.12; cr.add(fixedJaw);
  const swing = new THREE.Group(); swing.position.set(2.4, 14, 0); cr.add(swing); const sj = mk(new THREE.BoxGeometry(1.2, 8, 8.6), M.orange); sj.position.set(0, -4, 0); swing.add(sj);
  const fw = mk(new THREE.CylinderGeometry(2.6, 2.6, .8, 28), steel); fw.rotation.x = Math.PI / 2; fw.position.set(6.8, 11, 6); cr.add(fw);
  /* 3 · conveyor from crusher to screen */
  const cv = new THREE.Group(); scene.add(cv); const c0 = new V3(-46, 3, 0), c1 = new V3(-22, 17, 0), cl = c0.distanceTo(c1), ang = Math.atan2(c1.y - c0.y, c1.x - c0.x);
  const belt = mk(new THREE.BoxGeometry(cl, .5, 3.2), M.rubber); belt.position.copy(c0).lerp(c1, .5); belt.rotation.z = ang; cv.add(belt);
  [.2, .5, .8].forEach(u => { const lg = mk(new THREE.BoxGeometry(.4, 11 * u + 4, .4), steel); const p = c0.clone().lerp(c1, u); lg.position.set(p.x, (p.y - 1) / 2, 2); cv.add(lg); const lg2 = lg.clone(); lg2.position.z = -2; cv.add(lg2); });
  /* 4 · vibrating screen, three decks */
  const sc = new THREE.Group(); sc.position.set(-10, 15, 0); scene.add(sc); const scr = new THREE.Group(); sc.add(scr); scr.rotation.z = -.18;
  const frame = mk(new THREE.BoxGeometry(22, 5.4, 9), new THREE.MeshStandardMaterial({ color: 0x5b5f66, metalness: .5, roughness: .5, transparent: true, opacity: .3, depthWrite: false })); scr.add(frame);
  [-1.6, 0, 1.6].forEach((y, i) => { const dk = mk(new THREE.BoxGeometry(20, .14, 8.4), M.mesh, { cast: false }); dk.position.y = y; scr.add(dk); });
  const springs = [[-8, -4], [8, -4], [-8, 4], [8, 4]].map(([x, z]) => { const s = mk(new THREE.CylinderGeometry(.7, .7, 3, 12), M.steelS); s.position.set(x, -4.2, z); sc.add(s); return s; });
  [[-9, -4], [9, -4], [-9, 4], [9, 4]].forEach(([x, z]) => { const l = mk(new THREE.BoxGeometry(.6, 12, .6), steel); l.position.set(x, -9, z); sc.add(l); });
  /* 5 · five stockpiles */
  const FR = [['40 mm', 2.0, 36], ['20 mm', 1.05, 120], ['10 mm', .55, 360], ['6 mm', .34, 700], ['SCREENINGS', .15, 1700]], PX = [4, 14, 24, 34, 44], pileTop = [];
  const disc = new THREE.MeshStandardMaterial({ color: 0xe0ddd6, roughness: .7 }), stoneM = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 }), fineM = new THREE.MeshStandardMaterial({ color: 0xb9b6ae, vertexColors: true, roughness: 1 });
  FR.forEach(([nm, rad, n], i) => {
    const g = new THREE.Group(); g.position.set(PX[i], 0, 0); scene.add(g); const r = rng(200 + i), items = [], R = 4.2, H = 5.4;
    const d = mk(new THREE.CylinderGeometry(5, 5.4, .5, 40), disc); d.position.y = .25; g.add(d);
    for (let j = 0; j < n; j++) { const rr = R * Math.sqrt(r()), a = r() * TAU, h = H * Math.pow(Math.max(0, 1 - (rr / R) ** 2), .85), s = rad * (.8 + r() * .4); items.push([Math.cos(a) * rr, .5 + Math.max(s * .6, h - r() * s * 2.2), Math.sin(a) * rr, s]); }
    const cone = mk(new THREE.ConeGeometry(R * .97, H * .92, 36, 1, true), new THREE.MeshStandardMaterial({ color: i === 4 ? 0x7b7a78 : 0x2a2b2e, roughness: 1, side: THREE.DoubleSide })); cone.position.y = .5 + H * .46; g.add(cone); instStones(g, items, i === 4 ? fineM : stoneM, 80 + i, false);
    pileTop.push(new V3(PX[i], H + 1.2, 0));
  });
  /* chutes from the decks to the piles */
  const chM = new THREE.MeshStandardMaterial({ color: 0x7d838b, metalness: .5, roughness: .55 });
  FR.forEach((_, i) => { const z = (i - 2) * 2.2, from = new V3(-1, 12.4 - i * .5, z), to = new V3(PX[i] - 1, pileTop[i].y + 1, z); const ln = from.distanceTo(to), c = mk(new THREE.BoxGeometry(ln, .35, 1.7), M.rubber, { cast: false }); c.position.copy(from).lerp(to, .5); c.rotation.z = Math.atan2(to.y - from.y, to.x - from.x); scene.add(c); [.35, .75].forEach(u => { const p = from.clone().lerp(to, u), lg = mk(new THREE.BoxGeometry(.3, p.y, .3), steel, { cast: false }); lg.position.set(p.x, p.y / 2, z); scene.add(lg); }); });
  /* moving particles */
  const PATH = ci => { const z = (ci - 2) * 2.2; return [new V3(-50, 14, 0), new V3(-49, 5.6, 0), new V3(-44, 3.6, 0), new V3(-22, 17.6, 0), new V3(-8, 17, 0), new V3(-1, 12.9 - ci * .5, z), new V3(PX[ci] - 1, pileTop[ci].y + 1.2, z)]; };
  const parts = [], NP = 5, g2 = L.STONES;
  const ims = FR.map((f, ci) => { const im = new THREE.InstancedMesh(g2[ci % 9], ci === 4 ? fineM : stoneM, 16); im.frustumCulled = false; scene.add(im); for (let i = 0; i < 16; i++) parts.push({ ci, im, i, ph: i / 16, s: Math.max(.24, f[1] * .42), rot: [i, i * 2, i * .5], path: PATH(ci) }); return im; });
  const rawM = new THREE.InstancedMesh(g2[2], rockCol, 12); rawM.frustumCulled = false; scene.add(rawM);
  out.views = { all: { az: 4, el: 20, dist: 132, t: [-14, 7, 0] }, rock: { az: -20, el: 14, dist: 56, t: [-74, 5, 2] }, crush: { az: -14, el: 12, dist: 44, t: [-50, 9, 0] }, screen: { az: -10, el: 12, dist: 56, t: [-14, 11, 0] }, stock: { az: -4, el: 14, dist: 86, t: [34, 4, 0] } };
  out.limits = { az: [-50, 50], el: [4, 50], dist: [30, 220] };
  const lab = (id, text, a, vs, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: st => vs.includes(st.view || 'all') });
  out.labels = [lab('r', 'Source rock', new V3(-74, 17, 0), ['all', 'rock'], 'warn'), lab('b', 'Benched hard-rock face', new V3(-72, 8, 8), ['rock']), lab('j', 'Primary crusher', new V3(-52, 20, 0), ['all', 'crush'], 'hot'), lab('m', 'Swing jaw', new V3(-49, 13, 5), ['crush'], 'hot'), lab('k', 'Conveyor', new V3(-34, 12, 2), ['crush', 'screen']), lab('s', 'Vibrating screen', new V3(-10, 22, 0), ['all', 'screen'], 'hot'), ...FR.map((f, i) => lab('p' + i, f[0], new V3(PX[i], 8 + (i % 2) * 2.6, 0), ['stock'], '')), lab('fx', 'Five fraction stockpiles', new V3(PX[2], 9, 0), ['all'], 'hot')];
  const rr2 = rng(13); let T = 0; out.seek = v => { T = v; }; const o = new THREE.Object3D();
  out.update = (t, dt, st) => {
    const go = st.play !== false && !reduceM(); if (go) T += dt;
    scr.position.y = go ? Math.sin(T * 38) * .09 : 0; scr.rotation.z = -.18 + (go ? Math.sin(T * 30) * .004 : 0); swing.rotation.z = go ? .05 + Math.sin(T * 5) * .07 : .06; fw.rotation.z = T * 5;
    for (let i = 0; i < 12; i++) { const u = (T * .14 + i / 12) % 1; o.position.set(-50 + u * 2, 15.5 - u * 9, 0); o.scale.setScalar(.75 + (i % 3) * .15); o.rotation.set(i, T * .5, i * 2); o.updateMatrix(); rawM.setMatrixAt(i, o.matrix); } rawM.instanceMatrix.needsUpdate = true;
    ims.forEach(im => im.userData.n = 0);
    parts.forEach(p => {
      const u = (T * .075 + p.ph) % 1, pts = p.path, segLen = [], tot = pts.reduce((a, v, k) => { if (!k) return 0; const l = v.distanceTo(pts[k - 1]); segLen.push(l); return a + l; }, 0); let d = u * tot, k = 0; while (k < segLen.length - 1 && d > segLen[k]) { d -= segLen[k]; k++; }
      const a = pts[k], b = pts[k + 1], e = clamp(d / segLen[k]); o.position.lerpVectors(a, b, e); if (k < 4) o.position.z = ((p.i % 5) - 2) * .4; o.scale.setScalar(p.s * (k < 3 ? 1.15 : 1)); o.rotation.set(p.rot[0] + T, p.rot[1], p.rot[2]); o.updateMatrix(); p.im.setMatrixAt(p.i, o.matrix);
    }); ims.forEach(im => { im.instanceMatrix.needsUpdate = true; });
    return go;
  };
  return out;
}
