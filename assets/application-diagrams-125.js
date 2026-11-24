/* OM GROUP · 12.5mm application page scenes (TEMPORARY TEST BUILD, local only).
   Registers more scenes with the scene engine (application-scenes.js), using the same toolkit as application-diagrams.js:
   homepage art library for machinery, the project's own photographs for every stone, sand and surface.
     blend    ready-mix batching plant: bins of 10 / 12.5 / 20 mm and sand, gathering belt, inclined belt, mixing tower, transit mixer
     gradetray single-sized vs graded 12.5 mm, as real stones in two sample trays
     sieve125 laboratory sieve stack with real stones retained on each sieve
     roadmix  separate fractions → combined grading → job mix formula → paved surface
   Diagrams only: no mix proportions, no grading values, no percentages. */
(function () {
  'use strict';
  var APS = window.APS; if (!APS || !APS.toolkit) return;
  var H = APS.helpers, at = H.at, T = APS.toolkit;
  var F = T.F, esc = T.esc, MAT = T.MAT, stoneSet = T.stoneSet, pack = T.pack, lab = T.lab, lead = T.lead;
  var label = H.label, lt = H.lt, binTag = H.binTag;
  var PHOTO = '/img/applications/12-5mm-aggregates/';

  /* ---------- ready-mix batching plant, four bins, aggregate flowing to the mixer ---------- */
  function blend(A, o, narrow) {
    var P = A.plant(), TM = A.transitMixer('bl'), tx0 = P.chute.x - TM.hopper[0];
    var bx = function (i) { return 64 + i * 128; };
    var kinds = [
      { k: '10', name: '10 MM', sr: 3.4, sz: [2.6, 3.3], r: 3.0, seed: 101 },
      { k: '12', name: '12.5 MM', sr: 4.4, sz: [3.3, 4.1], r: 3.6, seed: 102, hot: true },
      { k: '20', name: '20 MM', sr: 6.9, sz: [4.8, 6.0], r: 5.2, seed: 103 },
      { k: 'sand', name: 'M-SAND', sz: [1.3, 1.7], r: 1.9, seed: 104 },
    ];
    var heap = function (c, i) {
      var h = c.sr ? A.pile(118, 46, c.seed, { sr: c.sr, strata: 1 }).strata[0] : A.sandHeap(118, 42, c.seed, 'm');
      return '<g class="bl-f bl-' + c.k + '" transform="translate(' + P.binTops[i][0] + ' ' + P.binTops[i][1] + ')">' + h + '</g>';
    };
    var heaps = kinds.map(heap).join('');
    var statics = P.frameBins + P.bins + P.gather.frame + P.incline.frame + P.incline.rail + P.tower + P.hoppers + P.mixer;
    // gates swing open in turn (the plates sit over the gather belt)
    var gates = P.gates.map(function (q) { return at(q.x - 14, q.y, '<rect class="o" fill="url(#a-paint)" x="0" y="-4" width="28" height="12" rx="1.5"/><circle r="2.2" fill="#3a3c40"/>'); }).join('');
    var mixDrive = at(P.mixerDrive.x, P.mixerDrive.y, '<g class="aps-spin" style="--sp:.9s"><circle class="o" r="' + P.mixerDrive.r + '" fill="url(#a-rim)"/><path class="rmark" d="M-6 0H6M0 -6V6"/></g>');
    var truck = at(tx0, 0, TM.body + '<g class="aps-drum">' + TM.drum + '</g>' + TM.wheels + TM.fenders);
    var back = '<g opacity=".9">' + A.hills(1300, 240, 3, -40) + A.hills(900, 280, 5, 760) + '</g>';
    var ground = '<rect class="aps-ground" x="-60" y="0" width="1560" height="14"/><path class="ln faint" d="M-60 0H1500"/>';
    // flows: each fraction leaves its gate, rides the belts together, goes into the mixer, and leaves through the chute into the truck
    var up = function (r) { return [P.gather.at(70, r), P.gather.at(P.gather.L, r), P.incline.at(0, r), P.incline.at(P.incline.L, r)]; };
    var flows = '';
    kinds.forEach(function (c, i) {
      var g = P.gates[i], s = '';
      s += H.stones([[g.x, g.y + 10], [g.x, -196 - c.r]], { speed: 60, gap: c.sr ? 11 : 7, size: c.sz, seed: c.seed });
      s += H.stones(up(c.r + i * 0.2), { speed: 44, gap: c.sr ? (c.k === '20' ? 52 : 30) : 36, size: c.sz, seed: c.seed + 20 });
      flows += '<g class="bl-f bl-' + c.k + '">' + s + '</g>';
    });
    // mixed outflow: always shown (the combined material)
    flows += H.stones([[P.chute.x, P.chute.y + 8], [P.chute.x, -168]], { speed: 40, gap: 10, size: [2.4, 4.4], seed: 140 });
    var sub = narrow ? 100 : 82;
    var ticks = '<path class="aps-gline" d="M-40 34H1440"/>' + [256, 700, 990, tx0 + 250].map(function (x) { return '<circle class="ring" cx="' + x + '" cy="34" r="4.5"/>'; }).join('');
    var sl = function (x, t) { return label(x, sub, t, 'faint-t'); };
    var labs = label(256, 64, lt('AGGREGATE BINS', 'BINS')) + sl(256, 'SEPARATE FRACTIONS')
      + label(700, 64, 'BELTS') + sl(700, 'WEIGHED, THEN LIFTED')
      + label(990, 64, lt('MIXING TOWER', 'MIXER')) + sl(990, 'BLENDED TO THE MIX DESIGN')
      + label(tx0 + 250, 64, lt('TRANSIT MIXER', 'TRUCK')) + sl(tx0 + 250, 'DELIVERY');
    var tags = kinds.map(function (c, i) { return '<text class="lab bin-t' + (c.hot ? ' acc-t' : '') + '" x="' + bx(i) + '" y="-404" style="font-weight:700;letter-spacing:.12em">' + binTag(c.name, bx(i)) + '</text>' + (c.hot ? '<circle class="ring-on" cx="' + bx(i) + '" cy="-388" r="4"/>' : ''); }).join('');
    var markup = back + ground
      + '<g class="aps-b aps-b1">' + statics + heaps + gates + '</g>'
      + '<g class="aps-b aps-b2">' + belt2(A) + mixDrive + '</g>'
      + '<g class="aps-b aps-b3">' + truck + '<path class="pipe" d="M' + P.chute.x + ' ' + P.chute.y + 'V-168"/></g>'
      + '<g class="aps-b aps-b4">' + ticks + labs + tags + '</g>'
      + '<g class="aps-flow">' + flows + '</g>';
    return { vb: [-40, -700, 1480, 800], world: [-40, 1440], markup: markup };
    function belt2(AA) { return H.belt(AA, P.gather) + H.belt(AA, P.incline); }
  }

  /* ---------- single-sized vs graded: two sample trays of real stones ---------- */
  function gradetray(A) {
    var set = stoneSet(A, 'gt', [4.4, 6.2, 8.6, 10.8], 3, function (i) { return i < 2 ? '6' : i < 3 ? '10' : '12'; });
    var setS = stoneSet(A, 'gs', [9.8, 10.6, 11.4], 3, function () { return '12'; });
    var R = A.rng(125), X = [40, 520], W = 440, top = 72, floor = 372, parts = '';
    // single-sized: a narrow band of sizes
    var itemsS = []; for (var n = 0; n < 260; n++) { var c = Math.floor(R() * 3); itemsS.push({ r: [9.8, 10.6, 11.4][c], c: c, k: n }); }
    var PS = pack(R, [X[0] + 10, X[0] + W - 10, floor, top + 40], itemsS, []);
    PS.forEach(function (p, i) { parts += '<g class="gt-s">' + setS.use(p.c, i, p.x, p.y, R() * 360) + '</g>'; });
    // graded: a wider spread, fine to coarse
    var radii = [4.4, 4.4, 6.2, 6.2, 6.2, 8.6, 8.6, 10.8], itemsG = []; for (var m = 0; m < 380; m++) { var k = Math.floor(R() * radii.length); itemsG.push({ r: radii[k], c: [4.4, 6.2, 8.6, 10.8].indexOf(radii[k]), k: m }); }
    var PG = pack(R, [X[1] + 10, X[1] + W - 10, floor, top + 40], itemsG, []);
    PG.forEach(function (p, i) { parts += '<g class="gt-g">' + set.use(p.c, i, p.x, p.y, R() * 360) + '</g>'; });
    var tray = function (x) {
      return '<rect x="' + (x + 4) + '" y="' + (top - 2) + '" width="' + W + '" height="' + (floor - top + 36) + '" rx="12" fill="#141416" fill-opacity=".07"/>'
        + '<rect class="card-bg" x="' + x + '" y="' + (top - 8) + '" width="' + W + '" height="' + (floor - top + 36) + '" rx="12"/>'
        + '<rect x="' + (x + 8) + '" y="' + (floor + 2) + '" width="' + (W - 16) + '" height="14" rx="3" fill="#cfc9bd"/>';
    };
    var labels = '<g class="lbl"><text class="lab call" x="' + (X[0] + W / 2) + '" y="' + (floor + 62) + '">SINGLE-SIZED 12.5 MM</text><text class="lab faint-t" x="' + (X[0] + W / 2) + '" y="' + (floor + 86) + '">a narrow band of particle sizes</text>'
      + '<text class="lab call" x="' + (X[1] + W / 2) + '" y="' + (floor + 62) + '">GRADED 12.5 MM</text><text class="lab faint-t" x="' + (X[1] + W / 2) + '" y="' + (floor + 86) + '">a wider spread, fine to coarse</text></g>';
    var rings = '<g class="z z-single"><rect x="' + (X[0] - 6) + '" y="' + (top - 14) + '" width="' + (W + 12) + '" height="' + (floor - top + 48) + '" rx="14" fill="none" stroke="#FF5E29" stroke-width="3.2" stroke-dasharray="9 7"/></g>'
      + '<g class="z z-graded"><rect x="' + (X[1] - 6) + '" y="' + (top - 14) + '" width="' + (W + 12) + '" height="' + (floor - top + 48) + '" rx="14" fill="none" stroke="#FF5E29" stroke-width="3.2" stroke-dasharray="9 7"/></g>';
    return { vb: [0, 20, 1000, 520], markup: '<defs>' + set.defs + setS.defs + '</defs>' + tray(X[0]) + tray(X[1]) + '<g class="fadein2">' + parts + '</g>' + rings + labels };
  }

  /* ---------- laboratory sieve stack ---------- */
  function sieve125(A) {
    var R = A.rng(1250), set = stoneSet(A, 'sx', [5.2, 7.4, 9.4, 12.4], 3, function (i) { return i === 0 ? '6' : i === 1 ? '10' : i === 2 ? '12' : '20'; });
    var SX0 = 80, SX1 = 400, ys = [26, 112, 198, 284], names = ['20 mm', '16 mm', '12.5 mm', '10 mm'];
    var kept = ['20', '12', '12', '10'], keptI = [3, 2, 2, 1], keptN = [5, 7, 8, 9], kr = [12.4, 9.4, 9.4, 7.4];
    var frameOf = function (y, i) {
      var hot = i === 2;
      return '<rect class="o" fill="url(#a-steelH)" x="' + (SX0 - 12) + '" y="' + (y - 34) + '" width="12" height="58"/><rect class="o" fill="url(#a-steelH)" x="' + SX1 + '" y="' + (y - 34) + '" width="12" height="58"/>'
        + '<rect class="o" fill="url(#a-mesh)" x="' + SX0 + '" y="' + (y - 2) + '" width="' + (SX1 - SX0) + '" height="12"/>'
        + '<rect class="o" fill="url(#a-steelD)" x="' + (SX0 - 12) + '" y="' + (y + 10) + '" width="' + (SX1 - SX0 + 24) + '" height="10"/>'
        + (hot ? '<rect class="o" fill="url(#a-paint)" x="' + (SX0 - 12) + '" y="' + (y - 34) + '" width="' + (SX1 - SX0 + 24) + '" height="7"/>' : '<rect class="o" fill="url(#a-steelD)" x="' + (SX0 - 12) + '" y="' + (y - 34) + '" width="' + (SX1 - SX0 + 24) + '" height="7"/>');
    };
    var stack = '', st = '', n = 0;
    ys.forEach(function (y, i) {
      stack += frameOf(y, i);
      for (var j = 0; j < keptN[i]; j++) { var r = kr[i]; st += set.use(keptI[i], n++, SX0 + 26 + (j + 0.5) * ((SX1 - SX0 - 52) / keptN[i]) + (R() - 0.5) * 6, y - 2 - r * 0.62, R() * 360); }
    });
    // pan
    var pan = '<path class="o" fill="url(#a-cone)" d="M' + (SX0 - 40) + ' 372H' + (SX1 + 40) + 'L' + (SX1 + 14) + ' 426H' + (SX0 - 14) + 'Z"/><rect class="o" fill="url(#a-steelD)" x="' + (SX0 - 50) + '" y="366" width="' + (SX1 - SX0 + 100) + '" height="8" rx="2"/>';
    var fines = ''; for (var q = 0; q < 70; q++) fines += set.use(0, n++, SX0 + 12 + R() * (SX1 - SX0 - 24), 372 - 3.4 - R() * 10 * (1 - Math.abs((q % 28) - 14) / 14), R() * 360);
    var falls = [150, 220, 290, 360].map(function (x, i) { return H.stones([[x, ys[0] + 14], [x + (i % 2 ? 6 : -6), 364]], { speed: 55, gap: 70, size: [2.6, 4], seed: 21 + i }); }).join('');
    var lx = SX1 + 56, labels = '<g class="lbl">';
    ys.forEach(function (y, i) { labels += '<path class="ln' + (i === 2 ? ' acc' : '') + '" d="M' + (SX1 + 14) + ' ' + (y + 4) + 'H' + (lx - 8) + '"/><circle class="' + (i === 2 ? 'ring-on' : 'ring') + '" cx="' + (SX1 + 14) + '" cy="' + (y + 4) + '" r="4"/>'
      + '<text class="lab start' + (i === 2 ? ' acc-t' : '') + '" x="' + lx + '" y="' + (y + 9) + '" style="font-weight:700;letter-spacing:.1em">' + names[i] + ' SIEVE</text>'; });
    labels += '<text class="lab start faint-t" x="' + lx + '" y="' + (ys[2] + 30) + '">nominal size under study</text>';
    labels += '<text class="lab start" x="' + lx + '" y="400" style="font-weight:700;letter-spacing:.1em">PAN</text><text class="lab start faint-t" x="' + lx + '" y="420">passes every sieve</text></g>';
    // right-hand note column: what the report states
    var note = '<g class="lbl"><text class="lab start faint-t" x="' + (lx + 260) + '" y="' + (ys[0] + 4) + '">retained on each sieve</text><path class="ln faint dash" d="M' + (lx + 252) + ' ' + (ys[0] - 20) + 'V' + (ys[3] + 26) + '"/></g>';
    return { vb: [0, 0, 760, 450], markup: '<defs>' + set.defs + '</defs>' + pan + '<g class="fadein">' + fines + '</g><g class="aps-shake">' + stack + '</g>' + st + '<g class="aps-flow">' + falls + '</g>' + labels };
  }

  /* ---------- road mix: separate fractions → combined grading → job mix formula → paved surface ---------- */
  function roadmix(A, o, narrow) {
    // phones draw the labels larger (in drawing units), so the cards are wider there: the titles stay inside their card
    var cw = 290, ch = 150, X0 = 20, ys = [-560, -388, -216];
    // card text rows (offsets up from the card bottom): phones get more room between the title and the sub-label
    var tY = 24, sY = 9, seY = 46, piY = 52;
    var cards = [
      { name: 'Coarse aggregate', sub: lt('INCL. 12.5 MM, WHERE APPROVED', 'INCL. 12.5 MM'), pile: { sr: 5, seed: 71 }, hot: true },
      { name: 'Fine aggregate', sub: '' + 'SAND, CRUSHER FINES', sand: 'm', seed: 72 },
      { name: 'Mineral filler', sub: 'VERY FINE POWDER', sand: 'p', seed: 73 },
    ];
    var s1 = '', flows = '', J = [X0 + cw + 70, -388 + ch / 2];
    cards.forEach(function (c, i) {
      var y = ys[i];
      s1 += '<g transform="translate(' + X0 + ' ' + y + ')"><rect x="3" y="6" width="' + cw + '" height="' + ch + '" rx="10" fill="#141416" fill-opacity=".06"/><rect class="card-bg' + (c.hot ? ' hot' : '') + '" width="' + cw + '" height="' + ch + '" rx="10"/><path class="seam" d="M12 ' + (ch - seY) + 'H' + (cw - 12) + '"/>';
      var body = c.sand ? A.sandHeap(160, 70, c.seed, c.sand) : (function () { var Pl = A.pile(170, 84, c.pile.seed, { sr: c.pile.sr, strata: 1 }); return Pl.shadow + Pl.strata[0]; })();
      s1 += '<g transform="translate(' + (cw / 2) + ' ' + (ch - piY) + ')">' + body + '</g>';
      s1 += '<text class="lab card-t start' + (c.hot ? ' hot' : '') + '" x="14" y="' + (ch - tY) + '">' + esc(c.name) + '</text><text class="lab card-s start" x="14" y="' + (ch - sY) + '">' + c.sub + '</text></g>';
      var ty = y + ch / 2;
      s1 += '<path class="ln faint dash" d="M' + (X0 + cw) + ' ' + F(ty) + 'H' + (J[0] - 24) + 'L' + J[0] + ' ' + F(J[1]) + '"/>';
      flows += H.stones([[X0 + cw, ty], [J[0] - 24, ty], J], { speed: 34, gap: 24 + i * 2, size: c.sand ? [1.4, 2] : [3.4, 5.2], seed: 80 + i });
    });
    // combined grading card (the three streams joined)
    var CX = J[0] + 70, cw2 = 300, cy = -388 + ch / 2 - 105, ch2 = 210;
    var mixed = '<g transform="translate(' + CX + ' ' + cy + ')"><rect x="3" y="6" width="' + cw2 + '" height="' + ch2 + '" rx="10" fill="#141416" fill-opacity=".06"/><rect class="card-bg" width="' + cw2 + '" height="' + ch2 + '" rx="10"/><path class="seam" d="M12 ' + (ch2 - seY) + 'H' + (cw2 - 12) + '"/>'
      + '<g transform="translate(' + (cw2 / 2) + ' ' + (ch2 - piY - 2) + ')">' + (function () { var Pl = A.pile(190, 110, 74, { sr: 3.6, strata: 1 }); return Pl.shadow + Pl.strata[0]; })() + '</g>'
      + '<text class="lab card-t start" x="14" y="' + (ch2 - tY) + '">Combined grading</text><text class="lab card-s start" x="14" y="' + (ch2 - sY) + '">' + lt('THE WHOLE MIX, NOT ONE SIZE', 'THE WHOLE MIX') + '</text></g>';
    flows += H.stones([J, [J[0] + 40, J[1]], [CX, J[1]]], { speed: 34, gap: 16, size: [1.6, 4.6], seed: 90 });
    // job mix formula (a sheet: lines only, no values)
    var JX = CX + cw2 + 60, jw = 230, jh = 210, jy = cy;
    var lines = ''; for (var l = 0; l < 7; l++) lines += '<path d="M' + (22) + ' ' + (62 + l * 18) + 'H' + (jw - 22 - (l % 3) * 26) + '" stroke="#b9b4a9" stroke-width="3" stroke-linecap="round"/>';
    var jmf = '<g transform="translate(' + JX + ' ' + jy + ')"><rect x="3" y="6" width="' + jw + '" height="' + jh + '" rx="10" fill="#141416" fill-opacity=".06"/><rect class="card-bg hot" width="' + jw + '" height="' + jh + '" rx="10"/>'
      + '<rect x="22" y="22" width="40" height="12" rx="2" fill="#FF5E29"/>' + lines
      + '<text class="lab card-t start hot" x="14" y="' + (jh - tY) + '">Job mix formula</text><text class="lab card-s start" x="14" y="' + (jh - sY) + '">' + lt('APPROVED BEFORE PAVING', 'APPROVED FIRST') + '</text></g>';
    flows += H.stones([[CX + cw2, J[1]], [JX, J[1]]], { speed: 34, gap: 14, size: [1.8, 4], seed: 91 });
    // the paved surface: the project photograph in a card
    var PX = JX + jw + 60, pw = 390, ph = 260, py = cy - 25;
    var photo = '<g transform="translate(' + PX + ' ' + py + ')"><clipPath id="aps-rm-clip"><rect width="' + pw + '" height="' + ph + '" rx="10"/></clipPath><rect x="3" y="6" width="' + pw + '" height="' + ph + '" rx="10" fill="#141416" fill-opacity=".06"/>'
      + '<image href="' + PHOTO + '12-5mm-aggregate-bituminous-road-construction-640.webp" x="0" y="0" width="' + pw + '" height="' + ph + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#aps-rm-clip)" role="img" aria-label="Asphalt paver laying a bituminous road surface beside a heap of crushed stone"/>'
      + '<rect width="' + pw + '" height="' + ph + '" rx="10" fill="none" stroke="rgba(20,20,22,.18)"/></g>'
      + '<text class="lab card-t start" x="' + PX + '" y="' + (py + ph + 28) + '">Paved surface</text><text class="lab card-s start" x="' + PX + '" y="' + (py + ph + 44) + '">' + lt('THE SPECIFICATION DECIDES', 'SPEC DECIDES') + '</text>';
    flows += H.stones([[JX + jw, J[1]], [PX, J[1]]], { speed: 34, gap: 14, size: [1.8, 4], seed: 92 });
    var ground = '';
    var ticks = '<path class="aps-gline" d="M-20 34H' + Math.max(1560, PX + pw + 40) + '"/>' + [X0 + cw / 2, CX + cw2 / 2, JX + jw / 2, PX + pw / 2].map(function (x) { return '<circle class="ring" cx="' + x + '" cy="34" r="4.5"/>'; }).join('');
    var labs = label(X0 + cw / 2, 64, lt('SEPARATE FRACTIONS', 'FRACTIONS')) + label(CX + cw2 / 2, 64, lt('COMBINED GRADING', 'GRADING')) + label(JX + jw / 2, 64, lt('JOB MIX FORMULA', 'JOB MIX')) + label(PX + pw / 2, 64, lt('ROAD SURFACE', 'SURFACE'));
    var markup = '<g class="aps-b aps-b1">' + s1 + '</g><g class="aps-b aps-b2">' + mixed + '</g><g class="aps-b aps-b3">' + jmf + '</g><g class="aps-b aps-b4">' + photo + '</g><g class="aps-b aps-b5">' + ticks + labs + '</g><g class="aps-flow">' + flows + '</g>';
    return { vb: [-20, -590, Math.max(1580, PX + pw + 40 + 20), 720], world: [-20, Math.max(1560, PX + pw + 40)], markup: markup };
  }

  var S = APS.SCENES;
  S.blend = blend; S.gradetray = gradetray; S.sieve125 = sieve125; S.roadmix = roadmix;
})();
