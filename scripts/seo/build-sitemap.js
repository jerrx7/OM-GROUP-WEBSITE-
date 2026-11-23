#!/usr/bin/env node
/*
 * Rebuilds sitemap.xml from the pages themselves:
 *  - one <url> per indexable page (canonical URL), in the existing order, new pages appended
 *  - <lastmod> = last commit date of the page, or today if its VISIBLE content differs from the last commit
 *  - existing <image:image> entries are kept; a page with none gets its social image (og:image)
 * Keeps each page's existing changefreq / priority. Run:  node scripts/seo/build-sitemap.js [--check]
 */
const fs = require('fs'), path = require('path');
const L = require('./lib');
const CHECK = process.argv.includes('--check');
const file = path.join(L.ROOT, 'sitemap.xml');
const old = fs.readFileSync(file, 'utf8');
const eol = old.includes('\r\n') ? '\r\n' : '\n';

const prev = new Map();
for (const m of old.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
  const b = m[1], loc = (b.match(/<loc>([^<]*)<\/loc>/) || [])[1];
  prev.set(loc, { freq: (b.match(/<changefreq>([^<]*)</) || [])[1], prio: (b.match(/<priority>([^<]*)</) || [])[1], imgs: [...b.matchAll(/<image:loc>([^<]*)<\/image:loc>/g)].map(x => x[1]) });
}
const pages = {};
for (const rel of L.listPages()) { const h = L.read(rel); if (L.isIndexable(h)) pages[L.canonicalOf(h)] = rel; }
const order = [...prev.keys()].filter(u => pages[u]);
for (const u of Object.keys(pages)) if (!order.includes(u)) order.push(u);

const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"', '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'];
for (const loc of order) {
  const rel = pages[loc], p = prev.get(loc) || {}, h = L.read(rel);
  const imgs = p.imgs && p.imgs.length ? p.imgs : [L.metaOf(h, 'property', 'og:image')].filter(Boolean);
  out.push('  <url>', `    <loc>${loc}</loc>`, `    <lastmod>${L.lastmod(rel)}</lastmod>`,
    `    <changefreq>${p.freq || 'monthly'}</changefreq>`, `    <priority>${p.prio || '0.6'}</priority>`);
  for (const i of imgs) out.push('    <image:image>', `      <image:loc>${i}</image:loc>`, '    </image:image>');
  out.push('  </url>');
}
out.push('</urlset>', '');
const next = out.join(eol);
const count = n => (n.match(/<url>/g) || []).length;
console.log(`${count(old)} -> ${count(next)} URLs; ${next === old ? 'no change' : CHECK ? 'would change' : 'written'}`);
if (!CHECK && next !== old) fs.writeFileSync(file, next);
