#!/usr/bin/env node
/*
 * IndexNow: tells Bing (and Yandex, Seznam, Naver) which URLs changed, so they re-crawl in minutes instead of days.
 * Google does not use IndexNow; for Google use Search Console (request indexing + resubmit the sitemap).
 *
 * The key file (a 32-hex-character name, e.g. /ab12...ef.txt, whose only content is that same string) must be LIVE
 * at the site root first. It is already in the repo root; deploy, then run:
 *
 *   node scripts/seo/indexnow.js            show what would be sent (nothing is sent)
 *   node scripts/seo/indexnow.js --send     send every URL in sitemap.xml
 *   node scripts/seo/indexnow.js --send /products/m-sand /applications   send only these paths
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const HOST = 'www.omgroupco.com';
const keyFile = fs.readdirSync(ROOT).find(f => /^[0-9a-f]{32}\.txt$/.test(f) && fs.readFileSync(path.join(ROOT, f), 'utf8').trim() === f.replace('.txt', ''));
if (!keyFile) { console.error('No IndexNow key file found in the repo root.'); process.exit(1); }
const key = keyFile.replace('.txt', '');
const send = process.argv.includes('--send');
const paths = process.argv.slice(2).filter(a => a.startsWith('/'));
let urls = paths.length ? paths.map(p => `https://${HOST}${p}`)
  : [...fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<url>\s*<loc>([^<]*)<\/loc>/g)].map(m => m[1]);
console.log(`${urls.length} URLs, key file /${keyFile}`);
if (!send) { console.log('(dry run: add --send to submit)'); process.exit(0); }
fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls }),
}).then(r => console.log('IndexNow response:', r.status, r.status === 200 || r.status === 202 ? 'accepted' : 'check the key file is live')).catch(e => { console.error(e.message); process.exit(1); });
