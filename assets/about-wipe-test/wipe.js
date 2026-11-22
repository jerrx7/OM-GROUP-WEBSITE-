/* TEMPORARY TEST: About-section progressive text wipe (GSAP ScrollTrigger).
   Not a final fix. To remove: delete assets/about-wipe-test/ and the TEMP-TEST:ABOUT-WIPE block in index.html.
   Handy while testing:  ?wipe=off  in the URL skips this file's work;  window.__omWipeTest.destroy()  puts the page back as it was.

   How it works
   - Words are the carriers. The site's own reveal script already splits the headline and the paragraphs into .rv-w word spans, so those are
     reused (no second split); the stat numbers get their own spans. Each word's glyphs are painted with background-clip:text and a gradient
     whose edge position is the single CSS variable --wf-e. The orange therefore lives inside the letterforms. There is no overlay, no
     duplicated text and no opacity animation.
   - One progress value (0..1) per block is turned into an edge position along the block's REAL reading order: the lines are measured
     (offsetTop groups words into lines), laid end to end, and the edge travels along that strip. It leaves the end of one line exactly as it
     enters the start of the next, so multi-line text fills as one continuous sweep and never restarts per line.
   - GSAP ScrollTrigger (scrub) owns the progress, so the fill is tied to scroll, reverses when scrolling up, and is calibrated per layout
     through gsap.matchMedia (which also cleans up and rebuilds when a breakpoint or reduced-motion changes).
   - Layout reads use offsetLeft/offsetTop/offsetWidth, which ignore the staggered transforms of the site's entrance reveal. */
