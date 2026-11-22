/* scene: ready-mix concrete. Three sets, one module.
   truck : a transit mixer. Views: the whole truck, the drum in cutaway (blades and fresh concrete), loading at a plant bin, the road, and discharge at a prepared slab.
   slump : the slump-cone test in six stages (equipment, filling, compacting, lifting, subsiding, measuring). 
   cubes : seven test cubes labelled M20 to M60. M60 stands apart as the on-request grade. Selecting a cube lifts it and names its characteristic strength.
   Pictures: a generic truck, a generic test, plant or results. No dimension, mix, batch quantity, slump value or test result is shown. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { mk, canvasTex, clamp, sm } = L;

const speck = (base, sp, seed, n = 2600) => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < n; i++) { x.fillStyle = sp[(r() * sp.length) | 0]; x.globalAlpha = .25 + r() * .5; const s = .8 + r() * 2.2; x.fillRect(r() * w, r() * h, s, s); } x.globalAlpha = 1;
}, true);
const concreteMat = (seed = 5, base = '#8f918f') => new THREE.MeshStandardMaterial({ map: speck(base, ['#767876', '#a7a9a6', '#6a6c6a', '#b9bbb8'], seed, 3200), roughness: .95 });
const steel = () => new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .55, roughness: .5 });
const hotM = () => new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .45, emissive: 0xff5e29, emissiveIntensity: .3 });

export default function build({ state }) {
  const set = state.set || 'truck';
  const scene = new THREE.Scene(); studio(scene, { ext: set === 'truck' ? 46 : 20, key: 2.2, shadow: .22, map: 2048 });
  const out = { scene, fov: 30, wide: true };

  if (set === 'truck') {
    const white = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: .5 }), dark = new THREE.MeshStandardMaterial({ color: 0x2c2d31, roughness: .8 });
    const cutPlane = new THREE.Plane(new V3(0, 0, -1), 0);
    const shellM = new THREE.MeshStandardMaterial({ color: 0xeceae3, roughness: .45, metalness: .1, side: THREE.DoubleSide, clippingPlanes: [], transparent: true, opacity: 1 });
    const truck = new THREE.Group(); scene.add(truck);
    /* chassis, wheels, cab */
    const chassis = mk(new THREE.BoxGeometry(15, .9, 3.2), dark); chassis.position.set(.5, 1.8, 0); truck.add(chassis);
    [[-3.2, -1.7], [-3.2, 1.7], [-1.2, -1.7], [-1.2, 1.7], [6.2, -1.7], [6.2, 1.7]].forEach(([x, z]) => { const w = mk(new THREE.CylinderGeometry(1.15, 1.15, .9, 24), dark); w.rotation.x = Math.PI / 2; w.position.set(x, 1.15, z); truck.add(w); const hub = mk(new THREE.CylinderGeometry(.5, .5, .95, 16), steel()); hub.rotation.x = Math.PI / 2; hub.position.set(x, 1.15, z); truck.add(hub); });
    const cab = mk(new THREE.BoxGeometry(3.4, 3.4, 3.1), white); cab.position.set(7.6, 3.9, 0); truck.add(cab); const wind = mk(new THREE.BoxGeometry(.1, 1.5, 2.6), new THREE.MeshStandardMaterial({ color: 0x5a7d93, roughness: .1, metalness: .3 })); wind.position.set(9.33, 4.4, 0); truck.add(wind);
    const frame = mk(new THREE.BoxGeometry(8.5, .6, 2.6), steel()); frame.position.set(-1.5, 2.5, 0); truck.add(frame);
    /* the drum: a double cone on a tilted axis, a shell, spiral blades, fresh concrete */
    const prof = [[1.7, 0], [2.4, 1.2], [3.1, 3], [3.3, 4.5], [3.3, 6], [3.3, 7.5], [3.0, 9], [2.2, 10], [1.4, 10.6], [.8, 11]].map(([r, y]) => new THREE.Vector2(r, y));
    const tilt = new THREE.Group(); tilt.position.set(-6.2, 7.4, 0); tilt.rotation.z = -Math.PI / 2 - .2; truck.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    const shell = mk(new THREE.LatheGeometry(prof, 56), shellM, { cast: true }); spin.add(shell);
    const inner = prof.map(p => new THREE.Vector2(p.x * .84, p.y)); const conc = mk(new THREE.LatheGeometry(inner, 48), concreteMat(9), { cast: false }); conc.scale.set(1, 1, 1); spin.add(conc);
    const helix = k => { const pts = []; for (let i = 0; i <= 70; i++) { const t = i / 70, y = .7 + t * 9.4, r = (3.1 * (y < 4.5 ? .75 + y / 20 : y > 8.5 ? .9 - (y - 8.5) / 3 : 1)) * .92, a = t * Math.PI * 6 + k * Math.PI; pts.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, .13, 6, false); };
    const bladeM = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .5, metalness: .2 }); [0, 1].forEach(k => spin.add(mk(helix(k), bladeM)));
    shellM.clippingPlanes = [];
    /* chute and its discharge stream */
    const chute = mk(new THREE.BoxGeometry(5.6, .5, 1.3), steel()); chute.position.set(-9.3, 5.6, 0); chute.rotation.z = .5; truck.add(chute);
    const streamM = concreteMat(12, '#85878a'); const stream = mk(new THREE.CylinderGeometry(.45, .35, 1, 12), streamM, { cast: false }); stream.visible = false; scene.add(stream);
    /* plant bin and loading chute */
    const plant = new THREE.Group(); plant.position.set(-18, 0, 0); scene.add(plant);
    const bin = mk(new THREE.CylinderGeometry(3.6, 1.2, 4, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .5, roughness: .55, side: THREE.DoubleSide })); bin.rotation.y = Math.PI / 4; bin.position.y = 12.6; plant.add(bin);
    [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].forEach(([x, z]) => { const lg = mk(new THREE.BoxGeometry(.5, 11, .5), steel()); lg.position.set(x, 5.5, z); plant.add(lg); });
    const lchute = mk(new THREE.BoxGeometry(7.5, .5, 1.6), steel()); lchute.position.set(4.2, 9.4, 0); lchute.rotation.z = -.42; plant.add(lchute);
    const lblobs = Array.from({ length: 10 }, (_, i) => { const b = mk(new THREE.SphereGeometry(.45, 10, 8), streamM, { cast: false }); plant.add(b); return b; });
    /* road and site */
    const road = mk(new THREE.BoxGeometry(150, .1, 11), new THREE.MeshStandardMaterial({ color: 0x75777b, roughness: 1 }), { cast: false }); road.position.set(0, .02, 0); road.visible = false; scene.add(road);
    const dashes = Array.from({ length: 22 }, (_, i) => { const d = mk(new THREE.BoxGeometry(3, .02, .25), new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 1 }), { cast: false }); d.position.set(-72 + i * 7, .09, 0); d.visible = false; scene.add(d); return d; });
    const site = new THREE.Group(); site.position.set(-26, -2.4, 0); site.visible = false; scene.add(site);
    const form = mk(new THREE.BoxGeometry(15, .5, 11), new THREE.MeshStandardMaterial({ color: 0xb98a52, roughness: .8 })); form.position.y = 5; site.add(form);
    const rebarM = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: .6, metalness: .4 }); for (let i = 0; i <= 14; i++) { const a = mk(new THREE.CylinderGeometry(.07, .07, 10.4, 6), rebarM, { cast: false }); a.rotation.x = Math.PI / 2; a.position.set(-7 + i, 5.5, 0); site.add(a); const b = mk(new THREE.CylinderGeometry(.07, .07, 14.4, 6), rebarM, { cast: false }); b.rotation.z = Math.PI / 2; b.position.set(0, 5.62, -5 + i * (10 / 14)); site.add(b); }
    const props = [[-6, -4], [6, -4], [-6, 4], [6, 4], [0, 0]].forEach(([x, z]) => { const p = mk(new THREE.CylinderGeometry(.2, .2, 4.6, 8), new THREE.MeshStandardMaterial({ color: 0xe0b01c, roughness: .6 })); p.position.set(x, 2.3, z); site.add(p); });
    const patch = mk(new THREE.CylinderGeometry(3, 3.4, .45, 28), concreteMat(14, '#8a8c8a'), { cast: false }); patch.position.set(4.2, 5.4, 0); patch.scale.set(.01, 1, .01); site.add(patch);
    const person = new THREE.Group(); person.position.set(-3, 5.3, 4); site.add(person);
    const body = mk(new THREE.CylinderGeometry(.4, .5, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0xff7a2b, roughness: .7 })); body.position.y = .75; person.add(body);
    const head = mk(new THREE.SphereGeometry(.38, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: .8 })); head.position.y = 1.8; person.add(head);
    const hat = mk(new THREE.SphereGeometry(.42, 12, 8, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: .5 })); hat.position.y = 1.95; person.add(hat);
    const sheet = mk(new THREE.BoxGeometry(.7, .9, .05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 })); sheet.position.set(.45, 1.2, .35); sheet.rotation.y = .5; person.add(sheet);
    out.views = { all: { az: -24, el: 14, dist: 40, t: [0, 4.5, 0] }, drum: { az: -34, el: 10, dist: 25, t: [-1, 6, 0] }, load: { az: -22, el: 12, dist: 42, t: [-12, 7, 0] }, road: { az: -10, el: 16, dist: 54, t: [0, 4, 0] }, site: { az: -30, el: 20, dist: 46, t: [-17, 3.5, 0] } };
    const lab = (id, text, a, vs, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: st => vs.includes(st.view || 'all') });
    out.labels = [lab('d', 'Rotating drum', new V3(-1, 11, 0), ['all', 'drum'], 'hot'), lab('c', 'Fresh concrete inside', new V3(0, 7.2, 0), ['drum']), lab('b', 'Mixing blades', new V3(-5, 8.8, 0), ['drum'], 'hot', 'l'), lab('t', 'Plant batching bin', new V3(-18, 15.2, 0), ['load']), lab('g', 'Loading chute into the drum', new V3(-14, 9.6, 0), ['load'], 'hot', 'l'), lab('r', 'Transit mixer', new V3(0, 8, 0), ['road']), lab('s', 'Prepared slab: formwork and steel', new V3(-30, 4.2, 0), ['site']), lab('e', 'Site engineer checks the ticket', new V3(-29, 5.6, 4), ['site'], 'hot', 'l'), lab('h', 'Discharge to the placing point', new V3(-21.8, 4.6, 0), ['site'], 'hot')];
    out.limits = { az: [-70, 40], el: [4, 55], dist: [14, 90] };
    let T = 0;
    out.update = (t, dt, st) => {
      const v = st.view || 'all', go = st.play !== false && !reduce(); if (go) T += dt;
      spin.rotation.y += go ? dt * (v === 'drum' ? 1.1 : .7) : 0;
      const cut = v === 'drum'; shellM.clippingPlanes = cut ? [cutPlane] : []; shellM.opacity = cut ? .9 : 1; conc.visible = true;
      plant.visible = v === 'load' || v === 'all'; road.visible = v === 'road'; dashes.forEach(d => { d.visible = v === 'road'; }); site.visible = v === 'site';
      truck.position.x = v === 'road' ? (go ? ((T * 5) % 80) - 40 : 0) : v === 'site' ? -10 : v === 'load' ? 0 : 0; truck.position.z = 0;
      if (v === 'all') plant.position.x = -30;
      else plant.position.x = -18;
      /* loading blobs along the chute, and the discharge stream and patch at the site */
      lblobs.forEach((b, i) => { b.visible = v === 'load'; const f = ((T * .5 + i / lblobs.length) % 1); b.position.set(.2 + f * 6.6, 10.1 - f * 2.9 - 0, 0); });
      const chuteEnd = new V3(truck.position.x - 11.8, 4.2, 0);
      if (v === 'site') { stream.visible = true; const h = Math.max(.3, chuteEnd.y - 3.0); stream.scale.set(1, h, 1); stream.position.set(chuteEnd.x, 3.0 + h / 2, 0); const g = go ? Math.min(1, T / 6) : 1; patch.scale.set(g + .01, 1, g + .01); } else stream.visible = false;
      return go;
    };
  } else if (set === 'slump') {
    const plate = mk(new THREE.BoxGeometry(15, .4, 15), steel()); plate.position.y = -.2; scene.add(plate);
    const profC = [[2.6, 0], [1.25, 7.6]].map(([r, y]) => new THREE.Vector2(r, y));
    const moldM = new THREE.MeshStandardMaterial({ color: 0xb5bac1, metalness: .7, roughness: .35, side: THREE.DoubleSide, transparent: true, opacity: .5, depthWrite: false });
    const mold = mk(new THREE.LatheGeometry(profC, 48, 0, TAU), moldM, { cast: false }); scene.add(mold);
    const rimM = steel(); const foot = mk(new THREE.TorusGeometry(2.7, .1, 8, 40), rimM); foot.rotation.x = Math.PI / 2; foot.position.y = .08; mold.add(foot);
    const conc = mk(new THREE.LatheGeometry(profC.map(p => new THREE.Vector2(p.x * .97, p.y)), 48), concreteMat(21), { cast: false }); conc.scale.set(1, .001, 1); scene.add(conc);
    const rod = mk(new THREE.CylinderGeometry(.16, .16, 11, 10), steel()); rod.position.set(5.5, 5.5, 3); rod.rotation.z = .5; scene.add(rod);
    const ruler = mk(new THREE.BoxGeometry(9, .12, .6), new THREE.MeshStandardMaterial({ color: 0xe9d9a8, roughness: .7 })); ruler.position.set(0, 7.9, 0); ruler.visible = false; scene.add(ruler);
    const ref = mk(new THREE.BoxGeometry(9, .06, .2), hotM()); ref.visible = false; scene.add(ref);
    const dim = mk(new THREE.BoxGeometry(.16, 1, .16), hotM()); dim.visible = false; scene.add(dim);
    const K = { low: .93, med: .72, high: .5 };
    out.views = { all: { az: -22, el: 16, dist: 30, t: [0, 4.2, 0] } };
    out.labels = [
      { id: 'a', text: 'Slump cone on a flat base plate', side: 'l', anchor: new V3(-2.6, 3.4, 0), show: st => (st.stage ?? 0) < 3 },
      { id: 'b', text: 'Tamping rod', side: 'r', anchor: new V3(6.2, 8.6, 3), show: st => (st.stage ?? 0) <= 2 },
      { id: 'c', text: 'Fresh concrete', side: 'r', tone: 'hot', anchor: new V3(2, 3, 0), show: st => (st.stage ?? 0) >= 1 && (st.stage ?? 0) < 4 },
      { id: 'd', text: 'Concrete subsides when the cone is lifted', side: 'r', tone: 'hot', anchor: new V3(3.4, 3.4, 0), show: st => (st.stage ?? 0) === 4 },
      { id: 'e', text: 'Slump: the drop in height. A consistency check, not a strength', side: 'r', tone: 'hot', anchor: new V3(4.6, 6.4, 0), show: st => (st.stage ?? 0) === 5 },
    ];
    out.limits = { az: [-60, 40], el: [6, 50], dist: [12, 50] };
    let lift = 0, fill = 0, sub = 0, rodT = 0;
    out.update = (t, dt, st) => {
      const s = st.stage ?? 0, k = K[st.cons || 'med'];
      const tf = s === 0 ? 0 : s === 1 ? .66 : 1, tl = s >= 3 ? 1 : 0, ts = s >= 4 ? 1 : 0;
      fill += (tf - fill) * Math.min(1, dt * 4); lift += (tl - lift) * Math.min(1, dt * 3); sub += (ts - sub) * Math.min(1, dt * 3);
      const h = Math.max(.001, fill * (1 - sub * (1 - k))), wide = 1 + sub * (1 - k) * .55;
      conc.scale.set(wide, h * 1, wide); conc.visible = fill > .01;
      mold.position.y = lift * 11; mold.visible = lift < .98 || true; moldM.opacity = lift > .5 ? .25 : .5;
      rodT += dt * 5; rod.position.set(s === 2 ? .2 + Math.sin(rodT) * .6 : 5.5, s === 2 ? 5.8 + Math.abs(Math.sin(rodT * 1.4)) * 1.4 : 5.5, s === 2 ? 0 : 3); rod.rotation.z = s === 2 ? 0 : .5;
      const top = 7.6 * h; ruler.visible = ref.visible = dim.visible = s === 5; ref.position.set(2.2, 7.6, 0); ruler.position.set(0, 7.9, 0); dim.scale.y = (7.6 - top); dim.position.set(3.1, top + (7.6 - top) / 2, 0);
      return s === 2 || Math.abs(tf - fill) > .01 || Math.abs(tl - lift) > .01 || Math.abs(ts - sub) > .01;
    };
  } else {
    const G = ['M20', 'M25', 'M30', 'M35', 'M40', 'M45', 'M60'], MPA = [20, 25, 30, 35, 40, 45, 60], STEP = 7.2, X0 = -STEP * 3.2;
    const base = mk(new THREE.BoxGeometry(60, .3, 12), new THREE.MeshStandardMaterial({ color: 0xe8e5de, roughness: .7 }), { cast: false }); base.position.set(0, -.2, 0); scene.add(base);
    const cubes = G.map((g, i) => { const hi = i === 6, c = mk(new THREE.BoxGeometry(5, 5, 5, 1, 1, 1), concreteMat(31 + i, hi ? '#6f7274' : '#9a9c99')); c.position.set(X0 + i * STEP + (hi ? 3.4 : 0), 2.5, 0); c.rotation.y = .12 * (i % 2 ? 1 : -1); scene.add(c); const ring = mk(new THREE.TorusGeometry(3.9, .1, 8, 40), hotM()); ring.rotation.x = Math.PI / 2; ring.position.set(c.position.x, .05, 0); ring.visible = false; scene.add(ring); return { c, ring, y0: 2.5, hi }; });
    const frame = mk(new THREE.BoxGeometry(7.4, .12, 7.4), hotM()); frame.position.set(X0 + 6 * STEP + 3.4, .02, 0); scene.add(frame);
    out.views = { all: { az: -8, el: 20, dist: 62, t: [3, 2.6, 0] } };
    out.labels = cubes.map((o, i) => ({ id: G[i], text: G[i], side: 'r', tone: i === 6 ? 'hot' : undefined, anchor: new V3(o.c.position.x - 2.4, 6 + (i % 2) * 1.8, 0), show: () => true }));
    out.limits = { az: [-60, 50], el: [8, 55], dist: [20, 90] };
    let last = '';
    out.update = (t, dt, st, fig) => {
      const sel = st.g || 'M30';
      cubes.forEach((o, i) => { const on = G[i] === sel; o.c.position.y += ((on ? o.y0 + 1.2 : o.y0) - o.c.position.y) * Math.min(1, dt * 8); o.ring.visible = on; });
      if (sel !== last && fig && fig.labs) { last = sel; fig.labs.forEach((l, i) => { const b = l.el.querySelector('b'); if (b) b.textContent = G[i] + (G[i] === sel ? ' · ' + MPA[i] + ' MPa' : ''); l.w = 0; }); }
      return cubes.some(o => Math.abs(o.c.position.y - (G[cubes.indexOf(o)] === sel ? o.y0 + 1.2 : o.y0)) > .02);
    };
  }
  return out;
}
