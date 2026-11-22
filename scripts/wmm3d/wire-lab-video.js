/* OM GROUP - WMM page: lays the laboratory motion loops (lab-shape / lab-la / lab-impact / lab-pi .mp4 from render-lab-anim.sh) over the lab stills that are already on the page.
   Run after:  ANIMONLY=1 node scripts/wmm3d/export-web-assets.js      then:  node scripts/wmm3d/wire-lab-video.js   (safe to repeat; a loop that is not rendered yet is skipped) */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), PAGE = path.join(ROOT, 'applications', 'wet-mix-macadam', 'index.html'), AN = path.join(ROOT, 'img', 'applications', 'wet-mix-macadam', 'wmx', 'anim');
const IMG = '/img/applications/wet-mix-macadam/wmx/';
let html = fs.readFileSync(PAGE, 'utf8'), n = 0;
for (const name of ['shape', 'la', 'impact', 'pi']) {
  const f = 'lab-' + name; if (!fs.existsSync(path.join(AN, f + '.mp4'))) { console.log('skip', f, '(not rendered)'); continue; }
  const fr = name === 'shape' && fs.existsSync(path.join(AN, f + '.json')) ? ` data-frames="${IMG}anim/${f}.json"` : '';
  const v = `<video class="wmx-vid" muted loop playsinline preload="none" disableremoteplayback tabindex="-1" aria-hidden="true" data-src="${IMG}anim/${f}.mp4"${fr}></video>`;
  const re = new RegExp(`(<picture>(?:(?!</picture>)[\s\S])*?${f}-1500\.webp(?:(?!</picture>)[\s\S])*?</picture>)(?!<video class="wmx-vid")`, 'g');
  html = html.replace(re, (m) => { n++; return m + v; });
}
fs.writeFileSync(PAGE, html); console.log('laid', n, 'laboratory loops over the stills');
