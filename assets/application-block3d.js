/* OM GROUP · Hollow concrete block anatomy (6mm aggregates page) — HollowConcreteBlockVisualization.
   One figure: <figure class="hb3d" data-hb3d> … </figure>. See application-block3d.css.

   Pipeline
   - Blender (scripts/block3d/build-hollow-block.py): the real block — two cores cut through the full height, web, end
     walls, face shells, bevelled edges — with tileable concrete PBR maps, baked ambient occlusion, a baked studio
     floor shadow and Cycles posters. Exported as /assets/3d/hollow-concrete-block.glb.
   - three.js (here): renders that GLB live. Camera faces the front of the block from above and to the right, with the
     lens shifted (front face parallel to the picture, verticals vertical), exactly as the Blender posters are framed.
   - HTML + SVG overlay: the four labels and their leader lines. Each line ends on a 3D anchor (glTF nodes in the GLB)
     projected through the same camera, every frame, so it stays on its feature at any size and while the block turns.

   Loading: the Cycles poster shows first (no blank stage). three.js + the model load when the figure is ~900px away and
   replace the poster with the live block. Rendering runs only while something moves and the figure is on screen.
   Reduced motion: no intro, no easing; everything appears in its final state. */
(() => {
  'use strict';
  const figs = [...document.querySelectorAll('[data-hb3d]')];
  if (!figs.length) return;
  const V = '/assets/vendor/three/';
  const GLB = '/assets/3d/hollow-concrete-block.glb';
  const SHADOW_TEX = '/assets/3d/hollow-block-shadow.webp';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(hover: none)').matches;

  /* ---- shared with the Blender build (meta.json) ---- */
  const BOX = { L: 0.40, D: 0.22, H: 0.15 };
  const CAMS = { wide: [0.86, 0.591, 1.72], tall: [0.64, 0.715, 1.6] };            // camera positions (three.js, metres)
  const POSTERS = { wide: [-0.682203, -0.438536, -0.271337, -0.22312], tall: [-0.588274, -0.553413, -0.165375, -0.312022] }; // poster frame [u0,v0,u1,v1]
  const SHADOW = { c: [0.06, 0.05], s: 0.9 };
  const ANCHORS = {   // also stored as glTF nodes in the GLB; these are used until it has loaded
    wall: [-0.184, 0.15, 0.062], core: [-0.1015, 0.129, -0.0795], web: [0, 0.15, -0.012], end: [0.2, 0.09, -0.008],
  };
  const NODE = { wall: 'anchor_wall_thickness', core: 'anchor_core', web: 'anchor_web', end: 'anchor_end_wall' };
  const ORDER = ['wall', 'core', 'web', 'end'];

  /* ---- layouts (fractions of the stage). block: where the block itself sits [x0,y0,x1,y1];
          labels: [x, y, align] — x is the label's centre / left / right edge (c / l / r), y its vertical centre ---- */
  const LAYOUTS = {
    wide: { block: [0.165, 0.315, 0.835, 0.865],
      labels: { wall: [0.155, 0.265, 'c'], core: [0.375, 0.12, 'c'], web: [0.6, 0.12, 'c'], end: [0.875, 0.265, 'c'] } },
    tall: { block: [0.045, 0.33, 0.955, 0.79],
      labels: { wall: [0.035, 0.115, 'l'], core: [0.585, 0.115, 'c'], web: [0.965, 0.115, 'r'], end: [0.955, 0.9, 'r'] } },
  };
  const YAW = [-0.14, 0.17];   // turn limits (rad): the end wall stays in view, the cores never close up

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* corners of the block, for framing */
  const CORNERS = [];
  for (const x of [-BOX.L / 2, BOX.L / 2]) for (const y of [0, BOX.H]) for (const z of [-BOX.D / 2, BOX.D / 2]) CORNERS.push([x, y, z]);

  /* camera-plane coordinates of a point seen from C (camera looks down -Z, no rotation) */
  const uv = (p, C) => { const dz = C[2] - p[2]; return [(p[0] - C[0]) / dz, (p[1] - C[1]) / dz]; };

  class Fig {
    constructor(el) {
      this.el = el; this.stage = el.querySelector('.hb3d-stage'); this.cv = el.querySelector('.hb3d-cv');
      this.poster = el.querySelector('.hb3d-poster'); this.svg = el.querySelector('.hb3d-lines');
      this.tags = {}; el.querySelectorAll('.hb3d-tag').forEach(t => { this.tags[t.dataset.k] = t; });
      this.anchors = Object.fromEntries(ORDER.map(k => [k, ANCHORS[k].slice()]));
      this.lines = {}; this.dots = {};
      const NS = 'http://www.w3.org/2000/svg';
      ORDER.forEach(k => {
        const p = document.createElementNS(NS, 'path'); p.setAttribute('class', 'hb3d-ln'); p.setAttribute('pathLength', '1');
        const c = document.createElementNS(NS, 'circle'); c.setAttribute('class', 'hb3d-dot');
        this.svg.append(p, c); this.lines[k] = p; this.dots[k] = c;
      });
      this.yaw = 0; this.yawT = 0; this.drag = null; this.lastTouch = -1e9;
      this.t0 = -1; this.ratio = 0; this.intro = 'none'; this.vis = false; this.ready = false; this.live = false; this.raf = 0; this.last = 0;
      this.camOff = [0, 0, 0]; this.scale = 1;
      el.classList.add('is-js');
      this.layout();
      new ResizeObserver(() => { this.layout(); this.paint(); }).observe(this.stage);
    }

    /* ---------- framing: one frustum for the live block, the poster and the overlay ---------- */
    layout() {
      const W = this.stage.clientWidth, H = this.stage.clientHeight; if (!W || !H) return false;
      const key = W / H < 1.3 ? 'tall' : 'wide', Lo = LAYOUTS[key], C = CAMS[key];
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (const p of CORNERS) { const [u, v] = uv(p, C); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      const [bx0, by0, bx1, by1] = Lo.block, tw = (bx1 - bx0) * W, th = (by1 - by0) * H;
      const k = Math.min(tw / (u1 - u0), th / (v1 - v0));                     // px per unit of u / v
      const left = bx0 * W + (tw - (u1 - u0) * k) / 2, top = by0 * H + (th - (v1 - v0) * k) / 2;
      // frustum (in u / v at distance 1) covering the whole stage
      this.fr = { uL: u0 - left / k, uR: u0 + (W - left) / k, vT: v1 + top / k, vB: v1 - (H - top) / k };
      this.W = W; this.H = H; this.key = key; this.k = k; this.C = C;
      if (this.svg.getAttribute('viewBox') !== '0 0 ' + W + ' ' + H) this.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      // poster: same frame, so the picture sits exactly where the live block will be
      if (this.poster) {
        const P = POSTERS[key], img = this.poster.querySelector('img');
        const pw = (P[2] - P[0]) * k, pl = (P[0] - this.fr.uL) * k, pt = (this.fr.vT - P[3]) * k;
        if (img) Object.assign(img.style, { width: pw.toFixed(1) + 'px', left: pl.toFixed(1) + 'px', top: pt.toFixed(1) + 'px' });
      }
      ORDER.forEach(k2 => { const t = this.tags[k2]; t._w = t.offsetWidth; t._h = t.offsetHeight; });
      if (this.three) this.applyCamera();
      this.dirty = true;
      return true;
    }

    /* screen position of a 3D point, with the block's current turn and the camera's current position */
    project(p) {
      const c = Math.cos(this.yaw), s = Math.sin(this.yaw), sc = this.scale;
      const x = (p[0] * c + p[2] * s) * sc, y = p[1] * sc, z = (-p[0] * s + p[2] * c) * sc;
      const C = [this.C[0] + this.camOff[0], this.C[1] + this.camOff[1], this.C[2] + this.camOff[2]];
      const [u, v] = uv([x, y, z], C), f = this.fr;
      return [(u - f.uL) / (f.uR - f.uL) * this.W, (f.vT - v) / (f.vT - f.vB) * this.H];
    }

    /* ---------- overlay: labels, leader lines, anchor dots ---------- */
    overlay(t) {
      const Lo = LAYOUTS[this.key], W = this.W, H = this.H;
      ORDER.forEach((k, i) => {
        const tag = this.tags[k], [lx, ly, al] = Lo.labels[k], w = tag._w, h = tag._h;
        let x = al === 'c' ? lx * W - w / 2 : al === 'l' ? lx * W : lx * W - w;
        x = clamp(x, 6, W - w - 6); const y = ly * H - h / 2;
        const [ax, ay] = this.project(this.anchors[k]);
        // the line leaves the label's lower (or upper) edge, nudged toward the anchor
        const below = ay > y + h, cx = x + w / 2;
        const sx = clamp(cx + (ax - cx) * 0.3, x + Math.min(16, w / 3), x + w - Math.min(16, w / 3)), sy = below ? y + h : y;
        // timeline: label, then its line draws to the feature, then the dot lands
        let pl = 1, pd = 1, pp = 1;
        if (t != null) { const s0 = 0.8 + i * 0.16; pl = easeOut(clamp((t - s0) / 0.42)); pd = easeInOut(clamp((t - s0 - 0.18) / 0.5)); pp = easeOut(clamp((t - s0 - 0.6) / 0.25)); }
        tag.style.transform = 'translate(' + x.toFixed(1) + 'px,' + (y + (1 - pl) * 8).toFixed(1) + 'px)';
        tag.style.opacity = pl.toFixed(3);
        const ln = this.lines[k];
        ln.setAttribute('d', 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + 'L' + ax.toFixed(1) + ' ' + ay.toFixed(1));
        ln.style.strokeDashoffset = (1 - pd).toFixed(4);
        const d = this.dots[k]; d.setAttribute('cx', ax.toFixed(1)); d.setAttribute('cy', ay.toFixed(1)); d.setAttribute('r', this.key === 'tall' ? '5' : '6');
        d.style.opacity = pp.toFixed(3); d.style.transform = 'scale(' + (0.4 + 0.6 * pp).toFixed(3) + ')';
        d.style.transformOrigin = ax.toFixed(1) + 'px ' + ay.toFixed(1) + 'px';
      });
    }

    /* ---------- three.js ---------- */
    async boot() {
      if (this.booting) return; this.booting = true;
      try {
        const [THREE, { GLTFLoader }] = await Promise.all([import(V + 'three.module.min.js'), import(V + 'GLTFLoader.js')]);
        const R = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
        R.outputColorSpace = THREE.SRGBColorSpace;
        R.toneMapping = THREE.AgXToneMapping !== undefined ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
        R.toneMappingExposure = 1.0;
        R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.setClearColor(0x000000, 0);
        this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.el.classList.remove('is-3d'); this.lost = true; });
        this.cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.dirty = true; this.wake(); });

        const scene = new THREE.Scene();
        scene.environment = studioEnv(THREE, R);
        // key softbox (front-left, above) casts the only shadows, as in the Blender studio; fill and rim are shadowless
        const key = new THREE.DirectionalLight(0xfffaf3, 2.2);
        key.position.set(-0.7, 1.75, 0.6).normalize().multiplyScalar(2.2); key.target.position.set(0, 0.06, 0);
        key.castShadow = true; const ms = coarse ? 1024 : 2048; key.shadow.mapSize.set(ms, ms);
        Object.assign(key.shadow.camera, { left: -0.3, right: 0.3, top: 0.3, bottom: -0.3, near: 1.2, far: 3.4 });
        key.shadow.bias = -0.0004; key.shadow.normalBias = 0.0012; key.shadow.radius = 3;
        const fill = new THREE.DirectionalLight(0xf3f6ff, 0.35); fill.position.set(1.55, 0.7, 0.95);
        const rim = new THREE.DirectionalLight(0xffffff, 0.55); rim.position.set(0.55, 0.85, -1.35);
        scene.add(key, key.target, fill, rim);

        const gltf = await new GLTFLoader().loadAsync(GLB);
        const group = new THREE.Group(); scene.add(group);
        const root = gltf.scene; group.add(root);
        const aniso = Math.min(8, R.capabilities.getMaxAnisotropy());
        root.traverse(o => {
          if (o.isMesh) {
            o.castShadow = o.receiveShadow = true;
            const m = o.material; m.side = THREE.FrontSide; m.envMapIntensity = 0.85; m.aoMapIntensity = 1;
            for (const t of [m.map, m.normalMap, m.roughnessMap, m.aoMap]) if (t) { t.anisotropy = aniso; t.needsUpdate = true; }
          }
        });
        root.updateMatrixWorld(true);
        ORDER.forEach(k => { const n = root.getObjectByName(NODE[k]); if (n) { const v = new THREE.Vector3(); n.getWorldPosition(v); this.anchors[k] = [v.x, v.y, v.z]; } });

        // baked floor shadow (Cycles, same studio): turns with the block
        const stex = await new THREE.TextureLoader().loadAsync(SHADOW_TEX);
        stex.colorSpace = THREE.NoColorSpace;
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(SHADOW.s, SHADOW.s),
          new THREE.MeshBasicMaterial({ color: 0x14110e, alphaMap: stex, transparent: true, depthWrite: false, toneMapped: false }));
        sh.rotation.x = -Math.PI / 2; sh.position.set(SHADOW.c[0], 0.0004, SHADOW.c[1]); sh.renderOrder = -1;
        group.add(sh);

        const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
        this.three = { THREE, R, scene, cam, group };
        this.applyCamera();
        this.ready = true;
        this.bindDrag();
        this.dirty = true;
        if (this.intro === 'none' && this.ratio >= 0.25) this.start();
        else if (this.el.classList.contains('is-poster')) this.reveal();
        this.wake();
      } catch (e) {
        console.warn('hb3d: staying on the poster', e);
        this.failed = true;
      }
    }

    applyCamera() {
      const { cam } = this.three, f = this.fr, n = cam.near;
      cam.position.set(this.C[0] + this.camOff[0], this.C[1] + this.camOff[1], this.C[2] + this.camOff[2]);
      cam.rotation.set(0, 0, 0); cam.updateMatrixWorld(true);
      cam.projectionMatrix.makePerspective(f.uL * n, f.uR * n, f.vT * n, f.vB * n, n, cam.far);
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    }

    render() {
      const T = this.three; if (!T || this.lost || !this.W) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.2e6 / (this.W * this.H)));
      const w = Math.round(this.W * dpr), h = Math.round(this.H * dpr);
      if (this.cv.width !== w || this.cv.height !== h) { T.R.setPixelRatio(dpr); T.R.setSize(this.W, this.H, false); }
      T.group.rotation.y = this.yaw; T.group.scale.setScalar(this.scale);
      this.applyCamera();
      T.R.render(T.scene, T.cam);
      if (!this.live) { this.live = true; this.el.classList.add('is-3d'); }
    }

    /* ---------- timeline ---------- */
    // the block arrives (fade, slight scale, camera settles), then the labels one by one, each drawing its line
    start() {
      if (this.intro !== 'none') return;
      this.el.classList.add('is-in');
      if (!this.ready) this.el.classList.add('is-poster');            // model still on its way: the Cycles still stands in
      if (reduce) { this.intro = 'done'; this.el.classList.add('is-done'); this.dirty = true; this.wake(); return; }
      this.intro = this.ready ? 'full' : 'poster';
      this.t0 = performance.now(); this.wake();
    }
    // model arrived after the poster was already on show: cross-fade, no second entrance
    reveal() { this.el.classList.add('is-swap'); this.dirty = true; this.wake(); }

    tick(now) {
      this.raf = 0; const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now;
      let busy = false, t = null;
      if (this.intro === 'full' || this.intro === 'poster') {
        t = (now - this.t0) / 1000;
        if (this.intro === 'full') {
          const pb = easeOut(clamp((t - 0.05) / 0.95)), pc = easeInOut(clamp(t / 1.7));
          this.cv.style.opacity = pb.toFixed(3); this.scale = 0.975 + 0.025 * pb;
          this.camOff = [0.07 * (1 - pc), -0.05 * (1 - pc), 0.22 * (1 - pc)];
        }
        if (t > 2.3) { this.intro = 'done'; t = null; this.cv.style.opacity = ''; this.scale = 1; this.camOff = [0, 0, 0]; this.el.classList.add('is-done'); }
        busy = true; this.dirty = true;
      }
      // turning: follow the pointer, then ease home a moment after it lets go
      if (!this.drag && this.yawT !== 0 && now - this.lastTouch > 1500) this.yawT = 0;
      const dy = this.yawT - this.yaw;
      if (Math.abs(dy) > 0.0004) { this.yaw += reduce ? dy : dy * (1 - Math.exp(-dt * (this.drag ? 14 : 4.5))); busy = true; this.dirty = true; }
      else if (this.yaw !== this.yawT) { this.yaw = this.yawT; this.dirty = true; }
      if (this.drag || this.yawT !== 0) busy = true;
      if (this.dirty) { this.dirty = false; this.render(); this.overlay(this.intro === 'none' ? 0 : t); }
      if (busy && this.vis) this.wake();
    }
    paint() { this.dirty = true; this.wake(); }
    wake() { if (!this.raf && this.vis && !document.hidden) { this.last = performance.now(); this.raf = requestAnimationFrame(n => this.tick(n)); } }

    /* ---------- limited turn (pointer / touch: horizontal only, vertical scroll passes through) ---------- */
    bindDrag() {
      const st = this.stage;
      st.classList.add('can-turn');
      st.addEventListener('pointerdown', e => {
        if (e.button > 0 || !this.ready) return;
        this.drag = { x: e.clientX, y: e.clientY, yaw: this.yawT, id: e.pointerId, touch: e.pointerType !== 'mouse', on: e.pointerType === 'mouse' };
        if (this.drag.on) { st.setPointerCapture(e.pointerId); st.classList.add('is-drag'); }
      });
      st.addEventListener('pointermove', e => {
        const d = this.drag; if (!d || e.pointerId !== d.id) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.on) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3) { d.on = true; d.x = e.clientX; st.setPointerCapture(e.pointerId); st.classList.add('is-drag'); } else if (Math.abs(dy) > 10) { this.drag = null; } return; }
        this.yawT = clamp(d.yaw + (dx / this.W) * 1.1, YAW[0], YAW[1]); this.lastTouch = performance.now(); this.wake();
      });
      const end = e => { if (this.drag && e.pointerId === this.drag.id) { this.drag = null; st.classList.remove('is-drag'); this.lastTouch = performance.now(); this.wake(); } };
      st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
    }

    destroy() {
      const T = this.three; if (!T) return;
      T.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); } });
      if (T.scene.environment) T.scene.environment.dispose();
      T.R.dispose(); this.three = null;
    }
  }

  /* studio environment: dim warm-grey room with a large key softbox (front-left, above), a fill panel and a rim strip */
  function studioEnv(THREE, R) {
    const s = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 p;void main(){float h=normalize(p).y;vec3 c=mix(vec3(.42,.415,.40),vec3(.78,.78,.77),smoothstep(-.2,.7,h));gl_FragColor=vec4(c,1.);}',
    }));
    s.add(room);
    const panel = (w, h, pos, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m); };
    panel(4.2, 3.2, [-2.6, 6.2, 2.2], 3.2);    // key softbox
    panel(4.5, 3.0, [6, 2.5, 3.6], 1.1);       // fill
    panel(3.0, 1.2, [2, 3, -5.5], 1.8);        // rim
    const pm = new THREE.PMREMGenerator(R), tex = pm.fromScene(s, 0.04).texture; pm.dispose();
    s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return tex;
  }

  /* ---------- wiring ---------- */
  const all = figs.map(el => new Fig(el));
  const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { near.unobserve(e.target); e.target.__hb3d.boot(); } }), { rootMargin: '900px 0px' });
  const seen = new IntersectionObserver(es => es.forEach(e => {
    const f = e.target.__hb3d; f.vis = e.isIntersecting; f.ratio = e.intersectionRatio;
    if (f.vis) { if (f.ratio >= 0.25) f.start(); f.paint(); }
  }), { threshold: [0, 0.25] });
  all.forEach(f => { f.el.__hb3d = f; near.observe(f.el); seen.observe(f.el); f.overlay(0); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) all.forEach(f => f.paint()); });
  window.addEventListener('pagehide', e => { if (!e.persisted) all.forEach(f => f.destroy()); });
})();
