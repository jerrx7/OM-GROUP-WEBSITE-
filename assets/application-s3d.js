/* OM GROUP — interactive engineering scenes (60mm page): one shared three.js renderer, one lazy module per scene.
   Each scene is a figure: drag to turn, buttons / sliders change its state, labels are real HTML anchored to 3D points.
   Note: nothing here is an OM GROUP test result, design, approval or photograph. */
import * as THREE from '/assets/vendor/three/three.module.min.js';
import * as L from '/assets/application-lab3d.js';

export { THREE, L };
const { makeEnv, clamp, lerp } = L;
const V3 = THREE.Vector3;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(hover: none)').matches;

const SCENES = {
  compare: () => import('/assets/application-s3d-compare.js'),
  trench: () => import('/assets/application-s3d-trench.js'),
  found: () => import('/assets/application-s3d-found.js'),
  mass: () => import('/assets/application-s3d-mass.js'),
  road: () => import('/assets/application-s3d-road.js'),
  gabion: () => import('/assets/application-s3d-gabion.js'),
  weather: () => import('/assets/application-s3d-weather.js'),
  dump: () => import('/assets/application-s3d-dump.js'),
  mixer: () => import('/assets/application-s3d-mixer.js'),
  rmcplant: () => import('/assets/application-s3d-plant.js'),
  rmccubes: () => import('/assets/application-s3d-cubes.js'),
  blockline: () => import('/assets/application-s3d-blockline.js'),
  pumpline: () => import('/assets/application-s3d-pumpline.js'),
  rccframe: () => import('/assets/application-s3d-rccframe.js'),
  rmcslump: () => import('/assets/application-s3d-slump.js'),
  rmcdelivery: () => import('/assets/application-s3d-delivery.js'),
  fill: () => import('/assets/application-s3d-fill.js'),
  sieve: () => import('/assets/application-s3d-sieve.js'),
  msand: () => import('/assets/application-s3d-msand.js'),
  vsi: () => import('/assets/application-s3d-crusher.js'),
  msgrading: () => import('/assets/application-s3d-msgrading.js'),
  msmix: () => import('/assets/application-s3d-msmix.js'),
  mswater: () => import('/assets/application-s3d-mswater.js'),
  msmasonry: () => import('/assets/application-s3d-msmasonry.js'),
  msproducts: () => import('/assets/application-s3d-msproducts.js'),
  mssands: () => import('/assets/application-s3d-mssands.js'),
  rsformation: () => import('/assets/application-s3d-rsformation.js'),
  rsfines: () => import('/assets/application-s3d-rsfines.js'),
  rsgrains: () => import('/assets/application-s3d-rsgrains.js'),
  rsbulking: () => import('/assets/application-s3d-rsbulking.js'),
  grading: () => import('/assets/application-s3d-grading.js'),
  mix: () => import('/assets/application-s3d-mix.js'),
  water: () => import('/assets/application-s3d-water.js'),
  rcc: () => import('/assets/application-s3d-rcc.js'),
  rmc: () => import('/assets/application-s3d-rmc.js'),
  masonry: () => import('/assets/application-s3d-masonry.js'),
  blocks: () => import('/assets/application-s3d-blocks.js'),
  sands: () => import('/assets/application-s3d-sands.js'),
  process: () => import('/assets/application-s3d-process.js'),
  formation: () => import('/assets/application-s3d-formation.js'),
  fines: () => import('/assets/application-s3d-fines.js'),
  grains: () => import('/assets/application-s3d-grains.js'),
  bulking: () => import('/assets/application-s3d-bulking.js'),
  pump: () => import('/assets/application-s3d-pump.js'),
  plaster: () => import('/assets/application-s3d-plaster.js'),
  plwall: () => import('/assets/application-s3d-plwall.js'),
  pltrowel: () => import('/assets/application-s3d-pltrowel.js'),
  rdpave: () => import('/assets/application-s3d-rdpave.js'),
  rdfrac: () => import('/assets/application-s3d-rdfrac.js'),
  rdtest: () => import('/assets/application-s3d-rdtest.js'),
  rdlay: () => import('/assets/application-s3d-rdlay.js'),
  rdwater: () => import('/assets/application-s3d-rdwater.js'),
  rdplant: () => import('/assets/application-s3d-rdplant.js'),
  trowel: () => import('/assets/application-s3d-trowel.js'),
  wash: () => import('/assets/application-s3d-wash.js'),
  wsline: () => import('/assets/application-s3d-wsline.js'),
  wsdishes: () => import('/assets/application-s3d-wsdishes.js'),
  rmcx: () => import('/assets/application-s3d-rmcx.js'),
  wmmpave: () => import('/assets/application-s3d-wmmpave.js'),
  wmmfrac: () => import('/assets/application-s3d-wmmfrac.js'),
  wmmsrc: () => import('/assets/application-s3d-wmmsrc.js'),
  wmmplant: () => import('/assets/application-s3d-wmmplant.js'),
  wmmlay: () => import('/assets/application-s3d-wmmlay.js'),
  wmmtest: () => import('/assets/application-s3d-wmmtest.js'),
  gsbgrade: () => import('/assets/application-s3d-gsbgrade.js'),
  gsbwater: () => import('/assets/application-s3d-gsbwater.js'),
  gsbtest: () => import('/assets/application-s3d-gsbtest.js'),
  gsbwork: () => import('/assets/application-s3d-gsbwork.js'),
  bldscale: () => import('/assets/application-s3d-bldscale.js'),
  bldfill: () => import('/assets/application-s3d-bldfill.js'),
  bldlab: () => import('/assets/application-s3d-bldlab.js'),
  bldequip: () => import('/assets/application-s3d-bldequip.js'),
  bldretain: () => import('/assets/application-s3d-bldretain.js'),
  hmapave: () => import('/assets/application-s3d-hmapave.js'),
};

