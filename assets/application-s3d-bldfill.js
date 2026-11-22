/* scene: stone in fills and foundations. Three sets, one module.
   embank : a rockfill embankment cut section in layers: prepared foundation, rockfill, blinding, transition, earthen cushion, formation. Layers can be selected, pulled apart, or built up in order.
   dump   : random dumping beside controlled rockfill, as-placed and after compaction. 
   found  : four different foundation-related systems side by side: an RCC footing, a rubble masonry foundation, stone soling and a rockfill treatment. They are NOT interchangeable.
   Drawings. Layer thicknesses and stone sizes are not to scale; nothing here is a design, a specification value (the Clause 313 figures live in the page text, tied to that clause) or an OM GROUP result. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { boulderGeo, boulderMat, boulder, reduceM } from '/assets/application-s3d-bldkit.js';
import { soilMat, sectionTex, layerBlock, yellowM } from '/assets/application-s3d-wmkit.js';
const { M, mk, clamp, sm, lerp, TAU, canvasTex } = L;
const V3 = THREE.Vector3;

/* a cut face painted as large faceted stones with dark voids between them */
const bigStoneTex = (seed, w = 1024, h = 360, rmin = 38, rmax = 92, bg = '#101012') => canvasTex(w, h, (x, cw, ch) => {
  x.fillStyle = bg; x.fillRect(0, 0, cw, ch); const r = rng(seed);
  for (let i = 0; i < 260; i++) {
    const rad = rmin + (rmax - rmin) * Math.pow(r(), 1.3), cx = r() * cw, cy = r() * ch, k = 6 + (r() * 3 | 0), a0 = r() * TAU, t = .16 + r() * .2, vein = r() < .3;
    x.beginPath(); for (let j = 0; j < k; j++) { const a = a0 + j / k * TAU + (r() - .5) * .45, rd = rad * (.62 + r() * .5); const px = cx + Math.cos(a) * rd * 1.25, py = cy + Math.sin(a) * rd * .85; j ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath();
    const c = ((t + .06) * 255) | 0; x.fillStyle = 'rgb(' + c + ',' + (c + 3) + ',' + (c + 9) + ')'; x.fill(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 2; x.stroke();
    if (vein) { x.strokeStyle = 'rgba(210,210,205,.5)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx - rad * .6, cy - rad * .2); x.lineTo(cx + rad * .5, cy + rad * .3); x.stroke(); }
  }
}, true);
const faceBlock = (w, h, d, tex, top = 0x2a2b2e) => { const side = new THREE.MeshStandardMaterial({ color: top, roughness: 1 }); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, new THREE.MeshStandardMaterial({ color: top, roughness: 1 }), side, new THREE.MeshStandardMaterial({ map: tex, roughness: .95 }), side]); m.castShadow = m.receiveShadow = true; return m; };

export default function build({ state }) {
  const set = state.set || 'embank';
  const scene = new THREE.Scene(); studio(scene, { ext: 50, key: 2.2, shadow: .2, map: 2048 });
  const out = { scene, fov: 30, wide: true };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const hotLine = o => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), new THREE.LineBasicMaterial({ color: 0xff5e29 })); o.add(e); return e; };
  const stoneMat = boulderMat(); let T = 0; out.seek = v => { T = v; };

  if (set === 'embank') {
    const W = 64, D = 22;
    const DEF = [
      { id: 'fnd', text: 'FOUNDATION · PREPARED GROUND', h: 4.5, kind: 'soil' }, { id: 'rock', text: 'ROCKFILL', h: 7, kind: 'rock' }, { id: 'blind', text: 'BLINDING · SMALLER FRAGMENTS', h: 1.4, kind: 'chips' },
      { id: 'trans', text: 'TRANSITION LAYER', h: 2.4, kind: 'gsb' }, { id: 'cush', text: 'EARTHEN CUSHION', h: 2.8, kind: 'earth' }, { id: 'form', text: 'FORMATION', h: 1.6, kind: 'wmm' }];
    const g = new THREE.Group(); scene.add(g);
    DEF.forEach((d, i) => {
      if (d.kind === 'soil') { const s = soilMat(8); s.map.repeat.set(4, 1); d.m = new THREE.Mesh(new THREE.BoxGeometry(W, d.h, D), s); d.m.castShadow = d.m.receiveShadow = true; }
      else if (d.kind === 'rock') d.m = faceBlock(W, d.h, D, bigStoneTex(31, 1024, 360, 44, 100));
      else if (d.kind === 'chips') d.m = faceBlock(W, d.h, D, sectionTex(33, 1024, 128, 'coarse', [1, 1]));
      else if (d.kind === 'earth') { const s = soilMat(12); s.map.repeat.set(4, 1); d.m = new THREE.Mesh(new THREE.BoxGeometry(W, d.h, D), s); d.m.castShadow = d.m.receiveShadow = true; }
      else d.m = layerBlock(W, d.h, D, d.kind, 40 + i * 5, d.kind === 'gsb' ? 0x7d7a73 : 0x2a2b2e);
      (Array.isArray(d.m.material) ? d.m.material : [d.m.material]).forEach(m => { m.transparent = true; });
      g.add(d.m); d.hl = new THREE.Mesh(new THREE.BoxGeometry(W + .6, d.h + .5, D + .6), new THREE.MeshBasicMaterial({ color: 0xff5e29, transparent: true, opacity: .07, depthWrite: false })); d.hl.visible = false; d.m.add(d.hl); d.edge = hotLine(d.hl); d.edge.visible = false;
    });
    /* a few large stones standing on the rockfill layer, so the layer reads as rock from above and from the side */
    const rr = rng(5); const top = DEF[0].h + DEF[1].h;
    for (let i = 0; i < 9; i++) { const sz = .9 + rr() * 1.2, b = new THREE.Mesh(boulderGeo(50 + i, sz * 1.1, sz * .7, sz * .9, 'nat', 3), stoneMat); b.castShadow = true; b.userData.b = new V3(-W / 2 + 5 + i * 7.2 + (rr() - .5) * 2, 0, (rr() - .5) * (D - 6)); DEF[1].m.add(b); b.position.set(b.userData.b.x, DEF[1].h / 2 + sz * .45, b.userData.b.z); }
    out.views = { reveal: { az: -22, el: 18, dist: 118, t: [0, 11, 0] }, zoom: { az: -8, el: 7, dist: 46, t: [-4, 9, 10] } };
    out.limits = { az: [-70, 40], el: [4, 55], dist: [30, 160] };
    out.labels = DEF.map(d => lab(d.id, d.text, () => new V3(-W / 2 - 1, d.m.position.y, D / 2), st => (st.view || 'reveal') !== 'zoom' && d.vis !== false, d.id === 'rock' ? 'hot' : '', 'l')).concat([lab('z', 'Large stones with smaller fragments filling the surface voids', new V3(-4, 12.5, D / 2 + .2), st => st.view === 'zoom', 'hot', 'r')]);
    const cur = { ex: 0, b: 1 }, dim = {}; DEF.forEach(d => { dim[d.id] = 1; });
    out.seek = () => { cur.ex = 1e9; cur.b = 1e9; };
    out.update = (t, dt, st) => {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 4); let moving = false, y = 0; const goal = st.view === 'zoom' ? .3 : (st.explode == null ? 1 : st.explode), bg = st.build == null ? 1 : st.build;
      if (cur.ex > 1e8) { cur.ex = goal; cur.b = bg; DEF.forEach(d => { dim[d.id] = (st.layer && st.layer !== 'all' && st.layer !== d.id) ? .3 : 1; }); }
      cur.ex += (goal - cur.ex) * k; if (Math.abs(goal - cur.ex) > .002) moving = true; else cur.ex = goal;
      cur.b += (bg - cur.b) * k; if (Math.abs(bg - cur.b) > .002) moving = true; else cur.b = bg;
      DEF.forEach((d, i) => {
        const prog = clamp(cur.b * DEF.length - i), vis = prog > .01; d.vis = vis; d.m.visible = vis; d.m.scale.y = Math.max(.001, sm(prog));
        const h = d.h * d.m.scale.y; d.m.position.y = y + h / 2 + cur.ex * i * 5.2 * sm(prog); y += h;
        const sel = st.layer && st.layer !== 'all', on = !sel || st.layer === d.id, goalO = on ? 1 : .3; dim[d.id] += (goalO - dim[d.id]) * k; if (Math.abs(goalO - dim[d.id]) > .01) moving = true;
        (Array.isArray(d.m.material) ? d.m.material : [d.m.material]).forEach(m => { m.opacity = dim[d.id]; }); d.hl.visible = d.edge.visible = !!sel && st.layer === d.id && vis;
      });
      DEF[1].m.children.forEach(c => { if (c.isMesh && c.userData.b) c.scale.y = 1 / Math.max(.001, DEF[1].m.scale.y); });
      return moving;
    };
    return out;
  }

  if (set === 'dump') {
    const SW = 22, SD = 14, GAP = 6, XL = -(SW + GAP) / 2 - 0, XR = (SW + GAP) / 2;
    const pad = (x) => { const p = mk(new THREE.BoxGeometry(SW + 2, 1, SD + 2), new THREE.MeshStandardMaterial({ color: 0x8c5d3c, roughness: 1 })); p.position.set(x, -.5, 0); scene.add(p); return p; };
    pad(XL); pad(XR);
    const r = rng(14); const randG = new THREE.Group(); randG.position.x = XL; scene.add(randG); const ctlG = new THREE.Group(); ctlG.position.x = XR; scene.add(ctlG);
    /* uncontrolled: big stones at random heights and angles, with gaps */
    for (let i = 0; i < 34; i++) { const sz = .9 + r() * 1.9, m = new THREE.Mesh(boulderGeo(60 + i, sz * 1.1, sz * .72, sz * .85, 'nat', 3), stoneMat); m.castShadow = m.receiveShadow = true; const lvl = r() < .35 ? 1 : 0; m.position.set((r() - .5) * (SW - 3), sz * .55 + lvl * (1 + r() * 1.8), (r() - .5) * (SD - 3)); m.rotation.set(r() * 6, r() * 6, r() * 6); randG.add(m); }
    /* controlled: two even courses of selected stones, then chips in the surface voids; the layer compacts as `roll` goes 0 -> 1 */
    const rows = [[], []]; let ci = 0;
    for (let cz = 0; cz < 2; cz++) for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 5; iz++) { const sz = 1.2 + r() * .2, m = new THREE.Mesh(boulderGeo(120 + ci++, sz * 1.0, sz * .66, sz * .9, 'nat', 3), stoneMat); m.castShadow = m.receiveShadow = true; const x = -SW / 2 + 1.6 + ix * (SW - 3.2) / 7 + (iz % 2 ? .7 : 0), z = -SD / 2 + 1.5 + iz * (SD - 3) / 4; m.userData.p = new V3(x, .78 + cz * 1.12, z); m.position.copy(m.userData.p); m.rotation.y = r() * 3; ctlG.add(m); rows[cz].push(m); }
    const chipM = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 });
    const chips = []; for (let i = 0; i < 220; i++) chips.push([-SW / 2 + 1 + r() * (SW - 2), 1.0 + r() * 1.5, -SD / 2 + 1 + r() * (SD - 2), .16 + r() * .14]);
    const chipI = instStones(ctlG, chips, chipM, 9, false);
    const roll = mk(new THREE.CylinderGeometry(1.6, 1.6, SD + 1.2, 28), M.steelS); roll.rotation.x = Math.PI / 2; roll.visible = false; ctlG.add(roll);
    out.views = { all: { az: -8, el: 22, dist: 50, t: [0, 1.6, 0] } }; out.limits = { az: [-45, 40], el: [5, 55], dist: [22, 90] };
    out.labels = [lab('a', 'Random dumping: voids, uneven surface', new V3(XL, 6.4, 0), null, 'warn'), lab('b', 'Controlled rockfill: layered, voids filled, compacted', new V3(XR, 5.4, 0), null, 'hot')];
    const cur = { r: 0 }; out.seek = () => { cur.r = 1e9; };
    out.update = (t, dt, st) => {
      const k = reduceM() ? 1 : 1 - Math.exp(-dt * 2.2); const goal = st.roll || 0; if (cur.r > 1e8) cur.r = goal; cur.r += (goal - cur.r) * k; const mv = Math.abs(goal - cur.r) > .003; if (!mv) cur.r = goal;
      rows.forEach((row, cz) => row.forEach(m => { m.position.y = m.userData.p.y * (1 - .12 * cur.r * (cz + 1) * .5); }));
      chipI.forEach(im => { im.position.y = -.35 * cur.r; });
      roll.visible = cur.r > .02 && cur.r < .995; if (roll.visible) { roll.position.set(-SW / 2 + 2 + (T * 5 % (SW - 4)), 3.9 - .4 * cur.r, 0); if (!reduceM()) { T += dt; roll.rotation.y = 0; } }
      return mv || (roll.visible && !reduceM());
    };
    return out;
  }

  /* found */
  const SW = 12, X = [-27, -9, 9, 27], SYS = [['rcc', 'RCC footing'], ['rub', 'Rubble masonry foundation'], ['sol', 'Stone soling'], ['rf', 'Rockfill treatment']];
  const rings = []; const rr = rng(8);
  SYS.forEach(([k, t], i) => {
    const g = new THREE.Group(); g.position.set(X[i], 0, 0); scene.add(g);
    const s = soilMat(20 + i); s.map.repeat.set(2, 1); const soil = new THREE.Mesh(new THREE.BoxGeometry(SW + 2, 4, 9), s); soil.position.y = -2; soil.receiveShadow = true; g.add(soil);
    const ring = mk(new THREE.BoxGeometry(SW + 2.6, .2, 9.6), M.orange, { cast: false }); ring.position.y = .1; ring.visible = false; g.add(ring); rings.push(ring);
    if (k === 'rcc') {
      const conc = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x9a9c9a, roughness: .95 })); conc.position.y = .6; conc.castShadow = true; g.add(conc);
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5, 1.8), new THREE.MeshStandardMaterial({ color: 0xa3a5a3, roughness: .95 })); col.position.y = 3.7; col.castShadow = true; g.add(col);
      const rb = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: .6, metalness: .4 }); for (let j = -3; j <= 3; j++) { const a = mk(new THREE.CylinderGeometry(.06, .06, 5.4, 6), rb, { cast: false }); a.rotation.z = Math.PI / 2; a.position.set(0, .35, j * .8); g.add(a); const b2 = mk(new THREE.CylinderGeometry(.06, .06, 7.4, 6), rb, { cast: false }); b2.rotation.x = Math.PI / 2; b2.position.set(j * 1.0, .5, 0); g.add(b2); }
      const pcc = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 7), new THREE.MeshStandardMaterial({ color: 0xcfcdc6, roughness: 1 })); pcc.position.y = -.15; g.add(pcc);
    } else if (k === 'rub') {
      const mortar = new THREE.Mesh(new THREE.BoxGeometry(9, 4.4, 4.2), new THREE.MeshStandardMaterial({ color: 0x9a978f, roughness: 1 })); mortar.position.y = 2.2; g.add(mortar);
      for (let row = 0; row < 5; row++) for (let c = 0; c < 4; c++) { const sx = 2.0 + rr() * .3, m = new THREE.Mesh(boulderGeo(200 + row * 5 + c, sx * .5, .42, .5, 'block', 3), stoneMat); m.castShadow = true; m.position.set(-3.4 + c * 2.25 + (row % 2 ? 1.1 : 0), .45 + row * .88, 2.2); m.scale.set(1, 1, 1); g.add(m); }
    } else if (k === 'sol') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(SW, .5, 8), new THREE.MeshStandardMaterial({ color: 0xb9a888, roughness: 1 })); bed.position.y = .25; g.add(bed);
      for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 4; iz++) { const m = new THREE.Mesh(boulderGeo(300 + ix * 4 + iz, .9, .45, .88, 'block', 3), stoneMat); m.castShadow = true; m.position.set(-SW / 2 + 1.2 + ix * 1.95, .95, -3 + iz * 2.0); g.add(m); }
    } else {
      for (let i2 = 0; i2 < 20; i2++) { const sz = .9 + rr() * 1.2, m = new THREE.Mesh(boulderGeo(400 + i2, sz * 1.1, sz * .7, sz * .85, 'nat', 3), stoneMat); m.castShadow = true; m.position.set((rr() - .5) * (SW - 2), sz * .5 + (i2 > 12 ? 1.3 : 0), (rr() - .5) * 6); m.rotation.set(rr() * 6, rr() * 6, rr() * 6); g.add(m); }
      const chipsA = []; for (let i3 = 0; i3 < 120; i3++) chipsA.push([(rr() - .5) * (SW - 1), 1.7 + rr() * .8, (rr() - .5) * 6.4, .15 + rr() * .1]); instStones(g, chipsA, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .9 }), 3, false);
    }
  });
  out.views = { all: { az: -8, el: 18, dist: 92, t: [0, 2.6, 0] } }; out.limits = { az: [-45, 40], el: [5, 55], dist: [30, 130] };
  out.labels = SYS.map(([k, t], i) => lab(k, t, new V3(X[i], 8.2 - (k === 'rcc' ? 0 : 3.4), 0), null, k === 'rcc' ? '' : '', 'r')).concat([lab('w', 'Four different systems: not interchangeable', new V3(0, 10.8, 0), null, 'warn', 'r')]);
  out.update = (t, dt, st) => { rings.forEach((r, i) => { r.visible = st.sel === SYS[i][0]; }); return false; };
  return out;
}
