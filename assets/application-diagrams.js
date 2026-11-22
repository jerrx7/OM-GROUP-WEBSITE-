/* OM GROUP · application diagrams (TEMPORARY TEST BUILD, local only).
   Registers the explanatory scenes of the application pages with the scene engine (application-scenes.js). They share the
   homepage's drawing language: stones are real faceted meshes (A.rockMesh + A.Ink, the same code that builds the homepage
   stockpiles), steel is shaded and lit from the upper left, orange marks only what the viewer should look at.
   Scenes: paver (mould filling and compaction), rebar (aggregate between bars), block (hollow block, exploded),
   terrazzo (as cast → polished), exposed, texture, surface (paste coat), sieve (the 4.75 mm boundary).
   All of them are diagram: no measurements, no grading values, no code limits. */
(function () {
  'use strict';
  var APS = window.APS; if (!APS) return;
  var H = APS.helpers, at = H.at;
  var F = function (n) { return Math.round(n * 10) / 10; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  /* ---------- toolkit ---------- */
  // Stones are the project's own photographs (single-stone cutouts of the 6, 10 and 20 mm fractions, see img/applications/materials/).
  var MAT = '/img/applications/materials/';
  var SPR = {"6":[[150,129],[150,115],[150,123],[150,118],[150,118],[150,124],[150,115],[150,127]],"12":[[190,157],[190,163],[190,160],[190,164],[190,163],[190,159],[190,163],[190,158]],"10":[[170,132],[170,168],[170,149],[170,160],[170,160],[170,146],[169,170],[170,131]],"20":[[220,165],[220,193],[220,172],[220,170],[220,191],[220,164]]};
  // one real stone, centred on its own origin; kind = '6' | '10' | '12' | '20'
  function stoneSym(id, kind, v, r) {
    var d = SPR[kind][v % SPR[kind].length], w = r * 2.5, h = w * d[1] / d[0];
    return '<g id="' + id + '"><image href="' + MAT + 'stone-' + kind + '-' + (v % SPR[kind].length) + '.webp" x="' + F(-w / 2) + '" y="' + F(-h / 2) + '" width="' + F(w) + '" height="' + F(h) + '" preserveAspectRatio="none"/></g>';
  }
  // a set of size classes x variants -> { defs, use(sizeIndex, k, x, y, rot) }; kindOf(i) picks the fraction a class is photographed from
  function stoneSet(A, pre, radii, variants, kindOf) {
    var defs = '', ids = [];
    radii.forEach(function (r, i) { ids[i] = []; for (var v = 0; v < variants; v++) { var id = pre + i + '-' + v; ids[i].push(id); defs += stoneSym(id, kindOf(i), v * 3 + i, r); } });
    return { defs: defs, use: function (i, k, x, y, rot) { var a = (((rot || 0) % 360) / 360 - 0.5) * 44; return '<use href="#' + ids[i][k % variants] + '" transform="translate(' + F(x) + ' ' + F(y) + ') rotate(' + F(a) + ')"/>'; } };
  }
  // simple gravity packing of discs inside a box (positions only: the drawing is done with real stones)
  function pack(R, box, items, obstacles) {
    var placed = (obstacles || []).slice(), out = [], x0 = box[0], x1 = box[1], floor = box[2], y0 = box[3];
    var fits = function (x, y, r) {
      if (y + r > floor || x - r < x0 || x + r > x1) return false;
      for (var i = 0; i < placed.length; i++) { var p = placed[i], dx = p.x - x, dy = p.y - y, m = p.r + r - 0.5; if (dx * dx + dy * dy < m * m) return false; }
      return true;
    };
    items.forEach(function (it) {
      var r = it.r, x = x0 + r + 2 + R() * (x1 - x0 - 2 * r - 4), y = y0;
      if (!fits(x, y, r)) return;
      for (var g = 0; g < 900; g++) {
        if (fits(x, y + 1, r)) { y += 1; continue; }
        if (fits(x - 1, y + 1, r) && R() < 0.5) { x -= 1; y += 1; continue; }
        if (fits(x + 1, y + 1, r)) { x += 1; y += 1; continue; }
        if (fits(x - 1, y + 1, r)) { x -= 1; y += 1; continue; }
        break;
      }
      var q = { x: x, y: y, r: r, c: it.c, k: it.k }; placed.push(q); out.push(q);
    });
    return out;
  }
  var SIZES = [3.6, 5.2, 7.4, 10.5, 17.5];            // size classes of the stone sets
  var GREY_RAMP = null;
  var concrete = function () { return ''; }; // the speckle and hatch patterns are in the shared defs (application-scenes.js)
  // orange process marker: dashed outline / tint, shown by the hotspot buttons (see .z in application-6mm.css)
  var Z = function (name, inner) { return '<g class="z z-' + name + '">' + inner + '</g>'; };
  var lab = function (x, y, t, cls) { return '<text class="lab ' + (cls || 'start') + '" x="' + F(x) + '" y="' + F(y) + '">' + esc(t) + '</text>'; };
  var lead = function (d, dot) { return '<path class="ln acc" d="' + d + '"/>' + (dot ? '<circle class="ring-on" cx="' + dot[0] + '" cy="' + dot[1] + '" r="3.6"/>' : ''); };
  var WOOD_PAN = 'url(#a-steelD)';

  /* ---------- paver mould: loose mix settles under the compaction head ---------- */
  function paver(A) {
    var R = A.rng(3141), x0 = 170, x1 = 450, floor = 330, top = 168;
    var set = stoneSet(A, 'pv', SIZES.slice(0, 4), 3, function (i) { return i < 3 ? '6' : '10'; });
    var radii = [10.5, 7.4, 7.4, 5.2, 5.2, 3.6], items = [];
    for (var n = 0; n < 200; n++) { var k = Math.floor(R() * radii.length); items.push({ r: radii[k], c: radii[k] === 10.5 ? 3 : radii[k] === 7.4 ? 2 : radii[k] === 5.2 ? 1 : 0, k: n }); }
    var P = pack(R, [x0, x1, floor, top + 4], items, []), pileTop = floor;
    P.forEach(function (p) { pileTop = Math.min(pileTop, p.y - p.r); });
    var parts = P.map(function (p, i) {
      var dy = -(14 + R() * 46) * (0.55 + (floor - p.y) / (floor - pileTop) * 0.6), dx = (R() - 0.5) * 16;
      return '<g class="mp" style="--dx:' + F(dx) + 'px;--dy:' + F(dy) + 'px">' + set.use(p.c, i, p.x, p.y, R() * 360) + '</g>';
    }).join('');
    // steel: two columns on footings, a cross beam, ram and compaction head; mould walls on a vibrating table
    var cols = [96, 524].map(function (x) { return A.col(x, 396, 70, 18) + at(x, 396, A.footing(x - x, 38, 12)); }).join('');
    var beam = A.beam(82, 538, 88, 16);
    var hx0 = x0 + 6, hx1 = x1 - 6, hy = F(pileTop - 28);
    var head = '<g class="head"><rect class="o" fill="url(#a-steelV)" x="294" y="86" width="32" height="' + F(pileTop - 28 - 86 + 2) + '"/><path class="hl" d="M298 90V' + F(pileTop - 32) + '"/>'
      + '<rect class="o" fill="url(#a-steelD)" x="' + hx0 + '" y="' + hy + '" width="' + (hx1 - hx0) + '" height="28" rx="2"/>'
      + '<rect class="o" fill="url(#a-paint)" x="' + hx0 + '" y="' + hy + '" width="' + (hx1 - hx0) + '" height="7" rx="2"/>'
      + '<path class="bolt" style="stroke-dasharray:.01 12" d="M' + (hx0 + 12) + ' ' + F(pileTop - 8) + 'H' + (hx1 - 12) + '"/>'
      + '<rect class="o" fill="url(#a-steelH)" x="284" y="' + F(pileTop - 44) + '" width="52" height="16" rx="2"/></g>';
    var mouldBack = '<rect fill="#2a2c31" x="' + x0 + '" y="' + top + '" width="' + (x1 - x0) + '" height="' + (floor - top) + '"/>'
      + '<path d="M' + x0 + ' ' + top + 'H' + x1 + '" stroke="#000" stroke-opacity=".5"/>';
    var walls = '<rect class="o" fill="url(#a-steelV)" x="148" y="' + (top - 6) + '" width="22" height="' + (floor - top + 24) + '"/><path class="hl" d="M152 ' + top + 'V' + (floor + 14) + '"/>'
      + '<rect class="o" fill="url(#a-steelV)" x="450" y="' + (top - 6) + '" width="22" height="' + (floor - top + 24) + '"/><path class="hl" d="M454 ' + top + 'V' + (floor + 14) + '"/>'
      + '<rect class="o" fill="url(#a-steelH)" x="148" y="' + floor + '" width="324" height="18"/>';
    var table = '<g class="aps-shake">' + A.box(124, 348, 372, 24, 'url(#a-steelD)', 8) + '</g>';
    var springs = [150, 250, 370, 470].map(function (x) { return at(x, 396, '<g class="aps-spring">' + A.spring(24) + '</g>'); }).join('');
    // finished paver on a pallet
    var paverOut = '<g class="fadein">' + A.box(552, 372, 118, 12, 'url(#a-steelD)', 8) + A.box(560, 332, 100, 40, 'url(#a-conc)', 12) + '<rect fill="url(#aps-speck)" x="560" y="332" width="100" height="40" opacity=".8"/>'
      + Z('consistency', '<rect x="556" y="318" width="124" height="68" rx="3" fill="none" stroke="#FF5E29" stroke-width="3.2" stroke-dasharray="8 6"/>') + '</g>';
    var zones = Z('fill', '<rect x="' + (x0 - 5) + '" y="' + (top - 22) + '" width="' + (x1 - x0 + 10) + '" height="' + (floor - top + 28) + '" rx="4" fill="none" stroke="#FF5E29" stroke-width="3.4" stroke-dasharray="9 7"/>')
      + Z('surface', '<rect x="' + x0 + '" y="' + F(pileTop - 3) + '" width="' + (x1 - x0) + '" height="46" fill="#FF5E29" opacity=".26"/>')
      + Z('uniform', [1, 2, 3].map(function (i) { return '<path d="M' + (x0 + i * 70) + ' ' + F(pileTop) + 'V' + floor + '" stroke="#FF5E29" stroke-width="3" stroke-dasharray="3 7"/>'; }).join(''))
      + Z('pack', '<rect x="' + x0 + '" y="' + F(pileTop + 40) + '" width="' + (x1 - x0) + '" height="' + F(floor - pileTop - 40) + '" fill="#FF5E29" opacity=".14"/>');
    var zHead = Z('compact', '<rect x="' + (hx0 - 3) + '" y="' + F(hy - 3) + '" width="' + (hx1 - hx0 + 6) + '" height="34" rx="3" fill="none" stroke="#FF5E29" stroke-width="3.6"/>');
    var labels = lab(560, +hy + 6, 'Compaction head', 'start acc-t') + lab(560, +hy + 26, 'presses the mix', 'start faint-t') + lead('M' + hx1 + ' ' + (+hy + 14) + 'H552', [hx1, +hy + 14])
      + lab(-146, 262, 'Mould', 'start acc-t') + lab(-146, 282, 'sets the shape', 'start faint-t') + lead('M-10 270H150', [150, 270])
      + lab(560, 300, 'Demoulded paver', 'start');
    var gl = '<rect class="aps-ground" x="-160" y="396" width="960" height="14"/><path class="ln faint" d="M-160 396H800"/>';
    return { vb: [-160, 40, 960, 390], markup: '<defs>' + set.defs + concrete() + '</defs>' + gl + cols + mouldBack + zones + parts + walls + beam + head + zHead + table + springs + paverOut + '<g class="lbl">' + labels + '</g>' };
  }

  /* ---------- rebar: smaller aggregate passes between the bars, a larger piece bridges them ---------- */
  function rebar(A, o) {
    o = o || {}; var midKind = o.mid || '10', midLabel = o.midLabel || '10 mm aggregate', midSub = o.midSub || 'passes through the gaps';
    var R = A.rng(1010), x0 = 122, x1 = 438, floor = 350, top = 106, BR = 11;
    var barX = [148, 201, 254, 307, 360, 413], rows = [185, 250];
    var set = stoneSet(A, 'rb', SIZES, 3, function (i) { return i < 3 ? '10' : i < 4 ? midKind : '20'; });
    var bigs = [201, 307, 360].map(function (gx) { return { x: gx - (gx === 307 ? 0 : 0) + 26.5 * 0, y: rows[0] - Math.sqrt(29.5 * 29.5 - 26.5 * 26.5), r: 18.5 }; });
    // gap centres are midway between bars
    bigs = [174.5, 280.5, 333.5].map(function (gx) { return { x: gx, y: rows[0] - Math.sqrt(29.5 * 29.5 - 26.5 * 26.5), r: 18.5 }; });
    var radii = [5.2, 7.4, 7.4, 5.2, 10.5, 3.6], items = [];
    for (var n = 0; n < 170; n++) { var k = Math.floor(R() * radii.length); items.push({ r: radii[k], c: radii[k] === 10.5 ? 3 : radii[k] === 7.4 ? 2 : radii[k] === 5.2 ? 1 : 0, k: n }); }
    var pile = pack(R, [x0, x1, floor, rows[1] + 26], items, []);
    var transit = [[147, 130, 1], [174, 213, 1], [227.5, 160, 2], [227.5, 220, 1], [307, 128, 1], [200, 138, 0], [387, 140, 2], [253, 110, 1], [333, 118, 0]].map(function (t) { return { x: t[0], y: t[1], r: SIZES[t[2]] * 1.0, c: t[2], k: 7 }; });
    var all = pile.concat(transit).map(function (p) { return { x: p.x, y: p.y, r: p.r, c: p.c, k: p.k, big: false }; }).concat(bigs.map(function (b) { return { x: b.x, y: b.y, r: b.r, c: 4, k: 2, big: true }; }));
    var parts = all.map(function (p, i) {
      var dy = -(p.y + 60) - (p.big ? 0 : R() * 30), dx = (R() - 0.5) * 6;
      return '<g class="mp" style="--dx:' + F(dx) + 'px;--dy:' + F(dy) + 'px">' + set.use(p.c, i, p.x, p.y, R() * 360) + (p.big ? '<circle class="aps-pulse" cx="' + F(p.x) + '" cy="' + F(p.y) + '" r="' + (p.r + 4) + '" fill="none" stroke="#FF5E29" stroke-width="2.2"/>' : '') + '</g>';
    }).join('');
    var form = '<rect fill="#2a2c31" x="' + x0 + '" y="' + top + '" width="' + (x1 - x0) + '" height="' + (floor - top) + '"/>'
      + '<rect class="o" fill="url(#a-steelV)" x="100" y="' + (top - 10) + '" width="22" height="' + (floor - top + 34) + '"/><path class="hl" d="M104 ' + top + 'V' + (floor + 20) + '"/>'
      + '<rect class="o" fill="url(#a-steelV)" x="438" y="' + (top - 10) + '" width="22" height="' + (floor - top + 34) + '"/><path class="hl" d="M442 ' + top + 'V' + (floor + 20) + '"/>'
      + '<rect class="o" fill="url(#a-steelH)" x="100" y="' + floor + '" width="360" height="24"/><path class="hl" d="M104 ' + (floor + 3) + 'H456"/>'
      + [150, 310, 410].map(function (x) { return '<rect class="o" fill="url(#a-steelD)" x="' + x + '" y="' + (floor + 24) + '" width="18" height="14"/>'; }).join('');
    var bars = barX.map(function (x) { return rows.map(function (y) { return '<circle class="o" cx="' + x + '" cy="' + y + '" r="' + BR + '" fill="url(#a-hub)"/><circle cx="' + x + '" cy="' + y + '" r="' + (BR - 4) + '" fill="none" stroke="#2a2c30" stroke-opacity=".45" stroke-width="1.2"/><path d="M' + (x - 6.5) + ' ' + (y - 5) + 'A8 8 0 0 1 ' + (x - 1) + ' ' + (y - 8.5) + '" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none" stroke-linecap="round"/>'; }).join(''); }).join('');
    // the funnel the concrete is placed through
    var funnel = '<path class="o" fill="url(#a-cone)" d="M254 30H386L358 92H282Z"/><path class="o" fill="url(#a-paint)" d="M248 24H392V34H248Z"/><rect class="o" fill="url(#a-steelD)" x="310" y="92" width="40" height="12"/>';
    var zones = Z('spacing', barX.slice(0, -1).map(function (x, i) { return '<rect x="' + (x + BR) + '" y="' + (rows[0] - 24) + '" width="' + (barX[1] - barX[0] - 2 * BR) + '" height="' + (rows[1] - rows[0] + 48) + '" fill="#FF5E29" opacity=".3"/>'; }).join(''))
      + Z('cover', '<rect x="' + x0 + '" y="' + (rows[0] - 24) + '" width="' + (barX[0] - BR - x0) + '" height="' + (rows[1] - rows[0] + 48) + '" fill="#FF5E29" opacity=".5"/><rect x="' + (barX[5] + BR) + '" y="' + (rows[0] - 24) + '" width="' + (x1 - barX[5] - BR) + '" height="' + (rows[1] - rows[0] + 48) + '" fill="#FF5E29" opacity=".5"/>')
      + Z('thick', '<path d="M' + x0 + ' 96H' + x1 + 'M' + x0 + ' 88V104M' + x1 + ' 88V104" stroke="#FF5E29" stroke-width="3.2" fill="none" stroke-linecap="round"/>')
      + Z('flowc', '<rect x="' + x0 + '" y="' + top + '" width="' + (x1 - x0) + '" height="150" fill="#FF5E29" opacity=".14"/>')
      + Z('compact', [0, 1, 2].map(function (i) { return '<path d="M' + (150 + i * 110) + ' 330q8 -10 16 0t16 0t16 0t16 0" stroke="#FF5E29" stroke-width="3" fill="none" stroke-linecap="round"/>'; }).join(''))
      + Z('mixd', '<rect x="' + (x0 - 5) + '" y="' + (top - 4) + '" width="' + (x1 - x0 + 10) + '" height="' + (floor - top + 10) + '" rx="4" fill="none" stroke="#FF5E29" stroke-width="3.4" stroke-dasharray="9 7"/>');
    var big = bigs[2];
    var labels = '<g class="lbl">' + lab(474, 150, 'Reinforcement bars') + lead('M424 ' + rows[0] + 'H468', [424, rows[0]])
      + lab(474, 196, 'Larger aggregate', 'start acc-t') + lab(474, 214, 'rests on the bars', 'start faint-t') + lead('M' + F(big.x + big.r + 2) + ' ' + F(big.y) + 'H468')
      + lab(474, 300, midLabel, 'start acc-t') + lab(474, 318, midSub, 'start faint-t') + lead('M432 306H468', [432, 306])
      + lab(30, 60, 'Clear spacing', 'start acc-t') + lead('M174 66V' + (rows[0] - 14)) + '</g>';
    var gl = '<rect class="aps-ground" x="0" y="396" width="780" height="14"/><path class="ln faint" d="M0 396H780"/>';
    return { vb: [0, 12, 780, 400], markup: '<defs>' + set.defs + '</defs>' + gl + form + zones + parts + bars + funnel + labels };
  }

  /* ---------- hollow block: oblique projection, exploded and assembled ---------- */
  function box3(x, y, z, w, h, d, tone) {
    // oblique: x right, y up, z into the picture (up and to the right)
    var kx = 0.55, ky = 0.34, X0 = 150, Y0 = 330;
    var P = function (a, b, c) { return [X0 + a + c * kx, Y0 - b - c * ky]; };
    var pp = function (arr) { return 'M' + arr.map(function (p) { return F(p[0]) + ' ' + F(p[1]); }).join('L') + 'Z'; };
    var A = P(x, y, z), B = P(x + w, y, z), C = P(x + w, y + h, z), D = P(x, y + h, z), E = P(x, y + h, z + d), Fp = P(x + w, y + h, z + d), G = P(x + w, y, z + d);
    var t = tone || ['#f3f0ea', '#d9d5cb', '#b5b0a4'];
    return '<path class="o" fill="' + t[0] + '" d="' + pp([D, C, Fp, E]) + '"/><path class="o" fill="' + t[1] + '" d="' + pp([A, B, C, D]) + '"/><path class="o" fill="' + t[2] + '" d="' + pp([B, G, Fp, C]) + '"/>'
      + '<path fill="url(#aps-speck)" opacity=".85" d="' + pp([D, C, Fp, E]) + '"/><path fill="url(#aps-speck)" opacity=".7" d="' + pp([A, B, C, D]) + '"/><path fill="url(#aps-speck)" opacity=".55" d="' + pp([B, G, Fp, C]) + '"/>'
      + '<path d="' + pp([D, C, Fp, E]) + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>';
  }
  function block(A) {
    var W = 380, Hh = 112, D = 150, t = 28, web = 26;
    var part = function (cls, dx, dy, markup) { return '<g class="bp ' + cls + '" style="--dx:' + dx + 'px;--dy:' + dy + 'px">' + markup + '</g>'; };
    var cores = '<g class="fadein">' + [[t, (W - web) / 2 - t], [(W + web) / 2, (W - web) / 2 - t]].map(function (c) {
      var kx = 0.55, ky = 0.34, X0 = 150, Y0 = 330, P = function (a, b, cc) { return [X0 + a + cc * kx, Y0 - b - cc * ky]; };
      var q = [P(c[0], Hh, t), P(c[0] + c[1], Hh, t), P(c[0] + c[1], Hh, D - t), P(c[0], Hh, D - t)];
      return '<path d="M' + q.map(function (p) { return F(p[0]) + ' ' + F(p[1]); }).join('L') + 'Z" fill="#1e1f23"/>';
    }).join('') + '</g>';
    var body = part('p-back', 36, -34, box3(0, 0, D - t, W, Hh, t))
      + cores
      + part('p-web', 0, -58, box3((W - web) / 2, 0, t, web, Hh, D - 2 * t))
      + part('p-l', -60, 0, box3(0, 0, t, t, Hh, D - 2 * t))
      + part('p-r', 60, 0, box3(W - t, 0, t, t, Hh, D - 2 * t))
      + part('p-front', -34, 30, box3(0, 0, 0, W, Hh, t));
    var lead = function (d, dot) { return '<path class="ln acc" d="' + d + '"/><circle class="ring-on" cx="' + dot[0] + '" cy="' + dot[1] + '" r="3.6"/>'; };
    var labels = '<g class="fadein">'
      + lab(36, 168, 'Wall thickness', 'start acc-t') + lead('M150 176L228 213', [228, 213])
      + lab(412, 118, 'Web', 'start acc-t') + lead('M408 124L382 192', [382, 192])
      + lab(578, 150, 'End wall', 'start acc-t') + lead('M584 158L558 193', [558, 193])
      + lab(196, 126, 'Core (void)', 'start acc-t') + lead('M262 132L293 190', [293, 190])
      + '</g>';
    var gl = '<ellipse cx="350" cy="360" rx="300" ry="14" fill="url(#a-shadow)" opacity=".9"/>';
    return { vb: [0, 20, 700, 400], markup: '<defs>' + concrete() + '</defs>' + gl + body + labels };
  }

  /* ---------- photographic strata (the homepage "road section" treatment) ----------
     One composite photograph holds every course (hardened concrete from the block photo, real stones set in it); each course shows its
     own band of it, is wiped on from the bottom up as the figure scrolls, and gets a ring marker, a leader line and a name below. */
  var STRATA = {
    exposed: { file: 'strata-exposed.webp', w: 1400, h: 620, top: 90, courses: [
      { k: 'sub', y0: 420, y1: 620, name: 'SUBSTRATE' }, { k: 'matrix', y0: 200, y1: 420, name: 'CEMENT PASTE MATRIX' }, { k: 'stone', y0: 90, y1: 200, name: 'EXPOSED STONE' }] },
    texture: { file: 'strata-texture.webp', w: 1400, h: 540, top: 110, courses: [
      { k: 'sub', y0: 330, y1: 540, name: 'SUBSTRATE' }, { k: 'finish', y0: 190, y1: 330, name: 'FINISH LAYER' }, { k: 'grit', y0: 110, y1: 190, name: 'SELECTED GRIT' }] },
  };
  function strata(key) {
    var S = STRATA[key], X = 60, W = 880, k = W / S.w;
    var contentH = (S.h - S.top) * k + 86, Y = Math.max(40, (667 - contentH) / 2 + 10);
    var oy = Y - S.top * k; // top of the visible cut in the viewBox
    var defs = '', out = '', labs = '', n = S.courses.length;
    S.courses.forEach(function (c, i) {
      var id = 'aps-cl-' + key + '-' + c.k, yy = oy + c.y1 * k, hh = (c.y1 - c.y0) * k, dly = i;
      defs += '<clipPath id="' + id + '"><rect class="aps-wipe aps-wipe' + (i + 1) + '" x="' + X + '" y="' + F(oy + c.y0 * k) + '" width="' + W + '" height="' + F(hh) + '"/></clipPath>';
      out += '<g clip-path="url(#' + id + ')"><image href="' + MAT + S.file + '" x="' + X + '" y="' + F(oy) + '" width="' + W + '" height="' + F(S.h * k) + '" preserveAspectRatio="none"/></g>';
      var mx = X + 140 + i * 290, my = oy + (c.y0 + c.y1) / 2 * k, ly = oy + S.h * k + 36;
      labs += '<path class="ln" d="M' + F(mx) + ' ' + F(my) + 'V' + F(ly - 20) + '"/><circle class="ring-on" cx="' + F(mx) + '" cy="' + F(my) + '" r="5.5"/>'
        + '<text class="lab call" x="' + F(mx) + '" y="' + F(ly + 2) + '">' + c.name + '</text>';
    });
    var bottom = oy + S.h * k;
    var frame = '<ellipse cx="' + (X + W / 2) + '" cy="' + F(bottom + 6) + '" rx="' + (W * 0.52) + '" ry="12" fill="url(#a-shadow)"/>'
      + '<path class="ln" d="M' + X + ' ' + F(oy + S.courses[1].y0 * k) + 'V' + F(bottom) + 'M' + (X + W) + ' ' + F(oy + S.courses[1].y0 * k) + 'V' + F(bottom) + '"/>'
      + '<path class="aps-gline" d="M' + (X - 30) + ' ' + F(oy + S.courses[1].y0 * k) + 'H' + (X + W + 30) + '" stroke-dasharray="2 8" stroke-linecap="round"/>';
    return { vb: [0, 0, 1000, 667], markup: '<defs>' + defs + '</defs>' + frame + '<g class="aps-strata">' + out + '</g><g class="lbl">' + labs + '</g>' };
  }

  /* ---------- terrazzo: real stone chips in a cement matrix, as cast then ground and polished ---------- */
  function terrazzo() {
    var html = '<img class="ap6-terr aps-terr is-rough" src="' + MAT + 'terrazzo-cast.webp" width="1400" height="933" alt="Terrazzo as cast: small stone chips set in a cement matrix, with the surface still covered by a film of cement" loading="lazy" decoding="async">'
      + '<img class="ap6-terr aps-terr is-polished" src="' + MAT + 'terrazzo-polished.webp" width="1400" height="933" alt="" loading="lazy" decoding="async">'
      + '<span class="ap6-tbar" aria-hidden="true"></span><span class="ap6-tlab l" aria-hidden="true">As cast</span><span class="ap6-tlab r" aria-hidden="true">Ground and polished</span>';
    return { html: html };
  }

  /* ---------- the same photograph scale, larger vs smaller aggregate ---------- */
  function surface() {
    var card = function (x, file, alt, name, sub) {
      return '<rect x="' + (x + 4) + '" y="46" width="380" height="380" rx="10" fill="#141416" fill-opacity=".06"/>'
        + '<clipPath id="aps-sf-' + file + '"><rect x="' + x + '" y="40" width="380" height="380" rx="10"/></clipPath>'
        + '<image href="' + MAT + 'sample-' + file + '.webp" x="' + x + '" y="40" width="380" height="380" preserveAspectRatio="xMidYMid slice" clip-path="url(#aps-sf-' + file + ')" role="img" aria-label="' + alt + '"/>'
        + '<rect x="' + x + '" y="40" width="380" height="380" rx="10" fill="none" stroke="rgba(20,20,22,.14)"/>'
        + '<text class="lab call" x="' + (x + 190) + '" y="458">' + name + '</text><text class="lab faint-t" x="' + (x + 190) + '" y="482">' + sub + '</text>';
    };
    return { vb: [0, 0, 1000, 510], markup: '<g class="aps-b aps-b1">' + card(100, 'larger', 'Heap of larger crushed stone aggregate', 'LARGER AGGREGATE', 'fewer particles to coat') + '</g><g class="aps-b aps-b2">' + card(520, 'smaller', 'Heap of smaller crushed stone aggregate', 'SMALLER AGGREGATE', 'more surface to coat with paste') + '</g>' };
  }

  /* ---------- test sieve: what is retained on 4.75 mm and what passes ---------- */
  function sieve(A) {
    var R = A.rng(475), set = stoneSet(A, 'sv', SIZES, 3, function (i) { return i < 2 ? '6' : '10'; });
    var fx0 = 110, fx1 = 530, my = 220;
    var meshY = my + 4;
    // frame (steel ring), mesh, collecting pan below
    var frame = '<g class="aps-shake"><rect class="o" fill="url(#a-steelH)" x="' + (fx0 - 14) + '" y="' + (my - 40) + '" width="14" height="' + 56 + '"/><rect class="o" fill="url(#a-steelH)" x="' + fx1 + '" y="' + (my - 40) + '" width="14" height="56"/>'
      + '<rect class="o" fill="url(#a-mesh)" x="' + fx0 + '" y="' + (my - 2) + '" width="' + (fx1 - fx0) + '" height="14"/>'
      + '<rect class="o" fill="url(#a-steelD)" x="' + (fx0 - 14) + '" y="' + (my + 12) + '" width="' + (fx1 - fx0 + 28) + '" height="10"/>'
      + '<path class="hl" d="M' + (fx0 - 10) + ' ' + (my - 36) + 'V' + (my + 8) + '"/></g>';
    var pan = '<path class="o" fill="url(#a-cone)" d="M' + (fx0 - 30) + ' 322H' + (fx1 + 30) + 'L' + (fx1 + 6) + ' 376H' + (fx0 - 6) + 'Z"/><rect class="o" fill="url(#a-steelD)" x="' + (fx0 - 40) + '" y="316" width="' + (fx1 - fx0 + 80) + '" height="8"/>';
    // retained: larger stones resting on the mesh; passed: small stones settled in the pan
    var kept = '', n = 0;
    [[170, 3], [238, 3], [314, 2], [372, 3], [448, 2], [206, 2], [276, 2], [408, 3]].forEach(function (p) { var c = p[1], r = SIZES[c]; kept += set.use(c, n++, p[0], my - 2 - r * 0.62, R() * 360); });
    var passed = '';
    for (var i = 0; i < 90; i++) { var c = Math.floor(R() * 2), r = SIZES[c]; passed += set.use(c, n++, fx0 + 14 + R() * (fx1 - fx0 - 28), 316 - r * 0.6 - R() * 16 * (1 - Math.abs((i % 30) - 15) / 15), R() * 360); }
    var falls = [150, 220, 290, 350, 420, 480].map(function (x, i) { return H.stones([[x, my + 14], [x + (i % 2 ? 5 : -5), 312]], { speed: 55, gap: 60, size: [3, 4.2], seed: 11 + i }); }).join('');
    var labels = '<g class="lbl">' + lab(320, 78, '4.75 mm IS sieve', 'acc-t') + lead('M320 88V' + (my - 4)) + '<circle class="ring" cx="320" cy="' + (my + 5) + '" r="4.5"/>'
      + lab(fx0 - 6, 148, 'Retained on 4.75 mm', 'start') + lab(fx0 - 6, 166, 'coarse aggregate', 'start faint-t')
      + lab(fx1 + 54, 340, 'Passing 4.75 mm', 'start') + lab(fx1 + 54, 358, 'fine aggregate', 'start faint-t') + '</g>';
    return { vb: [0, 40, 800, 350], markup: '<defs>' + set.defs + '</defs>' + pan + '<g class="fadein">' + passed + '</g>' + frame + kept + '<g class="aps-flow">' + falls + '</g>' + labels };
  }

  var S = APS.SCENES;
  APS.toolkit = { MAT: MAT, SPR: SPR, stoneSet: stoneSet, stoneSym: stoneSym, pack: pack, Z: Z, lab: lab, lead: lead, SIZES: SIZES, F: F, esc: esc };
  S.paver = paver; S.rebar = rebar; S.block = block; S.terrazzo = terrazzo; S.exposed = function () { return strata('exposed'); }; S.texture = function () { return strata('texture'); }; S.surface = surface; S.sieve = sieve;
})();
