#!/usr/bin/env node
/*
 * SEO / AEO layer for the Applications hub and the application pages.
 * Re-runnable: everything it adds sits between "seo:auto" markers and is replaced on each run,
 * so run it again after any page is regenerated (e.g. scripts/hma/build-hma-page.js).
 *
 *   node scripts/seo/applications-seo.js            write changes
 *   node scripts/seo/applications-seo.js --check    report only
 *
 * What it does (content comes ONLY from what is already visible on each page):
 *  1. FAQPage JSON-LD built from the page's own visible FAQ (<details> inside #faq), wording unchanged.
 *  2. WebPage node: dateModified, primaryImageOfPage (the page's og:image), relatedLink to the product page.
 *  3. Meta descriptions kept within ~155 characters (same facts, shorter wording) where they ran long.
 *  4. A footer "Application guides" link list on every page, so each guide links to all the others.
 *  5. Hub: CollectionPage + ItemList of every guide + BreadcrumbList + FAQPage.
 * It never touches robots (noindex stays until go-live), canonicals, titles' brand suffix or the sitemap.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APPS = path.join(ROOT, 'applications');
const SITE = 'https://www.omgroupco.com';
const CHECK = process.argv.includes('--check');
const TODAY = new Date().toISOString().slice(0, 10);

/* every application guide: slug, short name, matching product page (null = no product page) */
const GUIDES = [
  ['6mm-aggregates', '6mm Aggregate', '/products/6mm-aggregate/'],
  ['10mm-aggregates', '10mm Aggregate', '/products/10mm-aggregate/'],
  ['12-5mm-aggregates', '12.5mm Aggregate', '/products/12mm-aggregate/'],
  ['20mm-aggregates', '20mm Aggregate', '/products/20mm-aggregate/'],
  ['40mm-aggregates', '40mm Aggregate', '/products/40mm-aggregate/'],
  ['60mm-aggregates', '60mm Aggregate', '/products/60mm-aggregate/'],
  ['construction-boulders', 'Construction Boulders', '/products/boulders/'],
  ['m-sand', 'M-Sand', '/products/m-sand/'],
  ['plaster-sand', 'Plaster Sand (P-Sand)', '/products/plaster-sand/'],
  ['concrete-sand', 'Concrete Sand', '/products/concrete-sand/'],
  ['river-sand', 'River Sand', '/products/river-sand/'],
  ['washed-sand', 'Washed Sand', '/products/washed-sand/'],
  ['ready-mix-concrete', 'Ready-Mix Concrete (RMC)', '/products/ready-mix-concrete/'],
  ['granular-sub-base', 'Granular Sub-Base (GSB)', '/products/granular-sub-base/'],
  ['wet-mix-macadam', 'Wet Mix Macadam (WMM)', '/products/wmm/'],
  ['hot-mix-asphalt', 'Hot Mix Asphalt', null],
];

