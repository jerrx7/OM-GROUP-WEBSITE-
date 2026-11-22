/* OM GROUP · application pages: progressive orange text wipe on the takeaway / principle / note callouts (local build, not deployed).

   What it does
   - The big serif "Key principle / Technical takeaway / Engineering conclusion …" blocks (.ap6-takeaway), the engineering notes (.ap-note),
     the warnings and "important" boxes (.psd-warn) and the procurement-note cards (.ap-size-note) start in a quiet warm grey. As the block
     scrolls through the reading zone, brand orange is poured into the letterforms from left to right, line after line, with a soft bright
     leading edge. Scrolling back up un-fills it. The left rule of the block warms up with the text.
   - No GSAP, no overlay, no duplicated text, no opacity animation: each word is a small inline carrier painted with background-clip:text and a
     gradient whose edge position is one CSS variable (--wf-e).

   How it stays light (these pages already carry heavy 3D figures)
   - Nothing is touched until a block is within half a screen of the viewport (IntersectionObserver); only then is its text split and measured.
   - One requestAnimationFrame loop, only while a block is in that zone AND the scroll or the smoothing is still moving. All layout reads first,
     then all writes; only the words whose edge actually changed are written.
   - Progress comes from the block's live position, so it is right after an anchor jump, a resize, a late font or a layout shift.

   Handy while testing:  ?wipe=off  in the URL skips it;  window.__omApWipe.destroy()  puts the page back as it was.
   Reduced motion, no IntersectionObserver or no background-clip:text: the page is left exactly as it was written. */
