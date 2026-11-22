/* scene: handling construction boulders, in three views of one generic work area.
   lift  : a tracked excavator with a grapple picks a stone from a stockpile (close view).
   load  : the same excavator swings the stone and sets it on a tipper (wide view), with the exclusion zone drawn on the ground.
   place : at the site a tipper has unloaded and the excavator sets a stone into a prepared formation.
   The machine is a Blender model (assets/application-s3d-grapple.js, wearing the OM GROUP mark); the stones are photographic stone on angular 3D shapes.
   Generic machine, safe sequences only (no suspended loads over people, no unsafe tipping). No weight, rated capacity or lift
   plan is shown: the contractor assesses the actual load, equipment and ground. 1 unit = 1 m. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { reduceM } from '/assets/application-s3d-bldkit.js';
import { spotter } from '/assets/application-s3d-spotter.js';
import { tipperTruck } from '/assets/application-s3d-tipper.js';
import { realStones, realStoneMaterial } from '/assets/s3dstone/real-stone.js';
import { excavator, solve, K } from '/assets/application-s3d-grapple.js';
const { mk, clamp, sm, lerp } = L;
const V3 = THREE.Vector3;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 26, key: 2.3, shadow: .24, map: 3072 });
  const out = { scene, fov: 30, wide: true };
  const ground = mk(new THREE.BoxGeometry(120, .4, 70), new THREE.MeshStandardMaterial({ color: 0xd8c3a4, roughness: 1 })); ground.position.y = -.2; scene.add(ground);
  const ex = excavator(); scene.add(ex.g);
  /* photographic stones */
  const BG = realStones('rock'), RM = realStoneMaterial({ tint: .52, bump: .02, floor: 0, gain: .9, contrast: .6, scale: 1.1 });
  const stone = (i, s, sy = 1) => { const m = new THREE.Mesh(BG[i % BG.length], RM); m.castShadow = m.receiveShadow = true; m.scale.set(s, s * sy, s); m.geometry.computeBoundingBox(); return m; };
  const RP = 7.6, RT = 8.6, ZR = 9.8;                    /* stockpile radius, tipper radius, exclusion zone radius (from the swing axis) */
  /* the stockpile: a ground layer, a second layer and the stone the grapple takes, a little gravel around it */
  const pile = new THREE.Group(); pile.position.set(RP, 0, 0); scene.add(pile); const r = rng(5);
  [[-1.5, -.2, .8, .62], [-.6, 1.5, .82, .6], [.9, 1.35, .84, .64], [1.7, .1, .72, .6], [1.1, -1.4, .78, .58], [-.9, -1.5, .74, .6], [-1.9, -1.2, .66, .55], [0, 0, .95, .66]]
    .forEach(([x, z, s, h], i) => { const m = stone(i + 1, s * .82, .78); m.position.set(x, h * .76, z); m.rotation.set(r() * .5, r() * 6, r() * .5); pile.add(m); });
  [[-.6, .5, .6], [.7, -.3, .62], [.1, 1.0, .56], [-.2, -.8, .6]].forEach(([x, z, s], i) => { const m = stone(i + 3, s, .82); m.position.set(x, 1.0 + (i % 2) * .08, z); m.rotation.set(r() * .5, r() * 6, r() * .5); pile.add(m); });
  /* gravel */
  { const gv = new THREE.InstancedMesh(realStones('low')[0], RM, 38), o = new THREE.Object3D(); gv.castShadow = true; gv.receiveShadow = true;
    for (let i = 0; i < 38; i++) { const a = r() * 6.283, d = 2.0 + Math.pow(r(), 1.6) * 1.9, s = .04 + r() * .09; o.position.set(Math.cos(a) * d, s * .5, Math.sin(a) * d); o.scale.set(s, s * .7, s); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); gv.setMatrixAt(i, o.matrix); }
    pile.add(gv); }
  /* the stone the grapple carries: the same shape as the stone on top of the pile, so the swap is invisible; it is fitted to the jaws (1.5 m between the tines) */
  const carryGeo = BG[2]; carryGeo.computeBoundingBox(); const cbb = carryGeo.boundingBox, cs = 1.46 / (cbb.max.x - cbb.min.x);
  const carry = stone(2, cs); carry.rotation.y = .35; ex.gr.add(carry); carry.position.set(0, -K.HG + .45 - (cbb.min.y + cbb.max.y) / 2 * cs, 0);
  const pick = stone(2, cs); pick.rotation.y = .35; pile.add(pick); pick.position.set(0, 1.0 + .45 - (cbb.min.y + cbb.max.y) / 2 * cs, 0);
  const tp = tipperTruck(); scene.add(tp.g);
  const zone = mk(new THREE.RingGeometry(ZR, ZR + .35, 90), new THREE.MeshBasicMaterial({ color: 0xff5e29, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }), { cast: false }); zone.rotation.x = -Math.PI / 2; zone.position.y = .06; scene.add(zone);
  const zoneFill = mk(new THREE.CircleGeometry(ZR, 90), new THREE.MeshBasicMaterial({ color: 0xff5e29, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false }), { cast: false }); zoneFill.rotation.x = -Math.PI / 2; zoneFill.position.y = .05; scene.add(zoneFill);
  const sp = spotter(), pr = sp.g; scene.add(pr);
  /* the site formation for the place view: a prepared bed with a few stones set already */
  const site = new THREE.Group(); scene.add(site); const bed = mk(new THREE.BoxGeometry(5.2, .12, 4.4), new THREE.MeshStandardMaterial({ color: 0x9a7a55, roughness: 1 })); bed.position.set(0, .06, 0); site.add(bed);
  const SET = []; for (let i = 0; i < 6; i++) { const m = stone(i + 8, .62 + r() * .14, .78); m.position.set(-1.7 + (i % 3) * 1.45, .5, -1.0 + (i / 3 | 0) * 1.7); m.rotation.set(0, r() * 6, 0); site.add(m); SET.push(m); }
  const placed = stone(2, cs * .9); placed.rotation.y = .35; site.add(placed);

  const world = (yaw, rr) => new V3(Math.cos(yaw) * rr, 0, -Math.sin(yaw) * rr);
  const YAW_S = -.5, SLOT = [1.5, .35], siteW = world(YAW_S, 6.9); site.position.copy(siteW); const slotW = siteW.clone().add(new V3(SLOT[0], 0, SLOT[1])); const YAW_D = .62;   /* the formation (front right), the delivered stones (behind right) */
  const solveTip = (tx, ty) => solve(tx, ty);
  out.views = { lift: { az: -24, el: 14, dist: 24, t: [3.9, 2.6, .6] }, load: { az: -24, el: 24, dist: 33, t: [1.4, 1.2, 1.6] }, place: { az: -22, el: 22, dist: 31, t: [4.0, 1.2, 2.8] } };
  out.limits = { az: [-75, 60], el: [5, 55], dist: [10, 70] };
  const lab = (id, text, a, vs, tone, side = 'r') => ({ id, text, side, tone, anchor: a, show: st => vs.includes(st.view || 'load') });
  const YAW_P = 0, YAW_T = 1.5; const pileW = world(YAW_P, RP), tipW = world(YAW_T, RT);
  out.labels = [
    lab('g', 'Grapple: attachment suited to the load', () => ex.head.getWorldPosition(new V3()).add(new V3(0, .1, 0)), ['lift', 'load', 'place'], 'hot'), lab('s', 'Stockpile of selected stones', pileW.clone().add(new V3(0, .2, 2.3)), ['lift', 'load'], '', 'r'),
    lab('z', 'Exclusion zone: no one inside while a stone is lifted', st => st.view === 'place' ? new V3(-7.8, .4, 5.6) : new V3(-ZR + .4, .4, -3.2), ['load', 'place'], 'warn', 'r'), lab('t', 'Tipper, loaded on stable ground', tipW.clone().add(new V3(0, 3.6, 0)), ['load'], '', 'r'), lab('p', 'A spotter outside the zone', () => pr.position.clone().add(new V3(0, 2.05, 0)), ['load', 'place'], '', 'r'),
    lab('f', 'Prepared formation: stones set to the approved method', () => siteW.clone().add(new V3(-.6, .9, 1.4)), ['place'], 'hot', 'r'), lab('c', 'Rated capacity, attachment and ground are assessed first', new V3(-6.2, .3, 3.6), ['lift', 'load', 'place'], 'warn', 'r')];
  const prevTip = new V3(); let T = 0; out.seek = v => { T = v; }; const cur = { v: '' };
  out.update = (t, dt, st) => {
    const vw = st.view || 'load', go = st.play !== false && !reduceM(); if (go) T += dt; const u = go ? (T * .06) % 1 : .5;
    pile.visible = true; site.visible = vw === 'place'; tp.g.visible = vw !== 'lift'; zone.visible = zoneFill.visible = vw !== 'lift';
    let yaw = 0, rr = RP, hy = 1, open = 1, hold = false;
    const HP = 1.0, place = vw === 'place', yA = place ? YAW_D : YAW_P, rA = RP;                /* the tip height at the pile: the tines meet the top stone */
    const yB = place ? YAW_S : YAW_T, rB = place ? Math.hypot(slotW.x, slotW.z) : RT - .4, HB = place ? .28 : 3.5;
    pile.position.copy(world(yA, RP)); placed.visible = false;
    if (place) { tp.g.position.copy(world(2.05, 12.5)); tp.g.rotation.y = Math.PI * 1.5 - 2.05; tp.tilt(.5); tp.fill(0); }
    else { tp.g.position.set(tipW.x, 0, tipW.z); tp.g.rotation.y = Math.PI * 1.5 - YAW_T; tp.tilt(0); tp.fill(vw === 'lift' ? .3 : .3 + .7 * clamp((u - .6) * 3)); }
    const ph = u;
    if (ph < .2) { yaw = yA; rr = rA; hy = lerp(3.6, HP, sm(ph / .2)); open = 1; hold = false; }
    else if (ph < .3) { yaw = yA; rr = rA; hy = HP; open = 1 - sm((ph - .2) / .1); hold = ph > .26; }
    else if (ph < .45) { yaw = yA; rr = lerp(rA, 6.5, sm((ph - .3) / .15)); hy = lerp(HP, 4.4, sm((ph - .3) / .15)); open = 0; hold = true; }
    else if (ph < .72) { const k = sm((ph - .45) / .27); yaw = lerp(yA, yB, k); rr = lerp(6.5, rB, k); hy = 4.4; open = 0; hold = true; }
    else if (ph < .88) { const k = sm((ph - .72) / .16); yaw = yB; rr = rB; hy = lerp(4.4, HB, k); open = k > .85 ? 1 : 0; hold = k < .85; }
    else if (ph < .93) { yaw = yB; rr = rB; hy = lerp(HB, 4.4, sm((ph - .88) / .05)); open = 1; hold = false; }
    else { const k = sm((ph - .93) / .07); yaw = lerp(yB, yA, k); rr = lerp(rB, rA, k); hy = lerp(4.4, 3.6, k); open = 1; hold = false; }
    if (place && ph >= .85 && ph < .995) { placed.visible = true; placed.position.set(slotW.x - site.position.x, .5, slotW.z - site.position.z); }
    ex.turret.rotation.y = yaw; const [al, be] = solveTip(rr, hy); ex.pose(al, be - al, -be, open);
    carry.visible = hold; pick.visible = !hold;
    pr.position.set(vw === 'place' ? 8.2 : -5.2, 0, vw === 'place' ? 11.4 : 9.9); const gp = ex.tip.getWorldPosition(new V3()); sp.pose({ t: T, ph, grapple: gp.clone().add(new V3(0, 1.1, 0)), vel: gp.clone().sub(prevTip) }); prevTip.copy(gp);
    return go || cur.v !== vw ? (cur.v = vw, true) : false;
  };
  return out;
}
