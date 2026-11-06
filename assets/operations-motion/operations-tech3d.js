/* CONNECTED OPERATIONS — the quality-control technicians in 3D (chapter 4).
   A rigged character (Mixamo skeleton) drawn into a WebGL canvas that sits between the scene's moving layer and
   its foreground (the laboratory's front), seen by an orthographic camera that matches the SVG camera exactly, and
   redrawn at the screen's own resolution every frame, so it stays sharp at any zoom.
   The choreography stays in operations-motion.js: each frame the 2D rig solves the pose — hip, planted feet with
   their heel/toe angles, wrists and hand angles, torso lean, gaze — and this module retargets it onto the skeleton
   by two-bone IK, in the character's own frame (x his left, y up, z forward; 1 unit = 1 unit of the 2D rig).
   The sample bucket and scoop are built here and placed from the same pose, so they follow his hands exactly.
   The OM Group logos are rendered from the official traced logo (window.OPM_LOGO), never redrawn. */
import * as THREE from '../vendor/three/three.module.min.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { clone as cloneSkinned } from '../vendor/three/SkeletonUtils.js';

const D2R = Math.PI / 180, clamp = (v, a, b) => Math.min(b, Math.max(a, v)), EASEIN = x => x * x;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const wpos = o => o.getWorldPosition(new THREE.Vector3());
const wquat = o => o.getWorldQuaternion(new THREE.Quaternion());

// set a bone's world rotation (keeps its parent)
function setWorldQuat(bone, q) { bone.quaternion.copy(wquat(bone.parent).invert().multiply(q)); bone.updateMatrixWorld(true); }
// turn a bone so that a point it carries (now at `from`, world) moves onto the line toward `to`
function aim(bone, from, to) {
  const P = wpos(bone), a = from.clone().sub(P).normalize(), b = to.clone().sub(P).normalize();
  if (a.lengthSq() < 1e-9 || b.lengthSq() < 1e-9) return;
  setWorldQuat(bone, new THREE.Quaternion().setFromUnitVectors(a, b).multiply(wquat(bone)));
}
// two-bone IK: upper → lower → end reaches `target`; the middle joint bends toward `pole` (a world direction)
function twoBone(up, lo, end, target, pole) {
  const A = wpos(up), B = wpos(lo), C = wpos(end), l1 = A.distanceTo(B), l2 = B.distanceTo(C);
  const d = target.clone().sub(A), dist = clamp(d.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3), dir = d.normalize();
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const K = A.clone().addScaledVector(dir, l1 * cosA).addScaledVector(p, l1 * sinA), T = A.clone().addScaledVector(dir, dist);
  aim(up, B, K); aim(lo, wpos(end), T);
}
// a rotation taking the orthonormal basis (x0, y0) onto (x1, y1)
function basisTurn(x0, y0, x1, y1) {
  const m0 = new THREE.Matrix4().makeBasis(x0, y0, x0.clone().cross(y0)), m1 = new THREE.Matrix4().makeBasis(x1, y1, x1.clone().cross(y1));
  return new THREE.Quaternion().setFromRotationMatrix(m1.multiply(m0.transpose()));
}
const ortho = (v, n) => v.clone().sub(n.clone().multiplyScalar(v.dot(n))).normalize();

