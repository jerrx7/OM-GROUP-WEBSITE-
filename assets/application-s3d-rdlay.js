/* scene: laying a WMM layer and placing a GSB layer, along one road strip. Three sets, one module.
   lay  : (WMM) transport, spreading, rolling and checking. The OM GROUP tipper (Blender) feeds a tracked paver (Blender); the mat behind it is loose and thick; a vibratory roller (Blender) follows and the layer
          becomes thinner and denser; the last stage shows the straight-edge and level checks. The layer blocks wear painted, seamless cut-face textures.
   seg  : a uniform layer beside a segregated one (coarse particles separated, a fines pocket), before and after rolling.
   work : (GSB) dump (the tipper deposits heaps on the prepared subgrade), spread (a motor grader), water (a water tanker), roll and check.
   General drawings of generic machines. No layer thickness, rolling pattern, pass count, density, moisture or test value is shown or implied. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { aggBlock, aggMat, resizeBlock, cvs, tex, reduceM } from '/assets/application-s3d-rdkit.js';
import { rollerMachine, paverMachine } from '/assets/application-s3d-rdmach.js';
import { tipperTruck } from '/assets/application-s3d-tipper.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const yellowP = () => new THREE.MeshPhysicalMaterial({ color: 0xe5a000, roughness: .4, clearcoat: .4, clearcoatRoughness: .25, envMapIntensity: .9 });
const darkM = () => new THREE.MeshStandardMaterial({ color: 0x1d1e21, metalness: .5, roughness: .5 }), rubberM = () => new THREE.MeshStandardMaterial({ color: 0x141416, roughness: .85 }), steelM = () => new THREE.MeshStandardMaterial({ color: 0xc4c8ce, metalness: .95, roughness: .28, envMapIntensity: 1.2 });
const part = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m; };
const wheelAt = (g, x, y, z, r, w) => { const t = part(new THREE.CylinderGeometry(r, r, w, 28), rubberM()); t.rotation.x = Math.PI / 2; t.position.set(x, y, z); g.add(t); const h = part(new THREE.CylinderGeometry(r * .5, r * .5, w + .06, 20), steelM()); h.rotation.x = Math.PI / 2; h.position.set(x, y, z); g.add(h); return t; };

function grader() {
  const g = new THREE.Group(), y = yellowP();
  const frame = part(new THREE.BoxGeometry(12, .7, 1.4), y); frame.position.set(1, 3.1, 0); g.add(frame);
  const rear = part(new THREE.BoxGeometry(4.2, 2.4, 3.6), y); rear.position.set(-4.4, 3.2, 0); g.add(rear); const hood = part(new THREE.BoxGeometry(3.4, .5, 3.2), y); hood.position.set(-4.6, 4.6, 0); g.add(hood);
  const cab = part(new THREE.BoxGeometry(2.6, 2.6, 2.8), y); cab.position.set(-1.4, 5.0, 0); g.add(cab); const win = part(new THREE.BoxGeometry(2.64, 1.6, 2.84), new THREE.MeshPhysicalMaterial({ color: 0x20303a, roughness: .05, metalness: .3, clearcoat: 1 })); win.position.set(-1.4, 5.25, 0); g.add(win);
  const roof = part(new THREE.BoxGeometry(3, .2, 3.2), y); roof.position.set(-1.4, 6.4, 0); g.add(roof);
  [[-5.6, -2.4], [-5.6, 2.4], [-3.4, -2.4], [-3.4, 2.4], [5.2, -1.9], [5.2, 2.0]].forEach(([x, z]) => wheelAt(g, x, 1.35, z, 1.35, 1.1));
  const front = part(new THREE.BoxGeometry(1.2, 2.4, 1.6), y); front.position.set(6.2, 2.7, 0); g.add(front);
  const circle = part(new THREE.CylinderGeometry(2.1, 2.1, .3, 36), darkM()); circle.position.set(2.8, 1.9, 0); g.add(circle);
  const blade = new THREE.Group(); blade.position.set(2.8, 1.4, 0); blade.rotation.y = .42; g.add(blade); const bl = part(new THREE.BoxGeometry(.4, 1.7, 8), steelM()); bl.position.y = .4; blade.add(bl);
  const ex = part(new THREE.CylinderGeometry(.14, .14, 1.4, 12), steelM()); ex.position.set(-5.2, 5.4, 1.2); g.add(ex);
  return { g, blade };
}
function tanker() {
  const g = new THREE.Group(), ch = part(new THREE.BoxGeometry(14, .8, 3.4), darkM()); ch.position.set(0, 1.8, 0); g.add(ch);
  [[-5, -2.2], [-5, 2.2], [-2.8, -2.2], [-2.8, 2.2], [5.2, -2.2], [5.2, 2.2]].forEach(([x, z]) => wheelAt(g, x, 1.15, z, 1.15, 1.0));
  const cab = part(new THREE.BoxGeometry(3.4, 3.4, 3.6), new THREE.MeshPhysicalMaterial({ color: 0xf1efe9, roughness: .4, clearcoat: .4 })); cab.position.set(6.2, 4.0, 0); g.add(cab); const win = part(new THREE.BoxGeometry(.1, 1.5, 3.2), new THREE.MeshPhysicalMaterial({ color: 0x20303a, roughness: .05, clearcoat: 1 })); win.position.set(7.95, 4.6, 0); g.add(win);
  const tank = part(new THREE.CylinderGeometry(1.9, 1.9, 9, 48), new THREE.MeshPhysicalMaterial({ color: 0xdfe6ea, metalness: .85, roughness: .3, clearcoat: .3, envMapIntensity: 1.2 })); tank.rotation.z = Math.PI / 2; tank.position.set(-1.4, 4.2, 0); g.add(tank);
  [-1, 1].forEach(s => { const cap = part(new THREE.SphereGeometry(1.9, 32, 16, 0, TAU, 0, Math.PI / 2), tank.material); cap.rotation.z = -s * Math.PI / 2; cap.position.set(-1.4 + s * 4.5, 4.2, 0); g.add(cap); });
  const hatch = part(new THREE.CylinderGeometry(.5, .5, .3, 20), steelM()); hatch.position.set(-1.4, 6.15, 0); g.add(hatch);
  const bar = part(new THREE.CylinderGeometry(.12, .12, 6.4, 10), steelM()); bar.rotation.x = Math.PI / 2; bar.position.set(-6.2, 1.5, 0); g.add(bar);
  return { g };
}
function inspector() {
  const g = new THREE.Group(), body = part(new THREE.CylinderGeometry(.4, .5, 1.5, 14), new THREE.MeshStandardMaterial({ color: 0xff7a2b, roughness: .7 })); body.position.y = .75; g.add(body);
  const head = part(new THREE.SphereGeometry(.38, 16, 12), new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: .8 })); head.position.y = 1.8; g.add(head); const hat = part(new THREE.SphereGeometry(.42, 16, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: .5 })); hat.position.y = 1.9; g.add(hat);
  const se = part(new THREE.BoxGeometry(.16, .16, 9), steelM()); se.position.set(1.2, 1.1, 0); g.add(se); const staff = part(new THREE.BoxGeometry(.2, 3.2, .2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 })); staff.position.set(1.2, 1.6, -3.6); g.add(staff);
  [0, 1, 2, 3].forEach(i => { const s = part(new THREE.BoxGeometry(.22, .3, .22), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .5 })); s.position.set(1.2, 1 + i * .75, -3.6); g.add(s); });
  return g;
}

export default function build({ state }) {
  const set = state.set || 'lay', narrow = matchMedia('(max-width:640px)').matches, gsb = set === 'work';
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 86, key: 2.5, shadow: .22, map: 4096, ground: false });
  key.shadow.bias = -.0002; key.shadow.normalBias = .05; key.shadow.camera.near = 40; key.shadow.camera.far = 380; key.shadow.camera.updateProjectionMatrix();
  const bc = cvs(512, 512), bg = bc.getContext('2d'), rr0 = rng(5); bg.fillStyle = '#d4d1ca'; bg.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr0() * 50 | 0; bg.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; bg.fillRect(rr0() * 512, rr0() * 512, 1.2 + rr0() * 1.4, 1.2 + rr0() * 1.4); }
  const bt = tex(bc); bt.repeat.set(40, 24); const bench = new THREE.Mesh(new THREE.BoxGeometry(340, 2, 200), new THREE.MeshStandardMaterial({ map: bt, roughness: .55, metalness: 0, envMapIntensity: .75 })); bench.position.set(0, -4.05, 0); bench.receiveShadow = true; scene.add(bench);
  const out = { scene, fov: 30, wide: true };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const RS = realStones('quarry'), stoneM = realStoneMaterial({ tint: gsb ? .62 : .4, bump: .03, floor: 0, gain: .85, contrast: .72, scale: .6, soft: 1, grain: .3, own: true });
  let T = 0; out.seek = v => { T = v; };

  if (set === 'seg') {
    const W = 22, Hh = 9, Dd = 10;
    const uni = aggBlock('wmm', W, Hh, Dd, 21, { u: .3 }); uni.position.set(-14, Hh / 2, 0);
    /* the segregated layer: a coarse-only part, a pocket of fines and a normal part, side by side (each wears its own baked tile) */
    const sgb = new THREE.Group(); sgb.position.set(14, Hh / 2, 0); const sgTop = [], sgGeo = [], topY = Hh / 2; let xo = -W / 2;
    [['wmmc', .34], ['fines', .3], ['wmm', .36]].forEach(([k, f], pi) => { const w = W * f, m = aggBlock(k, w, Hh, Dd, 1, { u: pi * .31 }); m.position.set(xo + w / 2, 0, 0); xo += w; sgb.add(m); const pos = m.geometry.attributes.position; sgGeo.push(m.geometry); for (let i = 0; i < pos.count; i++) if (pos.getY(i) > Hh / 2 - .5) sgTop.push([pos, i, m.position.x + pos.getX(i)]); });
    scene.add(uni, sgb);
    const base = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 14), new THREE.MeshStandardMaterial({ color: 0xcfcac1, roughness: 1 })); base.position.set(0, -1, 0); base.receiveShadow = true; scene.add(base);
    const prof = x => { const u = (x + W / 2) / W; return u < .34 ? .5 + Math.sin(u * 40) * .18 : u < .64 ? -.9 : -.1 + Math.sin(u * 12) * .1; };
    const R = rollerMachine(1.5); scene.add(R.g);
    out.views = { both: { az: -10, el: 14, dist: narrow ? 110 : 78, t: [0, 4.5, 0] }, uniform: { az: -8, el: 12, dist: 44, t: [-14, 4.5, 0] }, seg: { az: -8, el: 12, dist: 44, t: [14, 4.5, 0] } };
    out.limits = { az: [-50, 50], el: [3, 45], dist: [24, 120] };
    const both = st => st.view === 'both' || !st.view, vis = (s, st) => both(st) || st.view === s;
    out.labels = [lab('u', 'Uniform grading', new V3(-14, Hh + 1, Dd / 2), st => vis('uniform', st), 'hot'), lab('s', 'Segregated mix', new V3(14, Hh + 1, Dd / 2), st => vis('seg', st), 'warn'), lab('c', 'Coarse particles separated: voids', new V3(7, Hh / 2 + 1, Dd / 2), st => vis('seg', st), 'warn', 'l'), lab('f', 'Fines pocket', new V3(14, Hh / 2 + 1, Dd / 2), st => vis('seg', st), '', 'r')];
    const cur = { r: -1 };
    out.update = (t, dt, st) => {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 3); let moving = false; const goal = st.roll || 0; if (cur.r < 0) cur.r = goal; cur.r += (goal - cur.r) * k; if (Math.abs(goal - cur.r) > .003) moving = true; else cur.r = goal;
      sgTop.forEach(([pos, i, x]) => { pos.setY(i, topY + prof(x) * cur.r - cur.r * .5); }); sgGeo.forEach(g => { g.attributes.position.needsUpdate = true; g.computeVertexNormals(); });
      uni.scale.y = 1 - cur.r * .08; uni.position.y = Hh * uni.scale.y / 2;
      if (cur.r > .02 && !reduceM()) { T += dt; R.g.visible = true; const x = -22 + ((T * .5) % 1) * 44; R.g.position.set(x, Hh * .93, 0); R.g.rotation.y = 0; R.drum.rotation.z -= dt * 2.4; moving = true; } else R.g.visible = false;
      return moving;
    };
    return out;
  }

  /* lay / work: one road strip */
  const LEN = 150, D = gsb ? 12 : 11, T0 = gsb ? 2.4 : 1.8;
  const baseKind = gsb ? 'soil' : 'gsb';
  const base = aggBlock(baseKind, LEN, 3, gsb ? D + 12 : D, gsb ? 5 : 3); base.position.y = -1.5; scene.add(base);
  if (!gsb) [-1, 1].forEach(s => { const sh = aggBlock('soil', LEN, 3, 6, 6 + s); sh.position.set(0, -1.5, s * (D / 2 + 3)); scene.add(sh); });
  const loose = aggBlock(gsb ? 'gsbl' : 'loose', 24, T0, D - .4, 11), dense = aggBlock(gsb ? 'gsb' : 'wmm', 24, T0, D - .4, 17); scene.add(loose, dense);
  const setBlock = (b, x0, x1, th) => { const len = Math.max(.001, x1 - x0); if (!b.userData.s || Math.abs(b.userData.s[0] - len) > .01 || Math.abs(b.userData.s[1] - th) > .005) { resizeBlock(b, Math.max(.05, len), th, D - .4, .12); b.userData.s = [len, th]; } b.position.set((x0 + x1) / 2, th / 2, 0); b.visible = len > .1; };
  const tp = tipperTruck(); tp.g.scale.setScalar(1.25); scene.add(tp.g);
  const pv = !gsb ? paverMachine(1.25) : null, gr = gsb ? grader() : null, tk = gsb ? tanker() : null, rl = rollerMachine(1.3), insp = inspector();
  if (pv) scene.add(pv.g); if (gr) { gr.g.scale.setScalar(.85); scene.add(gr.g); } if (tk) { tk.g.scale.setScalar(.75); scene.add(tk.g); } scene.add(rl.g, insp);
  /* heaps on the subgrade (GSB) */
  const heaps = [], stonesPile = (seed) => { const gp = new THREE.Group(), r = rng(seed), per = RS.map(() => []); for (let j = 0; j < 96; j++) { const a = r() * TAU, rr = 2.5 * Math.sqrt(r()); per[(r() * RS.length) | 0].push([Math.cos(a) * rr, .3 + (1 - rr / 2.5) * 1.9 * r() + .25, Math.sin(a) * rr * .9, .26 + r() * .22]); }
    const o = new THREE.Object3D(); per.forEach(arr => { if (!arr.length) return; const gi = per.indexOf(arr), im = new THREE.InstancedMesh(RS[gi], stoneM, arr.length); arr.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); o.scale.setScalar(it[3]); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.castShadow = true; im.frustumCulled = false; gp.add(im); }); gp.visible = false; scene.add(gp); return gp; };
  if (gsb) for (let i = 0; i < 5; i++) heaps.push(stonesPile(20 + i));
  const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xcfe4f2, roughness: .05, transparent: true, opacity: .6, depthWrite: false }), 70); spray.frustumCulled = false; if (gsb) scene.add(spray);
  const vwNames = gsb ? ['dump', 'spread', 'water', 'roll', 'check'] : ['transport', 'spread', 'roll', 'check'];
  out.views = gsb ? { dump: { az: -18, el: 14, dist: narrow ? 96 : 70, t: [14, 3, 0] }, spread: { az: -24, el: 16, dist: narrow ? 70 : 50, t: [6, 2, 0] }, water: { az: -20, el: 15, dist: narrow ? 76 : 54, t: [-8, 2, 0] }, roll: { az: -18, el: 11, dist: narrow ? 58 : 42, t: [-20, 2, 3] }, check: { az: -22, el: 13, dist: narrow ? 50 : 34, t: [-36, 1.5, 0] } }
    : { transport: { az: -18, el: 14, dist: narrow ? 76 : 56, t: [18, 3, 0] }, spread: { az: -26, el: 18, dist: narrow ? 54 : 40, t: [4, 3, 0] }, roll: { az: -18, el: 11, dist: narrow ? 46 : 34, t: [-20, 2, 3] }, check: { az: -22, el: 13, dist: narrow ? 50 : 34, t: [-36, 1.5, 0] } };
  out.limits = { az: [-60, 40], el: [3, 40], dist: [18, 130] };
  const vsh = (vs, st) => vs.includes(st.view || 'spread');
  out.labels = gsb ? [
    lab('t', 'Tipper unloads in heaps', () => new V3(tp.g.position.x, 8, 0), st => vsh(['dump'], st), 'warn'), lab('h', 'Heaps on the prepared subgrade', () => new V3(heaps[1].position.x, 5, 0), st => vsh(['dump'], st), '', 'l'),
    lab('g', 'Motor grader spreads an even loose layer', () => new V3(gr.g.position.x, 9, 0), st => vsh(['spread'], st), 'hot'), lab('m', 'Loose layer', () => new V3(gr.g.position.x - 12, 3.3, 5.8), st => vsh(['spread'], st), '', 'l'),
    lab('w', 'Water tanker: controlled water', () => new V3(tk.g.position.x, 8, 0), st => vsh(['water'], st), 'hot'), lab('o', 'Quantity comes from the specified testing, not from this picture', () => new V3(tk.g.position.x - 10, 2.6, 5.8), st => vsh(['water'], st), 'warn', 'l'),
    lab('r', 'Vibratory roller: approved method and trial', () => new V3(rl.g.position.x, 9, 0), st => vsh(['roll'], st), 'hot'), lab('d', 'Thinner, denser layer', () => new V3(rl.g.position.x - 12, 2.4, 5.8), st => vsh(['roll'], st), '', 'l'),
    lab('s', 'Levels and straight-edge', () => new V3(insp.position.x, 4, 0), st => vsh(['check'], st), 'hot'), lab('i', 'Field density, moisture and thickness: separate tests', () => new V3(insp.position.x + 4, 2.4, 3), st => vsh(['check'], st), 'warn')]
  : [
    lab('t', 'Covered tipper with the finished wet mix (general)', () => new V3(tp.g.position.x, 8, 0), st => vsh(['transport', 'spread'], st), 'warn'),
    lab('p', 'Paver: receives, spreads, sets width, thickness and crossfall', () => new V3(pv.g.position.x - 4, 8.5, 0), st => vsh(['spread', 'transport'], st), 'hot', 'l'),
    lab('m', 'Loose mat behind the screed', () => new V3(pv.g.position.x - 14, 2.2, 5.5), st => vsh(['spread', 'roll'], st), '', 'l'),
    lab('r', 'Vibratory roller: approved pattern, passes set by the trial section', () => new V3(rl.g.position.x, 8.2, 0), st => vsh(['roll'], st), 'hot'),
    lab('d', 'Denser, thinner layer after rolling', () => new V3(rl.g.position.x - 12, 1.9, 5.5), st => vsh(['roll'], st), '', 'l'),
    lab('c', 'Cut face: graded particles', () => new V3(-14, 1.2, 5.6), st => vsh(['roll', 'check'], st), '', 'l'),
    lab('s', 'Straight-edge and level checks', () => new V3(insp.position.x, 4, 0), st => vsh(['check'], st), 'hot'),
    lab('i', 'Field density, thickness, crossfall: contractor and Engineer', () => new V3(insp.position.x + 4, 2.4, 3), st => vsh(['check'], st), 'warn')];
  const o = new THREE.Object3D(), r2 = rng(9), sp = Array.from({ length: 70 }, () => ({ z: (r2() - .5) * 7, ph: r2(), s: r2() })); let curV = '';
  out.update = (t, dt, st) => {
    const go = st.play !== false && !reduceM(); if (go) T += dt; const vw = st.view || 'spread', u = (T * .05) % 1, e = go ? sm(u < .5 ? u * 2 : 2 - u * 2) : .5;
    let tkx = 90, pvx = 90, rlx = -50, ix = 90, tilt = 0, gx = 90, wx = 90, showSpray = false;
    if (!gsb) {
      if (vw === 'transport') { tkx = lerp(80, 34, e); pvx = 20; rlx = -34; }
      else if (vw === 'spread') { pvx = lerp(-4, 10, e); tkx = pvx + 17; tilt = .08 + .55 * sm(clamp((e - .15) * 2)); rlx = -34; }
      else if (vw === 'roll') { pvx = 4; tkx = 60; rlx = lerp(-26, -2, e); }
      else { pvx = 4; tkx = 60; rlx = -2; ix = -40 + (go ? Math.sin(T * .6) * 3 : 0); }
      tp.g.position.set(tkx, 0, 0); tp.tilt(tilt); tp.fill(Math.max(.05, 1 - tilt * 1.1)); pv.g.position.set(pvx, 0, 0); if (pv.auger) pv.auger.rotation.z -= dt * 2.2;
      rl.g.position.set(rlx, vw === 'roll' || vw === 'check' ? T0 * .8 : 0, 0); rl.drum.rotation.z -= go ? dt * 2.4 : 0; rl.wheels.forEach(w => { w.rotation.z -= go ? dt * 2 : 0; });
      insp.position.set(ix, 0, 5.4); insp.visible = vw === 'check'; rl.g.visible = vw === 'roll' || vw === 'check'; pv.g.visible = vw !== 'check'; tp.g.visible = vw !== 'check';
      const matStart = -70, screedX = pvx - 7, rollFront = vw === 'check' ? 12 : rlx - 1;
      setBlock(loose, rollFront, vw === 'check' ? rollFront : screedX, T0); setBlock(dense, matStart, vw === 'check' ? 14 : rollFront, T0 * .8);
      if (vw === 'transport') { setBlock(loose, 8, pvx - 7, T0); setBlock(dense, matStart, -20, T0 * .8); }
    } else {
      heaps.forEach(h => { h.visible = false; });
      if (vw === 'dump') { tkx = lerp(30, -4, e); tilt = .1 + .5 * sm(clamp((e - .25) * 2)); heaps.forEach((h, i) => { h.position.set(26 - i * 9, 0, 0); h.visible = h.position.x > tkx - 2 || i < 2; }); setBlock(loose, 30, 30, T0); setBlock(dense, 30, 30, T0); }
      else if (vw === 'spread') { gx = lerp(-4, 16, e); setBlock(loose, -70, gx - 6, T0); setBlock(dense, 30, 30, T0); heaps.forEach((h, i) => { h.position.set(26 - i * 7, 0, 0); h.visible = h.position.x > gx + 3; }); }
      else if (vw === 'water') { wx = lerp(10, -22, e); showSpray = true; setBlock(loose, -70, 30, T0); setBlock(dense, 30, 30, T0); }
      else if (vw === 'roll') { rlx = lerp(-34, -4, e); setBlock(loose, rlx - 1, 30, T0); setBlock(dense, -70, rlx - 1, T0 * .82); }
      else { setBlock(loose, 30, 30, T0); setBlock(dense, -70, 30, T0 * .82); ix = -40 + (go ? Math.sin(T * .6) * 3 : 0); rlx = -4; }
      tp.g.position.set(tkx, 0, 0); tp.tilt(tilt); tp.fill(Math.max(.05, 1 - tilt * 1.5)); gr.g.position.set(gx, 0, 0); tk.g.position.set(wx, 0, 0);
      rl.g.position.set(rlx, vw === 'roll' || vw === 'check' ? T0 * .82 : 0, 0); rl.drum.rotation.z -= go ? dt * 2.4 : 0; rl.wheels.forEach(w => { w.rotation.z -= go ? dt * 2 : 0; });
      insp.position.set(ix, 0, 5.4); insp.visible = vw === 'check'; rl.g.visible = vw === 'roll' || vw === 'check'; tp.g.visible = vw === 'dump'; gr.g.visible = vw === 'spread'; tk.g.visible = vw === 'water';
      sp.forEach((s, i) => { const k = (T * .8 + s.ph) % 1; o.position.set(wx - 6.4 * .75 - k * 1.2 + (s.s - .5) * .5, 1.2 + Math.sin(k * Math.PI) * 1.2 - k * .8, s.z); o.scale.setScalar(showSpray ? 1 : .001); o.updateMatrix(); spray.setMatrixAt(i, o.matrix); }); spray.instanceMatrix.needsUpdate = true;
    }
    const ch = curV !== vw; curV = vw; return go || ch;
  };
  return out;
}
