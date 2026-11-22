/* scene: laying a WMM layer. Two sets, one module.
   lay : transport, spreading, rolling and checking along one road strip. A tipper feeds a paver; the mat behind it is loose and thick; a vibratory roller follows and the layer becomes thinner and denser;
         the last stage shows the straight-edge and level checks. A transparent cut face shows the particles.
   seg : a uniform layer beside a segregated one (coarse particles separated, a fines pocket), before and after rolling.
   General drawings of generic machines. No layer thickness, rolling pattern, pass count, density or test value is shown or implied. */
import { THREE, L, studio } from '/assets/application-s3d.js';
import { layerBlock, sectionTex, soilMat, tipper, paver, roller, reduceM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU, canvasTex } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const set = state.set || 'lay';
  const scene = new THREE.Scene(); studio(scene, { ext: 80, key: 2.2, shadow: .2, map: 2048 });
  const out = { scene, fov: 30, wide: true };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show });

  if (set === 'lay') {
    const LEN = 150, D = 11, T0 = 1.8;
    const base = layerBlock(LEN, 3, D, 'gsb', 3, 0x8a867d); base.position.y = -1.5; scene.add(base);
    [-1, 1].forEach(s => { const sm0 = soilMat(6 + s); sm0.map.repeat.set(LEN / 14, 1); const sh = mk(new THREE.BoxGeometry(LEN, 3, 6), sm0); sh.position.set(0, -1.5, s * (D / 2 + 3)); scene.add(sh); });
    const loose = layerBlock(24, T0, D - .4, 'loose', 11, 0x2d2e31), dense = layerBlock(24, T0, D - .4, 'wmm', 17, 0x2d2e31); scene.add(loose, dense);
    const setBlock = (b, x0, x1, th) => { const len = Math.max(.001, x1 - x0); b.scale.set(len / 24, th / T0, 1); b.position.set((x0 + x1) / 2, th / 2, 0); b.visible = len > .1; b.material.forEach((m, i) => { if (m.map) { m.map.repeat.x = (i === 2 ? len / 24 : len / 24); } }); };
    const tp = tipper({ tarp: true }); tp.g.scale.setScalar(.72); scene.add(tp.g);
    const pv = paver(); pv.g.scale.setScalar(.82); scene.add(pv.g);
    const rl = roller(); rl.g.scale.setScalar(.72); scene.add(rl.g);
    /* inspector with a straight-edge and a level staff */
    const insp = new THREE.Group(); scene.add(insp); const body = mk(new THREE.CylinderGeometry(.4, .5, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0xff7a2b, roughness: .7 })); body.position.y = .75; insp.add(body); const head = mk(new THREE.SphereGeometry(.38, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: .8 })); head.position.y = 1.8; insp.add(head); const hat = mk(new THREE.SphereGeometry(.42, 12, 8, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: .5 })); hat.position.y = 1.95; insp.add(hat);
    const se = mk(new THREE.BoxGeometry(.16, .16, 9), M.steelS); se.position.set(1.2, 1.1, 0); insp.add(se); const staff = mk(new THREE.BoxGeometry(.2, 3.2, .2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 })); staff.position.set(1.2, 1.6, -3.6); insp.add(staff);
    [0, 1, 2, 3].forEach(i => { const s = mk(new THREE.BoxGeometry(.22, .3, .22), M.orange, { cast: false }); s.position.set(1.2, 1 + i * .75, -3.6); insp.add(s); });
    out.views = { transport: { az: -18, el: 14, dist: 70, t: [18, 3, 0] }, spread: { az: -26, el: 18, dist: 48, t: [4, 3, 0] }, roll: { az: -18, el: 11, dist: 40, t: [-20, 2, 3] }, check: { az: -22, el: 13, dist: 40, t: [-36, 1.5, 0] } };
    out.limits = { az: [-60, 40], el: [3, 40], dist: [20, 110] };
    const v = s => ['transport', 'spread', 'roll', 'check'][s | 0] || 'spread';
    out.labels = [
      lab('t', 'Covered tipper with the finished wet mix (general)', () => new V3(tp.g.position.x, 8, 0), st => st.view === 'transport' || st.view === 'spread', 'warn'),
      lab('p', 'Paver: receives, spreads, sets width, thickness and crossfall', () => new V3(pv.g.position.x - 4, 8.5, 0), st => st.view === 'spread' || st.view === 'transport', 'hot', 'l'),
      lab('m', 'Loose mat behind the screed', () => new V3(pv.g.position.x - 14, 2.2, 5.5), st => st.view === 'spread' || st.view === 'roll', '', 'l'),
      lab('r', 'Vibratory roller: approved pattern, passes set by the trial section', () => new V3(rl.g.position.x, 8.2, 0), st => st.view === 'roll', 'hot'),
      lab('d', 'Denser, thinner layer after rolling', () => new V3(rl.g.position.x - 12, 1.9, 5.5), st => st.view === 'roll', '', 'l'),
      lab('c', 'Cut face: graded particles', () => new V3(-14, 1.2, 5.6), st => st.view === 'roll' || st.view === 'check', '', 'l'),
      lab('s', 'Straight-edge and level checks', () => new V3(insp.position.x, 4, 0), st => st.view === 'check', 'hot'),
      lab('i', 'Field density, thickness, crossfall: contractor and Engineer', () => new V3(insp.position.x + 4, 2.4, 3), st => st.view === 'check', 'warn'),
    ];
    let T = 0; const cur = { st: -1 }; out.seek = v => { T = v; };
    out.update = (t, dt, st) => {
      const go = st.play !== false && !reduceM(); if (go) T += dt; const vw = st.view || 'spread', u = (T * .05) % 1, e = go ? sm(u < .5 ? u * 2 : 2 - u * 2) : .5;
      let pvx, tkx, rlx, tilt = 0, ix = -38;
      if (vw === 'transport') { tkx = lerp(80, 34, e); pvx = 20; rlx = -30; }
      else if (vw === 'spread') { pvx = lerp(-4, 10, e); tkx = pvx + 17; tilt = .08 + .55 * sm(clamp((e - .15) * 2)); rlx = -34; }
      else if (vw === 'roll') { pvx = 4; tkx = 44; rlx = lerp(-26, -2, e); }
      else { pvx = 4; tkx = 44; rlx = -2; ix = -40 + (go ? Math.sin(T * .6) * 3 : 0); }
      tp.g.position.set(tkx, 0, 0); tp.bed.rotation.z = tilt; tp.load.scale.y = Math.max(.05, 1 - tilt * 1.1); pv.g.position.set(pvx, 0, 0); rl.g.position.set(rlx, 1.45, 0); rl.g.rotation.y = 0; rl.drum.rotation.z = -T * 2.2; tp.wheels.forEach(w => { w.rotation.z = -tkx * .8; });
      insp.position.set(ix, 0, 5.4); insp.visible = vw === 'check'; rl.g.visible = vw === 'roll' || vw === 'check'; pv.g.visible = vw !== 'check'; tp.g.visible = vw !== 'check';
      const matStart = -70, screedX = pvx - 7, rollFront = vw === 'check' ? 12 : rlx - 1;
      setBlock(loose, rollFront, vw === 'check' ? rollFront : screedX, T0); setBlock(dense, matStart, vw === 'check' ? 14 : rollFront, T0 * .8);
      if (vw === 'transport') { setBlock(loose, 8, pvx - 7, T0); setBlock(dense, matStart, -20, T0 * .8); }
      const ch = cur.st !== vw; cur.st = vw; return go || ch;
    };
    return out;
  }

  /* seg */
  const W = 22, Hh = 9, Dd = 10;
  const segTex = canvasTex(1024, 512, (x, w, h) => { x.drawImage(sectionTex(1, 512, 512, 'coarse').image, 0, 0, 350, 512, 0, 0, 350, 512); x.drawImage(sectionTex(2, 512, 512, 'fines').image, 0, 0, 300, 512, 350, 0, 300, 512); x.drawImage(sectionTex(3, 512, 512, 'wmm').image, 0, 0, 374, 512, 650, 0, 374, 512); }, true);
  const mkBlock = (frontMap, topMap) => { const side = new THREE.MeshStandardMaterial({ color: 0x2d2e31, roughness: .95 }); const g = new THREE.BoxGeometry(W, Hh, Dd, 44, 1, 1); const m = new THREE.Mesh(g, [side, side, new THREE.MeshStandardMaterial({ map: topMap, roughness: 1 }), side, new THREE.MeshStandardMaterial({ map: frontMap, roughness: .95 }), side]); m.castShadow = m.receiveShadow = true; return m; };
  const uni = mkBlock(sectionTex(21, 1024, 512, 'wmm'), sectionTex(22, 512, 512, 'wmm', [2, 1])), sg = mkBlock(segTex, sectionTex(23, 512, 512, 'loose', [2, 1]));
  uni.position.set(-14, Hh / 2, 0); sg.position.set(14, Hh / 2, 0); scene.add(uni, sg);
  const base = mk(new THREE.BoxGeometry(60, 2, 14), new THREE.MeshStandardMaterial({ color: 0xcfcac1, roughness: 1 })); base.position.set(0, -1, 0); scene.add(base);
  const sgPos = sg.geometry.attributes.position, sgTop = [], topY = Hh / 2; for (let i = 0; i < sgPos.count; i++) if (sgPos.getY(i) > 0) sgTop.push([i, sgPos.getX(i)]);
  const prof = x => { const u = (x + W / 2) / W; return u < .34 ? .5 + Math.sin(u * 40) * .18 : u < .64 ? -.9 : -.1 + Math.sin(u * 12) * .1; };
  const roll = mk(new THREE.CylinderGeometry(1.8, 1.8, Dd + 2, 28), M.steelS); roll.rotation.x = Math.PI / 2; scene.add(roll);
  out.views = { both: { az: -10, el: 14, dist: 78, t: [0, 4.5, 0] }, uniform: { az: -8, el: 12, dist: 44, t: [-14, 4.5, 0] }, seg: { az: -8, el: 12, dist: 44, t: [14, 4.5, 0] } };
  out.limits = { az: [-50, 50], el: [3, 45], dist: [24, 110] };
  const both = st => st.view === 'both' || !st.view, vis = (s, st) => both(st) || st.view === s;
  out.labels = [lab('u', 'Uniform grading', new V3(-14, Hh + 1, Dd / 2), st => vis('uniform', st), 'hot', 'r'), lab('s', 'Segregated mix', new V3(14, Hh + 1, Dd / 2), st => vis('seg', st), 'warn', 'r'), lab('c', 'Coarse particles separated: voids', new V3(14 - 7, Hh / 2 + 1, Dd / 2), st => vis('seg', st), '', 'l'), lab('f', 'Fines pocket', new V3(14, Hh / 2 - 1, Dd / 2), st => vis('seg', st), '', 'r'), lab('d', 'Surface and density uneven after rolling', new V3(14 + 6, Hh + 0.4, 0), st => vis('seg', st) && (st.roll || 0) > .5, 'warn', 'r'), lab('e', 'Even surface after rolling', new V3(-14 + 6, Hh + .4, 0), st => vis('uniform', st) && (st.roll || 0) > .5, 'hot', 'r')];
  const cur = { r: 0 }; let T = 0; out.seek = v => { cur.r = 1e9; T = v || 0; };
  out.update = (t, dt, st) => {
    const k = reduceM() ? 1 : 1 - Math.exp(-dt * 3); let moving = false; const goal = st.roll || 0; if (cur.r > 1e8) cur.r = goal; cur.r += (goal - cur.r) * k; if (Math.abs(goal - cur.r) > .003) moving = true; else cur.r = goal;
    sgTop.forEach(([i, x]) => { sgPos.setY(i, topY + prof(x) * cur.r - cur.r * .5); }); sgPos.needsUpdate = true; sg.geometry.computeVertexNormals();
    uni.scale.y = 1 - cur.r * .08; uni.position.y = Hh * uni.scale.y / 2;
    if (cur.r > .02 && !reduceM()) { T += dt; roll.visible = true; const x = -20 + ((T * .5) % 1) * 40, over = x < -3 ? uni : sg; roll.position.set(x, Hh * .94 + 1.6, 0); roll.rotation.y = 0; moving = true; } else roll.visible = false;
    return moving;
  };
  return out;
}
