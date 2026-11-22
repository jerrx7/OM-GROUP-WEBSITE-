/* scene: the VSI stone-crushing plant (M-Sand page, "How M-Sand is produced"): the 3D twin of the "VSI Stone Crusher at Banda Wafoli" drawing on the home page.
   Blender model assets/3d/om-group-vsi-crusher.glb (scripts/excavator3d/build-crusher.py): a vertical-shaft-impact crusher on a steel tower with the OM GROUP mark, a rising feed conveyor into
   its hopper, a product conveyor down to the graded stockpile, and the source-rock pile behind. Rock rides the feed belt into the hopper, crushed stone leaves on the product belt and falls onto
   the stockpile. A general view: no capacity, product size or output is shown. The stage buttons (whole line, 1-6) move the camera along the plant. No labels on the picture. 1 unit = 1 m. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { crispLogo } from '/assets/application-s3d-flow.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
const V3 = THREE.Vector3;

const [PLANT, PJ] = await Promise.all([
  new GLTFLoader().loadAsync('/assets/3d/om-group-vsi-crusher.glb').then(g => g.scene),
  fetch('/assets/3d/om-group-vsi-crusher.json').then(r => r.json()),
]);
const SHADOW = new THREE.TextureLoader().load('/assets/3d/om-group-vsi-crusher-shadow.webp', t => { t.colorSpace = THREE.NoColorSpace; });
const OX = -1.7;                                              /* the plant is centred on the origin so the light and shadow frustum cover it */

