const L = require('../lib');
const { pic, fig, esc, ctaRow, cta, MSG } = L;

const URL = 'https://www.omgroupco.com/applications/hot-mix-asphalt';
const SOCIAL = 'https://www.omgroupco.com/img/applications/hot-mix-asphalt/om-group-hot-mix-asphalt-road-construction-social.jpg';
const TITLE = 'Hot Mix Asphalt: DBM, BC, Plant Process and Paving | OM GROUP';
const DESC = 'Understand Hot Mix Asphalt for road construction: ingredients, DBM and BC, mix design, batch and drum-mix plants, quality control, transport, paving and compaction.';

const TOC = [['quick-answer', 'Quick answer'], ['answers', 'Direct answers'], ['product', 'The product'], ['ingredients', 'Ingredients'], ['types', 'Mix types'], ['pavement', 'DBM vs BC'], ['binder', 'Binder'], ['grading', 'Grading'], ['jmf', 'Mix design'], ['plant', 'The plant'], ['batch-drum', 'Batch vs drum'], ['process', '26 stages'], ['goa', 'Goa PWD plants'], ['quality', 'Quality control'], ['temperature', 'Temperature'], ['transport', 'Transport'], ['preparation', 'Road preparation'], ['paving', 'Paving'], ['compaction', 'Compaction'], ['finished', 'Finished road'], ['defects', 'Defects'], ['applications', 'Applications'], ['compare', 'Comparisons'], ['standards', 'Standards and spec'], ['quantity', 'Quantity'], ['why-om', 'Why OM GROUP'], ['order', 'How to enquire'], ['faq', 'FAQ'], ['enquire', 'Enquire']];

const KIN = 'HOT MIX ASPHALT'.split('').map((c, i) => c === ' ' ? `<span class="sp" aria-hidden="true" style="--i:${i}"></span>` : `<span aria-hidden="true" style="--i:${i}">${c}</span>`).join('');

const GTM_HEAD = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KPTCD4S2');</script>
<!-- End Google Tag Manager -->`;

const CSS = ['applications', 'application-page', 'application-ink', 'application-6mm', 'application-scenes', 'application-125', 'application-20', 'application-40', 'application-lab3d', 'application-process3d', 'application-s3d', 'application-60', 'application-msand', 'application-rsand', 'application-csand', 'application-wmm', 'application-type', 'application-wipe', 'application-hma'];

function top() {
  const heroAlt = 'An asphalt mixing plant with aggregate stockpiles, a tipper truck, an asphalt paver and a roller working on a fresh black road surface';
  return `<!doctype html>
<html lang="en-IN">
<head>
${GTM_HEAD}
<meta charset="utf-8" />
<meta http-equiv="x-ua-compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
<meta name="format-detection" content="telephone=no" />
<title>${TITLE}</title>
<meta name="description" content="${esc(DESC)}" />
<!-- TEMPORARY TEST BUILD (local only): noindex until the owner approves go-live AND confirms OM GROUP's actual Hot Mix arrangement (see scripts/hma/lib.js, HMA.verified).
     State B copy: educational wording only, no supplier or manufacturer claim, no Product schema. -->
<meta name="robots" content="noindex, nofollow" />
<link rel="canonical" href="${URL}" />
<meta name="theme-color" content="#F15A29" />
<link rel="preload" as="image" type="image/avif" href="/img/applications/hot-mix-asphalt/hot-mix-asphalt-road-construction-1000.avif" imagesrcset="/img/applications/hot-mix-asphalt/hot-mix-asphalt-road-construction-640.avif 640w, /img/applications/hot-mix-asphalt/hot-mix-asphalt-road-construction-1000.avif 1000w, /img/applications/hot-mix-asphalt/hot-mix-asphalt-road-construction-1600.avif 1600w" imagesizes="(max-width:899px) 92vw, 52vw" />
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://fonts.gstatic.com" />
<link rel="dns-prefetch" href="https://www.googletagmanager.com" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
${CSS.map(c => `<link rel="stylesheet" href="/assets/${c}.css" />`).join('\n')}

