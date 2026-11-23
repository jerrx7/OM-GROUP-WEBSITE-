/* OM GROUP · 40mm application page scenes (TEMPORARY TEST BUILD, local only).
   Registers more scenes with the scene engine (application-scenes.js), using the toolkit of application-diagrams.js:
   homepage art library for machinery, the project's own photographs for every stone (6/10/20 mm photographed fractions, plus the 40 mm and 60 mm single-stone photographs).
     hero40    macro reveal of one 40 mm stone, camera pull-back to the stockpile, orange nominal-size guide
     sieve40   six-sieve stack (80 / 63 / 40 / 20 / 10 / 4.75 mm); the retained stones change with the selected IS 383 classification
     mass40    cut section through a mass-concrete block: paste, sand and four coarse size classes, each switchable
     blend40   four stockpiles (small / medium / large / very large), a blending hopper and the combined size range of the selected classes
     pour40    large raft placement: pump boom, hose, formwork, reinforcement, concrete placed in layers, vibrator
     heat40    general thermal cut-away of a large concrete block with a time control and a temperature-management switch
     found40   foundation layers: prepared soil, PCC, reinforced foundation
     clear40   open section against congested section for slab, beam, column and foundation, with a 40 mm stone trying to pass
     road40    road layers: subgrade, GSB, base course, surface course, with the role of a 40 mm fraction
     mat40     three material structures (40 mm fraction / GSB / WMM) as separate figures (o.kind)
     drain40   open-graded drainage aggregate against one clogged with fines (o.kind)
   Diagrams only: no mix proportions, no measured gradings, no temperatures, no structural dimensions. */
