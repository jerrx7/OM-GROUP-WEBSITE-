/* OM GROUP - Hot Mix Asphalt page: the two Blender stills (JMF proportioning panel, drum-mix plant) as figures with live HTML labels.
   Pictures + anchors come from scripts/hma3d/export-web-assets.js (figs.json). Labels are text on the page (crisp at any size, translatable), positioned in %
   of the picture and sized in container-query units, so they scale with the figure. */
const figs = require('../../hma3d/figs.json');
const B = '/img/applications/hot-mix-asphalt/';
const pct = v => (v * 100).toFixed(2) + '%';
function picture(k, alt) {
  const f = figs[k], set = ext => [1000, 1600, 2400].map(w => `${B}hma3d-${k}-${w}.${ext} ${w}w`).join(', ');
  const sizes = k === 'drum' ? '(max-width:899px) 100vw, 1136px' : '(max-width:899px) 100vw, 1136px';
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}" /><img src="${B}hma3d-${k}-1600.webp" srcset="${set('webp')}" sizes="${sizes}" width="${f.w}" height="${f.h}" alt="${alt}" loading="lazy" decoding="async" /></picture>`;
}

function jmfFig() {
  const a = figs.jmf.a, at = (k, cls, txt, extra = '') => `<span class="hma-lb ${cls}" style="left:${pct(a[k][0])};top:${pct(a[k][1])}${extra}">${txt}</span>`;
  const names = ['Coarse aggregate', 'Fine aggregate', 'Mineral filler', 'Bitumen'];
  return `<figure class="hma-r hma-r--jmf" data-rv><div class="hma-r-sc"><div class="hma-r-in">${picture('jmf', 'A proportioning panel with four sliders, one each for coarse aggregate, fine aggregate, mineral filler and bitumen. Below it, four heaps stand on a plinth: angular crushed stone, fine aggregate, white mineral filler and glossy black bitumen. At the right a drum mixer pours finished mix into a lit tray.')}
    ${names.map((n, i) => at('sl' + i, 'hma-lb--on', n)).join('')}
    ${['coarse', 'fine', 'filler', 'bitumen'].map((k, i) => at('p' + k, 'hma-lb--pill', names[i])).join('')}
    ${at('mixer', 'hma-lb--on', 'Mixer')}${at('finished', 'hma-lb--pill hma-lb--lit', 'Finished mix')}
    </div></div><figcaption class="ap-small">Four material streams combine in the proportions of the approved JMF. Proportions are set by the approved Job Mix Formula. No values are shown.</figcaption></figure>`;
}

function drumFig() {
  const a = figs.drum.a;
  const C = [  /* key, label, sub, direction, leader length (cqw) */
    ['bins', 'Cold-feed bins', 'controlled feed of each fraction', 'up', 7], ['conv', 'Conveyor', '', 'up', 8], ['burner', 'Burner end', '', 'up', 8],
    ['filler', 'Filler, at a designated point', '', 'up', 3.2], ['binder', 'Binder, metered', '', 'up', 3.2], ['dust', 'Dust collection', '', 'up', 3.4], ['silo', 'Storage silo', '', 'up', 3.2],
    ['drying', 'Drying and heating zone', '', 'dn', 3.4], ['mixing', 'Continuous mixing zone', '', 'dn', 3.4], ['tipper', 'Tipper', '', 'dn', 1.6]];
  const co = C.map(([k, t, s, d, l]) => `<span class="hma-co hma-co--${d}" style="left:${pct(a[k][0])};top:${pct(a[k][1])};--l:${l}"><b>${t}${s ? `<i>${s}</i>` : ''}</b></span>`).join('');
  return `<figure class="hma-r hma-r--drum" data-rv><div class="hma-r-sc"><div class="hma-r-in">${picture('drum', 'A drum-mix plant in cut-away. At the left, three cold-feed bins hold different aggregate fractions above a collecting belt. An inclined conveyor lifts the aggregate to the entry end of a long rotating drum, where an orange burner blows a flame into the drying zone. Further along the drum a cut-away window shows the continuous mixing zone with dark coated mix. A filler hopper and a binder pipe enter the drum from above. At the right end the exhaust duct runs to a dust collector, and the finished mix is lifted by a slat conveyor to a storage silo above a tipper truck.')}${co}</div></div>
    <figcaption class="ap-small">Parallel-flow drum shown: counter-flow drums reverse the gas direction. The exact layout depends on the plant design. There is no hot elevator, screen, hot bin or separate pugmill.</figcaption></figure>`;
}
module.exports = { jmfFig, drumFig };
