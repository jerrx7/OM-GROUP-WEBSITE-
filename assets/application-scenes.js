/* OM GROUP · application scenes engine (TEMPORARY TEST BUILD, local only).
   Mounts the industrial motion graphics on the application pages, drawn with the homepage's own art library
   (window.OPM_ART from /assets/operations-motion/operations-art.js). Pages only need:

     <figure class="aps" data-scene="process" data-label="..." data-opts='{"hot":"6 mm","hotSr":2.6}'>
       <div class="aps-stage"><div class="aps-cap">...</div></div><figcaption>...</figcaption></figure>
     <link rel="stylesheet" href="/assets/application-scenes.css"> + <script src="/assets/application-scenes.js" defer>

   The library (≈160 KB) loads only when a scene is about to come on screen, so it never touches the page's first paint.
   Scenes are registered in SCENES (name → builder). A builder gets the art library, its options and whether the stage is
   narrow, and returns { vb, markup }. Shared helpers below (stones, belts, pulleys, labels) keep new scenes short.
   Motion: CSS for belts, pulleys and the screen box; SMIL animateMotion for stone streams (paused off screen). */
(function () {
  'use strict';
  var BASE = '/assets/operations-motion/';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  var F = function (n) { return Math.round(n * 10) / 10; };

  /* ---------- loading ---------- */
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  var libP = null;
  function lib() { return libP || (libP = loadScript(BASE + 'operations-logo.js').then(function () { return loadScript(BASE + 'operations-art.js'); }).then(function () { return window.OPM_ART; })); }

  // the library's gradients, patterns and logo symbols are written once per page into a zero-size svg that every scene references
  function sharedDefs(A) {
    if (document.getElementById('aps-defs')) return;
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('id', 'aps-defs'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    s.innerHTML = '<defs>' + A.defs() + stoneSymbols(A) + "<pattern id=\"aps-speck\" width=\"16\" height=\"16\" patternUnits=\"userSpaceOnUse\"><g fill=\"#6d6a62\" fill-opacity=\".34\"><circle cx=\"2.5\" cy=\"3\" r=\".9\"/><circle cx=\"10.5\" cy=\"5.5\" r=\"1.1\"/><circle cx=\"6\" cy=\"12\" r=\".8\"/><circle cx=\"13.5\" cy=\"13\" r=\".7\"/></g><g fill=\"#fff\" fill-opacity=\".5\"><circle cx=\"7\" cy=\"2\" r=\".7\"/><circle cx=\"14\" cy=\"9\" r=\".6\"/><circle cx=\"3\" cy=\"9.5\" r=\".6\"/></g></pattern><pattern id=\"aps-hatch\" width=\"12\" height=\"12\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\"><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"12\" stroke=\"#5f636a\" stroke-width=\"1.2\" opacity=\".5\"/></pattern>" + '</defs>';
    document.body.appendChild(s);
  }

  /* ---------- toolkit ---------- */
  function stoneSymbols(A) {
    var R = A.rng(11), out = '';
    for (var s = 0; s < 6; s++) {
      var n = 6 + Math.floor(R() * 3), p = [], q = [];
      for (var i = 0; i < n; i++) { var a = (i / n) * Math.PI * 2 + R() * 0.4, r = 0.72 + R() * 0.28; p.push([Math.cos(a) * r, Math.sin(a) * r * (0.75 + R() * 0.2)]); }
      // a lit facet on the upper left over a darker body: reads as a stone, not a dot
      for (var j = 0; j < Math.ceil(n / 2) + 1; j++) q.push(p[j % n]);
      out += '<g id="aps-st' + s + '"><path d="' + A.poly(p) + '" fill="#3f4045" stroke="#111214" stroke-width=".16"/><path d="' + A.poly([[0, 0]].concat(q)) + '" fill="#9a9ba1" opacity=".55"/></g>';
    }
    return out;
  }
  var grp = function (n, inner) { return '<g class="aps-b aps-b' + n + '">' + inner + '</g>'; };
  var at = function (x, y, inner) { return '<g transform="translate(' + F(x) + ' ' + F(y) + ')">' + inner + '</g>'; };
  var pathD = function (pts) { return 'M' + pts.map(function (p) { return F(p[0]) + ' ' + F(p[1]); }).join('L'); };
  function plen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  // a stream of stones along a polyline (SMIL: runs on every browser, paused off screen with svg.pauseAnimations())
  function stones(pts, o) {
    var L = plen(pts), speed = o.speed || 40, dur = L / speed, n = Math.max(3, Math.round(L / (o.gap || 26))), d = pathD(pts), out = '', seed = o.seed || 3;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < n; i++) {
      var s = o.size[0] + (o.size[1] - o.size[0]) * rnd(), begin = '-' + F(dur * i / n) + 's', rot = Math.floor(rnd() * 360);
      out += '<g opacity="0"><animateMotion path="' + d + '" dur="' + F(dur) + 's" begin="' + begin + '" repeatCount="indefinite"/>'
        + '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.06;.94;1" dur="' + F(dur) + 's" begin="' + begin + '" repeatCount="indefinite"/>'
        + '<use href="#aps-st' + Math.floor(rnd() * 6) + '" transform="rotate(' + rot + ') scale(' + F(s) + ')"/></g>';
    }
    return out;
  }
  // conveyor moving parts, with the pulleys wrapped so CSS can turn them about their own centre
  function belt(A, c) {
    return A.conveyorMoving(c).replace(/<g class="roller" data-x="([^"]+)" data-y="([^"]+)" data-r="([^"]+)" transform="([^"]+)">([\s\S]*?)<\/g>/g,
      function (_, x, y, r, tf, inner) { return '<g transform="' + tf + '"><g class="aps-spin" style="--sp:' + F(2 * Math.PI * (+r) / 42) + 's">' + inner + '</g></g>'; });
  }
  var label = function (x, y, text, cls) { return '<text class="lab ' + (cls || '') + '" x="' + F(x) + '" y="' + F(y) + '">' + text + '</text>'; };
  // a label with a long and a short wording; CSS shows the short one on phones (so a rotated phone gets the right one without a rebuild)
  var lt = function (long, short) { return '<tspan class="t-long">' + long + '</tspan><tspan class="t-short">' + short + '</tspan>'; };
  // a bin tag: one line normally, two stacked lines ("12.5" over "MM") on phones, where the type is larger than the 128-unit bin pitch allows
  var binTag = function (name, x) {
    var w = name.split(' ');
    if (w.length < 2) return name;
    return '<tspan class="t-long">' + name + '</tspan>' + w.map(function (t, k) { return '<tspan class="t-short" x="' + F(x) + '" dy="' + (k ? '1.05em' : '-1.05em') + '">' + t + '</tspan>'; }).join('');
  };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  /* ---------- scene: aggregate processing (feed → VSI crusher → vibrating screen → graded fractions) ---------- */
  // o.hot: name of the fraction this page is about; o.hotSr: its stone size on the heap; o.larger / o.finer: {label, sr | sand}
  function processScene(A, o, narrow) {
    o = o || {};
    var hot = o.hot || '6 mm', larger = o.larger || { label: 'Larger fractions', sr: 7.6 }, finer = o.finer || { label: 'Finer material', sand: 'm' };
    var CX = 560, SX = 960, hotColour = '#d4470f';
    var feed = A.conveyor(92, -28, 502, -404, { gy: 0, legs: [0.3, 0.62], rail: true, depth: 16 });
    var tran = A.conveyor(570, -72, 802, -262, { gy: 0, legs: [0.58], depth: 12 });
    var CR = A.crusher(-200), SC = A.screen(-190);

    /* --- stage 1: stockpile and feed conveyor --- */
    var raw = A.pile(300, 150, 7, { sr: 9, strata: 1 });
    var s1 = at(120, 0, raw.shadow + raw.strata[0]) + feed.frame + feed.rail + belt(A, feed);
    /* --- stage 2: VSI crusher --- */
    var drives = CR.drives.map(function (d) { return at(d.x, d.y, '<g class="aps-spin" style="--sp:.5s"><circle class="o" r="' + d.r + '" fill="url(#a-rim)"/><path class="rmark" d="M-7 0H7M0 -7V7"/></g>'); }).join('');
    var s2 = at(CX, 0, CR.frame + CR.body + CR.deckRail + CR.topDeck + drives);
    /* --- stage 3: transfer belt and vibrating screen --- */
    var springs = SC.springs.map(function (s) { return at(s.x, s.y + s.h, '<g class="aps-spring">' + A.spring(s.h) + '</g>'); }).join('');
    var s3 = tran.frame + belt(A, tran) + at(SX, 0, SC.frame + springs + '<g class="aps-shake">' + SC.box + '</g>');
    /* --- stage 4: the graded fractions, as sample cards fed from the screen discharge (as on the homepage) --- */
    var J = [SX + 186, -128], cw = 250, chh = 150, cx0 = 1290, rows = [-560, -388, -216];
    var cards = [
      { name: larger.label, sr: larger.sr, sand: larger.sand, hot: false, seed: 61, sz: [7, 9] },
      { name: hot, sr: o.hotSr || 2.6, hot: true, seed: 62, sz: [Math.max(1.6, (o.hotSr || 2.6) * 0.95), Math.max(2.4, (o.hotSr || 2.6) * 1.35)] },
      { name: finer.label, sr: finer.sr, sand: finer.sand, hot: false, seed: 63, sz: [1.3, 1.9] },
    ];
    var s4 = '<circle class="ring-on" cx="' + J[0] + '" cy="' + J[1] + '" r="4.5"/>', flowsC = '';
    cards.forEach(function (c, i) {
      var y = rows[i], ty = y + chh / 2;
      s4 += '<path class="ln faint dash" d="M' + J[0] + ' ' + J[1] + 'L' + (J[0] + 24) + ' ' + F(ty) + 'H' + cx0 + '"/>';
      s4 += '<g transform="translate(' + cx0 + ' ' + F(y) + ')"><rect x="3" y="6" width="' + cw + '" height="' + chh + '" rx="10" fill="#141416" fill-opacity=".06"/><rect class="card-bg' + (c.hot ? ' hot' : '') + '" width="' + cw + '" height="' + chh + '" rx="10"/><path class="seam" d="M12 ' + (chh - 46) + 'H' + (cw - 12) + '"/>';
      var body = c.sand ? A.sandHeap(150, 70, c.seed, c.sand) : (function () { var P = A.pile(150, 82, c.seed, { sr: c.sr, strata: 1 }); return P.shadow + P.strata[0]; })();
      s4 += '<g transform="translate(' + (cw / 2) + ' ' + (chh - 52) + ')">' + body + '</g>';
      s4 += '<text class="lab card-t start' + (c.hot ? ' hot' : '') + '" x="14" y="' + (chh - 24) + '">' + esc(c.name) + '</text><text class="lab card-s start" x="14" y="' + (chh - 9) + '">CRUSHED STONE</text>';
      if (c.hot) s4 += '<text class="lab tag start" x="14" y="22" style="font-size:calc(var(--ls) * .66px);letter-spacing:.12em">SELECTED SIZE</text>';
      s4 += '</g>';
      flowsC += stones([J, [J[0] + 24, ty], [cx0 - 6, ty]], { speed: 34, gap: 24 + i * 2, size: c.sz, seed: 40 + i });
    });
    /* --- ground, backdrop, labels --- */
    var back = '<g opacity=".9">' + A.hills(1300, 240, 3, -40) + A.hills(900, 280, 5, 760) + '</g>';
    var ground = '<rect class="aps-ground" x="-40" y="0" width="1640" height="14"/><path class="ln faint" d="M-40 0H1600"/>';
    var ticks = '<path class="aps-gline" d="M-20 34H1560"/>' + [110, 335, CX, SX + 20, cx0 + cw / 2].map(function (x) { return '<circle class="ring" cx="' + x + '" cy="34" r="4.5"/>'; }).join('');
    var sub = narrow ? 100 : 82;
    var labs = label(110, 64, 'STONE FEED') + label(110, sub, 'STOCKPILE', 'faint-t') + label(335, 64, 'FEED CONVEYOR')
      + label(CX, 64, 'VSI CRUSHER') + label(CX, sub, 'IMPACT CRUSHING', 'faint-t')
      + label(SX + 20, 64, 'VIBRATING SCREEN') + label(SX + 20, sub, 'SIZE SEPARATION', 'faint-t')
      + '<text class="lab" x="' + (cx0 + cw / 2) + '" y="64" style="font-weight:700">GRADED FRACTIONS</text>';
    var gl = '';
    /* --- moving stones --- */
    var fl = stones([feed.at(0, 5), feed.at(feed.L, 5), [CX - 28, -392], [CX, -366]], { speed: 42, gap: 30, size: [5, 7.5], seed: 21 })
      + stones([[CX, -112], [CX + 26, -82], tran.at(18, 4), tran.at(tran.L, 4), [SX - 140, -250]], { speed: 42, gap: 22, size: [3.4, 5], seed: 22 })
      + (function () { var d = function (u) { var p = SC.deck(u, 64); return [SX + p[0], p[1]]; }; return stones([d(14), d(110), d(200), d(300)], { speed: 30, gap: 20, size: [3, 5.5], seed: 23 }); })()
      + flowsC;
    var markup = back + ground + grp(1, s1) + grp(2, s2) + grp(3, s3) + grp(4, s4) + grp(5, ticks + labs + gl) + '<g class="aps-flow">' + fl + '</g>';
    return { vb: narrow ? [0, -650, 700, 780] : [-20, -650, 1580, 780], world: [-20, 1560], markup: markup };
  }

  var SCENES = { process: processScene };

  /* ---------- mounting ---------- */
  function mount(fig) {
    if (fig.__apsMounted) return; fig.__apsMounted = true;
    var name = fig.getAttribute('data-scene'), build = SCENES[name];
    if (!build) return;
    var opts = {}; try { opts = JSON.parse(fig.getAttribute('data-opts') || '{}'); } catch (e) {}
    // a scene flagged noLib needs neither the machine library nor the shared gradients (it brings its own): it builds at once, with a tiny seeded generator
    var libOrNone = build.noLib ? Promise.resolve({ rng: function (seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; } }) : lib();
    libOrNone.then(function (A) {
      if (!build.noLib) sharedDefs(A);
      var host = fig.querySelector('.aps-stage') || fig;
      // every device gets the complete drawing, scaled to fit its frame: nothing is cropped, panned or tied to the scroll position
      var narrow = false;
      var run = function () {
        // a figure whose drawing was written into the HTML at build time (pre-rendered, so it paints with the document) is only wired up, not rebuilt
        var svg = host.querySelector('svg.aps-svg'), sc;
        if (!svg) {
          sc = build(A, opts, narrow);
          if (sc.html) host.insertAdjacentHTML('afterbegin', sc.html);   // a scene that brings its own layered markup (terrazzo)
          else {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'aps-svg'); svg.setAttribute('viewBox', sc.vb.join(' ')); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.innerHTML = sc.markup;
            host.insertBefore(svg, host.firstChild);
          }
        }
        // the frame takes the drawing's own proportions, so it never letterboxes or crops on any screen
        if (svg && !host.classList.contains('aps-stage--lab') && !fig.classList.contains('aps-in')) {
          var vbx = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
          if (vbx.length === 4 && vbx[2] > 0 && vbx[3] > 0) { host.style.aspectRatio = vbx[2] + ' / ' + vbx[3]; host.style.setProperty('--ar', (vbx[2] / vbx[3]).toFixed(4)); }
        }
        fig.classList.add('is-ready');
        fig.__apsSvg = svg;
        var pause = function (p) { if (!svg) return; try { p ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch (e) {} };
        if (reduce) { pause(true); try { svg && svg.setCurrentTime(3); } catch (e) {} return; }
        pause(true);
        // run only while visible
        new IntersectionObserver(function (es) {
          // the scene plays by itself: its stages build in one after another the first time it is on screen (time-based, never scroll-linked)
          es.forEach(function (en) { fig.classList.toggle('is-live', en.isIntersecting); if (en.isIntersecting) fig.classList.add('is-played'); pause(!en.isIntersecting); });
        }, { threshold: 0.12 }).observe(fig);
      };
      // build off the critical path: the heaps are drawn stone by stone
      (build.noLib ? function (f) { f(); } : (window.requestIdleCallback || function (f) { setTimeout(f, 30); }))(run, { timeout: 600 });
    }).catch(function () { /* no library: the figure keeps its caption only */ });
  }

  function init() {
    var figs = [].slice.call(document.querySelectorAll('.aps[data-scene]'));
    if (!figs.length) return;
    if (!('IntersectionObserver' in window)) { figs.forEach(mount); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); mount(en.target); } }); }, { rootMargin: '900px 0px 900px 0px' });
    figs.forEach(function (f) { io.observe(f); });
  }
  window.APS = { SCENES: SCENES, mount: mount, helpers: { stones: stones, belt: belt, at: at, grp: grp, label: label, lt: lt, binTag: binTag } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
