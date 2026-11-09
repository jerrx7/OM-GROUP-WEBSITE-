/* OM Group — global motion system (entrance + subtle direction-aware exit).
   One engine for every page. It tags existing content (it never replaces it), observes it once with IntersectionObserver,
   and animates transform / opacity only. Content stays visible if scripts fail or the visitor prefers reduced motion.
   Excluded: the pinned #process story scenes, the #operations scroll engine, the 3D company cards, modals, nav and the map stage. */

/* ---- leaving a page: fallback only ----
   Browsers with cross-document view transitions (Chrome, Edge, Safari 18.2+) dissolve between pages in CSS alone (see motion.css) and
   this block does nothing there. Every other browser fades the page content out for 0.2 s before following an internal link; the next
   page then builds in with its own entrance. No state is kept, so it behaves the same on a first visit, a refresh or back/forward. */
(function () {
  'use strict';
  if (window.__omLeave) return; window.__omLeave = true;
  if ('PageSwapEvent' in window) return;                                            // native transition is in charge
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var root = document.documentElement;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return;
    var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) return;   // same page (anchors, in-page links)
    e.preventDefault(); root.classList.add('om-leave');
    setTimeout(function () { location.assign(u.href); }, 210);
    setTimeout(function () { root.classList.remove('om-leave'); }, 3000);            // navigation was cancelled: show the page again
  });
  window.addEventListener('pageshow', function () { root.classList.remove('om-leave'); });   // back/forward from the cache
})();

