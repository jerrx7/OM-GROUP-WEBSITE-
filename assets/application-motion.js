/* OM GROUP · application pages: scroll choreography (shared by the hub and all 16 guides; styles in application-motion.css).
   Arms only what begins BELOW the fold, then lets each item play once as it comes into view:
     headings (word by word out of a mask) · kicker rules · a hairline across each new section · reading blocks · table rows.
   The reveals the pages already mark with data-rv are kept (each page's own small script adds .rv / .rv-on); this file only
   gives them a reading-order delay. With reduced motion, no IntersectionObserver or no script, nothing is hidden. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* jump bar: a single highlight glides to the section being read (the pages' own scripts mark it with a.on).
     It replaces the old underline, which sat on the same edge as the orange progress line and merged with it. Runs for everyone, motion or not. */
  (function tocHighlight() {
    var nav = document.getElementById('toc'), ul = nav && nav.querySelector('ul');
    if (!ul || !ul.querySelector('a')) return;
    var ind = document.createElement('span'); ind.className = 'ap-tocpill'; ind.setAttribute('aria-hidden', 'true');
    ul.insertBefore(ind, ul.firstChild); nav.classList.add('has-ind');
    var place = function (instant) {
      var a = ul.querySelector('a.on');
      if (!a) { ind.classList.remove('is-set'); return; }
      var first = !ind.classList.contains('is-set');
      if (instant || first) ind.classList.add('is-instant');
      ind.style.left = a.offsetLeft + 'px'; ind.style.width = a.offsetWidth + 'px'; ind.classList.add('is-set');
      if (instant || first) { void ind.offsetWidth; requestAnimationFrame(function () { ind.classList.remove('is-instant'); }); }
    };
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function () { place(false); });
      [].forEach.call(ul.querySelectorAll('a'), function (a) { mo.observe(a, { attributes: true, attributeFilter: ['class'] }); });
    }
    var again = function () { place(true); };
    window.addEventListener('resize', again, { passive: true });
    window.addEventListener('orientationchange', again);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);
    window.addEventListener('load', again);
    place(true);
  })();

  if (reduce || !('IntersectionObserver' in window)) return;

  var doc = document, vh = window.innerHeight || 800;
  // low-power devices (Data Saver, <= 2 GB memory, dual-core) get the lighter version: plain fades, no word masks, no glow
  var nav = navigator, lite = !!((nav.connection && nav.connection.saveData) || (nav.deviceMemory && nav.deviceMemory <= 2) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2));
  if (lite) document.documentElement.classList.add('mo-lite');
  var $$ = function (s, r) { return [].slice.call((r || doc).querySelectorAll(s)); };
  var below = function (el) { return el.getBoundingClientRect().top > vh * 0.92; };
  // widgets, figures and the hero keep their own motion
  var SKIP = '.ap-hero,.hero,header,footer,.ap-toc,.aps,figure,[data-s3d],.s3d,.ap6-lab,.ap125-xp-panel,.ap6-flow,[data-pr],[data-lab],.cm3d,.ap-note,.ap6-takeaway,.faq-a';

  /* ---------- headings: split into words (the text itself is untouched, so search engines and screen readers read it as before) ---------- */
  function splitWords(h) {
    var n = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          if (!/\S/.test(c.nodeValue)) return;
          var frag = doc.createDocumentFragment();
          c.nodeValue.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(p)); return; }
            var o = doc.createElement('span'), i = doc.createElement('span');
            o.className = 'mw'; i.className = 'mwi'; i.style.setProperty('--i', Math.min(n++, 18));
            i.textContent = p; o.appendChild(i); frag.appendChild(o);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.className !== 'mw') walk(c);
      });
    })(h);
    h.classList.add('mo-split');
    return n;
  }

  var armed = [];
  var io = new IntersectionObserver(function (es) {
    var hits = es.filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
    hits.forEach(function (en, k) {
      var el = en.target; io.unobserve(el);
      if (el.classList.contains('mo-b')) el.style.setProperty('--mo-d', Math.min(k, 4) * 90 + 'ms');   // reading order when several arrive together
      el.classList.add('mo-in');
      if (el.classList.contains('mo-h')) {
        var words = el.querySelectorAll('.mwi').length;
        setTimeout(function () { el.classList.add('mo-done'); }, Math.min(words, 18) * 55 + 1500);   // once settled, unclip the mask (italic overhangs)
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

  function arm(el, cls) { el.classList.add(cls); io.observe(el); armed.push(el); }

  /* headings */
  $$('h2').filter(function (h) { return !h.closest(SKIP) && h.textContent.trim().length > 2; }).forEach(function (h) {
    if (lite) { if (below(h)) arm(h, 'mo-b'); return; }
    splitWords(h);
    if (below(h)) arm(h, 'mo-h');
  });

  /* kickers */
  $$('.ap-kicker,.eyebrow').filter(function (k) { return !k.closest('.ap-hero,.hero,header,footer,.ap-toc'); }).forEach(function (k) { if (below(k)) arm(k, 'mo-k'); });

  /* sections: the hairline, and the glow of a dark panel */
  $$('main > section, .ap-sec, section.final').forEach(function (s, i, all) {
    if (all.indexOf(s) !== i || s.closest('.ap-hero,.hero') || s.classList.contains('ap-hero') || s.classList.contains('hero')) return;
    var r = doc.createElement('span'); r.className = 'mo-rule'; r.setAttribute('aria-hidden', 'true');
    s.insertBefore(r, s.firstChild); s.classList.add('mo-sec');
    if (below(s)) arm(s, 'mo-arm');
  });

  /* reading blocks that the page does not already animate */
  var READ = '.ap-prose > p, .ap-prose > ul, .ap-prose > ol, .ap-lede, .ap-small, .ap-cta-row, .ap6-verdict, .gal-head > p, .faq details, .final p, .final .cta-row, .hero-sub';
  $$(READ).filter(function (b) {
    return !b.closest(SKIP) && !b.closest('[data-rv],.rv,.mo-b') && !b.classList.contains('mo-b') && below(b);
  }).forEach(function (b) { arm(b, 'mo-b'); });

  /* table rows follow their table, one by one */
  $$('.ap-tbl-wrap[data-rv] tbody').forEach(function (tb) {
    $$('tr', tb).forEach(function (tr, i) { tr.style.setProperty('--ri', Math.min(i, 12)); });
  });

  /* the blocks the pages mark with data-rv: when they come in together, they arrive in reading order */
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function (ms) {
      var n = 0;
      ms.forEach(function (m) {
        var t = m.target;
        if (!t.classList.contains('rv-on') || (m.oldValue || '').split(' ').indexOf('rv-on') > -1) return;
        if (t.matches('.rv-stagger,.rv-photo,.ap-stages,.ap-check,.ap-steps,.ap-tocpill,.ap-rel,.ap-roles,.ap-qa,.ap-split,.ap-arts,.ap6-steps6,.ap6-pair,.ap125-trio,.gallery li')) return;
        t.style.setProperty('--mo-d', Math.min(n++, 4) * 90 + 'ms');
      });
    });
    $$('[data-rv]').forEach(function (el) { mo.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }); });
  }

  /* very tall blocks (a long comparison table, a stack of cards) would wait for 12% of their height before the page's own script releases
     them: release them as soon as their top edge comes in instead, so the reader never meets an empty gap */
  var tall = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) return;
      tall.unobserve(en.target);
      if (en.target.classList.contains('rv')) en.target.classList.add('rv-on');
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
  $$('[data-rv]').forEach(function (el) { if (el.classList.contains('rv') && !el.classList.contains('rv-photo')) tall.observe(el); });

  /* never leave anything hidden: printing, or a page restored from the back/forward cache */
  var showAll = function () { armed.forEach(function (el) { el.classList.add('mo-in', 'mo-done'); }); };
  window.addEventListener('beforeprint', showAll);
  window.addEventListener('pageshow', function (e) { if (e.persisted) showAll(); });
  // catch-up when scrolling settles: anything actually on screen that the observer has not released (the last lines of a page can never
  // cross the trigger line, a phone's rotation changes it, a fast flick can skip it) is released now, rather than left as a gap
  var idle = 0;
  var settle = function () {
    vh = window.innerHeight || vh;
    // the blocks the pages arm themselves (.rv): same rule, anything on screen is released
    $$('.rv:not(.rv-on)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.height && r.top < vh * 0.98 && r.bottom > 0) el.classList.add('rv-on');
    });
    armed.forEach(function (el) {
      if (el.classList.contains('mo-in')) return;
      var r = el.getBoundingClientRect();
      if (r.height && r.top < vh * 0.98 && r.bottom > 0) { io.unobserve(el); el.classList.add('mo-in'); if (el.classList.contains('mo-h')) setTimeout(function () { el.classList.add('mo-done'); }, 1800); }
    });
  };
  window.addEventListener('scroll', function () { clearTimeout(idle); idle = setTimeout(settle, 260); }, { passive: true });
  window.addEventListener('resize', function () { clearTimeout(idle); idle = setTimeout(settle, 260); });
  window.addEventListener('orientationchange', function () { clearTimeout(idle); idle = setTimeout(settle, 400); });
  setTimeout(settle, 4000);
})();
