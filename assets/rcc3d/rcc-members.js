/* OM GROUP · RCC members (20mm page, "20mm Aggregate and Reinforcement Clearance") — slab, beam, column as real 3D.
   One figure: <figure class="rcc3d" data-rcc3d data-member="slab"> … </figure>. See rcc3d/rcc-members.css.

   Pipeline
   - Blender (scripts/rcc3d/build-rcc-members.py) builds each member: bevelled concrete body with PBR concrete, aggregate sections cut flat at the face,
     one whole fractured stone, ribbed reinforcing bars standing proud of the cut face, stirrup (beam, column), distribution rods (slab).
     Exported as /assets/3d/rcc-{slab,beam,column}.glb plus /assets/3d/rcc-members.json (frames, dimension anchors, highlight stone).
     Cycles stills of the same scene (poster + soft shadow) are the loading state and the no-WebGL fallback.
   - three.js (here): renders the GLB with the Blender camera (orthographic, 9° down, 8° to the right). The dimension lines t / S / C and the
     highlight ring are an SVG overlay whose coordinates are PROJECTED from the 3D anchor points through the live camera, so they stay on
     the geometry (also while the camera drifts a few degrees with the pointer).
   - Motion: restrained. Reveal (concrete, aggregate, steel, dimension lines drawing themselves, ring), a crossfade when the member changes,
     a faint pointer-driven camera drift. Rendering is on demand (nothing runs while the figure is still).
   Reduced motion: no reveal, no drift, instant member change. */
