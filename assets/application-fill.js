/* OM GROUP - application pages: no orphan cells.
   Card grids whose last row is incomplete (a lone card beside an empty gap) get their last card widened to fill the row.
   Pure presentation: it only sets grid-column on the last child, re-measured when the grid is resized. Runs on every application page. */
(function () {
  'use strict';
  var SEL = '.ap-ind,.ap-whys,.ap-qa,.ap6-steps6,.ap125-mix3,.rmc-steps,.hma-steps,.hma-apps,.hma-types,.hma-vg,.hma-std,.hma-defs';
  function fill(g) {
    var kids = [].filter.call(g.children, function (k) { return k.offsetParent !== null || getComputedStyle(k).position === 'fixed'; });
    var last = kids[kids.length - 1];
    if (!last) return;
    last.style.gridColumn = '';
    var cs = getComputedStyle(g);
    if (cs.display !== 'grid') return;
    var cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
    if (cols < 2 || kids.length < 3) return;
    if (kids.some(function (k) { return /span/.test(getComputedStyle(k).gridColumnStart + getComputedStyle(k).gridColumnEnd); })) return;
    var m = kids.length % cols;
    if (m === 0) return;
    last.style.gridColumn = 'span ' + (cols - m + 1);
  }
  /* text cards of unequal height: dealt into columns so that the columns come out the same height (best of all ways to deal them),
     each column keeps the cards in reading order, and the last card of a column stretches so every column ends on the same line */
  var MAS = '.wmd-grid,.wmd-six';
  function best(h, n, gap) {
    var N = h.length, asg = new Array(N).fill(0), top = null, total = Math.pow(n, N);
    if (total > 60000) { /* very many cards: greedy */ var col = new Array(n).fill(0); return h.map(function (x) { var k = col.indexOf(Math.min.apply(null, col)); col[k] += x + gap; return k; }); }
    for (var m = 0; m < total; m++) {
      var t = m, col2 = new Array(n).fill(0), cnt = new Array(n).fill(0), pen = 0;
      for (var i = 0; i < N; i++) { var k = t % n; t = (t - k) / n; asg[i] = k; col2[k] += h[i] + gap; cnt[k]++; pen += Math.abs(k - (i % n)); }
      if (cnt.some(function (c) { return c === 0; })) continue;
      var sc = (Math.max.apply(null, col2) - Math.min.apply(null, col2)) * 100 + pen;
      if (top === null || sc < top.sc) top = { sc: sc, a: asg.slice() };
    }
    return top ? top.a : h.map(function (_, i) { return i % n; });
  }
  /* two ways to lay the cards out, whichever leaves less empty card area:
     rows   - cards in reading order, every card in a row the same height; an incomplete last row is spread across the full width
     columns - cards dealt into columns that end on the same line (best of all ways to deal them) */
  /* which cards share a row: every way of grouping up to nine cards into rows of n, fewest empty pixels wins (a short remainder row goes last, full width) */
  function bestRows(h, n) {
    var N = h.length, rem = N % n, top = null;
    function combos(arr, k, from, cur, out) { if (cur.length === k) { out.push(cur.slice()); return; } for (var i = from; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); } }
    function groups(left, acc, done) {
      if (!left.length) { done(acc); return; }
      var first = left[0], rest = left.slice(1), cs = []; combos(rest, n - 1, 0, [], cs);
      cs.forEach(function (c) { var g = [first].concat(c); groups(left.filter(function (x) { return g.indexOf(x) < 0; }), acc.concat([g]), done); });
    }
    var idx = h.map(function (_, i) { return i; }), remSets = []; if (rem) combos(idx, rem, 0, [], remSets); else remSets = [[]];
    remSets.forEach(function (R) {
      groups(idx.filter(function (x) { return R.indexOf(x) < 0; }), [], function (rows) {
        var e = 0, pen = 0; rows.forEach(function (r, ri) { var m = Math.max.apply(null, r.map(function (i) { return h[i]; })); r.forEach(function (i) { e += m - h[i]; pen += Math.abs(ri - Math.floor(i / n)); }); });
        var sc = e * 100 + pen; if (!top || sc < top.sc) top = { sc: sc, e: e, rows: rows, rem: R };
      });
    });
    return top;
  }
  function rowsEmpty(h, n) { var e = 0; for (var i = 0; i < h.length; i += n) { var row = h.slice(i, i + n); if (row.length < n) break; var m = Math.max.apply(null, row); row.forEach(function (x) { e += m - x; }); } return e; }
  function colsEmpty(h, asg, n, gap) { var c = new Array(n).fill(0); h.forEach(function (x, i) { c[asg[i]] += x + gap; }); var m = Math.max.apply(null, c); return c.reduce(function (t, x) { return t + (m - x); }, 0); }
  /* a pair of cards side by side whose heights differ a lot: stacked full width instead, so neither card carries a big empty space */
  function pair(g) {
    g.classList.remove('stack'); var k = [].slice.call(g.children); if (k.length !== 2 || g.classList.contains('wmd-six')) return;
    var a = k[0].getBoundingClientRect(), b = k[1].getBoundingClientRect();
    function content(el, r) { var m = 0; [].forEach.call(el.children, function (c) { m = Math.max(m, c.getBoundingClientRect().bottom); }); return m - r.top + 26; }   /* height the card's text needs (cards in a row are stretched equal) */
    var ha = content(k[0], a), hb = content(k[1], b);
    if (Math.abs(a.top - b.top) < 4 && Math.abs(ha - hb) > 90 && Math.min(ha, hb) < Math.max(ha, hb) * .7) g.classList.add('stack');
  }
  function masonry(g) {
    var items = g._items || (g._items = [].slice.call(g.children).filter(function (k) { return !k.classList.contains('mas-col'); }));
    if (items.length === 2) { g._pairW !== g.clientWidth && (g._pairW = g.clientWidth, pair(g)); return; }
    if (items.length < 3) return;
    var six = g.classList.contains('wmd-six'), gap = six ? 34 : 16, vgap = six ? 22 : 16, minW = +g.getAttribute('data-minw') || (six ? 320 : 330), cap = +g.getAttribute('data-maxcols') || 3;   /* a grid may opt in to more, narrower columns (Hot Mix: four short cards in one row) */
    var maxN = Math.max(1, Math.min(cap, Math.floor((g.clientWidth + gap) / (minW + gap))));
    if (g._n === maxN && g._mode) return;
    g._n = maxN;
    function reset() { g.textContent = ''; g.classList.remove('mas', 'rowg'); g.style.gridTemplateColumns = ''; items.forEach(function (it) { it.style.gridColumn = ''; }); }
    function columns(n) { reset(); g.classList.add('mas'); var cols = []; for (var i = 0; i < n; i++) { var c = document.createElement('div'); c.className = 'mas-col'; g.appendChild(c); cols.push(c); } return cols; }
    if (maxN === 1) { var c1 = columns(1)[0]; items.forEach(function (it) { c1.appendChild(it); }); g._mode = 'one'; return; }
    /* try 3 and 2 columns (if the width allows) and keep whichever leaves the least empty card area */
    var plans = [];
    for (var n = maxN; n >= 2; n--) {
      var cols = columns(n); items.forEach(function (it) { cols[0].appendChild(it); });
      var h = items.map(function (it) { return it.offsetHeight; }), cw = cols[0].offsetWidth, asg = best(h, n, vgap), br = h.length <= 9 ? bestRows(h, n) : null;
      var eC = colsEmpty(h, asg, n, vgap), eR = br ? br.e : rowsEmpty(h, n), bias = n === maxN ? .85 : 1;
      plans.push({ n: n, mode: eR <= eC ? 'rows' : 'cols', area: Math.min(eR, eC) * cw * bias, asg: asg, br: br });
    }
    plans.sort(function (x, y) { return x.area - y.area; });
    var P = plans[0];
    if (g.hasAttribute('data-maxcols') && items.length <= maxN) P = plans.filter(function (x) { return x.n === items.length; })[0] || P;   /* opted-in grid with one card per column: always a single row */
    if (P.mode === 'rows') {
      reset(); g.classList.add('rowg'); var L = P.n === 3 ? 6 : P.n, w = L / P.n; g.style.gridTemplateColumns = 'repeat(' + L + ',minmax(0,1fr))';
      var rem = items.length % P.n, order;
      if (P.br) { order = []; P.br.rows.slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (r) { order = order.concat(r); }); order = order.concat(P.br.rem); } else order = items.map(function (_, i) { return i; });
      var full = items.length - rem;
      order.forEach(function (ix, i) { var it = items[ix]; g.appendChild(it); it.style.gridColumn = 'span ' + (i < full || rem === 0 ? w : L / rem); });
      g._mode = 'rows'; return;
    }
    var cs = columns(P.n); items.forEach(function (it, i) { cs[P.asg[i]].appendChild(it); }); g._mode = 'cols';
  }
  function allMas() { [].forEach.call(document.querySelectorAll(MAS), masonry); }
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(allMas, 120); });
  function all() { [].forEach.call(document.querySelectorAll(SEL), fill); }
  function start() {
    all(); allMas();
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function (es) { es.forEach(function (e) { fill(e.target); }); });
      [].forEach.call(document.querySelectorAll(SEL), function (g) { ro.observe(g); });
    } else window.addEventListener('resize', all);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('load', function () { all(); allMas(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(allMas);
})();
