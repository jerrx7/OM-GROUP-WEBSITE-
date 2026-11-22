/* scene: the slump-cone test in six stages, with three consistencies (Ready-mix concrete page, "Slump").
   Equipment: a galvanised truncated cone on a brushed steel base plate, a tamping rod, a steel scale. Concrete is a procedural fresh-concrete material (stones in paste, pores,
   wet sheen) whose look follows its consistency: stiff concrete is dry, crumbly and matte and hardly moves; medium concrete is smooth with a rounded shoulder and settles about a third;
   fluid concrete is glossy, loses most of its height, flows out into a low spread and bleeds a film of water at its edge. The slump after the cone is lifted is a volume-conserving
   profile (the heap's volume stays equal to the cone's), reached over a time that depends on the consistency (stiff: instantly, fluid: a second or two of flowing).
   A picture of the test: no slump value is shown or implied. No labels on the picture. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
const { clamp, mk } = L;
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const H0 = 7.6, RB0 = 2.6, RT0 = 1.25;                                 /* the cone: height and the two radii (1 unit = 39.5 mm: a 300 mm cone) */
const V0 = Math.PI * H0 / 3 * (RB0 * RB0 + RB0 * RT0 + RT0 * RT0);     /* its volume: what the heap keeps after slumping */
const FIN = { low: { drop: .06, rt: 1.15, n: 1.15, m: 1.0, tau: .08 }, med: { drop: .30, rt: .95, n: 1.7, m: 1.25, tau: .45 }, high: { drop: .72, rt: .1, n: 3.2, m: 2.4, tau: 1.0 } };
const CONS = { low: 0, med: .5, high: 1 };

/* the heap's profile for a given state: returns the points (radius, y) from the base to the top and the centre of the flat top */
function profile(par, np, out) {
  const h = H0 * (1 - par.drop), { rt, n, m } = par;
  const vol = Rb => { let v = 0; for (let i = 0; i < 40; i++) { const t = (i + .5) / 40, r = rt + (Rb - rt) * Math.pow(Math.max(0, 1 - Math.pow(t, n)), 1 / m); v += r * r; } return Math.PI * h * v / 40; };
  let a = rt, b = 14; for (let i = 0; i < 22; i++) { const c = (a + b) / 2; if (vol(c) > V0) b = c; else a = c; }
  const Rb = (a + b) / 2;
  for (let j = 0; j < np; j++) { const t = j / (np - 1), r = rt + (Rb - rt) * Math.pow(Math.max(0, 1 - Math.pow(t, n)), 1 / m); out[j * 2] = r; out[j * 2 + 1] = t * h; }
  return { h, Rb };
}
function concreteMat(U) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .6, metalness: 0, envMapIntensity: .8, clearcoat: .0, clearcoatRoughness: .3 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uCons = U.cons;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aUV; varying vec2 vUVc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUVc = aUV;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uCons; varying vec2 vUVc;
vec2 cH2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float cH1(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float cN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(cH1(i), cH1(i + vec2(1, 0)), f.x), mix(cH1(i + vec2(0, 1)), cH1(i + vec2(1, 1)), f.x), f.y); }
float cF(vec2 p){ return cN(p) * .5 + cN(p * 2.1) * .3 + cN(p * 4.3) * .2; }
vec3 cV(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 9.; vec2 best = vec2(0.); float id = 0.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = cH2(i + g), r = g + o - f; float dd = dot(r, r); if (dd < d) { d = dd; best = r; id = cH1(i + g + 7.7); } }
  return vec3(best, id); }