(() => {
  'use strict';
  const fig = document.querySelector('[data-rcc3d]');
  if (!fig) return;
  const V = '/assets/vendor/three/', META = '/assets/3d/rcc-members.json', GLB = k => '/assets/3d/rcc-' + k + '.glb';
  const IMG = '/img/applications/20mm-aggregates/rcc-';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(hover: none)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const NAMES = { slab: 'Slab', beam: 'Beam', column: 'Column' };
  const ALT = {
    slab: 'Cut face of a reinforced concrete slab: two layers of ribbed steel bars with distribution rods, stones in the concrete, one stone between two bars highlighted',
    beam: 'Cut face of a reinforced concrete beam: stirrup, three bottom bars and two top bars, stones in the concrete, one stone between two bottom bars highlighted',
    column: 'Cut face of a reinforced concrete column: square stirrup, eight vertical bars, stones in the concrete, one stone between two top bars highlighted',
  };
  const DIM_TITLE = { t: 'Member size', s: 'Bar spacing', c: 'Cover' };

  const stage = fig.querySelector('.rcc3d-stage'), cv = fig.querySelector('.rcc3d-cv'), ov = fig.querySelector('.rcc3d-ov');
  const poster = fig.querySelector('.rcc3d-poster'), shadow = fig.querySelector('.rcc3d-shadow');
  const tabs = [...fig.querySelectorAll('[role="tab"]')];

  const S = { meta: null, THREE: null, R: null, scene: null, cam: null, key: null, models: {}, loading: {}, ready: false, failed: false, vis: false, started: false, k: 'slab',
              yaw: 0, pitch: 0, ty: 0, tp: 0, raf: 0, dirty: true, shadowDirty: true, reveal: -1, t0: 0, over: null, dims: [], ring: null, booting: false, swapping: 0 };
  fig.__rcc3d = S;

  /* ---------------------------------------------------------------- overlay (dimension lines + ring), projected from the 3D anchors */
  const el = (tag, cls, attrs) => { const e = document.createElementNS(NS, tag); if (cls) e.setAttribute('class', cls); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  function buildOverlay(k) {
    const m = S.meta.members[k]; ov.textContent = '';
    const g = el('g', 'rcc3d-dims'); ov.appendChild(g); S.dims = [];
    m.dims.forEach((d, i) => {
      const grp = el('g', 'rcc3d-dim d-' + d.id, { style: '--i:' + i });
      const ext1 = el('path', 'ext', { pathLength: 1 }), ext2 = el('path', 'ext', { pathLength: 1 });
      const line = el('path', 'line', { pathLength: 1 }), cap1 = el('path', 'cap', { pathLength: 1 }), cap2 = el('path', 'cap', { pathLength: 1 });
      const tx = el('text', 'lbl'); tx.textContent = { t: 't', s: 'S', c: 'C' }[d.id];
      const tt = el('title'); tt.textContent = DIM_TITLE[d.id]; grp.append(ext1, ext2, line, cap1, cap2, tx, tt); g.appendChild(grp);
      S.dims.push({ d, ext1, ext2, line, cap1, cap2, tx });
    });
    const ring = el('circle', 'rcc3d-ring'); ov.appendChild(ring); S.ring = ring;
    layout();
  }
  /* The Blender camera in plain maths: orthographic, looking at the frame target from yaw / pitch; (x, y, z) in metres -> stage units */
  const P3 = (x, y, z) => {
    const M = S.meta, m = M.members[S.k], f = m.frame, t = f.target, yw = M.yaw * Math.PI / 180 + S.yaw, pt = M.pitch * Math.PI / 180 + S.pitch;
    const cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(pt), sp = Math.sin(pt), dx = x - t[0], dy = y - t[1], dz = z - t[2];
    const u = dx * cy - dz * sy, v = -dx * sy * sp + dy * cp - dz * cy * sp, W = f.W_m, H = W * M.stage[1] / M.stage[0];
    return [(u / W + f.cx / M.stage[0]) * M.stage[0], (f.cy / M.stage[1] * H - v) / H * M.stage[1]];
  };
  const f1 = n => Math.round(n * 10) / 10;
  function layout() {
    if (!S.meta) return;
    const m = S.meta.members[S.k], sc = m.frame.scale, GAP = 5;
    for (const o of S.dims) {
      const d = o.d, A = P3(d.a[0] / 1000, d.a[1] / 1000, 0), B = P3(d.b[0] / 1000, d.b[1] / 1000, 0);
      const ea = d.ext ? P3(d.ext[0][0] / 1000, d.ext[0][1] / 1000, 0) : A, eb = d.ext ? P3(d.ext[1][0] / 1000, d.ext[1][1] / 1000, 0) : B;
      let line, caps, e1, e2, lx, ly, anchor = 'middle';
      if (d.dir === 'h') {
        const bottom = d.side === 'bottom', base = d.fromy != null ? P3(d.a[0] / 1000, d.fromy / 1000, 0)[1] : A[1], Y = base + (bottom ? d.off : -d.off), sg = bottom ? 1 : -1;
        line = `M${f1(A[0])} ${f1(Y)}H${f1(B[0])}`; caps = [`M${f1(A[0])} ${f1(Y - 7)}V${f1(Y + 7)}`, `M${f1(B[0])} ${f1(Y - 7)}V${f1(Y + 7)}`];
        e1 = `M${f1(A[0])} ${f1(base + sg * GAP)}V${f1(Y)}`; e2 = `M${f1(B[0])} ${f1(base + sg * GAP)}V${f1(Y)}`;
        lx = (A[0] + B[0]) / 2; ly = bottom ? Y + 31 : Y - 13;
      } else {
        const left = d.side === 'left', X = A[0] + (left ? -d.off : d.off), sg = left ? -1 : 1;
        line = `M${f1(X)} ${f1(A[1])}V${f1(B[1])}`; caps = [`M${f1(X - 7)} ${f1(A[1])}H${f1(X + 7)}`, `M${f1(X - 7)} ${f1(B[1])}H${f1(X + 7)}`];
        e1 = `M${f1(ea[0] + sg * (d.ext ? 0 : GAP))} ${f1(A[1])}H${f1(X)}`; e2 = `M${f1(eb[0] + sg * (d.ext ? 0 : GAP))} ${f1(B[1])}H${f1(X)}`;
        lx = X + sg * 14; ly = (A[1] + B[1]) / 2 + 10; anchor = left ? 'end' : 'start';
      }
      o.line.setAttribute('d', line); o.cap1.setAttribute('d', caps[0]); o.cap2.setAttribute('d', caps[1]); o.ext1.setAttribute('d', e1); o.ext2.setAttribute('d', e2);
      o.tx.setAttribute('x', f1(lx)); o.tx.setAttribute('y', f1(ly)); o.tx.setAttribute('text-anchor', anchor);
    }
    const h = m.highlight, C = P3(h.x / 1000, h.y / 1000, h.z), rr = (h.rmm + 7.5) * sc;
    S.ring.setAttribute('cx', f1(C[0])); S.ring.setAttribute('cy', f1(C[1])); S.ring.setAttribute('r', f1(rr));
  }

  /* ---------------------------------------------------------------- three.js */
  async function boot() {
    if (S.booting) return; S.booting = true;
    try {
      const meta = await (await fetch(META)).json(); S.meta = meta; buildOverlay(S.k);
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return fallback();
      const [THREE, { GLTFLoader }] = await Promise.all([import(V + 'three.module.min.js'), import(V + 'GLTFLoader.js')]);
      S.THREE = THREE; S.loader = new GLTFLoader();
      // Khronos PBR Neutral (the Blender view transform of the stills): keeps the cement colour and the brand orange true
      const NEUTRAL = 'vec3 CustomToneMapping( vec3 color ) {\n  color *= toneMappingExposure;\n  const float StartCompression = 0.8 - 0.04; const float Desaturation = 0.15;\n  float x = min( color.r, min( color.g, color.b ) );\n  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;\n  color -= offset;\n  float peak = max( color.r, max( color.g, color.b ) );\n  if ( peak < StartCompression ) return color;\n  float d = 1. - StartCompression;\n  float newPeak = 1. - d * d / ( peak + d - StartCompression );\n  color *= newPeak / peak;\n  float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );\n  return mix( color, vec3( newPeak ), g );\n}';
      const stub = 'vec3 CustomToneMapping( vec3 color ) { return color; }', ch = THREE.ShaderChunk.tonemapping_pars_fragment, neutral = ch.includes(stub);
      if (neutral) THREE.ShaderChunk.tonemapping_pars_fragment = ch.replace(stub, NEUTRAL);
      const R = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, powerPreference: 'high-performance' });
      R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = neutral ? THREE.CustomToneMapping : THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
      R.shadowMap.enabled = true; R.shadowMap.autoUpdate = false; R.shadowMap.type = THREE.PCFSoftShadowMap; R.setClearColor(0x000000, 0);
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); S.lost = true; fig.classList.remove('is-3d'); fig.classList.add('is-poster'); });
      cv.addEventListener('webglcontextrestored', () => { S.lost = false; S.dirty = true; S.shadowDirty = true; wake(); });
      const scene = new THREE.Scene(); scene.environment = studioEnv(THREE, R); scene.environmentIntensity = 1;
      const key = new THREE.DirectionalLight(0xfff6ea, 2.4); key.position.set(-.38, .55, 1.1).multiplyScalar(3); key.target.position.set(0, 0, -.03);
      key.castShadow = true; key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
      Object.assign(key.shadow.camera, { left: -.3, right: .3, top: .3, bottom: -.3, near: .5, far: 8 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.0008; key.shadow.radius = 2.2;
      const fill = new THREE.DirectionalLight(0xf4f6ff, .5); fill.position.set(2, .3, 2.2);
      scene.add(key, key.target, fill);
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .05, 20);
      Object.assign(S, { R, scene, cam, key });
      const root = await loadModel(S.k); root.visible = true; frame(S.k); place();
      // warm-up while the figure is still off screen: compile every shader (reveal fades the parts, which flips `transparent`, so both variants) and draw one frame
      const mats = fadeMats(root); const comp = () => (R.compileAsync ? R.compileAsync(scene, cam) : Promise.resolve(R.compile(scene, cam)));
      mats.forEach(m => { m.transparent = true; m.needsUpdate = true; }); await comp(); mats.forEach(m => { m.transparent = false; m.needsUpdate = true; }); await comp();
      await new Promise(r => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 600 }) : setTimeout(r, 80)));
      S.ready = true; S.dirty = S.shadowDirty = true; render(true);
      if (S.quiet) { setReveal(null); S.dirty = true; } else if (S.started) show();
      if (S.vis) wake();
      // the other two members, when the browser is idle
      const rest = ['slab', 'beam', 'column'].filter(x => x !== S.k);
      const next = () => { const x = rest.shift(); if (x) loadModel(x).then(() => (window.requestIdleCallback ? requestIdleCallback(next, { timeout: 2500 }) : setTimeout(next, 600))).catch(() => {}); };
      if (window.requestIdleCallback) requestIdleCallback(next, { timeout: 3000 }); else setTimeout(next, 1200);
    } catch (e) { console.warn('rcc3d: staying on the poster', e); fallback(); }
  }
  function fallback() { S.failed = true; fig.classList.add('is-poster'); if (S.vis) show(); }

  function loadModel(k) {
    if (S.models[k]) return Promise.resolve(S.models[k]);
    if (S.loading[k]) return S.loading[k];
    return (S.loading[k] = S.loader.loadAsync(GLB(k)).then(g => {
      const root = g.scene; root.visible = false; const aniso = Math.min(8, S.R.capabilities.getMaxAnisotropy());
      root.traverse(o => {
        if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
        const m = o.material = o.material.clone();
        for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap]) if (t) t.anisotropy = aniso;
        const n = m.name;
        m.envMapIntensity = /Concrete/.test(n) ? 1.0 : /Rebar/.test(n) ? 0.9 : 0.9;
      });
      S.scene.add(root); S.models[k] = root; return root;
    }));
  }
  const fadeMats = root => { const a = new Set(); root.traverse(o => { if (o.isMesh) a.add(o.material); }); return [...a]; };

  /* camera = the Blender camera, plus a small drift */
  function frame(k) {
    const m = S.meta.members[k], f = m.frame, [SW, SH] = S.meta.stage, W = f.W_m, H = W * SH / SW, fx = f.cx / SW, fy = f.cy / SH, c = S.cam;
    c.left = -fx * W; c.right = (1 - fx) * W; c.top = fy * H; c.bottom = -(1 - fy) * H; c.updateProjectionMatrix(); S.k = k;
  }
  function place() {
    const f = S.meta.members[S.k].frame, t = f.target, yw = (S.meta.yaw) * Math.PI / 180 + S.yaw, pt = (S.meta.pitch) * Math.PI / 180 + S.pitch;
    S.cam.position.set(t[0] + Math.sin(yw) * Math.cos(pt) * 6, t[1] + Math.sin(pt) * 6, t[2] + Math.cos(yw) * Math.cos(pt) * 6);
    S.cam.lookAt(t[0], t[1], t[2]); S.cam.updateMatrixWorld(true);
  }

  /* ---------------------------------------------------------------- reveal / member change */
  const GROUPS = [[/^Concrete$/, 0, .6], [/^Aggregate/, .35, .6], [/^(Rebar|Stirrup|Distribution)/, .65, .7]];
  function setReveal(t) {   // t seconds; null = finished
    const root = S.models[S.k]; if (!root) return;
    root.traverse(o => {
      if (!o.isMesh) return; const g = GROUPS.find(([re]) => re.test(o.name.replace(/_\d+$/, '')) || re.test(o.name)); if (!g) return;
      const a = t == null ? 1 : easeOut(clamp((t - g[1]) / g[2])), m = o.material, was = m.transparent;
      m.transparent = a < 1; if (m.transparent !== was) m.needsUpdate = true; m.opacity = a; o.visible = a > .001;
    });
    S.shadowDirty = true; fig.style.setProperty('--rcc-ring', t == null || t > 1.5 ? 1 : 0);
  }
  function show() {   // the figure is on screen for the first time and the model is ready (or WebGL is not available)
    if (S.shown) return; S.shown = true; fig.classList.add('is-in');
    if (S.failed || reduce) { fig.classList.add('is-drawn'); if (!S.failed) { setReveal(null); S.dirty = true; wake(); } return; }
    S.reveal = 0; S.t0 = performance.now(); setReveal(0); wake();
    setTimeout(() => fig.classList.add('is-drawn'), 1050);
  }
  async function swap(k) {
    if (k === S.k) { setTabs(k); return; }
    const token = ++S.swapping; setTabs(k); fig.classList.add('is-swap');
    poster.removeAttribute('srcset'); poster.src = IMG + k + '-poster-1400.webp'; shadow.src = IMG + k + '-shadow-1000.webp'; poster.alt = ''; stage.setAttribute('aria-label', ALT[k]);
    const wait = new Promise(r => setTimeout(r, reduce ? 0 : 200));
    let root = null;
    if (!S.failed && S.R) { try { [root] = await Promise.all([loadModel(k), wait]); } catch (e) { S.failed = true; fig.classList.add('is-poster'); } } else await wait;
    if (token !== S.swapping) return;
    fig.setAttribute('data-member', k);
    if (root) { for (const x in S.models) S.models[x].visible = x === k; setRevealFor(k); frame(k); place(); S.dirty = S.shadowDirty = true; }
    else S.k = k;
    S.k = k; buildOverlay(k); fig.classList.remove('is-drawn'); void fig.offsetWidth;
    render(); fig.classList.remove('is-swap'); fig.classList.add('is-drawn');
  }
  function setRevealFor(k) { const root = S.models[k]; root.traverse(o => { if (o.isMesh) { o.visible = true; o.material.opacity = 1; if (o.material.transparent) { o.material.transparent = false; o.material.needsUpdate = true; } } }); }
  function setTabs(k) { tabs.forEach(t => { const on = t.dataset.member === k; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; }); }

  /* ---------------------------------------------------------------- loop */
  function tick(now) {
    S.raf = 0; let busy = false;
    if (S.ready && !S.lost) {
      if (S.reveal >= 0) { const t = (now - S.t0) / 1000; if (t >= 1.5) { S.reveal = -1; setReveal(null); } else setReveal(t); busy = true; S.dirty = true; }
      const dy = S.ty - S.yaw, dp = S.tp - S.pitch;
      if (Math.abs(dy) > 1e-4 || Math.abs(dp) > 1e-4) { S.yaw += dy * .12; S.pitch += dp * .12; place(); layout(); S.dirty = true; busy = true; }
      else if (dy || dp) { S.yaw = S.ty; S.pitch = S.tp; place(); layout(); S.dirty = true; }
      if (S.dirty) { S.dirty = false; render(); }
    }
    if (busy && S.vis) wake();
  }
  function render(warm) {
    if (!S.R) return; const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    const d0 = window.devicePixelRatio || 1, dpr = Math.min(Math.max(d0, 2), Math.sqrt(4.5e6 / (w * h))), pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (cv.width !== pw || cv.height !== ph) { S.R.setPixelRatio(dpr); S.R.setSize(w, h, false); }
    if (S.shadowDirty) { S.R.shadowMap.needsUpdate = true; S.shadowDirty = false; }
    S.R.render(S.scene, S.cam);
    if (warm) return; if (!fig.classList.contains('is-3d')) fig.classList.add('is-3d');
  }
  function wake() { if (!S.raf && S.vis && !document.hidden) S.raf = requestAnimationFrame(tick); }

  /* ---------------------------------------------------------------- studio light room (bright, warm, soft) */
  function studioEnv(THREE, R) {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 p;void main(){vec3 n=normalize(p);float h=n.y;vec3 c=mix(vec3(.55,.54,.52),vec3(.95,.94,.92),smoothstep(-.3,.9,h));gl_FragColor=vec4(c,1.);}',
    })));
    const panel = (w, h, pos, k, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m); };
    panel(7, 5, [-6, 7, 9], 6, 0xfff6ea); panel(8, 3, [0, 12, 2], 3.5); panel(5, 6, [8, 1, 8], 1.6);
    const pm = new THREE.PMREMGenerator(R), tex = pm.fromScene(s, 0.03).texture; pm.dispose();
    s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return tex;
  }

  /* ---------------------------------------------------------------- wiring */
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => swap(t.dataset.member));
    t.addEventListener('keydown', e => {
      const n = tabs.length; let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + n - 1) % n;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
      if (j >= 0) { e.preventDefault(); tabs[j].focus(); swap(tabs[j].dataset.member); }
    });
  });
  if (!reduce && !coarse) {
    stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); S.ty = ((e.clientX - r.left) / r.width - .5) * 2 * .06; S.tp = ((e.clientY - r.top) / r.height - .5) * 2 * .035; wake(); });
    stage.addEventListener('pointerleave', () => { S.ty = 0; S.tp = 0; wake(); });
  }
  new ResizeObserver(() => { S.dirty = true; wake(); }).observe(stage);
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { boot(); } }), { rootMargin: '900px 0px' }).observe(fig);
  const seen = new IntersectionObserver(es => es.forEach(e => {
    S.vis = e.isIntersecting;
    if (S.vis) {
      if (!S.shown && !S.quiet) { S.started = true; if (S.ready || S.failed) show(); else { S.quiet = true; S.shown = true; fig.classList.add('is-in', 'is-drawn'); } }   // model still loading: the Cycles still stands in, no second entrance later
      S.dirty = true; wake();
    }
  }), { threshold: [0, .35] });
  seen.observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { S.dirty = true; wake(); } });
  addEventListener('pagehide', e => { if (e.persisted || !S.R) return; S.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); } }); S.R.dispose(); });
  // test hooks
  S.swap = swap; S.render = render; S.layout = layout; S.setReveal = setReveal;
})();
