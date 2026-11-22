/* scene: the delivery of ready-mix concrete, in four views (Ready-mix concrete page, "From Batching Plant to Construction Site"): loading at the plant, the drum, the road, arrival and discharge.
   Models: the Blender batching plant (assets/3d/om-group-rmc-plant.glb, the 3D twin of the home-page plant) and the OM GROUP transit mixer (assets/3d/om-group-transit-mixer.glb, mark on both
   cab doors). Loading: the truck sits under the mixer outlet and the concrete stream runs into the hopper. Drum: the same truck with the cutaway window, so the blades and the concrete
   moving inside can be seen. Road: the truck drives along a two-lane road, wheels rolling, drum turning. Site: the truck is backed to a prepared reinforced slab, the chute is over the form
   and concrete flows in; the site engineer stands by. A general view: no delivery time, route or capacity is shown. No labels on the picture. 1 unit = 1 m. */
import { THREE, L, studio, rng, noiseTex } from '/assets/application-s3d.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
import { drumCutaway } from '/assets/application-s3d-mixer.js';
import { spotter } from '/assets/application-s3d-spotter.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
import { ss, loopEnv, crispLogo } from '/assets/application-s3d-flow.js';
const { clamp, mk } = L;
const V3 = THREE.Vector3;

const ld = u => new GLTFLoader().loadAsync(u).then(g => g.scene);
const [PLANT, TRUCK, PJ, MJ] = await Promise.all([ld('/assets/3d/om-group-rmc-plant.glb'), ld('/assets/3d/om-group-transit-mixer.glb'), fetch('/assets/3d/om-group-rmc-plant.json').then(r => r.json()), fetch('/assets/3d/om-group-transit-mixer.json').then(r => r.json())]);
const SHADOW = new THREE.TextureLoader().load('/assets/3d/om-group-rmc-plant-shadow.webp', t => { t.colorSpace = THREE.NoColorSpace; });
function tune(root) {
  root.traverse(o => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const m = o.material; if (!m) return; m.envMapIntensity = .85; const n = m.name || '';
    if (/CabinGlass|CabGlass/.test(n)) { m.transparent = true; m.depthWrite = false; m.envMapIntensity = 1.5; }
    if (/OMGroupLogo/.test(n)) crispLogo(THREE, m);
    if (/Concrete$/.test(n)) { m.envMapIntensity = .5; m.roughness = 1; }
    if (m.map) m.map.anisotropy = 8;
  });
}
tune(PLANT); tune(TRUCK);

