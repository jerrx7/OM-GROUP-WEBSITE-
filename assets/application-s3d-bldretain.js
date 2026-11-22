/* scene: stone in retaining and slope-protection works. Two sets, one module.
   retain : a cut section of a project-specific stone retaining arrangement: retained soil, stone structure, foundation, granular backfill, filter, drain pipe, outlet and toe. Select a component;
            switch on the water path or the four stability checks (sliding, overturning, bearing, overall stability).
   pitch  : a construction-stone placement on flat ground beside stone pitching on an embankment slope with a filter layer and toe protection. They are different things.
   Drawings, not designs. No pressure, factor of safety, size, weight or hydraulic value is shown, and no retaining wall or pitching is designed here. */
import { THREE, L, studio, rng, instStones } from '/assets/application-s3d.js';
import { loopEnv } from '/assets/application-s3d-flow.js';
import { boulderGeo, boulderMat, boulder, reduceM } from '/assets/application-s3d-bldkit.js';
import { soilMat, sectionTex } from '/assets/application-s3d-wmkit.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';

/* earth: a layered, grainy soil texture with a bump map (fine particles, small stones, a few darker damp streaks) */
function soilP(seed, gravel = false, w = 1024, h = 512) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), r = rng(seed);
  g.fillStyle = gravel ? '#837f78' : '#675441'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { const y = r() * h, th = 6 + r() * 30; g.fillStyle = 'rgba(' + (r() < .5 ? '40,30,20' : '160,135,100') + ',' + (.05 + r() * .1) + ')'; g.fillRect(0, y, w, th); }   /* soil layers */
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(' + (60 + r() * 60 | 0) + ',' + (45 + r() * 45 | 0) + ',' + (30 + r() * 30 | 0) + ',' + (.1 + r() * .18) + ')'; g.beginPath(); g.ellipse(r() * w, r() * h, 18 + r() * 70, 10 + r() * 36, r() * 3, 0, 6.283); g.fill(); }
  for (let i = 0; i < 26000; i++) { const v = 55 + r() * 100 | 0; g.fillStyle = gravel ? 'rgba(' + v + ',' + v + ',' + (v - 4) + ',' + (.3 + r() * .5) + ')' : 'rgba(' + v + ',' + (v * .84 | 0) + ',' + (v * .64 | 0) + ',' + (.25 + r() * .5) + ')'; const q = .8 + r() * 2.6; g.fillRect(r() * w, r() * h, q, q * (.7 + r() * .6)); }
  for (let i = 0; i < (gravel ? 1500 : 160); i++) { const x = r() * w, y = r() * h, q = (gravel ? 3 : 2) + r() * (gravel ? 9 : 5), v = (gravel ? 70 : 85) + r() * 70 | 0; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + 1, y + 1.4, q, q * .8, 0, 0, 6.283); g.fill(); g.fillStyle = gravel ? 'rgb(' + v + ',' + v + ',' + (v - 5) + ')' : 'rgb(' + v + ',' + (v * .9 | 0) + ',' + (v * .76 | 0) + ')'; g.beginPath(); g.ellipse(x, y, q, q * .8, r() * 3, 0, 6.283); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 2.2, roughness: 1 });
}
const { M, mk, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const set = state.set || 'retain';
  const scene = new THREE.Scene(); studio(scene, { ext: 40, key: 2.2, shadow: .2, map: 3072 });
  const out = { scene, fov: 30, wide: true }; let T = 0; out.seek = v => { T = v; };
  const lab = (id, text, a, show, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: show || (() => true) });
  const stoneMat = boulderMat(); const o = new THREE.Object3D();
  const QS = realStones('quarry'), wallMat = realStoneMaterial({ tint: .46, bump: .05, floor: 0, gain: .9, contrast: .34, scale: .35, soft: 1.5, grain: .6, own: true }), toeMat = realStoneMaterial({ tint: .46, bump: .05, floor: 0, gain: .9, contrast: .34, scale: .35, soft: 1.5, grain: .6, own: true });
  const rock = (i, sx, sy, sz, mat) => { const m = new THREE.Mesh(QS[i % QS.length], mat); m.scale.set(sx, sy, sz); return m; };
  const go = st => st.play !== false && !reduceM();

  if (set === 'retain') {
    const D = 16, groups = {}, mats = [];
    const reg = (key, obj) => { (groups[key] = groups[key] || []).push(obj); obj.traverse(c => { if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => { if (!m.userData.reg) { m.userData.reg = true; m.transparent = true; mats.push([key, m]); } }); }); return obj; };
    const soilT = soilP(3); soilT.map.repeat.set(3, 1);
    const ground = mk(new THREE.BoxGeometry(40, 4, D), soilP(2)); ground.position.set(10, -2, 0); scene.add(ground);
    /* retained soil */
    const rsoil = new THREE.Mesh(new THREE.BoxGeometry(18, 8.4, D), soilT); rsoil.position.set(19.2, 5.2, 0); rsoil.castShadow = rsoil.receiveShadow = true; scene.add(reg('soil', rsoil));
    /* backfill and filter */
    const bk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 8.4, D), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshStandardMaterial(i === 4 ? { map: (() => { const m = soilP(7, true), t = m.map; t.repeat.set(1, 1); return t; })(), roughness: 1 } : { color: 0x7d7a73, roughness: 1 }))); bk.position.set(8.2, 5.2, 0); bk.castShadow = bk.receiveShadow = true; scene.add(reg('filter', bk));
    const fl = mk(new THREE.BoxGeometry(.22, 8.4, D + .1), new THREE.MeshStandardMaterial({ color: 0xe8f3ea, roughness: .9, emissive: 0x2e5d3b, emissiveIntensity: .25 })); fl.position.set(10.0, 5.2, 0); scene.add(reg('filter', fl));
    /* foundation bed and the stone structure */
    const fnd = new THREE.Mesh(new THREE.BoxGeometry(11, 1.2, D), new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 1 })); fnd.position.set(3.5, .6, 0); scene.add(reg('stone', fnd));
    for (let row = 0; row < 6; row++) for (let c = 0; c < 2; c++) for (let z = 0; z < 5; z++) { const m = rock(row * 7 + c * 3 + z, 1.4 + ((row + z) % 3) * .06, .62, 1.55, wallMat); m.rotation.y = ((row * 5 + z * 3 + c) % 7 - 3) * .035; m.castShadow = m.receiveShadow = true; m.position.set(2.2 + c * 2.7 + (row % 2 ? .6 : 0) + (row * .12), 1.9 + row * 1.2, -D / 2 + 1.7 + z * 3.15 + (row % 2 ? .5 : 0)); scene.add(reg('stone', m)); }
    /* toe */
    for (let i = 0; i < 4; i++) { const m = rock(i + 2, 1.3, .9, 1.35, toeMat); m.castShadow = m.receiveShadow = true; m.position.set(-3.6 - (i % 2) * 1.1, .8, -5 + i * 3.3); m.rotation.y = i; scene.add(reg('toe', m)); }
    /* drain: a perforated pipe in the backfill and a weep pipe through the wall to the outlet */
    const pipeM = new THREE.MeshStandardMaterial({ color: 0x3f6f96, roughness: .32, metalness: .05, envMapIntensity: 1.2 }); const pipe = mk(new THREE.CylinderGeometry(.5, .5, D - 1, 18), pipeM); pipe.rotation.x = Math.PI / 2; pipe.position.set(8.4, 2.2, 0); scene.add(reg('path', pipe));
    const weep = mk(new THREE.CylinderGeometry(.4, .4, 14, 16), pipeM); weep.rotation.z = Math.PI / 2; weep.position.set(1.2, 2.2, 3.4); scene.add(reg('outlet', weep));
    const outl = mk(new THREE.BoxGeometry(3, .4, 3), new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: .8 })); outl.position.set(-6.2, .2, 3.4); scene.add(reg('outlet', outl));
    /* forces: orange arrows */
    const arrows = new THREE.Group(); scene.add(arrows); const arrow = (from, dir, len, txt) => { const g = new THREE.Group(); g.position.copy(from); const sh = mk(new THREE.CylinderGeometry(.14, .14, len, 8), M.orange, { cast: false }); sh.position.y = len / 2; const hd = mk(new THREE.ConeGeometry(.4, .8, 12), M.orange, { cast: false }); hd.position.y = len + .4; g.add(sh, hd); g.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize()); arrows.add(g); return g; };
    arrow(new V3(10.6, 7, 6), new V3(-1, 0, 0), 4, 'p'); arrow(new V3(10.6, 4.5, 6), new V3(-1, 0, 0), 3, 'p'); arrow(new V3(3.5, -.4, 6.8), new V3(0, -1, 0), 2.4, 'b'); arrow(new V3(-1.5, 1.3, 7), new V3(1, 0, 0), 2.8, 's');
    const arc = mk(new THREE.TorusGeometry(2.6, .13, 8, 40, Math.PI * 1.3), M.orange, { cast: false }); arc.position.set(4.5, 10.5, 7.2); arc.rotation.set(0, 0, 0); arrows.add(arc); arrows.visible = false;
    /* water: instanced drops along a polyline from the retained soil, through the filter and backfill, to the pipe, along it and out */
    const PATH = [new V3(17, 9, 7.6), new V3(12, 7.4, 7.6), new V3(10, 5.6, 7.6), new V3(8.2, 3.4, 7.6), new V3(8.4, 2.4, 7.6), new V3(8.4, 2.2, 3.4), new V3(1.2, 2.2, 3.4), new V3(-6, 1.6, 3.4)];
    const N = 70, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(.2, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xbfe6f5, roughness: 0, metalness: 0, transparent: true, opacity: .72, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0 }), N); drops.frustumCulled = false; scene.add(drops);
    const lens = []; let tot = 0; for (let i = 1; i < PATH.length; i++) { const l = PATH[i].distanceTo(PATH[i - 1]); lens.push(l); tot += l; }
    const at = u => { let d = u * tot, k = 0; while (k < lens.length - 1 && d > lens[k]) { d -= lens[k]; k++; } return PATH[k].clone().lerp(PATH[k + 1], clamp(d / lens[k])); };
    out.views = { all: { az: -16, el: 14, dist: 46, t: [7, 4.6, 0] } }; out.limits = { az: [-55, 40], el: [4, 50], dist: [22, 80] };
    out.labels = [lab('stone', 'Stone structure', new V3(4, 7.8, D / 2), null, 'hot', 'l'), lab('foundation', 'Foundation bed', new V3(3.5, .6, D / 2 + .3), null, '', 'l'), lab('toe', 'Toe', new V3(-4.2, .6, D / 2 - 1), null, '', 'l'), lab('filter', 'Granular backfill and filter', new V3(9, 9.8, D / 2), null, '', 'r'), lab('soil', 'Retained soil', new V3(20, 10.4, D / 2), null, '', 'r'), lab('outlet', 'Drain outlet', new V3(-6, 2.4, 3.4), null, 'hot', 'l'), lab('path', 'Drainage path', new V3(8.4, 3.4, 7.6), st => st.water !== false, 'hot', 'r'),
      lab('f1', 'Retained soil pressure', new V3(13, 8, 6), st => !!st.forces, 'warn', 'r'), lab('f2', 'Sliding', new V3(-1.5, 3, 7), st => !!st.forces, 'warn', 'l'), lab('f3', 'Bearing', new V3(3.5, -1.8, 6.8), st => !!st.forces, 'warn', 'r'), lab('f4', 'Overturning and overall stability', new V3(4.5, 13.4, 7.2), st => !!st.forces, 'warn', 'r')];
    const cur = {}; mats.forEach(([k, m]) => { m.userData.o = 1; });
    out.seek = () => { mats.forEach(([k, m]) => { m.userData.o = 1e9; }); };
    out.update = (t, dt, st) => {
      if (go(st)) T += dt; const sel = st.sel && st.sel !== 'all' ? st.sel : null, kk = reduceM() ? 1 : 1 - Math.exp(-dt * 6); let mv = false;
      mats.forEach(([k, m]) => { const goal = !sel || sel === k || (sel === 'path' && k === 'path') ? 1 : .22; if (m.userData.o > 1e8) m.userData.o = goal; m.userData.o += (goal - m.userData.o) * kk; if (Math.abs(goal - m.userData.o) > .01) mv = true; m.opacity = m.userData.o; if (m.emissive && k === sel) m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, .35); });
      arrows.visible = !!st.forces; const showW = st.water !== false; drops.visible = showW;
      for (let i = 0; i < N; i++) { const uu = ((T * .09) + i / N) % 1, p = at(uu); o.position.copy(p); o.scale.setScalar((sel === 'path' || sel === 'outlet' ? 1.3 : 1) * Math.max(.001, loopEnv(uu, .015, .02))); o.updateMatrix(); drops.setMatrixAt(i, o.matrix); } drops.instanceMatrix.needsUpdate = true;
      return mv || (showW && go(st)) || !!st.forces;
    };
    return out;
  }

  /* pitch */
  const ground = mk(new THREE.BoxGeometry(80, 3, 22), soilMat(4)); ground.position.set(0, -1.5, 0); scene.add(ground);
  const wat = mk(new THREE.BoxGeometry(26, 2.2, 21.6), new THREE.MeshPhysicalMaterial({ color: 0x6fc0e6, roughness: .08, transparent: true, opacity: .45, depthWrite: false }), { cast: false }); wat.position.set(-24, 1, 0); scene.add(wat);
  /* slope: a wedge from the water edge up to the right */
  const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(20, 0); ws.lineTo(20, 10); ws.closePath(); const wg = new THREE.ExtrudeGeometry(ws, { depth: 22, bevelEnabled: false }); const wedge = new THREE.Mesh(wg, soilMat(6)); wedge.position.set(-11, 0, -11); wedge.receiveShadow = true; scene.add(wedge);
  const ang = Math.atan2(10, 20), len = Math.hypot(20, 10);
  const filt = mk(new THREE.BoxGeometry(len, .22, 21.8), new THREE.MeshStandardMaterial({ color: 0xe8f3ea, roughness: .9 })); filt.position.set(-11 + len / 2 * Math.cos(ang) - .1 * Math.sin(ang), len / 2 * Math.sin(ang) + .1 * Math.cos(ang), 0); filt.rotation.z = ang; scene.add(filt);
  const slope = new THREE.Group(); slope.position.set(-11, 0, 0); slope.rotation.z = ang; scene.add(slope); const rr = rng(21);
  for (let row = 0; row < 9; row++) for (let z = 0; z < 6; z++) { const m = new THREE.Mesh(boulderGeo(700 + row * 7 + z, .95, .36, 1.35, 'block', 2), stoneMat); m.castShadow = m.receiveShadow = true; m.position.set(1.4 + row * 2.1, .55, -9 + z * 3.4 + (row % 2 ? 1.5 : 0)); m.rotation.y = (rr() - .5) * .15; slope.add(m); }
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(boulderGeo(800 + i, 1.3, .9, 1.4, 'nat', 3), stoneMat); m.castShadow = true; m.position.set(-12.2 + (i % 2) * .8, .9, -9 + i * 3.6); m.rotation.y = i; scene.add(m); }
  const flat = new THREE.Group(); flat.position.set(-3, 0, 0); scene.add(flat); const pad = mk(new THREE.BoxGeometry(14, .4, 18), new THREE.MeshStandardMaterial({ color: 0xb9a07e, roughness: 1 })); pad.position.set(30, .2, 0); scene.add(pad);
  for (let i = 0; i < 12; i++) { const s = .9 + rr() * 1.1, m = new THREE.Mesh(boulderGeo(900 + i, s * 1.1, s * .72, s * .85, 'nat', 3), stoneMat); m.castShadow = true; m.position.set(26 + (rr() - .5) * 9, s * .5 + (i > 7 ? 1.2 : 0) + .4, (rr() - .5) * 12); m.rotation.set(rr() * 6, rr() * 6, rr() * 6); scene.add(m); }
  out.views = { all: { az: -14, el: 17, dist: 78, t: [2, 4, 0] } }; out.limits = { az: [-60, 40], el: [4, 55], dist: [30, 120] };
  out.labels = [lab('a', 'Stone pitching on a slope', new V3(-4, 7.6, 10), null, 'hot', 'r'), lab('b', 'Filter layer beneath', new V3(-6, 3.6, 11), null, '', 'l'), lab('c', 'Toe protection', new V3(-12, 2.2, 10), null, '', 'l'), lab('d', 'Water at the slope', new V3(-26, 3, 0), null, '', 'r'), lab('e', 'Construction stone placed for site works', new V3(26, 5.8, 0), null, 'warn', 'r'), lab('f', 'Not automatically interchangeable', new V3(10, 11.5, 0), null, 'warn', 'r')];
  out.update = () => false;
  return out;
}
