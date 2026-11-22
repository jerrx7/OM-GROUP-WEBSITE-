/* scene: the Wet Mix Macadam / Granular Sub-base layers in the pavement (WMM and GSB pages). Three sets, one module.
   layers : a pavement cross-section as real cut blocks (laterite subgrade, pale sub-base, dark graded macadam, black asphalt with chips, concrete) that separates; one layer can be isolated, one is outlined.
            Every block wears its own painted, seamless texture on the cut and on the top (faceted stones of mixed sizes in a dust matrix).
   thick  : an example WMM layer under a vibratory roller (a Blender model): three layer thicknesses, loose to compacted, and how far the compactive effort reaches. Thicknesses are NOT specification values.
   edge   : lateral confinement. The same roller pass beside a confined edge (shoulder built with the layer) and an unconfined edge where the material spills out.
   Pictures: a common arrangement, not a pavement design. Layer thicknesses are not to scale and are not specification values. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { aggBlock, aggMat, resizeBlock, scaleUV, cvs, tex, TILE, reduceM } from '/assets/application-s3d-rdkit.js';
import { rollerMachine } from '/assets/application-s3d-rdmach.js';
const V3 = THREE.Vector3, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };

export default function build({ state }) {
  const set = state.set || 'layers', narrow = matchMedia('(max-width:640px)').matches;
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 64, key: 2.5, shadow: .24, map: 4096, ground: false });
  key.shadow.bias = -.0002; key.shadow.normalBias = .05; key.shadow.camera.near = 40; key.shadow.camera.far = 340; key.shadow.camera.updateProjectionMatrix();
  /* bench: a pale surface the section stands on */
  { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); }
    const t = tex(b); t.repeat.set(40, 26); const bench = new THREE.Mesh(new THREE.BoxGeometry(520, 2, 340), new THREE.MeshStandardMaterial({ map: t, roughness: .55, metalness: 0, envMapIntensity: .75 })); bench.position.set(0, set === 'thick' ? -8 : set === 'edge' ? -4 : -1, 0); bench.receiveShadow = true; scene.add(bench); }
  const out = { scene, fov: 30, wide: true };
  const hotLine = o => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), new THREE.LineBasicMaterial({ color: 0xff5e29 })); o.add(e); return e; };
  const lab = (id, text, anchor, show, tone, side = 'r') => ({ id, text, side, tone, anchor, show: show || (() => true) });

  if (set === 'layers') {
    const W = 64, D = 26, DEF = [
      { id: 'sub', text: 'Subgrade', h: 6, kind: 'soil' }, { id: 'gsb', text: 'GSB: granular sub-base', h: 5, kind: 'gsb' },
      { id: 'wmm', text: 'WMM: wet mix macadam', h: 4.6, kind: 'wmm' }, { id: 'dbm', text: 'DBM: bituminous base', h: 3.2, kind: 'dbm' }, { id: 'bc', text: 'BC: wearing course', h: 2.2, kind: 'bc' },
      { id: 'dlc', text: 'DLC: dry lean concrete', h: 3.6, kind: 'conc' }, { id: 'pcc', text: 'Concrete pavement slab', h: 3.2, kind: 'conc2' }];
    const SETS = { flex: ['sub', 'gsb', 'wmm', 'dbm', 'bc'], rigid: ['sub', 'gsb', 'dlc', 'pcc'] };
    const g = new THREE.Group(); scene.add(g);
    DEF.forEach((d, i) => {
      d.m = aggBlock(d.kind, W, d.h, D, 10 + i * 7, { u: i * .27, v: i * .13 }); g.add(d.m);
      d.hl = new THREE.Mesh(new THREE.BoxGeometry(W + .6, d.h + .5, D + .6), new THREE.MeshBasicMaterial({ color: 0xff5e29, transparent: true, opacity: .07, depthWrite: false })); d.hl.visible = false; d.m.add(d.hl); d.edge = hotLine(d.hl); d.edge.visible = false;
    });
    out.views = { reveal: { az: -24, el: 20, dist: narrow ? 150 : 108, t: [0, 9, 0] }, all: { az: -22, el: 16, dist: narrow ? 146 : 104, t: [0, 10, 0] }, zoom: { az: -8, el: 6, dist: 38, t: [-6, 14, 12] } };
    out.limits = { az: [-70, 45], el: [3, 55], dist: [24, 190] };
    out.labels = DEF.map(d => lab(d.id, d.text, () => new V3(-W / 2 - 1, d.m.position.y, D / 2), st => (st.view || 'reveal') !== 'zoom' && SETS[st.pav || 'flex'].includes(d.id), (d.id === 'wmm' || d.id === 'gsb') ? 'hot' : '', 'l'))
      .concat([lab('p', 'Graded particles, cut face', new V3(-6, 14.5, D / 2 + .2), st => st.view === 'zoom', 'hot', 'r')]);
    const cur = { ex: -1 }, dim = {}; DEF.forEach(d => { dim[d.id] = 1; });
    out.update = (t, dt, st) => {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 4); let moving = false, y = 0; const goal = st.view === 'zoom' ? .35 : (st.explode == null ? 1 : st.explode);
      if (cur.ex < 0) cur.ex = goal; cur.ex += (goal - cur.ex) * k; if (Math.abs(goal - cur.ex) > .002) moving = true; else cur.ex = goal;
      const act = SETS[st.pav || 'flex'], hotId = st.hotid || 'wmm';
      DEF.forEach(d => { d.m.visible = act.includes(d.id); });
      act.forEach((id, i) => {
        const d = DEF.find(x => x.id === id);
        d.m.position.y = y + d.h / 2 + cur.ex * i * 5.6; y += d.h;
        const sel = st.layer && st.layer !== 'all', goalO = !sel || st.layer === d.id ? 1 : .3; dim[d.id] += (goalO - dim[d.id]) * k; if (Math.abs(goalO - dim[d.id]) > .01) moving = true;
        const mm = d.m.material, tr = dim[d.id] < .995; if (mm.transparent !== tr) { mm.transparent = tr; mm.needsUpdate = true; } mm.opacity = dim[d.id]; mm.depthWrite = !tr;
        d.hl.visible = d.edge.visible = !!sel && st.layer === d.id || (!sel && d.id === hotId && (st.view || 'reveal') !== 'zoom' && st.hot !== false);
      });
      return moving;
    };
    return out;
  }

  if (set === 'thick') {
    const W = 60, D = 12, TH = { a: 3, b: 5.5, c: 9 };
    const gsb = aggBlock('gsb', W, 4, D, 4); gsb.position.y = -2; scene.add(gsb);
    const sub = aggBlock('soil', W, 3, D, 5); sub.position.y = -5.5; scene.add(sub);
    const blk = aggBlock('loose', W, 6, D, 9), blkD = aggBlock('wmm', W, 6, D, 13); scene.add(blk, blkD);
    const gcv = cvs(4, 128), gg = gcv.getContext('2d'), gr = gg.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,94,41,.7)'); gr.addColorStop(1, 'rgba(255,94,41,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 4, 128);
    const infl = new THREE.Mesh(new THREE.PlaneGeometry(W, 1), new THREE.MeshBasicMaterial({ map: tex(gcv), transparent: true, depthWrite: false })); infl.position.z = D / 2 + .08; infl.renderOrder = 4; scene.add(infl);
    const R = rollerMachine(2.6); scene.add(R.g); const rolling = { x: 0, dir: 1 };
    out.views = { all: { az: -16, el: 13, dist: narrow ? 130 : 92, t: [0, 1, 0] } };
    out.limits = { az: [-60, 40], el: [3, 40], dist: [30, 150] };
    const cur = { th: TH[state.th || 'b'], c: state.comp || 0, h: -1 }; out.seek = () => { cur.th = TH[state.th || 'b']; cur.c = state.comp || 0; };
    out.labels = [lab('l', 'WMM layer', () => new V3(-W / 2 + 4, cur.th / 2, D / 2), null, 'hot', 'l'), lab('i', 'How far the compactive effort reaches', () => new V3(W / 2 - 6, cur.th - Math.min(cur.th, 6.5) / 2, D / 2), st => st.th === 'c' || st.th === 'b', '', 'r'), lab('g', 'GSB below', new V3(-W / 2 + 4, -2, D / 2), null, '', 'l'), lab('s', 'Subgrade', new V3(-W / 2 + 4, -5.5, D / 2), null, '', 'l')];
    out.update = (t, dt, st) => {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 5); let moving = false; const th = TH[st.th || 'b'], c = st.comp == null ? 0 : st.comp;
      cur.th += (th - cur.th) * k; if (Math.abs(th - cur.th) > .005) moving = true; cur.c += (c - cur.c) * k; if (Math.abs(c - cur.c) > .004) moving = true;
      const comp = cur.th * (1 - .2 * cur.c), top = comp;
      if (Math.abs(comp - cur.h) > .004) { cur.h = comp; resizeBlock(blk, W, comp, D); resizeBlock(blkD, W, comp, D); blk.position.y = blkD.position.y = comp / 2; }
      blk.visible = cur.c < .5; blkD.visible = !blk.visible;
      const depth = Math.min(comp, 6.5); infl.scale.y = depth; infl.position.y = comp - depth / 2; infl.material.opacity = .55 + .3 * cur.c;
      if (st.play && !reduceM()) { rolling.x += rolling.dir * dt * 7; if (rolling.x > 22) rolling.dir = -1; if (rolling.x < -22) rolling.dir = 1; moving = true; R.drum.rotation.z -= rolling.dir * dt * 3.3 / R.scale * 1.7; R.wheels.forEach(w => { w.rotation.z -= rolling.dir * dt * 3.3 / R.scale * 1.7 * .85; }); }
      R.g.rotation.y = rolling.dir > 0 ? 0 : Math.PI; R.g.position.set(rolling.x, top, 0);
      return moving;
    };
    return out;
  }

  /* edge */
  const D = 14, H = 5, WL = 20;
  const base = aggBlock('gsb', 112, 3, D, 6); base.position.y = -1.5; scene.add(base);
  const mkSide = (x0, seed) => { const g = new THREE.Group(); g.position.x = x0; scene.add(g); const core = aggBlock('wmm', WL, H, D, seed); core.position.y = H / 2; g.add(core); return { g, core }; };
  const A = mkSide(-28, 21), B = mkSide(28, 25);
  [-1, 1].forEach(s => { const sh = aggBlock('gsb', 10, H, D, 31 + s); sh.position.set(A.g.position.x + s * (WL / 2 + 5), H / 2, 0); scene.add(sh); });
  const wedgeShape = new THREE.Shape(); wedgeShape.moveTo(0, 0); wedgeShape.lineTo(5, 0); wedgeShape.lineTo(0, H); wedgeShape.closePath();
  const wm = aggMat('loose');
  const wedges = [-1, 1].map(s => { const w = new THREE.Mesh(scaleUV(new THREE.ExtrudeGeometry(wedgeShape, { depth: D, bevelEnabled: false }), 1 / TILE, 1 / TILE), wm); w.castShadow = true; w.receiveShadow = true; w.position.set(B.g.position.x + s * WL / 2, 0, -D / 2); w.scale.x = s; scene.add(w); return w; });
  const r1 = rollerMachine(2.5), r2 = rollerMachine(2.5); scene.add(r1.g, r2.g);
  out.views = { all: { az: -14, el: 14, dist: narrow ? 160 : 106, t: [0, 3, 0] } };
  out.limits = { az: [-60, 40], el: [3, 40], dist: [30, 160] };
  out.labels = [lab('c', 'Confined: shoulder built with the layer', new V3(-28, H + 1.4, D / 2), null, 'hot', 'r'), lab('u', 'Unconfined edge: material moves out', new V3(28, H + 1.4, D / 2), null, 'warn', 'r'), lab('r', 'Roller pass', () => new V3(r2.g.position.x, 9, D / 2), null, '', 'l')];
  let T = 0; out.seek = v => { T = v; };
  out.update = (t, dt, st) => {
    const go = st.play !== false && !reduceM(); if (go) T += dt; const p = (T * .18) % 1, ph = p < .5 ? p * 2 : 2 - p * 2, e = sm(ph);
    r1.g.position.set(-28 + 11 - e * 11, H, 0); r2.g.position.set(28 + 11 - e * 9, H - e * .9, 0); r1.g.rotation.y = r2.g.rotation.y = Math.PI;
    [r1, r2].forEach(r => { if (go) { r.drum.rotation.z += dt * 2; r.wheels.forEach(w => { w.rotation.z += dt * 1.7; }); } });
    wedges.forEach((w, i) => { w.scale.x = (i ? 1 : -1) * (.15 + e * 1.1); }); B.core.scale.y = 1 - e * .1; B.core.position.y = H * B.core.scale.y / 2; B.core.scale.x = 1 + e * .04;
    return go;
  };
  return out;
}
