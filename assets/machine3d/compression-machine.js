/* OM GROUP · Aggregate compression testing machine (6mm aggregates page, paver section) — AggregateCompressionTestingMachine.
   One figure: <div class="cm3d" data-cm3d> … </div>. See machine3d/compression-machine.css.

   Pipeline
   - Blender (scripts/machine3d/build-compression-machine.py): the real machine — frame, columns, hydraulic cylinder and piston,
     orange platen, steel chamber, four helical springs, console with screen, buttons, logo and a corrugated cable — plus ~10 fractured
     rocks placed by deterministic gravity packing. Exported as /assets/3d/aggregate-compression-machine.glb (stones as
     EXT_mesh_gpu_instancing). The Cycles still of the same scene (poster) is the loading state.
   - three.js (here): renders that GLB live with a camera that is the Blender camera (orthographic, pitched down 7°), studio
     environment + key light with soft shadows, a baked contact shadow and a faint mirrored copy of the low parts as the floor
     reflection. The poster, the live canvas and the zone overlay all share one frame (1754 × 897), so they line up exactly.
   - Motion: ONE timeline. The reveal builds the machine up in five steps; afterwards the platen is driven by the page scroll
     (the figure moving from low to centre on screen presses the aggregate by a few millimetres; scrolling back releases it).
     Springs and chamber settle with the load; the aggregate compresses (instance matrices), the console screen plots the run.
   - Loading: nothing blocks the page; the poster shows while three.js and the model load (they start ~900 px before the figure).
   Reduced motion: no reveal, no scroll-driven press; the machine stands in the reference pose. */
