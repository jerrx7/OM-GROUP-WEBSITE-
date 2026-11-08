/* OM Group: site-wide smooth scrolling.
   Lenis 1.3.27 (assets/vendor/lenis/lenis.min.js, loaded by this file only when it will be used), configured like the reference site:
   lerp .09, smoothWheel, syncTouch false: exactly what trylexsis.com ships, on every device. Mouse wheel and trackpad glide through
   Lenis; fingers on phones and tablets keep the device's own momentum scrolling (the reference does the same) and those devices
   skip Lenis entirely. Anchor links glide
   on devices with a mouse or trackpad. Starts right after the page is parsed. Off for visitors who prefer reduced motion. Set window.OM_TOUCH_SYNC = true before this script to experiment with
   finger-synced smoothing (not used: it feels different from the reference and costs main-thread time).
   Hand-offs that keep the rest of the site working:
   - The pinned process story owns the wheel and finger swipes while it is presenting (window.omStoryOwns, set by process-story.js).
   - Scrollable panels (company card overlay, modals) scroll natively (allowNestedScroll).
   - Scroll locks (quote / plant / company overlays, the open mega menu) pause smoothing so the page behind cannot move.
   Helpers other scripts can use (all fall back to native scrolling when smoothing is off):
     window.omScrollTo(y)    glide to a page position
     window.omScrollJump(y)  jump instantly and cancel any glide in progress */
(function () {
  if (!document.body || !window.matchMedia) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Phones and other touch-only devices keep the browser's own finger scrolling, exactly like the reference site, so they do not
  // download or run Lenis at all (zero load cost there). Anything with a mouse or trackpad (desktop, laptop, iPad + keyboard) gets it.
  if (!matchMedia('(any-pointer: fine)').matches) return;
  function load() {
    if (window.Lenis) return start();
    var tag = document.createElement('script');
    tag.src = '/assets/vendor/lenis/lenis.min.js';
    tag.async = true;
    if ('fetchPriority' in tag) tag.fetchPriority = 'high'; // 19 KB: must not queue behind the page's big images
    tag.onload = start;
    document.head.appendChild(tag);
  }
  // Start as soon as the page is parsed (not after the full load event, which on the heavy homepage or a slow connection can be
  // many seconds away, or never): a short idle wait keeps it out of the critical path, so it never delays rendering or input.
  // The script is async/low priority and tiny (19 KB, cached for a year of visits), so first paint and LCP are untouched.
  (window.requestIdleCallback || function (f) { setTimeout(f, 60); })(load, { timeout: 350 });

  function start() {
  if (!window.Lenis || window.lenis && window.lenis.scrollTo) return;

  var css = document.createElement('style');
  css.textContent =
    'html.lenis,html.lenis body{height:auto}' +
    'html.lenis{scroll-behavior:auto !important}' +
    '.lenis:not(.lenis-autoToggle).lenis-stopped{overflow:clip}' +
    '.lenis [data-lenis-prevent]{overscroll-behavior:contain}';
  document.head.appendChild(css);

  var lenis = new Lenis({
    lerp: 0.09,
    smoothWheel: true,
    syncTouch: window.OM_TOUCH_SYNC === true, // false = native finger scrolling, as on the reference site
    allowNestedScroll: true,
    autoRaf: true,
    prevent: function (node) { return !!(window.omStoryOwns && window.omStoryOwns(node)); }
  });
  window.lenis = lenis;
  // after a native scroll (finger momentum, keyboard, scrollbar) Lenis can be one frame behind: line it up first so a glide never starts from a stale position
  function syncFromNative() { if (!lenis.isScrolling || lenis.isScrolling === 'native') lenis.scrollTo(window.scrollY, { immediate: true, force: true }); }
  window.omScrollTo = function (y, opts) { syncFromNative(); lenis.scrollTo(y, opts || {}); };
  window.omScrollJump = function (y) { lenis.scrollTo(y, { immediate: true, force: true }); };

  /* scroll locks: pause smoothing while an overlay holds the page still */
  var html = document.documentElement, body = document.body, stopped = false;
  function syncLock() {
    var locked = html.style.overflow === 'hidden' || body.style.overflow === 'hidden' || html.classList.contains('nav-locked');
    if (locked && !stopped) { stopped = true; lenis.stop(); }
    else if (!locked && stopped) { stopped = false; lenis.start(); }
  }
  var mo = new MutationObserver(syncLock);
  mo.observe(html, { attributes: true, attributeFilter: ['style', 'class'] });
  mo.observe(body, { attributes: true, attributeFilter: ['style', 'class'] });

  /* in-page anchors (#section, or this page's own /path#section): glide below the fixed header, keep history, move focus.
     Pages that handle their own anchors call preventDefault first, so this skips them. */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (_) { return; }
    var strip = function (p) { return p.replace(/\/+$/, '') || '/'; };
    if (u.origin !== location.origin || strip(u.pathname) !== strip(location.pathname) || u.search !== location.search || u.hash.length < 2) return;
    var id = decodeURIComponent(u.hash.slice(1)), t = document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    var off = parseInt(getComputedStyle(html).getPropertyValue('--scroll-offset'), 10) || 72;
    syncFromNative();
    lenis.scrollTo(Math.max(0, t.getBoundingClientRect().top + window.scrollY - off)); // live scrollY, so a native scroll just before the click cannot skew it
    if (location.hash !== u.hash) history.pushState(null, '', u.hash);
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });
  }
})();