/* ───────── shared renderer, studio light ───────── */
let R = null, ENV = null, lostCtx = false;
const figs = [];
function initRenderer() {
  const cv = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance', premultipliedAlpha: true });
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.04;
  R.debug.checkShaderErrors = false; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.setClearColor(0x000000, 0); R.localClippingEnabled = true;
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lostCtx = true; figs.forEach(f => f.box.classList.remove('s3d-on')); });
  cv.addEventListener('webglcontextrestored', () => { lostCtx = false; figs.forEach(f => { f.dirty = true; f.drawn = false; }); wake(); });
  ENV = makeEnv(R);
  window.__omShared = { R, ENV };                 /* the lab-card engine reuses this renderer and environment (a second set cost ~3 s of shader compiling) */
}
/* studio: environment + key/rim light + soft contact shadow. opts: {ext, y} */
export function studio(scene, opts = {}) {
  scene.environment = ENV; scene.environmentIntensity = opts.env ?? .95;
  const ext = opts.ext || 8;
  const key = new THREE.DirectionalLight(0xfff3e6, opts.key ?? 2.1); const kd = Math.max(1, ext / 8); key.position.set(-5 * kd, 11 * kd, 9 * kd); key.castShadow = true; key.shadow.mapSize.set(Math.min(opts.map || 1536, 3072), Math.min(opts.map || 1536, 3072));
  Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1 * kd, far: 45 * kd + ext }); key.shadow.bias = -.0004 * kd; key.shadow.normalBias = .03 * Math.min(kd, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a70, .5); rim.position.set(7, 4, -8); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xcfc8bc, .38));
  if (opts.ground !== false) { const g = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: opts.shadow ?? .22 })); g.rotation.x = -Math.PI / 2; g.position.y = opts.y ?? 0; g.receiveShadow = true; g.renderOrder = 1; g.material.polygonOffset = true; g.material.polygonOffsetFactor = -2; g.material.polygonOffsetUnits = -2;   /* the shadow plane must win against any floor it lies on (it used to z-fight with it) */ scene.add(g); }
  return { key, rim };
}
export const rng = L.mulberry32;
/* light stones (80 faces) for scenes that need hundreds or thousands of particles */
let _low = null;
export function lowStones() {
  if (_low) return _low; const out = [], r = L.mulberry32(77);
  for (let n = 0; n < 6; n++) {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, s1 = r() * 9, s2 = r() * 9, s3 = r() * 9, v = new V3(), planes = [];
    for (let k = 0; k < 6; k++) planes.push([new V3(r() - .5, r() - .5, r() - .5).normalize(), .64 + r() * .2]);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + .2 * Math.sin(v.x * 3.1 + s1) * Math.cos(v.y * 2.6 + s2) + .1 * Math.sin(v.z * 4.3 + s3)); for (const [nn, off] of planes) { const o = v.dot(nn) - off; if (o > 0) v.addScaledVector(nn, -o); } p.setXYZ(i, v.x, v.y * .86, v.z * 1.08); }
    g.computeVertexNormals(); const col = new Float32Array(p.count * 3);
    for (let f = 0; f < p.count; f += 3) { let b = .09 + r() * .08; if (r() < .12) b = .34 + r() * .3; for (let k = 0; k < 3; k++) { col[(f + k) * 3] = b * .98; col[(f + k) * 3 + 1] = b * .99; col[(f + k) * 3 + 2] = b * 1.03; } }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.push(g);
  }
  return (_low = out);
}
/* scatter instanced stones: items = [[x,y,z,radius], ...] */
export function instStones(parent, items, mat, seed = 1, shadow = false) {
  const g = lowStones(), r = L.mulberry32(seed), per = g.map(() => []); items.forEach(it => per[(r() * g.length) | 0].push(it)); const o = new THREE.Object3D(), ims = [];
  per.forEach((arr, gi) => { if (!arr.length) return; const im = new THREE.InstancedMesh(g[gi], mat, arr.length); arr.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); o.scale.set(it[3] * (.9 + r() * .25), it[3] * (.78 + r() * .3), it[3] * (.9 + r() * .25)); o.rotation.set(r() * 6, r() * 6, r() * 6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.castShadow = shadow; im.receiveShadow = false; im.frustumCulled = false; parent.add(im); ims.push(im); });
  return ims;
}
/* soft noise texture helper (soil, concrete, fabric) */
export function noiseTex(w, h, base, speck, seed = 1, n = 5200, size = 2) {
  return L.canvasTex(w, h, (x, cw, ch) => {
    x.fillStyle = base; x.fillRect(0, 0, cw, ch); const r = L.mulberry32(seed);
    for (let i = 0; i < n; i++) { x.fillStyle = speck[(r() * speck.length) | 0]; const s = size * (.4 + r() * 1.4); x.globalAlpha = .25 + r() * .55; x.fillRect(r() * cw, r() * ch, s, s * (.5 + r())); }
    x.globalAlpha = 1;
  }, true);
}

