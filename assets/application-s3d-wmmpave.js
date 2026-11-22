/* scene: the Wet Mix Macadam layer in the pavement. Three sets, one module.
   layers : a flexible-pavement cross-section (subgrade, GSB, WMM, DBM, BC) that separates; one layer can be selected. The WMM face is painted as graded particles.
   thick  : an example WMM layer under a roller: three layer thicknesses, loose to compacted, and how far the compactive effort reaches. Thicknesses are NOT specification values.
   edge   : lateral confinement. The same roller pass beside a confined edge (shoulder built with the layer) and an unconfined edge.
   Pictures: a common arrangement, not a pavement design. Layer thicknesses are not to scale and are not specification values. */
import { THREE, L, studio } from '/assets/application-s3d.js';
import { layerBlock, faceMat, soilMat, roller, reduceM, yellowM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const set = state.set || 'layers';
  const scene = new THREE.Scene(); studio(scene, { ext: 60, key: 2.2, shadow: .2, map: 2048 });
  const out = { scene, fov: 30, wide: true };
  const hotLine = o => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), new THREE.LineBasicMaterial({ color: 0xff5e29 })); o.add(e); return e; };
  const lab = (id, text, anchor, show, tone, side = 'r') => ({ id, text, side, tone, anchor, show });

  if (set === 'layers') {
    const W = 64, D = 26, DEF = [
      { id: 'sub', text: 'SUBGRADE', h: 6, kind: null }, { id: 'gsb', text: 'GSB · GRANULAR SUB-BASE', h: 5, kind: 'gsb' },
      { id: 'wmm', text: 'WMM · WET MIX MACADAM', h: 4.6, kind: 'wmm' }, { id: 'dbm', text: 'DBM / BITUMINOUS BASE', h: 3.2, kind: 'dbm' }, { id: 'bc', text: 'BC · WEARING COURSE', h: 2.2, kind: 'bc' },
      { id: 'dlc', text: 'DLC · DRY LEAN CONCRETE', h: 3.6, kind: 'conc' }, { id: 'pcc', text: 'CONCRETE PAVEMENT SLAB', h: 3.2, kind: 'conc2' }];
    const SETS = { flex: ['sub', 'gsb', 'wmm', 'dbm', 'bc'], rigid: ['sub', 'gsb', 'dlc', 'pcc'] };
    const g = new THREE.Group(); scene.add(g);
    DEF.forEach((d, i) => {
      d.m = d.kind ? layerBlock(W, d.h, D, d.kind, 10 + i * 7, d.kind === 'gsb' ? 0x7d7a73 : d.kind === 'conc' || d.kind === 'conc2' ? 0x9a9c9a : 0x2a2b2e) : (() => { const s = soilMat(8); s.map.repeat.set(4, 1); const b = new THREE.Mesh(new THREE.BoxGeometry(W, d.h, D), s); b.castShadow = b.receiveShadow = true; return b; })();
      (Array.isArray(d.m.material) ? d.m.material : [d.m.material]).forEach(m => { m.transparent = true; });
      g.add(d.m); d.hl = new THREE.Mesh(new THREE.BoxGeometry(W + .6, d.h + .5, D + .6), new THREE.MeshBasicMaterial({ color: 0xff5e29, transparent: true, opacity: .07, depthWrite: false })); d.hl.visible = false; d.m.add(d.hl); d.edge = hotLine(d.hl); d.edge.visible = false;
    });
    out.views = { reveal: { az: -24, el: 20, dist: 112, t: [0, 9, 0] }, all: { az: -22, el: 16, dist: 108, t: [0, 10, 0] }, zoom: { az: -8, el: 6, dist: 44, t: [-6, 14, 12] } };
    out.labels = DEF.map((d, i) => lab(d.id, d.text, () => new V3(-W / 2 - 1, d.m.position.y + 0, D / 2), st => (st.view || 'reveal') !== 'zoom' && SETS[st.pav || 'flex'].includes(d.id), (d.id === 'wmm' || d.id === 'gsb') ? 'hot' : '', 'l'))
      .concat([lab('p', 'Graded particles, cut face', new V3(-6, 14.5, D / 2 + .2), st => st.view === 'zoom', 'hot', 'r')]);
    const cur = { ex: 0 }, dim = {}; DEF.forEach(d => dim[d.id] = 1); out.seek = () => { cur.ex = 1e9; };
    out.update = (t, dt, st) => {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 4); let moving = false, y = 0; const goal = st.view === 'zoom' ? .35 : (st.explode == null ? 1 : st.explode);
      const act = SETS[st.pav || 'flex'], hotId = st.hotid || 'wmm';
      if (cur.ex > 1e8) { cur.ex = goal; DEF.forEach(d => { dim[d.id] = (st.layer && st.layer !== 'all' && st.layer !== d.id) ? .3 : 1; }); }
      cur.ex += (goal - cur.ex) * k; if (Math.abs(goal - cur.ex) > .002) moving = true; else cur.ex = goal;
      DEF.forEach(d => { d.m.visible = act.includes(d.id); });
      act.forEach((id, i) => {
        const d = DEF.find(x => x.id === id);
        d.m.position.y = y + d.h / 2 + cur.ex * i * 5.6; y += d.h;
        const sel = st.layer && st.layer !== 'all', on = !sel || st.layer === d.id, goalO = on ? 1 : .3; dim[d.id] += (goalO - dim[d.id]) * k; if (Math.abs(goalO - dim[d.id]) > .01) moving = true;
        (Array.isArray(d.m.material) ? d.m.material : [d.m.material]).forEach(m => { m.opacity = dim[d.id]; }); d.hl.visible = d.edge.visible = !!sel && st.layer === d.id || (!sel && d.id === hotId && (st.view || 'reveal') !== 'zoom' && st.hot !== false);
      });
      return moving;
    };
    return out;
  }

  if (set === 'thick') {
    const W = 60, D = 16, TH = { a: 3, b: 5.5, c: 9 };
    const base = mk(new THREE.BoxGeometry(W, 4, D), new THREE.MeshStandardMaterial({ color: 0x8a867d, roughness: 1 })); base.position.y = -2; scene.add(base);
    const bf = layerBlock(W, 4, D, 'gsb', 4, 0x8a867d); bf.position.y = -2; scene.add(bf); base.visible = false;
    const sub = mk(new THREE.BoxGeometry(W, 3, D), soilMat(5)); sub.position.y = -5.5; scene.add(sub);
    const blk = layerBlock(W, 6, D, 'loose', 9, 0x2d2e31); scene.add(blk); const blkD = layerBlock(W, 6, D, 'wmm', 13, 0x2d2e31); scene.add(blkD);
    const infl = mk(new THREE.PlaneGeometry(W, 1), new THREE.MeshBasicMaterial({ map: L.canvasTex(4, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,94,41,.62)'); gr.addColorStop(1, 'rgba(255,94,41,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }, true), transparent: true, depthWrite: false }), { cast: false }); infl.position.z = D / 2 + .08; scene.add(infl);
    const R = roller(); R.g.scale.setScalar(1.25); R.g.rotation.y = 0; scene.add(R.g); const rolling = { x: 0, dir: 1 };
    out.views = { all: { az: -16, el: 12, dist: 88, t: [0, 3, 0] } };
    out.limits = { az: [-60, 40], el: [3, 40], dist: [30, 130] };
    const cur = { th: TH[state.th || 'b'], c: 0 }; out.seek = () => { cur.th = TH[state.th || 'b']; cur.c = state.comp || 0; };
    out.labels = [lab('l', 'WMM layer', () => new V3(-W / 2 + 4, cur.th / 2, D / 2), null, 'hot', 'l'), lab('i', 'How far the compactive effort reaches', () => new V3(W / 2 - 6, cur.th - Math.min(cur.th, 6.5) / 2, D / 2), st => st.th === 'c' || st.th === 'b', '', 'r'), lab('g', 'GSB below', new V3(-W / 2 + 4, -2, D / 2), null, '', 'l'), lab('s', 'Subgrade', new V3(-W / 2 + 4, -5.5, D / 2), null, '', 'l')];
    out.update = (t, dt, st) => {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 5); let moving = false; const th = TH[st.th || 'b'], c = st.comp == null ? 0 : st.comp;
      cur.th += (th - cur.th) * k; if (Math.abs(th - cur.th) > .005) moving = true; cur.c += (c - cur.c) * k; if (Math.abs(c - cur.c) > .004) moving = true;
      const loose = cur.th * 1.0, comp = loose * (1 - .2 * cur.c); const top = comp;
      [blk, blkD].forEach(b => { b.scale.y = comp / 6; b.position.y = comp / 2; b.material[4].map.repeat.set(1, comp / 6); }); blk.visible = cur.c < .5; blkD.visible = !blk.visible;
      const depth = Math.min(comp, 6.5); infl.scale.y = depth; infl.position.y = comp - depth / 2; infl.material.opacity = .55 + .3 * cur.c;
      if (st.play && !reduceM()) { rolling.x += rolling.dir * dt * 7; if (rolling.x > 24) rolling.dir = -1; if (rolling.x < -24) rolling.dir = 1; moving = true; R.drum.rotation.z -= rolling.dir * dt * 3.3; }
      R.g.rotation.y = rolling.dir > 0 ? 0 : Math.PI; R.g.position.set(rolling.x, top + 0, 0); R.g.visible = true;
      return moving;
    };
    return out;
  }

  /* edge */
  const D = 16, H = 5, WL = 20;
  const base = mk(new THREE.BoxGeometry(100, 3, D), new THREE.MeshStandardMaterial({ color: 0x8a867d, roughness: 1 })); base.position.y = -1.5; scene.add(base);
  const mkSide = (x0, kind, seed) => {
    const g = new THREE.Group(); g.position.x = x0; scene.add(g);
    const core = layerBlock(WL, H, D, 'wmm', seed, 0x2d2e31); core.position.y = H / 2; g.add(core); return { g, core };
  };
  const A = mkSide(-26, 'c', 21), B = mkSide(26, 'u', 25);
  /* confined side: shoulder material built up beside the layer */
  [-1, 1].forEach(s => { const sh = layerBlock(10, H, D, 'gsb', 31 + s, 0x7d7a73); sh.position.set(A.g.position.x + s * (WL / 2 + 5), H / 2, 0); scene.add(sh); });
  /* unconfined side: nothing beside the layer, material spills outward */
  const wedgeShape = new THREE.Shape(); wedgeShape.moveTo(0, 0); wedgeShape.lineTo(5, 0); wedgeShape.lineTo(0, H); wedgeShape.closePath();
  const wedges = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.ExtrudeGeometry(wedgeShape, { depth: D, bevelEnabled: false }), faceMat(37, 'loose', 256, 128, [1, 1])); w.castShadow = true; w.position.set(B.g.position.x + s * WL / 2, 0, -D / 2); w.scale.x = s; w.visible = true; scene.add(w); return w; });
  const r1 = new THREE.Group(), r2 = new THREE.Group(); scene.add(r1, r2);
  const drumM = new THREE.MeshStandardMaterial({ color: 0x8a8c90, metalness: .6, roughness: .45 });
  [r1, r2].forEach(r => { const c = mk(new THREE.CylinderGeometry(2.1, 2.1, D + 2, 32), drumM); c.rotation.x = Math.PI / 2; r.add(c); const f = mk(new THREE.BoxGeometry(1, 4.4, D + 2.6), yellowM()); f.position.x = 1.6; r.add(f); });
  out.views = { all: { az: -14, el: 14, dist: 100, t: [0, 3, 0] } };
  out.limits = { az: [-60, 40], el: [3, 40], dist: [30, 140] };
  out.labels = [lab('c', 'Confined: shoulder built with the layer', new V3(-26, H + 1.4, D / 2), null, 'hot', 'r'), lab('u', 'Unconfined edge: material moves out', new V3(26, H + 1.4, D / 2), null, 'warn', 'r'), lab('r', 'Roller pass', () => new V3(r2.position.x, 6.2, D / 2), null, '', 'l')];
  let T = 0; out.seek = v => { T = v; };
  out.update = (t, dt, st) => {
    if (st.play !== false && !reduceM()) T += dt; const p = (T * .18) % 1, ph = p < .5 ? p * 2 : 2 - p * 2, e = sm(ph);
    /* the roller travels toward the right edge of each layer and back */
    r1.position.set(-26 + 10 - e * 10, H + 2.1 - .1, 0); r2.position.set(26 + 10 - e * 8, H + 2.1 - e * .9, 0);
wedges.forEach((w, i) => { w.scale.x = (i ? 1 : -1) * (.15 + e * 1.1); }); B.core.scale.y = 1 - e * .1; B.core.position.y = H * B.core.scale.y / 2; B.core.scale.x = 1 + e * .04;
    return !reduceM() && st.play !== false;
  };
  return out;
}
