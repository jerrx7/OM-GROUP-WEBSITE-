/* scene: washing sand. Three sets, one module.
   line    : a GENERAL washing-and-screening line: feed hopper, a transparent washing trough with a water spray, the water carrying part of the loose fines to a settling tank, a two-deck screen and a stockpile.
   compare : two dishes, the incoming material and the same material after washing, with a slider for how much of the removable fines have gone. Some fines always remain.
   source  : four dishes for four source categories, each of which can be washed, screened or both. The source never changes: the treatment only changes the fines.
   Pictures: not OM GROUP's plant or equipment, not a measured result. Particle sizes, fines counts and flows are not to scale and show no percentage or test value. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { grainGeos, grainMat, inst, moundBase, moundItems, dish, reduce, V3, TAU } from '/assets/application-s3d-sand.js';
const { mk, canvasTex, clamp, sm } = L;

const finesMat = () => new THREE.MeshStandardMaterial({ color: 0xa38660, roughness: 1 });
const steel = () => new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .55, roughness: .5 });
const glass = (c = 0xd8ebf4, o = .2) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .08, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });
const hotE = new THREE.Color(0xff5e29), off = new THREE.Color(0);

export default function build({ state }) {
  const set = state.set || 'line';
  const scene = new THREE.Scene(); studio(scene, { ext: set === 'line' ? 40 : 24, key: 2.2, shadow: .2, map: 2048 });
  const out = { scene, fov: 30, wide: true };
  const gmat = grainMat();

  /* a dish with a mound of sand and a layer of fine particles on and in it */
  const heap = (parent, R, H, nSand, nFine, seed, kind, pal, base) => {
    const r = rng(seed); const g = new THREE.Group(); parent.add(g);
    g.add(dish(R + .55, .5)); const t = new THREE.Group(); t.position.y = .4; g.add(t); t.add(moundBase(R, H, base));
    inst(t, moundItems(nSand, R * .96, H, () => .09 + r() * .13, r), grainGeos(kind, pal), gmat, seed, false);
    const fm = finesMat(), fine = inst(t, moundItems(nFine, R * .98, H, () => .028 + r() * .04, r), grainGeos('fine', 'dust'), fm, seed + 3, false);
    const haze = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc9b894, transparent: true, opacity: .18, depthWrite: false })); haze.scale.y = .85; t.add(haze);
    return { g, fine, fm, haze, n: fine.map(m => m.count) };
  };
  const setFines = (h, k) => { h.fine.forEach((m, i) => { m.count = Math.max(0, Math.round(h.n[i] * k)); }); h.haze.material.opacity = .18 * k; };

  if (set === 'compare') {
    const L1 = heap(scene, 5, 3, 1500, 2600, 11, 'ang', 'm', 0x7b756c); L1.g.position.x = -8.4;
    const R1 = heap(scene, 5, 3, 1500, 2600, 11, 'ang', 'm', 0x7b756c); R1.g.position.x = 8.4;
    out.views = { all: { az: -8, el: 24, dist: 34, t: [0, 1.8, 0] } };
    out.labels = [
      { id: 'a', text: 'Incoming: sand with loose fines', side: 'l', anchor: new V3(-8.4, 7.4, 0), show: () => true },
      { id: 'b', text: 'After washing: fewer fines, some remain', side: 'r', tone: 'hot', anchor: new V3(8.4, 5.2, 0), show: () => true },
    ];
    out.limits = { az: [-60, 60], el: [8, 60], dist: [10, 60] };
    out.update = (t, dt, st) => {
      const w = clamp(st.wash ?? .7, 0, 1); setFines(L1, 1); setFines(R1, 1 - w * .82);
      [L1, R1].forEach(h => { h.fm.color.copy(st.hl ? hotE : new THREE.Color(0xa38660)); h.fm.emissive.copy(st.hl ? hotE : off); h.fm.emissiveIntensity = st.hl ? .6 : 0; });
      return false;
    };
  } else if (set === 'source') {
    const S = [
      { k: 'natural', name: 'Natural sand', kind: 'rnd', pal: 'river', base: 0x8c7a5f, seed: 21 },
      { k: 'stone', name: 'Crushed stone sand', kind: 'ang', pal: 'm', base: 0x6e6a66, seed: 22 },
      { k: 'gravel', name: 'Crushed gravel sand', kind: 'sub', pal: 'washed', base: 0x8a806c, seed: 23 },
      { k: 'other', name: 'Other permitted source', kind: 'ang', pal: 'p', base: 0x7d786f, seed: 24 },
    ];
    const STEP = 11, X0 = -STEP * 1.5, items = S.map((s, i) => { const h = heap(scene, 4, 2.4, 1100, 2000, s.seed, s.kind, s.pal, s.base); h.g.position.x = X0 + i * STEP; const ring = new THREE.Mesh(new THREE.TorusGeometry(4.7, .09, 8, 56), new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 })); ring.rotation.x = Math.PI / 2; ring.position.y = 1.15; h.g.add(ring); return { ...h, s, ring }; });
    const TREAT = { washed: 'washed', screened: 'screened', both: 'washed and screened' };
    out.views = { all: { az: -8, el: 24, dist: 52, t: [0, 1.6, 0] } };
    out.labels = items.map((o, i) => ({ id: o.s.k, text: o.s.name, side: 'r', tone: 'hot', anchor: new V3(X0 + i * STEP, 4.6 + (i % 2) * 1.9, 0), show: () => true }));
    out.limits = { az: [-60, 60], el: [8, 60], dist: [14, 80] };
    let last = '';
    out.update = (t, dt, st, fig) => {
      const sel = st.src || 'natural', tr = st.treat || 'washed', key = sel + '|' + tr;
      items.forEach(o => { const on = o.s.k === sel; o.ring.visible = on; setFines(o, on && (tr === 'washed' || tr === 'both') ? .22 : 1); });
      if (key !== last && fig && fig.labs) { last = key; fig.labs.forEach((l, i) => { const b = l.el.querySelector('b'); if (b) b.textContent = items[i].s.name + (items[i].s.k === sel ? ' · ' + TREAT[tr] : ''); l.w = 0; }); }
      return false;
    };
  } else {
    /* the washing-and-screening line */
    const st0 = steel(), sandM = grainMat();
    /* feed hopper and belt */
    const hop = new THREE.Group(); hop.position.set(-27, 0, 0); scene.add(hop);
    const cone = mk(new THREE.CylinderGeometry(4.2, 1.7, 4, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .5, roughness: .55, side: THREE.DoubleSide })); cone.rotation.y = Math.PI / 4; cone.position.y = 6.5; hop.add(cone);
    [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([x, z]) => { const lg = mk(new THREE.BoxGeometry(.4, 5, .4), st0); lg.position.set(x, 2.5, z); hop.add(lg); });
    const hm = new THREE.Group(); hm.position.y = 7.6; hop.add(hm); hm.add(moundBase(3.4, 1.6, 0x7b756c)); const rh = rng(31); inst(hm, moundItems(420, 3.3, 1.6, () => .09 + rh() * .1, rh), grainGeos('ang', 'm'), sandM, 31, false);
    const belt = mk(new THREE.BoxGeometry(11, .35, 1.8), new THREE.MeshStandardMaterial({ color: 0x3a3b3f, roughness: .9 })); belt.position.set(-20, 4.2, 0); belt.rotation.z = .3; scene.add(belt);
    /* the washing trough: glass walls, water and a spray bar */
    const tr = new THREE.Group(); tr.position.set(-9, 0, 0); scene.add(tr);
    const trough = mk(new THREE.BoxGeometry(14, 2.6, 3.4), glass(), { cast: false }); trough.position.y = 1.6; tr.add(trough);
    const water = mk(new THREE.BoxGeometry(13.6, 1.5, 3.0), new THREE.MeshPhysicalMaterial({ color: 0x6fb7dc, roughness: .1, transparent: true, opacity: .5, depthWrite: false }), { cast: false }); water.position.y = 1.1; tr.add(water);
    [-7, 7].forEach(x => { const f = mk(new THREE.BoxGeometry(.3, 3.2, 3.8), st0); f.position.set(x, 1.6, 0); tr.add(f); });
    const spray = mk(new THREE.CylinderGeometry(.12, .12, 10, 10), st0); spray.rotation.z = Math.PI / 2; spray.position.set(0, 5.4, 0); tr.add(spray);
    /* settling tank behind, with cloudy water, and a launder joining the two */
    const tank = new THREE.Group(); tank.position.set(-6, 0, -9.5); scene.add(tank);
    const tg = mk(new THREE.BoxGeometry(10, 3, 6), glass(0xe8e2d4, .22), { cast: false }); tg.position.y = 1.5; tank.add(tg);
    const tw = mk(new THREE.BoxGeometry(9.6, 2.2, 5.6), new THREE.MeshPhysicalMaterial({ color: 0xa88f6c, roughness: .3, transparent: true, opacity: .72, depthWrite: false }), { cast: false }); tw.position.y = 1.1; tank.add(tw);
    const launder = mk(new THREE.BoxGeometry(2, .3, 6.4), st0); launder.position.set(-3.5, 2.4, -4.6); launder.rotation.x = .12; scene.add(launder);
    /* the two-deck screen on a frame */
    const sc = new THREE.Group(); sc.position.set(10, 0, 0); scene.add(sc);
    const meshTex = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#6b6f76'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c3c7cd'; x.lineWidth = 2; for (let i = 0; i <= w; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let j = 0; j <= h; j += 16) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); } }, true);
    const decks = [0, 1].map(i => { const d = mk(new THREE.BoxGeometry(12, .3, 4), new THREE.MeshStandardMaterial({ map: meshTex, roughness: .7, metalness: .3 })); d.position.set(0, 5.6 - i * 1.6, 0); d.rotation.z = -.2; sc.add(d); return d; });
    [[-5, -2.4], [5, -2.4], [-5, 2.4], [5, 2.4]].forEach(([x, z]) => { const lg = mk(new THREE.BoxGeometry(.4, 6.4, .4), st0); lg.position.set(x, 3.2, z); sc.add(lg); });
    /* the stockpile */
    const sp = new THREE.Group(); sp.position.set(27, 0, 0); scene.add(sp); sp.add(moundBase(5.4, 4.2, 0x7b756c)); const rs = rng(41); inst(sp, moundItems(1800, 5.3, 4.2, () => .1 + rs() * .12, rs), grainGeos('ang', 'm'), sandM, 41, false);
    /* moving particles: grains follow a path, fines drift out with the water, drops fall from the spray bar */
    const PATH = [[-27, 8.2, 0], [-22, 6.2, 0], [-17.5, 5.2, 0], [-14, 2.2, 0], [-9, 1.4, 0], [-3, 1.5, 0], [1, 5.9, 0], [6, 5.4, 0], [15, 3.2, 0], [22, 5.6, 0], [26, 4.6, 0]];
    const seg = PATH.slice(1).map((p, i) => Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1])), tot = seg.reduce((a, b) => a + b, 0);
    const at = u => { let d = u * tot, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; } const f = clamp(d / seg[i], 0, 1), a = PATH[i], b = PATH[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
    const geoG = grainGeos('ang', 'm'), geoF = grainGeos('fine', 'dust'), N = 330, M = 230, D = 110, dummy = new THREE.Object3D(), rr = rng(51);
    const gi = [0, 1, 2].map(k => new THREE.InstancedMesh(geoG[k], sandM, Math.ceil(N / 3))); gi.forEach(m => { m.frustumCulled = false; scene.add(m); });
    const fi = new THREE.InstancedMesh(geoF[0], finesMat(), M); fi.frustumCulled = false; scene.add(fi);
    const di = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5aa9d6, roughness: .2, transparent: true, opacity: .8 }), D); di.frustumCulled = false; scene.add(di);
    const gp = Array.from({ length: N }, () => ({ o: rr(), j: [(rr() - .5) * 1.1, rr() * .5, (rr() - .5) * 2.2], s: .12 + rr() * .1, r: [rr() * 6, rr() * 6, rr() * 6] }));
    const fp = Array.from({ length: M }, () => ({ o: rr(), j: [(rr() - .5) * 6, rr(), (rr() - .5) * 2], s: .05 + rr() * .05, r: [rr() * 6, rr() * 6, rr() * 6] }));
    const dp = Array.from({ length: D }, () => ({ o: rr(), x: -15 + rr() * 12, z: (rr() - .5) * 2.6 }));
    const place = (T) => {
      gp.forEach((p, i) => { const u = (T * .045 + p.o) % 1, q = at(u), im = gi[i % 3], idx = (i / 3) | 0; dummy.position.set(q[0] + p.j[0] * (u > .27 && u < .45 ? 1.2 : .3), q[1] + p.j[1] * .4 + (u < .3 || u > .5 ? 0 : 0), q[2] + p.j[2] * ((u > .28 && u < .46) || u > .93 ? .6 : .1)); dummy.rotation.set(p.r[0], p.r[1], p.r[2]); dummy.scale.setScalar(p.s); dummy.updateMatrix(); if (idx < im.count) im.setMatrixAt(idx, dummy.matrix); });
      gi.forEach(m => { m.instanceMatrix.needsUpdate = true; });
      fp.forEach((p, i) => { const u = (T * .09 + p.o) % 1; let x, y, z; if (u < .45) { const f = u / .45; x = -13 + p.j[0] * .8 + f * 7; y = 1.2 + p.j[1] * 1.2 + Math.sin(T * 2 + i) * .25; z = p.j[2] * (1 - f * .5) - f * 1.5; } else { const f = (u - .45) / .55; x = -6 + (p.j[0] * .35) - f * 1.2; y = 2.4 - f * 1.5; z = -2.8 - f * 6.5; } dummy.position.set(x, y, z); dummy.rotation.set(p.r[0], p.r[1], p.r[2]); dummy.scale.setScalar(p.s); dummy.updateMatrix(); fi.setMatrixAt(i, dummy.matrix); });
      fi.instanceMatrix.needsUpdate = true;
      dp.forEach((p, i) => { const f = (T * .9 + p.o) % 1; dummy.position.set(p.x, 5.2 - f * 3.6, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1.6, 1); dummy.updateMatrix(); di.setMatrixAt(i, dummy.matrix); });
      di.instanceMatrix.needsUpdate = true;
    };
    place(2);
    out.views = { all: { az: -10, el: 22, dist: 80, t: [1, 3, -2] }, feed: { az: -16, el: 18, dist: 28, t: [-22, 5, 0] }, wash: { az: -14, el: 22, dist: 30, t: [-9, 2.2, -2] }, sep: { az: -24, el: 30, dist: 28, t: [-7, 1.6, -6] }, screen: { az: -14, el: 18, dist: 30, t: [11, 3.6, 0] }, stock: { az: -14, el: 16, dist: 28, t: [25, 3, 0] } };
    const lab = (id, text, a, vs, tone, side = 'r', inAll = false) => ({ id, text, side, tone, anchor: a, show: st => (st.view || 'all') === 'all' ? inAll : vs.includes(st.view) });
    out.labels = [
      lab('f', 'Incoming sand', new V3(-27, 11, 0), ['feed'], undefined, 'r', true), lab('s', 'Water introduced', new V3(-9, 6.6, 0), ['wash'], 'hot'), lab('w', 'Washing chamber', new V3(-9, 4.6, 1.5), ['wash'], undefined, 'r', true),
      lab('t', 'Removable fines carried away with the water', new V3(-6, 3.8, -9.5), ['sep'], 'hot'), lab('r', 'Retained sand moves on', new V3(1, 6.6, 0), ['wash', 'screen']),
      lab('c', 'Screening: size separation', new V3(10, 11.2, 0), ['screen'], 'hot', 'l', true), lab('p', 'Washed sand stockpile', new V3(27, 7.2, 0), ['stock'], 'hot', 'l', true),
    ];
    out.limits = { az: [-70, 40], el: [6, 60], dist: [12, 110] };
    let T = 2;
    out.update = (t, dt, st) => {
      const go = st.play !== false && !reduce(); if (go) { T += dt; place(T); }
      decks.forEach((d, i) => { d.position.y = 5.6 - i * 1.6 + (go ? Math.sin(T * 22 + i) * .04 : 0); });
      const hl = !!st.hl; fi.material.emissive.copy(hl ? hotE : off); fi.material.emissiveIntensity = hl ? .7 : 0; fi.material.color.copy(hl ? hotE : new THREE.Color(0xa38660));
      return go;
    };
  }
  return out;
}
