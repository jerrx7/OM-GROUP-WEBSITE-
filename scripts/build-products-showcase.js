/* Builds the editorial product showcase of /products as plain static HTML (no client-side rendering, so the copy is
   crawlable and nothing flashes). Run: node scripts/build-products-showcase.js
   - PRODUCTS below is the single source of the showcase content. Order here = order on the page.
   - Left/right alternation is derived from the index (odd = text left, even = image left), so it never resets between
     categories and stays correct when a product is added or reordered.
   - Rewrites the region between the SC:BODY markers and the SC:CSS markers in products/index.html (idempotent).
   All copy restates what the individual product pages already say. Do not add figures, standards or claims here that
   the product page itself does not make. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'products', 'index.html');
const CSS = path.join(__dirname, 'products-showcase.css');
const IMG = '/img/products/showcase/';

const Q = (category, sub) => '/?category=' + encodeURIComponent(category) + (sub ? '&subcategory=' + encodeURIComponent(sub) : '') + '#contact';

const CATS = {
  aggregates: { id: 'aggregates', key: 'A', name: 'Crushed Stone Aggregates' },
  sand: { id: 'sand', key: 'B', name: 'Manufactured & Natural Sand' },
  rmc: { id: 'ready-mix-concrete', key: 'C', name: 'Ready-Mix Concrete' },
  road: { id: 'road-materials', key: 'D', name: 'Road & Infrastructure Materials' },
};
const CAT_NAV_LABEL = { aggregates: 'Crushed Stone Aggregates', sand: 'Manufactured & Natural Sand', rmc: 'Ready-Mix Concrete', road: 'Road & Infrastructure Materials' };

// img: file stem in /img/products/showcase/ with its large width and height (the 560w variant is always generated too)
const PRODUCTS = [
  { cat: 'aggregates', name: '10mm Crushed Stone Aggregate', slug: '10mm-aggregate', img: ['10mm-aggregate', 1000, 910],
    alt: '10mm crushed stone aggregate, small angular grey stones, supplied by OM Group in Goa',
    desc: 'Crushed stone graded to a nominal size of 10mm, used as coarse aggregate in RCC with closely spaced reinforcement, thin sections, precast elements and paver and block manufacture.',
    apps: ['RCC', 'Precast', 'Pavers & blocks', 'Thin sections'],
    specs: [['Nominal size', '10mm'], ['Produced at', 'Banda Wafoli VSI facility'], ['Supply', 'North & South Goa']],
    quote: Q('Stone Aggregates', '10MM') },
  { cat: 'aggregates', name: '20mm Crushed Stone Aggregate', slug: '20mm-aggregate', img: ['20mm-aggregate', 1000, 895],
    alt: '20mm crushed stone aggregate, larger angular grey stones, supplied by OM Group in Goa',
    desc: 'Crushed stone of 20mm nominal size, typically the default coarse aggregate for RCC slabs, beams, columns, footings and ready-mix concrete.',
    apps: ['RCC slabs', 'Beams & columns', 'Footings', 'Ready-mix concrete'],
    specs: [['Nominal size', '20mm'], ['Produced at', 'Banda Wafoli VSI facility'], ['Ordered in', 'Brass, cubic metres, tonnes or trips']],
    quote: Q('Stone Aggregates', '20MM') },
  { cat: 'aggregates', name: '6mm Aggregate', slug: '6mm-aggregate', img: ['6mm-aggregate', 967, 865],
    alt: '6mm crushed stone aggregate, fine angular grey chips, supplied by OM Group in Goa',
    desc: '6mm crushed stone aggregate for paver blocks, tiles, precast products and surface finishes, supplied through OM Group’s own stone-crushing operation.',
    apps: ['Paver blocks', 'Tiles', 'Precast', 'Finishing work'],
    specs: [['Nominal size', '6mm'], ['Source', 'OM Group stone-crushing operation'], ['Supply', 'North & South Goa']],
    quote: Q('Stone Aggregates', '6MM') },
  { cat: 'aggregates', name: '12.5mm Aggregate', slug: '12mm-aggregate', img: ['12-5mm-aggregate', 1000, 967],
    alt: '12.5mm crushed stone aggregate, mid-size angular grey stones, supplied by OM Group in Goa',
    desc: '12.5mm crushed stone aggregate, commonly sold in the trade as 12mm, for RCC, precast and specified road work.',
    apps: ['RCC', 'Precast', 'Specified road work'],
    specs: [['Nominal size', '12.5mm'], ['Trade name', 'Commonly sold as 12mm'], ['Source', 'OM Group stone-crushing operation']],
    quote: Q('Stone Aggregates', '12.5MM') },
  { cat: 'aggregates', name: '40mm Aggregate', slug: '40mm-aggregate', img: ['40mm-aggregate', 1000, 595],
    alt: '40mm crushed stone aggregate, large angular grey stones, supplied by OM Group in Goa',
    desc: 'Large-size crushed stone aggregate for mass concrete, PCC, foundations and road sub-base work.',
    apps: ['Mass concrete', 'PCC', 'Foundations', 'Road sub-base'],
    specs: [['Nominal size', '40mm'], ['Source', 'OM Group stone-crushing operation'], ['Supply', 'North & South Goa']],
    quote: Q('Stone Aggregates', '40MM') },
  { cat: 'aggregates', name: '60mm Aggregate', slug: '60mm-aggregate', img: ['60mm-aggregate', 1000, 625],
    alt: '60mm crushed stone aggregate, very large angular grey stones, supplied by OM Group in Goa',
    desc: 'Large-size crushed stone aggregate for heavy-duty infrastructure, drainage, mass concrete and specialised construction applications.',
    apps: ['Heavy foundations', 'Drainage', 'Mass concrete', 'Infrastructure'],
    specs: [['Nominal size', '60mm'], ['Source', 'OM Group stone-crushing operation'], ['Supply', 'North & South Goa']],
    quote: Q('Stone Aggregates', '60MM') },

  { cat: 'sand', name: 'M-Sand (Manufactured Sand)', slug: 'm-sand', img: ['m-sand', 1000, 542],
    alt: 'M-Sand manufactured sand, a grey pile of crushed hard-rock fine aggregate, supplied by OM Group',
    desc: 'Fine aggregate produced by crushing hard rock and screening it to sand size, graded for concrete, RCC and masonry.',
    apps: ['Concrete', 'RCC', 'Masonry', 'Blockwork'],
    specs: [['Supplied to', 'RMC plants, builders, contractors, block makers'], ['Grading', 'Current grading information on request'], ['Availability', 'Confirmed per project requirement']],
    quote: Q('Sand', 'M-Sand (Manufactured Sand)') },
  { cat: 'sand', name: 'Plaster Sand (P-Sand)', slug: 'plaster-sand', img: ['plaster-sand', 1000, 676],
    alt: 'Plaster sand, a clean fine-grained pile of P-Sand for plastering, supplied by OM Group',
    desc: 'A finer grade of manufactured sand, processed and graded for plaster mortar under IS 1542:1992.',
    apps: ['Internal plastering', 'External plastering', 'Ceiling plastering'],
    specs: [['Standard', 'IS 1542:1992'], ['Made by', 'OM Group, manufactured'], ['Documentation', 'Grading and documentation on request']],
    quote: Q('Sand', 'P-Sand (Plastering Sand)') },
  { cat: 'sand', name: 'Concrete Sand', slug: 'concrete-sand', img: ['concrete-sand', 1000, 669],
    alt: 'Concrete-grade manufactured sand, a grey fine aggregate pile, supplied by OM Group in Goa',
    desc: 'Manufactured M-Sand for concrete applications, with material selection and grading confirmed against the applicable IS 383:2016 requirements and the project mix specification.',
    apps: ['Concrete works', 'RMC & site-mixed concrete', 'Foundations', 'Slabs & beams'],
    specs: [['Reference', 'IS 383:2016'], ['Material', 'Manufactured M-Sand'], ['Grading', 'Confirmed against project mix specification']],
    quote: '/?category=Sand&subcategory=M-Sand%20(Manufactured%20Sand)&message=Concrete%20Sand%20%2F%20M-Sand%20for%20concrete%20application#contact' },
  { cat: 'sand', name: 'River Sand', slug: 'river-sand', img: ['river-sand', 884, 737],
    alt: 'River Sand, naturally sourced golden sand falling into a pile, arranged by OM Group in Goa',
    desc: 'Natural River Sand sourced through verified suppliers and arranged by OM Group for construction projects, subject to current availability, source documentation and applicable regulations.',
    apps: ['RCC & concrete', 'RMC', 'Masonry mortar', 'Plaster'],
    specs: [['Sourcing', 'Through verified suppliers'], ['Subject to', 'Availability and applicable regulations'], ['Documentation', 'Source documentation on request']],
    quote: Q('Sand', 'R-Sand (River Sand)') },
  { cat: 'sand', name: 'Washed Sand', slug: 'washed-sand', img: ['washed-sand', 1000, 821],
    alt: 'Washed sand, a stream of grey sand pouring into a pile, supplied by OM Group in Goa',
    desc: 'Washed sand supplied by OM Group as a product in its own right, for concrete, masonry and general construction across North and South Goa, with current specifications confirmed against the project requirement.',
    apps: ['Concrete & RCC', 'Masonry mortar', 'Blockwork & precast', 'General construction'],
    specs: [['Category', 'Sand / fine aggregate'], ['Supply', 'North & South Goa'], ['Availability', 'Confirmed against the project requirement']],
    quote: Q('Sand', 'W-Sand (Wash Sand)') },

  { cat: 'rmc', name: 'Ready-Mix Concrete (RMC)', slug: 'ready-mix-concrete', img: ['ready-mix-concrete', 1000, 606],
    alt: 'Freshly mixed ready-mix concrete supplied by OM Group from its Kundaim and Thivim plants in Goa',
    desc: 'Concrete produced under controlled batching and mixing conditions and delivered to site in a fresh state for placement.',
    apps: ['Foundations', 'Slabs, columns & beams', 'Residential', 'Commercial & infrastructure'],
    specs: [['Grades', 'M20 to M45 standard, M60 on request'], ['Batched at', 'Kundaim and Thivim plants'], ['Delivery', 'Transit mixer']],
    quote: Q('Ready Mix Concrete (RMC)') },

  { cat: 'road', name: 'Granular Sub-Base (GSB)', slug: 'granular-sub-base', img: ['granular-sub-base', 1000, 610],
    alt: 'Granular Sub-Base (GSB), a graded granular road material pile supplied by OM Group in Goa',
    desc: 'A specified blend of graded granular material that forms the sub-base layer beneath a road’s base course and surface.',
    apps: ['Highways & state roads', 'Rural & urban roads', 'Industrial roads', 'Site development'],
    specs: [['Matched to', 'MoRTH Clause 401 and project specification'], ['Made by', 'OM Group, manufactured'], ['Supply', 'North & South Goa']],
    quote: Q('Stone Aggregates', 'GSB (Granular Sub-Base)') },
  { cat: 'road', name: 'Wet Mix Macadam (WMM)', slug: 'wmm', img: ['wmm', 1000, 644],
    alt: 'Crushed, graded aggregate for Wet Mix Macadam supplied by OM Group for road projects in Goa',
    desc: 'The crushed, graded aggregate used in Wet Mix Macadam for road and infrastructure projects, produced at OM Group’s own crushing operation.',
    apps: ['National & state highways', 'Rural roads', 'Industrial roads', 'Large civil infrastructure'],
    specs: [['Matched to', 'MoRTH Clause 406 and project specification'], ['Source', 'OM Group crushing operation'], ['Supply', 'North & South Goa']],
    quote: Q('Stone Aggregates', 'WMM (Wet Mix Macadam)') },
  { cat: 'road', name: 'Construction Boulders', slug: 'boulders', img: ['boulders', 1000, 765],
    alt: 'A large natural stone boulder supplied by OM Group for construction in Goa',
    desc: 'Construction, pitching, soling, gabion and project-specific boulders, with material selected against application, size and project requirements.',
    apps: ['Construction', 'Pitching', 'Soling', 'Gabion', 'Protection & retaining'],
    specs: [['Types', 'Construction, pitching, soling, gabion'], ['Selected by', 'Application, size and project requirement'], ['Supply', 'North & South Goa']],
    quote: Q('Stone Aggregates', 'Boulders') },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
// Text is split into words at build time (static HTML, still plain readable text for search engines and screen readers):
// titles rise out of a mask word by word, descriptions flow in word by word.
const maskWords = (text, start = 0) => text.split(' ').map((w, i) => `<span class="sw"><span class="swi" style="--w:${start + i}">${esc(w)}</span></span>`).join(' ');
const fadeWords = (text) => {
  // chunks end at punctuation (, ; .) or after 5 words: about 4-6 spans per description keeps the DOM light but still flows in
  const chunks = []; let cur = [];
  text.split(' ').forEach((w) => { cur.push(w); if (/[,;.]$/.test(w) || cur.length >= 5) { chunks.push(cur.join(' ')); cur = []; } });
  if (cur.length) chunks.push(cur.join(' '));
  return chunks.map((c, i) => `<span class="dw" style="--k:${i}">${esc(c)}</span>`).join(' ');
};
const SIZES = '(max-width:767px) 92vw, (max-width:1199px) 46vw, 600px';

function picture(p, index) {
  const [stem, w, h] = p.img;
  const set = (ext) => `${IMG}${stem}-560.${ext} 560w, ${IMG}${stem}-${w}.${ext} ${w}w`;
  const ratio = w / h < 1.25 ? '' : ' r43';
  // the first product sits right under the intro, so it loads eagerly; the rest load as the visitor approaches
  const load = index === 0 ? 'loading="eager" fetchpriority="auto"' : 'loading="lazy"';
  return {
    ratio,
    html: `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${SIZES}" /><source type="image/webp" srcset="${set('webp')}" sizes="${SIZES}" /><img src="${IMG}${stem}-${w}.webp" alt="${esc(p.alt)}" width="${w}" height="${h}" ${load} decoding="async" /></picture>`,
  };
}

function product(p, index, total) {
  const n = index + 1;
  const flip = index % 2 === 1; // index 0 = text left / image right; then it alternates
  const cat = CATS[p.cat];
  const pic = picture(p, index);
  const detail = '/products/' + p.slug;
  return `
<article class="sc${flip ? ' sc--flip' : ''}" id="${p.slug === 'ready-mix-concrete' ? 'rmc' : p.slug}" data-n="${n}" aria-labelledby="sc-h-${p.slug}">
  <div class="sc-wrap"><div class="sc-in">
    <div class="sc-text">
      <p class="sc-label" data-r="label">Product <b>${pad(n)}</b> / ${esc(cat.name)}</p>
      <h2 class="sc-title" id="sc-h-${p.slug}" data-r="words">${maskWords(p.name)}</h2>
      <p class="sc-desc" data-r="desc">${fadeWords(p.desc)}</p>
      <div class="sc-apps" data-r="apps"><span>Applications</span><ul>${p.apps.map((a, k) => `<li style="--i:${k}">${esc(a)}</li>`).join('')}</ul></div>
      <dl class="sc-specs" data-r="specs">${p.specs.map(([k, v], r) => `<div style="--i:${r}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="sc-cta" data-r="cta">
        <a class="btn btn-accent" style="--i:0" href="${p.quote}" aria-label="Request a quote for ${esc(p.name)}">Request a Quote <span class="btn-arrow" aria-hidden="true">→</span></a>
        <a class="sc-link" style="--i:1" href="${detail}" aria-label="Explore specifications and FAQs for ${esc(p.name)}">Explore Specifications &amp; FAQs <span aria-hidden="true">→</span></a>
      </div>
    </div>
    <div class="sc-media" data-r="media"><div class="sc-stage${pic.ratio}">${pic.html}</div></div>
  </div></div>
</article>`;
}

function chapter(catKey) {
  const c = CATS[catKey];
  const count = PRODUCTS.filter((p) => p.cat === catKey).length;
  return `
<div class="sc-chapter" id="${c.id}"><div class="sc-wrap"><div class="sc-chapter-in" data-r="chapter"><b>${c.key}</b><span>${esc(c.name)}</span><span>${count} ${count === 1 ? 'material' : 'materials'}</span></div></div></div>`;
}

function body() {
  const nav = Object.keys(CATS).map((k) => {
    const count = PRODUCTS.filter((p) => p.cat === k).length;
    return `<a href="#${CATS[k].id}" data-r="item" style="--i:${Object.keys(CATS).indexOf(k)}"><span class="cn-k">${CATS[k].key}</span><b>${esc(CAT_NAV_LABEL[k])}</b><span class="cn-ar" aria-hidden="true">↓</span><em>${count} ${count === 1 ? 'material' : 'materials'}</em></a>`;
  }).join('\n        ');

  let showcase = '';
  let last = null;
  PRODUCTS.forEach((p, i) => {
    if (p.cat !== last) {
      if (last === 'road') showcase += '';
      showcase += chapter(p.cat);
      last = p.cat;
    }
    showcase += product(p, i, PRODUCTS.length);
    // road base is a guide to GSB / WMM / graded aggregate, not a separate material, so it follows the road products as a note
    if (i === PRODUCTS.length - 1) {
      showcase += `
<div class="sc-wrap"><aside class="sc-guide" aria-label="Road base material guide">
  <p><b>Road Base Material</b> is a broad category, not one material. Depending on the pavement layer and project specification it means GSB, WMM or a project-specific graded aggregate. Read the guide to see which applies.</p>
  <a class="sc-link" href="/products/road-base-material" aria-label="Read the Road Base guide for road materials">Read the Road Base guide <span aria-hidden="true">→</span></a>
</aside></div>`;
    }
  });

  return `<!--SC:BODY:START (generated by scripts/build-products-showcase.js, do not edit by hand)-->
<main class="sc-main" id="main">
<section class="sc-hero no-motion" aria-labelledby="pageTitle">
  <div class="sc-wrap"><div class="sc-hero-grid">
    <div>
      <span class="eyebrow"><span class="eb-t">Products · Goa</span></span>
      <h1 class="sc-h1 sc-rise" id="pageTitle" style="--i:1">Construction Materials. <em>Engineered for Every Project.</em></h1>
    </div>
    <div>
      <p class="sc-hero-sub sc-rise" style="--i:2">From precision-graded crushed stone aggregates to manufactured sand, ready-mix concrete and road infrastructure materials, OM Group supplies dependable construction materials across North and South Goa.</p>
      <div class="cta-row sc-rise" style="--i:3">
        <a href="/#contact" class="btn btn-accent">Request a Quote <span class="btn-arrow">→</span></a>
        <a href="tel:+919049629684" class="btn btn-ghost">Call OM Group</a>
        <a href="https://wa.me/919049629684?text=Hi%2C%20I%27d%20like%20a%20quote%20for%20construction%20materials." class="btn btn-ghost" target="_blank" rel="noopener">WhatsApp OM Group</a>
      </div>
    </div>
  </div></div>
</section>

<section class="sc-intro no-motion" aria-labelledby="collectionTitle">
  <div class="sc-wrap">
    <div class="sc-intro-grid">
      <div>
        <span class="eyebrow" data-r="eyebrow"><span class="eb-t">The OM Group Material Collection</span></span>
        <h2 id="collectionTitle" data-r="words">${maskWords('Every material has a purpose.')}</h2>
      </div>
      <p class="lede" data-r="desc">${fadeWords('Explore our range of construction materials, each selected, processed or supplied to meet the demands of residential construction, commercial development and large-scale infrastructure.')}</p>
    </div>
    <nav class="sc-catnav" aria-label="Product categories">
        ${nav}
    </nav>
  </div>
</section>

<div class="sc-collection no-motion">${showcase}
</div>
<script>
/* Cinematic entrance. Each marked piece (label, title, description, applications, spec rules, buttons, product, chapter line)
   reveals on its OWN as it scrolls into view, so the sequence cascades with the scroll instead of popping in as one block.
   Pieces already on screen are left alone (no hide-then-show flash). The product waits until its picture is decoded, and
   pictures are fetched ~2.5 screens ahead. Opacity and transform only, no scroll listeners, no scroll hijacking.
   Load cost: setup runs when the browser is idle (only below-the-fold pieces are touched, so nothing can flash) and all positions are
   read in ONE pass before any class is written, so it never forces repeated layouts. */
