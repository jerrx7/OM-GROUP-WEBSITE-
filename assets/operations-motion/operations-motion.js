/* CONNECTED OPERATIONS — scroll-driven industrial motion graphic for #operations.
   One continuous illustrated world, drawn in SVG by operations-art.js (no raster artwork):
   quarry → crushing & screening → stockyard → batching plant → loading & dispatch → (network map)
   → road and bridge. A camera travels through it as the page scrolls.

   Time model
   - Scroll position → story time t (0…T), smoothed so wheel steps glide; the same scroll position
     always gives the same state, forwards or backwards. Every process state (fractures, fragments,
     piles, gates, batching, excavator cycle, trucks, crane, camera) is a pure function of t.
   - An ambient clock a runs only while the stage is on screen and drives things that keep turning:
     belts and rollers, drives, the screen's oscillation, crusher vibration, mixer drums, and the
     material riding the belts (gated on and off by t, so flows start and drain with the story).
   - prefers-reduced-motion: each chapter shows its finished key frame; nothing runs on the clock.

   Layers (same camera): back = static artwork, act = moving machines, fx = flow markers and labels.
   The static layer only repaints when the camera moves. Zones outside the view are not rendered. */
(function () {
  const section = document.getElementById('operations');
  const ART = window.OPM_ART;
  if (!section || !ART || !window.OPM_LOGO) return;
  const stage = section.querySelector('.opm-stage');
  const track = section.querySelector('.opm-track');
  const back = section.querySelector('.opm-svg');
  const actSvg = back.cloneNode(false); actSvg.classList.add('opm-act'); back.after(actSvg);
  const fxSvg = back.cloneNode(false); fxSvg.classList.add('opm-fx'); actSvg.after(fxSvg);
  // foreground: what stands in front of the people (the laboratory's front), above the 3D layer when there is one
  const frontSvg = back.cloneNode(false); frontSvg.classList.add('opm-front'); actSvg.after(frontSvg);
  // screen-space layer: the network view, labels and the hotspot frame (not moved by the camera)
  const scr = back.cloneNode(false); scr.classList.add('opm-scr'); fxSvg.after(scr);
  const worldLayers = [back, actSvg, frontSvg, fxSvg];
  // The static artwork and the flow markers are painted once and moved by the camera as composited layers; the
  // moving layer (people, machines) and the foreground are redrawn by the camera itself (their viewBox is the
  // world rectangle on screen), so the technician, the bucket and the logos stay sharp however far it zooms in
  const liveLayers = [actSvg, frontSvg], heldLayers = [back, fxSvg];
  // the technicians in 3D: the rigged OM Group character (built from the approved 360° sheet) drawn in WebGL between
  // the moving layer and the foreground. On by default; ?tech3d=0 shows the drawn figures, ?tech3d=<file> another model
  const T3 = new URLSearchParams(location.search).get('tech3d'), TECH3D = T3 !== '0' && !!window.WebGLRenderingContext;
  // ?tech3d=0&tech2d=1 shows the 2D artwork technician (tech2d) instead of the 3D model; ?tech3d=0 alone the hand-drawn figure
  const TECH2D = !TECH3D && new URLSearchParams(location.search).get('tech2d') === '1' && !!window.OPM_TECH2D;
  const caps = Array.from(section.querySelectorAll('.opm-cap'));
  const cta = section.querySelector('.opm-cta');
  const chapterBtns = Array.from(section.querySelectorAll('.opm-chapters button'));
  const nowLabel = section.querySelector('.opm-now');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';
  const { F, rng } = ART;
  document.documentElement.classList.add('opm-js');

  /* ---------- chapters (story time) ---------- */
  // Eight chapters on one story clock t (0–75). Each zone's code keeps its own clock, read as t − ZT[zone]:
  // 1 quarry (0–14) · 2 processing and 3 stockyard (t − 7) · Q = zone 8, quality & dispatch (t − 28, 0–12)
  // · 4 ready-mix, 5 logistics, 6 network, 7 infrastructure (t − 19). Zone 0 = the world's own fade (t − 19).
  const SH = 7, SH2 = 19, ZT = { 0: SH2, 1: 0, 2: SH, 3: SH, 8: 28, 4: SH2, 5: SH2, 6: SH2, 7: SH2 };
  const CH = [
    { start: 0, end: 14, key: 13.6 },
    { start: 14, end: 22, key: 20.6 },
    { start: 22, end: 28, key: 27.2 },
    { start: 28, end: 40, key: 39.4 },
    { start: 40, end: 49, key: 46.8 },
    { start: 49, end: 57, key: 54.8 },
    { start: 57, end: 65, key: 64.0 },
    { start: 65, end: 75, key: 74.4 },
  ];
  const T = CH[CH.length - 1].end;
  const GY = 760; // the world's ground line

  /* ---------- utilities ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const EASE = {
    io: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    o: p => 1 - Math.pow(1 - p, 3), i: p => p * p * p, l: p => p, s: p => p * p * (3 - 2 * p),
  };
  function kf(keys, t) {
    if (typeof keys === 'number') return keys;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i];
      if (t <= k[0]) { const j = keys[i - 1]; const p = (t - j[0]) / (k[0] - j[0] || 1); return lerp(j[1], k[1], EASE[k[2] || 'io'](p)); }
    }
    return keys[keys.length - 1][1];
  }
  const win = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  function E(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  const G = (parent, attrs) => E('g', attrs, parent);
  function M(parent, markup, attrs) { const g = G(parent, attrs); g.innerHTML = markup; return g; }
  // per-frame writes only touch the DOM when a value really changes
  function setA(el, name, v) { const c = el.__opm || (el.__opm = {}); if (c[name] !== v) { el.setAttribute(name, v); c[name] = v; } }
  const at0 = (x, y = GY) => `translate(${F(x)} ${F(y)})`;
  const R2 = (deg, [x, y]) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const lerpP = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

  /* ---------- registries ---------- */
  // actors: scroll-driven transforms/opacity; ups: per-frame functions (t, a); both tagged by zone so
  // hidden zones cost nothing.
  let actors = [], ups = [], labels = [], hots = [], items = [];
  const afterFrame = []; // called once a frame, after the zones (the 3D layer)
  // the one live 3D layer. build() runs again whenever the layout switches (desktop / compact / phone, a rotating phone,
  // a resized window): it must tear the previous layer down first, or its canvas stays in the page, frozen, behind the new one
  let techLayer = null, techGen = 0;
  function disposeTech() {
    techGen++; afterFrame.length = 0;
    if (techLayer) { try { if (techLayer.api && techLayer.api.dispose) techLayer.api.dispose(); } catch (e) { /* already gone */ } techLayer.canvas.remove(); techLayer = null; }
  }
  // per-machine culling: a moving machine outside the frame is not painted at all
  let curDX = 0; // world offset of the zone being built (zones 4, 5 and 7 sit DX further right)
  const cull = (g, x0, x1) => { items.push({ g, x0: x0 + curDX, x1: x1 + curDX, on: null }); return g; };
  function act(z, el, tr) {
    const a = { z, el, tr, last: {} };
    if (tr.draw !== undefined) {
      a.lines = Array.from(el.querySelectorAll('path,line,circle,polyline,rect'));
      if (el.matches('path,line,circle,polyline,rect')) a.lines.unshift(el);
      a.lens = a.lines.map(n => { try { return Math.max(1, n.getTotalLength()); } catch (e) { return 400; } });
    }
    actors.push(a); return a;
  }
  function applyActor(a, t) {
    const tr = a.tr, last = a.last, o = tr.o === undefined ? 1 : kf(tr.o, t), hidden = o <= 0.001;
    if (hidden !== last.hidden) { a.el.style.display = hidden ? 'none' : ''; last.hidden = hidden; }
    if (hidden) return;
    if (tr.o !== undefined) { const v = F(o); if (v !== last.o) { a.el.setAttribute('opacity', v); last.o = v; } }
    if (tr.x !== undefined || tr.y !== undefined || tr.s !== undefined || tr.r !== undefined || tr.sy !== undefined) {
      const x = tr.x === undefined ? 0 : kf(tr.x, t), y = tr.y === undefined ? 0 : kf(tr.y, t), s = tr.s === undefined ? 1 : kf(tr.s, t);
      const sy = tr.sy === undefined ? 1 : kf(tr.sy, t), r = tr.r === undefined ? 0 : kf(tr.r, t);
      const v = `translate(${F(x)} ${F(y)})` + (r ? ` rotate(${F(r)})` : '') + (s !== 1 || sy !== 1 ? ` scale(${F(s * 1000) / 1000} ${F(s * sy * 1000) / 1000})` : '');
      if (v !== last.tf) { a.el.setAttribute('transform', v); last.tf = v; }
    }
    if (tr.draw !== undefined) {
      const d = Math.round(kf(tr.draw, t) * 1000) / 1000;
      if (d !== last.draw) {
        a.lines.forEach((n, i) => { if (d >= 1) { n.style.strokeDasharray = ''; n.style.strokeDashoffset = ''; } else { n.style.strokeDasharray = `${a.lens[i]} ${a.lens[i]}`; n.style.strokeDashoffset = a.lens[i] * (1 - d); } });
        last.draw = d;
      }
    }
  }
  const up = (z, fn, amb) => ups.push({ z, fn, amb });
  let view = [-1e9, 1e9], ambSkip = false; // world x-range in frame; skip ambient work this frame

  // path sampler (precomputed so nothing queries geometry per frame)
  let defs;
  function sampler(d, n = 160) {
    const p = E('path', { d }, defs), L = p.getTotalLength(), pts = [];
    for (let i = 0; i <= n; i++) { const q = p.getPointAtLength(L * i / n); pts.push([q.x, q.y]); }
    p.remove();
    const f = u => { const v = clamp(u, 0, 1) * n, i = Math.floor(v), k = v - i, a = pts[i], b = pts[Math.min(n, i + 1)]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; };
    f.len = L; return f;
  }
  // six irregular stone outlines for flow markers
  const STONE_D = (() => { const R = rng(11), out = []; for (let s = 0; s < 6; s++) { const n = 6 + Math.floor(R() * 3), p = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + R() * 0.4, r = 0.72 + R() * 0.28; p.push([Math.cos(a) * r, Math.sin(a) * r * (0.75 + R() * 0.2)]); } out.push(ART.poly(p)); } return out; })();

  // Material flow along a path, driven by the ambient clock (it keeps moving while the plant runs).
  // on: [t start, t stop] — the stream fills from its source as the story reaches t start and drains
  // after t stop, so scrolling back and forth starts and stops it coherently.
  function flow(z, parent, d, o) {
    const at = sampler(d), L = at.len, n = o.n || Math.max(2, Math.round(L / (o.gap || 34))), R = rng(o.seed || 9);
    let fx0 = 1e9, fx1 = -1e9; for (let i = 0; i <= 20; i++) { const q = at(i / 20); fx0 = Math.min(fx0, q[0] + curDX); fx1 = Math.max(fx1, q[0] + curDX); }
    const screen = z === 6;
    const fill = o.fill || 0.9, speed = o.speed || 42;
    const ps = Array.from({ length: n }, (_, j) => {
      const el = o.dot ? E('circle', { r: 1, class: 'opm-pdot' + (o.cls ? ' ' + o.cls : '') }, parent) : E('path', { d: STONE_D[j % 6], class: 'opm-part' + (o.cls ? ' ' + o.cls : '') }, parent);
      el.setAttribute('opacity', '0'); el.__opm = { opacity: '0' };
      return { el, s: lerp(o.size[0], o.size[1], R()), r0: R() * 360, off: (j + R() * 0.5) / n };
    });
    up(z, (t, a) => {
      if (ambSkip || (!screen && (fx1 < view[0] - 30 || fx0 > view[1] + 30))) return;
      const head = win(t, o.on[0], o.on[0] + fill), tail = win(t, o.on[1], o.on[1] + fill);
      for (const p of ps) {
        const u = (((a * speed) / L + p.off) % 1 + 1) % 1;
        if (u > head || u < tail || head === 0) { setA(p.el, 'opacity', '0'); continue; }
        const [x, y] = at(u);
        setA(p.el, 'opacity', '1');
        setA(p.el, 'transform', `translate(${F(x)} ${F(y)}) rotate(${F(p.r0 + (o.spin ? u * o.spin : 0))}) scale(${F(p.s)})`);
      }
    });
  }
  // conveyor moving parts: belt cleats travel and every roller turns at the belt's surface speed
  function belt(z, parent, c, speed = 42) {
    const g = M(parent, ART.conveyorMoving(c));
    const rollers = Array.from(g.querySelectorAll('.roller')).map(el => ({ el, x: el.dataset.x, y: el.dataset.y, r: +el.dataset.r }));
    up(z, (t, a) => {
      if (ambSkip || g.__off || (parent.__off)) return;
      const dist = a * speed;
      for (const r of rollers) setA(r.el, 'transform', `translate(${r.x} ${r.y}) rotate(${F((dist / r.r) * 57.2958 % 360)})`);
    });
    return g;
  }
  // A pile that builds layer by layer: all backings beneath all stones; keys(k) gives layer k's timing.
  function layeredPile(z, parent, P, keys) {
    const bk = G(parent), st = G(parent);
    // stones paint top layer first, so each lower (nearer) layer overlaps the one above it
    // each layer arrives with a short fade and no slide: a complex pile repaints only on the few
    // frames of its fade, which keeps scrolling smooth while a yard of piles is building
    P.strata.forEach((s, k) => { const t0 = keys(k).o[0][0], tr = { o: [[t0, 0], [t0 + 0.12, 1, 'l']] }; act(z, M(bk, P.backs[k]), tr); const g = M(st, s); st.insertBefore(g, st.firstChild); act(z, g, tr); });
  }
  // Material stream driven by story time (scroll position decides where every stone is).
  function tstream(z, parent, d, o) {
    const at = sampler(d), R = rng(o.seed || 5), N = Math.floor((o.t1 - o.t0) * o.rate), P = Math.ceil(o.travel * o.rate) + 1;
    const props = Array.from({ length: N }, () => ({ s: lerp(o.size[0], o.size[1], R()), r0: R() * 360, sym: Math.floor(R() * 6), j: (R() - 0.5) * (o.jitter || 0) }));
    const pool = Array.from({ length: Math.min(P, N) }, () => { const el = E('path', { d: STONE_D[0], class: 'opm-part', opacity: 0 }, parent); el.__opm = { opacity: '0' }; return el; });
    up(z, t => pool.forEach((el, j) => {
      const n = j + pool.length * Math.floor(((t - o.t0) * o.rate - j) / pool.length), born = o.t0 + n / o.rate;
      if (n < 0 || n >= N || t < born || t > born + o.travel) { setA(el, 'opacity', '0'); return; }
      const p = props[n], u = (t - born) / o.travel, [x, y] = at(u);
      setA(el, 'opacity', '1'); setA(el, 'd', STONE_D[p.sym]);
      setA(el, 'transform', `translate(${F(x + p.j * (1 - Math.abs(2 * u - 1)))} ${F(y)}) rotate(${F(p.r0 + u * 240)}) scale(${F(p.s)})`);
    }));
  }
  // A conveyor whose belt and pulleys move with the material it carries (by story time, in its window).
  function beltT(z, parent, c, w0, w1, speed) {
    const g = M(parent, ART.conveyorMoving(c)), cleat = g.querySelector('.bl-c');
    const rollers = Array.from(g.querySelectorAll('.roller')).map(el => ({ el, x: el.dataset.x, y: el.dataset.y, r: +el.dataset.r }));
    up(z, t => { const dist = (clamp(t, w0, w1) - w0) * speed; setA(cleat, 'stroke-dashoffset', F(-(dist % 14))); for (const r of rollers) setA(r.el, 'transform', `translate(${r.x} ${r.y}) rotate(${F((dist / r.r) * 57.2958 % 360)})`); });
    return g;
  }
  // wheels turn by the distance their vehicle has travelled (angle = distance / radius)
  function rollWheels(z, vehicle, xOf) {
    const wheels = Array.from(vehicle.querySelectorAll('.wheel')).map(el => ({ el, x: el.dataset.x, r: +el.dataset.r }));
    up(z, t => { const d = xOf(t); for (const w of wheels) setA(w.el, 'transform', `translate(${w.x} ${-w.r}) rotate(${F((d / w.r) * 57.2958 % 360)})`); });
  }
  // hydraulic cylinder between a base pin A and a rod pin B (barrel fixed length, rod the rest)
  function cylinder(parent, w, Lb) {
    const g = G(parent);
    E('rect', { class: 'o', fill: 'url(#a-steelD)', x: 0, y: F(-w / 2), width: Lb, height: w, rx: 2 }, g);
    const rod = E('rect', { class: 'o', fill: '#e6e8ea', x: Lb - 2, y: F(-w * 0.2), width: 10, height: F(w * 0.4) }, g);
    E('circle', { class: 'o', r: F(w * 0.55), fill: 'url(#a-hub)' }, g);
    return (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy); setA(g, 'transform', `translate(${F(A[0])} ${F(A[1])}) rotate(${F(Math.atan2(dy, dx) * 57.2958)})`); setA(rod, 'width', F(Math.max(4, L - Lb + 2))); };
  }

  /* ---------- camera ---------- */
  // Each chapter frames part of the world; between chapters the camera travels. Keys: [t, x, y, s]:
  // world point (x, y) sits at the stage's anchor with zoom s. Tall (phone) framings follow the
  // material at a readable size, then pull back to the whole scene.
  const CAM = {
    // chapter 1 (story time 0–14)
    q1: [[0, -1080, 470, 1.18], [4.6, -1080, 470, 1.18], [6.2, -640, 460, 1.06], [8.0, -600, 460, 1.06], [9.4, -90, 450, 0.94], [10.8, -40, 450, 0.94], [12.6, 800, 450, 1], [14, 800, 450, 1]],
    q1tall: [[0, -1240, 600, 0.95], [4.6, -1240, 600, 0.95], [5.6, -1080, 600, 0.92], [6.6, -700, 560, 0.85], [7.8, -430, 560, 0.85], [9.0, -380, 560, 0.85], [9.8, -50, 540, 0.85], [10.8, 250, 540, 0.85], [11.8, 300, 540, 0.85], [12.8, 820, 560, 0.66], [14, 820, 560, 0.638]],
    // chapter 4, quality & dispatch (its own clock, t − 28)
    qa: [[0, 3500, 450, 1], [0.42, 3680, 632, 2.9], [1.75, 3680, 632, 2.9], [2.0, 3690, 632, 2.9], [2.42, 4330, 480, 1.3], [4.4, 4380, 490, 1.42], [4.8, 4560, 490, 1.42], [7.0, 4560, 490, 1.42], [8.0, 5300, 470, 1.12], [10.4, 5330, 470, 1.12], [12, 5900, 470, 1.02]],
    qatall: [[0, 3430, 580, 0.66], [0.42, 3590, 600, 2.4], [1.75, 3590, 600, 2.4], [2.0, 3600, 600, 2.4], [2.45, 4330, 620, 1.15], [4.4, 4440, 640, 1.35], [7.0, 4440, 640, 1.35], [8.0, 5300, 600, 0.85], [10.4, 5330, 600, 0.85], [12, 5900, 600, 0.8]],
    // chapters 2–3 (t − 7) and 5–8 (t − 19, built below from the same list)
    wide: [[0, 800, 450, 1], [7.0, 800, 450, 1], [8.6, 1960, 450, 1], [15.0, 1960, 450, 1], [16.6, 3500, 450, 1], [21.0, 3500, 450, 1], [22.6, 5300, 450, 1], [30.0, 5300, 450, 1], [31.6, 6960, 450, 1], [36.6, 6960, 450, 1], [38.2, 7140, 450, 1], [38.9, 7140, 450, 1], [45.6, 8840, 490, 1.05], [48.6, 8930, 490, 1]],
    tall: [[0, 430, 600, 0.912], [2.2, 430, 600, 0.912], [3.4, 760, 620, 0.844], [4.6, 1180, 620, 0.844], [5.8, 820, 560, 0.638], [7.0, 820, 560, 0.638],
      [8.6, 1600, 560, 0.889], [10.6, 2180, 560, 0.889], [12.4, 2020, 560, 0.6], [15.0, 2020, 560, 0.6],
      [16.6, 3200, 580, 0.821], [18.6, 3700, 580, 0.821], [19.8, 3430, 580, 0.66], [21.0, 3430, 580, 0.66],
      [22.6, 4900, 560, 0.821], [24.6, 5560, 520, 0.821], [26.2, 5850, 500, 0.821], [27.4, 5300, 520, 0.638], [30.0, 5300, 520, 0.638],
      [31.6, 6640, 580, 0.889], [33.2, 6900, 580, 0.889], [35.4, 6960, 560, 0.638], [36.6, 6960, 560, 0.638], [38.2, 7140, 560, 0.638], [38.9, 7140, 560, 0.638],
      [45.6, 8380, 600, 0.935], [48.4, 8400, 600, 0.935], [50.4, 9000, 580, 0.752], [52.0, 8880, 700, 0.62]],
  };
  let layout = null, VW = 1600, VH = 900, cam = { x: 0, y: 0, s: 1 };
  const TALL = () => layout === 'tall';
  // world rectangle held by the static layer, and its reference scale (px per stage unit = pxu)
  const WORLD = [-1900, -80, 14940, 1220];
  let sRef = 1, pxu = 1;
  // The static layers (artwork, flow markers) are painted once for the whole world and moved by the camera as a scaled
  // composited layer, which is fast while travelling but magnifies a fixed-resolution paint: zoomed in on the technician the
  // environment turned soft while the redrawn 3D and moving layers stayed sharp (and on phones the whole-world layer is far
  // larger than the browser will paint at full resolution). So once the camera has rested for a moment while zoomed in, the
  // static layers are redrawn through the same viewBox window as the live layers — crisp at any zoom — and handed back to the
  // composited transform as soon as the camera moves. ?crisp=0 turns this off (before/after comparisons).
  const CRISP_ON = new URLSearchParams(location.search).get('crisp') !== '0';
  let crisp = false, crispT = 0;
  function leaveCrisp() {
    clearTimeout(crispT);
    if (!crisp) return; crisp = false;
    heldLayers.forEach(s => { s.classList.add('opm-world'); s.setAttribute('viewBox', `${WORLD[0]} ${WORLD[1]} ${WORLD[2]} ${WORLD[3]}`); s.style.width = `${F(WORLD[2] * sRef * pxu)}px`; s.style.height = `${F(WORLD[3] * sRef * pxu)}px`; s.style.removeProperty('--k'); });
  }
  function enterCrisp() {
    if (crisp || !CRISP_ON) return; crisp = true;
    const [ax2, ay2] = anchor(), vb = `${F(cam.x - ax2 / cam.s)} ${F(cam.y - ay2 / cam.s)} ${F(VW / cam.s)} ${F(VH / cam.s)}`, kk = F(cam.s / sRef);
    heldLayers.forEach(s => { s.classList.remove('opm-world'); s.style.transform = ''; s.style.width = ''; s.style.height = ''; s.setAttribute('viewBox', vb); s.style.setProperty('--k', kk); });
  }
  function sizeBack() {
    leaveCrisp();
    sRef = TALL() ? 0.72 : 1; pxu = (stage.clientWidth || 1) / VW;
    heldLayers.forEach(s => { s.style.width = `${F(WORLD[2] * sRef * pxu)}px`; s.style.height = `${F(WORLD[3] * sRef * pxu)}px`; });
    camKey = '';
  }
  // chapters 5–8 resume from the quality chapter's last frame; their world sits D further right
  const DX = 2600;
  const late = (list, from) => [[21.0].concat(from.slice(1))].concat(list.filter(k => k[0] > 21).map(k => [k[0], k[1] + DX, k[2], k[3]]));
  // narrow wide stages (tablet portrait, phone landscape): the caption takes more of the frame, so the sampling
  // close-up stays at 1.55 there, clear of the gantry posts
  CAM.qaSmall = CAM.qa.map(k => (k[0] > 0.3 && k[0] < 2.1 ? [k[0], k[0] === 2.0 ? 3600 : 3585, 520, 1.55] : k));
  CAM.late = late(CAM.wide, CAM.qa[CAM.qa.length - 1]); CAM.latetall = late(CAM.tall, CAM.qatall[CAM.qatall.length - 1]);
  function camAt(t) {
    const tl = TALL(), c = t <= 14 ? camKeys(t, CAM[tl ? 'q1tall' : 'q1']) : t <= 28 ? camKeys(t - SH) : t <= 40 ? camKeys(t - 28, CAM[tl ? 'qatall' : layout === 'compact' || stage.clientWidth < 900 ? 'qaSmall' : 'qa']) : camKeys(t - SH2, CAM[tl ? 'latetall' : 'late']);
    // compact stages (landscape phones): the closing shot rises a little more to make room for the CTAs
    if (layout === 'compact') c.y += 110 * EASE.io(win(t - SH2, 50.5, 52.5));
    // short wide stages: the close sampling shot pulls back a little, clear of the caption
    if (layout === 'compact') c.s *= 1 - 0.14 * EASE.s(win(t, 28, 28.42) * (1 - win(t, 29.75, 30.35)));
    return c;
  }
  function camKeys(t, keys) {
    const K = keys || CAM[TALL() ? 'tall' : 'wide'];
    if (t <= K[0][0]) return { x: K[0][1], y: K[0][2], s: K[0][3] };
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) {
      const a = K[i - 1], b = K[i], p = EASE.io((t - a[0]) / (b[0] - a[0] || 1));
      return { x: lerp(a[1], b[1], p), y: lerp(a[2], b[2], p), s: lerp(a[3], b[3], p) };
    }
    const k = K[K.length - 1]; return { x: k[1], y: k[2], s: k[3] };
  }
  const anchor = () => (TALL() ? [450, 930] : [800, 450]);
  const project = (x, y) => { const [ax, ay] = anchor(); return [ax + (x - cam.x) * cam.s, ay + (y - cam.y) * cam.s]; };

  /* ---------- zones ---------- */
  // world x-extent of each zone (for culling); 6 = the network view (screen space)
  const ZONES = { 1: [-1800, 1720], 2: [1150, 2790], 3: [2280, 4060], 8: [3300, 6700], 4: [7070, 8710], 5: [8650, 10420], 7: [10480, 12580] };
  let Z = {}, worldB, worldR, worldA, worldF, labG, net, netFx;

  // projected label: anchored to a world point, drawn at a constant screen size (legible on phones)
  function label(z, x, y, text, o = {}) {
    if (o.wide && TALL()) return;
    const el = E('text', { class: 'opm-lab' + (o.cls ? ' ' + o.cls : ''), 'text-anchor': o.anchor || 'middle', 'font-size': F((TALL() ? 20 : 11.5) * (o.k || 1)) }, labG);
    el.textContent = text;
    // width estimated once (letter-spaced caps), so moving labels never force a layout
    const size = (TALL() ? 20 : 11.5) * (o.k || 1);
    labels.push({ z, el, x: x + curDX, y, o: o.o, dy: TALL() ? (o.dyTall || 0) : 0, anchor: o.anchor || 'middle', w: text.length * size * (o.cls === 'card-t' ? 0.58 : 0.78), last: {} });
  }
  // hotspot: a focusable marker on a machine; hover, focus or tap shows its name
  function hot(z, x, y, text, on, box) { hots.push({ z, x: x + curDX, y, text, on, box: [box[0] + curDX, box[1], box[2] + curDX, box[3]] }); }

  // Rail with stage rings: an orange trace runs along it and each ring lights as it is reached.
  function progressRail(z, parent, y, x0, x1, rings, keys) {
    M(parent, `<path class="ln faint" d="M${x0} ${y}H${x1}M${x0} ${y - 8}V${y + 8}M${x1} ${y - 8}V${y + 8}"/>${rings.map(([x]) => `<circle class="ring" cx="${x}" cy="${y}" r="6"/>`).join('')}`);
    act(z, E('path', { class: 'trace', d: `M${rings[0][0]} ${y}H${x1}` }, parent), { draw: keys });
    rings.forEach(([x, t0]) => act(z, E('circle', { class: 'ring-on', cx: x, cy: y, r: 3.2 }, parent), { o: [[t0, 0], [t0 + 0.2, 1]] }));
  }

  function build() {
    disposeTech(); leaveCrisp();
    // the static layer is the whole world at a reference scale, moved by a composited CSS transform:
    // a camera move then shifts already-painted vector art instead of repainting it
    scr.innerHTML = ''; scr.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
    worldLayers.forEach(s => { s.innerHTML = ''; });
    heldLayers.forEach(s => { s.setAttribute('viewBox', `${WORLD[0]} ${WORLD[1]} ${WORLD[2]} ${WORLD[3]}`); s.classList.add('opm-world'); });
    sizeBack();
    actors = []; ups = []; labels = []; hots = []; items = [];
    defs = E('defs', null, back);
    defs.innerHTML = ART.defs();
    worldB = G(back, { class: 'world' }); worldA = G(actSvg, { class: 'world' }); worldF = G(fxSvg, { class: 'world' }); worldR = G(frontSvg, { class: 'world' });
    net = G(scr); netFx = G(scr);
    labG = G(scr, { class: 'labels' });
    // the whole world steps aside for the network view (chapter 6)
    const worldO = { o: [[37.6, 1], [38.3, 0], [45.6, 0], [46.4, 1]] }; // (the network view enters only after this)
    [worldB, worldA, worldF, worldR].forEach(g => act(0, g, worldO));
    // one long ground line under everything, and distant hills
    M(worldB, `<path class="ln faint" d="M-1900 ${GY}H${10400 + DX}"/>`);
    for (const z in ZONES) { const tf = [4, 5, 7].includes(+z) ? { transform: `translate(${DX} 0)` } : {}; Z[z] = { b: G(worldB, { 'data-zone': z, ...tf }), a: G(worldA, { 'data-zone': z, ...tf }), f: G(worldF, { 'data-zone': z, ...tf }), r: G(worldR, { 'data-zone': z, ...tf }), extra: [] }; }
    // compact stages: the network view sits a little lower and smaller, clear of the caption
    if (layout === 'compact') [net, netFx].forEach(g => g.setAttribute('transform', 'translate(110 90) scale(.88)'));
    zone1(Z[1]); zone2(Z[2]); zone3(Z[3]); zoneQ(Z[8]);
    curDX = DX; zone4(Z[4]); zone5(Z[5]); curDX = 0; zone6(net, netFx); curDX = DX; zone7(Z[7]); curDX = 0;
    buildHots();
  }

  /* === 1 — the quarry: boulder → fracture → primary (jaw) crusher → secondary (cone) crusher → stockpile === */
  // One continuous sequence on story time 0–14. Everything is a pure function of t (scroll position):
  //  0–1.6   the intact boulder        1.6–3.4  stress, spreading fractures, chips break off
  //  3.4–5   it splits into its fragments, which fall, bounce, tip over and settle (dust)
  //  5–8     fragments are fed up conveyor A into the jaw crusher and crushed as the jaw strokes
  //  7–11.5  the primary product rides B1/B2 into the cone crusher; secondary product rides C
  //  9.6–13  the stockpile builds; chapter 2's feed conveyor takes from it
  function zone1({ b, a, f }) {
    const BX = -1260, JX = -380, CX = 270, PX = 1270, Gv = 900, D2R = Math.PI / 180;
    // background: hills and one technical arc by the stockpile (the arcs over the boulder were removed)
    M(b, ART.hills(1500, 250, 3, -1820), { transform: at0(0) });
    M(b, ART.hills(1150, 300, 5, 960), { transform: at0(0) });
    M(b, `<path class="ln faint dash" d="M1010 ${GY}A270 270 0 0 1 1540 ${GY - 70}"/>`);

    /* ---- machines and conveyors ---- */
    const JC = ART.jawCrusher(), CC = ART.coneCrusher('q1'), J = JC.J;
    defs.insertAdjacentHTML('beforeend', CC.clip);
    const cvA = ART.conveyor(-950, -26, -505, -352, { gy: 0, legs: [0.3, 0.64], rail: true, depth: 16 });
    const cvB1 = ART.conveyor(-470, -30, -200, -30, { gy: 0, depth: 9, idler: 22 });
    const cvB2 = ART.conveyor(-200, -30, 150, -352, { gy: 0, legs: [0.4, 0.75], rail: true, depth: 14 });
    const cvC = ART.conveyor(250, -30, 1090, -300, { gy: 0, legs: [0.3, 0.55, 0.8], rail: true, depth: 16 });
    M(b, cvA.frame + cvA.rail + cvB1.frame + cvB2.frame + cvB2.rail + cvC.frame + cvC.rail, { transform: at0(0) });
    M(b, JC.back, { transform: at0(JX) });
    M(b, CC.back, { transform: at0(CX) });
    const lineOf = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), dx = (x1 - x0) / L, dy = (y1 - y0) / L; return { L, deg: Math.atan2(dy, dx) / D2R, at: u => [x0 + dx * u, y0 + dy * u], up: [dy, -dx] }; };
    // (world x, ground-relative y)
    const A = lineOf(-950, -26, -505, -352), B1 = lineOf(-470, -30, -200, -30), B2 = lineOf(-200, -30, 150, -352);
    const tf0 = 5.0, tfStep = 0.28, rideA = 0.85, vB = 600;
    beltT(1, cull(G(a, { transform: at0(0) }), -960, -490), cvA, tf0 + 0.32, tf0 + 10 * tfStep + 0.32 + rideA, (A.L - 32) / rideA);
    beltT(1, cull(G(a, { transform: at0(0) }), -480, -190), cvB1, 6.9, 11.6, vB);
    beltT(1, cull(G(a, { transform: at0(0) }), -210, 160), cvB2, 6.9, 11.6, vB);
    beltT(1, cull(G(a, { transform: at0(0) }), 240, 1100), cvC, 8.7, 13.2, 1000);

    // jaw crusher: the pitman driven by the eccentric; toggle plate between its foot and the seat
    const jawG = cull(G(a, { transform: at0(JX) }), JX - 170, JX + 240);
    const pit = M(jawG, JC.pitman), toggle = E('path', { class: 'toggle' }, jawG);
    const phJ = t => 2 * Math.PI * 3.2 * (clamp(t, 6.6, 10.6) - 6.6);
    const R0 = [J.S[0] + J.e, J.S[1]], ang0 = Math.atan2(J.Tg[1] - R0[1], J.Tg[0] - R0[0]);
    // cone crusher: the mantle gyrates about its top bearing
    const coneG = cull(G(a, { transform: at0(CX) }), CX - 300, CX + 160);
    const mantle = M(coneG, CC.mantle);
    const phC = t => 2 * Math.PI * 4 * (clamp(t, 8.6, 12.2) - 8.6);
    const coneStream = cull(G(a), CX - 130, 1220);

    /* ---- the boulder and its fragments (group in boulder-local coords: origin at BX on the ground) ---- */
    const QB = ART.quarryBoulder(190, 41, 10), n = QB.pieces.length;
    defs.insertAdjacentHTML('beforeend', QB.pdefs);
    const shadowG = M(b, QB.shadow, { transform: at0(BX) });
    act(1, shadowG, { o: [[3.4, 1], [4.2, 0.45], [7.6, 0.45], [8.6, 0]] });
    const bg = cull(G(a, { transform: at0(BX) }), BX - 320, JX + 60);
    const shake = G(bg);
    const under = M(shake, QB.under);
    act(1, under, { o: [[3.75, 1], [4.05, 0]] }); // the dark interior shows in the opening cracks
    // the rock's stress: a restrained tremor that builds until it gives way
    const tremor = t => kf([[1.5, 0], [2.6, 1], [3.38, 1.8], [3.42, 0]], t);
    up(1, t => { const am = tremor(t); setA(shake, 'transform', am ? `translate(${F(Math.sin(t * 170) * am)} ${F(Math.sin(t * 131 + 1) * am * 0.5)})` : 'translate(0 0)'); });

    // where each fragment comes to rest: left-to-right order kept, back row a little higher (further away)
    const lowY = (H, deg) => { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); let mx = -1e9; for (const p of H) { const y = p[0] * s + p[1] * c; if (y > mx) mx = y; } return mx; };
    function restAngle(H, target) {
      let best = target, bs = 1e9;
      H.forEach((p, k) => {
        const q = H[(k + 1) % H.length], ang = Math.atan2(q[1] - p[1], q[0] - p[0]), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        for (const cand of [-ang, Math.PI - ang]) {
          const deg = cand / D2R, c = Math.cos(cand), s = Math.sin(cand), yE = p[0] * s + p[1] * c;
          if (lowY(H, deg) - yE > 0.6) continue; // this edge is not at the bottom
          const d = ((deg - target) % 360 + 540) % 360 - 180, sc = Math.abs(d) * 0.5 - len * 1.2;
          if (sc < bs) { bs = sc; best = target + d; }
        }
      });
      return best;
    }
    const order = QB.pieces.map((p, i) => i).sort((i, j) => QB.pieces[i].c[0] - QB.pieces[j].c[0]);
    const feedOrder = order.slice().reverse(); // the fragment nearest the conveyor goes first
    const xA0 = A.at(24)[0] - BX;
    const sims = QB.pieces.map((P, i) => {
      const pr = rng(500 + i * 13), rank = order.indexOf(i), row = rank % 2, rowOff = row ? 0 : -10;
      const H = P.hull, Dm = Math.max(...H.map(p => Math.max(...H.map(q => Math.hypot(p[0] - q[0], p[1] - q[1])))));
      const x0 = P.c[0], y0 = P.c[1], xr = lerp(-QB.W * 0.44, xA0 - 70, rank / (n - 1)) + (pr() - 0.5) * 16;
      const dir = Math.sign(xr - x0) || 1, high = y0 < -QB.H * 0.5;
      const thR = restAngle(H, dir * (20 + pr() * 70) * (high ? 1.4 : 0.7)), thL = thR + dir * (6 + pr() * 10), thM = thR + (thL - thR) * 0.35;
      const yL = -lowY(H, thL) + rowOff, yr = -lowY(H, thR) + rowOff;
      const tb = 3.4 + 0.75 * Math.hypot(x0 - (QB.cx + QB.W * 0.2), y0 - (QB.cy - QB.H * 0.38)) / QB.W + pr() * 0.1;
      let vy0 = high ? -(30 + pr() * 70) : -(10 + pr() * 30), Tf = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * Gv * Math.max(0, yL - y0))) / Gv;
      if (Tf < 0.42) { Tf = 0.42; vy0 = (yL - y0 - Gv * Tf * Tf / 2) / Tf; }
      const vx = (xr - x0) / Tf, tl = tb + Tf, hb = Math.min(12, Math.max(2.5, (yL - y0) * 0.05));
      const tf = Math.max(tf0 + feedOrder.indexOf(i) * tfStep, tl + 0.17 + 0.24 + 0.15);
      return { i, H, Dm, x0, y0, xr, yr, yL, thR, thL, thM, rowOff, tb, Tf, vy0, vx, tl, hb, tf, row };
    });
    // fragments are drawn back row first, front row over them
    const pieceG = sims.slice().sort((p, q) => p.row - q.row || q.Dm - p.Dm).map(sm => {
      const P = QB.pieces[sm.i], g = G(bg);
      M(g, P.svg);
      const seam = M(g, P.seam), fresh = M(g, P.fresh);
      act(1, seam, { o: [[sm.tb - 0.05, 0], [sm.tb + 0.12, 1]] });
      act(1, fresh, { o: [[sm.tb, 0], [sm.tb + 0.18, 1]] });
      return { sm, g };
    });
    // fracture lines spread from where the stress began, then close up as the fragments part
    const crackG = G(shake);
    QB.cracks.forEach(c => { const t0 = 1.7 + c.k * 1.3; act(1, M(crackG, `<path class="crack-d" d="${c.d}"/><path class="crack-l" d="${c.d}"/>`), { draw: [[t0, 0], [t0 + 0.5, 1]] }); });
    act(1, crackG, { o: [[1.6, 0], [1.7, 1], [3.4, 1], [3.6, 0]] });

    // jaw geometry in boulder-local coords
    const jx = x => x + JX - BX, faceX = (P0, P1, y) => P0[0] + (P1[0] - P0[0]) * (y - P0[1]) / (P1[1] - P0[1]);
    const mDisp = (ph, y) => lerp(J.e * (Math.cos(ph) - 1), J.d * (Math.cos(ph) - 1), (y - J.mTop[1]) / (J.mBot[1] - J.mTop[1]));
    const Aloc = { at: u => { const p = A.at(u); return [p[0] - BX, p[1]]; } };
    pieceG.forEach(({ sm, g }) => {
      const s = sm, belt = (u, th) => { const p = Aloc.at(u), h = lowY(s.H, s.thR); return [p[0] + A.up[0] * h, p[1] + A.up[1] * h, th]; };
      const tH = s.tf + 0.32, tR = tH + rideA, tD = tR + 0.24, tC = tD + 0.62;
      s.tC = tC;
      const pose = t => {
        if (t <= s.tb) { const am = tremor(t); return [s.x0 + Math.sin(t * 170) * am, s.y0 + Math.sin(t * 131 + 1) * am * 0.5, 0, 1]; }
        if (t <= s.tl) { const u = t - s.tb; return [s.x0 + s.vx * u, s.y0 + s.vy0 * u + Gv * u * u / 2, s.thL * (u / s.Tf), 1]; }
        const tB = s.tl + 0.17, tS = tB + 0.24;
        if (t <= tB) { const u = (t - s.tl) / 0.17, th = lerp(s.thL, s.thM, u); return [s.xr, -lowY(s.H, th) + s.rowOff - s.hb * 4 * u * (1 - u), th, 1]; }
        if (t <= tS) { const th = lerp(s.thM, s.thR, EASE.o((t - tB) / 0.24)); return [s.xr, -lowY(s.H, th) + s.rowOff, th, 1]; }
        if (t <= s.tf) return [s.xr, s.yr, s.thR, 1];
        if (t <= tH) { const p = EASE.io((t - s.tf) / 0.32), e = belt(24, s.thR + A.deg); return [lerp(s.xr, e[0], p), lerp(s.yr, e[1], p) - 46 * Math.sin(Math.PI * p), lerp(s.thR, e[2], p), 1]; }
        if (t <= tR) return belt(lerp(24, A.L - 8, (t - tH) / rideA), s.thR + A.deg).concat(1);
        const st = belt(A.L - 8, s.thR + A.deg), ey = J.entry[1] - s.Dm * 0.25, ex = jx(J.entry[0]);
        if (t <= tD) { const p = (t - tR) / 0.24; return [lerp(st[0], ex, p), lerp(st[1], ey, p * p) - 18 * Math.sin(Math.PI * p), st[2] + 30 * p, 1]; }
        if (t <= tC) {
          const p = (t - tD) / 0.62, y = lerp(ey, J.exit[1] - 6, p), ph = phJ(t);
          const xf = faceX(J.fTop, J.fBot, y), xm = faceX(J.mTop, J.mBot, y) + mDisp(ph, y), gap = xm - xf;
          return [jx((xf + xm) / 2), y, st[2] + 30 + 50 * p, Math.min(1, 0.92 * gap / s.Dm), clamp((tC - t) / 0.06, 0, 1)];
        }
        return null;
      };
      up(1, t => {
        const q = pose(t);
        if (!q) { setA(g, 'opacity', '0'); return; }
        setA(g, 'opacity', q[4] === undefined ? '1' : F(q[4]));
        setA(g, 'transform', `translate(${F(q[0])} ${F(q[1])}) rotate(${F(q[2])})` + (q[3] < 1 ? ` scale(${F(q[3] * 1000) / 1000})` : ''));
      });
    });

    // chips break off the outer edges first and fall
    const CR = rng(77);
    for (let k = 0; k < 9; k++) {
      const op = QB.out[Math.floor((0.05 + CR() * 0.45) * QB.out.length)], r = 4 + CR() * 6, rk = ART.rock(r, 600 + k), g = M(bg, rk.svg);
      const t0 = 2.55 + k * 0.08, x1 = op[0] + 30 + CR() * 160, T = 0.36 + CR() * 0.14, vy = (-op[1] - Gv * T * T / 2) / T, rot = (CR() - 0.5) * 500;
      up(1, t => {
        if (t < t0) { setA(g, 'opacity', '0'); return; }
        const u = Math.min(t - t0, T); setA(g, 'opacity', '1');
        setA(g, 'transform', `translate(${F(lerp(op[0], x1, u / T))} ${F(op[1] + vy * u + Gv * u * u / 2)}) rotate(${F(rot * u / T)})`);
      });
    }
    // fine debris spread on the ground by the break
    let grit = ''; const GR = rng(88);
    for (let k = 0; k < 30; k++) grit += `<g transform="translate(${F(-QB.W * 0.55 + GR() * (QB.W * 0.6 + xA0))} 0)">${ART.rock(1.6 + GR() * 2.6, 700 + k).svg}</g>`;
    act(1, M(bg, grit), { o: [[3.7, 0], [4.3, 1]] });
    // dust where the heavy fragments land
    const dustG = cull(G(f, { transform: at0(BX) }), BX - 320, -900);
    sims.forEach(s => {
      const g = M(dustG, `<ellipse cx="0" cy="-10" rx="${F(s.Dm * 0.75)}" ry="${F(s.Dm * 0.22)}" fill="url(#a-dust)"/><ellipse cx="${F(s.Dm * 0.3)}" cy="-20" rx="${F(s.Dm * 0.45)}" ry="${F(s.Dm * 0.2)}" fill="url(#a-dust)"/>`);
      up(1, t => {
        const p = (t - s.tl) / 0.8;
        if (p <= 0 || p >= 1) { setA(g, 'opacity', '0'); return; }
        setA(g, 'opacity', F(0.9 * (1 - p))); setA(g, 'transform', `translate(${F(s.xr + 14 * p)} ${F(-14 * p)}) scale(${F(0.5 + p)})`);
      });
    });

    /* ---- primary product: each crushed fragment leaves the jaw as smaller stones ---- */
    const kidG = cull(G(a), JX - 140, CX + 60), KR = rng(99);
    sims.forEach(s => {
      for (let j = 0; j < 3; j++) {
        const r = 10 + KR() * 7, g = M(kidG, ART.rock(r, 900 + s.i * 7 + j).svg);
        const t0 = s.tC - 0.06 + j * 0.06, sx = JX + J.exit[0] + (j - 1) * 12, sy = GY + J.exit[1], u0 = 36 + j * 26;
        const [bx, by] = B1.at(u0), t1 = t0 + 0.22, t2 = t1 + (B1.L - u0) / vB, t3 = t2 + B2.L / vB, t4 = t3 + 0.2, rr = (KR() - 0.5) * 180;
        const hx = CX + (j - 1) * 16, hy = GY - 322;
        up(1, t => {
          if (t < t0 || t > t4) { setA(g, 'opacity', '0'); return; }
          setA(g, 'opacity', '1');
          let x, y, th;
          if (t <= t1) { const p = (t - t0) / 0.22; x = lerp(sx, bx, p); y = lerp(sy, GY + by, p * p); th = rr * p; }
          else if (t <= t2) { const q = B1.at(u0 + (t - t1) * vB); x = q[0]; y = GY + q[1]; th = rr; }
          else if (t <= t3) { const q = B2.at((t - t2) * vB); x = q[0]; y = GY + q[1]; th = rr + B2.deg; }
          else { const p = (t - t3) / 0.2, q = B2.at(B2.L); x = lerp(q[0], hx, p); y = lerp(GY + q[1], hy, p * p) - 22 * Math.sin(Math.PI * p); th = rr + B2.deg + 60 * p; }
          setA(g, 'transform', `translate(${F(x)} ${F(y)}) rotate(${F(th)})`);
        });
      }
    });

    /* ---- secondary product: fine stones down the cone's gap, out on conveyor C, onto the stockpile ---- */
    tstream(1, coneStream, `M${CX} ${GY - 330}L${CX - 36} ${GY - 270}L${CX - 86} ${GY - 152}L${CX - 40} ${GY - 100}L${CX} ${GY - 64}L${CX + 6} ${GY - 42}L1090 ${GY - 304}Q1150 ${GY - 322} 1190 ${GY - 190}`,
      { t0: 8.7, t1: 11.9, rate: 26, travel: 1.3, size: [2.4, 4.2], seed: 61, jitter: 8 });
    const pile = ART.pile(470, 206, 5, { sr: 8.5, strata: 7 }), pileG = G(b, { transform: at0(PX) });
    M(pileG, pile.shadow);
    layeredPile(1, pileG, pile, k => { const tk = 9.6 + k * 0.48; return { o: [[tk, 0], [tk + 0.22, 1]], y: [[tk, -9], [tk + 0.45, 0, 'o']] }; });

    // machines in front of the material: the jaw's near cheek and flywheel, the cone's shell and drive
    const jawFront = cull(G(a, { transform: at0(JX) }), JX - 170, JX + 240);
    M(jawFront, JC.front);
    const fly = M(jawFront, JC.flywheel, { transform: `translate(${J.S[0]} ${J.S[1]})` });
    const coneFront = cull(G(a, { transform: at0(CX) }), CX - 300, CX + 160);
    M(coneFront, CC.front);
    const sheave = M(coneFront, CC.sheave, { transform: `translate(${CC.sheaveAt[0]} ${CC.sheaveAt[1]})` });
    up(1, t => {
      const ph = phJ(t), top = [J.S[0] + J.e * Math.cos(ph), J.S[1] + J.e * Math.sin(ph)], bot = [J.Tg[0] + J.d * (Math.cos(ph) - 1), J.Tg[1]];
      const da = (Math.atan2(bot[1] - top[1], bot[0] - top[0]) - ang0) / D2R;
      setA(pit, 'transform', `translate(${F(top[0])} ${F(top[1])}) rotate(${F(da)}) translate(${-R0[0]} ${-R0[1]})`);
      setA(toggle, 'd', `M${F(bot[0])} ${F(bot[1])}L${J.seat[0]} ${J.seat[1]}`);
      setA(fly, 'transform', `translate(${J.S[0]} ${J.S[1]}) rotate(${F((ph / D2R) % 360)})`);
      const pc = phC(t), piv = ART.CONE.pivot;
      setA(mantle, 'transform', `rotate(${F(1.8 * Math.sin(pc))} ${piv[0]} ${piv[1]})`);
      setA(sheave, 'transform', `translate(${CC.sheaveAt[0]} ${CC.sheaveAt[1]}) rotate(${F((pc / D2R * 1.6) % 360)})`);
    });

    /* ---- the process rail, labels, the lockup and hotspots ---- */
    progressRail(1, b, GY + 32, -1500, 1440, [[BX, 0.6], [JX, 6.6], [CX, 8.8], [PX, 12.2]], [[0.6, 0], [12.2, 1, 'l']]);
    label(1, BX, GY + 66, 'LARGE BASALT ROCK', { o: [[0.4, 0], [0.9, 1]] });
    label(1, JX, GY + 66, 'PRIMARY REDUCTION', { o: [[6.2, 0], [6.7, 1]] });
    label(1, JX, GY + 84, 'JAW CRUSHER', { o: [[6.2, 0], [6.7, 1]], cls: 'faint-t', k: 0.85, wide: true });
    label(1, CX, GY + 66, 'SECONDARY REDUCTION', { o: [[8.6, 0], [9.1, 1]] });
    label(1, CX, GY + 84, 'CONE CRUSHER', { o: [[8.6, 0], [9.1, 1]], cls: 'faint-t', k: 0.85, wide: true });
    label(1, PX, GY + 66, 'CRUSHED BASALT', { o: [[11.8, 0], [12.3, 1]] });
    if (!TALL()) act(1, M(b, `<use href="#a-logo-lockup" transform="translate(1040 ${GY - 610}) scale(.31)"/>`), { o: [[11.6, 0], [12.4, 1], [13.6, 1], [14.2, 0]] });
    hot(1, BX, GY - 190, 'Blasted basalt boulder', [0, 5.0], [BX - QB.W / 2, GY - QB.H, BX + QB.W / 2, GY]);
    hot(1, JX - 20, GY - 230, 'Primary jaw crusher', [5.4, 10.6], [JX - 160, GY - 390, JX + 165, GY]);
    hot(1, CX, GY - 230, 'Secondary cone crusher', [8.4, 12.6], [CX - 300, GY - 345, CX + 145, GY]);
    hot(1, PX, GY - 110, 'Crushed basalt stockpile', [11.4, 15.6], [1040, GY - 210, 1500, GY]);
  }

  /* === 2 — aggregate processing: feed → VSI crusher → vibrating screen → six grades === */
  function zone2({ b, a, f }) {
    const feed = ART.conveyor(1372, -28, 1782, -404, { gy: 0, legs: [0.3, 0.62], rail: true, depth: 16 });
    const tran = ART.conveyor(1850, -72, 2082, -262, { gy: 0, legs: [0.58], depth: 12 });
    const CR = ART.crusher(-200), SC = ART.screen(-190), CX = 1840, SX = 2240;
    M(b, feed.frame + feed.rail, { transform: at0(0) });
    M(b, CR.frame, { transform: at0(CX) });
    M(b, tran.frame, { transform: at0(0) });
    M(b, SC.frame, { transform: at0(SX) });
    // moving machinery
    belt(2, cull(G(f, { transform: at0(0) }), 1360, 1800), feed); belt(2, cull(G(f, { transform: at0(0) }), 1840, 2090), tran);
    const crG = cull(G(a, { transform: at0(CX) }), 1700, 2010), crBody = M(crG, CR.body);
    M(crG, CR.deckRail + CR.topDeck);
    const drives = CR.drives.map(d => ({ d, g: M(crG, `<circle class="o" r="${d.r}" fill="url(#a-rim)"/><path class="rmark" d="M-7 0H7M0 -7V7"/>`, { transform: `translate(${d.x} ${d.y})` }) }));
    const scG = cull(G(a, { transform: at0(SX) }), 2080, 2440);
    const springs = SC.springs.map(s => M(scG, ART.spring(s.h), { transform: `translate(${F(s.x)} ${F(s.y + s.h)})` }));
    const box = M(scG, SC.box);
    const crushOn = [8.9, 15.4], screenOn = [9.3, 15.4];
    up(2, (t, a2) => {
      if (ambSkip) return;
      const g = win(t, crushOn[0], crushOn[0] + 0.5) * (1 - win(t, crushOn[1], crushOn[1] + 0.5));
      drives.forEach(({ d, g: dg }) => setA(dg, 'transform', `translate(${d.x} ${d.y}) rotate(${F((a2 * 420 * (g ? 1 : 0)) % 360)})`));
      // the screen box runs on a small circular stroke on its springs
      const h = win(t, screenOn[0], screenOn[0] + 0.5) * (1 - win(t, screenOn[1], screenOn[1] + 0.5));
      const ph = a2 * Math.PI * 2 * 3.2, dx = Math.cos(ph) * 1.5 * h, dy = Math.sin(ph) * 1.5 * h;
      setA(box, 'transform', `translate(${F(dx)} ${F(dy)})`);
      springs.forEach((s, i) => setA(s, 'transform', `translate(${F(SC.springs[i].x + dx * 0.5)} ${F(SC.springs[i].y + SC.springs[i].h)}) scale(1 ${F(1 + dy / SC.springs[i].h)})`));
    });
    // material: stockpile → feed belt → hopper; spout → transfer belt → screen; along the deck; out
    const P = (c, u, off) => c.at(u, off).map((v, i) => i ? v + GY : v);
    const W = (x, y) => [x, y + GY];
    const path = arr => 'M' + arr.map(p => F(p[0]) + ' ' + F(p[1])).join('L');
    flow(2, f, path([P(feed, 0, 5), P(feed, feed.L, 5), W(1812, -392), W(CX, -366)]), { on: [8.3, 15.4], gap: 30, size: [5, 7.5], seed: 21 });
    flow(2, f, path([W(CX, -112), W(1866, -82), P(tran, 18, 4), P(tran, tran.L, 4), W(SX - 140, -250)]), { on: [8.9, 15.4], gap: 22, size: [3.4, 5], seed: 22 });
    const deck = u => { const p = SC.deck(u, 64); return W(SX + p[0], p[1]); };
    flow(2, f, path([deck(14), deck(110), deck(200), deck(300)]), { on: [9.3, 15.4], gap: 20, size: [3, 5.5], seed: 23, speed: 30 });
    // the six grades: technical sample cards fed along dashed connectors from the screen discharge
    const J = W(SX + 186, -128), cards = [], grades = [['6 mm', 2.1], ['10 mm', 2.8], ['12.5 mm', 3.5], ['20 mm', 4.7], ['40 mm', 7.4], ['60 mm', 10]];
    const CXs = [2468, 2590], CY = [-548, -408, -268], cw = 112, chh = 128;
    M(b, `<path class="ln faint dash" d="M${F(SX + 166)} ${F(GY - 118)}L${F(J[0])} ${F(J[1])}"/><circle class="ring-on" cx="${F(J[0])}" cy="${F(J[1])}" r="4"/>`);
    CY.forEach((y, r) => {
      const ty = GY + y + chh / 2, d = `M${F(J[0])} ${F(J[1])}L${F(J[0] + 18)} ${F(ty)}H${CXs[0]}`;
      M(b, `<path class="ln faint dash" d="${d}"/>`);
      flow(2, f, d, { on: [9.8 + r * 0.25, 15.4], gap: 26, size: [grades[r * 2][1] * 0.9, grades[r * 2 + 1][1] * 0.9], seed: 40 + r, speed: 34 });
    });
    grades.forEach(([lab, sr], i) => {
      const x = CXs[i % 2], y = GY + CY[i >> 1];
      const cg = G(b, { transform: `translate(${x} ${F(y)})` });
      M(cg, ART.sampleCard(cw, chh));
      const P2 = ART.pile(86, 44 + i * 1.5, 60 + i, { sr, strata: 3, shift: i > 3 ? 1 : 0 });
      const pg = G(cg, { transform: `translate(${cw / 2} 84)` });
      layeredPile(2, pg, P2, k => { const tk = 10.2 + (i >> 1) * 0.3 + k * 0.9; return { o: [[tk, 0], [tk + 0.3, 1]], y: [[tk, -6], [tk + 0.4, 0, 'o']] }; });
      label(2, x + 12, y + chh - 24, lab, { anchor: 'start', cls: 'card-t', k: 1.25, wide: true });
      label(2, x + 12, y + chh - 10, 'CRUSHED STONE', { anchor: 'start', cls: 'card-s', k: 0.72, wide: true });
      cards.push([x, y]);
    });
    if (TALL()) label(2, 2704, GY - 572, 'GRADED AGGREGATES · 6 TO 60 MM', { anchor: 'end', o: [[10, 0], [10.6, 1]] });
    // dimension labels under the machines
    M(b, `<path class="ln faint" d="M1752 ${GY + 34}H1790M1890 ${GY + 34}H1928M1752 ${GY + 26}V${GY + 42}M1928 ${GY + 26}V${GY + 42}M2090 ${GY + 34}H2160M2320 ${GY + 34}H2392M2090 ${GY + 26}V${GY + 42}M2392 ${GY + 26}V${GY + 42}"/>`);
    label(2, CX, GY + 38, 'VSI CRUSHER', { wide: true }); label(2, SX, GY + 38, 'VIBRATING SCREEN', { wide: true });
    hot(2, 1580, GY - 230, 'Feed conveyor', [7.6, 15.8], [1372, GY - 440, 1782, GY - 20]);
    hot(2, CX, GY - 330, 'VSI crusher', [7.6, 15.8], [1740, GY - 400, 1940, GY - 100]);
    hot(2, SX, GY - 250, 'Vibrating screen', [7.6, 15.8], [2090, GY - 330, 2420, GY - 170]);
    hot(2, 2590, GY - 420, 'Graded aggregates · 6 to 60 mm', [9.6, 15.8], [2462, GY - 552, 2706, GY - 136]);
  }

  /* === 3 — the material collection: stockyard of graded aggregates and sands === */
  function zone3({ b, a, f }) {
    const low = ART.conveyor(2312, -40, 2722, -40, { gy: 0, depth: 8, idler: 24 });
    const inc = ART.conveyor(2722, -40, 3072, -306, { gy: 0, legs: [0.42, 0.78], rail: true, depth: 14 });
    const top = ART.conveyor(3072, -306, 4004, -306, { gy: 0, depth: 22, idler: 30 });
    M(b, low.frame + inc.frame + inc.rail + top.frame, { transform: at0(0) });
    // lattice towers carrying the overhead conveyor
    let towers = ''; for (const x of [3092, 3392, 3692, 3992]) towers += ART.member(ART.seg(x - 10, 0, x - 10, -330) + ART.seg(x + 10, 0, x + 10, -330), 3) + ART.member(Array.from({ length: 8 }, (_, i) => ART.seg(x - 10, -i * 40, x + 10, -(i + 1) * 40)).join(''), 1.4) + ART.footing(x, 40, 8);
    M(b, towers, { transform: at0(0) });
    [[low, 2300, 2730], [inc, 2710, 3080], [top, 3060, 4010]].forEach(([c, x0, x1]) => belt(3, cull(G(f, { transform: at0(0) }), x0, x1), c));
    // bays: back wall, piles, divider block ends in front, chutes from the overhead conveyor
    const BAY = 130, X0 = 3080, NB = 7;
    let wall = ''; for (let r = 0; r < 4; r++) for (let x = X0 + (r % 2 ? 0 : 32); x < X0 + BAY * NB; x += 64) wall += `<rect class="o" fill="url(#a-conc)" x="${x}" y="${-24 - r * 24}" width="${Math.min(62, X0 + BAY * NB - x)}" height="22" opacity=".75"/>`;
    M(b, wall, { transform: at0(0) });
    const AGG = [[2.6, 96], [3.3, 98], [4.1, 100], [5.2, 102], [7.6, 104], [10, 106]];
    const SANDS = ['m'], NAMES = ['6 MM', '10 MM', '12.5 MM', '20 MM', '40 MM', '60 MM', 'M-SAND'];
    for (let i = 0; i < NB; i++) {
      const cx = X0 + BAY * i + BAY / 2, t0 = 16.1 + i * 0.32, t1 = t0 + 1.6;
      const pg = G(b, { transform: at0(cx) });
      let h;
      if (i < 6) {
        const P = ART.pile(124, AGG[i][1], 80 + i, { sr: AGG[i][0], strata: 4, shift: i > 3 ? 1 : 0 }); h = P.h;
        M(pg, P.shadow); layeredPile(3, pg, P, k => { const tk = t0 + k * 0.38; return { o: [[tk, 0], [tk + 0.25, 1]], y: [[tk, -6], [tk + 0.4, 0, 'o']] }; });
      } else {
        h = 100; const sg = M(pg, ART.sandHeap(124, h, 90 + i, SANDS[i - 6]));
        act(3, sg, { sy: [[t0, 0.02], [t1, 1, 'o']], o: [[t0, 0], [t0 + 0.2, 1]] });
      }
      // chute and falling stream from the overhead belt
      M(b, `<path class="o" fill="url(#a-steelD)" d="M${cx - 9} ${GY - 296}H${cx + 9}L${cx + 6} ${GY - 266}H${cx - 6}Z"/>`);
      flow(3, f, `M${cx} ${GY - 264}L${cx + 1} ${GY - h * 0.6}`, i < 6 ? { on: [t0 - 0.3, t1], gap: 18, size: [AGG[i][0] * 0.55, AGG[i][0] * 0.8], seed: 70 + i, speed: 120, spin: 300 } : { on: [t0 - 0.3, t1], gap: 9, size: [1.3, 1.9], seed: 70 + i, speed: 120, dot: true, cls: 'sand-' + SANDS[i - 6] });
      // sign at the front of the bay
      label(3, cx, GY + 22, NAMES[i], { k: 0.82, cls: 'sign', wide: true });
    }
    let ends = ''; for (let i = 0; i <= NB; i++) { const x = X0 + BAY * i; ends += `<rect class="o" fill="url(#a-concV)" x="${x - 9}" y="-96" width="18" height="96"/><path class="seam" d="M${x - 9} -24H${x + 9}M${x - 9} -48H${x + 9}M${x - 9} -72H${x + 9}"/>`; }
    M(b, ends, { transform: at0(0) });
    // the overhead belt runs while bays are filling; material arrives from the screen
    flow(3, f, `M2318 ${GY - 44}H2722L3072 ${GY - 310}H3990`, { on: [15.6, 21.4], gap: 30, size: [3.4, 6], seed: 77 });
    M(b, `<path class="ln faint" d="M${X0 + 6} ${GY + 38}H${X0 + BAY * 6 - 6}M${X0 + BAY * 6 + 6} ${GY + 38}H${X0 + BAY * NB - 6}"/>`);
    label(3, X0 + BAY * 3, GY + 60, 'GRADED AGGREGATES · 6 TO 60 MM', { o: [[16.2, 0], [16.8, 1], [20.8, 1], [21.2, 0]] });
    label(3, X0 + BAY * 6.5, GY + 60, 'SAND', { o: [[17.8, 0], [18.4, 1], [20.8, 1], [21.2, 0]] });
    hot(3, 3540, GY - 340, 'Stockpile conveyor', [15.6, 21.8], [3072, GY - 360, 4004, GY - 290]);
    hot(3, X0 + BAY * 3, GY - 90, 'Crushed stone · 6 to 60 mm', [16.2, 21.8], [X0, GY - 110, X0 + BAY * 6, GY]);
    hot(3, X0 + BAY * 6.5, GY - 90, 'M-Sand (manufactured sand)', [17.6, 21.8], [X0 + BAY * 6, GY - 110, X0 + BAY * NB, GY]);
  }

  /* === Q — quality assurance & dispatch (chapter 4): sample → lab tests → report → release → load → dispatch === */
  // Runs on its own clock τ = t − 28 (0–12), in the world between the stockyard and the batching plant:
  //  0–2.4   a technician samples the 20 mm bay and carries the sample to the laboratory
  //  2.4–4.6 weighing, sieve analysis on the shaker, impact test, oven; results go to the workstation
  //  4.6–7.4 the test report fills in, row by row, and is approved
  //  6.8–7.6 the batch is released in the yard; 8–10.4 the wheel loader loads the tipper; 10.6–12 dispatch
  /* ---- the technician rig: every segment posed about its joint; legs and arms by two-bone IK ---- */
  const DEG = 180 / Math.PI;
  const rotP = (p, d) => { const a = d / DEG, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
  const segAng = (P, Q) => Math.atan2(-(Q[0] - P[0]), Q[1] - P[1]) * DEG; // frame angle: 0 = pointing down
  // two-bone IK from joint A toward target B; pick chooses between the two bend directions
  function ik2(A, B, L1, L2, pick) {
    const dx = B[0] - A[0], dy = B[1] - A[1], d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01), base = Math.atan2(dy, dx);
    const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const K1 = [A[0] + L1 * Math.cos(base + al), A[1] + L1 * Math.sin(base + al)], K2 = [A[0] + L1 * Math.cos(base - al), A[1] + L1 * Math.sin(base - al)];
    const K = pick(K1, K2, A, B), u = Math.atan2(B[1] - K[1], B[0] - K[0]);
    return { J: K, E: [K[0] + L2 * Math.cos(u), K[1] + L2 * Math.sin(u)] };
  }
  // knees bend forward; elbows bend the other way — the forearm folds forward/up from the upper arm, never
  // back past straight (the sign of the turn from upper arm to forearm, in local coords facing +x)
  const kneeFwd = (a, b) => (a[0] > b[0] ? a : b);
  const elbowNat = (a, b, S, W) => { const turn = K => (K[0] - S[0]) * (W[1] - K[1]) - (K[1] - S[1]) * (W[0] - K[0]); return turn(a) <= turn(b) ? a : b; };
  // the wrist bends a limited amount: the hand (and anything it holds) stays within ±40° of the forearm
  const WRIST = 40, wrap = d => ((d + 540) % 360) - 180;
  function mkPerson(parent, id) {
    const A = (TECH2D && ART.technician2d()) || ART.technician(id), L = A.L, root = G(parent);
    M(root, A.shadow);
    // the arms are his right and left: whichever is on the far side is painted behind the body (and shaded)
    const farSlot = G(root);
    const legB = { t: M(root, A.thigh(1)), s: M(root, A.shin(1)), b: M(root, A.boot(1)) };
    const legF = { t: M(root, A.thigh(0)), s: M(root, A.shin(0)), b: M(root, A.boot(0)) };
    const torso = G(root); M(torso, A.torso); const chestLogo = M(torso, A.back);
    // the scoop is held in an oblique grip (handle across the palm at 45°, like a trowel), so it points
    // forward-down with the wrist straight and tips by bending the arm, not by twisting the hand
    const GRIP = `rotate(45 ${L.grip[0]} ${L.grip[1]})`;
    const holster = M(torso, `<g transform="${GRIP}">${A.scoop}</g>`); holster.setAttribute('opacity', '0'); // the scoop clipped to the belt once the sample is taken
    const collar = M(root, A.collar);
    const head = G(root, { 'data-face': id }); M(head, A.head); const helmLogo = M(head, A.helm);
    const freeSlot = G(root), nearSlot = G(root);
    const part = fn => (A.img ? fn(0) + fn(1) : fn(1)); // (the artwork: the plain and the shaded drawing, one shown at a time)
    const mkArm = () => { const g = G(farSlot), o = { g, u: M(g, part(A.upper)), f: M(g, part(A.fore)), h: M(g, part(A.hand)) }; o.shd = [...g.querySelectorAll('.shd')]; return o; };
    const arms = { R: mkArm(), L: mkArm() };
    // the sample bucket is a child of the right hand: it hangs from the grip, so it goes wherever the hand
    // goes (walk, turn, reach). It leaves the hand only when it is set down or held in both hands.
    const bucket = G(arms.R.h); arms.R.h.insertBefore(bucket, arms.R.h.firstChild);
    const heap = G(bucket); M(bucket, A.bucket);
    const scoop = M(arms.L.h, A.scoop, { transform: GRIP }), load = G(scoop);
    if (A.img) arms.L.h.insertBefore(scoop, arms.L.h.firstChild); // the handle runs inside the fist
    const dirEls = [...root.querySelectorAll('[data-dir]')]; let dirNow = 1;
    const place = (el, P, ang) => setA(el, 'transform', `translate(${F(P[0])} ${F(P[1])}) rotate(${F(ang)})`);
    const st = {}; let stowAt = null, nearSide = ''; // where the scoop clips to the belt (torso coords) and how it hangs
    // P: { x, y (ground), face, hip:[x,y], lean, look, feet: [near, far] ankles [x, y, boot angle],
    //      armR / armL: { w: wrist target, h: hand angle } | { ua, fa, d } (local coords, facing +x) — or armF /
    //      armB for the near / far arm; bucket: { at, tilt } when it is out of the hand; sway: the bucket's
    //      swing under the hand (degrees, clockwise on screen) }
    function pose(P) {
      setA(root, 'transform', `translate(${F(P.x)} ${F(P.y)}) scale(${F(P.face)} 1)`);
      const dir = P.face < 0 ? -1 : 1; if (dir !== dirNow) { dirNow = dir; dirEls.forEach(e => (e.style.display = +e.dataset.dir === dir ? '' : 'none')); }
      const H = P.hip;
      // legs: each ankle reached by IK from the hip (knees bend forward); the boot takes the foot's angle (heel
      // strike, heel-off) when one is given
      [[legF, P.feet[0]], [legB, P.feet[1]]].forEach(([lg, An]) => { const r = ik2(H, An, L.thigh, L.shin, kneeFwd); place(lg.t, H, segAng(H, r.J)); place(lg.s, r.J, segAng(r.J, r.E)); place(lg.b, r.E, An[2] || 0); });
      place(torso, H, P.lean); place(collar, H, P.lean);
      if (stowAt) setA(holster, 'transform', `translate(${F(stowAt.p[0])} ${F(stowAt.p[1])}) rotate(${F(stowAt.a - P.lean)})`); // it hangs by gravity
      setA(chestLogo, 'transform', P.face < 0 ? `translate(${F(A.backC[0] * 2)} 0) scale(-1 1)` : 'translate(0 0)'); // the logo never reads mirrored
      // the head follows the torso and the gaze, but never pitches past 20°: the face stays clear of the
      // shoulders and the brim never hides it
      const N = add(H, rotP([L.neckX ?? 2.6, -L.neck], P.lean));
      place(head, N, Math.min(P.lean * 0.45 + (P.look || 0), 20));
      setA(helmLogo, 'transform', P.face < 0 ? `translate(${F(A.helmC[0] * 2)} 0) scale(-1 1)` : 'translate(0 0)');
      // facing left his right side is away from us, facing right it is toward us
      const near = P.face < 0 ? 'L' : 'R', far = near === 'L' ? 'R' : 'L';
      if (near !== nearSide) { nearSide = near; nearSlot.appendChild(arms[near].g); farSlot.appendChild(arms[far].g); arms[near].shd.forEach(e => e.setAttribute('display', 'none')); arms[far].shd.forEach(e => e.removeAttribute('display')); }
      const arm = (rig, S, spec) => {
        // either a wrist target (two-bone IK) or joint angles from the shoulder down (ua upper arm, fa forearm,
        // d wrist bend): the elbow only ever flexes (the forearm never swings back past the upper arm's line)
        let J, E;
        if (spec.ua !== undefined) { J = add(S, rotP([0, L.upper], spec.ua)); E = add(J, rotP([0, L.fore], clamp(spec.fa, spec.ua - 145, spec.ua))); }
        else { const r = ik2(S, spec.w, L.upper, L.fore, elbowNat); J = r.J; E = r.E; }
        const fa = segAng(J, E), want = spec.h !== undefined ? spec.h : fa + (spec.d !== undefined ? spec.d : -8); // relaxed: a slight curl
        const dev = wrap(want - fa), h = fa + clamp(dev, -WRIST, WRIST);
        place(rig.u, S, segAng(S, J)); place(rig.f, J, fa); place(rig.h, E, h);
        return { W: E, h, fa, dev, J };
      };
      const spec = { R: P.armR || (near === 'R' ? P.armF : P.armB), L: P.armL || (near === 'L' ? P.armF : P.armB) };
      st[far] = arm(arms[far], add(H, rotP(add(L.shF || [-1, 0.5], [0, -L.sh]), P.lean)), spec[far]);
      st[near] = arm(arms[near], add(H, rotP(add(L.shN || [1.5, 0], [0, -L.sh]), P.lean)), spec[near]);
      st.F = st[near]; st.B = st[far];
      if (P.bucket && P.bucket.at) {
        // set down, or held by its sides in both hands: placed in body coordinates
        if (bucket.parentNode !== freeSlot) freeSlot.appendChild(bucket);
        setA(bucket, 'transform', `translate(${F(P.bucket.at[0])} ${F(P.bucket.at[1])}) rotate(${F(P.bucket.tilt || 0)}) scale(${P.face} 1)`);
        st.bucket = P.bucket.at;
      } else {
        // in the hand: it hangs plumb from the grip whatever the wrist does (the hand's turn is undone), with a
        // small swing; the label faces us whichever way he faces
        if (bucket.parentNode !== arms.R.h) arms.R.h.insertBefore(bucket, arms.R.h.firstChild);
        setA(bucket, 'transform', `translate(${L.grip[0]} ${L.grip[1]}) rotate(${F(-st.R.h + (P.sway || 0) * P.face)}) scale(${P.face} 1)`);
        st.bucket = add(st.R.W, rotP(L.grip, st.R.h));
      }
      st.x = P.x; st.y = P.y; st.face = P.face; st.H = H; st.lean = P.lean;
      return st;
    }
    // local → world, and the scoop bowl / lip and bucket mouth in world coordinates
    const W = (p) => [st.x + st.face * p[0], st.y + p[1]];
    const tool = p => add(L.grip, rotP(sub(p, L.grip), 45)); // scoop coordinates → hand frame (the oblique grip)
    const inHand = (p) => W(add(st.L.W, rotP(tool(p), st.L.h)));
    // clip the scoop to the belt exactly where the hand holds it now (it then rides with the torso)
    const stow = () => { stowAt = { p: rotP(sub(st.L.W, st.H), -st.lean), a: st.L.h }; };
    return { root, pose, heap, load, scoop, holster, stow, bucket, W, L, tool, A, bowl: () => inHand(add(A.bowl, [-0.2, 0])), lip: () => inHand(A.lip), mouth: () => W(add(st.bucket, [0, A.bucketG.mouthY])) };
  }
  /* ---- the technician turning round ---- */
  // where his wrists are while he turns (lateral l, forward f): the bucket hand a little out from the leg and
  // forward of it (rw), the free hand relaxed with its swing. Shared by the turning figure and the side-view
  // rig, so the bucket is in the same place on screen when one hands over to the other.
  const TW = { R: Q => [-15, Q.rw !== undefined ? Q.rw : 3], L: Q => [12.6, 4 + (Q.swing || 0)] };
  // The side-view rig can only face left or right, so a turn uses this standing figure built on a rotating
  // body: ψ = 0 faces the viewer, ±90° are the two profiles. A part at (lateral l — the figure's left —,
  // forward f) lands at screen x = l·cosψ + f·sinψ, depth z = −l·sinψ + f·cosψ, and parts are painted far to
  // near. Torso, legs and head are round or elliptic in section, so their outlines keep their width at every
  // angle — the figure never goes edge-on. The feet carry their own headings so they step round one at a time.
  // Same person, same PPE and the same levels as the side-view rig (hip −54, shoulders −90, neck base −91.6).
  const smooth = P => {
    const n = P.length, q = i => P[(i + n) % n]; let d = 'M' + F(P[0][0]) + ' ' + F(P[0][1]);
    for (let i = 0; i < n; i++) { const p0 = q(i - 1), p1 = q(i), p2 = q(i + 1), p3 = q(i + 2); d += `C${F(p1[0] + (p2[0] - p0[0]) / 6)} ${F(p1[1] + (p2[1] - p0[1]) / 6)} ${F(p2[0] - (p3[0] - p1[0]) / 6)} ${F(p2[1] - (p3[1] - p1[1]) / 6)} ${F(p2[0])} ${F(p2[1])}`; }
    return d + 'Z';
  };
  function mkTurner(parent, id, bucketSvg) {
    const OR = ART.ORANGE, root = G(parent, { style: 'display:none' });
    const P = (tag, attrs, g) => E(tag, attrs, g);
    const shadowE = P('ellipse', { cy: 0.6, ry: 2.6, fill: 'url(#a-shadow)' }, root);
    const layer = {}; ['legL', 'legR', 'torso', 'armL', 'armR', 'bucket', 'head'].forEach(k => (layer[k] = G(root)));
    const legEls = side => { const g = layer['leg' + side]; return { tr: P('path', { class: 'o', fill: 'url(#a-trouser)' }, g), bandO: P('path', { fill: OR }, g), pocket: P('path', { fill: '#2c2e33', stroke: '#151618', 'stroke-width': 0.5 }, g), band: P('path', { fill: 'url(#a-refl)', stroke: '#8e9297', 'stroke-width': 0.35 }, g), crease: P('path', { fill: 'none', stroke: '#17181b', 'stroke-opacity': 0.5, 'stroke-width': 0.7 }, g), boot: P('path', { class: 'o', fill: 'url(#a-boot)' }, g), sole: P('path', { fill: '#0f1011' }, g), mid: P('path', { stroke: OR, 'stroke-width': 0.9 }, g), tab: P('path', { stroke: OR, 'stroke-width': 1.3 }, g), shade: P('path', { fill: '#000', 'fill-opacity': 0.2 }, g) }; };
    const legs = { L: legEls('L'), R: legEls('R') };
    const cid = 'a-tt-' + id, clip = P('clipPath', { id: cid }, layer.torso), clipP = P('path', {}, clip);
    const torso = P('path', { class: 'o', fill: 'url(#a-coat)' }, layer.torso);
    const tg = G(layer.torso, { 'clip-path': `url(#${cid})` });
    // the white work jacket: an orange band across the chest and one above the hem, orange piping down the front panels
    M(tg, `<rect x="-20" y="-77.6" width="40" height="3" fill="${OR}"/><rect x="-20" y="-60.4" width="40" height="3" fill="${OR}"/><path d="M-20 -50.4H20" stroke="#bdbab4" stroke-width=".8"/>`);
    const straps = [0, 1].map(() => P('path', { fill: OR }, tg));
    M(tg, '<rect x="-20" y="-96" width="40" height="50" fill="url(#a-coatV)"/>');
    const zip = P('path', { stroke: '#55585d', 'stroke-width': 0.8, fill: 'none' }, layer.torso);
    // the dark undershirt in the neck opening, and the stand-up collar's two flaps
    const collar = P('path', { fill: '#2b2d31' }, layer.torso), vline = P('path', { class: 'o', fill: 'url(#a-coat)' }, layer.torso);
    const chest = G(layer.torso), chestIn = M(chest, ART.logo(-3.2, -2, 6.4, 'name'));
    const idCard = M(layer.torso, `<path d="M0 -3.4V-1" stroke="#3a3c40" stroke-width=".6"/><rect class="o" x="-1.7" y="-1.2" width="3.4" height="5" rx=".5" fill="${OR}"/><rect x="-1.1" y=".2" width="2.2" height="1.6" fill="#fff" fill-opacity=".85"/>`); // the ID card on his right chest
    const holster = M(layer.torso, `<rect class="o" fill="url(#a-chrome)" x="-1.6" y="0" width="3.2" height="15" rx="1.2"/><rect fill="#2b2d31" x="-1.4" y="-4" width="2.8" height="5" rx="1"/>`);
    const armEls = side => { const g = layer['arm' + side]; return { sl: P('path', { class: 'o', fill: 'url(#a-coat)' }, g), fold: P('path', { fill: 'none', stroke: '#cfccc5', 'stroke-width': 0.7 }, g), cuff: P('path', { class: 'o', fill: 'url(#a-coat)' }, g), gcuff: P('path', { class: 'o', fill: '#2a2b2f' }, g), glove: P('path', { class: 'o', fill: 'url(#a-glove)' }, g), shade: P('path', { fill: '#000', 'fill-opacity': 0.18 }, g) }; };
    const arms = { L: armEls('L'), R: armEls('R') };
    const bucket = M(layer.bucket, bucketSvg), heap = G(bucket); bucket.insertBefore(heap, bucket.firstChild);
    // the head: ears behind, neck, the sculpted skull-and-jaw outline, jaw and cheek shading, wraparound glasses,
    // nose, mouth
    const ears = [0, 1].map(() => P('ellipse', { class: 'o', fill: 'url(#a-skinD)', cy: -102.4, ry: 2.2 }, layer.head));
    const neck = P('path', { class: 'o', fill: 'url(#a-skinD)' }, layer.head), headP = P('path', { class: 'o', fill: 'url(#a-skin)' }, layer.head);
    const jawSh = P('path', { fill: '#6b4434', 'fill-opacity': 0.16 }, layer.head), cheek = P('path', { fill: '#fff', 'fill-opacity': 0.14 }, layer.head);
    const specs = P('path', { fill: '#15191d' }, layer.head), glint = P('path', { fill: 'none', stroke: '#9fb6c2', 'stroke-opacity': 0.6, 'stroke-width': 0.45 }, layer.head);
    const nose = P('path', { fill: '#8a5a44', 'fill-opacity': 0.35 }, layer.head), mouth = P('path', { stroke: '#7a4a3a', 'stroke-width': 0.55, fill: 'none', 'stroke-linecap': 'round' }, layer.head);
    const brim = P('ellipse', { class: 'o', fill: '#e4e2dd', cy: -104.8, ry: 1.4 }, layer.head), dome = P('path', { class: 'o', fill: 'url(#a-hat)' }, layer.head);
    const ridge = P('path', { fill: 'none', stroke: '#fff', 'stroke-width': 1.3, 'stroke-opacity': 0.9 }, layer.head);
    const mark = M(layer.head, ART.logo(-3.4, -2.1, 6.8, 'name'));
    let order = '';
    // pose: x, y (ground), psi (body), head (head heading), feet: [[heading, lift] for the left and right foot],
    // swing (the free hand), sway (the bucket's swing, degrees)
    function pose(Q) {
      setA(root, 'transform', `translate(${F(Q.x)} ${F(Q.y)})`);
      const r = Q.psi * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), X = (l, f) => l * c + f * s, Zd = (l, f) => -l * s + f * c;
      setA(shadowE, 'rx', F(14 + 5 * Math.abs(s)));
      // legs and boots: the hip turns with the body, each ankle with its own foot; the cargo pocket is on the
      // outside of each thigh and shows when that side turns toward us
      [['L', 5, Q.feet[0]], ['R', -5, Q.feet[1]]].forEach(([k, l, [fh, lift]]) => {
        const e = legs[k], fr = fh * Math.PI / 180, fc = Math.cos(fr), fs = Math.sin(fr);
        const hx = X(l, 0), ax = l * fc + 1.5 * fs, ay = -6 - lift, kx = (hx + ax) / 2, ky = (-56 + ay) / 2;
        const at = (y, w) => { const p = (y + 56) / (ay + 56); return [lerp(hx, ax, p) - w, lerp(hx, ax, p) + w]; };
        const yb = -19.4 - lift * 0.4, [b0, b1] = at(yb, 4.9), [b2, b3] = at(yb + 3.2, 4.7);
        setA(e.tr, 'd', `M${F(hx - 6.4)} -56L${F(kx - 4.8)} ${F(ky)}L${F(ax - 4.2)} ${F(ay)}H${F(ax + 4.2)}L${F(kx + 4.8)} ${F(ky)}L${F(hx + 6.4)} -56Z`);
        setA(e.band, 'd', `M${F(b0)} ${F(yb)}H${F(b1)}L${F(b3)} ${F(yb + 3.2)}H${F(b2)}Z`);
        const [o0, o1] = at(yb - 1.3, 4.95), [o2, o3] = at(yb + 4.5, 4.65);
        setA(e.bandO, 'd', `M${F(o0)} ${F(yb - 1.3)}H${F(o1)}L${F(o3)} ${F(yb + 4.5)}H${F(o2)}Z`);
        setA(e.crease, 'd', `M${F(kx - 2.6)} ${F(ky + 1)}Q${F(kx)} ${F(ky + 2.4)} ${F(kx + 2.6)} ${F(ky + 1)}`);
        const out = Math.sign(l), ow = -out * s; // how far the outer side of the thigh faces us
        const pxc = lerp(hx, ax, (-41 + 56) / (ay + 56)) + out * 5.4 * Math.abs(c), pw = 2.6 * clamp(ow, 0, 1);
        setA(e.pocket, 'd', ow > 0.15 ? `M${F(pxc - pw)} -44.6H${F(pxc + pw)}V-37.4H${F(pxc - pw)}Z` : 'M0 0');
        // the boot: long in profile, short and rounded seen from the front; the toe leads in the foot's heading
        const dir = fs >= 0 ? 1 : -1, hw = 4.6 * Math.abs(fc) + 8.6 * Math.abs(fs), cx = ax + 3.6 * fs, heel = cx - dir * hw, toe = cx + dir * hw;
        const yH = -11.5 - lift, yTo = -11 + 5 * Math.abs(fs) - lift, g0 = -lift;
        setA(e.boot, 'd', `M${F(heel)} ${F(g0)}V${F(yH)}H${F(lerp(heel, toe, 0.45))}Q${F(toe)} ${F(yTo)} ${F(toe)} ${F(g0 - 2)}V${F(g0)}Z`);
        setA(e.sole, 'd', `M${F(Math.min(heel, toe))} ${F(g0 - 2.2)}H${F(Math.max(heel, toe))}V${F(g0 + 0.2)}H${F(Math.min(heel, toe))}Z`);
        setA(e.mid, 'd', `M${F(Math.min(heel, toe))} ${F(g0 - 2)}H${F(Math.max(heel, toe))}`);
        setA(e.tab, 'd', Math.abs(fs) > 0.3 ? `M${F(heel + dir * 0.6)} ${F(yH + 0.4)}V${F(yH + 3.6)}` : 'M0 0');
        setA(e.shade, 'd', Zd(l, 0) < -1 ? `M${F(hx - 6.4)} -56L${F(ax - 4.2)} ${F(ay)}H${F(ax + 4.2)}L${F(hx + 6.4)} -56Z` : 'M0 0');
      });
      // torso: elliptic sections — seat, waist, chest, shoulders — under the vest
      const hw = (a, b) => Math.sqrt((a * c) ** 2 + (b * s) ** 2), w0 = hw(10, 7.6), w1 = hw(9.4, 6.8), w2 = hw(11, 8.2), w3 = hw(12.2, 7.6), ch = 0.8 * s;
      const td = `M${F(-w0)} -48L${F(-w1)} -62L${F(-w2 + ch)} -76L${F(-w3 + ch)} -86Q${F(-w3 + ch)} -92.4 ${F(-w3 + 5 + ch)} -92.4H${F(w3 - 5 + ch)}Q${F(w3 + ch)} -92.4 ${F(w3 + ch)} -86L${F(w2 + ch)} -76L${F(w1)} -62L${F(w0)} -48Q0 -46.4 ${F(-w0)} -48Z`;
      setA(torso, 'd', td); setA(clipP, 'd', td);
      // the shoulder straps run down the front to the chest band; the vest's front opening and the shirt's V
      // orange piping from the shoulder seams down each front panel; the zip; the collar and the undershirt
      [7.6, -7.6].forEach((l, i) => { const x = X(l, 5.6) + ch, w = 0.55 * Math.abs(c) + 0.3, v = Zd(l, 5.6) > -1; setA(straps[i], 'd', v ? `M${F(x - w)} -92.6H${F(x + w)}V-48H${F(x - w)}Z` : 'M0 0'); });
      setA(zip, 'd', c > 0.12 ? `M${F(X(0, 7.6) + ch)} -88V-48` : 'M0 0');
      setA(collar, 'd', c > 0.2 ? `M${F(X(-2.6, 5.2) + ch)} -92.6L${F(X(0, 7) + ch)} -88.2L${F(X(2.6, 5.2) + ch)} -92.6Z` : 'M0 0');
      const flap = sg => `M${F(X(sg * 5.2, 2.8) + ch)} -92.6L${F(X(sg * 4.6, 3.6) + ch)} -95.6L${F(X(sg * 0.7, 6.4) + ch)} -93.6L${F(X(sg * 0.3, 7) + ch)} -88.6Z`;
      setA(vline, 'd', c > 0.2 ? flap(-1) + flap(1) : `M${F(X(-4.4, 3.6) + ch)} -92.6L${F(X(-4, 4) + ch)} -95.6L${F(X(4, 4) + ch)} -95.6L${F(X(4.4, 3.6) + ch)} -92.6Z`);
      // the logo on his left chest: foreshortened as the chest turns, never mirrored
      const lz = Zd(5, 7.4);
      setA(chest, 'transform', `translate(${F(X(5, 7.4) + ch)} -83.4) scale(${F(Math.max(0.01, clamp(lz / 7.4, 0, 1)))} 1)`); setA(chest, 'opacity', lz > 2 ? '1' : '0');
      const iz = Zd(-4.8, 7.6); setA(idCard, 'transform', `translate(${F(X(-4.8, 7.6) + ch)} -71.6) scale(${F(Math.max(0.01, clamp(iz / 7.6, 0, 1)))} 1)`); setA(idCard, 'opacity', iz > 2 ? '1' : '0');
      setA(holster, 'transform', `translate(${F(X(9.6, 0))} -54)`); setA(holster, 'opacity', Zd(9.6, 0) > -4 ? '1' : '0');
      // arms: shoulder → elbow → wrist in white sleeves, cuffs and gloves; the right hand keeps hold of the
      // bucket, held a little out from the leg
      const wr = {};
      [['L', 12.6, [13, 1.2], TW.L(Q)], ['R', -12.6, [-14.6, 0.8], TW.R(Q)]].forEach(([k, l, el, wv]) => {
        const e = arms[k], sx = X(l, 0) + ch, ex = X(el[0], el[1]), wx = X(wv[0], wv[1]);
        setA(e.sl, 'd', `M${F(sx - 4.4)} -88Q${F(sx)} -95 ${F(sx + 4.4)} -88L${F(ex + 3.2)} -69L${F(wx + 2.6)} -55H${F(wx - 2.6)}L${F(ex - 3.2)} -69Z`);
        setA(e.fold, 'd', `M${F(ex - 2.2)} -70Q${F(ex)} -68.6 ${F(ex + 2.2)} -70`);
        setA(e.cuff, 'd', `M${F(wx - 2.7)} -55.6H${F(wx + 2.7)}L${F(wx + 2.6)} -51.4H${F(wx - 2.6)}Z`);
        setA(e.gcuff, 'd', `M${F(wx - 2.7)} -52H${F(wx + 2.8)}L${F(wx + 2.9)} -49.8H${F(wx - 2.8)}Z`);
        setA(e.glove, 'd', `M${F(wx - 2.8)} -50.2Q${F(wx - 3.4)} -44 ${F(wx)} -42.8Q${F(wx + 3.4)} -44 ${F(wx + 2.9)} -50.2Z`);
        setA(e.shade, 'd', Zd(l, 0) < -2 ? `M${F(sx - 4.2)} -88L${F(ex - 3)} -69L${F(wx - 2.4)} -55H${F(wx + 2.4)}L${F(ex + 3)} -69L${F(sx + 4.2)} -88Z` : 'M0 0');
        wr[k] = wx;
      });
      setA(bucket, 'transform', `translate(${F(wr.R)} -45.9) rotate(${F(Q.sway || 0)})`);
      // head: ears, neck, skull and jaw, glasses, nose and mouth on the side that faces us, helmet and mark
      const hr = (Q.head !== undefined ? Q.head : Q.psi) * Math.PI / 180, hc = Math.cos(hr), hs = Math.sin(hr), HX = (l, f) => l * hc + f * hs, HZ = (l, f) => -l * hs + f * hc;
      const hx0 = 1.3 * s;
      // the skull and jaw in horizontal sections [y, half-width, front depth, back depth]: crown, temples, eyes,
      // cheekbones, mouth, jaw, chin. Each section is an ellipse whose front and back halves differ, so the outline
      // keeps the brow, cheek, jaw and chin at every heading (and the chin and nose lead as he turns).
      const SEC = [[-109.6, 3.6, 4.0, 4.6], [-108, 5.3, 6.0, 6.8], [-105.6, 5.8, 6.6, 7.2], [-102.6, 5.8, 6.9, 6.8], [-100.2, 5.6, 7.0, 6.0],
        [-98.2, 4.9, 6.8, 4.4], [-96.6, 3.9, 6.5, 3.0], [-95.4, 2.4, 5.9, 1.4], [-94.9, 0.9, 4.8, 0.5]];
      const edge = (a, b) => Math.sqrt((a * hc) ** 2 + (b * hs) ** 2);
      const Rt = SEC.map(([y, a, bf, bb]) => [hx0 + edge(a, hs >= 0 ? bf : bb), y]), Lt = SEC.map(([y, a, bf, bb]) => [hx0 - edge(a, hs >= 0 ? bb : bf), y]);
      setA(headP, 'd', smooth([...Rt, ...Lt.reverse()]));
      setA(neck, 'd', `M${F(-3.1 + hx0 * 0.3)} -90.8L${F(-3.3 + hx0 * 0.4)} -97.6H${F(3.3 + hx0 * 0.4)}L${F(3.1 + hx0 * 0.3)} -90.8Z`);
      [[5.6, 0], [-5.6, 1]].forEach(([l, i]) => { const z = HZ(l, -0.4); setA(ears[i], 'cx', F(hx0 + HX(l, -0.4))); setA(ears[i], 'rx', F(0.9 + 0.8 * Math.abs(hs))); setA(ears[i], 'opacity', z > -3 ? '1' : '0'); });
      // a point on the face's surface at lateral l, on section k (front half): screen x and depth
      const surf = (l, k) => { const [, a, bf] = SEC[k], f = bf * Math.sqrt(Math.max(0, 1 - (l / a) ** 2)); return [hx0 + HX(l, f), HZ(l, f)]; };
      // jaw shading: from the cheekbones down to the jaw line
      const jl = [-4.6, -2.4, 0, 2.4, 4.6].map(l => surf(l * 0.95, 7)), cl = [-4.6, 0, 4.6].map(l => surf(l, 5));
      setA(jawSh, 'd', `M${F(cl[0][0])} -99.2Q${F(jl[1][0])} -95.6 ${F(jl[2][0])} -95.2Q${F(jl[3][0])} -95.6 ${F(cl[2][0])} -99.2Q${F(jl[2][0])} -97 ${F(cl[0][0])} -99.2Z`);
      const ck = surf(3.4 * (hs < 0 ? -1 : 1), 4);
      setA(cheek, 'd', ck[1] > 1 ? `M${F(ck[0] - 1.6)} -101Q${F(ck[0])} -101.8 ${F(ck[0] + 1.6)} -101Q${F(ck[0])} -100.4 ${F(ck[0] - 1.6)} -101Z` : 'M0 0');
      // wraparound safety glasses: one black band that follows the face — top straight under the brow, the lower
      // edge dipping under each eye and rising over the nose
      const top = [], bot = [];
      for (let l = -5.8; l <= 5.81; l += 0.58) {
        const [x, z] = surf(clamp(l, -5.75, 5.75), 3); if (z < -0.2) continue;
        top.push([x, -104.5]); bot.push([x, -101.4 + 1.1 * Math.exp(-(l * l) / 1.2) - 0.7 * Math.max(0, Math.abs(l) - 4.6)]);
      }
      setA(specs, 'd', top.length > 1 ? 'M' + [...top, ...bot.reverse()].map(p => F(p[0]) + ' ' + F(p[1])).join('L') + 'Z' : 'M0 0');
      const g0 = surf(-1.2, 3), g1 = surf(-3.6, 3);
      setA(glint, 'd', g0[1] > 1 && g1[1] > 1 ? `M${F(g1[0])} -103.8L${F(g0[0])} -103.9` : 'M0 0');
      // nose: seen from the front a soft shadow down one side and under its base; turning, it leads the outline
      const nx = hx0 + HX(0, 7.1);
      setA(nose, 'd', Math.abs(hs) > 0.2 ? `M${F(hx0 + HX(0, 6.6))} -101.6L${F(nx + 1.4 * hs)} -99.4L${F(hx0 + HX(0, 6.8))} -98.9Z`
        : `M${F(nx + 0.2)} -101.4Q${F(nx + 1)} -99.8 ${F(nx + 0.9)} -99.1Q${F(nx)} -98.6 ${F(nx - 0.9)} -99.1Q${F(nx)} -99.4 ${F(nx + 0.2)} -101.4Z`);
      const m0 = surf(-1.5, 6), m1 = surf(1.5, 6), mc = surf(0, 6);
      setA(mouth, 'd', mc[1] > 1.5 ? `M${F(m1[0])} -97.4Q${F(mc[0])} -97 ${F(m0[0])} -97.4` : 'M0 0');
      const kx = hx0 + 0.6 * hs, krx = Math.sqrt((7.6 * hc) ** 2 + (8.8 * hs) ** 2);
      setA(dome, 'd', `M${F(kx - krx)} -104.6A${F(krx)} 7.4 0 0 1 ${F(kx + krx)} -104.6Z`);
      setA(brim, 'cx', F(kx + 1.6 * hs)); setA(brim, 'rx', F(krx + 0.3 + 1.8 * Math.abs(hs)));
      setA(ridge, 'd', `M${F(kx - krx * 0.55)} -109.8Q${F(kx)} -113 ${F(kx + krx * 0.55)} -109.8`);
      setA(mark, 'transform', `translate(${F(kx + HX(0, 6.8))} -108.6) scale(${F(Math.max(0.01, hc))} 1)`); setA(mark, 'opacity', hc > 0.2 ? '1' : '0');
      // paint far to near; the bucket sits just under the arm that carries it
      const z = { legL: Zd(5, 0) - 2, legR: Zd(-5, 0) - 2, torso: 0, armL: Zd(10.4, 0) + 1.5, armR: Zd(-10.4, 0) + 1.5, head: 30 };
      z.bucket = z.armR - 0.3;
      const ord = Object.keys(z).sort((p, q) => z[p] - z[q]).join(',');
      if (ord !== order) { order = ord; ord.split(',').forEach(k => root.appendChild(layer[k])); }
      void chestIn;
    }
    return { root, pose, heap };
  }
  // the front view of the artwork technician, shown while he turns: squeezed toward profile as he turns away from
  // us, with the bucket (and its sample) hanging from his right fist
  function mkFront(parent, A, heapSvg) {
    const root = G(parent, { style: 'display:none' }); M(root, A.shadow);
    const body = G(root), bk = G(body), heap = M(bk, heapSvg); M(bk, A.bucket); M(body, A.front);
    return { root, heap, pose(Q, alpha) {
      const c = Math.cos(Q.psi * Math.PI / 180);
      setA(root, 'transform', `translate(${F(Q.x)} ${F(Q.y)})`); setA(root, 'opacity', F(alpha));
      setA(body, 'transform', `scale(${F(0.52 + 0.48 * c)} 1)`);
      setA(bk, 'transform', `translate(${F(A.frontFist[0])} ${F(A.frontFist[1])}) rotate(${F(Q.sway || 0)})`);
    } };
  }
  function zoneQ({ b, a, f, r }) {
    const LX = 4130, PILE = 4950, TRK = 5500, SITE = 6420, XS = 3610, D2R = Math.PI / 180;
    const Lb = ART.lab(), lx = x => LX + x, FLY = GY + Lb.FL;
    M(b, ART.hills(2600, 210, 17, 4050), { transform: at0(0) });

    /* ---- the laboratory: interior (static), apparatus and people (moving), facade and glazing in front ---- */
    M(b, Lb.interior, { transform: at0(LX) });
    const labDyn = cull(G(a, { transform: at0(LX) }), LX - 20, LX + 600);
    act(8, M(labDyn, Lb.glow), { o: [[2.4, 0], [2.8, 1], [6.4, 1], [6.8, 0]] });
    act(8, E('rect', { x: 135, y: -77.5, width: 13, height: 2.6, fill: '#c8ffd9' }, labDyn), { o: [[2.44, 0], [2.48, 1], [2.74, 1], [2.78, 0]] });
    const hammer = M(labDyn, Lb.hammer);
    act(8, hammer, { y: [[3.62, 0], [3.7, 97, 'i'], [3.9, 97], [4.25, 0]] });
    const stack = G(G(labDyn, { transform: `translate(0 ${Lb.SK})` })); // the shaker stands Lb.SK lower than drawn
    M(stack, Lb.sieves);
    Lb.material.forEach((mk, i) => act(8, M(stack, mk), { o: [[3.42 + i * 0.17, 0], [3.52 + i * 0.17, 1]] }));
    tstream(8, stack, 'M380 -102L377 -92', { t0: 3.22, t1: 3.36, rate: 60, travel: 0.12, size: [0.9, 1.6], seed: 140, jitter: 10 });
    tstream(8, stack, 'M372 -98L388 -50', { t0: 3.42, t1: 4.3, rate: 22, travel: 0.32, size: [0.6, 1.1], seed: 141, jitter: 24 });
    up(8, t => { const on = t > 3.36 && t < 4.46 ? Math.min(1, (t - 3.36) / 0.08, (4.46 - t) / 0.08) : 0; setA(stack, 'transform', on ? `translate(${F(Math.sin(t * 210) * 1.4 * on)} ${F(Math.sin(t * 173 + 1) * 0.8 * on)})` : 'translate(0 0)'); });
    act(8, M(labDyn, `<path class="screen-curve" d="${Lb.graph}"/>`), { draw: [[4.3, 0], [5.0, 1]], o: [[4.25, 0], [4.3, 1]] });

    // the technicians: one samples, carries, weighs and sieves; the other runs the workstation
    const people = G(a);
    const T1 = mkPerson(people, 'qa1'), T2 = mkPerson(people, 'qa2');
    T2.scoop.style.display = 'none'; T2.bucket.style.display = 'none';
    // stones: the sample in the scoop, in the bucket, and the few that travel between them
    // the body's measures (from the rig, so the drawn figure and the artwork both fit): ankle height, standing hip,
    // shoulders, the wrists hanging relaxed, the grip in the fist, and the bucket's shape
    const LT = T1.L, BG = T1.A.bucketG, AH = LT.ankle, STAND = -(LT.thigh + LT.shin + LT.ankle - 1), DS = (LT.thigh + LT.shin) / 51;
    const HANG = STAND - LT.sh + LT.upper + LT.fore + 0.5, HG = LT.grip, FEET = [[4, -AH], [-6, -AH]], BKT = [24, -BG.H];
    const SA = T1.A.stones, rk = (r, s, i) => (SA ? `<g transform="rotate(${(s * 47) % 360}) scale(${F(r / 2.4)})">${SA[i % SA.length]}</g>` : ART.rock(r, s).svg);
    // six stones: in the scoop (scoop coordinates) and the same six heaped in the bucket's mouth, in the order they land
    const LOADP = SA ? [[10, -0.2, 2.5], [12.6, -0.7, 2.6], [15.2, -0.4, 2.4], [17.4, 0.2, 2.3], [11.4, -2.1, 2.4], [14.2, -2.3, 2.5]]
      : [[12.6, 4.6, 2.3], [15.8, 4.2, 2.6], [18.6, 5, 2.1], [14.2, 2.6, 2], [13.4, 3.4, 2], [17, 3.6, 2.2]];
    T1.load.innerHTML = LOADP.map(([x, y, r], i) => `<g transform="translate(${x} ${y})">${rk(r, 860 + i, i)}</g>`).join('');
    const MY = BG.mouthY, HEAPP = [[-3.4, MY - 0.2], [0.4, MY - 0.4], [3.8, MY - 0.1], [-1.6, MY - 1.6], [2, MY - 1.7], [-5.6, MY + 0.3]];
    T1.heap.innerHTML = `<path fill="url(#a-pileback)" d="M-7.6 ${F(MY + 0.6)}Q0 ${F(MY - 5)} 7.6 ${F(MY + 0.6)}Z"/>` + HEAPP.map(([x, y], i) => `<g transform="translate(${x} ${y})">${rk(2.2 + (i % 3) * 0.3, 870 + i, i)}</g>`).join('');
    const heapSt = [...T1.heap.children].slice(1);
    act(8, T1.heap, { o: [[1.1, 0], [1.11, 1], [3.24, 1], [3.34, 0]] }); // the sample shows in the bucket as the stones land
    act(8, T1.scoop, { o: [[1.375, 1], [1.38, 0]] }); act(8, T1.holster, { o: [[1.375, 0], [1.38, 1]] });
    // the turnaround figure (same PPE, same bucket and sample) takes over while he turns round
    const FR = T1.A.front ? mkFront(people, T1.A, T1.heap.innerHTML) : null;
    const TT = FR ? null : mkTurner(people, 'qa1t', ART.technician('qa1t').bucket); if (TT) TT.heap.innerHTML = T1.heap.innerHTML;

    // T1's performance, as keyframes on its clock (local coords face +x, toward the 20 mm pile; feet planted).
    // The sampling arm is posed from the shoulder down — upper arm (ua), forearm (fa), wrist bend (d) — so the
    // shoulder leads, the elbow only flexes and the wrist makes small corrections within ±40°; the scoop sits in
    // an oblique grip and turns with the forearm. The bucket hand reaches by IK. Every reach keeps the hands,
    // the scoop and the bucket clear of the face.
        const KT = { // [τ, value] pairs
      // stand · prepare (0.42) · squat and set the bucket down beside his feet (0.6) · turn at the waist toward the
      // pile and take the sample from it with the scoop (0.6–0.86, see SC) · turn back and bring the loaded scoop over
      // the bucket (0.86–0.98) · tip it out into the bucket (1.04–1.17) · stand and clip the scoop to the belt
      // (1.22–1.38) · squat for the bucket (1.5) · lift it to the waist and inspect the sample, a small nod
      // (1.66–1.74) · relax (1.8)
      lean: [[0, 2], [0.2, 2], [0.42, 10], [0.6, 30, 's'], [0.7, 36], [0.82, 36], [0.94, 28, 's'], [1.04, 30], [1.17, 30], [1.24, 22], [1.32, 8, 's'], [1.38, 8], [1.5, 34, 's'], [1.56, 34], [1.66, 12, 's'], [1.74, 14], [1.8, 4]],
      drop: [[0, 0], [0.42, 2], [0.6, 18, 's'], [0.86, 18], [0.98, 11], [1.2, 11], [1.32, 2, 's'], [1.38, 2], [1.5, 18, 's'], [1.56, 18], [1.66, 3, 's'], [1.8, 0]],
      look: [[0, 4], [0.2, 4], [0.42, 12], [0.6, 12], [0.7, 16], [0.86, 12], [0.98, 18], [1.2, 18], [1.3, 12], [1.38, 8], [1.5, 10], [1.56, 10], [1.66, 16], [1.69, 10], [1.72, 16], [1.8, 6]],
      // the waist turn toward the pile while he digs (feet stay planted)
      twist: [[0, 0], [0.58, 0], [0.68, 36, 's'], [0.84, 36], [0.98, 22, 's'], [1.2, 22], [1.3, 0, 's'], [1.8, 0]], // (partly turned while pouring: the scoop is seen from the side)
      // the scoop arm from the shoulder down while it is not aimed at the pile or the bucket (before 0.58, after 1.3)
      ua: [[0, 4], [0.2, 4], [0.42, -15], [0.6, -30], [1.22, -10], [1.3, 2], [1.38, 8], [1.5, 10], [1.56, 10], [1.66, 30], [1.74, 30], [1.8, 6]],
      fa: [[0, -40], [0.2, -40], [0.42, -60], [0.6, -50], [1.22, -20], [1.3, -8], [1.38, -5], [1.5, -20], [1.56, -20], [1.66, -80], [1.74, -80], [1.8, -25]],
      d: [[0, 4], [0.2, 4], [0.42, 10], [0.6, 20], [1.22, 30], [1.3, 40], [1.38, 40], [1.5, -8], [1.8, -8]],
      // the bucket hand: sets the bucket down, rests on the knee while he samples, picks the bucket up again
      bx: [[0, 9], [0.2, 9], [0.42, 9], [0.6, BKT[0] - HG[0]], [0.64, 10], [1.22, 10], [1.32, 3], [1.38, 3], [1.5, BKT[0] - HG[0]], [1.56, BKT[0] - HG[0]], [1.66, 16], [1.74, 16], [1.8, 13]],
      by: [[0, HANG + 1], [0.2, HANG + 1], [0.42, HANG + 1.5], [0.6, BKT[1] - HG[1]], [0.64, STAND + 18 * DS], [1.22, STAND + 18 * DS], [1.32, HANG + 1], [1.38, HANG + 1], [1.5, BKT[1] - HG[1]], [1.56, BKT[1] - HG[1]], [1.66, STAND - 8], [1.74, STAND - 8], [1.8, HANG]],
    };
    KT.drop = KT.drop.map(k => [k[0], k[1] * DS, ...k.slice(2)]); // (a longer-legged figure squats deeper to reach the same ground)
    // the sample, physically: the 20 mm pile (the fourth bay of the stockyard) is the source. Its surface comes from
    // the pile's own profile, so the scoop meets the heap where it is drawn. The bowl approaches above the toe (A0),
    // enters the surface (A, 2 units into the stones), drags into the heap (B) and lifts out (C); it then travels to
    // the bucket — its lip over the bucket's mouth — and tips. Each stone enters the scoop while the bowl is in the
    // heap, and leaves it only over the bucket, falling into it.
    const P20 = { cx: 3080 + 130 * 3.5, hw: 62, h: 102 };
    const surf20 = x => GY - P20.h * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x - P20.cx) / P20.hw, 1.25)), 1.08);
    const DIG = { A0: [3580, surf20(3580) - 9], A: [3576, surf20(3576) + 2.2], B: [3566, surf20(3566) + 2.6], C: [3571, surf20(3571) - 12] };
    const SC = { // the scoop aimed (w: 0 the arm's own pose, 1 aimed); alpha: its pitch (0 level, + tipped down)
      w: [[0, 0], [0.58, 0], [0.66, 1, 's'], [1.22, 1], [1.3, 0, 's'], [1.8, 0]],
      alpha: [[0, 10], [0.6, 20], [0.66, 32], [0.7, 34], [0.8, 26], [0.86, -6, 's'], [0.98, 6], [1.04, 8], [1.12, 60, 's'], [1.17, 60], [1.23, 14, 's'], [1.8, 14]],
    };
    const LOADT = [0.72, 0.734, 0.748, 0.762, 0.776, 0.79], POUR = [1.07, 1.08, 1.09, 1.1, 1.11, 1.12], FALL = 0.045, OVER_LIP = 13;
    function scoopPlan(t) {
      const w = kf(SC.w, t), alpha = kf(SC.alpha, t), seg = (a, b, t0, t1) => lerpP(a, b, ease(clamp((t - t0) / (t1 - t0), 0, 1)));
      let p = DIG.A0, over = 0, arc = 0;
      if (t >= 0.66 && t < 0.7) p = seg(DIG.A0, DIG.A, 0.66, 0.7);
      else if (t >= 0.7 && t < 0.8) p = seg(DIG.A, DIG.B, 0.7, 0.8);
      else if (t >= 0.8 && t < 0.86) p = seg(DIG.B, DIG.C, 0.8, 0.86);
      else if (t >= 0.86) { p = DIG.C; over = ease(clamp((t - 0.86) / 0.12, 0, 1)); arc = 8 * Math.sin(Math.PI * over); }
      return { w, alpha, p, over, arc, lift: OVER_LIP };
    }
    // how many stones are in the scoop, each one's fall into the bucket (0–1), how many lie in the bucket
    function sampleState(t) {
      const pour = POUR.map(t0 => (t - t0) / FALL), landed = pour.filter(x => x >= 1).length;
      return { loadN: t >= 1.3 ? 0 : LOADT.filter(x => t >= x).length, pour, landed };
    }
    // the scoop arm aimed by the plan, in the 2D rig (its own scoop: the drawn figure when there is no 3D)
    function scoopArm2D(t, H, lean) {
      const S = add(H, rotP(add(LT.shN || [1.5, 0], [0, -LT.sh]), lean)), ua = kf(KT.ua, t), fa = kf(KT.fa, t), J = add(S, rotP([0, T1.L.upper], ua)), E = add(J, rotP([0, T1.L.fore], clamp(fa, ua - 145, ua)));
      const fk = { ua, fa, d: kf(KT.d, t) }, sp = scoopPlan(t); if (sp.w <= 0) return fk;
      const ax = rotP([1, 0], sp.alpha), off = sub(T1.A.lip, T1.A.bowl)[0];
      const mouth = add(BKT, [0, MY]), overL = sub(add(mouth, [0, -sp.lift]), [ax[0] * off, ax[1] * off]);
      const pileL = [(sp.p[0] - XS) * -1, sp.p[1] - GY], bowlL = add(lerpP(pileL, overL, sp.over), [0, -sp.arc]);
      const h = sp.alpha - 45, wr = sub(bowlL, rotP(T1.tool(add(T1.A.bowl, [-0.2, 0])), h));
      return { w: lerpP(E, wr, sp.w), h: lerp(fa + fk.d, h, sp.w) };
    }
    const door = lx(Lb.door), bal = lx(122), sh = lx(347), ease = EASE.io;
    const CARRY = add([3, HANG], HG); // the bucket's handle while it is carried at his side (wrist [3, −51.5], hand down)
    const LIP0 = [26, -72], LIP1 = [33, -70]; // the bucket's front rim, held up at the sieve / while pouring
    // the bucket's short damped settle after it is lowered at 1.74–1.8 (degrees of swing under the hand)
    const settle = t => (t > 1.77 ? 3.2 * Math.exp(-(t - 1.77) / 0.06) * Math.sin(Math.PI * (t - 1.77) / 0.045) : 0);
    /* ---- walking: planned footsteps ---- */
    // Every footfall is a fixed point on the ground, and when each foot lifts and lands is set by how far his hip
    // has travelled (never by time), so a planted foot cannot slide at any scroll speed, forward or back. A step:
    // heel strike (the toe comes down about the heel) · flat stance · heel-off (the heel rises about the toe) ·
    // swing (the foot clears the ground in an arc and reaches for the next heel strike). Both feet share the
    // ground at every weight transfer. From standing (near foot 4 ahead of the hip, far foot 6 behind) the far foot
    // takes a short first step; steps of about 30 follow; a closing step brings him back to standing. The legs
    // reach each ankle by IK from the hip, which dips at each double support and rises over the planted foot.
    const HEEL = [LT.heel ?? -4.6, AH], TOE = [LT.toe ?? 11.6, AH], STRIKE = -12, PUSH = 20, LIFT = 3.6;
    const ankleAt = (pv, piv, a) => sub(pv, rotP(piv, a)); // ankle from a ground pivot (world) and the boot's angle
    function gaitPlan(x0, x1, groundY) {
      let n = Math.max(1, Math.round((x1 - x0 - 10) / 30)); if (n % 2 === 0) n += 1; // the far foot makes the last full step
      const L = (x1 - x0 - 10) / n, segs = [[{ x: x0 + 4, land: -1e9 }], [{ x: x0 - 6, land: -1e9 }]]; // near, far
      for (let k = 1; k <= n + 1; k++) {
        const j = k <= n ? k % 2 : 0, x = k <= n ? x0 + 4 + k * L : x1 + 4, prev = segs[j][segs[j].length - 1];
        prev.lift = k === 1 ? x0 + 6 : prev.x + 17.2;
        segs[j].push({ x, land: k === 1 ? x0 + 4 + L - 16 : k <= n ? x - 20 : x1 - 7 }); // the closing step is flat before he stops
      }
      // the body rises with the ground: between the first footfall on the new level and the next one
      const up = [...segs[0], ...segs[1]].filter(s => groundY(s.x) !== groundY(x0)).sort((p, q) => p.land - q.land)[0];
      const rootY = h => (up ? lerp(groundY(x0), groundY(up.x), EASE.s(win(h, up.land, up.land + L))) : groundY(x0));
      function foot(j, h) {
        const S = segs[j]; let i = 0; while (i + 1 < S.length && h >= S[i + 1].land) i++;
        const s0 = S[i], g0 = groundY(s0.x), hoFrom = Math.max(s0.lift - 8, s0.land > -1e8 ? s0.land + 5 : x0);
        const planted = (hh) => {
          if (s0.land > -1e8 && hh < s0.land + 5) { const a = STRIKE * (1 - EASE.s((hh - s0.land) / 5)); return [...ankleAt([s0.x + HEEL[0], g0], HEEL, a), a]; }
          if (s0.lift !== undefined && hh > hoFrom) { const a = PUSH * EASE.s((hh - hoFrom) / (s0.lift - hoFrom)); return [...ankleAt([s0.x + TOE[0], g0], TOE, a), a]; }
          return [s0.x, g0 - AH, 0];
        };
        if (s0.lift === undefined || h <= s0.lift) return planted(h);
        // swing: from the toe-off pose to the next heel strike; the arc clears the ground (and the step up)
        const s1 = S[i + 1], g1 = groundY(s1.x), q = (h - s0.lift) / (s1.land - s0.lift), e = EASE.s(q);
        const A0 = planted(s0.lift), A1 = [...ankleAt([s1.x + HEEL[0], g1], HEEL, STRIKE), STRIKE];
        const y = g1 < g0 ? lerp(A0[1], A1[1], EASE.o(Math.min(1, q * 1.6))) : lerp(A0[1], A1[1], e);
        return [lerp(A0[0], A1[0], e), y - LIFT * Math.sin(Math.PI * Math.pow(q, 0.8)), lerp(A0[2], A1[2], e)];
      }
      // a pose for the hip at h: feet (local to the root), hip height, the gait phase and how far into the walk he is
      return h => {
        const env = win(h, x0, x0 + 14) * (1 - win(h, x1 - 14, x1)), ry = rootY(h), ph = (2 * Math.PI * (h - x0 + 16)) / (2 * L);
        const loc = A => [A[0] - h, A[1] - ry, A[2]];
        return { y: ry, feet: [loc(foot(0, h)), loc(foot(1, h))], hipY: lerp(STAND, STAND + 1.4 + 0.9 * Math.cos(2 * ph), env), ph, env };
      };
    }
    // walking toward the lab (facing right) the bucket is in his right hand, on our side. The free left arm swings
    // with the right leg — forward as the right foot strikes — from the shoulder, elbow softly bent; the carrying arm
    // moves only a little, against it, and the bucket swings slightly behind the stride. The torso leans into the
    // walk a little more at each double support; the head stays level.
    function walkPose(G, h) {
      const w = G(h), c = Math.cos(w.ph), e = w.env;
      return { x: h, y: w.y, face: 1, hip: [0, w.hipY], lean: 2 + 3.5 * e + 0.8 * e * Math.cos(2 * w.ph), look: 4 - 0.8 * e * Math.cos(2 * w.ph), feet: w.feet,
        armR: { w: [3 - 1.4 * e * c, HANG], h: 0 }, armL: { w: [3 + 7.5 * e * c, HANG - 2 + 1.6 * e * Math.abs(Math.sin(w.ph))] }, sway: 2 * e * Math.sin(w.ph - 1) };
    }
    // the turn (τ 1.8–2.0): from facing the pile, through three-quarter and facing us, to facing the lab. The
    // head leads, the body follows, and the feet step round one after the other (each lifts as it moves).
    function turnPose(t) {
      const p = clamp((t - 1.8) / 0.2, 0, 1), psi = -90 + 180 * ease(p), step = (a, b) => { const q = clamp((p - a) / (b - a), 0, 1); return [-90 + 180 * ease(q), 2.2 * Math.sin(Math.PI * q)]; };
      return { x: XS, y: GY, psi, head: clamp(psi + 24 * Math.sin(Math.PI * p), -90, 90), feet: [step(0.06, 0.52), step(0.44, 0.94)], swing: 1.5 * Math.sin(Math.PI * p), sway: settle(t), rw: lerp(13, 3, ease(p)) };
    }
    // the two walks: across the yard and up into the laboratory (its floor starts at the door), then to the shaker
    const WALK1 = gaitPlan(XS, bal, x => (x >= door + 3 ? FLY : GY)), WALK2 = gaitPlan(bal, sh, () => FLY);
    function t1Pose(t) {
      if (t < 1.8) {
        const lean = kf(KT.lean, t), ground = t >= 0.6 && t < 1.56, hold = t < 0.6 || t >= 1.5, hip = [-lean * 0.13, STAND + kf(KT.drop, t)];
        return { x: XS, y: GY, face: -1, hip, lean, look: kf(KT.look, t), feet: FEET, twist: kf(KT.twist, t), scoopTo: scoopPlan(t),
          armF: scoopArm2D(t, hip, lean), armB: { w: [kf(KT.bx, t), kf(KT.by, t)], h: hold ? 0 : undefined }, bucket: ground ? { at: BKT } : null, sway: settle(t) };
      }
      if (t < 2.0) {
        // turning round: the side-view figure holds the two profiles, the turnaround figure everything between
        // (it takes over at three-quarter view, where the two drawings match)
        const Q = turnPose(t), psi = Q.psi;
        if (Math.abs(psi) <= 60) return null;
        const fc = psi < 0 ? -1 : 1, r = psi * D2R, onScreen = ([l, fw]) => fc * (l * Math.cos(r) + fw * Math.sin(r)); // body coords, facing fc
        return { x: XS, y: GY, face: fc, hip: [0, STAND], lean: 4, look: 6, feet: FEET, armR: { w: [onScreen(TW.R(Q)), HANG], h: 0 }, armL: { w: [onScreen(TW.L(Q)), HANG] }, sway: Q.sway };
      }
      if (t < 2.42) {
        // he sets off from standing and slows to a stop at the balance; the steps follow the distance walked
        return walkPose(WALK1, lerp(XS, bal, EASE.s((t - 2.0) / 0.42)));
      }
      if (t < 2.8) {
        // both hands lift the bucket onto the balance pan in front of him, let go while it is weighed and
        // lift it off again; the bucket stays ahead of the face throughout
        const u = ease(clamp(t < 2.48 ? (t - 2.42) / 0.06 : t < 2.72 ? 1 : 1 - (t - 2.72) / 0.08, 0, 1));
        const g = clamp(t < 2.5 ? 1 : t < 2.54 ? 1 - (t - 2.5) / 0.04 : t < 2.66 ? 0 : (t - 2.66) / 0.04, 0, 1);
        const pan = [lx(Lb.balance[0]) - bal, Lb.balance[1] - BG.H - Lb.FL];
        const at = add(lerpP(CARRY, pan, u), [0, -Math.sin(Math.PI * u) * 3]);
        const f = clamp(u * 3, 0, 1);
        return { x: bal, y: FLY, face: 1, hip: [-1, STAND + u * 2], lean: 4 + u * 3, look: 6 + u * 6, feet: FEET,
          // the right hand goes from the handle to the bucket's near side, the left takes the far side; wrists in
          // line with the forearms. Both let go while it is weighed.
          armR: { w: lerpP([3, HANG], lerpP(sub(at, HG), add(at, BG.sideN), f), g), h: f < 0.05 && g > 0.95 ? 0 : undefined }, armL: { w: lerpP([-1, HANG + 1], add(at, BG.sideF), f * g) }, bucket: { at } };
      }
      if (t < 3.05) return walkPose(WALK2, lerp(bal, sh, EASE.s((t - 2.8) / 0.25)));
      // raises the bucket to chest height, takes it under the base with the near hand and tips it into the
      // top sieve: it pivots on its front rim and pours away from him, so it never comes up past the chin
      const u = ease(clamp(t < 3.15 ? (t - 3.05) / 0.1 : t < 3.5 ? 1 : 1 - (t - 3.5) / 0.1, 0, 1));
      const k = ease(clamp(t < 3.19 ? 0 : t < 3.3 ? (t - 3.19) / 0.11 : t < 3.37 ? 1 : 1 - (t - 3.37) / 0.11, 0, 1)), th = 80 * k;
      const lip = lerpP(LIP0, LIP1, k), at = u < 1 ? lerpP(CARRY, sub(LIP0, BG.rimF), u) : add(lip, rotP([-BG.rimF[0], -BG.rimF[1]], th));
      // the left hand comes under the base from the far side; then the right hand lets go of the bail and takes the
      // back of the rim (3.15–3.19, a visible regrip), tips it from there, and goes back to the bail afterwards
      const f = clamp((u - 0.6) / 0.4, 0, 1), rg = t < 3.33 ? win(t, 3.15, 3.19) : 1 - win(t, 3.48, 3.5);
      const onBail = sub(at, rotP(HG, th)), onRim = sub(add(at, rotP(BG.rimB, th)), HG);
      return { x: sh, y: FLY, face: 1, hip: [-1, STAND + u * 1.5], lean: 4 - k * 2, look: 6 + u * 6, feet: FEET,
        armL: { w: lerpP([5, HANG], add(at, rotP(BG.base, th)), f) },
        armR: { w: lerpP(onBail, onRim, ease(rg)), h: th * (1 - rg) }, bucket: { at, tilt: th } };
    }
    T1.pose(t1Pose(1.38)); T1.stow();
    function t2Pose(t) {
      const typing = t > 4.2 && t < 5.2, e = typing ? 1 : 0;
      return { x: lx(492), y: FLY, face: 1, hip: [-1, STAND + 3 * e * (DS - 1) * 7], lean: 2 + 8 * e * (1 + (DS - 1) * 12), look: 4 + 10 * e, feet: FEET, // (the longer-legged artwork figure bends further to reach the keys)
        armF: { w: typing ? [22 + Math.sin(t * 70) * 1.6, -57 - Math.abs(Math.sin(t * 90)) * 1.4] : [4, HANG + 1], h: typing ? 70 : undefined },
        armB: { w: typing ? [30 + Math.cos(t * 63) * 1.6, -57 - Math.abs(Math.cos(t * 81)) * 1.4] : [-1, HANG + 1], h: typing ? 70 : undefined } };
    }
    // the 2D figure's sample stones falling from the scoop's lip into the bucket (only drawn when there is no 3D model,
    // which drops its own)
    const flying = G(r);
    const outS = POUR.map((t0, i) => ({ g: M(flying, rk(LOADP[i][2], 860 + i, i)), t0 }));
    let st1 = null;
    up(8, t => {
      const P1 = t1Pose(t);
      if (FR) {
        // turning (τ 1.8–2.0) the side view hands over to the front view at 70° either side
        const turning = t >= 1.8 && t < 2.0, Q = turning ? turnPose(t) : null, ap = Q ? Math.abs(Q.psi) : 90;
        const pa = ap >= 70 ? 1 : 0, fa = turning && ap < 70 ? 1 : 0; // (a clean cut: the squeezed front view and the profile are nearly the same width there)
        if (P1 && pa > 0) { setA(T1.root, 'style', ''); setA(T1.root, 'opacity', F(pa)); st1 = T1.pose(P1); } else setA(T1.root, 'style', 'display:none');
        if (fa > 0) { setA(FR.root, 'style', ''); FR.pose(Q, fa); } else setA(FR.root, 'style', 'display:none');
      } else if (P1) { setA(T1.root, 'style', ''); setA(TT.root, 'style', 'display:none'); st1 = T1.pose(P1); } else { setA(T1.root, 'style', 'display:none'); setA(TT.root, 'style', ''); TT.pose(turnPose(t)); }
      const mouth = T1.mouth(), SS = sampleState(t), W1 = p => T1.W(add(st1 ? st1.bucket : BKT, [p[0] * (st1 ? st1.face : 1), p[1]]));
      [...T1.load.children].forEach((c, i) => setA(c, 'opacity', i < SS.loadN && !(SS.pour[i] > 0) ? '1' : '0'));
      const lip = T1.lip();
      outS.forEach((s, i) => {
        const p = (t - s.t0) / FALL;
        if (tech || p <= 0 || p >= 1) { setA(s.g, 'opacity', '0'); return; }
        // from the scoop's lip it drops (accelerating) onto its place in the heap
        const to = W1(HEAPP[i]), x = lerp(lip[0], to[0], p), y = lip[1] + (to[1] - lip[1]) * p * p;
        setA(s.g, 'opacity', '1'); setA(s.g, 'transform', `translate(${F(x)} ${F(y)}) rotate(${F(p * 140)})`);
      });
      // each stone shows in the bucket once it has landed
      if (t < 1.8) heapSt.forEach((c, i) => setA(c, 'opacity', i < SS.landed || t >= 1.2 ? '1' : '0'));
      const st2 = T2.pose(t2Pose(t));
      if (tech) {
        // only the technicians the camera can see are posed (the other is hidden until it comes into view)
        const seen = x => x > view[0] - 90 && x < view[1] + 90, x1 = P1 ? P1.x : XS, P2 = t2Pose(t);
        tech.pose('qa1', !seen(x1) ? null : t >= 1.8 && t < 2.0 ? fromTurn(turnPose(t)) : P1 ? from2D(P1, st1, T1, t) : fromTurn(turnPose(t)));
        tech.pose('qa2', seen(P2.x) ? from2D(P2, st2, null) : null);
      }
    });
    /* ---- the technicians in 3D (?tech3d): the same choreography, retargeted onto a rigged model ---- */
    // The 2D rig above still solves every pose; these turn it into the 3D module's terms. Both rigs face +x in their
    // own frame (f forward, y down from the ground); the near side is his right when he faces right.
    let tech = null;
    // while he samples (the close-up) he stands turned about 50° toward us, so his face and the logos on his helmet and chest
    // face the camera; he walks and works in the laboratory in profile
    const SAMPLE_YAW = 39; // (exactly the angle the front-right render was drawn from, so the close-up shows it unaltered)
    const BLAT = 6; // the bucket set down ahead of his knees, a little toward us (clear of the pile and of the scoop's path)
    const shoulders = (H, lean) => ({ near: add(H, rotP([1.5, -36], lean)), far: add(H, rotP([-1, -35.5], lean)) });
    const shown = el => el.style.display !== 'none' && +(el.getAttribute('opacity') ?? 1) > 0.5;
    function from2D(P, st, rig, t) {
      const near = P.face < 0 ? 'L' : 'R', far = near === 'L' ? 'R' : 'L', S = shoulders(st.H, P.lean);
      const feet = { [near]: P.feet[0], [far]: P.feet[1] }, fx = A => ({ f: A[0], y: A[1], a: A[2] || 0 });
      const out = { x: P.x, y: P.y, yaw: P.face * (t !== undefined && t < 1.8 ? SAMPLE_YAW : 90), twist: P.face * (P.twist || 0), hip: st.H, lean: P.lean, look: P.look, feet: { L: fx(feet.L), R: fx(feet.R) },
        wrists: { L: st.L.W, R: st.R.W }, hands: { L: st.L.h, R: st.R.h }, shoulders2D: { [near]: S.near, [far]: S.far }, lat: { L: 1, R: -2.5 } };
      if (!rig) return { ...out, bucket: { mode: 'none' }, scoop: 'none' };
      // the bucket on the ground (τ 0.6–1.56) is gripped while he sets it down and picks it up; around those two moments
      // it travels between hand and ground over 0.06, so nothing jumps
      const toGround = t < 0.6 ? win(t, 0.54, 0.6) : t < 1.56 ? 1 : 1 - win(t, 1.56, 1.62);
      const SS = t < 1.8 ? sampleState(t) : null, heapN = !shown(rig.heap) ? 0 : SS && t < 1.15 ? SS.landed : 6;
      out.bucket = P.bucket && P.bucket.at ? { mode: 'free', at: P.bucket.at, tilt: P.bucket.tilt || 0, lat: BLAT, heapN: SS && t < 1.15 ? SS.landed : heapN, grip: t < 0.63 || (t >= 1.5 && t < 1.56) }
        : { mode: 'hand', sway: P.sway || 0, heapN, toGround: t < 1.8 ? toGround : 0, at: BKT, lat: BLAT };
      out.scoop = shown(rig.scoop) ? 'hand' : shown(rig.holster) ? 'belt' : 'none';
      if (SS) { out.loadN = SS.loadN; out.pour = SS.pour; out.scoopTo = P.scoopTo; } else out.loadN = 0;
      return out;
    }
    function fromTurn(Q) {
      const S = shoulders([0, STAND], 4), wr = TW.R(Q), wl = TW.L(Q);
      const foot = ([fh, lift], l) => ({ lat: l, f: 1.5, y: -4 - lift, heading: fh - Q.psi });
      const yaw = -SAMPLE_YAW + (Q.psi + 90) / 180 * (90 + SAMPLE_YAW); // from the sampling three-quarter view to profile
      return { x: Q.x, y: Q.y, yaw, headYaw: (Q.head !== undefined ? Q.head : Q.psi) - Q.psi, hip: [0, STAND], lean: 4, look: 6,
        feet: { L: foot(Q.feet[0], 5), R: foot(Q.feet[1], -5) }, wrists: { L: [wl[1], -51.5], R: [wr[1], -51.5] }, hands: { L: 0, R: 0 },
        shoulders2D: { L: S.near, R: S.near }, lat: { L: wl[0] - 11, R: wr[0] + 11 }, bucket: { mode: 'hand', sway: Q.sway || 0, heap: shown(T1.heap) }, scoop: 'belt' };
    }
    if (TECH3D) {
      const canvas = document.createElement('canvas'); canvas.className = 'opm-3d'; canvas.setAttribute('aria-hidden', 'true'); actSvg.after(canvas);
      const gen = ++techGen; techLayer = { canvas, api: null };
      const basePath = (document.querySelector('script[src*="operations-motion.js"]')?.src || '').replace(/[^/]+$/, '') || '/assets/operations-motion/';
      const model = T3 === 'old' ? basePath + 'technician.glb' : T3 && T3 !== '1' ? T3 : basePath + 'technician-blender.grip-fix.glb'; // corrected Blender-built character in 3D
      import(basePath + 'operations-tech3d.js').then(m => m.createTech3D({ canvas, url: model, atlas: model.replace(/[^/]+$/, 'technician-atlas.jpg'), ids: ['qa1', 'qa2'] })).then(api => {
        if (gen !== techGen) { try { api.dispose && api.dispose(); } catch (e) { /* superseded by a newer build */ } return; }   // (a rebuild happened while this one was loading)
        tech = api; techLayer.api = api; if (/[?&]opmdebug/.test(location.search)) window.__opmTech = api;
        // the 2D figures stay as the pose solvers but are no longer drawn (their ground shadows stay)
        [T1.root, T2.root, TT && TT.root].filter(Boolean).forEach(g => [...g.children].slice(1).forEach(c => { c.style.display = 'none'; }));
        afterFrame.push(() => {
          if (!visibleZ[8] || !Object.values(tech.people).some(q => q.root.visible)) { canvas.style.display = 'none'; return; }
          canvas.style.display = '';
          const [ax, ay] = anchor();
          tech.render({ x0: cam.x - ax / cam.s, x1: cam.x + (VW - ax) / cam.s, y0: cam.y - ay / cam.s, y1: cam.y + (VH - ay) / cam.s }, { w: stage.clientWidth, h: stage.clientHeight });
        });
        render();
      }).catch(e => { if (gen === techGen) { console.warn('3D technicians unavailable, keeping the drawn ones:', e); canvas.remove(); techLayer = null; } });
    }
    const labFront = cull(G(r, { transform: at0(LX) }), LX - 20, LX + 600);
    M(labFront, Lb.front);

    /* ---- the test report (screen space, a constant reading size on every device) ---- */
    const rep = G(scr), tall = TALL(), RS = tall ? 1.3 : 1, R0 = tall ? [112, 476] : [1030, 130], RW = 520, RH = 704;
    Z[8].extra.push(rep);
    const card = G(rep, { transform: `translate(${R0[0]} ${R0[1]}) scale(${RS})` });
    const txt = (x, y, s, cls, size, anchor = 'start') => { const e = E('text', { x, y, class: cls, 'font-size': size, 'text-anchor': anchor }, card); e.textContent = s; return e; };
    M(card, `<rect x="4" y="9" width="${RW}" height="${RH}" rx="10" fill="#141416" fill-opacity=".08"/><rect class="rp-card" width="${RW}" height="${RH}" rx="10"/>` + ART.logo(24, 22, 84, 'brand') + `<path d="M24 80H${RW - 24}" stroke="${ART.ORANGE}" stroke-width="2"/>`);
    txt(RW - 24, 42, 'MATERIAL QUALITY', 'rp-h', 15, 'end'); txt(RW - 24, 60, 'TEST REPORT', 'rp-h', 15, 'end');
    const field = (x, y, lab, val, bar) => { txt(x, y, lab, 'rp-l', 10.5); if (bar) M(card, `<rect x="${x}" y="${y + 9}" width="${bar}" height="9" rx="2" fill="#e6e2da"/>`); else txt(x, y + 18, val, 'rp-v', 13); };
    field(24, 106, 'BATCH ID', '', 92); field(24, 146, 'MATERIAL', 'Crushed stone aggregate'); field(24, 186, 'GRADE / SIZE', '20 mm'); field(24, 226, 'CLIENT SPECIFICATION', '', 128);
    field(290, 106, 'SAMPLE COLLECTED', 'Stockyard · 20 mm bay'); field(290, 146, 'TEST DATE', '', 84); txt(290, 186, 'REPORT STATUS', 'rp-l', 10.5);
    const stUnder = txt(290, 204, 'Under test', 'rp-v rp-grey', 13), stOk = txt(290, 204, 'Approved', 'rp-v rp-ok', 13);
    act(8, stUnder, { o: [[6.45, 1], [6.5, 0]] }); act(8, stOk, { o: [[6.45, 0], [6.5, 1]] });
    M(card, `<rect x="24" y="262" width="${RW - 48}" height="26" rx="4" fill="#f4f1ec"/>`);
    // the results table: header band, then rows of a fixed pitch; each row's text and result are centred in its band
    // and the result badge sits right-aligned under the RESULT heading (the card scales as a whole on phones)
    const COLR = RW - 36, ROW0 = 288, PITCH = 34;
    txt(36, 279, 'TEST PARAMETER', 'rp-l', 10.5); txt(COLR, 279, 'RESULT', 'rp-l', 10.5, 'end');
    // PASS badge: [pad · tick · gap · PASS · pad] — 11 left padding, a 10-wide tick, 8 between tick and label, 12 right
    const BW = 72, BH = 22, PAD = 11, TICK = 10, GAP = 8;
    ['Sieve analysis / grading', 'Moisture content', 'Aggregate properties (crushing · impact)', 'Flakiness & elongation'].forEach((name, i) => {
      const top = ROW0 + i * PITCH, cy = top + PITCH / 2, tk = 5.2 + i * 0.3, bx = COLR - BW, by = cy - BH / 2;
      txt(36, cy + 4.4, name, 'rp-v', 12.5); M(card, `<path d="M24 ${top + PITCH}H${RW - 24}" stroke="#ece8e1"/>`);
      act(8, M(card, [-10, 0, 10].map(d => `<circle cx="${bx + BW / 2 + d}" cy="${cy}" r="2.6" fill="#c9c4bb"/>`).join('')), { o: [[tk, 1], [tk + 0.05, 0]] });
      const t0 = bx + PAD;
      act(8, M(card, `<rect x="${bx}" y="${by}" width="${BW}" height="${BH}" rx="6" fill="#e3f2e7" stroke="#c7e3cf" stroke-width=".8"/>`
        + `<path d="M${t0} ${cy + 0.2}l3.4 3.4l6.6 -7.4" fill="none" stroke="#2e7d4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
        + `<text x="${t0 + TICK + GAP}" y="${cy + 3.9}" class="rp-pass" font-size="11">PASS</text>`), { o: [[tk, 0], [tk + 0.1, 1]] });
    });
    txt(24, 462, 'GRADING CURVE', 'rp-l', 10.5);
    M(card, `<rect x="24" y="470" width="226" height="86" rx="4" fill="#faf8f4" stroke="#e3ded5"/><path d="M34 546H240M34 476V546" stroke="#cfc9bf"/><path d="M34 540Q90 536 120 510Q150 482 240 478L240 494Q160 498 130 522Q100 546 34 546Z" fill="${ART.ORANGE}" fill-opacity=".12"/>`);
    act(8, M(card, '<path d="M34 544Q96 540 124 516Q154 490 240 486" fill="none" stroke="#24262a" stroke-width="2"/>'), { draw: [[5.1, 0], [5.9, 1]] });
    txt(290, 462, 'REVIEWED BY', 'rp-l', 10.5);
    act(8, M(card, '<path d="M296 520q10 -26 18 -4t14 -10q6 18 16 -2t14 6q10 -14 22 -4" fill="none" stroke="#24262a" stroke-width="1.6" stroke-linecap="round"/>'), { draw: [[6.15, 0], [6.45, 1]] });
    M(card, `<path d="M290 534H${RW - 24}" stroke="#cfc9bf"/>`); txt(290, 550, 'QUALITY CONTROL', 'rp-l', 10);
    // the approval footer: its own band under a rule, with clear space above the stamp and a full bottom margin
    M(card, `<path d="M24 590H${RW - 24}" stroke="#e3ded5"/>`);
    const stamp = G(card);
    M(stamp, `<rect x="-112" y="-26" width="224" height="52" rx="6" fill="#fff" fill-opacity=".85" stroke="#2e7d4f" stroke-width="2.4"/><text y="-2" class="rp-stamp" font-size="17" text-anchor="middle">QUALITY APPROVED</text><text y="16" class="rp-stamp2" font-size="10.5" text-anchor="middle">MEETS CLIENT SPECIFICATION</text>`);
    act(8, stamp, { x: RW / 2, y: 646, r: -2, s: [[6.5, 1.3], [6.72, 1, 'o']], o: [[6.5, 0], [6.62, 1]] });
    act(8, card, { o: [[4.6, 0], [5.0, 1], [7.1, 1], [7.5, 0]], y: [[4.6, R0[1] + 16], [5.0, R0[1], 'o']], x: R0[0], s: RS });
    // a dashed link from the workstation's screen to the report it produces
    const link = E('path', { class: 'rp-link' }, rep); rep.insertBefore(link, rep.firstChild); // (under the card)
    act(8, link, { o: [[4.7, 0], [5.0, 0.9], [7.0, 0.9], [7.3, 0]] });
    up(8, () => { const [sx, sy] = project(lx(Lb.screen[0]), GY + Lb.screen[1]), ex = R0[0], ey = R0[1] + RH * RS * 0.42; setA(link, 'd', `M${F(sx)} ${F(sy)}C${F(sx + 80)} ${F(sy)} ${F(ex - 80)} ${F(ey)} ${F(ex)} ${F(ey)}`); });

    /* ---- release in the yard: the approved batch is marked for dispatch ---- */
    const pile = ART.pile(300, 140, 23, { sr: 4.6, strata: 1 });
    M(b, pile.shadow + pile.strata[0], { transform: at0(PILE) });
    act(8, M(b, `<path d="M0 0V-96" stroke="#3a3c40" stroke-width="3"/><rect class="o" fill="#fbfaf7" x="-34" y="-128" width="68" height="34" rx="3"/><circle cx="-20" cy="-111" r="8" fill="#2e7d4f"/><path d="M-24 -111l3 3l6 -7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M-8 -116H26M-8 -106H18" stroke="#9a968f" stroke-width="2.4"/>`, { transform: at0(PILE - 168) }), { o: [[6.8, 0], [7.15, 1]], y: [[6.8, GY - 10], [7.15, GY, 'o']], x: PILE - 168 });
    // the label starts at the sign's left edge (clear of the laboratory) and runs over the released batch, above its peak
    label(8, PILE - 202, GY - 160, 'RELEASED FOR DISPATCH', { cls: 'acc-t', anchor: 'start', o: [[6.95, 0], [7.3, 1]] });

    /* ---- the OM Group tipper, waiting to be loaded (a little further back than the loader) ---- */
    const TP = ART.tipper(), tx = [[10.6, TRK], [12.0, 6270, 'i']];
    const tp = G(a);
    const tpBody = G(tp); M(tpBody, TP.truck);
    const LB = [(TP.bed.x0 + TP.bed.x1) / 2, TP.bed.y + 12]; // the load's base: inside the body, below the rim
    const loadG = G(tpBody, { transform: `translate(${LB[0]} ${LB[1]})` });
    const LD = ART.pile(250, 30, 31, { sr: 7, strata: 2 }), loadBk = G(loadG), loadSt = G(loadG);
    const fallG = G(tpBody); // stones falling into the body: behind its near wall, under the loader's bucket
    M(tpBody, TP.body); M(tp, TP.wheels); M(tp, TP.fenders);
    act(8, tp, { x: tx, y: GY - 8 });
    rollWheels(8, tp, t => kf(tx, t) - TRK);

    /* ---- the wheel loader: scoops at the approved pile, turns, lifts, dumps into the tipper ---- */
    // One mechanism: the lift arm turns about the tower pin, the bucket angle drives the Z-bar (the bell
    // crank is solved so the tilt link keeps its length), and both cylinders are drawn pin to pin.
    const X = ART.wheelLoader(), ZB = X.Z, PIN = [X.armL, 0], lg = G(a), H = 5355, Pk = 5288, Tk = 5423;
    // The loader turns round as a solid machine. Every part lies at a lateral depth w (+ = the side facing us) on
    // the rear or the front frame, and the two frames turn about the centre hinge at their own headings — the
    // front leads, as an articulated loader steers. At heading θ a side part lands at x' = hinge + (x − 10)·cosθ
    // − w·sinθ (so side panels foreshorten and wheels become ellipses), while the front-view drawings — cab,
    // frame and towers, both lift arms, the bucket mouth and every tyre tread — open up by sinθ. The machine
    // keeps its volume at every angle; it never folds into an edge-on sliver.
    const shadowE = E('ellipse', { ry: 10, fill: 'url(#a-shadow)' }, lg);
    const LY = [], layer = (sec, w, sk, x, face) => { const g = G(lg), o = { g, inner: G(g), sec, w, sk, x, face }; LY.push(o); return o; };
    const farR = layer('r', -44, -10, -76), farF = layer('f', -44, -9, 76);
    const rBody = layer('r', 34, 0, -80), cabF = layer('r', 0, 0.5, 39, true);
    const fBody = layer('f', 30, 1, 60), frameF = layer('f', 0, 1.5, 100, true);
    const rW = layer('r', 60, 10, -76), fW = layer('f', 60, 11, 76), rFen = layer('r', 61, 12, -76), fFen = layer('f', 61, 13, 76);
    const cyl = layer('f', 34, 19, 90), armL = layer('f', 40, 20, 110), armsF = layer('f', 0, 20.5, 115, 'abs');
    const bHull = layer('f', 0, 39.5, 200, 'abs'), bkt = layer('f', 68, 40, 200), bktF = layer('f', 0, 40.5, 200, 'abs'), zbar = layer('f', 0, 63, 120);
    M(rBody.inner, X.bodyRear); const brands = X.brands.map(bd => ({ g: M(rBody.inner, bd.svg), cx: bd.cx }));
    M(fBody.inner, X.bodyFront); M(cabF.inner, X.faces.cab); M(frameF.inner, X.faces.frame);
    const wheelsG = [M(rW.inner, X.wheelRear), M(fW.inner, X.wheelFront)];
    M(rFen.inner, X.fenderRear); M(fFen.inner, X.fenderFront);
    // tyre treads (machine coordinates, behind each wheel's outer face) and the far tyres' inner faces
    const tread = o => { const r = E('rect', { y: -2 * X.r, height: 2 * X.r, rx: 4, class: 'o', fill: 'url(#a-tread)' }); o.g.insertBefore(r, o.inner); return r; };
    const treads = [[rW, -76, 28, 60], [fW, 76, 28, 60], [farR, -76, -28, -60], [farF, 76, -28, -60]].map(([o, x, w0, w1]) => ({ el: tread(o), x, w0, w1, o }));
    const inner = [[farR, -76], [farF, 76]].map(([o, x]) => ({ x, o, d: E('ellipse', { cy: -X.r, ry: X.r, class: 'o', fill: '#1f2023' }, o.g), h: E('ellipse', { cy: -X.r, ry: X.r * 0.36, fill: '#2c2e32' }, o.g) }));
    const liftCyl = cylinder(cyl.inner, 12, 56), tiltCyl = cylinder(cyl.inner, 10, 60);
    const armG = G(armL.inner); M(armG, X.arm);
    const buckG = G(bkt.inner), loadIn = M(buckG, X.load); M(buckG, X.bucket);
    const armC = G(zbar.inner), linkG = G(armC); M(linkG, X.link); const crankG = G(armC); M(crankG, X.crank);
    // front views of the two lift arms and of the bucket mouth (u across the machine)
    const armBars = [-40, 40].map(u => ({ u, el: E('path', { class: 'o', fill: 'url(#a-paint)' }, armsF.inner) }));
    const hullP = E('path', { class: 'o', fill: 'url(#a-bucket)' }, bHull.inner);
    const bFace = E('path', { class: 'o', fill: 'url(#a-bucket)' }, bktF.inner), bTop = E('path', { fill: '#5d6066' }, bktF.inner), bEdge = E('path', { class: 'o', fill: 'url(#a-chrome)' }, bktF.inner);
    const bLoad = G(bktF.inner); { const R = rng(91); let s = ''; for (let i = 0; i < 15; i++) s += `<g transform="translate(${F(-60 + i * 8.6 + R() * 3)} ${F(R() * 3)})">${ART.rock(4.6 + R() * 2.6, 990 + i).svg}</g>`; bLoad.innerHTML = s; }
    const BO = [[10, -40], [20, -45], [86, 21], [91, 26], [8, 22], [0, 0]]; // the bucket's outline (bucket coordinates)
    const C0 = [8.0, 9.2], DC = 1.2, K = (c0, f) => c0 + f * DC, DUMP = [0.685, 0.745]; // the pour: from the angle of repose to empty
    const keys = (vals, init) => { const k = [[0, init]]; C0.forEach(c0 => vals.forEach(([fr, v]) => k.push([K(c0, fr), v]))); return k; };
    // one cycle: approach with the bucket flat and the arm low, crowd into the pile and curl, reverse while
    // steering round, raise to dump height with the bucket rolled back, dump over the body, lower, reverse and
    // steer back round to the pile
    // at the truck (0.6–0.77): the arm holds the bucket clear of the rim, the bucket rolls forward to level
    // (0.62–0.66) and tips to its dump angle (0.66–0.71); material leaves the lip once the floor passes its
    // angle of repose (≈ 22°), the bucket hangs empty a moment (0.745–0.765) and rolls back as the arm lowers
    const KX = keys([[0, H], [0.18, Pk], [0.3, Pk], [0.42, H + 12], [0.6, Tk], [0.77, Tk], [0.86, H + 12], [1, H]], H);
    const KW = keys([[0.38, -1], [0.56, 1, 's'], [0.86, 1], [0.98, -1, 's']], -1);
    const KA = keys([[0, 24], [0.12, 30], [0.18, 36], [0.3, 30], [0.42, 18], [0.58, -58], [0.62, -62], [0.77, -62], [0.86, -42], [0.95, 10], [1, 24]], 24);
    const KB = keys([[0, -30], [0.12, -6], [0.18, 4], [0.24, 4], [0.3, -42], [0.42, -44], [0.62, -44], [0.66, 0, 's'], [0.71, 44, 's'], [0.765, 44], [0.81, -20, 's'], [0.92, -30], [1, -30]], -30);
    const pose = t => ({ x: kf(KX, t), sw: kf(KW, t), al: kf(KA, t), be: kf(KB, t) });
    const rot = (p, d) => { const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
    // the bell crank's link pin: where the circle about the crank pivot meets the circle about the bucket ear
    function crankAt(E) {
      const C = ZB.C, dx = E[0] - C[0], dy = E[1] - C[1], n = Math.hypot(dx, dy), d = clamp(n, Math.abs(ZB.Lk - ZB.a2) + 0.01, ZB.Lk + ZB.a2 - 0.01);
      const m = (ZB.a2 * ZB.a2 - ZB.Lk * ZB.Lk + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ZB.a2 * ZB.a2 - m * m)), ux = dx / n, uy = dy / n;
      const U1 = [C[0] + ux * m - uy * h, C[1] + uy * m + ux * h], U2 = [C[0] + ux * m + uy * h, C[1] + uy * m - ux * h];
      return U1[1] < U2[1] ? U1 : U2;
    }
    const lipAt = q => add(add(X.pivot, rot(PIN, q.al)), rot(X.lip, q.be)); // cutting edge, loader coordinates
    const wheelEls = wheelsG.flatMap(g => Array.from(g.querySelectorAll('.wheel'))).map(el => ({ el, x: el.dataset.x, r: +el.dataset.r }));
    let order = '';
    up(8, t => {
      const q = pose(t), cm = clamp(q.sw, -1, 1), th = Math.acos(cm) / D2R, dir = Math.sign(kf(KW, t + 0.004) - kf(KW, t - 0.004));
      // the frames' headings: the front frame leads the turn by up to 18° and the rear follows
      const dl = 18 * Math.sin(th * D2R) * dir, hf = clamp(th - dl, 0, 180) * D2R, hr = clamp(th + dl, 0, 180) * D2R;
      const S = { f: [Math.cos(hf), Math.sin(hf)], r: [Math.cos(hr), Math.sin(hr)] }, hinge = 10 * cm;
      const Xof = (sec, x, w) => { const [c, s] = S[sec]; return hinge + (x - 10) * c - (c < 0 ? -1 : 1) * w * s; };
      // arm, bucket and linkage poses (machine coordinates)
      const armT = `translate(${X.pivot[0]} ${X.pivot[1]}) rotate(${F(q.al)})`;
      setA(armG, 'transform', armT); setA(armC, 'transform', armT);
      setA(buckG, 'transform', `${armT} translate(${X.armL} 0) rotate(${F(q.be - q.al)})`);
      const E2 = add(PIN, rot(ZB.ear, q.be - q.al)), U = crankAt(E2), phi = Math.atan2(U[1] - ZB.C[1], U[0] - ZB.C[0]) / D2R;
      setA(crankG, 'transform', `translate(${ZB.C[0]} ${ZB.C[1]}) rotate(${F(phi)})`);
      setA(linkG, 'transform', `translate(${F(U[0])} ${F(U[1])}) rotate(${F(Math.atan2(E2[1] - U[1], E2[0] - U[0]) / D2R)})`);
      const onArm = p => add(X.pivot, rot(p, q.al));
      liftCyl(X.liftBase, onArm(X.liftLug));
      tiltCyl(X.tiltBase, onArm(add(ZB.C, rot([ZB.a1, 0], phi - 60))));
      // front views of the arms and the bucket follow the same pose
      // the lift arms seen end-on (u = ±40) run from the tower pin down to the bucket pin; the bucket's mouth
      // is the slanted plane from the top of its back plate to the cutting edge, 136 wide — both projected
      const pin = onArm(PIN), top = add(pin, rot([20, -45], q.be)), lip = add(pin, rot(X.lip, q.be)), [cF, sF] = S.f;
      const PX = (x, u) => hinge + (x - 10) * cF + u * sF;
      armsF.x = (X.pivot[0] + pin[0]) / 2; bkt.x = bktF.x = bHull.x = (top[0] + lip[0]) / 2;
      // the bucket as a solid: its side profile carried across the full width (both side plates, and between)
      const prof = BO.map(p => add(pin, rot(p, q.be))), hull = ART.hull([...prof.map(p => [PX(p[0], -68), p[1]]), ...prof.map(p => [PX(p[0], 68), p[1]])]);
      setA(hullP, 'd', 'M' + hull.map(p => F(p[0]) + ' ' + F(p[1])).join('L') + 'Z');
      armBars.forEach(({ u, el }) => setA(el, 'd', `M${F(PX(X.pivot[0], u - 6))} ${X.pivot[1]}L${F(PX(X.pivot[0], u + 6))} ${X.pivot[1]}L${F(PX(pin[0], u + 5))} ${F(pin[1])}L${F(PX(pin[0], u - 5))} ${F(pin[1])}Z`));
      const quad = (a, b, w, d0, d1) => `M${F(PX(a[0], -w))} ${F(a[1] + d0)}L${F(PX(a[0], w))} ${F(a[1] + d0)}L${F(PX(b[0], w))} ${F(b[1] + d1)}L${F(PX(b[0], -w))} ${F(b[1] + d1)}Z`;
      setA(bFace, 'd', quad(top, lip, 68, 0, 0));
      setA(bTop, 'd', quad(top, add(top, rot([4, 4], q.be)), 67, 0, 0));
      setA(bEdge, 'd', quad(add(lip, rot([-14, -2], q.be)), lip, 66, 0, 1));
      setA(bLoad, 'transform', `translate(${F(PX((top[0] + lip[0]) / 2, 0))} ${F((top[1] + lip[1]) / 2 - 4)}) scale(${F(Math.max(sF, 0.001))} 1)`);
      // place every layer: side panels foreshorten by cos, front views open by sin
      for (const o of LY) {
        const [c, s] = S[o.sec];
        if (o.face === 'abs') setA(o.g, 'opacity', s > 0.03 ? '1' : '0');
        else if (o.face) { setA(o.inner, 'transform', `translate(${F(hinge + (o.x - 10) * c)} 0) scale(${F(Math.max(s, 0.001))} 1)`); setA(o.g, 'opacity', s > 0.03 ? '1' : '0'); }
        else setA(o.inner, 'transform', `translate(${F(Xof(o.sec, 10, o.w))} 0) scale(${F(Math.abs(c) < 0.001 ? 0.001 : c)} 1) translate(-10 0)`);
        o.z = (o.x - 10) * s + o.sk * Math.max(Math.abs(c), 0.12);
      }
      for (const bd of brands) setA(bd.g, 'transform', S.r[0] < 0 ? `translate(${bd.cx * 2} 0) scale(-1 1)` : 'translate(0 0)'); // the logos never read backwards
      for (const tr of treads) { const [c, s] = S[tr.o.sec], x0 = Xof(tr.o.sec, tr.x, tr.w0), x1 = Xof(tr.o.sec, tr.x, tr.w1); setA(tr.el, 'x', F(Math.min(x0, x1))); setA(tr.el, 'width', F(Math.abs(x1 - x0) + 0.01)); setA(tr.el, 'opacity', s > 0.03 ? '1' : '0'); void c; }
      for (const n of inner) { const [c] = S[n.o.sec], cx = Xof(n.o.sec, n.x, -28); setA(n.d, 'cx', F(cx)); setA(n.h, 'cx', F(cx)); setA(n.d, 'rx', F(Math.max(0.01, X.r * Math.abs(c)))); setA(n.h, 'rx', F(Math.max(0.01, X.r * 0.36 * Math.abs(c)))); }
      setA(shadowE, 'cx', F(hinge)); setA(shadowE, 'rx', F(220 * Math.abs(cm) + 80 * Math.sqrt(1 - cm * cm)));
      const ord = LY.map((o, i) => [o.z, i]).sort((p, r2) => p[0] - r2[0]).map(p => p[1]).join(',');
      if (ord !== order) { order = ord; ord.split(',').forEach(i => lg.appendChild(LY[+i].g)); }
      for (const w of wheelEls) setA(w.el, 'transform', `translate(${w.x} ${-w.r}) rotate(${F(((q.x / w.r) * 57.2958 * (cm < 0 ? -1 : 1)) % 360)})`);
      let held = 0, left = 1; C0.forEach(c0 => { if (t > K(c0, 0.27) && t < K(c0, DUMP[1])) { held = 1; left = 1 - win(t, K(c0, DUMP[0]), K(c0, DUMP[1])); } });
      setA(loadIn, 'opacity', String(held)); setA(bLoad, 'opacity', String(held));
      setA(loadIn, 'transform', left < 1 ? `translate(${X.lip[0]} ${X.lip[1]}) scale(${F(Math.max(left, 0.001))}) translate(${-X.lip[0]} ${-X.lip[1]})` : 'translate(0 0)');
      setA(lg, 'transform', `translate(${F(q.x)} ${GY})`);
    });
    // the dump. Each stone leaves the bucket at the lip once the floor has tipped past the material's angle of
    // repose: it starts just inside the lip moving along the bucket floor, then falls under gravity (a
    // projectile: x = x0 + vx·s, y = y0 + vy·s + ½g·s²) until it meets the heap's surface in the body, slides a
    // short way down the slope and stays. The heap grows from its base inside the body as the stones arrive, so
    // the load builds layer by layer; everything is solved once here, so every frame (forward or back) is exact.
    // Truck coordinates (the body's frame): the stones fall behind the near wall and ride out with the truck.
    const GR = 42000, SR = rng(57), TOff = [TRK, GY - 8], tipAt = t => { const q = pose(t), l = lipAt(q); return { p: [q.x + l[0] - TOff[0], GY + l[1] - TOff[1]], be: q.be }; };
    const surfY = (x, hc) => LB[1] - Math.min(LD.prof(x - LB[0]), hc); // the heap's top at x when it stands hc high
    // layer ci rises over its pour (from just after the first stone lands to just after the last); hcAt is the
    // heap's height then, the surface every stone of that pour lands on and rides up with
    const grow = (ci, t) => win(t, K(C0[ci], DUMP[0]) + 0.012, K(C0[ci], DUMP[1]) + 0.04), lift = p => (p > 0 ? 0.2 + 0.8 * EASE.o(p) : 0);
    const hcAt = (ci, t) => LD.h * (ci + lift(grow(ci, t))) / C0.length;
    const LAND = [];
    C0.forEach((c0, ci) => {
      const t0 = K(c0, DUMP[0]), t1 = K(c0, DUMP[1]), N = 14, stones = [];
      for (let k = 0; k < N; k++) {
        // emission spread over the pour, a little faster in the middle; bigger stones lead
        const te = t0 + (t1 - t0) * (k + SR() * 0.6) / N, e = tipAt(te), dir = [Math.cos(e.be * D2R), Math.sin(e.be * D2R)];
        const v0 = 380 + SR() * 420, side = (SR() - 0.5) * 10;
        const p0 = add(e.p, [-dir[0] * 5 + side * 0.25, -dir[1] * 5]), vel = [dir[0] * v0 + (SR() - 0.5) * 60, dir[1] * v0];
        stones.push({ te, p0, vel, r: 3.6 + SR() * 3.4, spin: (SR() - 0.5) * 900, slide: 1.2 + SR() * 2.2, seed: 980 + ci * 20 + k });
      }
      LAND.push(null);
      stones.forEach(st => {
        // step the fall until the stone meets the surface (the heap rises as the pour goes on)
        let ss = 0, x = st.p0[0], y = st.p0[1];
        for (; ss < 0.2; ss += 0.0005) {
          x = st.p0[0] + st.vel[0] * ss; y = st.p0[1] + st.vel[1] * ss + 0.5 * GR * ss * ss;
          const hc = hcAt(ci, st.te + ss);
          if (ss > 0.004 && y >= surfY(x, hc)) { y = surfY(x, hc); break; }
        }
        x = clamp(x, TP.bed.x0 + 14, TP.bed.x1 - 14);
        st.tl = st.te + ss; st.land = x;
        // it settles down the slope, toward the side of the heap it landed on
        const sd = x < LB[0] ? -1 : 1; st.rest = clamp(x + sd * st.slide, TP.bed.x0 + 14, TP.bed.x1 - 14);
      });
      LAND[ci] = [Math.min(...stones.map(st => st.tl)), Math.max(...stones.map(st => st.tl))];
      stones.forEach(st => {
        const g = M(fallG, ART.rock(st.r, st.seed).svg);
        up(8, t => {
          if (t < st.te) { setA(g, 'opacity', '0'); return; }
          setA(g, 'opacity', '1');
          let x, y, r;
          if (t < st.tl) { const ss = t - st.te; x = st.p0[0] + st.vel[0] * ss; y = st.p0[1] + st.vel[1] * ss + 0.5 * GR * ss * ss; r = st.spin * ss; }
          else { const p = EASE.o(win(t, st.tl, st.tl + 0.02)); x = lerp(st.land, st.rest, p); y = surfY(x, hcAt(ci, t)) + st.r * 0.3; r = st.spin * (st.tl - st.te) + p * 25 * Math.sign(st.spin); }
          setA(g, 'transform', `translate(${F(x)} ${F(y)}) rotate(${F(r)})`);
        });
      });
      // this layer of the load rises from its base as the stones arrive
      const yb = -LD.h * ci / C0.length, gr = t => { const p = grow(ci, t); return { o: p > 0 ? '1' : '0', tr: `translate(0 ${F(yb)}) scale(1 ${F(Math.max(lift(p), 0.001))}) translate(0 ${F(-yb)})` }; };
      const bk = M(loadBk, LD.backs[ci]), ls = M(loadSt, LD.strata[ci]); loadSt.insertBefore(ls, loadSt.firstChild);
      up(8, t => { const v = gr(t); [bk, ls].forEach(el => { setA(el, 'opacity', v.o); setA(el, 'transform', v.tr); }); });
    });
    // the body takes the weight: a small dip as each load lands
    up(8, t => { let dip = 0; LAND.forEach(L => { dip += kf([[L[0], 0], [L[0] + 0.03, 1.4], [L[1] + 0.06, 0]], t); }); setA(tpBody, 'transform', `translate(0 ${F(dip)})`); });

    /* ---- dispatch: the loaded tipper leaves for the client's site ---- */
    const dust = M(f, `<ellipse cx="0" cy="-8" rx="46" ry="12" fill="url(#a-dust)"/><ellipse cx="-30" cy="-16" rx="30" ry="10" fill="url(#a-dust)"/>`);
    up(8, t => { const v = (kf(tx, t + 0.02) - kf(tx, t - 0.02)) / 0.04; setA(dust, 'opacity', F(clamp(v / 900, 0, 0.8))); setA(dust, 'transform', `translate(${F(kf(tx, t) + 20)} ${GY}) scale(${F(0.8 + clamp(v / 900, 0, 1) * 0.5)} 1)`); });
    M(b, ART.building(170, 4, 40), { transform: at0(SITE + 40), opacity: 0.75 });
    M(b, `<g opacity=".7">${ART.crane(300, 190, 70).fixed}</g>`, { transform: `translate(${SITE + 10} ${GY}) scale(.62)` });
    act(8, M(b, `<path class="ln acc dash" d="M${TRK + 420} ${GY + 14}H${SITE - 10}"/><path class="trace" d="M${SITE - 22} ${GY + 6}L${SITE - 10} ${GY + 14}L${SITE - 22} ${GY + 22}"/>`), { o: [[10.2, 0], [10.6, 1]] });
    label(8, SITE + 120, GY + 66, 'CLIENT SITE', { o: [[10.4, 0], [10.8, 1]] });
    label(8, 6080, GY - 236, 'QUALITY APPROVED · READY FOR DELIVERY', { cls: 'acc-t', o: [[11.2, 0], [11.6, 1]] });

    /* ---- the process rail, labels and hotspots ---- */
    progressRail(8, b, GY + 32, 4100, 6560, [[lx(290), 2.2], [4760, 6.5], [5480, 8.0], [6300, 11.8]], [[2.2, 0], [11.8, 1, 'l']]);
    label(8, lx(290), GY + 66, 'MATERIAL TESTING LAB', { o: [[1.6, 0], [2.1, 1]] });
    label(8, 4760, GY + 66, 'APPROVAL', { o: [[6.3, 0], [6.6, 1]] });
    label(8, 5480, GY + 66, 'LOADING', { o: [[7.8, 0], [8.1, 1]] });
    label(8, 6300, GY + 66, 'DISPATCH', { o: [[11.4, 0], [11.8, 1]] });
    label(8, XS, GY - 130, 'SAMPLE · 20 MM', { cls: 'call', o: [[1.3, 0], [1.45, 1], [1.8, 1], [1.95, 0]] });
    label(8, lx(380), GY - 146, 'SIEVE ANALYSIS', { cls: 'call halo', k: 0.85, o: [[2.9, 0], [3.2, 1], [5.6, 1], [6.0, 0]] });
    label(8, lx(318), GY - 172, 'IMPACT TEST', { anchor: 'middle', cls: 'call halo', k: 0.85, o: [[3.5, 0], [3.7, 1], [5.6, 1], [6.0, 0]] });
    label(8, lx(461), GY - 132, 'DRYING OVEN', { cls: 'call halo', k: 0.85, dyTall: -40, o: [[2.5, 0], [2.8, 1], [5.6, 1], [6.0, 0]] });
    label(8, lx(150), GY - 156, 'WEIGHING', { cls: 'call halo', k: 0.85, o: [[2.35, 0], [2.5, 1], [5.6, 1], [6.0, 0]] });
    hot(8, lx(540), GY - 180, 'Material testing laboratory', [1.8, 4.6], [LX, GY - 306, LX + 580, GY]);
    hot(8, lx(392), GY - 58, 'Sieve analysis', [2.8, 4.6], [lx(348), GY - 118, lx(412), GY - 20]);
    hot(8, 5330, GY - 150, 'Wheel loader', [7.6, 10.8], [5080, GY - 230, 5640, GY]);
    hot(8, TRK + 300, GY - 100, 'OM Group tipper', [7.6, 12.2], [TRK, GY - 150, TRK + 410, GY]);
  }

  /* === 4 — ready-mix concrete: bins, belts, water, cement, mixer, transit mixer === */
  function zone4({ b, a, f }) {
    const PX = 4560, P = ART.plant(), W = (x, y) => [PX + x, GY + y];
    const g0 = G(b, { transform: at0(PX) });
    M(g0, P.frameBins + P.bins + P.gather.frame + P.incline.frame + P.incline.rail + P.tower + P.hoppers + P.silos);
    // material heaped in the four bins
    const heaps = [ART.pile(118, 46, 101, { sr: 4.8, strata: 1 }).strata[0], ART.pile(118, 44, 102, { sr: 4, strata: 1, tone: 'grey' }).strata[0], ART.sandHeap(118, 42, 103, 'p'), ART.sandHeap(118, 40, 104, 'm')];
    P.binTops.forEach(([x, y], i) => M(g0, heaps[i], { transform: `translate(${x} ${y})` }));
    // cement screw conveyors (the flight pattern travels while cement moves)
    const screws = P.screws.map(([x0, y0, x1, y1]) => `M${x0} ${y0}L${x1} ${y1}`);
    M(g0, screws.map(d => `<path class="screw-o" d="${d}"/><path class="screw" d="${d}"/><path class="screw-h" d="${d}"/>`).join(''));
    const ga = cull(G(a, { transform: at0(PX) }), PX - 20, PX + 1500);
    const flights = M(ga, screws.map(d => `<path class="screw-f" d="${d}"/>`).join(''));
    const gf = cull(G(f, { transform: at0(PX) }), PX - 20, PX + 920);
    belt(4, gf, P.gather); belt(4, gf, P.incline);
    // bin gates swing open in turn
    // (each gate plate hangs from a hinge on its left edge)
    P.gates.forEach((q, i) => { const g = M(ga, `<rect class="o" fill="url(#a-paint)" x="0" y="-4" width="28" height="12" rx="1.5"/><circle r="2.2" fill="#3a3c40"/>`, { transform: `translate(${q.x - 14} ${q.y})` }); act(4, g.firstChild, { r: [[22.6 + i * 0.18, 0], [23.0 + i * 0.18, 34], [27.9, 34], [28.3, 0]] }); });
    // mixer: body hums while it runs; its drive turns
    const mix = M(ga, P.mixer);
    const drive = M(ga, `<circle class="o" r="${P.mixerDrive.r}" fill="url(#a-rim)"/><path class="rmark" d="M-6 0H6M0 -6V6"/>`, { transform: `translate(${P.mixerDrive.x} ${P.mixerDrive.y})` });
    const mixOn = [23.0, 27.2];
    up(4, (t, a2) => {
      if (ambSkip) return;
      const g = win(t, mixOn[0], mixOn[0] + 0.4) * (1 - win(t, mixOn[1], mixOn[1] + 0.4));
      setA(drive, 'transform', `translate(${P.mixerDrive.x} ${P.mixerDrive.y}) rotate(${F((a2 * (g ? 520 : 0)) % 360)})`);
      const c = win(t, 23.1, 23.6) * (1 - win(t, 26.6, 27.1));
      setA(flights, 'style', `stroke-dashoffset:${F(-(a2 * 40 * c) % 16)};opacity:${F(0.35 + 0.65 * c)}`);
    });
    // batch gauge: a process marker beside the mixer that fills as the batch is weighed and mixed
    // (on phones the gap beside the mixer is crowded by the screw conveyors and the transit mixer, so the gauge and its label
    //  sit in the clear space between the water tank and the cement silos; world coordinates, so they scale with the scene)
    const gxy = TALL() ? [PX + 1152, GY - 630] : [PX + 1182, GY - 232];
    const gauge = G(b, { transform: `translate(${gxy[0]} ${gxy[1]})` });
    M(gauge, `<circle r="17" fill="#fbfaf7" stroke="#d6d2ca" stroke-width="1.2"/>`);
    act(4, E('circle', { class: 'gauge', r: 13, transform: 'rotate(-90)' }, gauge), { draw: [[23.0, 0], [27.0, 1, 'l']], o: [[22.9, 0], [23.0, 1]] });
    act(4, M(gauge, `<path d="M-6 0L-2 5L7 -5" fill="none" stroke="${ART.ORANGE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`), { o: [[27.0, 0], [27.3, 1]] });
    label(4, gxy[0], gxy[1] + 34, 'BATCH', { k: TALL() ? 1 : 0.8, cls: TALL() ? 'call' : '', o: [[23.0, 0], [23.4, 1]] });
    // flows: bins → gathering belt → incline → aggregate hopper; water; cement; discharge
    const path = arr => 'M' + arr.map(p => F(p[0]) + ' ' + F(p[1])).join('L');
    P.gates.forEach((q, i) => flow(4, f, path([W(q.x, q.y + 10), W(q.x, -196 - (i < 2 ? 3.2 : 1.8))]), i < 2 ? { on: [22.8 + i * 0.18, 27.9], gap: 12, size: [2.6, 3.8], seed: 110 + i, speed: 60 } : { on: [22.8 + i * 0.18, 27.9], gap: 7, size: [1.4, 2], seed: 110 + i, speed: 60, dot: true, cls: i === 2 ? 'sand-p' : 'sand-m' }));
    // on the belt: the stone's centre rides one stone-radius above the belt surface (conveyor offsets are "up")
    const onBelt = (r, x0) => { const g0 = P.gather.at(x0, r), g1 = P.gather.at(P.gather.L, r), i0 = P.incline.at(0, r), i1 = P.incline.at(P.incline.L, r); return `M${F(PX + g0[0])} ${F(GY + g0[1])}L${F(PX + g1[0])} ${F(GY + g1[1])}L${F(PX + i0[0])} ${F(GY + i0[1])}L${F(PX + i1[0])} ${F(GY + i1[1])}Q${F(PX + P.feed[0] - 8)} ${F(GY + i1[1] - 6)} ${F(PX + P.feed[0])} ${F(GY + P.feed[1])}`; };
    const run = onBelt(3.6, 70), runSand = onBelt(1.9, 70);
    flow(4, f, run, { on: [23.0, 27.9], gap: 24, size: [2.8, 4.4], seed: 120 });
    flow(4, f, runSand, { on: [23.1, 27.9], gap: 30, size: [1.6, 2.2], seed: 121, dot: true, cls: 'sand-p' });
    flow(4, f, path([W(1074, -600), W(1092, -600), W(1092, -420), W(1062, -420)]), { on: [23.6, 26.4], gap: 16, size: [2.2, 2.6], seed: 122, dot: true, cls: 'water', speed: 50 });
    P.screws.forEach(([x0, y0, x1, y1], i) => flow(4, f, path([W(x0, y0), W(x1, y1)]), { on: [23.3 + i * 0.2, 26.8], gap: 22, size: [2.4, 2.8], seed: 130 + i, dot: true, cls: 'lt', speed: 36 }));
    // transit mixer: reverses in under the chute, charges, then drives off toward the sites
    const TM = ART.transitMixer('p4'), tx0 = PX + P.chute.x - TM.hopper[0];
    const tmX = [[21.2, tx0 + 560], [22.8, tx0, 'o'], [28.8, tx0], [29.9, tx0 + 1150, 'i']];
    const tm = G(a);
    M(tm, TM.body); const drum = M(tm, TM.drum); M(tm, TM.wheels); M(tm, TM.fenders);
    act(4, tm, { x: tmX, y: GY, o: [[21.15, 0], [21.2, 1], [29.92, 1], [29.95, 0]] });
    rollWheels(4, tm, t => kf(tmX, t) - tx0);
    const stripes = drum.querySelector('.stripes');
    up(4, (t, a2) => ambSkip || setA(stripes, 'transform', `translate(${F(-((a2 * 22) % 30))} 0)`));
    flow(4, f, path([W(P.chute.x, P.chute.y), W(P.chute.x, TM.hopper[1] + 4)]), { on: [27.2, 28.6], gap: 6, size: [2.6, 3.4], seed: 140, dot: true, cls: 'concrete', speed: 70, fill: 0.3 });
    // callouts (as on the reference art) and the plants' locations from the site
    const call = (tx, ty, px, py, s, t0) => { M(b, `<path class="ln faint dash" d="M${F(PX + tx)} ${F(GY + ty + 6)}L${F(PX + px)} ${F(GY + py)}"/><circle class="ring-on" cx="${F(PX + px)}" cy="${F(GY + py)}" r="3.6"/>`); label(4, PX + tx, GY + ty, s, { cls: 'call', o: [[t0, 0], [t0 + 0.4, 1]] }); };
    call(128, -420, 64, -374, 'AGGREGATES', 23.0); M(b, `<path class="ln faint dash" d="M${PX + 128} ${GY - 414}L${PX + 192} ${GY - 374}"/><circle class="ring-on" cx="${PX + 192}" cy="${GY - 374}" r="3.6"/>`);
    call(384, -420, 320, -374, 'SAND', 23.2); M(b, `<path class="ln faint dash" d="M${PX + 384} ${GY - 414}L${PX + 448} ${GY - 372}"/><circle class="ring-on" cx="${PX + 448}" cy="${GY - 372}" r="3.6"/>`); call(1000, -690, 1040, -642, 'WATER', 23.6); call(1360, -712, 1316, -692, 'CEMENT', 23.4);
    M(b, `<path class="ln faint" d="M${PX + 120} ${GY + 34}H${PX + 560}M${PX + 1000} ${GY + 34}H${PX + 1440}"/>`);
    label(4, PX + 780, GY + 38, 'RMC BATCHING PLANTS — KUNDAIM · THIVIM', { cls: 'acc-t', o: [[24.4, 0], [25.0, 1]] });
    hot(4, PX + 256, GY - 300, 'Aggregate & sand bins', [21.6, 30.4], [PX, GY - 380, PX + 512, GY - 196]);
    hot(4, PX + 990, GY - 300, 'Twin shaft mixer', [21.6, 30.4], [PX + 890, GY - 430, PX + 1090, GY - 232]);
    hot(4, PX + 1360, GY - 450, 'Cement silos', [21.6, 30.4], [PX + 1230, GY - 690, PX + 1490, GY - 150]);
    hot(4, PX + 1040, GY - 610, 'Water tank', [21.6, 30.4], [PX + 1004, GY - 650, PX + 1076, GY - 540]);
    hot(4, PX + 1060, GY - 110, 'Transit mixer', [22.8, 29.0], [PX + 960, GY - 165, PX + 1370, GY]);
  }

  /* === 5 — machinery & logistics: excavator loads a tipper, which is dispatched === */
  function zone5({ b, a, f }) {
    const EX = 6780, TX = 6975;
    // distant plant and the project site, low in contrast
    M(b, ART.hills(1700, 220, 9, 0), { transform: at0(6060) });
    M(b, `<g opacity=".5" fill="#ddd8cf" stroke="#c7c1b7" stroke-width="1">
      <rect x="6170" y="${GY - 250}" width="40" height="190"/><path d="M6170 ${GY - 60}L6190 ${GY - 30}L6210 ${GY - 60}Z"/><rect x="6222" y="${GY - 250}" width="40" height="190"/><path d="M6222 ${GY - 60}L6242 ${GY - 30}L6262 ${GY - 60}Z"/>
      <path fill="none" d="M6290 ${GY}V${GY - 220}M6350 ${GY}V${GY - 220}M6290 ${GY - 120}H6350M6290 ${GY - 220}H6350M6280 ${GY - 160}L6200 ${GY - 40}"/><rect x="6300" y="${GY - 200}" width="40" height="44"/></g>`);
    const crane = ART.crane(380, 230, 80);
    M(b, `<g opacity=".75">${crane.fixed}</g>`, { transform: `translate(7560 ${GY}) scale(.72)` });
    M(b, `<g opacity=".6">${ART.building(170, 5, 40)}</g>`, { transform: `translate(7600 ${GY})` });
    // stockpiles
    const big = ART.pile(380, 170, 9, { sr: 9.5, strata: 1 }), small = ART.pile(220, 104, 10, { sr: 8, strata: 1 });
    M(b, big.shadow + big.strata[0], { transform: at0(6300) });
    M(b, small.shadow + small.strata[0], { transform: at0(6520) });
    // tipper (dump truck): loaded in place, then dispatched along the road
    const TP = ART.tipper(), tpX = [[36.5, TX], [38.4, TX + 900, 'i']];
    const tp = G(a);
    const tpBody = G(tp); M(tpBody, TP.truck);
    const loadG = G(tpBody, { transform: `translate(${(TP.bed.x0 + TP.bed.x1) / 2} ${TP.bed.y + 2})` });
    const LD = ART.pile(250, 34, 12, { sr: 7.5, strata: 2 }), loadBk = G(loadG), loadSt = G(loadG);
    M(tpBody, TP.body);
    M(tp, TP.wheels); M(tp, TP.fenders);
    act(5, tp, { x: tpX, y: GY, o: [[38.6, 1], [38.65, 0]] });
    rollWheels(5, tp, t => kf(tpX, t) - TX);
    // excavator rig: swing, boom, stick and bucket about their pins; cylinders pinned between them
    const X = ART.excavator(), pin = X.pin;
    const exG = cull(G(a, { transform: at0(EX) }), EX - 420, EX + 420);
    M(exG, X.tracks);
    // The upper structure slews as a solid: house and cab carry their full width, boom, stick and bucket are
    // plates of real thickness (each drawn as its side profile carried across that width, projected at the
    // slew angle), and the detailed side drawings sit on top, foreshortened. Mid-swing the boom is seen end-on
    // in front of the house — never an edge-on sliver.
    const hulls = ['house', 'cab', 'boom', 'stick', 'bucket'].map(k => ({ k, el: E('path', { class: 'o', fill: k === 'bucket' ? 'url(#a-bucket)' : 'url(#a-paintD)' }, exG) }));
    const cabGlass = E('path', { class: 'o', fill: 'url(#a-glass)' }, exG); exG.insertBefore(cabGlass, hulls[2].el); // the cab's windscreen on its front face
    const upper = G(exG), armL = G(exG);
    M(upper, X.house);
    const brand = M(upper, X.brand);
    const boomG = G(armL), stickG = G(boomG), buckG = G(stickG);
    M(boomG, X.boom); M(stickG, X.stick); M(buckG, X.bucket);
    const cyl = { boom: cylinder(armL, 12, 96), stick: cylinder(armL, 10, 70), buck: cylinder(armL, 9, 60) };
    // side profiles (part coordinates) and half-widths across the machine
    const PROF = {
      house: [[[-150, -62], [118, -62], [118, -150], [-112, -150], [-150, -120]], 58], cab: [[[28, -150], [28, -250], [96, -250], [114, -232], [118, -150]], 22],
      boom: [[[-12, 6], [-16, -18], [60, -118], [150, -186], [200, -176], [206, -160], [160, -150], [90, -110], [20, 14]], 11],
      stick: [[[-14, -18], [14, -22], [62, 168], [40, 184]], 9], bucket: [[[-10, -10], [34, -16], [50, 40], [36, 62], [-34, 52], [-36, 20]], 40],
    };
    // material carried in the bucket (individual stones)
    const scoop = G(buckG); let sc = ''; for (let i = 0; i < 6; i++) sc += `<g transform="translate(${F(-6 + (i % 3) * 14)} ${F(18 + Math.floor(i / 3) * 10)})">${ART.rock(6 + (i % 2) * 2, 400 + i, {}).svg}</g>`;
    scoop.innerHTML = sc;
    // one loading cycle as poses [boom, stick, bucket] (degrees) and swing (−1 faces the stockpile)
    const POSE = { back: [-26, -16, -10], reach: [8, 14, 24], curl: [4, 6, -62], lift: [-28, -14, -66], carry: [-34, -8, -66], over: [-30, 6, -62], dump: [-30, 6, 58] };
    const CYC = [31.6, 33.9], D = 2.3;
    const seq = [[0, 'back', -1], [0.1, 'reach', -1], [0.25, 'curl', -1], [0.38, 'lift', -1], [0.46, 'carry', -1], [0.56, 'carry', 1], [0.63, 'over', 1], [0.72, 'dump', 1], [0.8, 'back', 1], [0.9, 'back', -1]];
    const keysFor = (j, swing) => { const k = []; CYC.forEach(c0 => seq.forEach(([p, pose, sw]) => k.push([c0 + p * D, swing ? sw : POSE[pose][j], 'io']))); return k; };
    const KB = keysFor(0), KS = keysFor(1), KK = keysFor(2), KW = keysFor(0, true);
    KB.unshift([0, POSE.back[0]]); KS.unshift([0, POSE.back[1]]); KK.unshift([0, POSE.back[2]]); KW.unshift([0, -1]);
    const swingAt = t => kf(KW, t);
    const fk = t => { const bA = kf(KB, t), sA = kf(KS, t), kA = kf(KK, t); const sp = add(pin.boom, R2(bA, [196, -168])), kp = add(sp, R2(bA + sA, [52, 176])); return { bA, sA, kA, sp, kp, mouth: add(kp, R2(bA + sA + kA, [8, 42])) }; };
    up(5, t => {
      const q = fk(t), sw = swingAt(t);
      const c = clamp(sw, -1, 1), s = Math.sqrt(Math.max(0, 1 - c * c)), side = (w) => `translate(${F(-(c < 0 ? -1 : 1) * w * s)} 0) scale(${F(Math.abs(c) < 0.001 ? 0.001 : c)} 1)`;
      setA(upper, 'transform', side(58)); setA(armL, 'transform', side(11));
      const toU = { house: p => p, cab: p => [p[0], p[1]], boom: p => add(pin.boom, R2(q.bA, p)), stick: p => add(q.sp, R2(q.bA + q.sA, p)), bucket: p => add(q.kp, R2(q.bA + q.sA + q.kA, p)) };
      for (const hl of hulls) {
        const [pts, w] = PROF[hl.k], cabOff = hl.k === 'cab' ? 30 : 0, P = pts.map(toU[hl.k]);
        const hpts = ART.hull([...P.map(p => [p[0] * c + (cabOff - w) * s * (c < 0 ? -1 : 1) * -1, p[1]]), ...P.map(p => [p[0] * c + (cabOff + w) * s * (c < 0 ? -1 : 1) * -1, p[1]])]);
        setA(hl.el, 'd', s < 0.02 ? 'M0 0' : 'M' + hpts.map(p => F(p[0]) + ' ' + F(p[1])).join('L') + 'Z');
      }
      const gx = (x, w) => x * c - (c < 0 ? -1 : 1) * w * s;
      setA(cabGlass, 'd', s < 0.15 ? 'M0 0' : `M${F(gx(116, 12))} -236L${F(gx(116, 48))} -236L${F(gx(118, 48))} -162L${F(gx(118, 12))} -162Z`);
      setA(brand, 'transform', sw < 0 ? `translate(${X.brandCx * 2} 0) scale(-1 1)` : 'translate(0 0)'); // the brand never reads backwards
      setA(boomG, 'transform', `translate(${pin.boom[0]} ${pin.boom[1]}) rotate(${F(q.bA)})`);
      setA(stickG, 'transform', `translate(196 -168) rotate(${F(q.sA)})`);
      setA(buckG, 'transform', `translate(52 176) rotate(${F(q.kA)})`);
      const B = p => add(pin.boom, R2(q.bA, p)), S = p => add(q.sp, R2(q.bA + q.sA, p)), K = p => add(q.kp, R2(q.bA + q.sA + q.kA, p));
      cyl.boom([60, -98], B([92, -88])); cyl.stick(B([108, -150]), S([-10, -14])); cyl.buck(S([10, 34]), K([-12, -12]));
      // bucket holds material from the scoop until it opens over the truck
      let held = 0; CYC.forEach(c0 => { if (t > c0 + 0.2 * D && t < c0 + 0.68 * D) held = 1; });
      setA(scoop, 'opacity', String(held));
    });
    // dumped stones fall from the bucket mouth into the bed; the load builds; the body settles a little
    const bedY = GY + TP.bed.y + 2, SR = rng(55);
    CYC.forEach((c0, ci) => {
      const tr = c0 + 0.66 * D, q = fk(tr + 0.05), mx = EX + q.mouth[0], my = GY + q.mouth[1];
      for (let k = 0; k < 7; k++) {
        const st = ART.rock(5 + SR() * 4, 500 + ci * 10 + k, {}), g = M(a, st.svg), t0 = tr + k * 0.03, t1 = t0 + 0.32;
        const ex = TX + 70 + SR() * 80, ey = bedY - 6 - ci * 14 - SR() * 6, rot = (SR() - 0.5) * 240;
        up(5, t => {
          const p = win(t, t0, t1);
          if (p === 0 || t > t1 + 0.25) { setA(g, 'opacity', '0'); return; }
          setA(g, 'opacity', F(p < 1 ? 1 : 1 - (t - t1) / 0.25));
          setA(g, 'transform', `translate(${F(lerp(mx + (k - 3) * 4, ex, p))} ${F(my + (ey - my) * p * p)}) rotate(${F(rot * p)})`);
        });
      }
      act(5, M(loadBk, LD.backs[ci]), { o: [[tr + 0.25, 0], [tr + 0.4, 1]] });
      const lg = M(loadSt, LD.strata[ci]); loadSt.insertBefore(lg, loadSt.firstChild); act(5, lg, { o: [[tr + 0.25, 0], [tr + 0.4, 1]] });
    });
    up(5, t => { let dip = 0; CYC.forEach(c0 => { const tr = c0 + 0.66 * D; dip += kf([[tr + 0.22, 0], [tr + 0.32, 1.6], [tr + 0.6, 0]], t); }); setA(tpBody, 'transform', `translate(0 ${F(dip)})`); });
    // load → dispatch → site
    progressRail(5, b, GY + 40, 6420, 7700, [[6560, 31.8], [7130, 36.6], [7620, 38.2]], [[31.6, 0], [38.2, 1, 'l']]);
    label(5, 6560, GY + 72, 'LOAD', { o: [[31.4, 0], [31.9, 1]] }); label(5, 7130, GY + 72, 'DISPATCH', { o: [[36.3, 0], [36.8, 1]] }); label(5, 7620, GY + 72, 'TO SITE', { o: [[37.6, 0], [38.1, 1]] });
    hot(5, EX, GY - 200, 'Excavator', [30.6, 38.2], [EX - 160, GY - 260, EX + 140, GY]);
    hot(5, TX + 150, GY - 100, 'Tipper truck', [30.6, 36.6], [TX, GY - 150, TX + 410, GY]);
    hot(5, 6360, GY - 110, 'Aggregate stockpile', [30.6, 38.2], [6110, GY - 170, 6630, GY]);
  }

  /* === 6 — the OM Group network (screen space: the camera lifts off the world to the map) === */
  function zone6(net, pulses) {
    const tall = TALL(), LAB = tall ? 23 : 12.5;
    const sh = 0.8; // network timing offset against the original 37–46 cut
    const text = (parent, x, y, str, cls, size, anchor = 'start') => { const t = E('text', { x: F(x), y: F(y), class: cls, 'font-size': F(size), 'text-anchor': anchor }, parent); t.textContent = str; return t; };
    const cx = tall ? 450 : 520, cy = tall ? 762 : 562, rad = tall ? 160 : 215;
    const nodes = [
      { t: 'Aggregate trading & sourcing', s: 'OM Enterprises · Maharudra · Swastik · Corestone', icon: 'pile' },
      { t: 'Stone crushing & processing', s: 'Sabsol Qualitech · VSI crusher', icon: 'crush' },
      { t: 'Ready mix concrete', s: 'Sabsol Qualitech · Kundaim · Thivim', icon: 'mix' },
      { t: 'Heavy equipment', s: 'Sabsol Heavy Machines', icon: 'dig' },
      { t: 'Transport & logistics', s: 'OM Transport · OM Minerals & Logistics', icon: 'truck' },
      { t: 'Material delivery', s: 'Project supply across North & South Goa', icon: 'pin' },
    ];
    const ICON = {
      pile: '<path class="ic-f" d="M-17 9L-6 -6L-1 -1L6 -9L17 9Z"/><path class="ic" d="M-17 9L-6 -6L-1 -1L6 -9L17 9ZM-8 3h.1M0 0h.1M6 4h.1M-2 6h.1"/>',
      crush: '<path class="ic-f" d="M-9 -4H9V8H-9Z"/><path class="ic" d="M-13 -12H13L8 -4H-8ZM-9 -4H9V8H-9ZM-4 8L-2 13H2L4 8M0 2m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>',
      mix: '<path class="ic-f" d="M-15 2Q-4 -12 10 -5Q14 2 8 7Q-6 10 -15 2Z"/><path class="ic" d="M-15 2Q-4 -12 10 -5Q14 2 8 7Q-6 10 -15 2ZM-16 11H16M-10 11m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M10 11m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 -2V7"/>',
      dig: '<path class="ic-f" d="M-15 6H3V12H-15Z"/><path class="ic" d="M-15 6H3V12H-15ZM-12 6V-2H-2V6M-2 -1L8 -12L14 -6M14 -6L16 2L10 3"/>',
      truck: '<path class="ic-f" d="M-15 -7H3V6H-15Z"/><path class="ic" d="M-15 -7H3V6H-15ZM3 -2H10L15 4V6H3M-9 9m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M9 9m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>',
      pin: '<path class="ic-f" d="M0 13C-8 3 -9 -1 -9 -4A9 9 0 1 1 9 -4C9 -1 8 3 0 13Z"/><path class="ic" d="M0 13C-8 3 -9 -1 -9 -4A9 9 0 1 1 9 -4C9 -1 8 3 0 13ZM0 -4m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>',
    };
    const g = G(net), ang = i => (-60 + i * 60) * Math.PI / 180;
    const NP = nodes.map((n, i) => [cx + Math.cos(ang(i)) * rad, cy + Math.sin(ang(i)) * rad]);
    act(6, M(g, NP.map((p, i) => { const q = NP[(i + 1) % 6]; return `<path class="ln faint dash" d="M${F(p[0])} ${F(p[1])} L${F(q[0])} ${F(q[1])}"/>`; }).join('')), { draw: [[38.9 + sh, 0], [40.0 + sh, 1]] });
    NP.forEach((p, i) => act(6, M(g, `<path class="ln" d="M${cx} ${cy} L${F(p[0])} ${F(p[1])}"/>`), { draw: [[37.7 + sh + i * 0.12, 0], [38.4 + sh + i * 0.12, 1]] }));
    const trim = (a, b, ra, rb) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return `M${F(a[0] + dx * ra / L)} ${F(a[1] + dy * ra / L)} L${F(b[0] - dx * rb / L)} ${F(b[1] - dy * rb / L)}`; };
    const pg = G(pulses);
    NP.forEach((p, i) => {
      const q = NP[(i + 1) % 6], ds = tall ? 1.9 : 1;
      flow(6, pg, trim([cx, cy], p, tall ? 70 : 74, tall ? 42 : 38), { on: [39.6 + sh + i * 0.2, 45.2], n: 2, size: [3.4 * ds, 3.4 * ds], seed: 90 + i, dot: true, speed: 60, fill: 0.6 });
      flow(6, pg, trim(p, q, tall ? 42 : 38, tall ? 42 : 38), { on: [40.4 + sh + i * 0.25, 45.2], n: 1, size: [2.6 * ds, 2.6 * ds], seed: 120 + i, dot: true, speed: 50, fill: 0.6 });
    });
    nodes.forEach((n, i) => {
      const [x, y] = NP[i], ng = G(g), k = tall ? 1.15 : 1, t0 = 38.2 + sh + i * 0.12;
      E('circle', { cx: 0, cy: 6, r: 38 * k, fill: 'url(#a-shadow)' }, ng);
      E('circle', { cx: 0, cy: 0, r: 34 * k, class: 'opm-node' }, ng);
      E('circle', { cx: 0, cy: 0, r: 28 * k, class: 'opm-node-in' }, ng);
      M(ng, ICON[n.icon], { transform: `scale(${tall ? 1.6 : 1.35})` });
      const right = Math.cos(ang(i)) > 0.2, left = Math.cos(ang(i)) < -0.2, anchor = right ? 'start' : left ? 'end' : 'middle';
      n.p = [x, y];
      if (tall) {
        const words = n.t.split(' '), cut = Math.ceil(words.length / 2);
        [words.slice(0, cut).join(' '), words.slice(cut).join(' ')].filter(Boolean).forEach((line, li) => text(ng, right ? 50 : -50, -8 + li * 32, line, 'opm-node-t', 25, anchor));
      } else {
        const lx = right ? 50 : left ? -50 : 0, ly = Math.sin(ang(i)) > 0.5 ? 62 : Math.sin(ang(i)) < -0.5 ? -60 : -4;
        text(ng, lx, ly, n.t, 'opm-node-t', 17, anchor);
        const parts = n.s.length > 26 ? n.s.split(' · ').reduce((acc, w) => { const l = acc[acc.length - 1]; if (l && (l + ' · ' + w).length <= 26) acc[acc.length - 1] = l + ' · ' + w; else acc.push(w); return acc; }, []) : [n.s];
        parts.slice(0, 2).forEach((line, li) => text(ng, lx, ly + 20 + li * 14, line.toUpperCase(), 'opm-node-s', 9.5, anchor));
      }
      act(6, ng, { x, y, s: [[t0, 0.6], [t0 + 0.6, 1, 'o']], o: [[t0, 0], [t0 + 0.4, 1]] });
    });
    const cg = G(g);
    E('circle', { cx: 0, cy: 8, r: tall ? 76 : 80, fill: 'url(#a-shadow)' }, cg);
    E('circle', { cx: 0, cy: 0, r: tall ? 66 : 70, class: 'opm-core' }, cg);
    E('circle', { cx: 0, cy: 0, r: tall ? 58 : 62, class: 'opm-core-in' }, cg);
    M(cg, ART.logo(-(tall ? 50 : 52), -(tall ? 30 : 31), tall ? 100 : 104, 'brand'));
    act(6, cg, { x: cx, y: cy, s: [[38.3, 0.7], [38.9, 1, 'o']], o: [[38.3, 0], [38.7, 1]] });
    const exit = { o: [[37.3, 0], [37.31, 1], [45.4, 1], [46.0, 0]], s: [[45.4, 1], [46.0, 0.92]], x: [[45.4, 0], [46.0, cx * 0.08]], y: [[45.4, 0], [46.0, cy * 0.08]] };
    act(6, g, exit); act(6, pg, exit);
    // stylised Goa map — outline traced from the site's own presence map; schematic positions
    const map = G(net), MS = tall ? 0.38 : 0.62, MX = tall ? 305 : 1080, MY = tall ? 990 : 190;
    const mapG = G(map, { transform: `translate(${MX} ${MY}) scale(${MS})` });
    act(6, E('path', { d: GOA, class: 'opm-goa' }, mapG), { draw: [[40.0 + sh, 0], [41.7 + sh, 1]] });
    const goaFill = E('path', { d: GOA, class: 'opm-goa-fill' }, mapG); mapG.insertBefore(goaFill, mapG.firstChild);
    act(6, goaFill, { o: [[41.0 + sh, 0], [41.9 + sh, 1]] });
    const mp = (nx, ny) => [MX + nx * MS, MY + ny * MS], L2 = tall ? 1.7 : 1;
    const lab = (x, y, str, cls, size, anchor) => { const lg = G(map); text(lg, x, y, str, cls, size, anchor); return lg; };
    [lab(...(tall ? [180, 1000] : [1440, 170]), 'MAHARASHTRA', 'opm-lab faint-t', 11 * L2, 'middle'), lab(...(tall ? [210, 1270] : [1110, 700]), 'ARABIAN SEA', 'opm-lab faint-t it', 11 * L2, 'middle')].forEach(lg => act(6, lg, { o: [[41.2 + sh, 0], [41.8 + sh, 1]] }));
    [{ n: 'Banda Wafoli', s: 'VSI crusher · Maharashtra', p: LOC.banda, side: 1, node: 1 }, { n: 'Thivim', s: 'RMC plant', p: LOC.thivim, side: -1, node: 2 }, { n: 'Kundaim', s: 'RMC plant', p: LOC.kundaim, side: 1, node: 2 }, { n: 'South Goa', s: 'Machinery base', p: LOC.sancoale, side: 1, node: 3 }].forEach((l, i) => {
      const [x, y] = mp(l.p[0], l.p[1]), lg = G(map), t0 = 41.8 + sh + i * 0.22;
      E('circle', { cx: x, cy: y, r: 22 * (tall ? 1.2 : 1), fill: 'url(#a-glow)' }, lg);
      E('circle', { cx: x, cy: y, r: 6 * (tall ? 1.4 : 1), class: 'opm-dot' }, lg);
      const lx = x + l.side * 16 * L2, anchor = l.side > 0 ? 'start' : 'end';
      text(lg, lx, y - 2, l.n, 'opm-node-t', 15 * L2, anchor); text(lg, lx, y + 15 * L2, l.s.toUpperCase(), 'opm-node-s', 9 * L2, anchor);
      act(6, lg, { o: [[t0, 0], [t0 + 0.4, 1]] });
      const np = nodes[l.node].p, mid = [lerp(np[0], x, 0.5), Math.min(np[1], y) - (tall ? 0 : 60)];
      act(6, M(map, `<path class="ln acc dash" d="M${F(np[0])} ${F(np[1])} Q${F(mid[0])} ${F(mid[1])} ${F(x)} ${F(y)}"/>`), { draw: [[43.0 + sh + i * 0.15, 0], [43.9 + sh + i * 0.15, 1]], o: [[43.0, 0.85], [45.3, 0.85], [45.7, 0]] });
    });
    act(6, lab(...(tall ? [450, 1392] : [1305, 850]), 'SCHEMATIC · LOCATIONS APPROXIMATE', 'opm-lab faint-t', 9.5 * L2, 'middle'), { o: [[42.4 + sh, 0], [43.0 + sh, 1]] });
    act(6, map, { o: [[38.4, 0], [38.9, 1], [45.4, 1], [46.0, 0]], y: [[45.4, 0], [46.0, 24]] });
  }

  /* === 7 — operations to infrastructure: road courses, bridge, city, crane === */
  function zone7({ b, a, f }) {
    const RX = 8140, RW = 640;
    M(b, ART.hills(2100, 260, 13, 0), { transform: at0(7900) });
    M(b, ART.skyline(8380, 9980, 21, GY - 30), { opacity: 0.9 });
    M(b, `<rect x="8700" y="${GY - 24}" width="1300" height="24" fill="url(#a-water)"/><path d="M8760 ${GY - 14}h60M8900 ${GY - 8}h90M9080 ${GY - 16}h50M9300 ${GY - 9}h80M9520 ${GY - 15}h70M9720 ${GY - 8}h60" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>`);
    M(b, ART.trees(8720, 9980, 33, GY - 22, 1.1));
    // building under construction and the tower crane that serves it
    M(b, ART.building(190, 6, 44), { transform: at0(9650) });
    const CRN = ART.crane(420, 300, 90), CXc = 9600;
    M(b, CRN.fixed, { transform: at0(CXc) });
    const hook = cull(G(a, { transform: at0(CXc) }), CXc - 100, CXc + 320);
    const trolley = M(hook, `<rect class="o" fill="#55585d" x="-10" y="${CRN.top + 1}" width="20" height="9"/>`);
    const cable = E('path', { class: 'cable' }, hook);
    const loadG = M(hook, `<path class="o" fill="#55585d" d="M-6 0H6V8H-6Z"/><path class="o" fill="url(#a-concV)" d="M-16 10H16V30H-16Z"/><path d="M-16 10L0 0L16 10" fill="none" stroke="#55585d" stroke-width="1.2"/>`);
    const trX = [[46.5, 230], [49.5, 230], [51.5, 110], [53.5, 110], [55.5, 200]], hk = [[46.5, 300], [49.5, 140], [51.5, 140], [52.8, 330], [54.0, 330], [55.5, 200]];
    up(7, t => { const x = kf(trX, t), y = CRN.top + 12 + kf(hk, t); setA(trolley, 'transform', `translate(${F(x)} 0)`); setA(cable, 'd', `M${F(x - 3)} ${CRN.top + 10}V${F(y)}M${F(x + 3)} ${CRN.top + 10}V${F(y)}`); setA(loadG, 'transform', `translate(${F(x)} ${F(y)})`); });
    // road on an embankment: the courses are revealed in order from the sub-grade up
    const layers = ART.roadSection(RW, 17), rg = G(b, { transform: at0(RX) });
    const order = [['sub', 46.6], ['gsb', 47.3], ['wmm', 48.0], ['conc', 48.7]];
    layers.forEach(l => {
      const t0 = order.find(o => o[0] === l.k)[1], id = 'opm-rv-' + l.k;
      const cp = E('clipPath', { id }, defs), r = E('rect', { x: -2, y: l.y1 - 4, height: l.y0 - l.y1 + 8, width: 0 }, cp);
      M(rg, l.svg, { 'clip-path': `url(#${id})` });
      up(7, t => setA(r, 'width', F((RW + 4) * EASE.io(win(t, t0, t0 + 0.9)))));
    });
    act(7, M(rg, `<path class="o" fill="url(#a-asphalt)" d="M0 -174H${RW}V-182H0Z"/><path d="M14 -178H${RW}" stroke="#f4f1ea" stroke-width="1.6" stroke-dasharray="18 14"/><path class="ln" d="M${RW} -182V0"/>`), { o: [[49.4, 0], [49.9, 1]] });
    M(b, ART.bridge(RX + RW, 9990, -152 + GY, GY, [9030, 9300, 9570]));
    // markers on the courses and their names below the cut-away
    const marks = [['conc', RX + 80, 'CONCRETE'], ['wmm', RX + 290, 'WET MIX MACADAM'], ['gsb', RX + 500, 'GRANULAR SUB-BASE']];
    marks.forEach(([k, x, s]) => {
      const l = layers.find(q => q.k === k), y = GY + (l.y0 + l.y1) / 2, t0 = order.find(o => o[0] === k)[1] + 0.8;
      const labelY = GY + 48 + (TALL() && k === 'wmm' ? 34 : 0);
      // Leave a clear breathing gap before every label so the connector never touches or
      // visually cuts through the text, especially on the narrow/tall composition.
      const lineY = labelY - 16;
      act(7, M(b, `<path class="ln" d="M${x} ${F(y)}V${F(lineY)}"/><circle class="ring-on" cx="${x}" cy="${F(y)}" r="4.5"/>`), { o: [[t0, 0], [t0 + 0.4, 1]] });
      // phones: CONCRETE starts at its guide line (centred it would cross the left screen edge and be hidden)
      // (GRANULAR SUB-BASE likewise starts at its own guide line so the two top-row labels never touch)
      const ls = TALL() && k !== 'wmm';
      label(7, ls ? x - 6 : x, GY + 48, s, { cls: 'call', anchor: ls ? 'start' : 'middle', o: [[t0, 0], [t0 + 0.4, 1]], dyTall: k === 'wmm' ? 34 : 0 });
    });
    // a transit mixer delivers across the finished bridge
    const TM = ART.transitMixer('p7'), mxX = [[49.6, 7860], [55.6, 9700, 'l']];
    const tm = G(a); M(tm, TM.body); const drum = M(tm, TM.drum); M(tm, TM.wheels); M(tm, TM.fenders);
    act(7, tm, { x: mxX, y: GY - 182, s: 0.62, o: [[49.55, 0], [49.6, 1], [55.6, 1]] });
    rollWheels(7, tm, t => (kf(mxX, t) - 7860) / 0.62);
    const stripes = drum.querySelector('.stripes');
    up(7, (t, a2) => ambSkip || setA(stripes, 'transform', `translate(${F(-((a2 * 22) % 30))} 0)`));
    hot(7, RX + 300, GY - 90, 'Road courses: concrete, WMM, GSB', [46.6, 56], [RX, GY - 182, RX + RW, GY]);
    hot(7, 9300, GY - 160, 'Bridge deck and piers', [46.6, 56], [RX + RW, GY - 210, 9990, GY]);
    hot(7, CXc + 60, GY - 440, 'Tower crane', [46.6, 56], [CXc - 100, GY - 460, CXc + 300, GY]);
  }

  /* ---------- Goa outline (normalised 0..1000 tall) and schematic site positions ---------- */
  // Traced from assets/goa-presence-map.png (the site's own map art); positions fitted to it from
  // approximate coordinates (Panaji / Margao used as reference points). Not to scale.
  const GOA = "M183.6 0L194.8 5.6L195.9 19.1L206.1 30.4L206.1 39.4L201.6 48.4L206.1 55.2L215.1 56.3L233.1 65.3L243.2 63.1L248.9 66.4L254.5 66.4L266.9 61.9L272.5 65.3L286 67.6L298.4 75.5L307.4 98L306.3 100.2L314.2 112.6L311.9 118.2L313.1 123.9L322.1 131.8L332.2 153.2L330 164.4L333.3 177.9L331.1 181.3L333.3 184.7L332.2 188.1L341.2 197.1L346.8 199.3L359.2 212.8L371.6 212.8L381.8 216.2L396.4 200.5L404.3 200.5L422.3 193.7L425.7 194.8L435.8 188.1L457.2 183.6L464 176.8L468.5 176.8L479.7 170L496.6 174.5L503.4 171.2L516.9 170L524.8 164.4L524.8 155.4L530.4 146.4L543.9 137.4L552.9 135.1L557.4 138.5L559.7 143L558.6 146.4L568.7 161L566.4 165.5L567.6 168.9L573.2 172.3L582.2 170L587.8 158.8L593.5 158.8L600.2 154.3L609.2 163.3L614.9 164.4L621.6 173.4L621.6 191.4L617.1 202.7L619.4 206.1L635.1 211.7L638.5 216.2L632.9 223L635.1 228.6L631.8 239.9L641.9 253.4L635.1 266.9L644.1 281.5L644.1 287.2L655.4 295L661 309.7L666.7 316.4L661 324.3L659.9 333.3L640.8 350.2L641.9 357L638.5 364.9L646.4 371.6L668.9 415.5L663.3 421.2L659.9 431.3L659.9 440.3L668.9 456.1L664.4 468.5L666.7 476.4L671.2 479.7L677.9 477.5L697.1 479.7L706.1 484.2L712.8 493.2L706.1 503.4L712.8 514.6L709.5 541.7L724.1 560.8L726.4 572.1L719.6 578.8L709.5 583.3L703.8 581.1L698.2 582.2L683.6 574.3L674.5 584.5L671.2 582.2L656.5 586.7L654.3 590.1L655.4 598L652 604.7L644.1 610.4L639.6 620.5L644.1 625L661 628.4L672.3 635.1L675.7 634L689.2 639.6L695.9 649.8L695.9 654.3L702.7 659.9L700.5 665.5L702.7 674.5L711.7 684.7L695.9 711.7L684.7 724.1L680.2 733.1L682.4 737.6L681.3 741L672.3 747.7L676.8 756.8L675.7 762.4L679.1 771.4L670 788.3L670 793.9L673.4 799.5L675.7 815.3L683.6 825.5L683.6 832.2L689.2 840.1L681.3 850.2L682.4 858.1L680.2 861.5L673.4 862.6L662.2 869.4L655.4 879.5L654.3 886.3L645.3 894.1L644.1 897.5L649.8 903.2L652 909.9L632.9 935.8L630.6 936.9L621.6 931.3L611.5 940.3L595.7 949.3L586.7 948.2L578.8 951.6L572.1 959.5L568.7 969.6L560.8 976.4L548.4 969.6L540.5 949.3L530.4 942.6L527 936.9L519.1 933.6L513.5 936.9L507.9 947.1L512.4 958.3L518 962.8L518 968.5L523.6 978.6L521.4 983.1L514.6 986.5L505.6 986.5L493.2 977.5L484.2 977.5L473 973L464 984.2L445.9 985.4L441.4 997.7L434.7 1000L423.4 993.2L416.7 991L408.8 992.1L402 987.6L396.4 988.7L382.9 982L381.8 964L385.1 941.4L379.5 932.4L381.8 929.1L373.9 915.5L373.9 909.9L353.6 891.9L348 894.1L328.8 889.6L324.3 882.9L326.6 875L319.8 855.9L310.8 852.5L299.5 839L290.5 834.5L281.5 834.5L268 823.2L256.8 826.6L250 819.8L259 809.7L259 804.1L253.4 797.3L254.5 795L260.1 790.5L272.5 787.2L274.8 783.8L268 772.5L270.3 768L284.9 761.3L287.2 756.8L281.5 742.1L275.9 736.5L278.2 733.1L275.9 728.6L277 723L270.3 710.6L272.5 705L270.3 694.8L262.4 683.6L264.6 677.9L262.4 663.3L254.5 653.2L256.8 649.8L253.4 641.9L254.5 634L239.9 599.1L243.2 592.3L234.2 573.2L235.4 567.6L230.9 560.8L230.9 555.2L226.4 550.7L226.4 542.8L220.7 536L221.8 530.4L217.3 521.4L208.3 509L195.9 500L191.4 500L182.4 506.8L174.5 505.6L165.5 510.1L152 494.4L147.5 495.5L137.4 489.9L130.6 489.9L126.1 494.4L121.6 494.4L118.2 488.7L120.5 478.6L118.2 467.3L110.4 461.7L101.4 450.5L103.6 443.7L107 441.4L129.5 452.7L141.9 447.1L144.1 442.6L137.4 434.7L140.8 429.1L138.5 420L141.9 413.3L152 407.7L158.8 399.8L156.5 396.4L147.5 394.1L138.5 398.6L129.5 398.6L122.7 393L121.6 387.4L135.1 368.2L137.4 355.9L134 351.4L118.2 350.2L111.5 357L100.2 359.2L90.1 345.7L90.1 332.2L86.7 322.1L82.2 317.6L84.5 308.6L76.6 296.2L76.6 284.9L65.3 273.6L61.9 259L56.3 250L58.6 243.2L56.3 236.5L61.9 229.7L59.7 220.7L47.3 209.5L37.2 192.6L38.3 183.6L30.4 171.2L30.4 162.2L23.6 154.3L20.3 137.4L12.4 126.1L14.6 121.6L11.3 110.4L3.4 101.4L0 91.2L3.4 85.6L12.4 81.1L23.6 82.2L32.7 75.5L38.3 75.5L47.3 81.1L56.3 81.1L61.9 74.3L68.7 70.9L94.6 70.9L98 73.2L146.4 70.9L150.9 66.4L153.2 36L167.8 22.5L172.3 5.6L183.6 0Z";
  const LOC = { banda: [222, -15], thivim: [196, 216], kundaim: [362, 418], sancoale: [440, 790] };

  /* ---------- hotspots: name a machine on hover, focus or tap ---------- */
  const hotLayer = document.createElement('div');
  hotLayer.className = 'opm-hots';
  stage.appendChild(hotLayer);
  const tip = document.createElement('div');
  tip.className = 'opm-tip'; tip.setAttribute('role', 'status'); tip.setAttribute('aria-live', 'polite');
  stage.appendChild(tip);
  const frame = E('path', { class: 'hot-frame' }, null);
  let tipFor = null;
  function buildHots() {
    hotLayer.innerHTML = '';
    scr.appendChild(frame);
    hots.forEach(h => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'opm-hot'; btn.setAttribute('aria-label', h.text); btn.tabIndex = -1;
      const show = () => showTip(h), hide = () => { if (tipFor === h) showTip(null); };
      btn.addEventListener('pointerenter', show); btn.addEventListener('pointerleave', hide);
      btn.addEventListener('focus', show); btn.addEventListener('blur', hide);
      btn.addEventListener('click', e => { e.preventDefault(); showTip(tipFor === h ? null : h); });
      hotLayer.appendChild(btn); h.btn = btn; h.last = {};
    });
  }
  function showTip(h) {
    tipFor = h;
    if (!h) { tip.classList.remove('on'); frame.style.display = 'none'; return; }
    tip.textContent = h.text; tip.classList.add('on'); placeTip();
  }
  function placeTip() {
    const h = tipFor; if (!h) return;
    const [x, y] = project(h.x, h.y);
    tip.style.left = `${(x / VW) * 100}%`; tip.style.top = `${(y / VH) * 100}%`;
    const [x0, y0] = project(h.box[0], h.box[1]), [x1, y1] = project(h.box[2], h.box[3]), c = 10;
    frame.style.display = '';
    frame.setAttribute('d', `M${F(x0)} ${F(y0 + c)}V${F(y0)}H${F(x0 + c)}M${F(x1 - c)} ${F(y0)}H${F(x1)}V${F(y0 + c)}M${F(x1)} ${F(y1 - c)}V${F(y1)}H${F(x1 - c)}M${F(x0 + c)} ${F(y1)}H${F(x0)}V${F(y1 - c)}`);
  }

  /* ---------- rendering ---------- */
  let t = 0, a = 0, visibleZ = {};
  const capCache = caps.map(() => ''), barCache = chapterBtns.map(() => -1);
  let ctaCache = '', curCache = -1, camKey = '';
  const CAP_IN = { 2: 16.4 + SH };
  const tz = z => t - ZT[z]; // each zone on its own clock
  function render() {
    cam = camAt(t);
    const [ax] = anchor(), half = ax / cam.s, wx0 = cam.x - half, wx1 = cam.x + half;
    const worldOn = t - SH2 < 38.3 || t - SH2 > 45.6;
    for (const z in ZONES) {
      const on = worldOn && ZONES[z][1] > wx0 - 40 && ZONES[z][0] < wx1 + 40;
      if (on !== visibleZ[z]) { visibleZ[z] = on; const d = on ? '' : 'none'; Z[z].b.style.display = d; Z[z].a.style.display = d; Z[z].f.style.display = d; Z[z].r.style.display = d; Z[z].extra.forEach(e => { e.style.display = d; }); }
    }
    visibleZ[0] = true;
    for (const it of items) { const on = it.x1 > wx0 - 30 && it.x0 < wx1 + 30; if (on !== it.on) { it.g.style.display = on ? '' : 'none'; it.on = on; it.g.__off = !on; } }
    view = [wx0, wx1];
    const netOn = t - SH2 > 37.2 && t - SH2 < 46.2;
    if (netOn !== visibleZ[6]) { visibleZ[6] = netOn; net.style.display = netFx.style.display = netOn ? '' : 'none'; }
    const k = `${F(cam.x)},${F(cam.y)},${Math.round(cam.s * 1e4)}`;
    if (k !== camKey) {
      camKey = k; leaveCrisp();
      const [ax2, ay2] = anchor();
      const k2 = cam.s / sRef, px = pxu, dpr = window.devicePixelRatio || 1, snap = v => Math.round(v * dpr) / dpr,
        // whole device pixels: a fractional offset would make the compositor re-rasterise every tile
        css = `translate3d(${snap((ax2 - cam.x * cam.s + WORLD[0] * cam.s) * px)}px, ${snap((ay2 - cam.y * cam.s + WORLD[1] * cam.s) * px)}px, 0) scale(${Math.round(k2 * 1e4) / 1e4})`;
      heldLayers.forEach(s => { s.style.transform = css; });
      const vb = `${F(cam.x - ax2 / cam.s)} ${F(cam.y - ay2 / cam.s)} ${F(VW / cam.s)} ${F(VH / cam.s)}`, kk = F(cam.s / sRef);
      liveLayers.forEach(s => { s.setAttribute('viewBox', vb); s.style.setProperty('--k', kk); });
      if (CRISP_ON && cam.s / sRef > 1.15) crispT = setTimeout(enterCrisp, 160);   // (zoomed in and, once it stops moving, redrawn crisp)
    }
    for (const ac of actors) if (visibleZ[ac.z]) applyActor(ac, tz(ac.z));
    for (const u of ups) if (visibleZ[u.z]) u.fn(tz(u.z), a);
    for (const fn of afterFrame) fn(t);
    // labels follow their anchors at a constant size
    for (const l of labels) {
      // only labels whose anchor is inside the frame are drawn
      const [px] = project(l.x, l.y), inFrame = px > -20 && px < VW + 20;
      const o = visibleZ[l.z] && inFrame ? (l.o ? kf(l.o, tz(l.z)) : 1) : 0;
      if (o <= 0.01) { if (l.last.o !== 0) { l.el.style.display = 'none'; l.last.o = 0; } continue; }
      if (l.last.o === 0 || l.last.o === undefined) l.el.style.display = '';
      const [x, y0] = project(l.x, l.y), y = y0 + l.dy, key = `${F(x)},${F(y)},${F(o)}`;
      if (key !== l.last.k) { l.el.setAttribute('x', F(x)); l.el.setAttribute('y', F(y)); l.el.setAttribute('opacity', F(o)); l.last.k = key; const x0 = l.anchor === 'start' ? x : l.anchor === 'end' ? x - l.w : x - l.w / 2; l.el.style.visibility = x0 < 2 || x0 + l.w > VW - 2 ? 'hidden' : ''; }
      l.last.o = o;
    }
    // hotspots: shown for the chapter on screen, placed on their machines
    for (const h of hots) {
      const on = visibleZ[h.z] && tz(h.z) >= h.on[0] && tz(h.z) <= h.on[1];
      if (on !== h.last.on) { h.btn.style.display = on ? '' : 'none'; h.btn.tabIndex = on ? 0 : -1; h.last.on = on; if (!on && tipFor === h) showTip(null); }
      if (!on) continue;
      const [x, y] = project(h.x, h.y), key = `${F(x)},${F(y)}`;
      if (key !== h.last.k) { h.btn.style.left = `${(x / VW) * 100}%`; h.btn.style.top = `${(y / VH) * 100}%`; h.last.k = key; }
    }
    if (tipFor) placeTip();
    // captions and the closing CTA
    caps.forEach((c, i) => {
      const ch = CH[i], a0 = CAP_IN[i] || ch.start + 0.2; // (03 waits until the grade cards have left the frame)
      const o = F(i === CH.length - 1 ? kf([[a0, 0], [a0 + 0.6, 1]], t) : kf([[a0, 0], [a0 + 0.6, 1], [ch.end - 0.5, 1], [ch.end, 0]], t));
      if (String(o) === capCache[i]) return;
      capCache[i] = String(o);
      c.style.opacity = o; c.style.transform = `translate3d(0, ${F((1 - o) * 10)}px, 0)`; c.style.visibility = o < 0.01 ? 'hidden' : '';
    });
    const co = F(kf([[T - 3.4, 0], [T - 2.6, 1]], t));
    if (String(co) !== ctaCache) { ctaCache = String(co); cta.style.opacity = co; cta.style.visibility = co < 0.01 ? 'hidden' : ''; cta.classList.toggle('is-on', co > 0.5); }
    const cur = Math.max(0, CH.findIndex(c => t < c.end || c === CH[CH.length - 1]));
    chapterBtns.forEach((b, i) => { const p = Math.round(clamp((t - CH[i].start) / (CH[i].end - CH[i].start), 0, 1) * 200) / 200; if (p !== barCache[i]) { b.style.setProperty('--p', p); barCache[i] = p; } });
    if (cur !== curCache) { if (curCache >= 0) chapterBtns[curCache].removeAttribute('aria-current'); chapterBtns[cur].setAttribute('aria-current', 'step'); if (nowLabel) nowLabel.textContent = chapterBtns[cur].querySelector('.t').textContent; curCache = cur; }
  }

  /* ---------- scroll → story time ---------- */
  const navH = () => parseFloat(getComputedStyle(section).getPropertyValue('--opm-navh')) || 0;
  function targetT() {
    const r = track.getBoundingClientRect(), pin = section.querySelector('.opm-pin').getBoundingClientRect();
    const span = r.height - pin.height, p = span > 0 ? clamp((navH() - r.top) / span, 0, 1) : 0;
    const tt = p * T;
    if (!reduce.matches) return tt;
    const i = Math.max(0, CH.findIndex(c => tt < c.end || c === CH[CH.length - 1]));
    return CH[i].key; // reduced motion: each chapter's finished key frame
  }
  function scrollForT(tt) {
    const r = track.getBoundingClientRect(), pin = section.querySelector('.opm-pin').getBoundingClientRect();
    return window.scrollY + r.top - navH() + (tt / T) * (r.height - pin.height);
  }
  let forced = null, raf = 0, last = 0, inView = false, avgDt = 16.7, odd = false, lite = false;
  function tick(now) {
    raf = 0;
    if (!inView || document.hidden) return;
    const ms = Math.min(100, now - last), dt = ms / 1000; last = now;
    avgDt += (ms - avgDt) * 0.05;
    const goal = forced !== null ? forced : targetT();
    // glide toward the scroll position (wheel steps become smooth camera moves); exact on arrival
    t = Math.abs(goal - t) < 0.002 || reduce.matches ? goal : t + (goal - t) * (1 - Math.exp(-dt * 7));
    if (!reduce.matches) a += dt;
    odd = !odd;
    if (avgDt > 30) lite = true; else if (avgDt < 18) lite = false;
    ambSkip = !odd;
    render();
    raf = requestAnimationFrame(tick);
  }
  function loop() { if (!raf && inView && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  new IntersectionObserver(es => es.forEach(en => { inView = en.isIntersecting; loop(); }), { rootMargin: '120px 0px' }).observe(track);
  document.addEventListener('visibilitychange', loop);

  // chapter rail: jump to a chapter (just past its camera move)
  chapterBtns.forEach((b, i) => b.addEventListener('click', () => {
    forced = null;
    window.scrollTo({ top: scrollForT(Math.min(T, CH[i].start + (i ? 1.7 : 0.2))), behavior: reduce.matches ? 'auto' : 'smooth' });
  }));
  // 'Request a Quote' reuses the site's quote modal
  section.querySelectorAll('[data-opm-quote]').forEach(el => el.addEventListener('click', e => { const trg = document.getElementById('requestQuoteBtn'); if (!trg) return; e.preventDefault(); trg.click(); }));
  stage.addEventListener('pointerleave', () => showTip(null));

  // layout: tall composition for narrow containers, wide otherwise
  function chooseLayout() {
    const w = stage.parentElement.clientWidth, tall = w > 0 && w < 700;
    stage.classList.toggle('is-tall', tall);
    const compact = !tall && stage.clientWidth < 900;
    stage.classList.toggle('is-compact', compact);
    const next = tall ? 'tall' : compact ? 'compact' : 'wide';
    if (next !== layout) { layout = next; VW = tall ? 900 : 1600; VH = tall ? 1400 : 900; camKey = ''; visibleZ = {}; showTip(null); build(); render(); }
  }
  let rz = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { chooseLayout(); sizeBack(); render(); }); });
  reduce.addEventListener('change', () => { t = targetT(); render(); });

  // QA hooks: render an exact story time; where to scroll for a given time
  section.opmSeek = s => { forced = s === null ? null : clamp(s, 0, T); if (forced !== null) { t = forced; render(); } };
  section.opmScrollFor = s => scrollForT(s);
  section.opmTime = () => t;

  chooseLayout();
  t = targetT();
  render();
})();
