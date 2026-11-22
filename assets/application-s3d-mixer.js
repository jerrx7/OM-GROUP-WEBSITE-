/* scene: the transit mixer with its drum turning (Ready-mix concrete page, the reveal). One continuous animation, no controls.
   The truck is a Blender model (scripts/excavator3d/build-mixer.py -> assets/3d/om-group-transit-mixer.glb): white cab with the OM GROUP mark on both doors, tilted drum with the orange
   outer helix, two inner mixing blades. The drum turns about its real axis; a fixed cutaway window in the near side of the shell shows the inside: the far wall with the blades
   sweeping up it, and the fresh concrete lying in the lower part of the drum, built here from the drum's own radius profile. The concrete surface rolls and ripples, and its
   aggregate-in-paste texture is carried round by the wall and creeps along the surface, so the mix visibly moves. Generic truck and generic concrete: no volume, mix or time is shown. */
import { THREE, L, studio } from '/assets/application-s3d.js';
import { crispLogo } from '/assets/application-s3d-flow.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
const { clamp } = L;
const V3 = THREE.Vector3;

const GLB = '/assets/3d/om-group-transit-mixer.glb', JS = await (await fetch('/assets/3d/om-group-transit-mixer.json')).json();
const TEMPLATE = (await new GLTFLoader().loadAsync(GLB)).scene;
{
  const mats = new Set(); TEMPLATE.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; mats.add(o.material); });
  mats.forEach(m => {
    const n = m.name || ''; m.envMapIntensity = .9;
    if (/PaintWhiteCab/.test(n)) m.envMapIntensity = .8;
    if (/Tyre/.test(n)) m.envMapIntensity = .35;
    if (/Chrome/.test(n)) { m.roughness = .4; m.envMapIntensity = .85; }
    if (/Machined|RimSteel|Galvanised/.test(n)) { m.envMapIntensity = 1.0; m.roughness = Math.max(m.roughness, .9); }
    if (/CabGlass/.test(n)) { m.envMapIntensity = 1.5; m.transparent = true; m.depthWrite = false; m.opacity = .6; }
    if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
    if (/DecalWhite|Stripe|Reflective/.test(n)) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; }
    if (m.map) m.map.anisotropy = 8;
  });
  TEMPLATE.traverse(o => { if (o.isMesh && /Logo_/.test(o.name)) o.renderOrder = 3; });
}

/* the profile of the drum (local x along the axis, radius) */
const PX = JS.profile.map(p => p[0]), PR = JS.profile.map(p => p[1]);
const rad = x => { if (x <= PX[0]) return PR[0]; for (let i = 1; i < PX.length; i++) if (x <= PX[i]) { const t = (x - PX[i - 1]) / (PX[i] - PX[i - 1]); return PR[i - 1] + (PR[i] - PR[i - 1]) * t; } return PR[PR.length - 1]; };
const T = JS.tilt, P0 = JS.axis, THK = JS.thk;
const W = (xl, yl, zl) => new V3(P0[0] + xl * Math.cos(T) + yl * Math.sin(T), P0[1] - xl * Math.sin(T) + yl * Math.cos(T), zl);

/* fresh concrete: aggregate (stones) in cement paste, procedural, with a bump from the stones and a wet sheen */
function concreteMat(U) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .55, metalness: 0, envMapIntensity: .75, clearcoat: .22, clearcoatRoughness: .4 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uAng = U.ang; sh.uniforms.uTime = U.time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aUV; attribute float aFlow; varying vec2 vUVc; varying float vFl;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUVc = aUV; vFl = aFlow;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uAng, uTime; varying vec2 vUVc; varying float vFl;
vec2 cH2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float cH1(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float cN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(cH1(i), cH1(i + vec2(1, 0)), f.x), mix(cH1(i + vec2(0, 1)), cH1(i + vec2(1, 1)), f.x), f.y); }
float cF(vec2 p){ return cN(p) * .5 + cN(p * 2.1) * .3 + cN(p * 4.3) * .2; }
/* nearest feature point of a jittered grid: xy = offset to it, z = cell id hash */
vec3 cV(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 9.; vec2 best = vec2(0.); float id = 0.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = cH2(i + g), r = g + o - f; float dd = dot(r, r); if (dd < d) { d = dd; best = r; id = cH1(i + g + 7.7); } }
  return vec3(best, id); }