(function () {
  'use strict';
  var APS = window.APS; if (!APS || !APS.toolkit) return;
  var H = APS.helpers, at = H.at, T = APS.toolkit;
  var F = T.F, stoneSet = T.stoneSet, stoneSym = T.stoneSym, pack = T.pack, lab = T.lab, lead = T.lead;
  var CONC = '#d3cdc2', ORANGE = '#FF5E29', PH = window.innerWidth <= 767;
  // the two larger photographed fractions (single-stone cutouts, img/applications/materials/)
  T.SPR['40'] = [[330, 197], [330, 197]];
  T.SPR['60'] = [[380, 269], [380, 269]];

  /* random non-overlapping placement across a whole box (concrete is filled with stone, not piled at the bottom) */
  function scatter(R, box, items, tries) {
    var placed = [], out = [];
    items.forEach(function (it) {
      var r = it.r;
      for (var n = 0; n < (tries || 90); n++) {
        var x = box[0] + r + R() * (box[1] - box[0] - 2 * r), y = box[2] + r * 0.7 + R() * (box[3] - box[2] - 1.4 * r), ok = true;
        for (var i = 0; i < placed.length; i++) { var p = placed[i], dx = p.x - x, dy = p.y - y, m = (p.r + r) * 0.95; if (dx * dx + dy * dy < m * m) { ok = false; break; } }
        if (ok) { var q = { x: x, y: y, r: r, c: it.c, k: it.k }; placed.push(q); out.push(q); break; }
      }
    });
    return out;
  }
  var kindBy = function (map) { return function (i) { return map[i]; }; };
  var P = function (pts) { return pts.map(function (p) { return F(p[0]) + ' ' + F(p[1]); }).join('L'); };
  function dimH(x0, x1, y, text, ty) { return '<g class="dm"><path class="ln acc" d="M' + F(x0) + ' ' + F(y) + 'H' + F(x1) + 'M' + F(x0) + ' ' + F(y - 5) + 'V' + F(y + 5) + 'M' + F(x1) + ' ' + F(y - 5) + 'V' + F(y + 5) + '"/><text class="lab acc-t dm-t" x="' + F((x0 + x1) / 2) + '" y="' + F(ty) + '">' + text + '</text></g>'; }

  /* ---------- SCENE 01 · hero: one stone, then the stockpile ---------- */
  function hero40(A) {
    var R = A.rng(4001), set = stoneSet(A, 'h4', [45, 38, 33, 28, 22], 2, kindBy(['40', '40', '40', '40', '20']));
    var big = stoneSym('h4big', '40', 0, 66);
    var items = [], rr = [44, 40, 36, 33, 30, 28, 25];
    for (var n = 0; n < 34; n++) { var r = rr[Math.floor(R() * rr.length)]; items.push({ r: r, c: r > 38 ? 0 : r > 34 ? 1 : r > 30 ? 2 : 3, k: n }); }
    var heap = pack(R, [10, 630, 556, 408], items, []);
    var pile = heap.map(function (p, i) { return set.use(p.c, i, p.x, p.y, R() * 360); }).join('');
    var susp = [[84, 150, 2], [150, 86, 3], [532, 96, 3], [572, 196, 2], [92, 262, 4], [556, 296, 4]].map(function (s, i) {
      return '<g class="h4-susp"><g transform="translate(' + s[0] + ' ' + s[1] + ')"><g class="h4-float" style="animation-delay:-' + (i * 0.9) + 's"><use href="#h4' + s[2] + '-' + (i % 2) + '" transform="rotate(' + (i * 47 % 90 - 45) + ')"/></g></g></g>';
    }).join('');
    var defs = '<defs>' + set.defs + big
      + '<radialGradient id="h4bg" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#3a3b40"/><stop offset=".6" stop-color="#1d1e21"/><stop offset="1" stop-color="#0f0f11"/></radialGradient>'
      + '<radialGradient id="h4spot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="h4floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0f11" stop-opacity="0"/><stop offset="1" stop-color="#0f0f11" stop-opacity=".75"/></linearGradient></defs>';
    var guide = '<g class="h4-guide"><path class="h4-gl" pathLength="1" d="M240 300H400M240 291V309M400 291V309" fill="none" stroke="' + ORANGE + '" stroke-width="2.4" stroke-linecap="round"/>'
      + '<text class="h4-t" x="320" y="334" text-anchor="middle">40 MM NOMINAL SIZE</text><text class="h4-s" x="320" y="356" text-anchor="middle">GRADING DESIGNATION · NOT EVERY STONE IS 40 MM</text></g>';
    var markup = defs + '<rect width="640" height="560" fill="url(#h4bg)"/><ellipse cx="320" cy="214" rx="230" ry="190" fill="url(#h4spot)"/>'
      + '<g class="h4-cam"><g class="h4-pile">' + pile + '</g>' + susp
      + '<g class="h4-herowrap" transform="translate(320 196)"><g class="h4-hero"><use href="#h4big"/></g></g>' + guide + '</g>'
      + '<rect y="400" width="640" height="160" fill="url(#h4floor)"/>';
    return { vb: [0, 0, 640, 560], markup: markup };
  }

  /* ---------- SCENE 05 · grading: sieve stack whose retained stones follow the selected classification ---------- */
  function sieve40(A) {
    var R = A.rng(4005), RAD = [5, 8, 12.5, 18, 25], set = stoneSet(A, 'sv4', RAD, 3, kindBy(['10', '10', '20', '40', '60']));
    var SX0 = 88, SX1 = 420, ys = [32, 104, 176, 248, 320, 392], names = ['80 mm', '63 mm', '40 mm', '20 mm', '10 mm', '4.75 mm'];
    // retained stones per sieve for each classification: [size class, count]. Counts show where the material sits, not a measured distribution.
    var MODES = {
      single: [null, [4, 2], [3, 6], [2, 1], null, null],
      graded: [null, null, [3, 1], [2, 4], [1, 4], [0, 4]],
      medium: [null, null, null, [2, 6], null, null],
      large: [null, [4, 3], [3, 4], null, null, null]
    };
    var frameOf = function (y, i) {
      var hot = i === 2;
      return '<rect class="o" fill="url(#a-steelH)" x="' + (SX0 - 12) + '" y="' + (y - 34) + '" width="12" height="58"/><rect class="o" fill="url(#a-steelH)" x="' + SX1 + '" y="' + (y - 34) + '" width="12" height="58"/>'
        + '<rect class="o" fill="url(#a-mesh)" x="' + SX0 + '" y="' + (y - 2) + '" width="' + (SX1 - SX0) + '" height="12"/>'
        + '<rect class="o" fill="url(#a-steelD)" x="' + (SX0 - 12) + '" y="' + (y + 10) + '" width="' + (SX1 - SX0 + 24) + '" height="10"/>'
        + '<rect class="o" fill="url(#' + (hot ? 'a-paint' : 'a-steelD') + ')" x="' + (SX0 - 12) + '" y="' + (y - 34) + '" width="' + (SX1 - SX0 + 24) + '" height="7"/>';
    };
    var stack = ys.map(frameOf).join(''), n = 0, groups = '';
    Object.keys(MODES).forEach(function (m) {
      var g = '';
      MODES[m].forEach(function (c, i) {
        if (!c) return; var r = RAD[c[0]];
        for (var j = 0; j < c[1]; j++) g += set.use(c[0], n++, SX0 + 26 + (j + 0.5) * ((SX1 - SX0 - 52) / c[1]) + (R() - 0.5) * 6, ys[i] - 2 - r * 0.62, R() * 360);
      });
      groups += '<g class="sv-m sv-' + m + '">' + g + '</g>';
    });
    var pan = '<path class="o" fill="url(#a-cone)" d="M' + (SX0 - 40) + ' 462H' + (SX1 + 40) + 'L' + (SX1 + 14) + ' 506H' + (SX0 - 14) + 'Z"/><rect class="o" fill="url(#a-steelD)" x="' + (SX0 - 50) + '" y="456" width="' + (SX1 - SX0 + 100) + '" height="8" rx="2"/>';
    var falls = [150, 230, 310, 390].map(function (x, i) { return H.stones([[x, ys[0] + 14], [x + (i % 2 ? 6 : -6), 452]], { speed: 55, gap: 70, size: [2.6, 4], seed: 41 + i }); }).join('');
    var lx = SX1 + 36, labels = '<g class="lbl">';
    ys.forEach(function (y, i) {
      labels += '<path class="ln' + (i === 2 ? ' acc' : '') + '" d="M' + (SX1 + 14) + ' ' + (y + 4) + 'H' + (lx - 8) + '"/><circle class="' + (i === 2 ? 'ring-on' : 'ring') + '" cx="' + (SX1 + 14) + '" cy="' + (y + 4) + '" r="4"/>'
        + '<text class="lab start' + (i === 2 ? ' acc-t' : '') + '" x="' + lx + '" y="' + (y + 9) + '" style="font-weight:700;letter-spacing:.1em">' + names[i] + '</text>';
    });
    labels += '<text class="lab start faint-t" x="' + lx + '" y="' + (ys[2] + 30) + '">nominal size</text><text class="lab start" x="' + lx + '" y="488" style="font-weight:700;letter-spacing:.1em">PAN</text></g>';
    return { vb: [0, 0, 800, 520], markup: '<defs>' + set.defs + '</defs>' + pan + '<g class="aps-shake">' + stack + '</g>' + groups + '<g class="aps-flow">' + falls + '</g>' + labels };
  }

  /* ---------- SCENE 06 · inside mass concrete: paste, sand and four coarse classes ---------- */
  function mass40(A) {
    var R = A.rng(4006), set = stoneSet(A, 'm4', [6.5, 9, 15, 27, 40], 3, kindBy(['10', '20', '40', '60', '60']));
    var X0 = 24, Y0 = 170, W = 470, Hh = 290, DX = 96, DY = -66;
    var items = [], k = 0, add = function (c, r, n) { for (var i = 0; i < n; i++) items.push({ r: r, c: c, k: k++ }); };
    add(4, 40, 2); add(3, 27, 8); add(2, 15, 20); for (var q = 0; q < 110; q++) add(q % 2 ? 1 : 0, q % 2 ? 9 : 6.5, 1);
    var Pk = scatter(R, [X0 + 4, X0 + W - 4, Y0 + 4, Y0 + Hh - 4], items, 120);
    var cls = ['', '', '', ''], first = {};
    Pk.forEach(function (p, i) { var g = p.c <= 1 ? 0 : p.c - 1; cls[g] += set.use(p.c, i, p.x, p.y, R() * 360); if (!first[g] || p.x > first[g].x) first[g] = p; });
    var cols = ['#b9a98a', '#a8977b', '#8c8576', '#c7b99a', '#9c9588'], fine = '', free = null;
    for (var t = 0, put = 0; t < 2200 && put < 520; t++) {
      var x = X0 + 4 + R() * (W - 8), y = Y0 + 4 + R() * (Hh - 8), ok = true;
      for (var j = 0; j < Pk.length; j++) { var dd = Pk[j].r * 1.12; if ((Pk[j].x - x) * (Pk[j].x - x) + (Pk[j].y - y) * (Pk[j].y - y) < dd * dd) { ok = false; break; } }
      if (!ok) continue; put++;
      fine += '<circle cx="' + F(x) + '" cy="' + F(y) + '" r="' + F(0.9 + R() * 1.3) + '" fill="' + cols[put % cols.length] + '"/>';
      if (!free && put > 60 && x > X0 + 150) free = [x, y];
    }
    var rect = function (a) { return 'x="' + X0 + '" y="' + Y0 + '" width="' + W + '" height="' + Hh + '"' + (a || ''); };
    var top = '<path d="M' + X0 + ' ' + Y0 + 'H' + (X0 + W) + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'H' + (X0 + DX) + 'Z" fill="#c4bfb4" stroke="#232427" stroke-width="1.2"/><path d="M' + X0 + ' ' + Y0 + 'H' + (X0 + W) + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'H' + (X0 + DX) + 'Z" fill="url(#aps-speck)" opacity=".8"/>';
    var side = '<path d="M' + (X0 + W) + ' ' + Y0 + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'V' + (Y0 + Hh + DY) + 'L' + (X0 + W) + ' ' + (Y0 + Hh) + 'Z" fill="#a9a499" stroke="#232427" stroke-width="1.2"/><path d="M' + (X0 + W) + ' ' + Y0 + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'V' + (Y0 + Hh + DY) + 'L' + (X0 + W) + ' ' + (Y0 + Hh) + 'Z" fill="url(#aps-speck)" opacity=".7"/>';
    var section = '<clipPath id="m4-clip"><rect ' + rect() + '/></clipPath><g class="aps-wipe aps-wipe1"><rect ' + rect(' fill="#fff"') + '/>'
      + '<g class="mx-paste"><rect ' + rect(' fill="' + CONC + '"') + '/><rect ' + rect(' fill="url(#aps-speck)" opacity=".55"') + '/></g>'
      + '<g clip-path="url(#m4-clip)"><g class="mx-fine">' + fine + '</g>' + cls.map(function (g, i) { return '<g class="mx-c mx-c' + (i + 1) + '">' + g + '</g>'; }).join('') + '</g>'
      + '<rect ' + rect(' fill="none" stroke="#232427" stroke-width="1.4"') + '/></g>';
    var LX = X0 + W + DX + 20, rows = [
      [3, 'VERY LARGE', '150 – 80 mm', false], [2, 'LARGE', '80 – 40 mm', false], [1, 'MEDIUM', '40 – 20 mm', true], [0, 'SMALL', '20 – 4.75 mm', false]
    ].filter(function (r) { return first[r[0]]; }).sort(function (a, b) { return first[a[0]].y - first[b[0]].y; });
    var labels = '<g class="lbl">' + lab(X0, Y0 - 90, PH ? 'CUT SECTION' : 'CUT SECTION THROUGH A MASS-CONCRETE BLOCK', 'start acc-t');
    rows.forEach(function (r, i) {
      var s = first[r[0]], y = 112 + i * 62, L2 = PH ? 22 : 18;   /* second line further down on phones, where its type is larger */
      labels += lab(LX, y, r[1], 'start call' + (r[3] ? ' acc-t' : '')) + lab(LX, y + L2, r[2], 'start faint-t') + lead('M' + (LX - 8) + ' ' + (y - 4) + 'L' + F(s.x + s.r * 0.55) + ' ' + F(s.y), [s.x + s.r * 0.55, s.y]);
    });
    labels += lab(LX, 368, PH ? 'SAND' : 'FINE AGGREGATE', 'start call') + lab(LX, PH ? 390 : 386, 'sand grains', 'start faint-t') + lead('M' + (LX - 8) + ' 364L' + F(free ? free[0] : X0 + 300) + ' ' + F(free ? free[1] : Y0 + 150), free)
      + lab(LX, 430, PH ? 'PASTE' : 'CEMENT PASTE', 'start call') + lab(LX, PH ? 452 : 448, 'binds it all', 'start faint-t') + lead('M' + (LX - 8) + ' 426L' + F(X0 + W - 18) + ' ' + F(Y0 + Hh - 10), [X0 + W - 18, Y0 + Hh - 10]) + '</g>';
    var med = first[1] || Pk[0];
    return { vb: [0, 50, 800, 430], markup: '<defs>' + set.defs + '</defs><g class="m4-cam">' + top + side + section + '</g>'
      + '<g class="fadein"><rect x="' + (X0 - 5) + '" y="' + (Y0 - 5) + '" width="' + (W + 10) + '" height="' + (Hh + 10) + '" rx="3" fill="none" stroke="' + ORANGE + '" stroke-width="2.4" stroke-dasharray="9 7"/></g>'
      + '<circle class="aps-pulse mx-c mx-c2" cx="' + F(med.x) + '" cy="' + F(med.y) + '" r="' + F(med.r + 8) + '" fill="none" stroke="' + ORANGE + '" stroke-width="2.4"/>' + labels };
  }

  /* ---------- SCENE 07 · four mass-concrete classes blended; the combined size range follows the selection ---------- */
  function blend40(A) {
    var R = A.rng(4007), set = stoneSet(A, 'b4', [5.5, 8, 13, 22, 32], 3, kindBy(['10', '20', '40', '60', '60']));
    var C = [
      { k: 'c1', name: 'SMALL', rng: '20 – 4.75 mm', col: '#7d93a3', lo: 4.75, hi: 20, sizes: [[0, 38], [1, 26]] },
      { k: 'c2', name: 'MEDIUM', rng: '40 – 20 mm', col: ORANGE, lo: 20, hi: 40, sizes: [[2, 19]] },
      { k: 'c3', name: 'LARGE', rng: '80 – 40 mm', col: '#6b6b70', lo: 40, hi: 80, sizes: [[3, 7]] },
      { k: 'c4', name: 'VERY LARGE', rng: '150 – 80 mm', col: '#232427', lo: 80, hi: 150, sizes: [[4, 3]] }
    ];
    var ax0 = 60, ax1 = 740, lg = function (v) { return ax0 + (ax1 - ax0) * Math.log(v / 4.75) / Math.log(150 / 4.75); };
    var BY = 410, BH = 34;
    var panels = '', flows = '', segs = '', ghosts = '', n = 0;
    // type sizes follow --ls (15 on desktop, bigger on phones, which keep their compact labels); desktop is set bolder and darker so it reads at a glance
    var fs = function (k) { return 'font-size:calc(var(--ls) * ' + k + 'px)'; };
    var NAME = PH ? '' : fs(1.3) + ';font-weight:800;letter-spacing:.12em;fill:#141416', RNG = PH ? '' : fs(1.02) + ';font-weight:600;letter-spacing:.1em;fill:#55565b';
    C.forEach(function (c, i) {
      var x = 14 + i * 196, w = 186, y = 40, h = 196, items = [], k = 0;
      c.sizes.forEach(function (s) { for (var j = 0; j < s[1]; j++) items.push({ r: [5.5, 8, 13, 22, 32][s[0]], c: s[0], k: k++ }); });
      var pk = pack(R, [x + 8, x + w - 8, y + h - 8, y + (PH || c.k === 'c4' ? 66 : 72)], items, []);
      var st = pk.map(function (p) { return set.use(p.c, n++, p.x, p.y, R() * 360); }).join('');
      var nameStyle = c.k === 'c2' && !PH ? NAME.replace('fill:#141416', 'fill:#e0490f') : NAME;
      panels += '<g class="b4-p b4-' + c.k + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="14" fill="' + c.col + '" fill-opacity=".1" stroke="' + c.col + '" stroke-opacity=".55" stroke-width="1.5"/>'
        + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="6" rx="3" fill="' + c.col + '"/>' + st
        + '<text class="lab start' + (PH ? ' call' : '') + (c.k === 'c2' ? ' acc-t' : '') + '" x="' + (x + 16) + '" y="' + (y + (PH ? 30 : 36)) + '" style="' + (PH ? 'font-weight:700;letter-spacing:.12em' : nameStyle) + '">' + c.name + '</text><text class="lab start' + (PH ? ' faint-t' : '') + '" x="' + (x + 16) + '" y="' + (y + (PH ? 54 : 60)) + '" style="' + (PH ? fs(.72) + ';fill:#55565b;font-weight:600' : RNG + (c.k === 'c2' ? ';fill:#c4430f' : '')) + '">' + c.rng + '</text></g>';
      flows += '<g class="b4-f b4-' + c.k + '">' + H.stones([[x + w / 2, y + h + 2], [x + w / 2, y + h + 22], [400, 280]], { speed: 40, gap: 26, size: [2.4, 4.2], seed: 61 + i }) + '</g>';
      var sx0 = lg(c.lo), sx1 = lg(c.hi);
      segs += '<g class="b4-seg b4-' + c.k + '"><rect x="' + F(sx0) + '" y="' + BY + '" width="' + F(sx1 - sx0) + '" height="' + BH + '" fill="' + c.col + '"/><text class="lab' + (PH ? ' call' : '') + '" x="' + F((sx0 + sx1) / 2) + '" y="' + (BY + BH * .66) + '" style="fill:#fff;font-weight:700;letter-spacing:.1em' + (PH ? '' : ';' + fs(1.08)) + '">' + (PH ? { c1: 'SMALL', c2: 'MED', c3: 'LARGE', c4: 'V.LARGE' }[c.k] : c.name) + '</text></g>';
      ghosts += '<rect x="' + F(sx0) + '" y="' + BY + '" width="' + F(sx1 - sx0) + '" height="' + BH + '" fill="none" stroke="' + c.col + '" stroke-opacity=".55" stroke-dasharray="5 4"/>';
    });
    var hopper = '<path class="o" fill="url(#a-steelD)" d="M322 262H478L436 320H364Z"/><rect class="o" fill="url(#a-paint)" x="316" y="255" width="168" height="10" rx="3.5"/><rect class="o" fill="url(#a-steelH)" x="385" y="320" width="30" height="13"/>';
    var out = '<path class="ln acc" d="M400 366V' + (BY - 12) + '"/><path d="M393 ' + (BY - 22) + 'l7 10l7 -10" fill="none" stroke="' + ORANGE + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    var tickStyle = ' style="' + fs(PH ? .68 : 1.0) + ';font-weight:700;letter-spacing:.06em;fill:#2a2b2e"';
    var ticks = [4.75, 20, 40, 80, 150].map(function (v) { var x = lg(v); return '<path class="ln" d="M' + F(x) + ' ' + (BY + BH) + 'V' + (BY + BH + 9) + '"/><text class="lab" x="' + F(x) + '" y="' + (BY + BH + 31) + '"' + tickStyle + '>' + v + (v === 150 ? ' mm' : '') + '</text>'; }).join('');
    var heads = '<text class="lab start card-s" x="' + ax0 + '" y="' + (BY - 8) + '"' + (PH ? '' : ' style="' + fs(.84) + ';fill:#55565b;font-weight:700"') + '>COMBINED SIZE RANGE</text><text class="lab start faint-t" x="' + (ax0 + 250) + '" y="' + (BY - 8) + '" style="display:none">log scale</text>'
      + '<text class="lab" x="400" y="358" style="font-weight:700;letter-spacing:.14em' + (PH ? '' : ';' + fs(1.22) + ';fill:#2a2b2e') + '">BLENDING SYSTEM</text><text class="lab faint-t" x="400" y="' + (BY + BH + 56) + '"' + (PH ? '' : ' style="' + fs(.8) + ';fill:#6b6c70;font-weight:600"') + '>' + (PH ? 'LOG SCALE · IS 383 TABLE 8' : 'LOG SCALE · CLASS RANGES FROM IS 383:2016 TABLE 8 · NO PROPORTIONS IMPLIED') + '</text>';
    return { vb: [0, 0, 800, 510], markup: '<defs>' + set.defs + '</defs>' + panels + '<g class="aps-flow">' + flows + '</g>' + hopper + out + ghosts + segs + ticks + heads };
  }

  /* ---------- SCENE 08 · a large raft placed in layers ---------- */
  function pour40(A) {
    var R = A.rng(4008), set = stoneSet(A, 'pr', [9.5], 3, kindBy(['40']));
    var GY = 250, FL = 380, X0 = 120, X1 = 680, TM = A.transitMixer('pr');
    var soil = '<rect x="0" y="' + GY + '" width="' + X0 + '" height="200" fill="#e4d9c6"/><rect x="' + X1 + '" y="' + GY + '" width="' + (800 - X1) + '" height="200" fill="#e4d9c6"/><rect x="' + X0 + '" y="' + FL + '" width="' + (X1 - X0) + '" height="70" fill="#d9cbb2"/>'
      + '<rect x="0" y="' + GY + '" width="800" height="200" fill="url(#aps-hatch)" opacity=".28"/><rect x="' + X0 + '" y="' + GY + '" width="' + (X1 - X0) + '" height="' + (FL - GY) + '" fill="#faf8f3"/><path class="ln" d="M0 ' + GY + 'H' + X0 + 'V' + FL + 'H' + X1 + 'V' + GY + 'H800"/>';
    var lifts = '', ids = [[352, 380], [324, 352], [296, 324]];
    ids.forEach(function (y, i) {
      var st = '';
      for (var j = 0; j < 11; j++) st += set.use(0, j, X0 + 40 + R() * (X1 - X0 - 80), y[0] + 14 + R() * 6, R() * 360);
      var tint = ['#c8c1b4', '#d3cdc1', '#ded9cf'][i];
      lifts += '<g class="pr-l pr-l' + (i + 1) + '"><rect x="' + (X0 + 2) + '" y="' + y[0] + '" width="' + (X1 - X0 - 4) + '" height="' + (y[1] - y[0]) + '" fill="' + tint + '"/><path d="M' + (X0 + 2) + ' ' + y[0] + 'H' + (X1 - 2) + '" stroke="#232427" stroke-width=".9" opacity=".35"/><circle cx="' + (X0 + 18) + '" cy="' + (y[0] + 14) + '" r="9" fill="#fff" stroke="#232427" stroke-width="1"/><text class="lab" x="' + (X0 + 18) + '" y="' + (y[0] + 18) + '" style="font-weight:700;letter-spacing:0;fill:#232427">' + (i + 1) + '</text><rect x="' + (X0 + 2) + '" y="' + y[0] + '" width="' + (X1 - X0 - 4) + '" height="' + (y[1] - y[0]) + '" fill="url(#aps-speck)" opacity=".65"/>' + st + '</g>';
    });
    var bars = '<path d="M' + (X0 + 14) + ' 366H' + (X1 - 14) + 'M' + (X0 + 14) + ' 322H' + (X1 - 14) + '" stroke="#8a4a2a" stroke-width="2" opacity=".55"/>';
    for (var b = 0; b < 25; b++) bars += '<circle cx="' + (X0 + 26 + b * 21.5) + '" cy="366" r="3.4" fill="#8a4a2a"/><circle cx="' + (X0 + 26 + b * 21.5) + '" cy="322" r="3.4" fill="#8a4a2a"/>';
    [250, 400, 550].forEach(function (x) { bars += '<path d="M' + (x - 9) + ' 366V226M' + (x + 9) + ' 366V226" stroke="#8a4a2a" stroke-width="3.2" stroke-linecap="round"/>'; for (var t = 0; t < 4; t++) bars += '<path d="M' + (x - 9) + ' ' + (330 - t * 28) + 'H' + (x + 9) + '" stroke="#8a4a2a" stroke-width="1.8"/>'; });
    var form = function (x, d) { return '<g><rect x="' + x + '" y="292" width="8" height="92" fill="#c8a574" stroke="#232427" stroke-width="1"/><path d="M' + (x + 4) + ' 292V384" stroke="#232427" stroke-width=".6" opacity=".4"/><path class="ln" d="M' + (x + (d > 0 ? 8 : 0)) + ' 330L' + (x + d * 30) + ' ' + GY + '" /></g>'; };
    var forms = form(X0 - 8, -1) + form(X1, 1);
    // pump truck (right) and boom: the hose tip is fixed over the placing point
    var tip = [500, 120], pivot = [736, 238];
    var truck = '<rect class="o" fill="url(#a-steelD)" x="708" y="214" width="84" height="28" rx="3"/><rect class="o" fill="url(#a-paint)" x="708" y="206" width="52" height="10" rx="2"/><path class="o" fill="url(#a-steelH)" d="M760 206h26l6 20v16h-32z"/><circle cx="728" cy="246" r="9" fill="#232427"/><circle cx="772" cy="246" r="9" fill="#232427"/><circle cx="728" cy="246" r="3" fill="#8e8e8e"/><circle cx="772" cy="246" r="3" fill="#8e8e8e"/>';
    var boom = '<path d="M' + P([pivot, [706, 150], [584, 122], tip]) + '" fill="none" stroke="#232427" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M' + P([pivot, [706, 150], [584, 122], tip]) + '" fill="none" stroke="#e24a1b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + pivot[0] + '" cy="' + pivot[1] + '" r="7" fill="#3a3c40"/><circle cx="706" cy="150" r="5" fill="#3a3c40"/><circle cx="584" cy="122" r="5" fill="#3a3c40"/>';
    var hose = '<path class="pr-hose" d="M' + tip[0] + ' ' + tip[1] + 'C' + tip[0] + ' 170 ' + (tip[0] - 4) + ' 230 ' + (tip[0] - 2) + ' 292" fill="none" stroke="#232427" stroke-width="9" stroke-linecap="round"/><path class="pr-pour" d="M' + (tip[0] - 2) + ' 296V320" stroke="' + CONC + '" stroke-width="9" stroke-linecap="round" fill="none"/>';
    var tm = '<g transform="translate(-8 ' + GY + ') scale(.34)">' + TM.body + '<g class="aps-drum">' + TM.drum + '</g>' + TM.wheels + TM.fenders + '</g>';
    var vib = '<g class="pr-vib"><g class="aps-shake"><rect class="o" fill="url(#a-steelV)" x="296" y="238" width="7" height="68" rx="3"/><rect class="o" fill="url(#a-paint)" x="293" y="232" width="13" height="12" rx="3"/></g></g>';
    var ground = '<rect class="aps-ground" x="0" y="' + GY + '" width="' + X0 + '" height="7"/><rect class="aps-ground" x="' + X1 + '" y="' + GY + '" width="' + (800 - X1) + '" height="7"/>';
    var labs = '<g class="lbl">'
      + lab(24, 200, 'FORMWORK', 'start call') + lead('M60 206L' + (X0 - 4) + ' 306', [X0 - 4, 306])
      + lab(150, 156, 'REINFORCEMENT', 'start call') + lead('M190 162L172 322', [172, 322])
      + lab(330, 156, PH ? 'LAYERS' : 'CONCRETE LAYERS', 'start call') + lead('M366 162L350 344', [350, 344])
      + lab(PH ? 540 : 560, 84, PH ? 'PUMP BOOM' : 'PUMP BOOM AND HOSE', 'start call') + lead('M600 90L560 122', [560, 122]) + '</g><g class="pr-vlab lbl">' + lab(318, 222, 'COMPACTION', 'start call') + '</g>';
    var scale = '<text class="lab faint-t" x="400" y="440">' + (PH ? 'NOT TO SCALE' : 'LARGE PLACEMENT · NOT TO SCALE') + '</text>';
    return { vb: [0, 70, 800, 380], markup: '<defs>' + set.defs + '</defs><g class="pr-cam">' + soil + lifts + bars + forms + ground + tm + truck + boom + hose + vib + labs + '</g>' + scale };
  }

  /* ---------- SCENE 09 · concept: heat in a large section (no temperatures) ---------- */
  function heat40(A) {
    var R = A.rng(4009), set = stoneSet(A, 'ht', [8, 13, 20], 3, kindBy(['20', '40', '60']));
    var X0 = 50, Y0 = 176, W = 380, Hh = 236, DX = 70, DY = -50, cx = X0 + W / 2, cy = Y0 + Hh / 2 + 6;
    var items = [], k = 0; for (var i = 0; i < 5; i++) items.push({ r: 20, c: 2, k: k++ }); for (i = 0; i < 18; i++) items.push({ r: 13, c: 1, k: k++ }); for (i = 0; i < 60; i++) items.push({ r: 8, c: 0, k: k++ });
    var pk = scatter(R, [X0 + 4, X0 + W - 4, Y0 + 4, Y0 + Hh - 4], items, 120);
    var st = pk.map(function (p, j) { return set.use(p.c, j, p.x, p.y, R() * 360); }).join('');
    var rect = function (a) { return 'x="' + X0 + '" y="' + Y0 + '" width="' + W + '" height="' + Hh + '"' + (a || ''); };
    var top = '<path d="M' + X0 + ' ' + Y0 + 'H' + (X0 + W) + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'H' + (X0 + DX) + 'Z" fill="#c4bfb4" stroke="#232427" stroke-width="1.2"/><path d="M' + X0 + ' ' + Y0 + 'H' + (X0 + W) + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'H' + (X0 + DX) + 'Z" fill="url(#aps-speck)" opacity=".7"/>';
    var side = '<path d="M' + (X0 + W) + ' ' + Y0 + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'V' + (Y0 + Hh + DY) + 'L' + (X0 + W) + ' ' + (Y0 + Hh) + 'Z" fill="#a9a499" stroke="#232427" stroke-width="1.2"/>';
    var ell = function (rx, ry) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>'; };
    var defs = '<defs><clipPath id="ht-clip"><rect ' + rect() + '/></clipPath>'
      + '<radialGradient id="ht-core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e8401f" stop-opacity=".95"/><stop offset=".4" stop-color="#f07c27" stop-opacity=".65"/><stop offset=".78" stop-color="#f6c36a" stop-opacity=".28"/><stop offset="1" stop-color="#f6c36a" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="ht-leg" x1="0" x2="1"><stop offset="0" stop-color="#3b8fd0"/><stop offset=".5" stop-color="#f6c36a"/><stop offset="1" stop-color="#e8401f"/></linearGradient>' + set.defs + '</defs>';
    var section = '<g clip-path="url(#ht-clip)"><rect ' + rect(' fill="' + CONC + '"') + '/><rect ' + rect(' fill="url(#aps-speck)" opacity=".5"') + '/>' + st
      + '<g class="ht-skin"><rect x="' + (X0 + 8) + '" y="' + (Y0 + 8) + '" width="' + (W - 16) + '" height="' + (Hh - 16) + '" fill="none" stroke="#3b8fd0" stroke-width="16" stroke-opacity=".32"/><rect x="' + (X0 + 20) + '" y="' + (Y0 + 20) + '" width="' + (W - 40) + '" height="' + (Hh - 40) + '" fill="none" stroke="#3b8fd0" stroke-width="12" stroke-opacity=".16"/></g>'
      + '<ellipse class="ht-core" cx="' + cx + '" cy="' + cy + '" rx="' + (W * 0.56) + '" ry="' + (Hh * 0.62) + '" fill="url(#ht-core)"/>'
      + '<g class="ht-con" fill="none" stroke-width="1.6" stroke-dasharray="6 5"><g stroke="#c2380f">' + ell(42, 30) + '</g><g stroke="#e0742a">' + ell(92, 66) + '</g><g stroke="#c9a23a">' + ell(142, 100) + '</g><g stroke="#4f98c9">' + ell(186, 132) + '</g></g>'
      + '<g class="ht-mgmt" fill="none" stroke="#3b8fd0" stroke-width="3" stroke-linecap="round">' + [Y0 + 56, cy, Y0 + Hh - 40].map(function (y) { return '<path class="ht-pipe" d="M' + (X0 + 24) + ' ' + y + 'q18 -12 36 0t36 0t36 0t36 0t36 0t36 0t36 0t36 0t36 0t36 0" stroke-dasharray="3 7"/>'; }).join('') + '</g></g>'
      + '<rect ' + rect(' fill="none" stroke="#232427" stroke-width="1.4"') + '/>';
    var wrap = '<g class="ht-mgmt"><path d="M' + (X0 - 4) + ' ' + (Y0 - 2) + 'H' + (X0 + W + 4) + 'L' + (X0 + W + DX + 4) + ' ' + (Y0 + DY - 2) + 'H' + (X0 + DX - 4) + 'Z" fill="none" stroke="#3a3c40" stroke-width="5" stroke-linejoin="round" opacity=".8"/></g>';
    var sensors = '<g><circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#fff" stroke="#232427" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="2.6" fill="' + ORANGE + '"/><circle cx="' + (X0 + 14) + '" cy="' + cy + '" r="5" fill="#fff" stroke="#232427" stroke-width="2"/><circle cx="' + (X0 + 14) + '" cy="' + cy + '" r="2.2" fill="#3b8fd0"/>'
      + '<path class="ht-dt" d="M' + (X0 + 22) + ' ' + cy + 'H' + (cx - 10) + '" fill="none" stroke="' + ORANGE + '" stroke-linecap="round"/><path class="ht-dt-h" d="M' + (cx - 20) + ' ' + (cy - 7) + 'l10 7l-10 7" fill="none" stroke="' + ORANGE + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>';
    var labels = '<g class="lbl">' + lab(X0, Y0 - 84, PH ? 'NO READINGS': 'CUT SECTION · NO TEMPERATURES SHOWN', 'start acc-t')
      // phones: DIFFERENCE sits above the arrow and CORE under its sensor, so the larger type does not collide
      + lab(cx + 18, PH ? cy + 28 : cy - 20, 'CORE', 'start call') + lab(X0 + 22, cy + 28, PH ? 'SURFACE' : 'NEAR THE SURFACE', 'start call') + lab(PH ? X0 + 24 : cx - 94, cy - 14, PH ? 'DIFFERENCE' : 'TEMPERATURE DIFFERENCE', 'start acc-t') + '</g>';
    // general curves: core, surface, and the same with temperature management (both hidden unless the switch is on)
    var CX0 = PH ? 110 : 562, CY0 = PH ? 492 : 130, CW = PH ? 580 : 216, CH = PH ? 150 : 118;
    var curve = function (p) { return '<path d="M' + p.map(function (q) { return F(CX0 + q[0] * CW) + ' ' + F(CY0 + CH - q[1] * CH); }).join('L') + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; };
    var core = [], skin = [], coreM = [], skinM = [];
    for (var t = 0; t <= 20; t++) { var u = t / 20; var h = Math.pow(Math.sin(Math.min(u / 0.55, 1) * Math.PI / 2), 1.2) * (u < 0.55 ? 1 : Math.exp(-(u - 0.55) * 2.1)); core.push([u, 0.12 + 0.8 * h]); skin.push([u, 0.12 + 0.5 * Math.pow(Math.sin(Math.min(u / 0.62, 1) * Math.PI / 2), 1.3) * (u < 0.62 ? 1 : Math.exp(-(u - 0.62) * 2.4))]); coreM.push([u, 0.12 + 0.5 * h]); skinM.push([u, 0.12 + 0.4 * Math.pow(Math.sin(Math.min(u / 0.6, 1) * Math.PI / 2), 1.3) * (u < 0.6 ? 1 : Math.exp(-(u - 0.6) * 2.3))]); }
    var g = function (cls, c, d, pts) { return '<g class="' + cls + '" stroke="' + c + '" stroke-width="2.6"' + (d ? ' stroke-dasharray="6 5"' : '') + '>' + curve(pts) + '</g>'; };
    var chart = '<g><text class="lab start card-s" x="' + CX0 + '" y="' + (CY0 - 22) + '">CORE VS SURFACE</text><path class="ln" d="M' + CX0 + ' ' + (CY0 - 6) + 'V' + (CY0 + CH) + 'H' + (CX0 + CW) + '"/><text class="lab faint-t" x="' + (CX0 + CW / 2) + '" y="' + (CY0 + CH + 22) + '">TIME AFTER PLACING →</text>'
      + (PH ? '<text class="lab faint-t ht-ax" x="' + (CX0 + CW) + '" y="' + (CY0 - 22) + '" style="text-anchor:end">↑ RELATIVE TEMPERATURE</text>'
        : '<text class="lab faint-t" x="' + (CX0 - 12) + '" y="' + (CY0 + CH / 2) + '" transform="rotate(-90 ' + (CX0 - 12) + ' ' + (CY0 + CH / 2) + ')">RELATIVE TEMPERATURE</text>')
      + '<g class="ht-ch ht-ch-off">' + g('', '#e8401f', false, core) + g('', '#3b8fd0', false, skin) + '</g><g class="ht-ch ht-ch-on">' + g('', '#e8401f', true, coreM) + g('', '#3b8fd0', true, skinM) + '</g>'
      + '<g class="ht-cur" style="--cw:' + (CW / 100) + '"><path d="M' + CX0 + ' ' + (CY0 - 4) + 'V' + (CY0 + CH) + '" stroke="' + ORANGE + '" stroke-width="2" stroke-dasharray="3 4"/><circle cx="' + CX0 + '" cy="' + (CY0 - 4) + '" r="4.5" fill="' + ORANGE + '"/></g>'
      + '<rect x="' + CX0 + '" y="' + (CY0 + CH + 56) + '" width="' + CW + '" height="12" rx="6" fill="url(#ht-leg)"/><text class="lab start faint-t" x="' + CX0 + '" y="' + (CY0 + CH + 90) + '">COOLER</text><text class="lab faint-t" x="' + (CX0 + CW) + '" y="' + (CY0 + CH + 90) + '" style="text-anchor:end">HOTTER</text><text class="lab start faint-t" x="' + CX0 + '" y="' + (CY0 + CH + (PH ? 120 : 110)) + '">COLOUR = RELATIVE, NO READINGS</text>'
      + (function () { var ly = CY0 + CH + (PH ? 150 : 130), sx = PH ? 120 : 76; return '<g><circle cx="' + (CX0 + 6) + '" cy="' + ly + '" r="4" fill="#e8401f"/><text class="lab start faint-t" x="' + (CX0 + 18) + '" y="' + (ly + 4) + '">core</text><circle cx="' + (CX0 + sx) + '" cy="' + ly + '" r="4" fill="#3b8fd0"/><text class="lab start faint-t" x="' + (CX0 + sx + 12) + '" y="' + (ly + 4) + '">surface</text></g></g>'; })();
    return { vb: PH ? [0, 50, 800, 770] : [0, 50, 800, 430], markup: defs + top + side + section + wrap + sensors + labels + chart };
  }

  /* ---------- SCENE 10 · foundation: soil, PCC, reinforced foundation ---------- */
  function found40(A) {
    var R = A.rng(4010), set = stoneSet(A, 'fd', [11], 3, kindBy(['40']));
    var GY = 130, FL = 360, X0 = 150, X1 = 650;
    var soil = '<rect x="0" y="' + GY + '" width="800" height="320" fill="#e4d9c6"/><rect x="0" y="' + GY + '" width="800" height="320" fill="url(#aps-hatch)" opacity=".3"/><rect x="' + X0 + '" y="' + GY + '" width="' + (X1 - X0) + '" height="' + (FL - GY) + '" fill="#faf8f3"/><path class="ln" d="M0 ' + GY + 'H' + X0 + 'V' + FL + 'H' + X1 + 'V' + GY + 'H800"/>';
    var sub = '<g class="fd fd-1"><rect x="' + (X0 - 1) + '" y="' + FL + '" width="' + (X1 - X0 + 2) + '" height="30" fill="#bfae8f"/><rect x="' + (X0 - 1) + '" y="' + FL + '" width="' + (X1 - X0 + 2) + '" height="30" fill="url(#aps-speck)" opacity=".7"/></g>';
    var st = ''; for (var i = 0; i < 17; i++) st += set.use(0, i, X0 + 30 + R() * (X1 - X0 - 60), 304 + R() * 40, R() * 360);
    var pcc = '<g class="fd fd-2"><rect x="' + (X0 + 1) + '" y="290" width="' + (X1 - X0 - 2) + '" height="70" fill="' + CONC + '"/><rect x="' + (X0 + 1) + '" y="290" width="' + (X1 - X0 - 2) + '" height="70" fill="url(#aps-speck)" opacity=".6"/>' + st + '<circle class="aps-pulse" cx="520" cy="326" r="20" fill="none" stroke="' + ORANGE + '" stroke-width="2.2"/></g>';
    var rs = ''; for (i = 0; i < 13; i++) rs += set.use(0, i + 20, X0 + 40 + R() * (X1 - X0 - 80), 220 + R() * 50, R() * 360);
    var bars = ''; for (i = 0; i < 12; i++) bars += '<circle cx="' + (X0 + 34 + i * 40) + '" cy="276" r="4.6" fill="#8a4a2a"/><circle cx="' + (X0 + 34 + i * 40) + '" cy="204" r="4.6" fill="#8a4a2a"/>';
    var colBars = [380, 420].map(function (x) { return '<path d="M' + x + ' 280V82" stroke="#8a4a2a" stroke-width="4" stroke-linecap="round"/>'; }).join('') + [110, 140, 170, 200].map(function (y) { return '<path d="M380 ' + y + 'H420" stroke="#8a4a2a" stroke-width="2"/>'; }).join('');
    var raft = '<g class="fd fd-3"><rect x="' + (X0 + 1) + '" y="190" width="' + (X1 - X0 - 2) + '" height="100" fill="' + CONC + '"/><rect x="' + (X0 + 1) + '" y="190" width="' + (X1 - X0 - 2) + '" height="100" fill="url(#aps-speck)" opacity=".6"/>' + rs
      + '<rect x="372" y="86" width="56" height="106" fill="' + CONC + '"/><rect x="372" y="86" width="56" height="106" fill="url(#aps-speck)" opacity=".6"/>' + bars + colBars + '<circle class="aps-pulse" cx="270" cy="244" r="20" fill="none" stroke="' + ORANGE + '" stroke-width="2.2"/></g>';
    var labs = '<g class="lbl"><g class="fd fd-1">' + lab(664, 380, 'PREPARED', 'start call') + lab(664, 398, 'SUBGRADE', 'start call') + lead('M658 380L630 375', [630, 375]) + '</g>'
      + '<g class="fd fd-2">' + lab(664, 322, PH ? 'PCC' : 'PCC LAYER', 'start call') + lab(664, 340, 'no reinforcement', 'start faint-t') + lead('M658 318L626 322', [626, 322]) + '</g>'
      + '<g class="fd fd-3">' + lab(664, 232, 'REINFORCED', 'start call') + lab(664, 250, 'FOUNDATION', 'start call') + lead('M658 238L626 244', [626, 244]) + '</g></g>';
    var dim = '<g class="fd fd-2"><g class="dm"><path class="ln acc" d="M126 290V360M121 290H131M121 360H131"/><text class="lab acc-t dm-t start" x="28" y="330">LAYER</text><text class="lab acc-t dm-t start" x="28" y="350">' + (PH ? 'DEPTH' : 'THICKNESS') + '</text></g></g>';
    return { vb: [0, 66, 800, 394], markup: '<defs>' + set.defs + '</defs>' + soil + sub + pcc + raft + dim + labs };
  }

  /* ---------- SCENE 11 · clearance: the same member, open and congested, with a 40 mm stone ---------- */
  function clear40(A) {
    var set = stoneSet(A, 'cl', [16], 3, kindBy(['40']));
    var bar = function (x, y, d) { return '<circle class="rb" cx="' + F(x) + '" cy="' + F(y) + '" r="' + F(d / 2) + '"/>'; };
    var row = function (n, sp, y, d) { var s = '', x0 = -(n - 1) * sp / 2; for (var i = 0; i < n; i++) s += bar(x0 + i * sp, y, d); return s; };
    // each variant: concrete outline (w x h), bars, dashed ties, the stone's start and end offsets from its resting point, and whether it is blocked
    var V = {
      slab: {
        open: { w: 300, h: 190, bars: row(4, 78, 62, 14) + row(4, 78, -62, 14) + '<path class="tie" d="M-129 -69V69M-51 -69V69M27 -69V69M105 -69V69" />', end: [0, 78], from: [0, -130], blk: false, s: [-39, 62, 39, 62], t: 1 },
        cong: { w: 300, h: 110, bars: row(7, 34, 32, 14) + row(7, 34, -32, 14), end: [0, -51], from: [0, -130], blk: true, s: [-34, 32, 0, 32], t: 1 }
      },
      beam: {
        open: { w: 220, h: 290, bars: row(3, 76, 108, 18) + row(2, 152, -108, 14) + '<rect class="tie" x="-82" y="-117" width="164" height="234" rx="8"/>', end: [-38, 128], from: [-38, -150], blk: false, s: [-76, 108, 0, 108], t: 1 },
        cong: { w: 130, h: 230, bars: row(4, 28, 88, 18) + row(2, 84, -88, 14) + '<rect class="tie" x="-47" y="-97" width="94" height="194" rx="6"/>', end: [0, 66], from: [0, -150], blk: true, s: [-14, 88, 14, 88], t: 1 }
      },
      column: {
        open: { w: 300, h: 300, bars: [[-91, -91], [0, -91], [91, -91], [-91, 0], [91, 0], [-91, 91], [0, 91], [91, 91]].map(function (p) { return bar(p[0], p[1], 18); }).join('') + '<rect class="tie" x="-91" y="-91" width="182" height="182" rx="6"/>', end: [-45, -126], from: [0, 0], blk: false, s: [-91, -91, 0, -91], t: 0 },
        cong: { w: 170, h: 170, bars: (function () { var s = '', i; for (i = -2; i <= 2; i++) { s += bar(i * 30, -52, 16) + bar(i * 30, 52, 16); } for (i = -1; i <= 1; i++) { s += bar(-60, i * 30 + (i ? 0 : 0), 16) + bar(60, i * 30, 16); } return s + '<rect class="tie" x="-60" y="-52" width="120" height="104" rx="5"/>'; })(), end: [0, -30], from: [0, 8], blk: true, s: [-30, -52, 0, -52], t: 0 }
      },
      foundation: {
        open: { w: 340, h: 230, bars: row(4, 90, 82, 16) + row(4, 90, -82, 16), end: [0, 100], from: [0, -150], blk: false, s: [-45, 82, 45, 82], t: 1 },
        cong: { w: 340, h: 230, bars: row(8, 38, 82, 16) + row(8, 38, -82, 16) + row(8, 38, 40, 16), end: [0, -123], from: [0, -150], blk: true, s: [-19, 82, 19, 82], t: 1 }
      }
    };
    var out = '';
    Object.keys(V).forEach(function (m) {
      ['open', 'cong'].forEach(function (kind, i) {
        var v = V[m][kind], cx = 0, cy = 0, SC = { slab: 1.08, beam: 0.98, column: 1.0, foundation: 0.95 }[m], PX = PH ? 200 : (i ? 600 : 200), PY = PH ? (i ? 726 : 266) : 266;
        var stone = '<g transform="translate(' + (cx + v.end[0]) + ' ' + (cy + v.end[1]) + ')"><g class="cl-stone' + (v.blk ? ' cl-blk' : '') + '" style="--dx:' + (v.from[0] - v.end[0]) + 'px;--dy:' + (v.from[1] - v.end[1]) + 'px">' + set.use(0, m.length + i, 0, 0, 20 + i * 40) + '</g></g>';
        var mark = v.blk ? '<g class="cl-x" transform="translate(' + (cx + v.end[0] + 26) + ' ' + (cy + v.end[1] - 24) + ')"><circle r="11" fill="' + ORANGE + '"/><path d="M-4.5 -4.5l9 9M4.5 -4.5l-9 9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g>' : '<g class="cl-x" transform="translate(' + (cx + v.end[0] + 26) + ' ' + (cy + v.end[1] - 24) + ')"><circle r="11" fill="#2e7d4f"/><path d="M-5 0l3.4 4l6.6 -8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>';
        // spacing marker: a bracket between the two bars next to the stone's path
        var sp = v.s, br = '<g class="dm"><path class="ln acc" d="M' + F(cx + sp[0]) + ' ' + F(cy + sp[1] + (sp[1] > 0 ? 26 : -26)) + 'H' + F(cx + sp[2]) + 'M' + F(cx + sp[0]) + ' ' + F(cy + sp[1] + (sp[1] > 0 ? 21 : -21)) + 'V' + F(cy + sp[1] + (sp[1] > 0 ? 31 : -31)) + 'M' + F(cx + sp[2]) + ' ' + F(cy + sp[1] + (sp[1] > 0 ? 21 : -21)) + 'V' + F(cy + sp[1] + (sp[1] > 0 ? 31 : -31)) + '"/></g>';
        out += '<g class="cl-m cl-' + m + '"><g transform="translate(' + PX + ' ' + PY + ') scale(' + SC + ')"><g transform="translate(' + cx + ' ' + cy + ')"><rect class="cs" x="' + (-v.w / 2) + '" y="' + (-v.h / 2) + '" width="' + v.w + '" height="' + v.h + '" rx="2"/>' + v.bars + '</g>' + br + stone + mark + '</g></g>';
      });
    });
    var heads = PH
      ? '<text class="lab card-t" x="200" y="60">Open section</text><text class="lab card-s" x="200" y="82">GENEROUS CLEARANCE</text><path class="ln faint" d="M30 484H370"/><text class="lab card-t hot" x="200" y="520">Congested section</text><text class="lab card-s" x="200" y="542">LITTLE CLEARANCE</text>'
      : '<text class="lab card-t" x="200" y="62">Open section</text><text class="lab card-s" x="200" y="82">GENEROUS CLEARANCE</text><text class="lab card-t hot" x="600" y="62">Congested section</text><text class="lab card-s" x="600" y="82">LITTLE CLEARANCE</text><path class="ln faint" d="M400 40V470"/>';
    var foot = '<text class="lab faint-t" x="' + (PH ? 200 : 400) + '" y="' + (PH ? 954 : 466) + '">' + (PH ? 'SAME SCALE' : 'A 40 MM STONE IS DRAWN AT THE SAME SCALE IN BOTH · NOT A DESIGN CHECK') + '</text>';
    return { vb: PH ? [0, 20, 400, 950] : [0, 20, 800, 460], markup: '<defs>' + set.defs + '</defs>' + heads + out + foot };
  }

  /* ---------- SCENE 12 · road layers, with the role of a 40 mm fraction ---------- */
  function road40(A) {
    var R = A.rng(4012), set = stoneSet(A, 'rd', [5, 8, 15], 3, kindBy(['10', '20', '40']));
    var x = 24, w = 470, band = function (y, h, fill, extra) { return '<rect class="o" fill="' + fill + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>' + (extra || ''); };
    var sb = function (y, h, c, nx, ny, seed, dx) { var s = '', r = A.rng(seed); for (var a = 0; a < nx; a++) for (var b = 0; b < ny; b++) s += set.use(c, a * ny + b, x + (a + 0.5) * w / nx + (r() - 0.5) * (dx || 8), y + (b + 0.5) * h / ny + (r() - 0.5) * 5, r() * 360); return s; };
    var cp = function (id, y, h) { return '<clipPath id="rd' + id + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></clipPath>'; };
    var spk = function (y, h) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#aps-speck)" opacity=".8"/>'; };
    var L = '<g class="aps-b aps-b1">' + band(352, 78, '#c9b79c', '<rect x="' + x + '" y="352" width="' + w + '" height="78" fill="url(#aps-hatch)" opacity=".4"/>') + '</g>'
      + '<g class="aps-b aps-b2">' + band(262, 90, '#bdb7ab') + spk(262, 90) + '<g clip-path="url(#rdg)">' + sb(262, 90, 1, 17, 3, 4, 8) + sb(262, 90, 2, 6, 1, 9, 30) + '</g></g>'
      + '<g class="aps-b aps-b3">' + band(196, 66, '#a8a398') + spk(196, 66) + '<g clip-path="url(#rdb)">' + sb(196, 66, 0, 40, 2, 11, 8) + '</g></g>'
      + '<g class="aps-b aps-b4">' + band(160, 36, '#26272a') + '<rect x="' + x + '" y="160" width="' + w + '" height="36" fill="url(#aps-speck)" opacity=".3"/></g>';
    var nm = function (y, t, l) { return '<text class="lab start pv-n" x="' + (x + 14) + '" y="' + y + '" style="fill:' + (l ? '#fff' : '#2e2f33') + ';stroke:' + (l ? '#141416' : '#fff') + '">' + t + '</text>'; };
    var names = nm(184, 'SURFACE COURSE', true) + nm(234, 'BASE COURSE (WMM)') + nm(310, 'GRANULAR SUB-BASE (GSB)') + nm(396, 'SUBGRADE / EMBANKMENT');
    var lensCx = 650, lensCy = 250, lr = 112, g = A.rng(4013), zoom = '<clipPath id="rdz"><circle cx="' + lensCx + '" cy="' + lensCy + '" r="' + lr + '"/></clipPath><g clip-path="url(#rdz)"><rect x="' + (lensCx - lr) + '" y="' + (lensCy - lr) + '" width="' + (2 * lr) + '" height="' + (2 * lr) + '" fill="#bdb7ab"/><rect x="' + (lensCx - lr) + '" y="' + (lensCy - lr) + '" width="' + (2 * lr) + '" height="' + (2 * lr) + '" fill="url(#aps-speck)" opacity=".9"/>';
    for (var i = 0; i < 46; i++) zoom += set.use(i % 3 === 2 ? 1 : 0, i, lensCx - 100 + g() * 200, lensCy - 100 + g() * 200, g() * 360);
    var big = [[-52, -40], [30, -52], [-16, 26], [58, 40], [-62, 56]];
    big.forEach(function (p, j) { zoom += set.use(2, j, lensCx + p[0], lensCy + p[1], g() * 360); });
    zoom += '</g><circle cx="' + lensCx + '" cy="' + lensCy + '" r="' + lr + '" fill="none" stroke="' + ORANGE + '" stroke-width="2.8"/><path class="ln acc" d="M494 306L' + (lensCx - 96) + ' ' + (lensCy + 58) + '"/><circle class="ring-on" cx="494" cy="306" r="3.8"/>';
    var lt = '<g class="aps-b aps-b4">' + zoom + '<text class="lab call" x="' + lensCx + '" y="' + (lensCy + lr + 26) + '" style="font-weight:700;letter-spacing:.08em">' + (PH ? 'ONE COMPONENT' : 'A 40 MM FRACTION CAN BE') + '</text><text class="lab call" x="' + lensCx + '" y="' + (lensCy + lr + 46) + '" style="font-weight:700;letter-spacing:.08em">' + (PH ? 'OF A BLEND' : 'ONE COMPONENT OF A BLEND') + '</text><text class="lab faint-t" x="' + lensCx + '" y="' + (lensCy - lr - 14) + '">' + (PH ? 'MAGNIFIED' : 'MAGNIFIED') + '</text></g>';
    return { vb: [0, 100, 800, 380], markup: '<defs>' + set.defs + cp('g', 262, 90) + cp('b', 196, 66) + '</defs><rect class="aps-ground" x="0" y="430" width="800" height="26"/>' + L + '<g class="aps-b aps-b4">' + names + '</g>' + lt };
  }

  /* ---------- SCENE 12b · three material structures: o.kind = 'frac' | 'gsb' | 'wmm' ---------- */
  function mat40(A, o) {
    var kind = (o && o.kind) || 'frac', R = A.rng(4014 + kind.length * 3 + kind.charCodeAt(0)), set = stoneSet(A, 'mt' + kind, [24, 14, 8, 5], 3, kindBy(['40', '20', '10', '10']));
    var x0 = 16, x1 = 384, top = 74, bot = 300, items = [], k = 0;
    var spec = { frac: [[0, 24, 26]], gsb: [[0, 24, 6], [1, 14, 14], [2, 8, 40], [3, 5, 70]], wmm: [[0, 24, 5], [1, 14, 16], [2, 8, 46], [3, 5, 84]] }[kind];
    spec.forEach(function (s) { for (var i = 0; i < s[2]; i++) items.push({ r: s[1], c: s[0], k: k++ }); });
    var pk = kind === 'frac' ? pack(R, [x0 + 6, x1 - 6, bot - 4, top + 8], items, []) : scatter(R, [x0 + 4, x1 - 4, top + 4, bot - 4], items, 120);
    var fines = '';
    if (kind !== 'frac') for (var q = 0; q < (kind === 'wmm' ? 900 : 760); q++) { var fx = x0 + 4 + R() * (x1 - x0 - 8), fy = top + 4 + R() * (bot - top - 8), ok = true; for (var j = 0; j < pk.length; j++) { var dd = pk[j].r * 1.1; if ((pk[j].x - fx) * (pk[j].x - fx) + (pk[j].y - fy) * (pk[j].y - fy) < dd * dd) { ok = false; break; } } if (ok) fines += '<circle cx="' + F(fx) + '" cy="' + F(fy) + '" r="' + F(0.8 + R() * 1.2) + '" fill="' + (q % 2 ? '#b9a98a' : '#9c9588') + '"/>'; }
    var water = ''; if (kind === 'wmm') for (var w = 0; w < 18; w++) water += '<circle cx="' + F(x0 + 20 + R() * (x1 - x0 - 40)) + '" cy="' + F(top + 12 + R() * (bot - top - 24)) + '" r="2.4" fill="#3b8fd0" opacity=".7"/>';
    var T2 = { frac: ['40 mm aggregate', 'AN INDIVIDUAL COARSE FRACTION'], gsb: ['GSB', 'A COMPLETE GRADED BLEND'], wmm: ['WMM', 'A PROCESSED ROAD-BASE BLEND'] }[kind];
    var note = { frac: ['VOIDS BETWEEN THE STONES;', 'FINES FOLLOW THE FRACTION’S OWN GRADING'], gsb: ['COARSE AND FINER STONES AND FINES', 'IN A SPECIFIED GRADING'], wmm: ['A SPECIFIED GRADING, MIXED WITH WATER', 'UNDER CONTROLLED PROCESSING'] }[kind];
    return { vb: [0, 0, 400, 360], markup: '<defs>' + set.defs + '</defs><text class="lab card-t' + (kind === 'frac' ? ' hot' : '') + '" x="200" y="34">' + T2[0] + '</text><text class="lab card-s mt-sub" x="200" y="56">' + T2[1] + '</text><rect x="' + x0 + '" y="' + top + '" width="' + (x1 - x0) + '" height="' + (bot - top) + '" rx="10" fill="' + (kind === 'frac' ? '#f6f2ea' : '#bdb7ab') + '" stroke="rgba(20,20,22,.18)"/>' + (kind === 'frac' ? '' : '<rect x="' + x0 + '" y="' + top + '" width="' + (x1 - x0) + '" height="' + (bot - top) + '" rx="10" fill="url(#aps-speck)" opacity=".7"/>') + fines + water + pk.map(function (p, i) { return set.use(p.c, i, p.x, p.y, R() * 360); }).join('') + '<text class="lab faint-t mt-note" x="200" y="326">' + note[0] + '</text><text class="lab faint-t mt-note" x="200" y="346">' + note[1] + '</text>' };
  }

  /* ---------- SCENE 13 · drainage voids (o.kind = 'open' | 'fines') ---------- */
  function drain40(A, o) {
    var clogged = !!(o && o.kind === 'fines');
    var set = stoneSet(A, 'dn' + (clogged ? 'f' : 'o'), [19, 12], 3, kindBy(['40', '20']));
    var x0 = 20, x1 = 380, top = 96, bot = 396, W = x1 - x0, R = A.rng(clogged ? 88 : 87), items = [];
    for (var n = 0; n < (clogged ? 80 : 52); n++) { var big = R() < 0.84; items.push({ r: big ? 19 : 12, c: big ? 0 : 1, k: n }); }
    var Pk = pack(R, [x0 + 6, x1 - 6, bot - 4, top + 52], items, []);
    var out = '<rect x="' + x0 + '" y="' + top + '" width="' + W + '" height="' + (bot - top) + '" rx="8" fill="#f6f2ea" stroke="rgba(20,20,22,.18)"/>';
    if (clogged) { var f = ''; for (var q = 0; q < 1100; q++) f += '<circle cx="' + F(x0 + 6 + R() * (W - 12)) + '" cy="' + F(top + 60 + R() * (bot - top - 64)) + '" r="' + F(1 + R() * 1.4) + '" fill="' + (q % 2 ? '#b9a98a' : '#a09378') + '"/>'; out += f; }
    var water = '', cols = clogged ? 5 : 8;
    for (var w = 0; w < cols; w++) {
      var wx = x0 + 26 + (w + 0.5) * (W - 52) / cols, pts = [[wx, top + 8]], yy = top + 8, sg = 1;
      while (yy < (clogged ? top + 64 : bot - 8)) { yy += 28; sg = -sg; pts.push([wx + sg * (6 + (w % 3) * 3), yy]); }
      var d = 'M' + P(pts), dur = clogged ? 3.4 : 5.2, bg = '-' + F(w * dur / cols) + 's';
      water += '<path class="dr-flow" d="' + d + '" fill="none" stroke="#3b8fd0" stroke-width="3" stroke-linecap="round" opacity=".4"/><circle r="4" fill="#3b8fd0" opacity="0"><animateMotion path="' + d + '" dur="' + dur + 's" begin="' + bg + '" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.08;.9;1" dur="' + dur + 's" begin="' + bg + '" repeatCount="indefinite"/></circle>';
    }
    if (clogged) out += '<rect x="' + (x0 + 1) + '" y="' + (top + 1) + '" width="' + (W - 2) + '" height="48" rx="7" fill="#3b8fd0" opacity=".28"/>';
    out += water + Pk.map(function (p, i) { return set.use(p.c, i, p.x, p.y, R() * 360); }).join('');
    var arr = ''; for (var a = 0; a < 5; a++) arr += '<path d="M' + (x0 + 40 + a * (W - 80) / 4) + ' ' + (top - 30) + 'v16m-5 -6l5 6l5 -6" fill="none" stroke="#3b8fd0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    var labels = '<text class="lab card-t' + (clogged ? ' hot' : '') + '" x="200" y="434">' + (clogged ? 'Too many fines' : 'Open-graded, low fines') + '</text><text class="lab card-s" x="200" y="454">' + (clogged ? 'PATHWAYS BLOCKED' : 'PATHWAYS FOR WATER') + '</text><text class="lab" x="200" y="60">WATER IN</text>';
    return { vb: [0, 20, 400, 450], markup: '<defs>' + set.defs + '</defs>' + out + arr + labels };
  }

  hero40.noLib = true;
  var S = APS.SCENES;
  S.hero40 = hero40; S.sieve40 = sieve40; S.mass40 = mass40; S.blend40 = blend40; S.pour40 = pour40; S.heat40 = heat40;
  S.found40 = found40; S.clear40 = clear40; S.road40 = road40; S.mat40 = mat40; S.drain40 = drain40;
})();
