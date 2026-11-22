/* OM GROUP · headline accent "ignite" (TEMPORARY TEST BUILD, local only).
   Same effect as the homepage headline: the italic accent words arrive in ink, then slowly warm to brand orange.
   Hero headings ignite shortly after load; section headings ignite as they come into view.
   Without JavaScript, or with reduced motion, the words are simply orange from the start (nothing is hidden). */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var els = [].slice.call(document.querySelectorAll('.ap-hero h1 em, .hero h1 em, .ap-h2 em, .gal-head h2 em, .ap6-lab h3 em, .ap125-xp-panel h3 em'));
  if (!els.length) return;
  els.forEach(function (e) { e.classList.add('ink-arm'); });
  var go = function (e) { e.classList.add('ink-on'); };
  var hero = els.filter(function (e) { return e.closest('.ap-hero, .hero'); });
  var rest = els.filter(function (e) { return hero.indexOf(e) < 0; });
  var start = function () { setTimeout(function () { hero.forEach(function (e) { e.style.setProperty('--ink-d', '1.1s'); go(e); }); }, 60); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { requestAnimationFrame(start); });
  if (!('IntersectionObserver' in window)) { rest.forEach(go); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { go(en.target); io.unobserve(en.target); } });
  }, { threshold: 0.9, rootMargin: '0px 0px -12% 0px' });
  rest.forEach(function (e) { io.observe(e); });
})();

/* long lists of short items in a wide column run in two columns, so they don't make a tall single stack beside empty space */
(() => {
  const lists = () => [...document.querySelectorAll('ul.ap-list')];
  const fit = () => lists().forEach(u => {
    const li = [...u.children]; if (li.length < 6) { u.classList.remove('ap-list--cols'); return; }
    const w = u.getBoundingClientRect().width, avg = li.reduce((a, l) => a + l.textContent.length, 0) / li.length, mx = Math.max(...li.map(l => l.textContent.length));
    u.classList.toggle('ap-list--cols', w >= 500 && avg <= 45 && mx <= 100 && !u.closest('.ap-size-blk,.mas-col'));
  });
  const go = () => { fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 150); });
})();

/* Images ahead of the reader: the browser's own lazy loading starts an image only ~1-2 screens before it
   appears, so a quick flick could show a picture arriving late. This starts each lazy image about three
   screens ahead instead, so it is already there when scrolled to. Skipped with Data Saver or on 2G/3G,
   where the browser's default (load only when close) is kinder to the visitor's data. */
(function () {
  var c = navigator.connection || {};
  if (c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '') || !('IntersectionObserver' in window)) return;
  function start() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.loading = 'eager'; io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px ' + Math.round(innerHeight * 3) + 'px 0px' });
    document.querySelectorAll('img[loading="lazy"]').forEach(function (img) { io.observe(img); });
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
