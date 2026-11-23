#!/usr/bin/env node
/*
 * Site-wide SEO / AEO / GEO pass. Edits ONLY <head> tags and JSON-LD blocks, never visible page markup
 * (prove it with: node scripts/seo/guard.js snapshot <file>  ...run this...  node scripts/seo/guard.js check <file>).
 * Re-runnable: every change is "set if different", so a second run changes nothing.
 *
 *   node scripts/seo/og-cards.js        (once, makes img/og/*.jpg + scripts/seo/og-map.json)
 *   node scripts/seo/seo-pass.js [--check] [--root <other-repo-folder>]
 *
 * Application pages are owned by scripts/seo/applications-seo.js (FAQ, WebPage, footer links); this script only
 * normalises their robots/name meta so it never fights that one.
 */
const fs = require('fs'), path = require('path');
const sharp = require('sharp');
const L = require('./lib');
const { SITE } = L;
const CHECK = process.argv.includes('--check');
const rootArg = process.argv.indexOf('--root');
const ROOT = rootArg > -1 ? path.resolve(process.argv[rootArg + 1]) : L.ROOT;
const SANDBOX_HOME_ONLY = rootArg > -1;           // the sandbox copy only has the homepage
const OGMAP = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'scripts/seo/og-map.json'), 'utf8'));
const ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