vec3 stoneCol(float id, float v){ vec3 c = id < .38 ? vec3(.30, .31, .32) : id < .66 ? vec3(.15, .15, .16) : id < .88 ? vec3(.44, .38, .29) : vec3(.55, .54, .50); return c * (.78 + .44 * v); }
float concH; vec3 concAlb;
void conc(vec2 uv){
  float big = 2.5; vec3 v1 = cV(uv * big); vec2 q1 = v1.xy; float d1 = mix(length(q1), max(abs(q1.x) * .95 + abs(q1.y) * .45, abs(q1.y) * .95 + abs(q1.x) * .45), .55); float r1 = .30 + .16 * cH1(vec2(v1.z * 91.7, 3.3));
  float s1 = 1. - smoothstep(r1 - .14, r1, d1 + .05 * cN(uv * 16.));
  vec3 v2 = cV(uv * 6.2 + 17.3); vec2 q2 = v2.xy; float d2 = mix(length(q2), max(abs(q2.x) * .95 + abs(q2.y) * .45, abs(q2.y) * .95 + abs(q2.x) * .45), .55); float r2 = .22 + .14 * cH1(vec2(v2.z * 53.1, 9.1)); float s2 = (1. - smoothstep(r2 - .12, r2, d2)) * (1. - s1);
  vec3 paste = vec3(.50, .495, .475) * (.82 + .3 * cF(uv * 9.));
  float ao = smoothstep(r1, r1 + .22, d1); paste *= .82 + .18 * ao;
  vec3 c1 = stoneCol(v1.z, cF(uv * 12. + v1.z * 40.)), c2 = stoneCol(v2.z, cF(uv * 20.));
  concAlb = mix(mix(paste, c2, s2), c1, s1); concH = s1 * .55 + s2 * .3 + (cF(uv * 14.) - .5) * .14;
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
vec2 cuv = vUVc;
if (vFl < .5) { cuv = vec2(vUVc.x * 1.0, (vUVc.y + uAng) * 1.14); } else { cuv = vec2(vUVc.x - uTime * .05 + .03 * sin(uTime * .7 + vUVc.y * 2.), vUVc.y - uTime * .17); }
conc(cuv); diffuseColor.rgb *= concAlb * 1.05;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(.34, .62, clamp(concH * 1.2 + .3, 0., 1.));')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ vec2 dh = vec2(dFdx(concH), dFdy(concH)); vec3 sgX = dFdx(-vViewPosition), sgY = dFdy(-vViewPosition); vec3 r1 = cross(sgY, normal), r2 = cross(normal, sgX); float det = dot(sgX, r1) * faceDirection;
  normal = normalize(abs(det) * normal - .2 * sign(det) * (dh.x * r1 + dh.y * r2)); }`);
  };
  m.customProgramCacheKey = () => 'mixer-conc-1';
  return m;
}

/* the cutaway: a clipped window in the drum shell + the fresh concrete inside, for a truck clone with its nodes in N. Returns { drum, update(t, ang) }. Used by this figure and by the delivery figure. */
export function drumCutaway(truck, N) {
  const drum = N.Drum, tiltN = N.DrumTilt;

  /* the cutaway window: a patch of the near side of the drum shell (and the blades and inner wall behind it) that is not drawn. Fixed in the tilted frame, not in the turning drum. */
  const u = new V3(Math.cos(T), -Math.sin(T), 0), v = new V3(Math.sin(T), Math.cos(T), 0), P = new V3(P0[0], P0[1], 0);
  const X0 = -2.3, X1 = 1.85, HW = .98;
  const pl = (n, pt) => new THREE.Plane().setFromNormalAndCoplanarPoint(n, pt);
  const planes = [pl(new V3(0, 0, -1), new V3(0, 0, .02)), pl(u.clone().negate(), P.clone().addScaledVector(u, X0)), pl(u.clone(), P.clone().addScaledVector(u, X1)), pl(v.clone().negate(), P.clone().addScaledVector(v, -HW)), pl(v.clone(), P.clone().addScaledVector(v, HW))];
  drum.traverse(o => { if (o.isMesh && /^(Drum(Outer|Inner|Blade|Ribbon)|RollerTrack|DriveFlange)/.test(o.name)) { o.material = o.material.clone(); o.material.clippingPlanes = planes; o.material.clipIntersection = true; o.material.clipShadows = true; o.material.side = THREE.DoubleSide; } });

  /* the concrete: its walls (carried round with the drum) and its free surface (a rolling, rippling plane) */
  const U = { ang: { value: 0 }, time: { value: 0 } }, cm = concreteMat(U);
  const NX = 110, XS0 = JS.xmin + .42, XS1 = JS.xmax - .06, NW = 44, NZ = 30;
  const ys = x => { const rin = rad(x) - THK - .006; return Math.max(-rin, Math.min(.64 * rin, -.2 + .27 * (x + .9))); };
  const wallPos = [], wallUV = [], wallNrm = [], wallIdx = [];
  for (let i = 0; i <= NX; i++) {
    const x = XS0 + (XS1 - XS0) * i / NX, rin = rad(x) - THK - .006, y0 = ys(x), ph = Math.acos(clamp(-y0 / rin, -1, 1));
    for (let k = 0; k <= NW; k++) { const f = -ph + 2 * ph * k / NW; const y = -rin * Math.cos(f), z = rin * Math.sin(f); wallPos.push(x, y, z); wallUV.push(x, f); wallNrm.push(0, y / rin, z / rin); }
  }
  for (let i = 0; i < NX; i++) for (let k = 0; k < NW; k++) { const a = i * (NW + 1) + k, b = (i + 1) * (NW + 1) + k, c = b + 1, d = a + 1; wallIdx.push(a, b, c, a, c, d); }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3)); wg.setAttribute('normal', new THREE.Float32BufferAttribute(wallNrm, 3)); wg.setAttribute('aUV', new THREE.Float32BufferAttribute(wallUV, 2)); wg.setAttribute('aFlow', new THREE.Float32BufferAttribute(new Float32Array(wallPos.length / 3).fill(0), 1)); wg.setIndex(wallIdx);
  const wall = new THREE.Mesh(wg, cm); wall.castShadow = wall.receiveShadow = true; wall.frustumCulled = false; tiltN.add(wall);
  const spos = new Float32Array((NX + 1) * (NZ + 1) * 3), suv = new Float32Array((NX + 1) * (NZ + 1) * 2), sidx = [], zw = [], y0s = [];
  for (let i = 0; i <= NX; i++) { const x = XS0 + (XS1 - XS0) * i / NX, rin = rad(x) - THK - .006, y0 = ys(x); y0s.push(y0); zw.push(Math.sqrt(Math.max(0, rin * rin - y0 * y0))); for (let j = 0; j <= NZ; j++) { const n = i * (NZ + 1) + j; suv[n * 2] = x; } }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = (i + 1) * (NZ + 1) + j, c = b + 1, d = a + 1; sidx.push(a, c, b, a, d, c); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(spos, 3)); sg.setAttribute('aUV', new THREE.BufferAttribute(suv, 2)); sg.setAttribute('aFlow', new THREE.Float32BufferAttribute(new Float32Array((NX + 1) * (NZ + 1)).fill(1), 1)); sg.setIndex(sidx);
  const surf = new THREE.Mesh(sg, cm); surf.castShadow = surf.receiveShadow = true; surf.frustumCulled = false; tiltN.add(surf);
  const wave = t => {
    for (let i = 0; i <= NX; i++) { const x = XS0 + (XS1 - XS0) * i / NX; for (let j = 0; j <= NZ; j++) {
      const z = -zw[i] + 2 * zw[i] * j / NZ, e = zw[i] > .01 ? 1 - Math.pow(Math.abs(z) / zw[i], 4) : 0, n = i * (NZ + 1) + j;
      const w = .028 * Math.sin(3.1 * x + 2.1 * z - 1.5 * t) + .018 * Math.sin(5.3 * x - 3.4 * z + 1.1 * t + 1.3) + .012 * Math.sin(8.7 * x + 5.7 * z - 2.2 * t);
      spos[n * 3] = x; spos[n * 3 + 1] = y0s[i] + e * (w - .06 * z / Math.max(zw[i], .3) * .6); spos[n * 3 + 2] = z; suv[n * 2 + 1] = z; } }
    sg.attributes.position.needsUpdate = true; sg.attributes.aUV.needsUpdate = true; sg.computeVertexNormals();
  };
  wave(0);

  const wp = planes.map(q => q.clone()); drum.traverse(o => { if (o.isMesh && o.material.clipIntersection) o.material.clippingPlanes = wp; });
  let on = true; const update = (TT, ang) => { truck.updateMatrixWorld(true); planes.forEach((q, i) => { wp[i].copy(q).applyMatrix4(truck.matrixWorld); }); drum.rotation.x = ang; U.ang.value = ang; U.time.value = TT; wave(TT); };
  return { drum, update, planes: wp, setVisible: v => { on = v; wall.visible = surf.visible = v; drum.traverse(o => { if (o.isMesh && o.material.clipIntersection) o.material.clippingPlanes = v ? wp : []; }); } };
}

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 13, key: 2.3, shadow: .27, map: 3072, y: .0 });
  const out = { scene, fov: 28, wide: true };
  const truck = TEMPLATE.clone(true); scene.add(truck); const N = {}; truck.traverse(o => { if (o.name) N[o.name] = o; });
  const cut = drumCutaway(truck, N); const drum = cut.drum;
  out.views = { all: { az: -26, el: 12, dist: 17.5, t: [-.3, 2.5, 0] } }; out.limits = { az: [-100, 70], el: [3, 38], dist: [6, 44] };
  const lab = (id, text, a, tone) => ({ id, text, side: 'r', tone, anchor: a, show: () => true });
  out.labels = [lab('d', 'Rotating drum', W(.2, 1.2, .55), ''), lab('c', 'Fresh concrete inside', W(.9, -.25, .4), 'hot'), lab('b', 'Mixing blades', W(-1.0, .55, -.78), '')];
  let TT = 0, ang = 0;
  out.update = (t, dt) => {
    const go = !reduceM(); if (go) { TT += dt; ang += dt * .8; }
    cut.update(TT, ang);
    return go;
  };
  return out;
}
