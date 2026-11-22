/* scene: random dumping against controlled rockfill, one continuous loop (Construction Boulders, Scene 13).
   Left pad: large stones are tipped on at random. They land where they land, lean on each other and leave big voids and an uneven top; nothing is done after that.
   Right pad: the same kind of stone is placed course by course, smaller fragments are spread into the surface voids, then a roller passes and the layer settles to an even,
   compacted surface. Photographic stone (assets/s3dstone) on angular shapes. Generic, not a method statement: real work follows the approved project method. 1 unit = 1 m. */
import { THREE, L, studio, rng, noiseTex } from '/assets/application-s3d.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
const { mk, clamp, lerp } = L;
const V3 = THREE.Vector3;
const LOOP = 40, SW = 15, SD = 10;                  /* seconds per loop, pad width and depth (m) */
const ease = t => t * t * (3 - 2 * t), easeIn = t => t * t, easeOut = t => 1 - (1 - t) * (1 - t);
const win = (u, a, b) => clamp((u - a) / (b - a));  /* 0..1 as u runs from a to b */

export default function build() {
  const scene = new THREE.Scene(); studio(scene, { ext: 20, key: 2.3, shadow: .27, map: 3072, y: .01 });
  const out = { scene, fov: 28, wide: true };
  const XL = -9.2, XR = 9.2;

  /* two earth pads */
  const soil = noiseTex(256, 256, '#a38e6e', ['#8a7657', '#bba98a', '#74634a', '#c9b99b'], 5, 9000, 1.6); soil.repeat.set(4, 3);
  const padM = new THREE.MeshStandardMaterial({ map: soil, roughness: 1 });
  [XL, XR].forEach(x => { const p = mk(new THREE.BoxGeometry(SW + 1.2, .5, SD + 1.2), padM); p.position.set(x, -.25, 0); scene.add(p); });

  /* stone sets: one InstancedMesh per shape, every stone a tracked transform */
  const Q = realStones('quarry'), Ch = realStones('low');
  const big = realStoneMaterial({ tint: .46, bump: .05, floor: 0, gain: .9, contrast: .34, scale: .35, soft: 1.5, grain: .6, own: true });
  const chipM = realStoneMaterial({ tint: .5, bump: .03, floor: 0, gain: .9, contrast: .34, scale: .6, soft: 1.5, grain: .6, own: true });
  const set = (geos, mat, n, shadow) => {
    const per = geos.map(() => 0), pick = Array.from({ length: n }, (_, i) => i % geos.length); pick.forEach(g => per[g]++);
    const ims = geos.map((g, k) => { const im = new THREE.InstancedMesh(g, mat, Math.max(1, per[k])); im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; });
    const slot = geos.map(() => 0); const ref = pick.map(g => ({ im: ims[g], i: slot[g]++ }));
    return { ims, ref };
  };
  const r = rng(17), o = new THREE.Object3D(), col = new THREE.Color();
  const tintAll = (st) => { st.ref.forEach(({ im, i }) => im.setColorAt(i, col.setScalar(.75 + r() * .5))); st.ims.forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true; }); };

  /* left pad: stones tipped at random. Each lands on whatever is below it (a rough height field), so the pile has voids and an uneven top */
  const NL = 26, left = [], hf = []; const L0 = set(Q, big, NL, true); tintAll(L0);
  for (let i = 0; i < NL; i++) {
    const sz = .85 + r() * 1.05, x = (r() - .5) * (SW - 2.6), z = (r() - .5) * (SD - 2.6);
    let top = 0; hf.forEach(h => { const d = Math.hypot(x - h.x, z - h.z), rr = (sz + h.sz) * .62; if (d < rr) top = Math.max(top, h.y + h.sz * .62 * Math.sqrt(1 - (d / rr) * (d / rr)) * 1.1); });
    const y = top + sz * .5; hf.push({ x, z, y, sz });
    left.push({ x, y, z, sz, t0: 2 + i * .42 + r() * .2, from: new V3(-SW / 2 - 3, 8 + r() * 3, (r() - .5) * 3), rot: [r() * 6.28, r() * 6.28, r() * 6.28], sx: .95 + r() * .3, sy: .72 + r() * .22, sp: [(r() - .5) * 5, (r() - .5) * 5] });
  }
  /* right pad: two even courses */
  const COLS = 5, ROWS = 4, NC = COLS * ROWS * 2, right = [], R0 = set(Q, big, NC, true); tintAll(R0);
  for (let c = 0; c < 2; c++) for (let a = 0; a < COLS; a++) for (let b = 0; b < ROWS; b++) {
    const sz = 1.08 + r() * .14, x = -SW / 2 + 1.7 + a * (SW - 3.4) / (COLS - 1) + (b % 2 ? .75 : 0) * (1 - c * 2) * .6, z = -SD / 2 + 1.7 + b * (SD - 3.4) / (ROWS - 1);
    right.push({ x, y: .5 + sz * .22 + c * .98, z, sz, t0: 3 + (c * COLS * ROWS + a * ROWS + b) * .22, from: new V3(x + 1.2, 6.5 + c, z), rot: [(r() - .5) * .3, r() * 6.28, (r() - .5) * .3], sx: .95 + r() * .15, sy: .62 + r() * .08, c });
  }
  /* smaller fragments that are spread into the voids of the upper course */
  const NF = 160, frag = [], F0 = set(Ch, chipM, NF, false); tintAll(F0);
  for (let i = 0; i < NF; i++) { const sz = .12 + r() * .13; frag.push({ x: -SW / 2 + .8 + r() * (SW - 1.6), z: -SD / 2 + .8 + r() * (SD - 1.6), y: 1.2 + sz * .4 + r() * .35, sz, t0: 15.5 + i * .028 + r() * .3, rot: [r() * 6, r() * 6, r() * 6] }); }

  /* the roller: a smooth steel drum that rolls (turns about its own axle, along the pad) in a yellow frame with a canopy */
  const roller = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0xb4b9c0, metalness: .9, roughness: .3 }), yel = new THREE.MeshStandardMaterial({ color: 0xe0a000, roughness: .5, metalness: .1 }), blk = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: .6, metalness: .3 });
  const RD = 1.15, DL = SD + .6, dg = new THREE.CylinderGeometry(RD, RD, DL, 56); dg.rotateX(Math.PI / 2);                      /* axle along z */
  const drum = mk(dg, steel); roller.add(drum);
  for (const k of [-3, 3]) { const rib = mk(new THREE.CylinderGeometry(RD + .02, RD + .02, .06, 56), blk); rib.geometry.rotateX(Math.PI / 2); rib.position.z = k * (DL / 7.5); drum.add(rib); }   /* fine bands, so the spin reads */
  [-1, 1].forEach(s => { const a = mk(new THREE.BoxGeometry(.34, 2.0, .32), yel); a.position.set(0, .9, s * (DL / 2 + .22)); roller.add(a); const hub = mk(new THREE.CylinderGeometry(.34, .34, .36, 24), blk); hub.rotation.x = Math.PI / 2; hub.position.set(0, 0, s * (DL / 2 + .22)); roller.add(hub); });
  const bar = mk(new THREE.BoxGeometry(2.1, .5, 2.2), yel); bar.position.set(.05, 1.95, 0); roller.add(bar); const beam = mk(new THREE.BoxGeometry(.5, .45, DL + .9), yel); beam.position.set(0, 1.95, 0); roller.add(beam);
  const hood = mk(new THREE.BoxGeometry(1.5, .9, 1.7), yel); hood.position.set(-.45, 2.45, 0); roller.add(hood);
  const seat = mk(new THREE.BoxGeometry(.7, .35, .8), blk); seat.position.set(.5, 2.35, 0); roller.add(seat);
  [[.85, -.4], [.85, .4], [.15, -.4], [.15, .4]].forEach(([x, z]) => { const p = mk(new THREE.BoxGeometry(.08, 1.4, .08), blk); p.position.set(x, 3.0, z); roller.add(p); });
  const roof = mk(new THREE.BoxGeometry(1.1, .08, 1.0), yel); roof.position.set(.5, 3.72, 0); roller.add(roof);
  roller.visible = false; scene.add(roller);

  out.views = { all: { az: -8, el: 26, dist: 52, t: [0, 1.0, 0] } }; out.limits = { az: [-55, 55], el: [6, 55], dist: [18, 80] };
  const lab = (id, text, a, tone) => ({ id, text, side: 'r', tone, anchor: a, show: () => true });
  out.labels = [lab('a', 'Random dumping: stones tipped on, large voids, uneven top', new V3(XL, 4.4, 0), 'warn'), lab('b', 'Controlled rockfill: stones placed in even courses', new V3(XR, 3.2, -SD / 2 + .5), 'hot'),
    lab('v', 'Large voids between the stones', new V3(XL + 3.6, 1.5, 3.6), 'warn'), lab('f', 'Smaller fragments spread into the surface voids', new V3(XR + 4, 1.4, 3.4), ''), lab('r', 'Roller compacting the layer', new V3(XR, 3.9, SD / 2 + .6), '')];

  let T = 0;
  out.update = (t, dt) => {
    const go = !reduceM(); if (go) T += dt; const s = go ? T % LOOP : 30, u = s;
    const fade = 1 - ease(win(s, 36.2, 39.4));                          /* everything shrinks away at the end of the loop */
    /* compaction: the roller crosses twice (from 22 s), the layer settles with it */
    const rA = win(s, 21, 25.5), rB = win(s, 26, 30.5), pass = rA < 1 ? rA : rB, rolling = s > 21 && s < 30.8 && rB < 1;
    const settle = ease(win(s, 22.5, 30.5));
    roller.visible = rolling && fade > .5; if (roller.visible) { const k = rA < 1 ? rA : 1 - rB; const dist = k * (SW + 2), buzz = Math.sin(s * 55) * .012 * (1 - settle * .5); roller.position.set(XR - SW / 2 - 1 + dist, 3.18 - .38 * settle + buzz, 0); drum.rotation.z = -dist / RD; }
    const apply = (list, st, onDraw, ox = 0) => {
      list.forEach((p, n) => {
        const { im, i } = st.ref[n], k = clamp((s - p.t0) / (p.fall || .62)), vis = (s >= p.t0 ? 1 : 0) * fade;
        const g = easeIn(k); let x = p.x, y = p.y, z = p.z;
        if (p.from) { x = lerp(p.from.x, p.x, easeOut(k)); z = lerp(p.from.z, p.z, k); y = lerp(p.from.y, p.y, g); }
        if (onDraw) [x, y, z] = onDraw(p, x, y, z, k);
        const bounce = k >= 1 ? Math.abs(Math.sin((s - p.t0 - (p.fall || .62)) * 11)) * .22 * Math.exp(-(s - p.t0 - (p.fall || .62)) * 5) * (p.sz || 1) : 0;
        o.position.set(x + ox, y + bounce, z); const sp = k < 1 && p.sp ? (1 - k) : 0; o.rotation.set(p.rot[0] + (p.sp ? sp * p.sp[0] : 0), p.rot[1] + (p.sp ? sp * p.sp[1] : 0), p.rot[2]);
        const sz = p.sz * vis + .0001; o.scale.set(sz * (p.sx || 1), sz * (p.sy || .8), sz * (p.sx || 1)); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      });
      st.ims.forEach(im => { im.instanceMatrix.needsUpdate = true; });
    };
    apply(left, L0, null, XL);
    apply(right, R0, (p, x, y, z, k) => [x, p.y - settle * (.1 + .09 * (p.c + 1)) * (p.c ? 1.4 : 1), z], XR);
    apply(frag.map(f => ({ ...f, from: new V3(f.x + .3, 4.2, f.z), fall: .55 })), F0, (p, x, y, z, k) => [x, y - settle * .24 * (y > 1 ? 1 : 0), z], XR);
    return go;
  };
  return out;
}