(function(){
  document.addEventListener('touchstart', function(){}, { passive: true }); // lets :active press effects work on iOS Safari
  if (!('IntersectionObserver' in window)) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pending = function(f){ (window.requestIdleCallback || function(g){ setTimeout(g, 120); })(f, { timeout: 600 }); };
  pending(function(){
    var mods = document.querySelectorAll('.sc');
    var ahead = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var m = e.target, i = m.querySelector('.sc-stage img');
        if (i) i.loading = 'eager';
        ahead.unobserve(m);
      });
    }, { rootMargin: '0px 0px 250% 0px' });
    Array.prototype.forEach.call(mods, function(m){ ahead.observe(m); });
    if (reduce) return;
    var els = document.querySelectorAll('[data-r]');
    if (!els.length) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { io.unobserve(e.target); reveal(e.target); } });
    }, { threshold: 0, rootMargin: (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? '0px 0px 20% 0px' : '0px 0px 10% 0px' });
    function show(el){
      el.classList.add('sc-on');
      // once the entrance has finished, drop the animation state so hover and focus effects behave normally again
      setTimeout(function(){ el.classList.remove('sc-r'); }, 3200);
    }
    function reveal(el){
      var i = el.getAttribute('data-r') === 'media' ? el.querySelector('img') : null;
      if (i && !(i.complete && i.naturalWidth)) { i.loading = 'eager'; (i.decode ? i.decode().catch(function(){}) : Promise.resolve()).then(function(){ show(el); }); setTimeout(function(){ show(el); }, 1000); }
      else show(el);
    }
    var tops = [], k;
    for (k = 0; k < els.length; k++) tops.push(els[k].getBoundingClientRect().top); // single read pass
    for (k = 0; k < els.length; k++) {                                                // then writes
      if (tops[k] < vh * 0.92) continue; // already on screen
      els[k].classList.add('sc-r');
      io.observe(els[k]);
    }
  });
})();
</script>

