/* OM GROUP · "Aggregate between reinforcement bars" box (10 mm aggregates page, rebar lab) — one figure: <div class="rb3d" data-rb3d> … </div>.
   See rebar3d/rebar-box.css.

   Pipeline
   - Blender (scripts/rebar3d/build-rebar-box.py): the steel box (posts, lintel, back panel, feet), the orange-lidded stainless funnel, three
     bars seen end-on over a ribbed bar, a lower row, and three layers of fractured stone (large on the bars, large on the lower row, the
     10 mm bed), exported as /assets/3d/rebar-box.glb (stones as EXT_mesh_gpu_instancing). The Cycles still of the same scene (poster)
     is the loading state; the empty studio is the stage background.
   - three.js (here): renders that GLB live with the Blender camera (orthographic, pitched down 5 degrees), a studio environment, a key
     light with soft shadows, a baked contact shadow and a faint mirrored copy of the low parts as the floor reflection.
   - Motion: ONE variable, p. The page scroll drives it (the figure moving up the screen). At p = 0 the box is empty; stones leave the funnel and
     settle: the 10 mm bed first, then the large stones on the lower row, then the large stones on the bars. At p = 1 every stone is where it is in the
     Cycles still. Scrolling back lifts them out again. Reduced motion: no animation, the finished state.
   - Zones for the six considerations are an SVG overlay (.z-* classes, switched by the buttons next to the figure). */
