/* scene: particle shape. Three large grains: angular, sub-rounded and rounded, on separate stands under macro lighting.
   Real river sand is a mixture and its shape depends on the source and the transport history: these are forms, not scans of a sample. */
import { THREE, L, studio, rng } from '/assets/application-s3d.js';
import { reduce, V3, TAU, mineralGrain } from '/assets/application-s3d-sand.js';
const { M, mk } = L;

export default function build({ state }) {
  const scene = new THREE.Scene(); studio(scene, { ext: 14, key: 2.4, shadow: .24, map: 2048 });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .62, metalness: 0, envMapIntensity: .9 });
  { const f = mk(new THREE.BoxGeometry(30, .3, 11), new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: .85 })); f.position.y = -.15; scene.add(f); }
  const four = state.set === 'four', tn = four ? 'grey' : undefined;
  const K = four ? [['rnd', -10.8, 43, 'Rounded'], ['sub', -3.6, 27, 'Sub-rounded'], ['ang', 3.6, 11, 'Angular crushed'], ['irr', 10.8, 61, 'Irregular']] : [['ang', -7.2, 11, 'Angular'], ['sub', 0, 27, 'Sub-rounded'], ['rnd', 7.2, 43, 'Rounded']];
  const items = K.map(([k, x, seed], i) => {
    const g = new THREE.Group(); g.position.x = x; scene.add(g);
    const pl = mk(new THREE.CylinderGeometry(2.5, 2.7, .6, 56), M.white); pl.position.y = .3; g.add(pl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, .06, 8, 56), new THREE.MeshStandardMaterial({ color: 0xe7e4de, roughness: .6 })); ring.rotation.x = Math.PI / 2; ring.position.y = .6; g.add(ring);
    const gr = new THREE.Mesh(k === 'irr' ? mineralGrain('ang', seed, { sx: [1.5, .6, .92], cuts: 12, rough: .1, wob: .2, tone: tn }) : mineralGrain(k, seed, { tone: tn }), mat); gr.scale.setScalar(2.05); gr.position.y = 2.5; gr.castShadow = true; g.add(gr); gr.rotation.set(.3, i * 1.3, .1);
    return { g, gr, ring, k };
  });
  const hotRing = new THREE.MeshStandardMaterial({ color: 0xff5e29, roughness: .4, emissive: 0xff5e29, emissiveIntensity: .3 }), baseRing = items[0].ring.material;
  const views = { all: { az: -6, el: 18, dist: four ? 44 : 33, t: [0, 2.4, 0] }, ...Object.fromEntries(K.map(([k, x]) => [k, { az: -14, el: 16, dist: 11.5, t: [x, 2.5, 0] }])) };
  const labels = K.map(([k, x, , n]) => ({ id: k, text: n, side: 'r', tone: k === (four ? 'ang' : 'sub') ? 'hot' : undefined, anchor: new V3(x, four && (k === 'sub' || k === 'irr') ? 8.4 : 5.6, 0), show: st => st.view === 'all' || st.view === k }));
  return {
    scene, views, fov: 30, wide: true, labels, limits: { az: [-80, 80], el: [4, 70], dist: [6, 50] },
    update(t, dt, st) {
      let a = false;
      items.forEach(o => { const sel = st.view === o.k; o.ring.material = sel ? hotRing : baseRing; if (!reduce()) { o.gr.rotation.y += dt * (sel ? .5 : .15); a = true; } });
      return a;
    },
  };
}
