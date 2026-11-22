/* scene: washed sand in white enamel dishes on a lab bench (Washed Sand page). Two sets, one module.
   compare : the same sand twice, side by side. Left: the incoming material, its grains coated with brown loose fines (silt) with loose silt grains among them. Right: the same sand after washing, where the slider sets
             how much of the removable fines has been taken out. Some fines always remain, and no percentage or result is shown.
   source  : four dishes for four source categories (natural sand, crushed stone sand, crushed gravel sand, another permitted source). The treatment changes only the loose fines (washed), only the size spread
             (screened, the oversize taken out) or both: the source never changes.
   Every heap is a poured pile at the angle of repose: a grain-shader surface (hundreds of thousands of faceted crystals fading to a mean colour where a grain is smaller than a pixel, with a dust coat whose
   strength can change) with real instanced grains over it. Grains are enlarged and generated: they are not a sample, and appearance is never evidence of grading or of conformity with a standard.
   Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, plant, buildHeap, mineral } from '/assets/application-s3d-msand.js';
import { cvs, tex } from '/assets/application-s3d-msmasonry.js';
const V3 = THREE.Vector3, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const RD = 19.5, FLOOR = 1.2;
const SRC = {
  natural: { name: 'Natural sand', kind: 'round', tint: [2.5, 1.85, 1.05], csf: .26, csm: .64, nC: 200, maxD: 2.4 },
  stone:   { name: 'Crushed stone sand', kind: 'ang', tint: null, csf: .24, csm: .6, nC: 420, maxD: 3.8 },
  gravel:  { name: 'Crushed gravel sand', kind: 'sub', tint: [2.1, 1.6, .95], csf: .25, csm: .62, nC: 260, maxD: 3.0 },
  other:   { name: 'Other permitted source', kind: 'ang', tint: [2.0, 1.8, 1.45], csf: .2, csm: .5, nC: 300, maxD: 2.8 },
};

export default function build({ state }) {
  const set = state.set === 'source' ? 'source' : 'compare';
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 72, key: 2.5, shadow: .22, map: 4096, ground: false });
  key.shadow.bias = -.0001; key.shadow.normalBias = .03; key.shadow.camera.near = 70; key.shadow.camera.far = 270; key.shadow.camera.updateProjectionMatrix();
  /* bench */
  { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); }
    const t = tex(b); t.repeat.set(30, 20); const bench = new THREE.Mesh(new THREE.BoxGeometry(520, 3, 360), new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: 0, envMapIntensity: .8 })); bench.position.set(0, -1.5, 0); bench.receiveShadow = true; scene.add(bench); }
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: .24, metalness: 0, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9 });
  const rimM = new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: .24 }), hotM = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 });
  const prof = [[0, 0], [RD - 2, 0], [RD - .8, .6], [RD + .4, 5], [RD + 1.2, 6.2], [RD + 1.9, 6], [RD + 1.6, 5], [RD + .8, 4.6], [RD - .6, 1.7], [RD - 2, FLOOR], [0, FLOOR]].map(p => new THREE.Vector2(p[0], p[1])), dishG = new THREE.LatheGeometry(prof, 96);
  const GEO = { sub: [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')), ang: [0, 1, 2, 3, 4, 5].map(i => crushed(100 + i * 17, 'ang')), round: [0, 1, 2, 3, 4, 5].map(i => crushed(700 + i * 19, 'round')), roundS: [0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round')), small: [0, 1, 2, 3].map(i => crushed(200 + i * 13, 'small')), tiny: [0, 1, 2].map(i => crushed(500 + i * 11, 'tiny')) };
  const mat = grainMat({ bump: .1 }), siltM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .96, envMapIntensity: .35 });
  const mkDish = (x, z, sp, seed, dust) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const d = new THREE.Mesh(dishG, enamel); d.castShadow = d.receiveShadow = true; g.add(d);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RD + 1.45, .5, 10, 96), rimM); rim.rotation.x = Math.PI / 2; rim.position.y = 5.95; rim.castShadow = true; g.add(rim);
    const heap = buildHeap({ R: 15, nC: sp.nC, nM: 2400, nF: 7000, nH: 0, seed, y0: FLOOR, maxD: sp.maxD, gs: 1, tint: sp.tint, csf: sp.csf, csm: sp.csm, dust, uni: true }); g.add(heap.group);
    const big = sp.kind === 'round' ? GEO.round : sp.kind === 'sub' ? GEO.sub : GEO.ang, mid = sp.kind === 'ang' ? GEO.small : GEO.roundS;
    const coarse = sp.nC ? plant(heap.group, heap.items.coarse, big, mat, seed + 10, true) : [], mids = plant(heap.group, heap.items.mid, mid, mat, seed + 11, true), fine = plant(heap.group, heap.items.fine, GEO.tiny, mat, seed + 12, false);
    return { g, rim, heap, coarse, mids, fine, cc: coarse.map(m => m.count), top: heap.hAt(0, 0) + FLOOR, grp: [[heap.items.coarse, coarse], [heap.items.mid, mids], [heap.items.fine, fine]] };
  };
  /* the loose-fines coat on the real grains: each grain's colour is pulled toward brown silt by the amount of fines left (and toward orange when the fines are picked out) */
  const BROWN = [.3, .21, .12], ORG = [1.5, .5, .16], dcol = new THREE.Color();
  const dustCoat = (it, amt, hl) => { it.grp.forEach(([items, ims]) => { if (!ims.length) return; const n = ims.map(() => 0); items.forEach(g => { const k = amt * (hl ? .85 : .7), T = hl ? ORG : BROWN, c = g.c; dcol.setRGB(c[0] * (1 - k) + T[0] * k, c[1] * (1 - k) + T[1] * k, c[2] * (1 - k) + T[2] * k); ims[g.gi].setColorAt(n[g.gi]++, dcol); }); ims.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; }); }); };
  const out = { scene, fov: 30, wide: true, limits: { az: [-60, 60], el: [10, 66], dist: [30, 300] } };

  if (set === 'compare') {
    const base = SRC.natural, items = [mkDish(-24, 0, { ...base, tint: [2.9, 2.45, 1.7] }, 31, .8), mkDish(24, 0, { ...base, tint: [2.9, 2.45, 1.7] }, 31, .8)];
    /* loose silt grains among the sand: brown, matte, smaller than the sand grains */
    const NSILT = 2600, r = rng(77), silt = items.map((it, k) => { const arr = []; for (let i = 0; i < NSILT; i++) { const th = r() * 6.2832, f = Math.sqrt(r()), rr = f * it.heap.R * .95, x = Math.cos(th) * rr, z = Math.sin(th) * rr, s = .08 + r() * .12, c = [.2 + r() * .1, .15 + r() * .08, .09 + r() * .05]; arr.push({ x, y: it.heap.hAt(x, z) + s * .25, z, s, c, flat: .8 + r() * .3, jx: 1, jz: 1, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)) }); } return { arr, ims: plant(it.heap.group, arr, GEO.tiny, siltM, 90 + k, false) }; });
    const counts = silt.map(s => s.ims.map(m => m.count)), HOT = new THREE.Color(1.5, .5, .16), col = new THREE.Color();
    out.views = { all: { az: -4, el: 34, dist: matchMedia('(max-width:640px)').matches ? 150 : 108, t: [0, 4, 0] } };
    out.labels = [
      { id: 'a', text: 'Incoming sand: loose fines coat the grains', side: 'l', anchor: new V3(-24 - 2, items[0].top + 4, 4), show: () => true },
      { id: 'b', text: 'The same sand after washing: fewer fines, some remain', side: 'r', tone: 'hot', anchor: new V3(24 + 2, items[1].top + 4, 4), show: () => true },
    ];
    let lastW = -1, lastHl = null; dustCoat(items[0], 1, false); dustCoat(items[1], .3, false);
    out.update = (t, dt, st) => {
      const w = clamp(st.wash ?? .7), hl = !!st.hl;
      if (w !== lastW) { lastW = w; items[1].heap.mat.userData.uDust.value = .8 - w * .74; silt[1].ims.forEach((m, i) => { m.count = Math.round(counts[1][i] * (1 - w * .86)); }); dustCoat(items[1], 1 - w * .88, !!st.hl); }
      if (hl !== lastHl) { lastHl = hl; dustCoat(items[0], 1, hl); dustCoat(items[1], 1 - w * .88, hl); silt.forEach(s => { const per = s.ims.map(() => 0); s.arr.forEach(a => { const im = s.ims[a.gi]; col.setRGB(...(hl ? [HOT.r, HOT.g, HOT.b] : a.c)); im.setColorAt(per[a.gi]++, col); }); s.ims.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; }); }); siltM.emissive.set(hl ? 0xff5e29 : 0); siltM.emissiveIntensity = hl ? .5 : 0; items.forEach(it => it.heap.mat.userData.uDustCol.value.set(...(hl ? [1, .42, .16] : [.34, .27, .18]))); }
      return false;
    };
  } else {
    const keys = ['natural', 'stone', 'gravel', 'other'], pos = [[-24, -22], [24, -22], [-24, 24], [24, 24]], items = keys.map((k, i) => mkDish(pos[i][0], pos[i][1], SRC[k], 51 + i * 13, .5));
    out.views = { all: { az: -4, el: 42, dist: matchMedia('(max-width:640px)').matches ? 150 : 112, t: [0, 4, 0] } };
    out.labels = keys.map((k, i) => ({ id: k, text: SRC[k].name, side: 'r', tone: 'hot', anchor: new V3(pos[i][0] + 2, items[i].top + 3, pos[i][1] + 2), show: () => true }));
    let lastT = null, lastS = null;
    out.update = (t, dt, st) => {
      const tr = st.treat || 'washed', sr = st.src || 'natural';
      if (tr !== lastT) { lastT = tr; const dust = tr === 'screened' ? .5 : .05, screened = tr !== 'washed'; items.forEach(it => { it.heap.mat.userData.uDust.value = dust; it.coarse.forEach((m, i) => { m.count = screened ? 0 : it.cc[i]; }); }); }
      if (sr !== lastS) { lastS = sr; items.forEach((it, i) => { it.rim.material = keys[i] === sr ? hotM : rimM; }); }
      return false;
    };
  }
  return out;
}
