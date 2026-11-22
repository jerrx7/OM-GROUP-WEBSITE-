/* scene: construction boulders at scale. Two sets, one module.
   scale  : one generated natural boulder beside a person, with its three dimensions (longest, intermediate, shortest) as orange bars. A switch changes the drawn size to show that there is no single size.
   select : four stones from one source, chosen for four different jobs: rockfill, general construction, squared rubble, gabion fill. A selector rings one of them.
   Drawings: the stones are generated, the sizes are not to scale and are NOT OM GROUP catalogue sizes, a standard or a measurement. 1 unit = 1 m. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { boulder, person, reduceM } from '/assets/application-s3d-bldkit.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { spotter } from '/assets/application-s3d-spotter.js';
const { M, mk, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const set = state.set || 'scale', SHAPE = 5;
  const scene = new THREE.Scene(); studio(scene, { ext: 14, key: 2.3, shadow: .22, map: 2048 });
  const out = { scene, fov: 28, wide: true };
  const disc = new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6 });
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const hot = new THREE.MeshBasicMaterial({ color: 0xff5e29 }), grey = new THREE.MeshBasicMaterial({ color: 0x8d8d92 });
  const bar = (len, axis, mat, rad = .028) => { const m = mk(new THREE.CylinderGeometry(rad, rad, len, 8), mat, { cast: false }); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; return m; };
  const tick = (axis, mat) => { const m = bar(.34, axis === 'x' ? 'y' : 'x', mat, .026); return m; };

  if (set === 'scale') {
    /* a real-looking boulder beside the OM GROUP technician, with its three dimensions drawn as measurement lines on the box that just encloses it.
       The drawn size changes the stone only (the person stays 1.84 m); nothing here is a catalogue size or a measurement of a real stone. */
    const g = new THREE.Group(); scene.add(g); const floor = mk(new THREE.CylinderGeometry(5.2, 5.4, .1, 72), disc); floor.position.y = -.05; scene.add(floor);
    const geo = realStones('quarry')[SHAPE].clone(); geo.computeBoundingBox(); let ex = geo.boundingBox.getSize(new V3()); if (ex.z > ex.x) { geo.rotateY(Math.PI / 2); geo.computeBoundingBox(); ex = geo.boundingBox.getSize(new V3()); }
    const LONG = 2.0, k0 = LONG / ex.x;                                                       /* the medium stone is 2.0 m long as drawn */
    const bd = new THREE.Mesh(geo, realStoneMaterial({ tint: .56, bump: .04, floor: 0, gain: .95, contrast: .7, scale: .45, soft: 1 })); bd.castShadow = bd.receiveShadow = true; bd.scale.setScalar(k0); g.add(bd);
    const c = geo.boundingBox.getCenter(new V3()).multiplyScalar(k0); bd.position.set(-c.x, -geo.boundingBox.min.y * k0 + .02, -c.z);
    const B = new THREE.Box3().setFromObject(bd), lo = B.min, hi = B.max;                      /* the enclosing box, in the group's frame */
    const ORG = 0xf15a29, hot = new THREE.MeshBasicMaterial({ color: ORG }), thin = new THREE.MeshBasicMaterial({ color: ORG, transparent: true, opacity: .55 });
    const rod = (a, b, rad, mat) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, d.length(), 8), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); m.castShadow = false; return m; };
    const dims = new THREE.Group(); g.add(dims); const OFF = .34;
    /* the enclosing box as fine lines, then three dimension lines with arrowheads and extension lines, just outside it */
    const P = (x, y, z) => new V3(x, y, z), corners = [lo.x, hi.x].flatMap(x => [lo.y, hi.y].flatMap(y => [lo.z, hi.z].map(z => P(x, y, z))));
    [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]].forEach(([a, b]) => dims.add(rod(corners[a], corners[b], .007, thin)));
    const arrow = (a, b) => { dims.add(rod(a, b, .017, hot)); const d = b.clone().sub(a).normalize(); [[a, d], [b, d.clone().negate()]].forEach(([p, dir]) => { const cone = new THREE.Mesh(new THREE.ConeGeometry(.055, .2, 14), hot); cone.position.copy(p).addScaledVector(dir, .1); cone.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().negate()); dims.add(cone); }); };
    const y0 = lo.y, zf = hi.z + OFF, xr = hi.x + OFF, xl = lo.x - OFF;
    arrow(P(lo.x, y0, zf), P(hi.x, y0, zf)); [lo.x, hi.x].forEach(x => dims.add(rod(P(x, y0, hi.z), P(x, y0, zf + .08), .007, thin)));              /* longest: along x */
    arrow(P(xr, y0, lo.z), P(xr, y0, hi.z)); [lo.z, hi.z].forEach(z => dims.add(rod(P(hi.x, y0, z), P(xr + .08, y0, z), .007, thin)));                 /* intermediate: along z */
    arrow(P(xl, y0, hi.z), P(xl, hi.y, hi.z)); [y0, hi.y].forEach(y => dims.add(rod(P(lo.x, y, hi.z), P(xl - .08, y, hi.z), .007, thin)));            /* shortest: height */
    const pr = spotter(); pr.pose({ t: 0, ph: -1 }); pr.g.position.set(3.1, 0, 1.1); pr.g.rotation.y = -.5; scene.add(pr.g);
    out.views = { all: { az: -24, el: 12, dist: 10.2, t: [.7, .9, 0] } };
    out.limits = { az: [-120, 120], el: [3, 70], dist: [5, 22] };
    out.labels = [];                                                                         /* no labels over the picture: the lines and the person say it, the text beside it explains */
    let cur = 1; out.seek = () => { cur = 1e9; };
    out.update = (t, dt, st) => {
      const goal = st.size == null ? 1 : st.size; if (cur > 1e8) cur = goal; const kk = reduceM() ? 1 : 1 - Math.exp(-dt * 5); cur += (goal - cur) * kk; const mv = Math.abs(goal - cur) > .003; if (!mv) cur = goal;
      g.scale.setScalar(cur); pr.pose({ t, ph: -1 });
      return mv;
    };
    return out;
  }
  /* select */
  const X = [-7, -2.3, 2.4, 7], P = [['rock', 'Rockfill stone', 1.1, .72, .8, 'nat', 21], ['cons', 'General construction stone', .8, .55, .6, 'nat', 22], ['rub', 'Squared rubble stone', .5, .4, .42, 'block', 23], ['gab', 'Gabion fill stone', .3, .24, .26, 'nat', 24]];
  const rings = [];
  P.forEach(([k, t, a, b, c, kind, seed], i) => {
    const g = new THREE.Group(); g.position.set(X[i], 0, 0); scene.add(g);
    const d = mk(new THREE.CylinderGeometry(2, 2.1, .16, 48), disc); d.position.y = .08; g.add(d);
    const ring = mk(new THREE.TorusGeometry(2.05, .06, 8, 64), M.orange, { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.y = .2; ring.visible = false; g.add(ring); rings.push(ring);
    const bd = boulder(seed, a, b, c, kind, 0, 5); bd.position.y += .16; g.add(bd);
  });
  const pr = person(); pr.position.set(10.6, 0, -.5); scene.add(pr);
  out.views = { all: { az: -6, el: 17, dist: 29, t: [1.8, 1.1, 0] } }; out.limits = { az: [-40, 40], el: [5, 50], dist: [14, 60] };
  out.labels = P.map(([k, t], i) => lab(k, t, new V3(X[i], 2.2 + (i % 2) * 1.7, 0), null, i === 0 ? 'hot' : '', 'r')).concat([lab('pp', 'Person, for scale', new V3(10.6, 1.2, -.5), null, '', 'l')]);
  out.update = (t, dt, st) => { rings.forEach((r, i) => { r.visible = st.sel === P[i][0]; }); return false; };
  return out;
}