(function () {
  'use strict';
  if (window.__omMotion) return; window.__omMotion = true;
  var root = document.documentElement;
  if (!('IntersectionObserver' in window)) return;
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (reduce) return;                                            // content is simply shown, nothing is hidden

  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var HOME = !!document.getElementById('about') && !!document.getElementById('companies');   // the long homepage adopts the older .fade-up reveals

  /* ---- what never gets touched ---- */
  var SKIP = '.nav,.drawer,.mega-layer,.cx,.q-modal,#operations,.opm,.pst-track,.pst-scenes,.marquee,.presence-stage,.facilities,.fx-top,.ps-panel-wrap,' +
    '.hero-bg,.hero-grid,script,style,noscript,svg,canvas,.rv-host,.rv,.rv-w,.rv-v,.pt-stage,.hot,.opm-hots,.skip-link,[hidden],[aria-hidden="true"],.no-motion';
  var skip = function (el) { return !!el.closest(SKIP); };

  /* ---- rules: first match wins ---- */
  var RULES = [
    ['frame', '.pst-answer'],
    ['line', '.sec-rule,.presence-rule,.partners-rule,.footer-rule,.loc-rule,hr.rule'],
    ['label', '.eyebrow,.ph-eyebrow,.subgroup-label,.pst-step,.partners-meta'],
    ['head', 'h1,h2,.pst-answer-q,.sec-title,.partners-title,.vm-vision,.vm-mission'],
    ['card', '.cx-cell,.pcard,.loc,.client,.careers-pillar,.fleet-item,.cinfo,.ps-card,.footer-col,.footer-brand,.vm-col,.presence-head-left,.presence-stats,.fleet-label,.contact-cta,.careers-cta,.footer-bottom,.pt-title'],
    ['img', 'figure,.hero-media,.spec-media,.page-hero-media,.gallery img,main > section img,.presence-img-wrap'],
    ['para', 'p,.lede,.sec-lede,.pst-lede,.careers-sub,.contact-sub,.hero-sub,.sub'],
    ['card', '.btn,.hero-ctas,.btn-row,.cta-row']
  ];
  var CARD_ANC = '.cx-cell,.pcard,.loc,.client,.careers-pillar,.fleet-item,.cinfo,.ps-card,.footer-col,.footer-brand,.vm-col,.presence-head-left,.presence-stats,.contact-cta,.careers-cta,.footer-bottom,figure,.hero-media,.spec-media,.fade-up';

  var tagged = [], seen = new WeakSet();
  function tag(el, type) {
    if (seen.has(el)) return; seen.add(el);
    el.setAttribute('data-m', type); tagged.push(el);
  }
  function eligible(el) {
    if (skip(el)) return false;
    var r = el.getBoundingClientRect(); return !(r.width === 0 && r.height === 0 && !el.querySelector('img'));
  }

  // headings: split into words (text stays in place, inline links / em / span.it keep working, spaces preserved)
  function split(el) {
    var words = el.textContent.trim().split(/\s+/).length; if (words > 22 || el.querySelector('img,svg,button,input')) return false;
    var i = 0;
    (function walk(n) { Array.prototype.slice.call(n.childNodes).forEach(function (c) {
      if (c.nodeType === 3) {
        var f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(function (p) { if (!p) return;
          if (/^\s+$/.test(p)) f.appendChild(document.createTextNode(' '));
          else { var s = document.createElement('span'); s.className = 'm-w'; s.style.setProperty('--wi', i++); s.textContent = p; f.appendChild(s); } });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    }); })(el);
    el.classList.add('m-split'); return true;
  }

  // Products on phones: opacity only. Cards fade in as they enter and fade back out as they leave (no sliding, no wipes).
  var cardIO = null;
  function productFades() {
    if (!window.matchMedia('(max-width:640px)').matches) return;
    var rail = document.querySelector('#products .ps-rail'); if (rail) { rail.classList.remove('fade-up', 'in'); }
    var cards = $$('#products .ps-card'); if (!cards.length) return;
    cards.forEach(function (c) { c.classList.add('no-motion', 'pc-fade'); });
    cardIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('pc-show', e.isIntersecting || e.boundingClientRect.bottom < 0); });
    }, { threshold: 0.14, rootMargin: '-6% 0px -6% 0px' });
    cards.forEach(function (c) { cardIO.observe(c); });
  }

  function build() {
    productFades();
    RULES.forEach(function (r) {
      $$(r[1]).forEach(function (el) {
        if (seen.has(el) || !eligible(el)) return;
        if (r[0] === 'para' || r[0] === 'img' || el.matches('.btn,.hero-ctas,.btn-row,.cta-row')) { if (el.parentElement && el.parentElement.closest(CARD_ANC) && !el.matches('figure,.hero-media,.spec-media')) return; }
        if (r[0] === 'head' && el.closest('.fade-up') && !HOME) return;
        if (el.closest('.fade-up') && !HOME && el.parentElement && el.parentElement.closest('.fade-up')) return;
        if (!HOME && el.classList.contains('fade-up')) return;     // inner pages keep their own entrance; they only gain the exit
        if (HOME && el.classList.contains('fade-up')) { el.classList.remove('fade-up'); el.classList.remove('in'); }
        tag(el, r[0]);
        if (r[0] === 'head') split(el);
      });
    });
    // homepage: any older .fade-up wrapper hands over to the engine (children animate on their own, or the wrapper rises as one unit)
    if (HOME) $$('.fade-up').forEach(function (el) {
      if (el.closest('.rv-host,.nav,.drawer,.cx,#operations,.pst-track,.q-modal') || el.matches('.presence') || seen.has(el)) return;
      if (el.querySelector('[data-m]')) { el.classList.remove('fade-up', 'in'); }
      else if (eligible(el)) { el.classList.remove('fade-up', 'in'); tag(el, 'card'); }
    });
    // any remaining block directly inside a section container (tables, lists, forms, notes…) rises as one unit
    $$('section > .container > *, main > section > *, section > .wrap > *').forEach(function (el) {
      if (seen.has(el) || !eligible(el) || el.querySelector('[data-m]') || el.closest('[data-m]')) return;
      if (!HOME && (el.classList.contains('fade-up') || el.closest('.fade-up'))) return;
      if (!el.textContent.trim() && !el.querySelector('img')) return;
      if (el.tagName === 'SECTION') return;
      if (HOME && el.classList.contains('fade-up')) { el.classList.remove('fade-up'); el.classList.remove('in'); }
      tag(el, 'card');
    });
    // footer columns arrive from the bottom as the page ends
    $$('footer .footer-grid > *').forEach(function (el, i) { if (!seen.has(el)) tag(el, 'card'); });
  }

  /* ---- entrance: reveal in batches, staggered by DOM order ---- */
  var entered = new WeakSet();
  var ioIn = new IntersectionObserver(function (es) {
    var vis = es.filter(function (e) { return e.isIntersecting; }).sort(function (a, b) { return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left); });
    es.forEach(function (e) {
      if (!e.isIntersecting && e.boundingClientRect.top < 0 && !entered.has(e.target)) {     // already scrolled past (deep link / reload): show without ceremony
        e.target.classList.add('m-now', 'm-in'); entered.add(e.target); ioIn.unobserve(e.target); watch(e.target);
      }
    });
    vis.forEach(function (e, i) {
      var el = e.target; entered.add(el); ioIn.unobserve(el);
      el.style.setProperty('--md', Math.min(i * 85, 420) + 'ms');
      el.classList.add('m-in'); settle(el); watch(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  // cards hand their transform back to the stylesheet once they have arrived, so their hover effects keep working
  function settle(el) {
    var t = el.getAttribute('data-m'); if (t !== 'card') return;
    var done = function () { el.removeAttribute('data-m'); el.style.removeProperty('--md'); el.classList.remove('m-in', 'm-now'); };
    setTimeout(done, 1200 + (parseInt(el.style.getPropertyValue('--md'), 10) || 0));
  }

  /* ---- exit: very gentle, direction-aware, with hysteresis (inner band is narrower than the entrance band) ---- */
  var ioOut = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var el = e.target; if (!entered.has(el) && !el.classList.contains('m-in')) return;
      if (e.isIntersecting) { el.classList.remove('m-out-u', 'm-out-d'); }
      else { var up = e.boundingClientRect.top < (e.rootBounds ? e.rootBounds.height / 2 : innerHeight / 2); el.classList.remove(up ? 'm-out-d' : 'm-out-u'); el.classList.add(up ? 'm-out-u' : 'm-out-d'); }
    });
  }, { threshold: 0, rootMargin: '-6% 0px -6% 0px' });
  function watch(el) { var t = el.getAttribute('data-m'); if (t && t !== 'card') ioOut.observe(el); }
  // inner pages: their own .fade-up elements gain only the exit
  function watchLegacy() { if (HOME) return; $$('.fade-up').forEach(function (el) { if (skip(el)) return; if (el.matches('h1,h2,h3,p,img,figure,.eyebrow')) { el.setAttribute('data-mx', '1'); ioOut2.observe(el); } }); }
  var ioOut2 = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var el = e.target; if (!el.classList.contains('in')) return;
      if (e.isIntersecting) el.classList.remove('m-out-u', 'm-out-d');
      else { var up = e.boundingClientRect.top < innerHeight / 2; el.classList.remove(up ? 'm-out-d' : 'm-out-u'); el.classList.add(up ? 'm-out-u' : 'm-out-d'); }
    });
  }, { threshold: 0, rootMargin: '-6% 0px -6% 0px' });

  // hero pieces that start below the fold (a phone shows the image first) reveal on scroll, so they must not wait out the entrance stagger
  function heroDelays() {
    var els = $$('.hero-product .fade-up,.legal-header .fade-up'), vh = window.innerHeight || root.clientHeight;
    var tops = els.map(function (el) { return el.getBoundingClientRect().top; });            // single read pass
    els.forEach(function (el, i) { if (tops[i] > vh * 0.9) el.style.transitionDelay = '0ms'; });
  }

  // hero heading: split into words that fade in one after another (the homepage heading's gesture, slower and softer).
  // The heading stays invisible until this has run (see motion.css), so there is no flash of the finished heading.
  function heroHeading() {
    $$('.hero-product h1,.legal-header h1,.sc-hero .sc-h1').forEach(function (h) {
      if (h.classList.contains('hw-split') || h.querySelector('img,svg,button,input') || h.textContent.trim().split(/\s+/).length > 22) return;
      var vh = window.innerHeight || root.clientHeight, inView = h.getBoundingClientRect().top < vh * 0.9, i = 0;
      (function walk(n) { Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (p) { if (!p) return;
            if (/^\s+$/.test(p)) f.appendChild(document.createTextNode(' '));
            else { var s = document.createElement('span'); s.className = 'hw'; s.style.setProperty('--wi', i++); s.textContent = p; f.appendChild(s); } });
          c.replaceWith(f);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      }); })(h);
      h.style.transition = 'none';                                   // the heading itself must not fade a second time
      h.style.setProperty('--hb', inView ? '220ms' : '0ms');         // heading scrolled into view later: no waiting
      h.classList.add('hw-split');
      void h.offsetWidth;
      requestAnimationFrame(function () { h.style.transition = ''; });
      var go = function () { h.classList.add('hw-go'); };
      if (inView) requestAnimationFrame(function () { requestAnimationFrame(go); });
      else { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); } }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }); io.observe(h); }
    });
  }

  function start() {
    try {
      heroHeading();
      heroDelays();
      build();
      if (!tagged.length && HOME === false) { watchLegacy(); return; }
      root.classList.add('m-js');
      tagged.forEach(function (el) { ioIn.observe(el); });
      watchLegacy();
      // elements pinned at the very end of the page can never cross the entrance band: reveal anything visible once scrolling stops
      var idle = 0; window.addEventListener('scroll', function () { clearTimeout(idle); idle = setTimeout(function () {
        tagged.forEach(function (el) { if (!el.getAttribute('data-m') || el.classList.contains('m-in')) return; var r = el.getBoundingClientRect(); if (r.top < innerHeight - 6 && r.bottom > 0) { el.style.setProperty('--md', '0ms'); el.classList.add('m-in'); entered.add(el); ioIn.unobserve(el); settle(el); watch(el); } }); }, 220); }, { passive: true });
      // safety net: never leave anything hidden if the observer is starved (e.g. background tab restore)
      setTimeout(function () { tagged.forEach(function (el) { if (!el.classList.contains('m-in') && el.getAttribute('data-m')) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { el.classList.add('m-in'); } } }); }, 2500);
    } catch (err) { root.classList.remove('m-js'); tagged.forEach(function (el) { el.removeAttribute('data-m'); }); if (window.console) console.warn('motion disabled:', err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('pageshow', function (e) { if (e.persisted) tagged.forEach(function (el) { if (el.getAttribute('data-m')) el.classList.add('m-in', 'm-now'); }); });
})();