/* ───────── build scheduling ─────────
   A figure's build (model parse, procedural textures, geometry, shader compile) used to start when it came within 160 px of the viewport and ran in one go, which froze the page for
   seconds at that point. Now figures start loading when they are ~2.5 screens away, one at a time, each step waiting for an idle moment; shaders compile in parallel. */
const idle = () => new Promise(r => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 30)));
/* heavy work waits for the page to stop scrolling (up to 4 s), so it lands in a pause instead of in the middle of a scroll */
let lastScroll = 0; addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
const quiet = () => new Promise(r => { const t0 = performance.now(), chk = () => (performance.now() - lastScroll > 180 || performance.now() - t0 > 12000) ? r() : setTimeout(chk, 90); chk(); });
let gateTail = Promise.resolve();
function gate() { let release; const prev = gateTail; gateTail = new Promise(r => { release = r; }); return prev.then(() => idle()).then(() => quiet()).then(() => release); }
/* ───────── figure ───────── */
class Fig {
  constructor(box, key) {
    this.box = box; this.key = key; this.stage = box.querySelector('.s3d-stage'); this.cv = box.querySelector('canvas.s3d-cv'); this.ctx = this.cv.getContext('2d');
    this.cam = new THREE.PerspectiveCamera(30, 1.6, .1, 400); this.state = {}; this.rig = null; this.vis = false; this.dirty = true; this.drawn = false; this.fail = false; this.q = 1;
    this.w = 0; this.h = 0; this.time = 0; this.c = null; this.g = null; this.lastDrag = -9; this.labs = [];
    try { Object.assign(this.state, JSON.parse(box.getAttribute('data-init') || '{}')); } catch (e) {}
  }
  async build() {
    if (this.rig || this.fail || this.building) return; this.building = true; let release = () => {};
    try {
      release = await gate();                                  /* one figure builds at a time, and only when the page is idle: a build is a long synchronous job */
      const [mod, kit] = await Promise.all([SCENES[this.key](), import('/assets/application-s3d-sand.js')]); kit.setSandMap(this.box.getAttribute('data-sand') || ''); await idle(); await quiet(); const rig = mod.default({ fig: this, R, ENV, state: this.state });
      try { await R.compileAsync(rig.scene, this.cam); await L.compileShadows(R, rig.scene, this.cam); } catch (e) {}      /* compile the shaders in parallel off the main thread (KHR_parallel_shader_compile) before the first frame */
      this.rig = rig; const v = rig.views[this.state.view] || rig.views[Object.keys(rig.views)[0]];
      this.c = { az: v.az, el: v.el, dist: v.dist, tx: v.t[0], ty: v.t[1], tz: v.t[2] }; this.g = { ...this.c };
      this.mkLabels(); this.sync(); rig.update(0, 0, this.state, this); this.dirty = true;
      /* upload the figure's geometry and textures to the GPU now (a tiny draw in the corner of the shared buffer) instead of on its first visible frame */
      try { await quiet(); if (this.size()) { this.camUpdate(.016); if (R.domElement.width < 8) R.setSize(8, 8, false); R.setViewport(0, 0, 8, 8); R.render(rig.scene, this.cam); } } catch (e) {}
    } catch (e) { console.warn('s3d', this.key, e); this.fail = true; }
    this.building = false; setTimeout(release, 120); wake();
  }
  mkLabels() {
    const host = this.stage.querySelector('.s3d-labels') || (() => { const d = document.createElement('div'); d.className = 's3d-labels'; this.stage.appendChild(d); return d; })();
    host.textContent = ''; this.labs = (this.rig.labels || []).map((l, i) => {
      const el = document.createElement('div'); el.className = 's3d-lab l-' + (l.side || 'r'); el.innerHTML = '<i>' + (i + 1) + '</i><b>' + l.text + '</b>'; if (l.tone) el.dataset.tone = l.tone; host.appendChild(el); return { ...l, el };
    });
    const lg = this.box.querySelector('.s3d-legend'); if (lg) { lg.innerHTML = this.labs.map((l, i) => '<li data-lab="' + i + '"><i>' + (i + 1) + '</i><span>' + l.text + '</span></li>').join(''); this.legend = [...lg.children]; }
  }
  size() {
    const cw = this.cv.clientWidth, ch = this.cv.clientHeight; if (!cw || !ch) return false;
    let dpr = (coarse ? Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2) : Math.min(Math.max(window.devicePixelRatio || 1, 1.75), 2.25)) * this.q; dpr = Math.min(dpr, Math.sqrt(4.6e6 / (cw * ch)));
    const w = Math.max(2, Math.round(cw * dpr)), h = Math.max(2, Math.round(ch * dpr)); if (w !== this.cv.width || h !== this.cv.height) { this.cv.width = w; this.cv.height = h; this.dirty = true; } this.w = w; this.h = h; this.cw = cw; this.ch = ch; return true;
  }
  set(key, val) {
    if (this.state[key] === val) return; this.state[key] = val;
    if (key === 'view' && this.rig && this.rig.views[val]) { const v = this.rig.views[val]; this.g = { az: v.az, el: v.el, dist: v.dist, tx: v.t[0], ty: v.t[1], tz: v.t[2] }; if (reduce) this.c = { ...this.g }; }
    if (this.rig && this.rig.onSet) this.rig.onSet(key, val, this.state, this);
    this.sync(); this.dirty = true; this.box.dispatchEvent(new CustomEvent('s3dstate', { detail: { key, val, state: this.state }, bubbles: true })); wake();
  }
  /* mirror the state onto the buttons and the explanatory text */
  sync() {
    const st = this.state, parse = s => { const i = s.indexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; }, eq = (k, v) => String(st[k]) === v;
    this.box.querySelectorAll('[data-set]').forEach(b => { const [k, v] = parse(b.getAttribute('data-set')); b.setAttribute('aria-pressed', eq(k, v) ? 'true' : 'false'); });
    this.box.querySelectorAll('[data-toggle]').forEach(b => b.setAttribute('aria-pressed', st[b.getAttribute('data-toggle')] ? 'true' : 'false'));
    this.box.querySelectorAll('[data-when]').forEach(p => { const on = p.getAttribute('data-when').split(',').some(c => { const [k, v] = parse(c.trim()); return eq(k, v); }); p.classList.toggle('on', on); if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); });
    this.box.querySelectorAll('[data-range]').forEach(r => { const k = r.getAttribute('data-range'); if (document.activeElement !== r) r.value = Math.round((st[k] || 0) * +r.max); });
  }
  camUpdate(dt) {
    const c = this.c, g = this.g; if (!c) return false; const k = reduce ? 1 : 1 - Math.exp(-dt * 5.2); let moving = false;
    for (const p of ['az', 'el', 'dist', 'tx', 'ty', 'tz']) { const d = g[p] - c[p]; if (Math.abs(d) > .0004 * (p === 'az' || p === 'el' ? 100 : 1)) { c[p] += d * k; moving = true; } else c[p] = g[p]; }
    const drift = reduce || this.time - this.lastDrag < 4 ? 0 : Math.sin(this.time * .32) * 2.4;
    const asp = this.cw / this.ch, fit = asp < 1 ? Math.pow(1 / asp, .72) : 1, a = (c.az + drift) * Math.PI / 180, e = c.el * Math.PI / 180, d = c.dist * fit;
    this.cam.aspect = asp; this.cam.fov = (this.rig.fov || 30) + (this.rig.wide && asp < 1.15 ? Math.min(28, (1.15 - asp) * 55) : 0); this.cam.updateProjectionMatrix();
    this.cam.position.set(c.tx + Math.sin(a) * Math.cos(e) * d, c.ty + Math.sin(e) * d, c.tz + Math.cos(a) * Math.cos(e) * d); this.cam.lookAt(c.tx, c.ty, c.tz);
    return moving || (!reduce && drift !== 0);
  }
  render() {
    if (!this.rig || !this.size()) return; const dom = R.domElement;
    /* one shared drawing buffer that only ever grows: resizing it for every figure that differs in size (two on screen at once, or scrolling between them) reallocated it every frame (hundreds of ms); each figure now draws into the corner it needs */
    if (dom.width < this.w || dom.height < this.h) R.setSize(Math.max(dom.width, this.w), Math.max(dom.height, this.h), false);
    R.setViewport(0, 0, this.w, this.h); R.toneMappingExposure = 1.04;
    R.render(this.rig.scene, this.cam); this.ctx.clearRect(0, 0, this.w, this.h); this.ctx.drawImage(dom, 0, dom.height - this.h, this.w, this.h, 0, 0, this.w, this.h);
    this.project(); if (!this.drawn) { this.drawn = true; this.box.classList.add('s3d-on'); }
  }
  project() {
    const v = new V3(), nums = this.box.classList.contains('s3d-nums'); let n = 0; this.labs.forEach((l, i) => {
      const show = l.show ? l.show(this.state, this) : true;
      if (nums && show && l.n !== ++n) { l.n = n; l.el.firstChild.textContent = n; if (this.legend) this.legend[i].firstChild.textContent = n; }   /* number-only markers: numbered 1, 2, 3 ... in the order they are shown, with the key below the figure */ v.copy(typeof l.anchor === 'function' ? l.anchor(this.state) : l.anchor).project(this.cam);
      const ok = show && v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15; l.el.classList.toggle('off', !ok); if (this.legend) this.legend[i].classList.toggle('off', !show);
      if (ok) {
        const px = (v.x * .5 + .5) * this.cw, py = (-v.y * .5 + .5) * this.ch; let side = l.side || 'r'; const w = l.w || (l.w = l.el.offsetWidth || 160);
        if (window.innerWidth > 720) { if (side === 'r' && px + w + 18 > this.cw) side = 'l'; else if (side === 'l' && px - w - 18 < 0) side = 'r'; }
        if (side !== l.cur) { l.cur = side; l.el.classList.toggle('l-l', side === 'l'); l.el.classList.toggle('l-r', side !== 'l'); }
        l.el.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px)';
      }
    });
  }
  bind() {
    const box = this.box, cv = this.cv; let drag = null;
    cv.addEventListener('pointerdown', e => { if (!this.rig) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch' }; cv.setPointerCapture(e.pointerId); box.classList.add('s3d-drag'); this.lastDrag = this.time; });
    cv.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; const lim = this.rig.limits || {}; this.g.az = clamp(this.g.az - dx * .32, ...(lim.az || [-70, 70])); if (!drag.touch) this.g.el = clamp(this.g.el + dy * .24, ...(lim.el || [4, 62])); this.lastDrag = this.time; if (reduce) this.c = { ...this.g }; this.dirty = true; wake(); });
    const end = e => { if (drag && e.pointerId === drag.id) { drag = null; box.classList.remove('s3d-drag'); } }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('keydown', e => { const lim = this.rig && this.rig.limits || {}; const k = e.key; let used = true; if (k === 'ArrowLeft') this.g.az = clamp(this.g.az - 6, ...(lim.az || [-70, 70])); else if (k === 'ArrowRight') this.g.az = clamp(this.g.az + 6, ...(lim.az || [-70, 70])); else if (k === 'ArrowUp') this.g.el = clamp(this.g.el + 4, ...(lim.el || [4, 62])); else if (k === 'ArrowDown') this.g.el = clamp(this.g.el - 4, ...(lim.el || [4, 62])); else used = false; if (used) { e.preventDefault(); this.lastDrag = this.time; if (reduce) this.c = { ...this.g }; this.dirty = true; wake(); } });
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-set],[data-toggle],[data-zoom]'); if (!b || !box.contains(b)) return;
      if (b.hasAttribute('data-set')) { const s = b.getAttribute('data-set'), i = s.indexOf(':'), k = s.slice(0, i); let v = s.slice(i + 1); if (v === 'true') v = true; else if (v === 'false') v = false; else if (v !== '' && !isNaN(+v)) v = +v; this.set(k, v); }
      else if (b.hasAttribute('data-toggle')) { const k = b.getAttribute('data-toggle'); this.set(k, !this.state[k]); }
      else { const z = b.getAttribute('data-zoom'), lim = this.rig && this.rig.limits || {}, d = lim.dist || [6, 60]; if (z === 'in') this.g.dist = clamp(this.g.dist * .82, ...d); else if (z === 'out') this.g.dist = clamp(this.g.dist * 1.22, ...d); else { const v = this.rig.views[this.state.view] || Object.values(this.rig.views)[0]; this.g = { az: v.az, el: v.el, dist: v.dist, tx: v.t[0], ty: v.t[1], tz: v.t[2] }; } this.lastDrag = this.time; if (reduce) this.c = { ...this.g }; this.dirty = true; wake(); }
    });
    box.addEventListener('input', e => { const r = e.target.closest('[data-range]'); if (r) this.set(r.getAttribute('data-range'), +r.value / +r.max); });
  }
}

