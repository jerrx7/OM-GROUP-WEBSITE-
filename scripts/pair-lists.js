/* OM GROUP · application pages: put two list blocks that follow each other side by side.
   A "list block" is a label (<p class="ap-label">) followed by a bullet or numbered list (<ul|ol class="...">). Where two of them follow each other (optionally with one
   short note paragraph between, which stays under the first list), they are wrapped in
     <div class="ap-pair"><div class="ap-pair-in"><div class="ap-pair-col">…</div><div class="ap-pair-col">…</div></div></div>
   and the CSS (application-type.css, .ap-pair) lays them out in two columns whenever the pair is wide enough, one under the other when it is not.
   Idempotent: wrapped pairs are no longer adjacent. Usage:  node scripts/pair-lists.js [--dry] */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'applications'), DRY = process.argv.includes('--dry');
const BLK = String.raw`<p class="ap-label">[^<]*<\/p>\s*<(?:ul|ol) class="[^"]*"[^>]*>(?:(?!<\/(?:ul|ol)>)[\s\S])*<\/(?:ul|ol)>`;
const NOTE = String.raw`\s*<p(?: class="[^"]*")?>(?:(?!<\/p>)[\s\S]){0,420}<\/p>`;
const re = new RegExp('(' + BLK + ')(' + NOTE + ')?(\\s*)(' + BLK + ')', 'g');
let total = 0;
for (const d of fs.readdirSync(ROOT)) {
  const f = path.join(ROOT, d, 'index.html'); if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8'); let n = 0;
  const out = s.replace(re, (all, a, note, gap, b) => { n++; return '<div class="ap-pair"><div class="ap-pair-in"><div class="ap-pair-col">' + a + (note || '') + '</div><div class="ap-pair-col">' + b + '</div></div></div>'; });
  if (n) { console.log(d.padEnd(24), n, 'pair(s)'); total += n; if (!DRY) fs.writeFileSync(f, out); }
}
console.log('total', total, DRY ? '(dry run)' : 'written');