/* shorter descriptions: same facts as the page's original description, within ~155 characters */
const DESC = {
  '6mm-aggregates': '6mm crushed stone aggregate uses in paver blocks, concrete tiles, terrazzo and precast products. Grading, selection and supply in Goa from OM GROUP.',
  '10mm-aggregates': 'Where 10mm crushed stone aggregate is used in RCC, precast concrete and construction, with grading and selection. Supply in Goa from OM GROUP.',
  '12-5mm-aggregates': '12.5mm (12mm) crushed stone aggregate uses in RCC, precast, RMC and specified roadwork. Grading, selection and supply in Goa from OM GROUP.',
  '20mm-aggregates': '20mm crushed stone aggregate uses in RCC slabs, beams, columns, foundations and RMC. Grading, selection and supply in Goa from OM GROUP.',
  '40mm-aggregates': '40mm crushed stone aggregate uses in mass concrete, PCC, foundations and road sub-base. Grading, selection and supply in Goa from OM GROUP.',
  '60mm-aggregates': '60mm crushed stone aggregate uses in drainage, heavy foundations and infrastructure fill. Grading, selection and supply in Goa from OM GROUP.',
  'construction-boulders': 'Construction boulder uses in site development, foundations, embankments, drainage and heavy civil works. Project-specific supply across Goa.',
  'concrete-sand': 'Concrete Sand uses in RCC, RMC, foundations, slabs and precast concrete. IS 383 grading, fine aggregate quality and M-Sand supply in Goa.',
  'granular-sub-base': 'Granular Sub-Base uses in highways, industrial and rural roads. MoRTH Clause 401, GSB grading, CBR, compaction and GSB supply in Goa.',
  'hot-mix-asphalt': 'Hot Mix Asphalt for roads: ingredients, DBM and BC, mix design, batch and drum-mix plants, quality control, paving and compaction.',
  'plaster-sand': 'P-Sand uses in internal, external and ceiling plastering. IS 1542 grading, plaster mortar quality, surface preparation and supply across Goa.',
  'ready-mix-concrete': 'Ready-mix concrete uses in foundations, RCC slabs, beams, columns and infrastructure. Grades, mix design, slump testing and delivery in Goa.',
  'river-sand': 'River Sand uses in concrete, RCC, RMC, masonry and plastering. Grading, silt testing, quality checks and responsible River Sand supply in Goa.',
  'wet-mix-macadam': 'Wet Mix Macadam uses in highways, rural and industrial roads. MoRTH Clause 406, grading, OMC, compaction and WMM aggregate supply in Goa.',
};

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rarr: '→', larr: '←', times: '×', deg: '°', micro: 'µ', le: '≤', ge: '≥', middot: '·', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', minus: '−', plusmn: '±', sup2: '²', sup3: '³', frac12: '½' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] !== undefined ? ENT[e] : m));
const text = html => decode(html.replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|li|div|h\d|tr)>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const ld = obj => '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2).replace(/<\//g, '<\\/') + '\n</script>';

function faqFrom(html) {
  const i = html.search(/<section\b[^>]*\bid="faq"/);
  if (i < 0) return [];
  let end = html.indexOf('<footer', i); if (end < 0) end = html.length;
  const part = html.slice(i, end);
  return [...part.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)]
    .map(m => ({ q: text(m[1]).replace(/^\d+[.)]\s*/, ''), a: text(m[2]) }))
    .filter(x => x.q && x.a);
}

function stripAuto(html) {
  return html.replace(/\n?<!-- seo:auto:start -->[\s\S]*?<!-- seo:auto:end -->/g, '').replace(/\n?\s*<!-- seo:foot:start -->[\s\S]*?<!-- seo:foot:end -->/g, '');
}

function footerBlock(current) {
  const links = GUIDES.filter(g => g[0] !== current).map(g => `        <a href="/applications/${g[0]}/">${g[1]}</a>`).join('\n');
  return `\n      <!-- seo:foot:start -->\n      <nav class="foot-nav" aria-label="Application guides">\n        <span class="foot-nav-label">Application guides</span>\n${links}\n      </nav>\n      <!-- seo:foot:end -->`;
}

function addFooter(html, current) {
  const m = html.match(/<nav class="foot-nav" aria-label="Products">[\s\S]*?<\/nav>/);
  if (!m) return { html, ok: false };
  return { html: html.replace(m[0], m[0] + footerBlock(current)), ok: true };
}

function setMeta(html, oldDesc, newDesc) {
  if (!newDesc || oldDesc === newDesc) return html;
  const o = attr(oldDesc), n = attr(newDesc);
  html = html.replace(`<meta name="description" content="${o}"`, `<meta name="description" content="${n}"`);
  html = html.split(`property="og:description" content="${o}"`).join(`property="og:description" content="${n}"`);
  html = html.split(`name="twitter:description" content="${o}"`).join(`name="twitter:description" content="${n}"`);
  return html;
}

function editWebPage(html, url, ogImage, productPath, newDesc, oldDesc) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (whole, body) => {
    let data; try { data = JSON.parse(body); } catch (e) { return whole; }
    const nodes = data['@graph'] || [data];
    const wp = nodes.find(n => n && n['@type'] === 'WebPage' && (n.url === url || n['@id'] === url + '#webpage'));
    if (!wp) return whole;
    wp.dateModified = TODAY;
    if (ogImage) wp.primaryImageOfPage = { '@type': 'ImageObject', url: ogImage };
    if (productPath) wp.relatedLink = SITE + productPath;
    if (newDesc && wp.description === oldDesc) wp.description = newDesc;
    return ld(data);
  });
}

