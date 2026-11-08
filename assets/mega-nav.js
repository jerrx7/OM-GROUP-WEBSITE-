/* OM Group — mega-menu + drawer accordion. One data model drives both the desktop panels and the mobile drawer.
   Destinations are the site's real routes / section ids; links to a section that does not exist on the page are dropped.
   Actions reuse the existing logic: the quote button, the careers button and the company profile cards. */
(function () {
  'use strict';
  var header = document.getElementById('nav'), drawer = document.getElementById('drawer');
  var nav = header && header.querySelector('.nav-links');
  if (!header || !nav) return;

  var I = {
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    mountain: '<path d="m8 3 4 8 5-5 5 15H2z"/>',
    factory: '<path d="M2 20V8l6 4V8l6 4V4h4a2 2 0 0 1 2 2v14z"/><path d="M6 16h.01M10 16h.01M14 16h.01"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="m15.5 13.5 1.5 8.5-5-3-5 3 1.5-8.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chev: '<path d="m6 9 6 6 6-6"/>'
  };
  var svg = function (n, c) { return '<svg class="ic ' + (c || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + I[n] + '</svg>'; };
  var L = function (n) { return { l: 'assets/logos/orange/' + n + '.webp' }; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---- menu definitions ----------------------------------------------------------------------
     item: t title, d description, h href (route, #section, mailto:, tel:), a action (quote | careers | company:<id>),
           i line icon, l company logo, p product thumbnail. */
  var MENUS = {
    about: { label: 'About', href: '#about',
      c1: { h: 'Discover OM Group', items: [
        { t: 'About the Group', d: 'A Goa rooted conglomerate operating across construction materials, aggregates, concrete and heavy machinery.', h: '#about', i: 'doc' },
        { t: 'Our Foundation of Trust', d: 'Discover the group, its history, philosophy and operational approach.', h: '#top', i: 'shield' },
        { t: 'Vision & Mission', d: 'The principles that guide our quality, delivery and long term partnerships.', h: '#vision', i: 'book' },
        { t: 'Who We Serve', d: 'Infrastructure contractors, developers, government projects and individual builders.', h: '#clients', i: 'users' }] },
      c2: { h: 'The Group at a Glance', plain: true, items: [
        { t: 'Group Structure', h: '#companies' }, { t: 'Strategic Partners', h: '#partners' }, { t: 'Our Operational Footprint', h: '#infrastructure' },
        { t: 'Our Approach to Quality', h: '#process' }, { t: 'Explore the Group', h: '#about' }] },
      f: { img: 'feat-about', pos: '50% 40%', lab: 'The OM Group Story', hd: 'Powering Goa’s Infrastructure Since Day One.', d: 'A diversified group delivering construction materials, concrete, logistics and heavy machinery across Goa.', cta: 'Discover Our Story', h: '#about' } },
    companies: { label: 'Companies', href: '#companies',
      c1: { h: 'Division 01 · Aggregates Trading', compact: true, items: [
        { n: '01', t: 'OM Transport', d: 'Heavy haul logistics for aggregates, sand and construction metal.', a: 'company:om-transport', h: '#companies', logo: L('om-transport-v3') },
        { n: '02', t: 'Om Enterprises', d: 'Bulk aggregates trading for residential and commercial site supply.', a: 'company:om-enterprises', h: '#companies', logo: L('om-enterprises') },
        { n: '03', t: 'Maharudra Infrastructure', d: 'Site grade aggregates and structural fill for infrastructure projects.', a: 'company:maharudra', h: '#companies', logo: L('maharudra') },
        { n: '04', t: 'Swastik Enterprises', d: 'Sourcing partner for sand, GSB and construction metal.', a: 'company:swastik', h: '#companies', logo: L('swastik') },
        { n: '05', t: 'Corestone Solutions', d: 'Specialist supply of crushed stone grades to RCC contractors.', a: 'company:corestone', h: '#companies', logo: L('corestone') },
        { n: '06', t: 'Om Minerals & Logistics', d: 'Mineral sourcing and logistics partner for project supply.', a: 'company:om-minerals', h: '#companies', logo: L('om-minerals') }] },
      c2: { h: 'Division 02 · Core Ventures', items: [
        { t: 'Sabsol Qualitech Industries LLP', k: 'Manufacturing · RMC + Crushing', d: 'Two modern RMC batching plants and a VSI stone crusher delivering specification grade materials.', a: 'company:sabsol-qualitech', h: '#companies', logo: L('sabsol-qualitech-v2') },
        { t: 'Sabsol Heavy Machines LLP', k: 'Equipment · Leasing & Operations', d: 'Owner operated JCBs, transit mixers, tippers and heavy equipment for project operations.', a: 'company:sabsol-heavy', h: '#companies', logo: L('sabsol-heavy-v2') }],
        sub: { t: 'Explore All Companies', h: '#companies' } },
      f: { img: 'feat-companies', pos: '50% 50%', lab: 'Core Venture', hd: 'Built for Industrial Scale.', d: 'Manufacturing, material processing and equipment operations supporting infrastructure across Goa.', cta: 'Explore Core Ventures', h: '#companies', a: 'company:sabsol-qualitech' } },
    products: { label: 'Products', href: '#products',
      c1: { h: 'Product Categories', items: [
        { t: 'Crushed Stone Aggregates', d: 'Precision graded construction aggregates for RCC, roads and infrastructure.', h: '#products', p: 'th-crushed' },
        { t: 'Manufactured & Washed Sand', d: 'Sand for concrete, plastering and masonry applications.', h: '/products/m-sand', p: 'th-sand' },
        { t: 'Ready Mix Concrete', d: 'Specification grade concrete for residential, commercial and infrastructure projects.', h: '/products/ready-mix-concrete', p: 'th-rmc' },
        { t: 'GSB, Boulders & Metal', d: 'Foundational materials for road construction and heavy duty applications.', h: '/products/granular-sub-base', p: 'th-gsb' }] },
      c2: { h: 'Popular Products', plain: true, two: true, items: [
        { t: '10mm Aggregates', h: '/products/10mm-aggregate' }, { t: '20mm Aggregates', h: '/products/20mm-aggregate' },
        { t: '6mm Aggregates', h: '/products/6mm-aggregate' }, { t: '12.5mm Aggregates', h: '/products/12mm-aggregate' },
        { t: '40mm Aggregates', h: '/products/40mm-aggregate' }, { t: '60mm Aggregates', h: '/products/60mm-aggregate' },
        { t: 'GSB', h: '/products/granular-sub-base' }, { t: 'M Sand', h: '/products/m-sand' },
        { t: 'P Sand', h: '/products/plaster-sand' }, { t: 'RMC', h: '/products/ready-mix-concrete' }] },
      f: { img: 'feat-products', pos: '50% 50%', lab: 'Product Spotlight', hd: 'Materials That Build With Confidence.', d: 'Consistent grading, reliable supply and specification focused construction materials across Goa.', cta: 'Explore All Products', h: '#products' } },
    infrastructure: { label: 'Infrastructure', href: '#infrastructure',
      c1: { h: 'Our Locations', items: [
        { t: 'Kundaim', d: 'RMC batching plant and heavy machinery operations base.', h: '/infrastructure/kundaim-rmc-plant', i: 'pin' },
        { t: 'Thivim', d: 'RMC batching plant and heavy machinery operations base.', h: '/infrastructure/thivim-rmc-plant', i: 'pin' },
        { t: 'Banda Wafoli', d: 'VSI stone crusher and multi grade aggregate production.', h: '/infrastructure/banda-wafoli-vsi-crusher', i: 'pin' },
        { t: 'Sancoale', d: 'Heavy machinery deployment base for South Goa.', h: '/infrastructure/sancoale-rmc-plant', i: 'pin' }] },
      c2: { h: 'Operational Infrastructure', plain: true, items: [
        { t: 'RMC Batching Plants', h: '#infrastructure' }, { t: 'VSI Stone Crusher', h: '/infrastructure/banda-wafoli-vsi-crusher' },
        { t: 'Fleet & Heavy Machinery', h: '/infrastructure/fleet-logistics' }, { t: 'Presence Across Goa', h: '#infrastructure' }, { t: 'Explore Infrastructure', h: '#infrastructure' }] },
      f: { img: 'feat-infra', pos: '50% 50%', lab: 'Our Operational Footprint', hd: 'Strategically Positioned Across Goa.', d: 'Our facilities and operational bases connect North and South Goa through a coordinated supply network.', cta: 'Explore Our Infrastructure', h: '#infrastructure' } },
    contact: { label: 'Contact', href: '#contact',
      c1: { h: 'Get in Touch', items: [
        { t: 'Request a Quote', d: 'Submit your requirement for aggregates, concrete or heavy machinery.', a: 'quote', h: '#contact', i: 'doc' },
        { t: 'Business Enquiries', d: 'Contact the OM Group team for commercial and supply related discussions.', h: 'mailto:info@omgroupco.com', i: 'brief' },
        { t: 'General Contact', d: 'Reach the group for general information.', h: '#contact', i: 'users' }] },
      c2: { h: 'Contact Information', items: [
        { t: 'Goa, India', h: '#contact', i: 'pin', compact: true },
        { t: 'info@omgroupco.com', h: 'mailto:info@omgroupco.com', i: 'mail', compact: true },
        { t: '+91-9049629684', h: 'tel:+919049629684', i: 'phone', compact: true },
        { t: '+91-8788732881', h: 'tel:+918788732881', i: 'phone', compact: true }] },
      f: { img: 'feat-contact', pos: '50% 55%', lab: 'Let’s Build Together', hd: 'Have a Project in Goa?', d: 'Tell us what you need. Our team can help with materials, concrete and machinery requirements.', cta: 'Request a Quote', a: 'quote', h: '#contact' } },
    careers: { label: 'Join Us', href: '#careers',
      c1: { h: 'Career Opportunities', items: [
        { t: 'Career Growth', h: '#careers', i: 'trend', compact: true }, { t: 'Professional Development', h: '#careers', i: 'award', compact: true },
        { t: 'Long Term Opportunities', h: '#careers', i: 'compass', compact: true }, { t: 'Industrial Scale Projects', h: '#careers', i: 'factory', compact: true },
        { t: 'Leadership Opportunities', h: '#careers', i: 'users', compact: true }] },
      c2: { h: 'Explore Careers', plain: true, items: [
        { t: 'Aggregates', h: '#careers' }, { t: 'Ready Mix Concrete', h: '#careers' }, { t: 'Heavy Machinery', h: '#careers' },
        { t: 'Logistics', h: '#careers' }, { t: 'Industrial Operations', h: '#careers' }] },
      f: { img: 'feat-careers', pos: '50% 45%', lab: 'Careers at OM Group', hd: 'Build Your Future With Us.', d: 'Be part of the teams shaping Goa’s infrastructure.', cta: 'Apply Now', a: 'careers', h: '#careers' } }
  };
  var ORDER = ['about', 'companies', 'products', 'infrastructure', 'contact', 'careers'];

  /* ---- helpers ---- */
  var exists = function (h) { return h.charAt(0) !== '#' || h === '#top' || !!document.getElementById(h.slice(1)); };
  var ico = function (it) {
    if (it.logo) return '<span class="mega-ico logo"><img src="' + it.logo.l + '" alt="" width="36" height="36" loading="lazy" decoding="async"></span>';
    if (it.p) return '<span class="mega-ico"><img src="assets/nav/' + it.p + '.webp" alt="" width="42" height="42" loading="lazy" decoding="async"></span>';
    if (it.i) return '<span class="mega-ico">' + svg(it.i) + '</span>';
    return '';
  };
  var attrs = function (it) { return ' href="' + esc(it.h || '#') + '"' + (it.a ? ' data-act="' + it.a + '"' : ''); };
  var seq = 0;
  var mi = function () { return ' class="mi"' ; };
  function itemHTML(it, c, k) {
    var cls = 'mega-link' + (c.plain ? ' plain' : '') + ((it.compact || c.compact) && !c.plain ? ' compact' : '');
    var i = ' style="--i:' + (seq++) + '"';
    if (c.plain) return '<a class="' + cls + ' mi"' + attrs(it) + i + '><span class="mega-t">' + esc(it.t) + '</span>' + svg('arrow', 'mega-arr') + '</a>';
    var txt = '<span><span class="mega-t">' + (it.n ? '<span class="mega-n">' + it.n + '</span>' : '') + esc(it.t) + '</span>' +
      (it.k ? '<span class="mega-div" style="display:block;margin-top:3px">' + esc(it.k) + '</span>' : '') +
      (it.d && !(it.compact || c.compact) ? '<span class="mega-d">' + esc(it.d) + '</span>' : (it.d ? '<span class="mega-d">' + esc(it.d) + '</span>' : '')) + '</span>';
    return '<a class="' + cls + ' mi"' + attrs(it) + i + '>' + ico(it) + txt + '</a>';
  }
  function colHTML(c) {
    var items = c.items.filter(function (it) { return exists(it.h || '#'); });
    var h = '<div class="mega-col"><div class="mega-h mi" style="--i:' + (seq++) + '">' + esc(c.h) + '</div><div class="' + (c.two ? 'mega-list mega-two' : 'mega-list') + '">';
    h += items.map(function (it) { return itemHTML(it, c); }).join('') + '</div>';
    if (c.sub) h += '<a class="mega-sub mi" style="--i:' + (seq++) + '" href="' + c.sub.h + '">' + esc(c.sub.t) + svg('arrow') + '</a>';
    return h + '</div>';
  }
  function featHTML(f) {
    return '<div class="mega-col mega-feat"><a class="mega-feat-card mi" style="--i:' + (seq++) + '"' + attrs(f) + '>' +
      '<span class="mega-feat-img"><img src="assets/nav/' + f.img + '.webp" alt="" width="360" height="215" loading="lazy" decoding="async" style="object-position:' + f.pos + '"></span>' +
      '<span class="mega-feat-body"><span class="mega-lab">' + esc(f.lab) + '</span><span class="mega-fh">' + esc(f.hd) + '</span><span class="mega-fd">' + esc(f.d) + '</span>' +
      '<span class="mega-fl">' + esc(f.cta) + svg('arrow') + '</span></span></a></div>';
  }

  /* ---- desktop panels ---- */
  var layer = document.createElement('div'); layer.className = 'mega-layer'; layer.id = 'megaLayer';
  var panels = {};
  ORDER.forEach(function (id) {
    var m = MENUS[id]; seq = 0;
    var p = document.createElement('div'); p.className = 'mega-panel'; p.id = 'mega-' + id; p.setAttribute('role', 'region'); p.setAttribute('aria-label', m.label + ' menu');
    p.innerHTML = '<div class="mega-card">' + colHTML(m.c1) + colHTML(m.c2) + featHTML(m.f) + '</div>';
    layer.appendChild(p); panels[id] = p;
  });
  header.insertAdjacentElement('afterend', layer);

  var triggers = {};
  Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
    var id = ORDER.filter(function (k) { return MENUS[k].href === a.getAttribute('href'); })[0];
    if (!id) return;
    a.setAttribute('data-mega', id); a.setAttribute('aria-expanded', 'false'); a.setAttribute('aria-controls', 'mega-' + id); a.setAttribute('aria-haspopup', 'true');
    a.insertAdjacentHTML('beforeend', svg('chev', 'mchev')); triggers[id] = a;
  });

  var cur = null, closeT = 0, quiet = false;
  var canHover = function () { return window.matchMedia('(hover:hover) and (pointer:fine)').matches && window.innerWidth > 1100; };
  function place() { layer.style.setProperty('--mega-top', Math.round(header.getBoundingClientRect().bottom) + 'px'); }
  function show(id) {
    clearTimeout(closeT);
    if (cur === id) return;
    place();
    if (cur) { panels[cur].classList.remove('open'); triggers[cur].classList.remove('is-open'); triggers[cur].setAttribute('aria-expanded', 'false'); }
    cur = id; panels[id].classList.add('open'); triggers[id].classList.add('is-open'); triggers[id].setAttribute('aria-expanded', 'true');
  }
  function hide(restore) {
    clearTimeout(closeT);
    if (!cur) return;
    var t = triggers[cur]; panels[cur].classList.remove('open'); t.classList.remove('is-open'); t.setAttribute('aria-expanded', 'false');
    cur = null; if (restore) { quiet = true; t.focus({ preventScroll: true }); setTimeout(function () { quiet = false; }, 50); }
  }
  var later = function () { clearTimeout(closeT); closeT = setTimeout(function () { hide(false); }, 160); };

  Object.keys(triggers).forEach(function (id) {
    var a = triggers[id];
    a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && canHover()) show(id); });
    a.addEventListener('focus', function () { if (!quiet && a.matches(':focus-visible') && window.innerWidth > 1100) show(id); });
    a.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); show(id); var f = panels[id].querySelector('a'); if (f) f.focus(); }
      else if (e.key === ' ') { e.preventDefault(); cur === id ? hide(false) : show(id); }
    });
    // touch laptops / tablets in landscape: first tap opens the panel, second tap follows the link
    a.addEventListener('click', function (e) { if (window.innerWidth > 1100 && e.detail && matchMedia('(hover:none)').matches && cur !== id) { e.preventDefault(); show(id); } });
  });
  [header, layer].forEach(function (el) {
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') clearTimeout(closeT); });
    el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && cur) later(); });
  });
  // leaving the nav row sideways/upwards over a non-trigger part of the header (logo, CTA) closes the panel
  header.addEventListener('pointerover', function (e) { if (e.pointerType === 'mouse' && cur && !e.target.closest('.nav-links')) later(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur) { var inside = layer.contains(document.activeElement); hide(inside || header.contains(document.activeElement)); } });
  document.addEventListener('pointerdown', function (e) { if (cur && !layer.contains(e.target) && !header.contains(e.target)) hide(false); });
  layer.addEventListener('focusout', function (e) { if (cur && e.relatedTarget && !layer.contains(e.relatedTarget) && !header.contains(e.relatedTarget)) hide(false); });
  window.addEventListener('resize', function () { if (window.innerWidth <= 1100) hide(false); else if (cur) place(); }, { passive: true });
  window.addEventListener('scroll', function () { if (cur) place(); }, { passive: true });

  /* ---- actions ---- */
  function go(h) {
    var to = function (y) { if (window.omScrollTo) window.omScrollTo(y); else window.scrollTo({ top: y, behavior: 'smooth' }); };
    if (h === '#top') { to(0); return; }
    var t = document.querySelector(h); if (!t) return;
    to(t.getBoundingClientRect().top + window.scrollY - 60);
  }
  function act(a) {
    if (a === 'quote') { var q = document.getElementById('requestQuoteBtn'); if (q) q.click(); return true; }
    if (a === 'careers') { var c = document.getElementById('openCareersModalBtn'); if (c) c.click(); return true; }
    if (a && a.indexOf('company:') === 0) {
      var card = document.querySelector('.ccard[data-company="' + a.slice(8) + '"]'); if (!card) return false;
      card.scrollIntoView({ block: 'center', behavior: 'instant' });
      setTimeout(function () { var b = card.querySelector('.ccard-open'); if (b) b.click(); }, 160); return true;
    }
    return false;
  }
  function onLink(e) {
    var a = e.target.closest('a[href]'); if (!a || !(layer.contains(a) || (drawer && drawer.contains(a)))) return;
    var h = a.getAttribute('href'), action = a.getAttribute('data-act');
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    var wasDrawer = drawer && drawer.contains(a);
    if (action || h.charAt(0) === '#') {
      e.preventDefault();
      hide(false); if (wasDrawer) closeDrawer();
      var run = function () { if (!(action && act(action))) go(h); };
      wasDrawer ? setTimeout(run, 380) : run();
    } else { hide(false); if (wasDrawer) closeDrawer(); }
  }
  layer.addEventListener('click', onLink);

  /* ---- drawer accordion ---- */
  function closeDrawer() { drawer.classList.remove('open'); sync(); }
  function sync() {
    var open = drawer.classList.contains('open');
    document.documentElement.classList.toggle('nav-locked', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    var hb = document.getElementById('hamburger'); if (hb) hb.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (drawer) {
    var close = document.getElementById('drawerClose');
    Array.prototype.slice.call(drawer.children).forEach(function (n) { if (n !== close) n.remove(); });
    var html = '';
    ORDER.forEach(function (id, n) {
      var m = MENUS[id]; var body = '';
      body += '<a class="dr-go" href="' + m.href + '">View ' + esc(m.label === 'Join Us' ? 'Careers' : m.label) + svg('arrow') + '</a>';
      [m.c1, m.c2].forEach(function (c) {
        var items = c.items.filter(function (it) { return exists(it.h || '#'); });
        body += '<div class="dr-sec">' + esc(c.h) + '</div>';
        var inner = items.map(function (it) {
          return '<a href="' + esc(it.h || '#') + '"' + (it.a ? ' data-act="' + it.a + '"' : '') + '>' + (c.plain ? '' : ico(it)) +
            '<span><span class="dt">' + esc(it.t) + '</span>' + (it.d ? '<span class="dd">' + esc(it.d) + '</span>' : '') + '</span></a>';
        }).join('');
        body += c.two ? '<div class="dr-two">' + inner + '</div>' : inner;
      });
      var f = m.f;
      body += '<a class="dr-feat" href="' + esc(f.h) + '"' + (f.a ? ' data-act="' + f.a + '"' : '') + '><img src="assets/nav/' + f.img + '.webp" alt="" width="84" height="64" loading="lazy" decoding="async" style="object-position:' + f.pos + '"><span><span class="l">' + esc(f.lab) + '</span><span class="h" style="display:block">' + esc(f.hd) + '</span></span></a>';
      html += '<div class="dr-item" data-id="' + id + '"><button type="button" class="dr-head" id="drh-' + id + '" aria-expanded="false" aria-controls="drb-' + id + '"><span class="n">0' + (n + 1) + '</span>' + esc(m.label) + svg('chev', 'dr-chev') + '</button>' +
        '<div class="dr-body" id="drb-' + id + '" role="region" aria-labelledby="drh-' + id + '"><div class="dr-inner">' + body + '</div></div></div>';
    });
    drawer.insertAdjacentHTML('beforeend', html);
    drawer.addEventListener('click', function (e) {
      var h = e.target.closest('.dr-head');
      if (h) {
        var item = h.parentNode, willOpen = !item.classList.contains('open');
        Array.prototype.forEach.call(drawer.querySelectorAll('.dr-item.open'), function (o) { o.classList.remove('open'); o.querySelector('.dr-head').setAttribute('aria-expanded', 'false'); });
        if (willOpen) { item.classList.add('open'); h.setAttribute('aria-expanded', 'true'); setTimeout(function () { var r = item.getBoundingClientRect(), d = drawer.getBoundingClientRect(); if (r.top < d.top) drawer.scrollTo({ top: drawer.scrollTop + r.top - d.top - 8, behavior: 'smooth' }); }, 200); }
        return;
      }
      onLink(e);
    });
    new MutationObserver(sync).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1100 && drawer.classList.contains('open')) closeDrawer(); }, { passive: true });
    sync();
  }
})();
