// Social-share cards (og:image / twitter:image): 1200x630 JPEG, each under ~300 KB so WhatsApp, LinkedIn,
// X and Facebook all accept them. Writes img/og/*.jpg and scripts/seo/og-map.json (page -> card).
// Run from the repo root:  node scripts/seo/og-cards.js
const sharp = require('sharp'), fs = require('fs');
const OUT = 'img/og'; fs.mkdirSync(OUT, { recursive: true });
const NAVY = '#1E2A47', ORANGE = '#F15A29';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const FONT = 'Inter, Segoe UI, Arial, sans-serif';
function lines(t, max) { const w = t.split(' '), out = []; let cur = ''; for (const x of w) { if ((cur + ' ' + x).trim().length > max) { out.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); } if (cur) out.push(cur); return out; }
async function jpg(buf, file, q = 82) { let quality = q, out; do { out = await sharp(buf).jpeg({ quality, mozjpeg: true }).toBuffer(); quality -= 6; } while (out.length > 290000 && quality > 40); fs.writeFileSync(file, out); return out.length; }

// white card: product photo on the right, name on the left
async function productCard(file, { title, sub, img, fit = 'contain' }) {
  const logo = await sharp('assets/om-group-logo-header.png').resize({ height: 84 }).toBuffer();
  const photo = await sharp(img).resize(560, 560, { fit, background: '#ffffff' }).toBuffer();
  const t = lines(title, 15);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#ffffff"/><rect x="0" y="0" width="14" height="630" fill="${ORANGE}"/>
  ${t.map((l, i) => `<text x="70" y="${250 + i * 74}" font-family="${FONT}" font-size="64" font-weight="700" fill="${NAVY}">${esc(l)}</text>`).join('')}
  <text x="70" y="${250 + t.length * 74 + 14}" font-family="${FONT}" font-size="34" font-weight="600" fill="${ORANGE}">${esc(sub)}</text>
  </svg>`;
  const buf = await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#fff' } })
    .composite([{ input: Buffer.from(svg) }, { input: logo, left: 64, top: 52 }, { input: photo, left: 600, top: 35 }]).png().toBuffer();
  return jpg(buf, file);
}
// photo card: quarry photo, dark gradient, big white brand line
async function photoCard(file, { title, sub, img = 'img/hero/hero-quarry-1672.webp' }) {
  const bg = await sharp(img).resize(1200, 630, { fit: 'cover', position: 'centre' }).toBuffer();
  const t = lines(title, 22);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b0b0d" stop-opacity=".88"/><stop offset=".62" stop-color="#0b0b0d" stop-opacity=".55"/><stop offset="1" stop-color="#0b0b0d" stop-opacity=".12"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/><rect x="70" y="150" width="86" height="6" fill="${ORANGE}"/>
  <text x="70" y="226" font-family="${FONT}" font-size="30" font-weight="700" letter-spacing="9" fill="${ORANGE}">OM GROUP</text>
  ${t.map((l, i) => `<text x="70" y="${318 + i * 76}" font-family="${FONT}" font-size="66" font-weight="700" fill="#ffffff">${esc(l)}</text>`).join('')}
  <text x="70" y="${318 + t.length * 76 + 10}" font-family="${FONT}" font-size="32" font-weight="500" fill="#e9e5dc">${esc(sub)}</text></svg>`;
  const buf = await sharp(bg).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  return jpg(buf, file);
}
async function convert(src, file) { return jpg(await sharp(src).resize(1200, 630, { fit: 'cover' }).toBuffer(), file, 84); }