/* ---- the official logo, rendered to a texture (the lockup's orange mark over the navy OM GROUP; no tagline) ---- */
function logoTexture(kind, px = 1024) {
  const L = window.OPM_LOGO, cv = document.createElement('canvas');
  if (kind === 'name') {
    const k = px / L.lockup.w, h = Math.ceil(L.brand.h * k) + 4; cv.width = px; cv.height = h;
    const g = cv.getContext('2d'); g.scale(k, k);
    g.fillStyle = '#FF5E29'; g.fill(new Path2D(L.lockup.orange), 'evenodd'); g.fillStyle = '#1f2a4d'; g.fill(new Path2D(L.lockup.navy), 'evenodd');
    // keep only the mark and name (the tagline sits below the brand's height)
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, Math.floor(L.brand.h * k) + 2, px, h);
  } else {
    const S = L[kind.replace('-white', '')], k = px / S.w; cv.width = px; cv.height = Math.ceil(S.h * k);
    const g = cv.getContext('2d'); g.scale(k, k); g.fillStyle = /-white$/.test(kind) ? '#fff' : '#FF5E29'; g.fill(new Path2D(S.d), 'evenodd');
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.aspect = cv.width / cv.height; return t;
}
// the character's surface: the source renders (eight views round him), packed in one atlas and projected onto his
// rest pose, each through its own projection (stored in the model). Which render a point shows depends on where the
// camera is: the one drawn from closest to the current viewing angle (in his own frame, per bone, so a swinging arm
// counts too) among those that see that point (visibility per vertex, also in the model). Seen from a render's own
// angle he looks exactly like that render; between two, the change-over is a few degrees wide — no seams on his body.
export function projectiveMaterial(tex, views, sharp = 160, helmY = 1.875) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide });
  const pad8 = k => Array.from({ length: 8 }, (_, i) => (views[i] ? new THREE.Vector4(...views[i][k]) : new THREE.Vector4()));
  const dirs = Array.from({ length: 8 }, (_, i) => (views[i] ? new THREE.Vector3(Math.sin(views[i].yaw * Math.PI / 180), 0, Math.cos(views[i].yaw * Math.PI / 180)) : new THREE.Vector3(0, -1, 0)));
  m.onBeforeCompile = sh => {
    sh.uniforms.uAtlas = { value: tex }; sh.uniforms.uMx = { value: pad8('mx') }; sh.uniforms.uMy = { value: pad8('my') }; sh.uniforms.uFlat = { value: 0.4 };
    sh.uniforms.uDir = { value: dirs }; sh.uniforms.uSharp = { value: sharp }; sh.uniforms.uHelm = { value: helmY }; // (the helmet's brim height in the model, rest pose)
    // vd0/vd1: each view's outline correction (a horizontal shift in atlas units, ÷ 0.05)
    sh.vertexShader = 'attribute vec4 vw0; attribute vec4 vw1; attribute vec4 vd0; attribute vec4 vd1; attribute vec4 vs0; attribute vec4 vs1; varying vec4 vW0; varying vec4 vW1; varying vec4 vD0; varying vec4 vD1; varying vec4 vS0; varying vec4 vS1; varying vec3 vRest; varying vec3 vRestN; varying vec3 vEyeRest;\n'
      + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vW0 = vw0; vW1 = vw1; vD0 = vd0 * 0.05; vD1 = vd1 * 0.05; vS0 = vs0; vS1 = vs1;')
        // the direction to the camera (orthographic: the view's +z), in the rest pose's frame at this vertex
        .replace('#include <skinnormal_vertex>', `#include <skinnormal_vertex>
          { vec3 eo = (vec4(0.0, 0.0, 1.0, 0.0) * modelViewMatrix).xyz;
          #ifdef USE_SKINNING
            eo = transpose(mat3(skinMatrix)) * eo;
          #endif
            vEyeRest = eo; vRestN = normal; }`);
    sh.fragmentShader = 'uniform sampler2D uAtlas; uniform vec4 uMx[8]; uniform vec4 uMy[8]; uniform vec3 uDir[8]; uniform float uFlat; uniform float uSharp; uniform float uHelm; varying vec4 vW0; varying vec4 vW1; varying vec4 vD0; varying vec4 vD1; varying vec4 vS0; varying vec4 vS1; varying vec3 vRest; varying vec3 vRestN; varying vec3 vEyeRest; float gHead = 0.0;\n'
      + sh.fragmentShader.replace('#include <map_fragment>', `{ vec4 P = vec4(vRest, 1.0); float w[8]; w[0]=vW0.x; w[1]=vW0.y; w[2]=vW0.z; w[3]=vW0.w; w[4]=vW1.x; w[5]=vW1.y; w[6]=vW1.z; w[7]=vW1.w;
        float sx[8]; sx[0]=vD0.x; sx[1]=vD0.y; sx[2]=vD0.z; sx[3]=vD0.w; sx[4]=vD1.x; sx[5]=vD1.y; sx[6]=vD1.z; sx[7]=vD1.w;
        vec2 e = vEyeRest.xz; e = dot(e, e) > 1e-10 ? normalize(e) : vec2(0.0, 1.0); vec3 n = normalize(vRestN);
        vec3 col = vec3(0.0); float ws = 0.0;
        float cmax = -2.0; for (int i = 0; i < 8; i++) { if (w[i] > 0.002) cmax = max(cmax, dot(e, uDir[i].xz)); } // (relative to the nearest seeing view: no underflow)
        for (int i = 0; i < 8; i++) { if (w[i] > 0.002) {
          float k = w[i] * exp(uSharp * (dot(e, uDir[i].xz) - cmax)) * (0.2 + smoothstep(-0.05, 0.4, dot(n, uDir[i])));
          col += k * (DBG > 0 ? vec3(float(i == 0 || i == 3 || i == 6), float(i == 1 || i == 3 || i == 7), float(i == 2 || i == 6 || i == 7 || i == 4) * (i == 4 ? 0.5 : 1.0)) : texture2D(uAtlas, vec2(dot(uMx[i], P) + sx[i], dot(uMy[i], P))).rgb); ws += k; } }
        col = col / max(ws, 1e-30);
        // the head: its fixed surface (baked view shares, the same from every angle — one face), mixed in by its weight
        float ss[8]; ss[0]=vS0.x; ss[1]=vS0.y; ss[2]=vS0.z; ss[3]=vS0.w; ss[4]=vS1.x; ss[5]=vS1.y; ss[6]=vS1.z; ss[7]=vS1.w;
        float hm = 0.0; vec3 hc = vec3(0.0);
        for (int i = 0; i < 8; i++) { if (ss[i] > 0.002) { hc += ss[i] * (DBG > 2 ? vec3(float(i == 0 || i == 3 || i == 6), float(i == 1 || i == 3 || i == 7), float(i == 2 || i == 6 || i == 7 || i == 4) * (i == 4 ? 0.5 : 1.0)) : DBG > 1 ? vec3(1.0, 0.0, 1.0) : texture2D(uAtlas, vec2(dot(uMx[i], P) + sx[i], dot(uMy[i], P))).rgb); hm += ss[i]; } }
        if (hm > 0.002) col = mix(col, hc / hm, clamp(hm, 0.0, 1.0));
        // the helmet shell above the brim: a plain white shell, so away from its front (where the front render's ridges
        // and highlights are kept) it is drawn white and shaded by the scene — the renders' grazing edges and the
        // painted-out logo patches would smear grey over it
        float hk = smoothstep(uHelm, uHelm + 0.014, vRest.y) * (1.0 - smoothstep(0.5, 0.82, n.z));
        col = mix(col, vec3(0.935, 0.935, 0.925), DBG > 0 ? 0.0 : hk);
        gHead = clamp(hm, 0.0, 1.0) * (1.0 - 0.85 * hk);
        diffuseColor.rgb = col; }`.replace(/DBG/g, String(m.userData.debug || 0)))
        // the renders carry their own studio shading: the scene's lighting is mixed in only partly
        // (the head almost entirely: its pictures are shaded already, and the generated mesh has thin creases at the
        // glasses' arms and ears that the scene's light would draw as dark cracks)
        .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, diffuseColor.rgb, mix(uFlat, 0.9, gHead));\n#include <opaque_fragment>');
  };
  return m;
}
const decal = (tex, w) => new THREE.Mesh(new THREE.PlaneGeometry(w, w / tex.aspect), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));

