/* scene: the Hot Mix paving train (Hot Mix Asphalt page, Interactive 07 "Paving process explorer").
   Blender models (scripts/hma3d/build-paving.py, build-tipper-hma.py): a tracked asphalt paver, a tandem steel-drum roller and the OM GROUP tipper with a
   swinging tailgate, on a cut road block (primed granular base over sub-base and subgrade). One continuous loop:
     the tipper, pushed by the paver's push rollers, tips Hot Mix into the hopper; the mix rides the two slat conveyors back through the tunnel; the augers
     spread it across the width in front of the screed; the screed lays a steaming fresh mat; the roller works back and forth behind it, its drums wetted by
     the spray bars, and leaves a closed, smoother surface.
   The machines stay put and the road moves under them (tracks, wheels and drums turn with it). The buttons move the camera; the conveyor and auger views cut
   the near half of the paver away along its centre line (the inside of each cut part shows, a little darker). Generic machines, not a particular manufacturer's model or an OM GROUP unit; no width, thickness,
   speed, temperature or number of passes is shown or implied. 1 unit = 1 m. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crispLogo } from '/assets/application-s3d-flow.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { rbox, scaleUV, reduceM } from '/assets/application-s3d-rdkit.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };

const ld = u => new GLTFLoader().loadAsync(u).then(g => g.scene);
const [PAVER, ROLLER, TIPPER, PJ, TJ] = await Promise.all([
  ld('/assets/3d/om-group-asphalt-paver.glb'), ld('/assets/3d/om-group-tandem-roller.glb'), ld('/assets/3d/om-group-tipper-hma.glb'),
  fetch('/assets/3d/om-group-paving.json').then(r => r.json()), fetch('/assets/3d/om-group-tipper-hma.json').then(r => r.json()),
]);
[PAVER, ROLLER, TIPPER].forEach(root => root.traverse(o => {
  if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; const m = o.material; if (!m) return; const n = m.name || ''; m.envMapIntensity = .9;
  if (/Tyre|Rubber/.test(n)) m.envMapIntensity = .35;
  if (/AsphaltCoated/.test(n)) { m.envMapIntensity = .75; }
  if (/DrumSteel/.test(n)) { m.envMapIntensity = 1.15; }
  if (/Chrome/.test(n)) { m.roughness = .3; m.envMapIntensity = .9; }
  if (/CabGlass/.test(n)) { m.envMapIntensity = 1.5; m.transparent = true; m.depthWrite = false; m.opacity = .6; }
  if (/ConsoleScreen/.test(n)) { m.emissive = new THREE.Color(0x0c2a3a); m.emissiveIntensity = .5; }
  if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
  if (/DecalWhite|Stripe|Reflective/.test(n)) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; }
  if (m.map) m.map.anisotropy = 8;
}));

/* textures: the asphalt mat tiles from the Blender script (1 tile = 1.2 m), the painted road tiles for the cut faces. Each use loads its own copy so its scroll
   offset is its own (the road tiles are shared with the pavement figure further up the page through a cache). */