const report = [];
for (const [slug, name, productPath] of GUIDES) {
  const file = path.join(APPS, slug, 'index.html');
  if (!fs.existsSync(file)) { report.push(`MISSING ${slug}`); continue; }
  const before = fs.readFileSync(file, 'utf8');
  let html = stripAuto(before);
  const url = SITE + '/applications/' + slug;
  const oldDesc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const ogImage = (html.match(/property="og:image" content="([^"]*)"/) || [])[1] || '';
  const faqs = faqFrom(html);
  const newDesc = DESC[slug] && DESC[slug] !== oldDesc ? DESC[slug] : null;
  const prevDesc = (before.match(/<!-- seo:desc-was "([^"]*)" -->/) || [])[1];

  if (newDesc) html = setMeta(html, oldDesc, newDesc);
  html = editWebPage(html, url, ogImage, productPath, newDesc, oldDesc);

  const blocks = [];
  if (faqs.length) blocks.push(ld({ '@context': 'https://schema.org', '@type': 'FAQPage', '@id': url + '#faq', url, isPartOf: { '@id': url + '#webpage' }, inLanguage: 'en-IN', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }));
  if (blocks.length) html = html.replace('</head>', `<!-- seo:auto:start -->\n${blocks.join('\n')}\n<!-- seo:auto:end -->\n</head>`);
  const f = addFooter(html, slug); html = f.html;

  const finalDesc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  report.push(`${slug.padEnd(22)} faq:${String(faqs.length).padStart(2)}  desc:${finalDesc.length}${newDesc ? ' (shortened)' : ''}  footer:${f.ok ? 'yes' : 'NO'}  ${before === html ? 'unchanged' : 'changed'}`);
  if (!CHECK && before !== html) fs.writeFileSync(file, html);
}

/* hub */
{
  const file = path.join(APPS, 'index.html');
  const before = fs.readFileSync(file, 'utf8');
  let html = stripAuto(before);
  const url = SITE + '/applications';
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const ogImage = (html.match(/property="og:image" content="([^"]*)"/) || [])[1] || '';
  const faqs = faqFrom(html);
  const graph = [
    { '@type': 'CollectionPage', '@id': url + '#webpage', url, name: title, description: desc, inLanguage: 'en-IN', dateModified: TODAY,
      isPartOf: { '@id': SITE + '/#website' }, publisher: { '@id': SITE + '/#organization' }, breadcrumb: { '@id': url + '#breadcrumb' },
      ...(ogImage ? { primaryImageOfPage: { '@type': 'ImageObject', url: ogImage } } : {}), mainEntity: { '@id': url + '#guides' } },
    { '@type': 'ItemList', '@id': url + '#guides', name: 'Construction material application guides', numberOfItems: GUIDES.length,
      itemListElement: GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g[1] + ' applications', url: SITE + '/applications/' + g[0] })) },
    { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Applications', item: url } ] },
  ];
  if (faqs.length) graph.push({ '@type': 'FAQPage', '@id': url + '#faq', url, isPartOf: { '@id': url + '#webpage' }, inLanguage: 'en-IN', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  html = html.replace('</head>', `<!-- seo:auto:start -->\n${ld({ '@context': 'https://schema.org', '@graph': graph })}\n<!-- seo:auto:end -->\n</head>`);
  const f = addFooter(html, null); html = f.html;
  report.push(`${'hub'.padEnd(22)} faq:${String(faqs.length).padStart(2)}  guides:${GUIDES.length}  footer:${f.ok ? 'yes' : 'NO'}  ${before === html ? 'unchanged' : 'changed'}`);
  if (!CHECK && before !== html) fs.writeFileSync(file, html);
}

console.log((CHECK ? '[check] ' : '') + report.join('\n'));
