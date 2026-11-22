/* scene: three foundation situations in one excavation: (A) granular foundation fill, (B) a structural reinforced foundation, (C) a mass-concrete placement.
   spacing, cover and sizes are examples, not a design. Large aggregate in structural members needs explicit engineering approval. */
import { THREE, L, studio, rng, noiseTex } from '/assets/application-s3d.js';
const { M, STONES, mk, put, stone, clamp, sm, lerp, TAU } = L;
const V3 = THREE.Vector3;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 12, key: 2.2, shadow: .2, y: -1.15 });
  const soilTex = noiseTex(512, 512, '#8d5c3c', ['#6d432b', '#a9724c', '#59391f', '#c58d5f', '#7a4d33'], 21, 9000, 3); soilTex.repeat.set(3, 2);
  const soilM = new THREE.MeshStandardMaterial({ map: soilTex, roughness: 1 }), soilTop = new THREE.MeshStandardMaterial({ map: soilTex, roughness: 1, color: 0xd9c4ae });
  const PW = 10.6, PL = 6.4, PD = 4.4;
  const sb = (x0, x1, y0, y1) => { const m = mk(new THREE.BoxGeometry(x1 - x0, y1 - y0, PL + .6), [soilM, soilM, soilTop, soilM, soilM, soilM]); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); scene.add(m); };
  sb(-PW / 2 - 4.2, -PW / 2, -1.1, PD); sb(PW / 2, PW / 2 + 4.2, -1.1, PD); sb(-PW / 2, PW / 2, -1.1, 0);
  const concM = new THREE.MeshStandardMaterial({ color: 0xbcbab5, roughness: .92 });
  const concGlass = new THREE.MeshPhysicalMaterial({ color: 0xc4c2bd, roughness: .8, transparent: true, opacity: .34, depthWrite: false, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: 0x6b4a38, roughness: .55, metalness: .55 });
  const orange = new THREE.LineBasicMaterial({ color: 0xff5e29, transparent: true, opacity: .85 });
  const edges = (w, h, d) => new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), orange);

  /* A — granular layer + blinding + ghost of the structural foundation above */
  const gA = new THREE.Group(); scene.add(gA); const fillTop = 1.3;
  const r = rng(5), geoms = [STONES[1], STONES[4], STONES[7]], per = 3, ims = geoms.map(g => new THREE.InstancedMesh(g, M.stone, 420)), cnt = [0, 0, 0], o = new THREE.Object3D();
  for (let ly = 0; ly < 4; ly++) for (let ix = 0; ix < 20; ix++) for (let iz = 0; iz < 13; iz++) {
    const rad = .28 + r() * .1, x = -PW / 2 + .4 + ix * (PW - .8) / 19 + (r() - .5) * .25 + (ly % 2 ? .16 : 0), z = -PL / 2 + .4 + iz * (PL - .8) / 12 + (r() - .5) * .25, y = .3 + ly * .34 + (r() - .5) * .06, k = (r() * 3) | 0;
    if (cnt[k] >= 420 || x > PW / 2 - .25) continue; o.position.set(x, y, z); o.scale.set(rad * (.9 + r() * .2), rad * .85, rad * 1.05); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); ims[k].setMatrixAt(cnt[k]++, o.matrix);
  }
  ims.forEach((im, i) => { im.count = cnt[i]; im.castShadow = im.receiveShadow = true; im.frustumCulled = false; gA.add(im); });
  const blind = mk(new THREE.BoxGeometry(6.2, .22, PL - 2.4), concM); blind.position.set(0, fillTop + .1, 0); gA.add(blind);
  const ghostA = edges(6.4, 1.7, PL - 2.2); ghostA.position.set(0, fillTop + .3 + .85, 0); gA.add(ghostA);
  const layerEdge = edges(PW - .05, fillTop, PL - .05); layerEdge.position.set(0, fillTop / 2, 0); gA.add(layerEdge);

  /* B — reinforced footing with its cage; a 60 mm stone shown at scale next to the bars */
  const gB = new THREE.Group(); scene.add(gB); const by = .35, FH = 1.7, FW = 6.4, FL = PL - 2.2;
  const blindB = mk(new THREE.BoxGeometry(7, by, PL - 1.6), concM); blindB.position.set(0, by / 2, 0); gB.add(blindB);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(FW, FH, FL), concGlass); foot.position.set(0, by + FH / 2, 0); gB.add(foot);
  const bar = (len, rad) => new THREE.CylinderGeometry(rad, rad, len, 10);
  for (let i = 0; i < 7; i++) { const m = mk(bar(FW - .7, .07), steel); m.rotation.z = Math.PI / 2; m.position.set(0, by + .36, -FL / 2 + .5 + i * (FL - 1) / 6); gB.add(m); }
  for (let i = 0; i < 9; i++) { const m = mk(bar(FL - .7, .07), steel); m.rotation.x = Math.PI / 2; m.position.set(-FW / 2 + .5 + i * (FW - 1) / 8, by + .5, 0); gB.add(m); }
  for (let i = 0; i < 9; i++) { const m = mk(bar(FL - .7, .07), steel); m.rotation.x = Math.PI / 2; m.position.set(-FW / 2 + .5 + i * (FW - 1) / 8, by + FH - .35, 0); gB.add(m); }
  for (let i = 0; i < 7; i++) { const m = mk(bar(FW - .7, .07), steel); m.rotation.z = Math.PI / 2; m.position.set(0, by + FH - .5, -FL / 2 + .5 + i * (FL - 1) / 6); gB.add(m); }
  [[-.75, -.75], [.75, -.75], [-.75, .75], [.75, .75], [0, -.75], [0, .75], [-.75, 0], [.75, 0]].forEach(([x, z]) => { const m = mk(bar(3.3, .08), steel); m.position.set(x, by + .5 + 1.65, z); gB.add(m); });
  [by + FH + .5, by + FH + 1.3, by + FH + 2.1].forEach(y => { const f = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, .04, 1.6)), new THREE.LineBasicMaterial({ color: 0x6b4a38 })); f.position.set(0, y, 0); gB.add(f); });
  const ghostSt = stone(rng(9), .33); ghostSt.position.set(FW / 2 + .25, by + FH + .55, FL / 2 - .5); gB.add(ghostSt);
  const bracketB = new THREE.Group(); gB.add(bracketB); const bmat = new THREE.MeshBasicMaterial({ color: 0xff5e29 });
  const gapLine = new THREE.Mesh(new THREE.BoxGeometry(.04, .04, FL / 6 - .14), bmat); gapLine.position.set(FW / 2 - .5, by + .5 + .09, -FL / 2 + .5 + (FL - 1) / 12 + (FL - 1) / 6); bracketB.add(gapLine);

  /* C — mass-concrete block with large stones visible through it */
  const gC = new THREE.Group(); scene.add(gC); const CW = 7.2, CH = 3.0, CL = PL - 1.6;
  const blk = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CL), concGlass); blk.position.set(0, by + CH / 2, 0); gC.add(blk);
  const rc = rng(31), pcs = [];
  for (let i = 0, tries = 0; i < 64 && tries < 900; tries++) {
    const big = rc() < .38, rad = big ? .48 + rc() * .3 : .24 + rc() * .2, x = (rc() - .5) * (CW - 1.1), y = by + .5 + rc() * (CH - 1), z = (rc() - .5) * (CL - 1.1);
    if (pcs.some(p => Math.hypot(p[0] - x, p[1] - y, p[2] - z) < (p[3] + rad) * 1.12)) continue; pcs.push([x, y, z, rad]);
    const s = stone(rc, rad); s.position.set(x, y, z); gC.add(s); i++;
  }
  gC.add((() => { const e = edges(CW, CH, CL); e.position.set(0, by + CH / 2, 0); return e; })());
  const blindC = mk(new THREE.BoxGeometry(7.6, by, CL + .4), concM); blindC.position.set(0, by / 2, 0); gC.add(blindC);

  const views = { A: { az: -26, el: 24, dist: 25, t: [0, 1.4, 0] }, B: { az: -22, el: 24, dist: 19.5, t: [.3, 2.4, 0] }, C: { az: -24, el: 24, dist: 23, t: [0, 2.2, 0] } };
  const amt = { A: 1, B: 0, C: 0 };
  const L_ = (id, text, side, a, on, tone) => ({ id, text, side, tone, anchor: a, show: s => on.includes(s.view) });
  const labels = [
    L_('fill', 'GRANULAR FOUNDATION FILL', 'r', new V3(3.2, .7, PL / 2), ['A']),
    L_('ground', 'PREPARED GROUND', 'r', new V3(4.2, -.05, PL / 2 + .2), ['A', 'B', 'C']),
    L_('ghost', 'STRUCTURAL FOUNDATION · OUTLINE', 'r', new V3(1.6, 3.0, FL / 2 - .3), ['A']),
    L_('cage', 'REINFORCEMENT CAGE', 'l', new V3(-FW / 2 + .2, by + 1.3, FL / 2), ['B']),
    L_('gap', 'CLEAR BAR SPACING', 'r', new V3(FW / 2 - .5, by + .6, 0), ['B']),
    L_('stone60', '60 mm STONE · AT SCALE', 'r', new V3(FW / 2 + .3, by + FH + 1.15, FL / 2 - .5), ['B'], 'warn'),
    L_('block', 'MASS-CONCRETE BLOCK', 'l', new V3(-CW / 2 + .1, by + CH + .1, CL / 2), ['C']),
    L_('big', 'LARGE AGGREGATE FRACTIONS', 'r', new V3(CW / 2 - .3, by + .55, CL / 2 - .2), ['C']),
  ];
  return {
    scene, views, fov: 30, labels, limits: { az: [-70, 70], el: [4, 60], dist: [8, 36] },
    update(t, dt, st) {
      const k = reduce() ? 1 : 1 - Math.exp(-dt * 4.5); let moving = false;
      for (const s of ['A', 'B', 'C']) { const tgt = st.view === s ? 1 : 0; const d = tgt - amt[s]; if (Math.abs(d) > .002) { amt[s] += d * k; moving = true; } else amt[s] = tgt; }
      gA.visible = amt.A > .01; gB.visible = amt.B > .01; gC.visible = amt.C > .01;
      gA.scale.y = Math.max(.001, sm(amt.A)); gB.scale.y = Math.max(.001, sm(amt.B)); gC.scale.y = Math.max(.001, sm(amt.C));
      return moving;
    },
  };
}