<meta property="og:type" content="website" />
<meta property="og:url" content="${URL}" />
<meta property="og:title" content="Hot Mix Asphalt for Roads &amp; Infrastructure | OM GROUP" />
<meta property="og:description" content="Understand Hot Mix Asphalt ingredients, DBM and BC, manufacturing, quality control, transport, paving and compaction through detailed engineering explanations." />
<meta property="og:image" content="${SOCIAL}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${esc(heroAlt)}" />
<meta property="og:site_name" content="OM GROUP" />
<meta property="og:locale" content="en_IN" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Hot Mix Asphalt for Roads &amp; Infrastructure | OM GROUP" />
<meta name="twitter:description" content="Understand Hot Mix Asphalt ingredients, DBM and BC, manufacturing, quality control, transport, paving and compaction." />
<meta name="twitter:image" content="${SOCIAL}" />
<meta name="twitter:image:alt" content="${esc(heroAlt)}" />

<!-- State B: WebPage + BreadcrumbList only. No Product entity, price, availability, rating or certification until the owner confirms the Hot Mix arrangement. -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "${URL}#webpage",
      "url": "${URL}",
      "name": "Hot Mix Asphalt for Road Construction and Infrastructure | OM GROUP",
      "description": "${esc(DESC)}",
      "inLanguage": "en-IN",
      "isPartOf": { "@id": "https://www.omgroupco.com/#website" },
      "about": { "@type": "Thing", "name": "Hot Mix Asphalt" },
      "publisher": { "@id": "https://www.omgroupco.com/#organization" },
      "breadcrumb": { "@id": "${URL}#breadcrumb" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "${URL}#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.omgroupco.com/" },
        { "@type": "ListItem", "position": 2, "name": "Applications", "item": "https://www.omgroupco.com/applications" },
        { "@type": "ListItem", "position": 3, "name": "Hot Mix Asphalt", "item": "${URL}" }
      ]
    }
  ]
}
</script>
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KPTCD4S2" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip-link" href="#main">Skip to content</a>

<header class="nav" id="siteNav">
  <div class="wrap nav-row">
    <a href="/" class="brand-logo" aria-label="OM GROUP home">
      <img src="/assets/om-group-logo-header.png" alt="OM GROUP" width="100" height="101" decoding="async" />
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a href="/products">Products</a>
      <a href="/applications" aria-current="page">Applications</a>
      <a href="/#infrastructure">Infrastructure</a>
      <a href="/#about">About</a>
      <a href="/#contact">Contact</a>
    </nav>
    <div class="nav-actions">
      <a href="tel:+919049629684" class="nav-phone" data-ev="call_click" data-loc="header">+91-9049629684</a>
      <a href="/#contact" class="btn btn-accent btn-sm" data-ev="hero_cta_click" data-button="header_request_quote">Request a Quote</a>
    </div>
  </div>
</header>

<main id="main">