/* ───────── loop ───────── */
let raf = 0, last = 0;
function wake() { if (!raf && !document.hidden && R && !lostCtx && figs.some(f => f.vis)) { last = performance.now(); raf = requestAnimationFrame(loop); } }
function loop(now) {
  raf = 0; let gap = now - last; if (!(gap > 0)) gap = 0; const dt = Math.min(.1, gap / 1000); last = Math.max(now, last); let busy = false;
  for (const f of figs) {
    if (!f.vis || f.fail) continue; if (!f.rig) { f.build(); busy = true; continue; }
    f.time += dt; const moving = f.camUpdate(dt); const anim = f.rig.update(f.time, dt, f.state, f); const need = moving || anim || f.dirty;
    if (need) { f.render(); f.dirty = false; busy = busy || moving || !!anim || f.state.__easing; if (!reduce && gap > 1 && (moving || anim)) { f.gapAvg = (f.gapAvg || 16) * .9 + Math.min(gap, 200) * .1; f._n = (f._n || 0) + 1; if (f._n > 45 && f.gapAvg > 38 && f.q > .7) { f.q = Math.max(.7, f.q * .88); f.gapAvg = 16; f._n = 0; f.dirty = true; } } }
  }
  if (busy) raf = requestAnimationFrame(loop);
}