PLANT.traverse(o => {
  if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
  const m = o.material; if (!m) return; m.envMapIntensity = .85; const n = m.name || '';
  if (/GratingSteel/.test(n)) m.envMapIntensity = .7;
  if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
  if (/Concrete$/.test(n)) { m.envMapIntensity = .5; m.roughness = 1; }
  if (/Pile|Gravel/.test(n)) m.envMapIntensity = .55;
  if (m.map) m.map.anisotropy = 8;
});

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 21, key: 2.4, shadow: 0, map: 4096, y: .03 });
  const out = { scene, fov: 30, wide: true, labels: [] };
  const world = new THREE.Group(); world.position.x = OX; scene.add(world);
  const plant = PLANT.clone(true); world.add(plant);
  { const sw = PJ.shadow, g = new THREE.Mesh(new THREE.PlaneGeometry(sw.w, sw.d), new THREE.MeshBasicMaterial({ map: SHADOW, color: 0x120f0c, transparent: true, opacity: .55, depthWrite: false, toneMapped: false })); g.rotation.x = -Math.PI / 2; g.position.set(sw.x, .012, sw.z); g.renderOrder = 1; world.add(g); }

  /* material on the belts: dark rock chunks up the feed belt into the hopper; crushed stone along the product belt, then falling onto the stockpile */
  const F = PJ.feed, P = PJ.product, H = PJ.hopper, SP = PJ.stockpile;
  const fa = new V3(F.a[0], F.a[1], 0), fb = new V3(F.b[0], F.b[1], 0), pa = new V3(P.a[0], P.a[1], 0), pb = new V3(P.b[0], P.b[1], 0);
  const pileH = (x, z) => { const rr = Math.hypot((x - SP.x) / SP.rx, (z - SP.z) / SP.rz); return rr >= 1 ? 0 : SP.h * Math.pow(1 - Math.pow(rr, 1.55), 1.15); };
  const hit = new V3(pb.x - .75, pileH(pb.x - .75, 0) + .05, 0);
  const feedPath = [new V3(fa.x + .1, 1.5, 0), new V3(fa.x - .1, fa.y + .1, 0), new V3(fb.x + .05, fb.y + .1, 0), new V3(H.x + .7, H.top - .15, 0), new V3(H.x + .2, H.top - 1.4, 0)];
  const prodPath = [new V3(PJ.chute.top[0], PJ.chute.top[1] - .1, 0), new V3(PJ.chute.bottom[0], PJ.chute.bottom[1], 0), new V3(pa.x - .1, pa.y + .1, 0), new V3(pb.x, pb.y + .08, 0), new V3(pb.x - .55, pb.y - .3, 0), hit];
  const lenOf = p => { const l = []; let t = 0; for (let i = 1; i < p.length; i++) { const d = p[i].distanceTo(p[i - 1]); l.push(d); t += d; } return { l, t }; };
  const at = (P_, LN, u) => { let d = u * LN.t; for (let i = 0; i < LN.l.length; i++) { if (d <= LN.l[i]) return P_[i].clone().lerp(P_[i + 1], d / LN.l[i]); d -= LN.l[i]; } return P_[P_.length - 1].clone(); };
  const fl = lenOf(feedPath), pl = lenOf(prodPath), r = rng(17);
  const geo = new THREE.IcosahedronGeometry(1, 1); { const p = geo.attributes.position, v = new V3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + .22 * Math.sin(v.x * 7.1) * Math.sin(v.y * 6.3 + 1) * Math.sin(v.z * 8.2); p.setXYZ(i, v.x * k, v.y * k * .8, v.z * k * 1.1); } geo.computeVertexNormals(); }
  const mk = (n, col) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: 0, envMapIntensity: .55, flatShading: true }), n); im.castShadow = true; im.frustumCulled = false; world.add(im); return im; };
  const NF = 46, NP = 190, imF = mk(NF), imP = mk(NP), ROCK = [new THREE.Color(.05, .05, .055), new THREE.Color(.1, .1, .105), new THREE.Color(.16, .16, .165), new THREE.Color(.22, .215, .21)], GRIT = [new THREE.Color(.2, .2, .205), new THREE.Color(.3, .295, .29), new THREE.Color(.4, .39, .38), new THREE.Color(.16, .16, .17)], HOT = new THREE.Color(1, .37, .16);
  const fi = Array.from({ length: NF }, () => ({ ph: r(), s: .1 + r() * .16, o: r() * 6, k: .8 + r() * .5, z: (r() - .5) * .7, c: (r() * ROCK.length) | 0 }));
  const pi = Array.from({ length: NP }, () => ({ ph: r(), s: .035 + r() * .07, o: r() * 6, k: .8 + r() * .5, z: (r() - .5) * .7, c: (r() * GRIT.length) | 0 }));
  const o3 = new THREE.Object3D();
  /* depth offsets and the ends of each path are blended with smoothsteps: the stones used to hop sideways where one stretch of the path ended and the next began, and to pop in and out at the ends */
  const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

  /* a soft dust haze where the stone lands on the pile and at the hopper */
  const dcv = document.createElement('canvas'); dcv.width = dcv.height = 64; { const g = dcv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(190,184,172,.55)'); gr.addColorStop(1, 'rgba(190,184,172,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const dtex = new THREE.CanvasTexture(dcv); dtex.colorSpace = THREE.SRGBColorSpace;
  const ND = 16, dust = Array.from({ length: ND }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dtex, transparent: true, depthWrite: false, opacity: 0 })); m.renderOrder = 5; world.add(m); return { m, ph: i / ND, hop: i % 4 === 0, dx: (r() - .5) * 1.6, dz: (r() - .5) * 1.6 }; });

  const v = (az, el, dist, t) => ({ az, el, dist, t: [t[0] + OX, t[1], t[2]] });
  out.views = {
    all: v(-18, 14, matchMedia('(max-width:640px)').matches ? 46 : matchMedia('(max-width:1000px)').matches ? 40 : 36, [1.9, 4.4, -.4]),
    s1: v(14, 17, 21, [12.4, 2.4, -1.6]),
    s2: v(-24, 10, 13.5, [3.0, 8.3, 0]),
    s3: v(-16, 8, 11.5, [1.9, 6.9, 0]),
    s4: v(-26, 14, 14.5, [.6, 2.7, 0]),
    s5: v(-28, 9, 12, [-4.2, 5.0, 0]),
    s6: v(-16, 15, 19, [-5.2, 2.3, 0]),
  };
  out.limits = { az: [-85, 75], el: [3, 55], dist: [7, 70] };
  let T = 0, hl = 0;
  out.update = (t, dt, st) => {
    const go = !reduceM(); if (go) T += dt;
    const on = !!st.hl; hl += ((on ? 1 : 0) - hl) * (1 - Math.exp(-dt * 5));
    fi.forEach((it, i) => { const u = go ? (T * .022 + it.ph) % 1 : it.ph, p = at(feedPath, fl, u); p.z += it.z * (.3 + .7 * ss(.06, .14, u) * (1 - ss(.86, .94, u))); const e = Math.min(1, u / .05, (1 - u) / .05); o3.position.copy(p).add(new V3(0, it.s * .55, 0)); o3.scale.set(it.s * it.k * e, it.s * .75 * e, it.s * e); o3.rotation.set(it.o + u * 7, it.o, 0); o3.updateMatrix(); imF.setMatrixAt(i, o3.matrix); imF.setColorAt(i, ROCK[it.c]); });
    pi.forEach((it, i) => { const u = go ? (T * .03 + it.ph) % 1 : it.ph, p = at(prodPath, pl, u); p.z += it.z * (.35 + .65 * ss(.1, .16, u) * (1 - ss(.58, .66, u))); const e = Math.min(1, u / .04, (1 - u) / .05); o3.position.copy(p).add(new V3(0, it.s * .6, 0)); o3.scale.set(it.s * it.k * e, it.s * .75 * e, it.s * e); o3.rotation.set(it.o + u * 9, it.o, 0); o3.updateMatrix(); imP.setMatrixAt(i, o3.matrix); imP.setColorAt(i, on && it.s < .07 ? HOT : GRIT[it.c]); });
    imF.instanceMatrix.needsUpdate = imP.instanceMatrix.needsUpdate = true; if (imF.instanceColor) imF.instanceColor.needsUpdate = true; if (imP.instanceColor) imP.instanceColor.needsUpdate = true;
    dust.forEach(d => { const k = go ? (T * .16 + d.ph) % 1 : d.ph, base = d.hop ? new V3(H.x + .6, H.top, 0) : hit; d.m.position.set(base.x + d.dx * (.3 + k), base.y + .3 + k * 1.8, d.dz * (.3 + k * .6)); const s = (d.hop ? 1.2 : 1.8) + k * 2.2; d.m.scale.set(s, s, 1); d.m.material.opacity = Math.sin(Math.PI * k) * (d.hop ? .12 : .17); });
    return go || hl > .01;
  };
  return out;
}
