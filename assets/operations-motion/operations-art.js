/* CONNECTED OPERATIONS — illustration library (window.OPM_ART).
   Every picture in the section is drawn here as vector geometry: faceted basalt, piles built stone by
   stone, steel members, vessels, conveyors, crusher, screen, batching plant, vehicles, excavator,
   crane, bridge and road courses. Pure functions: they return SVG markup and, for anything that
   moves, the pivots and paths the motion engine needs. No raster images.

   Drawing language (matching the approved reference art): side elevations lit from the upper left,
   a warm paper ground, charcoal steel with lit and shaded faces, white vessels with soft cylinder
   shading, OM Group orange (#FF5E29) reserved for handrails, paint, brand and process markers. */
window.OPM_ART = (function () {
  const F = n => Math.round(n * 100) / 100;
  const TAU = Math.PI * 2;
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const ORANGE = '#FF5E29';
  const pts = p => p.map(q => F(q[0]) + ' ' + F(q[1])).join('L');
  const poly = p => 'M' + pts(p) + 'Z';

  /* ---------- materials ---------- */
  // facet tone ramps, darkest → lightest (each facet picks a step from its orientation to the light)
  const RAMP = {
    basalt: ['#17181a', '#222326', '#2d2e32', '#3a3b40', '#4a4b50', '#5d5e64', '#75767c', '#93949a', '#b4b5ba'],
    agg: ['#18191b', '#202124', '#292a2e', '#333539', '#3f4146', '#4d4f54', '#5f6166', '#787a80', '#999ba0'],
    grey: ['#3a3b3f', '#48494d', '#57585c', '#68696d', '#7b7c80', '#909195', '#a7a8ac', '#c0c1c4'],
    steelstone: ['#2a2c30', '#36383d', '#44464b', '#55575c', '#696b70', '#808287', '#9a9ca1', '#b7b9bd'],
    fresh: ['#3b3c40', '#4b4c51', '#5e5f64', '#74757a', '#8b8c91'],
  };
  const LIGHT = (() => { const v = [-0.55, -0.7, 0.62], l = Math.hypot(...v); return v.map(c => c / l); })();

  function defs() {
    const lg = (id, stops, x2 = 1, y2 = 0) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
    const rg = (id, stops, fx = 0.5, fy = 0.5) => `<radialGradient id="${id}" fx="${fx}" fy="${fy}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;
    const L = window.OPM_LOGO;
    return [
      // steel: horizontal members lit on top, columns lit on the left
      lg('a-steelH', [[0, '#9a9ea4'], [0.3, '#686c72'], [1, '#2e3135']], 0, 1),
      lg('a-steelV', [[0, '#878b91'], [0.35, '#5d6167'], [0.75, '#41444a'], [1, '#2a2c30']]),
      lg('a-steelD', [[0, '#5a5e64'], [1, '#26282c']], 0, 1),
      // vessels: vertical cylinders (silos, crusher, tanks), horizontal cylinders (drums), cones
      lg('a-vessel', [[0, '#8e8b86'], [0.1, '#c2bfb9'], [0.3, '#f4f3f0'], [0.46, '#fbfbf9'], [0.7, '#d9d6d1'], [0.9, '#a9a6a0'], [1, '#85827d']]),
      lg('a-cone', [[0, '#7d7a75'], [0.25, '#c8c5bf'], [0.45, '#e8e6e2'], [0.75, '#a9a6a0'], [1, '#6f6c67']]),
      lg('a-drum', [[0, '#fdfdfc'], [0.28, '#f3f2ef'], [0.62, '#d5d2cc'], [0.86, '#a9a6a0'], [1, '#86837e']], 0, 1),
      lg('a-panel', [[0, '#f4f2ee'], [1, '#d9d6d0']], 0, 1),
      lg('a-panelD', [[0, '#bdbab4'], [1, '#97948e']], 0, 1),
      lg('a-plate', [[0, '#e9e8e5'], [0.5, '#d2d1cd'], [1, '#a9a8a4']], 0, 1),
      // OM Group orange paint
      lg('a-paint', [[0, '#ff8a5f'], [0.4, ORANGE], [1, '#c8421a']], 0, 1),
      lg('a-paintV', [[0, '#cf461c'], [0.28, '#ff8e64'], [0.55, ORANGE], [1, '#b83c16']]),
      lg('a-paintD', [[0, '#e1501f'], [1, '#a53712']], 0, 1),
      // rubber, rims, glass, concrete, ground
      rg('a-tyre', [[0, '#3c3d41'], [0.72, '#2a2b2e'], [0.9, '#1d1e20'], [1, '#141416']]),
      rg('a-rim', [[0, '#f6f7f8'], [0.55, '#cfd2d6'], [1, '#868a8f']], 0.38, 0.35),
      rg('a-hub', [[0, '#9a9ea3'], [1, '#4e5156']], 0.4, 0.35),
      rg('a-rimO', [[0, '#ff9e78'], [0.55, ORANGE], [1, '#b23a14']], 0.38, 0.35),
      lg('a-bucket', [[0, '#55585e'], [0.5, '#3a3c41'], [1, '#232427']], 0, 1),
      lg('a-signface', [[0, '#fdfcf8'], [0.6, '#f3f1ea'], [1, '#e4e1d9']], 0, 1),
      `<pattern id="a-tread" width="12" height="8" patternUnits="userSpaceOnUse"><rect width="12" height="8" fill="#1b1c1f"/><path d="M0 1.2L6 3.6L12 1.2V3.8L6 6.2L0 3.8Z" fill="#303135"/></pattern>`,
      lg('a-glass', [[0, '#9aa8b5'], [0.45, '#4a5562'], [1, '#262c33']], 0.5, 1),
      lg('a-conc', [[0, '#efece6'], [1, '#c9c4bb']], 0, 1),
      lg('a-concV', [[0, '#c4bfb6'], [0.3, '#ebe7e1'], [0.7, '#d6d1c9'], [1, '#aca79e']]),
      lg('a-concD', [[0, '#bbb6ad'], [1, '#948f86']], 0, 1),
      lg('a-coatV', [[0, '#000', 0], [0.55, '#000', 0.04], [1, '#000', 0.16]], 0, 1),
      lg('a-trouser', [[0, '#4a4d53'], [0.45, '#33363b'], [1, '#1e2023']]),
      lg('a-boot', [[0, '#3a3c40'], [1, '#141516']], 0, 1),
      lg('a-glove', [[0, '#4a4d52'], [1, '#1f2023']]),
      lg('a-refl', [[0, '#eef0f2'], [0.5, '#b4b8bd'], [1, '#d9dcdf']], 0, 1),
      lg('a-skin', [[0, '#d9a888'], [0.55, '#cf9d7d'], [1, '#b8866a']]),
      lg('a-skinD', [[0, '#b98a6d'], [1, '#93684f']]),
      lg('a-coat', [[0, '#ffffff'], [0.6, '#f1f1ee'], [1, '#d6d6d1']]),
      lg('a-hat', [[0, '#ffffff'], [1, '#d9d7d2']], 0, 1),
      lg('a-labwall', [[0, '#f3f1ec'], [0.7, '#ebe7e0'], [1, '#ddd8cf']], 0, 1),
      rg('a-ovenglow', [[0, '#ffb27a', 0.55], [1, '#ff8a4a', 0.12]]),
      lg('a-pileback', [[0, '#2e3034'], [1, '#17181a']], 0, 1),
      lg('a-sandshade', [[0, '#000', 0], [1, '#000', 0.16]]),
      lg('a-cabw', [[0, '#ffffff'], [0.55, '#f3f2ef'], [1, '#d9d7d2']], 0, 1),
      lg('a-drumD', [[0, '#75777c'], [0.22, '#55575c'], [0.55, '#3a3c40'], [1, '#202124']], 0, 1),
      lg('a-dump', [[0, '#64666b'], [0.5, '#45474b'], [1, '#2c2d31']], 0, 1),
      lg('a-chrome', [[0, '#f4f5f6'], [0.35, '#b8bcc1'], [0.6, '#eef0f2'], [1, '#8d9197']], 0, 1),
      lg('a-belt', [[0, '#45474c'], [1, '#1d1e21']], 0, 1),
      lg('a-haze', [[0, '#e7e1d6'], [1, '#f5f1ea', 0]], 0, 1),
      lg('a-water', [[0, '#c6d3dc'], [0.5, '#a9bbc8'], [1, '#d7e0e6']], 0, 1),
      lg('a-asphalt', [[0, '#4a4c50'], [1, '#2e3033']], 0, 1),
      rg('a-shadow', [[0, '#141416', 0.32], [0.55, '#141416', 0.13], [1, '#141416', 0]]),
      rg('a-glow', [[0, ORANGE, 0.35], [1, ORANGE, 0]]),
      // sands: the four products read by colour and grain
      lg('a-sand-m', [[0, '#b3b1ad'], [1, '#77767a']], 0, 1),
      lg('a-sand-p', [[0, '#eadbbd'], [1, '#bfa47a']], 0, 1),
      lg('a-sand-w', [[0, '#d6cdbb'], [1, '#a19682']], 0, 1),
      lg('a-sand-r', [[0, '#e6c993'], [1, '#b38b4f']], 0, 1),
      lg('a-sand-d', [[0, '#8e8d8b'], [1, '#5d5c5f']], 0, 1),
      // textures: deck grating, screen mesh, cladding, sand grain
      `<pattern id="a-grate" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#5d6066"/><path d="M0 0H6M0 0V6" stroke="#3e4146" stroke-width="1.3"/></pattern>`,
      `<pattern id="a-mesh" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#9a9da2"/><path d="M0 0H5M0 0V5" stroke="#6c6f74" stroke-width=".9"/></pattern>`,
      `<pattern id="a-corr" width="7" height="10" patternUnits="userSpaceOnUse"><rect width="7" height="10" fill="#e6e3dd"/><rect width="2.2" height="10" fill="#cdc9c2"/><rect x="2.2" width=".8" height="10" fill="#f7f5f1"/></pattern>`,
      `<pattern id="a-grain" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="2" r=".55" fill="#000" fill-opacity=".22"/><circle cx="6.2" cy="4.6" r=".5" fill="#000" fill-opacity=".18"/><circle cx="3.6" cy="7.4" r=".5" fill="#fff" fill-opacity=".35"/><circle cx="7.8" cy="8.2" r=".45" fill="#000" fill-opacity=".15"/><circle cx="4.4" cy="1.2" r=".4" fill="#fff" fill-opacity=".3"/></pattern>`,
      `<pattern id="a-cwin" width="16" height="20" patternUnits="userSpaceOnUse"><rect width="16" height="20" fill="#e8e4dc"/><rect x="3" y="4" width="10" height="10" fill="#cfd3d6"/></pattern>`,
      stoneDefs(), texDefs(),
      lg('a-mang', [[0, '#b4b7bb'], [0.5, '#8d9095'], [1, '#62656a']]),
      lg('a-mangD', [[0, '#6a6d72'], [0.45, '#45484d'], [1, '#26282b']]),
      rg('a-dust', [[0, '#b9b1a3', 0.6], [0.55, '#cdc6ba', 0.28], [1, '#d9d3c8', 0]]),
      // the official logo, traced from the approved artwork (scripts/trace-logo.js)
      `<path id="a-logo-mark" fill-rule="evenodd" d="${L.mark.d}"/>`,
      `<path id="a-logo-brand" fill-rule="evenodd" d="${L.brand.d}"/>`,
      `<clipPath id="a-logo-name"><rect width="${L.lockup.w}" height="${L.brand.h + 6}"/></clipPath>`,
      `<g id="a-logo-lockup"><path fill-rule="evenodd" fill="${ORANGE}" d="${L.lockup.orange}"/><path fill-rule="evenodd" fill="#1f2a4d" d="${L.lockup.navy}"/></g>`,
    ].join('');
  }

  /* ---------- small primitives ---------- */
  const shadow = (cx, w, h = 9, y = 0, o = 1) => `<ellipse cx="${F(cx)}" cy="${F(y)}" rx="${F(w / 2)}" ry="${F(h)}" fill="url(#a-shadow)"${o !== 1 ? ` opacity="${o}"` : ''}/>`;
  // logo: kind 'mark' | 'brand' (mark + wordmark) | 'lockup' (orange mark, navy wordmark and tagline) | 'name' (the
  // lockup without its tagline: orange mark over the navy OM GROUP); w = rendered width; (x, y) = top-left
  function logo(x, y, w, kind = 'brand', fill = ORANGE) {
    if (kind === 'name') { const k = w / window.OPM_LOGO.lockup.w; return `<use href="#a-logo-lockup" clip-path="url(#a-logo-name)" transform="translate(${F(x)} ${F(y)}) scale(${F(k * 10000) / 10000})"/>`; }
    const L = window.OPM_LOGO[kind], k = w / L.w;
    return `<use href="#a-logo-${kind}" fill="${fill}" transform="translate(${F(x)} ${F(y)}) scale(${F(k * 10000) / 10000})"/>`;
  }
  const logoH = (w, kind = 'brand') => w * window.OPM_LOGO[kind].h / window.OPM_LOGO[kind].w;
  // steel members drawn as a dark edge with a lighter body
  const member = (d, w, cls = '') => `<path class="mo ${cls}" stroke-width="${F(w + 1.6)}" d="${d}"/><path class="mi ${cls}" stroke-width="${F(w)}" d="${d}"/>`;
  const seg = (x0, y0, x1, y1) => `M${F(x0)} ${F(y0)}L${F(x1)} ${F(y1)}`;
  const col = (x, y0, y1, w = 10) => `<rect class="o" fill="url(#a-steelV)" x="${F(x - w / 2)}" y="${F(y1)}" width="${F(w)}" height="${F(y0 - y1)}"/><path class="hl" d="M${F(x - w / 2 + 1.6)} ${F(y1 + 2)}V${F(y0 - 2)}"/>`;
  const beam = (x0, x1, y, h = 8) => `<rect class="o" fill="url(#a-steelH)" x="${F(x0)}" y="${F(y - h)}" width="${F(x1 - x0)}" height="${F(h)}"/><path class="hl" d="M${F(x0 + 2)} ${F(y - h + 1.4)}H${F(x1 - 2)}"/>`;
  const footing = (x, w = 28, h = 12) => `<path class="o" fill="url(#a-conc)" d="M${F(x - w / 2)} 0V${-h}H${F(x + w / 2)}V0Z"/><path class="o" fill="#f4f2ee" d="M${F(x - w / 2)} ${-h}L${F(x - w / 2 + 4)} ${-h - 4}H${F(x + w / 2 + 4)}L${F(x + w / 2)} ${-h}Z"/><path class="o" fill="#b3aea5" d="M${F(x + w / 2)} 0V${-h}L${F(x + w / 2 + 4)} ${-h - 4}V-4Z"/>`;
  // X bracing between two columns
  const xbrace = (xa, xb, ya, yb, w = 3.4) => member(seg(xa, ya, xb, yb) + seg(xa, yb, xb, ya), w);
  // OM Group orange handrail: top rail, knee rail, posts, toe board
  function rail(x0, x1, y, h = 30, step = 30) {
    const n = Math.max(1, Math.round((x1 - x0) / step)), dx = (x1 - x0) / n;
    let posts = ''; for (let i = 0; i <= n; i++) posts += `M${F(x0 + i * dx)} ${F(y)}V${F(y - h)}`;
    return `<path class="rl" d="M${F(x0)} ${F(y - h)}H${F(x1)}M${F(x0)} ${F(y - h * 0.5)}H${F(x1)}${posts}"/><path class="rl-t" d="M${F(x0)} ${F(y - 2)}H${F(x1)}"/>`;
  }
  const deck = (x0, x1, y, rails = true, h = 28) => `<rect class="o" fill="url(#a-grate)" x="${F(x0)}" y="${F(y - 5)}" width="${F(x1 - x0)}" height="5"/><rect class="o" fill="url(#a-steelH)" x="${F(x0)}" y="${F(y)}" width="${F(x1 - x0)}" height="4"/>${rails ? rail(x0 + 2, x1 - 2, y - 5, h) : ''}`;
  function stairs(x0, y0, x1, y1, w = 6) {
    const n = Math.max(3, Math.round(Math.abs(y0 - y1) / 12));
    let t = ''; for (let i = 1; i < n; i++) { const p = i / n, x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p; t += `M${F(x - w)} ${F(y)}H${F(x + w)}`; }
    return `<path class="mi" stroke-width="2" d="${t}"/>${member(seg(x0 - w, y0, x1 - w, y1) + seg(x0 + w, y0, x1 + w, y1), 2.6)}<path class="rl" d="${seg(x0 + w, y0 - 28, x1 + w, y1 - 28)}M${F(x0 + w)} ${F(y0)}V${F(y0 - 28)}M${F(x1 + w)} ${F(y1)}V${F(y1 - 28)}"/>`;
  }
  function ladder(x, y0, y1, cage = false) {
    let r = ''; for (let y = y0 - 8; y > y1; y -= 9) r += `M${F(x - 5)} ${F(y)}H${F(x + 5)}`;
    let c = ''; if (cage) for (let y = y1 + 20; y < y0 - 60; y += 26) c += `M${F(x - 8)} ${F(y)}Q${F(x)} ${F(y - 6)} ${F(x + 8)} ${F(y)}`;
    return `<path class="lad" d="M${F(x - 5)} ${F(y0)}V${F(y1)}M${F(x + 5)} ${F(y0)}V${F(y1)}${r}"/>${c ? `<path class="lad faint" d="${c}"/>` : ''}`;
  }
  const bolts = (x0, y0, x1, y1, gap = 8) => `<path class="bolt" style="stroke-dasharray:.01 ${gap}" d="${seg(x0, y0, x1, y1)}"/>`;
  // a rounded box with lit top and shaded right face (cabins, motors, control rooms)
  function box(x, y, w, h, fill = 'url(#a-panel)', depth = 6, rx = 2) {
    return `<path class="o" fill="#c9c6c0" d="M${F(x + w)} ${F(y)}l${depth} ${-depth}v${F(h)}l${-depth} ${depth}Z"/><path class="o" fill="#f7f6f3" d="M${F(x)} ${F(y)}l${depth} ${-depth}h${F(w)}l${-depth} ${depth}Z"/><rect class="o" fill="${fill}" x="${F(x)}" y="${F(y)}" width="${F(w)}" height="${F(h)}" rx="${rx}"/>`;
  }

  /* ---------- rock geometry ---------- */
  // A rock is a low-poly mesh: concentric jittered rings stitched into triangular facets around a
  // peak that faces the light. Each facet takes a tone from its pseudo-normal · light, so a single
  // rock has lit, mid and recessed faces. Returns facets in local coordinates, base resting on y=0.
  function rockMesh(r, R, o = {}) {
    const n = o.n || 9, rings = o.rings || [1, 0.52], sx = o.sx || 1.1, sy = o.sy || 0.82;
    const a0 = R() * TAU, ringPts = [];
    rings.forEach((k, ri) => {
      const m = ri === 0 ? n : Math.max(3, Math.round(n * k * 1.05));
      const arr = [];
      for (let i = 0; i < m; i++) {
        const a = ((i + (R() - 0.5) * 0.55) / m) * TAU + (ri ? 0.35 : 0);
        const rr = r * k * (ri === 0 ? 0.8 + R() * 0.28 : 0.82 + R() * 0.3);
        let x = Math.cos(a0 + a) * rr * sx, y = Math.sin(a0 + a) * rr * sy;
        const fl = r * sy * (o.flat || 0.62); if (ri === 0 && y > fl) y = fl + (y - fl) * 0.22; // settled base
        arr.push({ p: [x, y], a: ((a % TAU) + TAU) % TAU });
      }
      arr.sort((p, q) => p.a - q.a);
      ringPts.push(arr);
    });
    const peak = [(R() - 0.65) * r * 0.25, -r * sy * (0.2 + R() * 0.12)];
    const tris = [];
    const stitch = (A, B) => {
      const Ae = A.concat([{ p: A[0].p, a: A[0].a + TAU }]), Be = B.concat([{ p: B[0].p, a: B[0].a + TAU }]);
      let i = 0, j = 0;
      while (i < A.length || j < B.length) {
        const takeA = j >= B.length || (i < A.length && Ae[i + 1].a <= Be[j + 1].a);
        if (takeA) { tris.push([Ae[i].p, Ae[i + 1].p, Be[j].p]); i++; } else { tris.push([Ae[i].p, Be[j + 1].p, Be[j].p]); j++; }
      }
    };
    for (let ri = 0; ri < ringPts.length - 1; ri++) stitch(ringPts[ri], ringPts[ri + 1]);
    const inner = ringPts[ringPts.length - 1];
    inner.forEach((q, i) => tris.push([q.p, inner[(i + 1) % inner.length].p, peak]));
    // rest on y = 0
    const base = Math.max(...ringPts[0].map(q => q.p[1]));
    const sh = p => [p[0], p[1] - base];
    const facets = tris.map(t => {
      const tri = t.map(sh), cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
      let nx = cx / (r * sx) + (R() - 0.5) * 0.5, ny = cy / (r * sy) + (R() - 0.5) * 0.5;
      const nz = Math.sqrt(Math.max(0.06, 1 - Math.min(0.94, nx * nx + ny * ny)));
      const l = Math.hypot(nx, ny, nz);
      const lit = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / l;
      return { p: tri, v: Math.min(1, Math.max(0, (o.lift || 0.2) + 0.62 * lit + (R() - 0.5) * 0.16)), c: [cx, cy - base] };
    });
    return { facets, rim: ringPts[0].map(q => sh(q.p)), h: base - Math.min(...ringPts[0].map(q => q.p[1])), w: r * sx * 2 };
  }

  // Bins facets by tone so a pile of hundreds of stones costs a handful of paths.
  const P1 = n => Math.round(n * 10) / 10;
  const tri = p => 'M' + p.map(q => P1(q[0]) + ' ' + P1(q[1])).join(' ') + 'Z';
  // Ink bins facets by tone so hundreds of stones cost a handful of paths. flush() emits what has
  // been inked so far: a pile flushes row by row, so stones in front still overlap those behind.
  // Per-stone options: edges (facet lines), rim (dark outline), hi (light catching the edges that
  // face the light), shadow (a soft contact shadow just below and right of the stone).
  const LIGHT2 = [-0.6, -0.8];
  function Ink(ramp) {
    let bins = ramp.map(() => []), edges = [], rims = [], his = [], shads = [], out = '';
    const api = {
      rock(mesh, x, y, rot = 0, o = {}) {
        const c = Math.cos(rot), s = Math.sin(rot), T = p => [x + p[0] * c - p[1] * s, y + p[0] * s + p[1] * c];
        const shift = o.shift || 0;
        if (o.shadow) { const k = o.shadow; shads.push(tri(mesh.rim.map(p => { const q = T(p); return [q[0] + k * 0.5, q[1] + k * 0.7]; }))); }
        mesh.facets.forEach(f => {
          const k = Math.max(0, Math.min(ramp.length - 1, Math.round(f.v * (ramp.length - 1)) + shift));
          const d = tri(f.p.map(T));
          bins[k].push(d);
          if (o.edges) edges.push(d);
        });
        const rim = mesh.rim.map(T);
        if (o.rim !== false) rims.push(tri(rim));
        if (o.hi) {
          const cx = rim.reduce((a, p) => a + p[0], 0) / rim.length, cy = rim.reduce((a, p) => a + p[1], 0) / rim.length;
          rim.forEach((p, i) => {
            const q = rim[(i + 1) % rim.length], mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy, l = Math.hypot(mx, my) || 1;
            if ((mx * LIGHT2[0] + my * LIGHT2[1]) / l > 0.3) his.push('M' + P1(p[0]) + ' ' + P1(p[1]) + 'L' + P1(q[0]) + ' ' + P1(q[1]));
          });
        }
      },
      flush(o = {}) {
        out += (shads.length ? '<path fill="#000" fill-opacity=".38" d="' + shads.join('') + '"/>' : '')
          + bins.map((b, i) => b.length ? '<path fill="' + ramp[i] + '" d="' + b.join('') + '"/>' : '').join('')
          + (edges.length ? '<path class="fe" d="' + edges.join('') + '"/>' : '')
          + (rims.length && !o.noRim ? '<path class="ro" d="' + rims.join('') + '"/>' : '')
          + (his.length ? '<path class="rh" d="' + his.join('') + '"/>' : '');
        bins = ramp.map(() => []); edges = []; rims = []; his = []; shads = [];
        return api;
      },
      svg(o = {}) { api.flush(o); const r = out; out = ''; return r; },
    };
    return api;
  }
  /* ---------- natural fractured basalt ---------- */
  // Quarry rock is built from a few large, irregular fracture planes, not a triangle mesh:
  // - a rough, irregular silhouette (heavy flat base, chipped shoulders, jagged edges);
  // - split into planes around scattered seeds, big planes sometimes broken again;
  // - each plane toned by its orientation to the light (upper left, front) and shaded across its
  //   face; lower planes sit in ambient shadow;
  // - surface: mottled patches, pits, pale flecks and thin mineral veins;
  // - light catches only ridges that face it; the outline is a fine dark edge.
  const STONE = ['#202123', '#252628', '#2b2c2e', '#313235', '#38393c', '#404144', '#4a4b4e', '#56575a', '#636466', '#727374', '#838484', '#979796'];
  const STONE_FRESH = ['#2c2c2d', '#363636', '#414140', '#4d4c4b', '#5a5957', '#686664', '#777472', '#878481'];
  const L3 = (() => { const v = [-0.55, -0.66, 0.5], l = Math.hypot(...v); return v.map(c => c / l); })();
  const L2 = [-0.62, -0.78];
  function stoneDefs() {
    const g = (id, ramp, k) => '<linearGradient id="' + id + k + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + ramp[Math.min(ramp.length - 1, k + 1)] + '"/><stop offset=".55" stop-color="' + ramp[k] + '"/><stop offset="1" stop-color="' + ramp[Math.max(0, k - 2)] + '"/></linearGradient>';
    return STONE.map((_, k) => g('a-st', STONE, k)).join('') + STONE_FRESH.map((_, k) => g('a-sf', STONE_FRESH, k)).join('');
  }
  const area = p => Math.abs(p.reduce((acc, q, i) => { const r = p[(i + 1) % p.length]; return acc + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
  const centroid = p => p.reduce((acc, q) => [acc[0] + q[0] / p.length, acc[1] + q[1] / p.length], [0, 0]);
  function inside(p, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  // keep the part of polygon P on the side of the line through m where (p - m)·d <= 0
  function clipHalf(P, m, d) {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], fa = (a[0] - m[0]) * d[0] + (a[1] - m[1]) * d[1], fb = (b[0] - m[0]) * d[0] + (b[1] - m[1]) * d[1];
      if (fa <= 0) out.push(a);
      if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  // clip polygon Q to the (convex) face P
  function clipTo(Q, P) {
    const c = centroid(P);
    for (let i = 0; i < P.length && Q.length > 2; i++) {
      const a = P[i], b = P[(i + 1) % P.length]; let d = [b[1] - a[1], a[0] - b[0]];
      if ((c[0] - a[0]) * d[0] + (c[1] - a[1]) * d[1] > 0) d = [-d[0], -d[1]];
      Q = clipHalf(Q, a, d);
    }
    return Q;
  }
  // jagged edges: each outline edge broken into short segments, nudged in and out
  function roughen(P, R, amp) {
    const out = [];
    P.forEach((p, i) => {
      const q = P[(i + 1) % P.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(len / (amp * 6)));
      const nx = (q[1] - p[1]) / len, ny = -(q[0] - p[0]) / len;
      out.push(p);
      for (let k = 1; k < n; k++) { const t = k / n + (R() - 0.5) * 0.3 / n, j = (R() - 0.6) * amp; out.push([p[0] + (q[0] - p[0]) * t + nx * j, p[1] + (q[1] - p[1]) * t + ny * j]); }
    });
    return out;
  }
  // Split polygon P into about 'want' fracture planes, the way rock breaks: straight fracture lines
  // cut the larger pieces (each new break stops at the edges of the piece it splits), leaving
  // wedge-shaped planes of varied size that meet along long ridges and T-junctions.
  function fracture(P, want, R) {
    let polys = [P];
    const A0 = area(P);
    for (let n = 0; polys.length < want && n < want * 8; n++) {
      polys.sort((a, b) => area(b) - area(a));
      const idx = R() < 0.65 ? 0 : Math.floor(R() * Math.min(3, polys.length));
      const Q = polys[idx], A = area(Q), c = centroid(Q), off = Math.sqrt(A) * 0.45;
      const pt = [c[0] + (R() - 0.5) * off, c[1] + (R() - 0.5) * off], t = R() * Math.PI, d = [Math.cos(t), Math.sin(t)];
      const a = clipHalf(Q, pt, d), b = clipHalf(Q, pt, [-d[0], -d[1]]);
      const compact = q => { let per = 0; q.forEach((p, k) => { const r2 = q[(k + 1) % q.length]; per += Math.hypot(r2[0] - p[0], r2[1] - p[1]); }); return 4 * Math.PI * area(q) / (per * per); };
      if (a.length > 2 && b.length > 2 && area(a) > A * 0.16 && area(b) > A * 0.16 && Math.min(area(a), area(b)) > A0 * 0.012 && compact(a) > 0.3 && compact(b) > 0.3) polys.splice(idx, 1, a, b);
    }
    return polys;
  }
  // tone each plane from its orientation: a domed body (center cx, cy; size W, H) with each plane tilted at random
  function shade(polys, cx, cy, W, H, R, o = {}) {
    return polys.map(P => {
      const c = centroid(P), nx = (c[0] - cx) / (W / 2), ny = (c[1] - cy) / (H / 2);
      const tl = o.tilt || 0.75, vx = nx * 0.9 + (R() - 0.5) * tl, vy = ny * 0.9 + (R() - 0.5) * tl, vz = Math.sqrt(Math.max(0.08, 1 - nx * nx * 0.7 - ny * ny * 0.7));
      const lit = (vx * L3[0] + vy * L3[1] + vz * L3[2]) / Math.hypot(vx, vy, vz);
      const v = (o.base || 0.1) + 0.95 * Math.max(0, lit) - 0.18 * Math.max(0, ny) + (R() - 0.5) * 0.1;
      return { p: P, c, v: Math.min(1, Math.max(0, v)) };
    });
  }
  function fracRock(r, R, o = {}) {
    const n = o.n || 12, sx = o.sx || 1.15, sy = o.sy || 0.9, flat = o.flat === undefined ? 0.55 : o.flat;
    let out = [];
    const a0 = R() * 0.6;
    for (let i = 0; i < n; i++) {
      const ang = a0 + (i + (R() - 0.5) * 0.5) / n * TAU, rr = r * (0.8 + R() * 0.26);
      let x = Math.cos(ang) * rr * sx, y = Math.sin(ang) * rr * sy;
      if (y > r * sy * flat) y = r * sy * flat + (y - r * sy * flat) * 0.15; // settled, heavy base
      out.push([x, y]);
      if (R() < (o.chips === undefined ? 0.35 : o.chips) && y < r * sy * flat * 0.8) { // a chipped corner
        const b2 = ang + 0.5 / n * TAU, k = 0.86 + R() * 0.06;
        out.push([Math.cos(b2) * rr * k * sx, Math.sin(b2) * rr * k * sy]);
      }
    }
    if (o.rough) out = roughen(out, R, o.rough);
    const base = Math.max(...out.map(p => p[1]));
    out = out.map(p => [p[0], p[1] - base]);
    const xs = out.map(p => p[0]), ys = out.map(p => p[1]);
    const W = Math.max(...xs) - Math.min(...xs), H = -Math.min(...ys), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = -H * 0.5;
    return { out, cells: shade(fracture(out, o.cells || 12, R), cx, cy, W, H, R), W, H, cx, cy };
  }
  // Paints fracture planes (in the coordinates given) with their texture and edge light.
  // outline: the silhouette, so plane edges lying on it are drawn as the dark outer edge.
  function paintCells(cells, R, o = {}) {
    const ramp = o.fresh ? 'a-sf' : 'a-st', top = o.fresh ? STONE_FRESH.length - 1 : STONE.length - 1, den = o.texture === undefined ? 1 : o.texture;
    let fill = '';
    const pits = [], flecks = [], veins = [], creases = [], ridges = [], light = [], dark = [];
    cells.forEach(cell => {
      const P = cell.p, k = Math.round(cell.v * top), A = area(P);
      fill += '<path fill="url(#' + ramp + k + ')" d="' + tri(P) + '"/>';
      P.forEach((p, i) => {
        const q = P[(i + 1) % P.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const mx = (p[0] + q[0]) / 2 - cell.c[0], my = (p[1] + q[1]) / 2 - cell.c[1], l = Math.hypot(mx, my) || 1, f = (mx * L2[0] + my * L2[1]) / l;
        const seg = 'M' + P1(p[0]) + ' ' + P1(p[1]) + 'L' + P1(q[0]) + ' ' + P1(q[1]);
        if (len > 11 && f > 0.5) { // a ridge facing the light
          const ins = u => [u[0] + (cell.c[0] - u[0]) * 0.035, u[1] + (cell.c[1] - u[1]) * 0.035], a1 = ins(p), b1 = ins(q);
          ridges.push('M' + P1(a1[0]) + ' ' + P1(a1[1]) + 'L' + P1(b1[0]) + ' ' + P1(b1[1]));
        } else if (f < -0.2) creases.push(seg); // the shadowed side of a fold
      });
      if (!den) return;
      // mottling: soft lighter and darker patches across the plane
      const nb = Math.min(9, Math.round(A / 260 * den));
      for (let i = 0; i < nb; i++) {
        const c = [cell.c[0] + (R() - 0.5) * Math.sqrt(A) * 0.8, cell.c[1] + (R() - 0.5) * Math.sqrt(A) * 0.8], rad = Math.sqrt(A) * (0.07 + R() * 0.12), m = 9, B = [];
        for (let j = 0; j < m; j++) { const t = j / m * TAU, rr = rad * (0.6 + R() * 0.6); B.push([c[0] + Math.cos(t) * rr * 1.3, c[1] + Math.sin(t) * rr * 0.8]); }
        const Q = clipTo(B, P); if (Q.length > 2) (R() < 0.55 ? light : dark).push(tri(Q));
      }
      const xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0, bh = Math.max(...ys) - y0;
      const np = Math.round(A * 0.016 * den), nf = Math.round(A * 0.008 * den);
      for (let i = 0, made = 0; made < np + nf && i < (np + nf) * 4; i++) {
        const x = x0 + R() * bw, y = y0 + R() * bh; if (!inside([x, y], P)) continue;
        const z = made < np ? 0.4 + R() * 1.2 : 0.3 + R() * 0.8;
        (made < np ? pits : flecks).push('M' + P1(x) + ' ' + P1(y) + 'l' + P1(z) + ' ' + P1(-z * 0.4) + 'l' + P1(-z * 0.3) + ' ' + P1(z * 0.9) + 'z'); made++;
      }
      // thin pale mineral veins wandering across some planes
      if (A > 500 / den && R() < 0.6) {
        let x = x0 + bw * (0.1 + R() * 0.3), y = y0 + bh * (0.15 + R() * 0.7), d = 'M' + P1(x) + ' ' + P1(y);
        const ang = (R() - 0.5) * 1.8;
        for (let j = 0; j < 9; j++) { const nx2 = x + Math.cos(ang + (R() - 0.5) * 1.1) * bw * 0.09, ny2 = y + Math.sin(ang + (R() - 0.5) * 1.1) * bw * 0.09; if (!inside([nx2, ny2], P)) break; x = nx2; y = ny2; d += 'L' + P1(x) + ' ' + P1(y); }
        veins.push(d);
      }
    });
    return fill
      + (light.length ? '<path fill="#b9b6b0" fill-opacity=".07" d="' + light.join('') + '"/>' : '')
      + (dark.length ? '<path fill="#000" fill-opacity=".08" d="' + dark.join('') + '"/>' : '')
      + (pits.length ? '<path fill="#0a0b0c" fill-opacity=".6" d="' + pits.join('') + '"/>' : '')
      + (flecks.length ? '<path fill="#c6c1b7" fill-opacity=".42" d="' + flecks.join('') + '"/>' : '')
      + (veins.length ? '<path fill="none" stroke="#d6d0c4" stroke-opacity=".42" stroke-width=".6" stroke-linecap="round" stroke-linejoin="round" d="' + veins.join('') + '"/>' : '')
      + (creases.length ? '<path fill="none" stroke="#0b0c0d" stroke-opacity=".38" stroke-width=".8" stroke-linecap="round" d="' + creases.join('') + '"/>' : '')
      + (ridges.length ? '<path fill="none" stroke="#dedbd4" stroke-opacity=".26" stroke-width="1" stroke-linecap="round" d="' + ridges.join('') + '"/>' : '');
  }
  const outlineSvg = (P, w = 0.9) => '<path fill="none" stroke="#0b0c0d" stroke-opacity=".75" stroke-width="' + w + '" stroke-linejoin="round" d="' + tri(P) + '"/>';
  // Contact shadow for a rock of width w resting on y = 0 (light from the upper left: it falls right)
  const rockShadow = (w, h) => '<ellipse cx="' + F(w * 0.16) + '" cy="1" rx="' + F(w * 0.72) + '" ry="' + F(Math.max(4, h * 0.09)) + '" fill="url(#a-shadow)"/>'
    + '<ellipse cx="' + F(w * 0.04) + '" cy="0" rx="' + F(w * 0.44) + '" ry="' + F(Math.max(2, h * 0.025)) + '" fill="#0b0c0d" fill-opacity=".4"/>';

  // A single rock as its own group (fragments, debris, bucket loads): the same natural basalt.
  function rock(r, seed, o = {}) {
    const R = rng(seed);
    if (r < 4) { const mesh = rockMesh(r, R, o), ink = Ink(RAMP.basalt); ink.rock(mesh, 0, 0, 0, { hi: true }); return { svg: ink.svg(), mesh }; }
    const F2 = fracRock(r, R, { cells: r > 14 ? 6 : r > 8 ? 4 : 3, n: 7 + Math.floor(R() * 3), sx: 1.05 + R() * 0.3, sy: 0.8 + R() * 0.15, chips: 0.2, rough: r > 10 ? r * 0.05 : 0 });
    return { svg: paintCells(F2.cells, R, { texture: 0 }) + (r >= 5 ? '<path fill="url(#a-rtex' + (seed % 4) + ')" d="' + tri(F2.out) + '"/>' : '') + outlineSvg(F2.out, 0.7), mesh: { rim: F2.out } };
  }

  // Pile of individually drawn stones on a heap profile. Stones fill the visible face of the heap row
  // by row (larger ones drift to the toe); upper rows are painted first so lower stones sit in front.
  // Returned in horizontal strata (bottom first) so a pile can build up stone layer by stone layer.
  function pile(w, h, seed, o = {}) {
    const R = rng(seed), ramp = RAMP[o.tone === 'grey' ? 'grey' : 'agg'], sr = o.sr || 9, K = o.strata || 1;
    const hw = w / 2, prof = x => h * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / hw, o.pow || 1.25)), 1.08);
    const rows = [];
    for (let y = -sr * 0.55, row = 0; y > -h + sr * 0.3; row++) {
      const t = -y / h, rr = sr * (1.15 - 0.35 * t), arr = [];
      // half-width of the heap at this height
      let lo = 0, hi = hw; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (prof(m) > -y) lo = m; else hi = m; }
      const xw = lo;
      for (let x = -xw + rr * (0.4 + R() * 0.5); x < xw - rr * 0.3; x += rr * (1.12 + R() * 0.3)) arr.push({ x: x + (R() - 0.5) * rr * 0.35, y: y + (R() - 0.5) * rr * 0.4, r: rr * (0.85 + R() * 0.4) });
      rows.push(arr);
      y -= rr * (0.86 + R() * 0.15);
    }
    // backing: the shaded interior between stones (contact shadow), darker toward the toe
    const N = 48, outline = [];
    for (let i = 0; i <= N; i++) { const x = -hw + (w * i) / N; outline.push([x, -prof(x)]); }
    const strata = [], backs = [];
    for (let k = 0; k < K; k++) {
      const y0 = -h * k / K, y1 = -h * (k + 1) / K;
      const slice = []; outline.forEach(([x, y]) => slice.push([x, Math.max(y1, Math.min(y0, y))]));
      const ink = Ink(ramp);
      // upper rows first; each row is flushed so the row in front overlaps it
      rows.slice().reverse().forEach((row, ri) => {
        row.forEach(st => {
          if (st.y > y0 || st.y <= y1) return;
          // detail follows size: large stones get a full faceted mesh, edges and a contact shadow;
          // mid-size a simple fan of facets; the finest grit is a few facets with a highlight
          const big = st.r >= 7, small = st.r < 5, tiny = st.r < 3.2;
          ink.rock(rockMesh(st.r, R, { n: tiny ? 5 : small ? 6 : big ? 8 + Math.floor(R() * 2) : 7, rings: small ? [1] : big ? [1, 0.55, 0.22] : [1, 0.45], sx: 1.05 + R() * 0.25, sy: 0.75 + R() * 0.15, lift: 0.24 }),
            st.x, st.y + st.r * 0.55, (R() - 0.5) * 0.9, { edges: big, rim: !tiny, hi: !tiny || R() < 0.5, shadow: small ? 0 : st.r * 0.35, shift: o.shift || 0 });
        });
        if (ri % 2) ink.flush();
      });
      backs.push('<path fill="url(#a-pileback)" d="' + poly(slice) + '"/>');
      strata.push(ink.svg());
    }
    // backs: the shaded interior of each layer, to be painted beneath ALL the stones (painted with its
    // own layer it would cover the tops of the stones below). Single-layer piles carry their backing.
    if (K === 1) strata[0] = backs[0] + strata[0];
    return { strata, backs, prof, h, w, shadow: shadow(0, w * 1.12, Math.max(6, h * 0.07)) };
  }

  // Sand heap: a slightly irregular mound of fine grains — base tone, a shaded right flank, a dense
  // scatter of tiny grains in three tones (more light ones on the lit side), a lit crest, slump lines.
  const GRAIN = { m: ['#5c5b59', '#8b8986', '#c6c4bf'], p: ['#a3845a', '#c9ae83', '#eee0c2'], w: ['#8f8574', '#b6ac98', '#ddd5c4'], r: ['#9c7438', '#c49b5c', '#ead2a0'] };
  function sandHeap(w, h, seed, kind = 'p') {
    const R = rng(seed), hw = w / 2, N = 40, out = [];
    const prof = x => h * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / hw, 1.45)), 1.12);
    for (let i = 0; i <= N; i++) { const x = -hw + (w * i) / N; out.push([x, -prof(x) + (i && i < N ? (R() - 0.5) * 1.6 : 0)]); }
    const d = 'M' + pts(out) + 'Z', g = GRAIN[kind] || GRAIN.p, bins = [[], [], []];
    const n = Math.min(1400, Math.round(w * h * 0.16));
    for (let i = 0; i < n; i++) {
      const x = (R() * 2 - 1) * hw, top = -prof(x); if (top > -1) continue;
      const y = top + R() * -top, sz = 0.35 + R() * 0.55, lit = x < 0 ? 0.55 : 0.3, u = R();
      bins[u < lit * 0.6 ? 2 : u < 0.72 ? 1 : 0].push('M' + P1(x) + ' ' + P1(y) + 'l' + P1(sz) + ' ' + P1(-sz * 0.6) + 'l' + P1(sz) + ' ' + P1(sz * 0.6) + 'l' + P1(-sz) + ' ' + P1(sz * 0.6) + 'z');
    }
    let slump = ''; for (let i = 0; i < 5; i++) { const x = (R() - 0.5) * w * 0.6, y = -h * (0.2 + R() * 0.45); slump += 'M' + F(x) + ' ' + F(y) + 'q' + F(w * 0.04) + ' ' + F(h * 0.12) + ' ' + F(w * 0.09 * (x > 0 ? 1 : -1)) + ' ' + F(h * 0.2); }
    const crest = 'M' + pts(out.slice(3, Math.floor(N / 2) + 1).map(([x, y]) => [x, y + 1]));
    const id = 'a-sc' + seed + kind;
    return shadow(0, w * 1.08, Math.max(5, h * 0.07)) + '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>'
      + '<path fill="url(#a-sand-' + kind + ')" d="' + d + '"/>'
      + '<g clip-path="url(#' + id + ')"><rect x="0" y="' + F(-h - 2) + '" width="' + F(hw + 2) + '" height="' + F(h + 2) + '" fill="url(#a-sandshade)"/>' + bins.map((b, i) => '<path fill="' + g[i] + '" d="' + b.join('') + '"/>').join('') + '</g>'
      + '<path d="' + d + '" fill="none" stroke="#000" stroke-opacity=".28" stroke-width=".7"/><path d="' + crest + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.3"/><path class="slump" d="' + slump + '"/>';
  }

  /* ---------- rock texture (generated once in code) ---------- */
  // A tileable grain for basalt: fractal relief lit from the upper left (so tiny bumps catch light and
  // cast shade), soft mottling, dark pits, pale mineral flecks and a few thin veins. Painted once to an
  // offscreen canvas and used as an SVG pattern laid over the shaded fracture planes.
  let TEXURL = null;
  function rockTextureURL() {
    if (TEXURL) return TEXURL;
    const N = 320, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), px = img.data;
    const lattice = (g, seed) => {
      const r = rng(seed), a = new Float32Array(g * g); for (let i = 0; i < a.length; i++) a[i] = r();
      return (x, y) => {
        const fx = x * g / N, fy = y * g / N, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const i0 = x0 % g, j0 = y0 % g, i1 = (i0 + 1) % g, j1 = (j0 + 1) % g;
        return (a[j0 * g + i0] * (1 - sx) + a[j0 * g + i1] * sx) * (1 - sy) + (a[j1 * g + i0] * (1 - sx) + a[j1 * g + i1] * sx) * sy;
      };
    };
    const oct = [[5, 0.5], [10, 0.25], [20, 0.15], [40, 0.09], [80, 0.06], [160, 0.04]].map(([g, w], k) => [lattice(g, 31 + k * 17), w]);
    const mott = lattice(4, 77), mott2 = lattice(12, 91);
    const H = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let h = 0; for (const [fn, w] of oct) h += fn(x, y) * w; H[y * N + x] = h; }
    const L = [-0.5, -0.62, 0.6], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, dx = H[y * N + (x + 1) % N] - H[y * N + (x + N - 1) % N], dy = H[((y + 1) % N) * N + x] - H[((y + N - 1) % N) * N + x];
      const nx = -dx * 14, ny = -dy * 14, nl = Math.hypot(nx, ny, 1), lit = (nx * L[0] + ny * L[1] + L[2]) / nl - L[2];
      const v = lit * 1.3 + (mott(x, y) - 0.5) * 0.36 + (mott2(x, y) - 0.5) * 0.18;
      const o = i * 4;
      if (v > 0) { px[o] = 236; px[o + 1] = 232; px[o + 2] = 224; px[o + 3] = Math.min(0.5, v) * 255; }
      else { px[o] = 6; px[o + 1] = 7; px[o + 2] = 8; px[o + 3] = Math.min(0.56, -v) * 255; }
    }
    ctx.putImageData(img, 0, 0);
    const R = rng(1234), wrap = draw => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { ctx.save(); ctx.translate(ox, oy); draw(); ctx.restore(); } };
    const dots = (n, rmin, rmax, col) => { const pts = Array.from({ length: n }, () => [R() * N, R() * N, rmin + R() * (rmax - rmin), R() * 3]); wrap(() => { ctx.fillStyle = col; pts.forEach(([x, y, r, a]) => { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, a, 0, 6.283); ctx.fill(); }); }); };
    dots(700, 0.5, 1.5, 'rgba(0,0,0,.55)');
    dots(520, 0.35, 0.95, 'rgba(232,227,216,.5)');
    const veins = Array.from({ length: 7 }, () => { let x = R() * N, y = R() * N, a = R() * 6.28; const p = [[x, y]]; for (let k = 0; k < 14; k++) { a += (R() - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 9; p.push([x, y]); } return [p, 0.4 + R() * 0.6]; });
    wrap(() => { veins.forEach(([p, w]) => { ctx.strokeStyle = 'rgba(222,214,200,.34)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => ctx.lineTo(q[0], q[1])); ctx.stroke(); }); });
    TEXURL = cv.toDataURL('image/webp', 0.92);
    return TEXURL;
  }
  function texDefs() {
    if (typeof document === 'undefined') return '';
    return '<pattern id="a-rtex" patternUnits="userSpaceOnUse" width="190" height="190"><image href="' + rockTextureURL() + '" width="190" height="190" preserveAspectRatio="none"/></pattern>'
      + ['rotate(0)', 'rotate(61) translate(37 81)', 'rotate(-38) translate(93 12)', 'rotate(127) translate(15 140)'].map((tf, i) => '<pattern id="a-rtex' + i + '" href="#a-rtex" patternTransform="' + tf + '"/>').join('');
  }
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };

  /* ---------- the quarry boulder that shatters (chapter 1) ---------- */
  // One massive blasted basalt boulder, already divided along hidden fracture lines into nPieces
  // major fragments. Each fragment is a complete little rock of its own (its fracture planes shaded
  // as part of the whole boulder, the grain texture registered to the boulder so the intact rock
  // shows no seams), so the boulder can genuinely come apart. Also returned: the fracture lines
  // (cracks) ordered from where the stress starts, a pale fresh-fracture lip along each fragment's
  // broken edges (revealed as it separates), and the contact shadow.
  function voronoi(P, want, R) {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), W = Math.max(...xs) - x0, H = Math.max(...ys) - y0;
    const minD = Math.sqrt(area(P) / want) * 0.86, seeds = [];
    for (let tries = 0; seeds.length < want && tries < want * 400; tries++) {
      const p = [x0 + R() * W, y0 + R() * H];
      if (inside(p, P) && seeds.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > minD * (tries > want * 200 ? 0.7 : 1))) seeds.push(p);
    }
    return seeds.map((sd, i) => { let Q = P.slice(); seeds.forEach((q, j) => { if (j !== i && Q.length) Q = clipHalf(Q, [(sd[0] + q[0]) / 2, (sd[1] + q[1]) / 2], [q[0] - sd[0], q[1] - sd[1]]); }); return Q; }).filter(Q => Q.length > 2 && area(Q) > 30);
  }
  function quarryBoulder(r, seed, nPieces) {
    const R = rng(seed), B = fracRock(r, R, { cells: 1, n: 12, sx: 1.2, sy: 0.9, flat: 0.62, chips: 0.4, rough: 2.2 });
    const O = B.out, A0 = area(O), onOut = (p, q) => segDist([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], O[0], O[0]) < 0 || O.some((a, i) => segDist([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], a, O[(i + 1) % O.length]) < 1);
    const parts = voronoi(O, nPieces, R), edges = [];
    let pdefs = '';
    const pieces = parts.map((P, i) => {
      const c = centroid(P), pr = rng(seed * 7 + i), loc = p => [p[0] - c[0], p[1] - c[1]], L = P.map(loc);
      const planes = shade(fracture(P, area(P) > A0 / nPieces ? 3 : 2, pr), B.cx, B.cy, B.W, B.H, pr, { tilt: 1.15, base: 0.06 })
        .map(pl => ({ p: pl.p.map(loc), c: loc(pl.c), v: pl.v }));
      const outer = [], inner = [], lips = [];
      P.forEach((p, k) => {
        const q = P[(k + 1) % P.length], a = loc(p), b = loc(q), d = 'M' + P1(a[0]) + ' ' + P1(a[1]) + 'L' + P1(b[0]) + ' ' + P1(b[1]);
        if (onOut(p, q)) { outer.push(d); return; }
        inner.push(d); edges.push([p, q]);
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 6) return;
        let n = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (n[0] * -m[0] + n[1] * -m[1] < 0) n = [-n[0], -n[1]];
        const w = Math.min(4, len * 0.08), Q = clipTo([a, b, [b[0] + n[0] * w, b[1] + n[1] * w], [a[0] + n[0] * w, a[1] + n[1] * w]], L);
        if (Q.length > 2) lips.push(tri(Q));
      });
      const tid = 'a-bt' + seed + '-' + i;
      pdefs += '<pattern id="' + tid + '" href="#a-rtex" patternTransform="translate(' + F(-c[0]) + ' ' + F(-c[1]) + ')"/>';
      return {
        c, L, hull: convexHull(L),
        svg: paintCells(planes, pr, { texture: 0 }) + '<path fill="url(#' + tid + ')" d="' + tri(L) + '"/>'
          + (outer.length ? '<path fill="none" stroke="#0b0c0d" stroke-opacity=".75" stroke-width=".9" stroke-linecap="round" d="' + outer.join('') + '"/>' : ''),
        seam: inner.length ? '<path fill="none" stroke="#0b0c0d" stroke-opacity=".8" stroke-width=".9" stroke-linecap="round" d="' + inner.join('') + '"/>' : '',
        fresh: lips.length ? '<path fill="#55524e" fill-opacity=".85" d="' + lips.join('') + '"/><path fill="url(#' + tid + ')" d="' + lips.join('') + '"/>' : '',
      };
    });
    // fracture lines: internal edges, de-duplicated, drawn as jagged cracks, ordered from the stress origin
    const kept = [];
    edges.forEach(([p, q]) => { if (kept.some(([a, b]) => segDist(p, a, b) < 1.5 && segDist(q, a, b) < 1.5)) return; kept.push([p, q]); });
    const origin = [B.cx + B.W * 0.2, B.cy - B.H * 0.38], cr = rng(seed + 5);
    const dist = e => Math.hypot((e[0][0] + e[1][0]) / 2 - origin[0], (e[0][1] + e[1][1]) / 2 - origin[1]);
    const dmax = Math.max(...kept.map(dist)) || 1;
    const cracks = kept.map(e => {
      const [p, q] = e, len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(2, Math.round(len / 7)), nx = -(q[1] - p[1]) / len, ny = (q[0] - p[0]) / len;
      // start at the end nearer the origin, so each crack runs away from where the stress began
      const flip = Math.hypot(q[0] - origin[0], q[1] - origin[1]) < Math.hypot(p[0] - origin[0], p[1] - origin[1]);
      const a = flip ? q : p, b = flip ? p : q;
      let d = 'M' + P1(a[0]) + ' ' + P1(a[1]);
      for (let k = 1; k < n; k++) { const t = k / n, j = (cr() - 0.5) * 3.6; d += 'L' + P1(a[0] + (b[0] - a[0]) * t + nx * j) + ' ' + P1(a[1] + (b[1] - a[1]) * t + ny * j); }
      return { d: d + 'L' + P1(b[0]) + ' ' + P1(b[1]), k: dist(e) / dmax };
    }).sort((x, y) => x.k - y.k);
    return { out: O, W: B.W, H: B.H, cx: B.cx, cy: B.cy, pieces, cracks, pdefs, under: '<path fill="#202123" d="' + tri(O) + '"/>', shadow: rockShadow(B.W, B.H) };
  }

  /* ---------- primary jaw crusher (chapter 1), side elevation with the near cheek cut away ---------- */
  // Geometry (origin: centre of the crusher on the ground): the fixed jaw on the left, the moving jaw
  // (pitman) hanging from the eccentric shaft S and pushed at its foot by the toggle plate. The engine
  // drives the eccentric: the pitman top orbits S by e, its foot swings by d, closing the chamber.
  const JAW = { fTop: [-96, -318], fBot: [-50, -128], mTop: [36, -318], mBot: [-6, -128], S: [74, -330], Tg: [26, -146], seat: [108, -124], e: 4, d: 7, entry: [-30, -322], exit: [-28, -122] };
  function jawCrusher() {
    const J = JAW, pt = p => F(p[0]) + ' ' + F(p[1]);
    const teeth = (a, b, side, n) => { let d = ''; for (let i = 1; i < n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; d += 'M' + F(x) + ' ' + F(y) + 'l' + F(side * 6) + ' -3'; } return d; };
    const legs = xs => xs.map(x => col(x, 0, -92, 16) + '<g>' + footing(x, 34, 12) + '</g>').join('');
    const back = '<g opacity=".72">' + legs([-118, 142]) + '</g>'
      + '<path class="o" fill="#232427" d="M-140 -96V-298L-118 -350H122L152 -298V-96Z"/>'
      + '<path fill="#141517" d="M-106 -326H52L40 -116H-74Z"/>'
      + '<path class="o" fill="url(#a-mang)" d="M' + pt(J.fTop) + 'L' + pt(J.fBot) + 'L-66 -128L-114 -318Z"/><path class="tooth" d="' + teeth(J.fTop, J.fBot, 1, 13) + '"/>'
      + '<rect class="o" fill="url(#a-steelD)" x="100" y="-152" width="42" height="46" rx="3"/>'
      + '<path fill="#0d0e0f" d="M-74 -116H40L26 -100H-60Z"/>';
    const pitman = '<path class="o" fill="url(#a-steelV)" d="M40 -340Q76 -366 106 -340L46 -150L28 -132L-6 -122L-8 -130L34 -318Z"/>'
      + '<path class="o" fill="url(#a-mang)" d="M' + pt(J.mTop) + 'L' + pt(J.mBot) + 'L6 -128L48 -318Z"/><path class="tooth" d="' + teeth(J.mTop, J.mBot, -1, 13) + '"/>'
      + '<circle class="o" cx="78" cy="-330" r="20" fill="url(#a-hub)"/><circle cx="78" cy="-330" r="7" fill="#2a2c30"/>';
    const front = legs([-132, 132])
      + '<rect class="o" fill="url(#a-steelH)" x="-158" y="-104" width="326" height="12"/>'
      + '<path class="o" fill="url(#a-steelD)" fill-rule="evenodd" d="M-150 -92V-300L-128 -356H128L160 -300V-92Z M-108 -326L-74 -118H40L52 -326Z"/>'
      + '<path d="M-108 -326L-74 -118H40L52 -326" fill="none" stroke="#c4c0b8" stroke-width="1.1" stroke-dasharray="7 4"/>'
      + '<path d="M-138 -112V-292M148 -112V-292M-150 -300H160" stroke="#4a4c51" stroke-width="3"/>'
      + bolts(-144, -110, -144, -290, 11) + bolts(154, -110, 154, -290, 11)
      + '<path class="o" fill="url(#a-steelD)" d="M-108 -326L-152 -384H-138L-96 -330Z"/><path class="rl" style="stroke-width:3" d="M-153 -385H-137"/>'
      + '<path class="o" fill="url(#a-steelD)" d="M52 -326L30 -386H42L62 -330Z"/><path class="rl" style="stroke-width:3" d="M29 -387H43"/>'
      + logo(70, -236, 64, 'brand')
      + col(180, 0, -112, 8) + col(222, 0, -112, 8) + '<g>' + footing(180, 18, 8) + footing(222, 18, 8) + '</g>' + '<rect class="o" fill="url(#a-steelD)" x="168" y="-156" width="64" height="44" rx="4"/>' + fins(170, -152, 44, 36)
      + '<path d="M192 -146L104 -376M206 -122L126 -296" stroke="#1c1d20" stroke-width="2.4"/><circle class="o" cx="198" cy="-134" r="12" fill="url(#a-rim)"/>';
    let spokes = ''; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; spokes += 'M0 0L' + F(Math.cos(a) * 44) + ' ' + F(Math.sin(a) * 44); }
    const flywheel = '<circle class="o" r="54" fill="#2a2c30"/><circle r="47" fill="#3a3c40"/><path d="' + spokes + '" stroke="#1d1e21" stroke-width="7" stroke-linecap="round"/>'
      + '<circle r="47" fill="none" stroke="#55585d" stroke-width="2"/><path d="M0 -50A50 50 0 0 1 35.4 -35.4" stroke="' + ORANGE + '" stroke-width="4" fill="none"/><circle class="o" r="12" fill="url(#a-hub)"/>';
    return { back, pitman, front, flywheel, J };
  }

  /* ---------- secondary cone crusher (chapter 1), side elevation with a cut-away window ---------- */
  // The mantle (a manganese cone) gyrates inside the concave; material passes down the narrowing gap.
  // origin: centre of the crusher on the ground. clip: hides the window region of the front shell.
  const CONE = { pivot: [0, -296], entry: [0, -330] };
  function coneCrusher(id = 'cc') {
    const legs = xs => xs.map(x => col(x, 0, -76, 16) + '<g>' + footing(x, 32, 12) + '</g>').join('');
    const back = '<g opacity=".72">' + legs([-104, 128]) + '</g>'
      + '<path fill="#141517" d="M-66 -272H66L104 -146H-104Z"/>'
      + '<path class="o" fill="url(#a-mang)" d="M-66 -272L-104 -146H-90L-56 -272Z"/><path class="o" fill="url(#a-mang)" d="M66 -272L104 -146H90L56 -272Z"/>';
    const mantle = '<path class="o" fill="url(#a-mangD)" d="M0 -286L-12 -270L-80 -150H80L12 -270Z"/><path d="M-12 -270L-80 -150M12 -270L80 -150" stroke="#8a8d92" stroke-opacity=".5" stroke-width="1.2"/>'
      + '<path d="M-48 -206H48M-30 -238H30" stroke="#1d1e21" stroke-opacity=".6" stroke-width="1.4"/><circle class="o" cx="0" cy="-288" r="8" fill="url(#a-hub)"/>';
    const clip = '<clipPath id="a-clip-' + id + '"><path clip-rule="evenodd" d="M-400 -500H400V100H-400Z M-64 -270L-100 -150H100L64 -270Z"/></clipPath>';
    const front = '<g clip-path="url(#a-clip-' + id + ')">' + legs([-118, 118])
      + beam(-140, 140, -70, 12)
      + '<path class="o" fill="url(#a-vessel)" d="M-112 -82V-172H112V-82Z"/><path class="seam" d="M-112 -100H112M-112 -150H112"/>'
      + '<path class="o" fill="url(#a-paint)" d="M-128 -172V-198H128V-172Z"/>'
      + [-104, -62, 62, 104].map(x => '<rect class="o" fill="#2f3135" x="' + (x - 5) + '" y="-208" width="10" height="44" rx="2"/>').join('')
      + '<path class="o" fill="url(#a-cone)" d="M-114 -198L-76 -286H76L114 -198Z"/>'
      + logo(30, -142, 64, 'brand') + '</g>'
      + '<path d="M-64 -270L-100 -150H100L64 -270" fill="none" stroke="#c4c0b8" stroke-width="1.1" stroke-dasharray="7 4"/>'
      + '<path class="o" fill="url(#a-steelD)" d="M-82 -300H82V-286H-82Z"/>'
      + '<path class="o" fill="url(#a-steelD)" d="M-78 -300L-106 -340H106L78 -300Z"/><path class="rl" style="stroke-width:3" d="M-107 -341H107"/>'
      + '<path class="o" fill="url(#a-steelD)" d="M-40 -82H40L18 -56H-18Z"/>'
      + '<path class="o" fill="url(#a-steelD)" d="M-176 -130H-112V-100H-176Z"/>'
      + col(-282, 0, -94, 8) + col(-236, 0, -94, 8) + col(-160, 0, -100, 8) + '<g>' + footing(-282, 18, 8) + footing(-236, 18, 8) + footing(-160, 18, 8) + '</g>' + '<rect class="o" fill="url(#a-steelD)" x="-292" y="-138" width="66" height="44" rx="4"/>' + fins(-290, -134, 46, 36)
      + '<path d="M-250 -128L-186 -136M-250 -104L-186 -96" stroke="#1c1d20" stroke-width="2.4"/><circle class="o" cx="-252" cy="-116" r="10" fill="url(#a-rim)"/>';
    const sheave = '<circle class="o" r="20" fill="url(#a-rim)"/><path d="M-16 0H16M0 -16V16" stroke="#3a3c40" stroke-width="2.4"/><circle r="5" fill="#2a2c30"/>';
    return { back, mantle, front, clip, sheave, sheaveAt: [-186, -116], C: CONE };
  }

  /* ---------- the basalt boulder (chapter 1) ---------- */
  // A large naturally fractured boulder, plus chunks (separate rocks of the same basalt) that
  // protrude from its right shoulder and break away. Where each chunk sat, a lighter, rougher
  // fracture scar is revealed. Fracture lines trace the chunks' outlines.
  // chunkSpec: [{ a: direction from the centre (radians, y down), r: chunk size }]
  function boulder(r, seed, chunkSpec) {
    const R = rng(seed), B = fracRock(r, R, { cells: 17, n: 14, sx: 1.18, sy: 0.92, flat: 0.62, chips: 0.45, rough: 4, tilt: 0.55 });
    const cx = B.cx, cy = B.cy;
    const formG = (id, x0, y0, x1, y1) => '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + F(x0) + '" y1="' + F(y0) + '" x2="' + F(x1) + '" y2="' + F(y1) + '"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>';
    // the outline point in a given direction from the centre
    const rimAt = a => { let best = B.out[0], bd = 9; B.out.forEach(p => { const d = Math.abs(((Math.atan2(p[1] - cy, p[0] - cx) - a + 3 * Math.PI) % TAU) - Math.PI); if (d < bd) { bd = d; best = p; } }); return best; };
    const chunks = chunkSpec.map((sp, i) => {
      const cr = rng(seed + 20 + i), C = fracRock(sp.r, cr, { cells: 4 + Math.floor(cr() * 2), n: 8 + Math.floor(cr() * 3), sx: 1.0 + cr() * 0.3, sy: 0.85 + cr() * 0.2, chips: 0.3, rough: sp.r * 0.06, tilt: 0.6 });
      const oc = centroid(C.out), local = C.out.map(p => [p[0] - oc[0], p[1] - oc[1]]);
      const cells = C.cells.map(cl => ({ p: cl.p.map(p => [p[0] - oc[0], p[1] - oc[1]]), c: [cl.c[0] - oc[0], cl.c[1] - oc[1]], v: cl.v }));
      // seated on the shoulder: centre pulled in from the outline so about a third of it overlaps the body
      const rim = rimAt(sp.a), k = sp.r * 0.8 / Math.hypot(rim[0] - cx, rim[1] - cy), c = [rim[0] + (cx - rim[0]) * k, rim[1] + (cy - rim[1]) * k];
      const xs = local.map(p => p[0]), ys = local.map(p => p[1]), id = 'a-cf' + seed + '-' + i;
      // the scar: the chunk's footprint, smaller and pulled into the body, as a few fresh fracture planes
      const fr = rng(seed + 50 + i), scar = roughen(local.map(p => [c[0] + p[0] * (0.82 + fr() * 0.18) + (cx - c[0]) * 0.06, c[1] + p[1] * (0.82 + fr() * 0.18) + (cy - c[1]) * 0.06]), fr, 3), sc = centroid(scar);
      const sx = scar.map(p => p[0]), sy = scar.map(p => p[1]);
      return {
        c, pts: local,
        svg: paintCells(cells, cr) + formG(id, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)) + '<path fill="url(#' + id + ')" d="' + tri(local) + '"/>' + outlineSvg(local, 0.8),
        fresh: paintCells(shade(fracture(scar, 4, fr), sc[0], sc[1], Math.max(...sx) - Math.min(...sx), Math.max(...sy) - Math.min(...sy), fr, { base: 0.08, tilt: 1.4 }), fr, { fresh: true, texture: 1.6 })
          + '<path fill="none" stroke="#0b0c0d" stroke-opacity=".4" stroke-width="1.1" stroke-linejoin="round" d="' + tri(scar) + '"/>',
        crack: 'M' + pts(local.map(p => [p[0] + c[0], p[1] + c[1]])),
      };
    });
    return {
      under: '',
      core: paintCells(B.cells, rng(seed + 7)) + formG('a-bf' + seed, cx - B.W * 0.4, cy - B.H * 0.55, cx + B.W * 0.5, 0) + '<path fill="url(#a-bf' + seed + ')" d="' + tri(B.out) + '"/>' + outlineSvg(B.out, 0.9),
      chunks, h: B.H, w: B.W, shadow: rockShadow(B.W, B.H),
    };
  }
  // the edges of plane P that lie on the outline O, as a dark outer edge
  function edgeOn(P, O) {
    const near = p => O.some((a, i) => { const b = O[(i + 1) % O.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]) < 0.6; });
    let d = '';
    P.forEach((p, i) => { const q = P[(i + 1) % P.length]; if (near([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])) d += 'M' + P1(p[0]) + ' ' + P1(p[1]) + 'L' + P1(q[0]) + ' ' + P1(q[1]); });
    return d ? '<path fill="none" stroke="#0b0c0d" stroke-opacity=".75" stroke-width=".9" stroke-linecap="round" d="' + d + '"/>' : '';
  }
  function convexHull(P) {
    const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  /* ---------- background ---------- */
  function hills(w, h, seed, x0 = 0) {
    const R = rng(seed); let d = `M${F(x0)} 0`;
    const n = 7; for (let i = 0; i <= n; i++) { const x = x0 + (w * i) / n, y = -h * (0.35 + R() * 0.65) * Math.sin(Math.PI * (0.15 + 0.7 * i / n)); d += `L${F(x)} ${F(y)}`; }
    return `<path fill="url(#a-haze)" d="${d}V0Z"/>`;
  }
  function skyline(x0, x1, seed, gy = 0) {
    const R = rng(seed); let out = '';
    for (let x = x0; x < x1;) {
      const w = 26 + R() * 46, h = 50 + R() * 130, tone = 228 - Math.floor(R() * 18);
      out += `<rect x="${F(x)}" y="${F(gy - h)}" width="${F(w)}" height="${F(h)}" fill="rgb(${tone},${tone - 3},${tone - 8})"/>`;
      for (let y = gy - h + 8; y < gy - 10; y += 12) out += `<path d="M${F(x + 5)} ${F(y)}H${F(x + w - 5)}" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-dasharray="5 4"/>`;
      x += w + 4 + R() * 18;
    }
    return out;
  }
  function trees(x0, x1, seed, gy = 0, s = 1) {
    const R = rng(seed); let out = '';
    for (let x = x0; x < x1; x += (18 + R() * 30) * s) { const h = (16 + R() * 22) * s, w = h * (0.7 + R() * 0.4); out += `<ellipse cx="${F(x)}" cy="${F(gy - h * 0.6)}" rx="${F(w / 2)}" ry="${F(h * 0.55)}" fill="#c9c9bd"/><path d="M${F(x)} ${F(gy)}V${F(gy - h * 0.3)}" stroke="#a9a99d" stroke-width="1.5"/>`; }
    return out;
  }

  /* ---------- conveyor ---------- */
  // Inclined troughed belt conveyor from tail (x0,y0) to head (x1,y1) on a lattice truss with legs to
  // the ground (gy). Static frame markup plus the belt path, idler rollers and pulleys for the engine.
  function conveyor(x0, y0, x1, y1, o = {}) {
    const gy = o.gy === undefined ? 0 : o.gy, depth = o.depth || 16, L = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = uy, ny = -ux; // n points "up" off the belt
    const P = (u, off) => [x0 + ux * u + nx * off, y0 + uy * u + ny * off];
    const pr = o.pulley || 8.5;
    const sT = [P(0, -pr - 3), P(L, -pr - 3)], sB = [P(0, -pr - 3 - depth), P(L, -pr - 3 - depth)];
    let lattice = '', k = 0; const step = depth * 1.5;
    for (let u = 12; u < L - 12; u += step, k++) { const a = P(u, -pr - 3), b = P(u + step, -pr - 3 - depth); lattice += k % 2 ? seg(...a, ...b) : seg(...P(u, -pr - 3 - depth), ...P(u + step, -pr - 3)); }
    let legs = '';
    (o.legs || []).forEach(f => {
      const [lx, ly] = P(L * f, -pr - 3 - depth);
      if (ly < gy - 6) legs += member(seg(lx - 10, ly, lx - 18, gy) + seg(lx + 10, ly, lx + 18, gy), 4) + member(seg(lx - 14, (ly + gy) / 2, lx + 14, (ly + gy) / 2), 2.4)
        + `<g transform="translate(0 ${F(gy)})">${footing(lx - 18, 16, 6)}${footing(lx + 18, 16, 6)}</g>`;
    });
    let railD = '';
    if (o.rail) {
      const h = 26; let posts = '';
      for (let u = 6; u < L - 4; u += 30) { const [px, py] = P(u, 4); posts += `M${F(px)} ${F(py)}V${F(py - h)}`; }
      const a = P(0, 4), b = P(L, 4);
      railD = `<path class="rl" d="M${F(a[0])} ${F(a[1] - h)}L${F(b[0])} ${F(b[1] - h)}M${F(a[0])} ${F(a[1] - h / 2)}L${F(b[0])} ${F(b[1] - h / 2)}${posts}"/>`;
    }
    const frame = `${legs}${member(seg(...sT[0], ...sT[1]) + seg(...sB[0], ...sB[1]), 3.6)}${member(lattice, 2)}`;
    const rollers = []; for (let u = 18; u < L - 14; u += o.idler || 26) { const [rx, ry] = P(u, -3.6); rollers.push({ x: rx, y: ry, r: 3.4 }); }
    for (let u = 40; u < L - 30; u += 74) { const [rx, ry] = P(u, -pr * 2 + 1.8); rollers.push({ x: rx, y: ry, r: 2.6, ret: true }); }
    const pulleys = [{ x: P(0, -pr)[0], y: P(0, -pr)[1], r: pr }, { x: P(L, -pr)[0], y: P(L, -pr)[1], r: pr }];
    const top = P(0, 0), topE = P(L, 0), bot = P(0, -pr * 2), botE = P(L, -pr * 2);
    return {
      frame, rail: railD,
      belt: `M${F(top[0])} ${F(top[1])}L${F(topE[0])} ${F(topE[1])}`,
      ret: `M${F(bot[0])} ${F(bot[1])}L${F(botE[0])} ${F(botE[1])}`,
      rollers, pulleys, L, at: (u, off = 0) => P(u, off),
    };
  }
  // belt, rollers and pulleys (moving parts) for a conveyor
  function conveyorMoving(c) {
    // idlers are a few pixels across on screen, so they are drawn static (their turning could not be
    // seen and would repaint the whole belt every frame); the head and tail pulleys turn at belt speed
    const roller = q => `<circle class="o" cx="${F(q.x)}" cy="${F(q.y)}" r="${q.r}" fill="url(#a-hub)"/>`;
    const pulley = q => `<g class="roller" data-x="${F(q.x)}" data-y="${F(q.y)}" data-r="${q.r}" transform="translate(${F(q.x)} ${F(q.y)})"><circle class="o" r="${q.r}" fill="url(#a-rim)"/><circle r="${F(q.r * 0.32)}" fill="#55585d"/><path class="rmark" d="M${F(-q.r * 0.8)} 0H${F(q.r * 0.8)}M0 ${F(-q.r * 0.8)}V${F(q.r * 0.8)}"/></g>`;
    return `<path class="bl-ret" d="${c.ret}"/>${c.rollers.map(roller).join('')}${c.pulleys.map(pulley).join('')}<path class="bl" d="${c.belt}"/><path class="bl-c" d="${c.belt}"/>`;
  }

  /* ---------- VSI crusher (chapter 2) ---------- */
  // Braced four-leg structure with an operating platform and stairs; the crusher body (feed hopper,
  // cylindrical chamber with the brand band, motors with belt drives, discharge cone) sits on top.
  // origin: centre of the structure on the ground.
  function crusher(deckY = -200) {
    const legs = [-78, 78];
    const frame = `${shadow(0, 230, 10)}${[-92, 92].map(x => `<g opacity=".55">${col(x * 0.82, 0, deckY + 4, 9)}</g>`).join('')}
      ${legs.map(x => `<g>${col(x, 0, deckY + 4, 12)}</g><g>${footing(x, 30, 12)}</g>`).join('')}
      ${xbrace(-78, 78, -18, deckY / 2 - 2)}${xbrace(-78, 78, deckY / 2 - 6, deckY + 6)}
      ${beam(-96, 96, deckY + 12, 10)}
      <g>${stairs(150, -6, 104, deckY + 8)}</g>${beam(96, 132, deckY + 12, 6)}`;
    const deckRail = `${deck(-112, 132, deckY)}`;
    const body = `
      <rect class="o" fill="url(#a-steelD)" x="-104" y="${deckY - 62}" width="34" height="52" rx="3"/>${fins(-102, deckY - 56, 30, 40)}
      <rect class="o" fill="url(#a-steelD)" x="70" y="${deckY - 62}" width="34" height="52" rx="3"/>${fins(72, deckY - 56, 30, 40)}
      <path class="o" fill="url(#a-cone)" d="M-46 ${deckY + 4}L-20 ${deckY + 56}H20L46 ${deckY + 4}Z"/>
      <rect class="o" fill="url(#a-steelD)" x="-16" y="${deckY + 56}" width="32" height="34"/>
      <path class="o" fill="url(#a-vessel)" d="M-64 ${deckY - 2}V${deckY - 150}H64V${deckY - 2}Q0 ${deckY + 10} -64 ${deckY - 2}Z"/>
      <path class="o" fill="url(#a-paintV)" d="M-64 ${deckY - 124}H64V${deckY - 112}H-64Z"/>
      <path class="hl" d="M-64 ${deckY - 92}H64M-64 ${deckY - 40}H64" style="stroke:#8d8a85;stroke-opacity:.5"/>
      ${logo(-30, deckY - 96, 60, 'brand')}
      <path class="o" fill="url(#a-cone)" d="M-64 ${deckY - 150}L-88 ${deckY - 190}H88L64 ${deckY - 150}Z"/>
      <path class="o" fill="#f7f6f3" d="M-88 ${deckY - 190}H88V${deckY - 196}H-88Z"/>
      <path class="o" fill="#3a3c40" d="M-70 ${deckY - 190}L-50 ${deckY - 160}H50L70 ${deckY - 190}Z" opacity=".45"/>`;
    // belt drives on the motors (pulleys turn while the crusher runs)
    const drives = [-87, 87].map(x => ({ x, y: deckY - 36, r: 9 }));
    const topDeck = `${deck(-100, 100, deckY - 196 + 2, false)}${rail(-100, 100, deckY - 196 - 3, 22)}`;
    return { frame, deckRail, body, topDeck, drives, hopper: [0, deckY - 186], discharge: [0, deckY + 90], deckY };
  }
  function fins(x, y, w, h) { let d = ''; for (let i = 4; i < h; i += 5) d += `M${F(x + 3)} ${F(y + i)}H${F(x + w - 3)}`; return `<path d="${d}" stroke="#1b1c1f" stroke-opacity=".55" stroke-width="1.6"/>`; }

  /* ---------- vibrating screen (chapter 2) ---------- */
  // Inclined three-deck screen box on four coil springs over a braced frame. The box (with its decks)
  // is one group so it can oscillate; springs are separate so they can flex. origin: frame centre, ground.
  function screen(base = -190) {
    const len = 300, hh = 62, ang = 13 * Math.PI / 180, c = Math.cos(ang), s = Math.sin(ang);
    const P = (u, v) => [-150 + u * c, base + u * s - v]; // u along the box, v up
    const corners = [P(0, 0), P(len, 0), P(len, hh), P(0, hh)];
    const box = `
      <path class="o" fill="url(#a-plate)" d="${poly(corners)}"/>
      ${[0.25, 0.5, 0.75].map(f => `<path class="seam" d="${seg(...P(len * f, 0), ...P(len * f, hh))}"/>`).join('')}
      <path class="seam" d="${seg(...P(0, hh * 0.5), ...P(len, hh * 0.5))}"/>
      ${bolts(...P(6, 6), ...P(len - 6, 6), 9)}${bolts(...P(6, hh - 6), ...P(len - 6, hh - 6), 9)}
      <path class="rl" style="stroke-width:3" d="${seg(...P(-4, hh + 4), ...P(len + 6, hh + 4))}"/>
      <path class="o" fill="url(#a-steelD)" d="${poly([P(-14, 4), P(10, 4), P(10, hh + 12), P(-14, hh + 30)])}"/>
      ${[0, 1, 2].map(i => `<path class="o" fill="url(#a-mesh)" d="${poly([P(len - 2, 8 + i * 18), P(len + 18, 8 + i * 18 - 3), P(len + 18, 14 + i * 18 - 3), P(len - 2, 14 + i * 18)])}"/>`).join('')}
      <g transform="translate(${F(P(len * 0.42, hh * 0.5)[0])} ${F(P(len * 0.42, hh * 0.5)[1])}) rotate(${F(ang * 57.3)})">${logo(-26, -11, 52, 'brand')}</g>
      <rect class="o" fill="url(#a-paint)" x="${F(P(18, hh - 22)[0])}" y="${F(P(18, hh - 22)[1])}" width="14" height="18" rx="1.5" transform="rotate(${F(ang * 57.3)} ${F(P(18, hh - 22)[0])} ${F(P(18, hh - 22)[1])})"/>`;
    const springSeat = [P(len * 0.12, -2), P(len * 0.88, -2)];
    const frame = `${shadow(0, 360, 10)}
      ${col(-120, 0, springSeat[0][1] + 26, 12)}${col(140, 0, springSeat[1][1] + 26, 12)}${col(-60, 0, springSeat[0][1] + 40, 9)}${col(84, 0, springSeat[1][1] + 34, 9)}
      ${[-120, 140].map(x => footing(x, 30, 12)).join('')}
      ${beam(-134, -40, springSeat[0][1] + 34, 9)}${beam(60, 154, springSeat[1][1] + 30, 9)}
      ${xbrace(-120, -60, -20, springSeat[0][1] + 44, 3)}${xbrace(84, 140, -20, springSeat[1][1] + 38, 3)}
      ${beam(-120, 140, -70, 8)}
      <path class="o" fill="url(#a-cone)" d="M-6 ${F(base + 76)}H112L76 ${F(base + 120)}H34Z"/><rect class="o" fill="url(#a-steelD)" x="44" y="${F(base + 120)}" width="22" height="20"/>`;
    const springs = springSeat.map(([x, y]) => ({ x, y, h: 30 }));
    return { box, frame, springs, feed: P(0, hh + 6), deck: (u, v = 10) => P(u, v), lips: [0, 1, 2].map(i => P(len + 14, 12 + i * 18)), len, ang };
  }
  const spring = h => { let d = 'M-9 0'; for (let i = 1; i <= 8; i++) d += `L${i % 2 ? 9 : -9} ${F(-h * i / 8)}`; return `<path class="spring" d="${d}"/>`; };

  /* ---------- sample card (chapter 2): a tray with a drawn pile of one grade ---------- */
  // (its labels are set by the engine, at a constant reading size)
  function sampleCard(w, h) {
    return `<rect x="3" y="6" width="${w}" height="${h}" rx="10" fill="#141416" fill-opacity=".06"/><rect class="card-bg" width="${w}" height="${h}" rx="10"/><path class="seam" d="M10 ${F(h - 44)}H${w - 10}"/>`;
  }

  /* ---------- batching plant (chapter 4) ---------- */
  // Four aggregate/sand bins over a gathering belt; inclined belt to the mixing tower (weigh hoppers,
  // water tank, twin-shaft mixer, discharge chute); two cement silos with screw conveyors; control
  // cabin. origin: bins' left foot on the ground. Returns static, moving parts and process anchors.
  function plant() {
    const B = { x0: 0, w: 128, n: 4, top: -330, gate: -228 }, bx = i => B.x0 + 64 + i * B.w;
    let bins = '';
    for (let i = 0; i < B.n; i++) {
      const x = bx(i);
      bins += `<path class="o" fill="url(#a-panel)" d="M${x - 62} ${B.top}H${x + 62}V${B.top + 46}H${x - 62}Z"/>
        <path class="o" fill="url(#a-cone)" d="M${x - 62} ${B.top + 46}L${x - 16} ${B.gate - 16}H${x + 16}L${x + 62} ${B.top + 46}Z"/>
        <path class="seam" d="M${x - 62} ${B.top + 20}H${x + 62}"/>`;
    }
    const frameBins = `${shadow(256, 560, 12)}${[0, 1, 2, 3, 4].map(i => col(B.x0 + i * B.w, 0, B.top + 4, 10)).join('')}
      ${[0, 1, 2, 3, 4].map(i => footing(B.x0 + i * B.w, 26, 10)).join('')}
      ${beam(-8, 520, B.top + 52, 9)}${beam(-8, 520, -150, 9)}${beam(-8, 520, -60, 7)}
      ${[0, 1, 2, 3].map(i => xbrace(B.x0 + i * B.w, B.x0 + (i + 1) * B.w, -64, -146, 2.6)).join('')}`;
    const gates = [0, 1, 2, 3].map(i => ({ x: bx(i), y: B.gate - 12 }));
    const gather = conveyor(-6, -196, 520, -196, { gy: 0, depth: 10, idler: 22 });
    const incline = conveyor(520, -196, 884, -604, { gy: 0, legs: [0.3, 0.58], rail: true, depth: 16 });
    // mixing tower
    const T = { x0: 830, x1: 1150 };
    const tower = `${shadow(990, 380, 12)}${[850, 930, 1050, 1130].map(x => col(x, 0, -540, x === 930 || x === 1050 ? 10 : 12)).join('')}${[850, 930, 1050, 1130].map(x => footing(x, 28, 12)).join('')}
      ${xbrace(850, 930, -30, -180, 2.8)}${xbrace(1050, 1130, -30, -180, 2.8)}${xbrace(850, 930, -200, -330, 2.6)}${xbrace(1050, 1130, -200, -330, 2.6)}
      ${deck(836, 1146, -330)}${deck(836, 1146, -440)}${deck(896, 1160, -540)}
      ${stairs(812, -10, 850, -330)}
      <g>${box(760, -96, 70, 92, 'url(#a-corr)', 6)}<rect class="o" fill="url(#a-glass)" x="768" y="-82" width="54" height="22"/><path class="o" d="M795 -82V-60" stroke-width="1"/></g>`;
    const headChute = '<path class="o" fill="url(#a-steelD)" d="M872 -626H906L944 -548L930 -540L894 -604H872Z"/><path class="o" fill="#2f3135" d="M906 -626L944 -548" />';
    const hoppers = headChute + `${[935, 1045].map(x => `<path class="o" fill="url(#a-cone)" d="M${x - 46} -530H${x + 46}V-506L${x + 12} -458H${x - 12}L${x - 46} -506Z"/><rect class="o" fill="#3e7a5e" x="${x - 10}" y="-458" width="20" height="14"/>`).join('')}
      <path class="o" fill="url(#a-vessel)" d="M1010 -540V-640Q1040 -652 1070 -640V-540Z"/><path class="o" fill="#f6f5f2" d="M1010 -640Q1040 -652 1070 -640Q1040 -628 1010 -640Z"/>
      <path class="pipe" d="M1074 -600H1092V-420H1062"/>`;
    const mixer = `<path class="o" fill="url(#a-vessel)" d="M890 -426H1090V-336H890Z"/><path class="o" fill="url(#a-paintV)" d="M890 -418H1090V-408H890Z"/>
      ${logo(950, -394, 80, 'brand')}
      <path class="o" fill="url(#a-cone)" d="M900 -336H1080L1018 -268H962Z"/><path class="o" fill="url(#a-cone)" d="M968 -268H1012L1004 -232H976Z"/>
      <rect class="o" fill="url(#a-steelD)" x="1092" y="-418" width="30" height="40" rx="3"/>${fins(1094, -414, 26, 34)}`;
    const mixerDrive = { x: 1107, y: -372, r: 8 };
    // cement silos
    const silo = x => `${shadow(x, 120, 8)}${[x - 44, x + 44].map(lx => col(lx, 0, -230, 10)).join('')}${xbrace(x - 44, x + 44, -20, -150, 2.6)}${[x - 44, x + 44].map(lx => footing(lx, 22, 10)).join('')}
      <path class="o" fill="url(#a-vessel)" d="M${x - 56} -230V-660H${x + 56}V-230Z"/><path class="o" fill="url(#a-cone)" d="M${x - 56} -230L${x - 12} -150H${x + 12}L${x + 56} -230Z"/>
      <path class="seam" d="M${x - 56} -330H${x + 56}M${x - 56} -430H${x + 56}M${x - 56} -530H${x + 56}"/>
      ${logo(x - 34, -560, 68, 'brand')}${ladder(x + 66, -236, -664, true)}
      ${deck(x - 60, x + 60, -660, false)}${rail(x - 60, x + 60, -665, 22)}<rect class="o" fill="#c9cdd1" x="${x - 12}" y="-688" width="24" height="18"/>`;
    const silos = silo(1290) + silo(1430);
    const screws = [[1290, -150, 1080, -470], [1430, -150, 1100, -490]];
    const chute = { x: 990, y: -232 };
    return {
      bins, frameBins, gates, gather, incline, tower, hoppers, mixer, mixerDrive, silos, screws, chute,
      binTops: [0, 1, 2, 3].map(i => [bx(i), B.top]), feed: [928, -532], tankOut: [1062, -420], waterTop: [1092, -600],
    };
  }

  /* ---------- vehicles (heavy 10x4 trucks, after the approved reference photos) ---------- */
  // Wheel: tyre with tread blocks and sidewall, a silver ten-stud rim and a dark hub cap. Drawn at its
  // own origin so it can turn in place.
  function wheel(r = 23) {
    let tread = ''; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, b = a + TAU / 52; tread += 'M' + F(Math.cos(a) * r * 0.9) + ' ' + F(Math.sin(a) * r * 0.9) + 'L' + F(Math.cos(a) * r) + ' ' + F(Math.sin(a) * r) + 'L' + F(Math.cos(b) * r) + ' ' + F(Math.sin(b) * r) + 'L' + F(Math.cos(b) * r * 0.9) + ' ' + F(Math.sin(b) * r * 0.9) + 'Z'; }
    let studs = ''; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; studs += '<circle cx="' + F(Math.cos(a) * r * 0.31) + '" cy="' + F(Math.sin(a) * r * 0.31) + '" r="' + F(r * 0.045) + '" fill="#4d5055"/>'; }
    return '<circle class="o" r="' + r + '" fill="url(#a-tyre)"/><path d="' + tread + '" fill="#141516"/><circle r="' + F(r * 0.8) + '" fill="none" stroke="#3b3d41" stroke-width="' + F(r * 0.05) + '"/>'
      + '<circle class="o" r="' + F(r * 0.55) + '" fill="url(#a-rim)"/><circle r="' + F(r * 0.47) + '" fill="none" stroke="#9a9ea3" stroke-width="' + F(r * 0.04) + '"/>' + studs
      + '<circle r="' + F(r * 0.2) + '" fill="#26282b"/><circle r="' + F(r * 0.09) + '" fill="#55585d"/>';
  }
  const wheelG = (x, r) => '<g class="wheel" data-x="' + x + '" data-r="' + r + '" transform="translate(' + x + ' ' + (-r) + ')">' + wheel(r) + '</g>';
  // axle positions shared by both trucks: a tridem at the rear, a tandem under the cab (10x4)
  const AXLES = [50, 110, 170, 290, 346], WR = 23;

  // Modern heavy-duty cab, facing right; x0 = back of the cab. White panels with an OM Group orange
  // swoosh, the official logo on the door, black lower section, step, bumper, mirror, roof deflector.
  function cabin(x0) {
    const x1 = x0 + 98;
    return '<path class="o" fill="#2a2c30" d="M' + x0 + ' -120H' + (x0 + 12) + 'V-46H' + x0 + 'Z"/>'
      + '<path d="M' + (x0 + 3) + ' -112V-52M' + (x0 + 6) + ' -112V-52M' + (x0 + 9) + ' -112V-52" stroke="#45474c" stroke-width="1"/>'
      + '<path class="o" fill="url(#a-cabw)" d="M' + (x0 + 12) + ' -46V-112Q' + (x0 + 12) + ' -122 ' + (x0 + 22) + ' -122H' + (x1 - 16) + 'Q' + (x1 - 6) + ' -122 ' + (x1 - 4) + ' -112L' + (x1 + 1) + ' -62L' + (x1 + 2) + ' -46Z"/>'
      + '<path class="o" fill="#2a2c30" d="M' + (x0 + 22) + ' -122L' + (x0 + 30) + ' -129H' + (x1 - 26) + 'L' + (x1 - 18) + ' -122Z"/><rect fill="#f5a623" x="' + (x1 - 30) + '" y="-132" width="7" height="3" rx="1"/>'
      + '<path class="o" fill="url(#a-glass)" d="M' + (x0 + 22) + ' -111H' + (x0 + 38) + 'V-88H' + (x0 + 22) + 'Z"/>'
      + '<path class="seam" d="M' + (x0 + 43) + ' -116V-38M' + (x0 + 43) + ' -116H' + (x1 - 10) + '"/>'
      + '<path class="o" fill="url(#a-glass)" d="M' + (x0 + 47) + ' -111H' + (x1 - 17) + 'L' + (x1 - 11) + ' -92H' + (x0 + 47) + 'Z"/>'
      + '<path d="M' + (x0 + 52) + ' -108L' + (x1 - 24) + ' -96" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>'
      // door: grab handle at the rear edge; the official logo centred in the panel below the window
      + '<rect class="o" fill="#3a3c40" x="' + (x0 + 45.4) + '" y="-82" width="2.4" height="10" rx="1"/>'
      + '<path fill="' + ORANGE + '" d="M' + (x0 + 13) + ' -58Q' + (x0 + 60) + ' -60 ' + (x1 + 2) + ' -50V-47Q' + (x0 + 60) + ' -55 ' + (x0 + 13) + ' -54Z"/>'
      + logo(x0 + 51, -86.5, 40, 'brand')
      + '<path class="o" fill="#2a2c30" d="M' + (x0 + 12) + ' -46H' + (x1 + 3) + 'V-10H' + (x0 + 30) + 'V-24H' + (x0 + 12) + 'Z"/>'
      + '<path d="M' + (x1 - 12) + ' -34H' + (x1 + 2) + 'M' + (x1 - 12) + ' -22H' + (x1 + 2) + '" stroke="#8a8d92" stroke-width="1.6"/>'
      + '<rect class="o" fill="#f2efe6" x="' + (x1 - 3) + '" y="-44" width="6" height="8" rx="1.2"/><rect fill="#f5a623" x="' + (x1 - 3) + '" y="-50" width="5" height="3" rx="1"/>'
      + '<path d="M' + (x1 - 8) + ' -112L' + (x1 + 3) + ' -118" stroke="#2a2c30" stroke-width="2"/><rect class="o" fill="#2a2c30" x="' + (x1 + 1) + '" y="-120" width="6" height="28" rx="2"/><rect class="o" fill="#2a2c30" x="' + (x1 - 1) + '" y="-90" width="5" height="9" rx="1.5"/>'
      + '<path d="M' + (x0 + 70) + ' -129L' + (x0 + 64) + ' -140" stroke="#2a2c30" stroke-width=".9"/>';
  }
  // Chassis under both trucks: frame rail, air tanks, chrome fuel tank and perforated step box, rear
  // lamp and under-run bar. Fenders are separate so they can be drawn over the wheels.
  function chassis(o = {}) {
    const tank = o.tank || [200, 252];
    let dots = ''; for (let y = -40; y < -20; y += 3) for (let x = tank[1] + 3; x < tank[1] + 17; x += 3) dots += 'M' + x + ' ' + y + 'h.8';
    return {
      under: '<rect class="o" fill="url(#a-steelD)" x="2" y="-54" width="396" height="11"/><path class="hl" d="M4 -52H396"/>'
        + '<rect class="o" fill="#3a3c40" x="186" y="-43" width="30" height="10" rx="5"/>'
        + '<rect class="o" fill="url(#a-chrome)" x="' + tank[0] + '" y="-43" width="' + (tank[1] - tank[0]) + '" height="24" rx="6"/><path d="M' + (tank[0] + 12) + ' -43V-19M' + (tank[1] - 12) + ' -43V-19" stroke="#6f7378" stroke-width="2"/>'
        + '<rect class="o" fill="#c9ccd0" x="' + (tank[1] + 1) + '" y="-43" width="18" height="24"/><path d="' + dots + '" stroke="#55585d" stroke-width="1.2"/>'
        + '<rect class="o" fill="#2a2c30" x="-2" y="-52" width="10" height="34"/><rect fill="#d6302a" x="-1" y="-48" width="6" height="7" rx="1"/><rect fill="' + ORANGE + '" x="-1" y="-39" width="6" height="3"/>'
        + '<path class="o" fill="#2a2c30" d="M2 -18H14V-14H2Z"/>',
      fenders: [[0, 3], [3, 5]].map(([i0, i1]) => {
        const xs = AXLES.slice(i0, i1), r = WR + 5;
        let d = 'M' + (xs[0] - r) + ' ' + (-WR + 3);
        xs.forEach((x, k) => { d += 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + (-WR + 3); if (k < xs.length - 1) d += 'L' + (xs[k + 1] - r) + ' ' + (-WR + 3); });
        return '<path d="' + d + '" fill="none" stroke="#1f2023" stroke-width="5" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="#4a4c51" stroke-width="1.2"/>';
      }).join('') + '<path class="o" fill="#1f2023" d="M' + (AXLES[0] - WR - 10) + ' -26h6v24h-6Z"/>',
    };
  }

  // Transit mixer (ready-mix truck): 10x4 chassis, charcoal tapered drum with two OM Group orange
  // bands and the official logo, rear charging hopper, ladder and discharge chute, drum pedestals,
  // water tank, exhaust stack and the shared cab. The drum's seam lines are a separate group so the
  // engine can turn the drum. origin: rear of the chassis on the ground; faces right.
  function transitMixer(id = 'tm') {
    const D = 'M50 -147Q100 -160 150 -151Q205 -141 253 -108Q259 -82 253 -57Q205 -50 150 -54Q100 -60 50 -97Q43 -122 50 -147Z';
    const C = chassis({ tank: [196, 246] });
    const drum = '<g class="drum"><path class="o" fill="url(#a-drumD)" d="' + D + '"/>'
      + '<clipPath id="a-drum-' + id + '"><path d="' + D + '"/></clipPath><g clip-path="url(#a-drum-' + id + ')">'
      + '<g class="stripes">' + Array.from({ length: 14 }, (_, i) => '<path d="M' + (-40 + i * 26) + ' -40L' + (-6 + i * 26) + ' -170" stroke="#8a8c91" stroke-width="1.2" stroke-opacity=".35"/>').join('') + '</g>'
      + '<path fill="' + ORANGE + '" d="M64 -170H80L92 -40H76Z"/><path fill="' + ORANGE + '" d="M206 -170H222L208 -40H192Z"/>'
      + '<path d="M40 -138Q110 -152 260 -98" stroke="#ffffff" stroke-opacity=".22" stroke-width="6" fill="none"/>'
      + '<path d="M40 -64Q110 -58 260 -60" stroke="#000" stroke-opacity=".25" stroke-width="6" fill="none"/></g>'
      + '<path class="o" fill="none" d="' + D + '"/><path class="seam" d="M150 -151V-54"/>'
      + logo(112, -124, 72, 'brand') + '</g>';
    const body = C.under
      // rear pedestal (light frame carrying the drum's rear roller), front pedestal and gearbox
      + '<path class="o" fill="url(#a-plate)" d="M22 -54L28 -128H42L56 -96L52 -54Z"/><circle class="o" cx="42" cy="-110" r="5" fill="url(#a-hub)"/>'
      + '<path class="o" fill="#2f3135" d="M246 -54V-104H266V-54Z"/><rect class="o" fill="#3e4045" x="248" y="-88" width="22" height="20" rx="2"/>'
      + '<path class="o" fill="#2f3135" d="M48 -150L54 -149L56 -94L50 -96Z"/><path class="o" fill="#2f3135" d="M250 -110L258 -108V-56L252 -57Z"/>'
      // water tank (sphere) and exhaust stack with heat shield
      + '<circle class="o" cx="276" cy="-110" r="15" fill="url(#a-hub)"/><path d="M268 -120Q276 -126 284 -118" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>'
      + '<rect class="o" fill="url(#a-chrome)" x="292" y="-134" width="7" height="80" rx="2"/><path d="M293 -128V-84M298 -128V-84" stroke="#7d8187" stroke-width=".8" stroke-dasharray="1 2"/>'
      // charging hopper, chute housing, ladder and discharge chute (orange accent) at the rear
      + '<path class="o" fill="#2f3135" d="M8 -134H40V-92H14Z"/>'
      + '<path class="o" fill="#3a3c40" d="M-4 -160H56L42 -140H14Z"/><path class="o" fill="#55585d" d="M-4 -160H56V-157H-4Z"/>'
      + '<path class="o" fill="#3a3c40" d="M14 -100L-24 -64L-18 -56L22 -90Z"/><path fill="' + ORANGE + '" d="M2 -84L-20 -63L-17 -60L5 -81Z"/><path class="o" fill="url(#a-chrome)" d="M-26 -66L-18 -54L-15 -57L-23 -69Z"/>'
      + '<path d="M-10 -156V-54M-2 -156V-54" stroke="#3a3c40" stroke-width="1.6"/>' + Array.from({ length: 10 }, (_, i) => '<path d="M-10 ' + (-62 - i * 10) + 'H-2" stroke="#3a3c40" stroke-width="1.4"/>').join('')
      + '<path d="M-12 -150Q-12 -168 4 -168" stroke="#3a3c40" stroke-width="1.6" fill="none"/>'
      + cabin(304);
    return { drum, body, wheels: AXLES.map(x => wheelG(x, WR)).join(''), fenders: C.fenders, hopper: [26, -160], len: 402 };
  }

  // Tipper (dump truck): 10x4 chassis, charcoal ribbed steel dump body with an orange stripe, top
  // rail, tailgate with hinge and latch, front bulkhead canopy over the cab, hoist ram, shared cab.
  // The load is a separate group (filled by the engine); bed gives its rim. origin: rear, ground.
  function tipper() {
    const C = chassis({ tank: [200, 248] });
    const ribs = [48, 84, 120, 156, 192, 228, 262].map(x => '<path class="o" fill="url(#a-dump)" d="M' + (x - 5) + ' -118H' + (x + 5) + 'L' + (x + 3) + ' -58H' + (x - 3) + 'Z"/><path d="M' + (x - 4) + ' -116L' + (x - 2) + ' -60" stroke="#fff" stroke-opacity=".18" stroke-width="1"/>').join('');
    const body = '<path class="o" fill="url(#a-dump)" d="M14 -121H282V-58L276 -54H20L14 -60Z"/>' + ribs
      + '<path class="o" fill="#55585d" d="M12 -125H284V-118H12Z"/><path d="M14 -123.5H282" stroke="#fff" stroke-opacity=".3" stroke-width="1"/>'
      + '<path class="o" fill="#2f3135" d="M12 -64H282V-57H12Z"/>'
      + '<path fill="' + ORANGE + '" d="M22 -82H274V-78.5H22Z"/>'
      // tailgate: frame, hinge at the top, latch at the bottom; marker lamps
      + '<path class="o" fill="#3a3c40" d="M2 -126H16V-56H4Z"/><circle class="o" cx="9" cy="-121" r="3" fill="url(#a-hub)"/><rect class="o" fill="#55585d" x="1" y="-74" width="6" height="10"/><rect fill="#f5a623" x="16" y="-123" width="4" height="3"/><rect fill="#f5a623" x="268" y="-123" width="4" height="3"/>'
      // front bulkhead and canopy over the cab
      + '<path class="o" fill="url(#a-dump)" d="M276 -125L288 -146H316L314 -140H292L284 -121Z"/><path class="o" fill="#3a3c40" d="M282 -121V-56H288V-128Z"/>';
    const truck = C.under
      + '<rect class="o" fill="#1f2023" x="288" y="-118" width="9" height="66" rx="2"/><rect class="o" fill="url(#a-chrome)" x="290" y="-92" width="5" height="40"/>'
      + cabin(304);
    return { body, truck, wheels: AXLES.map(x => wheelG(x, WR)).join(''), fenders: C.fenders, bed: { x0: 16, x1: 280, y: -125 }, len: 402 };
  }

  /* ---------- tracked excavator ---------- */
  // Upper structure (house, cab, counterweight) swings on the undercarriage; boom, stick and bucket are
  // nested groups that rotate about their real pins; hydraulic cylinders are drawn by the engine
  // between pin pairs so they extend and retract with the arm. Faces right. origin: track centre, ground.
  function excavator() {
    let shoes = ''; for (let x = -128; x <= 128; x += 11) shoes += `M${x} -50V-40M${x} 0V-8`;
    const tracks = `${shadow(0, 300, 9)}<path class="o" fill="#2a2c30" d="M-128 -48H128Q150 -48 150 -24Q150 0 128 0H-128Q-150 0 -150 -24Q-150 -48 -128 -48Z"/>
      <path d="${shoes}" stroke="#141516" stroke-width="2.4"/>
      <path class="o" fill="url(#a-steelD)" d="M-118 -40H118Q132 -40 132 -24Q132 -8 118 -8H-118Q-132 -8 -132 -24Q-132 -40 -118 -40Z"/>
      ${[-96, -54, -12, 30, 72].map(x => `<circle class="o" cx="${x}" cy="-14" r="7" fill="url(#a-hub)"/>`).join('')}
      <g class="track-roller" data-x="-126" data-y="-24" data-r="18" transform="translate(-126 -24)"><circle class="o" r="18" fill="url(#a-hub)"/><path class="rmark" d="M-14 0H14M0 -14V14"/></g>
      <g class="track-roller" data-x="122" data-y="-24" data-r="20" transform="translate(122 -24)"><circle class="o" r="20" fill="url(#a-hub)"/>${Array.from({ length: 8 }, (_, i) => `<path class="rmark" d="M0 0L${F(Math.cos(i * TAU / 8) * 17)} ${F(Math.sin(i * TAU / 8) * 17)}"/>`).join('')}</g>
      <rect class="o" fill="#3a3c40" x="-36" y="-62" width="72" height="16"/>`;
    const house = `<path class="o" fill="url(#a-paint)" d="M-150 -62H118V-150H-112Q-150 -150 -150 -120Z"/>
      <path class="o" fill="url(#a-paintD)" d="M-150 -62H-74V-136H-112Q-150 -136 -150 -110Z"/>
      ${[0, 1, 2].map(i => `<rect class="o" fill="#2b2d31" x="${-142 + i * 22}" y="-128" width="16" height="22" rx="1.5"/>`).join('')}
      <path class="o" fill="url(#a-steelD)" d="M-150 -62H118V-70H-150Z"/>
      <rect class="o" fill="url(#a-steelD)" x="-60" y="-170" width="64" height="22" rx="3"/><path class="o" fill="#3a3c40" d="M-26 -170V-196H-20V-170Z"/>
      ${rail(-60, 4, -170, 18, 20)}
      <path class="o" fill="url(#a-paint)" d="M28 -150V-250H96Q112 -250 114 -232L118 -150Z"/>
      <path class="o" fill="url(#a-glass)" d="M38 -238H92Q104 -238 106 -226L110 -160H38Z"/><path class="o" d="M70 -238V-160" stroke-width="2.4"/>
      <path class="rl" d="M14 -150V-236H24M14 -194H24"/>`;
    // pins (in upper-structure coordinates): boom foot, boom→stick, stick→bucket
    const pin = { boom: [104, -132], stick: [300, -300], bucket: [52, 176] };
    const boom = `<path class="o" fill="url(#a-paint)" d="M-12 6L-16 -18Q60 -150 150 -186Q178 -192 200 -176L206 -160Q188 -150 160 -150Q90 -110 20 14Z"/><path class="hl" d="M0 -12Q70 -130 160 -170" style="stroke:#ffd0bc;stroke-opacity:.6"/>
      <circle class="o" r="10" fill="url(#a-hub)"/><circle class="o" cx="196" cy="-168" r="9" fill="url(#a-hub)"/>`;
    const stick = `<path class="o" fill="url(#a-paint)" d="M-14 -18L14 -22L62 168L40 184Z"/><path class="hl" d="M-4 -12L48 170" style="stroke:#ffd0bc;stroke-opacity:.55"/>
      <circle class="o" r="9" fill="url(#a-hub)"/><circle class="o" cx="52" cy="176" r="8" fill="url(#a-hub)"/><circle class="o" cx="-6" cy="-6" r="5" fill="url(#a-hub)"/>`;
    const bucket = `<path class="o" fill="url(#a-steelD)" d="M-10 -10L34 -16Q56 8 50 40L36 62L-30 46Q-36 20 -10 -10Z"/><path class="o" fill="#55585d" d="M-30 46L36 62L34 68L-34 52Z"/>
      ${[-26, -12, 2, 16, 30].map(x => `<path class="o" fill="#8a8d92" d="M${x} ${F(48 + (x + 30) * 0.24)}l4 10l4 -9Z"/>`).join('')}<circle class="o" r="7" fill="url(#a-hub)"/>`;
    // the house brand is separate so it can be kept readable when the upper structure swings round
    return { tracks, house, boom, stick, bucket, pin, brand: logo(-30, -128, 64, 'brand', '#ffffff'), brandCx: 2 };
  }

  /* ---------- tower crane, building ---------- */
  // Lattice mast and jib; the trolley runs along the jib and the hook hangs on a cable the engine sizes.
  function crane(h = 420, jib = 300, cjib = 90) {
    let mast = ''; for (let y = 0; y > -h + 20; y -= 22) mast += `M-9 ${y}L9 ${y - 22}M9 ${y}L-9 ${y - 22}`;
    let jl = ''; for (let x = -cjib; x < jib - 10; x += 20) jl += `M${x} ${-h}L${x + 10} ${-h - 16}L${x + 20} ${-h}`;
    const top = -h;
    return {
      fixed: `<path class="crane" d="M-9 0V${top}M9 0V${top}${mast}"/><path class="crane" d="M${-cjib} ${top}H${jib}M${-cjib + 10} ${top - 16}H${jib - 10}${jl}"/>
        <path class="crane" d="M0 ${top}V${top - 48}L${jib * 0.62} ${top - 16}M0 ${top - 48}L${-cjib + 10} ${top - 16}"/>
        <rect class="o" fill="#8e9196" x="${-cjib - 4}" y="${top - 4}" width="34" height="28"/><rect class="o" fill="url(#a-paint)" x="-14" y="${top + 8}" width="28" height="20"/>
        <rect class="o" fill="url(#a-concV)" x="-26" y="-14" width="52" height="14"/>`,
      top, jib,
    };
  }
  function building(w = 210, floors = 6, fh = 48) {
    let s = ''; const cols = 5;
    for (let f = 0; f <= floors; f++) s += `<rect class="o" fill="url(#a-conc)" x="0" y="${-f * fh - 6}" width="${w}" height="6"/>`;
    for (let c = 0; c < cols; c++) { const x = c * (w - 10) / (cols - 1); s += `<rect fill="url(#a-concV)" x="${F(x)}" y="${-floors * fh}" width="10" height="${floors * fh}" stroke="#7a766f" stroke-width=".6"/>`; }
    for (let f = 1; f <= floors; f++) for (let c = 0; c < cols - 1; c++) { const x = c * (w - 10) / (cols - 1) + 14; s += `<path d="M${F(x)} ${-f * fh + 8}h${F((w - 10) / (cols - 1) - 18)}" stroke="#c9c4bb" stroke-width="1"/>`; }
    return s + `<path class="rl" d="M0 ${-floors * fh - 6}V${-floors * fh - 26}H${w}V${-floors * fh - 6}"/>`;
  }

  /* ---------- bridge and road (chapter 7) ---------- */
  function bridge(x0, x1, deckY, gy, piers) {
    const H = 30;
    let lamps = ''; for (let x = x0 + 90; x < x1; x += 230) lamps += `<path class="lamp" d="M${x} ${deckY - H - 16}V${deckY - H - 120}Q${x} ${deckY - H - 134} ${x + 22} ${deckY - H - 132}"/><rect fill="#f3f0e6" stroke="#55585d" stroke-width=".8" x="${x + 18}" y="${deckY - H - 136}" width="12" height="5" rx="1.5"/>`;
    let par = ''; for (let x = x0 + 4; x < x1; x += 9) par += `M${x} ${deckY - H - 2}V${deckY - H - 16}`;
    const pierSVG = piers.map(px => `${shadow(px, 150, 7, gy)}
      <path class="o" fill="url(#a-concV)" d="M${px - 26} ${gy - 12}V${deckY + 38}H${px + 26}V${gy - 12}Z"/>
      <path class="o" fill="url(#a-concV)" d="M${px - 72} ${deckY + 12}H${px + 72}L${px + 62} ${deckY + 40}H${px - 62}Z"/>
      <path class="o" fill="url(#a-conc)" d="M${px - 54} ${gy}V${gy - 14}H${px + 54}V${gy}Z"/>
      <path class="hl" d="M${px - 22} ${deckY + 44}V${gy - 16}" style="stroke-opacity:.5"/>`).join('');
    return `${pierSVG}
      <path class="o" fill="url(#a-concV)" d="M${x0} ${gy}V${deckY - 4}L${x0 + 40} ${deckY - 4}L${x0 + 40} ${gy - 30}L${x0 + 70} ${gy}Z"/>
      <path class="o" fill="url(#a-conc)" d="M${x0} ${deckY - H}H${x1}V${deckY + 12}H${x0}Z"/>
      <path class="o" fill="url(#a-concD)" d="M${x0} ${deckY - 2}H${x1}V${deckY + 12}H${x0}Z"/>
      <path class="hl" d="M${x0} ${deckY - H + 2}H${x1}"/>
      ${piers.map(px => `<path class="seam" d="M${px - 70} ${deckY - H}V${deckY + 12}"/>`).join('')}
      <path class="o" fill="url(#a-asphalt)" d="M${x0} ${deckY - H - 2}H${x1}V${deckY - H + 4}H${x0}Z"/>
      <path d="${par}" stroke="#4a4d52" stroke-width="1.6"/><path class="o" fill="none" d="M${x0} ${deckY - H - 16}H${x1}M${x0} ${deckY - H - 9}H${x1}" stroke-width="1.6"/>
      ${lamps}`;
  }
  // Road cut-away: courses from sub-grade to wearing surface, each with its own drawn particles.
  function roadSection(w, seed) {
    // Photographic strata: one composite (assets/operations-motion/road-section.webp, built by _review/road-texture/build-road.js
    // from the project's own aggregate photographs) shares the scene's 640 x 174 box; each course shows its own band of it, so the
    // build-up animation, labels and markers keep working. The flat fill underneath is the fallback if the image fails to load.
    const IMG = 'assets/operations-motion/road-section.webp';
    const L = [
      { k: 'sub', y0: 0, y1: -70, fill: '#b9a47a' },
      { k: 'gsb', y0: -70, y1: -112, fill: '#7d766b' },
      { k: 'wmm', y0: -112, y1: -146, fill: '#6c6a66' },
      { k: 'conc', y0: -146, y1: -174, fill: '#c9c6c0' },
    ];
    return L.map(l => ({ k: l.k, y0: l.y0, y1: l.y1, svg: `<rect fill="${l.fill}" x="0" y="${l.y1}" width="${w}" height="${l.y0 - l.y1}"/><image href="${IMG}" x="0" y="-174" width="${w}" height="174" preserveAspectRatio="none" decoding="async"/>` }));
  }

  /* ---------- quality assurance: the material testing laboratory (QA chapter) ---------- */
  // Side elevation of a compact lab building whose glazed front shows the working interior.
  // origin: the building's left wall on the ground. interior = behind the people, front = in front.
  // Moving parts (sieve stack, impact hammer, oven glow, monitor graph) are returned separately.
  function lab() {
    const FL = -20, SK = 12, rk = (r, s, x, y) => '<g transform="translate(' + F(x) + ' ' + F(y) + ')">' + rock(r, s).svg + '</g>';
    // seven sample trays on the bench: the stockyard's grades, then M-Sand
    const grades = [1.1, 1.5, 1.8, 2.3, 3.0, 3.8];
    let trays = '';
    grades.forEach((r, i) => {
      const x = 182 + i * 15;
      trays += '<path class="o" fill="#d9dadc" d="M' + x + ' -76H' + (x + 13) + 'L' + (x + 12) + ' -70H' + (x + 1) + 'Z"/>';
      const R = rng(300 + i); for (let k = 0; k < 4 + (5 - i); k++) trays += rk(r, 330 + i * 9 + k, x + 2 + R() * 9, -75.5);
      trays += '<rect fill="' + ORANGE + '" x="' + (x + 4) + '" y="-69" width="5" height="2.4"/>';
    });
    trays += '<path class="o" fill="#d9dadc" d="M272 -76H285L284 -70H273Z"/><path fill="url(#a-sand-m)" d="M273.5 -76Q278.5 -81 283.5 -76Z"/><path fill="url(#a-grain)" d="M273.5 -76Q278.5 -81 283.5 -76Z"/><rect fill="' + ORANGE + '" x="276" y="-69" width="5" height="2.4"/>';
    const jars = [[134, '#3b3c40'], [150, '#55575c'], [166, '#7b7d82'], [182, '#a9a6a0'], [198, '#c9ae83'], [222, '#8b8986'], [238, '#45474c'], [254, '#6c6e74'], [270, '#b6ac98']].map(([x, c], i) =>
      '<rect class="o" fill="#eef3f6" fill-opacity=".9" x="' + x + '" y="' + (i < 5 ? -194 : -166) + '" width="12" height="17" rx="1.5"/><rect fill="' + c + '" x="' + (x + 1) + '" y="' + (i < 5 ? -186 : -158) + '" width="10" height="8"/><rect fill="#3a3c40" x="' + x + '" y="' + (i < 5 ? -197 : -169) + '" width="12" height="3"/>').join('');
    const interior = '<rect fill="url(#a-labwall)" x="98" y="-232" width="476" height="' + (232 + FL) + '"/>'
      + '<path d="M98 -54H574" stroke="#cfc9bf" stroke-width="1"/>' + '<rect fill="#d4cec4" x="98" y="' + (FL - 5) + '" width="476" height="5"/>'
      + [150, 316, 482].map(x => '<rect fill="#fffef8" x="' + x + '" y="-226" width="64" height="4" rx="2"/><ellipse cx="' + (x + 32) + '" cy="-214" rx="54" ry="14" fill="#fff" fill-opacity=".45"/>').join('')
      // shelves with sample jars
      + '<rect class="o" fill="url(#a-plate)" x="128" y="-177" width="96" height="4"/><rect class="o" fill="url(#a-plate)" x="216" y="-149" width="72" height="4"/>' + jars
      // bench A: balance and the sample trays
      + '<rect class="o" fill="url(#a-plate)" x="116" y="-70" width="180" height="6"/><path d="M122 -64V' + FL + 'M290 -64V' + FL + 'M122 -36H290" stroke="#6c6f74" stroke-width="3"/>'
      + '<rect class="o" fill="#ececea" x="128" y="-82" width="44" height="12" rx="2"/><rect fill="#1f2a33" x="133" y="-79" width="17" height="6" rx="1"/><rect fill="#7fdc9a" x="135" y="-77.5" width="9" height="2.6"/>'
      + '<path class="o" fill="url(#a-chrome)" d="M140 -88H166L163 -84H143Z"/><rect fill="#9a9ea3" x="151" y="-84" width="4" height="2"/>' + trays
      // aggregate impact tester (floor standing)
      + '<rect class="o" fill="url(#a-steelD)" x="298" y="' + (FL - 8) + '" width="36" height="8"/><rect class="o" fill="url(#a-chrome)" x="309" y="' + (FL - 17) + '" width="14" height="9"/>'
      + '<path d="M304 ' + (FL - 8) + 'V-152M328 ' + (FL - 8) + 'V-152" stroke="url(#a-chrome)" stroke-width="3.4"/><path d="M304 ' + (FL - 8) + 'V-152M328 ' + (FL - 8) + 'V-152" stroke="#55585d" stroke-width=".7" fill="none"/>'
      + '<rect class="o" fill="url(#a-steelD)" x="299" y="-158" width="34" height="7"/><rect class="o" fill="' + ORANGE + '" x="331" y="-156" width="8" height="4" rx="1"/>'
      // sieve shaker cabinet, clamp rods and crossbar (the whole shaker stands SK lower than it is
      // drawn here, so the top sieve is at bench height and the sample is poured at chest level)
      + '<g transform="translate(0 ' + SK + ')">'
      + '<rect class="o" fill="url(#a-panelD)" x="348" y="-44" width="64" height="' + (-FL + 24 - SK) + '" rx="2"/><rect fill="#1f2a33" x="356" y="-40" width="20" height="8" rx="1"/><rect fill="#7fdc9a" x="358" y="-38" width="10" height="3"/>'
      + '<circle class="o" cx="392" cy="-36" r="4" fill="url(#a-hub)"/><circle class="o" cx="402" cy="-36" r="3" fill="' + ORANGE + '"/>'
      + '<path d="M355 -44V-128M405 -44V-128" stroke="url(#a-chrome)" stroke-width="4"/><path d="M355 -44V-128M405 -44V-128" stroke="#55585d" stroke-width=".7" fill="none"/>'
      + '<rect class="o" fill="url(#a-steelD)" x="350" y="-134" width="60" height="7" rx="1.5"/><circle class="o" cx="380" cy="-138" r="4" fill="url(#a-hub)"/></g>'
      // drying oven
      + '<rect class="o" fill="url(#a-vessel)" x="428" y="-122" width="66" height="' + (122 + FL) + '" rx="3"/><rect class="o" fill="#e9ebec" x="432" y="-118" width="58" height="14" rx="1.5"/><rect fill="#1f2a33" x="436" y="-115" width="18" height="8" rx="1"/><rect fill="#ffb27a" x="438" y="-113" width="9" height="3"/>'
      + '<rect class="o" fill="#2a2f35" x="437" y="-98" width="48" height="44" rx="2"/><path d="M439 -86H483M439 -70H483" stroke="#596068" stroke-width="1.4"/><rect fill="#a9a6a0" x="444" y="-91" width="16" height="4"/><rect fill="#6c6e74" x="462" y="-75" width="16" height="4"/>'
      + '<rect fill="#cfd2d6" x="488" y="-92" width="3" height="26" rx="1.5"/>'
      // workstation: desk, monitor, keyboard
      + '<rect class="o" fill="url(#a-plate)" x="500" y="-70" width="70" height="6"/><path d="M506 -64V' + FL + 'M564 -64V' + FL + '" stroke="#6c6f74" stroke-width="3"/>'
      + '<rect class="o" fill="#2a2c30" x="512" y="-114" width="50" height="34" rx="2"/><rect fill="#16202a" x="515" y="-111" width="44" height="28"/><path d="M535 -80V-72M527 -72H545" stroke="#3a3c40" stroke-width="3"/><rect class="o" fill="#d9dadc" x="508" y="-74" width="26" height="3" rx="1"/>'
      + '<path d="M519 -88H555M519 -104V-88" stroke="#3d4a56" stroke-width=".8"/><path d="M519 -95Q530 -97 537 -102Q546 -107 555 -108" stroke="#33414d" stroke-width="6" fill="none" stroke-linecap="round"/>';
    // the sieve stack (on the shaker): pan, five sieves, lid — drawn as a cut-away so the material shows
    let sieves = '<path class="o" fill="url(#a-chrome)" d="M357 -50H403V-45H357Z"/>';
    for (let i = 0; i < 5; i++) {
      const y = -50 - (i + 1) * 10;
      sieves += '<rect fill="#f4f4f2" fill-opacity=".85" x="358" y="' + y + '" width="44" height="10"/><path class="o" fill="url(#a-chrome)" d="M356 ' + y + 'H360V' + (y + 10) + 'H356ZM400 ' + y + 'H404V' + (y + 10) + 'H400Z"/>'
        + '<path d="M360 ' + (y + 9.4) + 'H400" stroke="#8d9196" stroke-width="1" stroke-dasharray="1.2 ' + (0.8 + i * 0.5) + '"/><path d="M356 ' + y + 'H404" stroke="#cfd2d6" stroke-width="1.4"/>';
    }
    // material that will appear on each mesh (index 0 = top sieve, coarsest) and in the pan (index 5)
    const material = [3.2, 2.5, 1.9, 1.4, 1.0].map((r, i) => { const y = -50 - (5 - i) * 10 + 9, R = rng(410 + i); let s = ''; for (let k = 0; k < 6 + i * 2; k++) s += rk(r, 420 + i * 13 + k, 363 + R() * 34, y); return s; });
    material.push('<path fill="url(#a-sand-m)" d="M362 -50Q380 -55 398 -50Z"/><path fill="url(#a-grain)" d="M362 -50Q380 -55 398 -50Z"/>');
    const hammer = '<rect class="o" fill="url(#a-steelD)" x="306" y="-148" width="20" height="14" rx="1.5"/><rect fill="' + ORANGE + '" x="306" y="-139" width="20" height="2"/>';
    const glow = '<rect x="437" y="-98" width="48" height="44" rx="2" fill="url(#a-ovenglow)"/>';
    const graph = 'M519 -90Q528 -91 534 -97Q543 -104 555 -106';
    // the building: plinth, cladding, glazing, door, roof, signboard
    const mull = [100, 572].map(x => '<rect class="o" fill="#2c2e32" x="' + (x - 2.5) + '" y="-216" width="5" height="176"/>').join('');
    const front = shadow(290, 660, 11) + '<rect class="o" fill="url(#a-conc)" x="0" y="' + FL + '" width="580" height="' + (-FL) + '"/>'
      + '<path class="o" fill="url(#a-corr)" fill-rule="evenodd" d="M0 ' + FL + 'V-236H100V' + FL + 'Z M18 ' + FL + 'V-150H84V' + FL + 'Z"/>'
      + '<rect class="o" fill="url(#a-corr)" x="98" y="-236" width="482" height="20"/><rect class="o" fill="url(#a-corr)" x="98" y="-40" width="482" height="' + (40 + FL) + '"/><rect class="o" fill="url(#a-corr)" x="572" y="-236" width="8" height="' + (236 + FL) + '"/>'
      + '<rect fill="#dfe9ef" fill-opacity=".14" x="100" y="-216" width="472" height="176"/>'
      + '<path d="M130 -216L90 -40M150 -216L110 -40M300 -216L260 -40M318 -216L278 -40M470 -216L430 -40" stroke="#fff" stroke-opacity=".12" stroke-width="5"/>' + mull
      + '<rect class="o" fill="url(#a-concV)" x="96" y="-42" width="480" height="5"/><rect class="o" fill="#2c2e32" x="96" y="-219" width="480" height="5"/>'
      + '<rect class="o" fill="#2c2e32" x="16" y="-152" width="70" height="' + (152 + FL) + '"/><rect fill="#c7d6df" fill-opacity=".55" x="21" y="-147" width="60" height="' + (127 + FL + 20) + '"/><path d="M34 -147L22 -40M48 -147L36 -40" stroke="#fff" stroke-opacity=".35" stroke-width="4"/><rect fill="#cfd2d6" x="70" y="-96" width="3" height="20" rx="1.5"/>'
      + '<rect class="o" fill="url(#a-steelH)" x="6" y="-164" width="92" height="8"/><path d="M12 -156L22 -146M92 -156L82 -146" stroke="#3a3c40" stroke-width="2"/>'
      + '<rect class="o" fill="url(#a-steelH)" x="-6" y="-246" width="592" height="10"/><rect class="o" fill="#e9e6e0" x="-6" y="-262" width="592" height="16"/><path d="M-6 -254H586" stroke="' + ORANGE + '" stroke-width="3"/>'
      + '<rect class="o" fill="url(#a-steelD)" x="470" y="-286" width="62" height="24" rx="2"/>' + fins(472, -284, 58, 20)
      + signboard(156, 424, -326, -276);
    return { interior, front, sieves, material, hammer, glow, graph, FL, SK, door: 52, balance: [153, -88], sieveTop: [380, -100 + SK], screen: [537, -96] };
  }
  // The laboratory's identification board, centred on the building: a satin ivory panel in a slim
  // aluminium frame, carried on two steel posts with roof base plates and edge clamps. The official
  // logo sits on the left; the laboratory name beside it in graphite, with an orange base accent.
  function signboard(x0, x1, y0, y1) {
    const roof = -262, posts = [x0 + 40, x1 - 40], W = x1 - x0;
    // the logo keeps its size with 8 units of clear space above and below inside the face (the face runs
    // from the frame to the orange base accent); the two-line name is centred on the logo
    const lw = 27 * window.OPM_LOGO.brand.w / window.OPM_LOGO.brand.h, tx = x0 + 20 + lw + 16, tw = x1 - 16 - tx, cy = (y0 + 2 + y1 - 5) / 2;
    return shadow((x0 + x1) / 2, W + 20, 3.4, roof, 0.75)
      + posts.map(x => '<rect class="o" fill="url(#a-steelV)" x="' + (x - 2.5) + '" y="' + (y0 + 4) + '" width="5" height="' + (roof - y0 - 4) + '"/><rect class="o" fill="url(#a-steelD)" x="' + (x - 8) + '" y="' + (roof - 3) + '" width="16" height="3" rx="1"/>').join('')
      // panel depth (lower and right edges), a faint drop shadow, frame and satin face
      + '<rect fill="#141416" fill-opacity=".09" x="' + (x0 + 2) + '" y="' + (y0 + 3) + '" width="' + W + '" height="' + (y1 - y0) + '" rx="3"/>'
      + '<path fill="#aaa69d" d="M' + x1 + ' ' + (y0 + 2) + 'l2.2 1.4V' + (y1 + 1.4) + 'l-2.2 -1.4Z"/><path fill="#c3bfb6" d="M' + (x0 + 2) + ' ' + y1 + 'l2.2 1.4H' + (x1 + 2.2) + 'l-2.2 -1.4Z"/>'
      + '<rect class="o" fill="#cfccc5" x="' + x0 + '" y="' + y0 + '" width="' + W + '" height="' + (y1 - y0) + '" rx="2.5"/>'
      + '<rect fill="url(#a-signface)" x="' + (x0 + 2) + '" y="' + (y0 + 2) + '" width="' + (W - 4) + '" height="' + (y1 - y0 - 4) + '" rx="1.5"/>'
      + '<path d="M' + (x0 + 3) + ' ' + (y0 + 2.6) + 'H' + (x1 - 3) + '" stroke="#fff" stroke-width=".9"/><path d="M' + (x0 + 3) + ' ' + (y1 - 2.4) + 'H' + (x1 - 3) + '" stroke="#bfbbb2" stroke-width=".6"/>'
      + '<rect fill="' + ORANGE + '" x="' + (x0 + 2) + '" y="' + (y1 - 5) + '" width="' + (W - 4) + '" height="1.8"/>'
      + [[x0 + 5, y0 + 5], [x1 - 5, y0 + 5], [x0 + 5, y1 - 8.5], [x1 - 5, y1 - 8.5]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r=".9" fill="#b1ada4"/>').join('')
      // edge clamps where the posts carry the board
      + posts.map(x => '<rect class="o" fill="url(#a-steelD)" x="' + (x - 5) + '" y="' + (y1 - 1.5) + '" width="10" height="4.5" rx="1"/><rect class="o" fill="url(#a-steelD)" x="' + (x - 5) + '" y="' + (y0 - 3) + '" width="10" height="4.5" rx="1"/>').join('')
      + logo(x0 + 20, cy - 13.5, lw, 'brand')
      + '<path d="M' + (tx - 8) + ' ' + (cy - 12) + 'V' + (cy + 12) + '" stroke="#cbc7be" stroke-width=".8"/>'
      + '<text x="' + tx + '" y="' + F(cy - 1.6) + '" textLength="' + F(tw) + '" lengthAdjust="spacing" fill="#2b2d31" font-size="12" font-weight="700" font-family="var(--sans)">MATERIAL TESTING</text>'
      + '<text x="' + tx + '" y="' + F(cy + 10.3) + '" fill="#5b5e63" font-size="9.6" font-weight="600" letter-spacing="3.6" font-family="var(--sans)">LABORATORY</text>';
  }

  /* ---------- technician (QA chapter) ---------- */
  // An adult quality-control technician, drawn after the approved OM Group character reference: white safety
  // helmet with the official logo, black wraparound safety glasses, a white work jacket (stand-up collar over a
  // dark undershirt, centre zip, orange bands across the chest and above the hem, orange piping down from the
  // shoulders, the OM Group logo on the left chest, an orange ID card on the right), charcoal cargo trousers
  // (side pocket, knee seams, orange-silver-orange bands at the shin), dark grey work gloves and black safety
  // boots with orange soles. Adult proportions: about 7.4 heads to the crown, shoulders
  // at 0.82 of the height, the wrist level with the crotch. Facing +x (right).
  // Every part is drawn in its own frame about its joint, so the engine can pose the figure: limbs point down
  // (+y) from their joint — thigh hip→knee (L.thigh), shin knee→ankle (L.shin), upper arm shoulder→elbow
  // (L.upper), forearm elbow→wrist (L.fore), hand from the wrist (the fist closes round `grip`); torso from
  // the hip centre (shoulder joints L.sh above it, the neck base L.neck); head from the neck base.
  // `dark` adds a shade (class "shd") over a limb so the far-side limbs read behind the near ones.
  function technician(id = 'tc') {
    const L = { thigh: 25, shin: 26, upper: 21, fore: 17, ankle: 4, grip: [0.3, 5.6], sh: 36, neck: 37.6 };
    const shade = (d, o = 0.22) => '<path class="shd" fill="#000" fill-opacity="' + o + '" d="' + d + '"/>';
    const refl = (d) => '<path fill="url(#a-refl)" stroke="#8e9297" stroke-width=".35" d="' + d + '"/>';
    const ln = (d, c, w, o = 1) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '"' + (o !== 1 ? ' stroke-opacity="' + o + '"' : '') + ' stroke-linecap="round"/>';
    // legs: tapered thigh (hip 13.3 → knee 9.2), cargo pocket with flap and snap, knee seam; shin with a
    // reflective band below the knee; heavy safety boot with toe cap, laces, orange midsole and heel tab
    const TH = 'M-6.6 -1C-7.7 6 -6.3 15 -4.7 25.6L4.5 25.6C5.7 18 7.5 8 6.7 -1Z';
    const thigh = dark => '<path class="o" fill="url(#a-trouser)" d="' + TH + '"/>'
      + ln('M5.8 2Q6.8 10 5.2 21', '#5c5f65', 0.9, 0.7) + ln('M0.4 0Q0.9 12 0 25', '#17181b', 0.6, 0.35)
      + '<path fill="#2c2e33" stroke="#151618" stroke-width=".5" d="M-3.6 9.4H2.6L2.8 17.2Q-0.4 18 -3.8 17.2Z"/>'
      + '<path fill="#36383d" stroke="#151618" stroke-width=".5" d="M-3.9 8.6H2.9L2.7 11H-3.7Z"/><circle cx="-0.5" cy="9.9" r=".45" fill="#6b6e74"/>'
      + ln('M-4.9 22.4Q0 23.6 4.7 22.2', '#17181b', 0.7, 0.55) + ln('M-5.6 3Q-6.4 8 -5.8 13', '#17181b', 0.7, 0.45) + (dark ? shade(TH) : '');
    const SH = 'M-4.7 -0.5C-5.9 6 -5.1 14 -3.9 26.5L3.9 26.5C4.3 18 4.9 8 4.5 -0.5Z';
    const shin = dark => '<path class="o" fill="url(#a-trouser)" d="' + SH + '"/>'
      + ln('M-4.5 3.4Q0 4.6 4.4 3.2', '#17181b', 0.7, 0.5) + ln('M4 2Q4.6 12 3.8 24', '#5c5f65', 0.8, 0.6)
      + '<path fill="' + ORANGE + '" d="M-5.4 8.4L4.6 8.1L4.6 14L-5.1 14.3Z"/>' + refl('M-5.3 9.7L4.6 9.4L4.5 12.7L-5 13Z') + ln('M-3.9 21.6Q0 22.8 3.9 21.4', '#17181b', 0.7, 0.45) + (dark ? shade(SH) : '');
    const BT = 'M-4.8 -7L3.9 -7L4.4 -2.6C8 -2.3 11.8 -1 12.9 1.2L13.1 2.6L-5.2 2.6L-5.4 -1.6Z';
    const boot = dark => '<path class="o" fill="url(#a-boot)" d="' + BT + '"/><path fill="#26272a" d="M-4.8 -7H3.9V-5.6H-4.8Z"/>'
      + '<path fill="#2c2d31" d="M7.6 -1.9C10.6 -1.3 12.5 -0.2 12.9 1.2L13 2.2H7.4Q7 0 7.6 -1.9Z"/>' + ln('M8.4 -1.2C10.6 -0.8 12 0 12.4 1', '#6b6e74', 0.6)
      + '<path fill="#0f1011" d="M-5.6 2.2H13.4Q13.6 4.2 12.6 4.8H-5.6Z"/><path d="M-5.4 2.4H13.2" stroke="' + ORANGE + '" stroke-width=".9"/>'
      + '<path d="M-4 4.8V3.6M-1 4.8V3.6M2 4.8V3.6M5 4.8V3.6M8 4.8V3.6M11 4.8V3.6" stroke="#2b2c2f" stroke-width=".7"/>'
      + ln('M1.6 -6.2L4.2 -5.6M1.8 -4.6L4.4 -4M2 -3L4.7 -2.5', '#6b6e74', 0.5) + '<path d="M-5 -6.4V-2.6" stroke="' + ORANGE + '" stroke-width="1.3"/>' + (dark ? shade(BT) : '');
    // arms: white shirt sleeve (deltoid 8.7 → elbow 5.8 → wrist 4.6), folds and seam, buttoned cuff
    const UA = 'M-4.4 -1.4C-5 5 -4 13 -2.9 21.6L2.9 21.6C3.9 13 4.9 5 4.3 -1.8C3 -5.4 -3 -5.4 -4.4 -1.4Z';
    const upper = dark => '<path class="o" fill="url(#a-coat)" d="' + UA + '"/>'
      + '<path fill="#000" fill-opacity=".05" d="M-4.4 -1.4C-5 5 -4 13 -2.9 21.6H-0.8C-1.6 13 -2 5 -1.6 -3.6Q-3.6 -3.4 -4.4 -1.4Z"/>'
      + ln('M-1.8 9.6Q0 11 2 9.4M-2.4 17.6Q0 18.8 2.4 17.4', '#cfccc5', 0.7) + ln('M3.6 0Q3.9 10 2.6 20', '#d9d6d0', 0.6) + (dark ? shade(UA) : '');
    const FA = 'M-2.9 -1C-3.3 5 -2.8 10 -2.3 13.8L2.3 13.8C2.8 10 3.4 5 2.9 -1Z';
    const fore = dark => '<path class="o" fill="url(#a-coat)" d="' + FA + '"/>' + ln('M-1.6 2.4Q0.4 3.4 2.2 2.2M-1.2 7.4Q0.4 8.2 2 7.2', '#cfccc5', 0.7)
      + '<path class="o" fill="url(#a-coat)" d="M-2.6 13.2H2.6L2.5 17.2H-2.5Z"/>' + ln('M-2.4 14.2H2.4', '#d6d4ce', 0.5) + '<circle cx="1.4" cy="15.6" r=".45" fill="#c8c5be"/>' + (dark ? shade(FA) : '');
    // gloved hand: gauntlet cuff, palm and curled fingers closing round the grip, thumb over them
    const HD = 'M-2.6 1.4C-3.1 4.4 -2.8 7.8 -1.1 9.6C0.5 10.8 2.7 9.9 3.1 7.4L3.2 1.4Z';
    const hand = dark => '<path class="o" fill="#2a2b2f" d="M-2.7 -0.6H2.7L2.9 1.8H-2.8Z"/><path class="o" fill="url(#a-glove)" d="' + HD + '"/>'
      + ln('M-1.4 5.6Q0.6 6.4 2.8 5.4M-1.2 7.6Q0.6 8.4 2.6 7.6', '#111', 0.5, 0.55) + ln('M-2.2 3Q-2.6 6 -1.2 8.6', '#6c6f74', 0.5)
      + '<path class="o" fill="url(#a-glove)" d="M2.7 2.4C4.8 3 5.4 4.9 4.4 6.3C3.8 6.8 3.1 6.4 3.1 5.6Z"/>' + (dark ? shade(HD) : '');
    // torso: hip centre (0,0) to the shoulder line (-38.4): the white work jacket down over the hips, an orange
    // band across the chest and one above the hem, orange piping from the shoulder seams down the front and back
    // panels, the zip along the front edge; light from the left
    const TO = 'M-6.6 4C-7.6 -4 -8 -12 -7.4 -20C-7 -27 -6.8 -33 -4.6 -36.8C-2.6 -39 1.8 -39.4 4.6 -38.4C7.4 -37.2 8.8 -33.8 9 -28C9.2 -23 8.5 -18 7.5 -13C7 -8 7.4 -2 7 4Q0 5.6 -6.6 4Z';
    const cid = 'a-tc-' + id;
    const torso = '<clipPath id="' + cid + '"><path d="' + TO + '"/></clipPath>'
      + '<path class="o" fill="url(#a-coat)" d="' + TO + '"/>'
      + '<g clip-path="url(#' + cid + ')"><rect x="-12" y="-23.6" width="24" height="3" fill="' + ORANGE + '"/><rect x="-12" y="-6.4" width="24" height="3" fill="' + ORANGE + '"/>'
      + ln('M5.4 -38.6Q7.2 -32 6.6 -23.6M6.4 -20.6Q6.2 -14 6 -6.4', ORANGE, 1.1) + ln('M-3.6 -38.4Q-5.6 -32 -5.4 -23.6M-5.6 -20.6Q-6 -14 -5.8 -6.4', ORANGE, 1.1)
      + ln('M0.6 -36Q1.4 -20 1 3', '#cfccc5', 0.6) + ln('M-4.4 -14Q-2 -12.4 0.4 -14.2M2 -30Q4 -28.6 5.6 -30.4', '#d9d6d0', 0.6)
      + '<path fill="#000" fill-opacity=".07" d="M-12 -42H-3.4Q-5 -20 -3.6 8H-12Z"/><rect x="-12" y="-42" width="24" height="50" fill="url(#a-coatV)"/>'
      + '<path d="M-12 2.6H12" stroke="#bdbab4" stroke-width=".8"/></g>'
      + ln('M8.6 -33.6C9 -24 8.2 -16 7.4 -11.4C7 -7 7.3 -2 7.1 3.4', '#55585d', 0.7);
    // the stand-up collar over a dark undershirt (painted over the neck)
    const collar = '<path fill="#2b2d31" d="M4.6 -37.4L7 -35.4L5.6 -33.8Z"/>'
      + '<path class="o" fill="url(#a-coat)" d="M-0.8 -37.4Q2.2 -41.6 6.4 -38.8L6.9 -35.6Q4.6 -37.6 1.2 -35.8Z"/>' + ln('M0 -37.6Q2.8 -40.4 6.2 -38.2', '#d9d6d0', 0.5);
    // the OM Group logo on the left chest (its own group, so it never reads mirrored)
    const back = logo(2.9, -32.4, 5.6, 'name'), backC = [5.7, -30.7];
    // head: neck base (0,0); an adult face in profile toward +x. The outline runs nape · occiput · crown · forehead ·
    // brow ridge · nasion · nose bridge and tip · columella · upper lip · lower lip · chin · under the jaw · Adam's
    // apple; skull depth to head height 0.83. The ear sits between brow and nose base behind the jaw's angle; the jaw
    // line, the hollow under the cheekbone and the neck under the chin are shaded; black wraparound glasses sit off
    // the brow. Drawn at 0.94, so the head is 1/7.4 of the height.
    const HE = 'M-3.4 0.8L-3.5 -5.8C-5.2 -7.4 -6.2 -10 -6 -12.8C-5.8 -16.8 -2.6 -19.6 1.4 -19.7C4.6 -19.8 6.8 -17.8 7.2 -15'
      + 'C7.4 -14 7.7 -13.6 7.6 -13.1C7.5 -12.6 7 -12.4 7 -11.9C7.6 -10.9 8.8 -9.6 9.4 -8.9C9.6 -8.6 9.4 -8.1 8.8 -8L7.8 -7.9'
      + 'C8 -7.6 8.1 -7.3 8 -7.1L7.5 -6.7C7.9 -6.5 7.9 -6.1 7.6 -5.8C7.2 -5.5 7.2 -5.2 7.5 -4.8C7.9 -4.2 7.6 -3.4 6.6 -3.3'
      + 'C5.4 -3.2 4.2 -3.2 3.5 -3C3.9 -2.2 4.2 -1.6 3.9 -1L3.9 0.8Z';
    const HS = 0.94, sc = s => '<g transform="scale(' + HS + ')">' + s + '</g>';
    const head = sc('<path class="o" fill="url(#a-skin)" d="' + HE + '"/>'
      + '<path fill="#6b4434" fill-opacity=".22" d="M-3.5 -5.8L3.5 -3L3.9 -1Q0 -2.6 -3.4 -3.6Z"/>'
      + '<path fill="#6b4434" fill-opacity=".18" d="M0.4 -8.4C1.4 -5.8 3.8 -4.2 6.4 -3.6L6.6 -3.3C5.4 -3.2 4.2 -3.2 3.5 -3C2 -3.6 0.6 -5.6 0.4 -8.4Z"/>'
      + '<path fill="#6b4434" fill-opacity=".1" d="M3.6 -9.6Q5.4 -8.6 6.6 -9.4Q5.6 -7.6 3.8 -8.2Z"/><path fill="#fff" fill-opacity=".16" d="M4.6 -10.6Q6 -10.9 6.9 -10.2Q5.8 -9.9 4.6 -10.6Z"/>'
      + ln('M7.6 -11.2Q8.4 -10.2 8.9 -9.3', '#fff', 0.35, 0.3)
      + '<path fill="#2a211c" d="M-5.9 -13.6C-6.2 -11.2 -5.4 -9 -3.9 -7.6L-3.4 -9C-4.4 -10.4 -4.6 -12.2 -4.1 -13.6Z"/><path fill="#2a211c" d="M1.4 -14.2L1.8 -12.4L2.9 -12.6L2.9 -14.3Z"/>'
      + '<path class="o" fill="url(#a-skinD)" d="M-0.4 -12.6C1.3 -13.2 2.3 -11.8 2.1 -10.3C1.9 -8.9 1.1 -8.1 0.2 -8.4C-0.5 -9.4 -0.9 -11.4 -0.4 -12.6Z"/>' + ln('M0.5 -11.8Q1.4 -11.2 1.1 -9.9Q0.9 -9.2 0.3 -9.3', '#7a5442', 0.3)
      + ln('M8 -8.5Q8.5 -8.7 8.7 -8.3M7.7 -8Q7.5 -8.6 8.1 -8.9', '#6b4434', 0.4, 0.6) + ln('M7.3 -8.7Q6.9 -7.6 7.3 -6.6', '#8a5e48', 0.35, 0.45)
      + '<path fill="#b06d5a" fill-opacity=".5" d="M7.8 -7.9C8 -7.6 8.1 -7.3 8 -7.1L7.5 -6.7L7.2 -6.9Z"/><path fill="#b97a66" fill-opacity=".4" d="M7.5 -6.7C7.9 -6.5 7.9 -6.1 7.6 -5.8L7.2 -6.1Z"/>' + ln('M7.5 -6.7L6.6 -6.75', '#7a4a3a', 0.45)
      + ln('M5.1 -13.6Q6.5 -14.2 7.5 -13.5', '#2a211c', 0.75)
      + ln('M1.6 -12L5 -12.5', '#15191d', 0.9) + '<path class="o" fill="#15191d" d="M4.8 -13.1H8Q8.5 -13 8.3 -12.2L8 -11.1Q7.6 -10.4 6.4 -10.5L5 -10.9Z"/>' + ln('M5.4 -12.5L7.6 -12.6', '#9fb6c2', 0.45, 0.6)
      + '<path class="o" fill="url(#a-hat)" d="M-6.4 -13.6C-7.2 -20.8 -1.8 -23.8 2.6 -23.4C7.4 -23 9.4 -19.2 9 -15.6L11.3 -14.8Q11.5 -14 10.5 -13.9L-6.6 -13.2Z"/>'
      + '<path fill="#000" fill-opacity=".06" d="M-6.4 -13.6C-6.9 -17.4 -5.8 -20 -3.8 -21.6Q-5.4 -17.8 -4.8 -13.7Z"/>' + ln('M-6.5 -14.3H9.2', '#bdbab4', 0.8)
      + ln('M-3.6 -20.8Q2 -25.6 7.6 -19.8', '#fff', 1.3, 0.9) + ln('M-4.8 -17.6Q-4.2 -21.6 0 -23', '#fff', 0.8, 0.8));
    const helm = sc(logo(0.2, -21.4, 6, 'name')), helmC = [3.2 * HS, -19.6 * HS];
    // tools: sampling scoop (in the hand's frame: grip at L.grip, bowl toward +x) and the sample bucket
    // (origin = where the fist closes on its bail handle; it hangs below, mouth at y = 4)
    const scoop = '<rect class="o" fill="#2b2d31" x="-3.2" y="3.6" width="9" height="2.8" rx="1.2"/><path class="o" fill="url(#a-chrome)" d="M5.6 4H9.4V6H5.6Z"/>'
      + '<path class="o" fill="url(#a-chrome)" d="M8.6 1.6L21.4 2.8Q22.4 7.6 19.4 9.2L9.4 8.8Q7.8 6 8.6 1.6Z"/><path d="M10 3.4L20.6 4.2" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/><path fill="#6c7076" fill-opacity=".5" d="M10.2 7.6L19 8Q20.4 7 20.8 5.6Q15 6.6 10.2 6Z"/>';
    const bucket = '<path d="M-7.6 4.6Q-7.4 -0.4 0 0.4Q7.4 -0.4 7.6 4.6" fill="none" stroke="#55585d" stroke-width="1"/><rect x="-2.6" y="-0.5" width="5.2" height="1.8" rx=".9" fill="#2b2d31"/>'
      + '<path class="o" fill="url(#a-panel)" d="M-8 4H8L6.8 22H-6.8Z"/><path fill="#000" fill-opacity=".08" d="M3 4H8L6.8 22H3Z"/>'
      + '<path class="o" fill="#3a3c40" d="M-8.6 3.2H8.6V5.2H-8.6Z"/><path d="M-7.2 19.4H7.2" stroke="#d6d4cf" stroke-width=".7"/>'
      + logo(-5.4, 8.6, 10.8, 'name')
      + '<path d="M7.4 4.6Q9.6 6 10 8.6" fill="none" stroke="#8a8d92" stroke-width=".5"/><rect class="o" fill="#fbfaf7" x="8.2" y="8.4" width="4.4" height="6.2" rx=".6" transform="rotate(8 10.4 11.5)"/><rect fill="' + ORANGE + '" x="8.4" y="8.6" width="4" height="1.4" transform="rotate(8 10.4 11.5)"/>';
    const shadowS = '<ellipse cx="-1" cy="0.6" rx="17" ry="2.6" fill="url(#a-shadow)"/>';
    return { L, thigh, shin, boot, upper, fore, hand, torso, collar, back, backC, head, helm, helmC, scoop, bucket, shadow: shadowS, bowl: [14.5, 5], lip: [21.4, 5.6],
      bucketG: { mouthY: 3, H: 22, rimF: [8, 4], rimB: [-7.6, 4.2], base: [-6, 19], sideN: [-7, 9], sideF: [5, 7] } };
  }
  /* ---------- the 2D technician, from the approved character artwork (tech2d/*.png) ---------- */
  // The same interface as technician(), but every part is a cut-out image from the generated character pack
  // (_review/character-2d), with the official OM Group logo on the helmet, the vest's chest badge and the bucket
  // (built by _review/character-2d/build-2d.js). His proportions are those of the artwork: long legs (hip at
  // 65.6 of 118), torso 31.3, arms 31. The head and torso exist in both directions (…-l) so the logos never read
  // mirrored: the engine shows the one that matches the way he faces. Null when the artwork is not loaded.
  function technician2d() {
    const T = window.OPM_TECH2D; if (!T) return null;
    const BASE = 'assets/operations-motion/tech2d/';
    const im = (k, extra = '') => { const m = T[k]; return `<image href="${BASE}${k}.png" x="${F(-m.ox)}" y="${F(-m.oy)}" width="${F(m.w)}" height="${F(m.h)}" preserveAspectRatio="none"${extra}/>`; };
    // both directions of a part with a logo: the engine flips the whole figure to face left, so the left-facing
    // drawing is flipped back here and the pair of flips cancels
    const both = k => `<g data-dir="1">${im(k)}</g><g data-dir="-1" transform="scale(-1 1)" style="display:none">${im(k + '-l')}</g>`;
    const L = { thigh: 29.3, shin: 28.6, upper: 17, fore: 14, ankle: 8.7, grip: [0, 1.9], sh: 27.2, neck: 31.3, neckX: -0.5, shN: [-3.4, 0], shF: [-1.6, 0.6], heel: -3.9, toe: 10.2 };
    const limb = k => dark => (dark ? im(k + '-d', ' class="shd"') : im(k));
    // the scoop: its handle in the fist (grip), the trough toward +x; bowl = the middle of the trough, lip = its open end
    const g = L.grip, scoop = `<g transform="translate(${g[0]} ${g[1]})">${im('scoop')}</g>`;
    const stones = [0, 1, 2, 3, 4, 5].map(i => im('stone' + i));
    return { L, img: true, thigh: limb('thigh'), shin: limb('shin'), boot: limb('boot'), upper: limb('upper'), fore: limb('fore'), hand: limb('fist'),
      torso: both('torso'), collar: '', back: '', backC: [0, 0], head: both('head'), helm: '', helmC: [0, 0], scoop, bucket: im('bucket'),
      shadow: '<ellipse cx="1" cy="0.6" rx="16" ry="2.4" fill="url(#a-shadow)"/>', bowl: [g[0] + 13.7, g[1] + 0.7], lip: [g[0] + 20.6, g[1] + 0.9], stones,
      // the bucket (origin = where the fist closes on the handle): rim centre, base, front and back of the rim, the
      // sides where the hands take it
      bucketG: { mouthY: 9.3, H: 26.3, rimF: [9, 9.3], rimB: [-8.6, 9.6], base: [-6, 25.6], sideN: [-8.6, 15], sideF: [8.6, 14] },
      // the front view (the turn): the drawing about the point between his feet, and his right fist (the bucket's)
      front: im('front'), frontFist: [-14.8, -56.8] };
  }

  /* ---------- wheel loader (QA chapter) ---------- */
  // A heavy quarry front-end wheel loader facing right, after the approved reference: an articulated
  // chassis (rear frame carrying the engine module, counterweight and cab; centre hinge; front frame
  // with the lift-arm tower), big lugged tyres on orange rims, a Z-bar linkage and a heavy bucket.
  // The moving parts come back in their own frames so the engine can pose them as one mechanism:
  //  arm    lift arm: pivot (0,0) on the tower at `pivot`, bucket pin at (armL, 0)
  //  crank  bell crank: pivot (0,0) at Z.C on the arm, link pin at (Z.a2, 0), cylinder pin at Z.a1 / −60°
  //  link   tilt link: crank pin (0,0) to bucket ear (Z.Lk, 0)
  //  bucket pin (0,0), link ear at Z.ear, cutting edge at `lip`; floor level at angle 0
  // The lift and tilt cylinders are drawn by the engine between the frame pins and the arm / crank.
  function lugTyre(r) {
    const c = Math.cos, s = Math.sin, n = 22, P = (a, k) => F(c(a) * r * k) + ' ' + F(s(a) * r * k);
    let lugs = '';
    for (let i = 0; i < n; i++) { const a = i / n * TAU, w = TAU / n * 0.55, o = i % 2 ? 0.07 : -0.07; lugs += 'M' + P(a, 0.86) + 'L' + P(a + o, 1.01) + 'L' + P(a + w + o, 1.01) + 'L' + P(a + w, 0.86) + 'Z'; }
    let nuts = ''; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; nuts += '<circle cx="' + F(c(a) * r * 0.27) + '" cy="' + F(s(a) * r * 0.27) + '" r="' + F(r * 0.035) + '" fill="#2a2c30"/>'; }
    return '<circle class="o" r="' + r + '" fill="url(#a-tyre)"/><path d="' + lugs + '" fill="#121314"/><circle r="' + F(r * 0.8) + '" fill="none" stroke="#38393d" stroke-width="' + F(r * 0.06) + '"/>'
      + '<circle class="o" r="' + F(r * 0.56) + '" fill="url(#a-rimO)"/><circle r="' + F(r * 0.49) + '" fill="none" stroke="#a53712" stroke-width="' + F(r * 0.03) + '"/>'
      + '<circle r="' + F(r * 0.36) + '" fill="url(#a-paintD)"/><circle class="o" r="' + F(r * 0.2) + '" fill="url(#a-hub)"/>' + nuts + '<circle r="' + F(r * 0.08) + '" fill="#3a3c40"/>';
  }
  function wheelLoader() {
    const r = 37, wx = [-76, 76], dk = '#2a2c30';
    const [wheelRear, wheelFront] = wx.map(x => '<g class="wheel" data-x="' + x + '" data-r="' + r + '" transform="translate(' + x + ' ' + (-r) + ')">' + lugTyre(r) + '</g>');
    const slats = (x0, x1, y0, y1, step) => { let d = ''; for (let y = y0; y <= y1; y += step) d += 'M' + x0 + ' ' + y + 'H' + x1; return '<path d="' + d + '" stroke="#17181a" stroke-width="1.2"/>'; };
    // the rear frame: engine module, counterweight, cab, the hinge (the engine draws the ground shadow)
    const bodyRear = ''
      // rear frame, cab base, fuel tank between the axles
      + '<path class="o" fill="url(#a-steelD)" d="M-186 -68H4V-40H-12L-18 -34H-146L-152 -40H-186Z"/><path class="hl" d="M-184 -66H2"/>'
      + '<rect class="o" fill="#2f3135" x="-50" y="-86" width="84" height="18"/>'
      + '<rect class="o" fill="url(#a-steelD)" x="-28" y="-66" width="24" height="26" rx="3"/><rect fill="#45474c" x="-24" y="-70" width="6" height="4" rx="1"/>'
      // engine module: orange hood with a white side panel (logo added separately), intake louvres, rear grille
      + '<path class="o" fill="url(#a-paint)" d="M-52 -66V-115Q-52 -119 -56 -119H-166Q-182 -118 -184 -103V-66Z"/>'
      + '<path fill="url(#a-paintD)" d="M-184 -78H-52V-66H-184Z"/><path d="M-58 -117H-164" stroke="#ffd0bc" stroke-opacity=".6" stroke-width="1.2"/>'
      + '<path class="o" fill="url(#a-cabw)" d="M-68 -111H-170Q-176 -111 -176 -105V-81H-100L-68 -101Z"/>'
      + '<path d="M-160 -109V-83" stroke="#bdbab4" stroke-width=".8"/><rect fill="#9a9ea3" x="-165" y="-98" width="2.4" height="6" rx="1"/>'
      + '<rect class="o" fill="#2f3135" x="-64" y="-113" width="10" height="44" rx="1.5"/>' + slats(-63, -55, -110, -72, 3.4)
      + '<rect class="o" fill="#2f3135" x="-183" y="-100" width="5" height="30" rx="1"/>' + slats(-182.5, -178.5, -98, -72, 3)
      // exhaust stack and air pre-cleaner on the hood
      + '<path class="o" fill="' + dk + '" d="M-122 -119V-150Q-122 -157 -115 -157L-109 -156V-119Z"/><path d="M-120 -150V-121" stroke="#55585d" stroke-width="1"/>'
      + '<rect class="o" fill="' + dk + '" x="-90" y="-131" width="11" height="12" rx="2"/><rect class="o" fill="#3a3c40" x="-92" y="-135" width="15" height="5" rx="2"/>'
      // counterweight with tail lamps
      + '<path class="o" fill="url(#a-steelD)" d="M-184 -106H-196Q-203 -106 -203 -98V-44Q-203 -36 -195 -36H-184Z"/><path fill="' + ORANGE + '" d="M-184 -106H-197Q-202 -106 -202.6 -101H-184Z"/>'
      + '<rect fill="#d6302a" x="-202" y="-94" width="4" height="9" rx="1"/><rect fill="#f5a623" x="-202" y="-83" width="4" height="4" rx="1"/><path d="M-200 -56H-188M-200 -50H-188" stroke="#17181a" stroke-width="1.2"/>'
      // cab: dark frame, rear quarter and door glass (seat and steering column inside), white door panel,
      // handle, roof with beacon and work light, mirror, deck
      + '<path class="o" fill="' + dk + '" d="M-50 -86L-47 -160Q-46 -166 -40 -166H27Q33 -166 34 -160L39 -102L37 -86Z"/>'
      + '<path class="o" fill="url(#a-glass)" d="M-44 -156L-42.5 -112H-34V-156Z"/>'
      + '<path class="o" fill="url(#a-glass)" d="M-28 -157H24Q28 -157 29 -152L33 -114H-28Z"/>'
      + '<path fill="#1b1e23" fill-opacity=".55" d="M-20 -114V-134Q-20 -144 -12 -144H-8V-114Z"/><path d="M16 -116L8 -132M4 -134L12 -131" stroke="#1b1e23" stroke-opacity=".6" stroke-width="2"/>'
      + '<path d="M-24 -155L-8 -116M0 -155L12 -128" stroke="#fff" stroke-opacity=".22" stroke-width="4"/><path d="M-28 -157H24Q28 -157 29 -152L33 -114" fill="none" stroke="#111" stroke-width="1.2"/>'
      + '<path class="o" fill="url(#a-cabw)" d="M-29 -111H33.2L35.4 -88H-29Z"/><path d="M-30 -158V-88" stroke="#17181a" stroke-width="1.2"/>'
      + '<rect class="o" fill="#3a3c40" x="-26" y="-108.6" width="7" height="2.4" rx="1"/>'
      + '<rect class="o" fill="url(#a-paint)" x="-56" y="-173" width="98" height="8" rx="2"/><path d="M-53 -171H39" stroke="#ffd0bc" stroke-opacity=".7"/>'
      + '<rect fill="#3a3c40" x="-15" y="-177" width="8" height="4"/><path class="o" fill="#f5a623" d="M-14 -177V-183Q-11 -186 -8 -183V-177Z"/>'
      + '<rect class="o" fill="#3a3c40" x="33" y="-179" width="7" height="6" rx="1"/><rect fill="#f2efe6" x="38" y="-178" width="2" height="4"/>'
      + '<path d="M35 -150L46 -157" stroke="' + dk + '" stroke-width="1.8"/><rect class="o" fill="' + dk + '" x="44" y="-167" width="5" height="16" rx="1.5"/>'
      + '<rect class="o" fill="url(#a-steelD)" x="-60" y="-89" width="100" height="5"/>'
      // articulation hinge between the frames: two pins and the steering cylinder
      + '<rect class="o" fill="url(#a-steelD)" x="2" y="-80" width="16" height="42" rx="2"/><circle class="o" cx="10" cy="-72" r="4" fill="url(#a-hub)"/><circle class="o" cx="10" cy="-46" r="4" fill="url(#a-hub)"/>'
      + '<path d="M-8 -58L22 -55" stroke="#55585d" stroke-width="3.4" stroke-linecap="round"/><path d="M8 -57.6L22 -55" stroke="#e6e8ea" stroke-width="1.6"/>';
    // the front frame and the lift-arm tower (boom pivot, tilt- and lift-cylinder pins)
    const bodyFront = '<path class="o" fill="url(#a-steelD)" d="M16 -70H104L112 -60V-40H16Z"/><path class="hl" d="M18 -68H104"/>'
      + '<path class="o" fill="url(#a-paint)" d="M34 -70L42 -126Q44 -134 52 -134H60Q68 -132 69 -122L76 -98L98 -70Z"/>'
      + '<path fill="url(#a-paintD)" d="M70 -100L76 -98L98 -70H84Z"/><path d="M44 -124L38 -72" stroke="#ffd0bc" stroke-opacity=".55" stroke-width="1.2"/>'
      + '<circle class="o" cx="58" cy="-108" r="9" fill="url(#a-hub)"/><circle cx="58" cy="-108" r="3.4" fill="#3a3c40"/>'
      + '<circle class="o" cx="48" cy="-124" r="5" fill="url(#a-hub)"/><circle class="o" cx="38" cy="-56" r="5" fill="url(#a-hub)"/>';
    // over the tyres: fender arches, the rear mud flap, the access ladder and its orange handrail
    const arch = x => '<path class="o" fill="url(#a-paint)" d="M' + F(x - 44.2) + ' -53.1A47 47 0 0 1 ' + F(x + 44.2) + ' -53.1L' + F(x + 38.5) + ' -51A41 41 0 0 0 ' + F(x - 38.5) + ' -51Z"/>';
    const fenderFront = arch(76), fenderRear = arch(-76) + '<rect class="o" fill="#1f2023" x="-124" y="-53" width="5" height="23" rx="1"/>'
      + '<path d="M-46 -86V-40M-37 -86V-40" stroke="#3a3c40" stroke-width="1.8"/><path d="M-46 -77H-37M-46 -68H-37M-46 -59H-37M-46 -50H-37M-46 -41H-37" stroke="#3a3c40" stroke-width="1.5"/>'
      + '<path class="rl" d="M-49 -42V-152Q-49 -156 -45 -156"/>';
    // lift arm, in arm coordinates: pivot (0,0) to bucket pin (armL, 0); lugs for the lift cylinder and the crank
    const armL = 140, Z = { C: [106, 8], a1: 28, a2: 34, Lk: 40, ear: [6, -20] };
    const arm = '<path class="o" fill="url(#a-paint)" d="M-10 -5Q-8 -13 4 -14L60 -18Q96 -19 122 -10L144 -5Q150 1 144 7L118 10Q112 11 110 14L102 15Q98 11 92 11L66 12L60 17L46 17L42 12L6 12Q-9 11 -10 -5Z"/>'
      + '<path d="M4 -10Q60 -15.5 132 -5" fill="none" stroke="#ffd0bc" stroke-opacity=".6" stroke-width="1.2"/><path d="M10 6Q70 7 128 4" fill="none" stroke="#a53712" stroke-opacity=".5"/>'
      + '<path d="M14 -15Q70 -19.5 120 -10.5" fill="none" stroke="#1d1e21" stroke-width="1.4"/>'
      + '<circle class="o" r="8" fill="url(#a-hub)"/><circle class="o" cx="52" cy="12" r="4.6" fill="url(#a-hub)"/><circle class="o" cx="' + Z.C[0] + '" cy="' + Z.C[1] + '" r="5.4" fill="url(#a-hub)"/><circle class="o" cx="' + armL + '" r="6.4" fill="url(#a-hub)"/>';
    // bell crank (pivot, link pin along +x, cylinder pin at −60°) and the tilt link
    const Tc = [F(Z.a1 * Math.cos(-Math.PI / 3)), F(Z.a1 * Math.sin(-Math.PI / 3))];
    const crank = '<path class="o" fill="url(#a-paint)" d="M-6 4L34 6.5Q41 0 34 -6.5L19 -27Q14 -32 9 -27.5L-6 -4Q-9 0 -6 4Z"/><path d="M2 -2H28" stroke="#ffd0bc" stroke-opacity=".5"/>'
      + '<circle class="o" r="5.4" fill="url(#a-hub)"/><circle class="o" cx="' + Z.a2 + '" r="4.4" fill="url(#a-hub)"/><circle class="o" cx="' + Tc[0] + '" cy="' + Tc[1] + '" r="4.4" fill="url(#a-hub)"/>';
    const link = '<path class="o" fill="url(#a-steelD)" d="M0 -4.2H' + Z.Lk + 'A4.2 4.2 0 0 1 ' + Z.Lk + ' 4.2H0A4.2 4.2 0 0 1 0 -4.2Z"/><path class="hl" d="M2 -2.6H' + (Z.Lk - 2) + '"/>'
      + '<circle class="o" r="3.4" fill="url(#a-hub)"/><circle class="o" cx="' + Z.Lk + '" r="3.4" fill="url(#a-hub)"/>';
    // bucket, in bucket coordinates: mounting brackets behind, side plate with the reinforced front edge,
    // back wrapper, bottom wear plate, bolt-on cutting edge, pins
    const bucket = '<path class="o" fill="url(#a-steelD)" d="M-6 6Q-9 -14 0 -26L12 -26L12 6Z"/>'
      + '<path class="o" fill="url(#a-bucket)" d="M10 -40L20 -45L86 21L85 25L8 22Q-1 17 0 0Q1 -26 10 -40Z"/>'
      + '<path d="M9 -37Q2 -24 2 0Q1.5 13 9 19" fill="none" stroke="#8a8d92" stroke-width="2.2" stroke-opacity=".8"/>'
      + '<path d="M20 -45L86 21" stroke="#6d7076" stroke-width="3.6"/><path d="M21 -43.6L85 20.4" stroke="#a9adb2" stroke-width=".8"/>'
      + '<path fill="#2a2b2f" d="M8 22L85 25L84 28L10 25Z"/>'
      + '<path class="o" fill="url(#a-chrome)" d="M58 23.8L92 25.2L90 28.6L58 27.2Z"/>' + [64, 72, 80].map(x => '<circle cx="' + x + '" cy="' + F(25.6 + (x - 58) * 0.04) + '" r=".9" fill="#55585d"/>').join('')
      + '<path d="M22 -30L40 18M14 -8L30 20" stroke="#000" stroke-opacity=".18" stroke-width="2.4"/>'
      + '<circle class="o" r="6" fill="url(#a-hub)"/><circle class="o" cx="' + Z.ear[0] + '" cy="' + Z.ear[1] + '" r="4.6" fill="url(#a-hub)"/>';
    // the load: a mound of crushed stone heaped over the opening
    const nx = Math.SQRT1_2, ny = -Math.SQRT1_2, R = rng(77);
    let load = '<path fill="url(#a-pileback)" d="M18 -43Q' + F(53 + nx * 30) + ' ' + F(-12 + ny * 30) + ' 84 19Z"/>';
    for (let i = 0; i < 14; i++) { const s = 0.06 + (i / 13) * 0.88, h = Math.sin(Math.PI * s) * (6 + R() * 7) - 2; load += '<g transform="translate(' + F(20 + 66 * s + nx * h) + ' ' + F(-45 + 66 * s + ny * h) + ')">' + rock(4.4 + R() * 3.4, 950 + i).svg + '</g>'; }
    // seen from the front (u across the machine, facing the viewer): the cab with its windscreen, roof, beacon,
    // mirrors, handrails and the official logo on the lower panel; the front frame with its two arm towers
    const cab = '<rect class="o" fill="url(#a-steelD)" x="-38" y="-89" width="76" height="5"/>'
      + '<path class="o" fill="' + dk + '" d="M-30 -165H30L32.5 -86H-32.5Z"/><path class="o" fill="url(#a-glass)" d="M-26 -159H26L27.4 -104H-27.4Z"/>'
      + '<ellipse cx="0" cy="-112" rx="8" ry="2.6" fill="none" stroke="#1b1e23" stroke-opacity=".6" stroke-width="1.6"/><path d="M0 -112V-104" stroke="#1b1e23" stroke-opacity=".6" stroke-width="1.6"/>'
      + '<path d="M-20 -157L-8 -106M4 -157L14 -120" stroke="#fff" stroke-opacity=".2" stroke-width="4"/><path d="M-2 -105L-17 -142" stroke="#111" stroke-width="1"/>'
      + '<path class="o" fill="url(#a-cabw)" d="M-28.6 -102H28.6L29.6 -87H-29.6Z"/>' + logo(-12, -100.8, 24, 'brand')
      + '<rect class="o" fill="url(#a-paint)" x="-37" y="-173" width="74" height="8" rx="2"/><path d="M-34 -171H34" stroke="#ffd0bc" stroke-opacity=".7"/>'
      + '<rect fill="#3a3c40" x="-4" y="-177" width="8" height="4"/><path class="o" fill="#f5a623" d="M-3 -177V-183Q0 -186 3 -183V-177Z"/>'
      + '<rect class="o" fill="#3a3c40" x="-35" y="-179" width="7" height="6" rx="1"/><rect class="o" fill="#3a3c40" x="28" y="-179" width="7" height="6" rx="1"/><rect fill="#f2efe6" x="-33" y="-177" width="3" height="3"/><rect fill="#f2efe6" x="30" y="-177" width="3" height="3"/>'
      + '<path d="M-31 -150L-41 -156M31 -150L41 -156" stroke="' + dk + '" stroke-width="1.8"/><rect class="o" fill="' + dk + '" x="-47" y="-166" width="6" height="16" rx="1.5"/><rect class="o" fill="' + dk + '" x="41" y="-166" width="6" height="16" rx="1.5"/>'
      + '<path class="rl" d="M-35 -88V-150M35 -88V-150"/>';
    const frame = '<rect class="o" fill="url(#a-steelD)" x="-32" y="-72" width="64" height="32" rx="2"/><rect class="o" fill="url(#a-steelD)" x="-44" y="-84" width="88" height="9" rx="2"/>'
      + [-40, 40].map(u => '<path class="o" fill="url(#a-paint)" d="M' + (u - 6) + ' -70V-126Q' + (u - 6) + ' -134 ' + u + ' -134Q' + (u + 6) + ' -134 ' + (u + 6) + ' -126V-70Z"/><circle class="o" cx="' + u + '" cy="-108" r="5" fill="url(#a-hub)"/>').join('')
      + '<rect fill="#f5a623" x="-30" y="-66" width="6" height="4" rx="1"/><rect fill="#f5a623" x="24" y="-66" width="6" height="4" rx="1"/><circle class="o" cx="0" cy="-50" r="4" fill="url(#a-hub)"/>';
    return { bodyRear, bodyFront, wheelRear, wheelFront, fenderRear, fenderFront, wx, r, faces: { cab, frame }, arm, crank, link, bucket, load, armL, Z, pivot: [58, -108], liftBase: [38, -56], liftLug: [52, 12], tiltBase: [48, -124], lip: [91, 26],
      brands: [{ svg: logo(-13, -107.9, 32, 'brand'), cx: 3 }, { svg: logo(-151, -107, 42, 'brand'), cx: -130 }] };
  }

  return {
    rng, F, poly, ORANGE, RAMP, defs, shadow, logo, logoH, member, seg, col, beam, footing, xbrace, rail, deck, stairs, ladder, box, fins, spring,
    lab, technician, technician2d, wheelLoader,
    rockMesh, Ink, rock, quarryBoulder, jawCrusher, coneCrusher, JAW, CONE, hull: convexHull, pile, sandHeap, boulder, hills, skyline, trees, conveyor, conveyorMoving, crusher, screen, sampleCard,
    plant, wheel, wheelG, transitMixer, tipper, excavator, crane, building, bridge, roadSection,
  };
})();