/* ---- copy edits: same facts as before, shortened so Google shows them whole (<=160 chars / <=65 chars) ---- */
const TITLE = {
  'index.html': ['OM GROUP | Crushed Stone Aggregate, RMC & Construction Materials Company in Goa'.replace('Company ', ''), null],
  'infrastructure/sancoale-rmc-plant/index.html': 'Sancoale Infrastructure Base in South Goa | OM GROUP',
  'infrastructure/banda-wafoli-vsi-crusher/index.html': 'Banda Wafoli VSI Crusher in Maharashtra | OM GROUP',
  'products/boulders/index.html': 'Boulder Supplier in Goa: Construction, Pitching, Soling | OM GROUP',
};
TITLE['index.html'] = 'OM GROUP | Crushed Stone Aggregate & RMC Supplier in Goa';
const DESC = {
  'index.html': 'OM GROUP supplies crushed stone aggregates, M-Sand, P-Sand, GSB, WMM and ready-mix concrete, with logistics and transport, across Goa. Request a quote today.',
  'products/10mm-aggregate/index.html': 'OM GROUP supplies 10mm crushed stone aggregate across North and South Goa for RCC, precast and concrete work, from its own crushing operation. Request a quote.',
  'products/12mm-aggregate/index.html': 'OM GROUP supplies 12.5mm crushed stone aggregate, commonly sold as 12mm, across North and South Goa for RCC, precast and road work. Request a quote.',
  'products/20mm-aggregate/index.html': 'OM GROUP supplies 20mm crushed stone aggregate across North and South Goa for RCC slabs, beams, columns and RMC. Order in brass, cubic metres or tonnes.',
  'products/40mm-aggregate/index.html': 'OM GROUP supplies 40mm crushed stone aggregate across North and South Goa for mass concrete, PCC, foundations and road sub-base. Request a quote.',
  'products/60mm-aggregate/index.html': 'OM GROUP supplies 60mm large-size crushed stone aggregate across North and South Goa for heavy foundations, drainage and mass concrete. Request a quote.',
  'products/6mm-aggregate/index.html': 'OM GROUP supplies 6mm crushed stone aggregate across North and South Goa for paver blocks, tiles, precast and finishing work. Request a quote.',
  'products/boulders/index.html': 'OM GROUP supplies construction, pitching, soling and gabion boulders across Goa for road, civil and infrastructure projects. Request bulk pricing.',
  'products/concrete-sand/index.html': 'OM GROUP supplies concrete-grade M-Sand across North and South Goa, graded to project needs and IS 383:2016. Request current pricing and specifications.',
  'products/granular-sub-base/index.html': 'OM GROUP manufactures and supplies Granular Sub-Base (GSB) across Goa for roads and infrastructure, matched to MoRTH Clause 401. Request a quote.',
  'products/m-sand/index.html': 'OM GROUP supplies M-Sand, manufactured sand graded as fine aggregate for concrete, RCC and masonry, across North and South Goa. Request a quote.',
  'products/plaster-sand/index.html': 'OM GROUP manufactures and supplies Plaster Sand (P-Sand) in Goa for wall and ceiling plastering, produced for IS 1542:1992 grading. Request a quote.',
  'products/ready-mix-concrete/index.html': 'OM GROUP supplies Ready Mix Concrete across North and South Goa in M20 to M45 grades, with M60 and other high-strength grades on request.',
  'products/river-sand/index.html': 'OM GROUP supplies quality-focused River Sand, sourced through verified suppliers, for construction projects across North and South Goa. Request a quote.',
  'products/road-base-material/index.html': 'OM GROUP supplies road construction materials across Goa, including GSB, WMM aggregate and graded aggregates for infrastructure. Request a quote.',
  'products/washed-sand/index.html': 'OM GROUP supplies washed sand across North and South Goa, with current grading and specification information on request. Request a quote.',
  'products/wmm/index.html': 'OM GROUP supplies crushed, graded aggregate for Wet Mix Macadam (WMM) across Goa, matched to MoRTH Clause 406 and project specifications. Request a quote.',
  'products/index.html': 'Browse OM GROUP construction materials for Goa: 10mm and 20mm aggregates, GSB, M-Sand, P-Sand and ready-mix concrete. Specifications, FAQs and quotes.',
  'infrastructure/banda-wafoli-vsi-crusher/index.html': "OM GROUP's Banda Wafoli VSI Crusher in Maharashtra combines 250 TPH installed capacity with a wider aggregate supply network. Request a quote.",
  'infrastructure/fleet-logistics/index.html': "Own a truck, tipper or commercial vehicle in Goa? Connect with OM GROUP's construction-material transport network and explore vehicle partnerships.",
  'infrastructure/kundaim-rmc-plant/index.html': "OM GROUP's Kundaim RMC Plant supplies ready-mix concrete in Goa, batched on Schwing Stetter infrastructure rated at 120 m³/hour. Request a quote.",
  'infrastructure/sancoale-rmc-plant/index.html': "OM GROUP's Sancoale base in South Goa is a Heavy Machines deployment base. For confirmed ready-mix concrete supply, see the Kundaim and Thivim RMC Plants.",
  'infrastructure/thivim-rmc-plant/index.html': "OM GROUP's Thivim RMC Plant supplies ready-mix concrete in Goa, batched on Putzmeister infrastructure rated at 140 m³/hour. Request a quote.",
  'privacy-policy/index.html': 'How OM GROUP collects, uses and protects personal information provided through its website, including enquiry and job application data.',
};
for (const [k, v] of Object.entries(DESC)) if (v.length > 160) throw new Error(`description too long (${v.length}) ${k}`);
for (const [k, v] of Object.entries(TITLE)) if (typeof v === 'string' && v.length > 68) throw new Error(`title too long (${v.length}) ${k}`);

/* product page -> its application guide (for subjectOf) */
const APP_OF = { '10mm-aggregate': '10mm-aggregates', '12mm-aggregate': '12-5mm-aggregates', '20mm-aggregate': '20mm-aggregates', '40mm-aggregate': '40mm-aggregates', '60mm-aggregate': '60mm-aggregates', '6mm-aggregate': '6mm-aggregates', boulders: 'construction-boulders', 'concrete-sand': 'concrete-sand', 'granular-sub-base': 'granular-sub-base', 'm-sand': 'm-sand', 'plaster-sand': 'plaster-sand', 'ready-mix-concrete': 'ready-mix-concrete', 'river-sand': 'river-sand', 'washed-sand': 'washed-sand', wmm: 'wet-mix-macadam' };
/* product pages that had no Product node at all (only a breadcrumb): name/category come from the page's own title */
const NEW_PRODUCT = { 'concrete-sand': { name: 'Concrete Sand', category: 'Fine Aggregate' }, 'washed-sand': { name: 'Washed Sand', category: 'Fine Aggregate' } };
/* plant pages: place facts taken from each page's own title / description / FAQ */
const PLACE = {
  'kundaim-rmc-plant': { name: 'Kundaim RMC Plant', locality: 'Kundaim', region: 'Goa' },
  'thivim-rmc-plant': { name: 'Thivim RMC Plant', locality: 'Thivim', region: 'Goa' },
  'sancoale-rmc-plant': { name: 'Sancoale infrastructure base', locality: 'Sancoale', region: 'Goa' },
  'banda-wafoli-vsi-crusher': { name: 'Banda Wafoli VSI Crusher', locality: 'Wafoli, Banda', region: 'Maharashtra' },
};

