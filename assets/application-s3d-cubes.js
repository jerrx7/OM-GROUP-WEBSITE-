/* scene: seven concrete test cubes, M20 to M60 (Ready-mix concrete page, "Concrete grades"). Real-looking demoulded cubes: a finely mottled cement-paste skin with sand
   speckle, a few air voids (more in the lower grades, fewer and finer in the higher ones, a little darker and bluer at M60), faint mould lines and rounded arrises.
   Each cube carries its grade written on the front in marker, as test cubes do, so nothing floats over the picture and nothing overlaps. Choosing a grade lifts its cube
   onto an orange ring; M60 stands apart on its own plate because it is available on request. Generic cubes: no test result, no recommendation. 1 unit = 1 dm (a cube is 5). */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
const { mk, sm } = L;
const V3 = THREE.Vector3;
const G = ['M20', 'M25', 'M30', 'M35', 'M40', 'M45', 'M60'];

/* colour and height canvases of one cube face */
function faceTex(seed, grade, text, size) {
  const r = rng(seed), t = grade / 6, cv = document.createElement('canvas'), hv = document.createElement('canvas'); cv.width = cv.height = hv.width = hv.height = size;
  const g = cv.getContext('2d'), h = hv.getContext('2d'), S = size / 512;
  const L0 = 162 - t * 38, tone = (d = 0) => { const l = L0 + d; return 'rgb(' + (l + 4 - t * 7 | 0) + ',' + (l + 1 | 0) + ',' + (l - 5 + t * 9 | 0) + ')'; };
  g.fillStyle = tone(); g.fillRect(0, 0, size, size); h.fillStyle = 'rgb(128,128,128)'; h.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) { const x = r() * size, y = r() * size, q = (60 + r() * 140) * S, gr = g.createRadialGradient(x, y, 0, x, y, q), d = (r() - .5) * 46; gr.addColorStop(0, tone(d).replace('rgb', 'rgba').replace(')', ',.22)')); gr.addColorStop(1, tone(d).replace('rgb', 'rgba').replace(')', ',0)')); g.fillStyle = gr; g.fillRect(x - q, y - q, q * 2, q * 2); }
  for (let i = 0; i < 260; i++) { const x = r() * size, y = r() * size, q = (5 + r() * 12) * S; g.fillStyle = tone((r() - .5) * 38).replace('rgb', 'rgba').replace(')', ',' + (.07 + r() * .08) + ')'); g.beginPath(); g.ellipse(x, y, q, q * (.6 + r() * .5), r() * 3, 0, 6.283); g.fill(); }
  /* sand speckle: a small palette of pre-built fill styles (grain count scaled to the texture area), batched by style: far cheaper than a new colour string per grain */
  const PAL = Array.from({ length: 14 }, (_, k) => { const v = -35 + k * 5.4; return [tone(v).replace('rgb', 'rgba').replace(')', ',.4)'), 'rgb(' + (128 + v * 1.4 | 0) + ',' + (128 + v * 1.4 | 0) + ',' + (128 + v * 1.4 | 0) + ')']; });
  const nGrain = 7000 * S * S; for (let i = 0; i < nGrain; i++) { const k = (r() * 14) | 0, q = (1.2 + r() * 2.2) * S, x = r() * size, y = r() * size; g.fillStyle = PAL[k][0]; g.fillRect(x, y, q, q); h.fillStyle = PAL[k][1]; h.fillRect(x, y, q, q); }
  const pores = Math.round((330 - t * 235) * S * S * 1.6);
  for (let i = 0; i < pores; i++) { const x = r() * size, y = r() * size, q = (.6 + Math.pow(r(), 2.4) * 4.2) * S * (1.2 - t * .35); g.fillStyle = 'rgba(40,38,36,.72)'; g.beginPath(); g.ellipse(x, y, q, q * (.75 + r() * .4), r() * 3, 0, 6.283); g.fill(); g.fillStyle = 'rgba(235,232,226,.35)'; g.beginPath(); g.ellipse(x + q * .35, y + q * .4, q * .85, q * .5, .6, 0, 6.283); g.fill(); g.fillStyle = 'rgba(12,12,12,.8)'; g.beginPath(); g.ellipse(x - q * .12, y - q * .12, q * .72, q * .66, 0, 0, 6.283); g.fill(); h.fillStyle = 'rgba(0,0,0,.9)'; h.beginPath(); h.arc(x, y, q, 0, 6.283); h.fill(); }
  for (let i = 0; i < 5; i++) { const y = r() * size; g.fillStyle = 'rgba(255,255,255,' + (.03 + r() * .03) + ')'; g.fillRect(0, y, size, (1 + r() * 3) * S); h.fillStyle = 'rgba(255,255,255,.12)'; h.fillRect(0, y, size, 1.5 * S); }
  for (let i = 0; i < 7; i++) { const x = r() * size, gr = g.createLinearGradient(0, 0, 0, size); gr.addColorStop(0, 'rgba(60,56,50,0)'); gr.addColorStop(.5, 'rgba(60,56,50,' + (.05 + r() * .05) + ')'); gr.addColorStop(1, 'rgba(60,56,50,0)'); g.fillStyle = gr; g.fillRect(x, 0, (3 + r() * 14) * S, size); }
  if (text) {                                                                  /* the grade, written on the front with a marker */
    g.save(); g.translate(size * .5, size * .46); g.rotate(-.025); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + Math.round(size * .3) + 'px "Segoe UI", Inter, Arial, sans-serif';
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(18,34,78,.9)'; g.fillStyle = 'rgba(18,34,78,.9)'; g.lineWidth = size * .006; g.strokeText(text, 0, 0); g.fillText(text, 0, 0);
    for (let i = 0; i < 240; i++) { g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,' + (.1 + r() * .25) + ')'; g.fillRect((r() - .5) * size * .6, (r() - .5) * size * .26, (.8 + r() * 2) * S, (.8 + r() * 2) * S); }
    g.globalCompositeOperation = 'source-over'; g.restore();
    g.fillStyle = 'rgba(18,34,78,.8)'; g.font = '600 ' + Math.round(size * .075) + 'px "Segoe UI", Inter, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('28 d', size * .5, size * .74);
  }
  const col = new THREE.CanvasTexture(cv); col.colorSpace = THREE.SRGBColorSpace; col.anisotropy = 8; const bump = new THREE.CanvasTexture(hv); bump.anisotropy = 8; return { col, bump };
}
/* a box with rounded arrises: push the corners of a subdivided box onto a rounded shape */
function roundedCube(s, rd, seg = 14) {
  const g = new THREE.BoxGeometry(s, s, s, seg, seg, seg), p = g.attributes.position, hv = s / 2 - rd, v = new V3(), c = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(Math.max(-hv, Math.min(hv, v.x)), Math.max(-hv, Math.min(hv, v.y)), Math.max(-hv, Math.min(hv, v.z))); const d = v.clone().sub(c); if (d.lengthSq() > 1e-9) d.normalize().multiplyScalar(rd); p.setXYZ(i, c.x + d.x, c.y + d.y, c.z + d.z); }
  g.computeVertexNormals(); return g;
}

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 34, key: 2.3, shadow: .3, map: 3072, y: .01 });
  const out = { scene, fov: 28, wide: true };
  const STEP = 7.2, X0 = -STEP * 3.2;
  /* a laboratory bench: pale composite top with a fine speckle and a satin finish */
  const benchTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'), r = rng(77); g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { const v = 190 + r() * 55 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 6) + ',.5)'; g.fillRect(r() * 512, r() * 512, 1.4, 1.4); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 2); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bench = mk(new THREE.BoxGeometry(66, .6, 15), new THREE.MeshStandardMaterial({ map: benchTex, roughness: .5, metalness: 0, envMapIntensity: .8 }), { cast: false }); bench.position.set(0, -.3, 0); scene.add(bench);
  const edge = mk(new THREE.BoxGeometry(66.1, .12, .3), new THREE.MeshStandardMaterial({ color: 0xb9b5ad, roughness: .4 }), { cast: false }); edge.position.set(0, -.04, 7.55); scene.add(edge);
  const geo = roundedCube(5, .14);
  const jobs = [], cubes = G.map((g, i) => {
    const hi = i === 6, base = t => new THREE.MeshStandardMaterial({ color: 0xa8a59e - i * 0x040404, roughness: .9, metalness: 0, envMapIntensity: .5 });
    const mS = base(), mF = base(); jobs.push(() => { const t = faceTex(90 + i, i, '', 384); mS.map = t.col; mS.bumpMap = t.bump; mS.bumpScale = 2.2; mS.color.set(0xffffff); mS.needsUpdate = true; }, () => { const t = faceTex(40 + i, i, g, 512); mF.map = t.col; mF.bumpMap = t.bump; mF.bumpScale = 2.2; mF.color.set(0xffffff); mF.needsUpdate = true; });
    const c = new THREE.Mesh(geo, [mS, mS, mS, mS, mF, mS]); c.castShadow = c.receiveShadow = true; c.position.set(X0 + i * STEP + (hi ? 3.4 : 0), 2.5, 0); c.rotation.y = .05 * (i % 2 ? 1 : -1); scene.add(c);
    const ring = mk(new THREE.TorusGeometry(3.9, .1, 8, 48), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .35 }), { cast: false }); ring.rotation.x = Math.PI / 2; ring.position.set(c.position.x, .06, 0); ring.visible = false; scene.add(ring);
    return { c, ring, y0: 2.5 };
  });
  const plate = mk(new THREE.BoxGeometry(7.4, .1, 7.4), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4 }), { cast: false }); plate.position.set(X0 + 6 * STEP + 3.4, .05, 0); scene.add(plate);
  out.views = { all: { az: -8, el: 16, dist: 78, t: [2.2, 2.6, 0] } }; out.limits = { az: [-55, 50], el: [6, 50], dist: [20, 100] };
  out.labels = [];
  /* the surface textures are painted one at a time between frames, so the page never freezes while they are made */
  let pending = true; const pump = () => { const j = jobs.shift(); if (!j) { pending = false; return; } try { j(); } catch (e) {} wake && wake(); setTimeout(pump, 40); }; setTimeout(pump, 200);
  const wake = null;
  out.update = (t, dt, st) => {
    const sel = st.g || 'M30', k = Math.min(1, dt * 8); let mv = false;
    cubes.forEach((o, i) => { const on = G[i] === sel, goal = on ? o.y0 + 1.2 : o.y0; o.c.position.y += (goal - o.c.position.y) * k; o.ring.visible = on; if (Math.abs(goal - o.c.position.y) > .02) mv = true; });
    return mv || pending;
  };
  return out;
}
