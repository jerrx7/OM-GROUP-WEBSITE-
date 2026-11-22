/* scene: moisture and bulking (River Sand page). Two identical glass measuring boxes on a lab bench hold the SAME grains. The left one is dry and gives the reference level (the orange line across both boxes);
   in the right one the moisture setting (Dry / Damp / Flooded) changes how much space the same grains seem to occupy. Each box is a thick-walled glass container: against the front glass sit real worn river grains
   (the same instanced grains as the rest of the page), behind them a painted section of packed sand; damp sand is darker and glossy, flooded sand sits under a layer of free water. Bulking first rises with moisture and
   then falls back when the sand is flooded, but no moisture figure, percentage or conversion is shown, and the heights are drawn for the picture, not measured. Numbered markers, key beside the figure. */
import { THREE, studio, rng } from '/assets/application-s3d.js';
import { crushed, grainMat, mineral, sandOf } from '/assets/application-s3d-msand.js';
import { cvs, tex } from '/assets/application-s3d-msmasonry.js';
import { sedTex } from '/assets/application-s3d-rsfines.js';
const V3 = THREE.Vector3;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = clamp(v); return v * v * (3 - 2 * v); };


const W = 5, D = 3.4, H = 6.6, H0 = 3.3, GX = [-4.6, 4.6], BASE = .35;
export default function build({ state } = {}) {
  const SO = sandOf(state), TT = SO.TT || [2.5, 1.85, 1.05];
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 17, key: 2.5, shadow: 0, map: 4096, ground: false });
  key.shadow.bias = -.0001; key.shadow.normalBias = .02;
  /* the bench */
  { const b = cvs(512, 512), g = b.getContext('2d'), rr = rng(5); g.fillStyle = '#d4d1ca'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 14000; i++) { const v = 188 + rr() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 5) + ',.55)'; g.fillRect(rr() * 512, rr() * 512, 1.2 + rr() * 1.4, 1.2 + rr() * 1.4); }
    const t = tex(b); t.repeat.set(36, 18); const bench = new THREE.Mesh(new THREE.BoxGeometry(160, 1, 80), new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: 0, envMapIntensity: .8 })); bench.position.set(0, -.5, 0); bench.receiveShadow = true; scene.add(bench); }
  const G = SO.TT && !SO.round ? [0, 1, 2, 3, 4].map(i => crushed(200 + i * 13, 'small')) : [0, 1, 2].map(i => crushed(900 + i * 17, 'sub')).concat([0, 1, 2, 3].map(i => crushed(800 + i * 7, 'round')));
  const dryMat = grainMat({ bump: .05, rough: .6 }), dampMat = grainMat({ bump: .05, rough: .6 });
  /* the same grains, in unit coordinates (y from 0 to 1); the height of the column scales them */
  const N = 2300, r = rng(91), U = []; for (let i = 0; i < N; i++) U.push({ x: (r() - .5) * (W - .5), y: r(), z: .78 + r() * .8, s: .075 + r() * .075, o: r() * 6, k: (r() * G.length) | 0, c: (c => [c[0] * TT[0], c[1] * TT[1], c[2] * TT[2]])(mineral(r)) });
  /* the packed sand behind the front grains: a painted section, light (dry) and dark (damp) */
  const RC = [[214, 182, 136], [172, 134, 92], [138, 108, 80], [238, 220, 180], [96, 82, 70], [192, 128, 88]];
  const secDry = sedTex(33, [184, 150, 104], [[1400, 6, RC]], [[18000, 1.6, RC.map(c => 'rgba(' + c.join(',') + ',A)')]], 1024, 512), secWet = sedTex(34, [106, 82, 58], [[1400, 6, RC.map(c => c.map(v => v * .55))]], [[18000, 1.6, RC.map(c => 'rgba(' + c.map(v => v * .55 | 0).join(',') + ',A)')]], 1024, 512);
  const cl = t => { const c = t.clone(); c.needsUpdate = true; return c; }, secDryD = { map: cl(secDry.map), bump: cl(secDry.bump) };   /* the damp box shows the light section until it is wet enough to darken: its own copy, so the repeat of one box never changes the other */
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: .24, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .9 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xeaf3f1, roughness: .03, metalness: 0, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.4, ior: 1.5 });
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0x5aa5c6, roughness: .04, transparent: true, opacity: .36, depthWrite: false, clearcoat: .6, clearcoatRoughness: .08, envMapIntensity: 1.6 });
  const mkBox = (x, wet) => {
    const g = new THREE.Group(); g.position.x = x; scene.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(W + .6, BASE, D + .6), enamel); base.position.y = BASE / 2; base.castShadow = base.receiveShadow = true; g.add(base);
    /* the glass: four thin walls, a rolled top edge */
    const gl = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), glassM); gl.position.y = BASE + H / 2; gl.renderOrder = 8; g.add(gl);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: 0xcfd6dc, transparent: true, opacity: .75 })); edge.position.y = BASE + H / 2; g.add(edge);
    const map = (wet ? secWet : secDry), mat = new THREE.MeshStandardMaterial({ map: map.map, bumpMap: map.bump, bumpScale: 2.4, roughness: wet ? .45 : .95, envMapIntensity: .35 });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(W - .04, 1, 1.7), mat); fill.position.z = -.08; fill.castShadow = false; g.add(fill);
    const ims = G.map((geo, gi) => { const n = U.filter(u => u.k === gi).length, im = new THREE.InstancedMesh(geo, wet ? dampMat : dryMat, n || 1); im.count = n; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; g.add(im); return im; });
    { const cc = new THREE.Color(), cnt = G.map(() => 0); U.forEach(u => { cc.setRGB(u.c[0], u.c[1], u.c[2]); ims[u.k].setColorAt(cnt[u.k]++, cc); }); ims.forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true; }); }
    const pool = new THREE.Mesh(new THREE.BoxGeometry(W - .04, 1, D - .04), waterM); pool.renderOrder = 6; g.add(pool);
    return { g, fill, ims, pool };
  };
  const dry = mkBox(GX[0], false), damp = mkBox(GX[1], true);
  const o3 = new THREE.Object3D();
  const place = (b, h) => {
    b.fill.scale.y = Math.max(.01, h); b.fill.position.y = BASE + h / 2 - .02;
    const cnt = b.ims.map(() => 0);
    U.forEach(u => { const im = b.ims[u.k], i = cnt[u.k]++; o3.position.set(u.x, BASE + u.s + u.y * Math.max(.01, h - u.s * 2.2), u.z); o3.scale.setScalar(u.s); o3.rotation.set(u.o, u.o * 2, u.o * 3); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); });
    b.ims.forEach(im => { im.instanceMatrix.needsUpdate = true; });
    const k = Math.max(.001, h / H0); b.fill.material.map.repeat.set(1, k); b.fill.material.bumpMap.repeat.set(1, k);
  };
  /* a thin orange line at the dry level, running across both boxes */
  const lvlM = new THREE.MeshBasicMaterial({ color: 0xff5e29 }), lvl = new THREE.Mesh(new THREE.BoxGeometry(GX[1] - GX[0] + W, .05, .05), lvlM); lvl.position.set(0, BASE + H0, D / 2 + .08); scene.add(lvl);
  [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.ConeGeometry(.2, .5, 12), lvlM); c.rotation.z = s * Math.PI / 2; c.position.set(s * ((GX[1] - GX[0] + W) / 2 + .1), BASE + H0, D / 2 + .08); scene.add(c); });
  place(dry, H0); dry.pool.visible = false;
  /* example curve: apparent volume rises with moisture, peaks, then falls back when the sand is flooded; the peak is drawn, not a real value */
  const rise = m => Math.sin(Math.min(1, m / .78) * Math.PI) * (m < .78 ? 1 : 0);
  let last = -1;
  const views = { front: { az: 0, el: 9, dist: 23.5, t: [0, 3.9, 0] }, iso: { az: -22, el: 22, dist: 23.5, t: [0, 3.9, 0] } };
  if (innerWidth < 640) { views.front.dist = 30; views.iso.dist = 30; }
  const labels = [
    { id: 'd', text: 'Dry sand · reference level', side: 'l', anchor: new V3(GX[0] - W / 2, BASE + H0, D / 2), show: () => true },
    { id: 'w', text: 'Same grains · moisture changes the apparent volume', side: 'r', tone: 'hot', anchor: new V3(GX[1] + W / 2, BASE + H0 + .8, D / 2), show: () => true },
    { id: 'p', text: 'Flooded: free water on top', side: 'r', anchor: new V3(GX[1] + W / 2, 5.8, D / 2), show: st => (st.moist ?? .4) > .88 },
  ];
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-60, 60], el: [4, 60], dist: [12, 50] },
    update(t, dt, st) {
      const m = st.moist ?? .4, b = rise(m) * .36;      /* the drawn rise reaches about a third above the reference and no more */
      if (m !== last) {
        last = m; const h = H0 * (1 + b); place(damp, h);
        const wet = clamp(m / .35), flood = sm((m - .78) / .22);
        dampMat.color.setScalar(1 - .62 * wet); dampMat.roughness = .62 - .34 * wet;
        damp.fill.material.map = wet > .5 ? secWet.map : secDryD.map; damp.fill.material.bumpMap = wet > .5 ? secWet.bump : secDryD.bump; damp.fill.material.roughness = .95 - .5 * wet; damp.fill.material.needsUpdate = true;
        damp.fill.material.map.repeat.set(1, Math.max(.001, h / H0)); damp.fill.material.bumpMap.repeat.set(1, Math.max(.001, h / H0));
        damp.pool.visible = flood > .02; damp.pool.scale.y = Math.max(.001, flood * 1.3); damp.pool.position.y = BASE + h + flood * .65;
      }
      return false;
    },
  };
}