const TL = new THREE.TextureLoader();
const tx = (u, srgb, rep = [1, 1]) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(rep[0], rep[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const ASPH = (kind, o = {}) => {
  const b = '/assets/hma3d/asphalt-' + kind + '-';
  return new THREE.MeshPhysicalMaterial({ map: tx(b + 'c.webp', true), normalMap: tx(b + 'n.webp'), roughnessMap: tx(b + 'r.webp'), normalScale: new THREE.Vector2(o.ns ?? 1.3, o.ns ?? 1.3),
    roughness: 1, metalness: 0, color: o.color ?? 0xffffff, envMapIntensity: o.env ?? .5, specularIntensity: o.spec ?? .55, clearcoat: o.coat ?? 0, clearcoatRoughness: o.coatR ?? .35, side: o.side ?? THREE.FrontSide });
};
const ROAD = (kind, tint, rough) => new THREE.MeshStandardMaterial({ map: tx('/assets/road-tex/' + kind + '-c.webp', true), bumpMap: tx('/assets/road-tex/' + kind + '-b.webp'), bumpScale: 2.2, color: tint, roughness: rough, metalness: 0, envMapIntensity: .55 });
const scrollMat = (m, du, dv = 0) => ['map', 'normalMap', 'roughnessMap', 'bumpMap'].forEach(k => { if (m[k]) { m[k].offset.x = du; m[k].offset.y = dv; } });

/* a height-field patch: nx x nz vertices over [x0,x1] x [z0,z1]; y = f(x, z); UVs in metres / tile (u along x, v along z) */
function patch(x0, x1, z0, z1, nx, nz, tile, f) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(nx * nz * 3), U = new Float32Array(nx * nz * 2), I = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = x0 + (x1 - x0) * i / (nx - 1), z = z0 + (z1 - z0) * j / (nz - 1); P[k * 3] = x; P[k * 3 + 1] = f(x, z); P[k * 3 + 2] = z; U[k * 2] = x / tile; U[k * 2 + 1] = z / tile; }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; I.push(a, c, b, b, c, d); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
  g.userData = { nx, nz, x0, x1, z0, z1, f }; return g;
}
function repatch(g, f) { const { nx, nz, x0, x1, z0, z1 } = g.userData, P = g.attributes.position.array; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; P[k * 3 + 1] = f(x0 + (x1 - x0) * i / (nx - 1), z0 + (z1 - z0) * j / (nz - 1)); } g.attributes.position.needsUpdate = true; g.computeVertexNormals(); }
/* smooth value noise (deterministic) for the lumpy mix surfaces */
const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v; };
const fbm = (x, y) => vnoise(x, y) * .6 + vnoise(x * 2.3 + 5, y * 2.3 + 1) * .28 + vnoise(x * 5.1 + 9, y * 5.1 + 3) * .12;