/* ---- props: the sample bucket (origin = where the fist closes on its bail; it hangs below) and the scoop ---- */
function makeBucket(nameTex) {
  const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xf7f6f3, roughness: 0.45 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(8, 6.8, 18, 40, 1, true), white); body.position.y = -13; g.add(body);
  const base = new THREE.Mesh(new THREE.CircleGeometry(6.8, 40), white); base.rotation.x = Math.PI / 2; base.position.y = -22; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(8.1, 0.75, 10, 48), dark); rim.rotation.x = Math.PI / 2; rim.position.y = -4; g.add(rim);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(7.6, 40), new THREE.MeshStandardMaterial({ color: 0xd9d7d2, roughness: 0.8 })); inside.rotation.x = -Math.PI / 2; inside.position.y = -6; g.add(inside);
  // the bail: an arc from rim to rim over the top, a dark grip sleeve where the hand closes
  const arc = new THREE.Mesh(new THREE.TorusGeometry(8, 0.45, 8, 32, Math.PI), new THREE.MeshStandardMaterial({ color: 0x55585d, metalness: 0.6, roughness: 0.35 })); arc.position.y = -4; g.add(arc);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5, 12), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: 0.5 })); grip.rotation.z = Math.PI / 2; grip.position.y = 3.6; g.add(grip);
  // the logo on the side facing us, following the wall's curve
  const lw = 11.2, lh = lw / nameTex.aspect, arcW = lw / 7.7;
  const lg = new THREE.Mesh(new THREE.CylinderGeometry(7.72, 7.42, lh, 24, 1, true, -arcW / 2, arcW), new THREE.MeshStandardMaterial({ map: nameTex, transparent: true, roughness: 0.5, depthWrite: false }));
  lg.position.y = -12.6; g.add(lg);
  // the sample in it (shown when it holds material)
  const heap = new THREE.Group(), stoneM = new THREE.MeshStandardMaterial({ color: 0x3a3b40, roughness: 0.85, flatShading: true });
  [[-3, -4.4, 1], [0, -4, -2], [3.2, -4.5, 1.4], [1, -4.2, 2.6], [-1.6, -4.6, -3.2], [-4, -4.8, -1]].forEach(([x, y, z], i) => { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7 + (i % 3) * 0.35, 0), stoneM); s.position.set(x, y, z); s.rotation.set(i, i * 2, i * 3); heap.add(s); });
  g.add(heap); g.userData.heap = heap; g.userData.logo = lg;
  return g;
}
// the sampling scoop (origin = the grip, the trough toward +x, open side +y): a square-mouth trough — flat bottom,
// two side walls and a back plate, open at the top and the front edge (x 22), so a sample heaped in it shows above the
// walls and pours off the front when it is tipped
function makeScoop() {
  const g = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0xd2d6db, metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 9, 14), new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.6 })); handle.rotation.z = Math.PI / 2; handle.position.x = 1.2; g.add(handle);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.4, 10), steel); neck.rotation.z = Math.PI / 2; neck.position.x = 7.3; g.add(neck);
  const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), steel); m.position.set(x, y, z); g.add(m); return m; };
  box(13, 0.45, 7.4, 15.5, -2.7, 0); // bottom
  box(13, 3.4, 0.35, 15.5, -1.15, 3.55); box(13, 3.4, 0.35, 15.5, -1.15, -3.55); // side walls (top at y 0.55)
  box(0.45, 3.4, 7.4, 9.2, -1.15, 0); // back plate
  const rim = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.35 }); // the rolled front edge
  const lipBar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7.4, 8), rim); lipBar.rotation.x = Math.PI / 2; lipBar.position.set(22, -2.6, 0); g.add(lipBar);
  // the sample: six stones heaped in the trough, their tops above the walls
  const load = new THREE.Group(), stoneM = new THREE.MeshStandardMaterial({ color: 0x3a3b40, roughness: 0.85, flatShading: true });
  [[12.4, -0.6, 1.4, 2.1], [15.2, -0.2, -1.5, 2.3], [18.4, -0.8, 1, 2], [13.8, 0.9, -0.2, 1.7], [16.8, 1.1, 0.6, 1.8], [20, -1, -1.4, 1.6]].forEach(([x, y, z, r], i) => { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), stoneM); s.position.set(x, y, z); s.rotation.set(i, i * 2, i * 3); load.add(s); });
  g.add(load); g.userData.load = load;
  return g;
}

