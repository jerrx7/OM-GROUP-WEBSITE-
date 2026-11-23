// Proves an SEO pass changed nothing visible: hashes every page with <head> and JSON-LD blocks removed.
// usage: node scripts/seo/guard.js snapshot <out.json>   |   node scripts/seo/guard.js check <snap.json>
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = process.cwd();
const SKIP = new Set(['node_modules', '_review', 'scripts', 'assets', '.git', 'img', 'uploads', 'OM-GROUP-', '404 PAGE']);
function pages(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) pages(p, out); else if (/\.html$/.test(e.name) && !/Landing/.test(e.name)) out.push(p);
  }
  return out;
}
function front(h) {
  return h.replace(/\r\n/g, '\n')
    .replace(/<head[\s\S]*?<\/head>/i, '<head></head>')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
}
const mode = process.argv[2], file = process.argv[3];
const cur = {};
for (const p of pages(ROOT)) cur[path.relative(ROOT, p).split(path.sep).join('/')] = crypto.createHash('sha1').update(front(fs.readFileSync(p, 'utf8'))).digest('hex');
if (mode === 'snapshot') { fs.writeFileSync(file, JSON.stringify(cur, null, 1)); console.log('snapshot of', Object.keys(cur).length, 'pages'); }
else {
  const snap = JSON.parse(fs.readFileSync(file, 'utf8')); let bad = 0;
  for (const k of Object.keys(snap)) if (cur[k] !== snap[k]) { bad++; console.log('FRONTEND CHANGED:', k); }
  for (const k of Object.keys(cur)) if (!(k in snap)) console.log('new page:', k);
  console.log(bad ? bad + ' page(s) differ outside <head>/JSON-LD' : 'OK: ' + Object.keys(snap).length + ' pages identical outside <head> and JSON-LD');
  process.exit(bad ? 1 : 0);
}