const cvTex = (w, h, fn, rep, srgb = true) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(...rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const asphalt = rep => { const r = rng(5); return cvTex(512, 512, (g, w, h) => { g.fillStyle = '#3d3e41'; g.fillRect(0, 0, w, h); for (let i = 0; i < 38000; i++) { const v = 40 + r() * 70 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 3) + ',' + (.3 + r() * .5) + ')'; g.fillRect(r() * w, r() * h, .8 + r() * 2, .8 + r() * 2); } for (let i = 0; i < 220; i++) { const v = 120 + r() * 90 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 6) + ',.5)'; g.beginPath(); g.arc(r() * w, r() * h, .8 + r() * 1.8, 0, 6.3); g.fill(); } for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(15,15,16,.35)'; g.lineWidth = 1; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - .5) * 60; y += (r() - .5) * 60; g.lineTo(x, y); } g.stroke(); } }, rep); };
const earth = rep => { const r = rng(7); return cvTex(512, 512, (g, w, h) => { g.fillStyle = '#7d7156'; g.fillRect(0, 0, w, h); for (let i = 0; i < 30000; i++) { const v = 70 + r() * 90 | 0; g.fillStyle = 'rgba(' + v + ',' + (v * .9 | 0) + ',' + (v * .68 | 0) + ',' + (.3 + r() * .4) + ')'; g.fillRect(r() * w, r() * h, .8 + r() * 2.4, .8 + r() * 2); } for (let i = 0; i < 4000; i++) { g.fillStyle = 'rgba(' + (72 + r() * 40 | 0) + ',' + (95 + r() * 50 | 0) + ',' + (50 + r() * 30 | 0) + ',.35)'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 4); } }, rep); };

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 36, key: 2.3, shadow: 0, map: 4096, y: .03 });
  const out = { scene, fov: 30, wide: true };
  const OX = -24, world = new THREE.Group(); world.position.x = OX; scene.add(world);
  /* ---- the plant ---- */
  const plant = PLANT.clone(true); world.add(plant);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(50, 21), new THREE.MeshBasicMaterial({ map: SHADOW, color: 0x120f0c, transparent: true, opacity: .8, depthWrite: false, toneMapped: false })); shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.set(18, .012, .5); shadowPlane.renderOrder = 1; plant.add(shadowPlane);
  const plantGround = []; plant.traverse(o => { if (o.name === 'Ground') plantGround.push(o); });
  /* ---- the truck ---- */
  const truck = TRUCK.clone(true); world.add(truck); const N = {}; truck.traverse(o => { if (o.name) N[o.name] = o; });
  const cut = drumCutaway(truck, N), drum = cut.drum;
  const wheels = []; truck.traverse(o => { if (/^Wheel_/.test(o.name)) wheels.push(o); });
  truck.updateMatrixWorld(true); const chuteBox = new THREE.Box3().setFromObject(N.ChuteTrough); const chuteTip = new V3(chuteBox.min.x + .15, chuteBox.min.y + .05, (chuteBox.min.z + chuteBox.max.z) / 2);   /* the lower end of the chute, truck-local */
  const outlet = PJ.mixer.outlet, TRUCK_LOAD_X = outlet[0] + 3.66 - chuteTip.x + chuteTip.x;                       /* the chute-tip x of the loaded truck is below the mixer outlet */
  const loadX = outlet[0] - chuteTip.x - .3 + .0;
  /* ---- road ---- */
  const road = new THREE.Group(); world.add(road);
  { const as = asphalt([14, 1]); const surf = mk(new THREE.BoxGeometry(160, .3, 12), new THREE.MeshStandardMaterial({ map: as, bumpMap: as, bumpScale: .6, roughness: .85, envMapIntensity: .5 }), { cast: false }); surf.position.set(0, -.12, 0); road.add(surf);
    const ground = mk(new THREE.BoxGeometry(170, .2, 70), new THREE.MeshStandardMaterial({ map: earth([24, 10]), roughness: 1 }), { cast: false }); ground.position.set(0, -.27, 0); road.add(ground);
    const white = new THREE.MeshStandardMaterial({ color: 0xe9e8e2, roughness: .6 }), yel = new THREE.MeshStandardMaterial({ color: 0xe7b312, roughness: .6 });
    for (const z of [-5.6, 5.6]) { const l = mk(new THREE.BoxGeometry(160, .02, .18), white, { cast: false }); l.position.set(0, .04, z); road.add(l); }
    for (let i = -20; i < 20; i++) { const d = mk(new THREE.BoxGeometry(2.2, .02, .16), white, { cast: false }); d.position.set(i * 4, .04, 0); road.add(d); }
    for (const z of [-6.6, 6.6]) { const k = mk(new THREE.BoxGeometry(160, .24, .5), new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: .9 }), { cast: false }); k.position.set(0, .0, z); road.add(k); }
    /* roadside: guard posts and trees */
    const post = new THREE.MeshStandardMaterial({ color: 0xcfcdc6, roughness: .6 }); for (let i = -40; i <= 40; i++) { const p = mk(new THREE.BoxGeometry(.1, .8, .1), post); p.position.set(i * 3.6, .4, -9); road.add(p); }
    const rail = mk(new THREE.BoxGeometry(160, .22, .05), new THREE.MeshStandardMaterial({ color: 0xaeb2b6, metalness: .85, roughness: .4 })); rail.position.set(0, .62, -9); road.add(rail);
    const leaf = cvTex(256, 256, (g, w, h) => { const r = rng(3); g.fillStyle = '#4f7a3c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { const v = 60 + r() * 90 | 0; g.fillStyle = 'rgba(' + (v * .55 | 0) + ',' + v + ',' + (v * .35 | 0) + ',.6)'; g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4); } }, [2, 2]);
    const tr = rng(12); for (let i = 0; i < 26; i++) { const x = -75 + i * 6 + (tr() - .5) * 3, z = i % 3 ? -(14 + tr() * 12) : (30 + tr() * 8), g = new THREE.Group(), s = .55 + tr() * .35; const t = mk(new THREE.CylinderGeometry(.22 * s, .34 * s, 3.2 * s, 8), new THREE.MeshStandardMaterial({ color: 0x5c4630, roughness: 1 })); t.position.y = 1.6 * s; g.add(t); for (let k = 0; k < 4; k++) { const b = mk(new THREE.IcosahedronGeometry((1.6 + tr() * .8) * s, 2), new THREE.MeshStandardMaterial({ map: leaf, roughness: .95 })); b.position.set((tr() - .5) * 2 * s, (3.6 + tr() * 1.4) * s, (tr() - .5) * 2 * s); g.add(b); } g.position.set(x, 0, z); road.add(g); } }
  /* ---- the site: a reinforced slab form, a stripped deck at ground level, with columns' starter bars ---- */
  const site = new THREE.Group(); world.add(site);
  const SW = 10, SD = 7.5;                                                       /* the form: x along the truck's line */
  { const g = mk(new THREE.BoxGeometry(80, .2, 50), new THREE.MeshStandardMaterial({ map: earth([16, 10]), roughness: 1 }), { cast: false }); g.position.set(0, -.12, 0); site.add(g);
    const base = mk(new THREE.BoxGeometry(SW + .8, .3, SD + .8), new THREE.MeshStandardMaterial({ color: 0x8c8880, roughness: 1 }), { cast: false }); base.position.set(0, .04, 0); site.add(base);
    const wood = new THREE.MeshStandardMaterial({ map: cvTex(256, 256, (g2, w, h) => { const r = rng(21); g2.fillStyle = '#a77d49'; g2.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g2.strokeStyle = 'rgba(' + (60 + r() * 40 | 0) + ',' + (38 + r() * 30 | 0) + ',20,' + (.1 + r() * .2) + ')'; g2.lineWidth = .5 + r() * 1.5; g2.beginPath(); g2.moveTo(0, r() * h); g2.lineTo(w, r() * h + (r() - .5) * 8); g2.stroke(); } }, [1, 1]), roughness: .8 });
    [[0, SD / 2, SW + .4, .15], [0, -SD / 2, SW + .4, .15]].forEach(([x, z, w]) => { const f = mk(new THREE.BoxGeometry(w, .75, .12), wood); f.position.set(x, .45, z); site.add(f); });
    [[SW / 2, 0], [-SW / 2, 0]].forEach(([x]) => { const f = mk(new THREE.BoxGeometry(.12, .75, SD + .3), wood); f.position.set(x, .45, 0); site.add(f); });
    for (let i = -5; i <= 5; i++) { const s_ = mk(new THREE.BoxGeometry(.06, .5, .06), wood); s_.position.set(i * (SW / 5), .3, SD / 2 + .2); site.add(s_); const s2 = s_.clone(); s2.position.z = -SD / 2 - .2; site.add(s2); }
    const bar = new THREE.MeshStandardMaterial({ color: 0x6c4a38, roughness: .5, metalness: .72, envMapIntensity: 1.1 });
    for (let i = -4; i <= 4; i++) { const b = mk(new THREE.CylinderGeometry(.045, .045, SD - .5, 8), bar); b.rotation.x = Math.PI / 2; b.position.set(i * (SW - 1) / 8, .42, 0); site.add(b); }
    for (let j = -3; j <= 3; j++) { const b = mk(new THREE.CylinderGeometry(.045, .045, SW - .5, 8), bar); b.rotation.z = Math.PI / 2; b.position.set(0, .48, j * (SD - 1) / 6); site.add(b); }
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { const c = mk(new THREE.BoxGeometry(.14, .22, .14), new THREE.MeshStandardMaterial({ color: 0x8e8c86, roughness: .95 })); c.position.set(i * 1.4, .27, j * 1.5); site.add(c); }
    [[-4.4, -3.1], [4.4, -3.1], [-4.4, 3.1], [4.4, 3.1]].forEach(([x, z]) => { for (const [a, b] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) { const s_ = mk(new THREE.CylinderGeometry(.04, .04, 1.6, 8), bar); s_.position.set(x + a, 1.1, z + b); site.add(s_); } });
    /* barrow, planks and cones for site clutter */
    for (let k = 0; k < 4; k++) { const cone = mk(new THREE.ConeGeometry(.2, .55, 16), new THREE.MeshStandardMaterial({ color: 0xff6a2a, roughness: .5 })); cone.position.set(SW / 2 + 1.2, .3, -3 + k * 2); site.add(cone); const ban = mk(new THREE.CylinderGeometry(.21, .21, .08, 16), new THREE.MeshStandardMaterial({ color: 0xf4f2ea, roughness: .5 })); ban.position.set(SW / 2 + 1.2, .3, -3 + k * 2); site.add(ban); }
  }
  /* the wet concrete in the form: a patch that grows as the pour goes on */
  const wetTex = noiseTex(256, 256, '#6e6e72', ['#5a5a5e', '#838388', '#4a4a4e', '#9a9a9f'], 3, 6000, 1.5);
  const patch = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.04, .5, 56), new THREE.MeshPhysicalMaterial({ map: wetTex, bumpMap: wetTex, bumpScale: .5, roughness: .3, clearcoat: .5, clearcoatRoughness: .25, envMapIntensity: 1 })); patch.castShadow = patch.receiveShadow = true; site.add(patch);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.2, .15, 1, 14), new THREE.MeshPhysicalMaterial({ color: 0x8c8e92, roughness: .3, clearcoat: .6, envMapIntensity: 1 })); stream.castShadow = true; world.add(stream);
  /* the site engineer */
  const eng = spotter(); eng.pose({ t: 0, ph: -1 }); world.add(eng.g); eng.g.visible = false;
  /* aggregate and concrete moving at the plant */
  const gy = PJ.gather[0][1] + .05, A = PJ.incline[0], B = PJ.incline[1], bx = PJ.bins, hop = [PJ.hopperX[0] - .4, 13.9];
  const COL = [new THREE.Color(.055, .055, .06), new THREE.Color(.24, .245, .26), new THREE.Color(.62, .47, .28), new THREE.Color(.42, .43, .45)];
  const paths = bx.map(x => [new V3(x, PJ.gate[0] - .15, 0), new V3(x, gy, 0), new V3(A[0], gy, 0), new V3(B[0], B[1], 0), new V3(PJ.head[0] + .3, PJ.head[1] - .2, 0), new V3(hop[0], hop[1], 0)]);
  const lens = paths.map(p => { const l = []; let t = 0; for (let i = 1; i < p.length; i++) { const d = p[i].distanceTo(p[i - 1]); l.push(d); t += d; } return { l, t }; });
  const NI = 260, r0 = rng(9), items = Array.from({ length: NI }, (_, i) => ({ src: i % 4, ph: r0(), s: .09 + r0() * .09, z: (r0() - .5), o: r0() * 6, k: .8 + r0() * .5 }));
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, envMapIntensity: .6 }), NI); im.castShadow = true; im.frustumCulled = false; plant.add(im);
  const at = (si, u) => { const P = paths[si], { l, t } = lens[si]; let d = u * t; for (let i = 0; i < l.length; i++) { if (d <= l[i]) return P[i].clone().lerp(P[i + 1], d / l[i]); d -= l[i]; } return P[P.length - 1].clone(); };
  const o3 = new THREE.Object3D();

  const base = { load: { az: -24, el: 12, dist: 34, t: [outlet[0] + 1.5, 5.2, 1] }, drum: { az: -30, el: 11, dist: 15.5, t: [outlet[0] + 3.4, 3.3, 0] }, road: { az: -20, el: 11, dist: 27, t: [0, 2.4, 0] }, site: { az: -34, el: 17, dist: 27, t: [-1, 1.8, 0] } };
  out.views = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, { ...v, t: [v.t[0] + OX, v.t[1], v.t[2]] }]));
  if (innerWidth < 720) Object.values(out.views).forEach(v => { v.dist *= 1.4; });
  out.limits = { az: [-90, 60], el: [3, 50], dist: [8, 80] };
  out.labels = [];
  let T = 0, ang = 0, roll = 0;
  out.update = (t, dt, st) => {
    const go = !reduceM() && st.play !== false, v = st.view || 'load'; if (go) { T += dt; ang += dt * .8; }
    plant.visible = v === 'load' || v === 'drum'; road.visible = v === 'road'; site.visible = v === 'site';
    cut.setVisible(v === 'drum');
    /* truck placement per view */
    let tx, tz = 0, ty = 0, ry = 0;
    if (v === 'road') { tx = go ? ((T * 5.2) % 90) - 45 : -6; roll = go ? roll + dt * 5.2 : roll; }
    else if (v === 'site') { tx = SW / 2 + 2.9 - chuteTip.x + 3.2 - 0; tx = SW / 2 - chuteTip.x - .2; }
    else tx = loadX;
    truck.position.set(tx, ty, tz); truck.rotation.y = ry;
    wheels.forEach(w => { w.rotation.z = -roll / .55; });
    cut.update(T, ang);
    if (v !== 'drum') { drum.rotation.x = ang; }
    /* stream: from the mixer outlet (load) or the chute tip (site) */
    stream.visible = false;
    if (v === 'load') { const wp = new V3(tx + chuteTip.x, chuteTip.y, 0); stream.visible = true; const top = outlet[1] + .1, bot = wp.y + .35; stream.scale.set(1, top - bot, 1); stream.position.set(outlet[0], (top + bot) / 2, 0); const w = go ? 1 + .1 * Math.sin(T * 7) : 1; stream.scale.x = stream.scale.z = w; }
    if (v === 'site') { const wp = new V3(tx + chuteTip.x, chuteTip.y, 0), top = wp.y, g = go ? Math.min(1, (T % 14) / 8) : 1, h = .32 + .2 * g; stream.visible = true; stream.scale.set(1, Math.max(.2, top - h), 1); stream.position.set(wp.x, h + (top - h) / 2, 0); const w = go ? 1 + .1 * Math.sin(T * 7) : 1; stream.scale.x = stream.scale.z = w;
      patch.scale.set(Math.max(.01, g * (SW / 2 - .4)), 1, Math.max(.01, g * (SD / 2 - .4))); patch.scale.y = .2 + .5 * g; patch.position.set(0, .2 + .12 * g, 0); patch.visible = g > .02;
      eng.g.visible = true; eng.g.position.set(SW / 2 + 2.2, 0, 6.2); eng.pose({ t: T, ph: -1, grapple: new V3(tx + chuteTip.x, 1.6, 0) }); } else eng.g.visible = false;
    /* aggregate stones at the plant */
    if (v === 'load') { items.forEach((it, i) => { const u = go ? (T * .028 + it.ph) % 1 : it.ph, p = at(it.src, u); p.z += it.z * (.15 + .85 * ss(.12, .2, u) * (1 - ss(.74, .82, u))); const e = Math.max(.001, loopEnv(u, .02, .03)); o3.position.copy(p).add(new V3(0, it.s * .6, 0)); o3.scale.set(it.s * it.k * e, it.s * .7 * e, it.s * e); o3.rotation.set(it.o + u * 9, it.o, 0); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); im.setColorAt(i, COL[it.src]); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    return go || v !== out._v ? (out._v = v, true) : false;
  };
  return out;
}