// finger posing: g = grip (0 relaxed hand .. 1 closed on a handle). Each finger closes in its own time (the index first, the little
// finger last on the working hand; the reverse on the support hand, which hooks with its little finger first) and each joint has its
// own range; at rest the fingers lie in a natural cascade, never in one fixed curl.
const OPEN_J = [74, 96, 60], OPEN_T = [38, 34, 40];
const THUMB_CURL = 1.55;   // the baked thumb stands out from the glove: tuck it against the curled fingers
const FIST_CURL = 1.1;   // the baked glove is only loosely closed: curl the fingers past it (x the baked pose) so the fist is compact and no finger stands out
const REST_C = { Thumb: THUMB_CURL, Index: 1, Middle: 1, Ring: 1, Pinky: 1 };   // resting: a compact, relaxed closed fist (nothing protrudes)
const LAG = [{ Thumb: 0.16, Index: 0, Middle: 0.05, Ring: 0.1, Pinky: 0.15 }, { Thumb: 0.12, Index: 0.14, Middle: 0.09, Ring: 0.04, Pinky: 0 }];
// neutral wrist: the hand's direction may deviate from the forearm's by at most WRIST_MAX (degrees); the arm does the moving
const WRIST_MAX = 9, WRIST_SCOOP = 90;   // holding the scoop, the wrist follows the planned tilt (the hand turns with the handle, so the fingers stay closed round it)
const limitDir = (d, ref, deg) => { const a = d.angleTo(ref), m = deg * D2R; if (a <= m) return d; const ax = ref.clone().cross(d); if (ax.lengthSq() < 1e-9) return d; return ref.clone().applyAxisAngle(ax.normalize(), m); };
const sstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function fingers(P, s, g, sec, who) {
  for (const F of P.FING[s]) {
    const lag = LAG[who][F.name], c = sstep((g - lag) / (1 - lag)), rest = REST_C[F.name];
    // closure 0..1: from the resting cascade (a faint life in it) to the grip
    const sway = 0;
    const cl = F.name === "Thumb" ? THUMB_CURL : FIST_CURL * clamp(rest + sway + (1 - rest) * c, 0, 1), range = F.name === 'Thumb' ? OPEN_T : OPEN_J;
    F.chain.forEach((j, ji) => { const a = (1 - cl) * range[ji] * D2R; j.b.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(j.ax, a)).multiply(j.bq); });
  }
}