(() => {
  'use strict';
  const els = [...document.querySelectorAll('[data-cm3d]')];
  if (!els.length) return;
  const V = '/assets/vendor/three/';
  const GLB = '/assets/3d/aggregate-compression-machine.glb';
  const SHADOW_TEX = '/assets/3d/compression-machine-shadow.webp';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(hover: none)').matches;

  /* ---- shared with the Blender build (meta.json); metres, three.js axes ---- */
  const M = {
    frame: { w: 1.754, h: 0.897, pitch: 7 * Math.PI / 180, cam: [0.0255, 1.33715, 7.94037] },
    shadow: { c: [0.07, 0.0], w: 2.0, d: 0.95 },
    bed: { bot: 0.17839, top: 0.534 },
    spring: { h: 0.05537 },
    travel: 0.052,      // how far the platen comes down from the reference pose
    contact: 0.0058,    // free travel before it touches the stones
    drop: 0.004,        // the chamber settles on its springs by this much at full load
  };
  const GROUPS = [   // reveal order (step 2..6 of the brief): [names, start s, duration s]
    [['MainFrame', 'Foundation'], 0.10, 0.65],
    [['HydraulicCylinder', 'PressAssembly'], 0.50, 0.65],
    [['ChamberAssembly'], 0.90, 0.65],
    [['Springs'], 1.30, 0.55],
    [['ControlConsole', 'CorrugatedCable', 'CableGland', 'CableGlandConsole'], 1.55, 0.65],
  ];
  const INTRO = 2.5;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ---- console screen (same artwork as the Blender still, drawn live so the text stays sharp) ---- */
  const SCR = { w: 1312, h: 800 };
  const curve = t => (t < 0.8 ? Math.pow(t / 0.8, 2.1) : 1 - 0.2 * Math.pow((t - 0.8) / 0.2, 1.5));
  function drawScreen(ctx, prog) {   // prog: null = the finished result (reference), 0..1 = the run in progress
    const { w, h } = SCR, OR = '#FF5E29', t = prog == null ? 1 : prog;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#25282d'); g.addColorStop(1, '#17191c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const sans = '"Inter","Segoe UI",Arial,Helvetica,sans-serif';
    ctx.fillStyle = '#f3f3f1'; ctx.font = '600 76px ' + sans; ctx.textBaseline = 'alphabetic'; ctx.fillText('Compression Test', 46, 112);
    const gx = 70, gy = 280, gw = 700, gh = 400;
    ctx.strokeStyle = '#4a4f57'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy - 20); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw + 20, gy + gh); ctx.stroke();
    ctx.strokeStyle = '#2f343a'; ctx.lineWidth = 2; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(gx, gy + gh - i * gh / 4); ctx.lineTo(gx + gw, gy + gh - i * gh / 4); ctx.stroke(); }
    ctx.fillStyle = '#6d737c'; for (let i = 0; i <= 4; i++) ctx.fillRect(gx + i * gw / 4 - 1, gy + gh + 8, 3, 12);
    ctx.strokeStyle = OR; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    const n = Math.max(1, Math.round(60 * t)); let peak = 0;
    for (let i = 0; i <= n; i++) { const tt = Math.min(t, i / 60 + (i === n ? t - n / 60 : 0)), y = curve(tt); peak = Math.max(peak, y); const X = gx + tt * gw, Y = gy + gh - y * gh * 0.86; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke();
    if (prog != null && t > 0) { const y = curve(t), X = gx + t * gw, Y = gy + gh - y * gh * 0.86; ctx.fillStyle = OR; ctx.beginPath(); ctx.arc(X, Y, 13, 0, 6.2832); ctx.fill(); }
    const load = prog == null ? 412.5 : 412.5 * peak, stress = prog == null ? 38.6 : 38.6 * peak;
    ctx.fillStyle = '#c4c8cd'; ctx.font = '500 44px ' + sans; ctx.fillText('Load (kN)', 850, 262); ctx.fillText('Stress (MPa)', 850, 514);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 92px ' + sans; ctx.fillText(load.toFixed(1), 850, 366); ctx.fillText(stress.toFixed(1), 850, 618);
  }

  class Machine {
    constructor(el) {
      this.el = el; this.stage = el.querySelector('.cm3d-stage'); this.cv = el.querySelector('.cm3d-cv');
      this.vis = false; this.ratio = 0; this.ready = false; this.failed = false; this.intro = 'none'; this.t0 = 0;
      this.pS = 0; this.force = null; this.dirty = true; this.raf = 0; this.last = 0; this.k = 0; this.scr = null; this.scrP = -1; this.q = 1; this.moving = false; this.gapAvg = 16; this.nGap = 0; this.lastBusy = 0; this.shadowDirty = true; this.lastD = -1;
      el.classList.add('is-js');
      // Pinned runway: the stage stays in place for about one screen of extra scrolling while the press plays, so the change can be seen
      // (without it the figure scrolled past before anything visibly moved). Not for reduced motion: there the machine just stands.
      if (!reduce) el.classList.add('is-pin');
      const fit = () => { el.style.setProperty('--cm-h', this.stage.offsetHeight + 'px'); el.style.setProperty('--cm-run', Math.round(innerHeight * 0.75) + 'px'); this.pinTop = parseFloat(getComputedStyle(this.stage).top) || 0; };
      fit(); new ResizeObserver(() => { fit(); this.dirty = true; this.wake(); }).observe(this.stage);
      addEventListener('resize', fit, { passive: true });
    }

    /* ---------- three.js ---------- */
    async boot() {
      if (this.booting) return; this.booting = true;
      try {
        const probe = document.createElement('canvas');   // no WebGL: stay on the Cycles still, without loading three.js or the model
        if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { this.failed = true; this.el.classList.add('is-poster'); return; }
        const [THREE, { GLTFLoader }] = await Promise.all([import(V + 'three.module.min.js'), import(V + 'GLTFLoader.js')]);
        this.THREE = THREE;
        // Khronos PBR Neutral tone curve (the same view transform as the Blender still): keeps the brand orange true under bright lights
        const NEUTRAL = 'vec3 CustomToneMapping( vec3 color ) {\n  color *= toneMappingExposure;\n  const float StartCompression = 0.8 - 0.04; const float Desaturation = 0.15;\n  float x = min( color.r, min( color.g, color.b ) );\n  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;\n  color -= offset;\n  float peak = max( color.r, max( color.g, color.b ) );\n  if ( peak < StartCompression ) return color;\n  float d = 1. - StartCompression;\n  float newPeak = 1. - d * d / ( peak + d - StartCompression );\n  color *= newPeak / peak;\n  float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );\n  return mix( color, vec3( newPeak ), g );\n}';
        const stub = 'vec3 CustomToneMapping( vec3 color ) { return color; }', ch = THREE.ShaderChunk.tonemapping_pars_fragment, neutral = ch.includes(stub);
        if (neutral) THREE.ShaderChunk.tonemapping_pars_fragment = ch.replace(stub, NEUTRAL);
        // MSAA only where it is visible: on high-density screens the extra resolution already smooths edges and MSAA just costs fill rate
        const R = new THREE.WebGLRenderer({ canvas: this.cv, antialias: false, alpha: true, powerPreference: 'high-performance' });
        R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = neutral ? THREE.CustomToneMapping : THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.22;
        R.shadowMap.enabled = true; R.shadowMap.autoUpdate = false; R.shadowMap.type = THREE.PCFSoftShadowMap; R.setClearColor(0x000000, 0);   // shadows are redrawn only when something moved (see render)
        this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.el.classList.remove('is-3d'); this.el.classList.add('is-poster'); });
        this.cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.dirty = true; this.wake(); });

        const scene = new THREE.Scene(); scene.environment = studioEnv(THREE, R); scene.environmentIntensity = 1;
        const key = new THREE.DirectionalLight(0xfff6ea, 2.3); key.position.set(-1.5, 2.5, 2.3); key.target.position.set(0, 0.3, 0);
        key.castShadow = true; const ms = coarse ? 1024 : 1536; key.shadow.mapSize.set(ms, ms);
        Object.assign(key.shadow.camera, { left: -1.25, right: 1.25, top: 1.0, bottom: -1.0, near: 0.5, far: 8 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.0025; key.shadow.radius = 3;
        const fill = new THREE.DirectionalLight(0xf4f6ff, 0.55); fill.position.set(2.6, 1.3, 2.2);
        const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(0.3, 2.1, -1.4);
        scene.add(key, key.target, fill, rim);

        const gltf = await new GLTFLoader().loadAsync(GLB);
        const root = gltf.scene; scene.add(root);
        const N = {}; root.traverse(o => { if (o.name) N[o.name] = o; });
        this.N = N; this.root = root;
        const aniso = Math.min(8, R.capabilities.getMaxAnisotropy());
        const rng = mulberry(7);
        root.traverse(o => {
          if (!o.isMesh) return;
          o.castShadow = o.receiveShadow = true; o.frustumCulled = !o.isInstancedMesh;
          const m = o.material = o.material.clone();
          for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.emissiveMap]) if (t) { t.anisotropy = aniso; }
          m.envMapIntensity = /stone/i.test(m.name) ? 1.0 : /console/i.test(m.name) ? 1.0 : /orange/i.test(m.name) ? 0.35 : /chrome/i.test(m.name) ? 0.8 : /stainless|machined/i.test(m.name) ? 1.0 : /graphite|chamber/i.test(m.name) ? 1.3 : 1.0;
          if (/stainless|machined/i.test(m.name)) m.roughness = 1.9;   // the glTF roughness map averages ~.1; a broader lobe turns the lights' sharp lines into soft bands, like a softbox
          if (/chrome/i.test(m.name)) m.roughness = 1.5;
          if (/orange/i.test(m.name)) { m.metalness = 0; m.roughness = Math.max(m.roughness, 0.9); m.color.multiplyScalar(0.8); }   // matte powder-coat: keeps the brand orange under the overhead light
          if (m.name === 'RearPlate') m.envMapIntensity = 0.5;
          if (o.isInstancedMesh) {
            // per-stone tone, as in the Blender still
            for (let i = 0; i < o.count; i++) { const t = 0.8 + 0.5 * rng(); o.setColorAt(i, new THREE.Color(t, t * 0.995, t * 0.985)); }
            o.instanceColor.needsUpdate = true;
            o.userData.base = o.instanceMatrix.array.slice(); this.stones = (this.stones || []).concat(o);
          }
        });
        // live screen
        const glass = N.Touchscreen; if (glass) {
          const cvs = document.createElement('canvas'); cvs.width = SCR.w; cvs.height = SCR.h; this.scrCtx = cvs.getContext('2d');
          drawScreen(this.scrCtx, null);
          const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = aniso; this.scr = tex;
          Object.assign(glass.material, { emissiveMap: tex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.95, map: null, color: new THREE.Color(0x050607), roughness: 0.14, metalness: 0 });
          glass.material.needsUpdate = true; glass.castShadow = false;
          document.fonts && document.fonts.ready.then(() => { drawScreen(this.scrCtx, this.scrP > 0.004 && this.scrP < 0.996 ? this.scrP : null); tex.needsUpdate = true; this.dirty = true; this.wake(); });
        }
        const logo = N.OMGroupBranding; if (logo) { logo.material.transparent = true; logo.material.userData.keepTransparent = true; logo.material.depthWrite = false; logo.material.polygonOffset = true; logo.material.polygonOffsetFactor = -2; logo.castShadow = false; logo.receiveShadow = false; }

        // contact shadow baked in Blender (same studio), plus a faint mirrored copy of the low parts as the floor reflection
        const stex = await new THREE.TextureLoader().loadAsync(SHADOW_TEX); stex.colorSpace = THREE.NoColorSpace;
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(M.shadow.w, M.shadow.d), new THREE.MeshBasicMaterial({ color: 0x121214, alphaMap: stex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }));
        sh.rotation.x = -Math.PI / 2; sh.position.set(M.shadow.c[0], 0.0006, M.shadow.c[1]); sh.renderOrder = -2; scene.add(sh); this.shadow = sh;
        this.mirror = makeMirror(THREE, root, ['MainFrame', 'Foundation', 'Springs', 'ControlConsole', 'LowerPlatformGroup', 'CorrugatedCable'], N);
        scene.add(this.mirror.group);

        const f = M.frame, cam = new THREE.OrthographicCamera(-f.w / 2, f.w / 2, f.h / 2, -f.h / 2, 0.1, 40);
        cam.position.set(...f.cam); cam.rotation.set(-f.pitch, 0, 0); cam.updateMatrixWorld(true);
        this.three = { R, scene, cam, key, fill, rim };
        // reveal groups: own materials, so each can fade on its own
        this.groups = GROUPS.map(([names, s, d]) => { const meshes = []; names.forEach(n => N[n] && N[n].traverse(o => { if (o.isMesh) meshes.push(o); })); return { meshes, s, d }; });
        // Warm-up, off screen and before the figure can be seen: compile every shader in parallel (no main-thread stall) and draw one frame
        // so textures, buffers and the shadow map are already on the GPU when the figure scrolls into view. Without this the first frames
        // took seconds and froze scrolling.
        // The reveal fades parts with opacity, which flips `transparent` and would make three.js rebuild shaders mid-animation: compile both variants now.
        const fading = []; this.groups.forEach(g => g.meshes.forEach(m => { if (!m.material.userData.keepTransparent) fading.push(m.material); }));
        const comp = () => (R.compileAsync ? R.compileAsync(scene, cam) : Promise.resolve(R.compile(scene, cam)));
        fading.forEach(mt => { mt.transparent = true; mt.needsUpdate = true; }); await comp();
        fading.forEach(mt => { mt.transparent = false; mt.needsUpdate = true; }); await comp();
        await new Promise(r => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 600 }) : setTimeout(r, 80)));
        this.shadowDirty = true; this.applyPress(0); this.render(true);
        this.ready = true; this.dirty = true;
        if (this.intro === 'none' && this.ratio >= 0.7) this.start(); else if (this.el.classList.contains('is-poster') && this.intro !== 'none') this.swap();
        this.wake();
      } catch (e) { console.warn('cm3d: staying on the poster', e); this.failed = true; this.el.classList.add('is-poster'); }
    }

    /* ---------- timeline ---------- */
    start() {
      if (this.intro !== 'none') return; this.el.classList.add('is-in');
      if (this.failed) { this.intro = 'done'; return; }
      if (!this.ready) { this.el.classList.add('is-poster'); this.intro = 'poster'; return; }   // model still on its way: the Cycles still stands in
      if (reduce) { this.intro = 'done'; this.setReveal(null); this.dirty = true; this.wake(); return; }
      this.intro = 'run'; this.t0 = performance.now(); this.setReveal(0); this.wake();
    }
    seek(t) {   // test hook: draw the reveal at time t (seconds); null = finished
      if (!this.ready) return; this.intro = 'done'; this.setReveal(t); this.applyPress(this.pS); this.render();
    }
    swap() { this.intro = 'done'; this.setReveal(null); this.dirty = true; }       // model arrived after the poster was shown: cross-fade, no second entrance

    setReveal(t) {   // t in seconds; null = finished
      const mats = new Set();
      for (const g of this.groups) {
        const a = t == null ? 1 : easeOut(clamp((t - g.s) / g.d));
        for (const m of g.meshes) { const mt = m.material; if (!mt.userData.keepTransparent) { const was = mt.transparent; mt.transparent = a < 1; if (mt.transparent !== was) mt.needsUpdate = true; } mt.opacity = a; m.visible = a > 0.001; mats.add(mt); }
      }
      this.shadowDirty = true;
      const e = t == null ? 1 : easeOut(clamp(t / INTRO));
      this.three.R.toneMappingExposure = 0.9 + 0.32 * e; this.mirror.fade.value = t == null ? 1 : easeOut(clamp((t - 1.0) / 1.2));
    }

    /* ---------- press (scroll-driven) ---------- */
    target() {
      if (this.force != null) return this.force; if (reduce) return 0;
      const r = this.el.getBoundingClientRect(), runway = r.height - this.stage.offsetHeight;
      if (runway < 40) return 0;
      const s = clamp((this.pinTop - r.top) / runway);          // 0 when the stage pins, 1 when it lets go
      return clamp((s - 0.1) / 0.72);                            // hold the reference pose first, press over the middle, hold pressed at the end
    }
    applyPress(p) {
      const N = this.N, e = sm(p), D = M.travel * e;
      const free = Math.min(D, M.contact), push = Math.max(0, D - M.contact);
      const d = M.drop * sm(clamp(push / (M.travel - M.contact)));
      if (D !== this.lastD) { this.lastD = D; this.shadowDirty = true; }   // the platen and chamber cast shadows: redraw the shadow map only when they moved
      N.PressAssembly.position.y = -D; N.ChamberAssembly.position.y = -d;
      const sy = (M.spring.h - d) / M.spring.h; for (let i = 1; i <= 4; i++) { const s = N['Spring_0' + i]; if (s) s.scale.y = sy; }
      const k = clamp(Math.max(0, push - d) / (M.bed.top - M.bed.bot), 0, 0.2);
      if (Math.abs(k - this.k) > 1e-6) { this.k = k; this.squeeze(k); }
      this.drawScr(p);
    }
    squeeze(k) {     // the bed compresses toward its floor; stones keep their size (instance matrices only)
      for (const im of this.stones || []) {
        const a = im.instanceMatrix.array, b = im.userData.base, f = M.bed.bot;
        for (let i = 13; i < a.length; i += 16) a[i] = f + (b[i] - f) * (1 - k);
        im.instanceMatrix.needsUpdate = true;
      }
    }
    drawScr(p) {
      if (!this.scr) return; const live = p > 0.004 && p < 0.996, key = live ? Math.round(p * 120) / 120 : (p >= 0.996 ? 1.5 : -0.5);
      if (key === this.scrP) return; this.scrP = key; drawScreen(this.scrCtx, live ? p : null); this.scr.needsUpdate = true;
    }

    /* ---------- loop ---------- */
    tick(now) {
      this.raf = 0; const dt = Math.min(0.06, Math.max(0, (now - this.last) / 1000)); this.last = now; let busy = false;
      if (this.ready && !this.lost && this.intro !== 'none') {
        if (this.intro === 'run') { const t = (now - this.t0) / 1000; if (t >= INTRO) { this.intro = 'done'; this.setReveal(null); } else this.setReveal(t); busy = true; this.dirty = true; }
        const tg = this.vis ? this.target() : this.pS, diff = tg - this.pS;
        if (Math.abs(diff) > 0.0004) { this.pS += reduce ? diff : diff * (1 - Math.exp(-dt * 6)); busy = true; this.dirty = true; } else if (this.pS !== tg) { this.pS = tg; this.dirty = true; }
        if (this.dirty) { this.dirty = false; this.applyPress(this.pS); this.render(); }
      }
      if (busy && this.vis) this.wake();
    }
    render(warm) {
      const T = this.three; if (!T) return; const w = this.stage.clientWidth, h = this.stage.clientHeight; if (!w || !h) return;
      const d0 = window.devicePixelRatio || 1;
      // always sharp, also while scrolling: at least 2x the screen's pixels (supersampling), within a pixel budget. The figure is medium sized,
      // so this stays cheap; a lower resolution while moving made it visibly soft mid-scroll.
      const dpr = Math.min(Math.max(d0, 2), Math.sqrt(4.5e6 / (w * h))), pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (this.cv.width !== pw || this.cv.height !== ph) { T.R.setPixelRatio(dpr); T.R.setSize(w, h, false); }
      if (this.shadowDirty) { T.R.shadowMap.needsUpdate = true; this.shadowDirty = false; }
      T.R.render(T.scene, T.cam);
      if (warm) return;
      if (!this.live) { this.live = true; this.el.classList.add('is-3d'); }
      else if (!this.el.classList.contains('is-3d')) this.el.classList.add('is-3d');
    }
    wake() { if (!this.raf && (this.vis || this.intro === 'run') && !document.hidden) { this.last = performance.now(); this.raf = requestAnimationFrame(n => this.tick(n)); } }
    destroy() {
      const T = this.three; if (!T) return;
      T.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); } });
      if (T.scene.environment) T.scene.environment.dispose(); T.R.dispose(); this.three = null;
    }
  }

  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* studio environment: dark room with a large key softbox (front-left, above), top and rim panels and a soft frontal glow,
     so polished steel gets a broad chrome gradient instead of a grey wash */
  function studioEnv(THREE, R) {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 p;void main(){vec3 n=normalize(p);float h=n.y,az=atan(n.x,n.z);vec3 c=mix(vec3(.11,.113,.12),vec3(.34,.345,.36),smoothstep(-.1,.8,h));float fr=pow(max(0.,cos(az*.95)),3.)*smoothstep(-.2,.3,h)*(1.-smoothstep(.6,.98,h));gl_FragColor=vec4(c+vec3(1.3)*fr,1.);}',
    })));
    const panel = (w, h, pos, k, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0.3, 0); s.add(m); };
    panel(7, 4.2, [-5.5, 11, 8], 7.5, 0xfff6ea);       // key softbox
    panel(8, 3, [0, 13, 1], 4.5);                       // top
    panel(10, 1.6, [1, 9, -11], 4.5);                   // rim, behind
    panel(9, 7, [0, 4, -16], 1.1);                      // a dim wall behind the machine
    const pm = new THREE.PMREMGenerator(R), tex = pm.fromScene(s, 0.03).texture; pm.dispose();
    s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return tex;
  }

  /* floor reflection: static mirrored clones of the lowest parts, fading out with depth under the floor */
  function makeMirror(THREE, root, names, N) {
    const group = new THREE.Group(); group.scale.y = -1; const fade = { value: 0 };
    root.updateMatrixWorld(true);
    for (const n of names) {
      const src = N[n]; if (!src) continue;
      const c = src.clone(true); c.applyMatrix4(src.parent.matrixWorld); group.add(c);
      c.traverse(o => {
        if (!o.isMesh) return; o.castShadow = o.receiveShadow = false;
        const m = o.material = o.material.clone(); m.transparent = true; m.depthWrite = false; m.userData.keepTransparent = true;
        m.customProgramCacheKey = () => 'cm-mirror';
        m.onBeforeCompile = sh => {
          sh.uniforms.uFade = fade;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWy = (modelMatrix * vec4(transformed, 1.0)).y;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWy;\nuniform float uFade;').replace('#include <opaque_fragment>', 'diffuseColor.a *= 0.2 * uFade * clamp(1.0 + vWy / 0.075, 0.0, 1.0);\n#include <opaque_fragment>');
        };
      });
    }
    group.renderOrder = -1; return { group, fade };
  }

  /* ---------- wiring ---------- */
  const all = els.map(el => { const f = new Machine(el); el.__cm3d = f; return f; });
  const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { near.unobserve(e.target); e.target.__cm3d.boot(); } }), { rootMargin: '900px 0px' });
  const seen = new IntersectionObserver(es => es.forEach(e => {
    const f = e.target.__cm3d; f.vis = e.isIntersecting; f.ratio = e.intersectionRatio;
    if (f.vis) { if (f.ratio >= 0.7) f.start(); f.dirty = true; f.wake(); }   // build up once most of it is on screen (it is then about to pin)
  }), { threshold: [0, 0.7] });
  all.forEach(f => { f.stage.__cm3d = f; near.observe(f.el); seen.observe(f.stage); });
  addEventListener('scroll', () => all.forEach(f => {
    if (!f.vis) return;
    if (f.intro === 'none' && f.stage.getBoundingClientRect().top <= f.pinTop + 6) f.start();   // very short screens never show 70 % of it: start when it pins
    f.wake();
  }), { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) all.forEach(f => { f.dirty = true; f.wake(); }); });
  addEventListener('pagehide', e => { if (!e.persisted) all.forEach(f => f.destroy()); });
})();
