/* OM GROUP · packs the info cards (.wmd-grid) on the Construction Boulders page into columns so cards of very different lengths leave no half-empty boxes.
   For each group it tries the possible column counts (3, then 2 on desktop; 2 on tablets; 1 on phones; data-cols="2" forces 2), splits the cards between the columns
   in every possible way using their real heights, and keeps the layout whose columns end most evenly. Re-packs on resize and when fonts load. */
(() => {
  const grids = [...document.querySelectorAll('.ap-bld .wmd-grid')]; if (!grids.length) return;
  const items = new Map(grids.map(g => [g, [...g.children]])); let width = 0;
  const maxCols = () => innerWidth <= 640 ? 1 : innerWidth <= 1000 ? 2 : 3;
  function build(g, k) {
    const its = items.get(g); g.textContent = ''; g.classList.add('mas');
    const cs = Array.from({ length: k }, () => { const c = document.createElement('div'); c.className = 'mas-col'; g.appendChild(c); return c; });
    its.forEach(i => { let best = cs[0], bh = Infinity; cs.forEach(c => { const h = c.offsetHeight; if (h < bh) { bh = h; best = c; } }); best.appendChild(i); });
    if (its.length <= 12 && k > 1) {                                   /* real heights are known now: search every split for the most even columns */
      const H = its.map(i => i.offsetHeight + 16), T = Math.pow(k, its.length - 1); let bestA = 0, bs = Infinity;   /* the first card always starts column 1: no mirrored duplicates */
      for (let m = 0; m < T; m++) { const sum = Array(k).fill(0); let x = m * k; for (let j = 0; j < its.length; j++) { sum[x % k] += H[j]; x = (x / k) | 0; } if (!sum.every(v => v > 0)) continue; const sc = Math.max(...sum) - Math.min(...sum) + Math.max(...sum) * .12; if (sc < bs) { bs = sc; bestA = m; } }
      let x = bestA * k; const asg = its.map(() => { const c = x % k; x = (x / k) | 0; return c; }); its.forEach((i, j) => cs[asg[j]].appendChild(i));
    }
    const hs = cs.map(c => c.offsetHeight); return (Math.max(...hs) - Math.min(...hs)) / Math.max(...hs, 1);
  }
  function pack() {
    const w = maxCols(); if (w === width) return; width = w;
    grids.forEach(g => {
      const its = items.get(g), forced = +g.dataset.cols || 0, top = Math.min(forced || w, its.length);
      if (top <= 1) { g.classList.remove('mas'); g.textContent = ''; its.forEach(i => g.appendChild(i)); return; }
      const tries = forced ? [top] : top >= 3 ? [3, 2] : [top]; let best = tries[0], bs = Infinity;
      tries.forEach((k, n) => { const sc = build(g, k) + n * .1; if (sc < bs) { bs = sc; best = k; } });
      build(g, best);
    });
  }
  const run = () => { width = 0; pack(); };
  run(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(pack, 120); });
})();