(function () {
  'use strict';
  if (/[?&]wipe=off\b/.test(location.search)) return;
  if (window.__omApWipe) { try { window.__omApWipe.destroy(); } catch (e) {} }
  if (!('IntersectionObserver' in window) || !window.matchMedia) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!(window.CSS && CSS.supports && (CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text')))) return;

  /* what gets the wipe: block = the callout box, text = the element whose words are painted */
  var KINDS = [
    { sel: '.ap6-takeaway', text: 'p', kind: 'quote', feather: 1.5 },
    { sel: '.ap-size-note', text: 'p', kind: 'note', feather: 2.6, each: true },
    { sel: '.ap-note', kind: 'note', feather: 2.6 },
    { sel: '.psd-warn', kind: 'note', feather: 2.6 }
  ];

  var FINE = matchMedia('(any-pointer: fine)').matches;
  var TAU = FINE ? 0.16 : 0.2;                       // seconds: the catch-up smoothing (Lenis already eases a mouse wheel; touch scrolls natively)

  /* where in the viewport the fill runs: it starts when the block's top reaches START and has finished when its bottom reaches END
     (fractions of the viewport height). Tall blocks therefore fill while they cross the screen; short ones in one gentle pass. */
  function range(kind) {
    var phone = innerWidth <= 640;
    if (kind === 'quote') return phone ? [0.9, 0.56] : [0.88, 0.54];
    return phone ? [0.92, 0.62] : [0.9, 0.6];
  }

  var hosts = [], live = [], io = null, ro = null, raf = 0, last = 0, started = false, onScroll = null, onResize = null, onFonts = null;

  /* ---------- find the blocks ---------- */
  function collect() {
    var seen = [];
    KINDS.forEach(function (k) {
      Array.prototype.slice.call(document.querySelectorAll(k.sel)).forEach(function (block) {
        for (var i = 0; i < seen.length; i++) if (seen[i].contains(block)) return;   // already inside a block that has the wipe (or the block itself)
        if (block.closest('[hidden], [aria-hidden="true"]')) return;
        var targets = k.text ? Array.prototype.slice.call(block.querySelectorAll(k.text)) : [block];
        if (k.text && !k.each) targets = targets.slice(0, 1);
        if (!targets.length) return;
        seen.push(block);
        targets.forEach(function (t, n) {
          hosts.push({ block: block, text: t, cfg: k, primary: n === 0, split: false, words: [], items: [], total: 0, feather: 40, p: 0, lastP: -1, init: true, top: 0, h: 0, ow: 0 });
        });
      });
    });
  }

  /* ---------- split one block's words (text nodes only, in place) ---------- */
  function splitWords(root) {
    var out = [];
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          if (!c.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var bits = part.split('-');                         // a hyphenated word may still wrap at its hyphen
            bits.forEach(function (b, i) {
              var t = i < bits.length - 1 ? b + '-' : b;
              if (!t) return;
              var w = document.createElement('wf-w'); w.textContent = t; frag.appendChild(w); out.push(w);
            });
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR' && c.tagName !== 'WF-W') walk(c);
      });
    })(root);
    return out;
  }

  function isDark(el) {                                  // first painted background up the tree decides the colour set
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      var m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] > 0.5)) return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) < 110;
    }
    return false;
  }

  /* measure the real reading order: words group into lines by offsetTop, lines are laid end to end, and the edge travels along that strip,
     so the orange leaves the end of one line exactly as it enters the start of the next. offset* ignores the reveal transforms. */
  function measure(h) {
    var lines = [], cur = null;
    h.items = [];
    h.words.forEach(function (el) {
      var top = el.offsetTop, left = el.offsetLeft, w = el.offsetWidth, ht = el.offsetHeight;
      if (!cur || Math.abs(top - cur.top) > ht * 0.5) { cur = { top: top, left: left, right: left + w }; lines.push(cur); }
      if (left < cur.left) cur.left = left;
      if (left + w > cur.right) cur.right = left + w;
      h.items.push({ el: el, left: left, w: w, line: cur, cache: NaN });
    });
    h.total = 0;
    lines.forEach(function (l) { l.start = h.total; h.total += l.right - l.left; });
    h.items.forEach(function (it) { it.base = it.line.start + (it.left - it.line.left); });
    var fs = h.words.length ? parseFloat(getComputedStyle(h.words[0]).fontSize) : 16;
    h.feather = Math.max(16, Math.round(fs * h.cfg.feather));
    h.text.style.setProperty('--wf-f', h.feather + 'px');
    h.ow = h.text.offsetWidth;
    h.lastP = -1;
  }

  function paint(h, p) {
    h.lastP = p;
    // at p=0 the soft edge sits wholly left of the first letter, at p=1 wholly right of the last
    var T = -h.feather / 2 + p * (h.total + h.feather), lo = -h.feather / 2;
    for (var i = 0; i < h.items.length; i++) {
      var it = h.items[i], e = T - it.base, hi = it.w + h.feather / 2;
      e = e < lo ? lo : e > hi ? hi : e;
      e = Math.round(e * 2) / 2;
      if (e !== it.cache) { it.cache = e; it.el.style.setProperty('--wf-e', e + 'px'); }
    }
    if (h.primary) h.block.style.setProperty('--wf-p', p.toFixed(3));
  }

  function ensure(h) {
    if (h.split) return;
    h.words = splitWords(h.text);
    if (!h.words.length) { h.split = true; h.dead = true; return; }
    h.dark = isDark(h.block);
    var c = h.block.classList; c.add('wf-live', 'wf-' + h.cfg.kind); if (h.dark) c.add('wf-dark');
    if (h.text !== h.block) h.text.classList.add('wf-text');
    measure(h);
    if (ro) ro.observe(h.text);
    h.split = true; h.init = true;
  }

  function release(h) {                                  // used by destroy(): remove the carriers again
    if (!h.split || h.dead) return;
    h.words.forEach(function (w) { var t = document.createTextNode(w.textContent); if (w.parentNode) w.parentNode.replaceChild(t, w); });
    h.text.normalize();
    h.text.style.removeProperty('--wf-f'); h.block.style.removeProperty('--wf-p');
    h.block.classList.remove('wf-live', 'wf-quote', 'wf-note', 'wf-dark'); h.text.classList.remove('wf-text');
    h.split = false; h.words = []; h.items = [];
  }

  /* ---------- the loop ---------- */
  function progress(h, vh) {
    var r = range(h.cfg.kind), S = vh * r[0], E = vh * r[1];
    var p = (S - h.top) / (S - E + h.h);
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(tick); }

  function tick(now) {
    raf = 0;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016; last = now;
    var vh = innerHeight, k = 1 - Math.exp(-dt / TAU), more = false, i, h;
    for (i = 0; i < live.length; i++) { h = live[i]; var r = h.text.getBoundingClientRect(); h.top = r.top; h.h = r.height; }   // all reads first
    for (i = 0; i < live.length; i++) {
      h = live[i]; if (h.dead || !h.split) continue;
      var tp = progress(h, vh);
      if (h.init) { h.p = tp; h.init = false; }
      else {
        var d = tp - h.p;
        if (d > -0.0006 && d < 0.0006) h.p = tp; else { h.p += d * k; more = true; }
      }
      if (h.p !== h.lastP) paint(h, h.p);
    }
    if (more) schedule(); else last = 0;
  }

  /* ---------- zone watching ---------- */
  function onZone(entries) {
    entries.forEach(function (en) {
      var h = en.target.__wf; if (!h) return;
      if (en.isIntersecting) {
        ensure(h);
        if (h.dead) return;
        if (live.indexOf(h) < 0) live.push(h);
        h.init = true;                                   // arrive exactly where the position says: no replay from zero
      } else {
        var i = live.indexOf(h); if (i >= 0) live.splice(i, 1);
        if (h.split && !h.dead) {                        // left the zone: leave it finished (above) or untouched (below)
          var above = en.boundingClientRect.bottom <= (en.rootBounds ? en.rootBounds.top : 0);
          paint(h, above ? 1 : 0); h.p = above ? 1 : 0; h.init = true;
        }
      }
    });
    schedule();
  }

  function remeasureAll() {
    hosts.forEach(function (h) { if (h.split && !h.dead) measure(h); });
    schedule();
  }

  function start() {
    if (started) return; started = true;
    collect();
    if (!hosts.length) return;
    io = new IntersectionObserver(onZone, { rootMargin: '50% 0px 50% 0px' });
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(function (es) {
        var any = false;
        es.forEach(function (en) { var h = en.target.__wf; if (h && h.split && !h.dead && en.target.offsetWidth !== h.ow) { measure(h); any = true; } });
        if (any) schedule();
      });
    }
    hosts.forEach(function (h) { h.text.__wf = h; io.observe(h.text); });
    onScroll = schedule; addEventListener('scroll', onScroll, { passive: true });
    onResize = function () { schedule(); }; addEventListener('resize', onResize);
    if (document.fonts && document.fonts.addEventListener) { onFonts = remeasureAll; document.fonts.addEventListener('loadingdone', onFonts); }
  }

  window.__omApWipe = {
    hosts: hosts, live: live,
    refresh: function () { remeasureAll(); },
    destroy: function () {
      if (io) io.disconnect(); if (ro) ro.disconnect();
      removeEventListener('scroll', onScroll); removeEventListener('resize', onResize);
      if (onFonts && document.fonts) document.fonts.removeEventListener('loadingdone', onFonts);
      cancelAnimationFrame(raf); raf = 0;
      hosts.forEach(release); hosts.length = 0; live.length = 0; started = false;
    }
  };

  /* line breaks depend on the final glyph widths, so give the web fonts a moment; if they are slow the blocks simply measure again on loadingdone */
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]).then(start, start);
  else start();
})();