const cards = {
  'home':          () => photoCard(`${OUT}/om-group-home-og.jpg`, { title: 'Crushed Stone Aggregate & RMC Supplier in Goa', sub: 'Aggregates · Sand · GSB · WMM · Ready-Mix Concrete' }),
  'applications':  () => photoCard(`${OUT}/om-group-applications-og.jpg`, { title: 'Construction Material Applications', sub: 'Aggregates, sand, RMC, GSB and WMM by use' }),
  'products':      () => photoCard(`${OUT}/om-group-products-og.jpg`, { title: 'Construction Materials Supplier in Goa', sub: 'Aggregates · Sand · GSB · WMM · RMC' }),
  'fleet':         () => photoCard(`${OUT}/om-group-fleet-og.jpg`, { title: 'Fleet & Logistics', sub: 'Construction-material transport network, Goa' }),
  'sancoale':      () => photoCard(`${OUT}/om-group-sancoale-og.jpg`, { title: 'Sancoale Infrastructure Base', sub: 'South Goa' }),
  'banda':         () => photoCard(`${OUT}/om-group-banda-wafoli-og.jpg`, { title: 'Banda Wafoli VSI Crusher', sub: 'Aggregate manufacturing, Maharashtra' }),
  'privacy':       () => photoCard(`${OUT}/om-group-privacy-og.jpg`, { title: 'Privacy Policy', sub: 'How OM GROUP handles personal information' }),
  'terms':         () => photoCard(`${OUT}/om-group-terms-og.jpg`, { title: 'Terms & Conditions', sub: 'Use of the OM GROUP website' }),
  '6mm':           () => productCard(`${OUT}/om-group-6mm-aggregate-og.jpg`, { title: '6mm Crushed Stone Aggregate', sub: 'Supplier in Goa', img: 'img/products/agg-6mm.png' }),
  '10mm':          () => productCard(`${OUT}/om-group-10mm-aggregate-og.jpg`, { title: '10mm Crushed Stone Aggregate', sub: 'Supplier in Goa', img: 'img/products/agg-10mm.png' }),
  '20mm':          () => productCard(`${OUT}/om-group-20mm-aggregate-og.jpg`, { title: '20mm Crushed Stone Aggregate', sub: 'Supplier in Goa', img: 'img/products/agg-20mm.png' }),
  '40mm':          () => productCard(`${OUT}/om-group-40mm-aggregate-og.jpg`, { title: '40mm Crushed Stone Aggregate', sub: 'Supplier in Goa', img: 'img/products/agg-40mm.png' }),
  '60mm':          () => productCard(`${OUT}/om-group-60mm-aggregate-og.jpg`, { title: '60mm Crushed Stone Aggregate', sub: 'Supplier in Goa', img: 'img/products/agg-60mm.png' }),
  'boulders':      () => productCard(`${OUT}/om-group-boulders-og.jpg`, { title: 'Construction & Pitching Boulders', sub: 'Supplier in Goa', img: 'img/products/om-group-boulders-og.png' }),
  'rmc':           () => convert('img/products/om-group-ready-mix-concrete-og.png', `${OUT}/om-group-ready-mix-concrete-og.jpg`),
  'gsb':           () => convert('img/products/om-group-granular-sub-base-og.png', `${OUT}/om-group-granular-sub-base-og.jpg`),
  'wmm':           () => convert('img/products/om-group-wmm-og.png', `${OUT}/om-group-wmm-og.jpg`),
  'road-base':     () => convert('img/products/om-group-road-base-material-og.png', `${OUT}/om-group-road-base-material-og.jpg`),
  'concrete-sand': () => convert('img/products/om-group-concrete-sand-og.png', `${OUT}/om-group-concrete-sand-og.jpg`),
  'river-sand':    () => convert('img/products/om-group-river-sand-og.png', `${OUT}/om-group-river-sand-og.jpg`),
  'plaster-sand':  () => convert('img/products/om-group-plaster-sand-og.png', `${OUT}/om-group-plaster-sand-og.jpg`),
  'washed-sand':   () => convert('img/products/om-group-washed-sand-goa.png', `${OUT}/om-group-washed-sand-og.jpg`),
};
const MAP = {
  'index.html': 'om-group-home-og', 'applications/index.html': 'om-group-applications-og', 'products/index.html': 'om-group-products-og',
  'infrastructure/fleet-logistics/index.html': 'om-group-fleet-og', 'infrastructure/sancoale-rmc-plant/index.html': 'om-group-sancoale-og',
  'infrastructure/banda-wafoli-vsi-crusher/index.html': 'om-group-banda-wafoli-og', 'privacy-policy/index.html': 'om-group-privacy-og', 'terms-and-conditions/index.html': 'om-group-terms-og',
  'products/6mm-aggregate/index.html': 'om-group-6mm-aggregate-og', 'products/10mm-aggregate/index.html': 'om-group-10mm-aggregate-og', 'products/20mm-aggregate/index.html': 'om-group-20mm-aggregate-og',
  'products/40mm-aggregate/index.html': 'om-group-40mm-aggregate-og', 'products/60mm-aggregate/index.html': 'om-group-60mm-aggregate-og', 'products/boulders/index.html': 'om-group-boulders-og',
  'products/ready-mix-concrete/index.html': 'om-group-ready-mix-concrete-og', 'infrastructure/kundaim-rmc-plant/index.html': 'om-group-ready-mix-concrete-og', 'infrastructure/thivim-rmc-plant/index.html': 'om-group-ready-mix-concrete-og',
  'products/granular-sub-base/index.html': 'om-group-granular-sub-base-og', 'products/wmm/index.html': 'om-group-wmm-og', 'products/road-base-material/index.html': 'om-group-road-base-material-og',
  'products/concrete-sand/index.html': 'om-group-concrete-sand-og', 'products/river-sand/index.html': 'om-group-river-sand-og', 'products/plaster-sand/index.html': 'om-group-plaster-sand-og', 'products/washed-sand/index.html': 'om-group-washed-sand-og',
};
(async () => {
  for (const [k, fn] of Object.entries(cards)) { const n = await fn(); console.log(k.padEnd(14), (n / 1024).toFixed(0) + ' KB'); }
  const map = {}; for (const [page, base] of Object.entries(MAP)) map[page] = `/img/og/${base}.jpg`;
  fs.writeFileSync('scripts/seo/og-map.json', JSON.stringify(map, null, 1));
})();