<!-- 01. HERO -->
<section class="ap-hero hma-hero" id="hero" aria-labelledby="pageTitle">
  <div class="wrap">
    <nav class="ap-crumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/applications">Applications</a></li><li aria-current="page">Hot Mix Asphalt</li></ol></nav>
    <div class="ap-hero-grid">
      <div>
        <p class="ap-kicker">Road construction / Bituminous pavement / Hot Mix Asphalt</p>
        <p class="ap6-kin" role="img" aria-label="HOT MIX ASPHALT">${KIN}</p>
        <h1 id="pageTitle">Hot Mix Asphalt for <em>Road Construction &amp; Infrastructure</em></h1>
        <p class="ap-hero-lead"><strong>Engineered bituminous mixtures for specified pavement construction.</strong> Hot Mix Asphalt is a carefully proportioned mixture of crushed aggregates, mineral filler and bituminous binder, produced through a controlled heating and mixing process.</p>
        <p>Used in specified road pavement layers, Hot Mix is transported to the construction site, laid with suitable paving equipment and compacted to achieve the required pavement profile and density.</p>
        <p>From aggregate selection and binder proportions to plant production, temperature control and field compaction, every stage contributes to the performance of the finished road. Explore how Hot Mix Asphalt is manufactured, tested and used in modern road construction.</p>
        <div class="cta-row">
          <a href="#process" class="btn btn-accent" data-ev="hot_mix_process_interaction" data-loc="hero_explore">Explore the Manufacturing Process <span class="btn-arrow" aria-hidden="true">↓</span></a>
          ${cta(MSG.req, 'hot_mix_quote_click', 'hero', 'Discuss Your Hot Mix Requirement', 'btn-ghost', false)}
        </div>
        <p class="ap-small" style="margin-top:14px"><a class="ap-link" href="/?category=Stone%20Aggregates&amp;message=${L.enc(MSG.spec)}#contact" data-ev="hot_mix_quote_click" data-loc="hero_spec">Submit your mix specification</a></p>
        <p class="psd-warn" role="note" style="margin-top:18px"><strong>An educational guide to Hot Mix Asphalt.</strong> It explains the material, the plant and the road works. It does not state that OM GROUP manufactures or supplies Hot Mix; availability and supply arrangements are confirmed per enquiry.</p>
      </div>
      <div class="ap-hero-media hma-hero-media">
        ${fig('hot-mix-asphalt-road-construction', 'Plant, tipper, paver and roller: the Hot Mix chain', heroAlt, { eager: true, rv: false, sizes: '(max-width:899px) 92vw, 52vw', cls: 'hma-hero-ph' })}
      </div>
    </div>
    <ul class="ap125-facts" aria-label="At a glance">
      <li><b>4</b><span>Essential ingredients</span><p>Coarse aggregate, fine aggregate, mineral filler and bituminous binder.</p></li>
      <li><b>2</b><span>Plant configurations</span><p>Batch-type and drum-mix, explained separately.</p></li>
      <li><b>26</b><span>Stages, stockpile to finished road</span><p>Each one explained in order.</p></li>
      <li><b>JMF</b><span>The approved Job Mix Formula</span><p>The reference for every proportion. No figures are invented here.</p></li>
    </ul>
    <div class="ap125-jump">
      <a href="#plant" data-ev="hot_mix_process_interaction" data-loc="indicator">${pic('asphalt-mixing-plant-overview', 'A batch-type asphalt mixing plant with cold-feed bins, rotary dryer, dust collector, mixing tower and bitumen tanks', { sizes: '(max-width:899px) 92vw, 360px' })}<span><strong>How it is made</strong><small>The plant, stage by stage</small></span></a>
      <a href="#paving" data-ev="hot_mix_process_interaction" data-loc="indicator">${pic('asphalt-paver-hot-mix-laying', 'An asphalt paver and screed laying a fresh Hot Mix Asphalt mat', { sizes: '(max-width:899px) 92vw, 360px' })}<span><strong>How it is laid</strong><small>Paver, screed and rollers</small></span></a>
      <a href="#quality" data-ev="hot_mix_process_interaction" data-loc="indicator">${pic('asphalt-pavement-core-sampling', 'A technician drilling a core sample from a compacted asphalt road surface', { sizes: '(max-width:899px) 92vw, 360px' })}<span><strong>How it is checked</strong><small>Tests, cores and acceptance</small></span></a>
    </div>
    <p class="ap-small" style="margin-top:18px">The pictures show a typical asphalt plant and road works. They are not OM GROUP facilities, and no capacity, mix proportion, temperature or test result is shown.</p>
  </div>
</section>

<!-- JUMP BAR -->
<nav class="ap-toc" id="toc" aria-label="On this page">
  <ul>
${TOC.map(([id, t]) => `    <li><a href="#${id}">${t}</a></li>`).join('\n')}
  </ul>
  <div class="ap-progress" id="apProgress" aria-hidden="true"></div>
</nav>
`;
}
module.exports = { top, URL, TITLE, DESC, SOCIAL, TOC };