vec3 stoneCol(float id, float v){ vec3 c = id < .38 ? vec3(.30, .31, .32) : id < .66 ? vec3(.15, .15, .16) : id < .88 ? vec3(.44, .38, .29) : vec3(.55, .54, .50); return c * (.78 + .44 * v); }
float concH; vec3 concAlb;
void conc(vec2 uv){
  float fl = uCons, big = 1.9;
  vec3 v1 = cV(uv * big); vec2 q1 = v1.xy; float d1 = mix(length(q1), max(abs(q1.x) * .95 + abs(q1.y) * .45, abs(q1.y) * .95 + abs(q1.x) * .45), .55);
  float r1 = (.30 + .16 * cH1(vec2(v1.z * 91.7, 3.3))) * mix(1., .55, fl);
  float s1 = 1. - smoothstep(r1 - .14, r1, d1 + .05 * cN(uv * 9.));
  vec3 v2 = cV(uv * 5. + 17.3); vec2 q2 = v2.xy; float d2 = mix(length(q2), max(abs(q2.x) * .95 + abs(q2.y) * .45, abs(q2.y) * .95 + abs(q2.x) * .45), .55);
  float r2 = (.22 + .14 * cH1(vec2(v2.z * 53.1, 9.1))) * mix(1., .6, fl); float s2 = (1. - smoothstep(r2 - .12, r2, d2)) * (1. - s1);
  vec3 paste = mix(vec3(.44, .435, .42), vec3(.34, .34, .335), fl) * (.82 + .3 * cF(uv * 6.));
  float ao = smoothstep(r1, r1 + .22, d1); paste *= .82 + .18 * ao;
  vec3 c1 = stoneCol(v1.z, cF(uv * 8. + v1.z * 40.)), c2 = stoneCol(v2.z, cF(uv * 14.));
  concAlb = mix(mix(paste, c2, s2), c1, s1); concH = s1 * .5 + s2 * .26 + (cF(uv * 11.) - .5) * .14;
  concAlb *= mix(1., .8, fl);                                                     /* wetter concrete is darker */
}`)
      .replace('#include <map_fragment>', '#include <map_fragment>\nconc(vUVc); diffuseColor.rgb *= concAlb * .78;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(.86, .16, uCons) + (cF(vUVc * 7.) - .5) * .1;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ vec2 dh = vec2(dFdx(concH), dFdy(concH)); vec3 sgX = dFdx(-vViewPosition), sgY = dFdy(-vViewPosition); vec3 r1 = cross(sgY, normal), r2 = cross(normal, sgX); float det = dot(sgX, r1) * faceDirection;
  normal = normalize(abs(det) * normal - mix(.28, .08, uCons) * sign(det) * (dh.x * r1 + dh.y * r2)); }`);
  };
  m.customProgramCacheKey = () => 'slump-conc-1';
  return m;
}
function plateTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const g = cv.getContext('2d'), r = rng(9); g.fillStyle = '#8c9096'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2400; i++) { const y = r() * 1024, l = 200 + r() * 800, x = r() * 1024; g.strokeStyle = 'rgba(' + (r() < .5 ? '255,255,255' : '40,42,46') + ',' + (.025 + r() * .05) + ')'; g.lineWidth = .6 + r() * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - .5) * 3); g.stroke(); }
  for (let i = 0; i < 90; i++) { const x = r() * 1024, y = r() * 1024, rr = 4 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(60,52,46,.16)'); gr.addColorStop(1, 'rgba(60,52,46,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }   /* old splashes */
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function rulerTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 1024; const g = cv.getContext('2d'); g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, 128, 1024); g.fillStyle = '#16171a'; g.font = '600 20px Inter, Arial'; g.textAlign = 'right';
  for (let i = 0; i <= 50; i++) { const y = 10 + i * 20, big = i % 5 === 0; g.fillRect(big ? 64 : 84, y, big ? 60 : 40, big ? 3 : 2); if (big && i < 50) g.fillText(String(i / 5 * 1), 56, y + 22); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 20, key: 2.3, shadow: .3, map: 3072, y: .01 });
  const out = { scene, fov: 28, wide: true };
  /* a pale bench and the steel base plate */
  const bench = mk(new THREE.BoxGeometry(52, .6, 30), new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: .5, envMapIntensity: .8 }), { cast: false }); bench.position.set(-2, -.9, 0); scene.add(bench);
  const pt = plateTex(), plate = mk(new THREE.BoxGeometry(17, .6, 17), new THREE.MeshStandardMaterial({ map: pt, color: 0xffffff, roughness: .38, metalness: .9, envMapIntensity: 1.2 })); plate.position.y = -.3; scene.add(plate);
  [[-7.7, -7.7], [7.7, -7.7], [-7.7, 7.7], [7.7, 7.7]].forEach(([x, z]) => { const b = mk(new THREE.CylinderGeometry(.34, .34, .16, 6), new THREE.MeshStandardMaterial({ color: 0x4a4d52, metalness: .9, roughness: .35 })); b.position.set(x, .06, z); scene.add(b); });
  /* the cone: galvanised sheet with a rolled top rim, a seam and two foot lugs; a lathe, slightly see-through so the filling shows */
  const moldMat = new THREE.MeshPhysicalMaterial({ color: 0xc3c7cc, metalness: .85, roughness: .32, side: THREE.DoubleSide, transparent: true, opacity: .34, depthWrite: false, envMapIntensity: 1.5, clearcoat: .4 });
  const steelM = new THREE.MeshStandardMaterial({ color: 0xaeb3b9, metalness: .95, roughness: .3, envMapIntensity: 1.3 });
  const mold = new THREE.Group(); scene.add(mold);
  const shell = mk(new THREE.LatheGeometry([new THREE.Vector2(RB0, 0), new THREE.Vector2(RT0, H0)], 72), moldMat, { cast: false }); mold.add(shell);
  const rimTop = mk(new THREE.TorusGeometry(RT0, .09, 10, 48), steelM); rimTop.rotation.x = Math.PI / 2; rimTop.position.y = H0; mold.add(rimTop);
  const rimBot = mk(new THREE.TorusGeometry(RB0, .1, 10, 56), steelM); rimBot.rotation.x = Math.PI / 2; rimBot.position.y = .08; mold.add(rimBot);
  [-1, 1].forEach(s => { const lug = mk(new THREE.BoxGeometry(1.5, .1, .8), steelM); lug.position.set(s * (RB0 + .65), .55, 0); mold.add(lug); const br = mk(new THREE.BoxGeometry(.1, .5, .7), steelM); br.position.set(s * (RB0 + .02 - .0), .35, 0); mold.add(br); });
  const seam = mk(new THREE.BoxGeometry(.06, H0, .04), steelM); seam.position.set(0, H0 / 2, RB0 * .64 + .02); seam.rotation.x = Math.atan2(RB0 - RT0, H0) * -1; mold.add(seam);
  /* the concrete: one lathe with a flat top that is rebuilt as it fills and as it slumps */
  const NR = 72, NP = 44, ptsN = NP * 2 + 2, prof = new Float32Array(NP * 2);
  const pos = new Float32Array(NR * (NP + 1) * 3), uv = new Float32Array(NR * (NP + 1) * 2), idx = [], rn = new Float32Array(NR * (NP + 1)), rr = rng(33);
  for (let i = 0; i < rn.length; i++) rn[i] = rr();
  for (let j = 0; j < NP; j++) for (let i = 0; i < NR; i++) { const a = j * NR + i, b = j * NR + (i + 1) % NR, c = (j + 1) * NR + i, d = (j + 1) * NR + (i + 1) % NR; idx.push(a, c, b, b, c, d); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('aUV', new THREE.BufferAttribute(uv, 2)); cg.setIndex(idx);
  const U = { cons: { value: .5 } }, cMat = concreteMat(U); const heap = new THREE.Mesh(cg, cMat); heap.castShadow = heap.receiveShadow = true; heap.frustumCulled = false; scene.add(heap);
  /* a film of bleed water at the edge of the fluid concrete */
  const film = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshPhysicalMaterial({ color: 0xc9d3d6, roughness: .05, transparent: true, opacity: 0, depthWrite: false, clearcoat: 1, envMapIntensity: 2 })); film.rotation.x = -Math.PI / 2; film.position.y = .012; film.renderOrder = 3; scene.add(film);
  /* tools */
  const rod = mk(new THREE.CylinderGeometry(.16, .16, 12, 16), steelM); const tip = mk(new THREE.SphereGeometry(.16, 12, 8), steelM); tip.position.y = -6; rod.add(tip); scene.add(rod);
  const rulerM = new THREE.MeshStandardMaterial({ map: rulerTex(), metalness: .6, roughness: .4, envMapIntensity: 1.1 }), ruler = mk(new THREE.BoxGeometry(.7, 1, .06), rulerM); ruler.visible = false; scene.add(ruler);
  const dim = mk(new THREE.CylinderGeometry(.06, .06, 1, 10), new THREE.MeshStandardMaterial({ color: 0xff5e29, emissive: 0xff5e29, emissiveIntensity: .35, roughness: .4 }), { cast: false }); dim.visible = false; scene.add(dim);
  const bucket = new THREE.Group(); { const bm = new THREE.MeshStandardMaterial({ color: 0x35373b, roughness: .5, metalness: .6, side: THREE.DoubleSide }); const b = mk(new THREE.CylinderGeometry(1.5, 1.2, 2.4, 40, 1, true), bm); b.position.y = 1.2; bucket.add(b); const base = mk(new THREE.CylinderGeometry(1.2, 1.2, .08, 40), bm); bucket.add(base);
    const top = mk(new THREE.CircleGeometry(1.4, 40), cMat); top.rotation.x = -Math.PI / 2; top.position.y = 2.0; top.userData.bucket = 1; bucket.add(top); const rim = mk(new THREE.TorusGeometry(1.5, .06, 8, 40), bm); rim.rotation.x = Math.PI / 2; rim.position.y = 2.4; bucket.add(rim);
    const bu = new Float32Array(41 * 2); const tg = top.geometry; tg.setAttribute('aUV', new THREE.BufferAttribute(new Float32Array(tg.attributes.position.count * 2).map((v, i) => (i % 2 ? tg.attributes.position.getY(i >> 1) : tg.attributes.position.getX(i >> 1)) * 1.2), 2)); }
  bucket.position.set(-10.5, 0, 4.8); scene.add(bucket);
  const scoop = new THREE.Group(); { const sm_ = new THREE.MeshStandardMaterial({ color: 0xb4b8bd, metalness: .9, roughness: .3 }), bl = mk(new THREE.BoxGeometry(1.5, .06, 1.1), sm_); bl.position.set(0, .05, 0); scoop.add(bl); const hd = mk(new THREE.CylinderGeometry(.09, .09, 1.7, 10), new THREE.MeshStandardMaterial({ color: 0x6a4a2f, roughness: .7 })); hd.rotation.z = Math.PI / 2; hd.position.set(1.55, .22, 0); scoop.add(hd); }
  scoop.position.set(-8.6, .1, 6.8); scoop.rotation.y = .4; scene.add(scoop);

  out.views = { all: { az: -22, el: 16, dist: 36, t: [-1.8, 3.9, 0] } };
  out.limits = { az: [-70, 45], el: [6, 50], dist: [14, 60] };
  out.labels = [];
  const cur = { fill: 0, lift: 0, aside: 0, sub: 0, cons: 1e9, lastKey: '', rodT: 0, spread: 0, tSub: 0 };
  const par = { drop: 0, rt: RT0, n: 1, m: 1 }, tmp = new Float32Array(NP * 2);
  const smooth = (a, b, k) => a + (b - a) * k;
  const build = (fill, shapeMode, sub, c) => {
    let prr, h, Rb;
    if (shapeMode === 0) { h = H0 * fill; for (let j = 0; j < NP; j++) { const t = j / (NP - 1), y = t * h; tmp[j * 2] = (RB0 - (RB0 - RT0) * (y / H0)) * .985; tmp[j * 2 + 1] = y; } Rb = RB0; }
    else { const o = profile(par, NP, tmp); h = o.h; Rb = o.Rb; }
    const crumble = (1 - c) * (.1 + .16 * sub) + (1 - c) * .04, jag = shapeMode === 0 ? 0 : 1;
    let p = 0, q = 0;
    for (let j = 0; j <= NP; j++) {
      const jj = Math.min(j, NP - 1), r0 = j < NP ? tmp[jj * 2] : 0, y0 = j < NP ? tmp[jj * 2 + 1] : tmp[(NP - 1) * 2 + 1] + 0;
      for (let i = 0; i < NR; i++) {
        const a = i / NR * TAU, n = rn[j * NR + i];
        const rough = (j > 0 && j < NP ? (n - .5) * crumble : 0) + (j === NP ? 0 : 0);
        const rad = Math.max(0, r0 + rough), y = y0 + (j === NP ? 0 : (n - .5) * crumble * .25 * (j < NP - 1 ? 1 : .4));
        pos[p++] = Math.cos(a) * rad; pos[p++] = y; pos[p++] = Math.sin(a) * rad; uv[q++] = a * 2.3; uv[q++] = (j === NP ? tmp[(NP - 1) * 2 + 1] : y0) * 1.0 + (j === NP ? 0 : 0);
      }
    }
    cg.attributes.position.needsUpdate = true; cg.attributes.aUV.needsUpdate = true; cg.computeVertexNormals();
    return { h, Rb };
  };
  out.update = (t, dt, st) => {
    const go = !reduceM(), s = st.stage ?? 0, key = st.cons || 'med', F = FIN[key], c = CONS[key], k = go ? 1 - Math.exp(-dt * 4) : 1; let moving = false;
    if (cur.cons > 1e8) { cur.cons = c; }
    cur.cons += (c - cur.cons) * k; U.cons.value = cur.cons; if (Math.abs(c - cur.cons) > .004) moving = true;
    const tf = s === 0 ? 0 : s === 1 ? .66 : 1, tl = s >= 3 ? 1 : 0, ta = s >= 4 ? 1 : 0;
    cur.fill += (tf - cur.fill) * (go ? 1 - Math.exp(-dt * 2.2) : 1); cur.lift += (tl - cur.lift) * (go ? 1 - Math.exp(-dt * 2.4) : 1); cur.aside += (ta - cur.aside) * (go ? 1 - Math.exp(-dt * 2.2) : 1);
    /* the slump happens once the cone has moved clear: a time-based flow whose speed depends on the consistency */
    if (s >= 4) cur.tSub = go ? cur.tSub + dt : 99; else cur.tSub = 0;
    const subT = s >= 4 ? 1 - Math.exp(-cur.tSub / F.tau) : 0; cur.sub += (subT - cur.sub) * (go ? 1 : 1);
    const sub = clamp(cur.sub);
    ['drop', 'rt', 'n', 'm'].forEach(kx => { par[kx] = kx === 'drop' ? F.drop * sub : kx === 'rt' ? smooth(RT0, F.rt, sub) : kx === 'n' ? smooth(1, F.n, sub) : smooth(1, F.m, sub); });
    const mode = s >= 3 ? 1 : 0, o = build(cur.fill, mode, sub, cur.cons);
    heap.visible = cur.fill > .015; moving = moving || Math.abs(tf - cur.fill) > .004 || Math.abs(tl - cur.lift) > .004 || Math.abs(ta - cur.aside) > .004 || (s >= 4 && sub < .995);
    /* the cone: lifts, then goes upside down beside the heap */
    const lift = cur.lift, as = cur.aside, ly = lift * 15;
    mold.position.set(-as * 8.8, as ? ly * (1 - as) + as * H0 : ly, as * 0); mold.rotation.z = as * Math.PI; mold.rotation.x = 0;
    if (as > .001) mold.position.y = ly * (1 - as) + H0 * as;
    /* the tamping rod: works up and down above the cone while it is compacted, then lies across the upturned cone as the reference */
    cur.rodT += go ? dt * 6 : 0;
    const tamp = s === 2, ref = s >= 4;
    if (!ref) { rod.rotation.set(0, 0, s === 2 ? 0 : .45); rod.position.set(s === 2 ? .3 + Math.sin(cur.rodT * .5) * .7 : 7.4, s === 2 ? 9.2 + Math.abs(Math.sin(cur.rodT)) * 2.6 - 3.2 + 3.2 : 5.9, s === 2 ? Math.cos(cur.rodT * .5) * .7 : 3.2); }
    else { rod.rotation.set(0, 0, Math.PI / 2); rod.position.set(-2.8, H0 + .18, -.2); }
    /* the scale and the measurement: from the rod down to the top of the slumped heap */
    const top = o.h, drop = H0 - top; ruler.visible = dim.visible = s === 5 && sub > .5; const rl = H0 + .1 - top; ruler.scale.set(1, Math.max(.1, rl), 1); ruler.position.set(.9, top + rl / 2, .9); dim.scale.set(1, Math.max(.05, drop), 1); dim.position.set(0, top + (H0 - top) / 2 + .15, 0);
    heap.scale.set(1, 1, 1);
    film.visible = true; const fa = clamp((cur.cons - .6) * 2.5) * clamp(sub * 1.2), rr_ = mode === 1 ? o.Rb : 0; film.scale.set(rr_ * 1.08 + .001, rr_ * 1.08 + .001, 1); film.material.opacity = fa * .55;
    bucket.visible = s <= 1; scoop.visible = s <= 1; bucket.children.forEach(ch => { if (ch.userData.bucket) ch.material = cMat; });
    return go && (s === 2 || moving) || moving;
  };
  return out;
}
