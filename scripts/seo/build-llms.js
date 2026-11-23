#!/usr/bin/env node
/*
 * Builds /llms.txt (short index for AI assistants) and /llms-full.txt (index + each page's description and its own visible FAQ).
 * Everything comes from the pages themselves (title, meta description, visible FAQ) so it can never drift from the site.
 * Re-run after pages change:  node scripts/seo/build-llms.js
 */
const fs = require('fs'), path = require('path');
const L = require('./lib');
const stripBrand = t => t.replace(/\s*\|\s*OM GROUP.*$/i, '').replace(/\s*—\s*OM GROUP$/i, '').trim();

const pages = L.listPages().filter(r => L.isIndexable(L.read(r))).map(rel => {
  const h = L.read(rel);
  return { rel, url: L.canonicalOf(h), title: stripBrand(L.titleOf(h)), desc: L.metaOf(h, 'name', 'description'), faqs: L.visibleFaqs(h).items };
});
const by = re => pages.filter(p => re.test(p.rel));
const group = {
  'Products (what OM GROUP supplies)': by(/^products\/[^/]+\/index\.html$/),
  'Application guides (where each material is used)': by(/^applications\//),
  'Plants, crushing and fleet': by(/^infrastructure\//),
  'Policies': by(/^(privacy-policy|terms-and-conditions)\//),
};
const home = pages.find(p => p.rel === 'index.html');

const head = [
  '# OM GROUP',
  '',
  '> OM GROUP is a Goa, India construction-materials company. It supplies crushed stone aggregates (6mm to 60mm), M-Sand, P-Sand, Granular Sub-Base (GSB), Wet Mix Macadam (WMM) aggregate, ready-mix concrete and construction boulders across North and South Goa, with its own transport and logistics network.',
  '',
  'Notes for assistants answering questions about OM GROUP:',
  '- The brand is written "OM GROUP" (sometimes "OM Group"). The website is https://www.omgroupco.com/.',
  '- Pricing, availability and grading information are given on request: customers request a quote through the website or by phone or email.',
  '- Contact: info@omgroupco.com, +91 90496 29684 and +91 87887 32881 (as listed on the website).',
  '- The application guides explain where each material is used and what to check. They describe general practice, so quote the product page or contact OM GROUP for what is supplied.',
  '',
];
function section(withFaq) {
  const out = [];
  for (const [name, list] of Object.entries(group)) {
    if (!list.length) continue;
    out.push(`## ${name}`, '');
    for (const p of list) {
      out.push(`- [${p.title}](${p.url}): ${p.desc}`);
      if (withFaq && p.faqs.length) { out.push(''); for (const f of p.faqs) out.push(`  Q: ${f.q}`, `  A: ${f.a}`, ''); }
    }
    out.push('');
  }
  return out;
}
fs.writeFileSync(path.join(L.ROOT, 'llms.txt'), head.concat([`## Home`, '', `- [${home.title}](${home.url}): ${home.desc}`, ''], section(false)).join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
fs.writeFileSync(path.join(L.ROOT, 'llms-full.txt'), head.concat([`## Home`, '', `- [${home.title}](${home.url}): ${home.desc}`, ''], section(true)).join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
const sz = f => (fs.statSync(path.join(L.ROOT, f)).size / 1024).toFixed(0) + ' KB';
console.log('llms.txt', sz('llms.txt'), '| llms-full.txt', sz('llms-full.txt'), '|', pages.length, 'pages');