<section class="sc-fac sec-bone sec no-motion" aria-labelledby="facTitle">
  <div class="sc-wrap">
    <div class="hub-head fade-up" style="margin-bottom:0;max-width:760px">
      <span class="eyebrow">Where Supply Comes From</span>
      <h2 class="sec-title" id="facTitle">Facilities behind <em>the materials.</em></h2>
      <p class="sec-lede">Crushed stone aggregates come from the VSI crushing facility at Banda Wafoli. Ready-mix concrete is batched at the Kundaim and Thivim plants operated by Sabsol Qualitech Industries LLP. Not every group company produces every material, and each product page states how that material is supplied.</p>
    </div>
    <div class="net-grid">
      <div class="net-card fade-up" style="--i:0"><h3><a href="/infrastructure/banda-wafoli-vsi-crusher">Banda Wafoli VSI Crusher</a></h3><p>Crushed stone aggregate production at Wafoli, Banda, Maharashtra.</p></div>
      <div class="net-card fade-up" style="--i:1"><h3><a href="/infrastructure/kundaim-rmc-plant">Kundaim RMC Plant</a></h3><p>Ready-mix concrete batching in Goa.</p></div>
      <div class="net-card fade-up" style="--i:2"><h3><a href="/infrastructure/thivim-rmc-plant">Thivim RMC Plant</a></h3><p>Ready-mix concrete batching in Goa.</p></div>
      <div class="net-card fade-up" style="--i:3"><h3><a href="/infrastructure/fleet-logistics">Fleet &amp; Logistics</a></h3><p>The transport network that carries construction material to site.</p></div>
    </div>
  </div>