(function () {
  'use strict';
  if (/[?&]wipe=off\b/.test(location.search)) return;
  if (window.__omWipeTest) { try { window.__omWipeTest.destroy(); } catch (e) {} }
  if (!window.gsap || !window.ScrollTrigger || !window.matchMedia) return;

  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });   // phone URL bars sliding must not re-measure everything

  var section = document.getElementById('about');
  if (!section) return;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* scrub smoothing: Lenis already eases mouse/trackpad scrolling, so only a light extra catch-up there; touch devices scroll natively, so a little more */
  var FINE = matchMedia('(any-pointer: fine)').matches;
  var SCRUB = typeof window.OM_WIPE_SCRUB === 'number' ? window.OM_WIPE_SCRUB : (FINE ? 0.5 : 0.8);

  /* scroll ranges per layout. Calibrated so a block finishes while it is still comfortably in view and the visitor never has to scroll
     past it to see it complete. */
  var RANGES = {
    desktop: { head: ['top 80%', 'bottom 48%'], copy: ['top 74%', 'bottom 40%'], stats: ['top 88%', 'bottom 56%'] },
    tablet:  { head: ['top 82%', 'bottom 46%'], copy: ['top 80%', 'bottom 42%'], stats: ['top 90%', 'bottom 58%'] },
    phone:   { head: ['top 84%', 'bottom 46%'], copy: ['top 84%', 'bottom 40%'], col:   ['top 88%', 'bottom 54%'] }
  };

  /* ---------- the wipe engine ---------- */
  function makeWipe(host, words, featherEm) {
    var items = [], total = 0, feather = 36, last = 0;

    function measure() {
      var lines = [], cur = null;
      items = [];
      words.forEach(function (el) {
        var top = el.offsetTop, left = el.offsetLeft, w = el.offsetWidth, h = el.offsetHeight;
        if (!cur || Math.abs(top - cur.top) > h * 0.5) { cur = { top: top, left: left, right: left + w }; lines.push(cur); }
        if (left < cur.left) cur.left = left;
        if (left + w > cur.right) cur.right = left + w;
        items.push({ el: el, left: left, w: w, line: cur, cache: NaN });
      });
      total = 0;
      lines.forEach(function (l) { l.start = total; total += l.right - l.left; });
      items.forEach(function (it) { it.base = it.line.start + (it.left - it.line.left); });
      var fs = words.length ? parseFloat(getComputedStyle(words[0]).fontSize) : 16;
      feather = Math.max(14, Math.round(fs * featherEm));
      host.style.setProperty('--wf-f', feather + 'px');
      apply(last);
    }

    function apply(p) {
      last = p;
      // at p=0 the soft edge sits entirely left of the first letter; at p=1 entirely right of the last one
      var T = -feather / 2 + p * (total + feather), lo = -feather / 2;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], e = T - it.base, hi = it.w + feather / 2;
        e = e < lo ? lo : e > hi ? hi : e;
        e = Math.round(e * 2) / 2;
        if (e !== it.cache) { it.cache = e; it.el.style.setProperty('--wf-e', e + 'px'); }
      }
    }

    words.forEach(function (el) { el.classList.add('wf-w'); });
    measure();
    return {
      measure: measure, set: apply,
      destroy: function () {
        words.forEach(function (el) { el.classList.remove('wf-w'); el.style.removeProperty('--wf-e'); });
        host.style.removeProperty('--wf-f');
      }
    };
  }

  /* split an element's text into word spans (only used for the stat numbers; everything else reuses the site's .rv-w words) */
  function splitOwn(el) {
    var saved = el.innerHTML, root = el, words = [];
    if (/flex|grid/.test(getComputedStyle(el).display)) {   // .num is a flex row: wrap so the words stay one inline run
      root = document.createElement('span');
      while (el.firstChild) root.appendChild(el.firstChild);
      el.appendChild(root);
    }
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var bits = part.split('-');   // let "Tri-Locations" wrap at its hyphen on a narrow phone
            bits.forEach(function (b, i) {
              var t = i < bits.length - 1 ? b + '-' : b;
              if (!t) return;
              var s = document.createElement('span'); s.className = 'wf-own'; s.textContent = t;
              frag.appendChild(s); words.push(s);
            });
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(root);
    return { words: words, restore: function () { el.innerHTML = saved; } };
  }

  /* ---------- Lenis hand-off (smooth-scroll.js creates window.lenis shortly after parse) ---------- */
  var offLenis = null, lenisTimer = 0;
  function hookLenis(tries) {
    if (offLenis) return;
    if (window.lenis && typeof window.lenis.on === 'function') { offLenis = window.lenis.on('scroll', ST.update); return; }
    if (tries > 0) lenisTimer = setTimeout(function () { hookLenis(tries - 1); }, 250);
  }

  /* ---------- build / teardown ---------- */
  var mm = gsap.matchMedia(), ro = null, rafId = 0, onFonts = null;

  function build(ctx) {
    var cond = ctx.conditions, mode = cond.desktop ? 'desktop' : cond.tablet ? 'tablet' : 'phone', R = RANGES[mode];
    var quote = $('.about-quote', section), copy = $('.about-copy', section), stats = $('.about-stats', section);
    var undo = [], wipes = [];

    function proxyWipe(w) { var o = { p: 0 }; o.apply = function () { w.set(o.p); }; return o; }
    function reveal(host, words, em, cls) {
      host.classList.add(cls);
      var w = makeWipe(host, words, em); wipes.push(w);
      undo.push(function () { w.destroy(); host.classList.remove(cls); });
      return w;
    }

    /* A. headline: reuse the site's word spans */
    if (quote) {
      var qw = $$('.rv-w', quote);
      if (qw.length) {
        var hw = reveal(quote, qw, 0.9, 'wf-head'), hp = proxyWipe(hw);
        gsap.to(hp, { p: 1, ease: 'none', onUpdate: hp.apply,
          scrollTrigger: { trigger: quote, start: R.head[0], end: R.head[1], scrub: SCRUB } });
      }
    }

    /* B. the three paragraphs: ONE sweep through all of them, in reading order */
    if (copy) {
      var cw = $$('.rv-w', copy);
      if (cw.length) {
        var pw = reveal(copy, cw, 2.1, 'wf-copy'), pp = proxyWipe(pw);
        gsap.to(pp, { p: 1, ease: 'none', onUpdate: pp.apply,
          scrollTrigger: { trigger: copy, start: R.copy[0], end: R.copy[1], scrub: SCRUB } });
      }
    }

    /* C. statistics */
    if (stats) {
      stats.classList.add('wf-live');
      undo.push(function () { stats.classList.remove('wf-live'); });
      var cols = $$('.col', stats).map(function (col) {
        var num = $('.num', col), sp = num ? splitOwn(num) : null, o = { col: col, proxy: null };
        if (sp && sp.words.length) {
          var nw = reveal(num, sp.words, 0.45, 'wf-num');
          o.proxy = proxyWipe(nw);
          undo.push(sp.restore);
        }
        gsap.set(col, { '--wf-lp': 0, '--wf-dp': 0 });
        undo.push(function () { col.style.removeProperty('--wf-lp'); col.style.removeProperty('--wf-dp'); });
        return o;
      });

      // number fills first, then its label turns dark, then the description settles
      function colTween(tl, o, at) {
        if (o.proxy) tl.to(o.proxy, { p: 1, duration: 0.5, onUpdate: o.proxy.apply }, at);
        tl.to(o.col, { '--wf-lp': 1, duration: 0.34 }, at + 0.14);
        tl.to(o.col, { '--wf-dp': 1, duration: 0.34 }, at + 0.26);
      }
      if (mode === 'phone') {            // stacked: each column is its own beat
        cols.forEach(function (o) {
          var tl = gsap.timeline({ defaults: { ease: 'none' },
            scrollTrigger: { trigger: o.col, start: R.col[0], end: R.col[1], scrub: SCRUB } });
          colTween(tl, o, 0);
        });
      } else {                           // a row of three: left to right, overlapping, inside one scroll range
        var row = gsap.timeline({ defaults: { ease: 'none' },
          scrollTrigger: { trigger: stats, start: R.stats[0], end: R.stats[1], scrub: SCRUB } });
        cols.forEach(function (o, i) { colTween(row, o, i * 0.17); });
      }
    }

    /* re-measure when the text can re-wrap (width change, late font swap), then let ScrollTrigger recompute its ranges */
    var lastW = section.clientWidth, lastH = section.offsetHeight;
    function remeasure(force) {
      var w = section.clientWidth, h = section.offsetHeight;
      if (!force && w === lastW && h === lastH) return;
      var rewrap = force || w !== lastW;       // only a width change (or a font swap) can re-wrap text; a height-only change just moves the ranges
      lastW = w; lastH = h;
      if (rewrap) wipes.forEach(function (x) { x.measure(); });
      ST.refresh();
    }
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(function () { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(function () { remeasure(false); }); });
      ro.observe(section);
    }
    if (document.fonts && document.fonts.addEventListener) {
      onFonts = function () { remeasure(true); };
      document.fonts.addEventListener('loadingdone', onFonts);
    }
    hookLenis(24);

    return function cleanup() {          // gsap.matchMedia reverts the tweens/triggers itself; this puts the DOM back
      if (ro) { ro.disconnect(); ro = null; }
      cancelAnimationFrame(rafId);
      if (onFonts && document.fonts) { document.fonts.removeEventListener('loadingdone', onFonts); onFonts = null; }
      undo.reverse().forEach(function (f) { try { f(); } catch (e) {} });
    };
  }

  function start() {
    if (window.__omWipeTest && window.__omWipeTest.started) return;
    mm.add({
      desktop: '(min-width: 1101px) and (prefers-reduced-motion: no-preference)',
      tablet:  '(min-width: 641px) and (max-width: 1100px) and (prefers-reduced-motion: no-preference)',
      phone:   '(max-width: 640px) and (prefers-reduced-motion: no-preference)'
    }, build);
    window.__omWipeTest.started = true;
  }

  window.__omWipeTest = {
    started: false,
    refresh: function () { ST.refresh(); },
    destroy: function () {
      mm.revert();
      if (offLenis) { try { offLenis(); } catch (e) {} offLenis = null; }
      clearTimeout(lenisTimer);
      window.__omWipeTest.started = false;
    }
  };

  /* fonts first: line breaks (and therefore the measured reading order) depend on the final glyph widths */
  var fontsReady = Promise.resolve();
  if (document.fonts && document.fonts.load) {
    fontsReady = Promise.race([
      Promise.all([
        document.fonts.load('500 40px "Cormorant Garamond"', 'Powering Goa'),
        document.fonts.load('italic 500 40px "Cormorant Garamond"', 'since day one'),
        document.fonts.load('400 16px Inter', 'Built on a foundation')
      ]).then(function () { return document.fonts.ready; }),
      new Promise(function (r) { setTimeout(r, 3000); })
    ]);
  }
  fontsReady.then(start, start);
})();
