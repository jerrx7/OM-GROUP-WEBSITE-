/* scene: particle shape (River Sand page, "Shape and FM"): three large grains on enamel stands under macro lighting: an angular grain, a sub-rounded grain and a rounded grain.
   Each grain is a high-resolution mesh (fractured planes for the angular one, worn forms for the others) wearing a mineral shader: a triplanar Voronoi crystal texture at two scales (every crystal its own
   colour from a mineral palette: pink feldspar, white and smoky quartz and black mica for the granite grain; warm tan quartzite for the sub-rounded one; milky quartz with iron staining for the rounded one),
   crystal-edge relief, glassy quartz against matt feldspar, and a few pits. Real river sand is a mixture and its shape depends on the source and the transport history: these are forms, not scans of a sample.
   Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { mineralGrain } from '/assets/application-s3d-sand.js';
import { crushed, GLSL_HASH } from '/assets/application-s3d-msand.js';
import { cvs, tex } from '/assets/application-s3d-msmasonry.js';
const V3 = THREE.Vector3;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const FRAG_FN = `
void rsCell(vec2 p, float cs, float seed, out float id, out float id2, out float edge){
  vec2 g = p / cs + seed, i = floor(g), f = fract(g); float d1 = 9., d2 = 9.; vec2 c1 = vec2(0.);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(float(x), float(y)), c = i + o, h = sdH2(c), r = o + .12 + h * .76 - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; c1 = c; } else if (d < d2) d2 = d; }
  edge = smoothstep(0., .24, sqrt(d2) - sqrt(d1)); id = sdH(c1 + 3.7); id2 = sdH(c1 + 9.1);
}
vec3 rsPal(float h, float v, float mode, out float rg){
  vec3 c; rg = .7;
  if (mode < .5) {                        // granite: pink feldspar, white quartz, smoky quartz, black mica
    if (h < .36) { c = vec3(.52, .26, .2) * (.8 + v * .5); rg = .62; }
    else if (h < .62) { c = vec3(.66, .64, .6) * (.82 + v * .35); rg = .36; }
    else if (h < .78) { c = vec3(.3, .29, .29) * (.75 + v * .5); rg = .3; }
    else if (h < .93) { c = vec3(.04, .04, .045) * (.7 + v * .9); rg = .42; }
    else { c = vec3(.36, .3, .22) * (.8 + v * .5); rg = .6; }
  } else if (mode < 1.5) {                // quartzite / sandstone: warm tan, cream, brown
    if (h < .34) { c = vec3(.5, .35, .2) * (.8 + v * .45); rg = .7; }
    else if (h < .6) { c = vec3(.66, .56, .4) * (.82 + v * .4); rg = .5; }
    else if (h < .8) { c = vec3(.3, .19, .11) * (.75 + v * .5); rg = .75; }
    else if (h < .93) { c = vec3(.74, .7, .62) * (.85 + v * .3); rg = .4; }
    else { c = vec3(.1, .08, .07) * (.7 + v * .8); rg = .6; }
  } else {                                // milky quartz pebble: white, pale yellow, rose, grey
    if (h < .4) { c = vec3(.74, .7, .62) * (.88 + v * .25); rg = .3; }
    else if (h < .66) { c = vec3(.68, .6, .42) * (.85 + v * .3); rg = .36; }
    else if (h < .82) { c = vec3(.62, .46, .4) * (.85 + v * .3); rg = .4; }
    else { c = vec3(.44, .43, .42) * (.8 + v * .4); rg = .34; }
  }
  return c;
}
void rsTri(vec3 p, vec3 w, float cs, float seed, float mode, out vec3 col, out float edge, out float rg){
  float a, a2, ea, b, b2, eb, c, c2, ec, ra, rb, rc;
  rsCell(p.yz, cs, seed, a, a2, ea); rsCell(p.xz, cs, seed + 7.3, b, b2, eb); rsCell(p.xy, cs, seed + 13.1, c, c2, ec);
  vec3 ca = rsPal(a, a2, mode, ra), cb = rsPal(b, b2, mode, rb), cc = rsPal(c, c2, mode, rc);
  col = ca * w.x + cb * w.y + cc * w.z; edge = ea * w.x + eb * w.y + ec * w.z; rg = ra * w.x + rb * w.y + rc * w.z;
}`;
const MAP = `
vec3 rsW = pow(abs(normalize(vON)), vec3(5.)); rsW /= (rsW.x + rsW.y + rsW.z);
vec3 rsP = vOP + (vec3(sdn3(vOP * 5.), sdn3(vOP * 5. + 3.1), sdn3(vOP * 5. + 6.2)) - .5) * .07;   // irregular crystal boundaries
vec3 rsCF, rsCM; float rsEF, rsEM, rsRF, rsRM;
rsTri(rsP, rsW, uCs.x, 3.1, uMode, rsCF, rsEF, rsRF);
rsTri(rsP + 4.7, rsW, uCs.y, 9.4, uMode, rsCM, rsEM, rsRM);
float rsPx = length(fwidth(vOP)) + 1e-5, aaF = smoothstep(.5, 1.8, uCs.x / rsPx), aaM = smoothstep(.5, 1.8, uCs.y / rsPx);
vec3 rsMean = uMode < .5 ? vec3(.36, .27, .23) : (uMode < 1.5 ? vec3(.5, .37, .25) : vec3(.62, .55, .46));
rsCM = mix(rsMean, rsCM, aaM); rsEM = mix(1., rsEM, aaM); rsRM = mix(.55, rsRM, aaM); rsCF = mix(rsCM, rsCF, aaF); rsEF = mix(1., rsEF, aaF); rsRF = mix(rsRM, rsRF, aaF);
float rsPick = step(.5, sdn3(vOP * 2.3 + 1.7));
vec3 rsC = mix(rsCF * mix(1. - uEd, 1., rsEF), rsCM * mix(1. - uEd, 1., rsEM), rsPick * step(.05, rsEM)); float rsRg = mix(rsRF, rsRM, rsPick);
float rsMot = sdn3(vOP * 1.4 + 9.) * .5 + sdn3(vOP * 3.3) * .3; rsC = mix(rsMean * (.72 + .6 * rsMot), rsC * (.76 + .5 * rsMot), uCon);
if (uMode > 1.5) { float st = smoothstep(.56, .74, sdn3(vOP * 1.9 + 5.)); rsC = mix(rsC, vec3(.4, .18, .08) * (.8 + .4 * sdn3(vOP * 7.)), st * .72); rsRg = mix(rsRg, .6, st); }
if (uMode > .5 && uMode < 1.5) { float st = smoothstep(.62, .8, sdn3(vOP * 2.1 + 2.)); rsC = mix(rsC, vec3(.34, .18, .09), st * .5); }
float rsPit = smoothstep(.8, .92, sdn3(vOP * 18. + 3.) * .6 + sdn3(vOP * 40.) * .4); rsC *= 1. - rsPit * .5;
float rsHt = (rsEF * .22 + rsEM * .2) * uEd * 5. + sdn3(vOP * 30.) * .4 + sdn3(vOP * 9.) * .35 - rsPit * .5;
diffuseColor.rgb = rsC * uTint;
`;
function grainMat(mode, tint = [1, 1, 1], p = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, metalness: 0, envMapIntensity: .75 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uMode = { value: mode }; sh.uniforms.uTint = { value: new THREE.Vector3(...tint) }; sh.uniforms.uBump = { value: p.bump ?? .06 }; sh.uniforms.uCs = { value: new THREE.Vector2(...(p.cs || [.05, .15])) }; sh.uniforms.uCon = { value: p.con ?? 1 }; sh.uniforms.uEd = { value: p.ed ?? .12 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON; uniform float uMode, uBump, uCon, uEd; uniform vec3 uTint; uniform vec2 uCs;\n' + GLSL_HASH + FRAG_FN)
      .replace('#include <map_fragment>', MAP)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(rsRg + (rsEF - .5) * .06, .2, .95);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ vec2 dh = vec2(dFdx(rsHt), dFdy(rsHt)); vec3 sigX = dFdx(-vViewPosition), sigY = dFdy(-vViewPosition), r1 = cross(sigY, normal), r2 = cross(normal, sigX); float det = dot(sigX, r1) * faceDirection;
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2); normal = normalize(abs(det) * normal - uBump * grad); }`);
  };
  m.customProgramCacheKey = () => 'rsgrain-v2-' + mode;
  return m;
}

export default function build({ state } = {}) {
  const four = !!(state && state.set === 'four');                 /* the concrete-sand page: rounded, sub-rounded, angular crushed and irregular (a flaky grain) */
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 16, key: 2.5, shadow: 0, map: 4096, ground: false });
  key.shadow.bias = -.0001; key.shadow.normalBias = .02;
  /* the bench */
  { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); }
    const t = tex(b); t.repeat.set(40, 24); const bench = new THREE.Mesh(new THREE.BoxGeometry(200, 1, 120), new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: 0, envMapIntensity: .8 })); bench.position.set(0, -.5, 0); bench.receiveShadow = true; scene.add(bench); }
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: .24, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9 }), hotM = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 });
  const prof = [[0, 0], [2.6, 0], [2.78, .1], [2.78, .5], [2.62, .62], [2.3, .66], [0, .66]].map(p => new THREE.Vector2(p[0], p[1])), plG = new THREE.LatheGeometry(prof, 80);
  const K0 = [
    { k: 'ang', name: 'Angular', x: -7.2, mesh: () => crushed(41, 'ang'), mode: 0, p: { cs: [.034, .1], con: 1, ed: .1, bump: .06 }, tint: [1, 1, 1], scale: [1.95, 1.7, 1.95], rot: [.35, .5, .12] },
    { k: 'sub', name: 'Sub-rounded', x: 0, mesh: () => mineralGrain('sub', 27, { w: 240, h: 160 }), mode: 1, p: { cs: [.032, .1], con: .72, ed: .1, bump: .06 }, tint: [1, 1, 1], scale: [1.95, 1.95, 1.95], rot: [.3, 1.3, .1] },
    { k: 'rnd', name: 'Rounded', x: 7.2, mesh: () => mineralGrain('rnd', 43, { w: 240, h: 160 }), mode: 2, p: { cs: [.022, .07], con: .45, ed: .05, bump: .035 }, tint: [1, 1, 1], scale: [1.95, 1.95, 1.95], rot: [.3, 2.6, .1] },
  ];
  const K = four ? [{ ...K0[2], x: -10.8 }, { ...K0[1], x: -3.6 }, { ...K0[0], x: 3.6, name: 'Angular crushed' }, { k: 'irr', name: 'Irregular', x: 10.8, mesh: () => crushed(61, 'flaky'), mode: 0, p: { cs: [.034, .1], con: 1, ed: .1, bump: .06 }, tint: [1, 1, 1], scale: [1.45, 1.95, 1.45], rot: [.2, .6, .1] }] : K0;
  const items = K.map(o => {
    const g = new THREE.Group(); g.position.x = o.x; scene.add(g);
    const pl = new THREE.Mesh(plG, enamel); pl.castShadow = pl.receiveShadow = true; g.add(pl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, .07, 10, 80), enamel); ring.rotation.x = Math.PI / 2; ring.position.y = .5; g.add(ring);
    const geo = o.mesh(); geo.computeBoundingBox(); const bb = geo.boundingBox, gr = new THREE.Mesh(geo, grainMat(o.mode, o.tint, o.p));
    gr.scale.set(...o.scale); gr.rotation.set(...o.rot); gr.updateMatrixWorld(); const bb2 = new THREE.Box3().setFromObject(gr, true); gr.position.y = .62 - bb2.min.y + .02; gr.castShadow = gr.receiveShadow = true; g.add(gr);
    o.top = gr.position.y + bb2.max.y - bb2.min.y; return { ...o, g, gr, ring };
  });
  const baseRing = enamel;
  const views = { all: { az: -6, el: 20, dist: four ? 33 : 25, t: [0, 2.2, 0] }, ...Object.fromEntries(K.map(o => [o.k, { az: -14, el: 16, dist: 11, t: [o.x, 2.4, 0] }])) };
  if (innerWidth < 640) views.all.dist = four ? 41 : 31;
  const labels = items.map(o => ({ id: o.k, text: o.name, side: 'r', anchor: new V3(o.x, o.top + .3, 0), show: st => st.view === 'all' || st.view === o.k }));
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-80, 80], el: [4, 70], dist: [6, 50] },
    update(t, dt, st) {
      let a = false;
      items.forEach(o => { const sel = st.view === o.k; o.ring.material = sel ? hotM : baseRing; if (!reduce()) { o.gr.rotation.y += dt * (sel ? .4 : .12); a = true; } });
      return a;
    },
  };
}
