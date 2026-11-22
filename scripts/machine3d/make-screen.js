/* OM GROUP - compression machine: the touch-screen artwork used in the Blender stills (the web scene draws the same screen live
   into a CanvasTexture and animates the curve). Run before build-compression-machine.py:  node scripts/machine3d/make-screen.js */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const OUT = path.join(__dirname, '..', '..', '_review', 'machine3d'); fs.mkdirSync(OUT, { recursive: true });
const W = 1312, H = 800, OR = '#FF5E29';
// the curve of the reference screen: a smooth rise to a peak near 80 % of the run, then a short fall
const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; const y = t < .8 ? Math.pow(t / .8, 2.1) : 1 - 0.2 * Math.pow((t - .8) / .2, 1.5); pts.push([t, y]); }
const gx = 70, gy = 280, gw = 700, gh = 400;
const d = 'M' + pts.map(([t, y]) => (gx + t * gw).toFixed(1) + ' ' + (gy + gh - y * gh * .86).toFixed(1)).join('L');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25282d"/><stop offset="1" stop-color="#17191c"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<text x="46" y="112" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="76" font-weight="600" fill="#f3f3f1">Compression Test</text>
<g stroke="#4a4f57" stroke-width="3"><path d="M${gx} ${gy - 20}V${gy + gh}H${gx + gw + 20}" fill="none"/></g>
<g stroke="#2f343a" stroke-width="2">${[1, 2, 3].map(i => `<path d="M${gx} ${gy + gh - i * gh / 4}H${gx + gw}"/>`).join('')}</g>
<path d="${d}" fill="none" stroke="${OR}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
<g fill="#6d737c" font-family="Segoe UI, Arial, sans-serif" font-size="26">${[0, 1, 2, 3, 4].map(i => `<rect x="${gx + i * gw / 4 - 1}" y="${gy + gh + 8}" width="3" height="12"/>`).join('')}</g>
<g font-family="Segoe UI, Arial, Helvetica, sans-serif" fill="#c9ccd0">
<text x="850" y="262" font-size="44" font-weight="500" fill="#c4c8cd">Load (kN)</text><text x="850" y="366" font-size="92" font-weight="700" fill="#ffffff">412.5</text>
<text x="850" y="514" font-size="44" font-weight="500" fill="#c4c8cd">Stress (MPa)</text><text x="850" y="618" font-size="92" font-weight="700" fill="#ffffff">38.6</text></g>
</svg>`;
sharp(Buffer.from(svg)).png().toFile(path.join(OUT, 'screen.png')).then(() => console.log('screen.png'));
