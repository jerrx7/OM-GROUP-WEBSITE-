/* shared pieces for the Construction Boulders scenes: a natural faceted boulder generator (dark stone with pale veining), an excavator with a grapple, a person for scale.
   Generic drawings. The boulders are generated, not scans; sizes are not to scale. Nothing here is an OM GROUP stone, machine, project or measurement. */
import { THREE, L, rng } from '/assets/application-s3d.js';
import { reduceM, yellowM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;
export { reduceM, yellowM };

/* a natural boulder: an icosphere stretched to (a, b, c), cut by random planes (fracture faces), noisy, per-face colour with veins. kind: nat | block (squared) | round */
export function boulderGeo(seed, a = 1, b = .72, c = .52, kind = 'nat', detail = 4, weathered = 0) {
  const r = rng(seed); let g;
  const s1 = r() * 9, s2 = r() * 9, s3 = r() * 9, vein = new V3(r() - .5, r() - .5, r() - .5).normalize(), vein2 = new V3(r() - .5, r() - .5, r() - .5).normalize(), v = new V3();
  if (kind === 'block') {
    g = new THREE.BoxGeometry(2, 2, 2, 5, 5, 5); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); v.lerp(n.multiplyScalar(1.28), .1); v.x += .035 * Math.sin(v.y * 6 + s1) * Math.cos(v.z * 5 + s2); v.y += .035 * Math.sin(v.z * 6 + s2); v.z += .035 * Math.sin(v.x * 6 + s3); v.x *= a; v.y *= b; v.z *= c; p.setXYZ(i, v.x, v.y, v.z); }
    g = g.toNonIndexed();
  } else {
    g = new THREE.IcosahedronGeometry(1, Math.min(detail, 4)); const p = g.attributes.position;
    const planes = []; const np = kind === 'round' ? 4 : 10 + (r() * 4 | 0);
    for (let i = 0; i < np; i++) planes.push([new V3(r() - .5, (r() - .5) * .85, r() - .5).normalize(), .62 + r() * .22]);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = 1 + .07 * Math.sin(v.x * 2.4 + s1) * Math.cos(v.y * 2.1 + s2) + .045 * Math.sin(v.z * 3.4 + s3) + (weathered ? .08 * Math.sin(v.x * 9 + s2) * Math.sin(v.y * 8 + s1) : 0);
      v.multiplyScalar(d); for (const [nn, off] of planes) { const o = v.dot(nn) - off; if (o > 0) v.addScaledVector(nn, -o); }
      v.x *= a; v.y *= b; v.z *= c; p.setXYZ(i, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  const p = g.attributes.position, col = new Float32Array(p.count * 3), q = new V3();
  for (let f = 0; f < p.count; f += 3) {
    const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3 / a, cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3 / b, cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3 / c;
    const w1 = Math.sin((cx * vein.x + cy * vein.y + cz * vein.z) * 3.2 + s1 + Math.sin(cx * 3 + cz * 2) * .7), w2 = Math.sin((cx * vein2.x + cy * vein2.y + cz * vein2.z) * 5 + s2 + Math.sin(cy * 4) * .5);
    const m = .5 + .5 * Math.sin(cx * 2.3 + cy * 1.7 + cz * 2.9 + s3);
    let t = .045 + m * .035; if (w1 > .93) t = .3 + (w1 - .93) * 3; else if (w2 > .965) t = .2 + (w2 - .965) * 3;
    let R = t * .96, G = t * .98, B = t * 1.06;
    if (weathered) { const kk = .5 + .5 * Math.sin(cx * 4 + cy * 3 + s3); R = lerp(R, .2 * kk + .1, weathered); G = lerp(G, .14 * kk + .07, weathered); B = lerp(B, .09 * kk + .04, weathered); }
    for (let kq = 0; kq < 3; kq++) { col[(f + kq) * 3] = R; col[(f + kq) * 3 + 1] = G; col[(f + kq) * 3 + 2] = B; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeBoundingBox(); return g;
}
export const boulderMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, metalness: 0, envMapIntensity: .6 });
export function boulder(seed, a, b, c, kind, weathered, detail) { const m = new THREE.Mesh(boulderGeo(seed, a, b, c, kind, detail || 5, weathered || 0), boulderMat()); m.castShadow = m.receiveShadow = true; const bb = m.geometry.boundingBox; m.position.y = -bb.min.y; m.userData.bb = bb; return m; }

export function person(h = 1.75) {
  const g = new THREE.Group(), s = h / 1.75; const mat = (c, r = .7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const legs = mk(new THREE.CylinderGeometry(.13 * s, .15 * s, .85 * s, 10), mat(0x3a3d44)); legs.position.y = .43 * s; g.add(legs);
  const body = mk(new THREE.CylinderGeometry(.2 * s, .22 * s, .7 * s, 12), mat(0xff7a2b)); body.position.y = 1.2 * s; g.add(body);
  const head = mk(new THREE.SphereGeometry(.12 * s, 12, 10), mat(0xc58a62)); head.position.y = 1.68 * s; g.add(head);
  const hat = mk(new THREE.SphereGeometry(.14 * s, 12, 8, 0, TAU, 0, Math.PI / 2), mat(0xf2c200, .5)); hat.position.y = 1.72 * s; g.add(hat);
  return g;
}

/* a tracked excavator: returns {g, pose(boom, stick, grapple, open), tip() -> world point at the grapple, jaws} */
export function excavator() {
  const g = new THREE.Group(), y = yellowM(), blk = M.dark;
  const tr = mk(new THREE.BoxGeometry(7, 1.2, 4.6), M.rubber); tr.position.y = .6; g.add(tr);
  [-2.2, 2.2].forEach(z => { const t = mk(new THREE.BoxGeometry(7.2, 1.3, 1.2), blk); t.position.set(0, .65, z); g.add(t); });
  const turret = new THREE.Group(); turret.position.y = 1.4; g.add(turret);
  const base = mk(new THREE.BoxGeometry(5.2, 1.2, 4), y); base.position.set(-.4, .6, 0); turret.add(base);
  const cw = mk(new THREE.BoxGeometry(2, 1.7, 3.8), blk); cw.position.set(-3.1, 1, 0); turret.add(cw);
  const cab = mk(new THREE.BoxGeometry(2.3, 2.3, 2), y); cab.position.set(.6, 2.3, 1.1); turret.add(cab);
  const win = mk(new THREE.BoxGeometry(2.1, 1.3, 2.05), new THREE.MeshStandardMaterial({ color: 0x5a7d93, roughness: .1, metalness: .3 })); win.position.set(.8, 2.5, 1.1); turret.add(win);
  const boom = new THREE.Group(); boom.position.set(1.6, 1.2, -.6); turret.add(boom); const BL = 7.2, SL = 5.2;
  const b1 = mk(new THREE.BoxGeometry(BL, .9, .8), y); b1.position.x = BL / 2; boom.add(b1);
  const stick = new THREE.Group(); stick.position.x = BL; boom.add(stick); const s1 = mk(new THREE.BoxGeometry(SL, .7, .7), y); s1.position.x = SL / 2; stick.add(s1);
  const gr = new THREE.Group(); gr.position.x = SL; stick.add(gr); const jaws = [-1, 1].map(s => { const j = new THREE.Group(); gr.add(j); const a = mk(new THREE.BoxGeometry(.5, 2.3, .4), M.steelS); a.position.set(0, -1.1, 0); j.add(a); const t = mk(new THREE.BoxGeometry(.9, .4, .4), M.steelS); t.position.set(-.3 * s, -2.2, 0); j.add(t); j.position.z = s * .8; return j; });
  const hub = mk(new THREE.BoxGeometry(.9, .6, 2), blk); gr.add(hub);
  const pose = (ab, as, ag, open) => { boom.rotation.z = ab; stick.rotation.z = as; gr.rotation.z = ag; jaws.forEach((j, i) => { j.position.z = (i ? 1 : -1) * (.45 + open * .7); }); g.updateMatrixWorld(true); };
  const tip = new THREE.Object3D(); tip.position.set(0, -1.6, 0); gr.add(tip);
  return { g, turret, pose, tip, boom, stick, gr, jaws };
}
export { THREE, L, M, mk, clamp, sm, lerp, TAU, rng };