</section>
</main>
<!--SC:BODY:END-->`;
}

let html = fs.readFileSync(PAGE, 'utf8');

// 1) body region: first run replaces the old hub sections (hero .. facilities); later runs replace the marked block
const bodyRe = /<!--SC:BODY:START[\s\S]*?<!--SC:BODY:END-->/;
if (bodyRe.test(html)) {
  html = html.replace(bodyRe, () => body());
} else {
  const a = html.indexOf('<section class="hub-hero">');
  const b = html.indexOf('<section class="final-cta">');
  if (a < 0 || b < 0) throw new Error('page layout not recognised');
  html = html.slice(0, a) + body() + '\n\n' + html.slice(b);
}

// 2) css region
const css = fs.readFileSync(CSS, 'utf8');
const cssBlock = `/* SC:CSS:START */\n${css}\n/* SC:CSS:END */`;
const cssRe = /\/\* SC:CSS:START \*\/[\s\S]*?\/\* SC:CSS:END \*\//;
if (cssRe.test(html)) {
  html = html.replace(cssRe, () => cssBlock);
} else {
  const a = html.indexOf('/* ===== PRODUCTS HUB ===== */');
  const b = html.indexOf('</style>', a);
  if (a < 0 || b < 0) throw new Error('css hub block not found');
  // keep the facility-card rules (.net-*) the showcase still uses
  const hub = html.slice(a, b);
  const net = hub.split('\n').filter((l) => /^\.net-|^\.hub-head|^@media \(max-width:1000px\)/.test(l)).join('\n');
  html = html.slice(0, a) + cssBlock + '\n/* facility cards */\n' + net.replace(/\.core-grid\{[^}]*\}/g, '') + '\n' + html.slice(b);
}

fs.writeFileSync(PAGE, html);
console.log('products/index.html rebuilt: ' + PRODUCTS.length + ' products');
