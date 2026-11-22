/* scene: two stones through rain and wet-dry cycles (Construction Boulders, "weathering"). One continuous loop, no controls.
   A sound dark stone and a weathered brown one, both wrapped in OM GROUP's own stone photographs (assets/s3dstone). Rain falls as fine motion-blurred streaks and
   splashes on the ground; the stones darken and gloss as they get wet and dry out again between showers. On the weathered stone a crack network opens up
   (a procedural Voronoi crack pattern in the stone's own shader, so the cracks sit in the surface and catch the light) and pieces break off, fall, bounce and
   lie around its base. Nothing here is a test, a measurement or a service life. 1 unit = 1 m. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
const { mk, clamp, sm, lerp } = L;
const V3 = THREE.Vector3;
const LOOP = 44;                                    /* seconds for one pass through the weather */

/* a photo-stone material that can crack and get wet: uCrack 0..1 opens the crack network, uWet 0..1 darkens and glosses */
function weatherStone(opts, crack, U) {
  const m = realStoneMaterial({ ...opts, own: true });
  m.color.setRGB(...(opts.rgb || [1, 1, 1]));
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = sh => {
    prev(sh); sh.uniforms.uWet = U.wet; sh.uniforms.uCrack = crack ? U.crack : { value: 0 };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uWet, uCrack;
vec3 wxH3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
vec2 wxW(vec3 p){ vec3 i = floor(p), f = fract(p); float d1 = 9., d2 = 9.;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec3 g = vec3(float(x), float(y), float(z)); vec3 r = g + wxH3(i + g) - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return vec2(sqrt(d1), sqrt(d2)); }
float wxCrack(vec3 p, float prog){
  vec3 q = p * 1.25 + .5 * sin(p.yzx * 3.2 + 1.7); vec2 w = wxW(q); float e = w.y - w.x;
  float zone = smoothstep(.32, .72, .5 + .5 * sin(p.x * 2.3 + p.z * 1.1 + 1.) * sin(p.y * 2.9 - p.z * 1.9 + .5) + .12);
  float c = (1. - smoothstep(0., .012 + .07 * prog + fwidth(e) * 1.6, e)) * zone;
  vec2 w2 = wxW(p * 6.1 + 7.7); float c2 = (1. - smoothstep(0., .015 + .03 * prog + fwidth(w2.y - w2.x) * 1.6, w2.y - w2.x)) * smoothstep(.45, .95, prog) * zone * .8;
  return clamp(c * smoothstep(.02, .3, prog) + c2 * .65, 0., 1.); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float wxC = uCrack > .001 ? wxCrack(vOP, uCrack) : 0.;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.018, .016, .015), wxC * .94);
diffuseColor.rgb *= 1. - uWet * .46;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, .2, uWet * (1. - wxC));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ vec2 dh = vec2(dFdx(wxC), dFdy(wxC)); vec3 sgX = dFdx(-vViewPosition), sgY = dFdy(-vViewPosition); vec3 r1 = cross(sgY, normal), r2 = cross(normal, sgX); float det = dot(sgX, r1) * faceDirection;
  normal = normalize(abs(det) * normal + .3 * sign(det) * (dh.x * r1 + dh.y * r2)); }`);
  };
  m.customProgramCacheKey = () => 'wx-' + (crack ? 'c' : 'n') + '-1';
  return m;
}

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 14, key: 2.2, shadow: .26, map: 3072, y: .01 });
  const out = { scene, fov: 28, wide: true };
  const U = { wet: { value: 0 }, crack: { value: 0 } };

  /* ground: a slate pad that darkens and gets a sheen when wet */
  const floorM = new THREE.MeshStandardMaterial({ color: 0xa9a49b, roughness: .92 });
  const floor = mk(new THREE.BoxGeometry(17, .3, 9.4), floorM); floor.position.y = -.15; scene.add(floor);

  /* the two stones */
  const Q = realStones('quarry'), base = { tint: .56, bump: .04, floor: 0, gain: .95, contrast: .7, scale: .45, soft: 1 };
  const sMat = weatherStone({ ...base, tint: .13, gain: .85, rgb: [.8, .82, .9] }, false, U), wMat = weatherStone({ ...base, tint: .85, rgb: [1.18, .86, .58] }, true, U);
  const mkStone = (geo, mat, sx, sy, sz, x, ry) => { const s = new THREE.Mesh(geo, mat); s.castShadow = s.receiveShadow = true; s.scale.set(sx, sy, sz); s.rotation.y = ry; geo.computeBoundingBox(); s.position.set(x, -geo.boundingBox.min.y * sy + .01, 0); scene.add(s); return s; };
  const sound = mkStone(Q[5], sMat, 1.35, 1.2, 1.2, -3.3, .5), weak = mkStone(Q[3], wMat, 1.45, 1.15, 1.25, 3.3, -.3);
  const wb = new THREE.Box3().setFromObject(weak), wc = wb.getCenter(new V3()), wh = wb.getSize(new V3()).multiplyScalar(.5);

  /* loose pieces that come off the weathered stone: medium chunks and fine grit */
  const low = realStones('low'), pm = weatherStone({ ...base, tint: .85, rgb: [1.18, .86, .58], scale: .9, soft: 0 }, false, U), pr = rng(21), parts = [];
  const groups = [[3, 9, .13, .3], [5, 8, .08, .2], [1, 7, .05, .13], [6, 40, .025, .06]];       /* [shape, count, min size, max size] */
  groups.forEach(([sh, n, a, b]) => {
    const im = new THREE.InstancedMesh(low[sh], pm, n); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const th = .28 + pr() * .62, sz = lerp(a, b, pr()), ang = pr() * 6.283, el = .15 + pr() * .75;           /* where on the stone it breaks off */
      const start = new V3(wc.x + Math.cos(ang) * wh.x * .85 * (1 - el * .4), wc.y + (el - .3) * wh.y * 1.7, wc.z + Math.sin(ang) * wh.z * .85 * (1 - el * .4));
      const rr = wh.x * 1.0 + .25 + pr() * 1.7, ra = ang + (pr() - .5) * 1.2, rest = new V3(wc.x + Math.cos(ra) * rr, sz * .45, wc.z + Math.sin(ra) * rr * .8);
      im.setColorAt(i, col.setScalar(.8 + pr() * .4)); parts.push({ im, i, th, sz, start, rest, rot: [pr() * 6, pr() * 6, pr() * 6], age: 0, spin: [pr() - .5, pr() - .5] });
    }
    im.instanceColor.needsUpdate = true;
  });

  /* rain: fine, tilted, motion-blurred streaks (thin tapered capsules) + ring splashes on the ground */
  const NR = 800, rainM = new THREE.MeshBasicMaterial({ color: 0x6f8396, transparent: true, opacity: .3, depthWrite: false });
  const rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(.008, .014, 1, 4), rainM, NR); rain.frustumCulled = false; rain.castShadow = false; scene.add(rain);
  const rr = rng(8), drops = Array.from({ length: NR }, () => ({ x: (rr() - .5) * 18, z: (rr() - .5) * 11, ph: rr(), sp: 12 + rr() * 5, len: .5 + rr() * .5, near: rr() }));
  const NS = 150, splM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthWrite: false }), spl = new THREE.InstancedMesh(new THREE.RingGeometry(.82, 1, 20), splM, NS);
  spl.frustumCulled = false; spl.castShadow = false; spl.rotation.x = -Math.PI / 2; spl.position.y = .015; scene.add(spl);
  const sr = rng(13), sp = Array.from({ length: NS }, () => ({ x: (sr() - .5) * 15, z: (sr() - .5) * 8, ph: sr(), per: .5 + sr() * .35 }));
  const o = new THREE.Object3D(), col = new THREE.Color(), tilt = .13;

  /* the camera and the markers (numbers, with a key beside the picture) */
  out.views = { all: { az: -10, el: 14, dist: 16.5, t: [0, 1.3, 0] } }; out.limits = { az: [-60, 60], el: [5, 45], dist: [9, 40] };
  const lab = (id, text, a, tone) => ({ id, text, side: 'r', tone, anchor: a, show: () => true });
  out.labels = [lab('s', 'Sound stone', new V3(-3.3, 2.7, 0), 'hot'), lab('w', 'Weathered stone: weak zones and surface breakdown', new V3(3.3, 3.0, 0), 'warn'),
    lab('c', 'Cracks opening in the surface', new V3(4.4, 1.2, 1.5), ''), lab('f', 'Loose fragments that have fallen', new V3(5.1, .2, 1.9), ''), lab('r', 'Rainfall and wet-dry cycles', new V3(0, 5.6, 0), '')];

  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rainAt = u => Math.max(smooth(.03, .06, u) - smooth(.27, .31, u), smooth(.42, .45, u) - smooth(.62, .66, u), smooth(.74, .77, u) - smooth(.88, .92, u));
  let T = 0, wet = 0, last = -1;
  out.update = (t, dt) => {
    const go = !reduceM(); if (go) T += dt; const u = go ? (T % LOOP) / LOOP : .86;
    const ri = go ? rainAt(u) : .0, wantWet = go ? Math.max(ri, 0) : .75;
    wet += (wantWet - wet) * (1 - Math.exp(-dt * (wantWet > wet ? .9 : .22))); if (!go) wet = .75; U.wet.value = clamp(wet);
    const prog = go ? smooth(.06, .9, u) * (1 - smooth(.965, 1, u)) : .85; U.crack.value = prog;
    floorM.color.setScalar(lerp(.66, .36, wet)); floorM.roughness = lerp(.92, .3, wet);
    /* rain */
    for (let i = 0; i < NR; i++) {
      const d = drops[i], on = i / NR < ri; const k = (T * d.sp / 9 + d.ph) % 1; o.position.set(d.x + k * 9 * tilt, 9 - k * 9, d.z); o.rotation.set(0, 0, tilt);
      o.scale.set(1, on ? d.len * (.7 + d.near * .6) : .0001, 1); o.updateMatrix(); rain.setMatrixAt(i, o.matrix);
    }
    rain.instanceMatrix.needsUpdate = true; rainM.opacity = .16 + .18 * ri;
    /* splashes: a ring grows and fades where a drop lands */
    for (let i = 0; i < NS; i++) {
      const d = sp[i], k = ((T / d.per) + d.ph) % 1, on = (i / NS) < ri && k < .55, e = k / .55;
      o.position.set(d.x, -d.z, 0); o.rotation.set(0, 0, 0); const s = on ? .05 + e * .28 : .0001; o.scale.set(s, s, 1); o.updateMatrix(); spl.setMatrixAt(i, o.matrix);
      col.setScalar(on ? 1 - e * .8 : 0); spl.setColorAt(i, col);
    }
    spl.instanceMatrix.needsUpdate = true; if (spl.instanceColor) spl.instanceColor.needsUpdate = true;
    /* fragments: wait on the stone until their moment, fall with gravity, bounce twice and lie still; at the end of the loop they shrink away with the cracks */
    const fade = 1 - smooth(.965, 1, u), dts = go ? dt : 0, touched = new Set();
    parts.forEach(p => {
      if (!go) p.age = prog > p.th ? 2 : 0; else { if (prog > p.th) p.age += dts; else if (prog < p.th - .05) p.age = 0; }
      const tt = clamp(p.age / .85), land = p.age - .85, g = tt * tt;
      let y = lerp(p.start.y, p.rest.y, g), x = lerp(p.start.x, p.rest.x, 1 - Math.pow(1 - tt, 1.6)), z = lerp(p.start.z, p.rest.z, 1 - Math.pow(1 - tt, 1.6));
      if (land > 0) y += Math.abs(Math.sin(land * 9)) * .16 * Math.exp(-land * 4.2) * p.sz * 6, x += p.spin[0] * .35 * (1 - Math.exp(-land * 3)) * Math.exp(-land * 1) * p.sz * 3;
      const vis = p.age > 0 ? fade : 0; o.position.set(x, y, z); o.rotation.set(p.rot[0] + p.age * p.spin[0] * 3 * (1 - clamp(land / .5)), p.rot[1] + p.age * p.spin[1] * 3 * (1 - clamp(land / .5)), p.rot[2]);
      o.scale.set(p.sz * vis + .0001, p.sz * .8 * vis + .0001, p.sz * vis + .0001); o.updateMatrix(); p.im.setMatrixAt(p.i, o.matrix); touched.add(p.im);
    });
    touched.forEach(im => { im.instanceMatrix.needsUpdate = true; });
    if (u < last) parts.forEach(p => { p.age = 0; }); last = u;
    return go;
  };
  return out;
}