export async function createTech3D({ canvas, url, atlas, ids }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000); cam.position.set(0, 0, 2000);
  // light from the upper left and front, as the illustrations; a warm fill and a soft ground bounce
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0x8f877b, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-0.55, 0.8, 0.7); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffeedd, 0.55); fill.position.set(0.7, 0.2, 0.5); scene.add(fill);
  const rimL = new THREE.DirectionalLight(0xffffff, 0.5); rimL.position.set(0.2, 0.6, -1); scene.add(rimL);
  const gltf = await new GLTFLoader().loadAsync(url);
  const nameTex = logoTexture('name'), whiteTex = logoTexture('brand-white');
  // the projective surface, when the model carries one (views in its extras) and its atlas loads
  let host0 = null; gltf.scene.traverse(o => { if (o.userData && o.userData.views) host0 = o; });
  let surface = null;
  if (host0 && atlas) { const tex = await new THREE.TextureLoader().loadAsync(atlas); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 8; surface = projectiveMaterial(tex, host0.userData.views); }

  function makePerson(id) {
    const model = cloneSkinned(gltf.scene), root = new THREE.Group(), body = new THREE.Group();
    root.add(body); body.add(model); scene.add(root);
    model.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false;
      // the per-view weights come back from glTF as custom attributes (_vw0, _vw1)
      for (const k of ['vw0', 'vw1', 'vd0', 'vd1', 'vs0', 'vs1']) { const a = o.geometry.getAttribute('_' + k) || o.geometry.getAttribute('_' + k.toUpperCase()); if (a) o.geometry.setAttribute(k, a); }
      if (surface && o.geometry.getAttribute('vw0')) o.material = surface; else if (o.material) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; } }); // (generated meshes can have small openings)
    const bone = n => model.getObjectByName('mixamorig' + n) || model.getObjectByName('mixamorig:' + n);
    const side = s => ({ leg: ['UpLeg', 'Leg', 'Foot', 'ToeBase'].map(n => bone(s + n)), arm: ['Arm', 'ForeArm', 'Hand', 'HandMiddle1', 'HandIndex1', 'HandPinky1'].map(n => bone(s + n)) });
    const B = { hips: bone('Hips'), spine: [bone('Spine'), bone('Spine1'), bone('Spine2')], neck: bone('Neck'), head: bone('Head'), L: side('Left'), R: side('Right') };
    // scale: his hip joints stand 55 units above the ground, as the 2D rig's
    root.updateMatrixWorld(true);
    const hipJ = () => wpos(B.L.leg[0]).add(wpos(B.R.leg[0])).multiplyScalar(0.5);
    const k = 55 / hipJ().y; body.scale.setScalar(k); root.updateMatrixWorld(true);
    // the bind pose (every bone's local rotation and the hips' position), and measurements in his own frame
    const bones = []; model.traverse(o => { if (o.isBone) bones.push([o, o.quaternion.clone(), o.position.clone()]); });
    const rest = {
      hipsOff: wpos(B.hips).sub(hipJ()),
      footQ: { L: wquat(B.L.leg[2]), R: wquat(B.R.leg[2]) },
      lat: { leg: wpos(B.L.leg[0]).x, sh: wpos(B.L.arm[0]).x },
      armLen: wpos(B.L.arm[0]).distanceTo(wpos(B.L.arm[1])) + wpos(B.L.arm[1]).distanceTo(wpos(B.L.arm[2])),
      handQ: { L: wquat(B.L.arm[2]), R: wquat(B.R.arm[2]) },
      handF: { L: wpos(B.L.arm[3]).sub(wpos(B.L.arm[2])).normalize(), R: wpos(B.R.arm[3]).sub(wpos(B.R.arm[2])).normalize() },
      handN: {}, handLen: wpos(B.L.arm[3]).distanceTo(wpos(B.L.arm[2])),
    };
    ['L', 'R'].forEach(s => { const a = B[s].arm, across = wpos(a[4]).sub(wpos(a[5])); rest.handN[s] = ortho(across.cross(rest.handF[s]), rest.handF[s]); });
    // the logos (the official artwork) where the reference sheet has them: the model carries their anchors (chest
    // pocket, back, helmet front — surface point, width, facing), pinned to the bone under each so they move with him
    const pin = (b, mesh, at, ry) => { mesh.position.copy(b.worldToLocal(at.clone())); mesh.quaternion.copy(wquat(b).invert().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry))); mesh.scale.setScalar(1 / b.getWorldScale(V()).x); b.add(mesh); };
    let host = null; model.traverse(o => { if (o.userData && o.userData.decals) host = o; });
    if (host) {
      const D = host.userData.decals, s = host.getWorldScale(V()).x, put = (d, bone, tex) => { const at = host.localToWorld(V(...d.at)), back = d.n[2] < 0; at.z += back ? -0.35 : 0.35; pin(bone, decal(tex, d.w * s), at, back ? Math.PI : 0); };
      // the official logo: white on the orange vest (chest pocket and back), full colour on the white helmet
      put(D.chest, B.spine[2], whiteTex); put(D.back, B.spine[2], whiteTex); put(D.helmet, B.head, nameTex);
    }
    // finger rig: every finger joint gets its own flexion axis, found from the bind pose (the glove is modelled closed). The axis
    // is whichever hand-frame axis opens the finger most; it is kept in the joint's parent space, so it holds in any pose.
    const FING = { L: [], R: [] };
    ['L', 'R'].forEach(s => {
      const pre = s === 'L' ? 'Left' : 'Right', hand = bone(pre + 'Hand'), palm = wpos(bone(pre + 'HandMiddle1'));
      const hq = wquat(hand), fw = rest.handF[s], nn = rest.handN[s], ac = fw.clone().cross(nn).normalize();
      const cand = [fw, nn, ac].flatMap(v => [v.clone(), v.clone().negate()]);
      ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].forEach((name, fi) => {
        const js = [1, 2, 3].map(j => bone(pre + 'Hand' + name + j)); if (js.some(b => !b)) return;
        const tipOf = () => { js[2].updateMatrixWorld(true); return wpos(js[2]); };
        const chain = js.map((b, ji) => {
          const bq = b.quaternion.clone(); let best = null, bd = -1e9;
          for (const c of cand) {
            b.quaternion.copy(bq); setWorldQuat(b, new THREE.Quaternion().setFromAxisAngle(c, 0.5).multiply(wquat(b)));
            const d = (ji === 2 ? wpos(js[2]).add(wpos(js[2]).sub(wpos(js[1])).multiplyScalar(0.5)) : tipOf()).distanceTo(palm);
            if (d > bd) { bd = d; best = c; }
          }
          b.quaternion.copy(bq); b.updateMatrixWorld(true);
          return { b, bq, ax: best.clone().applyQuaternion(wquat(b.parent).invert()) };
        });
        FING[s].push({ name, fi, chain });
      });
    });
    const bucket = makeBucket(nameTex), scoop = makeScoop(); scene.add(bucket); scene.add(scoop);
    // the sample's stones once they leave the scoop (they fall in the world, into the bucket)
    const fall = scoop.userData.load.children.map(s => { const m = s.clone(); m.visible = false; scene.add(m); return m; });
    return { id, root, body, model, B, bones, rest, k, bucket, scoop, fall, FING, gs: { L: 0.4, R: 0.4 }, gt: null };
  }
  const people = Object.fromEntries(ids.map(id => [id, makePerson(id)]));

  /* ---- pose: retarget one frame of the 2D rig ----
     Q: { x, y (ground, world), yaw (0 faces us, +90 faces right), hip:[f, y], lean, look, feet: { L, R: [f, y, angle] |
          { lat, f, y, heading, lift } }, wrists: { L, R: [f, y] }, hands: { L, R: angle }, shoulders2D: { L, R: [f, y] },
          bucket: { mode: 'hand' | 'free' | 'none', at, tilt, sway, heap }, scoop: 'hand' | 'belt' | 'none', load } */
  function pose(id, Q) {
    const P = people[id]; if (!P) return;
    P.root.visible = !!Q;
    if (!Q) { P.bucket.visible = P.scoop.visible = false; return; }
    for (const [b, q, p] of P.bones) { b.quaternion.copy(q); b.position.copy(p); }
    P.root.position.set(Q.x, -Q.y, 0); P.root.rotation.set(0, Q.yaw * D2R, 0); P.root.updateMatrixWorld(true);
    const R = P.root, B = P.B, L3 = (lat, f, y) => R.localToWorld(V(lat, -y, f)), axisX = V(1, 0, 0).applyQuaternion(R.quaternion);
    // hips: the hip joints where the 2D rig has them
    const hips = L3(0, Q.hip[0], Q.hip[1]).add(P.rest.hipsOff.clone().applyQuaternion(R.quaternion));
    B.hips.position.copy(B.hips.parent.worldToLocal(hips)); B.hips.updateMatrixWorld(true);
    // the torso turns at the waist (twist, feet planted) and leans forward from the hips, both spread over the spine;
    // the head adds the gaze
    const lean = (Q.lean || 0) * D2R, twist = (Q.twist || 0) * D2R, UP = V(0, 1, 0);
    let cum = 0;
    [[0.5, 0.3], [0.3, 0.35], [0.2, 0.35]].forEach(([wl, wt], i) => { cum += wt;
      const ax = axisX.clone().applyAxisAngle(UP, twist * cum);
      setWorldQuat(B.spine[i], new THREE.Quaternion().setFromAxisAngle(ax, lean * wl).multiply(new THREE.Quaternion().setFromAxisAngle(UP, twist * wt)).multiply(wquat(B.spine[i]))); });
    // the chest's frame (his root turned by the twist): the arms reach in it
    const Rq = new THREE.Quaternion().setFromAxisAngle(UP, twist).multiply(R.quaternion);
    const headAbs = Math.min((Q.lean || 0) * 0.45 + (Q.look || 0), 20) * D2R, extra = headAbs - lean;
    setWorldQuat(B.neck, new THREE.Quaternion().setFromAxisAngle(axisX, extra * 0.4).multiply(wquat(B.neck)));
    setWorldQuat(B.head, new THREE.Quaternion().setFromAxisAngle(axisX, extra * 0.6).multiply(wquat(B.head)));
    // turning, the head leads the body
    if (Q.headYaw) { const up = V(0, 1, 0); setWorldQuat(B.neck, new THREE.Quaternion().setFromAxisAngle(up, Q.headYaw * 0.4 * D2R).multiply(wquat(B.neck))); setWorldQuat(B.head, new THREE.Quaternion().setFromAxisAngle(up, Q.headYaw * 0.6 * D2R).multiply(wquat(B.head))); }
    // legs: each ankle by IK, knees forward; the foot takes its heel-strike / toe-off angle and its own heading
    for (const s of ['L', 'R']) {
      const F = Q.feet[s], lat = P.rest.lat.leg * (s === 'L' ? 1 : -1) * 0.92, [up, lo, ft] = P.B[s].leg;
      const heading = (F.heading || 0) * D2R, fl = F.lat !== undefined ? F.lat : lat;
      const loc = F.lat !== undefined ? V(fl * Math.cos(heading) + F.f * Math.sin(heading), -F.y, -fl * Math.sin(heading) + F.f * Math.cos(heading)) : V(fl, -F.y, F.f);
      const target = R.localToWorld(loc), pole = V(0, 0, 1).applyQuaternion(R.quaternion);
      twoBone(up, lo, ft, target, pole);
      const qFoot = R.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), heading)).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), (F.a || 0) * D2R));
      setWorldQuat(ft, qFoot.multiply(P.rest.footQ[s]));
    }
    // arms: each wrist by IK — the 2D reach from the shoulder, scaled to his arm — elbows behind; then the hand's
    // fingers along the 2D hand angle with the palm turned in
    // the bucket standing on the ground is placed first (the scoop is aimed at its mouth)
    const bk = Q.bucket || { mode: 'none' };
    P.bucket.visible = bk.mode !== 'none';
    const heapN = bk.heapN !== undefined ? bk.heapN : bk.heap ? 6 : 0; P.bucket.userData.heap.visible = heapN > 0;
    P.bucket.userData.heap.children.forEach((c, i) => { c.visible = i < heapN; });
    if (bk.mode === 'free') {
      P.bucket.position.copy(L3(bk.lat || 0, bk.at[0], bk.at[1]));
      P.bucket.rotation.set(0, 0, 0); P.bucket.rotateOnWorldAxis(axisX, (bk.tilt || 0) * D2R);
    }
    // the scoop aimed at a point (Q.scoopTo, blended in by w): its bowl on the 20 mm pile's surface — a point of
    // the 2D world, at the depth of his reach — or its lip over the bucket's mouth; alpha: the scoop's pitch (0
    // level, + tipped down), in his chest's frame. The left hand is solved from it, so the scoop stays in the fist.
    const BELT_UP = 1.1, BELT_OUT = 0.85, HANG_FOLLOW = 0.12, CARRY_ALPHA = 35, CARRY_MAX = 50, STOW_T = 1.375, STOW_D = 0.4;   // belt clip: above the hip joint, out from the thigh (x hand length)
    const GRIP_OBL = 20, GF = 0.3, GN = 0.0;   // handle ~20 deg off the curl axis (a real power grip), through the fist: GF along the fingers, GN toward the palm (x hand length)
    const BOWL = 15.6, LIP = 22, sT = Q.scoop === 'hand' && Q.scoopTo && Q.scoopTo.w > 0 ? Q.scoopTo : null;
    let wristT = null, hT = 0, Tb = null, aV = null;
    if (sT) {
      const fw = V(0, 0, 1).applyQuaternion(Rq), al = sT.alpha * D2R, hh = (sT.alpha - GRIP_OBL) * D2R;
      const a = fw.clone().multiplyScalar(Math.cos(al)).addScaledVector(UP, -Math.sin(al)), f = fw.clone().multiplyScalar(-Math.sin(hh)).addScaledVector(UP, -Math.cos(hh));
      const shL = wpos(P.B.L.arm[0]); let T;
      const overB = P.bucket.position.clone().add(V(0, -4 + (sT.lift || 9), 0)).addScaledVector(a, -(LIP - BOWL));
      if (sT.p) { const dx = Math.abs(fw.x) > 0.25 ? fw.x : 0.25 * Math.sign(fw.x || 1), r = (sT.p[0] - shL.x) / dx; T = V(sT.p[0], -sT.p[1], shL.z + r * fw.z).lerp(overB, sT.over || 0); }
      else T = overB;
      T.y += sT.arc || 0; Tb = T.clone(); aV = a.clone();
      const nPalm = ortho(V(-1, 0, 0).applyQuaternion(Rq), f);
      wristT = T.addScaledVector(a, -BOWL).addScaledVector(f, -P.rest.handLen * GF).addScaledVector(nPalm, -P.rest.handLen * GN); hT = sT.alpha - GRIP_OBL;
    }
    const reach = P.rest.armLen / 38;
    for (const s of ['L', 'R']) {
      const [up, lo, hand] = P.B[s].arm, sh = wpos(up), sg = s === 'L' ? 1 : -1;
      const w2 = Q.wrists[s], s2 = Q.shoulders2D[s], lat = Q.lat && Q.lat[s] !== undefined ? Q.lat[s] : 0;
      const rel = V(lat, -(w2[1] - s2[1]) * reach, (w2[0] - s2[0]) * reach).applyQuaternion(Rq);
      let tgt = sh.clone().add(rel), hd = Q.hands[s] || 0;
      if (s === 'L' && wristT) { tgt.lerp(wristT, sT.w); hd = hd + (hT - hd) * sT.w; }
      const pole = V(sg * 0.3, -0.2, -1).applyQuaternion(Rq), base = sh.clone().add(rel);
      twoBone(up, lo, hand, tgt, pole);
      const h = hd * D2R, want = V(0, -Math.cos(h), -Math.sin(h)).applyQuaternion(Rq);
      const wMax = s === 'L' && sT ? WRIST_MAX + (WRIST_SCOOP - WRIST_MAX) * sT.w : WRIST_MAX;
      let fdir = limitDir(want, wpos(hand).sub(wpos(lo)).normalize(), wMax);
      // the scoop's bowl target is solved again for the hand's real direction, so the wrist stays straight and the bowl still reaches
      if (s === 'L' && wristT) for (let it = 0; it < 3; it++) {
        const nP = ortho(V(-1, 0, 0).applyQuaternion(Rq), fdir);
        const w2 = Tb.clone().addScaledVector(aV, -BOWL).addScaledVector(fdir, -P.rest.handLen * GF).addScaledVector(nP, -P.rest.handLen * GN);
        twoBone(up, lo, hand, base.clone().lerp(w2, sT.w), pole);
        fdir = limitDir(want.clone().lerp(fdir, 0.0).normalize(), wpos(hand).sub(wpos(lo)).normalize(), wMax);
      }
      const nIn = ortho(V(-sg, 0, 0).applyQuaternion(Rq), fdir);
      setWorldQuat(hand, basisTurn(P.rest.handF[s], P.rest.handN[s], fdir, nIn).multiply(P.rest.handQ[s]));
      if (s === 'L') { P.handL = hd; P.fdirL = fdir.clone(); P.nInL = nIn.clone(); P.aV = sT ? aV : null; P.sw = sT ? sT.w : 0; }
    }
    // the bucket: hanging plumb from the right fist (with its swing), or placed where the 2D rig puts it
    let grip = false;
    if (bk.mode === 'hand') {
      const hd = P.B.R.arm[2], f = wpos(P.B.R.arm[3]).sub(wpos(hd)).normalize(), g = bk.toGround || 0;
      P.bucket.position.copy(wpos(hd).addScaledVector(f, P.rest.handLen * 0.9));
      // setting it down / lifting it: the bucket travels between the hand and its place on the ground, and the hand
      // stays on the bail the whole way (no jump from one to the other)
      if (g > 0) { P.bucket.position.lerp(L3(bk.lat || 0, bk.at[0], bk.at[1]), g); grip = true; }
      P.bucket.rotation.set(0, 0, -(bk.sway || 0) * (1 - g) * D2R);
    } else if (bk.mode === 'free') {
      grip = !!bk.grip;
    }
    if (grip) {
      // the right hand closes on the bail where the bucket is: fingers down, the wrist above the grip
      const [up, lo, hand] = P.B.R.arm, down = V(0, -1, 0);
      twoBone(up, lo, hand, P.bucket.position.clone().addScaledVector(down, -P.rest.handLen * 0.9), V(-0.3, -0.2, -1).applyQuaternion(Rq));
      const fdir = limitDir(down, wpos(hand).sub(wpos(lo)).normalize(), WRIST_MAX);
      setWorldQuat(hand, basisTurn(P.rest.handF.R, P.rest.handN.R, fdir, ortho(V(1, 0, 0).applyQuaternion(Rq), fdir)).multiply(P.rest.handQ.R));
    }
    // the scoop: in the left fist, in its oblique grip along the hand's angle; or clipped to the belt. The stones of
    // the sample: loadN of them in the bowl (each appears as the bowl drags through the heap); while being tipped out
    // each slides to the lip and falls into the bucket (Q.pour: its progress, 0–1)
    P.scoop.visible = Q.scoop !== 'none';
    const loadN = Q.loadN !== undefined ? Q.loadN : Q.load ? 4 : 0, pour = Q.pour || [];
    P.scoop.userData.load.visible = loadN > 0;
    P.scoop.userData.load.children.forEach((c, i) => { c.visible = i < loadN && !(pour[i] > 0); });
    // hand -> belt: when he clips the scoop on (Q.tau 1.375) it travels from the fist to the belt over STOW_D of story time, so it
    // never jumps; once clipped it stays on the same hip (the one nearest the camera at that moment) and hangs mostly by gravity
    const handPose = () => {
      // the handle lies along the fist's own curl axis (index knuckle to little finger), so the fingers close round it
      const hd = P.B.L.arm[2], f = P.fdirL || wpos(P.B.L.arm[3]).sub(wpos(hd)).normalize(), nIn = P.nInL || V(1, 0, 0);
      let ax = wpos(P.B.L.arm[4]).sub(wpos(P.B.L.arm[5])).normalize(); if (ax.dot(V(0, 0, 1).applyQuaternion(Rq)) < 0) ax.negate();
      const pos = wpos(hd).addScaledVector(f, P.rest.handLen * GF).addScaledVector(nIn, P.rest.handLen * GN);
      // carried (not yet aimed at the pile): the scoop rests tipped forward and down, not bolt upright; the tilt stays within a real grip angle of the fist
      const sw = P.sw || 0, fwB = V(0, 0, 1).applyQuaternion(Rq), cal = CARRY_ALPHA * D2R;
      const carry = fwB.clone().multiplyScalar(Math.cos(cal)).addScaledVector(UP, -Math.sin(cal));
      ax = ax.clone().lerp(limitDir(carry, ax, CARRY_MAX), 1 - sw).normalize();
      if (P.aV && sw > 0) ax = ax.clone().lerp(P.aV, sw).normalize();   // the scoop keeps its planned pitch; the hand only follows the forearm
      return { pos, q: basisTurn(V(1, 0, 0), V(0, 1, 0), ax, ortho(V(0, 1, 0), ax)) };
    };
    const beltPose = () => {
      if (!P.beltSide) P.beltSide = wpos(P.B.L.leg[0]).z >= wpos(P.B.R.leg[0]).z ? 'L' : 'R';
      const S = P.B[P.beltSide], hip = wpos(S.leg[0]), legDir = wpos(S.leg[1]).sub(hip).normalize();
      const lat = wpos(P.B.L.leg[0]).sub(wpos(P.B.R.leg[0])).normalize(), out = P.beltSide === 'L' ? lat : lat.clone().negate();
      const dir = V(0, -1, 0).lerp(legDir, HANG_FOLLOW).normalize();   // hangs from the clip: mostly plumb, leaning a little with the thigh
      return { pos: hip.clone().addScaledVector(V(0, 1, 0), P.rest.handLen * BELT_UP).addScaledVector(out, P.rest.handLen * BELT_OUT), q: basisTurn(V(1, 0, 0), V(0, 1, 0), dir, ortho(out, dir)) };
    };
    let stowS = 1;
    if (Q.scoop !== 'belt') P.beltSide = null;
    if (Q.scoop === 'hand') {
      const h = handPose(); P.scoop.position.copy(h.pos); P.scoop.quaternion.copy(h.q); stowS = 0;
      // remember where the fist holds it, in his hips' frame: the hand-over to the belt starts from exactly this pose
      const hb = P.B.hips; hb.updateWorldMatrix(true, false); const inv = hb.matrixWorld.clone().invert();
      P.heldPose = { pos: h.pos.clone().applyMatrix4(inv), q: wquat(hb).invert().multiply(h.q) };
    }
    else if (Q.scoop === 'belt') {
      const bp = beltPose(); stowS = Q.tau !== undefined ? sstep((Q.tau - STOW_T) / STOW_D) : 1;
      if (stowS < 1 && P.heldPose) {
        const hb = P.B.hips; hb.updateWorldMatrix(true, false); const hp = P.heldPose.pos.clone().applyMatrix4(hb.matrixWorld), hq = wquat(hb).multiply(P.heldPose.q);
        P.scoop.position.copy(hp.lerp(bp.pos, stowS)); P.scoop.quaternion.copy(hq.slerp(bp.q, stowS));
      }
      else { P.scoop.position.copy(bp.pos); P.scoop.quaternion.copy(bp.q); }
    }
    // hands: two independent controllers. LEFT is the working hand (it holds the scoop and drives it), RIGHT is the support hand (it
    // hooks the bucket bail, otherwise rests lightly curled and steadies). Each eases toward its own target at its own pace.
    const now = performance.now(), dt = P.gt === null ? 1 : Math.min((now - P.gt) / 1000, 0.5); P.gt = now;
    const tgtL = Q.scoop === 'hand' || (Q.scoop === 'belt' && stowS < 0.25) ? 1 : 0;   // the fist lets go once the scoop is most of the way to the belt
    const tgtR = grip || (bk.mode === 'hand') ? 1 : 0;
    const ease1 = (v, tg, tau) => (dt >= 0.5 ? tg : v + (tg - v) * (1 - Math.exp(-dt / tau)));
    P.gs.L = ease1(P.gs.L, tgtL, 0.14); P.gs.R = ease1(P.gs.R, tgtR, 0.22);
    fingers(P, 'L', P.gs.L, now / 1000, 0); fingers(P, 'R', P.gs.R, now / 1000, 1);
    P.scoop.updateMatrixWorld(true);
    P.bucket.updateMatrixWorld(true); const lipW = P.scoop.localToWorld(V(LIP, -2.2, 0));
    P.fall.forEach((m, i) => {
      const s = pour[i]; m.visible = Q.scoop === 'hand' && s > 0 && s < 1 && i < loadN;
      if (!m.visible) return;
      const from = P.scoop.localToWorld(P.scoop.userData.load.children[i].position.clone());
      const hs = P.bucket.userData.heap.children[i], rest = hs ? P.bucket.localToWorld(hs.position.clone()) : P.bucket.position.clone(); // where it then lies in the bucket
      if (s < 0.25) m.position.copy(from.lerp(lipW, EASEIN(s / 0.25))); // slides down the bowl to the lip
      else { const u = (s - 0.25) / 0.75; m.position.set(lipW.x + (rest.x - lipW.x) * u, lipW.y + (rest.y - lipW.y) * u * u, lipW.z + (rest.z - lipW.z) * u); } // and drops
      m.rotation.set(i + s * 4, i * 2 + s * 3, i * 3);
    });
    P.anchors = { lip: lipW, mouth: P.bucket.position.clone().add(V(0, -4, 0)) };
  }

  // camera: the SVG world camera, expressed as the world rectangle the stage shows
  function render(view, size) {
    const { x0, x1, y0, y1 } = view;
    cam.left = x0; cam.right = x1; cam.top = -y0; cam.bottom = -y1; cam.updateProjectionMatrix();
    // twice the screen's resolution on ordinary screens (the browser's downscale smooths every edge), the full 3× of
    // phone screens: the character is never stretched
    const dpr = clamp((window.devicePixelRatio || 1) * 2, 2, 3);
    if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
    const s = renderer.getSize(new THREE.Vector2());
    if (s.x !== size.w || s.y !== size.h) renderer.setSize(size.w, size.h, false);
    renderer.render(scene, cam);
  }
  // free the GPU side when a rebuild replaces this layer (a phone has few WebGL contexts to spare)
  function dispose() {
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); });
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* already lost */ }
  }
  return { pose, render, people, THREE, dispose, anchors: id => people[id] && people[id].anchors };
}