export default function build() {
  const narrow = matchMedia('(max-width:640px)').matches;
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 24, key: 2.5, map: 4096, ground: false });
  key.shadow.bias = -.0003; key.shadow.normalBias = .03;
  const out = { scene, fov: 30, wide: true, labels: [] };
  const r = rng(29);

  /* ---------- the cut road block on a stone bench ---------- */
  const XA = -21, XB = 14, ZW = 2.75;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 24), new THREE.MeshStandardMaterial({ color: 0xe4dfd6, roughness: .8, metalness: 0, envMapIntensity: .6 })); bench.position.set(-3, -1.52, 0); bench.receiveShadow = true; scene.add(bench);
  const layer = (mat, h, top, tile) => { const geo = scaleUV(rbox(XB - XA, h, ZW * 2, .05, 4, 1 / 12, [0, 0]), 12 / tile, 12 / tile); const m = new THREE.Mesh(geo, mat); m.position.set((XA + XB) / 2, top - h / 2, 0); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  const baseM = ROAD('wmm', 0xcdbfac, .72), subM = ROAD('gsb', 0xffffff, .9), soilM = ROAD('soil', 0xffffff, .95);
  layer(baseM, .24, 0, 1.6); layer(subM, .32, -.24, 2.2); layer(soilM, .46, -.56, 3);
  const scrollers = [[baseM, 1.6], [subM, 2.2], [soilM, 3]];

  /* ---------- the asphalt mat: fresh behind the screed, rolled behind the roller's turning point ---------- */
  const S = PJ.screed, M = PJ.mat, RJ = PJ.roller, MH = M.half;
  const RX0 = -9.6, RA = 2.1, RT = 17;                                    /* roller: centre of its working run, half-length, period of one back-and-forth (s) */
  const CF = RX0 + RA + RJ.xf + RJ.r + .15;                               /* how far forward the front drum reaches: the rolled surface begins there */
  const freshM = ASPH('fresh', { ns: 1.5, env: .5 }), rolledM = ASPH('rolled', { ns: .9, env: .32, coat: 0, spec: .4, color: 0xdcdcdc }), sideM = ASPH('fresh', { ns: 1.2, env: .45 });
  const MT = 1.2, matTop = x => x > CF ? M.fresh : x < CF - .5 ? M.rolled : M.rolled + (M.fresh - M.rolled) * ss(CF - .5, CF, x);
  const fresh = new THREE.Mesh(patch(CF - .5, S.front - .02, -MH, MH, 40, 12, MT, (x) => matTop(x)), freshM); fresh.receiveShadow = true; scene.add(fresh);
  const rolled = new THREE.Mesh(patch(XA + .05, CF - .5, -MH, MH, 60, 12, MT, () => M.rolled), rolledM); rolled.receiveShadow = true; scene.add(rolled);
  { /* the two cut sides and the far end of the mat */
    const g = new THREE.BufferGeometry(), P = [], U = [], I = []; const xs = []; for (let i = 0; i <= 80; i++) xs.push(XA + .05 + (S.front - .02 - XA - .05) * i / 80);
    [-MH, MH].forEach((z, side) => { const b = P.length / 3; xs.forEach(x => { P.push(x, 0, z, x, matTop(x), z); U.push(x / MT, 0, x / MT, .09); }); for (let i = 0; i < xs.length - 1; i++) { const a = b + i * 2; side ? I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) : I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
    const sides = new THREE.Mesh(g, sideM); sides.receiveShadow = true; scene.add(sides);
  }
  scrollers.push([freshM, MT], [rolledM, MT], [sideM, MT]);

  /* ---------- machines ---------- */
  const paver = PAVER.clone(true), roller = ROLLER.clone(true), truck = TIPPER.clone(true); scene.add(paver, roller, truck);
  const N = {}; [paver, roller, truck].forEach((g, gi) => g.traverse(o => { if (o.name) N[(gi === 0 ? 'p:' : gi === 1 ? 'r:' : 't:') + o.name] = o; }));
  /* the cut-away: the near half of the paver (z > cut) is clipped; the inside faces of the cut parts show, darkened */
  const CUT = new THREE.Plane(new V3(0, 0, -1), 50), cutMats = new Map();
  paver.traverse(o => {
    if (!o.isMesh || /Logo|Screen|Stripe/.test(o.material.name || '')) return;
    let m = cutMats.get(o.material);
    if (!m) {
      m = o.material.clone(); m.side = THREE.DoubleSide; m.clippingPlanes = [CUT]; m.clipShadows = true;
      m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  if (!gl_FrontFacing) gl_FragColor.rgb *= 0.42;'); };
      m.customProgramCacheKey = () => 'hmacut'; cutMats.set(o.material, m);
    }
    o.material = m;
  });
  const cutList = [...cutMats.values()]; let dbl = true;
  paver.traverse(o => { if (o.isMesh && /Logo|Stripe|Screen/.test(o.material.name || '')) { o.material = o.material.clone(); o.material.clippingPlanes = [CUT]; } });

  /* the tipper backed onto the push rollers (rear tyres against them) */
  const TX = PJ.push.x + 4.2; truck.position.x = TX;
  const bed = N['t:Bed'], gate = N['t:Tailgate'], hoist = N['t:Cyl_Hoist'], tipH = N['t:Tip_Hoist'], hs1 = N['t:Hoist_Stage1'], hs2 = N['t:Hoist_Stage2'], d0 = TJ.hoist.d0, hv = new V3();
  const tilt = a => { bed.rotation.z = a; truck.updateMatrixWorld(true); tipH.getWorldPosition(hv); hoist.parent.worldToLocal(hv); const dx = hv.x - hoist.position.x, dy = hv.y - hoist.position.y, e = Math.max(0, Math.hypot(dx, dy) - d0); hoist.rotation.z = Math.atan2(dy, dx); hs1.position.x = e / 2; hs2.position.x = e; };
  const wheels = []; truck.traverse(o => { if (/^Wheel_[FR]\d[LR]$/.test(o.name)) wheels.push(o); });
  roller.position.x = RX0;

  /* ---------- crawler track shoes (instanced), moving with the ground ---------- */
  const TK = PJ.track, TPER = 2 * (TK.x1 - TK.x0) + TAU * TK.r, NS = Math.round(TPER / .165), PITCH = TPER / NS;
  const shoeG = new THREE.BoxGeometry(.15, .045, TK.w); { const gr = new THREE.BoxGeometry(.035, .04, TK.w); gr.translate(0, -.04, 0); const merged = [shoeG, gr]; const pos = [], idx = []; let off = 0; merged.forEach(gm => { const p = gm.attributes.position.array, ii = gm.index.array; for (let i = 0; i < p.length; i++) pos.push(p[i]); for (let i = 0; i < ii.length; i++) idx.push(ii[i] + off); off += p.length / 3; }); shoeG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); shoeG.setIndex(idx); shoeG.deleteAttribute('normal'); shoeG.deleteAttribute('uv'); shoeG.computeVertexNormals(); }
  const shoeM = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: .75, roughness: .55, envMapIntensity: .7, clippingPlanes: [CUT] });
  const shoes = new THREE.InstancedMesh(shoeG, shoeM, NS * 2); shoes.castShadow = true; shoes.receiveShadow = true; shoes.frustumCulled = false; paver.add(shoes);
  const trackAt = s => { s = ((s % TPER) + TPER) % TPER; const L = TK.x1 - TK.x0, A = Math.PI * TK.r;
    if (s < L) return [TK.x1 - s, .0225, 0];                                       /* bottom run, front to back */
    s -= L; if (s < A) { const a = s / TK.r; return [TK.x0 - Math.sin(a) * TK.r, TK.r - Math.cos(a) * TK.r + .0225 * Math.cos(a), -a]; }
    s -= A; if (s < L) return [TK.x0 + s, 2 * TK.r - .0225, -Math.PI];            /* top run, back to front */
    s -= L; const a = s / TK.r; return [TK.x1 + Math.sin(a) * TK.r, TK.r + Math.cos(a) * TK.r - .0225 * Math.cos(a), -Math.PI - a]; };

  /* ---------- the two slat conveyors (instanced slats) and the mix riding on them ---------- */
  const CV = PJ.conveyor, CR = CV.r, CL = CV.x1 - CV.x0 - 2 * CR, CPER = 2 * CL + TAU * CR, NC = Math.round(CPER / .11), CP = CPER / NC;
  const slatG = new THREE.BoxGeometry(.05, .025, CV.w - .04), slatM = new THREE.MeshStandardMaterial({ color: 0x3a3b3e, metalness: .85, roughness: .45, envMapIntensity: .8 });
  const slats = new THREE.InstancedMesh(slatG, slatM, NC * 2); slats.castShadow = true; slats.frustumCulled = false; paver.add(slats);
  const convAt = s => { s = ((s % CPER) + CPER) % CPER; const xf = CV.x1 - CR, xr = CV.x0 + CR, yc = CV.y - CR;
    if (s < CL) return [xf - s, CV.y, 0];
    s -= CL; if (s < Math.PI * CR) { const a = s / CR; return [xr - Math.sin(a) * CR, yc + Math.cos(a) * CR, a]; }
    s -= Math.PI * CR; if (s < CL) return [xr + s, yc - CR, Math.PI];
    s -= CL; const a = s / CR; return [xf + Math.sin(a) * CR, yc - Math.cos(a) * CR, Math.PI + a]; };
  const convMixM = ASPH('fresh', { ns: 1.8, env: .8, side: THREE.DoubleSide }); convMixM.clippingPlanes = [CUT];
  const convMix = CV.lanes.map(z0 => { const g = patch(CV.x0 + .02, CV.x1 - .02, z0 - CV.w / 2 + .03, z0 + CV.w / 2 - .03, 70, 7, .8, (x, z) => CV.y + .02 + .13 * Math.pow(1 - Math.pow(Math.abs(z - z0) / (CV.w / 2), 2), .6) * (.75 + .5 * fbm(x * 3, z * 6))); const m = new THREE.Mesh(g, convMixM); m.castShadow = true; m.receiveShadow = true; paver.add(m); return m; });

  /* ---------- the hopper load: a lumpy surface that lies on the wing liners where it is lower than them ---------- */
  const H = PJ.hopper, wingY = z => H.floor + Math.max(0, Math.abs(z) - H.z0) * (H.top - H.floor) / (H.z1 - H.z0);
  const hopM = ASPH('fresh', { ns: 1.9, env: .85, side: THREE.DoubleSide }); hopM.clippingPlanes = [CUT];
  let hopT = 0; const hopF = (x, z) => { const lvl = 1.02 + .1 * ss(H.x0, H.x1, x) * 0 - .12 * ss(H.x0 + .6, H.x0, x) + .16 * (fbm(x * 2.2 + hopT * .9, z * 2.6) - .5) + .08 * Math.exp(-Math.pow((x - 2.95) / .35, 2)) * (1 - Math.abs(z) / 1.2); return Math.max(wingY(z) + .025, Math.min(lvl, H.top - .04)); };
  const hop = new THREE.Mesh(patch(H.x0 + .03, H.x1 - .03, -H.z1 + .03, H.z1 - .03, 34, 30, .8, hopF), hopM); hop.castShadow = hop.receiveShadow = true; paver.add(hop);

  /* ---------- the head of mix in front of the screed, pushed outward by the augers (two halves scrolling outward) ---------- */
  const AU = PJ.auger, augM = [1, -1].map(() => { const m = ASPH('fresh', { ns: 1.7, env: .8, side: THREE.DoubleSide }); m.clippingPlanes = [CUT]; return m; });
  const augHead = [1, -1].map((s, k) => { const g = patch(S.front + .02, -1.5, s > 0 ? 0 : -MH, s > 0 ? MH : 0, 14, 40, .8, (x, z) => { const u = (x - S.front) / (-1.5 - S.front), prof = Math.sin(Math.PI * clamp(u * .95 + .05)) * .9 + .1; return M.fresh + .2 * prof * (.8 + .4 * fbm(x * 4, z * 3)) * (1 - .55 * ss(.9, 1.7, Math.abs(z))); }); const m = new THREE.Mesh(g, augM[k]); m.castShadow = true; m.receiveShadow = true; paver.add(m); return m; });
  /* swap u and v on the auger head so the texture scrolls along the width (outward) */
  augHead.forEach(m => { const uv = m.geometry.attributes.uv, p = m.geometry.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getZ(i) / .8, p.getX(i) / .8); uv.needsUpdate = true; });

  /* ---------- the mix in the tipper body: its free surface stays level as the body tips ---------- */
  const bedM = ASPH('fresh', { ns: 1.8, env: .85, side: THREE.DoubleSide }), BL = TJ.bedLen, BZ = TJ.bedHalfWidth - .07, HG = TJ.hinge;
  let bedLevel = 2.15; const bedF = (u, z, a) => { const v = (bedLevel - HG[1] - u * Math.sin(a)) / Math.cos(a) + .09 * (fbm(u * 1.6, z * 2) - .5); return clamp(v, .01, 1.5); };
  const bedMix = new THREE.Mesh(patch(.05, BL - .1, -BZ, BZ, 36, 12, .8, (u, z) => bedF(u, z, .3)), bedM); bedMix.castShadow = true; bed.add(bedMix);

  /* ---------- the stream of mix from the body into the hopper: lumps on falling paths ---------- */
  const lumpG = new THREE.IcosahedronGeometry(1, 1); { const p = lumpG.attributes.position, v = new V3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + .25 * Math.sin(v.x * 6.1) * Math.sin(v.y * 5.3 + 1) * Math.sin(v.z * 7.7); p.setXYZ(i, v.x * k, v.y * k * .8, v.z * k); } lumpG.computeVertexNormals(); }
  const lumpM = new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: .42, metalness: 0, envMapIntensity: .9, clearcoat: .3, clearcoatRoughness: .4 });
  const NL = 150, lumps = new THREE.InstancedMesh(lumpG, lumpM, NL); lumps.castShadow = true; lumps.frustumCulled = false; scene.add(lumps);
  const LI = Array.from({ length: NL }, () => ({ ph: r(), z: (r() - .5) * 1.9, s: .035 + r() * .075, vx: -.35 - r() * .5, o: r() * 6 }));
  /* a sheet of mix sliding over the tail of the body (gives the stream its mass) */
  const sheetM = ASPH('fresh', { ns: 1.6, env: .8, side: THREE.DoubleSide }), NSG = 14, sheetG = new THREE.BufferGeometry();
  { const I = []; for (let i = 0; i < NSG; i++) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } sheetG.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NSG + 1) * 6), 3)); sheetG.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((NSG + 1) * 4), 2)); sheetG.setIndex(I); }
  const sheet = new THREE.Mesh(sheetG, sheetM); sheet.castShadow = true; sheet.frustumCulled = false; scene.add(sheet);

  /* ---------- steam: soft sprites over the fresh mat, the auger head and the hopper ---------- */
  /* a soft, irregular puff: overlapping blobs and a little grain (one smooth radial gradient showed banding rings) */
  const scv = document.createElement('canvas'); scv.width = scv.height = 128;
  { const g = scv.getContext('2d'), rr = rng(71); for (let i = 0; i < 14; i++) { const a = rr() * TAU, d = rr() * 26, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, rad = 22 + rr() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(248,246,242,.16)'); gr.addColorStop(.6, 'rgba(244,242,237,.07)'); gr.addColorStop(1, 'rgba(240,238,232,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
    const im = g.getImageData(0, 0, 128, 128), D = im.data; for (let i = 0; i < D.length; i += 4) { const x = (i / 4) % 128 - 64, y = Math.floor(i / 512) - 64, fall = Math.max(0, 1 - Math.hypot(x, y) / 63); D[i + 3] = Math.min(255, D[i + 3] * fall * 1.6 + (rr() - .5) * 6 * fall); } g.putImageData(im, 0, 0); }
  const stex = new THREE.CanvasTexture(scv); stex.colorSpace = THREE.SRGBColorSpace;
  const NST = narrow ? 34 : 52, steam = Array.from({ length: NST }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: stex, transparent: true, depthWrite: false, opacity: 0, color: 0xf6f3ee })); m.renderOrder = 6; scene.add(m);
    const zone = i % 4 === 0 ? 'hop' : i % 4 === 1 ? 'aug' : 'mat'; return { m, zone, ph: r(), x: zone === 'mat' ? S.back - .3 - r() * 2.8 : zone === 'aug' ? -1.75 : 1.6 + r() * 1.6, z: (r() - .5) * (zone === 'mat' ? 3.2 : 2.4), sp: .13 + r() * .1 }; });

  /* ---------- water spray from the roller's spray bars ---------- */
  const dcv = document.createElement('canvas'); dcv.width = dcv.height = 64; { const g = dcv.getContext('2d'), gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(220,236,248,.9)'); gr.addColorStop(1, 'rgba(220,236,248,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const dtex = new THREE.CanvasTexture(dcv); dtex.colorSpace = THREE.SRGBColorSpace;
  const NW = 40, spray = Array.from({ length: NW }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dtex, transparent: true, depthWrite: false, opacity: 0 })); m.renderOrder = 6; scene.add(m); return { m, f: i % 2 === 0, ph: r(), z: (r() - .5) * 1.5 }; });

  /* a soft lamp under the platform: the auger chamber is in the paver's own shadow */
  const lamps = [[-1.9, .95, 1.5, 2.2, 4.5], [-1.7, .9, .5, 0, 3.4], [.6, 1.0, .5, 0, 4.2], [2.4, 1.0, .5, 0, 3.4]].map(([x, y, z, i, d]) => { const pl = new THREE.PointLight(0xfff1e0, i, d, 1.6); pl.position.set(x, y, z); pl.userData.base = i || 2.4; pl.userData.cutOnly = !i; scene.add(pl); return pl; });   /* the last three light the inside of the half-section
  paver.traverse(o => { if (o.isMesh && /AugerFlight/.test(o.name)) { o.material = o.material.clone(); o.material.color = new THREE.Color(.55, .56, .58); o.material.roughness = .32; o.material.envMapIntensity = 1.2; o.material.clippingPlanes = [CUT]; o.material.side = THREE.DoubleSide; } });

  /* ---------- views (the buttons) ---------- */
  const v = (az, el, dist, t, cut = 50) => ({ az, el, dist: narrow ? dist * 1.12 : dist, t, cut });
  out.views = {
    all: v(-14, 17, narrow ? 36 : 31, [-.6, .85, 0]),
    hopper: v(10, 42, 8.4, [2.3, 1.05, .35]),
    conv: v(8, 25, 7.6, [.9, .66, -.1], .08),
    auger: v(30, 30, 5.2, [-1.85, .35, -.75], .05),
    screed: v(-58, 17, 7.6, [-2.75, .55, .4]),
    roller: v(-34, 15, 11, [RX0, .9, 0]),
  };
  out.limits = { az: [-85, 85], el: [4, 60], dist: [4, 60] };
  /* the cut-away moves on the wall clock (about 0.9 s), so it always completes, however slowly frames come */
  let cut = 50, cutFrom = 50, cutTo = 50, cutT0 = 0;
  const cutGo = to => { if (to === cutTo) return; cutFrom = cut; cutTo = to; cutT0 = performance.now(); };
  out.onSet = (k, val) => { if (k === 'view' && out.views[val]) cutGo(out.views[val].cut); };

  /* ---------- the loop ---------- */
  const VG = .16, VC = .42, o3 = new THREE.Object3D(), q = new THREE.Quaternion(), e3 = new THREE.Euler();
  let T = 7, first = true; out.seek = s => { T = s; };
  out.update = (t, dt, st) => {
    const go = !reduceM(); if (go) T += dt;
    if (first) { cut = cutFrom = cutTo = (out.views[st.view] || out.views.all).cut; first = false; }
    const ck = reduceM() ? 1 : clamp((performance.now() - cutT0) / 900), cMove = ck < 1; cut = Math.exp(Math.log(cutFrom) + (Math.log(cutTo) - Math.log(cutFrom)) * ss(0, 1, ck)); CUT.constant = cut; { const want = cut < 20; if (want !== dbl) { dbl = want; cutList.forEach(m => { m.side = want ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; }); } }   /* two-sided only while the paver is cut open: back-to-back parts cannot fight when it is closed */
    const inside = ss(3, .6, cut); lamps.forEach(l => { if (l.userData.cutOnly) l.intensity = l.userData.base * inside; });
    const D = VG * T;                                                     /* how far the paver has travelled over the road */
    scrollers.forEach(([m, tile]) => scrollMat(m, D / tile));
    /* tracks, sprockets, idlers */
    for (let side = 0; side < 2; side++) { const z = side ? -TK.z : TK.z; for (let i = 0; i < NS; i++) { const [x, y, a] = trackAt(i * PITCH + D); o3.position.set(x, y, z); o3.rotation.set(0, 0, a); o3.updateMatrix(); shoes.setMatrixAt(side * NS + i, o3.matrix); } }
    shoes.instanceMatrix.needsUpdate = true;
    ['L', 'R'].forEach(s => { const a = -D / (TK.r - .05); if (N['p:Sprocket_' + s]) N['p:Sprocket_' + s].rotation.z = a; if (N['p:Idler_' + s]) N['p:Idler_' + s].rotation.z = a; if (N['p:PushRoller_' + s]) N['p:PushRoller_' + s].rotation.z = D / .15; });
    /* conveyors */
    for (let lane = 0; lane < 2; lane++) { for (let i = 0; i < NC; i++) { const [x, y, a] = convAt(i * CP + VC * T + lane * .05); o3.position.set(x, y - .0125, CV.lanes[lane]); o3.rotation.set(0, 0, a); o3.updateMatrix(); slats.setMatrixAt(lane * NC + i, o3.matrix); } }
    slats.instanceMatrix.needsUpdate = true; scrollMat(convMixM, VC * T / .8);
    /* augers turn; the head of mix moves outward */
    if (N['p:AugerL']) N['p:AugerL'].rotation.z = -T * 3.2; if (N['p:AugerR']) N['p:AugerR'].rotation.z = -T * 3.2;
    scrollMat(augM[0], -T * .5 / .8); scrollMat(augM[1], T * .5 / .8);
    /* hopper surface churns as the conveyors draw it off */
    hopT = T; repatch(hop.geometry, hopF); scrollMat(hopM, VC * .35 * T / .8);
    /* tipper: wheels roll with the road, the body is feathered up and down, the tailgate hangs open, the load's surface stays level */
    wheels.forEach(w => { w.rotation.z = -D / .55; });
    const a = .33 + .045 * Math.sin(T * TAU / 9); tilt(a); gate.rotation.z = -a - .32 - .03 * Math.sin(T * 2.1);
    bedLevel = 2.1 + .05 * Math.sin(T * TAU / 9 + 1.2); repatch(bedMix.geometry, (u, z) => bedF(u, z, a)); scrollMat(bedM, -T * .12);
    /* the stream: from the tail of the body (world) down into the hopper */
    bed.updateMatrixWorld(true); const lip = new V3(-.05, .06, 0); bed.localToWorld(lip);
    LI.forEach((l, i) => { const u = (T * 1.1 + l.ph) % 1, x = lip.x + l.vx * u * .9 - .15 * u, y = lip.y - 2.4 * u * u - .1 * u, land = hopF(x, l.z * .9) + l.s * .6, yy = Math.max(land, y), e = Math.min(1, u / .08, (1 - u) / .12);
      o3.position.set(x, yy, l.z * (.75 + .2 * u)); o3.scale.setScalar(l.s * e); o3.rotation.set(l.o + u * 5, l.o, u * 3); o3.updateMatrix(); lumps.setMatrixAt(i, o3.matrix); });
    lumps.instanceMatrix.needsUpdate = true;
    { const P = sheetG.attributes.position.array, U = sheetG.attributes.uv.array, land = hopF(lip.x - .6, 0) + .03;   /* a ribbon from the lip of the body, curving down onto the hopper load */
      for (let i = 0; i <= NSG; i++) { const u = i / NSG, x = lip.x + .04 - .62 * u, y = lip.y + .06 - (lip.y + .06 - land) * u * u, hw = .78 + .3 * u; P.set([x, y, -hw, x, y, hw], i * 6); U.set([0, u * 1.4, 1.7, u * 1.4], i * 4); }
      sheetG.attributes.position.needsUpdate = true; sheetG.attributes.uv.needsUpdate = true; sheetG.computeVertexNormals(); scrollMat(sheetM, 0, -T * .9); }
    /* roller: back and forth behind the paver (a run toward it, a run back), drums turning with the road */
    const rx = RX0 + RA * Math.sin(T * TAU / RT), dr = rx - RX0 + D; roller.position.x = rx; const ra = -dr / RJ.r; if (N['r:DrumF']) N['r:DrumF'].rotation.z = ra; if (N['r:DrumR']) N['r:DrumR'].rotation.z = ra;
    const rspeed = Math.abs(RA * TAU / RT * Math.cos(T * TAU / RT) + VG);
    spray.forEach(s => { const k = (T * 2.2 + s.ph) % 1, b = s.f ? RJ.sprayF : RJ.sprayR, sx = rx + b[0], dir = s.f ? 1 : -1; s.m.position.set(sx + dir * .08 * k, b[1] - .3 * k, s.z); const sc = .12 + .2 * k; s.m.scale.set(sc, sc, 1); s.m.material.opacity = Math.sin(Math.PI * k) * .32 * clamp(rspeed * 2); });
    /* steam */
    steam.forEach(s => { const k = (T * s.sp + s.ph) % 1; let bx = s.x, by = M.fresh, bz = s.z;
      let wrap = 1; if (s.zone === 'mat') { bx = s.x - (D % 3); while (bx < S.back - 3.2) bx += 3; by = matTop(bx); wrap = Math.sin(Math.PI * clamp((bx - (S.back - 3.2)) / 3)); } else if (s.zone === 'aug') { by = .5; bz = s.z * .7; } else { by = hopF(s.x, s.z * .5) + .05; bz = s.z * .5; }
      s.m.position.set(bx - k * .35, by + .1 + k * 1.5, bz + Math.sin(k * 3 + s.ph * 6) * .15); const sc = .7 + k * 2.0; s.m.scale.set(sc, sc, 1); s.m.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.1)) * (s.zone === 'mat' ? .34 : .26) * wrap; });
    return go || cMove;
  };
  return out;
}
