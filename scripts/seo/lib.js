// Shared helpers for the site-wide SEO scripts (seo-pass.js, build-sitemap.js).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const SITE = 'https://www.omgroupco.com';
const SKIP = new Set(['node_modules', '_review', 'scripts', 'assets', '.git', 'img', 'uploads', 'OM-GROUP-', '404 PAGE']);

/** every deployable page (relative path with forward slashes), excluding scratch copies */
function listPages(dir = ROOT, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listPages(p, out);
    else if (/\.html$/.test(e.name) && !/Landing/.test(e.name)) out.push(path.relative(ROOT, p).split(path.sep).join('/'));
  }
  return out.sort();
}
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
const escAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const metaOf = (html, attr, key) => { const m = html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`)); return m ? decode(m[1]) : ''; };
const canonicalOf = html => { const m = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/); return m ? m[1] : ''; };
const titleOf = html => { const m = html.match(/<title>([\s\S]*?)<\/title>/); return m ? decode(m[1].trim()) : ''; };
const isIndexable = html => /<meta\s+name="robots"\s+content="index/.test(html);

/** last-modified date for a page = last commit date, or today if the file differs from its last commit
 *  (once committed, git log gives the real date, so this stays honest) */
const TODAY = new Date().toISOString().slice(0, 10);
const front = h => h.replace(/\r\n/g, '\n');
function lastmod(rel) {
  let committed = null;
  try { committed = cp.execSync('git show HEAD:"' + rel + '"', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }); } catch (e) {}
  if (committed === null || front(committed) !== front(read(rel))) return TODAY;
  try { const d = cp.execSync('git log -1 --format=%cs -- "' + rel + '"', { cwd: ROOT, encoding: 'utf8' }).trim(); if (d) return d; } catch (e) {}
  return TODAY;
}

/** visible FAQ -> [{q, a}] (text only, taken from the page's own <details class="faq-item"> blocks) */
function visibleFaqs(html) {
  const re = /<details class="faq-item[^"]*"[^>]*>\s*<summary>([\s\S]*?)<span class="faq-icon"[^>]*><\/span>\s*<\/summary>\s*<div class="faq-a">([\s\S]*?)<\/div>\s*<\/details>/g;
  const txt = s => decode(s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|li|tr|h\d|div)>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  const out = [], seen = new Set(); let m;
  while ((m = re.exec(html))) { const q = txt(m[1]), a = txt(m[2]); if (q && a && !seen.has(q)) { seen.add(q); out.push({ q, a }); } }
  return { items: out, declared: (html.match(/<details class="faq-item/g) || []).length };
}

module.exports = { ROOT, SITE, TODAY, listPages, read, decode, escAttr, metaOf, canonicalOf, titleOf, isIndexable, lastmod, visibleFaqs };
