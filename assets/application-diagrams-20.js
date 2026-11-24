/* OM GROUP · 20mm application page scenes (TEMPORARY TEST BUILD, local only).
   Registers more scenes with the scene engine (application-scenes.js), using the toolkit of application-diagrams.js:
   homepage art library for machinery, the project's own photographs for every stone.
     matrix20    concrete cut-away: cement paste, fine aggregate and 20 mm coarse aggregate, each switchable
     sieve20     laboratory sieve stack (40 / 20 / 10 / 4.75 mm) with real stones retained on each sieve
     blend20     ready-mix batching plant: bins of 10 mm, 20 mm, manufactured sand and other fines, mixer and transit mixer
     frame20     a concrete frame (footing, column, beam, slab) with the cross-section of the selected member
     precast20   mould, reinforcement, filling, compaction, curing and demoulding, as five steps
     pavement20  concrete pavement and bituminous pavement build-up, side by side
     drain20     open-graded drainage aggregate against one clogged with fines, with water moving through the voids
     rccsel      slab, beam and column cross-sections with the dimensions that govern aggregate size
   Diagrams only: no mix proportions, no measured gradings, no structural dimensions. */
(function () {
  'use strict';
  var APS = window.APS; if (!APS || !APS.toolkit) return;
  var H = APS.helpers, at = H.at, T = APS.toolkit;
  var F = T.F, esc = T.esc, stoneSet = T.stoneSet, pack = T.pack, lab = T.lab, lead = T.lead;
  var label = H.label;
  var CONC = '#d3cdc2';

  /* a polyline of orange dimension: end ticks and a label */
  function dimH(x0, x1, y, text, ty, cls) {
    return '<g class="dm ' + (cls || '') + '"><path class="ln acc" d="M' + F(x0) + ' ' + F(y) + 'H' + F(x1) + 'M' + F(x0) + ' ' + F(y - 5) + 'V' + F(y + 5) + 'M' + F(x1) + ' ' + F(y - 5) + 'V' + F(y + 5) + '"/><text class="lab acc-t dm-t" x="' + F((x0 + x1) / 2) + '" y="' + F(ty) + '">' + text + '</text></g>';
  }
  function dimV(x, y0, y1, text, tx, cls, anchor) {
    return '<g class="dm ' + (cls || '') + '"><path class="ln acc" d="M' + F(x) + ' ' + F(y0) + 'V' + F(y1) + 'M' + F(x - 5) + ' ' + F(y0) + 'H' + F(x + 5) + 'M' + F(x - 5) + ' ' + F(y1) + 'H' + F(x + 5) + '"/><text class="lab acc-t dm-t ' + (anchor || 'start') + '" x="' + F(tx) + '" y="' + F((y0 + y1) / 2 + 5) + '">' + text + '</text></g>';
  }

  /* ---------- concrete matrix cut-away ---------- */
  function matrix20(A) {
    var R = A.rng(2020), set = stoneSet(A, 'mx', [7, 10, 13, 17], 3, function (i) { return i < 2 ? '10' : '20'; });
    var X0 = 24, Y0 = 186, W = 470, Hh = 262, DX = 96, DY = -66;
    var radii = [17, 17, 17, 13, 13, 10, 7], cmap = { 7: 0, 10: 1, 13: 2, 17: 3 }, items = [];
    for (var n = 0; n < 190; n++) { var r = radii[Math.floor(R() * radii.length)]; items.push({ r: r, c: cmap[r], k: n }); }
    var P = pack(R, [X0 + 6, X0 + W - 6, Y0 + Hh - 6, Y0 + 8], items, []);
    var big = P.reduce(function (a, p) { return p.r > a.r || (p.r === a.r && p.x > a.x && p.y < a.y) ? p : a; }, P[0]);
    // every stone sits in its own wrapper so it can drop in on its own turn: the lowest ones first, as a mix is filled from the bottom of the form
    var coarse = P.map(function (p, i) { var low = (Y0 + Hh - p.y) / Hh; return '<g class="mx-st" style="--d:' + F(1.05 + low * 1.45 + R() * 0.22) + 's">' + set.use(p.c, i, p.x, p.y, R() * 360) + '</g>'; }).join('');
    // fine aggregate: sand grains in the gaps, in eight batches that sift in one after the other
    var cols = ['#b9a98a', '#a8977b', '#8c8576', '#c7b99a', '#9c9588'], fineB = ['', '', '', '', '', '', '', ''], fine = '', free = null;
    for (var q = 0, put = 0; q < 2600 && put < 640; q++) {
      var x = X0 + 4 + R() * (W - 8), y = Y0 + 4 + R() * (Hh - 8), ok = true;
      for (var j = 0; j < P.length; j++) { var dd = P[j].r * 1.12; if ((P[j].x - x) * (P[j].x - x) + (P[j].y - y) * (P[j].y - y) < dd * dd) { ok = false; break; } }
      if (!ok) continue; put++;
      fineB[put % 8] += '<circle cx="' + F(x) + '" cy="' + F(y) + '" r="' + F(0.9 + R() * 1.4) + '" fill="' + cols[put % cols.length] + '"/>';
      if (!free && put > 80 && x > X0 + 120) free = [x, y];
    }
    fineB.forEach(function (g, b) { fine += '<g class="mx-fg" style="--d:' + F(0.85 + b * 0.1) + 's">' + g + '</g>'; });
    var top = '<g class="mx-top"><path d="M' + X0 + ' ' + Y0 + 'H' + (X0 + W) + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'H' + (X0 + DX) + 'Z" fill="#c4bfb4" stroke="#232427" stroke-width="1.2"/><path d="M' + X0 + ' ' + Y0 + 'H' + (X0 + W) + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'H' + (X0 + DX) + 'Z" fill="url(#aps-speck)" opacity=".8"/></g>';
    var side = '<g class="mx-side"><path d="M' + (X0 + W) + ' ' + Y0 + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'V' + (Y0 + Hh + DY) + 'L' + (X0 + W) + ' ' + (Y0 + Hh) + 'Z" fill="#a9a499" stroke="#232427" stroke-width="1.2"/><path d="M' + (X0 + W) + ' ' + Y0 + 'L' + (X0 + W + DX) + ' ' + (Y0 + DY) + 'V' + (Y0 + Hh + DY) + 'L' + (X0 + W) + ' ' + (Y0 + Hh) + 'Z" fill="url(#aps-speck)" opacity=".7"/></g>';
    var section = '<clipPath id="mx-clip"><rect x="' + X0 + '" y="' + Y0 + '" width="' + W + '" height="' + Hh + '"/></clipPath>'
      + '<g class="mx-body"><rect class="mx-base" x="' + X0 + '" y="' + Y0 + '" width="' + W + '" height="' + Hh + '" fill="#fff"/>'
      + '<g class="mx-paste"><g class="mx-pf"><rect x="' + X0 + '" y="' + Y0 + '" width="' + W + '" height="' + Hh + '" fill="' + CONC + '"/><rect x="' + X0 + '" y="' + Y0 + '" width="' + W + '" height="' + Hh + '" fill="url(#aps-speck)" opacity=".55"/></g></g>'
      + '<g clip-path="url(#mx-clip)"><g class="mx-fine">' + fine + '</g><g class="mx-coarse">' + coarse + '</g></g>'
      + '<rect x="' + X0 + '" y="' + Y0 + '" width="' + W + '" height="' + Hh + '" fill="none" stroke="#232427" stroke-width="1.4"/></g>';
    var cut = '<rect x="' + (X0 - 5) + '" y="' + (Y0 - 5) + '" width="' + (W + 10) + '" height="' + (Hh + 10) + '" rx="3" fill="none" stroke="#FF5E29" stroke-width="2.4" stroke-dasharray="9 7"/>';
    var LX = X0 + W + DX + 26;
    // a label block is one <text>; on phones its lines are spaced in em so the spacing grows with the larger type (fixed 18-unit steps overlapped there), elsewhere the original 18 units
    var stack = function (x, y, rows) { return '<text class="lab start" x="' + x + '" y="' + y + '">' + rows.map(function (r, k) { return '<tspan class="lab start ' + r[1] + '" x="' + x + '"' + (k ? ' dy="' + (window.innerWidth <= 767 ? '1.14em' : '18') + '"' : '') + '>' + esc(r[0]) + '</tspan>'; }).join('') + '</text>'; };
    var labels = '<g class="mx-lbl">'
      + '<g class="mx-lc" style="--d:2.2s">' + lab(X0, Y0 - 86, 'CUT SECTION THROUGH A SLAB', 'start acc-t') + '</g>'
      + '<g class="mx-lc" style="--d:3.0s">' + stack(LX, 150, [['COARSE', 'call'], ['AGGREGATE', 'call'], ['20 mm', 'faint-t']]) + lead('M' + (LX - 8) + ' 160L' + F(big.x + big.r * 0.6) + ' ' + F(big.y), [big.x + big.r * 0.6, big.y]) + '</g>'
      + '<g class="mx-lc" style="--d:3.25s">' + stack(LX, 270, [['FINE', 'call'], ['AGGREGATE', 'call'], ['sand grains', 'faint-t']]) + lead('M' + (LX - 8) + ' 280L' + F(free ? free[0] : X0 + 300) + ' ' + F(free ? free[1] : Y0 + 150), free) + '</g>'
      + '<g class="mx-lc" style="--d:3.5s">' + stack(LX, 390, [['CEMENT', 'call'], ['PASTE', 'call'], ['binds it all', 'faint-t']]) + lead('M' + (LX - 8) + ' 400L' + F(X0 + W - 20) + ' ' + F(Y0 + Hh - 10), [X0 + W - 20, Y0 + Hh - 10]) + '</g>'
      + '</g>';
    return { vb: [0, 60, 800, 410], markup: '<defs>' + set.defs + '</defs>' + top + side + section + '<g class="mx-cut">' + cut + '</g>' + '<g class="mx-ring"><circle class="aps-pulse" cx="' + F(big.x) + '" cy="' + F(big.y) + '" r="' + F(big.r + 8) + '" fill="none" stroke="#FF5E29" stroke-width="2.4"/></g>' + labels };
  }

  /* ---------- laboratory sieve stack: 40 / 20 / 10 / 4.75 mm ---------- */
  function sieve20(A) {
    var R = A.rng(2021), set = stoneSet(A, 'sv', [4.4, 7.4, 9.6, 13.4], 3, function (i) { return i === 0 ? '6' : i === 1 ? '10' : i === 2 ? '10' : '20'; });
    var SX0 = 90, SX1 = 400, ys = [30, 116, 202, 288], names = ['40 mm', '20 mm', '10 mm', '4.75 mm'];
    var kept = [0, 3, 11, 4], keptI = [3, 3, 2, 0], kr = [0, 13.4, 9.6, 4.4];
    var frameOf = function (y, i) {
      var hot = i === 1;
      return '<rect class="o" fill="url(#a-steelH)" x="' + (SX0 - 12) + '" y="' + (y - 34) + '" width="12" height="58"/><rect class="o" fill="url(#a-steelH)" x="' + SX1 + '" y="' + (y - 34) + '" width="12" height="58"/>'
        + '<rect class="o" fill="url(#a-mesh)" x="' + SX0 + '" y="' + (y - 2) + '" width="' + (SX1 - SX0) + '" height="12"/>'
        + '<rect class="o" fill="url(#a-steelD)" x="' + (SX0 - 12) + '" y="' + (y + 10) + '" width="' + (SX1 - SX0 + 24) + '" height="10"/>'
        + (hot ? '<rect class="o" fill="url(#a-paint)" x="' + (SX0 - 12) + '" y="' + (y - 34) + '" width="' + (SX1 - SX0 + 24) + '" height="7"/>' : '<rect class="o" fill="url(#a-steelD)" x="' + (SX0 - 12) + '" y="' + (y - 34) + '" width="' + (SX1 - SX0 + 24) + '" height="7"/>');
    };
    var stack = '', st = '', n = 0;
    ys.forEach(function (y, i) {
      stack += frameOf(y, i);
      for (var j = 0; j < kept[i]; j++) { var r = kr[i]; st += set.use(keptI[i], n++, SX0 + 22 + (j + 0.5) * ((SX1 - SX0 - 44) / kept[i]) + (R() - 0.5) * 5, y - 2 - r * 0.6, R() * 360); }
    });
    var pan = '<path class="o" fill="url(#a-cone)" d="M' + (SX0 - 40) + ' 378H' + (SX1 + 40) + 'L' + (SX1 + 14) + ' 432H' + (SX0 - 14) + 'Z"/><rect class="o" fill="url(#a-steelD)" x="' + (SX0 - 50) + '" y="372" width="' + (SX1 - SX0 + 100) + '" height="8" rx="2"/>';
    var fines = ''; for (var q = 0; q < 60; q++) fines += set.use(0, n++, SX0 + 12 + R() * (SX1 - SX0 - 24), 378 - 3.2 - R() * 8 * (1 - Math.abs((q % 26) - 13) / 13), R() * 360);
    var falls = [150, 220, 290, 360].map(function (x, i) { return H.stones([[x, ys[0] + 14], [x + (i % 2 ? 6 : -6), 370]], { speed: 55, gap: 70, size: [2.6, 4], seed: 31 + i }); }).join('');
    var lx = SX1 + 40, labels = '<g class="lbl">';
    ys.forEach(function (y, i) {
      labels += '<path class="ln' + (i === 1 ? ' acc' : '') + '" d="M' + (SX1 + 14) + ' ' + (y + 4) + 'H' + (lx - 8) + '"/><circle class="' + (i === 1 ? 'ring-on' : 'ring') + '" cx="' + (SX1 + 14) + '" cy="' + (y + 4) + '" r="4"/>'
        + '<text class="lab start' + (i === 1 ? ' acc-t' : '') + '" x="' + lx + '" y="' + (y + 9) + '" style="font-weight:700;letter-spacing:.1em">' + names[i] + '</text>';
    });
    labels += '<text class="lab start faint-t" x="' + lx + '" y="' + (ys[1] + 30) + '">nominal size</text>';
    labels += '<text class="lab start" x="' + lx + '" y="406" style="font-weight:700;letter-spacing:.1em">PAN</text><text class="lab start faint-t" x="' + lx + '" y="426">passes every sieve</text></g>';
    return { vb: [0, 0, 800, 450], markup: '<defs>' + set.defs + '</defs>' + pan + '<g class="fadein">' + fines + '</g><g class="aps-shake">' + stack + '</g>' + st + '<g class="aps-flow">' + falls + '</g>' + labels };
  }

  /* ---------- ready-mix batching plant: 10 mm, 20 mm, manufactured sand, other fines ---------- */
  function blend20(A, o, narrow) {
    var P = A.plant(), TM = A.transitMixer('bl'), tx0 = P.chute.x - TM.hopper[0];
    var bx = function (i) { return 64 + i * 128; };
    var kinds = [
      { k: '10', name: '10 MM', sr: 3.4, sz: [2.6, 3.3], r: 3.0, seed: 201 },
      { k: '20', name: '20 MM', sr: 6.9, sz: [4.8, 6.0], r: 5.2, seed: 203, hot: true },
      { k: 'sand', name: 'M-SAND', sz: [1.3, 1.7], r: 1.9, seed: 204 },
      { k: 'fine', name: 'OTHER FINES', sz: [1.1, 1.5], r: 1.6, seed: 205, p: true },
    ];
    var heap = function (c, i) {
      var h = c.sr ? A.pile(118, 46, c.seed, { sr: c.sr, strata: 1 }).strata[0] : A.sandHeap(118, 42, c.seed, c.p ? 'p' : 'm');
      return '<g class="bl-f bl-' + c.k + '" transform="translate(' + P.binTops[i][0] + ' ' + P.binTops[i][1] + ')">' + h + '</g>';
    };
    var heaps = kinds.map(heap).join('');
    var statics = P.frameBins + P.bins + P.gather.frame + P.incline.frame + P.incline.rail + P.tower + P.hoppers + P.mixer;
    var gates = P.gates.map(function (q) { return at(q.x - 14, q.y, '<rect class="o" fill="url(#a-paint)" x="0" y="-4" width="28" height="12" rx="1.5"/><circle r="2.2" fill="#3a3c40"/>'); }).join('');
    var mixDrive = at(P.mixerDrive.x, P.mixerDrive.y, '<g class="aps-spin" style="--sp:.9s"><circle class="o" r="' + P.mixerDrive.r + '" fill="url(#a-rim)"/><path class="rmark" d="M-6 0H6M0 -6V6"/></g>');
    var truck = at(tx0, 0, TM.body + '<g class="aps-drum">' + TM.drum + '</g>' + TM.wheels + TM.fenders);
    var back = '<g opacity=".9">' + A.hills(1300, 240, 3, -40) + A.hills(900, 280, 5, 760) + '</g>';
    var ground = '<rect class="aps-ground" x="-60" y="0" width="1560" height="14"/><path class="ln faint" d="M-60 0H1500"/>';
    var up = function (r) { return [P.gather.at(70, r), P.gather.at(P.gather.L, r), P.incline.at(0, r), P.incline.at(P.incline.L, r)]; };
    var flows = '';
    kinds.forEach(function (c, i) {
      var g = P.gates[i], s = '';
      s += H.stones([[g.x, g.y + 10], [g.x, -196 - c.r]], { speed: 60, gap: c.sr ? 11 : 7, size: c.sz, seed: c.seed });
      s += H.stones(up(c.r + i * 0.2), { speed: 44, gap: c.sr ? (c.k === '20' ? 52 : 30) : 36, size: c.sz, seed: c.seed + 20 });
      flows += '<g class="bl-f bl-' + c.k + '">' + s + '</g>';
    });
    flows += H.stones([[P.chute.x, P.chute.y + 8], [P.chute.x, -168]], { speed: 40, gap: 10, size: [2.4, 4.4], seed: 240 });
    var sub = narrow ? 100 : 82;
    var ticks = '<path class="aps-gline" d="M-40 34H1440"/>' + [256, 700, 990, tx0 + 250].map(function (x) { return '<circle class="ring" cx="' + x + '" cy="34" r="4.5"/>'; }).join('');
    var sl = function (x, t) { return label(x, sub, t, 'faint-t'); };
    var lt = H.lt;
    var labs = label(256, 64, lt('AGGREGATE BINS', 'BINS')) + sl(256, 'SEPARATE FRACTIONS')
      + label(700, 64, 'BELTS') + sl(700, 'WEIGHED, THEN LIFTED')
      + label(990, 64, lt('MIXING TOWER', 'MIXER')) + sl(990, 'BLENDED TO THE MIX DESIGN')
      + label(tx0 + 250, 64, lt('TRANSIT MIXER', 'TRUCK')) + sl(tx0 + 250, 'DELIVERY');
    // phones: the bins sit 128 units apart but the type is larger, so a two-word tag is set on two lines (it would run into M-SAND)
    var tagText = function (c, i) {
      var words = c.name.split(' ');
      return H.binTag(c.name, bx(i));
    };
    var tags = kinds.map(function (c, i) { return '<text class="lab bin-t' + (c.hot ? ' acc-t' : '') + '" x="' + bx(i) + '" y="-404" style="font-weight:700;letter-spacing:.12em">' + tagText(c, i) + '</text>' + (c.hot ? '<circle class="ring-on" cx="' + bx(i) + '" cy="-388" r="4"/>' : ''); }).join('');
    var markup = back + ground
      + '<g class="aps-b aps-b1">' + statics + heaps + gates + '</g>'
      + '<g class="aps-b aps-b2">' + H.belt(A, P.gather) + H.belt(A, P.incline) + mixDrive + '</g>'
      + '<g class="aps-b aps-b3">' + truck + '<path class="pipe" d="M' + P.chute.x + ' ' + P.chute.y + 'V-168"/></g>'
      + '<g class="aps-b aps-b4">' + ticks + labs + tags + '</g>'
      + '<g class="aps-flow">' + flows + '</g>';
    return { vb: [-40, -700, 1480, 800], world: [-40, 1440], markup: markup };
  }

  /* ---------- member cross-sections (shared by frame20 insets and rccsel) ---------- */
  // returns markup centred on (0,0). k: 'slab' | 'beam' | 'column' | 'footing' | 'foundation'; dims: draw t / s / c dimension lines
  function section(k, dims) {
    var bar = function (x, y, r) { return '<circle class="rb" cx="' + F(x) + '" cy="' + F(y) + '" r="' + (r || 5.5) + '"/>'; };
    var body = '', d = '';
    if (k === 'slab') {
      body = '<rect class="cs" x="-180" y="-42" width="360" height="84" rx="2"/><path class="st-r" d="M-168 -10H168"/><path class="st-r" d="M-168 26H168"/>';
      for (var i = -4; i <= 4; i++) body += bar(i * 40, 26) + (i % 2 ? '' : bar(i * 40 + 20, -26, 4.4));
      if (dims) d = dimV(206, -42, 42, 't', 218, 'dm-t1') + dimH(-34, 6, 66, 's', 82, 'dm-s1') + dimV(-208, 31.5, 42, 'c', -220, 'dm-c1', 'end');
    } else if (k === 'beam') {
      body = '<rect class="cs" x="-75" y="-125" width="150" height="250" rx="2"/><rect class="st-r" x="-62" y="-112" width="124" height="224" rx="9" fill="none"/>';
      [-45, 0, 45].forEach(function (x) { body += bar(x, 97); }); [-50, 50].forEach(function (x) { body += bar(x, -97, 5); });
      if (dims) d = dimH(-75, 75, 150, 't', 172, 'dm-t1') + dimH(-39.5, -5.5, 128, 's', 146, 'dm-s1') + dimV(-102, -20, -8, 'c', -96, 'dm-c1', 'start');
    } else if (k === 'column') {
      body = '<rect class="cs" x="-95" y="-95" width="190" height="190" rx="2"/><rect class="st-r" x="-80" y="-80" width="160" height="160" rx="5" fill="none"/>';
      [[-66, -66], [66, -66], [-66, 66], [66, 66], [0, -66], [0, 66], [-66, 0], [66, 0]].forEach(function (p) { body += bar(p[0], p[1], 6.5); });
      if (dims) d = dimH(-95, 95, 122, 't', 144, 'dm-t1') + dimH(-59.5, -6.5, -114, 's', -126, 'dm-s1') + dimV(-110, -20, -8, 'c', -104, 'dm-c1', 'start');
    } else if (k === 'footing') {
      body = '<rect class="cs" x="-120" y="-34" width="240" height="68" rx="2"/><rect class="cs" x="-20" y="-70" width="40" height="36" rx="1"/>';
      for (var f = -5; f <= 5; f++) body += bar(f * 20, 24, 3.6);
      [-12, -4, 4, 12].forEach(function (x) { body += '<path class="st-r" d="M' + x + ' -66V24"/>'; });
    } else {
      body = '<rect class="cs" x="-125" y="-22" width="250" height="52" rx="2"/><rect class="cs" x="-125" y="-52" width="46" height="30" rx="1"/><rect class="cs" x="79" y="-52" width="46" height="30" rx="1"/><rect class="cs" x="-20" y="-70" width="40" height="48" rx="1"/>';
      for (var g = -5; g <= 5; g++) body += bar(g * 22, 20, 3.6);
    }
    return '<g class="sx">' + body + '</g>' + d;
  }

  /* ---------- structural frame with the section of the selected member ---------- */
  function frame20(A) {
    var set = stoneSet(A, 'fr', [11], 3, function () { return '20'; });
    var G = 360, cx = [100, 270, 440], conc = 'url(#a-conc)';
    var soil = '<rect x="0" y="' + G + '" width="530" height="120" fill="#e4d9c6"/><rect x="0" y="' + G + '" width="530" height="120" fill="url(#aps-hatch)" opacity=".35"/><path class="ln" d="M0 ' + G + 'H530"/>';
    var pad = function (x) { return '<rect class="o" fill="' + conc + '" x="' + (x - 50) + '" y="' + G + '" width="100" height="30" rx="2"/><rect fill="url(#aps-speck)" x="' + (x - 50) + '" y="' + G + '" width="100" height="30" opacity=".7"/>'; };
    var tie = function (x0, x1) { return '<rect class="o" fill="' + conc + '" x="' + x0 + '" y="' + (G - 22) + '" width="' + (x1 - x0) + '" height="22" rx="1"/><rect fill="url(#aps-speck)" x="' + x0 + '" y="' + (G - 22) + '" width="' + (x1 - x0) + '" height="22" opacity=".7"/>'; };
    var col = function (x) { return '<rect class="o" fill="' + conc + '" x="' + (x - 16) + '" y="164" width="32" height="' + (G - 22 - 164) + '"/><rect fill="url(#aps-speck)" x="' + (x - 16) + '" y="164" width="32" height="' + (G - 22 - 164) + '" opacity=".7"/>'; };
    var beam = '<rect class="o" fill="' + conc + '" x="64" y="124" width="412" height="40" rx="1"/><rect fill="url(#aps-speck)" x="64" y="124" width="412" height="40" opacity=".7"/>';
    var slab = '<rect class="o" fill="' + conc + '" x="40" y="96" width="460" height="28" rx="1"/><rect fill="url(#aps-speck)" x="40" y="96" width="460" height="28" opacity=".7"/>';
    var stubs = cx.map(function (x) { return '<path d="M' + (x - 8) + ' 96V52M' + (x + 8) + ' 96V52" stroke="#8a4a2a" stroke-width="3" stroke-linecap="round" opacity=".7"/>'; }).join('');
    var hit = function (m, inner, dx, dy) { return '<g class="fm fm-' + m + ' bp" data-m="' + m + '" style="--dx:' + dx + 'px;--dy:' + dy + 'px">' + inner + '</g>'; };
    var members = hit('foundation', cx.map(pad).join('') + tie(cx[0] + 16, cx[1] - 16) + tie(cx[1] + 16, cx[2] - 16), 0, 70)
      + hit('column', cx.map(col).join(''), 0, 60) + hit('beam', beam, 0, -50) + hit('slab', slab + stubs, 0, -80);
    var hl = function (m, x, y, w, h) { return '<rect class="hl20 hl20-' + m + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="none" stroke="#FF5E29" stroke-width="3" stroke-dasharray="9 6"/>'; };
    var hls = hl('slab', 34, 88, 472, 44) + hl('beam', 58, 116, 424, 56) + hl('column', 74, 156, 392, 194) + hl('footing', 44, G - 6, 92, 42) + hl('foundation', 44, G - 28, 452, 64);
    var names = '<g class="fl">' + lab(60, 114, 'SLAB', 'start call') + lab(80, 150, 'BEAM', 'start call') + lab(292, 262, 'COLUMN', 'start call') + lab(355, 353, 'FOUNDATION', 'call') + lab(100, 410, 'FOOTING', 'call') + '</g>';
    var card = '<g transform="translate(548 28)"><rect x="3" y="6" width="244" height="316" rx="12" fill="#141416" fill-opacity=".06"/><rect class="card-bg" width="244" height="316" rx="12"/><text class="lab card-s start" x="16" y="26">SECTION</text></g>';
    var insets = ['slab', 'beam', 'column', 'footing', 'foundation'].map(function (m) {
      var sc = m === 'slab' ? 0.6 : m === 'beam' ? 0.58 : m === 'column' ? 0.74 : 0.62;
      return '<g class="ins ins-' + m + '" transform="translate(670 168) scale(' + sc + ')">' + section(m, false) + '</g>';
    }).join('');
    var ctitle = { slab: ['Slab', 'two bar layers'], beam: ['Beam', 'stirrups and bars'], column: ['Column', 'ties and bars'], footing: ['Footing', 'spreads the load'], foundation: ['Foundation', 'tied footings'] };
    var captions = Object.keys(ctitle).map(function (m) { return '<g class="ins ins-' + m + '"><text class="lab card-t start" x="564" y="290">' + ctitle[m][0] + '</text><text class="lab card-s start" x="564" y="312">' + ctitle[m][1].toUpperCase() + '</text></g>'; }).join('');
    var idle = '<g class="ins ins-none"><text class="lab faint-t" x="670" y="168">Select a member</text></g>';
    var markup = '<defs>' + set.defs + '</defs>' + soil + members + '<g class="hls">' + hls + '</g>' + names + card + insets + captions + idle;
    return { vb: [0, 20, 800, 430], markup: markup };
  }

  /* ---------- precast: mould, reinforcement, filling, compaction, curing, demoulding ---------- */
  function precast20(A) {
    var R = A.rng(2024), set = stoneSet(A, 'pc', [9, 12], 3, function () { return '20'; });
    var G = 400, mx0 = 130, mx1 = 670, my = 312, mh = 80;
    var stones = ''; for (var i = 0; i < 24; i++) stones += set.use(i % 2, i, mx0 + 26 + R() * (mx1 - mx0 - 52), my + 12 + R() * (mh - 26), R() * 360);
    var cage = '<g class="pc-cage"><path d="M' + (mx0 + 24) + ' ' + (my + 18) + 'H' + (mx1 - 24) + 'M' + (mx0 + 24) + ' ' + (my + mh - 20) + 'H' + (mx1 - 24) + '" stroke="#8a4a2a" stroke-width="3.4" stroke-linecap="round"/>';
    for (var s = 0; s < 12; s++) { var sx = mx0 + 40 + s * 43; cage += '<rect x="' + sx + '" y="' + (my + 14) + '" width="10" height="' + (mh - 32) + '" rx="3" fill="none" stroke="#8a4a2a" stroke-width="2"/>'; }
    cage += '</g>';
    var fill = '<clipPath id="pc-clip"><rect x="' + mx0 + '" y="' + (my - 4) + '" width="' + (mx1 - mx0) + '" height="' + (mh + 4) + '"/></clipPath>'
      + '<g clip-path="url(#pc-clip)"><g class="pc-fill"><rect x="' + mx0 + '" y="' + my + '" width="' + (mx1 - mx0) + '" height="' + mh + '" fill="#bab4a8"/><rect x="' + mx0 + '" y="' + my + '" width="' + (mx1 - mx0) + '" height="' + mh + '" fill="url(#aps-speck)" opacity=".7"/>' + stones + '</g></g>';
    var mould = '<g class="pc-mould"><rect class="o" fill="url(#a-steelV)" x="' + (mx0 - 22) + '" y="' + (my - 18) + '" width="22" height="' + (mh + 40) + '"/><rect class="o" fill="url(#a-steelV)" x="' + mx1 + '" y="' + (my - 18) + '" width="22" height="' + (mh + 40) + '"/><rect class="o" fill="url(#a-steelH)" x="' + (mx0 - 22) + '" y="' + (my + mh) + '" width="' + (mx1 - mx0 + 44) + '" height="22"/></g>';
    var table = '<g class="pc-table"><rect class="o" fill="url(#a-steelD)" x="' + (mx0 - 50) + '" y="' + (my + mh + 22) + '" width="' + (mx1 - mx0 + 100) + '" height="16" rx="3"/>' + [mx0, mx0 + 180, mx1 - 180, mx1].map(function (x) { return at(x, G, '<g class="aps-spring">' + A.spring(24) + '</g>'); }).join('') + '</g>';
    var ground = '<rect class="aps-ground" x="0" y="' + G + '" width="800" height="14"/><path class="ln faint" d="M0 ' + G + 'H800"/>';
    var bucket = '<g class="pc-bucket" transform="translate(0 70)"><path class="o" fill="url(#a-steelD)" d="M330 96h140l-26 62h-88z"/><rect class="o" fill="url(#a-paint)" x="330" y="96" width="140" height="8" rx="2"/><path class="o" fill="url(#a-steelH)" d="M382 158h36v10h-36z"/>'
      + '<path class="pc-pour" d="M400 170V' + (my + 6) + '" stroke="' + CONC + '" stroke-width="12" stroke-linecap="round" fill="none"/><path class="ln" d="M400 66V96" /></g>';
    var vib = '<g class="pc-vib aps-shake"><rect class="o" fill="url(#a-steelV)" x="287" y="196" width="10" height="' + (my + 40 - 196) + '" rx="3"/><rect class="o" fill="url(#a-paint)" x="283" y="188" width="18" height="16" rx="3"/></g>';
    var cure = '<g class="pc-cure" fill="none" stroke="#7d93a3" stroke-width="2.4" stroke-linecap="round">' + [210, 300, 390, 480, 570].map(function (x, i) { return '<path d="M' + x + ' ' + (my - 22) + 'q8 -10 0 -20 q-8 -10 0 -20" opacity="' + (0.9 - i * 0.1) + '"/>'; }).join('') + '</g>';
    var chains = '<g class="pc-hook"><path class="ln" d="M400 30V120" /><path class="ln" d="M400 120L' + (mx0 + 40) + ' ' + (my - 8) + 'M400 120L' + (mx1 - 40) + ' ' + (my - 8) + '"/><circle class="ring-on" cx="400" cy="120" r="5"/></g>';
    var el = '<g class="pc-el">' + fill + cage + '</g>';
    var labs = '<g class="lbl">'
      + lab(mx0 - 40, my + 152, 'MOULD GEOMETRY', 'start call') + lead('M' + (mx0 - 22) + ' ' + (my + 60) + 'L' + (mx0 - 30) + ' ' + (my + 134), [mx0 - 22, my + 60])
      + lab(mx1 - 150, my + 152, 'REINFORCEMENT', 'start call') + lead('M' + (mx1 - 64) + ' ' + (my + 20) + 'L' + (mx1 - 50) + ' ' + (my + 134), [mx1 - 64, my + 20])
      + '</g>';   /* (an "AGGREGATE: 20 mm only where the section allows it" line used to sit at y 480, outside the frame, never shown; the step text says it) */
    var markup = '<defs>' + set.defs + '</defs>' + ground + table + mould + '<g class="pc-hang"><g class="pc-pos">' + el + chains + '</g></g>' + bucket + vib + cure + labs;
    return { vb: [0, 150, 800, 328], markup: markup };   /* the labels sit below the steel table (it ends at y 430) */
  }

  /* ---------- pavement build-up: one stack per figure (o.kind 'c' concrete, 'b' bituminous) ---------- */
  function pavement20(A, o) {
    var kind = (o && o.kind) || 'c', conc = kind === 'c';
    var R = A.rng(2029), set = stoneSet(A, 'pv9' + kind, [6, 9, 12], 3, function (i) { return i === 0 ? '6' : i === 1 ? '10' : '20'; });
    var x = 20, w = 360, G = 424;
    var band = function (y, h, fill, extra) { return '<rect class="o" fill="' + fill + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>' + (extra || ''); };
    var stoneBand = function (y, h, ci, nx, ny, seed) { var o2 = '', Rr = A.rng(seed); for (var a2 = 0; a2 < nx; a2++) for (var b2 = 0; b2 < ny; b2++) o2 += set.use(ci, a2 * ny + b2, x + (a2 + 0.5) * w / nx + (Rr() - 0.5) * 8, y + (b2 + 0.5) * h / ny + (Rr() - 0.5) * 6, Rr() * 360); return o2; };
    var cp = function (id, y, h) { return '<clipPath id="pv9' + kind + id + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></clipPath>'; };
    var s = '<g class="aps-b aps-b1">' + band(366, 58, '#c9b79c', '<rect x="' + x + '" y="366" width="' + w + '" height="58" fill="url(#aps-hatch)" opacity=".4"/>') + '</g>';
    s += '<g class="aps-b aps-b2">' + band(322, 44, '#bdb7ab') + '<g clip-path="url(#pv9' + kind + 'a)">' + stoneBand(322, 44, 1, 9, 2, 11) + '</g>' + band(292, 30, conc ? '#a8a398' : '#9a968c', '<rect x="' + x + '" y="292" width="' + w + '" height="30" fill="url(#aps-speck)" opacity=".8"/>') + '</g>';
    if (conc) s += '<g class="aps-b aps-b3">' + band(226, 66, CONC, '<rect x="' + x + '" y="226" width="' + w + '" height="66" fill="url(#aps-speck)" opacity=".6"/>') + '<g clip-path="url(#pv9' + kind + 'b)">' + stoneBand(226, 66, 2, 7, 2, 7) + '</g></g>';
    else s += '<g class="aps-b aps-b3">' + band(226, 66, '#26272a') + '<g clip-path="url(#pv9' + kind + 'b)">' + stoneBand(226, 66, 1, 12, 3, 9) + '</g><rect x="' + x + '" y="226" width="' + w + '" height="66" fill="#141416" opacity=".45"/></g>';
    var nm = function (y, text, light) { return '<text class="lab start pv-n" x="' + (x + 12) + '" y="' + y + '" style="fill:' + (light ? '#fff' : '#2e2f33') + ';stroke:' + (light ? '#141416' : '#fff') + '">' + text + '</text>'; };
    var names = nm(400, 'SUBGRADE') + nm(348, 'GRANULAR SUB-BASE (GSB)') + nm(312, conc ? 'BASE LAYER, AS SPECIFIED' : 'WET MIX MACADAM (WMM)') + nm(262, conc ? 'CONCRETE PAVEMENT' : 'BITUMINOUS LAYERS', !conc);
    var Rr = A.rng(conc ? 71 : 72), cx = 200, zoom = '<clipPath id="pv9' + kind + 'z"><circle cx="' + cx + '" cy="112" r="68"/></clipPath><g clip-path="url(#pv9' + kind + 'z)"><rect x="' + (cx - 70) + '" y="42" width="140" height="140" fill="' + (conc ? CONC : '#26272a') + '"/>' + (conc ? '<rect x="' + (cx - 70) + '" y="42" width="140" height="140" fill="url(#aps-speck)" opacity=".7"/>' : '');
    for (var i = 0; i < (conc ? 7 : 16); i++) zoom += set.use(conc ? 2 : (i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0), i, cx - 50 + Rr() * 100, 62 + Rr() * 100, Rr() * 360);
    zoom += (conc ? '' : '<rect x="' + (cx - 70) + '" y="42" width="140" height="140" fill="#141416" opacity=".4"/>') + '</g><circle cx="' + cx + '" cy="112" r="68" fill="none" stroke="#FF5E29" stroke-width="2.6"/>';
    var links = '<path class="ln acc" d="M200 180V226"/><circle class="ring-on" cx="200" cy="226" r="3.6"/>';
    var hot = conc ? '<text class="pv-h" x="200" y="204">STONES IN THE CONCRETE</text>' : '<text class="pv-h" x="200" y="204">GRADING + JOB MIX FORMULA</text>';
    var head = '<text class="lab card-t start" x="20" y="34">' + (conc ? 'Concrete pavement' : 'Bituminous pavement') + '</text>';
    return { vb: [0, 0, 400, 450], markup: '<defs>' + set.defs + cp('a', 322, 44) + cp('b', 226, 66) + '</defs><rect class="aps-ground" x="0" y="' + G + '" width="400" height="26"/>' + s + '<g class="aps-b aps-b4">' + zoom + links + head + hot + names + '</g>' };
  }

  /* ---------- drainage: one cross-section per figure (o.kind 'open' or 'fines'), with water moving through the voids ---------- */
  function drain20(A, o) {
    var clogged = !!(o && o.kind === 'fines');
    var set = stoneSet(A, 'dr' + (clogged ? 'f' : 'o'), [13, 9], 3, function (i) { return i === 0 ? '20' : '10'; });
    var x0 = 20, x1 = 380, top = 96, bot = 396, W = x1 - x0, R = A.rng(clogged ? 78 : 77), items = [];
    for (var n = 0; n < (clogged ? 120 : 84); n++) { var big = R() < 0.82; items.push({ r: big ? 13 : 9, c: big ? 0 : 1, k: n }); }
    var P = pack(R, [x0 + 6, x1 - 6, bot - 4, top + 52], items, []);
    var out = '<rect x="' + x0 + '" y="' + top + '" width="' + W + '" height="' + (bot - top) + '" rx="8" fill="#f6f2ea" stroke="rgba(20,20,22,.18)"/>';
    if (clogged) { var f = ''; for (var q = 0; q < 1100; q++) f += '<circle cx="' + F(x0 + 6 + R() * (W - 12)) + '" cy="' + F(top + 60 + R() * (bot - top - 64)) + '" r="' + F(1 + R() * 1.4) + '" fill="' + (q % 2 ? '#b9a98a' : '#a09378') + '"/>'; out += f; }
    var water = '', cols = clogged ? 5 : 8;
    for (var w = 0; w < cols; w++) {
      var wx = x0 + 26 + (w + 0.5) * (W - 52) / cols, pts = [[wx, top + 8]], yy = top + 8, sg = 1;
      while (yy < (clogged ? top + 64 : bot - 8)) { yy += 28; sg = -sg; pts.push([wx + sg * (6 + (w % 3) * 3), yy]); }
      var d = 'M' + pts.map(function (p) { return F(p[0]) + ' ' + F(p[1]); }).join('L'), dur = clogged ? 3.4 : 5.2, bg = '-' + F(w * dur / cols) + 's';
      water += '<path class="dr-flow" d="' + d + '" fill="none" stroke="#3b8fd0" stroke-width="3" stroke-linecap="round" opacity=".4"/>';
      water += '<circle r="4" fill="#3b8fd0" opacity="0"><animateMotion path="' + d + '" dur="' + dur + 's" begin="' + bg + '" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.08;.9;1" dur="' + dur + 's" begin="' + bg + '" repeatCount="indefinite"/></circle>';
    }
    if (clogged) out += '<rect x="' + (x0 + 1) + '" y="' + (top + 1) + '" width="' + (W - 2) + '" height="48" rx="7" fill="#3b8fd0" opacity=".28"/><path d="M' + (x0 + 8) + ' ' + (top + 12) + 'q14 -7 28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0" fill="none" stroke="#3b8fd0" stroke-width="2" opacity=".7"/>';
    out += water + P.map(function (p, i) { return set.use(p.c, i, p.x, p.y, R() * 360); }).join('');
    var arr = ''; for (var a = 0; a < 5; a++) arr += '<path d="M' + (x0 + 40 + a * (W - 80) / 4) + ' ' + (top - 30) + 'v16m-5 -6l5 6l5 -6" fill="none" stroke="#3b8fd0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    var labels = '<g><text class="lab card-t' + (clogged ? ' hot' : '') + '" x="200" y="434">' + (clogged ? 'Too many fines' : 'Open-graded, low fines') + '</text><text class="lab card-s" x="200" y="454">' + (clogged ? 'PATHWAYS BLOCKED' : 'PATHWAYS FOR WATER') + '</text><text class="lab" x="200" y="60">WATER IN</text></g>';
    return { vb: [0, 20, 400, 450], markup: '<defs>' + set.defs + '</defs>' + out + arr + labels };
  }

  /* ---------- RCC members: slab, beam, column, with the dimensions that govern the aggregate size ---------- */
  function rccsel(A) {
    var set = stoneSet(A, 'rs', [15], 3, function () { return '20'; });
    var stoneAt = function (x, y, rot) { return set.use(0, 1, x, y, rot) + '<circle class="aps-pulse" cx="' + x + '" cy="' + y + '" r="23" fill="none" stroke="#FF5E29" stroke-width="2.2"/>'; };
    var mem = function (k, sc, tx, ty, stone) { return '<g class="rs-m rs-' + k + '"><g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')">' + section(k, true) + '</g>' + stone + '</g>'; };
    // diagram particle drawn against the gap (not a fit test)
    var slab = mem('slab', 1.3, 280, 240, stoneAt(280 - 20 * 1.3, 240 + 26 * 1.3 - 4, 0));
    var beam = mem('beam', 1.12, 280, 236, stoneAt(280 - 22.5 * 1.12, 236 + 97 * 1.12 - 2, 80));
    var column = mem('column', 1.2, 280, 236, stoneAt(280 - 33 * 1.2, 236 - 66 * 1.2 + 2, 200));
    var legend = '<g class="lbl rs-leg">'
      + '<circle class="ring-on" cx="560" cy="130" r="5"/><text class="lab start card-t" x="576" y="136">t</text><text class="lab start card-s" x="610" y="136">MEMBER SIZE</text>'
      + '<circle class="ring-on" cx="560" cy="186" r="5"/><text class="lab start card-t" x="576" y="192">s</text><text class="lab start card-s" x="610" y="192">BAR SPACING</text>'
      + '<circle class="ring-on" cx="560" cy="242" r="5"/><text class="lab start card-t" x="576" y="248">c</text><text class="lab start card-s" x="610" y="248">COVER</text>'
      + '<text class="lab start faint-t" x="560" y="300">Not to scale.</text><text class="lab start faint-t" x="560" y="322">Real values come</text><text class="lab start faint-t" x="560" y="344">from the drawings.</text></g>';
    return { vb: [0, 20, 800, 450], markup: '<defs>' + set.defs + '</defs>' + slab + beam + column + legend };
  }

  var S = APS.SCENES;
  S.matrix20 = matrix20; S.sieve20 = sieve20; S.blend20 = blend20; S.frame20 = frame20; S.precast20 = precast20; S.pavement20 = pavement20; S.drain20 = drain20; S.rccsel = rccsel;

  /* the concrete cut-away builds itself once, when it is properly on screen: slab, paste, sand, then the stones drop in, then the callouts (timed, not tied to the scroll) */
  (function () {
    var figs = [].slice.call(document.querySelectorAll('.a20m[data-scene="matrix20"]'));
    if (!figs.length || !('IntersectionObserver' in window)) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    figs.forEach(function (fig) {
      fig.classList.add('mx-pre');
      var go = function () { if (fig.querySelector('svg.aps-svg')) fig.classList.add('mx-go'); else setTimeout(go, 120); };
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); go(); } }); }, { threshold: 0.38 });
      io.observe(fig);
    });
  })();
})();
