/* scene: finished concrete products on a turntable (M-Sand page, "Fine Aggregate for Engineered Concrete Products"): interlocking pavers in three pigments on a sand bed, a precast kerb with a bullnose edge,
   concrete tiles, a hollow block with two real cores, and a precast ring unit with a spigot.
   Blender model assets/3d/om-group-products.glb (scripts/excavator3d/build-products.py): every surface carries Cycles-baked maps from a procedural concrete shader (pigmented paste, cloudy mottling, sand grains,
   pores and blowholes, form-line seams, worn arrises): base colour with the contact occlusion baked in, a tangent normal map and a roughness map. Pavers and tiles are baked neutral and tinted here (pigment).
   The shapes show where a specified mix might use a crushed-stone fine fraction; they say nothing about any product's strength or suitability. Numbered markers, key beside the figure. Sizes are schematic. */
import { THREE, studio } from '/assets/application-s3d.js';
import { GLTFLoader } from '/assets/vendor/three/GLTFLoader.js';
const V3 = THREE.Vector3;

const [MODEL, MJ] = await Promise.all([new GLTFLoader().loadAsync('/assets/3d/om-group-products.glb').then(g => g.scene), fetch('/assets/3d/om-group-products.json').then(r => r.json())]);
const NEUTRAL = .58;                                              /* the grey the pavers and tiles were baked in */
const tint = (r, g, b) => { const c = new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace); return new THREE.Color(Math.min(1, c.r / NEUTRAL), Math.min(1, c.g / NEUTRAL), Math.min(1, c.b / NEUTRAL)); };
const PIG = { R: tint(176, 88, 66), G: tint(104, 106, 110), B: tint(200, 186, 152) }, TILE = { A: tint(172, 166, 154), B: tint(138, 134, 126) };

export default function build() {
  const scene = new THREE.Scene(), { key } = studio(scene, { ext: 20, key: 2.6, shadow: 0, map: 4096, ground: false });
  key.shadow.bias = -.00012; key.shadow.normalBias = .02;
  const root = MODEL.clone(true); scene.add(root);
  root.traverse(o => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const n = o.name || '';
    let m = o.material; if (!m) return; m = o.material = m.clone(); m.envMapIntensity = .55;
    if (/^Paver_/.test(n)) m.color.copy(PIG[n.split('_')[1]]);
    else if (/^Tile_/.test(n)) m.color.copy(TILE[n.split('_')[1]]);
    else if (/Turntable$/.test(n)) m.envMapIntensity = .9;
    else if (/Drum/.test(n)) m.envMapIntensity = 1;
    if (m.map) m.map.anisotropy = 8;
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: .2 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.7; floor.receiveShadow = true; scene.add(floor);

  const views = { products: { az: -18, el: 27, dist: 27, t: [0, 1.0, 0] }, all: { az: -18, el: 27, dist: 27, t: [0, 1.0, 0] } };
  const A = o => new V3(o.x, o.y, o.z);
  const labels = [
    { id: 'p', text: 'Interlocking pavers', side: 'r', anchor: A(MJ.pavers), show: () => true },
    { id: 'k', text: 'Precast kerb', side: 'l', anchor: A(MJ.kerb), show: () => true },
    { id: 't', text: 'Concrete tiles', side: 'r', anchor: A(MJ.tiles), show: () => true },
    { id: 'h', text: 'Hollow block', side: 'l', anchor: A(MJ.block), show: () => true },
    { id: 'u', text: 'Precast unit', side: 'r', anchor: A(MJ.ring), show: () => true },
  ];
  return { scene, views, fov: 30, wide: true, labels, limits: { az: [-80, 80], el: [8, 64], dist: [12, 80] }, update() { return false; } };
}
