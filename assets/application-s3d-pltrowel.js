/* scene: from sand to a plastered wall (Plaster Sand page). Two sets, one module.
   reveal : plaster-grade sand falls into a heap of real fractured grains, becomes mortar on a hawk, and a steel trowel loads from the hawk and carries it across a brick wall in three passes;
            the plaster front follows the blade (a ridge of fresh, glossy mortar ahead of it), then the wet layer dries from a rough coat to a floated, sponge-finished surface.
   work   : the six movements of applying plaster (loading, spreading, levelling, ruling, floating, finishing); the surface changes with each.
   The tools and the brick wall are a Blender model (scripts/plaster3d/build-plaster-kit.py -> assets/3d/plaster-kit.glb: real bevels, baked PBR); the plaster layer is a live height-field whose
   surface blends three baked sets (assets/plaster3d). The tools are simplified and the surface does not become perfect on its own. No mix, thickness or finish quality is shown or implied. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, plant, mineral, buildHeap, sandOf } from '/assets/application-s3d-msand.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t, ease = t => .5 * (t + sm(0, 1, t));      /* a sweep that starts and ends softly but keeps its speed in the middle */
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const PT = sandOf({ sand: 'plaster' });

/* the model and the three plaster surface sets are loaded once, when the module is first used */
const KIT = (await new GLTFLoader().loadAsync('/assets/3d/plaster-kit.glb')).scene;
const tl = new THREE.TextureLoader(), loadTex = async (u, srgb) => { const t = await tl.loadAsync(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const PL = {}; for (const k of ['c1', 'c2', 'c3']) PL[k] = { a: await loadTex('/assets/plaster3d/pl-' + k + '-a.webp', true), n: await loadTex('/assets/plaster3d/pl-' + k + '-n.webp', false) };

/* the plaster material: the rough coat, the floated surface and the sponge finish are blended by uKind (0..2); aWet (per vertex) darkens and glosses fresh mortar */
function plasterMaterial() {
  const m = new THREE.MeshStandardMaterial({ map: PL.c1.a, normalMap: PL.c1.n, normalScale: new THREE.Vector2(1.15, 1.15), roughness: .93, metalness: 0, envMapIntensity: .6 });
  const U = { uKind: { value: 0 }, uA2: { value: PL.c2.a }, uA3: { value: PL.c3.a }, uN2: { value: PL.c2.n }, uN3: { value: PL.c3.n } };
  m.userData.u = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWet;\nvarying float vWet;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWet = aWet;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uKind; uniform sampler2D uA2; uniform sampler2D uA3; uniform sampler2D uN2; uniform sampler2D uN3; varying float vWet;')
      .replace('#include <normalmap_pars_fragment>', '#include <normalmap_pars_fragment>\nvec3 plN(vec2 uv){ float w2 = clamp(uKind, 0.0, 1.0), w3 = clamp(uKind - 1.0, 0.0, 1.0); return mix(mix(texture2D(normalMap, uv).xyz, texture2D(uN2, uv).xyz, w2), texture2D(uN3, uv).xyz, w3); }')
      .replace('texture2D( normalMap, vNormalMapUv ).xyz', 'plN( vNormalMapUv )')
      .replace('#include <map_fragment>', 'float pw2 = clamp(uKind, 0.0, 1.0), pw3 = clamp(uKind - 1.0, 0.0, 1.0);\n vec4 pc = mix(mix(texture2D(map, vMapUv), texture2D(uA2, vMapUv), pw2), texture2D(uA3, vMapUv), pw3);\n diffuseColor *= pc;\n diffuseColor.rgb *= (1.0 - 0.30 * vWet);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.26, vWet);');
  };
  m.customProgramCacheKey = () => 'om-plaster-1';
  return m;
}
/* wet mortar for the mound and the load on the trowel */
function mortarMaterial() { const a = PL.c1.a.clone(), n = PL.c1.n.clone(); a.needsUpdate = n.needsUpdate = true; a.repeat.set(1.4, 1.4); n.repeat.set(1.4, 1.4); return new THREE.MeshStandardMaterial({ map: a, normalMap: n, normalScale: new THREE.Vector2(1.1, 1.1), color: 0xb9b3a6, roughness: .42, envMapIntensity: .75 }); }

export default function build({ state }) {
  const set = state.set === 'work' ? 'work' : 'reveal', scene = new THREE.Scene(), { key } = studio(scene, { ext: 26, key: 2.7, shadow: .26, map: 4096 });
  key.shadow.bias = -.0002; key.shadow.normalBias = .03;
  const WX = 11.83, WY = 6.95, BAND = WY / 3, X0 = set === 'work' ? 0 : 6.9, XL = X0 - WX / 2, T = .26;
  /* the kit: shadows on, and fresh clones for the tools (a figure may be built twice) */
  const node = n => KIT.getObjectByName(n).clone(true), cast = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.material = m.material.clone(); m.material.envMapIntensity = m.material.metalness > .5 ? 1.25 : .7; } }); return o; };
  const wall = new THREE.Group(); ['Bricks', 'Mortar'].forEach(n => wall.add(cast(node(n)))); wall.position.x = XL; scene.add(wall);

  /* the plaster layer: a height-field over the wall, rebuilt as the trowel moves. thickness T, a tapered wet front, a ridge of fresh mortar ahead of the blade, a rounded edge at the wall's borders */
  const NX = 220, NY = 84, geo = new THREE.BufferGeometry(), pos = new Float32Array((NX + 1) * (NY + 1) * 3), uv = new Float32Array((NX + 1) * (NY + 1) * 2), wet = new Float32Array((NX + 1) * (NY + 1)), idx = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const k = j * (NX + 1) + i, x = i / NX * WX, y = j / NY * WY; pos[k * 3] = x; pos[k * 3 + 1] = y; uv[k * 2] = x / 5.2; uv[k * 2 + 1] = y / 5.2; }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('aWet', new THREE.BufferAttribute(wet, 1)); geo.setIndex(idx);
  const pm = plasterMaterial(), plaster = new THREE.Mesh(geo, pm); plaster.position.x = XL; plaster.castShadow = true; plaster.receiveShadow = true; plaster.frustumCulled = false; scene.add(plaster);
  /* fronts[b] = x (in wall coordinates) where band b's plaster ends; act[b] = how strongly it is being pushed right now (the ridge) */
  const fronts = [0, 0, 0], act = [0, 0, 0], fade = [1, 1, 1]; let dry = 0, wetBase = 1, lastSig = '';
  const rowBand = y => clamp(Math.floor((WY - y) / BAND), 0, 2);
  function shapePlaster() {
    const sig = fronts.map(v => v.toFixed(3)).join() + act.map(v => v.toFixed(2)).join() + fade.map(v => v.toFixed(2)).join() + dry.toFixed(3) + wetBase.toFixed(3); if (sig === lastSig) return false; lastSig = sig;
    for (let j = 0; j <= NY; j++) {
      const y = j / NY * WY, b = rowBand(y - 1e-4), f = fronts[b], a = act[b], ey = sm(0, .16, y) * sm(0, .16, WY - y);
      for (let i = 0; i <= NX; i++) {
        const x = i / NX * WX, k = j * (NX + 1) + i;
        const cover = (1 - sm(f - .12, f + .5, x)) * sm(.05, .9, f), ex = sm(0, .16, x) * sm(0, .16, WX - x);
        const ridge = a * .34 * Math.exp(-(((x - (f + .15)) / .42) ** 2));
        const swell = a * .08 * Math.sin(x * 2.1 + y * 3.1) * cover;                                   /* a little life in the fresh mortar */
        const hh = clamp(cover * ex * ey * fade[b], 0, 1);
        pos[k * 3 + 2] = hh > .004 ? .02 + T * hh * (1 + ridge) + swell * T * hh : -.9;      /* where there is no plaster the sheet sinks behind the bricks; where there is, it floats 0.02 above them, so it never shares a depth with the brick faces (that flickered) */
        const fresh = clamp(1 - (f - x) / 4.2, .45, 1), nearFront = 1 - sm(0, .9, Math.abs(x - f));
        wet[k] = clamp((wetBase * (.62 + .38 * fresh) + a * nearFront * .3) * (1 - dry), 0, 1);
      }
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.aWet.needsUpdate = true; geo.computeVertexNormals(); return true;
  }

  /* tools */
  const trowel = cast(node('Trowel')), hawk = new THREE.Group(), hawkBody = cast(node('Hawk')), rule = cast(node('Rule')), floatT = cast(node('Float'));
  const mound = node('Mound'), ribbon = node('Load'), mm = mortarMaterial(); [mound, ribbon].forEach(o => o.traverse(m => { if (m.isMesh) { m.material = mm; m.castShadow = true; m.receiveShadow = true; } }));
  hawk.add(hawkBody); mound.position.y = .05; hawk.add(mound);
  const loadG = new THREE.Group(); ribbon.rotation.x = -Math.PI / 2; ribbon.scale.set(1.25, 1.0, .9); ribbon.position.set(.1, 0, -.01); loadG.add(ribbon); loadG.position.z = -.02; trowel.add(loadG);
  [trowel, rule, floatT].forEach(o => { o.visible = false; scene.add(o); });
  const HX = set === 'work' ? -8.6 : -8.6, HZ = 2.5, HY = 2.15; hawk.position.set(HX, HY, HZ); hawk.rotation.y = .18; scene.add(hawk);

  /* the sand heap (real fractured grains) and the falling grains above it */
  const heapG = new THREE.Group(); heapG.position.set(set === 'work' ? -12.4 : -3.4, 0, set === 'work' ? .4 : 2.5); scene.add(heapG);
  const SC = .23, heap = buildHeap({ R: 15, nC: 0, nM: 2600, nF: 9000, nH: 0, seed: 77, maxD: 1.4, gs: PT.gs, tint: PT.TT, csf: PT.csf * SC, csm: PT.csm * SC, dust: PT.dust }); heap.group.scale.setScalar(SC); heapG.add(heap.group);
  const GS = [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), GT = [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')), gm = grainMat({ bump: .1 });
  const ims = [...plant(heap.group, heap.items.mid, GS, gm, 78, true), ...plant(heap.group, heap.items.fine, GT, gm, 79, false)], counts = ims.map(m => m.count);
  const fall = [], rf = rng(5); for (let i = 0; i < 150; i++) fall.push({ x: (rf() - .5) * .5, y: rf() * 13, z: (rf() - .5) * .5, s: .05 + rf() * .06, c: mineral(rf).map((v, k) => v * PT.TT[k]), flat: 1, jx: 1, jz: 1, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rf() * 6, rf() * 6, rf() * 6)) });
  const fims = plant(heapG, fall, GS, gm, 81, false), fo = new THREE.Object3D();

  /* ───── the trowel's route: key poses, eased between, an arc on the carry ───── */
  const pose = (x, y, z, rx = 0, ry = 0, rz = 0) => ({ x, y, z, rx, ry, rz });
  const mix = (a, b, s, arc = 0) => ({ x: lerp(a.x, b.x, s), y: lerp(a.y, b.y, s) + arc * Math.sin(Math.PI * s), z: lerp(a.z, b.z, s) + arc * .5 * Math.sin(Math.PI * s), rx: lerp(a.rx, b.rx, s), ry: lerp(a.ry, b.ry, s), rz: lerp(a.rz, b.rz, s) });
  const HAWKP = { above: pose(HX + .3, HY + 1.7, HZ + .8, .95, 0, .05), dip: pose(HX + .15, HY + .62, HZ + 1.05, 1.1, 0, .03), lift: pose(HX + .3, HY + 1.55, HZ + .95, .8, 0, .02) };
  const WSTART = b => pose(XL + .55, WY - b * BAND - BAND / 2, T + 1.5, .04, -.16, .02), WEND = b => pose(XL + WX - .9, WY - b * BAND - BAND / 2, T + .06, .02, -.16, -.01);
  const OFF = b => pose(XL + WX - .3, WY - b * BAND - BAND / 2 + .5, T + 2.4, .35, -.1, 0), IDLE = pose(HX + 3.5, HY + 2.6, HZ + 1.6, .9, 0, .1);
  /* one pass: [fraction, pose, arc] keys; returns {pose, f (0..1 along the sweep), ribbon, level drop} for the local time p in 0..1 */
  const KF = [0, .1, .2, .3, .4, .88, 1];
  function passAt(b, p, prev) {
    const keys = [prev, HAWKP.above, HAWKP.dip, HAWKP.lift, WSTART(b), WEND(b), OFF(b)], arcs = [0, 0, 0, 0, 1.6, 0, 0];
    let s = KF.length - 2; for (let i = 0; i < KF.length - 1; i++) if (p < KF[i + 1]) { s = i; break; }
    const loc = clamp((p - KF[s]) / (KF[s + 1] - KF[s])), e = s === 4 ? ease(loc) : sm(0, 1, loc);
    const P = mix(keys[s], keys[s + 1], e, arcs[s + 1] * (s + 1 === 4 ? 1 : 0)), sw = clamp((p - KF[4]) / (KF[5] - KF[4]));
    if (s === 4) { P.y += Math.sin(sw * Math.PI * 5) * .5 * Math.sin(sw * Math.PI); P.z = lerp(P.z, T + .05, sm(0, .15, loc)); }
    return { P, sw: s === 4 ? ease(loc) : p >= KF[5] ? 1 : 0, ribbon: p < .2 ? 0 : p < .3 ? sm(.2, .3, p) : p < KF[4] ? 1 : p < KF[5] ? 1 - .93 * ease(sw) : 0, lvl: sm(.2, .3, p) };
  }
  const setTool = (o, P, k = 1) => { o.position.set(lerp(o.position.x, P.x, k), lerp(o.position.y, P.y, k), lerp(o.position.z, P.z, k)); o.rotation.set(lerp(o.rotation.x, P.rx, k), lerp(o.rotation.y, P.ry, k), lerp(o.rotation.z, P.rz, k)); };
  const labsY = WY + .5;
  const views = set === 'work' ? { all: { az: -16, el: 13, dist: matchMedia('(max-width:640px)').matches ? 33 : 32, t: [-3.2, 3.3, 0] } } : { all: { az: -15, el: 13, dist: matchMedia('(max-width:640px)').matches ? 35 : 32, t: [.9, 3.2, 0] } };
  const labels = set === 'work' ? [
    { id: 'h', text: 'Mortar on the hawk', side: 'r', anchor: new V3(HX, HY + 1.4, HZ), show: st => (st.stage ?? 0) <= 1 },
    { id: 'w', text: 'Prepared background', side: 'r', anchor: new V3(XL + 2.2, WY - .3, 0), show: st => (st.stage ?? 0) === 0 },
    { id: 't', text: 'The plaster layer', side: 'r', tone: 'hot', anchor: new V3(XL + WX - 2, WY - 1.2, T), show: st => (st.stage ?? 0) >= 1 },
  ] : [
    { id: 's', text: 'Plaster-grade sand', side: 'r', tone: 'hot', anchor: new V3(-3.4, 4.2, 2.5), show: st => (st.build ?? 0) < .5 },
    { id: 'm', text: 'Mortar: sand, binder and water', side: 'l', anchor: new V3(HX, HY + 1.6, HZ), show: st => (st.build ?? 0) > .24 && (st.build ?? 0) < .7 },
    { id: 'p', text: 'Plaster layer on the wall', side: 'r', tone: 'hot', anchor: new V3(XL + WX - .6, labsY, T), show: st => (st.build ?? 0) > .52 },
  ];

  /* ───── the reveal: one phase u in 0..1 (sand 0-.22, mortar .22-.38, three passes .38-.90, drying .90-1) ───── */
  const SAND = .22, MORT = .38, PASS0 = .38, PASSN = .17, DRY0 = .9;
  let wasGoing = false, ph = state.build ?? 0, cur = -1, prevPose = IDLE, lastPose = {};
  function revealAt(u, t) {
    const grow = sm(0, .2, u), mortar = sm(.2, .38, u);
    ims.forEach((im, i) => { im.count = Math.max(0, Math.round(counts[i] * grow * (1 - mortar * .92))); });
    heap.group.scale.set(SC * (1 - mortar * .4), SC * Math.max(.05, .25 + .75 * grow * (1 - mortar * .6)), SC * (1 - mortar * .4));
    fims.forEach(im => { im.visible = u < .24; }); heapG.visible = true;
    const pass = clamp((u - PASS0) / PASSN, 0, 3), bi = Math.min(2, Math.floor(pass)), p = pass - bi;
    let lvl = mortar, rib = 0, P = null;
    fronts.fill(0); act.fill(0); fade.fill(1);
    if (u >= PASS0) {
      for (let b = 0; b < 3; b++) {                                              /* bands before this pass are complete */
        if (b < bi || u >= PASS0 + 3 * PASSN) { fronts[b] = WX + 1.5; } }
      let prev = bi === 0 ? IDLE : OFF(bi - 1); const r = passAt(Math.min(bi, 2), p, prev); P = r.P; rib = r.ribbon;
      if (u < PASS0 + 3 * PASSN) { const c = r.sw; fronts[bi] = c > 0 ? clamp(P.x - XL + 1.0, 0, WX + 1.5) * (c > .995 ? 1 : 1) : 0; if (c >= 1) fronts[bi] = WX + 1.5; act[bi] = c > 0 && c < 1 ? 1 : 0; }
      /* the mound goes down by a third at each load */
      let used = 0; for (let b = 0; b < 3; b++) used += b < bi ? 1 : b === bi ? r.lvl : 0; lvl = mortar * (1 - used / 3.4);
    }
    mound.scale.set(.55 + .45 * lvl, .1 + .9 * lvl, .55 + .45 * lvl); mound.visible = mortar > .02 && lvl > .02;
    const out = u >= PASS0 + 3 * PASSN;
    if (P && !out) { trowel.visible = true; setTool(trowel, P); } else if (u >= PASS0 + 3 * PASSN) { const s = sm(PASS0 + 3 * PASSN, PASS0 + 3 * PASSN + .05, u); trowel.visible = s < 1; setTool(trowel, mix(OFF(2), pose(XL + WX + 2.5, WY + 1.8, T + 3, .5, -.1, 0), s)); }
    else trowel.visible = false;
    loadG.visible = trowel.visible && rib > .02; loadG.scale.set(1, 1, 1).multiplyScalar(.25 + .75 * rib); loadG.scale.y *= 1;
    dry = sm(DRY0, 1, u); wetBase = 1; pm.userData.u.uKind.value = sm(DRY0 - .02, DRY0 + .05, u) + sm(DRY0 + .04, 1, u);
    return u;
  }
  /* ───── the six movements: each is a loop in time, the tool pose eases toward its target so a change of movement flows ───── */
  let kindMix = 0, tpose = null; const targetKind = [0, 0, .25, .6, 1.1, 2][0];
  function workAt(s, t, dt) {
    const k = reduce() ? 1 : 1 - Math.exp(-dt * 5.5), tg = [0, 0, .35, .7, 1.2, 2][s]; kindMix += (tg - kindMix) * (reduce() ? 1 : 1 - Math.exp(-dt * 2.6)); pm.userData.u.uKind.value = kindMix;
    fronts.fill(s >= 1 ? WX + 1.5 : 0); act.fill(0); fade.fill(1); if (s === 0) fronts.fill(0);
    heapG.visible = s === 0; fims.forEach(im => { im.visible = false; }); counts.forEach((c, i) => { ims[i].count = c; }); hawk.visible = s <= 2; trowel.visible = s <= 2 || s === 5; rule.visible = s === 3; floatT.visible = s === 4;
    const wetT = [1, .95, .8, .6, .4, .12][s]; wetBase += (wetT - wetBase) * (1 - Math.exp(-dt * 2)); dry = 0;
    let lvl = 1, rib = 0;
    if (s === 0) { const c = (t % 4.2) / 4.2, r = passAt(0, .06 + c * .26, HAWKP.lift), P = r.P; tpose = P; rib = r.ribbon * (1 - sm(.88, 1, c)); lvl = 1 - .14 * sm(.2, .3, c) * (1 - sm(.88, 1, c)); setTool(trowel, P, k); }
    else if (s === 1) {
      const c = (t % 5.2) / 5.2, r = passAt(2, .38 + c * .6, HAWKP.lift), P = r.P; rib = r.ribbon; setTool(trowel, P, k);
      fronts[0] = fronts[1] = WX + 1.5; const sw = r.sw; fronts[2] = sw > 0 ? clamp(P.x - XL + 1.0, 0, WX + 1.5) : 0; if (sw >= 1) fronts[2] = WX + 1.5; act[2] = sw > 0 && sw < 1 ? 1 : 0; const rt = c > .96 ? sm(1, .96, c) : 1; fade[2] = rt; lvl = .8;
    }
    else if (s === 2) { const sx = .5 + .5 * Math.sin(t * .85), sy = .5 + .5 * Math.sin(t * .27 + 1); setTool(trowel, pose(XL + 1 + sx * (WX - 2.4), 1 + sy * (WY - 2), T + .05, .02, -.05 + Math.cos(t * .85) * .1, .08 * Math.sin(t * .4)), k); lvl = .8; }
    else if (s === 3) { const q = .5 + .5 * Math.sin(t * .62); setTool(rule, pose(XL + WX / 2, .6 + q * (WY - 1.2), T + .16, 0, 0, .01 * Math.sin(t)), k); }
    else if (s === 4) { const cx = XL + 2 + (WX - 4) * (.5 + .5 * Math.sin(t * .3)), cy = 1.6 + (WY - 3.2) * (.5 + .5 * Math.sin(t * .19 + .8)); setTool(floatT, pose(cx + Math.cos(t * 2.3) * .9, cy + Math.sin(t * 2.3) * .9, T + .06, 0, 0, Math.sin(t * 2.3) * .22), k); }
    else { const sx = .5 + .5 * Math.sin(t * 1.0), sy = .5 + .5 * Math.sin(t * .33 + 2); setTool(trowel, pose(XL + 1 + sx * (WX - 2.4), 1.2 + sy * (WY - 2.4), T + .04, .02, -.06 + Math.cos(t) * .08, .1), k); }
    mound.scale.set(.55 + .45 * lvl, .1 + .9 * lvl, .55 + .45 * lvl); loadG.visible = trowel.visible && rib > .02; loadG.scale.set(1, 1, 1).multiplyScalar(.25 + .75 * rib);
  }
  trowel.rotation.order = 'YXZ'; rule.rotation.order = 'YXZ'; floatT.rotation.order = 'YXZ';

  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-62, 42], el: [4, 50], dist: [12, 72] },
    update(t, dt, st, fig) {
      let anim = false;
      if (set === 'work') { const s = st.stage ?? 0; workAt(s, reduce() ? 1.4 : t, reduce() ? 1 : dt); anim = !reduce(); if (shapePlaster()) anim = true; }
      else {
        const going = st.play && !reduce();
        if (going) { if (!wasGoing && ph >= .999) ph = 0; ph = Math.min(1, ph + dt / 24); } else { if (wasGoing) st.build = ph; ph = st.build ?? 0; }       /* plays once and holds the finished wall; play again restarts; pausing keeps the moment */
        wasGoing = going; const b = ph;
        const u = going ? ph : b; revealAt(u, t);
        anim = going ? true : u !== cur; cur = u; if (shapePlaster()) anim = true;
        if (u < .24 && !reduce() && going) { fims.forEach(im => { for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, fo.matrix); fo.matrix.decompose(fo.position, fo.quaternion, fo.scale); fo.position.y = ((fo.position.y - dt * 8) + 13) % 13 + .3 * 3 * sm(0, .2, u); fo.updateMatrix(); im.setMatrixAt(i, fo.matrix); } im.instanceMatrix.needsUpdate = true; }); }
      }
      return anim;
    },
    seek(u) { ph = u; },
  };
}
