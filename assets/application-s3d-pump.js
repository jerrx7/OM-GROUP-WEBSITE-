/* scene: concrete in a pump pipeline, drawn as a cutaway.
   A pump and hopper, a transparent pipeline with a horizontal run, a bend, a vertical lift and a placing end. Inside it, a mix moves along the line:
   20 mm stones, M-Sand and paste. A switch changes the mix between a cohesive one and one that is prone to segregation, so the difference can be seen.
   A drawing only. The sizes are compressed so both fractions stay visible, no pressure, rate, distance or pumpability result is shown or implied,
   and the second mix is a picture of the idea of segregation, not a simulation of any real mix. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, mineralGrain, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { M, mk, clamp, sm } = L;

const R = .92;                                                    /* pipe radius in scene units */
export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 26, key: 2.2, shadow: .2, map: 2048 });
  const nm = state.nm || 'M-Sand';

  /* the line: a horizontal run, a bend, a vertical lift, a bend and a horizontal placing run ending in a short drop. All in the XY plane. */
  const path = new THREE.CurvePath();
  const P = (x, y) => new V3(x, y, 0);
  path.add(new THREE.LineCurve3(P(-10, 2.3), P(6, 2.3)));
  path.add(new THREE.QuadraticBezierCurve3(P(6, 2.3), P(8.4, 2.3), P(8.4, 4.7)));
  path.add(new THREE.LineCurve3(P(8.4, 4.7), P(8.4, 11.4)));
  path.add(new THREE.QuadraticBezierCurve3(P(8.4, 11.4), P(8.4, 13.8), P(10.8, 13.8)));
  path.add(new THREE.LineCurve3(P(10.8, 13.8), P(17, 13.8)));
  path.add(new THREE.QuadraticBezierCurve3(P(17, 13.8), P(19.2, 13.8), P(19.2, 11.6)));
  const LEN = path.getLength(), N = 600, pts = [], tans = [];
  for (let i = 0; i <= N; i++) { const u = i / N; pts.push(path.getPointAt(u)); tans.push(path.getTangentAt(u)); }
  const at = (u, out, tan) => { const f = u * N, i = Math.min(N - 1, f | 0), k = f - i; out.copy(pts[i]).lerp(pts[i + 1], k); tan.copy(tans[i]).lerp(tans[i + 1], k).normalize(); };
  /* where the parts of the line begin and end, as a fraction of its length: used for the labels and the plug */
  const uAt = (x, y) => { let b = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = i; } }); return b / N; };
  const U = { bend1: uAt(7.6, 3.2), lift: uAt(8.4, 8), bend2: uAt(9.2, 13.4), end: 1 };

  /* ground */
  { const f = mk(new THREE.BoxGeometry(64, .3, 20), new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: .85 })); f.position.set(2, -.15, 0); scene.add(f); }
  /* placing deck at the end of the line: a slab being cast, with timber edge forms and a reinforcement mesh */
  { const d = mk(new THREE.BoxGeometry(10, .7, 7), new THREE.MeshStandardMaterial({ color: 0xcfcac1, roughness: .8 })); d.position.set(15, 10.8, 0); scene.add(d);
    const tim = new THREE.MeshStandardMaterial({ color: 0xc89a62, roughness: .8 });
    [[0, 3.55, 10.1, .5], [0, -3.55, 10.1, .5]].forEach(([x, z, w]) => { const f = mk(new THREE.BoxGeometry(w, 1.05, .12), tim); f.position.set(15 + x, 10.9, z); scene.add(f); });
    [[-5.05, 0], [5.05, 0]].forEach(([x]) => { const f = mk(new THREE.BoxGeometry(.12, 1.05, 7.1), tim); f.position.set(15 + x, 10.9, 0); scene.add(f); });
    const bar = new THREE.MeshStandardMaterial({ color: 0x6b4a3a, roughness: .6, metalness: .35 });
    for (let i = -4; i <= 4; i++) { const b = mk(new THREE.CylinderGeometry(.045, .045, 6.6, 8), bar); b.rotation.x = Math.PI / 2; b.position.set(15 + i * 1.05, 11.3, 0); scene.add(b); }
    for (let i = -3; i <= 3; i++) { const b = mk(new THREE.CylinderGeometry(.045, .045, 9.6, 8), bar); b.rotation.z = Math.PI / 2; b.position.set(15, 11.36, i * .95); scene.add(b); }
    const post = new THREE.MeshStandardMaterial({ color: 0xc9c5bd, roughness: .8 });
    [[11, 3], [19, 3], [11, -3], [19, -3]].forEach(([x, z]) => { const c = mk(new THREE.BoxGeometry(.55, 10.4, .55), post); c.position.set(x, 5.2, z); scene.add(c); }); }

  /* pump unit and hopper */
  const steel = new THREE.MeshStandardMaterial({ color: 0x5a5b60, roughness: .5, metalness: .45 }), orange = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .45, metalness: .2 });
  { const body = mk(new THREE.BoxGeometry(6.4, 2.5, 3.4), steel); body.position.set(-13.4, 1.4, 0); scene.add(body);
    const band = mk(new THREE.BoxGeometry(6.45, .5, 3.45), orange); band.position.set(-13.4, 1.9, 0); scene.add(band);
    const hop = mk(new THREE.CylinderGeometry(2.3, .95, 2.1, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x86878c, roughness: .4, metalness: .55, side: THREE.DoubleSide })); hop.position.set(-13.4, 3.7, 0); scene.add(hop);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.1, 1.5, 36), new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: .9 })); fill.position.set(-13.4, 3.55, 0); scene.add(fill);
    const outlet = mk(new THREE.CylinderGeometry(R * 1.12, R * 1.12, 1.2, 28), steel); outlet.rotation.z = Math.PI / 2; outlet.position.set(-10.2, 2.3, 0); scene.add(outlet);
    [-15.6, -11.2].forEach(x => [1.5, -1.5].forEach(z => { const w = mk(new THREE.CylinderGeometry(.55, .55, .5, 24), M.dark || steel); w.rotation.x = Math.PI / 2; w.position.set(x, .55, z * 1.0); scene.add(w); })); }

  /* the pipe: a transparent tube, a lighter lubricating film at the wall, the paste, and steel couplings along the line */
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 260, R, 32, false), new THREE.MeshPhysicalMaterial({ color: 0xdfe7ef, roughness: .08, transmission: 0, transparent: true, opacity: .17, side: THREE.DoubleSide, depthWrite: false, clearcoat: .6 })); tube.renderOrder = 6; scene.add(tube);
  const pasteMat = new THREE.MeshStandardMaterial({ color: 0xb2ab9f, roughness: .55, transparent: true, opacity: .34, depthWrite: false });
  const paste = new THREE.Mesh(new THREE.TubeGeometry(path, 260, R * .9, 24, false), pasteMat); paste.renderOrder = 4; scene.add(paste);
  const coupM = new THREE.MeshStandardMaterial({ color: 0x74757a, roughness: .4, metalness: .6 }), clampM = orange;
  { const o = new V3(), t = new V3(); const n = Math.round(LEN / 2.6);
    for (let i = 0; i <= n; i++) { at(clamp(i / n, 0, 1), o, t); const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.04, .085, 10, 36), i % 2 ? coupM : clampM); ring.position.copy(o); ring.quaternion.setFromUnitVectors(new V3(0, 0, 1), t); scene.add(ring); } }
  /* trestles under the horizontal run and clamps on the riser */
  { const leg = new THREE.MeshStandardMaterial({ color: 0x8a8b90, roughness: .5, metalness: .4 });
    [-6, -1.5, 3].forEach(x => { const l = mk(new THREE.BoxGeometry(.28, 1.55, 1.7), leg); l.position.set(x, .78, 0); scene.add(l); const c = mk(new THREE.BoxGeometry(1.1, .22, 1.7), leg); c.position.set(x, 1.5, 0); scene.add(c); });
    [6.2, 9.4].forEach(y => { const c = mk(new THREE.BoxGeometry(2.2, .22, .5), leg); c.position.set(8.4, y, 0); scene.add(c); }); }

  /* the mix inside the line */
  const stoneGeos = [11, 23, 37].map(sd => mineralGrain('ang', sd, { w: 72, h: 48, tone: 'rock' })), fineGeos = grainGeos('fine', 'm');
  const mS = grainMat(), mF = grainMat(); const hotE = new THREE.Color(0xff5e29), off = new THREE.Color(0);
  const rg = rng(7117), NS = 66, NF = 1500;
  const mkInst = (geo, n, mat) => { const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.castShadow = false; scene.add(im); return im; };
  const stoneIM = [mkInst(stoneGeos[0], 22, mS), mkInst(stoneGeos[1], 22, mS), mkInst(stoneGeos[2], 22, mS)], fineIM = mkInst(fineGeos[0], NF, mF);
  const stones = Array.from({ length: NS }, (_, i) => ({ s0: rg(), th: rg() * TAU, rho: Math.sqrt(rg()) * .62, sc: .2 + rg() * .1, rx: rg() * 6, ry: rg() * 6, rz: rg() * 6, j: rg(), w: i % 3 }));
  const fines = Array.from({ length: NF }, () => ({ s0: rg(), th: rg() * TAU, rho: Math.sqrt(rg()) * .86, sc: .045 + Math.pow(rg(), 1.4) * .06, rx: rg() * 6, ry: rg() * 6, rz: rg() * 6, j: rg() }));
  const o3 = new THREE.Object3D(), pos = new V3(), tan = new V3(), nrm = new V3(), bin = new V3(0, 0, 1), q = new THREE.Quaternion();
  const SPEED = .016;
  /* the segregating mix: the stones gather and sit near the bottom of the horizontal run while the thin, watery mix moves on above them */
  const PLUG = { u: .17, w: .075 };
  const place = (p, t, kSeg, isStone, idx) => {
    /* cohesive position */
    let u = (p.s0 + t * SPEED) % 1, th = p.th, rho = p.rho;
    if (kSeg > 0) {
      let u2, th2, rho2;
      if (isStone) { u2 = PLUG.u + (p.s0 - .5) * PLUG.w + Math.sin(t * 5 + p.j * 40) * .0016; th2 = Math.PI * 1.5 + (p.th - Math.PI) * .18; rho2 = .38 + p.rho * .72; }
      else { u2 = (p.s0 + t * SPEED * 1.35) % 1; th2 = p.th * .6 + 1.1; rho2 = p.rho * .78; /* thin mix: higher in the pipe, moving faster */ }
      let d = u2 - u; d -= Math.round(d); u = ((u + d * kSeg) % 1 + 1) % 1; th = th + (th2 - th) * kSeg; rho = rho + (rho2 - rho) * kSeg;
    }
    at(u, pos, tan); nrm.set(-tan.y, tan.x, 0);
    const rr = rho * R; pos.addScaledVector(nrm, Math.cos(th) * rr).addScaledVector(bin, Math.sin(th) * rr);
    return pos;
  };
  const cnt = [0, 0, 0];
  let kSeg = 0, tt = 0;
  const lab = (id, text, side, anchor, show, tone) => ({ id, text, side, tone, anchor, show });
  const A = u => { const o = new V3(), t = new V3(); at(u, o, t); return o; };
  const views = {
    all: { az: -10, el: 14, dist: 49, t: [2.6, 6.6, 0] },
    pump: { az: -22, el: 16, dist: 19, t: [-12, 2.8, 0] },
    pipe: { az: -8, el: 7, dist: 14, t: [-1.5, 2.4, 0] },
    inside: { az: -62, el: 3, dist: 7.2, t: [-3, 2.3, 0] },
    lift: { az: -14, el: 10, dist: 24, t: [8.4, 8, 0] },
    end: { az: -20, el: 14, dist: 17, t: [15, 12.6, 0] },
  };
  const labels = [
    lab('pump', 'Pump and hopper', 'l', new V3(-13.4, 5.2, 0), st => st.view === 'all' || st.view === 'pump'),
    lab('pipe', 'Pipeline', 'r', new V3(-4.2, 3.7, 0), st => st.view === 'all' || st.view === 'pipe'),
    lab('bend', 'Bend', 'r', new V3(9.3, 2.6, 0), st => st.view === 'all' || st.view === 'lift'),
    lab('lift', 'Vertical lift', 'r', new V3(9.6, 8.2, 0), st => st.view === 'all' || st.view === 'lift'),
    lab('end', 'Placing end', 'r', new V3(18.6, 13.2, 0), st => st.view === 'all' || st.view === 'end'),
    lab('coarse', '20 mm coarse aggregate', 'l', new V3(-4.6, 2.9, 0), st => st.view === 'inside' || st.view === 'pipe'),
    lab('fine', nm + ': the fine aggregate', 'r', new V3(-2.2, 1.7, 0), st => st.view === 'inside' || st.view === 'pipe', 'hot'),
    lab('paste', 'Cement paste and water', 'r', new V3(-1.4, 3.2, 0), st => st.view === 'inside'),
    lab('seg', 'Coarse stones separating from the paste', 'l', A(PLUG.u).add(new V3(0, -.2, 0)), st => st.mix === 'weak' && (st.view === 'all' || st.view === 'pipe' || st.view === 'inside'), 'hot'),
  ];

  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-100, 40], el: [-2, 60], dist: [4.5, 80] },
    seek() { kSeg = state.mix === 'weak' ? 1 : 0; },
    update(t, dt, st) {
      const motion = !reduce(), goal = st.mix === 'weak' ? 1 : 0;
      tt = motion ? tt + dt : 0;
      const kPrev = kSeg; kSeg += (goal - kSeg) * Math.min(1, dt * 2.6); if (!motion) kSeg = goal; if (Math.abs(goal - kSeg) < .002) kSeg = goal;
      const tm = motion ? tt : 2.2;
      cnt[0] = cnt[1] = cnt[2] = 0;
      stones.forEach(p => {
        const ps = place(p, tm, kSeg, true), im = stoneIM[p.w], i = cnt[p.w]++;
        o3.position.copy(ps); o3.scale.setScalar(p.sc); o3.rotation.set(p.rx + tm * .15 * p.j, p.ry, p.rz); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix);
      });
      stoneIM.forEach(im => { im.count = cnt[stoneIM.indexOf(im)]; im.instanceMatrix.needsUpdate = true; });
      fines.forEach((p, i) => {
        const ps = place(p, tm, kSeg, false);
        o3.position.copy(ps); o3.scale.setScalar(p.sc); o3.rotation.set(p.rx, p.ry, p.rz); o3.updateMatrix(); fineIM.setMatrixAt(i, o3.matrix);
      });
      fineIM.instanceMatrix.needsUpdate = true;
      /* the paste thins and turns watery in the second mix */
      pasteMat.color.setHex(0xb2ab9f).lerp(new THREE.Color(0xa9c7dd), kSeg * .9); pasteMat.opacity = .34 - kSeg * .12;
      mF.emissive.copy(st.hl ? hotE : off); mF.emissiveIntensity = st.hl ? .55 : 0;
      return motion || Math.abs(goal - kSeg) > .001 || kPrev !== kSeg;
    },
  };
}