export function init(root = document) {
  if (R) return true;
  try { initRenderer(); } catch (e) { console.warn('s3d: no WebGL', e); return false; }
  const io = new IntersectionObserver(es => { es.forEach(e => { const f = e.target.__s3d; f.vis = e.isIntersecting; if (f.vis) { f.dirty = true; f.shadowFreed = false; } else f.leftAt = performance.now(); }); wake(); }, { rootMargin: '160px 0px' });
  /* shadow maps are 16-36 MB each; with a dozen figures built they added up to a gigabyte and stalled the page. Only the 4 most recently seen off-screen figures keep theirs; the rest give them back and re-make them on the next draw. */
  setInterval(() => { const away = figs.filter(f => !f.vis && f.rig && !f.shadowFreed && performance.now() - (f.leftAt || 0) > 3000).sort((a, b) => (b.leftAt || 0) - (a.leftAt || 0)); away.slice(4).forEach(f => { f.shadowFreed = true; try { f.rig.scene.traverse(o => { if (o.isLight && o.shadow && o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } }); } catch (e) {} }); }, 1500);
  const pre = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const f = e.target.__s3d; pre.unobserve(e.target); if (f && !f.rig && !f.fail) f.build(); } }), { rootMargin: '2400px 0px' });
  root.querySelectorAll('.s3d-box[data-s3d]').forEach(box => {
    const key = box.getAttribute('data-s3d'); if (!SCENES[key] || !box.querySelector('canvas.s3d-cv')) return;
    const f = new Fig(box, key); box.__s3d = f; figs.push(f); f.bind(); f.sync(); box.classList.add('s3d-ready'); io.observe(box); pre.observe(box);
  });
  new ResizeObserver(() => { figs.forEach(f => { f.dirty = true; }); wake(); }).observe(document.documentElement);
  /* background builder: a figure used to be built only when the reader scrolled near it, and a build is one long synchronous job, so it landed in the middle of a scroll or left a poster showing for seconds. Now every figure is built ahead of the reader in idle time. */
  { let busy = false; const next = async () => { if (busy) return; busy = true; try { for (;;) { await idle(); await quiet(); await new Promise(r => setTimeout(r, 300)); const todo = figs.filter(f => !f.rig && !f.fail && !f.building); if (!todo.length) break; const mid = innerHeight / 2, d = f => { const r = f.box.getBoundingClientRect(); return Math.abs((r.top + r.bottom) / 2 - mid); }; todo.sort((a, b) => d(a) - d(b)); await todo[0].build(); } } finally { busy = false; } }; setTimeout(next, 2500); window.addEventListener('load', () => setTimeout(next, 2500)); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  window.__s3d = {
    figs, THREE,
    /* a still of one figure (build step: posters). target = a key or a .s3d-box element; st = state to apply; tt = the moment to draw (seconds) */
    async poster(target, w, h, st, tt, seek) {
      const f = typeof target === 'string' ? figs.find(x => x.key === target) : target.__s3d; await f.build(); if (st) Object.entries(st).forEach(([k, v]) => f.set(k, v));
      f.cv.width = w; f.cv.height = h; f.cw = w / 2; f.ch = h / 2; f.w = w; f.h = h; R.setSize(w, h, false); f.time = tt || 12; if (seek != null && f.rig.seek) f.rig.seek(seek);
      f.c = { ...f.g }; for (let i = 0; i < 3; i++) { f.rig.update(f.time, .016, f.state, f); } f.camUpdate(0); f.cam.aspect = w / h; f.cam.updateProjectionMatrix(); f.rig.update(f.time, 0, f.state, f); f.camUpdate(0); R.render(f.rig.scene, f.cam); return R.domElement.toDataURL('image/png');
    },
  };
  return true;
}