const stats = { pages: 0, changed: 0, notes: [] };
const ldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
const pretty = o => JSON.stringify(o, null, 2);
const nodeTypes = n => [].concat(n['@type'] || []);
const isType = (n, re) => nodeTypes(n).some(t => re.test(t));
function withId(node, id) { if (node['@id']) return node; const { '@type': t, ...rest } = node; return { '@type': t, '@id': id, ...rest }; }
function put(node, key, val) { if (JSON.stringify(node[key]) !== JSON.stringify(val)) { node[key] = val; return true; } return false; }

async function imgSize(urlPath) {
  const f = path.join(L.ROOT, urlPath.replace(/^\//, '')); if (!fs.existsSync(f)) return null;
  const m = await sharp(f).metadata(); return { w: m.width, h: m.height };
}

async function processPage(rel) {
  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8'); const orig = html;
  if (!L.isIndexable(html)) return;
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const url = L.canonicalOf(html);
  const isHome = rel === 'index.html', isProduct = /^products\/[^/]+\/index\.html$/.test(rel), isApp = rel.startsWith('applications/'), isInfra = rel.startsWith('infrastructure/');
  const slug = rel.split('/')[1];

  /* 1. title + description edits (head tags, og/twitter twins, and any JSON-LD that repeated the old text) */
  const oldTitle = L.titleOf(html), oldDesc = L.metaOf(html, 'name', 'description');
  const newTitle = typeof TITLE[rel] === 'string' ? TITLE[rel] : oldTitle, newDesc = DESC[rel] || oldDesc;
  if (newTitle !== oldTitle) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${L.escAttr(newTitle).replace(/&quot;/g, '"')}</title>`);
    for (const k of ['og:title']) html = html.replace(new RegExp(`(<meta\\s+property="${k}"\\s+content=")[^"]*(")`), `$1${L.escAttr(newTitle)}$2`);
    html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${L.escAttr(newTitle)}$2`);
  }
  if (newDesc !== oldDesc) {
    html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${L.escAttr(newDesc)}$2`);
    html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${L.escAttr(newDesc)}$2`);
    html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${L.escAttr(newDesc)}$2`);
  }

  /* 2. robots, name signals, social image */
  html = html.replace(/(<meta\s+name="robots"\s+content=")index, follow[^"]*(")/, `$1${ROBOTS}$2`);
  const extra = [];
  if (!/name="application-name"/.test(html)) extra.push('<meta name="application-name" content="OM GROUP" />');
  if (!/name="apple-mobile-web-app-title"/.test(html)) extra.push('<meta name="apple-mobile-web-app-title" content="OM GROUP" />');
  if (isHome && !/name="geo.region"/.test(html)) extra.push('<meta name="geo.region" content="IN-GA" />', '<meta name="geo.placename" content="Goa" />');
  if (extra.length) html = html.replace(/(<meta\s+name="robots"[^>]*>)/, `$1${eol}${extra.join(eol)}`);

  let ogSize = null, ogUrl = L.metaOf(html, 'property', 'og:image');
  const card = OGMAP[rel];
  if (card) {
    ogUrl = SITE + card; ogSize = await imgSize(card);
    html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/, `$1${ogUrl}$2`);
    html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/, `$1${ogUrl}$2`);
    html = html.replace(/(<meta\s+property="og:image:type"\s+content=")[^"]*(")/, '$1image/jpeg$2');
    html = html.replace(/<meta\s+property="og:image:(width|height)"[^>]*>\s*/g, '');
    const add = [];
    if (!/og:image:type/.test(html)) add.push('<meta property="og:image:type" content="image/jpeg" />');
    if (ogSize) add.push(`<meta property="og:image:width" content="${ogSize.w}" />`, `<meta property="og:image:height" content="${ogSize.h}" />`);
    html = html.replace(/(<meta\s+property="og:image"[^>]*>)/, `$1${eol}${add.join(eol)}`);
  } else {
    ogSize = await imgSize(ogUrl.replace(SITE, ''));
    if (ogSize && !/og:image:width/.test(html)) html = html.replace(/(<meta\s+property="og:image"[^>]*>)/, `$1${eol}<meta property="og:image:width" content="${ogSize.w}" />${eol}<meta property="og:image:height" content="${ogSize.h}" />`);
  }

  /* 3. structured data (application pages are handled by applications-seo.js) */
  if (!isApp && !SANDBOX_HOME_ONLY || isHome) {
    const blocks = []; let m; ldRe.lastIndex = 0;
    while ((m = ldRe.exec(html))) blocks.push({ start: m.index, end: m.index + m[0].length, json: JSON.parse(m[1]) });
    let main = blocks.find(b => Array.isArray(b.json['@graph']));
    /* a page whose only JSON-LD is a bare BreadcrumbList: lift it into a @graph so the other nodes can join it */
    if (!main && !isApp) { const bb = blocks.find(b => b.json['@type'] === 'BreadcrumbList'); if (bb) { const { '@context': ctx, ...node } = bb.json; bb.json = { '@context': ctx || 'https://schema.org', '@graph': [node] }; main = bb; } }
    if (main) {
      const g = main.json['@graph']; const title = newTitle, desc = newDesc;
      /* repeat the new title/description inside any node that carried the old one */
      for (const n of g) { if (isType(n, /Page$/)) { if (n.name === oldTitle && oldTitle !== newTitle) n.name = newTitle; if (n.description === oldDesc && oldDesc !== newDesc) n.description = newDesc; } }
      const bc = g.find(n => n['@type'] === 'BreadcrumbList');
      const bcI = bc ? g.indexOf(bc) : -1; if (bc) g[bcI] = withId(bc, `${url}#breadcrumb`);
      let wp = g.find(n => isType(n, /Page$/));
      const dateMod = L.lastmod(rel);
      const primary = ogSize ? { '@type': 'ImageObject', url: ogUrl, width: ogSize.w, height: ogSize.h } : { '@type': 'ImageObject', url: ogUrl };
      if (!wp) {
        wp = { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description: desc, inLanguage: 'en-IN', isPartOf: { '@id': `${SITE}/#website` }, publisher: { '@id': `${SITE}/#organization` } };
        g.push(wp);
      }
      if (DESC[rel]) put(wp, 'description', desc);
      if (typeof TITLE[rel] === 'string') put(wp, 'name', title);
      if (bc) put(wp, 'breadcrumb', { '@id': `${url}#breadcrumb` });
      put(wp, 'primaryImageOfPage', primary); put(wp, 'dateModified', dateMod); put(wp, 'inLanguage', 'en-IN');
      if (!wp.publisher) wp.publisher = { '@id': `${SITE}/#organization` };
      if (!wp.isPartOf) wp.isPartOf = { '@id': `${SITE}/#website` };

      if (isHome) {
        wp['@id'] = `${SITE}/#webpage`; put(wp, 'about', { '@id': `${SITE}/#organization` });
        const org = g.find(n => isType(n, /^Organization$/));
        if (org) {
          put(org, 'slogan', 'A Foundation of Trust');
          put(org, 'mainEntityOfPage', { '@id': `${SITE}/#webpage` });
          put(org, 'areaServed', [{ '@type': 'State', name: 'Goa' }, { '@type': 'AdministrativeArea', name: 'North Goa' }, { '@type': 'AdministrativeArea', name: 'South Goa' }]);
          put(org, 'knowsAbout', ['Crushed stone aggregate', 'M-Sand (manufactured sand)', 'P-Sand (plaster sand)', 'Granular Sub-Base (GSB)', 'Wet Mix Macadam (WMM)', 'Ready-mix concrete (RMC)', 'Construction boulders', 'Construction-material transport and logistics']);
        }
        const ws = g.find(n => n['@type'] === 'WebSite'); if (ws) put(ws, 'about', { '@id': `${SITE}/#organization` });
      }
      if (isProduct && !g.some(n => n['@type'] === 'Product') && NEW_PRODUCT[slug]) {
        g.push({ '@type': 'Product', name: NEW_PRODUCT[slug].name, category: NEW_PRODUCT[slug].category, description: desc, image: ogUrl, url, brand: { '@type': 'Brand', name: 'OM GROUP' } });
      }
      if (isProduct) {
        const prod = g.find(n => n['@type'] === 'Product');
        if (prod) {
          const i = g.indexOf(prod); g[i] = withId(prod, `${url}#product`); const p = g[i];
          put(p, 'mainEntityOfPage', { '@id': wp['@id'] });
          put(wp, 'mainEntity', { '@id': p['@id'] });
          const app = APP_OF[slug]; if (app) put(p, 'subjectOf', { '@type': 'WebPage', '@id': `${SITE}/applications/${app}#webpage`, url: `${SITE}/applications/${app}`, name: `${L.decode(p.name || slug)} applications` });
        }
      }
      if (isInfra) {
        const pl = PLACE[slug];
        if (pl) {
          const hm = html.match(/<a[^>]*href="([^"]+)"[^>]*>\s*Get Directions/);
          const place = { '@type': 'Place', '@id': `${url}#place`, name: pl.name, address: { '@type': 'PostalAddress', addressLocality: pl.locality, addressRegion: pl.region, addressCountry: 'IN' } };
          if (hm && /^https:\/\/(www\.)?(google\.com\/maps|maps\.google|maps\.app\.goo\.gl|goo\.gl\/maps)/.test(L.decode(hm[1]))) place.hasMap = L.decode(hm[1]);
          const ex = g.findIndex(n => n['@id'] === place['@id']); if (ex > -1) g[ex] = place; else g.push(place);
          put(wp, 'about', [{ '@id': `${SITE}/#organization` }, { '@id': place['@id'] }]);
        }
      }
      /* FAQPage from the page's own visible FAQ (wording untouched) */
      if (!g.some(n => n['@type'] === 'FAQPage') && !blocks.some(b => b.json['@type'] === 'FAQPage')) {
        const f = L.visibleFaqs(html);
        if (f.items.length) {
          if (f.items.length !== f.declared) stats.notes.push(`${rel}: ${f.declared} <details> but ${f.items.length} FAQ items extracted`);
          g.push({ '@type': 'FAQPage', '@id': `${url}#faq`, url, isPartOf: { '@id': wp['@id'] }, inLanguage: 'en-IN', mainEntity: f.items.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) });
        }
      }
      /* write block back (replace from the end so offsets stay valid) */
      html = html.slice(0, main.start) + `<script type="application/ld+json">${eol}${pretty(main.json).replace(/\n/g, eol)}${eol}</script>` + html.slice(main.end);
    }
  }
  stats.pages++;
  if (html !== orig) { stats.changed++; if (!CHECK) fs.writeFileSync(file, html); }
}

(async () => {
  const pages = SANDBOX_HOME_ONLY ? ['index.html'] : L.listPages();
  for (const rel of pages) await processPage(rel);
  console.log(`${CHECK ? '[check] ' : ''}${stats.changed} of ${stats.pages} indexable pages ${CHECK ? 'would change' : 'updated'}`);
  stats.notes.forEach(n => console.log('note:', n));
})();