(() => {
  'use strict';
  const els = [...document.querySelectorAll('[data-rb3d]')];
  if (!els.length) return;
  const V = '/assets/vendor/three/';
  const GLB = '/assets/3d/rebar-box.glb';
  const SHADOW_TEX = '/assets/3d/rebar-box-shadow.webp';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(hover: none)').matches;

  /* ---- shared with the Blender build (_review/rebar3d/meta.json); metres, three.js axes ---- */
  const M = {
    frame: { w: 1.465, h: 0.903, pitch: 5 * Math.PI / 180, cam: [0.0, 1.0942566877, 7.9695575847] },
    shadow: { c: [-0.14, -0.21], w: 1.3, d: 0.9 },
    funnel: { x: -0.14, z: -0.21, exitY: 0.58 },
    cx: -0.14,
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const TINT = { T: [0.88, 0.94, 1.08], M: [1.07, 0.99, 0.90], B: [0.90, 0.93, 0.98] };     // the same layer tints as the Blender still
  const SCHED = { B: [0.00, 0.40, 0.42], M: [0.20, 0.34, 0.40], T: [0.42, 0.28, 0.30] };    // layer: [first start, start spread, fall time] on the 0..1 run

  class Box {
    constructor(el) {
      this.el = el; this.stage = el.querySelector('.rb3d-stage'); this.cv = el.querySelector('.rb3d-cv');
      this.vis = false; this.ready = false; this.failed = false; this.booting = false;
      this.p = 0; this.pS = -1; this.dirty = true; this.raf = 0; this.last = 0; this.shadowDirty = true; this.lost = false;
      el.classList.add('is-js');
    }

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
        const R = new THREE.WebGLRenderer({ canvas: this.cv, antialias: false, alpha: true, powerPreference: 'high-performance' });
        R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = neutral ? THREE.CustomToneMapping : THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.2;
        R.shadowMap.enabled = true; R.shadowMap.autoUpdate = false; R.shadowMap.type = THREE.PCFSoftShadowMap; R.setClearColor(0x000000, 0);
        this.cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.el.classList.remove('is-3d'); this.el.classList.add('is-poster'); });
        this.cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.dirty = true; this.shadowDirty = true; this.wake(); });

        const scene = new THREE.Scene(); scene.environment = studioEnv(THREE, R); scene.environmentIntensity = 1;
        const cx = M.cx;
        const key = new THREE.DirectionalLight(0xfff6ea, 2.4); key.position.set(cx - 1.5, 2.5, 2.3); key.target.position.set(cx, 0.3, -0.2);
        key.castShadow = true; const ms = coarse ? 1024 : 2048; key.shadow.mapSize.set(ms, ms);
        Object.assign(key.shadow.camera, { left: -0.85, right: 0.85, top: 0.95, bottom: -0.45, near: 0.5, far: 8 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.002; key.shadow.radius = 3;
        const fill = new THREE.DirectionalLight(0xf4f6ff, 0.5); fill.position.set(cx + 2.6, 1.3, 2.6);
        const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(cx + 0.3, 2.1, -1.4);
        scene.add(key, key.target, fill, rim);

        const gltf = await new GLTFLoader().loadAsync(GLB);
        const root = gltf.scene; scene.add(root);
        const N = {}; root.traverse(o => { if (o.name) N[o.name] = o; });
        this.N = N; this.root = root;
        const aniso = Math.min(8, R.capabilities.getMaxAnisotropy());
        const rng = mulberry(11);
        this.layers = [];
        root.traverse(o => {
          if (!o.isMesh) return;
          o.castShadow = o.receiveShadow = true; o.frustumCulled = !o.isInstancedMesh;
          const m = o.material = o.material.clone();
          for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.emissiveMap]) if (t) t.anisotropy = aniso;
          const n = m.name;
          m.envMapIntensity = /stone/i.test(n) ? 0.9 : /orange/i.test(n) ? 0.3 : /chrome/i.test(n) ? 1.0 : /stainless/i.test(n) ? 1.5 : /machined/i.test(n) ? 1.2 : /rebar/i.test(n) ? 0.9 : /rear/i.test(n) ? 0.22 : /graphite|inner/i.test(n) ? 0.5 : /post/i.test(n) ? 0.8 : 1.0;
          if (/stainless/i.test(n)) m.roughness = Math.min(Math.max(m.roughness, 0.3), 0.5);
          if (/chrome/i.test(n)) m.roughness = 0.35;
          if (/orange/i.test(n)) { m.metalness = 0; m.roughness = Math.max(m.roughness, 0.6); }
          if (o.isInstancedMesh) this.layers.push(this.prepStones(o, rng));
        });
        // contact shadow baked in Blender (same studio), plus a faint mirrored copy of the low parts as the floor reflection
        const stex = await new THREE.TextureLoader().loadAsync(SHADOW_TEX); stex.colorSpace = THREE.NoColorSpace;
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(M.shadow.w, M.shadow.d), new THREE.MeshBasicMaterial({ color: 0x121214, alphaMap: stex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.85 }));
        sh.rotation.x = -Math.PI / 2; sh.position.set(M.shadow.c[0], 0.0006, M.shadow.c[1]); sh.renderOrder = -2; scene.add(sh);
        this.mirror = makeMirror(THREE, root, ['Feet', 'FeetFlange'], N); scene.add(this.mirror.group); this.mirror.fade.value = 1;

        const f = M.frame, cam = new THREE.OrthographicCamera(-f.w / 2, f.w / 2, f.h / 2, -f.h / 2, 0.1, 40);
        cam.position.set(...f.cam); cam.rotation.set(-f.pitch, 0, 0); cam.updateMatrixWorld(true);
        this.three = { R, scene, cam, key };
        // Warm-up, off screen: compile every shader in parallel (no main-thread stall) and draw one frame, so the first visible frame is cheap.
        await (R.compileAsync ? R.compileAsync(scene, cam) : Promise.resolve(R.compile(scene, cam)));
        await new Promise(r => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 600 }) : setTimeout(r, 80)));
        this.apply(reduce ? 1 : this.target()); this.render(true);
        this.ready = true; this.dirty = true; this.pS = reduce ? 1 : this.target(); this.apply(this.pS);
        this.wake();
      } catch (e) { console.warn('rb3d: staying on the poster', e); this.failed = true; this.el.classList.add('is-poster'); }
    }

    /* each stone: its finished pose (from the model), where it leaves the funnel, when it falls; per-instance tone and the layer tint */
    prepStones(im, rng) {
      const T = this.THREE, layer = { Top: 'T', Mid: 'M', Bottom: 'B' }[(/Aggregate(Top|Mid|Bottom)/.exec(im.name) || [0, 'Bottom'])[1]], n = im.count;
      const base = im.instanceMatrix.array.slice(), pos = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3(), mt = new T.Matrix4();
      const st = [], tint = TINT[layer], sch = SCHED[layer];
      for (let i = 0; i < n; i++) {
        mt.fromArray(base, i * 16).decompose(pos, q, sc);
        const a = rng() * 6.283, r0 = Math.sqrt(rng()) * 0.03;
        st.push({
          p: pos.clone(), q: q.clone(), s: sc.x,
          x0: M.funnel.x + Math.cos(a) * r0, y0: M.funnel.exitY - 0.01 - rng() * 0.05, z0: M.funnel.z + Math.sin(a) * r0,
          q0: new T.Quaternion().setFromEuler(new T.Euler(rng() * 6.3, rng() * 6.3, rng() * 6.3)),
          t0: sch[0] + sch[1] * rng(), d: sch[2] * (0.85 + 0.3 * rng()),
        });
        const t = 0.8 + 0.5 * rng(); im.setColorAt(i, new T.Color(t * tint[0], t * tint[1], t * tint[2]));
      }
      im.instanceColor.needsUpdate = true;
      return { im, st, pos: new T.Vector3(), q: new T.Quaternion(), sc: new T.Vector3(), m: new T.Matrix4() };
    }

    /* ---------- the settle (p: 0 empty .. 1 finished) ---------- */
    apply(p) {
      if (!this.layers) return;
      for (const L of this.layers) {
        const { im, st } = L, arr = im.instanceMatrix.array;
        for (let i = 0; i < st.length; i++) {
          const s = st[i], u = clamp((p - s.t0) / s.d);
          if (u <= 0) { L.sc.setScalar(0); L.pos.set(s.x0, s.y0, s.z0); L.q.copy(s.q0); }
          else if (u >= 1) { L.pos.copy(s.p); L.q.copy(s.q); L.sc.setScalar(s.s); }
          else {
            const e = easeOut(u), g = u * u;                                              // spread sideways early, fall under gravity
            L.pos.set(s.x0 + (s.p.x - s.x0) * e, s.y0 + (s.p.y - s.y0) * g, s.z0 + (s.p.z - s.z0) * e);
            L.q.copy(s.q0).slerp(s.q, e); L.sc.setScalar(s.s * sm(clamp(u / 0.22)));
          }
          L.m.compose(L.pos, L.q, L.sc); L.m.toArray(arr, i * 16);
        }
        im.instanceMatrix.needsUpdate = true;
      }
      this.shadowDirty = true;
      this.el.style.setProperty('--rb-l', String(sm(clamp((p - 0.72) / 0.28))));
    }

    /* the figure moving up the screen runs the settle: it starts as the figure's top passes 88 % of the viewport and ends at about 28 % */
    target() {
      if (reduce) return 1;
      const r = this.stage.getBoundingClientRect(), vh = innerHeight || 800;
      return clamp((vh * 0.88 - r.top) / (vh * 0.6));
    }

    tick(now) {
      this.raf = 0; const dt = Math.min(0.06, Math.max(0, (now - this.last) / 1000)); this.last = now; let busy = false;
      if (this.ready && !this.lost) {
        const tg = this.vis ? this.target() : this.pS, diff = tg - this.pS;
        if (Math.abs(diff) > 0.0006) { this.pS += reduce ? diff : diff * (1 - Math.exp(-dt * 7)); busy = true; this.dirty = true; } else if (this.pS !== tg) { this.pS = tg; this.dirty = true; }
        if (this.dirty) { this.dirty = false; this.apply(this.pS); this.render(); }
      }
      if (busy && this.vis) this.wake();
    }

    render(warm) {
      const T = this.three; if (!T) return; const w = this.stage.clientWidth, h = this.stage.clientHeight; if (!w || !h) return;
      const d0 = window.devicePixelRatio || 1;
      const dpr = Math.min(Math.max(d0, 2), Math.sqrt(4.5e6 / (w * h))), pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (this.cv.width !== pw || this.cv.height !== ph) { T.R.setPixelRatio(dpr); T.R.setSize(w, h, false); }
      if (this.shadowDirty) { T.R.shadowMap.needsUpdate = true; this.shadowDirty = false; }
      T.R.render(T.scene, T.cam);
      if (warm) return;
      if (!this.el.classList.contains('is-3d')) this.el.classList.add('is-3d');
    }
    wake() { if (!this.raf && this.vis && !document.hidden) { this.last = performance.now(); this.raf = requestAnimationFrame(n => this.tick(n)); } }
    destroy() {
      const T = this.three; if (!T) return;
      T.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); } });
      if (T.scene.environment) T.scene.environment.dispose(); T.R.dispose(); this.three = null;
    }
  }

  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* studio environment: a dark room with a large key softbox (front-left, above), top and rim panels, a bright frontal card and a soft glow,
     so steel gets a broad gradient instead of a grey wash */
  function studioEnv(THREE, R) {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 p;void main(){vec3 n=normalize(p);float h=n.y,az=atan(n.x,n.z);vec3 c=mix(vec3(.16,.165,.175),vec3(.40,.405,.42),smoothstep(-.1,.8,h));float fr=pow(max(0.,cos(az*.95)),3.)*smoothstep(-.2,.3,h)*(1.-smoothstep(.6,.98,h));gl_FragColor=vec4(c+vec3(1.5)*fr,1.);}',
    })));
    const panel = (w, h, pos, k, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0.3, 0); s.add(m); };
    panel(7, 4.2, [-5.5, 11, 8], 7.5, 0xfff6ea);       // key softbox
    panel(8, 3, [0, 13, 1], 4.5);                       // top
    panel(10, 1.6, [1, 9, -11], 4.5);                   // rim, behind
    panel(9, 7, [0, 4, -16], 1.1);                      // a dim wall behind the box
    panel(12, 6, [0, 2, 14], 2.4);                      // the front card
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
        m.customProgramCacheKey = () => 'rb-mirror';
        m.onBeforeCompile = sh => {
          sh.uniforms.uFade = fade;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWy = (modelMatrix * vec4(transformed, 1.0)).y;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWy;\nuniform float uFade;').replace('#include <opaque_fragment>', 'diffuseColor.a *= 0.22 * uFade * clamp(1.0 + vWy / 0.09, 0.0, 1.0);\n#include <opaque_fragment>');
        };
      });
    }
    group.renderOrder = -1; return { group, fade };
  }

  /* ---------- wiring ---------- */
  const all = els.map(el => { const f = new Box(el); el.__rb3d = f; return f; });
  const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { near.unobserve(e.target); e.target.__rb3d.boot(); } }), { rootMargin: '900px 0px' });
  const seen = new IntersectionObserver(es => es.forEach(e => {
    const f = e.target.__rb3d; f.vis = e.isIntersecting;
    if (f.vis) { f.dirty = true; f.wake(); }
  }), { threshold: [0, 0.01] });
  all.forEach(f => { f.stage.__rb3d = f; near.observe(f.el); seen.observe(f.stage); });
  addEventListener('scroll', () => all.forEach(f => { if (f.vis) f.wake(); }), { passive: true });
  addEventListener('resize', () => all.forEach(f => { f.dirty = true; f.wake(); }), { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) all.forEach(f => { f.dirty = true; f.wake(); }); });
  addEventListener('pagehide', e => { if (!e.persisted) all.forEach(f => f.destroy()); });
})();
